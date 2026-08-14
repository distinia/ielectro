import {
    App,
    Api,
    Alert,
    Request,
    AdminShell,
    AccountPicker,
    AdminUi,
    AdminModal,
    BulkSelect,
    bindBulkToolbar,
    bulkDeleteRows,
} from "../core/index.js";

export default class TeamPanel {
    constructor() {
        this.bulk = new BulkSelect();
    }

    formHtml(formId = "team-form-modal") {
        return `
            <form id="${formId}" class="admin-form team-form">
                <div class="admin-form-grid">
                    <div class="admin-field span-2 account-picker">
                        <label class="account-picker-label" for="team-account-search">iElectro account</label>
                        <input type="hidden" name="account_id" value="">
                        <input id="team-account-search" type="search" class="account-picker-search" placeholder="Search by username or email…" autocomplete="off" required>
                        <div class="account-picker-selected"></div>
                        <div class="account-picker-results"></div>
                    </div>
                    <div class="admin-field span-2 team-account-avatar panel-hidden">
                        <label>Account avatar</label>
                        <div class="admin-avatar-slot">
                            <img class="team-avatar-preview-img" src="" alt="">
                        </div>
                        <p class="hint">Avatar from the linked iElectro account profile.</p>
                    </div>
                    <div class="admin-field">
                        <label for="team-role">Role</label>
                        <textarea id="team-role" name="body" rows="3" placeholder="Role in the team" required></textarea>
                    </div>
                    <div class="admin-field">
                        <label for="team-status">Status</label>
                        <select id="team-status" name="status">
                            <option value="active">Active</option>
                            <option value="hidden">Hidden</option>
                        </select>
                    </div>
                    <div class="admin-field">
                        <label for="team-linkedin">LinkedIn username</label>
                        <input id="team-linkedin" type="text" name="linkedin" placeholder="distinia" autocomplete="off" spellcheck="false">
                    </div>
                    <div class="admin-field">
                        <label for="team-github">GitHub username</label>
                        <input id="team-github" type="text" name="github" placeholder="distinia" autocomplete="off" spellcheck="false">
                    </div>
                </div>
            </form>
            <p class="admin-form-msg form-msg"></p>`;
    }

    displayName(row) {
        return row.display_name || row.full_name || row.account_username || "Unknown";
    }

    socialProfileUrl(platform, username) {
        const handle = String(username || "").trim().replace(/^@+/, "");
        if (!handle) return null;
        if (platform === "linkedin") {
            return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
        }
        if (platform === "github") {
            return `https://github.com/${encodeURIComponent(handle)}`;
        }
        return null;
    }

    mountAccountPicker(root) {
        const pickerRoot = root.querySelector(".account-picker");
        if (!pickerRoot) return null;
        const picker = new AccountPicker(pickerRoot);
        picker.onSelect = (account) => this.setAccountAvatarPreview(root, account.id);
        picker.onClear = () => this.setAccountAvatarPreview(root, null);
        return picker;
    }

    setAccountAvatarPreview(root, accountId) {
        const wrap = root.querySelector(".team-account-avatar");
        const img = root.querySelector(".team-avatar-preview-img");
        const url = AdminUi.accountAvatarUrl(accountId);
        if (!wrap || !img) return;
        if (!url) {
            wrap.classList.add("panel-hidden");
            img.removeAttribute("src");
            return;
        }
        wrap.classList.remove("panel-hidden");
        img.src = url;
        img.alt = "Account avatar";
    }

    buildFormData(form) {
        const fd = new FormData();
        fd.set("role_text", form.querySelector('[name="body"]').value.trim());
        fd.set("status", form.querySelector('[name="status"]').value);
        fd.set("linkedin", form.querySelector('[name="linkedin"]').value.trim());
        fd.set("github", form.querySelector('[name="github"]').value.trim());
        const accountId = form.querySelector('[name="account_id"]').value.trim();
        if (!accountId) {
            throw new Error("Account is required");
        }
        fd.set("account_id", accountId);
        return fd;
    }

    bindListFiltersOnce() {
        if (this._teamFiltersBound) return;
        this._teamFiltersBound = true;
        document.querySelector(".team-filter-q")?.addEventListener("input", () => this.renderTeamList());
        document.querySelector(".team-filter-sort")?.addEventListener("change", () => this.renderTeamList());
    }

    async renderTeamList() {
        const node = document.querySelector(".team-list");
        if (!node) return;
        const rows = this._teamRows || [];
        const q = document.querySelector(".team-filter-q")?.value || "";
        const sort = document.querySelector(".team-filter-sort")?.value || "newest";
        const filtered = App.filterRows(rows, q, sort, {
            text: (r) =>
                [this.displayName(r), r.role_text, r.account_username, r.account_email, r.account_id]
                    .filter(Boolean)
                    .join(" "),
            time: (r) => r.created_at,
            title: (r) => this.displayName(r),
        });
        if (!filtered.length) {
            node.innerHTML = AdminUi.emptyState(rows.length ? "No matches." : "No members.");
            return;
        }
        node.innerHTML = `
            <div class="admin-data-list admin-data-list-team">
                <div class="admin-data-head">
                    ${AdminUi.checkAllCell()}
                    <span class="col-main">Member</span>
                    <span class="col-role">Role</span>
                    <span class="col-account">Account</span>
                    <span class="col-status">Status</span>
                </div>
                <div class="admin-data-body">
                    ${filtered
                        .map((row) => {
                            const name = this.displayName(row);
                            const accountLabel = row.account_username
                                ? `@${App.esc(row.account_username)}`
                                : row.account_id
                                  ? `#${App.esc(String(row.account_id))}`
                                  : "—";
                            const selected = this.bulk.has(row.id) ? " is-selected" : "";
                            return `
                        <article class="admin-data-row${selected}" data-id="${App.esc(String(row.id))}">
                            ${AdminUi.checkCell(row.id, this.bulk.has(row.id))}
                            <div class="col-main admin-data-main">
                                ${AdminUi.avatarHtml(row.avatar, name)}
                                <div>
                                    <strong>${App.esc(name)}</strong>
                                    <p class="admin-data-excerpt">${App.esc(row.account_email || "")}</p>
                                </div>
                            </div>
                            <div class="col-role admin-muted">${App.esc(row.role_text || "")}</div>
                            <div class="col-account admin-muted">${accountLabel}</div>
                            <div class="col-status">${AdminUi.statusPill(row.status)}</div>
                        </article>`;
                        })
                        .join("")}
                </div>
            </div>`;
        await AdminUi.refreshIcons(node);
        AdminUi.bindTableSelection(node, this.bulk, filtered, (id) => this.openView(id));
    }

    async bulkDelete() {
        const deleted = await bulkDeleteRows(
            this.bulk,
            (id) => Request.delete(`team/${id}`),
            (count) => `Delete ${count} member(s)?`,
        );
        if (deleted) await this.loadList();
    }

    async loadList() {
        const res = await Request.get("team");
        this._teamRows = Api.list(res);
        this.bindListFiltersOnce();
        await this.renderTeamList();
    }

    async openView(id) {
        try {
            const res = await Request.get(`team/${id}`);
            const item = Api.record(res);
            if (!item) {
                Alert.error("Not found.");
                return;
            }
            const name = this.displayName(item);
            const links = [
                item.linkedin
                    ? ["LinkedIn", this.socialProfileUrl("linkedin", item.linkedin), item.linkedin]
                    : null,
                item.github
                    ? ["GitHub", this.socialProfileUrl("github", item.github), item.github]
                    : null,
            ].filter(Boolean);
            const accountLine = item.account_username
                ? `<p class="admin-muted">@${App.esc(item.account_username)} · ${App.esc(item.account_email || "")}</p>`
                : "";
            const avatar = item.avatar
                ? `<img class="admin-avatar" src="${App.esc(item.avatar)}" alt="" loading="lazy">`
                : `<div class="admin-avatar admin-avatar-fallback">${App.esc(name.slice(0, 1))}</div>`;
            const body = `
                <div class="admin-view-card">
                    <div class="admin-view-header">
                        ${avatar}
                        <div>
                            <h1>${App.esc(name)}</h1>
                            <p class="admin-muted">${App.esc(item.role_text || "")}</p>
                            ${accountLine}
                            <div class="admin-view-meta">${AdminUi.statusPill(item.status)}</div>
                            ${links.length ? `<div class="admin-view-meta">${links.map(([label, url, handle]) => `<a class="admin-link" href="${App.esc(url)}" target="_blank" rel="noopener">${App.esc(label)} · ${App.esc(handle)}</a>`).join("")}</div>` : ""}
                        </div>
                    </div>
                </div>`;
            const overlay = AdminModal.open({
                title: name,
                content: body,
                footer: AdminUi.iconBtn("pencil", "Edit", "admin-icon-btn-accent", `data-team-edit="${App.esc(String(id))}"`),
            });
            overlay.querySelector("[data-team-edit]")?.addEventListener("click", () => {
                this.openEdit(id);
            });
            await AdminUi.refreshIcons(overlay);
        } catch (err) {
            Alert.error(Api.errorMessage(err) || "Unable to load.");
        }
    }

    openCreate() {
        const formId = "team-form-modal";
        const overlay = AdminModal.open({
            title: "Add member",
            content: this.formHtml(formId),
            footer: AdminModal.formFooter({ formId, saveLabel: "Save member" }),
        });
        const form = overlay.querySelector(`#${formId}`);
        const formMsg = overlay.querySelector(".form-msg");
        this.mountAccountPicker(overlay);
        this.setAccountAvatarPreview(overlay, null);
        form?.addEventListener("submit", async (e) => {
            e.preventDefault();
            formMsg.textContent = "";
            try {
                await Request.post("team", this.buildFormData(form));
                Alert.success("Saved");
                AdminModal.close();
                await this.loadList();
            } catch (err) {
                formMsg.textContent = Api.errorMessage(err) || err.message;
                Alert.error(Api.errorMessage(err) || err.message);
            }
        });
        AdminUi.refreshIcons(overlay);
    }

    async openEdit(id) {
        const formId = "team-form-modal";
        const overlay = AdminModal.open({
            title: "Edit member",
            content: this.formHtml(formId),
            footer: AdminModal.formFooter({
                formId,
                saveLabel: "Save member",
                deleteLabel: "Delete member",
                showDelete: true,
                deleteClass: "team-delete",
            }),
        });
        const form = overlay.querySelector(`#${formId}`);
        const formMsg = overlay.querySelector(".form-msg");
        const picker = this.mountAccountPicker(overlay);
        try {
            const res = await Request.get(`team/${id}`);
            const item = Api.record(res);
            if (!item) {
                AdminModal.close();
                Alert.error("Not found.");
                return;
            }
            form.querySelector('[name="body"]').value = item.role_text || "";
            form.querySelector('[name="status"]').value = item.status || "active";
            form.querySelector('[name="linkedin"]').value = item.linkedin || "";
            form.querySelector('[name="github"]').value = item.github || "";
            picker?.setAccountId(item.account_id, {
                username: item.account_username,
                email: item.account_email,
                name: this.displayName(item),
            });
            this.setAccountAvatarPreview(overlay, item.account_id);
        } catch (err) {
            AdminModal.close();
            Alert.error(Api.errorMessage(err) || "Unable to load.");
            return;
        }
        form?.addEventListener("submit", async (e) => {
            e.preventDefault();
            formMsg.textContent = "";
            try {
                await Request.post(`team/${id}`, this.buildFormData(form));
                Alert.success("Saved");
                AdminModal.close();
                await this.loadList();
            } catch (err) {
                formMsg.textContent = Api.errorMessage(err) || err.message;
                Alert.error(Api.errorMessage(err) || err.message);
            }
        });
        overlay.querySelector(".team-delete")?.addEventListener("click", async () => {
            if (!(await Alert.confirm("Delete this member?"))) return;
            try {
                await Request.delete(`team/${id}`);
                AdminModal.close();
                await this.loadList();
            } catch (err) {
                Alert.error(Api.errorMessage(err));
            }
        });
        AdminUi.refreshIcons(overlay);
    }

    bindChrome() {
        bindBulkToolbar(this.bulk);
        document.querySelector(".admin-action-new")?.addEventListener("click", () => this.openCreate());
        document.querySelector(".admin-action-bulk-delete")?.addEventListener("click", () => this.bulkDelete());
    }

    async run() {
        AdminShell.mount("team", "Team");
        this.bindChrome();
        try {
            await this.loadList();
        } catch (err) {
            const node = document.querySelector(".team-list");
            if (node) node.innerHTML = AdminUi.emptyState(Api.errorMessage(err) || "Unable to load.");
        }
    }
}

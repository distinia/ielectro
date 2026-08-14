import { App, Api, Alert, Request, AdminShell, AdminUi, AdminModal, BulkSelect, bindBulkToolbar, bulkDeleteRows } from "../core/index.js";
export default class NewsPanel {
    constructor() {
        this.bulk = new BulkSelect();
    }
    formHtml(formId = "news-form-modal") {
        return `
            <form id="${formId}" class="admin-form news-form">
                <div class="admin-form-grid">
                    <div class="admin-field">
                        <label for="news-status">Status</label>
                        <select id="news-status" name="status">
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                            <option value="hidden">Hidden</option>
                        </select>
                    </div>
                    <div class="admin-field span-2">
                        <label for="news-title">Title</label>
                        <input id="news-title" type="text" name="title" placeholder="Article title" required>
                    </div>
                    <div class="admin-field span-2">
                        <label for="news-body">Body</label>
                        <textarea id="news-body" name="body" rows="8" placeholder="Write the article…" required></textarea>
                    </div>
                    <div class="admin-field span-2">
                        <label>Cover image</label>
                        <div class="admin-upload">
                            <input id="news-image" type="file" class="news-image" accept="image/*" autocomplete="off">
                            <span class="admin-upload-label">Upload cover</span>
                            <span class="admin-upload-hint">Stored in www/assets/news</span>
                        </div>
                        <div class="admin-upload-preview news-image-preview panel-hidden"></div>
                    </div>
                </div>
            </form>
            <p class="admin-form-msg form-msg"></p>`;
    }
    bindImagePreview(root) {
        const input = root.querySelector(".news-image");
        const preview = root.querySelector(".news-image-preview");
        if (!input || !preview) return;
        input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (!file) {
                preview.classList.add("panel-hidden");
                preview.innerHTML = "";
                return;
            }
            preview.classList.remove("panel-hidden");
            preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="">`;
        });
    }
    setImagePreview(root, url) {
        const preview = root.querySelector(".news-image-preview");
        if (!preview) return;
        if (!url) {
            preview.classList.add("panel-hidden");
            preview.innerHTML = "";
            return;
        }
        preview.classList.remove("panel-hidden");
        preview.innerHTML = `<img src="${App.esc(url)}" alt="">`;
    }
    buildFormData(form) {
        const fd = new FormData();
        fd.set("title", form.querySelector('[name="title"]').value.trim());
        fd.set("body", form.querySelector('[name="body"]').value.trim());
        fd.set("status", form.querySelector('[name="status"]').value);
        const file = form.querySelector(".news-image")?.files?.[0];
        if (file) fd.append("image", file);
        return fd;
    }
    bindListFiltersOnce() {
        if (this._newsFiltersBound) return;
        this._newsFiltersBound = true;
        document.querySelector(".news-filter-q")?.addEventListener("input", () => this.renderNewsList());
        document.querySelector(".news-filter-sort")?.addEventListener("change", () => this.renderNewsList());
    }
    async renderNewsList() {
        const node = document.querySelector(".news-list");
        if (!node) return;
        const rows = this._newsRows || [];
        const q = document.querySelector(".news-filter-q")?.value || "";
        const sort = document.querySelector(".news-filter-sort")?.value || "newest";
        const filtered = App.filterRows(rows, q, sort, {
            text: (r) => [r.title, r.body, r.status, r.published_at].filter(Boolean).join(" "),
            time: (r) => r.published_at || r.created_at,
            title: (r) => r.title || "",
        });
        if (!filtered.length) {
            node.innerHTML = AdminUi.emptyState(rows.length ? "No matches." : "No news yet.");
            return;
        }
        node.innerHTML = `
            <div class="admin-data-list admin-data-list-news">
                <div class="admin-data-head">
                    ${AdminUi.checkAllCell()}
                    <span class="col-main">Article</span>
                    <span class="col-status">Status</span>
                    <span class="col-date">Date</span>
                </div>
                <div class="admin-data-body">
                    ${filtered
                        .map((row) => {
                            const when = App.esc(row.published_at || row.created_at || "");
                            const excerpt = App.esc((row.body || "").slice(0, 120));
                            const suffix = (row.body || "").length > 120 ? "…" : "";
                            const thumb = row.image
                                ? `<div class="admin-data-thumb"><img src="${App.esc(row.image)}" alt="" loading="lazy"></div>`
                                : "";
                            const selected = this.bulk.has(row.id) ? " is-selected" : "";
                            return `
                        <article class="admin-data-row${selected}" data-id="${App.esc(String(row.id))}">
                            ${AdminUi.checkCell(row.id, this.bulk.has(row.id))}
                            <div class="col-main admin-data-main">
                                ${thumb}
                                <div>
                                    <strong>${App.esc(row.title)}</strong>
                                    <p class="admin-data-excerpt">${excerpt}${suffix}</p>
                                </div>
                            </div>
                            <div class="col-status">${AdminUi.statusPill(row.status)}</div>
                            <div class="col-date admin-muted">${when}</div>
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
            (id) => Request.delete(`news/${id}`),
            (count) => `Delete ${count} article(s)?`,
        );
        if (deleted) await this.loadList();
    }
    async loadList() {
        const res = await Request.get("news");
        this._newsRows = Api.list(res);
        this.bindListFiltersOnce();
        await this.renderNewsList();
    }
    async openView(id) {
        try {
            const res = await Request.get(`news/${id}`);
            const item = Api.record(res);
            if (!item) {
                Alert.error("Not found.");
                return;
            }
            const when = item.published_at || item.created_at || "";
            const body = `
                <div class="admin-view-card">
                    ${item.image ? `<div class="admin-cover"><img src="${App.esc(item.image)}" alt="" loading="lazy"></div>` : ""}
                    <div class="admin-view-section">
                        <div class="admin-view-meta" style="margin-bottom:12px">
                            ${AdminUi.statusPill(item.status)}
                            ${when ? `<span class="admin-muted">${App.esc(when)}</span>` : ""}
                        </div>
                        <div class="admin-prose">${App.esc(item.body || "").replaceAll("\n", "<br>")}</div>
                    </div>
                </div>`;
            const overlay = AdminModal.open({
                title: item.title,
                content: body,
                footer: `
                    ${AdminUi.iconBtn("pencil", "Edit", "admin-icon-btn-accent", `data-news-edit="${App.esc(String(id))}"`)}
                `,
            });
            overlay.querySelector("[data-news-edit]")?.addEventListener("click", () => {
                this.openEdit(id);
            });
            await AdminUi.refreshIcons(overlay);
        } catch (err) {
            Alert.error(Api.errorMessage(err) || "Unable to load.");
        }
    }
    openCreate() {
        const formId = "news-form-modal";
        const overlay = AdminModal.open({
            title: "Create news",
            content: this.formHtml(formId),
            footer: AdminModal.formFooter({ formId, saveLabel: "Save article" }),
        });
        const form = overlay.querySelector(`#${formId}`);
        const formMsg = overlay.querySelector(".form-msg");
        this.bindImagePreview(overlay);
        this.setImagePreview(overlay, "");
        form?.addEventListener("submit", async (e) => {
            e.preventDefault();
            formMsg.textContent = "";
            try {
                await Request.post("news", this.buildFormData(form));
                Alert.success("Saved");
                AdminModal.close();
                await this.loadList();
            } catch (err) {
                formMsg.textContent = Api.errorMessage(err);
                Alert.error(Api.errorMessage(err));
            }
        });
        AdminUi.refreshIcons(overlay);
    }
    async openEdit(id) {
        const formId = "news-form-modal";
        const overlay = AdminModal.open({
            title: "Edit news",
            content: this.formHtml(formId),
            footer: AdminModal.formFooter({
                formId,
                saveLabel: "Save article",
                deleteLabel: "Delete article",
                showDelete: true,
                deleteClass: "news-delete",
            }),
        });
        const form = overlay.querySelector(`#${formId}`);
        const formMsg = overlay.querySelector(".form-msg");
        this.bindImagePreview(overlay);
        try {
            const res = await Request.get(`news/${id}`);
            const item = Api.record(res);
            if (!item) {
                AdminModal.close();
                Alert.error("Not found.");
                return;
            }
            form.querySelector('[name="title"]').value = item.title || "";
            form.querySelector('[name="body"]').value = item.body || "";
            form.querySelector('[name="status"]').value = item.status || "published";
            this.setImagePreview(overlay, item.image || "");
        } catch (err) {
            AdminModal.close();
            Alert.error(Api.errorMessage(err) || "Unable to load.");
            return;
        }
        form?.addEventListener("submit", async (e) => {
            e.preventDefault();
            formMsg.textContent = "";
            try {
                await Request.post(`news/${id}`, this.buildFormData(form));
                Alert.success("Saved");
                AdminModal.close();
                await this.loadList();
            } catch (err) {
                formMsg.textContent = Api.errorMessage(err);
                Alert.error(Api.errorMessage(err));
            }
        });
        overlay.querySelector(".news-delete")?.addEventListener("click", async () => {
            if (!(await Alert.confirm("Delete this article?"))) return;
            try {
                await Request.delete(`news/${id}`);
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
        AdminShell.mount("news", "News");
        this.bindChrome();
        try {
            await this.loadList();
        } catch (err) {
            const node = document.querySelector(".news-list");
            if (node) {
                node.innerHTML = AdminUi.emptyState(Api.errorMessage(err) || "Unable to load.");
            }
        }
    }
}

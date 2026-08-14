import {
    App,
    Api,
    Alert,
    Request,
    AdminShell,
    AdminUi,
    AdminModal,
    adminAssetUrl,
    BulkSelect,
    bindBulkToolbar,
    bulkDeleteRows,
} from "../core/index.js";

export default class CareersPanel {
    constructor() {
        this.bulk = new BulkSelect();
    }
    jobFormHtml(formId = "job-form-modal") {
        return `
            <form id="${formId}" class="admin-form job-form">
                <div class="admin-form-grid">
                    <div class="admin-field span-2">
                        <label for="job-title">Title</label>
                        <input id="job-title" type="text" name="title" placeholder="Job title" required>
                    </div>
                    <div class="admin-field">
                        <label for="job-status">Status</label>
                        <select id="job-status" name="status">
                            <option value="active">Active</option>
                            <option value="hidden">Hidden</option>
                        </select>
                    </div>
                    <div class="admin-field span-2">
                        <label for="job-requirements">Requirements</label>
                        <textarea id="job-requirements" name="requirements" rows="8" placeholder="One requirement per line" required></textarea>
                    </div>
                </div>
            </form>
            <p class="admin-form-msg form-msg"></p>`;
    }

    cvPublicUrl(row) {
        if (row.cv_url) return row.cv_url;
        if (!row.cv_file) return null;
        return adminAssetUrl(`assets/applications/${encodeURIComponent(row.cv_file)}`);
    }

    buildJobFormData(form) {
        const fd = new FormData();
        fd.set("title", form.querySelector('[name="title"]').value.trim());
        fd.set("requirements_raw", form.querySelector('[name="requirements"]').value.trim());
        fd.set("status", form.querySelector('[name="status"]').value);
        return fd;
    }

    bindOverviewFiltersOnce() {
        if (this._careersFiltersBound) return;
        this._careersFiltersBound = true;
        document.querySelector(".jobs-filter-q")?.addEventListener("input", () => this.renderJobsList());
        document.querySelector(".jobs-filter-sort")?.addEventListener("change", () => this.renderJobsList());
        document.querySelector(".apps-filter-q")?.addEventListener("input", () => this.renderApplicationsList());
        document.querySelector(".apps-filter-sort")?.addEventListener("change", () => this.renderApplicationsList());
    }

    async renderJobsList() {
        const jobsNode = document.querySelector(".jobs-list");
        if (!jobsNode) return;
        const jobs = this._careersJobs || [];
        const q = document.querySelector(".jobs-filter-q")?.value || "";
        const sort = document.querySelector(".jobs-filter-sort")?.value || "newest";
        const filtered = App.filterRows(jobs, q, sort, {
            text: (r) => [r.title, r.description, r.status].filter(Boolean).join(" "),
            time: (r) => r.created_at,
            title: (r) => r.title || "",
        });
        if (!filtered.length) {
            jobsNode.innerHTML = AdminUi.emptyState(jobs.length ? "No matches." : "No listings.");
            return;
        }
        jobsNode.innerHTML = `
            <div class="admin-data-list admin-data-list-compact">
                <div class="admin-data-head">
                    ${AdminUi.checkAllCell()}
                    <span class="col-main">Position</span>
                    <span class="col-status">Status</span>
                </div>
                <div class="admin-data-body">
                    ${filtered
                        .map((row) => {
                            const selected = this.bulk.has(row.id) ? " is-selected" : "";
                            return `
                    <article class="admin-data-row${selected}" data-id="${App.esc(String(row.id))}">
                        ${AdminUi.checkCell(row.id, this.bulk.has(row.id))}
                        <div class="col-main admin-data-main">
                            <div><strong>${App.esc(row.title)}</strong></div>
                        </div>
                        <div class="col-status">${AdminUi.statusPill(row.status)}</div>
                    </article>`;
                        })
                        .join("")}
                </div>
            </div>`;
        await AdminUi.refreshIcons(jobsNode);
        AdminUi.bindTableSelection(jobsNode, this.bulk, filtered, (id) => this.openJobView(id));
    }

    async bulkDeleteJobs() {
        const deleted = await bulkDeleteRows(
            this.bulk,
            (id) => Request.delete(`careers/${id}`),
            (count) => `Delete ${count} listing(s)?`,
        );
        if (deleted) await this.loadOverview();
    }

    applicationStatusOptions(current = "reviewing") {
        const statuses = [
            ["reviewing", "Reviewing"],
            ["accepted", "Accepted"],
            ["rejected", "Rejected"],
        ];
        return statuses
            .map(
                ([value, label]) =>
                    `<option value="${value}"${value === current ? " selected" : ""}>${label}</option>`,
            )
            .join("");
    }

    applicationStatusConfirm(name, status) {
        const who = name || "this applicant";
        if (status === "accepted") {
            return `Accept ${who}'s application and send an interview invitation email?`;
        }
        if (status === "rejected") {
            return `Reject ${who}'s application and send a rejection email?`;
        }
        return `Move ${who}'s application back to reviewing?`;
    }

    bindApplicationStatusHandlers(root) {
        root?.querySelectorAll(".app-status-select").forEach((select) => {
            select.addEventListener("change", async () => {
                const row = select.closest(".admin-data-row");
                const id = row?.dataset.id;
                const previous = select.dataset.status || "reviewing";
                const next = select.value;
                if (!id || next === previous) return;

                const name = row?.querySelector(".admin-app-name")?.textContent?.trim() || "";
                if (!(await Alert.confirm(this.applicationStatusConfirm(name, next)))) {
                    select.value = previous;
                    return;
                }

                select.disabled = true;
                try {
                    const res = await Request.patch(`careers/applications/${id}`, { status: next });
                    const saved = Api.record(res);
                    const status = saved?.status || next;
                    select.value = status;
                    select.dataset.status = status;
                    const item = (this._careersApplications || []).find(
                        (row) => String(row.id) === String(id),
                    );
                    if (item) item.status = status;
                    if (status === "accepted") {
                        Alert.success("Application accepted · invitation email sent");
                    } else if (status === "rejected") {
                        Alert.success("Application rejected · email sent");
                    } else {
                        Alert.success("Application status updated");
                    }
                } catch (err) {
                    select.value = previous;
                    Alert.error(Api.errorMessage(err));
                } finally {
                    select.disabled = false;
                }
            });
        });
    }

    async renderApplicationsList() {
        const appNode = document.querySelector(".applications-list");
        if (!appNode) return;
        const applications = this._careersApplications || [];
        const q = document.querySelector(".apps-filter-q")?.value || "";
        const sort = document.querySelector(".apps-filter-sort")?.value || "newest";
        const filtered = App.filterRows(applications, q, sort, {
            text: (r) => [r.full_name, r.email, r.position, r.status, r.created_at].filter(Boolean).join(" "),
            time: (r) => r.created_at,
            title: (r) => r.full_name || "",
        });
        if (!filtered.length) {
            appNode.innerHTML = AdminUi.emptyState(applications.length ? "No matches." : "No applications.");
            return;
        }
        appNode.innerHTML = `
            <div class="admin-data-list admin-data-list-apps">
                <div class="admin-data-head">
                    <span class="col-main">Applicant</span>
                    <span class="col-status">Status</span>
                    <span class="col-actions">CV</span>
                </div>
                <div class="admin-data-body">
                    ${filtered
                        .map((row) => {
                            const cvUrl = this.cvPublicUrl(row);
                            const cvAction = cvUrl
                                ? AdminUi.iconLink(cvUrl, "file-text", "Download CV", "admin-icon-btn-accent")
                                : `<span class="admin-muted">—</span>`;
                            const status = String(row.status || "reviewing").toLowerCase();
                            return `
                    <article class="admin-data-row admin-app-row" data-id="${App.esc(String(row.id))}">
                        <div class="col-main admin-data-main admin-app-main">
                            <div class="admin-app-copy">
                                <strong class="admin-app-name">${App.esc(row.full_name)}</strong>
                                <p class="admin-data-excerpt">${App.esc(row.position)} · ${App.esc(row.email)}</p>
                                <p class="admin-data-excerpt admin-muted">${App.esc(row.created_at || "")}</p>
                            </div>
                        </div>
                        <div class="col-status">
                            <select class="admin-app-status app-status-select" data-status="${App.esc(status)}" aria-label="Application status for ${App.esc(row.full_name)}">
                                ${this.applicationStatusOptions(status)}
                            </select>
                        </div>
                        <div class="col-actions">${cvAction}</div>
                    </article>`;
                        })
                        .join("")}
                </div>
            </div>`;
        await AdminUi.refreshIcons(appNode);
        this.bindApplicationStatusHandlers(appNode);
    }

    async deleteJobRow(id) {
        if (!(await Alert.confirm("Delete this job listing?"))) return;
        try {
            await Request.delete(`careers/${id}`);
            await this.loadOverview();
        } catch (err) {
            Alert.error(Api.errorMessage(err));
        }
    }

    async loadOverview() {
        const [jobsRes, appsRes] = await Promise.all([
            Request.get("careers"),
            Request.get("careers/applications"),
        ]);
        this._careersJobs = Api.list(jobsRes);
        this._careersApplications = Api.list(appsRes);
        this.bindOverviewFiltersOnce();
        await this.renderJobsList();
        await this.renderApplicationsList();
    }

    openJobCreate() {
        const formId = "job-form-modal";
        const overlay = AdminModal.open({
            title: "New job listing",
            content: this.jobFormHtml(formId),
            footer: AdminModal.formFooter({ formId, saveLabel: "Save listing" }),
        });
        const form = overlay.querySelector(`#${formId}`);
        const formMsg = overlay.querySelector(".form-msg");
        form?.addEventListener("submit", async (e) => {
            e.preventDefault();
            formMsg.textContent = "";
            try {
                await Request.post("careers", this.buildJobFormData(form));
                Alert.success("Saved");
                AdminModal.close();
                await this.loadOverview();
            } catch (err) {
                formMsg.textContent = Api.errorMessage(err);
                Alert.error(Api.errorMessage(err));
            }
        });
        AdminUi.refreshIcons(overlay);
    }

    async openJobView(id) {
        try {
            const res = await Request.get(`careers/${id}`);
            const item = Api.record(res);
            if (!item) {
                Alert.error("Not found.");
                return;
            }
            const reqs = (item.requirements || [])
                .map((r) => `<li>${App.esc(r)}</li>`)
                .join("");
            const body = `
                <div class="admin-view-card">
                    <div class="admin-view-section">
                        <div class="admin-view-meta" style="margin-bottom:12px">${AdminUi.statusPill(item.status)}</div>
                        <ul class="admin-bullets">${reqs || "<li>No requirements listed.</li>"}</ul>
                    </div>
                </div>`;
            const overlay = AdminModal.open({
                title: item.title,
                content: body,
                footer: AdminUi.iconBtn("pencil", "Edit", "admin-icon-btn-accent", `data-job-edit="${App.esc(String(id))}"`),
            });
            overlay.querySelector("[data-job-edit]")?.addEventListener("click", () => {
                this.openJobEdit(id);
            });
            await AdminUi.refreshIcons(overlay);
        } catch (err) {
            Alert.error(Api.errorMessage(err) || "Unable to load.");
        }
    }

    async openJobEdit(id) {
        const formId = "job-form-modal";
        const overlay = AdminModal.open({
            title: "Edit job",
            content: this.jobFormHtml(formId),
            footer: AdminModal.formFooter({
                formId,
                saveLabel: "Save listing",
                deleteLabel: "Delete listing",
                showDelete: true,
                deleteClass: "job-delete",
            }),
        });
        const form = overlay.querySelector(`#${formId}`);
        const formMsg = overlay.querySelector(".form-msg");
        try {
            const res = await Request.get(`careers/${id}`);
            const item = Api.record(res);
            if (!item) {
                AdminModal.close();
                Alert.error("Not found.");
                return;
            }
            form.querySelector('[name="title"]').value = item.title || "";
            form.querySelector('[name="requirements"]').value = (item.requirements || []).join("\n");
            form.querySelector('[name="status"]').value = item.status || "active";
        } catch (err) {
            AdminModal.close();
            Alert.error(Api.errorMessage(err) || "Unable to load.");
            return;
        }
        form?.addEventListener("submit", async (e) => {
            e.preventDefault();
            formMsg.textContent = "";
            try {
                await Request.patch(`careers/${id}`, this.buildJobFormData(form));
                Alert.success("Saved");
                AdminModal.close();
                await this.loadOverview();
            } catch (err) {
                formMsg.textContent = Api.errorMessage(err);
                Alert.error(Api.errorMessage(err));
            }
        });
        overlay.querySelector(".job-delete")?.addEventListener("click", async () => {
            if (!(await Alert.confirm("Delete this listing?"))) return;
            try {
                await Request.delete(`careers/${id}`);
                AdminModal.close();
                await this.loadOverview();
            } catch (err) {
                Alert.error(Api.errorMessage(err));
            }
        });
        AdminUi.refreshIcons(overlay);
    }

    bindChrome() {
        bindBulkToolbar(this.bulk);
        document.querySelector(".admin-action-new")?.addEventListener("click", () => this.openJobCreate());
        document.querySelector(".admin-action-bulk-delete")?.addEventListener("click", () => this.bulkDeleteJobs());
    }

    async run() {
        AdminShell.mount("careers", "Careers");
        this.bindChrome();
        try {
            await this.loadOverview();
        } catch (err) {
            const node = document.querySelector(".jobs-list");
            if (node) node.innerHTML = AdminUi.emptyState(Api.errorMessage(err) || "Unable to load.");
        }
    }
}

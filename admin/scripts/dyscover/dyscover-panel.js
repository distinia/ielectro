import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { App, Api, Alert, Request, AdminShell, AdminUi } from "../core/index.js";
export default class DyscoverPanel {
    constructor() {
        this.tab = "reports";
    }
    formatWhen(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    statusTone(status) {
        const value = String(status || "").toLowerCase();
        if (value === "banned") return "danger";
        if (value === "suspended") return "warn";
        if (value === "active") return "success";
        return "muted";
    }
    bindTabs() {
        document.querySelectorAll(".dyscover-tabs .mod-tab").forEach((btn) => {
            btn.addEventListener("click", () => {
                this.tab = btn.dataset.tab || "reports";
                document.querySelectorAll(".dyscover-tabs .mod-tab").forEach((el) => el.classList.toggle("active", el === btn));
                document.querySelectorAll(".dyscover-panel").forEach((panel) => {
                    panel.classList.toggle("panel-hidden", panel.dataset.panel !== this.tab);
                });
                this.loadTab();
            });
        });
        document.querySelector(".reports-filter-status")?.addEventListener("change", () => this.loadReports());
        document.querySelector(".users-filter-q")?.addEventListener("input", () => this.loadUsers());
        document.querySelector(".users-filter-status")?.addEventListener("change", () => this.loadUsers());
        document.querySelector(".posts-filter-q")?.addEventListener("input", () => this.loadPosts());
        document.querySelector(".dyscover-term-form")?.addEventListener("submit", (e) => this.saveTerm(e));
    }
    async loadOverview() {
        const node = document.querySelector(".dyscover-overview");
        if (!node) return;
        try {
            const res = await Request.get("dyscover/overview");
            const data = Api.record(res) || {};
            const items = [
                { label: "Pending reports", value: data.pending_reports, icon: "flag", tone: "is-danger" },
                { label: "Banned users", value: data.banned_users, icon: "ban", tone: "is-warn" },
                { label: "Suspended users", value: data.suspended_users, icon: "pause-circle", tone: "is-accent" },
                { label: "Banned terms", value: data.banned_terms, icon: "shield", tone: "" },
            ];
            node.innerHTML = items
                .map(
                    (item) => `
                <article class="mod-stat-card ${item.tone}">
                    <div class="mod-stat-icon"><i data-icon="${item.icon}"></i></div>
                    <div class="mod-stat-body">
                        <strong>${App.esc(String(item.value ?? 0))}</strong>
                        <span>${App.esc(item.label)}</span>
                    </div>
                </article>`,
                )
                .join("");
            Nesh.Icons.load(node);
        } catch {
            node.innerHTML = AdminUi.emptyState("Unable to load statistics.");
        }
    }
    loadTab() {
        if (this.tab === "reports") return this.loadReports();
        if (this.tab === "users") return this.loadUsers();
        if (this.tab === "trends") return this.loadTrends();
        if (this.tab === "terms") return this.loadTerms();
        if (this.tab === "posts") return this.loadPosts();
        return Promise.resolve();
    }
    async loadReports() {
        const list = document.querySelector(".dyscover-reports-list");
        if (!list) return;
        const status = document.querySelector(".reports-filter-status")?.value || "pending";
        list.innerHTML = AdminUi.emptyState("Loading…");
        try {
            const res = await Request.get(`dyscover/reports?status=${encodeURIComponent(status)}`);
            const rows = Api.record(res) || [];
            if (!rows.length) {
                list.innerHTML = AdminUi.emptyState("No reports found.");
                return;
            }
            list.innerHTML = rows
                .map(
                    (row) => `
                <article class="mod-row is-warn dyscover-report-row" data-id="${row.id}">
                    <div class="mod-row-accent" aria-hidden="true"></div>
                    <div class="mod-row-main">
                        <div class="mod-row-top">
                            <strong>${App.esc(row.reason_label)}</strong>
                            <span class="mod-badge mod-badge-warn">${App.esc(row.target_type)}</span>
                            <span class="mod-badge mod-badge-muted">${App.esc(row.status)}</span>
                        </div>
                        <p class="mod-row-meta">Reported by @${App.esc(row.reporter?.username || "?")}${row.target_username ? ` · target @${App.esc(row.target_username)}` : ""}</p>
                        ${row.post_title ? `<p class="mod-row-detail">Post: “${App.esc(row.post_title)}”</p>` : ""}
                        ${row.details ? `<p class="mod-row-detail">${App.esc(row.details)}</p>` : ""}
                        <div class="mod-row-actions">
                            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" data-action="dismiss">Dismiss</button>
                            <button type="button" class="admin-btn admin-btn-primary admin-btn-sm" data-action="actioned">Mark resolved</button>
                            ${row.target_user_id ? `<button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-action="ban-user" data-user-id="${row.target_user_id}">Ban user</button>` : ""}
                            ${row.target_post_id ? `<button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-action="remove-post" data-post-id="${row.target_post_id}">Remove post</button>` : ""}
                        </div>
                    </div>
                    <div class="mod-row-side">
                        <time class="mod-row-time">${App.esc(this.formatWhen(row.created_at))}</time>
                    </div>
                </article>`,
                )
                .join("");
            list.onclick = (e) => this.handleReportAction(e);
        } catch {
            list.innerHTML = AdminUi.emptyState("Unable to load reports.");
        }
    }
    async handleReportAction(event) {
        const btn = event.target.closest("[data-action]");
        if (!btn) return;
        const row = btn.closest(".dyscover-report-row");
        const reportId = row?.dataset.id;
        if (!reportId) return;
        const action = btn.dataset.action;
        if (action === "ban-user") {
            const userId = btn.dataset.userId;
            if (!(await Alert.confirm("Ban this user from Dyscover?"))) return;
            const modFd = new FormData();
            modFd.set("user_id", userId);
            modFd.set("action", "ban");
            await Request.post("dyscover/moderate-user", modFd);
            const reviewFd = new FormData();
            reviewFd.set("report_id", reportId);
            reviewFd.set("status", "actioned");
            await Request.post("dyscover/report-review", reviewFd);
        } else if (action === "remove-post") {
            const postId = btn.dataset.postId;
            if (!(await Alert.confirm("Remove this post?"))) return;
            const fd = new FormData();
            fd.set("post_id", postId);
            await Request.post("dyscover/post-remove", fd);
            const reviewFd = new FormData();
            reviewFd.set("report_id", reportId);
            reviewFd.set("status", "actioned");
            await Request.post("dyscover/report-review", reviewFd);
        } else {
            const fd = new FormData();
            fd.set("report_id", reportId);
            fd.set("status", action === "dismiss" ? "dismissed" : "actioned");
            await Request.post("dyscover/report-review", fd);
        }
        Alert.success("Updated");
        await Promise.all([this.loadOverview(), this.loadReports()]);
    }
    async loadUsers() {
        const list = document.querySelector(".dyscover-users-list");
        if (!list) return;
        const q = document.querySelector(".users-filter-q")?.value || "";
        const status = document.querySelector(".users-filter-status")?.value || "all";
        list.innerHTML = AdminUi.emptyState("Loading…");
        try {
            const res = await Request.get(`dyscover/users?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`);
            const rows = Api.record(res) || [];
            if (!rows.length) {
                list.innerHTML = AdminUi.emptyState("No users found.");
                return;
            }
            list.innerHTML = rows
                .map((row) => {
                    const tone = this.statusTone(row.status);
                    const avatar = row.avatar
                        ? `<img src="${App.esc(row.avatar)}" alt="" loading="lazy">`
                        : `<span class="mod-avatar-fallback">${App.esc((row.username || "?").slice(0, 1).toUpperCase())}</span>`;
                    return `
                <article class="mod-row is-${tone}">
                    <div class="mod-row-accent" aria-hidden="true"></div>
                    <div class="mod-row-main">
                        <div class="mod-row-top mod-user-chip">
                            ${avatar}
                            <strong>@${App.esc(row.username)}</strong>
                            ${AdminUi.statusPill(row.status)}
                            <span class="mod-badge mod-badge-muted">${App.esc(String(row.posts_count || 0))} posts</span>
                        </div>
                        <p class="mod-row-meta">${App.esc(row.email)}</p>
                        ${row.ban_reason ? `<p class="mod-row-detail">${App.esc(row.ban_reason)}</p>` : ""}
                        <div class="mod-row-actions">
                            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" data-moderate="activate" data-user-id="${row.id}">Reactivate</button>
                            <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" data-moderate="suspend" data-user-id="${row.id}">Suspend</button>
                            <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-moderate="ban" data-user-id="${row.id}">Ban</button>
                        </div>
                    </div>
                    <div class="mod-row-side">
                        <span class="mod-row-time">Dyscover #${App.esc(String(row.id))}</span>
                    </div>
                </article>`;
                })
                .join("");
            list.onclick = async (e) => {
                const btn = e.target.closest("[data-moderate]");
                if (!btn) return;
                const action = btn.dataset.moderate;
                const userId = btn.dataset.userId;
                let reason = "";
                let days = 7;
                if (action !== "activate") {
                    reason = prompt(action === "ban" ? "Ban reason:" : "Suspension reason:") || "";
                    if (action === "suspend") {
                        days = Number(prompt("Suspension days:", "7") || "7");
                    }
                }
                const fd = new FormData();
                fd.set("user_id", userId);
                fd.set("action", action);
                fd.set("reason", reason);
                fd.set("days", String(days));
                await Request.post("dyscover/moderate-user", fd);
                Alert.success("User updated");
                await Promise.all([this.loadOverview(), this.loadUsers()]);
            };
        } catch {
            list.innerHTML = AdminUi.emptyState("Unable to load users.");
        }
    }
    async loadTrends() {
        const tagsNode = document.querySelector(".dyscover-trends-tags");
        const postsNode = document.querySelector(".dyscover-trends-posts");
        if (!tagsNode || !postsNode) return;
        tagsNode.innerHTML = `<h3>Trending tags</h3>${AdminUi.emptyState("Loading…")}`;
        postsNode.innerHTML = `<h3>Viral posts</h3>`;
        try {
            const res = await Request.get("dyscover/trends");
            const data = Api.record(res) || {};
            const tags = data.tags || [];
            const posts = data.posts || [];
            tagsNode.innerHTML = `<h3>Trending tags</h3>${
                tags.length
                    ? tags
                          .map(
                              (tag, index) => `
                    <div class="mod-trend-item">
                        <div style="display:flex;align-items:center;gap:10px;min-width:0">
                            <span class="mod-trend-rank">${index + 1}</span>
                            <strong>#${App.esc(tag.name)}</strong>
                        </div>
                        <span>${App.esc(String(tag.views_7d))} views</span>
                    </div>`,
                          )
                          .join("")
                    : AdminUi.emptyState("No tags yet.")
            }`;
            postsNode.innerHTML = `<h3>Viral posts</h3>${
                posts.length
                    ? posts
                          .map(
                              (post, index) => `
                    <div class="mod-trend-item">
                        <div style="display:flex;align-items:flex-start;gap:10px;min-width:0">
                            <span class="mod-trend-rank">${index + 1}</span>
                            <div>
                                <strong>${App.esc(post.title || "Untitled")}</strong>
                                <br><small>@${App.esc(post.username)} · ${App.esc(String(post.views))} views</small>
                            </div>
                        </div>
                        <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-remove-post="${post.id}">Remove</button>
                    </div>`,
                          )
                          .join("")
                    : AdminUi.emptyState("No posts yet.")
            }`;
            postsNode.onclick = async (e) => {
                const btn = e.target.closest("[data-remove-post]");
                if (!btn) return;
                if (!(await Alert.confirm("Remove this post?"))) return;
                const fd = new FormData();
                fd.set("post_id", btn.dataset.removePost);
                await Request.post("dyscover/post-remove", fd);
                Alert.success("Post removed");
                await this.loadTrends();
            };
        } catch {
            tagsNode.innerHTML = `<h3>Trending tags</h3>${AdminUi.emptyState("Unable to load trends.")}`;
        }
    }
    async loadTerms() {
        const list = document.querySelector(".dyscover-terms-list");
        if (!list) return;
        list.innerHTML = AdminUi.emptyState("Loading…");
        try {
            const res = await Request.get("dyscover/terms");
            const rows = Api.record(res) || [];
            if (!rows.length) {
                list.innerHTML = AdminUi.emptyState("No banned terms yet.");
                return;
            }
            list.innerHTML = rows
                .map(
                    (row) => `
                <article class="mod-row is-danger">
                    <div class="mod-row-accent" aria-hidden="true"></div>
                    <div class="mod-row-main">
                        <div class="mod-row-top">
                            <strong>${App.esc(row.term)}</strong>
                            <span class="mod-badge mod-badge-danger">${App.esc(row.match_type)}</span>
                        </div>
                        ${row.reason ? `<p class="mod-row-detail">${App.esc(row.reason)}</p>` : ""}
                        <div class="mod-row-actions">
                            <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-term-delete="${row.id}">Delete</button>
                        </div>
                    </div>
                </article>`,
                )
                .join("");
            list.onclick = async (e) => {
                const btn = e.target.closest("[data-term-delete]");
                if (!btn) return;
                if (!(await Alert.confirm("Delete this term?"))) return;
                const fd = new FormData();
                fd.set("id", btn.dataset.termDelete);
                await Request.post("dyscover/term-delete", fd);
                Alert.success("Term deleted");
                await Promise.all([this.loadOverview(), this.loadTerms()]);
            };
        } catch {
            list.innerHTML = AdminUi.emptyState("Unable to load terms.");
        }
    }
    async saveTerm(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const fd = new FormData(form);
        await Request.post("dyscover/term-save", fd);
        Alert.success("Term saved");
        form.reset();
        await Promise.all([this.loadOverview(), this.loadTerms()]);
    }
    async loadPosts() {
        const list = document.querySelector(".dyscover-posts-list");
        if (!list) return;
        const q = document.querySelector(".posts-filter-q")?.value || "";
        list.innerHTML = AdminUi.emptyState("Loading…");
        try {
            const res = await Request.get(`dyscover/posts?q=${encodeURIComponent(q)}`);
            const rows = Api.record(res) || [];
            if (!rows.length) {
                list.innerHTML = AdminUi.emptyState("No posts found.");
                return;
            }
            list.innerHTML = rows
                .map(
                    (row) => `
                <article class="mod-row is-muted">
                    <div class="mod-row-accent" aria-hidden="true"></div>
                    <div class="mod-row-main">
                        <div class="mod-row-top">
                            <strong>${App.esc(row.title || "Untitled")}</strong>
                            ${AdminUi.statusPill(row.status)}
                        </div>
                        <p class="mod-row-meta">@${App.esc(row.username)} · ${App.esc(row.type)} · ${App.esc(String(row.views || 0))} views</p>
                        <p class="mod-row-detail">${App.esc(this.formatWhen(row.published_at))}</p>
                        <div class="mod-row-actions">
                            <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-post-remove="${row.id}">Remove post</button>
                        </div>
                    </div>
                </article>`,
                )
                .join("");
            list.onclick = async (e) => {
                const btn = e.target.closest("[data-post-remove]");
                if (!btn) return;
                if (!(await Alert.confirm("Remove this post?"))) return;
                const fd = new FormData();
                fd.set("post_id", btn.dataset.postRemove);
                await Request.post("dyscover/post-remove", fd);
                Alert.success("Post removed");
                await this.loadPosts();
            };
        } catch {
            list.innerHTML = AdminUi.emptyState("Unable to load posts.");
        }
    }
    async run() {
        document.body.classList.add("admin-page-dyscover");
        AdminShell.mount("dyscover", "Dyscover");
        this.bindTabs();
        await this.loadOverview();
        await this.loadTab();
    }
}

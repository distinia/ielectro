import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { App, Api, Alert, Request, AdminShell, AdminUi } from "../core/index.js";

export default class AccountsPanel {
    bindFiltersOnce() {
        if (this._bound) return;
        this._bound = true;
        document.querySelector(".accounts-filter-q")?.addEventListener("input", () => this.loadLog());
        document.querySelector(".accounts-filter-type")?.addEventListener("change", () => this.loadLog());
        document.querySelector(".accounts-delete-form")?.addEventListener("submit", (e) => this.handleHardDelete(e));
    }

    actionMeta(action) {
        const value = String(action || "").toLowerCase();
        if (value === "login_failed" || value === "deleted") {
            return { tone: "danger", badge: "mod-badge-danger", icon: "shield-alert" };
        }
        if (value === "login" || value === "email_verified" || value === "register") {
            return { tone: "success", badge: "mod-badge-success", icon: "log-in" };
        }
        if (["profile_updated", "email_changed", "password_changed", "username_changed", "phone_number_changed"].includes(value)) {
            return { tone: "warn", badge: "mod-badge-warn", icon: "user-pen" };
        }
        if (["logout", "session_revoked", "password_reset"].includes(value)) {
            return { tone: "muted", badge: "mod-badge-info", icon: "key-round" };
        }
        return { tone: "muted", badge: "mod-badge-muted", icon: "activity" };
    }

    actionLabel(action) {
        return String(action || "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
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

    renderStats(stats = {}) {
        const node = document.querySelector(".accounts-stats");
        if (!node) return;
        const items = [
            { label: "Failed logins (24h)", value: stats.failed_24h, icon: "shield-alert", tone: "is-danger" },
            { label: "Profile updates (7d)", value: stats.updates_7d, icon: "user-pen", tone: "is-warn" },
            { label: "Scheduled deletions", value: stats.scheduled_deletions, icon: "calendar-clock", tone: "is-accent" },
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
    }

    renderLogRow(item) {
        const meta = this.actionMeta(item.action);
        const account = item.account;
        const avatar = account?.avatar
            ? `<img src="${App.esc(account.avatar)}" alt="" loading="lazy">`
            : `<span class="mod-avatar-fallback">${App.esc((account?.username || "?").slice(0, 1).toUpperCase())}</span>`;

        return `
            <article class="mod-row is-${meta.tone}">
                <div class="mod-row-accent" aria-hidden="true"></div>
                <div class="mod-row-main">
                    <div class="mod-row-top">
                        <strong>${App.esc(this.actionLabel(item.action))}</strong>
                    </div>
                    ${
                        account
                            ? `<p class="mod-row-meta mod-user-chip">${avatar}<span>@${App.esc(account.username)} · ${App.esc(account.email)}</span></p>`
                            : `<p class="mod-row-meta"><span class="mod-badge mod-badge-muted">Unknown account</span></p>`
                    }
                    ${item.details ? `<p class="mod-row-detail">${App.esc(item.details)}</p>` : ""}
                    ${item.ip_address ? `<p class="mod-row-detail">IP ${App.esc(item.ip_address)}</p>` : ""}
                </div>
                <div class="mod-row-side">
                    <time class="mod-row-time">${App.esc(this.formatWhen(item.created_at))}</time>
                    <span class="mod-stat-icon" style="width:34px;height:34px;flex:0 0 34px"><i data-icon="${meta.icon}"></i></span>
                </div>
            </article>`;
    }

    async loadLog() {
        const list = document.querySelector(".accounts-log-list");
        if (!list) return;
        const q = document.querySelector(".accounts-filter-q")?.value || "";
        const filter = document.querySelector(".accounts-filter-type")?.value || "all";
        list.innerHTML = AdminUi.emptyState("Loading…");
        try {
            const res = await Request.get(`accounts/log?filter=${encodeURIComponent(filter)}&q=${encodeURIComponent(q)}`);
            const data = Api.record(res) || {};
            this.renderStats(data.stats || {});
            const items = data.items || [];
            if (!items.length) {
                list.innerHTML = AdminUi.emptyState("No events found.");
                return;
            }
            list.innerHTML = items.map((item) => this.renderLogRow(item)).join("");
            Nesh.Icons.load(list);
        } catch {
            list.innerHTML = AdminUi.emptyState("Unable to load activity log.");
        }
    }

    async handleHardDelete(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const msg = form.querySelector(".accounts-delete-msg");
        const username = form.querySelector('[name="username"]').value.trim();
        if (!username) return;
        if (!(await Alert.confirm(`Permanently delete @${username}? This cannot be undone.`))) return;
        msg.textContent = "";
        try {
            const fd = new FormData();
            fd.set("username", username);
            await Request.post("accounts/hard-delete", fd);
            Alert.success("Account deleted");
            form.reset();
            await this.loadLog();
        } catch (err) {
            msg.textContent = err?.text || "Delete failed";
            Alert.error(err?.text || "Delete failed");
        }
    }

    async run() {
        document.body.classList.add("admin-page-accounts");
        AdminShell.mount("accounts", "Accounts");
        Nesh.Icons.load(document.querySelector(".mod-danger-note"));
        this.bindFiltersOnce();
        await this.loadLog();
    }
}

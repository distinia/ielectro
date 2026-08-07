import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";

export class ActivityFeed {
    constructor() {
        this.activityOut = document.querySelector("#activity-output");
        this.filterSelect = document.querySelector("#activity-type-filter");
        this.templates = null;
        this.usernameHistory = [];
        this.rows = [];
        this.filterValue = "all";
        this.load();
    }
    messagesUrl() {
        return "https://account.ielectro.com/data/activity-messages.json";
    }
    signinActions() {
        return new Set(["login_success", "login_failed", "logout_all_devices", "login"]);
    }
    passwordActions() {
        return new Set([
            "password_changed",
            "password_change",
            "password_recovery_requested",
            "password_reset_completed",
        ]);
    }
    accountActions() {
        return new Set([
            "created",
            "register",
            "deletion_scheduled",
            "deletion_cancelled",
            "username_changed",
            "username_change",
        ]);
    }
    filterCategory(action) {
        const a = action || "";
        if (this.signinActions().has(a)) return "signin";
        if (this.passwordActions().has(a)) return "password";
        if (this.accountActions().has(a)) return "account";
        return "other";
    }
    rowMatchesFilter(filterValue, action) {
        if (filterValue === "all") return true;
        return this.filterCategory(action) === filterValue;
    }
    shouldShowRowOnClient(row) {
        return (row?.action || "") !== "logout";
    }
    async load() {
        await this.loadTemplates();
        await this.loadActivity();
        if (this.filterSelect) {
            this.filterSelect.addEventListener("change", () => {
                this.filterValue = this.filterSelect.value || "all";
                this.renderRows();
            });
        }
    }
    async loadTemplates() {
        try {
            this.templates = await Nesh.Request.get(this.messagesUrl());
        } catch {
            this.templates = { default: "{details} ({datetime})" };
        }
    }
    formatDateTime(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return String(iso);
        return d.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    }
    formatRow(row) {
        const action = row.action || "event";
        const datetime = this.formatDateTime(row.created_at);
        const details = String(row.details || "").trim();
        const tpl =
            this.templates?.[action] ||
            this.templates?.default ||
            "{details} ({datetime})";
        if (action === "username_changed" || action === "username_change") {
            const m = details.match(/from\s+(\S+)\s+to\s+(\S+)/i);
            const from = m ? m[1] : "?";
            const to = m ? m[2] : "?";
            return tpl
                .replaceAll("{from}", from)
                .replaceAll("{to}", to)
                .replaceAll("{datetime}", datetime);
        }
        return tpl
            .replaceAll("{details}", details || action)
            .replaceAll("{datetime}", datetime);
    }
    formatSummaryHtml(row) {
        const action = row.action || "event";
        if (action === "username_changed" || action === "username_change") {
            const details = String(row.details || "").trim();
            const m = details.match(/from\s+(\S+)\s+to\s+(\S+)/i);
            const from = Nesh.Html.escape(m ? m[1] : "?");
            const to = Nesh.Html.escape(m ? m[2] : "?");
            const datetime = Nesh.Html.escape(this.formatDateTime(row.created_at));
            return `You changed your username from <strong>${from}</strong> to <strong>${to}</strong> on ${datetime}.`;
        }
        return Nesh.Html.escape(this.formatRow(row));
    }
    rowHtml(row) {
        const action = row.action || "";
        const cat = this.filterCategory(action);
        return `<div class="activity-item" tabindex="0" data-activity-action="${Nesh.Html.escape(action)}" data-activity-category="${Nesh.Html.escape(cat)}"><p class="activity-summary">${this.formatSummaryHtml(row)}</p></div>`;
    }
    renderRows() {
        if (!this.activityOut) return;
        const filtered = this.rows.filter((row) =>
            this.rowMatchesFilter(this.filterValue, row.action),
        );
        if (!this.rows.length) return;
        if (!filtered.length) {
            this.activityOut.innerHTML = `<div class="activity-item"><p class="activity-meta">No entries in this category</p></div>`;
            return;
        }
        this.activityOut.innerHTML = filtered.map((row) => this.rowHtml(row)).join("");
    }
    async loadActivity() {
        if (!this.activityOut) return;
        try {
            const response = await Nesh.Request.get(
                "https://account.ielectro.com/api/activity",
            );
            const payload = Api.record(response) || {};
            const rawRows = Array.isArray(payload.recent_activity)
                ? payload.recent_activity
                : [];
            this.rows = rawRows.filter((row) => this.shouldShowRowOnClient(row));
            if (!this.rows.length) {
                this.activityOut.innerHTML = `<div class="activity-item"><p class="activity-meta">No activity found</p></div>`;
                return;
            }
            this.renderRows();
        } catch (error) {
            this.activityOut.innerHTML = `<div class="activity-item"><p class="activity-meta">${Nesh.Html.escape(Api.errorMessage(error))}</p></div>`;
        }
    }
}

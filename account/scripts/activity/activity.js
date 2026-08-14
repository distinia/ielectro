import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";
import { ActivityFormat } from "../core/activity-format.js";
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
        return ActivityFormat.messagesUrl();
    }
    signinActions() {
        return new Set([
            "login",
            "logout",
            "session_revoked",
            "login_success",
            "login_failed",
            "logout_all_devices",
        ]);
    }
    passwordActions() {
        return new Set([
            "password_changed",
            "password_change",
            "password_reset",
            "password_recovery_requested",
            "password_reset_completed",
        ]);
    }
    accountActions() {
        return new Set([
            "register",
            "created",
            "username_changed",
            "username_change",
            "profile_updated",
            "profile_update",
            "email_changed",
            "email_verified",
            "phone_number_changed",
            "deleted",
            "deletion_scheduled",
            "deletion_cancelled",
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
        return ActivityFormat.shouldShow(row);
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
        this.templates = await ActivityFormat.loadTemplates();
        this.formatter = new ActivityFormat(this.templates);
    }
    formatDateTime(iso) {
        return (this.formatter || new ActivityFormat(this.templates)).formatDateTime(iso);
    }
    formatRow(row) {
        return (this.formatter || new ActivityFormat(this.templates)).formatText(row);
    }
    formatSummaryHtml(row) {
        return (this.formatter || new ActivityFormat(this.templates)).formatHtml(row);
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

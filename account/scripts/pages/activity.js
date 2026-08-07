import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
const MESSAGES_URL =
    "https://account.ielectro.com/data/activity-messages.json";
const DEVICE_ACTIONS = new Set(["logout_all_devices"]);
const FILTER_SIGNIN = new Set([
    "login_success",
    "login_failed",
    "logout_all_devices",
]);
const FILTER_PASSWORD = new Set([
    "password_changed",
    "password_recovery_requested",
    "password_reset_completed",
]);
const FILTER_ACCOUNT = new Set([
    "created",
    "deletion_scheduled",
    "deletion_cancelled",
    "username_changed",
]);
function filterCategory(action) {
    const a = action || "";
    if (FILTER_SIGNIN.has(a)) return "signin";
    if (FILTER_PASSWORD.has(a)) return "password";
    if (FILTER_ACCOUNT.has(a)) return "account";
    return "other";
}
function rowMatchesFilter(filterValue, action) {
    if (filterValue === "all") return true;
    return filterCategory(action) === filterValue;
}
function shouldShowRowOnClient(row) {
    const action = row?.action || "";
    if (action === "logout") {
        return false;
    }
    return true;
}
function dedupeKnownDeviceLogins(rows) {
    const seenDevice = new Set();
    return rows.filter((row) => {
        if ((row?.action || "") !== "login_success") {
            return true;
        }
        const device = String(row?.device_info || "")
            .trim()
            .toLowerCase();
        if (device === "") {
            return true;
        }
        if (seenDevice.has(device)) {
            return false;
        }
        seenDevice.add(device);
        return true;
    });
}
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    new App();
    new ActivityPage();
});
class ActivityPage {
    constructor() {
        this.activityOut = document.querySelector("#activity-output");
        this.filterSelect = document.querySelector("#activity-type-filter");
        this.templates = null;
        this.usernameHistory = [];
        this.rows = [];
        this.filterValue = "all";
        this.load();
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
            this.templates = await Nesh.Request.get(MESSAGES_URL);
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
    resolveUsernameChange(details) {
        const m = String(details || "").match(/from\s+(\S+)\s+to\s+(\S+)/i);
        if (!m) {
            return null;
        }
        let from = m[1];
        let to = m[2];
        const row = this.usernameHistory.find(
            (h) => h.username_old === from && h.username_new === to,
        );
        if (row) {
            from = row.username_old;
            to = row.username_new;
        }
        return { from, to };
    }
    formatRow(row) {
        const action = row.action || "event";
        const datetime = this.formatDateTime(row.created_at);
        const details = String(row.details || "").trim();
        const tpl =
            (this.templates && this.templates[action]) ||
            (this.templates && this.templates.default) ||
            "{details} ({datetime})";
        if (action === "username_changed") {
            const resolved = this.resolveUsernameChange(details);
            const m = details.match(/from\s+(\S+)\s+to\s+(\S+)/i);
            const from = resolved?.from ?? (m ? m[1] : "?");
            const to = resolved?.to ?? (m ? m[2] : "?");
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
        if (action === "username_changed") {
            const details = String(row.details || "").trim();
            const resolved = this.resolveUsernameChange(details);
            const m = details.match(/from\s+(\S+)\s+to\s+(\S+)/i);
            const from = Nesh.Html.escape(resolved?.from ?? (m ? m[1] : "?"));
            const to = Nesh.Html.escape(resolved?.to ?? (m ? m[2] : "?"));
            const datetime = Nesh.Html.escape(this.formatDateTime(row.created_at));
            return `You changed your username from <strong>${from}</strong> to <strong>${to}</strong> on ${datetime}.`;
        }
        return Nesh.Html.escape(this.formatRow(row));
    }
    shouldShowDevice(action) {
        return DEVICE_ACTIONS.has(action);
    }
    rowHtml(row) {
        const action = row.action || "";
        const showDev = this.shouldShowDevice(action) && row.device_info;
        const cat = filterCategory(action);
        const isNew = row?.is_new === true;
        return ` <div class="activity-item ${isNew ? "activity-item-new" : ""}" tabindex="0" data-activity-action="${Nesh.Html.escape(action)}" data-activity-category="${Nesh.Html.escape(cat)}"> <p class="activity-summary">${this.formatSummaryHtml(row)}</p> ${showDev ? `<p class="activity-meta activity-device">${Nesh.Html.escape(row.device_info)}</p>` : ""} </div> `;
    }
    renderRows() {
        if (!this.activityOut) return;
        const filtered = this.rows.filter((row) =>
            rowMatchesFilter(this.filterValue, row.action),
        );
        if (!this.rows.length) {
            return;
        }
        if (!filtered.length) {
            this.activityOut.innerHTML = `<div class="activity-item"><p class="activity-meta">No entries in this category</p></div>`;
            return;
        }
        this.activityOut.innerHTML = filtered
            .map((row) => this.rowHtml(row))
            .join("");
    }
    async loadActivity() {
        if (!this.activityOut) return;
        try {
            const data = await Nesh.Request.get(
                "https://account.ielectro.com/api/activity",
            );
            const payload = data?.data;
            const rawRows = Array.isArray(payload) ? payload : payload?.events || [];
            const rows = dedupeKnownDeviceLogins(rawRows).filter(
                shouldShowRowOnClient,
            );
            this.usernameHistory = Array.isArray(payload?.username_history)
                ? payload.username_history
                : [];
            this.rows = rows;
            if (!rows.length) {
                this.activityOut.innerHTML = `<div class="activity-item"><p class="activity-meta">No activity found</p></div>`;
                return;
            }
            this.renderRows();
        } catch (error) {
            this.activityOut.innerHTML = `<div class="activity-item"><p class="activity-meta">${Nesh.Html.escape(error?.text || "Unable to load activity")}</p></div>`;
        }
    }
}

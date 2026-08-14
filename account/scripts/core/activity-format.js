import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export class ActivityFormat {
    constructor(templates = null) {
        this.templates = templates || { default: "{details} ({datetime})" };
    }
    static messagesUrl() {
        return "https://account.ielectro.com/data/activity-messages.json";
    }
    static async loadTemplates() {
        try {
            return await Nesh.Request.get(ActivityFormat.messagesUrl());
        } catch {
            return { default: "{details} ({datetime})" };
        }
    }
    static shouldShow(row) {
        return (row?.action || "") !== "logout";
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
    formatText(row) {
        const action = row.action || "event";
        const datetime = this.formatDateTime(row.created_at);
        const details = String(row.details || "").trim();
        const tpl =
            this.templates?.[action] ||
            this.templates?.default ||
            "{details} ({datetime})";
        if (action === "username_changed" || action === "username_change") {
            const match = details.match(/from\s+(\S+)\s+to\s+(\S+)/i);
            const from = match ? match[1] : "?";
            const to = match ? match[2] : "?";
            return tpl
                .replaceAll("{from}", from)
                .replaceAll("{to}", to)
                .replaceAll("{datetime}", datetime);
        }
        return tpl
            .replaceAll("{details}", details || this.humanizeAction(action))
            .replaceAll("{datetime}", datetime);
    }
    formatTextWithoutDate(row) {
        const text = this.formatText(row);
        const datetime = this.formatDateTime(row.created_at);
        if (!datetime) {
            return text;
        }
        return text
            .replace(` on ${datetime}.`, ".")
            .replace(` (${datetime})`, "")
            .trim();
    }
    formatHtml(row) {
        const action = row.action || "event";
        if (action === "username_changed" || action === "username_change") {
            const details = String(row.details || "").trim();
            const match = details.match(/from\s+(\S+)\s+to\s+(\S+)/i);
            const from = Nesh.Html.escape(match ? match[1] : "?");
            const to = Nesh.Html.escape(match ? match[2] : "?");
            const datetime = Nesh.Html.escape(this.formatDateTime(row.created_at));
            return `You changed your username from <strong>${from}</strong> to <strong>${to}</strong> on ${datetime}.`;
        }
        return Nesh.Html.escape(this.formatText(row));
    }
    humanizeAction(action) {
        const labels = {
            login: "Signed in",
            session_revoked: "Session revoked",
            password_changed: "Password updated",
            password_reset: "Password recovery activity",
            profile_updated: "Profile updated",
            register: "Account created",
            email_changed: "Email changed",
            email_verified: "Email verified",
            phone_number_changed: "Phone number changed",
            username_changed: "Username changed",
            deleted: "Account deleted",
        };
        return labels[action] || String(action).replace(/_/g, " ");
    }
}

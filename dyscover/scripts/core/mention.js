export class Mention {
    static pattern = /@([a-zA-Z0-9_]{2,32})/g;
    static escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    static linkify(text) {
        const escaped = this.escapeHtml(text || "");
        return escaped.replace(
            /@([a-zA-Z0-9_]{2,32})/g,
            (_, user) =>
                `<a class="mention-link" href="https://dyscover.ielectro.com/u/${encodeURIComponent(user)}">@${user}</a>`,
        );
    }
    static renderInto(element, text, empty = "") {
        if (!element) return;
        const value = String(text || "").trim();
        if (!value) {
            element.textContent = empty;
            return;
        }
        element.innerHTML = this.linkify(value);
    }
}

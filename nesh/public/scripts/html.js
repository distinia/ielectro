export default class Html {
    static escape(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
    static normalizedPath() {
        let path = window.location.pathname.replace(/\\/g, "/");
        if (path.length > 1 && path.endsWith("/")) {
            path = path.slice(0, -1);
        }
        return path;
    }
    static setScrollEnabled(enabled) {
        document.body.style.overflow = enabled ? "visible" : "hidden";
    }
}
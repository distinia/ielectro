export class Spinner {
    static _pageRoot = null;

    static html(compact = false) {
        return `<div class="page-spinner${compact ? " page-spinner--compact" : ""}" role="status" aria-label="Loading">
            <div class="page-spinner__ring"></div>
        </div>`;
    }

    static mount(container, compact = false) {
        if (!container) return;
        container.innerHTML = Spinner.html(compact);
    }

    static showPage() {
        if (Spinner._pageRoot) return;
        const existing = document.getElementById("page-boot-spinner");
        if (existing) {
            Spinner._pageRoot = existing;
            document.body.classList.add("page-is-loading");
            return;
        }
        const root = document.createElement("div");
        root.className = "page-spinner-overlay";
        root.id = "page-boot-spinner";
        root.innerHTML = Spinner.html();
        document.body.appendChild(root);
        Spinner._pageRoot = root;
        document.body.classList.add("page-is-loading");
    }

    static hidePage() {
        Spinner._pageRoot?.remove();
        Spinner._pageRoot = null;
        document.body.classList.remove("page-is-loading");
    }
}

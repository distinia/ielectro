export class Spinner {
    static html(compact = false) {
        return `<div class="page-spinner${compact ? " page-spinner--compact" : ""}" role="status" aria-label="Loading">
            <div class="page-spinner__ring"></div>
        </div>`;
    }
    static mount(container, compact = false) {
        if (!container) return;
        container.innerHTML = Spinner.html(compact);
    }
    static showPage() {}
    static hidePage() {}
}

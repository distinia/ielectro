import { Icons } from "./nesh.js";
import { App } from "./app.js";
export class Overlay {
    constructor(title = "") {
        this.title = title;
        this.root = null;
        this.panel = null;
    }
    async open() {
        this.root = document.createElement("div");
        this.root.className = "dysc-overlay";
        this.root.innerHTML = `
            <div class="dysc-overlay-panel" role="dialog" aria-modal="true">
                <header class="dysc-overlay-header">
                    <h2 class="dysc-overlay-title">${this.title}</h2>
                    <button type="button" class="dysc-overlay-close" aria-label="Close"><i data-icon="circle-x"></i></button>
                </header>
                <div class="dysc-overlay-body"></div>
            </div>`;
        document.body.appendChild(this.root);
        App.setScrollEnabled(false);
        this.panel = this.root.querySelector(".dysc-overlay-body");
        this.root.querySelector(".dysc-overlay-close")?.addEventListener("click", () => this.close());
        this.root.addEventListener("click", (e) => {
            if (e.target === this.root) this.close();
        });
        requestAnimationFrame(() => this.root.classList.add("is-open"));
        await Icons.load(this.root);
        return this.panel;
    }
    body(callback) {
        if (this.panel) callback(this.panel);
    }
    close() {
        if (!this.root) return;
        this.root.classList.remove("is-open");
        this.root.addEventListener(
            "transitionend",
            () => {
                this.root?.remove();
                this.root = null;
                this.panel = null;
                App.setScrollEnabled(true);
            },
            { once: true },
        );
    }
}

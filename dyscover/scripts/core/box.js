import { Icons } from "./nesh.js";

export class Box {
    constructor(title, options = {}) {
        this.title = title;
        this.variant = options.variant || "";
        this.help = options.help || "";
        this.hideFooter = options.hideFooter ?? false;
        this.headerActions = options.headerActions || "";
        this.hideTitle = options.hideTitle ?? false;
        this.headerLayout = options.headerLayout || "default";
    }
    async create() {
        this.container = document.createElement("div");
        this.container.className = "prompt-container";
        const variantClass = this.variant
            ? ` select-item-box--${this.variant}`
            : "";
        const helpHtml = this.help
            ? `<div class="select-item-help-wrap">
                    <button type="button" class="select-item-help-btn" aria-label="Help"><span aria-hidden="true">?</span></button>
                    <div class="select-item-help-box" role="tooltip">${this.help}</div>
                </div>`
            : "";
        const closeHtml = `<div class="select-item-close-box" role="button" tabindex="0" aria-label="Close"><span class="select-item-close-mark" aria-hidden="true">×</span></div>`;
        const footerHtml = this.hideFooter
            ? ""
            : `<div class="select-item-footer"></div>`;
        const headerHtml =
            this.headerLayout === "creator"
                ? `<div class="select-item-header select-item-header--creator">
                    ${closeHtml}
                    <div class="select-item-title">${this.title}</div>
                    <div class="select-item-header-actions">
                        ${this.headerActions}
                        ${helpHtml}
                    </div>
                </div>`
                : `<div class="select-item-header">
                    ${this.hideTitle ? "" : `<div class="select-item-title">${this.title}</div>`}
                    <div class="select-item-header-actions">
                        ${this.headerActions}
                        ${helpHtml}
                        ${closeHtml}
                    </div>
                </div>`;
        this.container.innerHTML = `
            <div class="select-item-box${variantClass}">
                ${headerHtml}
                <div class="select-item-body"></div>
                ${footerHtml}
            </div>`;
        document.body.appendChild(this.container);
        this.box = this.container.querySelector(".select-item-box");
        requestAnimationFrame(() => {
            this.box.classList.add("show");
        });
        this.container
            .querySelector(".select-item-close-box")
            .addEventListener("click", () => this.close());
        await Icons.load(this.container);
    }
    body(callback) {
        if (!this.container) return;
        callback(this.container.querySelector(".select-item-body"));
    }
    footer(callback) {
        if (!this.container) return;
        callback(this.container.querySelector(".select-item-footer"));
    }
    close() {
        if (!this.box) return;
        this.box.classList.remove("show");
        this.box.addEventListener(
            "transitionend",
            () => {
                this.container?.remove();
            },
            { once: true },
        );
    }
}

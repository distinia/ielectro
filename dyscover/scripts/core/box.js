import { Icons } from "./nesh.js";
export class Box {
    constructor(title) {
        this.title = title;
    }
    async create() {
        this.container = document.createElement("div");
        this.container.className = "prompt-container";
        this.container.innerHTML = `
            <div class="select-item-box">
                <div class="select-item-header">
                    <div class="select-item-title">${this.title}</div>
                    <div class="select-item-close-box"><i data-icon="circle-x"></i></div>
                </div>
                <div class="select-item-body"></div>
                <div class="select-item-footer"></div>
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

import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export class Alert {
    static close(container) {
        if (!container) return;
        container.classList.add("alert-closing");
        setTimeout(() => {
            container.remove();
            Nesh.Html.setScrollEnabled(true);
        }, 280);
    }
    static iconName(type) {
        switch (type) {
            case "success":
                return "success";
            case "confirm":
                return "exclamation";
            default:
                return "error";
        }
    }
    static create(text, type = "error", confirm = false) {
        const existing = document.querySelector(".alert-container");
        if (existing) existing.remove();
        Nesh.Html.setScrollEnabled(false);
        const container = document.createElement("div");
        container.className = "alert-container";
        container.innerHTML = `<div class="alert alert-${type}"><div class="alert-icon-container"><span class="alert-icon"><i data-icon="${this.iconName(type)}"></i></span></div><div class="alert-message">${Nesh.Html.escape(text)}</div><div class="alert-actions">${confirm ? '<button type="button" class="alert-button alert-confirm-button">Confirm</button>' : ""}<button type="button" class="alert-button alert-close-button">${confirm ? "Cancel" : "Close"}</button></div></div>`;
        document.body.appendChild(container);
        Nesh.Icons.load(container);
        container.addEventListener("click", (event) => {
            if (event.target === container) {
                this.close(container);
            }
        });
        const escHandler = (event) => {
            if (event.key === "Escape") {
                this.close(container);
                document.removeEventListener("keydown", escHandler);
            }
        };
        document.addEventListener("keydown", escHandler);
        return container;
    }
    static success(text) {
        const container = this.create(text, "success");
        container.querySelector(".alert-close-button").addEventListener("click", () => this.close(container));
        setTimeout(() => this.close(container), 2600);
    }
    static error(text) {
        const container = this.create(text, "error");
        container.querySelector(".alert-close-button").addEventListener("click", () => this.close(container));
    }
    static confirm(text) {
        const container = this.create(text, "confirm", true);
        const confirmButton = container.querySelector(".alert-confirm-button");
        const closeButton = container.querySelector(".alert-close-button");
        return new Promise((resolve) => {
            confirmButton.addEventListener("click", () => {
                resolve(true);
                this.close(container);
            });
            closeButton.addEventListener("click", () => {
                resolve(false);
                this.close(container);
            });
        });
    }
}

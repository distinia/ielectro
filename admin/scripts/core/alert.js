import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export class Alert {
    static close(container) {
        if (!container) return;
        container.classList.add("alert-closing");
        setTimeout(() => {
            container.remove();
            if (!document.querySelector(".admin-modal-overlay")) {
                Nesh.Html.setScrollEnabled(true);
            }
        }, 280);
    }
    static iconName(type) {
        switch (type) {
            case "success":
                return "success";
            case "confirm":
                return "exclamation";
            default:
                return "exclamation";
        }
    }
    static create(text, type = "error", confirm = false) {
        const existing = document.querySelector(".alert-container");
        if (existing) existing.remove();
        Nesh.Html.setScrollEnabled(false);
        const container = document.createElement("div");
        container.className = "alert-container";
        container.innerHTML = `
            <div class="alert alert-${type}">
                <div class="alert-icon-wrap">
                    <span class="alert-icon"><i data-icon="${this.iconName(type)}"></i></span>
                </div>
                <p class="alert-message">${Nesh.Html.escape(text)}</p>
                <div class="alert-actions">
                    ${
                        confirm
                            ? `<button type="button" class="alert-btn alert-btn-confirm" aria-label="Confirm" title="Confirm"><i data-icon="check"></i></button>`
                            : ""
                    }
                    <button type="button" class="alert-btn alert-btn-cancel" aria-label="${confirm ? "Cancel" : "Close"}" title="${confirm ? "Cancel" : "Close"}">
                        <i data-icon="x"></i>
                    </button>
                </div>
            </div>`;
        document.body.appendChild(container);
        Nesh.Icons.load(container);
        container.addEventListener("click", (event) => {
            if (event.target === container) {
                this.close(container);
            }
        });
        const onKey = (event) => {
            if (event.key === "Escape") {
                document.removeEventListener("keydown", onKey);
                this.close(container);
            }
        };
        document.addEventListener("keydown", onKey);
        return container;
    }
    static success(text) {
        const container = this.create(text, "success");
        container.querySelector(".alert-btn-cancel")?.addEventListener("click", () => this.close(container));
        setTimeout(() => this.close(container), 2600);
    }
    static error(text) {
        const container = this.create(text, "error");
        container.querySelector(".alert-btn-cancel")?.addEventListener("click", () => this.close(container));
    }
    static confirm(text) {
        const container = this.create(text, "confirm", true);
        const confirmButton = container.querySelector(".alert-btn-confirm");
        const closeButton = container.querySelector(".alert-btn-cancel");
        return new Promise((resolve) => {
            confirmButton?.addEventListener("click", () => {
                resolve(true);
                this.close(container);
            });
            closeButton?.addEventListener("click", () => {
                resolve(false);
                this.close(container);
            });
        });
    }
}

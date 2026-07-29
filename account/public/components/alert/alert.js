import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export default class Alert {
   static close(container) {
        if (!container) return;
        container.classList.add("alert-closing");
        setTimeout(() => {
            container.remove();
            Nesh.Html.setScrollEnabled(true);
        }, 300);
    }
   static create(text, type = "error", confirm = false) {
        const existing = document.querySelector(".alert-container");
        if (existing) existing.remove();
        Nesh.Html.setScrollEnabled(false);
        const container = document.createElement("div");
        container.className = "alert-container";
        container.innerHTML = `
      <div class="alert alert-${type}">
        <div class="alert-icon-container">
          <div class="alert-icon">
            <i data-icon="${this.getIcon(type)}"></i>
          </div>
        </div>
        <div class="alert-message">
          ${text}
        </div>
        ${confirm ? `
          <div class="alert-button alert-confirm-button">
            <i data-icon="success"></i>
          </div>
        ` : ""}
        <div class="alert-button alert-close-button">
          <i data-icon="error"></i>
        </div>
      </div>
    `;
        document.body.appendChild(container);
        Nesh.Icons.load(container);
        return container;
    }
   static getIcon(type) {
        switch (type) {
            case "success":
                return "success";
            case "confirm":
                return "exclamation";
            default:
                return "error";
        }
    }
   static success(text) {
        const container = this.create(text, "success");
        const closeButton = container.querySelector(".alert-close-button");
        closeButton.addEventListener("click", () => this.close(container));
    }
   static error(text) {
        const container = this.create(text, "error");
        const closeButton = container.querySelector(".alert-close-button");
        closeButton.addEventListener("click", () => this.close(container));
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

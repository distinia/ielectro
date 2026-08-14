import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { App } from "./app.js";

export class AdminModal {
    static overlay = null;
    static closeTimer = null;

    static syncScrollLock() {
        Nesh.Html.setScrollEnabled(!this.overlay);
    }

    static close() {
        const closing = this.overlay;
        if (!closing) return;

        this.overlay = null;
        if (this.closeTimer) {
            clearTimeout(this.closeTimer);
            this.closeTimer = null;
        }

        closing.classList.add("admin-modal-closing");
        this.closeTimer = setTimeout(() => {
            closing.remove();
            this.closeTimer = null;
            this.syncScrollLock();
        }, 220);
    }

    static open({ title, content, footer = "", onClose = null }) {
        this.close();
        const overlay = document.createElement("div");
        overlay.className = "admin-modal-overlay";
        overlay.innerHTML = `
            <div class="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
                <header class="admin-modal-head">
                    <h2 id="admin-modal-title">${App.esc(title)}</h2>
                    <button type="button" class="admin-icon-btn admin-modal-close" aria-label="Close" title="Close">
                        <i data-icon="x"></i>
                    </button>
                </header>
                <div class="admin-modal-body">${content}</div>
                ${footer ? `<footer class="admin-modal-foot">${footer}</footer>` : ""}
            </div>`;
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.syncScrollLock();

        let ignoreBackdropUntil = Date.now() + 320;
        const close = () => {
            onClose?.();
            this.close();
        };
        overlay.querySelector(".admin-modal-close")?.addEventListener("click", close);
        overlay.addEventListener("click", (e) => {
            if (Date.now() < ignoreBackdropUntil) return;
            if (e.target === overlay) close();
        });
        const onKey = (e) => {
            if (e.key === "Escape") {
                document.removeEventListener("keydown", onKey);
                close();
            }
        };
        document.addEventListener("keydown", onKey);
        Nesh.Icons.load(overlay);
        return overlay;
    }

    static formFooter({ formId, saveLabel = "Save", deleteLabel = "Delete", showDelete = false, deleteClass = "" }) {
        const deleteBtn = showDelete
            ? `<button type="button" class="admin-icon-btn admin-icon-btn-danger ${deleteClass}" aria-label="${App.esc(deleteLabel)}" title="${App.esc(deleteLabel)}"><i data-icon="trash-2"></i></button>`
            : "";
        return `
            <button type="submit" form="${App.esc(formId)}" class="admin-icon-btn admin-icon-btn-accent" aria-label="${App.esc(saveLabel)}" title="${App.esc(saveLabel)}">
                <i data-icon="check"></i>
            </button>
            ${deleteBtn}`;
    }
}

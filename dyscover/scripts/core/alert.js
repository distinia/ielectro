import { Icons } from "./nesh.js";
export class Alert {
    static success(text) {
        return this.toast(text, "success");
    }
    static error(text) {
        return this.toast(text, "error");
    }
    static info(text) {
        return this.toast(text, "info");
    }
    static prompt(text) {
        return this.open(text, "input");
    }
    static select(text, options = []) {
        return this.open(text, "select", options);
    }
    static async toast(text, type = "info") {
        const palette = {
            success: { title: "Success", icon: "check", bg: "#19722c" },
            error: { title: "Error", icon: "circle-x", bg: "#a94442" },
            info: { title: "Info", icon: "info", bg: "#2b6cb0" },
        }[type];
        const root = document.createElement("div");
        root.className = "prompt-container alert-toast";
        root.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <div class="modal-icon" style="background:${palette.bg}">
                    <i data-icon="${palette.icon}"></i>
                </div>
                <div class="modal-title">${palette.title}</div>
            </div>
            <div class="modal-message">${text}</div>
        </div>`;
        document.body.appendChild(root);
        const box = root.querySelector(".modal-box");
        setTimeout(() => box.classList.add("show"), 10);
        await Icons.load(root);
        setTimeout(() => {
            box.classList.remove("show");
            setTimeout(() => root.remove(), 200);
        }, 3000);
    }
    static confirm(text) {
        return new Promise((resolve) => {
            const root = document.createElement("div");
            root.className = "prompt-container";
            root.innerHTML = `
            <div class="modal-box">
                <div class="modal-title">${text}</div>
                <div class="modal-buttons">
                    <button class="ok">Confirm</button>
                    <button class="cancel">Cancel</button>
                </div>
            </div>`;
            document.body.appendChild(root);
            const box = root.querySelector(".modal-box");
            const ok = root.querySelector(".ok");
            const cancel = root.querySelector(".cancel");
            setTimeout(() => box.classList.add("show"), 10);
            const close = (result) => {
                box.classList.remove("show");
                setTimeout(() => root.remove(), 200);
                resolve(result);
            };
            ok.onclick = () => close(true);
            cancel.onclick = () => close(false);
            root.addEventListener("keydown", (e) => {
                if (e.key === "Enter") ok.click();
                if (e.key === "Escape") cancel.click();
            });
        });
    }
    static open(text, type = "input", options = []) {
        return new Promise((resolve) => {
            const root = document.createElement("div");
            root.className = "prompt-container";
            let inputHTML = "";
            if (type === "input") {
                inputHTML = `<input class="modal-input">`;
            }
            if (type === "select") {
                inputHTML = `<select class="modal-input">${options.map((o) => `<option value="${o}">${o}</option>`).join("")}</select>`;
            }
            root.innerHTML = `
            <div class="modal-box">
                <div class="modal-title">${text}</div>
                ${inputHTML}
                <div class="modal-buttons">
                    <button class="ok">OK</button>
                    <button class="cancel">Cancel</button>
                </div>
            </div>`;
            document.body.appendChild(root);
            const box = root.querySelector(".modal-box");
            const input = root.querySelector(".modal-input");
            const ok = root.querySelector(".ok");
            const cancel = root.querySelector(".cancel");
            setTimeout(() => box.classList.add("show"), 10);
            const close = (result) => {
                box.classList.remove("show");
                setTimeout(() => root.remove(), 200);
                resolve(result);
            };
            ok.onclick = () => {
                close(input ? input.value.trim() : "");
            };
            cancel.onclick = () => close(false);
            root.addEventListener("keydown", (e) => {
                if (e.key === "Enter") ok.click();
                if (e.key === "Escape") cancel.click();
            });
            if (input) input.focus();
        });
    }
}

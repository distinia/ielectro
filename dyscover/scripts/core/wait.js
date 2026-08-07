export class Wait {
    static show() {
        if (document.querySelector(".wait-container")) {
            return;
        }
        const container = document.createElement("div");
        container.className = "prompt-container wait-container";
        const spinner = document.createElement("div");
        spinner.className = "wait-spinner";
        container.appendChild(spinner);
        document.body.appendChild(container);
        return container;
    }
    static hide() {
        const container = document.querySelector(".wait-container");
        if (container) {
            container.remove();
        }
    }
}

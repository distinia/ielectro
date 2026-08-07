import { Load } from "./load.js";
export class UI {
    constructor() {
        this.searchInput = document.querySelector("#searchInput");
        this.tabTriggers = document.querySelectorAll(".tab-trigger");
        this.tabContents = document.querySelectorAll(".tab-content");
        this.tabTriggers.forEach((trigger) => {
            trigger.addEventListener("click", () => this.switchTab(trigger));
        });
        if (this.searchInput) {
            this.searchInput.addEventListener("input", () => this.handleSearch());
        }
    }
    switchTab(trigger) {
        this.tabTriggers.forEach((t) => t.classList.remove("active"));
        trigger.classList.add("active");
        const tabName = trigger.getAttribute("data-tab");
        this.tabContents.forEach((content) => {
            content.classList.remove("active");
            if (content.id === tabName) content.classList.add("active");
        });
    }
    handleSearch() {
        const value = this.searchInput.value;
        clearTimeout(this._debounce);
        this._debounce = setTimeout(async () => {
            window.history.pushState(null, "", `?term=${encodeURIComponent(value)}`);
            await new Load().init();
        }, 300);
    }
}

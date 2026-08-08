import { CreatorRegistry } from "./registry.js";

export class Search {
    static instance = null;

    constructor() {
        Search.instance = this;
        this.input = document.querySelector(".search-item");
        if (!this.input) return;
        this.timer = null;
        this.input.addEventListener("input", () => {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.apply(this.input.value), 300);
        });
        this.input.addEventListener("search", () => this.apply(this.input.value));
    }

    activeClass() {
        return CreatorRegistry.activeClass();
    }

    resetAll() {
        CreatorRegistry.classes.forEach((Class) => {
            Class.list.forEach((post) => {
                if (post.element) {
                    post.element.style.display = "";
                }
            });
        });
    }

    apply(value = this.input?.value || "") {
        const term = String(value || "").trim().toLowerCase();
        this.resetAll();
        if (!term) return;

        const active = this.activeClass();
        CreatorRegistry.classes.forEach((Class) => {
            const scope = Class === active;
            Class.list.forEach((post) => {
                if (!post.element) return;
                if (!scope) {
                    post.element.style.display = "none";
                    return;
                }
                const title = String(post.title || post.item?.title || "").toLowerCase();
                const description = String(post.item?.description || "").toLowerCase();
                const tags = (Array.isArray(post.item?.tags) ? post.item.tags : [])
                    .join(" ")
                    .toLowerCase();
                const haystack = `${title} ${description} ${tags}`;
                post.element.style.display = haystack.includes(term) ? "" : "none";
            });
        });
    }
}

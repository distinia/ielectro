export class Search {
    constructor() {
        this.input = document.querySelector(".search-item");
        if (!this.input) return;
        this.timer = null;
        this.input.oninput = () => {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.search(this.input.value);
            }, 300);
        };
    }
    search(value) {
        const term = value.toLowerCase();
        classes.forEach(Class => {
            Class.list.forEach(post => {
                const title = String(post.title || "").toLowerCase();
                const tags = String(post.item.tags || "").toLowerCase();
                post.element.style.display =
                    !term || title.includes(term) || tags.includes(term)
                        ? ""
                        : "none";
            });
        });
    }
}

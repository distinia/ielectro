export class Carousel {
    constructor(root) {
        this.root = root;
        this.img = root.querySelector("img");
        this.prev = root.querySelector(".carousel-btn.prev");
        this.next = root.querySelector(".carousel-btn.next");
        this.items = [];
        try {
            this.items = JSON.parse(root.getAttribute("data-images") || "[]");
        } catch {
            this.items = [];
        }
        this.index = 0;
        if (!this.img || this.items.length === 0) return;
        this.render();
        this.prev?.addEventListener("click", () => this.move(-1));
        this.next?.addEventListener("click", () => this.move(1));
    }
    move(step) {
        this.index = (this.index + step + this.items.length) % this.items.length;
        this.render();
    }
    render() {
        this.img.src = this.items[this.index];
    }
}

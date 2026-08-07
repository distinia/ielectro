export default class NewsCarousel {
    constructor(root) {
        this.root = root;
        this.slides = Array.from(root.querySelectorAll(".carousel-slide"));
        this.prev = root.querySelector(".carousel-arrow.prev");
        this.next = root.querySelector(".carousel-arrow.next");
        this.index = this.slides.findIndex((s) => s.classList.contains("active"));
        if (this.index < 0) this.index = 0;
        if (this.slides.length === 0) return;
        this.render();
        this.prev?.addEventListener("click", () => this.move(-1));
        this.next?.addEventListener("click", () => this.move(1));
    }
    move(step) {
        this.index = (this.index + step + this.slides.length) % this.slides.length;
        this.render();
    }
    render() {
        this.slides.forEach((slide, idx) => {
            const active = idx === this.index;
            slide.classList.toggle("active", active);
            slide.style.display = active ? "flex" : "none";
        });
    }
}

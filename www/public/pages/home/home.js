import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
window.addEventListener("DOMContentLoaded", async () => {
    App.initialize();
    const carousel = document.querySelector(".ie-carousel");
    try {
        const data = await Nesh.Request.get(
            "https://www.ielectro.com/api/news/latest?limit=5",
        );
        const items = data?.data?.items || [];
        if (carousel && items.length) {
            carousel.innerHTML = ` <button class="carousel-arrow prev" type="button">‹</button> ${items
                .slice(0, 5)
                .map(
                    (item, index) =>
                        ` <article class="carousel-slide${index === 0 ? " active" : ""}"> ${item.image ? `<div class="news-media-col"><img class="news-slide-image" src="${item.image}" alt="${item.title || "News image"}"></div>` : ""} <div class="news-text-col"> <div class="news-slide-date">${item.published_at || item.created_at || ""}</div> <h3 class="news-slide-title">${item.title || ""}</h3> <p class="news-slide-text">${item.body || ""}</p> <div class="cta-left"><a class="button button-primary" href="/news/${item.news_code || ""}">Read article</a></div> </div> </article>`,
                )
                .join(
                    "",
                )} <button class="carousel-arrow next" type="button">›</button> `;
        } else if (carousel) {
            carousel.innerHTML =
                '<div class="card" style="margin:18px;">No news available yet.</div>';
        }
    } catch {
        if (carousel) {
            carousel.innerHTML =
                '<div class="card">Unable to load latest news.</div>';
        }
    }
    document
        .querySelectorAll(".ie-carousel")
        .forEach((el) => new NewsCarousel(el));
});
class NewsCarousel {
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

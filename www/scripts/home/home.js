import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";
import { NewsCarousel } from "./news-carousel.js";

export class Home {
    constructor() {
        this.carousel = document.querySelector(".ie-carousel");
    }
    async load() {
        if (!this.carousel) return;
        try {
            const response = await Nesh.Request.get(`${Api.base}/news`);
            const items = Api.published(Api.list(response)).slice(0, 5);
            if (!items.length) {
                this.carousel.innerHTML =
                    '<div class="card" style="margin:18px;">No news available yet.</div>';
                return;
            }
            this.carousel.innerHTML = `<button class="carousel-arrow prev" type="button">‹</button>${items
                .map((item, index) => this.slideHtml(item, index === 0))
                .join("")}<button class="carousel-arrow next" type="button">›</button>`;
            new NewsCarousel(this.carousel);
        } catch {
            this.carousel.innerHTML =
                '<div class="card">Unable to load latest news.</div>';
        }
    }
    slideHtml(item, active) {
        const when = Nesh.Html.escape(item.published_at || item.created_at || "");
        const title = Nesh.Html.escape(item.title || "");
        const body = Nesh.Html.escape(item.body || "");
        const image = item.image
            ? `<div class="news-media-col"><img class="news-slide-image" src="${Nesh.Html.escape(item.image)}" alt="${title || "News image"}" loading="lazy"></div>`
            : "";
        return `<article class="carousel-slide${active ? " active" : ""}">${image}<div class="news-text-col"><div class="news-slide-date">${when}</div><h3 class="news-slide-title">${title}</h3><p class="news-slide-text">${body}</p><div class="cta-left"><a class="button button-primary" href="/news/${item.id}">Read article</a></div></div></article>`;
    }
}

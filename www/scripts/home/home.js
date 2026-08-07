import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../core/app.js";
import NewsCarousel from "./news-carousel.js";

export function initializeHome() {

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

}

import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
import Carousel from "../../components/carousel/carousel.js";
window.addEventListener("DOMContentLoaded", async () => {
    App.initialize();
    const container = document.querySelector(".apps-grid");
    if (!container) return;
    try {
        const payload = await Nesh.Request.get("https://www.ielectro.com/api/apps/list");
        const apps = payload?.data?.apps || [];
        if (!apps.length) {
            container.innerHTML = '<div class="card">No apps to show.</div>';
            return;
        }
        for (const app of apps) {
            const cardInstance = new AppCard(app);
            const card = await cardInstance.render();
            container.appendChild(card);
            const carousel = card.querySelector(".media-carousel");
            if (carousel) new Carousel(carousel);
        }
        Nesh.Icons.load(container);
    } catch (e) {
        console.error("Apps load error:", e);
        container.innerHTML = '<div class="card">Unable to load apps.</div>';
    }
});
class AppCard {
    constructor(app) {
        this.app = app;
    }
    async render() {
        const el = document.createElement("div");
        el.className = "card app-card";
        const images = Array.isArray(this.app.images) ? this.app.images : [];
        el.innerHTML = `
            <div class="card-title">
                <i data-icon="${Nesh.Html.escape(this.app.icon || "")}" class="icon-image"></i>
                ${Nesh.Html.escape(this.app.name || "")}
            </div>
            <p class="card-description">${Nesh.Html.escape(this.app.description || "")}</p>
            ${images.length ? `
                <div class="media-carousel" data-images='${Nesh.Html.escape(JSON.stringify(images))}'>
                    <img src="${Nesh.Html.escape(images[0])}" alt="${Nesh.Html.escape(this.app.name || "")}">
                    <button type="button" class="carousel-btn prev">‹</button>
                    <button type="button" class="carousel-btn next">›</button>
                </div>
            ` : ""}
            ${this.app.url ? `<a class="button button-primary" href="${Nesh.Html.escape(this.app.url)}" target="_blank" rel="noopener">Open app</a>` : ""}
        `;
        return el;
    }
}

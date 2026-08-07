import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export default class AppCard {
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

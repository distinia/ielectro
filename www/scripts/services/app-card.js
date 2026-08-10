import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";

export class AppCard {
    static logo = "https://www.ielectro.com/assets/brand/logo.png";
    constructor(app, index = 0) {
        this.app = app;
        this.index = index;
    }
    render() {
        const element = document.createElement("article");
        element.className = `service-panel${this.index % 2 === 1 ? " service-panel--reverse" : ""}`;
        const images = Array.isArray(this.app.images) ? this.app.images : [];
        const logo = this.app.logo || AppCard.logo;
        element.innerHTML = `
            <div class="service-panel__content">
                <div class="service-panel__brand">
                    <img class="service-panel__logo" src="${Nesh.Html.escape(logo)}" alt="${Nesh.Html.escape(this.app.name || "iElectro service")}" loading="lazy">
                    <span class="service-panel__tag">iElectro Platform</span>
                </div>
                <h2 class="service-panel__title">${Nesh.Html.escape(this.app.name || "")}</h2>
                <p class="service-panel__description">${Nesh.Html.escape(this.app.description || "")}</p>
                ${this.app.url ? `<a class="button button-primary service-panel__cta" href="${Nesh.Html.escape(this.app.url)}" target="_blank" rel="noopener">Open app</a>` : ""}
            </div>
            <div class="service-panel__media">
                ${images.length ? `
                    <div class="service-panel__frame">
                        <div class="media-carousel" data-images='${Nesh.Html.escape(JSON.stringify(images))}'>
                            <img src="${Nesh.Html.escape(images[0])}" alt="${Nesh.Html.escape(this.app.name || "")}" loading="lazy">
                            <button type="button" class="carousel-btn prev" aria-label="Previous screenshot">‹</button>
                            <button type="button" class="carousel-btn next" aria-label="Next screenshot">›</button>
                        </div>
                    </div>
                ` : `<div class="service-panel__frame service-panel__frame--empty"><img class="service-panel__logo service-panel__logo--large" src="${Nesh.Html.escape(logo)}" alt="" loading="lazy"></div>`}
            </div>
        `;
        return element;
    }
}

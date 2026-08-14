import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";
import { Carousel } from "../core/carousel.js";
import { AppCard } from "./app-card.js";
export class Services {
    constructor() {
        this.container = document.querySelector(".services-showcase");
    }
    async load() {
        if (!this.container) return;
        try {
            const response = await Nesh.Request.get(`${Api.base}/apps`);
            const apps = Api.list(response);
            if (!apps.length) {
                this.container.innerHTML =
                    '<div class="services-empty">No apps to show.</div>';
                return;
            }
            apps.forEach((app, index) => {
                const panel = new AppCard(app, index).render();
                this.container.appendChild(panel);
                const carousel = panel.querySelector(".media-carousel");
                if (carousel) {
                    new Carousel(carousel);
                }
            });
        } catch (error) {
            console.error("Apps load error:", error);
            this.container.innerHTML =
                '<div class="services-empty">Unable to load apps.</div>';
        }
    }
}

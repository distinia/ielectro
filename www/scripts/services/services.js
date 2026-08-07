import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { App, Carousel } from "../core/index.js";
import AppCard from "./app-card.js";

export async function initializeServices() {
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
}

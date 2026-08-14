import { App } from "../core/app.js";
import NewsPanel from "./news-panel.js";
document.addEventListener("DOMContentLoaded", async () => {
    const ready = await new App().init();
    if (!ready) return;
    await new NewsPanel().run();
});

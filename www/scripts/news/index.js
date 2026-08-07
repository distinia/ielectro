import { App } from "../core/app.js";
import { News } from "./news.js";

document.addEventListener("DOMContentLoaded", async () => {
    new App();
    const news = new News();
    await news.load();
});

import { App } from "../core/app.js";
import { Article } from "./article.js";

document.addEventListener("DOMContentLoaded", async () => {
    await App.boot();
    if (App.blocked) return;
    new Article();
});

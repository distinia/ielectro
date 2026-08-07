import { App } from "../core/app.js";
import { Feed } from "./feed.js";

document.addEventListener("DOMContentLoaded", () => {
    App.runPage(async () => {
        const feed = new Feed();
        await feed.init();
    });
});

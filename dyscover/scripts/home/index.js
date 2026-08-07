import { App } from "../core/app.js";
import { Feed } from "./feed.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await App.boot())) return;
    new Feed();
});

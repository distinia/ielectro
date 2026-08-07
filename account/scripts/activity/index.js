import { App } from "../core/app.js";
import { ActivityFeed } from "./activity.js";

document.addEventListener("DOMContentLoaded", () => {
    new App();
    new ActivityFeed();
});

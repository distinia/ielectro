import { App } from "../core/app.js";
import { ActivityUI } from "./activity-ui.js";
document.addEventListener("DOMContentLoaded", () => {
    App.runPage(async () => {
        const ui = new ActivityUI();
        await ui.ready;
    });
});

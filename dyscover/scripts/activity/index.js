import { App } from "../core/app.js";
import { ActivityUI } from "./activity-ui.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await App.boot())) return;
    new ActivityUI();
});

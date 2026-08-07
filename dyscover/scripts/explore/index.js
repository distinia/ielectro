import { App } from "../core/app.js";
import { UI } from "./ui.js";
import { Load } from "./load.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await App.boot())) return;
    new UI();
    new Load();
});

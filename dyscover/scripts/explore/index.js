import { App } from "../core/app.js";
import { UI } from "./ui.js";
import { Load } from "./load.js";

document.addEventListener("DOMContentLoaded", () => {
    App.runPage(async () => {
        new UI();
        await new Load().init();
    });
});

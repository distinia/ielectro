import { App } from "../core/app.js";
import { Careers } from "./careers.js";
document.addEventListener("DOMContentLoaded", async () => {
    new App();
    const careers = new Careers();
    await careers.load();
});

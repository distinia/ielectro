import { App } from "../core/app.js";
import { Services } from "./services.js";
document.addEventListener("DOMContentLoaded", async () => {
    new App();
    const services = new Services();
    await services.load();
});

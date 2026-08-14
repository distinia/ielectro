import { App } from "../core/app.js";
import { Home } from "./home.js";
document.addEventListener("DOMContentLoaded", async () => {
    new App();
    const home = new Home();
    await home.load();
});

import { App } from "../core/app.js";
import { ServicesDashboard } from "./services.js";

document.addEventListener("DOMContentLoaded", () => {
    new App();
    new ServicesDashboard();
});

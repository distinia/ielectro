import { App } from "../core/app.js";
import CareersPanel from "./careers-panel.js";
document.addEventListener("DOMContentLoaded", async () => {
    const ready = await new App().init();
    if (!ready) return;
    await new CareersPanel().run();
});

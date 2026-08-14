import { App } from "../core/app.js";
import DyscoverPanel from "./dyscover-panel.js";
document.addEventListener("DOMContentLoaded", async () => {
    const ready = await new App().init();
    if (!ready) return;
    await new DyscoverPanel().run();
});

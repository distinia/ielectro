import { App, AdminShell } from "../core/index.js";
import HomePanel from "./home-panel.js";
document.addEventListener("DOMContentLoaded", async () => {
    const ready = await new App().init();
    if (!ready) return;
    AdminShell.mount("home", "Analytics");
    await new HomePanel().run();
});

import { App } from "../core/app.js";
import TeamPanel from "./team-panel.js";

document.addEventListener("DOMContentLoaded", async () => {
    const ready = await new App().init();
    if (!ready) return;
    await new TeamPanel().run();
});

import { App } from "../core/app.js";
import AccountsPanel from "./accounts-panel.js";

document.addEventListener("DOMContentLoaded", async () => {
    const ready = await new App().init();
    if (!ready) return;
    await new AccountsPanel().run();
});

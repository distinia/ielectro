import { App } from "../core/app.js";
import { ChatUI } from "./chat-ui.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await App.boot())) return;
    const ui = new ChatUI();
    await ui.init();
});

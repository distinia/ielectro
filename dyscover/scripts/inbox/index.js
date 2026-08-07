import { App } from "../core/app.js";
import { ChatUI } from "./chat-ui.js";

document.addEventListener("DOMContentLoaded", () => {
    App.runPage(async () => {
        const ui = new ChatUI();
        await ui.init();
    });
});

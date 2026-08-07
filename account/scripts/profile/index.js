import { App } from "../core/app.js";
import { ProfileService } from "./service.js";
import { ProfileValidator } from "./validator.js";
import { ProfileView } from "./view.js";
import { ProfileEditor } from "./editor.js";

document.addEventListener("DOMContentLoaded", async () => {
    new App();
    const root = document.querySelector("#profile-stack");
    const service = new ProfileService();
    const validator = new ProfileValidator();
    const view = new ProfileView(root);
    const editor = new ProfileEditor(service, validator, view);
    await validator.load();
    const user = await service.load();
    if (!user) return;
    view.render(user);
    editor.bind();
});

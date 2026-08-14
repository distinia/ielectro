import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { App } from "../core/app.js";
import { ProfileService } from "./service.js";
import { ProfileValidator } from "./validator.js";
import { ProfileView } from "./view.js";
import { ProfileEditor } from "./editor.js";
import { AvatarEditor } from "./avatar-editor.js";

document.addEventListener("DOMContentLoaded", async () => {
    new App();
    const stackRoot = document.querySelector("#profile-stack");
    const avatarRoot = document.querySelector("#profile-avatar");
    const service = new ProfileService();
    const validator = new ProfileValidator();
    const view = new ProfileView(stackRoot);
    const editor = new ProfileEditor(service, validator, view);
    await validator.load();
    const user = await service.load();
    if (!user) return;

    const avatarEditor = new AvatarEditor(user, async (updated) => {
        service.user = updated;
    });
    if (avatarRoot) {
        avatarRoot.innerHTML = avatarEditor.renderHtml();
        avatarEditor.bind(avatarRoot);
        Nesh.Icons.load(avatarRoot);
    }
    view.mountLayout();
    view.render(user);
    editor.bind();
});

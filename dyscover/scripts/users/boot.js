import { App } from "../core/app.js";
import { ProfilePage } from "./profile-page.js";
import { UI } from "./ui.js";
import { Informations } from "./informations.js";
import { Posts } from "./posts.js";

export class UserPageBoot {
    static async start() {
        const page = new ProfilePage(App.profileUsername());
        const ready = await page.init();
        if (!ready) return;
        new UI(page);
        new Informations(page);
        new Posts(page);
    }
}

export { ProfilePage } from "./profile-page.js";
export { Actions } from "./actions.js";
export { UI } from "./ui.js";
export { List } from "./list.js";
export { BiographyEditor } from "./biography-editor.js";
export { Informations } from "./informations.js";
export { Posts } from "./posts.js";

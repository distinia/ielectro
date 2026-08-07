import { App } from "../core/app.js";
import { UserPageBoot } from "../user/boot.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await App.boot())) return;
    await UserPageBoot.start();
});

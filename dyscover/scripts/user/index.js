import { App } from "../core/app.js";
import { UserPageBoot } from "./boot.js";

document.addEventListener("DOMContentLoaded", () => {
    App.runPage(() => UserPageBoot.start());
});

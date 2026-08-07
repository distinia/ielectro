import { App } from "../core/app.js";
import { Team } from "./team.js";

document.addEventListener("DOMContentLoaded", async () => {
    new App();
    const team = new Team();
    await team.load();
});

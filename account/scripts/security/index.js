import { App } from "../core/app.js";
import { Sessions } from "./sessions.js";
import { DeleteUser } from "./delete-user.js";

document.addEventListener("DOMContentLoaded", async () => {
    new App();
    const output = document.querySelector("#security-output");
    const banner = document.querySelector("#security-deletion-banner");
    const sessions = new Sessions(output);
    const deleteUser = new DeleteUser(
        banner,
        document.querySelector("#security-delete-account-btn"),
    );
    document
        .querySelector("#logout-all-btn")
        ?.addEventListener("click", () => sessions.revokeAllOthers());
    deleteUser.bind();
    await deleteUser.loadBanner();
    await sessions.load();
});

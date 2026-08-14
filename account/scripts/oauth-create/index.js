import { GuestApp } from "../core/app.js";
import { OAuthCreate } from "./oauth-create.js";
document.addEventListener("DOMContentLoaded", async () => {
    new GuestApp();
    const form = document.querySelector("#create-by-google-form");
    if (!form) return;
    const page = new OAuthCreate(form);
    await page.init();
});

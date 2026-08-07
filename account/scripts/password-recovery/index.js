import { GuestApp } from "../core/app.js";
import { PasswordRecovery } from "./password-recovery.js";

document.addEventListener("DOMContentLoaded", () => {
    new GuestApp();
    new PasswordRecovery();
});

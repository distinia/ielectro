import { GuestApp } from "../core/app.js";
import { Login, GoogleLogin, GoogleSignIn } from "./login.js";
document.addEventListener("DOMContentLoaded", () => {
    new GuestApp();
    new Login();
    GoogleSignIn.init((credential) => {
        new GoogleLogin(credential);
    });
});

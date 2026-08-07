import { GuestApp } from "../core/app.js";
import { Login, GoogleLogin } from "./login.js";

document.addEventListener("DOMContentLoaded", () => {
    new GuestApp();
    window.getGoogleData = (response) => {
        new GoogleLogin(response.credential);
    };
    new Login();
});

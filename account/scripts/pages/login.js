import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
import Alert from "../../components/alert/alert.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
   new Login();
});
window.getGoogleData = function (response) {
    new GoogleLogin(response.credential);
};
class Login {
    constructor() {
        this.form = document.querySelector("form");
        this.bind();
    }
    bind() {
        if (!this.form) return;
        this.form.addEventListener("submit", async (event) => {
            event.preventDefault();
            await this.login();
        });
    }
    async login() {
        const formData = new FormData(this.form);
        try {
            const data = await Nesh.Request.post(
                "https://account.ielectro.com/api/auth/login",
                formData,
            );
            if (data?.text) {
                Alert.success(data.text);
            }
            this.redirect();
        } catch (error) {
            Alert.error(error?.text || "Login failed");
        }
    }
    redirect() {
        setTimeout(() => {
            const cookie = document.cookie.split("; ").find((row) => row.startsWith("previous_url="));
            const redirectUrl = cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
            if (redirectUrl) {
                document.cookie = "previous_url=; path=/; domain=.ielectro.com; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                window.location.href = redirectUrl;
                return;
            }
            const service = new URLSearchParams(window.location.search).get("service");
            let fallbackUrl = "https://account.ielectro.com/";
            switch (service) {
                case "dyscover":
                    fallbackUrl = "https://dyscover.ielectro.com/";
                    break;
                case "account":
                    fallbackUrl = "https://account.ielectro.com/";
                    break;
            }
            window.location.href = fallbackUrl;
        }, 1000);
    }
}
class GoogleLogin {
    constructor(credential) {
        this.credential = credential;
        this.login();
    }
    async login() {
        const formData = new FormData();
        formData.append("credential", this.credential);
        try {
            const data = await Nesh.Request.post(
                "https://account.ielectro.com/api/oauth/google",
                formData,
            );
            if (data?.text) {
                Alert.success(data.text);
            }
            this.redirect(data?.data?.redirect_url);
        } catch (error) {
            Alert.error(error?.text || "Google login failed");
        }
    }
    redirect(serverRedirectUrl) {
        setTimeout(() => {
            if (serverRedirectUrl) {
                window.location.href = serverRedirectUrl;
                return;
            }
            if (window.history.length > 1) {
                window.history.back();
                return;
            }
            window.location.href = "https://account.ielectro.com/";
        }, 1000);
    }
}

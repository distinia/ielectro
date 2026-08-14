import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";
const GOOGLE_CLIENT_ID =
    "330597496243-srvq8tqchj7bpgo4d1kqf1tt5j1rj6mo.apps.googleusercontent.com";
export class GoogleSignIn {
    static init(onCredential) {
        const mount = () => {
            if (!window.google?.accounts?.id) {
                return false;
            }
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: (response) => onCredential(response.credential),
                ux_mode: "popup",
                context: "signin",
                auto_select: false,
            });
            const target = document.querySelector(".g_id_signin");
            if (target) {
                target.replaceChildren();
                window.google.accounts.id.renderButton(target, {
                    type: "standard",
                    shape: "rectangular",
                    theme: "outline",
                    text: "signin_with",
                    size: "large",
                    locale: "en-US",
                    logo_alignment: "left",
                });
            }
            return true;
        };
        if (mount()) {
            return;
        }
        const timer = window.setInterval(() => {
            if (mount()) {
                window.clearInterval(timer);
            }
        }, 50);
        window.setTimeout(() => window.clearInterval(timer), 10000);
    }
}
export class Login {
    constructor() {
        this.form = document.querySelector("form");
        this.bind();
    }
    bind() {
        if (!this.form) return;
        this.form.addEventListener("submit", async (event) => {
            event.preventDefault();
            await this.signIn();
        });
    }
    async signIn() {
        const formData = new FormData(this.form);
        try {
            const response = await Nesh.Request.post(
                "https://account.ielectro.com/api/sessions",
                formData,
            );
            Alert.success(Api.message(response) || "Signed in successfully");
            this.redirect();
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
    redirect() {
        setTimeout(() => {
            const cookie = document.cookie
                .split("; ")
                .find((row) => row.startsWith("previous_url="));
            const redirectUrl = cookie
                ? decodeURIComponent(cookie.split("=").slice(1).join("="))
                : null;
            if (redirectUrl) {
                document.cookie =
                    "previous_url=; path=/; domain=.ielectro.com; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                window.location.href = redirectUrl;
                return;
            }
            const service = new URLSearchParams(window.location.search).get("service");
            let fallbackUrl = "https://account.ielectro.com/";
            if (service === "dyscover") {
                fallbackUrl = "https://dyscover.ielectro.com/";
            }
            window.location.href = fallbackUrl;
        }, 1000);
    }
}
export class GoogleLogin {
    constructor(credential) {
        this.credential = credential;
        this.signIn();
    }
    async signIn() {
        const formData = new FormData();
        formData.append("credential", this.credential);
        try {
            const response = await Nesh.Request.post(
                "https://account.ielectro.com/api/oauth/google",
                formData,
            );
            Alert.success(Api.message(response) || "Signed in successfully");
            const record = Api.record(response);
            if (record?.signup_required) {
                window.location.href = "https://account.ielectro.com/oauth-create";
                return;
            }
            if (await this.authenticated()) {
                this.redirect();
            }
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
    async authenticated() {
        try {
            await Nesh.Request.get("https://account.ielectro.com/api/user");
            return true;
        } catch {
            return false;
        }
    }
    redirect() {
        setTimeout(() => {
            if (window.history.length > 1) {
                window.history.back();
                return;
            }
            window.location.href = "https://account.ielectro.com/";
        }, 1000);
    }
}

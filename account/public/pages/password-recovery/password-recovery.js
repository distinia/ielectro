import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
import Alert from "../../components/alert/alert.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
   new PasswordRecovery();
});
class PasswordRecovery {
    constructor() {
        this.form = document.querySelector("form");
        this.bind();
    }
    bind() {
        if (!this.form) return;
        this.form.addEventListener("submit", async (event) => {
            event.preventDefault();
            await this.recover();
        });
    }
    async recover() {
        const formData = new FormData(this.form);
        try {
            const data = await Nesh.Request.post(
                "https://account.ielectro.com/api/password-recovery/request",
                formData,
            );
            if (data?.text) {
                Alert.success(data.text);
            }
            this.redirect();
        } catch (error) {
            Alert.error(error?.text || "Password recovery failed");
        }
    }
    redirect() {
        setTimeout(() => {
            window.location.href = "https://account.ielectro.com/";
        }, 2000);
    }
}

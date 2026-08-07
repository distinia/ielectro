import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";

export class PasswordRecovery {
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
            const response = await Nesh.Request.post(
                "https://account.ielectro.com/api/recovery",
                formData,
            );
            Alert.success(Api.message(response) || "Recovery email sent");
            setTimeout(() => {
                window.location.href = "https://account.ielectro.com/";
            }, 2000);
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
}

import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "./alert.js";
import { Api } from "./api.js";

export class Session {
    static bindLogout() {
        document.querySelector(".sidebar a.logout")?.addEventListener("click", async (event) => {
            event.preventDefault();
            await this.logout();
        });
    }
    static async logout() {
        try {
            await Nesh.Request.delete("https://account.ielectro.com/api/sessions");
            Nesh.Auth.clear();
            window.location.href = "https://account.ielectro.com/login?service=account";
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
}

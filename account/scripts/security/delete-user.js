import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";
export class DeleteUser {
    constructor(button) {
        this.button = button;
    }
    bind() {
        this.button?.addEventListener("click", async () => {
            const confirmed = await Alert.confirm(
                "Permanently delete your account? This cannot be undone. All account data and linked services will be removed immediately.",
            );
            if (!confirmed) return;
            try {
                const response = await Nesh.Request.delete(
                    "https://account.ielectro.com/api/user",
                );
                Alert.success(
                    Api.message(response) || "Account permanently deleted",
                );
                setTimeout(() => {
                    window.location.href =
                        "https://account.ielectro.com/login?service=account";
                }, 1500);
            } catch (error) {
                Alert.error(Api.errorMessage(error));
            }
        });
    }
}

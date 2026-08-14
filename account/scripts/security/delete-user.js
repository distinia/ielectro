import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";
export class DeleteUser {
    constructor(banner, button) {
        this.banner = banner;
        this.button = button;
    }
    bind() {
        this.button?.addEventListener("click", async () => {
            const confirmed = await Alert.confirm(
                "Schedule your account for deletion? You have 30 days to sign in again and cancel. After that, all data will be permanently removed.",
            );
            if (!confirmed) return;
            try {
                const response = await Nesh.Request.delete(
                    "https://account.ielectro.com/api/user",
                );
                Alert.success(Api.message(response) || "Account scheduled for deletion");
                setTimeout(() => {
                    window.location.href =
                        "https://account.ielectro.com/login?service=account";
                }, 1500);
            } catch (error) {
                Alert.error(Api.errorMessage(error));
            }
        });
    }
    async loadBanner() {
        if (!this.banner) return;
        try {
            const response = await Nesh.Request.get(
                "https://account.ielectro.com/api/user",
            );
            const user = Api.record(response);
            const until = user?.deletion_scheduled_at;
            if (!until) {
                this.banner.hidden = true;
                this.banner.innerHTML = "";
                return;
            }
            const d = new Date(until);
            const nice = Number.isNaN(d.getTime())
                ? String(until)
                : d.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                  });
            this.banner.hidden = false;
            this.banner.innerHTML = `<div class="security-deletion-inner"><p class="security-deletion-text"><strong>Account scheduled for deletion.</strong> Permanent removal after <time datetime="${Nesh.Html.escape(String(until))}">${Nesh.Html.escape(nice)}</time>. You can cancel below.</p><button type="button" class="security-deletion-cancel-btn">Cancel account deletion</button></div>`;
            this.banner
                .querySelector(".security-deletion-cancel-btn")
                ?.addEventListener("click", async () => {
                    try {
                        const response = await Nesh.Request.patch(
                            "https://account.ielectro.com/api/user/cancel-deletion",
                        );
                        Alert.success(
                            Api.message(response) || "Account deletion has been cancelled.",
                        );
                        await this.loadBanner();
                    } catch (error) {
                        Alert.error(Api.errorMessage(error));
                    }
                });
        } catch {
            this.banner.hidden = true;
            this.banner.innerHTML = "";
        }
    }
}

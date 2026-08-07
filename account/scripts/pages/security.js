import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
import Alert from "../../components/alert/alert.js";
const DELETE_URL = "https://account.ielectro.com/api/auth/delete";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    new App();
    new SecurityPage();
});
class SecurityPage {
    constructor() {
        this.output = document.querySelector("#security-output");
        this.banner = document.querySelector("#security-deletion-banner");
        this.bindActions();
        this.loadDeletionBanner();
        this.load();
    }
    bindActions() {
        document
            .querySelector("#logout-all-btn")
            ?.addEventListener("click", async () => {
                try {
                    const res = await Nesh.Request.delete(
                        "https://account.ielectro.com/api/devices",
                        {},
                    );
                    Alert.success(res?.text || "Done");
                    this.load();
                } catch (error) {
                    Alert.error(error?.text || "Action failed");
                }
            });
        document
            .querySelector("#security-delete-account-btn")
            ?.addEventListener("click", async () => {
                const confirmed = await Alert.confirm(
                    "Schedule your account for deletion? You have 30 days to sign in again and cancel. After that, all data will be permanently removed.",
                );
                if (!confirmed) return;
                try {
                    const response = await Nesh.Request.post(DELETE_URL);
                    if (response?.text) Alert.success(response.text);
                    setTimeout(() => {
                        window.location.href =
                            "https://account.ielectro.com/login?service=account";
                    }, 1500);
                } catch (error) {
                    Alert.error(error?.text || "Request failed");
                }
            });
    }
    async loadDeletionBanner() {
        if (!this.banner) return;
        try {
            const response = await Nesh.Request.get(
                "https://account.ielectro.com/api/data",
            );
            const until = response?.data?.deletion_scheduled_at;
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
            this.banner.innerHTML = ` <div class="security-deletion-inner"> <p class="security-deletion-text"><strong>Account scheduled for deletion.</strong> Permanent removal after <time datetime="${Nesh.Html.escape(String(until))}">${Nesh.Html.escape(nice)}</time>. You can cancel below.</p> <button type="button" class="security-deletion-cancel-btn">Cancel account deletion</button> </div> `;
            this.banner
                .querySelector(".security-deletion-cancel-btn")
                ?.addEventListener("click", async () => {
                    try {
                        await Nesh.Request.delete(
                            "https://account.ielectro.com/api/delete/cancel",
                            {},
                        );
                        Alert.success("Account deletion has been cancelled.");
                        this.loadDeletionBanner();
                    } catch (error) {
                        Alert.error(error?.text || "Could not cancel");
                    }
                });
        } catch {
            this.banner.hidden = true;
            this.banner.innerHTML = "";
        }
    }
    async load() {
        if (!this.output) return;
        try {
            const data = await Nesh.Request.get(
                "https://account.ielectro.com/api/devices",
            );
            const rows = data?.data || [];
            if (!rows.length) return this.renderEmpty("No active devices found");
            this.output.innerHTML = rows
                .map(
                    (row) =>
                        ` <div class="security-item"> <h4>Session #${row.id}</h4> <p class="security-meta">Device: ${Nesh.Html.escape(row.device_info || "-")}</p><p class="security-meta">Location: ${Nesh.Html.escape(row.city || "-")}, ${Nesh.Html.escape(row.country || "-")}</p> <p class="security-meta">Last activity: ${Nesh.Html.escape(row.last_activity || "-")}</p> <button data-id="${row.id}" class="revoke-btn">Revoke this session</button> </div> `,
                )
                .join("");
            this.output.querySelectorAll(".revoke-btn").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    const sessionId = btn.getAttribute("data-id");
                    try {
                        const result = await Nesh.Request.delete(
                            "https://account.ielectro.com/api/devices",
                            { session_id: sessionId },
                        );
                        if (result?.data?.logged_out) {
                            window.location.href =
                                "https://account.ielectro.com/login?service=account";
                            return;
                        }
                        Alert.success(result?.text || "Session revoked");
                        this.load();
                    } catch (error) {
                        Alert.error(error?.text || "Failed to revoke");
                    }
                });
            });
        } catch (error) {
            Alert.error(error?.text || "Unable to load data");
        }
    }
    renderEmpty(text) {
        this.output.innerHTML = `<div class="security-item"><p class="security-meta">${Nesh.Html.escape(text)}</p></div>`;
    }
}

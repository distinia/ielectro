import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";

export class Sessions {
    constructor(output) {
        this.output = output;
    }
    async load() {
        if (!this.output) return;
        try {
            const response = await Nesh.Request.get(
                "https://account.ielectro.com/api/sessions",
            );
            const rows = Api.list(response);
            if (!rows.length) {
                this.renderEmpty("No active devices found");
                return;
            }
            this.output.innerHTML = rows
                .map(
                    (row) =>
                        `<div class="security-item"><h4>Session #${row.id}</h4><p class="security-meta">Device: ${Nesh.Html.escape(row.device_info || "-")}</p><p class="security-meta">Location: ${Nesh.Html.escape(row.city || "-")}, ${Nesh.Html.escape(row.country || "-")}</p><p class="security-meta">Last activity: ${Nesh.Html.escape(row.last_activity || "-")}</p><button type="button" data-id="${row.id}" class="revoke-btn">Revoke this session</button></div>`,
                )
                .join("");
            this.output.querySelectorAll(".revoke-btn").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    await this.revoke(btn.getAttribute("data-id"));
                });
            });
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
    async revoke(sessionId) {
        try {
            const result = await Nesh.Request.delete(
                "https://account.ielectro.com/api/sessions",
                { session_id: sessionId },
            );
            Alert.success(Api.message(result) || "Session revoked");
            await this.load();
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
    async revokeAllOthers() {
        try {
            const result = await Nesh.Request.delete(
                "https://account.ielectro.com/api/sessions/all",
            );
            Alert.success(Api.message(result) || "Done");
            await this.load();
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
    renderEmpty(text) {
        this.output.innerHTML = `<div class="security-item"><p class="security-meta">${Nesh.Html.escape(text)}</p></div>`;
    }
}

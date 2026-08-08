import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";

export class Sessions {
    constructor(output) {
        this.output = output;
    }

    sessionTitle(row) {
        if (row.is_current) {
            return "This device";
        }

        const browser = String(row.browser || "Unknown browser").trim();
        const os = String(row.os || "Unknown OS").trim();
        return `${browser} · ${os}`;
    }

    deviceLabel(row) {
        const browser = String(row.browser || "").trim();
        const os = String(row.os || "").trim();

        if (browser && os) {
            return `${browser} on ${os}`;
        }

        return row.device_info || "-";
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
                        `<div class="security-item${row.is_current ? " is-current" : ""}"><h4>${Nesh.Html.escape(this.sessionTitle(row))}</h4><p class="security-meta">Device: ${Nesh.Html.escape(this.deviceLabel(row))}</p><p class="security-meta">Location: ${Nesh.Html.escape(row.city || "-")}, ${Nesh.Html.escape(row.country || "-")}</p><p class="security-meta">Last activity: ${Nesh.Html.escape(row.last_activity || "-")}</p><button type="button" data-id="${row.id}" data-current="${row.is_current ? "1" : "0"}" class="revoke-btn">${row.is_current ? "Sign out on this device" : "Revoke this session"}</button></div>`,
                )
                .join("");
            this.output.querySelectorAll(".revoke-btn").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    await this.revoke(
                        btn.getAttribute("data-id"),
                        btn.getAttribute("data-current") === "1",
                    );
                });
            });
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }

    async revoke(sessionId, isCurrent = false) {
        try {
            const result = await Nesh.Request.delete(
                "https://account.ielectro.com/api/sessions",
                { session_id: sessionId },
            );
            const currentSessionRevoked =
                isCurrent || result?.current_session_revoked === true;

            Alert.success(
                Api.message(result) ||
                    (currentSessionRevoked
                        ? "Signed out successfully"
                        : "Session revoked"),
            );

            if (currentSessionRevoked) {
                window.location.href = "https://account.ielectro.com/login";
                return;
            }

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

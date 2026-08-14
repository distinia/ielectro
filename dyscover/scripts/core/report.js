import { Api } from "./api.js";
import { Alert, Request } from "./index.js";

const REPORT_LABELS = {
    spam: "Spam or misleading content",
    harassment: "Harassment or bullying",
    hate_speech: "Hate speech or discrimination",
    violence: "Violence or threats",
    nudity: "Nudity or sexual content",
    misinformation: "False or harmful information",
    impersonation: "Impersonation",
    copyright: "Copyright infringement",
    other: "Other",
};

export class Report {
    static async openPost(postId) {
        await this.open({
            target_type: "post",
            post_id: postId,
            title: "Report post",
        });
    }

    static async openUser(userId) {
        await this.open({
            target_type: "user",
            user_id: userId,
            title: "Report user",
        });
    }

    static async open(payload) {
        const overlay = document.createElement("div");
        overlay.className = "report-overlay";
        overlay.innerHTML = `
            <div class="report-modal" role="dialog" aria-modal="true">
                <header class="report-modal-head">
                    <h2>${payload.title || "Report"}</h2>
                    <button type="button" class="report-close" aria-label="Close">×</button>
                </header>
                <form class="report-form">
                    <label class="report-field">
                        <span>Reason</span>
                        <select name="reason" required>${Object.entries(REPORT_LABELS)
                            .map(([id, label]) => `<option value="${id}">${label}</option>`)
                            .join("")}</select>
                    </label>
                    <label class="report-field">
                        <span>Details (optional)</span>
                        <textarea name="details" rows="4" maxlength="2000" placeholder="Add context…"></textarea>
                    </label>
                    <div class="report-actions">
                        <button type="button" class="report-cancel">Cancel</button>
                        <button type="submit" class="report-submit">Submit report</button>
                    </div>
                </form>
            </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector(".report-close")?.addEventListener("click", close);
        overlay.querySelector(".report-cancel")?.addEventListener("click", close);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) close();
        });
        overlay.querySelector(".report-form")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData();
            fd.set("target_type", payload.target_type);
            if (payload.post_id) fd.set("post_id", String(payload.post_id));
            if (payload.user_id) fd.set("user_id", String(payload.user_id));
            fd.set("reason", form.querySelector('[name="reason"]').value);
            fd.set("details", form.querySelector('[name="details"]').value.trim());
            try {
                await Request.post(`${Api.base}/reports`, fd);
                Alert.success("Report submitted");
                close();
            } catch (err) {
                Alert.error(err?.text || "Unable to submit report");
            }
        });
    }
}

import { Api } from "./api.js";
import { Request, Icons, Auth } from "./nesh.js";
import { App } from "./app.js";
import { encodePostMessage } from "./post-message.js";
import { Alert } from "./alert.js";
import { Overlay } from "./overlay.js";
import { UsersList } from "./users-list.js";

export class Share {
    constructor(card) {
        this.card = card;
    }

    get item() {
        return this.card.item;
    }

    isArticle() {
        return String(this.item?.type || "").toLowerCase() === "article";
    }

    shareLink() {
        if (this.isArticle()) {
            return this.item.url || "";
        }
        return "";
    }

    async open() {
        await this.card.ensureData();
        const canCopy = this.isArticle() && !!this.shareLink();
        const overlay = new Overlay("Share");
        await overlay.open();
        overlay.body((body) => {
            body.innerHTML = `
                <div class="share-options">
                    ${canCopy ? `<button type="button" class="share-option" data-action="copy"><i data-icon="link"></i> Copy link</button>` : ""}
                    <button type="button" class="share-option" data-action="inbox"><i data-icon="send"></i> Send to inbox</button>
                </div>`;
            body.querySelector('[data-action="copy"]')?.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(this.shareLink());
                    try {
                        await Request.post(Api.postShares(this.item.id));
                        this.card.recordShare();
                    } catch {
                        /* share count stays unchanged */
                    }
                    overlay.close();
                } catch {
                    Alert.error("Could not copy link");
                }
            });
            body.querySelector('[data-action="inbox"]')?.addEventListener("click", () => {
                overlay.close();
                this.openInboxPicker();
            });
            Icons.load(body);
        });
    }

    async openInboxPicker() {
        const me = await Auth.username();
        const list = new UsersList({
            title: "Send to inbox",
            hint: "Pick someone to share this post with.",
            onSelect: (user) => this.sendTo(user.username),
            loadUsers: async (term) => {
                if (term) {
                    const res = await Request.get(Api.exploreSearchAll(term));
                    const payload = Api.record(res) || {};
                    return (Array.isArray(payload.users) ? payload.users : []).filter(
                        (u) => u.username && u.username !== me,
                    );
                }
                const selfId = await App.resolveSelfUserId();
                if (!selfId) return [];
                const res = await Request.get(Api.userFollowing(selfId));
                return Api.list(res);
            },
        });
        await list.open();
    }

    async sendTo(username) {
        if (!username) return;
        try {
            const participantId = await App.resolveUserId(username);
            if (!participantId) throw new Error("User not found");
            const threadRes = await Request.post(Api.inbox, {
                participant_id: participantId,
            });
            const threadId = Number(Api.record(threadRes)?.id);
            if (!threadId) throw new Error("Missing thread");
            await Request.post(Api.inboxMessages(threadId), {
                body: encodePostMessage(this.item),
                type: "post",
            });
            UsersList.active?.close();
        } catch (e) {
            Alert.error(Api.message(e) || "Send failed");
        }
    }
}

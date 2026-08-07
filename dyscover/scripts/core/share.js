import { Request, Icons, Auth } from "./nesh.js";
import { encodePostMessage } from "./post-message.js";
import { App } from "./app.js";
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
                    Request.post(App.api("article/share"), {
                        file: this.item.file,
                    }).catch(() => { });
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
                    const res = await Request.get(App.api("user/search"), { term });
                    return (Array.isArray(res?.data) ? res.data : []).filter(
                        (u) => u.username && u.username !== me,
                    );
                }
                const res = await Request.get(App.api("chat/suggestions"));
                return Array.isArray(res.data?.followings) ? res.data.followings : [];
            },
        });
        await list.open();
    }
    async sendTo(username) {
        if (!username) return;
        try {
            const threadRes = await Request.post(App.api("chat/create-thread"), {
                participant: username,
            });
            const threadId = Number(threadRes.data?.id);
            if (!threadId) throw new Error("Missing thread");
            await Request.post(App.api("chat/send"), {
                thread_id: threadId,
                message: encodePostMessage(this.item),
            });
            UsersList.active?.close();
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Send failed");
        }
    }
}

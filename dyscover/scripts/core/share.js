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
                    await this.recordShareOnce();
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

    loadShareUsers(term, me) {
        if (term) {
            return Request.get(Api.exploreSearchAll(term)).then((res) => {
                const payload = Api.record(res) || {};
                return (Array.isArray(payload.users) ? payload.users : []).filter(
                    (u) => u.username && u.username !== me,
                );
            });
        }
        return App.resolveSelfUserId().then((selfId) => {
            if (!selfId) return [];
            return Request.get(Api.userFollowing(selfId)).then((res) => Api.list(res));
        });
    }

    async openInboxPicker() {
        const me = await Auth.username();
        const list = new UsersList({
            title: "Send to inbox",
            hint: "Select one or more people to share this post with.",
            multiSelect: true,
            submitLabel: "Send",
            onSubmit: (users) => this.sendToMany(users),
            loadUsers: (term) => this.loadShareUsers(term, me),
        });
        await list.open();
    }

    async sendToMany(users) {
        const usernames = [
            ...new Set(
                (Array.isArray(users) ? users : [])
                    .map((user) =>
                        typeof user === "string" ? user : user?.username || "",
                    )
                    .filter(Boolean),
            ),
        ];
        if (!usernames.length) return;
        let sent = 0;
        for (const username of usernames) {
            try {
                await this.sendTo(username, { quiet: true, keepOpen: true });
                sent += 1;
            } catch {
                /* continue with remaining recipients */
            }
        }
        if (sent > 0) {
            await this.recordShareOnce();
            UsersList.active?.close();
            Alert.success(
                sent === 1 ? "Post sent" : `Post sent to ${sent} people`,
            );
        } else {
            Alert.error("Send failed");
        }
    }

    async sendTo(username, opts = {}) {
        if (!username) return;
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
        if (!opts.keepOpen) {
            await this.recordShareOnce();
            UsersList.active?.close();
            if (!opts.quiet) {
                Alert.success("Post sent");
            }
        }
    }

    async recordShareOnce() {
        try {
            await Request.post(Api.postShares(this.item.id));
            this.card.recordShare();
        } catch {
            /* share count stays unchanged */
        }
    }
}

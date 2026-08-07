import { Request, Icons } from "./nesh.js";
import { App } from "./app.js";
import { Alert } from "./alert.js";
import { Mention } from "./mention.js";
import { Overlay } from "./overlay.js";
export class Comments {
    constructor(card) {
        this.card = card;
    }
    get item() {
        return this.card.item;
    }
    formatCommentDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "now";
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
        });
    }
    commentHtml(c) {
        return `<div class="post-comment">
            <a href="https://dyscover.ielectro.com/u/${c.username}">
                <img class="post-comment-avatar" src="${c.avatar}" alt="${c.username}">
            </a>
            <div class="post-comment-body">
                <p class="post-comment-line">
                    <a href="https://dyscover.ielectro.com/u/${c.username}">
                        <b>${c.username}</b>
                    </a>
                    ${Mention.linkify(c.body)}
                </p>
                <time class="post-comment-date">${this.formatCommentDate(c.created_at)}</time>
            </div>
        </div>`;
    }
    async fetchRows() {
        const res = await Request.get(App.api("post/list-comment"), {
            file: this.item.file,
        });
        return Array.isArray(res.data) ? res.data : [];
    }
    async renderInline(root) {
        const list = root?.querySelector(".post-comments-list");
        if (!list) return;
        try {
            const rows = await this.fetchRows();
            list.innerHTML = rows.length
                ? rows.map((c) => this.commentHtml(c)).join("")
                : "";
        } catch {
            list.innerHTML = "";
        }
    }
    async bindInline(root) {
        const list = root?.querySelector(".post-comments-list");
        const compose = root?.querySelector(".post-comment-compose-inline");
        const input = root?.querySelector(".post-comment-input");
        const sendBtn = root?.querySelector(".post-comment-send-btn");
        if (!list || !compose || !input) return;
        await this.renderInline(root);
        const submit = async () => {
            const text = input.value.trim();
            if (!text) return;
            try {
                await Request.post(App.api("post/comment"), {
                    file: this.item.file,
                    body: text,
                });
                input.value = "";
                await this.renderInline(root);
                this.item.comments = (Number(this.item.comments) || 0) + 1;
                const line = root.querySelector(".post-likes-line");
                if (line) {
                    line.innerHTML = `<strong>${Number(this.item.likes) || 0}</strong> likes · <strong>${this.item.comments}</strong> comments`;
                }
            } catch (err) {
                Alert.error(typeof err === "object" && err?.text ? err.text : "Comment failed");
            }
        };
        sendBtn?.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                submit();
            }
        });
    }
    async openBox() {
        const overlay = new Overlay("Comments");
        await overlay.open();
        overlay.body(async (body) => {
            body.innerHTML = `
                <div class="comments-overlay-list post-comments-list">Loading…</div>
                <div class="post-comment-compose">
                    <input type="text" class="post-comment-input" placeholder="Add a comment…" maxlength="4000">
                    <button type="button" class="post-comment-send-btn" aria-label="Send"><i data-icon="send"></i></button>
                </div>`;
            const list = body.querySelector(".post-comments-list");
            const input = body.querySelector(".post-comment-input");
            const sendBtn = body.querySelector(".post-comment-send-btn");
            const renderList = async () => {
                try {
                    const rows = await this.fetchRows();
                    list.innerHTML = rows.length
                        ? rows.map((c) => this.commentHtml(c)).join("")
                        : "";
                } catch {
                    list.innerHTML = "";
                }
            };
            await renderList();
            await Icons.load(body);
            const submit = async () => {
                const text = input?.value.trim();
                if (!text) return;
                try {
                    await Request.post(App.api("post/comment"), {
                        file: this.item.file,
                        body: text,
                    });
                    input.value = "";
                    await renderList();
                    this.item.comments = (Number(this.item.comments) || 0) + 1;
                } catch (err) {
                    Alert.error(typeof err === "object" && err?.text ? err.text : "Comment failed");
                }
            };
            sendBtn?.addEventListener("click", submit);
            input?.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                }
            });
        });
    }
}

import { Request } from "./nesh.js";
import { decodePostMessage, resolveNotificationType, notificationArticle, notificationPostType } from "./post-message.js";
import { App } from "./app.js";
import { Mention } from "./mention.js";
export class NotificationPopup {
    static stack = null;
    static templates = null;
    static lastActivityId = 0;
    static lastChatMsgId = 0;
    static started = false;
    static bootstrapped = false;
    static async start() {
        if (this.started) return;
        this.started = true;
        this.ensureStack();
        try {
            this.templates = await Request.get(
                "https://dyscover.ielectro.com/data/activity-messages.json",
            );
        } catch {
            this.templates = {};
        }
        await this.bootstrap();
    }
    static ensureStack() {
        if (this.stack) return;
        this.stack = document.createElement("div");
        this.stack.className = "notify-popup-stack";
        const mount = document.querySelector("main") || document.body;
        mount.appendChild(this.stack);
    }
    static async bootstrap() {
        try {
            const res = await Request.get(App.api("activity/since"), { bootstrap: 1 });
            this.lastActivityId = Number(res.data?.max_id) || 0;
        } catch {
            this.lastActivityId = 0;
        }
        try {
            const res = await Request.get(App.api("chat/incoming"), { bootstrap: 1 });
            this.lastChatMsgId = Number(res.data?.max_id) || 0;
        } catch {
            this.lastChatMsgId = 0;
        }
        this.bootstrapped = true;
    }
    static template(key, vars = {}) {
        let text = this.templates?.[key] || this.templates?.default || "New notification";
        Object.entries(vars).forEach(([k, v]) => {
            text = text.replaceAll(`{${k}}`, String(v ?? ""));
        });
        return text;
    }
    static async poll() {
        if (!this.bootstrapped) await this.bootstrap();
        try {
            const res = await Request.get(App.api("activity/since"), {
                after_id: this.lastActivityId,
            });
            const items = Array.isArray(res.data) ? res.data : [];
            items.forEach((item) => {
                this.lastActivityId = Math.max(this.lastActivityId, Number(item.id) || 0);
                this.showActivity(item);
            });
        } catch { }
        try {
            const res = await Request.get(App.api("chat/incoming"), {
                after_id: this.lastChatMsgId,
            });
            const items = Array.isArray(res.data) ? res.data : [];
            items.forEach((item) => {
                this.lastChatMsgId = Math.max(this.lastChatMsgId, Number(item.id) || 0);
                this.showChat(item);
            });
        } catch { }
    }
    static showActivity(item) {
        const user = item.actor_username || "Someone";
        const type = resolveNotificationType(item);
        const message = this.template(type, {
            user,
            article: notificationArticle(item),
            post_type: notificationPostType(item),
            message: item.body || "",
            details: item.body || "",
        });
        this.show({
            username: user,
            avatar:
                item.actor_avatar ||
                `https://account.ielectro.com/u/${encodeURIComponent(user)}/avatar.png`,
            message,
            href: "https://dyscover.ielectro.com/activity",
        });
    }
    static showChat(item) {
        const user = item.sender || "Someone";
        const post = decodePostMessage(item.body);
        let message;
        if (post) {
            const postType = String(post.type || "post").toLowerCase();
            message = this.template("chat_post", {
                user,
                post_type: postType === "article" ? "article" : postType,
                post_author: post.username || "unknown",
            });
        } else {
            message = this.template("chat_message", {
                user,
                message: Mention.linkify(String(item.body || "").trim()),
            });
        }
        this.show({
            username: user,
            avatar:
                item.sender_avatar ||
                `https://account.ielectro.com/u/${encodeURIComponent(user)}/avatar.png`,
            message,
            href: "https://dyscover.ielectro.com/inbox",
        });
    }
    static show({ username, avatar, message, href }) {
        this.ensureStack();
        const el = document.createElement("a");
        el.className = "notify-popup";
        el.href = href || "#";
        if (!href) {
            el.addEventListener("click", (e) => e.preventDefault());
        }
        el.innerHTML = `
            <img class="notify-popup-avatar" src="${avatar}" alt="">
            <div class="notify-popup-body">
                <strong class="notify-popup-user">${username}</strong>
                <p class="notify-popup-msg">${message}</p>
            </div>`;
        this.stack.appendChild(el);
        window.setTimeout(() => {
            el.classList.add("is-leaving");
            window.setTimeout(() => el.remove(), 320);
        }, 5000);
    }
}

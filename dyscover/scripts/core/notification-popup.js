import { Api } from "./api.js";
import { Request } from "./nesh.js";
import {
    decodePostMessage,
    resolveNotificationType,
    notificationArticle,
    notificationPostType,
} from "./post-message.js";
import { Mention } from "./mention.js";

export class NotificationPopup {
    static stack = null;
    static templates = null;
    static seenActivity = new Set();
    static seenMessages = new Set();
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
            const res = await Request.get(Api.activity);
            Api.list(res).forEach((item) => {
                if (item?.id) this.seenActivity.add(Number(item.id));
            });
        } catch {
            this.seenActivity.clear();
        }
        this.bootstrapped = true;
    }

    static template(key, vars = {}) {
        let text =
            this.templates?.[key] ||
            this.templates?.default ||
            "New notification";
        Object.entries(vars).forEach(([k, v]) => {
            text = text.replaceAll(`{${k}}`, String(v ?? ""));
        });
        return text;
    }

    static async poll() {
        if (!this.bootstrapped) await this.bootstrap();
        try {
            const res = await Request.get(Api.activity);
            const items = Api.list(res);
            items.forEach((item) => {
                const id = Number(item.id) || 0;
                if (!id || this.seenActivity.has(id)) return;
                this.seenActivity.add(id);
                if (!item.read) this.showActivity(item);
            });
        } catch {}
    }

    static showActivity(item) {
        const user = item.actor_username || "Someone";
        const type = resolveNotificationType(item);
        const message = this.template(type, {
            user,
            article: notificationArticle(item),
            post_type: notificationPostType(item),
            message: item.message || item.body || "",
            details: item.message || item.body || "",
        });
        this.show({
            username: user,
            avatar:
                item.actor_avatar ||
                `https://account.ielectro.com/u/${encodeURIComponent(user)}/avatar.png`,
            message,
            href: "#",
        });
    }

    static showChat(item) {
        const user = item.sender || item.username || "Someone";
        const post = decodePostMessage(item.body);
        let message;
        if (post) {
            message = `Shared a ${post.type || "post"}: ${post.title || ""}`.trim();
        } else {
            message = item.body || "New message";
        }
        this.show({
            username: user,
            avatar:
                item.avatar ||
                `https://account.ielectro.com/u/${encodeURIComponent(user)}/avatar.png`,
            message: Mention.linkify(message),
            href: "https://dyscover.ielectro.com/inbox",
        });
    }

    static show({ username, avatar, message, href }) {
        this.ensureStack();
        const node = document.createElement("a");
        node.className = "notify-popup";
        node.href = href || "#";
        node.innerHTML = `
            <img class="notify-popup-avatar" src="${avatar}" alt="">
            <div class="notify-popup-body">
                <strong>${username}</strong>
                <p>${message}</p>
            </div>`;
        this.stack.appendChild(node);
        requestAnimationFrame(() => node.classList.add("notify-popup--show"));
        setTimeout(() => {
            node.classList.remove("notify-popup--show");
            setTimeout(() => node.remove(), 300);
        }, 5000);
    }
}

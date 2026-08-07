import { Api } from "./api.js";
import { App } from "./app.js";
import { Request, Icons } from "./nesh.js";
import {
    decodePostMessage,
    resolveNotificationType,
    notificationArticle,
    notificationPostType,
    notificationTypeIcon,
    formatRelativeTime,
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
                `${Api.origin}/data/activity-messages.json`,
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
        this.stack.setAttribute("aria-live", "polite");
        document.body.appendChild(this.stack);
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

    static formatMessageHtml(text, username) {
        const safe = App.escapeHtml(text);
        const user = App.escapeHtml(username || "Someone");
        if (!user) return safe;
        return safe.replace(user, `<strong>${user}</strong>`);
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
            type,
            username: user,
            avatar:
                item.actor_avatar ||
                App.userAvatarUrl(item.actor_id, user),
            message: this.formatMessageHtml(message, user),
            createdAt: item.created_at,
            onOpen: async () => {
                const { ActivityUI } = await import(
                    "../activity/activity-ui.js"
                );
                await ActivityUI.openNotification(item);
            },
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
            type: "chat_message",
            username: user,
            avatar:
                item.avatar ||
                App.userAvatarUrl(null, user),
            message: Mention.linkify(App.escapeHtml(message)),
            createdAt: item.created_at,
            href: `${Api.origin}/inbox`,
        });
    }

    static show({
        type = "default",
        username,
        avatar,
        message,
        href,
        createdAt,
        onOpen,
    }) {
        this.ensureStack();
        const node = document.createElement("div");
        node.className = "notify-popup";
        const icon = notificationTypeIcon(type);
        const badgeClass = `notify-popup-badge--${String(type || "default").replace(/[^a-z0-9_-]/gi, "") || "default"}`;
        const inner = document.createElement("button");
        inner.type = "button";
        inner.className = "notify-popup-inner";
        inner.innerHTML = `
            <span class="notify-popup-avatar-wrap avatar">
                <img class="notify-popup-avatar" src="${App.escapeAttr(avatar)}" alt="">
                <span class="notify-popup-badge ${badgeClass}">
                    <i data-icon="${icon}"></i>
                </span>
            </span>
            <span class="notify-popup-body">
                <p class="notify-popup-msg">${message}</p>
                <span class="notify-popup-meta">${formatRelativeTime(createdAt) || "now"} · Activity</span>
            </span>
            <span class="notify-popup-close" role="button" aria-label="Dismiss">
                <i data-icon="x"></i>
            </span>`;

        const dismiss = (e) => {
            e?.preventDefault();
            e?.stopPropagation();
            this.hide(node);
        };

        inner.querySelector(".notify-popup-close")?.addEventListener(
            "click",
            dismiss,
        );
        inner.addEventListener("click", async (e) => {
            if (e.target.closest(".notify-popup-close")) return;
            dismiss();
            if (typeof onOpen === "function") {
                await onOpen();
                return;
            }
            if (href && href !== "#") {
                window.location.href = href;
            }
        });

        node.appendChild(inner);
        this.stack.appendChild(node);
        App.wireAvatarImg(inner.querySelector(".notify-popup-avatar"));
        Icons.load(node).catch(() => {});
        requestAnimationFrame(() => node.classList.add("notify-popup--show"));

        const timer = window.setTimeout(() => this.hide(node), 6000);
        node.dataset.timer = String(timer);
    }

    static hide(node) {
        if (!node?.isConnected) return;
        const timer = Number(node.dataset.timer);
        if (timer) window.clearTimeout(timer);
        node.classList.remove("notify-popup--show");
        window.setTimeout(() => node.remove(), 320);
    }
}

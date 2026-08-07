import { Api } from "../core/api.js";
import { App, EmptyState, Icons, Request, Navbar, Card } from "../core/index.js";
import {
    resolveNotificationType,
    notificationArticle,
    notificationPostType,
    notificationTypeIcon,
    formatRelativeTime,
} from "../core/post-message.js";

export class ActivityUI {
    static overlay = null;
    static templates = null;
    static _visBound = false;

    constructor() {
        this.list = null;
        this.isOverlay = false;
        this.seen = new Set();
        this.observer = null;
        this.pollTimer = null;
        this.ready = this.mount(document.querySelector(".activity-list"));
    }

    static async openOverlay() {
        if (ActivityUI.overlay) {
            ActivityUI.overlay.classList.add("activity-overlay--open");
            await ActivityUI.instance?.markAllRead();
            await ActivityUI.instance?.load();
            App.setScrollEnabled(false);
            return;
        }
        const shell = document.createElement("div");
        shell.className = "activity-overlay activity-overlay--open";
        shell.innerHTML = `
            <div class="activity-overlay-panel">
                <header class="activity-overlay-header">
                    <h2>Activity</h2>
                    <button type="button" class="activity-overlay-close" aria-label="Close">
                        <i data-icon="circle-x"></i>
                    </button>
                </header>
                <div class="activity-list"></div>
            </div>`;
        shell.addEventListener("click", (e) => {
            if (e.target === shell) ActivityUI.closeOverlay();
        });
        shell.querySelector(".activity-overlay-close")?.addEventListener("click", () => {
            ActivityUI.closeOverlay();
        });
        document.body.appendChild(shell);
        ActivityUI.overlay = shell;
        ActivityUI.instance = new ActivityUI();
        ActivityUI.instance.isOverlay = true;
        await ActivityUI.instance.mount(shell.querySelector(".activity-list"));
        await Icons.load(shell);
        App.setScrollEnabled(false);
    }

    static closeOverlay() {
        ActivityUI.overlay?.classList.remove("activity-overlay--open");
        App.setScrollEnabled(true);
    }

    static async openNotification(notification) {
        await ActivityUI.openOverlay();
        if (notification?.id) {
            await ActivityUI.instance?.openItem(notification);
        }
    }

    mount(list) {
        this.list = list;
        if (!this.list) return Promise.resolve();
        this.isOverlay = this.isOverlay || !!this.list.closest(".activity-overlay");
        document
            .querySelector(".activity-container .activity-mark-read")
            ?.addEventListener("click", async () => {
                await this.markAllRead();
                await this.load();
            });
        this.pollTimer = window.setInterval(() => {
            if (document.visibilityState === "visible") this.load({ silent: true });
        }, 14000);
        if (!ActivityUI._visBound) {
            ActivityUI._visBound = true;
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible") {
                    this.load({ silent: true });
                }
            });
        }
        if (this.isOverlay) {
            return this.markAllRead().then(() => this.load());
        }
        return this.load();
    }

    async markAllRead() {
        try {
            await Request.patch(Api.activityMarkAllRead);
            Navbar.refresh().catch(() => {});
        } catch {}
    }

    setupObserver() {
        if (!this.list || this.isOverlay) return;
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((en) => {
                    if (!en.isIntersecting || en.intersectionRatio < 0.25) return;
                    const el = en.target;
                    const id = el.dataset?.id;
                    const read = el.dataset?.read === "1";
                    if (!id || read || this.seen.has(id)) return;
                    this.seen.add(id);
                    el.dataset.read = "1";
                    el.classList.remove("notification-unread");
                    Request.patch(Api.activityMarkRead(id)).catch(() => {});
                    Navbar.refresh().catch(() => {});
                });
            },
            { threshold: [0, 0.25, 0.5] },
        );
        this.list.querySelectorAll(".notification-item").forEach((n) =>
            this.observer.observe(n),
        );
    }

    async load(opts = {}) {
        if (!this.list) return;
        try {
            if (!ActivityUI.templates) {
                try {
                    ActivityUI.templates = await Request.get(
                        `${Api.origin}/data/activity-messages.json`,
                    );
                } catch {
                    ActivityUI.templates = {};
                }
            }
            const data = await Request.get(Api.activity);
            const items = Api.list(data);
            this.render(items);
            await Icons.load(this.list);
            this.setupObserver();
            Navbar.refresh().catch(() => {});
        } catch {
            if (!opts.silent) {
                this.render([]);
                try {
                    await Icons.load(this.list);
                } catch {
                    /* ignore */
                }
                this.setupObserver();
            }
        }
    }

    buildMessage(notification) {
        const user =
            notification.actor_username ||
            notification.user ||
            notification.username ||
            "User";
        const type = resolveNotificationType(notification);
        const template =
            ActivityUI.templates?.[type] ||
            ActivityUI.templates?.default ||
            "{user} sent you a notification";
        const text = template
            .replaceAll("{user}", user)
            .replaceAll("{article}", notificationArticle(notification))
            .replaceAll("{post_type}", notificationPostType(notification))
            .replaceAll("{message}", notification.message || "")
            .replaceAll("{details}", notification.message || "");
        const safe = App.escapeHtml(text);
        return safe.replace(
            App.escapeHtml(user),
            `<strong class="notification-user">${App.escapeHtml(user)}</strong>`,
        );
    }

    thumbUrl(notification) {
        const post = notification.post;
        if (!post?.id) return "";
        const enriched = App.enrichPost({
            id: post.id,
            type: post.type,
            uuid: post.uuid,
            user_id: post.user_id,
            preview_image: post.preview_image,
        });
        return enriched.preview_image || enriched.preview || "";
    }

    async openItem(notification) {
        const type = resolveNotificationType(notification);
        const user =
            notification.actor_username ||
            notification.user ||
            notification.username ||
            "";
        if (type === "follow" || type === "unfollow") {
            if (user) {
                window.location.href = `${Api.origin}/users/${encodeURIComponent(user)}`;
            }
            return;
        }
        const postId = Number(notification.post_id || notification.post?.id);
        if (postId > 0) {
            ActivityUI.closeOverlay();
            const card = new Card({ id: postId });
            await card.openOverlay();
        }
    }

    render(activity) {
        if (!this.list) return;
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (!activity.length) {
            EmptyState.mount(this.list, EmptyState.activity());
            Icons.load(this.list).catch(() => {});
            return;
        }
        this.list.innerHTML = activity
            .map((notification) => {
                const id = Number(notification.id) || 0;
                const unread = !notification.read;
                const user =
                    notification.actor_username ||
                    notification.user ||
                    notification.username ||
                    "User";
                const av = App.escapeAttr(
                    notification.actor_avatar ||
                        App.userAvatarUrl(notification.actor_id, user),
                );
                const ph = App.escapeHtml(App.initialsOf(user));
                const type = resolveNotificationType(notification);
                const icon = notificationTypeIcon(type);
                const badgeClass = `notification-type-badge--${String(type || "default").replace(/[^a-z0-9_-]/gi, "") || "default"}`;
                const message = this.buildMessage(notification);
                const time = formatRelativeTime(notification.created_at);
                const thumb = this.thumbUrl(notification);
                const thumbHtml = thumb
                    ? `<div class="notification-thumb"><img src="${App.escapeAttr(thumb)}" alt="" loading="lazy"></div>`
                    : "";
                return `
            <article class="notification-item ${unread ? "notification-unread" : ""}" data-id="${id}" data-read="${unread ? "0" : "1"}">
                <button type="button" class="notification-main" data-notification-id="${id}">
                    <span class="notification-avatar-wrap">
                        <img class="notification-avatar-img" src="${av}" alt="" loading="lazy" />
                        <span class="notification-avatar-ph">${ph}</span>
                        <span class="notification-type-badge ${badgeClass}">
                            <i data-icon="${icon}"></i>
                        </span>
                    </span>
                    <span class="notification-content">
                        <span class="notification-message">${message}</span>
                        <span class="notification-time">${App.escapeHtml(time || "now")}</span>
                    </span>
                    ${thumbHtml}
                </button>
                <button type="button" class="notification-delete" data-id="${id}" aria-label="Delete notification">
                    <i data-icon="x"></i>
                </button>
            </article>`;
            })
            .join("");

        this.list.querySelectorAll(".notification-main").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = Number(btn.dataset.notificationId);
                const notification = activity.find(
                    (row) => Number(row.id) === id,
                );
                if (notification) {
                    this.openItem(notification).catch(() => {});
                }
            });
        });

        this.list.querySelectorAll(".notification-avatar-img").forEach((img) => {
            App.wireAvatarImg(img);
        });

        this.list.querySelectorAll(".notification-delete").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = Number(btn.dataset.id);
                if (!id) return;
                const row = btn.closest(".notification-item");
                row?.classList.add("notification-item--removing");
                try {
                    await Request.delete(Api.activityOne(id));
                    row?.remove();
                    if (!this.list.querySelector(".notification-item")) {
                        EmptyState.mount(this.list, EmptyState.activity());
                        await Icons.load(this.list);
                    }
                    Navbar.refresh().catch(() => {});
                } catch {
                    row?.classList.remove("notification-item--removing");
                }
            });
        });
    }
}

ActivityUI.instance = null;

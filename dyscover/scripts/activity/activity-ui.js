import { Api } from "../core/api.js";
import { App, EmptyState, Icons, Request, Navbar, Card, Alert } from "../core/index.js";
import {
    resolveNotificationType,
    notificationArticle,
    notificationPostType,
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

    userProfileUrl(username = "") {
        const raw = String(username || "").replace(/^@/, "").trim();
        if (!raw) return `${Api.origin}/explore`;
        return `${Api.origin}/users/${encodeURIComponent(raw)}`;
    }

    userLink(username = "") {
        const raw = String(username || "").replace(/^@/, "").trim();
        if (!raw) {
            return `<strong class="notification-user">Someone</strong>`;
        }
        const href = this.userProfileUrl(raw);
        return `<a class="notification-user-link" href="${App.escapeAttr(href)}"><strong>${App.escapeHtml(raw)}</strong></a>`;
    }

    buildUsersHtml(notification) {
        const actors =
            Array.isArray(notification.actors) && notification.actors.length
                ? notification.actors
                : [
                      {
                          username:
                              notification.actor_username ||
                              notification.user ||
                              notification.username ||
                              "",
                      },
                  ];
        const othersCount = Math.max(0, Number(notification.others_count) || 0);
        const links = actors
            .map((actor) => this.userLink(actor.username))
            .filter(Boolean);
        if (!links.length) {
            return this.userLink("");
        }
        if (othersCount > 0) {
            const others = othersCount.toLocaleString("en-US");
            if (links.length === 1) {
                return `${links[0]} and ${others} others`;
            }
            return `${links[0]}, ${links[1]} and ${others} others`;
        }
        if (links.length === 1) {
            return links[0];
        }
        if (links.length === 2) {
            return `${links[0]} and ${links[1]}`;
        }
        return links.join(", ");
    }

    buildMessage(notification) {
        const type = resolveNotificationType(notification);
        const template =
            ActivityUI.templates?.[type] ||
            ActivityUI.templates?.default ||
            "{user} sent you a notification";
        const usersHtml = this.buildUsersHtml(notification);
        const suffix = template.includes("{user}")
            ? template.split("{user}").slice(1).join("{user}")
            : template;
        const rest = suffix
            .replaceAll("{article}", notificationArticle(notification))
            .replaceAll("{post_type}", notificationPostType(notification))
            .replaceAll("{message}", notification.message || "")
            .replaceAll("{details}", notification.message || "");
        return `${usersHtml}${App.escapeHtml(rest)}`;
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
                const message = this.buildMessage(notification);
                const time = formatRelativeTime(notification.created_at);
                const thumb = this.thumbUrl(notification);
                const thumbHtml = thumb
                    ? `<div class="notification-thumb"><img src="${App.escapeAttr(thumb)}" alt="" loading="lazy"></div>`
                    : "";
                const followHtml =
                    type === "follow"
                        ? `<button type="button" class="notification-follow-btn${notification.viewer_following ? " is-following" : ""}" data-actor-id="${Number(notification.actor_id) || 0}" data-following="${notification.viewer_following ? "1" : "0"}">${notification.viewer_following ? "Unfollow" : "Follow back"}</button>`
                        : "";
                const avatars =
                    Array.isArray(notification.actors) && notification.actors.length
                        ? notification.actors.slice(0, 2)
                        : [
                              {
                                  username: user,
                                  avatar:
                                      notification.actor_avatar ||
                                      App.userAvatarUrl(notification.actor_id, user),
                              },
                          ];
                const avatarHtml =
                    avatars.length > 1
                        ? `<span class="notification-avatar-stack">${avatars
                              .map(
                                  (actor, index) =>
                                      `<img class="notification-avatar-img notification-avatar-img--stack" src="${App.escapeAttr(actor.avatar || App.userAvatarUrl(actor.id, actor.username))}" alt="" loading="lazy" style="z-index:${avatars.length - index}" />`,
                              )
                              .join("")}</span>`
                        : `<span class="notification-avatar-wrap">
                        <img class="notification-avatar-img" src="${av}" alt="" loading="lazy" />
                        <span class="notification-avatar-ph">${ph}</span>
                    </span>`;
                return `
            <article class="notification-item ${unread ? "notification-unread" : ""}${followHtml ? " notification-item--follow" : ""}" data-id="${id}" data-read="${unread ? "0" : "1"}">
                <button type="button" class="notification-main" data-notification-id="${id}">
                    ${avatarHtml}
                    <span class="notification-content">
                        <span class="notification-message">${message}</span>
                        <span class="notification-time">${App.escapeHtml(time || "now")}</span>
                    </span>
                    ${thumbHtml}
                </button>
                ${followHtml ? `<div class="notification-actions">${followHtml}</div>` : ""}
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

        this.list.querySelectorAll(".notification-user-link").forEach((link) => {
            link.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        });

        this.list.querySelectorAll(".notification-follow-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleFollow(btn).catch(() => {});
            });
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

    async toggleFollow(btn) {
        const actorId = Number(btn.dataset.actorId);
        if (!actorId) return;
        const following = btn.dataset.following === "1";
        try {
            if (following) {
                await Request.delete(Api.userFollowers(actorId));
                btn.dataset.following = "0";
                btn.textContent = "Follow back";
                btn.classList.remove("is-following");
            } else {
                await Request.post(Api.userFollowers(actorId));
                btn.dataset.following = "1";
                btn.textContent = "Unfollow";
                btn.classList.add("is-following");
            }
        } catch (err) {
            Alert.error(
                typeof err === "object" && err?.text ? err.text : "Action failed",
            );
        }
    }
}

ActivityUI.instance = null;

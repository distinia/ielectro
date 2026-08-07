import { Api } from "../core/api.js";
import { App, EmptyState, Icons, Request, Navbar } from "../core/index.js";
import {
    resolveNotificationType,
    notificationArticle,
    notificationPostType,
} from "../core/post-message.js";

export class ActivityUI {
    static overlay = null;
    static templates = null;
    static _visBound = false;

    constructor() {
        this.list = null;
        this.seen = new Set();
        this.observer = null;
        this.pollTimer = null;
        this.mount(document.querySelector(".activity-list"));
    }

    static async openOverlay() {
        if (ActivityUI.overlay) {
            ActivityUI.overlay.classList.add("activity-overlay--open");
            ActivityUI.instance?.load();
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
        ActivityUI.instance.mount(shell.querySelector(".activity-list"));
        await Icons.load(shell);
        App.setScrollEnabled(false);
    }

    static closeOverlay() {
        ActivityUI.overlay?.classList.remove("activity-overlay--open");
        App.setScrollEnabled(true);
    }

    mount(list) {
        this.list = list;
        if (!this.list) return;
        document.querySelector(".activity-mark-read")?.addEventListener("click", () => {
            this.load();
            Navbar.refresh().catch(() => {});
        });
        this.load();
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
    }

    setupObserver() {
        if (!this.list) return;
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
                        "https://dyscover.ielectro.com/data/activity-messages.json",
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
                        `https://account.ielectro.com/u/${encodeURIComponent(user)}/avatar.png`,
                );
                const ph = App.escapeHtml(App.initialsOf(user));
                const type = resolveNotificationType(notification);
                const template =
                    ActivityUI.templates?.[type] ||
                    ActivityUI.templates?.default ||
                    "{user} sent you a notification";
                const message = template
                    .replaceAll("{user}", user)
                    .replaceAll(
                        "{article}",
                        notificationArticle(notification),
                    )
                    .replaceAll(
                        "{post_type}",
                        notificationPostType(notification),
                    )
                    .replaceAll("{message}", notification.message || "")
                    .replaceAll("{details}", notification.message || "");
                return `
            <div class="notification-item ${unread ? "notification-unread" : ""}" data-id="${id}" data-read="${unread ? "0" : "1"}">
                <div class="notification-avatar-wrap">
                    <img class="notification-avatar-img" src="${av}" alt="" loading="lazy" />
                    <span class="notification-avatar-ph">${ph}</span>
                </div>
                <div class="notification-content">
                    <p class="notification-message">${App.escapeHtml(message)}</p>
                    <button type="button" class="notification-delete" data-id="${id}" aria-label="Dismiss">
                        <i data-icon="trash"></i>
                    </button>
                </div>
            </div>`;
            })
            .join("");
        this.list.querySelectorAll(".notification-delete").forEach((btn) => {
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = Number(btn.dataset.id);
                if (!id) return;
                try {
                    await Request.delete(Api.activityOne(id));
                    btn.closest(".notification-item")?.remove();
                    Navbar.refresh().catch(() => {});
                } catch {}
            });
        });
    }
}

ActivityUI.instance = null;

import {
    App,
    Request,
    Icons,
    Navbar,
    postTypeLabel,
    resolveNotificationType,
    notificationArticle,
    notificationPostType,
} from "./app.js";
let activityTemplates = null;
window.addEventListener("DOMContentLoaded", () => {
    new App();
    new ActivityUI();
});
class ActivityUI {
    static _visBound = false;
    constructor() {
        this.list =
            document.querySelector(".activity-list") ||
            document.querySelector("#activityList");
        this.seen = new Set();
        document.querySelector(".activity-mark-read")?.addEventListener("click", () => {
            Request.post(App.api("activity/read"))
                .then(() => this.load())
                .then(() => Navbar.refresh().catch(() => { }))
                .catch(() => { });
        });
        this.observer = null;
        this.pollTimer = null;
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
                    Request.post(App.api("activity/read-item"), {
                        id: Number(id),
                    }).catch(() => {
                        this.seen.delete(id);
                    });
                    el.dataset.read = "1";
                    el.classList.remove("notification-unread");
                    Navbar.refresh().catch(() => { });
                });
            },
            { threshold: [0, 0.25, 0.5] },
        );
        this.list.querySelectorAll(".notification-item").forEach((n) =>
            this.observer.observe(n),
        );
    }
    async load(opts = {}) {
        try {
            if (!activityTemplates) {
                try {
                    activityTemplates = await Request.get(
                        "https://dyscover.ielectro.com/data/activity-messages.json",
                    );
                } catch {
                    activityTemplates = {};
                }
            }
            const data = await Request.get(App.api("activity/log"));
            const items = Array.isArray(data.data) ? data.data : [];
            this.render(items);
            await Icons.load(this.list);
            this.wireAvatars();
            this.setupObserver();
            Navbar.refresh().catch(() => { });
        } catch {
            if (!opts.silent) {
                this.render([]);
                try {
                    await Icons.load(this.list);
                } catch {
                    /* ignore */
                }
                this.wireAvatars();
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
            this.list.innerHTML =
                '<div class="notification-item"><p class="notification-message">No activity yet.</p></div>';
            return;
        }
        this.list.innerHTML = activity
            .map(
                (notification) => {
                    const id = Number(notification.id) || 0;
                    const unread = !notification.read;
                    const user = notification.actor_username || notification.user || notification.username || "User";
                    const av = escapeAttr(
                        notification.actor_avatar ||
                        `https://account.ielectro.com/u/${encodeURIComponent(user)}/avatar.png`,
                    );
                    const ph = escapeHtml(this.initials(user));
                    return `
            <div class="notification-item ${unread ? "notification-unread" : ""}" data-id="${id}" data-read="${unread ? "0" : "1"}">
                <div class="notification-avatar-wrap">
                    <img class="notification-avatar-img" src="${av}" alt="" loading="lazy" />
                    <span class="notification-avatar-ph">${ph}</span>
                </div>
                <div class="notification-content">
                    <div class="notification-text">
                        <div class="notification-icon">
                            <i data-icon="${this.icon(notification)}" class="icon-${notification.type || "info"}"></i>
                        </div>
                        <p class="notification-message">${escapeHtml(this.text(notification))}</p>
                    </div>
                    <p class="notification-time">${escapeHtml(this.formatTime(notification))}</p>
                </div>
            </div>
        `;
                },
            )
            .join("");
    }
    wireAvatars() {
        if (!this.list) return;
        this.list.querySelectorAll(".notification-avatar-img").forEach((img) => {
            const wrap = img.closest(".notification-avatar-wrap");
            const ph = wrap?.querySelector(".notification-avatar-ph");
            img.addEventListener("error", () => {
                img.style.display = "none";
                if (ph) ph.style.display = "flex";
            });
            img.addEventListener("load", () => {
                if (ph) ph.style.display = "none";
            });
        });
    }
    formatTime(n) {
        const raw = n.created_at || n.created || n.time || "";
        if (!raw) return "";
        const d = new Date(String(raw).replace(" ", "T"));
        if (Number.isNaN(d.getTime())) return String(raw);
        return d.toLocaleString();
    }
    initials(name) {
        return String(name)
            .split(/[\s_]+/)
            .map((n) => n[0])
            .filter(Boolean)
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }
    icon(notification) {
        const type = resolveNotificationType(notification);
        if (type === "follow") return "user-plus";
        if (type === "unfollow") return "user";
        if (type === "like") return "heart";
        if (type === "comment") return "message-circle";
        if (type === "share") return "share-2";
        if (type === "mention") return "message-circle";
        return "bell";
    }
    template(key, vars = {}) {
        let text = activityTemplates?.[key] || activityTemplates?.default || "New notification";
        Object.entries(vars).forEach(([k, v]) => {
            text = text.replaceAll(`{${k}}`, String(v ?? ""));
        });
        return text;
    }
    text(notification) {
        const user = notification.actor_username || notification.user || notification.username || "Someone";
        const type = resolveNotificationType(notification);
        return this.template(type, {
            user,
            article: notificationArticle(notification),
            post_type: notificationPostType(notification),
            message: notification.body || "",
            details: notification.body || "",
        });
    }
}
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
}

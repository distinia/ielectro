import { Api } from "./api.js";
import { Request, Icons, Auth } from "./nesh.js";
import { App } from "./app.js";
import { NotificationPopup } from "./notification-popup.js";

export class Navbar {
    static instance = null;

    constructor() {
        Navbar.instance = this;
        this.timer = null;
        this.visBound = false;
        this.nav = null;
        this.init();
    }

    async init() {
        let profileUrl = "https://account.ielectro.com/login?service=dyscover";
        const username = await Auth.username();
        if (username) {
            profileUrl = `https://dyscover.ielectro.com/users/${encodeURIComponent(username)}`;
        }
        this.nav = document.createElement("nav");
        this.nav.className = "top-nav";
        this.nav.innerHTML = `
            <a class="logo" translate="no" href="https://dyscover.ielectro.com"></a>
            <div class="nav-icons">
                <a href="https://dyscover.ielectro.com" class="nav-icon" data-nav="home"><i data-icon="home"></i></a>
                <a href="https://dyscover.ielectro.com/explore" class="nav-icon" data-nav="explore"><i data-icon="search"></i></a>
                <a href="https://dyscover.ielectro.com/inbox" class="nav-icon nav-icon-badge-wrap" data-nav="inbox">
                    <i data-icon="message-circle"></i>
                    <span class="nav-badge" data-badge="inbox"></span>
                </a>
                <a href="https://dyscover.ielectro.com/creator-center" class="nav-icon" data-nav="creator-center"><i data-icon="briefcase"></i></a>
                <button type="button" class="nav-icon nav-icon-badge-wrap nav-icon-button" data-action="activity">
                    <i data-icon="bell"></i>
                    <span class="nav-badge" data-badge="activity"></span>
                </button>
                <a href="${profileUrl}" class="nav-icon" data-nav="users"><i data-icon="user"></i></a>
            </div>
        `;
        document.body.insertBefore(this.nav, document.body.firstChild);
        this.highlightActive();
        this.nav.querySelector('[data-action="activity"]')?.addEventListener("click", () => {
            import("../activity/activity-ui.js").then(({ ActivityUI }) => {
                ActivityUI.openOverlay();
            });
        });
        await Icons.load(this.nav);
        if (await Auth.logged()) {
            this.startBadges();
            NotificationPopup.start().catch(() => {});
        }
    }

    highlightActive() {
        const page = App.page();
        this.nav.querySelectorAll(".nav-icon[data-nav]").forEach((link) => {
            const nav = link.dataset.nav;
            let active = false;
            if (nav === "home") {
                active = page === "home";
            } else if (nav === "users") {
                active = page === "users" || page === "user";
            } else {
                active = nav === page;
            }
            link.classList.toggle("active-icon", active);
        });
    }

    async startBadges() {
        await this.refreshBadges().catch(() => {});
        setTimeout(() => {
            this.refreshBadges().catch(() => {});
        }, 600);
        this.timer = setInterval(() => {
            if (document.visibilityState === "visible") {
                this.refreshBadges().catch(() => {});
            }
        }, 10000);
        if (!this.visBound) {
            this.visBound = true;
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible") {
                    this.refreshBadges().catch(() => {});
                }
            });
        }
    }

    static async refresh() {
        if (Navbar.instance instanceof Navbar) {
            return Navbar.instance.refreshBadges().catch(() => undefined);
        }
        return undefined;
    }

    async refreshBadges() {
        if (!(await Auth.logged())) return;
        try {
            const [activityRes, inboxRes] = await Promise.all([
                Request.get(Api.activity).catch(() => []),
                Request.get(Api.inbox).catch(() => []),
            ]);
            const activityCount = Api.list(activityRes).filter(
                (item) => !item.read,
            ).length;
            const inboxCount = Api.list(inboxRes).reduce(
                (sum, item) => sum + (Number(item.unread) || 0),
                0,
            );
            this.applyBadge(
                this.nav.querySelector('[data-badge="inbox"]'),
                inboxCount,
            );
            this.applyBadge(
                this.nav.querySelector('[data-badge="activity"]'),
                activityCount,
            );
            NotificationPopup.poll().catch(() => {});
        } catch {}
    }

    applyBadge(element, value) {
        if (!element) return;
        const count = Math.max(0, Math.floor(Number(value) || 0));
        if (count <= 0) {
            element.textContent = "";
            element.classList.remove("nav-badge--show");
            return;
        }
        element.textContent = count > 99 ? "99+" : String(count);
        element.classList.add("nav-badge--show");
    }

    destroy() {
        clearInterval(this.timer);
        this.timer = null;
    }
}

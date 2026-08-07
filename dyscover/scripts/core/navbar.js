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
        if (await Auth.logged()) {
            profileUrl = `https://dyscover.ielectro.com/u/${await Auth.username()}`;
        }
        this.nav = document.createElement("nav");
        this.nav.className = "top-nav";
        this.nav.innerHTML = `
            <a class="logo" translate="no"></a>
            <div class="nav-icons">
                <a href="https://dyscover.ielectro.com" class="nav-icon"><i data-icon="home"></i></a>
                <a href="https://dyscover.ielectro.com/explore" class="nav-icon"><i data-icon="search"></i></a>
                <a href="https://dyscover.ielectro.com/inbox" class="nav-icon nav-icon-badge-wrap">
                    <i data-icon="message-circle"></i>
                    <span class="nav-badge" data-badge="chat"></span>
                </a>
                <a href="https://dyscover.ielectro.com/creator-center" class="nav-icon"><i data-icon="briefcase"></i></a>
                <a href="https://dyscover.ielectro.com/activity" class="nav-icon nav-icon-badge-wrap">
                    <i data-icon="bell"></i>
                    <span class="nav-badge" data-badge="activity"></span>
                </a>
                <a href="${profileUrl}" class="nav-icon"><i data-icon="user"></i></a>
            </div>
        `;
        document.body.insertBefore(this.nav, document.body.firstChild);
        await Icons.load(this.nav);
        if (await Auth.logged()) {
            this.startBadges();
            NotificationPopup.start().catch(() => { });
        }
    }
    async startBadges() {
        await this.refreshBadges().catch(() => { });
        setTimeout(() => {
            this.refreshBadges().catch(() => { });
        }, 600);
        this.timer = setInterval(() => {
            if (document.visibilityState === "visible") {
                this.refreshBadges().catch(() => { });
            }
        }, 10000);
        if (!this.visBound) {
            this.visBound = true;
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible") {
                    this.refreshBadges().catch(() => { });
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
            const res = await Request.get(App.api("activity/nav-badges"));
            const data = res.data || {};
            this.applyBadge(
                this.nav.querySelector('[data-badge="chat"]'),
                data.chat
            );
            this.applyBadge(
                this.nav.querySelector('[data-badge="activity"]'),
                data.activity
            );
            NotificationPopup.poll().catch(() => { });
        } catch { }
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

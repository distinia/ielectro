import { Api } from "../core/api.js";
import { App, Icons, Mention, Request } from "../core/index.js";

export class Informations {
    constructor(page) {
        this.page = page;
        this.init();
    }

    static normalizeWebsiteUrl(raw) {
        const value = String(raw || "").trim();
        if (!value) {
            return { href: "", label: "" };
        }
        const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
        const label = value
            .replace(/^https?:\/\//i, "")
            .replace(/^www\./i, "")
            .replace(/\/$/, "");
        return { href, label: label || value };
    }

    static renderWebsite(website) {
        const wrap = document.querySelector(".profile-website-wrap");
        const link = document.querySelector(".profile-website");
        const labelEl = document.querySelector(".profile-website-label");
        if (!wrap || !link || !labelEl) return;
        const { href, label } = Informations.normalizeWebsiteUrl(website);
        if (!href) {
            wrap.hidden = true;
            link.removeAttribute("href");
            labelEl.textContent = "";
            return;
        }
        wrap.hidden = false;
        link.href = href;
        labelEl.textContent = label;
        Icons.load(wrap).catch(() => {});
    }

    static async refresh(page) {
        if (!page?.userId) return;
        try {
            const res = await Request.get(Api.user(page.username));
            const user = Api.record(res) || {};
            document.querySelector(".followers-number").textContent = user.followers ?? 0;
            document.querySelector(".followings-number").textContent = user.following ?? 0;
        } catch {
            /* ignore */
        }
    }

    async init() {
        if (!this.page?.userId) {
            return;
        }
        try {
            const res = await Request.get(Api.user(this.page.username));
            const user = Api.record(res) || {};
            const avatar = document.querySelector(".avatar");
            if (avatar) {
                this.page.accountId = Number(user.account_id) || 0;
                avatar.src =
                    user.avatar ||
                    App.userAvatarUrl(
                        this.page.userId,
                        user.username,
                        "",
                        this.page.accountId,
                    );
            }
            const usernameEl = document.querySelector(".username");
            if (usernameEl) usernameEl.textContent = user.username || "";
            const posts = await Request.get(Api.userPosts(this.page.userId));
            const postCount = Api.list(posts).length;
            const postsEl = document.querySelector(".articles-number");
            if (postsEl) postsEl.textContent = postCount;
            const followersEl = document.querySelector(".followers-number");
            if (followersEl) followersEl.textContent = user.followers ?? 0;
            const followingEl = document.querySelector(".followings-number");
            if (followingEl) followingEl.textContent = user.following ?? 0;
            this.page.bio = user.biography || "";
            this.page.website = user.website || "";
            Mention.renderInto(
                document.querySelector(".biography"),
                this.page.bio,
                "No biography yet.",
            );
            Informations.renderWebsite(this.page.website);
            document.title = `@${user.username} - iElectro Dyscover`;
        } catch {
            Mention.renderInto(
                document.querySelector(".biography"),
                "",
                "We couldn't load this profile right now.",
            );
        }
    }
}

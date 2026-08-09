import { Api } from "../core/api.js";
import { App, Mention, Request } from "../core/index.js";

export class Informations {
    constructor(page) {
        this.page = page;
        this.init();
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
                avatar.src = App.bustAvatarUrl(
                    this.page.userId,
                    user.avatar || "",
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
            Mention.renderInto(
                document.querySelector(".biography"),
                this.page.bio,
                "No biography yet.",
            );
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

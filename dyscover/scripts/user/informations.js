import { Api } from "../core/api.js";
import { EmptyState, Mention, Request } from "../core/index.js";

export class Informations {
    constructor(page) {
        this.page = page;
        this.init();
    }

    async init() {
        try {
            const res = await Request.get(Api.user(this.page.userId));
            const user = Api.record(res) || {};
            document.querySelector(".avatar").src = `${user.avatar}?t=${Date.now()}`;
            document.querySelector(".username").textContent = user.username;
            const posts = await Request.get(Api.userPosts(this.page.userId));
            const postCount = Api.list(posts).length;
            document.querySelector(".articles-number").textContent =
                `${postCount} post${postCount === 1 ? "" : "s"}`;
            document.querySelector(".followers-number").textContent =
                `${user.followers} followers`;
            document.querySelector(".followings-number").textContent =
                `${user.following} following`;
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

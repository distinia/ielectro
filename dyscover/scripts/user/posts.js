import { Api } from "../core/api.js";
import { App, EmptyState, Icons, Request } from "../core/index.js";

export class Posts {
    constructor(page) {
        this.page = page;
        this.container = document.querySelector(".profile-posts");
        this.init();
    }

    async init() {
        if (!this.container) return;
        this.container.innerHTML = `<p class="profile-loading">Loading posts…</p>`;
        const isOwn = this.page.loggedUsername === this.page.username;
        document
            .querySelectorAll('.profile-tab[data-filter="liked"]')
            .forEach((tab) => {
                tab.style.display = isOwn ? "" : "none";
            });
        try {
            const res = await Request.get(Api.userPosts(this.page.userId));
            this.page.posts = Api.list(res)
                .map((item) => App.enrichPost(item))
                .sort(
                    (a, b) =>
                        new Date(b.created_at || b.updated_at || 0) -
                        new Date(a.created_at || a.updated_at || 0),
                );
            if (isOwn) {
                try {
                    const savedRes = await Request.get(
                        Api.userBookmarks(this.page.userId),
                    );
                    this.page.saved = Api.list(savedRes).map((item) =>
                        App.enrichPost(item),
                    );
                } catch {
                    this.page.saved = [];
                }
                try {
                    const likedRes = await Request.get(
                        Api.userLikes(this.page.userId),
                    );
                    this.page.liked = Api.list(likedRes).map((item) =>
                        App.enrichPost(item),
                    );
                } catch {
                    this.page.liked = [];
                }
            } else {
                this.page.saved = [];
                this.page.liked = [];
            }
            await this.page.renderGrid();
        } catch {
            this.page.posts = [];
            this.page.saved = [];
            this.page.liked = [];
            EmptyState.mount(
                this.container,
                EmptyState.profilePosts({
                    isOwn: this.page.loggedUsername === this.page.username,
                    username: this.page.username,
                }),
            );
            await Icons.load(this.container);
        }
    }
}

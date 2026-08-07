import { Api } from "../core/api.js";
import { App, EmptyState, Icons, Request, Spinner } from "../core/index.js";

export class Posts {
    constructor(page) {
        this.page = page;
        this.container = document.querySelector(".profile-posts");
        this.init();
    }

    async init() {
        if (!this.container || !this.page?.userId) {
            return;
        }
        Spinner.mount(this.container);
        const isOwn = this.page.loggedUsername === this.page.username;
        document.querySelectorAll('.profile-tab[data-filter="liked"]').forEach((tab) => {
            tab.style.display = isOwn ? "" : "none";
        });
        document.querySelectorAll('.profile-tab[data-filter="saved"]').forEach((tab) => {
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
                this.page.saved = await this.fetchList(Api.userBookmarks);
                this.page.liked = await this.fetchList(Api.userLikes);
            } else {
                this.page.saved = [];
                this.page.liked = [];
            }
            this.page.reposts = await this.fetchList(Api.userReposts);
            this.page.mentioned = await this.fetchList(Api.userMentions);
            await this.page.renderGrid();
        } catch {
            this.page.posts = [];
            this.page.saved = [];
            this.page.liked = [];
            this.page.reposts = [];
            this.page.mentioned = [];
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

    async fetchList(apiFn) {
        try {
            const res = await Request.get(apiFn(this.page.userId));
            return Api.list(res).map((item) => App.enrichPost(item));
        } catch {
            return [];
        }
    }
}

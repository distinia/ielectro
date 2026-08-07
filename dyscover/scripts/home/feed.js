import { Alert, Card, Request } from "../core/index.js";
export class Feed {
    constructor() {
        this.stage = document.querySelector(".feed-stage");
        this.btnPrev = document.querySelector(".feed-nav-prev");
        this.btnNext = document.querySelector(".feed-nav-next");
        this.posts = [];
        this.index = 0;
        if (!this.stage) return;
        this.bindNav();
        this.init();
    }
    bindNav() {
        this.btnPrev?.addEventListener("click", () => this.prev());
        this.btnNext?.addEventListener("click", () => this.next());
        document.addEventListener("keydown", (e) => {
            if (e.target.matches("input, textarea, [contenteditable]")) return;
            if (e.key === "ArrowDown" || e.key === "PageDown") {
                e.preventDefault();
                this.next();
            }
            if (e.key === "ArrowUp" || e.key === "PageUp") {
                e.preventDefault();
                this.prev();
            }
        });
    }
    async init() {
        try {
            const res = await Request.get(
                "https://dyscover.ielectro.com/api/article/feed",
                { limit: 50 },
            );
            this.posts = (Array.isArray(res?.data) ? res.data : []).map((item) =>
                new Card(item),
            );
            if (!this.posts.length) {
                this.stage.innerHTML =
                    '<p class="feed-empty">No articles yet. Check back soon.</p>';
                this.syncNav();
                return;
            }
            await this.show(0);
        } catch (error) {
            Alert.error(typeof error === "string" ? error : "Unable to load feed");
        }
    }
    syncNav() {
        if (this.btnPrev) this.btnPrev.disabled = this.index <= 0;
        if (this.btnNext)
            this.btnNext.disabled = this.index >= this.posts.length - 1;
    }
    async show(nextIndex) {
        if (nextIndex < 0 || nextIndex >= this.posts.length) return;
        this.index = nextIndex;
        this.stage.innerHTML = "";
        const mount = document.createElement("div");
        mount.className = "feed-slide";
        this.stage.appendChild(mount);
        await this.posts[this.index].create(mount);
        this.syncNav();
    }
    async next() {
        await this.show(this.index + 1);
    }
    async prev() {
        await this.show(this.index - 1);
    }
}

import { App } from "../core/app.js";
import { Api } from "../core/api.js";
import { Card, EmptyState, Icons, Request, Spinner } from "../core/index.js";

export class Feed {
    constructor() {
        this.stage = document.querySelector(".feed-stage");
        this.btnPrev = document.querySelector(".feed-nav-prev");
        this.btnNext = document.querySelector(".feed-nav-next");
        this.posts = [];
        this.index = 0;
        if (!this.stage) return;
        this.bindNav();
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

    async renderEmpty(options, onAction) {
        EmptyState.mount(this.stage, options, onAction);
        await Icons.load(this.stage);
        this.syncNav();
    }

    async init() {
        Spinner.mount(this.stage);
        try {
            const res = await Request.get(Api.feed(50));
            this.posts = Api.list(res).map(
                (item) => new Card(App.enrichPost(item)),
            );
            if (!this.posts.length) {
                await this.renderEmpty(EmptyState.feed());
                return;
            }
            await this.show(0);
        } catch {
            await this.renderEmpty(EmptyState.feed());
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

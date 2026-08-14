import { App } from "../core/app.js";
import { Auth, Card, EmptyState, Icons } from "../core/index.js";
export class ProfilePage {
    static instance = null;
    constructor(username) {
        this.username = username;
        this.loggedUsername = null;
        this.userId = null;
        this.posts = [];
        this.saved = [];
        this.liked = [];
        this.reposts = [];
        this.mentioned = [];
        this.bio = "";
        this.website = "";
        this.mainFilter = "posts";
        this.typeFilter = "article";
        ProfilePage.instance = this;
    }
    static current() {
        return ProfilePage.instance;
    }
    showError(message) {
        const root = document.querySelector(".profile-page");
        if (root) {
            EmptyState.mount(root, EmptyState.profileNotFound());
        }
        return false;
    }
    async init() {
        this.loggedUsername = await Auth.username();
        if (
            !this.username ||
            this.username === "null" ||
            this.username === "users"
        ) {
            if (this.loggedUsername) {
                this.username = this.loggedUsername;
            } else {
                return this.showError("User not found.");
            }
        }
        this.userId = await App.resolveUserId(this.username);
        if (!this.userId) {
            return this.showError("User not found.");
        }
        document.title = `@${this.username} - iElectro Dyscover`;
        return true;
    }
    itemsForGrid() {
        let source = this.posts;
        if (this.mainFilter === "saved") source = this.saved;
        if (this.mainFilter === "liked") source = this.liked;
        if (this.mainFilter === "reposts") source = this.reposts;
        if (this.mainFilter === "mentioned") source = this.mentioned;
        return source.filter(
            (item) => String(item.type || "article") === this.typeFilter,
        );
    }
    async renderGrid() {
        const container = document.querySelector(".profile-posts");
        if (!container) return;
        const items = this.itemsForGrid();
        container.innerHTML = "";
        if (!items.length) {
            const isOwn = this.loggedUsername === this.username;
            EmptyState.mount(
                container,
                EmptyState.profileGrid({
                    filter: this.mainFilter,
                    typeFilter: this.typeFilter,
                    isOwn,
                    username: this.username,
                }),
            );
            await Icons.load(container);
            return;
        }
        for (const item of items) {
            const mount = document.createElement("div");
            mount.className = "profile-post-cell";
            container.appendChild(mount);
            const card = new Card(App.enrichPost(item));
            await card.preview(mount);
        }
        await Icons.load(container);
    }
}

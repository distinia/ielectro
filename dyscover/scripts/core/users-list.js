import { Overlay } from "./overlay.js";
export class UsersList {
    static active = null;
    constructor(options = {}) {
        this.title = options.title || "Select user";
        this.onSelect = options.onSelect || (() => { });
        this.actionLabel = options.actionLabel || null;
        this.onAction = options.onAction || null;
        this.loadUsers = options.loadUsers || null;
        this.searchable = options.searchable !== false;
        this.hint = options.hint || "";
        this.overlay = null;
        this.listEl = null;
        this.searchEl = null;
    }
    async open() {
        UsersList.active?.close();
        this.overlay = new Overlay(this.title);
        await this.overlay.open();
        UsersList.active = this;
        const body = this.overlay.panel;
        body.innerHTML = `
            ${this.hint ? `<p class="users-list-hint">${this.hint}</p>` : ""}
            ${this.searchable ? `<input type="search" class="users-list-search" placeholder="Search username…" autocomplete="off">` : ""}
            <ul class="users-list-items"></ul>`;
        this.listEl = body.querySelector(".users-list-items");
        this.searchEl = body.querySelector(".users-list-search");
        if (this.searchEl) {
            let debounce = null;
            this.searchEl.addEventListener("input", () => {
                clearTimeout(debounce);
                debounce = setTimeout(
                    () => this.refresh(this.searchEl.value.trim()),
                    280,
                );
            });
            this.searchEl.focus();
        }
        await this.refresh("");
        return this;
    }
    async refresh(term) {
        if (!this.listEl) return;
        this.listEl.innerHTML = `<li class="users-list-empty">Loading…</li>`;
        let users = [];
        try {
            if (this.loadUsers) {
                users = await this.loadUsers(term);
            }
        } catch {
            users = [];
        }
        users = (Array.isArray(users) ? users : []).filter((u) => u?.username);
        if (!users.length) {
            this.listEl.innerHTML = `<li class="users-list-empty">${term ? "No users found." : "No users yet."}</li>`;
            return;
        }
        this.listEl.innerHTML = "";
        users.forEach((user) => {
            const li = document.createElement("li");
            li.className = "users-list-item";
            li.dataset.username = user.username;
            const avatar =
                user.avatar ||
                `https://account.ielectro.com/u/${encodeURIComponent(user.username)}/avatar.png`;
            li.innerHTML = `
                <button type="button" class="users-list-link">
                    <img class="users-list-avatar" src="${avatar}" alt="">
                    <span class="users-list-name">${user.username}</span>
                </button>
                ${this.actionLabel ? `<button type="button" class="users-list-action">${this.actionLabel}</button>` : ""}`;
            li.querySelector(".users-list-link")?.addEventListener("click", () => {
                this.onSelect(user);
            });
            li.querySelector(".users-list-action")?.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.onAction) {
                    this.onAction(user, li);
                } else {
                    this.onSelect(user);
                }
            });
            this.listEl.appendChild(li);
        });
    }
    close() {
        this.overlay?.close();
        this.overlay = null;
        if (UsersList.active === this) UsersList.active = null;
    }
}

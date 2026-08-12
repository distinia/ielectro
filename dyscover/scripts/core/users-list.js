import { EmptyState } from "./empty-state.js";
import { Overlay } from "./overlay.js";
import { Icons } from "./nesh.js";
import { App } from "./app.js";
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
        this.multiSelect = options.multiSelect === true;
        this.onSubmit = options.onSubmit || null;
        this.submitLabel = options.submitLabel || "Send";
        this.selected = new Map();
        this.overlay = null;
        this.listEl = null;
        this.searchEl = null;
        this.submitBtn = null;
    }
    async open() {
        UsersList.active?.close();
        this.overlay = new Overlay(this.title);
        await this.overlay.open();
        UsersList.active = this;
        const body = this.overlay.panel;
        body.innerHTML = `
            ${this.hint ? `<p class="users-list-hint">${this.hint}</p>` : ""}
            ${this.searchable ? `<input type="search" class="input users-list-search" placeholder="Search username…" autocomplete="off">` : ""}
            <ul class="users-list-items"></ul>
            ${this.multiSelect ? `<div class="users-list-footer"><button type="button" class="btn users-list-submit" disabled>${this.submitLabel}</button></div>` : ""}`;
        this.listEl = body.querySelector(".users-list-items");
        this.searchEl = body.querySelector(".users-list-search");
        this.submitBtn = body.querySelector(".users-list-submit");
        this.submitBtn?.addEventListener("click", () => {
            if (!this.selected.size || !this.onSubmit) return;
            this.onSubmit(Array.from(this.selected.values()));
        });
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
            this.listEl.innerHTML = `<li class="users-list-empty">${EmptyState.html(EmptyState.usersList(term))}</li>`;
            await Icons.load(this.listEl);
            return;
        }
        this.listEl.innerHTML = "";
        users.forEach((user) => {
            const li = document.createElement("li");
            li.className = "users-list-item";
            li.dataset.username = user.username;
            const avatar = App.peerAvatarUrl(user.username, user.avatar);
            const picked = this.selected.has(user.username);
            if (picked) {
                li.classList.add("is-selected");
            }
            const label =
                typeof this.actionLabel === "function"
                    ? this.actionLabel(user)
                    : this.actionLabel;
            const actionClass =
                label === "Follow back"
                    ? "users-list-action users-list-action--follow-back"
                    : "users-list-action";
            li.innerHTML = this.multiSelect
                ? `<button type="button" class="users-list-link">
                    <span class="users-list-check" aria-hidden="true"></span>
                    <img class="users-list-avatar" src="${avatar}" alt="" loading="lazy">
                    <span class="users-list-name">${user.username}</span>
                </button>`
                : `<button type="button" class="users-list-link">
                    <img class="users-list-avatar" src="${avatar}" alt="" loading="lazy">
                    <span class="users-list-name">${user.username}</span>
                </button>
                ${label ? `<button type="button" class="${actionClass}">${label}</button>` : ""}`;
            li.querySelector(".users-list-link")?.addEventListener("click", () => {
                if (this.multiSelect) {
                    this.toggleSelected(user, li);
                    return;
                }
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
        this.updateSubmitButton();
    }
    toggleSelected(user, li) {
        const key = user.username;
        if (!key) return;
        if (this.selected.has(key)) {
            this.selected.delete(key);
            li.classList.remove("is-selected");
        } else {
            this.selected.set(key, user);
            li.classList.add("is-selected");
        }
        this.updateSubmitButton();
    }
    updateSubmitButton() {
        if (!this.submitBtn) return;
        const count = this.selected.size;
        this.submitBtn.disabled = count === 0;
        this.submitBtn.textContent =
            count > 0 ? `${this.submitLabel} (${count})` : this.submitLabel;
    }
    close() {
        this.overlay?.close();
        this.overlay = null;
        this.submitBtn = null;
        this.selected.clear();
        if (UsersList.active === this) UsersList.active = null;
    }
}

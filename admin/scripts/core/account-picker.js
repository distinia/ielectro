import { App, Api, Request } from "./index.js";

export class AccountPicker {
    constructor(root) {
        this.root = root;
        this.hidden = root.querySelector('[name="account_id"]');
        this.search = root.querySelector(".account-picker-search");
        this.results = root.querySelector(".account-picker-results");
        this.selected = root.querySelector(".account-picker-selected");
        this.onSelect = null;
        this.onClear = null;
        this.timer = null;
        this.bind();
    }

    bind() {
        this.search?.addEventListener("input", () => {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.lookup(), 220);
        });
        this.results?.addEventListener("click", (e) => {
            const row = e.target.closest("[data-account-id]");
            if (!row) return;
            this.pick({
                id: Number(row.dataset.accountId),
                username: row.dataset.username || "",
                email: row.dataset.email || "",
                name: row.dataset.name || "",
            });
        });
        this.selected?.addEventListener("click", (e) => {
            if (e.target.closest("[data-clear-account]")) {
                this.clear();
            }
        });
    }

    async lookup() {
        const q = this.search?.value.trim() || "";
        if (q.length < 2) {
            if (this.results) this.results.innerHTML = "";
            return;
        }
        try {
            const res = await Request.get("accounts", { q });
            const rows = Api.list(res);
            if (!rows.length) {
                this.results.innerHTML = `<p class="account-picker-empty">No accounts found.</p>`;
                return;
            }
            this.results.innerHTML = rows
                .map(
                    (row) => `
                <button type="button" class="account-picker-option" data-account-id="${App.esc(String(row.id))}" data-username="${App.esc(row.username)}" data-email="${App.esc(row.email)}" data-name="${App.esc(row.name || row.username)}">
                    <strong>@${App.esc(row.username)}</strong>
                    <span>${App.esc(row.email)}</span>
                </button>`,
                )
                .join("");
        } catch {
            this.results.innerHTML = `<p class="account-picker-empty">Search failed.</p>`;
        }
    }

    pick(account) {
        if (!account?.id) return;
        if (this.hidden) this.hidden.value = String(account.id);
        if (this.selected) {
            this.selected.innerHTML = `
                <div class="account-picker-chip">
                    <div>
                        <strong>@${App.esc(account.username)}</strong>
                        <span>${App.esc(account.email)}</span>
                    </div>
                    <button type="button" data-clear-account aria-label="Remove">×</button>
                </div>`;
        }
        if (this.results) this.results.innerHTML = "";
        if (this.search) this.search.value = account.username;
        this.onSelect?.(account);
    }

    clear() {
        if (this.hidden) this.hidden.value = "";
        if (this.selected) this.selected.innerHTML = "";
        if (this.search) this.search.value = "";
        if (this.results) this.results.innerHTML = "";
        this.onClear?.();
    }

    setAccountId(id, meta = {}) {
        if (!id) {
            this.clear();
            return;
        }
        this.pick({
            id: Number(id),
            username: meta.username || String(id),
            email: meta.email || "",
            name: meta.name || meta.username || "",
        });
    }
}

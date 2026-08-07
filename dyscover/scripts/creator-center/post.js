import { Api } from "../core/api.js";
import { App, Alert, Card, EmptyState, Icons, Request } from "../core/index.js";

export class Post {
    static type = "";
    static list = new Map();
    static table = "";

    constructor(element, item = {}) {
        this.element = element;
        this.item = item;
        this.title = item.title;
        this.id = item.id;
        this.checked = false;
        if (!element) return;
        this.constructor.list.set(this.element, this);
    }

    static async loadTable() {
        const table = document.querySelector(this.table);
        if (!table) return;
        const tbody = table.querySelector("tbody");
        try {
            const userId = await App.resolveSelfUserId();
            if (!userId) {
                throw new Error("Missing user id");
            }
            const res = await Request.get(Api.userPosts(userId));
            const items = Api.list(res).filter(
                (item) => String(item.type) === this.type,
            );
            tbody.innerHTML = "";
            this.list.clear();
            if (!items.length) {
                const copy = EmptyState.creatorType(this.type);
                tbody.innerHTML = `<tr class="table-empty-row"><td colspan="4">${EmptyState.html({ ...copy, compact: true })}</td></tr>`;
                EmptyState.bindAction(tbody, () => this.create());
                await Icons.load(tbody);
                return;
            }
            items.forEach((item) => {
                const row = document.createElement("tr");
                const post = new this(row, item);
                tbody.appendChild(post.loadRow());
            });
            this.bindTable(table);
        } catch {
            const copy = EmptyState.creatorType(this.type);
            tbody.innerHTML = `<tr class="table-empty-row"><td colspan="4">${EmptyState.html({ ...copy, compact: true })}</td></tr>`;
            EmptyState.bindAction(tbody, () => this.create());
            await Icons.load(tbody);
        }
    }

    static bindTable(table) {
        const checkAll = table.querySelector(".check-all");
        if (checkAll) {
            checkAll.onchange = () => {
                if (checkAll.checked) {
                    const rows = Array.from(this.list.values());
                    rows.forEach((entry, index) => {
                        entry.setChecked(index === 0);
                    });
                    if (rows[0]) {
                        this.selectExclusive(rows[0]);
                    }
                } else {
                    this.list.forEach((post) => post.setChecked(false));
                }
            };
        }
        this.list.forEach((post) => {
            post.element.addEventListener("click", (event) => {
                if (event.target.closest("input, label, button, a")) return;
                this.selectExclusive(post);
                post.view();
            });
            const checkbox = post.element.querySelector("input[type='checkbox']");
            checkbox?.addEventListener("click", (event) => {
                event.stopPropagation();
            });
            checkbox?.addEventListener("change", (event) => {
                if (event.target.checked) {
                    this.selectExclusive(post);
                } else {
                    post.setChecked(false);
                    this.syncCheckAll(table);
                }
            });
        });
    }

    static selectExclusive(activePost) {
        this.list.forEach((entry) => {
            entry.setChecked(entry === activePost);
        });
        const table = activePost.element?.closest("table");
        this.syncCheckAll(table);
    }

    static syncCheckAll(table) {
        if (!table) return;
        const checkAll = table.querySelector(".check-all");
        if (!checkAll) return;
        const rows = Array.from(this.list.values());
        checkAll.checked = rows.length > 0 && rows.every((post) => post.checked);
        checkAll.indeterminate =
            rows.some((post) => post.checked) &&
            !rows.every((post) => post.checked);
    }

    setChecked(value) {
        this.checked = !!value;
        const input = this.element?.querySelector("input[type='checkbox']");
        if (input) input.checked = this.checked;
        this.element?.classList.toggle("row-selected", this.checked);
    }

    static getSelected() {
        const selected = [];
        this.list.forEach((post) => {
            const input = post.element?.querySelector("input[type='checkbox']");
            if (input?.checked) {
                post.checked = true;
                selected.push(post);
            } else {
                post.checked = false;
            }
        });
        return selected;
    }

    loadRow() {
        this.element.className = "item-row";
        this.element.innerHTML = `
            <td><input type="checkbox" class="input-check row-check"></td>
            <td class="item-name">${App.escapeHtml(this.item.title || "Untitled")}</td>
            <td class="item-created">${App.escapeHtml(this.item.created_at || "—")}</td>
            <td class="item-updated">${App.escapeHtml(this.item.updated_at || "—")}</td>
        `;
        return this.element;
    }

    static create() {
        new this(null, {}).box("POST");
    }

    edit() {
        this.box("PUT");
    }

    async view() {
        const card = new Card(App.enrichPost(this.item));
        await card.openOverlay();
    }

    async delete(options = {}) {
        if (!options.skipConfirm) {
            const confirm = await Alert.confirm(
                `Delete "${this.title || "this item"}"?`,
            );
            if (!confirm) return false;
        }
        if (!this.id) {
            Alert.error("Missing item id");
            return false;
        }
        try {
            await Request.delete(Api.post(this.id));
            this.element?.remove();
            if (this.element) {
                this.constructor.list.delete(this.element);
            }
            return true;
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Delete failed");
            return false;
        }
    }

    box() {}
}

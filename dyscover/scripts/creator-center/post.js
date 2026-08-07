import { Api } from "../core/api.js";
import { App, Alert, EmptyState, Icons, Request } from "../core/index.js";

export class Post {
    static type = "";
    static list = new Map();
    static table = "";
    static tab = "";

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
                this.list.forEach((post) => {
                    post.checked = checkAll.checked;
                    post.element.querySelector("input").checked = checkAll.checked;
                });
            };
        }
        this.list.forEach((post) => {
            post.element.onmouseenter = () => {
                post.element.classList.add("selected-row");
            };
            post.element.onmouseleave = () => {
                post.element.classList.remove("selected-row");
            };
            post.element.querySelector("input").onchange = (e) => {
                post.checked = e.target.checked;
            };
        });
    }

    static getSelected() {
        const selected = [];
        this.list.forEach((post) => {
            if (post.checked) selected.push(post);
        });
        return selected;
    }

    loadRow() {
        this.element.className = "item-row";
        this.element.innerHTML = `
            <td><input type="checkbox" class="input-check"></td>
            <td class="item-name">${this.item.title || ""}</td>
            <td class="item-created">${this.item.created_at || ""}</td>
            <td class="item-updated">${this.item.updated_at || ""}</td>
        `;
        return this.element;
    }

    static create() {
        new this(null, {}).box("POST");
    }

    edit() {
        this.box("PUT");
    }

    async delete() {
        const confirm = await Alert.confirm(`Delete ${this.title}?`);
        if (!confirm) return;
        try {
            await Request.delete(Api.post(this.id));
            Alert.success("Deleted");
            this.element.remove();
            this.constructor.list.delete(this.element);
            if (!this.constructor.list.size) {
                await this.constructor.loadTable();
            }
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Delete failed");
        }
    }

    box() {}
}

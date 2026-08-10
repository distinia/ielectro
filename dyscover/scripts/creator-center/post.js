import { Api } from "../core/api.js";
import { App, Alert, Card, EmptyState, Icons, Request } from "../core/index.js";

export class Post {
    static type = "";
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

    static renderTable(allPosts = []) {
        const table = document.querySelector(this.table);
        if (!table) return;
        const tbody = table.querySelector("tbody");
        const items = allPosts.filter(
            (item) => String(item.type) === this.type,
        );
        tbody.innerHTML = "";
        this.list.clear();
        if (!items.length) {
            const copy = EmptyState.creatorType(this.type);
            tbody.innerHTML = `<tr class="table-empty-row"><td colspan="4">${EmptyState.html({ ...copy, compact: true })}</td></tr>`;
            EmptyState.bindAction(tbody, () => this.create());
            Icons.load(tbody);
            return;
        }
        items.forEach((item) => {
            const row = document.createElement("tr");
            const post = new this(row, item);
            tbody.appendChild(post.loadRow());
        });
        this.bindTable(table);
        Icons.load(tbody);
    }

    static async loadTable() {
        const { CreatorRegistry } = await import("./registry.js");
        if (CreatorRegistry.loaded) {
            this.renderTable(CreatorRegistry.posts);
            await CreatorRegistry.applySearch();
            return;
        }
        await CreatorRegistry.loadAll();
    }

    static bindTable(table) {
        const checkAll = table.querySelector(".check-all");
        if (checkAll) {
            checkAll.onchange = () => {
                this.list.forEach((post) => post.setChecked(checkAll.checked));
                this.syncCheckAll(table);
            };
        }
        this.list.forEach((post) => {
            post.element.addEventListener("click", (event) => {
                if (event.target.closest("input, label, button, a")) return;
                post.view();
            });
            const checkbox = post.element.querySelector("input[type='checkbox']");
            checkbox?.addEventListener("click", (event) => {
                event.stopPropagation();
            });
            checkbox?.addEventListener("change", (event) => {
                post.setChecked(event.target.checked);
                this.syncCheckAll(table);
            });
        });
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
            if (!post.element || post.element.classList.contains("table-empty-row")) {
                return;
            }
            const input = post.element.querySelector("input[type='checkbox']");
            if (input?.checked || post.checked) {
                post.setChecked(true);
                selected.push(post);
                return;
            }
            post.setChecked(false);
        });
        return selected;
    }

    loadRow() {
        const archived = String(this.item.status || "active") === "hidden";
        this.element.className = archived
            ? "item-row item-row--archived"
            : "item-row";
        this.element.innerHTML = `
            <td><input type="checkbox" class="input-check row-check"></td>
            <td class="item-name">${this.nameCellHtml()}</td>
            <td class="item-created">${App.escapeHtml(this.item.created_at || "—")}</td>
            <td class="item-updated">${App.escapeHtml(this.item.updated_at || "—")}</td>
        `;
        return this.element;
    }

    nameCellHtml() {
        const archived = String(this.item.status || "active") === "hidden";
        const title = App.escapeHtml(this.item.title || "Untitled");
        const badge = archived
            ? `<span class="item-archived-mark" title="Archived"><i data-icon="archive"></i></span>`
            : "";
        return `<span class="item-name-inner">${badge}<span class="item-name-text">${title}</span></span>`;
    }

    static create() {
        import("./creator-editor.js").then(({ CreatorEditor }) => {
            CreatorEditor.open(new this(null, {}), "POST");
        });
    }

    edit() {
        import("./creator-editor.js").then(({ CreatorEditor }) => {
            CreatorEditor.open(this, "PUT");
        });
    }

    async view() {
        const card = new Card(App.enrichPost(this.item));
        await card.openOverlay();
    }

    isArchived() {
        return String(this.item.status || "active") === "hidden";
    }

    async archive(options = {}) {
        const wasArchived = this.isArchived();
        const nextStatus = wasArchived ? "active" : "hidden";
        if (!options.skipConfirm) {
            const confirm = await Alert.confirm(
                wasArchived
                    ? `Restore "${this.title || "this item"}"? It will be visible again on your profile and feeds.`
                    : `Archive "${this.title || "this item"}"? It will be hidden from your profile and feeds.`,
            );
            if (!confirm) return false;
        }
        if (!this.id) {
            Alert.error("Missing item id");
            return false;
        }
        try {
            await Request.patch(Api.post(this.id), { status: nextStatus });
            this.item.status = nextStatus;
            this.loadRow();
            await Icons.load(this.element);
            return true;
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Archive failed");
            return false;
        }
    }

    async delete(options = {}) {
        if (!options.skipConfirm) {
            const confirm = await Alert.confirm(
                `Delete "${this.title || "this item"}" permanently? Files and data will be removed.`,
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

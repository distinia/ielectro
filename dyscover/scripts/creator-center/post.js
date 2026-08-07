import { Alert, Request } from "../core/index.js";
export class Post {
    static type = "";
    static list = new Map();
    static table = "";
    static tab = "";
    static loadApi = "";
    static createApi = "";
    static editApi = "";
    static deleteApi = "";
    static params = {};
    constructor(element, item) {
        if (!element) return;
        this.element = element;
        this.item = item;
        this.title = item.title;
        this.checked = false;
        this.constructor.list.set(this.element, this);
    }
    static async loadTable() {
        const table = document.querySelector(this.table);
        if (!table) return;
        const tbody = table.querySelector("tbody");
        try {
            const res = await Request.get(this.loadApi, this.params);
            tbody.innerHTML = "";
            this.list.clear();
            res.data.forEach(item => {
                const row = document.createElement("tr");
                const post = new this(row, item);
                tbody.appendChild(post.loadRow());
            });
            this.bindTable(table);
        } catch (e) {
            Alert.error(e.text);
        }
    }
    static bindTable(table) {
        const checkAll = table.querySelector(".check-all");
        if (checkAll) {
            checkAll.onchange = () => {
                this.list.forEach(post => {
                    post.checked = checkAll.checked;
                    post.element.querySelector("input").checked = checkAll.checked;
                });
            };
        }
        this.list.forEach(post => {
            post.element.onmouseenter = () => {
                post.element.classList.add("selected-row");
            };
            post.element.onmouseleave = () => {
                post.element.classList.remove("selected-row");
            };
            post.element.querySelector("input").onchange = e => {
                post.checked = e.target.checked;
            };
        });
    }
    static getSelected() {
        const selected = [];
        this.list.forEach(post => {
            if (post.checked) {
                selected.push(post);
            }
        });
        return selected;
    }
    loadRow() {
        this.element.className = "item-row";
        this.element.innerHTML = `
            <td><input type="checkbox"></td>
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
            const res = await Request.delete(
                this.constructor.deleteApi,
                {
                    title: this.title,
                    ...this.constructor.params
                }
            );
            Alert.success(res.text);
            this.element.remove();
            this.constructor.list.delete(this.element);
        } catch (e) {
            Alert.error(e.text);
        }
    }
    async updateRow() {
        try {
            const res = await Request.get(
                this.constructor.loadApi,
                {
                    title: this.title,
                    ...this.constructor.params
                }
            );
            const item = res.data[0];
            if (!item) return;
            this.item = item;
            this.title = item.title;
            this.loadRow();
        } catch (e) {
            Alert.error(e.text);
        }
    }
    mediaPreview() {
        const preview = document.querySelector(".file-preview");
        const input = document.querySelector("#media");
        if (!preview || !input) return;
        input.onchange = () => {
            const file = input.files[0];
            if (!file) {
                preview.innerHTML = "";
                return;
            }
            const url = URL.createObjectURL(file);
            if (file.type.startsWith("image")) {
                preview.innerHTML = `<img src="${url}">`;
            }
            if (file.type.startsWith("video")) {
                preview.innerHTML = `<video controls src="${url}"></video>`;
            }
            if (file.type.startsWith("audio")) {
                preview.innerHTML = `<audio controls src="${url}"></audio>`;
            }
            if (file.type === "application/pdf") {
                preview.innerHTML = `<iframe src="${url}"></iframe>`;
            }
        };
    }
    box() {
    }
}

import { App, Alert, Box, Icons, FormValidator, Request } from "./app.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    classes.forEach(Class => Class.loadTable());
    new Table();
    new Search();
    document.querySelector(".create")?.addEventListener("click", () => {
        const Class = Table.getActiveClass();
        if (Class) {
            Class.create();
        }
    });
    document.querySelector(".edit")?.addEventListener("click", () => {
        const Class = Table.getActiveClass();
        if (!Class) return;
        const selected = Class.getSelected();
        if (selected.length !== 1) {
            return Alert.error("Select exactly one item");
        }
        selected[0].edit();
    });
    document.querySelector(".delete")?.addEventListener("click", async () => {
        const Class = Table.getActiveClass();
        if (!Class) return;
        const selected = Class.getSelected();
        if (!selected.length) {
            return Alert.error("Select at least one item");
        }
        for (const post of selected) {
            await post.delete();
        }
    });
    await Icons.load();
});
class Search {
    constructor() {
        this.input = document.querySelector(".search-item");
        if (!this.input) return;
        this.timer = null;
        this.input.oninput = () => {
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                this.search(this.input.value);
            }, 300);
        };
    }
    search(value) {
        const term = value.toLowerCase();
        classes.forEach(Class => {
            Class.list.forEach(post => {
                const title = String(post.title || "").toLowerCase();
                const tags = String(post.item.tags || "").toLowerCase();
                post.element.style.display =
                    !term || title.includes(term) || tags.includes(term)
                        ? ""
                        : "none";
            });
        });
    }
}
class Table {
    constructor() {
        this.tabs();
        this.sort();
    }
    tabs() {
        document.querySelectorAll(".tab").forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll(".tab").forEach(t => t.classList.remove("active-tab"));
                document.querySelectorAll(".section").forEach(section => {
                    section.style.display = "none";
                    section.classList.remove("active-section");
                });
                tab.classList.add("active-tab");
                const section = document.querySelector(
                    "." + tab.classList[1].replace("-tab", "-section")
                );
                if (!section) return;
                section.style.display = "block";
                requestAnimationFrame(() => {
                    section.classList.add("active-section");
                });
            };
        });
        document.querySelector(".article-tab")?.click();
    }
    sort() {
        document.querySelectorAll(".table").forEach(table => {
            table.querySelectorAll("thead th").forEach((th, index) => {
                if (index === 0) return;
                const button = document.createElement("div");
                button.className = "sort";
                button.innerHTML = `<i data-icon="arrow-down-up"></i>`;
                th.appendChild(button);
                button.onclick = () => Table.sort(table, index);
            });
        });
    }
    static sort(table, index) {
        const tbody = table.querySelector("tbody");
        const rows = Array.from(tbody.children);
        rows.sort((a, b) => {
            const A = a.children[index].innerText;
            const B = b.children[index].innerText;
            return A.localeCompare(B);
        });
        rows.forEach(row => tbody.appendChild(row));
    }
    static getActiveClass() {
        const tab = document.querySelector(".active-tab");
        if (!tab) return null;
        return classes.find(
            Class => Class.tab === "." + tab.classList[1]
        );
    }
}
class Post {
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
class Article extends Post {
    static type = "article";
    static table = ".article-table";
    static tab = ".article-tab";
    static loadApi = "https://dyscover.ielectro.com/api/article/user";
    static createApi = "https://dyscover.ielectro.com/api/article/create";
    static editApi = "https://dyscover.ielectro.com/api/article/edit";
    static deleteApi = "https://dyscover.ielectro.com/api/article/delete";
    static create() {
        new this(null, {}).box("POST");
    }
    box(method) {
        this.method = method;
        this.box = new Box(
            method === "POST" ? "Create Article" : "Edit Article"
        );
        this.box.create();
        this.box.body(body => {
            body.innerHTML = `
            <form id="article-form">
                <input name="title" placeholder="Enter title" value="${this.item.title || ""}">
                <textarea name="description">${this.item.description || ""}</textarea>
                <textarea name="tags">${this.item.tags || ""}</textarea>
            </form>`;
        });
        this.box.footer(f => {
            f.innerHTML = `
            <button form="article-form">
                ${method === "POST" ? "Create" : "Update"}
            </button>`;
        });
        const form = document.querySelector("#article-form");
        form.onsubmit = async e => {
            e.preventDefault();
            const validator = new FormValidator("article-form");
            if (!(await validator.validate())) {
                return Alert.error(validator.message);
            }
            const data = new FormData(form);
            let url = Article.createApi;
            if (method === "PUT") {
                data.append("oldTitle", this.title);
                url = Article.editApi;
            }
            try {
                const res = await Request.post(url, data);
                Alert.success(res.text);
                this.box.close();
                Article.loadTable();
            } catch(e) {
                Alert.error(e.text);
            }
        };
    }
}
class Image extends Post {
    static type = "image";
    static table = ".image-table";
    static tab = ".image-tab";
    static loadApi = "https://dyscover.ielectro.com/api/media/user";
    static createApi = "https://dyscover.ielectro.com/api/media/create";
    static editApi = "https://dyscover.ielectro.com/api/media/edit";
    static deleteApi = "https://dyscover.ielectro.com/api/media/delete";
    static params = {
        type: "image"
    };
    static create() {
        new this(null, {}).box("POST");
    }
    box(method) {
        this.method = method;
        this.box = new Box(
            method === "POST" ? "Upload Image" : "Edit Image"
        );
        this.box.create();
        this.box.body(body => {
            body.innerHTML = `
            <form id="media-form" enctype="multipart/form-data">
                <input name="title" value="${this.item.title || ""}">
                <textarea name="description">${this.item.description || ""}</textarea>
                <textarea name="tags">${this.item.tags || ""}</textarea>
                <label>
                    Select file
                    <input type="file" id="media" name="media" hidden>
                </label>
                <div class="file-preview"></div>
            </form>`;
        });
        this.box.footer(f => {
            f.innerHTML = `
            <button form="media-form">
                ${method === "POST" ? "Upload" : "Update"}
            </button>`;
        });
        this.mediaPreview();
        this.submitMedia();
    }
    submitMedia() {
        const form = document.querySelector("#media-form");
        form.onsubmit = async e => {
            e.preventDefault();
            const validator = new FormValidator("media-form");
            if (!(await validator.validate())) {
                return Alert.error(validator.message);
            }
            const data = new FormData(form);
            data.append("type", this.constructor.type);
            let url = this.constructor.createApi;
            if (this.method === "PUT") {
                data.append("oldTitle", this.title);
                url = this.constructor.editApi;
            }
            try {
                const res = await Request.post(url, data);
                Alert.success(res.text);
                this.box.close();
                this.constructor.loadTable();
            } catch(e) {
                Alert.error(e.text);
            }
        };
    }
}
class Video extends Image {
    static type = "video";
    static table = ".video-table";
    static tab = ".video-tab";
    static params = {
        type: "video"
    };
}
class Audio extends Image {
    static type = "audio";
    static table = ".audio-table";
    static tab = ".audio-tab";
    static params = {
        type: "audio"
    };
}
class Document extends Image {
    static type = "document";
    static table = ".document-table";
    static tab = ".document-tab";
    static params = {
        type: "document"
    };
}
class Template extends Post {
    static type = "template";
    static table = ".template-table";
    static tab = ".template-tab";
    static loadApi = "https://dyscover.ielectro.com/api/template/user";
    static createApi = "https://dyscover.ielectro.com/api/template/create";
    static editApi = "https://dyscover.ielectro.com/api/template/edit";
    static deleteApi = "https://dyscover.ielectro.com/api/template/delete";
    static create() {
        new this(null, {}).box("POST");
    }
    box(method) {
        this.method = method;
        this.box = new Box(
            method === "POST" ? "Create Template" : "Edit Template"
        );
        this.box.create();
        this.box.body(body => {
            body.innerHTML = `
            <form id="template-form">
                <div class="select-item-column">
                    <b>Title</b>
                    <input name="title" value="${this.item.title || ""}">
                    <b>Image</b>
                    <input name="image" value="${this.item.media || ""}">
                    <b>Description</b>
                    <textarea name="description">${this.item.description || ""}</textarea>
                    <b>Categories</b>
                    <textarea name="tags">${this.item.tags || ""}</textarea>
                </div>
                <div class="select-item-column">
                    <b>Fields</b>
                    <div class="field-inputs">
                        <input class="field-input" placeholder="Field name">
                        <select class="field-type">
                            <option value="Text">Text</option>
                            <option value="Definition">Definition</option>
                            <option value="Image">Small image</option>
                            <option value="LargeImage">Large image</option>
                            <option value="DoubleImage">Double image</option>
                            <option value="DoubleColumn">Double column</option>
                            <option value="DoubleColumnExtended">Double column extension</option>
                        </select>
                        <button class="field-add">+</button>
                    </div>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody class="field-list"></tbody>
                    </table>
                </div>
            </form>`;
        });
        this.box.footer(f => {
            f.innerHTML = `
            <button form="template-form">
                ${method === "POST" ? "Create" : "Update"}
            </button>`;
        });
        App.disableAutocomplete();
        this.form = document.querySelector("#template-form");
        this.fields();
        if (method === "PUT" && this.item.url) {
            this.loadFields();
        }
        this.submit();
    }
    fields() {
        const button = this.form.querySelector(".field-add");
        const input = this.form.querySelector(".field-input");
        const select = this.form.querySelector(".field-type");
        const list = this.form.querySelector(".field-list");
        button.onclick = e => {
            e.preventDefault();
            const name = input.value.trim();
            if (!name) return;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td data-name="${name}">
                    ${name}
                </td>
                <td data-type="${select.value}">
                    ${select.options[select.selectedIndex].text}
                </td>
                <td>
                    <button class="field-remove">X</button>
                    <button class="field-up">↑</button>
                    <button class="field-down">↓</button>
                </td>
            `;
            list.appendChild(row);
            row.querySelector(".field-remove").onclick = () => {
                row.remove();
            };
            row.querySelector(".field-up").onclick = () => {
                const prev = row.previousElementSibling;
                if (prev) {
                    row.parentNode.insertBefore(row, prev);
                }
            };
            row.querySelector(".field-down").onclick = () => {
                const next = row.nextElementSibling;
                if (next) {
                    row.parentNode.insertBefore(next, row);
                }
            };
            input.value = "";
            select.selectedIndex = 0;
        };
    }
    async loadFields() {
        try {
            const data = await Request.get(
                this.item.url + "?t=" + Date.now()
            );
            const list = this.form.querySelector(".field-list");
            list.innerHTML = "";
            data.forEach(field => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td data-name="${field.name}">
                        ${field.name}
                    </td>
                    <td data-type="${field.type}">
                        ${field.type}
                    </td>
                    <td>
                        <button class="field-remove">X</button>
                        <button class="field-up">↑</button>
                        <button class="field-down">↓</button>
                    </td>
                `;
                list.appendChild(row);
                row.querySelector(".field-remove").onclick = () => row.remove();
                row.querySelector(".field-up").onclick = () => {
                    const prev = row.previousElementSibling;
                    if (prev) {
                        row.parentNode.insertBefore(row, prev);
                    }
                };
                row.querySelector(".field-down").onclick = () => {
                    const next = row.nextElementSibling;
                    if (next) {
                        row.parentNode.insertBefore(next, row);
                    }
                };
            });
        } catch(e) {
            Alert.error(e.text);
        }
    }
    getFields() {
        return Array.from(
            this.form.querySelectorAll(".field-list tr")
        ).map(row => ({
            name: row.querySelector("[data-name]").dataset.name,
            type: row.querySelector("[data-type]").dataset.type
        }));
    }
    submit() {
        this.form.onsubmit = async e => {
            e.preventDefault();
            const validator = new FormValidator("template-form");
            if (!(await validator.validate())) {
                return Alert.error(validator.message);
            }
            const data = new FormData(this.form);
            data.append(
                "fields",
                JSON.stringify(this.getFields())
            );
            let url = this.constructor.createApi;
            if (this.method === "PUT") {
                data.append("oldTitle", this.title);
                url = this.constructor.editApi;
            }
            try {
                const res = await Request.post(url, data);
                Alert.success(res.text);
                this.box.close();
                this.constructor.loadTable();
            } catch(e) {
                Alert.error(e.text);
            }
        };
    }
}
const classes = [
    Article,
    Image,
    Video,
    Audio,
    Document,
    Template
];
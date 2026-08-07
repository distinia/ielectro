import { App, Alert, Box, Request, FormValidator } from "../core/index.js";
import { Post } from "./post.js";
import { Image } from "./image.js";
export class Template extends Post {
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

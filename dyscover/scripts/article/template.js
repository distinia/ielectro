import { Alert, Box } from "../core/index.js";
import { API } from "./api.js";
import { Select } from "./select.js";
import { Menu } from "./menu.js";
import { WebSelector } from "./web-selector.js";
import { Media } from "./media.js";
export class Template {
    static list = new Map();
    static className = "template";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.title = element.dataset.title || "";
        this.tbody = element.querySelector("tbody");
        this.menuActions = [
            { name: "Open", action: this.open },
            { name: "Delete", action: this.delete },
        ];
        this.menu = new Menu(this);
        Template.list.set(this.element, this);
    }
    static async init() {
        let table = document.querySelector("." + Template.className);
        let title;
        if (!table) {
            title = await WebSelector.init("dyscover", "template");
            if (!title) return;
            table = Template.create(title);
            const content = Select.container();
            if (!content) return;
            const titleElement = content.querySelector(".title");
            if (titleElement) {
                titleElement.after(table);
            } else {
                content.prepend(table);
            }
        }
        const instance = new Template(table);
        instance.open();
    }
    static create(title) {
        const table = document.createElement("table");
        table.classList.add(Template.className);
        table.dataset.title = title;
        table.contentEditable = false;
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.colSpan = 2;
        const ul = document.createElement("ul");
        ul.classList.add("template-cell-info");
        const li = document.createElement("li");
        li.innerHTML = "<br>";
        ul.appendChild(li);
        th.appendChild(ul);
        tr.appendChild(th);
        thead.appendChild(tr);
        const tbody = document.createElement("tbody");
        table.appendChild(thead);
        table.appendChild(tbody);
        return table;
    }
    static generate(obj) {
        const element = Template.create(obj.title);
        const instance = new Template(element);
        obj.fields?.forEach(field=>{
            let result = null;
            switch(field.type) {
                case "text":
                    result = instance.textRow(field.name);
                    break;
                case "definition":
                    result = instance.textRow(field.name, true);
                    break;
                case "image":
                    result = instance.imageRow(field.name, field.url);
                    break;
                case "large-image":
                    result = instance.imageRow(field.name, field.url, true);
                    break;
                case "double-image":
                    result = instance.doubleImageRow(field.name, field.urls[0], field.urls[1]);
                    break;
                case "double-column":
                case "double-column-extended":
                    result = instance.doubleColumnRow(field.name, [[field.left, field.right]]);
                    break;
            }
            if (result) {
                instance.insertRow(result.row, field.name);
            }
        });
        return instance;
    }
    export() {
        const fields = [];
        this.element.querySelectorAll("tbody tr[data-field]").forEach(row=>{
            const label = row.querySelector(".template-cell-label")?.innerText || row.dataset.field;
            const images = [...row.querySelectorAll("img")].map(img=>img.src);
            if (images.length) {
                fields.push({
                    name: label,
                    type: images.length > 1 ? "double-image" : "image",
                    urls: images
                });
                return;
            }
            const lists = [...row.querySelectorAll(".template-cell-info")].map(list=>{
                return [...list.querySelectorAll("li")].map(li=>li.innerHTML);
            });
            fields.push({
                name: label,
                type: row.querySelector("b") ? "definition" : "text",
                content: lists.length === 1 ? lists[0] : lists
            });
        });
        return {
            element: Template.className,
            title: this.element.dataset.title || "",
            fields
        };
    }
    startEditing() {
        this.element.contentEditable = false;
        this.element.querySelectorAll(".template-cell-info").forEach((element) => {
            element.contentEditable = true;
        });
        this.menu?.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        this.element.querySelectorAll(".template-cell-info").forEach((element) => {
            element.contentEditable = false;
        });
        this.menu?.closeEditing();
    }
    async open() {
        try {
            this.fields = await API.getTemplate(this.title.replace(/ /g, "_"));
            const box = new Box("Template fields");
            await box.create();
            box.footer((footer) => {
                footer.innerHTML = `
                    <button class="button add">
                        Add field
                    </button>
                    <button class="button delete">
                        Delete template
                    </button>
                `;
                footer.querySelector(".add").onclick = () => {
                    this.addFields();
                };
                footer.querySelector(".delete").onclick = async () => {
                    const confirm = await Alert.confirm("Delete template");
                    if (!confirm) return;
                    this.delete();
                    box.close();
                };
            });
            box.body((body) => {
                this.fields.forEach((field) => {
                    this.renderField(body, field);
                });
            });
        } catch {
            Alert.error("Failed to load template");
        }
    }
    renderField(body, field) {
        const id = field.name.toLowerCase();
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = id;
        const label = document.createElement("label");
        label.textContent = field.name.replace(/-/g, " ");
        body.append(checkbox, label, document.createElement("br"));
        const exists = this.element.querySelector(`[data-field="${id}"]`);
        if (exists) {
            checkbox.checked = true;
        }
    }
    async addFields() {
        for (const field of this.fields) {
            const checkbox = document.querySelector("." + field.name.toLowerCase());
            if (!checkbox) continue;
            if (checkbox.checked) {
                const exists = this.element.querySelector(
                    `[data-field="${field.name.toLowerCase()}"]`,
                );
                if (!exists) {
                    await this.createField(field);
                }
                continue;
            }
            this.removeField(field.name);
        }
    }
    removeField(field) {
        const rows = this.tbody.querySelectorAll(
            `[data-field="${field.toLowerCase()}"]`,
        );
        rows.forEach((row) => row.remove());
    }
    async createField(field) {
        let result = null;
        switch (field.type) {
            case "image":
            case "large-image": {
                const url = await this.selectImage();
                if (!url) return;
                result = this.imageRow(field.name, url, field.type === "large-image");
                break;
            }
            case "double-image": {
                const url1 = await this.selectImage();
                const url2 = await this.selectImage();
                if (!url1 || !url2) return;
                result = this.doubleImageRow(field.name, url1, url2);
                break;
            }
            case "definition":
                result = this.textRow(field.name, true);
                break;
            case "text":
                result = this.textRow(field.name);
                break;
            case "double-column":
                result = this.doubleColumnRow(field.name);
                break;
            case "double-column-extended":
                result = this.doubleColumnRow(field.name, [["<br>", "<br>"]]);
                break;
        }
        if (!result) return;
        this.insertRow(result.row, field.name);
        result.row.querySelectorAll("img").forEach((img) => {
            new Media(img);
        });
    }
    async selectImage() {
        const option = await Alert.select("Select source", ["Dyscover", "URL"]);
        if (!option) return null;
        return await WebSelector.init(option.toLowerCase(), "image");
    }
    insertRow(row, field) {
        const names = this.fields.map((f) => f.name);
        const index = names.indexOf(field);
        for (let i = index + 1; i < names.length; i++) {
            const next = this.tbody.querySelector(
                `[data-field="${names[i].toLowerCase()}"]`,
            );
            if (next) {
                this.tbody.insertBefore(row, next);
                return;
            }
        }
        this.tbody.appendChild(row);
    }
    textRow(field, definition = false) {
        const row = document.createElement("tr");
        row.dataset.field = field.toLowerCase();
        if (definition) {
            const td = document.createElement("td");
            td.colSpan = 2;
            const title = document.createElement("b");
            title.textContent = field;
            const list = this.editableList();
            td.appendChild(title);
            td.appendChild(list);
            row.appendChild(td);
            return { row };
        }
        const th = document.createElement("th");
        th.classList.add("template-cell-label");
        th.textContent = field.replace(/-/g, " ");
        const td = document.createElement("td");
        td.appendChild(this.editableList());
        row.appendChild(th);
        row.appendChild(td);
        return { row };
    }
    imageRow(field, url, large = false) {
        const row = document.createElement("tr");
        row.dataset.field = field.toLowerCase();
        const td = document.createElement("td");
        td.colSpan = 2;
        if (large) {
            td.style.padding = "0";
        }
        const img = document.createElement("img");
        img.src = url;
        img.classList.add("template-image");
        img.style.width = large ? "100%" : "50%";
        td.appendChild(img);
        new Media(img);
        row.appendChild(td);
        return { row };
    }
    doubleImageRow(field, url1, url2) {
        const row = document.createElement("tr");
        row.dataset.field = field.toLowerCase();
        const td = document.createElement("td");
        td.colSpan = 2;
        const img1 = document.createElement("img");
        img1.src = url1;
        img1.classList.add("template-image");
        const img2 = document.createElement("img");
        img2.src = url2;
        img2.classList.add("template-image");
        td.appendChild(img1);
        td.appendChild(img2);
        new Media(img1);
        new Media(img2);
        row.appendChild(td);
        return { row };
    }
    doubleColumnRow(field, rows = [["<br>", "<br>"]]) {
        const row = document.createElement("tr");
        row.dataset.field = field.toLowerCase();
        const left = this.editableList(false);
        const right = this.editableList(false);
        rows.forEach(([l, r]) => {
            left.appendChild(this.li(l));
            right.appendChild(this.li(r));
        });
        const tdLeft = document.createElement("td");
        const tdRight = document.createElement("td");
        tdLeft.appendChild(left);
        tdRight.appendChild(right);
        row.appendChild(tdLeft);
        row.appendChild(tdRight);
        return { row };
    }
    editableList(defaultItem = true) {
        const ul = document.createElement("ul");
        ul.classList.add("template-cell-info");
        if (defaultItem) {
            ul.appendChild(this.li());
        }
        return ul;
    }
    li(content = "<br>") {
        const li = document.createElement("li");
        li.innerHTML = content;
        return li;
    }
    delete() {
        this.menu?.closeEditing();
        Template.list.delete(this.element);
        this.element.remove();
    }
}

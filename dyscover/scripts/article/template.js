import { Alert, Box } from "../core/index.js";
import { API } from "./api.js";
import { Select } from "./select.js";
import { Menu } from "./menu.js";
import { WebSelector } from "./web-selector.js";
import { ArticleHelp } from "./article-help.js";
import { Media } from "./media.js";
export class Template {
    static list = new Map();
    static className = "template";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.templateId = element.dataset.template || "";
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
        let templateId;
        if (!table) {
            const picked = await WebSelector.init("Dyscover", "template");
            templateId = picked?.url;
            if (!templateId) return;
            table = Template.create(templateId);
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
    static create(templateId) {
        const table = document.createElement("table");
        table.classList.add(Template.className);
        table.dataset.template = String(templateId);
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
        const element = Template.create(obj.template || obj.title);
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
                case "single-image":
                case "image":
                    result = instance.imageRow(field.name, field.url, false);
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
            const images = [...row.querySelectorAll("img")].map((img) => ({
                src: img.src,
                large: img.classList.contains("template-large-image"),
            }));
            if (images.length) {
                fields.push({
                    name: label,
                    type: images.length > 1 ? "double-image" : images[0].large ? "large-image" : "single-image",
                    urls: images.map((img) => img.src),
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
            template: this.element.dataset.template || "",
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
            this.fields = await API.getTemplate(this.templateId);
            if (!Array.isArray(this.fields) || !this.fields.length) {
                Alert.error("No fields found for this template");
                return;
            }
            this.syncImageClassesFromFields();
            const box = new Box("Template fields", {
                variant: "template",
                headerLayout: "creator",
                help: ArticleHelp.template,
            });
            await box.create();
            box.footer((footer) => {
                footer.innerHTML = `
                    <button type="button" class="button button-secondary template-cancel-btn">Cancel</button>
                    <button type="button" class="button add">Apply fields</button>
                    <button type="button" class="button delete">Delete template</button>
                `;
                footer.querySelector(".template-cancel-btn").onclick = () =>
                    box.close();
                footer.querySelector(".add").onclick = async () => {
                    await this.addFields(box.container);
                    this.syncImageClassesFromFields();
                    this.startEditing();
                    box.close();
                };
                footer.querySelector(".delete").onclick = async () => {
                    const confirm = await Alert.confirm("Delete template");
                    if (!confirm) return;
                    this.delete();
                    box.close();
                };
            });
            box.body((body) => {
                body.classList.add("template-fields-body");
                this.fields.forEach((field) => {
                    this.renderField(body, field);
                });
            });
        } catch {
            Alert.error("Failed to load template");
        }
    }
    renderField(body, field) {
        const slug = String(field.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
        const row = document.createElement("label");
        row.className = "template-field-row";
        row.htmlFor = `template-field-${field.id || slug}`;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `template-field-${field.id || slug}`;
        checkbox.className = "template-field-check";
        checkbox.dataset.fieldId = String(field.id || "");
        checkbox.dataset.fieldSlug = slug;
        const meta = document.createElement("span");
        meta.className = "template-field-meta";
        meta.innerHTML = `
            <strong>${field.name.replace(/-/g, " ")}</strong>
            <small>${String(field.type || "text").replace(/-/g, " ")}</small>`;
        row.append(checkbox, meta);
        body.appendChild(row);
        const exists = this.element.querySelector(`[data-field="${slug}"]`);
        if (exists) {
            checkbox.checked = true;
        }
    }
    async addFields(container) {
        for (const field of this.fields) {
            const slug = String(field.name || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-");
            const checkbox = container.querySelector(
                `[data-field-slug="${slug}"]`,
            );
            if (!checkbox) continue;
            if (checkbox.checked) {
                const exists = this.element.querySelector(
                    `[data-field="${slug}"]`,
                );
                if (!exists) {
                    await this.createField(field);
                }
                continue;
            }
            this.removeField(field.name);
        }
    }
    normalizeFieldType(field) {
        const name = String(field?.name || "").toLowerCase();
        if (/\blogo\b/.test(name)) {
            return "single-image";
        }
        if (/\bmap\b/.test(name)) {
            return "large-image";
        }
        const type = String(field?.type || "text")
            .trim()
            .replace(/_/g, "-");
        if (type === "image") {
            return "single-image";
        }
        return type;
    }
    syncImageClassesFromFields() {
        if (!Array.isArray(this.fields)) {
            return;
        }
        for (const field of this.fields) {
            const type = this.normalizeFieldType(field);
            if (type !== "single-image" && type !== "large-image") {
                continue;
            }
            const slug = this.fieldSlug(field.name);
            this.element
                .querySelectorAll(`tbody tr[data-field="${slug}"] img`)
                .forEach((img) => {
                    if (
                        img.classList.contains("template-first-image") ||
                        img.classList.contains("template-second-image")
                    ) {
                        return;
                    }
                    Media.setTemplateImageSize(img, type === "large-image");
                });
        }
    }
    removeField(field) {
        const slug = String(field || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
        const rows = this.tbody.querySelectorAll(`[data-field="${slug}"]`);
        rows.forEach((row) => row.remove());
    }
    async createField(field) {
        const type = this.normalizeFieldType(field);
        let result = null;
        switch (type) {
            case "single-image": {
                const picked = await this.selectImage();
                if (!picked?.url) return;
                result = this.imageRow(field.name, picked.url, false, picked.postId);
                break;
            }
            case "large-image": {
                const picked = await this.selectImage();
                if (!picked?.url) return;
                result = this.imageRow(field.name, picked.url, true, picked.postId);
                break;
            }
            case "double-image": {
                const picked1 = await this.selectImage();
                const picked2 = await this.selectImage();
                if (!picked1?.url || !picked2?.url) return;
                result = this.doubleImageRow(
                    field.name,
                    picked1.url,
                    picked2.url,
                    picked1.postId,
                    picked2.postId,
                );
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
            default:
                result = this.textRow(field.name);
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
        const picked = await WebSelector.init(option, "image");
        if (!picked?.url) return null;
        return {
            url: picked.url,
            postId: picked.postId || "",
        };
    }
    insertRow(row, field) {
        const slug = String(field || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
        const names = (this.fields || []).map((f) => f.name);
        const index = names.indexOf(field);
        for (let i = index + 1; i < names.length; i++) {
            const nextSlug = String(names[i] || "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-");
            const next = this.tbody.querySelector(`[data-field="${nextSlug}"]`);
            if (next) {
                this.tbody.insertBefore(row, next);
                return;
            }
        }
        this.tbody.appendChild(row);
    }
    fieldSlug(field) {
        return String(field || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
    }
    textRow(field, definition = false) {
        const row = document.createElement("tr");
        row.dataset.field = this.fieldSlug(field);
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
    imageRow(field, url, large = false, postId = "") {
        const row = document.createElement("tr");
        row.dataset.field = this.fieldSlug(field);
        const td = document.createElement("td");
        td.colSpan = 2;
        const img = Media.create(
            large ? "template-large-image" : Media.classMap.imageTemplate,
            url,
            postId,
        );
        td.appendChild(img);
        new Media(img);
        row.appendChild(td);
        return { row };
    }
    doubleImageRow(field, url1, url2, postId1 = "", postId2 = "") {
        const row = document.createElement("tr");
        row.dataset.field = this.fieldSlug(field);
        const td = document.createElement("td");
        td.colSpan = 2;
        td.append(...Media.createTemplateDoubleImage(url1, url2).childNodes);
        const imgs = td.querySelectorAll("img");
        if (postId1 && imgs[0]) {
            imgs[0].dataset.postId = String(postId1);
        }
        if (postId2 && imgs[1]) {
            imgs[1].dataset.postId = String(postId2);
        }
        imgs.forEach((img) => new Media(img));
        row.appendChild(td);
        return { row };
    }
    doubleColumnRow(field, rows = [["<br>", "<br>"]]) {
        const row = document.createElement("tr");
        row.dataset.field = this.fieldSlug(field);
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

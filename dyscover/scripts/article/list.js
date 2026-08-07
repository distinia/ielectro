import { Alert } from "../core/index.js";
import { Select } from "./select.js";
import { GenerateArticle } from "./generate-article.js";
import { Paragraph } from "./paragraph.js";
import { Caption } from "./caption.js";
export class List {
    static list = new Map();
    static classMap = {
        ul: "point-list",
        ol: "number-list",
    };
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.tag = element.tagName.toLowerCase();
        List.list.set(this.element, this);
    }
    static init(tag) {
        const current = Select.block();
        if (!current || !tag) {
            return;
        }
        const className = List.classMap[tag];
        if (!className) {
            return;
        }
        const existing = current.closest("ul, ol");
        if (existing) {
            const instance = List.list.get(existing);
            if (instance) {
                instance.delete();
            }
            return;
        }
        const isParagraph = current.classList.contains(Paragraph.className);
        const isCaption = current.classList.contains(Caption.className);
        const inTable = current.closest(".table td, .table th");
        if (!isParagraph && !isCaption && !inTable) {
            Alert.error("Only in paragraphs or tables you can add lists");
            return;
        }
        const element = List.create(tag, current.innerHTML);
        if (!element) {
            return;
        }
        if (inTable) {
            current.innerHTML = "";
            current.appendChild(element);
        } else {
            if (isParagraph) {
                Paragraph.list.delete(current);
            }
            if (isCaption) {
                Caption.list.delete(current);
            }
            current.replaceWith(element);
        }
        const instance = new List(element);
        instance.startEditing();
        Select.cursorToEnd(element.lastElementChild);
    }
    static create(tag, content = "") {
        const element = document.createElement(tag);
        const className = List.classMap[tag];
        element.classList.add(className);
        const lines = content.split("<br>");
        if (!lines.length) {
            lines.push("<br>");
        }
        lines.forEach((line) => {
            const li = document.createElement("li");
            li.innerHTML = line.trim() || "<br>";
            element.appendChild(li);
        });
        return element;
    }
    static generate(obj) {
        const tag = obj.element === "number-list" ? "ol" : "ul";
        const element = document.createElement(tag);
        element.classList.add(obj.element);
        obj.items?.forEach(item => {
            const li = document.createElement("li");
            GenerateArticle.addChildren(li, item);
            element.append(li);
        });
        return new List(element);
    }
    export() {
        return {
            element: List.classMap[this.tag],
            items: [...this.element.querySelectorAll(":scope > li")].map(li => GenerateArticle.exportChildren(li))
        };
    }
    startEditing() {
        this.element.contentEditable = true;
        this.inputEvent = () => {
            const items = this.element.querySelectorAll("li");
            if (!items.length) {
                const li = document.createElement("li");
                li.innerHTML = "<br>";
                this.element.appendChild(li);
                Select.cursorToEnd(li);
            }
        };
        this.keydownEvent = (e) => {
            if (e.key !== "Backspace") {
                return;
            }
            const items = this.element.querySelectorAll("li");
            if (items.length > 1) {
                return;
            }
            const first = items[0];
            if (!first) {
                return;
            }
            const text = first.innerText.trim();
            if (text) {
                return;
            }
            e.preventDefault();
            this.delete();
        };
        this.element.addEventListener("input", this.inputEvent);
        this.element.addEventListener("keydown", this.keydownEvent);
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.inputEvent) {
            this.element.removeEventListener("input", this.inputEvent);
        }
        if (this.keydownEvent) {
            this.element.removeEventListener("keydown", this.keydownEvent);
        }
    }
    delete() {
        const items = [...this.element.querySelectorAll("li")];
        const html = items.map((li) => li.innerHTML).join("<br>");
        const paragraph = Paragraph.create(html || "<br>");
        this.closeEditing();
        this.element.replaceWith(paragraph);
        List.list.delete(this.element);
        const instance = new Paragraph(paragraph);
        instance.startEditing();
        Select.cursorToEnd(paragraph);
        return instance;
    }
}

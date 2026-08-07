import { Select } from "./select.js";
import { GenerateArticle } from "./generate-article.js";
import { Paragraph } from "./paragraph.js";
import { Heading } from "./heading.js";
export class Caption {
    static list = new Map();
    static tag = "div";
    static className = "caption";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.text = element.innerText;
        Caption.list.set(this.element, this);
    }
    static init() {
        const current = Select.block();
        if (!current) return;
        if (current.classList.contains(Caption.className)) {
            const instance = Caption.list.get(current);
            if (instance) {
                instance.delete();
            }
            return;
        }
        const element = Caption.create(current.innerText || "<br>");
        if (current.classList.contains(Paragraph.className)) {
            Paragraph.list.delete(current);
        }
        if (
            current.classList.contains("heading") ||
            current.classList.contains("sub-heading")
        ) {
            Heading.list.delete(current);
        }
        current.replaceWith(element);
        Select.cursorToEnd(element);
        const instance = new Caption(element);
        instance.startEditing();
    }
    static create(text = "<br>") {
        const element = document.createElement(Caption.tag);
        element.classList.add(Caption.className);
        element.innerText = text;
        return element;
    }
    generate(obj) {
        const element = Caption.create(obj.text || "<br>");
        GenerateArticle.addChildren(element, obj.children);
        return new Caption(element);
    }
    export() {
        return {
            element: Caption.className,
            text: this.element.innerText,
            children: GenerateArticle.exportChildren(this.element)
        };
    }
    startEditing() {
        this.element.contentEditable = true;
        this.inputEvent = () => {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.text = this.element.innerText;
            }, 150);
        };
        this.keydownEvent = (e) => {
            if (e.key !== "Enter") {
                return;
            }
            e.preventDefault();
            const paragraph = Paragraph.create();
            const instance = new Paragraph(paragraph);
            Caption.newLine(this.element, paragraph);
            instance.startEditing();
            Select.cursorToEnd(paragraph);
        };
        this.backspaceEvent = (e) => {
            if (e.key !== "Backspace") {
                return;
            }
            const text = this.element.innerText.trim();
            if (text) {
                return;
            }
            const content = Select.container();
            const captions = content?.querySelectorAll("." + Caption.className);
            if (captions && captions.length <= 1) {
                return;
            }
            e.preventDefault();
            this.delete();
        };
        this.element.addEventListener("input", this.inputEvent);
        this.element.addEventListener("keydown", this.keydownEvent);
        this.element.addEventListener("keydown", this.backspaceEvent);
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.inputEvent) {
            this.element.removeEventListener("input", this.inputEvent);
        }
        if (this.keydownEvent) {
            this.element.removeEventListener("keydown", this.keydownEvent);
        }
        if (this.backspaceEvent) {
            this.element.removeEventListener("keydown", this.backspaceEvent);
        }
        clearTimeout(this.timeout);
    }
    delete() {
        const element = Paragraph.create(this.element.innerText || "<br>");
        this.closeEditing();
        this.element.replaceWith(element);
        Caption.list.delete(this.element);
        const instance = new Paragraph(element);
        instance.startEditing();
        Select.cursorToEnd(instance.element);
        return instance;
    }
    static newLine(parent, element) {
        if (!parent || !parent.parentNode || !element) {
            return;
        }
        parent.parentNode.insertBefore(element, parent.nextSibling);
    }
}

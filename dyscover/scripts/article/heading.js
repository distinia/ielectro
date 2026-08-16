import { Select } from "./select.js";
import { Paragraph } from "./paragraph.js";
import { Caption } from "./caption.js";
export class Heading {
    static list = new Map();
    static classMap = {
        h2: "heading",
        h3: "sub-heading",
    };
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.tag = element.tagName.toLowerCase();
        this.text = element.innerText;
        this.timeout = null;
        this.inputEvent = null;
        this.keydownEvent = null;
        if (!this.element.id) {
            this.element.id = this.assignId();
        }
        Heading.list.set(this.element, this);
    }
    static init(tag) {
        const current = Select.block();
        if (!current) return;
        const className = Heading.classMap[tag];
        if (!className) return;
        if (current.classList.contains(className)) {
            const instance = Heading.list.get(current);
            if (instance) {
                instance.delete();
            }
            return;
        }
        const isParagraph = current.classList.contains(Paragraph.className);
        const isCaption = current.classList.contains(Caption.className);
        if (!isParagraph && !isCaption) {
            return;
        }
        const element = Heading.create(tag, current.innerText || "<br>");
        if (!element) return;
        if (isParagraph) {
            Paragraph.list.delete(current);
        }
        if (isCaption) {
            Caption.list.delete(current);
        }
        current.replaceWith(element);
        const instance = new Heading(element);
        instance.startEditing();
        Select.cursorToEnd(element);
    }
    static create(tag, text = "<br>") {
        const className = Heading.classMap[tag];
        if (!className) return null;
        const element = document.createElement(tag);
        element.classList.add(className);
        element.innerText = text;
        return element;
    }
    static generate(obj) {
        const tag = obj.element === "sub-heading" ? "h3" : "h2";
        return new Heading(Heading.create(tag, obj.text || "<br>"));
    }
    export() {
        return {
            element: Heading.classMap[this.tag],
            text: this.element.innerText
        };
    }
    isEmpty() {
        return !this.element.innerText.trim();
    }
    startEditing() {
        if (this.element.closest(".content")?.isContentEditable) {
            return;
        }
        this.element.contentEditable = true;
        this.inputEvent = () => {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.text = this.element.innerText;
                this.element.id = this.assignId();
            }, 150);
        };
        this.keydownEvent = (e) => {
            if (e.key === "Backspace" && this.isEmpty()) {
                e.preventDefault();
                this.delete();
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                const element = Paragraph.create();
                const instance = new Paragraph(element);
                instance.startEditing();
                Paragraph.newLine(this.element, element);
                Select.cursorToEnd(element);
            }
        };
        this.element.addEventListener("input", this.inputEvent);
        this.element.addEventListener("keydown", this.keydownEvent);
    }
    closeEditing() {
        this.element.contentEditable = false;
        this.text = this.element.innerText;
        this.element.id = this.assignId();
        if (this.inputEvent) {
            this.element.removeEventListener("input", this.inputEvent);
            this.inputEvent = null;
        }
        if (this.keydownEvent) {
            this.element.removeEventListener("keydown", this.keydownEvent);
            this.keydownEvent = null;
        }
        clearTimeout(this.timeout);
    }
    delete() {
        const element = Paragraph.create(this.element.innerText || "<br>");
        this.closeEditing();
        this.element.replaceWith(element);
        Heading.list.delete(this.element);
        const instance = new Paragraph(element);
        instance.startEditing();
        Select.cursorToEnd(instance.element);
        return instance;
    }
    assignId() {
        let base = this.element.innerText
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "_");
        if (!base) {
            base = "heading";
        }
        let id = base;
        let i = 1;
        while (this.existsId(id)) {
            id = `${base}_${i++}`;
        }
        return id;
    }
    existsId(id) {
        for (const [, instance] of Heading.list) {
            if (
                instance.element !== this.element &&
                instance.element.id === id
            ) {
                return true;
            }
        }
        return false;
    }
}

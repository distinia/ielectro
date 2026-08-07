import { Select } from "./select.js";
export class Bold {
    static list = new Map();
    static tag = "b";
    static className = "bold";
    constructor(element) {
        if (!element) return;
        this.element = element;
        Bold.list.set(this.element, this);
    }
    static init() {
        const selection = Select.text();
        const range = Select.cursor();
        if (!selection || !range) {
            return;
        }
        const parent = Select.element(range);
        if (!parent) return;
        const existing = parent.closest(`${Bold.tag}, .${Bold.className}`);
        if (existing) {
            const fragment = document
                .createRange()
                .createContextualFragment(existing.innerHTML);
            existing.replaceWith(fragment);
            Bold.list.delete(existing);
            return;
        }
        if (range.collapsed) {
            return;
        }
        const contents = range.cloneContents();
        if (contents.querySelector(`${Bold.tag}, .${Bold.className}`)) {
            return;
        }
        const text = range.toString();
        if (!text.trim()) {
            return;
        }
        const element = Bold.create(text);
        if (!element) return;
        range.deleteContents();
        range.insertNode(element);
        const instance = new Bold(element);
        Select.cursorToEnd(instance.element);
    }
    static create(text = "") {
        if (!text) return null;
        const element = document.createElement(Bold.tag);
        element.classList.add(Bold.className);
        element.textContent = text;
        return element;
    }
    generate(obj) {
        const element = Bold.create(obj.text || "");
        return new Bold(element);
    }
    export() {
        return {
            element: Bold.className,
            text: this.element.textContent
        };
    }
}

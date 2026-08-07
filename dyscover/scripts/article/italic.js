import { Select } from "./select.js";
export class Italic {
    static list = new Map();
    static tag = "i";
    static className = "italic";
    constructor(element) {
        if (!element) return;
        this.element = element;
        Italic.list.set(this.element, this);
    }
    static init() {
        const selection = Select.text();
        const range = Select.cursor();
        if (!selection || !range) {
            return;
        }
        const parent = Select.element(range);
        if (!parent) return;
        const existing = parent.closest(`${Italic.tag}, .${Italic.className}`);
        if (existing) {
            const fragment = document
                .createRange()
                .createContextualFragment(existing.innerHTML);
            existing.replaceWith(fragment);
            Italic.list.delete(existing);
            return;
        }
        if (range.collapsed) {
            return;
        }
        const contents = range.cloneContents();
        if (contents.querySelector(`${Italic.tag}, .${Italic.className}`)) {
            return;
        }
        const text = range.toString();
        if (!text.trim()) {
            return;
        }
        const element = Italic.create(text);
        if (!element) return;
        range.deleteContents();
        range.insertNode(element);
        const instance = new Italic(element);
        Select.cursorToEnd(instance.element);
    }
    static create(text = "") {
        if (!text) return null;
        const element = document.createElement(Italic.tag);
        element.classList.add(Italic.className);
        element.textContent = text;
        return element;
    }
    generate(obj) {
        const element = Italic.create(obj.text || "");
        return new Italic(element);
    }
    export() {
        return {
            element: Italic.className,
            text: this.element.textContent
        };
    }
}

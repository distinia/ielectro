import { Select } from "./select.js";
import { ElementTree } from "./element-tree.js";
export class Paragraph {
    static list = new Map();
    static tag = "p";
    static className = "paragraph";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.text = element.innerHTML;
        Paragraph.list.set(this.element, this);
    }
    static create(content = "<br>") {
        const element = document.createElement(Paragraph.tag);
        element.classList.add(Paragraph.className);
        element.innerHTML = content;
        return element;
    }
    static generate(obj) {
        const element = document.createElement(Paragraph.tag);
        element.classList.add(Paragraph.className);        
        ElementTree.addChildren(element, obj.children);
        return new Paragraph(element);
    }
    export() {
        return {
            element: Paragraph.className,
            children: ElementTree.exportChildren(this.element)
        };
    }
    static newLine(parent, element) {
        if (!parent || !parent.parentNode || !element) {
            return;
        }
        parent.parentNode.insertBefore(element, parent.nextSibling);
    }
    static total() {
        return Paragraph.list.size;
    }
    isEmpty() {
        const html = this.element.innerHTML
            .replace(/<br\s*\/?>/gi, "")
            .replace(/&nbsp;/gi, "")
            .trim();
        return !html;
    }
    startEditing() {
        this.element.contentEditable = true;
        this.inputEvent = () => {
            this.text = this.element.innerHTML;
        };
        this.keydownEvent = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const paragraph = Paragraph.create();
                const instance = new Paragraph(paragraph);
                instance.startEditing();
                Paragraph.newLine(this.element, paragraph);
                Select.cursorToEnd(paragraph);
                return;
            }
            if (e.key === "Backspace" && this.isEmpty()) {
                if (Paragraph.total() <= 1) {
                    return;
                }
                e.preventDefault();
                const previous = this.element.previousElementSibling;
                this.delete();
                if (previous) {
                    Select.cursorToEnd(previous);
                }
            }
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
        this.closeEditing();
        Paragraph.list.delete(this.element);
        this.element.remove();
    }
}

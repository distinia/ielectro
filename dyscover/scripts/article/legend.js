import { Alert } from "../core/index.js";
import { Select } from "./select.js";
import { Menu } from "./menu.js";
import { ElementTree } from "./element-tree.js";
export class Legend {
    static list = new Map();
    static className = "legend";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.box = element.querySelector(".legend-box");
        this.label = element.querySelector(".legend-text");
        this.color = this.box?.style.backgroundColor || "";
        this.text = this.label?.textContent || "";
        this.menuActions = [
            { name: "Change color", action: this.changeColor },
            { name: "Delete", action: this.delete },
        ];
        this.menu = new Menu(this);
        Legend.list.set(this.element, this);
    }
    static async init() {
        const range = Select.cursor();
        if (!range) return;
        let color = await Alert.prompt("Insert color (COLOR, HEX, RGB)");
        if (!Legend.isValidColor(color)) {
            Alert.error("Insert a valid color");
            return;
        }
        const text = range.toString().trim() || "Text";
        const element = Legend.create(color, text);
        range.deleteContents();
        range.insertNode(element);
        Select.cursorToEnd(element);
        const instance = new Legend(element);
        instance.startEditing();
    }
    static create(color, text = "Text") {
        const box = document.createElement("div");
        box.className = Legend.className;
        const square = document.createElement("div");
        square.classList.add("legend-box");
        square.style.backgroundColor = color;
        square.contentEditable = false;
        const label = document.createElement("span");
        label.classList.add("legend-text");
        label.textContent = text;
        box.appendChild(square);
        box.appendChild(label);
        return box;
    }
    static generate(obj) {
        const element = Legend.create(obj.color || "", "");
        const instance = new Legend(element);
        ElementTree.addChildren(instance.label, obj.children);
        return instance;
    }
    export() {
        return {
            element: Legend.className,
            color: this.color,
            children: ElementTree.exportChildren(this.label)
        };
    }
    static isValidColor(color) {
        if (!color) return false;
        const s = new Option().style;
        s.color = color;
        if (s.color === color) {
            return true;
        }
        return (
            /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ||
            /^rgb\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)$/i.test(color)
        );
    }
    startEditing() {
        this.element.contentEditable = false;
        if (this.label) {
            this.label.contentEditable = true;
            this.inputEvent = () => {
                this.text = this.label.textContent;
            };
            this.label.addEventListener("input", this.inputEvent);
        }
        this.menu.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.label) {
            this.label.contentEditable = false;
        }
        if (this.label && this.inputEvent) {
            this.label.removeEventListener("input", this.inputEvent);
        }
        this.menu.closeEditing();
    }
    async changeColor() {
        let color = await Alert.prompt("Insert color (COLOR, HEX, RGB)");
        if (!Legend.isValidColor(color)) {
            Alert.error("Insert a valid color");
            return;
        }
        this.color = color;
        if (this.box) {
            this.box.style.backgroundColor = color;
        }
    }
    delete() {
        this.closeEditing();
        this.element.remove();
        Legend.list.delete(this.element);
    }
}

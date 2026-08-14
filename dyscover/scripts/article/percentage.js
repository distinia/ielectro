import { Alert } from "../core/index.js";
import { Select } from "./select.js";
import { Menu } from "./menu.js";
export class Percentage {
    static list = new Map();
    static className = "percentage";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.value = element.dataset.value || "0";
        this.width = Percentage.calculate(this.value) || 0;
        this.menuActions = [
            { name: "Update", action: this.update },
            { name: "Delete", action: this.delete },
        ];
        this.menu = new Menu(this);
        Percentage.list.set(this.element, this);
        if (!element.dataset.percentage && element.dataset.value) {
            element.dataset.percentage = Percentage.formatDisplay(
                element.dataset.value,
                this.width,
            );
        }
    }
    static async init() {
        const range = Select.cursor();
        if (!range) return;
        const value = await Alert.prompt(
            "Write percentage (50%) or fraction (1/2)",
        );
        if (!value) {
            Alert.error("Insert a valid percentage or fraction");
            return;
        }
        const width = Percentage.calculate(value);
        if (width === null) {
            Alert.error("Insert a valid percentage or fraction");
            return;
        }
        const element = Percentage.create(width, value);
        range.insertNode(element);
        const instance = new Percentage(element);
        instance.startEditing();
        Select.cursorToEnd(instance.element);
    }
    static formatDisplay(value, width) {
        const raw = String(value || "").trim();
        if (raw.includes("/")) {
            return raw;
        }
        const rounded = Math.round(Number(width) || 0);
        return `${rounded}%`;
    }
    static create(width, value) {
        const element = document.createElement("div");
        element.className = Percentage.className;
        element.contentEditable = false;
        element.dataset.value = value;
        element.dataset.percentage = Percentage.formatDisplay(value, width);
        const bar = document.createElement("div");
        bar.classList.add("percentage-value");
        bar.style.width = width + "%";
        element.appendChild(bar);
        return element;
    }
    static generate(obj) {
        const width = Percentage.calculate(obj.value) || 0;
        const element = Percentage.create(width, obj.value);
        return new Percentage(element);
    }
    export() {
        return {
            element: Percentage.className,
            value: this.value
        };
    }
    static calculate(value) {
        if (!value) return null;
        if (value.includes("/")) {
            const [num, den] = value.split("/").map((v) => parseFloat(v));
            if (!den || den === 0 || num > den) {
                return null;
            }
            return (num / den) * 100;
        }
        const n = parseFloat(value);
        return isNaN(n) ? null : n;
    }
    startEditing() {
        this.element.contentEditable = false;
        this.menu.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        this.menu.closeEditing();
    }
    async update() {
        const value = await Alert.prompt("Update percentage or fraction");
        if (!value) {
            Alert.error("Insert a valid percentage or fraction");
            return;
        }
        const width = Percentage.calculate(value);
        if (width === null) {
            Alert.error("Insert a valid percentage or fraction");
            return;
        }
        this.value = value;
        this.width = width;
        this.element.dataset.value = value;
        this.element.dataset.percentage = Percentage.formatDisplay(value, width);
        const bar = this.element.querySelector(".percentage-value");
        if (bar) {
            bar.style.width = width + "%";
        }
    }
    delete() {
        this.closeEditing();
        Percentage.list.delete(this.element);
        this.element.remove();
    }
}

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
        this.syncDisplay();
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
        const resolved = Number.isFinite(Number(width))
            ? Number(width)
            : Percentage.calculate(value) || 0;
        return `${Math.round(resolved)}%`;
    }
    static create(width, value) {
        const element = document.createElement("div");
        element.className = Percentage.className;
        element.contentEditable = false;
        element.dataset.value = String(value ?? "");
        const bar = document.createElement("div");
        bar.classList.add("percentage-value");
        element.appendChild(bar);
        Percentage.applyWidth(element, width, value);
        return element;
    }
    static applyWidth(element, width, value = element?.dataset?.value) {
        if (!element) {
            return;
        }
        const resolved = Number.isFinite(Number(width))
            ? Math.max(0, Math.min(100, Number(width)))
            : 0;
        element.dataset.value = String(value ?? element.dataset.value ?? "0");
        element.dataset.percentage = Percentage.formatDisplay(
            element.dataset.value,
            resolved,
        );
        element.style.setProperty("--percentage-width", `${resolved}%`);
        const bar = element.querySelector(".percentage-value");
        if (bar) {
            bar.style.width = "";
            bar.style.removeProperty("width");
        }
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
        const raw = String(value).trim();
        if (raw.includes("/")) {
            const [num, den] = raw.split("/").map((v) => parseFloat(v));
            if (!den || den === 0 || num > den) {
                return null;
            }
            return (num / den) * 100;
        }
        const n = parseFloat(raw);
        return isNaN(n) ? null : n;
    }
    syncDisplay() {
        const fromValue = Percentage.calculate(this.value);
        let width = fromValue;
        if (width === null) {
            const bar = this.element.querySelector(".percentage-value");
            const inline = parseFloat(bar?.style?.width || "");
            width = Number.isFinite(inline) ? inline : 0;
        }
        this.width = width || 0;
        Percentage.applyWidth(this.element, this.width, this.value);
    }
    startEditing() {
        this.element.contentEditable = false;
        this.menu.startEditing({ openOnClick: true });
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
        Percentage.applyWidth(this.element, width, value);
    }
    delete() {
        this.closeEditing();
        Percentage.list.delete(this.element);
        this.element.remove();
    }
}

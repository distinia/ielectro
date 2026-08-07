import { Select } from "./select.js";
export class Center {
    static list = new Map();
    static className = "center";
    constructor(element) {
        if (!element) return;
        this.element = element;
        Center.list.set(this.element, this);
    }
    static init() {
        const current = Select.block();
        if (!current) return;
        if (current.classList.contains(Center.className)) {
            current.classList.remove(Center.className);
            Center.list.delete(current);
            Select.cursorToEnd(current);
            return;
        }
        current.classList.add(Center.className);
        new Center(current);
        Select.cursorToEnd(current);
    }
}

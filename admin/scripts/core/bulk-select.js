import { Alert } from "./alert.js";

export class BulkSelect {
    constructor(onChange = null) {
        this.ids = new Set();
        this.onChange = onChange;
    }

    toggle(id, checked) {
        const key = String(id);
        if (checked) this.ids.add(key);
        else this.ids.delete(key);
        this.onChange?.(this);
    }

    setAll(ids, checked) {
        this.ids.clear();
        if (checked) {
            ids.forEach((id) => this.ids.add(String(id)));
        }
        this.onChange?.(this);
    }

    clear() {
        this.ids.clear();
        this.onChange?.(this);
    }

    has(id) {
        return this.ids.has(String(id));
    }

    size() {
        return this.ids.size;
    }

    values() {
        return [...this.ids];
    }
}

export function bindBulkToolbar(bulk, deleteBtnSelector = ".admin-action-bulk-delete") {
    const update = () => {
        const btn = document.querySelector(deleteBtnSelector);
        if (btn) btn.disabled = bulk.size() === 0;
    };
    bulk.onChange = update;
    update();
    return update;
}

export async function bulkDeleteRows(bulk, deleteOne, confirmLabel) {
    const ids = bulk.values();
    if (!ids.length) return false;
    const label =
        typeof confirmLabel === "function"
            ? confirmLabel(ids.length)
            : confirmLabel || `Delete ${ids.length} item(s)?`;
    if (!(await Alert.confirm(label))) {
        return false;
    }
    for (const id of ids) {
        await deleteOne(id);
    }
    bulk.clear();
    return true;
}

import { Alert } from "../core/index.js";
import { API } from "./api.js";
import { Select } from "./select.js";
export class Save {
    static list = new Map();
    constructor(content) {
        this.content = content;
    }
    static async init() {
        const editingContainer = Select.container();
        if (!editingContainer) return;
        const content = editingContainer.innerHTML;
        const result = await Alert.confirm("Do you want to save changes");
        if (!result) return;
        const instance = new Save(content);
        Save.list.set(editingContainer, instance);
        try {
            const res = await API.saveArticle(instance.content);
            Alert.success(res);
        } catch (e) {
            Alert.error(e.text);
        }
    }
}

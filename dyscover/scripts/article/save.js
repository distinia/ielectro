import { Alert } from "../core/index.js";
import { API } from "./api.js";
import { Editor } from "./editor.js";
import { Select } from "./select.js";
export class Save {
    static list = new Map();
    constructor(content) {
        this.content = content;
    }
    static async init() {
        const editingContainer = Select.container();
        if (!editingContainer && !Editor.current?.content) {
            return;
        }
        const result = await Alert.confirm("Do you want to save changes");
        if (!result) {
            return;
        }
        let content;
        try {
            content = Editor.stripContentEditableHtml(
                (await Editor.current?.getHtmlContent()) ||
                    editingContainer?.innerHTML ||
                    "",
            );
        } catch (e) {
            Alert.error(
                e?.message || e?.text || "Unable to prepare article for save",
            );
            return;
        }
        if (!content.trim()) {
            Alert.error("Nothing to save");
            return;
        }
        const instance = new Save(content);
        if (editingContainer) {
            Save.list.set(editingContainer, instance);
        }
        try {
            const res = await API.saveArticle(instance.content);
            Alert.success(res);
        } catch (e) {
            Alert.error(
                e?.text || e?.message || "Unable to save article",
            );
        }
    }
}

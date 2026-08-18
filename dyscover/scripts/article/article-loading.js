import { Editor } from "./editor.js";
export async function withArticleLoading(task) {
    if (typeof Editor.runModeTransition !== "function") {
        return task?.();
    }
    return Editor.runModeTransition(task);
}

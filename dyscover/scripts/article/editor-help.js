import { Box } from "../core/index.js";
import { ArticleHelp } from "./article-help.js";
import { Editor } from "./editor.js";
export class EditorHelp {
    static async open() {
        const isTextMode = !!Editor.current?.isTextMode;
        const box = new Box(ArticleHelp.editorTitle(isTextMode), {
            hideFooter: true,
        });
        await box.create();
        box.body((body) => {
            body.classList.add("article-editor-help");
            body.innerHTML = ArticleHelp.forEditorMode(isTextMode);
        });
    }
}

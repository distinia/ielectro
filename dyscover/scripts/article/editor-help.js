import { Alert, Box, Icons } from "../core/index.js";
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
        await Icons.load(box.container);
        if (isTextMode) {
            this.bindCopyPatterns(box.container);
        }
    }
    static bindCopyPatterns(root) {
        const button = root?.querySelector(".article-help-copy-patterns");
        if (!button) {
            return;
        }
        button.addEventListener("click", async () => {
            const text = ArticleHelp.sourcePatternPlainText();
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    this.copyFallback(text);
                }
                Alert.success("Pattern table copied");
            } catch {
                try {
                    this.copyFallback(text);
                    Alert.success("Pattern table copied");
                } catch {
                    Alert.error("Could not copy patterns");
                }
            }
        });
    }
    static copyFallback(text) {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        if (!ok) {
            throw new Error("Copy failed");
        }
    }
}

import { Alert, Api, Box, Icons, Request } from "../core/index.js";
import { Api as ApiRoutes } from "../core/api.js";
import { App } from "../core/app.js";
import { Editor } from "./editor.js";
import { withArticleLoading } from "./article-loading.js";
export class ArticleGenerate {
    static async open() {
        await this.ensureTextMode();
        const prompt = await this.promptModal();
        if (!prompt) {
            return;
        }
        const uuid =
            document.body.dataset.uuid ||
            App.urlLastPart().replace(/\.html$/i, "").split("#")[0];
        if (!uuid) {
            Alert.error("Article not found");
            return;
        }
        try {
            await withArticleLoading(async () => {
                const researchResponse = await Request.post(
                    ApiRoutes.articleGenerate(uuid),
                    {
                        prompt,
                        stage: "research",
                    },
                );
                const research = Api.record(researchResponse);
                const context = research?.context;
                if (!context) {
                    throw new Error("Research stage failed");
                }
                const writeResponse = await Request.post(
                    ApiRoutes.articleGenerate(uuid),
                    {
                        prompt,
                        stage: "write",
                        context,
                    },
                );
                const write = Api.record(writeResponse);
                const source = String(write?.source || "").trim();
                if (!source) {
                    throw new Error("Empty article");
                }
                await Editor.current?.applyGeneratedSource(source);
            });
        } catch (error) {
            Alert.error(
                error?.message || error?.text || "Could not generate article",
            );
        }
    }
    static async ensureTextMode() {
        const editor = Editor.current;
        if (!editor?.isEditing || editor.isTextMode) {
            return;
        }
        await Editor.toggleEditorMode();
        await editor.index?.buildSidebar();
    }
    static promptModal() {
        return new Promise(async (resolve) => {
            const box = new Box("Generate Article", {
                variant: "article",
                headerLayout: "creator",
                help: `<p>Describe the topic in a few sentences.</p>
                    <ul>
                        <li>Dyscover uses existing posts only as <strong>world context</strong>.</li>
                        <li>The AI writes a <strong>new</strong> long encyclopedic article.</li>
                        <li>Links and media must exist as Dyscover posts.</li>
                        <li>Press <strong>Ctrl+Enter</strong> to generate.</li>
                    </ul>`,
            });
            await box.create();
            let settled = false;
            const finish = (value) => {
                if (settled) {
                    return;
                }
                settled = true;
                box.close();
                resolve(value);
            };
            box.body((body) => {
                body.classList.add("article-generate-body");
                body.innerHTML = `
                    <label class="article-generate-label">
                        <span>Brief</span>
                        <textarea
                            class="textarea article-generate-input"
                            rows="9"
                            placeholder="Describe the office, country, role, mandate, powers..."
                        ></textarea>
                    </label>`;
            });
            box.footer((footer) => {
                footer.classList.add("article-generate-footer");
                footer.innerHTML = `
                    <button type="button" class="button article-generate-submit">Generate</button>`;
                const textarea = box.container.querySelector(".article-generate-input");
                const submit = footer.querySelector(".article-generate-submit");
                const submitPrompt = () => {
                    const value = textarea?.value.trim() || "";
                    if (!value) {
                        Alert.error("Write a brief for the article");
                        return;
                    }
                    finish(value);
                };
                submit?.addEventListener("click", submitPrompt);
                textarea?.addEventListener("keydown", (event) => {
                    if (event.key === "Escape") {
                        finish(false);
                    }
                    if (
                        event.key === "Enter" &&
                        (event.ctrlKey || event.metaKey)
                    ) {
                        event.preventDefault();
                        submitPrompt();
                    }
                });
                textarea?.focus();
            });
            box.container
                .querySelector(".select-item-close-box")
                ?.addEventListener("click", () => finish(false));
            await Icons.load(box.container);
        });
    }
}

import { Alert, Api, Box, Icons, Request } from "../core/index.js";
import { Api as ApiRoutes } from "../core/api.js";
import { App } from "../core/app.js";

import { Editor } from "./editor.js";
import { withArticleLoading } from "./article-loading.js";
import { WebSelector } from "./web-selector.js";
export class ArticleGenerate {
    static MAX_PROMPT = 12000;
    static MAX_POSTS = 12;

    static async open() {
        await this.ensureTextMode();
        const draft = await this.promptModal();
        if (!draft?.prompt) {
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
                const writeResponse = await Request.post(
                    ApiRoutes.articleGenerate(uuid),
                    {
                        prompt: draft.prompt,
                        template_id: draft.templateId || null,
                        post_ids: draft.postIds || [],
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
            const failed =
                error?.name === "TypeError" ||
                /failed to fetch|networkerror|unable to complete request/i.test(
                    String(error?.message || error?.text || ""),
                );
            Alert.error(
                failed
                    ? "Generation timed out. The local model needs more time — try again."
                    : error?.message ||
                          error?.text ||
                          "Could not generate article",
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
    static pageTitle() {
        return document.querySelector(".title")?.textContent?.trim() || "";
    }


    static chipEl(label, onRemove, type = "") {
        const chip = document.createElement("span");
        chip.className = "article-generate-chip";
        if (type) {
            chip.classList.add(`article-generate-chip--${type}`);
        }
        const text = document.createElement("span");
        text.className = "article-generate-chip-label";
        text.textContent = label;
        text.title = type ? `${label} (${type})` : label;
        chip.append(text);
        if (type) {
            const kind = document.createElement("span");
            kind.className = "article-generate-chip-type";
            kind.textContent = type;
            chip.append(kind);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "article-generate-chip-remove";
        remove.setAttribute("aria-label", `Remove ${label}`);
        remove.innerHTML = `<i data-icon="x"></i>`;
        remove.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
        });
        chip.append(remove);
        return chip;
    }

    static promptModal() {
        return new Promise(async (resolve) => {
            const pageTitle = ArticleGenerate.pageTitle();
            const box = new Box("Generate Article", {
                variant: "article",
                headerLayout: "creator",
                help: `<p>Write a topic or paste notes, then press Generate.</p>
                    <ul>
                        <li>Use <strong>Attach</strong> to add templates or posts as optional sources.</li>
                        <li>Press <strong>Ctrl+Enter</strong> to generate.</li>
                    </ul>`,
            });
            await box.create();
            let settled = false;
            let templateId = "";
            let templateTitle = "";
            const posts = [];
            const finish = (value) => {
                if (settled) {
                    return;
                }
                settled = true;
                box.close();
                resolve(value);
            };
            const max = ArticleGenerate.MAX_PROMPT;
            box.body((body) => {
                body.classList.add("article-generate-body");
                body.innerHTML = `
                    <label class="article-generate-label">
                        <span>Topic or notes</span>
                        <textarea
                            class="textarea article-generate-input"
                            rows="10"
                            maxlength="${max}"
                            placeholder="A short topic, or paste notes. Empty uses the page title."
                        ></textarea>
                        <span class="char-count" data-char-count>0 / ${max}</span>
                    </label>
                    <div class="article-generate-attachments" data-attachments hidden>
                        <div class="article-generate-picks">
                            <span class="article-generate-chips" data-template-chip></span>
                            <span class="article-generate-chips" data-post-chips></span>
                        </div>
                    </div>`;
            });
            box.footer((footer) => {
                footer.classList.add("article-generate-footer");
                footer.innerHTML = `
                    <button type="button" class="button button-secondary article-generate-attach">Attach</button>
                    <button type="button" class="button article-generate-submit">Generate</button>`;
                const textarea = box.container.querySelector(".article-generate-input");
                const counter = box.container.querySelector("[data-char-count]");
                const submit = footer.querySelector(".article-generate-submit");
                const attach = footer.querySelector(".article-generate-attach");
                const attachments = box.container.querySelector("[data-attachments]");
                const templateSlot = box.container.querySelector("[data-template-chip]");
                const postSlot = box.container.querySelector("[data-post-chips]");
                const syncCount = () => {
                    const used = textarea?.value.length || 0;
                    if (counter) {
                        counter.textContent = `${used} / ${max}`;
                        counter.classList.toggle("is-limit", used >= max);
                    }
                };
                const syncPicks = async () => {
                    if (templateSlot) {
                        templateSlot.replaceChildren();
                        if (templateId) {
                            templateSlot.appendChild(
                                ArticleGenerate.chipEl(
                                    templateTitle || "Template",
                                    () => {
                                        templateId = "";
                                        templateTitle = "";
                                        syncPicks();
                                    },
                                    "template",
                                ),
                            );
                        }
                    }
                    if (postSlot) {
                        postSlot.replaceChildren();
                        posts.forEach((item) => {
                            postSlot.appendChild(
                                ArticleGenerate.chipEl(
                                    item.title || "Post",
                                    () => {
                                        const at = posts.findIndex(
                                            (row) => row.postId === item.postId,
                                        );
                                        if (at >= 0) {
                                            posts.splice(at, 1);
                                        }
                                        syncPicks();
                                    },
                                    item.type || "post",
                                ),
                            );
                        });
                    }
                    const hasAny = !!(templateId || posts.length);
                    if (attachments) {
                        attachments.hidden = !hasAny;
                    }
                    await Icons.load(box.container);
                };
                const addPost = (row) => {
                    const id = String(row?.postId || row?.id || "").trim();
                    if (!id || posts.some((item) => item.postId === id)) {
                        return false;
                    }
                    if (posts.length >= ArticleGenerate.MAX_POSTS) {
                        Alert.error(
                            `You can attach up to ${ArticleGenerate.MAX_POSTS} posts`,
                        );
                        return false;
                    }
                    posts.push({
                        postId: id,
                        title: String(row?.title || `Post ${id}`).trim(),
                        type: String(row?.postType || row?.type || "post").trim() || "post",
                    });
                    return true;
                };
                const submitPrompt = () => {
                    const notes = textarea?.value.trim() || "";
                    const value = notes || pageTitle;
                    if (!value) {
                        Alert.error("Write a topic or notes for the article");
                        return;
                    }
                    if (notes.length > max) {
                        Alert.error(`Notes must be ${max} characters or fewer`);
                        return;
                    }
                    finish({
                        prompt: value,
                        templateId: templateId || null,
                        postIds: posts.map((item) => Number(item.postId)),
                    });
                };
                textarea?.addEventListener("input", syncCount);
                attach?.addEventListener("click", async () => {
                    const picked = await WebSelector.init("Dyscover", "post", {
                        multiple: true,
                    });
                    const rows = Array.isArray(picked) ? picked : picked ? [picked] : [];
                    rows.forEach((row) => {
                        const type = String(row?.postType || row?.type || "").trim().toLowerCase();
                        if (type === "template") {
                            templateId = String(row?.postId || row?.url || "").trim();
                            templateTitle = String(row?.title || "Template").trim();
                            return;
                        }
                        addPost(row);
                    });
                    await syncPicks();
                });
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
                syncCount();
                syncPicks();
                textarea?.focus();
            });
            box.container
                .querySelector(".select-item-close-box")
                ?.addEventListener("click", () => finish(false));
            await Icons.load(box.container);
        });
    }
}

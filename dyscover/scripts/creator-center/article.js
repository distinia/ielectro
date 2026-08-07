import { Api } from "../core/api.js";
import { Alert, Box, Request } from "../core/index.js";
import { CreatorMeta } from "./creator-meta.js";
import { Post } from "./post.js";

export class Article extends Post {
    static type = "article";
    static table = ".article-table";

    static create() {
        new this(null, {}).box("POST");
    }

    box(method) {
        this.method = method;
        const modal = new Box(
            method === "POST" ? "Create Article" : "Edit Article",
        );
        this.modal = modal;
        modal.create().then(() => {
            modal.body((body) => {
                body.innerHTML = `
            <form id="article-form" class="creator-form">
                ${CreatorMeta.fieldHtml({
                    title: this.item.title,
                    description: this.item.description,
                    tags: this.item.tags,
                })}
                <span class="hint">The server creates a blank HTML article file automatically. You can edit the full article in the editor after creating.</span>
            </form>`;
                CreatorMeta.bindTags(body);
            });
            modal.footer((f) => {
                f.innerHTML = `
            <button type="submit" class="button" form="article-form">
                ${method === "POST" ? "Create article" : "Save changes"}
            </button>`;
            });
            const form = document.querySelector("#article-form");
            const submitBtn = document.querySelector('button[form="article-form"]');
            form.onsubmit = async (e) => {
                e.preventDefault();
                const title = String(form.title.value || "").trim();
                if (!title) return Alert.error("Title is required");
                const tags = CreatorMeta.readTags(form);
                const done = await CreatorMeta.withSubmitLock(submitBtn, async () => {
                    if (method === "POST") {
                        await Request.post(Api.posts, {
                            type: "article",
                            title,
                            description: String(form.description.value || "").trim(),
                            tags,
                            uuid: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
                        });
                    } else {
                        await Request.patch(Api.post(this.id), {
                            title,
                            description: String(form.description.value || "").trim(),
                            tags,
                        });
                    }
                    Alert.success(
                        method === "POST" ? "Article created" : "Article updated",
                    );
                    modal.close();
                    Article.loadTable();
                    return true;
                });
                if (done === null) return;
            };
        });
    }
}

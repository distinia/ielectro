import { Api } from "../core/api.js";
import { Alert, Box, Request, FormValidator } from "../core/index.js";
import { Post } from "./post.js";

export class Article extends Post {
    static type = "article";
    static table = ".article-table";
    static tab = ".article-tab";

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
            <form id="article-form">
                <input class="input" name="title" placeholder="Enter title" value="${this.item.title || ""}">
                <textarea class="textarea" name="description">${this.item.description || ""}</textarea>
            </form>`;
            });
            modal.footer((f) => {
                f.innerHTML = `
            <button class="button" form="article-form">
                ${method === "POST" ? "Create" : "Update"}
            </button>`;
            });
            const form = document.querySelector("#article-form");
            form.onsubmit = async (e) => {
                e.preventDefault();
                const validator = new FormValidator("article-form");
                if (!(await validator.validate())) {
                    return Alert.error(validator.message);
                }
                const data = new FormData(form);
                try {
                    if (method === "POST") {
                        await Request.post(Api.posts, {
                            type: "article",
                            title: data.get("title"),
                            description: data.get("description"),
                            html: "<p></p>",
                            uuid: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
                        });
                    } else {
                        await Request.patch(Api.post(this.id), {
                            title: data.get("title"),
                            description: data.get("description"),
                        });
                    }
                    Alert.success(method === "POST" ? "Created" : "Updated");
                    modal.close();
                    Article.loadTable();
                } catch (e) {
                    Alert.error(typeof e === "object" && e?.text ? e.text : "Save failed");
                }
            };
        });
    }
}

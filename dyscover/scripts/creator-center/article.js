import { Alert, Box, Request, FormValidator } from "../core/index.js";
import { Post } from "./post.js";
export class Article extends Post {
    static type = "article";
    static table = ".article-table";
    static tab = ".article-tab";
    static loadApi = "https://dyscover.ielectro.com/api/article/user";
    static createApi = "https://dyscover.ielectro.com/api/article/create";
    static editApi = "https://dyscover.ielectro.com/api/article/edit";
    static deleteApi = "https://dyscover.ielectro.com/api/article/delete";
    static create() {
        new this(null, {}).box("POST");
    }
    box(method) {
        this.method = method;
        this.box = new Box(
            method === "POST" ? "Create Article" : "Edit Article"
        );
        this.box.create();
        this.box.body(body => {
            body.innerHTML = `
            <form id="article-form">
                <input name="title" placeholder="Enter title" value="${this.item.title || ""}">
                <textarea name="description">${this.item.description || ""}</textarea>
                <textarea name="tags">${this.item.tags || ""}</textarea>
            </form>`;
        });
        this.box.footer(f => {
            f.innerHTML = `
            <button form="article-form">
                ${method === "POST" ? "Create" : "Update"}
            </button>`;
        });
        const form = document.querySelector("#article-form");
        form.onsubmit = async e => {
            e.preventDefault();
            const validator = new FormValidator("article-form");
            if (!(await validator.validate())) {
                return Alert.error(validator.message);
            }
            const data = new FormData(form);
            let url = Article.createApi;
            if (method === "PUT") {
                data.append("oldTitle", this.title);
                url = Article.editApi;
            }
            try {
                const res = await Request.post(url, data);
                Alert.success(res.text);
                this.box.close();
                Article.loadTable();
            } catch(e) {
                Alert.error(e.text);
            }
        };
    }
}

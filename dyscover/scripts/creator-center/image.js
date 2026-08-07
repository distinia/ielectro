import { Alert, Box, Request, FormValidator } from "../core/index.js";
import { Post } from "./post.js";
export class Image extends Post {
    static type = "image";
    static table = ".image-table";
    static tab = ".image-tab";
    static loadApi = "https://dyscover.ielectro.com/api/media/user";
    static createApi = "https://dyscover.ielectro.com/api/media/create";
    static editApi = "https://dyscover.ielectro.com/api/media/edit";
    static deleteApi = "https://dyscover.ielectro.com/api/media/delete";
    static params = {
        type: "image"
    };
    static create() {
        new this(null, {}).box("POST");
    }
    box(method) {
        this.method = method;
        this.box = new Box(
            method === "POST" ? "Upload Image" : "Edit Image"
        );
        this.box.create();
        this.box.body(body => {
            body.innerHTML = `
            <form id="media-form" enctype="multipart/form-data">
                <input name="title" value="${this.item.title || ""}">
                <textarea name="description">${this.item.description || ""}</textarea>
                <textarea name="tags">${this.item.tags || ""}</textarea>
                <label>
                    Select file
                    <input type="file" id="media" name="media" hidden>
                </label>
                <div class="file-preview"></div>
            </form>`;
        });
        this.box.footer(f => {
            f.innerHTML = `
            <button form="media-form">
                ${method === "POST" ? "Upload" : "Update"}
            </button>`;
        });
        this.mediaPreview();
        this.submitMedia();
    }
    submitMedia() {
        const form = document.querySelector("#media-form");
        form.onsubmit = async e => {
            e.preventDefault();
            const validator = new FormValidator("media-form");
            if (!(await validator.validate())) {
                return Alert.error(validator.message);
            }
            const data = new FormData(form);
            data.append("type", this.constructor.type);
            let url = this.constructor.createApi;
            if (this.method === "PUT") {
                data.append("oldTitle", this.title);
                url = this.constructor.editApi;
            }
            try {
                const res = await Request.post(url, data);
                Alert.success(res.text);
                this.box.close();
                this.constructor.loadTable();
            } catch(e) {
                Alert.error(e.text);
            }
        };
    }
}

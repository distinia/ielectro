import { Api } from "../core/api.js";
import { Alert, Box, Request, FormValidator } from "../core/index.js";
import { Post } from "./post.js";

export class Image extends Post {
    static type = "image";
    static table = ".image-table";
    static tab = ".image-tab";

    static create() {
        new this(null, {}).box("POST");
    }

    box(method) {
        this.method = method;
        const modal = new Box(method === "POST" ? "Upload Image" : "Edit Image");
        this.modal = modal;
        modal.create().then(() => {
            modal.body((body) => {
                body.innerHTML = `
            <form id="media-form" enctype="multipart/form-data">
                <input class="input" name="title" value="${this.item.title || ""}">
                <textarea class="textarea" name="description">${this.item.description || ""}</textarea>
                <label class="label">
                    Select file
                    <input type="file" id="media" name="media" hidden>
                </label>
                <div class="file-preview"></div>
            </form>`;
            });
            modal.footer((f) => {
                f.innerHTML = `<button class="button" form="media-form">${method === "POST" ? "Upload" : "Update"}</button>`;
            });
            this.mediaPreview();
            this.submitMedia(method, modal);
        });
    }

    mediaPreview() {
        const input = document.querySelector("#media-form input[type='file']");
        const preview = document.querySelector("#media-form .file-preview");
        if (!input || !preview) return;
        input.addEventListener("change", () => {
            preview.innerHTML = "";
            const file = input.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            if (file.type.startsWith("image/")) {
                preview.innerHTML = `<img src="${url}" alt="">`;
            } else if (file.type.startsWith("video/")) {
                preview.innerHTML = `<video controls src="${url}"></video>`;
            } else if (file.type.startsWith("audio/")) {
                preview.innerHTML = `<audio controls src="${url}"></audio>`;
            } else {
                preview.textContent = file.name;
            }
        });
    }

    submitMedia(method, modal) {
        const form = document.querySelector("#media-form");
        form.onsubmit = async (e) => {
            e.preventDefault();
            const validator = new FormValidator("media-form");
            if (!(await validator.validate())) {
                return Alert.error(validator.message);
            }
            const data = new FormData(form);
            try {
                if (method === "POST") {
                    data.append("type", this.constructor.type);
                    data.append(
                        "uuid",
                        crypto.randomUUID().replace(/-/g, "").slice(0, 16),
                    );
                    await Request.post(Api.posts, data);
                } else {
                    await Request.patch(Api.post(this.id), {
                        title: data.get("title"),
                        description: data.get("description"),
                    });
                }
                Alert.success(method === "POST" ? "Uploaded" : "Updated");
                modal.close();
                this.constructor.loadTable();
            } catch (e) {
                Alert.error(typeof e === "object" && e?.text ? e.text : "Save failed");
            }
        };
    }
}

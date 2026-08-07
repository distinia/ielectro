import { Api } from "../core/api.js";
import { Alert, Box, Request } from "../core/index.js";
import { CreatorMeta } from "./creator-meta.js";
import { Post } from "./post.js";

export class Image extends Post {
    static type = "image";
    static table = ".image-table";
    static accept = "image/*";
    static uploadLabel = "image";
    static uploadHint = "JPG, PNG, WebP up to 10 MB";

    static create() {
        new this(null, {}).box("POST");
    }

    box(method) {
        this.method = method;
        const typeLabel = this.constructor.uploadLabel || this.constructor.type;
        const modal = new Box(
            method === "POST" ? `Upload ${typeLabel}` : `Edit ${typeLabel}`,
        );
        this.modal = modal;
        modal.create().then(() => {
            modal.body((body) => {
                body.innerHTML = `
            <form id="media-form" class="creator-form" enctype="multipart/form-data">
                ${CreatorMeta.fieldHtml({
                    title: this.item.title,
                    description: this.item.description,
                    tags: this.item.tags,
                })}
                <div class="creator-field">
                    <label>File</label>
                    <label class="creator-upload-zone" for="media-file">
                        <strong>Choose ${typeLabel} file</strong>
                        <p>${this.constructor.uploadHint}</p>
                    </label>
                    <input type="file" id="media-file" name="media" accept="${this.constructor.accept}" ${method === "POST" ? "required" : ""} hidden>
                    <div class="file-preview"></div>
                </div>
            </form>`;
                CreatorMeta.bindTags(body);
            });
            modal.footer((f) => {
                f.innerHTML = `<button type="submit" class="button" form="media-form">${method === "POST" ? "Upload" : "Save changes"}</button>`;
            });
            this.mediaPreview();
            this.submitMedia(method, modal);
        });
    }

    mediaPreview() {
        const input = document.querySelector("#media-file");
        const preview = document.querySelector("#media-form .file-preview");
        const zone = document.querySelector(".creator-upload-zone");
        if (!input || !preview) return;
        const show = () => {
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
            } else if (
                file.type === "application/pdf" ||
                file.name.toLowerCase().endsWith(".pdf")
            ) {
                preview.innerHTML = `<iframe class="pdf-preview-frame" src="${url}" title="PDF preview"></iframe>`;
            } else {
                preview.innerHTML = `<p>${file.name}</p>`;
            }
            if (zone) zone.querySelector("strong").textContent = file.name;
        };
        input.addEventListener("change", show);
        zone?.addEventListener("click", (e) => {
            if (e.target !== input) input.click();
        });
    }

    submitMedia(method, modal) {
        const form = document.querySelector("#media-form");
        const submitBtn = document.querySelector('button[form="media-form"]');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = new FormData(form);
            const tags = CreatorMeta.readTags(form);
            const done = await CreatorMeta.withSubmitLock(submitBtn, async () => {
                if (method === "POST") {
                    data.append("type", this.constructor.type);
                    data.append(
                        "uuid",
                        crypto.randomUUID().replace(/-/g, "").slice(0, 16),
                    );
                    data.append("tags", JSON.stringify(tags));
                    await Request.post(Api.posts, data);
                } else {
                    const patch = {
                        title: data.get("title"),
                        description: data.get("description"),
                        tags,
                    };
                    if (data.get("media")?.size) {
                        data.append("tags", JSON.stringify(tags));
                        await Request.patch(Api.post(this.id), data);
                    } else {
                        await Request.patch(Api.post(this.id), patch);
                    }
                }
                Alert.success(method === "POST" ? "Uploaded" : "Updated");
                modal.close();
                this.constructor.loadTable();
                return true;
            });
            if (done === null) return;
        };
    }
}

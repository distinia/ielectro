import { Api } from "../core/api.js";
import { Alert, Box, Icons, Request } from "../core/index.js";
import { CreatorMeta } from "./creator-meta.js";
import { CreatorHelp } from "./creator-help.js";
import { Post } from "./post.js";
import { CreatorRegistry } from "./registry.js";

const FIELD_TYPES = [
    ["text", "Text"],
    ["definition", "Definition"],
    ["image", "Image"],
    ["large-image", "Large image"],
    ["double-image", "Double image"],
    ["double-column", "Double column"],
    ["double-column-extended", "Double column extended"],
];

export class Template extends Post {
    static type = "template";
    static table = ".template-table";

    static create() {
        new this(null, {}).box("POST");
    }

    box(method) {
        this.method = method;
        const modal = new Box(
            method === "POST" ? "Create Template" : "Edit Template",
            { variant: "template", help: CreatorHelp.template },
        );
        this.modal = modal;
        modal.create().then(async () => {
            modal.body((body) => {
                body.innerHTML = `
            <form id="template-form" class="creator-form template-form" enctype="multipart/form-data">
                <div class="template-layout">
                    <aside class="template-sidebar">
                        <div class="template-sidebar-card">
                            <h3>Template details</h3>
                            ${CreatorMeta.fieldHtml({
                                title: this.item.title,
                                description: this.item.description,
                                tags: this.item.tags,
                            })}
                        </div>
                        <div class="template-sidebar-card">
                            <h3>Preview image</h3>
                            <label class="creator-upload-zone template-preview-zone" for="template-preview">
                                <strong>Choose preview image</strong>
                                <p>JPG, PNG, or WebP</p>
                            </label>
                            <input type="file" id="template-preview" name="preview" accept="image/*" hidden>
                            <div class="file-preview template-preview-box"></div>
                        </div>
                    </aside>
                    <section class="template-builder">
                        <div class="template-builder-head">
                            <div>
                                <h3>Fields</h3>
                                <p>Define the structured blocks used when someone fills this template.</p>
                            </div>
                        </div>
                        <div class="template-field-add">
                            <input class="input field-input" name="field_label" data-preserve-case="true" placeholder="Field name">
                            <select class="select field-type">
                                ${FIELD_TYPES.map(
                                    ([value, label]) =>
                                        `<option value="${value}">${label}</option>`,
                                ).join("")}
                            </select>
                            <button type="button" class="button button-secondary field-add">Add field</button>
                        </div>
                        <div class="template-field-list field-list"></div>
                    </section>
                </div>
            </form>`;
            });
            modal.footer((f) => {
                f.innerHTML = `
                <button type="button" class="button button-secondary modal-cancel">Cancel</button>
                <button type="submit" class="button button-primary" form="template-form">${method === "POST" ? "Create template" : "Save template"}</button>`;
                f.querySelector(".modal-cancel")?.addEventListener("click", () => modal.close());
            });
            this.form = document.querySelector("#template-form");
            CreatorMeta.bindTags(this.form);
            this.bindPreview();
            this.bindFields();
            if (method === "PUT" && this.id) {
                await this.loadFields();
                this.showExistingPreview();
            }
            this.form.onsubmit = (e) => this.submitForm(e, modal);
        });
    }

    bindPreview() {
        const input = this.form?.querySelector("#template-preview");
        const preview = this.form?.querySelector(".template-preview-box");
        const zone = this.form?.querySelector(".template-preview-zone");
        if (!input || !preview) return;
        input.addEventListener("change", () => {
            preview.innerHTML = "";
            const file = input.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            preview.innerHTML = `<img src="${url}" alt="">`;
            if (zone) zone.querySelector("strong").textContent = file.name;
        });
        zone?.addEventListener("click", (event) => {
            if (event.target !== input) input.click();
        });
    }

    showExistingPreview() {
        const preview = this.form?.querySelector(".template-preview-box");
        if (!preview || !this.item.preview_image) return;
        preview.innerHTML = `<img src="${this.item.preview_image}" alt="">`;
    }

    bindFields() {
        const button = this.form.querySelector(".field-add");
        const input = this.form.querySelector(".field-input");
        const select = this.form.querySelector(".field-type");
        const list = this.form.querySelector(".field-list");
        button.onclick = (event) => {
            event.preventDefault();
            const name = input.value.trim();
            if (!name) return;
            list.appendChild(this.createFieldCard(name, select.value));
            Icons.load(list);
            input.value = "";
            select.selectedIndex = 0;
        };
    }

    createFieldCard(name, type, id) {
        const card = document.createElement("article");
        card.className = "template-field-card";
        const typeLabel =
            FIELD_TYPES.find(([value]) => value === type)?.[1] || type;
        card.innerHTML = `
            <div class="template-field-card-main">
                <strong data-name="${name}">${name}</strong>
                <span data-type="${type}">${typeLabel}</span>
            </div>
            <button type="button" class="field-remove" aria-label="Remove field"><i data-icon="trash"></i></button>`;
        if (id) {
            card.dataset.id = String(id);
        }
        card.querySelector(".field-remove").onclick = () => card.remove();
        return card;
    }

    async loadFields() {
        try {
            const res = await Request.get(Api.templateFields(this.id));
            const fields = Api.list(res);
            const list = this.form.querySelector(".field-list");
            list.innerHTML = "";
            fields.forEach((field) => {
                list.appendChild(
                    this.createFieldCard(field.name, field.type, field.id),
                );
            });
            Icons.load(list);
        } catch {
            /* optional */
        }
    }

    getFields() {
        return Array.from(
            this.form.querySelectorAll(".template-field-card"),
        ).map((card, index) => ({
            id: card.dataset.id ? Number(card.dataset.id) : undefined,
            name: card.querySelector("[data-name]")?.dataset.name || "",
            type: card.querySelector("[data-type]")?.dataset.type || "text",
            position: index,
        }));
    }

    async submitForm(event, modal) {
        event.preventDefault();
        const title = String(this.form.title.value || "").trim();
        if (!title) return Alert.error("Title is required");
        const fields = this.getFields();
        const tags = CreatorMeta.readTags(this.form);
        const data = new FormData(this.form);
        data.set("type", "template");
        data.set("title", title);
        data.set("description", String(this.form.description.value || "").trim());
        data.set("tags", JSON.stringify(tags));
        data.set("fields", JSON.stringify(fields.map(({ name, type }) => ({ name, type }))));
        const submitBtn = document.querySelector('button[form="template-form"]');
        const done = await CreatorMeta.withSubmitLock(submitBtn, async () => {
            if (this.method === "POST") {
                data.set(
                    "uuid",
                    crypto.randomUUID().replace(/-/g, "").slice(0, 16),
                );
                await Request.post(Api.posts, data);
                Alert.success("Template created");
            } else {
                const patchFields = fields.map(({ id, name, type }, position) => ({
                    id,
                    name,
                    type,
                    position,
                }));
                data.set("fields", JSON.stringify(patchFields));
                if (data.get("preview")?.size) {
                    await Request.patch(Api.post(this.id), data);
                } else {
                    await Request.patch(Api.post(this.id), {
                        title,
                        description: String(this.form.description.value || "").trim(),
                        tags,
                        fields: patchFields,
                    });
                }
                Alert.success("Template updated");
            }
            modal.close();
            await CreatorRegistry.reload();
            return true;
        });
        if (done === null) return;
    }
}

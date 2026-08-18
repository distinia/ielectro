import { Api } from "../core/api.js";
import { Alert, App, Box, Icons, Request } from "../core/index.js";
import { CreatorMeta } from "./creator-meta.js";
import { CreatorMedia } from "./creator-media.js";
import { CreatorModal } from "./creator-modal.js";
import { creatorTypeConfig, CREATOR_TYPES } from "./creator-types.js";
import { CreatorRegistry } from "./registry.js";
import { refreshCreatorStats } from "./creator-stats.js";
const FIELD_TYPES = [
    ["text", "Text"],
    ["definition", "Definition"],
    ["single-image", "Single image (50%)"],
    ["large-image", "Large image (100%)"],
    ["double-image", "Double image"],
    ["double-column", "Double column"],
    ["double-column-extended", "Double column extended"],
];
export class CreatorEditor {
    static open(post, method = "POST") {
        new CreatorEditor(post, method).show();
    }
    constructor(post, method) {
        this.post = post;
        this.method = method;
        this.item = post.item || {};
        this.type =
            method === "PUT"
                ? String(this.item.type || post.constructor.type)
                : String(
                      CreatorRegistry.activeClass()?.type ||
                          post.constructor.type ||
                          "article",
                  );
        this.config = creatorTypeConfig(this.type);
        this.modal = null;
        this.form = null;
        this.dragCard = null;
    }
    async show() {
        const locked = this.method === "PUT";
        const headerActions = CreatorModal.headerActions({
            formId: "creator-form",
            showChoose: this.config.showPreview,
            submitAction: this.needsUploadAction() ? "upload" : "save",
        });
        this.modal = new Box(this.method === "POST" ? "Create" : "Edit", {
            variant: "creator",
            help: this.config.help,
            hideFooter: true,
            headerLayout: "creator",
            headerActions,
        });
        await this.modal.create();
        this.mountBody(locked);
        await this.bindHeader();
        this.bindForm();
        this.applyType(this.type, { initial: true });
        if (this.method === "PUT") {
            this.showExistingPreview();
            if (this.type === "template" && this.post.id) {
                await this.loadFields();
            }
        }
    }
    mountBody(typeLocked) {
        const allowComments = this.item.allow_comments !== false;
        this.modal.body((body) => {
            body.innerHTML = `
            <form id="creator-form" class="creator-form creator-editor-form" enctype="multipart/form-data">
                <div class="creator-editor-layout">
                    <section class="creator-preview-col">
                        <input type="file" id="creator-file-media" name="media" hidden>
                        <input type="file" id="creator-file-preview" name="preview" accept="image/*" hidden>
                        <div class="media-file-preview"></div>
                    </section>
                    <section class="creator-meta-col">
                        ${CreatorMeta.optionsHtml({
                            type: this.type,
                            typeLocked,
                            allowComments,
                        })}
                        ${CreatorMeta.fieldHtml({
                            title: this.item.title,
                            description: this.item.description,
                            tags: this.item.tags,
                        })}
                    </section>
                    <section class="creator-fields-col">
                        <div class="creator-fields-head">
                            <h3>Fields</h3>
                        </div>
                        <div class="template-field-add">
                            <input class="input field-input" name="field_label" data-preserve-case="true" placeholder="Field name">
                            <select class="select field-type">
                                ${FIELD_TYPES.map(
                                    ([value, label]) =>
                                        `<option value="${value}">${label}</option>`,
                                ).join("")}
                            </select>
                            <button type="button" class="button button-secondary field-add" aria-label="Add field" title="Add field"><span class="field-add-mark" aria-hidden="true">+</span></button>
                        </div>
                        <div class="template-field-list field-list"></div>
                    </section>
                </div>
            </form>`;
        });
        this.form = document.querySelector("#creator-form");
        CreatorMeta.bindTags(this.form);
        CreatorMeta.bindCharCount(this.form);
        this.bindFields();
        this.bindPreviewInput();
    }
    async bindHeader() {
        const headerActions = this.modal.container.querySelector(
            ".select-item-header-actions",
        );
        const chooseBtn = headerActions?.querySelector(".creator-choose-file");
        chooseBtn?.addEventListener("click", () => this.activeFileInput()?.click());
        const typeSelect = this.form.querySelector(".creator-type-select");
        if (typeSelect && this.method === "POST") {
            typeSelect.addEventListener("change", () => {
                this.applyType(typeSelect.value);
            });
        }
        await Icons.load(headerActions);
    }
    bindPreviewInput() {
        const mediaInput = this.form.querySelector("#creator-file-media");
        const previewInput = this.form.querySelector("#creator-file-preview");
        const preview = this.form.querySelector(".media-file-preview");
        const handler = (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                preview.innerHTML = "";
                return;
            }
            CreatorMedia.renderPreview(preview, URL.createObjectURL(file), file);
        };
        mediaInput?.addEventListener("change", handler);
        previewInput?.addEventListener("change", handler);
    }
    activeFileInput() {
        const field = this.config.fileField || "media";
        return this.form.querySelector(
            field === "preview" ? "#creator-file-preview" : "#creator-file-media",
        );
    }
    applyType(type, { initial = false } = {}) {
        this.type = type;
        this.config = creatorTypeConfig(type);
        this.form.dataset.type = type;
        const layout = this.form.querySelector(".creator-editor-layout");
        layout?.classList.toggle("is-template", type === "template");
        const fieldsCol = this.form.querySelector(".creator-fields-col");
        if (fieldsCol) {
            fieldsCol.hidden = type !== "template";
        }
        const typeSelect = this.form.querySelector(".creator-type-select");
        if (typeSelect && typeSelect.value !== type) {
            typeSelect.value = type;
        }
        const mediaInput = this.form.querySelector("#creator-file-media");
        const previewInput = this.form.querySelector("#creator-file-preview");
        if (mediaInput) {
            mediaInput.accept = this.mediaAccept();
            mediaInput.required =
                this.method === "POST" &&
                this.config.mediaOnCreate &&
                this.config.fileField === "media";
        }
        if (previewInput) {
            previewInput.required = false;
        }
        const helpBox = this.modal.container.querySelector(".select-item-help-box");
        if (helpBox) {
            helpBox.innerHTML = this.config.help;
        }
        const submitBtn = this.modal.container.querySelector(".creator-submit-btn");
        if (submitBtn) {
            const upload = this.needsUploadAction();
            submitBtn.dataset.label = upload ? "Upload" : "Save";
            submitBtn.dataset.icon = upload ? "upload" : "check";
            submitBtn.setAttribute("aria-label", upload ? "Upload" : "Save");
            submitBtn.setAttribute("title", upload ? "Upload" : "Save");
            submitBtn.innerHTML = `<i data-icon="${upload ? "upload" : "check"}"></i>`;
            Icons.load(submitBtn);
        }
        const chooseBtn = this.modal.container.querySelector(".creator-choose-file");
        if (chooseBtn) {
            chooseBtn.hidden = !this.config.showPreview;
        }
        if (!initial && this.method === "POST") {
            this.form.querySelector(".media-file-preview").innerHTML = "";
            if (mediaInput) mediaInput.value = "";
            if (previewInput) previewInput.value = "";
        }
        if (type === "article") {
            this.showArticleDefaultPreview();
        }
        this.modal.box?.classList.toggle(
            "select-item-box--template",
            type === "template",
        );
    }
    readAllowComments() {
        return !!this.form.querySelector('[name="allow_comments"]')?.checked;
    }
    payloadExtras() {
        return { allow_comments: this.readAllowComments() };
    }
    mediaAccept() {
        if (this.type === "template") {
            return "image/*";
        }
        return this.config.accept;
    }
    needsUploadAction() {
        return this.method === "POST" && this.config.mediaOnCreate;
    }
    showArticleDefaultPreview() {
        const preview = this.form?.querySelector(".media-file-preview");
        if (!preview) return;
        CreatorMedia.renderPreview(preview, App.defaultPostPreview(), {
            type: "article",
            name: "Default preview",
        });
    }
    showExistingPreview() {
        if (this.type === "article") {
            const item = App.enrichPost(this.item);
            const media = String(item.preview_image || item.preview || "");
            if (
                media &&
                !media.includes("default-post.jpg") &&
                !/\.html(\?|#|$)/i.test(media) &&
                !/\/article\//i.test(media)
            ) {
                const stamp = item.updated_at
                    ? `?t=${new Date(item.updated_at).getTime()}`
                    : "";
                CreatorMedia.renderPreview(
                    this.form.querySelector(".media-file-preview"),
                    `${media}${stamp}`,
                    { type: "article", name: item.title || "Cover" },
                );
                return;
            }
            this.showArticleDefaultPreview();
            return;
        }
        const preview = this.form.querySelector(".media-file-preview");
        const item = App.enrichPost(this.item);
        let media = "";
        if (this.type === "template") {
            media = item.preview_image || item.preview || "";
        } else {
            media = item.media || item.preview_image || item.preview || "";
        }
        if (!preview || !media || String(media).includes("default-post.jpg")) {
            return;
        }
        const stamp = item.updated_at
            ? `?t=${new Date(item.updated_at).getTime()}`
            : "";
        const url = `${media}${stamp}`;
        CreatorMedia.renderPreview(preview, url, {
            type: this.type,
            name: item.title || "Current file",
        });
    }
    bindFields() {
        const button = this.form.querySelector(".field-add");
        const input = this.form.querySelector(".field-input");
        const select = this.form.querySelector(".field-type");
        const list = this.form.querySelector(".field-list");
        button?.addEventListener("click", async (event) => {
            event.preventDefault();
            const name = input.value.trim();
            if (!name) return;
            const lowerName = name.toLowerCase();
            let type = select.value;
            if (/\blogo\b/.test(lowerName)) {
                type = "single-image";
            } else if (/\bmap\b/.test(lowerName)) {
                type = "large-image";
            }
            const card = this.createFieldCard(name, type);
            list.appendChild(card);
            await Icons.load(card);
            input.value = "";
            select.selectedIndex = 0;
        });
        this.bindFieldDrag(list);
        Icons.load(this.form.querySelector(".template-field-add"));
    }
    createFieldCard(name, type, id) {
        const card = document.createElement("article");
        card.className = "template-field-card";
        const typeLabel =
            FIELD_TYPES.find(([value]) => value === type)?.[1] || type;
        card.innerHTML = `
            <button type="button" class="field-drag" aria-label="Drag to reorder" title="Drag to reorder"><i data-icon="grip-vertical"></i></button>
            <div class="template-field-card-main">
                <strong data-name="${name}">${name}</strong>
                <span data-type="${type}">${typeLabel}</span>
            </div>
            <button type="button" class="field-remove" aria-label="Remove field"><i data-icon="trash"></i></button>`;
        if (id) {
            card.dataset.id = String(id);
        }
        card.querySelector(".field-remove").onclick = () => card.remove();
        const drag = card.querySelector(".field-drag");
        drag.draggable = true;
        drag.addEventListener("dragstart", (event) => {
            this.dragCard = card;
            card.classList.add("is-dragging");
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", card.dataset.id || "field");
        });
        return card;
    }
    bindFieldDrag(list) {
        if (!list || list.dataset.dragBound === "1") return;
        list.dataset.dragBound = "1";
        list.addEventListener("dragend", () => {
            this.dragCard?.classList.remove("is-dragging");
            this.dragCard = null;
            list.querySelectorAll(".template-field-card").forEach((card) => {
                card.classList.remove("is-drop-target");
            });
        });
        list.addEventListener("dragover", (event) => {
            event.preventDefault();
            if (!this.dragCard) return;
            event.dataTransfer.dropEffect = "move";
            const target = event.target.closest(".template-field-card");
            list.querySelectorAll(".template-field-card").forEach((card) => {
                card.classList.toggle("is-drop-target", card === target);
            });
        });
        list.addEventListener("drop", (event) => {
            event.preventDefault();
            const target = event.target.closest(".template-field-card");
            if (!this.dragCard || !target || target === this.dragCard) return;
            const rect = target.getBoundingClientRect();
            const after = event.clientY > rect.top + rect.height / 2;
            if (after) {
                target.after(this.dragCard);
            } else {
                target.before(this.dragCard);
            }
        });
    }
    async loadFields() {
        try {
            const res = await Request.get(Api.templateFields(this.post.id));
            const fields = Api.list(res);
            const list = this.form.querySelector(".field-list");
            list.innerHTML = "";
            fields.forEach((field) => {
                list.appendChild(
                    this.createFieldCard(field.name, field.type, field.id),
                );
            });
            await Icons.load(list);
            this.bindFieldDrag(list);
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
    bindForm() {
        const submitBtn = this.modal.container.querySelector(".creator-submit-btn");
        this.form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const title = String(this.form.title.value || "").trim();
            if (!title) return Alert.error("Title is required");
            const tags = CreatorMeta.readTags(this.form);
            if (!CreatorMeta.validateTags(tags)) return;
            if (!CreatorMeta.validateDescription(this.form.description?.value)) {
                return;
            }
            const done = await CreatorMeta.withSubmitLock(submitBtn, async () => {
                if (this.method === "POST") {
                    await this.submitCreate(title, tags);
                } else {
                    await this.submitUpdate(title, tags);
                }
                this.modal.close();
                await CreatorRegistry.reload();
                await refreshCreatorStats();
                return true;
            });
            if (done === null) return;
        });
    }
    async submitCreate(title, tags) {
        const uuid = crypto.randomUUID();
        const extras = this.payloadExtras();
        if (this.type === "article") {
            await Request.post(Api.posts, {
                type: "article",
                title,
                description: String(this.form.description.value || "").trim(),
                tags,
                uuid,
                ...extras,
            });
            return;
        }
        if (this.type === "template") {
            const fields = this.getFields();
            const data = new FormData(this.form);
            data.set("type", "template");
            data.set("uuid", uuid);
            data.set("title", title);
            data.set("description", String(this.form.description.value || "").trim());
            data.set("tags", JSON.stringify(tags));
            data.set("allow_comments", extras.allow_comments ? "1" : "0");
            data.set(
                "fields",
                JSON.stringify(fields.map(({ name, type }) => ({ name, type }))),
            );
            await Request.post(Api.posts, data);
            return;
        }
        const file = this.activeFileInput()?.files?.[0];
        if (!file) {
            throw { text: "Choose a file first" };
        }
        if (this.config.maxBytes && file.size > this.config.maxBytes) {
            const limit = Math.round(this.config.maxBytes / 1048576);
            throw { text: `File exceeds the ${limit} MB limit` };
        }
        const data = new FormData(this.form);
        data.set("type", this.type);
        data.set("title", title);
        data.set("description", String(this.form.description.value || "").trim());
        data.set("uuid", uuid);
        data.set("tags", JSON.stringify(tags));
        data.set("allow_comments", extras.allow_comments ? "1" : "0");
        await Request.post(Api.posts, data);
    }
    async submitUpdate(title, tags) {
        const id = this.post.id;
        if (!id) throw { text: "Missing item id" };
        const extras = this.payloadExtras();
        if (this.type === "template") {
            const fields = this.getFields();
            const patchFields = fields.map(({ id: fieldId, name, type }, position) => ({
                id: fieldId,
                name,
                type,
                position,
            }));
            const data = new FormData(this.form);
            data.set("title", title);
            data.set("description", String(this.form.description.value || "").trim());
            data.set("tags", JSON.stringify(tags));
            data.set("allow_comments", extras.allow_comments ? "1" : "0");
            data.set("fields", JSON.stringify(patchFields));
            if (data.get("preview")?.size) {
                await Request.post(Api.post(id), data);
            } else {
                await Request.patch(Api.post(id), {
                    title,
                    description: String(this.form.description.value || "").trim(),
                    tags,
                    fields: patchFields,
                    ...extras,
                });
            }
            return;
        }
        if (this.type === "article") {
            await Request.patch(Api.post(id), {
                title,
                description: String(this.form.description.value || "").trim(),
                tags,
                ...extras,
            });
            return;
        }
        const file = this.activeFileInput()?.files?.[0];
        if (file) {
            if (this.config.maxBytes && file.size > this.config.maxBytes) {
                const limit = Math.round(this.config.maxBytes / 1048576);
                throw { text: `File exceeds the ${limit} MB limit` };
            }
            const data = new FormData(this.form);
            data.set("title", title);
            data.set("description", String(this.form.description.value || "").trim());
            data.set("tags", JSON.stringify(tags));
            data.set("allow_comments", extras.allow_comments ? "1" : "0");
            // POST: PHP does not populate $_FILES on PATCH multipart.
            await Request.post(Api.post(id), data);
            return;
        }
        await Request.patch(Api.post(id), {
            title,
            description: String(this.form.description.value || "").trim(),
            tags,
            ...extras,
        });
    }
}
export { CREATOR_TYPES };

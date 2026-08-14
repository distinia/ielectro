import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";

import { Alert } from "../core/alert.js";

import { Api } from "../core/api.js";



export class AvatarEditor {

    constructor(user, onUpdated) {

        this.user = user;

        this.onUpdated = onUpdated;

        this.overlay = null;

        this.cropImage = null;

        this.objectUrl = null;

        this.baseScale = 1;

        this.offsetX = 0;

        this.offsetY = 0;

        this.dragging = false;

        this.lastX = 0;

        this.lastY = 0;

        this.viewport = 280;

        this.root = null;

        this.fileInput = null;

    }



    apiUrl(path) {

        return `${window.location.origin}/api/${path.replace(/^\/+/, "")}`;

    }



    initials() {
        const name =
            `${this.user?.name || ""} ${this.user?.surname || ""}`.trim() ||
            this.user?.username ||
            "?";
        return name
            .split(/\s+/)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    }



    avatarUrl(version = null) {

        const base = String(this.user?.avatar || "").split("?")[0];

        if (!base) return "";

        const token = version ?? Date.now();

        return `${base}?t=${token}`;

    }



    hasCustomAvatar() {

        return Boolean(this.user?.avatar_custom);

    }



    isImageFile(file) {
        if (!file) return false;
        const type = String(file.type || "").toLowerCase();
        if (type.startsWith("image/")) return true;
        return /\.(jpe?g|png|gif|webp|bmp|svg|avif)$/i.test(String(file.name || ""));
    }

    decodeImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Invalid image"));
            img.src = src;
        });
    }

    activateCrop(canvas, empty, hint, saveBtn, wrap) {
        const ready = () => {
            this.cropImage = canvas;
            empty.hidden = true;
            canvas.hidden = false;
            if (hint) hint.hidden = false;
            saveBtn.disabled = false;
            wrap?.classList.add("is-cropping");
            this.fitCrop();
        };
        if (canvas.complete && canvas.naturalWidth) {
            ready();
        } else {
            canvas.onload = ready;
        }
    }

    bind(root) {

        this.root = root;

        this.fileInput = root.querySelector(".profile-avatar-file");

        const trigger = root.querySelector(".profile-avatar-trigger");

        const removeBtn = root.querySelector(".profile-avatar-remove");



        trigger?.addEventListener("click", () => this.fileInput?.click());

        this.fileInput?.addEventListener("change", async () => {
            const file = this.fileInput.files?.[0];
            if (!file) return;
            this.fileInput.value = "";
            await this.openEditor(file);
        });



        removeBtn?.addEventListener("click", (event) => {

            event.preventDefault();

            this.removeAvatar();

        });



        this.syncDisplay();

    }



    setLoading(loading) {

        this.root?.querySelector(".profile-avatar-loading")?.toggleAttribute("hidden", !loading);

        if (this.root?.querySelector(".profile-avatar-trigger")) {

            this.root.querySelector(".profile-avatar-trigger").disabled = loading;

        }

    }



    syncDisplay() {

        if (!this.root) return;

        const img = this.root.querySelector(".profile-avatar");

        const fallback = this.root.querySelector(".profile-avatar-fallback");

        const removeBtn = this.root.querySelector(".profile-avatar-remove");

        const custom = this.hasCustomAvatar();



        if (fallback) {

            fallback.textContent = this.initials();

            fallback.hidden = custom;

        }

        if (img) {

            img.hidden = !custom;

            if (custom) {

                img.src = this.avatarUrl();

                img.onerror = () => {

                    img.hidden = true;

                    if (fallback) fallback.hidden = false;

                };

            }

        }

        if (removeBtn) {

            removeBtn.hidden = !custom;

        }

    }



    async openEditor(file = null) {
        this.closeEditor();

        let initialUrl = null;
        if (file && this.isImageFile(file)) {
            initialUrl = URL.createObjectURL(file);
            try {
                await this.decodeImage(initialUrl);
            } catch {
                URL.revokeObjectURL(initialUrl);
                Alert.error("Unable to load image");
                return;
            }
            this.objectUrl = initialUrl;
        }

        const hasImage = Boolean(initialUrl);

        this.overlay = document.createElement("div");
        this.overlay.className = "avatar-editor-overlay";
        this.overlay.innerHTML = `
            <div class="avatar-editor-modal" role="dialog" aria-modal="true" aria-label="Profile photo">
                <div class="avatar-editor-canvas-wrap${hasImage ? " is-cropping" : ""}">
                    <div class="avatar-editor-empty"${hasImage ? " hidden" : ""}>
                        <i data-icon="image"></i>
                        <p>Drop an image here or choose a file</p>
                        <label class="avatar-editor-pick">
                            Choose image
                            <input type="file" accept="image/*" hidden>
                        </label>
                    </div>
                    <img class="avatar-editor-canvas" alt=""${hasImage ? "" : " hidden"} draggable="false">
                </div>
                <p class="avatar-editor-hint"${hasImage ? "" : " hidden"}>Drag to reposition</p>
                <footer class="avatar-editor-actions">
                    <button type="button" class="avatar-editor-cancel">Cancel</button>
                    <button type="button" class="avatar-editor-save"${hasImage ? "" : " disabled"}>Save photo</button>
                </footer>
            </div>`;

        document.body.appendChild(this.overlay);
        Nesh.Html.setScrollEnabled(false);
        Nesh.Icons.load(this.overlay);

        const canvas = this.overlay.querySelector(".avatar-editor-canvas");
        const wrap = this.overlay.querySelector(".avatar-editor-canvas-wrap");
        const empty = this.overlay.querySelector(".avatar-editor-empty");
        const fileInput = this.overlay.querySelector('.avatar-editor-pick input[type="file"]');
        const saveBtn = this.overlay.querySelector(".avatar-editor-save");
        const hint = this.overlay.querySelector(".avatar-editor-hint");

        const close = () => this.closeEditor();
        this.overlay.querySelector(".avatar-editor-cancel")?.addEventListener("click", close);
        this.overlay.addEventListener("click", (event) => {
            if (event.target === this.overlay) close();
        });
        document.addEventListener(
            "keydown",
            (this._escHandler = (event) => {
                if (event.key === "Escape") close();
            }),
        );

        const loadFile = (nextFile) => {
            if (!nextFile || !canvas || !this.isImageFile(nextFile)) return;
            if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = URL.createObjectURL(nextFile);
            canvas.onload = () => this.activateCrop(canvas, empty, hint, saveBtn, wrap);
            canvas.src = this.objectUrl;
        };

        const pickImage = (nextFile) => {
            if (!this.isImageFile(nextFile)) return;
            loadFile(nextFile);
        };

        fileInput?.addEventListener("change", () => {
            pickImage(fileInput.files?.[0]);
            if (fileInput) fileInput.value = "";
        });

        const onDragOver = (event) => {
            event.preventDefault();
            event.stopPropagation();
            wrap?.classList.add("is-dragover");
        };
        const onDrop = (event) => {
            event.preventDefault();
            event.stopPropagation();
            wrap?.classList.remove("is-dragover");
            pickImage(event.dataTransfer?.files?.[0]);
        };
        for (const target of [wrap, empty]) {
            target?.addEventListener("dragenter", onDragOver);
            target?.addEventListener("dragover", onDragOver);
            target?.addEventListener("drop", onDrop);
        }
        wrap?.addEventListener("dragleave", (event) => {
            if (!wrap?.contains(event.relatedTarget)) {
                wrap?.classList.remove("is-dragover");
            }
        });

        wrap?.addEventListener("click", (event) => {
            if (wrap?.classList.contains("is-cropping")) return;
            if (event.target.closest(".avatar-editor-pick")) return;
            fileInput?.click();
        });

        wrap?.addEventListener("pointerdown", (event) => {
            if (!wrap?.classList.contains("is-cropping")) return;
            event.preventDefault();
            this.dragging = true;
            this.lastX = event.clientX;
            this.lastY = event.clientY;
            wrap.setPointerCapture(event.pointerId);
        });
        wrap?.addEventListener("pointermove", (event) => {
            if (!this.dragging) return;
            event.preventDefault();
            this.offsetX += event.clientX - this.lastX;
            this.offsetY += event.clientY - this.lastY;
            this.lastX = event.clientX;
            this.lastY = event.clientY;
            this.clampOffset();
            this.applyTransform();
        });
        const endDrag = (event) => {
            if (!this.dragging) return;
            this.dragging = false;
            wrap?.releasePointerCapture(event.pointerId);
        };
        wrap?.addEventListener("pointerup", endDrag);
        wrap?.addEventListener("pointercancel", endDrag);

        saveBtn?.addEventListener("click", () => this.saveAvatar(saveBtn));

        if (hasImage && canvas) {
            canvas.src = initialUrl;
            this.activateCrop(canvas, empty, hint, saveBtn, wrap);
        }
    }



    fitCrop() {

        if (!this.cropImage) return;

        const naturalW = this.cropImage.naturalWidth;

        const naturalH = this.cropImage.naturalHeight;

        if (!naturalW || !naturalH) return;

        this.baseScale = Math.max(this.viewport / naturalW, this.viewport / naturalH);

        this.offsetX = 0;

        this.offsetY = 0;

        this.clampOffset();

        this.applyTransform();

    }



    scale() {

        return this.baseScale;

    }



    clampOffset() {

        if (!this.cropImage) return;

        const drawW = this.cropImage.naturalWidth * this.scale();

        const drawH = this.cropImage.naturalHeight * this.scale();

        const maxX = Math.max(0, (drawW - this.viewport) / 2);

        const maxY = Math.max(0, (drawH - this.viewport) / 2);

        this.offsetX = Math.min(maxX, Math.max(-maxX, this.offsetX));

        this.offsetY = Math.min(maxY, Math.max(-maxY, this.offsetY));

    }



    applyTransform() {

        if (!this.cropImage) return;

        const s = this.scale();

        this.cropImage.style.transform = `translate(calc(-50% + ${this.offsetX}px), calc(-50% + ${this.offsetY}px)) scale(${s})`;

    }



    async toBlob(size = 512) {

        const canvas = document.createElement("canvas");

        canvas.width = size;

        canvas.height = size;

        const ctx = canvas.getContext("2d");

        if (!ctx || !this.cropImage) throw new Error("Crop unavailable");

        const scale = this.scale();

        const sourceW = this.viewport / scale;

        const sourceH = this.viewport / scale;

        const sourceX = this.cropImage.naturalWidth / 2 - sourceW / 2 - this.offsetX / scale;

        const sourceY = this.cropImage.naturalHeight / 2 - sourceH / 2 - this.offsetY / scale;

        ctx.beginPath();

        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);

        ctx.clip();

        ctx.drawImage(this.cropImage, sourceX, sourceY, sourceW, sourceH, 0, 0, size, size);

        return new Promise((resolve, reject) => {

            canvas.toBlob(

                (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),

                "image/png",

                0.92,

            );

        });

    }



    async saveAvatar(button) {

        if (!this.cropImage?.src) return;

        button.disabled = true;

        this.setLoading(true);

        try {

            const blob = await this.toBlob();

            const data = new FormData();

            data.append("avatar", blob, "avatar.png");

            const response = await Nesh.Request.post(this.apiUrl("avatar"), data);

            const saved = Api.record(response);

            this.user.avatar = saved?.url || this.user.avatar;

            this.user.avatar_custom = saved?.avatar_custom ?? true;

            this.syncDisplay();

            this.onUpdated?.(this.user);

            this.closeEditor();

            Alert.success("Profile photo updated");

        } catch (error) {

            Alert.error(Api.errorMessage(error));

        } finally {

            button.disabled = false;

            this.setLoading(false);

        }

    }



    async removeAvatar() {

        if (!(await Alert.confirm("Remove your profile photo?"))) return;

        this.setLoading(true);

        try {

            const response = await Nesh.Request.delete(this.apiUrl("avatar"));

            const saved = Api.record(response);

            this.user.avatar = saved?.url || this.user.avatar;

            this.user.avatar_custom = saved?.avatar_custom ?? false;

            this.syncDisplay();

            this.onUpdated?.(this.user);

            Alert.success("Profile photo reset");

        } catch (error) {

            Alert.error(Api.errorMessage(error));

        } finally {

            this.setLoading(false);

        }

    }



    closeEditor() {

        if (this._escHandler) {

            document.removeEventListener("keydown", this._escHandler);

            this._escHandler = null;

        }

        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);

        this.objectUrl = null;

        this.overlay?.remove();

        this.overlay = null;

        this.cropImage = null;

        Nesh.Html.setScrollEnabled(true);

    }



    renderHtml() {

        const initials = Nesh.Html.escape(this.initials());

        const url = this.avatarUrl(0);

        const custom = this.hasCustomAvatar();



        return `
            <div class="profile-avatar-wrap">
                <input type="file" class="profile-avatar-file" accept="image/*" hidden>
                <button type="button" class="profile-avatar-trigger" aria-label="Change profile photo">
                    <span class="profile-avatar-fallback" ${custom ? "hidden" : ""}>${initials}</span>
                    <img class="profile-avatar" src="${Nesh.Html.escape(url)}" alt="" ${custom ? "" : "hidden"}>
                    <span class="profile-avatar-overlay">
                        <i data-icon="camera"></i>
                        <span>Change photo</span>
                    </span>
                    <span class="profile-avatar-loading" hidden aria-hidden="true"></span>
                </button>
                <button type="button" class="profile-avatar-remove" ${custom ? "" : "hidden"}>Remove photo</button>
            </div>`;

    }

}



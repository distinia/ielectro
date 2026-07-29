import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
import Alert from "../../components/alert/alert.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    new App();
    new ProfilePage();
});
class ProfilePage {
    constructor() {
        this.service = new ProfileService();
        this.validator = new ProfileValidator();
        this.view = new ProfileView(this.service);
        this.editor = new ProfileEditor(this.service, this.validator, this.view);
        this.avatar = new ProfileAvatar(this.service, this.view);
        this.init();
    }
    async init() {
        await this.validator.load();
        const user = await this.service.load();
        if (!user) return;
        this.view.render(user);
        this.editor.bind();
        this.avatar.bind();
    }
}
class ProfileService {
    constructor() {
        this.user = null;
        this.dataUrl = "https://account.ielectro.com/api/data";
        this.avatarUrl = "https://account.ielectro.com/api/update/avatar";
        this.updateUrls = {
            "full-name": "https://account.ielectro.com/api/update/full-name",
            birthday: "https://account.ielectro.com/api/update/birthday",
            gender: "https://account.ielectro.com/api/update/gender",
            email: "https://account.ielectro.com/api/update/email",
            username: "https://account.ielectro.com/api/update/uname",
            password: "https://account.ielectro.com/api/update/password",
        };
    }
    async load() {
        try {
            const response = await Nesh.Request.get(this.dataUrl);
            if (!response?.data) return null;
            this.user = response.data;
            return this.user;
        } catch (error) {
            if (error?.text) Alert.error(error.text);
            return null;
        }
    }
    async refresh() {
        return await this.load();
    }
    getUser() {
        return this.user;
    }
    getAvatar() {
        const stamp = Date.now();
        if (this.user?.avatar)
            return `${this.user.avatar}${this.user.avatar.includes("?") ? "&" : "?"}v=${stamp}`;
        return "https://account.ielectro.com/default/avatar.png";
    }
    async update(field, formData) {
        if (!this.updateUrls[field]) {
            throw { text: "Invalid update field" };
        }
        return await Nesh.Request.post(this.updateUrls[field], formData);
    }
    async updateAvatar(formData) {
        return await Nesh.Request.post(this.avatarUrl, formData);
    }
    async removeAvatar() {
        return await Nesh.Request.post(this.avatarUrl, new FormData());
    }
}
class ProfileValidator {
    constructor() {
        this.rules = null;
        this.url = "https://account.ielectro.com/data/authentication.json";
    }
    async load() {
        try {
            this.rules = await Nesh.Request.get(this.url);
        } catch (error) {
            if (error?.text) Alert.error(error.text);
        }
    }
    getRule(field) {
        if (!this.rules) return null;
        return this.rules[field] || null;
    }
    validateField(field, value) {
        const rule = this.getRule(field);
        if (!rule) return true;
        const pattern = new RegExp(rule.pattern);
        pattern.lastIndex = 0;
        return pattern.test(value);
    }
    error(field) {
        const rule = this.getRule(field);
        return rule?.errorMessage || "Invalid field";
    }
    validate(field, formData) {
        const map = this.getFieldErrors(field, formData);
        if (!map || Object.keys(map).length === 0) return null;
        return map[Object.keys(map)[0]];
    }
    getFieldErrors(field, formData) {
        const errors = {};
        if (field === "full-name") {
            const name = String(formData.get("name") || "").trim();
            const surname = String(formData.get("surname") || "").trim();
            if (!name) errors.name = this.error("name");
            else if (!this.validateField("name", name))
                errors.name = this.error("name");
            if (!surname) errors.surname = this.error("surname");
            else if (!this.validateField("surname", surname))
                errors.surname = this.error("surname");
            return errors;
        }
        if (field === "password") {
            const currentPassword = String(
                formData.get("current-password") || "",
            ).trim();
            const password = String(formData.get("password") || "").trim();
            const confirmPassword = String(
                formData.get("confirm-password") || "",
            ).trim();
            if (!currentPassword)
                errors["current-password"] = "Please insert your current password";
            if (!password) errors.password = this.error("password");
            else if (!this.validateField("password", password))
                errors.password = this.error("password");
            if (!confirmPassword)
                errors["confirm-password"] = "Please confirm your password";
            else if (password && confirmPassword && password !== confirmPassword)
                errors["confirm-password"] = "Passwords do not match";
            return errors;
        }
        const value = String(formData.get(field) || "").trim();
        if (!value) errors[field] = this.error(field);
        else if (!this.validateField(field, value))
            errors[field] = this.error(field);
        return errors;
    }
}
class ProfileView {
    constructor(service) {
        this.service = service;
        this.avatar = document.querySelector(".profile-avatar");
        this.fullName = document.querySelector("#full-name");
        this.birthday = document.querySelector("#birthday");
        this.gender = document.querySelector("#gender");
        this.email = document.querySelector("#email");
        this.username = document.querySelector("#username");
    }
    render(user) {
        if (!user) return;
        this.renderAvatar(
            user.avatar ||
            `https://account.ielectro.com/u/${user.username}/avatar.png`,
        );
        this.setText(
            this.fullName,
            `${user.name || ""} ${user.surname || ""}`.trim(),
        );
        this.setText(this.birthday, this.formatDate(user.birthday));
        this.setText(this.gender, this.formatGender(user.gender || ""));
        this.setText(this.email, user.email || "");
        this.setText(this.username, user.username || "");
    }
    renderAvatar(url) {
        if (!this.avatar) return;
        const base = String(url || "").split("?")[0];
        this.avatar.style.backgroundImage = `url(${base}?v=${Date.now()})`;
    }
    setText(element, value) {
        if (!element) return;
        element.textContent = value;
    }
    formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    }
    formatGender(value) {
        const gender = String(value).toLowerCase();
        if (!gender) return "";
        return gender.charAt(0).toUpperCase() + gender.slice(1);
    }
}
class ProfileEditor {
    constructor(service, validator, view) {
        this.service = service;
        this.validator = validator;
        this.view = view;
        this.modal = null;
    }
    bind() {
        document.querySelectorAll(".profile-row[data-field]").forEach((row) => {
            const field = row.dataset.field;
            if (field === "delete-account") return;
            const button = row.querySelector(".profile-action");
            if (!button) return;
            button.addEventListener("click", () => {
                this.open(field);
            });
        });
    }
    open(field) {
        const user = this.service.getUser();
        if (!user) return;
        this.close();
        this.modal = document.createElement("div");
        this.modal.className = "profile-modal-container";
        this.modal.innerHTML = ` <div class="profile-modal"> <div class="profile-modal-body"> <form class="profile-modal-form"> ${this.fields(field, user)} </form> </div> <div class="profile-modal-actions"> <button type="button" class="profile-modal-cancel">Cancel</button> <button type="button" class="profile-modal-update">Update</button> </div> </div> `;
        document.body.appendChild(this.modal);
        this.bindFormInputs();
        this.applyModalAutocompleteOff();
        if (field === "email" || field === "username") {
            this.bindLiveAvailability(field, user);
        }
        this.modal
            .querySelector(".profile-modal-cancel")
            .addEventListener("click", () => this.close());
        this.modal
            .querySelector(".profile-modal-update")
            .addEventListener("click", async (event) => {
                await this.save(field, event.currentTarget);
            });
        this.bindModalAuthClear();
    }
    bindModalAuthClear() {
        const form = this.modal?.querySelector(".profile-modal-form");
        if (!form) return;
        const clear = (target) => {
            if (target.matches?.("input, select")) {
                target.classList.remove("field-auth-error");
                target.removeAttribute("title");
            }
        };
        form.addEventListener("input", (e) => clear(e.target));
        form.addEventListener("change", (e) => clear(e.target));
    }
    fields(field, user) {
        switch (field) {
            case "full-name":
                return ` <input type="text" name="name" class="input-field" autocomplete="off" placeholder="Name" value="${Nesh.Html.escape(user.name || "")}"> <input type="text" name="surname" class="input-field" autocomplete="off" placeholder="Surname" value="${Nesh.Html.escape(user.surname || "")}"> `;
            case "birthday":
                return ` <input type="date" name="birthday" class="input-field" autocomplete="off" value="${Nesh.Html.escape(this.dateValue(user.birthday))}"> `;
            case "gender":
                return ` <select name="gender" class="select-field" autocomplete="off"> <option value="">Select gender</option> <option value="male" ${String(user.gender || "").toLowerCase() === "male" ? "selected" : ""}>Male</option> <option value="female" ${String(user.gender || "").toLowerCase() === "female" ? "selected" : ""}>Female</option> <option value="other" ${String(user.gender || "").toLowerCase() === "other" ? "selected" : ""}>Other</option> </select> `;
            case "email":
                return ` <input type="email" name="email" class="input-field" autocomplete="off" placeholder="Email" value="${Nesh.Html.escape(user.email || "")}"> `;
            case "username":
                return ` <input type="text" name="username" class="input-field" autocomplete="off" placeholder="Username" value="${Nesh.Html.escape(user.username || "")}"> `;
            case "password":
                return ` <input type="password" name="current-password" class="input-field" autocomplete="new-password" placeholder="Current password"> <input type="password" name="password" class="input-field" autocomplete="new-password" placeholder="New password"> <input type="password" name="confirm-password" class="input-field" autocomplete="new-password" placeholder="Confirm password"> `;
            default:
                return "";
        }
    }
    bindFormInputs() {
        this.modal.querySelectorAll(".input-field").forEach((input) => {
            input.addEventListener("input", () => {
                Nesh.Input.sanitize(input);
            });
        });
    }
    applyModalAutocompleteOff() {
        this.modal.querySelectorAll("input, select").forEach((el) => {
            if (!el.getAttribute("autocomplete")) {
                el.setAttribute("autocomplete", "off");
            }
        });
    }
    bindLiveAvailability(field, user) {
        const input = this.modal.querySelector(
            field === "email"
                ? '[name="email"]'
                : '[name="username"]',
        );
        if (!input) return;
        let timer;
        const run = async () => {
            const value = input.value.trim();
            input.classList.remove(
                "field-available",
                "field-taken",
                "field-unknown",
            );
            if (!value) return;
            try {
                const params = new URLSearchParams({
                    field,
                    value,
                    exclude:
                        field === "email" ? user.email || "" : user.username || "",
                });
                const response = await Nesh.Request.get(
                    `https://account.ielectro.com/api/auth/check-availability?${params.toString()}`,
                );
                const data = response?.data;
                if (data?.available === undefined) {
                    input.classList.add("field-unknown");
                    return;
                }
                input.classList.add(
                    data.available
                        ? "field-available"
                        : "field-taken",
                );
            } catch {
                input.classList.add("field-unknown");
            }
        };
        input.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(run, 400);
        });
        run();
    }
    clearModalFieldErrors(form) {
        form.querySelectorAll(".field-auth-error").forEach((el) => {
            el.classList.remove("field-auth-error");
            el.removeAttribute("title");
        });
    }
    applyModalFieldErrors(form, errors) {
        this.clearModalFieldErrors(form);
        Object.entries(errors).forEach(([name, message]) => {
            const el = form.querySelector(`[name="${name}"]`);
            if (!el) return;
            el.classList.add("field-auth-error");
            el.setAttribute("title", message);
        });
        const first = form.querySelector(".field-auth-error");
        if (first)
            Alert.error(
                first.getAttribute("title") || "Please check the highlighted fields",
            );
        else Alert.error("Please check the highlighted fields");
    }
    async save(field, button) {
        const form = this.modal.querySelector(".profile-modal-form");
        const formData = new FormData(form);
        const fieldErrors = this.validator.getFieldErrors(field, formData);
        if (Object.keys(fieldErrors).length > 0) {
            this.applyModalFieldErrors(form, fieldErrors);
            return;
        }
        button.disabled = true;
        try {
            const response = await this.service.update(field, formData);
            if (response?.text) {
                Alert.success(response.text);
            }
            const user = await this.service.refresh();
            this.view.render(user);
            this.close();
        } catch (errorResponse) {
            button.disabled = false;
            if (errorResponse?.text) {
                Alert.error(errorResponse.text);
            }
        }
    }
    dateValue(value) {
        if (!value) return "";
        return String(value).split(" ")[0];
    }
    close() {
        if (!this.modal) return;
        this.modal.remove();
        this.modal = null;
    }
}
class ProfileAvatar {
    constructor(service, view) {
        this.service = service;
        this.view = view;
        this.avatar = document.querySelector(".profile-avatar");
        this.editorOverlay = null;
        this.jpegQuality = 0.9;
    }
    bind() {
        if (!this.avatar) return;
        this.avatar.addEventListener("click", (event) => {
            event.stopPropagation();
            this.openAvatarEditor();
        });
        this.avatar.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                this.openAvatarEditor();
            }
        });
    }
    closeAvatarEditor() {
        if (!this.editorOverlay) return;
        this.editorOverlay.remove();
        this.editorOverlay = null;
    }
    renderCroppedBlob(img, panX, panY, zoom, size) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#f1f5f9";
            ctx.fillRect(0, 0, size, size);
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            const contain = Math.min(
                size / img.naturalWidth,
                size / img.naturalHeight,
            );
            const s = contain * zoom;
            const w = img.naturalWidth * s;
            const h = img.naturalHeight * s;
            ctx.drawImage(
                img,
                size / 2 + panX - w / 2,
                size / 2 + panY - h / 2,
                w,
                h,
            );
            ctx.restore();
            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Could not create image"));
                },
                "image/jpeg",
                this.jpegQuality,
            );
        });
    }
    openAvatarEditor() {
        this.closeAvatarEditor();
        const overlay = document.createElement("div");
        overlay.className = "avatar-editor-overlay";
        overlay.innerHTML = ` <div class="avatar-editor-modal" role="dialog" aria-labelledby="avatar-editor-title"> <h3 id="avatar-editor-title">Change avatar</h3> <div class="avatar-editor-canvas-wrap"> <canvas class="avatar-editor-canvas" width="280" height="280" aria-label="Avatar preview"></canvas> </div> <p class="avatar-editor-hint">Drag to reposition. Scroll to zoom.</p> <div class="avatar-editor-zoom-row"> <label for="avatar-zoom-range">Zoom</label> <input type="range" id="avatar-zoom-range" class="avatar-editor-zoom" min="1" max="3" step="0.02" value="1"> </div> <input type="file" class="avatar-editor-file" accept="image/*" hidden> <button type="button" class="avatar-editor-pick">Choose image</button> <div class="avatar-editor-actions"> <button type="button" class="avatar-editor-remove">REMOVE AVATAR</button> <button type="button" class="avatar-editor-cancel">Cancel</button> <button type="button" class="avatar-editor-save" disabled>Save avatar</button> </div> </div> `;
        document.body.appendChild(overlay);
        this.editorOverlay = overlay;
        const modal = overlay.querySelector(".avatar-editor-modal");
        const canvas = overlay.querySelector(".avatar-editor-canvas");
        const ctx = canvas.getContext("2d");
        const fileInput = overlay.querySelector(".avatar-editor-file");
        const zoomRange = overlay.querySelector(".avatar-editor-zoom");
        const saveBtn = overlay.querySelector(".avatar-editor-save");
        const wrap = overlay.querySelector(".avatar-editor-canvas-wrap");
        const D = 280;
        let img = null;
        let panX = 0;
        let panY = 0;
        let zoom = 1;
        let drag = null;
        const draw = () => {
            if (!img) {
                ctx.clearRect(0, 0, D, D);
                ctx.fillStyle = "#f1f5f9";
                ctx.fillRect(0, 0, D, D);
                return;
            }
            ctx.clearRect(0, 0, D, D);
            ctx.fillStyle = "#f1f5f9";
            ctx.fillRect(0, 0, D, D);
            ctx.save();
            ctx.beginPath();
            ctx.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2);
            ctx.clip();
            const contain = Math.min(D / img.naturalWidth, D / img.naturalHeight);
            const sc = contain * zoom;
            const w = img.naturalWidth * sc;
            const h = img.naturalHeight * sc;
            ctx.drawImage(img, D / 2 + panX - w / 2, D / 2 + panY - h / 2, w, h);
            ctx.restore();
            ctx.strokeStyle = "rgba(37, 99, 235, 0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(D / 2, D / 2, D / 2 - 1, 0, Math.PI * 2);
            ctx.stroke();
        };
        const onMove = (e) => {
            if (!drag || !img) return;
            panX = drag.ox + (e.clientX - drag.sx);
            panY = drag.oy + (e.clientY - drag.sy);
            draw();
        };
        const onUp = () => {
            drag = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        wrap.addEventListener("mousedown", (e) => {
            if (!img) return;
            e.preventDefault();
            drag = { sx: e.clientX, sy: e.clientY, ox: panX, oy: panY };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });
        wrap.addEventListener(
            "wheel",
            (e) => {
                if (!img) return;
                e.preventDefault();
                const factor = e.deltaY < 0 ? 1.05 : 0.95;
                zoom = Math.min(3, Math.max(1, zoom * factor));
                zoomRange.value = String(zoom);
                draw();
            },
            { passive: false },
        );
        zoomRange.addEventListener("input", () => {
            zoom = parseFloat(zoomRange.value) || 1;
            draw();
        });
        const loadAvatarImage = (url) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                img = image;
                panX = 0;
                panY = 0;
                zoom = 1;
                zoomRange.value = "1";
                saveBtn.disabled = false;
                draw();
            };
            image.onerror = () => {
                draw();
            };
            image.src = url;
        };
        loadAvatarImage(this.service.getAvatar());
        fileInput.addEventListener("change", () => {
            const f = fileInput.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
                const image = new Image();
                image.onload = () => {
                    img = image;
                    panX = 0;
                    panY = 0;
                    zoom = 1;
                    zoomRange.value = "1";
                    saveBtn.disabled = false;
                    draw();
                };
                image.onerror = () => Alert.error("Invalid image");
                image.src = reader.result;
            };
            reader.readAsDataURL(f);
            fileInput.value = "";
        });
        overlay
            .querySelector(".avatar-editor-pick")
            .addEventListener("click", () => fileInput.click());
        overlay
            .querySelector(".avatar-editor-cancel")
            .addEventListener("click", () => this.closeAvatarEditor());
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) this.closeAvatarEditor();
        });
        modal.addEventListener("click", (e) => e.stopPropagation());
        overlay
            .querySelector(".avatar-editor-remove")
            .addEventListener("click", async () => {
                this.closeAvatarEditor();
                await this.remove();
            });
        saveBtn.addEventListener("click", async () => {
            if (!img) {
                Alert.error("No image to save");
                return;
            }
            saveBtn.disabled = true;
            try {
                const blob = await this.renderCroppedBlob(img, panX, panY, zoom, 512);
                const formData = new FormData();
                formData.append("avatar", blob, "avatar.jpg");
                const response = await this.service.updateAvatar(formData);
                if (response?.text) Alert.success(response.text);
                await this.service.refresh();
                this.view.renderAvatar(this.service.getAvatar());
                this.closeAvatarEditor();
            } catch (error) {
                if (error?.text) Alert.error(error.text);
                else Alert.error(error?.message || "Upload failed");
                saveBtn.disabled = false;
            }
        });
        draw();
    }
    async remove() {
        try {
            const response = await this.service.removeAvatar();
            const user = await this.service.refresh();
            this.view.renderAvatar(this.service.getAvatar());
            if (response?.text) {
                Alert.success(response.text);
            }
            if (user) {
                this.view.render(user);
            }
        } catch (error) {
            if (error?.text) {
                Alert.error(error.text);
            }
        }
    }
}

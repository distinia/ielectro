import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";

export class ProfileEditor {
    constructor(service, validator, view) {
        this.service = service;
        this.validator = validator;
        this.view = view;
        this.modal = null;
    }
    bind() {
        if (this.bound) return;
        this.bound = true;
        this.view.root.addEventListener("click", (event) => {
            const button = event.target.closest(".profile-action");
            if (!button || !this.view.root.contains(button)) return;
            const row = button.closest(".profile-row[data-field]");
            if (!row?.dataset.field) return;
            this.open(row.dataset.field);
        });
    }
    open(field) {
        const user = this.service.getUser();
        if (!user) return;
        this.close();
        this.modal = document.createElement("div");
        this.modal.className = "profile-modal-container";
        this.modal.innerHTML = `<div class="profile-modal"><div class="profile-modal-body"><form class="profile-modal-form">${this.fields(field, user)}</form></div><div class="profile-modal-actions"><button type="button" class="profile-modal-cancel">Cancel</button><button type="button" class="profile-modal-update">Update</button></div></div>`;
        document.body.appendChild(this.modal);
        this.bindFormInputs();
        if (field === "email" || field === "username") {
            this.bindLiveAvailability(field);
        }
        this.modal.querySelector(".profile-modal-cancel").addEventListener("click", () => this.close());
        this.modal.querySelector(".profile-modal-update").addEventListener("click", async (event) => {
            await this.save(field, event.currentTarget);
        });
    }
    fields(field, user) {
        switch (field) {
            case "full-name":
                return `<input type="text" name="name" class="input-field" autocomplete="off" placeholder="Name" value="${Nesh.Html.escape(user.name || "")}"><input type="text" name="surname" class="input-field" autocomplete="off" placeholder="Surname" value="${Nesh.Html.escape(user.surname || "")}">`;
            case "birthday":
                return `<input type="date" name="birthday" class="input-field" autocomplete="off" value="${Nesh.Html.escape(this.dateValue(user.birthday))}">`;
            case "gender":
                return `<select name="gender" class="select-field" autocomplete="off"><option value="">Select gender</option><option value="Male" ${String(user.gender || "") === "Male" ? "selected" : ""}>Male</option><option value="Female" ${String(user.gender || "") === "Female" ? "selected" : ""}>Female</option><option value="Other" ${String(user.gender || "") === "Other" ? "selected" : ""}>Other</option></select>`;
            case "email":
                return `<input type="email" name="email" class="input-field" autocomplete="off" placeholder="Email" value="${Nesh.Html.escape(user.email || "")}">`;
            case "username":
                return `<input type="text" name="username" class="input-field" autocomplete="off" placeholder="Username" value="${Nesh.Html.escape(user.username || "")}">`;
            case "password":
                if (user.has_password) {
                    return `<input type="password" name="current-password" class="input-field" autocomplete="current-password" placeholder="Current password"><input type="password" name="password" class="input-field" autocomplete="new-password" placeholder="New password"><input type="password" name="confirm-password" class="input-field" autocomplete="new-password" placeholder="Confirm password">`;
                }
                return `<input type="password" name="password" class="input-field" autocomplete="new-password" placeholder="Password"><input type="password" name="confirm-password" class="input-field" autocomplete="new-password" placeholder="Confirm password">`;
            default:
                return "";
        }
    }
    bindFormInputs() {
        this.modal.querySelectorAll(".input-field, .select-field").forEach((input) => {
            input.addEventListener("input", () => Nesh.Input.sanitize(input));
        });
    }
    bindLiveAvailability(field) {
        const input = this.modal.querySelector(`[name="${field}"]`);
        if (!input) return;
        let timer;
        const run = async () => {
            const value = input.value.trim();
            input.classList.remove("field-available", "field-taken", "field-unknown");
            if (!value) return;
            try {
                const response = await Nesh.Request.post(
                    "https://account.ielectro.com/api/availability",
                    { field, value },
                );
                const data = Api.record(response);
                if (data?.available === undefined) {
                    input.classList.add("field-unknown");
                    return;
                }
                input.classList.add(data.available ? "field-available" : "field-taken");
            } catch {
                input.classList.add("field-unknown");
            }
        };
        input.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(run, 400);
        });
    }
    async save(field, button) {
        const form = this.modal.querySelector(".profile-modal-form");
        const formData = new FormData(form);
        const fieldErrors = this.validator.getFieldErrors(
            field,
            formData,
            this.service.getUser(),
        );
        if (Object.keys(fieldErrors).length > 0) {
            Alert.error(Object.values(fieldErrors)[0]);
            return;
        }
        button.disabled = true;
        try {
            const response = await this.service.update(field, formData);
            Alert.success(Api.message(response) || "Account updated");
            const user = await this.service.refresh();
            this.view.render(user);
            this.close();
            if (field === "email") {
                await this.promptEmailVerification();
            }
        } catch (error) {
            button.disabled = false;
            Alert.error(Api.errorMessage(error));
        }
    }
    async promptEmailVerification() {
        this.close();
        this.modal = document.createElement("div");
        this.modal.className = "profile-modal-container";
        this.modal.innerHTML = `<div class="profile-modal"><div class="profile-modal-body"><p class="profile-modal-note">We sent a verification code to your new email address. Enter it below to activate the change.</p><form class="profile-modal-form"><input type="text" name="otp" class="input-field" autocomplete="one-time-code" placeholder="Verification code" inputmode="numeric" maxlength="6"></form></div><div class="profile-modal-actions"><button type="button" class="profile-modal-cancel">Cancel</button><button type="button" class="profile-modal-update">Verify</button></div></div>`;
        document.body.appendChild(this.modal);
        this.bindFormInputs();
        this.modal.querySelector(".profile-modal-cancel").addEventListener("click", () => this.close());
        this.modal.querySelector(".profile-modal-update").addEventListener("click", async (event) => {
            await this.confirmEmailVerification(event.currentTarget);
        });
    }
    async confirmEmailVerification(button) {
        const otp = String(
            new FormData(this.modal.querySelector(".profile-modal-form")).get("otp") || "",
        ).trim();
        if (!otp) {
            Alert.error("Verification code is required");
            return;
        }
        button.disabled = true;
        try {
            const response = await this.service.confirmEmail(otp);
            Alert.success(Api.message(response) || "Email verified successfully");
            const user = await this.service.refresh();
            this.view.render(user);
            this.close();
        } catch (error) {
            button.disabled = false;
            Alert.error(Api.errorMessage(error));
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

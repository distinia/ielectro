import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";
import { Alert } from "../core/alert.js";

export class ProfileService {
    constructor() {
        this.user = null;
    }
    userUrl() {
        return "https://account.ielectro.com/api/user";
    }
    async load() {
        try {
            const response = await Nesh.Request.get(this.userUrl());
            this.user = Api.record(response);
            return this.user;
        } catch (error) {
            Alert.error(Api.errorMessage(error));
            return null;
        }
    }
    async refresh() {
        return await this.load();
    }
    getUser() {
        return this.user;
    }
    patchBody(field, formData) {
        if (field === "full-name") {
            return {
                name: String(formData.get("name") || "").trim(),
                surname: String(formData.get("surname") || "").trim(),
            };
        }
        if (field === "birthday") {
            return { birthday: String(formData.get("birthday") || "").trim() };
        }
        if (field === "gender") {
            const value = String(formData.get("gender") || "").trim();
            return {
                gender:
                    value.charAt(0).toUpperCase() +
                    value.slice(1).toLowerCase(),
            };
        }
        if (field === "email") {
            return { email: String(formData.get("email") || "").trim() };
        }
        if (field === "username") {
            return { username: String(formData.get("username") || "").trim() };
        }
        if (field === "password") {
            const body = {
                password: String(formData.get("password") || "").trim(),
                confirm_password: String(
                    formData.get("confirm-password") || "",
                ).trim(),
            };
            const currentPassword = String(
                formData.get("current-password") || "",
            ).trim();
            if (currentPassword !== "") {
                body.current_password = currentPassword;
            }
            return body;
        }
        throw { text: "Invalid update field" };
    }
    async confirmEmail(otp) {
        return await Nesh.Request.post(
            "https://account.ielectro.com/api/verification/confirm",
            { otp },
        );
    }
    async update(field, formData) {
        return await Nesh.Request.patch(
            this.userUrl(),
            this.patchBody(field, formData),
        );
    }
}

import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";

export class ProfileValidator {
    constructor() {
        this.rules = null;
    }
    async load() {
        try {
            this.rules = await Nesh.Request.get(
                "https://account.ielectro.com/data/authentication.json",
            );
        } catch (error) {
            Alert.error(typeof error === "string" ? error : "Unable to load validation rules");
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
    getFieldErrors(field, formData, user = null) {
        const errors = {};
        if (field === "full-name") {
            const name = String(formData.get("name") || "").trim();
            const surname = String(formData.get("surname") || "").trim();
            if (!name) errors.name = this.error("name");
            else if (!this.validateField("name", name)) errors.name = this.error("name");
            if (!surname) errors.surname = this.error("surname");
            else if (!this.validateField("surname", surname))
                errors.surname = this.error("surname");
            return errors;
        }
        if (field === "password") {
            const requiresCurrent = user?.has_password !== false;
            const currentPassword = String(
                formData.get("current-password") || "",
            ).trim();
            const password = String(formData.get("password") || "").trim();
            const confirmPassword = String(
                formData.get("confirm-password") || "",
            ).trim();
            if (requiresCurrent && !currentPassword) {
                errors["current-password"] = "Current password is required";
            }
            if (!password) errors.password = this.error("password");
            else if (!this.validateField("password", password)) {
                errors.password = this.error("password");
            }
            if (!confirmPassword) {
                errors["confirm-password"] = "Please confirm your password";
            } else if (password && confirmPassword && password !== confirmPassword) {
                errors["confirm-password"] = "Passwords do not match";
            }
            return errors;
        }
        const value = String(formData.get(field) || "").trim();
        if (!value) errors[field] = this.error(field);
        else if (!this.validateField(field, value)) errors[field] = this.error(field);
        return errors;
    }
}

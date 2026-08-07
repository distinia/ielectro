import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";

export class CreateValidation {
    constructor(form, birthday, config) {
        this.form = form;
        this.birthday = birthday;
        this.config = config;
        this.rules = null;
    }
    async load() {
        this.rules = await Nesh.Request.get(
            "https://account.ielectro.com/data/authentication.json",
        );
    }
    sections() {
        return Array.isArray(this.config?.sections) ? this.config.sections : [];
    }
    sectionElement(sectionConfig) {
        return this.form.querySelector(`.${sectionConfig.class}`);
    }
    fieldValue(field) {
        if (field === "birthday") return this.birthday.value();
        if (field === "terms-of-service-agreement") {
            const checkbox = this.form.querySelector(".terms-conditions");
            return checkbox && checkbox.checked ? "1" : "";
        }
        const element = this.form.querySelector(`[name="${field}"]`);
        return element ? element.value.trim() : "";
    }
    fieldError(field) {
        return this.rules?.[field]?.errorMessage || "Invalid field";
    }
    isValid(field, value) {
        const pattern = this.rules?.[field]?.pattern;
        if (!pattern) return true;
        const regex = new RegExp(pattern);
        regex.lastIndex = 0;
        return regex.test(value);
    }
    elementsForField(field) {
        if (field === "birthday") {
            return [".birthday-day", ".birthday-month", ".birthday-year"]
                .map((selector) => this.form.querySelector(selector))
                .filter(Boolean);
        }
        if (field === "terms-of-service-agreement") {
            const checkbox = this.form.querySelector(".terms-conditions");
            return checkbox ? [checkbox] : [];
        }
        const element = this.form.querySelector(`[name="${field}"]`);
        return element ? [element] : [];
    }
    markFieldError(field, message) {
        this.elementsForField(field).forEach((element) => {
            element.classList.add("field-auth-error");
            element.setAttribute("title", message);
        });
    }
    clearFieldErrors(fields) {
        fields.forEach((field) => {
            this.elementsForField(field).forEach((element) => {
                element.classList.remove("field-auth-error");
                element.removeAttribute("title");
            });
        });
    }
    bindClearAuthErrors() {
        const clear = (target) => {
            if (
                target.matches?.(
                    '.input-field, .birthday-select, .select-field, .terms-conditions, input[type="checkbox"]',
                )
            ) {
                target.classList.remove("field-auth-error");
                target.removeAttribute("title");
            }
        };
        this.form.addEventListener("input", (event) => clear(event.target));
        this.form.addEventListener("change", (event) => clear(event.target));
    }
    validateSection(sectionConfig) {
        const fields = sectionConfig.fields || [];
        this.clearFieldErrors(fields);
        for (const field of fields) {
            const value = this.fieldValue(field);
            const message = this.fieldError(field);
            if (value === "" || !this.isValid(field, value)) {
                this.markFieldError(field, message);
                Alert.error(message);
                return false;
            }
        }
        return true;
    }
    validateAll() {
        for (const sectionConfig of this.sections()) {
            if (!this.validateSection(sectionConfig)) {
                return false;
            }
        }
        return true;
    }
}

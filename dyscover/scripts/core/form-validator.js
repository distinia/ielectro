import { Request } from "./nesh.js";
export class FormValidator {
    static rules = null;
    static rulesUrl = "https://dyscover.ielectro.com/data/validation.json";
    constructor(formId) {
        this.formId = formId;
        this.form = document.querySelector(`#${formId}`);
        this.message = "";
    }
    static async loadRules() {
        if (this.rules) return this.rules;
        const data = await Request.get(this.rulesUrl);
        Object.keys(data).forEach((formKey) => {
            Object.keys(data[formKey]).forEach((fieldKey) => {
                data[formKey][fieldKey].pattern = new RegExp(
                    data[formKey][fieldKey].pattern,
                );
            });
        });
        this.rules = data;
        return this.rules;
    }
    async validate() {
        if (!this.form) {
            this.message = "Form not found";
            return false;
        }
        let rules;
        try {
            rules = await FormValidator.loadRules();
        } catch {
            this.message = "Validation rules unavailable";
            return false;
        }
        const fieldsToValidate = rules[this.formId];
        if (!fieldsToValidate) return true;
        for (const field in fieldsToValidate) {
            const elements = this.form.querySelectorAll(`[name="${field}"]`);
            const pattern = fieldsToValidate[field].pattern;
            const errorMessage = fieldsToValidate[field].errorMessage;
            for (const element of elements) {
                const value = element.value.trim();
                if (!value) {
                    this.message = `The ${field} cannot be empty`;
                    return false;
                }
                pattern.lastIndex = 0;
                if (!pattern.test(value)) {
                    this.message = errorMessage;
                    return false;
                }
            }
        }
        this.message = "";
        return true;
    }
}

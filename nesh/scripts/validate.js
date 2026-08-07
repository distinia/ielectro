import Request from "./request.js";
export default class Validate {
    constructor(formId, rulesUrl) {
        this.form = document.getElementById(formId);
        this.rulesUrl = rulesUrl;
        this.rules = null;
        this.message = "";
    }
    async validate() {
        if (!this.load()) {
            return false;
        }
        if (!(await this.rules())) {
            return false;
        }
        if (!this.empty()) {
            return false;
        }
        return this.fields();
    }
    async rules() {
        try {
            this.rules = await Rules.load(this.rulesUrl);
            return true;
        } catch {
            this.message = "Unable to load validation rules";
            return false;
        }
    }
    load() {
        if (this.form) {
            return true;
        }
        this.message = "Form not found";
        return false;
    }
    empty() {
        for (const field in this.rules) {
            const inputs = this.form.querySelectorAll(
                `[name="${field}"]`
            );
            for (const input of inputs) {
                if (input.value.trim()) {
                    return true;
                }
            }
        }
        this.message = "All fields cannot be empty";
        return false;
    }
    fields() {
        for (const field in this.rules) {
            if (!this.field(field)) {
                return false;
            }
        }
        this.message = "";
        return true;
    }
    field(field) {
        const rule = this.rules[field];
        const inputs = this.form.querySelectorAll(
            `[name="${field}"]`
        );
        for (const input of inputs) {
            const value = input.value.trim();
            if (!value) {
                this.message = `The ${field} cannot be empty`;
                return false;
            }
            rule.pattern.lastIndex = 0;
            if (!rule.pattern.test(value)) {
                this.message = rule.errorMessage;
                return false;
            }
        }
        return true;
    }
}
class Rules {
    static cache = {};
    static async load(url) {
        if (this.cache[url]) {
            return this.cache[url];
        }
        const rules = await Request.get(url);
        for (const field in rules) {
            rules[field].pattern = new RegExp(
                rules[field].pattern
            );
        }
        this.cache[url] = rules;
        return rules;
    }
}
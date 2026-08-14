import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";
export class CreateAvailability {
    constructor(form) {
        this.form = form;
        this.email = form.querySelector('[name="email"]');
        this.username = form.querySelector('[name="username"]');
        this.timers = {};
    }
    bind() {
        this.email?.addEventListener("input", () => this.schedule("email", this.email));
        this.username?.addEventListener("input", () => this.schedule("username", this.username));
    }
    schedule(field, input) {
        clearTimeout(this.timers[field]);
        this.timers[field] = setTimeout(() => this.check(field, input), 420);
    }
    async check(field, input) {
        const value = input.value.trim();
        input.classList.remove("field-available", "field-taken", "field-unknown");
        if (!value) return;
        try {
            const response = await Nesh.Request.post(
                "https://account.ielectro.com/api/availability",
                { field, value },
            );
            const data = Api.record(response);
            input.classList.add(data?.available ? "field-available" : "field-taken");
        } catch {
            input.classList.add("field-unknown");
        }
    }
}

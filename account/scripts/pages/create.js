import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
import Alert from "../../components/alert/alert.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
   new CreateForm();
});
class CreateForm {
    constructor() {
        this.form = document.querySelector("#create-form");
        this.sections = document.querySelectorAll(
            '#create-form > div[class^="section-"]',
        );
        this.nextButton = document.querySelector(".next-button");
        this.prevButton = document.querySelector(".prev-button");
        this.createButton = document.querySelector(".create-button");
        this.steps = new CreateSteps(
            this.sections,
            this.prevButton,
            this.nextButton,
            this.createButton,
        );
        this.birthday = new CreateBirthday(this.form);
        this.validation = new CreateValidation(this.form, this.birthday);
        this.request = new CreateRequest(this.form, this.birthday);
        this.availability = new CreateFieldAvailability(this.form);
        this.setup();
    }
    async setup() {
        this.disableDefaultForm();
        this.birthday.generate();
        await this.validation.load();
        this.steps.show();
        this.bindButtons();
        this.availability.bind();
        this.validation.bindClearAuthErrors(this.form);
    }
    disableDefaultForm() {
        document.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
            }
        });
        this.form.addEventListener("submit", (event) => {
            event.preventDefault();
        });
    }
    bindButtons() {
        this.nextButton.addEventListener("click", async () => {
            const valid = await this.validation.validateSection(
                this.steps.currentSection(),
            );
            if (!valid) return;
            this.steps.next();
        });
        this.prevButton.addEventListener("click", () => {
            this.steps.previous();
        });
        this.createButton.addEventListener("click", async (event) => {
            event.preventDefault();
            const valid = await this.validation.validateAll(this.sections);
            if (!valid) return;
            await this.request.submit();
        });
    }
}
class CreateSteps {
    constructor(sections, prevButton, nextButton, createButton) {
        this.sections = sections;
        this.prevButton = prevButton;
        this.nextButton = nextButton;
        this.createButton = createButton;
        this.currentIndex = 0;
        this.initialize();
    }
    initialize() {
        this.sections.forEach((section, index) => {
            section.classList.add("fade-in");
            section.style.display = index === 0 ? "block" : "none";
        });
    }
    currentSection() {
        return this.sections[this.currentIndex];
    }
    next() {
        if (this.currentIndex >= this.sections.length - 1) return;
        this.sections[this.currentIndex].style.display = "none";
        this.currentIndex++;
        this.sections[this.currentIndex].style.display = "block";
        this.show();
    }
    previous() {
        if (this.currentIndex <= 0) return;
        this.sections[this.currentIndex].style.display = "none";
        this.currentIndex--;
        this.sections[this.currentIndex].style.display = "block";
        this.show();
    }
    show() {
        this.prevButton.style.display = this.currentIndex === 0 ? "none" : "flex";
        if (this.currentIndex === this.sections.length - 1) {
            this.nextButton.style.display = "none";
            this.createButton.style.display = "flex";
        } else {
            this.nextButton.style.display = "flex";
            this.createButton.style.display = "none";
        }
        document.querySelectorAll(".create-progress-dot").forEach((dot, i) => {
            dot.classList.toggle("is-active", i === this.currentIndex);
        });
    }
}
class CreateFieldAvailability {
    constructor(form) {
        this.form = form;
        this.email = form.querySelector('[name="email"]');
        this.username = form.querySelector('[name="username"]');
        this.timers = {};
    }
    bind() {
        this.email?.addEventListener("input", () =>
            this.schedule("email", this.email),
        );
        this.username?.addEventListener("input", () =>
            this.schedule("username", this.username),
        );
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
            const params = new URLSearchParams({ field, value });
            const res = await Nesh.Request.get(
                `https://account.ielectro.com/api/availability/${params.toString()}`,
            );
            const d = res?.data;
            input.classList.add(d?.available ? "field-available" : "field-taken");
        } catch {
            input.classList.add("field-unknown");
        }
    }
}
class CreateBirthday {
    constructor(form) {
        this.form = form;
        this.daySelect = this.form.querySelector(".birthday-day");
        this.monthSelect = this.form.querySelector(".birthday-month");
        this.yearSelect = this.form.querySelector(".birthday-year");
    }
    generate() {
        if (!this.daySelect || !this.monthSelect || !this.yearSelect) return;
        for (let i = 1; i <= 31; i++) {
            this.daySelect.insertAdjacentHTML(
                "beforeend",
                `<option value="${i}">${i}</option>`,
            );
        }
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];
        months.forEach((month, index) => {
            this.monthSelect.insertAdjacentHTML(
                "beforeend",
                `<option value="${index + 1}">${month}</option>`,
            );
        });
        const currentYear = new Date().getFullYear() - 6;
        const startYear = currentYear - 100;
        for (let i = currentYear; i >= startYear; i--) {
            this.yearSelect.insertAdjacentHTML(
                "beforeend",
                `<option value="${i}">${i}</option>`,
            );
        }
    }
    value() {
        const day = this.daySelect?.value.trim() || "";
        const month = this.monthSelect?.value.trim() || "";
        const year = this.yearSelect?.value.trim() || "";
        if (!day || !month || !year) return "";
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
}
class CreateValidation {
    constructor(form, birthday) {
        this.form = form;
        this.birthday = birthday;
        this.rules = null;
    }
    async load() {
        try {
            this.rules = await Nesh.Request.get(
                "https://account.ielectro.com/data/authentication.json",
            );
        } catch (error) {
            if (error?.text) {
                Alert.error(error.text);
            }
        }
    }
    fieldValue(field) {
        if (field === "birthday") {
            return this.birthday.value();
        }
        if (field === "terms-of-service-agreement") {
            const checkbox = this.form.querySelector(".terms-conditions");
            return checkbox && checkbox.checked ? "1" : "";
        }
        const element = this.form.querySelector(`[name="${field}"]`);
        if (!element) return "";
        return element.value.trim();
    }
    fieldRule(field) {
        if (!this.rules || !this.rules[field]) return null;
        return this.rules[field];
    }
    fieldError(field) {
        const rule = this.fieldRule(field);
        return rule ? rule.errorMessage : "";
    }
    isValid(field, value) {
        const rule = this.fieldRule(field);
        if (!rule) return true;
        const pattern = new RegExp(rule.pattern);
        pattern.lastIndex = 0;
        return pattern.test(value);
    }
    sectionFields(section) {
        if (section.classList.contains("section-0")) return ["name", "surname"];
        if (section.classList.contains("section-1")) return ["birthday", "gender"];
        if (section.classList.contains("section-2"))
            return ["email", "username", "password"];
        if (section.classList.contains("section-3"))
            return ["terms-of-service-agreement"];
        return [];
    }
    bindClearAuthErrors(form) {
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
        form.addEventListener("input", (e) => clear(e.target));
        form.addEventListener("change", (e) => clear(e.target));
    }
    elementsForField(field) {
        if (field === "birthday") {
            return [".birthday-day", ".birthday-month", ".birthday-year"]
                .map((sel) => this.form.querySelector(sel))
                .filter(Boolean);
        }
        if (field === "terms-of-service-agreement") {
            const el = this.form.querySelector(".terms-conditions");
            return el ? [el] : [];
        }
        const el = this.form.querySelector(`[name="${field}"]`);
        return el ? [el] : [];
    }
    clearFieldAuthErrors(field) {
        this.elementsForField(field).forEach((el) => {
            el.classList.remove("field-auth-error");
            el.removeAttribute("title");
        });
    }
    markFieldAuthError(field, message) {
        this.elementsForField(field).forEach((el) => {
            el.classList.add("field-auth-error");
            el.setAttribute("title", message);
        });
    }
    async validateSection(section) {
        if (!this.rules || !section) return false;
        const fields = this.sectionFields(section);
        fields.forEach((f) => this.clearFieldAuthErrors(f));
        for (const field of fields) {
            const value = this.fieldValue(field);
            const msg = this.fieldError(field);
            if (value === "") {
                this.markFieldAuthError(field, msg);
                Alert.error(msg);
                return false;
            }
            if (!this.isValid(field, value)) {
                this.markFieldAuthError(field, msg);
                Alert.error(msg);
                return false;
            }
        }
        return true;
    }
    async validateAll(sections) {
        for (let i = 0; i < sections.length; i++) {
            const valid = await this.validateSection(sections[i]);
            if (!valid) return false;
        }
        return true;
    }
}
class CreateRequest {
    constructor(form, birthday) {
        this.form = form;
        this.birthday = birthday;
    }
    async submit() {
        const formData = new FormData(this.form);
        formData.set("birthday", this.birthday.value());
        formData.set(
            "terms-of-service-agreement",
            this.form.querySelector(".terms-conditions")?.checked ? "1" : "",
        );
        try {
            const data = await Nesh.Request.post(
                "https://account.ielectro.com/api/create",
                formData,
            );
            if (data?.text) {
                Alert.success(data.text);
            }
            setTimeout(() => {
                this.form.reset();
                window.location.href = "https://account.ielectro.com/";
            }, 2000);
        } catch (error) {
            if (error?.text) {
                Alert.error(error.text);
            }
        }
    }
}

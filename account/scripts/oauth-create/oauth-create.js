import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";

export class OAuthCreate {
    constructor(form) {
        this.form = form;
        this.emailInput = this.form.querySelector(".email");
        this.birthday = new BirthdaySelector(this.form);
        this.oauth = { name: "", surname: "", email: "" };
    }
    async init() {
        this.birthday.generate();
        await this.loadOauth();
        this.bind();
    }
    bind() {
        this.form.addEventListener("submit", (event) => {
            this.submit(event);
        });
    }
    async loadOauth() {
        try {
            const response = await Nesh.Request.get(
                "https://account.ielectro.com/api/oauth/google",
            );
            const stored = Api.record(response);
            if (!stored?.email) {
                Alert.error("Unable to load Google sign-up data");
                return;
            }
            this.oauth.name = stored.name || "";
            this.oauth.surname = stored.surname || "";
            this.oauth.email = stored.email || "";
            if (this.emailInput) {
                this.emailInput.value = this.oauth.email;
            }
        } catch {
            Alert.error("Unable to load Google sign-up data");
        }
    }
    async submit(event) {
        event.preventDefault();
        const formData = new FormData(this.form);
        formData.append("name", this.oauth.name);
        formData.append("surname", this.oauth.surname);

        const day = formData.get("day");
        const month = formData.get("month");
        const year = formData.get("year");

        if (day && month && year) {
            formData.set(
                "birthday",
                `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            );
        }

        try {
            const response = await Nesh.Request.post(
                "https://account.ielectro.com/api/user",
                formData,
            );
            Alert.success(Api.message(response) || "Account created successfully");
            setTimeout(() => {
                window.location.href = "https://account.ielectro.com/";
            }, 900);
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
}

class BirthdaySelector {
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
        [
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
        ].forEach((month, index) => {
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
}

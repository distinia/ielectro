import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
import Alert from "../../components/alert/alert.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
   const form = document.querySelector("#create-by-google-form");
    if (!form) return;
    const page = new CreateByGoogle(form);
    await page.init();
});
class CreateByGoogle {
    constructor(form) {
        this.form = form;
        this.emailInput = this.form.querySelector(".email");
        this.birthday = new BirthdaySelector(this.form);
        this.oauth = {
            name: "",
            surname: "",
            email: "",
        };
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
            const data = await Nesh.Request.get(
                "https://account.ielectro.com/api/auth/complete-oauth",
            );
            this.oauth.name = data?.data?.name || "";
            this.oauth.surname = data?.data?.surname || "";
            this.oauth.email = data?.data?.email || "";
            if (this.emailInput) {
                this.emailInput.value = this.oauth.email;
            }
        } catch (error) {
            Alert.error(error?.text || "Unable to load oauth data");
        }
    }
    async submit(event) {
        event.preventDefault();
        const formData = new FormData(this.form);
        formData.append("name", this.oauth.name);
        formData.append("surname", this.oauth.surname);
        try {
            const data = await Nesh.Request.post(
                "https://account.ielectro.com/api/auth/create-by-google",
                formData,
            );
            Alert.success(data?.text);
            setTimeout(() => {
                window.location.href = "https://account.ielectro.com";
            }, 900);
        } catch (error) {
            Alert.error(error?.text);
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

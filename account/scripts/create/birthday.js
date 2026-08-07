export class CreateBirthday {
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
    value() {
        const day = this.daySelect?.value.trim() || "";
        const month = this.monthSelect?.value.trim() || "";
        const year = this.yearSelect?.value.trim() || "";
        if (!day || !month || !year) return "";
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
}

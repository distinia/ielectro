import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";
import { Alert } from "../core/alert.js";
import { JobCard } from "./job-card.js";

export class Careers {
    constructor() {
        this.container = document.querySelector(".careers-grid");
        this.select = document.querySelector('select[name="position"]');
        this.form = document.querySelector(".career-form");
    }
    async load() {
        await this.loadJobs();
        this.bindCvUi();
        this.bindForm();
    }
    async loadJobs() {
        if (!this.container && !this.select) return;
        try {
            const response = await Nesh.Request.get(`${Api.base}/careers`);
            const jobs = Api.active(Api.list(response));
            jobs.forEach((job) => {
                if (this.container) {
                    this.container.appendChild(new JobCard(job).render());
                }
                if (this.select) {
                    this.select.appendChild(this.createOption(job));
                }
            });
            if (this.container) {
                await Nesh.Icons.load(this.container);
            }
        } catch (error) {
            console.error("Jobs load error:", error);
        }
    }
    createOption(job) {
        const option = document.createElement("option");
        option.value = job.title;
        option.textContent = job.title;
        return option;
    }
    bindForm() {
        if (!this.form) return;
        this.form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const formData = new FormData(this.form);
            try {
                const response = await Nesh.Request.post(
                    `${Api.base}/careers/apply`,
                    formData,
                );
                Alert.success(Api.message(response) || "Application sent successfully");
                this.form.reset();
                const name = document.querySelector(".career-cv-name");
                if (name) name.textContent = "No file selected";
            } catch (error) {
                Alert.error(Api.errorMessage(error));
            }
        });
    }
    bindCvUi() {
        const input = document.querySelector(".career-cv");
        const name = document.querySelector(".career-cv-name");
        if (!input || !name) return;
        const sync = () => {
            const file = input.files?.[0];
            name.textContent = file?.name || "No file selected";
        };
        input.addEventListener("change", sync);
        sync();
    }
}

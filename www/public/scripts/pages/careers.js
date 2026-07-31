import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
import Alert from "../../components/alert/alert.js";
window.addEventListener("DOMContentLoaded", () => Careers.initialize());
class Careers {
    static async initialize() {
        App.initialize();
        this.container = document.querySelector(".careers-grid");
        this.select = document.querySelector('select[name="position"]');
        await this.loadJobs();
        this.bindCvUi();
        this.bindForm();
    }
    static async loadJobs() {
        try {
            const payload = await Nesh.Request.get(
                "https://www.ielectro.com/api/careers/list",
            );
            const jobs = payload?.data?.jobs || [];
            jobs.forEach((job) => {
                if (this.container)
                    this.container.appendChild(new JobCard(job).render());
                if (this.select) this.select.appendChild(this.createOption(job));
            });
            if (this.container) await Nesh.Icons.load(this.container);
        } catch (e) {
            console.error("Jobs load error:", e);
        }
    }
    static createOption(job) {
        const option = document.createElement("option");
        option.value = job.title;
        option.textContent = job.title;
        return option;
    }
    static bindForm() {
        const form = document.querySelector(".career-form");
        if (!form) return;
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            try {
                const res = await Nesh.Request.post(
                    "https://www.ielectro.com/api/careers/apply",
                    formData,
                );
                Alert.success(res?.text || "Application sent successfully");
                form.reset();
                const name = document.querySelector(".career-cv-name");
                if (name) name.textContent = "No file selected";
            } catch (err) {
                Alert.error(err?.text || "Unable to submit application");
            }
        });
    }
    static bindCvUi() {
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
class JobCard {
    constructor(job) {
        this.job = job;
    }
    render() {
        const el = document.createElement("div");
        el.className = "card job-card";
        const requirements = (this.job.requirements || [])
            .map((r) => `<li>${Nesh.Html.escape(r)}</li>`)
            .join("");
        el.innerHTML = ` <div class="card-title"> <i data-icon="${Nesh.Html.escape(this.job.icon || "")}" class="icon-image"></i> ${Nesh.Html.escape(this.job.title || "")} </div> <ul class="job-requirements"> ${requirements} </ul> `;
        return el;
    }
}

import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export default class JobCard {
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

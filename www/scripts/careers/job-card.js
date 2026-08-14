import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export class JobCard {
    constructor(job) {
        this.job = job;
    }
    render() {
        const element = document.createElement("div");
        element.className = "card job-card";
        const requirements = (this.job.requirements || [])
            .map((item) => `<li>${Nesh.Html.escape(item)}</li>`)
            .join("");
        element.innerHTML = `<div class="card-title"><i data-icon="${Nesh.Html.escape(this.job.icon || "briefcase")}" class="icon-image"></i> ${Nesh.Html.escape(this.job.title || "")}</div><ul class="job-requirements">${requirements}</ul>`;
        return element;
    }
}

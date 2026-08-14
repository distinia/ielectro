import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";
import { TeamCard } from "./team-card.js";
export class Team {
    constructor() {
        this.container = document.querySelector(".team-grid");
    }
    async load() {
        if (!this.container) return;
        try {
            const response = await Nesh.Request.get(`${Api.base}/team`);
            const members = Api.active(Api.list(response));
            if (!members.length) {
                this.container.innerHTML =
                    '<div class="card">No team members available.</div>';
                return;
            }
            members.forEach((member) => {
                this.container.appendChild(
                    new TeamCard({
                        name: member.full_name,
                        role: member.role_text,
                        avatar: member.avatar || "",
                        social: {
                            linkedin: member.linkedin || "",
                            github: member.github || "",
                        },
                    }).render(),
                );
            });
        } catch {
            this.container.innerHTML =
                '<div class="card">Unable to load team.</div>';
        }
    }
}

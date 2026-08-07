import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import TeamCard from "./team-card.js";
export default class Team {
    static async initialize() {
        App.initialize();
        this.container = document.querySelector(".team-grid");
        await this.load();
    }
    static async load() {
        if (!this.container) return;
        try {
            const payload = await Nesh.Request.get(
                "https://www.ielectro.com/api/team/team-list",
            );
            const members = Array.isArray(payload?.data) ? payload.data : [];
            if (!members.length) {
                this.container.innerHTML =
                    '<div class="card">No team members available.</div>';
                return;
            }
            members.forEach((m) => {
                const member = {
                    name: m.full_name,
                    role: m.role_text,
                    avatar: m.avatar || "",
                    social: {
                        instagram: m.instagram || "",
                        linkedin: m.linkedin || "",
                        github: m.github || "",
                    },
                };
                this.container.appendChild(new TeamCard(member).render());
            });
        } catch {
            this.container.innerHTML = '<div class="card">Unable to load team.</div>';
        }
    }
}

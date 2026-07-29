import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import App from "../../components/app/app.js";
window.addEventListener("DOMContentLoaded", () => Team.initialize());
class Team {
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
class TeamCard {
    constructor(member) {
        this.member = member;
    }
    render() {
        const el = document.createElement("div");
        el.className = "card team-member";
        el.innerHTML = ` <div class="avatar-wrapper"> <div class="avatar" style="background-image: url('${Nesh.Html.escape(this.member.avatar || "")}');"></div> <div class="avatar-badge"> ${this.getBadge()} </div> </div> <h3 class="card-title">${Nesh.Html.escape(this.member.name || "")}</h3> <p class="card-description">${Nesh.Html.escape(this.member.role || "")}</p> <div class="team-social"> ${this.renderSocial()} </div> `;
        return el;
    }
    getBadge() {
        return ` <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path> <circle cx="12" cy="8" r="6"></circle> </svg> `;
    }
    renderSocial() {
        const s = this.member.social || {};
        return ` ${s.instagram ? `<a href="${Nesh.Html.escape(s.instagram)}" class="social-link" target="_blank"> <svg viewBox="0 0 24 24" width="20" height="20"> <path fill="currentColor" d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m0 1.8A4 4 0 0 0 3.8 7.8v8.4a4 4 0 0 0 4 4h8.4a4 4 0 0 0 4-4V7.8a4 4 0 0 0-4-4H7.8m9.15 1.35a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4"></path> </svg> </a>` : ""} ${s.linkedin ? `<a href="${Nesh.Html.escape(s.linkedin)}" class="social-link" target="_blank"> <svg viewBox="0 0 24 24" width="20" height="20"> <path fill="currentColor" d="M6.94 6.5a1.94 1.94 0 1 1 0-3.88 1.94 1.94 0 0 1 0 3.88zM4.5 8h4.9v12H4.5zM13 8h4.7v1.64h.07c.65-1.23 2.23-2.53 4.59-2.53 4.91 0 5.82 3.23 5.82 7.43V20H23v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V20H14z"></path> </svg> </a>` : ""} ${s.github ? `<a href="${Nesh.Html.escape(s.github)}" class="social-link" target="_blank"> <svg viewBox="0 0 24 24" width="20" height="20"> <path fill="currentColor" d="M12 .5A12 12 0 0 0 0 12.7c0 5.5 3.6 10.2 8.6 11.8.6.1.8-.3.8-.6v-2.2c-3.5.8-4.3-1.7-4.3-1.7-.6-1.6-1.4-2-1.4-2-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 2 2.9 1.4 3.6 1.1.1-.8.4-1.4.8-1.7-2.8-.3-5.7-1.5-5.7-6.5 0-1.4.5-2.6 1.3-3.5-.1-.3-.6-1.6.1-3.3 0 0 1-.3 3.4 1.3a11.5 11.5 0 0 1 6.2 0c2.4-1.6 3.4-1.3 3.4-1.3.7 1.7.2 3 .1 3.3.8.9 1.3 2.1 1.3 3.5 0 5-2.9 6.2-5.7 6.5.5.4.9 1.2.9 2.5v3.7c0 .3.2.7.8.6A12 12 0 0 0 24 12.7 12 12 0 0 0 12 .5z"></path> </svg> </a>` : ""} `;
    }
}

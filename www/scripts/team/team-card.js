import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export class TeamCard {
    constructor(member) {
        this.member = member;
    }
    socialUrl(platform, username) {
        const handle = String(username || "").trim().replace(/^@+/, "");
        if (!handle) return "";
        if (platform === "linkedin") {
            return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
        }
        if (platform === "github") {
            return `https://github.com/${encodeURIComponent(handle)}`;
        }
        return "";
    }
    render() {
        const element = document.createElement("div");
        element.className = "card team-member";
        element.innerHTML = `<div class="avatar-wrapper"><div class="avatar" style="background-image: url('${Nesh.Html.escape(this.member.avatar || "")}');"></div><div class="avatar-badge">${this.badge()}</div></div><h3 class="card-title">${Nesh.Html.escape(this.member.name || "")}</h3><p class="card-description">${Nesh.Html.escape(this.member.role || "")}</p><div class="team-social">${this.socialLinks()}</div>`;
        return element;
    }
    badge() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path><circle cx="12" cy="8" r="6"></circle></svg>`;
    }
    socialLinks() {
        const social = this.member.social || {};
        const linkedin = this.socialUrl("linkedin", social.linkedin);
        const github = this.socialUrl("github", social.github);
        return `${linkedin ? `<a href="${Nesh.Html.escape(linkedin)}" class="social-link" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M6.94 6.5a1.94 1.94 0 1 1 0-3.88 1.94 1.94 0 0 1 0 3.88zM4.5 8h4.9v12H4.5zM13 8h4.7v1.64h.07c.65-1.23 2.23-2.53 4.59-2.53 4.91 0 5.82 3.23 5.82 7.43V20H23v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V20H14z"></path></svg></a>` : ""}${github ? `<a href="${Nesh.Html.escape(github)}" class="social-link" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 .5A12 12 0 0 0 0 12.7c0 5.5 3.6 10.2 8.6 11.8.6.1.8-.3.8-.6v-2.2c-3.5.8-4.3-1.7-4.3-1.7-.6-1.6-1.4-2-1.4-2-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 2 2.9 1.4 3.6 1.1.1-.8.4-1.4.8-1.7-2.8-.3-5.7-1.5-5.7-6.5 0-1.4.5-2.6 1.3-3.5-.1-.3-.6-1.6.1-3.3 0 0 1-.3 3.4 1.3a11.5 11.5 0 0 1 6.2 0c2.4-1.6 3.4-1.3 3.4-1.3.7 1.7.2 3 .1 3.3.8.9 1.3 2.1 1.3 3.5 0 5-2.9 6.2-5.7 6.5.5.4.9 1.2.9 2.5v3.7c0 .3.2.7.8.6A12 12 0 0 0 24 12.7 12 12 0 0 0 12 .5z"></path></svg></a>` : ""}`;
    }
}

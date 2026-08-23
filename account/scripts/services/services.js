import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";
export class ServicesDashboard {
    constructor() {
        this.output = document.querySelector("#services-output");
        this.load();
    }
    formatWhen(iso) {
        if (!iso) return "—";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleDateString(undefined, { dateStyle: "medium" });
    }
    truncate(text, max = 120) {
        const value = String(text || "").trim();
        if (value.length <= max) return value;
        return `${value.slice(0, max - 1).trim()}…`;
    }
    statusClass(status) {
        const value = String(status || "active").toLowerCase();
        if (value === "suspended") return "services-status--warn";
        if (value === "banned") return "services-status--bad";
        return "services-status--ok";
    }
    stat(label, value) {
        return `<div class="services-stat"><span class="services-stat-label">${Nesh.Html.escape(label)}</span><span class="services-stat-value">${Nesh.Html.escape(String(value))}</span></div>`;
    }
    avatarHtml(profile, placeholderIcon = "user") {
        if (profile.avatar) {
            return `<div class="services-avatar-wrap"><img class="services-avatar" src="${Nesh.Html.escape(profile.avatar)}" alt="" width="88" height="88" loading="lazy"></div>`;
        }
        return `<div class="services-avatar-wrap"><div class="services-avatar services-avatar--placeholder" aria-hidden="true"><i data-icon="${placeholderIcon}"></i></div></div>`;
    }
    openButton(url, label = "Open service") {
        return `<div class="services-card-foot"><a class="services-open" href="${Nesh.Html.escape(url)}" target="_blank" rel="noopener noreferrer">${Nesh.Html.escape(label)} <i data-icon="external-link"></i></a></div>`;
    }
    logoUrl(service) {
        const base = String(service.url || "").replace(/\/$/, "");
        return `${base}/assets/brand/logo.png`;
    }
    brandHeader(service, statusHtml) {
        const logo = this.logoUrl(service);
        return `<header class="services-card-head">
            <img class="services-card-logo" src="${Nesh.Html.escape(logo)}" alt="${Nesh.Html.escape(service.name)}" width="40" height="40" loading="lazy">
            <div class="services-card-brand-text">
                <h2 class="services-card-title">${Nesh.Html.escape(service.name)}</h2>
                ${statusHtml}
            </div>
        </header>`;
    }
    dyscoverCard(service) {
        const profile = service.profile || {};
        const username = String(profile.username || "").trim();
        const displayName = username ? `@${username}` : "Your profile";
        const bio = this.truncate(profile.biography);
        const website = String(profile.website || "").trim();
        const websiteHtml = website
            ? `<a class="services-website" href="${Nesh.Html.escape(website)}" target="_blank" rel="noopener noreferrer">${Nesh.Html.escape(website.replace(/^https?:\/\//i, ""))}</a>`
            : "";
        const profileUrl = profile.profile_url || service.url;
        return `<article class="services-card services-card--dyscover">
            ${this.brandHeader(service, `<span class="services-status ${this.statusClass(profile.status)}">${Nesh.Html.escape(String(profile.status || "active"))}</span>`)}
            <div class="services-profile">
                ${this.avatarHtml(profile)}
                <div class="services-profile-main">
                    <p class="services-username">${Nesh.Html.escape(displayName)}</p>
                    ${bio ? `<p class="services-bio">${Nesh.Html.escape(bio)}</p>` : `<p class="services-bio services-bio--empty">No biography yet.</p>`}
                    ${websiteHtml}
                </div>
            </div>
            <div class="services-stats">
                ${this.stat("Posts", profile.posts ?? 0)}
                ${this.stat("Followers", profile.followers ?? 0)}
                ${this.stat("Following", profile.following ?? 0)}
                ${this.stat("Member since", this.formatWhen(profile.created_at))}
            </div>
            ${this.openButton(profileUrl, "View on Dyscover")}
        </article>`;
    }
    unlinkedCard(service) {
        return `<article class="services-card services-card--empty">
            ${this.brandHeader(service, `<span class="services-status services-status--warn">Not linked</span>`)}
            <div class="services-profile">
                <p class="services-bio services-bio--empty">No profile found for this service on your account.</p>
            </div>
        </article>`;
    }
    renderCard(service) {
        if (!service.linked || !service.profile) {
            return this.unlinkedCard(service);
        }
        if (service.id === "dyscover") {
            return this.dyscoverCard(service);
        }
        return this.unlinkedCard(service);
    }
    async load() {
        if (!this.output) return;
        try {
            const response = await Nesh.Request.get(
                "https://account.ielectro.com/api/services",
            );
            const payload = Api.record(response) || {};
            const services = Array.isArray(payload.services)
                ? payload.services
                : [];
            if (services.length === 0) {
                this.output.innerHTML = `<p class="services-empty">No services available yet.</p>`;
                return;
            }
            this.output.innerHTML = services
                .map((service) => this.renderCard(service))
                .join("");
            Nesh.Icons.load(this.output);
        } catch (error) {
            Alert.error(Api.errorMessage(error));
            this.output.innerHTML = `<p class="services-empty">Unable to load services.</p>`;
        }
    }
}

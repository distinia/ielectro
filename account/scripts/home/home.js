import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";
import { ActivityFormat } from "../core/activity-format.js";
export class Home {
    constructor() {
        this.title = document.querySelector("#welcome-title");
        this.dashboardOut = document.querySelector("#dashboard-output");
        this.accountData = null;
        this.init();
    }
    async init() {
        await this.loadAccount();
        await this.loadDashboard();
    }
    async loadAccount() {
        try {
            const response = await Nesh.Request.get(
                "https://account.ielectro.com/api/user",
            );
            this.accountData = Api.record(response);
            const name = String(this.accountData?.name || "").trim();
            const surname = String(this.accountData?.surname || "").trim();
            const full = [name, surname].filter(Boolean).join(" ").trim();
            if (this.title) {
                this.title.textContent = full ? `Welcome, ${full}` : "Welcome";
            }
        } catch (error) {
            Alert.error(Api.errorMessage(error));
        }
    }
    formatWhen(iso) {
        if (!iso) return "—";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "—";
        return d.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    }
    async loadDashboard() {
        if (!this.dashboardOut) return;
        try {
            const [response, templates] = await Promise.all([
                Nesh.Request.get("https://account.ielectro.com/api/activity"),
                ActivityFormat.loadTemplates(),
            ]);
            const formatter = new ActivityFormat(templates);
            const payload = Api.record(response) || {};
            const stats = {
                active_sessions: payload.active_sessions ?? 0,
                failed_logins_30d: payload.failed_logins_30d ?? 0,
                activity_events_30d: payload.activity_count ?? 0,
            };
            const activity = (
                Array.isArray(payload.recent_activity)
                    ? payload.recent_activity
                    : []
            ).filter((row) => ActivityFormat.shouldShow(row));
            const acc = this.accountData || {};
            const recentHtml =
                activity.length === 0
                    ? `<p class="dashboard-empty">No recent events yet.</p>`
                    : `<ul class="dashboard-recent-list">${activity
                          .map(
                              (row) =>
                                  `<li class="dashboard-recent-row"><span class="dashboard-recent-label">${Nesh.Html.escape(formatter.formatTextWithoutDate(row))}</span><time class="dashboard-recent-time" datetime="${Nesh.Html.escape(row.created_at || "")}">${Nesh.Html.escape(formatter.formatDateTime(row.created_at))}</time></li>`,
                          )
                          .join("")}</ul>`;
            this.dashboardOut.innerHTML = `<div class="home-dashboard-layout"><div class="home-dashboard-main"><div class="dashboard-stats dashboard-stats-inline"><div class="dashboard-stat"><span class="dashboard-stat-label">Active sessions</span><span class="dashboard-stat-value">${Nesh.Html.escape(String(stats.active_sessions))}</span></div><div class="dashboard-stat"><span class="dashboard-stat-label">Failed logins (30d)</span><span class="dashboard-stat-value">${Nesh.Html.escape(String(stats.failed_logins_30d))}</span></div><div class="dashboard-stat"><span class="dashboard-stat-label">Activity (30d)</span><span class="dashboard-stat-value">${Nesh.Html.escape(String(stats.activity_events_30d))}</span></div></div><div class="dashboard-snapshot-grid"><div class="dashboard-snapshot-card"><span class="dashboard-snapshot-label">Account created</span><span class="dashboard-snapshot-value">${Nesh.Html.escape(this.formatWhen(acc.created_at))}</span></div></div><div class="dashboard-recent dashboard-recent-wide"><h2 class="dashboard-recent-title">Recent activity</h2>${recentHtml}<a class="dashboard-recent-link" href="https://account.ielectro.com/activity">View full log</a></div></div><aside class="home-dashboard-aside"><h2 class="home-aside-title">Shortcuts</h2><div class="home-aside-links"><a class="home-link-card home-aside-link" href="https://account.ielectro.com/profile"><span class="home-link-icon"><i data-icon="user"></i></span><span class="home-link-text">Profile</span></a><a class="home-link-card home-aside-link" href="https://account.ielectro.com/security"><span class="home-link-icon"><i data-icon="life-buoy"></i></span><span class="home-link-text">Security</span></a><a class="home-link-card home-aside-link" href="https://account.ielectro.com/activity"><span class="home-link-icon"><i data-icon="list"></i></span><span class="home-link-text">Activity</span></a></div><p class="home-aside-hint">Review active sessions and sign out unused devices from Security.</p></aside></div>`;
            Nesh.Icons.load(this.dashboardOut);
        } catch (error) {
            Alert.error(Api.errorMessage(error));
            this.dashboardOut.innerHTML = `<p class="dashboard-empty">Unable to load overview.</p>`;
        }
    }
}

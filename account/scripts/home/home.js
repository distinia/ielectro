import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Alert } from "../core/alert.js";
import { Api } from "../core/api.js";

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
    activityLabel(action) {
        const map = {
            login: "Signed in",
            login_success: "Signed in",
            login_failed: "Failed sign-in",
            logout: "Signed out",
            session_revoked: "Session revoked",
            logout_all_devices: "Signed out other devices",
            password_changed: "Password updated",
            password_change: "Password updated",
            username_changed: "Username changed",
            username_change: "Username changed",
            password_recovery_requested: "Recovery requested",
            password_reset_completed: "Password reset",
            register: "Account created",
            created: "Account created",
            deletion_scheduled: "Deletion scheduled",
            deletion_cancelled: "Deletion cancelled",
            profile_update: "Profile updated",
        };
        return map[action] || String(action || "Event").replace(/_/g, " ");
    }
    async loadDashboard() {
        if (!this.dashboardOut) return;
        try {
            const response = await Nesh.Request.get(
                "https://account.ielectro.com/api/activity",
            );
            const payload = Api.record(response) || {};
            const stats = {
                active_sessions: payload.active_sessions ?? 0,
                failed_logins_30d: payload.failed_logins_30d ?? 0,
                activity_events_30d: payload.activity_count ?? 0,
            };
            const activity = Array.isArray(payload.recent_activity)
                ? payload.recent_activity
                : [];
            const acc = this.accountData || {};
            const recentHtml =
                activity.length === 0
                    ? `<p class="dashboard-empty">No recent events yet.</p>`
                    : `<ul class="dashboard-recent-list">${activity
                          .map(
                              (row) =>
                                  `<li class="dashboard-recent-row"><span class="dashboard-recent-label">${Nesh.Html.escape(this.activityLabel(row.action))}</span><time class="dashboard-recent-time" datetime="${Nesh.Html.escape(row.created_at || "")}">${Nesh.Html.escape(this.formatWhen(row.created_at))}</time></li>`,
                          )
                          .join("")}</ul>`;
            this.dashboardOut.innerHTML = `<div class="home-dashboard-layout"><div class="home-dashboard-main"><div class="dashboard-stats dashboard-stats-inline"><div class="dashboard-stat"><span class="dashboard-stat-label">Active sessions</span><span class="dashboard-stat-value">${Nesh.Html.escape(String(stats.active_sessions))}</span></div><div class="dashboard-stat"><span class="dashboard-stat-label">Failed logins (30d)</span><span class="dashboard-stat-value">${Nesh.Html.escape(String(stats.failed_logins_30d))}</span></div><div class="dashboard-stat"><span class="dashboard-stat-label">Activity (30d)</span><span class="dashboard-stat-value">${Nesh.Html.escape(String(stats.activity_events_30d))}</span></div></div><div class="dashboard-snapshot-grid"><div class="dashboard-snapshot-card"><span class="dashboard-snapshot-label">Member since</span><span class="dashboard-snapshot-value">${Nesh.Html.escape(this.formatWhen(acc.created_at))}</span></div></div><div class="dashboard-recent dashboard-recent-wide"><h2 class="dashboard-recent-title">Recent activity</h2>${recentHtml}<a class="dashboard-recent-link" href="https://account.ielectro.com/activity">View full log</a></div></div><aside class="home-dashboard-aside"><h2 class="home-aside-title">Shortcuts</h2><div class="home-aside-links"><a class="home-link-card home-aside-link" href="https://account.ielectro.com/profile"><span class="home-link-icon"><i data-icon="user"></i></span><span class="home-link-text">Profile</span></a><a class="home-link-card home-aside-link" href="https://account.ielectro.com/security"><span class="home-link-icon"><i data-icon="life-buoy"></i></span><span class="home-link-text">Security</span></a><a class="home-link-card home-aside-link" href="https://account.ielectro.com/activity"><span class="home-link-icon"><i data-icon="list"></i></span><span class="home-link-text">Activity</span></a></div><p class="home-aside-hint">Review active sessions and sign out unused devices from Security.</p></aside></div>`;
            Nesh.Icons.load(this.dashboardOut);
        } catch (error) {
            Alert.error(Api.errorMessage(error));
            this.dashboardOut.innerHTML = `<p class="dashboard-empty">Unable to load overview.</p>`;
        }
    }
}

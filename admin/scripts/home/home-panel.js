import { App, Api, Request } from "../core/index.js";

export default class HomePanel {
    formatNumber(value) {
        return new Intl.NumberFormat("en-US").format(Number(value) || 0);
    }

    formatPercent(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return "—";
        const sign = num > 0 ? "+" : "";
        return `${sign}${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }

    formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    }

    formatRelative(value) {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return this.formatDate(value);
    }

    trendValue(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) {
            return `<span class="dash-trend dash-trend-neutral">—</span>`;
        }
        if (num > 0) {
            return `<span class="dash-trend dash-trend-up">${this.formatPercent(num)}</span>`;
        }
        if (num < 0) {
            return `<span class="dash-trend dash-trend-down">${this.formatPercent(num)}</span>`;
        }
        return `<span class="dash-trend dash-trend-neutral">0.00%</span>`;
    }

    lineChart(series, className = "dash-line-chart") {
        const max = Math.max(...series.map((item) => item.count), 1);
        const tickCount = 4;
        const yLabels = [];
        for (let tick = tickCount; tick >= 0; tick--) {
            const value = Math.round((max / tickCount) * tick);
            yLabels.push(`<span>${App.esc(this.formatNumber(value))}</span>`);
        }
        const points = series
            .map((item, index) => {
                const x = series.length <= 1 ? 50 : (index / (series.length - 1)) * 100;
                const y = 100 - Math.round((item.count / max) * 88) - 6;
                return `${x},${y}`;
            })
            .join(" ");
        const step = Math.max(1, Math.ceil(series.length / 6));
        const labels = series
            .filter((_, index) => index % step === 0 || index === series.length - 1)
            .map((item) => `<span>${App.esc(item.label)}</span>`)
            .join("");
        return `<div class="dash-line-chart-wrap">
            <div class="dash-line-y" aria-hidden="true">${yLabels.join("")}</div>
            <div class="${className}">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.8" vector-effect="non-scaling-stroke"></polyline>
                </svg>
                <div class="dash-line-labels">${labels}</div>
            </div>
        </div>`;
    }

    renderViewsChart(viewsSeries, availableMonths = []) {
        const views = viewsSeries?.views || [];
        const month = viewsSeries?.month || "";
        const monthLabel = viewsSeries?.month_label || "";
        const total = viewsSeries?.total ?? views.reduce((sum, item) => sum + item.count, 0);
        const options = (availableMonths.length ? availableMonths : [{ value: month, label: monthLabel }])
            .map(
                (item) =>
                    `<option value="${App.esc(item.value)}"${item.value === month ? " selected" : ""}>${App.esc(item.label)}</option>`,
            )
            .join("");

        return `<section class="dash-card dash-panel dash-panel-wide dash-chart-panel">
                <div class="dash-panel-head">
                    <div>
                        <h2>Website page views</h2>
                        <p class="admin-muted">${App.esc(monthLabel)} · www.ielectro.com · ${this.formatNumber(total)} total</p>
                    </div>
                    <div class="dash-chart-controls">
                        <label class="dash-month-filter">
                            <span>Month</span>
                            <select class="dash-month-select" aria-label="Select month">${options}</select>
                        </label>
                    </div>
                </div>
                ${views.length ? this.lineChart(views, "dash-line-chart dash-line-chart-large") : `<p class="admin-muted">No page views recorded for this month yet.</p>`}
            </section>`;
    }

    barChart(series, className = "dash-bars") {
        const max = Math.max(...series.map((item) => item.count), 1);
        return `<div class="${className}">${series
            .map(
                (item) => `
            <div class="dash-bar" title="${App.esc(item.label)}: ${item.count}">
                <span class="dash-bar-fill" style="height:${Math.max(8, Math.round((item.count / max) * 100))}%"></span>
                <span class="dash-bar-label">${App.esc(item.label)}</span>
            </div>`,
            )
            .join("")}</div>`;
    }

    avatar(user, size = "") {
        const cls = size ? ` dash-avatar ${size}` : " dash-avatar";
        if (user?.avatar) {
            return `<img class="${cls.trim()} dash-avatar-img" src="${App.esc(user.avatar)}" alt="" loading="lazy">`;
        }
        return `<span class="${cls.trim()}">${App.esc(user?.initials || "?")}</span>`;
    }

    trendCard(title, rows) {
        return `<article class="dash-card dash-trend-card">
            <header class="dash-trend-card-head"><i data-icon="bar-chart-2"></i><span>${App.esc(title)}</span></header>
            <div class="dash-trend-rows">${rows
                .map(
                    (row) => `
                <div class="dash-trend-row">
                    <span>${App.esc(row.label)}</span>
                    ${this.trendValue(row.value)}
                </div>`,
                )
                .join("")}</div>
        </article>`;
    }

    render(data) {
        const overview = data?.overview || {};
        const content = data?.content || {};
        const ecosystem = data?.ecosystem || {};
        const trends = data?.trends || {};
        const viewsSeries = data?.views_series || {};
        const availableMonths = data?.available_months || [];
        const signups = data?.signups || [];
        const topContributors = data?.top_contributors || [];
        const recentAccounts = data?.recent_accounts || [];
        const recentDyscover = data?.recent_dyscover || [];
        const signupTotal = signups.reduce((sum, item) => sum + item.count, 0);

        return `
        <div class="dash-grid dash-kpis">
            <article class="dash-card dash-kpi">
                <p class="dash-kpi-label">Total accounts</p>
                <strong class="dash-kpi-value">${this.formatNumber(overview.total_accounts)}</strong>
                <p class="dash-kpi-meta">${this.formatNumber(overview.new_accounts_7d)} new this week</p>
            </article>
            <article class="dash-card dash-kpi">
                <p class="dash-kpi-label">Online now</p>
                <strong class="dash-kpi-value">${this.formatNumber(overview.online_recent || overview.active_sessions)}</strong>
                <p class="dash-kpi-meta">${this.formatNumber(overview.active_sessions)} active sessions</p>
            </article>
            <article class="dash-card dash-kpi">
                <p class="dash-kpi-label">New signups (14d)</p>
                <strong class="dash-kpi-value">${this.formatNumber(signupTotal)}</strong>
                ${this.barChart(signups.slice(-7), "dash-bars dash-bars-compact")}
            </article>
            <article class="dash-card dash-kpi dash-kpi-accent">
                <p class="dash-kpi-label">Dyscover · 7 days</p>
                <strong class="dash-kpi-value dash-kpi-value-light">${this.formatNumber(ecosystem.dyscover_views_7d)}</strong>
                <p class="dash-kpi-meta-light">${this.formatNumber(ecosystem.dyscover_viewers_7d)} visitors · ${this.formatNumber(ecosystem.dyscover_posts_7d)} posts · ${this.formatNumber(ecosystem.dyscover_users)} users</p>
                <div class="dash-kpi-actions">
                    <a class="dash-btn dash-btn-light" href="/dyscover">Moderation</a>
                </div>
            </article>
        </div>

        <div class="dash-grid dash-trends">
            ${this.trendCard("Previous week trend", [
                { label: "www page views vs previous week", value: trends.week?.views },
            ])}
            ${this.trendCard("Previous month trend", [
                { label: "www page views vs previous month", value: trends.month?.views },
            ])}
        </div>

        <div class="dash-grid dash-main">
            ${this.renderViewsChart(viewsSeries, availableMonths)}

            <section class="dash-card dash-panel">
                <div class="dash-panel-head">
                    <div>
                        <h2>Top Dyscover contributors</h2>
                        <p class="admin-muted">Posts, comments and likes · last 30 days</p>
                    </div>
                </div>
                ${
                    topContributors.length
                        ? `<div class="dash-user-list">${topContributors
                              .map(
                                  (user, index) => `
                        <article class="dash-user-row">
                            <div class="dash-user-main">
                                ${this.avatar(user)}
                                <div>
                                    <strong>${App.esc(user.display_name)}</strong>
                                    <span>@${App.esc(user.username)}</span>
                                </div>
                            </div>
                            <div class="dash-user-stats">
                                <span class="dash-pill dash-pill-blue">${this.formatNumber(user.posts_30d || 0)} posts</span>
                                <span class="dash-pill dash-pill-orange">${this.formatNumber(user.comments_30d || 0)} comments</span>
                            </div>
                            <span class="dash-rank">#${index + 1}</span>
                        </article>`,
                              )
                              .join("")}</div>`
                        : `<p class="admin-muted">No Dyscover activity recorded yet.</p>`
                }
            </section>
        </div>

        <div class="dash-grid dash-secondary">
            <section class="dash-card dash-panel">
                <div class="dash-panel-head">
                    <h2>Recent signups</h2>
                </div>
                ${
                    recentAccounts.length
                        ? `<div class="dash-table-wrap"><table class="dash-table">
                        <thead><tr><th>Account</th><th>Status</th><th>Joined</th></tr></thead>
                        <tbody>${recentAccounts
                            .map(
                                (user) => `
                            <tr>
                                <td><div class="dash-table-user">${this.avatar(user, "dash-avatar-sm")}<div><strong>${App.esc(user.display_name)}</strong><span>@${App.esc(user.username)}</span></div></div></td>
                                <td><span class="dash-pill ${user.verified ? "dash-pill-green" : "dash-pill-orange"}">${user.verified ? "Verified" : "Pending"}</span></td>
                                <td>${this.formatDate(user.created_at)}</td>
                            </tr>`,
                            )
                            .join("")}</tbody></table></div>`
                        : `<p class="admin-muted">No accounts yet.</p>`
                }
            </section>

            <section class="dash-card dash-panel">
                <div class="dash-panel-head">
                    <h2>iElectro content</h2>
                </div>
                <div class="dash-stat-grid">
                    <a class="dash-stat-tile" href="/news">
                        <strong>${this.formatNumber(content.news_published)}</strong>
                        <span>Published news</span>
                    </a>
                    <a class="dash-stat-tile" href="/team">
                        <strong>${this.formatNumber(content.team)}</strong>
                        <span>Team members</span>
                    </a>
                    <a class="dash-stat-tile" href="/careers">
                        <strong>${this.formatNumber(content.careers_active)}</strong>
                        <span>Open roles</span>
                    </a>
                    <a class="dash-stat-tile" href="/accounts">
                        <strong>${this.formatNumber(overview.verified_accounts)}</strong>
                        <span>Verified accounts</span>
                        <small>Account log →</small>
                    </a>
                </div>
            </section>
        </div>

        <section class="dash-card dash-panel">
            <div class="dash-panel-head">
                <h2>Recent Dyscover activity</h2>
            </div>
            ${
                recentDyscover.length
                    ? `<div class="dash-activity-list">${recentDyscover
                          .map(
                              (item) => `
                    <article class="dash-activity-row">
                        <span class="dash-avatar dash-avatar-sm">${App.esc(String(item.type || "?").slice(0, 1).toUpperCase())}</span>
                        <div class="dash-activity-body">
                            <strong>@${App.esc(item.actor_username)}</strong>
                            <span>${App.esc(item.type)}${item.post_title ? ` · ${App.esc(item.post_title)}` : ""}${item.recipient_username ? ` → @${App.esc(item.recipient_username)}` : ""}</span>
                        </div>
                        <time>${this.formatRelative(item.created_at)}</time>
                    </article>`,
                          )
                          .join("")}</div>`
                    : `<p class="admin-muted">No recent activity.</p>`
            }
        </section>`;
    }

    bindChartFilter(root) {
        const select = root.querySelector(".dash-month-select");
        if (!select) return;
        select.addEventListener("change", async () => {
            const month = select.value;
            const panel = root.querySelector(".dash-chart-panel");
            if (!panel) return;
            panel.classList.add("is-loading");
            try {
                const res = await Request.get(`analytics?month=${encodeURIComponent(month)}`);
                const data = Api.record(res);
                const replacement = document.createElement("div");
                replacement.innerHTML = this.renderViewsChart(
                    data?.views_series || {},
                    data?.available_months || [],
                );
                panel.replaceWith(replacement.firstElementChild);
                this.bindChartFilter(root);
            } catch {
                select.value = select.dataset.previous || select.value;
            } finally {
                root.querySelector(".dash-chart-panel")?.classList.remove("is-loading");
            }
        });
        select.dataset.previous = select.value;
    }

    async run() {
        document.body.classList.add("admin-page-dashboard");
        const root = document.querySelector(".dashboard-root");
        if (!root) return;

        root.innerHTML = `<div class="dash-loading">Loading analytics…</div>`;

        try {
            const res = await Request.get("analytics");
            const data = Api.record(res);
            root.innerHTML = this.render(data);
            this.bindChartFilter(root);
            await import("https://nesh.ielectro.com/scripts/nesh.js").then((m) => m.default.Icons.load(root));
        } catch {
            root.innerHTML = `<div class="dash-error">Unable to load dashboard analytics.</div>`;
        }
    }
}

export class Sidebar {
    static icons = {
        home: `<svg class="admin-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>`,
        news: `<svg class="admin-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>`,
        team: `<svg class="admin-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5"/></svg>`,
        careers: `<svg class="admin-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
        accounts: `<svg class="admin-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/></svg>`,
        dyscover: `<svg class="admin-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
    };
    static items() {
        return [
            {
                group: "Admin",
                links: [
                    { href: "/", label: "Dashboard", page: "home", icon: "home" },
                    { href: "/news", label: "News", page: "news", icon: "news" },
                    { href: "/team", label: "Team", page: "team", icon: "team" },
                    { href: "/careers", label: "Careers", page: "careers", icon: "careers" },
                    { href: "/accounts", label: "Accounts", page: "accounts", icon: "accounts" },
                    { href: "/dyscover", label: "Dyscover", page: "dyscover", icon: "dyscover" },
                ],
            },
        ];
    }
    static mount(page = "home") {
        const existing = document.querySelector(".admin-sidebar");
        if (existing) {
            existing.querySelectorAll(".admin-sidebar-link").forEach((link) => {
                const href = link.getAttribute("href") || "/";
                const slug = href === "/" ? "home" : href.replace(/^\//, "");
                link.classList.toggle("active", slug === page);
            });
            return;
        }
        const mount = document.querySelector(".admin-sidebar-mount");
        if (!mount) return;
        const groups = this.items()
            .map((group) => {
                const links = group.links
                    .map((item) => {
                        const active = item.page === page ? " active" : "";
                        const icon = this.icons[item.icon] || "";
                        return `<a class="admin-sidebar-link${active}" href="${item.href}">${icon}<span>${item.label}</span></a>`;
                    })
                    .join("");
                return `<div class="admin-sidebar-group"><p class="admin-sidebar-sub">${group.group}</p>${links}</div>`;
            })
            .join("");
        mount.outerHTML = `<aside class="admin-sidebar">
            <a class="admin-sidebar-logo-link" href="/">
                <img class="admin-sidebar-logo" src="/assets/brand/logo.png" alt="iElectro" loading="lazy">
            </a>
            <nav class="admin-sidebar-nav">${groups}</nav>
            <div class="admin-sidebar-foot">iElectro</div>
        </aside>`;
    }
}

export class Sidebar {
    items() {
        return [
            {
                href: "https://account.ielectro.com/",
                label: "Home",
                icon: "home",
                page: "home",
            },
            {
                href: "https://account.ielectro.com/profile",
                label: "Profile",
                icon: "user",
                page: "profile",
            },
            {
                href: "https://account.ielectro.com/services",
                label: "Services",
                icon: "grid",
                page: "services",
            },
            {
                href: "https://account.ielectro.com/security",
                label: "Security",
                icon: "life-buoy",
                page: "security",
            },
            {
                href: "https://account.ielectro.com/activity",
                label: "Activity",
                icon: "list",
                page: "activity",
            },
        ];
    }

    linkHtml(item, extraClass = "") {
        const className = extraClass ? ` class="${extraClass}"` : "";
        return `<li><a href="${item.href}"${className}><i data-icon="${item.icon}" class="sidebar-icon" aria-hidden="true"></i><span class="sidebar-label">${item.label}</span></a></li>`;
    }

    render() {
        const links = this.items()
            .map((item) => this.linkHtml(item))
            .join("");
        const logout = this.linkHtml(
            {
                href: "#",
                label: "Sign out",
                icon: "log-out",
            },
            "logout",
        );

        return `<nav class="sidebar"><img src="https://account.ielectro.com/assets/brand/logo.png" class="logo" alt="iElectro"><ul>${links}${logout}</ul></nav>`;
    }

    highlight(page) {
        document.querySelectorAll(".sidebar a").forEach((link) => {
            const href = link.getAttribute("href");
            if (!href || link.classList.contains("logout")) return;
            const path = new URL(href).pathname.replace(/\/$/, "") || "/";
            const active =
                (page === "home" && (path === "" || path === "/")) ||
                path.endsWith(`/${page}`);
            link.classList.toggle("active", active);
        });
    }
}

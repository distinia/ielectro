export class Navbar {
    static url = "https://www.ielectro.com";
    static links = [
        { slug: "home", href: "/", label: "Home" },
        { slug: "services", href: "/services", label: "Services" },
        { slug: "team", href: "/team", label: "Team" },
        { slug: "careers", href: "/careers", label: "Careers" },
        { slug: "news", href: "/news", label: "News" },
        { slug: "contact-us", href: "/contact-us", label: "Contact us" },
    ];
    render() {
        const active = this.activePage();
        const links = Navbar.links
            .map(
                (link) =>
                    `<a href="${Navbar.url}${link.href === "/" ? "" : link.href}" class="${active === link.slug ? "active" : ""}">${link.label}</a>`,
            )
            .join("");
        return `
            <nav>
                <div class="container">
                    <div class="nav-content">
                        <div class="logo" translate="no">iElectro</div>
                        <div class="nav-links">${links}</div>
                    </div>
                </div>
            </nav>
        `;
    }
    activePage() {
        const path = window.location.pathname.replace(/\/$/, "") || "/";
        if (path === "/") return "home";
        const slug = path.split("/").filter(Boolean)[0] || "home";
        if (slug === "news" || /^\d+$/.test(path.split("/").filter(Boolean)[1] || "")) {
            return "news";
        }
        return slug;
    }
}

import { Site } from "./site.js";

export class Navbar {
    static links = [
        { slug: "home", href: "/", label: "Home" },
        { slug: "services", href: "/services", label: "Services" },
        { slug: "team", href: "/team", label: "Team" },
        { slug: "careers", href: "/careers", label: "Careers" },
        { slug: "news", href: "/news", label: "News" },
    ];
    render() {
        const active = Site.pageSlug();
        const home = Site.href("/");
        const links = Navbar.links
            .map(
                (link) =>
                    `<a href="${Site.href(link.href)}" class="${active === link.slug ? "active" : ""}">${link.label}</a>`,
            )
            .join("");
        return `
            <nav>
                <div class="container">
                    <div class="nav-content">
                        <a class="logo" href="${home}" translate="no">iElectro</a>
                        <div class="nav-links">${links}</div>
                        <a class="button button-primary button-sm nav-account" href="https://account.ielectro.com">Account</a>
                    </div>
                </div>
            </nav>
        `;
    }
}

export class Sidebar {
    render() {
        return `<nav class="sidebar"><img src="https://account.ielectro.com/assets/brand/logo.png" class="logo" alt="iElectro"><ul><li><a href="https://account.ielectro.com/">Home</a></li><li><a href="https://account.ielectro.com/profile">Profile</a></li><li><a href="https://account.ielectro.com/security">Security</a></li><li><a href="https://account.ielectro.com/activity">Activity</a></li><li><a href="#" class="logout">Sign out</a></li></ul></nav>`;
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

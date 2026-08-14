export class Site {
    static href(path = "/") {
        const suffix = path === "/" ? "/" : "/" + String(path).replace(/^\/+/, "");
        const base = this.basePath();
        if (!base) {
            return suffix;
        }
        return suffix === "/" ? `${base}/` : `${base}${suffix}`;
    }

    static url() {
        return this.origin() + this.basePath();
    }

    static origin() {
        return typeof location !== "undefined" ? location.origin : "";
    }

    static absolute(path = "/") {
        const href = this.href(path);
        if (/^https?:\/\//i.test(href)) {
            return href;
        }
        return this.origin() + href;
    }

    static pagePath() {
        const base = this.basePath();
        let path = window.location.pathname.replace(/\\/g, "/");
        if (base && path.toLowerCase().startsWith(base.toLowerCase())) {
            path = path.slice(base.length) || "/";
        }
        path = path.replace(/\/+$/, "") || "/";
        if (path === "/index.php" || path === "/home") {
            return "/";
        }
        return path;
    }

    static pageSlug() {
        const path = this.pagePath();
        if (path === "/") {
            return "home";
        }
        const slug = path.split("/").filter(Boolean)[0] || "home";
        if (slug === "news") {
            return "news";
        }
        return slug;
    }

    static basePath() {
        const path = window.location.pathname.replace(/\\/g, "/");
        const match = path.match(/^(.*?\/www)(?=\/|$)/i);
        return match ? match[1] : "";
    }
}

import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Sidebar } from "./sidebar.js";
import { Session } from "./session.js";

export class App {
    static guestPages = ["login", "create", "oauth-create", "password-recovery"];

    constructor() {
        this.init();
    }

    static pageFromLocation() {
        const path = window.location.pathname.replace(/\/$/, "") || "/";
        if (path === "/" || path.endsWith("/home")) return "home";
        const parts = path.split("/").filter(Boolean);
        return parts[parts.length - 1] || "home";
    }

    static authedRedirectUrl() {
        const cookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith("previous_url="));
        const redirectUrl = cookie
            ? decodeURIComponent(cookie.split("=").slice(1).join("="))
            : null;
        if (redirectUrl) {
            document.cookie =
                "previous_url=; path=/; domain=.ielectro.com; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            return redirectUrl;
        }
        const service = new URLSearchParams(window.location.search).get("service");
        if (service === "dyscover") {
            return "https://dyscover.ielectro.com/";
        }
        return "https://account.ielectro.com/home";
    }

    static isGuestPage(page) {
        return App.guestPages.includes(page);
    }

    static async redirectIfAuthenticated(page = App.pageFromLocation()) {
        if (!App.isGuestPage(page)) return false;
        if (!(await Nesh.Auth.logged())) return false;
        window.location.replace(App.authedRedirectUrl());
        return true;
    }

    async init() {
        Nesh.Input.enablePlainTextPaste();
        Nesh.Input.disableAutocomplete();
        Nesh.Input.disableTextCorrection();
        Nesh.Input.bind();
        const page = this.page();
        const guest = this.isGuest(page);
        const authed = await this.authenticated();
        if (!guest && !authed) {
            window.location.href = "https://account.ielectro.com/login?service=account";
            return;
        }
        if (!guest && authed) {
            const sidebar = new Sidebar();
            document.body.insertAdjacentHTML("afterbegin", sidebar.render());
            sidebar.highlight(page);
            Session.bindLogout();
        }
        await Nesh.Icons.load(document.body);
    }

    page() {
        return App.pageFromLocation();
    }

    isGuest(page) {
        return App.isGuestPage(page);
    }

    async authenticated() {
        return Nesh.Auth.logged();
    }
}

export class GuestApp {
    constructor() {
        this.init();
    }

    async init() {
        Nesh.Input.enablePlainTextPaste();
        Nesh.Input.disableAutocomplete();
        Nesh.Input.disableTextCorrection();
        Nesh.Input.bind();
        if (await App.redirectIfAuthenticated()) {
            return;
        }
        await Nesh.Icons.load(document.body);
    }
}

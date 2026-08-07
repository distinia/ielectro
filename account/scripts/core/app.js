import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Sidebar } from "./sidebar.js";
import { Session } from "./session.js";

export class App {
    constructor() {
        this.init();
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
        const path = window.location.pathname.replace(/\/$/, "") || "/";
        if (path === "/" || path.endsWith("/home")) return "home";
        const parts = path.split("/").filter(Boolean);
        return parts[parts.length - 1] || "home";
    }
    isGuest(page) {
        return ["login", "create", "oauth-create", "password-recovery"].includes(page);
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
        await Nesh.Icons.load(document.body);
    }
}

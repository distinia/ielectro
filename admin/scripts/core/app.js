import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "./api.js";
import { Request } from "./request.js";
import { Sidebar } from "./sidebar.js";
export class App {
    static esc(value) {
        return Nesh.Html.escape(String(value ?? ""));
    }
    static pageFromLocation() {
        const parts = window.location.pathname.replace(/\/$/, "").split("/").filter(Boolean);
        return parts[parts.length - 1] || "home";
    }
    static filterRows(rows, query, sort, mappers = {}) {
        const q = String(query || "")
            .trim()
            .toLowerCase();
        let list = [...(rows || [])];
        if (q) {
            list = list.filter((row) =>
                String(mappers.text?.(row) || "")
                    .toLowerCase()
                    .includes(q),
            );
        }
        const pickTime = (row) => new Date(mappers.time?.(row) || 0).getTime() || 0;
        const pickTitle = (row) => String(mappers.title?.(row) || "").toLowerCase();
        switch (sort) {
            case "oldest":
                list.sort((a, b) => pickTime(a) - pickTime(b));
                break;
            case "az":
                list.sort((a, b) => pickTitle(a).localeCompare(pickTitle(b)));
                break;
            case "za":
                list.sort((a, b) => pickTitle(b).localeCompare(pickTitle(a)));
                break;
            default:
                list.sort((a, b) => pickTime(b) - pickTime(a));
        }
        return list;
    }
    static loginUrl() {
        const returnUrl = encodeURIComponent(window.location.href);
        return `https://account.ielectro.com/login?service=admin&return=${returnUrl}`;
    }
    async init() {
        Nesh.Input.enablePlainTextPaste();
        Nesh.Input.disableAutocomplete();
        Nesh.Input.disableTextCorrection();
        Nesh.Input.bind();
        if (!(await Nesh.Auth.logged())) {
            window.location.replace(App.loginUrl());
            return false;
        }
        try {
            const res = await Request.get("me");
            const data = Api.record(res);
            if (!data?.allowed) {
                document.body.className = "admin-denied";
                document.body.innerHTML = `<div class="admin-denied-card"><h1>Access denied</h1><p>Your account is not linked to an active iElectro team profile.</p><p><a href="https://account.ielectro.com/">Back to Account</a></p></div>`;
                return false;
            }
        } catch {
            window.location.replace(App.loginUrl());
            return false;
        }
        Sidebar.mount(App.pageFromLocation());
        document.body.classList.add("admin-app");
        if (window.location.search) {
            history.replaceState({}, "", window.location.pathname);
        }
        await Nesh.Icons.load(document.body);
        return true;
    }
}

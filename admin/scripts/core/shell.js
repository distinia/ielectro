import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { App, Api, Request, Sidebar } from "./index.js";

export class AdminShell {
    static mount(page, title = "Admin") {
        document.body.classList.add("admin-app");
        Sidebar.mount(page);

        const mount = document.querySelector(".admin-content-mount");
        if (!mount) return;

        let topbar = document.querySelector(".admin-topbar");
        if (!topbar) {
            topbar = document.createElement("header");
            topbar.className = "admin-topbar";
            topbar.innerHTML = `
            <h1 class="admin-topbar-title"></h1>
            <div class="admin-topbar-actions"></div>`;
            mount.parentElement?.insertBefore(topbar, mount);
        }

        const titleNode = topbar.querySelector(".admin-topbar-title");
        if (titleNode) titleNode.textContent = title;

        const actionsSource = document.querySelector(".admin-toolbar:not(.panel-hidden)");
        const actionsTarget = topbar.querySelector(".admin-topbar-actions");
        if (actionsSource && actionsTarget && !actionsTarget.children.length) {
            while (actionsSource.firstChild) {
                actionsTarget.appendChild(actionsSource.firstChild);
            }
            actionsSource.remove();
        }
    }

    static moveToolbars() {
        const target = document.querySelector(".admin-topbar-actions");
        if (!target) return;

        document.querySelectorAll(".admin-toolbar:not(.panel-hidden)").forEach((toolbar) => {
            while (toolbar.firstChild) {
                target.appendChild(toolbar.firstChild);
            }
        });
        Nesh.Icons.load(target);
    }
}

export { App, Api, Request, Sidebar };

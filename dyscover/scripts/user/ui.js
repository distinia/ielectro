import { App, Auth, Request } from "../core/index.js";
import { Actions } from "./actions.js";
import { List } from "./list.js";
import { BiographyEditor } from "./biography-editor.js";
export class UI {
    constructor() {
        this.initActions();
        this.bindStats();
        this.bindTabs();
        this.bindTypeTabs();
    }
    bindTabs() {
        document.querySelectorAll(".profile-tab").forEach((tab) => {
            tab.addEventListener("click", () => {
                document
                    .querySelectorAll(".profile-tab")
                    .forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                profileMainFilter = tab.dataset.filter || "posts";
                renderProfileGrid();
            });
        });
    }
    bindTypeTabs() {
        document.querySelectorAll(".profile-type-tab").forEach((tab) => {
            tab.addEventListener("click", () => {
                document
                    .querySelectorAll(".profile-type-tab")
                    .forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                profileTypeFilter = tab.dataset.type || "article";
                renderProfileGrid();
            });
        });
    }
    async initActions() {
        const logged = await Auth.username();
        const container = document.querySelector(".actions");
        if (!container) return;
        if (logged === currentUsername) {
            container.innerHTML = `
                <button type="button" class="profile-btn profile-btn-edit">Edit biography</button>
                <a href="https://account.ielectro.com/profile" class="profile-btn profile-btn-primary">View my profile</a>`;
            container
                .querySelector(".profile-btn-edit")
                ?.addEventListener("click", () => BiographyEditor.open(currentBio));
            return;
        }
        try {
            await Request.get(App.api("user/check-follow"), {
                username: currentUsername,
            });
            container.innerHTML = `<button type="button" class="profile-btn profile-btn-muted">Following</button>`;
            container.querySelector("button").onclick = () =>
                new Actions(currentUsername).unfollow();
        } catch {
            container.innerHTML = `<button type="button" class="profile-btn profile-btn-primary">Follow</button>`;
            container.querySelector("button").onclick = () =>
                new Actions(currentUsername).follow();
        }
    }
    bindStats() {
        document.querySelector(".followers-number")?.addEventListener("click", async () => {
            const data = await Request.get(App.api("user/followers-list"), {
                username: currentUsername,
            });
            new List("followers", data.data, loggedUsername === currentUsername);
        });
        document.querySelector(".followings-number")?.addEventListener("click", async () => {
            const data = await Request.get(App.api("user/followings-list"), {
                username: currentUsername,
            });
            new List("followings", data.data, loggedUsername === currentUsername);
        });
    }
}

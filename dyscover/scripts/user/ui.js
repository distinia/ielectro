import { Api } from "../core/api.js";
import { App, Auth, Request } from "../core/index.js";
import { Actions } from "./actions.js";
import { List } from "./list.js";
import { BiographyEditor } from "./biography-editor.js";
import { ProfilePage } from "./profile-page.js";

export class UI {
    constructor(page) {
        this.page = page;
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
                this.page.mainFilter = tab.dataset.filter || "posts";
                this.page.renderGrid();
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
                this.page.typeFilter = tab.dataset.type || "article";
                this.page.renderGrid();
            });
        });
    }

    async initActions() {
        const logged = await Auth.username();
        const container = document.querySelector(".actions");
        if (!container) return;
        if (logged === this.page.username) {
            container.innerHTML = `
                <button type="button" class="profile-btn profile-btn-edit">Edit biography</button>
                <a href="https://account.ielectro.com/profile" class="profile-btn profile-btn-primary">View my profile</a>`;
            container
                .querySelector(".profile-btn-edit")
                ?.addEventListener("click", () =>
                    BiographyEditor.open(this.page),
                );
            return;
        }
        const following = await App.isFollowing(this.page.userId);
        if (following) {
            container.innerHTML = `<button type="button" class="profile-btn profile-btn-muted">Following</button>`;
            container.querySelector("button").onclick = () =>
                new Actions(this.page).unfollow();
        } else {
            container.innerHTML = `<button type="button" class="profile-btn profile-btn-primary">Follow</button>`;
            container.querySelector("button").onclick = () =>
                new Actions(this.page).follow();
        }
    }

    bindStats() {
        document.querySelector(".followers-number")?.addEventListener("click", async () => {
            const data = await Request.get(Api.userFollowers(this.page.userId));
            new List(
                "followers",
                Api.list(data),
                this.page.loggedUsername === this.page.username,
                this.page,
            );
        });
        document.querySelector(".followings-number")?.addEventListener("click", async () => {
            const data = await Request.get(Api.userFollowing(this.page.userId));
            new List(
                "followings",
                Api.list(data),
                this.page.loggedUsername === this.page.username,
                this.page,
            );
        });
    }
}

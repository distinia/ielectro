import { Api } from "../core/api.js";
import { App, Auth, Request } from "../core/index.js";
import { Actions } from "./actions.js";
import { List } from "./list.js";
import { BiographyEditor } from "./biography-editor.js";
import { ProfilePage } from "./profile-page.js";
import { Report } from "../core/report.js";

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
                <button type="button" class="profile-btn profile-btn-edit">Edit profile</button>
                <a href="https://account.ielectro.com/profile" class="profile-btn profile-btn-primary">Account settings</a>`;
            container
                .querySelector(".profile-btn-edit")
                ?.addEventListener("click", () =>
                    BiographyEditor.open(this.page),
                );
            return;
        }
        let following = await App.isFollowing(this.page.userId);
        let followsYou = false;
        try {
            const res = await Request.get(Api.user(this.page.username));
            const user = Api.record(res) || {};
            followsYou = !!user.follows_you;
            if (user.viewer_following != null) {
                following = !!user.viewer_following;
            }
        } catch {
            followsYou = await App.isFollowedBy(this.page.userId);
        }
        let label = "Follow";
        let btnClass = "profile-btn profile-btn-primary";
        if (following) {
            label = "Following";
            btnClass = "profile-btn profile-btn-muted";
        } else if (followsYou) {
            label = "Follow back";
            btnClass = "profile-btn profile-btn-primary profile-btn-follow-back";
        }
        container.innerHTML = `<button type="button" class="${btnClass}">${label}</button>
                <button type="button" class="profile-btn profile-btn-muted profile-btn-report">Report user</button>`;
        container.querySelector("button").onclick = () =>
            following
                ? new Actions(this.page).unfollow(() => this.initActions())
                : new Actions(this.page).follow(() => this.initActions());
        container.querySelector(".profile-btn-report")?.addEventListener("click", () => {
            if (this.page.userId) Report.openUser(this.page.userId);
        });
    }

    bindStats() {
        document.querySelector(".followers-stat")?.addEventListener("click", async () => {
            const data = await Request.get(Api.userFollowers(this.page.userId));
            new List(
                "followers",
                Api.list(data),
                this.page.loggedUsername === this.page.username,
                this.page,
            );
        });
        document.querySelector(".followings-stat")?.addEventListener("click", async () => {
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

import { App, Alert, Request, Mention } from "../core/index.js";
export class Informations {
    constructor(username) {
        this.username = username;
        this.init();
    }
    async init() {
        try {
            const profile = await Request.get(App.api("user/profile"), {
                username: this.username,
            });
            profile.data.forEach((user) => {
                document.querySelector(".avatar").src = `${user.avatar}?t=${Date.now()}`;
                document.querySelector(".username").textContent = user.username;
                const articles = Number(user.articles) || 0;
                document.querySelector(".articles-number").textContent =
                    `${articles} article${articles === 1 ? "" : "s"}`;
                document.querySelector(".followers-number").textContent =
                    `${user.followers} followers`;
                document.querySelector(".followings-number").textContent =
                    `${user.followings} following`;
                currentBio = user.biography || "";
                Mention.renderInto(
                    document.querySelector(".biography"),
                    currentBio,
                    "No biography yet.",
                );
                document.title = `@${user.username} - iElectro Dyscover`;
            });
        } catch {
            Alert.error("Failed to load profile");
        }
    }
}

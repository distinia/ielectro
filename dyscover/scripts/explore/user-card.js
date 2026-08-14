import { App } from "../core/app.js";
import { ExploreHelpers } from "./helpers.js";

export class UserCard {
    constructor(user) {
        this.user = user;
        this.create();
    }

    create() {
        const mount = ExploreHelpers.mountFor("user");
        if (!mount) return;

        const username = String(this.user?.username || "");
        const avatar =
            this.user?.avatar ||
            App.userAvatarUrl(0, username, "", this.user?.account_id);

        const card = document.createElement("a");
        card.className = "user-card";
        card.href = `https://dyscover.ielectro.com/users/${encodeURIComponent(username)}`;
        card.innerHTML = `
        <div class="user-avatar"><img src="${App.escapeAttr(avatar)}" alt="" loading="lazy"></div>
        <div class="user-info"><h3 class="user-name">${App.escapeHtml(username)}</h3></div>`;
        mount.appendChild(card);
        App.wireAvatarImg(card.querySelector("img"));
    }
}

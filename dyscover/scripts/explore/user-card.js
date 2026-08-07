export class UserCard {
    constructor(user) {
        this.user = user;
        this.create();
    }
    create() {
        const mount = searchMountFor("user");
        if (!mount) return;
        const card = document.createElement("a");
        card.className = "user-card";
        card.href = `https://dyscover.ielectro.com/u/${this.user.username}`;
        card.innerHTML = `
        <div class="user-avatar"><img src="${this.user.avatar}" alt="User avatar"></div>
        <div class="user-info"><h3 class="user-name">${this.user.username}</h3></div>`;
        mount.appendChild(card);
    }
}

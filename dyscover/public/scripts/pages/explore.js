import { App, Card, Request, Icons } from "./app.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    new UI();
    new Load();
});
const POST_TYPES = ["article", "image", "audio", "video", "document", "template"];
function recentsUrl(type) {
    if (type === "article") return App.api("article/recents");
    if (type === "template") return App.api("template/recents");
    return App.api("media/recents");
}
function recentsParams(type) {
    if (type === "article" || type === "template") return null;
    return { type };
}
function searchMountFor(type) {
    return document.querySelector(`[data-type="${type}"]`) || document.querySelector(`#${type}s`);
}
async function renderPostPreview(mount, item) {
    if (!item?.file) return;
    const card = new Card(item);
    return card.preview(mount);
}
async function renderItems(mount, items, type) {
    if (!mount || !Array.isArray(items) || !items.length) return;
    for (const item of items) {
        await renderPostPreview(mount, { ...item, type: item?.type || type });
    }
}
class UserCard {
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
class UI {
    constructor() {
        this.searchInput = document.querySelector("#searchInput");
        this.tabTriggers = document.querySelectorAll(".tab-trigger");
        this.tabContents = document.querySelectorAll(".tab-content");
        this.tabTriggers.forEach((trigger) => {
            trigger.addEventListener("click", () => this.switchTab(trigger));
        });
        if (this.searchInput) {
            this.searchInput.addEventListener("input", () => this.handleSearch());
        }
    }
    switchTab(trigger) {
        this.tabTriggers.forEach((t) => t.classList.remove("active"));
        trigger.classList.add("active");
        const tabName = trigger.getAttribute("data-tab");
        this.tabContents.forEach((content) => {
            content.classList.remove("active");
            if (content.id === tabName) content.classList.add("active");
        });
    }
    handleSearch() {
        const value = this.searchInput.value;
        clearTimeout(this._debounce);
        this._debounce = setTimeout(() => {
            window.history.pushState(null, "", `?term=${encodeURIComponent(value)}`);
            new Load();
        }, 300);
    }
}
class Load {
    constructor() {
        const params = new URLSearchParams(window.location.search);
        const term = params.get("term");
        if (term && term !== "") {
            const input = document.querySelector("#searchInput");
            if (input) input.value = term;
            new Output(term);
        } else {
            new Recents();
            const users = searchMountFor("user");
            if (users) users.innerHTML = "";
        }
    }
}
class Recents {
    constructor() {
        this.load();
    }
    async load() {
        for (const type of POST_TYPES) {
            const outputBox = searchMountFor(type);
            if (!outputBox) continue;
            outputBox.innerHTML = "";
            try {
                const res = await Request.get(recentsUrl(type), recentsParams(type));
                const items = Array.isArray(res?.data) ? res.data : [];
                if (!items.length) {
                    outputBox.innerHTML = `<p class="search-empty">No recent ${type}s.</p>`;
                    continue;
                }
                await renderItems(outputBox, items, type);
                await Icons.load(outputBox);
            } catch {
                outputBox.innerHTML = `<p class="search-empty">Unable to load ${type}s.</p>`;
            }
        }
    }
}
class Output {
    constructor(value) {
        this.value = value;
        this.types = ["user", ...POST_TYPES];
        this._last = null;
        this.load();
    }
    async load() {
        if (this._last === this.value) return;
        this._last = this.value;
        for (const type of this.types) {
            const outputBox = searchMountFor(type);
            if (!outputBox) continue;
            outputBox.innerHTML = "";
            try {
                const [url, params] = this.getApi(type);
                const res = await Request.get(url, params);
                const items = Array.isArray(res?.data) ? res.data : [];
                if (type === "user") {
                    items.forEach((item) => new UserCard(item));
                } else {
                    if (!items.length) {
                        outputBox.innerHTML = `<p class="search-empty">No results.</p>`;
                    } else {
                        await renderItems(outputBox, items, type);
                        await Icons.load(outputBox);
                    }
                }
            } catch {
                if (type !== "user") {
                    outputBox.innerHTML = `<p class="search-empty">No results.</p>`;
                }
            }
        }
    }
    getApi(type) {
        if (type === "article") {
            return [App.api("article/search"), { term: this.value }];
        }
        if (type === "user") {
            return [App.api("user/search"), { term: this.value }];
        }
        if (type === "template") {
            return [App.api("template/search"), { term: this.value }];
        }
        return [App.api("media/search"), { term: this.value, type }];
    }
}

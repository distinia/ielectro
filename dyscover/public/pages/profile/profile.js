import { App, Card, Alert, Overlay, UsersList, Auth, Request, Icons, Mention } from "./app.js";
let currentUsername = null;
let loggedUsername = null;
let profilePosts = [];
let profileSaved = [];
let profileLiked = [];
let currentBio = "";
let profileMainFilter = "posts";
let profileTypeFilter = "article";
const PROFILE_TYPE_LABELS = {
    article: "Articles",
    image: "Images",
    video: "Videos",
    audio: "Audios",
    document: "Documents",
    template: "Templates",
};
const PROFILE_SOURCES = [
    { type: "article", url: App.api("article/user") },
    { type: "image", url: App.api("media/user"), params: { type: "image" } },
    { type: "video", url: App.api("media/user"), params: { type: "video" } },
    { type: "audio", url: App.api("media/user"), params: { type: "audio" } },
    { type: "document", url: App.api("media/user"), params: { type: "document" } },
    { type: "template", url: App.api("template/user") },
];
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    loggedUsername = await Auth.username();
    const urlUsername = App.urlLastPart();
    currentUsername =
        urlUsername == loggedUsername ? loggedUsername : urlUsername;
    document.title = `@${currentUsername} - iElectro Dyscover`;
    new UI();
    new Informations(currentUsername);
    new Posts(currentUsername);
});
class Actions {
    constructor(username) {
        this.username = username;
    }
    async follow() {
        await Request.post(App.api("user/follow"), { username: this.username });
        Alert.success("Followed");
        new Informations(currentUsername);
        new UI();
    }
    async unfollow() {
        const confirm = await Alert.confirm("Unfollow this user?");
        if (!confirm) return;
        await Request.post(App.api("user/unfollow"), { username: this.username });
        Alert.success("Unfollowed");
        new Informations(currentUsername);
        new UI();
    }
    async removeFollower() {
        await Request.post(App.api("user/remove-follower"), {
            username: this.username,
        });
    }
}
class UI {
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
class List {
    constructor(type, data, canManage = false) {
        this.type = type;
        this.data = Array.isArray(data) ? data : [];
        this.canManage = canManage;
        this.open();
    }
    open() {
        const actionLabel = this.canManage
            ? this.type === "followers"
                ? "Remove Follower"
                : "Unfollow"
            : null;
        const list = new UsersList({
            title: this.type === "followers" ? "Followers" : "Followings",
            searchable: true,
            actionLabel,
            loadUsers: async (term) => {
                const q = term.trim().toLowerCase();
                if (!q) return this.data;
                return this.data.filter((u) =>
                    String(u.username || "")
                        .toLowerCase()
                        .includes(q),
                );
            },
            onSelect: (user) => {
                window.location.href = `https://dyscover.ielectro.com/u/${encodeURIComponent(user.username)}`;
            },
            onAction: this.canManage
                ? async (user, row) => {
                      const actions = new Actions(user.username);
                      const me = await Auth.username();
                      if (this.type === "followers" && me === currentUsername) {
                          const ok = await Alert.confirm("Remove follower?");
                          if (ok) {
                              await actions.removeFollower();
                              row.remove();
                          }
                      } else {
                          actions.unfollow();
                          row.remove();
                      }
                  }
                : null,
        });
        list.open();
    }
}
class BiographyEditor {
    static async open(bio) {
        const overlay = new Overlay("Edit biography");
        await overlay.open();
        overlay.body((body) => {
            body.innerHTML = `
        <form class="bio-form">
          <textarea class="bio-input" maxlength="2000" rows="5" placeholder="Write something about you…">${bio || ""}</textarea>
          <div class="bio-actions">
            <button type="submit" class="profile-btn profile-btn-primary">Save</button>
          </div>
        </form>`;
            body.querySelector(".bio-form")?.addEventListener("submit", async (e) => {
                e.preventDefault();
                const text = body.querySelector(".bio-input")?.value.trim() || "";
                try {
                    await Request.post(App.api("user/biography"), { biography: text });
                    currentBio = text;
                    Mention.renderInto(
                        document.querySelector(".biography"),
                        currentBio,
                        "No biography yet.",
                    );
                    Alert.success("Biography updated");
                    overlay.close();
                } catch (err) {
                    Alert.error(
                        typeof err === "object" && err?.text ? err.text : "Update failed",
                    );
                }
            });
        });
    }
}
class Informations {
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
class Posts {
    constructor(username) {
        this.username = username;
        this.container = document.querySelector(".profile-posts");
        this.init();
    }
    async init() {
        if (!this.container) return;
        this.container.innerHTML = `<p class="profile-loading">Loading posts…</p>`;
        const isOwn = loggedUsername === this.username;
        document
            .querySelectorAll('.profile-tab[data-filter="liked"]')
            .forEach((tab) => {
                tab.style.display = isOwn ? "" : "none";
            });
        try {
            const batches = await Promise.all(
                PROFILE_SOURCES.map(async (source) => {
                    try {
                        const res = await Request.get(source.url, {
                            username: this.username,
                            ...(source.params || {}),
                        });
                        return (Array.isArray(res?.data) ? res.data : []).map((item) => ({
                            ...item,
                            type: item.type || source.type,
                        }));
                    } catch {
                        return [];
                    }
                }),
            );
            profilePosts = batches
                .flat()
                .filter((item) => item?.file)
                .sort(
                    (a, b) =>
                        new Date(b.created_at || b.updated_at || 0) -
                        new Date(a.created_at || a.updated_at || 0),
                );
            try {
                const savedRes = await Request.get(App.api("post/list-saved"), {
                    username: this.username,
                });
                profileSaved = (Array.isArray(savedRes?.data) ? savedRes.data : []).filter(
                    (item) => item?.file,
                );
            } catch {
                profileSaved = [];
            }
            if (isOwn) {
                try {
                    const likedRes = await Request.get(App.api("post/list-liked"));
                    profileLiked = (Array.isArray(likedRes?.data) ? likedRes.data : []).filter(
                        (item) => item?.file,
                    );
                } catch {
                    profileLiked = [];
                }
            } else {
                profileLiked = [];
            }
            renderProfileGrid();
        } catch {
            this.container.innerHTML = `<p class="profile-empty">Failed to load posts.</p>`;
            Alert.error("Failed to load posts");
        }
    }
}
function itemsForMainFilter() {
    if (profileMainFilter === "saved") return profileSaved;
    if (profileMainFilter === "liked") return profileLiked;
    return profilePosts;
}
function countForType(items, type) {
    return items.filter(
        (item) => String(item.type || "").toLowerCase() === type,
    ).length;
}
function updateTypeTabCounts() {
    const items = itemsForMainFilter();
    document.querySelectorAll(".profile-type-tab").forEach((tab) => {
        const type = tab.dataset.type;
        const label = PROFILE_TYPE_LABELS[type] || type;
        const count = countForType(items, type);
        tab.textContent = `${label} (${count})`;
    });
}
async function renderProfileGrid() {
    const container = document.querySelector(".profile-posts");
    if (!container) return;
    updateTypeTabCounts();
    let items = itemsForMainFilter().filter(
        (item) => String(item.type || "").toLowerCase() === profileTypeFilter,
    );
    container.innerHTML = "";
    if (!items.length) {
        const empty =
            profileMainFilter === "saved"
                ? "No saved posts in this tag."
                : profileMainFilter === "liked"
                  ? "No liked posts in this tag."
                  : "No posts in this tag.";
        container.innerHTML = `<p class="profile-empty">${empty}</p>`;
        return;
    }
    for (const item of items) {
        const card = new Card(item);
        await card.preview(container);
    }
    await Icons.load(container);
}

import { App, Alert, Request } from "../core/index.js";
export class Posts {
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

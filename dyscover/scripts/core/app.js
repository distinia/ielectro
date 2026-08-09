import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Request } from "./nesh.js";
import { Api } from "./api.js";
import { Navbar } from "./navbar.js";
import { Spinner } from "./spinner.js";
export class App {
    static scrollLocked = false;
    static userIdCache = new Map();
    static selfUserIdCache = null;
    static peerAvatarCache = Object.create(null);
    static ready = null;
    static blocked = false;

    constructor() {
        if (!App.ready) {
            App.ready = this.init();
        }
    }

    static async boot() {
        new App();
        await App.ready;
        return !App.blocked;
    }

    static async runPage(pageInit) {
        Spinner.showPage();
        try {
            if (!(await App.boot())) return false;
            if (pageInit) await pageInit();
            return true;
        } finally {
            Spinner.hidePage();
        }
    }
    async init() {
        Nesh.Input.enablePlainTextPaste();
        Nesh.Input.disableAutocomplete();
        Nesh.Input.disableTextCorrection();
        Nesh.Input.bind();

        const authed = await App.authenticated();
        const articleGuest = App.page() === "article" && !authed;

        if (!App.isPublicPage() && !authed) {
            window.location.href =
                "https://account.ielectro.com/login?service=dyscover";
            App.blocked = true;
            return;
        }

        if (authed || !articleGuest) {
            new Navbar();
            document.body.classList.add("has-navbar");
        }

        await Nesh.Icons.load(document.body);
    }

    static page() {
        const parts = window.location.pathname
            .replace(/\/$/, "")
            .split("/")
            .filter(Boolean);
        if (!parts.length) return "home";
        return parts[0];
    }

    static isPublicPage() {
        return App.page() === "article";
    }

    static async authenticated() {
        return Nesh.Auth.logged();
    }

    static escapeHtml(text) {
        return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    static escapeAttr(text) {
        return this.escapeHtml(text).replace(/'/g, "&#39;");
    }

    static initialsOf(value) {
        const parts = String(value || "?")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (!parts.length) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    static urlLastPart() {
        const parts = window.location.pathname
            .replace(/\/$/, "")
            .split("/")
            .filter(Boolean);
        return parts[parts.length - 1] || "";
    }

    static profileUsername() {
        const page = App.page();
        if (page === "users" || page === "u") {
            const slug = decodeURIComponent(App.urlLastPart() || "").replace(
                /^@/,
                "",
            );
            if (!slug || slug === "users" || slug === "u") {
                return "";
            }
            return slug;
        }
        return App.urlLastPart().replace(/^@/, "");
    }

    static setScrollEnabled(on) {
        App.scrollLocked = !on;
        document.body.style.overflow = on ? "" : "hidden";
    }

    static enrichPost(item = {}) {
        if (!item || typeof item !== "object") return {};
        const type = String(item.type || "article").toLowerCase();
        const userId = Number(item.user_id) || 0;
        const uuid = String(item.uuid || "");
        const extension = String(item.extension || "");
        const base = `${Api.origin}/assets/users/${userId}`;
        const defaultPreview = App.defaultPostPreview();
        const folders = {
            article: "articles",
            image: "images",
            video: "videos",
            audio: "audios",
            document: "documents",
            template: "templates",
        };
        let previewImage =
            item.preview_image || item.preview || "";
        let media = item.media || previewImage || "";
        let url = item.url || "";
        if (type === "article" && uuid && userId) {
            url = url || `${Api.origin}/article/${uuid}`;
            media = `${base}/articles/${uuid}.html`;
            if (!previewImage) previewImage = defaultPreview;
        } else if (folders[type] && uuid && userId && extension) {
            media =
                media ||
                `${base}/${folders[type]}/${uuid}.${extension.replace(/^\./, "")}`;
            if (!previewImage) previewImage = defaultPreview;
        } else if (!previewImage) {
            previewImage = defaultPreview;
        }
        if (!media && previewImage) media = previewImage;
        return {
            ...item,
            type,
            media,
            preview: previewImage,
            preview_image: previewImage,
            avatar: App.userAvatarUrl(userId, item.username, item.avatar),
            url,
            liked: !!item.liked,
            bookmarked: !!(item.bookmarked ?? item.saved),
            saved: !!(item.bookmarked ?? item.saved),
            reposted: !!item.reposted,
            created_at: item.created_at || item.published_at || null,
        };
    }

    static defaultPostPreview() {
        return `${Api.origin}/assets/brand/default-post.jpg`;
    }

    static userAvatarUrl(userId, username, explicit = "") {
        if (explicit) return String(explicit);
        const id = Number(userId);
        if (id > 0) {
            return `${Api.origin}/assets/users/${id}/avatar.png`;
        }
        return App.peerAvatarUrl(username);
    }

    static bustAvatarUrl(userId, explicit = "") {
        const base = App.userAvatarUrl(userId, "", explicit).split("?")[0];
        return `${base}?t=${Date.now()}`;
    }

    static refreshAvatarImages(userId, explicit = "") {
        const url = App.bustAvatarUrl(userId, explicit);
        document
            .querySelectorAll(
                ".avatar, .profile-edit-avatar-preview, .profile-header .avatar",
            )
            .forEach((img) => {
                img.src = url;
            });
        return url;
    }

    static async resolveUserId(username) {
        const raw = String(username || "").replace(/^@/, "").trim();
        const key = raw.toLowerCase();
        if (!key) return null;
        if (App.userIdCache.has(key)) {
            return App.userIdCache.get(key);
        }
        try {
            const res = await Request.get(Api.user(raw));
            const user = Api.record(res);
            const id = user?.id ? Number(user.id) : null;
            if (id) App.userIdCache.set(key, id);
            return id;
        } catch {
            return null;
        }
    }

    static async resolveSelfUserId(force = false) {
        if (!force && App.selfUserIdCache) {
            return App.selfUserIdCache;
        }
        const username = await Nesh.Auth.username(force);
        if (!username) {
            return null;
        }
        const id = await App.resolveUserId(username);
        if (id) {
            App.selfUserIdCache = id;
        }
        return id;
    }

    static async isFollowing(targetUserId) {
        const selfId = await App.resolveSelfUserId();
        if (!selfId || !targetUserId || selfId === targetUserId) return false;
        const res = await Request.get(Api.userFollowing(selfId));
        return Api.list(res).some(
            (user) => Number(user.id) === Number(targetUserId),
        );
    }

    static async isFollowedBy(userId) {
        const selfId = await App.resolveSelfUserId();
        if (!selfId || !userId || selfId === userId) return false;
        const res = await Request.get(Api.userFollowers(selfId));
        return Api.list(res).some(
            (user) => Number(user.id) === Number(userId),
        );
    }

    static normalizePeerKey(username) {
        return String(username || "")
            .replace(/^@/, "")
            .trim()
            .toLowerCase();
    }

    static peerAvatarUrl(username, explicitUrl) {
        const raw = String(username || "").replace(/^@/, "").trim();
        const key = App.normalizePeerKey(raw);
        if (!key) return "";
        const ex =
            explicitUrl != null && String(explicitUrl).trim() !== ""
                ? String(explicitUrl).trim()
                : null;
        if (ex) {
            App.peerAvatarCache[key] = ex;
            return ex;
        }
        if (App.peerAvatarCache[key]) return App.peerAvatarCache[key];
        const built = `https://account.ielectro.com/u/${encodeURIComponent(raw || key)}/avatar.png`;
        App.peerAvatarCache[key] = built;
        return built;
    }

    static wireAvatarImg(img) {
        if (!img) return;
        const wrap =
            img.closest(".notification-avatar-wrap") ||
            img.closest(".chat-avatar-wrap") ||
            img.closest(".chat-header-avatar-wrap") ||
            img.closest(".chat-msg-avatar") ||
            img.closest(".avatar");
        img.addEventListener("error", () => {
            img.classList.add("avatar-img--broken");
            wrap?.classList.add("avatar--fallback");
        });
        img.addEventListener("load", () => {
            img.classList.remove("avatar-img--broken");
            wrap?.classList.remove("avatar--fallback");
        });
    }

    static normalizeInboxThread(row = {}) {
        const peer = row.peer && typeof row.peer === "object" ? row.peer : {};
        const username =
            peer.username ||
            row.peer_username ||
            (typeof row.peer === "string" ? row.peer : "") ||
            "";
        return {
            id: Number(row.id) || 0,
            peer: username,
            peer_avatar: peer.avatar || row.peer_avatar || "",
            has_unread: Number(row.unread ?? row.has_unread ?? 0) > 0,
            last_message: row.last_message || "",
        };
    }

    static normalizeInboxMessage(row = {}) {
        return {
            id: Number(row.id) || 0,
            sender: row.username || row.sender || "",
            sender_avatar: row.avatar || row.sender_avatar || "",
            body: row.body || "",
            msg_kind: row.type || row.msg_kind || "text",
            attachment_url: row.attachment || row.attachment_url || "",
            created_at: row.created_at || null,
        };
    }
}

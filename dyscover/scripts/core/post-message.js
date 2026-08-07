export const DYSCOVER_POST_PREFIX = "@@DYSCOVER_POST@@";

export function encodePostMessage(item = {}) {
    const payload = {
        id: item.id,
        type: item.type || "article",
        title: item.title || "",
        preview: item.preview || item.preview_image || item.media || "",
        username: item.username || "",
    };
    return DYSCOVER_POST_PREFIX + JSON.stringify(payload);
}

export function decodePostMessage(body) {
    const raw = String(body || "");
    if (!raw.startsWith(DYSCOVER_POST_PREFIX)) return null;
    try {
        return JSON.parse(raw.slice(DYSCOVER_POST_PREFIX.length));
    } catch {
        return null;
    }
}

export function postTypeLabel(type) {
    const value = String(type || "post").toLowerCase();
    if (value === "article") return "article";
    if (value === "image") return "image";
    if (value === "video") return "video";
    if (value === "audio") return "audio";
    if (value === "document") return "document";
    if (value === "template") return "template";
    if (value === "biography") return "biography";
    return "post";
}

export function resolveNotificationType(item = {}) {
    if (item.type === "follow" && item.body === "unfollow") return "unfollow";
    return item.type || "default";
}

export function notificationArticle(item = {}) {
    if (item.post?.title) return item.post.title;
    if (item.type === "mention" && !item.post_id && !item.post) {
        return item.body || "biography";
    }
    return item.body || "";
}

export function notificationPostType(item = {}) {
    if (item.post?.type) return postTypeLabel(item.post.type);
    if (item.type === "mention" && !item.post_id && !item.post) {
        return "biography";
    }
    return postTypeLabel(item.post?.type || "post");
}

export function notificationTypeIcon(type) {
    const value = String(type || "default").toLowerCase();
    const map = {
        like: "heart",
        unlike: "heart-off",
        comment: "message-circle",
        reply: "message-circle",
        follow: "user-plus",
        unfollow: "user-minus",
        share: "share-2",
        mention: "at-sign",
        post: "file-plus",
        chat_message: "message-circle",
        chat_post: "send",
        system: "bell",
    };
    return map[value] || "bell";
}

export function formatRelativeTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w`;
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
    });
}

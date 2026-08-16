export class Api {
    static origin = "https://dyscover.ielectro.com";
    static accountOrigin = "https://account.ielectro.com";
    static base = `${Api.origin}/api`;
    static feed = (limit = 50) => `${Api.base}/feed/${limit}`;
    static exploreRecents = `${Api.base}/explore/recents`;
    static exploreSearchAll = (term) =>
        `${Api.base}/explore/${encodeURIComponent(term)}/all`;
    static posts = `${Api.base}/posts`;
    static post = (id) => `${Api.base}/posts/${id}`;
    static postComments = (id) => `${Api.base}/posts/${id}/comments`;
    static postComment = (postId, commentId) =>
        `${Api.base}/posts/${postId}/comments/${commentId}`;
    static postCommentLikes = (postId, commentId) =>
        `${Api.base}/posts/${postId}/comments/${commentId}/likes`;
    static postLikes = (id) => `${Api.base}/posts/${id}/likes`;
    static postBookmarks = (id) => `${Api.base}/posts/${id}/bookmarks`;
    static postReposts = (id) => `${Api.base}/posts/${id}/reposts`;
    static postShares = (id) => `${Api.base}/posts/${id}/shares`;
    static postViews = (id) => `${Api.base}/posts/${id}/views`;
    static article = (uuid) =>
        `${Api.base}/articles/${encodeURIComponent(uuid)}`;
    static articlePreview = (uuid) =>
        `${Api.base}/articles/${encodeURIComponent(uuid)}/preview`;
    static articleCover = (uuid) =>
        `${Api.base}/articles/${encodeURIComponent(uuid)}/cover`;
    static articlePdf = (uuid) =>
        `${Api.base}/articles/${encodeURIComponent(uuid)}/pdf`;
    static articleGenerate = (uuid) =>
        `${Api.base}/articles/${encodeURIComponent(uuid)}/generate`;
    static user = (idOrUsername) =>
        `${Api.base}/users/${encodeURIComponent(idOrUsername)}`;
    static userId(id) {
        const value = Number(id);
        if (!Number.isFinite(value) || value <= 0) {
            return null;
        }
        return value;
    }
    static userResource(id, suffix) {
        const userId = Api.userId(id);
        if (!userId) {
            throw new Error("Missing user id");
        }
        return `${Api.base}/users/${userId}/${suffix}`;
    }
    static userFollowers = (id) => Api.userResource(id, "followers");
    static userFollowing = (id) => Api.userResource(id, "following");
    static userPosts = (id, includeArchived = false) => {
        const base = Api.userResource(id, "posts");
        return includeArchived ? `${base}?include_archived=1` : base;
    };
    static userLikes = (id) => Api.userResource(id, "likes");
    static userBookmarks = (id) => Api.userResource(id, "bookmarks");
    static userReposts = (id) => Api.userResource(id, "reposts");
    static userMentions = (id) => Api.userResource(id, "mentions");
    static userFollowerOne = (userId, followerId) =>
        `${Api.base}/users/${Api.userId(userId)}/followers/${Api.userId(followerId)}`;
    static inbox = `${Api.base}/inbox`;
    static inboxUpload = (chatId) =>
        `${Api.base}/inbox/upload?chat_id=${encodeURIComponent(String(chatId))}`;
    static inboxOne = (id) => `${Api.base}/inbox/${id}`;
    static inboxMessages = (id) => `${Api.base}/inbox/${id}/messages`;
    static inboxMessage = (inboxId, messageId) =>
        `${Api.base}/inbox/${inboxId}/messages/${messageId}`;
    static activity = `${Api.base}/activity`;
    static activityOne = (id) => `${Api.base}/activity/${id}`;
    static activityMarkRead = (id) => `${Api.base}/activity/${id}/read`;
    static activityMarkAllRead = `${Api.base}/activity/read-all`;
    static creatorCenter = `${Api.base}/creator-center`;
    static tagsSuggest = (term) =>
        `${Api.base}/tags?term=${encodeURIComponent(String(term).replace(/^#+/, ""))}`;
    static templateFields = (id) => `${Api.base}/templates/${id}/fields`;
    static avatar = `${Api.accountOrigin}/api/avatar`;
    static data(body) {
        if (body === null || body === undefined) {
            return null;
        }
        if (typeof body === "object" && body !== null && "data" in body) {
            return body.data;
        }
        return body;
    }
    static list(body) {
        const data = Api.data(body);
        return Array.isArray(data) ? data : [];
    }
    static record(body) {
        const data = Api.data(body);
        return data && typeof data === "object" && !Array.isArray(data)
            ? data
            : null;
    }
    static message(body) {
        if (typeof body === "string") {
            return body;
        }
        if (body && typeof body === "object") {
            if (typeof body.message === "string") {
                return body.message;
            }
            if (typeof body.text === "string") {
                return body.text;
            }
        }
        return "";
    }
}

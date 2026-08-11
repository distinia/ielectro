import { Api } from "../core/api.js";
import { App, Card, Request } from "../core/index.js";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PostResolver {
    static parseUuidFromUrl(url) {
        if (!url) return "";
        try {
            const parsed = new URL(url, window.location.origin);
            const parts = parsed.pathname.split("/").filter(Boolean);
            const articleIdx = parts.indexOf("article");
            if (articleIdx >= 0 && parts[articleIdx + 1]) {
                const segment = decodeURIComponent(
                    parts[articleIdx + 1].replace(/\.html$/i, ""),
                ).split("#")[0];
                if (UUID_RE.test(segment)) {
                    return segment;
                }
                return segment;
            }
            const assetIdx = parts.indexOf("assets");
            if (assetIdx >= 0 && parts.length >= assetIdx + 4) {
                const file = parts[parts.length - 1] || "";
                return file.replace(/\.[^.]+$/, "").replace(/_cover$/i, "");
            }
        } catch {}
        return "";
    }

    static isUuid(value) {
        return UUID_RE.test(String(value || ""));
    }

    static isDyscoverUrl(url) {
        if (!url) return false;
        try {
            const host = new URL(url, window.location.origin).hostname;
            return host === "dyscover.ielectro.com" || host === window.location.hostname;
        } catch {
            return false;
        }
    }

    static linkKind(url) {
        if (!PostResolver.isDyscoverUrl(url)) return null;
        try {
            const path = new URL(url, window.location.origin).pathname;
            if (path.includes("/article/")) return "article";
            if (path.includes("/document/")) return "document";
            if (path.includes("/assets/") && path.includes("/documents/")) {
                return "document";
            }
        } catch {}
        return null;
    }

    static findPostInExplore(data, uuid) {
        for (const list of Object.values(data || {})) {
            if (!Array.isArray(list)) continue;
            const match = list.find(
                (row) =>
                    String(row.uuid || "").toLowerCase() === uuid.toLowerCase(),
            );
            if (match?.id) {
                return match;
            }
        }
        return null;
    }

    static isRenderablePreview(url) {
        const value = String(url || "").trim();
        if (!value) {
            return false;
        }
        if (/\.html(\?|#|$)/i.test(value)) {
            return false;
        }
        if (/\/articles\/[^/?#]+\.html/i.test(value)) {
            return false;
        }
        return true;
    }

    static async resolvePost(postId, url) {
        if (postId) {
            try {
                const res = await Request.get(Api.post(postId));
                const record = Api.record(res);
                if (record) return App.enrichPost(record);
            } catch {}
        }
        const uuid = PostResolver.parseUuidFromUrl(url);
        if (!uuid || !UUID_RE.test(uuid)) return null;
        try {
            const res = await Request.get(
                `${Api.base}/explore/${encodeURIComponent(uuid)}/all`,
            );
            const match = PostResolver.findPostInExplore(Api.data(res), uuid);
            if (match) {
                return App.enrichPost(match);
            }
        } catch {}
        return null;
    }

    static async openOverlay(postId, url) {
        const item = await PostResolver.resolvePost(postId, url);
        if (!item) return false;
        const card = new Card(item);
        await card.openOverlay();
        return true;
    }
}

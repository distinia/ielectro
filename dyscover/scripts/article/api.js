import { Api } from "../core/api.js";
import { App, Request } from "../core/index.js";
import { PostResolver } from "./post-resolver.js";
const TOOLBAR_ACTIONS = {
    Save: "save",
    Undo: "undo",
    Redo: "redo",
    Heading: "heading",
    Subheading: "subheading",
    Center: "center",
    Bold: "bold",
    italic: "italic",
    caption: "caption",
    link: "link",
    pointList: "pointList",
    numberList: "numberList",
    percentage: "percentage",
    legend: "legend",
    media: "media",
    table: "table",
    template: "template",
};
const ELEMENT_ACTIONS = {
    heading: "heading",
    "sub-heading": "subheading",
    bold: "bold",
    italic: "italic",
    caption: "caption",
    link: "link",
    "point-list": "pointList",
    "number-list": "numberList",
};
export class API {
    static normalizeElement(item) {
        if (!item || typeof item !== "object") {
            return null;
        }
        const action =
            (item.class && TOOLBAR_ACTIONS[item.class]) ||
            (item.element && ELEMENT_ACTIONS[item.element]) ||
            null;
        if (!action && !item.regex && !item.element) {
            return null;
        }
        return {
            ...item,
            action: action || item.element || String(item.class || "").toLowerCase(),
            text: item.title || item.text || item.class || item.element || "",
        };
    }
    static async getElements() {
        const raw = await Request.get(`${Api.origin}/data/elements.json`);
        const list = Array.isArray(raw) ? raw : Api.list(raw);
        return list.map((item) => API.normalizeElement(item)).filter(Boolean);
    }
    static async saveArticle(content) {
        const uuid = App.urlLastPart().replace(/\.html$/i, "");
        const res = await Request.put(Api.article(uuid), { content });
        return Api.message(res) || "Article saved";
    }
    static async setArticleCover(previewImage) {
        const uuid = App.urlLastPart().replace(/\.html$/i, "");
        const res = await Request.patch(Api.articleCover(uuid), {
            preview_image: previewImage,
        });
        return Api.record(res) || Api.data(res) || res;
    }
    static async getArticleInfo() {
        const uuid = App.urlLastPart().replace(/\.html$/i, "");
        const res = await Request.get(Api.article(uuid));
        return Api.record(res);
    }
    static async search(type, term) {
        const map = {
            article: "articles",
            template: "templates",
            image: "images",
            video: "videos",
            audio: "audio",
            document: "documents",
        };
        const segment = map[type];
        if (!segment) {
            throw new Error("Invalid search type");
        }
        const res = await Request.get(
            `${Api.base}/explore/${segment}/${encodeURIComponent(term)}`,
        );
        return Api.list(res).map((row) => ({
            ...row,
            updated: row.updated_at || row.updated || row.created_at || null,
            media: row.media || "",
            preview_image: row.preview_image || row.preview || "",
        }));
    }
    static async searchLinkPosts(term) {
        const [articles, documents] = await Promise.all([
            API.search("article", term),
            API.search("document", term),
        ]);
        return [...articles, ...documents].sort((a, b) =>
            String(a.title || "").localeCompare(String(b.title || ""), undefined, {
                sensitivity: "base",
            }),
        );
    }
    static async getTemplate(idOrTitle) {
        const raw = String(idOrTitle || "").trim();
        if (/^\d+$/.test(raw)) {
            const res = await Request.get(Api.templateFields(raw));
            return Api.list(res);
        }
        const name = raw.replace(/ /g, "_");
        if (!name) {
            throw new Error("Missing template name");
        }
        try {
            const res = await Request.get(`${Api.origin}/data/${name}.json`);
            const data = Api.data(res);
            if (Array.isArray(data)) {
                return data;
            }
        } catch {}
        const label = name.replace(/_/g, " ");
        const templates = await API.search("template", label);
        const match =
            templates.find(
                (row) =>
                    String(row.title || "")
                        .replace(/ /g, "_")
                        .toLowerCase() === name.toLowerCase(),
            ) || templates[0];
        if (!match?.id) {
            throw new Error("Template not found");
        }
        const res = await Request.get(Api.templateFields(match.id));
        return Api.list(res);
    }
    static async getArticlePreview(uuidOrSlug) {
        let raw = String(uuidOrSlug || "").replace(/\.html$/i, "").split("#")[0];
        raw = decodeURIComponent(raw).trim();
        if (!PostResolver.isUuid(raw)) {
            const resolved = await API.resolveArticleUuid(raw);
            if (!resolved) {
                throw new Error("Article not found");
            }
            raw = resolved;
        }
        const res = await Request.get(Api.articlePreview(raw));
        const record = Api.record(res);
        if (!record) {
            throw new Error("Article not found");
        }
        const preview = record.preview_image || "";
        const image = PostResolver.isRenderablePreview(preview)
            ? preview
            : "";
        return {
            id: record.id || "",
            uuid: record.uuid || raw,
            title: record.title || "",
            text: record.paragraph || record.description || "",
            status: !!image,
            url: image,
            articleUrl: record.url || `${Api.origin}/article/${raw}`,
        };
    }
    static async resolveArticleUuid(slugOrUuid) {
        const raw = decodeURIComponent(String(slugOrUuid || ""))
            .trim()
            .split("#")[0];
        if (PostResolver.isUuid(raw)) {
            return raw;
        }
        const variants = Array.from(
            new Set([
                raw,
                raw.replace(/_/g, " "),
                raw.replace(/-/g, " "),
            ]),
        ).filter(Boolean);
        for (const term of variants) {
            try {
                const res = await Request.get(
                    `${Api.base}/explore/articles/${encodeURIComponent(term)}`,
                );
                const articles = Api.list(res);
                const normalized = term.replace(/_/g, " ").toLowerCase();
                const slugKey = raw.toLowerCase();
                const match = articles.find((row) => {
                    const title = String(row.title || "").toLowerCase();
                    return (
                        title === normalized ||
                        title.replace(/\s+/g, "_") === slugKey ||
                        title.replace(/\s+/g, "-") === slugKey
                    );
                });
                if (match?.uuid) {
                    return String(match.uuid);
                }
            } catch {}
        }
        return "";
    }
}

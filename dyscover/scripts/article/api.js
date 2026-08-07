import { App, Request } from "../core/index.js";
export class API {
    static async getElements() {
        return await Request.get(
            "https://dyscover.ielectro.com/data/elements.json",
        );
    }
    static async generateAI(prompt) {
        /*const res = await Request.post(
            "https://dyscover.ielectro.com/api/article/generate",
            { prompt },
        );
        return res.data.json;*/
        return await Request.get(
            "https://dyscover.ielectro.com/data/Destenia.json",
        );
    }
    static async getTemplate(uuid) {
        let file = String(uuid || "").trim();
        if (!file.toLowerCase().endsWith(".json")) {
            file = `${file}.json`;
        }
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/template/data",
            { file },
        );
        return res.data;
    }
    static async saveArticle(content) {
        const file = App.urlLastPart() + '.html';
        const res = await Request.put(
            "https://dyscover.ielectro.com/api/article/edit",
            { content, file },
        );
        return res.text;
    }
    static async getArticleAuth() {
        const file = App.urlLastPart() + '.html';
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/article/users-auth",
            { file },
        );
        return res?.data?.status ?? res?.status ?? false;
    }
    static async getArticleInfo() {
        const file = App.urlLastPart() + '.html';
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/article/info",
            { file },
        );
        return res?.data ?? res ?? false;
    }
    static async search(type, term) {
        const map = {
            article: "article/search",
            template: "template/search",
            image: "media/search",
            video: "media/search",
            audio: "media/search",
            document: "media/search",
        };
        const endpoint = map[type];
        if (!endpoint) throw new Error("Invalid search type");
        const res = await Request.get(
            `https://dyscover.ielectro.com/api/${endpoint}`,
            { term, type },
        );
        return res.data;
    }
    static async getArticlePreview(file) {
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/article/preview",
            { file },
        );
        return res.data;
    }
    static async getMediaDescription(file, type) {
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/media/viewer",
            { file, type },
        );
        return res.data.description;
    }
}

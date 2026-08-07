import { Api } from "../core/api.js";
import { App, Request } from "../core/index.js";

export class API {
    static async getElements() {
        return await Request.get(
            "https://dyscover.ielectro.com/data/elements.json",
        );
    }

    static async generateAI() {
        return await Request.get(
            "https://dyscover.ielectro.com/data/Destenia.json",
        );
    }

    static async saveArticle(content) {
        const uuid = App.urlLastPart().replace(/\.html$/i, "");
        const res = await Request.put(Api.article(uuid), { content });
        return Api.message(res) || "Article saved";
    }

    static async getArticleInfo() {
        const uuid = App.urlLastPart().replace(/\.html$/i, "");
        const res = await Request.get(Api.article(uuid));
        return Api.record(res);
    }

    static async getArticleAuth() {
        const info = await API.getArticleInfo();
        return !!info?.can_edit;
    }
}

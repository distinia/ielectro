import { Alert, Auth } from "../core/index.js";
import { API } from "./api.js";
import { Editor } from "./editor.js";
import { state } from "./state.js";

export class Article {
    constructor() {
        this.load();
    }

    async load() {
        try {
            const res = await API.getArticleInfo();
            if (!res) {
                Alert.error("Article not found");
                return;
            }
            document.title = `${res.title} - iElectro Dyscover`;
            document.querySelector(".title").textContent = res.title;
            document.querySelector(".content").innerHTML = res.content;
            document.body.dataset.uuid = res.uuid;
            new Editor();
            await this.editAuthorization();
        } catch {
            Alert.error("Article not found");
        }
    }

    async editAuthorization() {
        try {
            if (await Auth.logged()) {
                state = "user";
            }
            if (await API.getArticleAuth()) {
                state = "editor";
                await Editor.current.init();
                await Editor.current.index.startEditing();
            }
        } catch {}
    }
}

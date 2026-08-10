import { Alert, Auth } from "../core/index.js";
import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { API } from "./api.js";
import { Editor } from "./editor.js";
import { setArticleState } from "./state.js";

export class Article {
    async load() {
        try {
            const res = await API.getArticleInfo();
            if (!res) {
                Alert.error("Article not found");
                return;
            }
            document.title = `${res.title} - iElectro Dyscover`;
            const title = document.querySelector(".title");
            const content = document.querySelector(".content");
            if (title) title.textContent = res.title;
            if (content) {
                content.innerHTML = Nesh.LazyMedia.enrichHtml(res.content || "");
                Nesh.LazyMedia.apply(content);
            }
            document.body.dataset.uuid = res.uuid;
            new Editor();
            await this.editAuthorization(res);
        } catch {
            Alert.error("Article not found");
        }
    }

    async editAuthorization(res) {
        if (!Editor.current) return;
        try {
            if (await Auth.logged()) {
                setArticleState("user");
            }
            if (res?.can_edit) {
                setArticleState("editor");
                await Editor.current.init();
            }
        } catch {
            /* guest or unauthorized */
        } finally {
            await Editor.current.index.refresh();
            Editor.current?.activateElements();
        }
    }
}

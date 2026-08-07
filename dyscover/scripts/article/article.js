import { Alert, Auth } from "../core/index.js";
import { API } from "./api.js";
import { Editor } from "./editor.js";
export class Article {
    constructor() {
        this.load();
    }
    async load() {
        try {
            const res = await API.getArticleInfo();
            if (!res) {
                Alert.error('Article not found');
                return;
            }
            document.title = res.title + ' - iElectro Dyscover';
            document.querySelector('.title').textContent = res.title;
            document.querySelector('.content').innerHTML = res.content;
            document.body.dataset.file = res.file;
            const keywords = res.tags ?? [];
            document.querySelector('meta[name="keywords"]')?.setAttribute('content', keywords.join(', '));
            new Editor();
            this.editAuthorization();
        } catch {
            Alert.error('Article not found');
        }
    }
    async editAuthorization() {
        try {
            const logged = await Auth.logged();
            if (logged) {
                state = "user";
            }
            const authorized = await API.getArticleAuth();
            if (authorized) {
                state = "editor";
                Editor.current.init();
            }
        } catch {}
    }
}

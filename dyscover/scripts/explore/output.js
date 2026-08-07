import { App, Icons, Request } from "../core/index.js";
import { UserCard } from "./user-card.js";
export class Output {
    constructor(value) {
        this.value = value;
        this.types = ["user", ...POST_TYPES];
        this._last = null;
        this.load();
    }
    async load() {
        if (this._last === this.value) return;
        this._last = this.value;
        for (const type of this.types) {
            const outputBox = searchMountFor(type);
            if (!outputBox) continue;
            outputBox.innerHTML = "";
            try {
                const [url, params] = this.getApi(type);
                const res = await Request.get(url, params);
                const items = Array.isArray(res?.data) ? res.data : [];
                if (type === "user") {
                    items.forEach((item) => new UserCard(item));
                } else {
                    if (!items.length) {
                        outputBox.innerHTML = `<p class="search-empty">No results.</p>`;
                    } else {
                        await renderItems(outputBox, items, type);
                        await Icons.load(outputBox);
                    }
                }
            } catch {
                if (type !== "user") {
                    outputBox.innerHTML = `<p class="search-empty">No results.</p>`;
                }
            }
        }
    }
    getApi(type) {
        if (type === "article") {
            return [App.api("article/search"), { term: this.value }];
        }
        if (type === "user") {
            return [App.api("user/search"), { term: this.value }];
        }
        if (type === "template") {
            return [App.api("template/search"), { term: this.value }];
        }
        return [App.api("media/search"), { term: this.value, type }];
    }
}

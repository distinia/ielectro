import { Api } from "../core/api.js";
import { Icons, Request } from "../core/index.js";
import { EmptyState } from "../core/empty-state.js";
import { ExploreHelpers } from "./helpers.js";
import { ExploreGrid } from "./recents.js";
import { UserCard } from "./user-card.js";

export class Output {
    static keys = {
        user: "users",
        article: "articles",
        image: "images",
        video: "videos",
        audio: "audios",
        document: "documents",
        template: "templates",
    };

    constructor(value) {
        this.value = value;
        this.types = ["user", ...ExploreHelpers.types];
        this._last = null;
    }

    async load() {
        if (this._last === this.value) return;
        this._last = this.value;
        let payload = {};
        try {
            const res = await Request.get(Api.exploreSearchAll(this.value));
            payload = Api.record(res) || {};
        } catch {
            payload = {};
        }
        for (const type of this.types) {
            const outputBox = ExploreHelpers.mountFor(type);
            if (!outputBox) continue;
            outputBox.innerHTML = "";
            const key = Output.keys[type] || `${type}s`;
            const items = Array.isArray(payload[key]) ? payload[key] : [];
            if (type === "user") {
                if (!items.length) {
                    outputBox.innerHTML = EmptyState.html(
                        EmptyState.exploreSearch("user", this.value),
                    );
                    await Icons.load(outputBox);
                } else {
                    items.forEach((item) => new UserCard(item));
                }
                continue;
            }
            if (!items.length) {
                outputBox.innerHTML = EmptyState.html(
                    EmptyState.exploreSearch(type, this.value),
                );
                await Icons.load(outputBox);
                continue;
            }
            await ExploreGrid.renderItems(outputBox, items, type);
        }
    }
}

import { App } from "../core/app.js";
import { Api } from "../core/api.js";
import { Card, EmptyState, Icons, Request } from "../core/index.js";
import { ExploreHelpers } from "./helpers.js";
export class Recents {
    async load() {
        let items = [];
        try {
            const res = await Request.get(Api.exploreRecents);
            items = Api.list(res);
        } catch {
            items = [];
        }
        for (const type of ExploreHelpers.types) {
            const outputBox = ExploreHelpers.mountFor(type);
            if (!outputBox) continue;
            outputBox.innerHTML = "";
            const filtered = items.filter(
                (item) => String(item.type || "") === type,
            );
            if (!filtered.length) {
                outputBox.innerHTML = EmptyState.html(
                    EmptyState.exploreRecents(type),
                );
                await Icons.load(outputBox);
                continue;
            }
            await ExploreGrid.renderItems(outputBox, filtered, type);
        }
    }
}
export class ExploreGrid {
    static async renderPreview(mount, item, type) {
        if (!mount || !item?.id) return;
        const card = new Card(App.enrichPost({ ...item, type: item.type || type }));
        await card.preview(mount);
    }
    static async renderItems(mount, items, type) {
        if (!mount || !Array.isArray(items) || !items.length) return;
        for (const item of items) {
            const cell = document.createElement("div");
            cell.className = "search-result-cell";
            mount.appendChild(cell);
            await ExploreGrid.renderPreview(cell, item, type);
        }
        await Icons.load(mount);
    }
}

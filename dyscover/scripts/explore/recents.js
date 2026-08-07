import { Icons, Request } from "../core/index.js";
export class Recents {
    constructor() {
        this.load();
    }
    async load() {
        for (const type of POST_TYPES) {
            const outputBox = searchMountFor(type);
            if (!outputBox) continue;
            outputBox.innerHTML = "";
            try {
                const res = await Request.get(recentsUrl(type), recentsParams(type));
                const items = Array.isArray(res?.data) ? res.data : [];
                if (!items.length) {
                    outputBox.innerHTML = `<p class="search-empty">No recent ${type}s.</p>`;
                    continue;
                }
                await renderItems(outputBox, items, type);
                await Icons.load(outputBox);
            } catch {
                outputBox.innerHTML = `<p class="search-empty">Unable to load ${type}s.</p>`;
            }
        }
    }
}

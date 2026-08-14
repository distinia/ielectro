import { Api, Request } from "../core/index.js";
import { CreatorRegistry } from "./registry.js";
import { Table } from "./table.js";
const LABELS = [
    ["articles", "Articles", "article"],
    ["images", "Images", "image"],
    ["videos", "Videos", "video"],
    ["audios", "Audios", "audio"],
    ["documents", "Docs", "document"],
    ["templates", "Templates", "template"],
];
export async function refreshCreatorStats() {
    const mount = document.querySelector(".number-elements");
    if (!mount) return;
    const active =
        document.querySelector(".creator-stat-pill.is-active")?.dataset.type ||
        CreatorRegistry.activeType() ||
        "article";
    try {
        const res = await Request.get(Api.creatorCenter);
        const data = Api.record(res) || {};
        mount.innerHTML = LABELS.map(
            ([key, label, type]) =>
                `<button type="button" class="creator-stat-pill" data-type="${type}"><strong>${Number(data[key] || 0)}</strong> ${label}</button>`,
        ).join("");
        Table.bindStatPills();
        Table.switchTo(active);
    } catch {
        mount.innerHTML = "";
    }
}

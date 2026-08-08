import { App } from "../core/app.js";
import { Alert, Icons, Request, Api } from "../core/index.js";
import { CreatorRegistry } from "./registry.js";
import { Search } from "./search.js";
import { Table } from "./table.js";

document.addEventListener("DOMContentLoaded", () => {
    App.runPage(async () => {
        await CreatorRegistry.loadAll();
        await loadStats();
        new Table();
        new Search();
        document.querySelector(".action-buttons .create")?.addEventListener("click", () => {
            const Class = CreatorRegistry.activeClass();
            if (!Class) {
                return Alert.error("Select a content type first");
            }
            Class.create();
        });
        document.querySelector(".action-buttons .edit")?.addEventListener("click", async () => {
            const Class = CreatorRegistry.activeClass();
            if (!Class) return;
            const selected = Class.getSelected();
            if (selected.length !== 1) {
                return Alert.error("Select exactly one item");
            }
            await selected[0].edit();
        });
        document.querySelector(".action-buttons .delete")?.addEventListener("click", async () => {
            const Class = CreatorRegistry.activeClass();
            if (!Class) return;
            const selected = Class.getSelected();
            if (!selected.length) {
                return Alert.error("Select at least one item");
            }
            const ok = await Alert.confirm(
                selected.length === 1
                    ? `Delete "${selected[0].title || "this item"}"?`
                    : `Delete ${selected.length} selected items?`,
            );
            if (!ok) return;
            let deleted = 0;
            for (const post of selected) {
                if (await post.delete({ skipConfirm: true })) deleted += 1;
            }
            if (deleted) {
                Alert.success(deleted === 1 ? "Deleted" : `${deleted} items deleted`);
                await CreatorRegistry.reload();
                await loadStats();
            }
        });
        await Icons.load(document.body);
    });
});

async function loadStats() {
    const mount = document.querySelector(".number-elements");
    if (!mount) return;
    try {
        const res = await Request.get(Api.creatorCenter);
        const data = Api.record(res) || {};
        const labels = [
            ["articles", "Articles"],
            ["images", "Images"],
            ["videos", "Videos"],
            ["audios", "Audios"],
            ["documents", "Docs"],
            ["templates", "Templates"],
        ];
        mount.innerHTML = labels
            .map(
                ([key, label]) =>
                    `<span class="creator-stat-pill"><strong>${Number(data[key] || 0)}</strong> ${label}</span>`,
            )
            .join("");
    } catch {
        mount.innerHTML = "";
    }
}

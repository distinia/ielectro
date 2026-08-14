import { App } from "../core/app.js";
import { Alert, Icons } from "../core/index.js";
import { CreatorRegistry } from "./registry.js";
import { refreshCreatorStats } from "./creator-stats.js";
import { Search } from "./search.js";
import { Table } from "./table.js";
document.addEventListener("DOMContentLoaded", () => {
    App.runPage(async () => {
        await CreatorRegistry.loadAll();
        await refreshCreatorStats();
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
        document.querySelector(".action-buttons .archive")?.addEventListener("click", async () => {
            const Class = CreatorRegistry.activeClass();
            if (!Class) return;
            const selected = Class.getSelected();
            if (!selected.length) {
                return Alert.error("Select at least one item");
            }
            const isArchived = (post) => post.isArchived();
            const allArchived = selected.every(isArchived);
            const allActive = selected.every((post) => !isArchived(post));
            let message;
            if (selected.length === 1) {
                const post = selected[0];
                message = isArchived(post)
                    ? `Restore "${post.title || "this item"}"? It will be visible again on your profile and feeds.`
                    : `Archive "${post.title || "this item"}"? It will be hidden from your profile and feeds.`;
            } else if (allArchived) {
                message = `Restore ${selected.length} selected items? They will be visible again on your profile and feeds.`;
            } else if (allActive) {
                message = `Archive ${selected.length} selected items? They will be hidden from your profile and feeds.`;
            } else {
                message = `Toggle archive status for ${selected.length} selected items?`;
            }
            const ok = await Alert.confirm(message);
            if (!ok) return;
            let changed = 0;
            for (const post of selected) {
                if (await post.archive({ skipConfirm: true })) changed += 1;
            }
            if (changed) {
                await CreatorRegistry.reload();
                await refreshCreatorStats();
            }
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
                    ? `Delete "${selected[0].title || "this item"}" permanently? Files and data will be removed.`
                    : `Delete ${selected.length} selected items permanently? Files and data will be removed.`,
            );
            if (!ok) return;
            let deleted = 0;
            for (const post of selected) {
                if (await post.delete({ skipConfirm: true })) deleted += 1;
            }
            if (deleted) {
                await CreatorRegistry.reload();
                await refreshCreatorStats();
            }
        });
        await Icons.load(document.body);
    });
});

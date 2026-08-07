import { App } from "../core/app.js";
import { Alert, Icons } from "../core/index.js";
import { CreatorRegistry } from "./registry.js";
import { Search } from "./search.js";
import { Table } from "./table.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await App.boot())) return;
    await CreatorRegistry.loadAll();
    new Table();
    new Search();
    document.querySelector(".action-buttons .create")?.addEventListener("click", () => {
        const Class = CreatorRegistry.activeClass();
        if (!Class) {
            return Alert.error("Select a content type first");
        }
        Class.create();
    });
    document.querySelector(".action-buttons .edit")?.addEventListener("click", () => {
        const Class = CreatorRegistry.activeClass();
        if (!Class) return;
        const selected = Class.getSelected();
        if (selected.length !== 1) {
            return Alert.error("Select exactly one item");
        }
        selected[0].edit();
    });
    document.querySelector(".action-buttons .delete")?.addEventListener("click", async () => {
        const Class = CreatorRegistry.activeClass();
        if (!Class) return;
        const selected = Class.getSelected();
        if (!selected.length) {
            return Alert.error("Select at least one item");
        }
        for (const post of selected) {
            await post.delete();
        }
    });
    await Icons.load(document.body);
});

import { Search, Table, Post, Article, Image, Video, Audio, Document, Template } from "../creator-center/index.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    classes.forEach(Class => Class.loadTable());
    new Table();
    new Search();
    document.querySelector(".create")?.addEventListener("click", () => {
        const Class = Table.getActiveClass();
        if (Class) {
            Class.create();
        }
    });
    document.querySelector(".edit")?.addEventListener("click", () => {
        const Class = Table.getActiveClass();
        if (!Class) return;
        const selected = Class.getSelected();
        if (selected.length !== 1) {
            return Alert.error("Select exactly one item");
        }
        selected[0].edit();
    });
    document.querySelector(".delete")?.addEventListener("click", async () => {
        const Class = Table.getActiveClass();
        if (!Class) return;
        const selected = Class.getSelected();
        if (!selected.length) {
            return Alert.error("Select at least one item");
        }
        for (const post of selected) {
            await post.delete();
        }
    });
    await Icons.load();
});

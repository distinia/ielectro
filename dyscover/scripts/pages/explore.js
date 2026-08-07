import { UserCard, UI, Load, Recents, Output } from "../explore/index.js";
import Nesh from "../../../nesh/scripts/nesh.js";

window.addEventListener("DOMContentLoaded", async () => {
    new App();
    new UI();
    new Load();
});
const POST_TYPES = ["article", "image", "audio", "video", "document", "template"];
function recentsUrl(type) {
    if (type === "article") return App.api("article/recents");
    if (type === "template") return App.api("template/recents");
    return App.api("media/recents");
}
function recentsParams(type) {
    if (type === "article" || type === "template") return null;
    return { type };
}
function searchMountFor(type) {
    return document.querySelector(`[data-type="${type}"]`) || document.querySelector(`#${type}s`);
}
async function renderPostPreview(mount, item) {
    if (!item?.file) return;
    const card = new Card(item);
    return card.preview(mount);
}
async function renderItems(mount, items, type) {
    if (!mount || !Array.isArray(items) || !items.length) return;
    for (const item of items) {
        await renderPostPreview(mount, { ...item, type: item?.type || type });
    }
}

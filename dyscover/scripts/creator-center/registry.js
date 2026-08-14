import { Api } from "../core/api.js";
import { App, Request } from "../core/index.js";
import { Post } from "./post.js";
import { Article } from "./article.js";
import { Image } from "./image.js";
import { Video } from "./video.js";
import { Audio } from "./audio.js";
import { Document } from "./document.js";
import { Template } from "./template.js";
export class CreatorRegistry {
    static classes = [Article, Image, Video, Audio, Document, Template];
    static posts = [];
    static loaded = false;
    static async loadAll() {
        const userId = await App.resolveSelfUserId();
        if (!userId) {
            throw new Error("Missing user id");
        }
        const res = await Request.get(Api.userPosts(userId, true));
        CreatorRegistry.posts = Api.list(res);
        CreatorRegistry.loaded = true;
        for (const Class of CreatorRegistry.classes) {
            Class.renderTable(CreatorRegistry.posts);
        }
        await CreatorRegistry.applySearch();
    }
    static async reload() {
        await CreatorRegistry.loadAll();
    }
    static async applySearch() {
        const { Search } = await import("./search.js");
        Search.instance?.apply();
    }
    static activeType() {
        const section = document.querySelector(".section.active-section");
        if (!section) return "article";
        for (const Class of CreatorRegistry.classes) {
            if (section.classList.contains(`${Class.type}-section`)) {
                return Class.type;
            }
        }
        return "article";
    }
    static activeClass() {
        const type = CreatorRegistry.activeType();
        return CreatorRegistry.classes.find((Class) => Class.type === type) || null;
    }
}
export { Post, Article, Image, Video, Audio, Document, Template };

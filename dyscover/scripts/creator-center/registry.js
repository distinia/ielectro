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
        const res = await Request.get(Api.userPosts(userId));
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

    static activeClass() {
        const hint = document.querySelector(".upload-hint.is-active");
        const type = hint?.dataset.type;
        if (!type) return null;
        return CreatorRegistry.classes.find((Class) => Class.type === type);
    }
}

export { Post, Article, Image, Video, Audio, Document, Template };

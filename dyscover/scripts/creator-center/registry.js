import { Post } from "./post.js";
import { Article } from "./article.js";
import { Image } from "./image.js";
import { Video } from "./video.js";
import { Audio } from "./audio.js";
import { Document } from "./document.js";
import { Template } from "./template.js";

export class CreatorRegistry {
    static classes = [Article, Image, Video, Audio, Document, Template];

    static tabSelector(tab) {
        if (!tab) return null;
        const name = [...tab.classList].find(
            (className) => className.endsWith("-tab") && className !== "tab",
        );
        return name ? `.${name}` : null;
    }

    static async loadAll() {
        for (const Class of CreatorRegistry.classes) {
            await Class.loadTable();
        }
    }

    static activeClass() {
        const tab = document.querySelector(".tab.active-tab");
        const selector = CreatorRegistry.tabSelector(tab);
        if (!selector) return null;
        return CreatorRegistry.classes.find((Class) => Class.tab === selector);
    }
}

export { Post, Article, Image, Video, Audio, Document, Template };

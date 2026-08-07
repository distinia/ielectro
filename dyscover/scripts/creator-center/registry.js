import { Post } from "./post.js";
import { Article } from "./article.js";
import { Image } from "./image.js";
import { Video } from "./video.js";
import { Audio } from "./audio.js";
import { Document } from "./document.js";
import { Template } from "./template.js";

export class CreatorRegistry {
    static classes = [Article, Image, Video, Audio, Document, Template];

    static async loadAll() {
        for (const Class of CreatorRegistry.classes) {
            await Class.loadTable();
        }
    }

    static activeClass() {
        const hint = document.querySelector(".upload-hint.is-active");
        const type = hint?.dataset.type;
        if (!type) return null;
        return CreatorRegistry.classes.find((Class) => Class.type === type);
    }
}

export { Post, Article, Image, Video, Audio, Document, Template };

import { Alert } from "../core/index.js";
import { Select } from "./select.js";
import { Menu } from "./menu.js";
import { WebSelector } from "./web-selector.js";
import { Editor } from "./editor.js";
import { PostResolver } from "./post-resolver.js";
import { ElementTree } from "./element-tree.js";
import { Paragraph } from "./paragraph.js";
export class Media {
    static list = new Map();
    static classMap = {
        image: "image",
        imageTable: "image-table",
        imageTemplate: "template-single-image",
        iconImage: "icon-image",
        video: "video",
        audio: "audio",
    };
    static templateImageSelectors = [
        "img.template-single-image",
        "img.template-image",
        "img.template-large-image",
        "img.template-first-image",
        "img.template-second-image",
    ];
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.variant = this.detectVariant();
        this.type = this.detectType();
        this.url = this.detectURL();
        this.previewHandler = this.openPreview.bind(this);
        this.previewNodesList = [];
        this.setMenu();
        Media.list.set(this.element, this);
        if (!Editor.current?.isEditing) {
            this.bindPreview();
        }
    }
    static async init() {
        const range = Select.cursor();
        const parent = Select.block(range);
        if (!range || !parent) {
            return;
        }
        const variant = await Alert.select("Choose media type", [
            "image",
            "image-table",
            "icon-image",
            "video",
            "audio",
        ]);
        if (!variant) return;
        const option = await Alert.select("Select source", ["Dyscover", "URL"]);
        if (!option) return;
        const type = variant.includes("image") ? "image" : variant;
        const picked = await WebSelector.init(option, type);
        if (!picked?.url) return;
        const element = Media.create(variant, picked.url, picked.postId);
        if (!element) return;
        const instance = new Media(element);
        instance.insert(parent, range);
        Select.cursorToEnd(instance.element);
        instance.startEditing();
    }
    static generate(obj) {
        const element = Media.create(obj.element, obj.url);
        const instance = new Media(element);
        if (obj.element === Media.classMap.image) {
            ElementTree.addChildren(instance.element.querySelector("figcaption"), obj.children);
        }
        return instance;
    }
    export() {
        const data = {
            element: this.variant,
            url: this.url
        };
        if (this.variant === Media.classMap.image) {
            data.children = ElementTree.exportChildren(this.element.querySelector("figcaption"));
        }
        return data;
    }
    startEditing() {
        this.element.contentEditable = false;
        this.unbindPreview();
        if (this.variant === Media.classMap.image) {
            this.element.querySelector("figcaption")?.setAttribute("contenteditable", "true");
        }
        if (this.variant === Media.classMap.video) {
            this.element.querySelector("figcaption")?.setAttribute("contenteditable", "true");
        }
        this.menu?.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.variant === Media.classMap.image) {
            this.element.querySelector("figcaption")?.setAttribute("contenteditable", "false");
        }
        if (this.variant === Media.classMap.video) {
            this.element.querySelector("figcaption")?.setAttribute("contenteditable", "false");
        }
        if (!Editor.current?.isEditing) {
            this.bindPreview();
        }
        this.menu?.closeEditing();
    }
    previewNodes() {
        if (this.variant === Media.classMap.image) {
            const img = this.element.querySelector("img");
            return img ? [img] : [];
        }
        if (this.variant === Media.classMap.video) {
            const video = this.element.querySelector("video");
            return video ? [video] : [];
        }
        if (this.variant === Media.classMap.audio) {
            return [this.element];
        }
        if (this.element.tagName === "IMG") {
            return [this.element];
        }
        return [];
    }
    bindPreview() {
        this.unbindPreview();
        const nodes = this.previewNodes();
        if (!nodes.length) {
            return;
        }
        this.previewNodesList = nodes;
        nodes.forEach((node) => {
            node.classList.add("media-openable");
            node.addEventListener("click", this.previewHandler);
        });
        if (this.element !== nodes[0]) {
            this.element.classList.add("media-openable");
        }
    }
    unbindPreview() {
        (this.previewNodesList || []).forEach((node) => {
            node.classList.remove("media-openable");
            node.removeEventListener("click", this.previewHandler);
        });
        this.previewNodesList = [];
        this.element.classList.remove("media-openable");
    }
    async openPreview(e) {
        if (Editor.current?.isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        await PostResolver.openOverlay(
            this.element.dataset.postId,
            this.url,
        );
    }
    static create(variant, url, postId = "") {
        let element = null;
        switch (variant) {
            case Media.classMap.image:
                element = Media.createImage(url);
                break;
            case Media.classMap.imageTable:
                element = Media.createImageTable(url);
                break;
            case Media.classMap.imageTemplate:
            case "single-image":
                element = Media.createTemplateSingleImage(url);
                break;
            case "large-image":
            case "template-large-image":
                element = Media.createTemplateLargeImage(url);
                break;
            case "template-image":
                element = Media.createTemplateSingleImage(url);
                break;
            case Media.classMap.iconImage:
                element = Media.createIcon(url);
                break;
            case Media.classMap.video:
                element = Media.createVideo(url);
                break;
            case Media.classMap.audio:
                element = Media.createAudio(url);
                break;
        }
        if (element && postId) {
            element.dataset.postId = String(postId);
        }
        return element;
    }
    static createImage(url) {
        const figure = document.createElement("figure");
        figure.classList.add(this.classMap.image, "image-right");
        figure.contentEditable = false;
        const img = document.createElement("img");
        img.src = url;
        img.loading = "lazy";
        const caption = document.createElement("figcaption");
        caption.textContent = "Text";
        figure.appendChild(img);
        figure.appendChild(caption);
        return figure;
    }
    static createImageTable(url) {
        const img = document.createElement("img");
        img.classList.add(this.classMap.imageTable);
        img.src = url;
        img.loading = "lazy";
        img.contentEditable = false;
        return img;
    }
    static createTemplateSingleImage(url) {
        const img = document.createElement("img");
        img.classList.add("template-single-image");
        img.src = url;
        img.loading = "lazy";
        img.contentEditable = false;
        return img;
    }
    static createTemplateLargeImage(url) {
        const img = document.createElement("img");
        img.classList.add("template-large-image");
        img.src = url;
        img.loading = "lazy";
        img.contentEditable = false;
        return img;
    }
    static createTemplateImage(url) {
        return Media.createTemplateSingleImage(url);
    }
    static setTemplateImageSize(img, large = false) {
        if (!img?.classList) {
            return;
        }
        if (
            img.classList.contains("template-first-image") ||
            img.classList.contains("template-second-image")
        ) {
            img.style.removeProperty("width");
            return;
        }
        img.style.removeProperty("width");
        img.classList.remove(
            "template-image",
            "template-single-image",
            "template-large-image",
        );
        img.classList.add(large ? "template-large-image" : "template-single-image");
    }
    static applyTemplateImageLayout(img) {
        if (!img?.classList) {
            return;
        }
        if (
            img.classList.contains("template-first-image") ||
            img.classList.contains("template-second-image")
        ) {
            img.style.removeProperty("width");
            return;
        }
        img.style.removeProperty("width");
        if (img.classList.contains("template-large-image")) {
            img.classList.remove(
                "template-image",
                "template-single-image",
            );
            return;
        }
        if (
            img.classList.contains("template-single-image") ||
            img.classList.contains("template-image")
        ) {
            img.classList.remove("template-image", "template-large-image");
            img.classList.add("template-single-image");
        }
    }
    static applyTemplateSingleImageLayout(img) {
        Media.applyTemplateImageLayout(img);
    }
    static createTemplateDoubleImage(url1, url2) {
        const fragment = document.createDocumentFragment();
        const img1 = document.createElement("img");
        img1.src = url1 || "";
        img1.classList.add("template-first-image");
        const img2 = document.createElement("img");
        img2.src = url2 || "";
        img2.classList.add("template-second-image");
        [img1, img2].forEach((img) => {
            img.loading = "lazy";
            img.contentEditable = false;
        });
        fragment.append(img1, img2);
        return fragment;
    }
    static parseDoubleImageUrls(value) {
        return String(value || "")
            .split(";;")
            .map((part) => part.trim());
    }
    static createIcon(url) {
        const img = document.createElement("img");
        img.src = url;
        img.loading = "lazy";
        img.classList.add(this.classMap.iconImage);
        img.contentEditable = false;
        return img;
    }
    static createVideo(url) {
        const figure = document.createElement("figure");
        figure.classList.add(Media.classMap.video, "video-right");
        figure.contentEditable = false;
        const video = document.createElement("video");
        video.src = url;
        video.loading = "lazy";
        video.preload = "metadata";
        video.playsInline = true;
        const caption = document.createElement("figcaption");
        caption.textContent = "Video";
        figure.appendChild(video);
        figure.appendChild(caption);
        return figure;
    }
    static createAudio(url) {
        const audio = document.createElement("audio");
        audio.classList.add(this.classMap.audio);
        audio.src = url;
        audio.controls = true;
        audio.preload = "none";
        audio.contentEditable = false;
        return audio;
    }
    detectVariant() {
        if (this.element.classList.contains(Media.classMap.image)) {
            return Media.classMap.image;
        }
        if (this.element.classList.contains(Media.classMap.imageTable)) {
            return Media.classMap.imageTable;
        }
        if (
            this.element.classList.contains(Media.classMap.imageTemplate) ||
            this.element.classList.contains("template-single-image") ||
            this.element.classList.contains("template-large-image") ||
            this.element.classList.contains("template-first-image") ||
            this.element.classList.contains("template-second-image") ||
            this.element.classList.contains("template-image")
        ) {
            return Media.classMap.imageTemplate;
        }
        if (this.element.classList.contains(Media.classMap.iconImage)) {
            return Media.classMap.iconImage;
        }
        if (this.element.classList.contains(Media.classMap.video)) {
            return Media.classMap.video;
        }
        if (this.element.classList.contains(Media.classMap.audio)) {
            return Media.classMap.audio;
        }
        return null;
    }
    detectType() {
        if (
            [
                Media.classMap.image,
                Media.classMap.imageTable,
                Media.classMap.imageTemplate,
                Media.classMap.iconImage,
            ].includes(this.variant)
        ) {
            return "image";
        }
        if (this.variant === Media.classMap.video) {
            return "video";
        }
        if (this.variant === Media.classMap.audio) {
            return "audio";
        }
        return null;
    }
    detectURL() {
        if (this.variant === Media.classMap.image) {
            return this.element.querySelector("img")?.src || "";
        }
        if (this.variant === Media.classMap.video) {
            return this.element.querySelector("video")?.src || this.element.src || "";
        }
        return this.element.src || "";
    }
    insert(parent, range) {
        switch (this.variant) {
            case Media.classMap.image:
                parent.parentNode.insertBefore(this.element, parent);
                break;
            case Media.classMap.imageTable:
                if (!parent.closest(".table")) {
                    Alert.error("This is not a table");
                    return;
                }
                range.insertNode(this.element);
                break;
            case Media.classMap.imageTemplate:
            case Media.classMap.iconImage:
            case Media.classMap.audio:
                range.insertNode(this.element);
                break;
            case Media.classMap.video:
                parent.parentNode.insertBefore(this.element, parent);
                break;
        }
    }
    setMenu() {
        if (this.variant === Media.classMap.image) {
            this.menuActions = [
                {
                    name: "Replace",
                    action: this.replace,
                },
                {
                    name: "Change Position",
                    action: this.changePosition,
                },
                {
                    name: "Set As Cover",
                    action: this.setAsCover,
                },
                {
                    name: "Delete",
                    action: this.delete,
                },
            ];
            this.menu = new Menu(this);
            return;
        }
        if (this.variant === Media.classMap.video) {
            this.menuActions = [
                { name: "Replace", action: this.replace },
                { name: "Change Position", action: this.changePosition },
                { name: "Delete", action: this.delete },
            ];
        } else {
            this.menuActions = [
                { name: "Replace", action: this.replace },
                { name: "Set As Cover", action: this.setAsCover },
                { name: "Delete", action: this.delete },
            ];
        }
        this.menu = new Menu(this);
    }
    async replace() {
        const option = await Alert.select("Select source", ["Dyscover", "URL"]);
        if (!option) return;
        const picked = await WebSelector.init(option, this.type);
        if (!picked?.url) return;
        switch (this.variant) {
            case Media.classMap.image:
                this.element.querySelector("img").src = picked.url;
                break;
            case Media.classMap.video:
                this.element.querySelector("video").src = picked.url;
                break;
            default:
                this.element.src = picked.url;
                break;
        }
        if (picked.postId) {
            this.element.dataset.postId = String(picked.postId);
        }
        this.url = picked.url;
    }
    delete() {
        this.menu?.closeEditing();
        this.unbindPreview();
        Media.list.delete(this.element);
        this.element.remove();
    }
    setAsCover() {
        document.querySelector(".article-image")?.classList.remove("article-image");
        if (this.variant === Media.classMap.image) {
            this.element.querySelector("img")?.classList.add("article-image");
            return;
        }
        this.element.classList.add("article-image");
        Alert.success("Image set as article cover");
    }
    changePosition() {
        const pairs = [
            ["image-left", "image-right"],
            ["video-left", "video-right"],
        ];
        for (const [left, right] of pairs) {
            if (this.element.classList.contains(left)) {
                this.element.classList.replace(left, right);
                return;
            }
            if (this.element.classList.contains(right)) {
                this.element.classList.replace(right, left);
                return;
            }
        }
    }
}

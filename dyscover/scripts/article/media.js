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
        imageTemplate: "template-image",
        iconImage: "icon-image",
        video: "video",
        audio: "audio",
    };
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
                element = Media.createTemplateImage(url);
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
    static createTemplateImage(url) {
        const img = document.createElement("img");
        img.classList.add(this.classMap.imageTemplate);
        img.src = url;
        img.loading = "lazy";
        img.contentEditable = false;
        return img;
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
        figure.classList.add(Media.classMap.video, "video-wide");
        figure.contentEditable = false;
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
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
        if (this.element.classList.contains(Media.classMap.imageTemplate)) {
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
                Paragraph.newLine(parent, this.element);
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
        this.menuActions = [
            { name: "Replace", action: this.replace },
            { name: "Set As Cover", action: this.setAsCover },
            { name: "Delete", action: this.delete },
        ];
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
        if (this.element.classList.contains("image-left")) {
            this.element.classList.replace("image-left", "image-right");
            return;
        }
        if (this.element.classList.contains("image-right")) {
            this.element.classList.replace("image-right", "image-left");
        }
    }
}

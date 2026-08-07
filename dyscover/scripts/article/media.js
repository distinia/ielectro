import { App, Alert, Card, Request } from "../core/index.js";
import { Select } from "./select.js";
import { Menu } from "./menu.js";
import { WebSelector } from "./web-selector.js";
import { Editor } from "./editor.js";
import { GenerateArticle } from "./generate-article.js";
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
        const url = await WebSelector.init(option.toLowerCase(), type);
        if (!url) return;
        const element = Media.create(variant, url);
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
            GenerateArticle.addChildren(instance.element.querySelector("figcaption"), obj.children);
        }
        return instance;
    }
    export() {
        const data = {
            element: this.variant,
            url: this.url
        };
        if (this.variant === Media.classMap.image) {
            data.children = GenerateArticle.exportChildren(this.element.querySelector("figcaption"));
        }
        return data;
    }
    startEditing() {
        this.element.contentEditable = false;
        this.element.removeEventListener("click", this.previewHandler);
        if (this.variant === Media.classMap.image) {
            this.element.querySelector("figcaption")?.setAttribute("contenteditable", "true");
        }
        this.menu?.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.variant === Media.classMap.image) {
            this.element.querySelector("figcaption")?.setAttribute("contenteditable", "false");
        }
        if(state === "user" || state === "editor") {
            this.element.addEventListener("click", this.previewHandler);
        }
        this.menu?.closeEditing();
    }
    async openPreview() {
        if (Editor.editing) return;
        try {
            const url = new URL(this.url);
            if (url.hostname !== "dyscover.ielectro.com") {
                return;
            }
            const file = url.pathname.split("/").pop();
            if (!file) {
                return;
            }
            const res = await Request.get(App.api("post/data"), {
                file,
            });
            if (!res.data) {
                return;
            }
            const card = new Card(res.data);
            await card.openOverlay();
        } catch {}
    }
    static create(variant, url) {
        switch (variant) {
            case this.classMap.image:
                return this.createImage(url);
            case this.classMap.imageTable:
                return this.createImageTable(url);
            case this.classMap.imageTemplate:
                return this.createTemplateImage(url);
            case this.classMap.iconImage:
                return this.createIcon(url);
            case this.classMap.video:
                return this.createVideo(url);
            case this.classMap.audio:
                return this.createAudio(url);
        }
        return null;
    }
    static createImage(url) {
        const figure = document.createElement("figure");
        figure.classList.add(this.classMap.image, "image-right");
        figure.contentEditable = false;
        const img = document.createElement("img");
        img.src = url;
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
        img.contentEditable = false;
        return img;
    }
    static createTemplateImage(url) {
        const img = document.createElement("img");
        img.classList.add(this.classMap.imageTemplate);
        img.src = url;
        img.contentEditable = false;
        return img;
    }
    static createIcon(url) {
        const img = document.createElement("img");
        img.src = url;
        img.classList.add(this.classMap.iconImage);
        img.contentEditable = false;
        return img;
    }
    static createVideo(url) {
        const video = document.createElement("video");
        video.classList.add(this.classMap.video);
        video.src = url;
        video.controls = true;
        video.contentEditable = false;
        return video;
    }
    static createAudio(url) {
        const audio = document.createElement("audio");
        audio.classList.add(this.classMap.audio);
        audio.src = url;
        audio.controls = true;
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
        const url = await WebSelector.init(option.toLowerCase(), this.type);
        if (!url) return;
        switch (this.variant) {
            case Media.classMap.image:
                this.element.querySelector("img").src = url;
                break;
            default:
                this.element.src = url;
                break;
        }
        this.url = url;
    }
    delete() {
        this.menu?.closeEditing();
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

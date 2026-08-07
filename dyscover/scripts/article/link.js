import { Alert } from "../core/index.js";
import { Select } from "./select.js";
import { WebSelector } from "./web-selector.js";
import { ArticlePreview } from "./article-preview.js";
export class Link {
    static list = new Map();
    static tag = "a";
    static className = "link";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.url = element.href;
        this.text = element.textContent;
        this.preview = new ArticlePreview(this);
        Link.list.set(this.element, this);
    }
    static async init() {
        const range = Select.cursor();
        const element = Select.element(range);
        if (!range || !element) {
            return;
        }
        const existing = element.closest(`${Link.tag}, .${Link.className}`);
        if (existing) {
            const parent = existing.parentNode;
            const fragment = document
                .createRange()
                .createContextualFragment(existing.innerHTML);
            const instance = Link.list.get(existing);
            instance?.closeEditing();
            existing.replaceWith(fragment);
            Link.list.delete(existing);
            Select.cursorToEnd(parent);
            return;
        }
        if (range.collapsed) {
            return;
        }
        const contents = range.cloneContents();
        if (contents.querySelector(`${Link.tag}, .${Link.className}`)) {
            return;
        }
        const text = range.toString().trim();
        if (!text) {
            return;
        }
        const option = await Alert.select("Select the origin of the link", [
            "Dyscover",
            "URL",
        ]);
        if (!option) return;
        let url = await WebSelector.init(option.toLowerCase(), "article");
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) {
            url = "https://" + url;
        }
        try {
            const u = new URL(url);
            if (!["http:", "https:", "ftp:"].includes(u.protocol)) {
                return;
            }
        } catch {
            return;
        }
        const link = Link.create(url, text);
        if (!link) return;
        range.deleteContents();
        range.insertNode(link);
        const instance = new Link(link);
        instance.startEditing();
        Select.cursorToEnd(instance.element);
    }
    static create(url, text) {
        if (!url || !text) {
            return null;
        }
        const element = document.createElement(Link.tag);
        element.href = url;
        element.classList.add(Link.className);
        element.textContent = text;
        element.target = "_blank";
        element.rel = "noopener noreferrer";
        return element;
    }
    generate(obj) {
        const element = Link.create(obj.url, obj.text);
        return new Link(element);
    }
    export() {
        return {
            element: Link.className,
            text: this.element.textContent,
            url: this.element.href
        };
    }
    startEditing() {
        this.preview?.startEditing();
    }
    closeEditing() {
        this.preview?.closeEditing();
    }
    delete() {
        const fragment = document
            .createRange()
            .createContextualFragment(this.element.innerHTML);
        this.closeEditing();
        this.element.replaceWith(fragment);
        Link.list.delete(this.element);
    }
}

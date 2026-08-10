import { Alert, Icons } from "../core/index.js";
import { API } from "./api.js";
import { Select } from "./select.js";
import { Index } from "./article-index.js";
import { Save } from "./save.js";
import { FormatText } from "./format-text.js";
import { ReplaceText } from "./replace-text.js";
import { Paragraph } from "./paragraph.js";
import { Heading } from "./heading.js";
import { Center } from "./center.js";
import { Bold } from "./bold.js";
import { Italic } from "./italic.js";
import { Caption } from "./caption.js";
import { List } from "./list.js";
import { Link } from "./link.js";
import { Table } from "./table.js";
import { Legend } from "./legend.js";
import { Percentage } from "./percentage.js";
import { Media } from "./media.js";
import { Template } from "./template.js";
export class Editor {
    constructor() {
        this.elements = [Paragraph, Heading, Center, Bold, Italic, Caption, Link, List, Table, Legend, Percentage, Media, Template];
        this.content = Select.container();
        this.box = null;
        this.isEditing = false;
        Editor.hydrateLegacyContent(Select.container());
        this.loadElements();
        this.index = new Index();
        void this.index.refresh();
        this.activateElements();
        Editor.current = this;
    }

    static hydrateLegacyContent(container) {
        if (!container) return;
        container.querySelectorAll("h2").forEach((el) => {
            if (!el.classList.contains("heading")) {
                el.classList.add("heading");
            }
        });
        container.querySelectorAll("h3").forEach((el) => {
            if (!el.classList.contains("sub-heading")) {
                el.classList.add("sub-heading");
            }
        });
        container.querySelectorAll("p").forEach((el) => {
            if (
                el.classList.contains("paragraph") ||
                el.closest("figure, table, td, th, li")
            ) {
                return;
            }
            el.classList.add("paragraph");
        });
    }

    loadElements() {
        const container = Select.container();
        if (!container) return;
        this.elements.forEach((Class) => {
            if (!(Class.list instanceof Map)) {
                return;
            }
            let selectors = [];
            if (Class.className) {
                selectors.push("." + Class.className);
            }
            if (Class.classMap) {
                selectors.push(
                    ...Object.values(Class.classMap).map((name) => "." + name),
                );
            }
            if (!selectors.length) {
                return;
            }
            container.querySelectorAll(selectors.join(",")).forEach((element) => {
                if (Class.list.has(element)) {
                    return;
                }
                new Class(element);
            });
        });
    }
    async init() {
        try {
            this.instruments = await API.getElements();
            this.create();
            this.events();
            this.pasteElements();
        } catch (e) {
            Alert.error(e?.text || "Failed to load instruments");
        }
    }
    create() {
        const container = document.createElement("div");
        container.className = "instruments";
        this.instruments
            .filter((item) => item?.action && item?.title)
            .forEach((item) => {
            const btn = document.createElement("div");
            btn.className = "btn instrument";
            btn.dataset.action = item.action;
            btn.title = item.text;
            const icon = document.createElement("i");
            icon.setAttribute("data-icon", item.icon);
            btn.appendChild(icon);
            container.appendChild(btn);
        });
        this.box = container;
        const main = document.querySelector(".article-main-content");
        main.insertBefore(this.box, main.firstChild);
        Icons.load(container);
    }
    events() {
        this.box?.addEventListener("click", (e) => {
            const btn = e.target.closest(".instrument");
            if (!btn) return;
            switch (btn.dataset.action) {
                case "save":
                    return Save.init();
                case "replace":
                    return ReplaceText.init();
                case "format":
                    return FormatText.init();
                case "heading":
                    return Heading.init("h2");
                case "subheading":
                    return Heading.init("h3");
                case "center":
                    return Center.init();
                case "bold":
                    return Bold.init();
                case "italic":
                    return Italic.init();
                case "caption":
                    return Caption.init();
                case "link":
                    return Link.init();
                case "pointList":
                    return List.init("ul");
                case "numberList":
                    return List.init("ol");
                case "percentage":
                    return Percentage.init();
                case "legend":
                    return Legend.init();
                case "media":
                    return Media.init();
                case "table":
                    return Table.init();
                case "template":
                    return Template.init();
            }
        });
    }
    static async toggleEditing() {
        const editButton = document.querySelector(".index-edit-button");
        if (!Editor.current) return;
        if (Editor.current.isEditing) {
            editButton?.classList.remove("is-active");
            if (editButton) editButton.innerHTML = `<i data-icon="pencil"></i>`;
            Editor.current.closeEditing();
        } else {
            editButton?.classList.add("is-active");
            if (editButton) editButton.innerHTML = `<i data-icon="x"></i>`;
            Editor.current.startEditing();
        }
        if (editButton) await Icons.load(editButton);
    }
    startEditing() {
        if (this.isEditing) return;
        this.isEditing = true;
        document.body.classList.add("is-editing");
        if (this.box) {
            this.box.classList.add("is-visible");
        }
        document.querySelector(".post-overlay")?.remove();
        this.activateElements();
        this.index.startEditing();
    }
    closeEditing() {
        if (!this.isEditing) return;
        this.isEditing = false;
        document.body.classList.remove("is-editing");
        if (this.box) {
            this.box.classList.remove("is-visible");
        }
        ReplaceText.list.forEach((instance) => instance.closeEditing());
        this.activateElements();
        this.index.closeEditing();
    }
    activateElements() {
        this.elements.forEach((Class) => {
            if (!(Class.list instanceof Map)) {
                return;
            }
            Class.list.forEach((instance) => {
                if (!instance) return;
                if (this.isEditing) {
                    if (typeof instance.startEditing === "function") {
                        instance.startEditing();
                    }
                } else {
                    if (typeof instance.closeEditing === "function") {
                        instance.closeEditing();
                    }
                }
            });
        });
    }
    pasteElements() {
        if (this._pasteBound) {
            return;
        }
        this._pasteBound = true;
        this.content?.addEventListener("paste", (e) => {
            const range = Select.cursor();
            const block = Select.block(range);
            if (!range || !block) {
                return;
            }
            const text = (e.clipboardData || window.clipboardData).getData(
                "text/plain",
            );
            if (!text) {
                return;
            }
            e.preventDefault();
            const lines = text.replace(/\r/g, "").split("\n");
            const clean = lines.filter((line) => line.trim() !== "");
            if (!clean.length) {
                return;
            }
            const isList = block.closest("ul, ol");
            if (isList) {
                const list = block.closest("ul, ol");
                if (!list) {
                    return;
                }
                const currentLi = range.startContainer?.parentElement?.closest("li");
                if (!currentLi) {
                    return;
                }
                currentLi.innerHTML = clean[0];
                clean.slice(1).forEach((text) => {
                    const li = document.createElement("li");
                    li.innerHTML = text || "<br>";
                    currentLi.after(li);
                });
                Select.cursorToEnd(list.lastElementChild);
                return;
            }
            const currentText = clean[0];
            block.innerHTML = currentText || "<br>";
            let last = block;
            clean.slice(1).forEach((text) => {
                const element = Paragraph.create(text || "<br>");
                Paragraph.newLine(last, element);
                new Paragraph(element);
                last = element;
            });
            Select.cursorToEnd(last);
        });
    }
}

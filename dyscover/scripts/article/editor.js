import { Alert, Icons } from "../core/index.js";
import { API } from "./api.js";
import { Select } from "./select.js";
import { Index } from "./article-index.js";
import { Save } from "./save.js";
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
import { getArticleState } from "./state.js";
import { SourceSerializer } from "./source-serializer.js";
import { SourceParser } from "./source-parser.js";
import { yieldToMain } from "./source-yield.js";
export class Editor {
    static current = null;
    static _escapeBound = false;
    static _modeSwitching = false;
    static _transitionOverlay = null;
    static _progressPulse = null;
    static _progressPct = 0;
    static MANAGED = new Set([Template, Media, Table, Legend, Percentage]);
    static VIEW_BLOCKS = new Set([Heading]);
    static EDIT_BLOCKS = new Set([Paragraph, Caption, List]);
    static SKIP_LOAD = new Set([Bold, Italic, Center]);
    static ELEMENTS_PER_YIELD = 80;
    static LINKS_PER_YIELD = 50;
    constructor() {
        this.elements = [
            Paragraph,
            Heading,
            Center,
            Bold,
            Italic,
            Caption,
            Link,
            List,
            Table,
            Legend,
            Percentage,
            Media,
            Template,
        ];
        this.content = Select.container();
        this.box = null;
        this.isEditing = false;
        this.isTextMode = false;
        this.sourceEditor = null;
        Editor.hydrateLegacyContent(Select.container());
        this.loadManagedElements();
        this.loadViewBlocks();
        this.index = new Index();
        void this.index.refresh();
        void this.activateElements();
        Editor.current = this;
    }
    static hydrateBlock(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }
        if (node.tagName === "H2" && !node.classList.contains("heading")) {
            node.classList.add("heading");
        }
        if (node.tagName === "H3" && !node.classList.contains("sub-heading")) {
            node.classList.add("sub-heading");
        }
        if (
            node.tagName === "P" &&
            !node.classList.contains("paragraph") &&
            !node.closest("figure, table, td, th, li")
        ) {
            node.classList.add("paragraph");
        }
        node.querySelectorAll("figure.video").forEach((el) => {
            if (
                !el.classList.contains("video-left") &&
                !el.classList.contains("video-right")
            ) {
                el.classList.remove("video-wide");
                el.classList.add("video-right");
            }
        });
        node.querySelectorAll("figure.video video, video.video").forEach((video) => {
            video.removeAttribute("controls");
            video.controls = false;
        });
    }
    mountManagedIn(root, editing = false) {
        if (!root?.querySelectorAll) {
            return;
        }
        root.querySelectorAll("table.template").forEach((element) => {
            if (!Template.list.has(element)) {
                new Template(element);
            }
            if (editing) {
                Template.list.get(element)?.startEditing?.();
            }
        });
        root.querySelectorAll("table.table").forEach((element) => {
            if (!Table.list.has(element)) {
                new Table(element);
            }
            if (editing) {
                Table.list.get(element)?.startEditing?.();
            }
        });
        root.querySelectorAll(".legend").forEach((element) => {
            if (!Legend.list.has(element)) {
                new Legend(element);
            }
            if (editing) {
                Legend.list.get(element)?.startEditing?.();
            }
        });
        root.querySelectorAll(".percentage").forEach((element) => {
            if (!Percentage.list.has(element)) {
                new Percentage(element);
            }
            if (editing) {
                Percentage.list.get(element)?.startEditing?.();
            }
        });
        Object.values(Media.classMap).forEach((className) => {
            root.querySelectorAll(`.${className}`).forEach((element) => {
                if (Media.list.has(element)) {
                    if (editing) {
                        Media.list.get(element)?.startEditing?.();
                    }
                    return;
                }
                if (element.tagName === "IMG" || element.tagName === "AUDIO") {
                    const media = new Media(element);
                    if (editing) {
                        media.startEditing?.();
                    }
                    return;
                }
                const media = new Media(element);
                if (editing) {
                    media.startEditing?.();
                }
            });
        });
        root.querySelectorAll(
            "img.template-single-image, img.template-image, img.template-large-image, img.icon-image",
        ).forEach((element) => {
            if (Media.list.has(element)) {
                if (editing) {
                    Media.list.get(element)?.startEditing?.();
                }
                return;
            }
            const media = new Media(element);
            if (editing) {
                media.startEditing?.();
            }
        });
        root.querySelectorAll("audio.audio").forEach((element) => {
            if (Media.list.has(element)) {
                if (editing) {
                    Media.list.get(element)?.startEditing?.();
                }
                return;
            }
            const media = new Media(element);
            if (editing) {
                media.startEditing?.();
            }
        });
    }
    async mountBlockNode(node, { editing = false, lazy = false } = {}) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }
        Editor.hydrateBlock(node);
        if (node.classList.contains(Template.className)) {
            const instance = Template.list.get(node) || new Template(node);
            if (editing && instance.templateId) {
                API.getTemplate(instance.templateId)
                    .then((fields) => {
                        instance.fields = fields;
                        instance.syncImageClassesFromFields();
                    })
                    .catch(() => {});
            }
            node.querySelectorAll(
                "img.template-single-image, img.template-image, img.template-large-image, img.icon-image, audio.audio",
            ).forEach((element) => {
                if (!Media.list.has(element)) {
                    new Media(element);
                }
                if (editing) {
                    Media.list.get(element)?.startEditing?.();
                }
            });
            if (editing) {
                instance.startEditing?.();
            }
            return;
        }
        if (node.classList.contains(Table.className)) {
            if (!Table.list.has(node)) {
                new Table(node);
            }
            this.mountManagedIn(node, editing);
            if (editing) {
                Table.list.get(node)?.startEditing?.();
            }
            return;
        }
        if (
            node.classList.contains("heading") ||
            node.classList.contains("sub-heading")
        ) {
            if (!Heading.list.has(node)) {
                new Heading(node);
            }
            if (editing && !lazy) {
                Heading.list.get(node)?.startEditing?.();
            }
            return;
        }
        if (node.classList.contains(Caption.className)) {
            if (!Caption.list.has(node)) {
                new Caption(node);
            }
            if (editing && !lazy) {
                Caption.list.get(node)?.startEditing?.();
            }
            return;
        }
        if (
            node.classList.contains(List.classMap.ul) ||
            node.classList.contains(List.classMap.ol)
        ) {
            if (!List.list.has(node)) {
                new List(node);
            }
            if (editing && !lazy) {
                List.list.get(node)?.startEditing?.();
            }
            return;
        }
        if (node.classList.contains(Paragraph.className)) {
            if (editing && !lazy) {
                if (!Paragraph.list.has(node)) {
                    new Paragraph(node);
                }
                Paragraph.list.get(node)?.startEditing?.();
            }
            return;
        }
        if (node.classList.contains(Legend.className)) {
            if (!Legend.list.has(node)) {
                new Legend(node);
            }
            if (editing) {
                Legend.list.get(node)?.startEditing?.();
            }
            return;
        }
        if (node.classList.contains(Percentage.className)) {
            if (!Percentage.list.has(node)) {
                new Percentage(node);
            }
            if (editing) {
                Percentage.list.get(node)?.startEditing?.();
            }
            return;
        }
        for (const className of Object.values(Media.classMap)) {
            if (!node.classList.contains(className)) {
                continue;
            }
            if (!Media.list.has(node)) {
                new Media(node);
            }
            if (editing) {
                Media.list.get(node)?.startEditing?.();
            }
            return;
        }
    }
    bindLazyBlockEditing() {
        this.enableGraphicContentEditing();
    }
    unbindLazyBlockEditing() {
        this.disableGraphicContentEditing();
    }
    enableGraphicContentEditing() {
        if (!this.isEditing || this.isTextMode || !this.content) {
            return;
        }
        if (!this._graphicEditBound) {
            this._graphicEditBound = true;
            this._contentKeydown = (event) => this.handleGraphicKeydown(event);
            this.content.addEventListener("keydown", this._contentKeydown);
        }
        this.content.contentEditable = true;
        this._activeEditBlock = null;
    }
    disableGraphicContentEditing() {
        if (this._contentKeydown) {
            this.content?.removeEventListener("keydown", this._contentKeydown);
            this._contentKeydown = null;
        }
        this._graphicEditBound = false;
        this._activeEditBlock = null;
        if (this.content?.isContentEditable) {
            this.content.removeAttribute("contenteditable");
        }
    }
    handleGraphicKeydown(event) {
        if (!this.isEditing || this.isTextMode) {
            return;
        }
        if (
            event.target.closest(
                ".template, table.table, .percentage, .legend, figure",
            )
        ) {
            return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
            const list = event.target.closest(
                "ul.point-list, ol.number-list, .point-list, .number-list",
            );
            if (list) {
                this.handleListEnter(event, list);
                return;
            }
            const block = event.target.closest(
                "p.paragraph, h2.heading, h3.sub-heading, .caption",
            );
            if (!block || !this.content?.contains(block)) {
                return;
            }
            event.preventDefault();
            this.insertParagraphAfter(block);
            return;
        }
        if (event.key !== "Backspace") {
            return;
        }
        const list = event.target.closest(
            "ul.point-list, ol.number-list, .point-list, .number-list",
        );
        if (list) {
            this.handleListBackspace(event, list);
            return;
        }
        const caption = event.target.closest(".caption");
        if (caption) {
            this.handleEmptyBlockBackspace(event, caption, ".caption");
            return;
        }
        const heading = event.target.closest("h2.heading, h3.sub-heading");
        if (heading && this.isEmptyTextBlock(heading)) {
            event.preventDefault();
            const paragraph = Paragraph.create(heading.innerText || "<br>");
            heading.replaceWith(paragraph);
            Heading.list.delete(heading);
            new Paragraph(paragraph);
            Select.cursorToEnd(paragraph);
            return;
        }
        const paragraph = event.target.closest("p.paragraph");
        if (!paragraph || !this.isEmptyTextBlock(paragraph)) {
            return;
        }
        const paragraphs = this.content?.querySelectorAll("p.paragraph");
        if (!paragraphs || paragraphs.length <= 1) {
            return;
        }
        event.preventDefault();
        const previous = paragraph.previousElementSibling;
        const instance = Paragraph.list.get(paragraph);
        if (instance) {
            instance.delete();
        } else {
            paragraph.remove();
        }
        if (previous) {
            Select.cursorToEnd(previous);
        }
    }
    handleListEnter(event, list) {
        const li = event.target.closest("li");
        if (!li || li.closest("ul, ol") !== list) {
            return;
        }
        const text = li.innerText.replace(/\u200B/g, "").trim();
        if (text) {
            return;
        }
        event.preventDefault();
        li.remove();
        const items = [...list.querySelectorAll(":scope > li")];
        const html = items.map((item) => item.innerHTML).join("<br>");
        const paragraph = Paragraph.create(html || "<br>");
        list.replaceWith(paragraph);
        List.list.delete(list);
        new Paragraph(paragraph);
        Select.cursorToEnd(paragraph);
    }
    handleListBackspace(event, list) {
        const items = list.querySelectorAll(":scope > li");
        if (items.length > 1) {
            return;
        }
        const first = items[0];
        if (!first || first.innerText.trim()) {
            return;
        }
        event.preventDefault();
        const paragraph = Paragraph.create("<br>");
        list.replaceWith(paragraph);
        List.list.delete(list);
        new Paragraph(paragraph);
        Select.cursorToEnd(paragraph);
    }
    handleEmptyBlockBackspace(event, block, selector) {
        if (!this.isEmptyTextBlock(block)) {
            return;
        }
        const blocks = this.content?.querySelectorAll(selector);
        if (blocks && blocks.length <= 1 && selector === ".caption") {
            return;
        }
        event.preventDefault();
        const paragraph = Paragraph.create(block.innerText || "<br>");
        block.replaceWith(paragraph);
        Caption.list.delete(block);
        new Paragraph(paragraph);
        Select.cursorToEnd(paragraph);
    }
    insertParagraphAfter(block) {
        const paragraph = Paragraph.create();
        new Paragraph(paragraph);
        Paragraph.newLine(block, paragraph);
        Select.cursorToEnd(paragraph);
    }
    isEmptyTextBlock(element) {
        if (!element) {
            return true;
        }
        const text = element.innerText.replace(/\u200B/g, "").trim();
        if (text) {
            return false;
        }
        const html = element.innerHTML
            .replace(/<br\s*\/?>/gi, "")
            .replace(/&nbsp;/gi, "")
            .trim();
        return !html;
    }
    blurEditBlock(block) {
        if (!block) {
            return;
        }
        if (block.classList.contains(Paragraph.className)) {
            Paragraph.list.get(block)?.closeEditing?.();
            return;
        }
        if (
            block.classList.contains("heading") ||
            block.classList.contains("sub-heading")
        ) {
            Heading.list.get(block)?.closeEditing?.();
            return;
        }
        if (block.classList.contains(Caption.className)) {
            Caption.list.get(block)?.closeEditing?.();
            return;
        }
        if (
            block.classList.contains(List.classMap.ul) ||
            block.classList.contains(List.classMap.ol)
        ) {
            List.list.get(block)?.closeEditing?.();
        }
    }
    focusEditBlock(block) {
        if (!block || this.content?.isContentEditable) {
            return;
        }
        if (this._activeEditBlock === block) {
            return;
        }
        this.blurEditBlock(this._activeEditBlock);
        this._activeEditBlock = block;
        if (block.classList.contains(Paragraph.className)) {
            let instance = Paragraph.list.get(block);
            if (!instance) {
                instance = new Paragraph(block);
            }
            instance.startEditing?.();
            return;
        }
        if (
            block.classList.contains("heading") ||
            block.classList.contains("sub-heading")
        ) {
            let instance = Heading.list.get(block);
            if (!instance) {
                instance = new Heading(block);
            }
            instance.startEditing?.();
            return;
        }
        if (block.classList.contains(Caption.className)) {
            let instance = Caption.list.get(block);
            if (!instance) {
                instance = new Caption(block);
            }
            instance.startEditing?.();
            return;
        }
        if (
            block.classList.contains(List.classMap.ul) ||
            block.classList.contains(List.classMap.ol)
        ) {
            let instance = List.list.get(block);
            if (!instance) {
                instance = new List(block);
            }
            instance.startEditing?.();
        }
        if (block.isContentEditable) {
            block.focus({ preventScroll: true });
        }
    }
    async activateManagedElements(editing) {
        for (const Class of Editor.MANAGED) {
            if (!(Class.list instanceof Map)) {
                continue;
            }
            Class.list.forEach((instance) => {
                if (!instance) {
                    return;
                }
                if (editing) {
                    instance.startEditing?.();
                } else {
                    instance.closeEditing?.();
                }
            });
        }
    }
    static hydrateLegacyContent(container) {
        if (!container) return;
        Editor.stripContentEditable(container);
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
        container.querySelectorAll("figure.video").forEach((el) => {
            if (
                el.classList.contains("video-left") ||
                el.classList.contains("video-right")
            ) {
                return;
            }
            el.classList.remove("video-wide");
            el.classList.add("video-right");
        });
        container.querySelectorAll("figure.video video, video.video").forEach((video) => {
            video.removeAttribute("controls");
            video.controls = false;
        });
    }
    static stripContentEditable(root) {
        if (!root) {
            return;
        }
        const elements =
            root.nodeType === Node.ELEMENT_NODE
                ? [root, ...root.querySelectorAll("*")]
                : [...root.querySelectorAll("*")];
        for (const element of elements) {
            if (element.isContentEditable) {
                element.contentEditable = false;
            }
            element.removeAttribute?.("contenteditable");
        }
    }
    static stripContentEditableHtml(html) {
        if (!html) {
            return html;
        }
        const container = document.createElement("div");
        container.innerHTML = html;
        Editor.stripContentEditable(container);
        return container.innerHTML;
    }
    getSelectors(Class) {
        const selectors = [];
        if (Class.className) {
            selectors.push("." + Class.className);
        }
        if (Class.classMap) {
            selectors.push(
                ...Object.values(Class.classMap).map((name) => "." + name),
            );
        }
        if (Class.templateImageSelectors) {
            selectors.push(...Class.templateImageSelectors);
        }
        return selectors;
    }
    mountElementClass(Class, container) {
        if (!(Class.list instanceof Map)) {
            return 0;
        }
        const selectors = this.getSelectors(Class);
        if (!selectors.length) {
            return 0;
        }
        let mounted = 0;
        container.querySelectorAll(selectors.join(",")).forEach((element) => {
            if (Class.list.has(element)) {
                return;
            }
            new Class(element);
            mounted++;
        });
        return mounted;
    }
    loadManagedElements() {
        const container = Select.container();
        if (!container) return;
        Editor.MANAGED.forEach((Class) => {
            this.mountElementClass(Class, container);
        });
    }
    loadViewBlocks() {
        const container = Select.container();
        if (!container) return;
        Editor.VIEW_BLOCKS.forEach((Class) => {
            this.mountElementClass(Class, container);
        });
    }
    async loadEditBlocks() {
        const container = Select.container();
        if (!container) return;
        for (const Class of Editor.EDIT_BLOCKS) {
            const selectors = this.getSelectors(Class);
            if (!selectors.length) {
                continue;
            }
            const elements = container.querySelectorAll(selectors.join(","));
            for (let index = 0; index < elements.length; index++) {
                const element = elements[index];
                if (!Class.list.has(element)) {
                    new Class(element);
                }
                if (
                    (index + 1) % Editor.ELEMENTS_PER_YIELD === 0 &&
                    index + 1 < elements.length
                ) {
                    await yieldToMain();
                }
            }
        }
    }
    async activateEditBlocks() {
        let processed = 0;
        for (const Class of Editor.EDIT_BLOCKS) {
            if (!(Class.list instanceof Map)) {
                continue;
            }
            for (const instance of Class.list.values()) {
                instance?.startEditing?.();
                processed++;
                if (processed % Editor.ELEMENTS_PER_YIELD === 0) {
                    await yieldToMain();
                }
            }
        }
    }
    async initLinkPreviews() {
        await this.setLinkEditing(false);
    }
    async init() {
        try {
            this.instruments = await API.getElements();
            this.create();
            this.events();
            this.bindEscapeEdit();
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
        this.box?.addEventListener("mousedown", (e) => {
            if (e.target.closest(".instrument")) {
                e.preventDefault();
            }
        });
        this.box?.addEventListener("click", (e) => {
            const btn = e.target.closest(".instrument");
            if (!btn) return;
            switch (btn.dataset.action) {
                case "save":
                    return Save.init();
                case "undo":
                    return this.runHistory("undo");
                case "redo":
                    return this.runHistory("redo");
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
    runHistory(command) {
        if (!this.isEditing || this.isTextMode) {
            return;
        }
        this.content?.focus({ preventScroll: true });
        document.execCommand(command);
    }
    bindEscapeEdit() {
        if (Editor._escapeBound) {
            return;
        }
        Editor._escapeBound = true;
        document.addEventListener("keydown", (e) => {
            if (e.key !== "Escape") {
                return;
            }
            if (getArticleState() !== "editor" || !Editor.current) {
                return;
            }
            if (
                document.querySelector(
                    ".prompt-container, .dysc-overlay, .post-overlay",
                )
            ) {
                return;
            }
            const target = e.target;
            if (
                target instanceof HTMLElement &&
                target.closest("input, textarea, select") &&
                !target.closest(".content") &&
                !target.closest(".article-source-editor")
            ) {
                return;
            }
            e.preventDefault();
            void Editor.toggleEditing();
        });
    }
    static async toggleEditing() {
        const editButton = document.querySelector(".index-edit-button");
        if (!Editor.current) return;
        if (Editor.current.isEditing) {
            editButton?.classList.remove("is-active");
            if (editButton) editButton.innerHTML = `<i data-icon="pencil"></i>`;
            await Editor.current.closeEditing();
        } else {
            editButton?.classList.add("is-active");
            if (editButton) editButton.innerHTML = `<i data-icon="x"></i>`;
            await Editor.current.startEditing();
        }
        if (editButton) await Icons.load(editButton);
        await Editor.current?.index?.buildSidebar();
    }
    static showModeTransition() {
        const scroll = document.querySelector(".article-scroll");
        if (!scroll || Editor._transitionOverlay) {
            return;
        }
        const overlay = document.createElement("div");
        overlay.className = "article-editor-transition";
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");
        overlay.setAttribute("aria-label", "Loading");
        overlay.innerHTML = `<div class="article-editor-transition__bar" aria-hidden="true"><div class="article-editor-transition__bar-fill"></div></div>`;
        overlay.classList.add("is-progress");
        scroll.appendChild(overlay);
        Editor._transitionOverlay = overlay;
        document.body.classList.add("article-mode-switching");
        Editor.startModeTransitionPulse();
    }
    static hideModeTransition() {
        Editor.stopModeTransitionPulse();
        Editor._transitionOverlay?.remove();
        Editor._transitionOverlay = null;
        Editor._progressPct = 0;
        document.body.classList.remove("article-mode-switching");
    }
    static async runModeTransition(task) {
        if (Editor._modeSwitching) {
            return task?.();
        }
        Editor._modeSwitching = true;
        Editor.showModeTransition();
        await yieldToMain();
        await new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
        try {
            const setProgress = (index, total) => {
                Editor.updateModeTransitionProgress(index, total);
            };
            return await task?.(setProgress);
        } finally {
            Editor.finishModeTransitionProgress();
            await new Promise((resolve) => setTimeout(resolve, 160));
            Editor.hideModeTransition();
            Editor._modeSwitching = false;
        }
    }
    static startModeTransitionPulse() {
        Editor.stopModeTransitionPulse();
        Editor._progressPct = 6;
        Editor.setModeTransitionWidth(Editor._progressPct);
        Editor._progressPulse = setInterval(() => {
            const remaining = 90 - Editor._progressPct;
            Editor._progressPct += Math.max(0.12, remaining * 0.03);
            if (Editor._progressPct > 90) {
                Editor._progressPct = 90;
            }
            Editor.setModeTransitionWidth(Editor._progressPct);
        }, 180);
    }
    static stopModeTransitionPulse() {
        if (Editor._progressPulse) {
            clearInterval(Editor._progressPulse);
            Editor._progressPulse = null;
        }
    }
    static setModeTransitionWidth(pct) {
        const fill = Editor._transitionOverlay?.querySelector(
            ".article-editor-transition__bar-fill",
        );
        if (!fill) {
            return;
        }
        fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }
    static finishModeTransitionProgress() {
        Editor.stopModeTransitionPulse();
        Editor._progressPct = 100;
        Editor.setModeTransitionWidth(100);
    }
    static updateModeTransitionProgress(index, total) {
        const overlay = Editor._transitionOverlay;
        if (!overlay || !total) {
            return;
        }
        Editor.stopModeTransitionPulse();
        overlay.classList.add("is-progress");
        const pct = Math.min(100, Math.round(((index + 1) / total) * 100));
        Editor._progressPct = pct;
        Editor.setModeTransitionWidth(pct);
    }
    static async toggleEditorMode() {
        if (!Editor.current?.isEditing || Editor._modeSwitching) {
            return;
        }
        if (Editor.current.isTextMode) {
            await Editor.current.enterGraphicMode();
        } else {
            await Editor.current.enterTextMode();
        }
        await Editor.current.index?.buildSidebar();
    }
    getContent() {
        if (this.isTextMode && this.sourceEditor) {
            return this.sourceEditor.value;
        }
        return this.content?.innerHTML ?? "";
    }
    async getHtmlContent() {
        if (this.isTextMode && this.sourceEditor) {
            const div = document.createElement("div");
            await SourceParser.toContainer(this.sourceEditor.value, div);
            Editor.hydrateLegacyContent(div);
            return div.innerHTML;
        }
        return this.content?.innerHTML ?? "";
    }
    clearElementLists() {
        this.elements.forEach((Class) => {
            if (Class.list instanceof Map) {
                Class.list.clear();
            }
        });
    }
    async reloadParsedElements() {
        this.loadManagedElements();
        this.loadViewBlocks();
        if (this.isEditing && !this.isTextMode) {
            await this.loadEditBlocks();
        }
        await this.index?.refresh();
    }
    async applySourceToContent(options = {}) {
        if (!this.sourceEditor || !this.content) {
            return;
        }
        const editing =
            options.editing ?? (this.isEditing && !this.isTextMode);
        try {
            this.clearElementLists();
            await SourceParser.toContainerIncremental(
                this.sourceEditor.value,
                this.content,
                async (node, index, total, phase = "done") => {
                    Editor.updateModeTransitionProgress(index, total);
                    if (phase !== "done" || !node) {
                        return;
                    }
                    await this.mountBlockNode(node, { editing, lazy: editing });
                },
            );
            if (editing) {
                this.bindLazyBlockEditing();
                await this.index?.refresh();
            }
        } catch (error) {
            Alert.error(error?.message || "Invalid source format");
            throw error;
        }
    }
    ensureSourceEditor() {
        if (this.sourceEditor) {
            return;
        }
        this.sourceEditor = document.createElement("textarea");
        this.sourceEditor.className = "article-source-editor textarea";
        this.sourceEditor.spellcheck = false;
        this.sourceEditor.setAttribute("data-preserve-case", "true");
        this.sourceEditor.setAttribute("aria-label", "Article source");
        document.querySelector(".article-scroll")?.appendChild(this.sourceEditor);
    }
    async enterTextMode() {
        if (!this.isEditing || this.isTextMode || Editor._modeSwitching) {
            return;
        }
        await Editor.runModeTransition(async () => {
            this.ensureSourceEditor();
            this.sourceEditor.value = await SourceSerializer.fromContainerAsync(
                this.content,
                (index, total) => Editor.updateModeTransitionProgress(index, total),
            );
            this.isTextMode = true;
            document.body.classList.add("is-text-editing");
            this.box?.classList.remove("is-visible");
            ReplaceText.suspendForTextMode();
            await this.activateElements();
        });
    }
    async applyGeneratedSource(source) {
        const text = String(source || "").trim();
        if (!text) {
            return;
        }
        if (!this.isEditing) {
            const editButton = document.querySelector(".index-edit-button");
            editButton?.classList.add("is-active");
            if (editButton) {
                editButton.innerHTML = `<i data-icon="x"></i>`;
            }
            await this.startEditing();
            if (editButton) {
                await Icons.load(editButton);
            }
        }
        this.ensureSourceEditor();
        if (!this.isTextMode) {
            await Editor.runModeTransition(async () => {
                this.isTextMode = true;
                document.body.classList.add("is-text-editing");
                this.box?.classList.remove("is-visible");
                ReplaceText.suspendForTextMode();
                await this.activateElements();
            });
        }
        this.sourceEditor.value = text;
        await this.index?.buildSidebar();
    }
    async enterGraphicMode() {
        if (!this.isTextMode || Editor._modeSwitching) {
            return;
        }
        await Editor.runModeTransition(async () => {
            try {
                if (this.sourceEditor && this.content) {
                    await this.applySourceToContent({ editing: this.isEditing });
                }
                this.isTextMode = false;
                document.body.classList.remove("is-text-editing");
                if (this.isEditing && this.box) {
                    this.box.classList.add("is-visible");
                }
                ReplaceText.resumeFromTextMode();
                if (this.isEditing) {
                    this.bindLazyBlockEditing();
                    await this.setLinkEditing(true);
                }
            } catch {
                /* applySourceToContent already surfaced the error */
            }
        });
    }
    async syncTextToGraphic() {
        if (!this.isTextMode) {
            return;
        }
        await Editor.runModeTransition(async () => {
            if (this.sourceEditor && this.content) {
                await this.applySourceToContent({ editing: this.isEditing });
            }
            this.isTextMode = false;
            document.body.classList.remove("is-text-editing");
        });
    }
    async startEditing() {
        if (this.isEditing) return;
        this.isEditing = true;
        this.isTextMode = false;
        document.body.classList.remove("is-text-editing");
        document.body.classList.add("is-editing");
        if (this.box) {
            this.box.classList.add("is-visible");
        }
        document.querySelector(".post-overlay")?.remove();
        this.loadViewBlocks();
        await this.activateManagedElements(true);
        this.bindLazyBlockEditing();
        await this.setLinkEditing(true);
        await this.index.startEditing();
    }
    async closeEditing() {
        if (!this.isEditing) return;
        await this.syncTextToGraphic();
        this.isEditing = false;
        document.body.classList.remove("is-editing");
        if (this.box) {
            this.box.classList.remove("is-visible");
        }
        ReplaceText.list.forEach((instance) => instance.closeEditing());
        this.unbindLazyBlockEditing();
        Editor.stripContentEditable(this.content);
        await this.activateManagedElements(false);
        await this.setLinkEditing(false);
        await this.index.closeEditing();
    }
    async activateElements(options = {}) {
        const editing = this.isEditing && !this.isTextMode;
        await this.activateManagedElements(editing);
        if (editing) {
            this.enableGraphicContentEditing();
            if (options.editLinks) {
                await this.setLinkEditing(true);
            }
            return;
        }
        this.unbindLazyBlockEditing();
        Editor.stripContentEditable(this.content);
        await this.setLinkEditing(false);
    }
    async setLinkEditing(editing) {
        const container = Select.container();
        if (!container) {
            return;
        }
        const links = container.querySelectorAll(".link");
        for (let index = 0; index < links.length; index += Editor.LINKS_PER_YIELD) {
            const end = Math.min(index + Editor.LINKS_PER_YIELD, links.length);
            for (let linkIndex = index; linkIndex < end; linkIndex++) {
                const element = links[linkIndex];
                let instance = Link.list.get(element);
                if (!instance) {
                    instance = new Link(element);
                }
                if (editing) {
                    instance.startEditing?.();
                } else {
                    instance.closeEditing?.();
                }
            }
            if (end < links.length) {
                await yieldToMain();
            }
        }
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
            const list = block.closest("ul, ol");
            if (list) {
                const currentLi = block.closest("li");
                if (!currentLi) {
                    return;
                }
                range.deleteContents();
                this.restoreSelection(range);
                this.insertPlainText(clean[0]);
                let last = currentLi;
                clean.slice(1).forEach((line) => {
                    const li = document.createElement("li");
                    li.textContent = line;
                    last.after(li);
                    last = li;
                });
                if (clean.length > 1) {
                    Select.cursorToEnd(last);
                }
                return;
            }
            const canSplit = block.matches("p.paragraph, p");
            if (!canSplit || clean.length === 1) {
                range.deleteContents();
                this.restoreSelection(range);
                this.insertPlainText(
                    canSplit ? clean[0] : clean.join(" "),
                );
                return;
            }
            const after = range.cloneRange();
            after.selectNodeContents(block);
            after.setStart(range.endContainer, range.endOffset);
            const trailing = after.extractContents();
            range.deleteContents();
            this.restoreSelection(range);
            this.insertPlainText(clean[0]);
            let last = block;
            clean.slice(1).forEach((line) => {
                const element = Paragraph.create();
                element.textContent = line;
                Paragraph.newLine(last, element);
                new Paragraph(element);
                last = element;
            });
            if (this.hasPasteContent(trailing)) {
                last.appendChild(trailing);
            }
            Select.cursorToEnd(last);
        });
    }
    restoreSelection(range) {
        const selection = Select.text();
        if (!selection || !range) {
            return;
        }
        selection.removeAllRanges();
        selection.addRange(range);
    }
    insertPlainText(text) {
        if (text == null || text === "") {
            return;
        }
        if (document.execCommand("insertText", false, text)) {
            return;
        }
        const range = Select.cursor();
        if (!range) {
            return;
        }
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        this.restoreSelection(range);
    }
    hasPasteContent(fragment) {
        if (!fragment) {
            return false;
        }
        if (fragment.textContent?.replace(/\u00a0/g, " ").trim()) {
            return true;
        }
        return Boolean(fragment.querySelector?.("img, br, a, b, i, strong, em"));
    }
}

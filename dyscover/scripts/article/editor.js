import { Alert, Icons, Spinner } from "../core/index.js";
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
        root.querySelectorAll("img.template-image, img.icon-image").forEach((element) => {
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
            if (!Template.list.has(node)) {
                new Template(node);
            }
            node.querySelectorAll(
                "img.template-image, img.icon-image, audio.audio",
            ).forEach((element) => {
                if (!Media.list.has(element)) {
                    new Media(element);
                }
                if (editing) {
                    Media.list.get(element)?.startEditing?.();
                }
            });
            if (editing) {
                Template.list.get(node)?.startEditing?.();
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
        if (!this.isEditing || this.isTextMode || this._lazyEditBound) {
            return;
        }
        this._lazyEditBound = true;
        this._activeEditBlock = null;
        this._lazyFocusIn = (event) => {
            if (!this.isEditing || this.isTextMode) {
                return;
            }
            const block = event.target.closest(
                ".paragraph, .heading, .sub-heading, .caption, .point-list, .number-list",
            );
            if (!block || !this.content?.contains(block)) {
                return;
            }
            this.focusEditBlock(block);
        };
        this._lazyPointerDown = (event) => {
            if (!this.isEditing || this.isTextMode) {
                return;
            }
            if (event.target.closest(".template, .table, figure, .percentage, .legend")) {
                return;
            }
            const block = event.target.closest(
                ".paragraph, .heading, .sub-heading, .caption, .point-list, .number-list",
            );
            if (!block || !this.content?.contains(block)) {
                return;
            }
            this.focusEditBlock(block);
        };
        this.content?.addEventListener("focusin", this._lazyFocusIn);
        this.content?.addEventListener("mousedown", this._lazyPointerDown);
    }

    unbindLazyBlockEditing() {
        this.blurEditBlock(this._activeEditBlock);
        this._activeEditBlock = null;
        if (this._lazyFocusIn) {
            this.content?.removeEventListener("focusin", this._lazyFocusIn);
            this._lazyFocusIn = null;
        }
        if (this._lazyPointerDown) {
            this.content?.removeEventListener("mousedown", this._lazyPointerDown);
            this._lazyPointerDown = null;
        }
        this._lazyEditBound = false;
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
        if (!block || this._activeEditBlock === block) {
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
        this.box?.addEventListener("click", (e) => {
            const btn = e.target.closest(".instrument");
            if (!btn) return;
            switch (btn.dataset.action) {
                case "save":
                    return Save.init();
                case "replace":
                    return ReplaceText.init();
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
        overlay.setAttribute("aria-label", "Switching editor mode");
        overlay.innerHTML = Spinner.html(true);
        scroll.appendChild(overlay);
        Editor._transitionOverlay = overlay;
        document.body.classList.add("article-mode-switching");
    }

    static hideModeTransition() {
        Editor._transitionOverlay?.remove();
        Editor._transitionOverlay = null;
        document.body.classList.remove("article-mode-switching");
    }

    static updateModeTransitionProgress(index, total) {
        const overlay = Editor._transitionOverlay;
        if (!overlay || !total) {
            return;
        }
        let label = overlay.querySelector(".article-editor-transition__label");
        if (!label) {
            label = document.createElement("p");
            label.className = "article-editor-transition__label";
            overlay.appendChild(label);
        }
        label.textContent = `Converting section ${index + 1} of ${total}…`;
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
        Editor._modeSwitching = true;
        Editor.showModeTransition();
        await yieldToMain();
        try {
            this.ensureSourceEditor();
            this.sourceEditor.value = await SourceSerializer.fromContainerAsync(
                this.content,
            );
            this.isTextMode = true;
            document.body.classList.add("is-text-editing");
            this.box?.classList.remove("is-visible");
            ReplaceText.suspendForTextMode();
            await this.activateElements();
        } finally {
            Editor.hideModeTransition();
            Editor._modeSwitching = false;
        }
    }

    async enterGraphicMode() {
        if (!this.isTextMode || Editor._modeSwitching) {
            return;
        }
        Editor._modeSwitching = true;
        Editor.showModeTransition();
        await yieldToMain();
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
        } finally {
            Editor.hideModeTransition();
            Editor._modeSwitching = false;
        }
    }

    async syncTextToGraphic() {
        if (!this.isTextMode) {
            return;
        }
        if (this.sourceEditor && this.content) {
            await this.applySourceToContent({ editing: this.isEditing });
        }
        this.isTextMode = false;
        document.body.classList.remove("is-text-editing");
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
        await this.activateManagedElements(false);
        await this.setLinkEditing(false);
        await this.index.closeEditing();
    }
    async activateElements(options = {}) {
        const editing = this.isEditing && !this.isTextMode;
        await this.activateManagedElements(editing);
        if (editing) {
            if (options.editLinks) {
                await this.setLinkEditing(true);
            }
            return;
        }
        this.unbindLazyBlockEditing();
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

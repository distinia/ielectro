import { App, Alert, Wait, Icons, Auth, Card, Box, Request } from "./app.js";
let state = "guest";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    new Article();
});
class API {
    static async getElements() {
        return await Request.get(
            "https://dyscover.ielectro.com/data/elements.json",
        );
    }
    static async generateAI(prompt) {
        /*const res = await Request.post(
            "https://dyscover.ielectro.com/api/article/generate",
            { prompt },
        );
        return res.data.json;*/
        return await Request.get(
            "https://dyscover.ielectro.com/data/Destenia.json",
        );
    }
    static async getTemplate(slug) {
        let file = String(slug || "").trim();
        if (!file.toLowerCase().endsWith(".json")) {
            file = `${file}.json`;
        }
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/template/data",
            { file },
        );
        return res.data;
    }
    static async saveArticle(content) {
        const file = App.urlLastPart() + '.html';
        const res = await Request.put(
            "https://dyscover.ielectro.com/api/article/edit",
            { content, file },
        );
        return res.text;
    }
    static async getArticleAuth() {
        const file = App.urlLastPart() + '.html';
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/article/users-auth",
            { file },
        );
        return res?.data?.status ?? res?.status ?? false;
    }
    static async getArticleInfo() {
        const file = App.urlLastPart() + '.html';
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/article/info",
            { file },
        );
        return res?.data ?? res ?? false;
    }
    static async search(type, term) {
        const map = {
            article: "article/search",
            template: "template/search",
            image: "media/search",
            video: "media/search",
            audio: "media/search",
            document: "media/search",
        };
        const endpoint = map[type];
        if (!endpoint) throw new Error("Invalid search type");
        const res = await Request.get(
            `https://dyscover.ielectro.com/api/${endpoint}`,
            { term, type },
        );
        return res.data;
    }
    static async getArticlePreview(file) {
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/article/preview",
            { file },
        );
        return res.data;
    }
    static async getMediaDescription(file, type) {
        const res = await Request.get(
            "https://dyscover.ielectro.com/api/media/viewer",
            { file, type },
        );
        return res.data.description;
    }
}
class Article {
    constructor() {
        this.load();
    }
    async load() {
        try {
            const res = await API.getArticleInfo();
            if (!res) {
                Alert.error('Article not found');
                return;
            }
            document.title = res.title + ' - iElectro Dyscover';
            document.querySelector('.title').textContent = res.title;
            document.querySelector('.content').innerHTML = res.content;
            document.body.dataset.file = res.file;
            const keywords = res.tags ?? [];
            document.querySelector('meta[name="keywords"]')?.setAttribute('content', keywords.join(', '));
            new Editor();
            this.editAuthorization();
        } catch {
            Alert.error('Article not found');
        }
    }
    async editAuthorization() {
        try {
            const logged = await Auth.logged();
            if (logged) {
                state = "user";
            }
            const authorized = await API.getArticleAuth();
            if (authorized) {
                state = "editor";
                Editor.current.init();
            }
        } catch {}
    }
}
class Select {
    static container() {
        return document.querySelector(".content");
    }
    static text() {
        return window.getSelection();
    }
    static cursor() {
        const text = this.text();
        if (!text || text.rangeCount === 0) {
            return null;
        }
        return text.getRangeAt(0);
    }
    static element(cursor = Select.cursor()) {
        if (!cursor) return null;
        const node = cursor.startContainer;
        if (node.nodeType === Node.ELEMENT_NODE) {
            return node;
        }
        return node.parentElement;
    }
    static tag(selector, cursor = Select.cursor()) {
        const element = this.element(cursor);
        if (!element) return null;
        return element.closest(selector);
    }
    static block(cursor = Select.cursor()) {
        const element = this.element(cursor);
        const content = this.container();
        if (!element || !content) {
            return null;
        }
        const block = element.closest(
            "p, h1, h2, h3, h4, h5, h6, div, li, td, th, figure",
        );
        if (!block || block === content) {
            return null;
        }
        if (!block.closest(".content")) {
            return null;
        }
        return block;
    }
    static cursorToEnd(element) {
        if (!element) return;
        const text = this.text();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        text.removeAllRanges();
        text.addRange(range);
    }
}
class Menu {
    static current = null;
    constructor(instance) {
        if (!instance) return;
        this.instance = instance;
        this.instanceElement = instance.element;
        this.actions = instance.menuActions || [];
        this.element = null;
    }
    startEditing() {
        if (!this.instanceElement) return;
        this.contextHandler = (e) => {
            if (!this.instanceElement.contains(e.target)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (Menu.current && Menu.current !== this) {
                Menu.current.hide();
            }
            this.open(e.pageX, e.pageY);
        };
        this.clickHandler = (e) => {
            if (this.element && !this.element.contains(e.target)) {
                this.hide();
            }
        };
        this.instanceElement.addEventListener("contextmenu", this.contextHandler);
        document.addEventListener("click", this.clickHandler);
    }
    open(x, y) {
        this.hide();
        Menu.current = this;
        this.element = document.createElement("div");
        this.element.className = "menu";
        this.actions.forEach((action) => {
            if (!action?.name) return;
            if (typeof action.action !== "function") {
                return;
            }
            const option = document.createElement("div");
            option.className = "menuOption";
            option.textContent = action.name;
            option.addEventListener("click", () => {
                action.action.call(this.instance);
                this.hide();
            });
            this.element.appendChild(option);
        });
        document.body.appendChild(this.element);
        this.element.style.left = x + "px";
        this.element.style.top = y + "px";
        requestAnimationFrame(() => {
            if (this.element) {
                this.element.classList.add("menu-active");
            }
        });
    }
    hide() {
        if (!this.element) return;
        if (Menu.current === this) {
            Menu.current = null;
        }
        const element = this.element;
        this.element = null;
        element.classList.remove("menu-active");
        element.addEventListener(
            "transitionend",
            () => {
                element.remove();
            },
            { once: true },
        );
    }
    closeEditing() {
        if (this.contextHandler) {
            this.instanceElement.removeEventListener(
                "contextmenu",
                this.contextHandler,
            );
        }
        if (this.clickHandler) {
            document.removeEventListener("click", this.clickHandler);
        }
        this.hide();
    }
}
class WebSelector {
    static options = ["dyscover", "url"];
    constructor(type) {
        this.type = type;
        this.selectedClass = null;
        this.items = [];
        this.box = null;
    }
    static async init(option, type) {
        const instance = new WebSelector(type);
        if (option === WebSelector.options[0]) {
            return await instance.fromServer();
        }
        if (option === WebSelector.options[1]) {
            return await instance.fromURL();
        }
        return null;
    }
    async fromServer() {
        return new Promise(async (resolve) => {
            this.box = new Box("Select a " + this.type);
            await this.box.create();
            this.box.footer((footer) => {
                footer.innerHTML = `
                    <input placeholder="Name or tag">
                    <button>Add</button>
                `;
                const btn = footer.querySelector("button");
                btn.onclick = () => {
                    const selected = this.box.container.querySelector(
                        `.${this.selectedClass}`,
                    );
                    if (!selected) {
                        Alert.error("Select an item first");
                        return;
                    }
                    this.box.close();
                    resolve(selected.dataset.value);
                };
            });
            this.box.body((body) => {
                const input = this.box.container.querySelector("input");
                const debounced = this.debounce(async (value) => {
                    const data = await API.search(this.type, value);
                    body.innerHTML = "";
                    if (!data.length) return;
                    const config = this.updateCategory(data[0]);
                    this.selectedClass = config.selectClass;
                    data.forEach((result) => {
                        const { tag, boxClass } = this.updateCategory(result);
                        const el = document.createElement("div");
                        el.classList.add(boxClass);
                        if (["article", "template"].includes(result.type)) {
                            el.innerHTML = tag;
                        } else {
                            const title = `<div class="media-title">${result.title}</div>`;
                            el.innerHTML = tag + title;
                        }
                        el.dataset.value =
                            this.type === "article"
                                ? result.url
                                : this.type === "template"
                                    ? result.title
                                    : `${result.media}?t=${new Date(result.updated).getTime()}`;
                        body.appendChild(el);
                        this.bindItem(el);
                    });
                }, 300);
                input.oninput = () => {
                    const v = input.value.trim();
                    if (!v) {
                        body.innerHTML = "";
                        return;
                    }
                    debounced(v);
                };
            });
        });
    }
    async fromURL() {
        while (true) {
            const url = await Alert.prompt("Insert the URL");
            if (url === false) {
                return null;
            }
            const trimmed = String(url || "").trim();
            if (!trimmed) {
                Alert.error("URL cannot be empty");
                continue;
            }
            const valid = /^(ftp|http|https)://[^ "]+$/.test(trimmed);
            if (valid) return trimmed;
            Alert.error("Invalid URL");
        }
    }
    updateCategory(result) {
        const title = result.title || "";
        const media = result.media
            ? `${result.media}?t=${new Date(result.updated).getTime()}`
            : "";
        let tag = "";
        let boxClass = "media-box";
        let selectClass = "selected-media";
        switch (this.type) {
            case "article":
            case "template":
                tag = `
                    <div class="search-image" style="background-image: url(${media})"></div>
                    <div class="search-text"><b>${title}</b></div>`;
                boxClass = "search-row";
                selectClass = "selected-link";
                break;
            case "image":
                tag = `<img src="${media}">`;
                break;
            case "video":
                tag = `<video src="${media}" controls></video>`;
                break;
            case "audio":
                tag = `<audio src="${media}" controls></audio>`;
                break;
            case "document":
                tag = `<iframe src="${media}"></iframe>`;
                break;
        }
        return { tag, boxClass, selectClass };
    }
    bindItem(item) {
        item.onclick = () => {
            const all = this.box.container.querySelectorAll(`.${item.classList[0]}`);
            all.forEach((el) => el.classList.remove(this.selectedClass));
            item.classList.add(this.selectedClass);
        };
    }
    debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }
}
class Editor {
    constructor() {
        this.elements = [Paragraph, Heading, Center, Bold, Italic, Caption, Link, List, Table, Legend, Percentage, Media, Template];
        this.title = document.querySelector(".title");
        this.content = Select.container();
        this.box = null;
        this.isEditing = false;
        this.loadElements();
        this.index = new Index();
        this.index.closeEditing();
        this.activateElements();
        Editor.current = this;
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
        this.instruments.forEach((item) => {
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
                case "generate-ai":
                    return GenerateArticle.init();
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
            editButton.innerHTML = `<i data-icon="pencil"></i>`;
            Editor.current.closeEditing();
        } else {
            editButton.innerHTML = `<i data-icon="x"></i>`;
            Editor.current.startEditing();
        }
        await Icons.load(editButton);
    }
    startEditing() {
        if (this.isEditing) return;
        this.isEditing = true;
        if (this.box) {
            this.box.style.display = "flex";
        }
        this.title.style.display = 'none';
        document.querySelector('.post-overlay')?.remove();
        this.activateElements();
        this.index.startEditing();
    }
    closeEditing() {
        if (!this.isEditing) return;
        this.isEditing = false;
        if (this.box) {
            this.box.style.display = "none";
        }
        this.title.style.display = 'block';
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
class Index {
    constructor() {
        this.box = document.querySelector(".list");
        this.sidebar = document.querySelector(".article-index-sidebar");
        this.editButton = null;
        this.list = this.box;
        this.currentList = null;
        this.section = 0;
        this.subsection = 0;
        this.headings = [];
    }
    async closeEditing() {
        this.headings = this.getHeadings();
        this.section = 0;
        this.subsection = 0;
        this.buildList();
        await this.buildSidebar();
    }
    async startEditing() {
        this.headings = this.getHeadings();
        this.section = 0;
        this.subsection = 0;
        this.buildList();
        await this.buildSidebar();
    }
    getHeadings() {
        return [...Heading.list.values()]
            .map((instance) => instance.element)
            .filter((element) => {
                return element && element.parentNode && element.innerText.trim();
            });
    }
    async buildSidebar() {
        if (!this.sidebar) return;
        this.editButton = this.sidebar.querySelector(".index-edit-button");
        if (this.editButton && state === 'editor') {
            this.editButton.onclick = () => {
                Editor.toggleEditing();
            };
        } else {
            this.editButton.style.display = 'none';
        }
        await Icons.load(this.sidebar);
        if (this.box && !this.sidebar.contains(this.box)) {
            const content = this.sidebar.querySelector(".index-sidebar-content");
            if (content) {
                content.innerHTML = "";
                content.appendChild(this.box);
            }
        }
    }
    buildList() {
        if (!this.list) return;
        this.list.innerHTML = "";
        this.currentList = null;
        const topItem = document.createElement("li");
        topItem.innerHTML = `
            <span>0</span>
            <a class="link" href="#">(Top)</a>
        `;
        topItem.querySelector("a").onclick = (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        };
        this.list.appendChild(topItem);
        this.headings.forEach((element) => {
            if (element.classList.contains("heading")) {
                this.addHeading(element);
            }
            if (element.classList.contains("sub-heading")) {
                this.addSubHeading(element);
            }
        });
    }
    addHeading(element) {
        this.section++;
        this.subsection = 0;
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${this.section}</span>
            <a class="link" href="#${element.id}" style="font-weight:bold;">
                ${element.innerText}
            </a>
            <ul></ul>
        `;
        this.list.appendChild(li);
        this.currentList = li.querySelector("ul");
    }
    addSubHeading(element) {
        if (!this.currentList) return;
        this.subsection++;
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${this.section}.${this.subsection}</span>
            <a class="link" href="#${element.id}">
                ${element.innerText}
            </a>
        `;
        this.currentList.appendChild(li);
    }
}
class GenerateArticle {
    static classes = null;
    static async init() {
        const box = new Box("Generate Article");
        await box.create();
        box.footer((footer)=>{
            footer.innerHTML = `
                <button class="download-btn">Download</button>
                <input class="generate-prompt" type="text" placeholder="Enter your prompt here...">
                <button class="generate-btn">Generate</button>
            `;
            footer.querySelector(".generate-btn").onclick = async ()=>{
                Wait.show();
                const prompt = footer.querySelector(".generate-prompt").value;
                const data = await API.generateAI(prompt);
                const container = Select.container();
                container.innerHTML = "";
                const title = document.createElement("h1");
                title.className = "title";
                title.innerText = Editor.current.title.innerText;
                container.append(title, await this.createElements(data));
                Wait.hide();
                box.close();
                Editor.current.closeEditing();
            };
            footer.querySelector(".download-btn").onclick = ()=>{
                this.download();
            };
        });
    }
    static async download() {
        const json = await this.export(Select.container());
        const blob = new Blob([JSON.stringify(json, null, 4)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${Editor.current.title.innerText}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
    static async export(container) {
        return (await Promise.all(
            [...container.children]
                .filter(element=>!element.classList.contains("title"))
                .map(element=>this.exportElement(element))
        )).filter(Boolean);
    }
    static async exportElement(element) {
        const Class = this.findClass(element);
        if (!Class) return null;
        const instance = Class.list?.get(element);
        if (!instance || typeof instance.export !== "function") {
            return null;
        }
        return await instance.export();
    }
    static async exportChildren(element) {
        if (!element) return [];
        return (await Promise.all(
            [...element.childNodes].map(async node=>{
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent;
                }
                return await this.exportElement(node);
            })
        )).filter(Boolean);
    }
    static async createElements(elements) {
        const fragment = document.createDocumentFragment();
        for (const data of elements) {
            const instance = await this.createElement(data);
            if (instance) {
                fragment.append(instance.element);
            }
        }
        return fragment;
    }
    static async createElement(data) {
        const Class = this.findClass(data.element);
        if (!Class?.generate) {
            return null;
        }
        const children = [];
        if (data.children) {
            for (const child of data.children) {
                if (typeof child === "string") {
                    children.push(child);
                    continue;
                }
                const instance = await this.createElement(child);
                if (instance) {
                    children.push(instance.element);
                }
            }
        }
        const obj = {
            ...data,
            children
        };
        const instance = await Class.generate(obj);
        return instance;
    }
    static addChildren(parent, children) {
        children?.forEach(child=>{
            parent.append(child);
        });
        return parent;
    }
    static findClass(value) {
        return this.getClasses().find(Class=>{
            if (Class.className === value) {
                return true;
            }
            if (Class.classMap) {
                return Object.values(Class.classMap).includes(value) || Object.keys(Class.classMap).includes(value);
            }
            if (Class.tag) {
                return typeof value === "string" ? value === Class.tag : value.tagName?.toLowerCase() === Class.tag;
            }
            return false;
        });
    }
    static getClasses() {
        return this.classes || (this.classes = Editor.current.elements);
    }
}
class Save {
    static list = new Map();
    constructor(content) {
        this.content = content;
    }
    static async init() {
        const editingContainer = Select.container();
        if (!editingContainer) return;
        const content = editingContainer.innerHTML;
        const result = await Alert.confirm("Do you want to save changes");
        if (!result) return;
        const instance = new Save(content);
        Save.list.set(editingContainer, instance);
        try {
            const res = await API.saveArticle(instance.content);
            Alert.success(res);
        } catch (e) {
            Alert.error(e.text);
        }
    }
}
class FormatText {
    constructor() {
        this.content = Select.container();
        if (!this.content) return;
        this.instruments = [];
    }
    static async init() {
        const instance = new FormatText();
        await instance.getElements();
        instance.parse();
        return instance;
    }
    async getElements() {
        this.instruments = await API.getElements();
    }
    parse() {
        this.instruments.forEach((instrument) => {
            if (!instrument.regex) {
                return;
            }
            this.apply(instrument);
        });
    }
    apply(instrument) {
        const regex = new RegExp(instrument.regex, "g");
        const walker = document.createTreeWalker(
            this.content,
            NodeFilter.SHOW_TEXT,
        );
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) {
            if (regex.test(node.nodeValue)) {
                nodes.push(node);
            }
            regex.lastIndex = 0;
        }
        nodes.forEach((node) => {
            const text = node.nodeValue;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            regex.lastIndex = 0;
            for (const match of text.matchAll(regex)) {
                const full = match[0];
                const start = match.index;
                const end = start + full.length;
                const before = text.slice(lastIndex, start);
                if (before) {
                    fragment.appendChild(document.createTextNode(before));
                }
                const element = this.create(instrument, match);
                if (element) {
                    fragment.appendChild(element);
                }
                lastIndex = end;
            }
            const after = text.slice(lastIndex);
            if (after) {
                fragment.appendChild(document.createTextNode(after));
            }
            node.parentNode.replaceChild(fragment, node);
        });
    }
    create(instrument, match) {
        switch (instrument.action) {
            case "bold":
                return Bold.create(match[1]);
            case "italic":
                return Italic.create(match[1]);
            case "link":
                return Link.create(match[2], match[1]);
            case "heading":
                return Heading.create("h2", match[1]);
            case "subheading":
                return Heading.create("h3", match[1]);
            case "pointedList":
                return List.create("ul", match[1]);
            case "numberedList":
                return List.create("ol", match[1]);
        }
        return null;
    }
}
class ReplaceText {
    static list = new Map();
    constructor() {
        this.box = document.querySelector(".find-replace");
        if (this.box) {
            this.closeEditing();
            return;
        }
        this.create();
    }
    static init() {
        const instance = new ReplaceText();
        if (instance.box) {
            ReplaceText.list.set(instance.box, instance);
        }
    }
    create() {
        const main = document.querySelector("main");
        if (!main) return;
        this.box = document.createElement("div");
        this.box.className = "find-replace";
        const inputFind = document.createElement("input");
        inputFind.className = "find-input";
        inputFind.placeholder = "Enter text to find";
        const inputReplace = document.createElement("input");
        inputReplace.className = "replace-input";
        inputReplace.placeholder = "Enter text to replace";
        const button = document.createElement("button");
        button.className = "replace-all-button";
        button.textContent = "Replace All";
        this.box.appendChild(inputFind);
        this.box.appendChild(document.createElement("br"));
        this.box.appendChild(inputReplace);
        this.box.appendChild(document.createElement("br"));
        this.box.appendChild(button);
        main.prepend(this.box);
        button.addEventListener("click", () => this.replaceAll());
    }
    closeEditing() {
        if (!this.box) return;
        ReplaceText.list.delete(this.box);
        this.box.remove();
        this.box = null;
    }
    content() {
        return Select.container();
    }
    find(text) {
        const content = this.content();
        if (!content) return false;
        const contentText = content.textContent || content.innerText;
        if (!contentText.includes(text)) {
            Alert.error("No occurrences found");
            return false;
        }
        return true;
    }
    textNodes(element) {
        const nodes = [];
        const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walk.nextNode())) nodes.push(node);
        return nodes;
    }
    validNode(node) {
        let parent = node.parentElement;
        while (parent) {
            if (parent.classList?.contains("title")) return false;
            parent = parent.parentElement;
        }
        return true;
    }
    escape(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    replaceAll() {
        if (!this.box) return;
        const find = this.box.querySelector(".find-input").value;
        const replace = this.box.querySelector(".replace-input").value;
        if (!find) {
            Alert.error("Please enter text to find");
            return;
        }
        if (!this.find(find)) return;
        const content = this.content();
        const nodes = this.textNodes(content).filter((n) => this.validNode(n));
        const regex = new RegExp(this.escape(find), "g");
        let count = 0;
        nodes.forEach((node) => {
            const matches = node.textContent.match(regex);
            if (!matches) return;
            count += matches.length;
            node.textContent = node.textContent.replace(regex, replace);
        });
        if (count > 0) {
            Alert.success(count + " occurrences have been changed");
        } else {
            Alert.error("No occurrences found");
        }
    }
}
class Paragraph {
    static list = new Map();
    static tag = "p";
    static className = "paragraph";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.text = element.innerHTML;
        Paragraph.list.set(this.element, this);
    }
    static create(content = "<br>") {
        const element = document.createElement(Paragraph.tag);
        element.classList.add(Paragraph.className);
        element.innerHTML = content;
        return element;
    }
    static generate(obj) {
        const element = document.createElement(Paragraph.tag);
        element.classList.add(Paragraph.className);        
        GenerateArticle.addChildren(element, obj.children);
        return new Paragraph(element);
    }
    export() {
        return {
            element: Paragraph.className,
            children: GenerateArticle.exportChildren(this.element)
        };
    }
    static newLine(parent, element) {
        if (!parent || !parent.parentNode || !element) {
            return;
        }
        parent.parentNode.insertBefore(element, parent.nextSibling);
    }
    static total() {
        return Paragraph.list.size;
    }
    isEmpty() {
        const html = this.element.innerHTML
            .replace(/<br \s*/?>/gi, "")
            .replace(/&nbsp;/gi, "")
            .trim();
        return !html;
    }
    startEditing() {
        this.element.contentEditable = true;
        this.inputEvent = () => {
            this.text = this.element.innerHTML;
        };
        this.keydownEvent = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const paragraph = Paragraph.create();
                const instance = new Paragraph(paragraph);
                instance.startEditing();
                Paragraph.newLine(this.element, paragraph);
                Select.cursorToEnd(paragraph);
                return;
            }
            if (e.key === "Backspace" && this.isEmpty()) {
                if (Paragraph.total() <= 1) {
                    return;
                }
                e.preventDefault();
                const previous = this.element.previousElementSibling;
                this.delete();
                if (previous) {
                    Select.cursorToEnd(previous);
                }
            }
        };
        this.element.addEventListener("input", this.inputEvent);
        this.element.addEventListener("keydown", this.keydownEvent);
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.inputEvent) {
            this.element.removeEventListener("input", this.inputEvent);
        }
        if (this.keydownEvent) {
            this.element.removeEventListener("keydown", this.keydownEvent);
        }
    }
    delete() {
        this.closeEditing();
        Paragraph.list.delete(this.element);
        this.element.remove();
    }
}
class Heading {
    static list = new Map();
    static classMap = {
        h2: "heading",
        h3: "sub-heading",
    };
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.tag = element.tagName.toLowerCase();
        this.text = element.innerText;
        this.timeout = null;
        this.inputEvent = null;
        this.keydownEvent = null;
        if (!this.element.id) {
            this.element.id = this.assignId();
        }
        Heading.list.set(this.element, this);
    }
    static init(tag) {
        const current = Select.block();
        if (!current) return;
        const className = Heading.classMap[tag];
        if (!className) return;
        if (current.classList.contains(className)) {
            const instance = Heading.list.get(current);
            if (instance) {
                instance.delete();
            }
            return;
        }
        const isParagraph = current.classList.contains(Paragraph.className);
        const isCaption = current.classList.contains(Caption.className);
        if (!isParagraph && !isCaption) {
            return;
        }
        const element = Heading.create(tag, current.innerText || "<br>");
        if (!element) return;
        if (isParagraph) {
            Paragraph.list.delete(current);
        }
        if (isCaption) {
            Caption.list.delete(current);
        }
        current.replaceWith(element);
        const instance = new Heading(element);
        instance.startEditing();
        Select.cursorToEnd(element);
    }
    static create(tag, text = "<br>") {
        const className = Heading.classMap[tag];
        if (!className) return null;
        const element = document.createElement(tag);
        element.classList.add(className);
        element.innerText = text;
        return element;
    }
    static generate(obj) {
        const tag = obj.element === "sub-heading" ? "h3" : "h2";
        return new Heading(Heading.create(tag, obj.text || "<br>"));
    }
    export() {
        return {
            element: Heading.classMap[this.tag],
            text: this.element.innerText
        };
    }
    isEmpty() {
        return !this.element.innerText.trim();
    }
    startEditing() {
        this.element.contentEditable = true;
        this.inputEvent = () => {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.text = this.element.innerText;
                this.element.id = this.assignId();
            }, 150);
        };
        this.keydownEvent = (e) => {
            if (e.key === "Backspace" && this.isEmpty()) {
                e.preventDefault();
                this.delete();
                return;
            }
            if (e.key === "Enter") {
                e.preventDefault();
                const element = Paragraph.create();
                const instance = new Paragraph(element);
                instance.startEditing();
                Paragraph.newLine(this.element, element);
                Select.cursorToEnd(element);
            }
        };
        this.element.addEventListener("input", this.inputEvent);
        this.element.addEventListener("keydown", this.keydownEvent);
    }
    closeEditing() {
        this.element.contentEditable = false;
        this.text = this.element.innerText;
        this.element.id = this.assignId();
        if (this.inputEvent) {
            this.element.removeEventListener("input", this.inputEvent);
            this.inputEvent = null;
        }
        if (this.keydownEvent) {
            this.element.removeEventListener("keydown", this.keydownEvent);
            this.keydownEvent = null;
        }
        clearTimeout(this.timeout);
    }
    delete() {
        const element = Paragraph.create(this.element.innerText || "<br>");
        this.closeEditing();
        this.element.replaceWith(element);
        Heading.list.delete(this.element);
        const instance = new Paragraph(element);
        instance.startEditing();
        Select.cursorToEnd(instance.element);
        return instance;
    }
    assignId() {
        let base = this.element.innerText
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "_");
        if (!base) {
            base = "heading";
        }
        let id = base;
        let i = 1;
        while (this.existsId(id)) {
            id = `${base}_${i++}`;
        }
        return id;
    }
    existsId(id) {
        for (const [, instance] of Heading.list) {
            if (
                instance.element !== this.element &&
                instance.element.id === id
            ) {
                return true;
            }
        }
        return false;
    }
}
class Center {
    static list = new Map();
    static className = "center";
    constructor(element) {
        if (!element) return;
        this.element = element;
        Center.list.set(this.element, this);
    }
    static init() {
        const current = Select.block();
        if (!current) return;
        if (current.classList.contains(Center.className)) {
            current.classList.remove(Center.className);
            Center.list.delete(current);
            Select.cursorToEnd(current);
            return;
        }
        current.classList.add(Center.className);
        new Center(current);
        Select.cursorToEnd(current);
    }
}
class Bold {
    static list = new Map();
    static tag = "b";
    static className = "bold";
    constructor(element) {
        if (!element) return;
        this.element = element;
        Bold.list.set(this.element, this);
    }
    static init() {
        const selection = Select.text();
        const range = Select.cursor();
        if (!selection || !range) {
            return;
        }
        const parent = Select.element(range);
        if (!parent) return;
        const existing = parent.closest(`${Bold.tag}, .${Bold.className}`);
        if (existing) {
            const fragment = document
                .createRange()
                .createContextualFragment(existing.innerHTML);
            existing.replaceWith(fragment);
            Bold.list.delete(existing);
            return;
        }
        if (range.collapsed) {
            return;
        }
        const contents = range.cloneContents();
        if (contents.querySelector(`${Bold.tag}, .${Bold.className}`)) {
            return;
        }
        const text = range.toString();
        if (!text.trim()) {
            return;
        }
        const element = Bold.create(text);
        if (!element) return;
        range.deleteContents();
        range.insertNode(element);
        const instance = new Bold(element);
        Select.cursorToEnd(instance.element);
    }
    static create(text = "") {
        if (!text) return null;
        const element = document.createElement(Bold.tag);
        element.classList.add(Bold.className);
        element.textContent = text;
        return element;
    }
    generate(obj) {
        const element = Bold.create(obj.text || "");
        return new Bold(element);
    }
    export() {
        return {
            element: Bold.className,
            text: this.element.textContent
        };
    }
}
class Italic {
    static list = new Map();
    static tag = "i";
    static className = "italic";
    constructor(element) {
        if (!element) return;
        this.element = element;
        Italic.list.set(this.element, this);
    }
    static init() {
        const selection = Select.text();
        const range = Select.cursor();
        if (!selection || !range) {
            return;
        }
        const parent = Select.element(range);
        if (!parent) return;
        const existing = parent.closest(`${Italic.tag}, .${Italic.className}`);
        if (existing) {
            const fragment = document
                .createRange()
                .createContextualFragment(existing.innerHTML);
            existing.replaceWith(fragment);
            Italic.list.delete(existing);
            return;
        }
        if (range.collapsed) {
            return;
        }
        const contents = range.cloneContents();
        if (contents.querySelector(`${Italic.tag}, .${Italic.className}`)) {
            return;
        }
        const text = range.toString();
        if (!text.trim()) {
            return;
        }
        const element = Italic.create(text);
        if (!element) return;
        range.deleteContents();
        range.insertNode(element);
        const instance = new Italic(element);
        Select.cursorToEnd(instance.element);
    }
    static create(text = "") {
        if (!text) return null;
        const element = document.createElement(Italic.tag);
        element.classList.add(Italic.className);
        element.textContent = text;
        return element;
    }
    generate(obj) {
        const element = Italic.create(obj.text || "");
        return new Italic(element);
    }
    export() {
        return {
            element: Italic.className,
            text: this.element.textContent
        };
    }
}
class Caption {
    static list = new Map();
    static tag = "div";
    static className = "caption";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.text = element.innerText;
        Caption.list.set(this.element, this);
    }
    static init() {
        const current = Select.block();
        if (!current) return;
        if (current.classList.contains(Caption.className)) {
            const instance = Caption.list.get(current);
            if (instance) {
                instance.delete();
            }
            return;
        }
        const element = Caption.create(current.innerText || "<br>");
        if (current.classList.contains(Paragraph.className)) {
            Paragraph.list.delete(current);
        }
        if (
            current.classList.contains("heading") ||
            current.classList.contains("sub-heading")
        ) {
            Heading.list.delete(current);
        }
        current.replaceWith(element);
        Select.cursorToEnd(element);
        const instance = new Caption(element);
        instance.startEditing();
    }
    static create(text = "<br>") {
        const element = document.createElement(Caption.tag);
        element.classList.add(Caption.className);
        element.innerText = text;
        return element;
    }
    generate(obj) {
        const element = Caption.create(obj.text || "<br>");
        GenerateArticle.addChildren(element, obj.children);
        return new Caption(element);
    }
    export() {
        return {
            element: Caption.className,
            text: this.element.innerText,
            children: GenerateArticle.exportChildren(this.element)
        };
    }
    startEditing() {
        this.element.contentEditable = true;
        this.inputEvent = () => {
            clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.text = this.element.innerText;
            }, 150);
        };
        this.keydownEvent = (e) => {
            if (e.key !== "Enter") {
                return;
            }
            e.preventDefault();
            const paragraph = Paragraph.create();
            const instance = new Paragraph(paragraph);
            Caption.newLine(this.element, paragraph);
            instance.startEditing();
            Select.cursorToEnd(paragraph);
        };
        this.backspaceEvent = (e) => {
            if (e.key !== "Backspace") {
                return;
            }
            const text = this.element.innerText.trim();
            if (text) {
                return;
            }
            const content = Select.container();
            const captions = content?.querySelectorAll("." + Caption.className);
            if (captions && captions.length <= 1) {
                return;
            }
            e.preventDefault();
            this.delete();
        };
        this.element.addEventListener("input", this.inputEvent);
        this.element.addEventListener("keydown", this.keydownEvent);
        this.element.addEventListener("keydown", this.backspaceEvent);
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.inputEvent) {
            this.element.removeEventListener("input", this.inputEvent);
        }
        if (this.keydownEvent) {
            this.element.removeEventListener("keydown", this.keydownEvent);
        }
        if (this.backspaceEvent) {
            this.element.removeEventListener("keydown", this.backspaceEvent);
        }
        clearTimeout(this.timeout);
    }
    delete() {
        const element = Paragraph.create(this.element.innerText || "<br>");
        this.closeEditing();
        this.element.replaceWith(element);
        Caption.list.delete(this.element);
        const instance = new Paragraph(element);
        instance.startEditing();
        Select.cursorToEnd(instance.element);
        return instance;
    }
    static newLine(parent, element) {
        if (!parent || !parent.parentNode || !element) {
            return;
        }
        parent.parentNode.insertBefore(element, parent.nextSibling);
    }
}
class List {
    static list = new Map();
    static classMap = {
        ul: "point-list",
        ol: "number-list",
    };
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.tag = element.tagName.toLowerCase();
        List.list.set(this.element, this);
    }
    static init(tag) {
        const current = Select.block();
        if (!current || !tag) {
            return;
        }
        const className = List.classMap[tag];
        if (!className) {
            return;
        }
        const existing = current.closest("ul, ol");
        if (existing) {
            const instance = List.list.get(existing);
            if (instance) {
                instance.delete();
            }
            return;
        }
        const isParagraph = current.classList.contains(Paragraph.className);
        const isCaption = current.classList.contains(Caption.className);
        const inTable = current.closest(".table td, .table th");
        if (!isParagraph && !isCaption && !inTable) {
            Alert.error("Only in paragraphs or tables you can add lists");
            return;
        }
        const element = List.create(tag, current.innerHTML);
        if (!element) {
            return;
        }
        if (inTable) {
            current.innerHTML = "";
            current.appendChild(element);
        } else {
            if (isParagraph) {
                Paragraph.list.delete(current);
            }
            if (isCaption) {
                Caption.list.delete(current);
            }
            current.replaceWith(element);
        }
        const instance = new List(element);
        instance.startEditing();
        Select.cursorToEnd(element.lastElementChild);
    }
    static create(tag, content = "") {
        const element = document.createElement(tag);
        const className = List.classMap[tag];
        element.classList.add(className);
        const lines = content.split("<br>");
        if (!lines.length) {
            lines.push("<br>");
        }
        lines.forEach((line) => {
            const li = document.createElement("li");
            li.innerHTML = line.trim() || "<br>";
            element.appendChild(li);
        });
        return element;
    }
    static generate(obj) {
        const tag = obj.element === "number-list" ? "ol" : "ul";
        const element = document.createElement(tag);
        element.classList.add(obj.element);
        obj.items?.forEach(item => {
            const li = document.createElement("li");
            GenerateArticle.addChildren(li, item);
            element.append(li);
        });
        return new List(element);
    }
    export() {
        return {
            element: List.classMap[this.tag],
            items: [...this.element.querySelectorAll(":scope > li")].map(li => GenerateArticle.exportChildren(li))
        };
    }
    startEditing() {
        this.element.contentEditable = true;
        this.inputEvent = () => {
            const items = this.element.querySelectorAll("li");
            if (!items.length) {
                const li = document.createElement("li");
                li.innerHTML = "<br>";
                this.element.appendChild(li);
                Select.cursorToEnd(li);
            }
        };
        this.keydownEvent = (e) => {
            if (e.key !== "Backspace") {
                return;
            }
            const items = this.element.querySelectorAll("li");
            if (items.length > 1) {
                return;
            }
            const first = items[0];
            if (!first) {
                return;
            }
            const text = first.innerText.trim();
            if (text) {
                return;
            }
            e.preventDefault();
            this.delete();
        };
        this.element.addEventListener("input", this.inputEvent);
        this.element.addEventListener("keydown", this.keydownEvent);
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.inputEvent) {
            this.element.removeEventListener("input", this.inputEvent);
        }
        if (this.keydownEvent) {
            this.element.removeEventListener("keydown", this.keydownEvent);
        }
    }
    delete() {
        const items = [...this.element.querySelectorAll("li")];
        const html = items.map((li) => li.innerHTML).join("<br>");
        const paragraph = Paragraph.create(html || "<br>");
        this.closeEditing();
        this.element.replaceWith(paragraph);
        List.list.delete(this.element);
        const instance = new Paragraph(paragraph);
        instance.startEditing();
        Select.cursorToEnd(paragraph);
        return instance;
    }
}
class Link {
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
        if (!/^https?:///i.test(url)) {
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
class ArticlePreview {
    static list = new Map();
    constructor(link) {
        if (!link) return;
        this.link = link;
        this.url = this.link.url;
        this.element = null;
        this.timer = null;
        this.hovering = false;
        this.isOpen = false;
        this.loaded = false;
        this.loading = false;
        this.text = "";
        this.image = null;
        this.imageExist = false;
        this.heightIsBigger = false;
        if (!this.isValid()) {
            return;
        }
        ArticlePreview.list.set(this.link.element, this);
    }
    isValid() {
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            return false;
        }
        if (!this.url) {
            return false;
        }
        return this.url.startsWith("https://dyscover.ielectro.com/article/");
    }
    startEditing() {
        if (this.showEvent) {
            this.link.element.removeEventListener("mouseenter", this.showEvent);
        }
        if (this.hideEvent) {
            this.link.element.removeEventListener("mouseleave", this.hideEvent);
        }
        clearTimeout(this.timer);
        this.hovering = false;
        this.hide();
    }
    closeEditing() {
        this.showEvent = () => {
            this.hovering = true;
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                if (!this.hovering) {
                    return;
                }
                if (this.isOpen) {
                    return;
                }
                if (this.loaded) {
                    this.create();
                    return;
                }
                this.show();
            }, 200);
        };
        this.hideEvent = () => {
            this.hovering = false;
            clearTimeout(this.timer);
            this.hide();
        };
        this.link.element.addEventListener("mouseenter", this.showEvent);
        this.link.element.addEventListener("mouseleave", this.hideEvent);
    }
    async show() {
        if (this.loading || this.loaded) {
            return;
        }
        this.loading = true;
        try {
            const file = this.url.split("/").pop() + '.html';
            const data = await API.getArticlePreview(file);
            if (!this.hovering) {
                this.loading = false;
                return;
            }
            this.text = data.text;
            this.imageExist = data.status;
            if (this.imageExist) {
                this.image = data.url;
                await this.checkImage();
            }
            this.loaded = true;
            this.create();
        } catch (e) {
            console.error(e);
        } finally {
            this.loading = false;
        }
    }
    hide() {
        if (!this.isOpen || !this.element) {
            return;
        }
        this.element.remove();
        this.element = null;
        this.isOpen = false;
    }
    checkImage() {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = this.image;
            img.onload = () => {
                this.heightIsBigger = img.height >= img.width;
                resolve();
            };
            img.onerror = () => resolve();
        });
    }
    position(width, height) {
        const rect = this.link.element.getBoundingClientRect();
        let x = rect.left + window.scrollX;
        let y = rect.bottom + window.scrollY + 10;
        if (height > window.innerHeight - rect.bottom - 10) {
            y = rect.top + window.scrollY - height - 10;
        }
        if (width > window.innerWidth - rect.left) {
            x = rect.right + window.scrollX - width;
        }
        this.element.style.left = x + "px";
        this.element.style.top = y + "px";
    }
    create() {
        if (!this.hovering) {
            return;
        }
        this.hide();
        this.element = document.createElement("a");
        this.element.className = "article-box";
        this.element.href = this.url;
        const text = document.createElement("div");
        text.className = "article-text";
        const paragraph = document.createElement("p");
        paragraph.innerHTML = this.text;
        let width;
        let height;
        if (this.heightIsBigger) {
            this.element.style.flexDirection = "row";
            text.style.width = "220px";
            paragraph.style.maxHeight = "225px";
            width = 400;
            height = 255;
        } else {
            this.element.style.flexDirection = "column";
            text.style.width = "330px";
            paragraph.style.maxHeight = "160px";
            width = 330;
            height = this.imageExist ? 341 : 160;
        }
        if (this.imageExist) {
            const image = document.createElement("div");
            image.className = "article-image";
            if (this.heightIsBigger) {
                image.style.width = "180px";
                image.style.height = "255px";
            } else {
                image.style.width = "330px";
                image.style.height = "181px";
            }
            image.style.background = `url('${this.image}') center/cover`;
            image.style.borderBottom = "1px solid #ddd";
            this.element.appendChild(image);
        }
        text.appendChild(paragraph);
        this.element.appendChild(text);
        document.body.appendChild(this.element);
        this.position(width, height);
        this.isOpen = true;
        requestAnimationFrame(() => {
            if (this.element) {
                this.element.style.opacity = "1";
            }
        });
    }
    delete() {
        this.startEditing();
        ArticlePreview.list.delete(this.link.element);
        this.hide();
    }
}
class Table {
    static list = new Map();
    static tag = "table";
    static className = "table";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.thead = element.querySelector("thead");
        this.tbody = element.querySelector("tbody");
        this.rows = this.tbody?.rows.length || 0;
        this.columns = this.thead?.rows[0]?.cells.length || 0;
        this.menuActions = [
            {
                name: "Add row up",
                action: this.addRowUp,
            },
            {
                name: "Add row down",
                action: this.addRowDown,
            },
            {
                name: "Delete row",
                action: this.removeRow,
            },
            {
                name: "Add column left",
                action: this.addColumnLeft,
            },
            {
                name: "Add column right",
                action: this.addColumnRight,
            },
            {
                name: "Delete column",
                action: this.removeColumn,
            },
            {
                name: "Delete table",
                action: this.delete,
            },
        ];
        this.menu = new Menu(this);
        this.rowsStyle();
        Table.list.set(this.element, this);
    }
    static async init() {
        const range = Select.cursor();
        const parent = Select.tag();
        if (!range || !parent) {
            return;
        }
        const rows = parseInt(await Alert.prompt("Insert number of rows"));
        const columns = parseInt(await Alert.prompt("Insert number of columns"));
        if (!(rows > 0 && columns > 0)) {
            Alert.error("Rows and columns must be greater than 0");
            return;
        }
        const element = Table.create(rows, columns);
        Paragraph.newLine(parent, element);
        const instance = new Table(element);
        instance.startEditing();
    }
    static create(rows = 1, columns = 1) {
        const table = document.createElement(Table.tag);
        table.classList.add(Table.className);
        table.contentEditable = false;
        const thead = document.createElement("thead");
        const trHead = document.createElement("tr");
        for (let j = 0; j < columns; j++) {
            const th = document.createElement("th");
            th.innerHTML = "<br>";
            trHead.appendChild(th);
        }
        thead.appendChild(trHead);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        for (let i = 0; i < rows; i++) {
            const tr = document.createElement("tr");
            for (let j = 0; j < columns; j++) {
                const td = document.createElement("td");
                td.innerHTML = "<br>";
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        return table;
    }
    generate(obj) {
        const element = Table.create(obj.rows.length, obj.headers.length);
        const headers = element.querySelectorAll("th");
        obj.headers.forEach((cell, i) => {
            GenerateArticle.addChildren(headers[i], cell);
        });
        const rows = element.querySelectorAll("tbody tr");
        obj.rows.forEach((row, i) => {
            row.forEach((cell, j) => {
                GenerateArticle.addChildren(rows[i].cells[j], cell);
            });
        });
        return new Table(element);
    }
    export() {
        return {
            element: Table.className,
            headers: [...this.element.querySelectorAll("thead th")].map(th => GenerateArticle.exportChildren(th)),
            rows: [...this.element.querySelectorAll("tbody tr")].map(row => [...row.cells].map(cell => GenerateArticle.exportChildren(cell)))
        };
    }
    startEditing() {
        this.element.contentEditable = false;
        this.editableElements = this.element.querySelectorAll("th, td");
        this.editableElements.forEach((element) => {
            element.contentEditable = true;
        });
        this.menu.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.editableElements) {
            this.editableElements.forEach((element) => {
                element.contentEditable = false;
            });
        }
        this.menu.closeEditing();
    }
    rowsStyle() {
        [...this.tbody.rows].forEach((row, i) => {
            row.classList.toggle("row-even", i % 2 === 1);
            row.classList.toggle("row-odd", i % 2 === 0);
        });
    }
    position() {
        const range = Select.cursor();
        const element = Select.tag(range);
        if (!element) {
            return null;
        }
        const rowElement = element.closest("tr");
        const cellElement = element.closest("td");
        if (!rowElement || !cellElement) {
            return null;
        }
        return {
            row: Array.from(this.tbody.rows).indexOf(rowElement),
            column: Array.from(rowElement.cells).indexOf(cellElement),
        };
    }
    addRowUp() {
        const position = this.position();
        if (!position) return;
        const row = this.tbody.insertRow(position.row);
        for (let j = 0; j < this.columns; j++) {
            row.insertCell(j).innerHTML = "<br>";
        }
        this.rows++;
        this.rowsStyle();
    }
    addRowDown() {
        const position = this.position();
        if (!position) return;
        const row = this.tbody.insertRow(position.row + 1);
        for (let j = 0; j < this.columns; j++) {
            row.insertCell(j).innerHTML = "<br>";
        }
        this.rows++;
        this.rowsStyle();
    }
    removeRow() {
        const position = this.position();
        if (!position) return;
        if (this.rows <= 1) {
            Alert.error("At least one row must remain");
            return;
        }
        this.tbody.deleteRow(position.row);
        this.rows--;
        this.rowsStyle();
    }
    addColumnLeft() {
        const position = this.position();
        if (!position) return;
        for (let i = 0; i < this.rows; i++) {
            this.tbody.rows[i].insertCell(position.column).innerHTML = "<br>";
        }
        const th = document.createElement("th");
        this.thead.rows[0].insertBefore(
            th,
            this.thead.rows[0].cells[position.column],
        );
        this.columns++;
    }
    addColumnRight() {
        const position = this.position();
        if (!position) return;
        for (let i = 0; i < this.rows; i++) {
            this.tbody.rows[i].insertCell(position.column + 1).innerHTML = "<br>";
        }
        const th = document.createElement("th");
        this.thead.rows[0].insertBefore(
            th,
            this.thead.rows[0].cells[position.column + 1],
        );
        this.columns++;
    }
    removeColumn() {
        const position = this.position();
        if (!position) return;
        if (this.columns <= 1) {
            Alert.error("At least one column must remain");
            return;
        }
        this.thead.rows[0].deleteCell(position.column);
        for (let i = 0; i < this.rows; i++) {
            this.tbody.rows[i].deleteCell(position.column);
        }
        this.columns--;
    }
    delete() {
        this.closeEditing();
        Table.list.delete(this.element);
        this.element.remove();
    }
}
class Legend {
    static list = new Map();
    static className = "legend";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.box = element.querySelector(".legend-box");
        this.label = element.querySelector(".legend-text");
        this.color = this.box?.style.backgroundColor || "";
        this.text = this.label?.textContent || "";
        this.menuActions = [
            { name: "Change color", action: this.changeColor },
            { name: "Delete", action: this.delete },
        ];
        this.menu = new Menu(this);
        Legend.list.set(this.element, this);
    }
    static async init() {
        const range = Select.cursor();
        if (!range) return;
        let color = await Alert.prompt("Insert color (COLOR, HEX, RGB)");
        if (!Legend.isValidColor(color)) {
            Alert.error("Insert a valid color");
            return;
        }
        const text = range.toString().trim() || "Text";
        const element = Legend.create(color, text);
        range.deleteContents();
        range.insertNode(element);
        Select.cursorToEnd(element);
        const instance = new Legend(element);
        instance.startEditing();
    }
    static create(color, text = "Text") {
        const box = document.createElement("div");
        box.className = Legend.className;
        const square = document.createElement("div");
        square.classList.add("legend-box");
        square.style.backgroundColor = color;
        square.contentEditable = false;
        const label = document.createElement("span");
        label.classList.add("legend-text");
        label.textContent = text;
        box.appendChild(square);
        box.appendChild(label);
        return box;
    }
    static generate(obj) {
        const element = Legend.create(obj.color || "", "");
        const instance = new Legend(element);
        GenerateArticle.addChildren(instance.label, obj.children);
        return instance;
    }
    export() {
        return {
            element: Legend.className,
            color: this.color,
            children: GenerateArticle.exportChildren(this.label)
        };
    }
    static isValidColor(color) {
        if (!color) return false;
        const s = new Option().style;
        s.color = color;
        if (s.color === color) {
            return true;
        }
        return (
            /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ||
            /^rgb\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)$/i.test(color)
        );
    }
    startEditing() {
        this.element.contentEditable = false;
        if (this.label) {
            this.label.contentEditable = true;
            this.inputEvent = () => {
                this.text = this.label.textContent;
            };
            this.label.addEventListener("input", this.inputEvent);
        }
        this.menu.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        if (this.label) {
            this.label.contentEditable = false;
        }
        if (this.label && this.inputEvent) {
            this.label.removeEventListener("input", this.inputEvent);
        }
        this.menu.closeEditing();
    }
    async changeColor() {
        let color = await Alert.prompt("Insert color (COLOR, HEX, RGB)");
        if (!Legend.isValidColor(color)) {
            Alert.error("Insert a valid color");
            return;
        }
        this.color = color;
        if (this.box) {
            this.box.style.backgroundColor = color;
        }
    }
    delete() {
        this.closeEditing();
        this.element.remove();
        Legend.list.delete(this.element);
    }
}
class Percentage {
    static list = new Map();
    static className = "percentage";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.value = element.dataset.value || "0";
        this.width = Percentage.calculate(this.value) || 0;
        this.menuActions = [
            { name: "Update", action: this.update },
            { name: "Delete", action: this.delete },
        ];
        this.menu = new Menu(this);
        Percentage.list.set(this.element, this);
    }
    static async init() {
        const range = Select.cursor();
        if (!range) return;
        const value = await Alert.prompt(
            "Write percentage (50%) or fraction (1/2)",
        );
        if (!value) {
            Alert.error("Insert a valid percentage or fraction");
            return;
        }
        const width = Percentage.calculate(value);
        if (width === null) {
            Alert.error("Insert a valid percentage or fraction");
            return;
        }
        const element = Percentage.create(width, value);
        range.insertNode(element);
        const instance = new Percentage(element);
        instance.startEditing();
        Select.cursorToEnd(instance.element);
    }
    static create(width, value) {
        const element = document.createElement("div");
        element.className = Percentage.className;
        element.contentEditable = false;
        element.dataset.value = value;
        const bar = document.createElement("div");
        bar.classList.add("percentage-value");
        bar.style.width = width + "%";
        element.appendChild(bar);
        return element;
    }
    static generate(obj) {
        const width = Percentage.calculate(obj.value) || 0;
        const element = Percentage.create(width, obj.value);
        return new Percentage(element);
    }
    export() {
        return {
            element: Percentage.className,
            value: this.value
        };
    }
    static calculate(value) {
        if (!value) return null;
        if (value.includes("/")) {
            const [num, den] = value.split("/").map((v) => parseFloat(v));
            if (!den || den === 0 || num > den) {
                return null;
            }
            return (num / den) * 100;
        }
        const n = parseFloat(value);
        return isNaN(n) ? null : n;
    }
    startEditing() {
        this.element.contentEditable = false;
        this.menu.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        this.menu.closeEditing();
    }
    async update() {
        const value = await Alert.prompt("Update percentage or fraction");
        if (!value) {
            Alert.error("Insert a valid percentage or fraction");
            return;
        }
        const width = Percentage.calculate(value);
        if (width === null) {
            Alert.error("Insert a valid percentage or fraction");
            return;
        }
        this.value = value;
        this.width = width;
        this.element.dataset.value = value;
        const bar = this.element.querySelector(".percentage-value");
        if (bar) {
            bar.style.width = width + "%";
        }
    }
    delete() {
        this.closeEditing();
        Percentage.list.delete(this.element);
        this.element.remove();
    }
}
class Media {
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
class Template {
    static list = new Map();
    static className = "template";
    constructor(element) {
        if (!element) return;
        this.element = element;
        this.title = element.dataset.title || "";
        this.tbody = element.querySelector("tbody");
        this.menuActions = [
            { name: "Open", action: this.open },
            { name: "Delete", action: this.delete },
        ];
        this.menu = new Menu(this);
        Template.list.set(this.element, this);
    }
    static async init() {
        let table = document.querySelector("." + Template.className);
        let title;
        if (!table) {
            title = await WebSelector.init("dyscover", "template");
            if (!title) return;
            table = Template.create(title);
            const content = Select.container();
            if (!content) return;
            const titleElement = content.querySelector(".title");
            if (titleElement) {
                titleElement.after(table);
            } else {
                content.prepend(table);
            }
        }
        const instance = new Template(table);
        instance.open();
    }
    static create(title) {
        const table = document.createElement("table");
        table.classList.add(Template.className);
        table.dataset.title = title;
        table.contentEditable = false;
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.colSpan = 2;
        const ul = document.createElement("ul");
        ul.classList.add("template-cell-info");
        const li = document.createElement("li");
        li.innerHTML = "<br>";
        ul.appendChild(li);
        th.appendChild(ul);
        tr.appendChild(th);
        thead.appendChild(tr);
        const tbody = document.createElement("tbody");
        table.appendChild(thead);
        table.appendChild(tbody);
        return table;
    }
    static generate(obj) {
        const element = Template.create(obj.title);
        const instance = new Template(element);
        obj.fields?.forEach(field=>{
            let result = null;
            switch(field.type) {
                case "text":
                    result = instance.textRow(field.name);
                    break;
                case "definition":
                    result = instance.textRow(field.name, true);
                    break;
                case "image":
                    result = instance.imageRow(field.name, field.url);
                    break;
                case "large-image":
                    result = instance.imageRow(field.name, field.url, true);
                    break;
                case "double-image":
                    result = instance.doubleImageRow(field.name, field.urls[0], field.urls[1]);
                    break;
                case "double-column":
                case "double-column-extended":
                    result = instance.doubleColumnRow(field.name, [[field.left, field.right]]);
                    break;
            }
            if (result) {
                instance.insertRow(result.row, field.name);
            }
        });
        return instance;
    }
    export() {
        const fields = [];
        this.element.querySelectorAll("tbody tr[data-field]").forEach(row=>{
            const label = row.querySelector(".template-cell-label")?.innerText || row.dataset.field;
            const images = [...row.querySelectorAll("img")].map(img=>img.src);
            if (images.length) {
                fields.push({
                    name: label,
                    type: images.length > 1 ? "double-image" : "image",
                    urls: images
                });
                return;
            }
            const lists = [...row.querySelectorAll(".template-cell-info")].map(list=>{
                return [...list.querySelectorAll("li")].map(li=>li.innerHTML);
            });
            fields.push({
                name: label,
                type: row.querySelector("b") ? "definition" : "text",
                content: lists.length === 1 ? lists[0] : lists
            });
        });
        return {
            element: Template.className,
            title: this.element.dataset.title || "",
            fields
        };
    }
    startEditing() {
        this.element.contentEditable = false;
        this.element.querySelectorAll(".template-cell-info").forEach((element) => {
            element.contentEditable = true;
        });
        this.menu?.startEditing();
    }
    closeEditing() {
        this.element.contentEditable = false;
        this.element.querySelectorAll(".template-cell-info").forEach((element) => {
            element.contentEditable = false;
        });
        this.menu?.closeEditing();
    }
    async open() {
        try {
            this.fields = await API.getTemplate(this.title.replace(/ /g, "_"));
            const box = new Box("Template fields");
            await box.create();
            box.footer((footer) => {
                footer.innerHTML = `
                    <button class="add">
                        Add field
                    </button>
                    <button class="delete">
                        Delete template
                    </button>
                `;
                footer.querySelector(".add").onclick = () => {
                    this.addFields();
                };
                footer.querySelector(".delete").onclick = async () => {
                    const confirm = await Alert.confirm("Delete template");
                    if (!confirm) return;
                    this.delete();
                    box.close();
                };
            });
            box.body((body) => {
                this.fields.forEach((field) => {
                    this.renderField(body, field);
                });
            });
        } catch {
            Alert.error("Failed to load template");
        }
    }
    renderField(body, field) {
        const id = field.name.toLowerCase();
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = id;
        const label = document.createElement("label");
        label.textContent = field.name.replace(/-/g, " ");
        body.append(checkbox, label, document.createElement("br"));
        const exists = this.element.querySelector(`[data-field="${id}"]`);
        if (exists) {
            checkbox.checked = true;
        }
    }
    async addFields() {
        for (const field of this.fields) {
            const checkbox = document.querySelector("." + field.name.toLowerCase());
            if (!checkbox) continue;
            if (checkbox.checked) {
                const exists = this.element.querySelector(
                    `[data-field="${field.name.toLowerCase()}"]`,
                );
                if (!exists) {
                    await this.createField(field);
                }
                continue;
            }
            this.removeField(field.name);
        }
    }
    removeField(field) {
        const rows = this.tbody.querySelectorAll(
            `[data-field="${field.toLowerCase()}"]`,
        );
        rows.forEach((row) => row.remove());
    }
    async createField(field) {
        let result = null;
        switch (field.type) {
            case "image":
            case "large-image": {
                const url = await this.selectImage();
                if (!url) return;
                result = this.imageRow(field.name, url, field.type === "large-image");
                break;
            }
            case "double-image": {
                const url1 = await this.selectImage();
                const url2 = await this.selectImage();
                if (!url1 || !url2) return;
                result = this.doubleImageRow(field.name, url1, url2);
                break;
            }
            case "definition":
                result = this.textRow(field.name, true);
                break;
            case "text":
                result = this.textRow(field.name);
                break;
            case "double-column":
                result = this.doubleColumnRow(field.name);
                break;
            case "double-column-extended":
                result = this.doubleColumnRow(field.name, [["<br>", "<br>"]]);
                break;
        }
        if (!result) return;
        this.insertRow(result.row, field.name);
        result.row.querySelectorAll("img").forEach((img) => {
            new Media(img);
        });
    }
    async selectImage() {
        const option = await Alert.select("Select source", ["Dyscover", "URL"]);
        if (!option) return null;
        return await WebSelector.init(option.toLowerCase(), "image");
    }
    insertRow(row, field) {
        const names = this.fields.map((f) => f.name);
        const index = names.indexOf(field);
        for (let i = index + 1; i < names.length; i++) {
            const next = this.tbody.querySelector(
                `[data-field="${names[i].toLowerCase()}"]`,
            );
            if (next) {
                this.tbody.insertBefore(row, next);
                return;
            }
        }
        this.tbody.appendChild(row);
    }
    textRow(field, definition = false) {
        const row = document.createElement("tr");
        row.dataset.field = field.toLowerCase();
        if (definition) {
            const td = document.createElement("td");
            td.colSpan = 2;
            const title = document.createElement("b");
            title.textContent = field;
            const list = this.editableList();
            td.appendChild(title);
            td.appendChild(list);
            row.appendChild(td);
            return { row };
        }
        const th = document.createElement("th");
        th.classList.add("template-cell-label");
        th.textContent = field.replace(/-/g, " ");
        const td = document.createElement("td");
        td.appendChild(this.editableList());
        row.appendChild(th);
        row.appendChild(td);
        return { row };
    }
    imageRow(field, url, large = false) {
        const row = document.createElement("tr");
        row.dataset.field = field.toLowerCase();
        const td = document.createElement("td");
        td.colSpan = 2;
        if (large) {
            td.style.padding = "0";
        }
        const img = document.createElement("img");
        img.src = url;
        img.classList.add("template-image");
        img.style.width = large ? "100%" : "50%";
        td.appendChild(img);
        new Media(img);
        row.appendChild(td);
        return { row };
    }
    doubleImageRow(field, url1, url2) {
        const row = document.createElement("tr");
        row.dataset.field = field.toLowerCase();
        const td = document.createElement("td");
        td.colSpan = 2;
        const img1 = document.createElement("img");
        img1.src = url1;
        img1.classList.add("template-image");
        const img2 = document.createElement("img");
        img2.src = url2;
        img2.classList.add("template-image");
        td.appendChild(img1);
        td.appendChild(img2);
        new Media(img1);
        new Media(img2);
        row.appendChild(td);
        return { row };
    }
    doubleColumnRow(field, rows = [["<br>", "<br>"]]) {
        const row = document.createElement("tr");
        row.dataset.field = field.toLowerCase();
        const left = this.editableList(false);
        const right = this.editableList(false);
        rows.forEach(([l, r]) => {
            left.appendChild(this.li(l));
            right.appendChild(this.li(r));
        });
        const tdLeft = document.createElement("td");
        const tdRight = document.createElement("td");
        tdLeft.appendChild(left);
        tdRight.appendChild(right);
        row.appendChild(tdLeft);
        row.appendChild(tdRight);
        return { row };
    }
    editableList(defaultItem = true) {
        const ul = document.createElement("ul");
        ul.classList.add("template-cell-info");
        if (defaultItem) {
            ul.appendChild(this.li());
        }
        return ul;
    }
    li(content = "<br>") {
        const li = document.createElement("li");
        li.innerHTML = content;
        return li;
    }
    delete() {
        this.menu?.closeEditing();
        Template.list.delete(this.element);
        this.element.remove();
    }
}

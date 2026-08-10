import { Api } from "../core/api.js";
import { Alert, Box } from "../core/index.js";
import { API } from "./api.js";
import { ArticleHelp } from "./article-help.js";

const TYPE_LABELS = {
    link: "link",
    article: "article",
    template: "template",
    image: "image",
    video: "video",
    audio: "audio",
    document: "document",
};

const TYPE_VARIANTS = {
    link: "article",
    article: "article",
    template: "template",
    image: "media",
    video: "media",
    audio: "media",
    document: "media",
};

export class WebSelector {
    static options = ["dyscover", "url"];

    constructor(type) {
        this.type = type;
        this.selectedClass = "selected-link";
        this.box = null;
        this.results = [];
    }

    static normalizeSource(option) {
        return String(option || "").trim().toLowerCase() === "url"
            ? "url"
            : "dyscover";
    }

    static async init(option, type) {
        const instance = new WebSelector(type);
        const source = WebSelector.normalizeSource(option);
        if (source === WebSelector.options[0]) {
            return await instance.fromServer();
        }
        if (source === WebSelector.options[1]) {
            return await instance.fromURL();
        }
        return null;
    }

    titleLabel() {
        return TYPE_LABELS[this.type] || this.type;
    }

    boxOptions() {
        const helpMap = {
            link: ArticleHelp.link,
            template: ArticleHelp.template,
        };
        return {
            variant: TYPE_VARIANTS[this.type] || "article",
            headerLayout: "creator",
            help: helpMap[this.type] || ArticleHelp.media,
        };
    }

    async fromServer() {
        return new Promise(async (resolve) => {
            const opts = this.boxOptions();
            this.box = new Box(`Select a ${this.titleLabel()}`, opts);
            await this.box.create();
            this.box.footer((footer) => {
                footer.classList.add("select-item-footer--search");
                footer.innerHTML = `
                    <input class="input selector-search-input" type="search"
                        placeholder="Search by title or tag"
                        autocapitalize="off" autocomplete="off" spellcheck="false">
                    <button type="button" class="button selector-add-btn">Add</button>
                `;
                footer.querySelector(".selector-add-btn").onclick = () => {
                    const selected = this.box.container.querySelector(
                        `.${this.selectedClass}`,
                    );
                    if (!selected) {
                        Alert.error("Select an item first");
                        return;
                    }
                    this.box.close();
                    resolve({
                        url: selected.dataset.value,
                        postId: selected.dataset.postId || "",
                        postType: selected.dataset.postType || "",
                    });
                };
            });
            this.box.body((body) => {
                body.classList.add("selector-results-body");
                const input = this.box.container.querySelector(
                    ".selector-search-input",
                );
                const debounced = this.debounce(async (value) => {
                    await this.renderResults(body, value);
                }, 280);
                input.oninput = () => {
                    const value = input.value.trim();
                    if (!value) {
                        body.innerHTML = "";
                        return;
                    }
                    debounced(value);
                };
                input.focus();
            });
        });
    }

    async renderResults(body, term) {
        body.innerHTML = `<p class="selector-empty">Searching…</p>`;
        try {
            this.results = await this.fetchResults(term);
        } catch {
            body.innerHTML = `<p class="selector-empty">Search failed</p>`;
            return;
        }
        body.innerHTML = "";
        if (!this.results.length) {
            body.innerHTML = `<p class="selector-empty">No results for “${term}”</p>`;
            return;
        }
        this.results.forEach((result) => {
            const row = this.createRow(result);
            body.appendChild(row);
            this.bindItem(row);
        });
    }

    async fetchResults(term) {
        if (this.type === "link") {
            return await API.searchLinkPosts(term);
        }
        return await API.search(this.type, term);
    }

    createRow(result) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "search-row selector-result-row";
        const media = result.media
            ? `${result.media}?t=${new Date(result.updated || Date.now()).getTime()}`
            : "";
        const title = result.title || "Untitled";
        const typeLabel = String(result.type || this.type).replace(/-/g, " ");
        el.innerHTML = `
            <div class="search-image" style="background-image:url('${media}')"></div>
            <div class="search-text">
                <b>${title}</b>
                <span class="selector-type-badge">${typeLabel}</span>
            </div>`;
        el.dataset.postId = String(result.id || "");
        el.dataset.postType = String(result.type || "");
        el.dataset.value = this.resolveValue(result, media);
        return el;
    }

    resolveValue(result, media) {
        if (this.type === "link") {
            if (result.url) {
                return result.url;
            }
            if (result.uuid) {
                return result.type === "document"
                    ? `${Api.origin}/document/${result.uuid}`
                    : `${Api.origin}/article/${result.uuid}`;
            }
        }
        if (this.type === "template") {
            return String(result.id);
        }
        return media || result.url || "";
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
            const valid = /^(ftp|http|https):\/\/[^ "]+$/.test(trimmed);
            if (valid) {
                return { url: trimmed, postId: "", postType: "" };
            }
            Alert.error("Invalid URL");
        }
    }

    bindItem(item) {
        item.onclick = () => {
            const all = this.box.container.querySelectorAll(".selector-result-row");
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

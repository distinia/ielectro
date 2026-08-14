import { Api } from "../core/api.js";
import { Alert, Box } from "../core/index.js";
import { API } from "./api.js";
import { ArticleHelp } from "./article-help.js";
import { PostResolver } from "./post-resolver.js";
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
                    <button type="button" class="button selector-add-btn creator-footer-btn"
                        aria-label="Add" title="Add">
                        <span class="selector-add-mark" aria-hidden="true">+</span>
                    </button>
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
    isMediaPicker() {
        return ["image", "video", "audio", "document"].includes(this.type);
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
        body.classList.toggle("selector-results-body--grid", this.isMediaPicker());
        if (!this.results.length) {
            body.innerHTML = `<p class="selector-empty">No results for “${term}”</p>`;
            return;
        }
        this.results.forEach((result) => {
            const item = this.isMediaPicker()
                ? this.createMediaCard(result)
                : this.createRow(result);
            body.appendChild(item);
            this.bindItem(item);
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
        el.className = "search-row selector-result-row selector-result-item";
        const preview = this.previewUrl(result);
        const assetUrl = this.assetUrl(result);
        const title = result.title || "Untitled";
        const typeLabel = String(result.type || this.type).replace(/-/g, " ");
        const visual = preview
            ? `<div class="search-image"><img class="search-image-thumb" src="${WebSelector.escapeAttr(preview)}" alt="" loading="lazy"></div>`
            : `<div class="search-image search-image--empty"></div>`;
        el.innerHTML = `
            ${visual}
            <div class="search-text">
                <b>${title}</b>
                <span class="selector-type-badge">${typeLabel}</span>
            </div>`;
        el.dataset.postId = String(result.id || "");
        el.dataset.postType = String(result.type || "");
        el.dataset.value = this.resolveValue(result, assetUrl);
        return el;
    }
    static cacheBust(url, result) {
        if (!url) return "";
        const stamp = new Date(
            result.updated || result.updated_at || Date.now(),
        ).getTime();
        return `${url}${String(url).includes("?") ? "&" : "?"}t=${stamp}`;
    }
    static escapeAttr(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;");
    }
    static pickPreviewSource(result) {
        for (const url of [
            result.preview_image,
            result.preview,
            result.media,
        ]) {
            if (PostResolver.isRenderablePreview(url)) {
                return String(url).trim();
            }
        }
        return "";
    }
    static isVideoFile(url) {
        return /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(String(url || ""));
    }
    static isDefaultPreview(url) {
        return /\/assets\/brand\/default-post\.jpg/i.test(String(url || ""));
    }
    static videoPreviewCandidates(result) {
        const list = [];
        const push = (url) => {
            const value = String(url || "").trim();
            if (!value || WebSelector.isVideoFile(value)) {
                return;
            }
            if (WebSelector.isDefaultPreview(value)) {
                return;
            }
            if (!list.includes(value)) {
                list.push(value);
            }
        };
        push(result.preview_image);
        push(result.preview);
        const uuid = String(result.uuid || "");
        const userId = Number(result.user_id) || 0;
        if (uuid && userId) {
            push(
                `${Api.origin}/assets/users/${userId}/videos/${uuid}_preview.jpg`,
            );
        }
        const media = String(result.media || "");
        if (media) {
            push(
                media.replace(/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i, "_preview.jpg"),
            );
        }
        return list.map((url) => WebSelector.cacheBust(url, result));
    }
    videoSource(result) {
        const media = String(result.media || "").trim();
        if (media && WebSelector.isVideoFile(media)) {
            return WebSelector.cacheBust(media, result);
        }
        return "";
    }
    previewUrl(result) {
        const type = String(result.type || this.type).toLowerCase();
        if (type === "video") {
            const candidates = WebSelector.videoPreviewCandidates(result);
            return candidates[0] || "";
        }
        if (type === "document" || type === "audio") {
            const preview = result.preview_image || result.preview || "";
            if (preview && !/\.(mp3|wav|ogg|m4a|pdf|html)(\?|$)/i.test(preview)) {
                return WebSelector.cacheBust(preview, result);
            }
        }
        const source = WebSelector.pickPreviewSource(result);
        if (!source) {
            if (type === "article" || this.type === "link") {
                return WebSelector.cacheBust(
                    `${Api.origin}/assets/brand/default-post.jpg`,
                    result,
                );
            }
            return "";
        }
        return WebSelector.cacheBust(source, result);
    }
    assetUrl(result) {
        const type = String(result.type || this.type).toLowerCase();
        if (type === "video" || type === "audio") {
            return WebSelector.cacheBust(result.media || "", result);
        }
        return this.previewUrl(result);
    }
    createMediaCard(result) {
        const el = document.createElement("div");
        const type = String(result.type || this.type).toLowerCase();
        el.className = `selector-media-card selector-result-item selector-media-card--${type}`;
        el.setAttribute("role", "button");
        el.tabIndex = 0;
        const preview = this.previewUrl(result);
        const assetUrl = this.assetUrl(result);
        const title = result.title || "Untitled";
        const visual = document.createElement("div");
        visual.className = "selector-media-visual";
        if (type === "video") {
            this.setVideoVisual(visual, result, title);
        } else if (preview) {
            visual.style.backgroundImage = `url("${preview}")`;
        } else {
            visual.classList.add(`selector-media-visual--${type}`);
        }
        const label = document.createElement("p");
        label.className = "selector-media-title";
        label.textContent = title;
        label.title = title;
        el.append(visual, label);
        el.dataset.postId = String(result.id || "");
        el.dataset.postType = String(result.type || "");
        el.dataset.value = this.resolveValue(result, assetUrl);
        return el;
    }
    setVideoVisual(visual, result, title) {
        const candidates = WebSelector.videoPreviewCandidates(result);
        const videoSrc = this.videoSource(result);
        const showPlaceholder = () => {
            visual.innerHTML = "";
            visual.classList.add("selector-media-visual--video");
        };
        const showVideo = () => {
            visual.innerHTML = "";
            visual.classList.remove("selector-media-visual--video");
            const video = document.createElement("video");
            video.className = "selector-media-thumb";
            video.muted = true;
            video.playsInline = true;
            video.preload = "metadata";
            video.setAttribute("aria-label", title);
            video.src = videoSrc;
            video.addEventListener(
                "loadeddata",
                () => {
                    try {
                        video.currentTime = 0.1;
                    } catch {
                        /* ignore seek errors */
                    }
                },
                { once: true },
            );
            video.addEventListener("error", showPlaceholder, { once: true });
            visual.appendChild(video);
        };
        if (!candidates.length) {
            if (videoSrc) {
                showVideo();
            } else {
                showPlaceholder();
            }
            return;
        }
        const img = document.createElement("img");
        img.className = "selector-media-thumb";
        img.alt = title;
        img.loading = "lazy";
        let index = 0;
        const tryNext = () => {
            if (index >= candidates.length) {
                if (videoSrc) {
                    showVideo();
                } else {
                    showPlaceholder();
                }
                return;
            }
            img.src = candidates[index++];
        };
        img.addEventListener("error", tryNext);
        visual.appendChild(img);
        tryNext();
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
        const select = () => {
            const all = this.box.container.querySelectorAll(".selector-result-item");
            all.forEach((el) => el.classList.remove(this.selectedClass));
            item.classList.add(this.selectedClass);
        };
        item.onclick = select;
        item.onkeydown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                select();
            }
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

import { API } from "./api.js";
import { PostResolver } from "./post-resolver.js";
export class ArticlePreview {
    static list = new Map();
    constructor(link) {
        if (!link) return;
        this.link = link;
        this.url = this.link.url;
        this.uuid = PostResolver.parseUuidFromUrl(this.url);
        this.element = null;
        this.timer = null;
        this.hovering = false;
        this.isOpen = false;
        this.loaded = false;
        this.loading = false;
        this.text = "";
        this.title = "";
        this.postId = "";
        this.image = null;
        this.imageExist = false;
        this.isVerticalImage = false;
        if (!this.isValid()) {
            return;
        }
        ArticlePreview.list.set(this.link.element, this);
    }
    kind() {
        const explicit = this.link.element?.dataset?.postType;
        if (explicit === "document") return "document";
        if (explicit === "article") return "article";
        return PostResolver.linkKind(this.url);
    }
    isValid() {
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            return false;
        }
        if (!this.url || !PostResolver.isDyscoverUrl(this.url)) {
            return false;
        }
        const kind = this.kind();
        return kind === "article" || kind === "document";
    }
    startEditing() {
        this.unbindListeners();
        clearTimeout(this.timer);
        this.hovering = false;
        this.hide();
    }
    unbindListeners() {
        if (this.showEvent) {
            this.link.element.removeEventListener("mouseenter", this.showEvent);
        }
        if (this.hideEvent) {
            this.link.element.removeEventListener("mouseleave", this.hideEvent);
        }
        if (this.clickEvent) {
            this.link.element.removeEventListener("click", this.clickEvent);
        }
        this.unbindViewportListeners();
    }
    bindViewportListeners() {
        if (this.viewportHandler) {
            return;
        }
        this.viewportHandler = () => {
            if (this.isOpen) {
                this.position();
            }
        };
        window.addEventListener("scroll", this.viewportHandler, true);
        window.addEventListener("resize", this.viewportHandler);
    }
    unbindViewportListeners() {
        if (!this.viewportHandler) {
            return;
        }
        window.removeEventListener("scroll", this.viewportHandler, true);
        window.removeEventListener("resize", this.viewportHandler);
        this.viewportHandler = null;
    }
    isPointerOverLink() {
        return this.link.element.matches(":hover");
    }
    shouldStayOpen() {
        return this.hovering || this.isPointerOverLink();
    }
    closeEditing() {
        this.unbindListeners();
        if (this.kind() === "document") {
            this.clickEvent = (e) => {
                e.preventDefault();
                void PostResolver.openOverlay(
                    this.link.element.dataset.postId,
                    this.url,
                );
            };
            this.link.element.addEventListener("click", this.clickEvent);
            return;
        }
        this.showEvent = () => {
            this.hovering = true;
            clearTimeout(this.timer);
            this.timer = setTimeout(() => {
                if (!this.hovering || this.isOpen) {
                    return;
                }
                if (this.loaded) {
                    this.create();
                    return;
                }
                this.show();
            }, 220);
        };
        this.hideEvent = () => {
            this.hovering = false;
            clearTimeout(this.timer);
            this.timer = setTimeout(() => this.hide(), 120);
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
            let uuid = this.uuid;
            if (!PostResolver.isUuid(uuid)) {
                uuid = await API.resolveArticleUuid(uuid);
            }
            if (!PostResolver.isUuid(uuid)) {
                return;
            }
            const data = await API.getArticlePreview(uuid);
            if (!this.shouldStayOpen()) {
                return;
            }
            this.text = data.text || "";
            this.title = data.title || "";
            this.uuid = data.uuid || uuid;
            this.postId = String(data.id || this.link.element.dataset.postId || "");
            this.imageExist = !!data.url;
            this.image = data.url || "";
            if (data.articleUrl && !PostResolver.isUuid(PostResolver.parseUuidFromUrl(this.url))) {
                const hash = this.url.includes("#") ? this.url.slice(this.url.indexOf("#")) : "";
                this.url = data.articleUrl + hash;
                this.link.element.href = this.url;
            }
            if (this.imageExist && this.image) {
                await this.measureImage();
            }
            if (!this.shouldStayOpen()) {
                return;
            }
            this.loaded = true;
            this.create();
        } catch (e) {
            console.error(e);
        } finally {
            this.loading = false;
        }
    }
    measureImage() {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = this.image;
            img.onload = () => {
                this.isVerticalImage = img.height > img.width * 1.05;
                resolve();
            };
            img.onerror = () => resolve();
        });
    }
    hide() {
        if (!this.isOpen || !this.element) {
            return;
        }
        this.unbindViewportListeners();
        this.element.remove();
        this.element = null;
        this.isOpen = false;
    }
    position() {
        if (!this.element || !this.link.element) {
            return;
        }
        const rect = this.link.element.getBoundingClientRect();
        const width = this.isVerticalImage
            ? Math.min(400, window.innerWidth - 24)
            : Math.min(330, window.innerWidth - 24);
        const height = this.element.offsetHeight || 320;
        const margin = 14;
        const padding = 12;
        let x = rect.left + rect.width / 2 - width / 2;
        x = Math.max(padding, Math.min(x, window.innerWidth - width - padding));
        const spaceAbove = rect.top - padding;
        const spaceBelow = window.innerHeight - rect.bottom - padding;
        let top;
        let placement = "above";
        if (spaceAbove >= height + margin || spaceAbove >= spaceBelow) {
            top = rect.top - height - margin;
            placement = "above";
        } else {
            top = rect.bottom + margin;
            placement = "below";
        }
        top = Math.max(
            padding,
            Math.min(top, window.innerHeight - height - padding),
        );
        this.element.style.left = `${x}px`;
        this.element.style.top = `${top}px`;
        this.element.style.width = `${width}px`;
        this.element.dataset.placement = placement;
    }
    bindBoxHover() {
        this.element.addEventListener("mouseenter", () => {
            this.hovering = true;
            clearTimeout(this.timer);
        });
        this.element.addEventListener("mouseleave", () => {
            this.hovering = false;
            this.hide();
        });
    }
    async openLinkedPost(e) {
        e.preventDefault();
        e.stopPropagation();
        await PostResolver.openOverlay(
            this.postId || this.link.element.dataset.postId,
            this.url,
        );
    }
    create() {
        if (!this.shouldStayOpen()) {
            return;
        }
        this.hide();
        this.element = document.createElement("div");
        this.element.className = "article-box";
        if (this.isVerticalImage) {
            this.element.classList.add("is-vertical");
        }
        this.element.setAttribute("role", "tooltip");
        const body = document.createElement("div");
        body.className = "article-box-body";
        const paragraph = document.createElement("p");
        paragraph.innerHTML = this.text;
        body.appendChild(paragraph);
        if (this.imageExist && this.image) {
            const media = document.createElement("button");
            media.type = "button";
            media.className = "article-box-media";
            media.setAttribute("aria-label", "Open article");
            media.addEventListener("click", (e) => this.openLinkedPost(e));
            const img = document.createElement("img");
            img.className = "article-box-media-img";
            img.src = this.image;
            img.alt = this.title || "";
            img.loading = "lazy";
            media.appendChild(img);
            if (this.isVerticalImage) {
                this.element.append(body, media);
            } else {
                this.element.append(media, body);
            }
        } else {
            this.element.appendChild(body);
        }
        document.body.appendChild(this.element);
        this.bindBoxHover();
        this.position();
        this.isOpen = true;
        this.bindViewportListeners();
        requestAnimationFrame(() => {
            if (this.element) {
                this.position();
                this.element.classList.add("is-visible");
            }
        });
    }
    delete() {
        this.startEditing();
        ArticlePreview.list.delete(this.link.element);
        this.hide();
    }
}

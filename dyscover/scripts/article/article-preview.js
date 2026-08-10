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
        if (this.showEvent) {
            this.link.element.removeEventListener("mouseenter", this.showEvent);
        }
        if (this.hideEvent) {
            this.link.element.removeEventListener("mouseleave", this.hideEvent);
        }
        if (this.clickEvent) {
            this.link.element.removeEventListener("click", this.clickEvent);
        }
        clearTimeout(this.timer);
        this.hovering = false;
        this.hide();
    }

    closeEditing() {
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
            if (!this.hovering) {
                return;
            }
            this.text = data.text;
            this.title = data.title;
            this.uuid = data.uuid || uuid;
            this.postId = String(data.id || this.link.element.dataset.postId || "");
            this.imageExist = data.status;
            this.image = data.url;
            if (data.articleUrl && !PostResolver.isUuid(PostResolver.parseUuidFromUrl(this.url))) {
                const hash = this.url.includes("#") ? this.url.slice(this.url.indexOf("#")) : "";
                this.url = data.articleUrl + hash;
                this.link.element.href = this.url;
            }
            if (this.imageExist && this.image) {
                await this.measureImage();
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
        this.element.remove();
        this.element = null;
        this.isOpen = false;
    }

    position() {
        const rect = this.link.element.getBoundingClientRect();
        const width = this.isVerticalImage ? Math.min(400, window.innerWidth - 24) : Math.min(330, window.innerWidth - 24);
        const height = this.element?.offsetHeight || 320;
        let x = rect.left + rect.width / 2 - width / 2;
        let y = rect.top + window.scrollY - height - 14;
        if (y < window.scrollY + 8) {
            y = rect.bottom + window.scrollY + 14;
        }
        x = Math.max(12, Math.min(x, window.innerWidth - width - 12));
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.width = `${width}px`;
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
        if (!this.hovering) {
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
        if (this.title) {
            paragraph.innerHTML = `<b>${this.escapeHtml(this.title)}</b> ${this.text}`;
        } else {
            paragraph.innerHTML = this.text;
        }
        body.appendChild(paragraph);

        if (this.imageExist && this.image) {
            const media = document.createElement("button");
            media.type = "button";
            media.className = "article-box-media";
            media.style.backgroundImage = `url('${this.image}')`;
            media.setAttribute("aria-label", "Open article");
            media.addEventListener("click", (e) => this.openLinkedPost(e));
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
        requestAnimationFrame(() => {
            if (this.element) {
                this.element.classList.add("is-visible");
                this.position();
            }
        });
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    delete() {
        this.startEditing();
        ArticlePreview.list.delete(this.link.element);
        this.hide();
    }
}

import { API } from "./api.js";
export class ArticlePreview {
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

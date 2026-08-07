import { Request, Icons } from "./nesh.js";
import { App } from "./app.js";
import { Api } from "./api.js";
import { Alert } from "./alert.js";
import { Mention } from "./mention.js";
import { Comments } from "./comments.js";
import { Share } from "./share.js";
export class Card {
    constructor(item = {}) {
        this.item = Card.normalize(item);
        this._loading = null;
        this._comments = new Comments(this);
        this._share = new Share(this);
    }
    static normalize(item = {}) {
        return App.enrichPost(item);
    }
    static supportsComments() {
        return true;
    }
    typeIcon(type) {
        const value = String(type || "article").toLowerCase();
        if (value === "article") return "globe";
        if (value === "image") return "image";
        if (value === "video") return "video";
        if (value === "audio") return "music";
        if (value === "document") return "file-text";
        if (value === "template") return "sparkles";
        return "image";
    }
    formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    }
    previewVisual() {
        const type = String(this.item?.type || "article");
        const src = this.mediaUrl(this.item?.preview || this.item?.media);
        if (type === "video" && src) {
            return `<video class="post-preview-video" src="${src}" muted playsinline preload="metadata"></video>`;
        }
        const hasImage =
            type === "article" ||
            type === "image" ||
            type === "template" ||
            /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(src || "");
        if (hasImage && src) {
            return `<img class="post-preview-image" src="${src}" alt="${this.item.title || ""}">`;
        }
        const icon =
            type === "audio"
                ? "music"
                : type === "document"
                  ? "file-text"
                  : "image";
        return `<span class="post-preview-placeholder"><i data-icon="${icon}"></i></span>`;
    }
    mediaTag() {
        return this.previewVisual();
    }
    async ensureData() {
        const hasMeta =
            !!this.item?.id &&
            !!this.item?.username &&
            (!!this.item?.media || !!this.item?.preview || this.item?.type === "template");
        if (hasMeta) {
            this.item = Card.normalize(this.item);
            return this.item;
        }
        if (!this.item?.id) throw new Error("Missing post id");
        if (!this._loading) {
            this._loading = Request.get(Api.post(this.item.id)).then((res) => {
                this.item = Card.normalize(Api.record(res) || {});
                if (!this.item.id) throw new Error("Post not found");
                return this.item;
            });
        }
        return this._loading;
    }
    mediaUrl(url) {
        const src = url || this.item?.preview || this.item?.media || "";
        const updated = this.item?.updated_at;
        if (!src) return "";
        return `${src}${updated ? `?t=${new Date(updated).getTime()}` : ""}`;
    }
    media() {
        return this.mediaUrl(this.item?.media);
    }
    tags() {
        const list = String(this.item?.tags || "").split(",").map((c) => c.trim()).filter(Boolean);
        return list.map((tag) => `<a class="post-tag" href="https://dyscover.ielectro.com/explore?term=${encodeURIComponent(tag)}">#${tag}</a>`,).join("");
    }
    mediaBlock() {
        const type = String(this.item?.type || "article");
        const url = this.media();
        if (type === "video") {
            return `<div class="post-media post-media-video"><video autoplay loop preload="metadata" src="${url}"></video></div>`;
        }
        if (type === "audio") {
            return `<div class="post-media post-media-audio"><audio controls preload="metadata" src="${url}"></audio></div>`;
        }
        if (type === "document") {
            return `<div class="post-media post-media-doc"><iframe src="${url}" title="${this.item?.title}"></iframe></div>`;
        }
        return `<div class="post-media post-media-image"><img src="${url}" alt="${this.item?.title}"></div>`;
    }
    buildBoxHtml() {
        const d = this.item;
        const type = String(d.type || "article").toLowerCase();
        const isArticle = type === "article";
        const avatar = `https://account.ielectro.com/u/${encodeURIComponent(d.username || "")}/avatar.png`;
        const profile = `https://dyscover.ielectro.com/users/${encodeURIComponent(d.username || "")}`;
        const articleUrl = d.url || "#";
        const likes = Number(d.likes) || 0;
        const comments = Number(d.comments) || 0;
        return `
      <article class="post-box post-box-horizontal">
        <div class="post-box-media">${this.mediaBlock()}</div>
        <div class="post-box-panel">
          <header class="post-header">
            <a class="post-avatar" href="${profile}"><img src="${avatar}" alt=""></a>
            <div class="post-header-meta">
              <a class="post-username" href="${profile}">${d.username || "unknown"}</a>
              <span class="post-title-link">${d.title || "unknown"}</span>
            </div>
          </header>
            <div class="post-scroll">
            <div class="post-caption">
              <span class="post-caption-text">${Mention.linkify(d.description || d.title || "")}</span>
            </div>
            <div class="post-tags">${this.tags()}</div>
            <div class="post-comments-inline"><div class="post-comments-list"></div></div>
          </div>
          <div class="post-panel-footer">
            <div class="post-actions">
              <div class="post-action-btn" data-action="like" aria-label="Like">
                <i data-icon="heart"></i>
              </div>
              ${isArticle ? `<a href="${articleUrl}" class="post-action-btn" data-action="visit" aria-label="Visit page"><i data-icon="globe"></i></a>` : ""}
              <div class="post-action-btn" data-action="share" aria-label="Share">
                <i data-icon="share-2"></i>
              </div>
              <div class="post-action-btn post-action-save" data-action="save" aria-label="Save">
                <i data-icon="bookmark"></i>
              </div>
            </div>
            <div class="post-likes-line"><strong>${likes}</strong> likes · <strong>${comments}</strong> comments</div>
            <div class="post-date">${this.formatDate(d.created_at)}</div>
            <div class="post-comment-compose post-comment-compose-inline">
              <input class="post-comment-input" placeholder="Add a comment…" maxlength="4000">
              <button type="button" class="post-comment-send-btn" aria-label="Send"><i data-icon="send"></i></button>
            </div>
          </div>
        </div>
      </article>`;
    }
    async create(mount) {
        await this.ensureData();
        if (!mount) return null;
        mount.innerHTML = this.buildBoxHtml();
        this.syncActionState(mount);
        this.bindActions(mount);
        await this._comments.bindInline(mount);
        await Icons.load(mount);
        this.recordView();
        return mount.querySelector(".post-box");
    }
    recordView() {
        if (!this.item?.id || this._viewRecorded) return;
        this._viewRecorded = true;
        Request.post(Api.postViews(this.item.id)).catch(() => {});
    }
    async preview(mount) {
        await this.ensureData();
        const d = this.item;
        const type = String(d.type || "article").toLowerCase();
        const avatar = `https://account.ielectro.com/u/${encodeURIComponent(d.username || "")}/avatar.png`;
        const profile = `https://dyscover.ielectro.com/users/${encodeURIComponent(d.username || "")}`;
        const panel = document.createElement("div");
        panel.className = "post-preview";
        panel.innerHTML = `
            ${this.previewVisual()}
            <div class="post-preview-header">
                <div class="post-preview-user">
                    <img class="post-preview-avatar" src="${avatar}" alt="">
                    <span class="post-preview-username">${d.username || "unknown"}</span>
                </div>
            </div>
            <div class="post-preview-type">
                <span class="post-preview-icon" title="${type}"><i data-icon="${this.typeIcon(type)}"></i></span>
                 <span class="post-preview-title">${d.title || ""}</span>
            </div>`;
        panel.addEventListener("click", (e) => {
            if (e.target.closest(".post-preview-user")) return;
            this.openOverlay();
        });
        mount?.appendChild(panel);
        await Icons.load(panel);
        return panel;
    }
    async openOverlay() {
        const overlay = document.createElement("div");
        overlay.className = "post-overlay";
        const panel = document.createElement("div");
        panel.className = "post-overlay-panel";
        const close = document.createElement("div");
        close.className = "post-overlay-close";
        close.setAttribute("aria-label", "Close");
        close.innerHTML = '<i data-icon="circle-x"></i>';
        const closeOverlay = () => {
            App.setScrollEnabled(true);
            overlay.remove();
        };
        close.addEventListener("click", closeOverlay);
        overlay.appendChild(close);
        overlay.appendChild(panel);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeOverlay();
        });
        document.body.appendChild(overlay);
        await Icons.load(overlay);
        App.setScrollEnabled(false);
        await this.create(panel);
    }
    syncActionState(root) {
        if (!root || !this.item) return;
        root.querySelector('[data-action="like"]')?.classList.toggle("is-active", !!this.item.liked);
        root.querySelector('[data-action="save"]')?.classList.toggle("is-active", !!this.item.bookmarked);
    }
    bindActions(root) {
        if (!root) return;
        root.querySelector('[data-action="like"]')?.addEventListener("click", () => this.likes(root));
        root.querySelector('[data-action="comment"]')?.addEventListener("click", () => {
            const input = root.querySelector(".post-comment-input");
            input?.focus();
            input?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        root.querySelector('[data-action="share"]')?.addEventListener("click", () => this._share.open());
        root.querySelector('[data-action="save"]')?.addEventListener("click", () => this.saved(root));
    }
    async likes(root) {
        await this.ensureData();
        try {
            const url = this.item.liked
                ? Api.postLikes(this.item.id)
                : Api.postLikes(this.item.id);
            const res = this.item.liked
                ? await Request.delete(url)
                : await Request.post(url);
            this.item.liked = !this.item.liked;
            this.item.likes =
                Number(Api.record(res)?.likes ?? this.item.likes + (this.item.liked ? 1 : -1)) || 0;
            root?.querySelector('[data-action="like"]')?.classList.toggle("is-active", this.item.liked);
            const line = root?.querySelector(".post-likes-line");
            if (line) {
                line.innerHTML = `<strong>${this.item.likes}</strong> likes · <strong>${Number(this.item.comments) || 0}</strong> comments`;
            }
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Like failed");
        }
    }
    async comments() {
        await this.ensureData();
        await this._comments.openBox();
    }
    async saved(root) {
        await this.ensureData();
        try {
            const url = Api.postBookmarks(this.item.id);
            if (this.item.bookmarked) {
                await Request.delete(url);
                this.item.bookmarked = false;
            } else {
                await Request.post(url);
                this.item.bookmarked = true;
            }
            this.item.saved = this.item.bookmarked;
            root?.querySelector('[data-action="save"]')?.classList.toggle("is-active", this.item.bookmarked);
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Save failed");
        }
    }
}

import { Request, Icons } from "./nesh.js";
import { App } from "./app.js";
import { Api } from "./api.js";
import { Alert } from "./alert.js";
import { Mention } from "./mention.js";
import { Comments } from "./comments.js";
import { Share } from "./share.js";
import { Report } from "./report.js";
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
    engagementCount(value) {
        return String(Number(value) || 0);
    }
    viewsLineHtml(item = this.item) {
        const views = Number(item?.views) || 0;
        return `<strong>${views}</strong> views`;
    }
    updateEngagementUi(root) {
        if (!root || !this.item) return;
        root.querySelectorAll("[data-stat]").forEach((el) => {
            const stat = el.dataset.stat;
            if (!stat) return;
            el.textContent = this.engagementCount(this.item[stat]);
        });
        const viewsLine = root.querySelector(".post-views-line");
        if (viewsLine) {
            viewsLine.innerHTML = this.viewsLineHtml();
        }
    }
    previewImageUrl() {
        const type = String(this.item?.type || "article");
        const preview = this.item?.preview_image || this.item?.preview || "";
        if (preview && !/\.html(\?|$)/i.test(preview)) {
            return this.mediaUrl(preview);
        }
        if (type === "video") {
            const media = this.mediaUrl(this.item?.media);
            if (media && !/\.html(\?|$)/i.test(media)) return media;
        }
        return App.defaultPostPreview();
    }
    avatarUrl(item = this.item) {
        return App.userAvatarUrl(item?.user_id, item?.username, item?.avatar);
    }
    previewVisual() {
        const type = String(this.item?.type || "article");
        const src = this.previewImageUrl();
        if (type === "video" && this.item?.media) {
            const videoSrc = this.mediaUrl(this.item.media);
            if (videoSrc && !/\.html(\?|$)/i.test(videoSrc)) {
                return `<video class="post-preview-video" src="${videoSrc}" muted playsinline preload="metadata" loading="lazy"></video>`;
            }
        }
        if (src) {
            return `<img class="post-preview-image" src="${src}" alt="${this.item.title || ""}" loading="lazy">`;
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
        const raw = this.item?.tags;
        const list = Array.isArray(raw)
            ? raw
            : String(raw || "")
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean);
        return list
            .map(
                (tag) =>
                    `<a class="post-tag" href="https://dyscover.ielectro.com/explore?term=${encodeURIComponent(tag)}">#${tag}</a>`,
            )
            .join("");
    }
    overlayMediaVisual() {
        const type = String(this.item?.type || "article").toLowerCase();
        const src = this.previewImageUrl();
        if (src) {
            return `<img class="post-preview-image" src="${src}" alt="${this.item?.title || ""}" loading="lazy">`;
        }
        const icon =
            type === "article"
                ? "globe"
                : type === "audio"
                  ? "music"
                  : type === "document"
                    ? "file-text"
                    : "image";
        const label =
            type === "article" ? this.item?.title || "Article" : this.item?.title || "";
        return `<span class="post-preview-placeholder post-preview-placeholder--overlay"><i data-icon="${icon}"></i>${label ? `<span class="post-preview-placeholder-label">${label}</span>` : ""}</span>`;
    }
    mediaBlock() {
        const type = String(this.item?.type || "article");
        if (type === "video") {
            const url = this.media();
            return `<div class="post-media post-media-video"><video controls autoplay loop muted playsinline preload="metadata" src="${url}"></video></div>`;
        }
        if (type === "audio") {
            return `<div class="post-media post-media-audio"><audio controls preload="metadata" src="${this.media()}"></audio></div>`;
        }
        if (type === "document") {
            return `<div class="post-media post-media-doc"><iframe src="${this.media()}" title="${this.item?.title}" loading="lazy"></iframe></div>`;
        }
        if (type === "image") {
            const url = this.media();
            if (url && !/\.html(\?|$)/i.test(url)) {
                return `<div class="post-media post-media-image"><img class="post-preview-image" src="${url}" alt="${this.item?.title || ""}" loading="lazy"></div>`;
            }
        }
        const visual = this.overlayMediaVisual();
        const articleClass = type === "article" ? " post-media-article" : "";
        return `<div class="post-media post-media-image${articleClass}">${visual}</div>`;
    }
    buildBoxHtml() {
        const d = this.item;
        const type = String(d.type || "article").toLowerCase();
        const isArticle = type === "article";
        const avatar = this.avatarUrl(d);
        const profile = `https://dyscover.ielectro.com/users/${encodeURIComponent(d.username || "")}`;
        const articleUrl = d.url || "#";
        const likes = Number(d.likes) || 0;
        const comments = Number(d.comments) || 0;
        const shares = Number(d.shares) || 0;
        const bookmarks = Number(d.bookmarks) || 0;
        const allowComments = d.allow_comments !== false;
        return `
      <article class="post-box post-box-horizontal">
        <div class="post-box-media">${this.mediaBlock()}</div>
        <div class="post-box-panel">
          <header class="post-header">
            <a class="post-avatar" href="${profile}"><img src="${avatar}" alt="" loading="lazy"></a>
            <div class="post-header-meta">
              <a class="post-username" href="${profile}">${d.username || "unknown"}</a>
              <span class="post-title-link">${d.title || "unknown"}</span>
            </div>
            <button type="button" class="post-report-btn" data-action="report" aria-label="Report"><i data-icon="flag"></i></button>
          </header>
            <div class="post-scroll">
            <div class="post-caption">
              <span class="post-caption-text">${Mention.linkify(d.description || d.title || "")}</span>
            </div>
            <div class="post-tags">${this.tags()}</div>
            ${allowComments ? '<div class="post-comments-inline"><div class="post-comments-list"></div></div>' : ""}
          </div>
          <div class="post-panel-footer${allowComments ? "" : " post-panel-footer--no-comments"}">
            <div class="post-actions">
              <div class="post-action-btn post-action-with-count post-action-like" data-action="like" aria-label="Like">
                <i data-icon="heart"></i>
                <span class="post-action-count" data-stat="likes">${likes}</span>
              </div>
              ${allowComments ? `<div class="post-action-btn post-action-with-count" data-action="comment" aria-label="Comment">
                <i data-icon="message-circle"></i>
                <span class="post-action-count" data-stat="comments">${comments}</span>
              </div>` : ""}
              ${isArticle ? `<a href="${articleUrl}" class="post-action-btn" data-action="visit" aria-label="Visit page"><i data-icon="globe"></i></a>` : ""}
              <div class="post-action-btn post-action-with-count post-action-repost" data-action="repost" aria-label="Repost">
                <i data-icon="repeat"></i>
                <span class="post-action-count" data-stat="shares">${shares}</span>
              </div>
              <div class="post-action-btn post-action-with-count" data-action="share" aria-label="Share">
                <i data-icon="share-2"></i>
                <span class="post-action-count" data-stat="shares">${shares}</span>
              </div>
              <div class="post-action-btn post-action-with-count post-action-save" data-action="save" aria-label="Save">
                <i data-icon="bookmark"></i>
                <span class="post-action-count" data-stat="bookmarks">${bookmarks}</span>
              </div>
            </div>
            <div class="post-meta-line">
              <span class="post-date">${this.formatDate(d.created_at)}</span>
              <span class="post-views-line">${this.viewsLineHtml(d)}</span>
            </div>
            ${allowComments ? `<div class="post-comment-compose post-comment-compose-inline">
              <input class="post-comment-input" placeholder="Add a comment…" maxlength="4000">
              <button type="button" class="post-comment-send-btn" aria-label="Send"><i data-icon="send"></i></button>
            </div>` : ""}
          </div>
        </div>
      </article>`;
    }
    async create(mount) {
        await this.ensureData();
        if (!mount) return null;
        mount.innerHTML = this.buildBoxHtml();
        this._mount = mount;
        this.syncActionState(mount);
        this.bindActions(mount);
        if (this.item.allow_comments !== false) {
            await this._comments.bindInline(mount);
        }
        await Icons.load(mount);
        mount.querySelectorAll(".post-avatar img, .post-preview-avatar").forEach(
            (img) => App.wireAvatarImg(img),
        );
        this.recordView();
        return mount.querySelector(".post-box");
    }
    recordShare(root = this._mount) {
        this.item.shares = (Number(this.item.shares) || 0) + 1;
        this.updateEngagementUi(root);
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
        const avatar = this.avatarUrl(d);
        const profile = `https://dyscover.ielectro.com/users/${encodeURIComponent(d.username || "")}`;
        const panel = document.createElement("div");
        panel.className = "post-preview";
        const title = App.escapeHtml(d.title || "");
        const titleAttr = App.escapeAttr(d.title || "");
        panel.innerHTML = `
            ${this.previewVisual()}
            <div class="post-preview-header">
                <div class="post-preview-user">
                    <img class="post-preview-avatar" src="${avatar}" alt="" loading="lazy">
                    <span class="post-preview-username">${d.username || "unknown"}</span>
                </div>
            </div>
            <div class="post-preview-type">
                <span class="post-preview-icon" title="${type}"><i data-icon="${this.typeIcon(type)}"></i></span>
                 <span class="post-preview-title" title="${titleAttr}">${title}</span>
            </div>`;
        panel.addEventListener("click", (e) => {
            if (e.target.closest(".post-preview-user")) return;
            this.openOverlay();
        });
        mount?.appendChild(panel);
        await Icons.load(panel);
        panel.querySelector(".post-preview-avatar") &&
            App.wireAvatarImg(panel.querySelector(".post-preview-avatar"));
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
        root.querySelector('[data-action="repost"]')?.classList.toggle("is-active", !!this.item.reposted);
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
        root.querySelector('[data-action="repost"]')?.addEventListener("click", () => this.repost(root));
        root.querySelector('[data-action="save"]')?.addEventListener("click", () => this.saved(root));
        root.querySelector('[data-action="report"]')?.addEventListener("click", () => {
            if (this.item?.id) Report.openPost(this.item.id);
        });
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
            this.updateEngagementUi(root);
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Like failed");
        }
    }
    async comments() {
        await this.ensureData();
        await this._comments.openBox();
    }
    async repost(root) {
        await this.ensureData();
        try {
            const url = Api.postReposts(this.item.id);
            if (this.item.reposted) {
                await Request.delete(url);
                this.item.reposted = false;
                this.item.shares = Math.max(
                    0,
                    (Number(this.item.shares) || 0) - 1,
                );
            } else {
                await Request.post(url);
                this.item.reposted = true;
                this.item.shares = (Number(this.item.shares) || 0) + 1;
            }
            root
                ?.querySelector('[data-action="repost"]')
                ?.classList.toggle("is-active", this.item.reposted);
            this.updateEngagementUi(root);
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Repost failed");
        }
    }
    async saved(root) {
        await this.ensureData();
        try {
            const url = Api.postBookmarks(this.item.id);
            if (this.item.bookmarked) {
                await Request.delete(url);
                this.item.bookmarked = false;
                this.item.bookmarks = Math.max(
                    0,
                    (Number(this.item.bookmarks) || 0) - 1,
                );
            } else {
                await Request.post(url);
                this.item.bookmarked = true;
                this.item.bookmarks = (Number(this.item.bookmarks) || 0) + 1;
            }
            this.item.saved = this.item.bookmarked;
            root?.querySelector('[data-action="save"]')?.classList.toggle("is-active", this.item.bookmarked);
            this.updateEngagementUi(root);
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Save failed");
        }
    }
}

export const DYSCOVER_POST_PREFIX = "@@DYSCOVER_POST@@";

export function encodePostMessage(item = {}) {
    const payload = {
        file: item.file,
        type: item.type || "article",
        title: item.title || "",
        preview: item.preview || item.preview_image || item.media || "",
        username: item.username || "",
        tags: item.tags || "",
    };
    return DYSCOVER_POST_PREFIX + JSON.stringify(payload);
}

export function decodePostMessage(body) {
    const raw = String(body || "");
    if (!raw.startsWith(DYSCOVER_POST_PREFIX)) return null;
    try {
        return JSON.parse(raw.slice(DYSCOVER_POST_PREFIX.length));
    } catch {
        return null;
    }
}

export function postTypeLabel(type) {
    const value = String(type || "post").toLowerCase();
    if (value === "article") return "article";
    if (value === "image") return "image";
    if (value === "video") return "video";
    if (value === "audio") return "audio";
    if (value === "document") return "document";
    if (value === "template") return "template";
    if (value === "biography") return "biography";
    return "post";
}

export function resolveNotificationType(item = {}) {
    if (item.type === "follow" && item.body === "unfollow") return "unfollow";
    return item.type || "default";
}

export function notificationArticle(item = {}) {
    if (item.post?.title) return item.post.title;
    if (item.type === "mention" && !item.post_id && !item.post) {
        return item.body || "biography";
    }
    return item.body || "";
}

export function notificationPostType(item = {}) {
    if (item.post?.type) return postTypeLabel(item.post.type);
    if (item.type === "mention" && !item.post_id && !item.post) return "biography";
    return postTypeLabel(item.post?.type || "post");
}
export class Mention {
    static pattern = /@([a-zA-Z0-9_]{2,32})/g;
    static escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    static linkify(text) {
        const escaped = this.escapeHtml(text || "");
        return escaped.replace(
            /@([a-zA-Z0-9_]{2,32})/g,
            (_, user) =>
                `<a class="mention-link" href="https://dyscover.ielectro.com/u/${encodeURIComponent(user)}">@${user}</a>`,
        );
    }
    static renderInto(element, text, empty = "") {
        if (!element) return;
        const value = String(text || "").trim();
        if (!value) {
            element.textContent = empty;
            return;
        }
        element.innerHTML = this.linkify(value);
    }
}
export class Overlay {
    constructor(title = "") {
        this.title = title;
        this.root = null;
        this.panel = null;
    }
    async open() {
        this.root = document.createElement("div");
        this.root.className = "dysc-overlay";
        this.root.innerHTML = `
            <div class="dysc-overlay-panel" role="dialog" aria-modal="true">
                <header class="dysc-overlay-header">
                    <h2 class="dysc-overlay-title">${this.title}</h2>
                    <button type="button" class="dysc-overlay-close" aria-label="Close"><i data-icon="circle-x"></i></button>
                </header>
                <div class="dysc-overlay-body"></div>
            </div>`;
        document.body.appendChild(this.root);
        App.setScrollEnabled(false);
        this.panel = this.root.querySelector(".dysc-overlay-body");
        this.root.querySelector(".dysc-overlay-close")?.addEventListener("click", () => this.close());
        this.root.addEventListener("click", (e) => {
            if (e.target === this.root) this.close();
        });
        requestAnimationFrame(() => this.root.classList.add("is-open"));
        await Icons.load(this.root);
        return this.panel;
    }
    body(callback) {
        if (this.panel) callback(this.panel);
    }
    close() {
        if (!this.root) return;
        this.root.classList.remove("is-open");
        this.root.addEventListener(
            "transitionend",
            () => {
                this.root?.remove();
                this.root = null;
                this.panel = null;
                App.setScrollEnabled(true);
            },
            { once: true },
        );
    }
}
export class UsersList {
    static active = null;
    constructor(options = {}) {
        this.title = options.title || "Select user";
        this.onSelect = options.onSelect || (() => { });
        this.actionLabel = options.actionLabel || null;
        this.onAction = options.onAction || null;
        this.loadUsers = options.loadUsers || null;
        this.searchable = options.searchable !== false;
        this.hint = options.hint || "";
        this.overlay = null;
        this.listEl = null;
        this.searchEl = null;
    }
    async open() {
        UsersList.active?.close();
        this.overlay = new Overlay(this.title);
        await this.overlay.open();
        UsersList.active = this;
        const body = this.overlay.panel;
        body.innerHTML = `
            ${this.hint ? `<p class="users-list-hint">${this.hint}</p>` : ""}
            ${this.searchable ? `<input type="search" class="users-list-search" placeholder="Search username…" autocomplete="off">` : ""}
            <ul class="users-list-items"></ul>`;
        this.listEl = body.querySelector(".users-list-items");
        this.searchEl = body.querySelector(".users-list-search");
        if (this.searchEl) {
            let debounce = null;
            this.searchEl.addEventListener("input", () => {
                clearTimeout(debounce);
                debounce = setTimeout(
                    () => this.refresh(this.searchEl.value.trim()),
                    280,
                );
            });
            this.searchEl.focus();
        }
        await this.refresh("");
        return this;
    }
    async refresh(term) {
        if (!this.listEl) return;
        this.listEl.innerHTML = `<li class="users-list-empty">Loading…</li>`;
        let users = [];
        try {
            if (this.loadUsers) {
                users = await this.loadUsers(term);
            }
        } catch {
            users = [];
        }
        users = (Array.isArray(users) ? users : []).filter((u) => u?.username);
        if (!users.length) {
            this.listEl.innerHTML = `<li class="users-list-empty">${term ? "No users found." : "No users yet."}</li>`;
            return;
        }
        this.listEl.innerHTML = "";
        users.forEach((user) => {
            const li = document.createElement("li");
            li.className = "users-list-item";
            li.dataset.username = user.username;
            const avatar =
                user.avatar ||
                `https://account.ielectro.com/u/${encodeURIComponent(user.username)}/avatar.png`;
            li.innerHTML = `
                <button type="button" class="users-list-link">
                    <img class="users-list-avatar" src="${avatar}" alt="">
                    <span class="users-list-name">${user.username}</span>
                </button>
                ${this.actionLabel ? `<button type="button" class="users-list-action">${this.actionLabel}</button>` : ""}`;
            li.querySelector(".users-list-link")?.addEventListener("click", () => {
                this.onSelect(user);
            });
            li.querySelector(".users-list-action")?.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.onAction) {
                    this.onAction(user, li);
                } else {
                    this.onSelect(user);
                }
            });
            this.listEl.appendChild(li);
        });
    }
    close() {
        this.overlay?.close();
        this.overlay = null;
        if (UsersList.active === this) UsersList.active = null;
    }
}
export class NotificationPopup {
    static stack = null;
    static templates = null;
    static lastActivityId = 0;
    static lastChatMsgId = 0;
    static started = false;
    static bootstrapped = false;
    static async start() {
        if (this.started) return;
        this.started = true;
        this.ensureStack();
        try {
            this.templates = await Request.get(
                "https://dyscover.ielectro.com/data/activity-messages.json",
            );
        } catch {
            this.templates = {};
        }
        await this.bootstrap();
    }
    static ensureStack() {
        if (this.stack) return;
        this.stack = document.createElement("div");
        this.stack.className = "notify-popup-stack";
        const mount = document.querySelector("main") || document.body;
        mount.appendChild(this.stack);
    }
    static async bootstrap() {
        try {
            const res = await Request.get(App.api("activity/since"), { bootstrap: 1 });
            this.lastActivityId = Number(res.data?.max_id) || 0;
        } catch {
            this.lastActivityId = 0;
        }
        try {
            const res = await Request.get(App.api("chat/incoming"), { bootstrap: 1 });
            this.lastChatMsgId = Number(res.data?.max_id) || 0;
        } catch {
            this.lastChatMsgId = 0;
        }
        this.bootstrapped = true;
    }
    static template(key, vars = {}) {
        let text = this.templates?.[key] || this.templates?.default || "New notification";
        Object.entries(vars).forEach(([k, v]) => {
            text = text.replaceAll(`{${k}}`, String(v ?? ""));
        });
        return text;
    }
    static async poll() {
        if (!this.bootstrapped) await this.bootstrap();
        try {
            const res = await Request.get(App.api("activity/since"), {
                after_id: this.lastActivityId,
            });
            const items = Array.isArray(res.data) ? res.data : [];
            items.forEach((item) => {
                this.lastActivityId = Math.max(this.lastActivityId, Number(item.id) || 0);
                this.showActivity(item);
            });
        } catch { }
        try {
            const res = await Request.get(App.api("chat/incoming"), {
                after_id: this.lastChatMsgId,
            });
            const items = Array.isArray(res.data) ? res.data : [];
            items.forEach((item) => {
                this.lastChatMsgId = Math.max(this.lastChatMsgId, Number(item.id) || 0);
                this.showChat(item);
            });
        } catch { }
    }
    static showActivity(item) {
        const user = item.actor_username || "Someone";
        const type = resolveNotificationType(item);
        const message = this.template(type, {
            user,
            article: notificationArticle(item),
            post_type: notificationPostType(item),
            message: item.body || "",
            details: item.body || "",
        });
        this.show({
            username: user,
            avatar:
                item.actor_avatar ||
                `https://account.ielectro.com/u/${encodeURIComponent(user)}/avatar.png`,
            message,
            href: "https://dyscover.ielectro.com/activity",
        });
    }
    static showChat(item) {
        const user = item.sender || "Someone";
        const post = decodePostMessage(item.body);
        let message;
        if (post) {
            const postType = String(post.type || "post").toLowerCase();
            message = this.template("chat_post", {
                user,
                post_type: postType === "article" ? "article" : postType,
                post_author: post.username || "unknown",
            });
        } else {
            message = this.template("chat_message", {
                user,
                message: Mention.linkify(String(item.body || "").trim()),
            });
        }
        this.show({
            username: user,
            avatar:
                item.sender_avatar ||
                `https://account.ielectro.com/u/${encodeURIComponent(user)}/avatar.png`,
            message,
            href: "https://dyscover.ielectro.com/inbox",
        });
    }
    static show({ username, avatar, message, href }) {
        this.ensureStack();
        const el = document.createElement("a");
        el.className = "notify-popup";
        el.href = href || "#";
        if (!href) {
            el.addEventListener("click", (e) => e.preventDefault());
        }
        el.innerHTML = `
            <img class="notify-popup-avatar" src="${avatar}" alt="">
            <div class="notify-popup-body">
                <strong class="notify-popup-user">${username}</strong>
                <p class="notify-popup-msg">${message}</p>
            </div>`;
        this.stack.appendChild(el);
        window.setTimeout(() => {
            el.classList.add("is-leaving");
            window.setTimeout(() => el.remove(), 320);
        }, 5000);
    }
}
export class Comments {
    constructor(card) {
        this.card = card;
    }
    get item() {
        return this.card.item;
    }
    formatCommentDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "now";
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
        });
    }
    commentHtml(c) {
        return `<div class="post-comment">
            <a href="https://dyscover.ielectro.com/u/${c.username}">
                <img class="post-comment-avatar" src="${c.avatar}" alt="${c.username}">
            </a>
            <div class="post-comment-body">
                <p class="post-comment-line">
                    <a href="https://dyscover.ielectro.com/u/${c.username}">
                        <b>${c.username}</b>
                    </a>
                    ${Mention.linkify(c.body)}
                </p>
                <time class="post-comment-date">${this.formatCommentDate(c.created_at)}</time>
            </div>
        </div>`;
    }
    async fetchRows() {
        const res = await Request.get(App.api("post/list-comment"), {
            file: this.item.file,
        });
        return Array.isArray(res.data) ? res.data : [];
    }
    async renderInline(root) {
        const list = root?.querySelector(".post-comments-list");
        if (!list) return;
        try {
            const rows = await this.fetchRows();
            list.innerHTML = rows.length
                ? rows.map((c) => this.commentHtml(c)).join("")
                : "";
        } catch {
            list.innerHTML = "";
        }
    }
    async bindInline(root) {
        const list = root?.querySelector(".post-comments-list");
        const compose = root?.querySelector(".post-comment-compose-inline");
        const input = root?.querySelector(".post-comment-input");
        const sendBtn = root?.querySelector(".post-comment-send-btn");
        if (!list || !compose || !input) return;
        await this.renderInline(root);
        const submit = async () => {
            const text = input.value.trim();
            if (!text) return;
            try {
                await Request.post(App.api("post/comment"), {
                    file: this.item.file,
                    body: text,
                });
                input.value = "";
                await this.renderInline(root);
                this.item.comments = (Number(this.item.comments) || 0) + 1;
                const line = root.querySelector(".post-likes-line");
                if (line) {
                    line.innerHTML = `<strong>${Number(this.item.likes) || 0}</strong> likes · <strong>${this.item.comments}</strong> comments`;
                }
            } catch (err) {
                Alert.error(typeof err === "object" && err?.text ? err.text : "Comment failed");
            }
        };
        sendBtn?.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                submit();
            }
        });
    }
    async openBox() {
        const overlay = new Overlay("Comments");
        await overlay.open();
        overlay.body(async (body) => {
            body.innerHTML = `
                <div class="comments-overlay-list post-comments-list">Loading…</div>
                <div class="post-comment-compose">
                    <input type="text" class="post-comment-input" placeholder="Add a comment…" maxlength="4000">
                    <button type="button" class="post-comment-send-btn" aria-label="Send"><i data-icon="send"></i></button>
                </div>`;
            const list = body.querySelector(".post-comments-list");
            const input = body.querySelector(".post-comment-input");
            const sendBtn = body.querySelector(".post-comment-send-btn");
            const renderList = async () => {
                try {
                    const rows = await this.fetchRows();
                    list.innerHTML = rows.length
                        ? rows.map((c) => this.commentHtml(c)).join("")
                        : "";
                } catch {
                    list.innerHTML = "";
                }
            };
            await renderList();
            await Icons.load(body);
            const submit = async () => {
                const text = input?.value.trim();
                if (!text) return;
                try {
                    await Request.post(App.api("post/comment"), {
                        file: this.item.file,
                        body: text,
                    });
                    input.value = "";
                    await renderList();
                    this.item.comments = (Number(this.item.comments) || 0) + 1;
                } catch (err) {
                    Alert.error(typeof err === "object" && err?.text ? err.text : "Comment failed");
                }
            };
            sendBtn?.addEventListener("click", submit);
            input?.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                }
            });
        });
    }
}
export class Share {
    constructor(card) {
        this.card = card;
    }
    get item() {
        return this.card.item;
    }
    isArticle() {
        return String(this.item?.type || "").toLowerCase() === "article";
    }
    shareLink() {
        if (this.isArticle()) {
            return this.item.url || "";
        }
        return "";
    }
    async open() {
        await this.card.ensureData();
        const canCopy = this.isArticle() && !!this.shareLink();
        const overlay = new Overlay("Share");
        await overlay.open();
        overlay.body((body) => {
            body.innerHTML = `
                <div class="share-options">
                    ${canCopy ? `<button type="button" class="share-option" data-action="copy"><i data-icon="link"></i> Copy link</button>` : ""}
                    <button type="button" class="share-option" data-action="inbox"><i data-icon="send"></i> Send to inbox</button>
                </div>`;
            body.querySelector('[data-action="copy"]')?.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(this.shareLink());
                    Request.post(App.api("article/share"), {
                        file: this.item.file,
                    }).catch(() => { });
                    overlay.close();
                } catch {
                    Alert.error("Could not copy link");
                }
            });
            body.querySelector('[data-action="inbox"]')?.addEventListener("click", () => {
                overlay.close();
                this.openInboxPicker();
            });
            Icons.load(body);
        });
    }
    async openInboxPicker() {
        const me = await Auth.username();
        const list = new UsersList({
            title: "Send to inbox",
            hint: "Pick someone to share this post with.",
            onSelect: (user) => this.sendTo(user.username),
            loadUsers: async (term) => {
                if (term) {
                    const res = await Request.get(App.api("user/search"), { term });
                    return (Array.isArray(res?.data) ? res.data : []).filter(
                        (u) => u.username && u.username !== me,
                    );
                }
                const res = await Request.get(App.api("chat/suggestions"));
                return Array.isArray(res.data?.followings) ? res.data.followings : [];
            },
        });
        await list.open();
    }
    async sendTo(username) {
        if (!username) return;
        try {
            const threadRes = await Request.post(App.api("chat/create-thread"), {
                participant: username,
            });
            const threadId = Number(threadRes.data?.id);
            if (!threadId) throw new Error("Missing thread");
            await Request.post(App.api("chat/send"), {
                thread_id: threadId,
                message: encodePostMessage(this.item),
            });
            UsersList.active?.close();
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Send failed");
        }
    }
}
export class Card {
    constructor(item = {}) {
        this.item = Card.normalize(item);
        this._loading = null;
        this._comments = new Comments(this);
        this._share = new Share(this);
    }
    static normalize(item = {}) {
        if (!item || typeof item !== "object") return {};
        const preview =
            item.preview ||
            item.preview_image ||
            item.image ||
            item.media ||
            "";
        return {
            ...item,
            preview,
            media: item.media || item.image || preview,
        };
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
        const hasPreview = !!(this.item?.media || this.item?.preview || this.item?.url);
        const hasMeta =
            !!this.item?.username &&
            Object.prototype.hasOwnProperty.call(this.item, "tags");
        if (this.item?.file && hasPreview && hasMeta) {
            return this.item;
        }
        if (!this.item?.file) throw new Error("Missing file");
        if (!this._loading) {
            this._loading = Request.get(App.api("post/data"), {
                file: this.item.file,
            }).then((res) => {
                this.item = Card.normalize(res?.data || {});
                if (!this.item.file) throw new Error("Post not found");
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
        const profile = `https://dyscover.ielectro.com/u/${encodeURIComponent(d.username || "")}`;
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
        return mount.querySelector(".post-box");
    }
    async preview(mount) {
        await this.ensureData();
        const d = this.item;
        const type = String(d.type || "article").toLowerCase();
        const avatar = `https://account.ielectro.com/u/${encodeURIComponent(d.username || "")}/avatar.png`;
        const profile = `https://dyscover.ielectro.com/u/${encodeURIComponent(d.username || "")}`;
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
        root.querySelector('[data-action="save"]')?.classList.toggle("is-active", !!this.item.saved);
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
            const res = await Request.post(App.api("post/like"), {
                file: this.item.file,
            });
            this.item.liked = !!res.data?.liked;
            this.item.likes = Number(res.data?.likes) || 0;
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
            const res = await Request.post(App.api("post/saved"), {
                file: this.item.file,
            });
            this.item.saved = !!res.data?.saved;
            root?.querySelector('[data-action="save"]')?.classList.toggle("is-active", this.item.saved);
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Save failed");
        }
    }
}

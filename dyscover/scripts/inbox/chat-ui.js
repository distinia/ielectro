import { Api } from "../core/api.js";
import { App, Alert, EmptyState, Icons, Auth, Card, Request, Navbar, Mention, UsersList, Spinner } from "../core/index.js";
import { decodePostMessage } from "../core/post-message.js";
export class ChatUI {
    constructor() {
        this.root = document.body;
        this.selectedThreadId = null;
        this.peerUsername = null;
        this.peerAvatar = null;
        this.lastThreads = [];
        this.lastMessageIds = "";
        this.conversationsList = this.root?.querySelector(".conversations-list");
        this.chatHeader = this.root?.querySelector(".chat-header");
        this.chatMessages = this.root?.querySelector(".chat-messages");
        this.composer = this.root?.querySelector(".chat-area-composer");
        this.inboxShell = this.root?.querySelector(".inbox-shell");
        this.backBtn = this.root?.querySelector(".chat-back-btn");
        this.conversationsSearch = this.root?.querySelector(".conversations-search");
        this.messageInput = this.root?.querySelector(".message-input");
        this.sendMessageBtn = this.root?.querySelector(".send-message-btn");
        this.newConversationBtn = this.root?.querySelector(".new-conversation-btn");
        this.attachBtn = this.root?.querySelector(".attach-chat-btn");
        this.attachInput = this.root?.querySelector(".attach-chat-input");
        this.selfUsername = null;
        this.searchTimer = null;
        this.userPicker = null;
        this.pollThreads = null;
        this.pollMessages = null;
        this.pendingAttachment = null;
        this.replyTo = null;
        this._threadsListSig = "";
        this._allThreads = [];
    }
    setChatOpen(open) {
        this.inboxShell?.classList.toggle("chat-open", open);
    }
    setComposerVisible(on) {
        this.composer?.classList.toggle("is-chat-composer-hidden", !on);
    }
    resetEmptyChatShell() {
        if (this.chatHeader) this.chatHeader.innerHTML = "";
        if (this.chatMessages) {
            this.chatMessages.innerHTML =
                '<p class="chat-placeholder">Select a conversation or tap <strong>New</strong> to start messaging.</p>';
        }
        this.setComposerVisible(false);
        this.setChatOpen(false);
    }
    async init() {
        this.selfUsername = await Auth.username();
        this.resetEmptyChatShell();
        this.bindEvents();
        if (this.conversationsList) {
            Spinner.mount(this.conversationsList, true);
        }
        await this.loadThreads();
        await Icons.load(document.body);
        this.startPolling();
    }
    startPolling() {
        this.pollThreads = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            this.loadThreads({ silent: true });
        }, 12000);
        this.pollMessages = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            if (this.selectedThreadId) {
                this.loadMessages({ silent: true });
            }
        }, 4500);
    }
    bindEvents() {
        this.newConversationBtn?.addEventListener("click", () =>
            this.openNewChatBox(),
        );
        this.sendMessageBtn?.addEventListener("click", () =>
            this.handleSendMessage(),
        );
        this.messageInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        this.attachBtn?.addEventListener("click", () => this.attachInput?.click());
        this.attachInput?.addEventListener("change", () =>
            this.handleAttachSelected(),
        );
        this.backBtn?.addEventListener("click", () => {
            this.selectedThreadId = null;
            this.peerUsername = null;
            this.resetEmptyChatShell();
        });
        this.conversationsSearch?.addEventListener("input", () => {
            this.renderConversations(this._allThreads, this.conversationsSearch.value);
        });
    }
    suggestUsername(entry) {
        if (!entry) return "";
        if (typeof entry === "string") return entry;
        return String(entry.username || "");
    }
    suggestAvatar(entry) {
        const u = this.suggestUsername(entry);
        const ex =
            entry && typeof entry === "object" && entry.avatar
                ? String(entry.avatar)
                : null;
        return App.peerAvatarUrl(u, ex);
    }
    async openNewChatBox() {
        this.closeNewChatBoxIfOpen();
        this.userPicker = new UsersList({
            title: "New message",
            hint: "People you follow",
            onSelect: (user) => this.pickPeer(user),
            loadUsers: async (term) => {
                if (term) {
                    const res = await Request.get(Api.exploreSearchAll(term));
                    const payload = Api.record(res) || {};
                    return (Array.isArray(payload.users) ? payload.users : []).filter(
                        (u) => u.username && u.username !== this.selfUsername,
                    );
                }
                const selfId = await App.resolveSelfUserId();
                if (!selfId) return [];
                const res = await Request.get(Api.userFollowing(selfId));
                return Api.list(res);
            },
        });
        await this.userPicker.open();
    }
    closeNewChatBoxIfOpen() {
        if (this.userPicker) {
            this.userPicker.close();
            this.userPicker = null;
        }
    }
    async ensureThread(participant) {
        const participantId = await App.resolveUserId(participant);
        if (!participantId) throw new Error("User not found");
        const res = await Request.post(Api.inbox, {
            participant_id: participantId,
        });
        const id = Api.record(res)?.id;
        if (!id) {
            throw new Error("Missing thread id");
        }
        this.selectedThreadId = id;
        return id;
    }
    async pickPeer(userOrName) {
        const username =
            typeof userOrName === "string"
                ? userOrName
                : userOrName?.username || "";
        const pickedAvatar =
            typeof userOrName === "object" ? userOrName?.avatar || null : null;
        if (!username || username === this.selfUsername) return;
        this.closeNewChatBoxIfOpen();
        try {
            const threadId = await this.ensureThread(username);
            const hit = this.lastThreads.find(
                (t) => t.peer === username || t.participant_username === username,
            );
            await this.selectThread(
                threadId,
                username,
                pickedAvatar || hit?.peer_avatar || null,
            );
        } catch {
            Alert.error("Could not open conversation");
            return;
        }
        this.messageInput?.focus();
    }
    renderChatHeader() {
        if (!this.chatHeader || !this.peerUsername) return;
        const u = App.escapeHtml(this.peerUsername);
        const av = App.escapeAttr(this.peerAvatar || "");
        const ph = App.escapeHtml(App.initialsOf(this.peerUsername || "?"));
        const profileUrl = `https://dyscover.ielectro.com/users/${encodeURIComponent(this.peerUsername)}`;
        this.chatHeader.innerHTML = `
      <div class="chat-header-row">
        <span class="chat-header-avatar-wrap">
          <img class="chat-header-avatar" src="${av}" alt="" loading="lazy" />
          <span class="chat-header-avatar-ph">${ph}</span>
        </span>
        <a class="chat-header-userlink" href="${App.escapeAttr(profileUrl)}">${u}</a>
      </div>`;
        App.wireAvatarImg(this.chatHeader.querySelector(".chat-header-avatar"));
    }
    async loadThreads(opts = {}) {
        try {
            const res = await Request.get(Api.inbox);
            const threads = Api.list(res).map(App.normalizeInboxThread);
            this._allThreads = threads;
            this.lastThreads = threads;
            const listSig = `${threads
                .map(
                    (t) =>
                        `${t.id}|${t.peer}|${t.has_unread ? 1 : 0}|${String(t.last_message || "")}`,
                )
                .join(";")}|sel=${this.selectedThreadId ?? ""}`;
            const skipListRedraw = opts.silent && listSig === this._threadsListSig;
            if (!skipListRedraw) {
                this._threadsListSig = listSig;
                this.renderConversations(
                    threads,
                    this.conversationsSearch?.value || "",
                );
                await Icons.load(this.conversationsList);
            }
            Navbar.refresh().catch(() => { });
        } catch {
            if (!opts.silent && this.conversationsList) {
                EmptyState.mount(
                    this.conversationsList,
                    EmptyState.inbox(),
                    undefined,
                );
                Icons.load(this.conversationsList).catch(() => {});
            }
        }
    }
    renderConversations(threads, searchTerm = "") {
        if (!this.conversationsList) return;
        const term = String(searchTerm || "").trim().toLowerCase();
        const filtered = term
            ? threads.filter((t) =>
                  String(t.peer || "")
                      .toLowerCase()
                      .includes(term),
              )
            : threads;
        this.conversationsList.innerHTML = "";
        if (!filtered.length) {
            EmptyState.mount(
                this.conversationsList,
                term
                    ? {
                          icon: "search",
                          title: "No conversations found",
                          message: "Try another name or start a new chat.",
                          compact: true,
                      }
                    : EmptyState.inbox(),
            );
            Icons.load(this.conversationsList).catch(() => {});
            return;
        }
        filtered.forEach((t) => {
            const card = document.createElement("div");
            const unread = Boolean(t.has_unread);
            card.className = `conversation-card ${this.selectedThreadId === t.id ? "active" : ""}${unread ? " has-unread" : ""}`;
            card.dataset.threadId = String(t.id);
            const peer = App.escapeHtml(t.peer || "");
            const av = App.escapeAttr(App.peerAvatarUrl(t.peer, t.peer_avatar || null));
            const ph = App.escapeHtml(App.initialsOf(t.peer || "?"));
            const preview = App.escapeHtml(t.last_message || "");
            card.innerHTML = `
        <div class="conversation-info">
          <div class="avatar chat-avatar-wrap">
            <img class="avatar-img" src="${av}" alt="" loading="lazy" />
            <span class="avatar-fallback">${ph}</span>
          </div>
          <div class="conversation-details">
            <p>${peer}</p>
            <p>${preview}</p>
          </div>
        </div>
        <button  class="btn btn-ghost delete-btn" aria-label="Delete conversation"><i data-icon="trash"></i></button>`;
            App.wireAvatarImg(card.querySelector(".avatar-img"));
            card.querySelector(".conversation-info")?.addEventListener("click", () =>
                this.selectThread(t.id, t.peer, t.peer_avatar),
            );
            card.querySelector(".delete-btn")?.addEventListener("click", (e) => {
                e.stopPropagation();
                this.handleDeleteThread(t.id);
            });
            this.conversationsList.appendChild(card);
        });
    }
    async selectThread(threadId, peer, peerAvatar, opts = {}) {
        this.selectedThreadId = threadId;
        this.peerUsername = peer;
        let avatar = peerAvatar || null;
        if (peer && !avatar) {
            try {
                const res = await Request.get(Api.user(peer));
                avatar = Api.record(res)?.avatar || null;
            } catch {
                avatar = null;
            }
        }
        this.peerAvatar = App.peerAvatarUrl(peer, avatar);
        this.lastMessageIds = "";
        this.clearReplyTo();
        this.renderChatHeader();
        this.setComposerVisible(true);
        this.setChatOpen(true);
        if (!opts.skipReloadThreads) {
            await this.loadThreads({ silent: true });
        } else {
            this.renderConversations(
                this._allThreads,
                this.conversationsSearch?.value || "",
            );
        }
        await this.loadMessages();
    }
    async loadMessages(opts = {}) {
        if (!this.chatMessages) return;
        if (!this.selectedThreadId) {
            this.resetEmptyChatShell();
            return;
        }
        const el = this.chatMessages;
        const nearBottom =
            el && el.scrollHeight - el.scrollTop - el.clientHeight < 96;
        try {
            const res = await Request.get(Api.inboxMessages(this.selectedThreadId));
            const messages = Api.list(res).map(App.normalizeInboxMessage);
            const sig = messages.map((m) => m.id).join(",");
            if (opts.silent && sig === this.lastMessageIds) {
                return;
            }
            this.lastMessageIds = sig;
            this._loadedMessages = messages;
            const seenMessageId = this.findSeenMessageId(messages);
            el.innerHTML = messages.length
                ? this.renderMessages(messages, seenMessageId)
                : '<p class="chat-placeholder">Say hello — your first message starts the conversation.</p>';
            await this.hydratePostCards(el);
            this.bindMediaPreviews(el);
            this.bindMessageActions(el);
            await Icons.load(el);
            if (!opts.silent || nearBottom) {
                el.scrollTop = el.scrollHeight;
            }
            el.querySelectorAll(".chat-msg .avatar-img").forEach((img) =>
                App.wireAvatarImg(img),
            );
            if (!opts.silent) {
                Navbar.refresh().catch(() => { });
            }
        } catch {
            if (!opts.silent) Alert.error("Unable to load messages");
        }
    }
    findSeenMessageId(messages) {
        if (!messages.length) {
            return null;
        }
        const last = messages[messages.length - 1];
        if (last.sender !== this.selfUsername || !last.read_by_peer) {
            return null;
        }
        return last.id;
    }
    renderMessages(messages, seenMessageId = null) {
        const parts = [];
        let previousAt = null;
        messages.forEach((message) => {
            const createdAt = message.created_at
                ? new Date(message.created_at)
                : null;
            if (
                createdAt &&
                !Number.isNaN(createdAt.getTime()) &&
                this.shouldShowTimeDivider(previousAt, createdAt)
            ) {
                parts.push(this.renderTimeDivider(createdAt));
            }
            parts.push(
                this.renderMessageBubble(
                    message,
                    message.id === seenMessageId,
                ),
            );
            if (createdAt && !Number.isNaN(createdAt.getTime())) {
                previousAt = createdAt;
            }
        });
        return parts.join("");
    }
    shouldShowTimeDivider(previousAt, currentAt) {
        if (!previousAt) {
            return true;
        }
        const gapMs = currentAt.getTime() - previousAt.getTime();
        return gapMs >= 60 * 60 * 1000;
    }
    renderTimeDivider(date) {
        const now = new Date();
        const sameDay =
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday =
            date.getFullYear() === yesterday.getFullYear() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getDate() === yesterday.getDate();
        let label;
        if (sameDay) {
            label = date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            });
        } else if (isYesterday) {
            label = `Yesterday ${date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            })}`;
        } else {
            label = date.toLocaleString("en-US", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return `<div class="chat-date-divider">${App.escapeHtml(label)}</div>`;
    }
    formatSeenLabel(readAt) {
        if (!readAt) {
            return "Viewed";
        }
        const readDate = new Date(readAt);
        if (Number.isNaN(readDate.getTime())) {
            return "Viewed";
        }
        const diffMs = Date.now() - readDate.getTime();
        if (diffMs < 60_000) {
            return "Viewed just now";
        }
        if (diffMs < 3_600_000) {
            const mins = Math.max(1, Math.floor(diffMs / 60_000));
            return `Viewed ${mins}m ago`;
        }
        if (diffMs < 86_400_000) {
            const hours = Math.max(1, Math.floor(diffMs / 3_600_000));
            return `Viewed ${hours}hr${hours === 1 ? "" : "s"} ago`;
        }
        return "Viewed";
    }
    renderMessageBubble(m, showSeen = false) {
        const mine = m.sender === this.selfUsername;
        const post = decodePostMessage(m.body);
        const kind = m.msg_kind || "text";
        const url = m.attachment_url || "";
        const av = App.escapeAttr(
            App.peerAvatarUrl(m.sender, m.sender_avatar || null),
        );
        const ph = App.escapeHtml(App.initialsOf(m.sender || "?"));
        const side = mine ? "mine" : "";
        const peerAvatar = mine
            ? ""
            : `<span class="chat-msg-avatar"><img class="avatar-img" src="${av}" alt="" loading="lazy" /><span class="avatar-fallback">${ph}</span></span>`;
        const seen = showSeen
            ? `<div class="chat-msg-meta"><span class="chat-msg-seen">${App.escapeHtml(this.formatSeenLabel(m.read_at))}</span></div>`
            : "";
        const actions = this.renderMessageActions(m, mine);
        const wrapRow = (bodyHtml) =>
            `<div class="chat-msg-row"><div class="chat-msg-body">${bodyHtml}</div>${actions}</div>`;
        if (post) {
            return `<div class="chat-msg ${side} chat-msg--post" data-message-id="${m.id}">${peerAvatar}${wrapRow(`<div class="chat-msg-post-shell"><div class="chat-msg-post" data-post="${App.escapeAttr(JSON.stringify(post))}"></div></div>${seen}`)}</div>`;
        }
        if (m.redacted) {
            return `<div class="chat-msg ${side}" data-message-id="${m.id}">${peerAvatar}${wrapRow(`<div class="chat-msg-inner chat-msg-inner--redacted">Message unavailable</div>${seen}`)}</div>`;
        }
        const hasMedia = !!url;
        const bodyText = Mention.linkify(m.body || "").replace(/\n/g, "<br>");
        const hasText = !!(m.body || "").trim();
        const replyHtml = this.renderReplyQuote(m, mine);
        let mediaHtml = "";
        if (hasMedia) {
            mediaHtml = this.renderAttachmentMedia(url, kind, m.attachment_name);
        }
        const textHtml = hasText
            ? `<div class="chat-msg-inner">${bodyText}</div>`
            : "";
        const mediaOnlyClass = hasMedia && !hasText ? " chat-msg--media-only" : "";
        const attachmentClass = hasMedia ? " chat-msg--attachment" : "";
        return `<div class="chat-msg ${side}${attachmentClass}${mediaOnlyClass}" data-message-id="${m.id}">${peerAvatar}${wrapRow(`${replyHtml}${mediaHtml}${textHtml}${seen}`)}</div>`;
    }
    renderReplyQuote(m, mine) {
        const reply = m.reply_to;
        if (!reply?.id) return "";
        const replyName =
            reply.username === this.selfUsername
                ? "you"
                : reply.username || "them";
        const label = mine
            ? `You replied to ${replyName}`
            : `${m.sender || "They"} replied to ${replyName}`;
        const preview = App.escapeHtml(reply.preview || reply.body || "Message");
        return `<div class="chat-msg-reply"><span class="chat-msg-reply-label">${App.escapeHtml(label)}</span><div class="chat-msg-reply-quote">${preview}</div></div>`;
    }
    renderMessageActions(m, mine) {
        const hasMedia = !!(m.attachment_url || "");
        const downloadItem = hasMedia
            ? `<a class="chat-msg-menu-item" href="${App.escapeAttr(m.attachment_url)}" download data-action="download"><i data-icon="download"></i><span>Download</span></a>`
            : "";
        const deleteEveryone = mine
            ? `<button type="button" class="chat-msg-menu-item chat-msg-menu-item--danger" data-action="delete-everyone"><i data-icon="trash"></i><span>Delete for everyone</span></button>`
            : "";
        return `<div class="chat-msg-actions">
            <button type="button" class="chat-msg-action chat-msg-action--reply" data-action="reply" data-message-id="${m.id}" aria-label="Reply">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17H4l5 5V19h5a6 6 0 0 0 0-12h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div class="chat-msg-menu">
                <button type="button" class="chat-msg-action chat-msg-action--menu" data-action="menu" aria-label="Message options"><i data-icon="three-dots"></i></button>
                <div class="chat-msg-menu-pop" hidden>
                    <button type="button" class="chat-msg-menu-item" data-action="copy"><i data-icon="copy"></i><span>Copy message</span></button>
                    ${downloadItem}
                    ${deleteEveryone}
                    <button type="button" class="chat-msg-menu-item" data-action="delete-me"><i data-icon="archive"></i><span>Delete for me</span></button>
                </div>
            </div>
        </div>`;
    }
    bindMessageActions(root) {
        root?.querySelectorAll(".chat-msg-action--reply").forEach((btn) => {
            if (btn.dataset.bound === "1") return;
            btn.dataset.bound = "1";
            btn.addEventListener("click", () => {
                const id = Number(btn.dataset.messageId);
                const row = btn.closest(".chat-msg");
                this.setReplyTo(this.findMessageById(id) || this.messageFromNode(row, id));
            });
        });
        root?.querySelectorAll(".chat-msg-menu").forEach((menu) => {
            const toggle = menu.querySelector('[data-action="menu"]');
            const pop = menu.querySelector(".chat-msg-menu-pop");
            if (!toggle || !pop || toggle.dataset.bound === "1") return;
            toggle.dataset.bound = "1";
            toggle.addEventListener("click", (e) => {
                e.stopPropagation();
                this.closeAllMessageMenus(pop);
                pop.hidden = !pop.hidden;
            });
            pop.querySelectorAll("[data-action]").forEach((item) => {
                if (
                    item.dataset.action === "menu" ||
                    item.dataset.action === "download"
                ) {
                    return;
                }
                if (item.dataset.menuBound === "1") return;
                item.dataset.menuBound = "1";
                item.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const action = item.dataset.action;
                    const messageId = Number(
                        item.closest(".chat-msg")?.dataset.messageId,
                    );
                    pop.hidden = true;
                    if (action === "copy") {
                        await this.copyMessage(messageId);
                    } else if (action === "delete-everyone") {
                        await this.deleteMessage(messageId, "everyone");
                    } else if (action === "delete-me") {
                        await this.deleteMessage(messageId, "me");
                    }
                });
            });
        });
        if (!this._messageMenuDocBound) {
            this._messageMenuDocBound = true;
            document.addEventListener("click", () => this.closeAllMessageMenus());
        }
    }
    closeAllMessageMenus(except = null) {
        this.chatMessages?.querySelectorAll(".chat-msg-menu-pop").forEach((pop) => {
            if (pop !== except) pop.hidden = true;
        });
    }
    findMessageById(id) {
        return this._loadedMessages?.find((m) => m.id === id) || null;
    }
    messageFromNode(node, id) {
        if (!node) return { id, sender: "", body: "", msg_kind: "text", attachment_url: "" };
        const inner = node.querySelector(".chat-msg-inner");
        const text = inner?.textContent?.trim() || "";
        return {
            id,
            sender: node.classList.contains("mine") ? this.selfUsername : this.peerUsername,
            body: text,
            msg_kind: node.classList.contains("chat-msg--attachment") ? "image" : "text",
            attachment_url: node.querySelector("[data-media-url]")?.dataset.mediaUrl || "",
        };
    }
    setReplyTo(message) {
        if (!message?.id) return;
        this.replyTo = message;
        this.renderReplyHint();
        this.messageInput?.focus();
    }
    clearReplyTo() {
        this.replyTo = null;
        this.renderReplyHint();
    }
    renderReplyHint() {
        const chatArea = this.composer?.parentElement;
        chatArea?.querySelectorAll(".chat-reply-hint").forEach((n) => n.remove());
        if (!this.replyTo) return;
        const preview = this.replyPreviewText(this.replyTo);
        const who =
            this.replyTo.sender === this.selfUsername
                ? "yourself"
                : this.replyTo.sender || this.peerUsername || "them";
        const hint = document.createElement("div");
        hint.className = "chat-reply-hint";
        hint.innerHTML = `
      <div class="chat-reply-hint-body">
        <span class="chat-reply-hint-label">Replying to ${App.escapeHtml(who)}</span>
        <span class="chat-reply-hint-preview">${App.escapeHtml(preview)}</span>
      </div>
      <button type="button" class="chat-reply-hint-remove" aria-label="Cancel reply">×</button>`;
        hint.querySelector(".chat-reply-hint-remove")?.addEventListener("click", () =>
            this.clearReplyTo(),
        );
        this.composer?.before(hint);
    }
    replyPreviewText(message) {
        if (message.redacted) return "Message unavailable";
        const kind = message.msg_kind || "text";
        if (kind === "image") return "Photo";
        if (kind === "video") return "Video";
        if (kind === "audio") return "Audio";
        if (kind === "post") return "Post";
        const body = String(message.body || "").trim();
        if (!body) return "Attachment";
        return body.length > 96 ? `${body.slice(0, 96)}…` : body;
    }
    async copyMessage(messageId) {
        const message =
            this.findMessageById(messageId) ||
            this.messageFromNode(
                this.chatMessages?.querySelector(
                    `[data-message-id="${messageId}"]`,
                ),
                messageId,
            );
        if (!message?.id) return;
        if (message.redacted) {
            Alert.error("Nothing to copy");
            return;
        }
        const post = decodePostMessage(message.body);
        let text = String(message.body || "").trim();
        if (post?.id) {
            text = `https://dyscover.ielectro.com/posts/${post.id}`;
        } else if (!text && message.attachment_url) {
            text = String(message.attachment_url);
        }
        if (!text) {
            Alert.error("Nothing to copy");
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            Alert.success("Message copied");
        } catch {
            Alert.error("Could not copy message");
        }
    }
    async deleteMessage(messageId, scope) {
        if (!messageId || !this.selectedThreadId) return;
        const label =
            scope === "everyone"
                ? "Delete this message for everyone?"
                : "Delete this message for you?";
        const ok = await Alert.confirm(label);
        if (!ok) return;
        try {
            await Request.delete(
                `${Api.inboxMessage(this.selectedThreadId, messageId)}?scope=${encodeURIComponent(scope)}`,
            );
            if (this.replyTo?.id === messageId) this.clearReplyTo();
            await this.loadThreads({ silent: true });
            await this.loadMessages({ silent: true });
        } catch {
            Alert.error("Could not delete message");
        }
    }
    renderAttachmentMedia(url, kind, name = "") {
        const safeUrl = App.escapeAttr(url);
        if (kind === "image") {
            return `<button type="button" class="chat-msg-media-thumb chat-msg-media-thumb--image" data-media-url="${safeUrl}" data-media-kind="image" aria-label="Open image preview"><img src="${safeUrl}" alt="" loading="lazy"></button>`;
        }
        if (kind === "video") {
            return `<button type="button" class="chat-msg-media-thumb chat-msg-media-thumb--video" data-media-url="${safeUrl}" data-media-kind="video" aria-label="Open video preview"><video muted playsinline preload="metadata"><source src="${safeUrl}"></video><span class="chat-msg-media-play" aria-hidden="true"></span></button>`;
        }
        if (kind === "audio") {
            return `<div class="chat-msg-media chat-msg-media--audio"><audio controls preload="metadata"><source src="${safeUrl}"></audio></div>`;
        }
        const label = App.escapeHtml(name || "Attachment");
        return `<a class="chat-msg-file" href="${safeUrl}" target="_blank" rel="noopener">${label}</a>`;
    }
    bindMediaPreviews(root) {
        root?.querySelectorAll("[data-media-url]").forEach((trigger) => {
            if (trigger.dataset.previewBound === "1") return;
            trigger.dataset.previewBound = "1";
            trigger.addEventListener("click", () => {
                this.openMediaPreview(
                    trigger.dataset.mediaUrl || "",
                    trigger.dataset.mediaKind || "image",
                );
            });
        });
    }
    async openMediaPreview(url, kind) {
        if (!url) return;
        const safeUrl = App.escapeAttr(url);
        const overlay = document.createElement("div");
        overlay.className = "post-overlay chat-media-overlay";
        const panel = document.createElement("div");
        panel.className = "post-overlay-panel chat-media-overlay-panel";
        const close = document.createElement("button");
        close.type = "button";
        close.className = "post-overlay-close";
        close.setAttribute("aria-label", "Close");
        close.innerHTML = '<i data-icon="circle-x"></i>';
        const closeOverlay = () => {
            App.setScrollEnabled(true);
            overlay.remove();
        };
        close.addEventListener("click", closeOverlay);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeOverlay();
        });
        if (kind === "video") {
            panel.innerHTML = `<video class="chat-media-preview-video" controls autoplay playsinline src="${safeUrl}"></video>`;
        } else {
            panel.innerHTML = `<img class="chat-media-preview-img" src="${safeUrl}" alt="">`;
        }
        overlay.appendChild(close);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        App.setScrollEnabled(false);
        await Icons.load(overlay);
    }
    setAttachUploading(on) {
        this.attachBtn?.toggleAttribute("disabled", on);
        this.composer?.classList.toggle("is-uploading-attachment", on);
        let spinner = this.composer?.querySelector(".chat-attach-upload-spinner");
        if (on) {
            if (!spinner && this.composer) {
                spinner = document.createElement("div");
                spinner.className = "chat-attach-upload-spinner";
                spinner.innerHTML = Spinner.html(true);
                this.composer.insertBefore(
                    spinner,
                    this.sendMessageBtn || null,
                );
            }
        } else {
            spinner?.remove();
        }
    }
    async hydratePostCards(root) {
        const nodes = root?.querySelectorAll(".chat-msg-post[data-post]") || [];
        for (const node of nodes) {
            try {
                const post = JSON.parse(node.dataset.post || "{}");
                if (!post?.id) continue;
                node.innerHTML = "";
                const card = new Card({ id: post.id });
                await card.preview(node);
            } catch {
                node.innerHTML =
                    '<div class="chat-msg-post-unavailable">Post unavailable</div>';
            }
        }
    }
    async handleDeleteThread(threadId) {
        const ok = await Alert.confirm("Delete this conversation?");
        if (!ok) return;
        try {
            await Request.delete(Api.inboxOne(threadId));
            if (this.selectedThreadId === threadId) {
                this.selectedThreadId = null;
                this.peerUsername = null;
                this.peerAvatar = null;
                this.lastMessageIds = "";
                this.resetEmptyChatShell();
            }
            await this.loadThreads();
            await this.loadMessages();
        } catch {
            Alert.error("Could not delete conversation");
        }
    }
    async handleAttachSelected() {
        const file = this.attachInput?.files?.[0];
        if (this.attachInput) this.attachInput.value = "";
        if (!file) return;
        if (!this.peerUsername) {
            Alert.error("Select a conversation first");
            return;
        }
        if (!this.selectedThreadId) {
            try {
                await this.ensureThread(this.peerUsername);
            } catch {
                Alert.error("Could not open conversation");
                return;
            }
        }
        const data = new FormData();
        data.append("file", file);
        data.append("chat_id", String(this.selectedThreadId));
        try {
            this.setAttachUploading(true);
            const res = await Request.post(
                Api.inboxUpload(this.selectedThreadId),
                data,
            );
            const payload = Api.record(res);
            if (!payload?.url) {
                throw new Error("Upload failed");
            }
            this.pendingAttachment = {
                url: payload.url,
                msg_kind: payload.msg_kind || payload.type || "file",
                name: file.name,
            };
            this.renderAttachHint();
        } catch {
            Alert.error("Could not upload attachment");
        } finally {
            this.setAttachUploading(false);
        }
    }
    renderAttachHint() {
        const chatArea = this.composer?.parentElement;
        chatArea?.querySelectorAll(".chat-attach-hint").forEach((n) => n.remove());
        if (!this.pendingAttachment) return;
        const att = this.pendingAttachment;
        const hint = document.createElement("div");
        hint.className = "chat-attach-hint";
        hint.innerHTML = `
      <span class="chat-attach-hint-label">${App.escapeHtml(att.name || "Attachment ready")}</span>
      <button type="button" class="chat-attach-hint-remove" aria-label="Remove attachment">×</button>`;
        hint.querySelector(".chat-attach-hint-remove")?.addEventListener("click", () => {
            this.pendingAttachment = null;
            hint.remove();
        });
        this.composer?.before(hint);
    }
    async handleSendMessage() {
        if (this._sending) return;
        const message = this.messageInput?.value.trim() || "";
        if (!this.peerUsername) {
            Alert.error("Select a conversation or pick someone from New");
            return;
        }
        if (!this.selectedThreadId) {
            try {
                await this.ensureThread(this.peerUsername);
            } catch {
                Alert.error("Could not open conversation");
                return;
            }
        }
        if (!message && !this.pendingAttachment) return;
        const payload = { body: message };
        if (this.pendingAttachment) {
            payload.type = this.pendingAttachment.msg_kind || "file";
            payload.attachment = this.pendingAttachment.url;
        }
        if (this.replyTo?.id) {
            payload.reply_to_id = this.replyTo.id;
        }
        this._sending = true;
        this.sendMessageBtn?.setAttribute("disabled", "disabled");
        try {
            await Request.post(Api.inboxMessages(this.selectedThreadId), payload);
            if (this.messageInput) this.messageInput.value = "";
            this.pendingAttachment = null;
            this.clearReplyTo();
            this.composer?.parentElement
                ?.querySelectorAll(".chat-attach-hint")
                .forEach((n) => n.remove());
            await this.loadThreads({ silent: true });
            await this.loadMessages({ silent: true });
            Navbar.refresh().catch(() => { });
        } catch {
            Alert.error("Could not send message");
        } finally {
            this._sending = false;
            this.sendMessageBtn?.removeAttribute("disabled");
        }
    }
}

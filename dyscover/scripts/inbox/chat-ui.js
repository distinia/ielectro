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
        this.pollTyping = null;
        this.typingPulseTimer = null;
        this.pendingAttachment = null;
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
        this.pollTyping = window.setInterval(() => {
            if (document.visibilityState !== "visible") return;
            if (this.selectedThreadId) {
                this.refreshTyping();
            }
        }, 2800);
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
        this.messageInput?.addEventListener("input", () =>
            this.scheduleTypingPulse(),
        );
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
    scheduleTypingPulse() {
        if (!this.selectedThreadId) return;
        clearTimeout(this.typingPulseTimer);
        this.typingPulseTimer = window.setTimeout(() => this.pulseTyping(), 400);
    }
    async pulseTyping() {}
    async refreshTyping() {}
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
            onSelect: (user) => this.pickPeer(user.username),
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
    async pickPeer(username) {
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
                hit?.peer_avatar || null,
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
        this.peerAvatar = App.peerAvatarUrl(peer, peerAvatar || null);
        this.lastMessageIds = "";
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
            el.innerHTML = messages.length
                ? messages.map((m) => this.renderMessageBubble(m)).join("")
                : '<p class="chat-placeholder">Say hello — your first message starts the conversation.</p>';
            await this.hydratePostCards(el);
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
    renderMessageBubble(m) {
        const mine = m.sender === this.selfUsername;
        const post = decodePostMessage(m.body);
        const kind = m.msg_kind || "text";
        const url = m.attachment_url || "";
        const av = App.escapeAttr(
            App.peerAvatarUrl(m.sender, m.sender_avatar || null),
        );
        const ph = App.escapeHtml(App.initialsOf(m.sender || "?"));
        const side = mine ? "mine" : "";
        const avatarBlock = mine
            ? `<span class="chat-msg-avatar chat-msg-avatar-mine"><img class="avatar-img" src="${av}" alt="" loading="lazy" /><span class="avatar-fallback">${ph}</span></span>`
            : `<span class="chat-msg-avatar"><img class="avatar-img" src="${av}" alt="" loading="lazy" /><span class="avatar-fallback">${ph}</span></span>`;
        if (post) {
            const time = this.formatMessageTime(m.created_at);
            return `<div class="chat-msg ${side} chat-msg--post">${mine ? "" : avatarBlock}<div class="chat-msg-post-shell"><div class="chat-msg-post" data-post="${App.escapeAttr(JSON.stringify(post))}"></div>${time}</div>${mine ? avatarBlock : ""}</div>`;
        }
        let media = "";
        const bodyText = Mention.linkify(m.body || "").replace(/\n/g, "<br>");
        if (url) {
            if (kind === "image") {
                media = `<div class="chat-msg-media"><a href="${App.escapeAttr(url)}" target="_blank" rel="noopener"><img src="${App.escapeAttr(url)}" alt="" loading="lazy"></a></div>`;
            } else if (kind === "video") {
                media = `<div class="chat-msg-media"><video controls preload="metadata"><source src="${App.escapeAttr(url)}"></video></div>`;
            } else if (kind === "audio") {
                media = `<div class="chat-msg-media"><audio controls preload="metadata"><source src="${App.escapeAttr(url)}"></audio></div>`;
            } else {
                media = `<div class="chat-msg-media"><a class="chat-msg-file" href="${App.escapeAttr(url)}" target="_blank" rel="noopener">Download attachment</a></div>`;
            }
        }
        const bubble = `<div class="chat-msg-inner">${media}<div class="chat-msg-text">${bodyText}</div>${this.formatMessageTime(m.created_at)}</div>`;
        return `<div class="chat-msg ${side}">${mine ? "" : avatarBlock}${bubble}${mine ? avatarBlock : ""}</div>`;
    }
    formatMessageTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return `<span class="chat-msg-time">${App.escapeHtml(
            date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        )}</span>`;
    }
    async hydratePostCards(root) {
        const nodes = root?.querySelectorAll(".chat-msg-post[data-post]") || [];
        for (const node of nodes) {
            try {
                const post = JSON.parse(node.dataset.post || "{}");
                if (!post?.id) continue;
                node.innerHTML = "";
                const card = new Card(App.enrichPost(post));
                await card.preview(node);
            } catch {
                node.innerHTML = "";
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
        const data = new FormData();
        data.append("file", file);
        try {
            this.attachBtn?.setAttribute("disabled", "disabled");
            const res = await Request.post(Api.inboxUpload, data);
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
            this.attachBtn?.removeAttribute("disabled");
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
        this._sending = true;
        this.sendMessageBtn?.setAttribute("disabled", "disabled");
        try {
            await Request.post(Api.inboxMessages(this.selectedThreadId), payload);
            if (this.messageInput) this.messageInput.value = "";
            this.pendingAttachment = null;
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

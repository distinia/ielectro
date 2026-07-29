import { App, Card, Request, Icons, Alert, Auth, UsersList, Navbar, decodePostMessage, Mention } from "./app.js";
const PEER_AVATAR_BASE = "https://account.ielectro.com/u/";
const peerAvatarUrlCache = Object.create(null);
function normalizePeerKey(username) {
    return String(username || "")
        .replace(/^@/, "")
        .trim()
        .toLowerCase();
}
function cachedPeerAvatarUrl(username, explicitUrl) {
    const raw = String(username || "").replace(/^@/, "").trim();
    const key = normalizePeerKey(raw);
    if (!key) return "";
    const ex =
        explicitUrl != null && String(explicitUrl).trim() !== ""
            ? String(explicitUrl).trim()
            : null;
    if (ex) {
        peerAvatarUrlCache[key] = ex;
        return ex;
    }
    if (peerAvatarUrlCache[key]) return peerAvatarUrlCache[key];
    const built = `${PEER_AVATAR_BASE}${encodeURIComponent(raw || key)}/avatar.png`;
    peerAvatarUrlCache[key] = built;
    return built;
}
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    const ui = new ChatUI();
    await ui.init();
});
class ChatUI {
    constructor() {
        this.root = document.querySelector("main");
        this.selectedThreadId = null;
        this.peerUsername = null;
        this.peerAvatar = null;
        this.lastThreads = [];
        this.lastMessageIds = "";
        this.conversationsList = this.root?.querySelector(".conversations-list");
        this.chatHeader = this.root?.querySelector(".chat-header");
        this.chatMessages = this.root?.querySelector(".chat-messages");
        this.chatTypingLine = this.root?.querySelector(".chat-typing-line");
        this.composer = this.root?.querySelector(".chat-area-composer");
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
    }
    setComposerVisible(on) {
        this.composer?.classList.toggle("is-chat-composer-hidden", !on);
    }
    resetEmptyChatShell() {
        if (this.chatHeader) this.chatHeader.innerHTML = "";
        if (this.chatMessages) {
            this.chatMessages.innerHTML =
                '<p class="chat-placeholder">Select a conversation or start a new one.</p>';
        }
        this.chatTypingLine?.classList.add("hidden");
        if (this.chatTypingLine) this.chatTypingLine.textContent = "";
        this.setComposerVisible(false);
    }
    async init() {
        this.selfUsername = await Auth.username();
        this.resetEmptyChatShell();
        this.bindEvents();
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
    }
    scheduleTypingPulse() {
        if (!this.selectedThreadId) return;
        clearTimeout(this.typingPulseTimer);
        this.typingPulseTimer = window.setTimeout(() => this.pulseTyping(), 400);
    }
    async pulseTyping() {
        if (!this.selectedThreadId) return;
        try {
            await Request.post("https://dyscover.ielectro.com/api/chat/typing", {
                thread_id: String(this.selectedThreadId),
            });
        } catch {
        }
    }
    async refreshTyping() {
        if (!this.chatTypingLine || !this.selectedThreadId) return;
        try {
            const res = await Request.get(
                "https://dyscover.ielectro.com/api/chat/typing",
                { thread_id: String(this.selectedThreadId) },
            );
            const on = Boolean(res.data?.typing);
            this.chatTypingLine.classList.toggle("hidden", !on);
            const peer = res.data?.peer || this.peerUsername || "";
            this.chatTypingLine.textContent = on ? `${peer} is typing…` : "";
        } catch {
            this.chatTypingLine?.classList.add("hidden");
        }
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
        return cachedPeerAvatarUrl(u, ex);
    }
    async openNewChatBox() {
        this.closeNewChatBoxIfOpen();
        this.userPicker = new UsersList({
            title: "New message",
            hint: "People you follow",
            onSelect: (user) => this.pickPeer(user.username),
            loadUsers: async (term) => {
                if (term) {
                    const res = await Request.get(App.api("user/search"), { term });
                    return (Array.isArray(res?.data) ? res.data : []).filter(
                        (u) => u.username && u.username !== this.selfUsername,
                    );
                }
                const res = await Request.get(App.api("chat/suggestions"));
                return Array.isArray(res.data?.followings) ? res.data.followings : [];
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
        const res = await Request.post(
            "https://dyscover.ielectro.com/api/chat/create-thread",
            { participant },
        );
        const id = res.data?.id;
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
        const u = escapeHtml(this.peerUsername);
        const av = escapeAttr(this.peerAvatar || "");
        const ph = escapeHtml(initialsOf(this.peerUsername || "?"));
        const profileUrl = `https://dyscover.ielectro.com/u/${encodeURIComponent(this.peerUsername)}`;
        this.chatHeader.innerHTML = `
      <div class="chat-header-row">
        <span class="chat-header-avatar-wrap">
          <img class="chat-header-avatar" src="${av}" alt="" loading="lazy" />
          <span class="chat-header-avatar-ph">${ph}</span>
        </span>
        <a class="chat-header-userlink" href="${escapeAttr(profileUrl)}">${u}</a>
      </div>`;
        wireAvatarImg(this.chatHeader.querySelector(".chat-header-avatar"));
    }
    async loadThreads(opts = {}) {
        try {
            const res = await Request.get(
                "https://dyscover.ielectro.com/api/chat/threads",
            );
            const threads = (Array.isArray(res.data) ? res.data : []).map(
                normalizeThread,
            );
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
                this.renderConversations(threads);
                await Icons.load(this.conversationsList);
            }
            Navbar.refresh().catch(() => { });
        } catch {
            if (!opts.silent) Alert.error("Unable to load conversations");
        }
    }
    renderConversations(threads) {
        if (!this.conversationsList) return;
        this.conversationsList.innerHTML = "";
        if (!threads.length) {
            this.conversationsList.innerHTML =
                '<p class="chat-empty">No conversations yet. Tap <strong>New</strong> to start.</p>';
            return;
        }
        threads.forEach((t) => {
            const card = document.createElement("div");
            const unread = Boolean(t.has_unread);
            card.className = `conversation-card ${this.selectedThreadId === t.id ? "active" : ""}${unread ? " has-unread" : ""}`;
            card.dataset.threadId = String(t.id);
            const peer = escapeHtml(t.peer || "");
            const av = escapeAttr(cachedPeerAvatarUrl(t.peer, t.peer_avatar || null));
            const ph = escapeHtml(initialsOf(t.peer || "?"));
            const preview = escapeHtml(t.last_message || "");
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
            wireAvatarImg(card.querySelector(".avatar-img"));
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
        this.peerAvatar = cachedPeerAvatarUrl(peer, peerAvatar || null);
        this.lastMessageIds = "";
        this.renderChatHeader();
        this.setComposerVisible(true);
        if (!opts.skipReloadThreads) {
            await this.loadThreads({ silent: true });
        } else {
            this.renderConversations(this.lastThreads);
        }
        await this.loadMessages();
        this.chatTypingLine?.classList.add("hidden");
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
            const res = await Request.get(
                "https://dyscover.ielectro.com/api/chat/messages",
                { thread_id: String(this.selectedThreadId) },
            );
            const payload = res.data || {};
            if (payload.peer_avatar && this.peerUsername) {
                this.peerAvatar = cachedPeerAvatarUrl(
                    this.peerUsername,
                    payload.peer_avatar,
                );
                this.renderChatHeader();
            }
            const messages = Array.isArray(payload.messages) ? payload.messages : [];
            const sig = messages.map((m) => m.id).join(",");
            if (opts.silent && sig === this.lastMessageIds) {
                return;
            }
            this.lastMessageIds = sig;
            el.innerHTML = messages.length
                ? messages.map((m) => this.renderMessageBubble(m)).join("")
                : '<p class="chat-placeholder">No messages yet. Say hello!</p>';
            await this.hydratePostCards(el);
            await Icons.load(el);
            if (!opts.silent || nearBottom) {
                el.scrollTop = el.scrollHeight;
            }
            el.querySelectorAll(".chat-msg .avatar-img").forEach((img) =>
                wireAvatarImg(img),
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
        let media = "";
        let bodyText = "";
        if (post) {
            media = `<div class="chat-msg-post" data-post="${escapeAttr(JSON.stringify(post))}"></div>`;
        } else {
            bodyText = Mention.linkify(m.body || "").replace(/\n/g, "<br>");
            if (url) {
                if (kind === "image") {
                    media = `<div class="chat-msg-media"><a href="${escapeAttr(url)}" target="_blank" rel="noopener"><img src="${escapeAttr(url)}" alt=""></a></div>`;
                } else if (kind === "video") {
                    media = `<div class="chat-msg-media"><video controls preload="metadata"><source src="${escapeAttr(url)}"></video></div>`;
                } else if (kind === "audio") {
                    media = `<div class="chat-msg-media"><audio controls preload="metadata"><source src="${escapeAttr(url)}"></audio></div>`;
                } else {
                    media = `<div class="chat-msg-media"><a class="chat-msg-file" href="${escapeAttr(url)}" target="_blank" rel="noopener">Download attachment</a></div>`;
                }
            }
        }
        const av = escapeAttr(
            cachedPeerAvatarUrl(m.sender, m.sender_avatar || null),
        );
        const ph = escapeHtml(initialsOf(m.sender || "?"));
        const side = mine ? "mine" : "";
        const avatarBlock = mine
            ? `<span class="chat-msg-avatar chat-msg-avatar-mine"><img class="avatar-img" src="${av}" alt="" loading="lazy" /><span class="avatar-fallback">${ph}</span></span>`
            : `<span class="chat-msg-avatar"><img class="avatar-img" src="${av}" alt="" loading="lazy" /><span class="avatar-fallback">${ph}</span></span>`;
        const bubble = `<div class="chat-msg-inner">${media}<div class="chat-msg-text">${bodyText}</div></div>`;
        return `<div class="chat-msg ${side}">${mine ? "" : avatarBlock}${bubble}${mine ? avatarBlock : ""}</div>`;
    }
    async hydratePostCards(root) {
        const nodes = root?.querySelectorAll(".chat-msg-post[data-post]") || [];
        for (const node of nodes) {
            try {
                const post = JSON.parse(node.dataset.post || "{}");
                if (!post?.file) continue;
                node.innerHTML = "";
                const card = new Card(post);
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
            await Request.post(
                "https://dyscover.ielectro.com/api/chat/thread-delete",
                { thread_id: threadId },
            );
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
        if (!file || !this.selfUsername) return;
        this.attachInput.value = "";
        const fd = new FormData();
        fd.append("file", file);
        try {
            const res = await Request.post(
                "https://dyscover.ielectro.com/api/chat/upload",
                fd,
            );
            const url = res.data?.url;
            const kind = res.data?.msg_kind || "file";
            if (!url) {
                Alert.error("Upload failed");
                return;
            }
            this.pendingAttachment = { url, msg_kind: kind };
            const hint = document.createElement("p");
            hint.className = "chat-attach-hint";
            hint.textContent =
                kind === "audio"
                    ? "Audio ready — add a caption (optional) and send."
                    : "Attachment ready — add a caption (optional) and send.";
            this.chatMessages?.appendChild(hint);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        } catch (e) {
            const msg =
                typeof e === "object" && e && e.text ? e.text : "Upload failed";
            Alert.error(msg);
        }
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
        const payload = {
            thread_id: this.selectedThreadId,
            message,
        };
        if (this.pendingAttachment) {
            payload.msg_kind = this.pendingAttachment.msg_kind;
            payload.attachment_url = this.pendingAttachment.url;
        }
        this._sending = true;
        this.sendMessageBtn?.setAttribute("disabled", "disabled");
        try {
            const res = await Request.post(
                "https://dyscover.ielectro.com/api/chat/send",
                payload,
            );
            if (res?.status === false) {
                throw res;
            }
            if (this.messageInput) this.messageInput.value = "";
            this.pendingAttachment = null;
            this.chatMessages
                ?.querySelectorAll(".chat-attach-hint")
                .forEach((n) => n.remove());
            await this.loadThreads({ silent: true });
            await this.loadMessages({ silent: true });
            Navbar.refresh().catch(() => { });
        } catch {
        } finally {
            this._sending = false;
            this.sendMessageBtn?.removeAttribute("disabled");
        }
    }
}
function normalizeThread(t) {
    const peer = t.peer || t.participant_username || "";
    return {
        ...t,
        id: t.id,
        peer,
        peer_avatar: t.peer_avatar || cachedPeerAvatarUrl(peer, null),
        has_unread: Boolean(t.has_unread),
        last_message: t.last_message || "",
    };
}
function initialsOf(name) {
    return String(name)
        .replace(/^@/, "")
        .split(/[\s_]+/)
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";
}
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
}
function wireAvatarImg(img) {
    if (!img || img.dataset.wired === "1") return;
    img.dataset.wired = "1";
    const wrap = img.parentElement;
    const ph = wrap?.querySelector(".avatar-fallback, .chat-header-avatar-ph, .chat-suggest-avatar-ph");
    const onErr = () => {
        img.style.display = "none";
        if (ph) ph.style.display = "flex";
    };
    img.addEventListener("error", onErr);
    img.addEventListener("load", () => {
        if (ph) ph.style.display = "none";
    });
    if (!img.complete || img.naturalWidth === 0) {
        if (img.src && img.complete && img.naturalWidth === 0) onErr();
    } else if (ph) {
        ph.style.display = "none";
    }
}

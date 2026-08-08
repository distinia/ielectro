import { Api } from "./api.js";
import { App } from "./app.js";
import { Request, Icons } from "./nesh.js";
import { Alert } from "./alert.js";
import { Mention } from "./mention.js";
import { Overlay } from "./overlay.js";

export class Comments {
    constructor(card) {
        this.card = card;
        this.replyTo = null;
        this.expandedThreads = new Set();
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
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `${weeks}w`;
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
        });
    }

    likesLabel(count) {
        const n = Number(count) || 0;
        if (n <= 0) return "";
        return n === 1 ? "1 like" : `${n} likes`;
    }

    errorMessage(err, fallback) {
        if (typeof err === "object" && (err?.message || err?.text)) {
            return err.message || err.text;
        }
        return fallback;
    }

    buildTree(rows) {
        const map = new Map();
        const roots = [];
        rows.forEach((row) => {
            map.set(row.id, { ...row, replies: [] });
        });
        rows.forEach((row) => {
            const node = map.get(row.id);
            if (row.parent_id && map.has(row.parent_id)) {
                map.get(row.parent_id).replies.push(node);
            } else {
                roots.push(node);
            }
        });
        return roots;
    }

    countReplies(replies = []) {
        let total = 0;
        replies.forEach((reply) => {
            total += 1;
            if (reply.replies?.length) {
                total += this.countReplies(reply.replies);
            }
        });
        return total;
    }

    flattenReplies(replies = [], rootUsername = "") {
        let html = "";
        const walk = (items, parentUsername) => {
            items.forEach((reply) => {
                html += this.commentRowHtml(reply, {
                    isReply: true,
                    parentUsername,
                });
                if (reply.replies?.length) {
                    walk(reply.replies, reply.username);
                }
            });
        };
        walk(replies, rootUsername);
        return html;
    }

    commentBodyHtml(c, parentUsername = "") {
        const body = String(c.body || "");
        const mention = parentUsername
            ? `@${String(parentUsername).replace(/^@/, "")}`
            : "";
        if (
            mention &&
            !body.toLowerCase().startsWith(mention.toLowerCase())
        ) {
            const profile = `https://dyscover.ielectro.com/users/${encodeURIComponent(parentUsername)}`;
            return `<span class="post-comment-reply-to"><a class="mention-link" href="${profile}"><strong>${App.escapeHtml(mention)}</strong></a></span> ${Mention.linkify(body)}`;
        }
        return Mention.linkify(body);
    }

    commentRowHtml(c, { isReply = false, parentUsername = "" } = {}) {
        const profile = `https://dyscover.ielectro.com/users/${encodeURIComponent(c.username || "")}`;
        const liked = c.liked ? " is-liked" : "";
        const likes = Number(c.likes) || 0;
        const likesText = this.likesLabel(likes);
        const replyClass = isReply ? " post-comment--reply" : "";
        return `<article class="post-comment${replyClass}" data-comment-id="${c.id}">
            <a class="post-comment-avatar-link" href="${profile}">
                <img class="post-comment-avatar" src="${App.escapeAttr(c.avatar || "")}" alt="">
            </a>
            <div class="post-comment-shell">
                <div class="post-comment-content">
                    <p class="post-comment-line">
                        <a class="post-comment-user" href="${profile}"><strong>${App.escapeHtml(c.username || "unknown")}</strong></a>
                        <span class="post-comment-text">${this.commentBodyHtml(c, parentUsername)}</span>
                    </p>
                    <div class="post-comment-meta">
                        <time class="post-comment-date">${this.formatCommentDate(c.created_at)}</time>
                        ${likesText ? `<span class="post-comment-likes-count">${likesText}</span>` : ""}
                        <button type="button" class="post-comment-action" data-action="reply" data-id="${c.id}" data-user="${App.escapeAttr(c.username || "")}">Reply</button>
                        ${c.own ? `<div class="post-comment-menu">
                            <button type="button" class="post-comment-menu-btn" data-action="menu" data-id="${c.id}" aria-label="Comment options"><i data-icon="three-dots"></i></button>
                            <div class="post-comment-menu-pop" hidden>
                                <button type="button" data-action="delete" data-id="${c.id}">Delete</button>
                            </div>
                        </div>` : ""}
                    </div>
                </div>
                <button type="button" class="post-comment-like-btn${liked}" data-action="like" data-id="${c.id}" aria-label="Like comment">
                    <i data-icon="heart"></i>
                </button>
            </div>
        </article>`;
    }

    viewRepliesLabel(count, expanded = false) {
        const total = Number(count) || 0;
        if (expanded) {
            return `<span class="post-comment-view-replies-line" aria-hidden="true"></span>Hide replies`;
        }
        return `<span class="post-comment-view-replies-line" aria-hidden="true"></span>View replies (${total})`;
    }

    threadHtml(c) {
        const replies = c.replies || [];
        const replyCount = this.countReplies(replies);
        const row = this.commentRowHtml(c, { isReply: false });
        if (!replyCount) {
            return `<div class="post-comment-thread">${row}</div>`;
        }
        const expanded = this.expandedThreads.has(c.id);
        return `<div class="post-comment-thread" data-thread-id="${c.id}">
            ${row}
            <button type="button" class="post-comment-view-replies" data-action="toggle-replies" data-count="${replyCount}" aria-expanded="${expanded ? "true" : "false"}">
                ${this.viewRepliesLabel(replyCount, expanded)}
            </button>
            <div class="post-comment-replies"${expanded ? "" : " hidden"}>
                ${this.flattenReplies(replies, c.username)}
            </div>
        </div>`;
    }

    renderRows(list, rows) {
        const tree = this.buildTree(rows);
        list.innerHTML = tree.length
            ? tree.map((c) => this.threadHtml(c)).join("")
            : "";
    }

    syncCommentCount(root, delta = 0) {
        if (delta !== 0) {
            this.item.comments = Math.max(
                0,
                (Number(this.item.comments) || 0) + delta,
            );
        }
        const line = root?.querySelector(".post-likes-line");
        if (line) {
            line.innerHTML = this.card.engagementLineHtml(this.item);
        }
    }

    async fetchRows() {
        const res = await Request.get(Api.postComments(this.item.id));
        return Api.list(res);
    }

    getComposeInput(root) {
        return root?.querySelector(".post-comment-input");
    }

    setReplyTarget(root, commentId = null, username = "") {
        if (commentId) {
            this.replyTo = { id: commentId, username };
        } else {
            this.replyTo = null;
        }
        const input = this.getComposeInput(root);
        if (input) {
            input.placeholder = commentId
                ? `Reply to @${username}…`
                : "Add a comment…";
        }
        root
            ?.querySelectorAll(".post-comment.is-reply-target")
            .forEach((el) => el.classList.remove("is-reply-target"));
        if (commentId) {
            root
                ?.querySelector(`[data-comment-id="${commentId}"]`)
                ?.classList.add("is-reply-target");
        }
    }

    closeMenus(list) {
        list?.querySelectorAll(".post-comment-menu-pop").forEach((pop) => {
            pop.hidden = true;
        });
    }

    updateLikeUi(commentEl, liked, likes) {
        const btn = commentEl?.querySelector(".post-comment-like-btn");
        const meta = commentEl?.querySelector(".post-comment-likes-count");
        btn?.classList.toggle("is-liked", liked);
        const label = this.likesLabel(likes);
        if (meta) {
            meta.textContent = label;
            meta.hidden = !label;
        } else if (label) {
            const date = commentEl?.querySelector(".post-comment-date");
            const span = document.createElement("span");
            span.className = "post-comment-likes-count";
            span.textContent = label;
            date?.insertAdjacentElement("afterend", span);
        }
    }

    findThreadIdForComment(rows, commentId) {
        const byId = new Map(rows.map((row) => [row.id, row]));
        let current = byId.get(commentId);
        while (current?.parent_id) {
            const parent = byId.get(current.parent_id);
            if (!parent) break;
            if (!parent.parent_id) {
                return parent.id;
            }
            current = parent;
        }
        return null;
    }

    async submitComment(text, root) {
        const payload = { body: text };
        if (this.replyTo?.id) {
            payload.parent_id = this.replyTo.id;
        }
        await Request.post(Api.postComments(this.item.id), payload);
        this.syncCommentCount(root, 1);
        if (this.replyTo?.id) {
            const rows = await this.fetchRows();
            const threadId = this.findThreadIdForComment(rows, this.replyTo.id);
            if (threadId) {
                this.expandedThreads.add(threadId);
            }
        }
        this.setReplyTarget(root, null);
        await this.renderInline(root);
    }

    bindListActions(list, root) {
        if (!list || list.dataset.bound === "1") return;
        list.dataset.bound = "1";

        list.addEventListener("click", async (event) => {
            const actionEl = event.target.closest("[data-action]");
            if (!actionEl || !list.contains(actionEl)) return;
            const action = actionEl.dataset.action;
            const commentId = Number(actionEl.dataset.id);
            const commentEl = actionEl.closest(".post-comment");

            if (action === "toggle-replies") {
                event.preventDefault();
                const thread = actionEl.closest(".post-comment-thread");
                const replies = thread?.querySelector(".post-comment-replies");
                const threadId = Number(thread?.dataset.threadId);
                if (!replies) return;
                const willExpand = replies.hidden;
                replies.hidden = !willExpand;
                actionEl.setAttribute(
                    "aria-expanded",
                    willExpand ? "true" : "false",
                );
                actionEl.innerHTML = this.viewRepliesLabel(
                    actionEl.dataset.count,
                    willExpand,
                );
                if (threadId > 0) {
                    if (willExpand) {
                        this.expandedThreads.add(threadId);
                    } else {
                        this.expandedThreads.delete(threadId);
                    }
                }
                return;
            }

            if (action === "reply" && commentId) {
                this.setReplyTarget(
                    root,
                    commentId,
                    actionEl.dataset.user || "",
                );
                this.getComposeInput(root)?.focus();
                return;
            }

            if (action === "menu" && commentId) {
                event.stopPropagation();
                const pop = commentEl?.querySelector(".post-comment-menu-pop");
                if (!pop) return;
                const willOpen = pop.hidden;
                this.closeMenus(list);
                pop.hidden = !willOpen;
                return;
            }

            if (action === "like" && commentId) {
                const liked = actionEl.classList.contains("is-liked");
                const countEl = commentEl?.querySelector(
                    ".post-comment-likes-count",
                );
                const current = Number(
                    String(countEl?.textContent || "0").replace(/\D/g, ""),
                );
                try {
                    if (liked) {
                        await Request.delete(
                            Api.postCommentLikes(this.item.id, commentId),
                        );
                        this.updateLikeUi(
                            commentEl,
                            false,
                            Math.max(0, current - 1),
                        );
                    } else {
                        await Request.post(
                            Api.postCommentLikes(this.item.id, commentId),
                        );
                        this.updateLikeUi(commentEl, true, current + 1);
                    }
                } catch (err) {
                    Alert.error(
                        this.errorMessage(err, "Unable to update like"),
                    );
                }
                return;
            }

            if (action === "delete" && commentId) {
                this.closeMenus(list);
                try {
                    const res = await Request.delete(
                        Api.postComment(this.item.id, commentId),
                    );
                    const payload =
                        Api.record(res) ||
                        (res && typeof res === "object" ? res : null);
                    const removed = Number(payload?.removed) || 1;
                    this.syncCommentCount(root, -removed);
                    this.setReplyTarget(root, null);
                    await this.renderInline(root);
                } catch (err) {
                    Alert.error(
                        this.errorMessage(err, "Unable to delete comment"),
                    );
                }
            }
        });

        document.addEventListener("click", (event) => {
            if (event.target.closest(".post-comment-menu")) return;
            this.closeMenus(list);
        });
    }

    bindCompose(root) {
        const input = this.getComposeInput(root);
        const sendBtn = root?.querySelector(".post-comment-send-btn");
        if (!input) return;
        const submit = async () => {
            const text = input.value.trim();
            if (!text) return;
            try {
                await this.submitComment(text, root);
                input.value = "";
            } catch (err) {
                Alert.error(this.errorMessage(err, "Comment failed"));
            }
        };
        sendBtn?.addEventListener("click", submit);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                submit();
            }
            if (e.key === "Escape") {
                this.setReplyTarget(root, null);
            }
        });
    }

    async renderInline(root) {
        const list = root?.querySelector(".post-comments-list");
        if (!list) return;
        try {
            const rows = await this.fetchRows();
            this.renderRows(list, rows);
            if (list.dataset.bound !== "1") {
                this.bindListActions(list, root);
            }
            await Icons.load(list);
            list.querySelectorAll(".post-comment-avatar").forEach((img) =>
                App.wireAvatarImg(img),
            );
        } catch {
            list.innerHTML = "";
        }
    }

    async bindInline(root) {
        const list = root?.querySelector(".post-comments-list");
        const compose = root?.querySelector(".post-comment-compose-inline");
        const input = this.getComposeInput(root);
        if (!list || !compose || !input) return;
        await this.renderInline(root);
        this.bindCompose(root);
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
            const root = body;
            await this.renderInline(root);
            this.bindCompose(root);
            await Icons.load(body);
        });
    }
}

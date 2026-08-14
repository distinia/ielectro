import { App } from "./app.js";
export class EmptyState {
    static html({ icon = "sparkles", title, message, action = null, compact = false }) {
        let actionHtml = "";
        if (action?.href) {
            actionHtml = `<a class="button empty-state-action" href="${App.escapeAttr(action.href)}">${App.escapeHtml(action.label)}</a>`;
        } else if (action?.label) {
            actionHtml = `<button type="button" class="button empty-state-action" data-empty-action="${App.escapeAttr(action.id || "default")}">${App.escapeHtml(action.label)}</button>`;
        }
        return `<div class="empty-state${compact ? " empty-state--compact" : ""}">
            <div class="empty-state-icon"><i data-icon="${App.escapeAttr(icon)}"></i></div>
            <h3 class="empty-state-title">${App.escapeHtml(title)}</h3>
            <p class="empty-state-message">${App.escapeHtml(message)}</p>
            ${actionHtml}
        </div>`;
    }
    static mount(container, options, onAction) {
        if (!container) return null;
        container.innerHTML = EmptyState.html(options);
        const btn = container.querySelector(".empty-state-action[data-empty-action]");
        if (btn && onAction) {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                onAction(e);
            });
        }
        return container.querySelector(".empty-state");
    }
    static bindAction(root, onAction) {
        root?.querySelector(".empty-state-action[data-empty-action]")?.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                onAction?.(e);
            },
        );
    }
    static creatorType(type) {
        const map = {
            article: {
                icon: "globe",
                title: "No articles yet",
                message: "Publish your first article and start sharing your ideas.",
                action: { label: "Create your first article", id: "create" },
            },
            image: {
                icon: "image",
                title: "No images yet",
                message: "Upload visuals that stand out in the feed.",
                action: { label: "Upload your first image", id: "create" },
            },
            video: {
                icon: "video",
                title: "No videos yet",
                message: "Share motion and sound with your followers.",
                action: { label: "Upload your first video", id: "create" },
            },
            audio: {
                icon: "music",
                title: "No audio yet",
                message: "Drop a track or clip for your community to enjoy.",
                action: { label: "Upload your first audio", id: "create" },
            },
            document: {
                icon: "file-text",
                title: "No documents yet",
                message: "Share PDFs and files your audience can explore.",
                action: { label: "Upload your first document", id: "create" },
            },
            template: {
                icon: "sparkles",
                title: "No templates yet",
                message: "Build reusable layouts for faster publishing.",
                action: { label: "Create your first template", id: "create" },
            },
        };
        return map[type] || map.article;
    }
    static feed() {
        return {
            icon: "home",
            title: "Nothing in your feed yet",
            message:
                "The feed will update when people you follow share new posts.",
            action: {
                label: "Explore creators",
                href: "https://dyscover.ielectro.com/explore",
            },
        };
    }
    static profilePosts({ isOwn, username } = {}) {
        return {
            icon: "image",
            title: "No posts yet",
            message: isOwn
                ? "Your posts will show up here once you publish from Creator Center."
                : `${username ? `@${username}` : "This user"} hasn't shared anything yet.`,
            action: isOwn
                ? {
                      label: "Open Creator Center",
                      href: "https://dyscover.ielectro.com/creator-center",
                  }
                : {
                      label: "Explore Dyscover",
                      href: "https://dyscover.ielectro.com/explore",
                  },
        };
    }
    static exploreSearch(type, term) {
        const labels = {
            user: "users",
            article: "articles",
            image: "images",
            video: "videos",
            audio: "audio",
            document: "documents",
            template: "templates",
        };
        const label = labels[type] || "results";
        const query = String(term || "").trim();
        return {
            icon: type === "user" ? "user" : "search",
            title: query ? `No ${label} for “${query}”` : `No ${label} found`,
            message: query
                ? "Try a different keyword or check the spelling."
                : "Start typing in the search bar to discover content.",
            compact: true,
        };
    }
    static exploreRecents(type) {
        const labels = {
            article: "articles",
            image: "images",
            video: "videos",
            audio: "audio",
            document: "documents",
            template: "templates",
        };
        const label = labels[type] || "posts";
        return {
            icon: "search",
            title: `No recent ${label}`,
            message: "New content shows up here as creators publish on Dyscover.",
            action: {
                label: "Search Dyscover",
                href: "https://dyscover.ielectro.com/explore",
            },
            compact: true,
        };
    }
    static profileGrid({ filter, typeFilter, isOwn, username }) {
        if (filter === "saved") {
            return {
                icon: "bookmark",
                title: "Nothing saved yet",
                message: isOwn
                    ? "Bookmark posts you love — they'll appear in this tab."
                    : "This user hasn't saved any posts yet.",
                action: isOwn
                    ? {
                          label: "Explore Dyscover",
                          href: "https://dyscover.ielectro.com/explore",
                      }
                    : null,
            };
        }
        if (filter === "liked") {
            return {
                icon: "heart",
                title: "No liked posts yet",
                message: isOwn
                    ? "Posts you like will be collected here."
                    : "This user hasn't liked any posts yet.",
                action: isOwn
                    ? { label: "Browse your feed", href: "https://dyscover.ielectro.com" }
                    : null,
            };
        }
        if (filter === "reposts") {
            return {
                icon: "repeat",
                title: "No reposts yet",
                message: isOwn
                    ? "Posts you repost will appear in this tab."
                    : "This user hasn't reposted anything yet.",
            };
        }
        if (filter === "mentioned") {
            return {
                icon: "at-sign",
                title: "No mentions yet",
                message: isOwn
                    ? "When someone mentions you in a post, it shows up here."
                    : "This user hasn't been mentioned in any posts yet.",
            };
        }
        const typeLabels = {
            article: "articles",
            image: "images",
            video: "videos",
            audio: "audio",
            document: "documents",
            template: "templates",
        };
        const label = typeLabels[typeFilter] || "posts";
        return {
            icon: typeFilter === "article" ? "globe" : "image",
            title: `No ${label} yet`,
            message: isOwn
                ? `Publish from Creator Center and your ${label} will show up here.`
                : `${username ? `@${username}` : "This user"} hasn't shared any ${label} yet.`,
            action: isOwn
                ? {
                      label: "Open Creator Center",
                      href: "https://dyscover.ielectro.com/creator-center",
                  }
                : null,
        };
    }
    static activity() {
        return {
            icon: "bell",
            title: "All quiet for now",
            message: "Likes, follows, and mentions from your network will appear here.",
            compact: true,
        };
    }
    static usersList(term) {
        if (term) {
            return {
                icon: "search",
                title: "No users found",
                message: "Try another username or follow more people.",
                compact: true,
            };
        }
        return {
            icon: "user",
            title: "No one here yet",
            message: "Follow creators to start a conversation.",
            compact: true,
        };
    }
    static inbox() {
        return {
            icon: "message-circle",
            title: "Start a conversation",
            message: "Tap New to message someone you follow.",
            compact: true,
        };
    }
    static profileNotFound() {
        return {
            icon: "user",
            title: "Profile not found",
            message: "This username doesn't exist or isn't available on Dyscover.",
        };
    }
}

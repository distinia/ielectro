import { App, Alert } from "../core/index.js";

export class CreatorCopyLink {
    static TYPE_LABELS = {
        article: "Article",
        image: "Image",
        video: "Video",
        audio: "Audio",
        document: "Document",
        template: "Template",
    };

    static async run(selected = []) {
        if (!selected.length) {
            Alert.error("Select at least one item");
            return;
        }
        const lines = selected
            .map((post) => this.formatLine(post))
            .filter(Boolean);
        if (!lines.length) {
            Alert.error("No links to copy");
            return;
        }
        const text = lines.join("\n");
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                this.copyFallback(text);
            }
            Alert.success(
                lines.length === 1
                    ? "Link copied"
                    : `${lines.length} links copied`,
            );
        } catch {
            try {
                this.copyFallback(text);
                Alert.success(
                    lines.length === 1
                        ? "Link copied"
                        : `${lines.length} links copied`,
                );
            } catch {
                Alert.error("Could not copy links");
            }
        }
    }

    static formatLine(post) {
        const item = App.enrichPost(post?.item || {});
        const title = String(item.title || post?.title || "Untitled")
            .trim()
            .replace(/\s+/g, " ");
        const type = String(item.type || post?.constructor?.type || "")
            .toLowerCase();
        const typeLabel =
            this.TYPE_LABELS[type] ||
            (type ? type.charAt(0).toUpperCase() + type.slice(1) : "Post");
        const url = this.linkUrl(item, type, post);
        if (!url) {
            return "";
        }
        return `${title}|${typeLabel}|${url}`;
    }

    static linkUrl(item, type, post = null) {
        if (type === "article") {
            return String(item.url || "").trim();
        }
        if (type === "template") {
            const id = item.id ?? post?.id;
            return id != null && String(id).trim() !== ""
                ? String(id).trim()
                : "";
        }
        return String(item.media || item.preview_image || item.url || "").trim();
    }

    static copyFallback(text) {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        if (!ok) {
            throw new Error("Copy failed");
        }
    }
}

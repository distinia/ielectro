import { Api } from "../core/api.js";
import { App, Alert } from "../core/index.js";

export class CreatorDownload {
    static async run(selected = []) {
        if (!selected.length) {
            Alert.error("Select at least one item");
            return;
        }
        let ok = 0;
        let failed = 0;
        for (let index = 0; index < selected.length; index++) {
            const post = selected[index];
            try {
                const downloaded = await this.downloadPost(post);
                if (downloaded) {
                    ok += 1;
                } else {
                    failed += 1;
                }
            } catch {
                failed += 1;
            }
            if (index < selected.length - 1) {
                await this.pause(350);
            }
        }
        if (ok && !failed) {
            Alert.success(
                ok === 1 ? "Download started" : `${ok} downloads started`,
            );
            return;
        }
        if (ok && failed) {
            Alert.info(`Downloaded ${ok}, failed ${failed}`);
            return;
        }
        Alert.error("Could not download selected items");
    }
    static async downloadPost(post) {
        const item = App.enrichPost(post?.item || {});
        const type = String(item.type || post?.constructor?.type || "").toLowerCase();
        if (type === "article") {
            return this.downloadArticlePdf(item);
        }
        return this.downloadMediaFile(item);
    }
    static async downloadArticlePdf(item) {
        const uuid = String(item.uuid || "").trim();
        if (!uuid) {
            return false;
        }
        const response = await fetch(Api.articlePdf(uuid), {
            method: "GET",
            credentials: "include",
        });
        if (!response.ok) {
            return false;
        }
        const blob = await response.blob();
        if (!blob.size) {
            return false;
        }
        this.saveBlob(blob, this.articleFileName(item.title));
        return true;
    }
    static async downloadMediaFile(item) {
        const url = String(item.media || item.preview_image || "").trim();
        if (!url || url.startsWith("data:")) {
            return false;
        }
        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
        });
        if (!response.ok) {
            return false;
        }
        const blob = await response.blob();
        if (!blob.size) {
            return false;
        }
        this.saveBlob(blob, this.mediaFileName(item, url, blob.type));
        return true;
    }
    static saveBlob(blob, filename) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
    }
    static articleFileName(title) {
        const base = this.safeBase(title, "Article");
        return `${base} - iElectro Dyscover.pdf`;
    }
    static mediaFileName(item, url, mime = "") {
        const base = this.safeBase(item.title, String(item.type || "file"));
        const fromUrl = this.extensionFromUrl(url);
        const fromMime = this.extensionFromMime(mime);
        const fromItem = String(item.extension || "")
            .replace(/^\./, "")
            .toLowerCase();
        const ext = fromUrl || fromItem || fromMime || "bin";
        return `${base}.${ext}`;
    }
    static safeBase(value, fallback = "file") {
        return (
            String(value || fallback)
                .trim()
                .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
                .replace(/\s+/g, " ")
                .slice(0, 120) || fallback
        );
    }
    static extensionFromUrl(url) {
        try {
            const path = new URL(url, window.location.origin).pathname;
            const match = path.match(/\.([a-z0-9]{1,8})$/i);
            return match ? match[1].toLowerCase() : "";
        } catch {
            return "";
        }
    }
    static extensionFromMime(mime) {
        const map = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif",
            "video/mp4": "mp4",
            "video/webm": "webm",
            "audio/mpeg": "mp3",
            "audio/wav": "wav",
            "audio/ogg": "ogg",
            "application/pdf": "pdf",
        };
        return map[String(mime || "").toLowerCase()] || "";
    }
    static pause(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

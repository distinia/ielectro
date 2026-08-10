export class CreatorMedia {
    static renderPreview(preview, url, fileOrMeta) {
        if (!preview) return;
        preview.innerHTML = "";
        const type =
            typeof fileOrMeta === "object" && fileOrMeta?.type
                ? String(fileOrMeta.type)
                : "";
        const mime =
            typeof fileOrMeta === "object" && fileOrMeta?.type?.includes("/")
                ? fileOrMeta.type
                : "";
        if (
            mime.startsWith("image/") ||
            type === "image" ||
            type === "template" ||
            type === "article"
        ) {
            preview.innerHTML = `<img src="${url}" alt="" loading="lazy">`;
        } else if (mime.startsWith("video/") || type === "video") {
            preview.innerHTML = `<video controls src="${url}" loading="lazy" preload="none"></video>`;
        } else if (mime.startsWith("audio/") || type === "audio") {
            preview.innerHTML = `<audio controls src="${url}" preload="none"></audio>`;
        } else if (
            mime === "application/pdf" ||
            type === "document" ||
            String(fileOrMeta?.name || "").toLowerCase().endsWith(".pdf")
        ) {
            preview.innerHTML = `<iframe class="pdf-preview-frame" src="${url}" title="PDF preview" loading="lazy"></iframe>`;
        } else {
            preview.innerHTML = `<p>${fileOrMeta?.name || "Preview"}</p>`;
        }
    }
}

import { Alert } from "../core/index.js";
import { Api } from "../core/api.js";
import { App } from "../core/app.js";
import { withArticleLoading } from "./article-loading.js";
export class ArticlePdf {
    static async export() {
        const uuid =
            document.body.dataset.uuid ||
            App.urlLastPart().replace(/\.html$/i, "").split("#")[0];
        const title =
            document.querySelector(".title")?.textContent?.trim() || "Article";
        if (!uuid) {
            Alert.error("Article not found");
            return;
        }
        try {
            await withArticleLoading(async () => {
                const response = await fetch(Api.articlePdf(uuid), {
                    method: "GET",
                    credentials: "include",
                });
                if (!response.ok) {
                    throw new Error("Export failed");
                }
                const blob = await response.blob();
                if (!blob.size) {
                    throw new Error("Empty PDF");
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = this.fileName(title);
                link.rel = "noopener";
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            });
        } catch {
            Alert.error("Could not export PDF");
        }
    }
    static fileName(title) {
        const base =
            String(title || "Article")
                .trim()
                .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
                .slice(0, 120) || "Article";
        return `${base} - iElectro Dyscover.pdf`;
    }
}

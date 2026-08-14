import { Alert } from "../core/index.js";

const HTML2PDF_SRC =
    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

export class ArticlePdf {
    static _loading = null;

    static async export() {
        const source = document.querySelector(".article-main-content");
        const title = document.querySelector(".title")?.textContent?.trim() || "article";
        const contentHtml = document.querySelector(".content")?.innerHTML?.trim() || "";

        if (!source || !contentHtml) {
            Alert.error("Nothing to export");
            return;
        }

        document.body.classList.add("article-pdf-exporting");

        try {
            await this.resolveLazyImages(source);
            await this.waitForImages(source);
            await this.waitForLayout();

            const width = Math.max(source.scrollWidth, source.offsetWidth, 794);
            const height = Math.max(source.scrollHeight, source.offsetHeight, 200);

            const html2pdf = await this.loadHtml2Pdf();
            await html2pdf()
                .set({
                    margin: [10, 10, 12, 10],
                    filename: this.fileName(title),
                    image: { type: "jpeg", quality: 0.92 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        width,
                        height,
                        windowWidth: width,
                        windowHeight: height,
                        scrollX: 0,
                        scrollY: -window.scrollY,
                    },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                    pagebreak: { mode: ["css", "legacy"] },
                })
                .from(source)
                .save();

            Alert.success("PDF downloaded");
        } catch {
            Alert.error("Could not export PDF");
        } finally {
            document.body.classList.remove("article-pdf-exporting");
        }
    }

    static resolveLazyImages(root) {
        root.querySelectorAll("img").forEach((img) => {
            const src =
                img.currentSrc ||
                img.src ||
                img.getAttribute("data-src") ||
                img.getAttribute("data-lazy-src");
            if (src && !img.src) {
                img.src = src;
            }
        });
    }

    static async waitForLayout() {
        await new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
        });
    }

    static async waitForImages(root) {
        const images = [...root.querySelectorAll("img")];
        await Promise.all(
            images.map(
                (img) =>
                    new Promise((resolve) => {
                        if (img.complete && img.naturalWidth > 0) {
                            resolve();
                            return;
                        }
                        img.onload = () => resolve();
                        img.onerror = () => resolve();
                    }),
            ),
        );
    }

    static fileName(title) {
        const base =
            String(title || "article")
                .trim()
                .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 80) || "article";
        return `${base}.pdf`;
    }

    static loadHtml2Pdf() {
        if (window.html2pdf) {
            return Promise.resolve(window.html2pdf);
        }
        if (this._loading) {
            return this._loading;
        }
        this._loading = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = HTML2PDF_SRC;
            script.async = true;
            script.onload = () => {
                if (window.html2pdf) {
                    resolve(window.html2pdf);
                    return;
                }
                reject(new Error("html2pdf unavailable"));
            };
            script.onerror = () => reject(new Error("html2pdf load failed"));
            document.head.appendChild(script);
        });
        return this._loading;
    }
}

import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Api } from "../core/api.js";

export class News {
    constructor() {
        this.list = document.querySelector(".news-list");
        this.next = document.querySelector(".news-next");
        this.articleId = this.resolveArticleId();
    }
    resolveArticleId() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code && /^\d+$/.test(code)) {
            return Number(code);
        }
        const parts = window.location.pathname.split("/").filter(Boolean);
        if (parts[0] === "news" && parts[1] && /^\d+$/.test(parts[1])) {
            return Number(parts[1]);
        }
        return null;
    }
    async load() {
        if (!this.list) return;
        try {
            if (this.articleId) {
                await this.renderArticle(this.articleId);
                return;
            }
            await this.renderList();
        } catch {
            this.list.innerHTML = '<div class="card">Unable to load news.</div>';
            this.hideNext();
        }
    }
    async renderArticle(id) {
        const response = await Nesh.Request.get(`${Api.base}/news/${id}`);
        const item = Api.record(response);
        if (!item || item.status !== "published") {
            this.list.innerHTML = '<div class="card">News not found.</div>';
            this.hideNext();
            return;
        }
        const when = Nesh.Html.escape(item.published_at || item.created_at || "");
        this.list.innerHTML = `<article class="news-article"><header class="news-article-header"><a class="news-back" href="/news">← Back to all news</a><h1 class="news-article-title">${Nesh.Html.escape(item.title)}</h1><div class="news-article-meta"><span>${when}</span></div></header>${item.image ? `<div class="news-article-cover"><img src="${Nesh.Html.escape(item.image)}" alt="${Nesh.Html.escape(item.title)}" loading="lazy"></div>` : ""}<div class="news-article-body">${this.asParagraphs(item.body)}</div></article>`;
        this.hideNext();
    }
    async renderList() {
        const response = await Nesh.Request.get(`${Api.base}/news`);
        const items = Api.published(Api.list(response));
        if (!items.length) {
            this.list.innerHTML = '<div class="card">No news available.</div>';
            this.hideNext();
            return;
        }
        this.list.innerHTML = items.map((item) => this.summaryHtml(item)).join("");
        this.hideNext();
    }
    summaryHtml(item) {
        const when = Nesh.Html.escape(item.published_at || item.created_at || "");
        const preview = this.previewText(item.body || "");
        const image = item.image
            ? `<img class="news-summary-image" src="${Nesh.Html.escape(item.image)}" alt="${Nesh.Html.escape(item.title)}" loading="lazy">`
            : "";
        return `<article class="card news-summary-card">${image}<div><h3 class="card-title">${Nesh.Html.escape(item.title)}</h3><p class="card-description">${preview}</p><div class="news-meta">${when}</div><a class="button button-primary" href="/news/${item.id}">Open</a></div></article>`;
    }
    previewText(text) {
        const escaped = Nesh.Html.escape(String(text)).replace(/\r\n|\r|\n/g, "\n");
        return escaped.length > 220 ? `${escaped.slice(0, 220)}…` : escaped;
    }
    asParagraphs(text) {
        const parts = String(text || "")
            .split(/\n{2,}/g)
            .map((part) => part.trim())
            .filter(Boolean);
        if (!parts.length) {
            return "<p></p>";
        }
        return parts
            .map(
                (part) =>
                    `<p>${Nesh.Html.escape(part).replace(/\n/g, "<br>")}</p>`,
            )
            .join("");
    }
    hideNext() {
        if (this.next) {
            this.next.style.display = "none";
        }
    }
}

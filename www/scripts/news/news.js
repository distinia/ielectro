import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { App } from "../core/index.js";

export async function initializeNews() {

    App.initialize();
    const list = document.querySelector('.news-list');
    const next = document.querySelector('.news-next');
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || '';
    let page = Number(params.get('page') || '1');
    const escText = (v) => Nesh.Html.escape(v).replace(/\r\n|\r|\n/g, '\n');
    const asParagraphs = (text) => {
        const raw = String(text || '');
        const parts = raw.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
        if (!parts.length) {
            return '<p></p>';
        }
        return parts.map((p) => `<p>${Nesh.Html.escape(p).replace(/\n/g, '<br>')}</p>`).join('');
    };
    const renderSingle = async () => {
        const data = await Nesh.Request.get(`https://www.ielectro.com/api/news/item?code=${encodeURIComponent(code)}`);
        const item = data?.data;
        if (!item) {
            list.innerHTML = '<div class="card">News not found.</div>';
            next.style.display = 'none';
            return;
        }
        const when = Nesh.Html.escape(item.published_at || item.created_at || '');
        list.innerHTML = `
            <article class="news-article">
                <header class="news-article-header">
                    <a class="news-back" href="/news?page=1">← Back to all news</a>
                    <h1 class="news-article-title">${Nesh.Html.escape(item.title)}</h1>
                    <div class="news-article-meta">
                        <span>${when}</span>
                        ${item.news_code ? `<span>·</span><span>${Nesh.Html.escape(item.news_code)}</span>` : ''}
                    </div>
                </header>
                ${item.image ? `
                    <div class="news-article-cover">
                        <img src="${Nesh.Html.escape(item.image)}" alt="${Nesh.Html.escape(item.title)}">
                    </div>
                ` : ''}
                <div class="news-article-body">
                    ${asParagraphs(item.body)}
                </div>
            </article>
        `;
        next.style.display = 'none';
    };
    const renderList = async () => {
        const all = [];
        let cur = Math.max(1, page);
        let total = 0;
        let perPage = 25;
        while (true) {
            const data = await Nesh.Request.get(`https://www.ielectro.com/api/news/list?page=${cur}`);
            const items = data?.data?.items || [];
            total = Number(data?.data?.total || 0);
            perPage = Number(data?.data?.per_page || 25);
            all.push(...items);
            if (!items.length || all.length >= total || cur > 40) {
                break;
            }
            cur++;
        }
        if (!all.length) {
            list.innerHTML = '<div class="card">No news available.</div>';
            next.style.display = 'none';
            return;
        }
        list.innerHTML = all.map((item) => {
            const when = Nesh.Html.escape(item.published_at || item.created_at || '');
            return `
                <article class="card news-summary-card">
                    ${item.image ? `<img class="news-summary-image" src="${Nesh.Html.escape(item.image)}" alt="${Nesh.Html.escape(item.title)}">` : ''}
                    <div>
                        <h3 class="card-title">${Nesh.Html.escape(item.title)}</h3>
                        <p class="card-description">
                            ${escText(item.body || '').slice(0, 220)}
                            ${(item.body || '').length > 220 ? '…' : ''}
                        </p>
                        <div class="news-meta">${when}</div>
                        <a class="button button-primary" href="/news/${Nesh.Html.escape(item.news_code)}">
                            Open
                        </a>
                    </div>
                </article>
            `;
        }).join('');
        next.style.display = 'none';
    };
    const render = code ? renderSingle : renderList;
    render().catch(() => {
        list.innerHTML = '<div class="card">Unable to load news.</div>';
        if (next) {
            next.style.display = 'none';
        }
    });

}

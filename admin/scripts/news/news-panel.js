import { Sidebar, App, Alert, Request } from "../core/index.js";
export default class NewsPanel {
    params() {
        return new URLSearchParams(window.location.search);
    }
    replaceUrl(query) {
        const u = new URL(window.location.href);
        if (!query || !Object.keys(query).length) u.search = '';
        else u.search = new URLSearchParams(query).toString();
        history.replaceState({}, '', u.pathname + u.search);
    }
    show(panelName) {
        document.querySelectorAll('.panel-list,.panel-form,.panel-view').forEach((el) => el.classList.add('panel-hidden'));
        const panelId = panelName === 'panel-list' ? 'panel-list' : panelName === 'panel-form' ? 'panel-form' : 'panel-view';
        document.querySelector(`.${panelId}`)?.classList.remove('panel-hidden');
        document.querySelectorAll('.toolbar-list,.toolbar-form,.toolbar-view').forEach((el) => el.classList.add('panel-hidden'));
        const toolbarId = panelId === 'panel-list' ? 'toolbar-list' : panelId === 'panel-form' ? 'toolbar-form' : 'toolbar-view';
        document.querySelector(`.${toolbarId}`)?.classList.remove('panel-hidden');
    }
    bindListFiltersOnce() {
        if (this._newsFiltersBound) {
            return;
        }
        this._newsFiltersBound = true;
        const q = document.querySelector('.news-filter-q');
        const sort = document.querySelector('.news-filter-sort');
        const redraw = () => this.renderNewsList();
        q?.addEventListener('input', redraw);
        sort?.addEventListener('change', redraw);
    }
    renderNewsList() {
        const node = document.querySelector('.news-list');
        const rows = this._newsRows || [];
        const q = document.querySelector('.news-filter-q')?.value || '';
        const sort = document.querySelector('.news-filter-sort')?.value || 'newest';
        const filtered = App.filterRows(rows, q, sort, {
            text: (r) => [r.title, r.body, r.news_code, r.published_at].filter(Boolean).join(' '),
            time: (r) => r.published_at || r.created_at,
            title: (r) => r.title || '',
        });
        if (!filtered.length) {
            node.innerHTML = rows.length ? '<p>No matches.</p>' : '<p>No news yet.</p>';
            return;
        }
        node.innerHTML = filtered
            .map((row) => {
                const image = row.image ? `<div class="admin-row-thumb"><img src="${App.esc(row.image)}" alt="${App.esc(row.title)}" loading="lazy"></div>` : '';
                return `
        <article class="admin-row admin-row-with-thumb">
            ${image}
            <div class="admin-row-body">
                <header><strong>${App.esc(row.title)}</strong> <small>${App.esc(row.news_code || '')}</small></header>
                <p>${App.esc((row.body || '').slice(0, 180))}${(row.body || '').length > 180 ? 'â€¦' : ''}</p>
                <div class="admin-actions">
                    <button type="button" class="secondary" data-panel="view" data-id="${App.esc(String(row.id))}">View</button>
                    <button type="button" class="primary" data-panel="edit" data-id="${App.esc(String(row.id))}">Edit</button>
                    <button type="button" class="secondary btn-row-delete" data-panel="delete" data-id="${App.esc(String(row.id))}">Delete</button>
                </div>
            </div>
        </article>`;
            })
            .join('');
        node.onclick = (e) => {
            const btn = e.target.closest('[data-panel]');
            if (!btn) return;
            const id = btn.dataset.id;
            if (btn.dataset.panel === 'view') this.openView(id);
            else if (btn.dataset.panel === 'edit') this.openEdit(id);
            else if (btn.dataset.panel === 'delete') this.deleteRow(id);
        };
    }
    async deleteRow(id) {
        if (!(await Alert.confirm('Delete this article?'))) return;
        const fd = new FormData();
        fd.set('id', id);
        try {
            await Request.post('../api/news/delete', fd);
            await this.loadList();
        } catch (err) {
            Alert.error(err?.text || 'Delete failed');
        }
    }
    async loadList() {
        const data = await Request.get('../api/news/admin-list');
        this._newsRows = data?.data?.items || [];
        this.bindListFiltersOnce();
        this.renderNewsList();
    }
    openList() {
        this.replaceUrl({});
        this.show('panel-list');
        return this.loadList().catch(() => {
            document.querySelector('.news-list').innerHTML = '<p>Unable to load.</p>';
        });
    }
    openCreate() {
        this.replaceUrl({});
        const form = document.querySelector('.news-form');
        const formMsg = document.querySelector('.form-msg');
        const delBtn = document.querySelector('.news-delete');
        const formHeading = document.querySelector('.form-heading');
        this.show('panel-form');
        formHeading.textContent = 'Create news';
        form.reset();
        form.querySelector('[name="id"]').value = '';
        delBtn.classList.add('panel-hidden');
        form.onsubmit = async (e) => {
            e.preventDefault();
            formMsg.textContent = '';
            const fd = new FormData(form);
            const file = document.querySelector('.news-image')?.files?.[0];
            if (file) {
                fd.append('image', file);
            }
            try {
                const p = await Request.post('../api/news/save', fd);
                const newId = p?.data?.id;
                if (newId) {
                    this.replaceUrl({ action: 'edit', id: String(newId) });
                    await this.openEdit(String(newId));
                } else {
                    formMsg.textContent = p?.text || 'OK';
                    Alert.success(p?.text || 'Saved');
                }
            } catch (err) {
                formMsg.textContent = err?.text || 'Error';
                Alert.error(err?.text || 'Error');
            }
        };
    }
    async openView(id) {
        this.replaceUrl({ action: 'view', id: String(id) });
        this.show('panel-view');
        const node = document.querySelector('.news-view');
        try {
            const data = await Request.get(`../api/news/admin-item?id=${encodeURIComponent(id)}`);
            const item = data?.data?.item;
            if (!item) {
                node.innerHTML = '<p>Not found.</p>';
                return;
            }
            const when = item.published_at || item.created_at || '';
            node.innerHTML = `
                <div class="admin-view-card">
                    <div class="admin-view-header">
                        <div>
                            <h1>${App.esc(item.title)}</h1>
                            <div class="admin-view-meta">
                                ${item.news_code ? `<span class="admin-pill">${App.esc(item.news_code)}</span>` : ''}
                                ${when ? `<span class="admin-muted">${App.esc(when)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    ${item.image ? `<div class="admin-cover"><img src="${App.esc(item.image)}" alt="" loading="lazy"></div>` : ''}
                    <div class="admin-view-section">
                        <h2>Body</h2>
                        <div class="admin-prose">${App.esc(item.body || '').replaceAll('\n', '<br>')}</div>
                    </div>
                </div>`;
            document.querySelector('.link-edit-from-view').onclick = () => this.openEdit(id);
        } catch {
            node.innerHTML = '<p>Unable to load.</p>';
        }
    }
    async openEdit(id) {
        this.replaceUrl({ action: 'edit', id: String(id) });
        const form = document.querySelector('.news-form');
        const formMsg = document.querySelector('.form-msg');
        const delBtn = document.querySelector('.news-delete');
        const formHeading = document.querySelector('.form-heading');
        this.show('panel-form');
        formHeading.textContent = 'Edit news';
        delBtn.classList.remove('panel-hidden');
        try {
            const data = await Request.get(`../api/news/admin-item?id=${encodeURIComponent(id)}`);
            const item = data?.data?.item;
            if (!item) {
                formMsg.textContent = 'Not found.';
                return;
            }
            form.querySelector('[name="id"]').value = id;
            form.querySelector('[name="title"]').value = item.title || '';
            form.querySelector('[name="body"]').value = item.body || '';
            form.querySelector('[name="image"]').value = item.image_filename || '';
            form.querySelector('[name="status"]').value = String(item.status ?? 1);
        } catch {
            formMsg.textContent = 'Unable to load.';
            return;
        }
        form.onsubmit = async (e) => {
            e.preventDefault();
            formMsg.textContent = '';
            const fd = new FormData(form);
            const file = document.querySelector('.news-image')?.files?.[0];
            if (file) {
                fd.append('image', file);
            }
            try {
                await Request.post('../api/news/save', fd);
                formMsg.textContent = 'Saved.';
                Alert.success('Saved');
            } catch (err) {
                formMsg.textContent = err?.text || 'Error';
                Alert.error(err?.text || 'Error');
            }
        };
        delBtn.onclick = async () => {
            if (!(await Alert.confirm('Delete this article?'))) return;
            const fd = new FormData();
            fd.set('id', id);
            try {
                await Request.post('../api/news/delete', fd);
                this.openList();
            } catch (err) {
                formMsg.textContent = err?.text || 'Delete failed';
                Alert.error(err?.text || 'Delete failed');
            }
        };
    }
    bindChrome() {
        document.querySelector('.admin-action-new')?.addEventListener('click', () => this.openCreate());
        document.querySelectorAll('.admin-action-back-list').forEach((el) => {
            el.addEventListener('click', () => this.openList());
        });
    }
    async run() {
        Sidebar.mount();
        this.bindChrome();
        const action = this.params().get('action') || 'list';
        const id = this.params().get('id') || '';
        if (action === 'create') {
            this.openCreate();
            return;
        }
        if (action === 'view' && id) {
            await this.openView(id);
            return;
        }
        if (action === 'edit' && id) {
            await this.openEdit(id);
            return;
        }
        await this.openList();
    }
}

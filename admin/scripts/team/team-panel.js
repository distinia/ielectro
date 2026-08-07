import { Sidebar, App, Alert, Request } from "../core/index.js";
export default class TeamPanel {
    params() {
        return new URLSearchParams(window.location.search);
    }
    replaceUrl(query) {
        const u = new URL(window.location.href);
        if (!query || !Object.keys(query).length) u.search = '';
        else u.search = new URLSearchParams(query).toString();
        history.replaceState({}, '', u.pathname + u.search);
    }
    show(id) {
        document.querySelectorAll('.panel-list,.panel-form,.panel-view').forEach((el) => el.classList.add('panel-hidden'));
        const panelClass = id === 'panel-list' ? 'panel-list' : id === 'panel-form' ? 'panel-form' : 'panel-view';
        document.querySelector(`.${panelClass}`)?.classList.remove('panel-hidden');
        document.querySelectorAll('.toolbar-list,.toolbar-form,.toolbar-view').forEach((el) => el.classList.add('panel-hidden'));
        const toolbarClass = panelClass === 'panel-list' ? 'toolbar-list' : panelClass === 'panel-form' ? 'toolbar-form' : 'toolbar-view';
        document.querySelector(`.${toolbarClass}`)?.classList.remove('panel-hidden');
    }
    bindListFiltersOnce() {
        if (this._teamFiltersBound) {
            return;
        }
        this._teamFiltersBound = true;
        const redraw = () => this.renderTeamList();
        document.querySelector('.team-filter-q')?.addEventListener('input', redraw);
        document.querySelector('.team-filter-sort')?.addEventListener('change', redraw);
    }
    renderTeamList() {
        const node = document.querySelector('.team-list');
        const rows = this._teamRows || [];
        const q = document.querySelector('.team-filter-q')?.value || '';
        const sort = document.querySelector('.team-filter-sort')?.value || 'newest';
        const filtered = App.filterRows(rows, q, sort, {
            text: (r) => [r.title, r.body].filter(Boolean).join(' '),
            time: (r) => r.created_at,
            title: (r) => r.title || '',
        });
        if (!filtered.length) {
            node.innerHTML = rows.length ? '<p>No matches.</p>' : '<p>No members.</p>';
            return;
        }
        node.innerHTML = filtered
            .map(
                (row) => `
        <article class="admin-row">
            <header><strong>${App.esc(row.title)}</strong></header>
            <p>${App.esc(row.body || '')}</p>
            <div class="admin-actions">
                <button type="button" class="secondary" data-panel="view" data-id="${App.esc(String(row.id))}">View</button>
                <button type="button" class="primary" data-panel="edit" data-id="${App.esc(String(row.id))}">Edit</button>
                <button type="button" class="secondary btn-row-delete" data-panel="delete" data-id="${App.esc(String(row.id))}">Delete</button>
            </div>
        </article>`
            )
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
        if (!(await Alert.confirm('Delete this team member?'))) return;
        const fd = new FormData();
        fd.set('id', id);
        try {
            await Request.post('../api/team/delete', fd);
            await this.loadList();
        } catch (err) {
            Alert.error(err?.text || 'Delete failed');
        }
    }
    async loadList() {
        const data = await Request.get('../api/team/admin-list');
        this._teamRows = data?.data?.items || [];
        this.bindListFiltersOnce();
        this.renderTeamList();
    }
    openList() {
        this.replaceUrl({});
        this.show('panel-list');
        return this.loadList().catch(() => {
            document.querySelector('.team-list').innerHTML = '<p>Unable to load.</p>';
        });
    }
    openCreate() {
        this.replaceUrl({});
        const form = document.querySelector('.team-form');
        const formMsg = document.querySelector('.form-msg');
        const delBtn = document.querySelector('.team-delete');
        const formHeading = document.querySelector('.form-heading');
        this.show('panel-form');
        formHeading.textContent = 'Add member';
        form.reset();
        form.querySelector('[name="id"]').value = '';
        delBtn.classList.add('panel-hidden');
        form.onsubmit = async (e) => {
            e.preventDefault();
            formMsg.textContent = '';
            const fd = new FormData(form);
            const file = document.querySelector('.avatar-file')?.files?.[0];
            if (file) {
                fd.append('image', file);
            }
            try {
                const p = await Request.post('../api/team/save', fd);
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
        const node = document.querySelector('.team-view');
        try {
            const data = await Request.get(`../api/team/item?id=${encodeURIComponent(id)}`);
            const item = data?.data?.item;
            if (!item) {
                node.innerHTML = '<p>Not found.</p>';
                return;
            }
            const links = [
                item.instagram ? ['Instagram', item.instagram] : null,
                item.linkedin ? ['LinkedIn', item.linkedin] : null,
                item.github ? ['GitHub', item.github] : null,
            ].filter(Boolean);
            node.innerHTML = `
                <div class="admin-view-card">
                    <div class="admin-view-header">
                        ${item.avatar ? `<img class="admin-avatar" src="${App.esc(item.avatar)}" alt="">` : `<div class="admin-avatar admin-avatar-fallback">${App.esc((item.title || '?').slice(0, 1))}</div>`}
                        <div>
                            <h1>${App.esc(item.title)}</h1>
                            <p class="admin-muted">${App.esc(item.body || '')}</p>
                            ${links.length ? `<div class="admin-view-meta">${links.map(([label, url]) => `<a class="admin-link" href="${App.esc(url)}" target="_blank" rel="noopener">${App.esc(label)}</a>`).join('')}</div>` : ''}
                        </div>
                    </div>
                </div>`;
            document.querySelector('.link-edit-from-view').onclick = () => this.openEdit(id);
        } catch {
            node.innerHTML = '<p>Unable to load.</p>';
        }
    }
    async openEdit(id) {
        this.replaceUrl({ action: 'edit', id: String(id) });
        const form = document.querySelector('.team-form');
        const formMsg = document.querySelector('.form-msg');
        const delBtn = document.querySelector('.team-delete');
        const formHeading = document.querySelector('.form-heading');
        this.show('panel-form');
        formHeading.textContent = 'Edit member';
        delBtn.classList.remove('panel-hidden');
        try {
            const data = await Request.get(`../api/team/item?id=${encodeURIComponent(id)}`);
            const item = data?.data?.item;
            if (!item) {
                formMsg.textContent = 'Not found.';
                return;
            }
            form.querySelector('[name="id"]').value = id;
            form.querySelector('[name="title"]').value = item.title || '';
            form.querySelector('[name="body"]').value = item.body || '';
            form.querySelector('[name="avatar"]').value = item.avatar_filename || '';
            form.querySelector('[name="instagram"]').value = item.instagram || '';
            form.querySelector('[name="linkedin"]').value = item.linkedin || '';
            form.querySelector('[name="github"]').value = item.github || '';
        } catch {
            formMsg.textContent = 'Unable to load.';
            return;
        }
        form.onsubmit = async (e) => {
            e.preventDefault();
            formMsg.textContent = '';
            const fd = new FormData(form);
            const file = document.querySelector('.avatar-file')?.files?.[0];
            if (file) {
                fd.append('image', file);
            }
            try {
                await Request.post('../api/team/save', fd);
                formMsg.textContent = 'Saved.';
                Alert.success('Saved');
            } catch (err) {
                formMsg.textContent = err?.text || 'Error';
                Alert.error(err?.text || 'Error');
            }
        };
        delBtn.onclick = async () => {
            if (!(await Alert.confirm('Delete this member?'))) return;
            const fd = new FormData();
            fd.set('id', id);
            try {
                await Request.post('../api/team/delete', fd);
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

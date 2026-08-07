import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import Sidebar from '../../components/app/app.js';
import Alert from '../../components/alert/alert.js';
class CareersPanel {
    params() {
        return new URLSearchParams(window.location.search);
    }
    replaceUrl(query) {
        const u = new URL(window.location.href);
        if (!query || !Object.keys(query).length) u.search = '';
        else u.search = new URLSearchParams(query).toString();
        history.replaceState({}, '', u.pathname + u.search);
    }
    parseMeta(body) {
        try {
            return JSON.parse(body || '{}');
        } catch {
            return {};
        }
    }
    cvPublicUrl(file) {
        return `../content/job-application/${encodeURIComponent(file)}`;
    }
    showOverview() {
        document.querySelector('.overview-wrap')?.classList.remove('panel-hidden');
        document.querySelector('.panel-overview')?.classList.remove('panel-hidden');
        document.querySelector('.panel-form')?.classList.add('panel-hidden');
        document.querySelector('.panel-view')?.classList.add('panel-hidden');
        document.querySelector('.toolbar-list')?.classList.remove('panel-hidden');
        document.querySelector('.toolbar-form')?.classList.add('panel-hidden');
        document.querySelector('.toolbar-view')?.classList.add('panel-hidden');
    }
    showFormToolbar() {
        document.querySelector('.overview-wrap')?.classList.remove('panel-hidden');
        document.querySelector('.panel-overview')?.classList.add('panel-hidden');
        document.querySelector('.panel-form')?.classList.remove('panel-hidden');
        document.querySelector('.panel-view')?.classList.add('panel-hidden');
        document.querySelector('.toolbar-list')?.classList.add('panel-hidden');
        document.querySelector('.toolbar-form')?.classList.remove('panel-hidden');
        document.querySelector('.toolbar-view')?.classList.add('panel-hidden');
    }
    showViewToolbar() {
        document.querySelector('.overview-wrap')?.classList.remove('panel-hidden');
        document.querySelector('.panel-overview')?.classList.add('panel-hidden');
        document.querySelector('.panel-form')?.classList.add('panel-hidden');
        document.querySelector('.panel-view')?.classList.remove('panel-hidden');
        document.querySelector('.toolbar-list')?.classList.add('panel-hidden');
        document.querySelector('.toolbar-form')?.classList.add('panel-hidden');
        document.querySelector('.toolbar-view')?.classList.remove('panel-hidden');
    }
    bindOverviewFiltersOnce() {
        if (this._careersFiltersBound) {
            return;
        }
        this._careersFiltersBound = true;
        const rj = () => this.renderJobsList();
        const ra = () => this.renderApplicationsList();
        document.querySelector('.jobs-filter-q')?.addEventListener('input', rj);
        document.querySelector('.jobs-filter-sort')?.addEventListener('change', rj);
        document.querySelector('.apps-filter-q')?.addEventListener('input', ra);
        document.querySelector('.apps-filter-sort')?.addEventListener('change', ra);
    }
    renderJobsList() {
        const jobsNode = document.querySelector('.jobs-list');
        const jobs = this._careersJobs || [];
        const q = document.querySelector('.jobs-filter-q')?.value || '';
        const sort = document.querySelector('.jobs-filter-sort')?.value || 'newest';
        const filtered = Nesh.Table.filterRows(jobs, q, sort, {
            text: (r) => r.title || '',
            time: (r) => r.created_at,
            title: (r) => r.title || '',
        });
        if (!filtered.length) {
            jobsNode.innerHTML = jobs.length ? '<p>No matches.</p>' : '<p>No listings.</p>';
            return;
        }
        jobsNode.innerHTML = filtered
            .map(
                (row) => `
        <article class="admin-row">
            <header><strong>${Nesh.Html.escape(row.title)}</strong></header>
            <div class="admin-actions">
                <button type="button" class="secondary" data-panel="view" data-id="${Nesh.Html.escape(String(row.id))}">View</button>
                <button type="button" class="primary" data-panel="edit" data-id="${Nesh.Html.escape(String(row.id))}">Edit</button>
                <button type="button" class="secondary btn-row-delete" data-panel="delete" data-id="${Nesh.Html.escape(String(row.id))}">Delete</button>
            </div>
        </article>`
            )
            .join('');
        jobsNode.onclick = (e) => {
            const btn = e.target.closest('[data-panel]');
            if (!btn) return;
            const id = btn.dataset.id;
            if (btn.dataset.panel === 'view') this.openJobView(id);
            else if (btn.dataset.panel === 'edit') this.openJobEdit(id);
            else if (btn.dataset.panel === 'delete') this.deleteJobRow(id);
        };
    }
    async deleteJobRow(id) {
        if (!(await Alert.confirm('Delete this job listing?'))) return;
        const fd = new FormData();
        fd.set('id', id);
        try {
            await Nesh.Request.post('../api/careers/delete-content', fd);
            await this.loadOverview();
        } catch (err) {
            Alert.error(err?.text || 'Delete failed');
        }
    }
    renderApplicationsList() {
        const appNode = document.querySelector('.applications-list');
        const applications = this._careersApplications || [];
        const q = document.querySelector('.apps-filter-q')?.value || '';
        const sort = document.querySelector('.apps-filter-sort')?.value || 'newest';
        const filtered = Nesh.Table.filterRows(applications, q, sort, {
            text: (r) => [r.full_name, r.email, r.position, r.status, r.created_at].filter(Boolean).join(' '),
            time: (r) => r.created_at,
            title: (r) => r.full_name || '',
        });
        if (!filtered.length) {
            appNode.innerHTML = applications.length ? '<p>No matches.</p>' : '<p>No applications.</p>';
            return;
        }
        appNode.innerHTML = filtered
            .map((row) => {
                const cv = row.cv_file
                    ? `<a class="admin-link" href="${Nesh.Html.escape(this.cvPublicUrl(row.cv_file))}" target="_blank" rel="noopener">CV</a>`
                    : '<span class="admin-muted">No CV</span>';
                const delCv =
                    row.cv_file && row.id
                        ? `<button type="button" class="secondary btn-row-delete btn-cv-delete" data-cv-delete="${Nesh.Html.escape(String(row.id))}">Delete CV</button>`
                        : '';
                return `
        <article class="admin-row admin-row-application">
            <header><strong>${Nesh.Html.escape(row.full_name)}</strong> — ${Nesh.Html.escape(row.position)}</header>
            <p class="admin-muted">${Nesh.Html.escape(row.email)}</p>
            <div class="admin-actions">
                ${cv}
                ${delCv}
            </div>
            <small class="admin-muted">${Nesh.Html.escape(row.status)} · ${Nesh.Html.escape(row.created_at || '')}</small>
        </article>`;
            })
            .join('');
        appNode.onclick = async (e) => {
            const btn = e.target.closest('[data-cv-delete]');
            if (!btn) return;
            const id = btn.getAttribute('data-cv-delete');
            if (!id) return;
            if (!(await Alert.confirm('Delete the CV file for this application?'))) return;
            const fd = new FormData();
            fd.set('id', id);
            try {
                await Nesh.Request.post('../api/careers/delete-cv', fd);
                Alert.success('CV deleted');
                await this.loadOverview();
            } catch (err) {
                Alert.error(err?.text || 'Delete failed');
            }
        };
    }
    async loadOverview() {
        const [content, applications] = await Promise.all([
            Nesh.Request.get('../api/careers/admin-list'),
            Nesh.Request.get('../api/careers/admin-applications'),
        ]);
        this._careersJobs = content?.data || [];
        this._careersApplications = applications?.data || [];
        this.bindOverviewFiltersOnce();
        this.renderJobsList();
        this.renderApplicationsList();
    }
    openOverview() {
        this.replaceUrl({});
        this.showOverview();
        return this.loadOverview().catch(() => {
            const n = document.querySelector('.jobs-list');
            if (n) n.textContent = 'Unable to load.';
        });
    }
    openJobCreate() {
        this.replaceUrl({});
        const form = document.querySelector('.job-form');
        const formMsg = document.querySelector('.form-msg');
        const delBtn = document.querySelector('.job-delete');
        const formHeading = document.querySelector('.form-heading');
        this.showFormToolbar();
        formHeading.textContent = 'New job listing';
        form.reset();
        form.querySelector('[name="id"]').value = '';
        delBtn.classList.add('panel-hidden');
        form.onsubmit = async (e) => {
            e.preventDefault();
            formMsg.textContent = '';
            const fd = new FormData(form);
            fd.set('section', 'careers');
            try {
                const p = await Nesh.Request.post('../api/careers/save-content', fd);
                const newId = p?.data?.id;
                if (newId) {
                    this.replaceUrl({ action: 'edit', id: String(newId) });
                    await this.openJobEdit(String(newId));
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
    async openJobView(id) {
        this.replaceUrl({ action: 'view', id: String(id) });
        this.showViewToolbar();
        const node = document.querySelector('.job-view');
        try {
            const data = await Nesh.Request.get(`../api/careers/admin-item?id=${encodeURIComponent(id)}`);
            const item = data?.data;
            if (!item) {
                node.innerHTML = '<p>Not found.</p>';
                return;
            }
            const m = this.parseMeta(item.body);
            const reqs = (m.requirements || []).map((r) => `<li>${Nesh.Html.escape(r)}</li>`).join('');
            node.innerHTML = `
                <div class="admin-view-card">
                    <div class="admin-view-header">
                        <div>
                            <h1>${Nesh.Html.escape(item.title)}</h1>
                            <div class="admin-view-meta">
                                <span class="admin-pill">briefcase</span>
                                <span class="admin-muted">${Nesh.Html.escape(String(item.status ?? 1) === '1' ? 'Active' : 'Hidden')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="admin-view-section">
                        <h2>Requirements</h2>
                        <ul class="admin-bullets">${reqs}</ul>
                    </div>
                </div>`;
            document.querySelector('.link-edit-from-view').onclick = () => this.openJobEdit(id);
        } catch {
            node.innerHTML = '<p>Unable to load.</p>';
        }
    }
    async openJobEdit(id) {
        this.replaceUrl({ action: 'edit', id: String(id) });
        const form = document.querySelector('.job-form');
        const formMsg = document.querySelector('.form-msg');
        const delBtn = document.querySelector('.job-delete');
        const formHeading = document.querySelector('.form-heading');
        this.showFormToolbar();
        formHeading.textContent = 'Edit job';
        delBtn.classList.remove('panel-hidden');
        try {
            const data = await Nesh.Request.get(`../api/careers/admin-item?id=${encodeURIComponent(id)}`);
            const item = data?.data;
            if (!item) {
                formMsg.textContent = 'Not found.';
                return;
            }
            const m = this.parseMeta(item.body);
            form.querySelector('[name="id"]').value = id;
            form.querySelector('[name="title"]').value = item.title || '';
            form.querySelector('[name="requirements"]').value = (m.requirements || []).join('\n');
            form.querySelector('[name="status"]').value = String(item.status ?? 1);
        } catch {
            formMsg.textContent = 'Unable to load.';
            return;
        }
        form.onsubmit = async (e) => {
            e.preventDefault();
            formMsg.textContent = '';
            const fd = new FormData(form);
            try {
                await Nesh.Request.post('../api/careers/save-content', fd);
                formMsg.textContent = 'Saved.';
                Alert.success('Saved');
            } catch (err) {
                formMsg.textContent = err?.text || 'Error';
                Alert.error(err?.text || 'Error');
            }
        };
        delBtn.onclick = async () => {
            if (!(await Alert.confirm('Delete this listing?'))) return;
            const fd = new FormData();
            fd.set('id', id);
            try {
                await Nesh.Request.post('../api/careers/delete-content', fd);
                this.openOverview();
            } catch (err) {
                formMsg.textContent = err?.text || 'Delete failed';
                Alert.error(err?.text || 'Delete failed');
            }
        };
    }
    bindChrome() {
        document.querySelector('.admin-action-new')?.addEventListener('click', () => this.openJobCreate());
        document.querySelectorAll('.admin-action-back-list').forEach((el) => {
            el.addEventListener('click', () => this.openOverview());
        });
    }
    async run() {
        Sidebar.setup();
        this.bindChrome();
        const action = this.params().get('action') || 'list';
        const id = this.params().get('id') || '';
        if (action === 'create') {
            this.openJobCreate();
            return;
        }
        if (action === 'view' && id) {
            await this.openJobView(id);
            return;
        }
        if (action === 'edit' && id) {
            await this.openJobEdit(id);
            return;
        }
        await this.openOverview();
    }
}
window.addEventListener('DOMContentLoaded', () => {
    new CareersPanel().run().catch(console.error);
});

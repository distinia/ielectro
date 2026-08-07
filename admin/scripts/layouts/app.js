import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
export default class Sidebar {
    static mount() {
        const mount = document.querySelector('.admin-sidebar-mount');
        if (!mount) return;
        const page = document.body.dataset.adminPage || 'dashboard';
        const base = 'https://www.ielectro.com/manager';
        const items = [
            ['dashboard', `${base}/`, 'Dashboard'],
            ['news', `${base}/news`, 'News'],
            ['apps', `${base}/apps`, 'Apps'],
            ['team', `${base}/team`, 'Team'],
            ['careers', `${base}/careers`, 'Careers']
        ];
        const nav = items.map(([id, href, label]) => {
            const active = page === id;
            const cls = `admin-sidebar-link${active ? ' active' : ''}`;
            const cur = active ? ' aria-current="page"' : '';
            return `<a class="${cls}" href="${Nesh.Html.escape(href)}"${cur}>${Nesh.Html.escape(label)}</a>`;
        }).join('');
        const aside = document.createElement('aside');
        aside.className = 'admin-sidebar';
        aside.innerHTML = `
            <a class="admin-sidebar-logo-link" href="${Nesh.Html.escape(`${base}/`)}">
                <img class="admin-sidebar-logo" src="https://www.ielectro.com/assets/brand/logo.png" width="140" height="40" alt="iElectro">
            </a>
            <nav class="admin-sidebar-nav">${nav}</nav>
        `;
        mount.replaceWith(aside);
    }
   static setup() {
        Nesh.Request.setBaseUrl('api');
        Nesh.Input.disableAutocomplete();
        Nesh.Input.disableTextCorrection();
        Nesh.Input.enablePlainTextPaste();
        Nesh.Input.bind();
        Sidebar.mount();
        Nesh.Icons.load();
    }
}

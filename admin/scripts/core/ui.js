import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { App } from "./app.js";
export class AdminUi {
    static iconBtn(icon, label, extraClass = "", attrs = "") {
        return `<button type="button" class="admin-icon-btn ${extraClass}" aria-label="${App.esc(label)}" title="${App.esc(label)}" ${attrs}><i data-icon="${icon}"></i></button>`;
    }
    static iconLink(href, icon, label, extraClass = "") {
        return `<a href="${App.esc(href)}" class="admin-icon-btn ${extraClass}" aria-label="${App.esc(label)}" title="${App.esc(label)}" target="_blank" rel="noopener"><i data-icon="${icon}"></i></a>`;
    }
    static checkAllCell() {
        return `<div class="col-check"><input type="checkbox" class="admin-check-all" aria-label="Select all"></div>`;
    }
    static checkCell(id, checked = false) {
        const sid = App.esc(String(id));
        return `<div class="col-check"><input type="checkbox" class="admin-row-check" data-id="${sid}" ${checked ? "checked" : ""} aria-label="Select row"></div>`;
    }
    static statusPill(status) {
        const s = String(status || "").toLowerCase();
        const tone =
            s === "published" || s === "active"
                ? "success"
                : s === "draft"
                  ? "warn"
                  : s === "hidden"
                    ? "muted"
                    : "default";
        return `<span class="admin-status admin-status-${tone}">${App.esc(status || "")}</span>`;
    }
    static emptyState(text) {
        return `<div class="admin-data-empty">${App.esc(text)}</div>`;
    }
    static avatarHtml(url, name, className = "admin-data-avatar") {
        if (url) {
            return `<div class="${className}"><img src="${App.esc(url)}" alt="${App.esc(name)}" loading="lazy"></div>`;
        }
        const initial = App.esc((name || "?").trim().slice(0, 1).toUpperCase());
        return `<div class="${className} admin-data-avatar-fallback">${initial}</div>`;
    }
    static accountAvatarUrl(accountId) {
        const id = Number(accountId);
        if (!id || id <= 0) return null;
        return `https://account.ielectro.com/assets/users/${id}/avatar.png`;
    }
    static bindTableSelection(root, bulk, rows, onRowOpen) {
        if (!root) return;
        root.querySelector(".admin-check-all")?.addEventListener("change", (e) => {
            bulk.setAll(
                rows.map((row) => row.id),
                e.target.checked,
            );
            root.querySelectorAll(".admin-row-check").forEach((cb) => {
                cb.checked = e.target.checked;
            });
            root.querySelectorAll(".admin-data-row[data-id]").forEach((rowEl) => {
                rowEl.classList.toggle("is-selected", e.target.checked);
            });
        });
        root.addEventListener("change", (e) => {
            const cb = e.target.closest(".admin-row-check");
            if (!cb) return;
            e.stopPropagation();
            bulk.toggle(cb.dataset.id, cb.checked);
            cb.closest(".admin-data-row")?.classList.toggle("is-selected", cb.checked);
            const all = root.querySelector(".admin-check-all");
            if (all) {
                all.checked = rows.length > 0 && bulk.size() === rows.length;
                all.indeterminate = bulk.size() > 0 && bulk.size() < rows.length;
            }
        });
        root.addEventListener("click", (e) => {
            if (e.target.closest(".admin-row-check, .col-check")) return;
            const row = e.target.closest(".admin-data-row[data-id]");
            if (!row) return;
            onRowOpen?.(row.dataset.id);
        });
    }
    static refreshIcons(root) {
        try {
            return Nesh.Icons.load(root || document.body);
        } catch {
            return Promise.resolve();
        }
    }
}

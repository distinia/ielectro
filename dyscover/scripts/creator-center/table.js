import { CreatorRegistry } from "./registry.js";
import { Search } from "./search.js";

const TYPES = [
    "article",
    "image",
    "video",
    "audio",
    "document",
    "template",
];

export class Table {
    static switchHandler = null;

    constructor() {
        this.sections();
        this.sort();
    }

    static bindStatPills() {
        if (Table.switchHandler) {
            document.querySelectorAll(".creator-stat-pill").forEach((pill) => {
                pill.removeEventListener("click", Table.switchHandler);
            });
        }
        Table.switchHandler = (event) => {
            const pill = event.currentTarget;
            Table.switchTo(pill.dataset.type);
        };
        document.querySelectorAll(".creator-stat-pill").forEach((pill) => {
            pill.addEventListener("click", Table.switchHandler);
        });
    }

    static switchTo(type) {
        if (!TYPES.includes(type)) return;
        CreatorRegistry.classes.forEach((Class) => {
            Class.list.forEach((post) => post.setChecked(false));
            const table = document.querySelector(Class.table);
            Class.syncCheckAll?.(table);
        });
        document.querySelectorAll(".section").forEach((section) => {
            section.classList.remove("active-section");
        });
        document.querySelector(`.${type}-section`)?.classList.add("active-section");
        document.querySelectorAll(".creator-stat-pill").forEach((pill) => {
            pill.classList.toggle("is-active", pill.dataset.type === type);
        });
        Search.instance?.apply();
    }

    sections() {
        Table.bindStatPills();
        Table.switchTo("article");
    }

    sort() {
        document.querySelectorAll(".table").forEach((table) => {
            table.querySelectorAll("thead th").forEach((th, index) => {
                if (index === 0) return;
                const label = th.childNodes[0];
                if (label && label.nodeType === Node.TEXT_NODE) {
                    const text = label.textContent.trim();
                    const wrap = document.createElement("span");
                    wrap.className = "th-label";
                    wrap.textContent = text;
                    th.replaceChild(wrap, label);
                }
                const button = document.createElement("button");
                button.type = "button";
                button.className = "sort";
                button.dataset.order = "desc";
                button.setAttribute("aria-label", "Sort column");
                button.innerHTML = `<i data-icon="arrow-down-up"></i>`;
                th.appendChild(button);
                button.addEventListener("click", (event) => {
                    event.stopPropagation();
                    table.querySelectorAll(".sort.is-active").forEach((el) => {
                        if (el !== button) {
                            el.classList.remove("is-active", "is-asc");
                            el.dataset.order = "desc";
                        }
                    });
                    Table.sort(table, index, button);
                });
            });
        });
    }

    static sort(table, index, button) {
        const tbody = table.querySelector("tbody");
        const rows = Array.from(tbody.children).filter(
            (row) => !row.classList.contains("table-empty-row"),
        );
        const ascending = button?.dataset.order === "desc";
        rows.sort((a, b) => {
            const A = a.children[index]?.innerText || "";
            const B = b.children[index]?.innerText || "";
            const cmp = A.localeCompare(B, undefined, { sensitivity: "base" });
            return ascending ? cmp : -cmp;
        });
        rows.forEach((row) => tbody.appendChild(row));
        if (!button) return;
        button.classList.add("is-active");
        button.classList.toggle("is-asc", ascending);
        button.dataset.order = ascending ? "asc" : "desc";
        import("../core/nesh.js").then(({ Icons }) => Icons.load(button));
    }
}

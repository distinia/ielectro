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
    constructor() {
        this.sections();
        this.sort();
    }

    sections() {
        const switchTo = (type) => {
            if (!TYPES.includes(type)) return;
            CreatorRegistry.classes.forEach((Class) => {
                Class.list.forEach((post) => post.setChecked(false));
                const table = document.querySelector(Class.table);
                Class.syncCheckAll?.(table);
            });
            document.querySelectorAll(".section").forEach((section) => {
                section.classList.remove("active-section");
            });
            document
                .querySelector(`.${type}-section`)
                ?.classList.add("active-section");
            document.querySelectorAll(".upload-hint").forEach((hint) => {
                hint.classList.toggle("is-active", hint.dataset.type === type);
            });
            Search.instance?.apply();
        };

        document.querySelectorAll(".upload-hint").forEach((hint) => {
            hint.addEventListener("click", () => {
                switchTo(hint.dataset.type);
            });
        });

        switchTo("article");
    }

    sort() {
        document.querySelectorAll(".table").forEach((table) => {
            table.querySelectorAll("thead th").forEach((th, index) => {
                if (index === 0) return;
                const button = document.createElement("div");
                button.className = "sort";
                button.innerHTML = `<i data-icon="arrow-down-up"></i>`;
                th.appendChild(button);
                button.onclick = () => Table.sort(table, index);
            });
        });
    }

    static sort(table, index) {
        const tbody = table.querySelector("tbody");
        const rows = Array.from(tbody.children);
        rows.sort((a, b) => {
            const A = a.children[index].innerText;
            const B = b.children[index].innerText;
            return A.localeCompare(B);
        });
        rows.forEach((row) => tbody.appendChild(row));
    }
}

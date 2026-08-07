export class Table {
    constructor() {
        this.tabs();
        this.sort();
    }
    tabs() {
        document.querySelectorAll(".tab").forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll(".tab").forEach(t => t.classList.remove("active-tab"));
                document.querySelectorAll(".section").forEach(section => {
                    section.style.display = "none";
                    section.classList.remove("active-section");
                });
                tab.classList.add("active-tab");
                const section = document.querySelector(
                    "." + tab.classList[1].replace("-tab", "-section")
                );
                if (!section) return;
                section.style.display = "block";
                requestAnimationFrame(() => {
                    section.classList.add("active-section");
                });
            };
        });
        document.querySelector(".article-tab")?.click();
    }
    sort() {
        document.querySelectorAll(".table").forEach(table => {
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
        rows.forEach(row => tbody.appendChild(row));
    }
    static getActiveClass() {
        const tab = document.querySelector(".active-tab");
        if (!tab) return null;
        return classes.find(
            Class => Class.tab === "." + tab.classList[1]
        );
    }
}

import { Icons } from "../core/index.js";
import { state } from "./state.js";
import { Heading } from "./heading.js";
import { Editor } from "./editor.js";

export class Index {
    constructor() {
        this.box = document.querySelector(".list");
        this.sidebar = document.querySelector(".article-index-sidebar");
        this.editButton = null;
        this.list = this.box;
        this.currentList = null;
        this.section = 0;
        this.subsection = 0;
        this.headings = [];
    }

    async closeEditing() {
        this.headings = this.getHeadings();
        this.section = 0;
        this.subsection = 0;
        this.buildList();
        await this.buildSidebar();
    }

    async startEditing() {
        this.headings = this.getHeadings();
        this.section = 0;
        this.subsection = 0;
        this.buildList();
        await this.buildSidebar();
    }

    getHeadings() {
        return [...Heading.list.values()]
            .map((instance) => instance.element)
            .filter((element) => {
                return element && element.parentNode && element.innerText.trim();
            });
    }

    async buildSidebar() {
        if (!this.sidebar) return;
        this.editButton = this.sidebar.querySelector(".index-edit-button");
        if (this.editButton && state === "editor") {
            this.editButton.onclick = () => {
                Editor.toggleEditing();
            };
        } else if (this.editButton) {
            this.editButton.style.display = "none";
        }
        await Icons.load(this.sidebar);
        if (this.box && !this.sidebar.contains(this.box)) {
            const content = this.sidebar.querySelector(".index-sidebar-content");
            if (content) {
                content.innerHTML = "";
                content.appendChild(this.box);
            }
        }
    }

    buildList() {
        if (!this.list) return;
        this.list.innerHTML = "";
        this.currentList = null;
        const topItem = document.createElement("li");
        topItem.innerHTML = `
            <span>0</span>
            <a class="link" href="#">(Top)</a>
        `;
        topItem.querySelector("a").onclick = (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        };
        this.list.appendChild(topItem);
        this.headings.forEach((element) => {
            if (element.classList.contains("heading")) {
                this.addHeading(element);
            }
            if (element.classList.contains("sub-heading")) {
                this.addSubHeading(element);
            }
        });
    }

    addHeading(element) {
        this.section++;
        this.subsection = 0;
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${this.section}</span>
            <a class="link" href="#${element.id}" style="font-weight:bold;">
                ${element.innerText}
            </a>
            <ul></ul>
        `;
        this.list.appendChild(li);
        this.currentList = li.querySelector("ul");
    }

    addSubHeading(element) {
        if (!this.currentList) return;
        this.subsection++;
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${this.section}.${this.subsection}</span>
            <a class="link" href="#${element.id}">
                ${element.innerText}
            </a>
        `;
        this.currentList.appendChild(li);
    }
}

import { Icons } from "../core/index.js";
import { getArticleState } from "./state.js";
import { Heading } from "./heading.js";
import { Editor } from "./editor.js";

export class Index {
    constructor() {
        this.sidebar = document.querySelector(".article-index-sidebar");
        this.box =
            this.sidebar?.querySelector(".list") ||
            document.querySelector(".list");
        this.list = this.box;
        this.editButton = null;
        this.currentList = null;
        this.section = 0;
        this.subsection = 0;
        this.headings = [];
    }

    async refresh() {
        this.headings = this.getHeadings();
        this.section = 0;
        this.subsection = 0;
        this.buildList();
        await this.buildSidebar();
    }

    async closeEditing() {
        await this.refresh();
    }

    async startEditing() {
        await this.refresh();
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
        if (this.editButton) {
            const isEditor = getArticleState() === "editor";
            this.editButton.classList.toggle("is-visible", isEditor);
            this.editButton.classList.toggle(
                "is-active",
                isEditor && !!Editor.current?.isEditing,
            );
            this.editButton.onclick = isEditor
                ? () => Editor.toggleEditing()
                : null;
            this.editButton.title = isEditor
                ? "Edit article"
                : "";
        }

        this.sidebar?.querySelector(".index-edit-hint")?.remove();
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
            document.querySelector(".article-scroll")?.scrollTo({
                top: 0,
                behavior: "smooth",
            });
            window.scrollTo({ top: 0, behavior: "smooth" });
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

        if (this.headings.length === 0) {
            const empty = document.createElement("li");
            empty.className = "list-empty";
            empty.textContent = "No sections yet";
            this.list.appendChild(empty);
        }
    }

    addHeading(element) {
        this.section++;
        this.subsection = 0;
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${this.section}</span>
            <a class="link" href="#${element.id}">${element.innerText}</a>
            <ul></ul>
        `;
        this.list.appendChild(li);
        this.currentList = li.querySelector("ul");
        li.querySelector("a")?.addEventListener("click", (e) => {
            e.preventDefault();
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }

    addSubHeading(element) {
        if (!this.currentList) return;
        this.subsection++;
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${this.section}.${this.subsection}</span>
            <a class="link" href="#${element.id}">${element.innerText}</a>
        `;
        this.currentList.appendChild(li);
        li.querySelector("a")?.addEventListener("click", (e) => {
            e.preventDefault();
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
}

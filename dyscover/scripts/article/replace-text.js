import { Alert, Box } from "../core/index.js";
import { Select } from "./select.js";
import { ArticleHelp } from "./article-help.js";

export class ReplaceText {
    static list = new Map();

    constructor() {
        this.box = document.querySelector(".find-replace-panel");
        if (this.box) {
            this.closeEditing();
            return;
        }
        void this.create();
    }

    static init() {
        const instance = new ReplaceText();
        if (instance.box) {
            ReplaceText.list.set(instance.box, instance);
        }
    }

    async create() {
        this.modal = new Box("Find and replace", {
            variant: "article",
            headerLayout: "creator",
            help: ArticleHelp.replace,
        });
        await this.modal.create();
        this.box = this.modal.container;
        this.box.classList.add("find-replace-panel");
        this.modal.body((body) => {
            body.classList.add("find-replace-body");
            body.innerHTML = `
                <label class="find-replace-label">
                    <span>Find</span>
                    <input class="input find-input" type="search"
                        placeholder="Text to find"
                        autocapitalize="off" autocomplete="off" spellcheck="false">
                </label>
                <label class="find-replace-label">
                    <span>Replace with</span>
                    <input class="input replace-input" type="text"
                        placeholder="Replacement text"
                        autocapitalize="off" autocomplete="off" spellcheck="false">
                </label>
            `;
        });
        this.modal.footer((footer) => {
            footer.innerHTML = `
                <button type="button" class="button button-secondary replace-cancel-btn">Cancel</button>
                <button type="button" class="button replace-all-button">Replace all</button>
            `;
            footer.querySelector(".replace-cancel-btn").onclick = () =>
                this.closeEditing();
            footer.querySelector(".replace-all-button").onclick = () =>
                this.replaceAll();
        });
    }

    closeEditing() {
        if (!this.box) return;
        ReplaceText.list.delete(this.box);
        this.modal?.close();
        this.box = null;
        this.modal = null;
    }

    content() {
        return Select.container();
    }

    find(text) {
        const content = this.content();
        if (!content) return false;
        const regex = new RegExp(this.escape(text), "i");
        const contentText = content.textContent || content.innerText;
        if (!regex.test(contentText)) {
            Alert.error("No occurrences found");
            return false;
        }
        return true;
    }

    textNodes(element) {
        const nodes = [];
        const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walk.nextNode())) nodes.push(node);
        return nodes;
    }

    validNode(node) {
        let parent = node.parentElement;
        while (parent) {
            if (parent.classList?.contains("title")) return false;
            parent = parent.parentElement;
        }
        return true;
    }

    escape(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    replaceAll() {
        if (!this.box) return;
        const find = this.box.querySelector(".find-input").value;
        const replace = this.box.querySelector(".replace-input").value;
        if (!find) {
            Alert.error("Please enter text to find");
            return;
        }
        if (!this.find(find)) return;
        const content = this.content();
        const nodes = this.textNodes(content).filter((n) => this.validNode(n));
        const regex = new RegExp(this.escape(find), "gi");
        let count = 0;
        nodes.forEach((node) => {
            const matches = node.textContent.match(regex);
            if (!matches) return;
            count += matches.length;
            node.textContent = node.textContent.replace(regex, replace);
        });
        if (count > 0) {
            Alert.success(count + " occurrences have been changed");
        } else {
            Alert.error("No occurrences found");
        }
    }
}

import { Alert, Icons } from "../core/index.js";
import { Select } from "./select.js";
export class ReplaceText {
    static list = new Map();
    constructor() {
        this.box = null;
        this.findInput = null;
        this.replaceInput = null;
        this.countEl = null;
    }
    static init() {
        const existing = document.querySelector(".find-replace-bar");
        if (existing) {
            ReplaceText.list.get(existing)?.closeEditing();
            return;
        }
        void ReplaceText.open();
    }
    static async open() {
        const instance = new ReplaceText();
        await instance.create();
        if (instance.box) {
            ReplaceText.list.set(instance.box, instance);
        }
    }
    async create() {
        const main = document.querySelector(".article-main-content");
        this.box = document.createElement("div");
        this.box.className = "find-replace-bar";
        this.box.setAttribute("role", "search");
        this.box.innerHTML = `
            <div class="find-replace-inner">
                <label class="find-replace-group">
                    <i data-icon="search" aria-hidden="true"></i>
                    <input class="input find-input" type="search"
                        placeholder="Find"
                        autocapitalize="off" autocomplete="off" spellcheck="false"
                        data-preserve-case="true">
                </label>
                <label class="find-replace-group">
                    <i data-icon="text" aria-hidden="true"></i>
                    <input class="input replace-input" type="text"
                        placeholder="Replace"
                        autocapitalize="off" autocomplete="off" spellcheck="false"
                        data-preserve-case="true">
                </label>
                <span class="find-replace-count" aria-live="polite"></span>
                <button type="button" class="find-replace-btn find-replace-go"
                    title="Replace all" aria-label="Replace all">
                    <i data-icon="refresh-cw"></i>
                </button>
                <button type="button" class="find-replace-btn find-replace-close"
                    title="Close" aria-label="Close">
                    <i data-icon="x"></i>
                </button>
            </div>
        `;
        const instruments = main?.querySelector(".instruments");
        if (instruments) {
            instruments.insertAdjacentElement("afterend", this.box);
        } else {
            main?.prepend(this.box);
        }
        this.findInput = this.box.querySelector(".find-input");
        this.replaceInput = this.box.querySelector(".replace-input");
        this.countEl = this.box.querySelector(".find-replace-count");
        this.findInput.addEventListener("input", () => this.scheduleHighlight());
        this.findInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.replaceAll();
            }
            if (e.key === "Escape") {
                e.preventDefault();
                this.closeEditing();
            }
        });
        this.replaceInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.replaceAll();
            }
            if (e.key === "Escape") {
                e.preventDefault();
                this.closeEditing();
            }
        });
        this.box.querySelector(".find-replace-go").onclick = () =>
            this.replaceAll();
        this.box.querySelector(".find-replace-close").onclick = () =>
            this.closeEditing();
        await Icons.load(this.box);
        requestAnimationFrame(() => this.findInput?.focus());
    }
    scheduleHighlight() {
        clearTimeout(this._highlightTimer);
        this._highlightTimer = setTimeout(() => {
            const find = this.findInput?.value ?? "";
            this.clearHighlights();
            if (!find.trim()) {
                this.updateCount(0);
                return;
            }
            this.updateCount(this.highlight(find));
        }, 100);
    }
    static suspendForTextMode() {
        ReplaceText.list.forEach((instance) => {
            clearTimeout(instance._highlightTimer);
            instance.clearHighlights();
        });
    }
    static resumeFromTextMode() {
        ReplaceText.list.forEach((instance) => {
            if (instance.findInput?.value.trim()) {
                instance.scheduleHighlight();
            }
        });
    }
    closeEditing() {
        clearTimeout(this._highlightTimer);
        this.clearHighlights();
        if (this.box) {
            ReplaceText.list.delete(this.box);
            this.box.remove();
        }
        this.box = null;
        this.findInput = null;
        this.replaceInput = null;
        this.countEl = null;
    }
    content() {
        return Select.container();
    }
    textNodes(element) {
        const nodes = [];
        const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walk.nextNode())) {
            nodes.push(node);
        }
        return nodes;
    }
    validNode(node) {
        let parent = node.parentElement;
        while (parent) {
            if (parent.classList?.contains("title")) {
                return false;
            }
            if (parent.classList?.contains("find-match")) {
                return false;
            }
            parent = parent.parentElement;
        }
        return true;
    }
    escape(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    clearHighlights() {
        const content = this.content();
        if (!content) {
            return;
        }
        content.querySelectorAll("mark.find-match").forEach((mark) => {
            const parent = mark.parentNode;
            if (!parent) {
                return;
            }
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    }
    highlight(findText) {
        const content = this.content();
        if (!content || !findText) {
            return 0;
        }
        const regex = new RegExp(this.escape(findText), "g");
        const nodes = this.textNodes(content).filter((node) =>
            this.validNode(node),
        );
        let count = 0;
        nodes.forEach((node) => {
            const text = node.textContent;
            if (!text || !regex.test(text)) {
                regex.lastIndex = 0;
                return;
            }
            regex.lastIndex = 0;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            for (const match of text.matchAll(
                new RegExp(this.escape(findText), "g"),
            )) {
                const start = match.index ?? 0;
                const end = start + match[0].length;
                if (start > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(text.slice(lastIndex, start)),
                    );
                }
                const mark = document.createElement("mark");
                mark.className = "find-match";
                mark.textContent = match[0];
                fragment.appendChild(mark);
                count += 1;
                lastIndex = end;
            }
            if (lastIndex < text.length) {
                fragment.appendChild(
                    document.createTextNode(text.slice(lastIndex)),
                );
            }
            node.parentNode?.replaceChild(fragment, node);
        });
        return count;
    }
    updateCount(count) {
        if (!this.countEl) {
            return;
        }
        if (!this.findInput?.value.trim()) {
            this.countEl.textContent = "";
            return;
        }
        this.countEl.textContent =
            count === 0 ? "No matches" : `${count} match${count === 1 ? "" : "es"}`;
    }
    replaceAll() {
        if (!this.box) {
            return;
        }
        const find = this.findInput.value;
        const replace = this.replaceInput.value;
        if (!find) {
            Alert.error("Please enter text to find");
            return;
        }
        this.clearHighlights();
        const content = this.content();
        if (!content) {
            return;
        }
        const nodes = this.textNodes(content).filter((node) =>
            this.validNode(node),
        );
        const regex = new RegExp(this.escape(find), "g");
        let count = 0;
        nodes.forEach((node) => {
            const matches = node.textContent.match(regex);
            if (!matches) {
                return;
            }
            count += matches.length;
            node.textContent = node.textContent.replace(regex, replace);
        });
        if (count > 0) {
            this.scheduleHighlight();
        } else {
            Alert.error("No occurrences found");
            this.updateCount(0);
        }
    }
}

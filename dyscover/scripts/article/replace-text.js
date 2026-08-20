import { Alert, Icons } from "../core/index.js";
import { Select } from "./select.js";
export class ReplaceText {
    static list = new Map();
    constructor() {
        this.box = null;
        this.findInput = null;
        this.replaceInput = null;
        this.countEl = null;
        this.currentIndex = -1;
        this.matchCount = 0;
        this._sourceWrap = null;
        this._sourceHighlights = null;
        this._onSourceInput = () => this.scheduleHighlight();
        this._onSourceScroll = () => this.syncSourceScroll();
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
    static isTextMode() {
        return document.body.classList.contains("is-text-editing");
    }
    static sourceEditor() {
        return document.querySelector(".article-source-editor");
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
                <button type="button" class="find-replace-btn find-replace-next"
                    title="Next match" aria-label="Next match">
                    <i data-icon="chevron-right"></i>
                </button>
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
        this.findInput.addEventListener("input", () => {
            this.currentIndex = -1;
            this.scheduleHighlight();
        });
        this.findInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) {
                    this.goToNextMatch();
                } else {
                    this.replaceAll();
                }
            }
            if (e.key === "F3") {
                e.preventDefault();
                this.goToNextMatch();
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
        this.box.querySelector(".find-replace-next").onclick = () =>
            this.goToNextMatch();
        this.box.querySelector(".find-replace-go").onclick = () =>
            this.replaceAll();
        this.box.querySelector(".find-replace-close").onclick = () =>
            this.closeEditing();
        await Icons.load(this.box);
        requestAnimationFrame(() => this.findInput?.focus());
    }
    scheduleHighlight() {
        clearTimeout(this._highlightTimer);
        this._highlightTimer = setTimeout(() => this.refreshMatches(), 100);
    }
    refreshMatches() {
        const find = this.findInput?.value ?? "";
        this.clearHighlights();
        if (!find.trim()) {
            this.teardownSourceHighlight();
            this.matchCount = 0;
            this.currentIndex = -1;
            this.updateCount(0);
            return;
        }
        if (ReplaceText.isTextMode()) {
            this.matchCount = this.highlightInSource(find);
            this.updateCount(this.matchCount);
            return;
        }
        this.teardownSourceHighlight();
        this.matchCount = this.highlight(find);
        this.updateCount(this.matchCount);
    }
    static suspendForTextMode() {
        ReplaceText.list.forEach((instance) => {
            clearTimeout(instance._highlightTimer);
            instance.clearHighlights();
            instance.refreshMatches();
        });
    }
    static resumeFromTextMode() {
        ReplaceText.list.forEach((instance) => {
            instance.teardownSourceHighlight();
            instance.refreshMatches();
        });
    }
    closeEditing() {
        clearTimeout(this._highlightTimer);
        this.clearHighlights();
        this.teardownSourceHighlight();
        if (this.box) {
            ReplaceText.list.delete(this.box);
            this.box.remove();
        }
        this.box = null;
        this.findInput = null;
        this.replaceInput = null;
        this.countEl = null;
        this.currentIndex = -1;
        this.matchCount = 0;
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
    escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
    countInSource(findText) {
        const editor = ReplaceText.sourceEditor();
        if (!editor || !findText) {
            return 0;
        }
        const matches = editor.value.match(new RegExp(this.escape(findText), "g"));
        return matches ? matches.length : 0;
    }
    ensureSourceHighlight() {
        const editor = ReplaceText.sourceEditor();
        if (!editor) {
            return null;
        }
        if (this._sourceWrap?.contains(editor) && this._sourceHighlights) {
            return editor;
        }
        const parent = editor.parentElement;
        if (!parent) {
            return null;
        }
        const wrap = document.createElement("div");
        wrap.className = "article-source-find-wrap";
        const highlights = document.createElement("pre");
        highlights.className = "article-source-find-highlights";
        highlights.setAttribute("aria-hidden", "true");
        parent.insertBefore(wrap, editor);
        wrap.appendChild(highlights);
        wrap.appendChild(editor);
        editor.classList.add("is-find-highlighting");
        editor.addEventListener("input", this._onSourceInput);
        editor.addEventListener("scroll", this._onSourceScroll);
        this._sourceWrap = wrap;
        this._sourceHighlights = highlights;
        return editor;
    }
    teardownSourceHighlight() {
        const editor = ReplaceText.sourceEditor();
        if (editor) {
            editor.removeEventListener("input", this._onSourceInput);
            editor.removeEventListener("scroll", this._onSourceScroll);
            editor.classList.remove("is-find-highlighting");
        }
        if (this._sourceWrap && editor && this._sourceWrap.contains(editor)) {
            const parent = this._sourceWrap.parentElement;
            parent?.insertBefore(editor, this._sourceWrap);
            this._sourceWrap.remove();
        } else {
            this._sourceWrap?.remove();
        }
        this._sourceWrap = null;
        this._sourceHighlights = null;
    }
    syncSourceScroll() {
        const editor = ReplaceText.sourceEditor();
        if (!editor || !this._sourceHighlights) {
            return;
        }
        this._sourceHighlights.scrollTop = editor.scrollTop;
        this._sourceHighlights.scrollLeft = editor.scrollLeft;
    }
    highlightInSource(findText) {
        const editor = this.ensureSourceHighlight();
        if (!editor || !this._sourceHighlights || !findText) {
            return 0;
        }
        const value = editor.value;
        const regex = new RegExp(this.escape(findText), "g");
        let html = "";
        let lastIndex = 0;
        let count = 0;
        for (const match of value.matchAll(regex)) {
            const start = match.index ?? 0;
            const end = start + match[0].length;
            html += this.escapeHtml(value.slice(lastIndex, start));
            const currentClass =
                count === this.currentIndex ? " find-match-current" : "";
            html += `<mark class="find-match${currentClass}">${this.escapeHtml(match[0])}</mark>`;
            count += 1;
            lastIndex = end;
        }
        html += this.escapeHtml(value.slice(lastIndex));
        if (!html.endsWith("\n")) {
            html += "\n";
        }
        this._sourceHighlights.innerHTML = html || "\n";
        this.syncSourceScroll();
        return count;
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
        if (ReplaceText.isTextMode() && this._sourceHighlights) {
            const find = this.findInput?.value ?? "";
            if (!find.trim()) {
                this._sourceHighlights.textContent = "";
            }
        }
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
        if (count === 0) {
            this.countEl.textContent = "No matches";
            return;
        }
        if (this.currentIndex >= 0 && this.currentIndex < count) {
            this.countEl.textContent = `${this.currentIndex + 1} of ${count}`;
            return;
        }
        this.countEl.textContent =
            `${count} match${count === 1 ? "" : "es"}`;
    }
    goToNextMatch() {
        const find = this.findInput?.value ?? "";
        if (!find.trim()) {
            Alert.error("Please enter text to find");
            return;
        }
        this.refreshMatches();
        if (this.matchCount <= 0) {
            Alert.error("No occurrences found");
            return;
        }
        this.currentIndex =
            this.currentIndex < 0
                ? 0
                : (this.currentIndex + 1) % this.matchCount;
        if (ReplaceText.isTextMode()) {
            this.goToMatchInSource(find, this.currentIndex);
            return;
        }
        this.goToMatchInGraphic(this.currentIndex);
    }
    goToMatchInSource(find, index) {
        const editor = ReplaceText.sourceEditor();
        if (!editor) {
            return;
        }
        const value = editor.value;
        const regex = new RegExp(this.escape(find), "g");
        const matches = [...value.matchAll(regex)];
        const match = matches[index];
        if (!match || match.index == null) {
            return;
        }
        const start = match.index;
        const end = start + match[0].length;
        editor.focus();
        editor.setSelectionRange(start, end);
        this.scrollTextareaTo(editor, start);
        this.highlightInSource(find);
        this.updateCount(this.matchCount);
    }
    scrollTextareaTo(editor, position) {
        const style = getComputedStyle(editor);
        const lineHeight = parseFloat(style.lineHeight) || 22;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const lines = editor.value.slice(0, position).split("\n").length;
        const target =
            (lines - 1) * lineHeight - editor.clientHeight / 3 + paddingTop;
        editor.scrollTop = Math.max(0, target);
        this.syncSourceScroll();
    }
    goToMatchInGraphic(index) {
        const content = this.content();
        if (!content) {
            return;
        }
        let marks = [...content.querySelectorAll("mark.find-match")];
        if (!marks.length) {
            this.refreshMatches();
            marks = [...content.querySelectorAll("mark.find-match")];
        }
        if (!marks.length || index < 0 || index >= marks.length) {
            return;
        }
        marks.forEach((mark) => mark.classList.remove("find-match-current"));
        const mark = marks[index];
        mark.classList.add("find-match-current");
        mark.scrollIntoView({
            block: "center",
            inline: "nearest",
            behavior: "smooth",
        });
        this.selectMark(mark);
        this.updateCount(marks.length);
    }
    selectMark(mark) {
        const range = document.createRange();
        range.selectNodeContents(mark);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
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
        if (ReplaceText.isTextMode()) {
            this.replaceAllInSource(find, replace);
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
        this.currentIndex = -1;
        if (count > 0) {
            this.scheduleHighlight();
        } else {
            Alert.error("No occurrences found");
            this.updateCount(0);
        }
    }
    replaceAllInSource(find, replace) {
        const editor = ReplaceText.sourceEditor();
        if (!editor) {
            Alert.error("Text editor not ready");
            return;
        }
        const regex = new RegExp(this.escape(find), "g");
        const matches = editor.value.match(regex);
        if (!matches?.length) {
            Alert.error("No occurrences found");
            this.updateCount(0);
            return;
        }
        const start = editor.selectionStart;
        editor.value = editor.value.replace(regex, replace);
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        const next = Math.min(start, editor.value.length);
        editor.setSelectionRange(next, next);
        editor.focus();
        this.currentIndex = -1;
        this.matchCount = this.highlightInSource(find);
        this.updateCount(this.matchCount);
    }
}

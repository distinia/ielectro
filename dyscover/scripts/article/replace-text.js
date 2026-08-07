import { Alert } from "../core/index.js";
import { Select } from "./select.js";
export class ReplaceText {
    static list = new Map();
    constructor() {
        this.box = document.querySelector(".find-replace");
        if (this.box) {
            this.closeEditing();
            return;
        }
        this.create();
    }
    static init() {
        const instance = new ReplaceText();
        if (instance.box) {
            ReplaceText.list.set(instance.box, instance);
        }
    }
    create() {
        const main = document.querySelector("main");
        if (!main) return;
        this.box = document.createElement("div");
        this.box.className = "find-replace";
        const inputFind = document.createElement("input");
        inputFind.className = "find-input";
        inputFind.placeholder = "Enter text to find";
        const inputReplace = document.createElement("input");
        inputReplace.className = "replace-input";
        inputReplace.placeholder = "Enter text to replace";
        const button = document.createElement("button");
        button.className = "replace-all-button";
        button.textContent = "Replace All";
        this.box.appendChild(inputFind);
        this.box.appendChild(document.createElement("br"));
        this.box.appendChild(inputReplace);
        this.box.appendChild(document.createElement("br"));
        this.box.appendChild(button);
        main.prepend(this.box);
        button.addEventListener("click", () => this.replaceAll());
    }
    closeEditing() {
        if (!this.box) return;
        ReplaceText.list.delete(this.box);
        this.box.remove();
        this.box = null;
    }
    content() {
        return Select.container();
    }
    find(text) {
        const content = this.content();
        if (!content) return false;
        const contentText = content.textContent || content.innerText;
        if (!contentText.includes(text)) {
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
        const regex = new RegExp(this.escape(find), "g");
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

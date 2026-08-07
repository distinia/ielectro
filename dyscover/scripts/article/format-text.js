import { API } from "./api.js";
import { Select } from "./select.js";
import { Heading } from "./heading.js";
import { Bold } from "./bold.js";
import { Italic } from "./italic.js";
import { List } from "./list.js";
import { Link } from "./link.js";
export class FormatText {
    constructor() {
        this.content = Select.container();
        if (!this.content) return;
        this.instruments = [];
    }
    static async init() {
        const instance = new FormatText();
        await instance.getElements();
        instance.parse();
        return instance;
    }
    async getElements() {
        this.instruments = await API.getElements();
    }
    parse() {
        this.instruments.forEach((instrument) => {
            if (!instrument.regex) {
                return;
            }
            this.apply(instrument);
        });
    }
    apply(instrument) {
        const regex = new RegExp(instrument.regex, "g");
        const walker = document.createTreeWalker(
            this.content,
            NodeFilter.SHOW_TEXT,
        );
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) {
            if (regex.test(node.nodeValue)) {
                nodes.push(node);
            }
            regex.lastIndex = 0;
        }
        nodes.forEach((node) => {
            const text = node.nodeValue;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            regex.lastIndex = 0;
            for (const match of text.matchAll(regex)) {
                const full = match[0];
                const start = match.index;
                const end = start + full.length;
                const before = text.slice(lastIndex, start);
                if (before) {
                    fragment.appendChild(document.createTextNode(before));
                }
                const element = this.create(instrument, match);
                if (element) {
                    fragment.appendChild(element);
                }
                lastIndex = end;
            }
            const after = text.slice(lastIndex);
            if (after) {
                fragment.appendChild(document.createTextNode(after));
            }
            node.parentNode.replaceChild(fragment, node);
        });
    }
    create(instrument, match) {
        switch (instrument.action) {
            case "bold":
                return Bold.create(match[1]);
            case "italic":
                return Italic.create(match[1]);
            case "link":
                return Link.create(match[2], match[1]);
            case "heading":
                return Heading.create("h2", match[1]);
            case "subheading":
                return Heading.create("h3", match[1]);
            case "pointList":
                return List.create("ul", match[1]);
            case "numberList":
                return List.create("ol", match[1]);
        }
        return null;
    }
}

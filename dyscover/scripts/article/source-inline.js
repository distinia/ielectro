import { Bold } from "./bold.js";
import { Italic } from "./italic.js";
import { Link } from "./link.js";
import { Legend } from "./legend.js";
import { Media } from "./media.js";
import { Percentage } from "./percentage.js";
import { yieldToMain } from "./source-yield.js";
export class SourceInline {
    static collapseWhitespace(text) {
        return String(text || "").replace(/\s+/g, " ");
    }
    static normalizeInline(text) {
        return this.collapseWhitespace(text).trim();
    }
    static escapeText(text) {
        return String(text || "")
            .replace(/\\/g, "\\\\")
            .replace(/\[\[/g, "\\[[")
            .replace(/\{\{/g, "\\{{");
    }
    static unescapeText(text) {
        return String(text || "")
            .replace(/\\(\[\[|\{\{|\\|\*)/g, "$1");
    }
    static serialize(node) {
        if (!node) {
            return "";
        }
        if (node.nodeType === Node.TEXT_NODE) {
            return this.escapeText(this.collapseWhitespace(node.textContent));
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }
        const el = node;
        const tag = el.tagName.toLowerCase();
        if (el.classList.contains("bold") || tag === "b") {
            return `**${this.serializeChildren(el)}**`;
        }
        if (el.classList.contains("italic") || tag === "i") {
            return `*${this.serializeChildren(el)}*`;
        }
        if (el.classList.contains("link") || tag === "a") {
            const text = el.textContent || "";
            const url = el.getAttribute("href") || "";
            return `[[${text.replace(/\|/g, "\\|")}|${url}]]`;
        }
        if (el.classList.contains("legend")) {
            const color =
                el.querySelector(".legend-box")?.style.backgroundColor || "";
            const text = el.querySelector(".legend-text")?.textContent || "";
            return `{{legend|${color}|${text}}}`;
        }
        if (el.classList.contains("percentage")) {
            const value =
                el.dataset.value ||
                el.dataset.percentage ||
                el.textContent.trim();
            return `{{percent|${value}}}`;
        }
        if (el.classList.contains("template-large-image")) {
            const postId = el.dataset.postId ? `|${el.dataset.postId}` : "";
            return `{{template-large-image|${el.getAttribute("src") || ""}${postId}}}`;
        }
        if (
            el.classList.contains("template-single-image") ||
            el.classList.contains("template-first-image") ||
            el.classList.contains("template-second-image") ||
            (el.classList.contains("template-image") &&
                !el.classList.contains("template-first-image") &&
                !el.classList.contains("template-second-image"))
        ) {
            const postId = el.dataset.postId ? `|${el.dataset.postId}` : "";
            return `{{template-single-image|${el.getAttribute("src") || ""}${postId}}}`;
        }
        if (el.classList.contains("icon-image")) {
            return `{{icon-image|${el.getAttribute("src") || ""}}}`;
        }
        if (el.classList.contains("image-table")) {
            return `{{image-table|${el.getAttribute("src") || ""}}}`;
        }
        if (el.classList.contains("audio")) {
            return `{{audio|${el.getAttribute("src") || ""}}}`;
        }
        if (tag === "br") {
            return " ";
        }
        return this.serializeChildren(el);
    }
    static serializeChildren(parent) {
        if (!parent) {
            return "";
        }
        return [...parent.childNodes].map((node) => this.serialize(node)).join("");
    }
    static parse(text) {
        const fragment = document.createDocumentFragment();
        this.parseInto(text, fragment);
        return fragment;
    }
    static parseInto(text, parent) {
        let i = 0;
        const source = String(text || "");
        const appendText = (value) => {
            if (value) {
                parent.appendChild(document.createTextNode(value));
            }
        };
        while (i < source.length) {
            if (source.startsWith("\\", i)) {
                appendText(source[i + 1] || "");
                i += 2;
                continue;
            }
            const macro = this.readMacro(source, i);
            if (macro) {
                const node = this.createMacroNode(macro);
                if (node) {
                    parent.appendChild(node);
                } else {
                    appendText(macro.raw);
                }
                i = macro.end;
                continue;
            }
            const link = this.readLink(source, i);
            if (link) {
                parent.appendChild(Link.create(link.url, link.text));
                i = link.end;
                continue;
            }
            const bold = this.readWrapped(source, i, "**");
            if (bold) {
                const node = Bold.create(bold.inner);
                if (node) {
                    parent.appendChild(node);
                } else {
                    appendText(`**${bold.inner}**`);
                }
                i = bold.end;
                continue;
            }
            const italic = this.readWrapped(source, i, "*");
            if (italic) {
                const node = Italic.create(italic.inner);
                if (node) {
                    parent.appendChild(node);
                } else {
                    appendText(`*${italic.inner}*`);
                }
                i = italic.end;
                continue;
            }
            const nextSpecial = this.findNextSpecial(source, i);
            if (nextSpecial <= i) {
                appendText(source[i]);
                i += 1;
                continue;
            }
            appendText(source.slice(i, nextSpecial));
            i = nextSpecial;
        }
    }
    static async parseIntoAsync(text, parent) {
        let i = 0;
        const source = String(text || "");
        let steps = 0;
        const appendText = (value) => {
            if (value) {
                parent.appendChild(document.createTextNode(value));
            }
        };
        while (i < source.length) {
            if (source.startsWith("\\", i)) {
                appendText(source[i + 1] || "");
                i += 2;
                continue;
            }
            const macro = this.readMacro(source, i);
            if (macro) {
                const node = this.createMacroNode(macro);
                if (node) {
                    parent.appendChild(node);
                } else {
                    appendText(macro.raw);
                }
                i = macro.end;
                steps++;
                if (steps % 100 === 0) {
                    await yieldToMain(0);
                }
                continue;
            }
            const link = this.readLink(source, i);
            if (link) {
                parent.appendChild(Link.create(link.url, link.text));
                i = link.end;
                steps++;
                if (steps % 100 === 0) {
                    await yieldToMain(0);
                }
                continue;
            }
            const bold = this.readWrapped(source, i, "**");
            if (bold) {
                const node = Bold.create(bold.inner);
                if (node) {
                    parent.appendChild(node);
                } else {
                    appendText(`**${bold.inner}**`);
                }
                i = bold.end;
                steps++;
                if (steps % 100 === 0) {
                    await yieldToMain(0);
                }
                continue;
            }
            const italic = this.readWrapped(source, i, "*");
            if (italic) {
                const node = Italic.create(italic.inner);
                if (node) {
                    parent.appendChild(node);
                } else {
                    appendText(`*${italic.inner}*`);
                }
                i = italic.end;
                steps++;
                if (steps % 100 === 0) {
                    await yieldToMain(0);
                }
                continue;
            }
            const nextSpecial = this.findNextSpecial(source, i);
            if (nextSpecial <= i) {
                appendText(source[i]);
                i += 1;
                steps++;
                if (steps % 100 === 0) {
                    await yieldToMain(0);
                }
                continue;
            }
            const chunk = source.slice(i, nextSpecial);
            appendText(chunk);
            i = nextSpecial;
            steps++;
            if (steps % 100 === 0 || chunk.length > 4096) {
                await yieldToMain(0);
            }
        }
    }
    static findNextSpecial(source, start) {
        const indices = ["\\", "[[", "{{", "**", "*"]
            .map((token) => source.indexOf(token, start))
            .filter((index) => index !== -1);
        return indices.length ? Math.min(...indices) : source.length;
    }
    static readWrapped(source, start, marker) {
        if (!source.startsWith(marker, start)) {
            return null;
        }
        const end = source.indexOf(marker, start + marker.length);
        if (end === -1) {
            return null;
        }
        return {
            inner: this.unescapeText(source.slice(start + marker.length, end)),
            end: end + marker.length,
        };
    }
    static readLink(source, start) {
        if (!source.startsWith("[[", start)) {
            return null;
        }
        let i = start + 2;
        let text = "";
        while (i < source.length) {
            if (source.startsWith("\\|", i)) {
                text += "|";
                i += 2;
                continue;
            }
            if (source[i] === "|" && source[i - 1] !== "\\") {
                const url = source.slice(i + 1, source.indexOf("]]", i + 1));
                const end = source.indexOf("]]", i + 1);
                if (end === -1) {
                    return null;
                }
                return {
                    text: this.unescapeText(text),
                    url: url.trim(),
                    end: end + 2,
                };
            }
            text += source[i];
            i++;
        }
        return null;
    }
    static readMacro(source, start) {
        if (!source.startsWith("{{", start)) {
            return null;
        }
        const end = source.indexOf("}}", start + 2);
        if (end === -1) {
            return null;
        }
        const raw = source.slice(start, end + 2);
        const inner = source.slice(start + 2, end);
        const parts = this.splitMacroParts(inner);
        return {
            raw,
            type: parts[0] || "",
            parts,
            end: end + 2,
        };
    }
    static splitMacroParts(inner) {
        const parts = [];
        let current = "";
        for (let i = 0; i < inner.length; i++) {
            if (inner[i] === "|" && inner[i - 1] !== "\\") {
                parts.push(current.trim());
                current = "";
                continue;
            }
            current += inner[i];
        }
        parts.push(current.trim());
        return parts.map((part) => part.replace(/\\\|/g, "|"));
    }
    static isSingleCompleteMacro(text) {
        const trimmed = String(text || "").trim();
        const macro = this.readMacro(trimmed, 0);
        return !!(macro && macro.end === trimmed.length);
    }
    static splitTableCells(line) {
        const inner = String(line || "")
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "");
        const cells = [];
        let current = "";
        let i = 0;
        while (i < inner.length) {
            if (inner.startsWith("\\|", i)) {
                current += "|";
                i += 2;
                continue;
            }
            if (inner.startsWith("{{", i)) {
                const end = inner.indexOf("}}", i + 2);
                if (end === -1) {
                    current += inner.slice(i);
                    break;
                }
                current += inner.slice(i, end + 2);
                i = end + 2;
                continue;
            }
            if (inner.startsWith("[[", i)) {
                const end = inner.indexOf("]]", i + 2);
                if (end === -1) {
                    current += inner.slice(i);
                    break;
                }
                current += inner.slice(i, end + 2);
                i = end + 2;
                continue;
            }
            if (inner[i] === "|") {
                cells.push(current.trim());
                current = "";
                i++;
                continue;
            }
            current += inner[i];
            i++;
        }
        cells.push(current.trim());
        return cells.map((cell) => cell.replace(/\\n/g, "\n"));
    }
    static createMacroNode(macro) {
        switch (macro.type) {
            case "legend": {
                const color = macro.parts[1] || "";
                const text = macro.parts[2] || "";
                return Legend.create(color, text);
            }
            case "icon":
            case "icon-image":
                return Media.create("icon-image", macro.parts[1] || "");
            case "image-table":
                return Media.create("image-table", macro.parts[1] || "");
            case "image": {
                if (macro.parts[2]) {
                    const figure = Media.create(
                        Media.classMap.image,
                        macro.parts[1] || "",
                    );
                    const figcaption = figure.querySelector("figcaption");
                    if (figcaption) {
                        figcaption.textContent = macro.parts[2];
                    }
                    return figure;
                }
                return Media.createTemplateSingleImage(macro.parts[1] || "");
            }
            case "template-image":
            case "template-single-image":
                return Media.create(
                    Media.classMap.imageTemplate,
                    macro.parts[1] || "",
                    macro.parts[2] || "",
                );
            case "template-large-image":
            case "large-image":
                return Media.create(
                    "template-large-image",
                    macro.parts[1] || "",
                    macro.parts[2] || "",
                );
            case "template-double-image":
            case "double-image": {
                const [url1, url2] = Media.parseDoubleImageUrls(macro.parts[1]);
                const [postId1, postId2] = Media.parseDoubleImageUrls(
                    macro.parts[2] || "",
                );
                if (!url1) {
                    return null;
                }
                if (!url2) {
                    return Media.create(
                        Media.classMap.imageTemplate,
                        url1,
                        postId1 || "",
                    );
                }
                const fragment = Media.createTemplateDoubleImage(url1, url2);
                const imgs = [...fragment.childNodes].filter(
                    (node) => node.tagName === "IMG",
                );
                if (postId1 && imgs[0]) {
                    imgs[0].dataset.postId = String(postId1);
                }
                if (postId2 && imgs[1]) {
                    imgs[1].dataset.postId = String(postId2);
                }
                return fragment;
            }
            case "percent": {
                const value = macro.parts[1] || "0";
                const width = Percentage.calculate(value) || 0;
                return Percentage.create(width, value);
            }
            case "audio":
                return Media.create("audio", macro.parts[1] || "");
            default:
                return null;
        }
    }
    static parseListItems(text) {
        const lines = String(text || "")
            .replace(/\r/g, "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
        if (!lines.length) {
            return [""];
        }
        if (lines.every((line) => line.startsWith("- "))) {
            return lines.map((line) => line.slice(2));
        }
        return [text.trim()];
    }
    static fillElement(parent, text) {
        parent.replaceChildren();
        this.parseInto(text, parent);
        if (!parent.childNodes.length) {
            parent.appendChild(document.createTextNode(""));
        }
    }
    static async fillElementAsync(parent, text) {
        parent.replaceChildren();
        await this.parseIntoAsync(text, parent);
        if (!parent.childNodes.length) {
            parent.appendChild(document.createTextNode(""));
        }
    }
}

import { Bold } from "./bold.js";
import { Italic } from "./italic.js";
import { Link } from "./link.js";
import { Legend } from "./legend.js";
import { Media } from "./media.js";
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
        if (el.classList.contains("icon-image")) {
            return `{{icon|${el.getAttribute("src") || ""}}}`;
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

    static createMacroNode(macro) {
        switch (macro.type) {
            case "legend": {
                const color = macro.parts[1] || "";
                const text = macro.parts[2] || "";
                return Legend.create(color, text);
            }
            case "icon":
                return Media.create("icon-image", macro.parts[1] || "");
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

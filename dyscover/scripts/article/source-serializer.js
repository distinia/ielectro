import { SourceInline } from "./source-inline.js";
import { Media } from "./media.js";
import { yieldToMain } from "./source-yield.js";

export class SourceSerializer {
    static BLOCKS_PER_YIELD = 1;

    static fromContainer(container) {
        if (!container) {
            return "";
        }
        const blocks = [];
        container.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
                return;
            }
            if (node.nodeType === Node.ELEMENT_NODE) {
                const block = this.serializeBlock(node);
                if (block) {
                    blocks.push(block);
                }
            }
        });
        return blocks.join("\n\n");
    }

    static async fromContainerAsync(container) {
        if (!container) {
            return "";
        }
        const nodes = [...container.childNodes].filter((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return !!node.textContent.trim();
            }
            return node.nodeType === Node.ELEMENT_NODE;
        });
        const blocks = [];
        for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index];
            if (node.nodeType === Node.ELEMENT_NODE) {
                const block = this.serializeBlock(node);
                if (block) {
                    blocks.push(block);
                }
            }
            if (
                (index + 1) % SourceSerializer.BLOCKS_PER_YIELD === 0 &&
                index + 1 < nodes.length
            ) {
                await yieldToMain();
            }
        }
        return blocks.join("\n\n");
    }

    static serializeBlock(element) {
        if (element.classList?.contains("template")) {
            return this.serializeTemplate(element);
        }
        if (element.classList?.contains("table")) {
            return this.serializeTable(element);
        }
        if (element.classList.contains("heading")) {
            return `# ${element.innerText.trim()}`;
        }
        if (element.classList.contains("sub-heading")) {
            return `## ${element.innerText.trim()}`;
        }
        if (element.classList.contains("caption")) {
            return `> ${SourceInline.normalizeInline(
                SourceInline.serializeChildren(element),
            )}`;
        }
        if (element.classList.contains("paragraph")) {
            const text = SourceInline.normalizeInline(
                SourceInline.serializeChildren(element),
            );
            if (element.classList.contains("center")) {
                return `:: ${text}`;
            }
            return text;
        }
        if (element.classList.contains("point-list")) {
            return this.serializeList(element, "- ");
        }
        if (element.classList.contains("number-list")) {
            return this.serializeList(element, null, true);
        }
        if (element.classList.contains("percentage")) {
            const value =
                element.dataset.value ||
                element.dataset.percentage ||
                element.textContent.trim();
            return `{{percent|${value}}}`;
        }
        if (element.classList.contains(Media.classMap.image)) {
            const url = element.querySelector("img")?.src || "";
            const caption =
                element.querySelector("figcaption")?.textContent.trim() || "";
            return caption
                ? `{{image|${url}|${caption}}}`
                : `{{image|${url}}}`;
        }
        if (element.classList.contains(Media.classMap.video)) {
            const url = element.querySelector("video")?.src || "";
            const caption =
                element.querySelector("figcaption")?.textContent.trim() || "";
            return caption
                ? `{{video|${url}|${caption}}}`
                : `{{video|${url}}}`;
        }
        if (element.classList.contains(Media.classMap.audio)) {
            return `{{audio|${element.src || ""}}}`;
        }
        if (element.classList.contains(Media.classMap.imageTable)) {
            return `{{image-table|${element.src || ""}}}`;
        }
        if (element.classList.contains(Media.classMap.iconImage)) {
            return `{{icon|${element.src || ""}}}`;
        }
        return SourceInline.serializeChildren(element).trim();
    }

    static serializeList(element, prefix, numbered = false) {
        const items = [...element.querySelectorAll(":scope > li")];
        return items
            .map((li, index) => {
                const text = SourceInline.normalizeInline(
                    SourceInline.serializeChildren(li),
                );
                if (numbered) {
                    return `${index + 1}. ${text}`;
                }
                return `${prefix}${text}`;
            })
            .join("\n");
    }

    static serializeTable(table) {
        const rows = [];
        const headerCells = [...table.querySelectorAll("thead th")];
        if (headerCells.length) {
            rows.push(
                `| ${headerCells
                    .map((cell) => this.serializeCell(cell))
                    .join(" | ")} |`,
            );
        }
        table.querySelectorAll("tbody tr").forEach((row) => {
            const cells = [...row.cells].map((cell) => this.serializeCell(cell));
            if (cells.length) {
                rows.push(`| ${cells.join(" | ")} |`);
            }
        });
        return rows.join("\n");
    }

    static serializeCell(cell) {
        const list = cell.querySelector(":scope > ul, :scope > ol");
        if (list) {
            return this.serializeList(
                list,
                "- ",
                list.tagName.toLowerCase() === "ol",
            ).replace(/\n/g, "\\n");
        }
        return SourceInline.normalizeInline(
            SourceInline.serializeChildren(cell),
        ).replace(/\n/g, " ");
    }

    static serializeTemplate(table) {
        const id = table.dataset.template || "";
        const lines = [`{{template|${id}`];
        const title = table.querySelector("thead .template-cell-info li");
        if (title?.textContent.trim()) {
            lines.push(
                `| _title = ${SourceInline.normalizeInline(title.textContent)}`,
            );
        }

        const fields = new Map();
        const order = [];

        table.querySelectorAll("tbody tr[data-field]").forEach((row) => {
            const slug = row.dataset.field;
            const part = this.serializeTemplateRow(row);
            if (!part) {
                return;
            }
            if (!fields.has(slug)) {
                fields.set(slug, []);
                order.push(slug);
            }
            fields.get(slug).push(part);
        });

        order.forEach((slug) => {
            lines.push(`| ${slug} = ${fields.get(slug).join("\n")}`);
        });

        lines.push("}}");
        return lines.join("\n");
    }

    static serializeTemplateField(rows) {
        return rows.map((row) => this.serializeTemplateRow(row)).filter(Boolean).join("\n");
    }

    static templateImages(cell) {
        return [...cell.querySelectorAll("img")].filter(
            (img) => !img.classList.contains("icon-image"),
        );
    }

    static serializeTemplateRow(row) {
        const ths = [...row.querySelectorAll(":scope > th")];
        const tds = [...row.querySelectorAll(":scope > td")];

        if (ths.length === 1 && !tds.length && ths[0].colSpan >= 2) {
            return `**${SourceInline.normalizeInline(ths[0].textContent)}**`;
        }

        if (
            tds.length === 2 &&
            !row.querySelector(":scope > th.template-cell-label")
        ) {
            return this.serializeTemplateDoubleColumn(tds[0], tds[1]);
        }

        if (tds.length === 1 && tds[0].colSpan >= 2) {
            return this.serializeTemplateWideCell(tds[0]);
        }

        if (ths.length === 1 && tds.length === 1) {
            return this.serializeTemplateListCell(tds[0]);
        }

        return SourceInline.normalizeInline(
            SourceInline.serializeChildren(row),
        );
    }

    static serializeTemplateWideCell(cell) {
        const imgs = this.templateImages(cell);
        if (imgs.length >= 2) {
            return `{{double-image|${imgs[0].src} ;; ${imgs[1].src}}}`;
        }
        if (imgs.length === 1) {
            return this.serializeTemplateImage(imgs[0], cell);
        }
        return this.serializeTemplateListCell(cell);
    }

    static serializeTemplateDoubleColumn(leftCell, rightCell) {
        const leftItems = this.serializeTemplateListItems(leftCell);
        const rightItems = this.serializeTemplateListItems(rightCell);
        const pairs = [];
        const count = Math.max(leftItems.length, rightItems.length, 1);
        for (let i = 0; i < count; i++) {
            const left = leftItems[i] || "";
            const right = rightItems[i] || "";
            pairs.push(`- ${left} ;; ${right}`);
        }
        return pairs.join("\n");
    }

    static serializeTemplateListCell(cell) {
        const items = this.serializeTemplateListItems(cell);
        if (items.length === 1) {
            return items[0];
        }
        return items.map((item) => (item ? `- ${item}` : "- ")).join("\n");
    }

    static serializeTemplateListItems(container) {
        const list = container.querySelector(":scope > .template-cell-info");
        if (!list) {
            const text = SourceInline.normalizeInline(
                SourceInline.serializeChildren(container),
            );
            return text ? [text] : [];
        }
        return [...list.querySelectorAll(":scope > li")].map((li) =>
            SourceInline.normalizeInline(SourceInline.serializeChildren(li)),
        );
    }

    static serializeTemplateImage(img, cell) {
        const url = img.getAttribute("src") || img.src || "";
        const isLarge =
            img.classList.contains("template-large-image") ||
            cell?.style.padding === "0px" ||
            cell?.style.padding === "0" ||
            img.style.width === "100%";
        return isLarge ? `{{large-image|${url}}}` : `{{image|${url}}}`;
    }

    static serializeTemplateList(container) {
        return this.serializeTemplateListItems(container).map((item) =>
            item ? `- ${item}` : "- ",
        );
    }
}

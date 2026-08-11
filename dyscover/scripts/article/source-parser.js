import { API } from "./api.js";
import { SourceInline } from "./source-inline.js";
import { Paragraph } from "./paragraph.js";
import { Heading } from "./heading.js";
import { Caption } from "./caption.js";
import { List } from "./list.js";
import { Table } from "./table.js";
import { Legend } from "./legend.js";
import { Percentage } from "./percentage.js";
import { Media } from "./media.js";
import { Template } from "./template.js";
import { yieldToMain } from "./source-yield.js";

export class SourceParser {
    static templateCache = new Map();
    static BLOCKS_PER_YIELD = 12;

    static async toContainer(source, container, onProgress) {
        if (!container) {
            return;
        }
        const blocks = this.splitBlocks(source);
        const fragment = document.createDocumentFragment();
        let index = 0;

        while (index < blocks.length) {
            const batchEnd = Math.min(
                index + SourceParser.BLOCKS_PER_YIELD,
                blocks.length,
            );
            for (; index < batchEnd; index++) {
                const node = await this.parseBlock(blocks[index]);
                if (node) {
                    fragment.appendChild(node);
                }
            }
            onProgress?.(index, blocks.length);
            if (index < blocks.length) {
                await yieldToMain();
            }
        }

        container.replaceChildren(fragment);
    }

    static async toContainerIncremental(source, container, onBlock) {
        if (!container) {
            return;
        }
        container.replaceChildren();
        await yieldToMain(16);

        const blocks = this.splitBlocks(source);
        const total = blocks.length;

        for (let index = 0; index < total; index++) {
            onBlock?.(null, index, total, "parsing");
            let node;
            try {
                node = await this.parseBlock(blocks[index]);
            } catch (error) {
                const preview = String(blocks[index] || "")
                    .trim()
                    .slice(0, 80)
                    .replace(/\s+/g, " ");
                throw new Error(
                    `Section ${index + 1} of ${total}: ${error?.message || error}${preview ? ` (${preview}…)` : ""}`,
                );
            }
            if (node) {
                container.appendChild(node);
                if (onBlock) {
                    await onBlock(node, index, total);
                }
            }
            await yieldToMain(16);
        }
    }

    static async getTemplateCached(templateId) {
        const key = String(templateId);
        if (!SourceParser.templateCache.has(key)) {
            SourceParser.templateCache.set(key, API.getTemplate(templateId));
        }
        const defs = await SourceParser.templateCache.get(key);
        if (!Array.isArray(defs)) {
            throw new Error("Template not found");
        }
        return defs;
    }

    static splitBlocks(source) {
        const text = String(source || "").replace(/\r/g, "");
        const blocks = [];
        const lines = text.split("\n");
        let index = 0;

        while (index < lines.length) {
            while (index < lines.length && !lines[index].trim()) {
                index++;
            }
            if (index >= lines.length) {
                break;
            }

            const line = lines[index];

            if (line.startsWith("{{template|")) {
                const templateBlock = this.readTemplateBlock(lines, index);
                blocks.push(templateBlock.text);
                index = templateBlock.end;
                continue;
            }

            if (line.startsWith("|")) {
                const tableBlock = this.readTableBlock(lines, index);
                blocks.push(tableBlock.text);
                index = tableBlock.end;
                continue;
            }

            if (line.startsWith("- ") || /^\d+\.\s/.test(line)) {
                const listBlock = this.readListBlock(lines, index);
                blocks.push(listBlock.text);
                index = listBlock.end;
                continue;
            }

            if (this.isSingleLineBlock(line)) {
                blocks.push(line.trim());
                index++;
                continue;
            }

            const paragraphBlock = this.readParagraphBlock(lines, index);
            blocks.push(paragraphBlock.text);
            index = paragraphBlock.end;
        }

        return blocks.filter(Boolean);
    }

    static isSingleLineBlock(line) {
        return (
            line.startsWith("# ") ||
            line.startsWith("## ") ||
            line.startsWith("> ") ||
            line.startsWith(":: ") ||
            line.startsWith("{{")
        );
    }

    static readTemplateBlock(lines, start) {
        const collected = [];
        let index = start;
        while (index < lines.length) {
            collected.push(lines[index]);
            if (lines[index].trim() === "}}") {
                index++;
                break;
            }
            index++;
        }
        return { text: collected.join("\n"), end: index };
    }

    static readTableBlock(lines, start) {
        const collected = [];
        let index = start;
        while (index < lines.length && lines[index].trim().startsWith("|")) {
            collected.push(lines[index]);
            index++;
        }
        return { text: collected.join("\n"), end: index };
    }

    static readListBlock(lines, start) {
        const collected = [];
        let index = start;
        const numbered = /^\d+\.\s/.test(lines[start]);
        while (index < lines.length) {
            const line = lines[index];
            if (!line.trim()) {
                break;
            }
            if (numbered) {
                if (!/^\d+\.\s/.test(line)) {
                    break;
                }
            } else if (!line.startsWith("- ")) {
                break;
            }
            collected.push(line);
            index++;
        }
        return { text: collected.join("\n"), end: index };
    }

    static readParagraphBlock(lines, start) {
        const collected = [lines[start]];
        let index = start + 1;
        while (index < lines.length) {
            const line = lines[index];
            if (!line.trim()) {
                break;
            }
            if (
                line.startsWith("# ") ||
                line.startsWith("## ") ||
                line.startsWith("> ") ||
                line.startsWith(":: ") ||
                line.startsWith("{{") ||
                line.startsWith("|") ||
                line.startsWith("- ") ||
                /^\d+\.\s/.test(line)
            ) {
                break;
            }
            collected.push(line);
            index++;
        }
        return { text: this.normalizeParagraph(collected), end: index };
    }

    static normalizeParagraph(lines) {
        return lines
            .map((line) => String(line || "").trim())
            .filter(Boolean)
            .join(" ")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    static async parseBlock(block) {
        const text = String(block || "").trim();
        if (!text) {
            return null;
        }

        if (text.startsWith("{{template|")) {
            return await this.parseTemplate(text);
        }
        if (text.startsWith("|")) {
            return await this.parseTable(text);
        }
        if (text.startsWith("# ")) {
            return Heading.create("h2", text.slice(2).trim());
        }
        if (text.startsWith("## ")) {
            return Heading.create("h3", text.slice(3).trim());
        }
        if (text.startsWith("> ")) {
            return Caption.create(
                this.normalizeParagraph(text.slice(2).split("\n")),
            );
        }
        if (text.startsWith(":: ")) {
            const element = Paragraph.create();
            element.classList.add("center");
            await SourceInline.fillElementAsync(
                element,
                this.normalizeParagraph(text.slice(3).split("\n")),
            );
            return element;
        }
        if (text.startsWith("- ") || /^\d+\.\s/m.test(text)) {
            return await this.parseList(text);
        }
        if (text.startsWith("{{")) {
            return await this.parseMacroBlock(text);
        }

        const element = Paragraph.create();
        await SourceInline.fillElementAsync(
            element,
            this.normalizeParagraph(text.split("\n")),
        );
        return element;
    }

    static async parseList(text) {
        const lines = text.split("\n");
        const numbered = /^\d+\.\s/.test(lines[0]);
        const tag = numbered ? "ol" : "ul";
        const element = List.create(tag, "");
        element.replaceChildren();
        for (const line of lines) {
            const li = document.createElement("li");
            const content = numbered
                ? line.replace(/^\d+\.\s*/, "")
                : line.slice(2);
            await SourceInline.fillElementAsync(li, content.trim());
            element.appendChild(li);
            await yieldToMain(0);
        }
        return element;
    }

    static async parseMacroBlock(text) {
        const macro = SourceInline.readMacro(text, 0);
        if (!macro) {
            const element = Paragraph.create();
            await SourceInline.fillElementAsync(element, text);
            return element;
        }

        switch (macro.type) {
            case "image": {
                const figure = Media.create(
                    Media.classMap.image,
                    macro.parts[1] || "",
                );
                const caption = macro.parts[2] || "";
                const figcaption = figure.querySelector("figcaption");
                if (figcaption && caption) {
                    figcaption.textContent = caption;
                }
                return figure;
            }
            case "template-image":
                return Media.create(
                    Media.classMap.imageTemplate,
                    macro.parts[1] || "",
                );
            case "image-table":
                return Media.create(
                    Media.classMap.imageTable,
                    macro.parts[1] || "",
                );
            case "icon":
                return Media.create(
                    Media.classMap.iconImage,
                    macro.parts[1] || "",
                );
            case "video": {
                const figure = Media.create(
                    Media.classMap.video,
                    macro.parts[1] || "",
                );
                const caption = macro.parts[2] || "";
                const figcaption = figure.querySelector("figcaption");
                if (figcaption && caption) {
                    figcaption.textContent = caption;
                }
                return figure;
            }
            case "audio":
                return Media.create(Media.classMap.audio, macro.parts[1] || "");
            case "large-image":
                return Media.create(
                    Media.classMap.imageTemplate,
                    macro.parts[1] || "",
                );
            case "double-image": {
                const [url1, url2] = String(macro.parts[1] || "")
                    .split(";;")
                    .map((part) => part.trim());
                const img1 = Media.create(
                    Media.classMap.imageTemplate,
                    url1 || "",
                );
                if (!url2) {
                    return img1;
                }
                const wrap = document.createElement("span");
                wrap.appendChild(img1);
                wrap.appendChild(
                    Media.create(Media.classMap.imageTemplate, url2),
                );
                return wrap;
            }
            case "percent": {
                const value = macro.parts[1] || "0";
                const width = Percentage.calculate(value) || 0;
                return Percentage.create(width, value);
            }
            case "legend":
                return Legend.create(macro.parts[1] || "", macro.parts[2] || "");
            default: {
                const element = Paragraph.create();
                await SourceInline.fillElementAsync(element, text);
                return element;
            }
        }
    }

    static async parseTable(text) {
        const rows = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("|"))
            .map((line) =>
                line
                    .replace(/^\|/, "")
                    .replace(/\|$/, "")
                    .split("|")
                    .map((cell) => cell.trim().replace(/\\n/g, "\n")),
            );

        const separator = (cells) =>
            cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));

        const dataRows = rows.filter((cells, index) => {
            if (index === 0) {
                return true;
            }
            return cells?.length && !separator(cells);
        });

        if (!dataRows.length || !dataRows[0]?.length) {
            return null;
        }

        const table = Table.create(dataRows.length - 1, dataRows[0].length);
        const headers = table.querySelectorAll("thead th");
        for (let index = 0; index < dataRows[0].length; index++) {
            await this.fillCell(headers[index], dataRows[0][index]);
            if (index % 4 === 3) {
                await yieldToMain(0);
            }
        }

        const bodyRows = table.querySelectorAll("tbody tr");
        for (let rowIndex = 0; rowIndex < dataRows.slice(1).length; rowIndex++) {
            const cells = dataRows.slice(1)[rowIndex];
            if (!cells?.length) {
                continue;
            }
            for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
                await this.fillCell(
                    bodyRows[rowIndex]?.cells[cellIndex],
                    cells[cellIndex],
                );
                if (cellIndex % 4 === 3) {
                    await yieldToMain(0);
                }
            }
        }

        return table;
    }

    static async fillCell(cell, content) {
        if (!cell) {
            return;
        }
        cell.replaceChildren();
        const value = String(content || "").trim();
        if (!value) {
            cell.innerHTML = "<br>";
            return;
        }

        if (value.startsWith("{{")) {
            const macro = await this.parseMacroBlock(value);
            if (
                macro?.classList?.contains(Media.classMap.imageTable) ||
                macro?.classList?.contains(Media.classMap.iconImage) ||
                macro?.classList?.contains("legend")
            ) {
                cell.appendChild(macro);
                return;
            }
        }

        if (value.includes("\n- ") || value.startsWith("- ")) {
            const list = List.create("ul", "");
            list.replaceChildren();
            for (const item of SourceInline.parseListItems(value)) {
                const li = document.createElement("li");
                await SourceInline.fillElementAsync(li, item);
                list.appendChild(li);
            }
            cell.appendChild(list);
            return;
        }

        await SourceInline.fillElementAsync(cell, value);
        if (!cell.childNodes.length) {
            cell.innerHTML = "<br>";
        }
    }

    static async parseTemplate(text) {
        const openMatch = text.match(/^\{\{template\|(\d+)/);
        if (!openMatch) {
            return null;
        }
        const templateId = openMatch[1];
        const table = Template.create(templateId);
        const instance = new Template(table);
        const fields = this.parseTemplateFields(text);
        const defs = await SourceParser.getTemplateCached(templateId);
        instance.fields = defs;

        if (fields._title) {
            const li = table.querySelector("thead .template-cell-info li");
            if (li) {
                li.textContent = fields._title;
            }
        }

        for (let fieldIndex = 0; fieldIndex < defs.length; fieldIndex++) {
            const def = defs[fieldIndex];
            const slug = instance.fieldSlug(def.name);
            const raw = fields[slug];
            if (raw == null || raw === "") {
                continue;
            }
            await this.applyTemplateField(instance, def, raw);
            await yieldToMain();
        }

        table.querySelectorAll("img").forEach((img) => {
            if (!Media.list.has(img)) {
                new Media(img);
            }
        });
        table.querySelectorAll("audio").forEach((audio) => {
            if (!Media.list.has(audio)) {
                new Media(audio);
            }
        });

        return table;
    }

    static parseTemplateFields(text) {
        const fields = {};
        const lines = text.split("\n").slice(1);
        let currentKey = null;
        let currentValue = [];

        const flush = () => {
            if (!currentKey) {
                return;
            }
            fields[currentKey] = currentValue.join("\n").trim();
            currentValue = [];
        };

        for (const line of lines) {
            if (line.trim() === "}}") {
                flush();
                break;
            }
            const match = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);
            if (match) {
                flush();
                currentKey = match[1].trim();
                currentValue = [match[2]];
                continue;
            }
            if (currentKey) {
                currentValue.push(line);
            }
        }

        flush();
        return fields;
    }

    static looksLikeDoubleColumn(content) {
        return String(content || "")
            .split("\n")
            .some((line) => {
                const trimmed = line.trim().replace(/^-\s*/, "");
                return trimmed.includes(";;");
            });
    }

    static splitTemplateSection(value) {
        let content = String(value || "").trim();
        let header = null;
        const section = content.match(/^\*\*(.+?)\*\*/);
        if (section) {
            header = section[1].trim();
            content = content.slice(section[0].length).trim();
        }
        return { header, content };
    }

    static insertTemplateSectionHeader(instance, def, header) {
        if (!header) {
            return;
        }
        const headerRow = document.createElement("tr");
        headerRow.dataset.field = instance.fieldSlug(def.name);
        const th = document.createElement("th");
        th.colSpan = 2;
        th.textContent = header;
        headerRow.appendChild(th);
        instance.insertRow(headerRow, def.name);
    }

    static normalizeFieldType(def) {
        return String(def?.type || "text")
            .trim()
            .replace(/_/g, "-");
    }

    static applyImageField(instance, def, media) {
        const urls = Array.isArray(media?.urls) ? media.urls : [];
        if (media?.type === "double-image") {
            const [url1, url2] = urls;
            if (!url1 || !url2) {
                return false;
            }
            const row = instance.doubleImageRow(def.name, url1, url2);
            instance.insertRow(row.row, def.name);
            return true;
        }
        const url = urls[0];
        if (!url) {
            return false;
        }
        const row = instance.imageRow(
            def.name,
            url,
            media.type === "large-image" || def.type === "large-image",
        );
        instance.insertRow(row.row, def.name);
        return true;
    }

    static async applyTemplateField(instance, def, raw) {
        const fieldType = SourceParser.normalizeFieldType(def);
        def = { ...def, type: fieldType };
        const value = String(raw || "").trim();
        if (!value) {
            return;
        }

        switch (def.type) {
            case "image":
            case "large-image": {
                const media = this.parseTemplateMediaValue(value);
                this.applyImageField(instance, def, media);
                break;
            }
            case "double-image": {
                const media = this.parseTemplateMediaValue(value);
                this.applyImageField(instance, def, {
                    ...media,
                    type: "double-image",
                });
                break;
            }
            case "double-column":
            case "double-column-extended": {
                const { header, content } = this.splitTemplateSection(value);
                if (header) {
                    this.insertTemplateSectionHeader(instance, def, header);
                }
                const pairs = this.parseDoubleColumnValue(content);
                if (!pairs.length) {
                    break;
                }
                const row = instance.doubleColumnRow(def.name, pairs);
                instance.insertRow(row.row, def.name);
                break;
            }
            case "definition": {
                await this.applyDefinitionField(instance, def, value);
                break;
            }
            default: {
                await this.applyTextField(instance, def, value);
                break;
            }
        }
    }

    static async applyDefinitionField(instance, def, value) {
        const { header, content } = this.splitTemplateSection(value);
        if (header) {
            this.insertTemplateSectionHeader(instance, def, header);
        }
        if (this.looksLikeDoubleColumn(content)) {
            const pairs = this.parseDoubleColumnValue(content);
            const row = instance.doubleColumnRow(def.name, pairs);
            instance.insertRow(row.row, def.name);
            return;
        }
        const row = instance.textRow(def.name, true);
        await this.fillTemplateList(
            row.row.querySelector(".template-cell-info"),
            content,
        );
        instance.insertRow(row.row, def.name);
    }

    static async applyTextField(instance, def, value) {
        const { header, content } = this.splitTemplateSection(value);
        if (header) {
            this.insertTemplateSectionHeader(instance, def, header);
        }

        const media = this.parseTemplateMediaValue(content);
        if (media.type === "double-image" || def.type === "double-image") {
            if (this.applyImageField(instance, def, { ...media, type: "double-image" })) {
                return;
            }
        }
        if (
            media.type === "image" ||
            media.type === "large-image" ||
            content.startsWith("{{")
        ) {
            if (this.applyImageField(instance, def, media)) {
                return;
            }
        }

        if (this.looksLikeDoubleColumn(content)) {
            const pairs = this.parseDoubleColumnValue(content);
            const row = instance.doubleColumnRow(def.name, pairs);
            instance.insertRow(row.row, def.name);
            return;
        }

        const row = instance.textRow(def.name, false);
        await this.fillTemplateList(
            row.row.querySelector(".template-cell-info"),
            content,
        );
        instance.insertRow(row.row, def.name);
    }

    static parseDoubleColumnValue(value) {
        return String(value || "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
                const cleaned = line.replace(/^-\s*/, "");
                if (!cleaned.includes(";;")) {
                    return null;
                }
                const [left, right] = cleaned
                    .split(";;")
                    .map((part) => part.trim());
                return [left || "<br>", right || "<br>"];
            })
            .filter(Boolean);
    }

    static parseTemplateMediaValue(value) {
        const trimmed = String(value || "").trim();
        for (const candidate of [trimmed, trimmed.split("\n")[0]?.trim()]) {
            if (!candidate) {
                continue;
            }
            const macro = SourceInline.readMacro(candidate, 0);
            if (macro) {
                switch (macro.type) {
                    case "image":
                    case "template-image":
                        return { type: "image", urls: [macro.parts[1] || ""] };
                    case "large-image":
                        return {
                            type: "large-image",
                            urls: [macro.parts[1] || ""],
                        };
                    case "double-image":
                        return {
                            type: "double-image",
                            urls: String(macro.parts[1] || "")
                                .split(";;")
                                .map((part) => part.trim()),
                        };
                    default:
                        break;
                }
            }
        }
        const firstLine = trimmed.split("\n")[0]?.trim() || "";
        if (firstLine.includes(";;") && !firstLine.startsWith("{{")) {
            return {
                type: "double-image",
                urls: firstLine.split(";;").map((part) => part.trim()),
            };
        }
        return { type: null, urls: [firstLine] };
    }

    static async fillTemplateList(list, value) {
        if (!list) {
            return;
        }
        list.replaceChildren();
        const items = SourceInline.parseListItems(value);
        for (const item of items) {
            const li = document.createElement("li");
            const trimmed = String(item || "").trim();
            if (trimmed.startsWith("{{")) {
                const node = await this.parseTemplateListItem(trimmed);
                if (node) {
                    if (node.childNodes?.length > 1) {
                        [...node.childNodes].forEach((child) =>
                            li.appendChild(child),
                        );
                    } else {
                        li.appendChild(node);
                    }
                }
            } else {
                await SourceInline.fillElementAsync(li, trimmed);
            }
            if (!li.childNodes.length) {
                li.innerHTML = "<br>";
            }
            list.appendChild(li);
            await yieldToMain(0);
        }
        if (!list.childNodes.length) {
            const li = document.createElement("li");
            li.innerHTML = "<br>";
            list.appendChild(li);
        }
    }

    static async parseTemplateListItem(text) {
        const macro = SourceInline.readMacro(text.trim(), 0);
        if (!macro) {
            return null;
        }
        if (macro.type === "double-image") {
            const [url1, url2] = String(macro.parts[1] || "")
                .split(";;")
                .map((part) => part.trim());
            if (!url1 || !url2) {
                return await this.parseMacroBlock(text.trim());
            }
            const fragment = document.createDocumentFragment();
            const img1 = document.createElement("img");
            img1.src = url1;
            img1.classList.add("template-image", "template-first-image");
            const img2 = document.createElement("img");
            img2.src = url2;
            img2.classList.add("template-image", "template-second-image");
            fragment.append(img1, img2);
            return fragment;
        }
        return await this.parseMacroBlock(text.trim());
    }
}

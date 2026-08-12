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

    static normalizeFieldSlug(value) {
        const raw = String(value || "").trim();
        if (raw === "_title") {
            return "_title";
        }
        return raw
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    static resolveFieldRaw(fields, slug) {
        if (!fields || slug == null) {
            return null;
        }
        const target = SourceParser.normalizeFieldSlug(slug);
        for (const [key, value] of Object.entries(fields)) {
            if (SourceParser.normalizeFieldSlug(key) === target) {
                return value;
            }
        }
        return null;
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
            case "template-single-image":
                return Media.create(
                    Media.classMap.imageTemplate,
                    macro.parts[1] || "",
                    macro.parts[2] || "",
                );
            case "image-table":
                return Media.create(
                    Media.classMap.imageTable,
                    macro.parts[1] || "",
                );
            case "icon":
            case "icon-image":
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
                    const element = Paragraph.create();
                    await SourceInline.fillElementAsync(element, text);
                    return element;
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
            .map((line) => SourceInline.splitTableCells(line));

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

        if (SourceInline.isSingleCompleteMacro(value)) {
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

        const appliedSlugs = new Set();

        for (let fieldIndex = 0; fieldIndex < defs.length; fieldIndex++) {
            const def = defs[fieldIndex];
            const slug = instance.fieldSlug(def.name);
            const raw = this.resolveFieldRaw(fields, slug);
            if (raw == null || raw === "") {
                continue;
            }
            appliedSlugs.add(this.normalizeFieldSlug(slug));
            await this.applyTemplateField(instance, def, raw);
            await yieldToMain();
        }

        for (const [key, raw] of Object.entries(fields)) {
            if (key === "_title" || raw == null || raw === "") {
                continue;
            }
            const normalized = this.normalizeFieldSlug(key);
            if (appliedSlugs.has(normalized)) {
                continue;
            }
            const def = defs.find(
                (entry) => this.normalizeFieldSlug(entry.name) === normalized,
            );
            if (def) {
                appliedSlugs.add(normalized);
                await this.applyTemplateField(instance, def, raw);
                await yieldToMain();
                continue;
            }
            if (
                /^image-row-\d+$/.test(normalized) ||
                this.extractImageUrl(raw)
            ) {
                await this.applyOrphanImageField(
                    instance,
                    defs,
                    raw,
                    appliedSlugs,
                );
                await yieldToMain();
            }
        }

        table.querySelectorAll("img").forEach((img) => {
            Media.applyTemplateImageLayout(img);
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
            fields[this.normalizeFieldSlug(currentKey)] =
                currentValue.join("\n").trim();
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

    static async applyOrphanImageField(instance, defs, raw, appliedSlugs) {
        const media = this.parseTemplateMediaValue(raw);
        if (!this.extractImageUrl(raw)) {
            return;
        }
        const imageTypes = new Set(["single-image", "image", "large-image", "double-image"]);
        const def = defs.find((entry) => {
            const type = this.normalizeFieldType(entry);
            if (!imageTypes.has(type)) {
                return false;
            }
            return !appliedSlugs.has(this.normalizeFieldSlug(entry.name));
        });
        if (!def) {
            return;
        }
        appliedSlugs.add(this.normalizeFieldSlug(def.name));
        await this.applyTemplateField(instance, def, raw);
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
        const name = String(def?.name || "").toLowerCase();
        if (/\blogo\b/.test(name)) {
            return "single-image";
        }
        if (/\bmap\b/.test(name)) {
            return "large-image";
        }
        const type = String(def?.type || "text")
            .trim()
            .replace(/_/g, "-");
        if (type === "image") {
            return "single-image";
        }
        return type;
    }

    static isLargeImageMacro(value) {
        const macro = SourceParser.readTemplateImageMacro(String(value || "").trim());
        if (!macro) {
            return false;
        }
        return macro.type === "template-large-image" || macro.type === "large-image";
    }

    static readTemplateImageMacro(value) {
        const trimmed = String(value || "").trim();
        if (!trimmed) {
            return null;
        }
        const direct = SourceInline.readMacro(trimmed, 0);
        if (direct) {
            return direct;
        }
        const inlineIndex = trimmed.indexOf("{{");
        if (inlineIndex >= 0) {
            return SourceInline.readMacro(trimmed, inlineIndex);
        }
        return null;
    }

    static extractImageUrl(value) {
        const media = SourceParser.parseTemplateMediaValue(value);
        const url = String(media?.urls?.[0] || "").trim();
        if (!url || url.startsWith("{{")) {
            return "";
        }
        if (/^https?:\/\//i.test(url)) {
            return url;
        }
        const macro = SourceParser.readTemplateImageMacro(value);
        if (macro?.parts?.[1]) {
            return macro.parts[1];
        }
        return "";
    }

    static applyImageField(instance, def, media, raw = "") {
        const urls = Array.isArray(media?.urls) ? media.urls : [];
        const postIds = Array.isArray(media?.postIds) ? media.postIds : [];
        if (media?.type === "double-image") {
            const [url1, url2] = urls;
            if (!url1 || !url2) {
                return false;
            }
            const row = instance.doubleImageRow(
                def.name,
                url1,
                url2,
                postIds[0] || "",
                postIds[1] || "",
            );
            instance.insertRow(row.row, def.name);
            return true;
        }
        let url = String(urls[0] || "").trim();
        if (!url || url.startsWith("{{")) {
            const recovered = this.extractImageUrl(raw);
            if (!recovered) {
                return false;
            }
            url = recovered;
        }
        const fieldType = SourceParser.normalizeFieldType(def);
        const isLarge = fieldType === "large-image";
        const row = instance.imageRow(
            def.name,
            url,
            isLarge,
            postIds[0] || "",
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
            case "single-image":
            case "image": {
                const media = this.parseTemplateMediaValue(value);
                this.applyImageField(instance, def, media, value);
                break;
            }
            case "large-image": {
                const media = this.parseTemplateMediaValue(value);
                this.applyImageField(instance, def, media, value);
                break;
            }
            case "double-image": {
                const media = this.parseTemplateMediaValue(value);
                this.applyImageField(instance, def, {
                    ...media,
                    type: "double-image",
                }, value);
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
                const row = await this.fillDoubleColumnRow(instance, def.name, pairs);
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

        const media = this.parseTemplateMediaValue(content);
        if (media.type === "double-image" || def.type === "double-image") {
            if (this.applyImageField(instance, def, { ...media, type: "double-image" }, content)) {
                return;
            }
        }
        if (
            media.type === "single-image" ||
            media.type === "large-image" ||
            media.type === "image" ||
            media.type === "double-image"
        ) {
            if (this.applyImageField(instance, def, media, content)) {
                return;
            }
        }

        if (this.looksLikeDoubleColumn(content)) {
            const pairs = this.parseDoubleColumnValue(content);
            const row = await this.fillDoubleColumnRow(instance, def.name, pairs);
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
            if (this.applyImageField(instance, def, { ...media, type: "double-image" }, content)) {
                return;
            }
        }
        if (
            media.type === "single-image" ||
            media.type === "large-image" ||
            media.type === "image" ||
            media.type === "double-image"
        ) {
            if (this.applyImageField(instance, def, media, content)) {
                return;
            }
        }

        if (this.looksLikeDoubleColumn(content)) {
            const pairs = this.parseDoubleColumnValue(content);
            const row = await this.fillDoubleColumnRow(instance, def.name, pairs);
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

    static async fillDoubleColumnRow(instance, field, pairs) {
        const row = document.createElement("tr");
        row.dataset.field = instance.fieldSlug(field);
        const left = document.createElement("ul");
        left.classList.add("template-cell-info");
        const right = document.createElement("ul");
        right.classList.add("template-cell-info");

        for (const [leftText, rightText] of pairs) {
            left.appendChild(
                await this.fillTemplateListItem(leftText === "<br>" ? "" : leftText),
            );
            right.appendChild(
                await this.fillTemplateListItem(
                    rightText === "<br>" ? "" : rightText,
                ),
            );
            await yieldToMain(0);
        }

        const tdLeft = document.createElement("td");
        const tdRight = document.createElement("td");
        tdLeft.appendChild(left);
        tdRight.appendChild(right);
        row.append(tdLeft, tdRight);
        return { row };
    }

    static async fillTemplateListItem(text) {
        const li = document.createElement("li");
        const trimmed = String(text || "").trim();
        if (!trimmed) {
            li.innerHTML = "<br>";
            return li;
        }
        if (SourceInline.isSingleCompleteMacro(trimmed)) {
            const node = await this.parseTemplateListItem(trimmed);
            if (node) {
                if (node.childNodes?.length > 1) {
                    [...node.childNodes].forEach((child) => li.appendChild(child));
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
        return li;
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
        const candidates = trimmed
            .split("\n")
            .map((line) => line.trim().replace(/^-\s*/, ""))
            .filter(Boolean);
        if (!candidates.length) {
            candidates.push(trimmed);
        }

        for (const candidate of candidates) {
            const macro = SourceParser.readTemplateImageMacro(candidate);
            if (macro) {
                switch (macro.type) {
                    case "template-single-image":
                    case "template-image":
                    case "image":
                        return {
                            type: "single-image",
                            urls: [macro.parts[1] || ""],
                            postIds: macro.parts[2] ? [macro.parts[2]] : [],
                        };
                    case "template-large-image":
                    case "large-image":
                        return {
                            type: "large-image",
                            urls: [macro.parts[1] || ""],
                            postIds: macro.parts[2] ? [macro.parts[2]] : [],
                        };
                    case "template-double-image":
                    case "double-image":
                        return {
                            type: "double-image",
                            urls: Media.parseDoubleImageUrls(macro.parts[1]),
                            postIds: macro.parts[2]
                                ? Media.parseDoubleImageUrls(macro.parts[2])
                                : [],
                        };
                    default:
                        break;
                }
            }
            if (/^https?:\/\//i.test(candidate)) {
                return { type: "single-image", urls: [candidate], postIds: [] };
            }
            if (candidate.includes(";;") && !candidate.startsWith("{{")) {
                return {
                    type: "double-image",
                    urls: candidate.split(";;").map((part) => part.trim()),
                    postIds: [],
                };
            }
        }

        const firstLine = candidates[0] || "";
        return { type: null, urls: [firstLine], postIds: [] };
    }

    static async fillTemplateList(list, value) {
        if (!list) {
            return;
        }
        list.replaceChildren();
        const items = SourceInline.parseListItems(value);
        for (const item of items) {
            list.appendChild(await this.fillTemplateListItem(item));
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
        if (macro.type === "template-double-image" || macro.type === "double-image") {
            const [url1, url2] = Media.parseDoubleImageUrls(macro.parts[1]);
            if (!url1 || !url2) {
                return await this.parseMacroBlock(text.trim());
            }
            return Media.createTemplateDoubleImage(url1, url2);
        }
        return await this.parseMacroBlock(text.trim());
    }
}

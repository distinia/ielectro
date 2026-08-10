import { Editor } from "./editor.js";

export class ElementTree {
    static findClass(value) {
        return ElementTree.getClasses().find((Class) => {
            if (Class.className === value) {
                return true;
            }
            if (Class.classMap) {
                return (
                    Object.values(Class.classMap).includes(value) ||
                    Object.keys(Class.classMap).includes(value)
                );
            }
            if (Class.tag) {
                return typeof value === "string"
                    ? value === Class.tag
                    : value.tagName?.toLowerCase() === Class.tag;
            }
            return false;
        });
    }

    static getClasses() {
        return Editor.current?.elements || [];
    }

    static async exportElement(element) {
        const Class = ElementTree.findClass(element);
        if (!Class) return null;
        const instance = Class.list?.get(element);
        if (!instance || typeof instance.export !== "function") {
            return null;
        }
        return await instance.export();
    }

    static async exportChildren(element) {
        if (!element) return [];
        return (
            await Promise.all(
                [...element.childNodes].map(async (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        return node.textContent;
                    }
                    return await ElementTree.exportElement(node);
                }),
            )
        ).filter(Boolean);
    }

    static addChildren(parent, children) {
        children?.forEach((child) => {
            parent.append(child);
        });
        return parent;
    }
}

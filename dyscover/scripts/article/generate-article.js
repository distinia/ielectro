import { Wait, Box } from "../core/index.js";
import { API } from "./api.js";
import { Article } from "./article.js";
import { Select } from "./select.js";
import { Editor } from "./editor.js";
export class GenerateArticle {
    static classes = null;
    static async init() {
        const box = new Box("Generate Article");
        await box.create();
        box.footer((footer)=>{
            footer.innerHTML = `
                <button class="download-btn">Download</button>
                <input class="generate-prompt" type="text" placeholder="Enter your prompt here...">
                <button class="generate-btn">Generate</button>
            `;
            footer.querySelector(".generate-btn").onclick = async ()=>{
                Wait.show();
                const prompt = footer.querySelector(".generate-prompt").value;
                const data = await API.generateAI(prompt);
                const container = Select.container();
                container.innerHTML = "";
                const title = document.createElement("h1");
                title.className = "title";
                title.innerText = Editor.current.title.innerText;
                container.append(title, await this.createElements(data));
                Wait.hide();
                box.close();
                Editor.current.closeEditing();
            };
            footer.querySelector(".download-btn").onclick = ()=>{
                this.download();
            };
        });
    }
    static async download() {
        const json = await this.export(Select.container());
        const blob = new Blob([JSON.stringify(json, null, 4)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${Editor.current.title.innerText}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
    static async export(container) {
        return (await Promise.all(
            [...container.children]
                .filter(element=>!element.classList.contains("title"))
                .map(element=>this.exportElement(element))
        )).filter(Boolean);
    }
    static async exportElement(element) {
        const Class = this.findClass(element);
        if (!Class) return null;
        const instance = Class.list?.get(element);
        if (!instance || typeof instance.export !== "function") {
            return null;
        }
        return await instance.export();
    }
    static async exportChildren(element) {
        if (!element) return [];
        return (await Promise.all(
            [...element.childNodes].map(async node=>{
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent;
                }
                return await this.exportElement(node);
            })
        )).filter(Boolean);
    }
    static async createElements(elements) {
        const fragment = document.createDocumentFragment();
        for (const data of elements) {
            const instance = await this.createElement(data);
            if (instance) {
                fragment.append(instance.element);
            }
        }
        return fragment;
    }
    static async createElement(data) {
        const Class = this.findClass(data.element);
        if (!Class?.generate) {
            return null;
        }
        const children = [];
        if (data.children) {
            for (const child of data.children) {
                if (typeof child === "string") {
                    children.push(child);
                    continue;
                }
                const instance = await this.createElement(child);
                if (instance) {
                    children.push(instance.element);
                }
            }
        }
        const obj = {
            ...data,
            children
        };
        const instance = await Class.generate(obj);
        return instance;
    }
    static addChildren(parent, children) {
        children?.forEach(child=>{
            parent.append(child);
        });
        return parent;
    }
    static findClass(value) {
        return this.getClasses().find(Class=>{
            if (Class.className === value) {
                return true;
            }
            if (Class.classMap) {
                return Object.values(Class.classMap).includes(value) || Object.keys(Class.classMap).includes(value);
            }
            if (Class.tag) {
                return typeof value === "string" ? value === Class.tag : value.tagName?.toLowerCase() === Class.tag;
            }
            return false;
        });
    }
    static getClasses() {
        return this.classes || (this.classes = Editor.current.elements);
    }
}

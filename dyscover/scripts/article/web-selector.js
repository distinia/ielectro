import { Alert, Box } from "../core/index.js";
import { API } from "./api.js";
import { Select } from "./select.js";
export class WebSelector {
    static options = ["dyscover", "url"];
    constructor(type) {
        this.type = type;
        this.selectedClass = null;
        this.items = [];
        this.box = null;
    }
    static async init(option, type) {
        const instance = new WebSelector(type);
        if (option === WebSelector.options[0]) {
            return await instance.fromServer();
        }
        if (option === WebSelector.options[1]) {
            return await instance.fromURL();
        }
        return null;
    }
    async fromServer() {
        return new Promise(async (resolve) => {
            this.box = new Box("Select a " + this.type);
            await this.box.create();
            this.box.footer((footer) => {
                footer.innerHTML = `
                    <input class="input" placeholder="Name or tag">
                    <button class="button">Add</button>
                `;
                const btn = footer.querySelector("button");
                btn.onclick = () => {
                    const selected = this.box.container.querySelector(
                        `.${this.selectedClass}`,
                    );
                    if (!selected) {
                        Alert.error("Select an item first");
                        return;
                    }
                    this.box.close();
                    resolve(selected.dataset.value);
                };
            });
            this.box.body((body) => {
                const input = this.box.container.querySelector("input");
                const debounced = this.debounce(async (value) => {
                    const data = await API.search(this.type, value);
                    body.innerHTML = "";
                    if (!data.length) return;
                    const config = this.updateCategory(data[0]);
                    this.selectedClass = config.selectClass;
                    data.forEach((result) => {
                        const { tag, boxClass } = this.updateCategory(result);
                        const el = document.createElement("div");
                        el.classList.add(boxClass);
                        if (["article", "template"].includes(result.type)) {
                            el.innerHTML = tag;
                        } else {
                            const title = `<div class="media-title">${result.title}</div>`;
                            el.innerHTML = tag + title;
                        }
                        el.dataset.value =
                            this.type === "article"
                                ? result.url
                                : this.type === "template"
                                    ? result.title
                                    : `${result.media}?t=${new Date(result.updated).getTime()}`;
                        body.appendChild(el);
                        this.bindItem(el);
                    });
                }, 300);
                input.oninput = () => {
                    const v = input.value.trim();
                    if (!v) {
                        body.innerHTML = "";
                        return;
                    }
                    debounced(v);
                };
            });
        });
    }
    async fromURL() {
        while (true) {
            const url = await Alert.prompt("Insert the URL");
            if (url === false) {
                return null;
            }
            const trimmed = String(url || "").trim();
            if (!trimmed) {
                Alert.error("URL cannot be empty");
                continue;
            }
            const valid = /^(ftp|http|https)://[^ "]+$/.test(trimmed);
            if (valid) return trimmed;
            Alert.error("Invalid URL");
        }
    }
    updateCategory(result) {
        const title = result.title || "";
        const media = result.media
            ? `${result.media}?t=${new Date(result.updated).getTime()}`
            : "";
        let tag = "";
        let boxClass = "media-box";
        let selectClass = "selected-media";
        switch (this.type) {
            case "article":
            case "template":
                tag = `
                    <div class="search-image" style="background-image: url(${media})"></div>
                    <div class="search-text"><b>${title}</b></div>`;
                boxClass = "search-row";
                selectClass = "selected-link";
                break;
            case "image":
                tag = `<img src="${media}">`;
                break;
            case "video":
                tag = `<video src="${media}" controls></video>`;
                break;
            case "audio":
                tag = `<audio src="${media}" controls></audio>`;
                break;
            case "document":
                tag = `<iframe src="${media}"></iframe>`;
                break;
        }
        return { tag, boxClass, selectClass };
    }
    bindItem(item) {
        item.onclick = () => {
            const all = this.box.container.querySelectorAll(`.${item.classList[0]}`);
            all.forEach((el) => el.classList.remove(this.selectedClass));
            item.classList.add(this.selectedClass);
        };
    }
    debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }
}

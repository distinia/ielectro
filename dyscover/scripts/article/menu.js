import { Icons } from "../core/index.js";
const MENU_ICONS = {
    "Add row up": "arrow-up",
    "Add row down": "arrow-down",
    "Delete row": "trash-2",
    "Add column left": "arrow-left",
    "Add column right": "arrow-right",
    "Delete column": "columns-2",
    "Delete table": "table-2",
    Open: "settings-2",
    Delete: "trash-2",
    Update: "pencil",
    Replace: "refresh-cw",
    "Change Position": "move-horizontal",
    "Change color": "aperture",
    "Set As Cover": "image",
};
export class Menu {
    static current = null;
    constructor(instance) {
        if (!instance) return;
        this.instance = instance;
        this.instanceElement = instance.element;
        this.actions = instance.menuActions || [];
        this.element = null;
        this._editing = false;
        this.openOnClick = false;
    }
    startEditing(options = {}) {
        if (!this.instanceElement) return;
        this.openOnClick = !!options.openOnClick;
        if (this._editing) {
            this.instanceElement.classList.toggle("has-menu", this.openOnClick);
            return;
        }
        this._editing = true;
        this.contextHandler = (e) => {
            if (!this.instanceElement.contains(e.target)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            this.showAt(e.pageX, e.pageY);
        };
        this.openClickHandler = (e) => {
            if (!this.openOnClick) {
                return;
            }
            if (!this.instanceElement.contains(e.target)) {
                return;
            }
            if (e.button !== 0) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            this.showAt(e.pageX, e.pageY);
        };
        this.clickHandler = (e) => {
            if (!this.element) {
                return;
            }
            if (this.element.contains(e.target)) {
                return;
            }
            if (this.instanceElement.contains(e.target)) {
                return;
            }
            this.hide();
        };
        this.instanceElement.addEventListener("contextmenu", this.contextHandler);
        this.instanceElement.addEventListener("click", this.openClickHandler);
        document.addEventListener("click", this.clickHandler);
        this.instanceElement.classList.toggle("has-menu", this.openOnClick);
    }
    showAt(x, y) {
        if (Menu.current && Menu.current !== this) {
            Menu.current.hide();
        }
        this.open(x, y);
    }
    open(x, y) {
        this.hide();
        Menu.current = this;
        this.element = document.createElement("div");
        this.element.className = "menu";
        this.actions.forEach((action) => {
            if (!action?.name) return;
            if (typeof action.action !== "function") {
                return;
            }
            const option = document.createElement("div");
            option.className = "menuOption";
            const iconName = MENU_ICONS[action.name] || "circle-plus";
            option.innerHTML = `<i data-icon="${iconName}"></i><span>${action.name}</span>`;
            option.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                action.action.call(this.instance);
                this.hide();
            });
            this.element.appendChild(option);
        });
        if (!this.element.childNodes.length) {
            this.element.remove();
            this.element = null;
            Menu.current = null;
            return;
        }
        document.body.appendChild(this.element);
        void Icons.load(this.element);
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        requestAnimationFrame(() => {
            if (this.element) {
                this.element.classList.add("menu-active");
            }
        });
    }
    hide() {
        if (!this.element) return;
        if (Menu.current === this) {
            Menu.current = null;
        }
        const element = this.element;
        this.element = null;
        element.classList.remove("menu-active");
        element.addEventListener(
            "transitionend",
            () => {
                element.remove();
            },
            { once: true },
        );
        setTimeout(() => element.remove(), 250);
    }
    closeEditing() {
        this._editing = false;
        if (this.contextHandler) {
            this.instanceElement.removeEventListener(
                "contextmenu",
                this.contextHandler,
            );
            this.contextHandler = null;
        }
        if (this.openClickHandler) {
            this.instanceElement.removeEventListener(
                "click",
                this.openClickHandler,
            );
            this.openClickHandler = null;
        }
        if (this.clickHandler) {
            document.removeEventListener("click", this.clickHandler);
            this.clickHandler = null;
        }
        this.instanceElement?.classList.remove("has-menu");
        this.hide();
    }
}

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
    Replace: "refresh-cw",
    "Change Position": "move-horizontal",
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
    }
    startEditing() {
        if (!this.instanceElement) return;
        this.contextHandler = (e) => {
            if (!this.instanceElement.contains(e.target)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (Menu.current && Menu.current !== this) {
                Menu.current.hide();
            }
            this.open(e.pageX, e.pageY);
        };
        this.clickHandler = (e) => {
            if (this.element && !this.element.contains(e.target)) {
                this.hide();
            }
        };
        this.instanceElement.addEventListener("contextmenu", this.contextHandler);
        document.addEventListener("click", this.clickHandler);
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
            const iconName = MENU_ICONS[action.name] || "circle";
            option.innerHTML = `<i data-icon="${iconName}"></i><span>${action.name}</span>`;
            option.addEventListener("click", () => {
                action.action.call(this.instance);
                this.hide();
            });
            this.element.appendChild(option);
        });
        document.body.appendChild(this.element);
        void Icons.load(this.element);
        this.element.style.left = x + "px";
        this.element.style.top = y + "px";
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
    }
    closeEditing() {
        if (this.contextHandler) {
            this.instanceElement.removeEventListener(
                "contextmenu",
                this.contextHandler,
            );
        }
        if (this.clickHandler) {
            document.removeEventListener("click", this.clickHandler);
        }
        this.hide();
    }
}

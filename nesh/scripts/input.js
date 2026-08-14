export default class Input {
    static sanitize(input) {
        if (!(input instanceof HTMLInputElement) &&
            !(input instanceof HTMLTextAreaElement)) {
            return;
        }
        if (
            input instanceof HTMLInputElement &&
            (input.type === "file" ||
                input.type === "checkbox" ||
                input.type === "radio" ||
                input.type === "button" ||
                input.type === "submit" ||
                input.type === "search")
        ) {
            return;
        }
        switch (input.name) {
            case "username":
                input.value = input.value
                    .toLowerCase()
                    .replace(/[^a-z0-9._]/g, "");
                break;
            case "name":
            case "surname": {
                const value = input.value.replace(
                    /[^a-zA-Z0-9\s()' -]/g,
                    ""
                );
                input.value =
                    value.charAt(0).toUpperCase() + value.slice(1);
                break;
            }
            case "email":
                input.value = input.value
                    .toLowerCase()
                    .replace(/[^a-z0-9.@_-]/g, "");
                break;
            case "password":
            case "current-password":
            case "confirm-password":
            case "title":
            case "description":
            case "field_label":
            case "biography":
            case "body":
            case "requirements":
                break;
            default:
                break;
        }
    }
    static bind(selector = "input, textarea") {
        document.addEventListener("input", (event) => {
            const input = event.target;
            if (
                !(input instanceof HTMLInputElement) &&
                !(input instanceof HTMLTextAreaElement)
            ) {
                return;
            }
            if (!input.matches(selector)) {
                return;
            }
            this.sanitize(input);
        });
    }
    static disableAutocomplete() {
        document
            .querySelectorAll("input, textarea")
            .forEach((element) =>
                element.setAttribute("autocomplete", "off")
            );
    }
    static disableTextCorrection() {
        document.documentElement.setAttribute("spellcheck", "false");
        document.documentElement.setAttribute("autocorrect", "off");
        document.documentElement.setAttribute("autocapitalize", "off");
    }
    static enablePlainTextPaste() {
        document.addEventListener("paste", (event) => {
            const input = event.target;
            if (
                !(input instanceof HTMLInputElement) &&
                !(input instanceof HTMLTextAreaElement)
            ) {
                return;
            }
            event.preventDefault();
            const text = (
                event.clipboardData || window.clipboardData
            ).getData("text/plain");
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            input.setRangeText(text, start, end, "end");
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
    }
    static focusFirst(container = document) {
        const field = container.querySelector("input, textarea, select");
        if (field) field.focus();
    }
    static autoResizeTextarea(selector = "textarea") {
        const resize = (textarea) => {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        };
        document.querySelectorAll(selector).forEach((textarea) => {
            resize(textarea);
            textarea.addEventListener("input", () => resize(textarea));
        });
    }
}
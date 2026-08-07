export default class Icons {
    static cache = {};
    static baseUrl = "https://nesh.ielectro.com/icon/";
    static async load(container = document.body) {
        const elements = Array.from(container.querySelectorAll("i[data-icon]"));
        if (!elements.length) return;
        const names = [
            ...new Set(
                elements
                    .map((el) => el.getAttribute("data-icon"))
                    .filter((name) => name && !this.cache[name]),
            ),
        ];
        await Promise.all(
            names.map(async (name) => {
                try {
                    const res = await fetch(
                        `${this.baseUrl}${encodeURIComponent(name)}.svg`,
                        { credentials: "omit" },
                    );
                    const svg = res.ok ? await res.text() : "";
                    this.cache[name] = this.addClass(svg || "");
                } catch {
                    this.cache[name] = null;
                }
            }),
        );
        elements.forEach((el) => {
            if (!el.parentNode) return;
            const name = el.getAttribute("data-icon");
            const svg = this.cache[name];
            if (svg) {
                el.outerHTML = svg;
            } else {
                el.remove();
            }
        });
    }
    static addClass(svg) {
        if (!svg) return "";
        svg = this.markDecorative(svg);
        if (svg.includes('class="')) {
            return svg.replace(
                /class="([^"]*)"/,
                (match, classes) => `class="${classes} icon"`,
            );
        }
        return svg.replace("<svg ", '<svg class="icon-image" ');
    }
    static markDecorative(svg) {
        if (/aria-hidden=/.test(svg)) return svg;
        return svg.replace(
            "<svg ",
            '<svg aria-hidden="true" focusable="false" ',
        );
    }
}
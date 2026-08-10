export default class LazyMedia {
    static observer = null;

    static skipSelectors = [
        ".profile-edit-avatar-preview",
        ".profile-avatar-crop-image",
        "[data-eager]",
    ];

    static bind(root = document) {
        LazyMedia.apply(root);
        if (LazyMedia.observer || typeof MutationObserver === "undefined") {
            return;
        }
        LazyMedia.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    LazyMedia.apply(node);
                });
            }
        });
        LazyMedia.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    static shouldSkip(el) {
        if (!el || el.nodeType !== 1) return true;
        if (el.dataset?.lazyApplied === "1") return true;
        if (el.dataset?.eager === "true") return true;
        for (const selector of LazyMedia.skipSelectors) {
            if (el.matches?.(selector)) return true;
        }
        return false;
    }

    static mark(el) {
        el.dataset.lazyApplied = "1";
    }

    static apply(root) {
        if (!root) return;
        if (root.nodeType === 1) {
            if (root.matches?.("img") && !LazyMedia.shouldSkip(root)) {
                LazyMedia.img(root);
            }
            if (root.matches?.("iframe") && !LazyMedia.shouldSkip(root)) {
                LazyMedia.iframe(root);
            }
        }
        root.querySelectorAll?.("img").forEach((el) => {
            if (!LazyMedia.shouldSkip(el)) LazyMedia.img(el);
        });
        root.querySelectorAll?.("iframe").forEach((el) => {
            if (!LazyMedia.shouldSkip(el)) LazyMedia.iframe(el);
        });
    }

    static img(el) {
        if (!el.hasAttribute("loading")) {
            el.loading = "lazy";
        }
        LazyMedia.mark(el);
    }

    static iframe(el) {
        if (!el.hasAttribute("loading")) {
            el.loading = "lazy";
        }
        LazyMedia.mark(el);
    }

    static enrichHtml(html) {
        if (typeof html !== "string" || html === "") return html;
        let out = html.replace(
            /<img\b(?![^>]*\bloading\s*=)([^>]*?)>/gi,
            '<img loading="lazy"$1>',
        );
        out = out.replace(
            /<iframe\b(?![^>]*\bloading\s*=)([^>]*?)>/gi,
            '<iframe loading="lazy"$1>',
        );
        return out;
    }
}

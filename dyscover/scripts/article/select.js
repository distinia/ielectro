export class Select {
    static container() {
        return document.querySelector(".content");
    }
    static text() {
        return window.getSelection();
    }
    static cursor() {
        const text = this.text();
        if (!text || text.rangeCount === 0) {
            return null;
        }
        return text.getRangeAt(0);
    }
    static element(cursor = Select.cursor()) {
        if (!cursor) return null;
        const node = cursor.startContainer;
        if (node.nodeType === Node.ELEMENT_NODE) {
            return node;
        }
        return node.parentElement;
    }
    static tag(selector, cursor = Select.cursor()) {
        const element = this.element(cursor);
        if (!element) return null;
        return element.closest(selector);
    }
    static block(cursor = Select.cursor()) {
        const element = this.element(cursor);
        const content = this.container();
        if (!element || !content) {
            return null;
        }
        const block = element.closest(
            "p, h1, h2, h3, h4, h5, h6, div, li, td, th, figure",
        );
        if (!block || block === content) {
            return null;
        }
        if (!block.closest(".content")) {
            return null;
        }
        return block;
    }
    static cursorToEnd(element) {
        if (!element) return;
        const text = this.text();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        text.removeAllRanges();
        text.addRange(range);
    }
}

export function yieldToMain(minMs = 0) {
    return new Promise((resolve) => {
        if (minMs <= 0) {
            globalThis.requestAnimationFrame(() => {
                globalThis.setTimeout(resolve, 0);
            });
            return;
        }
        globalThis.requestAnimationFrame(() => {
            globalThis.setTimeout(resolve, minMs);
        });
    });
}

export class AvatarCrop {
    constructor(root, image) {
        this.root = root;
        this.image = image;
        this.viewport = root.clientWidth || 200;
        this.baseScale = 1;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.dragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.naturalW = 0;
        this.naturalH = 0;
    }

    bind() {
        const zoom = this.root.querySelector(".avatar-crop-zoom");
        this.fit();
        this.root.addEventListener("pointerdown", (event) => {
            if (event.target === zoom) return;
            this.dragging = true;
            this.lastX = event.clientX;
            this.lastY = event.clientY;
            this.root.setPointerCapture(event.pointerId);
        });
        this.root.addEventListener("pointermove", (event) => {
            if (!this.dragging) return;
            this.offsetX += event.clientX - this.lastX;
            this.offsetY += event.clientY - this.lastY;
            this.lastX = event.clientX;
            this.lastY = event.clientY;
            this.clampOffset();
            this.applyTransform();
        });
        this.root.addEventListener("pointerup", (event) => {
            this.dragging = false;
            this.root.releasePointerCapture(event.pointerId);
        });
        this.root.addEventListener(
            "wheel",
            (event) => {
                event.preventDefault();
                const delta = event.deltaY > 0 ? -0.06 : 0.06;
                this.setZoom(this.zoom + delta, event.clientX, event.clientY);
            },
            { passive: false },
        );
        zoom?.addEventListener("input", () => {
            this.setZoom(Number(zoom.value) || 1);
        });
    }

    fit() {
        this.naturalW = this.image.naturalWidth;
        this.naturalH = this.image.naturalHeight;
        if (!this.naturalW || !this.naturalH) return;
        this.baseScale = Math.max(
            this.viewport / this.naturalW,
            this.viewport / this.naturalH,
        );
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        const zoom = this.root.querySelector(".avatar-crop-zoom");
        if (zoom) zoom.value = "1";
        this.clampOffset();
        this.applyTransform();
    }

    scale() {
        return this.baseScale * this.zoom;
    }

    setZoom(nextZoom, clientX = null, clientY = null) {
        const prevScale = this.scale();
        this.zoom = Math.min(3, Math.max(1, nextZoom));
        const nextScale = this.scale();
        if (clientX !== null && clientY !== null && prevScale > 0) {
            const rect = this.root.getBoundingClientRect();
            const cx = clientX - rect.left - this.viewport / 2;
            const cy = clientY - rect.top - this.viewport / 2;
            const ratio = nextScale / prevScale;
            this.offsetX = cx - (cx - this.offsetX) * ratio;
            this.offsetY = cy - (cy - this.offsetY) * ratio;
        }
        const zoom = this.root.querySelector(".avatar-crop-zoom");
        if (zoom) zoom.value = String(this.zoom);
        this.clampOffset();
        this.applyTransform();
    }

    clampOffset() {
        const drawW = this.naturalW * this.scale();
        const drawH = this.naturalH * this.scale();
        const maxX = Math.max(0, (drawW - this.viewport) / 2);
        const maxY = Math.max(0, (drawH - this.viewport) / 2);
        this.offsetX = Math.min(maxX, Math.max(-maxX, this.offsetX));
        this.offsetY = Math.min(maxY, Math.max(-maxY, this.offsetY));
    }

    applyTransform() {
        const s = this.scale();
        this.image.style.transform = `translate(calc(-50% + ${this.offsetX}px), calc(-50% + ${this.offsetY}px)) scale(${s})`;
    }

    async toBlob(size = 512) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        const scale = this.scale();
        const sourceW = this.viewport / scale;
        const sourceH = this.viewport / scale;
        const sourceX = this.naturalW / 2 - sourceW / 2 - this.offsetX / scale;
        const sourceY = this.naturalH / 2 - sourceH / 2 - this.offsetY / scale;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
            this.image,
            sourceX,
            sourceY,
            sourceW,
            sourceH,
            0,
            0,
            size,
            size,
        );
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) =>
                    blob ? resolve(blob) : reject(new Error("Crop failed")),
                "image/png",
                0.92,
            );
        });
    }
}

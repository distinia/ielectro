import { Api } from "../core/api.js";
import { Alert, Request } from "../core/index.js";
import { Icons } from "../core/nesh.js";
import { CreatorModal } from "./creator-modal.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function activeTagTerm(value, caret) {
    const before = value.slice(0, caret ?? value.length);
    const match = before.match(/#([\p{L}\p{N}_-]*)$/u);
    return match ? match[1] : "";
}

function replaceActiveTag(input, tag) {
    const caret = input.selectionStart ?? input.value.length;
    const before = input.value.slice(0, caret);
    const after = input.value.slice(caret);
    input.value = before.replace(/#([\p{L}\p{N}_-]*)$/u, `#${tag} `) + after;
    input.focus();
}

export class CreatorMeta {
    static fieldHtml({ title = "", description = "", tags = [] } = {}) {
        const tagValue = (Array.isArray(tags) ? tags : [])
            .map((tag) => `#${String(tag).replace(/^#+/, "")}`)
            .join(" ");
        return `
                <div class="creator-field">
                    <input id="creator-title" class="input" name="title" data-preserve-case="true" placeholder="Give your content a title" value="${escapeHtml(title)}" required>
                </div>
                <div class="creator-field">
                    <textarea id="creator-description" class="textarea" name="description" data-preserve-case="true" placeholder="Short summary for feeds and search">${escapeHtml(description)}</textarea>
                </div>
                <div class="creator-field tags-field">
                    <div class="tags-input-wrap">
                        <input id="creator-tags" class="input tags-input" name="tags" placeholder="#news #tutorial" value="${escapeHtml(tagValue)}" autocomplete="off">
                        <ul class="tags-suggestions" hidden></ul>
                    </div>
                </div>`;
    }

    static optionsHtml({
        type = "article",
        typeLocked = false,
        allowComments = true,
    } = {}) {
        return `
                <div class="creator-field creator-type-field">
                    ${CreatorModal.typeSelectHtml(type, { locked: typeLocked })}
                </div>
                <div class="creator-option-row">
                    <span>Allow comments</span>
                    <label class="creator-switch">
                        <input type="checkbox" name="allow_comments" value="1"${allowComments ? " checked" : ""}>
                        <span class="creator-switch-ui" aria-hidden="true"></span>
                    </label>
                </div>`;
    }

    static bindTags(root) {
        const input = root.querySelector(".tags-input");
        const list = root.querySelector(".tags-suggestions");
        if (!input || !list) return;

        let timer = null;
        input.addEventListener("input", () => {
            clearTimeout(timer);
            const term = activeTagTerm(input.value, input.selectionStart);
            if (!term) {
                list.hidden = true;
                return;
            }
            timer = setTimeout(async () => {
                try {
                    const res = await Request.get(Api.tagsSuggest(term));
                    const items = Api.list(res);
                    if (!items.length) {
                        list.hidden = true;
                        return;
                    }
                    list.innerHTML = items
                        .map(
                            (name) =>
                                `<li role="option" data-tag="${escapeHtml(name)}">#${escapeHtml(name)}</li>`,
                        )
                        .join("");
                    list.hidden = false;
                    list.querySelectorAll("li").forEach((item) => {
                        item.onclick = () => {
                            replaceActiveTag(input, item.dataset.tag);
                            list.hidden = true;
                        };
                    });
                } catch {
                    list.hidden = true;
                }
            }, 180);
        });

        input.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            list.hidden = true;
        });

        document.addEventListener("click", (event) => {
            if (!root.contains(event.target)) {
                list.hidden = true;
            }
        });
    }

    static readTags(form) {
        const field = form.tags || form.querySelector('[name="tags"]');
        const raw = String(field?.value || "");
        const matches = raw.match(/#([\p{L}\p{N}_-]+)/gu) || [];
        return [
            ...new Set(
                matches.map((match) => match.slice(1).toLowerCase()),
            ),
        ];
    }

    static async withSubmitLock(submitBtn, task) {
        if (!submitBtn || submitBtn.dataset.busy === "1") {
            return null;
        }
        submitBtn.dataset.busy = "1";
        submitBtn.disabled = true;
        submitBtn.classList.add("is-loading");
        const label =
            submitBtn.dataset.label ||
            submitBtn.getAttribute("aria-label") ||
            submitBtn.textContent?.trim() ||
            "Save";
        const icon = submitBtn.dataset.icon || "";
        submitBtn.innerHTML = `<span class="creator-btn-spinner" aria-hidden="true"></span>`;
        try {
            return await task();
        } catch (e) {
            Alert.error(typeof e === "object" && e?.text ? e.text : "Save failed");
            return false;
        } finally {
            submitBtn.disabled = false;
            submitBtn.classList.remove("is-loading");
            if (icon) {
                submitBtn.innerHTML = `<i data-icon="${icon}"></i>`;
                await Icons.load(submitBtn);
            } else {
                submitBtn.textContent = label;
            }
            submitBtn.dataset.busy = "0";
        }
    }
}

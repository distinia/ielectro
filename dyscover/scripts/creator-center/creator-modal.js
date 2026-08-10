import { Icons } from "../core/index.js";
import { CREATOR_TYPES } from "./creator-types.js";

export class CreatorModal {
    static typeSelectHtml(currentType, { locked = false } = {}) {
        const options = CREATOR_TYPES.map(
            ({ value, label }) =>
                `<option value="${value}"${value === currentType ? " selected" : ""}>${label}</option>`,
        ).join("");
        return `<select class="select creator-type-select" name="content_type" aria-label="Content type"${locked ? " disabled" : ""}>${options}</select>`;
    }

    static headerActions({ formId, showChoose = false, submitAction = "save" }) {
        const saveLabel = submitAction === "upload" ? "Upload" : "Save";
        const submitIcon = submitAction === "upload" ? "upload" : "check";
        const chooseBtn = showChoose
            ? `<button type="button" class="button button-secondary creator-header-btn creator-choose-file" aria-label="Choose file" title="Choose file"><i data-icon="paperclip"></i></button>`
            : "";
        return `
            ${chooseBtn}
            <button type="submit" class="button button-primary creator-header-btn creator-submit-btn" form="${formId}" aria-label="${saveLabel}" title="${saveLabel}" data-label="${saveLabel}" data-icon="${submitIcon}"><i data-icon="${submitIcon}"></i></button>`;
    }

    static async mountHeaderActions(headerActionsEl, html, bind) {
        headerActionsEl.insertAdjacentHTML("beforeend", html);
        bind?.(headerActionsEl);
        await Icons.load(headerActionsEl);
    }
}

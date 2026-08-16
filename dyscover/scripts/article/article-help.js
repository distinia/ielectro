export const ArticleHelp = {
    link: `
        <p><strong>Insert a Dyscover link</strong> from articles or documents, or paste an external URL.</p>
        <ul>
            <li>Search by title or tag — matching is not case-sensitive.</li>
            <li>Select a row, then press <strong>Add</strong>.</li>
            <li>Article links show a preview on hover; document links open the post.</li>
        </ul>`,
    media: `
        <p><strong>Insert media</strong> from your Dyscover library or an external URL.</p>
        <ul>
            <li>Search by title or tag in the footer field.</li>
            <li>Press <strong>+</strong> to insert the selected media.</li>
            <li>While reading, click media to open its post.</li>
        </ul>`,
    template: `
        <p><strong>Template fields</strong> are loaded from the server for this template.</p>
        <ul>
            <li>Check fields to add them to the infobox.</li>
            <li>Uncheck to remove a field from the article.</li>
            <li>Use <strong>Apply fields</strong> to save your selection.</li>
        </ul>`,
    replace: `
        <p><strong>Find and replace</strong> text inside the article body.</p>
        <ul>
            <li>Search is case-sensitive (e.g. <code>RuTo</code> does not match <code>ruto</code>).</li>
            <li>The article title is never modified.</li>
            <li>Leave replace empty to delete matched text.</li>
        </ul>`,
    graphicEditor: `
        <p>Use the toolbar above the article to format content visually.</p>
        <ul>
            <li><strong>Undo / Redo</strong> — reverse or restore the last edits.</li>
            <li><strong>Find and replace</strong> — use the search button in the Index sidebar (works in graphic and text mode).</li>
            <li><strong>Paragraph</strong> — click in the text and type. Press <kbd>Enter</kbd> for a new paragraph.</li>
            <li><strong>Heading / Sub heading</strong> — place the cursor in a paragraph, then use the toolbar.</li>
            <li><strong>Bold / Italic / Link</strong> — select text first, then click the tool.</li>
            <li><strong>Lists</strong> — works inside paragraphs and table cells.</li>
            <li><strong>Media</strong> — image, table image, icon, video, audio from Dyscover or URL.</li>
            <li><strong>Table</strong> — data table with editable cells.</li>
            <li><strong>Template</strong> — infobox; pick fields from the template dialog.</li>
            <li><strong>Center</strong> — centers the current paragraph block.</li>
            <li><strong>Caption</strong> — block quote style line.</li>
            <li><strong>Legend</strong> — colored label chip (also in tables).</li>
            <li><strong>Percentage</strong> — progress bar (<code>50%</code> or <code>1/2</code>).</li>
        </ul>
        <p>Press <strong>Esc</strong> or the red <strong>×</strong> button to exit editing. Use the page icon to switch to the text editor.</p>`,
    sourcePatterns: [
        ["Paragraph", "Plain text on one line"],
        ["Heading", "# Title"],
        ["Sub heading", "## Title"],
        ["Bold", "**text**"],
        ["Italic", "*text*"],
        ["Link", "[[Label|https://url]]"],
        ["Caption", "> Text"],
        ["Center", ":: Text"],
        ["Point list", "- item"],
        ["Number list", "1. item"],
        ["Image", "{{image|url|caption}}"],
        ["Table image", "{{image-table|url}}"],
        ["Icon", "{{icon-image|url}}"],
        ["Video", "{{video|url|caption}}"],
        ["Audio", "{{audio|url}}"],
        ["Percentage", "{{percent|50%}}"],
        ["Legend", "{{legend|#008000|Label}}"],
        ["Table header", "| H1 | H2 |"],
        ["Table row", "| a | b |"],
        ["Table line break", "Line 1<br>Line 2"],
        ["Template", "{{template|123"],
        ["Template title", "| _title = Infobox title"],
        ["Template text field", "| capital-city = Capital name"],
        ["Template single image", "| flag = {{template-single-image|https://.../flag.png}}"],
        ["Template large image", "| map = {{template-large-image|https://.../map.png}}"],
        ["Template double image", "| flags = {{template-double-image|https://.../a.png ;; https://.../b.png}}"],
        ["Template section", "| formation = **Formation**"],
        ["Template double column", "- Left value ;; Right value"],
        ["Template close", "}}"],
    ],
    sourcePatternPlainText() {
        const header = "Element\tPattern";
        const rows = this.sourcePatterns.map(
            ([element, pattern]) => `${element}\t${pattern}`,
        );
        return [header, ...rows].join("\n");
    },
    sourcePatternTableHtml() {
        const rows = this.sourcePatterns
            .map(
                ([element, pattern]) =>
                    `<tr><td>${element}</td><td><code>${this.escapeHtml(pattern)}</code></td></tr>`,
            )
            .join("");
        return `<div class="article-help-table-wrap">
            <div class="article-help-table-toolbar">
                <button type="button" class="button button-secondary article-help-copy-patterns" aria-label="Copy pattern table">
                    <i data-icon="copy"></i>
                    <span>Copy patterns</span>
                </button>
            </div>
            <table class="article-help-table">
                <thead><tr><th>Element</th><th>Pattern</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    },
    escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    },
    get sourceEditor() {
        return `
        <p>The text editor uses <strong>Dyscover Source</strong>. One blank line separates blocks. Paragraphs are a single continuous line.</p>
        ${this.sourcePatternTableHtml()}
        <p><strong>Template example</strong> — use the numeric template ID:</p>
        <pre class="article-help-pre">{{template|123
| _title = Infobox title
| image-flag = {{template-single-image|https://.../flag.png|42}}
| image-map = {{template-large-image|https://.../map.png}}
| flags = {{template-double-image|https://.../a.png ;; https://.../b.png}}
| anthem = - Anthem name
- {{audio|https://.../anthem.mp3}}
| formation = **Formation**
- Treaty ;; 1 November 2020
- Expansion ;; 15 November 2021
| capital-city = Capital name
| constituencies = - {{icon-image|https://.../icon.png}} [[Country|https://...]]
}}</pre>
        <ul>
            <li>Optional post id after an image URL: <code>{{template-single-image|url|123}}</code>.</li>
            <li><code>**Section**</code> on the first line creates a section header row (e.g. Formation).</li>
            <li><code>;;</code> separates left and right columns in double-column fields.</li>
            <li>Empty fields are kept with <code>| field-name =</code>.</li>
            <li>Do not break paragraphs manually — HTML indentation is ignored on export.</li>
        </ul>`;
    },
    forEditorMode(isTextMode) {
        return isTextMode ? this.sourceEditor : this.graphicEditor;
    },
    editorTitle(isTextMode) {
        return isTextMode ? "Text editor guide" : "Graphic editor guide";
    },
};

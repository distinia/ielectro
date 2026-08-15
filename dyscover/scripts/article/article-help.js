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
    sourceEditor: `
        <p>The text editor uses <strong>Dyscover Source</strong>. One blank line separates blocks. Paragraphs are a single continuous line.</p>
        <table class="article-help-table">
            <thead><tr><th>Element</th><th>Pattern</th></tr></thead>
            <tbody>
                <tr><td>Paragraph</td><td><code>Plain text on one line</code></td></tr>
                <tr><td>Heading</td><td><code># Title</code></td></tr>
                <tr><td>Sub heading</td><td><code>## Title</code></td></tr>
                <tr><td>Bold</td><td><code>**text**</code></td></tr>
                <tr><td>Italic</td><td><code>*text*</code></td></tr>
                <tr><td>Link</td><td><code>[[Label|https://url]]</code></td></tr>
                <tr><td>Caption</td><td><code>&gt; Text</code></td></tr>
                <tr><td>Center</td><td><code>:: Text</code></td></tr>
                <tr><td>Point list</td><td><code>- item</code> (one per line)</td></tr>
                <tr><td>Number list</td><td><code>1. item</code></td></tr>
                <tr><td>Image</td><td><code>{{image|url|caption}}</code></td></tr>
                <tr><td>Table image</td><td><code>{{image-table|url}}</code></td></tr>
                <tr><td>Icon</td><td><code>{{icon-image|url}}</code></td></tr>
                <tr><td>Video</td><td><code>{{video|url|caption}}</code></td></tr>
                <tr><td>Audio</td><td><code>{{audio|url}}</code></td></tr>
                <tr><td>Percentage</td><td><code>{{percent|50%}}</code></td></tr>
                <tr><td>Legend</td><td><code>{{legend|#008000|Label}}</code></td></tr>
                <tr><td>Table</td><td><code>| H1 | H2 |</code> then <code>| a | b |</code></td></tr>
            </tbody>
        </table>
        <p><strong>Template</strong> — use the numeric template ID:</p>
        <pre class="article-help-pre">{{template|123
| _title = Infobox title
| image-flag = {{template-single-image|https://.../flag.png}}
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
            <li><code>**Section**</code> on the first line creates a section header row (e.g. Formation).</li>
            <li><code>;;</code> separates left and right columns in double-column fields.</li>
            <li>Do not break paragraphs manually — HTML indentation is ignored on export.</li>
        </ul>`,
    forEditorMode(isTextMode) {
        return isTextMode ? this.sourceEditor : this.graphicEditor;
    },
    editorTitle(isTextMode) {
        return isTextMode ? "Text editor guide" : "Graphic editor guide";
    },
};

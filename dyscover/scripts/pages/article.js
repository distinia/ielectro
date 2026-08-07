import { API, Article, Select, Menu, WebSelector, Editor, Index, GenerateArticle, Save, FormatText, ReplaceText, Paragraph, Heading, Center, Bold, Italic, Caption, List, Link, ArticlePreview, Table, Legend, Percentage, Media, Template } from "../article/index.js";
let state = "guest";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    new Article();
});

import { App } from "../core/app.js";
import { Article } from "./article.js";
import { ensureArticleChrome } from "./chrome.js";

document.addEventListener("DOMContentLoaded", () => {
    App.runPage(async () => {
        ensureArticleChrome();
        if (document.querySelector(".top-nav")) {
            document.body.classList.add("has-navbar");
        }
        await new Article().load();
    });
});

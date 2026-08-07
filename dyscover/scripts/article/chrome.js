const SIDEBAR_HTML = `
    <div class="index-sidebar-header">
        <button type="button" class="index-edit-button" aria-label="Edit article">
            <i data-icon="pencil"></i>
        </button>
        <h4>Index</h4>
    </div>
    <div class="index-sidebar-content">
        <ul class="list" aria-label="Table of contents"></ul>
    </div>
`;

export function ensureArticleChrome() {
    document.body.classList.add("article-page");

    let main = document.querySelector(".article-main-content");
    if (!main) {
        main = document.createElement("article");
        main.className = "article-main-content";
        main.innerHTML = `
            <header class="article-header">
                <h1 class="title"></h1>
            </header>
            <div class="article-scroll">
                <section class="content"></section>
            </div>
        `;
        document.body.appendChild(main);
    }

    if (!main.querySelector(".article-scroll")) {
        const content = main.querySelector(".content");
        const scroll = document.createElement("div");
        scroll.className = "article-scroll";
        if (content) {
            content.replaceWith(scroll);
            scroll.appendChild(content);
        } else {
            scroll.innerHTML = `<section class="content"></section>`;
            main.appendChild(scroll);
        }
    }

    if (!main.querySelector(".article-header")) {
        const title = main.querySelector(".title");
        const header = document.createElement("header");
        header.className = "article-header";
        if (title) {
            title.replaceWith(header);
            header.appendChild(title);
        } else {
            header.innerHTML = `<h1 class="title"></h1>`;
        }
        const scroll = main.querySelector(".article-scroll");
        if (scroll) {
            main.insertBefore(header, scroll);
        } else {
            main.prepend(header);
        }
    }

    let sidebar = document.querySelector(".article-index-sidebar");
    if (!sidebar) {
        sidebar = document.createElement("aside");
        sidebar.className = "article-index-sidebar";
        sidebar.setAttribute("aria-label", "Article index");
        sidebar.innerHTML = SIDEBAR_HTML;
    }

    if (!document.querySelector(".article-stage")) {
        const shell = document.createElement("main");
        shell.className = "article-shell";
        const stage = document.createElement("div");
        stage.className = "article-stage";

        const parent = main.parentNode;
        parent.insertBefore(shell, main);
        stage.append(main, sidebar);
        shell.appendChild(stage);
    }

    return { main, sidebar };
}

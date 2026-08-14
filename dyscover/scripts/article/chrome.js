const SIDEBAR_HTML = `
    <div class="index-sidebar-header">
        <div class="index-sidebar-actions">
            <button type="button" class="index-help-button" aria-label="Editor guide" title="Editor guide">
                <span aria-hidden="true">?</span>
            </button>
            <button type="button" class="index-generate-button" aria-label="Generate article" title="Generate article">
                <i data-icon="sparkles"></i>
            </button>
            <button type="button" class="index-pdf-button" aria-label="Export PDF" title="Export PDF">
                <i data-icon="download"></i>
            </button>
            <button type="button" class="index-edit-button" aria-label="Edit article">
                <i data-icon="pencil"></i>
            </button>
            <button type="button" class="index-mode-button" aria-label="Switch editor mode" title="Text editor">
                <i data-icon="file-text"></i>
            </button>
        </div>
        <h4 class="index-sidebar-title">Index</h4>
    </div>
    <div class="index-sidebar-content">
        <ul class="list" aria-label="Table of contents"></ul>
    </div>
`;
function upgradeSidebarHeader(sidebar) {
    const header = sidebar.querySelector(".index-sidebar-header");
    if (!header) {
        return;
    }
    const title = header.querySelector("h4");
    if (title) {
        title.classList.add("index-sidebar-title");
    }
    let actions = header.querySelector(".index-sidebar-actions");
    const editButton = header.querySelector(".index-edit-button");
    if (!actions) {
        actions = document.createElement("div");
        actions.className = "index-sidebar-actions";
        header.insertBefore(actions, title || null);
        if (editButton) {
            actions.appendChild(editButton);
        }
    } else if (editButton && editButton.parentElement !== actions) {
        actions.prepend(editButton);
    }
    if (!header.querySelector(".index-mode-button")) {
        const modeButton = document.createElement("button");
        modeButton.type = "button";
        modeButton.className = "index-mode-button";
        modeButton.setAttribute("aria-label", "Switch editor mode");
        modeButton.title = "Text editor";
        modeButton.innerHTML = `<i data-icon="file-text"></i>`;
        actions.appendChild(modeButton);
    }
    if (!header.querySelector(".index-help-button")) {
        const helpButton = document.createElement("button");
        helpButton.type = "button";
        helpButton.className = "index-help-button";
        helpButton.setAttribute("aria-label", "Editor guide");
        helpButton.title = "Editor guide";
        helpButton.innerHTML = `<span aria-hidden="true">?</span>`;
        actions.prepend(helpButton);
    }
    if (!header.querySelector(".index-pdf-button")) {
        const pdfButton = document.createElement("button");
        pdfButton.type = "button";
        pdfButton.className = "index-pdf-button";
        pdfButton.setAttribute("aria-label", "Export PDF");
        pdfButton.title = "Export PDF";
        pdfButton.innerHTML = `<i data-icon="download"></i>`;
        const help = header.querySelector(".index-help-button");
        if (help?.nextSibling) {
            help.after(pdfButton);
        } else {
            actions.appendChild(pdfButton);
        }
    }
    if (!header.querySelector(".index-generate-button")) {
        const generateButton = document.createElement("button");
        generateButton.type = "button";
        generateButton.className = "index-generate-button";
        generateButton.setAttribute("aria-label", "Generate article");
        generateButton.title = "Generate article";
        generateButton.innerHTML = `<i data-icon="sparkles"></i>`;
        const help = header.querySelector(".index-help-button");
        const edit = header.querySelector(".index-edit-button");
        if (help && edit) {
            help.after(generateButton);
        } else if (edit) {
            edit.before(generateButton);
        } else {
            actions.appendChild(generateButton);
        }
    } else {
        const generateButton = header.querySelector(".index-generate-button");
        const help = header.querySelector(".index-help-button");
        if (generateButton && help) {
            help.after(generateButton);
        }
    }
}
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
    } else {
        upgradeSidebarHeader(sidebar);
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

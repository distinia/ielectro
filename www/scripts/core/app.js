import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import { Navbar } from "./navbar.js";
import { Footer } from "./footer.js";
import { Site } from "./site.js";

export class App {
    constructor() {
        this.init();
    }
    init() {
        Nesh.Input.enablePlainTextPaste();
        Nesh.Input.disableAutocomplete();
        Nesh.Input.disableTextCorrection();
        Nesh.Input.bind();
        const content = document.body.innerHTML;
        document.body.innerHTML = `${new Navbar().render()}<main>${content}</main>${new Footer().render()}`;
        Nesh.Icons.load(document.body);
        this.trackPageView();
    }

    trackPageView() {
        const fd = new FormData();
        fd.set("path", Site.pagePath());
        fetch(Site.absolute("/api/views/track"), {
            method: "POST",
            body: fd,
            keepalive: true,
        }).catch(() => {});
    }
}

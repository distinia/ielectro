import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import Navbar from "../navbar/navbar.js";
import Footer from "../footer/footer.js";
export default class App {
    static initialize() {
        Nesh.Request.setBaseUrl("api");
        Nesh.Input.enablePlainTextPaste();
        Nesh.Input.disableAutocomplete();
        Nesh.Input.disableTextCorrection();
        Nesh.Input.bind();
        const content = document.body.innerHTML;
        document.body.innerHTML = `${new Navbar().render()}<main>${content}</main>${new Footer().render()}`;
        Nesh.Icons.load(document.body);
    }
}

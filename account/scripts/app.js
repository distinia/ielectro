import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
import Sidebar from "../sidebar/sidebar.js";
export default class App {
   static URL = "https://account.ielectro.com";
   constructor() {
        this.initialize();
    }
   async initialize() {
       const logged = await Nesh.Auth.logged();
        const page = window.location.pathname
            .replace(/\/$/, "")
            .split("/")
            .pop() || "index";
       const guestPages = [
            "login",
            "register",
            "forgot-password",
            "reset-password"
        ];
       if (logged) {
           if (guestPages.includes(page)) {
                window.location.href = `${App.URL}/`;
                return;
            }
           this.sidebar = new Sidebar();
       } else {
           if (!guestPages.includes(page)) {
                window.location.href = `${App.URL}/login?service=account`;
                return;
            }
       }
       await Nesh.Icons.load();
    }
   static setup() {
        Nesh.Request.setBaseUrl("api");
        Nesh.Input.disableAutocomplete();
        Nesh.Input.disableTextCorrection();
        Nesh.Input.enablePlainTextPaste();
        Nesh.Input.bind();
    }
   static sanitizeInput(input) {
        Nesh.Input.sanitize(input);
    }
}
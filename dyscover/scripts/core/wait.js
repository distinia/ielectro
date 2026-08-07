import { Spinner } from "./spinner.js";

export class Wait {
    static show() {
        Spinner.showPage();
    }

    static hide() {
        Spinner.hidePage();
    }
}

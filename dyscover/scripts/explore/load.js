import { Recents } from "./recents.js";
import { Output } from "./output.js";
export class Load {
    constructor() {
        const params = new URLSearchParams(window.location.search);
        const term = params.get("term");
        if (term && term !== "") {
            const input = document.querySelector("#searchInput");
            if (input) input.value = term;
            new Output(term);
        } else {
            new Recents();
            const users = searchMountFor("user");
            if (users) users.innerHTML = "";
        }
    }
}

import { Recents } from "./recents.js";
import { Output } from "./output.js";

export class Load {
    async init() {
        const params = new URLSearchParams(window.location.search);
        const term = params.get("term");
        if (term && term !== "") {
            const input = document.querySelector("#searchInput");
            if (input) input.value = term;
            const output = new Output(term);
            await output.load();
            return;
        }
        const recents = new Recents();
        await recents.load();
        const users =
            document.querySelector('[data-type="user"]') ||
            document.querySelector("#users");
        if (users) users.innerHTML = "";
    }
}

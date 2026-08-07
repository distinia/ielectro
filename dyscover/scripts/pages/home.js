import { Feed } from "../home/index.js";
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    new Feed();
    await Icons.load();
});

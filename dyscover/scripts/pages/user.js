import { Actions, UI, List, BiographyEditor, Informations, Posts } from "../user/index.js";
let currentUsername = null;
let loggedUsername = null;
let profilePosts = [];
let profileSaved = [];
let profileLiked = [];
let currentBio = "";
let profileMainFilter = "posts";
let profileTypeFilter = "article";
const PROFILE_TYPE_LABELS = {
    article: "Articles",
    image: "Images",
    video: "Videos",
    audio: "Audios",
    document: "Documents",
    template: "Templates",
};
const PROFILE_SOURCES = [
    { type: "article", url: App.api("article/user") },
    { type: "image", url: App.api("media/user"), params: { type: "image" } },
    { type: "video", url: App.api("media/user"), params: { type: "video" } },
    { type: "audio", url: App.api("media/user"), params: { type: "audio" } },
    { type: "document", url: App.api("media/user"), params: { type: "document" } },
    { type: "template", url: App.api("template/user") },
];
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    loggedUsername = await Auth.username();
    const urlUsername = App.urlLastPart();
    currentUsername =
        urlUsername == loggedUsername ? loggedUsername : urlUsername;
    document.title = `@${currentUsername} - iElectro Dyscover`;
    new UI();
    new Informations(currentUsername);
    new Posts(currentUsername);
});

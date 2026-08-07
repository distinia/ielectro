import { ChatUI } from "../inbox/index.js";

const PEER_AVATAR_BASE = "https://account.ielectro.com/u/";
const peerAvatarUrlCache = Object.create(null);
function normalizePeerKey(username) {
    return String(username || "")
        .replace(/^@/, "")
        .trim()
        .toLowerCase();
}
function cachedPeerAvatarUrl(username, explicitUrl) {
    const raw = String(username || "").replace(/^@/, "").trim();
    const key = normalizePeerKey(raw);
    if (!key) return "";
    const ex =
        explicitUrl != null && String(explicitUrl).trim() !== ""
            ? String(explicitUrl).trim()
            : null;
    if (ex) {
        peerAvatarUrlCache[key] = ex;
        return ex;
    }
    if (peerAvatarUrlCache[key]) return peerAvatarUrlCache[key];
    const built = `${PEER_AVATAR_BASE}${encodeURIComponent(raw || key)}/avatar.png`;
    peerAvatarUrlCache[key] = built;
    return built;
}
window.addEventListener("DOMContentLoaded", async () => {
    new App();
    const ui = new ChatUI();
    await ui.init();
});

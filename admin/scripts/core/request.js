import Nesh from "https://nesh.ielectro.com/scripts/nesh.js";
function adminRoot() {
    const path = window.location.pathname || "";
    const marker = "/admin";
    const idx = path.indexOf(marker);
    if (idx >= 0) {
        return `${window.location.origin}${path.slice(0, idx + marker.length)}`;
    }
    return window.location.origin;
}
function adminApiBase() {
    return `${adminRoot()}/api`;
}
Nesh.Request.baseUrl = adminApiBase();
export const Request = Nesh.Request;
export const adminAssetUrl = (assetPath) => `${adminRoot()}/${String(assetPath || "").replace(/^\/+/, "")}`;

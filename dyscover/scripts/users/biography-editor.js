import { Api } from "../core/api.js";
import { Alert, App, Request, Mention, Overlay } from "../core/index.js";
import { AvatarCrop } from "./avatar-crop.js";
import { Informations } from "./informations.js";

export class BiographyEditor {
    static async open(page) {
        const avatarEl = document.querySelector(".avatar");
        const avatarSrc =
            avatarEl?.src || App.userAvatarUrl(page.userId, page.username);
        const overlay = new Overlay("Edit profile");
        await overlay.open();
        overlay.body((body) => {
            body.innerHTML = `
        <form class="profile-edit-form">
          <div class="profile-edit-layout">
            <aside class="profile-edit-avatar">
              <div class="profile-avatar-crop" hidden>
                <img class="profile-avatar-crop-image" alt="">
              </div>
              <div class="profile-edit-avatar-ring profile-avatar-current">
                <img class="profile-edit-avatar-preview" src="${App.escapeAttr(avatarSrc)}" alt="">
              </div>
              <label class="profile-edit-avatar-btn">
                <span>Change photo</span>
                <input type="file" class="profile-edit-avatar-input" accept="image/*" hidden>
              </label>
              <p class="profile-edit-avatar-hint" hidden>Drag to reposition your photo inside the circle.</p>
            </aside>
            <div class="profile-edit-fields">
              <div class="profile-edit-field">
                <label for="profile-bio">Biography</label>
                <textarea id="profile-bio" name="biography" class="bio-input profile-edit-bio" data-preserve-case="true" maxlength="2000" rows="5" placeholder="Write something about you…">${App.escapeHtml(page.bio || "")}</textarea>
              </div>
              <div class="profile-edit-field">
                <label for="profile-website">Website</label>
                <input id="profile-website" name="website" type="url" class="profile-edit-website" maxlength="255" placeholder="https://example.com" value="${App.escapeAttr(page.website || "")}">
              </div>
              <div class="bio-actions">
                <button type="submit" class="profile-btn profile-btn-primary">Save profile</button>
              </div>
            </div>
          </div>
        </form>`;

            const preview = body.querySelector(".profile-edit-avatar-preview");
            const currentRing = body.querySelector(".profile-avatar-current");
            const cropRoot = body.querySelector(".profile-avatar-crop");
            const cropImage = body.querySelector(".profile-avatar-crop-image");
            const hint = body.querySelector(".profile-edit-avatar-hint");
            const fileInput = body.querySelector(".profile-edit-avatar-input");
            let cropper = null;
            let selectedFile = null;
            let objectUrl = null;

            fileInput?.addEventListener("change", () => {
                const file = fileInput.files?.[0];
                if (!file || !cropImage || !cropRoot) return;
                selectedFile = file;
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                objectUrl = URL.createObjectURL(file);
                cropImage.onload = () => {
                    currentRing.hidden = true;
                    cropRoot.hidden = false;
                    hint.hidden = false;
                    cropper = new AvatarCrop(cropRoot, cropImage);
                    cropper.bind();
                };
                cropImage.src = objectUrl;
            });

            body.querySelector(".profile-edit-form")?.addEventListener(
                "submit",
                async (event) => {
                    event.preventDefault();
                    const text =
                        body.querySelector(".profile-edit-bio")?.value.trim() ||
                        "";
                    const website =
                        body.querySelector(".profile-edit-website")?.value.trim() ||
                        "";
                    const submitBtn = body.querySelector(
                        'button[type="submit"]',
                    );
                    if (submitBtn) submitBtn.disabled = true;
                    try {
                        if (selectedFile) {
                            let payload = selectedFile;
                            if (cropper) {
                                try {
                                    payload = await cropper.toBlob();
                                } catch {
                                    payload = selectedFile;
                                }
                            }
                            const data = new FormData();
                            data.append("avatar", payload, "avatar.png");
                            const avatarRes = await Request.post(
                                Api.avatar,
                                data,
                            );
                            const saved = Api.record(avatarRes);
                            App.refreshAvatarImages(
                                page.userId,
                                saved?.url || "",
                            );
                        }
                        await Request.patch(Api.user(page.userId), {
                            biography: text,
                            website,
                        });
                        page.bio = text;
                        page.website = website;
                        Mention.renderInto(
                            document.querySelector(".biography"),
                            page.bio,
                            "No biography yet.",
                        );
                        Informations.renderWebsite(page.website);
                        await Informations.refresh(page);
                        overlay.close();
                    } catch (err) {
                        Alert.error(
                            typeof err === "object" &&
                                (err?.message || err?.text)
                                ? err.message || err.text
                                : "Update failed",
                        );
                    } finally {
                        if (submitBtn) submitBtn.disabled = false;
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                    }
                },
            );
        });
    }
}

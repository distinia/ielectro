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
          <div class="profile-edit-avatar">
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
            <label class="profile-edit-zoom-wrap" hidden>
              <span>Zoom</span>
              <input type="range" class="avatar-crop-zoom" min="1" max="3" step="0.01" value="1">
            </label>
            <p class="profile-edit-avatar-hint" hidden>Drag to reposition your photo inside the circle.</p>
          </div>
          <div class="profile-edit-field">
            <label for="profile-bio">Biography</label>
            <textarea id="profile-bio" class="bio-input profile-edit-bio" maxlength="2000" rows="5" placeholder="Write something about you…">${page.bio || ""}</textarea>
          </div>
          <div class="bio-actions">
            <button type="submit" class="profile-btn profile-btn-primary">Save profile</button>
          </div>
        </form>`;

            const preview = body.querySelector(".profile-edit-avatar-preview");
            const currentRing = body.querySelector(".profile-avatar-current");
            const cropRoot = body.querySelector(".profile-avatar-crop");
            const cropImage = body.querySelector(".profile-avatar-crop-image");
            const zoomWrap = body.querySelector(".profile-edit-zoom-wrap");
            const hint = body.querySelector(".profile-edit-avatar-hint");
            const fileInput = body.querySelector(".profile-edit-avatar-input");
            let cropper = null;
            let objectUrl = null;

            fileInput?.addEventListener("change", () => {
                const file = fileInput.files?.[0];
                if (!file || !cropImage || !cropRoot) return;
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                objectUrl = URL.createObjectURL(file);
                cropImage.onload = () => {
                    currentRing.hidden = true;
                    cropRoot.hidden = false;
                    zoomWrap.hidden = false;
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
                    try {
                        if (cropper) {
                            const blob = await cropper.toBlob();
                            const data = new FormData();
                            data.append("avatar", blob, "avatar.png");
                            await Request.post(Api.avatar, data);
                            App.refreshAvatarImages(page.userId);
                        }
                        await Request.patch(Api.user(page.userId), {
                            biography: text,
                        });
                        page.bio = text;
                        Mention.renderInto(
                            document.querySelector(".biography"),
                            page.bio,
                            "No biography yet.",
                        );
                        await Informations.refresh(page);
                        Alert.success("Profile updated");
                        overlay.close();
                    } catch (err) {
                        Alert.error(
                            typeof err === "object" && err?.text
                                ? err.text
                                : "Update failed",
                        );
                    } finally {
                        if (objectUrl) URL.revokeObjectURL(objectUrl);
                    }
                },
            );
        });
    }
}

import { Api } from "../core/api.js";
import { Alert, App, Request, Mention, Overlay } from "../core/index.js";
import { Informations } from "./informations.js";

export class BiographyEditor {
    static async open(page) {
        const avatarEl = document.querySelector(".avatar");
        const avatarSrc =
            avatarEl?.src ||
            App.userAvatarUrl(
                page.userId,
                page.username,
                "",
                page.accountId || 0,
            );
        const overlay = new Overlay("Edit profile");
        await overlay.open();
        overlay.body((body) => {
            body.innerHTML = `
        <form class="profile-edit-form">
          <div class="profile-edit-layout profile-edit-layout-no-avatar">
            <aside class="profile-edit-avatar profile-edit-avatar-readonly">
              <div class="profile-edit-avatar-ring">
                <img class="profile-edit-avatar-preview" src="${App.escapeAttr(avatarSrc)}" alt="">
              </div>
              <a class="profile-edit-account-link" href="https://account.ielectro.com/profile" target="_blank" rel="noopener">Change photo in Account</a>
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
                    }
                },
            );
        });
    }
}

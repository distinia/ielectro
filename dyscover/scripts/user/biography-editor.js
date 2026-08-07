import { App, Alert, Request, Mention, Overlay } from "../core/index.js";
export class BiographyEditor {
    static async open(bio) {
        const overlay = new Overlay("Edit biography");
        await overlay.open();
        overlay.body((body) => {
            body.innerHTML = `
        <form class="bio-form">
          <textarea class="bio-input" maxlength="2000" rows="5" placeholder="Write something about you…">${bio || ""}</textarea>
          <div class="bio-actions">
            <button type="submit" class="profile-btn profile-btn-primary">Save</button>
          </div>
        </form>`;
            body.querySelector(".bio-form")?.addEventListener("submit", async (e) => {
                e.preventDefault();
                const text = body.querySelector(".bio-input")?.value.trim() || "";
                try {
                    await Request.post(App.api("user/biography"), { biography: text });
                    currentBio = text;
                    Mention.renderInto(
                        document.querySelector(".biography"),
                        currentBio,
                        "No biography yet.",
                    );
                    Alert.success("Biography updated");
                    overlay.close();
                } catch (err) {
                    Alert.error(
                        typeof err === "object" && err?.text ? err.text : "Update failed",
                    );
                }
            });
        });
    }
}

import { App, Alert, Request } from "../core/index.js";
import { UI } from "./ui.js";
import { Informations } from "./informations.js";
export class Actions {
    constructor(username) {
        this.username = username;
    }
    async follow() {
        await Request.post(App.api("user/follow"), { username: this.username });
        Alert.success("Followed");
        new Informations(currentUsername);
        new UI();
    }
    async unfollow() {
        const confirm = await Alert.confirm("Unfollow this user?");
        if (!confirm) return;
        await Request.post(App.api("user/unfollow"), { username: this.username });
        Alert.success("Unfollowed");
        new Informations(currentUsername);
        new UI();
    }
    async removeFollower() {
        await Request.post(App.api("user/remove-follower"), {
            username: this.username,
        });
    }
}

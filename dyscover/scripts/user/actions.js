import { Api } from "../core/api.js";
import { Alert, Request } from "../core/index.js";
import { Informations } from "./informations.js";
import { UI } from "./ui.js";

export class Actions {
    constructor(page) {
        this.page = page;
    }

    async follow() {
        await Request.post(Api.userFollowers(this.page.userId));
        Alert.success("Followed");
        new Informations(this.page);
        new UI(this.page);
    }

    async unfollow() {
        const confirm = await Alert.confirm("Unfollow this user?");
        if (!confirm) return;
        await Request.delete(Api.userFollowers(this.page.userId));
        Alert.success("Unfollowed");
        new Informations(this.page);
        new UI(this.page);
    }

    async removeFollower() {
        Alert.info("Remove follower is not available yet.");
    }
}

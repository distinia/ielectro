import { Api } from "../core/api.js";
import { Alert, Request } from "../core/index.js";
import { Informations } from "./informations.js";
export class Actions {
    constructor(page) {
        this.page = page;
    }
    async follow(onDone) {
        await Request.post(Api.userFollowers(this.page.userId));
        await Informations.refresh(this.page);
        if (onDone) await onDone();
    }
    async followUser(targetUserId, onDone) {
        await Request.post(Api.userFollowers(targetUserId));
        await Informations.refresh(this.page);
        if (onDone) await onDone();
    }
    async unfollow(onDone) {
        const confirm = await Alert.confirm("Unfollow this user?");
        if (!confirm) return;
        await Request.delete(Api.userFollowers(this.page.userId));
        await Informations.refresh(this.page);
        if (onDone) await onDone();
    }
    async unfollowUser(targetUserId, onDone) {
        const confirm = await Alert.confirm("Unfollow this user?");
        if (!confirm) return;
        await Request.delete(Api.userFollowers(targetUserId));
        if (onDone) await onDone();
    }
    async removeFollower(followerUserId, onDone) {
        const confirm = await Alert.confirm("Remove this follower?");
        if (!confirm) return;
        await Request.delete(
            Api.userFollowerOne(this.page.userId, followerUserId),
        );
        await Informations.refresh(this.page);
        if (onDone) await onDone();
    }
}

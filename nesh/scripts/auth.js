import Request from "./request.js";

export default class Auth {
    static endpoint = "https://account.ielectro.com/api/user";
    static _user = undefined;

    static record(body) {
        if (body === null || body === undefined) {
            return null;
        }
        if (typeof body !== "object") {
            return null;
        }
        if ("data" in body && body.data && typeof body.data === "object") {
            return body.data;
        }
        if ("success" in body && body.success === false) {
            return null;
        }
        return body;
    }

    static clear() {
        Auth._user = undefined;
    }

    static async user(force = false) {
        if (!force && Auth._user !== undefined) {
            return Auth._user;
        }
        try {
            const response = await Request.get(Auth.endpoint);
            const user = Auth.record(response);
            const id = Number(user?.id);
            Auth._user =
                user && Number.isFinite(id) && id > 0 ? user : null;
            return Auth._user;
        } catch {
            Auth._user = null;
            return null;
        }
    }

    static async logged(force = false) {
        const user = await Auth.user(force);
        return user !== null;
    }

    static async id(force = false) {
        const user = await Auth.user(force);
        const id = Number(user?.id);
        return Number.isFinite(id) && id > 0 ? id : null;
    }

    static async username(force = false) {
        const user = await Auth.user(force);
        const username = String(user?.username ?? "").trim();
        return username || null;
    }
}

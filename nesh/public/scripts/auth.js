import Request from "./request.js";
export default class Auth {
    static async logged() {
        try {
            const res = await Request.get("https://account.ielectro.com/api/auth/logged");
            return !!res?.status;
        } catch {
            return false;
        }
    }
    static async username() {
        try {
            const res = await Request.get("https://account.ielectro.com/api/auth/logged");
            return res?.status && res?.data?.username ? res.data.username : null;
        } catch {
            return null;
        }
    }
}
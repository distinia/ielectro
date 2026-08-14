export class Api {
    static data(body) {
        if (body === null || body === undefined) {
            return null;
        }
        if (typeof body === "object" && body !== null && "data" in body) {
            return body.data;
        }
        return body;
    }

    static list(body) {
        const data = this.data(body);
        return Array.isArray(data) ? data : [];
    }

    static record(body) {
        const data = this.data(body);
        return data && typeof data === "object" && !Array.isArray(data) ? data : null;
    }

    static message(body) {
        if (typeof body === "string") {
            return body;
        }
        if (body && typeof body === "object") {
            if (typeof body.text === "string") {
                return body.text;
            }
            if (typeof body.message === "string") {
                return body.message;
            }
        }
        return "";
    }

    static errorMessage(error) {
        return this.message(error) || "Request failed";
    }
}

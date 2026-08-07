export default class Request {
    static baseUrl = "";
    static setBaseUrl(url) {
        this.baseUrl = String(url).replace(/\/+$/, "");
    }
    static csrfToken() {
        const cookie = document.cookie
            .split(";")
            .map((c) => c.trim())
            .find((c) => c.startsWith("csrf_token="));
        return cookie
            ? decodeURIComponent(cookie.substring("csrf_token=".length))
            : "";
    }
    static async request(method, url, data = null) {
        method = method.toUpperCase();
        if (!/^https?:\/\//i.test(url)) {
            url = `${this.baseUrl}/${url.replace(/^\/+/, "")}`;
        }
        const options = {
            method,
            headers: {},
            credentials: "include"
        };
        const csrf = this.csrfToken();
        if (
            method !== "GET" &&
            method !== "HEAD" &&
            csrf
        ) {
            options.headers["X-CSRF-Token"] = csrf;
        }
        if (
            method === "GET" &&
            data &&
            !(data instanceof FormData)
        ) {
            const params = new URLSearchParams(data);
            if (params.size > 0) {
                url += (url.includes("?") ? "&" : "?") + params;
            }
        } else if (data instanceof FormData) {
            if (
                csrf &&
                !data.has("csrf_token")
            ) {
                data.append("csrf_token", csrf);
            }
            options.body = data;
        } else if (
            data !== null &&
            method !== "GET" &&
            method !== "HEAD"
        ) {
            if (
                csrf &&
                typeof data === "object" &&
                !("csrf_token" in data)
            ) {
                data.csrf_token = csrf;
            }
            options.body = JSON.stringify(data);
            options.headers["Content-Type"] = "application/json";
        }
        const response = await fetch(url, options);
        const type = response.headers.get("content-type") ?? "";
        let body;
        if (type.includes("application/json")) {
            body = await response.json();
        } else {
            body = await response.text();
            try {
                body = JSON.parse(body);
            } catch {}
        }
        if (!response.ok) {
            throw body;
        }
        return body;
    }
    static get(url, data = null) {
        return this.request("GET", url, data);
    }
    static post(url, data = null) {
        return this.request("POST", url, data);
    }
    static put(url, data = null) {
        return this.request("PUT", url, data);
    }
    static patch(url, data = null) {
        return this.request("PATCH", url, data);
    }
    static delete(url, data = null) {
        return this.request("DELETE", url, data);
    }
}
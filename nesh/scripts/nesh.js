import Auth from "./auth.js";
import Html from "./html.js";
import Icons from "./icons.js";
import Input from "./input.js";
import LazyMedia from "./lazy-media.js";
import Request from "./request.js";
import Table from "./table.js";
import Validate from "./validate.js";
export default class Nesh
{
    static Auth = Auth;
    static Html = Html;
    static Icons = Icons;
    static Input = Input;
    static LazyMedia = LazyMedia;
    static Request = Request;
    static Table = Table;
    static Validate = Validate;
}
if (typeof document !== "undefined") {
    const start = () => LazyMedia.bind();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
}

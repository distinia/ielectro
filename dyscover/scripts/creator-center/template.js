import { Post } from "./post.js";
export class Template extends Post {
    static type = "template";
    static table = ".template-table";
    static list = new Map();
    static modalLabel = "Template";
}

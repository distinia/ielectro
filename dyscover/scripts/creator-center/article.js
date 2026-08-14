import { Post } from "./post.js";
export class Article extends Post {
    static type = "article";
    static table = ".article-table";
    static list = new Map();
    static modalLabel = "Article";
}

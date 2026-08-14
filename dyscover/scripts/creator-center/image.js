import { Post } from "./post.js";
export class Image extends Post {
    static type = "image";
    static table = ".image-table";
    static list = new Map();
    static accept = "image/*";
    static uploadLabel = "image";
    static maxUploadBytes = 10485760;
    static helpKey = "image";
}

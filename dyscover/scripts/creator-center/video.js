import { Image } from "./image.js";

export class Video extends Image {
    static type = "video";
    static table = ".video-table";
    static tab = ".video-tab";
    static accept = "video/*";
    static uploadLabel = "video";
    static uploadHint = "MP4, WebM and other video formats";
}

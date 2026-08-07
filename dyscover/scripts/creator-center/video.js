import { Image } from "./image.js";
export class Video extends Image {
    static type = "video";
    static table = ".video-table";
    static tab = ".video-tab";
    static params = {
        type: "video"
    };
}

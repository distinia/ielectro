import { Image } from "./image.js";
export class Audio extends Image {
    static type = "audio";
    static table = ".audio-table";
    static tab = ".audio-tab";
    static params = {
        type: "audio"
    };
}

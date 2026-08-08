import { Image } from "./image.js";

export class Audio extends Image {
    static type = "audio";
    static table = ".audio-table";
    static tab = ".audio-tab";
    static accept = "audio/*";
    static uploadLabel = "audio";
    static uploadHint = "MP3, WAV and other audio formats up to 250 MB";
    static maxUploadBytes = 262144000;
    static helpKey = "audio";
}

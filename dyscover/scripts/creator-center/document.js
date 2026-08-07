import { Image } from "./image.js";
export class Document extends Image {
    static type = "document";
    static table = ".document-table";
    static tab = ".document-tab";
    static params = {
        type: "document"
    };
}

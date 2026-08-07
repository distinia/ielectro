import { Image } from "./image.js";

export class Document extends Image {
    static type = "document";
    static table = ".document-table";
    static tab = ".document-tab";
    static accept = "application/pdf,.pdf";
    static uploadLabel = "document";
    static uploadHint = "PDF documents";
}

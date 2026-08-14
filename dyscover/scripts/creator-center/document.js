import { Image } from "./image.js";
export class Document extends Image {
    static type = "document";
    static table = ".document-table";
    static list = new Map();
    static tab = ".document-tab";
    static accept = "application/pdf,.pdf";
    static uploadLabel = "document";
    static uploadHint = "PDF documents up to 50 MB";
    static maxUploadBytes = 52428800;
    static helpKey = "document";
}

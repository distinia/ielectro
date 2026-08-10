import { CreatorHelp } from "./creator-help.js";

export const CREATOR_TYPES = [
    {
        value: "article",
        label: "Article",
        help: CreatorHelp.article,
        accept: "image/*",
        fileField: "media",
        mediaOnCreate: false,
        showPreview: true,
        maxBytes: 10485760,
    },
    {
        value: "image",
        label: "Image",
        help: CreatorHelp.image,
        accept: "image/*",
        fileField: "media",
        mediaOnCreate: true,
        showPreview: true,
        maxBytes: 10485760,
    },
    {
        value: "video",
        label: "Video",
        help: CreatorHelp.video,
        accept: "video/*",
        fileField: "media",
        mediaOnCreate: true,
        showPreview: true,
        maxBytes: 262144000,
    },
    {
        value: "audio",
        label: "Audio",
        help: CreatorHelp.audio,
        accept: "audio/*",
        fileField: "media",
        mediaOnCreate: true,
        showPreview: true,
        maxBytes: 262144000,
    },
    {
        value: "document",
        label: "Document",
        help: CreatorHelp.document,
        accept: "application/pdf,.pdf",
        fileField: "media",
        mediaOnCreate: true,
        showPreview: true,
        maxBytes: 52428800,
    },
    {
        value: "template",
        label: "Template",
        help: CreatorHelp.template,
        accept: "image/*",
        fileField: "preview",
        mediaOnCreate: false,
        showPreview: true,
        hasFields: true,
        maxBytes: 10485760,
    },
];

export function creatorTypeConfig(type) {
    return CREATOR_TYPES.find((entry) => entry.value === type) || CREATOR_TYPES[0];
}

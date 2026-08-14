export class ExploreHelpers {
    static types = ["article", "image", "audio", "video", "document", "template"];
    static mountFor(type) {
        return (
            document.querySelector(`[data-type="${type}"]`) ||
            document.querySelector(`#${type}s`)
        );
    }
}

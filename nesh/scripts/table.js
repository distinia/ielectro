export default class Table {
    static filterRows(rows, query, sort, keys) {
        let result = Array.isArray(rows)
            ? [...rows]
            : [];
        query = String(query ?? "")
            .trim()
            .toLowerCase();
        if (query) {
            result = result.filter((row) =>
                String(keys.text(row) ?? "")
                    .toLowerCase()
                    .includes(query)
            );
        }
        const time = (row) => {
            const value = keys.time(row);
            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {
                return 0;
            }
            if (
                typeof value === "number" &&
                Number.isFinite(value)
            ) {
                return value;
            }
            const timestamp = Date.parse(
                String(value).replace(" ", "T")
            );
            return Number.isFinite(timestamp)
                ? timestamp
                : 0;
        };
        const id = (row) => Number(row.id) || 0;
        const title = (a, b) =>
            String(keys.title(a) ?? "").localeCompare(
                String(keys.title(b) ?? ""),
                undefined,
                {
                    sensitivity: "base"
                }
            );
        switch (sort) {
            case "oldest":
                result.sort(
                    (a, b) =>
                        time(a) - time(b) ||
                        id(a) - id(b)
                );
                break;
            case "az":
                result.sort(title);
                break;
            case "za":
                result.sort(
                    (a, b) => -title(a, b)
                );
                break;
            case "newest":
            default:
                result.sort(
                    (a, b) =>
                        time(b) - time(a) ||
                        id(b) - id(a)
                );
        }
        return result;
    }
}
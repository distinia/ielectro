import { Editor } from "./editor.js";
const GENERATION_PHASES = [
    "Analyzing topic and searching Dyscover",
    "Reading related articles",
    "Building template and outline",
    "Writing article",
];
export async function withArticleLoading(task, options = {}) {
    const phases = options.phases || null;
    const useProgress = Array.isArray(phases) && phases.length > 0;
    if (typeof Editor.runModeTransition !== "function") {
        return task?.();
    }
    if (!useProgress) {
        return Editor.runModeTransition(task);
    }
    return Editor.runModeTransition(async (setProgress) => {
        const report = (index, label = "") => {
            if (typeof setProgress === "function") {
                setProgress(index, phases.length, label || phases[index] || "");
            } else if (typeof Editor.updateModeTransitionProgress === "function") {
                Editor.updateModeTransitionProgress(
                    index,
                    phases.length,
                    label || phases[index] || "",
                );
            }
        };
        report(0);
        return task(report);
    });
}
export { GENERATION_PHASES };

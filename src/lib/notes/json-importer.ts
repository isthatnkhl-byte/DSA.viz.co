import { NotesBagItem, NoteSourceType } from "./types";

export interface ParsedImportResult {
  success: boolean;
  importedItems: Array<Omit<NotesBagItem, "id" | "createdAt">>;
  errorMessage?: string;
}

/**
 * Parses raw JSON text into one or more NotesBagItem objects.
 * Handles LeetCode visualizer specs, exported notes bags, single notes, and general algorithm JSONs.
 */
export function parseNotesFromJson(jsonString: string, filename = "uploaded.json"): ParsedImportResult {
  try {
    const data = JSON.parse(jsonString);

    // Case 1: Array of notes (e.g., exported notes bag)
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { success: false, importedItems: [], errorMessage: "The JSON array is empty." };
      }

      const items: Array<Omit<NotesBagItem, "id" | "createdAt">> = data.map((entry, idx) => {
        return normalizeToNoteItem(entry, `${filename.replace(/\.json$/i, "")} #${idx + 1}`);
      });

      return { success: true, importedItems: items };
    }

    // Case 2: Object with notes or items array
    if (data.notes && Array.isArray(data.notes)) {
      const items = data.notes.map((entry: any, idx: number) =>
        normalizeToNoteItem(entry, `${data.title || filename} #${idx + 1}`)
      );
      return { success: true, importedItems: items };
    }

    if (data.items && Array.isArray(data.items)) {
      const items = data.items.map((entry: any, idx: number) =>
        normalizeToNoteItem(entry, `${data.title || filename} #${idx + 1}`)
      );
      return { success: true, importedItems: items };
    }

    // Case 3: LeetCode Visualization JSON or Single Note Spec
    const item = normalizeToNoteItem(data, filename.replace(/\.json$/i, "").replace(/[-_]/g, " "));
    return { success: true, importedItems: [item] };
  } catch (err: any) {
    return {
      success: false,
      importedItems: [],
      errorMessage: err?.message || "Invalid JSON syntax. Please check file formatting.",
    };
  }
}

function normalizeToNoteItem(
  obj: any,
  fallbackTitle: string
): Omit<NotesBagItem, "id" | "createdAt"> {
  if (typeof obj !== "object" || obj === null) {
    return {
      title: fallbackTitle,
      sourceType: "CUSTOM_NOTE",
      tags: ["Imported"],
      userNotes: String(obj),
    };
  }

  // Check if it has visualizer specification fields
  const isVizSpec = Boolean(obj.viz_steps || obj.code_lines || obj.problem_slug || obj.data_structure);

  let title = obj.title || obj.name || obj.problem_name || fallbackTitle;
  let sourceType: NoteSourceType = (obj.sourceType as NoteSourceType) || (isVizSpec ? "VISUALIZER_TRACE" : "CUSTOM_NOTE");
  let problemSlug = obj.problemSlug || obj.problem_slug || obj.slug || undefined;

  // Extract code snippet
  let codeSnippet: string | undefined = undefined;
  if (typeof obj.codeSnippet === "string" && obj.codeSnippet.trim()) {
    codeSnippet = obj.codeSnippet;
  } else if (Array.isArray(obj.code_lines)) {
    codeSnippet = obj.code_lines.join("\n");
  } else if (typeof obj.code === "string") {
    codeSnippet = obj.code;
  } else if (typeof obj.solution === "string") {
    codeSnippet = obj.solution;
  }

  // Extract code language
  let codeLanguage = obj.codeLanguage || obj.language || "cpp";

  // Extract tags
  let tags: string[] = [];
  if (Array.isArray(obj.tags)) {
    tags = obj.tags.map(String);
  } else if (typeof obj.tag === "string") {
    tags = [obj.tag];
  } else if (typeof obj.category === "string") {
    tags = [obj.category];
  } else if (obj.topic) {
    tags = [String(obj.topic)];
  }

  if (tags.length === 0) {
    tags = isVizSpec ? ["Visualizer", "Algorithm"] : ["ImportedJson"];
  }

  // Invariant text
  const stepList: any[] = Array.isArray(obj.viz_steps)
    ? obj.viz_steps
    : Array.isArray(obj.visualization_manifest)
    ? obj.visualization_manifest
    : Array.isArray(obj.steps)
    ? obj.steps
    : [];

  let invariantText: string | undefined = undefined;
  if (typeof obj.invariantText === "string") {
    invariantText = obj.invariantText;
  } else if (typeof obj.invariant === "string") {
    invariantText = obj.invariant;
  } else if (Array.isArray(obj.state_invariants) && obj.state_invariants.length > 0) {
    invariantText = obj.state_invariants.join(" • ");
  } else if (Array.isArray(obj.invariants) && obj.invariants.length > 0) {
    invariantText = obj.invariants.join(" • ");
  } else if (stepList.length > 0) {
    const firstWithInv = stepList.find((s: any) => s.invariant || s.invariants || s.description || s.explanation);
    if (firstWithInv) {
      invariantText = firstWithInv.invariant || (Array.isArray(firstWithInv.invariants) ? firstWithInv.invariants.join(" • ") : (firstWithInv.description || firstWithInv.explanation));
    }
  }

  // Active pointers
  let activePointers: Record<string, any> | undefined = undefined;
  if (obj.activePointers && typeof obj.activePointers === "object" && !Array.isArray(obj.activePointers)) {
    activePointers = obj.activePointers;
  } else if (stepList.length > 0) {
    const stepWithPointers = stepList.find((s: any) => {
      const hasPtrs = Array.isArray(s.pointers) ? s.pointers.length > 0 : Boolean(s.pointers);
      const hasVars = s.variables && typeof s.variables === "object" && Object.keys(s.variables).length > 0;
      return hasPtrs || hasVars;
    });

    if (stepWithPointers) {
      if (Array.isArray(stepWithPointers.pointers) && stepWithPointers.pointers.length > 0) {
        const ptrMap: Record<string, any> = {};
        stepWithPointers.pointers.forEach((p: any) => {
          if (p && p.label) ptrMap[p.label] = p.index ?? p.val;
        });
        if (Object.keys(ptrMap).length > 0) activePointers = ptrMap;
      } else if (typeof stepWithPointers.pointers === "object" && stepWithPointers.pointers) {
        activePointers = stepWithPointers.pointers;
      } else if (stepWithPointers.variables && typeof stepWithPointers.variables === "object") {
        activePointers = stepWithPointers.variables;
      }
    }
  }

  // User notes
  let userNotes: string | undefined = undefined;
  if (typeof obj.userNotes === "string") {
    userNotes = obj.userNotes;
  } else if (typeof obj.notes === "string") {
    userNotes = obj.notes;
  } else if (Array.isArray(obj.execution_plan) && obj.execution_plan.length > 0) {
    userNotes = obj.execution_plan.slice(0, 4).join("\n");
  } else if (typeof obj.description === "string") {
    userNotes = obj.description;
  } else if (typeof obj.problem_description === "string") {
    userNotes = obj.problem_description;
  }

  // AI takeaway
  let aiTakeaway: string | undefined = undefined;
  if (typeof obj.aiTakeaway === "string") {
    aiTakeaway = obj.aiTakeaway;
  } else if (typeof obj.takeaway === "string") {
    aiTakeaway = obj.takeaway;
  } else if (obj.time_complexity || obj.space_complexity) {
    const time = obj.time_complexity ? `Time: ${obj.time_complexity}` : "";
    const space = obj.space_complexity ? `Space: ${obj.space_complexity}` : "";
    aiTakeaway = [time, space].filter(Boolean).join(" | ");
  }

  return {
    title,
    sourceType,
    problemSlug,
    tags,
    codeSnippet,
    codeLanguage,
    invariantText,
    activePointers,
    userNotes,
    aiTakeaway,
    canvasSnapshotUrl: obj.canvasSnapshotUrl || obj.snapshotSvg || undefined,
    whiteboardElements: obj.whiteboardElements || obj.drawingJson || undefined,
  };
}

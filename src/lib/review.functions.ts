/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { statementForSlug } from "./statements.server";
import { hasMeaningfulTraversal, validateAndNormalizeVizPayload } from "./ai-contracts";
import { getAiConfig } from "./ai-config";
import {
  pickShape,
  sampleInputFor,
  sampleMatrixFor,
  isIslandOrGridProblem,
  isMatrixProblem,
  getCanonicalMultiDatasets,
  type TestDataset,
  type VizStep,
} from "./problems";
import { simulateProblem, simulateProblemWithDataset } from "./simulators";
import { REVIEW_SYSTEM_PROMPT, buildReviewUserPrompt } from "./prompts/review.prompt";
import { DATASET_PLAN_SYSTEM_PROMPT, buildDatasetPlanUserPrompt } from "./prompts/dataset-plan.prompt";
import { VISUALIZER_SYSTEM_PROMPT, buildVisualizerUserPrompt } from "./prompts/visualizer.prompt";
import { VERIFY_SYSTEM_PROMPT, buildVerifyUserPrompt } from "./prompts/verify.prompt";
import { raceModels, REVIEW_MODELS, VIZ_MODELS } from "./openrouter.server";

const Input = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: z.string().optional(),
  topics: z.array(z.string()).optional(),
  pseudocode: z.string().min(1),
});

export interface ExecutionPlanStep {
  step_number: number;
  line_index: number;
  code_action: string;
  description: string;
}

export interface TraceVerification {
  is_valid: boolean;
  is_algorithm_complete?: boolean;
  discrepancies: Array<{
    step_number: number;
    description: string;
    expected_action: string;
  }>;
  summary: string;
}

export interface DatasetVizTrace {
  test_array: (number | string)[];
  code_lines: string[];
  viz_steps: VizStep[];
  is_complete?: boolean;
  total_expected_steps?: number;
  execution_plan?: ExecutionPlanStep[];
  visualization_failed?: boolean;
  visualization_error?: string;
  model?: string | null;
  verification?: TraceVerification;
}

export type ReviewResult = {
  is_complete: boolean;
  classification: "Incomplete" | "Brute Force" | "Better" | "Optimal";
  complexity: { time: string; space: string };
  review: string;
  praise: string;
  nudge: string;
  missing_elements?: string[];
  test_array: (number | string)[];
  code_lines: string[];
  viz_steps: VizStep[];
  models: { reviewer: string | null; visualizer: string | null };
  degraded: boolean;
  notice?: string;
  visualization_failed?: boolean;
  visualization_error?: string;
  reference_solution?: {
    code_lines: string[];
    viz_steps: VizStep[];
    test_array: (number | string)[];
  };
  /** Multi-Dataset Visualization Support */
  datasets?: TestDataset[];
  active_dataset_id?: string;
  dataset_traces?: Record<string, DatasetVizTrace>;
};

export interface DatasetPlanResult {
  data_structure_type: string;
  data_structure_name: string;
  datasets: TestDataset[];
  execution_plan: ExecutionPlanStep[];
  model: string | null;
  degraded?: boolean;
}

const CLASSES = ["Incomplete", "Brute Force", "Better", "Optimal"];

function userCodeLinesFromPseudocode(pseudocode: string): string[] {
  if (!pseudocode || typeof pseudocode !== "string") return ["const result = solve(input);"];

  const rawLines = pseudocode
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length > 3) {
    return rawLines.slice(0, 60);
  }

  // Break compact or single-line pasted pseudocode into discrete logical lines
  let text = pseudocode;
  text = text.replace(
    /(\/\/[^\n]*?\s+)(?=(?:prev\s*=|curr\s*=|m\s*=|n\s*=|for\s+[a-zA-Z_]|if\s+|return\b))/gi,
    "$1\n",
  );
  text = text.replace(
    /(\s{2,}|\s*;\s*)(?=(?:for\s+[a-zA-Z_]|if\s+|else:|return\b|while\s+|prev\s*=|curr\s*=|m\s*=|n\s*=|\/\/|function\b|def\b))/gi,
    "\n",
  );
  text = text.replace(
    /(:\s+)(?=(?:m\s*=|n\s*=|prev\s*=|curr\s*=|for\s+[a-zA-Z_]|if\s+|else:|return\b|while\s+|[a-zA-Z_]\w*\s*=|\/\/))/gi,
    ":\n",
  );

  const formatted = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 60);

  return formatted.length > 0 ? formatted : ["const result = solve(input);"];
}

function evaluatePseudocodeHeuristic(pseudocode: string): {
  isComplete: boolean;
  missing: string[];
  nudge: string;
} {
  const lines = pseudocode
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith("*"));

  const substantiveTokens = [
    /\b(for|while|loop|iterate|each|in|def|function|func|fn|class|void|int|auto|let|const|var)\b/i,
    /\b(if|elif|else|switch|case|match|when)\b/i,
    /\b(return|yield|ans|res|result|output)\b/i,
    /[=+\-*/%<>&|^~]/,
    /[[\]{}().]/,
  ];

  const matchedTokensCount = substantiveTokens.filter((regex) =>
    lines.some((l) => regex.test(l)),
  ).length;

  const totalWords = lines.join(" ").split(/\s+/).filter(Boolean).length;

  const hasTrivialPlaceholdersOnly = lines.every((l) => {
    const lower = l.toLowerCase();
    return (
      lower === "..." ||
      lower === "todo" ||
      lower === "pass" ||
      lower === "continue" ||
      lower.startsWith("todo:") ||
      lower.startsWith("fixme:")
    );
  });

  if (lines.length < 2 || totalWords < 5 || matchedTokensCount < 2 || hasTrivialPlaceholdersOnly) {
    const missing: string[] = [];
    if (!lines.some((l) => /\b(for|while|loop|iterate|each|def|func)\b/i.test(l))) {
      missing.push("Core traversal loop or recursive structure (for / while / recursion)");
    }
    if (!lines.some((l) => /[=:]|\b(add|push|append|set|insert|update)\b/i.test(l))) {
      missing.push("State initialization, pointer transitions, or auxiliary data structure updates");
    }
    if (!lines.some((l) => /\b(return|yield|ans|res|result|output)\b/i.test(l))) {
      missing.push("Result computation and explicit return statement");
    }

    return {
      isComplete: false,
      missing: missing.length > 0 ? missing : [
        "Core traversal or iteration loop",
        "State updates & invariant checks",
        "Result extraction & return statement",
      ],
      nudge:
        "Write your pseudocode approach (a complete flow with loops, state updates, and return value) to unlock the interactive step-by-step animation.",
    };
  }

  return {
    isComplete: true,
    missing: [],
    nudge: "Good job outlining your algorithm! You can now start the interactive visualization.",
  };
}

function isValidMatrixForProblem(
  matrix: unknown,
  slug: string,
  topics: string[] = [],
): matrix is (number | string)[][] {
  if (!Array.isArray(matrix) || matrix.length < 2) return false;
  if (!matrix.every((r) => Array.isArray(r) && r.length >= 2 && r.length === matrix[0].length)) {
    return false;
  }
  const isIsland = isIslandOrGridProblem(slug, topics);
  if (isIsland) {
    if (matrix.length < 3 || (matrix[0]?.length ?? 0) < 3) return false;
    return matrix.every((row: any) =>
      Array.isArray(row) &&
      row.every((cell: any) => {
        const n = Number(cell);
        const s = String(cell).toUpperCase();
        return n === 0 || n === 1 || n === 2 || s === "0" || s === "1" || s === "X" || s === "O";
      }),
    );
  }
  return true;
}

// =====================================================================
// STAGE 1: Pure Pseudocode Review & Complexity Analysis
// =====================================================================
export async function processReviewPseudocode(data: z.infer<typeof Input>): Promise<ReviewResult> {
  const { reviewKey, geminiKey, openRouterKey } = getAiConfig();
  const reviewKeyForRequest = geminiKey || reviewKey || openRouterKey;
  const statement = statementForSlug(data.slug).slice(0, 3500);

  const userCodeLines = userCodeLinesFromPseudocode(data.pseudocode);
  const reviewSystem = REVIEW_SYSTEM_PROMPT;

  const reviewUser = buildReviewUserPrompt({
    title: data.title,
    ...(data.difficulty ? { difficulty: data.difficulty } : {}),
    topics: data.topics ?? [],
    statement,
    pseudocode: data.pseudocode,
  });

  let reviewOut: any = null;
  let reviewerModel: string | null = null;
  let lastError: string | null = null;

  if (reviewKeyForRequest) {
    try {
      const r = await raceModels(
        REVIEW_MODELS,
        reviewKeyForRequest,
        reviewSystem,
        reviewUser,
        (j) => typeof j?.classification === "string" && typeof j?.review === "string",
      );
      if (r.json) {
        reviewOut = r.json;
        reviewerModel = r.model;
      } else {
        lastError = r.error;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  const notices: string[] = [];
  if (!reviewKey && !geminiKey && !openRouterKey) {
    notices.push("No AI keys configured — evaluated with local algorithm heuristics.");
  }

  const heuristic = evaluatePseudocodeHeuristic(data.pseudocode);
  let isComplete = heuristic.isComplete;
  if (reviewOut) {
    if (typeof reviewOut.is_complete === "boolean") {
      isComplete = reviewOut.is_complete;
    } else if (reviewOut.classification === "Incomplete") {
      isComplete = false;
    } else if (
      typeof reviewOut.classification === "string" &&
      ["Optimal", "Better", "Brute Force"].includes(reviewOut.classification)
    ) {
      isComplete = heuristic.isComplete;
    }
  } else if (reviewKeyForRequest && lastError) {
    isComplete = heuristic.isComplete;
  }

  const classification: ReviewResult["classification"] = isComplete
    ? reviewOut &&
      CLASSES.includes(reviewOut.classification) &&
      reviewOut.classification !== "Incomplete"
      ? (reviewOut.classification as ReviewResult["classification"])
      : "Optimal"
    : "Incomplete";

  const missingElements: string[] =
    Array.isArray(reviewOut?.missing_elements) && reviewOut.missing_elements.length > 0
      ? reviewOut.missing_elements
      : !isComplete
        ? heuristic.missing
        : [];

  const canonicalDatasets = getCanonicalMultiDatasets(data.slug, data.title, data.topics ?? []);
  const fallback = simulateProblem(data.slug, data.title, data.topics ?? []);

  return {
    is_complete: isComplete,
    classification,
    complexity: {
      time: typeof reviewOut?.complexity?.time === "string" ? reviewOut.complexity.time : isComplete ? "O(N)" : "—",
      space: typeof reviewOut?.complexity?.space === "string" ? reviewOut.complexity.space : isComplete ? "O(1)" : "—",
    },
    review:
      typeof reviewOut?.review === "string" && reviewOut.review.trim()
        ? reviewOut.review
        : isComplete
          ? "### Logical Approach Verified\n\nYour pseudocode provides a complete end-to-end algorithmic flow. Click **Start Visualization** to inspect the step-by-step execution across datasets."
          : "### Logic Incomplete\n\nYour pseudocode is missing critical algorithmic statements. Complete the loop structure, state updates, and return statement to visualize.",
    praise:
      typeof reviewOut?.praise === "string" && reviewOut.praise.trim()
        ? reviewOut.praise
        : isComplete
          ? "Strong structural clarity and logical setup in your pseudocode formulation."
          : "Good initial intuition on problem framing.",
    nudge:
      typeof reviewOut?.nudge === "string" && reviewOut.nudge.trim()
        ? reviewOut.nudge
        : heuristic.nudge,
    missing_elements: missingElements,
    test_array: fallback.array,
    code_lines: userCodeLines,
    viz_steps: [],
    models: {
      reviewer: reviewerModel,
      visualizer: null,
    },
    degraded: notices.length > 0,
    datasets: canonicalDatasets,
    active_dataset_id: canonicalDatasets[0]?.id ?? "dataset_1",
    dataset_traces: {},
    ...(notices.length ? { notice: notices.join(" ") } : {}),
  };
}

export const reviewPseudocode = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ReviewResult> => {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          return (await res.json()) as ReviewResult;
        }
      } catch (err) {
        console.log("Server review request failed, fallback to local:", err);
      }
    }
    return await processReviewPseudocode(data);
  });

// =====================================================================
// STAGE 2: Data Structure Selection, 3 Datasets & Step Plan
// =====================================================================
export const DatasetPlanInput = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: z.string().optional(),
  topics: z.array(z.string()).optional(),
  pseudocode: z.string().min(1),
  classification: z.string().optional(),
  complexity: z
    .object({
      time: z.string(),
      space: z.string(),
    })
    .optional(),
});

export async function processGenerateDatasetsAndPlan(
  data: z.infer<typeof DatasetPlanInput>,
): Promise<DatasetPlanResult> {
  const { reviewKey, geminiKey, openRouterKey } = getAiConfig();
  const keyForRequest = geminiKey || reviewKey || openRouterKey;
  const statement = statementForSlug(data.slug).slice(0, 3500);

  const canonicalDatasets = getCanonicalMultiDatasets(data.slug, data.title, data.topics ?? []);
  const fallbackShape = pickShape(data.slug, data.topics ?? []);

  const defaultPlan: ExecutionPlanStep[] = [
    {
      step_number: 1,
      line_index: 0,
      code_action: "Initialize algorithm pointers and auxiliary state",
      description: "Setup initial scanning indices and data containers before entering traversal.",
    },
    {
      step_number: 2,
      line_index: 1,
      code_action: "Begin iterative scan over the dataset elements",
      description: "Evaluate the first element, check loop invariants, and advance state.",
    },
  ];

  let planOut: any = null;
  let modelUsed: string | null = null;

  if (keyForRequest) {
    const system = DATASET_PLAN_SYSTEM_PROMPT;
    const user = buildDatasetPlanUserPrompt({
      title: data.title,
      topics: data.topics ?? [],
      statement,
      pseudocode: data.pseudocode,
      classification: data.classification,
      complexity: data.complexity,
    });

    try {
      const res = await raceModels(
        REVIEW_MODELS,
        keyForRequest,
        system,
        user,
        (j) => Array.isArray(j?.test_datasets) && j.test_datasets.length > 0,
      );
      if (res.json) {
        planOut = res.json;
        modelUsed = res.model;
      }
    } catch (err) {
      console.log("Stage 2 Dataset & Plan generation fallback:", err);
    }
  }

  let finalDatasets: TestDataset[] = canonicalDatasets;

  if (Array.isArray(planOut?.test_datasets) && planOut.test_datasets.length > 0) {
    const aiDatasets = planOut.test_datasets
      .filter((d: any) => d && typeof d === "object")
      .map((d: any, idx: number) => ({
        id: typeof d?.id === "string" && d.id.trim() ? d.id.trim() : `dataset_${idx + 1}`,
        label: typeof d?.label === "string" && d.label.trim() ? d.label.trim() : `Dataset ${idx + 1}`,
        description: typeof d?.description === "string" ? d.description : undefined,
        array: Array.isArray(d?.array)
          ? d.array
              .map((x: any) => (typeof x === "number" || typeof x === "string" ? x : String(x)))
              .filter((x: any) => x !== null && x !== undefined)
          : undefined,
        secondaryArray: Array.isArray(d?.secondaryArray)
          ? d.secondaryArray
              .map((x: any) => (typeof x === "number" || typeof x === "string" ? x : String(x)))
              .filter((x: any) => x !== null && x !== undefined)
          : undefined,
        matrix: Array.isArray(d?.matrix) ? d.matrix : undefined,
        tree: Array.isArray(d?.tree) ? d.tree : undefined,
        target: typeof d?.target === "number" || typeof d?.target === "string" ? d.target : undefined,
        k: typeof d?.k === "number" ? d.k : undefined,
        category: d?.category ?? (idx === 1 ? "longer" : idx === 2 ? "edge" : "standard"),
      }));

    if (aiDatasets.length > 0) {
      finalDatasets = aiDatasets.map((aiD: any, i: number) => {
        const canon = canonicalDatasets[i] ?? canonicalDatasets[0]!;
        const validMatrix =
          aiD.matrix && isValidMatrixForProblem(aiD.matrix, data.slug, data.topics ?? [])
            ? aiD.matrix
            : canon?.matrix;

        let validArray =
          aiD.array && aiD.array.length > 0
            ? aiD.array
            : validMatrix
              ? validMatrix.flat().filter((x: any): x is number => typeof x === "number")
              : canon?.array;

        let validTree = aiD.tree && aiD.tree.length > 0 ? aiD.tree : canon?.tree;

        return {
          id: aiD.id || `dataset_${i + 1}`,
          label: aiD.label || canon?.label || `Dataset ${i + 1}`,
          description: aiD.description || canon?.description,
          array: validArray,
          secondaryArray:
            aiD.secondaryArray && aiD.secondaryArray.length > 0
              ? aiD.secondaryArray
              : canon?.secondaryArray,
          matrix: validMatrix,
          tree: validTree,
          target: aiD.target !== undefined ? aiD.target : canon?.target,
          k: aiD.k !== undefined ? aiD.k : canon?.k,
          category: (i === 1 ? "longer" : i === 2 ? "edge" : "standard") as "standard" | "longer" | "edge",
        };
      });
    }
  }

  const executionPlan: ExecutionPlanStep[] =
    Array.isArray(planOut?.execution_plan) && planOut.execution_plan.length > 0
      ? planOut.execution_plan.map((p: any, i: number) => ({
          step_number: typeof p?.step_number === "number" ? p.step_number : i + 1,
          line_index: typeof p?.line_index === "number" ? p.line_index : 0,
          code_action: typeof p?.code_action === "string" ? p.code_action : "Execute step",
          description: typeof p?.description === "string" ? p.description : "",
        }))
      : defaultPlan;

  const dataStructureType =
    typeof planOut?.data_structure_type === "string" && planOut.data_structure_type.trim()
      ? planOut.data_structure_type.trim()
      : fallbackShape;

  const dataStructureName =
    typeof planOut?.data_structure_name === "string" && planOut.data_structure_name.trim()
      ? planOut.data_structure_name.trim()
      : dataStructureType.toUpperCase();

  return {
    data_structure_type: dataStructureType,
    data_structure_name: dataStructureName,
    datasets: finalDatasets,
    execution_plan: executionPlan,
    model: modelUsed,
    degraded: !modelUsed,
  };
}

export const generateDatasetsAndPlan = createServerFn({ method: "POST" })
  .validator((input: unknown) => DatasetPlanInput.parse(input))
  .handler(async ({ data }): Promise<DatasetPlanResult> => {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/generate-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.log("Server generate-plan request failed, fallback to local:", err);
      }
    }
    return await processGenerateDatasetsAndPlan(data);
  });

// =====================================================================
// STAGE 3: Visualizer with Full Marker Vocabulary & Execution Plan
// =====================================================================
export const DatasetVizInput = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: z.string().optional(),
  topics: z.array(z.string()).optional(),
  pseudocode: z.string().min(1),
  dataStructureType: z.string().optional(),
  previousContext: z.string().optional(),
  currentStepOffset: z.number().optional(),
  executionPlan: z
    .array(
      z.object({
        step_number: z.number(),
        line_index: z.number(),
        code_action: z.string(),
        description: z.string(),
      }),
    )
    .optional(),
  dataset: z.object({
    id: z.string(),
    label: z.string(),
    description: z.string().optional(),
    array: z.array(z.union([z.number(), z.string()])).optional(),
    secondaryArray: z.array(z.union([z.number(), z.string()])).optional(),
    matrix: z.array(z.array(z.union([z.number(), z.string()]))).optional(),
    tree: z.array(z.union([z.number(), z.string(), z.null()])).optional(),
    target: z.union([z.number(), z.string()]).optional(),
    k: z.number().optional(),
    category: z.enum(["standard", "longer", "edge", "complex"]).optional(),
  }),
});

export async function processDatasetVisualization(data: z.infer<typeof DatasetVizInput>): Promise<{
  datasetId: string;
  test_array: (number | string)[];
  code_lines: string[];
  viz_steps: VizStep[];
  is_complete?: boolean;
  total_expected_steps?: number;
  execution_plan?: ExecutionPlanStep[];
  visualization_failed: boolean;
  visualization_error?: string;
  model?: string | null;
}> {
  const userCodeLines = userCodeLinesFromPseudocode(data.pseudocode);
  const dataset = data.dataset as TestDataset;

  const heuristic = evaluatePseudocodeHeuristic(data.pseudocode);
  if (!heuristic.isComplete) {
    return {
      datasetId: dataset.id,
      test_array: dataset.array ?? [],
      code_lines: userCodeLines,
      viz_steps: [],
      visualization_failed: true,
      visualization_error:
        "Pseudocode logic is incomplete. Please complete your algorithm (loops, state transitions, and return statement) to simulate execution.",
    };
  }

  const isLonger = dataset.category === "longer" || dataset.id === "dataset_2";
  const canonicalDatasets = getCanonicalMultiDatasets(data.slug, data.title ?? "", data.topics ?? []);
  const canonDataset = canonicalDatasets.find((d) => d.id === dataset.id) ?? canonicalDatasets[isLonger ? 1 : 0];
  const isIsland = isIslandOrGridProblem(data.slug, data.topics ?? []);
  const isMatrix = isMatrixProblem(data.slug, data.topics ?? []);

  const matrixExample =
    dataset.matrix && isValidMatrixForProblem(dataset.matrix, data.slug, data.topics ?? [])
      ? dataset.matrix
      : canonDataset?.matrix ?? (isMatrix || isIsland ? sampleMatrixFor(data.slug) : undefined);

  const effectiveArray =
    dataset.array && dataset.array.length > 0
      ? dataset.array
      : matrixExample && matrixExample.length > 0
        ? matrixExample.flat().filter((x: any): x is number => typeof x === "number")
        : canonDataset?.array ?? dataset.array;

  const effectiveTree =
    dataset.tree && dataset.tree.length > 0
      ? dataset.tree
      : canonDataset?.tree ?? dataset.tree;

  const sanitizedDataset: TestDataset = {
    ...dataset,
    matrix: matrixExample,
    array: effectiveArray,
    tree: effectiveTree,
  };

  const { reviewKey, vizKey, geminiKey, openRouterKey } = getAiConfig();
  const vizKeyForRequest = geminiKey || vizKey || openRouterKey || reviewKey;
  const statement = statementForSlug(data.slug).slice(0, 3500);
  const fallback = simulateProblemWithDataset(
    data.slug,
    data.title,
    data.topics ?? [],
    sanitizedDataset,
    data.pseudocode,
  );
  const preferredShape = data.dataStructureType ?? fallback.steps[0]?.type ?? pickShape(data.slug, data.topics ?? []);

  let vizOut: any = null;
  let modelUsed: string | null = null;

  if (vizKeyForRequest) {
    const vizSystem = VISUALIZER_SYSTEM_PROMPT;

    const vizUser = buildVisualizerUserPrompt({
      title: data.title,
      statement,
      example:
        sanitizedDataset.array && sanitizedDataset.array.length > 0
          ? sanitizedDataset.array
          : sampleInputFor(data.slug),
      secondaryArrayExample: sanitizedDataset.secondaryArray,
      matrixExample,
      treeExample: sanitizedDataset.tree,
      targetExample: sanitizedDataset.target,
      datasetLabel: sanitizedDataset.label,
      datasetDescription: sanitizedDataset.description,
      dataStructureType: data.dataStructureType,
      previousContext: data.previousContext,
      currentStepOffset: data.currentStepOffset,
      executionPlan: data.executionPlan,
      pseudocode: data.pseudocode,
    });

    try {
      const v = await raceModels(
        VIZ_MODELS,
        vizKeyForRequest,
        vizSystem,
        vizUser,
        (j) => j?.is_complete === false || (Array.isArray(j?.viz_steps) && j.viz_steps.length > 0),
      );
      if (v.json) {
        vizOut = v.json;
        modelUsed = v.model;
      }
    } catch {
      // AI visualizer failure falls back to deterministic simulation
    }
  }

  const normalizedViz = vizOut
    ? validateAndNormalizeVizPayload(vizOut, fallback, preferredShape as any, userCodeLines)
    : null;

  const isValidAiViz =
    !!vizOut &&
    !!normalizedViz &&
    Array.isArray(normalizedViz.viz_steps) &&
    normalizedViz.viz_steps.length > 0 &&
    hasMeaningfulTraversal(normalizedViz.viz_steps);

  if (!isValidAiViz && data.currentStepOffset && data.currentStepOffset > 0) {
    throw new Error("AI step generation failed midway. Rejecting deterministic fallback to preserve prior steps.");
  }

  const codeLines =
    isValidAiViz && normalizedViz
      ? normalizedViz.code_lines.some((line: string) =>
          /^line\s+\d+$/i.test(String(line).trim()),
        )
        ? userCodeLines
        : normalizedViz.code_lines
      : fallback.code;

  const vizSteps = isValidAiViz && normalizedViz ? normalizedViz.viz_steps : fallback.steps;
  const testArray =
    isValidAiViz && normalizedViz && normalizedViz.test_array.length
      ? normalizedViz.test_array
      : fallback.array;

  // If is_complete is missing, assume it was truncated if it hit 10 steps, otherwise assume complete.
  // The deterministic simulator always returns complete traces.
  const parsedIsComplete = isValidAiViz
    ? (vizOut?.is_complete ?? (vizSteps.length < 10))
    : true;

  // Extract or calculate total expected steps predicted by the model on the first execution
  let totalExpectedSteps: number =
    typeof vizOut?.total_expected_steps === "number" && vizOut.total_expected_steps > 0
      ? Math.round(vizOut.total_expected_steps)
      : Array.isArray(vizOut?.execution_plan) && vizOut.execution_plan.length > 0
        ? vizOut.execution_plan.length
        : data.executionPlan && data.executionPlan.length > 0
          ? data.executionPlan.length
          : Math.max(vizSteps.length, fallback.steps.length, parsedIsComplete ? vizSteps.length : 15);

  // Construct specific execution plan steps for this chosen dataset
  const datasetExecutionPlan: ExecutionPlanStep[] =
    Array.isArray(vizOut?.execution_plan) && vizOut.execution_plan.length > 0
      ? vizOut.execution_plan.map((p: any, idx: number) => ({
          step_number: typeof p.step_number === "number" ? p.step_number : idx + 1,
          line_index: typeof p.line_index === "number" ? p.line_index : (vizSteps[idx]?.line ?? 0),
          code_action: String(p.code_action || vizSteps[idx]?.desc?.split(".")[0] || `Step ${idx + 1}`),
          description: String(p.description || vizSteps[idx]?.desc || ""),
        }))
      : vizSteps.length > 0
        ? vizSteps.map((step: any, idx: number) => ({
            step_number: idx + 1,
            line_index: step.line ?? 0,
            code_action: step.desc?.split(".")[0] || `Step ${idx + 1}`,
            description: step.desc || "",
          }))
        : data.executionPlan || [];

  return {
    datasetId: dataset.id,
    test_array: testArray,
    code_lines: codeLines,
    viz_steps: vizSteps,
    is_complete: parsedIsComplete,
    total_expected_steps: totalExpectedSteps,
    execution_plan: datasetExecutionPlan,
    visualization_failed: false, // Don't mark as failed just because it's chunked
    model: isValidAiViz ? modelUsed : "Simulator Engine",
  };
}

export const generateDatasetVisualization = createServerFn({ method: "POST" })
  .validator((input: unknown) => DatasetVizInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{
      datasetId: string;
      test_array: (number | string)[];
      code_lines: string[];
      viz_steps: VizStep[];
      is_complete?: boolean;
      total_expected_steps?: number;
      execution_plan?: ExecutionPlanStep[];
      visualization_failed: boolean;
      visualization_error?: string;
      model?: string | null;
    }> => {
      if (typeof window !== "undefined") {
        try {
          const res = await fetch("/api/visualize-dataset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (res.ok) {
            return await res.json();
          }
        } catch (err) {
          console.log("Server visualize-dataset request failed, fallback to local:", err);
        }
      }
      return await processDatasetVisualization(data);
    },
  );

export async function processVerifyDatasetTrace(data: {
  slug: string;
  title: string;
  pseudocode: string;
  datasetLabel: string;
  traceSteps: any[];
}) {
  const { reviewKey, vizKey, geminiKey, openRouterKey } = getAiConfig();
  const key = geminiKey || reviewKey || vizKey || openRouterKey;

  if (!key) {
    throw new Error("No API key available for verification");
  }

  const statement = statementForSlug(data.slug).slice(0, 3500);

  const systemPrompt = VERIFY_SYSTEM_PROMPT;
  const userPrompt = buildVerifyUserPrompt({
    title: data.title,
    statement,
    pseudocode: data.pseudocode,
    datasetLabel: data.datasetLabel,
    traceSteps: data.traceSteps as VizStep[],
  });

  const res = await raceModels(
    REVIEW_MODELS, // usually smarter models
    key,
    systemPrompt,
    userPrompt,
    (j) => typeof j?.is_valid === "boolean" && Array.isArray(j?.discrepancies)
  );

  if (!res.json) {
    throw new Error("Failed to generate valid verification output.");
  }

  const raw = res.json as any;
  const isComplete =
    typeof raw.is_algorithm_complete === "boolean"
      ? raw.is_algorithm_complete
      : raw.is_valid && (!raw.discrepancies || raw.discrepancies.length === 0);

  return {
    is_valid: Boolean(raw.is_valid),
    is_algorithm_complete: isComplete,
    discrepancies: Array.isArray(raw.discrepancies) ? raw.discrepancies : [],
    summary: String(raw.summary || (raw.is_valid ? "Trace is verified valid." : "Discrepancies found.")),
  } as TraceVerification;
}

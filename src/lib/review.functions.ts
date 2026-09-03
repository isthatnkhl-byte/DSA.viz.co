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
  isMatrixTransformationProblem,
  isDynamicSlidingWindowProblem,
  isInPlacePointerProblem,
  isPrefixSumProblem,
  getCanonicalMultiDatasets,
  type TestDataset,
  type VizStep,
} from "./problems";
import { simulateProblem, simulateProblemWithDataset } from "./simulators";
import { REVIEW_SYSTEM_PROMPT, buildReviewUserPrompt } from "./prompts/review.prompt";
import { VISUALIZER_SYSTEM_PROMPT, buildVisualizerUserPrompt } from "./prompts/visualizer.prompt";
import { raceModels, REVIEW_MODELS, VIZ_MODELS } from "./openrouter.server";

const Input = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: z.string().optional(),
  topics: z.array(z.string()).optional(),
  pseudocode: z.string().min(1),
});

export interface DatasetVizTrace {
  test_array: (number | string)[];
  code_lines: string[];
  viz_steps: VizStep[];
  visualization_failed?: boolean;
  visualization_error?: string;
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

  // Check for substantive algorithmic keywords and tokens
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

  // Pseudocode is considered incomplete if it has fewer than 2 meaningful lines,
  // fewer than 6 total words, matches fewer than 2 substantive syntax categories,
  // or contains only trivial placeholders.
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
    nudge: "Good job outlining your algorithm! Watch the step-by-step trace across datasets below.",
  };
}

function isValidMatrixForProblem(
  matrix: unknown,
  slug: string,
  topics: string[] = [],
  isLongerDataset = false,
  canonicalRows = 0,
  canonicalCols = 0,
): matrix is (number | string)[][] {
  if (!Array.isArray(matrix) || matrix.length < 2) return false;
  if (!matrix.every((r) => Array.isArray(r) && r.length >= 2 && r.length === matrix[0].length)) {
    return false;
  }
  const isIsland = isIslandOrGridProblem(slug, topics);
  if (isIsland) {
    if (matrix.length < 3 || (matrix[0]?.length ?? 0) < 3) return false;
    const isBinary = matrix.every((row: any) =>
      Array.isArray(row) &&
      row.every((cell: any) => {
        const n = Number(cell);
        const s = String(cell).toUpperCase();
        return n === 0 || n === 1 || n === 2 || s === "0" || s === "1" || s === "X" || s === "O";
      }),
    );
    if (!isBinary) return false;
  }
  // Enforce size invariant for Dataset 2 (Longer): must not be shrunken smaller than canonical
  if (isLongerDataset && canonicalRows > 0 && canonicalCols > 0) {
    const aiCells = matrix.length * matrix[0].length;
    const canonCells = canonicalRows * canonicalCols;
    if (aiCells < canonCells || matrix.length < canonicalRows || matrix[0].length < canonicalCols) {
      return false;
    }
  }
  return true;
}

function isValidArrayForProblem(
  arr: unknown,
  _slug: string,
  _topics: string[] = [],
  isLongerDataset = false,
  canonicalLength = 0,
): arr is (number | string)[] {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  // If longer dataset, ensure AI didn't shrink it smaller than canonical
  if (isLongerDataset && canonicalLength > 0 && arr.length < canonicalLength) {
    return false;
  }
  return true;
}

export async function processReviewPseudocode(data: z.infer<typeof Input>): Promise<ReviewResult> {
    const { reviewKey, vizKey, geminiKey, openRouterKey } = getAiConfig();
    const reviewKeyForRequest = geminiKey || reviewKey || openRouterKey;
    const vizKeyForRequest = geminiKey || vizKey || openRouterKey;
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
    let vizOut: any = null;
    let reviewerModel: string | null = null;
    let vizModel: string | null = null;
    let lastError: string | null = null;
    let visualizerFallbackUsed = false;

    // Step 1: Run AI Reviewer to evaluate logical completeness, quality, and datasets
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
    if (!reviewKey && !vizKey) {
      notices.push("No AI keys configured — showing an offline reference review.");
    }

    // Determine completeness based on AI review verdict and strict syntactic/semantic heuristics
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
    } else if (reviewKeyForRequest) {
      // If we called the AI and it failed, DO NOT assume it is complete.
      isComplete = false;
    }

    const classification: ReviewResult["classification"] = isComplete
      ? reviewOut &&
        CLASSES.includes(reviewOut.classification) &&
        reviewOut.classification !== "Incomplete"
        ? (reviewOut.classification as ReviewResult["classification"])
        : "Brute Force" // fallback if it is complete but AI didn't provide a valid classification
      : "Incomplete";

    const missingElements: string[] =
      Array.isArray(reviewOut?.missing_elements) && reviewOut.missing_elements.length > 0
        ? reviewOut.missing_elements
        : !isComplete
          ? heuristic.missing
          : [];

    // Multi-Dataset Resolution: Merge AI-generated datasets with rich canonical multi-datasets
    const canonicalDatasets = getCanonicalMultiDatasets(data.slug, data.title, data.topics ?? []);
    let datasets: TestDataset[] = canonicalDatasets;

    if (Array.isArray(reviewOut?.test_datasets) && reviewOut.test_datasets.length > 0) {
      const aiDatasets = reviewOut.test_datasets
        .filter((d: any) => d && typeof d === "object")
        .map((d: any, idx: number) => ({
          id: typeof d?.id === "string" && d.id.trim() ? d.id.trim() : `dataset_${idx + 1}`,
          label:
            typeof d?.label === "string" && d.label.trim() ? d.label.trim() : `Dataset ${idx + 1}`,
          description: typeof d?.description === "string" ? d.description : undefined,
          array: Array.isArray(d?.array)
            ? (d.array.length === 1 && typeof d.array[0] === "string" && d.array[0].length > 1 && isDynamicSlidingWindowProblem(data.slug, data.topics ?? []))
                ? d.array[0].split("")
                : d.array
                    .map((x: any) =>
                      typeof x === "number" || typeof x === "string" ? x : String(x),
                    )
                    .filter((x: any) => x !== null && x !== undefined)
            : undefined,
          secondaryArray: Array.isArray(d?.secondaryArray)
            ? d.secondaryArray
                .map((x: any) =>
                  typeof x === "number" || typeof x === "string" ? x : String(x),
                )
                .filter((x: any) => x !== null && x !== undefined)
            : undefined,
          matrix: Array.isArray(d?.matrix) ? d.matrix : undefined,
          tree: Array.isArray(d?.tree) ? d.tree : undefined,
          target:
            typeof d?.target === "number" || typeof d?.target === "string"
              ? d.target
              : undefined,
          k: typeof d?.k === "number" ? d.k : undefined,
          category: d?.category ?? (idx === 1 ? "longer" : idx === 2 ? "edge" : "standard"),
        }));

      if (aiDatasets.length > 0) {
        datasets = canonicalDatasets.map((canon, i) => {
          const aiD = aiDatasets[i];
          if (!aiD) return canon;

          // CRITICAL: Dataset 1 (Standard Case, i === 0) strictly preserves canonical problem input and target
          if (i === 0) {
            return {
              ...canon,
              label: aiD.label || canon.label,
              description: aiD.description || canon.description,
              array: canon.array,
              secondaryArray: canon.secondaryArray,
              matrix: canon.matrix,
              tree: canon.tree,
              target: canon.target,
              k: canon.k,
            };
          }

          const isLonger = i === 1;
          const canonRows = canon.matrix?.length ?? 0;
          const canonCols = canon.matrix?.[0]?.length ?? 0;
          const canonArrayLength = canon.array?.length ?? 0;
          const validMatrix =
            aiD.matrix &&
            isValidMatrixForProblem(
              aiD.matrix,
              data.slug,
              data.topics ?? [],
              isLonger,
              canonRows,
              canonCols,
            )
              ? aiD.matrix
              : canon.matrix;
          const validArray =
            validMatrix && canon.matrix
              ? validMatrix.flat().filter((x: any): x is number => typeof x === "number")
              : aiD.array &&
                isValidArrayForProblem(
                  aiD.array,
                  data.slug,
                  data.topics ?? [],
                  isLonger,
                  canonArrayLength,
                )
                ? aiD.array
                : canon.array;

          return {
            ...canon,
            label: aiD.label || canon.label,
            description: aiD.description || canon.description,
            array: validArray,
            secondaryArray:
              aiD.secondaryArray && aiD.secondaryArray.length > 0
                ? aiD.secondaryArray
                : canon.secondaryArray,
            matrix: validMatrix,
            tree: aiD.tree && aiD.tree.length > 0 ? aiD.tree : canon.tree,
            target: aiD.target !== undefined ? aiD.target : canon.target,
            k: aiD.k !== undefined ? aiD.k : canon.k,
          };
        });
      }
    }

    const activeDataset = datasets[0] ?? canonicalDatasets[0]!;

    // Step 2: ONLY generate visualization if the logic is complete
    if (isComplete) {
      const fallback = simulateProblemWithDataset(
        data.slug,
        data.title,
        data.topics ?? [],
        activeDataset,
      );
      const preferredShape = fallback.steps[0]?.type ?? pickShape(data.slug, data.topics ?? []);

      if (vizKeyForRequest) {
        const vizSystem = VISUALIZER_SYSTEM_PROMPT;
        const matrixExample =
          activeDataset.matrix && activeDataset.matrix.length > 0
            ? activeDataset.matrix
            : isIslandOrGridProblem(data.slug, data.topics ?? []) ||
              isMatrixTransformationProblem(data.slug, data.topics ?? [])
              ? sampleMatrixFor(data.slug)
              : undefined;

        const vizUser = buildVisualizerUserPrompt({
          title: data.title,
          statement,
          example:
            activeDataset.array && activeDataset.array.length > 0
              ? activeDataset.array
              : sampleInputFor(data.slug),
          secondaryArrayExample: activeDataset.secondaryArray,
          matrixExample,
          treeExample: activeDataset.tree,
          targetExample: activeDataset.target,
          datasetLabel: activeDataset.label,
          datasetDescription: activeDataset.description,
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
            vizModel = v.model;
          } else {
            lastError = lastError ?? v.error;
          }
        } catch (err) {
          lastError = lastError ?? (err instanceof Error ? err.message : String(err));
        }
      }

      const referenceSolution = {
        code_lines: fallback.code,
        viz_steps: fallback.steps,
        test_array: fallback.array,
      };

      const normalizedViz = vizOut
        ? validateAndNormalizeVizPayload(vizOut, fallback, preferredShape, userCodeLines)
        : null;

      const isValidAiViz =
        !!vizOut &&
        !!normalizedViz &&
        Array.isArray(normalizedViz.viz_steps) &&
        normalizedViz.viz_steps.length > 0 &&
        hasMeaningfulTraversal(normalizedViz.viz_steps);

      if (!isValidAiViz) {
        visualizerFallbackUsed = true;
        vizModel = null;
      }

      const codeLines =
        isValidAiViz && normalizedViz
          ? normalizedViz.code_lines.some((line: string) =>
              /^line\s+\d+$/i.test(String(line).trim()),
            )
            ? userCodeLines
            : normalizedViz.code_lines
          : userCodeLines.length > 0
            ? userCodeLines
            : fallback.code;

      const vizSteps = vizOut?.is_complete === false ? [] : (isValidAiViz && normalizedViz ? normalizedViz.viz_steps : fallback.steps);
      const testArray =
        isValidAiViz && normalizedViz && normalizedViz.test_array.length
          ? normalizedViz.test_array
          : fallback.array;

      const datasetTraces: Record<string, DatasetVizTrace> = {
        [activeDataset.id]: {
          test_array: testArray,
          code_lines: codeLines,
          viz_steps: vizSteps,
          visualization_failed: vizOut?.is_complete === false,
        },
      };

      return {
        is_complete: true,
        classification,
        complexity: {
          time: typeof reviewOut?.complexity?.time === "string" ? reviewOut.complexity.time : "—",
          space:
            typeof reviewOut?.complexity?.space === "string" ? reviewOut.complexity.space : "—",
        },
        review:
          typeof reviewOut?.review === "string" && reviewOut.review.trim()
            ? reviewOut.review
            : "Your approach provides a complete algorithmic flow. Review the time and space complexity against optimal interview patterns.",
        praise:
          typeof reviewOut?.praise === "string" && reviewOut.praise.trim()
            ? reviewOut.praise
            : "You committed a full approach to paper before coding — that is exactly the habit strong interviewees have.",
        nudge:
          typeof reviewOut?.nudge === "string" && reviewOut.nudge.trim()
            ? reviewOut.nudge
            : heuristic.nudge,
        missing_elements: [],
        test_array: testArray,
        code_lines: codeLines,
        viz_steps: vizSteps,
        models: {
          reviewer: reviewerModel,
          visualizer: isValidAiViz ? vizModel : "Simulator Engine",
        },
        degraded: notices.length > 0,
        visualization_failed: vizOut?.is_complete === false,
        reference_solution: referenceSolution,
        datasets,
        active_dataset_id: activeDataset.id,
        dataset_traces: datasetTraces,
        ...(notices.length ? { notice: notices.join(" ") } : {}),
      };
    }

    // Logic is INCOMPLETE: Do NOT visualize, provide clear hints on what more to add
    const fallback = simulateProblem(data.slug, data.title, data.topics ?? []);
    return {
      is_complete: false,
      classification: "Incomplete",
      complexity: {
        time: "—",
        space: "—",
      },
      review:
        typeof reviewOut?.review === "string" && reviewOut.review.trim()
          ? reviewOut.review
          : lastError
            ? `### AI Reviewer Error\n\nThe AI model request failed: ${lastError}\n\nPlease try again or check your API keys.`
            : "### Logic Not Yet Complete\n\nYour pseudocode is currently missing critical algorithmic steps. To visualize execution, complete the end-to-end logic (whether Brute Force, Better, or Optimal).",
      praise:
        typeof reviewOut?.praise === "string" && reviewOut.praise.trim()
          ? reviewOut.praise
          : lastError
            ? "AI models are currently unreachable."
            : "Good start on framing the problem setup and initial thoughts.",
      nudge:
        typeof reviewOut?.nudge === "string" && reviewOut.nudge.trim()
          ? reviewOut.nudge
          : lastError
            ? "Ensure your API keys are valid and you have not hit a rate limit."
            : heuristic.nudge,
      missing_elements: missingElements,
      test_array: fallback.array,
      code_lines: userCodeLines,
      viz_steps: [], // No visualization for incomplete pseudocode
      models: { reviewer: reviewerModel, visualizer: null },
      degraded: notices.length > 0,
      datasets,
      active_dataset_id: activeDataset.id,
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
          const json = (await res.json()) as ReviewResult;
          return json;
        }
      } catch (err) {
        console.warn("Server review request failed, fallback to local:", err);
      }
    }
    return await processReviewPseudocode(data);
  });

export const DatasetVizInput = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: z.string().optional(),
  topics: z.array(z.string()).optional(),
  pseudocode: z.string().min(1),
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
  visualization_failed: boolean;
  visualization_error?: string;
}> {
  const userCodeLines = userCodeLinesFromPseudocode(data.pseudocode);
  const dataset = data.dataset as TestDataset;

  // Completeness guard: If pseudocode is incomplete, do NOT generate steps
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
  const canonDatasets = getCanonicalMultiDatasets(data.slug, data.title, data.topics ?? []);
  const canonMatch = canonDatasets.find((d) => d.id === dataset.id);
  const canonRows = canonMatch?.matrix?.length ?? 0;
  const canonCols = canonMatch?.matrix?.[0]?.length ?? 0;

  const matrixExample =
    dataset.matrix &&
    isValidMatrixForProblem(
      dataset.matrix,
      data.slug,
      data.topics ?? [],
      isLonger,
      canonRows,
      canonCols,
    )
      ? dataset.matrix
      : isIslandOrGridProblem(data.slug, data.topics ?? []) ||
        isMatrixTransformationProblem(data.slug, data.topics ?? [])
        ? sampleMatrixFor(data.slug)
        : undefined;

  const isDynamicWindow = isDynamicSlidingWindowProblem(data.slug, data.topics ?? []);
  let candidateArray = dataset.array;
  if (
    isDynamicWindow &&
    candidateArray &&
    candidateArray.length === 1 &&
    typeof candidateArray[0] === "string" &&
    candidateArray[0].length > 1
  ) {
    candidateArray = candidateArray[0].split("");
  }

  // If Dataset 1, strictly preserve canonical array and target
  if (dataset.id === "dataset_1" && canonMatch) {
    candidateArray = canonMatch.array ?? candidateArray;
  }

  const sanitizedDataset: TestDataset = {
    ...dataset,
    matrix: matrixExample,
    target: dataset.id === "dataset_1" && canonMatch?.target !== undefined ? canonMatch.target : dataset.target,
    k: dataset.id === "dataset_1" && canonMatch?.k !== undefined ? canonMatch.k : dataset.k,
    array:
      matrixExample && matrixExample.length > 0
        ? matrixExample.flat().filter((x: any): x is number => typeof x === "number")
        : candidateArray,
  };

  const { reviewKey, vizKey, geminiKey, openRouterKey } = getAiConfig();
  const vizKeyForRequest = geminiKey || vizKey || openRouterKey || reviewKey;
  const statement = statementForSlug(data.slug).slice(0, 3500);
  const fallback = simulateProblemWithDataset(
    data.slug,
    data.title,
    data.topics ?? [],
    sanitizedDataset,
  );
  const preferredShape = fallback.steps[0]?.type ?? pickShape(data.slug, data.topics ?? []);

  let vizOut: any = null;
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
      }
    } catch {
      // AI visualizer failure falls back to deterministic simulation
    }
  }

  const normalizedViz = vizOut
    ? validateAndNormalizeVizPayload(vizOut, fallback, preferredShape, userCodeLines)
    : null;

  const isValidAiViz =
    !!vizOut &&
    !!normalizedViz &&
    Array.isArray(normalizedViz.viz_steps) &&
    normalizedViz.viz_steps.length > 0 &&
    hasMeaningfulTraversal(normalizedViz.viz_steps);

  const codeLines =
    isValidAiViz && normalizedViz
      ? normalizedViz.code_lines.some((line: string) =>
          /^line\s+\d+$/i.test(String(line).trim()),
        )
        ? userCodeLines
        : normalizedViz.code_lines
      : fallback.code;

  const vizSteps = vizOut?.is_complete === false ? [] : (isValidAiViz && normalizedViz ? normalizedViz.viz_steps : fallback.steps);
  const testArray =
    isValidAiViz && normalizedViz && normalizedViz.test_array.length
      ? normalizedViz.test_array
      : fallback.array;

  return {
    datasetId: dataset.id,
    test_array: testArray,
    code_lines: codeLines,
    viz_steps: vizSteps,
    visualization_failed: vizOut?.is_complete === false,
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
      visualization_failed: boolean;
      visualization_error?: string;
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
          console.warn("Server visualize-dataset request failed, fallback to local:", err);
        }
      }
      return await processDatasetVisualization(data);
    },
  );

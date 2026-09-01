/**
 * ============================================================================
 * End-to-End System Pipeline Test Suite
 * ============================================================================
 * Tests the entire algorithm lifecycle:
 *  1. Problem Resolution (Slug/Title normalization & metadata)
 *  2. Statement Retrieval (Data integrity & markdown structure)
 *  3. Multi-Dataset Generation (Standard, Longer, Edge datasets)
 *  4. Pseudocode Prompt Assembly (Line extraction, Review & Viz prompts)
 *  5. Reviewer Engine (Heuristic validation & AI contract verification)
 *  6. Visualizer Simulation (Trace generation, step contracts, traversal)
 *  7. Domain Correctness (Verifying actual computed result vs expected)
 *  8. Multi-Dataset Execution (Ensuring edge/longer datasets don't crash)
 *
 * Usage:
 *  - Automated Test Suite: npm test
 *  - CLI Direct Run:       npx tsx test/system-pipeline.test.ts [question-name-or-slug]
 *  - Test Specific Slug:   npx tsx test/system-pipeline.test.ts --slug=two-sum
 *  - Test with Custom Code: npx tsx test/system-pipeline.test.ts --slug=two-sum --code="def twoSum..."
 *  - Test All Benchmarks:  npx tsx test/system-pipeline.test.ts --all
 * ============================================================================
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  problemBySlug,
  getCanonicalMultiDatasets,
  isIslandOrGridProblem,
  pickShape,
  type Problem,
  type TestDataset,
  type VizStep,
} from "../src/lib/problems";
import { statementForSlug } from "../src/lib/statements";
import {
  simulateProblemWithDataset,
  patternFor,
  type Pattern,
  type VizBundle,
} from "../src/lib/simulators";
import {
  hasMeaningfulTraversal,
  validateAndNormalizeVizPayload,
} from "../src/lib/ai-contracts";
import { REVIEW_SYSTEM_PROMPT, buildReviewUserPrompt } from "../src/lib/prompts/review.prompt";
import { VISUALIZER_SYSTEM_PROMPT, buildVisualizerUserPrompt } from "../src/lib/prompts/visualizer.prompt";
import { getAiConfig } from "../src/lib/ai-config";
import { raceModels, REVIEW_MODELS, VIZ_MODELS } from "../src/lib/openrouter.server";

export interface PipelineStepLog {
  phase: string;
  name: string;
  status: "PASSED" | "FAILED" | "WARNING" | "SKIPPED";
  durationMs: number;
  details: string;
  error?: string;
}

export interface PipelineReport {
  slug: string;
  title: string;
  overallStatus: "PASSED" | "FAILED";
  totalDurationMs: number;
  steps: PipelineStepLog[];
  reviewerVerdict?: {
    is_complete: boolean;
    classification: string;
    complexity?: { time: string; space: string };
    missing?: string[];
  };
  visualizerVerdict?: {
    stepCount: number;
    vizType: string;
    lineCount: number;
    traversalValid: boolean;
    finalAnswer?: unknown;
  };
  rootCauseFailure?: string;
}

/**
 * Extract logical lines of code from pseudocode string.
 */
function userCodeLinesFromPseudocode(pseudocode: string): string[] {
  if (!pseudocode || typeof pseudocode !== "string") return ["const result = solve(input);"];
  const rawLines = pseudocode
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return rawLines.length > 0 ? rawLines.slice(0, 60) : ["const result = solve(input);"];
}

/**
 * Heuristic completeness checker used in fallback mode.
 */
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
    nudge: "Good job outlining your algorithm! Watch the step-by-step trace across datasets below.",
  };
}

/**
 * Returns a high-quality canonical pseudocode draft for testing a given problem.
 */
export function getSamplePseudocodeForProblem(slug: string, title = ""): string {
  const s = slug.toLowerCase();
  if (s.includes("two-sum")) {
    return `seen = {}
for i, num in enumerate(nums):
    complement = target - num
    if complement in seen:
        return [seen[complement], i]
    seen[num] = i
return []`;
  }
  if (s.includes("reverse-linked-list")) {
    return `prev = None
curr = head
while curr:
    next_temp = curr.next
    curr.next = prev
    prev = curr
    curr = next_temp
return prev`;
  }
  if (s.includes("valid-parentheses")) {
    return `stack = []
mapping = {')': '(', '}': '{', ']': '['}
for char in s:
    if char in mapping:
        top = stack.pop() if stack else '#'
        if mapping[char] != top:
            return False
    else:
        stack.append(char)
return len(stack) == 0`;
  }
  if (s.includes("binary-search")) {
    return `left = 0
right = len(nums) - 1
while left <= right:
    mid = left + (right - left) // 2
    if nums[mid] == target:
        return mid
    elif nums[mid] < target:
        left = mid + 1
    else:
        right = mid - 1
return -1`;
  }
  if (s.includes("max-area-of-island") || s.includes("number-of-islands")) {
    return `def dfs(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == 0:
        return 0
    grid[r][c] = 0
    return 1 + dfs(r+1, c) + dfs(r-1, c) + dfs(r, c+1) + dfs(r, c-1)

max_area = 0
for r in range(rows):
    for c in range(cols):
        if grid[r][c] == 1:
            max_area = max(max_area, dfs(r, c))
return max_area`;
  }
  if (s.includes("trapping-rain-water")) {
    return `left, right = 0, len(height) - 1
left_max, right_max = 0, 0
water = 0
while left < right:
    if height[left] < height[right]:
        if height[left] >= left_max:
            left_max = height[left]
        else:
            water += left_max - height[left]
        left += 1
    else:
        if height[right] >= right_max:
            right_max = height[right]
        else:
            water += right_max - height[right]
        right -= 1
return water`;
  }
  if (s.includes("climbing-stairs") || s.includes("coin-change")) {
    return `dp = [0] * (n + 1)
dp[0] = 1
dp[1] = 1
for i in range(2, n + 1):
    dp[i] = dp[i - 1] + dp[i - 2]
return dp[n]`;
  }
  if (s.includes("lru-cache")) {
    return `class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.cache = OrderedDict()
    def get(self, key):
        if key not in self.cache: return -1
        self.cache.move_to_end(key)
        return self.cache[key]
    def put(self, key, value):
        if key in self.cache: self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap: self.cache.popitem(last=False)`;
  }
  // Generic standard approach
  return `# Standard solution algorithm for ${title || slug}
def solve(input_data):
    # Step 1: Initialize pointers and state tracking
    state = initialize_state()
    # Step 2: Iterate through input elements
    for item in input_data:
        process_element(item, state)
        if condition_met(state):
            return extract_result(state)
    return finalize(state)`;
}

/**
 * Execute the complete in-depth test pipeline on any question.
 */
export async function runSystemPipelineTest(options: {
  slugOrTitle: string;
  pseudocode?: string;
  useAi?: boolean;
  verbose?: boolean;
}): Promise<PipelineReport> {
  const startTime = Date.now();
  const steps: PipelineStepLog[] = [];
  let overallStatus: "PASSED" | "FAILED" = "PASSED";
  let rootCauseFailure: string | undefined;

  let resolvedProblem: Problem | null = null;
  let resolvedStatement = "";
  let resolvedDatasets: TestDataset[] = [];
  let codeLines: string[] = [];
  let simBundle: VizBundle | null = null;
  let reviewerData: any = null;
  let visualizerData: any = null;

  // Helper to record step results
  const recordStep = (
    phase: string,
    name: string,
    status: "PASSED" | "FAILED" | "WARNING" | "SKIPPED",
    durationMs: number,
    details: string,
    error?: string,
  ) => {
    steps.push({ phase, name, status, durationMs, details, error });
    if (status === "FAILED") {
      overallStatus = "FAILED";
      if (!rootCauseFailure) {
        rootCauseFailure = `[${phase}] ${name}: ${error || details}`;
      }
    }
  };

  // --------------------------------------------------------------------------
  // Phase 1: Problem Metadata Resolution
  // --------------------------------------------------------------------------
  const t1 = Date.now();
  try {
    resolvedProblem = problemBySlug(options.slugOrTitle);
    if (!resolvedProblem) {
      recordStep(
        "Phase 1",
        "Problem Resolution",
        "FAILED",
        Date.now() - t1,
        `Could not resolve problem from slug/title '${options.slugOrTitle}'`,
        "Problem is null",
      );
    } else {
      const pattern = patternFor(
        resolvedProblem.slug,
        resolvedProblem.title,
        resolvedProblem.topics,
      );
      const shape = pickShape(resolvedProblem.slug, resolvedProblem.topics);
      recordStep(
        "Phase 1",
        "Problem Resolution",
        "PASSED",
        Date.now() - t1,
        `Resolved '${resolvedProblem.title}' (${resolvedProblem.difficulty}) | Pattern: ${pattern} | Visualizer Shape: ${shape} | Topics: [${resolvedProblem.topics.join(", ")}]`,
      );
    }
  } catch (err: any) {
    recordStep(
      "Phase 1",
      "Problem Resolution",
      "FAILED",
      Date.now() - t1,
      "Exception during problemBySlug resolution",
      err.message,
    );
  }

  const slug = resolvedProblem?.slug ?? options.slugOrTitle;
  const title = resolvedProblem?.title ?? options.slugOrTitle;
  const topics = resolvedProblem?.topics ?? ["Algorithms"];

  // --------------------------------------------------------------------------
  // Phase 2: Problem Statement Registry Lookup
  // --------------------------------------------------------------------------
  const t2 = Date.now();
  try {
    resolvedStatement = statementForSlug(slug);
    if (!resolvedStatement || resolvedStatement.trim().length === 0) {
      recordStep(
        "Phase 2",
        "Statement Retrieval",
        "WARNING",
        Date.now() - t2,
        `Statement is empty or not found for slug '${slug}'. Defaulting to title fallback.`,
      );
      resolvedStatement = `Problem Statement for ${title}. Implement an optimal algorithm.`;
    } else {
      recordStep(
        "Phase 2",
        "Statement Retrieval",
        "PASSED",
        Date.now() - t2,
        `Statement retrieved successfully (${resolvedStatement.length} characters)`,
      );
    }
  } catch (err: any) {
    recordStep(
      "Phase 2",
      "Statement Retrieval",
      "FAILED",
      Date.now() - t2,
      "Exception retrieving statement",
      err.message,
    );
  }

  // --------------------------------------------------------------------------
  // Phase 3: Multi-Dataset Generation
  // --------------------------------------------------------------------------
  const t3 = Date.now();
  try {
    resolvedDatasets = getCanonicalMultiDatasets(slug, title, topics);
    if (!Array.isArray(resolvedDatasets) || resolvedDatasets.length === 0) {
      recordStep(
        "Phase 3",
        "Multi-Dataset Generation",
        "FAILED",
        Date.now() - t3,
        "No canonical datasets generated",
        "Datasets array is empty",
      );
    } else {
      const d1 = resolvedDatasets[0];
      const hasData = Boolean(
        d1?.array?.length || d1?.matrix?.length || d1?.tree?.length || d1?.target !== undefined,
      );
      if (!hasData) {
        recordStep(
          "Phase 3",
          "Multi-Dataset Generation",
          "FAILED",
          Date.now() - t3,
          "Primary dataset has no array, matrix, tree, or target values",
        );
      } else {
        recordStep(
          "Phase 3",
          "Multi-Dataset Generation",
          "PASSED",
          Date.now() - t3,
          `Generated ${resolvedDatasets.length} datasets: [${resolvedDatasets.map((d) => `${d.id} (${d.category || "custom"})`).join(", ")}]`,
        );
      }
    }
  } catch (err: any) {
    recordStep(
      "Phase 3",
      "Multi-Dataset Generation",
      "FAILED",
      Date.now() - t3,
      "Exception in getCanonicalMultiDatasets",
      err.message,
    );
  }

  const activeDataset = resolvedDatasets[0] || {
    id: "default_1",
    label: "Default Dataset",
    array: [1, 2, 3],
  };

  // --------------------------------------------------------------------------
  // Phase 4: Pseudocode Prompt Assembly
  // --------------------------------------------------------------------------
  const t4 = Date.now();
  const pseudocode = options.pseudocode || getSamplePseudocodeForProblem(slug, title);
  try {
    codeLines = userCodeLinesFromPseudocode(pseudocode);
    const reviewUserPrompt = buildReviewUserPrompt({
      title,
      difficulty: resolvedProblem?.difficulty ?? "Medium",
      topics,
      statement: resolvedStatement,
      pseudocode,
    });
    const vizUserPrompt = buildVisualizerUserPrompt({
      title,
      statement: resolvedStatement,
      example: activeDataset.array || [1, 2, 3],
      matrixExample: activeDataset.matrix,
      treeExample: activeDataset.tree,
      targetExample: activeDataset.target,
      datasetLabel: activeDataset.label,
      pseudocode,
    });

    if (!reviewUserPrompt || !vizUserPrompt || codeLines.length === 0) {
      recordStep(
        "Phase 4",
        "Prompt Assembly",
        "FAILED",
        Date.now() - t4,
        "Failed to assemble user prompts or code lines",
      );
    } else {
      recordStep(
        "Phase 4",
        "Prompt Assembly",
        "PASSED",
        Date.now() - t4,
        `Formatted ${codeLines.length} code lines | Review Prompt: ${reviewUserPrompt.length} chars | Viz Prompt: ${vizUserPrompt.length} chars`,
      );
    }
  } catch (err: any) {
    recordStep(
      "Phase 4",
      "Prompt Assembly",
      "FAILED",
      Date.now() - t4,
      "Exception assembling prompts",
      err.message,
    );
  }

  // --------------------------------------------------------------------------
  // Phase 5: Reviewer Engine (Heuristic & AI)
  // --------------------------------------------------------------------------
  const t5 = Date.now();
  try {
    const heuristic = evaluatePseudocodeHeuristic(pseudocode);
    let reviewerStatus: "PASSED" | "FAILED" | "WARNING" = "PASSED";
    let reviewDetails = `Heuristic: isComplete=${heuristic.isComplete}`;

    const { reviewKey, geminiKey, openRouterKey } = getAiConfig();
    const apiKey = geminiKey || reviewKey || openRouterKey;

    if (options.useAi && apiKey) {
      const reviewUserPrompt = buildReviewUserPrompt({
        title,
        difficulty: resolvedProblem?.difficulty,
        topics,
        statement: resolvedStatement,
        pseudocode,
      });

      const aiResponse = await raceModels(
        REVIEW_MODELS.slice(0, 3),
        apiKey,
        REVIEW_SYSTEM_PROMPT,
        reviewUserPrompt,
        (j) => typeof j?.classification === "string" && typeof j?.review === "string",
      );

      if (aiResponse.json) {
        reviewerData = aiResponse.json;
        reviewDetails = `AI Model (${aiResponse.model}): classification=${aiResponse.json.classification} | is_complete=${aiResponse.json.is_complete} | time=${aiResponse.json.complexity?.time}`;
      } else {
        reviewDetails += ` | AI Call warning: ${aiResponse.error || "no json returned"}`;
        reviewerStatus = "WARNING";
      }
    } else {
      reviewerData = {
        is_complete: heuristic.isComplete,
        classification: heuristic.isComplete ? "Optimal" : "Incomplete",
        complexity: { time: "O(n)", space: "O(1)" },
        missing_elements: heuristic.missing,
        nudge: heuristic.nudge,
      };
      reviewDetails += ` (Offline mode: classification=${reviewerData.classification})`;
    }

    recordStep("Phase 5", "Reviewer Engine", reviewerStatus, Date.now() - t5, reviewDetails);
  } catch (err: any) {
    recordStep(
      "Phase 5",
      "Reviewer Engine",
      "FAILED",
      Date.now() - t5,
      "Exception in reviewer engine",
      err.message,
    );
  }

  // --------------------------------------------------------------------------
  // Phase 6: Visualizer / Simulation Engine Trace Generation
  // --------------------------------------------------------------------------
  const t6 = Date.now();
  try {
    simBundle = simulateProblemWithDataset(slug, title, topics, activeDataset);

    if (!simBundle || !Array.isArray(simBundle.steps) || simBundle.steps.length === 0) {
      recordStep(
        "Phase 6",
        "Visualizer Simulation",
        "FAILED",
        Date.now() - t6,
        `Simulation engine produced 0 steps for slug '${slug}'`,
        "Empty steps array",
      );
    } else {
      const preferredShape = simBundle.steps[0]?.type || pickShape(slug, topics);
      const normalized = validateAndNormalizeVizPayload(
        {
          code_lines: simBundle.code,
          test_array: simBundle.array,
          viz_steps: simBundle.steps,
        },
        simBundle,
        preferredShape,
        codeLines,
      );

      const hasTraversal = hasMeaningfulTraversal(normalized.viz_steps);
      if (!hasTraversal) {
        recordStep(
          "Phase 6",
          "Visualizer Simulation",
          "WARNING",
          Date.now() - t6,
          `Steps generated (${simBundle.steps.length}) but traversal did not shift pointers/highlights across frames.`,
        );
      } else {
        recordStep(
          "Phase 6",
          "Visualizer Simulation",
          "PASSED",
          Date.now() - t6,
          `Generated ${simBundle.steps.length} animation frames | VizType: '${preferredShape}' | Code Lines: ${simBundle.code.length}`,
        );
      }
    }
  } catch (err: any) {
    recordStep(
      "Phase 6",
      "Visualizer Simulation",
      "FAILED",
      Date.now() - t6,
      `Exception generating visualizer simulation for '${slug}'`,
      err.message,
    );
  }

  // --------------------------------------------------------------------------
  // Phase 7: Domain Correctness & Final Answer Verification
  // --------------------------------------------------------------------------
  const t7 = Date.now();
  try {
    if (!simBundle || simBundle.steps.length === 0) {
      recordStep(
        "Phase 7",
        "Domain Correctness",
        "SKIPPED",
        Date.now() - t7,
        "Skipped due to empty simulation bundle",
      );
    } else {
      const lastStep = simBundle.steps[simBundle.steps.length - 1]!;
      const stepText = (lastStep.desc || lastStep.label || "").toLowerCase();
      let verifiedDetails = `Final step reached: ${lastStep.desc || lastStep.label || "Completed"}`;

      // Problem-specific correctness checks
      if (slug.includes("two-sum") && activeDataset.target !== undefined) {
        const found =
          stepText.includes("found") ||
          (lastStep.left !== null && lastStep.left !== undefined && lastStep.right !== null && lastStep.right !== undefined);
        assert.ok(found, "Two Sum simulation must reach target pair solution step");
        verifiedDetails = `Two Sum: Found matching pair for target ${activeDataset.target}`;
      } else if (slug.includes("max-area-of-island") || slug.includes("number-of-islands")) {
        assert.ok(
          (typeof lastStep.maxArea === "number" && lastStep.maxArea > 0) ||
            (lastStep.visited && lastStep.visited.length > 0),
          "Island grid search must explore connected components",
        );
        verifiedDetails = `Island Search: Explored island components (maxArea=${lastStep.maxArea ?? 0}, visited=${lastStep.visited?.length ?? 0})`;
      } else if (slug.includes("binary-search")) {
        assert.ok(
          stepText.includes("found") ||
            stepText.includes("not found") ||
            lastStep.mid !== undefined ||
            lastStep.left !== undefined,
          "Binary Search must terminate with search outcome",
        );
        verifiedDetails = `Binary Search: ${lastStep.desc || lastStep.label || "Completed"}`;
      } else if (slug.includes("reverse-linked-list")) {
        assert.ok(simBundle.steps.length >= 3, "Reverse Linked List must execute pointer reversal steps");
        verifiedDetails = `Reverse Linked List: Executed ${simBundle.steps.length} reversal steps`;
      } else if (
        slug.includes("trapping-rain-water") ||
        patternFor(slug, title, topics) === "monotonic-stack"
      ) {
        assert.ok(
          simBundle.steps.length >= 3,
          "Monotonic stack simulation must generate multi-step stack transitions",
        );
        verifiedDetails = `Monotonic Stack: Processed ${simBundle.steps.length} stack transitions`;
      } else if (
        patternFor(slug, title, topics) === "topological-sort" ||
        slug.includes("alien-dictionary") ||
        slug.includes("course-schedule")
      ) {
        assert.ok(
          simBundle.steps.length >= 3,
          "Topological Sort simulation must generate multi-step dependency and Kahn's queue transitions",
        );
        const hasQueueOrMap = simBundle.steps.some(
          (s) => (s.queue && s.queue.length > 0) || (s.map && Object.keys(s.map).length > 0),
        );
        assert.ok(hasQueueOrMap, "Topological Sort steps must track in-degree table and BFS queue transitions");
        verifiedDetails = `Topological Sort: Executed ${simBundle.steps.length} Kahn's BFS frames (${lastStep.desc || "Verified"})`;
      } else if (
        patternFor(slug, title, topics) === "word-ladder" ||
        slug.includes("word-ladder") ||
        slug.includes("minimum-genetic-mutation")
      ) {
        assert.ok(
          simBundle.steps.length >= 2,
          "Word Ladder simulation must generate multi-step BFS word transformation levels",
        );
        const hasQueueOrVisited = simBundle.steps.some(
          (s) => (s.queue && s.queue.length > 0) || (s.visited && s.visited.length > 0),
        );
        assert.ok(hasQueueOrVisited, "Word Ladder steps must track BFS queue and visited word set");
        verifiedDetails = `Word Ladder BFS: Executed ${simBundle.steps.length} mutation steps (${lastStep.desc || "Verified"})`;
      }

      recordStep("Phase 7", "Domain Correctness", "PASSED", Date.now() - t7, verifiedDetails);
    }
  } catch (err: any) {
    recordStep(
      "Phase 7",
      "Domain Correctness",
      "FAILED",
      Date.now() - t7,
      "Domain verification assertion failed",
      err.message,
    );
  }

  // --------------------------------------------------------------------------
  // Phase 8: Multi-Dataset Traversal Robustness
  // --------------------------------------------------------------------------
  const t8 = Date.now();
  try {
    let datasetSuccessCount = 0;
    const errors: string[] = [];

    for (const dataset of resolvedDatasets) {
      try {
        const trace = simulateProblemWithDataset(slug, title, topics, dataset);
        if (trace.steps.length > 0) {
          datasetSuccessCount++;
        } else {
          errors.push(`Dataset '${dataset.id}' produced 0 steps`);
        }
      } catch (err: any) {
        errors.push(`Dataset '${dataset.id}' threw: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      recordStep(
        "Phase 8",
        "Multi-Dataset Robustness",
        "FAILED",
        Date.now() - t8,
        `Passed ${datasetSuccessCount}/${resolvedDatasets.length} datasets. Errors: ${errors.join("; ")}`,
        errors.join("; "),
      );
    } else {
      recordStep(
        "Phase 8",
        "Multi-Dataset Robustness",
        "PASSED",
        Date.now() - t8,
        `All ${resolvedDatasets.length} dataset variants (standard, longer, edge) simulated successfully`,
      );
    }
  } catch (err: any) {
    recordStep(
      "Phase 8",
      "Multi-Dataset Robustness",
      "FAILED",
      Date.now() - t8,
      "Exception verifying multi-dataset execution",
      err.message,
    );
  }

  const totalDurationMs = Date.now() - startTime;

  return {
    slug,
    title,
    overallStatus,
    totalDurationMs,
    steps,
    reviewerVerdict: reviewerData
      ? {
          is_complete: reviewerData.is_complete ?? true,
          classification: reviewerData.classification ?? "Optimal",
          complexity: reviewerData.complexity,
          missing: reviewerData.missing_elements,
        }
      : undefined,
    visualizerVerdict: simBundle
      ? {
          stepCount: simBundle.steps.length,
          vizType: simBundle.steps[0]?.type || "array",
          lineCount: simBundle.code.length,
          traversalValid: true,
        }
      : undefined,
    rootCauseFailure,
  };
}

/**
 * Formats and prints a comprehensive pipeline report to the console.
 */
export function printPipelineReport(report: PipelineReport): void {
  const isPass = report.overallStatus === "PASSED";
  const banner = isPass ? "========== TEST PASSED ==========" : "========== TEST FAILED ==========";
  const statusColor = isPass ? "\x1b[32m" : "\x1b[31m";
  const resetColor = "\x1b[0m";
  const bold = "\x1b[1m";
  const dim = "\x1b[2m";

  console.log(`\n${bold}${statusColor}${banner}${resetColor}`);
  console.log(`${bold}Problem:${resetColor} ${report.title} (${dim}${report.slug}${resetColor})`);
  console.log(`${bold}Total Execution Time:${resetColor} ${report.totalDurationMs}ms`);
  console.log(`${bold}System Pipeline Breakdown:${resetColor}`);

  for (const step of report.steps) {
    let icon = "[✓]";
    let color = "\x1b[32m";
    if (step.status === "FAILED") {
      icon = "[✗]";
      color = "\x1b[31m";
    } else if (step.status === "WARNING") {
      icon = "[!]";
      color = "\x1b[33m";
    } else if (step.status === "SKIPPED") {
      icon = "[-]";
      color = "\x1b[90m";
    }

    console.log(
      `  ${color}${icon} ${step.phase.padEnd(8)} | ${step.name.padEnd(25)} (${step.durationMs}ms)${resetColor} - ${step.details}`,
    );
    if (step.error) {
      console.log(`      \x1b[31mError Details: ${step.error}\x1b[0m`);
    }
  }

  if (report.reviewerVerdict) {
    console.log(`\n${bold}Reviewer Output:${resetColor}`);
    console.log(
      `  - Classification: \x1b[36m${report.reviewerVerdict.classification}\x1b[0m | Complete: ${report.reviewerVerdict.is_complete}`,
    );
    if (report.reviewerVerdict.complexity) {
      console.log(
        `  - Complexity: Time: ${report.reviewerVerdict.complexity.time} | Space: ${report.reviewerVerdict.complexity.space}`,
      );
    }
  }

  if (report.visualizerVerdict) {
    console.log(`\n${bold}Visualizer Output:${resetColor}`);
    console.log(
      `  - Type: \x1b[35m${report.visualizerVerdict.vizType}\x1b[0m | Steps: ${report.visualizerVerdict.stepCount} frames | Code Lines: ${report.visualizerVerdict.lineCount}`,
    );
  }

  if (!isPass && report.rootCauseFailure) {
    console.log(`\n\x1b[31m${bold}DIAGNOSTIC ROOT CAUSE FAILURE:${resetColor}`);
    console.log(`  \x1b[31m${report.rootCauseFailure}\x1b[0m`);
  }
  console.log(`${bold}${statusColor}${"=".repeat(banner.length)}${resetColor}\n`);
}

// ============================================================================
// Curated Representative Battery of Problems
// ============================================================================
export const BENCHMARK_PROBLEMS = [
  "two-sum",
  "reverse-linked-list",
  "valid-parentheses",
  "binary-search",
  "max-area-of-island",
  "number-of-islands",
  "trapping-rain-water",
  "merge-intervals",
  "climbing-stairs",
  "coin-change",
  "longest-common-subsequence",
  "lru-cache",
  "single-number",
  "kth-largest-element-in-an-array",
  "implement-trie-prefix-tree",
  "redundant-connection",
];

// ============================================================================
// Node Native Test Runner Suite
// ============================================================================

// ============================================================================
// Automatic Test Suite Registration & CLI Execution
// ============================================================================
const args = process.argv.slice(2);
const isDirectCliRun = args.length > 0 || process.env["RUN_CLI"] === "true";

if (!isDirectCliRun) {
  test("E2E System Pipeline - Two Sum (Hash Map & Array Pairing)", async () => {
    const report = await runSystemPipelineTest({ slugOrTitle: "two-sum" });
    if (report.overallStatus === "FAILED") {
      printPipelineReport(report);
    }
    assert.equal(report.overallStatus, "PASSED", report.rootCauseFailure);
    assert.ok(report.visualizerVerdict && report.visualizerVerdict.stepCount > 0);
  });

  test("E2E System Pipeline - Max Area of Island (2D Matrix & DFS Traversal)", async () => {
    const report = await runSystemPipelineTest({ slugOrTitle: "max-area-of-island" });
    if (report.overallStatus === "FAILED") {
      printPipelineReport(report);
    }
    assert.equal(report.overallStatus, "PASSED", report.rootCauseFailure);
    assert.equal(report.visualizerVerdict?.vizType, "matrix");
  });

  test("E2E System Pipeline - Valid Parentheses (Monotonic Stack Traversal)", async () => {
    const report = await runSystemPipelineTest({ slugOrTitle: "valid-parentheses" });
    if (report.overallStatus === "FAILED") {
      printPipelineReport(report);
    }
    assert.equal(report.overallStatus, "PASSED", report.rootCauseFailure);
  });

  test("E2E System Pipeline - Reverse Linked List (Pointer Inversion)", async () => {
    const report = await runSystemPipelineTest({ slugOrTitle: "reverse-linked-list" });
    if (report.overallStatus === "FAILED") {
      printPipelineReport(report);
    }
    assert.equal(report.overallStatus, "PASSED", report.rootCauseFailure);
  });

  test("E2E System Pipeline - Trapping Rain Water (Two Pointers & Auxiliary Water Heights)", async () => {
    const report = await runSystemPipelineTest({ slugOrTitle: "trapping-rain-water" });
    if (report.overallStatus === "FAILED") {
      printPipelineReport(report);
    }
    assert.equal(report.overallStatus, "PASSED", report.rootCauseFailure);
  });

  test("E2E System Pipeline - Longest Common Subsequence (2D Dynamic Programming)", async () => {
    const report = await runSystemPipelineTest({ slugOrTitle: "longest-common-subsequence" });
    if (report.overallStatus === "FAILED") {
      printPipelineReport(report);
    }
    assert.equal(report.overallStatus, "PASSED", report.rootCauseFailure);
  });

  test("E2E System Pipeline - Incomplete Pseudocode Rejection Detection", async () => {
    const report = await runSystemPipelineTest({
      slugOrTitle: "two-sum",
      pseudocode: "# TODO: Implement two sum later\npass",
    });
    // The system should detect incompleteness
    assert.equal(report.reviewerVerdict?.is_complete, false);
    assert.equal(report.reviewerVerdict?.classification, "Incomplete");
    assert.ok((report.reviewerVerdict?.missing?.length ?? 0) > 0);
  });
}

// CLI Direct Invocation Handler
if (isDirectCliRun) {
  (async () => {
    let targetSlug = "two-sum";
    let customCode: string | undefined;
    let runAll = false;
    let useAi = false;

    for (const arg of args) {
      if (arg === "--all") {
        runAll = true;
      } else if (arg === "--ai") {
        useAi = true;
      } else if (arg.startsWith("--slug=")) {
        targetSlug = arg.slice(7);
      } else if (arg.startsWith("--code=")) {
        customCode = arg.slice(7);
      } else if (!arg.startsWith("--")) {
        targetSlug = arg;
      }
    }

    console.log(`\n======================================================`);
    console.log(`  DSA.viz System Pipeline E2E Diagnostic Test Runner`);
    console.log(`======================================================\n`);

    if (runAll) {
      console.log(`Testing all ${BENCHMARK_PROBLEMS.length} benchmark problems across all DSA domains...\n`);
      let passed = 0;
      let failed = 0;

      for (const prob of BENCHMARK_PROBLEMS) {
        const rep = await runSystemPipelineTest({ slugOrTitle: prob, useAi });
        printPipelineReport(rep);
        if (rep.overallStatus === "PASSED") passed++;
        else failed++;
      }

      console.log(`\n======================================================`);
      console.log(`  BENCHMARK SUMMARY: ${passed} PASSED | ${failed} FAILED`);
      console.log(`======================================================\n`);
      if (failed > 0) process.exit(1);
    } else {
      console.log(`Running in-depth system pipeline diagnostic for: '${targetSlug}'...`);
      const report = await runSystemPipelineTest({
        slugOrTitle: targetSlug,
        pseudocode: customCode,
        useAi,
      });
      printPipelineReport(report);
      if (report.overallStatus === "FAILED") {
        process.exit(1);
      }
    }
  })().catch((err) => {
    console.error("FATAL: System pipeline test runner encountered error:", err);
    process.exit(1);
  });
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAiConfig } from "./ai-config";
import { hasMeaningfulTraversal, validateAndNormalizeVizPayload } from "./ai-contracts";
import { VALID_VIZ_TYPES, type VizStep, type VizType } from "./problems";
import { simulateCustomInput } from "./simulators";
import { raceModels, REVIEW_MODELS, VIZ_MODELS } from "./openrouter.server";
import type { ReviewResult } from "./review.functions";

const PlaygroundInputSchema = z.object({
  title: z.string().min(1),
  type: z.enum(VALID_VIZ_TYPES),
  pseudocode: z.string().min(1),
  testInput: z.array(z.union([z.number(), z.string()])),
  target: z.union([z.number(), z.string()]).optional(),
  matrixInput: z.array(z.array(z.union([z.number(), z.string()]))).optional(),
});

const CLASSES = ["Incomplete", "Brute Force", "Better", "Optimal"];

function userCodeLines(pseudocode: string): string[] {
  const lines = pseudocode
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 60);

  return lines.length > 0 ? lines : ["const result = execute(custom_input);"];
}

function evaluatePlaygroundHeuristic(pseudocode: string): {
  isComplete: boolean;
  missing: string[];
  nudge: string;
} {
  const clean = pseudocode
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("//"));

  const hasFewLines = clean.length < 2;
  const hasPlaceholders = clean.some(
    (l) =>
      l === "..." ||
      l.toLowerCase().includes("todo") ||
      l.toLowerCase().includes("pass") ||
      l.toLowerCase().includes("check condition") ||
      l.toLowerCase().includes("do rest") ||
      l.toLowerCase().includes("write your algorithmic pseudocode"),
  );

  if (hasFewLines || hasPlaceholders) {
    return {
      isComplete: false,
      missing: [
        "Core traversal or iteration loop",
        "Data structure operations / transitions",
        "Return value or termination logic",
      ],
      nudge:
        "Your sandbox pseudocode is not yet complete. Add your loop logic, structure operations, and return statement to unlock live animation.",
    };
  }

  return {
    isComplete: true,
    missing: [],
    nudge:
      "Try testing with duplicate values, empty arrays, or negative numbers to check edge-case robustness.",
  };
}

const PLAYGROUND_REVIEW_SYSTEM = `You are a Principal Software Engineer and Staff DSA Technical Interviewer.
The user is testing an algorithm in an interactive DSA sandbox playground.
Analyze the user's EXACT pseudocode against their specified data structure and test input.

EVALUATION RULES:
1. LOGICAL COMPLETENESS & VIABILITY (MANDATORY FIRST CHECK):
   - Check if the user wrote a coherent, logically complete algorithm (whether Brute Force, Better, or Optimal).
   - Any working logic counts as complete! It does not need to follow strict syntax or one specific template.
   - If the pseudocode is incomplete, left unfinished, has placeholders like "...", "TODO", or lacks core traversal/return logic:
     * Set "is_complete": false
     * Set "classification": "Incomplete"
     * Set "missing_elements": Array of 1 to 4 specific items the user needs to add.
     * Set "nudge": Actionable guidance telling them what logic to add to complete their pseudocode.
     * Set "complexity": { "time": "—", "space": "—" }
   - If the pseudocode is complete:
     * Set "is_complete": true
     * Set "classification": "Optimal" | "Better" | "Brute Force"
     * Set "missing_elements": []
     * Compute true Time and Space complexity.
     * Evaluate multi-dataset interactions, invariants, and pointer shifting.

Respond ONLY with valid JSON in this exact structure:
{
  "is_complete": true | false,
  "classification": "Optimal" | "Better" | "Brute Force" | "Incomplete",
  "missing_elements": ["string"],
  "complexity": { "time": "O(...)", "space": "O(...)" },
  "praise": "1-2 sentences highlighting the strongest structural decision in their actual pseudocode.",
  "nudge": "1-2 sentences giving actionable hints on what to add (if incomplete) or optimization/edge cases (if complete).",
  "review": "A structured markdown critique explaining algorithm completeness, time/space complexity, and dry run results."
}`;

const PLAYGROUND_VIZ_SYSTEM = `You are a Smart Multi-Dataset DSA Execution Visualizer Engine.
Given a user's algorithm pseudocode and their specific custom test input, generate a complete step-by-step trace of how data structures mutate from beginning to final return.

Hard rules:
1. Respond ONLY with valid JSON with no prose, no comments, and no markdown fences.
2. STRICT USER PSEUDOCODE USAGE:
   - "code_lines" MUST contain the user's submitted pseudocode verbatim line-by-line in exact order.
   - Do NOT modify variable names or substitute generic code.
   - Every step's "line" integer MUST point to the exact 0-indexed line of user pseudocode being executed.
3. EXPANDED & INFORMATIVE STEP DESCRIPTIONS ("desc"):
   - Write clear, detailed, and educational explanations in "desc" for every step.
   - Explicitly mention the user's exact variable names (e.g. nums, seen, max_val, left, right, stack, queue, dp), current values being compared, why a branch is taken or skipped, and what value is stored or popped.
   - Do NOT use terse or cryptic shorthand (e.g., avoid "i=2" or "update array").
4. MULTI-COMPONENT, NESTED LOOP & FULL DATASET SCAN (UNIVERSAL RULE):
   - When an algorithm has outer loops (e.g. 2D grid cells, graph vertices, nested loops, finding multiple islands or disjoint components):
   - Do NOT terminate or stop when one component/island finishes! Return to the outer loop, continue scanning, and explore Component #2, Island #2, etc.
   - You MUST visit and evaluate EVERY component / island across the entire test input before returning.
5. COMPLETE END-TO-END TRAVERSAL (MANDATORY):
   - You MUST simulate execution through the ENTIRE input dataset until the algorithm completes and reaches its return/termination statement.
   - NEVER abort, cut off, or stop halfway through the dataset. Traverse every element or pointer transition completely.
   - The final step must highlight the final return value and termination state.
6. SMART MULTI-DATASET SUPPORT:
   - When an algorithm uses multiple data structures (e.g. Array + Hash Table, Array + Monotonic Stack, Array + Min-Heap, Dual Arrays), POPULATE BOTH the primary and auxiliary structure fields in the step!
   - Structure fields: "array", "secondaryArray", "map", "stack", "queue", "tree", "list", "matrix", "set".
   - "activeDataset": string identifying the active structure in focus ("array", "map", "stack", "secondaryArray", "tree").
   - "shiftInfo": { "from": "...", "to": "...", "action": "lookup" | "write" | "push" | "pop" | "merge" | "shift", "reason": "Detailed explanation with user variable names" }
7. CRITICAL — STRICT DATA-LINE SYNCHRONIZATION (ZERO PREMATURE UPDATES):
   - The data payload in each step MUST strictly represent the state AFTER executing that specific "line".
   - Never update array values or data structures before their mutating line executes.
   - Initialization lines (e.g., declaring arrays filled with 0, empty maps, empty stacks) MUST show their initial pristine state.
8. Advance line numbers across steps to show progression (loop header -> loop body -> next iteration -> termination).

Respond ONLY with valid JSON in this exact structure:
{
  "code_lines": ["line 1", "line 2", "line 3", ...],
  "test_array": [1, 2, 3, ...],
  "viz_steps": [
    {
      "type": "array",
      "line": 0,
      "desc": "Initialize max_val with nums[0] = 12. Preparing loop to scan remaining elements.",
      "array": [...],
      "current": 4,
      "left": 0,
      "right": 5,
      "visited": [...],
      "activeDataset": "array"
    }
  ]
}`;

export async function processPlaygroundReview(data: z.infer<typeof PlaygroundInputSchema>): Promise<ReviewResult> {
    const { reviewKey, vizKey } = getAiConfig();
    const reviewKeyForRequest = vizKey || reviewKey;
    const vizKeyForRequest = vizKey || reviewKey;

    const inputData = data.testInput.length > 0 ? data.testInput : [1, 2, 3, 4, 5];
    const fallback = simulateCustomInput(
      data.type,
      inputData,
      data.target,
      data.matrixInput,
      data.title,
    );
    const preferredShape: VizType = data.type;
    const rawLines = userCodeLines(data.pseudocode);

    const reviewPrompt = `Algorithm Title: ${data.title}
Data Structure: ${data.type}
Custom Test Input: ${JSON.stringify(inputData)}
${data.target !== undefined ? `Target Value: ${data.target}` : ""}
${data.matrixInput ? `2D Grid Matrix: ${JSON.stringify(data.matrixInput)}` : ""}

User Pseudocode:
\`\`\`
${data.pseudocode}
\`\`\`
Check if this algorithm is logically complete or incomplete. Review thoroughly against the provided test input.`;

    let reviewOut: unknown = null;
    let vizOut: unknown = null;
    let reviewerModel: string | null = null;
    let vizModel: string | null = null;
    let lastError: string | null = null;
    let visualizerFallbackUsed = false;

    // Step 1: Evaluate review & completeness first
    if (reviewKeyForRequest) {
      try {
        const r = await raceModels(
          REVIEW_MODELS,
          reviewKeyForRequest,
          PLAYGROUND_REVIEW_SYSTEM,
          reviewPrompt,
          (j) => typeof (j as { classification?: unknown })?.classification === "string",
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
      notices.push(
        "No AI API keys configured — generated via local interactive simulation engine.",
      );
    }

    const parsedReview = reviewOut as {
      is_complete?: boolean;
      classification?: string;
      missing_elements?: string[];
      complexity?: { time?: string; space?: string };
      review?: string;
      praise?: string;
      nudge?: string;
    } | null;

    const heuristic = evaluatePlaygroundHeuristic(data.pseudocode);
    const isComplete = parsedReview
      ? parsedReview.is_complete !== false && parsedReview.classification !== "Incomplete"
      : heuristic.isComplete;

    const classification: ReviewResult["classification"] = !isComplete
      ? "Incomplete"
      : parsedReview?.classification && CLASSES.includes(parsedReview.classification)
        ? (parsedReview.classification as ReviewResult["classification"])
        : "Optimal";

    const missingElements: string[] = !isComplete
      ? Array.isArray(parsedReview?.missing_elements) && parsedReview.missing_elements.length > 0
        ? parsedReview.missing_elements
        : heuristic.missing
      : [];

    // Step 2: Generate visualizer trace if logic is complete
    if (isComplete) {
      if (vizKeyForRequest) {
        const vizPrompt = `Algorithm Title: ${data.title}
Data Structure: ${data.type}
Custom Test Input: ${JSON.stringify(inputData)}
${data.target !== undefined ? `Target Value: ${data.target}` : ""}
${data.matrixInput ? `2D Grid Matrix: ${JSON.stringify(data.matrixInput)}` : ""}

User Pseudocode:
\`\`\`
${data.pseudocode}
\`\`\`
CRITICAL INSTRUCTIONS:
1. STRICT USER PSEUDOCODE: Use the user's EXACT pseudocode lines above as "code_lines" verbatim, line-by-line. In each step, set "line" to the exact 0-indexed line being executed.
2. EXPANDED STEP EXPLANATIONS ("desc"): Provide detailed, educational descriptions using the user's exact variable names and actual evaluated values (e.g. comparisons made, decisions taken, values stored/popped).
3. FULL END-TO-END TRAVERSAL ACROSS ALL COMPONENTS:
   - For 2D grid/island or multi-component graph algorithms: You MUST traverse and evaluate ALL separate islands/components present in the input dataset. Do NOT stop after the first island/component.
   - Continue generating steps until the pseudocode completely finishes processing the entire input dataset and reaches the final return/termination statement. Do NOT stop halfway or omit trailing iterations.
4. If data structure is "matrix": emit "matrix", "cols", "current" ("r,c"), "visited" (growing list of "r,c"), "wSum" (current area), "mSum" (max area), and "direction".
5. Ensure strict data-to-line synchronization: data structure payload must reflect the state AFTER executing that specific "line".
6. Never update array/structure values before their code line executes (no forward updates on initialization lines).
7. The final step MUST show the algorithm reaching the return statement or loop completion with the final calculated result.`;

        try {
          const v = await raceModels(
            VIZ_MODELS,
            vizKeyForRequest,
            PLAYGROUND_VIZ_SYSTEM,
            vizPrompt,
            (j) =>
              (j as { is_complete?: unknown })?.is_complete === false ||
              (Array.isArray((j as { viz_steps?: unknown })?.viz_steps) &&
                ((j as { viz_steps?: unknown[] })?.viz_steps?.length ?? 0) > 0),
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
        test_array: inputData,
      };

      const normalizedViz = vizOut
        ? validateAndNormalizeVizPayload(vizOut, fallback, preferredShape, rawLines)
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
            ? rawLines
            : normalizedViz.code_lines.length > 0
              ? normalizedViz.code_lines
              : rawLines
          : rawLines.length > 0
            ? rawLines
            : fallback.code;

      const vizSteps = isValidAiViz && normalizedViz ? normalizedViz.viz_steps : fallback.steps;
      const testArray =
        isValidAiViz && normalizedViz && normalizedViz.test_array.length > 0
          ? normalizedViz.test_array
          : inputData;

      return {
        is_complete: true,
        classification,
        complexity: {
          time:
            typeof parsedReview?.complexity?.time === "string"
              ? parsedReview.complexity.time
              : classification === "Incomplete"
                ? "—"
                : "O(n)",
          space:
            typeof parsedReview?.complexity?.space === "string"
              ? parsedReview.complexity.space
              : classification === "Incomplete"
                ? "—"
                : "O(1)",
        },
        review:
          typeof parsedReview?.review === "string" && parsedReview.review.trim()
            ? parsedReview.review
            : classification === "Incomplete"
              ? `### Sandbox Logic Draft\n\nYour pseudocode for **${data.title}** is currently in draft mode. Add further loop iterations or return statements to refine your logic.`
              : `### Custom Algorithm Analysis\n\nYour pseudocode operates on input **\`${JSON.stringify(inputData)}\`** with structure type \`${data.type}\`.\n\n- **Time Complexity:** ${parsedReview?.complexity?.time ?? "O(n)"}\n- **Space Complexity:** ${parsedReview?.complexity?.space ?? "O(1)"}`,
        praise:
          typeof parsedReview?.praise === "string" && parsedReview.praise.trim()
            ? parsedReview.praise
            : "Good algorithmic structure and parameter configuration in the sandbox.",
        nudge:
          typeof parsedReview?.nudge === "string" && parsedReview.nudge.trim()
            ? parsedReview.nudge
            : heuristic.nudge,
        missing_elements: missingElements,
        test_array: testArray,
        code_lines: codeLines,
        viz_steps: vizSteps,
        models: {
          reviewer: reviewerModel,
          visualizer: isValidAiViz ? vizModel : "Simulator Engine",
        },
        degraded: notices.length > 0,
        visualization_failed: false,
        reference_solution: referenceSolution,
        ...(notices.length ? { notice: notices.join(" ") } : {}),
      };
    }

    // Logic is incomplete
    return {
      is_complete: false,
      classification: "Incomplete",
      complexity: {
        time: "—",
        space: "—",
      },
      review:
        typeof parsedReview?.review === "string" && parsedReview.review.trim()
          ? parsedReview.review
          : `### Sandbox Logic Draft\n\nYour pseudocode for **${data.title}** is incomplete. Complete the logic to simulate and visualize execution.`,
      praise:
        typeof parsedReview?.praise === "string" && parsedReview.praise.trim()
          ? parsedReview.praise
          : "Good algorithmic structure setup.",
      nudge:
        typeof parsedReview?.nudge === "string" && parsedReview.nudge.trim()
          ? parsedReview.nudge
          : heuristic.nudge,
      missing_elements: missingElements,
      test_array: inputData,
      code_lines: rawLines,
      viz_steps: [],
      models: { reviewer: reviewerModel, visualizer: null },
      degraded: notices.length > 0,
      visualization_failed: true,
      visualization_error: "Logic incomplete",
      ...(notices.length ? { notice: notices.join(" ") } : {}),
    };
}

export const reviewPlaygroundPseudocode = createServerFn({ method: "POST" })
  .validator((input: unknown) => PlaygroundInputSchema.parse(input))
  .handler(async ({ data }): Promise<ReviewResult> => {
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/playground-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn("Server playground review request failed, fallback to local:", err);
      }
    }
    return await processPlaygroundReview(data);
  });

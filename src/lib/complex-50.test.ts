import test from "node:test";
import assert from "node:assert/strict";
import { problemBySlug, getCanonicalMultiDatasets, VALID_VIZ_TYPES } from "./problems";
import { classifyProblem } from "./problemClassifier";
import { simulateProblemWithDataset } from "./simulators";
import { validateAndNormalizeVizPayload } from "./ai-contracts";

const COMPLEX_50_PROBLEMS = [
  // 1. 2D Dynamic Programming
  "longest-common-subsequence",
  "unique-paths",
  "minimum-path-sum",
  "maximal-square",
  "edit-distance",

  // 2. 1D Dynamic Programming & Knapsack
  "coin-change",
  "longest-increasing-subsequence",
  "house-robber",
  "maximum-subarray",
  "tallest-billboard",

  // 3. Graph Traversal & BFS/DFS
  "number-of-islands",
  "max-area-of-island",
  "course-schedule",
  "word-ladder",
  "pacific-atlantic-water-flow",

  // 4. Disjoint Set Union (DSU / Union-Find)
  "redundant-connection",
  "number-of-provinces",
  "accounts-merge",
  "satisfiability-of-equality-equations",

  // 5. Complex Linked Lists & Design
  "lru-cache",
  "lfu-cache",
  "reverse-linked-list",
  "linked-list-cycle",
  "reorder-list",

  // 6. Binary Trees & BSTs
  "binary-tree-level-order-traversal",
  "binary-tree-preorder-traversal",
  "validate-binary-search-tree",
  "lowest-common-ancestor-of-a-binary-search-tree",
  "kth-smallest-element-in-a-bst",

  // 7. Heaps & Priority Queues
  "kth-largest-element-in-an-array",
  "find-median-from-data-stream",
  "top-k-frequent-elements",
  "last-stone-weight",

  // 8. Monotonic Stack & Expressions
  "valid-parentheses",
  "daily-temperatures",
  "evaluate-reverse-polish-notation",
  "min-stack",

  // 9. Trie & Prefix Trees
  "implement-trie-prefix-tree",
  "design-add-and-search-words-data-structure",
  "word-search-ii",

  // 10. Dual Pointers & Sliding Window
  "two-sum",
  "3sum",
  "container-with-most-water",
  "trapping-rain-water",

  // 11. Intervals & Greedy
  "merge-intervals",
  "insert-interval",
  "jump-game",

  // 12. Bit Manipulation & Prefix Sums
  "single-number",
  "number-of-1-bits",
  "subarray-sums-divisible-by-k",
] as const;

test(`Verify and execute 50 complex questions across all data structures`, async (t) => {
  assert.equal(COMPLEX_50_PROBLEMS.length, 50, "Must contain exactly 50 complex questions");

  for (let idx = 0; idx < COMPLEX_50_PROBLEMS.length; idx++) {
    const slug = COMPLEX_50_PROBLEMS[idx]!;
    
    await t.test(`[${idx + 1}/50] Problem: ${slug}`, () => {
      // 1. Problem lookup & metadata integrity
      const prob = problemBySlug(slug);
      assert.ok(prob, `Problem ${slug} must resolve in problem registry`);
      assert.ok(prob.title, `Problem ${slug} must have a title`);
      assert.ok(Array.isArray(prob.topics), `Problem ${slug} must have topics array`);

      // 2. Problem Classifier signature
      const sig = classifyProblem(slug, prob.title, prob.topics);
      assert.ok(sig.category, `Classification category must be present for ${slug}`);
      assert.ok(sig.primaryVizType, `Primary visualizer type must be present for ${slug}`);
      assert.ok(sig.algorithmName, `Algorithm name must be present for ${slug}`);

      // 3. Multi-Dataset Generation (Standard, Longer, Edge)
      const datasets = getCanonicalMultiDatasets(slug, prob.title, prob.topics);
      assert.ok(Array.isArray(datasets) && datasets.length >= 3, `Must generate 3 multi-datasets for ${slug}`);

      const [d1, d2, d3] = datasets;
      assert.ok(d1 && d2 && d3, `All 3 datasets must exist for ${slug}`);
      assert.equal(d1.category, "standard");
      assert.equal(d2.category, "longer");
      assert.equal(d3.category, "edge");

      // 4. Deterministic Simulation Execution for Standard Dataset
      const sim1 = simulateProblemWithDataset(slug, prob.title, prob.topics, d1);
      assert.ok(sim1.steps.length >= 1, `Simulation must produce steps for ${slug}`);
      assert.ok(sim1.code.length >= 1, `Simulation must produce code lines for ${slug}`);

      // Check step structures are intact
      for (let sIdx = 0; sIdx < sim1.steps.length; sIdx++) {
        const step = sim1.steps[sIdx]!;
        assert.ok(step.type, `Step ${sIdx} in ${slug} must specify visualizer type`);
        assert.ok(typeof step.line === "number", `Step ${sIdx} in ${slug} must specify line index`);
        assert.ok(typeof step.desc === "string" && step.desc.trim().length > 0, `Step ${sIdx} in ${slug} must have description`);
      }

      // Check final step answers
      const finalStep = sim1.steps[sim1.steps.length - 1]!;
      assert.ok(
        finalStep.current !== undefined ||
          finalStep.mSum !== undefined ||
          finalStep.wSum !== undefined ||
          finalStep.desc.length > 0,
        `Final step of ${slug} must provide result value or summary`,
      );

      // 5. Deterministic Simulation Execution for Edge Dataset
      const sim3 = simulateProblemWithDataset(slug, prob.title, prob.topics, d3);
      assert.ok(sim3.steps.length >= 1, `Edge dataset must produce valid steps for ${slug}`);

      // 6. Contract Normalizer & Reversion Safety Check
      const mockAiPayload = {
        is_complete: true,
        code_lines: sim1.code,
        viz_steps: [
          {
            type: sig.primaryVizType,
            line: 0,
            desc: `Starting execution for ${slug}`,
            array: sim1.array,
            current: sim1.steps[0]?.current ?? null,
            matrix: sim1.steps[0]?.matrix,
            tree: sim1.steps[0]?.tree,
            stack: sim1.steps[0]?.stack,
            queue: sim1.steps[0]?.queue,
            map: sim1.steps[0]?.map,
            list: sim1.steps[0]?.list,
          },
          {
            type: sig.primaryVizType,
            line: Math.max(0, sim1.code.length - 1),
            desc: `Final step execution for ${slug}`,
            array: sim1.array,
            current: finalStep.current,
            mSum: finalStep.mSum,
            wSum: finalStep.wSum,
            matrix: finalStep.matrix,
            tree: finalStep.tree,
            stack: finalStep.stack,
            queue: finalStep.queue,
            map: finalStep.map,
            list: finalStep.list,
          },
        ],
      };

      const normalized = validateAndNormalizeVizPayload(mockAiPayload, sim1, sig.primaryVizType, sim1.code);
      assert.ok(normalized.viz_steps.length >= 2, `Contract normalizer must accept and normalize steps for ${slug}`);
      assert.ok(
        (VALID_VIZ_TYPES as readonly string[]).includes(normalized.viz_steps[0]?.type ?? ""),
        `Normalized visualizer type must be a valid system visualizer type for ${slug}`,
      );
    });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { problemBySlug, getCanonicalMultiDatasets } from "./problems";
import { classifyProblem } from "./problemClassifier";
import { simulateProblemWithDataset } from "./simulators";
import { validateAndNormalizeVizPayload } from "./ai-contracts";

const COMPLEX_100_PROBLEMS = [
  // 1. Advanced Dynamic Programming (10)
  "interleaving-string",
  "distinct-subsequences",
  "triangle",
  "maximum-product-subarray",
  "combination-sum-iv",
  "burst-balloons",
  "regular-expression-matching",
  "wildcard-matching",
  "palindromic-substrings",
  "longest-palindromic-substring",

  // 2. Binary Trees & BSTs (10)
  "same-tree",
  "symmetric-tree",
  "maximum-depth-of-binary-tree",
  "minimum-depth-of-binary-tree",
  "balanced-binary-tree",
  "path-sum",
  "path-sum-ii",
  "binary-tree-paths",
  "sum-root-to-leaf-numbers",
  "count-good-nodes-in-binary-tree",

  // 3. Binary Tree Advanced & Ancestors (8)
  "lowest-common-ancestor-of-a-binary-tree",
  "populating-next-right-pointers-in-each-node",
  "flatten-binary-tree-to-linked-list",
  "construct-binary-tree-from-inorder-and-postorder-traversal",
  "house-robber-iii",
  "convert-sorted-array-to-binary-search-tree",
  "kth-largest-element-in-a-stream",
  "delete-node-in-a-bst",

  // 4. Graphs & Shortest Paths & DSU (10)
  "all-paths-from-source-to-target",
  "minimum-height-trees",
  "as-far-from-land-as-possible",
  "find-the-town-judge",
  "keys-and-rooms",
  "reorder-routes-to-make-all-paths-lead-to-the-city-zero",
  "snakes-and-ladders",
  "open-the-lock",
  "find-eventual-safe-states",
  "evaluate-division",

  // 5. Backtracking & Search (8)
  "subsets",
  "subsets-ii",
  "permutations",
  "permutations-ii",
  "combination-sum",
  "combination-sum-ii",
  "combination-sum-iii",
  "letter-combinations-of-a-phone-number",

  // 6. Advanced Backtracking & Grids (6)
  "n-queens",
  "sudoku-solver",
  "word-search",
  "restore-ip-addresses",
  "palindrome-partitioning",
  "combinations",

  // 7. Two Pointers & Binary Search (10)
  "binary-search",
  "search-in-rotated-sorted-array",
  "find-minimum-in-rotated-sorted-array",
  "search-a-2d-matrix",
  "search-a-2d-matrix-ii",
  "find-peak-element",
  "koko-eating-bananas",
  "capacity-to-ship-packages-within-d-days",
  "squares-of-a-sorted-array",
  "sort-colors",

  // 8. Advanced Sliding Window & Monotonic Stack (10)
  "fruit-into-baskets",
  "max-consecutive-ones-iii",
  "minimum-size-subarray-sum",
  "online-stock-span",
  "132-pattern",
  "sum-of-subarray-minimums",
  "remove-duplicate-letters",
  "remove-k-digits",
  "simplify-path",
  "basic-calculator-ii",

  // 9. Linked Lists Advanced (8)
  "add-two-numbers",
  "add-two-numbers-ii",
  "swap-nodes-in-pairs",
  "rotate-list",
  "partition-list",
  "remove-duplicates-from-sorted-list",
  "remove-duplicates-from-sorted-list-ii",
  "odd-even-linked-list",

  // 10. Tries & String Design (6)
  "replace-words",
  "longest-common-prefix",
  "group-anagrams",
  "valid-anagram",
  "valid-palindrome",
  "is-subsequence",

  // 11. Heaps, Intervals & Greedy (8)
  "meeting-rooms",
  "meeting-rooms-ii",
  "non-overlapping-intervals",
  "minimum-number-of-arrows-to-burst-balloons",
  "queue-reconstruction-by-height",
  "candy",
  "lemonade-change",
  "assign-cookies",

  // 12. Bit Manipulation & Math (6)
  "counting-bits",
  "reverse-bits",
  "missing-number",
  "sum-of-two-integers",
  "power-of-two",
  "find-the-duplicate-number",
] as const;

test(`Verify and execute Next 100 complex questions (101-200) across all data structures`, async (t) => {
  assert.equal(COMPLEX_100_PROBLEMS.length, 100, "Must contain exactly 100 complex questions");

  for (let idx = 0; idx < COMPLEX_100_PROBLEMS.length; idx++) {
    const slug = COMPLEX_100_PROBLEMS[idx]!;
    
    await t.test(`[${idx + 101}/200] Problem: ${slug}`, () => {
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
        ["array", "matrix", "tree", "bst", "heap", "trie", "graph", "linkedlist", "stack", "queue", "deque", "hashmap", "set", "dp", "bit"].includes(
          normalized.viz_steps[0]?.type ?? "",
        ),
        `Normalized visualizer type must be a valid system visualizer type for ${slug}`,
      );
    });
  }
});

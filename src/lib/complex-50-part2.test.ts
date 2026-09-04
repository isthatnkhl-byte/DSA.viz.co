import test from "node:test";
import assert from "node:assert/strict";
import { problemBySlug, getCanonicalMultiDatasets, VALID_VIZ_TYPES } from "./problems";
import { classifyProblem } from "./problemClassifier";
import { simulateProblemWithDataset } from "./simulators";
import { validateAndNormalizeVizPayload } from "./ai-contracts";

const COMPLEX_50_PART2_PROBLEMS = [
  // 1. Advanced 2D & 1D DP
  "dungeon-game",
  "target-sum",
  "partition-equal-subset-sum",
  "coin-change-ii",
  "word-break",
  "decode-ways",
  "house-robber-ii",
  "jump-game-ii",

  // 2. Advanced Graph & Shortest Paths & Grid Traversal
  "course-schedule-ii",
  "rotting-oranges",
  "clone-graph",
  "surrounded-regions",
  "shortest-path-in-binary-matrix",
  "cheapest-flights-within-k-stops",
  "is-graph-bipartite",
  "reconstruct-itinerary",

  // 3. Binary Trees & BST Complex Traversals
  "binary-tree-zigzag-level-order-traversal",
  "binary-tree-right-side-view",
  "binary-tree-maximum-path-sum",
  "serialize-and-deserialize-binary-tree",
  "construct-binary-tree-from-preorder-and-inorder-traversal",
  "diameter-of-binary-tree",
  "invert-binary-tree",

  // 4. Advanced Linked Lists & Pointers
  "merge-k-sorted-lists",
  "merge-two-sorted-lists",
  "remove-nth-node-from-end-of-list",
  "copy-list-with-random-pointer",
  "reverse-nodes-in-k-group",
  "palindrome-linked-list",

  // 5. Advanced Sliding Window & Two Pointers
  "minimum-window-substring",
  "longest-substring-without-repeating-characters",
  "longest-repeating-character-replacement",
  "sliding-window-maximum",
  "find-all-anagrams-in-a-string",
  "permutation-in-string",

  // 6. Advanced Monotonic Stack & Queues
  "largest-rectangle-in-histogram",
  "next-greater-element-i",
  "asteroid-collision",
  "generate-parentheses",
  "design-circular-queue",

  // 7. Priority Queues & Greedy Scheduling
  "task-scheduler",
  "k-closest-points-to-origin",
  "reorganize-string",
  "gas-station",
  "partition-labels",

  // 8. Advanced Matrix Manipulations & Prefix Sums
  "spiral-matrix",
  "rotate-image",
  "set-matrix-zeroes",
  "product-of-array-except-self",
  "continuous-subarray-sum",
] as const;

test(`Verify and execute Next 50 complex questions (51-100) across all data structures`, async (t) => {
  assert.equal(COMPLEX_50_PART2_PROBLEMS.length, 50, "Must contain exactly 50 complex questions");

  for (let idx = 0; idx < COMPLEX_50_PART2_PROBLEMS.length; idx++) {
    const slug = COMPLEX_50_PART2_PROBLEMS[idx]!;
    
    await t.test(`[${idx + 51}/100] Problem: ${slug}`, () => {
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

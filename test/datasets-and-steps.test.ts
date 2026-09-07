import test from "node:test";
import assert from "node:assert/strict";
import { DATASET_PLAN_SYSTEM_PROMPT, buildDatasetPlanUserPrompt } from "../src/lib/prompts/dataset-plan.prompt.ts";
import { VISUALIZER_SYSTEM_PROMPT, buildVisualizerUserPrompt } from "../src/lib/prompts/visualizer.prompt.ts";
import { validateAndNormalizeVizPayload } from "../src/lib/ai-contracts.ts";
import { getCanonicalMultiDatasets, type VizBundle } from "../src/lib/problems.ts";

test("Prompt Engineering - Dataset plan prompt enforces 3-dataset generation and execution plan", () => {
  assert.match(DATASET_PLAN_SYSTEM_PROMPT, /THREE COMPREHENSIVE TEST DATASETS/i);
  assert.match(DATASET_PLAN_SYSTEM_PROMPT, /Normal Dataset/i);
  assert.match(DATASET_PLAN_SYSTEM_PROMPT, /Longer Dataset/i);
  assert.match(DATASET_PLAN_SYSTEM_PROMPT, /Edge Case/i);
  assert.match(DATASET_PLAN_SYSTEM_PROMPT, /DATA STRUCTURE CATALOG/i);

  const userPrompt = buildDatasetPlanUserPrompt({
    title: "Two Sum",
    topics: ["Array", "Hash Table"],
    statement: "Given an array of integers nums and an integer target...",
    pseudocode: "for i in range(len(nums)): ...",
  });

  assert.match(userPrompt, /Generate 3 distinct datasets/i);
  assert.match(userPrompt, /dataset_1/i);
  assert.match(userPrompt, /dataset_2/i);
  assert.match(userPrompt, /dataset_3/i);
});

test("Prompt Engineering - Visualizer prompt mandates total_expected_steps and execution_plan", () => {
  assert.match(VISUALIZER_SYSTEM_PROMPT, /total_expected_steps/i);
  assert.match(VISUALIZER_SYSTEM_PROMPT, /execution_plan/i);
  assert.match(VISUALIZER_SYSTEM_PROMPT, /EXACT MARKER DICTIONARY/i);
  assert.match(VISUALIZER_SYSTEM_PROMPT, /viz_steps/i);

  const userPrompt = buildVisualizerUserPrompt({
    title: "Longest Substring Without Repeating Characters",
    statement: "Find length of longest substring...",
    pseudocode: "left = 0\nfor right in range(len(s)): ...",
    datasetLabel: "Dataset 2: Longer Dataset (Extended Traversal ⚡)",
    datasetDescription: "Extended string sequence",
  });

  assert.match(userPrompt, /total_expected_steps/i);
  assert.match(userPrompt, /execution_plan/i);
});

test("Contract Normalization - Allows large step traces up to 500 without 100-step truncation", () => {
  // Generate 180 synthetic steps
  const mockRawSteps = Array.from({ length: 180 }, (_, i) => ({
    line: i % 10,
    desc: `Step ${i}: Processing element with value ${i * 2}`,
    array: [1, 2, 3, 4, 5],
    current: i % 5,
    type: "array",
  }));

  const fallback: VizBundle = {
    code: ["line 0", "line 1"],
    array: [1, 2, 3, 4, 5],
    steps: [],
  };

  const normalized = validateAndNormalizeVizPayload(
    {
      code_lines: ["line 0", "line 1"],
      test_array: [1, 2, 3, 4, 5],
      viz_steps: mockRawSteps,
    },
    fallback
  );

  assert.equal(normalized.viz_steps.length, 180, "Expected all 180 steps to be preserved without 100-step capping");
});

test("Canonical Dataset Generation - Generates 3 foundational datasets for all problems", () => {
  const ds = getCanonicalMultiDatasets("two-sum", "Two Sum", ["Array", "Hash Table"]);
  assert.equal(ds.length, 3);
  assert.equal(ds[0].category, "standard");
  assert.equal(ds[1].category, "longer");
  assert.equal(ds[2].category, "edge");
});

test("Matrix & Island - Longer Dataset has expansive 8x10 archipelago with 20+ land cells", () => {
  const islandDatasets = getCanonicalMultiDatasets("max-area-of-island", "Max Area of Island", ["Array", "Matrix", "Depth-First Search"]);
  assert.equal(islandDatasets.length, 3);
  const d2 = islandDatasets[1];
  assert.equal(d2.category, "longer");
  assert.ok(d2.matrix, "Longer dataset must have a matrix defined");
  assert.ok(d2.matrix!.length >= 8, `Expected at least 8 rows, got ${d2.matrix!.length}`);
  assert.ok(d2.matrix![0].length >= 10, `Expected at least 10 columns, got ${d2.matrix![0].length}`);

  const landCells = d2.matrix!.flat().filter((x) => Number(x) === 1).length;
  assert.ok(landCells >= 20, `Expected at least 20 land cells, got ${landCells}`);
});

test("VisualizerTypes - parse2DCoord and coordKey seamlessly match varied coordinate formats", async () => {
  const { parse2DCoord, coordKey, extractScalarValue } = await import("../src/components/visualizer/VisualizerTypes.ts");

  // Tuple format
  assert.deepEqual(parse2DCoord([3, 4]), [3, 4]);
  assert.equal(coordKey([3, 4]), "3,4");

  // String formats
  assert.deepEqual(parse2DCoord("(3, 4)"), [3, 4]);
  assert.deepEqual(parse2DCoord("[3, 4]"), [3, 4]);
  assert.deepEqual(parse2DCoord("3, 4"), [3, 4]);
  assert.deepEqual(parse2DCoord("3,4"), [3, 4]);
  assert.deepEqual(parse2DCoord("r=3, c=4"), [3, 4]);
  assert.deepEqual(parse2DCoord("row=3, col=4"), [3, 4]);
  assert.deepEqual(parse2DCoord("grid[3][4]"), [3, 4]);
  assert.deepEqual(parse2DCoord("cell (3, 4)"), [3, 4]);

  // All resolve to identical coordinate keys
  assert.equal(coordKey("(3, 4)"), "3,4");
  assert.equal(coordKey("r=3, c=4"), "3,4");
  assert.equal(coordKey("grid[3][4]"), "3,4");

  // extractScalarValue preserves 2D coordinates instead of taking only index 1
  assert.equal(extractScalarValue([3, 4]), "3,4");
  assert.equal(extractScalarValue({ r: 3, c: 4 }), "3,4");
});


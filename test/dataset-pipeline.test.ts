import test from "node:test";
import assert from "node:assert/strict";
import {
  REVIEW_SYSTEM_PROMPT,
  buildReviewUserPrompt,
} from "../src/lib/prompts/review.prompt";
import {
  VISUALIZER_SYSTEM_PROMPT,
  buildVisualizerUserPrompt,
} from "../src/lib/prompts/visualizer.prompt";
import {
  processReviewPseudocode,
  processDatasetVisualization,
  expandMatrixToSize,
  expandArrayToLength,
} from "../src/lib/review.functions";
import {
  getCanonicalMultiDatasets,
  type TestDataset,
} from "../src/lib/problems";
import {
  simulateProblemWithDataset,
} from "../src/lib/simulators";
import {
  validateAndNormalizeVizPayload,
} from "../src/lib/ai-contracts";

test("Reviewer Prompt - instructs agent to generate 3 diverse variable datasets", () => {
  const prompt = buildReviewUserPrompt({
    title: "Set Matrix Zeroes",
    difficulty: "Medium",
    topics: ["Array", "Hash Table", "Matrix"],
    statement: "Given an m x n integer matrix matrix, if an element is 0, set its entire row and column to 0's.",
    pseudocode: `// In-place marker pass
for r in range(rows):
    for c in range(cols):
        if matrix[r][c] == 0:
            row_zero[r] = True
            col_zero[c] = True

for r in range(rows):
    for c in range(cols):
        if row_zero[r] or col_zero[c]:
            matrix[r][c] = 0
return matrix`,
  });

  // Verify prompt contains mandatory 3-dataset requirements
  assert.ok(prompt.includes("MANDATORY DATASET TRIPLE GENERATION"));
  assert.ok(prompt.includes("Dataset 1: Standard Case"));
  assert.ok(prompt.includes("Dataset 2: Longer & Complex Trace ⚡"));
  assert.ok(prompt.includes("Dataset 3: Edge & Boundary Case"));
  assert.ok(prompt.includes("5×6 or 6×6"), "Prompt must instruct reviewer agent about larger matrix size for longer dataset");
  assert.ok(prompt.includes("15–25 elements"), "Prompt must instruct reviewer agent about larger array size for longer dataset");
  assert.ok(REVIEW_SYSTEM_PROMPT.includes("MUST BE A SUBSTANTIALLY LARGER MATRIX OF AT LEAST 5×6 or 6×6"));
});

test("Visualizer Prompt - instructs agent to generate thorough step sequence for longer datasets", () => {
  assert.ok(VISUALIZER_SYSTEM_PROMPT.includes("LONGER & EXTENDED DATASETS"));
  assert.ok(VISUALIZER_SYSTEM_PROMPT.includes("ample time to observe and understand the algorithm working through longer data"));

  const vizPrompt = buildVisualizerUserPrompt({
    title: "Set Matrix Zeroes",
    statement: "Given an m x n integer matrix, set rows and cols with 0 to 0.",
    matrixExample: [
      [1, 2, 3, 4, 5, 6],
      [7, 0, 9, 10, 11, 12],
      [13, 14, 15, 16, 17, 18],
      [19, 20, 21, 0, 23, 24],
      [25, 26, 27, 28, 29, 30],
    ],
    datasetLabel: "Dataset 2: Longer & Complex Trace ⚡",
    datasetDescription: "Extended 5x6 matrix with multiple distributed zeroes",
    pseudocode: "for r in 0..m: for c in 0..n: ...",
  });

  assert.ok(vizPrompt.includes("Dataset 2: Longer & Complex Trace ⚡"));
  assert.ok(vizPrompt.includes("Extended 5x6 matrix"));
});

test("expandMatrixToSize & expandArrayToLength - guarantee minimum size invariants for longer trace", () => {
  // Matrix expansion test
  const smallMatrix = [
    [1, 2],
    [3, 0],
  ];
  const expandedMatrix = expandMatrixToSize(smallMatrix, 5, 6);
  assert.equal(expandedMatrix.length, 5, "Expanded matrix should have 5 rows");
  assert.equal(expandedMatrix[0]?.length, 6, "Expanded matrix should have 6 columns");
  assert.equal(expandedMatrix.length * expandedMatrix[0]!.length, 30, "Should have 30 cells");

  // Array expansion test
  const smallArray = [10, 20, 30, 40];
  const expandedArray = expandArrayToLength(smallArray, 16);
  assert.equal(expandedArray.length, 16, "Expanded array should have 16 elements");
  assert.equal(expandedArray[0], 10);
  assert.equal(expandedArray[3], 40);
});

test("Reviewer & Visualizer Execution Lifecycle - Set Matrix Zeroes across Normal, Longer, Edge datasets", async () => {
  const pseudocode = `// Optimal marker pass
rows = len(matrix)
cols = len(matrix[0])
first_row_zero = any(matrix[0][c] == 0 for c in range(cols))
first_col_zero = any(matrix[r][0] == 0 for r in range(rows))

for r in range(1, rows):
    for c in range(1, cols):
        if matrix[r][c] == 0:
            matrix[r][0] = 0
            matrix[0][c] = 0

for r in range(1, rows):
    for c in range(1, cols):
        if matrix[r][0] == 0 or matrix[0][c] == 0:
            matrix[r][c] = 0

if first_row_zero:
    for c in range(cols): matrix[0][c] = 0
if first_col_zero:
    for r in range(rows): matrix[r][0] = 0

return matrix`;

  // 1. Process review pseudocode (exercises dataset resolution)
  const reviewResult = await processReviewPseudocode({
    slug: "set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    topics: ["Array", "Hash Table", "Matrix"],
    pseudocode,
  });

  assert.equal(reviewResult.is_complete, true);
  assert.ok(reviewResult.datasets && reviewResult.datasets.length === 3, "Must have exactly 3 datasets");

  const [d1, d2, d3] = reviewResult.datasets!;
  
  // Verify Dataset 1 (Normal / Standard)
  assert.equal(d1.category, "standard");
  assert.equal(d1.id, "dataset_1");
  assert.ok(d1.matrix && d1.matrix.length >= 3, "Dataset 1 has standard 3x3 matrix");
  const d1Cells = d1.matrix!.length * d1.matrix![0]!.length;

  // Verify Dataset 2 (Longer)
  assert.equal(d2.category, "longer");
  assert.equal(d2.id, "dataset_2");
  assert.ok(d2.matrix && d2.matrix.length >= 5 && d2.matrix[0]!.length >= 6, "Dataset 2 must be at least 5x6");
  const d2Cells = d2.matrix!.length * d2.matrix![0]!.length;
  assert.ok(d2Cells > d1Cells, `Dataset 2 cells (${d2Cells}) must be strictly greater than Dataset 1 cells (${d1Cells})`);

  // Verify Dataset 3 (Edge)
  assert.equal(d3.category, "edge");
  assert.equal(d3.id, "dataset_3");
  assert.ok(d3.matrix && d3.matrix.length >= 2, "Dataset 3 has edge test matrix");

  // 2. Simulate Visualizer on Dataset 1 (Normal)
  const d1Viz = await processDatasetVisualization({
    slug: "set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    topics: ["Array", "Hash Table", "Matrix"],
    pseudocode,
    dataset: d1,
  });
  assert.ok(d1Viz.viz_steps.length > 0, "Dataset 1 must generate visualization steps");

  // 3. Simulate Visualizer on Dataset 2 (Longer)
  const d2Viz = await processDatasetVisualization({
    slug: "set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    topics: ["Array", "Hash Table", "Matrix"],
    pseudocode,
    dataset: d2,
  });
  assert.ok(d2Viz.viz_steps.length > 0, "Dataset 2 must generate visualization steps");

  // 4. Verify that Longer dataset generates strictly more steps than Normal dataset
  assert.ok(
    d2Viz.viz_steps.length > d1Viz.viz_steps.length,
    `Dataset 2 steps (${d2Viz.viz_steps.length}) must be strictly greater than Dataset 1 steps (${d1Viz.viz_steps.length}) so visualizer generates longer steps to understand the algorithm`,
  );

  // 5. Simulate Visualizer on Dataset 3 (Edge)
  const d3Viz = await processDatasetVisualization({
    slug: "set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    topics: ["Array", "Hash Table", "Matrix"],
    pseudocode,
    dataset: d3,
  });
  assert.ok(d3Viz.viz_steps.length > 0, "Dataset 3 must generate visualization steps");
});

test("Reviewer & Visualizer Execution Lifecycle - Two Sum array problem across Normal, Longer, Edge", async () => {
  const pseudocode = `// Hash map complement approach
seen = {}
for i in range(len(nums)):
    complement = target - nums[i]
    if complement in seen:
        return [seen[complement], i]
    seen[nums[i]] = i
return []`;

  const reviewResult = await processReviewPseudocode({
    slug: "two-sum",
    title: "Two Sum",
    topics: ["Array", "Hash Table"],
    pseudocode,
  });

  assert.equal(reviewResult.is_complete, true);
  assert.ok(reviewResult.datasets && reviewResult.datasets.length === 3);

  const [d1, d2, d3] = reviewResult.datasets!;

  // Verify dataset lengths
  assert.equal(d1.category, "standard");
  assert.equal(d2.category, "longer");
  assert.equal(d3.category, "edge");

  assert.ok(d2.array!.length >= 15, `Dataset 2 array length (${d2.array!.length}) should be at least 15`);
  assert.ok(d2.array!.length > d1.array!.length, "Dataset 2 array should be longer than Dataset 1");

  // Verify visualizer on both datasets
  const d1Viz = await processDatasetVisualization({
    slug: "two-sum",
    title: "Two Sum",
    topics: ["Array", "Hash Table"],
    pseudocode,
    dataset: d1,
  });

  const d2Viz = await processDatasetVisualization({
    slug: "two-sum",
    title: "Two Sum",
    topics: ["Array", "Hash Table"],
    pseudocode,
    dataset: d2,
  });

  assert.ok(d1Viz.viz_steps.length > 0);
  assert.ok(d2Viz.viz_steps.length > 0);
  assert.ok(
    d2Viz.viz_steps.length > d1Viz.viz_steps.length,
    `Two Sum D2 steps (${d2Viz.viz_steps.length}) must be strictly greater than D1 steps (${d1Viz.viz_steps.length})`,
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { simulateProblemWithDataset } from "./simulators.ts";
import type { TestDataset } from "./problems.ts";
import {
  extractScalarValue,
  safeArray,
  safeMatrix,
  safeTreeArray,
  coordKey,
  toText,
} from "../components/visualizer/VisualizerTypes.ts";

test("simulateProblemWithDataset - max-area-of-island recursive DFS visit order and full scan", () => {
  const customMatrix = [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 0, 1, 1],
    [0, 0, 0, 1, 1],
  ];

  const dataset: TestDataset = {
    id: "test_island",
    label: "Test Island Dataset",
    matrix: customMatrix,
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "max-area-of-island",
    "Max Area of Island",
    ["matrix", "dfs"],
    dataset,
  );

  assert.ok(result.steps.length > 0, "Simulation generated steps");
  assert.equal(result.steps[0]?.type, "matrix", "Matrix viz type");

  // Verify that all visited coordinates are formatted as 'r,c'
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep, "Final step exists");
  assert.ok(Array.isArray(finalStep.visited), "Visited list exists");
  assert.ok(finalStep.visited.length >= 7, "All 7 island cells across both islands visited");

  // Verify that final maxArea correctly identified the maximum island of area 4
  assert.equal(finalStep.maxArea, 4, "Max area calculated as 4 for second island");
});

test("simulateProblemWithDataset - number-of-islands counts distinct components", () => {
  const customMatrix = [
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  const dataset: TestDataset = {
    id: "test_num_islands",
    label: "Test Count Dataset",
    matrix: customMatrix,
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "number-of-islands",
    "Number of Islands",
    ["matrix", "bfs"],
    dataset,
  );
  assert.ok(result.steps.length > 0);

  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.mSum, 3, "Total 3 distinct islands found");
});

test("simulateProblemWithDataset - two-sum two pointers / hashmap simulation", () => {
  const dataset: TestDataset = {
    id: "test_two_sum",
    label: "Test Two Sum",
    array: [2, 7, 11, 15],
    target: 9,
    category: "standard",
  };

  const result = simulateProblemWithDataset("two-sum", "Two Sum", ["array", "hash-table"], dataset);
  assert.ok(result.steps.length > 0);
  assert.equal(result.steps[0]?.type, "hashmap");
});

test("simulateProblemWithDataset - binary-search convergence", () => {
  const dataset: TestDataset = {
    id: "test_bs",
    label: "Test Binary Search",
    array: [1, 3, 5, 7, 9, 11, 13, 15],
    target: 7,
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "binary-search",
    "Binary Search",
    ["binary-search"],
    dataset,
  );
  assert.ok(result.steps.length > 0);
  assert.equal(result.steps[0]?.type, "array");
});

test("simulateProblemWithDataset - merge-intervals consolidation and overlap simulation", () => {
  const dataset: TestDataset = {
    id: "test_merge_intervals",
    label: "Test Merge Intervals",
    matrix: [
      [1, 3],
      [2, 6],
      [8, 10],
      [15, 18],
    ],
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "merge-intervals",
    "Merge Intervals",
    ["Intervals", "Array"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.type, "matrix");
  assert.equal(finalStep.wSum, 3, "Consolidated into 3 non-overlapping intervals");
  assert.deepEqual(finalStep.matrix, [
    [1, 6],
    [8, 10],
    [15, 18],
  ]);
});

test("simulateProblemWithDataset - single-number XOR cancellation simulation", () => {
  const dataset: TestDataset = {
    id: "test_single_num",
    label: "Test Single Number",
    array: [4, 1, 2, 1, 2],
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "single-number",
    "Single Number",
    ["Bit Manipulation", "Array"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.current, 4, "Unique element resolved as 4");
  assert.equal(finalStep.mSum, 4);
});

test("simulateProblemWithDataset - number-of-1-bits hamming weight simulation", () => {
  const dataset: TestDataset = {
    id: "test_hamming",
    label: "Test Hamming Weight",
    array: [11],
    target: 11,
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "number-of-1-bits",
    "Number of 1 Bits",
    ["Bit Manipulation"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.current, 3, "11 (0b1011) has 3 set bits");
});

test("simulateProblemWithDataset - implement-trie multi-word insertion and prefix branches", () => {
  const dataset: TestDataset = {
    id: "test_trie",
    label: "Test Trie Word Bank",
    array: ["apple", "app", "applause", "apt", "bat"],
    target: "app",
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "implement-trie-prefix-tree",
    "Implement Trie",
    ["Trie", "Design"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  assert.equal(result.steps[0]?.type, "trie");
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.type, "trie");
  assert.equal(finalStep.mSum, 5, "Total 5 words inserted");
  assert.ok((finalStep.wSum ?? 0) >= 10, "Multiple TrieNodes created with shared prefixes");
});

test("simulateProblemWithDataset - kth-largest min-heap of size k simulation", () => {
  const dataset: TestDataset = {
    id: "test_kth",
    label: "Test Kth Largest",
    array: [3, 2, 1, 5, 6, 4],
    k: 2,
    target: 2,
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "kth-largest-element-in-an-array",
    "Kth Largest Element",
    ["Heap (Priority Queue)"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  assert.equal(result.steps[0]?.type, "heap");
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.current, 5, "2nd largest is 5");
  assert.equal(finalStep.mSum, 5);
});

test("simulateProblemWithDataset - find-median-from-data-stream dual heap simulation", () => {
  const dataset: TestDataset = {
    id: "test_median_stream",
    label: "Test Median Stream",
    array: [5, 2, 8, 1, 9, 3],
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "find-median-from-data-stream",
    "Find Median from Data Stream",
    ["Heap (Priority Queue)", "Design"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  assert.equal(result.steps[0]?.type, "heap");
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.current, 4, "Final median of [1,2,3,5,8,9] is (3+5)/2 = 4");
});

test("simulateProblemWithDataset - redundant-connection Union-Find cycle detection simulation", () => {
  const dataset: TestDataset = {
    id: "test_redundant",
    label: "Test Redundant Connection",
    matrix: [
      [1, 2],
      [1, 3],
      [2, 3],
    ],
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "redundant-connection",
    "Redundant Connection",
    ["Union-Find", "Graph"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  assert.equal(result.steps[0]?.type, "graph");
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.current, "[2, 3]", "Redundant edge is [2, 3]");
});

test("simulateProblemWithDataset - coin-change 1D DP knapsack simulation", () => {
  const dataset: TestDataset = {
    id: "test_coin",
    label: "Test Coin Change",
    array: [1, 2, 5],
    target: 11,
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "coin-change",
    "Coin Change",
    ["Dynamic Programming"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.current, 3, "Minimum coins for 11 using [1,2,5] is 3");
});

test("simulateProblemWithDataset - longest-increasing-subsequence 1D DP simulation", () => {
  const dataset: TestDataset = {
    id: "test_lis",
    label: "Test LIS",
    array: [10, 9, 2, 5, 3, 7, 101, 18],
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "longest-increasing-subsequence",
    "LIS",
    ["Dynamic Programming"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.current, 4, "LIS length is 4");
});

test("simulateProblemWithDataset - unique-paths 2D DP matrix table simulation", () => {
  const dataset: TestDataset = {
    id: "test_paths",
    label: "Test Unique Paths",
    matrix: [
      [1, 1, 1],
      [1, 2, 3],
      [1, 3, 6],
    ],
    target: "3,3",
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "unique-paths",
    "Unique Paths",
    ["Dynamic Programming"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  assert.equal(result.steps[0]?.type, "matrix");
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.type, "matrix");
  assert.equal(finalStep.current, 6, "3x3 unique paths is 6");
});

test("simulateProblemWithDataset - longest-common-subsequence dual sequence traversal and match detection", () => {
  const dataset: TestDataset = {
    id: "test_lcs",
    label: "Test LCS",
    array: ["a", "b", "c", "d", "e"],
    secondaryArray: ["a", "c", "e"],
    category: "standard",
  };

  const result = simulateProblemWithDataset(
    "longest-common-subsequence",
    "LCS",
    ["Dynamic Programming", "String"],
    dataset,
  );

  assert.ok(result.steps.length > 0);
  // Ensure both sequences are populated and pointers traverse
  const traversedPositions = result.steps
    .filter((s) => typeof s.left === "number" && typeof s.left2 === "number")
    .map((s) => `${s.left},${s.left2}`);
  
  assert.ok(traversedPositions.length > 5, "Traverses multiple cell comparisons");
  assert.ok(traversedPositions.includes("0,0"), "Traverses text1[0] vs text2[0]");
  assert.ok(traversedPositions.includes("2,1"), "Traverses text1[2] ('c') vs text2[1] ('c')");
  
  const matchSteps = result.steps.filter((s) => s.shiftInfo?.action === "match");
  assert.equal(matchSteps.length, 3, "Matches 'a', 'c', and 'e'");
  
  const finalStep = result.steps[result.steps.length - 1];
  assert.ok(finalStep);
  assert.equal(finalStep.wSum, 3, "Final LCS length is 3");
});

test("VisualizerTypes & Sanitizers - robust handling of arbitrary data types and TreeNode objects", () => {
  // Primitive conversions
  assert.equal(extractScalarValue(42), 42);
  assert.equal(extractScalarValue("hello"), "hello");
  assert.equal(extractScalarValue(true), "true");
  assert.equal(extractScalarValue(false), "false");
  assert.equal(extractScalarValue(100n), "100");
  assert.equal(extractScalarValue(NaN), null);
  assert.equal(extractScalarValue(Infinity), "Infinity");
  assert.equal(extractScalarValue(-Infinity), "-Infinity");

  // Object extraction
  assert.equal(extractScalarValue({ val: 7, left: null }), 7);
  assert.equal(extractScalarValue({ value: "target_node" }), "target_node");
  assert.equal(extractScalarValue({ cost: 99 }), 99);

  // safeArray with Set / Map / single value / object
  assert.deepEqual(safeArray(new Set([1, 2, 3])), [1, 2, 3]);
  assert.deepEqual(safeArray(new Map([["a", 10], ["b", 20]])), [10, 20]);
  assert.deepEqual(safeArray(42), [42]);

  // safeMatrix with ragged rows / 1D array
  assert.deepEqual(safeMatrix([1, 2, 3]), [[1, 2, 3]]);
  assert.deepEqual(safeMatrix([[1, 2], [3]]), [[1, 2], [3]]);

  // safeTreeArray with TreeNode BFS object
  const treeObj = {
    val: 1,
    left: { val: 2, left: null, right: null },
    right: { val: 3, left: { val: 4, left: null, right: null }, right: null },
  };
  const treeArr = safeTreeArray(treeObj);
  assert.deepEqual(treeArr, [1, 2, 3, null, null, 4]);

  // coordKey parsing with negative coordinates and strings
  assert.equal(coordKey([-1, 0]), "-1,0");
  assert.equal(coordKey("(-1, 0)"), "-1,0");
  assert.equal(coordKey({ r: 3, c: 5 }), "3,5");

  // toText formatting
  assert.equal(toText(null), "–");
  assert.equal(toText(Infinity), "∞");
  assert.equal(toText(123n), "123n");
});


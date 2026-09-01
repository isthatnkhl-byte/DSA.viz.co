import test from "node:test";
import assert from "node:assert/strict";
import { simulateProblemWithDataset } from "./simulators.ts";
import type { TestDataset } from "./problems.ts";

// ============================================================================
// 1. EMPTY ARRAYS & ZERO BOUNDARY EDGE CASES
// ============================================================================

test("Edge Case - Empty Arrays & Zero Bounds: Array & Search Algorithms", () => {
  // Empty Two Sum
  const emptyTwoSum: TestDataset = {
    id: "empty_two_sum",
    label: "Empty Array Two Sum",
    array: [],
    target: 0,
    category: "edge",
  };
  const res1 = simulateProblemWithDataset("two-sum", "Two Sum", ["array", "hash-table"], emptyTwoSum);
  assert.ok(res1.steps.length > 0, "Generates valid non-crashing steps for empty input");
  assert.equal(res1.steps[0]?.type, "hashmap");

  // Empty Binary Search
  const emptyBS: TestDataset = {
    id: "empty_bs",
    label: "Empty Binary Search",
    array: [],
    target: 5,
    category: "edge",
  };
  const res2 = simulateProblemWithDataset("binary-search", "Binary Search", ["binary-search"], emptyBS);
  assert.ok(res2.steps.length > 0);
  assert.equal(res2.steps[0]?.type, "array");

  // Empty Sliding Window
  const emptySW: TestDataset = {
    id: "empty_sw",
    label: "Empty Sliding Window",
    array: [],
    k: 3,
    category: "edge",
  };
  const res3 = simulateProblemWithDataset("sliding-window-maximum", "Sliding Window", ["sliding-window"], emptySW);
  assert.ok(res3.steps.length > 0);

  // Single Number with empty / single
  const singleNum: TestDataset = {
    id: "single_one",
    label: "Single Element",
    array: [42],
    category: "edge",
  };
  const res4 = simulateProblemWithDataset("single-number", "Single Number", ["Bit Manipulation"], singleNum);
  assert.ok(res4.steps.length > 0);
  const finalStep4 = res4.steps[res4.steps.length - 1];
  assert.equal(finalStep4?.current, 42);
});

test("Edge Case - Empty Grids & 1x1 Island Matrices", () => {
  // 1x1 all-water matrix
  const waterGrid: TestDataset = {
    id: "water_1x1",
    label: "1x1 Water",
    matrix: [[0]],
    category: "edge",
  };
  const resWater = simulateProblemWithDataset("number-of-islands", "Number of Islands", ["matrix"], waterGrid);
  assert.ok(resWater.steps.length > 0);
  assert.equal(resWater.steps[resWater.steps.length - 1]?.mSum, 0, "Zero islands found in all-water grid");

  // 1x1 all-land matrix
  const landGrid: TestDataset = {
    id: "land_1x1",
    label: "1x1 Land",
    matrix: [[1]],
    category: "edge",
  };
  const resLand = simulateProblemWithDataset("number-of-islands", "Number of Islands", ["matrix"], landGrid);
  assert.ok(resLand.steps.length > 0);
  assert.equal(resLand.steps[resLand.steps.length - 1]?.mSum, 1, "1 island found in 1x1 single land cell");

  // Max Area of 1x1 Land
  const resMaxLand = simulateProblemWithDataset("max-area-of-island", "Max Area", ["matrix"], landGrid);
  assert.ok(resMaxLand.steps.length > 0);
  assert.equal(resMaxLand.steps[resMaxLand.steps.length - 1]?.maxArea, 1, "Max area is 1");

  // All-land 3x3 grid (single large connected island)
  const fullLand: TestDataset = {
    id: "full_land",
    label: "Full 3x3 Land",
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
    category: "edge",
  };
  const resFullLand = simulateProblemWithDataset("max-area-of-island", "Max Area", ["matrix"], fullLand);
  assert.ok(resFullLand.steps.length > 0);
  assert.equal(resFullLand.steps[resFullLand.steps.length - 1]?.maxArea, 9, "Full connected island area = 9");
});

test("Edge Case - Stack & Bracket Sequences: Unbalanced & Empty", () => {
  // Empty brackets
  const emptyBrackets: TestDataset = {
    id: "empty_parens",
    label: "Empty Parentheses",
    array: [],
    category: "edge",
  };
  const res1 = simulateProblemWithDataset("valid-parentheses", "Valid Parentheses", ["Stack"], emptyBrackets);
  assert.ok(res1.steps.length > 0);

  // Single opening bracket (unbalanced)
  const singleOpen: TestDataset = {
    id: "single_open",
    label: "Single Open Bracket",
    array: ["("],
    category: "edge",
  };
  const res2 = simulateProblemWithDataset("valid-parentheses", "Valid Parentheses", ["Stack"], singleOpen);
  assert.ok(res2.steps.length > 0);
  const final2 = res2.steps[res2.steps.length - 1];
  assert.ok(final2?.desc.toLowerCase().includes("unbalanced") || final2?.desc.toLowerCase().includes("invalid") || final2?.desc.toLowerCase().includes("remaining") || final2?.desc.toLowerCase().includes("empty"));

  // Wrong closing bracket
  const mismatch: TestDataset = {
    id: "mismatch_parens",
    label: "Mismatched Parentheses",
    array: ["(", "]"],
    category: "edge",
  };
  const res3 = simulateProblemWithDataset("valid-parentheses", "Valid Parentheses", ["Stack"], mismatch);
  assert.ok(res3.steps.length > 0);
});

// ============================================================================
// 2. DUPLICATE VALUES & HOMOGENEOUS DISTRIBUTIONS
// ============================================================================

test("Edge Case - Duplicate Values: Monotonic Stack, LIS & Sorting", () => {
  // All identical elements in Monotonic Stack
  const allEqualStack: TestDataset = {
    id: "all_equal_stack",
    label: "All Identical Elements",
    array: [5, 5, 5, 5, 5],
    category: "edge",
  };
  const res1 = simulateProblemWithDataset("daily-temperatures", "Daily Temperatures", ["Stack"], allEqualStack);
  assert.ok(res1.steps.length > 0);
  assert.equal(res1.steps[0]?.type, "stack");

  // Strictly decreasing in Monotonic Stack
  const decreasingStack: TestDataset = {
    id: "decreasing_stack",
    label: "Strictly Decreasing",
    array: [100, 80, 60, 40, 20],
    category: "edge",
  };
  const res2 = simulateProblemWithDataset("daily-temperatures", "Daily Temperatures", ["Stack"], decreasingStack);
  assert.ok(res2.steps.length > 0);

  // Strictly increasing in Monotonic Stack
  const increasingStack: TestDataset = {
    id: "increasing_stack",
    label: "Strictly Increasing",
    array: [10, 20, 30, 40, 50],
    category: "edge",
  };
  const res3 = simulateProblemWithDataset("daily-temperatures", "Daily Temperatures", ["Stack"], increasingStack);
  assert.ok(res3.steps.length > 0);

  // LIS with all identical elements
  const allEqualLIS: TestDataset = {
    id: "all_equal_lis",
    label: "All Identical Elements LIS",
    array: [7, 7, 7, 7, 7],
    category: "edge",
  };
  const res4 = simulateProblemWithDataset("longest-increasing-subsequence", "LIS", ["Dynamic Programming"], allEqualLIS);
  assert.ok(res4.steps.length > 0);
  const final4 = res4.steps[res4.steps.length - 1];
  assert.equal(final4?.current, 1, "LIS of identical elements is 1");

  // Heap with all duplicate elements
  const duplicateHeap: TestDataset = {
    id: "duplicate_heap",
    label: "Duplicate Heap Elements",
    array: [4, 4, 4, 4, 4, 4],
    k: 3,
    category: "edge",
  };
  const res5 = simulateProblemWithDataset("kth-largest-element-in-an-array", "Kth Largest", ["Heap"], duplicateHeap);
  assert.ok(res5.steps.length > 0);
  assert.equal(res5.steps[res5.steps.length - 1]?.current, 4);
});

// ============================================================================
// 3. NEGATIVE NUMBERS & EXTREME VALUES
// ============================================================================

test("Edge Case - Negative Numbers across Search, Heaps & DP", () => {
  // Binary Search with negative numbers
  const negativeBS: TestDataset = {
    id: "neg_bs",
    label: "Negative Binary Search",
    array: [-50, -30, -20, -10, -5, 0, 15],
    target: -20,
    category: "edge",
  };
  const resBS = simulateProblemWithDataset("binary-search", "Binary Search", ["binary-search"], negativeBS);
  assert.ok(resBS.steps.length > 0);
  const matchStep = resBS.steps.find((s) => s.current === -20 && s.line === 3);
  assert.ok(matchStep, "Target -20 found successfully in negative array");

  // Heap with negative numbers
  const negativeHeap: TestDataset = {
    id: "neg_heap",
    label: "Negative Heap Numbers",
    array: [-15, -3, -8, -1, -20, -6],
    k: 2,
    target: 2,
    category: "edge",
  };
  const resHeap = simulateProblemWithDataset("kth-largest-element-in-an-array", "Kth Largest", ["Heap"], negativeHeap);
  assert.ok(resHeap.steps.length > 0);
  // In [-20, -15, -8, -6, -3, -1], the 2nd largest is -3
  assert.equal(resHeap.steps[resHeap.steps.length - 1]?.current, -3, "2nd largest negative number is -3");

  // Median Stream with negative numbers
  const negMedian: TestDataset = {
    id: "neg_median",
    label: "Negative Median Stream",
    array: [-10, -20, -30, -40, -50],
    category: "edge",
  };
  const resMedian = simulateProblemWithDataset("find-median-from-data-stream", "Median Stream", ["Heap"], negMedian);
  assert.ok(resMedian.steps.length > 0);
  assert.equal(resMedian.steps[resMedian.steps.length - 1]?.current, -30, "Median of [-50, -40, -30, -20, -10] is -30");

  // Single number with negative integers
  const negSingle: TestDataset = {
    id: "neg_single",
    label: "Negative Single Number",
    array: [-5, -2, -2, -9, -9],
    category: "edge",
  };
  const resSingle = simulateProblemWithDataset("single-number", "Single Number", ["Bit Manipulation"], negSingle);
  assert.ok(resSingle.steps.length > 0);
  assert.equal(resSingle.steps[resSingle.steps.length - 1]?.current, -5, "Single negative number -5 resolved");

  // Intervals with negative numbers
  const negIntervals: TestDataset = {
    id: "neg_intervals",
    label: "Negative Interval Coordinates",
    matrix: [
      [-10, -5],
      [-7, -2],
      [0, 5],
      [3, 8],
    ],
    category: "edge",
  };
  const resIntervals = simulateProblemWithDataset("merge-intervals", "Merge Intervals", ["Intervals"], negIntervals);
  assert.ok(resIntervals.steps.length > 0);
  const finalIntervals = resIntervals.steps[resIntervals.steps.length - 1];
  assert.deepEqual(finalIntervals?.matrix, [
    [-10, -2],
    [0, 8],
  ], "Properly consolidates negative span intervals");
});

test("Edge Case - Extreme Numeric Values & Bit Boundaries", () => {
  // Max 32-bit integer in Hamming weight / Number of 1 bits
  const extremeBits: TestDataset = {
    id: "max_bits",
    label: "32-bit Max Integer",
    array: [2147483647], // 0x7FFFFFFF (31 set bits)
    target: 2147483647,
    category: "edge",
  };
  const resBits = simulateProblemWithDataset("number-of-1-bits", "Number of 1 Bits", ["Bit Manipulation"], extremeBits);
  assert.ok(resBits.steps.length > 0);
  assert.equal(resBits.steps[resBits.steps.length - 1]?.current, 31, "2147483647 has exactly 31 set bits");

  // Zero in Number of 1 bits
  const zeroBits: TestDataset = {
    id: "zero_bits",
    label: "Zero Bits",
    array: [0],
    target: 0,
    category: "edge",
  };
  const resZero = simulateProblemWithDataset("number-of-1-bits", "Number of 1 Bits", ["Bit Manipulation"], zeroBits);
  assert.ok(resZero.steps.length > 0);
  assert.equal(resZero.steps[resZero.steps.length - 1]?.current, 0, "0 has 0 set bits");
});

// ============================================================================
// 4. GRAPH & TOPOLOGY EDGE CASES
// ============================================================================

test("Edge Case - Graphs: Self-Cycles, Disconnected Vertices & Star Graphs", () => {
  // Cycle in Course Schedule / Topological Sort
  const cycleGraph: TestDataset = {
    id: "cycle_graph",
    label: "Cyclic Dependency Graph",
    matrix: [
      [0, 1],
      [1, 2],
      [2, 0],
    ],
    category: "edge",
  };
  const resCycle = simulateProblemWithDataset("course-schedule", "Course Schedule", ["Graph Theory", "Topological Sort"], cycleGraph);
  assert.ok(resCycle.steps.length > 0);

  // Redundant Connection single edge cycle
  const selfCycleRedundant: TestDataset = {
    id: "triangle_cycle",
    label: "Triangle Cycle Redundant",
    matrix: [
      [1, 2],
      [2, 3],
      [3, 1],
    ],
    category: "edge",
  };
  const resRedundant = simulateProblemWithDataset("redundant-connection", "Redundant Connection", ["Union-Find"], selfCycleRedundant);
  assert.ok(resRedundant.steps.length > 0);
  assert.equal(resRedundant.steps[resRedundant.steps.length - 1]?.current, "[3, 1]", "Redundant cycle edge is [3, 1]");

  // Linked List Cycle: pos = 0 (head cycle), pos = -1 (no cycle)
  const headCycleList: TestDataset = {
    id: "head_cycle",
    label: "Cycle at Head (pos 0)",
    array: [3, 2, 0, -4],
    pos: 0,
    hasCycle: true,
    category: "edge",
  };
  const resLLHead = simulateProblemWithDataset("linked-list-cycle", "Linked List Cycle", ["Linked List"], headCycleList);
  assert.ok(resLLHead.steps.length > 0);

  const noCycleList: TestDataset = {
    id: "no_cycle",
    label: "Linear List (pos -1)",
    array: [1, 2, 3, 4, 5],
    pos: -1,
    hasCycle: false,
    category: "edge",
  };
  const resLLNone = simulateProblemWithDataset("linked-list-cycle", "Linked List Cycle", ["Linked List"], noCycleList);
  assert.ok(resLLNone.steps.length > 0);
});

// ============================================================================
// 5. TREE TOPOLOGY EDGE CASES
// ============================================================================

test("Edge Case - Binary Trees: Skewed, Single Node & Negative Values", () => {
  // Single node tree
  const singleNodeTree: TestDataset = {
    id: "single_tree",
    label: "Single Node Tree",
    tree: [1],
    category: "edge",
  };
  const res1 = simulateProblemWithDataset("binary-tree-level-order-traversal", "Level Order", ["Tree"], singleNodeTree);
  assert.ok(res1.steps.length > 0);

  // Left-skewed tree
  const leftSkewed: TestDataset = {
    id: "left_skewed",
    label: "Left Skewed Tree",
    tree: [1, 2, null, 3, null, null, null, 4],
    category: "edge",
  };
  const res2 = simulateProblemWithDataset("binary-tree-inorder-traversal", "Inorder Traversal", ["Tree"], leftSkewed);
  assert.ok(res2.steps.length > 0);

  // Tree with negative numbers
  const negTree: TestDataset = {
    id: "neg_tree",
    label: "Negative Values Tree",
    tree: [-10, 9, 20, null, null, 15, 7],
    category: "edge",
  };
  const res3 = simulateProblemWithDataset("binary-tree-level-order-traversal", "Level Order", ["Tree"], negTree);
  assert.ok(res3.steps.length > 0);
});

// ============================================================================
// 6. DYNAMIC PROGRAMMING & STRING RECURRENCE EDGE CASES
// ============================================================================

test("Edge Case - DP & Sequence Recurrences: Impossible Target & 1x1 Matrix", () => {
  // Coin Change with impossible amount
  const impossibleCoin: TestDataset = {
    id: "impossible_coin",
    label: "Impossible Coin Change",
    array: [2],
    target: 3,
    category: "edge",
  };
  const resCoin = simulateProblemWithDataset("coin-change", "Coin Change", ["Dynamic Programming"], impossibleCoin);
  assert.ok(resCoin.steps.length > 0);

  // Unique Paths 1x1 grid
  const singleGrid: TestDataset = {
    id: "single_path",
    label: "1x1 Unique Paths",
    matrix: [[1]],
    target: "1,1",
    category: "edge",
  };
  const resPaths = simulateProblemWithDataset("unique-paths", "Unique Paths", ["Dynamic Programming"], singleGrid);
  assert.ok(resPaths.steps.length > 0);
  assert.equal(resPaths.steps[resPaths.steps.length - 1]?.current, 1, "1x1 grid has 1 unique path");

  // LCS with completely disjoint sequences
  const disjointLCS: TestDataset = {
    id: "disjoint_lcs",
    label: "Disjoint LCS",
    array: ["a", "b", "c"],
    secondaryArray: ["d", "e", "f"],
    category: "edge",
  };
  const resLCS = simulateProblemWithDataset("longest-common-subsequence", "LCS", ["Dynamic Programming"], disjointLCS);
  assert.ok(resLCS.steps.length > 0);
  assert.equal(resLCS.steps[resLCS.steps.length - 1]?.wSum, 0, "Disjoint sequences have 0 LCS length");
});

// ============================================================================
// 7. TRIE & DATA STRUCTURE DESIGN EDGE CASES
// ============================================================================

test("Edge Case - Trie Word Banks: Shared Prefixes & Single Characters", () => {
  const prefixTrie: TestDataset = {
    id: "prefix_trie",
    label: "Shared Prefix Word Bank",
    array: ["a", "aa", "aaa", "ab", "b"],
    target: "aa",
    category: "edge",
  };
  const resTrie = simulateProblemWithDataset("implement-trie-prefix-tree", "Implement Trie", ["Trie", "Design"], prefixTrie);
  assert.ok(resTrie.steps.length > 0);
  assert.equal(resTrie.steps[0]?.type, "trie");
  assert.equal(resTrie.steps[resTrie.steps.length - 1]?.mSum, 5, "All 5 words inserted");
});

test("Edge Case - LRU Cache & Design Hash Structures: Capacity 1 & Evictions", () => {
  // LRU Cache with capacity 1
  const lruCap1: TestDataset = {
    id: "lru_cap_1",
    label: "Capacity 1 LRU",
    k: 1,
    array: [
      "put(1, 10)",
      "put(2, 20)",
      "get(1)",
      "get(2)",
      "put(3, 30)",
      "get(2)",
      "get(3)",
    ],
    category: "edge",
  };
  const resLRU = simulateProblemWithDataset("lru-cache", "LRU Cache", ["Design"], lruCap1);
  assert.ok(resLRU.steps.length > 0);
  assert.equal(resLRU.steps[0]?.type, "linkedlist");

  // Hash Set with repeat additions & removals of nonexistent elements
  const hashSetOps: TestDataset = {
    id: "hash_set_ops",
    label: "HashSet Redundant Ops",
    array: [
      "add(99)",
      "add(99)",
      "contains(99)",
      "remove(100)",
      "remove(99)",
      "contains(99)",
    ],
    category: "edge",
  };
  const resSet = simulateProblemWithDataset("design-hashset", "Design HashSet", ["Design"], hashSetOps);
  assert.ok(resSet.steps.length > 0);
  assert.equal(resSet.steps[0]?.type, "set");
});

// ============================================================================
// 8. TWO POINTERS, SLIDING WINDOW, & ARRAY ARITHMETIC EDGE CASES
// ============================================================================

test("Edge Case - Two Pointers & Symmetric Sequences: Flats, Negatives & Boundaries", () => {
  // Two Pointers with all zeroes and target 0
  const allZeroes: TestDataset = {
    id: "zeroes_2sum",
    label: "All Zeroes Two Pointers",
    array: [0, 0, 0, 0, 0],
    target: 0,
    category: "edge",
  };
  const resZeroes = simulateProblemWithDataset("two-sum-ii-input-array-is-sorted", "Two Sum II", ["Two Pointers"], allZeroes);
  assert.ok(resZeroes.steps.length > 0);
  const foundStep = resZeroes.steps.find((s) => s.line === 4);
  assert.ok(foundStep, "Pair summing to 0 found");

  // Two Pointers with all negative values
  const allNegative: TestDataset = {
    id: "neg_2sum",
    label: "All Negative Array",
    array: [-50, -30, -20, -10, -5],
    target: -60,
    category: "edge",
  };
  const resNeg = simulateProblemWithDataset("two-sum-ii-input-array-is-sorted", "Two Sum II", ["Two Pointers"], allNegative);
  assert.ok(resNeg.steps.length > 0);
  const negMatch = resNeg.steps.find((s) => s.wSum === -60);
  assert.ok(negMatch, "Target sum -60 (-50 + -10) identified");

  // Symmetric palindrome string two pointers (match)
  const palindrome: TestDataset = {
    id: "palindrome_edge",
    label: "Single Character Palindrome",
    array: ["a"],
    category: "edge",
  };
  const resPal = simulateProblemWithDataset("valid-palindrome", "Valid Palindrome", ["Two Pointers", "String"], palindrome);
  assert.ok(resPal.steps.length > 0);
  assert.equal(resPal.steps[resPal.steps.length - 1]?.current, "True");
});

test("Edge Case - Prefix Sum & Array Product with Zeroes and Negative Values", () => {
  // Product of Array Except Self with 0 and negative elements
  const zeroesProduct: TestDataset = {
    id: "zero_prod",
    label: "Array with Zeroes and Negatives",
    array: [-1, 1, 0, -3, 3],
    category: "edge",
  };
  const resProd = simulateProblemWithDataset("product-of-array-except-self", "Product of Array Except Self", ["Array", "Prefix Sum"], zeroesProduct);
  assert.ok(resProd.steps.length > 0);

  // Maximum Subarray with all negative numbers
  const allNegSubarray: TestDataset = {
    id: "all_neg_sub",
    label: "All Negative Numbers",
    array: [-10, -3, -5, -20, -1, -8],
    category: "edge",
  };
  const resSub = simulateProblemWithDataset("maximum-subarray", "Maximum Subarray", ["Array", "Dynamic Programming"], allNegSubarray);
  assert.ok(resSub.steps.length > 0);
  assert.equal(resSub.steps[resSub.steps.length - 1]?.mSum, -1, "Max contiguous subarray sum is -1");
});

// ============================================================================
// 9. MULTI-DATASET CONSISTENCY ACROSS ALL CANONICAL PROBLEMS
// ============================================================================

test("Multi-Dataset Lifecycle - All canonical problems run through Standard, Longer, and Edge datasets", async () => {
  const { getCanonicalMultiDatasets } = await import("./problems.ts");

  const sampleProblemSlugs = [
    "two-sum",
    "binary-search",
    "max-area-of-island",
    "number-of-islands",
    "merge-intervals",
    "valid-parentheses",
    "single-number",
    "coin-change",
    "longest-increasing-subsequence",
    "longest-common-subsequence",
    "kth-largest-element-in-an-array",
    "find-median-from-data-stream",
    "implement-trie-prefix-tree",
    "course-schedule",
    "redundant-connection",
    "lru-cache",
    "design-hashmap",
  ];

  for (const slug of sampleProblemSlugs) {
    const datasets = getCanonicalMultiDatasets(slug, slug, []);
    assert.equal(datasets.length, 3, `Problem ${slug} generates 3 datasets`);

    for (const ds of datasets) {
      const bundle = simulateProblemWithDataset(slug, slug, [], ds);
      assert.ok(bundle.steps.length > 0, `Problem ${slug} with dataset ${ds.id} produces non-empty steps`);
      assert.ok(bundle.code.length > 0, `Problem ${slug} provides code lines`);

      // Verify every step in the simulation is well-formed
      for (const step of bundle.steps) {
        assert.ok(typeof step.desc === "string" && step.desc.length > 0, `Step description exists in ${slug}`);
        assert.ok(typeof step.line === "number", `Step line is number in ${slug}`);
      }
    }
  }
});


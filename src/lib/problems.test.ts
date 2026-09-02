import test from "node:test";
import assert from "node:assert/strict";
import {
  problemBySlug,
  getCanonicalMultiDatasets,
  isIslandOrGridProblem,
  sampleMatrixFor,
} from "./problems";

test("problemBySlug - finds canonical problems and handles normalization", () => {
  const p1 = problemBySlug("two-sum");
  assert.ok(p1, "Found two-sum");
  assert.equal(p1.title, "Two Sum");

  const p2 = problemBySlug("max-area-of-island");
  assert.ok(p2, "Found max-area-of-island");
  assert.equal(p2.title, "Max Area of Island");

  // Normalized fuzzy lookup
  const p3 = problemBySlug("max_area_of_island");
  assert.ok(p3, "Found via normalized underscore slug");
  assert.equal(p3.title, "Max Area of Island");
});

test("getCanonicalMultiDatasets - provides 3 structured datasets", () => {
  const datasets = getCanonicalMultiDatasets("max-area-of-island", "Max Area of Island", [
    "matrix",
  ]);
  assert.equal(datasets.length, 3, "Exactly 3 datasets generated");

  assert.equal(datasets[0]?.id, "dataset_1");
  assert.equal(datasets[0]?.category, "standard");

  assert.equal(datasets[1]?.id, "dataset_2");
  assert.equal(datasets[1]?.category, "longer");
  assert.ok(datasets[1]?.matrix, "Longer dataset includes 2D matrix");

  assert.equal(datasets[2]?.id, "dataset_3");
  assert.equal(datasets[2]?.category, "edge");
});

test("isIslandOrGridProblem - accurately identifies 2D grid algorithms", () => {
  assert.equal(isIslandOrGridProblem("number-of-islands", ["matrix"]), true);
  assert.equal(isIslandOrGridProblem("max-area-of-island", ["grid"]), true);
  assert.equal(isIslandOrGridProblem("rotting-oranges", ["bfs"]), true);
  assert.equal(isIslandOrGridProblem("two-sum", ["array"]), false);
  assert.equal(isIslandOrGridProblem("reverse-linked-list", ["linked-list"]), false);
});

test("sampleMatrixFor - returns deep copy of canonical grid", () => {
  const m1 = sampleMatrixFor("max-area-of-island");
  const m2 = sampleMatrixFor("max-area-of-island");
  assert.notEqual(m1, m2, "Returns isolated matrix instances");
  assert.ok(Array.isArray(m1) && m1.length > 0);
});

test("getCanonicalMultiDatasets - generates character arrays for string problems", () => {
  const datasets = getCanonicalMultiDatasets("strong-password-checker-ii", "Strong Password Checker II", [
    "String",
  ]);
  assert.equal(datasets.length, 3);
  assert.ok(Array.isArray(datasets[0]?.array));
  // All datasets should contain character strings
  assert.ok(datasets[0]?.array?.length > 0);
  assert.ok(datasets[0]?.array?.every((x) => typeof x === "string"));
  assert.ok(datasets[1]?.array?.every((x) => typeof x === "string"));
  assert.ok(datasets[2]?.array?.every((x) => typeof x === "string"));
});

test("getCanonicalMultiDatasets - generates graph matrices and node vertices for graph problems", () => {
  const datasets = getCanonicalMultiDatasets("course-schedule", "Course Schedule", [
    "Graph Theory",
    "Topological Sort",
  ]);
  assert.equal(datasets.length, 3);

  // All 3 datasets must have adjacency matrices
  assert.ok(Array.isArray(datasets[0]?.matrix), "Dataset 1 has 2D graph matrix");
  assert.ok(Array.isArray(datasets[1]?.matrix), "Dataset 2 has 2D graph matrix");
  assert.ok(Array.isArray(datasets[2]?.matrix), "Dataset 3 has 2D graph matrix");

  assert.equal(datasets[0]?.matrix?.length, 4, "Dataset 1 has 4 prerequisite edges");
  assert.equal(datasets[1]?.matrix?.length, 6, "Dataset 2 has 6 prerequisite edges");
  assert.equal(datasets[2]?.matrix?.length, 2, "Dataset 3 has 2 prerequisite edges");
});

test("getCanonicalMultiDatasets - generates bracket arrays for parentheses stack problems", () => {
  const datasets = getCanonicalMultiDatasets("valid-parentheses", "Valid Parentheses", [
    "Stack",
    "String",
  ]);
  assert.equal(datasets.length, 3);

  assert.deepEqual(datasets[0]?.array, ["(", "{", "[", "]", "}", ")"]);
  assert.deepEqual(datasets[1]?.array, ["(", "(", "[", "{", "}", "]", ")", ")", "[", "]", "{", "}"]);
  assert.deepEqual(datasets[2]?.array, ["(", "[", ")", "]"]);
});

test("getCanonicalMultiDatasets - generates dual sequences and secondary arrays for two-sequence problems", () => {
  const lcsDatasets = getCanonicalMultiDatasets("longest-common-subsequence", "Longest Common Subsequence", [
    "Dynamic Programming",
  ]);
  assert.equal(lcsDatasets.length, 3);
  assert.deepEqual(lcsDatasets[0]?.array, ["a", "b", "c", "d", "e"]);
  assert.deepEqual(lcsDatasets[0]?.secondaryArray, ["a", "c", "e"]);
  assert.deepEqual(lcsDatasets[1]?.array, ["p", "r", "o", "g", "r", "a", "m", "m", "i", "n", "g"]);
  assert.deepEqual(lcsDatasets[1]?.secondaryArray, ["r", "a", "m", "i", "n", "g"]);
  assert.deepEqual(lcsDatasets[2]?.array, ["a", "b", "c"]);
  assert.deepEqual(lcsDatasets[2]?.secondaryArray, ["d", "e", "f"]);

  const mergeDatasets = getCanonicalMultiDatasets("merge-sorted-array", "Merge Sorted Array", [
    "Array",
    "Two Pointers",
  ]);
  assert.equal(mergeDatasets.length, 3);
  assert.deepEqual(mergeDatasets[0]?.array, [1, 2, 3, 0, 0, 0]);
  assert.deepEqual(mergeDatasets[0]?.secondaryArray, [2, 5, 6]);
  assert.deepEqual(mergeDatasets[1]?.array, [1, 3, 5, 7, 9, 11, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(mergeDatasets[1]?.secondaryArray, [2, 4, 6, 8, 10, 12]);
});

test("getCanonicalMultiDatasets - generates paired interval matrices for interval problems", () => {
  const intervalDatasets = getCanonicalMultiDatasets("merge-intervals", "Merge Intervals", [
    "Array",
    "Sorting",
    "Intervals",
  ]);
  assert.equal(intervalDatasets.length, 3);
  assert.deepEqual(intervalDatasets[0]?.matrix, [
    [1, 3],
    [2, 6],
    [8, 10],
    [15, 18],
  ]);
  assert.deepEqual(intervalDatasets[1]?.matrix?.length, 7, "Longer dataset has 7 chained intervals");
  assert.deepEqual(intervalDatasets[2]?.matrix, [
    [1, 4],
    [4, 5],
  ]);

  const insertDatasets = getCanonicalMultiDatasets("insert-interval", "Insert Interval", [
    "Array",
    "Intervals",
  ]);
  assert.equal(insertDatasets.length, 3);
  assert.deepEqual(insertDatasets[0]?.matrix, [
    [1, 3],
    [6, 9],
  ]);
  assert.equal(insertDatasets[0]?.target, "[2, 5]");
});

test("getCanonicalMultiDatasets - generates bit manipulation datasets with binary and cancel pairs", () => {
  const singleNumDatasets = getCanonicalMultiDatasets("single-number", "Single Number", [
    "Bit Manipulation",
    "Array",
  ]);
  assert.equal(singleNumDatasets.length, 3);
  assert.deepEqual(singleNumDatasets[0]?.array, [4, 1, 2, 1, 2]);
  assert.deepEqual(singleNumDatasets[1]?.array?.length, 15, "Longer trace has 15 elements with 7 cancel pairs");
  assert.deepEqual(singleNumDatasets[2]?.array, [1]);

  const hammingDatasets = getCanonicalMultiDatasets("number-of-1-bits", "Number of 1 Bits", [
    "Bit Manipulation",
  ]);
  assert.equal(hammingDatasets.length, 3);
  assert.equal(hammingDatasets[0]?.target, 11);
  assert.equal(hammingDatasets[1]?.target, 128);
});

test("getCanonicalMultiDatasets - generates Trie word banks with prefix branches", () => {
  const trieDatasets = getCanonicalMultiDatasets("implement-trie-prefix-tree", "Implement Trie", [
    "Trie",
    "Design",
  ]);
  assert.equal(trieDatasets.length, 3);
  assert.deepEqual(trieDatasets[0]?.array, ["apple", "app", "applause", "apt", "bat"]);
  assert.equal(trieDatasets[0]?.target, "app");
  assert.deepEqual(trieDatasets[1]?.array?.length, 8, "Longer trace has 8 hierarchical words");
  assert.deepEqual(trieDatasets[2]?.array, ["a", "aa", "aaa", "ab", "b"]);
});

test("getCanonicalMultiDatasets - generates Heap and Streaming datasets with k and dual heaps", () => {
  const kthDatasets = getCanonicalMultiDatasets("kth-largest-element-in-an-array", "Kth Largest", [
    "Heap (Priority Queue)",
    "Divide and Conquer",
  ]);
  assert.equal(kthDatasets.length, 3);
  assert.deepEqual(kthDatasets[0]?.array, [3, 2, 1, 5, 6, 4]);
  assert.equal(kthDatasets[0]?.k, 2);
  assert.equal(kthDatasets[1]?.k, 4);

  const medianDatasets = getCanonicalMultiDatasets("find-median-from-data-stream", "Median Stream", [
    "Heap (Priority Queue)",
    "Design",
  ]);
  assert.equal(medianDatasets.length, 3);
  assert.deepEqual(medianDatasets[0]?.array, [5, 2, 8, 1, 9, 3]);
  assert.deepEqual(medianDatasets[1]?.array?.length, 10, "Extended 10-element stream");
});

test("getCanonicalMultiDatasets - generates Union-Find / DSU connectivity and cycle graphs", () => {
  const redundantDatasets = getCanonicalMultiDatasets("redundant-connection", "Redundant Connection", [
    "Union-Find",
    "Graph",
  ]);
  assert.equal(redundantDatasets.length, 3);
  assert.deepEqual(redundantDatasets[0]?.matrix, [
    [1, 2],
    [1, 3],
    [2, 3],
  ]);
  assert.deepEqual(redundantDatasets[1]?.matrix?.length, 5, "Longer trace has 5 edges");

  const provinceDatasets = getCanonicalMultiDatasets("number-of-provinces", "Number of Provinces", [
    "Union-Find",
    "Graph",
  ]);
  assert.equal(provinceDatasets.length, 3);
  assert.deepEqual(provinceDatasets[0]?.matrix, [
    [1, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
  ]);
});

test("getCanonicalMultiDatasets - generates 1D and 2D Dynamic Programming state datasets", () => {
  const coinDatasets = getCanonicalMultiDatasets("coin-change", "Coin Change", [
    "Dynamic Programming",
    "Breadth-First Search",
  ]);
  assert.equal(coinDatasets.length, 3);
  assert.deepEqual(coinDatasets[0]?.array, [1, 2, 5]);
  assert.equal(coinDatasets[0]?.target, 11);

  const lisDatasets = getCanonicalMultiDatasets("longest-increasing-subsequence", "LIS", [
    "Dynamic Programming",
    "Binary Search",
  ]);
  assert.equal(lisDatasets.length, 3);
  assert.deepEqual(lisDatasets[0]?.array, [10, 9, 2, 5, 3, 7, 101, 18]);

  const uniquePathsDatasets = getCanonicalMultiDatasets("unique-paths", "Unique Paths", [
    "Dynamic Programming",
    "Math",
  ]);
  assert.equal(uniquePathsDatasets.length, 3);
  assert.deepEqual(uniquePathsDatasets[0]?.matrix?.length, 3);
  assert.deepEqual(uniquePathsDatasets[1]?.matrix?.length, 4);

  const profitableSchemesDatasets = getCanonicalMultiDatasets("profitable-schemes", "Profitable Schemes", [
    "Dynamic Programming",
    "Array",
  ]);
  assert.equal(profitableSchemesDatasets.length, 3);
  assert.deepEqual(profitableSchemesDatasets[0]?.array, [2, 3, 5]);
  assert.deepEqual(profitableSchemesDatasets[0]?.secondaryArray, [6, 7, 8]);
  assert.equal(profitableSchemesDatasets[0]?.target, 5);
  assert.equal(profitableSchemesDatasets[0]?.k, 10);
  assert.deepEqual(profitableSchemesDatasets[1]?.array, [1, 2, 3, 4]);
  assert.deepEqual(profitableSchemesDatasets[1]?.secondaryArray, [2, 3, 5, 6]);
  assert.equal(profitableSchemesDatasets[1]?.target, 6);
  assert.equal(profitableSchemesDatasets[1]?.k, 7);
  assert.deepEqual(profitableSchemesDatasets[2]?.array, [2]);
  assert.deepEqual(profitableSchemesDatasets[2]?.secondaryArray, [3]);
  assert.equal(profitableSchemesDatasets[2]?.target, 5);
  assert.equal(profitableSchemesDatasets[2]?.k, 1);
});

test("Authentic Company Tags - problems have verified authentic company sources", async () => {
  const { problems, companies, companyLabel, companyCounts } = await import("./problems");
  assert.ok(problems.length > 1000, "Problems catalog loaded");
  assert.ok(companies.length > 40, "Over 40 authentic companies recognized");

  // Top companies should include tier-1 tech firms
  assert.ok(companies.includes("google"), "Includes Google");
  assert.ok(companies.includes("amazon"), "Includes Amazon");
  assert.ok(companies.includes("meta"), "Includes Meta");
  assert.ok(companies.includes("microsoft"), "Includes Microsoft");
  assert.ok(companies.includes("bloomberg"), "Includes Bloomberg");
  assert.ok(companies.includes("apple"), "Includes Apple");
  assert.ok(companies.includes("uber"), "Includes Uber");

  // Problem specific authentic verifications
  const twoSum = problems.find((p) => p.slug === "two-sum");
  assert.ok(twoSum, "Two sum exists");
  assert.ok(twoSum.companies.includes("amazon") || twoSum.companies.includes("google"), "Two sum tagged to real companies");

  const lruCache = problems.find((p) => p.slug === "lru-cache");
  assert.ok(lruCache, "LRU Cache exists");
  assert.ok(lruCache.companies.includes("amazon") || lruCache.companies.includes("meta") || lruCache.companies.includes("google"), "LRU cache verified company tag");

  // Verify companyLabel formatting
  assert.equal(companyLabel("google"), "Google");
  assert.equal(companyLabel("meta"), "Meta");
  assert.equal(companyLabel("goldman-sachs"), "Goldman Sachs");
  assert.equal(companyLabel("de-shaw"), "D.E. Shaw");
  assert.equal(companyLabel("two-sigma"), "Two Sigma");
  assert.equal(companyLabel("ibm"), "IBM");
  assert.equal(companyLabel("tcs"), "TCS");
  assert.equal(companyLabel("general-algorithms"), "Core Algorithms");

  // Verify company count values are positive numbers
  assert.ok((companyCounts["google"] ?? 0) > 500);
  assert.ok((companyCounts["amazon"] ?? 0) > 500);
});

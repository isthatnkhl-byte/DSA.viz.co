// @ts-nocheck
import raw from "../data/problems.json" with { type: "json" };
import statementsJson from "../data/statements.json" with { type: "json" };
import { classifyProblem } from "./problemClassifier";

const rawStatements = (statementsJson ?? {}) as Record<string, string>;

export type ProblemDatasetSpec = {
  name: string;
  type: VizType;
  role: "primary" | "auxiliary" | "secondary";
  label?: string;
  description?: string;
  defaultData?: number[] | string[] | (number | string | null)[] | (number | string)[][];
};

export type Problem = {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  companies: string[];
  freq: number;
  datasets?: ProblemDatasetSpec[];
};

export const problems = raw as Problem[];

export const TOTAL_PROBLEMS = problems.length;

export const companyCounts: Record<string, number> = problems.reduce((acc, p) => {
  for (const c of p.companies ?? []) {
    acc[c] = (acc[c] || 0) + 1;
  }
  return acc;
}, {} as Record<string, number>);

export const companies = Object.keys(companyCounts).sort((a, b) => {
  const diff = (companyCounts[b] ?? 0) - (companyCounts[a] ?? 0);
  if (diff !== 0) return diff;
  return a.localeCompare(b);
});

export const allTopics = Array.from(new Set(problems.flatMap((p) => p.topics))).sort();

const COMPANY_DISPLAY_NAMES: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  amazon: "Amazon",
  microsoft: "Microsoft",
  apple: "Apple",
  netflix: "Netflix",
  uber: "Uber",
  bloomberg: "Bloomberg",
  tiktok: "TikTok",
  bytedance: "ByteDance",
  linkedin: "LinkedIn",
  adobe: "Adobe",
  salesforce: "Salesforce",
  "goldman-sachs": "Goldman Sachs",
  "de-shaw": "D.E. Shaw",
  "two-sigma": "Two Sigma",
  "jane-street": "Jane Street",
  "morgan-stanley": "Morgan Stanley",
  citadel: "Citadel",
  stripe: "Stripe",
  openai: "OpenAI",
  databricks: "Databricks",
  snowflake: "Snowflake",
  nvidia: "NVIDIA",
  paypal: "PayPal",
  airbnb: "Airbnb",
  oracle: "Oracle",
  cisco: "Cisco",
  walmart: "Walmart",
  doordash: "DoorDash",
  instacart: "Instacart",
  robinhood: "Robinhood",
  coinbase: "Coinbase",
  snap: "Snapchat",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
  lyft: "Lyft",
  spotify: "Spotify",
  "booking-com": "Booking.com",
  ebay: "eBay",
  twitter: "X (Twitter)",
  ibm: "IBM",
  tcs: "TCS",
  infosys: "Infosys",
  phonepe: "PhonePe",
  wix: "Wix",
  zoho: "Zoho",
  oyo: "OYO",
  sap: "SAP",
  amd: "AMD",
  qualcomm: "Qualcomm",
  atlassian: "Atlassian",
  expedia: "Expedia",
  roblox: "Roblox",
  twilio: "Twilio",
  dropbox: "Dropbox",
  wayfair: "Wayfair",
  visa: "Visa",
  myntra: "Myntra",
  samsung: "Samsung",
  cognizant: "Cognizant",
  datadog: "Datadog",
  zomato: "Zomato",
  zscaler: "Zscaler",
  swiggy: "Swiggy",
  agoda: "Agoda",
  okta: "Okta",
  "capital-one": "Capital One",
  yandex: "Yandex",
  confluent: "Confluent",
  "general-algorithms": "Core Algorithms",
};

export const companyLabel = (c: string) => {
  if (!c) return "";
  const key = c.toLowerCase().trim();
  if (COMPANY_DISPLAY_NAMES[key]) return COMPANY_DISPLAY_NAMES[key];
  return c
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

export const problemBySlug = (slug: string): Problem | null => {
  if (!slug || typeof slug !== "string") return null;
  let s = "";
  try {
    s = decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, "");
  } catch {
    s = slug.toLowerCase().trim().replace(/\/+$/, "");
  }
  if (!s) return null;
  const normalized = s.replace(/_/g, "-").replace(/\s+/g, "-");
  const cleanAlphanumeric = normalized.replace(/[^a-z0-9]/g, "");

  const exact = problems.find(
    (p) =>
      p.slug === s ||
      p.slug === normalized ||
      p.slug.toLowerCase() === s ||
      p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") === normalized ||
      p.slug.replace(/[^a-z0-9]/g, "") === cleanAlphanumeric ||
      p.title.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanAlphanumeric,
  );
  if (exact) return exact;

  // Fuzzy substring or keyword match
  const fuzzy = problems.find((p) => {
    const pSlugClean = p.slug.replace(/[^a-z0-9]/g, "");
    return (
      (cleanAlphanumeric.length >= 4 && pSlugClean.includes(cleanAlphanumeric)) ||
      (pSlugClean.length >= 4 && cleanAlphanumeric.includes(pSlugClean))
    );
  });
  if (fuzzy) return fuzzy;

  // Graceful fallback problem generation so every valid slug loads seamlessly
  const generatedTitle = normalized
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    slug: normalized,
    title: generatedTitle || "Algorithm Challenge",
    difficulty: "Medium",
    topics: ["Algorithms", "Data Structures"],
    companies: ["General"],
    freq: 50,
  };
};

export const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`;

export type VizType =
  | "array"
  | "stack"
  | "queue"
  | "deque"
  | "linkedlist"
  | "graph"
  | "tree"
  | "bst"
  | "heap"
  | "hashmap"
  | "set"
  | "trie"
  | "matrix"
  | "dp"
  | "bit"
  | "math"
  | "recursion-tree"
  | "intervals";

export interface CallStackFrame {
  id: string;
  name: string;
  functionName?: string;
  depth: number;
  args: Record<string, any>;
  status: "active" | "base_case" | "backtracking" | "pruned" | "returned" | "memo_hit";
  returnValue?: any;
  pruneReason?: string;
  isMemoHit?: boolean;
}

export interface RecursionTreeNode {
  id: string;
  parentId: string | null;
  label: string;
  depth: number;
  state: "running" | "success" | "pruned" | "backtracked" | "memo_hit";
  decision?: string;
  returnValue?: any;
  pruneReason?: string;
  isMemoHit?: boolean;
}

export interface IntervalItem {
  id: string;
  start: number;
  end: number;
  label?: string;
  status?: "unprocessed" | "comparing" | "active" | "merged" | "finalized" | "conflict";
  lane?: number;
}

export interface Sightline {
  fromIdx: number;
  toIdx: number;
  resolved: boolean;
  type?: "next-greater" | "next-smaller";
  fromIndex?: number;
  toIndex?: number;
  resolvedValue?: number | string;
}

export interface HeapSwap {
  parentIdx: number;
  childIdx: number;
  reason: string;
  direction: "up" | "down" | "sift-up" | "sift-down";
  fromIndex?: number;
  toIndex?: number;
}

export type ShiftInfo = {
  from?: string | null;
  to?: string | null;
  action?:
    | "read"
    | "write"
    | "push"
    | "pop"
    | "lookup"
    | "compare"
    | "merge"
    | "shift"
    | "evict"
    | "swap"
    | string
    | null;
  reason?: string | null;
};

export type VizStep = {
  type?: VizType | null;
  /** Primary / Array 1 structures */
  array?: (number | string)[] | null;
  /** Secondary Array for multi-array comparisons (e.g. nums2, target array, buffer) */
  secondaryArray?: (number | string)[] | null;
  left2?: number | null;
  right2?: number | null;
  /** list style structures */
  list?: (number | string)[] | null;
  stack?: (number | string)[] | null;
  secondaryStack?: (number | string)[] | null;
  queue?: (number | string)[] | null;
  secondaryQueue?: (number | string)[] | null;
  deque?: (number | string)[] | null;
  /** graph / matrix */
  matrix?: (number | string)[][] | null;
  cols?: number | null;
  /** tree / bst / heap / trie as heap-indexed level-order arrays */
  tree?: (number | string | null)[] | null;
  activeNodeId?: number | string | null;
  /** hash map / set interfaces */
  map?: Record<string, number | string | null> | null;
  set?: (number | string)[] | null;
  trie?: (number | string | null)[] | null;
  /** shared markers */
  left?: number | null;
  right?: number | null;
  current?: number | string | null;
  targetIndex?: number | null;
  predecessor?: number | string | null;
  visited?: (number | string)[] | null;
  wSum?: number | null;
  mSum?: number | null;
  pointer_labels?: Record<string, string> | null;
  activePointers?: Record<string, number | string | [number, number] | null> | null;
  line: number;
  desc: string;
  /** Smart Multi-Dataset Metadata */
  activeDataset?: string | null;
  shiftInfo?: ShiftInfo | null;
  datasetLabels?: Record<string, string> | null;
  /** 2D Grid / Island specific enhancements */
  direction?: string | null;
  currentArea?: number | null;
  maxArea?: number | null;
  islandCells?: (string | [number, number])[] | null;
  /** Variable tracker state */
  variables?: Record<string, any> | null;
  /** Recursion / Backtracking call stack & tree */
  callStack?: CallStackFrame[] | null;
  recursionTree?: RecursionTreeNode[] | null;
  activeFrameId?: string | null;
  /** Live Memoization Cache */
  memoTable?: Record<string, any> | null;
  memoHitKey?: string | null;
  /** 1D Timeline Intervals */
  intervals?: IntervalItem[] | null;
  sweepLine?: number | null;
  /** Monotonic Stack enhancements */
  stackInvariant?: "increasing" | "decreasing" | null;
  sightlines?: Sightline[] | null;
  /** Binary Heap Sift-Up / Down swap */
  heapSwap?: HeapSwap | null;
};

/** Structured test dataset specification for multi-dataset algorithmic walkthroughs */
export interface TestDataset {
  id: string;
  label: string;
  description?: string;
  array?: (number | string)[];
  secondaryArray?: (number | string)[];
  matrix?: (number | string)[][];
  cols?: number;
  tree?: (number | string | null)[];
  target?: number | string;
  k?: number;
  pos?: number;
  hasCycle?: boolean;
  category?: "standard" | "longer" | "edge" | "complex" | "custom";
}

/** Deterministic pseudo-random from a string so each problem gets its own example. */
function seeded(slug: string) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Canonical sample inputs for standard problems to avoid pseudo-random number mismatches */
const CANONICAL_EXAMPLES: Record<string, (number | string | null)[]> = {
  "two-sum": [2, 7, 11, 15],
  "3sum": [-1, 0, 1, 2, -1, -4],
  "4sum": [1, 0, -1, 0, -2, 2],
  "contains-duplicate": [1, 2, 3, 1],
  "contains-duplicate-ii": [1, 2, 3, 1, 2, 3],
  "valid-anagram": [1, 2, 3],
  "group-anagrams": [1, 2, 3],
  "top-k-frequent-elements": [1, 1, 1, 2, 2, 3],
  "product-of-array-except-self": [1, 2, 3, 4],
  "maximum-subarray": [-2, 1, -3, 4, -1, 2, 1, -5, 4],
  "merge-intervals": [1, 3, 2, 6, 8, 10, 15, 18],
  "insert-interval": [1, 3, 6, 9],
  "search-in-rotated-sorted-array": [4, 5, 6, 7, 0, 1, 2],
  "find-minimum-in-rotated-sorted-array": [3, 4, 5, 1, 2],
  "container-with-most-water": [1, 8, 6, 2, 5, 4, 8, 3, 7],
  "trapping-rain-water": [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1],
  "best-time-to-buy-and-sell-stock": [7, 1, 5, 3, 6, 4],
  "longest-consecutive-sequence": [100, 4, 200, 1, 3, 2],
  "daily-temperatures": [73, 74, 75, 71, 69, 72, 76, 73],
  "design-hashmap": [1, 2, 3],
  "design-hashset": [1, 2, 3],
  "lru-cache": [1, 2, 3],
  "merge-sorted-array": [1, 2, 3, 0, 0, 0],
  "sort-colors": [2, 0, 2, 1, 1, 0],
  "remove-duplicates-from-sorted-array": [1, 1, 2],
  "move-zeroes": [0, 1, 0, 3, 12],
  "kth-largest-element-in-an-array": [3, 2, 1, 5, 6, 4],
  "house-robber": [1, 2, 3, 1],
  "profitable-schemes": [2, 3, 5],
  "coin-change": [1, 2, 5],
  "longest-increasing-subsequence": [10, 9, 2, 5, 3, 7, 101, 18],
  "longest-common-subsequence": [1, 2, 3, 4, 5],
  // Binary Trees & Tree Traversals
  "binary-tree-level-order-traversal": [3, 9, 20, null, null, 15, 7],
  "binary-tree-level-order-traversal-ii": [3, 9, 20, null, null, 15, 7],
  "binary-tree-zigzag-level-order-traversal": [3, 9, 20, null, null, 15, 7],
  "binary-tree-right-side-view": [1, 2, 3, null, 5, null, 4],
  "maximum-depth-of-binary-tree": [3, 9, 20, null, null, 15, 7],
  "invert-binary-tree": [4, 2, 7, 1, 3, 6, 9],
  "same-tree": [1, 2, 3],
  "symmetric-tree": [1, 2, 2, 3, 4, 4, 3],
  "kth-smallest-element-in-a-bst": [3, 1, 4, null, 2],
  "validate-binary-search-tree": [2, 1, 3],
  "lowest-common-ancestor-of-a-binary-search-tree": [6, 2, 8, 0, 4, 7, 9, null, null, 3, 5],
  "lowest-common-ancestor-of-a-binary-tree": [3, 5, 1, 6, 2, 0, 8, null, null, 7, 4],
  "binary-tree-inorder-traversal": [1, null, 2, 3],
  "binary-tree-preorder-traversal": [1, null, 2, 3],
  "binary-tree-postorder-traversal": [1, null, 2, 3],
  "path-sum": [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1],
  "diameter-of-binary-tree": [1, 2, 3, 4, 5],
  "balanced-binary-tree": [3, 9, 20, null, null, 15, 7],
  // Math & Others
  "powx-n": [2, 10],
  sqrtx: [8],
  "climbing-stairs": [5],
  // Queue & Simulation
  "reveal-cards-in-increasing-order": [17, 13, 11, 2, 3, 5, 7],
  "dota2-senate": ["R", "D", "D"],
  "design-circular-queue": [1, 2, 3, 4],
  "number-of-recent-calls": [1, 100, 3001, 3002],
  "time-needed-to-buy-tickets": [2, 3, 2],
};

/** Canonical 2D Matrix datasets for grid, island, and matrix algorithms */
export const CANONICAL_MATRICES: Record<string, (number | string)[][]> = {
  "max-area-of-island": [
    [0, 0, 1, 0, 0, 0],
    [0, 1, 1, 0, 1, 1],
    [0, 1, 1, 0, 1, 1],
    [0, 0, 0, 0, 1, 1],
    [1, 1, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0],
  ],
  "number-of-islands": [
    [1, 1, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 1],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 1, 0],
    [1, 0, 0, 1, 1, 0],
    [1, 1, 0, 0, 0, 1],
  ],
  "island-perimeter": [
    [0, 1, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ],
  "count-sub-islands": [
    [1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1, 1],
    [1, 1, 0, 1, 1, 1],
    [1, 0, 0, 1, 1, 0],
  ],
  "making-a-large-island": [
    [1, 0, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1],
    [1, 1, 0, 0, 1, 1],
    [0, 0, 0, 1, 1, 0],
    [1, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 1],
  ],
  "number-of-islands-ii": [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  "rotting-oranges": [
    [2, 1, 1, 0, 1, 1],
    [1, 1, 0, 1, 2, 1],
    [0, 1, 1, 1, 1, 0],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 2, 0, 1, 1],
    [0, 1, 1, 1, 1, 0],
  ],
  "flood-fill": [
    [1, 1, 1, 0, 0, 0],
    [1, 1, 0, 1, 1, 0],
    [1, 0, 1, 1, 1, 1],
    [0, 0, 1, 1, 0, 1],
    [1, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 0],
  ],
  "surrounded-regions": [
    ["X", "X", "X", "X", "X", "X"],
    ["X", "O", "O", "X", "O", "X"],
    ["X", "X", "O", "X", "O", "X"],
    ["X", "O", "X", "O", "X", "X"],
    ["X", "O", "O", "X", "X", "X"],
    ["X", "X", "X", "X", "X", "X"],
  ],
  "01-matrix": [
    [0, 0, 0, 1, 1, 1],
    [0, 1, 0, 1, 1, 0],
    [1, 1, 1, 0, 0, 0],
    [1, 1, 0, 1, 1, 1],
    [0, 0, 0, 1, 1, 0],
    [1, 1, 1, 0, 0, 0],
  ],
  "shortest-path-in-binary-matrix": [
    [0, 0, 0, 1, 0, 0],
    [1, 1, 0, 1, 1, 0],
    [1, 1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0],
    [0, 0, 0, 1, 0, 0],
    [1, 1, 0, 0, 0, 0],
  ],
  "walls-and-gates": [
    [2147483647, -1, 0, 2147483647],
    [2147483647, 2147483647, 2147483647, -1],
    [2147483647, -1, 2147483647, -1],
    [0, -1, 2147483647, 2147483647],
  ],
  "pacific-atlantic-water-flow": [
    [1, 2, 2, 3, 5, 4],
    [3, 2, 3, 4, 4, 3],
    [2, 4, 5, 3, 1, 2],
    [6, 7, 1, 4, 5, 3],
    [5, 1, 1, 2, 4, 2],
    [4, 2, 3, 5, 1, 4],
  ],
  "set-matrix-zeroes": [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ],
  "spiral-matrix": [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
  ],
  "rotate-image": [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ],
  "search-a-2d-matrix": [
    [1, 3, 5, 7],
    [10, 11, 16, 20],
    [23, 30, 34, 60],
  ],
  // Graph Adjacency Matrices
  "course-schedule": [
    [0, 1, 1, 0],
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 0],
  ],
  "course-schedule-ii": [
    [0, 1, 1, 0],
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 0],
  ],
  "clone-graph": [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
  ],
  "network-delay-time": [
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
    [0, 0, 0, 0],
  ],
  "is-graph-bipartite": [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
  ],
  "redundant-connection": [
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0],
  ],
  "find-the-town-judge": [
    [0, 0, 1],
    [0, 0, 1],
    [0, 0, 0],
  ],
  "all-paths-from-source-to-target": [
    [0, 1, 1, 0],
    [0, 0, 0, 1],
    [0, 0, 0, 1],
    [0, 0, 0, 0],
  ],
};

/** Helper to identify island and connected-component graph problems */
export function isIslandOrGridProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /island|area-of-island|max-area|flood-fill|rotting-oranges|surrounded-regions|walls-and-gates|pacific-atlantic|01-matrix|shortest-path-in-binary|making-a-large-island|count-sub-islands|as-far-from-land|number-of-enclaves|number-of-closed-islands|minesweeper/.test(
      s,
    ) || /number of islands|max area of island|flood fill/.test(t)
  );
}

/** Helper to identify 2D matrix transformation & in-place grid iteration problems */
export function isMatrixTransformationProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  if (isIslandOrGridProblem(slug, topics)) return false;
  return (
    /set-matrix-zeroes|rotate-image|spiral-matrix|spiral-matrix-ii|game-of-life|valid-sudoku|diagonal-traverse|reshape-the-matrix|matrix-block-sum|shift-2d-grid|transpose-matrix|toeplitz-matrix|image-overlap|flipping-an-image|lucky-numbers-in-a-matrix|search-a-2d-matrix|search-a-2d-matrix-ii|kth-smallest-element-in-a-sorted-matrix/.test(
      s,
    ) ||
    ((t.includes("matrix") || t.includes("grid")) &&
      !t.includes("depth-first search") &&
      !t.includes("breadth-first search") &&
      !t.includes("dynamic programming") &&
      !t.includes("graph"))
  );
}

/** Helper to identify dynamic / variable-size sliding window problems */
export function isDynamicSlidingWindowProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /longest-substring-without-repeating|minimum-window-substring|longest-repeating-character-replacement|permutation-in-string|max-consecutive-ones-iii|fruit-into-baskets|subarray-product-less-than-k|minimum-size-subarray-sum/.test(
      s,
    ) ||
    ((t.includes("sliding window") || t.includes("string")) &&
      /substring|longest-substring|window|repeating/i.test(s))
  );
}

/** Helper to identify same-direction in-place read/write / fast-slow pointer problems */
export function isInPlacePointerProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /remove-duplicates-from-sorted-array|remove-duplicates-from-sorted-array-ii|move-zeroes|remove-element|sort-colors|duplicate-zeros/.test(
      s,
    ) ||
    (t.includes("two pointers") && /remove|move|zero|duplicate/i.test(s))
  );
}

/** Helper to identify prefix sum and running sum complement problems */
export function isPrefixSumProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /subarray-sum-equals-k|contiguous-array|subarray-sums-divisible-by-k|range-sum-query-immutable|running-sum-of-1d-array|product-of-array-except-self|find-pivot-index/.test(
      s,
    ) || t.includes("prefix sum")
  );
}

/** Canonical matrix structure for 2D grid/island problems */
export function sampleMatrixFor(slug: string): (number | string)[][] {
  if (CANONICAL_MATRICES[slug]) {
    return CANONICAL_MATRICES[slug]!.map((r) => [...r]);
  }
  const isIsland = /island|flood|surround|rotting|enclave/.test(slug);
  if (isIsland) {
    return [
      [0, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 0, 1],
      [0, 0, 0, 1, 0, 1],
      [1, 1, 0, 0, 0, 0],
      [1, 1, 0, 1, 1, 1],
      [0, 1, 0, 1, 1, 1],
    ];
  }
  const rnd = seeded(slug);
  const rows = 4;
  const cols = 4;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 1 + Math.floor(rnd() * 99)),
  );
}

/** Helper to extract a string or character array example from a problem statement */
export function extractStringExampleFromStatement(slug: string): (number | string)[] | null {
  if (!slug) return null;
  const s = slug.toLowerCase().trim().replace(/\/+$/, "").replace(/_/g, "-");
  const statement = rawStatements[s] || "";
  if (!statement) return null;

  const ex1 = statement.split(/Example\s+2/i)[0] || statement;
  const match =
    ex1.match(/(?:Input:\s*(?:[a-zA-Z0-9_]+\s*=\s*)?"([^"\\]*(?:\\.[^"\\]*)*)")/i) ||
    ex1.match(/(?:[a-zA-Z0-9_]+\s*=\s*"([^"\\]*(?:\\.[^"\\]*)*)")/i);

  if (match?.[1] && match[1].length > 0) {
    return match[1].split("");
  }

  const arrayMatch =
    ex1.match(/(?:(?:words|strs|list1|list2|cpdomains|names|tokens)\s*=\s*(\[[^\]]+\]))/i) ||
    ex1.match(/Input:\s*(\[[^\]]+\])/i);

  if (arrayMatch?.[1]) {
    try {
      const parsed = JSON.parse(arrayMatch[1]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }
  return null;
}

/** A problem-specific sample input matching canonical problem statements where possible. */
export function sampleInputFor(slug: string, size?: number, topics: string[] = []): (number | string)[] {
  if (CANONICAL_MATRICES[slug]) {
    return CANONICAL_MATRICES[slug]!.flat().filter((x): x is number => typeof x === "number");
  }
  if (CANONICAL_EXAMPLES[slug]) {
    const rawEx = CANONICAL_EXAMPLES[slug]!;
    const filtered = rawEx.filter((x): x is number | string => x !== null);
    if (filtered.length > 0) return filtered;
  }

  const isString =
    topics.some((t) => /string/i.test(t)) ||
    /string|password|word|text|roman|palindrome|anagram|parenthes|capital|morse|subsequence|prefix/i.test(
      slug,
    );

  if (isString) {
    const fromStatement = extractStringExampleFromStatement(slug);
    if (fromStatement && fromStatement.length > 0) {
      return fromStatement;
    }
    return ["a", "b", "c", "a", "b", "c", "b", "b", "d", "e", "f", "a", "b", "c"];
  }

  const rnd = seeded(slug);
  const n = size ?? 10 + Math.floor(rnd() * 5);
  return Array.from({ length: n }, () => 1 + Math.floor(rnd() * 99));
}

/** Converts a LeetCode level-order tree array (BFS serialization) into a 0-indexed complete heap array */
export function normalizeLeetCodeTreeToHeap(
  nodes: (number | string | null)[],
): (number | string | null)[] {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];
  const rootVal = nodes[0];
  if (rootVal === null || rootVal === undefined || String(rootVal) === "null") return [];

  // Check if it is already a sparse complete heap array where non-null nodes match valid heap slots
  let needsConversion = false;
  for (let idx = 0; idx < nodes.length; idx++) {
    if (idx === 0) continue;
    const parentIdx = Math.floor((idx - 1) / 2);
    if (nodes[idx] !== null && (nodes[parentIdx] === null || nodes[parentIdx] === undefined)) {
      needsConversion = true;
      break;
    }
  }

  if (!needsConversion) {
    return [...nodes];
  }

  // Build binary tree from LeetCode BFS serialization
  class Node {
    val: number | string;
    left: Node | null = null;
    right: Node | null = null;
    constructor(val: number | string) {
      this.val = val;
    }
  }

  const root = new Node(rootVal);
  const queue: (Node | null)[] = [root];
  let i = 1;

  while (queue.length > 0 && i < nodes.length) {
    const curr = queue.shift();
    if (!curr) continue;

    if (i < nodes.length) {
      const leftVal = nodes[i++];
      if (leftVal !== null && leftVal !== undefined && String(leftVal) !== "null") {
        curr.left = new Node(leftVal);
        queue.push(curr.left);
      }
    }

    if (i < nodes.length) {
      const rightVal = nodes[i++];
      if (rightVal !== null && rightVal !== undefined && String(rightVal) !== "null") {
        curr.right = new Node(rightVal);
        queue.push(curr.right);
      }
    }
  }

  // Convert binary tree to 0-indexed heap array (up to depth 5 = 31 slots)
  const heap: (number | string | null)[] = [];
  function fillHeap(node: Node | null, idx: number) {
    if (!node || idx >= 31) return;
    heap[idx] = node.val;
    if (node.left) fillHeap(node.left, 2 * idx + 1);
    if (node.right) fillHeap(node.right, 2 * idx + 2);
  }
  fillHeap(root, 0);

  // Fill in null for any undefined slots before the last node
  for (let k = 0; k < heap.length; k++) {
    if (heap[k] === undefined) heap[k] = null;
  }

  return heap.length > 0 ? heap : [...nodes];
}

/** Canonical tree structure array with null nodes preserved */
export function sampleTreeFor(slug: string): (number | string | null)[] {
  if (CANONICAL_EXAMPLES[slug]) {
    return normalizeLeetCodeTreeToHeap(CANONICAL_EXAMPLES[slug]!);
  }
  const rnd = seeded(slug);
  return Array.from({ length: 15 }, () => 1 + Math.floor(rnd() * 99));
}

/** Identifies problems operating on two distinct sequences or arrays */
export function isTwoSequenceProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /profitable-schemes|0-1-knapsack|longest-common-subsequence|common-subsequence|edit-distance|merge-sorted-array|intersection-of-two|is-subsequence|find-the-difference|backspace-string|permutation-in-string|find-all-anagrams|minimum-window-substring/.test(
      s,
    ) ||
    /two arrays|two strings|intersection of two/.test(t)
  );
}

export const CANONICAL_DUAL_SEQUENCES: Record<
  string,
  {
    d1: { array: (number | string)[]; secondaryArray: (number | string)[]; target?: number | string; k?: number; desc?: string };
    d2: { array: (number | string)[]; secondaryArray: (number | string)[]; target?: number | string; k?: number; desc?: string };
    d3: { array: (number | string)[]; secondaryArray: (number | string)[]; target?: number | string; k?: number; desc?: string };
  }
> = {
  "profitable-schemes": {
    d1: {
      array: [2, 3, 5],
      secondaryArray: [6, 7, 8],
      target: 5,
      k: 10,
      desc: "Standard 0/1 Knapsack DP: n = 10 members, minProfit = 5, group = [2, 3, 5], profit = [6, 7, 8] -> 7 profitable schemes.",
    },
    d2: {
      array: [1, 2, 3, 4],
      secondaryArray: [2, 3, 5, 6],
      target: 6,
      k: 7,
      desc: "Extended 4-crime optimization: n = 7 members, minProfit = 6, group = [1, 2, 3, 4], profit = [2, 3, 5, 6] -> 11 profitable schemes.",
    },
    d3: {
      array: [2],
      secondaryArray: [3],
      target: 5,
      k: 1,
      desc: "Boundary unreachable profit: n = 1 member, minProfit = 5, group = [2], profit = [3] -> 0 schemes.",
    },
  },
  "longest-common-subsequence": {
    d1: {
      array: ["a", "b", "c", "d", "e"],
      secondaryArray: ["a", "c", "e"],
      desc: "Standard subsequence match: text1 = 'abcde', text2 = 'ace' (LCS: 'ace', length = 3).",
    },
    d2: {
      array: ["p", "r", "o", "g", "r", "a", "m", "m", "i", "n", "g"],
      secondaryArray: ["r", "a", "m", "i", "n", "g"],
      desc: "Extended 11×6 character alignment: text1 = 'programming', text2 = 'raming' (LCS: 'raming', length = 6).",
    },
    d3: {
      array: ["a", "b", "c"],
      secondaryArray: ["d", "e", "f"],
      desc: "Completely disjoint character sets: text1 = 'abc', text2 = 'def' (LCS: '', length = 0).",
    },
  },
  "edit-distance": {
    d1: {
      array: ["h", "o", "r", "s", "e"],
      secondaryArray: ["r", "o", "s"],
      desc: "Standard LeetCode example: word1 = 'horse', word2 = 'ros' (Edit Distance = 3).",
    },
    d2: {
      array: ["i", "n", "t", "e", "n", "t", "i", "o", "n"],
      secondaryArray: ["e", "x", "e", "c", "u", "t", "i", "o", "n"],
      desc: "Complex 9×9 transformation: word1 = 'intention', word2 = 'execution' (Edit Distance = 5).",
    },
    d3: {
      array: ["a"],
      secondaryArray: ["b"],
      desc: "Single character substitution boundary: word1 = 'a', word2 = 'b' (Edit Distance = 1).",
    },
  },
  "merge-sorted-array": {
    d1: {
      array: [1, 2, 3, 0, 0, 0],
      secondaryArray: [2, 5, 6],
      desc: "Standard in-place three-pointer merge: nums1 = [1,2,3,0,0,0], nums2 = [2,5,6].",
    },
    d2: {
      array: [1, 3, 5, 7, 9, 11, 0, 0, 0, 0, 0, 0],
      secondaryArray: [2, 4, 6, 8, 10, 12],
      desc: "Extended alternating sequence merge: nums1 = [1,3,5,7,9,11,...], nums2 = [2,4,6,8,10,12].",
    },
    d3: {
      array: [0],
      secondaryArray: [1],
      desc: "Single element boundary: nums1 = [0], nums2 = [1].",
    },
  },
  "intersection-of-two-arrays": {
    d1: {
      array: [1, 2, 2, 1],
      secondaryArray: [2, 2],
      desc: "Standard intersection: nums1 = [1,2,2,1], nums2 = [2,2] (Unique: [2]).",
    },
    d2: {
      array: [4, 9, 5, 4, 1, 8, 7],
      secondaryArray: [9, 4, 9, 8, 4],
      desc: "Multi-element intersection: nums1 = [4,9,5,4,1,8,7], nums2 = [9,4,9,8,4] (Unique: [4,9,8]).",
    },
    d3: {
      array: [1, 2, 3],
      secondaryArray: [4, 5, 6],
      desc: "Disjoint sets with zero overlapping elements: nums1 = [1,2,3], nums2 = [4,5,6] (Intersection: []).",
    },
  },
  "intersection-of-two-arrays-ii": {
    d1: {
      array: [1, 2, 2, 1],
      secondaryArray: [2, 2],
      desc: "Standard frequency intersection: nums1 = [1,2,2,1], nums2 = [2,2] (Result: [2,2]).",
    },
    d2: {
      array: [4, 9, 5, 4, 4, 8, 9],
      secondaryArray: [9, 4, 9, 8, 4],
      desc: "Multi-count intersection: nums1 = [4,9,5,4,4,8,9], nums2 = [9,4,9,8,4] (Result: [4,4,9,8]).",
    },
    d3: {
      array: [1, 2, 3],
      secondaryArray: [4, 5, 6],
      desc: "Disjoint sets: nums1 = [1,2,3], nums2 = [4,5,6] (Result: []).",
    },
  },
  "is-subsequence": {
    d1: {
      array: ["a", "b", "c"],
      secondaryArray: ["a", "h", "b", "g", "d", "c"],
      desc: "True subsequence: s = 'abc', t = 'ahbgdc' (All characters found in order).",
    },
    d2: {
      array: ["a", "c", "e"],
      secondaryArray: ["a", "b", "c", "d", "e", "f", "g", "h"],
      desc: "Sparse matching across long text: s = 'ace', t = 'abcdefgh'.",
    },
    d3: {
      array: ["a", "x", "c"],
      secondaryArray: ["a", "h", "b", "g", "d", "c"],
      desc: "False subsequence (character 'x' absent): s = 'axc', t = 'ahbgdc'.",
    },
  },
  "find-the-difference": {
    d1: {
      array: ["a", "b", "c", "d"],
      secondaryArray: ["a", "b", "c", "d", "e"],
      desc: "Single added character: s = 'abcd', t = 'abcde' (Added: 'e').",
    },
    d2: {
      array: ["a", "a", "b", "c", "d", "e"],
      secondaryArray: ["a", "b", "c", "a", "d", "e", "x"],
      desc: "Shuffled duplicate characters: s = 'aabcde', t = 'abcadex' (Added: 'x').",
    },
    d3: {
      array: [""],
      secondaryArray: ["y"],
      desc: "Empty source string boundary: s = '', t = 'y' (Added: 'y').",
    },
  },
  "backspace-string-compare": {
    d1: {
      array: ["a", "b", "#", "c"],
      secondaryArray: ["a", "d", "#", "c"],
      desc: "Equal after backspaces: s = 'ab#c' -> 'ac', t = 'ad#c' -> 'ac'.",
    },
    d2: {
      array: ["a", "#", "c", "#", "d", "e"],
      secondaryArray: ["d", "e"],
      desc: "Multiple consecutive backspaces: s = 'a#c#de' -> 'de', t = 'de'.",
    },
    d3: {
      array: ["a", "b", "#", "c"],
      secondaryArray: ["b"],
      desc: "Mismatched final strings: s = 'ab#c' -> 'ac', t = 'b'.",
    },
  },
};

/** Identifies interval and range span problems */
export function isIntervalProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /interval|merge-intervals|insert-interval|non-overlapping-intervals|meeting-room|arrows-to-burst|summary-range|my-calendar/.test(
      s,
    ) ||
    /interval|range|meeting room|sweep-line/.test(t)
  );
}

export const CANONICAL_INTERVALS: Record<
  string,
  {
    d1: { matrix: number[][]; target?: number | string; desc: string };
    d2: { matrix: number[][]; target?: number | string; desc: string };
    d3: { matrix: number[][]; target?: number | string; desc: string };
  }
> = {
  "merge-intervals": {
    d1: {
      matrix: [
        [1, 3],
        [2, 6],
        [8, 10],
        [15, 18],
      ],
      desc: "Standard intervals with partial overlap: [1,3] and [2,6] merge into [1,6] (Result: [[1,6], [8,10], [15,18]]).",
    },
    d2: {
      matrix: [
        [1, 4],
        [2, 5],
        [4, 7],
        [8, 10],
        [9, 12],
        [11, 15],
        [16, 18],
      ],
      desc: "Extended 7-interval multi-chain merge: [[1,4],[2,5],[4,7]] -> [1,7], [[8,10],[9,12],[11,15]] -> [8,15].",
    },
    d3: {
      matrix: [
        [1, 4],
        [4, 5],
      ],
      desc: "Touching boundary intervals: [1,4] and [4,5] share endpoint 4 -> merge into [1,5].",
    },
  },
  "insert-interval": {
    d1: {
      matrix: [
        [1, 3],
        [6, 9],
      ],
      target: "[2, 5]",
      desc: "Insert newInterval = [2,5] into [[1,3], [6,9]] -> merges into [[1,5], [6,9]].",
    },
    d2: {
      matrix: [
        [1, 2],
        [3, 5],
        [6, 7],
        [8, 10],
        [12, 16],
      ],
      target: "[4, 8]",
      desc: "Insert newInterval = [4,8] bridging multiple intervals -> merges into [[1,2], [3,10], [12,16]].",
    },
    d3: {
      matrix: [
        [1, 5],
      ],
      target: "[6, 8]",
      desc: "Disjoint non-overlapping insert at end: [[1,5]] + [6,8] -> [[1,5], [6,8]].",
    },
  },
  "non-overlapping-intervals": {
    d1: {
      matrix: [
        [1, 2],
        [2, 3],
        [3, 4],
        [1, 3],
      ],
      desc: "Standard greedy interval scheduling: remove 1 interval [1,3] to make the rest non-overlapping.",
    },
    d2: {
      matrix: [
        [1, 100],
        [11, 22],
        [1, 11],
        [2, 12],
        [23, 30],
        [30, 40],
      ],
      desc: "Extended interval conflict set testing earliest end-time greedy removal.",
    },
    d3: {
      matrix: [
        [1, 2],
        [1, 2],
        [1, 2],
      ],
      desc: "Identical duplicate intervals: remove 2 duplicates leaving [[1,2]].",
    },
  },
  "meeting-rooms": {
    d1: {
      matrix: [
        [0, 30],
        [5, 10],
        [15, 20],
      ],
      desc: "Overlapping meetings: [0,30] conflicts with [5,10] -> false (cannot attend all meetings).",
    },
    d2: {
      matrix: [
        [1, 4],
        [5, 8],
        [9, 12],
        [13, 16],
        [17, 20],
      ],
      desc: "Disjoint sequential meetings: all 5 intervals non-overlapping -> true (can attend all).",
    },
    d3: {
      matrix: [
        [7, 10],
        [2, 4],
      ],
      desc: "Unsorted disjoint meetings: after sorting [2,4], [7,10] -> true.",
    },
  },
  "meeting-rooms-ii": {
    d1: {
      matrix: [
        [0, 30],
        [5, 10],
        [15, 20],
      ],
      desc: "Standard min conference rooms: max overlapping concurrency = 2 rooms.",
    },
    d2: {
      matrix: [
        [1, 10],
        [2, 7],
        [3, 19],
        [8, 12],
        [10, 20],
        [11, 30],
      ],
      desc: "High concurrency meeting schedule requiring min 4 simultaneous conference rooms.",
    },
    d3: {
      matrix: [
        [7, 10],
        [2, 4],
      ],
      desc: "Sequential non-overlapping meetings requiring only 1 room.",
    },
  },
  "minimum-number-of-arrows-to-burst-balloons": {
    d1: {
      matrix: [
        [10, 16],
        [2, 8],
        [1, 6],
        [7, 12],
      ],
      desc: "Standard balloon intervals: sorted [[1,6],[2,8],[7,12],[10,16]] -> requires 2 arrows (at x=6 and x=12).",
    },
    d2: {
      matrix: [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
        [9, 10],
      ],
      desc: "Disjoint balloon sequence requiring 5 individual arrows.",
    },
    d3: {
      matrix: [
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
      ],
      desc: "Touching balloon boundaries sharing integer endpoints.",
    },
  },
};

/** Identifies bit manipulation, binary, and XOR algorithmic problems */
export function isBitManipulationProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /single-number|number-of-1-bits|counting-bits|reverse-bits|missing-number|power-of-two|power-of-four|bitwise|sum-of-two-integers|hamming-distance/.test(
      s,
    ) ||
    /bit manipulation|bits|binary|bitwise/.test(t)
  );
}

export const CANONICAL_BIT_DATASETS: Record<
  string,
  {
    d1: { array: number[]; target?: number; desc: string };
    d2: { array: number[]; target?: number; desc: string };
    d3: { array: number[]; target?: number; desc: string };
  }
> = {
  "single-number": {
    d1: {
      array: [4, 1, 2, 1, 2],
      desc: "Standard XOR cancellation: nums = [4, 1, 2, 1, 2] -> 1^1=0, 2^2=0, unique element is 4.",
    },
    d2: {
      array: [7, 3, 5, 4, 5, 3, 4, 9, 8, 8, 9, 12, 7, 15, 12],
      desc: "Extended 15-element array with 7 canceling pairs and single unique element 15.",
    },
    d3: {
      array: [1],
      desc: "Single-element boundary array: nums = [1] -> unique element is 1.",
    },
  },
  "single-number-ii": {
    d1: {
      array: [2, 2, 3, 2],
      desc: "Triplicate elements with single unique value: nums = [2, 2, 3, 2] -> unique element is 3.",
    },
    d2: {
      array: [0, 1, 0, 1, 0, 1, 99],
      desc: "Multiple triplicate groups with single unique value 99.",
    },
    d3: {
      array: [-2, -2, 1, 1, 4, 1, -2],
      desc: "Triplicates containing negative numbers and unique element 4.",
    },
  },
  "number-of-1-bits": {
    d1: {
      array: [11], // 0b1011 -> 3 set bits
      target: 11,
      desc: "Standard Hamming weight: n = 11 (binary 00000000000000000000000000001011) has 3 set bits.",
    },
    d2: {
      array: [128], // 0b10000000 -> 1 set bit
      target: 128,
      desc: "Single high-order set bit: n = 128 (binary 00000000000000000000000010000000) has 1 set bit.",
    },
    d3: {
      array: [2147483645],
      target: 2147483645,
      desc: "Large 32-bit integer boundary with 30 set bits.",
    },
  },
  "counting-bits": {
    d1: {
      array: [0, 1, 2, 3, 4, 5],
      target: 5,
      desc: "Standard range n = 5: computes [0, 1, 1, 2, 1, 2] using bit shift relation ans[i] = ans[i >> 1] + (i & 1).",
    },
    d2: {
      array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      target: 15,
      desc: "Extended range n = 15 across complete 4-bit nibble space.",
    },
    d3: {
      array: [0],
      target: 0,
      desc: "Zero boundary case: n = 0 -> [0].",
    },
  },
  "missing-number": {
    d1: {
      array: [3, 0, 1],
      desc: "Standard missing number: range [0..3], array [3, 0, 1] -> missing 2 (via XOR cancellation).",
    },
    d2: {
      array: [9, 6, 4, 2, 3, 5, 7, 0, 1],
      desc: "Extended range [0..9] with missing number 8.",
    },
    d3: {
      array: [0, 1],
      desc: "Missing boundary number at the end of range: [0, 1] -> missing 2.",
    },
  },
  "reverse-bits": {
    d1: {
      array: [43261596],
      target: 43261596,
      desc: "Standard 32-bit reversal: input 43261596 (0b00000010100101000001111010011100) -> 964176192.",
    },
    d2: {
      array: [2147483648],
      target: 2147483648,
      desc: "Highest bit reversal: input 2147483648 (0b1000...0000) -> 1 (0b0000...0001).",
    },
    d3: {
      array: [1],
      target: 1,
      desc: "Lowest bit reversal: input 1 (0b0000...0001) -> 2147483648 (0b1000...0000).",
    },
  },
  "power-of-two": {
    d1: {
      array: [16],
      target: 16,
      desc: "True power of two: n = 16 (0b10000) -> (n & (n - 1)) == (16 & 15) == 0 -> true.",
    },
    d2: {
      array: [1024],
      target: 1024,
      desc: "Large power of two: n = 1024 (0b10000000000) -> true.",
    },
    d3: {
      array: [0],
      target: 0,
      desc: "Non-positive boundary: n = 0 -> false.",
    },
  },
};

/** Identifies Trie (Prefix Tree) word dictionary problems */
export function isTrieProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /trie|prefix-tree|implement-trie|word-dictionary|replace-words|longest-word-in-dictionary|map-sum-pairs|stream-of-characters/.test(
      s,
    ) || /trie|prefix tree/.test(t)
  );
}

export const CANONICAL_TRIE_DATASETS: Record<
  string,
  {
    d1: { array: string[]; target?: string; desc: string };
    d2: { array: string[]; target?: string; desc: string };
    d3: { array: string[]; target?: string; desc: string };
  }
> = {
  "implement-trie-prefix-tree": {
    d1: {
      array: ["apple", "app", "applause", "apt", "bat"],
      target: "app",
      desc: "Standard word bank with shared prefixes: 'app' is prefix of 'apple' and 'applause'. Includes startsWith('app') and search('apt').",
    },
    d2: {
      array: ["code", "coder", "coding", "cool", "data", "database", "date", "day"],
      target: "coder",
      desc: "Extended 8-word hierarchical vocabulary with multi-branch prefix trees ('co-' and 'da-').",
    },
    d3: {
      array: ["a", "aa", "aaa", "ab", "b"],
      target: "ac",
      desc: "Single-character branches, repetitive prefix chains, and non-existent search targets ('ac').",
    },
  },
  "design-add-and-search-words-data-structure": {
    d1: {
      array: ["bad", "dad", "mad", "pad"],
      target: ".ad",
      desc: "Standard dictionary with wildcard search: search('.ad') matches 'bad', 'dad', 'mad', and 'pad'.",
    },
    d2: {
      array: ["apple", "apply", "ample", "apt", "ball", "base", "bat"],
      target: "a..le",
      desc: "Extended dictionary with multi-character wildcard search: search('a..le') matches 'apple' and 'ample'.",
    },
    d3: {
      array: ["a", "ab", "abc"],
      target: "....",
      desc: "Wildcard search longer than any stored word in the Trie -> returns false.",
    },
  },
  "replace-words": {
    d1: {
      array: ["cat", "bat", "rat"],
      target: "the cattle was rattled by the battery",
      desc: "Root replacement: 'cattle' -> 'cat', 'rattled' -> 'rat', 'battery' -> 'bat'.",
    },
    d2: {
      array: ["a", "b", "c"],
      target: "aadsfasf absbs bbab cadsfafs",
      desc: "Shortest single-character prefix replacement across all words.",
    },
    d3: {
      array: ["catt", "cat", "bat", "rat"],
      target: "the cattle was rattled",
      desc: "Multiple matching prefixes ('cat' vs 'catt') -> chooses shortest root 'cat'.",
    },
  },
  "longest-word-in-dictionary": {
    d1: {
      array: ["w", "wo", "wor", "worl", "world"],
      target: "world",
      desc: "Complete prefix chain: each prefix exists in dictionary building up to 'world'.",
    },
    d2: {
      array: ["a", "banana", "app", "appl", "ap", "apply", "apple"],
      target: "apple",
      desc: "Multiple candidate chains: lexicographical comparison between 'apple' and 'apply'.",
    },
    d3: {
      array: ["m", "mo", "moc", "moch", "mocha", "l", "la", "lat", "latt", "latte"],
      target: "latte",
      desc: "Equal-length word chains: 'latte' beats 'mocha' lexicographically.",
    },
  },
};

/** Identifies Top-K, Heap, Priority Queue, and Streaming algorithmic problems */
export function isHeapProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /kth-largest|top-k|median-from-data-stream|k-closest|merge-k-sorted|task-scheduler|reorganize-string|last-stone-weight|sliding-window-median|seat-reservation|furthest-building/.test(
      s,
    ) || /heap|priority queue|top-k|streaming/.test(t)
  );
}

export const CANONICAL_HEAP_DATASETS: Record<
  string,
  {
    d1: { array: number[]; k?: number; target?: number; desc: string };
    d2: { array: number[]; k?: number; target?: number; desc: string };
    d3: { array: number[]; k?: number; target?: number; desc: string };
  }
> = {
  "kth-largest-element-in-an-array": {
    d1: {
      array: [3, 2, 1, 5, 6, 4],
      k: 2,
      target: 2,
      desc: "Standard min-heap of size k=2: keeps 2 largest elements [5, 6] -> 2nd largest is 5.",
    },
    d2: {
      array: [3, 2, 3, 1, 2, 4, 5, 5, 6, 7, 7, 8, 2, 3, 1],
      k: 4,
      target: 4,
      desc: "Extended 15-element stream maintaining top k=4 values [6, 7, 7, 8] -> 4th largest is 6.",
    },
    d3: {
      array: [2, 2, 2, 2],
      k: 2,
      target: 2,
      desc: "Duplicate values boundary: nums = [2, 2, 2, 2], k = 2 -> 2nd largest is 2.",
    },
  },
  "find-median-from-data-stream": {
    d1: {
      array: [5, 2, 8, 1, 9, 3],
      desc: "Standard stream: dual-heap balances small max-heap and large min-heap, yielding medians [5, 3.5, 5, 3.5, 5, 4].",
    },
    d2: {
      array: [12, 4, 5, 3, 8, 7, 10, 1, 15, 6],
      desc: "Extended 10-number stream with dynamic odd/even heap rebalancing on every insertion.",
    },
    d3: {
      array: [1, 2, 3, 4, 5],
      desc: "Monotonically increasing stream testing continuous rightward heap balancing.",
    },
  },
  "last-stone-weight": {
    d1: {
      array: [2, 7, 4, 1, 8, 1],
      desc: "Standard max-heap: smash 8 and 7 -> 1, smash 4 and 2 -> 2, smash 2 and 1 -> 1, smash 1 and 1 -> 0, last stone = 1.",
    },
    d2: {
      array: [9, 8, 7, 6, 5, 4, 3, 2, 1],
      desc: "Extended 9-stone countdown cascade leaving single final stone.",
    },
    d3: {
      array: [1],
      desc: "Single-stone boundary: immediately returns 1.",
    },
  },
  "k-closest-points-to-origin": {
    d1: {
      array: [1, 3, -2, 2],
      k: 1,
      target: 1,
      desc: "Standard max-heap of size k=1: distance comparison d([1,3])=10 vs d([-2,2])=8 -> [-2,2].",
    },
    d2: {
      array: [3, 3, 5, -1, -2, 4],
      k: 2,
      target: 2,
      desc: "Extended 3-point set selecting k=2 closest points.",
    },
    d3: {
      array: [0, 1],
      k: 1,
      target: 1,
      desc: "Single point boundary at origin distance 1.",
    },
  },
  "top-k-frequent-elements": {
    d1: {
      array: [1, 1, 1, 2, 2, 3],
      k: 2,
      target: 2,
      desc: "Standard frequency min-heap: counts {1:3, 2:2, 3:1}, top k=2 frequent are [1, 2].",
    },
    d2: {
      array: [4, 1, -1, 2, -1, 2, 3, 4, 4, 4, 2, 2],
      k: 3,
      target: 3,
      desc: "Extended multi-frequency distribution selecting top k=3 elements.",
    },
    d3: {
      array: [1],
      k: 1,
      target: 1,
      desc: "Single-element boundary: returns [1].",
    },
  },
};

/** Identifies Union-Find / Disjoint Set Union (DSU) algorithmic problems */
export function isUnionFindProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    !/island|area-of-island|max-area|flood-fill|rotting-oranges|surrounded-regions/.test(s) &&
    (/redundant-connection|number-of-provinces|accounts-merge|satisfiability-of-equality|earliest-moment|graph-valid-tree|number-of-operations-to-make-network-connected|min-cost-to-connect/.test(
      s,
    ) || /union[- ]?find|disjoint[- ]?set|dsu/.test(t))
  );
}

export const CANONICAL_UNION_FIND_DATASETS: Record<
  string,
  {
    d1: { matrix?: number[][]; array?: (number | string)[]; desc: string };
    d2: { matrix?: number[][]; array?: (number | string)[]; desc: string };
    d3: { matrix?: number[][]; array?: (number | string)[]; desc: string };
  }
> = {
  "redundant-connection": {
    d1: {
      matrix: [
        [1, 2],
        [1, 3],
        [2, 3],
      ],
      desc: "Standard 3-node cycle: edges [[1,2], [1,3], [2,3]] -> edge [2,3] connects already-connected components -> redundant edge [2,3].",
    },
    d2: {
      matrix: [
        [1, 2],
        [2, 3],
        [3, 4],
        [1, 4],
        [1, 5],
      ],
      desc: "Extended 5-node graph: edge [1,4] creates cycle in {1,2,3,4} -> redundant edge [1,4].",
    },
    d3: {
      matrix: [
        [1, 2],
        [2, 3],
        [3, 1],
      ],
      desc: "Simple 3-cycle boundary: edge [3,1] creates cycle -> redundant edge [3,1].",
    },
  },
  "number-of-provinces": {
    d1: {
      matrix: [
        [1, 1, 0],
        [1, 1, 0],
        [0, 0, 1],
      ],
      desc: "Standard 3-city network: city 0 and 1 are connected, city 2 is separate -> 2 provinces.",
    },
    d2: {
      matrix: [
        [1, 1, 0, 0, 0, 0],
        [1, 1, 1, 0, 0, 0],
        [0, 1, 1, 0, 0, 0],
        [0, 0, 0, 1, 1, 0],
        [0, 0, 0, 1, 1, 0],
        [0, 0, 0, 0, 0, 1],
      ],
      desc: "Extended 6-city graph with 3 disjoint provinces: {0,1,2}, {3,4}, and {5}.",
    },
    d3: {
      matrix: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      desc: "Fully disconnected boundary: each city is its own province -> 3 provinces.",
    },
  },
  "satisfiability-of-equality-equations": {
    d1: {
      array: ["a==b", "b==c", "a==c"],
      desc: "Standard consistent equality: a==b and b==c union a, b, c into one component -> a==c holds true.",
    },
    d2: {
      array: ["a==b", "b==c", "d==e", "e==f", "a==e", "c!=f"],
      desc: "Extended equality equation chain resolving contradiction between component {a,b,c,d,e,f} and c!=f -> false.",
    },
    d3: {
      array: ["a!=a"],
      desc: "Single-equation direct contradiction: a!=a -> false.",
    },
  },
  "graph-valid-tree": {
    d1: {
      matrix: [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 4],
      ],
      desc: "Valid 5-node tree: 4 edges, 0 cycles, 1 connected component -> true.",
    },
    d2: {
      matrix: [
        [0, 1],
        [1, 2],
        [2, 3],
        [1, 3],
        [1, 4],
      ],
      desc: "Invalid tree containing cycle {1,2,3} -> false.",
    },
    d3: {
      matrix: [],
      desc: "Single node boundary with 0 edges -> valid tree (true).",
    },
  },
};

/** Identifies Topological Sort & Directed Acyclic Graph (DAG) ordering problems */
export function isTopologicalSortProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /alien-dictionary|course-schedule|course-schedule-ii|alien-order|minimum-height-trees|find-eventual-safe-states|all-ancestors-of-a-node|parallel-courses|sequence-reconstruction/.test(
      s,
    ) || /topological sort|topological/i.test(t)
  );
}

export const CANONICAL_TOPOLOGICAL_DATASETS: Record<
  string,
  {
    d1: { array?: (number | string)[]; matrix?: (number | string)[][]; target?: number | string; desc: string };
    d2: { array?: (number | string)[]; matrix?: (number | string)[][]; target?: number | string; desc: string };
    d3: { array?: (number | string)[]; matrix?: (number | string)[][]; target?: number | string; desc: string };
  }
> = {
  "alien-dictionary": {
    d1: {
      array: ["wrt", "wrf", "er", "ett", "rftt"],
      matrix: [
        ["w", "e"],
        ["e", "r"],
        ["r", "t"],
        ["t", "f"],
      ],
      desc: "Standard 5-word lexicon: adjacent comparisons build DAG edges w➔e➔r➔t➔f resolving unique sequence 'wertf'.",
    },
    d2: {
      array: ["caa", "aaa", "aab", "aba"],
      matrix: [
        ["c", "a"],
        ["a", "b"],
      ],
      desc: "Extended 4-word dictionary testing branch relations: c➔a➔b (Valid Alien Order: 'cab').",
    },
    d3: {
      array: ["abc", "ab"],
      matrix: [],
      desc: "Invalid prefix edge-case: 'abc' appears before shorter prefix 'ab' ➔ illegal lexicographical ordering (returns '').",
    },
  },
  "course-schedule": {
    d1: {
      matrix: [
        [1, 0],
        [2, 0],
        [3, 1],
        [3, 2],
      ],
      target: 4,
      desc: "Standard 4-course curriculum: course 0 unlocks courses 1 & 2, which unlock course 3 -> can finish (true).",
    },
    d2: {
      matrix: [
        [1, 0],
        [2, 0],
        [3, 1],
        [4, 2],
        [5, 3],
        [5, 4],
      ],
      target: 6,
      desc: "Extended 6-course multi-track prerequisite graph verifying deep topological dependency resolution.",
    },
    d3: {
      matrix: [
        [1, 0],
        [0, 1],
      ],
      target: 2,
      desc: "Direct mutual dependency cycle: course 1 requires 0, course 0 requires 1 -> deadlock cycle (false).",
    },
  },
  "course-schedule-ii": {
    d1: {
      matrix: [
        [1, 0],
        [2, 0],
        [3, 1],
        [3, 2],
      ],
      target: 4,
      desc: "Standard course ordering: Kahn's BFS resolves sequence [0, 1, 2, 3] (or [0, 2, 1, 3]).",
    },
    d2: {
      matrix: [
        [1, 0],
        [2, 0],
        [3, 1],
        [4, 2],
        [5, 3],
        [5, 4],
      ],
      target: 6,
      desc: "Extended 6-course sequence resolving all prerequisite constraints -> valid schedule [0, 1, 2, 3, 4, 5].",
    },
    d3: {
      matrix: [
        [1, 0],
        [0, 1],
      ],
      target: 2,
      desc: "Cyclic dependency deadlock: impossible schedule returns empty array [].",
    },
  },
};

/** Identifies Word Ladder & BFS Word Transformation Graph problems */
export function isWordLadderProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  return /word-ladder|word-ladder-ii|minimum-genetic-mutation|open-the-lock/.test(s);
}

export const CANONICAL_WORD_LADDER_DATASETS: Record<
  string,
  {
    d1: { array: string[]; target: string; matrix?: string[][]; desc: string };
    d2: { array: string[]; target: string; matrix?: string[][]; desc: string };
    d3: { array: string[]; target: string; matrix?: string[][]; desc: string };
  }
> = {
  "word-ladder": {
    d1: {
      array: ["hit", "hot", "dot", "dog", "lot", "log", "cog"],
      target: "cog",
      matrix: [
        ["hit", "hot"],
        ["hot", "dot"],
        ["hot", "lot"],
        ["dot", "dog"],
        ["lot", "log"],
        ["dog", "cog"],
        ["log", "cog"],
      ],
      desc: "Standard 6-word lexicon: beginWord 'hit' ➔ 'hot' ➔ 'dot' ➔ 'dog' ➔ 'cog' (Shortest sequence length = 5).",
    },
    d2: {
      array: ["cat", "cot", "dot", "dog", "cog", "log", "lag", "sag"],
      target: "sag",
      matrix: [
        ["cat", "cot"],
        ["cot", "dot"],
        ["dot", "dog"],
        ["dog", "cog"],
        ["dog", "log"],
        ["cog", "log"],
        ["log", "lag"],
        ["lag", "sag"],
      ],
      desc: "Extended 8-word branching network: 'cat' ➔ 'cot' ➔ 'dot' ➔ 'dog' ➔ 'log' ➔ 'lag' ➔ 'sag' (Shortest sequence length = 7).",
    },
    d3: {
      array: ["hit", "hot", "dot", "dog", "lot", "log"],
      target: "cog",
      matrix: [
        ["hit", "hot"],
        ["hot", "dot"],
        ["hot", "lot"],
        ["dot", "dog"],
        ["lot", "log"],
      ],
      desc: "Unreachable target edge-case: target word 'cog' does not exist in wordList ➔ BFS search returns 0.",
    },
  },
  "minimum-genetic-mutation": {
    d1: {
      array: ["AACCGGTT", "AACCGGTA", "AACCGCTA", "AAACGGTA"],
      target: "AACCGCTA",
      matrix: [
        ["AACCGGTT", "AACCGGTA"],
        ["AACCGGTA", "AACCGCTA"],
        ["AACCGGTA", "AAACGGTA"],
      ],
      desc: "Gene mutation sequence: 'AACCGGTT' ➔ 'AACCGGTA' ➔ 'AACCGCTA' (Min mutations = 2).",
    },
    d2: {
      array: ["AAAAACCC", "AACCCCCC", "AAACCCCC", "AACACCCC"],
      target: "AACCCCCC",
      matrix: [
        ["AAAAACCC", "AAACCCCC"],
        ["AAACCCCC", "AACACCCC"],
        ["AAACCCCC", "AACCCCCC"],
      ],
      desc: "Multi-branch gene bank resolving shortest 3-mutation trajectory to target.",
    },
    d3: {
      array: ["AACCGGTT", "AACCGGTA", "AAACGGTA"],
      target: "TTTTTTTT",
      matrix: [
        ["AACCGGTT", "AACCGGTA"],
        ["AACCGGTA", "AAACGGTA"],
      ],
      desc: "Unreachable target DNA string not present in gene bank ➔ returns -1.",
    },
  },
};

/** Identifies 1D and 2D Dynamic Programming algorithmic problems */
export function isDpProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /profitable-schemes|0-1-knapsack|knapsack|climb|house-robber|fibonacci|min-cost-climbing|coin-change|word-break|decode-ways|jump-game|longest-increasing-subsequence|\blis\b|unique-paths|minimum-path-sum|maximal-square|partition-equal-subset|target-sum|edit-distance|maximum-subarray|longest-palindromic-subsequence/.test(
      s,
    ) || /dynamic programming|memoization/.test(t)
  );
}

export const CANONICAL_DP_DATASETS: Record<
  string,
  {
    d1: { array?: (number | string)[]; secondaryArray?: (number | string)[]; matrix?: number[][]; target?: number | string; k?: number; desc: string };
    d2: { array?: (number | string)[]; secondaryArray?: (number | string)[]; matrix?: number[][]; target?: number | string; k?: number; desc: string };
    d3: { array?: (number | string)[]; secondaryArray?: (number | string)[]; matrix?: number[][]; target?: number | string; k?: number; desc: string };
  }
> = {
  "profitable-schemes": {
    d1: {
      array: [2, 3, 5],
      secondaryArray: [6, 7, 8],
      target: 5,
      k: 10,
      desc: "Standard 0/1 Knapsack DP: n = 10 members, minProfit = 5, group = [2, 3, 5], profit = [6, 7, 8] -> 7 profitable schemes.",
    },
    d2: {
      array: [1, 2, 3, 4],
      secondaryArray: [2, 3, 5, 6],
      target: 6,
      k: 7,
      desc: "Extended 4-crime optimization: n = 7 members, minProfit = 6, group = [1, 2, 3, 4], profit = [2, 3, 5, 6] -> 11 profitable schemes.",
    },
    d3: {
      array: [2],
      secondaryArray: [3],
      target: 5,
      k: 1,
      desc: "Boundary unreachable profit: n = 1 member, minProfit = 5, group = [2], profit = [3] -> 0 schemes.",
    },
  },
  "coin-change": {
    d1: {
      array: [1, 2, 5],
      target: 11,
      desc: "Standard 3-coin knapsack: coins = [1, 2, 5], target = 11 -> optimal 3 coins (5+5+1).",
    },
    d2: {
      array: [2, 5, 10],
      target: 27,
      desc: "Extended 28-state DP table: coins = [2, 5, 10], target = 27 -> optimal 5 coins (10+10+5+2).",
    },
    d3: {
      array: [2],
      target: 3,
      desc: "Impossible change boundary: coins = [2], target = 3 -> unreachable (-1).",
    },
  },
  "longest-increasing-subsequence": {
    d1: {
      array: [10, 9, 2, 5, 3, 7, 101, 18],
      desc: "Standard 8-element sequence: LIS is [2, 3, 7, 101] -> length 4.",
    },
    d2: {
      array: [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15],
      desc: "Extended 16-element sequence testing O(N^2) state memoization -> length 6.",
    },
    d3: {
      array: [7, 7, 7, 7, 7, 7],
      desc: "Strictly increasing boundary with all identical elements -> length 1.",
    },
  },
  "climbing-stairs": {
    d1: {
      array: [1, 2, 3, 5, 8],
      target: 5,
      desc: "Standard 5-stair climb: dp[5] = dp[4] + dp[3] = 5 + 3 = 8 distinct ways.",
    },
    d2: {
      array: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
      target: 10,
      desc: "Extended 10-stair climb verifying exponential growth of Fibonacci state transitions.",
    },
    d3: {
      array: [1],
      target: 1,
      desc: "Single-stair base case: 1 way.",
    },
  },
  "house-robber": {
    d1: {
      array: [2, 7, 9, 3, 1],
      desc: "Standard non-adjacent house selection: rob house 0, 2, 4 -> max loot = 2 + 9 + 1 = 12.",
    },
    d2: {
      array: [2, 1, 1, 2, 3, 1, 5, 2, 8, 1, 9, 4],
      desc: "Extended 12-house street with multi-step optimal skip transitions.",
    },
    d3: {
      array: [0],
      desc: "Single-house boundary with zero loot -> 0.",
    },
  },
  "unique-paths": {
    d1: {
      matrix: [
        [1, 1, 1],
        [1, 2, 3],
        [1, 3, 6],
      ],
      target: "3,3",
      desc: "Standard 3x3 grid: dp[r][c] = dp[r-1][c] + dp[r][c-1] -> 6 distinct paths.",
    },
    d2: {
      matrix: [
        [1, 1, 1, 1, 1],
        [1, 2, 3, 4, 5],
        [1, 3, 6, 10, 15],
        [1, 4, 10, 20, 35],
      ],
      target: "4,5",
      desc: "Extended 4x5 2D state matrix table accumulating 35 unique paths.",
    },
    d3: {
      matrix: [[1, 1, 1, 1, 1]],
      target: "1,5",
      desc: "Single-row 1x5 boundary: only 1 straight path available.",
    },
  },
  "minimum-path-sum": {
    d1: {
      matrix: [
        [1, 3, 1],
        [1, 5, 1],
        [4, 2, 1],
      ],
      desc: "Standard 3x3 weighted grid: optimal path 1 -> 3 -> 1 -> 1 -> 1 -> min sum = 7.",
    },
    d2: {
      matrix: [
        [1, 2, 5, 1],
        [3, 2, 1, 4],
        [4, 3, 1, 2],
        [1, 1, 2, 1],
      ],
      desc: "Extended 4x4 grid testing corner routing and cumulative state minimization.",
    },
    d3: {
      matrix: [[5]],
      desc: "1x1 single-cell boundary -> min sum = 5.",
    },
  },
  "word-break": {
    d1: {
      array: ["leet", "code"],
      target: "leetcode",
      desc: "Standard word segmentation: 'leetcode' splits cleanly into 'leet' + 'code' -> True.",
    },
    d2: {
      array: ["apple", "pen"],
      target: "applepenapple",
      desc: "Extended multi-word reusable segmentation: 'apple' + 'pen' + 'apple' -> True.",
    },
    d3: {
      array: ["cats", "dog", "sand", "and", "cat"],
      target: "catsandog",
      desc: "Boundary with missing suffix: 'cats' + 'and' + 'og' ('og' not in dict) -> False.",
    },
  },
  "maximum-subarray": {
    d1: {
      array: [-2, 1, -3, 4, -1, 2, 1, -5, 4],
      desc: "Standard Kadane's 1D DP: contiguous subarray [4, -1, 2, 1] -> max sum = 6.",
    },
    d2: {
      array: [5, 4, -1, 7, 8, -12, 6, 3, -2, 9, -4, 8],
      desc: "Extended 12-element array maintaining current and global maximum state accumulators.",
    },
    d3: {
      array: [-1],
      desc: "Single negative element boundary: returns -1.",
    },
  },
};

/** Identifies problems operating on FIFO queue buffer simulation or card revelation */
export function isQueueSimulationProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /reveal-cards-in-increasing-order|dota2-senate|design-circular-queue|design-circular-deque|number-of-recent-calls|time-needed-to-buy-tickets|first-unique-number|card-flipping-game/.test(
      s,
    ) ||
    ((/queue/i.test(t) || /simulation/i.test(t)) &&
      !/tree|binary tree|graph|heap|breadth-first search/i.test(t) &&
      /queue|senate|cards|deck|ticket|recent/i.test(s))
  );
}

export const CANONICAL_QUEUE_DATASETS: Record<
  string,
  {
    d1: { array: (number | string)[]; desc: string };
    d2: { array: (number | string)[]; desc: string };
    d3: { array: (number | string)[]; desc: string };
  }
> = {
  "reveal-cards-in-increasing-order": {
    d1: {
      array: [17, 13, 11, 2, 3, 5, 7],
      desc: "Standard LeetCode example: 7-card deck [17, 13, 11, 2, 3, 5, 7] simulating queue order into [2, 13, 3, 11, 5, 17, 7].",
    },
    d2: {
      array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      desc: "Extended 10-card deck [1..10] for complete in-depth rotation trace.",
    },
    d3: {
      array: [1, 1000],
      desc: "Two-card minimum boundary case [1, 1000].",
    },
  },
  "dota2-senate": {
    d1: {
      array: ["R", "D", "D"],
      desc: "Standard Senate voting round: Radiant vs Dire senators ['R', 'D', 'D'] (Dire wins).",
    },
    d2: {
      array: ["R", "D", "R", "D", "R", "R", "D", "D"],
      desc: "Extended 8-senator multi-round queue battle.",
    },
    d3: {
      array: ["R", "D"],
      desc: "Two-senator fast-turn boundary case ['R', 'D'] (Radiant bans Dire and wins).",
    },
  },
  "time-needed-to-buy-tickets": {
    d1: {
      array: [2, 3, 2],
      desc: "Standard ticket queue with target person k = 2.",
    },
    d2: {
      array: [5, 1, 1, 1],
      desc: "Queue with varying ticket needs and front purchaser.",
    },
    d3: {
      array: [1],
      desc: "Single person boundary case.",
    },
  },
};

export const CANONICAL_DESIGN_DATASETS: Record<
  string,
  {
    d1: { array: string[]; k?: number; desc: string };
    d2: { array: string[]; k?: number; desc: string };
    d3: { array: string[]; k?: number; desc: string };
  }
> = {
  "design-hashmap": {
    d1: {
      array: [
        "put(1, 1)",
        "put(2, 2)",
        "get(1)",
        "get(3)",
        "put(2, 1)",
        "get(2)",
        "remove(2)",
        "get(2)",
      ],
      desc: "Standard HashMap lifecycle: put(1,1), put(2,2), get(1) -> 1, get(3) -> -1, put(2,1) -> update, remove(2).",
    },
    d2: {
      array: [
        "put(1, 10)",
        "put(2, 20)",
        "put(3, 30)",
        "put(4, 40)",
        "get(2)",
        "put(2, 25)",
        "get(2)",
        "remove(1)",
        "get(1)",
        "put(5, 50)",
        "get(3)",
        "get(5)",
      ],
      desc: "Extended multi-bucket hash map insertion, collision update, and deletion trace.",
    },
    d3: {
      array: [
        "get(99)",
        "remove(99)",
        "put(0, 0)",
        "get(0)",
        "put(0, 100)",
        "get(0)",
        "remove(0)",
        "get(0)",
      ],
      desc: "Edge-case boundary operations: non-existent key retrieval, key 0 insertion, update, and removal.",
    },
  },
  "design-hashset": {
    d1: {
      array: [
        "add(1)",
        "add(2)",
        "contains(1)",
        "contains(3)",
        "add(2)",
        "contains(2)",
        "remove(2)",
        "contains(2)",
      ],
      desc: "Standard HashSet lifecycle: add(1), add(2), contains(1)->True, contains(3)->False, duplicate add(2), remove(2).",
    },
    d2: {
      array: [
        "add(10)",
        "add(20)",
        "add(30)",
        "contains(20)",
        "add(40)",
        "remove(10)",
        "contains(10)",
        "add(50)",
        "contains(50)",
        "contains(30)",
      ],
      desc: "Extended multi-key set insertion, membership queries, and deletion trace.",
    },
    d3: {
      array: [
        "contains(1)",
        "remove(1)",
        "add(0)",
        "contains(0)",
        "add(0)",
        "remove(0)",
        "contains(0)",
      ],
      desc: "Edge-case set queries on empty set, non-existent removal, and element 0 duplicate handling.",
    },
  },
  "lru-cache": {
    d1: {
      array: [
        "put(1, 1)",
        "put(2, 2)",
        "get(1)",
        "put(3, 3)",
        "get(2)",
        "put(4, 4)",
        "get(1)",
        "get(3)",
        "get(4)",
      ],
      k: 2,
      desc: "Standard LRU Cache with capacity 2: put(1,1), put(2,2), get(1), put(3,3) -> evicts key 2, put(4,4) -> evicts key 1.",
    },
    d2: {
      array: [
        "put(1, 10)",
        "put(2, 20)",
        "put(3, 30)",
        "get(1)",
        "put(4, 40)",
        "get(2)",
        "put(5, 50)",
        "get(3)",
        "get(1)",
        "get(4)",
        "get(5)",
      ],
      k: 3,
      desc: "Extended capacity 3 cache with multi-step MRU repositioning and sequential evictions.",
    },
    d3: {
      array: [
        "put(1, 1)",
        "get(1)",
        "put(2, 2)",
        "get(1)",
        "get(2)",
      ],
      k: 1,
      desc: "Capacity 1 boundary cache: every new insertion immediately evicts the previous node.",
    },
  },
};

/** Identifies custom design / data structure implementation problems */
export function isDesignProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /design-hashmap|design-hashset|lru-cache|lfu-cache|min-stack|design-circular-queue|design-circular-deque/.test(
      s,
    ) || /design/i.test(t)
  );
}

/** Provides 3 structured canonical datasets (Standard, Longer Trace ⚡, Edge Case) for any problem */
export function getCanonicalMultiDatasets(
  slug: string,
  _title = "",
  topics: string[] = [],
): TestDataset[] {
  if (slug === "number-of-islands-ii") {
    return [
      {
        id: "d1",
        label: "Dataset 1",
        category: "standard",
        matrix: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        secondaryArray: [
          [0, 0],
          [0, 1],
          [1, 2],
          [2, 1],
        ],
        target: 3,
        cols: 3,
        description: "Standard 3×3 water grid with 4 dynamic addLand operations: [[0,0],[0,1],[1,2],[2,1]].",
      },
      {
        id: "d2",
        label: "Dataset 2",
        category: "longer",
        matrix: Array.from({ length: 5 }, () => Array(6).fill(0)),
        secondaryArray: [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 2],
          [2, 2],
          [2, 3],
          [3, 4],
          [3, 5],
          [4, 4],
          [4, 0],
          [0, 5],
          [4, 2],
        ],
        target: 5,
        cols: 6,
        description: "Extended 5×6 grid with 12 addLand operations producing multiple island creations, merges, and component unions.",
      },
      {
        id: "d3",
        label: "Dataset 3",
        category: "edge",
        matrix: [
          [0, 0],
          [0, 0],
        ],
        secondaryArray: [
          [0, 0],
          [0, 0],
          [0, 1],
          [1, 1],
        ],
        target: 2,
        cols: 2,
        description: "Edge-case 2×2 grid testing duplicate land addition at [0,0] and boundary unions.",
      },
    ];
  }

  const CUSTOM_DATASETS: Record<string, TestDataset[]> = {
    "check-preorder-is-valid-or-not": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Check Preorder Is Valid Or Not." }
    ],
    "replace-every-element-with-the-least-greater-element-on-its-right": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Replace Every Element With The Least Greater Element On Its Right." }
    ],
    "find-the-median-of-bst-in-o1-space": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find The Median Of Bst In O1 Space." }
    ],
    "find-kth-smallest-element-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find Kth Smallest Element In A Bst." }
    ],
    "find-kth-largest-element-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find Kth Largest Element In A Bst." }
    ],
    "merge-two-bsts": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Merge Two Bsts." }
    ],
    "convert-a-normal-bst-into-a-balanced-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Convert A Normal Bst Into A Balanced Bst." }
    ],
    "convert-binary-tree-into-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Convert Binary Tree Into Bst." }
    ],
    "find-lca-of-2-nodes-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find Lca Of 2 Nodes In A Bst." }
    ],
    "populate-inorder-successor-for-all-nodes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Populate Inorder Successor For All Nodes." }
    ],
    "find-inorder-successor-and-inorder-predecessor-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find Inorder Successor And Inorder Predecessor In A Bst." }
    ],
    "find-min-and-max-value-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find Min And Max Value In A Bst." }
    ],
    "deletion-of-a-node-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Deletion Of A Node In A Bst." }
    ],
    "find-a-value-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find A Value In A Bst." }
    ],
    "tree-isomorphism-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Tree Isomorphism Problem." }
    ],
    "find-all-duplicate-subtrees-in-a-binary-tree-by-its-property": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find All Duplicate Subtrees In A Binary Tree By Its Property." }
    ],
    "kth-ancestor-of-node-in-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Kth Ancestor Of Node In A Binary Tree." }
    ],
    "find-distance-between-2-nodes-in-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find Distance Between 2 Nodes In A Binary Tree." }
    ],
    "find-lca-in-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find Lca In A Binary Tree." }
    ],
    "print-all-k-sum-paths-in-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Print All K Sum Paths In A Binary Tree." }
    ],
    "maximum-sum-of-nodes-in-binary-tree-such-that-no-two-are-adjacent": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Maximum Sum Of Nodes In Binary Tree Such That No Two Are Adjacent." }
    ],
    "find-largest-subtree-sum-in-a-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Find Largest Subtree Sum In A Tree." }
    ],
    "check-if-given-graph-is-tree-or-not": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Check If Given Graph Is Tree Or Not." }
    ],
    "sum-of-nodes-on-the-longest-path-from-root-to-leaf-node": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Sum Of Nodes On The Longest Path From Root To Leaf Node." }
    ],
    "check-if-2-trees-are-mirror-or-not": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Check If 2 Trees Are Mirror Or Not." }
    ],
    "check-if-a-binary-tree-is-duplicate-tree-of-itself-or-not": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Check If A Binary Tree Is Duplicate Tree Of Itself Or Not." }
    ],
    "check-if-all-leaf-nodes-are-at-same-level-or-not": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Check If All Leaf Nodes Are At Same Level Or Not." }
    ],
    "check-if-binary-tree-is-sum-tree-or-not": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Check If Binary Tree Is Sum Tree Or Not." }
    ],
    "minimum-swap-required-to-convert-binary-tree-to-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Minimum Swap Required To Convert Binary Tree To Binary Search Tree." }
    ],
    "construct-binary-tree-from-inorder-and-preorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Construct Binary Tree From Inorder And Preorder Traversal." }
    ],
    "convert-binary-tree-into-sum-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Convert Binary Tree Into Sum Tree." }
    ],
    "convert-binary-tree-into-doubly-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Convert Binary Tree Into Doubly Linked List." }
    ],
    "construct-binary-tree-from-string-with-bracket-representation": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Construct Binary Tree From String With Bracket Representation." }
    ],
    "diagonal-traversal-of-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Diagonal Traversal Of A Binary Tree." }
    ],
    "check-if-a-tree-is-balanced-or-not": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Check If A Tree Is Balanced Or Not." }
    ],
    "zigzag-traversal-of-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Zigzag Traversal Of A Binary Tree." }
    ],
    "bottom-view-of-a-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Bottom View Of A Tree." }
    ],
    "top-view-of-a-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Top View Of A Tree." }
    ],
    "right-view-of-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Right View Of Tree." }
    ],
    "left-view-of-a-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Left View Of A Tree." }
    ],
    "postorder-traversal-of-a-tree-both-using-recursion-and-iteration": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Postorder Traversal Of A Tree Both Using Recursion And Iteration." }
    ],
    "preorder-traversal-of-a-tree-both-using-recursion-and-iteration": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Preorder Traversal Of A Tree Both Using Recursion And Iteration." }
    ],
    "inorder-traversal-of-a-tree-both-using-recursion-and-iteration": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Inorder Traversal Of A Tree Both Using Recursion And Iteration." }
    ],
    "mirror-of-a-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Mirror Of A Tree." }
    ],
    "diameter-of-a-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Diameter Of A Tree." }
    ],
    "height-of-a-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Height Of A Tree." }
    ],
    "reverse-level-order-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Reverse Level Order Traversal." }
    ],
    "level-order-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Level Order Traversal." }
    ],
    "find-the-first-non-repeating-character-from-a-stream-of-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find The First Non Repeating Character From A Stream Of Characters." }
    ],
    "program-for-nth-node-from-the-end-of-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Program For Nth Node From The End Of A Linked List." }
    ],
    "segregate-even-and-odd-nodes-in-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Segregate Even And Odd Nodes In A Linked List." }
    ],
    "delete-nodes-which-have-a-greater-value-on-right-side": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Delete Nodes Which Have A Greater Value On Right Side." }
    ],
    "multiply-2-no-represented-by-ll": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Multiply 2 No Represented By Ll." }
    ],
    "merge-k-sorted-linked-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Merge K Sorted Linked Lists." }
    ],
    "clone-a-linked-list-with-next-and-random-pointer": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Clone A Linked List With Next And Random Pointer." }
    ],
    "sort-a-linked-list-of-0s-1s-and-2s": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Sort A Linked List Of 0s 1s And 2s." }
    ],
    "flatten-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Flatten A Linked List." }
    ],
    "reverse-a-doubly-linked-list-in-groups-of-given-size": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Reverse A Doubly Linked List In Groups Of Given Size." }
    ],
    "rotate-doubly-linked-list-by-n-nodes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Rotate Doubly Linked List By N Nodes." }
    ],
    "delete-node-in-a-doubly-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Delete Node In A Doubly Linked List." }
    ],
    "insert-value-in-sorted-way-in-a-sorted-doubly-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Insert Value In Sorted Way In A Sorted Doubly Linked List." }
    ],
    "find-pairs-with-given-sum-in-doubly-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Find Pairs With Given Sum In Doubly Linked List." }
    ],
    "reverse-a-doubly-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Reverse A Doubly Linked List." }
    ],
    "deletion-from-a-circular-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Deletion From A Circular Linked List." }
    ],
    "check-if-a-linked-list-is-palindrome": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Check If A Linked List Is Palindrome." }
    ],
    "split-a-circular-linked-list-into-two-halves": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Split A Circular Linked List Into Two Halves." }
    ],
    "check-if-a-linked-list-is-a-circular-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Check If A Linked List Is A Circular Linked List." }
    ],
    "find-the-middle-element-of-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Find The Middle Element Of A Linked List." }
    ],
    "quicksort-on-singly-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Quicksort On Singly Linked List." }
    ],
    "merge-sort-for-linked-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Merge Sort For Linked Lists." }
    ],
    "intersection-point-of-two-linked-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Intersection Point Of Two Linked Lists." }
    ],
    "intersection-of-two-sorted-linked-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Intersection Of Two Sorted Linked Lists." }
    ],
    "add-two-numbers-represented-by-linked-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Add Two Numbers Represented By Linked Lists." }
    ],
    "add-1-to-a-number-represented-as-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Add 1 To A Number Represented As Linked List." }
    ],
    "write-a-function-to-get-the-intersection-point-of-two-linked-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Write A Function To Get The Intersection Point Of Two Linked Lists." }
    ],
    "remove-duplicates-in-an-un-sorted-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Remove Duplicates In An Un Sorted Linked List." }
    ],
    "remove-duplicates-in-a-sorted-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Remove Duplicates In A Sorted Linked List." }
    ],
    "find-the-starting-point-of-the-loop": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find The Starting Point Of The Loop." }
    ],
    "write-a-program-to-delete-loop-in-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Write A Program To Delete Loop In A Linked List." }
    ],
    "write-a-program-to-detect-loop-in-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Write A Program To Detect Loop In A Linked List." }
    ],
    "reverse-a-linked-list-in-groups-of-given-size": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Reverse A Linked List In Groups Of Given Size." }
    ],
    "reverse-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Reverse A Linked List." }
    ],
    "painters-partition-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Painters Partition Problem." }
    ],
    "smallest-number-with-atleast-n-trailing-zeroes-in-factorial": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Smallest Number With Atleast N Trailing Zeroes In Factorial." }
    ],
    "missing-number-in-ap": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Missing Number In Ap." }
    ],
    "job-scheduling-algo": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Job Scheduling Algo." }
    ],
    "eko-spoj": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Eko Spoj." }
    ],
    "double-helix-spoj": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Double Helix Spoj." }
    ],
    "roti-prata-spoj": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Roti Prata Spoj." }
    ],
    "bishu-and-soldiers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Bishu And Soldiers." }
    ],
    "minimum-no-of-swaps-required-to-sort-the-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Minimum No Of Swaps Required To Sort The Array." }
    ],
    "sort-array-according-to-count-of-set-bits": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Sort Array According To Count Of Set Bits." }
    ],
    "product-array-puzzle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Product Array Puzzle." }
    ],
    "print-all-subarrays-with-0-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Print All Subarrays With 0 Sum." }
    ],
    "merge-2-sorted-arrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Merge 2 Sorted Arrays." }
    ],
    "count-triplets-with-sum-smaller-than-x": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Count Triplets With Sum Smaller Than X." }
    ],
    "maximum-sum-such-that-no-two-elements-are-adjacent": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Maximum Sum Such That No Two Elements Are Adjacent." }
    ],
    "find-four-elements-that-sum-to-a-given-value": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find Four Elements That Sum To A Given Value." }
    ],
    "find-a-pair-with-a-given-difference": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find A Pair With A Given Difference." }
    ],
    "searching-in-an-array-where-adjacent-differ-by-at-most-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Searching In An Array Where Adjacent Differ By At Most K." }
    ],
    "find-majority-element": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find Majority Element." }
    ],
    "find-the-repeating-and-the-missing": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find The Repeating And The Missing." }
    ],
    "optimum-location-of-point-to-minimize-total-distance": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Optimum Location Of Point To Minimize Total Distance." }
    ],
    "maximum-and-minimum-of-an-array-using-minimum-number-of-comparisons": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Maximum And Minimum Of An Array Using Minimum Number Of Comparisons." }
    ],
    "square-root-of-an-integer": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Square Root Of An Integer." }
    ],
    "search-in-a-rotated-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Search In A Rotated Sorted Array." }
    ],
    "value-equal-to-index-value": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Value Equal To Index Value." }
    ],
    "find-first-and-last-positions-of-an-element-in-a-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find First And Last Positions Of An Element In A Sorted Array." }
    ],
    "recursively-print-all-sentences-that-can-be-formed-from-list-of-word-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Recursively Print All Sentences That Can Be Formed From List Of Word Lists." }
    ],
    "transform-one-string-to-another-using-minimum-number-of-given-operation": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Transform One String To Another Using Minimum Number Of Given Operation." }
    ],
    "number-of-customers-who-could-not-get-a-computer": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Number Of Customers Who Could Not Get A Computer." }
    ],
    "wildcard-string-matching": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Wildcard String Matching." }
    ],
    "remove-consecutive-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Remove Consecutive Characters." }
    ],
    "find-the-smallest-window-in-a-string-containing-all-characters-of-another-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Find The Smallest Window In A String Containing All Characters Of Another String." }
    ],
    "given-a-sequence-of-words-print-all-anagrams-together": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Given A Sequence Of Words Print All Anagrams Together." }
    ],
    "minimum-characters-to-be-added-at-front-to-make-string-palindrome": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Minimum Characters To Be Added At Front To Make String Palindrome." }
    ],
    "rearrange-characters-in-a-string-such-that-no-two-adjacent-are-same": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Rearrange Characters In A String Such That No Two Adjacent Are Same." }
    ],
    "write-a-program-to-find-the-smallest-window-that-contains-all-characters-of-string-itself": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Write A Program To Find The Smallest Window That Contains All Characters Of String Itself." }
    ],
    "program-to-generate-all-possible-valid-ip-addresses-from-given-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Program To Generate All Possible Valid Ip Addresses From Given String." }
    ],
    "minimum-number-of-swaps-for-bracket-balancing": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Minimum Number Of Swaps For Bracket Balancing." }
    ],
    "find-the-first-repeated-word-in-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Find The First Repeated Word In A String." }
    ],
    "count-of-number-of-given-string-in-2d-character-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Count Of Number Of Given String In 2d Character Array." }
    ],
    "minimum-number-of-bracket-reversals-needed-to-make-an-expression-balanced": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Minimum Number Of Bracket Reversals Needed To Make An Expression Balanced." }
    ],
    "convert-a-sentence-into-its-equivalent-mobile-numeric-keypad-sequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Convert A Sentence Into Its Equivalent Mobile Numeric Keypad Sequence." }
    ],
    "kmp-algorithm": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Kmp Algorithm." }
    ],
    "rabin-karp-algorithm": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Rabin Karp Algorithm." }
    ],
    "word-break-problem-using-backtracking": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Word Break Problem Using Backtracking." }
    ],
    "balanced-parenthesis-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Balanced Parenthesis Problem." }
    ],
    "find-next-greater-number-with-same-set-of-digits": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find Next Greater Number With Same Set Of Digits." }
    ],
    "word-wrap": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Word Wrap." }
    ],
    "split-the-binary-string-into-substrings-with-equal-number-of-0s-and-1s": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Split The Binary String Into Substrings With Equal Number Of 0s And 1s." }
    ],
    "print-all-the-permutations-of-the-given-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Print All The Permutations Of The Given String." }
    ],
    "print-all-subsequences-of-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Print All Subsequences Of A String." }
    ],
    "find-longest-recurring-subsequence-in-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Find Longest Recurring Subsequence In String." }
    ],
    "longest-palindrome-in-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Longest Palindrome In A String." }
    ],
    "check-if-a-string-is-a-valid-shuffle-of-two-distinct-strings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Check If A String Is A Valid Shuffle Of Two Distinct Strings." }
    ],
    "write-a-program-to-check-whether-one-string-is-a-rotation-of-another": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Write A Program To Check Whether One String Is A Rotation Of Another." }
    ],
    "why-strings-are-immutable-in-java": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Why Strings Are Immutable In Java." }
    ],
    "find-duplicate-characters-in-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Find Duplicate Characters In A String." }
    ],
    "check-whether-a-string-is-palindrome-or-not": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Check Whether A String Is Palindrome Or Not." }
    ],
    "reverse-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Reverse A String." }
    ],
    "common-elements-in-all-rows-of-a-given-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Common Elements In All Rows Of A Given Matrix." }
    ],
    "kth-smallest-element-in-a-row-cp-wise-sorted-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Kth Smallest Element In A Row Cp Wise Sorted Matrix." }
    ],
    "rotate-a-matrix-by-90-degree-in-clockwise-direction-without-using-any-extra-space": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Rotate A Matrix By 90 Degree In Clockwise Direction Without Using Any Extra Space." }
    ],
    "find-a-specific-pair-in-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Find A Specific Pair In Matrix." }
    ],
    "max-rectangle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Max Rectangle." }
    ],
    "sorted-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Sorted Matrix." }
    ],
    "row-with-max-1s": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Row With Max 1s." }
    ],
    "find-median-in-a-row-wise-sorted-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Find Median In A Row Wise Sorted Matrix." }
    ],
    "spiral-traversal-on-a-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Spiral Traversal On A Matrix." }
    ],
    "find-the-median": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find The Median." }
    ],
    "palindromic-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Palindromic Array." }
    ],
    "minimum-swaps-and-k-together": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Minimum Swaps And K Together." }
    ],
    "three-way-partitioning": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Three Way Partitioning." }
    ],
    "smallest-subarray-with-sum-greater-than-x": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Smallest Subarray With Sum Greater Than X." }
    ],
    "triplet-sum-in-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Triplet Sum In Array." }
    ],
    "array-subset-of-another-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Array Subset Of Another Array." }
    ],
    "maximum-profit-by-buying-and-selling-a-share-at-most-twice": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Maximum Profit By Buying And Selling A Share At Most Twice." }
    ],
    "given-an-array-of-size-n-and-a-number-k-find-all-elements-that-appear-more-than-n-k-times": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Given An Array Of Size N And A Number K Find All Elements That Appear More Than N K Times." }
    ],
    "longest-consecutive-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Longest Consecutive Subsequence." }
    ],
    "factorial-of-a-large-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Factorial Of A Large Number." }
    ],
    "subarray-with-0-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Subarray With 0 Sum." }
    ],
    "rearrange-array-in-alternating-positive-negative-items-with-o1-extra-space": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Rearrange Array In Alternating Positive Negative Items With O1 Extra Space." }
    ],
    "common-elements": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Common Elements." }
    ],
    "find-all-pairs-on-integer-array-whose-sum-is-equal-to-given-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find All Pairs On Integer Array Whose Sum Is Equal To Given Number." }
    ],
    "count-inversions": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Count Inversions." }
    ],
    "merge-without-extra-space": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Merge Without Extra Space." }
    ],
    "find-duplicate-in-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find Duplicate In An Array." }
    ],
    "minimum-number-of-jumps": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Minimum Number Of Jumps." }
    ],
    "minimize-the-heights-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Minimize The Heights Ii." }
    ],
    "kadanes-algorithm": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Kadanes Algorithm." }
    ],
    "cyclically-rotate-an-array-by-one": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Cyclically Rotate An Array By One." }
    ],
    "union-of-two-arrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Union Of Two Arrays." }
    ],
    "move-all-negative-numbers-to-beginning-and-positive-to-end-with-constant-extra-space": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Move All Negative Numbers To Beginning And Positive To End With Constant Extra Space." }
    ],
    "sort-an-array-of-0s-1s-and-2s": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Sort An Array Of 0s 1s And 2s." }
    ],
    "kth-smallest-element-in-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Kth Smallest Element In An Array." }
    ],
    "find-maximum-and-minimum-element-in-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find Maximum And Minimum Element In An Array." }
    ],
    "reverse-the-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Reverse The Array." }
    ],
    "coin-change-2": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Coin Change 2." }
    ],
    "egg-dropping-puzzle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Egg Dropping Puzzle." }
    ],
    "rod-cutting": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Rod Cutting." }
    ],
    "subset-sum-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Subset Sum Problem." }
    ],
    "minimum-sum-path-in-a-grid": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Minimum Sum Path In A Grid." }
    ],
    "maximum-sum-increasing-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Maximum Sum Increasing Subsequence." }
    ],
    "bipartite-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1], [1,2], [2,3]], target: 4, description: "Standard dataset for Bipartite Graph." }
    ],
    "topological-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Topological Sort." }
    ],
    "detect-cycle-in-a-directed-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1], [1,2], [2,3]], target: 4, description: "Standard dataset for Detect Cycle In A Directed Graph." }
    ],
    "detect-cycle-in-an-undirected-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1], [1,2], [2,3]], target: 4, description: "Standard dataset for Detect Cycle In An Undirected Graph." }
    ],
    "bfs-of-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1], [1,2], [2,3]], target: 4, description: "Standard dataset for Bfs Of Graph." }
    ],
    "dfs-of-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1], [1,2], [2,3]], target: 4, description: "Standard dataset for Dfs Of Graph." }
    ],
    "largest-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Largest Bst." }
    ],
    "predecessor-and-successor": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Predecessor And Successor." }
    ],
    "kth-largest-element-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Kth Largest Element In A Bst." }
    ],
    "floor-in-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Floor In Bst." }
    ],
    "ceil-from-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Ceil From Bst." }
    ],
    "boundary-traversal-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Boundary Traversal Of Binary Tree." }
    ],
    "top-view-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Top View Of Binary Tree." }
    ],
    "bottom-view-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Bottom View Of Binary Tree." }
    ],
    "left-view-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Left View Of Binary Tree." }
    ],
    "power-set": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Power Set." }
    ],
    "count-distinct-substrings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4, 2, 6, 1, 3, 5, 7], target: 3, description: "Standard dataset for Count Distinct Substrings." }
    ],
    "aggressive-cows": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Aggressive Cows." }
    ],
    "allocate-minimum-number-of-pages": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Allocate Minimum Number Of Pages." }
    ],
    "kth-element-of-two-sorted-arrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Kth Element Of Two Sorted Arrays." }
    ],
    "matrix-median": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], description: "Standard dataset for Matrix Median." }
    ],
    "nth-root-of-an-integer": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Nth Root Of An Integer." }
    ],
    "m-coloring-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for M Coloring Problem." }
    ],
    "kth-permutation-sequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Kth Permutation Sequence." }
    ],
    "activity-selection": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Activity Selection." }
    ],
    "find-minimum-number-of-coins": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find Minimum Number Of Coins." }
    ],
    "flattening-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], description: "Standard dataset for Flattening A Linked List." }
    ],
    "count-subarrays-with-given-xor": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Count Subarrays With Given Xor." }
    ],
    "largest-subarray-with-0-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Largest Subarray With 0 Sum." }
    ],
    "inversion-of-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Inversion Of Array." }
    ],
    "chocolate-distribution-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Chocolate Distribution Problem." }
    ],
    "subarray-sum-divisible-by-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Subarray Sums Divisible by K." }
    ],
    "find-peak-element-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 5, 3, 4, 2], target: 3, description: "Standard dataset for Find a Peak Element II." }
    ],
    "minimum-insertions-to-make-string-palindrome": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], secondaryArray: ["code"], description: "Standard dataset for Minimum Insertion Steps to Make a String Palindrome." }
    ],
    "split-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,6,1,3,5,7], target: 2, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "minimize-max-distance-to-gas-station": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,7,8,9,10], target: 9, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "find-anagram-mappings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [12,28,46,32,50], secondaryArray: [50,12,32,46,28], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "pour-water": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,1,2,1,2,2], target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "ip-to-cidr": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "number-of-corner-rectangles": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,0,1,0],[0,0,1,0,1],[0,0,0,1,0],[1,0,1,0,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "closest-leaf-in-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2], target: 1, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "candy-crush": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[110,5,112,113,114],[210,211,5,213,214],[310,311,3,313,314],[410,411,412,5,414],[5,1,512,3,3],[610,4,1,613,614],[710,1,2,713,714],[810,1,2,1,1],[1,1,2,2,2],[4,1,4,4,1014]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "number-of-distinct-islands-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,0,0,0],[1,0,0,0,0],[0,0,0,0,1],[0,0,0,1,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "insert-into-a-sorted-circular-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,4,1], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "search-in-a-sorted-array-of-unknown-size": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-1,0,3,5,9,12], target: 9, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "number-of-distinct-islands": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,0,0,0],[1,1,0,0,0],[0,0,0,1,1],[0,0,0,1,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "k-empty-slots": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2], target: 1, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "equal-tree-partition": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,10,10,null,null,2,3], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "remove-9": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 9, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "coin-path": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,4,-1,2], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "4-keys-keyboard": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "maximum-average-subarray-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,12,-5,-6,50,3], target: 4, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "find-the-derangement-of-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "kill-process": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,10,5], secondaryArray: [3,0,5,3], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "squirrel-simulation": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[3,0],[2,5]], target: 7, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "maximum-vacation-days": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,1],[1,0,1],[1,1,0]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "longest-line-of-consecutive-one-in-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,1,0],[0,1,1,0],[0,0,0,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "binary-tree-longest-consecutive-sequence-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "split-array-with-equal-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,1,2,1,2,1], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "boundary-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,2,3,4], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "output-contest-matches": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "lonely-pixel-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "word-abbreviation": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["like","god","internal","me","internet","interval","intension","face","intrusion"], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "inorder-successor-in-bst-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,3], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "the-maze-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,1,0,0],[0,0,0,0,0],[0,0,0,1,0],[1,1,0,1,1],[0,0,0,0,0]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "the-maze-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,0,0,0],[1,1,0,0,1],[0,0,0,0,0],[0,1,0,0,1],[0,1,0,0,0]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "the-maze": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,1,0,0],[0,0,0,0,0],[0,0,0,1,0],[1,1,0,1,1],[0,0,0,0,0]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "robot-room-cleaner": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,1,1,1,0,1,1],[1,1,1,1,1,0,1,1],[1,0,1,1,1,1,1,1],[0,0,0,1,0,0,0,0],[1,1,1,1,1,1,1,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "max-consecutive-ones-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,1,1,0], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "convex-polygon": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0],[0,5],[5,5],[5,0]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "optimal-account-balancing": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,10],[2,0,5]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "sequence-reconstruction": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[1,3]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "encode-n-ary-tree-to-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,3,2,4,null,5,6], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "serialize-and-deserialize-n-ary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,2,3,4,5,null,null,6,7,null,8,null,9,10,null,null,11,null,12,null,13,null,null,14], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "convert-binary-search-tree-to-sorted-doubly-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,3], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "range-addition": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3,2],[2,4,3],[0,2,-2]], target: 5, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "plus-one-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "find-leaves-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "nested-list-weight-sum-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],2,[1,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "sort-transformed-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-4,-2,2,4], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "rearrange-string-k-distance-apart": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "line-reflection": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],[-1,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "android-unlock-patterns": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "longest-substring-with-at-most-k-distinct-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "nested-list-weight-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],2,[1,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "largest-bst-subtree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,5,15,1,8,null,7], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "maximum-size-subarray-sum-equals-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,-1,5,-2,3], target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "generalized-abbreviation": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["word"], target: "word", description: "Actual Example 1 from LeetCode Premium." }
    ],
    "shortest-distance-from-all-buildings": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,2,0,1],[0,0,0,0,0],[0,0,1,0,0]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "binary-tree-vertical-order-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "sparse-matrix-multiplication": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,0],[-1,0,3]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "number-of-islands-ii": [
      {
        id: "d1",
        label: "Dataset 1",
        category: "standard",
        matrix: [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        secondaryArray: [[0, 0], [0, 1], [1, 2], [2, 1]],
        target: 3,
        cols: 3,
        description: "Standard 3×3 water grid with 4 dynamic addLand operations: [[0,0],[0,1],[1,2],[2,1]].",
      },
    ],
    "binary-tree-longest-consecutive-sequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,3,2,4,null,null,null,5], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "best-meeting-point": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,0,0,1],[0,0,0,0,0],[0,0,1,0,0]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "inorder-successor-in-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,3], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "zigzag-iterator": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2], secondaryArray: [3,4,5,6], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "wiggle-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,5,2,1,6,4], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "find-the-celebrity": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,0],[0,1,0],[1,1,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "paint-fence": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "closest-binary-search-tree-value-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,5,1,3], target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "closest-binary-search-tree-value": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,5,1,3], target: 3, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "palindrome-permutation-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aabb"], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "paint-house-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,5,3],[2,9,4]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "3sum-smaller": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-2,0,1,3], target: 2, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "paint-house": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[17,2,17],[16,16,5],[14,3,19]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "verify-preorder-sequence-in-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,2,1,3,6], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "factor-combinations": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "count-univalue-subtrees": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,1,5,5,5,null,5], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "strobogrammatic-number-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["50"], secondaryArray: ["100"], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "strobogrammatic-number-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "shortest-word-distance-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["practice","makes","perfect","coding","makes"], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "reverse-words-in-a-string-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["t","h","e"," ","s","k","y"," ","i","s"," ","b","l","u","e"], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "missing-ranges": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,3,50,75], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "read-n-characters-given-read4-ii-call-multiple-times": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,1], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "read-n-characters-given-read4": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "binary-tree-upside-down": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "meeting-rooms": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,30],[5,10],[15,20]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "word-search-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["o"], secondaryArray: ["a"], matrix: [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "task-scheduler": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["A","A","A","B","B","B"], target: 2, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "maximum-profit-in-job-scheduling": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,3], secondaryArray: [3,4,5,6], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "burst-balloons": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,1,5,8], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "cheapest-flights-within-k-stops": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], target: 4, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "partition-equal-subset-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,5,11,5], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "number-of-provinces": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,0],[1,1,0],[0,0,1]], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "combination-sum-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,1,2,7,6,1,5], target: 8, description: "Actual Example 1 from LeetCode Premium." }
    ],
    "candy": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,2], description: "Actual Example 1 from LeetCode Premium." }
    ],
    "find-common-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["bella","label","roller"], description: "Actual Example 1 from LeetCode." }
    ],
    "grid-illumination": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0],[4,4]], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-cost-to-merge-stones": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,4,1], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-binary-tree-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,1,3,null,null,2], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-squareful-arrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,17,8], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-number-of-k-consecutive-bit-flips": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,0], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "broken-calculator": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-string-starting-from-leaf": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,2,3,4,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "sum-of-even-numbers-after-queries": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0],[-3,1],[-4,0],[2,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "triples-with-bitwise-and-equal-to-zero": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "unique-paths-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,0,0],[0,0,0,0],[0,0,2,-1]], description: "Actual Example 1 from LeetCode." }
    ],
    "distribute-coins-in-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,0,0], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-turbulent-subarray": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [9,4,2,10,7,8,8,1,9], description: "Actual Example 1 from LeetCode." }
    ],
    "odd-even-jump": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,13,12,14,15], description: "Actual Example 1 from LeetCode." }
    ],
    "subarray-sums-divisible-by-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,5,0,-2,-3,1], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "flip-binary-tree-to-match-preorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2], secondaryArray: [2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "pancake-sorting": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,4,1], description: "Actual Example 1 from LeetCode." }
    ],
    "numbers-with-same-consecutive-differences": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "vowel-spellchecker": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["KiTe","kite","hare","Hare"], secondaryArray: ["kite","Kite","KiTe","Hare","HARE","Hear","hear","keti","keet","keto"], description: "Actual Example 1 from LeetCode." }
    ],
    "least-operators-to-express-number": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 19, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-area-rectangle-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,1],[1,0],[0,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-width-ramp": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [6,0,8,2,1,5], description: "Actual Example 1 from LeetCode." }
    ],
    "check-completeness-of-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "prison-cells-after-n-days": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,0,1,1,0,0,1], target: 7, description: "Actual Example 1 from LeetCode." }
    ],
    "tallest-billboard": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,6], description: "Actual Example 1 from LeetCode." }
    ],
    "array-of-doubled-pairs": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,1,3,6], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-component-size-by-common-factor": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,6,15,35], description: "Actual Example 1 from LeetCode." }
    ],
    "flip-equivalent-binary-trees": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,null,null,null,7,8], secondaryArray: [1,3,2,null,6,4,5,null,null,null,null,8,7], description: "Actual Example 1 from LeetCode." }
    ],
    "reveal-cards-in-increasing-order": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [17,13,11,2,3,5,7], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-time-for-given-digits": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "bag-of-tokens": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [100], description: "Actual Example 1 from LeetCode." }
    ],
    "validate-stack-sequences": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], secondaryArray: [4,5,3,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-area-rectangle": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],[1,3],[3,1],[3,3],[2,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "knight-dialer": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "beautiful-array": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "minimize-malware-spread-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,0],[1,1,0],[0,0,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "three-equal-parts": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,1,0,1], description: "Actual Example 1 from LeetCode." }
    ],
    "3sum-with-multiplicity": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2,2,3,3,4,4,5,5], target: 8, description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-music-playlists": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-sum-circular-subarray": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,-2,3,-2], description: "Actual Example 1 from LeetCode." }
    ],
    "partition-array-into-disjoint-intervals": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,0,3,8,6], description: "Actual Example 1 from LeetCode." }
    ],
    "cat-and-mouse": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,5],[3],[0,4,5],[1,4,5],[2,3],[0,2,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "numbers-at-most-n-given-digit-set": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 100, description: "Actual Example 1 from LeetCode." }
    ],
    "orderly-queue": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "bitwise-ors-of-subarrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0], description: "Actual Example 1 from LeetCode." }
    ],
    "all-possible-full-binary-trees": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 7, description: "Actual Example 1 from LeetCode." }
    ],
    "sum-of-subsequence-widths": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "construct-binary-tree-from-preorder-and-postorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,4,5,3,6,7], secondaryArray: [4,5,2,6,7,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "super-egg-drop": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "possible-bipartition": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[1,3],[2,4]], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "projection-area-of-3d-shapes": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "reachable-nodes-in-subdivided-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,10],[0,2,1],[1,2,2]], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "decoded-string-at-index": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "nth-magical-number": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "stone-game": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "walking-robot-simulation": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,-1,3], secondaryArray: [], description: "Actual Example 1 from LeetCode." }
    ],
    "length-of-longest-fibonacci-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,7,8], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-number-of-refueling-stops": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "advantage-shuffle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,7,11,15], secondaryArray: [1,10,4,11], description: "Actual Example 1 from LeetCode." }
    ],
    "reordered-power-of-2": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "prime-palindrome": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-subtree-with-all-the-deepest-nodes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,5,1,6,2,0,8,null,null,7,4], description: "Actual Example 1 from LeetCode." }
    ],
    "score-after-flipping-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,1,1],[1,0,1,0],[1,1,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "loud-and-rich": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0],[2,1],[3,1],[3,7],[4,3],[5,3],[6,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "rectangle-area-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,2,2],[1,0,2,3],[1,0,3,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "shifting-letters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,5,9], description: "Actual Example 1 from LeetCode." }
    ],
    "shortest-path-visiting-all-nodes": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[0],[0],[0]], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-mountain-in-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,4,7,3,2,5], description: "Actual Example 1 from LeetCode." }
    ],
    "magic-squares-in-grid": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[4,3,8,4],[9,5,1,9],[2,7,6,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "new-21-game": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "image-overlap": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,0],[0,1,0],[0,1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "sum-of-distances-in-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[0,2],[2,3],[2,4],[2,5]], target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "find-and-replace-in-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,2], description: "Actual Example 1 from LeetCode." }
    ],
    "consecutive-numbers-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "most-profit-assigning-work": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,4,6,8,10], secondaryArray: [10,20,30,40,50], description: "Actual Example 1 from LeetCode." }
    ],
    "friends-of-appropriate-ages": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [16,16], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-trees-with-factors": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,4], description: "Actual Example 1 from LeetCode." }
    ],
    "card-flipping-game": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,4,4,7], secondaryArray: [1,3,4,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "race-car": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "linked-list-components": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,2,3], secondaryArray: [0,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-pruning": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,0,0,1], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-sum-of-averages": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [9,1,2,3,9], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "chalkboard-xor-game": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "soup-servings": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 50, description: "Actual Example 1 from LeetCode." }
    ],
    "max-increase-to-keep-city-skyline": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[3,0,8,4],[2,4,5,7],[9,2,6,3],[0,3,1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "split-array-with-same-average": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,7,8], description: "Actual Example 1 from LeetCode." }
    ],
    "bricks-falling-when-hit": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,0,0],[1,1,1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-swaps-to-make-sequences-increasing": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,5,4], secondaryArray: [1,2,3,7], description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-rotation-with-highest-score": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,1,4,0], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-subarrays-with-bounded-maximum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,4,3], description: "Actual Example 1 from LeetCode." }
    ],
    "preimage-size-of-factorial-zeroes-function": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 0, description: "Actual Example 1 from LeetCode." }
    ],
    "domino-and-tromino-tiling": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "escape-the-ghosts": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0],[0,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "rotated-digits": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "k-th-smallest-prime-fraction": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,5], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-distance-between-bst-nodes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,6,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "transform-to-chessboard": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,1,0],[0,1,1,0],[1,0,0,1],[1,0,0,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "rabbits-in-forest": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "k-th-symbol-in-grammar": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "global-and-local-inversions": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,2], description: "Actual Example 1 from LeetCode." }
    ],
    "basic-calculator-iv": [
      { id: "d1", label: "Dataset 1", category: "standard", secondaryArray: [1], description: "Actual Example 1 from LeetCode." }
    ],
    "couples-holding-hands": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-plus-sign": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[4,2]], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "set-intersection-size-at-least-two": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3],[3,7],[8,9]], description: "Actual Example 1 from LeetCode." }
    ],
    "reach-a-number": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "cracking-the-safe": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "contain-virus": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,0,0,0,0,0,1],[0,1,0,0,0,0,0,1],[0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "cherry-pickup": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,-1],[1,0,-1],[1,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "monotone-increasing-digits": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "find-k-th-smallest-pair-distance": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,1], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "1-bit-and-2-bit-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,0], description: "Actual Example 1 from LeetCode." }
    ],
    "falling-squares": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3],[6,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-sum-of-3-non-overlapping-subarrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,1,2,6,7,5,1], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "longest-univalue-path": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,4,5,1,1,null,5], description: "Actual Example 1 from LeetCode." }
    ],
    "24-game": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,1,8,7], description: "Actual Example 1 from LeetCode." }
    ],
    "cut-off-trees-for-golf-event": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[0,0,4],[7,6,5]], description: "Actual Example 1 from LeetCode." }
    ],
    "bulb-switcher-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "kth-smallest-number-in-multiplication-table": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "beautiful-arrangement-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "non-decreasing-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "print-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,1,6,0,5], description: "Actual Example 1 from LeetCode." }
    ],
    "find-duplicate-subtrees": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,null,2,4,null,null,4], description: "Actual Example 1 from LeetCode." }
    ],
    "2-keys-keyboard": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-length-of-pair-chain": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3],[3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "shopping-offers": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[3,0,5],[1,2,10]], description: "Actual Example 1 from LeetCode." }
    ],
    "k-inverse-pairs-array": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-distance-in-arrays": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[4,5],[1,2,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "add-one-row-to-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,6,3,1,5], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "find-duplicate-file-in-system": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["root/a 1.txt(abcd) 2.txt(efgh)","root/c 3.txt(abcd)","root/c/d 4.txt(efgh)","root 4.txt(efgh)"], description: "Actual Example 1 from LeetCode." }
    ],
    "non-negative-integers-without-consecutive-ones": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "valid-square": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,0], secondaryArray: [1,1], description: "Actual Example 1 from LeetCode." }
    ],
    "erect-the-fence": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],[2,2],[2,0],[2,4],[3,3],[4,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "shortest-unsorted-continuous-subarray": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,6,4,8,10,9,15], description: "Actual Example 1 from LeetCode." }
    ],
    "out-of-boundary-paths": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "array-nesting": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,4,0,3,1,6,2], description: "Actual Example 1 from LeetCode." }
    ],
    "logical-or-of-two-binary-grids-represented-as-quad-trees": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "brick-wall": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,2,1],[3,1,2],[1,3,2],[2,4],[3,1,2],[1,3,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "optimal-division": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1000,100,10,2], description: "Actual Example 1 from LeetCode." }
    ],
    "student-attendance-record-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "remove-boxes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2,2,2,3,4,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-time-difference": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["23:59","00:00"], description: "Actual Example 1 from LeetCode." }
    ],
    "convert-bst-to-greater-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,1,6,0,2,5,7,null,null,null,3,null,null,null,8], description: "Actual Example 1 from LeetCode." }
    ],
    "k-diff-pairs-in-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,1,4,1,5], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "beautiful-arrangement": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "longest-uncommon-subsequence-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aba","cdc","eae"], description: "Actual Example 1 from LeetCode." }
    ],
    "super-washing-machines": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,5], description: "Actual Example 1 from LeetCode." }
    ],
    "find-largest-value-in-each-tree-row": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2,5,3,null,9], description: "Actual Example 1 from LeetCode." }
    ],
    "find-bottom-left-tree-value": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "most-frequent-subtree-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,2,-3], description: "Actual Example 1 from LeetCode." }
    ],
    "diagonal-traverse": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[4,5,6],[7,8,9]], description: "Actual Example 1 from LeetCode." }
    ],
    "non-decreasing-subsequences": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,6,7,7], description: "Actual Example 1 from LeetCode." }
    ],
    "predict-the-winner": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,5,2], description: "Actual Example 1 from LeetCode." }
    ],
    "magical-string": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "largest-palindrome-product": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "total-hamming-distance": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,14,2], description: "Actual Example 1 from LeetCode." }
    ],
    "heaters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], secondaryArray: [2], description: "Actual Example 1 from LeetCode." }
    ],
    "implement-rand10-using-rand7": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "count-the-repetitions": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["acb"], secondaryArray: ["ab"], description: "Actual Example 1 from LeetCode." }
    ],
    "island-perimeter": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,0,0],[1,1,1,0],[0,1,0,0],[1,1,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-moves-to-equal-array-elements-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "circular-array-loop": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,-1,1,2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "4sum-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2], secondaryArray: [-2,-1], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-moves-to-equal-array-elements": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "serialize-and-deserialize-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-boomerangs": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0],[1,0],[2,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "arithmetic-slices-ii-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,4,6,8,10], description: "Actual Example 1 from LeetCode." }
    ],
    "add-two-numbers-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [7,2,4,3], secondaryArray: [5,6,4], description: "Actual Example 1 from LeetCode." }
    ],
    "k-th-smallest-in-lexicographical-order": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 13, description: "Actual Example 1 from LeetCode." }
    ],
    "find-right-interval": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "n-ary-tree-level-order-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,3,2,4,null,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "reconstruct-original-digits-from-english": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["owoztneoer"], description: "Actual Example 1 from LeetCode." }
    ],
    "strong-password-checker": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a"], target: "a", description: "Actual Example 1 from LeetCode." }
    ],
    "arithmetic-slices": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "trapping-rain-water-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,4,3,1,3,2],[3,2,1,3,2,4],[2,3,3,2,3,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "queue-reconstruction-by-height": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[7,0],[4,4],[7,1],[5,0],[6,1],[5,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-watch": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "nth-digit": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "integer-replacement": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 8, description: "Actual Example 1 from LeetCode." }
    ],
    "rotate-function": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,3,2,6], description: "Actual Example 1 from LeetCode." }
    ],
    "utf-8-validation": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [197,130,1], description: "Actual Example 1 from LeetCode." }
    ],
    "perfect-rectangle": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,3,3],[3,1,4,2],[3,2,4,4],[1,3,2,4],[2,3,3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "elimination-game": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 9, description: "Actual Example 1 from LeetCode." }
    ],
    "lexicographical-numbers": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 13, description: "Actual Example 1 from LeetCode." }
    ],
    "combination-sum-iv": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "wiggle-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,7,4,9,2,5], description: "Actual Example 1 from LeetCode." }
    ],
    "guess-number-higher-or-lower-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "super-pow": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3], description: "Actual Example 1 from LeetCode." }
    ],
    "water-and-jug-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "max-sum-of-rectangle-no-larger-than-k": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,1],[0,-2,3]], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "count-numbers-with-unique-digits": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "russian-doll-envelopes": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[5,4],[6,4],[6,7],[2,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "integer-break": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "self-crossing": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "increasing-triplet-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "verify-preorder-serialization-of-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["9,3,4,#,#,1,#,#,2,#,6,#,#"], description: "Actual Example 1 from LeetCode." }
    ],
    "patching-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3], target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "count-of-range-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-2,5,-1], description: "Actual Example 1 from LeetCode." }
    ],
    "wiggle-sort-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,5,1,1,6,4], description: "Actual Example 1 from LeetCode." }
    ],
    "create-maximum-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,4,6,5], secondaryArray: [9,1,2,5,8,3], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "bulb-switcher": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "count-of-smaller-numbers-after-self": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,2,6,1], description: "Actual Example 1 from LeetCode." }
    ],
    "super-ugly-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,7,13,19], target: 12, description: "Actual Example 1 from LeetCode." }
    ],
    "expression-add-operators": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "perfect-squares": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 12, description: "Actual Example 1 from LeetCode." }
    ],
    "h-index-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,3,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "ugly-number-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-digit-one": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 13, description: "Actual Example 1 from LeetCode." }
    ],
    "the-skyline-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,9,10],[3,7,15],[5,12,12],[15,20,10],[19,24,8]], description: "Actual Example 1 from LeetCode." }
    ],
    "shortest-palindrome": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aacecaaa"], description: "Actual Example 1 from LeetCode." }
    ],
    "count-primes": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "remove-linked-list-elements": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,6,3,4,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "repeated-dna-sequences": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT"], description: "Actual Example 1 from LeetCode." }
    ],
    "factorial-trailing-zeroes": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-gap": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,6,9,1], description: "Actual Example 1 from LeetCode." }
    ],
    "max-points-on-a-line": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],[2,2],[3,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "best-time-to-buy-and-sell-stock-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,3,5,0,0,3,1,4], description: "Actual Example 1 from LeetCode." }
    ],
    "permutation-sequence": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "01-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,0],[0,1,0],[0,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "flood-fill": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,1],[1,1,0],[1,0,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-interval-to-include-each-query": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,4],[2,4],[3,6],[4,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "merge-triplets-to-form-target-triplet": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,5,3],[1,8,4],[1,7,5]], description: "Actual Example 1 from LeetCode." }
    ],
    "clone-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,4],[1,3],[2,4],[1,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-level-order-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-pairs": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "all-paths-from-source-to-target": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[3],[3],[]], description: "Actual Example 1 from LeetCode." }
    ],
    "keys-and-rooms": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1],[2],[3],[]], description: "Actual Example 1 from LeetCode." }
    ],
    "as-far-from-land-as-possible": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,1],[0,0,0],[1,0,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "shortest-path-in-binary-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "single-threaded-cpu": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,4],[3,2],[4,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-subsequence-score": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,3,2], secondaryArray: [2,1,3,4], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "ipo": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], secondaryArray: [0,1,1], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "subsets-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "permutations-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "palindrome-partitioning": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aab"], description: "Actual Example 1 from LeetCode." }
    ],
    "min-cost-climbing-stairs": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,15,20], description: "Actual Example 1 from LeetCode." }
    ],
    "best-time-to-buy-and-sell-stock-with-cooldown": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,0,2], description: "Actual Example 1 from LeetCode." }
    ],
    "best-time-to-buy-and-sell-stock-iv": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,4,1], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "unique-binary-search-trees-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "balanced-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "diameter-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "same-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], secondaryArray: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "symmetric-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,3,4,4,3], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-depth-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "path-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,4,8,11,null,13,4,7,2,null,null,null,1], description: "Actual Example 1 from LeetCode." }
    ],
    "path-sum-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,4,8,11,null,13,4,7,2,null,null,5,1], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-level-order-traversal-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "n-queens-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "combinations": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "gray-code": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "spiral-matrix-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "longest-substring-with-at-least-k-repeating-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "single-number-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,2,3,2], description: "Actual Example 1 from LeetCode." }
    ],
    "single-number-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,1,3,2,5], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-xor-of-two-numbers-in-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,10,5,25,2,8], description: "Actual Example 1 from LeetCode." }
    ],
    "swim-in-rising-water": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,2],[1,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "course-schedule-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[100,200],[200,1300],[1000,1250],[2000,3200]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-cost-to-hire-k-workers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,20,5], secondaryArray: [70,50,30], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "kth-smallest-element-in-a-sorted-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,5,9],[10,11,13],[12,13,15]], target: 8, description: "Actual Example 1 from LeetCode." }
    ],
    "find-k-pairs-with-smallest-sums": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,7,11], secondaryArray: [2,4,6], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "split-array-into-consecutive-subsequences": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "merge-two-binary-trees": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2,5], secondaryArray: [2,1,3,null,4,null,7], description: "Actual Example 1 from LeetCode." }
    ],
    "delete-the-middle-node-of-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,4,7,1,2,6], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-twin-sum-of-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,4,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-duplicate-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,4,2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "majority-element-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "max-consecutive-ones": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,0,1,1,1], description: "Actual Example 1 from LeetCode." }
    ],
    "intersection-of-two-arrays-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,1], secondaryArray: [2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "rearrange-array-elements-by-sign": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,1,-2,-5,2,-4], description: "Actual Example 1 from LeetCode." }
    ],
    "continuous-subarray-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [23,2,4,6,7], target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "find-all-duplicates-in-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,3,2,7,8,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "find-all-numbers-disappeared-in-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,3,2,7,8,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "set-mismatch": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,4], description: "Actual Example 1 from LeetCode." }
    ],
    "check-if-array-is-sorted-and-rotated": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,4,5,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "boats-to-save-people": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "fruit-into-baskets": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "max-consecutive-ones-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,1,0,0,0,1,1,1,1,0], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "binary-subarrays-with-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,1,0,1], description: "Actual Example 1 from LeetCode." }
    ],
    "count-number-of-nice-subarrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2,1,1], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "subarrays-with-k-different-integers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,1,2,3], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "frequency-of-the-most-frequent-element": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,4], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-operations-to-reduce-x-to-zero": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,4,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-points-you-can-obtain-from-cards": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,1], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "intersection-of-two-linked-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,1,8,4,5], secondaryArray: [5,6,1,8,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "sort-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "split-linked-list-in-parts": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "insert-greatest-common-divisors-in-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [18,6,10,3], description: "Actual Example 1 from LeetCode." }
    ],
    "delete-nodes-from-linked-list-present-in-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], secondaryArray: [1,2,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "merge-in-between-linked-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,1,13,6,9,5], secondaryArray: [1000000,1000001,1000002], description: "Actual Example 1 from LeetCode." }
    ],
    "swapping-nodes-in-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "find-minimum-in-rotated-sorted-array-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,5], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-number-of-days-to-make-m-bouquets": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,10,3,10,2], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "kth-missing-positive-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,4,7,11], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "count-negative-numbers-in-a-sorted-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[4,3,2,-1],[3,2,1,-1],[1,1,-1,-2],[-1,-1,-2,-3]], description: "Actual Example 1 from LeetCode." }
    ],
    "arranging-coins": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-limit-of-balls-in-a-bag": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [9], description: "Actual Example 1 from LeetCode." }
    ],
    "special-array-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "sum-of-subarray-ranges": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "next-greater-node-in-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,5], description: "Actual Example 1 from LeetCode." }
    ],
    "max-chunks-to-make-sorted": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,3,2,1,0], description: "Actual Example 1 from LeetCode." }
    ],
    "max-chunks-to-make-sorted-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,4,3,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "search-in-a-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,7,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "insert-into-a-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,7,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "two-sum-iv-input-is-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,3,6,2,4,null,7], target: 9, description: "Actual Example 1 from LeetCode." }
    ],
    "recover-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,null,null,2], description: "Actual Example 1 from LeetCode." }
    ],
    "construct-binary-search-tree-from-preorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [8,5,1,7,10,12], description: "Actual Example 1 from LeetCode." }
    ],
    "count-complete-tree-nodes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "cousins-in-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "increasing-order-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,3,6,2,4,null,8,1,null,null,null,7,9], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-level-sum-of-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,7,0,7,-8,null,null], description: "Actual Example 1 from LeetCode." }
    ],
    "leaf-similar-trees": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,5,1,6,2,9,8,null,null,7,4], secondaryArray: [3,5,1,6,7,4,2,null,null,null,null,null,null,9,8], description: "Actual Example 1 from LeetCode." }
    ],
    "pseudo-palindromic-paths-in-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,1,3,1,null,1], description: "Actual Example 1 from LeetCode." }
    ],
    "hand-of-straights": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,6,2,3,4,7,8], description: "Actual Example 1 from LeetCode." }
    ],
    "lemonade-change": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,5,5,10,20], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-number-of-arrows-to-burst-balloons": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[10,16],[2,8],[1,6],[7,12]], description: "Actual Example 1 from LeetCode." }
    ],
    "interval-list-intersections": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,2],[5,10],[13,23],[24,25]], description: "Actual Example 1 from LeetCode." }
    ],
    "car-pooling": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,1,5],[3,3,7]], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-average-pass-ratio": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[3,5],[2,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "matchsticks-to-square": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2,2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "path-with-minimum-effort": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,2],[3,8,2],[5,3,5]], description: "Actual Example 1 from LeetCode." }
    ],
    "find-eventual-safe-states": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3],[5],[0],[5],[],[]], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-ways-to-arrive-at-destination": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,6,7],[0,1,2],[1,2,3],[1,3,3],[6,3,3],[3,5,1],[6,5,1],[2,5,1],[0,4,5],[4,6,2]], target: 7, description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-operations-to-make-network-connected": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[0,2],[1,2]], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "critical-connections-in-a-network": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[1,2],[2,0],[1,3]], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-enclaves": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,0,0],[1,0,1,0],[0,1,1,0],[0,0,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,3],[1,2,1],[1,3,4],[2,3,1]], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "find-all-groups-of-farmland": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0,0],[0,1,1],[0,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "count-sub-islands": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,1,0,0],[0,1,1,1,1],[0,0,0,0,0],[1,0,0,0,0],[1,1,0,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "triangle": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2],[3,4],[6,5,7],[4,1,8,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "cherry-pickup-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[3,1,1],[2,5,1],[1,5,5],[2,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "best-time-to-buy-and-sell-stock-with-transaction-fee": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2,8,4,9], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-divisible-subset": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-longest-increasing-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,5,4,7], description: "Actual Example 1 from LeetCode." }
    ],
    "partition-array-for-maximum-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,15,7,9,2,5,10], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-xor-with-an-element-from-array": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[3,1],[1,3],[5,6]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-cost-to-cut-a-stick": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,4,5], target: 7, description: "Actual Example 1 from LeetCode." }
    ],
    "dungeon-game": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[-2,-3,3],[-5,-10,1],[10,30,-5]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-difficulty-of-a-job-schedule": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [6,5,4,3,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "counting-bits": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-inorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-preorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-postorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "ugly-number": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "first-bad-version": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "power-of-three": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 27, description: "Actual Example 1 from LeetCode." }
    ],
    "power-of-four": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 16, description: "Actual Example 1 from LeetCode." }
    ],
    "guess-number-higher-or-lower": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "sum-of-left-leaves": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "third-maximum-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "assign-cookies": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], secondaryArray: [1,1], description: "Actual Example 1 from LeetCode." }
    ],
    "license-key-formatting": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "teemo-attacking": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,4], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "find-mode-in-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "relative-ranks": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,4,3,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "detect-capital": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["USA"], target: "USA", description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-absolute-difference-in-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,6,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-string-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abcdefg"], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-depth-of-n-ary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,3,2,4,null,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "array-partition": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,4,3,2], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-tilt": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "reshape-the-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "distribute-candies": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2,2,3,3], description: "Actual Example 1 from LeetCode." }
    ],
    "n-ary-tree-preorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,3,2,4,null,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "n-ary-tree-postorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,null,3,2,4,null,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-harmonious-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2,2,5,2,3,7], description: "Actual Example 1 from LeetCode." }
    ],
    "range-addition-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,2],[3,3]], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "construct-string-from-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "average-of-levels-in-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-average-subarray-i": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,12,-5,-6,50,3], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "image-smoother": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,1],[1,0,1],[1,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "second-minimum-node-in-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,2,5,null,null,5,7], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-continuous-increasing-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,5,4,7], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-number-with-alternating-bits": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "degree-of-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-number-at-least-twice-of-others": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,6,1,0], description: "Actual Example 1 from LeetCode." }
    ],
    "toeplitz-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3,4],[5,1,2,3],[9,5,1,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "jewels-and-stones": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aA"], secondaryArray: ["aAAbbbb"], description: "Actual Example 1 from LeetCode." }
    ],
    "rotate-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abcde"], secondaryArray: ["cdeab"], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-lines-to-write-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-triangle-area": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0],[0,1],[1,0],[0,2],[2,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "goat-latin": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["I speak Goat Latin"], description: "Actual Example 1 from LeetCode." }
    ],
    "flipping-an-image": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,0],[1,0,1],[0,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "rectangle-overlap": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,0,2,2], secondaryArray: [1,1,3,3], description: "Actual Example 1 from LeetCode." }
    ],
    "peak-index-in-a-mountain-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,0], description: "Actual Example 1 from LeetCode." }
    ],
    "transpose-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[4,5,6],[7,8,9]], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-gap": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 22, description: "Actual Example 1 from LeetCode." }
    ],
    "fair-candy-swap": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1], secondaryArray: [2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "surface-area-of-3d-shapes": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "monotonic-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "sort-array-by-parity": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,1,2,4], description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-range-i": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1], target: 0, description: "Actual Example 1 from LeetCode." }
    ],
    "x-of-a-kind-in-a-deck-of-cards": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,4,3,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-only-letters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["ab-cd"], description: "Actual Example 1 from LeetCode." }
    ],
    "sort-array-by-parity-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,5,7], description: "Actual Example 1 from LeetCode." }
    ],
    "range-sum-of-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,5,15,3,7,null,18], target: 15, description: "Actual Example 1 from LeetCode." }
    ],
    "valid-mountain-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "di-string-match": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["IDID"], description: "Actual Example 1 from LeetCode." }
    ],
    "n-repeated-element-in-size-2n-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,3], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-perimeter-triangle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "add-to-array-form-of-integer": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,0,0], target: 34, description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-town-judge": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2]], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "maximize-sum-of-array-after-k-negations": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,3], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "complement-of-base-10-integer": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "binary-prefix-divisible-by-5": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,1], description: "Actual Example 1 from LeetCode." }
    ],
    "divisor-game": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "sum-of-root-to-leaf-binary-numbers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,1,0,1,0,1], description: "Actual Example 1 from LeetCode." }
    ],
    "valid-boomerang": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],[2,3],[3,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "height-checker": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,4,2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "duplicate-zeros": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,2,3,0,4,5,0], description: "Actual Example 1 from LeetCode." }
    ],
    "relative-sort-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,1,3,2,4,6,7,9,2,19], secondaryArray: [2,1,4,3,9,6], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-equivalent-domino-pairs": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,1],[3,4],[5,6]], description: "Actual Example 1 from LeetCode." }
    ],
    "n-th-tribonacci-number": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "day-of-the-week": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 8, description: "Actual Example 1 from LeetCode." }
    ],
    "unique-number-of-occurrences": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,1,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "check-if-it-is-a-straight-line": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]], description: "Actual Example 1 from LeetCode." }
    ],
    "cells-with-odd-values-in-a-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[1,1]], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "shift-2d-grid": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[4,5,6],[7,8,9]], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "find-winner-on-a-tic-tac-toe-game": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0],[2,0],[1,1],[2,1],[2,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-time-visiting-all-points": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],[3,4],[-1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "subtract-the-product-and-sum-of-digits-of-an-integer": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 234, description: "Actual Example 1 from LeetCode." }
    ],
    "element-appearing-more-than-25-in-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,6,6,6,6,7,10], description: "Actual Example 1 from LeetCode." }
    ],
    "find-numbers-with-even-number-of-digits": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [12,345,2,6,7896], description: "Actual Example 1 from LeetCode." }
    ],
    "replace-elements-with-greatest-element-on-right-side": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [17,18,5,4,6,1], description: "Actual Example 1 from LeetCode." }
    ],
    "decompress-run-length-encoded-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "matrix-diagonal-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[5]], description: "Actual Example 1 from LeetCode." }
    ],
    "check-if-n-and-its-double-exist": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,2,5,3], description: "Actual Example 1 from LeetCode." }
    ],
    "how-many-numbers-are-smaller-than-the-current-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [8,1,2,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-distance-value-between-two-arrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,5,8], secondaryArray: [10,9,1,8], description: "Actual Example 1 from LeetCode." }
    ],
    "create-target-array-in-the-given-order": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,2,3,4], secondaryArray: [0,1,2,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "count-largest-group": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 13, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-subsequence-in-non-increasing-order": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,3,10,9,8], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-value-to-get-positive-step-by-step-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-3,2,-3,4,2], description: "Actual Example 1 from LeetCode." }
    ],
    "kids-with-the-greatest-number-of-candies": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,5,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "check-if-all-1s-are-at-least-length-k-places-away": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,0,0,1,0,0,1], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "make-two-arrays-equal-by-reversing-subarrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], secondaryArray: [2,4,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "shuffle-the-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,4,3,2,1], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "running-sum-of-1d-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "defanging-an-ip-address": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["1.1.1.1"], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-good-pairs": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,1,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "richest-customer-wealth": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[3,2,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-highest-altitude": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-5,1,5,0,-7], description: "Actual Example 1 from LeetCode." }
    ],
    "decode-xored-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "calculate-money-in-leetcode-bank": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "find-center-of-star-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3],[4,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-ascending-subarray-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,20,30,5,10,50], description: "Actual Example 1 from LeetCode." }
    ],
    "truncate-sentence": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-operations-to-make-the-array-increasing": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,5,2,4,1], description: "Actual Example 1 from LeetCode." }
    ],
    "sign-of-the-product-of-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-1,-2,-3,-4,3,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-population-year": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1993,1999],[2000,2010]], description: "Actual Example 1 from LeetCode." }
    ],
    "closest-pair-of-points": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,3],[12,30],[40,50],[5,1],[12,10],[3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "strassens-matrix-multiplication": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "randomized-select": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,1,5,6,4], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "invert-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,7,1,3,6,9], description: "Actual Example 1 from LeetCode." }
    ],
    "subtree-of-another-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,4,5,1,2], secondaryArray: [4,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "lowest-common-ancestor-of-a-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [6,2,8,0,4,7,9,null,null,3,5], description: "Actual Example 1 from LeetCode." }
    ],
    "count-good-nodes-in-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,1,4,3,null,1,5], description: "Actual Example 1 from LeetCode." }
    ],
    "evaluate-reverse-polish-notation": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["2","1","+","3","*"], description: "Actual Example 1 from LeetCode." }
    ],
    "car-fleet": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,8,0,5,3], secondaryArray: [2,4,1,1,3], target: 12, description: "Actual Example 1 from LeetCode." }
    ],
    "next-greater-element-i": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,1,2], secondaryArray: [1,3,4,2], description: "Actual Example 1 from LeetCode." }
    ],
    "next-greater-element-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "132-pattern": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "sum-of-subarray-minimums": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,1,2,4], description: "Actual Example 1 from LeetCode." }
    ],
    "maximal-rectangle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["1"], secondaryArray: ["0"], matrix: [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-duplicates-from-sorted-array-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,1,2,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "ransom-note": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a"], secondaryArray: ["b"], description: "Actual Example 1 from LeetCode." }
    ],
    "h-index": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,0,6,1,5], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-size-subarray-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,1,2,4,3], target: 7, description: "Actual Example 1 from LeetCode." }
    ],
    "substring-with-concatenation-of-all-words": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["foo","bar"], description: "Actual Example 1 from LeetCode." }
    ],
    "3sum-closest": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-1,2,1,-4], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "two-sum-ii-input-array-is-sorted": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,7,11,15], target: 9, description: "Actual Example 1 from LeetCode." }
    ],
    "remove-duplicates-from-sorted-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "partition-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,4,3,2,5,2], description: "Actual Example 1 from LeetCode." }
    ],
    "rotate-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "odd-even-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "palindrome-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "insertion-sort-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "path-sum-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,5,-3,3,2,null,11,3,-2,null,1], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-paths": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,null,5], description: "Actual Example 1 from LeetCode." }
    ],
    "sum-root-to-leaf-numbers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "flatten-binary-tree-to-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,5,3,4,null,6], description: "Actual Example 1 from LeetCode." }
    ],
    "populating-next-right-pointers-in-each-node": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,7], description: "Actual Example 1 from LeetCode." }
    ],
    "populating-next-right-pointers-in-each-node-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,null,7], description: "Actual Example 1 from LeetCode." }
    ],
    "delete-node-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,3,6,2,4,null,7], description: "Actual Example 1 from LeetCode." }
    ],
    "trim-a-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,2], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "convert-sorted-array-to-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-10,-3,0,5,9], description: "Actual Example 1 from LeetCode." }
    ],
    "convert-sorted-list-to-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-10,-3,0,5,9], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-width-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,2,5,3,null,9], description: "Actual Example 1 from LeetCode." }
    ],
    "search-in-rotated-sorted-array-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,5,6,0,0,1,2], target: 0, description: "Actual Example 1 from LeetCode." }
    ],
    "surrounded-regions": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["X"], secondaryArray: ["X"], matrix: [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]], description: "Actual Example 1 from LeetCode." }
    ],
    "graph-valid-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[0,2],[0,3],[1,4]], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-connected-components-in-an-undirected-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[1,2],[3,4]], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "redundant-connection": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[1,3],[2,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "is-graph-bipartite": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[0,2],[0,1,3],[0,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "word-pattern": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abba"], secondaryArray: ["dog cat cat dog"], description: "Actual Example 1 from LeetCode." }
    ],
    "rank-teams-by-votes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["ABC","ACB","ABC","ACB","ACB"], description: "Actual Example 1 from LeetCode." }
    ],
    "high-access-employees": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a"], secondaryArray: ["0549"], matrix: [["a","0549"],["b","0457"],["a","0532"],["a","0621"],["b","0540"]], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-possible-sets-of-closing-branches": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,2],[1,2,10],[0,2,10]], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "make-lexicographically-smallest-array-by-swapping-elements": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,5,3,9,8], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-cost-to-convert-string-i": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a","b","c","c","e","d"], secondaryArray: ["b","c","b","e","b","e"], target: "acbe", description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-cost-to-convert-string-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a","b","c","c","e","d"], secondaryArray: ["b","c","b","e","b","e"], target: "acbe", description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-good-subarray-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "verbal-arithmetic-puzzle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["SEND","MORE"], target: "MONEY", description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-missing-non-negative-integer-after-operations": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,-10,7,13,6,8], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-time-to-visit-a-cell-in-a-grid": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,3,2],[5,1,2,5],[4,3,8,6]], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-square-area-by-removing-fences-from-a-field": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3], secondaryArray: [2], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-area-of-longest-diagonal-rectangle": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[9,3],[8,6]], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-score-with-co-prime-element": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,4,6], description: "Actual Example 1 from LeetCode." }
    ],
    "find-words-that-can-be-formed-by-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["cat","bt","hat","tree"], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-number-of-integers-to-choose-from-a-range-i": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,6,5], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-valid-move-combinations-on-chessboard": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["rook"], matrix: [[1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "count-array-pairs-divisible-by-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "count-the-number-of-vowel-strings-in-range": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["are","amy","u"], description: "Actual Example 1 from LeetCode." }
    ],
    "paint-house-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,10],[10,1],[10,1],[1,10],[5,1]], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-sum-obtained-of-any-permutation": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3],[0,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-smallest-divisor-given-a-threshold": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,5,9], target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-string-with-swaps": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["dcab"], matrix: [[0,3],[1,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-increment-to-make-array-unique": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "divide-players-into-teams-of-equal-skill": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,5,1,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "non-overlapping-intervals": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3],[3,4],[1,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "frog-jump": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,3,5,6,8,12,17], description: "Actual Example 1 from LeetCode." }
    ],
    "open-the-lock": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["0201","0101","0102","1212","2002"], target: "0202", description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-ways-to-form-a-target-string-given-a-dictionary": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["acca","bbbb","caca"], target: "aba", description: "Actual Example 1 from LeetCode." }
    ],
    "most-stones-removed-with-same-row-or-column": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0],[0,1],[1,0],[1,2],[2,1],[2,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "palindrome-pairs": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abcd","dcba","lls","s","sssll"], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-candies-you-can-get-from-boxes": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[],[],[1],[]], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-search": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-1,0,3,5,9,12], target: 9, description: "Actual Example 1 from LeetCode." }
    ],
    "sort-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "selection-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [64,25,12,22,11], description: "Actual Example 1 from LeetCode." }
    ],
    "insertion-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [12,11,13,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "quick-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,7,8,9,1,5], description: "Actual Example 1 from LeetCode." }
    ],
    "counting-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,2,8,3,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "radix-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [170,45,75,90,802,24,2,66], description: "Actual Example 1 from LeetCode." }
    ],
    "bucket-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [29,25,3,49,9,37,21,43], description: "Actual Example 1 from LeetCode." }
    ],
    "shell-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [12,34,54,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "heap-sort": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [12,11,13,5,6,7], description: "Actual Example 1 from LeetCode." }
    ],
    "linear-search": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,7,1,9,3], target: 7, description: "Actual Example 1 from LeetCode." }
    ],
    "jump-search": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,1,2,3,5,8,13,21,34,55,89,144], target: 55, description: "Actual Example 1 from LeetCode." }
    ],
    "interpolation-search": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,12,13,16,18,19,20,21,22,23,24,33,35,42,47], target: 18, description: "Actual Example 1 from LeetCode." }
    ],
    "exponential-search": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,4,10,40], target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "fibonacci-search": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,22,35,40,45,50,80,82,85,90,100], target: 85, description: "Actual Example 1 from LeetCode." }
    ],
    "longest-common-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abcde"], secondaryArray: ["ace"], description: "Actual Example 1 from LeetCode." }
    ],
    "average-waiting-time": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,5],[4,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "all-nodes-distance-k-in-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,5,1,6,2,0,8,null,null,7,4], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "count-subarrays-with-median-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,1,4,5], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-units-on-a-truck": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3],[2,2],[3,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "magnetic-force-between-two-balls": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,7], description: "Actual Example 1 from LeetCode." }
    ],
    "k-closest-points-to-origin": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3],[-2,2]], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "last-stone-weight": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,7,4,1,8,1], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-earnings-from-taxi": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,5,4],[1,5,1]], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-equal-sum-of-two-arrays-after-replacing-zeros": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,0,1,0], secondaryArray: [6,5,0], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-path-quality-of-a-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,10],[1,2,15],[0,3,10]], description: "Actual Example 1 from LeetCode." }
    ],
    "count-vowel-substrings-of-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aeiouu"], target: "aeiouu", description: "Actual Example 1 from LeetCode." }
    ],
    "sort-characters-by-frequency": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["tree"], description: "Actual Example 1 from LeetCode." }
    ],
    "vertical-order-traversal-of-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-stones-to-minimize-the-total": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,4,9], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "partition-array-into-two-arrays-to-minimize-sum-difference": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,7,3], description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-range-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1], target: 0, description: "Actual Example 1 from LeetCode." }
    ],
    "nim-game": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-increasing-paths-in-a-grid": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],[3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "divide-intervals-into-minimum-number-of-groups": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[5,10],[6,8],[1,5],[2,3],[1,10]], description: "Actual Example 1 from LeetCode." }
    ],
    "delete-node-in-a-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,5,1,9], description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-substrings-between-each-pair-of-parentheses": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["(abcd)"], description: "Actual Example 1 from LeetCode." }
    ],
    "sort-array-by-increasing-frequency": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2,2,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-processing-time": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [8,10], secondaryArray: [2,2,3,1,8,7,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-k-digits": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["1432219"], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "is-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abc"], secondaryArray: ["ahbgdc"], target: "ahbgdc", description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-cost-for-tickets": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,4,6,7,8,20], secondaryArray: [2,7,15], description: "Actual Example 1 from LeetCode." }
    ],
    "pacific-atlantic-water-flow": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-repeating-character-replacement": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["ABAB"], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "single-element-in-a-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2,3,3,4,4,8,8], description: "Actual Example 1 from LeetCode." }
    ],
    "next-greater-element-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 12, description: "Actual Example 1 from LeetCode." }
    ],
    "contiguous-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1], description: "Actual Example 1 from LeetCode." }
    ],
    "split-the-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "reformat-date": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["20th Oct 2052"], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-number-of-visible-points": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,1],[2,2],[3,3]], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-original-array-of-prefix-xor": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,2,0,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "unique-paths-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,0],[0,1,0],[0,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "power-of-two": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-number-of-events-that-can-be-attended": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3],[3,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-linked-list-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "sliding-puzzle": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[4,0,5]], description: "Actual Example 1 from LeetCode." }
    ],
    "delete-duplicate-folders-in-system": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a"], secondaryArray: ["c"], matrix: [["a"],["c"],["d"],["a","b"],["c","b"],["d","a"]], description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["h","e","l","l","o"], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-duplicates-from-sorted-list-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,3,4,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "middle-of-the-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-width-of-columns-of-a-grid": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1],[22],[333]], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-string-chain": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a","b","ba","bca","bda","bdca"], description: "Actual Example 1 from LeetCode." }
    ],
    "count-vowel-strings-in-ranges": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aba"], secondaryArray: ["bcb"], matrix: [[0,2],[1,4],[1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "unique-binary-search-trees": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "count-nodes-with-the-highest-score": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-1,2,0,2,0], description: "Actual Example 1 from LeetCode." }
    ],
    "calculate-amount-paid-in-taxes": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[3,50],[7,10],[12,25]], description: "Actual Example 1 from LeetCode." }
    ],
    "alert-using-same-key-card-three-or-more-times-in-a-one-hour-period": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["daniel","daniel","daniel","luis","luis","luis","luis"], secondaryArray: ["10:00","10:40","11:00","09:00","11:00","13:00","15:00"], description: "Actual Example 1 from LeetCode." }
    ],
    "the-kth-factor-of-n": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 12, description: "Actual Example 1 from LeetCode." }
    ],
    "count-prefix-and-suffix-pairs-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a","aba","ababa","aa"], description: "Actual Example 1 from LeetCode." }
    ],
    "maximize-distance-to-closest-person": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,0,0,1,0,1], description: "Actual Example 1 from LeetCode." }
    ],
    "capacity-to-ship-packages-within-d-days": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,7,8,9,10], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-duplicate-letters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["bcabc"], description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-range-covering-elements-from-k-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[4,10,15,24,26],[0,9,12,20],[5,18,22,30]], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-atoms": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["H2O"], description: "Actual Example 1 from LeetCode." }
    ],
    "count-good-meals": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,5,7,9], description: "Actual Example 1 from LeetCode." }
    ],
    "snakes-and-ladders": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,35,-1,-1,13,-1],[-1,-1,-1,-1,-1,-1],[-1,15,-1,-1,-1,-1]], description: "Actual Example 1 from LeetCode." }
    ],
    "step-by-step-directions-from-a-binary-tree-node-to-another": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,1,2,3,null,6,4], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-flowers-in-full-bloom": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,6],[3,7],[9,12],[4,13]], description: "Actual Example 1 from LeetCode." }
    ],
    "convert-binary-number-in-a-linked-list-to-integer": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,1], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-cameras": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,0,null,0,0], description: "Actual Example 1 from LeetCode." }
    ],
    "repeated-substring-pattern": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abab"], description: "Actual Example 1 from LeetCode." }
    ],
    "linked-list-cycle-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,0,-4], description: "Actual Example 1 from LeetCode." }
    ],
    "univalued-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,1,1,1,null,1], description: "Actual Example 1 from LeetCode." }
    ],
    "furthest-building-you-can-reach": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,7,6,9,14,12], description: "Actual Example 1 from LeetCode." }
    ],
    "contains-duplicate-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-length-of-repeated-subarray": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,2,1], secondaryArray: [3,2,1,4,7], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-product-subarray": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,-2,4], description: "Actual Example 1 from LeetCode." }
    ],
    "can-place-flowers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,0,0,1], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "partition-to-k-equal-sum-subsets": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,3,2,3,5,2,1], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "exclusive-time-of-functions": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["0:start:0","1:start:2","1:end:5","0:end:6"], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "flatten-nested-list-iterator": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1],2,[1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "edit-distance": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["horse"], secondaryArray: ["ros"], description: "Actual Example 1 from LeetCode." }
    ],
    "valid-triangle-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "reorder-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "closest-equal-element-queries": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,1,4,1,3,2], secondaryArray: [0,3,5], description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-substring-with-identical-characters-i": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["000001"], description: "Actual Example 1 from LeetCode." }
    ],
    "smallest-substring-with-identical-characters-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["000001"], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-adjacent-almost-equal-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aaaaa"], target: "aaaaa", description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-palindromes-after-operations": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abbb","ba","aa"], description: "Actual Example 1 from LeetCode." }
    ],
    "power-grid-maintenance": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3],[3,4],[4,5]], description: "Actual Example 1 from LeetCode." }
    ],
    "count-the-number-of-fair-pairs": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,7,4,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "minimize-maximum-component-cost": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,4],[1,2,3],[1,3,2],[3,4,6]], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "contains-duplicate-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,1], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-depth-of-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "word-ladder-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["hot","dot","dog","lot","log","cog"], description: "Actual Example 1 from LeetCode." }
    ],
    "house-robber-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,2], description: "Actual Example 1 from LeetCode." }
    ],
    "time-needed-to-rearrange-a-binary-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["0110101"], description: "Actual Example 1 from LeetCode." }
    ],
    "delete-and-earn": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,4,2], description: "Actual Example 1 from LeetCode." }
    ],
    "maximal-square": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["1"], secondaryArray: ["0"], matrix: [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]], description: "Actual Example 1 from LeetCode." }
    ],
    "game-of-life": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1,0],[0,0,1],[1,1,1],[0,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "happy-number": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 19, description: "Actual Example 1 from LeetCode." }
    ],
    "sudoku-solver": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["5"], secondaryArray: ["3"], matrix: [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]], description: "Actual Example 1 from LeetCode." }
    ],
    "parallel-courses-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3],[2,3]], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-black-blocks": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0]], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-operations-to-write-the-letter-y-on-a-grid": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,2],[1,1,0],[0,1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-length-of-the-longest-common-prefix": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,10,100], secondaryArray: [1000], description: "Actual Example 1 from LeetCode." }
    ],
    "contains-duplicate": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "summary-ranges": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,2,4,5,7], description: "Actual Example 1 from LeetCode." }
    ],
    "isomorphic-strings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["egg"], secondaryArray: ["add"], target: "add", description: "Actual Example 1 from LeetCode." }
    ],
    "palindromic-substrings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abc"], description: "Actual Example 1 from LeetCode." }
    ],
    "find-k-closest-elements": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "intersection-of-two-arrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,2,1], secondaryArray: [2,2], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-operations-to-reduce-an-integer-to-0": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 39, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-number-of-occurrences-of-a-substring": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aababcaab"], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-product-of-three-numbers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "minimize-malware-spread": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,0],[1,1,0],[0,0,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-number-of-taps-to-open-to-water-a-garden": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,4,1,1,0,0], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "zigzag-conversion": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["PAYPALISHIRING"], description: "Actual Example 1 from LeetCode." }
    ],
    "search-suggestions-system": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["mobile","mouse","moneypot","monitor","mousepad"], description: "Actual Example 1 from LeetCode." }
    ],
    "house-robber-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,3,null,3,null,1], description: "Actual Example 1 from LeetCode." }
    ],
    "missing-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,0,1], description: "Actual Example 1 from LeetCode." }
    ],
    "backspace-string-compare": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["ab#c"], secondaryArray: ["ad#c"], target: "ad#c", description: "Actual Example 1 from LeetCode." }
    ],
    "find-pivot-index": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,7,3,6,5,6], description: "Actual Example 1 from LeetCode." }
    ],
    "sliding-window-median": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,-1,-3,5,3,6,7], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-replacements-to-sort-the-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,3], description: "Actual Example 1 from LeetCode." }
    ],
    "special-binary-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["11011000"], description: "Actual Example 1 from LeetCode." }
    ],
    "restore-ip-addresses": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["25525511135"], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,2], description: "Actual Example 1 from LeetCode." }
    ],
    "shortest-path-in-a-grid-with-obstacles-elimination": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,0],[1,1,0],[0,0,0],[0,1,1],[0,0,0]], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "permutation-in-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["ab"], secondaryArray: ["eidbaooo"], description: "Actual Example 1 from LeetCode." }
    ],
    "maximize-greatness-of-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,5,2,1,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "fibonacci-number": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "break-a-palindrome": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abccba"], description: "Actual Example 1 from LeetCode." }
    ],
    "linked-list-cycle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,0,-4], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-zigzag-level-order-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,9,20,null,null,15,7], description: "Actual Example 1 from LeetCode." }
    ],
    "4sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0,-1,0,-2,2], target: 0, description: "Actual Example 1 from LeetCode." }
    ],
    "single-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "largest-rectangle-in-histogram": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,5,6,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "concatenation-of-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "split-array-largest-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [7,2,5,10,8], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "find-minimum-in-rotated-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,4,5,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "knight-probability-in-chessboard": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "first-missing-positive": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,0], description: "Actual Example 1 from LeetCode." }
    ],
    "combination-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,6,7], target: 7, description: "Actual Example 1 from LeetCode." }
    ],
    "jump-game-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,1,1,4], description: "Actual Example 1 from LeetCode." }
    ],
    "permutations": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "count-and-say": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "pairs-of-songs-with-total-durations-divisible-by-60": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [30,20,150,100,40], description: "Actual Example 1 from LeetCode." }
    ],
    "unique-paths": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 7, description: "Actual Example 1 from LeetCode." }
    ],
    "swap-nodes-in-pairs": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "search-insert-position": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,5,6], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "valid-arrangement-of-pairs": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[5,1],[4,5],[11,9],[9,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "robot-return-to-origin": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["UD"], description: "Actual Example 1 from LeetCode." }
    ],
    "add-binary": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["11"], secondaryArray: ["1"], description: "Actual Example 1 from LeetCode." }
    ],
    "corporate-flight-bookings": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,10],[2,3,20],[2,5,25]], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-length-of-string-after-deleting-similar-ends": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["ca"], description: "Actual Example 1 from LeetCode." }
    ],
    "multiply-strings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["2"], secondaryArray: ["3"], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-cost-homecoming-of-a-robot-in-a-grid": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,0], secondaryArray: [2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "range-product-queries-of-powers": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[2,2],[0,3]], target: 15, description: "Actual Example 1 from LeetCode." }
    ],
    "shortest-subarray-with-sum-at-least-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-minimum-amount-of-time-to-brew-potions": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,5,2,4], secondaryArray: [5,1,4,2], description: "Actual Example 1 from LeetCode." }
    ],
    "plus-one": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "keep-multiplying-found-values-by-two": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,3,6,1,12], description: "Actual Example 1 from LeetCode." }
    ],
    "count-number-of-texts": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["22233"], description: "Actual Example 1 from LeetCode." }
    ],
    "successful-pairs-of-spells-and-potions": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,1,3], secondaryArray: [1,2,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "find-all-good-indices": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,1,1,3,4,1], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "determine-if-two-events-have-conflict": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["01:15","02:00"], secondaryArray: ["02:00","03:00"], description: "Actual Example 1 from LeetCode." }
    ],
    "count-palindromic-subsequences": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["103301"], description: "Actual Example 1 from LeetCode." }
    ],
    "count-collisions-of-monkeys-on-a-polygon": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-falling-path-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,1,3],[6,5,4],[7,8,9]], description: "Actual Example 1 from LeetCode." }
    ],
    "print-zero-even-odd": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "sort-the-jumbled-numbers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [8,9,4,0,2,1,3,5,7,6], secondaryArray: [991,338,38], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-number-of-chairs-in-a-waiting-room": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["EEEEEEE"], description: "Actual Example 1 from LeetCode." }
    ],
    "insert-interval": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3],[6,9]], description: "Actual Example 1 from LeetCode." }
    ],
    "search-a-2d-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "fizz-buzz": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "daily-temperatures": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [73,74,75,71,69,72,76,73], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-maximum-path-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "find-all-anagrams-in-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["cbaebabacd"], secondaryArray: ["abc"], description: "Actual Example 1 from LeetCode." }
    ],
    "reconstruct-itinerary": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["MUC"], secondaryArray: ["LHR"], matrix: [["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-winner-of-the-circular-game": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "string-to-integer-atoi": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["42"], description: "Actual Example 1 from LeetCode." }
    ],
    "count-pairs-of-similar-strings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aba","aabb","abcd","bac","aabc"], description: "Actual Example 1 from LeetCode." }
    ],
    "maximize-value-of-function-in-a-ball-passing-game": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,0,1], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "find-valid-pair-of-adjacent-digits-in-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["2523533"], description: "Actual Example 1 from LeetCode." }
    ],
    "compare-version-numbers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["1.2"], secondaryArray: ["1.10"], description: "Actual Example 1 from LeetCode." }
    ],
    "search-a-2d-matrix-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,4,7,11,15],[2,5,8,12,19],[3,6,9,16,22],[10,13,14,17,24],[18,21,23,26,30]], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "serialize-and-deserialize-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,null,null,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "escape-the-spreading-fire": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,2,0,0,0,0,0],[0,0,0,2,2,1,0],[0,2,0,0,1,2,0],[0,0,2,2,2,0,2],[0,0,0,0,0,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "split-message-based-on-limit": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["this is really a very awesome message"], description: "Actual Example 1 from LeetCode." }
    ],
    "rotating-the-box": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["#"], secondaryArray: ["."], matrix: [["#",".","#"]], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-element": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "decode-ways": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["12"], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-index-of-the-first-occurrence-in-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["sadbutsad"], secondaryArray: ["sad"], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-number-of-increments-on-subarrays-to-form-a-target-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "binary-tree-right-side-view": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,null,5,null,4], description: "Actual Example 1 from LeetCode." }
    ],
    "count-ways-to-build-good-strings": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "count-ways-to-group-overlapping-ranges": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[6,10],[5,15]], description: "Actual Example 1 from LeetCode." }
    ],
    "count-distinct-numbers-on-board": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "minimize-length-of-array-using-operations": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,4,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "count-the-number-of-houses-at-a-certain-distance-i": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "count-the-number-of-houses-at-a-certain-distance-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "all-ancestors-of-a-node-in-a-directed-acyclic-graph": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,3],[0,4],[1,3],[2,4],[2,7],[3,5],[3,6],[3,7],[4,6]], target: 8, description: "Actual Example 1 from LeetCode." }
    ],
    "lucky-numbers-in-a-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[3,7,8],[9,11,13],[15,16,17]], description: "Actual Example 1 from LeetCode." }
    ],
    "html-entity-parser": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["&amp; is an HTML entity but &ambassador; is not."], target: "&amp; is an HTML entity but &ambassador; is not.", description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-path-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3,1],[1,5,1],[4,2,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "house-robber": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "basic-calculator-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["3+2*2"], description: "Actual Example 1 from LeetCode." }
    ],
    "letter-combinations-of-a-phone-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["23"], description: "Actual Example 1 from LeetCode." }
    ],
    "sort-colors": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,0,2,1,1,0], description: "Actual Example 1 from LeetCode." }
    ],
    "find-peak-element": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,1], description: "Actual Example 1 from LeetCode." }
    ],
    "validate-binary-search-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "asteroid-collision": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,10,-5], description: "Actual Example 1 from LeetCode." }
    ],
    "find-minimum-time-to-reach-last-room-i": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,4],[4,4]], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-nth-node-from-end-of-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-bits": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 43261596, description: "Actual Example 1 from LeetCode." }
    ],
    "subarray-product-less-than-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,5,2,6], target: 100, description: "Actual Example 1 from LeetCode." }
    ],
    "count-the-hidden-sequences": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,-3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-increasing-path-in-a-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[9,9,4],[6,6,8],[2,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "valid-parenthesis-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["()"], description: "Actual Example 1 from LeetCode." }
    ],
    "max-area-of-island": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,0,1,0,0,0,0,1,0,0,0,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,1,1,0,1,0,0,0,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0,1,0,0],[0,1,0,0,1,1,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1,0,0,0],[0,0,0,0,0,0,0,1,1,0,0,0,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "remove-all-adjacent-duplicates-in-string-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abcd"], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "set-matrix-zeroes": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,1,1],[1,0,1],[1,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "basic-calculator": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["1 + 1"], description: "Actual Example 1 from LeetCode." }
    ],
    "top-k-frequent-words": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["i","love","leetcode","i","love","coding"], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "shortest-bridge": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "number-of-1-bits": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 11, description: "Actual Example 1 from LeetCode." }
    ],
    "string-compression": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a","a","b","b","c","c","c"], description: "Actual Example 1 from LeetCode." }
    ],
    "word-break": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leet","code"], description: "Actual Example 1 from LeetCode." }
    ],
    "final-prices-with-a-special-discount-in-a-shop": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [8,4,6,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-absolute-difference": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,2,1,3], description: "Actual Example 1 from LeetCode." }
    ],
    "add-strings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["11"], secondaryArray: ["123"], description: "Actual Example 1 from LeetCode." }
    ],
    "robot-bounded-in-circle": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["GGLLGG"], description: "Actual Example 1 from LeetCode." }
    ],
    "valid-parentheses": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["()"], description: "Actual Example 1 from LeetCode." }
    ],
    "text-justification": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["This","is","an","example","of","text","justification."], target: 16, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-edge-reversals-so-every-node-is-reachable": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,0],[2,1],[1,3]], target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "rotting-oranges": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[2,1,1],[1,1,0],[0,1,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "search-in-rotated-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [4,5,6,7,0,1,2], target: 0, description: "Actual Example 1 from LeetCode." }
    ],
    "remove-duplicates-from-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "subarray-sum-equals-k": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,1], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-subarray": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-2,1,-3,4,-1,2,1,-5,4], description: "Actual Example 1 from LeetCode." }
    ],
    "merge-two-sorted-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,4], secondaryArray: [1,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "roman-to-integer": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["III"], description: "Actual Example 1 from LeetCode." }
    ],
    "find-first-and-last-position-of-element-in-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [5,7,7,8,8,10], target: 8, description: "Actual Example 1 from LeetCode." }
    ],
    "product-of-array-except-self": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-consecutive-sequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [100,4,200,1,3,2], description: "Actual Example 1 from LeetCode." }
    ],
    "create-hello-world-function": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [], description: "Actual Example 1 from LeetCode." }
    ],
    "coin-change": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,5], description: "Actual Example 1 from LeetCode." }
    ],
    "rotate-image": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[4,5,6],[7,8,9]], description: "Actual Example 1 from LeetCode." }
    ],
    "valid-palindrome": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["A man, a plan, a canal: Panama"], description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-words-in-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["the sky is blue"], description: "Actual Example 1 from LeetCode." }
    ],
    "copy-list-with-random-pointer": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[7,null],[13,0],[11,4],[10,2],[1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "valid-number": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["0"], description: "Actual Example 1 from LeetCode." }
    ],
    "evaluate-division": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a"], secondaryArray: ["b"], matrix: [["a","b"],["b","c"]], description: "Actual Example 1 from LeetCode." }
    ],
    "count-paths-that-can-form-a-palindrome-in-a-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-1,0,0,1,1,2], description: "Actual Example 1 from LeetCode." }
    ],
    "lowest-common-ancestor-of-a-binary-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,5,1,6,2,0,8,null,null,7,4], description: "Actual Example 1 from LeetCode." }
    ],
    "generate-parentheses": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "subsets": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "spiral-matrix": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,3],[4,5,6],[7,8,9]], description: "Actual Example 1 from LeetCode." }
    ],
    "kth-largest-element-in-an-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,1,5,6,4], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "word-ladder": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["hot","dot","dog","lot","log","cog"], description: "Actual Example 1 from LeetCode." }
    ],
    "best-time-to-buy-and-sell-stock-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [7,1,5,3,6,4], description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-nodes-in-k-group": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "making-a-large-island": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0],[0,1]], description: "Actual Example 1 from LeetCode." }
    ],
    "maximum-value-at-a-given-index-in-a-bounded-array": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "climbing-stairs": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "move-zeroes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,0,3,12], description: "Actual Example 1 from LeetCode." }
    ],
    "block-placement-queries": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2],[2,3,3],[2,3,1],[2,2,2]], description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-one-bit-operations-to-make-integers-zero": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "jump-game": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,3,1,1,4], description: "Actual Example 1 from LeetCode." }
    ],
    "profitable-schemes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,2], secondaryArray: [2,3], target: 5, description: "Actual Example 1 from LeetCode." }
    ],
    "two-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,7,11,15], target: 9, description: "Actual Example 1 from LeetCode." }
    ],
    "trapping-rain-water": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [0,1,0,2,1,0,1,3,2,1,2,1], description: "Actual Example 1 from LeetCode." }
    ],
    "bus-routes": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,2,7],[3,6,7]], target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [8,2,4,7], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-increasing-subsequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10,9,2,5,3,7,101,18], description: "Actual Example 1 from LeetCode." }
    ],
    "merge-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,0,0,0], secondaryArray: [2,5,6], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "longest-substring-without-repeating-characters": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a", "b", "c", "a", "b", "c", "b", "b"], description: "Actual Example 1 from LeetCode." }
    ],
    "powx-n": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 10, description: "Actual Example 1 from LeetCode." }
    ],
    "merge-intervals": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,3],[2,6],[8,10],[15,18]], description: "Actual Example 1 from LeetCode." }
    ],
    "simplify-path": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["/home/"], description: "Actual Example 1 from LeetCode." }
    ],
    "squares-of-a-sorted-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-4,-1,0,3,10], description: "Actual Example 1 from LeetCode." }
    ],
    "add-two-numbers": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2,4,3], secondaryArray: [5,6,4], description: "Actual Example 1 from LeetCode." }
    ],
    "construct-quad-tree": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0,1],[1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "best-time-to-buy-and-sell-stock": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [7,1,5,3,6,4], description: "Actual Example 1 from LeetCode." }
    ],
    "course-schedule": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,0]], description: "Actual Example 1 from LeetCode." }
    ],
    "subarray-with-elements-greater-than-varying-threshold": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,4,3,1], target: 6, description: "Actual Example 1 from LeetCode." }
    ],
    "kth-smallest-element-in-a-bst": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,1,4,null,2], target: 1, description: "Actual Example 1 from LeetCode." }
    ],
    "group-anagrams": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["eat","tea","tan","ate","nat","bat"], description: "Actual Example 1 from LeetCode." }
    ],
    "find-the-closest-palindrome": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["123"], description: "Actual Example 1 from LeetCode." }
    ],
    "median-of-two-sorted-arrays": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3], secondaryArray: [2], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-palindromic-substring": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["babad"], description: "Actual Example 1 from LeetCode." }
    ],
    "3sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [-1,0,1,2,-1,-4], description: "Actual Example 1 from LeetCode." }
    ],
    "invalid-transactions": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["alice,20,800,mtv","alice,50,100,beijing"], description: "Actual Example 1 from LeetCode." }
    ],
    "longest-common-prefix": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["flower","flow","flight"], description: "Actual Example 1 from LeetCode." }
    ],
    "reorganize-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aab"], description: "Actual Example 1 from LeetCode." }
    ],
    "flatten-a-multilevel-doubly-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,null,null,null,7,8,9,10,null,null,11,12], description: "Actual Example 1 from LeetCode." }
    ],
    "next-permutation": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "word-search": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["A"], secondaryArray: ["B"], matrix: [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], target: "ABCCED", description: "Actual Example 1 from LeetCode." }
    ],
    "first-unique-character-in-a-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["leetcode"], description: "Actual Example 1 from LeetCode." }
    ],
    "rotate-array": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5,6,7], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "decode-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["3[a]2[bc]"], description: "Actual Example 1 from LeetCode." }
    ],
    "merge-k-sorted-lists": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1,4,5],[1,3,4],[2,6]], description: "Actual Example 1 from LeetCode." }
    ],
    "fraction-to-recurring-decimal": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "top-k-frequent-elements": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,1,1,2,2,3], target: 2, description: "Actual Example 1 from LeetCode." }
    ],
    "reverse-linked-list": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,2,3,4,5], description: "Actual Example 1 from LeetCode." }
    ],
    "container-with-most-water": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,8,6,2,5,4,8,3,7], description: "Actual Example 1 from LeetCode." }
    ],
    "majority-element": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,2,3], description: "Actual Example 1 from LeetCode." }
    ],
    "sliding-window-maximum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1,3,-1,-3,5,3,6,7], target: 3, description: "Actual Example 1 from LeetCode." }
    ],
    "koko-eating-bananas": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3,6,7,11], target: 8, description: "Actual Example 1 from LeetCode." }
    ],
    "valid-anagram": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["anagram"], secondaryArray: ["nagaram"], target: "nagaram", description: "Actual Example 1 from LeetCode." }
    ],
    "n-queens": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, description: "Actual Example 1 from LeetCode." }
    ],
    "minimum-window-substring": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["ADOBECODEBANC"], secondaryArray: ["ABC"], target: "ABC", description: "Actual Example 1 from LeetCode." }
    ]
,
    "fractional-knapsack": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [60, 100, 120], secondaryArray: [10, 20, 30], target: 50, description: "Values, Weights, and W." }
    ],
    "0-1-knapsack-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3], secondaryArray: [4, 5, 1], target: 4, description: "Values, Weights, and W." }
    ],
    "target-sum": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 1, 1, 1, 1], target: 3, description: "Array of nums and target sum." }
    ],
    "coin-change-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 5], target: 5, description: "Coins array and amount." }
    ],
    "last-stone-weight-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2, 7, 4, 1, 8, 1], description: "Array of stones." }
    ],
    "ones-and-zeroes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["10", "0001", "111001", "1", "0"], target: 5, k: 3, description: "Array of strings, m, and n." }
    ],
    "combination-sum-iii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 7, k: 3, description: "k numbers sum up to n." }
    ],
    "subset-sums": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [2, 3], description: "Array of elements." }
    ],
    "distinct-subsequences-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abc"], description: "String s." }
    ],
    "interleaving-string": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aabcc"], secondaryArray: ["dbbca"], target: "aadbbcbcac", description: "Strings s1, s2, and s3." }
    ],
    "shortest-common-supersequence": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["abac"], secondaryArray: ["cab"], description: "Strings str1 and str2." }
    ],
    "delete-operation-for-two-strings": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["sea"], secondaryArray: ["eat"], description: "Strings word1 and word2." }
    ],
    "uncrossed-lines": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 4, 2], secondaryArray: [1, 2, 4], description: "Arrays nums1 and nums2." }
    ],
    "matrix-chain-multiplication": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [10, 20, 30, 40, 30], description: "Array p representing matrix dimensions." }
    ],
    "word-break-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", target: "catsanddog", array: ["cat", "cats", "and", "sand", "dog"], description: "String s and wordDict." }
    ],
    "distinct-subsequences": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["rabbbit"], secondaryArray: ["rabbit"], description: "Strings s and t." }
    ],
    "wildcard-matching": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aa"], secondaryArray: ["a"], description: "String s and pattern p." }
    ],
    "regular-expression-matching": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["aa"], secondaryArray: ["a"], description: "String s and pattern p." }
    ],
    "gas-station": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 2, 3, 4, 5], secondaryArray: [3, 4, 5, 1, 2], description: "Gas and cost arrays." }
    ],
    "job-sequencing-problem": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 4, 20], [2, 1, 10], [3, 1, 40], [4, 1, 30]], description: "Jobs array." }
    ],
    "n-meetings-in-one-room": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [1, 3, 0, 5, 8, 5], secondaryArray: [2, 4, 6, 7, 9, 9], description: "Start and end times." }
    ],
    "minimum-platforms": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [900, 940, 950, 1100, 1500, 1800], secondaryArray: [910, 1200, 1120, 1130, 1900, 2000], description: "Arrival and departure times." }
    ],
    "meeting-rooms-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0, 30], [5, 10], [15, 20]], description: "Meeting intervals." }
    ],
    "dijkstras-algorithm": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 6, matrix: [[0, 1, 4], [0, 2, 4], [1, 2, 2], [2, 3, 3], [2, 4, 1], [2, 5, 6], [3, 5, 2], [4, 5, 3]], k: 0, description: "V, edges, S." }
    ],
    "bellman-ford-algorithm": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 6, matrix: [[0, 1, 5], [1, 2, -2], [1, 5, -3], [2, 4, 3], [3, 2, 6], [3, 4, -2], [5, 3, 1]], k: 0, description: "V, edges, S." }
    ],
    "floyd-warshall": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0, 3, -1, 7], [8, 0, 2, -1], [5, -1, 0, 1], [2, -1, -1, 0]], description: "Adjacency matrix." }
    ],
    "prims-algorithm": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 5, matrix: [[0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8], [1, 4, 5], [2, 4, 7]], description: "V and edges." }
    ],
    "kruskals-algorithm": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, matrix: [[0, 1, 10], [0, 2, 6], [0, 3, 5], [1, 3, 15], [2, 3, 4]], description: "V and edges." }
    ],
    "min-cost-to-connect-all-points": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]], description: "Points array." }
    ],
    "accounts-merge": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [["John", "johnsmith@mail.com", "john_newyork@mail.com"], ["John", "johnsmith@mail.com", "john00@mail.com"], ["Mary", "mary@mail.com"], ["John", "johnnybravo@mail.com"]], description: "Accounts array." }
    ],
    "satisfiability-of-equality-equations": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["a==b", "b!=a"], description: "Equations array." }
    ],
    "redundant-connection-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", matrix: [[1, 2], [1, 3], [2, 3]], description: "Edges array." }
    ],
    "alien-dictionary": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["wrt", "wrf", "er", "ett", "rftt"], description: "Words array." }
    ],
    "minimum-height-trees": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, matrix: [[1, 0], [1, 2], [1, 3]], description: "n and edges." }
    ],
    "implement-trie-ii": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["apple", "apple", "apple", "app", "apple", "apple", "app", "apple", "app"], description: "Commands and inputs." }
    ],
    "longest-string-with-all-prefixes": [
      { id: "d1", label: "Dataset 1", category: "standard", array: ["n", "ni", "nin", "ninj", "ninja", "ninga"], description: "Words array." }
    ],
    "construct-binary-tree-from-preorder-and-inorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [3, 9, 20, 15, 7], secondaryArray: [9, 3, 15, 20, 7], description: "Preorder and inorder arrays." }
    ],
    "construct-binary-tree-from-inorder-and-postorder-traversal": [
      { id: "d1", label: "Dataset 1", category: "standard", array: [9, 3, 15, 20, 7], secondaryArray: [9, 15, 7, 20, 3], description: "Inorder and postorder arrays." }
    ],
    "rat-in-a-maze-problem-i": [
      { id: "d1", label: "Dataset 1", category: "standard", target: 4, matrix: [[1, 0, 0, 0], [1, 1, 0, 1], [1, 1, 0, 0], [0, 1, 1, 1]], description: "N and matrix." }
    ]
  };

  const isIsland = isIslandOrGridProblem(slug, topics);
  const isMatrixTransform = isMatrixTransformationProblem(slug, topics);
  const isTwoSeq = isTwoSequenceProblem(slug, topics);
  const isInterval = isIntervalProblem(slug, topics);
  const isBit = isBitManipulationProblem(slug, topics);
  const isTrie = isTrieProblem(slug, topics);
  const isHeap = isHeapProblem(slug, topics);
  const isUnion = isUnionFindProblem(slug, topics);
  const isDp = isDpProblem(slug, topics);
  const isTopo = isTopologicalSortProblem(slug, topics);
  const isWordLadder = isWordLadderProblem(slug, topics);
  const isQueueSim = isQueueSimulationProblem(slug, topics);
  const isDesign = isDesignProblem(slug, topics);
  const isDynamicWindow = isDynamicSlidingWindowProblem(slug, topics);
  const isInPlacePointers = isInPlacePointerProblem(slug, topics);
  const isPrefixSum = isPrefixSumProblem(slug, topics);
  const primaryType = pickShape(slug, topics);
  const isGraph =
    primaryType === "graph" ||
    topics.some((t) => /graph|union|topological/i.test(t)) ||
    /graph|course-schedule|clone-graph|network-delay|bipartite|judge|redundant|alien-dictionary|word-ladder/i.test(slug);
  const isParentheses = /parenthes|bracket/i.test(slug);
  const isString =
    !isParentheses &&
    !isTwoSeq &&
    !isInterval &&
    !isBit &&
    !isTrie &&
    !isHeap &&
    !isUnion &&
    !isDp &&
    !isTopo &&
    !isWordLadder &&
    !isQueueSim &&
    !isDesign &&
    (topics.some((t) => /string/i.test(t)) ||
      /string|password|word|text|roman|palindrome|anagram|capital|morse|subsequence|prefix/i.test(
        slug,
      ));

  if (isDesign) {
    const designData = CANONICAL_DESIGN_DATASETS[slug];
    if (designData) {
      const d1: TestDataset = {
        id: "dataset_1",
        label: "Dataset 1: Standard Case",
        description: designData.d1.desc,
        array: designData.d1.array,
        k: designData.d1.k,
        category: "standard",
      };
      const d2: TestDataset = {
        id: "dataset_2",
        label: "Dataset 2: Longer & Complex Trace ⚡",
        description: designData.d2.desc,
        array: designData.d2.array,
        k: designData.d2.k,
        category: "longer",
      };
      const d3: TestDataset = {
        id: "dataset_3",
        label: "Dataset 3: Edge & Boundary Case",
        description: designData.d3.desc,
        array: designData.d3.array,
        k: designData.d3.k,
        category: "edge",
      };
      return [d1, d2, d3];
    }
  }

  if (isQueueSim) {
    const qData = CANONICAL_QUEUE_DATASETS[slug];
    const a1 = qData?.d1.array ?? (sampleInputFor(slug, 7, topics) || [17, 13, 11, 2, 3, 5, 7]);
    const a2 = qData?.d2.array ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a3 = qData?.d3.array ?? [1, 1000];

    const d1: TestDataset = {
      id: "dataset_1",
      label: "Dataset 1: Standard Case",
      description:
        qData?.d1.desc ??
        "Standard canonical queue simulation example verifying step-by-step state transitions.",
      array: a1,
      category: "standard",
    };
    const d2: TestDataset = {
      id: "dataset_2",
      label: "Dataset 2: Longer & Complex Trace ⚡",
      description:
        qData?.d2.desc ??
        "Extended multi-step queue simulation verifying rotation dynamics and buffer scaling.",
      array: a2,
      category: "longer",
    };
    const d3: TestDataset = {
      id: "dataset_3",
      label: "Dataset 3: Edge & Boundary Case",
      description:
        qData?.d3.desc ??
        "Boundary edge cases testing minimal buffer sizing and fast-turn termination.",
      array: a3,
      category: "edge",
    };
    return [d1, d2, d3];
  }

  if (isWordLadder) {
    const wl = CANONICAL_WORD_LADDER_DATASETS[slug];
    if (wl) {
      const d1: TestDataset = {
        id: "dataset_1",
        label: "Dataset 1: Standard Case",
        description: wl.d1.desc,
        array: wl.d1.array,
        matrix: wl.d1.matrix,
        target: wl.d1.target,
        category: "standard",
      };
      const d2: TestDataset = {
        id: "dataset_2",
        label: "Dataset 2: Longer & Complex Trace ⚡",
        description: wl.d2.desc,
        array: wl.d2.array,
        matrix: wl.d2.matrix,
        target: wl.d2.target,
        category: "longer",
      };
      const d3: TestDataset = {
        id: "dataset_3",
        label: "Dataset 3: Edge & Boundary Case",
        description: wl.d3.desc,
        array: wl.d3.array,
        matrix: wl.d3.matrix,
        target: wl.d3.target,
        category: "edge",
      };
      return [d1, d2, d3];
    }
  }

  if (isTopo) {
    const topo = CANONICAL_TOPOLOGICAL_DATASETS[slug];
    if (topo) {
      const d1: TestDataset = {
        id: "dataset_1",
        label: "Dataset 1: Standard Case",
        description: topo.d1.desc,
        array: topo.d1.array,
        matrix: topo.d1.matrix,
        target: topo.d1.target,
        category: "standard",
      };
      const d2: TestDataset = {
        id: "dataset_2",
        label: "Dataset 2: Longer & Complex Trace ⚡",
        description: topo.d2.desc,
        array: topo.d2.array,
        matrix: topo.d2.matrix,
        target: topo.d2.target,
        category: "longer",
      };
      const d3: TestDataset = {
        id: "dataset_3",
        label: "Dataset 3: Edge & Boundary Case",
        description: topo.d3.desc,
        array: topo.d3.array,
        matrix: topo.d3.matrix,
        target: topo.d3.target,
        category: "edge",
      };
      return [d1, d2, d3];
    }
  }

  if (isTwoSeq) {
    const dual = CANONICAL_DUAL_SEQUENCES[slug];
    if (dual) {
      const d1: TestDataset = {
        id: "dataset_1",
        label: "Dataset 1: Standard Case",
        description: dual.d1.desc ?? "Standard two-sequence canonical example.",
        array: dual.d1.array,
        secondaryArray: dual.d1.secondaryArray,
        target: dual.d1.target,
        k: dual.d1.k,
        category: "standard",
      };
      const d2: TestDataset = {
        id: "dataset_2",
        label: "Dataset 2: Longer & Complex Trace ⚡",
        description: dual.d2.desc ?? "Extended two-sequence alignment.",
        array: dual.d2.array,
        secondaryArray: dual.d2.secondaryArray,
        target: dual.d2.target,
        k: dual.d2.k,
        category: "longer",
      };
      const d3: TestDataset = {
        id: "dataset_3",
        label: "Dataset 3: Edge & Boundary Case",
        description: dual.d3.desc ?? "Edge-case boundary sequence comparison.",
        array: dual.d3.array,
        secondaryArray: dual.d3.secondaryArray,
        target: dual.d3.target,
        k: dual.d3.k,
        category: "edge",
      };
      return [d1, d2, d3];
    } else {
      const s1 = sampleInputFor(slug, undefined, topics);
      const s2 = ["a", "c", "e"];
      const d1: TestDataset = {
        id: "dataset_1",
        label: "Dataset 1: Standard Case",
        description: "Standard two-sequence input.",
        array: s1,
        secondaryArray: s2,
        category: "standard",
      };
      const d2: TestDataset = {
        id: "dataset_2",
        label: "Dataset 2: Longer & Complex Trace ⚡",
        description: "Extended two-sequence alignment.",
        array: ["p", "r", "o", "g", "r", "a", "m", "m", "i", "n", "g"],
        secondaryArray: ["r", "a", "m", "i", "n", "g"],
        category: "longer",
      };
      const d3: TestDataset = {
        id: "dataset_3",
        label: "Dataset 3: Edge & Boundary Case",
        description: "Disjoint or boundary two-sequence case.",
        array: ["a", "b", "c"],
        secondaryArray: ["d", "e", "f"],
        category: "edge",
      };
      return [d1, d2, d3];
    }
  }

  if (isDp) {
    const dpData = CANONICAL_DP_DATASETS[slug];
    const a1 = dpData?.d1.array ?? [2, 7, 9, 3, 1];
    const a2 = dpData?.d2.array ?? [2, 1, 1, 2, 3, 1, 5, 2, 8, 1, 9, 4];
    const a3 = dpData?.d3.array ?? [0];

    const d1: TestDataset = {
      id: "dataset_1",
      label: "Dataset 1: Standard Case",
      description: dpData?.d1.desc ?? "Standard Dynamic Programming transition dataset.",
      array: a1,
      secondaryArray: dpData?.d1.secondaryArray,
      matrix: dpData?.d1.matrix,
      target: dpData?.d1.target,
      k: dpData?.d1.k,
      category: "standard",
    };
    const d2: TestDataset = {
      id: "dataset_2",
      label: "Dataset 2: Longer & Complex Trace ⚡",
      description: dpData?.d2.desc ?? "Extended multi-step state table verifying memoization and subproblem optimality.",
      array: a2,
      secondaryArray: dpData?.d2.secondaryArray,
      matrix: dpData?.d2.matrix,
      target: dpData?.d2.target,
      k: dpData?.d2.k,
      category: "longer",
    };
    const d3: TestDataset = {
      id: "dataset_3",
      label: "Dataset 3: Edge & Boundary Case",
      description: dpData?.d3.desc ?? "Boundary edge cases testing base conditions, unreachable targets, or 1-element limits.",
      array: a3,
      secondaryArray: dpData?.d3.secondaryArray,
      matrix: dpData?.d3.matrix,
      target: dpData?.d3.target,
      k: dpData?.d3.k,
      category: "edge",
    };
    return [d1, d2, d3];
  }

  if (isUnion) {
    const unionData = CANONICAL_UNION_FIND_DATASETS[slug];
    const m1 = unionData?.d1.matrix ?? [
      [1, 2],
      [1, 3],
      [2, 3],
    ];
    const m2 = unionData?.d2.matrix ?? [
      [1, 2],
      [2, 3],
      [3, 4],
      [1, 4],
      [1, 5],
    ];
    const m3 = unionData?.d3.matrix ?? [
      [1, 2],
      [2, 3],
      [3, 1],
    ];

    const d1: TestDataset = {
      id: "dataset_1",
      label: "Dataset 1: Standard Case",
      description: unionData?.d1.desc ?? "Standard Union-Find / DSU connectivity graph.",
      matrix: m1,
      array: unionData?.d1.array ?? (m1.length > 0 ? m1.flat() : [1, 2, 3]),
      category: "standard",
    };
    const d2: TestDataset = {
      id: "dataset_2",
      label: "Dataset 2: Longer & Complex Trace ⚡",
      description: unionData?.d2.desc ?? "Extended multi-component network testing path compression and component merging.",
      matrix: m2,
      array: unionData?.d2.array ?? (m2.length > 0 ? m2.flat() : [1, 2, 3, 4, 5]),
      category: "longer",
    };
    const d3: TestDataset = {
      id: "dataset_3",
      label: "Dataset 3: Edge & Boundary Case",
      description: unionData?.d3.desc ?? "Boundary cases testing cycles, single isolated nodes, or full disconnection.",
      matrix: m3,
      array: unionData?.d3.array ?? (m3.length > 0 ? m3.flat() : [1]),
      category: "edge",
    };
    return [d1, d2, d3];
  }

  if (isHeap) {
    const heapData = CANONICAL_HEAP_DATASETS[slug];
    const a1 = heapData?.d1.array ?? [3, 2, 1, 5, 6, 4];
    const a2 =
      heapData?.d2.array ?? [3, 2, 3, 1, 2, 4, 5, 5, 6, 7, 7, 8, 2, 3, 1];
    const a3 = heapData?.d3.array ?? [2, 2, 2, 2];

    const d1: TestDataset = {
      id: "dataset_1",
      label: "Dataset 1: Standard Case",
      description: heapData?.d1.desc ?? "Standard heap and priority queue test input.",
      array: a1,
      k: heapData?.d1.k,
      target: heapData?.d1.target,
      category: "standard",
    };
    const d2: TestDataset = {
      id: "dataset_2",
      label: "Dataset 2: Longer & Complex Trace ⚡",
      description: heapData?.d2.desc ?? "Extended stream testing heap push/pop dynamics and rebalancing.",
      array: a2,
      k: heapData?.d2.k,
      target: heapData?.d2.target,
      category: "longer",
    };
    const d3: TestDataset = {
      id: "dataset_3",
      label: "Dataset 3: Edge & Boundary Case",
      description: heapData?.d3.desc ?? "Boundary edge cases testing single elements, duplicates, or extreme sizes.",
      array: a3,
      k: heapData?.d3.k,
      target: heapData?.d3.target,
      category: "edge",
    };
    return [d1, d2, d3];
  }

  if (isTrie) {
    const trieData = CANONICAL_TRIE_DATASETS[slug];
    const a1 = trieData?.d1.array ?? ["apple", "app", "applause", "apt", "bat"];
    const a2 =
      trieData?.d2.array ?? [
        "code",
        "coder",
        "coding",
        "cool",
        "data",
        "database",
        "date",
        "day",
      ];
    const a3 = trieData?.d3.array ?? ["a", "aa", "aaa", "ab", "b"];

    const d1: TestDataset = {
      id: "dataset_1",
      label: "Dataset 1: Standard Case",
      description: trieData?.d1.desc ?? "Standard word bank with shared prefixes and branch points.",
      array: a1,
      target: trieData?.d1.target,
      category: "standard",
    };
    const d2: TestDataset = {
      id: "dataset_2",
      label: "Dataset 2: Longer & Complex Trace ⚡",
      description: trieData?.d2.desc ?? "Extended hierarchical dictionary testing multi-branch Trie insertion and prefix sharing.",
      array: a2,
      target: trieData?.d2.target,
      category: "longer",
    };
    const d3: TestDataset = {
      id: "dataset_3",
      label: "Dataset 3: Edge & Boundary Case",
      description: trieData?.d3.desc ?? "Boundary cases testing single-character words, duplicate chains, and non-existent queries.",
      array: a3,
      target: trieData?.d3.target,
      category: "edge",
    };
    return [d1, d2, d3];
  }

  if (isBit) {
    const bitData = CANONICAL_BIT_DATASETS[slug];
    const a1 = bitData?.d1.array ?? [4, 1, 2, 1, 2];
    const a2 = bitData?.d2.array ?? [7, 3, 5, 4, 5, 3, 4, 9, 8, 8, 9, 12, 7, 15, 12];
    const a3 = bitData?.d3.array ?? [1];

    const d1: TestDataset = {
      id: "dataset_1",
      label: "Dataset 1: Standard Case",
      description: bitData?.d1.desc ?? "Standard bit manipulation example verifying XOR and binary operations.",
      array: a1,
      target: bitData?.d1.target,
      category: "standard",
    };
    const d2: TestDataset = {
      id: "dataset_2",
      label: "Dataset 2: Longer & Complex Trace ⚡",
      description: bitData?.d2.desc ?? "Extended bit sequence with multiple canceling pairs or multi-bit words.",
      array: a2,
      target: bitData?.d2.target,
      category: "longer",
    };
    const d3: TestDataset = {
      id: "dataset_3",
      label: "Dataset 3: Edge & Boundary Case",
      description: bitData?.d3.desc ?? "Boundary edge cases testing zero, single bits, power-of-two, or extreme values.",
      array: a3,
      target: bitData?.d3.target,
      category: "edge",
    };
    return [d1, d2, d3];
  }

  if (isInterval) {
    const inter = CANONICAL_INTERVALS[slug];
    const m1 = inter?.d1.matrix ?? [
      [1, 3],
      [2, 6],
      [8, 10],
      [15, 18],
    ];
    const m2 = inter?.d2.matrix ?? [
      [1, 4],
      [2, 5],
      [4, 7],
      [8, 10],
      [9, 12],
      [11, 15],
    ];
    const m3 = inter?.d3.matrix ?? [
      [1, 4],
      [4, 5],
    ];

    const d1: TestDataset = {
      id: "dataset_1",
      label: "Dataset 1: Standard Case",
      description: inter?.d1.desc ?? "Standard intervals verifying baseline merging and overlap logic.",
      matrix: m1,
      array: m1.flat(),
      target: inter?.d1.target,
      category: "standard",
    };
    const d2: TestDataset = {
      id: "dataset_2",
      label: "Dataset 2: Longer & Complex Trace ⚡",
      description: inter?.d2.desc ?? "Extended multi-interval chain with multiple overlaps and span consolidations.",
      matrix: m2,
      array: m2.flat(),
      target: inter?.d2.target,
      category: "longer",
    };
    const d3: TestDataset = {
      id: "dataset_3",
      label: "Dataset 3: Edge & Boundary Case",
      description: inter?.d3.desc ?? "Boundary intervals testing shared endpoints, single-point contacts, and disjoint sets.",
      matrix: m3,
      array: m3.flat(),
      target: inter?.d3.target,
      category: "edge",
    };
    return [d1, d2, d3];
  }

  let baseArray!: (number | string)[];
  let baseMatrix: (number | string)[][] | undefined;
  let baseTree: (number | string | null)[] | undefined;
  let baseTarget: number | string | undefined;
  let baseSecondaryArray: (number | string)[] | undefined;
  let baseDescription: string | undefined;

  const isGenericDummyDataset = (d: TestDataset | undefined): boolean => {
    if (!d || !d.array) return false;
    const arr = d.array;
    if (
      arr.length === 5 &&
      arr[0] === 1 &&
      arr[1] === 5 &&
      arr[2] === 3 &&
      arr[3] === 4 &&
      arr[4] === 2 &&
      d.target === 3
    ) {
      return true;
    }
    if (
      arr.length === 7 &&
      arr[0] === 4 &&
      arr[1] === 2 &&
      arr[2] === 6 &&
      arr[3] === 1 &&
      arr[4] === 3 &&
      arr[5] === 5 &&
      arr[6] === 7 &&
      d.target === 3
    ) {
      return true;
    }
    return false;
  };

  const rawCustomD1 = isParentheses ? undefined : CUSTOM_DATASETS[slug]?.[0];
  const customD1 = isGenericDummyDataset(rawCustomD1) ? undefined : rawCustomD1;
  if (customD1) {
    if (customD1.array && customD1.array.length > 0) baseArray = customD1.array;
    if (customD1.secondaryArray && customD1.secondaryArray.length > 0) baseSecondaryArray = customD1.secondaryArray;
    if (customD1.matrix && customD1.matrix.length > 0) baseMatrix = customD1.matrix;
    if (customD1.tree && customD1.tree.length > 0) baseTree = customD1.tree;
    if (customD1.target !== undefined) baseTarget = customD1.target;
    if (customD1.description) baseDescription = customD1.description;
  }

  if (!baseArray) {
    if (isGraph) {
      baseMatrix = CANONICAL_MATRICES[slug] ?? [
        [0, 1, 1, 0],
        [0, 0, 0, 1],
        [0, 0, 0, 1],
        [0, 0, 0, 0],
      ];
      baseArray = Array.from({ length: baseMatrix.length }, (_, i) => i);
    } else if (isIsland) {
      baseMatrix = sampleMatrixFor(slug);
      baseArray = baseMatrix.flat().filter((x): x is number => typeof x === "number");
    } else if (isMatrixTransform) {
      baseMatrix = CANONICAL_MATRICES[slug]
        ? CANONICAL_MATRICES[slug]!.map((r) => [...r])
        : [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
          ];
      baseArray = baseMatrix.flat().filter((x): x is number => typeof x === "number");
    } else if (primaryType === "tree" || primaryType === "bst" || primaryType === "heap" || primaryType === "trie") {
      baseTree = sampleTreeFor(slug);
      baseArray = baseTree.filter((x): x is number | string => x !== null && x !== undefined && String(x) !== "null");
    } else if (isParentheses) {
      baseArray = ["(", "{", "[", "]", "}", ")"];
    } else if (isDynamicWindow) {
      if (slug === "longest-substring-without-repeating-characters") {
        baseArray = ["a", "b", "c", "a", "b", "c", "b", "b"];
        baseDescription = "Canonical string 'abcabcbb' testing window shrink on duplicate characters.";
      } else if (slug === "minimum-window-substring") {
        baseArray = ["A", "D", "O", "B", "E", "C", "O", "D", "E", "B", "A", "N", "C"];
        baseSecondaryArray = ["A", "B", "C"];
        baseDescription = "String S and pattern T='ABC'.";
      } else if (slug === "max-consecutive-ones-iii") {
        baseArray = [1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0];
        baseTarget = 2;
        baseDescription = "Binary sequence with k=2 zero-flips permitted.";
      } else {
        baseArray = sampleInputFor(slug, undefined, topics);
      }
    } else if (isInPlacePointers) {
      if (slug === "move-zeroes") {
        baseArray = [0, 1, 0, 3, 12];
        baseDescription = "Standard array with interleaved zeroes for slow/fast in-place compaction.";
      } else if (slug === "remove-duplicates-from-sorted-array") {
        baseArray = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];
        baseDescription = "Sorted array with duplicate runs for in-place unique compaction.";
      } else if (slug === "sort-colors") {
        baseArray = [2, 0, 2, 1, 1, 0];
        baseDescription = "Dutch National Flag 3-pointer partition array (0=red, 1=white, 2=blue).";
      } else {
        baseArray = sampleInputFor(slug, undefined, topics);
      }
    } else if (isPrefixSum) {
      if (slug === "subarray-sum-equals-k") {
        baseArray = [1, 1, 1];
        baseTarget = 2;
        baseDescription = "Standard array testing prefix sum count for k=2.";
      } else if (slug === "contiguous-array") {
        baseArray = [0, 1, 0, 1, 1, 1, 0, 0];
        baseDescription = "Binary array finding maximum contiguous subarray with equal 0s and 1s.";
      } else {
        baseArray = sampleInputFor(slug, undefined, topics);
      }
    } else {
      baseArray = sampleInputFor(slug, undefined, topics);
    }
  }

  if (slug === "two-sum") baseTarget = 9;
  else if (slug === "3sum") baseTarget = 0;
  else if (slug === "subarray-sum-equals-k") baseTarget = 2;
  else if (slug === "max-consecutive-ones-iii") baseTarget = 2;
  else if (baseTarget === undefined && !isGraph && !isIsland && !isMatrixTransform && !isParentheses && !isString && !isDynamicWindow && typeof baseArray[Math.floor(baseArray.length / 2)] === "number") {
    baseTarget = baseArray[Math.floor(baseArray.length / 2)];
  }

  // 1. Dataset 1 (Standard / Canonical)
  const d1: TestDataset = {
    id: "dataset_1",
    label: "Dataset 1: Standard Case",
    description: baseDescription ?? (isGraph
      ? "Standard 4-node directed acyclic graph (DAG) verifying path traversal and topological ordering."
      : isParentheses
        ? "Balanced parentheses sequence with nested bracket pairs."
        : "Standard canonical problem example verifying baseline correctness."),
    array: baseArray,
    secondaryArray: baseSecondaryArray,
    matrix: baseMatrix,
    tree: baseTree,
    target: baseTarget,
    category: "standard",
  };

  // 2. Dataset 2 (Longer & Complex Trace ⚡)
  let d2Array: (number | string)[];
  let d2Matrix: (number | string)[][] | undefined;
  let d2Tree: (number | string | null)[] | undefined;
  let d2Target: number | string | undefined;
  let d2Desc = "Extended multi-step input producing a longer duration animation (25–40+ steps).";

  if (isGraph) {
    d2Matrix = [
      [0, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 1, 1],
      [0, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 0],
    ];
    d2Array = [0, 1, 2, 3, 4, 5];
    d2Desc =
      "Expansive 6-node multi-branch network for comprehensive BFS/DFS graph exploration.";
  } else if (isIsland) {
    d2Matrix = [
      [0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 1, 1, 0, 0, 0, 1, 0],
      [1, 0, 0, 1, 1, 1, 0, 0, 0, 0],
      [1, 1, 0, 0, 1, 1, 0, 1, 1, 1],
      [0, 1, 0, 0, 1, 1, 0, 1, 1, 1],
      [0, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    d2Array = d2Matrix.flat().filter((x): x is number => typeof x === "number");
    d2Desc =
      "Expansive 8×10 archipelago grid with multiple landmasses (including a 10-cell giant island) producing a rich multi-step DFS/BFS animation.";
  } else if (isMatrixTransform) {
    if (slug === "set-matrix-zeroes") {
      d2Matrix = [
        [1, 2, 3, 4, 5, 6],
        [7, 0, 9, 10, 11, 12],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 0, 23, 24],
        [25, 26, 27, 28, 29, 30],
      ];
      d2Desc =
        "Extended 5×6 matrix with multiple distributed zeroes (at [1,1] and [3,3]) producing a rich, comprehensive cell-by-cell row and column transformation trace.";
    } else {
      const baseR = baseMatrix?.length ?? 3;
      const baseC = baseMatrix?.[0]?.length ?? 3;
      const rows = Math.max(5, baseR + 2);
      const cols = Math.max(6, baseC + 2);
      d2Matrix = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ((r * cols + c + 1) % 40) + 1),
      );
      d2Desc = `Extended ${rows}×${cols} matrix for comprehensive in-place 2D grid iteration and transformation.`;
    }
    d2Array = d2Matrix.flat().filter((x): x is number => typeof x === "number");
  } else if (isDynamicWindow) {
    if (slug === "longest-substring-without-repeating-characters") {
      d2Array = ["p", "w", "w", "k", "e", "w", "a", "b", "c", "d", "e", "f", "k", "e", "w"];
      d2Desc = "Extended 15-character sequence with multiple duplicate boundaries for a longer window animation.";
    } else if (slug === "minimum-window-substring") {
      d2Array = ["A", "A", "B", "D", "E", "C", "O", "D", "E", "B", "A", "N", "C", "X", "Y", "Z", "A", "B", "C"];
      d2Desc = "Extended search sequence testing multiple candidate windows.";
    } else if (slug === "max-consecutive-ones-iii") {
      d2Array = [0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1];
      d2Target = 3;
      d2Desc = "Extended 19-element binary sequence with k=3 zero-flips.";
    } else {
      d2Array = ["a", "b", "c", "d", "b", "c", "e", "f", "g", "h", "c", "d", "i", "j", "k"];
      d2Desc = "Extended 15-character sequence for in-depth sliding window traversal.";
    }
  } else if (isInPlacePointers) {
    if (slug === "move-zeroes") {
      d2Array = [0, 1, 0, 3, 12, 0, 0, 5, 8, 0, 9, 0, 14, 15];
      d2Desc = "Extended 14-element array with multiple adjacent and trailing zeroes for fast/slow write-pointer trace.";
    } else if (slug === "remove-duplicates-from-sorted-array") {
      d2Array = [1, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 5, 6, 7, 7, 8];
      d2Desc = "Extended 17-element sorted array with repeated duplicate clusters for in-place compaction.";
    } else if (slug === "sort-colors") {
      d2Array = [2, 0, 1, 2, 1, 0, 0, 2, 1, 2, 0, 1, 1, 2, 0];
      d2Desc = "Extended 15-element 3-color array testing Dutch National Flag multi-swap partitioning.";
    } else {
      d2Array = [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 6, 7, 8];
      d2Desc = "Extended array for in-place pointer simulation.";
    }
  } else if (isPrefixSum) {
    if (slug === "subarray-sum-equals-k") {
      d2Array = [3, 4, 7, 2, -3, 1, 4, 2, 0, 1];
      d2Target = 7;
      d2Desc = "Extended sequence with mixed positives, negatives, and zeroes yielding multiple sum=7 subarrays.";
    } else if (slug === "contiguous-array") {
      d2Array = [0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1];
      d2Desc = "Extended 16-element binary sequence with fluctuating prefix sum balance.";
    } else {
      d2Array = [2, -1, 3, 1, -2, 4, -3, 5, -1, 2];
      d2Target = 5;
      d2Desc = "Extended array with mixed signs for comprehensive prefix sum tracking.";
    }
  } else if (primaryType === "tree" || primaryType === "bst" || primaryType === "heap" || primaryType === "trie") {
    d2Tree = [
      10,
      5,
      20,
      3,
      8,
      15,
      28,
      1,
      4,
      6,
      9,
      12,
      18,
      24,
      32,
      null,
      2,
      null,
      null,
      7,
      null,
      null,
      null,
      null,
      14,
      16,
      19,
      22,
      26,
      30,
      35,
    ];
    d2Array = [
      10, 5, 20, 3, 8, 15, 28, 1, 4, 6, 9, 12, 18, 24, 32, 2, 7, 14, 16, 19, 22, 26, 30, 35,
    ];
    d2Desc =
      "Deep 23-node multi-level binary tree structure generating an extensive hierarchical DFS/BFS traversal animation.";
  } else if (primaryType === "matrix") {
    d2Matrix = [
      [1, 2, 3, 4, 5, 6],
      [7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24],
      [25, 26, 27, 28, 29, 30],
      [31, 32, 33, 34, 35, 36],
    ];
    d2Array = d2Matrix.flat() as number[];
    d2Desc =
      "Expansive 6×6 coordinate matrix (36 cells) providing a comprehensive multi-row traversal and search animation.";
  } else if (primaryType === "linkedlist") {
    d2Array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    d2Desc =
      "Extended 12-node linked list sequence demonstrating full pointer manipulation and traversal depth.";
  } else if (isParentheses) {
    d2Array = ["(", "(", "[", "{", "}", "]", ")", ")", "[", "]", "{", "}"];
    d2Desc = "Deeply nested multi-type bracket string testing extended LIFO stack accumulation.";
  } else if (primaryType === "stack") {
    d2Array = [73, 74, 75, 71, 69, 72, 76, 73, 70, 68, 77, 80, 75, 78, 82, 85];
    d2Desc =
      "Extended 16-element sequence with multiple peaks and valleys for extensive monotonic push/pop evaluations.";
  } else if (isString) {
    d2Array = ["a", "b", "c", "a", "b", "c", "b", "b", "d", "e", "f", "g", "a", "b", "c"];
    d2Desc =
      "Extended 15-character string sequence demonstrating continuous multi-step scanning and boundary conditions.";
  } else {
    d2Array = [2, 4, 7, 9, 12, 15, 18, 21, 25, 28, 32, 36, 41, 47, 54, 62];
    d2Target = 36;
    d2Desc =
      "Extended 16-element sequence demonstrating multi-step pointer convergence, window scaling, and partition dynamics.";
  }

  // Ensure Dataset 2 is strictly longer and larger than Dataset 1
  if (d2Array && baseArray && d2Array.length <= baseArray.length) {
    if (typeof baseArray[0] === "number") {
      const step = 2;
      const start = Number(baseArray[baseArray.length - 1] ?? 0) + 1;
      const extra = Array.from({ length: baseArray.length + 8 }, (_, i) => start + i * step);
      d2Array = [...baseArray, ...extra];
    } else {
      d2Array = [...baseArray, ...baseArray];
    }
  }
  if (d2Matrix && baseMatrix && (d2Matrix.length * (d2Matrix[0]?.length ?? 0)) <= (baseMatrix.length * (baseMatrix[0]?.length ?? 0))) {
    const r = Math.max(6, baseMatrix.length + 2);
    const c = Math.max(6, (baseMatrix[0]?.length ?? 0) + 2);
    d2Matrix = Array.from({ length: r }, (_, rowIdx) =>
      Array.from({ length: c }, (_, colIdx) => (rowIdx * c + colIdx + 1))
    );
    d2Array = d2Matrix.flat() as number[];
  }

  const d2: TestDataset = {
    id: "dataset_2",
    label: "Dataset 2: Longer & Complex Trace ⚡",
    description: d2Desc,
    array: d2Array,
    matrix: d2Matrix,
    tree: d2Tree,
    target: d2Target,
    category: "longer",
  };

  // 3. Dataset 3 (Edge / Boundary Case)
  let d3Array: (number | string)[];
  let d3Matrix: (number | string)[][] | undefined;
  let d3Tree: (number | string | null)[] | undefined;
  let d3Target: number | string | undefined;
  let d3SecondaryArray: (number | string)[] | undefined;
  let d3Desc =
    "Boundary conditions testing edge cases, duplicates, negative numbers, or tight constraints.";

  if (isGraph) {
    d3Matrix = [
      [0, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 1, 0],
    ];
    d3Array = [0, 1, 2, 3];
    d3Desc = "Boundary graph containing isolated components and cyclic dependencies.";
  } else if (isIsland) {
    d3Matrix = [
      [1, 0, 0, 0, 0, 1],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 1],
    ];
    d3Array = d3Matrix.flat().filter((x): x is number => typeof x === "number");
    d3Desc = "Boundary 6×6 grid with isolated corner singletons and a central 2×2 square island.";
  } else if (isMatrixTransform) {
    if (slug === "set-matrix-zeroes") {
      d3Matrix = [
        [0, 1, 2, 0],
        [3, 4, 5, 2],
        [1, 3, 1, 5],
      ];
      d3Desc = "Boundary 3×4 matrix with multiple corner and edge zeroes (LeetCode Example 2).";
    } else {
      d3Matrix = [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
      ];
      d3Desc = "Boundary 3×4 rectangular matrix testing edge dimension and boundary conditions.";
    }
    d3Array = d3Matrix.flat().filter((x): x is number => typeof x === "number");
  } else if (isDynamicWindow) {
    if (slug === "longest-substring-without-repeating-characters") {
      d3Array = ["b", "b", "b", "b", "b"];
      d3Desc = "Edge case with all identical characters where window size never exceeds 1.";
    } else if (slug === "minimum-window-substring") {
      d3Array = ["a"];
      d3SecondaryArray = ["a"];
      d3Desc = "Edge case with single-character exact match.";
    } else if (slug === "max-consecutive-ones-iii") {
      d3Array = [0, 0, 0, 0, 0];
      d3Target = 0;
      d3Desc = "Edge case with all zeroes and k=0 flips.";
    } else {
      d3Array = ["z", "z", "z"];
      d3Desc = "Boundary edge case for sliding window.";
    }
  } else if (isInPlacePointers) {
    if (slug === "move-zeroes") {
      d3Array = [0, 0, 0, 0, 1];
      d3Desc = "Edge case with leading zeroes and single non-zero value.";
    } else if (slug === "remove-duplicates-from-sorted-array") {
      d3Array = [1, 1, 1, 1, 1];
      d3Desc = "Edge case where all elements are identical, reducing to length 1.";
    } else if (slug === "sort-colors") {
      d3Array = [2, 2, 1, 1, 0, 0];
      d3Desc = "Reverse-sorted edge case testing maximum displacement.";
    } else {
      d3Array = [0, 0, 0];
      d3Desc = "Homogeneous boundary array.";
    }
  } else if (isPrefixSum) {
    if (slug === "subarray-sum-equals-k") {
      d3Array = [-1, -1, 1];
      d3Target = 0;
      d3Desc = "Edge case with negative values summing to target zero.";
    } else if (slug === "contiguous-array") {
      d3Array = [0, 0, 0, 0];
      d3Desc = "Edge case with only zeroes (no valid balance).";
    } else {
      d3Array = [-5, 5, -5, 5];
      d3Target = 0;
      d3Desc = "Oscillating prefix sums around zero.";
    }
  } else if (primaryType === "tree" || primaryType === "bst" || primaryType === "heap" || primaryType === "trie") {
    d3Tree = [1, null, 2, null, null, null, 3, null, null, null, null, null, null, null, 4];
    d3Array = [1, 2, 3, 4];
    d3Desc =
      "Skewed right-heavy degenerate tree testing depth recursion without balanced branches.";
  } else if (primaryType === "linkedlist") {
    d3Array = [1, 1, 2, 3, 3];
    d3Desc = "Linked list with adjacent duplicate nodes testing boundary edge-cases.";
  } else if (isParentheses) {
    d3Array = ["(", "[", ")", "]"];
    d3Desc = "Mismatched bracket pair edge-case testing validation termination.";
  } else if (isString) {
    d3Array = ["a", "a", "b", "b", "c", "c"];
    d3Desc =
      "Edge-case string containing adjacent duplicates, compact length, and boundary characters.";
  } else {
    d3Array = [-5, -2, 0, 0, 3, 3, 7, 12];
    d3Target = 0;
    d3Desc = "Edge-case input containing zero, duplicates, and negative numbers.";
  }

  const d3: TestDataset = {
    id: "dataset_3",
    label: "Dataset 3: Edge & Boundary Case",
    description: d3Desc,
    array: d3Array,
    matrix: d3Matrix,
    tree: d3Tree,
    target: d3Target,
    secondaryArray: d3SecondaryArray,
    category: "edge",
  };

  return [d1, d2, d3];
}

export function pickShape(slug: string, topics: string[] = []): VizType {
  return classifyProblem(slug, "", topics).primaryVizType;
}

/** Returns the exact primary and auxiliary dataset specifications for any problem. */
export function getProblemDatasets(slug: string, topics: string[] = []): ProblemDatasetSpec[] {
  const safeTopics = topics ?? [];
  const sig = classifyProblem(slug, "", safeTopics);
  const primaryType = sig.primaryVizType;
  const s = (slug ?? "").toLowerCase();

  // 1. LRU / LFU Cache -> Doubly Linked List + HashMap
  if (sig.pattern === "lru-cache") {
    return [
      {
        name: "list",
        label: "Doubly Linked List",
        type: "linkedlist",
        role: "primary",
        description: "Maintains temporal recency ordering for O(1) eviction.",
      },
      {
        name: "map",
        label: "Hash Table Lookup",
        type: "hashmap",
        role: "auxiliary",
        description: "Maps keys directly to Linked List nodes for O(1) random access.",
      },
    ];
  }

  // 2. Design HashMap (pure hash table storage)
  if (sig.pattern === "hashmap-design") {
    return [
      {
        name: "map",
        label: "Hash Table Storage (Key ➔ Value)",
        type: "hashmap",
        role: "primary",
        description: "Direct key-to-value mapped bucket entries.",
      },
    ];
  }

  // 3. Design HashSet (pure hash set registry)
  if (sig.pattern === "hashset-design" || primaryType === "set") {
    return [
      {
        name: "set",
        label: "Hash Set Registry",
        type: "set",
        role: "primary",
        description: "Unique keys stored in hash buckets.",
      },
    ];
  }

  // 4. Multi-Array Comparison & Merging
  if (/profitable-schemes/.test(s)) {
    return [
      {
        name: "array",
        label: "Crime Members (group)",
        type: "array",
        role: "primary",
        description: "Number of members required for each crime.",
      },
      {
        name: "secondaryArray",
        label: "Crime Profit (profit)",
        type: "array",
        role: "secondary",
        description: "Profit generated by each crime.",
      },
    ];
  }
  if (/merge-sorted-array|median-of-two-sorted-arrays|intersection-of-two-arrays/.test(s)) {
    return [
      {
        name: "array",
        label: "Input Array 1 (nums1)",
        type: "array",
        role: "primary",
        description: "First sorted sequence.",
      },
      {
        name: "secondaryArray",
        label: "Input Array 2 (nums2)",
        type: "array",
        role: "secondary",
        description: "Second sorted sequence to compare and merge.",
      },
    ];
  }

  // 5. State-Space BFS (Word Ladder, Mutations)
  if (sig.pattern === "word-ladder") {
    return [
      {
        name: "matrix",
        label: "Mutation Graph & BFS Frontier",
        type: "graph",
        role: "primary",
        description: "Word ladder graph network where edges represent 1-letter transformations.",
      },
      {
        name: "queue",
        label: "BFS Traversal Queue",
        type: "queue",
        role: "auxiliary",
        description: "Frontier of words being actively explored.",
      },
      {
        name: "set",
        label: "Visited Word Registry",
        type: "set",
        role: "auxiliary",
        description: "Set of explored words to prevent cycles and redundant transitions.",
      },
    ];
  }

  // 6. Array + Hash Table / Frequency Map (Two Sum, Frequency count)
  if (sig.pattern === "hashmap-pair" || (sig.category === "hashmap" && primaryType === "hashmap")) {
    return [
      {
        name: "array",
        label: "Input Array (nums)",
        type: "array",
        role: "primary",
        description: "Main sequence of values being iterated.",
      },
      {
        name: "map",
        label: "Hash Map (Complements & Counts)",
        type: "hashmap",
        role: "auxiliary",
        description: "Stores visited complements and frequencies for O(1) lookup.",
      },
    ];
  }

  // 7. String & Character Stack (Parentheses, Reverse Substrings, Decode String)
  if (sig.pattern === "parentheses") {
    return [
      {
        name: "stack",
        label: "Character & Scope Stack",
        type: "stack",
        role: "primary",
        description: "LIFO stack tracking characters, indices, and nested parenthetical scopes.",
      },
      {
        name: "queue",
        label: "Reversal Buffer / Stream Queue",
        type: "queue",
        role: "auxiliary",
        description:
          "Temporary FIFO buffer for reversing substrings enclosed within matching brackets.",
      },
    ];
  }

  // 8. Monotonic Stack
  if (sig.pattern === "monotonic-stack") {
    return [
      {
        name: "array",
        label: "Input Values (nums)",
        type: "array",
        role: "primary",
        description: "Element stream / bar heights.",
      },
      {
        name: "stack",
        label: "Monotonic Stack",
        type: "stack",
        role: "auxiliary",
        description: "Maintains indices in monotonic order to resolve next greater elements.",
      },
    ];
  }

  // 9. Top-K / Priority Queue with Stream
  if (sig.pattern === "heap-topk" || primaryType === "heap") {
    return [
      {
        name: "array",
        label: "Input Stream (nums)",
        type: "array",
        role: "primary",
        description: "Input elements processed sequentially.",
      },
      {
        name: "tree",
        label: "Min-Heap / Priority Queue",
        type: "heap",
        role: "auxiliary",
        description: "Bounded priority queue retaining the top K elements.",
      },
      {
        name: "map",
        label: "Frequency Counter",
        type: "hashmap",
        role: "auxiliary",
        description: "Tallies occurrences of each unique value.",
      },
    ];
  }

  // 10. 2D Island Area & Connected Components
  if (sig.category === "grid-matrix") {
    return [
      {
        name: "matrix",
        label: "2D Island Grid (m × n)",
        type: "matrix",
        role: "primary",
        description:
          "0 = Water, 1 = Land. Active island cluster is highlighted and shaded during 4-directional traversal.",
      },
      {
        name: "set",
        label: "Visited Land Registry",
        type: "set",
        role: "auxiliary",
        description: "Tracks visited (r, c) cell coordinates to avoid re-traversal.",
      },
      {
        name: "stack",
        label: "DFS Recursion Stack / Frontier",
        type: "stack",
        role: "auxiliary",
        description: "Coordinates of adjacent land cells scheduled for area exploration.",
      },
    ];
  }

  // 11. Graph & Topological Sort / Networks
  if (sig.category === "graph") {
    return [
      {
        name: "matrix",
        label: "Graph Adjacency Network",
        type: "graph",
        role: "primary",
        description: "Network of graph nodes, edges, or directed dependencies.",
      },
      {
        name: "queue",
        label: "BFS Traversal Queue / In-Degree 0",
        type: "queue",
        role: "auxiliary",
        description: "FIFO buffer storing nodes ready to be explored next.",
      },
      {
        name: "set",
        label: "Visited Registry",
        type: "set",
        role: "auxiliary",
        description: "Prevents cycles by tracking already processed states.",
      },
    ];
  }

  // 12. Sliding Window + Hash Set / Frequency Map
  if (sig.pattern === "sliding-window" || sig.pattern === "sliding-window-dynamic") {
    return [
      {
        name: "array",
        label: "Sliding Window Sequence",
        type: "array",
        role: "primary",
        description: "Sequential string or array elements within the active window boundaries.",
      },
      {
        name: "map",
        label: "Window Character Frequency Map",
        type: "hashmap",
        role: "auxiliary",
        description: "Tracks active character occurrences and indices within the window.",
      },
    ];
  }

  // 13. Tree Traversal + Visited Path
  if (primaryType === "tree" || primaryType === "bst" || sig.category === "tree") {
    return [
      {
        name: "tree",
        label: primaryType === "bst" ? "Binary Search Tree" : "Binary Tree Hierarchy",
        type: primaryType === "bst" ? "bst" : "tree",
        role: "primary",
        description: "Hierarchical parent-child node structure.",
      },
      {
        name: "queue",
        label: "Traversal Buffer / Level Queue",
        type: "queue",
        role: "auxiliary",
        description: "Tracks active traversal path and level nodes.",
      },
    ];
  }

  // 14. 2D DP
  if (sig.category === "dp-2d") {
    return [
      {
        name: "matrix",
        label: "2D DP Transition Table",
        type: "matrix",
        role: "primary",
        description: "Tabulation matrix storing optimal subproblem states.",
      },
    ];
  }

  // 15. Recursion & Decision Tree Backtracking / Memoization
  if (sig.category === "recursion-backtracking" || (sig.category as string) === "recursion-memoization" || primaryType === "recursion-tree") {
    return [
      {
        name: "tree",
        label: "Recursion & Decision Tree",
        type: "recursion-tree",
        role: "primary",
        description: "Visualizes the state-space decision tree and branch choices.",
      },
      {
        name: "stack",
        label: "Call Stack Frames",
        type: "stack",
        role: "auxiliary",
        description: "LIFO stack frames with arguments and return states.",
      },
    ];
  }

  // 16. 1D Intervals & Sweep-Line
  if (sig.category === "intervals" || primaryType === "intervals") {
    return [
      {
        name: "intervals",
        label: "1D Interval Timeline",
        type: "intervals",
        role: "primary",
        description: "1D continuous timeline with sweep-line laser and lane compaction.",
      },
    ];
  }

  // Default Single Structure with clean contextual labels
  let defaultLabel = "Input Array";
  let defaultName = "array";
  if (primaryType === "hashmap") {
    defaultLabel = "Hash Table Storage";
    defaultName = "map";
  } else if (primaryType === "linkedlist") {
    defaultLabel = "Linked List Sequence";
    defaultName = "list";
  } else if (primaryType === "stack") {
    defaultLabel = "Working Stack";
    defaultName = "stack";
  } else if (primaryType === "queue") {
    defaultLabel = "Working Queue";
    defaultName = "queue";
  } else if (primaryType === "graph") {
    defaultLabel = "Graph Adjacency";
    defaultName = "matrix";
  } else if (primaryType === "matrix") {
    defaultLabel = "Grid Matrix";
    defaultName = "matrix";
  } else if (primaryType === "intervals") {
    defaultLabel = "1D Interval Timeline";
    defaultName = "intervals";
  } else if (primaryType === "recursion-tree") {
    defaultLabel = "Recursion & Decision Tree";
    defaultName = "tree";
  }

  return [
    {
      name: defaultName,
      label: defaultLabel,
      type: primaryType,
      role: "primary",
      description: "Core algorithm working dataset.",
    },
  ];
}

export const VALID_VIZ_TYPES = [
  "array",
  "stack",
  "queue",
  "deque",
  "linkedlist",
  "graph",
  "tree",
  "bst",
  "heap",
  "hashmap",
  "set",
  "trie",
  "matrix",
  "dp",
  "bit",
  "math",
  "recursion-tree",
  "intervals",
] as const;

const VALID_VIZ_TYPE_SET = new Set<VizType>(VALID_VIZ_TYPES);

function toVizType(value: unknown, preferred: VizType): VizType {
  return typeof value === "string" && VALID_VIZ_TYPE_SET.has(value as VizType)
    ? (value as VizType)
    : preferred;
}

function sanitizeScalarArray(value: unknown): (number | string)[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "number" || typeof item === "string" ? item : String(item)))
    .filter((item) => item !== null && item !== undefined);
}

function sanitizeTreeArray(value: unknown): (number | string | null)[] {
  const arr = sanitizeScalarArray(value);
  return arr.length ? arr.map((item) => (item === "null" ? null : item)) : [];
}

function sanitizeMatrix(value: unknown): (number | string)[][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(Array.isArray)
    .map((row) => sanitizeScalarArray(row))
    .filter((row) => row.length > 0);
}

function extractScalarValue(item: unknown): number | string | null {
  if (item === null || item === undefined) return null;
  if (typeof item === "number" || typeof item === "boolean") return item as number;
  if (typeof item === "string") {
    if (item.trim() === "[object Object]") return null;
    return item;
  }
  if (Array.isArray(item)) {
    if (item.length === 0) return null;
    if (item.length === 2) {
      return extractScalarValue(item[1]);
    }
    return extractScalarValue(item[0]);
  }
  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if ("value" in obj && obj.value !== undefined && obj.value !== null) {
      return extractScalarValue(obj.value);
    }
    if ("val" in obj && obj.val !== undefined && obj.val !== null) {
      return extractScalarValue(obj.val);
    }
    if ("v" in obj && obj.v !== undefined && obj.v !== null) {
      return extractScalarValue(obj.v);
    }
    if ("count" in obj && obj.count !== undefined && obj.count !== null) {
      return extractScalarValue(obj.count);
    }
    if ("data" in obj && obj.data !== undefined && obj.data !== null) {
      return extractScalarValue(obj.data);
    }
    const values = Object.values(obj).filter(
      (v) => typeof v === "number" || typeof v === "string" || typeof v === "boolean",
    );
    if (values.length > 0) {
      return extractScalarValue(values[values.length - 1]);
    }
    return JSON.stringify(item);
  }
  return String(item);
}

function sanitizeMap(value: unknown): Record<string, number | string | null> {
  if (!value) return {};
  if (Array.isArray(value)) {
    const result: Record<string, number | string | null> = {};
    for (let i = 0; i < value.length; i++) {
      const entry = value[i];
      if (Array.isArray(entry) && entry.length >= 2) {
        result[String(entry[0])] = extractScalarValue(entry[1]);
      } else if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        const k = obj.key ?? obj.k ?? obj.name ?? String(i);
        const v = extractScalarValue(obj.value ?? obj.val ?? obj.v ?? entry);
        result[String(k)] = v;
      } else if (entry !== null && entry !== undefined) {
        result[String(i)] = extractScalarValue(entry);
      }
    }
    return result;
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        extractScalarValue(item),
      ]),
    );
  }
  return {};
}

interface RawVizStep {
  type?: unknown;
  line?: unknown;
  desc?: unknown;
  current?: unknown;
  predecessor?: unknown;
  visited?: unknown;
  stack?: unknown;
  queue?: unknown;
  deque?: unknown;
  list?: unknown;
  tree?: unknown;
  trie?: unknown;
  map?: unknown;
  set?: unknown;
  matrix?: unknown;
  cols?: unknown;
  array?: unknown;
  left?: unknown;
  right?: unknown;
  wSum?: unknown;
  mSum?: unknown;
}

interface RawVizPayload {
  code_lines?: unknown;
  viz_steps?: unknown;
  test_array?: unknown;
}

function normalizeVizStep(
  step: RawVizStep,
  fallback: { code: string[]; array: number[]; steps: VizStep[] },
  preferred: VizType,
  codeLineCount: number,
): VizStep | null {
  if (!step || typeof step !== "object") return null;
  const type = toVizType(step.type, preferred);

  let rawCurrent = step.current ?? (step as any).curr ?? (step as any).currentNode ?? (step as any).node ?? (step as any).pointer ?? (step as any).index ?? (step as any).idx ?? (step as any).i;
  if (rawCurrent && typeof rawCurrent === "object" && !Array.isArray(rawCurrent)) {
    rawCurrent = (rawCurrent as any).val ?? (rawCurrent as any).value ?? (rawCurrent as any).id ?? (rawCurrent as any).name ?? null;
  }
  const current = typeof rawCurrent === "string" || typeof rawCurrent === "number" ? rawCurrent : null;

  const base: VizStep = {
    type,
    line:
      typeof step.line === "number" && Number.isFinite(step.line) && step.line >= 0
        ? Math.min(step.line, Math.max(0, codeLineCount - 1))
        : 0,
    desc: typeof step.desc === "string" && step.desc.trim() ? step.desc.trim() : "Executing step.",
  };

  if (type === "stack" || type === "queue" || type === "deque") {
    return {
      ...base,
      ...(type === "stack" ? { stack: sanitizeScalarArray(step.stack ?? []) } : {}),
      ...(type === "queue" ? { queue: sanitizeScalarArray(step.queue ?? []) } : {}),
      ...(type === "deque" ? { deque: sanitizeScalarArray(step.deque ?? []) } : {}),
      current,
      visited: sanitizeScalarArray(step.visited ?? []),
    };
  }

  if (type === "linkedlist") {
    return {
      ...base,
      list: sanitizeScalarArray(step.list ?? []),
      current,
      predecessor:
        typeof step.predecessor === "string" || typeof step.predecessor === "number"
          ? step.predecessor
          : null,
      visited: sanitizeScalarArray(step.visited ?? []),
    };
  }

  if (type === "tree" || type === "bst" || type === "heap" || type === "trie") {
    return {
      ...base,
      tree: sanitizeTreeArray(step.tree ?? []),
      current,
      visited: sanitizeScalarArray(step.visited ?? []),
    };
  }

  if (type === "hashmap") {
    return {
      ...base,
      map: sanitizeMap(step.map ?? {}),
      array: sanitizeScalarArray(step.array ?? fallback.array),
      current,
      visited: sanitizeScalarArray(step.visited ?? []),
    };
  }

  if (type === "set") {
    return {
      ...base,
      set: sanitizeScalarArray(step.set ?? fallback.array),
      current,
      visited: sanitizeScalarArray(step.visited ?? []),
    };
  }

  if (type === "graph" || type === "matrix") {
    const fallbackMatrix =
      fallback.steps[0]?.matrix ??
      sampleMatrixFor(fallback.steps[0]?.type === "matrix" ? "matrix" : "");
    const matrix = sanitizeMatrix(step.matrix ?? fallbackMatrix);
    const rawObj = step as Record<string, unknown>;
    return {
      ...base,
      matrix,
      cols: typeof step.cols === "number" && step.cols > 0 ? step.cols : (matrix[0]?.length ?? 1),
      current,
      visited: sanitizeScalarArray(step.visited ?? []),
      direction: typeof rawObj.direction === "string" ? rawObj.direction : null,
      currentArea: typeof rawObj.currentArea === "number" ? rawObj.currentArea : null,
      maxArea: typeof rawObj.maxArea === "number" ? rawObj.maxArea : null,
      islandCells: Array.isArray(rawObj.islandCells) ? (rawObj.islandCells as string[]) : null,
      wSum: typeof step.wSum === "number" ? step.wSum : null,
      mSum: typeof step.mSum === "number" ? step.mSum : null,
    };
  }

  return {
    ...base,
    array: sanitizeScalarArray(step.array ?? fallback.array),
    left: typeof step.left === "number" ? step.left : null,
    right: typeof step.right === "number" ? step.right : null,
    wSum: typeof step.wSum === "number" ? step.wSum : null,
    mSum: typeof step.mSum === "number" ? step.mSum : null,
    current,
    visited: sanitizeScalarArray(step.visited ?? []),
  };
}

export function normalizeVizPayload(
  slug: string,
  topics: string[] = [],
  raw: unknown,
  fallback: { code: string[]; array: number[]; steps: VizStep[] },
): { code: string[]; array: number[]; steps: VizStep[] } {
  const preferred = pickShape(slug, topics);
  const rawObj = raw && typeof raw === "object" ? (raw as RawVizPayload) : null;
  const rawLines = Array.isArray(rawObj?.code_lines) ? rawObj.code_lines : null;
  const code =
    rawLines && rawLines.length
      ? rawLines.slice(0, 60).map((line: unknown) => String(line))
      : fallback.code;

  if (!rawObj || !Array.isArray(rawObj.viz_steps) || rawObj.viz_steps.length === 0) {
    return { code, array: fallback.array, steps: fallback.steps };
  }

  const normalized = rawObj.viz_steps
    .filter((step: unknown): step is RawVizStep => !!step && typeof step === "object")
    .map((step: RawVizStep) => normalizeVizStep(step, fallback, preferred, code.length))
    .filter((step: VizStep | null): step is VizStep => !!step)
    .slice(0, 100);

  if (normalized.length === 0) {
    return { code, array: fallback.array, steps: fallback.steps };
  }

  const firstType = normalized[0]?.type ?? preferred;
  const finalSteps = normalized.map((step: VizStep) => ({
    ...step,
    type: toVizType(step.type, firstType),
  }));

  const array = Array.isArray(rawObj?.test_array)
    ? rawObj.test_array.map((n: unknown) => Number(n)).filter((n: number) => Number.isFinite(n))
    : fallback.array;

  return {
    code,
    array: array.length ? array : fallback.array,
    steps: finalSteps.length ? finalSteps : fallback.steps,
  };
}

/**
 * Absolute fallback: always returns a coherent walkthrough, whatever the AI did.
 * Shape is chosen from the problem's topics so graphs/stacks/lists animate too.
 */
export function localFallbackViz(
  slug: string,
  topics: string[] = [],
): { code: string[]; array: (number | string)[]; steps: VizStep[] } {
  const shape = pickShape(slug, topics);
  const array = sampleInputFor(slug);
  const steps: VizStep[] = [];

  if (shape === "stack") {
    const code = [
      "// Reference walkthrough — stack scan",
      "const stack = [];",
      "for (const x of input) {",
      "  if (canPop(stack, x)) stack.pop();",
      "  else stack.push(x);",
      "}",
      "return stack;",
    ];
    const stack: (number | string)[] = [];
    array.forEach((v, i) => {
      const lineNum = 3 + (i % 2); // Alternate between line 3 and 4
      const top = stack[stack.length - 1];
      if (top !== undefined && Number(top) >= Number(v)) {
        stack.pop();
        steps.push({
          type: "stack",
          stack: [...stack],
          current: v,
          line: 3,
          desc: `Pop ${top}, dominated by ${v}.`,
        });
      }
      stack.push(v);
      steps.push({
        type: "stack",
        stack: [...stack],
        current: v,
        visited: array.slice(0, i + 1),
        line: lineNum,
        desc: `Push ${v} (iteration ${i + 1}).`,
      });
    });
    steps.push({
      type: "stack",
      stack: [...stack],
      current: null,
      line: 6,
      desc: "Scan complete.",
    });
    return { code, array, steps };
  }

  if (shape === "queue") {
    const code = [
      "// Reference walkthrough — BFS style queue",
      "const queue = [start];",
      "while (queue.length) {",
      "  const node = queue.shift();",
      "  visit(node);",
      "  queue.push(...neighbours(node));",
      "}",
    ];
    const queue = [...array];
    const visited: (number | string)[] = [];
    let stepCount = 0;
    while (queue.length) {
      const node = queue.shift()!;
      const lineNum = 3 + (stepCount % 2); // Alternate between line 3 and 4
      steps.push({
        type: "queue",
        queue: [...queue],
        current: node,
        visited: [...visited],
        line: lineNum,
        desc: `Dequeue ${node}.`,
      });
      visited.push(node);
      steps.push({
        type: "queue",
        queue: [...queue],
        current: node,
        visited: [...visited],
        line: 4,
        desc: `Visit ${node} (${visited.length}/${array.length}).`,
      });
      stepCount++;
    }
    steps.push({
      type: "queue",
      queue: [],
      current: null,
      visited,
      line: 5,
      desc: "Queue empty — complete.",
    });
    return { code, array, steps };
  }

  if (shape === "hashmap") {
    if (slug === "design-hashmap" || slug.includes("myhashmap")) {
      const code = [
        "// Reference walkthrough — HashMap put/get/remove",
        "class MyHashMap:",
        "    def __init__(self):",
        "        self.table = [[] for _ in range(1000)]",
        "    def _hash(self, key): return key % 1000",
        "    def put(self, key, value):",
        "        bucket = self.table[self._hash(key)]",
        "        # update if key exists else insert",
        "    def get(self, key):",
        "        bucket = self.table[self._hash(key)]",
        "        # return value or -1 if missing",
        "    def remove(self, key):",
        "        bucket = self.table[self._hash(key)]",
        "        # remove (key, value) from bucket",
      ];
      const steps: VizStep[] = [
        {
          type: "hashmap",
          map: {},
          current: null,
          line: 3,
          desc: "MyHashMap(): Initialize empty bucket array.",
        },
        {
          type: "hashmap",
          map: { "1": 1 },
          current: 1,
          line: 7,
          desc: "put(1, 1): hash(1)=1. Insert pair (1, 1) into bucket 1.",
        },
        {
          type: "hashmap",
          map: { "1": 1, "2": 2 },
          current: 2,
          line: 7,
          desc: "put(2, 2): hash(2)=2. Insert pair (2, 2) into bucket 2.",
        },
        {
          type: "hashmap",
          map: { "1": 1, "2": 2 },
          current: 1,
          visited: [1],
          line: 10,
          desc: "get(1): hash(1)=1. Found key 1 in bucket 1 → return 1.",
        },
        {
          type: "hashmap",
          map: { "1": 1, "2": 2 },
          current: 3,
          line: 11,
          desc: "get(3): hash(3)=3. Bucket 3 is empty → return -1.",
        },
        {
          type: "hashmap",
          map: { "1": 1, "2": 1 },
          current: 2,
          line: 7,
          desc: "put(2, 1): Key 2 found in bucket 2 → update value to 1.",
        },
        {
          type: "hashmap",
          map: { "1": 1, "2": 1 },
          current: 2,
          visited: [2],
          line: 10,
          desc: "get(2): hash(2)=2. Found key 2 in bucket 2 → return 1.",
        },
        {
          type: "hashmap",
          map: { "1": 1 },
          current: 2,
          line: 14,
          desc: "remove(2): hash(2)=2. Removed key 2 from bucket 2.",
        },
        {
          type: "hashmap",
          map: { "1": 1 },
          current: 2,
          line: 11,
          desc: "get(2): hash(2)=2. Key 2 not in map → return -1.",
        },
      ];
      return { code, array: [1, 2, 3], steps };
    }

    const code = [
      "// Reference walkthrough — hashmap lookup",
      "const seen = new Map();",
      "for (let i = 0; i < nums.length; i++) {",
      "  const need = target - nums[i];",
      "  if (seen.has(need)) return [seen.get(need), i];",
      "  seen.set(nums[i], i);",
      "}",
      "return [];",
    ];
    const nums = slug === "two-sum" ? [2, 7, 11, 15] : sampleInputFor(slug, 4);
    const target = slug === "two-sum" ? 9 : (Number(nums[1]) || 0) + (Number(nums[3]) || 0);
    const seen: Record<string, number> = {};

    steps.push({
      type: "hashmap",
      map: {},
      current: nums[0] ?? 0,
      visited: [],
      line: 1,
      desc: "Start with an empty map.",
    });
    nums.forEach((value, i) => {
      const need = target - (Number(value) || 0);
      const key = String(need);
      // Calculate line based on loop iteration to show progress
      const iterLine = 3 + (i % 2) * 2; // Alternate between line 3 (calc) and line 5 (store)

      if (Object.prototype.hasOwnProperty.call(seen, key)) {
        steps.push({
          type: "hashmap",
          map: { ...seen },
          current: value,
          visited: [...Object.values(seen), value],
          line: 4,
          desc: `Need ${need} found at index ${seen[key]}, return pair [${seen[key]}, ${i}].`,
        });
        return;
      }
      seen[String(value)] = i;
      steps.push({
        type: "hashmap",
        map: { ...seen },
        current: value,
        visited: [...Object.values(seen)],
        line: iterLine,
        desc: `Iteration ${i + 1}: Store ${value} at index ${i}.`,
      });
    });

    steps.push({
      type: "hashmap",
      map: { ...seen },
      current: null,
      visited: [...Object.values(seen)],
      line: 7,
      desc: "Loop complete — no pair found.",
    });
    return { code, array: nums, steps };
  }

  if (shape === "linkedlist") {
    const code = [
      "// Reference walkthrough — pointer traversal",
      "let prev = null, curr = head;",
      "while (curr) {",
      "  const next = curr.next;",
      "  curr.next = prev;",
      "  prev = curr; curr = next;",
      "}",
      "return prev;",
    ];
    array.forEach((v, i) => {
      const lineNum = 3 + (i % 2); // Alternate between line 3 and 4
      steps.push({
        type: "linkedlist",
        list: array,
        current: i,
        visited: array.slice(0, i),
        line: lineNum,
        desc: `Move to node ${v} (index ${i}).`,
      });
      steps.push({
        type: "linkedlist",
        list: array,
        current: i,
        predecessor: i === 0 ? null : i - 1,
        visited: array.slice(0, i + 1),
        line: 4,
        desc: `Relink node ${v} to predecessor.`,
      });
    });
    steps.push({
      type: "linkedlist",
      list: array,
      current: null,
      visited: array,
      line: 6,
      desc: "All nodes processed.",
    });
    return { code, array, steps };
  }

  if (shape === "tree") {
    const code = [
      "// Reference walkthrough — DFS on the tree",
      "function dfs(node) {",
      "  if (!node) return;",
      "  dfs(node.left);",
      "  visit(node);",
      "  dfs(node.right);",
      "}",
    ];
    const tree = sampleTreeFor(slug);
    const visited: (number | string)[] = [];
    const order: (number | string)[] = [];
    const walk = (i: number) => {
      if (i >= tree.length || tree[i] === null || tree[i] === undefined) return;
      walk(2 * i + 1);
      order.push(tree[i]!);
      walk(2 * i + 2);
    };
    walk(0);
    order.forEach((v, idx) => {
      const lineNum = 3 + (idx % 2);
      visited.push(v);
      steps.push({
        type: "tree",
        tree,
        current: v,
        visited: [...visited],
        line: lineNum,
        desc: `Visit node ${v} (${idx + 1}/${order.length}).`,
      });
    });
    steps.push({
      type: "tree",
      tree,
      current: null,
      visited,
      line: 5,
      desc: "Traversal complete.",
    });
    return { code, array, steps };
  }

  if (shape === "bst") {
    const code = [
      "// Reference walkthrough — BST search",
      "function search(node, target) {",
      "  if (!node) return null;",
      "  if (node.val === target) return node;",
      "  if (target < node.val) return search(node.left, target);",
      "  return search(node.right, target);",
      "}",
    ];
    const tree = sampleTreeFor(slug);
    const nonNullNodes = tree.filter((x): x is number => x !== null && x !== undefined);
    const target = nonNullNodes[Math.floor(nonNullNodes.length / 2)] ?? tree[0] ?? 0;
    const visited: (number | string)[] = [];
    const order: (number | string)[] = [];
    const walk = (i: number) => {
      if (i >= tree.length || tree[i] === null || tree[i] === undefined) return;
      const val = tree[i]!;
      order.push(val);
      if (val === target) return;
      if (typeof val === "number" && typeof target === "number") {
        if (target < val) walk(2 * i + 1);
        else walk(2 * i + 2);
      }
    };
    walk(0);
    order.forEach((v, idx) => {
      const lineNum = 2 + ((idx + 1) % 3);
      visited.push(v);
      steps.push({
        type: "bst",
        tree,
        current: v,
        visited: [...visited],
        line: lineNum,
        desc: `Visit node ${v} (${idx + 1}/${order.length}).`,
      });
    });
    steps.push({ type: "bst", tree, current: null, visited, line: 5, desc: "Search complete." });
    return { code, array, steps };
  }

  if (shape === "matrix") {
    const isIsland = isIslandOrGridProblem(slug, topics);
    const matrix = sampleMatrixFor(slug);
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 4;
    const array = matrix.flat().filter((x): x is number => typeof x === "number");

    if (isIsland) {
      const code = [
        "// Reference walkthrough — 4-directional Island DFS",
        "def maxAreaOfIsland(grid):",
        "    rows, cols = len(grid), len(grid[0])",
        "    visited = set(); max_area = 0",
        "    def dfs(r, c):",
        "        if (r < 0 or r >= rows or c < 0 or c >= cols or",
        "            grid[r][c] == 0 or (r, c) in visited):",
        "            return 0",
        "        visited.add((r, c)); area = 1",
        "        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:",
        "            area += dfs(r + dr, c + dc)",
        "        return area",
        "    for r in range(rows):",
        "        for c in range(cols):",
        "            if grid[r][c] == 1 and (r, c) not in visited:",
        "                max_area = max(max_area, dfs(r, c))",
        "    return max_area",
      ];

      const visited: string[] = [];
      const islandCells: string[] = [];
      let maxArea = 0;
      let curArea = 0;

      steps.push({
        type: "matrix",
        matrix,
        cols,
        current: null,
        visited: [],
        wSum: 0,
        mSum: 0,
        line: 3,
        desc: `Initialize visited set and max_area = 0 on ${rows}×${cols} grid.`,
      });

      const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols;
      const DIRS: [number, number, string][] = [
        [-1, 0, "UP (-1, 0)"],
        [1, 0, "DOWN (+1, 0)"],
        [0, -1, "LEFT (0, -1)"],
        [0, 1, "RIGHT (0, +1)"],
      ];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (steps.length >= 22) break;
          const k = `${r},${c}`;
          if (Number(matrix[r]?.[c]) !== 1 || visited.includes(k)) continue;

          // Start of a new island
          islandCells.length = 0;
          curArea = 0;

          steps.push({
            type: "matrix",
            matrix,
            cols,
            current: k,
            visited: [...visited],
            islandCells: [...islandCells],
            wSum: curArea,
            mSum: maxArea,
            currentArea: curArea,
            maxArea,
            line: 14,
            desc: `Found new unvisited land at (${r}, ${c}). Start DFS exploration.`,
          });

          // Stack-based DFS simulating recursion
          const stack: [number, number][] = [[r, c]];
          while (stack.length && steps.length < 22) {
            const [cr, cc] = stack.pop()!;
            const ck = `${cr},${cc}`;
            if (!inBounds(cr, cc) || Number(matrix[cr]?.[cc]) !== 1 || visited.includes(ck)) {
              continue;
            }

            visited.push(ck);
            islandCells.push(ck);
            curArea++;

            steps.push({
              type: "matrix",
              matrix,
              cols,
              current: ck,
              visited: [...visited],
              islandCells: [...islandCells],
              wSum: curArea,
              mSum: maxArea,
              currentArea: curArea,
              maxArea,
              line: 8,
              desc: `Visited land at (${cr}, ${cc})! Current island area = ${curArea}.`,
            });

            // Explore 4 directions
            for (const [dr, dc, dname] of DIRS) {
              const nr = cr + dr;
              const nc = cc + dc;
              const nk = `${nr},${nc}`;
              if (inBounds(nr, nc) && Number(matrix[nr]?.[nc]) === 1 && !visited.includes(nk)) {
                stack.push([nr, nc]);
                if (steps.length < 20) {
                  steps.push({
                    type: "matrix",
                    matrix,
                    cols,
                    current: ck,
                    visited: [...visited],
                    islandCells: [...islandCells],
                    direction: dname,
                    wSum: curArea,
                    mSum: maxArea,
                    currentArea: curArea,
                    maxArea,
                    line: 10,
                    desc: `Traverse ${dname} from (${cr}, ${cc}) -> unvisited land at (${nr}, ${nc}).`,
                  });
                }
              }
            }
          }

          if (curArea > maxArea) {
            maxArea = curArea;
            steps.push({
              type: "matrix",
              matrix,
              cols,
              current: k,
              visited: [...visited],
              islandCells: [...islandCells],
              wSum: curArea,
              mSum: maxArea,
              currentArea: curArea,
              maxArea,
              line: 15,
              desc: `Island DFS complete! New max area recorded: ${maxArea}.`,
            });
          }
        }
      }

      steps.push({
        type: "matrix",
        matrix,
        cols,
        current: null,
        visited: [...visited],
        islandCells: [],
        wSum: maxArea,
        mSum: maxArea,
        currentArea: 0,
        maxArea,
        line: 16,
        desc: `Grid traversal complete. Max Area of Island = ${maxArea}.`,
      });

      return { code, array, steps };
    }

    const code = [
      "// Reference walkthrough — matrix scan",
      "for (let r = 0; r < rows; r++) {",
      "  for (let c = 0; c < cols; c++) {",
      "    process(matrix[r][c]);",
      "  }",
      "}",
    ];
    const visited: string[] = [];
    let stepCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lineNum = 2 + (stepCount % 2) + 1; // Alternate between lines 3 and 4
        visited.push(`${r},${c}`);
        steps.push({
          type: "matrix",
          matrix,
          cols,
          current: `${r},${c}`,
          visited: [...visited],
          line: lineNum,
          desc: `Process cell (${r}, ${c}) = ${matrix[r]![c]}.`,
        });
        stepCount++;
      }
    }
    steps.push({
      type: "matrix",
      matrix,
      cols,
      current: null,
      visited,
      line: 5,
      desc: "All cells processed.",
    });
    return { code, array, steps };
  }

  if (shape === "graph") {
    const code = [
      "// Reference walkthrough — graph traversal",
      "for (let node of graph) {",
      "  if (!visited[node]) explore(node);",
      "}",
      "function explore(node) {",
      "  visited[node] = true;",
      "  for (let neighbor of node.edges) {",
      "    if (!visited[neighbor]) explore(neighbor);",
      "  }",
      "}",
    ];
    const cols = 4;
    const rows = 3;
    const matrix = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => array[(r * cols + c) % array.length]!),
    );
    const visited: string[] = [];
    let stepCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lineNum = 4 + (stepCount % 3); // Cycle through lines 4, 5, 6
        visited.push(`${r},${c}`);
        steps.push({
          type: "graph",
          matrix,
          cols,
          current: `${r},${c}`,
          visited: [...visited],
          line: lineNum,
          desc: `Explore node (${r}, ${c}) = ${matrix[r]![c]}.`,
        });
        stepCount++;
      }
    }
    steps.push({
      type: "graph",
      matrix,
      cols,
      current: null,
      visited,
      line: 8,
      desc: "Traversal complete.",
    });
    return { code, array, steps };
  }

  const code = [
    "// Reference walkthrough — two pointer / window scan",
    "let best = 0, sum = 0, left = 0;",
    "for (let right = 0; right < arr.length; right++) {",
    "  sum += arr[right];",
    "  best = Math.max(best, sum);",
    "  if (right - left >= 2) { sum -= arr[left]; left++; }",
    "}",
    "return best;",
  ];
  let best = 0;
  let sum = 0;
  let l = 0;
  steps.push({
    type: "array",
    array,
    left: 0,
    right: -1,
    wSum: 0,
    mSum: 0,
    line: 1,
    desc: "Initialise pointers and sums.",
  });
  for (let r = 0; r < array.length; r++) {
    sum += Number(array[r]) || 0;
    best = Math.max(best, sum);
    steps.push({
      type: "array",
      array,
      left: l,
      right: r,
      wSum: sum,
      mSum: best,
      line: 3,
      desc: `Expand to index ${r}, add ${array[r]}.`,
    });
    if (r - l >= 2) {
      sum -= Number(array[l]) || 0;
      steps.push({
        type: "array",
        array,
        left: l,
        right: r,
        wSum: sum,
        mSum: best,
        line: 5,
        desc: `Shrink from the left, remove ${array[l]}.`,
      });
      l++;
    }
  }
  steps.push({
    type: "array",
    array,
    left: l,
    right: array.length - 1,
    wSum: sum,
    mSum: best,
    line: 7,
    desc: `Done. Best value = ${best}.`,
  });
  return { code, array, steps };
}

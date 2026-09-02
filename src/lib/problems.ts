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
  | "bit" | "math";

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
  queue?: (number | string)[] | null;
  deque?: (number | string)[] | null;
  /** graph / matrix */
  matrix?: (number | string)[][] | null;
  cols?: number | null;
  /** tree / bst / heap / trie as heap-indexed level-order arrays */
  tree?: (number | string | null)[] | null;
  /** hash map / set interfaces */
  map?: Record<string, number | string | null> | null;
  set?: (number | string)[] | null;
  trie?: (number | string | null)[] | null;
  /** shared markers */
  left?: number | null;
  right?: number | null;
  current?: number | string | null;
  predecessor?: number | string | null;
  visited?: (number | string)[] | null;
  wSum?: number | null;
  mSum?: number | null;
  pointer_labels?: Record<string, string> | null;
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
};

/** Structured test dataset specification for multi-dataset algorithmic walkthroughs */
export interface TestDataset {
  id: string;
  label: string;
  description?: string;
  array?: (number | string)[];
  secondaryArray?: (number | string)[];
  matrix?: (number | string)[][];
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

/** Helper to identify island and 2D grid problems */
export function isIslandOrGridProblem(slug: string, topics: string[] = []): boolean {
  const s = (slug ?? "").toLowerCase();
  const t = (topics ?? []).map((x) => String(x).toLowerCase()).join(" ");
  return (
    /island|area-of-island|max-area|flood-fill|rotting-oranges|surrounded-regions|walls-and-gates|pacific-atlantic|01-matrix|shortest-path-in-binary|making-a-large-island|count-sub-islands/.test(
      s,
    ) || /number of islands|max area|flood fill|matrix|grid/.test(t)
  );
}

/** Canonical matrix structure for 2D grid/island problems */
export function sampleMatrixFor(slug: string): (number | string)[][] {
  if (CANONICAL_MATRICES[slug]) {
    return CANONICAL_MATRICES[slug]!.map((r) => [...r]);
  }
  const isIsland = /island|area|flood|surround|rotting|grid|matrix/.test(slug);
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
  const rows = 6;
  const cols = 6;
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
    /redundant-connection|number-of-provinces|accounts-merge|satisfiability-of-equality|earliest-moment|graph-valid-tree|number-of-operations-to-make-network-connected|min-cost-to-connect/.test(
      s,
    ) || /union[- ]?find|disjoint[- ]?set|dsu/.test(t)
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
  const isIsland = isIslandOrGridProblem(slug, topics);
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

  let baseArray: (number | string)[];
  let baseMatrix: (number | string)[][] | undefined;
  let baseTree: (number | string | null)[] | undefined;
  let baseTarget: number | string | undefined;

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
  } else if (primaryType === "tree" || primaryType === "bst" || primaryType === "heap" || primaryType === "trie") {
    baseTree = sampleTreeFor(slug);
    baseArray = baseTree.filter((x): x is number | string => x !== null && x !== undefined && String(x) !== "null");
  } else if (isParentheses) {
    baseArray = ["(", "{", "[", "]", "}", ")"];
  } else {
    baseArray = sampleInputFor(slug, undefined, topics);
  }

  if (slug === "two-sum") baseTarget = 9;
  else if (slug === "3sum") baseTarget = 0;
  else if (!isGraph && !isIsland && !isParentheses && !isString && typeof baseArray[Math.floor(baseArray.length / 2)] === "number") {
    baseTarget = baseArray[Math.floor(baseArray.length / 2)];
  }

  // 1. Dataset 1 (Standard / Canonical)
  const d1: TestDataset = {
    id: "dataset_1",
    label: "Dataset 1: Standard Case",
    description: isGraph
      ? "Standard 4-node directed acyclic graph (DAG) verifying path traversal and topological ordering."
      : isParentheses
        ? "Balanced parentheses sequence with nested bracket pairs."
        : "Standard canonical problem example verifying baseline correctness.",
    array: baseArray,
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
  if (sig.pattern === "sliding-window") {
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

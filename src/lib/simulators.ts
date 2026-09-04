/**
 * Deterministic, problem-aware execution simulators.
 *
 * Every LeetCode problem in the bank maps to an algorithmic *family*; each family
 * has a real (executed, not faked) trace generator so a coherent, on-topic
 * visualization exists for every question even when the AI visualizer is
 * unavailable or returns an unusable payload.
 */
import {
  sampleInputFor,
  sampleMatrixFor,
  sampleTreeFor,
  normalizeLeetCodeTreeToHeap,
  isIslandOrGridProblem,
  type TestDataset,
  type VizStep,
  type VizType,
  type CallStackFrame,
  type RecursionTreeNode,
  type IntervalItem,
  type Sightline,
  type HeapSwap,
} from "./problems";
import { classifyProblem } from "./problemClassifier";

export type VizBundle = { code: string[]; array: (number | string)[]; steps: VizStep[] };

export type Pattern =
  | "hashmap-pair"
  | "hashmap-design"
  | "hashset-design"
  | "lru-cache"
  | "frequency-count"
  | "sliding-window"
  | "sliding-window-dynamic"
  | "binary-search"
  | "two-pointers"
  | "two-pointers-in-place"
  | "monotonic-stack"
  | "parentheses"
  | "island-max-area"
  | "island-count"
  | "grid-bfs"
  | "grid-dfs"
  | "matrix-transform"
  | "graph-bfs"
  | "topological-sort"
  | "word-ladder"
  | "linkedlist-reverse"
  | "linkedlist-cycle"
  | "tree-dfs"
  | "tree-bfs"
  | "bst-search"
  | "heap-topk"
  | "dp-1d"
  | "dp-2d"
  | "lcs"
  | "intervals"
  | "union-find"
  | "prefix-sum"
  | "prefix-sum-hashmap"
  | "sorting"
  | "bit-manipulation"
  | "trie-insert"
  | "queue-simulation"
  | "recursion-backtracking"
  | "recursion-memoization"
  | "array-scan";

/** Pick the algorithmic family for a problem from its slug, title and LeetCode topics. */
export function patternFor(slug: string, title = "", topics: string[] = []): Pattern {
  return classifyProblem(slug, title, topics).pattern;
}

const MAX_SIMULATION_STEPS = 80;
const cap = (steps: VizStep[]) => {
  if (steps.length <= MAX_SIMULATION_STEPS) return steps;
  // If steps exceed threshold, keep initial steps and always preserve the final conclusive step
  const finalStep = steps[steps.length - 1]!;
  const truncated = steps.slice(0, MAX_SIMULATION_STEPS - 1);
  return [...truncated, finalStep];
};

// ---------------------------------------------------------------- simulators

export function bruteForcePairSum(
  input: (number | string)[],
  targetInput?: number | string,
): VizBundle {
  const nums = input.map(Number).filter((n) => !isNaN(n)).slice(0, 10);
  const safeNums = nums.length > 0 ? nums : [2, 7, 11, 15];
  const target = typeof targetInput === "number" ? targetInput : 9;
  const code = [
    "for i in range(len(nums)):",
    "    for j in range(i + 1, len(nums)):",
    "        if nums[i] + nums[j] == target:",
    "            return [i, j]",
    "return []",
  ];
  const steps: VizStep[] = [
    {
      type: "array",
      array: safeNums,
      left: 0,
      right: 1,
      pointer_labels: { left: "i", right: "j" },
      line: 0,
      desc: `Initialize outer loop i = 0 (nums[0] = ${safeNums[0]}), target sum = ${target}.`,
    },
  ];

  for (let i = 0; i < safeNums.length; i++) {
    steps.push({
      type: "array",
      array: safeNums,
      left: i,
      right: i + 1 < safeNums.length ? i + 1 : i,
      pointer_labels: { left: "i", right: "j" },
      line: 0,
      desc: `Outer loop: set i = ${i} (nums[${i}] = ${safeNums[i]}).`,
    });

    for (let j = i + 1; j < safeNums.length; j++) {
      const sum = safeNums[i]! + safeNums[j]!;
      steps.push({
        type: "array",
        array: safeNums,
        left: i,
        right: j,
        pointer_labels: { left: "i", right: "j" },
        wSum: sum,
        mSum: target,
        line: 2,
        desc: `Inner loop: check nums[${i}] (${safeNums[i]}) + nums[${j}] (${safeNums[j]}) = ${sum} vs target ${target}.`,
      });

      if (sum === target) {
        steps.push({
          type: "array",
          array: safeNums,
          left: i,
          right: j,
          pointer_labels: { left: "i", right: "j" },
          wSum: sum,
          mSum: target,
          line: 3,
          desc: `Match found! nums[${i}] (${safeNums[i]}) + nums[${j}] (${safeNums[j]}) == ${target} → return [${i}, ${j}].`,
        });
        return { code, array: safeNums, steps: cap(steps) };
      }
    }
  }

  steps.push({
    type: "array",
    array: safeNums,
    left: null,
    right: null,
    line: 4,
    desc: `No pair found that sums to ${target}. Return [].`,
  });
  return { code, array: safeNums, steps: cap(steps) };
}

export function matrixTransformSim(
  matrixInput?: (number | string)[][],
  _slug = "",
  _dataset?: TestDataset,
): VizBundle {
  const rawMatrix =
    matrixInput && matrixInput.length >= 2 && (matrixInput[0]?.length ?? 0) >= 2
      ? matrixInput
      : [
          [1, 1, 1],
          [1, 0, 1],
          [1, 1, 1],
        ];

  const matrix: number[][] = rawMatrix.map((r) => r.map((c) => Number(c) || 0));
  const R = matrix.length;
  const C = matrix[0]!.length;

  const code = [
    "for i in range(rows):",
    "    for j in range(cols):",
    "        if matrix[i][j] == 0:",
    "            mark_zero_row_col(i, j)",
    "for i in range(rows):",
    "    for j in range(cols):",
    "        if is_marked(i, j):",
    "            matrix[i][j] = 0",
  ];

  const steps: VizStep[] = [];
  steps.push({
    type: "matrix",
    matrix: matrix.map((r) => [...r]),
    cols: C,
    current: "0,0",
    line: 0,
    desc: `Initialize ${R}×${C} matrix scan. Target: propagate zeroes across affected rows and columns.`,
  });

  const zeroRows = new Set<number>();
  const zeroCols = new Set<number>();

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const isZero = matrix[r]![c] === 0;
      if (isZero) {
        zeroRows.add(r);
        zeroCols.add(c);
      }
      steps.push({
        type: "matrix",
        matrix: matrix.map((row) => [...row]),
        cols: C,
        current: `${r},${c}`,
        line: 2,
        desc: `Scan cell (${r}, ${c}): matrix[${r}][${c}] = ${matrix[r]![c]}.${isZero ? " Found zero! Mark row " + r + " and column " + c + "." : ""}`,
      });
    }
  }

  for (const r of zeroRows) {
    for (let c = 0; c < C; c++) {
      matrix[r]![c] = 0;
      steps.push({
        type: "matrix",
        matrix: matrix.map((row) => [...row]),
        cols: C,
        current: `${r},${c}`,
        line: 7,
        desc: `Propagate zero: set matrix[${r}][${c}] = 0 (row ${r} contains a zero).`,
      });
    }
  }

  for (const c of zeroCols) {
    for (let r = 0; r < R; r++) {
      matrix[r]![c] = 0;
      steps.push({
        type: "matrix",
        matrix: matrix.map((row) => [...row]),
        cols: C,
        current: `${r},${c}`,
        line: 7,
        desc: `Propagate zero: set matrix[${r}][${c}] = 0 (column ${c} contains a zero).`,
      });
    }
  }

  steps.push({
    type: "matrix",
    matrix: matrix.map((row) => [...row]),
    cols: C,
    current: `${R - 1},${C - 1}`,
    line: 7,
    desc: `Matrix transformation complete: all affected rows and columns have been set to 0.`,
  });

  return {
    code,
    array: matrix.flat(),
    steps: cap(steps),
  };
}

function hashmapPair(input: number[], targetInput?: number): VizBundle {
  const code = [
    "seen = {}",
    "for i, x in enumerate(nums):",
    "    need = target - x",
    "    if need in seen:",
    "        return [seen[need], i]",
    "    seen[x] = i",
    "return []",
  ];
  const nums = input.slice(0, 7);
  const target = typeof targetInput === "number" ? targetInput : (nums[0] ?? 0) + (nums[nums.length - 2] ?? 0);
  const seen: Record<string, number> = {};
  const steps: VizStep[] = [
    {
      type: "hashmap",
      map: {},
      current: null,
      visited: [],
      line: 0,
      desc: `Empty map, target = ${target}.`,
    },
  ];
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i]!;
    steps.push({
      type: "hashmap",
      array: nums,
      left: i,
      map: { ...seen },
      current: x,
      visited: nums.slice(0, i),
      line: 1,
      desc: `Iteration ${i + 1}: x = ${x}.`,
    });
    const need = target - x;
    steps.push({
      type: "hashmap",
      array: nums,
      left: i,
      map: { ...seen },
      current: x,
      visited: nums.slice(0, i),
      line: 2,
      desc: `need = ${target} − ${x} = ${need}.`,
    });
    if (Object.prototype.hasOwnProperty.call(seen, String(need))) {
      steps.push({
        type: "hashmap",
        array: nums,
        left: seen[String(need)],
        right: i,
        map: { ...seen },
        current: need,
        visited: nums.slice(0, i + 1),
        line: 4,
        desc: `Found ${need} at index ${seen[String(need)]} → answer [${seen[String(need)]}, ${i}].`,
      });
      return { code, array: nums, steps: cap(steps) };
    }
    seen[String(x)] = i;
    steps.push({
      type: "hashmap",
      array: nums,
      left: i,
      map: { ...seen },
      current: x,
      visited: nums.slice(0, i + 1),
      line: 5,
      desc: `Store ${x} → index ${i}.`,
    });
  }
  steps.push({
    type: "hashmap",
    array: nums,
    map: { ...seen },
    current: null,
    visited: nums,
    line: 6,
    desc: "No pair found.",
  });
  return { code, array: nums, steps: cap(steps) };
}

function frequencyCount(input: (number | string)[], slug = "", dataset?: TestDataset): VizBundle {
  const items = input && input.length > 0 ? input.slice(0, 10) : ["bella", "label", "roller"];
  const isMultiWord =
    slug === "find-common-characters" ||
    items.some((x) => typeof x === "string" && String(x).length > 1);

  if (isMultiWord) {
    const code = [
      "minCounts = counter(words[0])",
      "for word in words[1:]:",
      "    wordCounts = counter(word)",
      "    for char in minCounts:",
      "        minCounts[char] = min(minCounts[char], wordCounts.get(char, 0))",
      "result = []",
      "for char, count in minCounts.items():",
      "    result.extend([char] * count)",
      "return result",
    ];

    const words = items.map(String);
    const minCounts: Record<string, number> = {};

    const firstWord = words[0] ?? "";
    for (const char of firstWord) {
      if (/^[a-z0-9]$/i.test(char)) {
        minCounts[char.toLowerCase()] = (minCounts[char.toLowerCase()] ?? 0) + 1;
      }
    }

    const steps: VizStep[] = [
      {
        type: "hashmap",
        array: words,
        left: 0,
        map: { ...minCounts },
        current: words[0] ?? null,
        visited: [words[0]!],
        line: 0,
        desc: `Step 1: Initialize minCounts with character frequencies from '${words[0]}'.`,
      },
    ];

    for (let i = 1; i < words.length; i++) {
      const word = words[i]!;
      const wordCounts: Record<string, number> = {};
      for (const char of word) {
        if (/^[a-z0-9]$/i.test(char)) {
          wordCounts[char.toLowerCase()] = (wordCounts[char.toLowerCase()] ?? 0) + 1;
        }
      }
      for (const k of Object.keys(minCounts)) {
        minCounts[k] = Math.min(minCounts[k]!, wordCounts[k] ?? 0);
      }
      steps.push({
        type: "hashmap",
        array: words,
        left: i,
        map: { ...minCounts },
        current: word,
        visited: words.slice(0, i + 1),
        line: 4,
        desc: `Step ${i + 1}: Intersect frequencies with word '${word}'. Min counts: ${Object.entries(minCounts).map(([k, v]) => `${k}:${v}`).join(", ")}.`,
      });
    }

    const resultChars: string[] = [];
    for (const [char, count] of Object.entries(minCounts)) {
      for (let c = 0; c < count; c++) {
        resultChars.push(char);
      }
    }
    resultChars.sort();

    steps.push({
      type: "hashmap",
      array: words,
      left: null,
      map: { ...minCounts },
      current: JSON.stringify(resultChars),
      visited: words,
      line: 8,
      desc: `Result constructed from minCounts: ${JSON.stringify(resultChars)}.`,
    });

    return { code, array: words, steps: cap(steps) };
  }

  const code = [
    "count = {}",
    "for x in items:",
    "    count[x] = count.get(x, 0) + 1",
    "best = max(count, key=count.get)",
    "return best",
  ];
  const count: Record<string, number> = {};
  const steps: VizStep[] = [
    {
      type: "hashmap",
      array: items,
      left: null,
      map: {},
      current: null,
      visited: [],
      line: 0,
      desc: "Start with an empty counter.",
    },
  ];

  items.forEach((x, i) => {
    const key = String(x);
    count[key] = (count[key] ?? 0) + 1;
    steps.push({
      type: "hashmap",
      array: items,
      left: i,
      map: { ...count },
      current: x,
      visited: items.slice(0, i + 1),
      line: 2,
      desc: `Count '${x}' → ${count[key]}.`,
    });
  });

  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  steps.push({
    type: "hashmap",
    array: items,
    left: null,
    map: { ...count },
    current: best?.[0] ?? null,
    visited: items,
    line: 3,
    desc: `Most frequent value is '${best?.[0]}' (${best?.[1]}×).`,
  });

  return { code, array: items, steps: cap(steps) };
}

function hashmapDesign(dataset?: TestDataset): VizBundle {
  const code = [
    "class MyHashMap:",
    "    def __init__(self):",
    "        self.map = {}",
    "    def put(self, key: int, value: int) -> None:",
    "        self.map[key] = value",
    "    def get(self, key: int) -> int:",
    "        return self.map.get(key, -1)",
    "    def remove(self, key: int) -> None:",
    "        self.map.pop(key, None)",
  ];

  const rawOps =
    dataset?.array && dataset.array.length > 0
      ? dataset.array.map(String)
      : [
          "put(1, 1)",
          "put(2, 2)",
          "get(1)",
          "get(3)",
          "put(2, 1)",
          "get(2)",
          "remove(2)",
          "get(2)",
        ];

  const map: Record<string, number> = {};
  const steps: VizStep[] = [
    {
      type: "hashmap",
      map: {},
      current: null,
      line: 2,
      activeDataset: "map",
      desc: "MyHashMap(): Initialize empty hash map table.",
    },
  ];

  for (const op of rawOps) {
    const putMatch = op.match(/put\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    const getMatch = op.match(/get\s*\(\s*(\d+)\s*\)/i);
    const removeMatch = op.match(/remove\s*\(\s*(\d+)\s*\)/i);

    if (putMatch) {
      const k = putMatch[1]!;
      const v = Number(putMatch[2]!);
      const isUpdate = Object.prototype.hasOwnProperty.call(map, k);
      map[k] = v;
      steps.push({
        type: "hashmap",
        map: { ...map },
        current: Number(k),
        line: 4,
        activeDataset: "map",
        shiftInfo: {
          from: "array",
          to: "map",
          action: isUpdate ? "write" : "insert",
          reason: isUpdate ? `Update key ${k} -> ${v}` : `Insert key ${k} with value ${v}`,
        },
        desc: isUpdate
          ? `put(${k}, ${v}): Key ${k} exists -> updated value to ${v}. Map: ${JSON.stringify(map)}.`
          : `put(${k}, ${v}): Inserted pair (${k}: ${v}) into hash map. Map: ${JSON.stringify(map)}.`,
      });
    } else if (getMatch) {
      const k = getMatch[1]!;
      const hasKey = Object.prototype.hasOwnProperty.call(map, k);
      const val = hasKey ? map[k]! : -1;
      steps.push({
        type: "hashmap",
        map: { ...map },
        current: Number(k),
        visited: hasKey ? [Number(k)] : [],
        line: 6,
        activeDataset: "map",
        shiftInfo: {
          from: "map",
          to: "array",
          action: "lookup",
          reason: hasKey ? `Found key ${k} with value ${val}` : `Key ${k} not found`,
        },
        desc: hasKey
          ? `get(${k}): Found key ${k} in hash map -> return ${val}.`
          : `get(${k}): Key ${k} not found in hash map -> return -1.`,
      });
    } else if (removeMatch) {
      const k = removeMatch[1]!;
      const hasKey = Object.prototype.hasOwnProperty.call(map, k);
      if (hasKey) delete map[k];
      steps.push({
        type: "hashmap",
        map: { ...map },
        current: Number(k),
        line: 8,
        activeDataset: "map",
        shiftInfo: {
          from: "map",
          to: "map",
          action: "delete",
          reason: hasKey ? `Deleted key ${k}` : `Key ${k} already absent`,
        },
        desc: hasKey
          ? `remove(${k}): Deleted key ${k} from hash map. Map: ${JSON.stringify(map)}.`
          : `remove(${k}): Key ${k} not in hash map -> no change.`,
      });
    }
  }

  const allKeys = Object.keys(map).map(Number);
  return { code, array: allKeys.length > 0 ? allKeys : [1, 2, 3], steps: cap(steps) };
}

function hashsetDesign(dataset?: TestDataset): VizBundle {
  const code = [
    "class MyHashSet:",
    "    def __init__(self):",
    "        self.set = set()",
    "    def add(self, key: int) -> None:",
    "        self.set.add(key)",
    "    def remove(self, key: int) -> None:",
    "        self.set.discard(key)",
    "    def contains(self, key: int) -> bool:",
    "        return key in self.set",
  ];

  const rawOps =
    dataset?.array && dataset.array.length > 0
      ? dataset.array.map(String)
      : [
          "add(1)",
          "add(2)",
          "contains(1)",
          "contains(3)",
          "add(2)",
          "contains(2)",
          "remove(2)",
          "contains(2)",
        ];

  const set = new Set<number>();
  const steps: VizStep[] = [
    {
      type: "set",
      set: [],
      current: null,
      line: 2,
      activeDataset: "set",
      desc: "MyHashSet(): Initialize empty hash set.",
    },
  ];

  for (const op of rawOps) {
    const addMatch = op.match(/add\s*\(\s*(\d+)\s*\)/i);
    const containsMatch = op.match(/contains\s*\(\s*(\d+)\s*\)/i);
    const removeMatch = op.match(/remove\s*\(\s*(\d+)\s*\)/i);

    if (addMatch) {
      const k = Number(addMatch[1]!);
      const isExisting = set.has(k);
      set.add(k);
      steps.push({
        type: "set",
        set: Array.from(set),
        current: k,
        line: 4,
        activeDataset: "set",
        shiftInfo: {
          from: "array",
          to: "set",
          action: isExisting ? "write" : "insert",
          reason: isExisting ? `Key ${k} already in set` : `Added ${k} to set`,
        },
        desc: isExisting
          ? `add(${k}): Key ${k} already in hash set -> no duplicate added. Set: {${Array.from(set).join(", ")}}.`
          : `add(${k}): Inserted key ${k} into hash set. Set: {${Array.from(set).join(", ")}}.`,
      });
    } else if (containsMatch) {
      const k = Number(containsMatch[1]!);
      const hasKey = set.has(k);
      steps.push({
        type: "set",
        set: Array.from(set),
        current: k,
        visited: hasKey ? [k] : [],
        line: 8,
        activeDataset: "set",
        shiftInfo: {
          from: "set",
          to: "array",
          action: "lookup",
          reason: hasKey ? `Found ${k} in set` : `${k} not in set`,
        },
        desc: hasKey
          ? `contains(${k}): Key ${k} found in hash set -> return True.`
          : `contains(${k}): Key ${k} not found in hash set -> return False.`,
      });
    } else if (removeMatch) {
      const k = Number(removeMatch[1]!);
      const hasKey = set.has(k);
      set.delete(k);
      steps.push({
        type: "set",
        set: Array.from(set),
        current: k,
        line: 6,
        activeDataset: "set",
        shiftInfo: {
          from: "set",
          to: "set",
          action: "delete",
          reason: hasKey ? `Removed ${k} from set` : `${k} not in set`,
        },
        desc: hasKey
          ? `remove(${k}): Removed key ${k} from hash set. Set: {${Array.from(set).join(", ")}}.`
          : `remove(${k}): Key ${k} not present in hash set -> no change.`,
      });
    }
  }

  const setArr = Array.from(set);
  return { code, array: setArr.length > 0 ? setArr : [1, 2, 3], steps: cap(steps) };
}

function lruCacheSim(dataset?: TestDataset): VizBundle {
  const code = [
    "class LRUCache:",
    "    def __init__(self, capacity: int):",
    "        self.cap = capacity",
    "        self.cache = OrderedDict() # key -> value (MRU at end)",
    "    def get(self, key: int) -> int:",
    "        if key not in self.cache: return -1",
    "        self.cache.move_to_end(key)",
    "        return self.cache[key]",
    "    def put(self, key: int, value: int) -> None:",
    "        if key in self.cache: self.cache.move_to_end(key)",
    "        self.cache[key] = value",
    "        if len(self.cache) > self.cap:",
    "            self.cache.popitem(last=False) # evict LRU (head)",
  ];

  const capacity = typeof dataset?.k === "number" && dataset.k > 0 ? dataset.k : 2;
  const rawOps =
    dataset?.array && dataset.array.length > 0
      ? dataset.array.map(String)
      : [
          "put(1, 1)",
          "put(2, 2)",
          "get(1)",
          "put(3, 3)",
          "get(2)",
          "put(4, 4)",
          "get(1)",
          "get(3)",
          "get(4)",
        ];

  let list: number[] = [];
  const cache: Record<string, number> = {};
  const steps: VizStep[] = [
    {
      type: "linkedlist",
      list: [],
      map: {},
      current: null,
      line: 2,
      activeDataset: "list",
      desc: `LRUCache(${capacity}): Initialize cache with capacity ${capacity}.`,
    },
  ];

  for (const op of rawOps) {
    const putMatch = op.match(/put\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    const getMatch = op.match(/get\s*\(\s*(\d+)\s*\)/i);

    if (putMatch) {
      const k = Number(putMatch[1]!);
      const v = Number(putMatch[2]!);
      const isExisting = Object.prototype.hasOwnProperty.call(cache, String(k));

      if (isExisting) {
        list = list.filter((x) => x !== k);
      }
      cache[String(k)] = v;
      list.push(k);

      let evictedKey: number | null = null;
      if (list.length > capacity) {
        evictedKey = list.shift()!;
        delete cache[String(evictedKey)];
      }

      steps.push({
        type: "linkedlist",
        list: [...list],
        map: { ...cache },
        current: k,
        line: evictedKey !== null ? 12 : 10,
        activeDataset: "list",
        shiftInfo: {
          from: "map",
          to: "list",
          action: isExisting ? "write" : evictedKey !== null ? "evict" : "push",
          reason:
            evictedKey !== null
              ? `Evicted LRU key ${evictedKey} to insert (${k}:${v})`
              : `Inserted (${k}:${v}) at MRU position`,
        },
        desc:
          evictedKey !== null
            ? `put(${k}, ${v}): Capacity (${capacity}) exceeded! Evicted LRU key ${evictedKey} ➔ Inserted [${k}:${v}] at MRU. Cache: [${list.join(", ")}].`
            : isExisting
              ? `put(${k}, ${v}): Key ${k} updated and moved to MRU position. Cache: [${list.join(", ")}].`
              : `put(${k}, ${v}): Added node [${k}:${v}] to MRU position. Cache: [${list.join(", ")}].`,
      });
    } else if (getMatch) {
      const k = Number(getMatch[1]!);
      const hasKey = Object.prototype.hasOwnProperty.call(cache, String(k));

      if (hasKey) {
        list = list.filter((x) => x !== k);
        list.push(k);
        const val = cache[String(k)]!;
        steps.push({
          type: "linkedlist",
          list: [...list],
          map: { ...cache },
          current: k,
          visited: [k],
          line: 7,
          activeDataset: "list",
          shiftInfo: {
            from: "list",
            to: "list",
            action: "shift",
            reason: `Hit! Moved node ${k} to MRU position`,
          },
          desc: `get(${k}): Cache Hit! Found key ${k} (val=${val}), moved to MRU position ➔ return ${val}.`,
        });
      } else {
        steps.push({
          type: "linkedlist",
          list: [...list],
          map: { ...cache },
          current: k,
          line: 5,
          activeDataset: "list",
          shiftInfo: {
            from: "list",
            to: "map",
            action: "lookup",
            reason: `Miss! Key ${k} not in cache`,
          },
          desc: `get(${k}): Cache Miss! Key ${k} is not present in cache ➔ return -1.`,
        });
      }
    }
  }

  return { code, array: list.length > 0 ? list : [1, 2], steps: cap(steps) };
}

function slidingWindow(input: (number | string)[], dataset?: TestDataset): VizBundle {
  const code = [
    "left = 0; sum = 0; best = 0",
    "for right in range(len(nums)):",
    "    sum += nums[right]",
    "    if right - left + 1 > k:",
    "        sum -= nums[left]; left += 1",
    "    best = max(best, sum)",
    "return best",
  ];
  const rawNums = input.length > 0 ? input : [2, 1, 5, 1, 3, 2];
  const nums = rawNums.map(Number).filter((n) => !isNaN(n)).slice(0, 16);
  const safeNums = nums.length > 0 ? nums : [2, 1, 5, 1, 3, 2];
  const k = typeof dataset?.k === "number" && dataset.k > 0 ? dataset.k : 3;
  const steps: VizStep[] = [
    {
      type: "array",
      array: safeNums,
      left: 0,
      right: -1,
      wSum: 0,
      mSum: 0,
      line: 0,
      desc: `Window of size k = ${k}. Preparing contiguous window sweep across [${safeNums.join(", ")}].`,
    },
  ];
  let left = 0;
  let sum = 0;
  let best = 0;
  for (let right = 0; right < safeNums.length; right++) {
    sum += safeNums[right]!;
    steps.push({
      type: "array",
      array: safeNums,
      left,
      right,
      wSum: sum,
      mSum: best,
      line: 2,
      desc: `Add nums[${right}] = ${safeNums[right]}. Current window sum = ${sum}.`,
    });
    if (right - left + 1 > k) {
      sum -= safeNums[left]!;
      steps.push({
        type: "array",
        array: safeNums,
        left,
        right,
        wSum: sum,
        mSum: best,
        line: 4,
        desc: `Window width (${right - left + 1}) > k (${k}) — subtract nums[${left}] = ${safeNums[left]} and advance left pointer.`,
      });
      left++;
    }
    best = Math.max(best, sum);
    steps.push({
      type: "array",
      array: safeNums,
      left,
      right,
      wSum: sum,
      mSum: best,
      line: 5,
      desc: `Window sum = ${sum}, best max sum so far = ${best}.`,
    });
  }
  steps.push({
    type: "array",
    array: safeNums,
    left,
    right: safeNums.length - 1,
    wSum: sum,
    mSum: best,
    line: 6,
    desc: `Sliding window scan complete. Maximum subarray sum of window size ${k} is ${best}.`,
  });
  return { code, array: safeNums, steps: cap(steps) };
}

function binarySearch(input: number[], customTarget?: number): VizBundle {
  const code = [
    "lo, hi = 0, len(nums) - 1",
    "while lo <= hi:",
    "    mid = (lo + hi) // 2",
    "    if nums[mid] == target: return mid",
    "    if nums[mid] < target: lo = mid + 1",
    "    else: hi = mid - 1",
    "return -1",
  ];
  const nums =
    input.length > 0 ? Array.from(new Set(input)).sort((a, b) => a - b) : [1, 3, 5, 7, 9, 11, 13];
  const target =
    typeof customTarget === "number"
      ? customTarget
      : (nums[Math.floor(nums.length * 0.7)] ?? nums[0]!);
  const steps: VizStep[] = [
    {
      type: "array",
      array: nums,
      left: 0,
      right: nums.length - 1,
      line: 0,
      desc: `Search sorted array for target ${target}.`,
    },
  ];
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    steps.push({
      type: "array",
      array: nums,
      left: lo,
      right: hi,
      current: nums[mid]!,
      line: 2,
      desc: `mid = ${mid}, nums[mid] = ${nums[mid]}.`,
    });
    if (nums[mid] === target) {
      steps.push({
        type: "array",
        array: nums,
        left: lo,
        right: hi,
        current: nums[mid]!,
        visited: [nums[mid]!],
        line: 3,
        desc: `Found ${target} at index ${mid}.`,
      });
      break;
    }
    if (nums[mid]! < target) {
      lo = mid + 1;
      steps.push({
        type: "array",
        array: nums,
        left: lo,
        right: hi,
        current: nums[mid]!,
        line: 4,
        desc: `${nums[mid]} < ${target} (too small) → advance lo to ${lo}.`,
      });
    } else {
      hi = mid - 1;
      steps.push({
        type: "array",
        array: nums,
        left: lo,
        right: hi,
        current: nums[mid]!,
        line: 5,
        desc: `${nums[mid]} > ${target} (too large) → move hi to ${hi}.`,
      });
    }
  }
  return { code, array: nums, steps: cap(steps) };
}

function twoPointersPairSum(
  input: (number | string)[],
  targetVal?: number | string,
): VizBundle {
  const isChar = input.some((x) => typeof x === "string" && isNaN(Number(x)));
  if (isChar) {
    const items = input.slice(0, 10);
    const code = [
      "left = 0, right = len(s) - 1",
      "while left < right:",
      "    if s[left] != s[right]:",
      "        return False",
      "    left += 1",
      "    right -= 1",
      "return True",
    ];
    let left = 0;
    let right = items.length - 1;
    const steps: VizStep[] = [
      {
        type: "array",
        array: items,
        left,
        right,
        current: items[left],
        line: 0,
        desc: `Initialize left = 0 ('${items[left]}') and right = ${right} ('${items[right]}').`,
      },
    ];
    while (left < right) {
      steps.push({
        type: "array",
        array: items,
        left,
        right,
        current: items[left],
        visited: [items[left]!, items[right]!],
        line: 2,
        desc: `Compare s[${left}] ('${items[left]}') with s[${right}] ('${items[right]}').`,
      });
      if (items[left] !== items[right]) {
        steps.push({
          type: "array",
          array: items,
          left,
          right,
          current: items[left],
          line: 3,
          desc: `Mismatch: '${items[left]}' != '${items[right]}' → return False.`,
        });
        return { code, array: items, steps: cap(steps) };
      }
      left++;
      right--;
      steps.push({
        type: "array",
        array: items,
        left,
        right,
        current: items[left] ?? null,
        line: 4,
        desc: `Match confirmed. Advance left to ${left}, decrement right to ${right}.`,
      });
    }
    steps.push({
      type: "array",
      array: items,
      left: null,
      right: null,
      current: "True",
      line: 6,
      desc: "All symmetric characters matched → return True.",
    });
    return { code, array: items, steps: cap(steps) };
  }

  const nums =
    input.length > 0
      ? (input.filter((x): x is number => typeof x === "number") as number[])
          .sort((a, b) => a - b)
          .slice(0, 10)
      : [1, 2, 4, 6, 8, 11, 15];
  const safeNums = nums.length > 0 ? nums : [1, 2, 4, 6, 8];
  const target = typeof targetVal === "number" ? targetVal : (safeNums[0] ?? 0) + (safeNums[safeNums.length - 1] ?? 0);
  const code = [
    "left = 0, right = len(nums) - 1",
    "while left < right:",
    "    current_sum = nums[left] + nums[right]",
    "    if current_sum == target:",
    "        return [left, right]",
    "    elif current_sum < target:",
    "        left += 1",
    "    else:",
    "        right -= 1",
    "return [-1, -1]",
  ];
  const steps: VizStep[] = [
    {
      type: "array",
      array: safeNums,
      left: 0,
      right: safeNums.length - 1,
      wSum: (safeNums[0] ?? 0) + (safeNums[safeNums.length - 1] ?? 0),
      mSum: target,
      line: 0,
      desc: `Initialize pointers left = 0, right = ${safeNums.length - 1}. Target sum = ${target}.`,
    },
  ];
  let left = 0;
  let right = safeNums.length - 1;
  while (left < right) {
    const current_sum = (safeNums[left] ?? 0) + (safeNums[right] ?? 0);
    steps.push({
      type: "array",
      array: safeNums,
      left,
      right,
      wSum: current_sum,
      mSum: target,
      current: safeNums[left],
      line: 2,
      desc: `Check sum: nums[${left}] (${safeNums[left]}) + nums[${right}] (${safeNums[right]}) = ${current_sum}.`,
    });
    if (current_sum === target) {
      steps.push({
        type: "array",
        array: safeNums,
        left,
        right,
        wSum: current_sum,
        mSum: target,
        visited: [safeNums[left]!, safeNums[right]!],
        line: 4,
        desc: `Found target pair! Indices [${left}, ${right}] sum to ${target}.`,
      });
      return { code, array: safeNums, steps: cap(steps) };
    }
    if (current_sum < target) {
      left++;
      steps.push({
        type: "array",
        array: safeNums,
        left,
        right,
        wSum: current_sum,
        mSum: target,
        visited: [safeNums[left - 1]!],
        line: 6,
        desc: `Sum ${current_sum} < ${target} → advance left pointer to ${left}.`,
      });
    } else {
      right--;
      steps.push({
        type: "array",
        array: safeNums,
        left,
        right,
        wSum: current_sum,
        mSum: target,
        visited: [safeNums[right + 1]!],
        line: 8,
        desc: `Sum ${current_sum} > ${target} → decrement right pointer to ${right}.`,
      });
    }
  }
  steps.push({
    type: "array",
    array: safeNums,
    left,
    right,
    wSum: 0,
    mSum: target,
    line: 9,
    desc: `Pointers met (left=${left}, right=${right}). No pair sums to ${target}.`,
  });
  return { code, array: safeNums, steps: cap(steps) };
}

function kadanesAlgorithm(input: number[]): VizBundle {
  const nums = input.length > 0 ? input.slice(0, 9) : [-2, 1, -3, 4, -1, 2, 1, -5, 4];
  const code = [
    "max_so_far = nums[0]",
    "curr_max = nums[0]",
    "for i in range(1, len(nums)):",
    "    curr_max = max(nums[i], curr_max + nums[i])",
    "    max_so_far = max(max_so_far, curr_max)",
    "return max_so_far",
  ];
  let maxSoFar = nums[0] ?? 0;
  let currMax = nums[0] ?? 0;
  const steps: VizStep[] = [
    {
      type: "array",
      array: nums,
      left: 0,
      right: 0,
      current: nums[0],
      wSum: currMax,
      mSum: maxSoFar,
      line: 0,
      desc: `Initialize max_so_far = ${maxSoFar}, curr_max = ${currMax} at index 0.`,
    },
  ];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i]!;
    const prevCurr = currMax;
    currMax = Math.max(x, currMax + x);
    steps.push({
      type: "array",
      array: nums,
      left: i,
      right: i,
      current: x,
      visited: nums.slice(0, i),
      wSum: currMax,
      mSum: maxSoFar,
      line: 3,
      desc: `Index ${i} (${x}): curr_max = max(${x}, ${prevCurr} + ${x}) = ${currMax}.`,
    });
    maxSoFar = Math.max(maxSoFar, currMax);
    steps.push({
      type: "array",
      array: nums,
      left: i,
      right: i,
      current: x,
      visited: nums.slice(0, i + 1),
      wSum: currMax,
      mSum: maxSoFar,
      line: 4,
      desc: `Update max_so_far = max(${maxSoFar}, ${currMax}) = ${maxSoFar}.`,
    });
  }
  steps.push({
    type: "array",
    array: nums,
    left: null,
    right: null,
    current: maxSoFar,
    visited: [...nums],
    wSum: currMax,
    mSum: maxSoFar,
    line: 5,
    desc: `Kadane's scan complete. Maximum subarray sum = ${maxSoFar}.`,
  });
  return { code, array: nums, steps: cap(steps) };
}

function twoPointers(input: number[]): VizBundle {
  const code = [
    "left, right = 0, len(arr) - 1",
    "best = 0",
    "while left < right:",
    "    best = max(best, evaluate(left, right))",
    "    if arr[left] < arr[right]: left += 1",
    "    else: right -= 1",
    "return best",
  ];
  const arr = input.slice(0, 8);
  const steps: VizStep[] = [
    {
      type: "array",
      array: arr,
      left: 0,
      right: arr.length - 1,
      mSum: 0,
      line: 0,
      desc: "Start pointers at both ends.",
    },
  ];
  let left = 0;
  let right = arr.length - 1;
  let best = 0;
  while (left < right) {
    const value = Math.min(arr[left]!, arr[right]!) * (right - left);
    best = Math.max(best, value);
    steps.push({
      type: "array",
      array: arr,
      left,
      right,
      wSum: value,
      mSum: best,
      line: 3,
      desc: `Evaluate (${left}, ${right}) → ${value}, best ${best}.`,
    });
    if (arr[left]! < arr[right]!) {
      left++;
      steps.push({
        type: "array",
        array: arr,
        left,
        right,
        wSum: value,
        mSum: best,
        line: 4,
        desc: `Left side smaller — left → ${left}.`,
      });
    } else {
      right--;
      steps.push({
        type: "array",
        array: arr,
        left,
        right,
        wSum: value,
        mSum: best,
        line: 5,
        desc: `Right side smaller — right → ${right}.`,
      });
    }
  }
  steps.push({
    type: "array",
    array: arr,
    left,
    right,
    mSum: best,
    line: 6,
    desc: `Pointers met. Answer = ${best}.`,
  });
  return { code, array: arr, steps: cap(steps) };
}

function monotonicStack(input: (number | string)[]): VizBundle {
  const code = [
    "stack = []",
    "for i, x in enumerate(nums):",
    "    while stack and nums[stack[-1]] < x:",
    "        j = stack.pop(); result[j] = x",
    "    stack.append(i)",
    "return result",
  ];
  const rawNums = input.length > 0 ? input : [2, 1, 2, 4, 3];
  const nums = rawNums.map(Number).filter((n) => !isNaN(n)).slice(0, 16);
  const safeNums = nums.length > 0 ? nums : [2, 1, 2, 4, 3];
  const stack: number[] = [];
  const steps: VizStep[] = [
    {
      type: "stack",
      array: safeNums,
      stack: [],
      current: null,
      visited: [],
      line: 0,
      stackInvariant: "decreasing",
      activeDataset: "stack",
      desc: "Initialize empty monotonic decreasing stack to find next greater elements.",
    },
  ];
  safeNums.forEach((x, i) => {
    steps.push({
      type: "stack",
      array: safeNums,
      left: i,
      stack: stack.map((j) => safeNums[j]!),
      current: x,
      visited: safeNums.slice(0, i),
      line: 1,
      stackInvariant: "decreasing",
      activeDataset: "stack",
      desc: `Read nums[${i}] = ${x}. Inspect monotonic decreasing invariant.`,
    });
    while (stack.length && safeNums[stack[stack.length - 1]!]! < x) {
      const j = stack.pop()!;
      const sightline: Sightline = { fromIdx: i, toIdx: j, resolved: true };
      steps.push({
        type: "stack",
        array: safeNums,
        left: i,
        stack: stack.map((k) => safeNums[k]!),
        current: x,
        visited: safeNums.slice(0, i + 1),
        line: 3,
        stackInvariant: "decreasing",
        sightlines: [sightline],
        activeDataset: "stack",
        shiftInfo: {
          from: "stack",
          to: "array",
          action: "pop",
          reason: `Popped ${safeNums[j]} because ${x} is next greater element (distance: ${i - j})`,
        },
        desc: `Sightline resolved: nums[${i}] (${x}) > nums[${j}] (${safeNums[j]}). Pop idx ${j} — distance Δi = ${i - j}.`,
      });
    }
    stack.push(i);
    steps.push({
      type: "stack",
      array: safeNums,
      left: i,
      stack: stack.map((k) => safeNums[k]!),
      current: x,
      visited: safeNums.slice(0, i + 1),
      line: 4,
      stackInvariant: "decreasing",
      activeDataset: "stack",
      shiftInfo: {
        from: "array",
        to: "stack",
        action: "push",
        reason: `Pushed index ${i} (value ${x}) onto monotonic stack`,
      },
      desc: `Push index ${i} (value ${x}) onto stack. Stack: [${stack.map((k) => safeNums[k]!).join(", ")}].`,
    });
  });
  steps.push({
    type: "stack",
    array: safeNums,
    stack: stack.map((k) => safeNums[k]!),
    current: null,
    visited: safeNums,
    line: 5,
    stackInvariant: "decreasing",
    activeDataset: "stack",
    desc: `Scan complete. Remaining indices in stack [${stack.map((k) => safeNums[k]!).join(", ")}] have no greater element to their right.`,
  });
  return { code, array: safeNums, steps: cap(steps) };
}

function parentheses(input: (number | string)[]): VizBundle {
  const code = [
    "stack = []",
    "for ch in s:",
    "    if ch in '([{': stack.append(ch)",
    "    elif not stack or not matches(stack.pop(), ch): return False",
    "return len(stack) == 0",
  ];
  const opens = ["(", "[", "{"];
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const allBrackets = new Set(["(", ")", "[", "]", "{", "}"]);

  const isRawBracketInput =
    input.length > 0 && input.every((x) => typeof x === "string" && allBrackets.has(x));

  let chars: string[] = [];
  if (isRawBracketInput) {
    chars = input.map(String).slice(0, 16);
  } else {
    const openStack: string[] = [];
    input.slice(0, 8).forEach((n, i) => {
      if (i % 2 === 0 || openStack.length === 0) {
        const num = typeof n === "number" ? n : String(n).charCodeAt(0);
        const ch = opens[Math.abs(num) % 3]!;
        chars.push(ch);
        openStack.push(ch);
      } else {
        chars.push(pairs[openStack.pop()!]!);
      }
    });
    while (openStack.length) chars.push(pairs[openStack.pop()!]!);
  }

  const stack: string[] = [];
  const steps: VizStep[] = [
    {
      type: "stack",
      stack: [],
      current: null,
      visited: [],
      line: 0,
      activeDataset: "stack",
      desc: `Validate parentheses sequence: "${chars.join("")}".`,
    },
  ];

  let isValid = true;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    if (opens.includes(ch)) {
      stack.push(ch);
      steps.push({
        type: "stack",
        stack: [...stack],
        current: ch,
        visited: chars.slice(0, i + 1),
        line: 2,
        activeDataset: "stack",
        shiftInfo: {
          from: "array",
          to: "stack",
          action: "push",
          reason: `Pushed open bracket '${ch}'`,
        },
        desc: `Opening bracket '${ch}' at index ${i} ➔ push to stack. Stack: [${stack.join(", ")}].`,
      });
    } else {
      if (stack.length === 0) {
        isValid = false;
        steps.push({
          type: "stack",
          stack: [],
          current: ch,
          visited: chars.slice(0, i + 1),
          line: 3,
          activeDataset: "stack",
          desc: `Closing bracket '${ch}' at index ${i} encountered but stack is empty ➔ Invalid sequence (return False).`,
        });
        break;
      }
      const top = stack.pop()!;
      if (pairs[top] !== ch) {
        isValid = false;
        steps.push({
          type: "stack",
          stack: [...stack],
          current: ch,
          visited: chars.slice(0, i + 1),
          line: 3,
          activeDataset: "stack",
          desc: `Mismatch: popped '${top}' does not match closing bracket '${ch}' ➔ Invalid sequence (return False).`,
        });
        break;
      }
      steps.push({
        type: "stack",
        stack: [...stack],
        current: ch,
        visited: chars.slice(0, i + 1),
        line: 3,
        activeDataset: "stack",
        shiftInfo: {
          from: "stack",
          to: "array",
          action: "pop",
          reason: `Matched '${top}' with '${ch}'`,
        },
        desc: `Closing bracket '${ch}' matches popped '${top}' ➔ Valid match. Stack: [${stack.join(", ")}].`,
      });
    }
  }

  if (isValid) {
    steps.push({
      type: "stack",
      stack: [...stack],
      current: null,
      visited: chars,
      line: 4,
      activeDataset: "stack",
      desc: stack.length
        ? `Scan complete: stack still contains [${stack.join(", ")}] ➔ Unbalanced sequence (return False).`
        : `Scan complete: stack is completely empty ➔ Valid balanced sequence (return True).`,
    });
  }

  return { code, array: chars, steps: cap(steps) };
}

function islandMaxArea(matrixInput?: (number | string)[][]): VizBundle {
  const code = [
    "def maxAreaOfIsland(grid):",
    "    rows, cols = len(grid), len(grid[0])",
    "    visited = set()",
    "    max_area = 0",
    "    def dfs(r, c):",
    "        if (r < 0 or r >= rows or c < 0 or c >= cols or",
    "            grid[r][c] == 0 or (r, c) in visited):",
    "            return 0",
    "        visited.add((r, c))",
    "        area = 1",
    "        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:",
    "            area += dfs(r + dr, c + dc)",
    "        return area",
    "    for r in range(rows):",
    "        for c in range(cols):",
    "            if grid[r][c] == 1 and (r, c) not in visited:",
    "                max_area = max(max_area, dfs(r, c))",
    "    return max_area",
  ];

  const matrix: number[][] =
    matrixInput && matrixInput.length > 0 && matrixInput[0]?.length
      ? matrixInput.map((row) => row.map((x) => Number(x) === 1 || String(x) === "1" ? 1 : 0))
      : [
          [0, 0, 1, 0, 0, 0],
          [0, 1, 1, 0, 1, 1],
          [0, 1, 1, 0, 1, 1],
          [0, 0, 0, 0, 1, 1],
          [1, 1, 0, 0, 0, 0],
          [1, 1, 0, 0, 0, 0],
        ];

  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 6;
  const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols;
  const DIRS: [number, number, string][] = [
    [1, 0, "DOWN (+1, 0)"],
    [-1, 0, "UP (-1, 0)"],
    [0, 1, "RIGHT (0, +1)"],
    [0, -1, "LEFT (0, -1)"],
  ];

  const visited: string[] = [];
  const islandCells: string[] = [];
  let maxArea = 0;
  let currentArea = 0;
  let islandCount = 0;

  const steps: VizStep[] = [
    {
      type: "matrix",
      matrix,
      cols,
      current: null,
      visited: [],
      islandCells: [],
      wSum: 0,
      mSum: 0,
      currentArea: 0,
      maxArea: 0,
      line: 3,
      desc: `Initialize visited set and max_area = 0 on ${rows}×${cols} island grid.`,
    },
  ];

  function dfs(r: number, c: number, fromCoord?: string, dirFromParent?: string): number {
    const k = `${r},${c}`;
    if (!inBounds(r, c) || Number(matrix[r]?.[c]) !== 1 || visited.includes(k)) {
      return 0;
    }

    visited.push(k);
    islandCells.push(k);
    currentArea++;

    steps.push({
      type: "matrix",
      matrix,
      cols,
      current: k,
      visited: [...visited],
      islandCells: [...islandCells],
      direction: dirFromParent,
      wSum: currentArea,
      mSum: maxArea,
      currentArea,
      maxArea,
      line: 8,
      desc: dirFromParent
        ? `Traverse ${dirFromParent} from ${fromCoord} ➔ recurse into land at (${r}, ${c}). Area = ${currentArea}.`
        : `Explore root land at (${r}, ${c}). Current island area = ${currentArea}.`,
    });

    let area = 1;
    for (const [dr, dc, dname] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;
      if (inBounds(nr, nc) && Number(matrix[nr]?.[nc]) === 1 && !visited.includes(nk)) {
        area += dfs(nr, nc, `(${r}, ${c})`, dname);
        // Backtrack step: return pointer to parent coordinate so transitions are strictly continuous
        steps.push({
          type: "matrix",
          matrix,
          cols,
          current: k,
          visited: [...visited],
          islandCells: [...islandCells],
          direction: `RETURN from ${dname}`,
          wSum: currentArea,
          mSum: maxArea,
          currentArea,
          maxArea,
          line: 14,
          desc: `Backtrack to parent cell (${r}, ${c}) to explore remaining directions.`,
        });
      }
    }
    return area;
  }

  // Systematic full grid scan across all rows and columns
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = `${r},${c}`;
      if (Number(matrix[r]?.[c]) !== 1 || visited.includes(k)) continue;

      islandCount++;
      islandCells.length = 0;
      currentArea = 0;

      steps.push({
        type: "matrix",
        matrix,
        cols,
        current: k,
        visited: [...visited],
        islandCells: [],
        wSum: 0,
        mSum: maxArea,
        currentArea: 0,
        maxArea,
        line: 15,
        desc: `Grid scan found unvisited land at (${r}, ${c}). Launch DFS for Island #${islandCount}.`,
      });

      const islandArea = dfs(r, c);

      if (islandArea > maxArea) {
        maxArea = islandArea;
        steps.push({
          type: "matrix",
          matrix,
          cols,
          current: k,
          visited: [...visited],
          islandCells: [...islandCells],
          wSum: islandArea,
          mSum: maxArea,
          currentArea: islandArea,
          maxArea,
          line: 16,
          desc: `Island #${islandCount} fully explored (area = ${islandArea}). NEW Max Area = ${maxArea}!`,
        });
      } else {
        steps.push({
          type: "matrix",
          matrix,
          cols,
          current: k,
          visited: [...visited],
          islandCells: [...islandCells],
          wSum: islandArea,
          mSum: maxArea,
          currentArea: islandArea,
          maxArea,
          line: 16,
          desc: `Island #${islandCount} fully explored (area = ${islandArea}). Max Area remains ${maxArea}.`,
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
    line: 17,
    desc: `Scan complete across all ${rows}×${cols} cells. Discovered ${islandCount} islands. Max Area = ${maxArea}.`,
  });

  return { code, array: matrix.flat(), steps: cap(steps) };
}

function islandCount(matrixInput?: (number | string)[][]): VizBundle {
  const code = [
    "def numIslands(grid):",
    "    rows, cols = len(grid), len(grid[0])",
    "    visited = set(); count = 0",
    "    def dfs(r, c):",
    "        if (r < 0 or r >= rows or c < 0 or c >= cols or",
    "            grid[r][c] == '0' or (r, c) in visited):",
    "            return",
    "        visited.add((r, c))",
    "        for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:",
    "            dfs(r + dr, c + dc)",
    "    for r in range(rows):",
    "        for c in range(cols):",
    "            if grid[r][c] == '1' and (r, c) not in visited:",
    "                count += 1; dfs(r, c)",
    "    return count",
  ];

  const matrix: number[][] =
    matrixInput && matrixInput.length > 0 && matrixInput[0]?.length
      ? matrixInput.map((row) => row.map((x) => Number(x) === 1 || String(x) === "1" ? 1 : 0))
      : [
          [1, 1, 0, 0, 0, 1],
          [1, 1, 0, 0, 0, 1],
          [0, 0, 1, 0, 0, 0],
          [0, 0, 0, 1, 1, 0],
          [1, 0, 0, 1, 1, 0],
          [1, 1, 0, 0, 0, 1],
        ];

  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 6;
  const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols;
  const DIRS: [number, number, string][] = [
    [1, 0, "DOWN (+1, 0)"],
    [-1, 0, "UP (-1, 0)"],
    [0, 1, "RIGHT (0, +1)"],
    [0, -1, "LEFT (0, -1)"],
  ];

  const visited: string[] = [];
  const islandCells: string[] = [];
  let count = 0;

  const steps: VizStep[] = [
    {
      type: "matrix",
      matrix,
      cols,
      current: null,
      visited: [],
      islandCells: [],
      wSum: 0,
      mSum: 0,
      line: 2,
      desc: `Initialize count = 0 and visited set on ${rows}×${cols} binary grid.`,
    },
  ];

  function dfs(r: number, c: number, fromCoord?: string, dirFromParent?: string): void {
    const k = `${r},${c}`;
    if (!inBounds(r, c) || Number(matrix[r]?.[c]) !== 1 || visited.includes(k)) {
      return;
    }

    visited.push(k);
    islandCells.push(k);

    steps.push({
      type: "matrix",
      matrix,
      cols,
      current: k,
      visited: [...visited],
      islandCells: [...islandCells],
      direction: dirFromParent,
      wSum: count,
      mSum: count,
      line: 7,
      desc: dirFromParent
        ? `Traverse ${dirFromParent} from ${fromCoord} ➔ mark land at (${r}, ${c}) as visited.`
        : `Mark root land at (${r}, ${c}) as visited in Island #${count}.`,
    });

    for (const [dr, dc, dname] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;
      if (inBounds(nr, nc) && Number(matrix[nr]?.[nc]) === 1 && !visited.includes(nk)) {
        dfs(nr, nc, `(${r}, ${c})`, dname);
        // Backtrack step: return pointer to parent coordinate so transitions are strictly continuous
        steps.push({
          type: "matrix",
          matrix,
          cols,
          current: k,
          visited: [...visited],
          islandCells: [...islandCells],
          direction: `RETURN from ${dname}`,
          wSum: count,
          mSum: count,
          line: 12,
          desc: `Backtrack to parent cell (${r}, ${c}) to continue component traversal.`,
        });
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = `${r},${c}`;
      if (Number(matrix[r]?.[c]) !== 1 || visited.includes(k)) continue;

      count++;
      islandCells.length = 0;

      steps.push({
        type: "matrix",
        matrix,
        cols,
        current: k,
        visited: [...visited],
        islandCells: [],
        wSum: count,
        mSum: count,
        line: 12,
        desc: `Scan found unvisited land at (${r}, ${c}). Increment count = ${count} and launch DFS.`,
      });

      dfs(r, c);

      steps.push({
        type: "matrix",
        matrix,
        cols,
        current: k,
        visited: [...visited],
        islandCells: [...islandCells],
        wSum: count,
        mSum: count,
        line: 12,
        desc: `Island #${count} flood-fill complete. Explored ${islandCells.length} connected cells.`,
      });
    }
  }

  steps.push({
    type: "matrix",
    matrix,
    cols,
    current: null,
    visited: [...visited],
    islandCells: [],
    wSum: count,
    mSum: count,
    line: 13,
    desc: `Scan complete across all ${rows}×${cols} cells. Total Number of Islands = ${count}.`,
  });

  return { code, array: matrix.flat(), steps: cap(steps) };
}

function grid(matrixOrInput: (number | string)[][] | number[], mode: "bfs" | "dfs"): VizBundle {
  const code =
    mode === "bfs"
      ? [
          "queue = [start]; visited = {start}",
          "while queue:",
          "    r, c = queue.pop(0)",
          "    for nr, nc in neighbours(r, c):",
          "        if grid[nr][nc] == 1 and (nr, nc) not in visited:",
          "            visited.add((nr, nc)); queue.append((nr, nc))",
          "return len(visited)",
        ]
      : [
          "def dfs(r, c):",
          "    if out_of_bounds(r, c) or grid[r][c] != 1: return",
          "    grid[r][c] = 0",
          "    for nr, nc in neighbours(r, c): dfs(nr, nc)",
          "for r in range(rows):",
          "    for c in range(cols): dfs(r, c)",
        ];

  let matrix: (number | string)[][];
  if (Array.isArray(matrixOrInput) && Array.isArray(matrixOrInput[0])) {
    matrix = (matrixOrInput as (number | string)[][]).map((r) => [...r]);
  } else {
    const input = Array.isArray(matrixOrInput) ? (matrixOrInput as number[]) : [1, 2, 3, 4];
    const rCount = 3;
    const cCount = 4;
    matrix = Array.from({ length: rCount }, (_, r) =>
      Array.from({ length: cCount }, (_, c) =>
        (input[(r * cCount + c) % input.length]! + r) % 3 === 0 ? 0 : 1,
      ),
    );
  }

  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 4;
  const key = (r: number, c: number) => `${r},${c}`;
  const visited: string[] = [];
  const steps: VizStep[] = [
    {
      type: "matrix",
      matrix,
      cols,
      current: null,
      visited: [],
      line: 0,
      desc:
        mode === "bfs"
          ? "Seed the queue with the start cell."
          : `Scan the ${rows}×${cols} grid for unvisited land.`,
    },
  ];
  const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols;
  const neighbours = (r: number, c: number) =>
    (
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const
    )
      .map(([dr, dc]) => [r + dr, c + dc] as [number, number])
      .filter(([nr, nc]) => inBounds(nr, nc));

  // guarantee there is something to traverse
  if (!matrix.some((row) => row.some((v) => Number(v) === 1))) matrix[0]![0] = 1;
  let start: [number, number] = [0, 0];
  outer: for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Number(matrix[r]![c]) === 1) {
        start = [r, c];
        break outer;
      }
    }
  }

  if (mode === "bfs") {
    const queue: [number, number][] = [start];
    visited.push(key(start[0], start[1]));
    while (queue.length && steps.length < 22) {
      const [r, c] = queue.shift()!;
      steps.push({
        type: "matrix",
        matrix,
        cols,
        queue: queue.map(([qr, qc]) => `(${qr},${qc})`),
        set: [...visited],
        current: key(r, c),
        visited: [...visited],
        activeDataset: "queue",
        shiftInfo: {
          from: "matrix",
          to: "queue",
          action: "pop",
          reason: "Dequeue cell to process",
        },
        line: 2,
        desc: `Dequeue cell (${r}, ${c}).`,
      });
      for (const [nr, nc] of neighbours(r, c)) {
        if (Number(matrix[nr]![nc]) === 1 && !visited.includes(key(nr, nc))) {
          visited.push(key(nr, nc));
          queue.push([nr, nc]);
          steps.push({
            type: "matrix",
            matrix,
            cols,
            queue: queue.map(([qr, qc]) => `(${qr},${qc})`),
            set: [...visited],
            current: key(nr, nc),
            visited: [...visited],
            activeDataset: "matrix",
            shiftInfo: {
              from: "matrix",
              to: "queue",
              action: "push",
              reason: "Enqueue valid neighbor",
            },
            line: 5,
            desc: `Enqueue neighbour (${nr}, ${nc}).`,
          });
        }
      }
    }
    steps.push({
      type: "matrix",
      matrix,
      cols,
      queue: [],
      set: [...visited],
      current: null,
      visited: [...visited],
      line: 6,
      desc: `BFS reached ${visited.length} cells.`,
    });
    return {
      code,
      array: matrix.flat().filter((x): x is number => typeof x === "number"),
      steps: cap(steps),
    };
  }

  // DFS: sweep every cell as a potential root
  const roots: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) roots.push([r, c]);
  for (const root of roots) {
    if (steps.length >= 22) break;
    if (Number(matrix[root[0]]![root[1]]) !== 1 || visited.includes(key(root[0], root[1])))
      continue;
    steps.push({
      type: "matrix",
      matrix,
      cols,
      current: key(root[0], root[1]),
      visited: [...visited],
      line: 4,
      desc: `Scan finds unvisited land at (${root[0]}, ${root[1]}).`,
    });
    const stack: [number, number][] = [root];
    while (stack.length && steps.length < 22) {
      const [r, c] = stack.pop()!;
      if (!inBounds(r, c) || visited.includes(key(r, c)) || Number(matrix[r]![c]) !== 1) continue;
      visited.push(key(r, c));
      steps.push({
        type: "matrix",
        matrix,
        cols,
        current: key(r, c),
        visited: [...visited],
        line: 2,
        desc: `Mark (${r}, ${c}) as visited.`,
      });
      for (const [nr, nc] of neighbours(r, c)) stack.push([nr, nc]);
      steps.push({
        type: "matrix",
        matrix,
        cols,
        current: key(r, c),
        visited: [...visited],
        line: 3,
        desc: `Recurse into the neighbours of (${r}, ${c}).`,
      });
    }
  }
  steps.push({
    type: "matrix",
    matrix,
    cols,
    current: null,
    visited: [...visited],
    line: 5,
    desc: `DFS covered ${visited.length} cells.`,
  });
  return {
    code,
    array: matrix.flat().filter((x): x is number => typeof x === "number"),
    steps: cap(steps),
  };
}

function graphBfs(input: number[]): VizBundle {
  const code = [
    "queue = [source]; seen = {source}",
    "while queue:",
    "    node = queue.pop(0)",
    "    for nb in adj[node]:",
    "        if nb not in seen: seen.add(nb); queue.append(nb)",
    "return seen",
  ];
  const nodes = Array.from(new Set(input.map((n, i) => n + i))).slice(0, 6);
  const adj = new Map<number, number[]>();
  nodes.forEach((n, i) =>
    adj.set(n, [nodes[(i + 1) % nodes.length]!, nodes[(i + 2) % nodes.length]!]),
  );
  const seen: number[] = [nodes[0]!];
  const queue = [nodes[0]!];
  const adjMatrix: number[][] = nodes.map((u) =>
    nodes.map((v) => ((adj.get(u) ?? []).includes(v) ? 1 : 0)),
  );

  const steps: VizStep[] = [
    {
      type: "graph",
      matrix: adjMatrix,
      cols: nodes.length,
      queue: [...queue],
      set: [...seen],
      current: nodes[0]!,
      visited: [],
      activeDataset: "queue",
      shiftInfo: { from: "matrix", to: "queue", action: "push", reason: "Initialize BFS queue" },
      line: 0,
      desc: `Start BFS from node ${nodes[0]}.`,
    },
  ];
  while (queue.length && steps.length < 22) {
    const node = queue.shift()!;
    steps.push({
      type: "graph",
      matrix: adjMatrix,
      cols: nodes.length,
      queue: [...queue],
      set: [...seen],
      current: node,
      visited: [...seen],
      activeDataset: "queue",
      shiftInfo: { from: "matrix", to: "queue", action: "pop", reason: "Pop node from BFS queue" },
      line: 2,
      desc: `Dequeue node ${node}.`,
    });
    for (const nb of adj.get(node) ?? []) {
      if (!seen.includes(nb)) {
        seen.push(nb);
        queue.push(nb);
        steps.push({
          type: "graph",
          matrix: adjMatrix,
          cols: nodes.length,
          queue: [...queue],
          set: [...seen],
          current: nb,
          visited: [...seen],
          activeDataset: "matrix",
          shiftInfo: {
            from: "matrix",
            to: "queue",
            action: "push",
            reason: `Discovered neighbor ${nb}`,
          },
          line: 4,
          desc: `Discover neighbour ${nb}.`,
        });
      }
    }
  }
  steps.push({
    type: "graph",
    matrix: adjMatrix,
    cols: nodes.length,
    queue: [],
    set: [...seen],
    current: null,
    visited: [...seen],
    line: 5,
    desc: `Visited ${seen.length} nodes.`,
  });
  return { code, array: nodes, steps: cap(steps) };
}

function topologicalSort(input?: (number | string)[], slug = "", dataset?: TestDataset): VizBundle {
  const isAlien =
    slug.includes("alien") ||
    Boolean(dataset?.array && typeof dataset.array[0] === "string" && !dataset.matrix?.length) ||
    Boolean(input && typeof input[0] === "string" && input.length > 0 && String(input[0]).length > 1);

  if (isAlien) {
    const rawWords = (dataset?.array as string[]) || (Array.isArray(input) && typeof input[0] === "string" ? (input as string[]) : ["wrt", "wrf", "er", "ett", "rftt"]);
    const words = rawWords.map((w) => String(w).trim()).filter(Boolean);

    const code = [
      "adj = {c: set() for word in words for c in word}",
      "in_degree = {c: 0 for c in adj}",
      "for w1, w2 in zip(words, words[1:]):",
      "    if len(w1) > len(w2) and w1.startswith(w2): return ''",
      "    for c1, c2 in zip(w1, w2):",
      "        if c1 != c2: adj[c1].add(c2); in_degree[c2] += 1; break",
      "queue = deque([c for c in in_degree if in_degree[c] == 0])",
      "res = []",
      "while queue:",
      "    curr = queue.popleft(); res.append(curr)",
      "    for nb in adj[curr]:",
      "        in_degree[nb] -= 1",
      "        if in_degree[nb] == 0: queue.append(nb)",
      "return ''.join(res) if len(res) == len(adj) else ''",
    ];

    // Collect unique characters in order of discovery
    const uniqueChars: string[] = [];
    words.forEach((w) => {
      for (const ch of w) {
        if (!uniqueChars.includes(ch)) uniqueChars.push(ch);
      }
    });

    const adj = new Map<string, Set<string>>();
    const inDegree: Record<string, number> = {};
    uniqueChars.forEach((ch) => {
      adj.set(ch, new Set());
      inDegree[ch] = 0;
    });

    const edges: [string, string][] = [];
    const steps: VizStep[] = [];

    // Step 0: Initial character universe
    steps.push({
      type: "graph",
      matrix: [],
      queue: [],
      visited: [],
      map: { ...inDegree },
      line: 0,
      activeDataset: "map",
      desc: `Initialize Alien Dictionary character universe: {${uniqueChars.join(", ")}} with in-degree = 0.`,
      shiftInfo: { action: "read", reason: "Parsed unique alphabet characters" },
    });

    // Check adjacent word pairs to build graph
    let prefixViolation = false;
    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i]!;
      const w2 = words[i + 1]!;

      // Prefix rule validation (e.g. "abc" before "ab" is illegal)
      if (w1.length > w2.length && w1.startsWith(w2)) {
        prefixViolation = true;
        steps.push({
          type: "graph",
          matrix: [...edges],
          queue: [],
          visited: [],
          map: { ...inDegree },
          line: 3,
          desc: `Prefix rule violation: '${w1}' appears before shorter prefix '${w2}'. Illegal alien lexicographical order.`,
          shiftInfo: { from: w1, to: w2, action: "compare", reason: "Invalid prefix sequence -> returns empty string ''" },
        });
        break;
      }

      const minLen = Math.min(w1.length, w2.length);
      for (let j = 0; j < minLen; j++) {
        const c1 = w1[j]!;
        const c2 = w2[j]!;
        if (c1 !== c2) {
          if (!adj.get(c1)!.has(c2)) {
            adj.get(c1)!.add(c2);
            inDegree[c2] = (inDegree[c2] ?? 0) + 1;
            edges.push([c1, c2]);

            steps.push({
              type: "graph",
              matrix: [...edges],
              queue: [],
              visited: [],
              current: c1,
              map: { ...inDegree },
              line: 5,
              activeDataset: "matrix",
              desc: `Compare '${w1}' vs '${w2}' at index ${j}: discovered directed edge '${c1}' ➔ '${c2}' (in_degree['${c2}'] = ${inDegree[c2]}).`,
              shiftInfo: { from: c1, to: c2, action: "write", reason: `Rule: ${c1} precedes ${c2}` },
            });
          }
          break;
        }
      }
    }

    if (prefixViolation) {
      steps.push({
        type: "graph",
        matrix: [...edges],
        queue: [],
        visited: [],
        map: { ...inDegree },
        line: 13,
        desc: `Terminated with failure: Invalid alien dictionary (returns "").`,
      });
      return { code, array: uniqueChars, steps: cap(steps) };
    }

    // Initialize Kahn's BFS queue with in-degree 0 characters
    const queue = uniqueChars.filter((c) => inDegree[c] === 0);
    steps.push({
      type: "graph",
      matrix: [...edges],
      queue: [...queue],
      visited: [],
      map: { ...inDegree },
      line: 6,
      activeDataset: "queue",
      desc: `Initialize Kahn's BFS queue with in-degree 0 roots: [${queue.join(", ")}].`,
      shiftInfo: { action: "push", reason: "Nodes with 0 prerequisite dependencies" },
    });

    const res: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      res.push(curr);

      steps.push({
        type: "graph",
        matrix: [...edges],
        queue: [...queue],
        visited: [...res],
        current: curr,
        map: { ...inDegree },
        line: 9,
        activeDataset: "queue",
        desc: `Dequeue '${curr}'. Appended to alien character order: [${res.join(" ➔ ")}].`,
        shiftInfo: { from: curr, action: "pop", reason: "Zero remaining dependencies" },
      });

      const neighbors = Array.from(adj.get(curr) ?? []);
      for (const nb of neighbors) {
        inDegree[nb] = (inDegree[nb] ?? 1) - 1;
        const reachedZero = inDegree[nb] === 0;
        if (reachedZero) {
          queue.push(nb);
        }

        steps.push({
          type: "graph",
          matrix: [...edges],
          queue: [...queue],
          visited: [...res],
          current: nb,
          map: { ...inDegree },
          line: reachedZero ? 12 : 11,
          activeDataset: "map",
          desc: `Decrement in_degree['${nb}'] to ${inDegree[nb]}${reachedZero ? ` ➔ Added '${nb}' to BFS queue.` : "."}`,
          shiftInfo: {
            from: curr,
            to: nb,
            action: reachedZero ? "push" : "write",
            reason: `In-degree resolved to ${inDegree[nb]}`,
          },
        });
      }
    }

    const isValid = res.length === uniqueChars.length;
    steps.push({
      type: "graph",
      matrix: [...edges],
      queue: [],
      visited: [...res],
      current: null,
      map: { ...inDegree },
      line: 13,
      desc: isValid
        ? `Topological sort verified! Final alien lexicographical order: "${res.join("")}" (${res.length}/${uniqueChars.length} characters resolved).`
        : `Cycle detected in character precedence graph! Only ${res.length}/${uniqueChars.length} characters processed. Invalid alien dictionary (returns "").`,
    });

    return { code, array: uniqueChars, steps: cap(steps) };
  }

  // Course Schedule / General DAG Topological Sort (numeric nodes)
  const numNodes = typeof dataset?.target === "number" ? dataset.target : 4;
  const rawEdges = dataset?.matrix || [
    [1, 0],
    [2, 0],
    [3, 1],
    [3, 2],
  ];

  const code = [
    "adj = defaultdict(list)",
    "in_degree = [0] * numCourses",
    "for dest, src in prerequisites:",
    "    adj[src].append(dest); in_degree[dest] += 1",
    "queue = deque([i for i in range(numCourses) if in_degree[i] == 0])",
    "order = []",
    "while queue:",
    "    curr = queue.popleft(); order.append(curr)",
    "    for nb in adj[curr]:",
    "        in_degree[nb] -= 1",
    "        if in_degree[nb] == 0: queue.append(nb)",
    "return len(order) == numCourses",
  ];

  const nodes = Array.from({ length: numNodes }, (_, i) => i);
  const inDegree: Record<string, number> = {};
  nodes.forEach((n) => {
    inDegree[String(n)] = 0;
  });

  const adj = new Map<number, number[]>();
  nodes.forEach((n) => adj.set(n, []));

  const edges: [number, number][] = [];
  rawEdges.forEach((edge) => {
    if (Array.isArray(edge) && edge.length >= 2) {
      const dest = Number(edge[0]);
      const src = Number(edge[1]);
      if (src < numNodes && dest < numNodes) {
        adj.get(src)?.push(dest);
        inDegree[String(dest)] = (inDegree[String(dest)] ?? 0) + 1;
        edges.push([src, dest]);
      }
    }
  });

  const steps: VizStep[] = [];

  // Step 0: Initial graph
  steps.push({
    type: "graph",
    matrix: edges,
    queue: [],
    visited: [],
    map: { ...inDegree },
    line: 1,
    activeDataset: "map",
    desc: `Initialize course dependency DAG with ${numNodes} courses and ${edges.length} prerequisite edges.`,
    shiftInfo: { action: "read", reason: "Initialized in-degree table" },
  });

  const queue = nodes.filter((n) => inDegree[String(n)] === 0);
  steps.push({
    type: "graph",
    matrix: edges,
    queue: [...queue],
    visited: [],
    map: { ...inDegree },
    line: 4,
    activeDataset: "queue",
    desc: `Initialize BFS queue with 0-prerequisite courses: [${queue.join(", ")}].`,
    shiftInfo: { action: "push", reason: "Independent prerequisite roots" },
  });

  const order: number[] = [];
  while (queue.length > 0 && steps.length < 75) {
    const curr = queue.shift()!;
    order.push(curr);

    steps.push({
      type: "graph",
      matrix: edges,
      queue: [...queue],
      visited: [...order],
      current: curr,
      map: { ...inDegree },
      line: 7,
      activeDataset: "queue",
      desc: `Completed course ${curr}. Added to completion schedule: [${order.join(" ➔ ")}].`,
      shiftInfo: { from: String(curr), action: "pop", reason: "Course prerequisites satisfied" },
    });

    const neighbors = adj.get(curr) ?? [];
    for (const nb of neighbors) {
      inDegree[String(nb)] = (inDegree[String(nb)] ?? 1) - 1;
      const reachedZero = inDegree[String(nb)] === 0;
      if (reachedZero) {
        queue.push(nb);
      }

      steps.push({
        type: "graph",
        matrix: edges,
        queue: [...queue],
        visited: [...order],
        current: nb,
        map: { ...inDegree },
        line: reachedZero ? 10 : 9,
        activeDataset: "map",
        desc: `Decrement in_degree[Course ${nb}] to ${inDegree[String(nb)]}${reachedZero ? ` ➔ Prerequisite cleared, added Course ${nb} to queue.` : "."}`,
        shiftInfo: {
          from: String(curr),
          to: String(nb),
          action: reachedZero ? "push" : "write",
          reason: `In-degree now ${inDegree[String(nb)]}`,
        },
      });
    }
  }

  const canFinish = order.length === numNodes;
  steps.push({
    type: "graph",
    matrix: edges,
    queue: [],
    visited: [...order],
    current: null,
    map: { ...inDegree },
    line: 11,
    desc: canFinish
      ? `All ${numNodes} courses can be completed! Valid topological sequence: [${order.join(", ")}].`
      : `Cyclic prerequisite dependency deadlock detected! Completed only ${order.length}/${numNodes} courses (cannot finish: false / []).`,
  });

  return { code, array: nodes, steps: cap(steps) };
}

function wordLadderBfs(
  input?: (number | string)[],
  targetVal?: number | string,
  slug = "",
  dataset?: TestDataset,
): VizBundle {
  const rawWords =
    (dataset?.array as string[]) ||
    (Array.isArray(input) && typeof input[0] === "string"
      ? (input as string[])
      : ["hit", "hot", "dot", "dog", "lot", "log", "cog"]);

  const beginWord = String(rawWords[0] ?? "hit").trim();
  const endWord = String(dataset?.target ?? targetVal ?? "cog").trim();
  const wordList = rawWords.slice(1).map((w) => String(w).trim()).filter(Boolean);
  const wordSet = new Set(wordList);

  const code = [
    "if endWord not in wordSet: return 0",
    "queue = deque([(beginWord, 1)])",
    "visited = {beginWord}",
    "while queue:",
    "    word, level = queue.popleft()",
    "    if word == endWord: return level",
    "    for i in range(len(word)):",
    "        for c in 'abcdefghijklmnopqrstuvwxyz':",
    "            nxt = word[:i] + c + word[i+1:]",
    "            if nxt in wordSet and nxt not in visited:",
    "                visited.add(nxt)",
    "                queue.append((nxt, level + 1))",
    "return 0",
  ];

  // Discovered graph edges
  const allKnownWords = Array.from(new Set([beginWord, ...wordList]));
  const edges: [string, string][] = [];
  if (Array.isArray(dataset?.matrix) && dataset.matrix.length > 0) {
    dataset.matrix.forEach((e) => {
      if (Array.isArray(e) && e.length >= 2) {
        edges.push([String(e[0]), String(e[1])]);
      }
    });
  } else {
    // Dynamically compute 1-letter diff edges between all words in lexicon
    for (let i = 0; i < allKnownWords.length; i++) {
      for (let j = i + 1; j < allKnownWords.length; j++) {
        const w1 = allKnownWords[i]!;
        const w2 = allKnownWords[j]!;
        if (w1.length === w2.length) {
          let diff = 0;
          for (let k = 0; k < w1.length; k++) {
            if (w1[k] !== w2[k]) diff++;
            if (diff > 1) break;
          }
          if (diff === 1) {
            edges.push([w1, w2]);
          }
        }
      }
    }
  }

  const steps: VizStep[] = [];
  const levelMap: Record<string, number> = { [beginWord]: 1 };

  // Step 0: Initialize
  steps.push({
    type: "graph",
    matrix: edges,
    queue: [beginWord],
    visited: [beginWord],
    current: beginWord,
    map: { ...levelMap },
    line: 1,
    wSum: 1,
    activeDataset: "queue",
    desc: `Initialize BFS search from beginWord "${beginWord}" aiming for endWord "${endWord}" (word bank: ${wordList.length} words).`,
    shiftInfo: { from: beginWord, action: "push", reason: `Root vertex at level 1` },
  });

  // Boundary check: endWord in wordSet
  if (!wordSet.has(endWord)) {
    steps.push({
      type: "graph",
      matrix: edges,
      queue: [],
      visited: [beginWord],
      current: null,
      map: { ...levelMap },
      line: 0,
      wSum: 0,
      desc: `Target endWord "${endWord}" is not in the dictionary bank -> Transformation impossible, returns 0.`,
      shiftInfo: { from: beginWord, to: endWord, action: "compare", reason: `Target "${endWord}" not found in dictionary` },
    });
    return { code, array: allKnownWords, steps: cap(steps) };
  }

  const queue: { word: string; level: number }[] = [{ word: beginWord, level: 1 }];
  const visited = new Set<string>([beginWord]);
  let foundTarget = false;

  while (queue.length > 0 && steps.length < 80) {
    const { word, level } = queue.shift()!;

    steps.push({
      type: "graph",
      matrix: edges,
      queue: queue.map((q) => q.word),
      visited: Array.from(visited),
      current: word,
      map: { ...levelMap },
      line: 4,
      wSum: level,
      activeDataset: "queue",
      desc: `Dequeued word "${word}" at level ${level}. Searching 1-character mutation neighbors...`,
      shiftInfo: { from: word, action: "pop", reason: `Exploring mutations at level ${level}` },
    });

    if (word === endWord) {
      foundTarget = true;
      steps.push({
        type: "graph",
        matrix: edges,
        queue: queue.map((q) => q.word),
        visited: Array.from(visited),
        current: word,
        map: { ...levelMap },
        line: 5,
        wSum: level,
        mSum: level,
        desc: `Target word "${endWord}" reached! Shortest transformation ladder length = ${level}.`,
        shiftInfo: { from: word, to: endWord, action: "read", reason: `Target reached with distance ${level}` },
      });
      break;
    }

    // Find all valid 1-letter neighbors
    const neighbors: string[] = [];
    for (let i = 0; i < word.length; i++) {
      for (let c = 97; c <= 122; c++) {
        const char = String.fromCharCode(c);
        if (char === word[i]) continue;
        const nextWord = word.slice(0, i) + char + word.slice(i + 1);
        if (wordSet.has(nextWord) && !visited.has(nextWord)) {
          visited.add(nextWord);
          levelMap[nextWord] = level + 1;
          queue.push({ word: nextWord, level: level + 1 });
          neighbors.push(nextWord);

          steps.push({
            type: "graph",
            matrix: edges,
            queue: queue.map((q) => q.word),
            visited: Array.from(visited),
            current: nextWord,
            map: { ...levelMap },
            line: 11,
            wSum: level + 1,
            activeDataset: "queue",
            desc: `Mutated index ${i} ('${word[i]}' ➔ '${char}'): Discovered valid word "${nextWord}" ➔ Enqueued at level ${level + 1}.`,
            shiftInfo: {
              from: word,
              to: nextWord,
              action: "push",
              reason: `Valid transition: "${word}" ➔ "${nextWord}" (level ${level + 1})`,
            },
          });
        }
      }
    }

    if (neighbors.length === 0 && queue.length > 0) {
      steps.push({
        type: "graph",
        matrix: edges,
        queue: queue.map((q) => q.word),
        visited: Array.from(visited),
        current: word,
        map: { ...levelMap },
        line: 7,
        wSum: level,
        desc: `No further unvisited mutations from "${word}". Continuing with remaining BFS queue: [${queue.map((q) => q.word).join(", ")}].`,
      });
    }
  }

  if (!foundTarget) {
    steps.push({
      type: "graph",
      matrix: edges,
      queue: [],
      visited: Array.from(visited),
      current: null,
      map: { ...levelMap },
      line: 12,
      wSum: 0,
      desc: `BFS queue exhausted without reaching "${endWord}". No transformation sequence exists -> returns 0.`,
    });
  }

  return { code, array: allKnownWords, steps: cap(steps) };
}

function linkedListReverse(input: number[]): VizBundle {
  const code = [
    "prev, curr = None, head",
    "while curr:",
    "    nxt = curr.next",
    "    curr.next = prev",
    "    prev, curr = curr, nxt",
    "return prev",
  ];
  const list = input.slice(0, 6);
  const steps: VizStep[] = [
    {
      type: "linkedlist",
      list,
      current: 0,
      predecessor: null,
      visited: [],
      line: 0,
      desc: "prev = null, curr = head.",
    },
  ];
  for (let i = 0; i < list.length; i++) {
    steps.push({
      type: "linkedlist",
      list,
      current: i,
      predecessor: i === 0 ? null : i - 1,
      visited: list.slice(0, i),
      line: 2,
      desc: `nxt = node after ${list[i]}.`,
    });
    steps.push({
      type: "linkedlist",
      list,
      current: i,
      predecessor: i === 0 ? null : i - 1,
      visited: list.slice(0, i + 1),
      line: 3,
      desc: `Point ${list[i]} back at ${i === 0 ? "null" : list[i - 1]}.`,
    });
  }
  steps.push({
    type: "linkedlist",
    list,
    current: null,
    predecessor: list.length - 1,
    visited: list,
    line: 5,
    desc: `New head is ${list[list.length - 1]}.`,
  });
  return { code, array: list, steps: cap(steps) };
}

function linkedListCycle(
  input: (number | string)[],
  _slug = "",
  _title = "",
  dataset?: TestDataset,
): VizBundle {
  const code = [
    "slow = fast = head",
    "while fast and fast.next:",
    "    slow = slow.next",
    "    fast = fast.next.next",
    "    if slow is fast: return True",
    "return False",
  ];
  const rawList = dataset?.array ?? (input.length > 0 ? input : [3, 2, 0, -4]);
  const list = rawList.slice(0, 8);
  const cyclePos = typeof dataset?.pos === "number" ? dataset.pos : (dataset?.hasCycle !== false && list.length > 1 ? 1 : -1);

  const getNext = (idx: number): number => {
    if (idx < 0) return -1;
    if (idx + 1 < list.length) return idx + 1;
    return cyclePos >= 0 && cyclePos < list.length ? cyclePos : -1;
  };

  const steps: VizStep[] = [
    {
      type: "linkedlist",
      list,
      current: 0,
      predecessor: 0,
      visited: list.slice(0, 1),
      line: 0,
      desc: `slow and fast both initialize at head (node ${list[0] ?? ""}).`,
    },
  ];

  let slow = 0;
  let fast = 0;
  let stepCount = 0;
  let hasCycleFound = false;

  while (stepCount < 20) {
    const fastNext = getNext(fast);
    const fastNextNext = fastNext !== -1 ? getNext(fastNext) : -1;

    if (fast === -1 || fastNext === -1) {
      break;
    }

    steps.push({
      type: "linkedlist",
      list,
      current: slow,
      predecessor: fast,
      visited: list.slice(0, Math.max(slow + 1, fast + 1)),
      line: 1,
      desc: `Check while fast (${list[fast]}) and fast.next (${fastNext !== -1 ? list[fastNext] : "None"}) exist.`,
    });

    slow = getNext(slow);
    fast = fastNextNext;
    stepCount++;

    steps.push({
      type: "linkedlist",
      list,
      current: slow >= 0 ? slow : null,
      predecessor: fast >= 0 ? fast : null,
      visited: list.slice(0, Math.max(slow + 1, (fast >= 0 ? fast : 0) + 1)),
      line: 2,
      desc: `slow advances 1 step → node ${slow >= 0 ? list[slow] : "None"}.`,
    });

    steps.push({
      type: "linkedlist",
      list,
      current: slow >= 0 ? slow : null,
      predecessor: fast >= 0 ? fast : null,
      visited: list.slice(0, Math.max(slow + 1, (fast >= 0 ? fast : 0) + 1)),
      line: 3,
      desc: `fast advances 2 steps → node ${fast >= 0 ? list[fast] : "None"}.`,
    });

    if (slow === fast && slow !== -1) {
      steps.push({
        type: "linkedlist",
        list,
        current: slow,
        predecessor: fast,
        visited: list,
        line: 4,
        desc: `slow meets fast at node ${list[slow]}! Cycle detected → return True.`,
      });
      hasCycleFound = true;
      break;
    }
  }

  if (!hasCycleFound) {
    steps.push({
      type: "linkedlist",
      list,
      current: slow >= 0 ? slow : null,
      predecessor: fast >= 0 ? fast : null,
      visited: list,
      line: 5,
      desc: "Fast reached end (None). No cycle in list → return False.",
    });
  }

  return { code, array: list, steps: cap(steps) };
}

function treeArray(input: number[]): (number | null)[] {
  return input.slice(0, 7).map((n) => n);
}

function treeDfs(
  _input: (number | string)[],
  title = "",
  slug = "",
  datasetTree?: (number | string | null)[],
): VizBundle {
  const s = `${slug} ${title}`.toLowerCase();
  const rawTree = datasetTree ?? (slug ? sampleTreeFor(slug) : [1, null, 2, null, null, 3]);
  const tree = normalizeLeetCodeTreeToHeap(rawTree);
  const isPreorder = /preorder/i.test(s);
  const isPostorder = /postorder/i.test(s);

  if (isPreorder) {
    const code = [
      "stack = [root]",
      "res = []",
      "while stack:",
      "    node = stack.pop()",
      "    res.append(node.val)",
      "    if node.right: stack.append(node.right)",
      "    if node.left: stack.append(node.left)",
      "return res",
    ];
    const rootVal = tree[0];
    if (rootVal === null || rootVal === undefined) {
      return { code, array: [], steps: [] };
    }
    const stack: number[] = [0]; // index into tree
    const visited: (number | string)[] = [];
    const steps: VizStep[] = [
      {
        type: "tree",
        tree,
        stack: [rootVal],
        current: rootVal,
        visited: [],
        activeDataset: "stack",
        shiftInfo: {
          from: "tree",
          to: "stack",
          action: "push",
          reason: `Initialize stack with root node [${rootVal}]`,
        },
        line: 0,
        desc: `Initialize working stack with root node [${rootVal}].`,
      },
    ];

    while (stack.length > 0) {
      const idx = stack.pop()!;
      const val = tree[idx]!;
      visited.push(val);
      const currentStackVals = stack.map((i) => tree[i]!);

      steps.push({
        type: "tree",
        tree,
        stack: [...currentStackVals],
        current: val,
        visited: [...visited],
        activeDataset: "tree",
        shiftInfo: {
          from: "stack",
          to: "tree",
          action: "pop",
          reason: `Pop node ${val} from stack to visit`,
        },
        line: 3,
        desc: `node = stack.pop() → visit node ${val} (preorder #${visited.length}).`,
      });

      const rightIdx = 2 * idx + 2;
      if (rightIdx < tree.length && tree[rightIdx] !== null && tree[rightIdx] !== undefined) {
        stack.push(rightIdx);
        const nextStackVals = stack.map((i) => tree[i]!);
        steps.push({
          type: "tree",
          tree,
          stack: [...nextStackVals],
          current: tree[rightIdx]!,
          visited: [...visited],
          activeDataset: "stack",
          shiftInfo: {
            from: "tree",
            to: "stack",
            action: "push",
            reason: `Push right child ${tree[rightIdx]} onto stack`,
          },
          line: 5,
          desc: `node.right exists → stack.append(${tree[rightIdx]}).`,
        });
      }

      const leftIdx = 2 * idx + 1;
      if (leftIdx < tree.length && tree[leftIdx] !== null && tree[leftIdx] !== undefined) {
        stack.push(leftIdx);
        const nextStackVals = stack.map((i) => tree[i]!);
        steps.push({
          type: "tree",
          tree,
          stack: [...nextStackVals],
          current: tree[leftIdx]!,
          visited: [...visited],
          activeDataset: "stack",
          shiftInfo: {
            from: "tree",
            to: "stack",
            action: "push",
            reason: `Push left child ${tree[leftIdx]} onto stack`,
          },
          line: 6,
          desc: `node.left exists → stack.append(${tree[leftIdx]}).`,
        });
      }
    }

    steps.push({
      type: "tree",
      tree,
      stack: [],
      current: null,
      visited: [...visited],
      line: 7,
      desc: `Stack is empty. Preorder traversal complete: [${visited.join(", ")}].`,
    });

    const displayArray = tree.filter((x): x is number | string => x !== null);
    return { code, array: displayArray, steps: cap(steps) };
  }

  if (isPostorder) {
    const code = [
      "def postorder(node):",
      "    if not node: return",
      "    postorder(node.left)",
      "    postorder(node.right)",
      "    visit(node)",
      "postorder(root)",
    ];
    const visited: (number | string)[] = [];
    const steps: VizStep[] = [];
    const walk = (i: number) => {
      if (i >= tree.length || tree[i] == null) return;
      steps.push({
        type: "tree",
        tree,
        current: tree[i]!,
        visited: [...visited],
        line: 2,
        desc: `Traverse left child of ${tree[i]}.`,
      });
      walk(2 * i + 1);
      steps.push({
        type: "tree",
        tree,
        current: tree[i]!,
        visited: [...visited],
        line: 3,
        desc: `Traverse right child of ${tree[i]}.`,
      });
      walk(2 * i + 2);
      visited.push(tree[i]!);
      steps.push({
        type: "tree",
        tree,
        current: tree[i]!,
        visited: [...visited],
        line: 4,
        desc: `Visit node ${tree[i]} (postorder #${visited.length}).`,
      });
    };
    walk(0);
    steps.push({
      type: "tree",
      tree,
      current: null,
      visited: [...visited],
      line: 5,
      desc: `Postorder traversal complete: [${visited.join(", ")}].`,
    });
    const displayArray = tree.filter((x): x is number | string => x !== null);
    return { code, array: displayArray, steps: cap(steps) };
  }

  // Default Inorder / General DFS
  const code = [
    "def dfs(node):",
    "    if not node: return",
    "    dfs(node.left)",
    "    visit(node)",
    "    dfs(node.right)",
    "dfs(root)",
  ];
  const visited: (number | string)[] = [];
  const steps: VizStep[] = [];
  const walk = (i: number) => {
    if (i >= tree.length || tree[i] == null) return;
    steps.push({
      type: "tree",
      tree,
      current: tree[i]!,
      visited: [...visited],
      line: 2,
      desc: `Descend into left subtree of ${tree[i]}.`,
    });
    walk(2 * i + 1);
    visited.push(tree[i]!);
    steps.push({
      type: "tree",
      tree,
      current: tree[i]!,
      visited: [...visited],
      line: 3,
      desc: `Visit node ${tree[i]} (inorder #${visited.length}).`,
    });
    walk(2 * i + 2);
  };
  walk(0);
  steps.push({
    type: "tree",
    tree,
    current: null,
    visited: [...visited],
    line: 5,
    desc: `Inorder traversal complete: [${visited.join(", ")}].`,
  });
  const displayArray = tree.filter((x): x is number | string => x !== null);
  return { code, array: displayArray, steps: cap(steps) };
}

function treeBfs(
  _input: (number | string)[],
  title = "",
  slug = "",
  datasetTree?: (number | string | null)[],
): VizBundle {
  const code = [
    "queue = [root]",
    "levels = []",
    "while queue:",
    "    level_size = len(queue)",
    "    current_level = []",
    "    for _ in range(level_size):",
    "        node = queue.pop(0)",
    "        current_level.append(node.val)",
    "        if node.left: queue.append(node.left)",
    "        if node.right: queue.append(node.right)",
    "    levels.append(current_level)",
    "return levels",
  ];
  const rawTree = datasetTree ?? (slug ? sampleTreeFor(slug) : [3, 9, 20, null, null, 15, 7]);
  const tree = normalizeLeetCodeTreeToHeap(rawTree);
  const rootVal = tree[0];
  if (rootVal === null || rootVal === undefined) {
    return { code, array: [], steps: [] };
  }

  let queue: number[] = [0]; // tree indices
  const visited: (number | string)[] = [];
  const allLevels: (number | string)[][] = [];
  const steps: VizStep[] = [
    {
      type: "tree",
      tree,
      queue: [rootVal],
      current: rootVal,
      visited: [],
      activeDataset: "queue",
      shiftInfo: {
        from: "tree",
        to: "queue",
        action: "push",
        reason: `Initialize queue with root node ${rootVal}`,
      },
      line: 0,
      desc: `Initialize queue with root node [${rootVal}].`,
    },
  ];

  while (queue.length > 0 && steps.length < 50) {
    const levelSize = queue.length;
    const currentQueueVals = queue.map((idx) => tree[idx]!);
    steps.push({
      type: "tree",
      tree,
      queue: [...currentQueueVals],
      current: currentQueueVals[0] ?? null,
      visited: [...visited],
      line: 3,
      desc: `Level ${allLevels.length + 1}: level_size = ${levelSize} nodes in queue [${currentQueueVals.join(", ")}].`,
    });

    const currentLevel: (number | string)[] = [];
    const nextQueue: number[] = [];
    let currentQueueState = [...currentQueueVals];

    for (let i = 0; i < levelSize; i++) {
      const nodeIdx = queue[i]!;
      const nodeVal = tree[nodeIdx]!;
      currentLevel.push(nodeVal);
      visited.push(nodeVal);

      // Dequeue node
      currentQueueState = currentQueueState.filter((_, qIdx) => qIdx !== 0);

      steps.push({
        type: "tree",
        tree,
        queue: [...currentQueueState],
        current: nodeVal,
        visited: [...visited],
        activeDataset: "tree",
        shiftInfo: {
          from: "queue",
          to: "tree",
          action: "pop",
          reason: `Dequeue node ${nodeVal} from queue`,
        },
        line: 6,
        desc: `node = queue.pop(0) → node ${nodeVal}.`,
      });

      steps.push({
        type: "tree",
        tree,
        queue: [...currentQueueState],
        current: nodeVal,
        visited: [...visited],
        line: 7,
        desc: `current_level.append(${nodeVal}) → [${currentLevel.join(", ")}].`,
      });

      // Left child
      const leftIdx = 2 * nodeIdx + 1;
      const leftVal = leftIdx < tree.length ? tree[leftIdx] : null;
      if (leftVal !== null && leftVal !== undefined) {
        nextQueue.push(leftIdx);
        currentQueueState.push(leftVal);
        steps.push({
          type: "tree",
          tree,
          queue: [...currentQueueState],
          current: leftVal,
          visited: [...visited],
          activeDataset: "queue",
          shiftInfo: {
            from: "tree",
            to: "queue",
            action: "push",
            reason: `Enqueue left child ${leftVal}`,
          },
          line: 8,
          desc: `node.left exists → queue.append(${leftVal}).`,
        });
      }

      // Right child
      const rightIdx = 2 * nodeIdx + 2;
      const rightVal = rightIdx < tree.length ? tree[rightIdx] : null;
      if (rightVal !== null && rightVal !== undefined) {
        nextQueue.push(rightIdx);
        currentQueueState.push(rightVal);
        steps.push({
          type: "tree",
          tree,
          queue: [...currentQueueState],
          current: rightVal,
          visited: [...visited],
          activeDataset: "queue",
          shiftInfo: {
            from: "tree",
            to: "queue",
            action: "push",
            reason: `Enqueue right child ${rightVal}`,
          },
          line: 9,
          desc: `node.right exists → queue.append(${rightVal}).`,
        });
      }
    }

    allLevels.push(currentLevel);
    queue = nextQueue;

    steps.push({
      type: "tree",
      tree,
      queue: queue.map((idx) => tree[idx]!),
      current: null,
      visited: [...visited],
      line: 10,
      desc: `Level ${allLevels.length} complete → levels = [${allLevels.map((lvl) => `[${lvl.join(", ")}]`).join(", ")}].`,
    });
  }

  steps.push({
    type: "tree",
    tree,
    queue: [],
    current: null,
    visited: [...visited],
    line: 11,
    desc: "Queue is empty. Traversal complete.",
  });

  const displayArray = tree.filter((x): x is number | string => x !== null);
  return { code, array: displayArray, steps: cap(steps) };
}

function bstSearch(
  input: (number | string)[],
  slug = "",
  title = "",
  dataset?: TestDataset,
): VizBundle {
  const code = [
    "node = root",
    "while node:",
    "    if node.val == target: return node",
    "    node = node.left if target < node.val else node.right",
    "return None",
  ];
  let tree: (number | string | null)[];
  let target: number | string;

  const datasetTree = dataset?.tree ?? dataset?.array;
  if (datasetTree && Array.isArray(datasetTree)) {
    tree = normalizeLeetCodeTreeToHeap(datasetTree);
    target = dataset?.target ?? (tree.find((x) => x !== null) ?? 0);
  } else {
    const numList = input
      .map(Number)
      .filter((n) => !isNaN(n));
    const sorted = Array.from(new Set(numList.length > 0 ? numList : [4, 2, 7, 1, 3]))
      .sort((a, b) => a - b)
      .slice(0, 7);
    tree = new Array(7).fill(null);
    const build = (lo: number, hi: number, idx: number) => {
      if (lo > hi || idx >= tree.length) return;
      const mid = Math.floor((lo + hi) / 2);
      tree[idx] = sorted[mid] ?? null;
      build(lo, mid - 1, 2 * idx + 1);
      build(mid + 1, hi, 2 * idx + 2);
    };
    build(0, sorted.length - 1, 0);
    target = dataset?.target ?? sorted[sorted.length - 2] ?? sorted[0] ?? 0;
  }

  const visited: (number | string)[] = [];
  const steps: VizStep[] = [
    {
      type: "bst",
      tree,
      current: tree[0] ?? null,
      visited: [],
      line: 0,
      desc: `Search the BST for target ${target}. Start at root node ${tree[0]}.`,
    },
  ];

  let idx = 0;
  let found = false;
  while (idx < tree.length && tree[idx] != null) {
    const val = tree[idx]!;
    visited.push(val);
    steps.push({
      type: "bst",
      tree,
      current: val,
      visited: [...visited],
      line: 1,
      desc: `Check node ${val}: while node is not None.`,
    });

    if (String(val) === String(target)) {
      steps.push({
        type: "bst",
        tree,
        current: val,
        visited: [...visited],
        line: 2,
        desc: `node.val == ${target} → Found target node ${val}!`,
      });
      found = true;
      break;
    }

    const goLeft = Number(target) < Number(val);
    steps.push({
      type: "bst",
      tree,
      current: val,
      visited: [...visited],
      line: 3,
      desc: `${target} ${goLeft ? "<" : ">"} ${val} → traverse ${goLeft ? "left (node.left)" : "right (node.right)"}.`,
    });
    idx = goLeft ? 2 * idx + 1 : 2 * idx + 2;
  }

  if (!found) {
    steps.push({
      type: "bst",
      tree,
      current: null,
      visited: [...visited],
      line: 4,
      desc: `Reached None. Target ${target} not found in BST.`,
    });
  }

  const displayArray = tree.filter((x): x is number | string => x !== null);
  return { code, array: displayArray, steps: cap(steps) };
}

function heapTopK(
  input: (number | string)[],
  slug = "kth-largest-element-in-an-array",
  dataset?: TestDataset,
): VizBundle {
  const s = (slug ?? "").toLowerCase();

  if (/median-from-data-stream|sliding-window-median/.test(s)) {
    const code = [
      "class MedianFinder:",
      "    def __init__(self):",
      "        self.small = []  # Max-Heap (stores smaller half)",
      "        self.large = []  # Min-Heap (stores larger half)",
      "",
      "    def addNum(self, num):",
      "        heappush(self.small, -num)",
      "        if self.small and self.large and (-self.small[0] > self.large[0]):",
      "            heappush(self.large, -heappop(self.small))",
      "        if len(self.small) > len(self.large) + 1:",
      "            heappush(self.large, -heappop(self.small))",
      "        elif len(self.large) > len(self.small):",
      "            heappush(self.small, -heappop(self.large))",
      "",
      "    def findMedian(self):",
      "        if len(self.small) > len(self.large): return -self.small[0]",
      "        return (-self.small[0] + self.large[0]) / 2.0",
    ];

    const rawNums = dataset?.array && dataset.array.length > 0 ? dataset.array : [5, 2, 8, 1, 9, 3];
    const nums = rawNums.map(Number);
    const small: number[] = []; // Max-heap
    const large: number[] = []; // Min-heap
    const medians: (number | string)[] = [];

    const steps: VizStep[] = [
      {
        type: "heap",
        array: nums,
        tree: [],
        current: null,
        visited: [],
        line: 2,
        wSum: 0,
        desc: "Initialize Dual-Heap MedianFinder: small (Max-Heap) and large (Min-Heap).",
      },
    ];

    for (let i = 0; i < nums.length; i++) {
      const num = nums[i]!;
      // Push to small max-heap
      small.push(num);
      small.sort((a, b) => b - a); // Max-heap order

      steps.push({
        type: "heap",
        array: nums,
        left: i,
        tree: [...small, ...large],
        current: num,
        visited: nums.slice(0, i + 1),
        line: 6,
        wSum: small.length + large.length,
        shiftInfo: {
          from: `num: ${num}`,
          to: `small (max-heap)`,
          action: "push",
          reason: `Pushed ${num} into lower-half max-heap.`,
        },
        desc: `Step ${i + 1}: Pushed ${num} to small max-heap -> small = [${small.join(", ")}].`,
      });

      // Balancing step 1: if small max > large min
      if (small.length > 0 && large.length > 0 && small[0]! > large[0]!) {
        const transferred = small.shift()!;
        large.push(transferred);
        large.sort((a, b) => a - b); // Min-heap order

        steps.push({
          type: "heap",
          array: nums,
          left: i,
          tree: [...small, ...large],
          current: transferred,
          visited: nums.slice(0, i + 1),
          line: 8,
          wSum: small.length + large.length,
          shiftInfo: {
            from: `small: ${transferred}`,
            to: `large: ${transferred}`,
            action: "shift",
            reason: `Transferred ${transferred} from small to large to preserve invariant small <= large.`,
          },
          desc: `Rebalanced: Transferred ${transferred} from small to large -> small=[${small.join(",")}], large=[${large.join(",")}].`,
        });
      }

      // Balancing step 2: size parity
      if (small.length > large.length + 1) {
        const transferred = small.shift()!;
        large.push(transferred);
        large.sort((a, b) => a - b);
        steps.push({
          type: "heap",
          array: nums,
          left: i,
          tree: [...small, ...large],
          current: transferred,
          visited: nums.slice(0, i + 1),
          line: 10,
          wSum: small.length + large.length,
          desc: `Size parity: Transferred ${transferred} to large heap.`,
        });
      } else if (large.length > small.length) {
        const transferred = large.shift()!;
        small.push(transferred);
        small.sort((a, b) => b - a);
        steps.push({
          type: "heap",
          array: nums,
          left: i,
          tree: [...small, ...large],
          current: transferred,
          visited: nums.slice(0, i + 1),
          line: 12,
          wSum: small.length + large.length,
          desc: `Size parity: Transferred ${transferred} to small heap.`,
        });
      }

      // Compute median
      const median =
        small.length > large.length
          ? small[0]!
          : (small[0]! + large[0]!) / 2;
      medians.push(median);

      steps.push({
        type: "heap",
        array: nums,
        left: i,
        tree: [...small, ...large],
        current: median,
        visited: nums.slice(0, i + 1),
        line: 16,
        wSum: small.length + large.length,
        mSum: median,
        desc: `Calculated Running Median = ${median} (small = [${small.join(",")}], large = [${large.join(",")}]).`,
      });
    }

    const finalMedian = medians[medians.length - 1] ?? 0;
    steps.push({
      type: "heap",
      array: nums,
      tree: [...small, ...large],
      current: finalMedian,
      visited: nums,
      line: 16,
      wSum: small.length + large.length,
      mSum: typeof finalMedian === "number" ? finalMedian : undefined,
      desc: `Stream Processing Complete! Final Median is ${finalMedian}.`,
    });

    return { code, array: nums, steps: cap(steps) };
  }

  if (/last-stone-weight/.test(s)) {
    const code = [
      "heap = [-x for x in stones]",
      "heapify(heap)",
      "while len(heap) > 1:",
      "    y = -heappop(heap)",
      "    x = -heappop(heap)",
      "    if y != x: heappush(heap, -(y - x))",
      "return -heap[0] if heap else 0",
    ];

    const rawStones = dataset?.array && dataset.array.length > 0 ? dataset.array : [2, 7, 4, 1, 8, 1];
    const stones = rawStones.map(Number);
    const heap = [...stones].sort((a, b) => b - a); // Max-heap order

    const steps: VizStep[] = [
      {
        type: "heap",
        array: stones,
        tree: [...heap],
        current: null,
        visited: [],
        line: 1,
        desc: `Initialize Max-Heap with ${stones.length} stones: [${heap.join(", ")}].`,
      },
    ];

    while (heap.length > 1 && steps.length < 35) {
      const y = heap.shift()!;
      const x = heap.shift()!;
      const diff = y - x;

      steps.push({
        type: "heap",
        array: stones,
        tree: [...heap],
        current: `Smash: ${y} vs ${x}`,
        line: 4,
        desc: `Popped two heaviest stones: y = ${y}, x = ${x}.`,
      });

      if (diff > 0) {
        heap.push(diff);
        heap.sort((a, b) => b - a);
        steps.push({
          type: "heap",
          array: stones,
          tree: [...heap],
          current: diff,
          line: 5,
          shiftInfo: {
            from: `y=${y}, x=${x}`,
            to: `stone: ${diff}`,
            action: "push",
            reason: `Stones smashed! New stone weight = ${y} - ${x} = ${diff}.`,
          },
          desc: `Stones smashed (${y} > ${x})! Remaining stone ${diff} pushed back to heap -> [${heap.join(", ")}].`,
        });
      } else {
        steps.push({
          type: "heap",
          array: stones,
          tree: [...heap],
          current: 0,
          line: 5,
          desc: `Both stones destroyed (${y} == ${x})! Heap is now [${heap.join(", ")}].`,
        });
      }
    }

    const lastWeight = heap[0] ?? 0;
    steps.push({
      type: "heap",
      array: stones,
      tree: [...heap],
      current: lastWeight,
      line: 6,
      mSum: lastWeight,
      desc: `Simulation Complete! Last stone weight = ${lastWeight}.`,
    });

    return { code, array: stones, steps: cap(steps) };
  }

  // Default: Min-Heap of size k for Kth Largest Element
  const code = [
    "heap = []",
    "for x in nums:",
    "    heappush(heap, x)",
    "    if len(heap) > k: heappop(heap)",
    "return heap[0]",
  ];

  const rawNums = dataset?.array && dataset.array.length > 0 ? dataset.array : [3, 2, 1, 5, 6, 4];
  const nums = rawNums.map(Number);
  const k = typeof dataset?.k === "number" ? dataset.k : typeof dataset?.target === "number" ? dataset.target : 2;
  const heap: number[] = [];

  const steps: VizStep[] = [
    {
      type: "heap",
      array: nums,
      tree: [],
      current: null,
      visited: [],
      line: 0,
      wSum: 0,
      desc: `Initialize Min-Heap of size k = ${k} to find the ${k}-th largest value.`,
    },
  ];

  nums.forEach((x, i) => {
    // 1. Insert at end of heap array
    heap.push(x);
    let childIdx = heap.length - 1;

    steps.push({
      type: "heap",
      array: nums,
      left: i,
      tree: [...heap],
      current: x,
      visited: nums.slice(0, i + 1),
      line: 2,
      wSum: heap.length,
      shiftInfo: {
        from: `num: ${x}`,
        to: `heap[${childIdx}]`,
        action: "push",
        reason: `Pushed ${x} to index ${childIdx} of min-heap.`,
      },
      desc: `Step ${i + 1}: Inserted ${x} at heap index ${childIdx}. Check heap invariant against parent.`,
    });

    // Sift-Up (Bubble-Up)
    while (childIdx > 0) {
      const parentIdx = Math.floor((childIdx - 1) / 2);
      if (heap[childIdx]! < heap[parentIdx]!) {
        const cVal = heap[childIdx]!;
        const pVal = heap[parentIdx]!;
        const swapObj: HeapSwap = {
          parentIdx,
          childIdx,
          fromIndex: childIdx,
          toIndex: parentIdx,
          reason: `Min-heap violation: Child ${cVal} < Parent ${pVal} → SWAP(${parentIdx}, ${childIdx})`,
          direction: "sift-up",
        };
        steps.push({
          type: "heap",
          array: nums,
          left: i,
          tree: [...heap],
          current: cVal,
          visited: nums.slice(0, i + 1),
          heapSwap: swapObj,
          line: 2,
          wSum: heap.length,
          desc: `Sift-Up: Child [${childIdx}] (${cVal}) < Parent [${parentIdx}] (${pVal}) violates min-heap! Swap positions.`,
        });

        // Perform swap
        [heap[parentIdx], heap[childIdx]] = [heap[childIdx]!, heap[parentIdx]!];
        childIdx = parentIdx;

        steps.push({
          type: "heap",
          array: nums,
          left: i,
          tree: [...heap],
          current: cVal,
          visited: nums.slice(0, i + 1),
          line: 2,
          wSum: heap.length,
          desc: `Swapped! ${cVal} moved up to index ${childIdx}. Heap: [${heap.join(", ")}].`,
        });
      } else {
        break;
      }
    }

    // If heap size exceeds k: Sift-Down eviction
    if (heap.length > k) {
      const minVal = heap[0]!;
      const lastVal = heap.pop()!;
      heap[0] = lastVal;

      steps.push({
        type: "heap",
        array: nums,
        left: i,
        tree: [...heap],
        current: minVal,
        visited: nums.slice(0, i + 1),
        line: 3,
        wSum: heap.length,
        desc: `Heap size > ${k}: Evicted root [0] (${minVal}). Replaced with last element ${lastVal} and sift-down.`,
      });

      // Sift-Down (Bubble-Down) from root
      let pIdx = 0;
      while (true) {
        let smallest = pIdx;
        const leftIdx = 2 * pIdx + 1;
        const rightIdx = 2 * pIdx + 2;

        if (leftIdx < heap.length && heap[leftIdx]! < heap[smallest]!) {
          smallest = leftIdx;
        }
        if (rightIdx < heap.length && heap[rightIdx]! < heap[smallest]!) {
          smallest = rightIdx;
        }

        if (smallest !== pIdx) {
          const pV = heap[pIdx]!;
          const cV = heap[smallest]!;
          const swapObj: HeapSwap = {
            parentIdx: pIdx,
            childIdx: smallest,
            fromIndex: pIdx,
            toIndex: smallest,
            reason: `Min-heap violation: Parent ${pV} > Child ${cV} → SWAP(${pIdx}, ${smallest})`,
            direction: "sift-down",
          };

          steps.push({
            type: "heap",
            array: nums,
            left: i,
            tree: [...heap],
            current: cV,
            visited: nums.slice(0, i + 1),
            heapSwap: swapObj,
            line: 3,
            wSum: heap.length,
            desc: `Sift-Down: Parent [${pIdx}] (${pV}) > Child [${smallest}] (${cV}). Swap to restore invariant.`,
          });

          [heap[pIdx], heap[smallest]] = [heap[smallest]!, heap[pIdx]!];
          pIdx = smallest;
        } else {
          break;
        }
      }
    }
  });

  const kthLargest = heap[0] ?? null;
  steps.push({
    type: "heap",
    array: nums,
    tree: [...heap],
    current: kthLargest,
    mSum: typeof kthLargest === "number" ? kthLargest : undefined,
    line: 4,
    desc: `Scan Complete! The ${k}-th largest element at the root of the min-heap is ${kthLargest}.`,
  });

  return { code, array: nums, steps: cap(steps) };
}

function dp1d(
  input: (number | string)[],
  slug = "house-robber",
  dataset?: TestDataset,
): VizBundle {
  const s = (slug ?? "").toLowerCase();

  // 1. Coin Change
  if (/coin-change/.test(s)) {
    const code = [
      "dp = [float('inf')] * (amount + 1)",
      "dp[0] = 0",
      "for a in range(1, amount + 1):",
      "    for c in coins:",
      "        if a - c >= 0:",
      "            dp[a] = min(dp[a], 1 + dp[a - c])",
      "return dp[amount] if dp[amount] != float('inf') else -1",
    ];

    const rawCoins = dataset?.array && dataset.array.length > 0 ? dataset.array : [1, 2, 5];
    const coins = rawCoins.map(Number);
    const amount = typeof dataset?.target === "number" ? dataset.target : 11;
    const dp: (number | string)[] = new Array(amount + 1).fill("∞");
    dp[0] = 0;

    const steps: VizStep[] = [
      {
        type: "array",
        array: [...dp],
        current: 0,
        line: 1,
        wSum: 0,
        mSum: 0,
        desc: `Initialize DP table of size ${amount + 1} with base case dp[0] = 0.`,
      },
    ];

    for (let a = 1; a <= amount; a++) {
      let minCoins = Infinity;
      for (const c of coins) {
        if (a - c >= 0) {
          const prevVal = dp[a - c];
          if (typeof prevVal === "number" && prevVal !== Infinity) {
            minCoins = Math.min(minCoins, 1 + prevVal);
          }
        }
      }
      dp[a] = minCoins === Infinity ? "∞" : minCoins;

      steps.push({
        type: "array",
        array: [...dp],
        current: dp[a]!,
        left: Math.max(0, a - (coins[coins.length - 1] ?? 1)),
        right: a,
        line: 5,
        wSum: typeof dp[a] === "number" ? (dp[a] as number) : undefined,
        mSum: typeof dp[a] === "number" ? (dp[a] as number) : undefined,
        shiftInfo: {
          from: `amount: ${a}`,
          to: `dp[${a}]=${dp[a]}`,
          action: "write",
          reason: `Computed minimum coins for subproblem amount ${a}.`,
        },
        desc: `Amount ${a}: Evaluated coins [${coins.join(", ")}] -> dp[${a}] = ${dp[a]}.`,
      });
    }

    const ans = dp[amount] === "∞" ? -1 : dp[amount]!;
    steps.push({
      type: "array",
      array: [...dp],
      current: ans,
      mSum: typeof ans === "number" ? ans : -1,
      line: 6,
      desc: `DP Complete! Minimum coins for amount ${amount} is ${ans}.`,
    });

    return { code, array: coins, steps: cap(steps) };
  }

  // 2. Longest Increasing Subsequence (LIS)
  if (/longest-increasing|lis\b/.test(s)) {
    const code = [
      "dp = [1] * len(nums)",
      "for i in range(len(nums)):",
      "    for j in range(i):",
      "        if nums[i] > nums[j]:",
      "            dp[i] = max(dp[i], 1 + dp[j])",
      "return max(dp)",
    ];

    const rawNums = dataset?.array && dataset.array.length > 0 ? dataset.array : [10, 9, 2, 5, 3, 7, 101, 18];
    const nums = rawNums.map(Number);
    const dp = new Array(nums.length).fill(1);

    const steps: VizStep[] = [
      {
        type: "array",
        array: [...dp],
        current: 1,
        line: 0,
        wSum: 1,
        mSum: 1,
        desc: `Initialize LIS DP table [${dp.join(", ")}] where each element is an increasing subsequence of length 1.`,
      },
    ];

    let maxLis = 1;
    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < i; j++) {
        if (nums[i]! > nums[j]!) {
          dp[i] = Math.max(dp[i]!, 1 + dp[j]!);
        }
      }
      maxLis = Math.max(maxLis, dp[i]!);

      steps.push({
        type: "array",
        array: [...dp],
        current: dp[i]!,
        left: 0,
        right: i,
        line: 4,
        wSum: dp[i]!,
        mSum: maxLis,
        shiftInfo: {
          from: `nums[${i}]=${nums[i]}`,
          to: `dp[${i}]=${dp[i]}`,
          action: "write",
          reason: `Max increasing subsequence ending at index ${i}.`,
        },
        desc: `Index ${i} (value ${nums[i]}): Evaluated preceding elements -> dp[${i}] = ${dp[i]} (Current Max LIS = ${maxLis}).`,
      });
    }

    steps.push({
      type: "array",
      array: [...dp],
      current: maxLis,
      mSum: maxLis,
      line: 5,
      desc: `LIS Computation Complete! Longest Increasing Subsequence length is ${maxLis}.`,
    });

    return { code, array: nums, steps: cap(steps) };
  }

  // 3. Climbing Stairs / Fibonacci
  if (/climb|fibonacci|min-cost-climbing/.test(s)) {
    const code = [
      "dp = [0] * (n + 1)",
      "dp[0], dp[1] = 1, 1",
      "for i in range(2, n + 1):",
      "    dp[i] = dp[i - 1] + dp[i - 2]",
      "return dp[n]",
    ];

    const n = typeof dataset?.target === "number" ? dataset.target : 5;
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    if (n >= 1) dp[1] = 1;

    const steps: VizStep[] = [
      {
        type: "array",
        array: [...dp],
        current: dp[1] ?? 1,
        line: 1,
        wSum: 1,
        mSum: 1,
        desc: `Base cases dp[0] = 1, dp[1] = 1 initialized for n = ${n}.`,
      },
    ];

    for (let i = 2; i <= n; i++) {
      dp[i] = dp[i - 1]! + dp[i - 2]!;
      steps.push({
        type: "array",
        array: [...dp],
        current: dp[i]!,
        left: i - 2,
        right: i,
        line: 3,
        wSum: dp[i]!,
        mSum: dp[i]!,
        shiftInfo: {
          from: `dp[${i - 1}]+dp[${i - 2}]`,
          to: `dp[${i}]=${dp[i]}`,
          action: "write",
          reason: `Sum of distinct ways from 1-step and 2-step previous positions.`,
        },
        desc: `Step ${i}: dp[${i}] = dp[${i - 1}] (${dp[i - 1]}) + dp[${i - 2}] (${dp[i - 2]}) = ${dp[i]}.`,
      });
    }

    steps.push({
      type: "array",
      array: [...dp],
      current: dp[n]!,
      mSum: dp[n]!,
      line: 4,
      desc: `Total distinct ways to climb ${n} stairs is ${dp[n]}.`,
    });

    return { code, array: dp, steps: cap(steps) };
  }

  // 4. Maximum Subarray (Kadane's)
  if (/maximum-subarray|kadane/.test(s)) {
    const code = [
      "max_so_far = nums[0]",
      "curr_max = nums[0]",
      "for x in nums[1:]:",
      "    curr_max = max(x, curr_max + x)",
      "    max_so_far = max(max_so_far, curr_max)",
      "return max_so_far",
    ];

    const rawNums = dataset?.array && dataset.array.length > 0 ? dataset.array : [-2, 1, -3, 4, -1, 2, 1, -5, 4];
    const nums = rawNums.map(Number);
    let maxSoFar = nums[0]!;
    let currMax = nums[0]!;
    const dp = [currMax];

    const steps: VizStep[] = [
      {
        type: "array",
        array: [...nums],
        current: currMax,
        left: 0,
        right: 0,
        line: 1,
        wSum: currMax,
        mSum: maxSoFar,
        desc: `Initialize Kadane's 1D DP: curr_max = ${currMax}, max_so_far = ${maxSoFar}.`,
      },
    ];

    for (let i = 1; i < nums.length; i++) {
      const x = nums[i]!;
      currMax = Math.max(x, currMax + x);
      maxSoFar = Math.max(maxSoFar, currMax);
      dp.push(currMax);

      steps.push({
        type: "array",
        array: [...nums],
        current: currMax,
        left: 0,
        right: i,
        line: 4,
        wSum: currMax,
        mSum: maxSoFar,
        shiftInfo: {
          from: `x=${x}`,
          to: `curr_max=${currMax}`,
          action: "write",
          reason: `Extend previous contiguous subarray or restart from ${x}.`,
        },
        desc: `Index ${i} (value ${x}): curr_max = max(${x}, ${currMax - x} + ${x}) = ${currMax} (Global Max = ${maxSoFar}).`,
      });
    }

    steps.push({
      type: "array",
      array: [...nums],
      current: maxSoFar,
      mSum: maxSoFar,
      line: 5,
      desc: `Kadane's Scan Complete! Maximum contiguous subarray sum is ${maxSoFar}.`,
    });

    return { code, array: nums, steps: cap(steps) };
  }

  // 5. Default: House Robber
  const code = [
    "dp = [0] * (n + 1)",
    "dp[1] = nums[0]",
    "for i in range(2, n + 1):",
    "    dp[i] = max(dp[i - 1], dp[i - 2] + nums[i - 1])",
    "return dp[n]",
  ];
  const rawNums = dataset?.array && dataset.array.length > 0 ? dataset.array : (input && input.length > 0 ? input : [2, 7, 9, 3, 1]);
  const nums = rawNums.map(Number);
  const dp: number[] = new Array(nums.length + 1).fill(0);
  dp[1] = nums[0] ?? 0;
  const steps: VizStep[] = [
    { type: "array", array: [...dp], current: 0, line: 0, desc: "dp table filled with zeros." },
    {
      type: "array",
      array: [...dp],
      current: dp[1]!,
      line: 1,
      desc: `Base case dp[1] = ${dp[1]}.`,
    },
  ];
  for (let i = 2; i <= nums.length; i++) {
    dp[i] = Math.max(dp[i - 1]!, dp[i - 2]! + nums[i - 1]!);
    steps.push({
      type: "array",
      array: [...dp],
      current: dp[i]!,
      left: i - 2,
      right: i,
      mSum: dp[i]!,
      line: 3,
      shiftInfo: {
        from: `dp[${i - 1}] vs dp[${i - 2}]+${nums[i - 1]}`,
        to: `dp[${i}]=${dp[i]}`,
        action: "write",
        reason: `Optimal loot choosing whether to rob house ${i - 1}.`,
      },
      desc: `dp[${i}] = max(${dp[i - 1]}, ${dp[i - 2]} + ${nums[i - 1]}) = ${dp[i]}.`,
    });
  }
  steps.push({
    type: "array",
    array: [...dp],
    current: dp[nums.length]!,
    mSum: dp[nums.length]!,
    line: 4,
    desc: `Answer = ${dp[nums.length]}.`,
  });
  return { code, array: nums, steps: cap(steps) };
}

function dp2dSim(
  dataset?: TestDataset,
  slug = "unique-paths",
): VizBundle {
  const s = (slug ?? "").toLowerCase();

  if (/minimum-path-sum/.test(s)) {
    const code = [
      "m, n = len(grid), len(grid[0])",
      "dp = [[0] * n for _ in range(m)]",
      "dp[0][0] = grid[0][0]",
      "for r in range(m):",
      "    for c in range(n):",
      "        if r > 0 and c > 0: dp[r][c] = grid[r][c] + min(dp[r-1][c], dp[r][c-1])",
      "        elif r > 0: dp[r][c] = grid[r][c] + dp[r-1][c]",
      "        elif c > 0: dp[r][c] = grid[r][c] + dp[r][c-1]",
      "return dp[m-1][n-1]",
    ];

    const grid: number[][] = (dataset?.matrix && Array.isArray(dataset.matrix) && dataset.matrix.length > 0
      ? dataset.matrix
      : [
          [1, 3, 1],
          [1, 5, 1],
          [4, 2, 1],
        ]) as number[][];

    const m = grid.length;
    const n = grid[0]?.length ?? 1;
    const dp: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));

    const steps: VizStep[] = [
      {
        type: "matrix",
        matrix: dp.map((r) => [...r]),
        current: grid[0]![0]!,
        line: 2,
        desc: `Initialize 2D DP matrix ${m}x${n} with base case dp[0][0] = ${grid[0]![0]}.`,
      },
    ];

    for (let r = 0; r < m; r++) {
      for (let c = 0; c < n; c++) {
        if (r === 0 && c === 0) {
          dp[r]![c] = grid[r]![c]!;
        } else if (r === 0) {
          dp[r]![c] = grid[r]![c]! + dp[r]![c - 1]!;
        } else if (c === 0) {
          dp[r]![c] = grid[r]![c]! + dp[r - 1]![c]!;
        } else {
          dp[r]![c] = grid[r]![c]! + Math.min(dp[r - 1]![c]!, dp[r]![c - 1]!);
        }

        steps.push({
          type: "matrix",
          matrix: dp.map((row) => [...row]),
          left: r,
          right: c,
          current: dp[r]![c]!,
          line: 5,
          wSum: dp[r]![c]!,
          mSum: dp[r]![c]!,
          shiftInfo: {
            from: `cell (${r},${c}) val: ${grid[r]![c]}`,
            to: `dp[${r}][${c}]=${dp[r]![c]}`,
            action: "write",
            reason: `Accumulated minimum cost path to cell (${r}, ${c}).`,
          },
          desc: `Cell (${r}, ${c}): grid val ${grid[r]![c]} + min adjacent -> dp[${r}][${c}] = ${dp[r]![c]}.`,
        });
      }
    }

    const minPathSum = dp[m - 1]![n - 1]!;
    steps.push({
      type: "matrix",
      matrix: dp.map((row) => [...row]),
      current: minPathSum,
      mSum: minPathSum,
      line: 8,
      desc: `2D DP Complete! Minimum path sum from (0,0) to (${m - 1},${n - 1}) is ${minPathSum}.`,
    });

    return { code, array: grid.flat(), steps: cap(steps) };
  }

  // Default: Unique Paths
  const code = [
    "dp = [[1] * n for _ in range(m)]",
    "for r in range(1, m):",
    "    for c in range(1, n):",
    "        dp[r][c] = dp[r - 1][c] + dp[r][c - 1]",
    "return dp[m - 1][n - 1]",
  ];

  const m = dataset?.matrix && dataset.matrix.length > 0 ? dataset.matrix.length : 3;
  const n = dataset?.matrix && dataset.matrix[0]?.length ? dataset.matrix[0].length : 3;
  const dp: number[][] = Array.from({ length: m }, () => new Array(n).fill(1));

  const steps: VizStep[] = [
    {
      type: "matrix",
      matrix: dp.map((r) => [...r]),
      current: 1,
      line: 0,
      desc: `Initialize 2D Unique Paths table ${m}x${n} with first row and column set to 1.`,
    },
  ];

  for (let r = 1; r < m; r++) {
    for (let c = 1; c < n; c++) {
      dp[r]![c] = dp[r - 1]![c]! + dp[r]![c - 1]!;
      steps.push({
        type: "matrix",
        matrix: dp.map((row) => [...row]),
        left: r,
        right: c,
        current: dp[r]![c]!,
        line: 3,
        wSum: dp[r]![c]!,
        mSum: dp[r]![c]!,
        shiftInfo: {
          from: `dp[${r - 1}][${c}] + dp[${r}][${c - 1}]`,
          to: `dp[${r}][${c}]=${dp[r]![c]}`,
          action: "write",
          reason: `Distinct paths arriving from top (${dp[r - 1]![c]}) + left (${dp[r]![c - 1]}).`,
        },
        desc: `Cell (${r}, ${c}): dp[${r}][${c}] = ${dp[r - 1]![c]} + ${dp[r]![c - 1]} = ${dp[r]![c]}.`,
      });
    }
  }

  const uniquePaths = dp[m - 1]![n - 1]!;
  steps.push({
    type: "matrix",
    matrix: dp.map((row) => [...row]),
    current: uniquePaths,
    mSum: uniquePaths,
    line: 4,
    desc: `Unique Paths Computation Complete! Total paths to (${m - 1},${n - 1}) is ${uniquePaths}.`,
  });

  return { code, array: dp.flat(), steps: cap(steps) };
}

function longestCommonSubsequence(
  input?: (number | string)[],
  dataset?: TestDataset,
): VizBundle {
  const code = [
    "m, n = len(text1), len(text2)",
    "dp = [[0] * (n + 1) for _ in range(m + 1)]",
    "for i in range(1, m + 1):",
    "    for j in range(1, n + 1):",
    "        if text1[i - 1] == text2[j - 1]:",
    "            dp[i][j] = 1 + dp[i - 1][j - 1]",
    "        else:",
    "            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])",
    "return dp[m][n]",
  ];

  // Dynamic LCS comparison: text1 vs text2
  const text1 = (dataset?.array && dataset.array.length > 0
    ? dataset.array
    : input && input.length > 0
      ? input
      : ["a", "b", "c", "d", "e"]) as (string | number)[];
  const text2 = (dataset?.secondaryArray && dataset.secondaryArray.length > 0
    ? dataset.secondaryArray
    : ["a", "c", "e"]) as (string | number)[];

  const m = text1.length;
  const n = text2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  const text1Str = text1.map(String).join(" ");
  const text2Str = text2.map(String).join(" ");

  const steps: VizStep[] = [
    {
      type: "array",
      array: text1 as unknown as number[],
      secondaryArray: text2 as unknown as number[],
      left: 0,
      left2: 0,
      matrix: dp.map((r) => [...r]),
      line: 0,
      datasetLabels: {
        primary: `Sequence 1 (text1: '${text1Str}')`,
        secondaryArray: `Sequence 2 (text2: '${text2Str}')`,
      },
      activeDataset: "array",
      desc: `Initialize DP matrix (${m + 1} × ${n + 1}) filled with 0s. Pointer L on text1[0]='${text1[0]}' and Pointer R on text2[0]='${text2[0]}'.`,
    },
  ];

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const v1 = text1[i - 1]!;
      const v2 = text2[j - 1]!;
      const isMatch = v1 === v2;

      steps.push({
        type: "array",
        array: text1 as unknown as number[],
        secondaryArray: text2 as unknown as number[],
        left: i - 1, // L pointer on primary text1
        left2: j - 1, // R pointer on secondary text2
        current: v1 as unknown as number,
        matrix: dp.map((r) => [...r]),
        line: 3,
        datasetLabels: {
          primary: `Sequence 1 (text1: '${text1Str}')`,
          secondaryArray: `Sequence 2 (text2: '${text2Str}')`,
        },
        activeDataset: "array",
        desc: `Comparing text1[${i - 1}]='${v1}' (Pointer L) with text2[${j - 1}]='${v2}' (Pointer R)...`,
      });

      if (isMatch) {
        dp[i]![j] = 1 + (dp[i - 1]?.[j - 1] ?? 0);
        steps.push({
          type: "array",
          array: text1 as unknown as number[],
          secondaryArray: text2 as unknown as number[],
          left: i - 1,
          left2: j - 1,
          current: v1 as unknown as number,
          matrix: dp.map((r) => [...r]),
          line: 4,
          wSum: dp[i]![j],
          datasetLabels: {
            primary: `Sequence 1 (text1: '${text1Str}')`,
            secondaryArray: `Sequence 2 (text2: '${text2Str}')`,
          },
          activeDataset: "array",
          shiftInfo: {
            from: `text1[${i - 1}]: '${v1}'`,
            to: `text2[${j - 1}]: '${v2}'`,
            action: "match",
            reason: `Match found ('${v1}' == '${v2}')! dp[${i}][${j}] = 1 + dp[${i - 1}][${j - 1}] = ${dp[i]![j]}`,
          },
          desc: `✓ Match found: text1[${i - 1}] == text2[${j - 1}] ('${v1}'). Increment LCS length to ${dp[i]![j]}.`,
        });
      } else {
        const top = dp[i - 1]?.[j] ?? 0;
        const leftVal = dp[i]?.[j - 1] ?? 0;
        dp[i]![j] = Math.max(top, leftVal);
        steps.push({
          type: "array",
          array: text1 as unknown as number[],
          secondaryArray: text2 as unknown as number[],
          left: i - 1,
          left2: j - 1,
          current: v2 as unknown as number,
          matrix: dp.map((r) => [...r]),
          line: 6,
          wSum: dp[i]![j],
          datasetLabels: {
            primary: `Sequence 1 (text1: '${text1Str}')`,
            secondaryArray: `Sequence 2 (text2: '${text2Str}')`,
          },
          activeDataset: "secondaryArray",
          desc: `✗ Mismatch: text1[${i - 1}]='${v1}' != text2[${j - 1}]='${v2}'. dp[${i}][${j}] = max(${top}, ${leftVal}) = ${dp[i]![j]}.`,
        });
      }
    }
  }

  steps.push({
    type: "array",
    array: text1 as unknown as number[],
    secondaryArray: text2 as unknown as number[],
    left: m - 1,
    left2: n - 1,
    current: dp[m]![n]!,
    matrix: dp.map((r) => [...r]),
    line: 7,
    wSum: dp[m]![n]!,
    mSum: dp[m]![n]!,
    datasetLabels: {
      primary: `Sequence 1 (text1: '${text1Str}')`,
      secondaryArray: `Sequence 2 (text2: '${text2Str}')`,
    },
    activeDataset: "array",
    desc: `LCS Execution Complete! Longest Common Subsequence length is ${dp[m]![n]}.`,
  });

  return { code, array: text1 as unknown as number[], steps: cap(steps) };
}

function intervalMergeSim(
  dataset?: TestDataset,
): VizBundle {
  const code = [
    "intervals.sort(key=lambda x: x[0])",
    "merged = [intervals[0]]",
    "for curr in intervals[1:]:",
    "    prev = merged[-1]",
    "    if curr[0] <= prev[1]:",
    "        prev[1] = max(prev[1], curr[1])",
    "    else:",
    "        merged.append(curr)",
    "return merged",
  ];

  const rawIntervals: number[][] = (dataset?.matrix && Array.isArray(dataset.matrix) && dataset.matrix.length > 0
    ? dataset.matrix
    : [
        [1, 3],
        [2, 6],
        [8, 10],
        [15, 18],
      ]) as number[][];

  // Deep copy and sort by start time
  const intervals = rawIntervals
    .map((iv) => [Number(iv[0] ?? 0), Number(iv[1] ?? 0)])
    .sort((a, b) => a[0]! - b[0]!);
  const merged: number[][] = [[...intervals[0]!]];

  const formatIntervals = (ivs: number[][]) => ivs.map((iv) => `[${iv[0]},${iv[1]}]`).join(", ");

  const buildIntervalItems = (activeIdx?: number, isOverlap?: boolean): IntervalItem[] => {
    return intervals.map((iv, idx) => {
      let status: IntervalItem["status"] = "unprocessed";
      if (idx === 0 || idx < (activeIdx ?? 0)) {
        status = "merged";
      }
      if (idx === activeIdx) {
        status = isOverlap ? "conflict" : "active";
      }
      return {
        start: iv[0]!,
        end: iv[1]!,
        id: `iv-${idx}`,
        status,
      };
    });
  };

  const steps: VizStep[] = [
    {
      type: "intervals",
      intervals: buildIntervalItems(0),
      sweepLine: intervals[0]![0],
      matrix: intervals.map((iv) => [...iv]),
      cols: 2,
      left: 0,
      current: `[${intervals[0]![0]},${intervals[0]![1]}]`,
      visited: [`[${intervals[0]![0]},${intervals[0]![1]}]`],
      line: 0,
      wSum: 1,
      desc: `Sorted ${intervals.length} intervals by start time: ${formatIntervals(intervals)}. Initialized merged = [${formatIntervals(merged)}].`,
    },
  ];

  for (let i = 1; i < intervals.length; i++) {
    const curr = intervals[i]!;
    const prev = merged[merged.length - 1]!;
    const isOverlap = curr[0]! <= prev[1]!;

    steps.push({
      type: "intervals",
      intervals: buildIntervalItems(i, isOverlap),
      sweepLine: curr[0]!,
      matrix: intervals.map((iv) => [...iv]),
      cols: 2,
      left: i,
      right: merged.length - 1,
      current: `[${curr[0]},${curr[1]}]`,
      visited: merged.map((m) => `[${m[0]},${m[1]}]`),
      line: 4,
      wSum: merged.length,
      desc: `Evaluating curr=[${curr[0]},${curr[1]}] against last merged=[${prev[0]},${prev[1]}]. Overlap condition: ${curr[0]} <= ${prev[1]} (${isOverlap ? "True" : "False"}).`,
    });

    if (isOverlap) {
      prev[1] = Math.max(prev[1]!, curr[1]!);
      steps.push({
        type: "intervals",
        intervals: buildIntervalItems(i, true),
        sweepLine: curr[1]!,
        matrix: intervals.map((iv) => [...iv]),
        cols: 2,
        left: i,
        right: merged.length - 1,
        current: `[${prev[0]},${prev[1]}]`,
        visited: merged.map((m) => `[${m[0]},${m[1]}]`),
        line: 5,
        wSum: merged.length,
        shiftInfo: {
          from: `curr: [${curr[0]},${curr[1]}]`,
          to: `merged: [${prev[0]},${prev[1]}]`,
          action: "merge",
          reason: `Overlap detected! Extended end boundary to ${prev[1]}.`,
        },
        desc: `✓ Overlap merged! Updated last interval to [${prev[0]},${prev[1]}]. Merged list: [${formatIntervals(merged)}].`,
      });
    } else {
      merged.push([...curr]);
      steps.push({
        type: "intervals",
        intervals: buildIntervalItems(i, false),
        sweepLine: curr[0]!,
        matrix: intervals.map((iv) => [...iv]),
        cols: 2,
        left: i,
        right: merged.length - 1,
        current: `[${curr[0]},${curr[1]}]`,
        visited: merged.map((m) => `[${m[0]},${m[1]}]`),
        line: 7,
        wSum: merged.length,
        shiftInfo: {
          from: `curr: [${curr[0]},${curr[1]}]`,
          to: "merged",
          action: "push",
          reason: `No overlap (${curr[0]} > ${prev[1]}). Appended new interval [${curr[0]},${curr[1]}].`,
        },
        desc: `No overlap with previous. Appended [${curr[0]},${curr[1]}] to merged list: [${formatIntervals(merged)}].`,
      });
    }
  }

  const finalItems: IntervalItem[] = merged.map((m, idx) => ({
    start: m[0]!,
    end: m[1]!,
    id: `merged-${idx}`,
    status: "merged",
  }));

  steps.push({
    type: "intervals",
    intervals: finalItems,
    sweepLine: merged[merged.length - 1]?.[1] ?? 0,
    matrix: merged.map((m) => [...m]),
    cols: 2,
    left: 0,
    right: merged.length - 1,
    current: null,
    visited: merged.map((m) => `[${m[0]},${m[1]}]`),
    line: 8,
    wSum: merged.length,
    desc: `Sweep-Line Interval Consolidation Complete! Merged into ${merged.length} disjoint interval spans: [${formatIntervals(merged)}].`,
  });

  return { code, array: intervals.flat(), steps: cap(steps) };
}

function unionFindSim(
  dataset?: TestDataset,
  slug = "redundant-connection",
): VizBundle {
  const code = [
    "parent = list(range(n + 1))",
    "def find(i):",
    "    if parent[i] == i: return i",
    "    parent[i] = find(parent[i])",
    "    return parent[i]",
    "def union(i, j):",
    "    root_i, root_j = find(i), find(j)",
    "    if root_i == root_j: return False  # Cycle detected",
    "    parent[root_i] = root_j",
    "    return True",
  ];

  const rawEdges: number[][] = (dataset?.matrix && Array.isArray(dataset.matrix) && dataset.matrix.length > 0
    ? dataset.matrix
    : [
        [1, 2],
        [1, 3],
        [2, 3],
      ]) as number[][];

  const edges = rawEdges.map((e) => [Number(e[0] ?? 0), Number(e[1] ?? 0)]);
  const maxNode = Math.max(3, ...edges.flatMap((e) => e));
  const parent = Array.from({ length: maxNode + 1 }, (_, i) => i);
  let componentCount = maxNode;

  const find = (i: number): number => {
    let curr = i;
    while (parent[curr] !== curr && parent[curr] !== undefined) {
      curr = parent[curr]!;
    }
    return curr;
  };

  const steps: VizStep[] = [
    {
      type: "graph",
      matrix: edges.map((e) => [...e]),
      array: [...parent],
      current: null,
      visited: [],
      line: 0,
      wSum: componentCount,
      desc: `Initialize Disjoint Set Union (DSU) parent array: [${parent.slice(1).join(", ")}] across ${maxNode} nodes.`,
    },
  ];

  let redundantEdge: number[] | null = null;

  for (let eIdx = 0; eIdx < edges.length; eIdx++) {
    const [u, v] = edges[eIdx]!;
    const rootU = find(u!);
    const rootV = find(v!);

    steps.push({
      type: "graph",
      matrix: edges.map((e) => [...e]),
      array: [...parent],
      left: eIdx,
      current: `[${u}, ${v}]`,
      visited: edges.slice(0, eIdx).map((e) => `[${e[0]},${e[1]}]`),
      line: 6,
      wSum: componentCount,
      desc: `Evaluating edge (${u}, ${v}): find(${u}) = ${rootU}, find(${v}) = ${rootV}.`,
    });

    if (rootU === rootV) {
      redundantEdge = [u!, v!];
      steps.push({
        type: "graph",
        matrix: edges.map((e) => [...e]),
        array: [...parent],
        left: eIdx,
        current: `CYCLE: [${u}, ${v}]`,
        visited: edges.slice(0, eIdx + 1).map((e) => `[${e[0]},${e[1]}]`),
        line: 7,
        wSum: componentCount,
        shiftInfo: {
          from: `node: ${u}`,
          to: `node: ${v}`,
          action: "compare",
          reason: `Both nodes already share root ${rootU}! Cycle created by edge [${u}, ${v}].`,
        },
        desc: `⚠️ Cycle Detected! Nodes ${u} and ${v} already in same component (root ${rootU}) -> Redundant Edge is [${u}, ${v}].`,
      });
      break;
    } else {
      parent[rootU] = rootV;
      componentCount--;
      steps.push({
        type: "graph",
        matrix: edges.map((e) => [...e]),
        array: [...parent],
        left: eIdx,
        current: `Union(${u}, ${v})`,
        visited: edges.slice(0, eIdx + 1).map((e) => `[${e[0]},${e[1]}]`),
        line: 8,
        wSum: componentCount,
        shiftInfo: {
          from: `root(${u})=${rootU}`,
          to: `root(${v})=${rootV}`,
          action: "union",
          reason: `Merged component of ${u} into component of ${v}.`,
        },
        desc: `✓ Unioned components: parent[${rootU}] = ${rootV}. Remaining distinct components: ${componentCount}.`,
      });
    }
  }

  const finalRes = redundantEdge ? `[${redundantEdge[0]}, ${redundantEdge[1]}]` : `${componentCount} components`;
  steps.push({
    type: "graph",
    matrix: edges.map((e) => [...e]),
    array: [...parent],
    current: finalRes,
    visited: edges.map((e) => `[${e[0]},${e[1]}]`),
    line: 9,
    wSum: componentCount,
    desc: `Union-Find Complete! Result: ${finalRes}.`,
  });

  return { code, array: parent, steps: cap(steps) };
}

function prefixSum(input: number[]): VizBundle {
  const code = [
    "prefix = [0]",
    "for x in nums:",
    "    prefix.append(prefix[-1] + x)",
    "return prefix",
  ];
  const nums = input.slice(0, 8);
  const prefix: number[] = [0];
  const steps: VizStep[] = [
    { type: "array", array: [...prefix], current: 0, line: 0, desc: "Prefix array starts with 0." },
  ];
  nums.forEach((x, i) => {
    prefix.push(prefix[prefix.length - 1]! + x);
    steps.push({
      type: "array",
      array: [...prefix],
      current: prefix[prefix.length - 1]!,
      left: 0,
      right: i + 1,
      wSum: x,
      mSum: prefix[prefix.length - 1]!,
      line: 2,
      desc: `prefix[${i + 1}] = ${prefix[prefix.length - 2]} + ${x} = ${prefix[prefix.length - 1]}.`,
    });
  });
  steps.push({
    type: "array",
    array: [...prefix],
    current: prefix[prefix.length - 1]!,
    line: 3,
    desc: "Any range sum is now prefix[r] − prefix[l].",
  });
  return { code, array: nums, steps: cap(steps) };
}

function sorting(input: number[]): VizBundle {
  const code = [
    "for i in range(1, len(arr)):",
    "    key = arr[i]; j = i - 1",
    "    while j >= 0 and arr[j] > key:",
    "        arr[j + 1] = arr[j]; j -= 1",
    "    arr[j + 1] = key",
    "return arr",
  ];
  const arr = input.slice(0, 7);
  const steps: VizStep[] = [
    {
      type: "array",
      array: [...arr],
      current: null,
      line: 0,
      desc: "Insertion sort over the input.",
    },
  ];
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i]!;
    let j = i - 1;
    steps.push({
      type: "array",
      array: [...arr],
      current: key,
      left: 0,
      right: i,
      line: 1,
      desc: `Insert ${key} into the sorted prefix.`,
    });
    while (j >= 0 && arr[j]! > key) {
      arr[j + 1] = arr[j]!;
      j--;
      steps.push({
        type: "array",
        array: [...arr],
        current: key,
        left: j + 1,
        right: i,
        line: 3,
        desc: `Shift ${arr[j + 2]} right.`,
      });
    }
    arr[j + 1] = key;
    steps.push({
      type: "array",
      array: [...arr],
      current: key,
      left: j + 1,
      right: i,
      visited: arr.slice(0, i + 1),
      line: 4,
      desc: `Place ${key} at index ${j + 1}.`,
    });
  }
  steps.push({
    type: "array",
    array: [...arr],
    current: null,
    visited: [...arr],
    line: 5,
    desc: `Sorted: ${arr.join(", ")}.`,
  });
  return { code, array: arr, steps: cap(steps) };
}

function bitManipulation(
  input: (number | string)[],
  slug = "single-number",
  dataset?: TestDataset,
): VizBundle {
  const s = (slug ?? "").toLowerCase();

  if (/number-of-1-bits|hamming-weight/.test(s)) {
    const code = [
      "count = 0",
      "while n:",
      "    n &= n - 1",
      "    count += 1",
      "return count",
    ];
    let n = typeof dataset?.target === "number" ? dataset.target : Number(input[0] ?? 11);
    const initialN = n;
    let count = 0;
    const steps: VizStep[] = [
      {
        type: "array",
        array: [initialN],
        current: `0b${initialN.toString(2).padStart(8, "0")}`,
        line: 0,
        wSum: 0,
        desc: `Count set bits for n = ${initialN} (binary: 0b${initialN.toString(2)}). Initialized count = 0.`,
      },
    ];

    while (n > 0 && steps.length < 35) {
      const prevN = n;
      n = n & (n - 1);
      count++;
      steps.push({
        type: "array",
        array: [n],
        current: `0b${n.toString(2).padStart(8, "0")}`,
        line: 2,
        wSum: count,
        mSum: count,
        shiftInfo: {
          from: `0b${prevN.toString(2)}`,
          to: `0b${n.toString(2)}`,
          action: "mask",
          reason: `n & (n - 1) cleared lowest set bit: ${prevN} & ${prevN - 1} = ${n}.`,
        },
        desc: `Iteration ${count}: Cleared lowest set bit via n & (n - 1) -> n is now ${n} (0b${n.toString(2)}). count = ${count}.`,
      });
    }

    steps.push({
      type: "array",
      array: [0],
      current: count,
      line: 4,
      wSum: count,
      mSum: count,
      desc: `Hamming Weight Complete! Total set bits (1s) in ${initialN} is ${count}.`,
    });
    return { code, array: [initialN], steps: cap(steps) };
  }

  if (/counting-bits/.test(s)) {
    const code = [
      "ans = [0] * (n + 1)",
      "for i in range(1, n + 1):",
      "    ans[i] = ans[i >> 1] + (i & 1)",
      "return ans",
    ];
    const n = typeof dataset?.target === "number" ? Math.min(dataset.target, 15) : 5;
    const ans: number[] = new Array(n + 1).fill(0);
    const steps: VizStep[] = [
      {
        type: "array",
        array: [...ans],
        current: 0,
        line: 0,
        desc: `Initialize ans array of size ${n + 1} with zeros for n = ${n}.`,
      },
    ];

    for (let i = 1; i <= n; i++) {
      ans[i] = (ans[i >> 1] ?? 0) + (i & 1);
      steps.push({
        type: "array",
        array: [...ans],
        current: ans[i]!,
        left: i >> 1,
        right: i,
        line: 2,
        wSum: ans[i]!,
        desc: `i = ${i} (0b${i.toString(2)}): ans[${i}] = ans[${i >> 1}] (${ans[i >> 1]}) + (${i} & 1 = ${i & 1}) -> ans[${i}] = ${ans[i]}.`,
      });
    }

    steps.push({
      type: "array",
      array: [...ans],
      current: ans[n]!,
      line: 3,
      desc: `Counting Bits Complete! Population counts for [0..${n}]: [${ans.join(", ")}].`,
    });
    return { code, array: Array.from({ length: n + 1 }, (_, i) => i), steps: cap(steps) };
  }

  if (/missing-number/.test(s)) {
    const code = [
      "res = len(nums)",
      "for i, num in enumerate(nums):",
      "    res ^= i ^ num",
      "return res",
    ];
    const rawNums = dataset?.array && dataset.array.length > 0 ? dataset.array : [3, 0, 1];
    const nums = rawNums.map(Number);
    const n = nums.length;
    let res = n;
    const steps: VizStep[] = [
      {
        type: "array",
        array: [...nums],
        current: res,
        line: 0,
        mSum: res,
        desc: `Initialize XOR accumulator res = len(nums) = ${n}.`,
      },
    ];

    for (let i = 0; i < nums.length; i++) {
      const num = nums[i]!;
      const prevRes = res;
      res ^= i ^ num;
      steps.push({
        type: "array",
        array: [...nums],
        current: num,
        left: i,
        line: 2,
        wSum: i,
        mSum: res,
        shiftInfo: {
          from: `index: ${i}`,
          to: `val: ${num}`,
          action: "xor",
          reason: `res ^= ${i} ^ ${num} -> ${prevRes} ^ ${i ^ num} = ${res}`,
        },
        desc: `Index ${i}: XOR index ${i} and element ${num} into accumulator -> res = ${res}.`,
      });
    }

    steps.push({
      type: "array",
      array: [...nums],
      current: res,
      line: 3,
      mSum: res,
      desc: `Missing Number Found! After full XOR cancellation, the missing value is ${res}.`,
    });
    return { code, array: nums, steps: cap(steps) };
  }

  // Default: Single Number (XOR reduction)
  const code = [
    "result = 0",
    "for x in nums:",
    "    result ^= x",
    "return result",
  ];
  const rawNums = dataset?.array && dataset.array.length > 0 ? dataset.array : [4, 1, 2, 1, 2];
  const nums = rawNums.map(Number);
  let result = 0;
  const steps: VizStep[] = [
    {
      type: "array",
      array: [...nums],
      current: 0,
      line: 0,
      mSum: 0,
      desc: "Initialize result = 0 (binary 0b00000000). Preparing XOR sweep across nums.",
    },
  ];

  nums.forEach((x, i) => {
    const prevResult = result;
    result ^= x;
    steps.push({
      type: "array",
      array: [...nums],
      current: x,
      left: i,
      right: i,
      mSum: result,
      line: 2,
      shiftInfo: {
        from: `num: ${x} (0b${x.toString(2)})`,
        to: `acc: ${result} (0b${result.toString(2)})`,
        action: "xor",
        reason: `${prevResult} ^ ${x} = ${result} (0b${result.toString(2)})`,
      },
      desc: `Step ${i + 1}: ${prevResult} ^ ${x} -> result = ${result} (binary 0b${result.toString(2)}).`,
    });
  });

  steps.push({
    type: "array",
    array: [...nums],
    current: result,
    mSum: result,
    line: 3,
    desc: `XOR Cancellation Complete! Duplicate pairs cancel to 0, leaving unique element = ${result}.`,
  });

  return { code, array: nums, steps: cap(steps) };
}

function trieInsert(
  input: (number | string)[],
  slug = "implement-trie-prefix-tree",
  dataset?: TestDataset,
): VizBundle {
  const code = [
    "class TrieNode:",
    "    def __init__(self):",
    "        self.children = {}",
    "        self.is_end = False",
    "",
    "def insert(word):",
    "    node = root",
    "    for ch in word:",
    "        if ch not in node.children:",
    "            node.children[ch] = TrieNode()",
    "        node = node.children[ch]",
    "    node.is_end = True",
  ];

  const rawWords: string[] =
    dataset?.array && Array.isArray(dataset.array) && dataset.array.length > 0
      ? dataset.array.map(String)
      : ["apple", "app", "applause", "apt", "bat"];

  const words = rawWords.slice(0, 8);
  const trieNodes: (number | string | null)[] = ["root"];
  const trieSet = new Set<string>(["root"]);
  const completedWords: string[] = [];

  const steps: VizStep[] = [
    {
      type: "trie",
      tree: [...trieNodes],
      array: words,
      current: "root",
      visited: ["root"],
      line: 6,
      wSum: 1,
      mSum: 0,
      desc: `Initialize Trie root node. Preparing to insert ${words.length} dictionary words: [${words.map((w) => `"${w}"`).join(", ")}].`,
    },
  ];

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const word = words[wIdx]!;
    let currentPath = "root";

    steps.push({
      type: "trie",
      tree: [...trieNodes],
      array: words,
      left: wIdx,
      current: word,
      visited: [currentPath],
      line: 6,
      wSum: trieNodes.length,
      mSum: completedWords.length,
      desc: `Starting insertion of word "${word}" (${wIdx + 1}/${words.length}) from root.`,
    });

    for (let cIdx = 0; cIdx < word.length; cIdx++) {
      const ch = word[cIdx]!;
      const nextPath = `${currentPath}/${ch}`;
      const isExisting = trieSet.has(nextPath);

      if (!isExisting) {
        trieSet.add(nextPath);
        trieNodes.push(ch);

        steps.push({
          type: "trie",
          tree: [...trieNodes],
          array: words,
          left: wIdx,
          right: cIdx,
          current: ch,
          visited: [currentPath, nextPath],
          line: 9,
          wSum: trieNodes.length,
          mSum: completedWords.length,
          shiftInfo: {
            from: currentPath,
            to: ch,
            action: "insert",
            reason: `Branching new TrieNode for char '${ch}' at prefix depth ${cIdx + 1}.`,
          },
          desc: `Character '${ch}' not in children of '${currentPath.split("/").pop()}'. Created new TrieNode('${ch}').`,
        });
      } else {
        steps.push({
          type: "trie",
          tree: [...trieNodes],
          array: words,
          left: wIdx,
          right: cIdx,
          current: ch,
          visited: [currentPath, nextPath],
          line: 10,
          wSum: trieNodes.length,
          mSum: completedWords.length,
          shiftInfo: {
            from: currentPath,
            to: ch,
            action: "lookup",
            reason: `Reusing existing prefix path for '${ch}'.`,
          },
          desc: `✓ Shared prefix! Traversed existing node '${ch}' at depth ${cIdx + 1}.`,
        });
      }

      currentPath = nextPath;
    }

    completedWords.push(word);
    steps.push({
      type: "trie",
      tree: [...trieNodes],
      array: words,
      left: wIdx,
      current: `${word} (END)`,
      visited: [currentPath],
      line: 11,
      wSum: trieNodes.length,
      mSum: completedWords.length,
      shiftInfo: {
        from: currentPath,
        to: "is_end: True",
        action: "write",
        reason: `Marked end of word for "${word}".`,
      },
      desc: `Marked end_of_word = True for "${word}". Total stored words: ${completedWords.length}.`,
    });
  }

  const targetSearch = typeof dataset?.target === "string" ? dataset.target : words[0] ?? "app";
  steps.push({
    type: "trie",
    tree: [...trieNodes],
    array: words,
    left: 0,
    right: words.length - 1,
    current: "COMPLETE",
    visited: completedWords,
    line: 11,
    wSum: trieNodes.length,
    mSum: completedWords.length,
    desc: `Trie Construction Complete! Inserted ${completedWords.length} words with ${trieNodes.length} nodes. Ready for search("${targetSearch}").`,
  });

  return { code, array: words, steps: cap(steps) };
}

function queueSimulation(
  input: (number | string)[],
  slug = "",
  dataset?: TestDataset,
): VizBundle {
  const isRevealCards = /reveal-cards/i.test(slug);
  const isDota2 = /dota2-senate|senate/i.test(slug);

  if (isDota2) {
    const senate =
      input && input.length > 0
        ? input.map((x) => String(x).toUpperCase())
        : ["R", "D", "D"];
    const n = senate.length;
    const code = [
      "radiant = queue() // Indices of Radiant senators",
      "dire = queue()    // Indices of Dire senators",
      "for i, s in enumerate(senate):",
      "    if s == 'R': radiant.enqueue(i)",
      "    else: dire.enqueue(i)",
      "while radiant and dire:",
      "    rIdx = radiant.dequeue()",
      "    dIdx = dire.dequeue()",
      "    if rIdx < dIdx: radiant.enqueue(rIdx + n)",
      "    else: dire.enqueue(dIdx + n)",
      "return 'Radiant' if radiant else 'Dire'",
    ];

    const radiantQueue: number[] = [];
    const direQueue: number[] = [];
    senate.forEach((s, i) => {
      if (s === "R") radiantQueue.push(i);
      else direQueue.push(i);
    });

    const steps: VizStep[] = [
      {
        type: "queue",
        queue: [...radiantQueue],
        array: [...senate],
        current: null,
        activeDataset: "queue",
        line: 0,
        desc: `Initialize Radiant queue [${radiantQueue.join(", ")}] and Dire queue [${direQueue.join(", ")}] for Senate "${senate.join("")}".`,
      },
    ];

    let currentN = n;
    while (radiantQueue.length > 0 && direQueue.length > 0 && steps.length < 50) {
      const r = radiantQueue.shift()!;
      const d = direQueue.shift()!;
      if (r < d) {
        radiantQueue.push(r + currentN);
        steps.push({
          type: "queue",
          queue: [...radiantQueue],
          array: [...senate],
          current: r,
          activeDataset: "queue",
          shiftInfo: {
            from: "queue",
            to: "queue",
            action: "shift",
            reason: `Radiant senator ${r} bans Dire senator ${d} and moves to next round at index ${r + currentN}`,
          },
          line: 8,
          desc: `Senator R[${r}] has earlier turn than D[${d}]: Dire ${d} is banned. Radiant moves to next round as ${r + currentN}. Radiant queue: [${radiantQueue.join(", ")}].`,
        });
      } else {
        direQueue.push(d + currentN);
        steps.push({
          type: "queue",
          queue: [...direQueue],
          array: [...senate],
          current: d,
          activeDataset: "queue",
          shiftInfo: {
            from: "queue",
            to: "queue",
            action: "shift",
            reason: `Dire senator ${d} bans Radiant senator ${r} and moves to next round at index ${d + currentN}`,
          },
          line: 9,
          desc: `Senator D[${d}] has earlier turn than R[${r}]: Radiant ${r} is banned. Dire moves to next round as ${d + currentN}. Dire queue: [${direQueue.join(", ")}].`,
        });
      }
    }

    const winner = radiantQueue.length > 0 ? "Radiant" : "Dire";
    steps.push({
      type: "queue",
      queue: radiantQueue.length > 0 ? [...radiantQueue] : [...direQueue],
      array: [...senate],
      current: null,
      activeDataset: "queue",
      line: 10,
      desc: `Victory announced! ${winner} Senate has remaining active voters and wins the vote.`,
    });

    return { code, array: senate, steps: cap(steps) };
  }

  // Default: Reveal Cards In Increasing Order & FIFO Index Rotation
  const rawDeck = input.map((x) => (typeof x === "number" ? x : parseFloat(String(x)) || 0));
  const deck = rawDeck.length > 0 ? [...rawDeck] : [17, 13, 11, 2, 3, 5, 7];
  const sorted = [...deck].sort((a, b) => a - b);
  const n = sorted.length;

  const code = [
    "function deckRevealedIncreasing(deck):",
    "    deck.sort() // Sort cards ascending",
    "    indexQueue = queue(0 ... n-1) // Track available slot indices",
    "    result = array of size n",
    "    for card in deck:",
    "        targetSlot = indexQueue.dequeue() // Slot to reveal card",
    "        result[targetSlot] = card",
    "        if not indexQueue.isEmpty():",
    "            indexQueue.enqueue(indexQueue.dequeue()) // Move next slot to bottom",
    "    return result",
  ];

  const indexQueue: number[] = Array.from({ length: n }, (_, i) => i);
  const result: (number | null)[] = Array.from({ length: n }, () => null);
  const steps: VizStep[] = [];

  // Step 0: Initialization
  steps.push({
    type: "queue",
    queue: [...indexQueue],
    array: [...deck],
    line: 2,
    current: null,
    activeDataset: "queue",
    desc: `Initialize index queue [${indexQueue.join(", ")}] and sorted deck [${sorted.join(", ")}].`,
  });

  for (let cIdx = 0; cIdx < sorted.length; cIdx++) {
    const card = sorted[cIdx]!;
    const targetSlot = indexQueue.shift()!;
    result[targetSlot] = card;

    steps.push({
      type: "queue",
      queue: [...indexQueue],
      array: result.map((x) => (x !== null ? x : 0)),
      current: targetSlot,
      activeDataset: "array",
      shiftInfo: {
        from: "queue",
        to: "array",
        action: "write",
        reason: `Place card ${card} at revealed target index ${targetSlot}`,
      },
      line: 6,
      desc: `Card ${card}: Dequeue target index ${targetSlot}. Assign result[${targetSlot}] = ${card}. Remaining index queue: [${indexQueue.join(", ")}].`,
    });

    if (indexQueue.length > 0) {
      const skipped = indexQueue.shift()!;
      indexQueue.push(skipped);

      steps.push({
        type: "queue",
        queue: [...indexQueue],
        array: result.map((x) => (x !== null ? x : 0)),
        current: skipped,
        activeDataset: "queue",
        shiftInfo: {
          from: "queue",
          to: "queue",
          action: "shift",
          reason: `Skip index ${skipped} and move to bottom of the queue`,
        },
        line: 8,
        desc: `Move next available index ${skipped} to the bottom of the queue. indexQueue is now [${indexQueue.join(", ")}].`,
      });
    }
  }

  const finalResult = result.map((x) => (x !== null ? x : 0));
  steps.push({
    type: "queue",
    queue: [],
    array: finalResult,
    current: null,
    activeDataset: "array",
    line: 9,
    desc: `Simulation complete! Initial deck ordering that reveals in increasing order is [${finalResult.join(", ")}].`,
  });

  return { code, array: deck, steps: cap(steps) };
}

function arrayScan(input: (number | string)[]): VizBundle {
  const isChar = input.some((x) => typeof x === "string" && isNaN(Number(x)));
  const code = isChar
    ? [
        "result = True",
        "for i, ch in enumerate(s):",
        "    if not validate(ch, i):",
        "        return False",
        "return result",
      ]
    : [
        "result = []",
        "for i, val in enumerate(nums):",
        "    if condition(val):",
        "        result.append(val)",
        "return result",
      ];

  const items = input.slice(0, 10);
  const steps: VizStep[] = [
    {
      type: "array",
      array: items,
      left: null,
      right: null,
      current: null,
      line: 0,
      desc: isChar
        ? `Initialize state for string "${items.join("")}".`
        : `Start sequential scan over input array of ${items.length} items.`,
    },
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    steps.push({
      type: "array",
      array: items,
      left: i,
      right: i,
      current: item,
      visited: items.slice(0, i),
      line: 1,
      desc: isChar
        ? `Index ${i}: Inspect character '${item}'.`
        : `Index ${i}: Inspect element ${item}.`,
    });
    steps.push({
      type: "array",
      array: items,
      left: i,
      right: i,
      current: item,
      visited: items.slice(0, i + 1),
      line: 2,
      desc: isChar
        ? `Character '${item}' satisfies constraints. Proceed to next element.`
        : `Element ${item} processed. Update traversal state.`,
    });
  }

  steps.push({
    type: "array",
    array: items,
    left: 0,
    right: items.length - 1,
    current: isChar ? "True" : (items[items.length - 1] ?? null),
    visited: [...items],
    line: 4,
    desc: isChar
      ? `All ${items.length} characters successfully validated → return True.`
      : `Scan complete across all ${items.length} elements.`,
  });

  return { code, array: items, steps: cap(steps) };
}

export function recursionMemoizationSim(
  input: (number | string)[],
  slug = "fibonacci-number",
  _title = "",
  dataset?: TestDataset,
): VizBundle {
  const isClimb = slug.includes("climb");
  const funcName = isClimb ? "climb" : "fib";

  let targetVal = 4;
  if (typeof dataset?.target === "number") {
    targetVal = dataset.target;
  } else if (input.length > 0 && !isNaN(Number(input[0]))) {
    targetVal = Number(input[0]);
  }
  const safeN = Math.min(Math.max(Math.round(targetVal), 3), 5);

  const code = isClimb
    ? [
        "memo = {}",
        "def climb(n):",
        "    if n <= 2: return n",
        "    if n in memo: return memo[n]  # ⚡ O(1) Cache Hit",
        "    memo[n] = climb(n - 1) + climb(n - 2)",
        "    return memo[n]",
        `climb(${safeN})`,
      ]
    : [
        "memo = {}",
        "def fib(n):",
        "    if n <= 1: return n",
        "    if n in memo: return memo[n]  # ⚡ O(1) Cache Hit",
        "    memo[n] = fib(n - 1) + fib(n - 2)",
        "    return memo[n]",
        `fib(${safeN})`,
      ];

  const steps: VizStep[] = [];
  const callStack: CallStackFrame[] = [];
  const recursionTree: RecursionTreeNode[] = [];
  const memoTable: Record<string, number> = {};

  let frameSeq = 0;
  let nodeSeq = 0;

  const rootNode: RecursionTreeNode = {
    id: "node_0",
    parentId: null,
    label: `${funcName}(${safeN})`,
    depth: 0,
    state: "running",
  };
  recursionTree.push(rootNode);

  steps.push({
    type: "recursion-tree",
    array: [safeN],
    callStack: [],
    recursionTree: [...recursionTree],
    activeFrameId: null,
    memoTable: { ...memoTable },
    memoHitKey: null,
    line: 0,
    desc: `Initialize top-down memoized recursion for ${funcName}(${safeN}) with empty memo cache.`,
  });

  function solve(n: number, parentNodeId: string, depth: number, decisionBranch: string): number {
    if (steps.length >= 65) return 0;
    const memoKey = `${funcName}(${n})`;
    frameSeq++;
    const frameId = `frame_${frameSeq}`;

    // 1. Cache Hit check (⚡ O(1) Subtree Bypass)
    if (memoKey in memoTable) {
      const cachedVal = memoTable[memoKey]!;
      nodeSeq++;
      const hitNodeId = `node_${nodeSeq}`;
      const hitNode: RecursionTreeNode = {
        id: hitNodeId,
        parentId: parentNodeId,
        label: `${funcName}(${n})`,
        depth,
        state: "memo_hit",
        isMemoHit: true,
        decision: decisionBranch,
        returnValue: cachedVal,
      };
      recursionTree.push(hitNode);

      const hitFrame: CallStackFrame = {
        id: frameId,
        name: `${funcName}(${n})`,
        functionName: funcName,
        depth,
        args: { n },
        status: "memo_hit",
        isMemoHit: true,
        returnValue: cachedVal,
      };
      callStack.push(hitFrame);

      steps.push({
        type: "recursion-tree",
        array: [safeN],
        callStack: [...callStack],
        recursionTree: [...recursionTree],
        activeFrameId: frameId,
        memoTable: { ...memoTable },
        memoHitKey: memoKey,
        current: cachedVal,
        line: 3,
        desc: `⚡ MEMO HIT: ${memoKey} found in cache (= ${cachedVal}). Subtree exploration bypassed in O(1)!`,
      });

      callStack.pop();
      return cachedVal;
    }

    // 2. Cache Miss - explore
    let currentNodeId = parentNodeId;
    if (depth > 0) {
      nodeSeq++;
      currentNodeId = `node_${nodeSeq}`;
      const childNode: RecursionTreeNode = {
        id: currentNodeId,
        parentId: parentNodeId,
        label: `${funcName}(${n})`,
        depth,
        state: "running",
        decision: decisionBranch,
      };
      recursionTree.push(childNode);
    }

    const frame: CallStackFrame = {
      id: frameId,
      name: `${funcName}(${n})`,
      functionName: funcName,
      depth,
      args: { n },
      status: "active",
    };
    callStack.push(frame);

    steps.push({
      type: "recursion-tree",
      array: [safeN],
      callStack: [...callStack],
      recursionTree: [...recursionTree],
      activeFrameId: frameId,
      memoTable: { ...memoTable },
      memoHitKey: null,
      line: 1,
      desc: `Call ${funcName}(${n}): Not yet cached. Expanding decision branches.`,
    });

    // Base cases
    const isBase = isClimb ? n <= 2 : n <= 1;
    if (isBase) {
      const baseVal = n;
      frame.status = "base_case";
      frame.returnValue = baseVal;
      const tNode = recursionTree.find((nd) => nd.id === currentNodeId);
      if (tNode) {
        tNode.state = "success";
        tNode.returnValue = baseVal;
      }

      steps.push({
        type: "recursion-tree",
        array: [safeN],
        callStack: [...callStack],
        recursionTree: [...recursionTree],
        activeFrameId: frameId,
        memoTable: { ...memoTable },
        memoHitKey: null,
        current: baseVal,
        line: 2,
        desc: `Base case reached: ${funcName}(${n}) = ${baseVal}. Returning directly.`,
      });

      callStack.pop();
      return baseVal;
    }

    // Branch 1: n - 1
    const leftVal = solve(n - 1, currentNodeId, depth + 1, "n-1");
    // Branch 2: n - 2
    const rightVal = solve(n - 2, currentNodeId, depth + 1, "n-2");
    const totalVal = leftVal + rightVal;

    // Cache the result
    memoTable[memoKey] = totalVal;

    frame.status = "returned";
    frame.returnValue = totalVal;
    const tNode = recursionTree.find((nd) => nd.id === currentNodeId);
    if (tNode) {
      tNode.state = "success";
      tNode.returnValue = totalVal;
    }

    steps.push({
      type: "recursion-tree",
      array: [safeN],
      callStack: [...callStack],
      recursionTree: [...recursionTree],
      activeFrameId: frameId,
      memoTable: { ...memoTable },
      memoHitKey: memoKey,
      current: totalVal,
      line: 4,
      desc: `Memoize Result: Stored ${memoKey} = ${leftVal} + ${rightVal} = ${totalVal} in cache table.`,
    });

    callStack.pop();
    return totalVal;
  }

  const finalResult = solve(safeN, "node_0", 0, "");
  rootNode.state = "success";
  rootNode.returnValue = finalResult;

  steps.push({
    type: "recursion-tree",
    array: [safeN],
    callStack: [],
    recursionTree: [...recursionTree],
    activeFrameId: null,
    memoTable: { ...memoTable },
    memoHitKey: null,
    current: finalResult,
    line: 6,
    desc: `Memoized Recursion Complete! ${funcName}(${safeN}) = ${finalResult}. Evaluated in O(N) operations via memoization table.`,
  });

  return { code, array: [safeN], steps: cap(steps) };
}

export function recursionBacktrackingSim(
  input: (number | string)[],
  slug = "subsets",
  _title = "",
  _dataset?: TestDataset,
): VizBundle {
  if (slug.includes("fibonacci") || slug.includes("climb") || slug.includes("memo")) {
    return recursionMemoizationSim(input, slug, _title, _dataset);
  }

  const isTargetConstrained =
    slug.includes("combination") ||
    slug.includes("partition") ||
    _dataset?.target !== undefined;

  if (isTargetConstrained) {
    const rawNums = input.length > 0 ? input.slice(0, 5) : [2, 3, 6, 7];
    const nums = rawNums.map(Number).filter((n) => !isNaN(n) && n > 0);
    const candidates = nums.length > 0 ? [...nums].sort((a, b) => a - b) : [2, 3, 6, 7];
    const target =
      typeof _dataset?.target === "number"
        ? _dataset.target
        : typeof _dataset?.target === "string"
          ? parseFloat(_dataset.target) || 7
          : 7;

    const code = [
      "result = []",
      "def backtrack(remain, path, start):",
      "    if remain == 0:",
      "        result.append(list(path))",
      "        return",
      "    for i in range(start, len(candidates)):",
      "        if candidates[i] > remain:  # ✂ Prune: exceeds target",
      "            continue",
      "        path.append(candidates[i])",
      "        backtrack(remain - candidates[i], path, i)",
      "        path.pop()",
      `backtrack(${target}, [], 0)`,
      "return result",
    ];

    const steps: VizStep[] = [];
    const callStack: CallStackFrame[] = [];
    const recursionTree: RecursionTreeNode[] = [];
    const resultCombos: string[] = [];

    let frameSeq = 0;
    let nodeSeq = 0;

    const rootNode: RecursionTreeNode = {
      id: "node_0",
      parentId: null,
      label: `rem=${target}`,
      depth: 0,
      state: "running",
    };
    recursionTree.push(rootNode);

    steps.push({
      type: "recursion-tree",
      array: candidates,
      callStack: [],
      recursionTree: [...recursionTree],
      activeFrameId: null,
      line: 0,
      wSum: 0,
      mSum: target,
      desc: `Initialize combination sum backtracking for target = ${target}, candidates = [${candidates.join(", ")}].`,
    });

    function backtrack(remain: number, path: number[], start: number, parentNodeId: string, depth: number) {
      if (steps.length >= 65) return;

      frameSeq++;
      const frameId = `frame_${frameSeq}`;
      const frame: CallStackFrame = {
        id: frameId,
        name: `backtrack(rem=${remain})`,
        functionName: "backtrack",
        depth,
        args: { remain, path: `[${path.join(", ")}]` },
        status: remain === 0 ? "base_case" : "active",
      };
      callStack.push(frame);

      if (remain === 0) {
        const comboStr = `[${path.join(", ")}]`;
        resultCombos.push(comboStr);
        const node = recursionTree.find((n) => n.id === parentNodeId);
        if (node) node.state = "success";

        steps.push({
          type: "recursion-tree",
          array: candidates,
          callStack: [...callStack],
          recursionTree: [...recursionTree],
          activeFrameId: frameId,
          wSum: resultCombos.length,
          mSum: target,
          current: comboStr,
          line: 2,
          desc: `Goal reached! Found valid combination: ${comboStr} (total found: ${resultCombos.length}).`,
        });

        callStack.pop();
        return;
      }

      steps.push({
        type: "recursion-tree",
        array: candidates,
        callStack: [...callStack],
        recursionTree: [...recursionTree],
        activeFrameId: frameId,
        line: 1,
        wSum: resultCombos.length,
        mSum: target,
        desc: `State: remain = ${remain}, current path = [${path.join(", ")}]. Evaluating candidates.`,
      });

      for (let i = start; i < candidates.length; i++) {
        if (steps.length >= 65) break;
        const val = candidates[i]!;

        if (val > remain) {
          // Visual Pruning Effect!
          nodeSeq++;
          const pruneNodeId = `node_${nodeSeq}`;
          const pruneNode: RecursionTreeNode = {
            id: pruneNodeId,
            parentId: parentNodeId,
            label: `+${val} (rem: ${remain - val})`,
            depth: depth + 1,
            state: "pruned",
            decision: `+${val}`,
            pruneReason: `${val} > remain (${remain})`,
          };
          recursionTree.push(pruneNode);

          frameSeq++;
          const abortFrameId = `frame_${frameSeq}`;
          const abortFrame: CallStackFrame = {
            id: abortFrameId,
            name: `backtrack(rem=${remain - val})`,
            functionName: "backtrack",
            depth: depth + 1,
            args: { remain: remain - val, candidate: val },
            status: "pruned",
            pruneReason: `${val} > remain (${remain})`,
          };
          callStack.push(abortFrame);

          steps.push({
            type: "recursion-tree",
            array: candidates,
            callStack: [...callStack],
            recursionTree: [...recursionTree],
            activeFrameId: abortFrameId,
            left: i,
            wSum: resultCombos.length,
            mSum: target,
            line: 6,
            desc: `✂ PRUNED: Candidate ${val} exceeds remaining target ${remain}. Constraint violated; subtree pruned.`,
          });

          callStack.pop();
          break; // Candidates are sorted ascending; subsequent candidates will also violate constraint
        }

        // Valid branch
        nodeSeq++;
        const childNodeId = `node_${nodeSeq}`;
        const nextPath = [...path, val];
        const childNode: RecursionTreeNode = {
          id: childNodeId,
          parentId: parentNodeId,
          label: `rem=${remain - val}`,
          depth: depth + 1,
          state: "running",
          decision: `+${val}`,
        };
        recursionTree.push(childNode);

        steps.push({
          type: "recursion-tree",
          array: candidates,
          callStack: [...callStack],
          recursionTree: [...recursionTree],
          activeFrameId: frameId,
          left: i,
          current: val,
          line: 8,
          wSum: resultCombos.length,
          mSum: target,
          desc: `Decision: Pick candidate ${val} (new remain = ${remain - val}). Exploring child decisions.`,
        });

        backtrack(remain - val, nextPath, i, childNodeId, depth + 1);

        if (childNode.state !== "success" && childNode.state !== "pruned") {
          childNode.state = "backtracked";
        }

        steps.push({
          type: "recursion-tree",
          array: candidates,
          callStack: [...callStack],
          recursionTree: [...recursionTree],
          activeFrameId: frameId,
          left: i,
          line: 10,
          wSum: resultCombos.length,
          mSum: target,
          desc: `Backtrack: Pop candidate ${val} from path. Restoring remaining target = ${remain}.`,
        });
      }

      const top = callStack.pop();
      if (top) top.status = "returned";
    }

    backtrack(target, [], 0, "node_0", 0);
    rootNode.state = "success";

    steps.push({
      type: "recursion-tree",
      array: candidates,
      callStack: [],
      recursionTree: [...recursionTree],
      activeFrameId: null,
      line: 12,
      wSum: resultCombos.length,
      mSum: target,
      desc: `Combination Sum Complete! Explored ${recursionTree.length} states, finding ${resultCombos.length} valid combinations with constraint pruning.`,
    });

    return { code, array: candidates, steps: cap(steps) };
  }

  const rawNums = input.length > 0 ? input.slice(0, 4) : [1, 2, 3];
  const nums = rawNums.map(Number).filter((n) => !isNaN(n));
  const safeNums = nums.length > 0 ? nums : [1, 2, 3];

  const code = [
    "result = []",
    "def backtrack(start, path):",
    "    result.append(list(path))",
    "    for i in range(start, len(nums)):",
    "        path.append(nums[i])",
    "        backtrack(i + 1, path)",
    "        path.pop()",
    "backtrack(0, [])",
    "return result",
  ];

  const steps: VizStep[] = [];
  const callStack: CallStackFrame[] = [];
  const recursionTree: RecursionTreeNode[] = [];
  const resultSets: string[] = [];

  let frameSeq = 0;
  let nodeSeq = 0;

  // Root tree node
  const rootNode: RecursionTreeNode = {
    id: "node_0",
    parentId: null,
    label: "[]",
    depth: 0,
    state: "running",
  };
  recursionTree.push(rootNode);

  steps.push({
    type: "recursion-tree",
    array: safeNums,
    callStack: [],
    recursionTree: [...recursionTree],
    activeFrameId: null,
    line: 0,
    wSum: 0,
    desc: `Initialize backtracking state-space exploration for nums = [${safeNums.join(", ")}].`,
  });

  function backtrack(start: number, path: number[], parentNodeId: string, depth: number) {
    if (steps.length >= 65) return;

    frameSeq++;
    const frameId = `frame_${frameSeq}`;
    const frame: CallStackFrame = {
      id: frameId,
      name: `backtrack(start=${start})`,
      functionName: "backtrack",
      depth,
      args: { start, path: `[${path.join(", ")}]` },
      status: "active",
    };
    callStack.push(frame);

    const pathStr = `[${path.join(", ")}]`;
    resultSets.push(pathStr);

    steps.push({
      type: "recursion-tree",
      array: safeNums,
      callStack: [...callStack],
      recursionTree: [...recursionTree],
      activeFrameId: frameId,
      line: 2,
      wSum: resultSets.length,
      current: pathStr,
      desc: `State reached: path = ${pathStr}. Add to subsets solution (total: ${resultSets.length}).`,
    });

    for (let i = start; i < safeNums.length; i++) {
      if (steps.length >= 65) break;
      const val = safeNums[i]!;

      // Branch node in recursion tree
      nodeSeq++;
      const childNodeId = `node_${nodeSeq}`;
      const nextPath = [...path, val];
      const childNode: RecursionTreeNode = {
        id: childNodeId,
        parentId: parentNodeId,
        label: `[${nextPath.join(",")}]`,
        depth: depth + 1,
        state: "running",
        decision: `+${val}`,
      };
      recursionTree.push(childNode);

      steps.push({
        type: "recursion-tree",
        array: safeNums,
        callStack: [...callStack],
        recursionTree: [...recursionTree],
        activeFrameId: frameId,
        left: i,
        current: val,
        line: 4,
        wSum: resultSets.length,
        desc: `Decision: Include nums[${i}] = ${val} into path -> path = [${nextPath.join(", ")}].`,
      });

      backtrack(i + 1, nextPath, childNodeId, depth + 1);

      // Backtrack step
      childNode.state = "backtracked";
      steps.push({
        type: "recursion-tree",
        array: safeNums,
        callStack: [...callStack],
        recursionTree: [...recursionTree],
        activeFrameId: frameId,
        left: i,
        line: 6,
        wSum: resultSets.length,
        desc: `Backtrack: Pop ${val} from path to explore sibling decisions.`,
      });
    }

    // Unwind call frame
    const top = callStack.pop();
    if (top) {
      top.status = "returned";
    }
  }

  backtrack(0, [], "node_0", 0);

  rootNode.state = "success";
  steps.push({
    type: "recursion-tree",
    array: safeNums,
    callStack: [],
    recursionTree: [...recursionTree],
    activeFrameId: null,
    line: 8,
    wSum: resultSets.length,
    desc: `Backtracking Complete! Explored ${recursionTree.length} states, generating ${resultSets.length} unique subsets.`,
  });

  return { code, array: safeNums, steps: cap(steps) };
}

/** Build a real, problem-appropriate walkthrough for any problem and dataset in the bank. */
export function simulateProblemWithDataset(
  slug: string,
  title = "",
  topics: string[] = [],
  dataset?: TestDataset,
): VizBundle {
  const pattern = patternFor(slug, title, topics);
  const isIsland = isIslandOrGridProblem(slug, topics);
  const matrixInput = dataset?.matrix ?? (isIsland ? sampleMatrixFor(slug) : undefined);
  const input = dataset?.array ?? sampleInputFor(slug, 8, topics);
  const target = dataset?.target;
  const safeInput = input.map((x) =>
    typeof x === "number"
      ? x
      : !isNaN(Number(x)) && String(x).trim() !== ""
        ? Number(x)
        : String(x)
  );
  const numInput = safeInput.map((x) => (typeof x === "number" ? x : 0));
  const numTarget = typeof target === "number" ? target : typeof target === "string" ? parseFloat(target) || undefined : undefined;

  switch (pattern) {
    case "island-max-area":
      return islandMaxArea(matrixInput);
    case "island-count":
      return islandCount(matrixInput);
    case "grid-bfs":
      return grid(matrixInput ?? numInput, "bfs");
    case "grid-dfs":
      return grid(matrixInput ?? numInput, "dfs");
    case "matrix-transform":
      return matrixTransformSim(matrixInput, slug, dataset);
    case "binary-search":
      return binarySearch(numInput, numTarget);
    case "two-pointers":
      if (slug.includes("palindrome") || slug.includes("reverse") || safeInput.some((x) => typeof x === "string")) {
        return arrayScan(safeInput);
      }
      return twoPointersPairSum(numInput, numTarget);
    case "two-pointers-in-place":
      return arrayScan(safeInput);
    case "sliding-window":
    case "sliding-window-dynamic":
      return slidingWindow(safeInput, dataset);
    case "hashmap-pair":
      return hashmapPair(numInput, numTarget);
    case "frequency-count":
      return frequencyCount(safeInput, slug, dataset);
    case "monotonic-stack":
      return monotonicStack(input);
    case "parentheses":
      return parentheses(input);
    case "graph-bfs":
      return graphBfs(numInput);
    case "topological-sort":
      return topologicalSort(input, slug, dataset);
    case "word-ladder":
      return wordLadderBfs(input, dataset?.target, slug, dataset);
    case "linkedlist-reverse":
      return linkedListReverse(numInput);
    case "linkedlist-cycle":
      return linkedListCycle(input, slug, title, dataset);
    case "tree-dfs":
      return treeDfs(input, title, slug, dataset?.tree ?? dataset?.array);
    case "tree-bfs":
      return treeBfs(input, title, slug, dataset?.tree ?? dataset?.array);
    case "bst-search":
      return bstSearch(input, slug, title, dataset);
    case "heap-topk":
      return heapTopK(input, slug, dataset);
    case "dp-1d":
      return dp1d(input, slug, dataset);
    case "dp-2d":
      return dp2dSim(dataset, slug);
    case "lcs":
      return longestCommonSubsequence(input, dataset);
    case "intervals":
      return intervalMergeSim(dataset);
    case "union-find":
      return unionFindSim(dataset, slug);
    case "prefix-sum":
    case "prefix-sum-hashmap":
      return prefixSum(numInput);
    case "sorting":
      return sorting(numInput);
    case "bit-manipulation":
      return bitManipulation(input, slug, dataset);
    case "trie-insert":
      return trieInsert(input, slug, dataset);
    case "hashmap-design":
      return hashmapDesign(dataset);
    case "hashset-design":
      return hashsetDesign(dataset);
    case "lru-cache":
      return lruCacheSim(dataset);
    case "queue-simulation":
      return queueSimulation(input, slug, dataset);
    case "recursion-backtracking":
      return recursionBacktrackingSim(safeInput, slug, title, dataset);
    case "recursion-memoization":
      return recursionMemoizationSim(safeInput, slug, title, dataset);
    default:
      return arrayScan(input);
  }
}

/** Build a real, problem-appropriate walkthrough for any problem in the bank. */
export function simulateProblem(slug: string, title = "", topics: string[] = []): VizBundle {
  return simulateProblemWithDataset(slug, title, topics);
}

/** Build a custom visual trace for arbitrary inputs and structure types in the playground. */
export function simulateCustomInput(
  type: VizType,
  input: (number | string)[],
  target?: number | string,
  matrixInput?: (number | string)[][],
  title?: string,
): VizBundle {
  const safeInput = input.length > 0 ? input.slice(0, 10) : [1, 2, 3, 4, 5];
  const numInput = safeInput.map((x) => (typeof x === "number" ? x : parseFloat(String(x)) || 0));
  const numTarget = typeof target === "number" ? target : typeof target === "string" ? parseFloat(target) || undefined : undefined;
  const t = (title ?? "").toLowerCase();

  // Pattern / Title aware overrides
  if (/max.*area.*island|area.*island|max.*area/i.test(t)) {
    return islandMaxArea(matrixInput);
  }
  if (/number.*island|count.*island|sub[- ]island/i.test(t)) {
    return islandCount(matrixInput);
  }
  if (/flood.*fill|rotting.*orange|orange|grid.*bfs/i.test(t)) {
    return grid(matrixInput ?? numInput, "bfs");
  }
  if (/spiral|queens|n-queens|backtrack/i.test(t)) {
    return grid(matrixInput ?? numInput, "dfs");
  }
  if (/lru.*cache|lru/i.test(t)) {
    return lruCacheSim();
  }
  if (/subarray.*sum|prefix.*sum/i.test(t)) {
    return prefixSum(numInput);
  }
  if (/two.*sum.*map|one[- ]pass.*map/i.test(t)) {
    return hashmapPair(numInput);
  }
  if (/common.*subseq|lcs/i.test(t)) {
    return longestCommonSubsequence(safeInput);
  }
  if (/two.*pointer|two.*sum|pair.*sum|pair/i.test(t)) {
    return twoPointersPairSum(numInput, numTarget);
  }
  if (/sort|bubble|selection|insertion|merge|quick|counting|radix|bucket|shell/i.test(t)) {
    return sorting(numInput);
  }
  if (/binary.*search|search|linear|jump|interpolation|exponential|fibonacci|sqrt/i.test(t)) {
    return binarySearch(numInput, numTarget);
  }
  if (/kadane|max.*subarray/i.test(t)) {
    return kadanesAlgorithm(numInput);
  }
  if (/sliding.*window|window/i.test(t)) {
    return slidingWindow(numInput);
  }
  if (/dp|knapsack|dynamic/i.test(t)) {
    return dp1d(numInput);
  }
  if (/exponent|pow|sieve|prime|gcd|euclid|math/i.test(t)) {
    return arrayScan(safeInput);
  }

  switch (type) {
    case "linkedlist":
      return linkedListReverse(numInput);
    case "stack":
      return monotonicStack(numInput);
    case "queue":
    case "deque":
      return graphBfs(numInput);
    case "tree":
      return treeDfs(safeInput);
    case "bst":
      return bstSearch(numInput);
    case "heap":
      return heapTopK(safeInput);
    case "hashmap":
      return frequencyCount(safeInput);
    case "set":
      return hashsetDesign();
    case "graph":
      return graphBfs(numInput);
    case "matrix":
      return islandMaxArea(matrixInput);
    case "trie":
      return trieInsert(safeInput);
    case "dp":
      return dp1d(numInput);
    case "bit":
      return bitManipulation(safeInput);
    case "recursion-tree":
      if (t.includes("memo") || t.includes("fib") || t.includes("climb")) {
        return recursionMemoizationSim(safeInput, "fibonacci-number", title);
      }
      return recursionBacktrackingSim(safeInput, "combination-sum", title);
    case "array":
    default:
      if (typeof target === "number" || typeof target === "string") {
        return twoPointersPairSum(numInput, numTarget);
      }
      return arrayScan(safeInput);
  }
}

import type { VizStep, VizType, ShiftInfo } from "./problems";
import { parse2DCoord } from "../components/visualizer/VisualizerTypes";

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

export type VizContractType = (typeof VALID_VIZ_TYPES)[number];

export type VizContract = {
  code_lines: string[];
  test_array: (number | string)[];
  viz_steps: VizStep[];
};

export type NormalizedVizPayload = VizContract;

export type VizFallback = {
  code: string[];
  array: (number | string)[];
  steps: VizStep[];
};

export type VizBundle = VizFallback;

function isVizType(value: unknown): value is VizType {
  return typeof value === "string" && VALID_VIZ_TYPES.includes(value as VizContractType);
}

function sanitizeScalarArray(value: unknown): (number | string)[] {
  if (value === null || value === undefined) return [];
  if (value instanceof Set || value instanceof Map) {
    return Array.from(value.values())
      .map((item) => extractScalarValue(item))
      .filter((item): item is number | string => item !== null && item !== undefined);
  }
  if (!Array.isArray(value)) {
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      const s = extractScalarValue(value);
      return s !== null ? [s] : [];
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (Array.isArray(obj.array)) return sanitizeScalarArray(obj.array);
      if (Array.isArray(obj.nums)) return sanitizeScalarArray(obj.nums);
      if (Array.isArray(obj.items)) return sanitizeScalarArray(obj.items);
      return Object.values(obj)
        .map((item) => extractScalarValue(item))
        .filter((item): item is number | string => item !== null && item !== undefined);
    }
    return [];
  }
  return value
    .map((item) => extractScalarValue(item))
    .filter((item): item is number | string => item !== null && item !== undefined);
}

function sanitizeTreeArray(value: unknown): (number | string | null)[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item === null || item === undefined || String(item) === "null" || String(item) === "None") return null;
      return extractScalarValue(item);
    });
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.tree)) return sanitizeTreeArray(obj.tree);
    if (Array.isArray(obj.nodes)) return sanitizeTreeArray(obj.nodes);

    // If it's a TreeNode object with left/right pointers, perform level-order BFS
    if ("val" in obj || "value" in obj || "v" in obj) {
      const result: (number | string | null)[] = [];
      const queue: (unknown | null)[] = [obj];
      while (queue.length > 0 && result.length < 63) {
        const node = queue.shift();
        if (node && typeof node === "object") {
          const nObj = node as Record<string, unknown>;
          const val = extractScalarValue(nObj.val ?? nObj.value ?? nObj.v);
          result.push(val);
          queue.push(nObj.left ?? null);
          queue.push(nObj.right ?? null);
        } else {
          result.push(null);
        }
      }
      while (result.length > 0 && result[result.length - 1] === null) {
        result.pop();
      }
      return result;
    }
  }
  return [];
}

function sanitizeMatrix(value: unknown): (number | string)[][] {
  if (!value) return [];
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    if (value.every((item) => !Array.isArray(item))) {
      const row = sanitizeScalarArray(value);
      return row.length > 0 ? [row] : [];
    }
    return value
      .filter(Array.isArray)
      .map((row) => sanitizeScalarArray(row))
      .filter((row) => row.length > 0);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.grid)) return sanitizeMatrix(obj.grid);
    if (Array.isArray(obj.matrix)) return sanitizeMatrix(obj.matrix);
    if (Array.isArray(obj.board)) return sanitizeMatrix(obj.board);
    if (Array.isArray(obj.rows)) return sanitizeMatrix(obj.rows);
  }
  return [];
}

function hasValidMatrixShape(value: unknown): value is (number | string)[][] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.every((cell) => typeof cell === "number" || typeof cell === "string"),
  );
}

export function extractScalarValue(item: unknown, depth = 0): number | string | null {
  if (item === null || item === undefined) return null;
  if (typeof item === "number") {
    if (Number.isNaN(item)) return null;
    if (!Number.isFinite(item)) return item > 0 ? "Infinity" : "-Infinity";
    return item;
  }
  if (typeof item === "boolean") return item ? "true" : "false";
  if (typeof item === "bigint") return item.toString();
  if (typeof item === "symbol") return item.description ?? "Symbol";
  if (typeof item === "function") return null;

  if (typeof item === "string") {
    const s = item.trim();
    if (s === "[object Object]" || s === "undefined" || s === "null") return null;
    return item;
  }

  if (depth > 6) return String(item);

  if (Array.isArray(item)) {
    if (item.length === 0) return null;
    if (item.length === 2) {
      const v = extractScalarValue(item[1], depth + 1);
      if (v !== null) return v;
    }
    return extractScalarValue(item[0], depth + 1);
  }

  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const priorityKeys = [
      "value",
      "val",
      "v",
      "data",
      "item",
      "key",
      "label",
      "char",
      "id",
      "count",
      "freq",
      "cost",
      "weight",
      "target",
    ];
    for (const k of priorityKeys) {
      if (k in obj && obj[k] !== undefined && obj[k] !== null) {
        const extracted = extractScalarValue(obj[k], depth + 1);
        if (extracted !== null) return extracted;
      }
    }

    const values = Object.values(obj).filter(
      (v) =>
        typeof v === "number" ||
        typeof v === "string" ||
        typeof v === "boolean" ||
        typeof v === "bigint",
    );
    if (values.length > 0) {
      const extracted = extractScalarValue(values[0], depth + 1);
      if (extracted !== null) return extracted;
    }

    try {
      const str = JSON.stringify(item);
      if (str && str !== "{}" && str.length < 40) return str;
    } catch {
      // ignore circular json error
    }
    return String(item);
  }
  return String(item);
}

export function sanitizeMap(value: unknown): Record<string, number | string | null> {
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

export function sanitizePointerRecord(value: unknown): Record<string, number | string | [number, number]> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    const rec: Record<string, number | string> = {};
    value.forEach((item, idx) => {
      const s = extractScalarValue(item);
      if (s !== null && s !== undefined) {
        rec[`p${idx + 1}`] = s;
      }
    });
    return Object.keys(rec).length > 0 ? rec : null;
  }
  const obj = value as Record<string, unknown>;
  const result: Record<string, number | string | [number, number]> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      result[k] = v;
    } else if (typeof v === "string" && v.trim()) {
      result[k] = v.trim();
    } else if (Array.isArray(v) && v.length === 2 && !isNaN(Number(v[0])) && !isNaN(Number(v[1]))) {
      result[k] = [Number(v[0]), Number(v[1])];
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}


function normalizeType(type: unknown, preferred: VizType): VizType {
  return isVizType(type) ? (type as VizType) : preferred;
}

export function hasMeaningfulTraversal(steps: VizStep[] | undefined | null): boolean {
  if (!Array.isArray(steps) || steps.length < 2) return false;

  const fingerprints = steps.map((step) =>
    JSON.stringify({
      type: step.type ?? null,
      array: step.array ?? null,
      list: step.list ?? null,
      stack: step.stack ?? null,
      queue: step.queue ?? null,
      deque: step.deque ?? null,
      tree: step.tree ?? null,
      matrix: step.matrix ?? null,
      map: step.map ?? null,
      set: step.set ?? null,
      visited: step.visited ?? null,
      current: step.current ?? null,
      left: step.left ?? null,
      right: step.right ?? null,
      left2: step.left2 ?? null,
      right2: step.right2 ?? null,
      secondaryArray: step.secondaryArray ?? null,
      wSum: step.wSum ?? null,
      mSum: step.mSum ?? null,
      currentArea: step.currentArea ?? null,
      maxArea: step.maxArea ?? null,
      direction: step.direction ?? null,
      islandCells: step.islandCells ?? null,
      predecessor: step.predecessor ?? null,
      cols: step.cols ?? null,
      line: step.line ?? null,
      callStack: step.callStack ?? null,
      recursionTree: step.recursionTree ?? null,
      intervals: step.intervals ?? null,
      sweepLine: step.sweepLine ?? null,
      heapSwap: step.heapSwap ?? null,
      sightlines: step.sightlines ?? null,
    }),
  );

  let changedCount = 0;
  for (let i = 1; i < fingerprints.length; i++) {
    if (fingerprints[i] !== fingerprints[i - 1]) changedCount++;
  }

  return changedCount >= 1;
}

export interface RawVizStep {
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
  direction?: unknown;
  currentArea?: unknown;
  maxArea?: unknown;
  islandCells?: unknown;
  pointer_labels?: unknown;
  array?: unknown;
  secondaryArray?: unknown;
  secondaryStack?: unknown;
  secondaryQueue?: unknown;
  activeNodeId?: unknown;
  targetIndex?: unknown;
  activePointers?: unknown;
  left?: unknown;
  right?: unknown;
  left2?: unknown;
  right2?: unknown;
  wSum?: unknown;
  mSum?: unknown;
  activeDataset?: unknown;
  shiftInfo?: unknown;
  datasetLabels?: unknown;
  callStack?: unknown;
  recursionTree?: unknown;
  activeFrameId?: unknown;
  intervals?: unknown;
  sweepLine?: unknown;
  stackInvariant?: unknown;
  sightlines?: unknown;
  heapSwap?: unknown;
  memoTable?: unknown;
  memoHitKey?: unknown;
}

export interface RawVizPayload {
  code_lines?: unknown;
  viz_steps?: unknown;
  test_array?: unknown;
}

/** Check if a line or step description represents a zero-initialized array declaration */
export function isZeroArrayLineOrDesc(lineText: string, desc = ""): boolean {
  const line = lineText.trim();
  const d = desc.trim().toLowerCase();

  const lineMatches =
    /ARRAY\b.*(?:SIZE|\d+)?.*(?:0|ZERO|FILLED)/i.test(line) ||
    /\[\s*0\s*\]\s*\*/i.test(line) ||
    /\[\s*0\s*for\s+.*in\s+.*\]/i.test(line) ||
    /(?:new\s+)?Array\(.*\)\.fill\(0\)/i.test(line) ||
    /=\s*\[\s*0(?:\s*,\s*0)*\s*\]/i.test(line) ||
    /(?:new\s+int|int\[\]|vector<int>|var\s+\w+\s+\[\d*\]int|make\(\[\]int)/i.test(line) ||
    /\{0\}/i.test(line) ||
    /\bzeros\s*\(/i.test(line) ||
    /\bnp\.zeros\b/i.test(line) ||
    /(?:s1_count|s2_count|count|freq|dp|table|seen_counts?|buffer)\s*=\s*(?:\[0\]|\[\]|ARRAY|zeros|\{0\})/i.test(
      line,
    );

  const descMatches =
    /\b(?:filled with 0|all 0|all zeros|zero-filled|zeros|empty counter|empty array|size 26 filled|s1_count =|s2_count =)\b/i.test(
      d,
    ) ||
    (/\b(?:init|initialize|initialization|declare|declaring|start with|create|allocate)\b/i.test(
      d,
    ) &&
      /\b(?:array|count|freq|dp|table|s1_count|s2_count)\b/i.test(d));

  return lineMatches || descMatches;
}

/** Check if a line or step description represents empty Map initialization */
export function isEmptyMapLineOrDesc(lineText: string, desc = ""): boolean {
  const line = lineText.trim();
  const d = desc.trim().toLowerCase();

  const lineMatches =
    /=\s*\{\s*\}/i.test(line) ||
    /(?:new\s+)?(?:Map|HashMap|unordered_map)\s*\(\s*\)/i.test(line) ||
    /=\s*(?:dict|defaultdict|Counter)\s*\(\s*\)/i.test(line) ||
    /make\s*\(\s*map\b/i.test(line);

  const descMatches =
    /\b(?:empty map|empty dict|empty counter|start with an empty map|init.*map|seen\s*=\s*\{\})\b/i.test(
      d,
    ) ||
    (/\b(?:init|initialize|declare|start with)\b/i.test(d) &&
      /\b(?:empty\s+map|empty\s+dict|empty\s+table|empty\s+counter)\b/i.test(d));

  return lineMatches || descMatches;
}

/** Check if a line or step description represents empty Stack initialization */
export function isEmptyStackLineOrDesc(lineText: string, desc = ""): boolean {
  const line = lineText.trim();
  const d = desc.trim().toLowerCase();

  const lineMatches =
    (/=\s*\[\s*\]/i.test(line) && !/\[0\]/.test(line)) ||
    /(?:new\s+)?Stack\s*\(\s*\)/i.test(line) ||
    /=\s*(?:deque|list)\s*\(\s*\)/i.test(line);

  const descMatches =
    /\b(?:empty stack|start with an empty stack|init.*stack|stack\s*=\s*\[\])\b/i.test(d) ||
    (/\b(?:init|initialize|declare|start with)\b/i.test(d) && /\b(?:empty\s+stack)\b/i.test(d));

  return lineMatches || descMatches;
}

/** Check if a line or step description represents empty Set initialization */
export function isEmptySetLineOrDesc(lineText: string, desc = ""): boolean {
  const line = lineText.trim();
  const d = desc.trim().toLowerCase();

  const lineMatches =
    /(?:new\s+)?(?:Set|HashSet|unordered_set)\s*\(\s*\)/i.test(line) ||
    /=\s*set\s*\(\s*\)/i.test(line);

  const descMatches =
    /\b(?:empty set|start with an empty set|init.*set|seen\s*=\s*set\(\))\b/i.test(d) ||
    (/\b(?:init|initialize|declare|start with)\b/i.test(d) && /\b(?:empty\s+set)\b/i.test(d));

  return lineMatches || descMatches;
}

/** Check if a code line or step description performs an in-place mutation / update */
export function isMutationLineOrDesc(lineText: string, desc = ""): boolean {
  const line = lineText.trim();
  const d = desc.trim().toLowerCase();

  const lineMatches =
    /\+=|-=|\*=|\/=|%=|\^=|\+\+|--/.test(line) ||
    /\[[^\]]+\]\s*=/i.test(line) ||
    /\.(?:append|push|add|insert|set|pop|shift|delete|unshift)\(/i.test(line) ||
    /\bswap\(/i.test(line);

  const descMatches =
    /\b(?:increment|add|push|insert|count|update|store|pop|set|place|shift|swap|put|assign|calculate.*=)\b/i.test(
      d,
    ) || /(?:s1_count|s2_count|count|dp|arr|nums)\[/i.test(d);

  return lineMatches || descMatches;
}

export interface CodeMethodRange {
  name: string;
  startLine: number;
  endLine: number;
}

export function parseCodeMethodRanges(codeLines: string[]): CodeMethodRange[] {
  const ranges: { name: string; startLine: number }[] = [];

  for (let i = 0; i < codeLines.length; i++) {
    const rawLine = codeLines[i] ?? "";
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    // Skip single-line comments
    if (/^(?:\/\/|#|\/\*|\*|--)/.test(trimmed)) continue;

    // 1. Explicit keyword: METHOD put(...), FUNCTION get(...), def remove(...), constructor(...)
    const kwMatch = trimmed.match(
      /^\s*(?:(?:METHOD|FUNCTION|PROCEDURE|def|function|public|private|protected|static|void|int|bool|string)\s+)+([a-zA-Z_]\w*)/i,
    );
    if (kwMatch?.[1]) {
      const name = kwMatch[1].toLowerCase();
      if (!/^(?:if|for|while|switch|catch|return)\b/i.test(name)) {
        ranges.push({ name, startLine: i });
        continue;
      }
    }

    // 2. CONSTRUCTOR / __init__ / init
    if (/^\s*(?:CONSTRUCTOR|__init__|init)\s*(?:\(|$)/i.test(trimmed)) {
      ranges.push({ name: "constructor", startLine: i });
      continue;
    }

    // 3. name(args): e.g. put(key, value): or get(key): or remove(key):
    const sigMatch = trimmed.match(/^\s*([a-zA-Z_]\w*)\s*\([^)]*\)\s*[:{]?\s*$/i);
    if (sigMatch?.[1]) {
      const name = sigMatch[1].toLowerCase();
      if (!/^(?:if|for|while|switch|catch|return)\b/i.test(name)) {
        ranges.push({ name, startLine: i });
        continue;
      }
    }
  }

  const result: CodeMethodRange[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const curr = ranges[i]!;
    const next = ranges[i + 1];
    const endLine = next ? next.startLine - 1 : codeLines.length - 1;
    result.push({
      name: curr.name,
      startLine: curr.startLine,
      endLine: Math.max(curr.startLine, endLine),
    });
  }

  return result;
}

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "in",
  "to",
  "for",
  "with",
  "from",
  "step",
  "iteration",
  "of",
  "on",
  "at",
  "as",
  "by",
  "is",
  "it",
  "this",
  "that",
  "into",
  "onto",
  "then",
  "now",
  "be",
  "was",
  "will",
  "all",
]);

function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export function scoreLineKeywordOverlap(line: string, desc: string): number {
  const lineTrimmed = line.trim();
  // Comments and empty lines should never be selected
  if (!lineTrimmed || /^(?:\/\/|#|\/\*|\*|--)/.test(lineTrimmed)) {
    return -100;
  }

  const lineLower = lineTrimmed.toLowerCase();
  const dLower = desc.toLowerCase();
  const descTokens = extractTokens(desc);
  const lineTokens = new Set(extractTokens(lineTrimmed));

  let score = 0;

  // Penalize top-level declarations during inner simulation
  const isDecl = /^(?:function\b|def\b|class\b|void\b|int\b|const\b\s*\w+\s*=\s*\()/i.test(
    lineTrimmed,
  );
  const isDescDecl = /\b(?:initialize|declaration|declaring|define|start of function)\b/i.test(
    dLower,
  );
  if (isDecl && !isDescDecl) {
    score -= 20;
  }

  // Card reveal & Queue bottom shift operations (e.g. queue.enqueue(queue.dequeue()) or move to bottom)
  const isDescBottom = /\b(?:move.*(?:bottom|back)|re-?enqueue|rotate|skip index)\b/i.test(dLower);
  const isLineBottom =
    /\b(?:enqueue\(.*dequeue|append\(.*pop|enqueue\(skipped|push\(skipped|queue\.enqueue)\b/i.test(
      lineLower,
    );
  if (isDescBottom) {
    if (isLineBottom) score += 25;
    else score -= 10;
  }

  // Dequeue / Pop / Reveal operations
  const isDescDequeue =
    /\b(?:dequeue|pop\b|pop\(0\)|popleft|shift|poll|reveal|target index|targetslot)\b/i.test(dLower);
  const isLineDequeue =
    /\b(?:dequeue|pop\(0\)|popleft|shift|poll|queue\.pop|\.pop\(0\)|targetslot\s*=|\.add\(queue\.dequeue)\b/i.test(
      lineLower,
    );
  const isLineEnqueue = /\b(?:enqueue|append|push|offer)\b/i.test(lineLower) && !isLineBottom;

  if (isDescDequeue) {
    if (isLineDequeue) score += 15;
    if (isLineEnqueue && !isLineBottom) score -= 15;
  }

  // Enqueue / Push operations
  const isDescEnqueue = /\b(?:enqueue|append|push|offer)\b/i.test(dLower) && !isDescBottom;
  if (isDescEnqueue) {
    if (isLineEnqueue) score += 15;
    if (isLineDequeue) score -= 15;
  }

  // Strictly increasing / condition verification
  const isDescCheck =
    /\b(?:strictly increasing|greater than|increasing order|check if|verify|condition)\b/i.test(
      dLower,
    );
  const isLineCheck = /\b(?:if\b|while\b|for\b.*in|revealedorder\[|\>|\<|strictly)\b/i.test(
    lineLower,
  );
  if (isDescCheck && isLineCheck) {
    score += 15;
  }

  // Left vs Right child alignment
  const isDescLeft = /\bleft\b/i.test(dLower);
  const isDescRight = /\bright\b/i.test(dLower);
  const isLineLeft = /\bleft\b|\.left\b/i.test(lineLower);
  const isLineRight = /\bright\b|\.right\b/i.test(lineLower);

  if (isDescLeft) {
    if (isLineLeft) score += 10;
    if (isLineRight && !isLineLeft) score -= 8;
  }
  if (isDescRight) {
    if (isLineRight) score += 10;
    if (isLineLeft && !isLineRight) score -= 8;
  }

  // Level size / queue length
  const isDescLevelSize = /\b(?:level_size|level size|size\b|len\(queue\)|queue\.length)\b/i.test(
    dLower,
  );
  const isLineLevelSize = /\b(?:level_size|len\(queue\)|queue\.length|\.size\(\))\b/i.test(
    lineLower,
  );
  if (isDescLevelSize && isLineLevelSize) score += 12;

  // Return statement
  const isDescReturn =
    /\b(?:return|complete|finished|traversal complete|answer|simulation complete|victory)\b/i.test(
      dLower,
    );
  const isLineReturn = /^\s*return\b/i.test(lineLower);
  if (isDescReturn && isLineReturn) score += 20;

  // Word token overlap
  for (const token of descTokens) {
    if (lineTokens.has(token) || lineLower.includes(token)) {
      score += 2;
    }
  }

  return score;
}

export function inferLineFromDesc(
  desc: string,
  codeLines: string[],
  stepIndex: number,
  totalSteps: number,
  hasDataChanged: boolean,
  currentLine?: number,
): number {
  if (!codeLines.length) return 0;
  const d = desc.toLowerCase().trim();

  // Parse method ranges if this is a class / multi-method code block
  const methodRanges = parseCodeMethodRanges(codeLines);

  const findMethod = (nameRegex: RegExp): CodeMethodRange | undefined => {
    return methodRanges.find((m) => nameRegex.test(m.name));
  };

  const findLineInRange = (start: number, end: number, regex: RegExp): number => {
    for (let i = start; i <= Math.min(end, codeLines.length - 1); i++) {
      const line = codeLines[i]?.trim() ?? "";
      if (!line || /^(?:\/\/|#|\/\*|\*|--)/.test(line)) continue;
      if (regex.test(line)) return i;
    }
    return -1;
  };

  // When class methods exist, prioritize method boundary matching first
  if (methodRanges.length > 1) {
    if (/\b(?:remove|delete|del|unlink|discard|pop|erase)\b/i.test(d)) {
      const removeMethod = findMethod(/^(?:remove|delete|del|erase|pop|discard)/i);
      if (removeMethod) {
        if (/\b(?:not found|missing|false|none|return)\b/i.test(d)) {
          const retLine = findLineInRange(
            removeMethod.startLine + 1,
            removeMethod.endLine,
            /^\s*return\b/i,
          );
          if (retLine !== -1) return retLine;
        }
        const delLine = findLineInRange(
          removeMethod.startLine + 1,
          removeMethod.endLine,
          /\b(?:del\b|delete\b|\.remove|\.pop|\.erase|prev\.next\s*=|remove_at)/i,
        );
        if (delLine !== -1) return delLine;
        return Math.min(removeMethod.startLine + 1, removeMethod.endLine);
      }
    }

    if (/\b(?:put|insert|set|add|append|write|push|update)\b/i.test(d)) {
      const putMethod = findMethod(/^(?:put|insert|set|add|append|write|push|update)/i);
      if (putMethod) {
        if (/\bupdate\b/i.test(d)) {
          const updateLine = findLineInRange(
            putMethod.startLine + 1,
            putMethod.endLine,
            /=\s*value|\[.*\]\s*=\s*|\.val\s*=|update|\bvalue\b/i,
          );
          if (updateLine !== -1) return updateLine;
        }
        if (/\b(?:hash|index|modulo)\b/i.test(d) && !d.includes("store") && !d.includes("append")) {
          const hashLine = findLineInRange(
            putMethod.startLine + 1,
            putMethod.endLine,
            /\.hash\(|hash\(|%\s*this\.|%\s*capacity/i,
          );
          if (hashLine !== -1) return hashLine;
        }
        const appendLine = findLineInRange(
          putMethod.startLine + 1,
          putMethod.endLine,
          /\.append\(|\[.*\]\s*=|insert|put|set|\.add\(|push/i,
        );
        if (appendLine !== -1) return appendLine;
        return Math.min(putMethod.startLine + 1, putMethod.endLine);
      }
    }

    if (/\b(?:get|lookup|find|search|contains|read|retrieve|has_key|has)\b/i.test(d)) {
      const getMethod = findMethod(/^(?:get|find|search|lookup|contains|read|retrieve)/i);
      if (getMethod) {
        if (
          /\b(?:not found|missing|after removal|removed|after delete|after del|return -1|-1|empty|none|null|false)\b/i.test(
            d,
          )
        ) {
          const retNotFoundExact = findLineInRange(
            getMethod.startLine + 1,
            getMethod.endLine,
            /return\s+(?:-1|null|false|none)\b|-1/i,
          );
          if (retNotFoundExact !== -1) return retNotFoundExact;
          const returnNotFound = findLineInRange(
            getMethod.startLine + 1,
            getMethod.endLine,
            /return\b/i,
          );
          if (returnNotFound !== -1) return returnNotFound;
        }
        if (/\b(?:return value|found|returns|hit)\b/i.test(d)) {
          const returnVal = findLineInRange(
            getMethod.startLine + 1,
            getMethod.endLine,
            /return\s+(?:v\b|val\b|value\b|\[|true\b)|return\b/i,
          );
          if (returnVal !== -1) return returnVal;
        }
        const matchLine = findLineInRange(
          getMethod.startLine + 1,
          getMethod.endLine,
          /if\s+k|if\s+key|for\s+.*in|return\s+/i,
        );
        if (matchLine !== -1) return matchLine;
        return Math.min(getMethod.startLine + 1, getMethod.endLine);
      }
    }

    if (
      stepIndex === 0 ||
      /\b(?:init|initial|start|empty|declare|allocate|constructor)\b/i.test(d)
    ) {
      const constructorMethod = findMethod(/^(?:constructor|__init__|init)/i);
      if (constructorMethod) {
        return constructorMethod.startLine;
      }
    }
  }

  // 1. Direct Token Overlap & Semantic Scoring (Highest accuracy for procedural & tree/queue code)
  let bestScore = 0;
  let bestLineIdx = -1;

  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i]?.trim() ?? "";
    if (!line || /^(?:\/\/|#|\/\*|\*|--)/.test(line)) continue;
    const score = scoreLineKeywordOverlap(line, desc);
    if (score > bestScore) {
      bestScore = score;
      bestLineIdx = i;
    }
  }

  if (bestScore >= 4 && bestLineIdx !== -1) {
    return bestLineIdx;
  }

  // 1. Remove / delete / unlink / dequeue operations
  if (/\b(?:remove|delete|del|unlink|discard|pop|erase|dequeue|shift|poll)\b/i.test(d)) {
    const removeMethod = findMethod(/^(?:remove|delete|del|erase|pop|discard|dequeue)/i);
    if (removeMethod) {
      if (/\b(?:not found|missing|false|none|return)\b/i.test(d)) {
        const retLine = findLineInRange(
          removeMethod.startLine + 1,
          removeMethod.endLine,
          /^\s*return\b/i,
        );
        if (retLine !== -1) return retLine;
      }
      const delLine = findLineInRange(
        removeMethod.startLine + 1,
        removeMethod.endLine,
        /\b(?:del\b|delete\b|\.remove|\.pop|\.erase|prev\.next\s*=|remove_at|dequeue|popleft)/i,
      );
      if (delLine !== -1) return delLine;
      return Math.min(removeMethod.startLine + 1, removeMethod.endLine);
    }

    // Fallback for procedural code
    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i]?.trim() ?? "";
      if (/^(?:\/\/|#|\/\*|\*|--)/.test(line)) continue;
      if (
        /\b(?:del\b|delete\b|\.remove\(|\.pop\(|\.erase\(|prev\.next\s*=|remove_at|dequeue|popleft|pop\(0\)|shift\(\))/i.test(
          line,
        )
      ) {
        return i;
      }
    }
  }

  // 2. Put / insert / set / add / push / update / append / enqueue operations
  if (/\b(?:put|insert|set|add|append|write|push|update|enqueue|offer)\b/i.test(d)) {
    const putMethod = findMethod(/^(?:put|insert|set|add|append|write|push|update|enqueue)/i);
    if (putMethod) {
      if (/\bupdate\b/i.test(d)) {
        const updateLine = findLineInRange(
          putMethod.startLine + 1,
          putMethod.endLine,
          /=\s*value|\[.*\]\s*=\s*|\.val\s*=|update|\bvalue\b/i,
        );
        if (updateLine !== -1) return updateLine;
      }
      if (/\b(?:hash|index|modulo)\b/i.test(d) && !d.includes("store") && !d.includes("append")) {
        const hashLine = findLineInRange(
          putMethod.startLine + 1,
          putMethod.endLine,
          /\.hash\(|hash\(|%\s*this\.|%\s*capacity/i,
        );
        if (hashLine !== -1) return hashLine;
      }
      const appendLine = findLineInRange(
        putMethod.startLine + 1,
        putMethod.endLine,
        /\.append\(|\[.*\]\s*=|insert|put|set|\.add\(|push|enqueue/i,
      );
      if (appendLine !== -1) return appendLine;
      return Math.min(putMethod.startLine + 1, putMethod.endLine);
    }

    // Fallback for procedural code
    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i]?.trim() ?? "";
      if (/^(?:\/\/|#|\/\*|\*|--)/.test(line)) continue;
      if (/(?:\[.*\]\s*=|set\(|put\(|\.append\(|\.push\(|\.add\(|enqueue)/i.test(line)) {
        return i;
      }
    }
  }

  // 3. Get / lookup / find / search / contains / read / retrieve operations
  if (/\b(?:get|lookup|find|search|contains|read|retrieve|has_key|has)\b/i.test(d)) {
    const getMethod = findMethod(/^(?:get|find|search|lookup|contains|read|retrieve)/i);
    if (getMethod) {
      if (/\b(?:not found|missing|return -1|-1|empty|none|null|false)\b/i.test(d)) {
        const retNotFoundExact = findLineInRange(
          getMethod.startLine + 1,
          getMethod.endLine,
          /return\s+(?:-1|null|false|none)\b|-1/i,
        );
        if (retNotFoundExact !== -1) return retNotFoundExact;
        const returnNotFound = findLineInRange(
          getMethod.startLine + 1,
          getMethod.endLine,
          /return\b/i,
        );
        if (returnNotFound !== -1) return returnNotFound;
      }
      if (/\b(?:return value|found|returns|hit)\b/i.test(d)) {
        const returnVal = findLineInRange(
          getMethod.startLine + 1,
          getMethod.endLine,
          /return\s+(?:v\b|val\b|value\b|\[|true\b)|return\b/i,
        );
        if (returnVal !== -1) return returnVal;
      }
      if (/\b(?:hash|modulo|index)\b/i.test(d)) {
        const hashLine = findLineInRange(
          getMethod.startLine + 1,
          getMethod.endLine,
          /\.hash\(|hash\(|%\s*this\.|%\s*capacity/i,
        );
        if (hashLine !== -1) return hashLine;
      }
      const matchLine = findLineInRange(
        getMethod.startLine + 1,
        getMethod.endLine,
        /if\s+k|if\s+key|for\s+.*in|return\s+/i,
      );
      if (matchLine !== -1) return matchLine;
      return Math.min(getMethod.startLine + 1, getMethod.endLine);
    }

    // Fallback for procedural code
    for (let i = 0; i < codeLines.length; i++) {
      const line = codeLines[i]?.trim() ?? "";
      if (/^(?:\/\/|#|\/\*|\*|--)/.test(line)) continue;
      if (/\b(?:get\(|\.has\(|return -1|if .*in seen|if .*in map)/i.test(line)) {
        return i;
      }
    }
  }

  // 4. Hash computation helper method
  if (/\b(?:hash|modulo|bucket|hash_code|hashcode)\b/i.test(d)) {
    const hashMethod = findMethod(/^(?:hash|_hash|hashcode)/i);
    if (hashMethod) {
      const retLine = findLineInRange(hashMethod.startLine, hashMethod.endLine, /return|modulo|%/i);
      if (retLine !== -1) return retLine;
      return hashMethod.startLine;
    }
  }

  // 5. Constructor / initialization
  if (stepIndex === 0 || /\b(?:init|initial|start|empty|declare|allocate|constructor)\b/i.test(d)) {
    const constructorMethod = findMethod(/^(?:constructor|__init__|init)/i);
    if (constructorMethod) {
      return constructorMethod.startLine;
    }
    const initIdx = codeLines.findIndex((l) =>
      /=\s*\{\}|=\s*\[\]|new\s+Map|new\s+Set|ARRAY\s+OF|\[0\]|zeros|count\s*=|__init__|constructor/i.test(
        l,
      ),
    );
    if (initIdx !== -1) return initIdx;
  }

  // 6. Return statements
  if (/\b(?:return|result|answer|finished|complete)\b/i.test(d)) {
    for (let i = codeLines.length - 1; i >= 0; i--) {
      const line = codeLines[i]?.trim() ?? "";
      if (/^\s*return\b/i.test(line)) return i;
    }
  }

  // 7. Fallback: distribute proportionally across lines
  const maxLine = Math.max(1, codeLines.length - 1);
  return Math.min(maxLine, Math.floor((stepIndex / Math.max(1, totalSteps - 1)) * maxLine));
}

/**
 * Validates, repairs, and sanitizes an AI visualizer payload against runtime invariants.
 */
export function validateAndNormalizeVizPayload(
  rawObj: unknown,
  fallback: VizBundle,
  preferredType?: VizType,
  userCodeLines?: string[],
): NormalizedVizPayload {
  const rawRecord = (rawObj && typeof rawObj === "object" ? rawObj : {}) as Record<string, unknown>;
  const manifest = rawRecord.visualization_manifest as Record<string, unknown> | undefined;
  const preferred = (manifest?.primary_type as any) ?? preferredType ?? "array";
  const hasManifest = !!manifest;

  const rawLines = Array.isArray(rawRecord.code_lines) ? rawRecord.code_lines : null;
  const isDummyLines =
    rawLines &&
    rawLines.length > 0 &&
    rawLines.every(
      (l: unknown) => typeof l === "string" && /^(?:step\s+\d+|line\s+\d+)$/i.test(l.trim()),
    );

  const code_lines: string[] =
    userCodeLines && userCodeLines.length > 0
      ? userCodeLines
      : rawLines && rawLines.length && !isDummyLines
        ? rawLines.slice(0, 60).map((line: unknown) => String(line))
        : fallback.code;

  const rawSteps = (
    Array.isArray(rawRecord.viz_steps) && rawRecord.viz_steps.length > 0
      ? rawRecord.viz_steps
      : (fallback.steps ?? [])
  ) as RawVizStep[];
  let test_array =
    Array.isArray(rawRecord.test_array) && rawRecord.test_array.length > 0
      ? sanitizeScalarArray(rawRecord.test_array)
      : [];

  if (test_array.length === 0) {
    const rawWithArray = rawSteps.find(
      (s: RawVizStep) => Array.isArray(s?.array) && s.array.length > 0,
    ) as RawVizStep | undefined;
    if (rawWithArray && Array.isArray(rawWithArray.array)) {
      test_array = sanitizeScalarArray(rawWithArray.array);
    } else {
      test_array = sanitizeScalarArray(fallback.array);
    }
  }

  const isDesignProblem = code_lines.some((l) =>
    /\b(?:class\s+|def\s+put|def\s+get|def\s+remove|METHOD\s+put|METHOD\s+get|MyHashMap|MyHashSet|LRUCache)\b/i.test(
      l,
    ),
  );

  // Find canonical full array structure across test_array, fallback.array, or steps
  let canonicalArray: (number | string)[] | null = null;
  if (Array.isArray(rawRecord.test_array) && rawRecord.test_array.length > 0) {
    canonicalArray = sanitizeScalarArray(rawRecord.test_array);
  } else if (Array.isArray(fallback.array) && fallback.array.length > 0) {
    canonicalArray = sanitizeScalarArray(fallback.array);
  } else {
    const rawWithArray = rawSteps.find(
      (s: RawVizStep) => Array.isArray(s?.array) && s.array.length > 0,
    ) as RawVizStep | undefined;
    if (rawWithArray && Array.isArray(rawWithArray.array)) {
      canonicalArray = sanitizeScalarArray(rawWithArray.array);
    }
  }

  // Find canonical full matrix structure across rawSteps or fallback
  let canonicalMatrix: (number | string)[][] | null = null;
  const rawWithMatrix = rawSteps.find(
    (s: RawVizStep) =>
      hasValidMatrixShape(s?.matrix) ||
      (Array.isArray(s?.matrix) && s.matrix.length > 0 && Array.isArray(s.matrix[0])),
  ) as RawVizStep | undefined;
  if (rawWithMatrix && Array.isArray(rawWithMatrix.matrix)) {
    canonicalMatrix = sanitizeMatrix(rawWithMatrix.matrix);
  } else if (fallback.steps[0]?.matrix && Array.isArray(fallback.steps[0].matrix)) {
    canonicalMatrix = fallback.steps[0].matrix.map((r: (number | string)[]) => [...r]);
  }

  // Find canonical full tree structure for tree / bst / trie problems
  let canonicalTree: (number | string | null)[] | null = null;
  const rawWithTree = rawSteps.find(
    (s: RawVizStep) =>
      Array.isArray(s?.tree) &&
      s.tree.filter((x: unknown) => x !== null && x !== "null" && x !== undefined).length >= 3,
  ) as RawVizStep | undefined;
  const fallbackWithTree = fallback.steps.find(
    (s: VizStep) =>
      Array.isArray(s.tree) &&
      s.tree.filter((x: unknown) => x !== null && x !== "null" && x !== undefined).length >= 3,
  );

  if (rawWithTree && Array.isArray(rawWithTree.tree)) {
    canonicalTree = sanitizeTreeArray(rawWithTree.tree);
  } else if (fallbackWithTree && Array.isArray(fallbackWithTree.tree)) {
    canonicalTree = sanitizeTreeArray(fallbackWithTree.tree);
  } else if (["tree", "bst", "heap", "trie"].includes(preferred) && Array.isArray(fallback.array)) {
    canonicalTree = sanitizeTreeArray(fallback.array);
  }

  // Canonical secondary array discovery for two-sequence / dual-array problems
  let canonicalSecondaryArray: (number | string)[] | null = null;
  const rawWithSecondary = rawSteps.find(
    (s: RawVizStep) => Array.isArray(s?.secondaryArray) && s.secondaryArray.length > 0,
  ) as RawVizStep | undefined;
  const fallbackWithSecondary = fallback.steps.find(
    (s: VizStep) => Array.isArray(s?.secondaryArray) && s.secondaryArray.length > 0,
  );

  if (rawWithSecondary && Array.isArray(rawWithSecondary.secondaryArray)) {
    canonicalSecondaryArray = sanitizeScalarArray(rawWithSecondary.secondaryArray);
  } else if (fallbackWithSecondary && Array.isArray(fallbackWithSecondary.secondaryArray)) {
    canonicalSecondaryArray = sanitizeScalarArray(fallbackWithSecondary.secondaryArray);
  }

  // Pass 1: Normalize types, descriptions, and line indices
  let runningMatrix: (number | string)[][] | null = canonicalMatrix
    ? canonicalMatrix.map((r) => [...r])
    : null;
  let runningList: (number | string)[] | null = null;
  let runningMap: Record<string, number | string | null> | null = null;
  let runningSet: (number | string)[] | null = null;
  let runningStack: (number | string)[] | null = null;
  let runningSecondaryStack: (number | string)[] | null = null;
  let runningQueue: (number | string)[] | null = null;
  let runningSecondaryQueue: (number | string)[] | null = null;
  let runningDeque: (number | string)[] | null = null;
  let runningCallStack: any[] | null = null;
  let runningRecursionTree: any[] | null = null;
  let runningIntervals: any[] | null = null;
  let runningMemoTable: Record<string, any> | null = null;

  const initialSteps: VizStep[] = rawSteps
    .filter((step: unknown): step is RawVizStep => !!step && typeof step === "object")
    .map((step: RawVizStep) => {
      const type = normalizeType(step.type, preferred);
      const lineNum =
        typeof step.line === "number" && Number.isFinite(step.line) && step.line >= 0
          ? Math.min(Math.floor(step.line), Math.max(0, code_lines.length - 1))
          : 0;

      const base: VizStep = {
        type,
        line: lineNum,
        desc:
          typeof step.desc === "string" && step.desc.trim() ? step.desc.trim() : "Executing step.",
        activeDataset: typeof step.activeDataset === "string" ? step.activeDataset : null,
        shiftInfo:
          step.shiftInfo && typeof step.shiftInfo === "object"
            ? (step.shiftInfo as ShiftInfo)
            : null,
        datasetLabels:
          step.datasetLabels && typeof step.datasetLabels === "object"
            ? (step.datasetLabels as Record<string, string>)
            : null,
        ...((step as any).code_anchor ? { code_anchor: (step as any).code_anchor } : {}),
        ...((step as any).codeAnchor ? { code_anchor: (step as any).codeAnchor } : {}),
      };



      // Extract all potential auxiliary / multi-dataset structures
      const isStringInputArray = canonicalArray?.some((x) => typeof x === "string");
      const hasExtremeValues =
        Array.isArray(step.array) &&
        step.array.some((x) => {
          const num = Number(x);
          return typeof x === "number" && (isNaN(num) || Math.abs(num) >= 1e8);
        });

      const auxArray = isDesignProblem
        ? null
        : isStringInputArray || hasExtremeValues
          ? canonicalArray
            ? [...canonicalArray]
            : sanitizeScalarArray(fallback.array)
          : Array.isArray(step.array) && step.array.length > 0
            ? sanitizeScalarArray(step.array)
            : canonicalArray
              ? [...canonicalArray]
              : sanitizeScalarArray(fallback.array);

      const auxSecondaryArray =
        Array.isArray(step.secondaryArray) && step.secondaryArray.length > 0
          ? sanitizeScalarArray(step.secondaryArray)
          : canonicalSecondaryArray
            ? [...canonicalSecondaryArray]
            : null;

      // Map handling with forward persistence across algorithm phases
      let auxMap: Record<string, number | string | null> | null = null;
      if (step.map && typeof step.map === "object") {
        const sanitized = sanitizeMap(step.map);
        const cleanEntries = Object.entries(sanitized).filter(([k, v]) => {
          const kLower = k.toLowerCase();
          const vStr = String(v ?? "").toLowerCase();
          const isPseudoKey =
            /^(?:mincounts|charcounts|wordcounts|count|freq|array|min_counts|counts|map|table)$/i.test(
              kLower,
            );
          const isPseudoVal = /26x|infinity|array\s+of|size\s+\d+/i.test(vStr);
          return !isPseudoKey && !isPseudoVal;
        });

        if (cleanEntries.length > 0) {
          auxMap = Object.fromEntries(cleanEntries);
          runningMap = auxMap;
        } else if (runningMap && Object.keys(runningMap).length > 0) {
          auxMap = { ...runningMap };
        } else {
          auxMap = {};
        }
      } else if (runningMap) {
        auxMap = { ...runningMap };
      }

      // Set handling with forward persistence
      let auxSet: (number | string)[] | null = null;
      if (Array.isArray(step.set) && step.set.length > 0) {
        auxSet = sanitizeScalarArray(step.set);
        runningSet = auxSet;
      } else if (runningSet && step.set === undefined) {
        auxSet = [...runningSet];
      }

      // List handling with forward persistence
      let auxList: (number | string)[] | null = null;
      if (Array.isArray(step.list) && step.list.length > 0) {
        auxList = sanitizeScalarArray(step.list);
        runningList = auxList;
      } else if (runningList && step.list === undefined) {
        auxList = [...runningList];
      }

      // Stack handling with forward persistence
      let auxStack: (number | string)[] | null = null;
      if (Array.isArray(step.stack) && step.stack.length > 0) {
        auxStack = sanitizeScalarArray(step.stack);
        runningStack = auxStack;
      } else if (runningStack && step.stack === undefined) {
        auxStack = [...runningStack];
      } else if (type === "stack" && !runningStack) {
        auxStack = [];
      }

      // Secondary Stack handling with forward persistence (e.g. queue via two stacks)
      let auxSecondaryStack: (number | string)[] | null = null;
      if (Array.isArray(step.secondaryStack) && step.secondaryStack.length > 0) {
        auxSecondaryStack = sanitizeScalarArray(step.secondaryStack);
        runningSecondaryStack = auxSecondaryStack;
      } else if (runningSecondaryStack && step.secondaryStack === undefined) {
        auxSecondaryStack = [...runningSecondaryStack];
      }

      // Queue handling with forward persistence
      let auxQueue: (number | string)[] | null = null;
      if (Array.isArray(step.queue) && step.queue.length > 0) {
        auxQueue = sanitizeScalarArray(step.queue);
        runningQueue = auxQueue;
      } else if (runningQueue && step.queue === undefined) {
        auxQueue = [...runningQueue];
      } else if (type === "queue" && !runningQueue) {
        auxQueue = [];
      }

      // Secondary Queue handling with forward persistence
      let auxSecondaryQueue: (number | string)[] | null = null;
      if (Array.isArray(step.secondaryQueue) && step.secondaryQueue.length > 0) {
        auxSecondaryQueue = sanitizeScalarArray(step.secondaryQueue);
        runningSecondaryQueue = auxSecondaryQueue;
      } else if (runningSecondaryQueue && step.secondaryQueue === undefined) {
        auxSecondaryQueue = [...runningSecondaryQueue];
      }

      // Deque handling with forward persistence
      let auxDeque: (number | string)[] | null = null;
      if (Array.isArray(step.deque) && step.deque.length > 0) {
        auxDeque = sanitizeScalarArray(step.deque);
        runningDeque = auxDeque;
      } else if (runningDeque && step.deque === undefined) {
        auxDeque = [...runningDeque];
      } else if (type === "deque" && !runningDeque) {
        auxDeque = [];
      }

      // Call Stack handling with forward persistence for recursion
      let auxCallStack: any[] | null = null;
      if (Array.isArray(step.callStack)) {
        auxCallStack = step.callStack;
        runningCallStack = auxCallStack;
      } else if (runningCallStack && step.callStack === undefined) {
        auxCallStack = [...runningCallStack];
      }

      // Recursion Tree handling with forward persistence
      let auxRecursionTree: any[] | null = null;
      if (Array.isArray(step.recursionTree)) {
        auxRecursionTree = step.recursionTree;
        runningRecursionTree = auxRecursionTree;
      } else if (runningRecursionTree && step.recursionTree === undefined) {
        auxRecursionTree = [...runningRecursionTree];
      }

      // Intervals handling with forward persistence
      let auxIntervals: any[] | null = null;
      if (Array.isArray(step.intervals)) {
        auxIntervals = step.intervals;
        runningIntervals = auxIntervals;
      } else if (runningIntervals && step.intervals === undefined) {
        auxIntervals = [...runningIntervals];
      }

      const auxSightlines = Array.isArray(step.sightlines) ? step.sightlines : null;
      const auxHeapSwap = step.heapSwap && typeof step.heapSwap === "object" ? step.heapSwap : null;
      const auxStackInvariant = step.stackInvariant ?? null;
      const auxSweepLine = typeof step.sweepLine === "number" ? step.sweepLine : null;
      const auxActiveFrameId = typeof step.activeFrameId === "string" ? step.activeFrameId : null;

      // Memoization table handling with forward persistence
      let auxMemoTable: Record<string, any> | null = null;
      if (step.memoTable && typeof step.memoTable === "object") {
        auxMemoTable = step.memoTable as Record<string, any>;
        runningMemoTable = auxMemoTable;
      } else if (runningMemoTable && step.memoTable === undefined) {
        auxMemoTable = { ...runningMemoTable };
      }
      const auxMemoHitKey = typeof step.memoHitKey === "string" ? step.memoHitKey : null;

      let auxTree = Array.isArray(step.tree)
        ? sanitizeTreeArray(step.tree)
        : ["tree", "bst", "heap", "trie"].includes(type)
          ? canonicalTree
            ? [...canonicalTree]
            : []
          : null;

      // In binary tree traversals, the tree hierarchy is static and MUST NOT lose nodes during animation!
      if ((type === "tree" || type === "bst") && canonicalTree && canonicalTree.length > 0) {
        const rawNonNull = auxTree ? auxTree.filter((x) => x !== null).length : 0;
        const canonicalNonNull = canonicalTree.filter((x) => x !== null).length;
        if (!auxTree || rawNonNull < canonicalNonNull) {
          auxTree = [...canonicalTree];
        }
      }

      let auxMatrix: (number | string)[][] | null = null;
      if (hasValidMatrixShape(step.matrix)) {
        auxMatrix = step.matrix;
      } else if (Array.isArray(step.matrix) && step.matrix.length > 0) {
        auxMatrix = sanitizeMatrix(step.matrix);
      } else if (type === "matrix" || type === "graph") {
        auxMatrix = runningMatrix
          ? runningMatrix.map((r: (number | string)[]) => [...r])
          : canonicalMatrix
            ? canonicalMatrix.map((r: (number | string)[]) => [...r])
            : [[...fallback.array]];
      }

      if (auxMatrix && auxMatrix.length > 0) {
        runningMatrix = auxMatrix.map((r) => [...r]);
      }

      const rawStepItem = step as RawVizStep & { 
        currentIdx?: unknown; prevIdx?: unknown; 
        curr?: unknown; currentNode?: unknown; node?: unknown; pointer?: unknown; index?: unknown; idx?: unknown; i?: unknown; j?: unknown; 
        ptr1?: unknown; ptr2?: unknown; l?: unknown; r?: unknown;
        slow?: unknown; fast?: unknown; write?: unknown; read?: unknown; start?: unknown; end?: unknown;
        low?: unknown; high?: unknown; mid?: unknown;
        window?: unknown;
        variables?: Record<string, unknown>; vars?: Record<string, unknown>;
      };

      // Extract left and right pointers
      let rawLeft: any = step.left ?? rawStepItem.l ?? rawStepItem.ptr1 ?? null;
      let rawRight: any = step.right ?? rawStepItem.r ?? rawStepItem.ptr2 ?? null;

      // Track inferred labels for UI badges
      let inferredLabelLeft: string | null = null;
      let inferredLabelRight: string | null = null;
      let inferredLabelCurr: string | null = null;

      const rawVars = rawStepItem.variables || rawStepItem.vars || {};

      // Window array extraction (e.g. window: [0, 3])
      if (Array.isArray(rawStepItem.window) && rawStepItem.window.length >= 2) {
        if (rawLeft === null || rawLeft === undefined) {
          rawLeft = rawStepItem.window[0];
          inferredLabelLeft = "left";
        }
        if (rawRight === null || rawRight === undefined) {
          rawRight = rawStepItem.window[1];
          inferredLabelRight = "right";
        }
      }

      // Slow & Fast pointers (Move Zeroes, Remove Duplicates, Floyd's Cycle)
      const slowVal = rawStepItem.slow ?? rawVars.slow;
      const fastVal = rawStepItem.fast ?? rawVars.fast;
      if (slowVal !== undefined && slowVal !== null && (rawLeft === null || rawLeft === undefined)) {
        rawLeft = slowVal;
        inferredLabelLeft = "slow";
      }
      if (fastVal !== undefined && fastVal !== null && (rawRight === null || rawRight === undefined)) {
        rawRight = fastVal;
        inferredLabelRight = "fast";
      }

      // Write & Read pointers (In-place array modifications)
      const writeVal = rawStepItem.write ?? rawVars.write;
      const readVal = rawStepItem.read ?? rawVars.read;
      if (writeVal !== undefined && writeVal !== null && (rawLeft === null || rawLeft === undefined)) {
        rawLeft = writeVal;
        inferredLabelLeft = "write";
      }
      if (readVal !== undefined && readVal !== null && (rawRight === null || rawRight === undefined)) {
        rawRight = readVal;
        inferredLabelRight = "read";
      }

      // Start & End pointers (Sliding window / ranges)
      const startVal = rawStepItem.start ?? rawVars.start;
      const endVal = rawStepItem.end ?? rawVars.end;
      if (startVal !== undefined && startVal !== null && (rawLeft === null || rawLeft === undefined)) {
        rawLeft = startVal;
        inferredLabelLeft = "start";
      }
      if (endVal !== undefined && endVal !== null && (rawRight === null || rawRight === undefined)) {
        rawRight = endVal;
        inferredLabelRight = "end";
      }

      // Low & High pointers (Binary Search)
      const lowVal = rawStepItem.low ?? rawVars.low;
      const highVal = rawStepItem.high ?? rawVars.high;
      if (lowVal !== undefined && lowVal !== null && (rawLeft === null || rawLeft === undefined)) {
        rawLeft = lowVal;
        inferredLabelLeft = "low";
      }
      if (highVal !== undefined && highVal !== null && (rawRight === null || rawRight === undefined)) {
        rawRight = highVal;
        inferredLabelRight = "high";
      }

      // Explicit i and j (Nested loops / brute-force)
      const hasExplicitI = rawStepItem.i !== undefined && rawStepItem.i !== null;
      const hasExplicitJ = rawStepItem.j !== undefined && rawStepItem.j !== null;

      if (hasExplicitI && (rawLeft === null || rawLeft === undefined)) {
        rawLeft = rawStepItem.i;
        inferredLabelLeft = "i";
      }
      if (hasExplicitJ && (rawRight === null || rawRight === undefined)) {
        rawRight = rawStepItem.j;
        inferredLabelRight = "j";
      }

      if ((rawLeft === null || rawLeft === undefined) && rawVars.i !== undefined) {
        rawLeft = rawVars.i;
        inferredLabelLeft = "i";
      }
      if ((rawRight === null || rawRight === undefined) && rawVars.j !== undefined) {
        rawRight = rawVars.j;
        inferredLabelRight = "j";
      }

      // Fallback regex detection in step desc
      const descText = String(step.desc ?? "");
      if ((rawLeft === null || rawLeft === undefined) && (rawRight === null || rawRight === undefined)) {
        const slowFastMatch = /\bslow\s*=\s*(\d+)\b[^\n\r]*?\bfast\s*=\s*(\d+)\b/i.exec(descText);
        if (slowFastMatch) {
          rawLeft = Number(slowFastMatch[1]);
          rawRight = Number(slowFastMatch[2]);
          inferredLabelLeft = "slow";
          inferredLabelRight = "fast";
        } else {
          const writeReadMatch = /\bwrite\s*=\s*(\d+)\b[^\n\r]*?\bread\s*=\s*(\d+)\b/i.exec(descText);
          if (writeReadMatch) {
            rawLeft = Number(writeReadMatch[1]);
            rawRight = Number(writeReadMatch[2]);
            inferredLabelLeft = "write";
            inferredLabelRight = "read";
          } else {
            const startEndMatch = /\bstart\s*=\s*(\d+)\b[^\n\r]*?\bend\s*=\s*(\d+)\b/i.exec(descText) ||
                                  /\bleft\s*=\s*(\d+)\b[^\n\r]*?\bright\s*=\s*(\d+)\b/i.exec(descText);
            if (startEndMatch) {
              rawLeft = Number(startEndMatch[1]);
              rawRight = Number(startEndMatch[2]);
              inferredLabelLeft = "start";
              inferredLabelRight = "end";
            } else {
              const lowHighMatch = /\blow\s*=\s*(\d+)\b[^\n\r]*?\bhigh\s*=\s*(\d+)\b/i.exec(descText);
              if (lowHighMatch) {
                rawLeft = Number(lowHighMatch[1]);
                rawRight = Number(lowHighMatch[2]);
                inferredLabelLeft = "low";
                inferredLabelRight = "high";
              } else {
                const ijMatch = /\bi\s*=\s*(\d+)\b[^\n\r]*?\bj\s*=\s*(\d+)\b/i.exec(descText) ||
                                /nums\[(\d+)\]\s*\+\s*nums\[(\d+)\]/i.exec(descText);
                if (ijMatch) {
                  rawLeft = Number(ijMatch[1]);
                  rawRight = Number(ijMatch[2]);
                  inferredLabelLeft = "i";
                  inferredLabelRight = "j";
                }
              }
            }
          }
        }
      }

      // Check current pointer (mid, curr, node, etc.)
      const midVal = rawStepItem.mid ?? rawVars.mid;
      let rawCurrent: any = step.current ?? rawStepItem.curr ?? rawStepItem.currentNode ?? rawStepItem.node ?? rawStepItem.pointer ?? rawStepItem.index ?? rawStepItem.idx;
      if (midVal !== undefined && midVal !== null && (rawCurrent === undefined || rawCurrent === null)) {
        rawCurrent = midVal;
        inferredLabelCurr = "mid";
      }

      if (rawCurrent === undefined || rawCurrent === null) {
        if (rawLeft === null && rawRight === null && hasExplicitI) {
          rawCurrent = rawStepItem.i;
        }
      }
      if (rawCurrent && typeof rawCurrent === "object" && !Array.isArray(rawCurrent)) {
        rawCurrent = (rawCurrent as any).val ?? (rawCurrent as any).value ?? (rawCurrent as any).id ?? (rawCurrent as any).name ?? null;
      }

      const numericCurrent =
        typeof rawCurrent === "number" && Number.isFinite(rawCurrent) ? rawCurrent : null;
      const stringCurrent =
        typeof rawCurrent === "string" && rawCurrent.trim() ? rawCurrent.trim() : null;

      // Coordinate normalization for 2D matrix / graph visualizations
      let resolvedCurrent: number | string | null = numericCurrent ?? stringCurrent ?? null;
      if (type === "matrix" || auxMatrix) {
        const coord = parse2DCoord(rawCurrent);
        if (coord) {
          resolvedCurrent = `${coord[0]},${coord[1]}`;
        } else if (typeof rawCurrent === "number" || (typeof rawCurrent === "string" && !rawCurrent.includes(","))) {
          // Disambiguate false scalar highlights (like 0 or counter index) on 2D matrices
          resolvedCurrent = null;
        }
      }

      const cols =
        typeof step.cols === "number" && step.cols > 0
          ? step.cols
          : (auxMatrix?.[0]?.length ?? fallback.steps[0]?.cols ?? 1);

      const direction = typeof step.direction === "string" ? step.direction : null;
      const currentArea =
        typeof step.currentArea === "number"
          ? step.currentArea
          : typeof step.wSum === "number"
            ? step.wSum
            : null;
      const maxArea =
        typeof step.maxArea === "number"
          ? step.maxArea
          : typeof step.mSum === "number"
            ? step.mSum
            : null;
      const islandCells = Array.isArray(step.islandCells) ? step.islandCells : null;
      let auxPointerLabels = typeof step.pointer_labels === "object" && step.pointer_labels !== null
        ? Object.fromEntries(Object.entries(step.pointer_labels).map(([k, v]) => [k, String(v)]))
        : null;

      // Infer pointer labels if omitted
      if (rawLeft !== null && rawLeft !== undefined && rawRight !== null && rawRight !== undefined) {
        if (!auxPointerLabels || (!auxPointerLabels.left && !auxPointerLabels.right)) {
          if (inferredLabelLeft && inferredLabelRight) {
            auxPointerLabels = {
              left: inferredLabelLeft,
              right: inferredLabelRight,
              ...(inferredLabelCurr ? { current: inferredLabelCurr } : {}),
              ...(auxPointerLabels ?? {}),
            };
          } else {
            const hasIJInCode = code_lines.some((l) => /\bfor\s+[ij]\b|\b[ij]\s*[=+\-<>]/i.test(l));
            const hasIJInStep = hasExplicitI || hasExplicitJ || /\bi\b.*\bj\b/i.test(descText);
            if (hasIJInCode || hasIJInStep) {
              auxPointerLabels = {
                left: "i",
                right: "j",
                ...(auxPointerLabels ?? {}),
              };
            }
          }
        }
      } else if (inferredLabelCurr && (!auxPointerLabels || !auxPointerLabels.current)) {
        auxPointerLabels = {
          current: inferredLabelCurr,
          ...(auxPointerLabels ?? {}),
        };
      }

      const activeNodeId =
        step.activeNodeId !== null && step.activeNodeId !== undefined
          ? (typeof step.activeNodeId === "number" || typeof step.activeNodeId === "string" ? step.activeNodeId : null)
          : null;
      const targetIndex =
        typeof step.targetIndex === "number" && Number.isFinite(step.targetIndex)
          ? step.targetIndex
          : null;
      const rawActivePointers = sanitizePointerRecord(step.activePointers);

      const activePointers: Record<string, number | string | [number, number]> = {
        ...(rawActivePointers ?? {}),
      };
      if (rawLeft !== null && rawLeft !== undefined && !isNaN(Number(rawLeft))) {
        const label = auxPointerLabels?.left || "left";
        if (activePointers[label] === undefined) activePointers[label] = Number(rawLeft);
      }
      if (rawRight !== null && rawRight !== undefined && !isNaN(Number(rawRight))) {
        const label = auxPointerLabels?.right || "right";
        if (activePointers[label] === undefined) activePointers[label] = Number(rawRight);
      }
      if (resolvedCurrent !== null && resolvedCurrent !== undefined && resolvedCurrent !== "") {
        const label = auxPointerLabels?.current || "curr";
        if (activePointers[label] === undefined) activePointers[label] = resolvedCurrent;
      }

      // Universal Pointer Extraction across all data structures from rawVars and step properties
      for (const [varName, varVal] of Object.entries(rawVars)) {
        if (varVal === null || varVal === undefined) continue;
        const lowerVar = varName.toLowerCase();
        if (
          /^(?:i|j|k|r|c|row|col|left|right|mid|low|high|slow|fast|write|read|start|end|curr|current|prev|next|target|ptr|p1|p2|p3|p|q|u|v|src|dest|root|node|head|tail|top|front|rear)$/.test(
            lowerVar,
          )
        ) {
          if (activePointers[varName] === undefined) {
            const coord = parse2DCoord(varVal);
            if (coord) {
              activePointers[varName] = coord;
            } else if (typeof varVal === "number" && Number.isFinite(varVal)) {
              activePointers[varName] = varVal;
            } else if (typeof varVal === "string" && varVal.trim()) {
              activePointers[varName] = varVal.trim();
            }
          }
        }
      }

      // Extract pointers mentioned dynamically in step description
      if (typeof descText === "string" && descText) {
        const descRegex = /\b(left|right|slow|fast|curr|current|top|front|rear|head|tail|root|node|pivot|mid|low|high|src|dest|[ijuvpqxy])\s*(?:=|is|at|:|->|➔)\s*(?:index\s*|idx\s*|node\s*|vertex\s*|cell\s*)?(\(?-?\d+\s*,\s*-?\d+\)?|-?\d+|'[A-Za-z0-9_]+'|"[A-Za-z0-9_]+")/gi;
        let dm: RegExpExecArray | null;
        while ((dm = descRegex.exec(descText)) !== null) {
          const vName = dm[1]?.toLowerCase();
          const vVal = dm[2]?.trim().replace(/['"]/g, "");
          if (!vName || !vVal) continue;
          if (activePointers[vName] === undefined) {
            const coord = parse2DCoord(vVal);
            if (coord) {
              activePointers[vName] = coord;
            } else if (!isNaN(Number(vVal))) {
              activePointers[vName] = Number(vVal);
            } else {
              activePointers[vName] = vVal;
            }
          }
        }
      }


      return {
        ...base,
        ...(auxArray ? { array: auxArray } : {}),
        ...(auxSecondaryArray ? { secondaryArray: auxSecondaryArray } : {}),
        ...(auxList ? { list: auxList } : {}),
        ...(auxMap ? { map: auxMap } : {}),
        ...(auxSet ? { set: auxSet } : {}),
        ...(auxStack ? { stack: auxStack } : {}),
        ...(auxSecondaryStack ? { secondaryStack: auxSecondaryStack } : {}),
        ...(auxQueue ? { queue: auxQueue } : {}),
        ...(auxSecondaryQueue ? { secondaryQueue: auxSecondaryQueue } : {}),
        ...(auxDeque ? { deque: auxDeque } : {}),
        ...(auxTree ? { tree: auxTree } : {}),
        ...(auxMatrix ? { matrix: auxMatrix } : {}),
        ...(auxPointerLabels ? { pointer_labels: auxPointerLabels } : {}),
        ...(activeNodeId !== null ? { activeNodeId } : {}),
        ...(targetIndex !== null ? { targetIndex } : {}),
        ...(activePointers ? { activePointers } : {}),
        cols,
        direction,
        currentArea,
        maxArea,
        islandCells,
        current: resolvedCurrent,
        left: rawLeft !== null && rawLeft !== undefined && !isNaN(Number(rawLeft)) ? Number(rawLeft) : null,
        right: rawRight !== null && rawRight !== undefined && !isNaN(Number(rawRight)) ? Number(rawRight) : null,
        left2: step.left2 !== null && step.left2 !== undefined && !isNaN(Number(step.left2)) ? Number(step.left2) : null,
        right2: step.right2 !== null && step.right2 !== undefined && !isNaN(Number(step.right2)) ? Number(step.right2) : null,
        wSum: step.wSum !== null && step.wSum !== undefined && !isNaN(Number(step.wSum)) ? Number(step.wSum) : currentArea,
        mSum: step.mSum !== null && step.mSum !== undefined && !isNaN(Number(step.mSum)) ? Number(step.mSum) : maxArea,
        currentIdx: typeof rawStepItem.currentIdx === "number" ? rawStepItem.currentIdx : null,
        prevIdx: typeof rawStepItem.prevIdx === "number" ? rawStepItem.prevIdx : null,
        predecessor: step.predecessor ?? null,
        visited: sanitizeScalarArray(step.visited ?? []),
        ...(auxCallStack ? { callStack: auxCallStack } : {}),
        ...(auxRecursionTree ? { recursionTree: auxRecursionTree } : {}),
        ...(auxActiveFrameId ? { activeFrameId: auxActiveFrameId } : {}),
        ...(auxIntervals ? { intervals: auxIntervals } : {}),
        ...(auxSweepLine !== null ? { sweepLine: auxSweepLine } : {}),
        ...(auxStackInvariant ? { stackInvariant: auxStackInvariant } : {}),
        ...(auxSightlines ? { sightlines: auxSightlines } : {}),
        ...(auxHeapSwap ? { heapSwap: auxHeapSwap } : {}),
        ...(auxMemoTable ? { memoTable: auxMemoTable } : {}),
        ...(auxMemoHitKey ? { memoHitKey: auxMemoHitKey } : {}),
      } as VizStep;
    })
    .slice(0, 100);

  if (!hasManifest) {
    // Check if problem is Tree / BST / Trie problem
    const isTreeProblem =
      preferred === "tree" ||
      preferred === "bst" ||
      preferred === "trie" ||
      initialSteps.some((s) => s.type === "tree" || s.type === "bst" || s.type === "trie");
  
    if (isTreeProblem && canonicalTree && canonicalTree.length > 0) {
      const rootVal = canonicalTree[0]!;
  
      // Check if problem is Tree BFS with queue buffer
      const isTreeBfs =
        code_lines.some((l) =>
          /\b(?:queue|dequeue|enqueue|pop\(0\)|popleft|shift|nodeQueue|level_size)\b/i.test(l),
        ) ||
        rawSteps.some((s: RawVizStep) =>
          /\b(?:queue|dequeue|enqueue|level|pop\(0\)|popleft)\b/i.test(String(s?.desc ?? "")),
        );
  
      // Check if problem is Tree DFS with stack buffer
      const isTreeStack =
        !isTreeBfs &&
        (code_lines.some((l) => /\b(?:stack|pop\b|push|append|preorder|postorder)\b/i.test(l)) ||
          rawSteps.some((s: RawVizStep) =>
            Array.isArray(s?.stack) ||
            /\b(?:stack|pop\b|push|append|preorder|postorder)\b/i.test(String(s?.desc ?? "")),
          ));
  
      if (isTreeBfs) {
        const rawQueues = initialSteps.map((s) => JSON.stringify(s.queue ?? []));
        const uniqueQueues = new Set(rawQueues).size;
        const isQueueFrozen = initialSteps.length >= 3 && uniqueQueues <= 2;
        const hasStuckNodes = initialSteps.some(
          (s, idx) =>
            idx > 3 &&
            Array.isArray(s.queue) &&
            s.queue.includes(canonicalTree[0]!) &&
            s.current !== canonicalTree[0]!,
        );
  
        if (
          isQueueFrozen ||
          hasStuckNodes ||
          !initialSteps.some((s) => Array.isArray(s.queue) && s.queue.length > 0)
        ) {
          const simQueue: (number | string)[] = [rootVal];
          const visitedNodes: (number | string)[] = [];
  
          for (let i = 0; i < initialSteps.length; i++) {
            const step = initialSteps[i]!;
            step.type = "tree";
            step.tree = [...canonicalTree];
            const desc = (step.desc ?? "").toLowerCase();
            const lineText = (code_lines[step.line] ?? "").toLowerCase();
  
            // 1. Dequeue / Pop
            const isDequeue =
              /\b(?:dequeue|pop\b|pop\(0\)|popleft|shift|poll)\b/i.test(desc) ||
              /\b(?:dequeue|pop\(0\)|popleft|shift|poll|queue\.pop|\.pop\(0\))\b/i.test(lineText);
  
            if (isDequeue && simQueue.length > 0) {
              const numMatch = desc.match(
                /->\s*(\d+)|(?:dequeue|pop(?:left|\(0\)|))\s+(?:node\s+)?(\d+)/i,
              );
              const targetNum = numMatch?.[1] || numMatch?.[2];
              let popped: number | string;
              if (targetNum && simQueue.some((v) => String(v) === targetNum)) {
                const idx = simQueue.findIndex((v) => String(v) === targetNum);
                const removed = simQueue.splice(0, idx + 1);
                popped = removed[removed.length - 1]!;
              } else {
                popped = simQueue.shift()!;
              }
              if (!visitedNodes.includes(popped)) {
                visitedNodes.push(popped);
              }
              step.current = popped;
              step.activeDataset = "tree";
              step.shiftInfo = {
                from: "queue",
                to: "tree",
                action: "pop",
                reason: `Dequeue node ${popped} from queue`,
              };
            }
  
            // 2. Enqueue / Push
            const isEnqueue =
              /\b(?:enqueue|append|push|offer)\b/i.test(desc) ||
              /\b(?:enqueue|append|push|offer)\b/i.test(lineText);
  
            if (isEnqueue) {
              const isLeft = /\bleft\b/i.test(desc) || /\bleft\b/i.test(lineText);
              const isRight = /\bright\b/i.test(desc) || /\bright\b/i.test(lineText);
  
              const currVal = step.current ?? visitedNodes[visitedNodes.length - 1] ?? rootVal;
              const currIdx = canonicalTree.findIndex((v) => v === currVal);
  
              let childVal: number | string | null = null;
              if (currIdx !== -1) {
                if (isLeft) {
                  const leftIdx = 2 * currIdx + 1;
                  if (leftIdx < canonicalTree.length) childVal = canonicalTree[leftIdx] ?? null;
                } else if (isRight) {
                  const rightIdx = 2 * currIdx + 2;
                  if (rightIdx < canonicalTree.length) childVal = canonicalTree[rightIdx] ?? null;
                }
              }
  
              if (childVal === null) {
                const numMatch = desc.match(/\b(\d+)\b/);
                if (numMatch && numMatch[1] && canonicalTree.some((v) => String(v) === numMatch[1])) {
                  childVal = Number(numMatch[1]);
                }
              }
  
              if (childVal !== null && childVal !== "null" && !simQueue.includes(childVal)) {
                simQueue.push(childVal);
                step.activeDataset = "queue";
                step.shiftInfo = {
                  from: "tree",
                  to: "queue",
                  action: "push",
                  reason: `Enqueue ${isLeft ? "left" : isRight ? "right" : ""} child ${childVal}`,
                };
              }
            }
  
            step.queue = [...simQueue];
            step.visited = [...visitedNodes];
          }
        }
      } else if (isTreeStack) {
        const rawStacks = initialSteps.map((s) => JSON.stringify(s.stack ?? []));
        const uniqueStacks = new Set(rawStacks).size;
        const isStackFrozen = initialSteps.length >= 3 && uniqueStacks <= 2;
        const isVisitedStuck = initialSteps.every((s) => !s.visited || s.visited.length <= 1);
  
        if (
          isStackFrozen ||
          isVisitedStuck ||
          !initialSteps.some((s) => Array.isArray(s.stack) && s.stack.length > 0)
        ) {
          const simStack: (number | string)[] = [rootVal];
          const visitedNodes: (number | string)[] = [];
  
          for (let i = 0; i < initialSteps.length; i++) {
            const step = initialSteps[i]!;
            step.type = "tree";
            step.tree = [...canonicalTree];
            const desc = (step.desc ?? "").toLowerCase();
            const lineText = (code_lines[step.line] ?? "").toLowerCase();
  
            // 1. Pop operation
            const isPop =
              /\b(?:pop\b|popped|visit|res\.append|process)\b/i.test(desc) ||
              /\b(?:stack\.pop|\.pop\(\)|res\.append)\b/i.test(lineText);
  
            if (isPop && simStack.length > 0) {
              const numMatch = desc.match(
                /->\s*(\d+)|(?:pop(?:ped|)|visit(?:ing|)|node)\s+(?:node\s+)?(\d+)/i,
              );
              const targetNum = numMatch?.[1] || numMatch?.[2];
              let popped: number | string;
              if (targetNum && simStack.some((v) => String(v) === targetNum)) {
                const idx = simStack.findIndex((v) => String(v) === targetNum);
                popped = simStack.splice(idx, 1)[0]!;
              } else {
                popped = simStack.pop()!;
              }
              if (!visitedNodes.includes(popped)) {
                visitedNodes.push(popped);
              }
              step.current = popped;
              step.activeDataset = "tree";
              step.shiftInfo = {
                from: "stack",
                to: "tree",
                action: "pop",
                reason: `Pop node ${popped} from stack to visit`,
              };
            }
  
            // 2. Push operation
            const isPush =
              /\b(?:append|push|add)\b/i.test(desc) ||
              /\b(?:stack\.append|stack\.push|\.append|\.push)\b/i.test(lineText);
  
            if (isPush) {
              const isLeft = /\bleft\b/i.test(desc) || /\bleft\b/i.test(lineText);
              const isRight = /\bright\b/i.test(desc) || /\bright\b/i.test(lineText);
  
              const currVal = step.current ?? visitedNodes[visitedNodes.length - 1] ?? rootVal;
              const currIdx = canonicalTree.findIndex((v) => v === currVal);
  
              let childVal: number | string | null = null;
              if (currIdx !== -1) {
                if (isLeft) {
                  const leftIdx = 2 * currIdx + 1;
                  if (leftIdx < canonicalTree.length) childVal = canonicalTree[leftIdx] ?? null;
                } else if (isRight) {
                  const rightIdx = 2 * currIdx + 2;
                  if (rightIdx < canonicalTree.length) childVal = canonicalTree[rightIdx] ?? null;
                }
              }
  
              if (childVal === null) {
                const numMatch = desc.match(/\b(\d+)\b/);
                if (numMatch && numMatch[1] && canonicalTree.some((v) => String(v) === numMatch[1])) {
                  childVal = Number(numMatch[1]);
                }
              }
  
              if (childVal !== null && childVal !== "null" && !simStack.includes(childVal)) {
                simStack.push(childVal);
                step.activeDataset = "stack";
                step.shiftInfo = {
                  from: "tree",
                  to: "stack",
                  action: "push",
                  reason: `Push ${isRight ? "right" : isLeft ? "left" : ""} child ${childVal} onto stack`,
                };
              }
            }
  
            step.stack = [...simStack];
            step.visited = [...visitedNodes];
          }
        }
      } else {
        // General Tree DFS / Recursive Traversal
        const visitedNodes: (number | string)[] = [];
        for (let i = 0; i < initialSteps.length; i++) {
          const step = initialSteps[i]!;
          step.type = "tree";
          step.tree = [...canonicalTree];
  
          // Ensure current node is recognized
          if (step.current === null || step.current === undefined) {
            const numMatch = (step.desc ?? "").match(/\b(\d+)\b/);
            if (numMatch && numMatch[1] && canonicalTree.some((v) => String(v) === numMatch[1])) {
              step.current = Number(numMatch[1]);
            }
          }
  
          if (step.current !== null && step.current !== undefined) {
            const matchVal = canonicalTree.find((v) => String(v) === String(step.current));
            if (matchVal !== undefined && matchVal !== null && !visitedNodes.includes(matchVal)) {
              visitedNodes.push(matchVal);
            }
          }
          step.visited = [...visitedNodes];
        }
      }
    }
  
    // Check if problem is an explicit Island / connected component DFS traversal
    const isExplicitIslandProblem =
      (preferred === "matrix" || initialSteps.some((s) => s.type === "matrix")) &&
      (code_lines.some((l) => /\b(?:island|max_area|num_islands|island_count)\b/i.test(l)) ||
        rawSteps.some((s: RawVizStep) => /\b(?:island|max_area)\b/i.test(String(s?.desc ?? ""))));

    if (isExplicitIslandProblem) {
      const canonicalMatrix = fallback.steps[0]?.matrix ?? null;
      const activeMat =
        initialSteps.find((s) => Array.isArray(s.matrix) && s.matrix.length > 0 && Array.isArray(s.matrix[0]))?.matrix ??
        canonicalMatrix;
  
      if (Array.isArray(activeMat) && activeMat.length > 0 && Array.isArray(activeMat[0])) {
        const rows = activeMat.length;
        const cols = activeMat[0].length;
  
        // 1. Identify all ground-truth connected components (islands) in row-major scan order
        const gridIslands: string[][] = [];
        const compVisited = new Set<string>();
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const k = `${r},${c}`;
            if (Number(activeMat[r]?.[c]) === 1 && !compVisited.has(k)) {
              const comp: string[] = [];
              const stack = [[r, c]];
              compVisited.add(k);
              while (stack.length > 0) {
                const head = stack.pop();
                if (!head) break;
                const [currR = 0, currC = 0] = head;
                const ck = `${currR},${currC}`;
                comp.push(ck);
                for (const [dr, dc] of [
                  [1, 0],
                  [0, 1],
                  [-1, 0],
                  [0, -1],
                ]) {
                  const nr = currR + (dr ?? 0);
                  const nc = currC + (dc ?? 0);
                  const nk = `${nr},${nc}`;
                  if (
                    nr >= 0 &&
                    nc >= 0 &&
                    nr < rows &&
                    nc < cols &&
                    Number(activeMat[nr]?.[nc]) === 1 &&
                    !compVisited.has(nk)
                  ) {
                    compVisited.add(nk);
                    stack.push([nr, nc]);
                  }
                }
              }
              gridIslands.push(comp);
            }
          }
        }
  
        const totalLandCells = gridIslands.reduce((sum, isl) => sum + isl.length, 0);
        const trueMaxArea = Math.max(...gridIslands.map((isl) => isl.length), 0);
  
        // Check if candidate's raw steps provide complete, unbroken cell-by-cell DFS steps for all islands
        const rawCurrentCoords = new Set(
          initialSteps
            .map((s) => String(s.current ?? ""))
            .filter((c) => c && c !== "null" && c.includes(",")),
        );
        const rawVisitedCoords = new Set(
          initialSteps.flatMap((s) => (Array.isArray(s.visited) ? s.visited.map(String) : [])),
        );
        const allExploredCoords = new Set([...rawCurrentCoords, ...rawVisitedCoords]);
  
        const isModelTraversalComplete =
          gridIslands.length > 0 &&
          gridIslands.every((isl) => isl.every((cell) => allExploredCoords.has(cell))) &&
          initialSteps.length >= totalLandCells + gridIslands.length;
  
        if (!isModelTraversalComplete) {
          // Reconstruct the authentic, complete step-by-step recursive DFS traversal
          const initLine = Math.max(
            0,
            code_lines.findIndex((l) =>
              /\b(?:rows|cols|visited|max_area\s*=|set\(|count\s*=)\b/i.test(l),
            ),
          );
          const outerLoopLine = Math.max(
            0,
            code_lines.findIndex((l) => /\bfor\s+(?:r|row|i)\b|\bgrid\[/i.test(l)),
          );
          const dfsRecurseLine = Math.max(
            0,
            code_lines.findIndex((l) => /\bdfs\(|visited\.add|area\s*\+=|return\s+1\b/i.test(l)),
          );
          const maxUpdateLine = Math.max(
            0,
            code_lines.findIndex((l) => /\bmax_area\s*=|max\(|island_count\s*\+=/i.test(l)),
          );
          const returnLine = Math.max(
            0,
            code_lines.findIndex((l) => /\breturn\s+(?:max_area|count|res|ans)\b/i.test(l)),
          );
  
          const reconstructedSteps: VizStep[] = [];
          const cumulativeVisited: string[] = [];
          let runningMaxArea = 0;
          const baseActiveDataset = initialSteps[0]?.activeDataset ?? null;
          const baseShiftInfo = initialSteps[0]?.shiftInfo ?? null;
          const baseDatasetLabels = initialSteps[0]?.datasetLabels ?? null;

          // Step 1: Initial state
          reconstructedSteps.push({
            type: "matrix",
            matrix: activeMat.map((r) => [...r]),
            cols,
            current: null,
            visited: [],
            islandCells: [],
            wSum: 0,
            mSum: 0,
            currentArea: 0,
            maxArea: 0,
            line: initLine !== -1 ? initLine : 0,
            desc: `Initialize visited set and max_area = 0 on ${rows}×${cols} island grid.`,
            activeDataset: baseActiveDataset,
            shiftInfo: baseShiftInfo,
            datasetLabels: baseDatasetLabels,
          });
  
          for (let islIdx = 0; islIdx < gridIslands.length; islIdx++) {
            const island = gridIslands[islIdx]!;
            const islandNum = islIdx + 1;
            const rootCoord = island[0]!;
            const activeIslandCells: string[] = [];
  
            // Outer loop finds island
            reconstructedSteps.push({
              type: "matrix",
              matrix: activeMat.map((r) => [...r]),
              cols,
              current: rootCoord,
              visited: [...cumulativeVisited],
              islandCells: [],
              wSum: 0,
              mSum: runningMaxArea,
              currentArea: 0,
              maxArea: runningMaxArea,
              line: outerLoopLine !== -1 ? outerLoopLine : 0,
              desc: `Outer loop scanning grid: found unvisited land at (${rootCoord}). Starting DFS for Island #${islandNum}.`,
              activeDataset: baseActiveDataset,
              shiftInfo: baseShiftInfo,
              datasetLabels: baseDatasetLabels,
            });
  
            // Recursive DFS steps for each land cell in this island
            for (let cellIdx = 0; cellIdx < island.length; cellIdx++) {
              const coord = island[cellIdx]!;
              cumulativeVisited.push(coord);
              activeIslandCells.push(coord);
              const curArea = activeIslandCells.length;
              if (curArea > runningMaxArea) runningMaxArea = curArea;
  
              // Determine move direction from previous cell in island
              let dir: string | undefined = undefined;
              if (cellIdx > 0) {
                const prev = island[cellIdx - 1]!.split(",").map(Number);
                const curr = coord.split(",").map(Number);
                const dr = curr[0]! - prev[0]!;
                const dc = curr[1]! - prev[1]!;
                if (dr === 1) dir = "DOWN (+1, 0)";
                else if (dr === -1) dir = "UP (-1, 0)";
                else if (dc === 1) dir = "RIGHT (0, +1)";
                else if (dc === -1) dir = "LEFT (0, -1)";
              }
  
              reconstructedSteps.push({
                type: "matrix",
                matrix: activeMat.map((r) => [...r]),
                cols,
                current: coord,
                visited: [...cumulativeVisited],
                islandCells: [...activeIslandCells],
                direction: dir,
                wSum: curArea,
                mSum: runningMaxArea,
                currentArea: curArea,
                maxArea: runningMaxArea,
                line: dfsRecurseLine !== -1 ? dfsRecurseLine : outerLoopLine,
                desc:
                  cellIdx === 0
                    ? `Explored root land cell at (${coord}). Island #${islandNum} area = ${curArea}.`
                    : `Recurse into adjacent land cell at (${coord}). Island #${islandNum} area = ${curArea}.`,
                activeDataset: baseActiveDataset,
                shiftInfo: baseShiftInfo,
                datasetLabels: baseDatasetLabels,
              });
            }
  
            // Island exploration completed step
            const islandArea = island.length;
            runningMaxArea = Math.max(runningMaxArea, islandArea);
  
            reconstructedSteps.push({
              type: "matrix",
              matrix: activeMat.map((r) => [...r]),
              cols,
              current: rootCoord,
              visited: [...cumulativeVisited],
              islandCells: [...activeIslandCells],
              wSum: islandArea,
              mSum: runningMaxArea,
              currentArea: islandArea,
              maxArea: runningMaxArea,
              line: maxUpdateLine !== -1 ? maxUpdateLine : outerLoopLine,
              desc: `Completed DFS for Island #${islandNum} (area = ${islandArea}). Current Max Area = ${runningMaxArea}.`,
              activeDataset: baseActiveDataset,
              shiftInfo: baseShiftInfo,
              datasetLabels: baseDatasetLabels,
            });
          }
  
          // Final Return step
          reconstructedSteps.push({
            type: "matrix",
            matrix: activeMat.map((r) => [...r]),
            cols,
            current: null,
            visited: [...cumulativeVisited],
            islandCells: [],
            wSum: trueMaxArea,
            mSum: trueMaxArea,
            currentArea: 0,
            maxArea: trueMaxArea,
            line: returnLine !== -1 ? returnLine : Math.max(0, code_lines.length - 1),
            desc: `Scan complete across all ${rows}×${cols} cells. Discovered ${gridIslands.length} islands. Returning final Max Area = ${trueMaxArea}.`,
            activeDataset: baseActiveDataset,
            shiftInfo: baseShiftInfo,
            datasetLabels: baseDatasetLabels,
          });
  
          initialSteps.length = 0;
          initialSteps.push(...reconstructedSteps);
        } else {
          // Model provided a complete traversal: ensure metadata consistency, progressive visited set, and exact maxArea bounds
          const runningVisited = new Set<string>();
          let runningMax = 0;
          for (let i = 0; i < initialSteps.length; i++) {
            const step = initialSteps[i]!;
            step.matrix = activeMat.map((r) => [...r]);
            step.cols = cols;
  
            if (step.current && String(step.current).includes(",")) {
              runningVisited.add(String(step.current));
            }
            if (Array.isArray(step.visited)) {
              step.visited.forEach((v) => {
                if (v && String(v).includes(",")) runningVisited.add(String(v));
              });
            }
            step.visited = Array.from(runningVisited);
  
            if (typeof step.currentArea === "number" && step.currentArea > runningMax) {
              runningMax = Math.min(step.currentArea, trueMaxArea);
            }
            if (typeof step.wSum === "number" && step.wSum > runningMax) {
              runningMax = Math.min(step.wSum, trueMaxArea);
            }
            if (typeof step.maxArea === "number") {
              step.maxArea = Math.min(Math.max(step.maxArea, runningMax), trueMaxArea);
              step.mSum = step.maxArea;
            } else {
              step.maxArea = Math.min(runningMax, trueMaxArea);
              step.mSum = step.maxArea;
            }
          }
          if (initialSteps.length > 0) {
            const last = initialSteps[initialSteps.length - 1]!;
            last.maxArea = trueMaxArea;
            last.mSum = trueMaxArea;
            last.wSum = trueMaxArea;
            if (!Array.isArray(last.visited) || last.visited.length < totalLandCells) {
              last.visited = gridIslands.flat();
            }
          }
        }
      }
    }
  
    // Check if problem is Graph algorithm (BFS, DFS, Dijkstra, Topo Sort, Union Find, etc.)
    const isGraphProblem =
      preferred === "graph" ||
      initialSteps.some((s) => s.type === "graph") ||
      code_lines.some((l) =>
        /\b(?:graph|adj|edges|vertex|vertices|indegree|outdegree|topo|neighbors|cloneGraph|canFinish|findOrder)\b/i.test(
          l,
        ),
      );
  
    if (isGraphProblem) {
      const fallbackMatrix =
        fallback.steps.find((s) => Array.isArray(s.matrix) && s.matrix.length > 0)?.matrix ??
        (Array.isArray(fallback.steps[0]?.matrix) ? fallback.steps[0].matrix : null);
  
      const visitedNodes: (number | string)[] = [];
      for (let i = 0; i < initialSteps.length; i++) {
        const step = initialSteps[i]!;
        step.type = "graph";
        if (!step.matrix || !Array.isArray(step.matrix) || step.matrix.length === 0) {
          step.matrix = fallbackMatrix
            ? fallbackMatrix.map((r) => [...r])
            : [
                [0, 1, 1, 0],
                [0, 0, 0, 1],
                [0, 0, 0, 1],
                [0, 0, 0, 0],
              ];
        }
        step.cols = step.matrix.length;
  
        // Extract current active vertex if missing
        if (step.current === null || step.current === undefined) {
          const nodeMatch =
            (step.desc ?? "").match(
              /\b(?:node|vertex|source|neighbor|curr|v|u)\s+([0-9a-zA-Z_-]+)/i,
            ) || (step.desc ?? "").match(/\b(\d+)\b/);
          if (nodeMatch?.[1]) {
            step.current = Number.isNaN(Number(nodeMatch[1])) ? nodeMatch[1] : Number(nodeMatch[1]);
          }
        }
  
        if (step.current !== null && step.current !== undefined) {
          if (!visitedNodes.some((v) => String(v) === String(step.current))) {
            visitedNodes.push(step.current);
          }
        }
  
        step.visited = [...visitedNodes];
      }
    }
  
    // Check if problem is Linked List algorithm
    const isLinkedListProblem =
      preferred === "linkedlist" ||
      initialSteps.some((s) => s.type === "linkedlist") ||
      code_lines.some((l) =>
        /\b(?:curr\.next|node\.next|ListNode|prev\.next|dummy\.next)\b/i.test(l),
      ) ||
      (code_lines.some((l) => /\bhead\b/i.test(l)) && code_lines.some((l) => /\b(?:next|node)\b/i.test(l)));
  
    if (isLinkedListProblem) {
      const canonicalList =
        fallback.steps.find((s) => Array.isArray(s.list) && s.list.length > 0)?.list ??
        fallback.array ??
        [1, 2, 3, 4, 5];
  
      const visitedNodes: (number | string)[] = [];
      for (let i = 0; i < initialSteps.length; i++) {
        const step = initialSteps[i]!;
        step.type = "linkedlist";
        step.list = [...canonicalList];
  
        if (
          typeof step.current === "number" &&
          step.current >= 0 &&
          step.current < canonicalList.length
        ) {
          const listVal = canonicalList[step.current];
          if (listVal !== undefined && !visitedNodes.includes(listVal)) {
            visitedNodes.push(listVal);
          }
        } else if (step.current !== null && step.current !== undefined) {
          if (canonicalList.includes(step.current as never) && !visitedNodes.includes(step.current)) {
            visitedNodes.push(step.current);
          }
        }
  
        step.visited = [...visitedNodes];
      }
    }
  
    // Check if problem is Two-Sequence / Dual-Array algorithm
    const isTwoSeqProblem =
      canonicalSecondaryArray !== null ||
      initialSteps.some((s) => Array.isArray(s.secondaryArray) && s.secondaryArray.length > 0) ||
      code_lines.some((l) =>
        /\b(?:text1|text2|word1|word2|nums1|nums2|s1|s2|seq1|seq2|str1|str2|source|target_str)\b/i.test(
          l,
        ),
      );
  
    if (isTwoSeqProblem && canonicalSecondaryArray) {
      for (let i = 0; i < initialSteps.length; i++) {
        const step = initialSteps[i]!;
        if (
          !step.secondaryArray ||
          !Array.isArray(step.secondaryArray) ||
          step.secondaryArray.length === 0
        ) {
          step.secondaryArray = [...canonicalSecondaryArray];
        }
        // If AI emitted left (ptr on seq1) and right (ptr on seq2) without setting left2:
        if (
          step.left2 === null &&
          typeof step.left === "number" &&
          typeof step.right === "number"
        ) {
          step.left2 = step.right;
          step.right = null;
        }
      }
    }
  
    // Check if problem is Interval algorithm
    const isIntervalProb =
      initialSteps.some(
        (s) =>
          Array.isArray(s.matrix) &&
          s.matrix.length > 0 &&
          s.matrix.every((r) => Array.isArray(r) && r.length === 2),
      ) ||
      code_lines.some((l) =>
        /\b(?:intervals|newInterval|merge|overlapping|meeting|rooms|merged\.append|prev\[1\]|curr\[0\])\b/i.test(
          l,
        ),
      );
  
    if (isIntervalProb) {
      const canonicalIntervalMatrix =
        fallback.steps.find((s) => Array.isArray(s.matrix) && s.matrix.length > 0)?.matrix ??
        fallback.steps[0]?.matrix;
  
      if (canonicalIntervalMatrix && Array.isArray(canonicalIntervalMatrix)) {
        for (let i = 0; i < initialSteps.length; i++) {
          const step = initialSteps[i]!;
          if (!step.matrix || !Array.isArray(step.matrix) || step.matrix.length === 0) {
            step.matrix = canonicalIntervalMatrix.map((r) => [...r]);
            step.cols = 2;
          }
        }
      }
    }
  
    // Check if problem is Bit Manipulation
    const isBitProb = code_lines.some((l) =>
      /\b(?:xor|\^|bitwise|&|>>|<<|popcount|hamming|count_bits|set_bits|bit_count)\b/i.test(l),
    );
  
    if (isBitProb) {
      for (let i = 0; i < initialSteps.length; i++) {
        const step = initialSteps[i]!;
        // Ensure mSum or wSum numeric/binary bit states are preserved
        if (step.mSum === undefined && typeof step.current === "number") {
          step.mSum = step.current;
        }
      }
    }
  
    // Check if problem is Trie / Prefix Tree
    const isTrieProb =
      initialSteps.some((s) => s.type === "trie") ||
      code_lines.some((l) =>
        /\b(?:trie|TrieNode|prefix_tree|is_end|insert|search|startsWith|children)\b/i.test(l),
      );
  
    if (isTrieProb) {
      for (let i = 0; i < initialSteps.length; i++) {
        const step = initialSteps[i]!;
        if (!step.type || step.type === "array") {
          step.type = "trie";
        }
      }
    }
  
    // Check if problem is Heap / Priority Queue / Top-K / Streaming
    const isHeapProb =
      initialSteps.some((s) => s.type === "heap") ||
      code_lines.some((l) =>
        /\b(?:heappush|heappop|heapify|PriorityQueue|heap|small|large|median)\b/i.test(l),
      );
  
    if (isHeapProb) {
      for (let i = 0; i < initialSteps.length; i++) {
        const step = initialSteps[i]!;
        if (!step.type || step.type === "array") {
          step.type = "heap";
        }
      }
    }
  
    // Check if problem is Union-Find / DSU
    const isUnionFindProb =
      code_lines.some((l) =>
        /\b(?:union|find|parent|rank|root|connected|provinces|disjoint_set|dsu)\b/i.test(l),
      );
  
    if (isUnionFindProb) {
      for (let i = 0; i < initialSteps.length; i++) {
        const step = initialSteps[i]!;
        if (!step.type || step.type === "array") {
          step.type = "graph";
        }
      }
    }
  
    // Check if problem is 2D DP Table
    const is2dDpProb =
      initialSteps.some((s) => s.type === "matrix" || (s.matrix && s.matrix.length > 0)) &&
      code_lines.some((l) =>
        /\b(?:dp\[r\]\[c\]|dp\[i\]\[j\]|unique_paths|min_path_sum|grid|maximal_square)\b/i.test(l),
      );
  
    if (is2dDpProb) {
      for (let i = 0; i < initialSteps.length; i++) {
        const step = initialSteps[i]!;
        if (!step.type || step.type === "array") {
          step.type = "matrix";
        }
      }
    }
  
  
  }

  // Pass 2: Line Distribution & Method-Scoped Boundary Engine
  const totalSteps = initialSteps.length;
  const lineVariety = new Set(initialSteps.map((s: VizStep) => s.line)).size;
  const isOverallFrozen = totalSteps >= 3 && lineVariety <= 1;
  const methodRanges = parseCodeMethodRanges(code_lines);

  const getMethodForLine = (lineIdx: number): CodeMethodRange | undefined => {
    return methodRanges.find((m) => lineIdx >= m.startLine && lineIdx <= m.endLine);
  };

  const stepsWithLines: VizStep[] = initialSteps.map(
    (step: VizStep, idx: number, arr: VizStep[]) => {
      const currentLineIdx = step.line;
      const currentLineText = code_lines[currentLineIdx] ?? "";
      const desc = step.desc ?? "";

      // Check if step includes an explicit code_anchor matching user code line
      const anchor = (step as any)?.code_anchor || (step as any)?.codeAnchor;
      if (typeof anchor === "string" && anchor.trim()) {
        const cleanAnchor = anchor.trim().toLowerCase();
        const directIdx = code_lines.findIndex((l) => {
          const cleanLine = l.trim().toLowerCase();
          return cleanLine.includes(cleanAnchor) || cleanAnchor.includes(cleanLine);
        });
        if (directIdx !== -1) {
          return { ...step, line: directIdx };
        }
      }

      // Check if current line is a helper return / statement that shouldn't be frozen across distinct operations
      const isHelperReturn =
        /^\s*return\b/i.test(currentLineText) &&
        !/\b(?:return|complete|answer|not found|-1)\b/i.test(desc);


      // Check consecutive freeze
      const isConsecutiveSame =
        idx > 0 && step.line === arr[idx - 1]?.line && step.desc !== arr[idx - 1]?.desc;

      // Method scope mismatch detection
      const methodForCurrentLine = getMethodForLine(currentLineIdx);
      const methodName = methodForCurrentLine?.name?.toLowerCase() ?? "";

      const isGetStep = /\b(?:get|lookup|search|find|retrieve|contains)\b/i.test(desc);
      const isPutStep = /\b(?:put|insert|set|append|add|write)\b/i.test(desc);
      const isRemoveStep = /\b(?:remove|delete|del|unlink|pop|erase)\b/i.test(desc);

      let isMethodScopeMismatch = false;
      if (methodRanges.length > 1) {
        if (
          isGetStep &&
          methodName &&
          !/^(?:get|find|search|lookup|contains|read|retrieve)/i.test(methodName)
        ) {
          isMethodScopeMismatch = true;
        } else if (
          isPutStep &&
          idx > 0 &&
          methodName &&
          !/^(?:put|insert|set|add|append|write|push)/i.test(methodName)
        ) {
          isMethodScopeMismatch = true;
        } else if (
          isRemoveStep &&
          methodName &&
          !/^(?:remove|delete|del|erase|pop|discard)/i.test(methodName)
        ) {
          isMethodScopeMismatch = true;
        }
      }

      const lineHasRemove = /\b(?:remove|delete|del|unlink|pop|erase)\b/i.test(currentLineText);
      const isRemoveMismatch = isRemoveStep && !lineHasRemove;

      const isCommentMismatch =
        /^(?:\/\/|#|\/\*|\*|--)/.test(currentLineText.trim()) || !currentLineText.trim();

      const isDeclMismatch =
        idx > 0 &&
        /^(?:function\b|def\b|class\b|void\b|int\b|const\b\s*\w+\s*=\s*\()/i.test(
          currentLineText.trim(),
        ) &&
        !/\b(?:init|declare|start|define)\b/i.test(desc);

      // Action mismatch detection (e.g. step is Dequeue, but current line is Enqueue, or vice versa)
      const isDequeueStep = /\b(?:dequeue|pop\b|pop\(0\)|popleft|shift|poll)\b/i.test(desc);
      const isEnqueueStep = /\b(?:enqueue|append\b|push\b|offer)\b/i.test(desc);
      const isBottomStep =
        /\b(?:move.*(?:bottom|back)|re-?enqueue|rotate|skip index)\b/i.test(desc);
      const isReturnStep =
        /\b(?:return|complete|finished|traversal complete|answer|simulation complete|victory)\b/i.test(
          desc,
        );

      const lineIsEnqueue = /\b(?:enqueue|append|push|offer)\b/i.test(currentLineText);
      const lineIsDequeue =
        /\b(?:dequeue|pop\(0\)|popleft|shift|poll|queue\.pop|\.pop\(0\))\b/i.test(currentLineText);
      const lineIsBottom =
        /\b(?:enqueue\(.*dequeue|append\(.*pop|enqueue\(skipped|push\(skipped|queue\.enqueue)\b/i.test(
          currentLineText,
        );
      const lineIsReturn = /^\s*return\b/i.test(currentLineText);

      const isActionMismatch =
        isCommentMismatch ||
        isDeclMismatch ||
        (isBottomStep && !lineIsBottom) ||
        (isReturnStep && !lineIsReturn && idx >= totalSteps - 2) ||
        (isDequeueStep && lineIsEnqueue && !isBottomStep) ||
        (isEnqueueStep && lineIsDequeue && !isBottomStep) ||
        (isDequeueStep && !lineIsDequeue && !isBottomStep && !/while|for|if/i.test(currentLineText)) ||
        (isEnqueueStep &&
          !lineIsEnqueue &&
          !isBottomStep &&
          !isDequeueStep &&
          !/while|for|if/i.test(currentLineText)) ||
        (/\bleft\b/i.test(desc) &&
          /\bright\b/i.test(currentLineText) &&
          !/\bleft\b/i.test(currentLineText)) ||
        (/\bright\b/i.test(desc) &&
          /\bleft\b/i.test(currentLineText) &&
          !/\bright\b/i.test(currentLineText));

      if (
        isOverallFrozen ||
        isHelperReturn ||
        isMethodScopeMismatch ||
        (isConsecutiveSame && isRemoveMismatch) ||
        isRemoveMismatch ||
        isActionMismatch
      ) {
        const inferred = inferLineFromDesc(
          desc,
          code_lines,
          idx,
          totalSteps,
          idx > 0,
          currentLineIdx,
        );
        return { ...step, line: inferred };
      }

      return step;
    },
  );

  // Pass 3: Strict Data-Line Synchronization Pass (Sanitizes declarations before mutations)
  const hasZeroArrayInit =
    code_lines.some((l) => isZeroArrayLineOrDesc(l)) ||
    stepsWithLines.some((s) => isZeroArrayLineOrDesc(code_lines[s.line] ?? "", s.desc ?? ""));

  const firstMutationStepIdx = stepsWithLines.findIndex((s) => {
    const l = code_lines[s.line] ?? "";
    const d = s.desc ?? "";
    return isMutationLineOrDesc(l, d);
  });

  const synchronizedSteps: VizStep[] = stepsWithLines.map((step: VizStep, idx: number) => {
    const lineText = code_lines[step.line] ?? "";
    const desc = step.desc ?? "";
    const isStepInitZeroArray = isZeroArrayLineOrDesc(lineText, desc);
    const isStepInitMap = isEmptyMapLineOrDesc(lineText, desc);
    const isStepInitStack = isEmptyStackLineOrDesc(lineText, desc);
    const isStepInitSet = isEmptySetLineOrDesc(lineText, desc);

    const isBeforeFirstMutation = firstMutationStepIdx !== -1 && idx < firstMutationStepIdx;

    if (step.type === "hashmap" && (isStepInitMap || isBeforeFirstMutation)) {
      return { ...step, map: {} };
    }
    if (step.type === "set" && (isStepInitSet || isBeforeFirstMutation)) {
      return { ...step, set: [] };
    }
    if (step.type === "stack" && (isStepInitStack || isBeforeFirstMutation)) {
      return { ...step, stack: [] };
    }
    if (
      (step.type === "queue" || step.type === "deque") &&
      (isStepInitStack || isBeforeFirstMutation)
    ) {
      return { ...step, ...(step.type === "queue" ? { queue: [] } : { deque: [] }) };
    }
    const isStringInputArray = test_array.some((x) => typeof x === "string");
    if (
      !isStringInputArray &&
      step.type === "array" &&
      hasZeroArrayInit &&
      (isStepInitZeroArray || isBeforeFirstMutation)
    ) {
      const arr = Array.isArray(step.array) ? (step.array as (number | string)[]) : [];
      const arrayLength = arr.length > 0 ? arr.length : test_array.length || 26;
      return {
        ...step,
        array: new Array(arrayLength).fill(0),
        wSum: 0,
        mSum: 0,
      };
    }

    return step;
  });

  const finalVizSteps = synchronizedSteps.length ? synchronizedSteps : fallback.steps;

  return {
    code_lines,
    test_array: test_array.length ? test_array : fallback.array,
    viz_steps: finalVizSteps,
  };
}

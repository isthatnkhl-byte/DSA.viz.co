export type Val = number | string;

/**
 * Composite layout modes for synchronized multi-container visualizer arrangements
 */
export type CompositeLayoutMode =
  | "single"
  | "dual-array"
  | "array-stack"
  | "array-hashmap"
  | "tree-stack"
  | "matrix-queue"
  | "matrix-stack"
  | "graph-table";

/**
 * Parses any candidate value into an explicit [row, col] coordinate tuple.
 * Returns null if the value is a scalar number, non-coordinate string, or invalid shape.
 * This completely prevents counter variables (like 0, 1, or lengths) from false-lighting cell (0, 0).
 */
export function parse2DCoord(value: unknown): [number, number] | null {
  if (value === null || value === undefined) return null;
  
  // Explicit tuple: [r, c]
  if (Array.isArray(value)) {
    if (value.length >= 2) {
      const r = extractScalarValue(value[0]);
      const c = extractScalarValue(value[1]);
      if (typeof r === "number" && typeof c === "number" && Number.isFinite(r) && Number.isFinite(c)) {
        return [r, c];
      }
      if (typeof r === "string" && typeof c === "string" && /^-?\d+$/.test(r) && /^-?\d+$/.test(c)) {
        return [parseInt(r, 10), parseInt(c, 10)];
      }
    }
    return null;
  }

  // Object format: { r, c }, { row, col }, { x, y }, { i, j }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const rVal = obj.r ?? obj.row ?? obj.rowIndex ?? obj.x ?? obj.i;
    const cVal = obj.c ?? obj.col ?? obj.column ?? obj.colIndex ?? obj.y ?? obj.j;
    if (rVal !== undefined && cVal !== undefined) {
      const r = extractScalarValue(rVal);
      const c = extractScalarValue(cVal);
      if (typeof r === "number" && typeof c === "number" && Number.isFinite(r) && Number.isFinite(c)) {
        return [r, c];
      }
      if (typeof r === "string" && typeof c === "string" && /^-?\d+$/.test(r) && /^-?\d+$/.test(c)) {
        return [parseInt(r, 10), parseInt(c, 10)];
      }
    }
    return null;
  }

  // String format: "(r, c)", "[r, c]", "r, c", "r:c"
  if (typeof value === "string") {
    const s = value.trim();
    const m = s.match(/^\(?\[?\s*(-?\d+)\s*[,:\-]\s*(-?\d+)\s*\)?\]?$/);
    if (m && m[1] !== undefined && m[2] !== undefined) {
      return [parseInt(m[1], 10), parseInt(m[2], 10)];
    }
  }

  return null;
}

const seenObjects = new WeakSet<object>();

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
      // If it's a [key, val] tuple, prefer extracting value
      const v = extractScalarValue(item[1], depth + 1);
      if (v !== null) return v;
    }
    return extractScalarValue(item[0], depth + 1);
  }

  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    
    // Check known priority fields on custom node objects
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

export function toText(value: unknown): string {
  if (value === null || value === undefined) return "–";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (!Number.isFinite(value)) return value > 0 ? "∞" : "-∞";
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "[object Object]" || s === "undefined" || s === "null") return "–";
    return value;
  }
  const scalar = extractScalarValue(value);
  if (scalar !== null && scalar !== undefined) return String(scalar);
  try {
    const str = JSON.stringify(value);
    if (str && str.length < 50) return str;
  } catch {
    // ignore
  }
  return String(value);
}

export function safeArray(value: unknown): (number | string)[] {
  if (value === null || value === undefined) return [];
  if (value instanceof Set) {
    return Array.from(value)
      .map((item) => extractScalarValue(item))
      .filter((item): item is number | string => item !== null && item !== undefined);
  }
  if (value instanceof Map) {
    return Array.from(value.values())
      .map((item) => extractScalarValue(item))
      .filter((item): item is number | string => item !== null && item !== undefined);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => extractScalarValue(item))
      .filter((item): item is number | string => item !== null && item !== undefined);
  }
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    const scalar = extractScalarValue(value);
    return scalar !== null ? [scalar] : [];
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.array)) return safeArray(obj.array);
    if (Array.isArray(obj.nums)) return safeArray(obj.nums);
    if (Array.isArray(obj.items)) return safeArray(obj.items);
    if (Array.isArray(obj.data)) return safeArray(obj.data);
    return Object.values(obj)
      .map((item) => extractScalarValue(item))
      .filter((item): item is number | string => item !== null && item !== undefined);
  }
  return [];
}

export function safeEntries(value: unknown): [string, string | number | null][] {
  if (!value) return [];
  if (value instanceof Map) {
    return Array.from(value.entries()).map(([k, v]) => [
      toText(k),
      extractScalarValue(v),
    ]);
  }
  if (value instanceof Set) {
    return Array.from(value).map((v, idx) => [
      String(idx),
      extractScalarValue(v),
    ]);
  }
  if (Array.isArray(value)) {
    return value.map((entry, idx) => {
      if (Array.isArray(entry) && entry.length >= 2) {
        return [toText(entry[0]), extractScalarValue(entry[1])];
      }
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        const k = obj.key ?? obj.k ?? obj.name ?? obj.id ?? String(idx);
        const v = extractScalarValue(obj.value ?? obj.val ?? obj.v ?? obj.data ?? entry);
        return [toText(k), v];
      }
      return [String(idx), extractScalarValue(entry)];
    });
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      extractScalarValue(item),
    ]);
  }
  return [];
}

export function safeMatrix(value: unknown): (number | string)[][] {
  if (!value) return [];
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    // If it's a 1D array of scalars, wrap each or convert to a 1-row matrix
    if (value.every((item) => !Array.isArray(item))) {
      const row = safeArray(value);
      return row.length > 0 ? [row] : [];
    }
    const rows = value
      .filter(Array.isArray)
      .map((row) => safeArray(row))
      .filter((row) => row.length > 0);
    return rows;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.grid)) return safeMatrix(obj.grid);
    if (Array.isArray(obj.matrix)) return safeMatrix(obj.matrix);
    if (Array.isArray(obj.board)) return safeMatrix(obj.board);
    if (Array.isArray(obj.rows)) return safeMatrix(obj.rows);
  }
  return [];
}

/** Converts array or TreeNode object `{ val, left, right }` into standard binary tree level-order array */
export function safeTreeArray(value: unknown): (Val | null)[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item === null || item === undefined || String(item) === "null" || String(item) === "None")
        return null;
      return extractScalarValue(item);
    });
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.tree)) return safeTreeArray(obj.tree);
    if (Array.isArray(obj.nodes)) return safeTreeArray(obj.nodes);

    // If it's a TreeNode object with left/right pointers, perform level-order BFS
    if ("val" in obj || "value" in obj || "v" in obj) {
      const result: (Val | null)[] = [];
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
      // Trim trailing nulls
      while (result.length > 0 && result[result.length - 1] === null) {
        result.pop();
      }
      return result;
    }
  }
  return [];
}

export function coordKey(value: unknown): string {
  if (value === null || value === undefined) return "";
  
  // First, check if it forms an explicit 2D coordinate tuple
  const parsed = parse2DCoord(value);
  if (parsed) {
    return `${parsed[0]},${parsed[1]}`;
  }

  // If it's a structured object or non-coordinate string, format cleanly
  if (typeof value === "string") {
    return value.trim();
  }
  
  if (typeof value === "number") {
    // Return numeric string for 1D indexing; callers checking 2D matrices will not match "r,c" format
    return String(value);
  }

  return String(value);
}

export function detectOperation(desc: string = ""): {
  label: string;
  color: string;
} {
  const d = desc.toLowerCase();
  if (/push|insert|enqueue|append|add|offer|store|set|put/.test(d))
    return {
      label: "INSERT / PUSH",
      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  if (/pop|dequeue|remove|drop|delete|shift|poll|prune/.test(d))
    return { label: "REMOVE / POP", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
  if (/swap|shift|reverse|rotate|invert|modify|update|override/.test(d))
    return { label: "SWAP / MODIFY", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  if (/compare|check|found|equal|match|<|>|==|target|contain/.test(d))
    return { label: "COMPARE / MATCH", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };
  if (/visit|traverse|descend|move|step|next|recurse|dfs|bfs|explore/.test(d))
    return { label: "TRAVERSE", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" };
  if (/return|answer|result|complete|finish|solved|optimal/.test(d))
    return { label: "RESULT", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
  return { label: "EXECUTE", color: "bg-muted text-muted-foreground border-border" };
}


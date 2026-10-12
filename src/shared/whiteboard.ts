// Ported from Agentic-Hub-office (src/shared/whiteboard.ts + src/client/world/swarm-dag-render.ts)
// Extended with AI Excalidraw Scene & Multi-Step Simulation Generator for DSA & System Design queries.

/**
 * An Excalidraw element, as far as the office/interview room needs to know: what it takes to merge two copies.
 * Everything else about it (its shape, points, text, colors…) rides along untouched.
 */
export interface WbElement {
  id: string;
  type: string;
  /** Goes up by one with every change to the element. */
  version: number;
  /** Random, changed with the version: breaks the tie when two people change it at once. */
  versionNonce: number;
  isDeleted?: boolean;
  /** Its place in the stacking order, a fractional index that sorts as a plain string. */
  index?: string | null;
  /** When it last changed (epoch ms). */
  updated?: number;
  fileId?: string | null;
  [k: string]: unknown;
}

/** A picture on the whiteboard: Excalidraw's BinaryFileData. */
export interface WbFile {
  id: string;
  mimeType: string;
  dataURL: string;
  created: number;
}

/** Where someone's mouse or AI laser is on the whiteboard, in the drawing's own coordinates. */
export interface WbPointer {
  x: number;
  y: number;
  tool: "pointer" | "laser";
  button: "up" | "down";
}

/** A room's whiteboard state, for whoever arrives there. */
export interface WhiteboardView {
  /** Every element, deleted ones too, so a deletion reaches whoever still has the element. */
  elements: WbElement[];
  /** Who has the whiteboard open right now (client ids). */
  people: string[];
}

export const WB_MAX_ELEMENTS = 20_000;
export const WB_MAX_ELEMENT_BYTES = 512 * 1024;
export const WB_MAX_BYTES = 16 * 1024 * 1024;
export const WB_MAX_FILE_BYTES = 6 * 1024 * 1024;
export const WB_MAX_FILES_BYTES = 64 * 1024 * 1024;
export const WB_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
  "image/avif",
  "image/jfif",
];

const ID_RE = /^[\w-]{1,100}$/;

/**
 * Whether `a` should replace `b`: it's a later version, or the same version with the lower nonce.
 * That's Excalidraw's rule, so every copy of the board settles on the same element.
 */
export function newer(
  a: Pick<WbElement, "version" | "versionNonce">,
  b: Pick<WbElement, "version" | "versionNonce"> | undefined
): boolean {
  return (
    !b ||
    a.version > b.version ||
    (a.version === b.version && a.versionNonce < b.versionNonce)
  );
}

/** An element as someone sent it, if it has what merging needs; anything else is dropped. */
export function checkElement(raw: unknown): WbElement | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== "string" || !ID_RE.test(e.id)) return undefined;
  if (
    typeof e.type !== "string" ||
    !e.type ||
    e.type.length > 32 ||
    e.type === "selection"
  )
    return undefined;
  if (!Number.isSafeInteger(e.version) || (e.version as number) < 1)
    return undefined;
  if (typeof e.versionNonce !== "number" || !Number.isFinite(e.versionNonce))
    return undefined;
  if (e.isDeleted !== undefined && typeof e.isDeleted !== "boolean")
    return undefined;
  if (
    e.index !== undefined &&
    e.index !== null &&
    (typeof e.index !== "string" || e.index.length > 200)
  )
    return undefined;
  if (
    e.fileId !== undefined &&
    e.fileId !== null &&
    (typeof e.fileId !== "string" || !ID_RE.test(e.fileId))
  )
    return undefined;
  return e as WbElement;
}

/** A picture as someone sent it, or why it can't go on the board. */
export function checkFile(raw: unknown): WbFile | string {
  if (!raw || typeof raw !== "object") return "Bad picture";
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== "string" || !ID_RE.test(f.id)) return "Bad picture id";
  if (typeof f.mimeType !== "string" || !WB_IMAGE_TYPES.includes(f.mimeType))
    return "The whiteboard only takes pictures (PNG, JPEG, GIF, WebP, SVG…)";
  if (
    typeof f.dataURL !== "string" ||
    !f.dataURL.startsWith(`data:${f.mimeType}`)
  )
    return "Bad picture data";
  if (f.dataURL.length > WB_MAX_FILE_BYTES)
    return `That picture is too big for the whiteboard (over ${
      WB_MAX_FILE_BYTES / 1024 / 1024
    } MB)`;
  const created =
    typeof f.created === "number" && Number.isFinite(f.created)
      ? f.created
      : Date.now();
  return { id: f.id, mimeType: f.mimeType, dataURL: f.dataURL, created };
}

/** Elements in stacking order, bottom first: by fractional index, which compares as a plain string. */
export function byIndex(a: WbElement, b: WbElement): number {
  const x = a.index ?? "";
  const y = b.index ?? "";
  if (x === y) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  if (!x) return 1;
  if (!y) return -1;
  return x < y ? -1 : 1;
}

/** Excalidraw's own hash of a collaborator id (ported from Agentic-Hub-office/src/client/ui/whiteboard-app.ts). */
export function hashToInteger(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash << 5) - hash + id.charCodeAt(i);
  return hash;
}

function hueOf(hex: string): number {
  const clean = hex.startsWith("#") ? hex : "#38bdf8";
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(
    (i) => parseInt(clean.slice(i, i + 2), 16) / 255
  );
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
      ? (b - r) / d + 2
      : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const tints = new Map<string, string>();

/**
 * Picks a collaborator id whose Excalidraw pastel matches the peer's desired hex color.
 */
export function tintedId(peerId: string, color: string): string {
  const key = `${peerId}|${color}`;
  let id = tints.get(key);
  if (id) return id;
  const want = hueOf(color);
  let best = Infinity;
  for (let n = 0; n < 80 && best > 5; n++) {
    const candidate = `${peerId}~${n}`;
    const off = Math.abs(
      (Math.abs(hashToInteger(candidate)) % 37) * 10 - want
    );
    const d = Math.min(off, 360 - off);
    if (d < best) {
      best = d;
      id = candidate;
    }
  }
  tints.set(key, id!);
  return id!;
}

// ============================================================================
// AI EXCALIDRAW SCENE & SIMULATION GENERATOR ENGINE
// Generates native Excalidraw elements (rectangles, ellipses, diamonds, arrows,
// text, lines) so the AI can draw, teach, and animate step-by-step on the
// Excalidraw canvas for ANY user query!
// ============================================================================

export interface AiWhiteboardStepFrame {
  stepIndex: number;
  title: string;
  narration: string;
  mathInvariant: string;
  elements: WbElement[];
  aiLaserTarget: { x: number; y: number };
}

export interface AiWhiteboardLesson {
  id: string;
  topic: string;
  badge: string;
  frames: AiWhiteboardStepFrame[];
}

function makeBaseProps(
  id: string,
  type: string,
  x: number,
  y: number,
  width: number,
  height: number,
  version: number,
  extra: Record<string, unknown> = {}
): WbElement {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: (extra.strokeColor as string) || "#1e293b",
    backgroundColor: (extra.backgroundColor as string) || "transparent",
    fillStyle: (extra.fillStyle as string) || "solid",
    strokeWidth: (extra.strokeWidth as number) || 2,
    strokeStyle: (extra.strokeStyle as string) || "solid",
    roughness: (extra.roughness as number) ?? 0,
    opacity: (extra.opacity as number) ?? 100,
    groupIds: (extra.groupIds as string[]) || [],
    frameId: null,
    roundness: extra.roundness ?? { type: 3 },
    seed: Math.abs(hashToInteger(id)) % 1_000_000,
    version,
    versionNonce: Math.abs(hashToInteger(`${id}-v${version}`)) % 1_000_000_000,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    ...extra,
  };
}

export function excalidrawRect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: {
    strokeColor?: string;
    backgroundColor?: string;
    strokeWidth?: number;
    strokeStyle?: "solid" | "dashed" | "dotted";
    version?: number;
  } = {}
): WbElement {
  return makeBaseProps(id, "rectangle", x, y, width, height, opts.version ?? 1, {
    strokeColor: opts.strokeColor ?? "#1e293b",
    backgroundColor: opts.backgroundColor ?? "#f8fafc",
    strokeWidth: opts.strokeWidth ?? 2,
    strokeStyle: opts.strokeStyle ?? "solid",
  });
}

export function excalidrawEllipse(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: {
    strokeColor?: string;
    backgroundColor?: string;
    strokeWidth?: number;
    version?: number;
  } = {}
): WbElement {
  return makeBaseProps(id, "ellipse", x, y, width, height, opts.version ?? 1, {
    strokeColor: opts.strokeColor ?? "#1e293b",
    backgroundColor: opts.backgroundColor ?? "#f8fafc",
    strokeWidth: opts.strokeWidth ?? 2,
  });
}

export function excalidrawDiamond(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: {
    strokeColor?: string;
    backgroundColor?: string;
    strokeWidth?: number;
    version?: number;
  } = {}
): WbElement {
  return makeBaseProps(id, "diamond", x, y, width, height, opts.version ?? 1, {
    strokeColor: opts.strokeColor ?? "#1e293b",
    backgroundColor: opts.backgroundColor ?? "#fef3c7",
    strokeWidth: opts.strokeWidth ?? 2,
  });
}

export function excalidrawText(
  id: string,
  x: number,
  y: number,
  text: string,
  opts: {
    fontSize?: number;
    strokeColor?: string;
    textAlign?: "left" | "center" | "right";
    version?: number;
  } = {}
): WbElement {
  const fontSize = opts.fontSize ?? 18;
  const lines = text.split("\n");
  const maxLen = Math.max(...lines.map((l) => l.length), 1);
  const width = Math.max(24, Math.round(maxLen * fontSize * 0.6));
  const height = Math.max(24, Math.round(lines.length * fontSize * 1.35));

  return makeBaseProps(id, "text", x, y, width, height, opts.version ?? 1, {
    text,
    originalText: text,
    fontSize,
    fontFamily: 3, // monospace / Cascadia in Excalidraw
    textAlign: opts.textAlign ?? "left",
    verticalAlign: "top",
    strokeColor: opts.strokeColor ?? "#0f172a",
    backgroundColor: "transparent",
    lineHeight: 1.25,
    roundness: null,
  });
}

export function excalidrawArrow(
  id: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  opts: {
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: "solid" | "dashed" | "dotted";
    version?: number;
  } = {}
): WbElement {
  const dx = toX - fromX;
  const dy = toY - fromY;
  return makeBaseProps(
    id,
    "arrow",
    fromX,
    fromY,
    Math.abs(dx),
    Math.abs(dy),
    opts.version ?? 1,
    {
      strokeColor: opts.strokeColor ?? "#0284c7",
      strokeWidth: opts.strokeWidth ?? 2,
      strokeStyle: opts.strokeStyle ?? "solid",
      points: [
        [0, 0],
        [dx, dy],
      ],
      startBinding: null,
      endBinding: null,
      lastCommittedPoint: null,
      startArrowhead: null,
      endArrowhead: "arrow",
    }
  );
}

/**
 * Generates a Two Pointers interactive Excalidraw lesson with multiple frames.
 */
export function buildExcalidrawTwoPointersLesson(
  arr: number[] = [1, 3, 5, 8, 12, 17, 21],
  target = 17
): AiWhiteboardLesson {
  const sorted = [...arr].sort((a, b) => a - b);
  const frames: AiWhiteboardStepFrame[] = [];
  let l = 0;
  let r = sorted.length - 1;
  const pruned = new Set<number>();
  let stepIdx = 0;

  while (l < r && stepIdx < 10) {
    const sum = sorted[l]! + sorted[r]!;
    const isMatch = sum === target;
    const isGreater = sum > target;
    const ver = stepIdx + 1;

    const elements: WbElement[] = [];
    const baseX = 80;
    const baseY = 180;
    const cellW = 72;
    const cellH = 60;

    // Header Card
    elements.push(
      excalidrawRect("tp-header-box", baseX, 40, Math.max(540, sorted.length * cellW), 95, {
        strokeColor: "#0284c7",
        backgroundColor: "#e0f2fe",
        version: ver,
      }),
      excalidrawText(
        "tp-header-title",
        baseX + 18,
        52,
        `Step ${stepIdx + 1}: ${
          isMatch
            ? `Target Sum ${target} Found at [${l}, ${r}]!`
            : isGreater
            ? `Sum (${sum}) > Target (${target}) → Decrement Right Pointer (R--)`
            : `Sum (${sum}) < Target (${target}) → Increment Left Pointer (L++)`
        }`,
        { fontSize: 18, strokeColor: "#0369a1", version: ver }
      ),
      excalidrawText(
        "tp-header-formula",
        baseX + 18,
        88,
        `Invariant: arr[L=${l}] (${sorted[l]}) + arr[R=${r}] (${sorted[r]}) = ${sum} ${
          isMatch ? "==" : isGreater ? ">" : "<"
        } ${target}`,
        { fontSize: 15, strokeColor: "#0f172a", version: ver }
      )
    );

    // Array Cells
    sorted.forEach((val, idx) => {
      const cx = baseX + idx * cellW;
      const isL = idx === l;
      const isR = idx === r;
      const isPruned = pruned.has(idx);

      const bg = isMatch && (isL || isR)
        ? "#bbf7d0"
        : isL
        ? "#d1fae5"
        : isR
        ? "#ffe4e6"
        : isPruned
        ? "#f1f5f9"
        : "#ffffff";
      const stroke = isMatch && (isL || isR)
        ? "#16a34a"
        : isL
        ? "#059669"
        : isR
        ? "#e11d48"
        : isPruned
        ? "#cbd5e1"
        : "#334155";

      elements.push(
        excalidrawRect(`tp-cell-${idx}`, cx, baseY, cellW - 6, cellH, {
          strokeColor: stroke,
          backgroundColor: bg,
          strokeWidth: isL || isR ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`tp-val-${idx}`, cx + 18, baseY + 18, String(val), {
          fontSize: 20,
          strokeColor: isPruned ? "#94a3b8" : "#0f172a",
          version: ver,
        }),
        excalidrawText(`tp-idx-${idx}`, cx + 20, baseY + cellH + 8, `[${idx}]`, {
          fontSize: 13,
          strokeColor: "#64748b",
          version: ver,
        })
      );
    });

    // Left Pointer Arrow & Label
    const lx = baseX + l * cellW + (cellW - 6) / 2;
    elements.push(
      excalidrawArrow("tp-ptr-L", lx, baseY + cellH + 68, lx, baseY + cellH + 28, {
        strokeColor: "#059669",
        strokeWidth: 3,
        version: ver,
      }),
      excalidrawText("tp-lbl-L", lx - 22, baseY + cellH + 74, `L = ${l}`, {
        fontSize: 16,
        strokeColor: "#059669",
        version: ver,
      })
    );

    // Right Pointer Arrow & Label
    const rx = baseX + r * cellW + (cellW - 6) / 2;
    elements.push(
      excalidrawArrow("tp-ptr-R", rx, baseY + cellH + 68, rx, baseY + cellH + 28, {
        strokeColor: "#e11d48",
        strokeWidth: 3,
        version: ver,
      }),
      excalidrawText("tp-lbl-R", rx - 22, baseY + cellH + 74, `R = ${r}`, {
        fontSize: 16,
        strokeColor: "#e11d48",
        version: ver,
      })
    );

    frames.push({
      stepIndex: stepIdx,
      title: isMatch
        ? `Optimal Pair [${l}, ${r}] Found!`
        : `Compare L=${l} (${sorted[l]}) & R=${r} (${sorted[r]})`,
      narration: isMatch
        ? `Sum ${sorted[l]} + ${sorted[r]} equals ${target}! We found indices [${l}, ${r}] in O(N) time and O(1) space.`
        : isGreater
        ? `Current sum is ${sum}, which exceeds ${target}. Since the array is sorted, we prune index ${r} and decrement R.`
        : `Current sum is ${sum}, which is less than ${target}. Since the array is sorted, we prune index ${l} and increment L.`,
      mathInvariant: `L=${l}, R=${r} • Sum = ${sum} vs Target = ${target}`,
      elements,
      aiLaserTarget: {
        x: isGreater ? rx : lx,
        y: baseY + cellH / 2,
      },
    });

    if (isMatch) break;
    if (isGreater) {
      pruned.add(r);
      r--;
    } else {
      pruned.add(l);
      l++;
    }
    stepIdx++;
  }

  return {
    id: "two_pointers",
    topic: "Two Pointers (Sorted Target Sum)",
    badge: "O(N) Time • O(1) Space",
    frames,
  };
}

/**
 * Generates a Binary Search interactive Excalidraw lesson with multiple frames.
 */
export function buildExcalidrawBinarySearchLesson(
  arr: number[] = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
  target = 23
): AiWhiteboardLesson {
  const sorted = [...arr].sort((a, b) => a - b);
  const frames: AiWhiteboardStepFrame[] = [];
  let low = 0;
  let high = sorted.length - 1;
  const pruned = new Set<number>();
  let stepIdx = 0;

  while (low <= high && stepIdx < 8) {
    const mid = Math.floor((low + high) / 2);
    const val = sorted[mid]!;
    const isMatch = val === target;
    const isLess = val < target;
    const ver = stepIdx + 1;

    const elements: WbElement[] = [];
    const baseX = 60;
    const baseY = 185;
    const cellW = 64;
    const cellH = 56;

    elements.push(
      excalidrawRect("bs-header-box", baseX, 40, Math.max(580, sorted.length * cellW), 95, {
        strokeColor: "#059669",
        backgroundColor: "#ecfdf5",
        version: ver,
      }),
      excalidrawText(
        "bs-header-title",
        baseX + 16,
        52,
        `Step ${stepIdx + 1}: Search Range [${low}..${high}] • Mid = ${mid} (val=${val})`,
        { fontSize: 18, strokeColor: "#047857", version: ver }
      ),
      excalidrawText(
        "bs-header-formula",
        baseX + 16,
        88,
        isMatch
          ? `arr[${mid}] == ${target} → Target Found in ${stepIdx + 1} steps!`
          : isLess
          ? `arr[${mid}] (${val}) < ${target} → Prune left half [${low}..${mid}], set low = ${mid + 1}`
          : `arr[${mid}] (${val}) > ${target} → Prune right half [${mid}..${high}], set high = ${mid - 1}`,
        { fontSize: 15, strokeColor: "#0f172a", version: ver }
      )
    );

    sorted.forEach((v, idx) => {
      const cx = baseX + idx * cellW;
      const isMid = idx === mid;
      const isPruned = pruned.has(idx);

      elements.push(
        excalidrawRect(`bs-cell-${idx}`, cx, baseY, cellW - 6, cellH, {
          strokeColor: isMid ? (isMatch ? "#16a34a" : "#0284c7") : isPruned ? "#cbd5e1" : "#334155",
          backgroundColor: isMid
            ? isMatch
              ? "#bbf7d0"
              : "#bae6fd"
            : isPruned
            ? "#f1f5f9"
            : "#ffffff",
          strokeWidth: isMid ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`bs-val-${idx}`, cx + 14, baseY + 16, String(v), {
          fontSize: 18,
          strokeColor: isPruned ? "#94a3b8" : "#0f172a",
          version: ver,
        }),
        excalidrawText(`bs-idx-${idx}`, cx + 16, baseY + cellH + 8, `[${idx}]`, {
          fontSize: 12,
          strokeColor: "#64748b",
          version: ver,
        })
      );
    });

    const midX = baseX + mid * cellW + (cellW - 6) / 2;
    elements.push(
      excalidrawArrow("bs-ptr-mid", midX, baseY - 42, midX, baseY - 6, {
        strokeColor: "#0284c7",
        strokeWidth: 3,
        version: ver,
      }),
      excalidrawText("bs-lbl-mid", midX - 28, baseY - 66, `MID=${mid}`, {
        fontSize: 15,
        strokeColor: "#0284c7",
        version: ver,
      })
    );

    frames.push({
      stepIndex: stepIdx,
      title: isMatch ? `Found ${target} at Mid=${mid}!` : `Halve Window [${low}..${high}] at Mid=${mid}`,
      narration: isMatch
        ? `Mid index ${mid} holds ${val}, matching our target ${target}! Binary search succeeded in O(log N) time.`
        : isLess
        ? `Mid value ${val} is smaller than ${target}, so the target must lie in the right half [${mid + 1}..${high}].`
        : `Mid value ${val} is larger than ${target}, so the target must lie in the left half [${low}..${mid - 1}].`,
      mathInvariant: `low=${low}, mid=${mid}, high=${high} • arr[mid]=${val}`,
      elements,
      aiLaserTarget: { x: midX, y: baseY + cellH / 2 },
    });

    if (isMatch) break;
    if (isLess) {
      for (let i = low; i <= mid; i++) pruned.add(i);
      low = mid + 1;
    } else {
      for (let i = mid; i <= high; i++) pruned.add(i);
      high = mid - 1;
    }
    stepIdx++;
  }

  return {
    id: "binary_search",
    topic: "Binary Search Range Halving",
    badge: "O(log N) Time • O(1) Space",
    frames,
  };
}

/**
 * Generates a Linked List Reversal (3-Pointers) interactive Excalidraw lesson.
 */
export function buildExcalidrawLinkedListLesson(): AiWhiteboardLesson {
  const nodes = [10, 20, 30, 40];
  const frames: AiWhiteboardStepFrame[] = [];

  for (let step = 0; step <= nodes.length; step++) {
    const ver = step + 1;
    const elements: WbElement[] = [];
    const startX = 120;
    const nodeY = 190;
    const spacing = 145;

    elements.push(
      excalidrawRect("ll-header", 80, 40, 620, 90, {
        strokeColor: "#7c3aed",
        backgroundColor: "#f3e8ff",
        version: ver,
      }),
      excalidrawText(
        "ll-title",
        98,
        52,
        step === 0
          ? "Step 1: Initialize prev = null, curr = Head(10)"
          : step === nodes.length
          ? `Step ${ver}: Reversal Complete! New Head is prev (Node 40)`
          : `Step ${ver}: Reverse Node(${nodes[step - 1]}).next → prev`,
        { fontSize: 18, strokeColor: "#6d28d9", version: ver }
      ),
      excalidrawText(
        "ll-formula",
        98,
        86,
        `nextTemp = curr.next  |  curr.next = prev  |  prev = curr  |  curr = nextTemp`,
        { fontSize: 14, strokeColor: "#1e293b", version: ver }
      )
    );

    nodes.forEach((val, idx) => {
      const nx = startX + idx * spacing;
      const isCurr = idx === step;
      const isPrev = idx === step - 1;
      const isReversed = idx < step;

      elements.push(
        excalidrawEllipse(`ll-node-${idx}`, nx, nodeY, 68, 68, {
          strokeColor: isCurr ? "#0284c7" : isPrev ? "#d97706" : isReversed ? "#16a34a" : "#334155",
          backgroundColor: isCurr
            ? "#e0f2fe"
            : isPrev
            ? "#fef3c7"
            : isReversed
            ? "#dcfce7"
            : "#ffffff",
          strokeWidth: isCurr || isPrev ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`ll-val-${idx}`, nx + 20, nodeY + 22, String(val), {
          fontSize: 20,
          strokeColor: "#0f172a",
          version: ver,
        })
      );

      if (idx < nodes.length - 1) {
        const nextNx = startX + (idx + 1) * spacing;
        if (idx < step - 1) {
          // Reversed link pointing left
          elements.push(
            excalidrawArrow(`ll-edge-${idx}`, nextNx - 4, nodeY + 34, nx + 72, nodeY + 34, {
              strokeColor: "#16a34a",
              strokeWidth: 3,
              version: ver,
            })
          );
        } else {
          // Forward link pointing right
          elements.push(
            excalidrawArrow(`ll-edge-${idx}`, nx + 72, nodeY + 34, nextNx - 4, nodeY + 34, {
              strokeColor: "#64748b",
              strokeWidth: 2,
              version: ver,
            })
          );
        }
      }

      if (isPrev) {
        elements.push(
          excalidrawText(`ll-prev-lbl`, nx + 10, nodeY - 34, "prev", {
            fontSize: 16,
            strokeColor: "#d97706",
            version: ver,
          })
        );
      }
      if (isCurr) {
        elements.push(
          excalidrawText(`ll-curr-lbl`, nx + 10, nodeY + 78, "curr", {
            fontSize: 16,
            strokeColor: "#0284c7",
            version: ver,
          })
        );
      }
    });

    const focusIdx = Math.min(step, nodes.length - 1);
    frames.push({
      stepIndex: step,
      title:
        step === nodes.length
          ? "Reversed List Ready (Head = 40)"
          : `Pointer Flip at Node ${nodes[focusIdx]}`,
      narration:
        step === 0
          ? "We start with prev = null and curr at head (10). Before flipping curr.next, we always save nextTemp = curr.next."
          : step === nodes.length
          ? "curr has reached null! All pointers are reversed in-place in O(N) time and O(1) extra space."
          : `We redirect Node(${nodes[step - 1]}).next backward to prev, then advance both prev and curr one step right.`,
      mathInvariant: `prev=${step > 0 ? nodes[step - 1] : "null"}, curr=${
        step < nodes.length ? nodes[step] : "null"
      }`,
      elements,
      aiLaserTarget: {
        x: startX + focusIdx * spacing + 34,
        y: nodeY + 34,
      },
    });
  }

  return {
    id: "linked_list",
    topic: "Linked List Reversal (3-Pointers)",
    badge: "O(N) Time • O(1) Space",
    frames,
  };
}

/**
 * Generates a Binary Search Tree / Recursion Tree interactive Excalidraw lesson.
 */
export function buildExcalidrawTreeLesson(): AiWhiteboardLesson {
  const treeNodes = [
    { id: 10, x: 360, y: 150, bounds: "(-∞, +∞)" },
    { id: 5, x: 210, y: 260, bounds: "(-∞, 10)" },
    { id: 15, x: 510, y: 260, bounds: "(10, +∞)" },
    { id: 3, x: 130, y: 370, bounds: "(-∞, 5)" },
    { id: 7, x: 290, y: 370, bounds: "(5, 10)" },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
  ];

  const stepsOrder = [
    { active: 10, visited: [10], desc: "Validate Root(10) within (-∞, +∞). Branch left with max=10, right with min=10." },
    { active: 5, visited: [10, 5], desc: "Left child Node(5) satisfies (-∞ < 5 < 10). Passrange (-∞, 5) left and (5, 10) right." },
    { active: 7, visited: [10, 5, 3, 7], desc: "Subtree nodes 3 ∈ (-∞, 5) and 7 ∈ (5, 10) both hold! Left subtree verified." },
    { active: 15, visited: [10, 5, 3, 7, 15], desc: "Right child Node(15) satisfies (10 < 15 < +∞). Global BST property verified in O(N) time!" },
  ];

  const frames: AiWhiteboardStepFrame[] = stepsOrder.map((st, idx) => {
    const ver = idx + 1;
    const elements: WbElement[] = [
      excalidrawRect("bst-header", 80, 35, 620, 82, {
        strokeColor: "#e11d48",
        backgroundColor: "#ffe4e6",
        version: ver,
      }),
      excalidrawText("bst-title", 98, 46, `Step ${ver}: DFS Range Validation at Node(${st.active})`, {
        fontSize: 18,
        strokeColor: "#be123c",
        version: ver,
      }),
      excalidrawText("bst-desc", 98, 78, st.desc, {
        fontSize: 13,
        strokeColor: "#0f172a",
        version: ver,
      }),
    ];

    edges.forEach(([u, v], eIdx) => {
      const n1 = treeNodes[u]!;
      const n2 = treeNodes[v]!;
      elements.push(
        excalidrawArrow(`bst-edge-${eIdx}`, n1.x + 30, n1.y + 58, n2.x + 30, n2.y, {
          strokeColor: "#64748b",
          strokeWidth: 2,
          version: ver,
        })
      );
    });

    treeNodes.forEach((n) => {
      const isAct = n.id === st.active;
      const isVis = st.visited.includes(n.id);
      elements.push(
        excalidrawEllipse(`bst-node-${n.id}`, n.x, n.y, 60, 60, {
          strokeColor: isAct ? "#d97706" : isVis ? "#16a34a" : "#334155",
          backgroundColor: isAct ? "#fef3c7" : isVis ? "#dcfce7" : "#ffffff",
          strokeWidth: isAct ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`bst-val-${n.id}`, n.x + 18, n.y + 18, String(n.id), {
          fontSize: 18,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawText(`bst-bnd-${n.id}`, n.x - 4, n.y + 64, n.bounds, {
          fontSize: 12,
          strokeColor: isAct ? "#b45309" : "#047857",
          version: ver,
        })
      );
    });

    const activeNodeObj = treeNodes.find((n) => n.id === st.active) || treeNodes[0]!;
    return {
      stepIndex: idx,
      title: `Validate Node(${st.active}) ∈ ${activeNodeObj.bounds}`,
      narration: st.desc,
      mathInvariant: `min < Node(${st.active}) < max  →  ${activeNodeObj.bounds}`,
      elements,
      aiLaserTarget: { x: activeNodeObj.x + 30, y: activeNodeObj.y + 30 },
    };
  });

  return {
    id: "tree",
    topic: "Binary Search Tree (DFS Range Invariant)",
    badge: "O(N) Time • O(H) Stack",
    frames,
  };
}

/**
 * Generates a Sliding Window (Max Subarray Sum k=3) interactive Excalidraw lesson.
 */
export function buildExcalidrawSlidingWindowLesson(
  arr: number[] = [2, 1, 5, 1, 3, 2],
  k = 3
): AiWhiteboardLesson {
  const frames: AiWhiteboardStepFrame[] = [];
  let windowSum = 0;
  for (let i = 0; i < Math.min(k, arr.length); i++) windowSum += arr[i]!;
  let maxSum = windowSum;

  const totalWindows = Math.max(1, arr.length - k + 1);
  for (let wStart = 0; wStart < totalWindows; wStart++) {
    const wEnd = wStart + k - 1;
    if (wStart > 0) {
      windowSum = windowSum - arr[wStart - 1]! + arr[wEnd]!;
      maxSum = Math.max(maxSum, windowSum);
    }
    const ver = wStart + 1;
    const baseX = 80;
    const baseY = 195;
    const cellW = 74;
    const cellH = 60;

    const elements: WbElement[] = [
      excalidrawRect("sw-hdr", baseX, 38, 600, 88, {
        strokeColor: "#d97706",
        backgroundColor: "#fef3c7",
        version: ver,
      }),
      excalidrawText(
        "sw-hdr-title",
        baseX + 16,
        50,
        `Step ${ver}: Window [${wStart}..${wEnd}] • Sum = ${windowSum} • Best Max = ${maxSum}`,
        { fontSize: 18, strokeColor: "#b45309", version: ver }
      ),
      excalidrawText(
        "sw-hdr-sub",
        baseX + 16,
        82,
        wStart === 0
          ? `Initialize first window of size k=${k}: sum = ${windowSum}`
          : `Slide right: subtract outgoing arr[${wStart - 1}] (${arr[wStart - 1]}) & add incoming arr[${wEnd}] (${arr[wEnd]})`,
        { fontSize: 14, strokeColor: "#0f172a", version: ver }
      ),
    ];

    // Window outer frame box
    elements.push(
      excalidrawRect(
        "sw-frame",
        baseX + wStart * cellW - 8,
        baseY - 10,
        k * cellW + 10,
        cellH + 20,
        {
          strokeColor: "#d97706",
          backgroundColor: "transparent",
          strokeWidth: 3,
          strokeStyle: "dashed",
          version: ver,
        }
      )
    );

    arr.forEach((val, idx) => {
      const cx = baseX + idx * cellW;
      const inWin = idx >= wStart && idx <= wEnd;
      elements.push(
        excalidrawRect(`sw-cell-${idx}`, cx, baseY, cellW - 6, cellH, {
          strokeColor: inWin ? "#d97706" : "#64748b",
          backgroundColor: inWin ? "#fef3c7" : "#ffffff",
          strokeWidth: inWin ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`sw-val-${idx}`, cx + 22, baseY + 18, String(val), {
          fontSize: 20,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawText(`sw-idx-${idx}`, cx + 20, baseY + cellH + 14, `[${idx}]`, {
          fontSize: 13,
          strokeColor: "#64748b",
          version: ver,
        })
      );
    });

    frames.push({
      stepIndex: wStart,
      title: `Window [${wStart}..${wEnd}] (Sum = ${windowSum})`,
      narration:
        wStart === 0
          ? `We sum the first ${k} elements to get ${windowSum}, setting our initial maximum to ${maxSum}.`
          : `Sliding the window right by 1 drops ${arr[wStart - 1]} and adds ${arr[wEnd]} in O(1) time. Current sum is ${windowSum}, best max is ${maxSum}.`,
      mathInvariant: `windowSum = ${windowSum} | maxSum = ${maxSum}`,
      elements,
      aiLaserTarget: {
        x: baseX + wEnd * cellW + 30,
        y: baseY + 30,
      },
    });
  }

  return {
    id: "sliding_window",
    topic: "Sliding Window (Fixed Size k=3)",
    badge: "O(N) Time • O(1) Space",
    frames,
  };
}

/**
 * Generates a Monotonic Stack (Next Greater Element) interactive Excalidraw lesson.
 */
export function buildExcalidrawMonotonicStackLesson(): AiWhiteboardLesson {
  const arr = [2, 1, 5, 3, 6];
  const stepsData = [
    {
      activeIdx: 1,
      stack: [2, 1],
      ans: [-1, -1, -1, -1, -1],
      title: "Push Decreasing Prefix [2, 1]",
      narration: "Elements 2 and 1 maintain a monotonic decreasing stack. Both wait for a larger element.",
    },
    {
      activeIdx: 2,
      stack: [5],
      ans: [5, 5, -1, -1, -1],
      title: "Incoming 5 Pops 1 and 2!",
      narration: "5 is greater than stack top 1 and 2! Both are popped and their Next Greater Element is recorded as 5.",
    },
    {
      activeIdx: 4,
      stack: [6],
      ans: [5, 5, 6, 6, -1],
      title: "Incoming 6 Resolves 3 and 5!",
      narration: "After pushing 3, incoming 6 pops both 3 and 5, completing the Next Greater array in O(N) amortized time!",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = stepsData.map((st, sIdx) => {
    const ver = sIdx + 1;
    const baseX = 75;
    const els: WbElement[] = [
      excalidrawRect("ms-hdr", baseX, 35, 620, 82, {
        strokeColor: "#db2777",
        backgroundColor: "#fce7f3",
        version: ver,
      }),
      excalidrawText("ms-title", baseX + 16, 46, `Step ${ver}: ${st.title}`, {
        fontSize: 18,
        strokeColor: "#be185d",
        version: ver,
      }),
      excalidrawText("ms-sub", baseX + 16, 78, st.narration, {
        fontSize: 13,
        strokeColor: "#0f172a",
        version: ver,
      }),
    ];

    arr.forEach((v, i) => {
      const cx = baseX + i * 74;
      const isAct = i === st.activeIdx;
      els.push(
        excalidrawRect(`ms-in-${i}`, cx, 165, 66, 54, {
          strokeColor: isAct ? "#db2777" : "#334155",
          backgroundColor: isAct ? "#fbcfe8" : "#ffffff",
          strokeWidth: isAct ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`ms-in-v-${i}`, cx + 22, 182, String(v), {
          fontSize: 18,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawRect(`ms-ans-${i}`, cx, 265, 66, 54, {
          strokeColor: st.ans[i] !== -1 ? "#16a34a" : "#94a3b8",
          backgroundColor: st.ans[i] !== -1 ? "#dcfce7" : "#f8fafc",
          version: ver,
        }),
        excalidrawText(`ms-ans-v-${i}`, cx + 18, 282, String(st.ans[i]), {
          fontSize: 18,
          strokeColor: st.ans[i] !== -1 ? "#15803d" : "#64748b",
          version: ver,
        })
      );
    });

    // Stack Bucket on the right
    els.push(
      excalidrawRect("ms-stack-box", 510, 155, 160, 170, {
        strokeColor: "#0284c7",
        backgroundColor: "#f0f9ff",
        version: ver,
      }),
      excalidrawText("ms-stack-lbl", 530, 165, "Monotonic Stack", {
        fontSize: 15,
        strokeColor: "#0369a1",
        version: ver,
      })
    );

    st.stack.forEach((sv, sPos) => {
      els.push(
        excalidrawRect(`ms-stk-${sPos}`, 540, 265 - sPos * 46, 100, 40, {
          strokeColor: "#0284c7",
          backgroundColor: "#bae6fd",
          version: ver,
        }),
        excalidrawText(`ms-stk-v-${sPos}`, 580, 276 - sPos * 46, String(sv), {
          fontSize: 17,
          strokeColor: "#0f172a",
          version: ver,
        })
      );
    });

    return {
      stepIndex: sIdx,
      title: st.title,
      narration: st.narration,
      mathInvariant: `Stack = [${st.stack.join(", ")}] • Ans = [${st.ans.join(", ")}]`,
      elements: els,
      aiLaserTarget: { x: baseX + st.activeIdx * 74 + 33, y: 192 },
    };
  });

  return {
    id: "monotonic_stack",
    topic: "Monotonic Stack (Next Greater Element)",
    badge: "O(N) Amortized • O(N) Space",
    frames,
  };
}

/**
 * Generates a Dynamic Programming 1D Memoization Table Excalidraw lesson.
 */
export function buildExcalidrawDpTableLesson(): AiWhiteboardLesson {
  const dp = [1, 1, 2, 3, 5, 8, 13];
  const frames: AiWhiteboardStepFrame[] = [];

  for (let step = 2; step < dp.length; step++) {
    const ver = step - 1;
    const baseX = 75;
    const baseY = 200;
    const cellW = 74;

    const els: WbElement[] = [
      excalidrawRect("dp-hdr", baseX, 38, 600, 86, {
        strokeColor: "#7c3aed",
        backgroundColor: "#f3e8ff",
        version: ver,
      }),
      excalidrawText(
        "dp-title",
        baseX + 16,
        50,
        `Step ${ver}: Compute dp[${step}] = dp[${step - 1}] (${dp[step - 1]}) + dp[${step - 2}] (${dp[step - 2]}) = ${dp[step]}`,
        { fontSize: 18, strokeColor: "#6d28d9", version: ver }
      ),
      excalidrawText(
        "dp-sub",
        baseX + 16,
        82,
        `Optimal Substructure: Overlapping subproblems cached in O(1) lookup time`,
        { fontSize: 14, strokeColor: "#0f172a", version: ver }
      ),
    ];

    dp.forEach((val, idx) => {
      const cx = baseX + idx * cellW;
      const isComputed = idx <= step;
      const isCurrent = idx === step;
      const isDep = idx === step - 1 || idx === step - 2;

      els.push(
        excalidrawRect(`dp-cell-${idx}`, cx, baseY, cellW - 6, 60, {
          strokeColor: isCurrent ? "#7c3aed" : isDep ? "#0284c7" : isComputed ? "#16a34a" : "#cbd5e1",
          backgroundColor: isCurrent
            ? "#ddd6fe"
            : isDep
            ? "#e0f2fe"
            : isComputed
            ? "#dcfce7"
            : "#f8fafc",
          strokeWidth: isCurrent || isDep ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`dp-val-${idx}`, cx + 20, baseY + 18, isComputed ? String(val) : "?", {
          fontSize: 20,
          strokeColor: isComputed ? "#0f172a" : "#94a3b8",
          version: ver,
        }),
        excalidrawText(`dp-idx-${idx}`, cx + 14, baseY + 68, `dp[${idx}]`, {
          fontSize: 13,
          strokeColor: "#475569",
          version: ver,
        })
      );
    });

    // Transition arrows from dp[step-1] and dp[step-2] to dp[step]
    const targetX = baseX + step * cellW + 30;
    const dep1X = baseX + (step - 1) * cellW + 30;
    const dep2X = baseX + (step - 2) * cellW + 30;

    els.push(
      excalidrawArrow("dp-arr-1", dep1X, baseY - 8, targetX - 8, baseY - 8, {
        strokeColor: "#0284c7",
        strokeWidth: 2.5,
        version: ver,
      }),
      excalidrawArrow("dp-arr-2", dep2X, baseY - 26, targetX - 4, baseY - 26, {
        strokeColor: "#7c3aed",
        strokeWidth: 2.5,
        version: ver,
      })
    );

    frames.push({
      stepIndex: ver - 1,
      title: `Transition dp[${step}] = ${dp[step - 1]} + ${dp[step - 2]} = ${dp[step]}`,
      narration: `To compute dp[${step}], we reuse already memoized states dp[${step - 1}]=${dp[step - 1]} and dp[${step - 2}]=${dp[step - 2]} in O(1) time, avoiding exponential recursion.`,
      mathInvariant: `dp[${step}] = dp[${step - 1}] + dp[${step - 2}] = ${dp[step]}`,
      elements: els,
      aiLaserTarget: { x: targetX, y: baseY + 30 },
    });
  }

  return {
    id: "dp_table",
    topic: "Dynamic Programming (1D Tabulation)",
    badge: "O(N) Time • O(N) Space",
    frames,
  };
}

/**
 * Generates a Sliding Window / Dynamic Programming / DAG / Custom Query diagram on Excalidraw
 * for ANY user prompt!
 */
export function generateAiExcalidrawLessonForQuery(query: string): AiWhiteboardLesson {
  const q = query.toLowerCase();

  const numberMatches = query.match(/-?\d+/g)?.map(Number).filter((n) => !Number.isNaN(n)) || [];

  if (q.includes("sliding window") || q.includes("subarray") || q.includes("window")) {
    return buildExcalidrawSlidingWindowLesson();
  }

  if (q.includes("monotonic") || q.includes("stack") || q.includes("next greater")) {
    return buildExcalidrawMonotonicStackLesson();
  }

  if (q.includes("dp") || q.includes("dynamic programming") || q.includes("memo") || q.includes("fibonacci") || q.includes("knapsack") || q.includes("climbing")) {
    return buildExcalidrawDpTableLesson();
  }

  if (q.includes("binary search") || q.includes("mid") || q.includes("sorted range") || q.includes("halv")) {
    const arr = numberMatches.length >= 4 ? numberMatches.slice(0, -1) : [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
    const target = numberMatches.length >= 4 ? numberMatches[numberMatches.length - 1]! : 23;
    return buildExcalidrawBinarySearchLesson(arr, target);
  }

  if (q.includes("linked list") || q.includes("reverse") || q.includes("next") || q.includes("prev")) {
    return buildExcalidrawLinkedListLesson();
  }

  if (q.includes("tree") || q.includes("bst") || q.includes("dfs") || q.includes("bfs") || q.includes("recursion")) {
    return buildExcalidrawTreeLesson();
  }

  if (q.includes("two pointer") || q.includes("pointer") || q.includes("pair") || q.includes("two sum")) {
    const arr = numberMatches.length >= 4 ? numberMatches.slice(0, -1) : [1, 3, 5, 8, 12, 17, 21];
    const target = numberMatches.length >= 4 ? numberMatches[numberMatches.length - 1]! : 17;
    return buildExcalidrawTwoPointersLesson(arr, target);
  }

  // Dynamic Custom Concept / Architecture / Algorithm Diagram Generator for any custom query!
  const cleanTitle = query.trim().slice(0, 68) || "Algorithmic Breakdown & Dry-Run";
  const stages = [
    {
      label: "1. Input & Invariant Setup",
      detail: `Parse input constraints & initialize state for: "${cleanTitle}"`,
      color: "#e0f2fe",
      stroke: "#0284c7",
    },
    {
      label: "2. State Transition / Core Loop",
      detail: "Maintain monotonic / hash / pointer invariant at each iteration in O(1) amortized work",
      color: "#fef3c7",
      stroke: "#d97706",
    },
    {
      label: "3. Optimal Output & Complexity",
      detail: "Verify boundary conditions (empty, single-element, duplicates) & return optimal result",
      color: "#dcfce7",
      stroke: "#16a34a",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = stages.map((st, sIdx) => {
    const ver = sIdx + 1;
    const els: WbElement[] = [
      excalidrawRect("custom-hdr", 80, 35, 660, 75, {
        strokeColor: "#0284c7",
        backgroundColor: "#f0f9ff",
        version: ver,
      }),
      excalidrawText("custom-hdr-txt", 98, 48, `AI Whiteboard Walkthrough: ${cleanTitle}`, {
        fontSize: 18,
        strokeColor: "#0369a1",
        version: ver,
      }),
      excalidrawText("custom-hdr-sub", 98, 78, `Active Stage ${ver}/3: ${st.label}`, {
        fontSize: 14,
        strokeColor: "#334155",
        version: ver,
      }),
    ];

    stages.forEach((box, bIdx) => {
      const bx = 80 + bIdx * 230;
      const by = 165;
      const isCurrent = bIdx === sIdx;
      const isDone = bIdx < sIdx;

      els.push(
        excalidrawRect(`custom-stage-${bIdx}`, bx, by, 200, 120, {
          strokeColor: isCurrent ? box.stroke : isDone ? "#16a34a" : "#94a3b8",
          backgroundColor: isCurrent ? box.color : isDone ? "#f0fdf4" : "#ffffff",
          strokeWidth: isCurrent ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`custom-st-title-${bIdx}`, bx + 14, by + 18, box.label, {
          fontSize: 15,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawText(
          `custom-st-desc-${bIdx}`,
          bx + 14,
          by + 52,
          box.detail.slice(0, 26) + "\n" + box.detail.slice(26, 54),
          {
            fontSize: 12,
            strokeColor: "#475569",
            version: ver,
          }
        )
      );

      if (bIdx < stages.length - 1) {
        els.push(
          excalidrawArrow(`custom-arr-${bIdx}`, bx + 202, by + 60, bx + 228, by + 60, {
            strokeColor: bIdx < sIdx ? "#16a34a" : "#64748b",
            strokeWidth: 2,
            version: ver,
          })
        );
      }
    });

    // Bottom Trace Box
    els.push(
      excalidrawRect("custom-trace-box", 80, 320, 660, 90, {
        strokeColor: st.stroke,
        backgroundColor: "#ffffff",
        version: ver,
      }),
      excalidrawText("custom-trace-txt", 98, 338, `${st.label}\n${st.detail}`, {
        fontSize: 15,
        strokeColor: "#0f172a",
        version: ver,
      })
    );

    return {
      stepIndex: sIdx,
      title: st.label,
      narration: st.detail,
      mathInvariant: `Stage ${ver}/3 • ${st.label}`,
      elements: els,
      aiLaserTarget: { x: 80 + sIdx * 230 + 100, y: 225 },
    };
  });

  return {
    id: `custom_${Date.now()}`,
    topic: cleanTitle,
    badge: "AI Custom Diagram",
    frames,
  };
}

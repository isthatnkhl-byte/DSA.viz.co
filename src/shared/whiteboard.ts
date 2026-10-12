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
  /** Ordered path of coordinates for smooth 60fps AI cursor movement across the frame */
  aiLaserWaypoints?: Array<{ x: number; y: number }>;
}

export interface AiWhiteboardLesson {
  id: string;
  topic: string;
  badge: string;
  frames: AiWhiteboardStepFrame[];
  /** Unique bounded zone ID so this simulation has its own isolated area on the canvas */
  zoneId?: string;
  /** Bounding box of this simulation's dedicated frame on the Excalidraw canvas */
  zoneBounds?: { x: number; y: number; width: number; height: number };
  /** Source of the lesson ("gemini_live" | "openai_live" | "openrouter_live" | "deterministic_fallback" | "preset") */
  aiSource?:
    | "gemini_live"
    | "openai_live"
    | "openrouter_live"
    | "deterministic_fallback"
    | "preset";
  /** Identifier of the model that answered (e.g. "gemini-flash-lite-latest", "Offline Fallback", "Offline Preset") */
  modelUsed?: string;
  /** Optional error/fallback reason when deterministic_fallback is used */
  fallbackReason?: string;
}

export interface WhiteboardSelectedElementSummary {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  strokeColor?: string;
  backgroundColor?: string;
}

export interface LinkedZoneContext {
  zoneId: string;
  zoneNumber: number;
  topic: string;
  badge: string;
  activeStepIndex: number;
  activeStepTitle: string;
  activeStepNarration: string;
  activeStepMathInvariant: string;
  allStepsSummary: Array<{
    stepNumber: number;
    title: string;
    narration: string;
    mathInvariant: string;
  }>;
  dataValues: number[];
  dataLabels: string[];
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } | null;
}

export interface WhiteboardSelectionContext {
  selectedElements: WhiteboardSelectedElementSummary[];
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } | null;
  extractedNumbers?: number[];
  extractedTexts?: string[];
  mode?: "branch" | "takeover";
  linkedZone?: LinkedZoneContext | null;
}

export function wrapWhiteboardText(
  text: string,
  maxCharsPerLine = 54,
  maxLines = 4
): string {
  if (!text) return "";
  const rawParagraphs = String(text).split("\n");
  const outLines: string[] = [];

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      outLines.push("");
      continue;
    }
    if (trimmed.length <= maxCharsPerLine) {
      outLines.push(trimmed);
      continue;
    }
    const words = trimmed.split(/\s+/);
    let currentLine = "";
    for (const word of words) {
      if (!currentLine) {
        currentLine =
          word.length > maxCharsPerLine
            ? word.slice(0, maxCharsPerLine - 1) + "…"
            : word;
      } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
        currentLine += " " + word;
      } else {
        outLines.push(currentLine);
        currentLine =
          word.length > maxCharsPerLine
            ? word.slice(0, maxCharsPerLine - 1) + "…"
            : word;
      }
    }
    if (currentLine) outLines.push(currentLine);
  }

  if (outLines.length > maxLines) {
    const clipped = outLines.slice(0, maxLines);
    const lastIdx = clipped.length - 1;
    if (lastIdx >= 0 && !clipped[lastIdx]!.endsWith("…")) {
      clipped[lastIdx] =
        clipped[lastIdx]!.slice(0, Math.max(1, maxCharsPerLine - 2)) + "…";
    }
    return clipped.join("\n");
  }
  return outLines.join("\n");
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
    maxCharsPerLine?: number;
    maxLines?: number;
    version?: number;
  } = {}
): WbElement {
  const fontSize = opts.fontSize ?? 16;
  const maxChars = opts.maxCharsPerLine ?? (fontSize >= 17 ? 52 : 64);
  const wrapped = wrapWhiteboardText(text, maxChars, opts.maxLines ?? 3);
  const lines = wrapped.split("\n");
  const maxLen = Math.max(...lines.map((l) => l.length), 1);
  // Cascadia monospace in Excalidraw renders at ~0.65 * fontSize per glyph
  const width = Math.max(28, Math.round(maxLen * fontSize * 0.65) + 12);
  const height = Math.max(22, Math.round(lines.length * fontSize * 1.32));

  return makeBaseProps(id, "text", x, y, width, height, opts.version ?? 1, {
    text: wrapped,
    originalText: wrapped,
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
 * Multi-point or 2-point Excalidraw line primitive (used for container walls,
 * split-node dividers, number-line axes, and bracket annotations).
 */
export function excalidrawLine(
  id: string,
  x: number,
  y: number,
  points: Array<[number, number]>,
  opts: {
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: "solid" | "dashed" | "dotted";
    roundness?: { type: number } | null;
    version?: number;
  } = {}
): WbElement {
  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (const [px, py] of points) {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  return makeBaseProps(
    id,
    "line",
    x,
    y,
    Math.max(4, Math.abs(maxX - minX)),
    Math.max(4, Math.abs(maxY - minY)),
    opts.version ?? 1,
    {
      strokeColor: opts.strokeColor ?? "#334155",
      strokeWidth: opts.strokeWidth ?? 2.5,
      strokeStyle: opts.strokeStyle ?? "solid",
      points,
      roundness: opts.roundness ?? null,
      startBinding: null,
      endBinding: null,
      lastCommittedPoint: null,
      startArrowhead: null,
      endArrowhead: null,
    }
  );
}

/**
 * Smooth 3-point curved arc arrow in Excalidraw (`roundness: { type: 2 }`).
 * Great for DP transitions, pointer jumps, heap swaps, and graph edges without cutting through boxes.
 */
export function excalidrawCurvedArrow(
  id: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  opts: {
    curveOffset?: number;
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: "solid" | "dashed" | "dotted";
    bidirectional?: boolean;
    version?: number;
  } = {}
): WbElement {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const offset = opts.curveOffset ?? -38;
  // Normal unit vector perpendicular to (dx, dy)
  const nx = -dy / len;
  const ny = dx / len;
  const midX = Math.round(dx / 2 + nx * offset);
  const midY = Math.round(dy / 2 + ny * offset);

  return makeBaseProps(
    id,
    "arrow",
    fromX,
    fromY,
    Math.max(Math.abs(dx), Math.abs(midX)),
    Math.max(Math.abs(dy), Math.abs(midY)),
    opts.version ?? 1,
    {
      strokeColor: opts.strokeColor ?? "#0284c7",
      strokeWidth: opts.strokeWidth ?? 2.5,
      strokeStyle: opts.strokeStyle ?? "solid",
      roundness: { type: 2 },
      points: [
        [0, 0],
        [midX, midY],
        [dx, dy],
      ],
      startBinding: null,
      endBinding: null,
      lastCommittedPoint: null,
      startArrowhead: opts.bidirectional ? "arrow" : null,
      endArrowhead: "arrow",
    }
  );
}

/**
 * 90-degree orthogonal ("elbow") multi-segment arrow in Excalidraw.
 * Routes along clean horizontal/vertical channels instead of diagonal lines.
 */
export function excalidrawElbowArrow(
  id: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  opts: {
    routing?: "h-v-h" | "v-h-v" | "l-shape";
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: "solid" | "dashed" | "dotted";
    bidirectional?: boolean;
    version?: number;
  } = {}
): WbElement {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const routing = opts.routing ?? (Math.abs(dx) > Math.abs(dy) ? "h-v-h" : "v-h-v");

  const points: Array<[number, number]> =
    routing === "l-shape"
      ? [
          [0, 0],
          [0, dy],
          [dx, dy],
        ]
      : routing === "v-h-v"
      ? [
          [0, 0],
          [0, Math.round(dy / 2)],
          [dx, Math.round(dy / 2)],
          [dx, dy],
        ]
      : [
          [0, 0],
          [Math.round(dx / 2), 0],
          [Math.round(dx / 2), dy],
          [dx, dy],
        ];

  return makeBaseProps(
    id,
    "arrow",
    fromX,
    fromY,
    Math.max(8, Math.abs(dx)),
    Math.max(8, Math.abs(dy)),
    opts.version ?? 1,
    {
      strokeColor: opts.strokeColor ?? "#0284c7",
      strokeWidth: opts.strokeWidth ?? 2.5,
      strokeStyle: opts.strokeStyle ?? "solid",
      roundness: null,
      points,
      startBinding: null,
      endBinding: null,
      lastCommittedPoint: null,
      startArrowhead: opts.bidirectional ? "arrow" : null,
      endArrowhead: "arrow",
    }
  );
}

/**
 * Universal connector helper that supports `straight`, `curved`, or `elbow` routing,
 * `bidirectional` arrowheads, and an optional midpoint badge label (e.g. graph edge weights).
 */
export function excalidrawLabeledConnector(
  id: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  opts: {
    style?: "straight" | "curved" | "elbow";
    curveOffset?: number;
    label?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: "solid" | "dashed" | "dotted";
    bidirectional?: boolean;
    version?: number;
  } = {}
): WbElement[] {
  const ver = opts.version ?? 1;
  const style = opts.style ?? "straight";
  const strokeColor = opts.strokeColor ?? "#0284c7";
  const els: WbElement[] = [];

  if (style === "curved") {
    els.push(
      excalidrawCurvedArrow(id, fromX, fromY, toX, toY, {
        curveOffset: opts.curveOffset,
        strokeColor,
        strokeWidth: opts.strokeWidth,
        strokeStyle: opts.strokeStyle,
        bidirectional: opts.bidirectional,
        version: ver,
      })
    );
  } else if (style === "elbow") {
    els.push(
      excalidrawElbowArrow(id, fromX, fromY, toX, toY, {
        strokeColor,
        strokeWidth: opts.strokeWidth,
        strokeStyle: opts.strokeStyle,
        bidirectional: opts.bidirectional,
        version: ver,
      })
    );
  } else {
    const baseArr = excalidrawArrow(id, fromX, fromY, toX, toY, {
      strokeColor,
      strokeWidth: opts.strokeWidth,
      strokeStyle: opts.strokeStyle,
      version: ver,
    });
    if (opts.bidirectional) {
      (baseArr as any).startArrowhead = "arrow";
    }
    els.push(baseArr);
  }

  if (opts.label) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const offset = style === "curved" ? (opts.curveOffset ?? -38) * 0.65 : 0;
    const nx = -dy / len;
    const ny = dx / len;
    const midX = Math.round(fromX + dx / 2 + nx * offset);
    const midY = Math.round(fromY + dy / 2 + ny * offset);
    const lblText = String(opts.label).slice(0, 14);
    const pillW = Math.max(28, lblText.length * 9 + 12);

    els.push(
      excalidrawRect(`${id}-lbl-bg`, midX - pillW / 2, midY - 11, pillW, 22, {
        strokeColor,
        backgroundColor: "#ffffff",
        strokeWidth: 1.5,
        version: ver,
      }),
      excalidrawText(`${id}-lbl-txt`, midX - pillW / 2 + 5, midY - 8, lblText, {
        fontSize: 12,
        strokeColor: "#0f172a",
        maxCharsPerLine: 16,
        maxLines: 1,
        version: ver,
      })
    );
  }

  return els;
}

/**
 * Multi-compartment memory node (`[prev | val | next]`, `[key | val]`, `[char | ★]`, `[parent | rank]`).
 * Draws an outer rounded rectangle divided by vertical separator lines with text in each compartment.
 */
export function excalidrawSplitNode(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  compartments: string[],
  opts: {
    strokeColor?: string;
    backgroundColor?: string;
    strokeWidth?: number;
    sublabel?: string;
    version?: number;
  } = {}
): WbElement[] {
  const ver = opts.version ?? 1;
  const parts = compartments.length > 0 ? compartments : [""];
  const strokeColor = opts.strokeColor ?? "#1e293b";
  const backgroundColor = opts.backgroundColor ?? "#ffffff";
  const els: WbElement[] = [
    excalidrawRect(`${id}-box`, x, y, width, height, {
      strokeColor,
      backgroundColor,
      strokeWidth: opts.strokeWidth ?? 2.5,
      version: ver,
    }),
  ];

  const partW = width / parts.length;
  parts.forEach((txt, idx) => {
    if (idx > 0) {
      const divX = Math.round(x + idx * partW);
      els.push(
        excalidrawLine(
          `${id}-div-${idx}`,
          divX,
          y + 2,
          [
            [0, 0],
            [0, height - 4],
          ],
          {
            strokeColor,
            strokeWidth: 2,
            version: ver,
          }
        )
      );
    }
    const cleanTxt = String(txt);
    const tx = Math.round(x + idx * partW + Math.max(6, (partW - cleanTxt.length * 9) / 2));
    const ty = Math.round(y + Math.max(8, (height - 18) / 2));
    els.push(
      excalidrawText(`${id}-part-${idx}`, tx, ty, cleanTxt, {
        fontSize: 14,
        strokeColor: "#0f172a",
        maxCharsPerLine: Math.max(4, Math.floor(partW / 8)),
        maxLines: 1,
        version: ver,
      })
    );
  });

  if (opts.sublabel) {
    els.push(
      excalidrawText(`${id}-sub`, x + 6, y + height + 6, opts.sublabel, {
        fontSize: 12,
        strokeColor,
        maxCharsPerLine: 24,
        maxLines: 1,
        version: ver,
      })
    );
  }

  return els;
}

/**
 * Open-top U-Bucket (`kind: "stack"`) or Open-ended Horizontal Pipe (`kind: "queue" | "deque"`).
 * Renders physical container walls using Excalidraw lines plus the items inside.
 */
export function excalidrawContainerBucket(
  id: string,
  x: number,
  y: number,
  opts: {
    kind: "stack" | "queue" | "deque";
    title?: string;
    items: Array<{ label: string; highlight?: boolean; color?: string }>;
    capacity?: number;
    strokeColor?: string;
    version?: number;
  }
): { elements: WbElement[]; focusPoint: { x: number; y: number } } {
  const ver = opts.version ?? 1;
  const strokeColor = opts.strokeColor ?? "#0284c7";
  const els: WbElement[] = [];

  if (opts.kind === "stack") {
    const cap = Math.max(opts.capacity ?? 4, opts.items.length, 3);
    const boxW = 136;
    const itemH = 40;
    const boxH = cap * (itemH + 6) + 22;

    if (opts.title) {
      els.push(
        excalidrawText(`${id}-title`, x + 8, y - 26, opts.title, {
          fontSize: 14,
          strokeColor,
          maxLines: 1,
          version: ver,
        })
      );
    }

    // Open-top U-shaped walls: [(0,0) -> (0, boxH) -> (boxW, boxH) -> (boxW, 0)]
    els.push(
      excalidrawLine(
        `${id}-u-walls`,
        x,
        y,
        [
          [0, 0],
          [0, boxH],
          [boxW, boxH],
          [boxW, 0],
        ],
        {
          strokeColor,
          strokeWidth: 3.5,
          version: ver,
        }
      )
    );

    opts.items.forEach((it, idx) => {
      const iy = y + boxH - (idx + 1) * (itemH + 6) - 4;
      const isTop = idx === opts.items.length - 1;
      els.push(
        excalidrawRect(`${id}-it-${idx}`, x + 12, iy, boxW - 24, itemH, {
          strokeColor: it.highlight || isTop ? "#db2777" : strokeColor,
          backgroundColor: it.highlight || isTop ? "#fbcfe8" : "#e0f2fe",
          strokeWidth: it.highlight || isTop ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`${id}-it-txt-${idx}`, x + 28, iy + 10, it.label, {
          fontSize: 15,
          strokeColor: "#0f172a",
          maxLines: 1,
          version: ver,
        })
      );
      if (isTop) {
        els.push(
          excalidrawText(`${id}-top-lbl`, x + boxW + 8, iy + 11, "← TOP", {
            fontSize: 12,
            strokeColor: "#db2777",
            maxLines: 1,
            version: ver,
          })
        );
      }
    });

    const topIdx = Math.max(0, opts.items.length - 1);
    const topY = y + boxH - (topIdx + 1) * (itemH + 6) + itemH / 2;
    return {
      elements: els,
      focusPoint: { x: x + boxW / 2, y: opts.items.length > 0 ? topY : y + boxH / 2 },
    };
  }

  // Queue / Deque: open-ended horizontal pipe with top & bottom rails
  const cap = Math.max(opts.capacity ?? 5, opts.items.length, 3);
  const itemW = 68;
  const pipeW = cap * (itemW + 8) + 24;
  const pipeH = 58;

  if (opts.title) {
    els.push(
      excalidrawText(`${id}-title`, x, y - 26, opts.title, {
        fontSize: 14,
        strokeColor,
        maxLines: 1,
        version: ver,
      })
    );
  }

  els.push(
    excalidrawLine(`${id}-rail-top`, x, y, [[0, 0], [pipeW, 0]], {
      strokeColor,
      strokeWidth: 3.5,
      version: ver,
    }),
    excalidrawLine(`${id}-rail-bot`, x, y + pipeH, [[0, 0], [pipeW, 0]], {
      strokeColor,
      strokeWidth: 3.5,
      version: ver,
    }),
    excalidrawText(`${id}-front-lbl`, x - 4, y + pipeH + 8, "← FRONT (Pop)", {
      fontSize: 11,
      strokeColor: "#047857",
      maxLines: 1,
      version: ver,
    }),
    excalidrawText(`${id}-rear-lbl`, x + pipeW - 92, y + pipeH + 8, "(Push) REAR ←", {
      fontSize: 11,
      strokeColor: "#b45309",
      maxLines: 1,
      version: ver,
    })
  );

  opts.items.forEach((it, idx) => {
    const ix = x + 12 + idx * (itemW + 8);
    els.push(
      excalidrawRect(`${id}-q-it-${idx}`, ix, y + 8, itemW, pipeH - 16, {
        strokeColor: it.highlight ? "#d97706" : strokeColor,
        backgroundColor: it.highlight ? "#fef3c7" : "#e0f2fe",
        strokeWidth: it.highlight ? 3 : 2,
        version: ver,
      }),
      excalidrawText(`${id}-q-txt-${idx}`, ix + 14, y + 18, it.label, {
        fontSize: 15,
        strokeColor: "#0f172a",
        maxLines: 1,
        version: ver,
      })
    );
  });

  const lastIdx = Math.max(0, opts.items.length - 1);
  return {
    elements: els,
    focusPoint: {
      x: x + 12 + lastIdx * (itemW + 8) + itemW / 2,
      y: y + pipeH / 2,
    },
  };
}

/**
 * 2D Matrix / Grid widget with `(row, col)` headers and per-cell state coloring.
 * Ideal for 2D DP tables (Knapsack, LCS, Edit Distance), Grid BFS/DFS (Islands, Flood Fill), and Backtracking.
 */
export function excalidrawGrid2D(
  id: string,
  x: number,
  y: number,
  matrix: Array<Array<string | number>>,
  opts: {
    rowLabels?: string[];
    colLabels?: string[];
    activeCell?: [number, number] | null;
    secondaryCells?: Array<[number, number]>;
    visitedCells?: Set<string>;
    cellW?: number;
    cellH?: number;
    version?: number;
  } = {}
): {
  elements: WbElement[];
  getCellCenter: (r: number, c: number) => { x: number; y: number };
} {
  const ver = opts.version ?? 1;
  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0]!.length : 0;
  const cellW = opts.cellW ?? 62;
  const cellH = opts.cellH ?? 48;
  const hdrOffsetX = 48;
  const hdrOffsetY = 32;
  const els: WbElement[] = [];

  const secondarySet = new Set(
    (opts.secondaryCells ?? []).map(([r, c]) => `${r},${c}`)
  );

  // Column headers
  for (let c = 0; c < cols; c++) {
    const colLbl = opts.colLabels?.[c] ?? `c=${c}`;
    els.push(
      excalidrawText(
        `${id}-col-hdr-${c}`,
        x + hdrOffsetX + c * cellW + 10,
        y + 6,
        colLbl,
        {
          fontSize: 12,
          strokeColor: "#475569",
          maxLines: 1,
          version: ver,
        }
      )
    );
  }

  for (let r = 0; r < rows; r++) {
    const rowLbl = opts.rowLabels?.[r] ?? `r=${r}`;
    els.push(
      excalidrawText(
        `${id}-row-hdr-${r}`,
        x + 2,
        y + hdrOffsetY + r * cellH + 14,
        rowLbl,
        {
          fontSize: 12,
          strokeColor: "#475569",
          maxLines: 1,
          version: ver,
        }
      )
    );

    for (let c = 0; c < cols; c++) {
      const cx = x + hdrOffsetX + c * cellW;
      const cy = y + hdrOffsetY + r * cellH;
      const key = `${r},${c}`;
      const isAct =
        opts.activeCell?.[0] === r && opts.activeCell?.[1] === c;
      const isSec = secondarySet.has(key);
      const isVis = opts.visitedCells?.has(key) ?? false;
      const valStr = String(matrix[r]?.[c] ?? "");

      els.push(
        excalidrawRect(`${id}-cell-${r}-${c}`, cx, cy, cellW - 4, cellH - 4, {
          strokeColor: isAct
            ? "#e11d48"
            : isSec
            ? "#0284c7"
            : isVis
            ? "#16a34a"
            : "#64748b",
          backgroundColor: isAct
            ? "#ffe4e6"
            : isSec
            ? "#bae6fd"
            : isVis
            ? "#dcfce7"
            : "#ffffff",
          strokeWidth: isAct || isSec ? 3 : 2,
          version: ver,
        }),
        excalidrawText(
          `${id}-val-${r}-${c}`,
          cx + Math.max(8, Math.floor((cellW - 4 - valStr.length * 10) / 2)),
          cy + Math.floor((cellH - 22) / 2),
          valStr,
          {
            fontSize: 15,
            strokeColor: "#0f172a",
            maxLines: 1,
            version: ver,
          }
        )
      );
    }
  }

  const getCellCenter = (r: number, c: number) => ({
    x: Math.round(x + hdrOffsetX + c * cellW + (cellW - 4) / 2),
    y: Math.round(y + hdrOffsetY + r * cellH + (cellH - 4) / 2),
  });

  return { elements: els, getCellCenter };
}

/**
 * Hash Map / Key-Value Lookup Table widget with split `[ Key | Value ]` bucket rows.
 */
export function excalidrawHashTable(
  id: string,
  x: number,
  y: number,
  entries: Array<{ key: string; value: string; highlight?: boolean }>,
  opts: {
    title?: string;
    width?: number;
    version?: number;
  } = {}
): {
  elements: WbElement[];
  getRowCenter: (idx: number) => { x: number; y: number };
} {
  const ver = opts.version ?? 1;
  const tableW = opts.width ?? 230;
  const rowH = 38;
  const hdrH = 34;
  const rows =
    entries.length > 0
      ? entries
      : [{ key: "(empty)", value: "—", highlight: false }];
  const totalH = hdrH + rows.length * rowH + 10;

  const els: WbElement[] = [
    excalidrawRect(`${id}-outer`, x, y, tableW, totalH, {
      strokeColor: "#7c3aed",
      backgroundColor: "#faf5ff",
      strokeWidth: 2.5,
      version: ver,
    }),
    excalidrawText(
      `${id}-hdr`,
      x + 12,
      y + 8,
      opts.title ?? "HashMap { Key → Val }",
      {
        fontSize: 14,
        strokeColor: "#6d28d9",
        maxLines: 1,
        version: ver,
      }
    ),
  ];

  rows.forEach((row, idx) => {
    const ry = y + hdrH + idx * rowH;
    els.push(
      ...excalidrawSplitNode(
        `${id}-row-${idx}`,
        x + 8,
        ry,
        tableW - 16,
        rowH - 4,
        [row.key, row.value],
        {
          strokeColor: row.highlight ? "#e11d48" : "#7c3aed",
          backgroundColor: row.highlight ? "#ffe4e6" : "#ffffff",
          strokeWidth: row.highlight ? 3 : 2,
          version: ver,
        }
      )
    );
  });

  const getRowCenter = (idx: number) => {
    const clamped = Math.max(0, Math.min(rows.length - 1, idx));
    return {
      x: Math.round(x + tableW / 2),
      y: Math.round(y + hdrH + clamped * rowH + (rowH - 4) / 2),
    };
  };

  return { elements: els, getRowCenter };
}

/**
 * Horizontal Interval Timeline bars `[start, end]` plotted on a calibrated coordinate axis.
 * Ideal for Merge Intervals, Meeting Rooms, Non-Overlapping Intervals, and Sweep Line.
 */
export function excalidrawIntervalTimeline(
  id: string,
  x: number,
  y: number,
  intervals: Array<{
    start: number;
    end: number;
    label?: string;
    status?: "active" | "merged" | "pending";
  }>,
  opts: {
    minTick?: number;
    maxTick?: number;
    axisWidth?: number;
    version?: number;
  } = {}
): {
  elements: WbElement[];
  getIntervalCenter: (idx: number) => { x: number; y: number };
} {
  const ver = opts.version ?? 1;
  const minVal =
    opts.minTick ??
    Math.min(0, ...intervals.map((iv) => iv.start));
  const maxVal =
    opts.maxTick ??
    Math.max(10, ...intervals.map((iv) => iv.end));
  const span = Math.max(1, maxVal - minVal);
  const axisW = opts.axisWidth ?? 560;
  const rowH = 38;
  const axisY = y + intervals.length * rowH + 18;
  const els: WbElement[] = [];

  const toX = (v: number) =>
    Math.round(x + ((v - minVal) / span) * axisW);

  intervals.forEach((iv, idx) => {
    const ix1 = toX(iv.start);
    const ix2 = Math.max(ix1 + 32, toX(iv.end));
    const iy = y + idx * rowH;
    const isAct = iv.status === "active";
    const isMrg = iv.status === "merged";

    els.push(
      excalidrawRect(`${id}-bar-${idx}`, ix1, iy, ix2 - ix1, 28, {
        strokeColor: isAct ? "#e11d48" : isMrg ? "#16a34a" : "#0284c7",
        backgroundColor: isAct ? "#ffe4e6" : isMrg ? "#dcfce7" : "#e0f2fe",
        strokeWidth: isAct || isMrg ? 3 : 2,
        version: ver,
      }),
      excalidrawText(
        `${id}-bar-lbl-${idx}`,
        ix1 + 8,
        iy + 6,
        iv.label ?? `[${iv.start}, ${iv.end}]`,
        {
          fontSize: 13,
          strokeColor: "#0f172a",
          maxLines: 1,
          version: ver,
        }
      )
    );
  });

  // Coordinate Axis Line + Tick marks
  els.push(
    excalidrawLine(
      `${id}-axis`,
      x,
      axisY,
      [
        [0, 0],
        [axisW, 0],
      ],
      {
        strokeColor: "#334155",
        strokeWidth: 2.5,
        version: ver,
      }
    )
  );

  const stepTick = Math.max(1, Math.ceil(span / 8));
  for (let tv = minVal; tv <= maxVal; tv += stepTick) {
    const tx = toX(tv);
    els.push(
      excalidrawLine(
        `${id}-tick-${tv}`,
        tx,
        axisY - 4,
        [
          [0, 0],
          [0, 8],
        ],
        {
          strokeColor: "#334155",
          strokeWidth: 2,
          version: ver,
        }
      ),
      excalidrawText(`${id}-tick-lbl-${tv}`, tx - 6, axisY + 8, String(tv), {
        fontSize: 11,
        strokeColor: "#64748b",
        maxLines: 1,
        version: ver,
      })
    );
  }

  const getIntervalCenter = (idx: number) => {
    const clamped = Math.max(0, Math.min(intervals.length - 1, idx));
    const iv = intervals[clamped]!;
    const ix1 = toX(iv.start);
    const ix2 = Math.max(ix1 + 32, toX(iv.end));
    return {
      x: Math.round((ix1 + ix2) / 2),
      y: Math.round(y + clamped * rowH + 14),
    };
  };

  return { elements: els, getIntervalCenter };
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
    const baseY = 185;
    const cellW = 72;
    const cellH = 60;
    const headerW = Math.max(660, sorted.length * cellW + 24);

    // Header Card
    elements.push(
      excalidrawRect("tp-header-box", baseX, 40, headerW, 96, {
        strokeColor: "#0284c7",
        backgroundColor: "#e0f2fe",
        version: ver,
      }),
      excalidrawText(
        "tp-header-title",
        baseX + 18,
        50,
        `Step ${stepIdx + 1}: ${
          isMatch
            ? `Target Sum ${target} Found at [${l}, ${r}]!`
            : isGreater
            ? `Sum (${sum}) > Target (${target}) → Decrement R--`
            : `Sum (${sum}) < Target (${target}) → Increment L++`
        }`,
        { fontSize: 17, strokeColor: "#0369a1", maxCharsPerLine: 54, maxLines: 1, version: ver }
      ),
      excalidrawText(
        "tp-header-formula",
        baseX + 18,
        84,
        `Invariant: arr[L=${l}] (${sorted[l]}) + arr[R=${r}] (${sorted[r]}) = ${sum} ${
          isMatch ? "==" : isGreater ? ">" : "<"
        } ${target}`,
        { fontSize: 14, strokeColor: "#0f172a", maxCharsPerLine: 64, maxLines: 1, version: ver }
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
      aiLaserWaypoints: [
        { x: isGreater ? lx : rx, y: baseY + cellH / 2 },
        { x: isGreater ? rx : lx, y: baseY + cellH / 2 },
      ],
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
    const baseY = 190;
    const cellW = 64;
    const cellH = 56;
    const headerW = Math.max(660, sorted.length * cellW + 20);

    elements.push(
      excalidrawRect("bs-header-box", baseX, 40, headerW, 96, {
        strokeColor: "#059669",
        backgroundColor: "#ecfdf5",
        version: ver,
      }),
      excalidrawText(
        "bs-header-title",
        baseX + 16,
        50,
        `Step ${stepIdx + 1}: Search Range [${low}..${high}] • Mid = ${mid} (val=${val})`,
        { fontSize: 17, strokeColor: "#047857", maxCharsPerLine: 54, maxLines: 1, version: ver }
      ),
      excalidrawText(
        "bs-header-formula",
        baseX + 16,
        84,
        isMatch
          ? `arr[${mid}] == ${target} → Target Found in ${stepIdx + 1} steps!`
          : isLess
          ? `arr[${mid}] (${val}) < ${target} → Prune left [${low}..${mid}], low = ${mid + 1}`
          : `arr[${mid}] (${val}) > ${target} → Prune right [${mid}..${high}], high = ${mid - 1}`,
        { fontSize: 14, strokeColor: "#0f172a", maxCharsPerLine: 64, maxLines: 1, version: ver }
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
      aiLaserWaypoints: [{ x: midX, y: baseY + cellH / 2 }],
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
      excalidrawRect("ll-header", 80, 40, 660, 96, {
        strokeColor: "#7c3aed",
        backgroundColor: "#f3e8ff",
        version: ver,
      }),
      excalidrawText(
        "ll-title",
        98,
        50,
        step === 0
          ? "Step 1: Initialize prev = null, curr = Head(10)"
          : step === nodes.length
          ? `Step ${ver}: Reversal Complete! New Head is prev (Node 40)`
          : `Step ${ver}: Reverse Node(${nodes[step - 1]}).next → prev`,
        { fontSize: 17, strokeColor: "#6d28d9", maxCharsPerLine: 54, maxLines: 1, version: ver }
      ),
      excalidrawText(
        "ll-formula",
        98,
        84,
        `nextTemp = curr.next | curr.next = prev | prev = curr | curr = nextTemp`,
        { fontSize: 13, strokeColor: "#1e293b", maxCharsPerLine: 68, maxLines: 1, version: ver }
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
      aiLaserWaypoints: [
        { x: startX + focusIdx * spacing + 34, y: nodeY + 34 },
      ],
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
    { id: 10, x: 360, y: 160, bounds: "(-∞, +∞)" },
    { id: 5, x: 210, y: 270, bounds: "(-∞, 10)" },
    { id: 15, x: 510, y: 270, bounds: "(10, +∞)" },
    { id: 3, x: 130, y: 380, bounds: "(-∞, 5)" },
    { id: 7, x: 290, y: 380, bounds: "(5, 10)" },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
  ];

  const stepsOrder = [
    { active: 10, visited: [10], desc: "Validate Root(10) in (-∞, +∞). Branch left max=10, right min=10." },
    { active: 5, visited: [10, 5], desc: "Left child Node(5) satisfies (-∞ < 5 < 10). Pass (-∞, 5) & (5, 10)." },
    { active: 7, visited: [10, 5, 3, 7], desc: "Subtree nodes 3 ∈ (-∞, 5) and 7 ∈ (5, 10) both hold! Left verified." },
    { active: 15, visited: [10, 5, 3, 7, 15], desc: "Right child Node(15) ∈ (10, +∞) holds! Global BST verified in O(N)." },
  ];

  const frames: AiWhiteboardStepFrame[] = stepsOrder.map((st, idx) => {
    const ver = idx + 1;
    const elements: WbElement[] = [
      excalidrawRect("bst-header", 80, 35, 660, 96, {
        strokeColor: "#e11d48",
        backgroundColor: "#ffe4e6",
        version: ver,
      }),
      excalidrawText("bst-title", 98, 46, `Step ${ver}: DFS Range Validation at Node(${st.active})`, {
        fontSize: 17,
        strokeColor: "#be123c",
        maxCharsPerLine: 54,
        maxLines: 1,
        version: ver,
      }),
      excalidrawText("bst-desc", 98, 80, st.desc, {
        fontSize: 13,
        strokeColor: "#0f172a",
        maxCharsPerLine: 66,
        maxLines: 1,
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
      aiLaserWaypoints: [{ x: activeNodeObj.x + 30, y: activeNodeObj.y + 30 }],
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
    const headerW = Math.max(660, arr.length * cellW + 24);

    const elements: WbElement[] = [
      excalidrawRect("sw-hdr", baseX, 38, headerW, 96, {
        strokeColor: "#d97706",
        backgroundColor: "#fef3c7",
        version: ver,
      }),
      excalidrawText(
        "sw-hdr-title",
        baseX + 16,
        50,
        `Step ${ver}: Window [${wStart}..${wEnd}] • Sum = ${windowSum} • Best Max = ${maxSum}`,
        { fontSize: 17, strokeColor: "#b45309", maxCharsPerLine: 54, maxLines: 1, version: ver }
      ),
      excalidrawText(
        "sw-hdr-sub",
        baseX + 16,
        84,
        wStart === 0
          ? `Initialize first window of size k=${k}: sum = ${windowSum}`
          : `Slide right: drop arr[${wStart - 1}] (${arr[wStart - 1]}) & add arr[${wEnd}] (${arr[wEnd]})`,
        { fontSize: 14, strokeColor: "#0f172a", maxCharsPerLine: 64, maxLines: 1, version: ver }
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

    const endCellX = baseX + wEnd * cellW + 32;

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
        x: endCellX,
        y: baseY + 30,
      },
      aiLaserWaypoints: [
        { x: endCellX, y: baseY + 30 },
      ],
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
export function buildExcalidrawMonotonicStackLesson(
  customArr?: number[]
): AiWhiteboardLesson {
  const arr =
    customArr && customArr.length >= 5
      ? customArr.slice(0, 5)
      : [2, 1, 5, 3, 6];
  const stepsData = [
    {
      activeIdx: 1,
      stack: [2, 1],
      ans: [-1, -1, -1, -1, -1],
      title: "Push Decreasing Prefix [2, 1]",
      narration: "Elements 2 and 1 maintain a monotonic decreasing stack awaiting a larger value.",
    },
    {
      activeIdx: 2,
      stack: [5],
      ans: [5, 5, -1, -1, -1],
      title: "Incoming 5 Pops 1 and 2!",
      narration: "5 > stack top 1 and 2! Both are popped and Next Greater is recorded as 5.",
    },
    {
      activeIdx: 4,
      stack: [6],
      ans: [5, 5, 6, 6, -1],
      title: "Incoming 6 Resolves 3 and 5!",
      narration: "Incoming 6 pops 3 and 5, completing Next Greater array in O(N) amortized time!",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = stepsData.map((st, sIdx) => {
    const ver = sIdx + 1;
    const baseX = 75;
    const els: WbElement[] = [
      excalidrawRect("ms-hdr", baseX, 35, 660, 96, {
        strokeColor: "#db2777",
        backgroundColor: "#fce7f3",
        version: ver,
      }),
      excalidrawText("ms-title", baseX + 16, 46, `Step ${ver}: ${st.title}`, {
        fontSize: 17,
        strokeColor: "#be185d",
        maxCharsPerLine: 54,
        maxLines: 1,
        version: ver,
      }),
      excalidrawText("ms-sub", baseX + 16, 80, st.narration, {
        fontSize: 13,
        strokeColor: "#0f172a",
        maxCharsPerLine: 66,
        maxLines: 1,
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
      excalidrawText("ms-stack-lbl", 522, 165, "Monotonic Stack", {
        fontSize: 14,
        strokeColor: "#0369a1",
        maxLines: 1,
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

    const activeInputX = baseX + st.activeIdx * 74 + 33;
    const stackTopY = 265 - Math.max(0, st.stack.length - 1) * 46 + 20;

    return {
      stepIndex: sIdx,
      title: st.title,
      narration: st.narration,
      mathInvariant: `Stack = [${st.stack.join(", ")}] • Ans = [${st.ans.join(", ")}]`,
      elements: els,
      aiLaserTarget: { x: 590, y: stackTopY },
      aiLaserWaypoints: [
        { x: activeInputX, y: 192 },
        { x: 590, y: stackTopY },
      ],
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
export function buildExcalidrawDpTableLesson(_n = 6): AiWhiteboardLesson {
  const dp = [1, 1, 2, 3, 5, 8, 13];
  const frames: AiWhiteboardStepFrame[] = [];

  for (let step = 2; step < dp.length; step++) {
    const ver = step - 1;
    const baseX = 75;
    const baseY = 200;
    const cellW = 74;

    const els: WbElement[] = [
      excalidrawRect("dp-hdr", baseX, 38, 660, 96, {
        strokeColor: "#7c3aed",
        backgroundColor: "#f3e8ff",
        version: ver,
      }),
      excalidrawText(
        "dp-title",
        baseX + 16,
        50,
        `Step ${ver}: Compute dp[${step}] = dp[${step - 1}] (${dp[step - 1]}) + dp[${step - 2}] (${dp[step - 2]}) = ${dp[step]}`,
        { fontSize: 17, strokeColor: "#6d28d9", maxCharsPerLine: 54, maxLines: 1, version: ver }
      ),
      excalidrawText(
        "dp-sub",
        baseX + 16,
        84,
        `Optimal Substructure: Cached subproblems reused in O(1) lookup time`,
        { fontSize: 14, strokeColor: "#0f172a", maxCharsPerLine: 64, maxLines: 1, version: ver }
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
      aiLaserWaypoints: [
        { x: targetX, y: baseY + 30 },
      ],
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
 * Generates an O(N^2) Brute Force Nested-Loop Dry-Run interactive Excalidraw lesson.
 * Shows outer loop i, inner loop j, pair comparisons, and a live Dry-Run Trace Table!
 */
export function buildExcalidrawBruteForceDryRunLesson(
  arr: number[] = [1, 3, 5, 8, 12],
  target = 17
): AiWhiteboardLesson {
  const nums = arr.slice(0, 6);
  const frames: AiWhiteboardStepFrame[] = [];
  const pairsChecked: Array<{
    i: number;
    j: number;
    vi: number;
    vj: number;
    sum: number;
    match: boolean;
  }> = [];

  let stepIdx = 0;
  let found = false;

  for (let i = 0; i < nums.length - 1 && !found && stepIdx < 7; i++) {
    for (let j = i + 1; j < nums.length && !found && stepIdx < 7; j++) {
      const vi = nums[i]!;
      const vj = nums[j]!;
      const sum = vi + vj;
      const match = sum === target;
      pairsChecked.push({ i, j, vi, vj, sum, match });
      const ver = stepIdx + 1;

      const baseX = 70;
      const baseY = 185;
      const cellW = 78;
      const cellH = 60;
      const headerW = Math.max(620, nums.length * cellW + 40);

      const els: WbElement[] = [
        excalidrawRect("bf-hdr", baseX, 38, headerW, 96, {
          strokeColor: match ? "#16a34a" : "#d97706",
          backgroundColor: match ? "#dcfce7" : "#fef3c7",
          strokeWidth: 2.5,
          version: ver,
        }),
        excalidrawText(
          "bf-title",
          baseX + 18,
          50,
          match
            ? `Dry-Run Step ${ver}: MATCH! arr[i=${i}] (${vi}) + arr[j=${j}] (${vj}) == ${target}`
            : `Dry-Run Step ${ver}: Test Pair (i=${i}, j=${j}) → ${vi} + ${vj} = ${sum} != ${target}`,
          { fontSize: 16, strokeColor: match ? "#15803d" : "#b45309", maxCharsPerLine: 58, version: ver }
        ),
        excalidrawText(
          "bf-sub",
          baseX + 18,
          92,
          `Brute Force O(N²) Nested Loops: Checked ${ver} pair(s) so far  |  Target = ${target}`,
          { fontSize: 14, strokeColor: "#1e293b", maxCharsPerLine: 64, version: ver }
        ),
      ];

      nums.forEach((v, idx) => {
        const cx = baseX + idx * cellW;
        const isI = idx === i;
        const isJ = idx === j;
        els.push(
          excalidrawRect(`bf-cell-${idx}`, cx, baseY, cellW - 8, cellH, {
            strokeColor: match && (isI || isJ) ? "#16a34a" : isI ? "#d97706" : isJ ? "#7c3aed" : "#334155",
            backgroundColor:
              match && (isI || isJ)
                ? "#bbf7d0"
                : isI
                ? "#fde68a"
                : isJ
                ? "#ede9fe"
                : "#ffffff",
            strokeWidth: isI || isJ ? 3 : 2,
            version: ver,
          }),
          excalidrawText(`bf-val-${idx}`, cx + 22, baseY + 18, String(v), {
            fontSize: 18,
            strokeColor: "#0f172a",
            version: ver,
          }),
          excalidrawText(`bf-idx-${idx}`, cx + 20, baseY + cellH + 8, `[${idx}]`, {
            fontSize: 12,
            strokeColor: "#64748b",
            version: ver,
          })
        );
      });

      const ix = baseX + i * cellW + (cellW - 8) / 2;
      const jx = baseX + j * cellW + (cellW - 8) / 2;

      els.push(
        excalidrawArrow("bf-ptr-i", ix, baseY - 38, ix, baseY - 4, {
          strokeColor: "#d97706",
          strokeWidth: 3,
          version: ver,
        }),
        excalidrawText("bf-lbl-i", ix - 16, baseY - 62, `i=${i}`, {
          fontSize: 14,
          strokeColor: "#b45309",
          version: ver,
        }),
        excalidrawArrow("bf-ptr-j", jx, baseY + cellH + 56, jx, baseY + cellH + 24, {
          strokeColor: "#7c3aed",
          strokeWidth: 3,
          version: ver,
        }),
        excalidrawText("bf-lbl-j", jx - 16, baseY + cellH + 62, `j=${j}`, {
          fontSize: 14,
          strokeColor: "#6d28d9",
          version: ver,
        })
      );

      // Dry-Run Trace Log Card below the array
      const traceLines = pairsChecked
        .slice(-4)
        .map(
          (p, idx) =>
            `#${pairsChecked.length - Math.min(4, pairsChecked.length) + idx + 1}: (i=${p.i}, j=${p.j}) → ${p.vi} + ${p.vj} = ${p.sum} ${
              p.match ? "== " + target + " [FOUND]" : "!= " + target
            }`
        )
        .join("\n");

      els.push(
        excalidrawRect("bf-trace-box", baseX, 340, headerW, 118, {
          strokeColor: "#475569",
          backgroundColor: "#f8fafc",
          version: ver,
        }),
        excalidrawText("bf-trace-hdr", baseX + 16, 350, "DRY-RUN EXECUTION LOG (Nested Loop i, j):", {
          fontSize: 14,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawText("bf-trace-rows", baseX + 16, 374, traceLines, {
          fontSize: 13,
          strokeColor: match ? "#15803d" : "#334155",
          maxCharsPerLine: 68,
          maxLines: 4,
          version: ver,
        })
      );

      frames.push({
        stepIndex: stepIdx,
        title: match
          ? `Match Found at (i=${i}, j=${j}): ${vi} + ${vj} = ${target}`
          : `Brute Force Check #${ver}: arr[${i}]+arr[${j}] = ${sum}`,
        narration: match
          ? `Pair (i=${i}, j=${j}) sums to ${vi} + ${vj} = ${target}! Brute force tested ${ver} pairs in O(N²) time vs O(N) with Two Pointers.`
          : `Outer loop i=${i} (val ${vi}), inner loop j=${j} (val ${vj}). Sum is ${sum} != ${target}, so j advances to ${j + 1}.`,
        mathInvariant: `Outer i=${i}, Inner j=${j} • Pair Sum = ${sum} • Comparisons = ${ver}`,
        elements: els,
        aiLaserTarget: { x: jx, y: baseY + cellH / 2 },
        aiLaserWaypoints: [
          { x: ix, y: baseY + cellH / 2 },
          { x: jx, y: baseY + cellH / 2 },
        ],
      });

      if (match) found = true;
      stepIdx++;
    }
  }

  return {
    id: "brute_force_dry_run",
    topic: "Brute Force O(N²) Nested-Loop Dry Run",
    badge: "O(N²) Time • O(1) Space",
    frames,
  };
}

/**
 * Generates an interactive Graph Shortest Path (Dijkstra / BFS) Excalidraw lesson.
 * Uses circular vertices, curved & weighted edges (`excalidrawLabeledConnector`),
 * a `Dist[]` lookup table (`excalidrawHashTable`), and a Queue pipe (`excalidrawContainerBucket`).
 */
export function buildExcalidrawGraphShortestPathLesson(): AiWhiteboardLesson {
  const vertices = [
    { id: "A", x: 110, y: 220 },
    { id: "B", x: 260, y: 150 },
    { id: "C", x: 260, y: 295 },
    { id: "D", x: 420, y: 185 },
    { id: "E", x: 420, y: 305 },
  ];
  const edges = [
    { u: 0, v: 1, w: 2, style: "curved" as const, curve: -26 },
    { u: 0, v: 2, w: 5, style: "curved" as const, curve: 26 },
    { u: 1, v: 2, w: 1, style: "straight" as const, curve: 0 },
    { u: 1, v: 3, w: 4, style: "curved" as const, curve: -22 },
    { u: 2, v: 4, w: 2, style: "curved" as const, curve: 22 },
    { u: 3, v: 4, w: 1, style: "straight" as const, curve: 0 },
  ];

  const steps = [
    {
      active: "A",
      relaxedEdge: -1,
      visited: ["A"],
      dist: { A: "0", B: "2", C: "5", D: "∞", E: "∞" },
      pq: ["(2,B)", "(5,C)"],
      title: "Init Source A (dist=0) & Relax A→B(2), A→C(5)",
      narration:
        "We pop source vertex A with distance 0 and relax its outgoing edges: dist[B] becomes 2 and dist[C] becomes 5.",
    },
    {
      active: "B",
      relaxedEdge: 2,
      visited: ["A", "B"],
      dist: { A: "0", B: "2", C: "3", D: "6", E: "∞" },
      pq: ["(3,C)", "(6,D)"],
      title: "Pop Min B (dist=2) → Shortcut B→C Improves C to 3!",
      narration:
        "Popping vertex B (dist=2), edge B→C of weight 1 lowers dist[C] from 5 to 2+1 = 3, and sets dist[D] = 2+4 = 6.",
    },
    {
      active: "C",
      relaxedEdge: 4,
      visited: ["A", "B", "C"],
      dist: { A: "0", B: "2", C: "3", D: "6", E: "5" },
      pq: ["(5,E)", "(6,D)"],
      title: "Pop Min C (dist=3) → Relax C→E (dist[E] = 5)",
      narration:
        "Next we pop C (dist=3) and relax edge C→E of weight 2, discovering path A→B→C→E with total cost 5.",
    },
    {
      active: "E",
      relaxedEdge: 5,
      visited: ["A", "B", "C", "E", "D"],
      dist: { A: "0", B: "2", C: "3", D: "6", E: "5" },
      pq: [],
      title: "Shortest Paths Settled! Optimal A→E Cost = 5",
      narration:
        "Popping E (dist=5) and D (dist=6) completes Dijkstra's algorithm in O((V + E) log V) time.",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = steps.map((st, idx) => {
    const ver = idx + 1;
    const els: WbElement[] = [
      excalidrawRect("gr-hdr", 70, 35, 700, 90, {
        strokeColor: "#0284c7",
        backgroundColor: "#f0f9ff",
        version: ver,
      }),
      excalidrawText("gr-title", 88, 46, `Step ${ver}: ${st.title}`, {
        fontSize: 16,
        strokeColor: "#0369a1",
        maxCharsPerLine: 58,
        maxLines: 1,
        version: ver,
      }),
      excalidrawText("gr-sub", 88, 78, st.narration, {
        fontSize: 13,
        strokeColor: "#0f172a",
        maxCharsPerLine: 68,
        maxLines: 2,
        version: ver,
      }),
    ];

    edges.forEach((e, eIdx) => {
      const n1 = vertices[e.u]!;
      const n2 = vertices[e.v]!;
      const isRel = eIdx === st.relaxedEdge;
      els.push(
        ...excalidrawLabeledConnector(
          `gr-edge-${eIdx}`,
          n1.x + 28,
          n1.y + 28,
          n2.x + 28,
          n2.y + 28,
          {
            style: e.style,
            curveOffset: e.curve,
            label: `w=${e.w}`,
            strokeColor: isRel ? "#e11d48" : "#64748b",
            strokeWidth: isRel ? 3 : 2,
            version: ver,
          }
        )
      );
    });

    vertices.forEach((v) => {
      const isAct = v.id === st.active;
      const isVis = st.visited.includes(v.id);
      const dVal = st.dist[v.id as keyof typeof st.dist];
      els.push(
        excalidrawEllipse(`gr-v-${v.id}`, v.x, v.y, 56, 56, {
          strokeColor: isAct ? "#e11d48" : isVis ? "#16a34a" : "#334155",
          backgroundColor: isAct ? "#ffe4e6" : isVis ? "#dcfce7" : "#ffffff",
          strokeWidth: isAct ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`gr-v-lbl-${v.id}`, v.x + 20, v.y + 16, v.id, {
          fontSize: 18,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawText(`gr-v-d-${v.id}`, v.x + 6, v.y + 60, `d=${dVal}`, {
          fontSize: 12,
          strokeColor: isAct ? "#be123c" : "#047857",
          version: ver,
        })
      );
    });

    const distTable = excalidrawHashTable(
      "gr-dist-tbl",
      535,
      148,
      Object.entries(st.dist).map(([k, val]) => ({
        key: `Node ${k}`,
        value: `d = ${val}`,
        highlight: k === st.active,
      })),
      { title: "Dist[] Table", width: 225, version: ver }
    );
    els.push(...distTable.elements);

    const pqPipe = excalidrawContainerBucket("gr-pq", 85, 385, {
      kind: "queue",
      title: "Min-Heap PriorityQueue (cost, vertex):",
      items:
        st.pq.length > 0
          ? st.pq.map((item, i) => ({ label: item, highlight: i === 0 }))
          : [{ label: "Done", highlight: false }],
      capacity: 4,
      version: ver,
    });
    els.push(...pqPipe.elements);

    const actV = vertices.find((v) => v.id === st.active) ?? vertices[0]!;
    return {
      stepIndex: idx,
      title: st.title,
      narration: st.narration,
      mathInvariant: `dist[v] = min(dist[v], dist[u] + w(u,v)) • Active = ${st.active}`,
      elements: els,
      aiLaserTarget: { x: actV.x + 28, y: actV.y + 28 },
      aiLaserWaypoints: [{ x: actV.x + 28, y: actV.y + 28 }],
    };
  });

  return {
    id: "graph_shortest_path",
    topic: "Graph Shortest Path (Dijkstra + Min-Heap)",
    badge: "O((V+E) log V) Time",
    frames,
  };
}

/**
 * Generates an interactive 2D Matrix / Grid Island DFS & 2D DP Excalidraw lesson.
 * Uses `excalidrawGrid2D`, `excalidrawElbowArrow`, and `excalidrawContainerBucket`.
 */
export function buildExcalidrawMatrix2DLesson(): AiWhiteboardLesson {
  const baseMatrix = [
    ["1", "1", "0", "0"],
    ["1", "0", "0", "1"],
    ["0", "0", "1", "1"],
  ];

  const steps = [
    {
      active: [0, 0] as [number, number],
      visited: new Set(["0,0"]),
      stack: ["(0,0)"],
      title: "Discover Island #1 Seed at Grid[0][0] = '1'",
      narration:
        "Scanning the 2D matrix, we hit land '1' at (r=0, c=0). Increment islandCount = 1 and launch DFS to flood-fill connected land.",
    },
    {
      active: [0, 1] as [number, number],
      visited: new Set(["0,0", "0,1", "1,0"]),
      stack: ["(0,1)", "(1,0)"],
      title: "Flood-Fill Connected Neighbors (0,1) & (1,0)",
      narration:
        "From (0,0), orthogonal 4-directional DFS visits right neighbor (0,1) and bottom neighbor (1,0), marking Island #1 visited.",
    },
    {
      active: [2, 2] as [number, number],
      visited: new Set(["0,0", "0,1", "1,0", "1,3", "2,2", "2,3"]),
      stack: ["(2,3)", "(2,2)"],
      title: "Discover & Flood-Fill Island #2 at Bottom-Right!",
      narration:
        "Continuing the scan finds unvisited land at (1,3), (2,3), and (2,2), completing Island #2 in O(R × C) total time!",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = steps.map((st, idx) => {
    const ver = idx + 1;
    const grid = excalidrawGrid2D("mat-grid", 90, 155, baseMatrix, {
      activeCell: st.active,
      visitedCells: st.visited,
      cellW: 72,
      cellH: 56,
      version: ver,
    });

    const stackBucket = excalidrawContainerBucket("mat-dfs-stk", 475, 175, {
      kind: "stack",
      title: "DFS Call Stack (r,c)",
      items: st.stack.map((s, i) => ({
        label: s,
        highlight: i === st.stack.length - 1,
      })),
      capacity: 3,
      version: ver,
    });

    const targetPt = grid.getCellCenter(st.active[0], st.active[1]);

    const els: WbElement[] = [
      excalidrawRect("mat-hdr", 75, 35, 650, 90, {
        strokeColor: "#059669",
        backgroundColor: "#ecfdf5",
        version: ver,
      }),
      excalidrawText("mat-title", 92, 46, `Step ${ver}: ${st.title}`, {
        fontSize: 16,
        strokeColor: "#047857",
        maxCharsPerLine: 56,
        maxLines: 1,
        version: ver,
      }),
      excalidrawText("mat-sub", 92, 78, st.narration, {
        fontSize: 13,
        strokeColor: "#0f172a",
        maxCharsPerLine: 66,
        maxLines: 2,
        version: ver,
      }),
      ...grid.elements,
      ...stackBucket.elements,
      excalidrawElbowArrow(
        "mat-to-stk",
        targetPt.x + 34,
        targetPt.y,
        470,
        stackBucket.focusPoint.y,
        {
          strokeColor: "#e11d48",
          strokeStyle: "dashed",
          version: ver,
        }
      ),
    ];

    return {
      stepIndex: idx,
      title: st.title,
      narration: st.narration,
      mathInvariant: `Active Cell = (${st.active[0]}, ${st.active[1]}) • Visited = ${st.visited.size}`,
      elements: els,
      aiLaserTarget: targetPt,
      aiLaserWaypoints: [targetPt],
    };
  });

  return {
    id: "matrix_2d",
    topic: "2D Matrix Grid (Flood-Fill / Island DFS)",
    badge: "O(R × C) Time • 2D Grid",
    frames,
  };
}

/**
 * Generates an interactive Hash Map O(1) Complement Lookup (Two Sum / Prefix Sum) lesson.
 * Uses `excalidrawHashTable` and `excalidrawCurvedArrow`.
 */
export function buildExcalidrawHashMapLesson(
  arr: number[] = [3, 2, 4, 7],
  target = 9
): AiWhiteboardLesson {
  const nums = arr.slice(0, 6);
  const frames: AiWhiteboardStepFrame[] = [];
  const seen = new Map<number, number>();

  for (let i = 0; i < nums.length; i++) {
    const val = nums[i]!;
    const comp = target - val;
    const hitIdx = seen.get(comp);
    const isHit = hitIdx !== undefined;
    const ver = i + 1;
    const baseX = 80;
    const baseY = 175;
    const cellW = 78;

    const els: WbElement[] = [
      excalidrawRect("hm-hdr", baseX, 35, 660, 90, {
        strokeColor: isHit ? "#16a34a" : "#7c3aed",
        backgroundColor: isHit ? "#dcfce7" : "#f3e8ff",
        version: ver,
      }),
      excalidrawText(
        "hm-title",
        baseX + 16,
        46,
        isHit
          ? `Step ${ver}: O(1) Hash Map HIT! Target ${target} - ${val} = ${comp} found at idx ${hitIdx}!`
          : `Step ${ver}: Check need = ${target} - ${val} = ${comp} (Miss → Insert {${val}: idx ${i}})`,
        {
          fontSize: 16,
          strokeColor: isHit ? "#15803d" : "#6d28d9",
          maxCharsPerLine: 58,
          maxLines: 1,
          version: ver,
        }
      ),
      excalidrawText(
        "hm-sub",
        baseX + 16,
        78,
        isHit
          ? `Found pair (idx ${hitIdx}, idx ${i}) = (${comp}, ${val}) in a single O(N) pass!`
          : `Complement ${comp} is not in HashMap yet. Store key ${val} → index ${i} in O(1) time.`,
        { fontSize: 13, strokeColor: "#0f172a", maxCharsPerLine: 66, maxLines: 2, version: ver }
      ),
    ];

    nums.forEach((v, idx) => {
      const cx = baseX + idx * cellW;
      const isCur = idx === i;
      const isMatchPartner = isHit && idx === hitIdx;
      els.push(
        excalidrawRect(`hm-c-${idx}`, cx, baseY, cellW - 8, 56, {
          strokeColor: isCur || isMatchPartner ? "#16a34a" : "#334155",
          backgroundColor: isCur
            ? "#fef3c7"
            : isMatchPartner
            ? "#bbf7d0"
            : "#ffffff",
          strokeWidth: isCur || isMatchPartner ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`hm-v-${idx}`, cx + 22, baseY + 16, String(v), {
          fontSize: 18,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawText(`hm-i-${idx}`, cx + 18, baseY + 62, `[${idx}]`, {
          fontSize: 12,
          strokeColor: "#64748b",
          version: ver,
        })
      );
    });

    if (!isHit) {
      seen.set(val, i);
    }

    const entries = [...seen.entries()].map(([k, idxVal]) => ({
      key: `key: ${k}`,
      value: `idx: ${idxVal}`,
      highlight: isHit ? k === comp : k === val,
    }));

    const hashWidget = excalidrawHashTable("hm-table", 450, 155, entries, {
      title: "HashMap { Value → Index }",
      width: 265,
      version: ver,
    });
    els.push(...hashWidget.elements);

    const curCellX = baseX + i * cellW + 35;
    const rowIdx = Math.max(
      0,
      entries.findIndex((e) => e.highlight)
    );
    const bucketCenter = hashWidget.getRowCenter(rowIdx);

    els.push(
      excalidrawCurvedArrow(
        "hm-arc",
        curCellX,
        baseY + 56,
        bucketCenter.x - 120,
        bucketCenter.y,
        {
          curveOffset: 42,
          strokeColor: isHit ? "#16a34a" : "#7c3aed",
          strokeWidth: 2.5,
          version: ver,
        }
      )
    );

    frames.push({
      stepIndex: i,
      title: isHit
        ? `O(1) Lookup Hit: ${comp} + ${val} == ${target}`
        : `Insert { ${val} → idx ${i} } into HashMap`,
      narration: isHit
        ? `At index ${i} (value ${val}), we need ${comp}. HashMap lookup finds ${comp} at index ${hitIdx} in O(1) time!`
        : `At index ${i} (value ${val}), complement ${comp} is not in the map, so we insert ${val} → ${i}.`,
      mathInvariant: `need = ${target} - ${val} = ${comp} • Map Size = ${seen.size}`,
      elements: els,
      aiLaserTarget: bucketCenter,
      aiLaserWaypoints: [
        { x: curCellX, y: baseY + 28 },
        bucketCenter,
      ],
    });

    if (isHit) break;
  }

  return {
    id: "hashmap_lookup",
    topic: "Hash Map Lookup (O(1) Complement Table)",
    badge: "O(N) Time • O(N) Space",
    frames,
  };
}

/**
 * Generates an interactive Min-Heap / Priority Queue lesson showing both the
 * Binary Heap Tree and its backing 1D Array with curved parent-child swap arcs.
 */
export function buildExcalidrawHeapPriorityQueueLesson(): AiWhiteboardLesson {
  const treeCoords = [
    { x: 220, y: 155 }, // 0: root
    { x: 130, y: 255 }, // 1: left
    { x: 310, y: 255 }, // 2: right
    { x: 85, y: 355 },  // 3: L-L
    { x: 185, y: 355 }, // 4: L-R
  ];
  const treeEdges: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
  ];

  const steps = [
    {
      heap: [3, 5, 8, 12, 1],
      activeIdx: 4,
      swapPair: [1, 4] as [number, number] | null,
      title: "Insert 1 at Leaf idx=4 → Violates Min-Heap with Parent(idx=1, val=5)",
      narration:
        "We append 1 at array index 4. Since child 1 < parent 5 at index (4-1)//2 = 1, we sift-up by swapping indices 4 and 1.",
    },
    {
      heap: [3, 1, 8, 12, 5],
      activeIdx: 1,
      swapPair: [0, 1] as [number, number] | null,
      title: "Sift-Up Step 2: 1 < Root(idx=0, val=3) → Swap with Root!",
      narration:
        "Now at index 1, value 1 is still smaller than root 3 at index 0, so we swap indices 1 and 0.",
    },
    {
      heap: [1, 3, 8, 12, 5],
      activeIdx: 0,
      swapPair: null,
      title: "Min-Heap Restored in O(log N)! New Min Root = 1",
      narration:
        "1 reaches root index 0! Every parent is now <= its children, and heap[0] gives O(1) access to the minimum.",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = steps.map((st, sIdx) => {
    const ver = sIdx + 1;
    const els: WbElement[] = [
      excalidrawRect("hp-hdr", 70, 35, 680, 90, {
        strokeColor: "#d97706",
        backgroundColor: "#fef3c7",
        version: ver,
      }),
      excalidrawText("hp-title", 88, 46, `Step ${ver}: ${st.title}`, {
        fontSize: 16,
        strokeColor: "#b45309",
        maxCharsPerLine: 58,
        maxLines: 1,
        version: ver,
      }),
      excalidrawText("hp-sub", 88, 78, st.narration, {
        fontSize: 13,
        strokeColor: "#0f172a",
        maxCharsPerLine: 68,
        maxLines: 2,
        version: ver,
      }),
    ];

    treeEdges.forEach(([u, v], eIdx) => {
      const p1 = treeCoords[u]!;
      const p2 = treeCoords[v]!;
      els.push(
        excalidrawArrow(`hp-e-${eIdx}`, p1.x + 26, p1.y + 52, p2.x + 26, p2.y, {
          strokeColor: "#64748b",
          strokeWidth: 2,
          version: ver,
        })
      );
    });

    st.heap.forEach((val, idx) => {
      const pt = treeCoords[idx]!;
      const isAct =
        idx === st.activeIdx ||
        st.swapPair?.[0] === idx ||
        st.swapPair?.[1] === idx;
      els.push(
        excalidrawEllipse(`hp-node-${idx}`, pt.x, pt.y, 54, 54, {
          strokeColor: isAct ? "#e11d48" : "#0284c7",
          backgroundColor: isAct ? "#ffe4e6" : "#e0f2fe",
          strokeWidth: isAct ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`hp-nval-${idx}`, pt.x + 18, pt.y + 16, String(val), {
          fontSize: 18,
          strokeColor: "#0f172a",
          version: ver,
        })
      );

      // Backing 1D Array on the right
      const ax = 415 + idx * 62;
      const ay = 235;
      els.push(
        excalidrawRect(`hp-arr-${idx}`, ax, ay, 56, 52, {
          strokeColor: isAct ? "#e11d48" : "#334155",
          backgroundColor: isAct ? "#ffe4e6" : "#ffffff",
          strokeWidth: isAct ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`hp-aval-${idx}`, ax + 18, ay + 15, String(val), {
          fontSize: 17,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawText(`hp-aidx-${idx}`, ax + 16, ay + 58, `[${idx}]`, {
          fontSize: 12,
          strokeColor: "#64748b",
          version: ver,
        })
      );
    });

    els.push(
      excalidrawText("hp-arr-lbl", 415, 198, "Backing Heap Array [0..4]:", {
        fontSize: 14,
        strokeColor: "#0369a1",
        maxLines: 1,
        version: ver,
      })
    );

    if (st.swapPair) {
      const [u, v] = st.swapPair;
      const n1 = treeCoords[u]!;
      const n2 = treeCoords[v]!;
      els.push(
        ...excalidrawLabeledConnector(
          "hp-swap-arc",
          n2.x + 27,
          n2.y + 27,
          n1.x + 27,
          n1.y + 27,
          {
            style: "curved",
            curveOffset: -42,
            bidirectional: true,
            label: "swap",
            strokeColor: "#e11d48",
            strokeWidth: 3,
            version: ver,
          }
        )
      );
    }

    const focusNode = treeCoords[st.activeIdx] ?? treeCoords[0]!;
    return {
      stepIndex: sIdx,
      title: st.title,
      narration: st.narration,
      mathInvariant: `parent(i) = ⌊(i-1)/2⌋ • Heap = [${st.heap.join(", ")}]`,
      elements: els,
      aiLaserTarget: { x: focusNode.x + 27, y: focusNode.y + 27 },
      aiLaserWaypoints: [{ x: focusNode.x + 27, y: focusNode.y + 27 }],
    };
  });

  return {
    id: "heap_pq",
    topic: "Binary Min-Heap & Priority Queue (Tree + Array)",
    badge: "O(log N) Sift-Up • O(1) Min",
    frames,
  };
}

/**
 * Generates an interactive Trie (Prefix Tree) lesson using `excalidrawSplitNode` (`[char | ★]`).
 */
export function buildExcalidrawTrieLesson(): AiWhiteboardLesson {
  const trieNodes = [
    { id: "root", x: 320, y: 150, parts: ["ROOT", "·"] },
    { id: "c", x: 180, y: 245, parts: ["'c'", "·"] },
    { id: "d", x: 460, y: 245, parts: ["'d'", "·"] },
    { id: "ca", x: 180, y: 340, parts: ["'a'", "·"] },
    { id: "cat", x: 100, y: 430, parts: ["'t'", "★ end"] },
    { id: "car", x: 265, y: 430, parts: ["'r'", "★ end"] },
    { id: "do", x: 460, y: 340, parts: ["'o'", "★ end"] },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 3],
    [3, 4],
    [3, 5],
    [2, 6],
  ];

  const steps = [
    {
      active: "ca",
      highlighted: ["root", "c", "ca"],
      title: "Shared Prefix Path 'c' → 'a' in O(L) Time",
      narration:
        "Starting at ROOT, words 'cat' and 'car' share the exact same prefix nodes 'c' → 'a', saving memory and enabling O(L) prefix search.",
    },
    {
      active: "cat",
      highlighted: ["root", "c", "ca", "cat"],
      title: "Branch to Terminal Node ['t' | ★ end] for Word 'cat'",
      narration:
        "Following child 't' reaches a node marked ★ isEndOfWord = true, confirming 'cat' exists in the Trie.",
    },
    {
      active: "car",
      highlighted: ["root", "c", "ca", "car"],
      title: "Autocomplete All Words Under Prefix 'ca*' → ['cat', 'car']",
      narration:
        "From prefix node 'a', branching to all ★ terminal children immediately yields autocomplete suggestions 'cat' and 'car'!",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = steps.map((st, idx) => {
    const ver = idx + 1;
    const els: WbElement[] = [
      excalidrawRect("tr-hdr", 70, 35, 650, 90, {
        strokeColor: "#7c3aed",
        backgroundColor: "#f3e8ff",
        version: ver,
      }),
      excalidrawText("tr-title", 88, 46, `Step ${ver}: ${st.title}`, {
        fontSize: 16,
        strokeColor: "#6d28d9",
        maxCharsPerLine: 56,
        maxLines: 1,
        version: ver,
      }),
      excalidrawText("tr-sub", 88, 78, st.narration, {
        fontSize: 13,
        strokeColor: "#0f172a",
        maxCharsPerLine: 66,
        maxLines: 2,
        version: ver,
      }),
    ];

    edges.forEach(([u, v], eIdx) => {
      const n1 = trieNodes[u]!;
      const n2 = trieNodes[v]!;
      els.push(
        excalidrawArrow(`tr-e-${eIdx}`, n1.x + 52, n1.y + 42, n2.x + 52, n2.y, {
          strokeColor: "#64748b",
          strokeWidth: 2,
          version: ver,
        })
      );
    });

    trieNodes.forEach((n) => {
      const isAct = n.id === st.active;
      const isHi = st.highlighted.includes(n.id);
      els.push(
        ...excalidrawSplitNode(`tr-n-${n.id}`, n.x, n.y, 108, 40, n.parts, {
          strokeColor: isAct ? "#e11d48" : isHi ? "#16a34a" : "#334155",
          backgroundColor: isAct ? "#ffe4e6" : isHi ? "#dcfce7" : "#ffffff",
          strokeWidth: isAct || isHi ? 3 : 2,
          version: ver,
        })
      );
    });

    const actNode = trieNodes.find((n) => n.id === st.active) ?? trieNodes[0]!;
    return {
      stepIndex: idx,
      title: st.title,
      narration: st.narration,
      mathInvariant: `Time = O(L) where L = word length • Active Node = ${st.active}`,
      elements: els,
      aiLaserTarget: { x: actNode.x + 54, y: actNode.y + 20 },
      aiLaserWaypoints: [{ x: actNode.x + 54, y: actNode.y + 20 }],
    };
  });

  return {
    id: "trie_prefix_tree",
    topic: "Trie / Prefix Tree ([char | ★ isEnd] Nodes)",
    badge: "O(L) Lookup & Autocomplete",
    frames,
  };
}

/**
 * Generates an interactive Merge Intervals / Sweep-Line Timeline lesson using `excalidrawIntervalTimeline`.
 */
export function buildExcalidrawIntervalsLesson(): AiWhiteboardLesson {
  const steps = [
    {
      intervals: [
        { start: 1, end: 3, label: "[1, 3]", status: "active" as const },
        { start: 2, end: 6, label: "[2, 6] (overlaps ≤ 3)", status: "active" as const },
        { start: 8, end: 10, label: "[8, 10]", status: "pending" as const },
        { start: 9, end: 12, label: "[9, 12]", status: "pending" as const },
      ],
      focusIdx: 1,
      title: "Sort by Start Time → Overlap Detected: [2, 6].start (2) ≤ [1, 3].end (3)",
      narration:
        "After sorting intervals by start time, [2, 6] starts at 2 which is <= 3. We merge them into [1, max(3, 6)] = [1, 6].",
    },
    {
      intervals: [
        { start: 1, end: 6, label: "Merged [1, 6]", status: "merged" as const },
        { start: 8, end: 10, label: "[8, 10] (8 > 6: disjoint)", status: "active" as const },
        { start: 9, end: 12, label: "[9, 12] (overlaps ≤ 10)", status: "active" as const },
      ],
      focusIdx: 2,
      title: "Disjoint Gap at 8 > 6 → Merge [8, 10] & [9, 12] into [8, 12]",
      narration:
        "Interval [8, 10] starts after 6 so [1, 6] is finalized. Then [9, 12] overlaps with [8, 10] (9 <= 10), merging into [8, 12].",
    },
    {
      intervals: [
        { start: 1, end: 6, label: "Result #1: [1, 6]", status: "merged" as const },
        { start: 8, end: 12, label: "Result #2: [8, 12]", status: "merged" as const },
      ],
      focusIdx: 1,
      title: "Merged Non-Overlapping Intervals: [[1, 6], [8, 12]]",
      narration:
        "Sweep-line merge finishes in O(N log N) time with 2 clean disjoint intervals: [1, 6] and [8, 12]!",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = steps.map((st, idx) => {
    const ver = idx + 1;
    const timeline = excalidrawIntervalTimeline("iv-tl", 95, 165, st.intervals, {
      minTick: 0,
      maxTick: 12,
      axisWidth: 560,
      version: ver,
    });
    const focusPt = timeline.getIntervalCenter(st.focusIdx);

    const els: WbElement[] = [
      excalidrawRect("iv-hdr", 75, 35, 650, 90, {
        strokeColor: "#0284c7",
        backgroundColor: "#f0f9ff",
        version: ver,
      }),
      excalidrawText("iv-title", 92, 46, `Step ${ver}: ${st.title}`, {
        fontSize: 16,
        strokeColor: "#0369a1",
        maxCharsPerLine: 56,
        maxLines: 1,
        version: ver,
      }),
      excalidrawText("iv-sub", 92, 78, st.narration, {
        fontSize: 13,
        strokeColor: "#0f172a",
        maxCharsPerLine: 66,
        maxLines: 2,
        version: ver,
      }),
      ...timeline.elements,
    ];

    return {
      stepIndex: idx,
      title: st.title,
      narration: st.narration,
      mathInvariant: `Overlap iff next.start ≤ curr.end  →  curr.end = max(curr.end, next.end)`,
      elements: els,
      aiLaserTarget: focusPt,
      aiLaserWaypoints: [focusPt],
    };
  });

  return {
    id: "merge_intervals",
    topic: "Merge Intervals (Sweep-Line Coordinate Axis)",
    badge: "O(N log N) Time • Timeline",
    frames,
  };
}

/**
 * Generates an interactive QuickSort / Partition Divide-and-Conquer lesson
 * using curved swap arcs (`excalidrawCurvedArrow`) and partition boundary pointers.
 */
export function buildExcalidrawSortingPartitionLesson(
  customArr?: number[]
): AiWhiteboardLesson {
  const base =
    customArr && customArr.length >= 5
      ? customArr.slice(0, 6)
      : [8, 3, 1, 7, 0, 5];

  const steps = [
    {
      arr: [...base],
      pivotIdx: base.length - 1,
      iPtr: 0,
      jPtr: 1,
      swapPair: [0, 1] as [number, number] | null,
      title: `Partition Around Pivot = ${base[base.length - 1]} → Swap Smaller Element Into Left Zone`,
      narration: `Choosing rightmost element ${base[base.length - 1]} as pivot, scanner j finds a value <= pivot and swaps it to boundary i, expanding the '<= pivot' zone.`,
    },
    {
      arr: [3, 1, 0, 7, 8, 5],
      pivotIdx: 5,
      iPtr: 3,
      jPtr: 5,
      swapPair: [3, 5] as [number, number] | null,
      title: "Place Pivot 5 at Partition Boundary i = 3",
      narration:
        "After scanning the array, we swap pivot 5 with index i=3 so all elements left of index 3 are < 5 and all elements right are > 5.",
    },
    {
      arr: [0, 1, 3, 5, 7, 8],
      pivotIdx: 3,
      iPtr: 3,
      jPtr: 3,
      swapPair: null,
      title: "Pivot 5 Locked at Final Sorted Index 3 → Recurse Left & Right!",
      narration:
        "Pivot 5 is now permanently in its sorted spot! Recursively sorting the left and right partitions completes in O(N log N) average time.",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = steps.map((st, sIdx) => {
    const ver = sIdx + 1;
    const baseX = 85;
    const baseY = 195;
    const cellW = 82;
    const els: WbElement[] = [
      excalidrawRect("qs-hdr", 75, 35, 650, 90, {
        strokeColor: "#d97706",
        backgroundColor: "#fef3c7",
        version: ver,
      }),
      excalidrawText("qs-title", 92, 46, `Step ${ver}: ${st.title}`, {
        fontSize: 16,
        strokeColor: "#b45309",
        maxCharsPerLine: 56,
        maxLines: 1,
        version: ver,
      }),
      excalidrawText("qs-sub", 92, 78, st.narration, {
        fontSize: 13,
        strokeColor: "#0f172a",
        maxCharsPerLine: 66,
        maxLines: 2,
        version: ver,
      }),
    ];

    st.arr.forEach((v, idx) => {
      const cx = baseX + idx * cellW;
      const isPiv = idx === st.pivotIdx;
      const isLessZone = idx < st.iPtr;
      els.push(
        excalidrawRect(`qs-c-${idx}`, cx, baseY, cellW - 8, 58, {
          strokeColor: isPiv ? "#e11d48" : isLessZone ? "#16a34a" : "#0284c7",
          backgroundColor: isPiv
            ? "#ffe4e6"
            : isLessZone
            ? "#dcfce7"
            : "#e0f2fe",
          strokeWidth: isPiv ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`qs-v-${idx}`, cx + 26, baseY + 18, String(v), {
          fontSize: 19,
          strokeColor: "#0f172a",
          version: ver,
        }),
        excalidrawText(
          `qs-lbl-${idx}`,
          cx + 12,
          baseY + 66,
          isPiv ? "PIVOT" : `[${idx}]`,
          {
            fontSize: 12,
            strokeColor: isPiv ? "#e11d48" : "#64748b",
            version: ver,
          }
        )
      );
    });

    if (st.swapPair) {
      const [u, v] = st.swapPair;
      const x1 = baseX + u * cellW + 36;
      const x2 = baseX + v * cellW + 36;
      els.push(
        ...excalidrawLabeledConnector("qs-swap", x1, baseY, x2, baseY, {
          style: "curved",
          curveOffset: -44,
          bidirectional: true,
          label: "swap",
          strokeColor: "#e11d48",
          strokeWidth: 3,
          version: ver,
        })
      );
    }

    const focusX = baseX + st.pivotIdx * cellW + 36;
    return {
      stepIndex: sIdx,
      title: st.title,
      narration: st.narration,
      mathInvariant: `arr[0..i-1] ≤ pivot < arr[i+1..n-1] • boundary i = ${st.iPtr}`,
      elements: els,
      aiLaserTarget: { x: focusX, y: baseY + 29 },
      aiLaserWaypoints: [{ x: focusX, y: baseY + 29 }],
    };
  });

  return {
    id: "sorting_partition",
    topic: "QuickSort & Divide-and-Conquer Partitioning",
    badge: "O(N log N) Time • In-Place",
    frames,
  };
}

function isZoneUiChromeElementId(rawId: string): boolean {
  const id = String(rawId || "");
  return (
    id.endsWith("__zone-card") ||
    id.endsWith("__zone-hdr") ||
    id.endsWith("__zone-title") ||
    id.endsWith("__zone-model-box") ||
    id.endsWith("__zone-model-txt") ||
    id.endsWith("__zone-sel-banner") ||
    id.endsWith("__zone-sel-txt") ||
    id.endsWith("__zone-branch-arrow") ||
    id.endsWith("__zone-branch-lbl") ||
    id.endsWith("__ai-title") ||
    id.endsWith("__ai-badge") ||
    id.endsWith("__ai-narration") ||
    id.endsWith("__ai-math-pill") ||
    id.includes("__ai-idx-lbl-") ||
    id.includes("__ai-ptr-lbl-") ||
    id.includes("__ai-ptr-arr-") ||
    id.endsWith("hdr-title") ||
    id.endsWith("hdr-sub") ||
    id.endsWith("nar-txt") ||
    id.endsWith("inv-txt")
  );
}

/**
 * Builds rich semantic context (`LinkedZoneContext`) for a specific simulation zone
 * so the AI Co-Teacher knows its exact topic, step history, active step, and data values.
 */
export function buildLinkedZoneContextFromLesson(
  zone: AiWhiteboardLesson,
  zoneIndex: number,
  activeStepIndex = 0
): LinkedZoneContext {
  const safeStepIdx = Math.max(
    0,
    Math.min(activeStepIndex, Math.max(0, zone.frames.length - 1))
  );
  const currentFrame = zone.frames[safeStepIdx] ?? zone.frames[0];
  const frameElements = currentFrame?.elements ?? [];

  const dataValues: number[] = [];
  const dataLabels: string[] = [];

  // 1. Check if the frame has an explicit raw input banner (e.g. "Input Data: [2, 1, 5, 1, 3, 2]")
  const rawBannerEl = frameElements.find((el) =>
    String(el.id || "").endsWith("__ai-raw-data-txt")
  );
  if (rawBannerEl && typeof rawBannerEl.text === "string") {
    const matches = rawBannerEl.text.match(/-?\d+/g);
    if (matches) {
      for (const m of matches) {
        const n = Number(m);
        if (!Number.isNaN(n) && dataValues.length < 16) {
          dataValues.push(n);
        }
      }
    }
  }

  // 2. Sort frame elements left-to-right and extract clean node values and state labels
  const sortedEls = [...frameElements].sort(
    (a, b) => (Number(a.x) || 0) - (Number(b.x) || 0)
  );
  const needNodeValues = dataValues.length === 0;

  for (const el of sortedEls) {
    if (!el || el.isDeleted || typeof el.text !== "string") continue;
    const idStr = String(el.id || "");
    const txt = el.text.trim();
    if (!txt) continue;
    if (isZoneUiChromeElementId(idStr)) continue;
    if (idStr.endsWith("__ai-raw-data-txt")) {
      dataLabels.push(txt);
      continue;
    }

    if (idStr.includes("__ai-sv-txt-")) {
      dataLabels.push(txt.replace(/\n+/g, ": "));
      continue;
    }

    // Ignore bracketed index labels like [0], [1]
    if (/^\[\d+\]$/.test(txt)) continue;

    dataLabels.push(txt.replace(/\n+/g, " "));

    // Extract pure node numeric values if raw input banner wasn't present
    if (needNodeValues && /^-?\d+$/.test(txt)) {
      const n = Number(txt);
      if (!Number.isNaN(n) && dataValues.length < 16) {
        dataValues.push(n);
      }
    }
  }

  // Fallback: if no standalone integer boxes were found, extract numbers from non-chrome data labels
  if (dataValues.length === 0) {
    for (const lbl of dataLabels) {
      if (/^Step\s+\d+/i.test(lbl) || /O\([^)]+\)/.test(lbl)) continue;
      const matches = lbl.match(/-?\d+/g);
      if (matches) {
        for (const m of matches) {
          const n = Number(m);
          if (!Number.isNaN(n) && dataValues.length < 16) {
            dataValues.push(n);
          }
        }
      }
    }
  }

  const bounds = zone.zoneBounds
    ? {
        minX: Math.round(zone.zoneBounds.x),
        minY: Math.round(zone.zoneBounds.y),
        maxX: Math.round(zone.zoneBounds.x + zone.zoneBounds.width),
        maxY: Math.round(zone.zoneBounds.y + zone.zoneBounds.height),
        width: Math.round(zone.zoneBounds.width),
        height: Math.round(zone.zoneBounds.height),
      }
    : null;

  return {
    zoneId: zone.zoneId || `zone_${zoneIndex + 1}`,
    zoneNumber: zoneIndex + 1,
    topic: zone.topic,
    badge: zone.badge,
    activeStepIndex: safeStepIdx,
    activeStepTitle: currentFrame?.title || "",
    activeStepNarration: currentFrame?.narration || "",
    activeStepMathInvariant: currentFrame?.mathInvariant || "",
    allStepsSummary: zone.frames.map((f, idx) => ({
      stepNumber: idx + 1,
      title: f.title,
      narration: f.narration,
      mathInvariant: f.mathInvariant,
    })),
    dataValues,
    dataLabels: dataLabels.slice(0, 18),
    bounds,
  };
}

/**
 * Creates a complete `WhiteboardSelectionContext` directly linked to a specific Zone
 * (used when the user clicks "Tag / Link Zone" or selects a previous zone from the Board Zones bar).
 */
export function createSelectionContextForZone(
  zone: AiWhiteboardLesson,
  zoneIndex: number,
  activeStepIndex = 0,
  mode: "branch" | "takeover" = "branch"
): WhiteboardSelectionContext {
  const linkedZone = buildLinkedZoneContextFromLesson(
    zone,
    zoneIndex,
    activeStepIndex
  );
  const currentFrame =
    zone.frames[linkedZone.activeStepIndex] ?? zone.frames[0];
  const frameElements = currentFrame?.elements ?? [];

  const summaries: WhiteboardSelectedElementSummary[] = frameElements
    .filter((el) => el && !el.isDeleted && !isZoneUiChromeElementId(String(el.id || "")))
    .slice(0, 25)
    .map((el) => ({
      id: String(el.id),
      type: String(el.type),
      x: Math.round(Number(el.x) || 0),
      y: Math.round(Number(el.y) || 0),
      width: Math.round(Number(el.width) || 40),
      height: Math.round(Number(el.height) || 40),
      text: typeof el.text === "string" ? el.text.slice(0, 120) : undefined,
      strokeColor: el.strokeColor,
      backgroundColor: el.backgroundColor,
    }));

  return {
    selectedElements:
      summaries.length > 0
        ? summaries
        : [
            {
              id: `${linkedZone.zoneId}__zone-card`,
              type: "rectangle",
              x: linkedZone.bounds?.minX ?? 40,
              y: linkedZone.bounds?.minY ?? 40,
              width: linkedZone.bounds?.width ?? 760,
              height: linkedZone.bounds?.height ?? 520,
              text: linkedZone.topic,
            },
          ],
    bounds: linkedZone.bounds,
    extractedNumbers: linkedZone.dataValues,
    extractedTexts: linkedZone.dataLabels,
    mode,
    linkedZone,
  };
}

/**
 * Extracts structured insight (bounding box, numbers, text labels, shapes, and parent LinkedZoneContext)
 * from the elements the user clicked or drag-selected on the Excalidraw whiteboard.
 */
export function extractWhiteboardSelectionContext(
  allSceneElements: readonly any[],
  selectedElementIds: Record<string, boolean> | undefined | null,
  zonesHistory?: readonly AiWhiteboardLesson[],
  zoneStepMap?: ReadonlyMap<string, number>
): WhiteboardSelectionContext {
  if (!selectedElementIds) {
    return {
      selectedElements: [],
      bounds: null,
      extractedNumbers: [],
      extractedTexts: [],
      linkedZone: null,
    };
  }
  const activeIds = new Set(
    Object.entries(selectedElementIds)
      .filter(([, isSelected]) => Boolean(isSelected))
      .map(([id]) => id)
  );
  if (activeIds.size === 0) {
    return {
      selectedElements: [],
      bounds: null,
      extractedNumbers: [],
      extractedTexts: [],
      linkedZone: null,
    };
  }

  const directSelected = allSceneElements.filter(
    (el) => el && !el.isDeleted && activeIds.has(el.id)
  );
  if (directSelected.length === 0) {
    return {
      selectedElements: [],
      bounds: null,
      extractedNumbers: [],
      extractedTexts: [],
      linkedZone: null,
    };
  }

  // Detect if any selected element belongs to a bounded simulation zone (e.g. "zone_1__...")
  let detectedZoneId: string | null = null;
  for (const el of directSelected) {
    const idStr = String(el.id || "");
    const m = idStr.match(/^(zone_\d+)__/);
    if (m?.[1]) {
      detectedZoneId = m[1];
      break;
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of directSelected) {
    const x = Number(el.x) || 0;
    const y = Number(el.y) || 0;
    const w = Math.max(10, Number(el.width) || 40);
    const h = Math.max(10, Number(el.height) || 40);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  // If no zone prefix was directly on the selected shape, check if selection bounds lie inside an existing zone
  if (!detectedZoneId && zonesHistory && zonesHistory.length > 0) {
    const selCx = (minX + maxX) / 2;
    const selCy = (minY + maxY) / 2;
    for (const z of zonesHistory) {
      if (!z.zoneBounds || !z.zoneId) continue;
      const zb = z.zoneBounds;
      if (
        selCx >= zb.x &&
        selCx <= zb.x + zb.width &&
        selCy >= zb.y &&
        selCy <= zb.y + zb.height
      ) {
        detectedZoneId = z.zoneId;
        break;
      }
    }
  }

  let linkedZone: LinkedZoneContext | null = null;
  if (detectedZoneId && zonesHistory && zonesHistory.length > 0) {
    const zIdx = zonesHistory.findIndex((z) => z.zoneId === detectedZoneId);
    if (zIdx >= 0) {
      const matchedZone = zonesHistory[zIdx]!;
      const stepForZone = zoneStepMap?.get(detectedZoneId) ?? 0;
      linkedZone = buildLinkedZoneContextFromLesson(
        matchedZone,
        zIdx,
        stepForZone
      );
    }
  }

  // Also include any text/shapes spatially inside the user's drag-selected bounding box
  const spatiallyIncluded = allSceneElements.filter((el) => {
    if (!el || el.isDeleted) return false;
    if (activeIds.has(el.id)) return true;
    const cx = (Number(el.x) || 0) + (Number(el.width) || 0) / 2;
    const cy = (Number(el.y) || 0) + (Number(el.height) || 0) / 2;
    return cx >= minX - 8 && cx <= maxX + 8 && cy >= minY - 8 && cy <= maxY + 8;
  });

  const sortedByX = [...spatiallyIncluded].sort(
    (a, b) => (Number(a.x) || 0) - (Number(b.x) || 0)
  );

  const extractedNumbers: number[] = [];
  const extractedTexts: string[] = [];

  for (const el of sortedByX) {
    const idStr = String(el.id || "");
    if (isZoneUiChromeElementId(idStr)) continue;
    if (typeof el.text === "string" && el.text.trim()) {
      const txt = el.text.trim();
      if (/^\[\d+\]$/.test(txt)) continue;
      extractedTexts.push(txt);
      const matches = txt.match(/-?\d+/g);
      if (matches) {
        for (const m of matches) {
          const n = Number(m);
          if (!Number.isNaN(n) && extractedNumbers.length < 16) {
            extractedNumbers.push(n);
          }
        }
      }
    }
  }

  // If the user clicked a zone card/header or a single element inside a linked zone,
  // enrich extractedNumbers and extractedTexts with the linked zone's full dataset
  const finalNumbers =
    extractedNumbers.length >= 2
      ? extractedNumbers
      : linkedZone && linkedZone.dataValues.length > 0
      ? linkedZone.dataValues
      : extractedNumbers;

  const finalTexts =
    extractedTexts.length >= 2
      ? extractedTexts.slice(0, 16)
      : linkedZone && linkedZone.dataLabels.length > 0
      ? Array.from(new Set([...extractedTexts, ...linkedZone.dataLabels])).slice(0, 16)
      : extractedTexts.slice(0, 16);

  const summaries: WhiteboardSelectedElementSummary[] = sortedByX
    .filter((el) => !isZoneUiChromeElementId(String(el.id || "")))
    .slice(0, 25)
    .map((el) => ({
      id: String(el.id),
      type: String(el.type),
      x: Math.round(Number(el.x) || 0),
      y: Math.round(Number(el.y) || 0),
      width: Math.round(Number(el.width) || 40),
      height: Math.round(Number(el.height) || 40),
      text: typeof el.text === "string" ? el.text.slice(0, 120) : undefined,
      strokeColor: el.strokeColor,
      backgroundColor: el.backgroundColor,
    }));

  const effectiveBounds = linkedZone?.bounds ?? {
    minX: Math.round(minX),
    minY: Math.round(minY),
    maxX: Math.round(maxX),
    maxY: Math.round(maxY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  };

  return {
    selectedElements:
      summaries.length > 0
        ? summaries
        : directSelected.slice(0, 10).map((el) => ({
            id: String(el.id),
            type: String(el.type),
            x: Math.round(Number(el.x) || 0),
            y: Math.round(Number(el.y) || 0),
            width: Math.round(Number(el.width) || 40),
            height: Math.round(Number(el.height) || 40),
            text: typeof el.text === "string" ? el.text.slice(0, 120) : undefined,
          })),
    bounds: effectiveBounds,
    extractedNumbers: finalNumbers,
    extractedTexts: finalTexts,
    linkedZone,
  };
}

/**
 * Pre-calculates the exact bounded zone dimensions (width, height, and raw minX/minY)
 * of an AiWhiteboardLesson across all of its step frames.
 */
export function measureLessonZoneDimensions(
  lesson: AiWhiteboardLesson,
  hasSelectionBanner = false
): {
  zoneWidth: number;
  zoneHeight: number;
  rawMinX: number;
  rawMinY: number;
  topBarH: number;
  padX: number;
  padTop: number;
} {
  let rawMinX = Infinity;
  let rawMinY = Infinity;
  let rawMaxX = -Infinity;
  let rawMaxY = -Infinity;

  for (const frame of lesson.frames) {
    for (const el of frame.elements) {
      const x = Number(el.x) || 0;
      const y = Number(el.y) || 0;
      const pts = (el as { points?: Array<[number, number]> }).points;
      if (Array.isArray(pts) && pts.length > 0) {
        for (const pt of pts) {
          const px = x + (Number(pt?.[0]) || 0);
          const py = y + (Number(pt?.[1]) || 0);
          rawMinX = Math.min(rawMinX, px);
          rawMinY = Math.min(rawMinY, py);
          rawMaxX = Math.max(rawMaxX, px);
          rawMaxY = Math.max(rawMaxY, py);
        }
      } else {
        const w = Math.max(20, Number(el.width) || 60);
        const h = Math.max(20, Number(el.height) || 40);
        rawMinX = Math.min(rawMinX, x);
        rawMinY = Math.min(rawMinY, y);
        rawMaxX = Math.max(rawMaxX, x + w);
        rawMaxY = Math.max(rawMaxY, y + h);
      }
    }
  }

  if (!Number.isFinite(rawMinX)) {
    rawMinX = 60;
    rawMinY = 40;
    rawMaxX = 720;
    rawMaxY = 440;
  }

  const padX = 36;
  const topBarH = hasSelectionBanner ? 76 : 54;
  const padTop = topBarH + 24;
  const padBottom = 36;

  const contentW = Math.max(660, rawMaxX - rawMinX);
  const contentH = Math.max(360, rawMaxY - rawMinY);
  const zoneWidth = Math.round(contentW + padX * 2);
  const zoneHeight = Math.round(contentH + padTop + padBottom);

  return {
    zoneWidth,
    zoneHeight,
    rawMinX,
    rawMinY,
    topBarH,
    padX,
    padTop,
  };
}

/**
 * Dynamically finds a clean, open, non-overlapping coordinate `(originX, originY)` on the
 * whiteboard by inspecting the real bounding boxes of all existing zones and live canvas elements.
 * Zero hardcoded grid coordinates — adapts to any diagram width/height and user drawings.
 */
export function findDynamicCleanBoardPosition(opts: {
  newZoneWidth: number;
  newZoneHeight: number;
  occupiedRects: Array<{ x: number; y: number; width: number; height: number }>;
  lastZoneBounds?: { x: number; y: number; width: number; height: number } | null;
  selCtx?: WhiteboardSelectionContext | null;
  mode?: "branch" | "takeover";
  gap?: number;
}): {
  originX: number;
  originY: number;
  connectedFromBounds?: WhiteboardSelectionContext["bounds"];
} {
  const {
    newZoneWidth,
    newZoneHeight,
    occupiedRects,
    lastZoneBounds,
    selCtx,
    mode = "branch",
    gap = 88,
  } = opts;

  const findCollision = (
    cx: number,
    cy: number
  ): { x: number; y: number; width: number; height: number } | null => {
    for (const r of occupiedRects) {
      const hitX =
        cx < r.x + r.width + gap && cx + newZoneWidth + gap > r.x;
      const hitY =
        cy < r.y + r.height + gap && cy + newZoneHeight + gap > r.y;
      if (hitX && hitY) {
        return r;
      }
    }
    return null;
  };

  // 1. If the user explicitly drag-selected an area on the board to branch from or take over
  if (selCtx?.bounds && selCtx.selectedElements.length > 0) {
    if (mode === "takeover") {
      let cx = selCtx.bounds.minX;
      const cy = selCtx.bounds.minY;
      let guard = 0;
      while ( guard < 50) {
        const hit = findCollision(cx, cy);
        if (!hit) break;
        cx = hit.x + hit.width + gap;
        guard++;
      }
      return {
        originX: Math.round(cx),
        originY: Math.round(cy),
        connectedFromBounds: null,
      };
    }

    // Branch mode: place cleanly to the right of the selected region, shifting down/right if occupied
    let cx = selCtx.bounds.maxX + gap;
    let cy = selCtx.bounds.minY;
    let guard = 0;
    while (guard < 60) {
      const hit = findCollision(cx, cy);
      if (!hit) break;
      if (guard % 3 !== 2) {
        cy = hit.y + hit.height + gap;
      } else {
        cx = hit.x + hit.width + gap;
        cy = selCtx.bounds.minY;
      }
      guard++;
    }
    return {
      originX: Math.round(cx),
      originY: Math.round(cy),
      connectedFromBounds: selCtx.bounds,
    };
  }

  // 2. If the board is completely empty, place the first zone near the top-left origin
  if (occupiedRects.length === 0) {
    return {
      originX: 40,
      originY: 40,
      connectedFromBounds: null,
    };
  }

  // 3. Compute dynamic bounding envelope of all existing teachings and user drawings on the board
  let boardMinX = Infinity;
  let boardMinY = Infinity;
  let boardMaxX = -Infinity;
  let boardMaxY = -Infinity;

  for (const r of occupiedRects) {
    boardMinX = Math.min(boardMinX, r.x);
    boardMinY = Math.min(boardMinY, r.y);
    boardMaxX = Math.max(boardMaxX, r.x + r.width);
    boardMaxY = Math.max(boardMaxY, r.y + r.height);
  }

  if (!Number.isFinite(boardMinX)) {
    boardMinX = 40;
    boardMinY = 40;
    boardMaxX = 800;
    boardMaxY = 560;
  }

  // Build dynamic candidate positions anchored to existing zone bounding boxes (2 zones per dynamic row)
  const candidates: Array<{ x: number; y: number }> = [];

  if (lastZoneBounds) {
    const rightOfLastX = lastZoneBounds.x + lastZoneBounds.width + gap;
    const rightOfLastY = lastZoneBounds.y;
    const isLastInFirstColumn =
      lastZoneBounds.x - boardMinX < Math.max(420, newZoneWidth * 0.75);

    if (isLastInFirstColumn) {
      // Place directly to the right of the most recent zone on the same row
      candidates.push({ x: rightOfLastX, y: rightOfLastY });
      // Or start a new row below all existing content
      candidates.push({ x: boardMinX, y: boardMaxY + gap });
    } else {
      // Previous row has 2 zones; start a fresh row below all existing content
      candidates.push({ x: boardMinX, y: boardMaxY + gap });
      candidates.push({ x: rightOfLastX, y: rightOfLastY });
    }
  }

  // Additional dynamic candidate anchors around every existing bounding box
  candidates.push({ x: boardMinX, y: boardMaxY + gap });
  candidates.push({ x: boardMaxX + gap, y: boardMinY });
  for (const r of occupiedRects) {
    candidates.push({ x: r.x + r.width + gap, y: r.y });
    candidates.push({ x: r.x, y: r.y + r.height + gap });
  }

  for (const cand of candidates) {
    if (!findCollision(cand.x, cand.y)) {
      return {
        originX: Math.round(cand.x),
        originY: Math.round(cand.y),
        connectedFromBounds: null,
      };
    }
  }

  // Fallback resolution loop: guarantee zero overlap by shifting below/right of any colliding box
  let fallbackX = boardMinX;
  let fallbackY = boardMaxY + gap;
  let guard = 0;
  while (guard < 80) {
    const hit = findCollision(fallbackX, fallbackY);
    if (!hit) break;
    fallbackY = hit.y + hit.height + gap;
    guard++;
  }

  return {
    originX: Math.round(fallbackX),
    originY: Math.round(fallbackY),
    connectedFromBounds: null,
  };
}


/**
 * Surrounds an entire AiWhiteboardLesson inside its own dedicated, non-overlapping
 * architectural Zone Frame on the Excalidraw canvas so that triggering a new
 * simulation NEVER overwrites or collides with previous simulations or user drawings.
 */
export function wrapLessonInBoundedZone(
  lesson: AiWhiteboardLesson,
  opts: {
    zoneId: string;
    zoneIndex: number;
    originX: number;
    originY: number;
    connectedFromBounds?: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      width: number;
      height: number;
    } | null;
    selectionBannerText?: string;
  }
): AiWhiteboardLesson {
  const { zoneId, zoneIndex, originX, originY, connectedFromBounds, selectionBannerText } = opts;

  const {
    zoneWidth,
    zoneHeight,
    rawMinX,
    rawMinY,
    topBarH: TOP_BAR_H,
    padX: PAD_X,
    padTop: PAD_TOP,
  } = measureLessonZoneDimensions(lesson, Boolean(selectionBannerText));

  const dx = originX + PAD_X - rawMinX;
  const dy = originY + PAD_TOP - rawMinY;

  const isLiveAi =
    lesson.aiSource === "gemini_live" ||
    lesson.aiSource === "openai_live" ||
    lesson.aiSource === "openrouter_live" ||
    (Boolean(lesson.modelUsed) &&
      !String(lesson.modelUsed).toLowerCase().includes("offline") &&
      !String(lesson.modelUsed).toLowerCase().includes("preset") &&
      !String(lesson.modelUsed).toLowerCase().includes("fallback"));
  const isFallback = lesson.aiSource === "deterministic_fallback";

  const modelBadgeText = isLiveAi
    ? `LIVE AI: ${lesson.modelUsed || "gemini-flash-lite-latest"}`
    : isFallback
    ? `OFFLINE FALLBACK${lesson.fallbackReason ? ` (${lesson.fallbackReason.slice(0, 22)})` : ""}`
    : `OFFLINE PRESET`;

  const modelBadgeStroke = isLiveAi
    ? "#059669"
    : isFallback
    ? "#e11d48"
    : "#d97706";
  const modelBadgeBg = isLiveAi
    ? "#d1fae5"
    : isFallback
    ? "#ffe4e6"
    : "#fef3c7";
  const modelBadgeW = Math.min(
    320,
    Math.max(168, modelBadgeText.length * 8 + 24)
  );
  const modelBadgeX = originX + zoneWidth - modelBadgeW - 14;
  const modelBadgeY = originY + 8;

  const wrappedFrames: AiWhiteboardStepFrame[] = lesson.frames.map((frame, fIdx) => {
    const ver = fIdx + 1;
    const zonedElements: WbElement[] = [
      // Outer Fixed Simulation Area Card (surrounds the entire simulation)
      excalidrawRect(`${zoneId}__zone-card`, originX, originY, zoneWidth, zoneHeight, {
        strokeColor: "#2b2d42",
        backgroundColor: "#fffdf8",
        strokeWidth: 3,
        version: ver,
      }),
      // Top Zone Title Header Strip
      excalidrawRect(`${zoneId}__zone-hdr`, originX, originY, zoneWidth, TOP_BAR_H, {
        strokeColor: "#2b2d42",
        backgroundColor: "#f4ede2",
        strokeWidth: 2,
        version: ver,
      }),
      excalidrawText(
        `${zoneId}__zone-title`,
        originX + 20,
        originY + 14,
        `ZONE #${zoneIndex + 1} • ${lesson.topic}   [${lesson.badge}]`,
        {
          fontSize: 16,
          strokeColor: "#2b2d42",
          maxCharsPerLine: 52,
          maxLines: 1,
          version: ver,
        }
      ),
      // Model Which Answered Badge Box in Top-Right of Drawing Box
      excalidrawRect(
        `${zoneId}__zone-model-box`,
        modelBadgeX,
        modelBadgeY,
        modelBadgeW,
        32,
        {
          strokeColor: modelBadgeStroke,
          backgroundColor: modelBadgeBg,
          strokeWidth: 2,
          version: ver,
        }
      ),
      excalidrawText(
        `${zoneId}__zone-model-txt`,
        modelBadgeX + 10,
        modelBadgeY + 8,
        modelBadgeText,
        {
          fontSize: 13,
          strokeColor: modelBadgeStroke,
          maxCharsPerLine: 38,
          maxLines: 1,
          version: ver,
        }
      ),
    ];

    if (selectionBannerText) {
      zonedElements.push(
        excalidrawText(
          `${zoneId}__zone-sel-ctx`,
          originX + 20,
          originY + 42,
          `🎯 Context from Selected Area: ${selectionBannerText}`,
          {
            fontSize: 13,
            strokeColor: "#be123c",
            maxCharsPerLine: 82,
            maxLines: 1,
            version: ver,
          }
        )
      );
    }

    // If branched from a user's drag-selected area on the board, draw a connector arrow
    if (connectedFromBounds) {
      const fromX = connectedFromBounds.maxX + 6;
      const fromY = connectedFromBounds.minY + connectedFromBounds.height / 2;
      const toX = originX - 6;
      const toY = originY + Math.min(180, zoneHeight / 2);
      zonedElements.push(
        excalidrawArrow(`${zoneId}__zone-conn`, fromX, fromY, toX, toY, {
          strokeColor: "#e11d48",
          strokeWidth: 3,
          strokeStyle: "dashed",
          version: ver,
        })
      );
    }

    // Translate and ID-namespace every element inside the frame
    for (const el of frame.elements) {
      const nx = Math.round((Number(el.x) || 0) + dx);
      const ny = Math.round((Number(el.y) || 0) + dy);

      const scopedId = el.id.startsWith(`${zoneId}__`)
        ? el.id
        : `${zoneId}__${el.id}`;

      zonedElements.push({
        ...el,
        id: scopedId,
        x: nx,
        y: ny,
        version: ver,
        versionNonce: Math.abs(hashToInteger(`${scopedId}-v${ver}`)) % 1_000_000_000,
      });
    }

    const primaryTarget = {
      x: Math.round((frame.aiLaserTarget?.x ?? rawMinX + 200) + dx),
      y: Math.round((frame.aiLaserTarget?.y ?? rawMinY + 180) + dy),
    };

    const rawWaypoints =
      frame.aiLaserWaypoints && frame.aiLaserWaypoints.length > 0
        ? frame.aiLaserWaypoints.map((pt) => ({
            x: Math.round(pt.x + dx),
            y: Math.round(pt.y + dy),
          }))
        : [primaryTarget];

    return {
      ...frame,
      elements: zonedElements,
      aiLaserTarget: primaryTarget,
      aiLaserWaypoints: rawWaypoints.length > 0 ? rawWaypoints : [primaryTarget],
    };
  });

  return {
    ...lesson,
    zoneId,
    zoneBounds: {
      x: originX,
      y: originY,
      width: zoneWidth,
      height: zoneHeight,
    },
    frames: wrappedFrames,
  };
}

/**
 * Generates an interactive Excalidraw lesson for ANY user prompt, taking into account
 * any area or elements the user drag-selected on the whiteboard!
 */
export function generateAiExcalidrawLessonForQuery(
  query: string,
  selectionContext?: WhiteboardSelectionContext | null
): AiWhiteboardLesson {
  const linkedTopic = selectionContext?.linkedZone?.topic || "";
  const q = `${query} ${linkedTopic}`.toLowerCase();

  // Merge numbers from user's text query AND numbers extracted from user's drag-selected / linked whiteboard zone!
  const queryNums =
    query
      .match(/-?\d+/g)
      ?.map(Number)
      .filter((n) => !Number.isNaN(n)) || [];
  const selectedNums =
    selectionContext?.extractedNumbers && selectionContext.extractedNumbers.length > 0
      ? selectionContext.extractedNumbers
      : selectionContext?.linkedZone?.dataValues || [];
  const combinedNums = queryNums.length >= 2 ? queryNums : selectedNums;

  // 1. Graphs / Shortest Path / Dijkstra / Bellman-Ford / Topological Sort / Union-Find
  if (
    q.includes("dijkstra") ||
    q.includes("shortest path") ||
    q.includes("graph") ||
    q.includes("bellman") ||
    q.includes("topological") ||
    q.includes("union find") ||
    q.includes("kruskal") ||
    q.includes("prim")
  ) {
    return buildExcalidrawGraphShortestPathLesson();
  }

  // 2. 2D Matrix / Grid / Islands / Flood Fill / Backtracking / N-Queens / 2D DP
  if (
    q.includes("matrix") ||
    q.includes("grid") ||
    q.includes("island") ||
    q.includes("flood fill") ||
    q.includes("2d") ||
    q.includes("rotting") ||
    q.includes("backtrack") ||
    q.includes("maze")
  ) {
    return buildExcalidrawMatrix2DLesson();
  }

  // 3. Hash Map / Frequency Counter / Two Sum Unsorted / Prefix Sum Map / LRU Cache
  if (
    q.includes("hash") ||
    q.includes("map") ||
    q.includes("dictionary") ||
    q.includes("lru") ||
    q.includes("anagram") ||
    q.includes("complement") ||
    q.includes("frequency")
  ) {
    const arr =
      combinedNums.length >= 4
        ? combinedNums.slice(0, -1)
        : [3, 2, 4, 7];
    const target =
      combinedNums.length >= 4
        ? combinedNums[combinedNums.length - 1]!
        : 9;
    return buildExcalidrawHashMapLesson(arr, target);
  }

  // 4. Heap / Priority Queue / K-th Largest / Top K / Median Stream
  if (
    q.includes("heap") ||
    q.includes("priority queue") ||
    q.includes("kth") ||
    q.includes("k-th") ||
    q.includes("top k") ||
    q.includes("sift")
  ) {
    return buildExcalidrawHeapPriorityQueueLesson();
  }

  // 5. Trie / Prefix Tree / Autocomplete / Word Search
  if (
    q.includes("trie") ||
    q.includes("prefix tree") ||
    q.includes("autocomplete") ||
    q.includes("dictionary tree")
  ) {
    return buildExcalidrawTrieLesson();
  }

  // 6. Merge Intervals / Sweep Line / Meeting Rooms / Non-Overlapping Intervals
  if (
    q.includes("interval") ||
    q.includes("meeting") ||
    q.includes("sweep") ||
    q.includes("schedule") ||
    q.includes("calendar")
  ) {
    return buildExcalidrawIntervalsLesson();
  }

  // 7. Sorting / QuickSort / Merge Sort / Partition / Divide and Conquer
  if (
    q.includes("quicksort") ||
    q.includes("quick sort") ||
    q.includes("mergesort") ||
    q.includes("merge sort") ||
    q.includes("partition") ||
    q.includes("pivot") ||
    q.includes("sort")
  ) {
    return buildExcalidrawSortingPartitionLesson(
      combinedNums.length >= 4 ? combinedNums : undefined
    );
  }

  // 8. Sliding Window / Subarray Sum
  if (
    q.includes("sliding window") ||
    q.includes("subarray") ||
    q.includes("window") ||
    q.includes("kadane")
  ) {
    const arr =
      combinedNums.length >= 4 ? combinedNums : [2, 1, 5, 1, 3, 2];
    return buildExcalidrawSlidingWindowLesson(arr, 3);
  }

  // 9. Monotonic Stack / Queue
  if (q.includes("monotonic") || q.includes("stack") || q.includes("next greater")) {
    const arr =
      combinedNums.length >= 3 ? combinedNums.slice(0, 7) : [2, 1, 5, 6, 2, 3];
    return buildExcalidrawMonotonicStackLesson(arr);
  }

  // 10. Dynamic Programming
  if (
    q.includes("dp") ||
    q.includes("dynamic programming") ||
    q.includes("memo") ||
    q.includes("fibonacci") ||
    q.includes("knapsack") ||
    q.includes("climbing")
  ) {
    const nVal =
      combinedNums.length === 1 && combinedNums[0]! >= 3 && combinedNums[0]! <= 9
        ? combinedNums[0]!
        : 6;
    return buildExcalidrawDpTableLesson(nVal);
  }

  // 11. Binary Search
  if (
    q.includes("binary search") ||
    q.includes("mid") ||
    q.includes("sorted range") ||
    q.includes("halv")
  ) {
    const arr =
      combinedNums.length >= 4
        ? combinedNums.slice(0, -1)
        : [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
    const target =
      combinedNums.length >= 4
        ? combinedNums[combinedNums.length - 1]!
        : 23;
    return buildExcalidrawBinarySearchLesson(arr, target);
  }

  // 12. Linked List
  if (
    q.includes("linked list") ||
    q.includes("reverse") ||
    q.includes("next") ||
    q.includes("prev")
  ) {
    return buildExcalidrawLinkedListLesson();
  }

  // 13. Trees / BST / DFS
  if (
    q.includes("tree") ||
    q.includes("bst") ||
    q.includes("dfs") ||
    q.includes("bfs") ||
    q.includes("recursion")
  ) {
    return buildExcalidrawTreeLesson();
  }

  // 14. Two Pointers / Optimal Pair / Takeover from Selection
  if (
    q.includes("two pointer") ||
    q.includes("pointer") ||
    q.includes("pair") ||
    q.includes("two sum") ||
    q.includes("optimal") ||
    (combinedNums.length >= 3 && (q.includes("continue") || q.includes("take over") || q.includes("solve")))
  ) {
    const arr =
      combinedNums.length >= 4
        ? combinedNums.slice(0, -1)
        : combinedNums.length >= 3
        ? combinedNums
        : [1, 3, 5, 8, 12, 17, 21];
    const target =
      combinedNums.length >= 4
        ? combinedNums[combinedNums.length - 1]!
        : 17;
    return buildExcalidrawTwoPointersLesson(arr, target);
  }

  // 15. Brute Force / Nested Loop O(N^2) / Generic Dry Run
  if (
    q.includes("brute") ||
    q.includes("dry run") ||
    q.includes("dry-run") ||
    q.includes("nested") ||
    q.includes("o(n^2)") ||
    q.includes("all pairs")
  ) {
    const arr =
      combinedNums.length >= 4
        ? combinedNums.slice(0, -1)
        : combinedNums.length >= 3
        ? combinedNums
        : [1, 3, 5, 8, 12];
    const target =
      combinedNums.length >= 4
        ? combinedNums[combinedNums.length - 1]!
        : 17;
    return buildExcalidrawBruteForceDryRunLesson(arr, target);
  }

  // 9. Clean, Well-Spaced Architectural / Dry-Run Flowchart for any Custom Query
  const cleanTitle = wrapWhiteboardText(
    query.trim() || "Algorithmic Breakdown & Dry-Run",
    46,
    1
  );
  const selectedCtxNote =
    selectionContext?.extractedTexts && selectionContext.extractedTexts.length > 0
      ? `Selected Context: ${selectionContext.extractedTexts.slice(0, 3).join(" | ")}`
      : combinedNums.length > 0
      ? `Selected Values: [${combinedNums.join(", ")}]`
      : "Step-by-Step State Invariant & Complexity Analysis";

  const stages = [
    {
      label: "1. Input & State Setup",
      detail: `Initialize data structures & bounds. ${selectedCtxNote}`,
      color: "#e0f2fe",
      stroke: "#0284c7",
    },
    {
      label: "2. Core Transition Loop",
      detail:
        "Update pointers / state table at each step while preserving the loop invariant.",
      color: "#fef3c7",
      stroke: "#d97706",
    },
    {
      label: "3. Optimal Output & Proof",
      detail:
        "Verify boundary cases (empty, duplicates, extremes) & return optimal result.",
      color: "#dcfce7",
      stroke: "#16a34a",
    },
  ];

  const frames: AiWhiteboardStepFrame[] = stages.map((st, sIdx) => {
    const ver = sIdx + 1;
    const els: WbElement[] = [
      excalidrawRect("custom-hdr", 70, 36, 700, 86, {
        strokeColor: "#0284c7",
        backgroundColor: "#f0f9ff",
        version: ver,
      }),
      excalidrawText(
        "custom-hdr-txt",
        88,
        48,
        `Walkthrough: ${cleanTitle}`,
        {
          fontSize: 17,
          strokeColor: "#0369a1",
          maxCharsPerLine: 56,
          maxLines: 1,
          version: ver,
        }
      ),
      excalidrawText(
        "custom-hdr-sub",
        88,
        82,
        `Active Stage ${ver}/3: ${st.label}`,
        {
          fontSize: 14,
          strokeColor: "#334155",
          maxCharsPerLine: 64,
          maxLines: 1,
          version: ver,
        }
      ),
    ];

    stages.forEach((box, bIdx) => {
      const bx = 70 + bIdx * 240;
      const by = 160;
      const isCurrent = bIdx === sIdx;
      const isDone = bIdx < sIdx;

      els.push(
        excalidrawRect(`custom-stage-${bIdx}`, bx, by, 216, 132, {
          strokeColor: isCurrent ? box.stroke : isDone ? "#16a34a" : "#94a3b8",
          backgroundColor: isCurrent ? box.color : isDone ? "#f0fdf4" : "#ffffff",
          strokeWidth: isCurrent ? 3 : 2,
          version: ver,
        }),
        excalidrawText(`custom-st-title-${bIdx}`, bx + 14, by + 16, box.label, {
          fontSize: 14,
          strokeColor: "#0f172a",
          maxCharsPerLine: 22,
          maxLines: 1,
          version: ver,
        }),
        excalidrawText(`custom-st-desc-${bIdx}`, bx + 14, by + 48, box.detail, {
          fontSize: 12,
          strokeColor: "#475569",
          maxCharsPerLine: 24,
          maxLines: 3,
          version: ver,
        })
      );

      if (bIdx < stages.length - 1) {
        els.push(
          excalidrawArrow(
            `custom-arr-${bIdx}`,
            bx + 218,
            by + 66,
            bx + 238,
            by + 66,
            {
              strokeColor: bIdx < sIdx ? "#16a34a" : "#64748b",
              strokeWidth: 2.5,
              version: ver,
            }
          )
        );
      }
    });

    // Bottom Trace Box
    els.push(
      excalidrawRect("custom-trace-box", 70, 326, 700, 96, {
        strokeColor: st.stroke,
        backgroundColor: "#ffffff",
        version: ver,
      }),
      excalidrawText(
        "custom-trace-txt",
        88,
        344,
        `${st.label}\n${st.detail}`,
        {
          fontSize: 14,
          strokeColor: "#0f172a",
          maxCharsPerLine: 64,
          maxLines: 3,
          version: ver,
        }
      )
    );

    const activeBoxCenterX = 70 + sIdx * 240 + 108;
    return {
      stepIndex: sIdx,
      title: st.label,
      narration: st.detail,
      mathInvariant: `Stage ${ver}/3 • ${st.label}`,
      elements: els,
      aiLaserTarget: { x: activeBoxCenterX, y: 226 },
      aiLaserWaypoints: [
        { x: 220, y: 78 },
        { x: activeBoxCenterX, y: 226 },
        { x: 380, y: 374 },
      ],
    };
  });

  return {
    id: `custom_${Date.now()}`,
    topic: cleanTitle,
    badge: "AI Custom Simulation",
    frames,
  };
}


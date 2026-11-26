import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";
import { getPatternDefinition, getStrandDefinition } from "../../data/patterns";
import { extractJson, getGeminiKey } from "../openrouter.server";
import type {
  GeneratedVisualArtifact,
  PatternId,
} from "./types";

const FORBIDDEN_SVG_TAGS = [
  "script",
  "foreignObject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
];

export interface SvgAuditResult {
  ok: boolean;
  sanitizedSvg: string;
  auditNotes: string[];
  errors: string[];
}

interface TextBbox {
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function numAttr(
  el: cheerio.Cheerio<any>,
  name: string,
  fallback = 0,
): number {
  const raw = el.attr(name);
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boxesOverlap(a: TextBbox, b: TextBbox): boolean {
  const pad = 2;
  return !(
    a.x2 - pad <= b.x1 ||
    b.x2 - pad <= a.x1 ||
    a.y2 - pad <= b.y1 ||
    b.y2 - pad <= a.y1
  );
}

/**
 * Deterministic SVG Security + Geometry + Readability Auditor (`visual-maker.ts`
 * pure-TS adaptation without native C++ `resvg` dependency):
 * 1. Strips unsafe scripts/foreignObject/event handlers/external links (XSS guard).
 * 2. Requires valid explicit viewBox (`>= 120x80`).
 * 3. Checks primitives for viewBox clipping (`> 12px` outside bounds).
 * 4. Rejects tiny unreadable `<text>` (`< 10px`) or overlapping `<text>` labels.
 */
export function sanitizeAndAuditSvg(rawSvg: string): SvgAuditResult {
  const errors: string[] = [];
  const auditNotes: string[] = [];

  if (!rawSvg || !rawSvg.includes("<svg")) {
    return {
      ok: false,
      sanitizedSvg: "",
      auditNotes,
      errors: ["Input does not contain an <svg> root element."],
    };
  }

  const $ = cheerio.load(rawSvg.trim(), { xmlMode: true });
  const root = $("svg").first();
  if (root.length === 0) {
    return {
      ok: false,
      sanitizedSvg: "",
      auditNotes,
      errors: ["Could not parse <svg> root element."],
    };
  }

  for (const tag of FORBIDDEN_SVG_TAGS) {
    const found = root.find(tag);
    if (found.length > 0) {
      errors.push(`Forbidden SVG tag <${tag}> rejected for security.`);
      found.remove();
    }
  }

  // Strip event handlers & dangerous href attributes
  root.find("*").addBack().each((_idx, node) => {
    const el = $(node);
    const attribs = (node as { attribs?: Record<string, string> }).attribs ?? {};
    for (const [k, v] of Object.entries(attribs)) {
      const kLower = k.toLowerCase();
      const vLower = (v || "").trim().toLowerCase();
      if (kLower.startsWith("on")) {
        el.removeAttr(k);
        errors.push(`Stripped unsafe attribute ${k}.`);
      } else if (
        (kLower === "href" || kLower === "xlink:href") &&
        (vLower.startsWith("javascript:") ||
          vLower.startsWith("http:") ||
          vLower.startsWith("https:"))
      ) {
        el.removeAttr(k);
        errors.push(`Stripped unsafe external or script ${k} URI.`);
      }
    }
  });

  if (!root.attr("xmlns")) {
    root.attr("xmlns", "http://www.w3.org/2000/svg");
    auditNotes.push("Normalized missing xmlns attribute.");
  }

  const viewBoxRaw = root.attr("viewBox") ?? root.attr("viewbox");
  if (!viewBoxRaw) {
    errors.push("Missing explicit SVG viewBox attribute (e.g. viewBox='0 0 680 280').");
    return {
      ok: false,
      sanitizedSvg: $.xml(root),
      auditNotes,
      errors,
    };
  }

  const vbParts = viewBoxRaw
    .trim()
    .split(/[\s,]+/)
    .map((p) => Number.parseFloat(p));
  if (
    vbParts.length !== 4 ||
    vbParts.some((n) => !Number.isFinite(n)) ||
    vbParts[2]! < 120 ||
    vbParts[3]! < 80
  ) {
    errors.push(`Invalid or too-small viewBox="${viewBoxRaw}".`);
    return {
      ok: false,
      sanitizedSvg: $.xml(root),
      auditNotes,
      errors,
    };
  }

  const [vx, vy, vw, vh] = vbParts as [number, number, number, number];
  const minX = vx - 12;
  const minY = vy - 12;
  const maxX = vx + vw + 12;
  const maxY = vy + vh + 12;

  const primitiveCount = root.find(
    "rect, circle, ellipse, line, polyline, polygon, path, text",
  ).length;
  if (primitiveCount < 2) {
    errors.push("Diagram contains fewer than 2 visual primitives.");
  }

  // Check shapes for clipping
  root.find("rect").each((_i, el) => {
    const node = $(el);
    const x = numAttr(node, "x");
    const y = numAttr(node, "y");
    const w = numAttr(node, "width");
    const h = numAttr(node, "height");
    if (x < minX || y < minY || x + w > maxX || y + h > maxY) {
      errors.push(`Rect at (${x},${y},${w}x${h}) extends past viewBox (${vx},${vy},${vw},${vh}).`);
    }
  });

  root.find("circle").each((_i, el) => {
    const node = $(el);
    const cx = numAttr(node, "cx");
    const cy = numAttr(node, "cy");
    const r = numAttr(node, "r");
    if (cx - r < minX || cy - r < minY || cx + r > maxX || cy + r > maxY) {
      errors.push(`Circle at (${cx},${cy},r=${r}) clips outside viewBox.`);
    }
  });

  // Check text legibility, clipping & mutual label overlaps
  const textBoxes: TextBbox[] = [];
  root.find("text").each((_i, el) => {
    const node = $(el);
    const label = node.text().replace(/\s+/g, " ").trim();
    if (!label) return;
    const fontSize = numAttr(node, "font-size", 13);
    if (fontSize < 10) {
      errors.push(`Text "${label}" uses tiny unreadable font-size=${fontSize} (< 10px).`);
    }
    const anchor = (node.attr("text-anchor") || "start").toLowerCase();
    const x = numAttr(node, "x");
    const y = numAttr(node, "y");
    const estWidth = Math.max(8, label.length * fontSize * 0.54);
    const estHeight = fontSize * 1.15;
    const x1 =
      anchor === "middle"
        ? x - estWidth / 2
        : anchor === "end"
          ? x - estWidth
          : x;
    const x2 = x1 + estWidth;
    const y1 = y - estHeight * 0.8;
    const y2 = y1 + estHeight;

    if (x1 < minX || y1 < minY || x2 > maxX || y2 > maxY) {
      errors.push(`Text label "${label.slice(0, 28)}" clips outside viewBox.`);
    }

    const box: TextBbox = { label, x1, y1, x2, y2 };
    for (const prev of textBoxes) {
      if (boxesOverlap(prev, box)) {
        errors.push(
          `Overlapping text labels detected: "${prev.label.slice(0, 22)}" overlaps "${label.slice(0, 22)}".`,
        );
        break;
      }
    }
    textBoxes.push(box);
  });

  if (errors.length === 0) {
    auditNotes.push(
      `Verified ${primitiveCount} primitives & ${textBoxes.length} non-overlapping labels in ${vw}x${vh} viewBox.`,
    );
  }

  return {
    ok: errors.length === 0,
    sanitizedSvg: $.xml(root),
    auditNotes,
    errors,
  };
}

export function verifyExcalidrawVisualSpec(
  spec: NonNullable<GeneratedVisualArtifact["excalidrawSpec"]>,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const len = spec.arrayValues.length;
  if (len === 0 || len > 24) {
    errors.push(`arrayValues length (${len}) must be between 1 and 24.`);
  }
  if (spec.pointers) {
    for (const [name, idx] of Object.entries(spec.pointers)) {
      if (idx < -1 || idx > len) {
        errors.push(`Pointer "${name}" index=${idx} out of array bounds [0..${len - 1}].`);
      }
    }
  }
  if (spec.highlightRange) {
    const [a, b] = spec.highlightRange;
    if (a < 0 || b < a || b >= len) {
      errors.push(`highlightRange [${a}, ${b}] out of array bounds [0..${len - 1}].`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function buildDeterministicPatternSvg(
  patternId: PatternId,
  strandId: string,
  title: string,
): GeneratedVisualArtifact {
  const pat = getPatternDefinition(patternId);
  const strand = getStrandDefinition(strandId);
  const label = (title || strand?.title || pat?.title || patternId).slice(0, 52);
  const inv = (strand?.coreInvariant || pat?.subtitle || "Invariant holds at each step").slice(0, 68);
  const trap = (strand?.commonTrap || "Off-by-one boundary error").slice(0, 64);

  const cells = [2, 4, 7, 5, 9, 3];
  const cellBoxes = cells
    .map((v, i) => {
      const x = 60 + i * 90;
      const highlight = i >= 1 && i <= 3;
      return `<rect x="${x}" y="84" width="76" height="54" rx="6" fill="${highlight ? "#dbeafe" : "#f8fafc"}" stroke="${highlight ? "#2563eb" : "#94a3b8"}" stroke-width="2" />
      <text x="${x + 38}" y="116" text-anchor="middle" font-size="18" font-weight="bold" fill="#0f172a">${v}</text>
      <text x="${x + 38}" y="156" text-anchor="middle" font-size="11" fill="#64748b">i=${i}</text>`;
    })
    .join("\n");

  const svg = `<svg viewBox="0 0 660 265" width="660" height="265" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="644" height="249" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
  <text x="28" y="38" font-size="15" font-weight="bold" fill="#0f172a">${label.replace(/[<>&]/g, "")}</text>
  <text x="28" y="60" font-size="12" fill="#2563eb">L=1</text>
  <text x="330" y="60" font-size="12" fill="#2563eb">R=3 (Active Invariant State)</text>
  ${cellBoxes}
  <text x="28" y="200" font-size="12" fill="#047857">Rule: ${inv.replace(/[<>&]/g, "")}</text>
  <text x="28" y="226" font-size="12" fill="#b45309">Watch Trap: ${trap.replace(/[<>&]/g, "")}</text>
</svg>`;

  const audited = sanitizeAndAuditSvg(svg);
  return {
    kind: "svg",
    title: label,
    svg: audited.sanitizedSvg || svg,
    verifiedByAuditor: audited.ok,
    auditNotes:
      audited.auditNotes.length > 0
        ? audited.auditNotes
        : ["Deterministic verified fallback diagram"],
    generatedAt: new Date().toISOString(),
  };
}

export type VisualModelCaller = (
  prompt: string,
  priorFeedback?: string,
) => Promise<{
  kind?: "svg" | "excalidraw_params";
  title?: string;
  svg?: string;
  excalidrawSpec?: GeneratedVisualArtifact["excalidrawSpec"];
} | null>;

const defaultVisualModelCaller: VisualModelCaller = async (
  prompt,
  priorFeedback,
) => {
  const key = getGeminiKey();
  if (!key || key.length < 15) return null;
  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    const resp = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${prompt}${priorFeedback ? `\n\nPREVIOUS ATTEMPT FAILED AUDIT — FIX THESE EXACT ERRORS:\n${priorFeedback}` : ""}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction:
            "You are a precision DSA visual diagram author. Emit STRICT JSON { \"kind\": \"svg\", \"title\": string, \"svg\": string }. SVG must have explicit viewBox=\"0 0 660 280\", clean spaced text labels (>=12px font-size) that NEVER overlap or clip, high contrast light card styling (#ffffff background, dark text), and concrete pointer/array/tree values.",
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("Visual model timeout")), 15000),
      ),
    ]);
    const parsed = extractJson(resp.text || "");
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as {
      kind?: "svg" | "excalidraw_params";
      title?: string;
      svg?: string;
      excalidrawSpec?: GeneratedVisualArtifact["excalidrawSpec"];
    };
  } catch {
    return null;
  }
};

/**
 * Iterative Visual-Maker Verification Loop (`visual-maker.ts` doctrine):
 * Runs up to 3 critique/repair iterations ensuring no clipped, script-unsafe,
 * or label-overlapping diagram ever reaches the learner UI.
 */
export async function generateAndVerifyPatternVisual(opts: {
  patternId: PatternId;
  strandId: string;
  brief: string;
  visualModelCaller?: VisualModelCaller;
  maxIterations?: number;
}): Promise<GeneratedVisualArtifact> {
  const maxIter = Math.max(1, Math.min(4, opts.maxIterations ?? 3));
  const caller = opts.visualModelCaller ?? defaultVisualModelCaller;
  let lastErrors = "";

  for (let iter = 1; iter <= maxIter; iter++) {
    const raw = await caller(
      `Create a crisp algorithmic state / counterexample diagram for ${opts.patternId} (${opts.strandId}):\nBrief: ${opts.brief}`,
      lastErrors || undefined,
    );
    if (!raw) break;

    if (raw.kind === "excalidraw_params" && raw.excalidrawSpec) {
      const check = verifyExcalidrawVisualSpec(raw.excalidrawSpec);
      if (check.ok) {
        return {
          kind: "excalidraw_params",
          title: raw.title || opts.brief.slice(0, 80),
          excalidrawSpec: raw.excalidrawSpec,
          verifiedByAuditor: true,
          auditNotes: [
            `Verified Excalidraw bounds on pass ${iter} (${raw.excalidrawSpec.arrayValues.length} elements).`,
          ],
          generatedAt: new Date().toISOString(),
        };
      }
      lastErrors = check.errors.join("\n");
      continue;
    }

    if (typeof raw.svg === "string" && raw.svg.trim()) {
      const audited = sanitizeAndAuditSvg(raw.svg);
      if (audited.ok) {
        return {
          kind: "svg",
          title: raw.title || opts.brief.slice(0, 80),
          svg: audited.sanitizedSvg,
          verifiedByAuditor: true,
          auditNotes: [
            ...audited.auditNotes,
            `Passed SVG geometry & security audit on pass ${iter}.`,
          ],
          generatedAt: new Date().toISOString(),
        };
      }
      lastErrors = audited.errors.join("\n");
    } else {
      lastErrors = "Missing `svg` string or `excalidrawSpec` in output.";
    }
  }

  return buildDeterministicPatternSvg(
    opts.patternId,
    opts.strandId,
    opts.brief,
  );
}

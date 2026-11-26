import {
  resolveStrandTarget,
  stripModelValueDebris,
} from "./matcher";
import type {
  MissClass,
  PatternId,
  PatternQuestionCard,
  QuizOptionItem,
} from "./types";
import { MISS_CLASSES, PatternQuestionCardSchema } from "./types";

export { stripModelValueDebris };

function tryParseJsonString(raw: string): unknown {
  const trimmed = raw.trim();
  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed === "true" ||
    trimmed === "false" ||
    trimmed === "null" ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    /^-?\d+(?:\.\d+)?$/.test(trimmed)
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Ported & generalized from LearnHarness `healEncodedArguments` (`src/core/argument-heal.ts`):
 * recursively unwraps double-encoded booleans ("true"), numeric strings ("85"),
 * JSON-stringified arrays/objects ('{"time":"O(n)"}'), and nullable strings ("null").
 */
export function healEncodedFields<T = Record<string, unknown>>(
  raw: unknown,
  depth = 0,
): T | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (depth > 3) return raw as T;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") {
      const parsed = tryParseJsonString(v);
      if (parsed !== undefined) {
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          out[k] = healEncodedFields(parsed, depth + 1);
        } else {
          out[k] = parsed;
        }
        continue;
      }
      out[k] = v;
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = healEncodedFields(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

/**
 * Ported from LearnHarness (`parseOptionsIfString` / `healEncodedArguments`):
 * recovers arrays that models occasionally emit as JSON-encoded strings.
 */
export function healStringifiedArray<T = unknown>(raw: unknown): T[] | unknown {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[")) return raw;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return Array.isArray(parsed) ? (parsed as T[]) : raw;
  } catch {
    return raw;
  }
}

export function healMissClass(raw: unknown): MissClass | null {
  if (raw === null || raw === undefined) return null;
  const cleaned = stripModelValueDebris(raw).toLowerCase();
  if (!cleaned || cleaned === "null" || cleaned === "none") return null;
  if ((MISS_CLASSES as readonly string[]).includes(cleaned)) {
    return cleaned as MissClass;
  }
  if (cleaned.includes("complex") || cleaned.includes("optimi")) {
    return "complexity-suboptimal";
  }
  if (cleaned.includes("discriminat") || cleaned.includes("confus")) {
    return "discrimination";
  }
  if (cleaned.includes("invariant") || cleaned.includes("bound")) {
    return "invariant-break";
  }
  if (cleaned.includes("cue")) return "cue";
  if (cleaned.includes("execut") || cleaned.includes("syntax")) return "execution";
  if (cleaned.includes("careless") || cleaned.includes("typo")) return "careless";
  return "structural";
}

/**
 * Ported from LearnHarness `quizInputProblems` (`src/core/question-core.ts`):
 * validates option sanity, distinct keys, and guarantees `correctOptionValues`
 * strictly resolve against option `value` (or fallback `label`).
 */
export function validateAndHealQuestionCard(
  candidate: Record<string, unknown>,
  fallback: PatternQuestionCard,
): PatternQuestionCard {
  const preHealed = healEncodedFields(candidate) ?? candidate;
  const healed: Record<string, unknown> = { ...preHealed };

  if (typeof healed.strandId === "string") {
    const patternId =
      typeof healed.patternId === "string"
        ? (healed.patternId as PatternId)
        : fallback.patternId;
    const resolved = resolveStrandTarget(healed.strandId, patternId);
    if (resolved) healed.strandId = resolved.id;
  }

  if (healed.modality === "mcq") {
    const rawOpts = healStringifiedArray(healed.options);
    if (!Array.isArray(rawOpts) || rawOpts.length < 2) {
      return fallback;
    }

    const normalizedOpts: QuizOptionItem[] = [];
    const seenKeys = new Set<string>();
    const labelToValue = new Map<string, string>();

    rawOpts.forEach((opt, idx) => {
      if (typeof opt === "string") {
        const label = opt.trim();
        if (!label) return;
        const val = `opt_${idx + 1}`;
        if (!seenKeys.has(val)) {
          seenKeys.add(val);
          normalizedOpts.push({ value: val, label });
          labelToValue.set(label.toLowerCase(), val);
        }
        return;
      }
      if (opt && typeof opt === "object") {
        const o = opt as { value?: unknown; label?: unknown };
        const label = typeof o.label === "string" ? o.label.trim() : "";
        if (!label) return;
        let val = stripModelValueDebris(o.value) || `opt_${idx + 1}`;
        while (seenKeys.has(val)) {
          val = `${val}_${idx + 1}`;
        }
        seenKeys.add(val);
        normalizedOpts.push({ value: val, label });
        labelToValue.set(label.toLowerCase(), val);
      }
    });

    if (normalizedOpts.length < 2) {
      return fallback;
    }

    // Coerce correctOptionValues by exact value or matching label
    const rawRubric =
      healed.rubric && typeof healed.rubric === "object"
        ? ({ ...(healed.rubric as Record<string, unknown>) })
        : {};
    const rawCorrect = healStringifiedArray(rawRubric.correctOptionValues);
    const correctList: string[] = Array.isArray(rawCorrect)
      ? rawCorrect
          .map((c) => stripModelValueDebris(c))
          .map((c) => {
            if (seenKeys.has(c)) return c;
            const byLabel = labelToValue.get(c.toLowerCase());
            return byLabel ?? "";
          })
          .filter(Boolean)
      : [];

    const uniqueCorrect = Array.from(new Set(correctList));
    if (uniqueCorrect.length === 0) {
      // Unresolvable answer key -> fall back safely rather than posing an ungradeable MCQ
      return fallback;
    }

    healed.options = normalizedOpts;
    healed.multiSelect = uniqueCorrect.length > 1;
    rawRubric.correctOptionValues = uniqueCorrect;
    healed.rubric = rawRubric;
  }

  const parsed = PatternQuestionCardSchema.safeParse(healed);
  return parsed.success ? parsed.data : fallback;
}

/**
 * Heals double-encoded booleans, numbers, arrays, and nested objects inside
 * AI evaluation payloads before field consumption.
 */
export function healEvaluationPayload(
  raw: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!raw) return null;
  const healed = healEncodedFields(raw);
  if (!healed) return raw;
  if (typeof healed.hintRung === "string") {
    healed.hintRung = stripModelValueDebris(healed.hintRung).toUpperCase();
  }
  if (typeof healed.errorSignatureKey === "string") {
    healed.errorSignatureKey = stripModelValueDebris(healed.errorSignatureKey);
  }
  if (
    healed.twistedFollowUp &&
    typeof healed.twistedFollowUp === "object" &&
    typeof (healed.twistedFollowUp as Record<string, unknown>).operator === "string"
  ) {
    const tw = healed.twistedFollowUp as Record<string, unknown>;
    tw.operator = stripModelValueDebris(tw.operator);
  }
  return healed;
}

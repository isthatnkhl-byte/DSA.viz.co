import type {
  MissClass,
  PatternQuestionCard,
  QuizOptionItem,
} from "./types";
import { MISS_CLASSES, PatternQuestionCardSchema } from "./types";

/**
 * Ported from LearnHarness (`src/core/value-debris.ts` & `src/core/question-core.ts`):
 * strips model copy-syntax wobble (escaped quotes, wrapping backticks, leading colons)
 * without altering genuine identifiers.
 */
export function stripModelValueDebris(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  // Iteratively unwrap multi-layer model syntax debris ("\"`val`\"", trailing slashes, leading colon)
  for (let i = 0; i < 4; i++) {
    const prev = s;
    s = s.replace(/^\\+["']|["']\\+$/g, "").trim();
    if (
      (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) ||
      (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) ||
      (s.length >= 2 && s.startsWith("`") && s.endsWith("`"))
    ) {
      s = s.slice(1, -1).trim();
    }
    if (s.startsWith(":")) s = s.slice(1).trim();
    if (s === prev) break;
  }
  return s;
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
  const healed: Record<string, unknown> = { ...candidate };

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

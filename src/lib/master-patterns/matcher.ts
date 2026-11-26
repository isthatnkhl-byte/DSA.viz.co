import {
  ALL_STRANDS,
  PATTERN_CATALOG,
  PATTERN_MAP,
  STRAND_MAP,
} from "../../data/patterns";
import type { PatternDefinition, PatternId, PatternStrandDef } from "./types";

const STOPWORDS = new Set<string>([
  "the", "and", "for", "with", "that", "this", "when", "from", "your", "only",
  "have", "been", "will", "they", "into", "what", "just", "some", "does", "make",
  "makes", "than", "then", "also", "more", "most", "such", "each", "even", "here",
  "there", "where", "which", "while", "must", "need", "should", "could", "would",
  "about", "over", "under", "still", "because", "since", "very", "much", "any",
  "can", "not", "are", "was", "were", "use", "using", "used",
]);

/**
 * Strips multi-layer LLM copy-syntax debris (escaped quotes, wrapping backticks,
 * quotes, leading colons/dots, surrounding whitespace) without modifying inner text.
 */
export function stripModelValueDebris(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
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
    s = s.replace(/^[:.\s]+/, "").replace(/[:.\s]+$/, "");
    if (s === prev) break;
  }
  return s;
}

function lightStemToken(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith("ically")) return token.slice(0, -4);
  if (token.endsWith("ingly")) return token.slice(0, -5);
  if (token.length > 6 && token.endsWith("ity")) return token.slice(0, -3);
  if (token.endsWith("ment")) return token.slice(0, -4);
  if (token.endsWith("tion")) return token.slice(0, -3);
  if (token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ing")) return token.slice(0, -3);
  if (token.endsWith("ed")) return token.slice(0, -2);
  if (token.endsWith("ly")) return token.slice(0, -2);
  if (token.endsWith("es")) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

/**
 * Extracts normalized algorithmic domain tokens while stripping English filler
 * stopwords and preserving Big-O notations (e.g. "O(n log n)", "O(1)") and loops.
 */
export function normalizeTextTokens(text: string): string[] {
  const lower = text.toLowerCase();
  const rawTokens: string[] = [];

  const bigOMatches = lower.match(/o\([^)]+\)/g) ?? [];
  for (const m of bigOMatches) {
    rawTokens.push(m.replace(/\s+/g, ""));
  }

  const words = lower.split(/[^a-z0-9_+<>=-]+/);
  for (const w of words) {
    const clean = w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
    if (clean.length < 2) continue;
    if (STOPWORDS.has(clean)) continue;
    if (clean.length === 2 && !["dp", "pq", "id"].includes(clean)) {
      continue;
    }
    rawTokens.push(lightStemToken(clean));
  }

  return Array.from(new Set(rawTokens));
}

export function tokenJaccardSimilarity(a: string, b: string): number {
  const ta = normalizeTextTokens(a);
  const tb = normalizeTextTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Set(ta);
  const setB = new Set(tb);
  let intersect = 0;
  for (const t of setA) {
    if (setB.has(t)) intersect++;
  }
  const union = setA.size + setB.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/**
 * Core pre-lowercased fuzzy field scorer with per-field LAZY stem set initialization:
 * avoids regex tokenization & Set allocation on exact/prefix/substring hits.
 */
function scorePreparedFields(
  tokens: readonly string[],
  stemmedTokens: readonly string[],
  joined: string,
  hay: readonly string[],
  lazyStemSets: (Set<string> | undefined)[],
): number | null {
  if (tokens.length === 0) return 0;

  let total = 0;
  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti]!;
    let best = -1;
    for (let i = 0; i < hay.length; i++) {
      const f = hay[i]!;
      if (f === token) {
        best = 100;
        break;
      }
      if (f.startsWith(token)) {
        if (60 > best) best = 60;
      } else {
        const at = f.indexOf(token);
        if (at !== -1) {
          const subScore = 30 - Math.min(at, 27);
          if (subScore > best) best = subScore;
        }
      }
    }

    // Lazy stem-set fallback runs ONLY when substring scan found nothing for this token
    if (best < 0) {
      const stemmed = stemmedTokens[ti]!;
      if (stemmed.length >= 3) {
        for (let i = 0; i < hay.length; i++) {
          let stemSet = lazyStemSets[i];
          if (!stemSet) {
            stemSet = new Set(normalizeTextTokens(hay[i]!));
            lazyStemSets[i] = stemSet;
          }
          if (stemSet.has(stemmed)) {
            best = 22;
            break;
          }
        }
      }
    }

    if (best < 0) return null;
    total += best;
  }

  for (let i = 0; i < hay.length; i++) {
    if (hay[i]!.includes(joined)) {
      total += 50;
      break;
    }
  }
  return total;
}

/**
 * Multi-token fuzzy matcher inspired by LearnHarness `fuzzyScore` (`fuzzy.ts`):
 * rewards exact field match (100) > prefix (60) > early substring (30-depth) >
 * lazy stemmed overlap (+22) and whole-query contiguity (+50).
 */
export function fuzzyMatchScore(query: string, ...fields: string[]): number | null {
  const cleaned = stripModelValueDebris(query).toLowerCase();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const stemmedTokens = tokens.map(lightStemToken);
  const hay = fields.map((f) => f.toLowerCase());
  const lazyStems = new Array<Set<string> | undefined>(hay.length);
  return scorePreparedFields(tokens, stemmedTokens, tokens.join(" "), hay, lazyStems);
}

interface IndexedStrandEntry {
  pattern: PatternDefinition;
  strand: PatternStrandDef;
  idLower: string;
  slugLower: string;
  titleLower: string;
  problemSlugsLower: string[];
  searchFieldsLower: string[];
  /** Module-scoped lazy stem sets built on demand & cached across requests. */
  searchStemCache: (Set<string> | undefined)[];
}

const INDEXED_STRANDS: readonly IndexedStrandEntry[] = PATTERN_CATALOG.flatMap((p) => {
  const pTitleLower = p.title.toLowerCase();
  const problemSlugsLower = p.linkedProblemSlugs.map((slug) => slug.toLowerCase());
  return p.strands.map((s) => {
    const slugLower = (s.id.split(":")[1] ?? s.id).toLowerCase();
    const fields = [
      s.id.toLowerCase(),
      slugLower,
      s.title.toLowerCase(),
      pTitleLower,
      s.coreInvariant.toLowerCase(),
      s.commonTrap.toLowerCase(),
      ...problemSlugsLower,
    ];
    return {
      pattern: p,
      strand: s,
      idLower: s.id.toLowerCase(),
      slugLower,
      titleLower: s.title.toLowerCase(),
      problemSlugsLower,
      searchFieldsLower: fields,
      searchStemCache: new Array<Set<string> | undefined>(fields.length),
    };
  });
});

/**
 * Canonical strand target resolver (inspired by LearnHarness `resolveTargetId`):
 * strips model copy debris, checks exact strandId -> short slug -> title ->
 * pre-indexed fuzzy score with lazy stem fallback across strands.
 */
export function resolveStrandTarget(
  rawTarget: string,
  patternId?: PatternId,
): PatternStrandDef | null {
  const clean = stripModelValueDebris(rawTarget);
  if (!clean) return null;

  const exact = STRAND_MAP.get(clean);
  if (exact && (!patternId || exact.patternId === patternId)) {
    return exact;
  }

  const lower = clean.toLowerCase();
  const scopedEntries = patternId
    ? INDEXED_STRANDS.filter((e) => e.pattern.id === patternId)
    : INDEXED_STRANDS;

  for (const e of scopedEntries) {
    if (e.slugLower === lower || e.idLower === lower || e.titleLower === lower) {
      return e.strand;
    }
  }

  if (patternId) {
    if (exact) return exact;
    for (const e of INDEXED_STRANDS) {
      if (e.slugLower === lower || e.titleLower === lower) return e.strand;
    }
  }

  const tokens = lower.split(/\s+/).filter(Boolean);
  const stemmedTokens = tokens.map(lightStemToken);
  const joined = tokens.join(" ");

  let bestStrand: PatternStrandDef | null = null;
  let bestScore = -1;
  for (const e of scopedEntries) {
    const score = scorePreparedFields(
      tokens,
      stemmedTokens,
      joined,
      e.searchFieldsLower.slice(0, 6), // skip linkedProblemSlugs during target ID resolution
      e.searchStemCache,
    );
    if (score !== null && score > bestScore) {
      bestScore = score;
      bestStrand = e.strand;
    }
  }
  if (bestStrand) return bestStrand;

  if (patternId) {
    for (const e of INDEXED_STRANDS) {
      if (e.pattern.id === patternId) continue;
      const score = scorePreparedFields(
        tokens,
        stemmedTokens,
        joined,
        e.searchFieldsLower.slice(0, 5),
        e.searchStemCache,
      );
      if (score !== null && score > bestScore) {
        bestScore = score;
        bestStrand = e.strand;
      }
    }
  }
  return bestStrand;
}

export interface DagSearchMatch {
  strandId: string;
  patternId: PatternId;
  patternTitle: string;
  strandTitle: string;
  score: number;
  matchedVia: "exact_id" | "slug_or_problem" | "fuzzy_content";
  coreInvariant: string;
}

/**
 * Matches free-text DSA queries, problem slugs (e.g. "3sum", "trapping-rain-water"),
 * or noisy concepts across all 12 patterns and 49 strands using the pre-indexed cache.
 */
export function matchPatternAndStrands(
  query: string,
  limit = 8,
): DagSearchMatch[] {
  const clean = stripModelValueDebris(query);
  if (!clean) return [];
  const lower = clean.toLowerCase();
  const tokens = lower.split(/\s+/).filter(Boolean);
  const stemmedTokens = tokens.map(lightStemToken);
  const joined = tokens.join(" ");

  const matches: DagSearchMatch[] = [];
  for (const e of INDEXED_STRANDS) {
    if (e.idLower === lower) {
      matches.push({
        strandId: e.strand.id,
        patternId: e.pattern.id,
        patternTitle: e.pattern.title,
        strandTitle: e.strand.title,
        score: 500,
        matchedVia: "exact_id",
        coreInvariant: e.strand.coreInvariant,
      });
      continue;
    }

    const slugBoost = e.problemSlugsLower.some(
      (slug) => slug.includes(lower) || lower.includes(slug),
    )
      ? 75
      : 0;

    const rawFuzzy = scorePreparedFields(
      tokens,
      stemmedTokens,
      joined,
      e.searchFieldsLower,
      e.searchStemCache,
    );
    if (rawFuzzy === null && slugBoost === 0) continue;

    const total = (rawFuzzy ?? 0) + slugBoost + (e.slugLower === lower ? 90 : 0);
    matches.push({
      strandId: e.strand.id,
      patternId: e.pattern.id,
      patternTitle: e.pattern.title,
      strandTitle: e.strand.title,
      score: total,
      matchedVia: slugBoost > 0 || e.slugLower === lower ? "slug_or_problem" : "fuzzy_content",
      coreInvariant: e.strand.coreInvariant,
    });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
}

/**
 * Stopword-immune, stem-aware verbal reasoning scorer: avoids rewarding long
 * generic filler text while accurately detecting core invariants & Big-O bounds.
 */
export function scoreVerbalExplanation(
  verbal: string,
  rubricReasoning: string,
  keyInvariants: readonly string[] = [],
): number {
  const cleaned = verbal.trim();
  if (cleaned.length < 12) return 20;

  const verbalTokens = normalizeTextTokens(cleaned);
  if (verbalTokens.length < 2) return 24;

  const rubricTokens = new Set(normalizeTextTokens(rubricReasoning));
  const verbalSet = new Set(verbalTokens);

  let rubricMatches = 0;
  for (const t of verbalSet) {
    if (rubricTokens.has(t)) rubricMatches++;
  }

  let invariantHitRatio = 0;
  if (keyInvariants.length > 0) {
    let covered = 0;
    for (const inv of keyInvariants) {
      const invTokens = normalizeTextTokens(inv);
      if (invTokens.length === 0) continue;
      let hits = 0;
      for (const tok of invTokens) {
        if (verbalSet.has(tok)) hits++;
      }
      if (hits >= Math.max(1, Math.ceil(invTokens.length * 0.25))) {
        covered++;
      }
    }
    invariantHitRatio = covered / keyInvariants.length;
  }

  const recallRatio =
    rubricTokens.size > 0
      ? Math.min(1, rubricMatches / Math.max(2, Math.min(7, rubricTokens.size * 0.6)))
      : 0;
  const overlapScore = Math.round(recallRatio * 48);
  const invariantBonus = Math.round(invariantHitRatio * 24);
  const concisenessBonus =
    rubricMatches >= 1 ? Math.min(14, Math.floor(verbalTokens.length * 1.5)) : 0;

  return Math.max(
    15,
    Math.min(96, 15 + overlapScore + invariantBonus + concisenessBonus),
  );
}

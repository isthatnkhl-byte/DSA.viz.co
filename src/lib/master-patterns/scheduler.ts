import {
  ALL_STRANDS,
  ANCESTOR_STRANDS,
  PATTERN_CATALOG,
  STRAND_MAP,
  TOPOLOGICAL_STRAND_ORDER,
  TRANSITIVE_DOWNSTREAM_STRANDS,
  getPatternDefinition,
  getStrandDefinition,
} from "../../data/patterns";
import { tokenJaccardSimilarity } from "./matcher";
import {
  HINT_RUNGS,
  MAX_ERROR_SIGNATURES,
  MAX_GAP_NOTE_CHARS,
  MAX_RECENT_SESSIONS,
  MISS_CLASSES,
  TWIST_OPERATORS,
  type CognitiveProfile,
  type ConfidenceCalibrationVerdict,
  type ErrorSignature,
  type HintRung,
  type MissClass,
  type PatternId,
  type PatternSummaryRecord,
  type RecentSessionDigest,
  type StrandState,
  type TrackMode,
  type TwistOperator,
  type UserPatternProfile,
} from "./types";

const MS_PER_DAY = 86_400_000;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function truncateNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const trimmed = note.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_GAP_NOTE_CHARS);
}

function emptyMissHistogram(): Record<MissClass, number> {
  return {
    cue: 0,
    discrimination: 0,
    "invariant-break": 0,
    execution: 0,
    "complexity-suboptimal": 0,
    careless: 0,
    structural: 0,
  };
}

function defaultTwistResilience(): Record<TwistOperator, number> {
  return {
    "constraint-twist": 50,
    "reverse-premise": 50,
    "break-the-premise": 50,
    discrimination: 50,
  };
}

export function createEmptyCognitiveProfile(): CognitiveProfile {
  return {
    preferredLanguage: "cpp",
    dominantMissClass: null,
    missHistogram: emptyMissHistogram(),
    verbalToCodeGap: 0,
    twistResilience: defaultTwistResilience(),
    totalTwistsAttempted: 0,
    totalTwistsPassed: 0,
  };
}

export function createInitialStrandState(
  strandId: string,
  patternId: PatternId,
): StrandState {
  return {
    strandId,
    patternId,
    mastery: 0,
    stabilityDays: 1,
    attempts: 0,
    streak: 0,
    status: "untouched",
    calibrationBias: 0,
    lastMissClass: null,
    lastHintRung: null,
    gapNote: null,
    lastPracticedAt: null,
    nextReviewAt: null,
  };
}

export function createEmptyUserPatternProfile(
  userId: string,
  nowIso: string = new Date().toISOString(),
): UserPatternProfile {
  return {
    userId,
    version: 1,
    cognitiveProfile: createEmptyCognitiveProfile(),
    patternSummaries: {},
    strands: {},
    errorSignatures: [],
    recentSessions: [],
    updatedAt: nowIso,
  };
}

/**
 * Computes effective mastery applying gentle FSRS-inspired forgetting decay
 * once `nowMs` passes `nextReviewAt`. Never mutates persisted state.
 */
export function computeEffectiveStrandMastery(
  strand: StrandState | undefined,
  nowMs: number = Date.now(),
): number {
  if (!strand || strand.attempts === 0) return 0;
  if (!strand.nextReviewAt) return strand.mastery;

  const dueMs = Date.parse(strand.nextReviewAt);
  if (!Number.isFinite(dueMs) || nowMs <= dueMs) {
    return strand.mastery;
  }

  const overdueDays = (nowMs - dueMs) / MS_PER_DAY;
  const stability = Math.max(0.5, strand.stabilityDays);
  // Smooth exponential retention decay capped at 35% of stored mastery
  const retention = Math.exp(-overdueDays / (stability * 3));
  const floor = strand.mastery * 0.65;
  return Math.round(clamp(floor + (strand.mastery - floor) * retention, 0, 100));
}

export function isStrandDueForReview(
  strand: StrandState | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!strand || strand.attempts === 0) return false;
  if (strand.status === "gap") return true;
  if (!strand.nextReviewAt) return false;
  const dueMs = Date.parse(strand.nextReviewAt);
  return Number.isFinite(dueMs) && nowMs > dueMs;
}

export interface RecordErrorSignatureInput {
  signatureKey: string;
  patternId: PatternId;
  strandId: string;
  missClass: MissClass;
  summary: string;
}

/**
 * Deduplicates recurring misconception signatures — both exact key matches and
 * semantic paraphrases on the same (strandId, missClass) — and enforces an LRU
 * cap (`MAX_ERROR_SIGNATURES`) so per-user cloud memory stays O(1) bounded.
 */
export function recordErrorSignature(
  profile: UserPatternProfile,
  input: RecordErrorSignatureInput,
  nowIso: string = new Date().toISOString(),
): UserPatternProfile {
  const key = input.signatureKey.trim().slice(0, 120);
  const summary = truncateNote(input.summary) ?? "Misconception detected";
  let existingIdx = profile.errorSignatures.findIndex(
    (s) => s.signatureKey === key,
  );
  if (existingIdx < 0) {
    // Coalesce paraphrased active signatures only when BOTH keys share >= 2 domain
    // tokens (with matching numeric qualifiers, so sig_0 != sig_1) AND summaries align.
    const rawKeyNums = key.match(/\d+/g)?.join(",") ?? "";
    const keyTokens = key
      .toLowerCase()
      .split(/[:\-_/.\s]+/)
      .filter((w) => w.length >= 3);
    existingIdx = profile.errorSignatures.findIndex((s) => {
      if (s.status !== "active" || s.strandId !== input.strandId || s.missClass !== input.missClass) {
        return false;
      }
      const existingNums = s.signatureKey.match(/\d+/g)?.join(",") ?? "";
      if (rawKeyNums !== existingNums) return false;
      const existingKeyTokens = new Set(
        s.signatureKey.toLowerCase().split(/[:\-_/.\s]+/).filter((w) => w.length >= 3),
      );
      let sharedKeyTokens = 0;
      for (const t of keyTokens) {
        if (existingKeyTokens.has(t)) sharedKeyTokens++;
      }
      return (
        sharedKeyTokens >= 2 &&
        tokenJaccardSimilarity(s.signatureKey.replace(/[:\-_]+/g, " "), key.replace(/[:\-_]+/g, " ")) >= 0.45 &&
        tokenJaccardSimilarity(s.summary, summary) >= 0.4
      );
    });
  }

  const nextSignatures = [...profile.errorSignatures];
  if (existingIdx >= 0) {
    const prev = nextSignatures[existingIdx]!;
    nextSignatures[existingIdx] = {
      ...prev,
      missClass: input.missClass,
      summary: summary.length > prev.summary.length ? summary : prev.summary,
      recurrenceCount: prev.recurrenceCount + 1,
      status: "active",
      lastSeenAt: nowIso,
      repairedAt: null,
    };
  } else {
    nextSignatures.push({
      signatureKey: key,
      patternId: input.patternId,
      strandId: input.strandId,
      missClass: input.missClass,
      summary,
      recurrenceCount: 1,
      status: "active",
      lastSeenAt: nowIso,
      repairedAt: null,
    });
  }

  return {
    ...profile,
    errorSignatures: pruneErrorSignatures(nextSignatures),
    updatedAt: nowIso,
  };
}

export function markErrorSignatureRepaired(
  profile: UserPatternProfile,
  signatureKey: string,
  nowIso: string = new Date().toISOString(),
): UserPatternProfile {
  const next = profile.errorSignatures.map((sig) =>
    sig.signatureKey === signatureKey
      ? { ...sig, status: "repaired" as const, repairedAt: nowIso }
      : sig,
  );
  return {
    ...profile,
    errorSignatures: next,
    updatedAt: nowIso,
  };
}

function pruneErrorSignatures(signatures: ErrorSignature[]): ErrorSignature[] {
  if (signatures.length <= MAX_ERROR_SIGNATURES) return signatures;
  // Keep active high-recurrence items first; evict repaired/oldest first
  const sorted = [...signatures].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    if (a.recurrenceCount !== b.recurrenceCount) {
      return b.recurrenceCount - a.recurrenceCount;
    }
    return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
  });
  return sorted.slice(0, MAX_ERROR_SIGNATURES);
}

export interface StrandReviewUpdate {
  patternId: PatternId;
  strandId: string;
  score: number; // 0..100
  isCorrect: boolean;
  hiddenGapDetected: boolean;
  missClass: MissClass | null;
  hintRung: HintRung | null;
  gapNote?: string | null;
  errorSignatureKey?: string | null;
  twistOperator?: TwistOperator;
  verbalScore?: number; // 0..100
  codeScore?: number; // 0..100
  track?: TrackMode;
  confidence?: number | null;
  choseIdk?: boolean;
}

/**
 * Classifies learner self-confidence against accuracy & reasoning (LearnHarness
 * `25-confidence.md` doctrine): `choseIdk` carries no confidence ("honest_gap").
 */
export function classifyConfidenceCalibration(opts: {
  confidence?: number | null;
  choseIdk?: boolean;
  isCorrect: boolean;
  hiddenGapDetected: boolean;
  score: number;
}): ConfidenceCalibrationVerdict | undefined {
  if (opts.choseIdk) return "honest_gap";
  if (typeof opts.confidence !== "number" || !Number.isFinite(opts.confidence)) {
    return opts.hiddenGapDetected ? "overconfident" : undefined;
  }
  const conf = clamp(opts.confidence, 0, 100);
  if (opts.hiddenGapDetected) return "overconfident";
  if (conf >= 75 && (!opts.isCorrect || opts.score < 65)) {
    return "overconfident";
  }
  if (conf <= 35 && opts.isCorrect && opts.score >= 70) {
    return "underconfident";
  }
  return "well_calibrated";
}

function hintPenaltyFactor(rung: HintRung | null): number {
  if (!rung) return 1;
  const idx = HINT_RUNGS.indexOf(rung);
  // Strict progressive scaffold penalty: heavy hints severely limit mastery credit
  const table = [0.78, 0.55, 0.25, 0.08, 0.04, 0.02];
  return table[idx] ?? 1;
}

function explanationQualityFactor(
  verbalScore: number | undefined,
  hiddenGapDetected: boolean,
): { factor: number; invalid: boolean } {
  if (hiddenGapDetected) return { factor: 0, invalid: true };
  if (typeof verbalScore !== "number") return { factor: 0.78, invalid: false };
  if (verbalScore < 45) return { factor: 0, invalid: true };
  if (verbalScore < 65) return { factor: 0.42, invalid: false };
  if (verbalScore < 80) return { factor: 0.78, invalid: false };
  return {
    factor: 0.92 + ((clamp(verbalScore, 80, 100) - 80) / 20) * 0.18,
    invalid: false,
  };
}

function spacingConsistencyFactor(
  prevPracticedAt: string | null,
  attempts: number,
  nowMs: number,
): number {
  if (attempts === 0 || !prevPracticedAt) return 1;
  const prevMs = Date.parse(prevPracticedAt);
  if (!Number.isFinite(prevMs)) return 0.85;
  const elapsedHours = Math.max(0, (nowMs - prevMs) / 3_600_000);
  // Discourage same-sitting cramming; reward spaced retention across sessions/days
  if (elapsedHours < 1) return 0.8;
  if (elapsedHours < 18) return 0.96;
  return 1.22;
}

function computeDominantMissClass(
  histogram: Record<MissClass, number>,
): MissClass | null {
  let best: MissClass | null = null;
  let bestCount = 0;
  for (const cls of MISS_CLASSES) {
    const count = histogram[cls] ?? 0;
    if (count > bestCount) {
      bestCount = count;
      best = cls;
    }
  }
  return best;
}

/**
 * Updates a user's cognitive & strand mastery state after evaluating one answer,
 * propagating root-cause flags to weak upstream prerequisites in the static DAG.
 */
export function applyStrandReviewUpdate(
  profile: UserPatternProfile,
  update: StrandReviewUpdate,
  nowIso: string = new Date().toISOString(),
): UserPatternProfile {
  const nowMs = Date.parse(nowIso) || Date.now();
  const strandDef = getStrandDefinition(update.strandId);
  const patternId = strandDef?.patternId ?? update.patternId;

  const prevStrand =
    profile.strands[update.strandId] ??
    createInitialStrandState(update.strandId, patternId);

  const effectivePrev = computeEffectiveStrandMastery(prevStrand, nowMs);
  const adjustedScore = clamp(
    Math.round(update.score * hintPenaltyFactor(update.hintRung)),
    0,
    100,
  );
  const explanation = explanationQualityFactor(
    update.verbalScore,
    update.hiddenGapDetected,
  );
  const codeWeak =
    typeof update.codeScore === "number" && update.codeScore < 65;

  const cleanSuccess =
    !update.choseIdk &&
    update.isCorrect &&
    !update.hiddenGapDetected &&
    !explanation.invalid &&
    !codeWeak &&
    (!update.hintRung || update.hintRung === "R0" || update.hintRung === "R1") &&
    adjustedScore >= 70;

  const confVerdict = classifyConfidenceCalibration({
    confidence: update.confidence,
    choseIdk: update.choseIdk,
    isCorrect: update.isCorrect,
    hiddenGapDetected: update.hiddenGapDetected,
    score: update.score,
  });

  const activeStrandSigCount = profile.errorSignatures.filter(
    (s) => s.strandId === update.strandId && s.status === "active",
  ).length;
  const rawConf =
    update.choseIdk || typeof update.confidence !== "number"
      ? null
      : clamp(update.confidence, 0, 100);

  let nextMastery = effectivePrev;
  if (cleanSuccess) {
    // Strict asymptotic gain: 10-20h of multi-session perfectioning, no 1-shot mastery
    let confidenceGainFactor = 0.68;
    if (confVerdict === "underconfident") {
      confidenceGainFactor = 0.46;
    } else if (rawConf !== null && rawConf >= 65) {
      const hollowCertainty =
        (typeof update.verbalScore === "number" && update.verbalScore < 70) ||
        update.hintRung === "R1" ||
        update.score < 80;
      confidenceGainFactor = hollowCertainty
        ? 0.45
        : 0.86 + ((rawConf - 65) / 35) * 0.28;
    }

    const hintGainFactor = hintPenaltyFactor(update.hintRung);
    const trackFactor = update.track === "pro" ? 1.15 : 0.92;
    const codeFactor =
      typeof update.codeScore === "number" && update.codeScore >= 90 ? 1.12 : 1;
    const twistFactor = update.twistOperator ? 1.24 : 1;
    const spacingFactor = spacingConsistencyFactor(
      prevStrand.lastPracticedAt,
      prevStrand.attempts,
      nowMs,
    );
    const activeSigThrottle = Math.pow(
      0.72,
      Math.min(3, activeStrandSigCount),
    );

    const compositeQuality = clamp(
      (clamp(update.score, 0, 100) / 100) *
        confidenceGainFactor *
        explanation.factor *
        hintGainFactor *
        trackFactor *
        codeFactor *
        twistFactor *
        spacingFactor *
        activeSigThrottle,
      0.04,
      1.45,
    );

    const headroom = Math.max(0, 100 - effectivePrev);
    const stepRatio = clamp(0.14 * compositeQuality, 0.015, 0.21);
    const rawDelta = Math.max(1, Math.round(headroom * stepRatio));
    nextMastery = Math.round(clamp(effectivePrev + rawDelta, 0, 100));

    if (update.hintRung === "R1") {
      nextMastery = Math.min(nextMastery, Math.max(effectivePrev, 78));
    }
  } else {
    // Asymmetric strict penalty on misses, hollow guesses, heavy hints, or weak complexity
    const confPenaltyMul = update.choseIdk
      ? 0.5
      : rawConf !== null && rawConf >= 90
        ? 1.65
        : rawConf !== null && rawConf >= 75
          ? 1.4
          : rawConf !== null && rawConf >= 45
            ? 1.12
            : 0.95;

    if (update.choseIdk) {
      const honestDrop = Math.max(4, Math.round(effectivePrev * 0.1));
      nextMastery = Math.round(clamp(effectivePrev - honestDrop, 0, 100));
    } else if (
      update.isCorrect &&
      (update.hiddenGapDetected || explanation.invalid)
    ) {
      // Right option/code but invalid/hollow explanation -> sharp anti-guess penalty
      const hollowDrop = Math.round(
        Math.max(10, effectivePrev * 0.24) * (confPenaltyMul > 1.2 ? 1.35 : 1),
      );
      nextMastery = Math.round(
        clamp(Math.min(55, effectivePrev - hollowDrop), 0, 55),
      );
    } else if (!update.isCorrect || update.score < 70) {
      const sevMul =
        update.missClass === "invariant-break" ||
        update.missClass === "structural" ||
        Boolean(update.twistOperator)
          ? 1.18
          : 1;
      const missDrop = Math.round(
        (14 + (100 - clamp(update.score, 0, 100)) * 0.18 + effectivePrev * 0.14) *
          confPenaltyMul *
          sevMul,
      );
      nextMastery = Math.round(clamp(effectivePrev - missDrop, 0, 100));
      if (
        update.missClass === "invariant-break" ||
        update.missClass === "structural"
      ) {
        nextMastery = Math.min(nextMastery, 58);
      }
    } else {
      // Heavy hint R2+ or weak complexity -> no upward mastery progression + ceiling cap
      const cap =
        update.hintRung === "R2"
          ? 70
          : update.hintRung
            ? 55
            : codeWeak
              ? 60
              : 74;
      nextMastery = Math.round(clamp(Math.min(effectivePrev, cap), 0, 100));
    }
  }

  const nextStreak = cleanSuccess ? prevStrand.streak + 1 : 0;
  const nextCleanPasses = cleanSuccess
    ? (prevStrand.cleanPasses ?? prevStrand.streak) + 1
    : 0;

  let nextStability = prevStrand.stabilityDays;
  if (cleanSuccess) {
    const twistBoost = update.twistOperator ? 1.45 : 1.15;
    const confidenceMul = confVerdict === "underconfident" ? 0.85 : 1;
    nextStability = clamp(
      prevStrand.stabilityDays *
        (1.55 + Math.min(nextStreak, 4) * 0.22) *
        twistBoost *
        confidenceMul,
      1,
      365,
    );
  } else {
    const missDampen =
      confVerdict === "overconfident"
        ? 0.3
        : update.choseIdk
          ? 0.65
          : 0.42;
    nextStability = clamp(prevStrand.stabilityDays * missDampen, 0.5, 30);
  }

  // Calibration bias: positive = overconfident; negative = hesitant/underconfident
  let nextCalibration = prevStrand.calibrationBias;
  if (confVerdict === "overconfident" || update.hiddenGapDetected) {
    const penalty =
      typeof update.confidence === "number" && update.confidence >= 80 ? 32 : 25;
    nextCalibration = clamp(nextCalibration + penalty, -100, 100);
  } else if (confVerdict === "underconfident") {
    nextCalibration = clamp(nextCalibration - 15, -100, 100);
  } else if (cleanSuccess) {
    nextCalibration = Math.round(nextCalibration * 0.6);
  } else if (confVerdict === "honest_gap") {
    // Honest "I don't know" gently reduces prior overconfidence rather than penalizing calibration
    nextCalibration = Math.round(nextCalibration * 0.85);
  } else if (update.score < 50 && !update.hiddenGapDetected) {
    nextCalibration = clamp(nextCalibration - 10, -100, 100);
  }

  const twistRepairedThisTurn = Boolean(cleanSuccess && update.twistOperator);
  const unresolvedAfterTurn = twistRepairedThisTurn ? 0 : activeStrandSigCount;
  const eligibleForMastered =
    cleanSuccess &&
    !explanation.invalid &&
    (!update.hintRung || update.hintRung === "R0") &&
    nextMastery >= 80 &&
    nextStreak >= 3 &&
    nextCleanPasses >= 3 &&
    Math.abs(nextCalibration) <= 20 &&
    unresolvedAfterTurn === 0;

  let nextStatus = prevStrand.status;
  if (
    !update.isCorrect ||
    update.hiddenGapDetected ||
    explanation.invalid ||
    codeWeak ||
    update.choseIdk ||
    update.missClass !== null
  ) {
    nextStatus = "gap";
  } else if (eligibleForMastered) {
    nextStatus = "mastered";
  } else if (cleanSuccess) {
    nextStatus = "remediated";
  } else if (prevStrand.status === "mastered") {
    nextStatus = "remediated";
  } else if (prevStrand.status === "untouched") {
    nextStatus = "remediated";
  }

  const nextReviewMs = nowMs + nextStability * MS_PER_DAY;
  const nextStrands: Record<string, StrandState> = {
    ...profile.strands,
    [update.strandId]: {
      strandId: update.strandId,
      patternId,
      mastery: nextMastery,
      stabilityDays: Number(nextStability.toFixed(2)),
      attempts: prevStrand.attempts + 1,
      streak: nextStreak,
      cleanPasses: nextCleanPasses,
      lastConfidence: rawConf,
      status: nextStatus,
      calibrationBias: nextCalibration,
      lastMissClass: update.missClass ?? (cleanSuccess ? null : prevStrand.lastMissClass),
      lastHintRung: update.hintRung,
      gapNote: cleanSuccess
        ? null
        : truncateNote(update.gapNote) ?? prevStrand.gapNote,
      lastPracticedAt: nowIso,
      nextReviewAt: new Date(nextReviewMs).toISOString(),
    },
  };

  // Transitive DAG root-cause propagation: if this strand failed, walk upstream
  // prerequisites across up to 4 hops so weak roots become immediately due.
  if (!cleanSuccess && strandDef) {
    const ancestors = ANCESTOR_STRANDS.get(update.strandId) ?? [];
    for (const prereqId of ancestors.slice(0, 6)) {
      const existingPrereq = nextStrands[prereqId];
      if (existingPrereq && existingPrereq.mastery < 78) {
        nextStrands[prereqId] = {
          ...existingPrereq,
          nextReviewAt: nowIso,
        };
      }
    }
  }

  // Update cognitive profile
  const nextHist = { ...profile.cognitiveProfile.missHistogram };
  if (update.missClass) {
    nextHist[update.missClass] = (nextHist[update.missClass] ?? 0) + 1;
  }

  let nextVerbalToCodeGap = profile.cognitiveProfile.verbalToCodeGap;
  if (
    typeof update.verbalScore === "number" &&
    typeof update.codeScore === "number"
  ) {
    const sampleGap = clamp(update.verbalScore - update.codeScore, -100, 100);
    nextVerbalToCodeGap = Math.round(nextVerbalToCodeGap * 0.6 + sampleGap * 0.4);
  }

  const nextTwistResilience = { ...profile.cognitiveProfile.twistResilience };
  let totalTwistsAttempted = profile.cognitiveProfile.totalTwistsAttempted;
  let totalTwistsPassed = profile.cognitiveProfile.totalTwistsPassed;
  if (update.twistOperator) {
    totalTwistsAttempted += 1;
    if (cleanSuccess) totalTwistsPassed += 1;
    const prevOpScore = nextTwistResilience[update.twistOperator] ?? 50;
    const outcomeVal = cleanSuccess ? 100 : update.score;
    nextTwistResilience[update.twistOperator] = Math.round(
      prevOpScore * 0.65 + outcomeVal * 0.35,
    );
  }

  let updatedProfile: UserPatternProfile = {
    ...profile,
    strands: nextStrands,
    cognitiveProfile: {
      ...profile.cognitiveProfile,
      missHistogram: nextHist,
      dominantMissClass: computeDominantMissClass(nextHist),
      verbalToCodeGap: nextVerbalToCodeGap,
      twistResilience: nextTwistResilience,
      totalTwistsAttempted,
      totalTwistsPassed,
    },
    updatedAt: nowIso,
  };

  if (!cleanSuccess && update.missClass) {
    const sigKey =
      update.errorSignatureKey ||
      `${patternId}::${update.strandId.split(":")[1] ?? update.strandId}::${update.missClass}`;
    updatedProfile = recordErrorSignature(
      updatedProfile,
      {
        signatureKey: sigKey,
        patternId,
        strandId: update.strandId,
        missClass: update.missClass,
        summary:
          update.gapNote ||
          `${strandDef?.title ?? update.strandId}: ${update.missClass}`,
      },
      nowIso,
    );
  } else if (cleanSuccess && update.twistOperator) {
    // Passing a twisted follow-up repairs active signatures on this strand
    const activeOnStrand = updatedProfile.errorSignatures.filter(
      (s) => s.strandId === update.strandId && s.status === "active",
    );
    for (const sig of activeOnStrand) {
      updatedProfile = markErrorSignatureRepaired(
        updatedProfile,
        sig.signatureKey,
        nowIso,
      );
    }
  }

  return enforceProfileBounds(updatedProfile);
}

export interface RankedStrandCandidate {
  strandId: string;
  priority: number;
  effectiveMastery: number;
  reasons: string[];
}

export interface RankStrandsOptions {
  excludeStrandIds?: readonly string[];
  lastAskedStrandId?: string | null;
  nowMs?: number;
}

/**
 * Pure topological + cognitive priority scheduler (adapted from LearnHarness
 * Practice §IV): prioritizes active gaps, overdue reviews, blocked/weak
 * foundations, and transitive downstream leverage while interleaving away
 * from the just-asked strand.
 */
export function rankStrandsForPattern(
  patternId: PatternId,
  profile: UserPatternProfile,
  options: RankStrandsOptions = {},
): RankedStrandCandidate[] {
  const pattern = getPatternDefinition(patternId);
  if (!pattern) return [];

  const nowMs = options.nowMs ?? Date.now();
  const excluded = new Set(options.excludeStrandIds ?? []);
  const activeSigCounts = new Map<string, number>();
  for (const sig of profile.errorSignatures) {
    if (sig.status === "active") {
      activeSigCounts.set(
        sig.strandId,
        (activeSigCounts.get(sig.strandId) ?? 0) + sig.recurrenceCount,
      );
    }
  }

  const ranked: RankedStrandCandidate[] = [];
  for (const strandDef of pattern.strands) {
    if (excluded.has(strandDef.id)) continue;

    const state = profile.strands[strandDef.id];
    const effective = computeEffectiveStrandMastery(state, nowMs);
    const reasons: string[] = [];

    let priority = (100 - effective) * 0.6;
    priority += strandDef.fanoutWeight * 10;

    if (!state || state.attempts === 0) {
      priority += 18;
      reasons.push("untested");
      if (strandDef.prerequisiteStrandIds.length === 0) {
        priority += 10;
        reasons.push("foundation_root");
      }
    }
    if (state?.status === "gap") {
      priority += 32;
      reasons.push("active_gap");
    }
    if (isStrandDueForReview(state, nowMs)) {
      priority += 20;
      reasons.push("due_for_review");
    }
    if ((state?.calibrationBias ?? 0) >= 20) {
      priority += 15;
      reasons.push("overconfident_calibration");
    }

    const activeRecurrence = activeSigCounts.get(strandDef.id) ?? 0;
    if (activeRecurrence > 0) {
      priority += Math.min(30, activeRecurrence * 12);
      reasons.push("recurring_misconception");
    }

    // Topological readiness: avoid jumping to an untouched strand before its
    // internal same-pattern prerequisites reach passing competency.
    let unmetInternalPrereqs = 0;
    for (const prereqId of strandDef.prerequisiteStrandIds) {
      if (excluded.has(prereqId)) continue;
      const prereqDef = STRAND_MAP.get(prereqId);
      if (!prereqDef || prereqDef.patternId !== patternId) continue;
      const prereqState = profile.strands[prereqId];
      const prereqMastery = computeEffectiveStrandMastery(prereqState, nowMs);
      if (prereqMastery < 70 || prereqState?.status === "gap") {
        unmetInternalPrereqs += 1;
      }
    }
    if (unmetInternalPrereqs > 0 && (!state || state.attempts === 0)) {
      priority -= unmetInternalPrereqs * 16;
      reasons.push("prereq_blocked");
    }

    // Transitive downstream fanout bonus in static DAG
    const transitiveDownstream =
      TRANSITIVE_DOWNSTREAM_STRANDS.get(strandDef.id)?.length ?? 0;
    if (transitiveDownstream > 0 && effective < 75) {
      priority += Math.min(24, transitiveDownstream * 4);
      reasons.push("blocks_downstream");
    }

    // Interleaving penalty: avoid repeating the same strand back-to-back unless it's the only candidate
    if (options.lastAskedStrandId === strandDef.id) {
      priority -= 40;
    }

    ranked.push({
      strandId: strandDef.id,
      priority: Number(priority.toFixed(2)),
      effectiveMastery: effective,
      reasons,
    });
  }

  return ranked.sort((a, b) => b.priority - a.priority);
}

export type DagReadinessStatus =
  | "mastered"
  | "remediated"
  | "gap"
  | "due"
  | "ready"
  | "blocked";

export interface GlobalDagStrandNode {
  strandId: string;
  patternId: PatternId;
  title: string;
  effectiveMastery: number;
  readiness: DagReadinessStatus;
  blockedBy: string[];
  downstreamImpact: number;
}

/**
 * Projects the user's O(1) cognitive profile onto all 49 strands in topological
 * DAG order, surfacing ready frontier nodes and unresolved upstream blockers.
 */
export function computeGlobalDagFrontier(
  profile: UserPatternProfile,
  nowMs: number = Date.now(),
): {
  summary: {
    mastered: number;
    remediated: number;
    gap: number;
    due: number;
    ready: number;
    blocked: number;
  };
  recommendedNext: GlobalDagStrandNode[];
  nodes: GlobalDagStrandNode[];
} {
  const summary = {
    mastered: 0,
    remediated: 0,
    gap: 0,
    due: 0,
    ready: 0,
    blocked: 0,
  };
  const nodes: GlobalDagStrandNode[] = [];

  for (const strandId of TOPOLOGICAL_STRAND_ORDER) {
    const def = STRAND_MAP.get(strandId);
    if (!def) continue;
    const state = profile.strands[strandId];
    const effective = computeEffectiveStrandMastery(state, nowMs);

    const blockedBy: string[] = [];
    for (const prereqId of def.prerequisiteStrandIds) {
      const pState = profile.strands[prereqId];
      const pEff = computeEffectiveStrandMastery(pState, nowMs);
      if (pEff < 65 || pState?.status === "gap") {
        blockedBy.push(prereqId);
      }
    }

    let readiness: DagReadinessStatus;
    if (state?.status === "gap") {
      readiness = "gap";
    } else if (isStrandDueForReview(state, nowMs)) {
      readiness = "due";
    } else if (state?.status === "mastered" && effective >= 80) {
      readiness = "mastered";
    } else if (state && state.attempts > 0 && effective >= 65) {
      readiness = "remediated";
    } else if (blockedBy.length > 0) {
      readiness = "blocked";
    } else {
      readiness = "ready";
    }

    summary[readiness] += 1;
    nodes.push({
      strandId,
      patternId: def.patternId,
      title: def.title,
      effectiveMastery: effective,
      readiness,
      blockedBy,
      downstreamImpact:
        TRANSITIVE_DOWNSTREAM_STRANDS.get(strandId)?.length ?? 0,
    });
  }

  const urgencyWeight: Record<DagReadinessStatus, number> = {
    gap: 500,
    due: 400,
    ready: 300,
    remediated: 150,
    blocked: 50,
    mastered: 0,
  };

  const recommendedNext = [...nodes]
    .filter((n) => n.readiness !== "mastered")
    .sort((a, b) => {
      const scoreA =
        urgencyWeight[a.readiness] + a.downstreamImpact * 12 + (100 - a.effectiveMastery);
      const scoreB =
        urgencyWeight[b.readiness] + b.downstreamImpact * 12 + (100 - b.effectiveMastery);
      return scoreB - scoreA;
    })
    .slice(0, 8);

  return { summary, recommendedNext, nodes };
}

/**
 * Returns prerequisite strand IDs (cross-pattern or internal) that the learner
 * has already proven mastery over (>= 80 effective mastery), so Intermediate
 * notes can compress them into a 1-line recap (LearnHarness Minimal Tree rule).
 */
export function pruneKnownPrereqStrands(
  patternId: PatternId,
  profile: UserPatternProfile,
  nowMs: number = Date.now(),
): string[] {
  const pattern = getPatternDefinition(patternId);
  if (!pattern) return [];
  const pruned: string[] = [];
  for (const strand of pattern.strands) {
    for (const prereqId of strand.prerequisiteStrandIds) {
      const st = profile.strands[prereqId];
      if (computeEffectiveStrandMastery(st, nowMs) >= 80 && st?.status === "mastered") {
        if (!pruned.includes(prereqId)) pruned.push(prereqId);
      }
    }
    const selfState = profile.strands[strand.id];
    if (
      computeEffectiveStrandMastery(selfState, nowMs) >= 85 &&
      selfState?.status === "mastered"
    ) {
      if (!pruned.includes(strand.id)) pruned.push(strand.id);
    }
  }
  return pruned;
}

export function getDueReviewStrands(
  profile: UserPatternProfile,
  nowMs: number = Date.now(),
): Array<{ patternId: PatternId; strandId: string; effectiveMastery: number }> {
  const due: Array<{ patternId: PatternId; strandId: string; effectiveMastery: number }> = [];
  for (const strandDef of ALL_STRANDS) {
    const state = profile.strands[strandDef.id];
    if (isStrandDueForReview(state, nowMs)) {
      due.push({
        patternId: strandDef.patternId,
        strandId: strandDef.id,
        effectiveMastery: computeEffectiveStrandMastery(state, nowMs),
      });
    }
  }
  return due.sort((a, b) => a.effectiveMastery - b.effectiveMastery);
}

export function computePatternAggregateMetrics(
  patternId: PatternId,
  profile: UserPatternProfile,
  nowMs: number = Date.now(),
): {
  masteryPercent: number;
  masteredStrands: number;
  totalStrands: number;
  activeGaps: number;
  dueStrands: number;
} {
  const pattern = getPatternDefinition(patternId);
  if (!pattern) {
    return {
      masteryPercent: 0,
      masteredStrands: 0,
      totalStrands: 0,
      activeGaps: 0,
      dueStrands: 0,
    };
  }
  let sum = 0;
  let masteredStrands = 0;
  let activeGaps = 0;
  let dueStrands = 0;
  let sumPosBias = 0;
  let attemptedStrands = 0;

  for (const s of pattern.strands) {
    const st = profile.strands[s.id];
    if (st && st.attempts > 0) attemptedStrands++;
    const eff = computeEffectiveStrandMastery(st, nowMs);
    const due = isStrandDueForReview(st, nowMs);
    sum += eff;
    if (st?.status === "mastered" && eff >= 80 && !due) masteredStrands++;
    if (st?.status === "gap") activeGaps++;
    if (due) dueStrands++;
    if (st && st.calibrationBias > 0) sumPosBias += st.calibrationBias;
  }

  const totalStrands = pattern.strands.length;
  if (totalStrands === 0 || attemptedStrands === 0) {
    return {
      masteryPercent: 0,
      masteredStrands,
      totalStrands,
      activeGaps,
      dueStrands,
    };
  }

  const activePatternSigs = profile.errorSignatures.filter(
    (sig) => sig.patternId === patternId && sig.status === "active",
  ).length;
  const rawAvg = sum / totalStrands;
  const avgPosBias = sumPosBias / totalStrands;
  const penalties =
    activeGaps * 8 +
    activePatternSigs * 6 +
    dueStrands * 4 +
    Math.min(12, Math.round(avgPosBias * 0.25));

  let masteryPercent = Math.round(clamp(rawAvg - penalties, 0, 100));
  if (activeGaps > 0 || activePatternSigs > 0) {
    masteryPercent = Math.min(masteryPercent, 75);
  } else if (masteredStrands < totalStrands) {
    masteryPercent = Math.min(masteryPercent, 92);
  }

  return {
    masteryPercent,
    masteredStrands,
    totalStrands,
    activeGaps,
    dueStrands,
  };
}

export function recordCompletedSessionDigest(
  profile: UserPatternProfile,
  digest: RecentSessionDigest,
  optimizationScore: number | null,
  strictCompletenessScore?: number,
): UserPatternProfile {
  const prevSummary: PatternSummaryRecord = profile.patternSummaries[
    digest.patternId
  ] ?? {
    patternId: digest.patternId,
    lastTrack: null,
    completenessScore: 0,
    optimizationScore: 0,
    sessionsCompleted: 0,
    lastPracticedAt: null,
  };

  const agg = computePatternAggregateMetrics(digest.patternId, profile);
  const nextCompleteness =
    typeof strictCompletenessScore === "number"
      ? clamp(Math.round(strictCompletenessScore), 0, 100)
      : agg.masteryPercent > 0
        ? agg.masteryPercent
        : digest.overallScore;

  const nextSummary: PatternSummaryRecord = {
    patternId: digest.patternId,
    lastTrack: digest.track,
    completenessScore: nextCompleteness,
    optimizationScore:
      optimizationScore !== null
        ? optimizationScore
        : prevSummary.optimizationScore,
    sessionsCompleted: prevSummary.sessionsCompleted + 1,
    lastPracticedAt: digest.completedAt,
  };

  const filteredSessions = profile.recentSessions.filter(
    (s) => s.sessionId !== digest.sessionId,
  );
  const nextRecent = [digest, ...filteredSessions].slice(0, MAX_RECENT_SESSIONS);

  return enforceProfileBounds({
    ...profile,
    patternSummaries: {
      ...profile.patternSummaries,
      [digest.patternId]: nextSummary,
    },
    recentSessions: nextRecent,
    updatedAt: digest.completedAt,
  });
}

/**
 * Enforces strict O(1) size bounds on a UserPatternProfile before persisting to
 * Cloud Firestore: only canonical strand IDs, capped error signatures, capped
 * recent session digests, and bounded note strings.
 */
export function enforceProfileBounds(
  profile: UserPatternProfile,
): UserPatternProfile {
  const validStrands: Record<string, StrandState> = {};
  for (const [strandId, st] of Object.entries(profile.strands)) {
    if (!STRAND_MAP.has(strandId)) continue;
    validStrands[strandId] = {
      ...st,
      mastery: clamp(Math.round(st.mastery), 0, 100),
      stabilityDays: clamp(st.stabilityDays, 0.25, 365),
      calibrationBias: clamp(Math.round(st.calibrationBias), -100, 100),
      gapNote: truncateNote(st.gapNote),
    };
  }

  const validSummaries: Record<string, PatternSummaryRecord> = {};
  for (const p of PATTERN_CATALOG) {
    const rec = profile.patternSummaries[p.id];
    if (rec) {
      validSummaries[p.id] = {
        ...rec,
        completenessScore: clamp(Math.round(rec.completenessScore), 0, 100),
        optimizationScore: clamp(Math.round(rec.optimizationScore), 0, 100),
      };
    }
  }

  const boundedSigs = pruneErrorSignatures(
    profile.errorSignatures
      .filter((s) => STRAND_MAP.has(s.strandId))
      .map((s) => ({
        ...s,
        signatureKey: s.signatureKey.slice(0, 120),
        summary: truncateNote(s.summary) ?? "Misconception",
      })),
  );

  const boundedResilience = { ...defaultTwistResilience() };
  for (const op of TWIST_OPERATORS) {
    const v = profile.cognitiveProfile.twistResilience[op];
    if (typeof v === "number") {
      boundedResilience[op] = clamp(Math.round(v), 0, 100);
    }
  }

  return {
    ...profile,
    cognitiveProfile: {
      ...profile.cognitiveProfile,
      verbalToCodeGap: clamp(
        Math.round(profile.cognitiveProfile.verbalToCodeGap),
        -100,
        100,
      ),
      twistResilience: boundedResilience,
    },
    patternSummaries: validSummaries,
    strands: validStrands,
    errorSignatures: boundedSigs,
    recentSessions: profile.recentSessions.slice(0, MAX_RECENT_SESSIONS),
  };
}

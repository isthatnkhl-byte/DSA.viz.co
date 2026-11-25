import {
  ALL_STRANDS,
  DOWNSTREAM_STRANDS,
  PATTERN_CATALOG,
  STRAND_MAP,
  getPatternDefinition,
  getStrandDefinition,
} from "../../data/patterns";
import {
  HINT_RUNGS,
  MAX_ERROR_SIGNATURES,
  MAX_GAP_NOTE_CHARS,
  MAX_RECENT_SESSIONS,
  MISS_CLASSES,
  TWIST_OPERATORS,
  type CognitiveProfile,
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
 * Deduplicates recurring misconception signatures and enforces an LRU cap
 * (`MAX_ERROR_SIGNATURES`) so per-user cloud memory stays O(1) bounded.
 */
export function recordErrorSignature(
  profile: UserPatternProfile,
  input: RecordErrorSignatureInput,
  nowIso: string = new Date().toISOString(),
): UserPatternProfile {
  const key = input.signatureKey.trim().slice(0, 120);
  const summary = truncateNote(input.summary) ?? "Misconception detected";
  const existingIdx = profile.errorSignatures.findIndex(
    (s) => s.signatureKey === key,
  );

  const nextSignatures = [...profile.errorSignatures];
  if (existingIdx >= 0) {
    const prev = nextSignatures[existingIdx]!;
    nextSignatures[existingIdx] = {
      ...prev,
      missClass: input.missClass,
      summary,
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
}

function hintPenaltyFactor(rung: HintRung | null): number {
  if (!rung) return 1;
  const idx = HINT_RUNGS.indexOf(rung);
  // R0-R1 minimal penalty; R3-R5 means retrieval failed and needed scaffolding
  const table = [0.96, 0.9, 0.8, 0.65, 0.5, 0.35];
  return table[idx] ?? 1;
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
  const cleanSuccess =
    update.isCorrect &&
    !update.hiddenGapDetected &&
    (!update.hintRung || update.hintRung === "R0" || update.hintRung === "R1") &&
    adjustedScore >= 75;

  // Exponential moving blend favoring newer performance once attempts grow
  const blendWeight = prevStrand.attempts === 0 ? 1 : 0.45;
  let nextMastery = Math.round(
    clamp(
      effectivePrev * (1 - blendWeight) + adjustedScore * blendWeight,
      0,
      100,
    ),
  );
  if (!cleanSuccess && update.hiddenGapDetected) {
    nextMastery = Math.min(nextMastery, 68);
  }

  const nextStreak = cleanSuccess ? prevStrand.streak + 1 : 0;
  let nextStability = prevStrand.stabilityDays;
  if (cleanSuccess) {
    const twistBoost = update.twistOperator ? 1.45 : 1.15;
    nextStability = clamp(
      prevStrand.stabilityDays * (1.6 + Math.min(nextStreak, 4) * 0.25) * twistBoost,
      1,
      365,
    );
  } else {
    nextStability = clamp(prevStrand.stabilityDays * 0.45, 0.5, 30);
  }

  let nextStatus = prevStrand.status;
  if (!cleanSuccess || update.missClass !== null) {
    nextStatus = "gap";
  } else if (prevStrand.status === "gap" && update.twistOperator) {
    nextStatus = nextMastery >= 82 ? "mastered" : "remediated";
  } else if (nextMastery >= 80 && nextStreak >= 1) {
    nextStatus = "mastered";
  } else if (prevStrand.status === "untouched") {
    nextStatus = nextMastery >= 70 ? "remediated" : "gap";
  }

  // Calibration bias: positive = overconfident (right selection/code, broken verbal/big-O)
  let nextCalibration = prevStrand.calibrationBias;
  if (update.hiddenGapDetected) {
    nextCalibration = clamp(nextCalibration + 25, -100, 100);
  } else if (cleanSuccess) {
    nextCalibration = Math.round(nextCalibration * 0.65);
  } else if (update.score < 50 && !update.hiddenGapDetected) {
    nextCalibration = clamp(nextCalibration - 10, -100, 100);
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

  // Static DAG root-cause propagation: if this strand failed, bring weak/untouched
  // direct upstream prerequisites due for review so the scheduler can verify foundations.
  if (!cleanSuccess && strandDef) {
    for (const prereqId of strandDef.prerequisiteStrandIds) {
      const prereqDef = STRAND_MAP.get(prereqId);
      if (!prereqDef) continue;
      const existingPrereq = nextStrands[prereqId];
      if (existingPrereq && existingPrereq.mastery < 75) {
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
 * Pure priority scheduler (adapted from LearnHarness Practice §IV):
 * prioritizes weakest, highest-fanout, overdue, and active-gap strands while
 * interleaving away from the just-asked strand.
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

    // Downstream fanout bonus in static DAG
    const downstreamCount = DOWNSTREAM_STRANDS.get(strandDef.id)?.length ?? 0;
    if (downstreamCount > 0 && effective < 75) {
      priority += downstreamCount * 6;
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
  for (const s of pattern.strands) {
    const st = profile.strands[s.id];
    const eff = computeEffectiveStrandMastery(st, nowMs);
    sum += eff;
    if (st?.status === "mastered" && eff >= 80) masteredStrands++;
    if (st?.status === "gap") activeGaps++;
    if (isStrandDueForReview(st, nowMs)) dueStrands++;
  }
  return {
    masteryPercent:
      pattern.strands.length > 0 ? Math.round(sum / pattern.strands.length) : 0,
    masteredStrands,
    totalStrands: pattern.strands.length,
    activeGaps,
    dueStrands,
  };
}

export function recordCompletedSessionDigest(
  profile: UserPatternProfile,
  digest: RecentSessionDigest,
  optimizationScore: number | null,
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

  const nextSummary: PatternSummaryRecord = {
    patternId: digest.patternId,
    lastTrack: digest.track,
    completenessScore:
      digest.track === "intermediate"
        ? digest.overallScore
        : Math.max(prevSummary.completenessScore, digest.overallScore),
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

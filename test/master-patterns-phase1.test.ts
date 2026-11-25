import { test } from "node:test";
import assert from "node:assert";
import {
  ALL_STRANDS,
  PATTERN_CATALOG,
  PATTERN_EDGES,
  validatePatternGraph,
} from "../src/data/patterns";
import {
  applyStrandReviewUpdate,
  computeEffectiveStrandMastery,
  computePatternAggregateMetrics,
  createEmptyUserPatternProfile,
  enforceProfileBounds,
  getDueReviewStrands,
  pruneKnownPrereqStrands,
  rankStrandsForPattern,
  recordCompletedSessionDigest,
  recordErrorSignature,
} from "../src/lib/master-patterns/scheduler";
import {
  MAX_ERROR_SIGNATURES,
  MAX_GAP_NOTE_CHARS,
  MAX_RECENT_SESSIONS,
  UserPatternProfileSchema,
} from "../src/lib/master-patterns/types";

test("Static Pattern DAG: 12 patterns, acyclic edges, valid targets", () => {
  assert.strictEqual(PATTERN_CATALOG.length, 12);
  assert.ok(ALL_STRANDS.length >= 48);
  assert.ok(PATTERN_EDGES.length > 0);

  const check = validatePatternGraph();
  assert.strictEqual(check.ok, true, `DAG validation errors: ${check.errors.join("; ")}`);
});

test("Scheduler: clean pass boosts mastery & stability, miss triggers gap and error signature", () => {
  const t0 = "2026-11-01T10:00:00.000Z";
  let profile = createEmptyUserPatternProfile("user_1", t0);

  // Clean pass on two-pointers:monotonic-elimination
  profile = applyStrandReviewUpdate(
    profile,
    {
      patternId: "two-pointers",
      strandId: "two-pointers:monotonic-elimination",
      score: 95,
      isCorrect: true,
      hiddenGapDetected: false,
      missClass: null,
      hintRung: null,
      verbalScore: 95,
      codeScore: 90,
      track: "pro",
    },
    t0,
  );

  const tpStrand = profile.strands["two-pointers:monotonic-elimination"];
  assert.ok(tpStrand);
  assert.strictEqual(tpStrand.status, "mastered");
  assert.ok(tpStrand.mastery >= 80);
  assert.ok(tpStrand.stabilityDays > 1);

  // Cross-pattern pruning should recognize mastered prerequisite in sliding-window
  const pruned = pruneKnownPrereqStrands("sliding-window", profile, Date.parse(t0));
  assert.ok(pruned.includes("two-pointers:monotonic-elimination"));

  // Miss on sliding-window:while-vs-if-shrink should create active gap + error signature
  profile = applyStrandReviewUpdate(
    profile,
    {
      patternId: "sliding-window",
      strandId: "sliding-window:while-vs-if-shrink",
      score: 30,
      isCorrect: false,
      hiddenGapDetected: false,
      missClass: "invariant-break",
      hintRung: "R3",
      gapNote: "Used if(invalid) instead of while(invalid) on minimum window",
      errorSignatureKey: "sliding-window::if-instead-of-while",
      verbalScore: 35,
      codeScore: 40,
      track: "intermediate",
    },
    t0,
  );

  const swStrand = profile.strands["sliding-window:while-vs-if-shrink"];
  assert.strictEqual(swStrand?.status, "gap");
  assert.strictEqual(profile.errorSignatures.length, 1);
  assert.strictEqual(profile.errorSignatures[0]?.status, "active");
  assert.strictEqual(profile.cognitiveProfile.dominantMissClass, "invariant-break");

  // Twisted follow-up pass should repair the active error signature and lift twist resilience
  const t1 = "2026-11-01T10:15:00.000Z";
  profile = applyStrandReviewUpdate(
    profile,
    {
      patternId: "sliding-window",
      strandId: "sliding-window:while-vs-if-shrink",
      score: 92,
      isCorrect: true,
      hiddenGapDetected: false,
      missClass: null,
      hintRung: null,
      twistOperator: "break-the-premise",
      track: "intermediate",
    },
    t1,
  );

  assert.strictEqual(profile.errorSignatures[0]?.status, "repaired");
  assert.strictEqual(profile.cognitiveProfile.totalTwistsPassed, 1);
  assert.ok(profile.cognitiveProfile.twistResilience["break-the-premise"] > 50);
});

test("Scheduler: hidden gap (right MCQ/code + weak verbal reasoning) flags calibrationBias", () => {
  const t0 = "2026-11-01T10:00:00.000Z";
  let profile = createEmptyUserPatternProfile("user_2", t0);

  profile = applyStrandReviewUpdate(
    profile,
    {
      patternId: "binary-search",
      strandId: "binary-search:loop-invariant-bounds",
      score: 80,
      isCorrect: true,
      hiddenGapDetected: true,
      missClass: "structural",
      hintRung: null,
      gapNote: "Picked correct loop condition but stated wrong termination invariant",
      verbalScore: 30,
      codeScore: 90,
    },
    t0,
  );

  const strand = profile.strands["binary-search:loop-invariant-bounds"];
  assert.strictEqual(strand?.status, "gap");
  assert.ok((strand?.calibrationBias ?? 0) > 0);
  assert.ok((strand?.mastery ?? 100) <= 68);
  assert.ok(profile.cognitiveProfile.verbalToCodeGap < 0);
});

test("Scheduler: FSRS decay lowers overdue effective mastery and surfaces due review strands", () => {
  const t0 = "2026-11-01T10:00:00.000Z";
  let profile = createEmptyUserPatternProfile("user_3", t0);

  profile = applyStrandReviewUpdate(
    profile,
    {
      patternId: "monotonic-stack",
      strandId: "monotonic-stack:dominance-popping",
      score: 90,
      isCorrect: true,
      hiddenGapDetected: false,
      missClass: null,
      hintRung: null,
    },
    t0,
  );

  const storedMastery = profile.strands["monotonic-stack:dominance-popping"]!.mastery;
  const futureMs = Date.parse("2026-12-20T10:00:00.000Z"); // well past ~2 day stability window
  const decayed = computeEffectiveStrandMastery(
    profile.strands["monotonic-stack:dominance-popping"],
    futureMs,
  );

  assert.ok(decayed < storedMastery, `Expected decayed (${decayed}) < stored (${storedMastery})`);
  const due = getDueReviewStrands(profile, futureMs);
  assert.strictEqual(due.length, 1);
  assert.strictEqual(due[0]?.strandId, "monotonic-stack:dominance-popping");

  const metrics = computePatternAggregateMetrics("monotonic-stack", profile, futureMs);
  assert.strictEqual(metrics.dueStrands, 1);
});

test("Scheduler: O(1) bounds cap errorSignatures, recentSessions, and unknown strands", () => {
  let profile = createEmptyUserPatternProfile("user_4");

  for (let i = 0; i < MAX_ERROR_SIGNATURES + 15; i++) {
    profile = recordErrorSignature(profile, {
      signatureKey: `sig_${i}`,
      patternId: "dynamic-programming",
      strandId: "dp:minimal-state-definition",
      missClass: "structural",
      summary: "x".repeat(MAX_GAP_NOTE_CHARS + 50),
    });
  }

  for (let i = 0; i < MAX_RECENT_SESSIONS + 8; i++) {
    profile = recordCompletedSessionDigest(
      profile,
      {
        sessionId: `sess_${i}`,
        patternId: "dynamic-programming",
        track: "pro",
        overallScore: 85,
        resolvedGaps: 1,
        remainingGaps: 0,
        completedAt: new Date(1700000000000 + i * 1000).toISOString(),
      },
      88,
    );
  }

  // Inject an invalid strand ID to verify sanitizer strips it
  profile.strands["nonexistent:strand"] = {
    strandId: "nonexistent:strand",
    patternId: "two-pointers",
    mastery: 99,
    stabilityDays: 5,
    attempts: 1,
    streak: 1,
    status: "mastered",
    calibrationBias: 0,
    lastMissClass: null,
    lastHintRung: null,
    gapNote: null,
    lastPracticedAt: null,
    nextReviewAt: null,
  };

  const bounded = enforceProfileBounds(profile);
  assert.strictEqual(bounded.errorSignatures.length, MAX_ERROR_SIGNATURES);
  assert.strictEqual(bounded.recentSessions.length, MAX_RECENT_SESSIONS);
  assert.strictEqual(bounded.strands["nonexistent:strand"], undefined);
  assert.ok(
    bounded.errorSignatures.every((s) => s.summary.length <= MAX_GAP_NOTE_CHARS),
  );

  // Must validate cleanly against Zod schema and stay compact (< 25 KB)
  const parsed = UserPatternProfileSchema.safeParse(bounded);
  assert.strictEqual(parsed.success, true);
  assert.ok(JSON.stringify(bounded).length < 25_000);
});

test("Scheduler: rankStrandsForPattern prioritizes active gaps and interleaves away from lastAskedStrandId", () => {
  const t0 = "2026-11-01T10:00:00.000Z";
  let profile = createEmptyUserPatternProfile("user_5", t0);

  profile = applyStrandReviewUpdate(
    profile,
    {
      patternId: "graphs-topo-union-find",
      strandId: "graphs:mark-visited-on-enqueue",
      score: 95,
      isCorrect: true,
      hiddenGapDetected: false,
      missClass: null,
      hintRung: null,
    },
    t0,
  );
  profile = applyStrandReviewUpdate(
    profile,
    {
      patternId: "graphs-topo-union-find",
      strandId: "graphs:dijkstra-nonnegative-invariant",
      score: 25,
      isCorrect: false,
      hiddenGapDetected: false,
      missClass: "invariant-break",
      hintRung: "R2",
    },
    t0,
  );

  const ranked = rankStrandsForPattern("graphs-topo-union-find", profile, {
    lastAskedStrandId: "graphs:mark-visited-on-enqueue",
    nowMs: Date.parse(t0),
  });

  assert.strictEqual(
    ranked[0]?.strandId,
    "graphs:dijkstra-nonnegative-invariant",
  );
  assert.ok(ranked[0]!.reasons.includes("active_gap"));
  assert.strictEqual(
    ranked[ranked.length - 1]?.strandId,
    "graphs:mark-visited-on-enqueue",
  );
});

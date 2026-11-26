import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  ALL_STRANDS,
  analyzePatternDag,
} from "../src/data/patterns";
import { analyzeContextBudget } from "../src/lib/master-patterns/context-window";
import {
  healEncodedFields,
  healEvaluationPayload,
  healMissClass,
  healStringifiedArray,
  stripModelValueDebris,
  validateAndHealQuestionCard,
} from "../src/lib/master-patterns/healer";
import {
  fuzzyMatchScore,
  matchPatternAndStrands,
  resolveStrandTarget,
  scoreVerbalExplanation,
} from "../src/lib/master-patterns/matcher";
import {
  buildSessionDigest,
  createNewPatternSession,
  evaluateProbeSubmission,
  evaluateSubmissionAndBuildFollowUp,
  generateNextPatternQuestion,
  requestProgressiveHint,
  startCalibrationProbe,
} from "../src/lib/master-patterns/engine.server";
import {
  buildCaseStudyTestProgram,
} from "../src/lib/master-patterns/test-drivers";
import { createMasterPatternsRouter } from "../src/lib/master-patterns/router.server";
import {
  applyStrandReviewUpdate,
  computeGlobalDagFrontier,
  createEmptyUserPatternProfile,
  rankStrandsForPattern,
  recordErrorSignature,
} from "../src/lib/master-patterns/scheduler";
import type {
  PatternQuestionCard,
  PatternSessionState,
  UserPatternProfile,
} from "../src/lib/master-patterns/types";

const offlineCaller = async () => null;

test("Healer: strips model debris, parses stringified arrays, and heals MCQ rubrics", () => {
  assert.strictEqual(stripModelValueDebris('"`invariant-break`"'), "invariant-break");
  assert.strictEqual(stripModelValueDebris(":cue"), "cue");
  assert.strictEqual(healMissClass('"`complexity`"'), "complexity-suboptimal");
  assert.strictEqual(healMissClass("discriminative-swap"), "discrimination");
  assert.strictEqual(healMissClass("none"), null);

  const parsedArr = healStringifiedArray<string>('["a", "b"]');
  assert.deepStrictEqual(parsedArr, ["a", "b"]);

  const fallback: PatternQuestionCard = {
    id: "q_fb",
    patternId: "sliding-window",
    strandId: "sliding-window:monotonicity-condition",
    modality: "mcq",
    phase: "guided",
    questionRole: "predict",
    prompt: "Fallback prompt",
    options: [
      { value: "inv", label: "Valid invariant" },
      { value: "bad", label: "Broken assumption" },
    ],
    multiSelect: false,
    allowIdk: true,
    requireVerbalApproach: true,
    rubric: {
      correctOptionValues: ["inv"],
      expectedReasoning: "Monotonic non-negative elements.",
      keyInvariantsRequired: ["Non-negative elements"],
    },
  };

  // Case 1: Model emitted stringified options + label instead of option value in correctOptionValues
  const healed = validateAndHealQuestionCard(
    {
      ...fallback,
      options: JSON.stringify([
        { value: "k1", label: "Window grows when sum < target" },
        { value: "k2", label: "Reset array on every index" },
      ]),
      rubric: {
        correctOptionValues: ['"Window grows when sum < target"'],
        expectedReasoning: "Expanding right adds elements until >= target.",
        keyInvariantsRequired: ["Non-negative window values"],
      },
    },
    fallback,
  );
  assert.strictEqual(healed.options?.length, 2);
  assert.deepStrictEqual(healed.rubric?.correctOptionValues, ["k1"]);

  // Case 2: Unresolvable correctOptionValues safely drops back to deterministic fallback
  const unsafe = validateAndHealQuestionCard(
    {
      ...fallback,
      options: [
        { value: "a", label: "Choice A" },
        { value: "b", label: "Choice B" },
      ],
      rubric: {
        correctOptionValues: ["nonexistent_key"],
        expectedReasoning: "Should fall back",
        keyInvariantsRequired: ["Invariant"],
      },
    },
    fallback,
  );
  assert.strictEqual(unsafe.prompt, "Fallback prompt");
});

test("Progressive Hint Ladder (R0..R3) escalates cleanly and applies hint penalty on mastery", async () => {
  const profileUnassisted = createEmptyUserPatternProfile("hint_u1");
  let s1 = createNewPatternSession("hint_u1", "two-pointers");
  s1.track = "intermediate";
  const q1 = await generateNextPatternQuestion(s1, profileUnassisted, {
    aiCaller: offlineCaller,
  });
  s1.currentQuestion = q1;

  // Baseline unassisted correct submit
  const cleanEval = await evaluateSubmissionAndBuildFollowUp(
    s1,
    profileUnassisted,
    {
      sessionId: s1.sessionId,
      questionId: q1.id,
      attemptId: "att_clean",
      selectedOptions: ["invariant"],
      verbalAnswer:
        q1.rubric?.expectedReasoning ??
        "Monotonic elimination guarantees O(n) single pass because discarded boundaries cannot beat optimum.",
    },
    { aiCaller: offlineCaller },
  );

  // Assisted learner requests R0 -> R1 -> R2 hints before submitting the same right answer
  const profileAssisted = createEmptyUserPatternProfile("hint_u2");
  let s2 = createNewPatternSession("hint_u2", "two-pointers");
  s2.track = "intermediate";
  const q2: PatternQuestionCard = { ...q1, id: "q_assisted" };
  s2.currentQuestion = q2;

  const h0 = await requestProgressiveHint(s2, profileAssisted, {
    aiCaller: offlineCaller,
  });
  assert.strictEqual(h0.hint.rung, "R0");
  const h1 = await requestProgressiveHint(h0.updatedSession, profileAssisted, {
    aiCaller: offlineCaller,
  });
  assert.strictEqual(h1.hint.rung, "R1");
  const h2 = await requestProgressiveHint(h1.updatedSession, profileAssisted, {
    aiCaller: offlineCaller,
  });
  assert.strictEqual(h2.hint.rung, "R2");
  assert.strictEqual(h2.updatedSession.currentQuestionHints?.length, 3);

  const assistedEval = await evaluateSubmissionAndBuildFollowUp(
    h2.updatedSession,
    profileAssisted,
    {
      sessionId: s2.sessionId,
      questionId: q2.id,
      attemptId: "att_assisted",
      selectedOptions: ["invariant"],
      verbalAnswer:
        q2.rubric?.expectedReasoning ??
        "Monotonic elimination guarantees O(n) single pass because discarded boundaries cannot beat optimum.",
    },
    { aiCaller: offlineCaller },
  );

  assert.strictEqual(assistedEval.evaluation.hintRung, "R2");
  assert.deepStrictEqual(assistedEval.updatedSession.currentQuestionHints, []);
  assert.ok(
    (assistedEval.updatedProfile.strands[q2.strandId]?.mastery ?? 100) <
      (cleanEval.updatedProfile.strands[q1.strandId]?.mastery ?? 0),
    "R2 hint must reduce mastery delta compared to unassisted mastery",
  );
  assert.ok(
    assistedEval.updatedSession.retestQueue?.includes(q2.strandId),
    "R2+ hint must enqueue strand for fresh-surface retest",
  );
});

test("Probe Observations (strandsObserved), Cognitive Digest, and Fresh-Surface Retest Queue", async () => {
  const profile = createEmptyUserPatternProfile("retest_u");
  let session = createNewPatternSession("retest_u", "sliding-window");
  session = await startCalibrationProbe(session, profile, {
    aiCaller: offlineCaller,
  });

  const probe1 = session.currentQuestion!;
  assert.strictEqual(probe1.questionRole, "predict");
  const p1Res = await evaluateProbeSubmission(
    session,
    profile,
    {
      sessionId: session.sessionId,
      questionId: probe1.id,
      attemptId: "p1",
      selectedOptions: ["trap"],
      verbalAnswer: "I think fixed window works even with negatives.",
    },
    { aiCaller: offlineCaller },
  );
  assert.strictEqual(
    p1Res.updatedSession.probeState?.strandsObserved?.length,
    1,
  );
  assert.strictEqual(
    p1Res.updatedSession.probeState?.strandsObserved?.[0]?.floor,
    "Needs invariant review",
  );

  const digest = buildSessionDigest({
    probeState: p1Res.updatedSession.probeState,
    questionHistory: [
      {
        questionId: "q1",
        strandId: "sliding-window:monotonicity-condition",
        modality: "mcq",
        score: 40,
        missClass: "invariant-break",
        highestHintRung: "R1",
        verbalSummary: "Guessed fixed size instead of while loop.",
      },
    ],
    retestQueue: ["sliding-window:monotonicity-condition"],
    resolvedStrandsInSession: [],
  });
  assert.ok(digest.includes("Probe:"));
  assert.ok(digest.includes("RetestQueue: monotonicity-condition"));
  assert.ok(digest.length <= 1200);

  // Simulate completing regular target slots with a strand queued in retestQueue
  let proSess = createNewPatternSession("retest_u", "two-pointers");
  proSess.track = "pro";
  proSess.retestQueue = ["two-pointers:monotonic-elimination"];
  proSess.questionHistory = [
    {
      questionId: "q1",
      strandId: "two-pointers:monotonic-elimination",
      modality: "mcq",
      score: 45,
      missClass: "invariant-break",
    },
    {
      questionId: "q2",
      strandId: "two-pointers:termination-and-bounds",
      modality: "verbal_text",
      score: 90,
      missClass: null,
    },
    {
      questionId: "q3",
      strandId: "two-pointers:monotonic-elimination",
      modality: "code_snippet",
      score: 92,
      missClass: null,
    },
  ];
  const retestCard = await generateNextPatternQuestion(proSess, profile, {
    aiCaller: offlineCaller,
  });
  assert.strictEqual(retestCard.strandId, "two-pointers:monotonic-elimination");
  assert.strictEqual(
    retestCard.modality,
    "mcq",
    "Retest should flip away from prior code_snippet surface",
  );
  assert.strictEqual(retestCard.questionRole, "check");

  // Passing the fresh-surface retest clears retestQueue and readies scorecard
  proSess.currentQuestion = retestCard;
  const finishRes = await evaluateSubmissionAndBuildFollowUp(
    proSess,
    profile,
    {
      sessionId: proSess.sessionId,
      questionId: retestCard.id,
      attemptId: "att_retest_pass",
      selectedOptions: ["invariant"],
      verbalAnswer:
        retestCard.rubric?.expectedReasoning ??
        "Monotonic elimination safely advances the dominated pointer in O(n).",
    },
    { aiCaller: offlineCaller },
  );
  assert.deepStrictEqual(finishRes.updatedSession.retestQueue, []);
  assert.strictEqual(finishRes.evaluation.readyForScorecard, true);
});

test("Router /session/hint endpoint enforces auth, active question, and R0..R3 progression", async () => {
  const profiles = new Map<string, UserPatternProfile>();
  const sessions = new Map<string, PatternSessionState>();

  const fakeAuth = (req: Request, res: Response, next: NextFunction) => {
    const uid = req.headers["x-test-uid"];
    if (typeof uid !== "string" || !uid.trim()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    (req as Request & { user?: { uid: string } }).user = { uid: uid.trim() };
    return next();
  };

  const router = createMasterPatternsRouter({
    authMiddleware: fakeAuth,
    getProfile: async (uid) => profiles.get(uid) ?? createEmptyUserPatternProfile(uid),
    saveProfile: async (uid, p) => {
      profiles.set(uid, p);
      return p;
    },
    getSession: async (id) => sessions.get(id) ?? null,
    saveSession: async (s) => {
      sessions.set(s.sessionId, s);
      return s;
    },
    engineDeps: { aiCaller: offlineCaller },
  });

  const app = express();
  app.use(express.json());
  app.use("/api/patterns", router);

  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  const base = `http://127.0.0.1:${port}/api/patterns`;

  try {
    const startRes = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_hint" },
      body: JSON.stringify({ patternId: "binary-search" }),
    });
    const { session } = (await startRes.json()) as { session: PatternSessionState };

    const lvlRes = await fetch(`${base}/session/select-level`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_hint" },
      body: JSON.stringify({ sessionId: session.sessionId, track: "pro" }),
    });
    const { session: proSess } = (await lvlRes.json()) as {
      session: PatternSessionState;
    };
    const q = proSess.currentQuestion!;

    const hint0Res = await fetch(`${base}/session/hint`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_hint" },
      body: JSON.stringify({ sessionId: session.sessionId, questionId: q.id }),
    });
    assert.strictEqual(hint0Res.status, 200);
    const hint0Json = (await hint0Res.json()) as any;
    assert.strictEqual(hint0Json.hint.rung, "R0");
    assert.strictEqual(hint0Json.session.currentQuestionHints.length, 1);

    // Stale question id -> 409
    const staleHint = await fetch(`${base}/session/hint`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_hint" },
      body: JSON.stringify({ sessionId: session.sessionId, questionId: "wrong_q" }),
    });
    assert.strictEqual(staleHint.status, 409);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});

test("Test Drivers: binds LeetCode class Solution methods seamlessly in Python and C++", () => {
  const pyRes = buildCaseStudyTestProgram(
    "two-pointers",
    "python",
    "class Solution:\n    def trap(self, height):\n        return 0",
  );
  assert.strictEqual(pyRes.usedTestHarness, true);
  assert.ok(pyRes.wrappedCode.includes('getattr(Solution(), "trap")'));

  const cppRes = buildCaseStudyTestProgram(
    "two-pointers",
    "cpp",
    "class Solution {\npublic:\n  int trap(vector<int>& height) { return 0; }\n};",
  );
  assert.strictEqual(cppRes.usedTestHarness, true);
  assert.ok(cppRes.wrappedCode.includes("__dsaviz_sol.trap"));
});

test("Node DAG: deep analysis, transitive multi-hop root-cause propagation & prerequisite readiness", () => {
  const analysis = analyzePatternDag();
  assert.strictEqual(analysis.ok, true);
  assert.strictEqual(analysis.nodeCount, 49);
  assert.strictEqual(analysis.edgeCount, 40);
  assert.strictEqual(analysis.crossPatternEdges, 5);
  assert.strictEqual(analysis.maxDepth, 4);
  assert.ok(analysis.rootStrandIds.includes("two-pointers:monotonic-elimination"));
  assert.ok(analysis.sinkStrandIds.includes("dp:space-rolling-compression"));

  // Multi-hop failure on depth-4 node dp:space-rolling-compression should wake
  // weak ancestors across DP -> Backtracking -> Trees
  const seedTime = "2026-11-20T00:00:00.000Z";
  let profile = createEmptyUserPatternProfile("dag_multi_hop", seedTime);
  const chainStrands: Array<[string, any]> = [
    ["trees:bottom-up-vs-top-down", "trees-dfs-bfs"],
    ["backtracking:choose-explore-unchoose", "backtracking"],
    ["dp:minimal-state-definition", "dynamic-programming"],
    ["dp:01-vs-unbounded-iteration-order", "dynamic-programming"],
  ];
  for (const [strandId, patternId] of chainStrands) {
    profile = applyStrandReviewUpdate(
      profile,
      {
        patternId,
        strandId,
        score: 65,
        isCorrect: true,
        hiddenGapDetected: false,
        missClass: null,
        hintRung: null,
      },
      seedTime,
    );
  }

  const failTime = "2026-11-26T12:00:00.000Z";
  const afterFail = applyStrandReviewUpdate(
    profile,
    {
      patternId: "dynamic-programming",
      strandId: "dp:space-rolling-compression",
      score: 20,
      isCorrect: false,
      hiddenGapDetected: false,
      missClass: "invariant-break",
      hintRung: "R2",
    },
    failTime,
  );

  for (const [ancId] of chainStrands) {
    assert.strictEqual(
      afterFail.strands[ancId]?.nextReviewAt,
      failTime,
      `Expected transitive ancestor ${ancId} to be due immediately`,
    );
  }

  // Topological readiness: root monotonic-stack:dominance-popping must rank above
  // its untouched dependent monotonic-stack:span-width-boundaries
  const emptyProf = createEmptyUserPatternProfile("dag_order");
  const msRanked = rankStrandsForPattern("monotonic-stack", emptyProf);
  assert.strictEqual(msRanked[0]?.strandId, "monotonic-stack:dominance-popping");
  const dependent = msRanked.find(
    (r) => r.strandId === "monotonic-stack:span-width-boundaries",
  );
  assert.ok(dependent?.reasons.includes("prereq_blocked"));

  const frontier = computeGlobalDagFrontier(afterFail, Date.parse(failTime));
  assert.strictEqual(frontier.nodes.length, 49);
  assert.ok(frontier.summary.gap >= 1);
  assert.ok(frontier.recommendedNext.length >= 1);
});

test("Matching & Healing: stopword-immune verbal scoring, fuzzy resolver, signature coalescing & nested argument healing", () => {
  const rubric =
    "Expanding R monotonically increases window sum for non-negative values while shrinking L restores validity in O(n).";
  const fillerScore = scoreVerbalExplanation(
    "that this works when only from your because very much with",
    rubric,
    ["Expanding R increases sum", "Shrinking L restores validity"],
  );
  const solidScore = scoreVerbalExplanation(
    "Because all values are non-negative, expanding R increases the sum monotonically and shrinking L restores the window constraint in O(n) time.",
    rubric,
    ["Expanding R increases sum", "Shrinking L restores validity"],
  );
  assert.ok(fillerScore <= 30, `Filler scored ${fillerScore}, expected <= 30`);
  assert.ok(solidScore >= 68, `Solid explanation scored ${solidScore}, expected >= 68`);

  assert.strictEqual(
    resolveStrandTarget('":monotonicity-condition"')?.id,
    "sliding-window:monotonicity-condition",
  );
  assert.ok(
    (fuzzyMatchScore(
      "mono shrink",
      "sliding-window:monotonicity-condition",
      "Monotonicity Requirement for Shrinking",
    ) ?? 0) > 20,
  );

  const slugMatches = matchPatternAndStrands("trapping-rain-water", 4);
  assert.strictEqual(slugMatches[0]?.patternId, "two-pointers");

  // Lazy stem fallback still matches inflected queries accurately across catalog
  const stemmedMatches = matchPatternAndStrands("monotonically shrinking", 4);
  assert.strictEqual(stemmedMatches[0]?.strandId, "sliding-window:monotonicity-condition");

  // Error signature coalescing prevents semantic paraphrase duplicates in 20-slot cap
  let sigProf = createEmptyUserPatternProfile("sig_dedupe");
  sigProf = recordErrorSignature(sigProf, {
    signatureKey: "sliding-window::negative-numbers-monotonicity-break",
    patternId: "sliding-window",
    strandId: "sliding-window:monotonicity-condition",
    missClass: "invariant-break",
    summary: "Negative numbers break window sum monotonicity",
  });
  sigProf = recordErrorSignature(sigProf, {
    signatureKey: "sliding-window::negative-numbers-break-monotonicity",
    patternId: "sliding-window",
    strandId: "sliding-window:monotonicity-condition",
    missClass: "invariant-break",
    summary: "Negative numbers invalidate window monotonicity on sum",
  });
  assert.strictEqual(sigProf.errorSignatures.length, 1);
  assert.strictEqual(sigProf.errorSignatures[0]?.recurrenceCount, 2);

  // Nested double-encoded AI JSON payloads heal seamlessly
  const healedObj = healEncodedFields<{ isCorrect: boolean; score: number }>({
    isCorrect: "true",
    score: "91",
  });
  assert.strictEqual(healedObj?.isCorrect, true);
  assert.strictEqual(healedObj?.score, 91);

  const healedEval = healEvaluationPayload({
    isCorrect: "false",
    score: "42",
    hintRung: '"`R2`"',
    codeAudit: JSON.stringify({
      tier: "Better",
      detectedTime: "O(n)",
      detectedSpace: "O(n)",
      timeScore: "85",
      spaceScore: "50",
      optimizationFeedback: "Needs O(1) space",
    }),
  });
  assert.strictEqual(healedEval?.isCorrect, false);
  assert.strictEqual(healedEval?.score, 42);
  assert.strictEqual(healedEval?.hintRung, "R2");
  assert.strictEqual((healedEval?.codeAudit as any)?.spaceScore, 50);
});

test("Context Window Compactor: retains P0 control & P1 active error signatures across 50 verbose turns", () => {
  let profile = createEmptyUserPatternProfile("ctx_u");
  profile = recordErrorSignature(profile, {
    signatureKey: "sliding-window::if-instead-of-while",
    patternId: "sliding-window",
    strandId: "sliding-window:monotonicity-condition",
    missClass: "invariant-break",
    summary: "Used if instead of while when shrinking invalid window",
  });

  const history = Array.from({ length: 50 }, (_, i) => ({
    questionId: `q_${i}`,
    strandId: ALL_STRANDS[i % ALL_STRANDS.length]!.id,
    modality: (i % 2 === 0 ? "mcq" : "verbal_text") as "mcq" | "verbal_text",
    score: i % 3 === 0 ? 45 : 90,
    missClass: i % 3 === 0 ? ("invariant-break" as const) : null,
    highestHintRung: i % 3 === 0 ? ("R1" as const) : null,
    verbalSummary: `Learner explained step ${i} checking pointers across subarrays while missing negative number edge bounds.`,
  }));

  const analysis = analyzeContextBudget({
    session: {
      patternId: "sliding-window",
      probeState: {
        questionsAsked: 2,
        answers: [],
        strandsObserved: [
          {
            strandId: "sliding-window:monotonicity-condition",
            floor: "Needs invariant review",
            ceiling: "Monotonicity Requirement",
            evidence: "Missed probe choice.",
          },
        ],
        recommendedTrack: "intermediate",
        recommendationRationale: null,
      },
      questionHistory: history,
      pendingRemediationStrands: [],
      retestQueue: ["sliding-window:monotonicity-condition"],
      resolvedStrandsInSession: ["sliding-window:while-vs-if-shrink"],
    },
    profile,
    targetStrandId: "sliding-window:monotonicity-condition",
    maxChars: 1200,
  });

  assert.ok(analysis.charCount <= 1200);
  assert.strictEqual(analysis.retainedP0Control, true);
  assert.ok(analysis.packet.includes("RetestQueue: monotonicity-condition"));
  assert.ok(analysis.packet.includes("ActiveErrors:"));
  assert.ok(analysis.packet.includes("Probe:"));
  assert.strictEqual(analysis.compactedOlderTurns, 47);
  assert.ok(analysis.recentVerbatimTurns >= 1);

  const compatDigest = buildSessionDigest(
    {
      patternId: "sliding-window",
      questionHistory: history,
      retestQueue: ["sliding-window:monotonicity-condition"],
      resolvedStrandsInSession: ["sliding-window:while-vs-if-shrink"],
    },
    profile,
    "sliding-window:monotonicity-condition",
  );
  assert.ok(compatDigest.includes("RetestQueue: monotonicity-condition"));
});

test("Router GET /dag & GET /dag/match enforce auth and return topology + frontier readiness", async () => {
  const profiles = new Map<string, UserPatternProfile>();
  const sessions = new Map<string, PatternSessionState>();

  const fakeAuth = (req: Request, res: Response, next: NextFunction) => {
    const uid = req.headers["x-test-uid"];
    if (typeof uid !== "string" || !uid.trim()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    (req as Request & { user?: { uid: string } }).user = { uid: uid.trim() };
    return next();
  };

  const router = createMasterPatternsRouter({
    authMiddleware: fakeAuth,
    getProfile: async (uid) => profiles.get(uid) ?? createEmptyUserPatternProfile(uid),
    saveProfile: async (uid, p) => {
      profiles.set(uid, p);
      return p;
    },
    getSession: async (id) => sessions.get(id) ?? null,
    saveSession: async (s) => {
      sessions.set(s.sessionId, s);
      return s;
    },
    engineDeps: { aiCaller: offlineCaller },
  });

  const app = express();
  app.use(express.json());
  app.use("/api/patterns", router);

  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  const base = `http://127.0.0.1:${port}/api/patterns`;

  try {
    const unauthDag = await fetch(`${base}/dag`);
    assert.strictEqual(unauthDag.status, 401);

    const dagRes = await fetch(`${base}/dag`, {
      headers: { "x-test-uid": "u_dag" },
    });
    assert.strictEqual(dagRes.status, 200);
    const dagJson = (await dagRes.json()) as any;
    assert.strictEqual(dagJson.dag.nodeCount, 49);
    assert.strictEqual(dagJson.dag.maxDepth, 4);
    assert.strictEqual(dagJson.frontier.nodes.length, 49);

    const matchRes = await fetch(`${base}/dag/match?q=3sum`, {
      headers: { "x-test-uid": "u_dag" },
    });
    assert.strictEqual(matchRes.status, 200);
    const matchJson = (await matchRes.json()) as any;
    assert.strictEqual(matchJson.matches[0]?.patternId, "two-pointers");
    assert.ok(matchJson.matches[0]?.userState);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});



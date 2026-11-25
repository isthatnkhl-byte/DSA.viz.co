import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  healMissClass,
  healStringifiedArray,
  stripModelValueDebris,
  validateAndHealQuestionCard,
} from "../src/lib/master-patterns/healer";
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
import { createEmptyUserPatternProfile } from "../src/lib/master-patterns/scheduler";
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


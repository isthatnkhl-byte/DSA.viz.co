import { test } from "node:test";
import assert from "node:assert";
import {
  getPatternSession,
  getUserPatternProfile,
  savePatternSession,
  saveUserPatternProfile,
  stripRubricFromCard,
} from "../src/db/pattern-mastery";
import {
  buildCalibrationView,
  buildMasteryScorecard,
  createNewPatternSession,
  evaluateSubmissionAndBuildFollowUp,
  generateNextPatternQuestion,
  generateTailoredNotes,
} from "../src/lib/master-patterns/engine.server";
import {
  applyStrandReviewUpdate,
  createEmptyUserPatternProfile,
} from "../src/lib/master-patterns/scheduler";

const offlineCaller = async () => null;

test("Anti-leakage: stripRubricFromCard removes server-committed rubric", async () => {
  const profile = createEmptyUserPatternProfile("phase2_u1");
  const session = createNewPatternSession("phase2_u1", "two-pointers");
  session.track = "intermediate";

  const card = await generateNextPatternQuestion(session, profile, {
    aiCaller: offlineCaller,
  });
  assert.ok(card.rubric, "Server card must hold committed rubric");

  const clientSafe = stripRubricFromCard(card);
  assert.ok(clientSafe);
  assert.strictEqual("rubric" in clientSafe, false);
  assert.strictEqual(clientSafe.id, card.id);
});

test("Intermediate flow: tailored notes prune mastered prereqs and hidden gap triggers surgical teaching + twisted follow-up", async () => {
  let profile = createEmptyUserPatternProfile("phase2_u2");
  // Master two-pointers prerequisite first
  profile = applyStrandReviewUpdate(profile, {
    patternId: "two-pointers",
    strandId: "two-pointers:monotonic-elimination",
    score: 96,
    isCorrect: true,
    hiddenGapDetected: false,
    missClass: null,
    hintRung: null,
  });

  const notes = await generateTailoredNotes("sliding-window", profile, {
    aiCaller: offlineCaller,
  });
  assert.ok(
    notes.prunedStrandIds.includes("two-pointers:monotonic-elimination"),
    "Mastered prerequisite should be pruned in Intermediate notes",
  );
  assert.ok(notes.unconditionalTruths.length >= 1);
  assert.ok(notes.pitfalls.length >= 1);

  let session = createNewPatternSession("phase2_u2", "sliding-window");
  session.track = "intermediate";
  session.notes = notes;

  const q1 = await generateNextPatternQuestion(session, profile, {
    aiCaller: offlineCaller,
  });
  assert.strictEqual(q1.modality, "mcq");
  session.currentQuestion = q1;

  // Pick the correct MCQ option ("invariant"), BUT leave verbal reasoning empty -> hidden gap detected!
  const res1 = await evaluateSubmissionAndBuildFollowUp(
    session,
    profile,
    {
      sessionId: session.sessionId,
      questionId: q1.id,
      attemptId: "att_1",
      selectedOptions: ["invariant"],
      verbalAnswer: "",
    },
    { aiCaller: offlineCaller },
  );

  assert.strictEqual(res1.evaluation.hiddenGapDetected, true);
  assert.ok(res1.evaluation.surgicalTeaching);
  assert.ok(res1.evaluation.twistedFollowUp, "Must fire instant twisted follow-up on gap");
  assert.strictEqual(res1.evaluation.twistedFollowUp?.modality, "twisted_followup");

  // Idempotency check: re-submitting same attemptId must not double-mutate
  const replay = await evaluateSubmissionAndBuildFollowUp(
    res1.updatedSession,
    res1.updatedProfile,
    {
      sessionId: session.sessionId,
      questionId: q1.id,
      attemptId: "att_1",
      selectedOptions: ["invariant"],
      verbalAnswer: "",
    },
    { aiCaller: offlineCaller },
  );
  assert.deepStrictEqual(replay.evaluation, res1.evaluation);
  assert.strictEqual(
    replay.updatedProfile.strands[q1.strandId]?.attempts,
    res1.updatedProfile.strands[q1.strandId]?.attempts,
  );

  // Answer the twisted indirect follow-up cleanly -> should repair active gap
  const twistCard = res1.updatedSession.currentQuestion!;
  const res2 = await evaluateSubmissionAndBuildFollowUp(
    res1.updatedSession,
    res1.updatedProfile,
    {
      sessionId: session.sessionId,
      questionId: twistCard.id,
      attemptId: "att_2",
      verbalAnswer:
        twistCard.rubric?.expectedReasoning ??
        "Monotonicity requires non-negative contributions so shrinking L eliminates invalid prefixes safely.",
    },
    { aiCaller: offlineCaller },
  );

  assert.strictEqual(res2.evaluation.isCorrect, true);
  assert.strictEqual(
    res2.updatedProfile.cognitiveProfile.totalTwistsPassed,
    1,
  );

  const { scorecard } = buildMasteryScorecard(
    res2.updatedSession,
    res2.updatedProfile,
  );
  assert.strictEqual(scorecard.track, "intermediate");
  assert.strictEqual(scorecard.optimizationScore, null);
  assert.ok(scorecard.completenessScore > 0);
  assert.ok(scorecard.recommendedProblemSlugs.length >= 1);
});

test("Pro flow: case-study snippet audits O(n) space vs O(1) optimal, executes sandbox, and scores optimization", async () => {
  const profile = createEmptyUserPatternProfile("phase2_u3");
  let session = createNewPatternSession("phase2_u3", "two-pointers");
  session.track = "pro";
  session.questionHistory = [
    {
      questionId: "q_prev_1",
      strandId: "two-pointers:monotonic-elimination",
      modality: "mcq",
      score: 90,
      missClass: null,
    },
    {
      questionId: "q_prev_2",
      strandId: "two-pointers:termination-and-bounds",
      modality: "verbal_text",
      score: 88,
      missClass: null,
    },
  ];

  const caseStudy = await generateNextPatternQuestion(session, profile, {
    aiCaller: offlineCaller,
  });
  assert.strictEqual(caseStudy.modality, "code_snippet");
  session.currentQuestion = caseStudy;

  let sandboxCalled = false;
  const fakeRunner = async () => {
    sandboxCalled = true;
    return {
      stdout: "OK",
      stderr: "",
      exitCode: 0,
      status: "success" as const,
      statusMessage: "OK",
      timestamp: new Date().toISOString(),
      language: "cpp" as const,
    };
  };

  // Suboptimal code allocating vector<int> leftMax -> should flag Better (O(n) space) + complexity-suboptimal gap
  const sub = await evaluateSubmissionAndBuildFollowUp(
    session,
    profile,
    {
      sessionId: session.sessionId,
      questionId: caseStudy.id,
      attemptId: "att_pro_1",
      language: "cpp",
      code: `int trap(vector<int>& height) {\n  int n = height.size(), ans = 0;\n  vector<int> leftMax(n);\n  for (int i = 0; i < n; i++) ans += leftMax[i];\n  return ans;\n}`,
      verbalAnswer: "Precompute leftMax and rightMax arrays and sum min(leftMax[i], rightMax[i]) - height[i].",
      claimedTimeComplexity: "O(n)",
      claimedSpaceComplexity: "O(n)",
      runSandbox: true,
    },
    { aiCaller: offlineCaller, codeRunner: fakeRunner },
  );

  assert.strictEqual(sandboxCalled, true);
  assert.strictEqual(sub.evaluation.codeAudit?.tier, "Better");
  assert.strictEqual(sub.evaluation.missClass, "complexity-suboptimal");
  assert.strictEqual(sub.evaluation.hiddenGapDetected, true);
  assert.ok(sub.evaluation.twistedFollowUp);

  const { scorecard } = buildMasteryScorecard(
    sub.updatedSession,
    sub.updatedProfile,
  );
  assert.strictEqual(scorecard.track, "pro");
  assert.ok(typeof scorecard.optimizationScore === "number");
});

test("DB adapter: calibration view + profile/session round-trip in bounded store", async () => {
  const uid = `phase2_store_${Date.now()}`;
  const prof = createEmptyUserPatternProfile(uid);
  await saveUserPatternProfile(uid, prof);
  const loaded = await getUserPatternProfile(uid);
  assert.strictEqual(loaded.userId, uid);

  const calibration = buildCalibrationView("binary-search", loaded);
  assert.strictEqual(calibration.options.length, 2);
  assert.strictEqual(calibration.patternId, "binary-search");

  const sess = createNewPatternSession(uid, "binary-search");
  await savePatternSession(sess);
  const loadedSess = await getPatternSession(sess.sessionId);
  assert.strictEqual(loadedSess?.sessionId, sess.sessionId);
});

import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import { PATTERN_CATALOG } from "../src/data/patterns";
import {
  buildCaseStudyTestProgram,
  parseDriverTestSummary,
} from "../src/lib/master-patterns/test-drivers";
import { createMasterPatternsRouter } from "../src/lib/master-patterns/router.server";
import { createEmptyUserPatternProfile } from "../src/lib/master-patterns/scheduler";
import { evaluateSubmissionAndBuildFollowUp, createNewPatternSession, generateNextPatternQuestion } from "../src/lib/master-patterns/engine.server";
import type {
  PatternSessionState,
  UserPatternProfile,
} from "../src/lib/master-patterns/types";

test("Test Drivers: builds executable C++, Python, and Java harnesses for Pro case studies", () => {
  for (const p of PATTERN_CATALOG) {
    const cppRes = buildCaseStudyTestProgram(
      p.id,
      "cpp",
      p.proCaseStudy.starterCode.cpp,
    );
    assert.strictEqual(
      cppRes.usedTestHarness,
      true,
      `Expected C++ test driver for ${p.id}`,
    );
    assert.ok(cppRes.wrappedCode.includes("int main()"));
    assert.ok(cppRes.wrappedCode.includes("SUMMARY:"));

    const pyRes = buildCaseStudyTestProgram(
      p.id,
      "python",
      p.proCaseStudy.starterCode.python,
    );
    assert.strictEqual(
      pyRes.usedTestHarness,
      true,
      `Expected Python test driver for ${p.id}`,
    );
    assert.ok(pyRes.wrappedCode.includes("SUMMARY:"));
  }

  // Java driver check on two-pointers
  const javaRes = buildCaseStudyTestProgram(
    "two-pointers",
    "java",
    PATTERN_CATALOG[0]!.proCaseStudy.starterCode.java,
  );
  assert.strictEqual(javaRes.usedTestHarness, true);
  assert.ok(javaRes.wrappedCode.includes("class Solution"));

  // Custom code lacking expected symbol or already having main() skips wrapper safely
  const customRes = buildCaseStudyTestProgram(
    "two-pointers",
    "cpp",
    "int customHelper() { return 42; }",
  );
  assert.strictEqual(customRes.usedTestHarness, false);

  const summary = parseDriverTestSummary("CASE 1 PASS\nCASE 2 FAIL\nSUMMARY:1/2\n", 1, true);
  assert.strictEqual(summary.passed, false);
  assert.strictEqual(summary.testsPassed, 1);
  assert.strictEqual(summary.testsTotal, 2);
});

test("Pro Sandbox Integration: executes wrapped test driver and surfaces testsPassed/testsTotal", async () => {
  const profile = createEmptyUserPatternProfile("driver_user");
  const session = createNewPatternSession("driver_user", "two-pointers");
  session.track = "pro";
  session.questionHistory = [
    { questionId: "q1", strandId: "two-pointers:monotonic-elimination", modality: "mcq", score: 90, missClass: null },
    { questionId: "q2", strandId: "two-pointers:termination-and-bounds", modality: "verbal_text", score: 90, missClass: null },
  ];

  const card = await generateNextPatternQuestion(session, profile, {
    aiCaller: async () => null,
  });
  session.currentQuestion = card;

  let receivedCode = "";
  const sub = await evaluateSubmissionAndBuildFollowUp(
    session,
    profile,
    {
      sessionId: session.sessionId,
      questionId: card.id,
      attemptId: "att_driver_1",
      language: "cpp",
      code: `int trap(vector<int>& height) {
  int l = 0, r = (int)height.size() - 1, lMax = 0, rMax = 0, ans = 0;
  while (l < r) {
    if (height[l] < height[r]) { lMax = max(lMax, height[l]); ans += lMax - height[l++]; }
    else { rMax = max(rMax, height[r]); ans += rMax - height[r--]; }
  }
  return ans;
}`,
      verbalAnswer: "Maintain lMax and rMax invariants while advancing the shorter wall in O(n) time and O(1) space.",
      claimedTimeComplexity: "O(n)",
      claimedSpaceComplexity: "O(1)",
      runSandbox: true,
    },
    {
      aiCaller: async () => null,
      codeRunner: async (wrapped) => {
        receivedCode = wrapped;
        return {
          stdout: "CASE 1 PASS\nCASE 2 PASS\nCASE 3 PASS\nSUMMARY:3/3\n",
          stderr: "",
          exitCode: 0,
          status: "success",
          statusMessage: "OK",
          timestamp: new Date().toISOString(),
          language: "cpp",
        };
      },
    },
  );

  assert.ok(receivedCode.includes("int main()"), "Must wrap code with case-study test driver");
  assert.strictEqual(sub.evaluation.codeAudit?.sandboxOutcome?.passed, true);
  assert.strictEqual(sub.evaluation.codeAudit?.sandboxOutcome?.testsPassed, 3);
  assert.strictEqual(sub.evaluation.codeAudit?.sandboxOutcome?.testsTotal, 3);
  assert.strictEqual(sub.evaluation.codeAudit?.tier, "Optimal");
});

test("Diagnostic Calibration Probe: 2-question probe routes weak answers to Intermediate notes and strong answers to Pro", async () => {
  const profiles = new Map<string, UserPatternProfile>();
  const sessions = new Map<string, PatternSessionState>();

  const fakeAuth = (req: Request, res: Response, next: NextFunction) => {
    (req as Request & { user?: { uid: string } }).user = { uid: "probe_user" };
    return next();
  };

  const router = createMasterPatternsRouter({
    authMiddleware: fakeAuth,
    getProfile: async (uid) => profiles.get(uid) ?? createEmptyUserPatternProfile(uid),
    saveProfile: async (uid, p) => { profiles.set(uid, p); return p; },
    getSession: async (id) => sessions.get(id) ?? null,
    saveSession: async (s) => { sessions.set(s.sessionId, s); return s; },
    engineDeps: { aiCaller: async () => null },
  });

  const app = express();
  app.use(express.json());
  app.use("/api/patterns", router);

  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}/api/patterns`;

  try {
    // Path A: Weak probe answers -> auto-routed to Intermediate with tailored notes
    const startA = await (await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patternId: "sliding-window" }),
    })).json() as any;

    const probeA = await (await fetch(`${base}/session/start-probe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: startA.session.sessionId }),
    })).json() as any;
    assert.strictEqual(probeA.session.stage, "probing");
    assert.strictEqual("rubric" in probeA.session.currentQuestion, false);

    const subA1 = await (await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: startA.session.sessionId,
        questionId: probeA.session.currentQuestion.id,
        attemptId: "p_a1",
        choseIdk: true,
      }),
    })).json() as any;
    assert.strictEqual(subA1.session.stage, "probing");
    assert.strictEqual(subA1.session.probeState.questionsAsked, 2);

    const subA2 = await (await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: startA.session.sessionId,
        questionId: subA1.session.currentQuestion.id,
        attemptId: "p_a2",
        choseIdk: true,
      }),
    })).json() as any;
    assert.strictEqual(subA2.session.track, "intermediate");
    assert.strictEqual(subA2.session.stage, "studying_notes");
    assert.ok(subA2.session.notes);

    // Path B: Strong probe answers -> auto-routed to Pro gauntlet
    const startB = await (await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patternId: "two-pointers" }),
    })).json() as any;

    const probeB = await (await fetch(`${base}/session/start-probe`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: startB.session.sessionId }),
    })).json() as any;

    const subB1 = await (await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: startB.session.sessionId,
        questionId: probeB.session.currentQuestion.id,
        attemptId: "p_b1",
        selectedOptions: ["invariant"],
        verbalAnswer:
          "In an ascending sequence, increasing L never decreases nums[L], and all pairs outside [L..R] are strictly suboptimal or invalid.",
      }),
    })).json() as any;
    assert.strictEqual(subB1.evaluation.isCorrect, true);

    const subB2 = await (await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: startB.session.sessionId,
        questionId: subB1.session.currentQuestion.id,
        attemptId: "p_b2",
        verbalAnswer:
          "Sorting first modifies indices and requires extra index mapping space; advancing the bottleneck pointer strictly preserves optimal candidates in O(1) space while eliminating dominated rows.",
      }),
    })).json() as any;
    assert.strictEqual(subB2.session.track, "pro");
    assert.strictEqual(subB2.session.stage, "questioning");
    assert.ok(subB2.session.currentQuestion);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});

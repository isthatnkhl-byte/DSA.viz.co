import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import { createMasterPatternsRouter } from "../src/lib/master-patterns/router.server";
import type { PatternModelStepCaller } from "../src/lib/master-patterns/agent-tools.server";
import type { SideModelCaller } from "../src/lib/master-patterns/side-chat.server";
import type { VisualModelCaller } from "../src/lib/master-patterns/visual-agent.server";
import {
  DEFAULT_CONTEXT_BUDGET_CHARS,
} from "../src/lib/master-patterns/context-window";
import { buildSessionDigest } from "../src/lib/master-patterns/engine.server";
import { createTextSelector, serializeCitation } from "../src/lib/master-patterns/citations";
import { collectPendingSideUpdates } from "../src/lib/master-patterns/side-chat";
import {
  computePatternAggregateMetrics,
  createEmptyUserPatternProfile,
  enforceProfileBounds,
} from "../src/lib/master-patterns/scheduler";
import {
  reattachPatternTurnStream,
  runPatternTurnWithRecovery,
  steerActivePatternTurn,
} from "../src/lib/master-patterns/session-controller";
import type {
  MasteryScorecard,
  PatternQuestionCard,
  PatternSessionState,
  PatternTurnStreamEvent,
  SideChatThread,
  SubmissionEvaluation,
  UserPatternProfile,
} from "../src/lib/master-patterns/types";

function makePngBase64(width: number, height: number, seed = 1): string {
  const buf = Buffer.alloc(33, seed);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  buf[24] = 8;
  buf[25] = 2;
  return buf.toString("base64");
}

function makeWebpVp8xBase64(width: number, height: number): string {
  const buf = Buffer.alloc(30, 0);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(22, 4);
  buf.write("WEBP", 8, "ascii");
  buf.write("VP8X", 12, "ascii");
  buf.writeUInt32LE(10, 16);
  buf[24] = (width - 1) & 0xff;
  buf[25] = ((width - 1) >> 8) & 0xff;
  buf[26] = ((width - 1) >> 16) & 0xff;
  buf[27] = (height - 1) & 0xff;
  buf[28] = ((height - 1) >> 8) & 0xff;
  buf[29] = ((height - 1) >> 16) & 0xff;
  return buf.toString("base64");
}

async function withServer(
  app: express.Express,
  fn: (baseUrl: string) => Promise<void>,
) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}/api/patterns`;
  try {
    await fn(baseUrl);
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("MASTER E2E TANGLED MULTI-RUN: DAG -> Wave 1 Tool/Steer/Reattach -> Wave 2 Side Q&A/Cite/Stop -> Wave 3 Confidence/Images/SVG Audit -> Run 2 Pro Sandbox & FSRS", async () => {
  const profiles = new Map<string, UserPatternProfile>();
  const sessions = new Map<string, PatternSessionState>();

  // Coordination primitives for mid-turn SSE disconnect + steer + 409 check
  let probeStep1Entered!: () => void;
  const probeStep1Promise = new Promise<void>((r) => {
    probeStep1Entered = r;
  });
  let releaseProbeStep1!: () => void;
  const releaseProbeStep1Promise = new Promise<void>((r) => {
    releaseProbeStep1 = r;
  });

  let sideStopEntered!: () => void;
  const sideStopPromise = new Promise<void>((r) => {
    sideStopEntered = r;
  });

  const telemetry = {
    probeSteerSeenInPrompt: false,
    sidePrompts: [] as string[],
    evalSawImages: 0,
    evalSawExpandedCitation: false,
    evalSawSideDeltaWatermark: false,
    visualRepairPasses: 0,
    proCaseStudySawSandbox: false,
  };

  let probeStepCounter = 0;

  const stepCaller: PatternModelStepCaller = async (req) => {
    const toolNames = new Set(req.tools.map((t) => t.name));
    const fullPrompt = `${req.systemPrompt}\n${req.messages
      .map((m) => ("text" in m && m.text ? m.text : JSON.stringify(m)))
      .join("\n")}`;

    // 1. Calibration Probe (Prober Role): Step 1 explores DAG & pauses for steer; Step 2 honors steer & delivers probe Q
    if (req.role === "prober" && toolNames.has("deliver_question")) {
      probeStepCounter += 1;
      if (probeStepCounter === 1) {
        req.onReasoningDelta?.(
          "Probing baseline sliding-window invariants via DAG lookup...",
        );
        probeStep1Entered();
        await releaseProbeStep1Promise;
        return {
          text: "Checking sliding window prerequisites first",
          functionCalls: [
            {
              id: "call_dag_probe",
              name: "lookup_strand_dag",
              args: { strandId: "sliding-window:monotonicity-condition" },
            },
          ],
        };
      }
      if (fullPrompt.includes("Focus on negative element breakdown please")) {
        telemetry.probeSteerSeenInPrompt = true;
      }
      return {
        functionCalls: [
          {
            id: "call_probe_q",
            name: "deliver_question",
            args: {
              modality: "mcq",
              questionRole: "predict",
              prompt:
                "Why do negative numbers break standard two-pointer window shrinking?",
              options: [
                {
                  value: "mono",
                  label: "Adding elements no longer guarantees monotone sum growth",
                },
                {
                  value: "sort",
                  label: "Arrays must be sorted alphabetically first",
                },
              ],
              correctOptionValues: ["mono"],
              expectedReasoning:
                "Negative numbers mean expanding or shrinking can either raise or lower the window sum.",
              keyInvariantsRequired: ["monotonicity under addition/removal"],
            },
          },
        ],
      };
    }

    // 2. Notes generation (Teacher Role): Self-heals stringified array via notes schema
    if (toolNames.has("deliver_notes")) {
      return {
        functionCalls: [
          {
            id: "call_notes_master",
            name: "deliver_notes",
            args: {
              unconditionalTruths: [
                {
                  title: "Monotone State",
                  statement:
                    "Variable sliding window requires expanding to widen feasibility and shrinking toward invalidity cleanly.",
                },
              ],
              motivatedDiscovery: {
                bruteForceBottleneck:
                  "O(n^2) nested loops recompute overlapping subarray sums.",
                keyInsight:
                  "Slide right once per element and advance left strictly forward.",
                whyItWorks:
                  "Non-negative values guarantee shrinking strictly decreases window sum.",
              },
              canonicalTemplate: {
                language: "cpp",
                code: "int l=0; for(int r=0; r<n; ++r){ sum+=a[r]; while(sum>=k){ ans=min(ans,r-l+1); sum-=a[l++]; } }",
                invariantAnnotation:
                  "After inner while loop, window [l..r] is strictly under threshold.",
              },
              pitfalls: [
                {
                  trap: "Negative entries break shrink termination",
                  counterexample: "[5, -3, 4] with k=6",
                  fix: "Use prefix sums + monotonic deque when negatives exist.",
                },
              ],
            },
          },
        ],
      };
    }

    // 3. Question generation: Intermediate MCQ vs Pro (Gauntlet MCQ -> Verbal -> Case Study Code Snippet)
    if (toolNames.has("deliver_question")) {
      if (fullPrompt.includes('"modality": "code_snippet"')) {
        return {
          functionCalls: [
            {
              id: "call_pro_code",
              name: "deliver_question",
              args: {
                modality: "code_snippet",
                questionRole: "apply",
                prompt:
                  "Implement first-true lower_bound binary search with closed/half-open invariant safety.",
                codeStarter: {
                  language: "cpp",
                  starter:
                    "int lowerBound(vector<int>& a, int target) {\n  // TODO\n}",
                },
                expectedReasoning:
                  "Maintain loop invariant hi >= lo and mid = lo + (hi - lo)/2.",
                expectedComplexity: { time: "O(log n)", space: "O(1)" },
                keyInvariantsRequired: [
                  "mid overflow prevention",
                  "boundary convergence",
                ],
              },
            },
          ],
        };
      }

      if (fullPrompt.includes('"modality": "verbal_text"')) {
        return {
          functionCalls: [
            {
              id: "call_pro_verbal",
              name: "deliver_question",
              args: {
                modality: "verbal_text",
                questionRole: "check",
                prompt:
                  "Explain why half-open [lo, hi) avoids an off-by-one infinite loop when computing mid = lo + (hi - lo) / 2.",
                expectedReasoning:
                  "Left-biased floor guarantees hi shrinks via r=m and lo grows via l=m+1 whenever hi - lo >= 1.",
                keyInvariantsRequired: ["half-open termination invariant"],
              },
            },
          ],
        };
      }

      if (req.role === "practitioner" || fullPrompt.includes("Binary Search")) {
        return {
          functionCalls: [
            {
              id: "call_pro_mcq",
              name: "deliver_question",
              args: {
                modality: "mcq",
                questionRole: "check",
                prompt:
                  "When searching for the FIRST element >= target in sorted binary search, what update preserves answer existence in [lo, hi)?",
                options: [
                  { value: "half_open", label: "If a[mid] >= target then hi = mid; else lo = mid + 1" },
                  { value: "skip", label: "If a[mid] >= target then hi = mid - 1" },
                ],
                correctOptionValues: ["half_open"],
                expectedReasoning:
                  "When a[mid] >= target, mid itself could be the first true index so it stays inside [lo, hi).",
                keyInvariantsRequired: ["half-open preservation"],
              },
            },
          ],
        };
      }

      return {
        functionCalls: [
          {
            id: "call_int_q",
            name: "deliver_question",
            args: {
              modality: "mcq",
              questionRole: "check",
              prompt:
                "In a variable sliding window over positive numbers, why does replacing `while` with `if` when shrinking fail?",
              options: [
                {
                  value: "multi_shrink",
                  label:
                    "One large element added at R may require shrinking L multiple steps to restore validity",
                },
                {
                  value: "syntax",
                  label: "C++ forbids using while inside a for loop",
                },
              ],
              correctOptionValues: ["multi_shrink"],
              expectedReasoning:
                "SECRET_RUBRIC_KEY: Multiple small elements at the left may need removal before [L..R] satisfies the invariant again.",
              keyInvariantsRequired: ["restore invariant via while shrink"],
            },
          },
        ],
      };
    }

    // 4. Evaluation (Teacher Role for Intermediate, Practitioner Role for Pro Code)
    if (toolNames.has("deliver_evaluation")) {
      if (req.role === "practitioner" || fullPrompt.includes("Binary Search")) {
        if (fullPrompt.includes("Sandbox ran: passed=true")) {
          telemetry.proCaseStudySawSandbox = true;
        }
        return {
          functionCalls: [
            {
              id: "call_eval_pro",
              name: "deliver_evaluation",
              args: {
                isCorrect: true,
                hiddenGapDetected: false,
                score: 94,
                verbalScore: 95,
                missClass: null,
                hintRung: null,
                errorSignatureKey: null,
                gapSummary: null,
                verdictSummary:
                  "Optimal O(log n) lower_bound verified by sandbox.",
                surgicalTeaching: null,
                codeAudit: {
                  tier: "Optimal",
                  detectedTime: "O(log n)",
                  detectedSpace: "O(1)",
                  timeScore: 98,
                  spaceScore: 100,
                  optimizationFeedback:
                    "Overflow-safe midpoint calculation and strict convergence.",
                },
              },
            },
          ],
        };
      }

      // Check Run 1 Intermediate waves integration signals
      if (req.images && req.images.length > 0) {
        telemetry.evalSawImages = req.images.length;
      }
      if (fullPrompt.includes("<referenced_quotes>")) {
        telemetry.evalSawExpandedCitation = true;
      }
      if (
        fullPrompt.includes("Explain Monotone State") ||
        fullPrompt.includes("if-step leaves")
      ) {
        telemetry.evalSawSideDeltaWatermark = true;
      }

      // Twist resolution turn vs initial overconfident miss
      if (fullPrompt.includes("twisted_followup")) {
        return {
          functionCalls: [
            {
              id: "call_eval_twist_pass",
              name: "deliver_evaluation",
              args: {
                isCorrect: true,
                hiddenGapDetected: false,
                score: 90,
                verbalScore: 92,
                missClass: null,
                hintRung: null,
                errorSignatureKey: "sliding-window:if-vs-while-shrink",
                gapSummary: null,
                verdictSummary:
                  "Correctly analyzed multi-step shrink repair under 100 at R.",
                surgicalTeaching: null,
              },
            },
          ],
        };
      }

      return {
        functionCalls: [
          {
            id: "call_eval_miss",
            name: "deliver_evaluation",
            args: {
              isCorrect: false,
              hiddenGapDetected: false,
              score: 20,
              verbalScore: 20,
              missClass: "invariant-break",
              hintRung: null,
              errorSignatureKey: "sliding-window:if-vs-while-shrink",
              gapSummary: "Syntax distraction ignored multi-step shrink loop.",
              verdictSummary:
                "Syntax distraction ignored multi-step shrinking invariant.",
              surgicalTeaching:
                "An added large tail element forces while-shrinking multiple indices.",
              twistedFollowUp: {
                operator: "break-the-premise",
                prompt:
                  "Now trace [1, 1, 1, 100] with maxSum < 10: how many steps must L advance when R hits 100?",
                expectedReasoning:
                  "L must advance past all three 1s in one while loop so the window clears.",
              },
            },
          },
        ],
      };
    }

    return { text: JSON.stringify({ hintText: "Think about monotone shrinking." }) };
  };

  const sideModelCaller: SideModelCaller = async ({
    turns,
    signal,
    onText,
  }) => {
    const joinedTurns = turns.map((t) => t.text).join("\n");
    telemetry.sidePrompts.push(joinedTurns);
    // Security check: Side helper prompt MUST NEVER contain the main open rubric secret!
    assert.ok(
      !joinedTurns.includes("SECRET_RUBRIC_KEY"),
      "Spoiler lock violated: hidden expectedReasoning leaked to side helper prompt!",
    );

    if (joinedTurns.includes("TRIGGER_STOP_MID_STREAM")) {
      onText("Partial side insight on while invariant");
      sideStopEntered();
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2500);
        if (typeof timer.unref === "function") timer.unref();
        if (signal.aborted) {
          clearTimeout(timer);
          return resolve();
        }
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
      return {
        text: "Partial side insight on while invariant",
        outcome: "aborted",
      };
    }

    const answer = "Consider [1, 1, 100]: one if-step leaves [1, 100] invalid!";
    onText(answer);
    return { text: answer, outcome: "complete" };
  };

  const visualModelCaller: VisualModelCaller = async (_prompt, priorFeedback) => {
    telemetry.visualRepairPasses += 1;
    if (telemetry.visualRepairPasses === 1) {
      return {
        kind: "svg",
        title: "Unsafe Overlapping Visual",
        svg: `<svg viewBox="0 0 400 200"><script>bad()</script><text x="20" y="30" font-size="8">Tiny</text><text x="22" y="31" font-size="14">Collision</text></svg>`,
      };
    }
    assert.ok(priorFeedback && priorFeedback.includes("<script>"), "Repair pass must see audit feedback");
    return {
      kind: "svg",
      title: "Repaired While-Shrink Counterexample",
      svg: `<svg viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg">
        <rect x="16" y="16" width="608" height="208" rx="8" fill="#ffffff" stroke="#cbd5e1" />
        <rect x="60" y="72" width="80" height="52" fill="#fee2e2" stroke="#ef4444" />
        <text x="100" y="104" text-anchor="middle" font-size="16">100</text>
        <text x="320" y="185" text-anchor="middle" font-size="13">While loop shrinks L across 3 steps</text>
      </svg>`,
    };
  };

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
    updateFlushMs: 5,
    getProfile: async (uid) =>
      profiles.get(uid) ?? createEmptyUserPatternProfile(uid),
    saveProfile: async (uid, p) => {
      const bounded = enforceProfileBounds(p);
      profiles.set(uid, bounded);
      return bounded;
    },
    getSession: async (id) => sessions.get(id) ?? null,
    saveSession: async (s) => {
      sessions.set(s.sessionId, s);
      return s;
    },
    engineDeps: {
      stepCaller,
      visualModelCaller,
      codeRunner: async () => ({
        status: "success",
        stdout: "ALL_TESTS_PASSED 3/3\n",
        stderr: "",
        exitCode: 0,
        executionTimeMs: 9,
      }),
    },
    sideModelCaller,
  });

  const app = express();
  app.use(express.json({ limit: "4mb" }));
  app.use("/api/patterns", router);

  await withServer(app, async (base) => {
    // --- A. Unauth check & Pre-Wave DAG / Matcher API ---
    const unauth = await fetch(`${base}/dag`);
    assert.strictEqual(unauth.status, 401);

    const dagRes = await fetch(`${base}/dag`, {
      headers: { "x-test-uid": "u_master" },
    });
    assert.strictEqual(dagRes.status, 200);
    const dagJson = (await dagRes.json()) as {
      dag: { nodeCount: number; ok: boolean; errors: string[] };
    };
    assert.strictEqual(dagJson.dag.nodeCount, 49);
    assert.strictEqual(dagJson.dag.ok, true);
    assert.deepStrictEqual(dagJson.dag.errors, []);

    const matchRes = await fetch(
      `${base}/dag/match?q=${encodeURIComponent("shrinking window")}&limit=5`,
      { headers: { "x-test-uid": "u_master" } },
    );
    assert.strictEqual(matchRes.status, 200);
    const matchJson = (await matchRes.json()) as {
      matches: Array<{ patternId: string; strandId: string }>;
    };
    assert.ok(matchJson.matches.some((m) => m.patternId === "sliding-window"));

    // --- B. Run 1 Session Start + Wave 1 Calibration Steer + Disconnect/Reattach + 409 ---
    const startRes = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify({ patternId: "sliding-window" }),
    });
    assert.strictEqual(startRes.status, 200);
    const { session: run1Init } = (await startRes.json()) as {
      session: PatternSessionState;
    };
    const s1 = run1Init.sessionId;

    // Launch start_probe over SSE, disconnect mid-flight after first SSE chunk, steer, 409 check, and reattach
    const abortCtrl = new AbortController();
    const sseReqPromise = fetch(`${base}/session/${s1}/turn`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "text/event-stream",
        "x-test-uid": "u_master",
      },
      body: JSON.stringify({ action: { kind: "start_probe" } }),
      signal: abortCtrl.signal,
    }).catch(() => null);

    try {
      await probeStep1Promise;

      // Steer active prober run
      const steerRes = await steerActivePatternTurn({
        basePath: base,
        sessionId: s1,
        text: "Focus on negative element breakdown please",
        getHeaders: async () => ({ "x-test-uid": "u_master" }),
      });
      assert.strictEqual(steerRes.accepted, true);

      // Duplicate turn while prober holds lock MUST return 409
      const conflictRes = await fetch(`${base}/session/${s1}/turn`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-uid": "u_master" },
        body: JSON.stringify({ action: { kind: "select_level", track: "intermediate" } }),
      });
      assert.strictEqual(conflictRes.status, 409);

      // Cross-user isolation check (u_intruder forbidden)
      const intruderRes = await fetch(`${base}/session/${s1}`, {
        headers: { "x-test-uid": "u_intruder" },
      });
      assert.strictEqual(intruderRes.status, 403);

      // Disconnect original client stream, then reattach via GET /stream
      abortCtrl.abort();
      await sseReqPromise;

      const reattachEvents: PatternTurnStreamEvent[] = [];
      const reattachPromise = reattachPatternTurnStream({
        basePath: base,
        sessionId: s1,
        getHeaders: async () => ({ "x-test-uid": "u_master" }),
        onEvent: (ev) => reattachEvents.push(ev),
      });

      releaseProbeStep1();
      const settledProbe = await reattachPromise;
      assert.strictEqual(settledProbe.session.stage, "probing");
      assert.strictEqual(telemetry.probeSteerSeenInPrompt, true);
      assert.ok(reattachEvents.some((e) => e.type === "turn_settled"));
      assert.ok(
        settledProbe.session.lastTurnTrace?.steersApplied?.includes(
          "Focus on negative element breakdown please",
        ),
      );
    } finally {
      releaseProbeStep1();
    }

    // Submit calibration probe with choseIdk + spoofed 95 confidence -> honest_gap nullification!
    const probeQ = (await (await fetch(`${base}/session/${s1}`, {
      headers: { "x-test-uid": "u_master" },
    })).json()) as { session: PatternSessionState };
    assert.strictEqual((probeQ.session.currentQuestion as PatternQuestionCard & { rubric?: unknown })?.rubric, undefined);

    const idkSubmit = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s1,
      action: {
        kind: "submit",
        payload: {
          sessionId: s1,
          questionId: probeQ.session.currentQuestion!.id,
          attemptId: "att_probe_idk",
          choseIdk: true,
          confidence: 95,
          verbalAnswer: "Need refresher on negatives.",
        },
      },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    assert.strictEqual(idkSubmit.evaluation?.confidenceSubmitted, null);
    assert.strictEqual(idkSubmit.evaluation?.confidenceDiagnostic, "honest_gap");

    // Advance intermediate track -> studying_notes -> active MCQ question
    await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s1,
      action: { kind: "select_level", track: "intermediate" },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    const readyRes = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s1,
      action: { kind: "ready_questions" },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    const activeQ = readyRes.session.currentQuestion!;
    assert.strictEqual(readyRes.session.stage, "questioning");

    // --- C. Wave 2 Concurrent Side Q&A (Thread 1 Completed + Thread 2 Stopped) + Spoiler Lock ---
    const sel = createTextSelector(activeQ.prompt, 10, 42)!;
    const quoteText = sel.text;
    const cit = serializeCitation({
      version: 1,
      sessionId: s1,
      segmentId: `q:${activeQ.id}`,
      ...sel,
    });

    const side1Res = await fetch(`${base}/session/${s1}/side-chats/ask?stream=0`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify({
        anchor: {
          segmentId: `notes:${s1}:truths`,
          kind: "notes",
          title: "Monotone State",
        },
        text: "Explain Monotone State vs while loop shrink?",
        quotes: [quoteText],
        quoteCitations: [cit],
        requestId: "side_m1",
      }),
    });
    assert.strictEqual(side1Res.status, 200);

    // Side Thread 2 stopped mid-stream
    const side2Promise = fetch(`${base}/session/${s1}/side-chats/ask?stream=0`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify({
        anchor: {
          segmentId: `q:${activeQ.id}`,
          kind: "question",
          title: "Active Check",
        },
        text: "TRIGGER_STOP_MID_STREAM please walk through",
        quotes: [],
        requestId: "side_m2",
      }),
    });
    await sideStopPromise;
    const listSideJson = (await (
      await fetch(`${base}/session/${s1}/side-chats`, {
        headers: { "x-test-uid": "u_master" },
      })
    ).json()) as { answering: Record<string, string> };
    const activeStopThreadId = Object.keys(listSideJson.answering)[0];
    assert.ok(activeStopThreadId, "Answering side thread ID should be reported live");
    await fetch(
      `${base}/session/${s1}/side-chats/${encodeURIComponent(activeStopThreadId!)}/stop`,
      {
        method: "POST",
        headers: { "x-test-uid": "u_master" },
      },
    );
    const side2Json = (await (await side2Promise).json()) as { thread: SideChatThread };
    assert.strictEqual(side2Json.thread.messages.at(-1)?.stopped, true);

    // --- D. Wave 3 Spoof Guard + Valid PNG + W3C Citation + Overconfident Miss + Twist ---
    const validPng = makePngBase64(280, 160, 11);
    const badUploadRes = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify({
        sessionId: s1,
        questionId: activeQ.id,
        attemptId: "att_spoof_retry",
        selectedOptions: ["syntax"],
        confidence: 95,
        verbalAnswer: `${cit} syntax issue in C++`,
        workImages: [
          {
            mimeType: "image/png",
            data: Buffer.from("NOT_A_PNG_PAYLOAD_XYZ").toString("base64"),
          },
        ],
      }),
    });
    assert.strictEqual(badUploadRes.status, 400);

    // Retry legitimately with identical attemptId -> must succeed & replay cleanly on duplicate!
    const goodOverconfBody = {
      sessionId: s1,
      questionId: activeQ.id,
      attemptId: "att_overconf_w3",
      selectedOptions: ["syntax"],
      confidence: 95,
      verbalAnswer: `${cit} I think C++ syntax blocks nested while inside for`,
      workImages: [{ mimeType: "image/png", data: validPng, caption: "trace" }],
    };
    const submit1 = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify(goodOverconfBody),
    });
    assert.strictEqual(submit1.status, 200);
    const submit1Json = (await submit1.json()) as {
      evaluation: SubmissionEvaluation;
      session: PatternSessionState;
    };

    assert.strictEqual(telemetry.evalSawImages, 1);
    assert.strictEqual(telemetry.evalSawExpandedCitation, true);
    assert.strictEqual(telemetry.evalSawSideDeltaWatermark, true);
    assert.strictEqual(submit1Json.evaluation.confidenceDiagnostic, "overconfident");
    assert.strictEqual(
      submit1Json.evaluation.twistedFollowUp?.twistOperator,
      "break-the-premise",
    );
    assert.ok(submit1Json.evaluation.visualArtifact?.verifiedByAuditor);
    assert.strictEqual(submit1Json.session.currentQuestion?.modality, "twisted_followup");

    // Verify GET /session/:id strips raw base64 .data from public imageSnapshots while DB retains raw base64
    const publicGet = (await (await fetch(`${base}/session/${s1}`, {
      headers: { "x-test-uid": "u_master" },
    })).json()) as { session: PatternSessionState };
    const snapVals = Object.values(publicGet.session.imageSnapshots ?? {});
    assert.strictEqual(snapVals.length, 1);
    assert.strictEqual(snapVals[0]?.data, "");
    assert.ok((Object.values(sessions.get(s1)?.imageSnapshots ?? {})[0]?.data?.length ?? 0) > 10);

    // Idempotent duplicate submit replay returns identical evaluation without re-scoring
    const dupSubmit = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify(goodOverconfBody),
    });
    assert.strictEqual(dupSubmit.status, 200);
    assert.strictEqual(((await dupSubmit.json()) as { idempotentReplay?: boolean }).idempotentReplay, true);

    // Check watermarked side updates consumed: pending updates count drops to 0 after eval turn
    assert.strictEqual(collectPendingSideUpdates(sessions.get(s1)!).deliveredCount, 0);

    // --- E. Wave 3 /visualize XSS + Overlap Repair Loop ---
    const vizRes = await fetch(`${base}/session/${s1}/visualize`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify({ brief: "Trace [1, 1, 1, 100] multi-step shrink" }),
    });
    assert.strictEqual(vizRes.status, 200);
    const vizJson = (await vizRes.json()) as {
      visual: { svg?: string; verifiedByAuditor: boolean };
      session: PatternSessionState;
    };
    assert.strictEqual(telemetry.visualRepairPasses, 2);
    assert.strictEqual(vizJson.visual.verifiedByAuditor, true);
    assert.ok(!vizJson.visual.svg?.includes("<script"));
    assert.strictEqual(vizJson.session.currentQuestion?.visualArtifact?.verifiedByAuditor, true);

    // Resolve twisted follow-up with UNDERCONFIDENT 25% -> recovery & scorecard finish
    const twistSubmit = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s1,
      action: {
        kind: "submit",
        payload: {
          sessionId: s1,
          questionId: vizJson.session.currentQuestion!.id,
          attemptId: "att_twist_resolve",
          confidence: 25,
          verbalAnswer:
            "L advances across all three 1s in one while loop so the window total drops below 10.",
        },
      },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    assert.strictEqual(twistSubmit.evaluation?.confidenceDiagnostic, "underconfident");

    const finishRun1 = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s1,
      action: { kind: "finish" },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    assert.strictEqual(finishRun1.session.stage, "completed");
    const sc1 = finishRun1.session.scorecard as MasteryScorecard;
    assert.ok(sc1 && sc1.overallScore >= 0 && sc1.overallScore <= 100);
    assert.ok(sc1.strandBreakdown.length >= 4);

    // --- F. Run 2 on binary-search (Pro Track Code Sandbox + WebP Intake + Bounded Context Window) ---
    const start2 = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify({ patternId: "binary-search" }),
    });
    assert.strictEqual(start2.status, 200);
    const { session: run2 } = (await start2.json()) as {
      session: PatternSessionState;
    };
    const s2 = run2.sessionId;

    const proSel = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s2,
      action: { kind: "select_level", track: "pro" },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    assert.strictEqual(proSel.session.stage, "questioning");
    assert.strictEqual(proSel.session.currentQuestion?.modality, "mcq");

    // Pass Pro Q1 (MCQ) -> advances to Q2 (Verbal)
    const proQ1Res = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s2,
      action: {
        kind: "submit",
        payload: {
          sessionId: s2,
          questionId: proSel.session.currentQuestion!.id,
          attemptId: "att_pro_q1",
          selectedOptions: ["half_open"],
          confidence: 80,
          verbalAnswer: "Keep mid inside [lo, hi) when a[mid] >= target.",
        },
      },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    assert.strictEqual(proQ1Res.session.currentQuestion?.modality, "verbal_text");

    // Pass Pro Q2 (Verbal) -> unlocks Pro Q3 Case Study (code_snippet)
    const proQ2Res = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s2,
      action: {
        kind: "submit",
        payload: {
          sessionId: s2,
          questionId: proQ1Res.session.currentQuestion!.id,
          attemptId: "att_pro_q2",
          confidence: 80,
          verbalAnswer: "l = m + 1 and r = m shrinks strictly on left-biased floor.",
        },
      },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    assert.strictEqual(proQ2Res.session.currentQuestion?.modality, "code_snippet");

    const codeRes = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_master" },
      body: JSON.stringify({
        sessionId: s2,
        questionId: proQ2Res.session.currentQuestion!.id,
        attemptId: "att_pro_bs",
        confidence: 80,
        code: "int lowerBound(vector<int>& a, int t){ int l=0, r=a.size(); while(l<r){ int m=l+(r-l)/2; if(a[m]>=t) r=m; else l=m+1; } return l; }",
        language: "cpp",
        claimedTimeComplexity: "O(log n)",
        claimedSpaceComplexity: "O(1)",
        runSandbox: true,
        verbalAnswer: "Half-open interval [l, r) guarantees convergence without overflow.",
        workImages: [
          {
            mimeType: "image/webp",
            data: makeWebpVp8xBase64(320, 200),
            caption: "invariant sketch [l, r)",
          },
        ],
      }),
    });
    assert.strictEqual(codeRes.status, 200);
    const codeJson = (await codeRes.json()) as {
      evaluation: SubmissionEvaluation;
      profile: { recentSessions: unknown[]; errorSignatures: unknown[] };
    };
    assert.strictEqual(telemetry.proCaseStudySawSandbox, true);
    assert.strictEqual(codeJson.evaluation.codeAudit?.tier, "Optimal");
    assert.strictEqual(codeJson.evaluation.confidenceDiagnostic, "well_calibrated");

    const finishRun2 = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: s2,
      action: { kind: "finish" },
      getHeaders: async () => ({ "x-test-uid": "u_master" }),
    });
    assert.strictEqual(finishRun2.session.stage, "completed");
    const finalProfile = profiles.get("u_master")!;
    assert.ok(finalProfile.recentSessions.length >= 2);
    assert.ok(finalProfile.errorSignatures.length <= 30);
    assert.ok(finalProfile.recentSessions.length <= 20);

    // Strict topic completion % check: single session does NOT falsely complete a topic
    const swAgg = computePatternAggregateMetrics("sliding-window", finalProfile);
    const bsAgg = computePatternAggregateMetrics("binary-search", finalProfile);
    assert.ok(swAgg.masteryPercent < 25, `Expected strict sw mastery < 25, got ${swAgg.masteryPercent}`);
    assert.ok(bsAgg.masteryPercent > 0 && bsAgg.masteryPercent < 35, `Expected incremental bs mastery 1..34, got ${bsAgg.masteryPercent}`);
    assert.strictEqual(bsAgg.masteredStrands, 0);

    // Bounded context window check across final session state
    const digest = buildSessionDigest(
      sessions.get(s1)!,
      profiles.get("u_master")!,
      "sliding-window:shrink-loop-invariant",
    );
    assert.ok(digest.length <= DEFAULT_CONTEXT_BUDGET_CHARS);
    assert.ok(digest.length > 0);
  });
});

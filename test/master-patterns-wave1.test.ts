import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  createDeliverQuestionTool,
  createLookupStrandDagTool,
  runPatternRoleAgentLoop,
  type PatternModelStepCaller,
} from "../src/lib/master-patterns/agent-tools.server";
import { createMasterPatternsRouter } from "../src/lib/master-patterns/router.server";
import {
  createEmptyUserPatternProfile,
  enforceProfileBounds,
} from "../src/lib/master-patterns/scheduler";
import { createNewPatternSession } from "../src/lib/master-patterns/engine.server";
import {
  reattachPatternTurnStream,
  runPatternTurnWithRecovery,
  steerActivePatternTurn,
} from "../src/lib/master-patterns/session-controller";
import type {
  PatternSessionState,
  PatternTurnStreamEvent,
  UserPatternProfile,
} from "../src/lib/master-patterns/types";

function createWave1Harness(stepCaller?: PatternModelStepCaller) {
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
      codeRunner: async () => ({
        status: "success",
        stdout: "ALL_TESTS_PASSED 3/3\n",
        stderr: "",
        exitCode: 0,
        executionTimeMs: 12,
      }),
    },
  });

  const app = express();
  app.use(express.json());
  app.use("/api/patterns", router);

  return { app, profiles, sessions };
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

test("Wave 1 Tool Loop: explores DAG, rejects invalid terminating args for self-repair, and heals stringified arrays", async () => {
  const profile = createEmptyUserPatternProfile("u_tool_test");
  const session = createNewPatternSession("u_tool_test", "sliding-window");
  const toolEvents: Array<{ name: string; isError: boolean; healed: boolean }> =
    [];

  let stepSeen = 0;
  const result = await runPatternRoleAgentLoop({
    role: "teacher",
    systemPrompt: "Generate question",
    userPrompt: "Target monotonic window",
    tools: [createLookupStrandDagTool(), createDeliverQuestionTool()],
    toolCtx: { session, profile, sandboxCallsUsed: 0 },
    stepCaller: async (req) => {
      stepSeen = req.step;
      if (req.step === 1) {
        req.onReasoningDelta?.("Checking prerequisites in DAG...");
        return {
          reasoning: "Checking prerequisites in DAG...",
          functionCalls: [
            {
              id: "call_0",
              name: "lookup_strand_dag",
              args: { strandId: "sliding-window:monotonicity-condition" },
            },
          ],
        };
      }
      if (req.step === 2) {
        // Deliberately invalid MCQ (only 1 option + unmatching correctOptionValues) -> must stay in loop!
        return {
          functionCalls: [
            {
              id: "call_0", // Reused ID like DeepSeek -> Lacan uniquifier must prevent collision
              name: "deliver_question",
              args: {
                modality: "mcq",
                prompt: "Why does sliding window require monotonicity?",
                options: [{ value: "a", label: "Only option" }],
                correctOptionValues: ["non_existent"],
                expectedReasoning: "Monotonicity allows O(n) shrink.",
                keyInvariantsRequired: ["monotonicity"],
              },
            },
          ],
        };
      }
      // Step 3: Model reads Zod error from step 2 and self-repairs with stringified correctOptionValues
      const lastMsg = req.messages[req.messages.length - 1];
      assert.strictEqual(lastMsg?.role, "tool");
      assert.strictEqual((lastMsg as { response: { isError?: boolean } }).response.isError, true);

      return {
        functionCalls: [
          {
            id: "call_fixed",
            name: "deliver_question",
            args: {
              modality: "mcq",
              questionRole: "check",
              prompt:
                "Why must subarray additions keep the constraint monotonic when shrinking left?",
              options: [
                {
                  value: "mono",
                  label: "Shrinking guarantees constraint moves monotonically one way.",
                },
                {
                  value: "sort",
                  label: "Elements are sorted before expanding right.",
                },
              ],
              correctOptionValues: '["mono"]', // Stringified array -> boundary healer recovers it!
              expectedReasoning: "Non-negative values guarantee shrinking strictly reduces sum.",
              keyInvariantsRequired: '["monotonicity"]',
            },
          },
        ],
      };
    },
    callbacks: {
      onToolCallEnd: (_id, name, isError, healed) => {
        toolEvents.push({ name, isError, healed });
      },
    },
  });

  assert.strictEqual(stepSeen, 3);
  assert.strictEqual(toolEvents.length, 3);
  assert.deepStrictEqual(toolEvents[0], {
    name: "lookup_strand_dag",
    isError: false,
    healed: false,
  });
  assert.deepStrictEqual(toolEvents[1], {
    name: "deliver_question",
    isError: true,
    healed: false,
  });
  assert.deepStrictEqual(toolEvents[2], {
    name: "deliver_question",
    isError: false,
    healed: true,
  });
  assert.strictEqual(result.deliveredTool?.name, "deliver_question");
  assert.deepStrictEqual(result.deliveredTool?.output.correctOptionValues, [
    "mono",
  ]);
});

test("Wave 1 Router SSE + Mid-Run Steer + Anti-Leakage + Trace", async () => {
  let step1StartedResolve!: () => void;
  const step1Started = new Promise<void>((r) => {
    step1StartedResolve = r;
  });
  let allowStep1FinishResolve!: () => void;
  const allowStep1Finish = new Promise<void>((r) => {
    allowStep1FinishResolve = r;
  });

  let sawSteerInPrompt = false;

  const stepCaller: PatternModelStepCaller = async (req) => {
    if (req.step === 1) {
      step1StartedResolve();
      req.onReasoningDelta?.("Running sandbox check first...");
      await allowStep1Finish;
      return {
        reasoning: "Running sandbox check first...",
        functionCalls: [
          {
            id: "c1",
            name: "search_pattern_problems",
            args: { query: "monotonic stack" },
          },
        ],
      };
    }

    sawSteerInPrompt = req.messages.some(
      (m) =>
        m.role === "user" &&
        m.text.includes("Focus on duplicate elements edge case"),
    );

    return {
      functionCalls: [
        {
          id: "c2",
          name: "deliver_question",
          args: {
            modality: "mcq",
            questionRole: "check",
            prompt:
              "When duplicate heights appear on a monotonic stack, which pop inequality preserves strict nearest smaller boundaries?",
            options: [
              { value: "geq", label: "Pop while stack.top() >= current" },
              { value: "always", label: "Always push without popping" },
            ],
            correctOptionValues: ["geq"],
            expectedReasoning: "Equal elements require strict/non-strict tie breaking.",
            keyInvariantsRequired: ["monotonic stack tie breaking"],
          },
        },
      ],
    };
  };

  const { app } = createWave1Harness(stepCaller);

  await withServer(app, async (base) => {
    const startRes = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_steer" },
      body: JSON.stringify({ patternId: "monotonic-stack" }),
    });
    const { session } = (await startRes.json()) as {
      session: PatternSessionState;
    };

    const events: PatternTurnStreamEvent[] = [];
    const headers = async () => ({ "x-test-uid": "u_steer" });

    const turnPromise = runPatternTurnWithRecovery({
      basePath: base,
      sessionId: session.sessionId,
      action: { kind: "select_level", track: "pro" },
      getHeaders: headers,
      onEvent: (ev) => events.push(ev),
    });

    await step1Started;
    const steerRes = await steerActivePatternTurn({
      basePath: base,
      sessionId: session.sessionId,
      text: "Focus on duplicate elements edge case",
      getHeaders: headers,
    });
    assert.strictEqual(steerRes.accepted, true);
    allowStep1FinishResolve();

    const settled = await turnPromise;
    assert.strictEqual(sawSteerInPrompt, true);
    assert.strictEqual(settled.session.stage, "questioning");
    assert.ok(settled.session.currentQuestion);
    assert.strictEqual(
      "rubric" in settled.session.currentQuestion,
      false,
      "Rubric must never cross SSE wire in turn_settled",
    );
    assert.ok(
      !JSON.stringify(events).includes('"expectedReasoning"'),
      "Intermediate tool previews must never leak rubric answers",
    );
    assert.ok(events.some((e) => e.type === "steer_applied"));
    assert.ok(events.some((e) => e.type === "tool_call_end"));
    assert.strictEqual(
      settled.session.lastTurnTrace?.steersApplied?.[0],
      "Focus on duplicate elements edge case",
    );
  });
});

test("Wave 1 Disconnect Survival, /stream Replay, 409 Recovery & Abort", async () => {
  let stepStartedResolve!: () => void;
  const stepStarted = new Promise<void>((r) => {
    stepStartedResolve = r;
  });
  let finishTurnResolve!: () => void;
  const finishTurn = new Promise<void>((r) => {
    finishTurnResolve = r;
  });

  let callCount = 0;
  const stepCaller: PatternModelStepCaller = async (req) => {
    callCount += 1;
    stepStartedResolve();
    // Emit rapid updates to exercise coalescing
    req.onReasoningDelta?.("chunk-1 ");
    req.onReasoningDelta?.("chunk-1 chunk-2 ");
    req.onReasoningDelta?.("chunk-1 chunk-2 final-thought");
    await finishTurn;
    return {
      reasoning: "chunk-1 chunk-2 final-thought",
      functionCalls: [
        {
          id: "deliver_n",
          name: "deliver_notes",
          args: {
            unconditionalTruths: [
              { title: "Sorted Order", statement: "Search space is monotonic." },
            ],
            motivatedDiscovery: {
              bruteForceBottleneck: "O(n) linear scan repeats work.",
              keyInsight: "Midpoint halves remaining candidates.",
              whyItWorks: "Monotonic predicate splits cleanly.",
            },
            canonicalTemplate: {
              language: "cpp",
              code: "int l=0,r=n-1; while(l<r){int m=l+(r-l)/2; if(ok(m)) r=m; else l=m+1;}",
              invariantAnnotation: "Answer remains inside [l..r]",
            },
            pitfalls: [
              {
                trap: "Overflow on (l+r)/2 or infinite loop on r=m",
                counterexample: "l=0, r=1, m=0 when using l=m",
                fix: "Use l+(r-l)/2 and strict shrink progress.",
              },
            ],
          },
        },
      ],
    };
  };

  const { app } = createWave1Harness(stepCaller);

  await withServer(app, async (base) => {
    const startRes = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_rec" },
      body: JSON.stringify({ patternId: "binary-search" }),
    });
    const { session } = (await startRes.json()) as {
      session: PatternSessionState;
    };

    // 1. Start streaming POST and abort ONLY the client HTTP socket mid-flight (browser tab reload)
    const clientAbort = new AbortController();
    const postPromise = fetch(`${base}/session/${session.sessionId}/turn`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Accept: "text/event-stream",
        "x-test-uid": "u_rec",
      },
      body: JSON.stringify({
        action: { kind: "select_level", track: "intermediate" },
      }),
      signal: clientAbort.signal,
    }).then(async (res) => {
      const reader = res.body!.getReader();
      await reader.read(); // Read turn_started frame
      clientAbort.abort(); // Drop connection without calling /abort!
    });

    await stepStarted;
    await postPromise.catch(() => {});

    // 2. GET /session/:id must reveal turnInFlight: true while server continues execution
    const snapRes = await fetch(`${base}/session/${session.sessionId}`, {
      headers: { "x-test-uid": "u_rec" },
    });
    const snapJson = (await snapRes.json()) as { session: PatternSessionState };
    assert.strictEqual(snapJson.session.turnInFlight, true);

    // 3. Reattach via GET /session/:id/stream AND verify 409 recovery catches up without double inference
    const reattachedEvents: PatternTurnStreamEvent[] = [];
    const reattachPromise = reattachPatternTurnStream({
      basePath: base,
      sessionId: session.sessionId,
      getHeaders: async () => ({ "x-test-uid": "u_rec" }),
      onEvent: (e) => reattachedEvents.push(e),
    });

    const competingPromise = runPatternTurnWithRecovery({
      basePath: base,
      sessionId: session.sessionId,
      action: { kind: "select_level", track: "intermediate" },
      getHeaders: async () => ({ "x-test-uid": "u_rec" }),
      pollMs: 25,
      waitMaxMs: 2000,
    });

    await new Promise((r) => setTimeout(r, 40));
    finishTurnResolve();

    const [settled, competingRes] = await Promise.all([
      reattachPromise,
      competingPromise,
    ]);
    assert.strictEqual(callCount, 1, "Background turn must run only once across disconnect + 409");
    assert.strictEqual(settled.session.stage, "studying_notes");
    assert.strictEqual(competingRes.session.stage, "studying_notes");
    assert.ok(settled.session.notes?.unconditionalTruths.length);
    const reasoningFrames = reattachedEvents.filter(
      (e) => e.type === "reasoning_update",
    );
    assert.ok(
      reasoningFrames.length <= 2,
      `Expected coalesced reasoning replay <= 2 frames, got ${reasoningFrames.length}`,
    );

    // 4. Test explicit server abort preserves stage without corrupting session
    let stepAbortReached!: () => void;
    const waitAbortStep = new Promise<void>((r) => {
      stepAbortReached = r;
    });
    const abortAppHarness = createWave1Harness(async (req) => {
      stepAbortReached();
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2000);
        if (typeof timer.unref === "function") timer.unref();
        req.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
      return null;
    });
    await withServer(abortAppHarness.app, async (abortBase) => {
      const s2 = (
        await (
          await fetch(`${abortBase}/session/start`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-test-uid": "u_abort",
            },
            body: JSON.stringify({ patternId: "two-pointers" }),
          })
        ).json()
      ) as { session: PatternSessionState };

      const abortTurnPromise = runPatternTurnWithRecovery({
        basePath: abortBase,
        sessionId: s2.session.sessionId,
        action: { kind: "start_probe" },
        getHeaders: async () => ({ "x-test-uid": "u_abort" }),
      });

      await waitAbortStep;
      const abortApi = await fetch(
        `${abortBase}/session/${s2.session.sessionId}/abort`,
        {
          method: "POST",
          headers: { "x-test-uid": "u_abort" },
        },
      );
      assert.strictEqual(abortApi.status, 202);
      const settledAbort = await abortTurnPromise;
      assert.strictEqual(settledAbort.aborted, true);
      assert.strictEqual(settledAbort.session.stage, "calibration");
    });
  });
});

test("Wave 1 Client Premature EOF Recovery via mock fetch", async () => {
  const session = createNewPatternSession("u_eof", "sliding-window");
  const enc = new TextEncoder();

  const settledPayload = {
    type: "turn_settled" as const,
    turnId: "t_1",
    sessionId: session.sessionId,
    session: { ...session, stage: "studying_notes" as const },
    timestamp: Date.now(),
  };

  let postCalls = 0;
  let streamCalls = 0;
  const mockFetch = (async (url: string) => {
    if (String(url).endsWith("/turn")) {
      postCalls += 1;
      // Drop connection prematurely after one partial event (no [DONE], no turn_settled)
      return new Response(
        new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(
              enc.encode(
                `data: ${JSON.stringify({
                  type: "turn_started",
                  turnId: "t_1",
                  sessionId: session.sessionId,
                  role: "teacher",
                  action: "select_level",
                  timestamp: Date.now(),
                })}\n\n`,
              ),
            );
            ctrl.close(); // Premature EOF!
          },
        }),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    }
    if (String(url).endsWith("/stream")) {
      streamCalls += 1;
      return new Response(
        new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(
              enc.encode(`data: ${JSON.stringify(settledPayload)}\n\ndata: [DONE]\n\n`),
            );
            ctrl.close();
          },
        }),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  }) as unknown as typeof globalThis.fetch;

  const res = await runPatternTurnWithRecovery({
    sessionId: session.sessionId,
    action: { kind: "select_level", track: "intermediate" },
    fetchImpl: mockFetch,
    pollMs: 10,
  });

  assert.strictEqual(postCalls, 1);
  assert.strictEqual(streamCalls, 1);
  assert.strictEqual(res.session.stage, "studying_notes");
});

import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import { createMasterPatternsRouter } from "../src/lib/master-patterns/router.server";
import { createEmptyUserPatternProfile } from "../src/lib/master-patterns/scheduler";
import type {
  PatternSessionState,
  UserPatternProfile,
} from "../src/lib/master-patterns/types";

function createTestHarness(opts?: { aiDelayMs?: number }) {
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
    getProfile: async (uid) =>
      profiles.get(uid) ?? createEmptyUserPatternProfile(uid),
    saveProfile: async (uid, p) => {
      profiles.set(uid, p);
      return p;
    },
    getSession: async (id) => sessions.get(id) ?? null,
    saveSession: async (s) => {
      sessions.set(s.sessionId, s);
      return s;
    },
    engineDeps: {
      aiCaller: async () => {
        if (opts?.aiDelayMs) {
          await new Promise((r) => setTimeout(r, opts.aiDelayMs));
        }
        return null;
      },
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
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("Phase 3 API: full Intermediate lifecycle, anti-leakage, idempotent replay & scorecard", async () => {
  const { app } = createTestHarness();

  await withServer(app, async (base) => {
    // 1. Unauthenticated rejected
    const unauth = await fetch(`${base}/profile`);
    assert.strictEqual(unauth.status, 401);

    // 2. Load profile
    const profRes = await fetch(`${base}/profile`, {
      headers: { "x-test-uid": "u_alpha" },
    });
    assert.strictEqual(profRes.status, 200);
    const profJson = (await profRes.json()) as any;
    assert.strictEqual(profJson.patterns.length, 12);

    // 3. Start session
    const startRes = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_alpha" },
      body: JSON.stringify({ patternId: "sliding-window" }),
    });
    assert.strictEqual(startRes.status, 200);
    const startJson = (await startRes.json()) as any;
    const sessionId = startJson.session.sessionId;
    assert.strictEqual(startJson.session.stage, "calibration");

    // 4. Select intermediate -> tailored notes
    const levelRes = await fetch(`${base}/session/select-level`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_alpha" },
      body: JSON.stringify({ sessionId, track: "intermediate" }),
    });
    assert.strictEqual(levelRes.status, 200);
    const levelJson = (await levelRes.json()) as any;
    assert.strictEqual(levelJson.session.stage, "studying_notes");
    assert.ok(levelJson.session.notes.unconditionalTruths.length >= 1);

    // 5. Ready questions -> strips rubric!
    const readyRes = await fetch(`${base}/session/ready-questions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_alpha" },
      body: JSON.stringify({ sessionId }),
    });
    assert.strictEqual(readyRes.status, 200);
    const readyJson = (await readyRes.json()) as any;
    const q1 = readyJson.session.currentQuestion;
    assert.ok(q1);
    assert.strictEqual("rubric" in q1, false, "Rubric must never leak over HTTP");

    // 6. Submit answer with hidden gap -> triggers twistedFollowUp without leaking rubric
    const subRes = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_alpha" },
      body: JSON.stringify({
        sessionId,
        questionId: q1.id,
        attemptId: "att_http_1",
        selectedOptions: ["invariant"],
        verbalAnswer: "",
      }),
    });
    assert.strictEqual(subRes.status, 200);
    const subJson = (await subRes.json()) as any;
    assert.strictEqual(subJson.evaluation.hiddenGapDetected, true);
    assert.ok(subJson.evaluation.twistedFollowUp);
    assert.strictEqual("rubric" in subJson.evaluation.twistedFollowUp, false);

    // 7. Idempotent retry with same attemptId
    const replayRes = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_alpha" },
      body: JSON.stringify({
        sessionId,
        questionId: q1.id,
        attemptId: "att_http_1",
        selectedOptions: ["invariant"],
        verbalAnswer: "",
      }),
    });
    assert.strictEqual(replayRes.status, 200);
    const replayJson = (await replayRes.json()) as any;
    assert.strictEqual(replayJson.idempotentReplay, true);

    // 8. Finish session
    const finRes = await fetch(`${base}/session/finish`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_alpha" },
      body: JSON.stringify({ sessionId }),
    });
    assert.strictEqual(finRes.status, 200);
    const finJson = (await finRes.json()) as any;
    assert.strictEqual(finJson.session.stage, "completed");
    assert.ok(typeof finJson.scorecard.completenessScore === "number");
  });
});

test("Phase 3 API: cross-user isolation (403), Zod validation (400), stale question & concurrent turn lock (409)", async () => {
  const { app } = createTestHarness({ aiDelayMs: 120 });

  await withServer(app, async (base) => {
    // Bad patternId -> 400
    const badStart = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_one" },
      body: JSON.stringify({ patternId: "not-a-pattern" }),
    });
    assert.strictEqual(badStart.status, 400);

    const startRes = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_one" },
      body: JSON.stringify({ patternId: "binary-search" }),
    });
    const { session } = (await startRes.json()) as any;

    // Cross-user access -> 403
    const hijackRes = await fetch(`${base}/session/${session.sessionId}`, {
      headers: { "x-test-uid": "u_two" },
    });
    assert.strictEqual(hijackRes.status, 403);

    // Lock Pro level
    const lvlRes = await fetch(`${base}/session/select-level`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_one" },
      body: JSON.stringify({ sessionId: session.sessionId, track: "pro" }),
    });
    const lvlJson = (await lvlRes.json()) as any;
    const activeQ = lvlJson.session.currentQuestion;

    // Concurrent submissions on same session -> one succeeds (200), one gets 409 Conflict
    const p1 = fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_one" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        questionId: activeQ.id,
        attemptId: "race_1",
        selectedOptions: ["invariant"],
        verbalAnswer: "Maintaining [L, R] search bounds avoids missing the target.",
      }),
    });
    const p2 = fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_one" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        questionId: activeQ.id,
        attemptId: "race_2",
        selectedOptions: ["invariant"],
        verbalAnswer: "Duplicate racing click",
      }),
    });
    const [r1, r2] = await Promise.all([p1, p2]);
    const statuses = [r1.status, r2.status].sort();
    assert.deepStrictEqual(statuses, [200, 409]);

    // Stale questionId with fresh attemptId -> 409
    const staleRes = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_one" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        questionId: activeQ.id,
        attemptId: "after_resolved",
        selectedOptions: ["invariant"],
      }),
    });
    assert.strictEqual(staleRes.status, 409);
  });
});

test("Phase 3 API: cold-start session rehydration recovers active question cleanly", async () => {
  const { app, sessions } = createTestHarness();

  await withServer(app, async (base) => {
    const startRes = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_cold" },
      body: JSON.stringify({ patternId: "two-pointers" }),
    });
    const { session } = (await startRes.json()) as any;

    await fetch(`${base}/session/select-level`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_cold" },
      body: JSON.stringify({ sessionId: session.sessionId, track: "pro" }),
    });

    // Simulate server restart / cache eviction
    sessions.delete(session.sessionId);
    const missing = await fetch(`${base}/session/${session.sessionId}`, {
      headers: { "x-test-uid": "u_cold" },
    });
    assert.strictEqual(missing.status, 404);

    // Rehydrate from client IndexedDB metadata
    const rehydrateRes = await fetch(`${base}/session/rehydrate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_cold" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        patternId: "two-pointers",
        track: "pro",
        stage: "questioning",
      }),
    });
    assert.strictEqual(rehydrateRes.status, 200);
    const rehydrated = (await rehydrateRes.json()) as any;
    assert.ok(rehydrated.session.currentQuestion);
    assert.strictEqual("rubric" in rehydrated.session.currentQuestion, false);
  });
});

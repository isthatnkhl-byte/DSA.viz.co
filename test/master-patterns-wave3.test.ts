import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import express, { type NextFunction, type Request, type Response } from "express";
import { getPatternDefinition } from "../src/data/patterns";
import { createMasterPatternsRouter } from "../src/lib/master-patterns/router.server";
import {
  applyStrandReviewUpdate,
  classifyConfidenceCalibration,
  computePatternAggregateMetrics,
  createEmptyUserPatternProfile,
  enforceProfileBounds,
} from "../src/lib/master-patterns/scheduler";
import {
  ImageIntakeError,
  MAX_SESSION_IMAGE_SNAPSHOTS,
  detectImageMimeFromBytes,
  readImageDimensionsFromBytes,
  validateAndIngestSubmittedImages,
} from "../src/lib/master-patterns/image-intake";
import {
  generateAndVerifyPatternVisual,
  sanitizeAndAuditSvg,
  verifyExcalidrawVisualSpec,
} from "../src/lib/master-patterns/visual-agent.server";
import type { PatternModelStepCaller } from "../src/lib/master-patterns/agent-tools.server";
import { runPatternTurnWithRecovery } from "../src/lib/master-patterns/session-controller";
import type {
  PatternSessionState,
  UserPatternProfile,
} from "../src/lib/master-patterns/types";

/** Builds a valid PNG binary with IHDR width/height (sufficient for header sniffer & dimension bounds). */
function makePngBase64(width: number, height: number, fillByte = 0): string {
  const buf = Buffer.alloc(33, fillByte);
  // PNG magic
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  // IHDR chunk length = 13
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  buf[24] = 8; // bit depth
  buf[25] = 2; // color type RGB
  return buf.toString("base64");
}

function makeGifBase64(width: number, height: number): string {
  const buf = Buffer.alloc(16, 0);
  buf.write("GIF89a", 0, "ascii");
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf.toString("base64");
}

function makeJpegBase64(width: number, height: number): string {
  const buf = Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x0b, // length 11
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03, // components
    0x01,
    0x11,
    0x00,
    0xff,
    0xd9, // EOI
  ]);
  return buf.toString("base64");
}

function makeWebpVp8xBase64(width: number, height: number): string {
  const buf = Buffer.alloc(30, 0);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(22, 4);
  buf.write("WEBP", 8, "ascii");
  buf.write("VP8X", 12, "ascii");
  buf.writeUInt32LE(10, 16);
  const wm1 = width - 1;
  const hm1 = height - 1;
  buf[24] = wm1 & 0xff;
  buf[25] = (wm1 >> 8) & 0xff;
  buf[26] = (wm1 >> 16) & 0xff;
  buf[27] = hm1 & 0xff;
  buf[28] = (hm1 >> 8) & 0xff;
  buf[29] = (hm1 >> 16) & 0xff;
  return buf.toString("base64");
}

function createWave3Harness(opts?: {
  stepCaller?: PatternModelStepCaller;
  visualModelCaller?: Parameters<typeof createMasterPatternsRouter>[0]["engineDeps"] extends infer E
    ? E extends { visualModelCaller?: infer V }
      ? V
      : never
    : never;
}) {
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
      stepCaller: opts?.stepCaller,
      visualModelCaller: opts?.visualModelCaller,
    },
  });

  const app = express();
  app.use(express.json({ limit: "4mb" }));
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

test("Wave 3 Confidence Calibration: classification, choseIdk suppression & FSRS/bias math", () => {
  assert.strictEqual(
    classifyConfidenceCalibration({
      confidence: 90,
      isCorrect: false,
      hiddenGapDetected: false,
      score: 20,
    }),
    "overconfident",
  );
  assert.strictEqual(
    classifyConfidenceCalibration({
      confidence: 80,
      isCorrect: true,
      hiddenGapDetected: true,
      score: 65,
    }),
    "overconfident",
  );
  assert.strictEqual(
    classifyConfidenceCalibration({
      confidence: 25,
      isCorrect: true,
      hiddenGapDetected: false,
      score: 90,
    }),
    "underconfident",
  );
  assert.strictEqual(
    classifyConfidenceCalibration({
      confidence: 80,
      isCorrect: true,
      hiddenGapDetected: false,
      score: 92,
    }),
    "well_calibrated",
  );
  // choseIdk overrides even high confidence to "honest_gap"
  assert.strictEqual(
    classifyConfidenceCalibration({
      confidence: 95,
      choseIdk: true,
      isCorrect: false,
      hiddenGapDetected: false,
      score: 0,
    }),
    "honest_gap",
  );

  // Check applyStrandReviewUpdate bias & stability dynamics
  let profile = createEmptyUserPatternProfile("u_conf");
  const strandId = "sliding-window:monotonicity-condition";

  // 1. Overconfident miss (>=80) adds +32 calibrationBias
  profile = applyStrandReviewUpdate(profile, {
    patternId: "sliding-window",
    strandId,
    score: 20,
    isCorrect: false,
    hiddenGapDetected: false,
    missClass: "invariant-break",
    hintRung: null,
    confidence: 90,
  });
  assert.strictEqual(profile.strands[strandId]?.calibrationBias, 32);

  // 2. Honest gap decays existing positive bias (* 0.85) instead of penalizing
  profile = applyStrandReviewUpdate(profile, {
    patternId: "sliding-window",
    strandId,
    score: 0,
    isCorrect: false,
    hiddenGapDetected: false,
    missClass: "cue",
    hintRung: "R1",
    confidence: 95,
    choseIdk: true,
  });
  assert.strictEqual(profile.strands[strandId]?.calibrationBias, Math.round(32 * 0.85));

  // 3. Underconfident clean pass subtracts -15 bias & applies 0.85 stability factor
  const prevStability = profile.strands[strandId]!.stabilityDays;
  const prevBias = profile.strands[strandId]!.calibrationBias;
  profile = applyStrandReviewUpdate(profile, {
    patternId: "sliding-window",
    strandId,
    score: 88,
    isCorrect: true,
    hiddenGapDetected: false,
    missClass: null,
    hintRung: null,
    confidence: 25,
  });
  assert.strictEqual(profile.strands[strandId]?.calibrationBias, prevBias - 15);
  assert.ok(profile.strands[strandId]!.stabilityDays > prevStability);
});

test("Wave 3 Image Intake: pure-TS sniffing, header bounds, spoof rejection & SHA-256 LRU cap", () => {
  const pngBytes = Buffer.from(makePngBase64(320, 180), "base64");
  const gifBytes = Buffer.from(makeGifBase64(200, 100), "base64");
  const jpgBytes = Buffer.from(makeJpegBase64(640, 480), "base64");
  const webpBytes = Buffer.from(makeWebpVp8xBase64(420, 210), "base64");

  assert.strictEqual(detectImageMimeFromBytes(pngBytes), "image/png");
  assert.strictEqual(detectImageMimeFromBytes(gifBytes), "image/gif");
  assert.strictEqual(detectImageMimeFromBytes(jpgBytes), "image/jpeg");
  assert.strictEqual(detectImageMimeFromBytes(webpBytes), "image/webp");

  assert.deepStrictEqual(readImageDimensionsFromBytes(pngBytes, "image/png"), {
    width: 320,
    height: 180,
  });
  assert.deepStrictEqual(readImageDimensionsFromBytes(gifBytes, "image/gif"), {
    width: 200,
    height: 100,
  });
  assert.deepStrictEqual(readImageDimensionsFromBytes(jpgBytes, "image/jpeg"), {
    width: 640,
    height: 480,
  });
  assert.deepStrictEqual(readImageDimensionsFromBytes(webpBytes, "image/webp"), {
    width: 420,
    height: 210,
  });

  // MIME spoof rejection (JPEG bytes claimed as PNG)
  assert.throws(
    () =>
      validateAndIngestSubmittedImages([
        { mimeType: "image/png", data: makeJpegBase64(100, 100) },
      ]),
    (err: unknown) => err instanceof ImageIntakeError && err.statusCode === 400,
  );

  // Dimension bomb rejection (>4096 px side)
  assert.throws(
    () =>
      validateAndIngestSubmittedImages([
        { mimeType: "image/png", data: makePngBase64(5000, 5000) },
      ]),
    (err: unknown) => err instanceof ImageIntakeError && /exceed safety bounds/.test(err.message),
  );

  // Exceeding per-turn count (>2)
  assert.throws(
    () =>
      validateAndIngestSubmittedImages([
        { mimeType: "image/png", data: makePngBase64(100, 100, 1) },
        { mimeType: "image/png", data: makePngBase64(100, 100, 2) },
        { mimeType: "image/png", data: makePngBase64(100, 100, 3) },
      ]),
    (err: unknown) => err instanceof ImageIntakeError && /At most 2/.test(err.message),
  );

  // SHA-256 deduplication + bounded LRU cache (MAX_SESSION_IMAGE_SNAPSHOTS = 6)
  let snapshotMap = {};
  const firstIdSet: string[] = [];
  for (let i = 0; i < 8; i++) {
    const res = validateAndIngestSubmittedImages(
      [{ mimeType: "image/png", data: makePngBase64(120 + i, 80, i + 10) }],
      snapshotMap,
    );
    snapshotMap = res.updatedSnapshotMap;
    firstIdSet.push(res.snapshots[0]!.snapshotId);
  }
  const keys = Object.keys(snapshotMap);
  assert.strictEqual(keys.length, MAX_SESSION_IMAGE_SNAPSHOTS);
  assert.ok(!keys.includes(firstIdSet[0]!), "Oldest snapshot must be evicted");
  assert.ok(keys.includes(firstIdSet[7]!), "Newest snapshot must be retained");
});

test("Wave 3 Visual Auditor: SVG XSS/overlap repair loop & Excalidraw bounds verification", async () => {
  // Overlapping + script + tiny font + clipped SVG fails audit & sanitizes
  const unsafeBrokenSvg = `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
    <script>alert("xss")</script>
    <rect x="380" y="10" width="80" height="40" onclick="evil()" />
    <text x="50" y="60" font-size="8">tiny</text>
    <text x="55" y="62" font-size="14">overlap</text>
  </svg>`;
  const brokenAudit = sanitizeAndAuditSvg(unsafeBrokenSvg);
  assert.strictEqual(brokenAudit.ok, false);
  assert.ok(!brokenAudit.sanitizedSvg.includes("<script"));
  assert.ok(!brokenAudit.sanitizedSvg.includes("onclick"));
  assert.ok(brokenAudit.errors.some((e) => e.includes("<script>")));
  assert.ok(brokenAudit.errors.some((e) => e.includes("clicks") || e.includes("viewBox")));
  assert.ok(brokenAudit.errors.some((e) => e.includes("font-size=8")));
  assert.ok(brokenAudit.errors.some((e) => e.includes("Overlapping text")));

  // Excalidraw spec bounds check
  assert.strictEqual(
    verifyExcalidrawVisualSpec({
      kind: "sliding_window",
      arrayValues: [2, 5, 7],
      pointers: { L: 9 },
    }).ok,
    false,
  );
  assert.strictEqual(
    verifyExcalidrawVisualSpec({
      kind: "sliding_window",
      arrayValues: [2, 5, 7, 4],
      pointers: { L: 0, R: 2 },
      highlightRange: [0, 2],
    }).ok,
    true,
  );

  // Iterative repair loop: pass 1 fails, pass 2 receives priorFeedback and emits clean SVG
  let pass = 0;
  let capturedFeedback: string | undefined;
  const artifact = await generateAndVerifyPatternVisual({
    patternId: "sliding-window",
    strandId: "sliding-window:shrink-loop-invariant",
    brief: "Show L and R pointers shrinking window [1..3]",
    visualModelCaller: async (_prompt, priorFeedback) => {
      pass += 1;
      if (pass === 1) {
        return {
          kind: "svg",
          title: "Broken Attempt",
          svg: `<svg viewBox="0 0 400 200"><script>bad()</script><rect x="20" y="20" width="60" height="40"/><text x="30" y="90" font-size="7">too small</text></svg>`,
        };
      }
      capturedFeedback = priorFeedback;
      return {
        kind: "svg",
        title: "Clean Sliding Window Trace",
        svg: `<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="20" width="560" height="200" fill="#fff" stroke="#cbd5e1" />
          <rect x="60" y="80" width="70" height="50" fill="#dbeafe" stroke="#2563eb" />
          <text x="95" y="110" text-anchor="middle" font-size="16">4</text>
          <text x="95" y="160" text-anchor="middle" font-size="13">L=1, R=3</text>
        </svg>`,
      };
    },
  });

  assert.strictEqual(pass, 2);
  assert.ok(capturedFeedback?.includes("font-size=7"));
  assert.strictEqual(artifact.verifiedByAuditor, true);
  assert.strictEqual(artifact.title, "Clean Sliding Window Trace");
  assert.ok(artifact.auditNotes.some((n) => n.includes("pass 2")));
});

test("Wave 3 Router E2E: spoofed image 400, multimodal grading, confidence twist escalation & /visualize", async () => {
  let seenImagesOnSubmit = 0;
  let seenImageMime: string | undefined;

  const stepCaller: PatternModelStepCaller = async (req) => {
    if (req.role === "teacher" && req.images && req.images.length > 0) {
      seenImagesOnSubmit = req.images.length;
      seenImageMime = req.images[0]?.mimeType;
    }

    const toolNames = new Set(req.tools.map((t) => t.name));

    if (toolNames.has("deliver_notes")) {
      return {
        functionCalls: [
          {
            id: "call_notes",
            name: "deliver_notes",
            args: {
              unconditionalTruths: [
                {
                  title: "Monotonic advance",
                  statement: "Both pointers move right O(n) total times.",
                },
              ],
              motivatedDiscovery: {
                bruteForceBottleneck: "O(n^2) re-scanning every window",
                keyInsight: "Keep incremental state",
                whyItWorks: "Non-negative values make window sum monotone",
              },
              canonicalTemplate: {
                language: "cpp",
                code: "int l = 0; for (int r = 0; r < n; r++) { window += a[r]; }",
                invariantAnnotation: "Window [l..r] stays valid",
              },
              pitfalls: [
                {
                  trap: "Using if instead of while",
                  counterexample: "[1, 1, 100] target 10",
                  fix: "Use while loop to shrink",
                },
              ],
            },
          },
        ],
      };
    }

    if (toolNames.has("deliver_question")) {
      return {
        functionCalls: [
          {
            id: "call_q",
            name: "deliver_question",
            args: {
              modality: "mcq",
              questionRole: "check",
              prompt: "When does standard positive-array sliding window fail?",
              options: [
                { value: "neg", label: "Negative numbers present" },
                { value: "even", label: "Even length array" },
              ],
              correctOptionValues: ["neg"],
              expectedReasoning:
                "Negative entries break window monotonicity so shrinking can increase or decrease sum unpredictably.",
              keyInvariantsRequired: ["monotonicity"],
            },
          },
        ],
      };
    }

    if (toolNames.has("deliver_evaluation")) {
      return {
        functionCalls: [
          {
            id: "call_eval",
            name: "deliver_evaluation",
            args: {
              isCorrect: false,
              hiddenGapDetected: false,
              score: 25,
              verbalScore: 20,
              missClass: "invariant-break",
              hintRung: null,
              errorSignatureKey: "sliding-window:monotonicity-negative",
              gapSummary: "Assumed even array breaks window instead of negative numbers.",
              verdictSummary: "Missed negative-number breakdown.",
              surgicalTeaching:
                "With negatives, expanding could decrease sum after a premature shrink.",
              twistedFollowUp: {
                operator: "break-the-premise",
                prompt:
                  "Trace [-2, 5, -1, 4] for target 6 and explain why sliding window skips [5, -1, 4].",
                expectedReasoning:
                  "Shrinking drops prefix capacity prematurely; prefix sums + deque needed.",
              },
            },
          },
        ],
      };
    }

    return { text: "fallback" };
  };

  let visualPasses = 0;
  const { app, sessions } = createWave3Harness({
    stepCaller,
    visualModelCaller: async () => {
      visualPasses += 1;
      return {
        kind: "excalidraw_params",
        title: "Sliding Window Pointer Counterexample",
        excalidrawSpec: {
          kind: "sliding_window",
          arrayValues: [-2, 5, -1, 4],
          pointers: { L: 0, R: 3 },
          highlightRange: [1, 3],
          note: "Sum [5, -1, 4] = 8 >= 6 despite negative -2 earlier",
        },
      };
    },
  });

  await withServer(app, async (base) => {
    const startRes = await fetch(`${base}/session/start`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_w3" },
      body: JSON.stringify({ patternId: "sliding-window" }),
    });
    assert.strictEqual(startRes.status, 200);
    const { session } = (await startRes.json()) as {
      session: PatternSessionState;
    };

    const lvl = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: session.sessionId,
      action: { kind: "select_level", track: "intermediate" },
      getHeaders: async () => ({ "x-test-uid": "u_w3" }),
    });
    assert.strictEqual(lvl.session.stage, "studying_notes");

    const ready = await runPatternTurnWithRecovery({
      basePath: base,
      sessionId: session.sessionId,
      action: { kind: "ready_questions" },
      getHeaders: async () => ({ "x-test-uid": "u_w3" }),
    });
    const q1 = ready.session.currentQuestion!;
    assert.strictEqual(q1.id.length > 0, true);

    // 1. Spoofed image payload MUST fail cleanly with 400
    const spoofRes = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_w3" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        questionId: q1.id,
        attemptId: "att_spoof",
        selectedOptions: ["even"],
        confidence: 95,
        verbalAnswer: "Even array cannot halve cleanly.",
        workImages: [
          {
            mimeType: "image/png",
            data: Buffer.from("<script>alert(1)</script>").toString("base64"),
          },
        ],
      }),
    });
    assert.strictEqual(spoofRes.status, 400);

    // 2. Valid 240x160 PNG work image + wrong option + 95% confidence -> overconfident multimodal eval + twist visual
    const validPng = makePngBase64(240, 160, 7);
    const submitRes = await fetch(`${base}/session/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_w3" },
      body: JSON.stringify({
        sessionId: session.sessionId,
        questionId: q1.id,
        attemptId: "att_w3_real",
        selectedOptions: ["even"],
        confidence: 95,
        verbalAnswer: "Even length splits unevenly at midpoint.",
        workImages: [
          {
            mimeType: "image/png",
            data: validPng,
            caption: "dry run table L/R",
          },
        ],
      }),
    });
    assert.strictEqual(submitRes.status, 200);
    const submitJson = (await submitRes.json()) as {
      evaluation: {
        confidenceSubmitted?: number | null;
        confidenceDiagnostic?: string;
        visualArtifact?: { verifiedByAuditor: boolean };
        twistedFollowUp?: {
          id: string;
          twistOperator?: string;
          visualArtifact?: { verifiedByAuditor: boolean };
        };
      };
      session: PatternSessionState;
    };

    assert.strictEqual(seenImagesOnSubmit, 1);
    assert.strictEqual(seenImageMime, "image/png");
    assert.strictEqual(submitJson.evaluation.confidenceSubmitted, 95);
    assert.strictEqual(submitJson.evaluation.confidenceDiagnostic, "overconfident");
    assert.ok(submitJson.evaluation.visualArtifact?.verifiedByAuditor);
    assert.strictEqual(
      submitJson.evaluation.twistedFollowUp?.twistOperator,
      "break-the-premise",
    );
    assert.ok(
      Object.keys(sessions.get(session.sessionId)?.imageSnapshots ?? {}).length ===
        1,
    );

    // 3. On-demand /visualize attaches verified visual to active twisted question
    const vizRes = await fetch(`${base}/session/${session.sessionId}/visualize`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-uid": "u_w3" },
      body: JSON.stringify({
        brief: "Show counterexample array [-2, 5, -1, 4]",
      }),
    });
    assert.strictEqual(vizRes.status, 200);
    const vizJson = (await vizRes.json()) as {
      visual: {
        kind: string;
        verifiedByAuditor: boolean;
        excalidrawSpec?: { arrayValues: number[] };
      };
      session: PatternSessionState;
    };
    assert.strictEqual(visualPasses >= 1, true);
    assert.strictEqual(vizJson.visual.kind, "excalidraw_params");
    assert.strictEqual(vizJson.visual.verifiedByAuditor, true);
    assert.deepStrictEqual(
      vizJson.session.currentQuestion?.visualArtifact?.excalidrawSpec?.arrayValues,
      [-2, 5, -1, 4],
    );
  });
});

test("Wave 3 Strict Topic Completion: Confidence %, Explanation Validity, Asymmetric Penalties & Multi-Pass Perfectioning", () => {
  const strandId = "sliding-window:monotonicity-condition";
  const t0 = "2026-11-01T10:00:00.000Z";

  // 1. Compare single clean pass gain across Confidence & Valid Explanation quality
  const highConfValid = applyStrandReviewUpdate(
    createEmptyUserPatternProfile("u_hc"),
    {
      patternId: "sliding-window",
      strandId,
      score: 95,
      isCorrect: true,
      hiddenGapDetected: false,
      missClass: null,
      hintRung: null,
      verbalScore: 95,
      confidence: 95,
      track: "pro",
    },
    t0,
  );
  const lowConfUnderconf = applyStrandReviewUpdate(
    createEmptyUserPatternProfile("u_lc"),
    {
      patternId: "sliding-window",
      strandId,
      score: 95,
      isCorrect: true,
      hiddenGapDetected: false,
      missClass: null,
      hintRung: null,
      verbalScore: 95,
      confidence: 25,
      track: "pro",
    },
    t0,
  );
  const weakVerbal = applyStrandReviewUpdate(
    createEmptyUserPatternProfile("u_wv"),
    {
      patternId: "sliding-window",
      strandId,
      score: 95,
      isCorrect: true,
      hiddenGapDetected: false,
      missClass: null,
      hintRung: null,
      verbalScore: 52,
      confidence: 90,
      track: "pro",
    },
    t0,
  );
  const hintedPass = applyStrandReviewUpdate(
    createEmptyUserPatternProfile("u_hint"),
    {
      patternId: "sliding-window",
      strandId,
      score: 95,
      isCorrect: true,
      hiddenGapDetected: false,
      missClass: null,
      hintRung: "R2",
      verbalScore: 95,
      confidence: 90,
      track: "pro",
    },
    t0,
  );

  const mHigh = highConfValid.strands[strandId]!.mastery;
  const mLow = lowConfUnderconf.strands[strandId]!.mastery;
  const mWeakVerbal = weakVerbal.strands[strandId]!.mastery;
  const mHint = hintedPass.strands[strandId]!.mastery;

  // Never 1-shot mastery! Single clean pass stays strictly bounded (< 30% strand, < 10% topic)
  assert.ok(mHigh >= 14 && mHigh <= 25, `Expected strict initial gain 14..25, got ${mHigh}`);
  assert.strictEqual(highConfValid.strands[strandId]!.status, "remediated");
  assert.ok(mHigh > mLow, `Calibrated high confidence (${mHigh}) must outpace underconfident (${mLow})`);
  assert.ok(mHigh > mWeakVerbal, `Valid explanation (${mHigh}) must outpace shallow verbal (${mWeakVerbal})`);
  assert.strictEqual(mHint, 0, "Heavy R2 hint must yield zero upward mastery credit from untouched");

  const aggSingle = computePatternAggregateMetrics("sliding-window", highConfValid, Date.parse(t0));
  assert.ok(aggSingle.masteryPercent < 10, `1 question should not inflate topic completion (${aggSingle.masteryPercent}%)`);
  assert.strictEqual(aggSingle.masteredStrands, 0);

  // 2. Compare asymmetric penalties: Overconfident Wrong > Low-Conf Wrong / Honest IDK & Hollow Right Guess
  let baseProfile = createEmptyUserPatternProfile("u_pen", t0);
  let tMs = Date.parse(t0);
  for (let i = 0; i < 6; i++) {
    tMs += 24 * 3_600_000;
    baseProfile = applyStrandReviewUpdate(
      baseProfile,
      {
        patternId: "sliding-window",
        strandId,
        score: 94,
        isCorrect: true,
        hiddenGapDetected: false,
        missClass: null,
        hintRung: null,
        verbalScore: 92,
        confidence: 90,
        track: "pro",
      },
      new Date(tMs).toISOString(),
    );
  }
  const builtMastery = baseProfile.strands[strandId]!.mastery;
  assert.ok(builtMastery >= 65 && builtMastery < 85);

  const failTimeIso = new Date(tMs + 3_600_000).toISOString();
  const afterOverconfMiss = applyStrandReviewUpdate(
    baseProfile,
    {
      patternId: "sliding-window",
      strandId,
      score: 20,
      isCorrect: false,
      hiddenGapDetected: false,
      missClass: "invariant-break",
      hintRung: null,
      verbalScore: 25,
      confidence: 95,
    },
    failTimeIso,
  );
  const afterHonestIdk = applyStrandReviewUpdate(
    baseProfile,
    {
      patternId: "sliding-window",
      strandId,
      score: 10,
      isCorrect: false,
      hiddenGapDetected: false,
      missClass: "cue",
      hintRung: "R2",
      choseIdk: true,
      confidence: 95,
    },
    failTimeIso,
  );
  const afterHollowRight = applyStrandReviewUpdate(
    baseProfile,
    {
      patternId: "sliding-window",
      strandId,
      score: 82,
      isCorrect: true,
      hiddenGapDetected: true,
      missClass: "structural",
      hintRung: null,
      verbalScore: 30,
      confidence: 85,
    },
    failTimeIso,
  );

  const dropOverconf = builtMastery - afterOverconfMiss.strands[strandId]!.mastery;
  const dropIdk = builtMastery - afterHonestIdk.strands[strandId]!.mastery;
  assert.ok(
    dropOverconf > dropIdk * 2,
    `Overconfident wrong (${dropOverconf}) must penalize much harder than honest IDK (${dropIdk})`,
  );
  assert.ok(
    afterHollowRight.strands[strandId]!.mastery <= 55,
    `Lucky MCQ with invalid explanation must drop & cap <= 55 (got ${afterHollowRight.strands[strandId]!.mastery})`,
  );

  // 3. Sustained spaced perfection across all strands of sliding-window enables 85..100% topic completion
  const swStrandIds = getPatternDefinition("sliding-window")!.strands.map((s) => s.id);
  let fullProf = createEmptyUserPatternProfile("u_full", t0);
  let fullMs = Date.parse(t0);
  for (let round = 0; round < 11; round++) {
    fullMs += 24 * 3_600_000;
    const iso = new Date(fullMs).toISOString();
    for (const sId of swStrandIds) {
      fullProf = applyStrandReviewUpdate(
        fullProf,
        {
          patternId: "sliding-window",
          strandId: sId,
          score: 96,
          isCorrect: true,
          hiddenGapDetected: false,
          missClass: null,
          hintRung: null,
          verbalScore: 94,
          codeScore: 94,
          confidence: 92,
          track: "pro",
        },
        iso,
      );
    }
  }
  const fullAgg = computePatternAggregateMetrics("sliding-window", fullProf, fullMs);
  assert.strictEqual(fullAgg.masteredStrands, fullAgg.totalStrands);
  assert.ok(fullAgg.masteryPercent >= 85, `Sustained spaced perfection across all strands must reach >= 85% (got ${fullAgg.masteryPercent}%)`);
});

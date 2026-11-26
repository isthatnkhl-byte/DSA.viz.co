import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  PATTERN_CATALOG,
  analyzePatternDag,
  getPatternDefinition,
} from "../../data/patterns";
import {
  getPatternSession,
  getUserPatternProfile,
  savePatternSession,
  saveUserPatternProfile,
  stripRubricFromCard,
} from "../../db/pattern-mastery";
import type { AuthRequest } from "../../middleware/auth";
import {
  TurnConflictError,
  buildCalibrationView,
  buildMasteryScorecard,
  createNewPatternSession,
  evaluateProbeSubmission,
  evaluateSubmissionAndBuildFollowUp,
  executePatternTurnAction,
  generateNextPatternQuestion,
  generateTailoredNotes,
  requestProgressiveHint,
  startCalibrationProbe,
  type PatternEngineDeps,
} from "./engine.server";
import { resolvePatternAgentRole } from "./agent-tools.server";
import {
  getActivePatternTurn,
  getRecentSettledTurn,
  singleEventSseStream,
  startBackgroundPatternTurn,
} from "./turn-runner.server";
import { SideChatInputError } from "./side-chat";
import { collectPendingSideUpdates, enforceSideChatsBounds } from "./side-chat";
import { ImageIntakeError } from "./image-intake";
import { generateAndVerifyPatternVisual } from "./visual-agent.server";
import {
  askSideChatQuestion,
  listSideChatThreads,
  stopSideChatRun,
  watchSideChatThread,
  type SideModelCaller,
} from "./side-chat.server";
import {
  matchPatternAndStrands,
  resolveStrandTarget,
} from "./matcher";
import {
  computeGlobalDagFrontier,
  computePatternAggregateMetrics,
  getDueReviewStrands,
} from "./scheduler";
import {
  endPatternTurn,
  beginPatternTurn,
  isPatternTurnRunning,
} from "./turn-liveness";
import {
  HintRungSchema,
  MissClassSchema,
  PatternIdSchema,
  PatternTurnActionSchema,
  QuestionModalitySchema,
  SteerTurnBodySchema,
  SubmissionPayloadSchema,
  TrackModeSchema,
  type PatternSessionState,
  type PatternToolCallRecord,
  type PatternTurnStreamEvent,
  type SubmissionEvaluation,
  type UserPatternProfile,
} from "./types";

const StartSessionBodySchema = z.object({
  patternId: PatternIdSchema,
});

const SelectLevelBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  track: TrackModeSchema,
});

const ReadyQuestionsBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
});

const RequestHintBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  questionId: z.string().min(1).max(128),
});

const FinishSessionBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
});

const RehydrateSessionBodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  patternId: PatternIdSchema,
  track: TrackModeSchema.nullable(),
  stage: z.enum([
    "calibration",
    "probing",
    "studying_notes",
    "questioning",
    "remediating",
    "completed",
  ]),
  questionHistory: z
    .array(
      z.object({
        questionId: z.string().min(1).max(128),
        strandId: z.string().min(1).max(128),
        modality: QuestionModalitySchema,
        score: z.number().min(0).max(100),
        missClass: MissClassSchema.nullable(),
        highestHintRung: HintRungSchema.nullable().optional(),
        verbalSummary: z.string().max(200).optional(),
      }),
    )
    .max(40)
    .optional(),
  resolvedStrandsInSession: z.array(z.string().max(128)).max(20).optional(),
  pendingRemediationStrands: z.array(z.string().max(128)).max(20).optional(),
  retestQueue: z.array(z.string().max(128)).max(20).optional(),
});

export type PatternAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown;

export type PatternRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown;

export interface MasterPatternsRouterDeps {
  authMiddleware: PatternAuthMiddleware;
  aiRateLimiter?: PatternRateLimiter;
  getProfile?: (uid: string) => Promise<UserPatternProfile>;
  saveProfile?: (
    uid: string,
    profile: UserPatternProfile,
  ) => Promise<UserPatternProfile>;
  getSession?: (sessionId: string) => Promise<PatternSessionState | null>;
  saveSession?: (session: PatternSessionState) => Promise<PatternSessionState>;
  engineDeps?: PatternEngineDeps;
  sideModelCaller?: SideModelCaller;
  updateFlushMs?: number;
}

const noopMiddleware: PatternRateLimiter = (_req, _res, next) => next();

function pipeStreamToExpress(
  res: Response,
  stream: ReadableStream<Uint8Array>,
  contentType = "text/event-stream; charset=utf-8",
): void {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-cache, no-transform, no-store");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  (res.socket as { setNoDelay?: (b: boolean) => void } | undefined)?.setNoDelay?.(
    true,
  );
  res.flushHeaders?.();

  const reader = stream.getReader();
  let stopped = false;
  const onClose = () => {
    stopped = true;
    void reader.cancel().catch(() => {});
  };
  res.on("close", onClose);

  void (async () => {
    try {
      while (!stopped) {
        const { done, value } = await reader.read();
        if (done || stopped || res.writableEnded || res.destroyed) break;
        res.write(Buffer.from(value));
        (res as { flush?: () => void }).flush?.();
      }
    } catch {
      // View detached cleanly without stopping background worker
    } finally {
      res.off("close", onClose);
      if (!res.writableEnded) res.end();
    }
  })();
}

function pipeSseStreamToExpress(
  _req: Request,
  res: Response,
  stream: ReadableStream<Uint8Array>,
): void {
  pipeStreamToExpress(res, stream, "text/event-stream; charset=utf-8");
}

/**
 * Single public serializer seam (mirroring LearnHarness view projection):
 * guarantees server-committed question rubrics never cross the HTTP boundary.
 */
export function serializePublicSessionState(
  session: PatternSessionState,
): PatternSessionState {
  // Keep compact snapshot metadata for UI telemetry while omitting raw base64 blobs
  const redactedSnapshots = session.imageSnapshots
    ? Object.fromEntries(
        Object.entries(session.imageSnapshots).map(([k, snap]) => [
          k,
          { ...snap, data: "" },
        ]),
      )
    : undefined;

  return {
    ...session,
    ...(redactedSnapshots ? { imageSnapshots: redactedSnapshots } : {}),
    turnInFlight: isPatternTurnRunning(session.sessionId),
    currentQuestion: stripRubricFromCard(session.currentQuestion),
    lastEvaluation: session.lastEvaluation
      ? sanitizeEvaluation(session.lastEvaluation)
      : null,
  };
}

function captureWatermarksBeforeTurn(existing: PatternSessionState) {
  return existing.sideChats && existing.sideChats.length > 0
    ? collectPendingSideUpdates(existing).updatedWatermarks
    : existing.sideDeliveryWatermarks;
}

export function sanitizeEvaluation(
  evaluation: SubmissionEvaluation,
): SubmissionEvaluation {
  return {
    ...evaluation,
    twistedFollowUp: stripRubricFromCard(evaluation.twistedFollowUp),
    nextQuestion: stripRubricFromCard(evaluation.nextQuestion),
  };
}

function getAuthenticatedUid(req: Request): string | null {
  const uid = (req as AuthRequest).user?.uid;
  return typeof uid === "string" && uid.trim().length > 0 ? uid.trim() : null;
}

function buildProfileResponse(profile: UserPatternProfile) {
  const nowMs = Date.now();
  const patterns = PATTERN_CATALOG.map((p) => ({
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    category: p.category,
    interviewFrequency: p.interviewFrequency,
    whiteboardQuery: p.whiteboardQuery,
    linkedProblemSlugs: p.linkedProblemSlugs,
    strands: p.strands.map((s) => ({
      id: s.id,
      title: s.title,
      prerequisiteStrandIds: s.prerequisiteStrandIds,
      state: profile.strands[s.id] ?? null,
    })),
    summary: profile.patternSummaries[p.id] ?? null,
    metrics: computePatternAggregateMetrics(p.id, profile, nowMs),
  }));

  return {
    userId: profile.userId,
    cognitiveProfile: profile.cognitiveProfile,
    errorSignatures: profile.errorSignatures,
    recentSessions: profile.recentSessions,
    dueReviewStrands: getDueReviewStrands(profile, nowMs),
    patterns,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Framework-injectable Express router for `/api/patterns/*`.
 * Enforces LearnHarness-grade per-session turn liveness (409), ownership checks (403),
 * idempotent attempt replay, and strict Zod boundary validation.
 */
export function createMasterPatternsRouter(
  deps: MasterPatternsRouterDeps,
): Router {
  const router = Router();
  const auth = deps.authMiddleware;
  const aiLimit = deps.aiRateLimiter ?? noopMiddleware;
  const loadProfile = deps.getProfile ?? getUserPatternProfile;
  const persistProfile = deps.saveProfile ?? saveUserPatternProfile;
  const loadSession = deps.getSession ?? getPatternSession;
  const persistSession = deps.saveSession ?? savePatternSession;
  const engineDeps = deps.engineDeps ?? {};

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    next();
  });

  // 1. Catalog + O(1) user cognitive & strand mastery summary
  router.get("/profile", auth, async (req: Request, res: Response) => {
    const uid = getAuthenticatedUid(req);
    if (!uid) return res.status(401).json({ error: "Authentication required." });
    try {
      const profile = await loadProfile(uid);
      return res.json(buildProfileResponse(profile));
    } catch (err) {
      return res
        .status(500)
        .json({ error: (err as Error)?.message || "Failed to load pattern profile." });
    }
  });

  // 1b. Full 49-strand canonical DAG topology + personalized frontier readiness
  router.get("/dag", auth, async (req: Request, res: Response) => {
    const uid = getAuthenticatedUid(req);
    if (!uid) return res.status(401).json({ error: "Authentication required." });
    try {
      const profile = await loadProfile(uid);
      return res.json({
        dag: analyzePatternDag(),
        frontier: computeGlobalDagFrontier(profile),
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: (err as Error)?.message || "Failed to analyze pattern DAG." });
    }
  });

  // 1c. Multi-signal semantic/fuzzy strand matcher with user readiness overlay
  router.get("/dag/match", auth, async (req: Request, res: Response) => {
    const uid = getAuthenticatedUid(req);
    if (!uid) return res.status(401).json({ error: "Authentication required." });

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limitParam = Number.parseInt(String(req.query.limit ?? "6"), 10);
    const limit = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(15, limitParam))
      : 6;

    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required." });
    }

    try {
      const profile = await loadProfile(uid);
      const frontier = computeGlobalDagFrontier(profile);
      const nodeMap = new Map(frontier.nodes.map((n) => [n.strandId, n]));
      const resolved = resolveStrandTarget(q);
      const matches = matchPatternAndStrands(q, limit).map((m) => ({
        ...m,
        userState: nodeMap.get(m.strandId) ?? null,
      }));
      return res.json({
        query: q,
        resolvedStrandId: resolved?.id ?? null,
        matches,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: (err as Error)?.message || "Failed to match pattern strands." });
    }
  });

  // 2. Start pattern session & return personalized calibration prompt
  router.post(
    "/session/start",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const parsed = StartSessionBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid pattern selection.",
          details: parsed.error.issues,
        });
      }

      try {
        const profile = await loadProfile(uid);
        const session = createNewPatternSession(uid, parsed.data.patternId);
        await persistSession(session);
        const calibration = buildCalibrationView(parsed.data.patternId, profile);
        return res.json({
          session: serializePublicSessionState(session),
          calibration,
        });
      } catch (err) {
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Failed to start pattern session." });
      }
    },
  );

  // 3. Select Intermediate vs Pro track (generates tailored notes or first Pro question)
  router.post(
    "/session/select-level",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const parsed = SelectLevelBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid level selection payload.",
          details: parsed.error.issues,
        });
      }

      const { sessionId, track } = parsed.data;
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden: session belongs to another user." });
      }

      // Idempotent replay if track was already locked cleanly
      if (existing.track === track && existing.stage !== "calibration") {
        return res.json({ session: serializePublicSessionState(existing) });
      }
      if (
        existing.stage !== "calibration" &&
        existing.stage !== "probing" &&
        existing.stage !== "studying_notes"
      ) {
        return res.status(409).json({
          error: "Session track is already locked past calibration.",
        });
      }

      const ownerToken = {};
      if (!beginPatternTurn(sessionId, ownerToken)) {
        return res.status(409).json({
          error: "A turn is already in flight for this session.",
          retryAfterMs: 1500,
        });
      }

      try {
        const profile = await loadProfile(uid);
        let nextSession: PatternSessionState = {
          ...existing,
          track,
          updatedAt: new Date().toISOString(),
        };

        if (track === "intermediate") {
          const notes = await generateTailoredNotes(
            existing.patternId,
            profile,
            engineDeps,
            existing,
          );
          nextSession = {
            ...nextSession,
            stage: "studying_notes",
            notes,
            currentQuestion: null,
            currentQuestionHints: [],
          };
        } else {
          const firstQuestion = await generateNextPatternQuestion(
            nextSession,
            profile,
            engineDeps,
          );
          nextSession = {
            ...nextSession,
            stage: "questioning",
            notes: null,
            currentQuestion: firstQuestion,
            currentQuestionHints: [],
          };
        }

        const saved = await persistSession(nextSession);
        return res.json({ session: serializePublicSessionState(saved) });
      } catch (err) {
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Failed to initialize track." });
      } finally {
        endPatternTurn(sessionId, ownerToken);
      }
    },
  );

  // 3b. Start optional 2-question LearnHarness-style calibration probe
  router.post(
    "/session/start-probe",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const parsed = ReadyQuestionsBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid sessionId." });
      }

      const { sessionId } = parsed.data;
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }
      if (existing.stage === "probing" && existing.currentQuestion) {
        return res.json({ session: serializePublicSessionState(existing) });
      }
      if (existing.stage !== "calibration") {
        return res.status(409).json({
          error: "Calibration probe is only available from the calibration stage.",
        });
      }

      const ownerToken = {};
      if (!beginPatternTurn(sessionId, ownerToken)) {
        return res.status(409).json({
          error: "A turn is already in flight for this session.",
          retryAfterMs: 1500,
        });
      }

      try {
        const profile = await loadProfile(uid);
        const probed = await startCalibrationProbe(existing, profile, engineDeps);
        const saved = await persistSession(probed);
        return res.json({ session: serializePublicSessionState(saved) });
      } catch (err) {
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Failed to start calibration probe." });
      } finally {
        endPatternTurn(sessionId, ownerToken);
      }
    },
  );

  // 4. Intermediate learner finishes studying notes -> generate first guided question
  router.post(
    "/session/ready-questions",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const parsed = ReadyQuestionsBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid sessionId." });
      }

      const { sessionId } = parsed.data;
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }
      if (existing.currentQuestion && existing.stage === "questioning") {
        return res.json({ session: serializePublicSessionState(existing) });
      }

      const ownerToken = {};
      if (!beginPatternTurn(sessionId, ownerToken)) {
        return res.status(409).json({
          error: "A turn is already in flight for this session.",
          retryAfterMs: 1500,
        });
      }

      try {
        const profile = await loadProfile(uid);
        const q = await generateNextPatternQuestion(existing, profile, engineDeps);
        const saved = await persistSession({
          ...existing,
          stage: "questioning",
          currentQuestion: q,
          currentQuestionHints: [],
        });
        return res.json({ session: serializePublicSessionState(saved) });
      } catch (err) {
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Failed to prepare first question." });
      } finally {
        endPatternTurn(sessionId, ownerToken);
      }
    },
  );

  // 4b. Progressive LearnHarness-style hint ladder (R0 -> R3) on active question
  router.post(
    "/session/hint",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const parsed = RequestHintBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid hint request payload." });
      }

      const { sessionId, questionId } = parsed.data;
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }
      if (!existing.currentQuestion || existing.currentQuestion.id !== questionId) {
        return res.status(409).json({
          error: "Question is no longer active.",
          activeQuestionId: existing.currentQuestion?.id ?? null,
        });
      }

      const ownerToken = {};
      if (!beginPatternTurn(sessionId, ownerToken)) {
        return res.status(409).json({
          error: "A turn is already in flight for this session.",
          retryAfterMs: 1500,
        });
      }

      try {
        const profile = await loadProfile(uid);
        const { hint, updatedSession, alreadyAtMax } = await requestProgressiveHint(
          existing,
          profile,
          engineDeps,
        );
        const saved = await persistSession(updatedSession);
        return res.json({
          hint,
          alreadyAtMax,
          session: serializePublicSessionState(saved),
        });
      } catch (err) {
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Failed to generate hint." });
      } finally {
        endPatternTurn(sessionId, ownerToken);
      }
    },
  );

  // 5. Submit MCQ / verbal approach / code snippet -> cross-signal audit + gap twist
  router.post(
    "/session/submit",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const parsed = SubmissionPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid submission payload.",
          details: parsed.error.issues,
        });
      }

      const payload = parsed.data;
      const existing = await loadSession(payload.sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      // Idempotent replay check BEFORE turn lock (fast path for double-clicks / retries)
      if (
        existing.processedAttemptIds.includes(payload.attemptId) &&
        existing.lastEvaluation &&
        existing.lastEvaluation.questionId === payload.questionId
      ) {
        const profile = await loadProfile(uid);
        return res.json({
          evaluation: sanitizeEvaluation(existing.lastEvaluation),
          session: serializePublicSessionState(existing),
          profile: buildProfileResponse(profile),
          idempotentReplay: true,
        });
      }

      // Stale-question check (LearnHarness pending-question authority)
      if (!existing.currentQuestion || existing.currentQuestion.id !== payload.questionId) {
        return res.status(409).json({
          error: "Question is no longer active or already resolved.",
          activeQuestionId: existing.currentQuestion?.id ?? null,
        });
      }

      const ownerToken = {};
      if (!beginPatternTurn(payload.sessionId, ownerToken)) {
        return res.status(409).json({
          error: "Turn already in progress for this session.",
          retryAfterMs: 1500,
        });
      }

      try {
        const capturedSideWatermarks = captureWatermarksBeforeTurn(existing);
        const profile = await loadProfile(uid);
        const { evaluation, updatedSession, updatedProfile } =
          existing.stage === "probing"
            ? await evaluateProbeSubmission(
                existing,
                profile,
                payload,
                engineDeps,
              )
            : await evaluateSubmissionAndBuildFollowUp(
                existing,
                profile,
                payload,
                engineDeps,
              );

        const latestConcurrent = await loadSession(payload.sessionId);
        const mergedSideChats = latestConcurrent?.sideChats
          ? enforceSideChatsBounds(latestConcurrent.sideChats)
          : updatedSession.sideChats;

        const savedProfile = await persistProfile(uid, updatedProfile);
        const savedSession = await persistSession({
          ...updatedSession,
          ...(mergedSideChats ? { sideChats: mergedSideChats } : {}),
          ...(capturedSideWatermarks
            ? { sideDeliveryWatermarks: capturedSideWatermarks }
            : {}),
        });

        return res.json({
          evaluation: sanitizeEvaluation(evaluation),
          session: serializePublicSessionState(savedSession),
          profile: buildProfileResponse(savedProfile),
        });
      } catch (err) {
        if (err instanceof ImageIntakeError) {
          return res.status(err.statusCode).json({ error: err.message });
        }
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Evaluation failed." });
      } finally {
        endPatternTurn(payload.sessionId, ownerToken);
      }
    },
  );

  // 6. Finalize session -> compute Mastery Scorecard & persist bounded digest
  router.post(
    "/session/finish",
    auth,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const parsed = FinishSessionBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid sessionId." });
      }

      const { sessionId } = parsed.data;
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      if (existing.stage === "completed" && existing.scorecard) {
        const profile = await loadProfile(uid);
        return res.json({
          scorecard: existing.scorecard,
          session: serializePublicSessionState(existing),
          profile: buildProfileResponse(profile),
        });
      }

      const ownerToken = {};
      if (!beginPatternTurn(sessionId, ownerToken)) {
        return res.status(409).json({
          error: "A turn is already in flight for this session.",
          retryAfterMs: 1500,
        });
      }

      try {
        const profile = await loadProfile(uid);
        const { scorecard, updatedProfile } = buildMasteryScorecard(
          existing,
          profile,
        );
        const savedProfile = await persistProfile(uid, updatedProfile);
        const savedSession = await persistSession({
          ...existing,
          stage: "completed",
          currentQuestion: null,
          scorecard,
        });

        return res.json({
          scorecard,
          session: serializePublicSessionState(savedSession),
          profile: buildProfileResponse(savedProfile),
        });
      } catch (err) {
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Failed to finalize session." });
      } finally {
        endPatternTurn(sessionId, ownerToken);
      }
    },
  );

  // 7. Read session safely (never exposes rubrics)
  router.get("/session/:id", auth, async (req: Request, res: Response) => {
    const uid = getAuthenticatedUid(req);
    if (!uid) return res.status(401).json({ error: "Authentication required." });

    const sessionId = String(req.params.id || "").trim();
    if (!sessionId) return res.status(400).json({ error: "Session id required." });

    const existing = await loadSession(sessionId);
    if (!existing) {
      return res.status(404).json({ error: "Pattern session not found or expired." });
    }
    if (existing.userId !== uid) {
      return res.status(403).json({ error: "Forbidden." });
    }
    return res.json({ session: serializePublicSessionState(existing) });
  });

  // 8. Rehydrate an evicted/cold-started session from client IndexedDB metadata
  //    (Never accepts client rubrics or mastery scores; server re-derives active question)
  router.post(
    "/session/rehydrate",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const parsed = RehydrateSessionBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid rehydrate payload.",
          details: parsed.error.issues,
        });
      }

      const data = parsed.data;
      const existing = await loadSession(data.sessionId);
      if (existing) {
        if (existing.userId !== uid) {
          return res.status(403).json({ error: "Forbidden." });
        }
        return res.json({ session: serializePublicSessionState(existing) });
      }

      const pattern = getPatternDefinition(data.patternId);
      if (!pattern) {
        return res.status(400).json({ error: "Unknown patternId." });
      }

      const ownerToken = {};
      if (!beginPatternTurn(data.sessionId, ownerToken)) {
        return res.status(409).json({
          error: "A turn is already in flight for this session.",
          retryAfterMs: 1500,
        });
      }

      try {
        const profile = await loadProfile(uid);
        const now = new Date().toISOString();
        let rebuilt: PatternSessionState = {
          sessionId: data.sessionId,
          userId: uid,
          patternId: data.patternId,
          track: data.track,
          stage: data.stage,
          notes: null,
          currentQuestion: null,
          currentQuestionHints: [],
          questionHistory: data.questionHistory ?? [],
          pendingRemediationStrands: data.pendingRemediationStrands ?? [],
          retestQueue: data.retestQueue ?? [],
          resolvedStrandsInSession: data.resolvedStrandsInSession ?? [],
          processedAttemptIds: [],
          lastEvaluation: null,
          scorecard: null,
          createdAt: now,
          updatedAt: now,
        };

        if (data.track === "intermediate" && data.stage === "studying_notes") {
          rebuilt.notes = await generateTailoredNotes(
            data.patternId,
            profile,
            engineDeps,
            rebuilt,
          );
        } else if (
          data.track !== null &&
          (data.stage === "questioning" || data.stage === "remediating")
        ) {
          rebuilt.currentQuestion = await generateNextPatternQuestion(
            rebuilt,
            profile,
            engineDeps,
          );
        }

        const saved = await persistSession(rebuilt);
        return res.json({
          session: serializePublicSessionState(saved),
          calibration:
            data.stage === "calibration"
              ? buildCalibrationView(data.patternId, profile)
              : undefined,
        });
      } catch (err) {
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Failed to rehydrate session." });
      } finally {
        endPatternTurn(data.sessionId, ownerToken);
      }
    },
  );

  // 9. Unified streaming agent turn endpoint (background turn + coalesced SSE replay)
  router.post(
    "/session/:id/turn",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) return res.status(400).json({ error: "Session id required." });

      const rawAction =
        req.body && typeof req.body === "object" && "action" in req.body
          ? (req.body as { action?: unknown }).action
          : req.body;
      const parsedAction = PatternTurnActionSchema.safeParse(rawAction);
      if (!parsedAction.success) {
        return res.status(400).json({
          error: "Invalid turn action payload.",
          details: parsedAction.error.issues,
        });
      }

      const action = parsedAction.data;
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      const wantsJsonOnly =
        req.query.stream === "0" ||
        (req.headers.accept &&
          !req.headers.accept.includes("text/event-stream") &&
          req.headers.accept.includes("application/json") &&
          req.query.stream !== "1");

      // Fast-path idempotency before acquiring turn liveness lock
      if (
        action.kind === "submit" &&
        existing.processedAttemptIds.includes(action.payload.attemptId) &&
        existing.lastEvaluation &&
        existing.lastEvaluation.questionId === action.payload.questionId
      ) {
        const profile = await loadProfile(uid);
        const publicSession = serializePublicSessionState(existing);
        const publicEval = sanitizeEvaluation(existing.lastEvaluation);
        const publicProfile = buildProfileResponse(profile);
        if (wantsJsonOnly) {
          return res.json({
            evaluation: publicEval,
            session: publicSession,
            profile: publicProfile,
            idempotentReplay: true,
          });
        }
        return pipeSseStreamToExpress(
          req,
          res,
          singleEventSseStream({
            type: "turn_settled",
            turnId: existing.lastTurnTrace?.turnId ?? "replay",
            sessionId,
            session: publicSession,
            evaluation: publicEval,
            profile: publicProfile as unknown as Record<string, unknown>,
            timestamp: Date.now(),
          }),
        );
      }

      // Synchronous preflight validation before background turn creation
      if (action.kind === "start_probe" && existing.stage !== "calibration" && !(existing.stage === "probing" && existing.currentQuestion)) {
        return res.status(409).json({
          error: "Calibration probe is only available from the calibration stage.",
        });
      }
      if (
        action.kind === "select_level" &&
        !(existing.track === action.track && existing.stage !== "calibration") &&
        existing.stage !== "calibration" &&
        existing.stage !== "probing" &&
        existing.stage !== "studying_notes"
      ) {
        return res.status(409).json({
          error: "Session track is already locked past calibration.",
        });
      }
      if (
        (action.kind === "request_hint" &&
          (!existing.currentQuestion ||
            existing.currentQuestion.id !== action.questionId)) ||
        (action.kind === "submit" &&
          (!existing.currentQuestion ||
            existing.currentQuestion.id !== action.payload.questionId))
      ) {
        return res.status(409).json({
          error: "Question is no longer active or already resolved.",
          activeQuestionId: existing.currentQuestion?.id ?? null,
        });
      }

      const role = resolvePatternAgentRole(existing, action.kind);
      const handle = startBackgroundPatternTurn({
        sessionId,
        role,
        action: action.kind,
        updateFlushMs: deps.updateFlushMs,
        run: async (turnCtx) => {
          const startedAt = Date.now();
          const toolCalls: PatternToolCallRecord[] = [];
          let reasoningText = "";

          // Write-ahead input marker & watermark snapshot captured prior to inference
          const capturedSideWatermarks = captureWatermarksBeforeTurn(existing);
          const writeAheadSession: PatternSessionState = {
            ...existing,
            lastAction: action,
            updatedAt: new Date().toISOString(),
          };
          await persistSession(writeAheadSession);

          try {
            const profile = await loadProfile(uid);
            const outcome = await executePatternTurnAction(
              writeAheadSession,
              profile,
              action,
              {
                ...engineDeps,
                signal: turnCtx.signal,
                turnCallbacks: {
                  onStepStarted: (step) =>
                    turnCtx.emit({
                      type: "step_started",
                      turnId: turnCtx.turnId,
                      step,
                      role,
                      timestamp: Date.now(),
                    }),
                  onReasoningUpdate: (text) => {
                    reasoningText = text;
                    turnCtx.emit({
                      type: "reasoning_update",
                      turnId: turnCtx.turnId,
                      text,
                      timestamp: Date.now(),
                    });
                  },
                  onMessageUpdate: (text) =>
                    turnCtx.emit({
                      type: "message_update",
                      turnId: turnCtx.turnId,
                      text,
                      timestamp: Date.now(),
                    }),
                  onToolCallStart: (callId, toolName, argsPreview) => {
                    toolCalls.push({
                      callId,
                      toolName,
                      argsPreview,
                      status: "running",
                    });
                    turnCtx.emit({
                      type: "tool_call_start",
                      turnId: turnCtx.turnId,
                      callId,
                      toolName,
                      argsPreview,
                      timestamp: Date.now(),
                    });
                  },
                  onToolCallEnd: (
                    callId,
                    toolName,
                    isError,
                    healed,
                    resultPreview,
                    durationMs,
                  ) => {
                    const entry = toolCalls.find((t) => t.callId === callId);
                    if (entry) {
                      entry.status = isError ? "error" : "completed";
                      entry.healed = healed;
                      entry.resultPreview = resultPreview;
                      entry.durationMs = durationMs;
                    }
                    turnCtx.emit({
                      type: "tool_call_end",
                      turnId: turnCtx.turnId,
                      callId,
                      toolName,
                      isError,
                      healed,
                      resultPreview,
                      durationMs,
                      timestamp: Date.now(),
                    });
                  },
                  onSteerApplied: (steer) =>
                    turnCtx.emit({
                      type: "steer_applied",
                      turnId: turnCtx.turnId,
                      steerId: steer.id,
                      text: steer.text,
                      timestamp: Date.now(),
                    }),
                  consumePendingSteers: turnCtx.consumePendingSteers,
                },
              },
            );

            const traceSummary = {
              turnId: turnCtx.turnId,
              role,
              action: action.kind,
              toolCalls: toolCalls.slice(-12),
              ...(reasoningText
                ? { reasoningSummary: reasoningText.slice(0, 500) }
                : {}),
              ...(turnCtx.getSteersSnapshot().length > 0
                ? { steersApplied: turnCtx.getSteersSnapshot() }
                : {}),
              ...(turnCtx.signal.aborted ? { aborted: true } : {}),
              durationMs: Date.now() - startedAt,
            };

            const latestConcurrent = await loadSession(sessionId);
            const mergedSideChats = latestConcurrent?.sideChats
              ? enforceSideChatsBounds(latestConcurrent.sideChats)
              : outcome.session.sideChats;

            if (turnCtx.signal.aborted) {
              const abortedSession = await persistSession({
                ...existing,
                ...(mergedSideChats ? { sideChats: mergedSideChats } : {}),
                lastAction: action,
                pendingSteers: [],
                lastTurnTrace: traceSummary,
              });
              const currentProfile = await loadProfile(uid);
              return {
                type: "turn_settled",
                turnId: turnCtx.turnId,
                sessionId,
                aborted: true,
                session: serializePublicSessionState(abortedSession),
                profile: buildProfileResponse(
                  currentProfile,
                ) as unknown as Record<string, unknown>,
                timestamp: Date.now(),
              };
            }

            const savedProfile =
              outcome.profile !== profile
                ? await persistProfile(uid, outcome.profile)
                : profile;
            const savedSession = await persistSession({
              ...outcome.session,
              ...(mergedSideChats ? { sideChats: mergedSideChats } : {}),
              ...(capturedSideWatermarks
                ? { sideDeliveryWatermarks: capturedSideWatermarks }
                : {}),
              lastAction: action,
              pendingSteers: [],
              lastTurnTrace: traceSummary,
            });

            return {
              type: "turn_settled",
              turnId: turnCtx.turnId,
              sessionId,
              session: serializePublicSessionState(savedSession),
              ...(outcome.evaluation
                ? { evaluation: sanitizeEvaluation(outcome.evaluation) }
                : {}),
              ...(outcome.hint ? { hint: outcome.hint } : {}),
              ...(typeof outcome.alreadyAtMax === "boolean"
                ? { alreadyAtMax: outcome.alreadyAtMax }
                : {}),
              ...(outcome.scorecard ? { scorecard: outcome.scorecard } : {}),
              profile: buildProfileResponse(
                savedProfile,
              ) as unknown as Record<string, unknown>,
              timestamp: Date.now(),
            };
          } catch (err) {
            const statusCode =
              err instanceof TurnConflictError || err instanceof ImageIntakeError
                ? err.statusCode
                : 500;
            return {
              type: "turn_error",
              turnId: turnCtx.turnId,
              error: (err as Error)?.message || "Turn execution failed.",
              statusCode,
              timestamp: Date.now(),
            };
          }
        },
      });

      if (!handle) {
        return res.status(409).json({
          error: "A turn is already in flight for this session.",
          retryAfterMs: 1200,
        });
      }

      if (wantsJsonOnly) {
        await handle.settled;
        const settled = await getRecentSettledTurn(sessionId);
        if (!settled) {
          return res.status(500).json({ error: "Turn completed without terminal state." });
        }
        if (settled.type === "turn_error") {
          return res
            .status(settled.statusCode ?? 500)
            .json({ error: settled.error });
        }
        return res.json(settled);
      }

      return pipeSseStreamToExpress(req, res, handle.subscribe());
    },
  );

  // 10. Reattach / replay active or recently settled turn SSE stream (disconnect recovery)
  router.get("/session/:id/stream", auth, async (req: Request, res: Response) => {
    const uid = getAuthenticatedUid(req);
    if (!uid) return res.status(401).json({ error: "Authentication required." });

    const sessionId = String(req.params.id || "").trim();
    if (!sessionId) return res.status(400).json({ error: "Session id required." });

    const existing = await loadSession(sessionId);
    if (!existing) {
      return res.status(404).json({ error: "Pattern session not found or expired." });
    }
    if (existing.userId !== uid) {
      return res.status(403).json({ error: "Forbidden." });
    }

    const activeHandle = getActivePatternTurn(sessionId);
    if (activeHandle) {
      return pipeSseStreamToExpress(req, res, activeHandle.subscribe());
    }

    const settled = await getRecentSettledTurn(sessionId);
    if (settled) {
      return pipeSseStreamToExpress(req, res, singleEventSseStream(settled));
    }

    const profile = await loadProfile(uid);
    return pipeSseStreamToExpress(
      req,
      res,
      singleEventSseStream({
        type: "turn_settled",
        turnId: existing.lastTurnTrace?.turnId ?? "snapshot",
        sessionId,
        session: serializePublicSessionState(existing),
        ...(existing.lastEvaluation
          ? { evaluation: sanitizeEvaluation(existing.lastEvaluation) }
          : {}),
        ...(existing.scorecard ? { scorecard: existing.scorecard } : {}),
        profile: buildProfileResponse(profile) as unknown as Record<string, unknown>,
        timestamp: Date.now(),
      }),
    );
  });

  // 11. Mid-run user steer injection into running agent loop
  router.post(
    "/session/:id/steer",
    auth,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) return res.status(400).json({ error: "Session id required." });

      const parsed = SteerTurnBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid steer message.",
          details: parsed.error.issues,
        });
      }

      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      const activeHandle = getActivePatternTurn(sessionId);
      if (!activeHandle) {
        return res.status(409).json({
          error: "No active turn is currently running for this session.",
        });
      }

      const steer = activeHandle.steer(parsed.data.text, parsed.data.steerId);
      if (!steer) {
        return res.status(409).json({
          error: "Steer queue is full or turn is already settling.",
        });
      }

      return res.status(202).json({
        accepted: true,
        turnId: activeHandle.turnId,
        steer,
      });
    },
  );

  // 12. Explicit remote turn abort (preserves session without corrupting stage)
  router.post(
    "/session/:id/abort",
    auth,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) return res.status(400).json({ error: "Session id required." });

      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      const activeHandle = getActivePatternTurn(sessionId);
      if (!activeHandle) {
        return res.json({ aborted: false });
      }

      const aborted = activeHandle.abort();
      return res.status(202).json({
        aborted,
        turnId: activeHandle.turnId,
      });
    },
  );

  // 13. Side Questions: list active + persisted segment threads
  router.get(
    "/session/:id/side-chats",
    auth,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      return res.json(listSideChatThreads(existing));
    },
  );

  // 14. Side Questions: non-blocking contextual clarification stream (NDJSON)
  router.post(
    "/session/:id/side-chats/ask",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      try {
        const result = await askSideChatQuestion({
          session: existing,
          rawBody: req.body,
          loadSession,
          saveSession: persistSession,
          sideModelCaller: deps.sideModelCaller,
        });

        if (req.query.stream === "0") {
          await result.settled;
          const latest = await loadSession(sessionId);
          const updatedThread =
            latest?.sideChats?.find((t) => t.id === result.thread.id) ??
            result.thread;
          return res.json({ thread: updatedThread });
        }

        return pipeStreamToExpress(
          res,
          result.stream,
          "application/x-ndjson; charset=utf-8",
        );
      } catch (err) {
        if (err instanceof SideChatInputError) {
          return res.status(err.statusCode).json({ error: err.message });
        }
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Side chat ask failed." });
      }
    },
  );

  // 15. Side Questions: watch/reattach active thread NDJSON stream
  router.get(
    "/session/:id/side-chats/:threadId/stream",
    auth,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      const threadId = String(req.params.threadId || "").trim();
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      const stream = watchSideChatThread({
        session: existing,
        threadId,
        loadSession,
      });
      if (!stream) {
        return res.status(404).json({ error: "Side thread not found." });
      }
      return pipeStreamToExpress(
        res,
        stream,
        "application/x-ndjson; charset=utf-8",
      );
    },
  );

  // 16. Side Questions: stop in-flight helper reply cleanly
  router.post(
    "/session/:id/side-chats/:threadId/stop",
    auth,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      const threadId = String(req.params.threadId || "").trim();
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      const stopped = stopSideChatRun(sessionId, threadId);
      return res.json({ stopped });
    },
  );

  // 17. Side Questions: toggle open/docked presentation
  router.patch(
    "/session/:id/side-chats/:threadId",
    auth,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      const threadId = String(req.params.threadId || "").trim();
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      const body = (req.body ?? {}) as { open?: unknown; docked?: unknown };
      const target = existing.sideChats?.find((t) => t.id === threadId);
      if (!target) {
        return res.status(404).json({ error: "Side thread not found." });
      }

      const updatedThread = {
        ...target,
        ...(typeof body.open === "boolean" ? { open: body.open } : {}),
        ...(typeof body.docked === "boolean" ? { docked: body.docked } : {}),
      };
      const saved = await persistSession({
        ...existing,
        sideChats: enforceSideChatsBounds(
          (existing.sideChats ?? []).map((t) =>
            t.id === threadId ? updatedThread : t,
          ),
        ),
      });
      return res.json({
        thread:
          saved.sideChats?.find((t) => t.id === threadId) ?? updatedThread,
      });
    },
  );

  // 18. On-demand AI-verified visual counterexample / state diagram generator
  router.post(
    "/session/:id/visualize",
    auth,
    aiLimit,
    async (req: Request, res: Response) => {
      const uid = getAuthenticatedUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required." });

      const sessionId = String(req.params.id || "").trim();
      const existing = await loadSession(sessionId);
      if (!existing) {
        return res.status(404).json({ error: "Pattern session not found or expired." });
      }
      if (existing.userId !== uid) {
        return res.status(403).json({ error: "Forbidden." });
      }

      const body = (req.body ?? {}) as { brief?: unknown; strandId?: unknown };
      const strandId =
        typeof body.strandId === "string" && body.strandId.trim()
          ? body.strandId.trim()
          : existing.currentQuestion?.strandId ?? `${existing.patternId}:core`;
      const brief =
        typeof body.brief === "string" && body.brief.trim()
          ? body.brief.trim().slice(0, 500)
          : existing.currentQuestion?.prompt ||
            existing.lastEvaluation?.surgicalTeaching ||
            `Visual invariant trace for ${existing.patternId}`;

      try {
        const visual = await generateAndVerifyPatternVisual({
          patternId: existing.patternId,
          strandId,
          brief,
          visualModelCaller: engineDeps.visualModelCaller,
        });

        const updatedSession: PatternSessionState = {
          ...existing,
          currentQuestion: existing.currentQuestion
            ? { ...existing.currentQuestion, visualArtifact: visual }
            : existing.currentQuestion,
          lastEvaluation: existing.lastEvaluation
            ? { ...existing.lastEvaluation, visualArtifact: visual }
            : existing.lastEvaluation,
          updatedAt: new Date().toISOString(),
        };
        const saved = await persistSession(updatedSession);
        return res.json({
          visual,
          session: serializePublicSessionState(saved),
        });
      } catch (err) {
        return res
          .status(500)
          .json({ error: (err as Error)?.message || "Failed to generate visual diagram." });
      }
    },
  );

  return router;
}

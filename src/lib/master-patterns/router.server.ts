import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { PATTERN_CATALOG, getPatternDefinition } from "../../data/patterns";
import {
  getPatternSession,
  getUserPatternProfile,
  savePatternSession,
  saveUserPatternProfile,
  stripRubricFromCard,
} from "../../db/pattern-mastery";
import type { AuthRequest } from "../../middleware/auth";
import {
  buildCalibrationView,
  buildMasteryScorecard,
  createNewPatternSession,
  evaluateProbeSubmission,
  evaluateSubmissionAndBuildFollowUp,
  generateNextPatternQuestion,
  generateTailoredNotes,
  requestProgressiveHint,
  startCalibrationProbe,
  type PatternEngineDeps,
} from "./engine.server";
import {
  computePatternAggregateMetrics,
  getDueReviewStrands,
} from "./scheduler";
import {
  endPatternTurn,
  beginPatternTurn,
} from "./turn-liveness";
import {
  HintRungSchema,
  MissClassSchema,
  PatternIdSchema,
  QuestionModalitySchema,
  SubmissionPayloadSchema,
  TrackModeSchema,
  type PatternSessionState,
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
}

const noopMiddleware: PatternRateLimiter = (_req, _res, next) => next();

/**
 * Single public serializer seam (mirroring LearnHarness view projection):
 * guarantees server-committed question rubrics never cross the HTTP boundary.
 */
export function serializePublicSessionState(
  session: PatternSessionState,
): PatternSessionState {
  return {
    ...session,
    currentQuestion: stripRubricFromCard(session.currentQuestion),
    lastEvaluation: session.lastEvaluation
      ? sanitizeEvaluation(session.lastEvaluation)
      : null,
  };
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

        const savedProfile = await persistProfile(uid, updatedProfile);
        const savedSession = await persistSession(updatedSession);

        return res.json({
          evaluation: sanitizeEvaluation(evaluation),
          session: serializePublicSessionState(savedSession),
          profile: buildProfileResponse(savedProfile),
        });
      } catch (err) {
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

  return router;
}

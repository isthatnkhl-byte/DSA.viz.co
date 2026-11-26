import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  Brain,
  History,
  LayoutGrid,
  Loader2,
  MessageCircleQuestion,
  Network,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  apiAbortPatternTurn,
  apiAskSideChat,
  apiFetchPatternDag,
  apiFetchPatternProfile,
  apiGeneratePatternVisual,
  apiGetPatternSession,
  apiListSideChats,
  apiPatchSideChat,
  apiReattachPatternStream,
  apiRehydratePatternSession,
  apiStartPatternSession,
  apiSteerPatternTurn,
  apiStopSideChat,
  apiStreamPatternTurn,
  type CalibrationPromptData,
  type PatternDagFrontierResponse,
  type PatternProfileResponse,
} from "@/lib/master-patterns/client";
import {
  serializeCitation,
  type PatternCitation,
} from "@/lib/master-patterns/citations";
import { deriveActiveSegmentAnchor } from "@/lib/master-patterns/side-chat";
import {
  clearActiveLocalArchiveForPattern,
  getActiveLocalArchiveForPattern,
  saveLocalPatternArchive,
  type LocalTranscriptEntry,
} from "@/lib/master-patterns/local-store";
import type {
  PatternId,
  PatternSessionState,
  PatternTurnStreamEvent,
  SideChatAnchor,
  SideChatThread,
  SubmissionEvaluation,
  SubmissionPayload,
  TrackMode,
} from "@/lib/master-patterns/types";
import {
  AgentRuntimeBar,
  type LiveTurnUiState,
} from "@/components/patterns/AgentRuntimeBar";
import {
  SelectionToolbar,
  type CapturedSegmentSelection,
} from "@/components/patterns/SelectionToolbar";
import { SideThreadDrawer } from "@/components/patterns/SideThreadDrawer";
import { DictationRmsControl } from "@/components/patterns/DictationRmsControl";
import { VerifiedVisualCanvas } from "@/components/patterns/VerifiedVisualCanvas";
import { usePatternDictation } from "@/hooks/usePatternDictation";
import { PatternCatalogGrid } from "@/components/patterns/PatternCatalogGrid";
import { DagFrontierExplorer } from "@/components/patterns/DagFrontierExplorer";
import { LevelCalibrationCard } from "@/components/patterns/LevelCalibrationCard";
import { StructuredNotesPanel } from "@/components/patterns/StructuredNotesPanel";
import { AdaptiveQuestionStage } from "@/components/patterns/AdaptiveQuestionStage";
import { RemediationAndTwistCard } from "@/components/patterns/RemediationAndTwistCard";
import { StrandMasterySidebar } from "@/components/patterns/StrandMasterySidebar";
import { MasteryScorecardModal } from "@/components/patterns/MasteryScorecardModal";

export default function MasterPatternsPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "anon";

  const [profile, setProfile] = useState<PatternProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [resumablePatterns, setResumablePatterns] = useState<
    Record<string, boolean>
  >({});

  const [session, setSession] = useState<PatternSessionState | null>(null);
  const [calibration, setCalibration] = useState<CalibrationPromptData | null>(
    null,
  );
  const [transcript, setTranscript] = useState<LocalTranscriptEntry[]>([]);
  const [latestEval, setLatestEval] = useState<SubmissionEvaluation | null>(
    null,
  );
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [verbalDrafts, setVerbalDrafts] = useState<Record<string, string>>({});

  const [loadingPatternId, setLoadingPatternId] = useState<PatternId | null>(
    null,
  );
  const [loadingTrack, setLoadingTrack] = useState<TrackMode | null>(null);
  const [overviewTab, setOverviewTab] = useState<"catalog" | "dag">("catalog");
  const [dagData, setDagData] = useState<PatternDagFrontierResponse | null>(null);
  const [loadingDag, setLoadingDag] = useState(false);
  const [dagError, setDagError] = useState<string | null>(null);

  const [loadingProbe, setLoadingProbe] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [requestingHint, setRequestingHint] = useState(false);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const activeQuestionIdRef = useRef<string | null>(null);
  activeQuestionIdRef.current = session?.currentQuestion?.id ?? null;

  const handleDictationAppend = useCallback((targetId: string, chunk: string) => {
    const clean = chunk.trim();
    if (!clean) return;
    if (targetId === "verbal") {
      const qid = activeQuestionIdRef.current;
      if (!qid) return;
      setVerbalDrafts((prev) => ({
        ...prev,
        [qid]: prev[qid] ? `${prev[qid].trimEnd()} ${clean}` : clean,
      }));
      return;
    }
    if (targetId.startsWith("side:")) {
      const draftKey = targetId.slice("side:".length);
      setSideDrafts((prev) => ({
        ...prev,
        [draftKey]: prev[draftKey] ? `${prev[draftKey].trimEnd()} ${clean}` : clean,
      }));
    }
  }, []);

  const dictation = usePatternDictation(handleDictationAppend);

  // Side Companion & Selection Citations state (Wave 2)
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [sideDocked, setSideDocked] = useState(false);
  const [sideThreads, setSideThreads] = useState<SideChatThread[]>([]);
  const [activeSideThreadId, setActiveSideThreadId] = useState<string | null>(
    null,
  );
  const [pendingSideAnchor, setPendingSideAnchor] =
    useState<SideChatAnchor | null>(null);
  const [pendingSideQuotes, setPendingSideQuotes] = useState<
    Array<{ text: string; citation?: string }>
  >([]);
  const [sideDrafts, setSideDrafts] = useState<Record<string, string>>({});
  const [sideAnswering, setSideAnswering] = useState(false);
  const [sideStreamText, setSideStreamText] = useState("");
  const [pendingVerbalCitations, setPendingVerbalCitations] = useState<
    PatternCitation[]
  >([]);

  const IDLE_LIVE_TURN: LiveTurnUiState = {
    active: false,
    turnId: null,
    role: null,
    action: null,
    step: 0,
    reasoningText: "",
    toolCalls: [],
    steers: [],
  };
  const [liveTurn, setLiveTurn] = useState<LiveTurnUiState>(IDLE_LIVE_TURN);

  const applyStreamEvent = useCallback((ev: PatternTurnStreamEvent) => {
    setLiveTurn((prev) => {
      switch (ev.type) {
        case "turn_started":
          return {
            active: true,
            turnId: ev.turnId,
            role: ev.role,
            action: ev.action,
            step: 1,
            reasoningText: "",
            toolCalls: [],
            steers: [],
          };
        case "step_started":
          return { ...prev, active: true, step: ev.step, role: ev.role };
        case "reasoning_update":
          return { ...prev, reasoningText: ev.text };
        case "tool_call_start": {
          const exists = prev.toolCalls.some((t) => t.callId === ev.callId);
          return {
            ...prev,
            toolCalls: exists
              ? prev.toolCalls
              : [
                  ...prev.toolCalls,
                  {
                    callId: ev.callId,
                    toolName: ev.toolName,
                    argsPreview: ev.argsPreview,
                    status: "running",
                  },
                ],
          };
        }
        case "tool_call_end":
          return {
            ...prev,
            toolCalls: prev.toolCalls.map((tc) =>
              tc.callId === ev.callId
                ? {
                    ...tc,
                    status: ev.isError ? "error" : "completed",
                    healed: ev.healed,
                    resultPreview: ev.resultPreview,
                    durationMs: ev.durationMs,
                  }
                : tc,
            ),
          };
        case "steer_applied":
          return {
            ...prev,
            steers: prev.steers.some((s) => s.id === ev.steerId)
              ? prev.steers
              : [
                  ...prev.steers,
                  {
                    id: ev.steerId,
                    text: ev.text,
                    createdAt: new Date().toISOString(),
                  },
                ],
          };
        case "turn_settled":
        case "turn_error":
          return { ...prev, active: false };
        default:
          return prev;
      }
    });
  }, []);

  const loadDagFrontier = useCallback(async () => {
    setLoadingDag(true);
    setDagError(null);
    try {
      const res = await apiFetchPatternDag();
      setDagData(res);
    } catch (err) {
      setDagError((err as Error)?.message || "Failed to load DAG frontier.");
    } finally {
      setLoadingDag(false);
    }
  }, []);

  const loadCatalogAndResumables = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const prof = await apiFetchPatternProfile();
      setProfile(prof);

      const resumableEntries = await Promise.all(
        prof.patterns.map(async (p) => {
          const arch = await getActiveLocalArchiveForPattern(uid, p.id);
          return [
            p.id,
            Boolean(arch && arch.session.stage !== "completed"),
          ] as const;
        }),
      );
      setResumablePatterns(Object.fromEntries(resumableEntries));
    } catch (err) {
      toast.error(
        (err as Error)?.message || "Failed to load Master Patterns profile.",
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [uid]);

  useEffect(() => {
    void loadCatalogAndResumables();
  }, [loadCatalogAndResumables]);

  useEffect(() => {
    if (overviewTab === "dag" && !dagData && !loadingDag) {
      void loadDagFrontier();
    }
  }, [overviewTab, dagData, loadingDag, loadDagFrontier]);

  const syncArchiveToLocal = useCallback(
    async (
      nextSession: PatternSessionState,
      nextTranscript: LocalTranscriptEntry[],
      nextCodeDrafts: Record<string, string>,
      nextVerbalDrafts: Record<string, string>,
    ) => {
      await saveLocalPatternArchive({
        sessionId: nextSession.sessionId,
        userId: uid,
        patternId: nextSession.patternId,
        session: nextSession,
        notes: nextSession.notes,
        transcript: nextTranscript,
        codeDrafts: nextCodeDrafts,
        verbalDrafts: nextVerbalDrafts,
        sideDrafts,
        scorecard: nextSession.scorecard,
        updatedAt: new Date().toISOString(),
      });
    },
    [uid, sideDrafts],
  );

  // Sync side threads smoothly whenever sessionId changes or remote updates restore
  useEffect(() => {
    if (!session?.sessionId) {
      setSideThreads([]);
      return;
    }
    if (session.sideChats && session.sideChats.length > 0) {
      setSideThreads(session.sideChats);
      return;
    }
    void apiListSideChats(session.sessionId)
      .then((res) => {
        if (res.threads.length > 0) setSideThreads(res.threads);
      })
      .catch(() => {});
  }, [session?.sessionId, session?.sideChats]);

  const activeSegment = useMemo(() => {
    if (!session) return null;
    return deriveActiveSegmentAnchor(session);
  }, [session]);

  const currentSideThread = useMemo(() => {
    if (activeSideThreadId) {
      return sideThreads.find((t) => t.id === activeSideThreadId) ?? null;
    }
    if (pendingSideAnchor) {
      return (
        sideThreads.find(
          (t) => t.anchor.segmentId === pendingSideAnchor.segmentId,
        ) ?? null
      );
    }
    return null;
  }, [activeSideThreadId, pendingSideAnchor, sideThreads]);

  const currentSideDraftKey =
    currentSideThread?.id ??
    pendingSideAnchor?.segmentId ??
    activeSegment?.segmentId ??
    "default";

  const handleOpenSideForAnchor = useCallback(
    (anchor: SideChatAnchor) => {
      const existing = sideThreads.find(
        (t) => t.anchor.segmentId === anchor.segmentId,
      );
      setPendingSideAnchor(anchor);
      setActiveSideThreadId(existing?.id ?? null);
      setSideOpen(true);
    },
    [sideThreads],
  );

  const handleSelectionAsk = useCallback(
    (capture: CapturedSegmentSelection) => {
      const citStr = serializeCitation(capture.citation);
      setPendingSideQuotes((prev) => [
        ...prev.slice(-3),
        { text: capture.citation.text, citation: citStr },
      ]);
      handleOpenSideForAnchor(capture.anchor);
    },
    [handleOpenSideForAnchor],
  );

  const handleSelectionCite = useCallback(
    (capture: CapturedSegmentSelection) => {
      setPendingVerbalCitations((prev) => [...prev.slice(-3), capture.citation]);
      toast.success("Citation added to Verbal Reasoning box.");
    },
    [],
  );

  const handleAskSideQuestion = async (text: string, retry = false) => {
    if (!session || sideAnswering) return;
    const flushedSide = dictation
      .flushAndStop(`side:${currentSideDraftKey}`)
      .trim();
    const composedSideText = retry
      ? text
      : [text.trim(), flushedSide].filter(Boolean).join(" ").trim();
    if (!retry && !composedSideText) return;

    const targetAnchor =
      currentSideThread?.anchor ??
      pendingSideAnchor ??
      deriveActiveSegmentAnchor(session);
    const activeQid = session.currentQuestion?.id;
    const workingDraft = activeQid
      ? [verbalDrafts[activeQid], codeDrafts[activeQid]].filter(Boolean).join("\n")
      : undefined;

    setSideAnswering(true);
    setSideStreamText("");

    try {
      const updated = await apiAskSideChat(
        session.sessionId,
        {
          ...(currentSideThread
            ? { threadId: currentSideThread.id }
            : { anchor: targetAnchor }),
          text: composedSideText,
          quotes: pendingSideQuotes.map((q) => q.text),
          ...(pendingSideQuotes.some((q) => q.citation)
            ? {
                quoteCitations: pendingSideQuotes
                  .map((q) => q.citation)
                  .filter((c): c is string => Boolean(c)),
              }
            : {}),
          retry,
          requestId: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ...(workingDraft ? { workingDraft } : {}),
        },
        (ev) => {
          if (ev.type === "thread") {
            setActiveSideThreadId(ev.thread.id);
            setSideThreads((prev) =>
              prev.some((t) => t.id === ev.thread.id)
                ? prev.map((t) => (t.id === ev.thread.id ? ev.thread : t))
                : [...prev, ev.thread],
            );
          } else if (ev.type === "text") {
            setSideStreamText(ev.text);
          } else if (ev.type === "done") {
            setSideThreads((prev) =>
              prev.some((t) => t.id === ev.thread.id)
                ? prev.map((t) => (t.id === ev.thread.id ? ev.thread : t))
                : [...prev, ev.thread],
            );
          }
        },
      );

      setActiveSideThreadId(updated.id);
      if (!retry) {
        setSideDrafts((prev) => ({ ...prev, [currentSideDraftKey]: "" }));
        setPendingSideQuotes([]);
      }
      setSession((prev) =>
        prev
          ? {
              ...prev,
              sideChats: sideThreads.some((t) => t.id === updated.id)
                ? sideThreads.map((t) => (t.id === updated.id ? updated : t))
                : [...sideThreads, updated],
            }
          : prev,
      );
    } catch (err) {
      toast.error(
        (err as Error)?.message || "Failed to ask side companion.",
      );
    } finally {
      setSideAnswering(false);
      setSideStreamText("");
    }
  };

  const handleStopSideChat = async () => {
    if (!session || !currentSideThread) return;
    try {
      await apiStopSideChat(session.sessionId, currentSideThread.id);
    } catch {
      // Ignore stop errors
    }
  };

  const handleToggleSideDock = () => {
    const nextDocked = !sideDocked;
    setSideDocked(nextDocked);
    if (session && currentSideThread) {
      void apiPatchSideChat(session.sessionId, currentSideThread.id, {
        docked: nextDocked,
      }).catch(() => {});
    }
  };

  const handleSelectPattern = async (
    patternId: PatternId,
    resumeLocal: boolean,
  ) => {
    setLoadingPatternId(patternId);
    setLatestEval(null);
    try {
      if (resumeLocal) {
        const local = await getActiveLocalArchiveForPattern(uid, patternId);
        if (local) {
          try {
            const remote = await apiGetPatternSession(local.sessionId);
            const restored: PatternSessionState = {
              ...remote.session,
              notes: remote.session.notes ?? local.notes,
            };
            setSession(restored);
            setTranscript(local.transcript);
            setCodeDrafts(local.codeDrafts);
            setVerbalDrafts(local.verbalDrafts);
            if (local.sideDrafts) setSideDrafts(local.sideDrafts);
            if (restored.sideChats) setSideThreads(restored.sideChats);
            setLatestEval(restored.lastEvaluation);
            if (restored.turnInFlight) {
              toast.info("Reattaching to in-flight AI turn...");
              try {
                const settled = await apiReattachPatternStream(
                  restored.sessionId,
                  { onEvent: applyStreamEvent },
                );
                setSession(settled.session);
                if (settled.profile) {
                  setProfile(settled.profile as unknown as PatternProfileResponse);
                }
                if (settled.evaluation) setLatestEval(settled.evaluation);
                await syncArchiveToLocal(
                  settled.session,
                  local.transcript,
                  local.codeDrafts,
                  local.verbalDrafts,
                );
              } catch {
                // Keep snapshot restored cleanly
              } finally {
                setLiveTurn(IDLE_LIVE_TURN);
              }
            } else {
              toast.success("Resumed your pattern session.");
            }
            return;
          } catch {
            // Server cold-start or expired cache: rehydrate safely
            const rehydrated = await apiRehydratePatternSession(local.session);
            const restored: PatternSessionState = {
              ...rehydrated.session,
              notes: rehydrated.session.notes ?? local.notes,
            };
            setSession(restored);
            if (rehydrated.calibration) setCalibration(rehydrated.calibration);
            setTranscript(local.transcript);
            setCodeDrafts(local.codeDrafts);
            setVerbalDrafts(local.verbalDrafts);
            setLatestEval(restored.lastEvaluation);
            toast.success("Recovered session state seamlessly.");
            return;
          }
        }
      }

      await clearActiveLocalArchiveForPattern(uid, patternId);
      const started = await apiStartPatternSession(patternId);
      setSession(started.session);
      setCalibration(started.calibration);
      setTranscript([]);
      setCodeDrafts({});
      setVerbalDrafts({});
      await syncArchiveToLocal(started.session, [], {}, {});
    } catch (err) {
      toast.error(
        (err as Error)?.message || "Could not start pattern session.",
      );
    } finally {
      setLoadingPatternId(null);
    }
  };

  const handleSelectTrack = async (track: TrackMode) => {
    if (!session) return;
    setLoadingTrack(track);
    try {
      const settled = await apiStreamPatternTurn(
        session.sessionId,
        { kind: "select_level", track },
        { onEvent: applyStreamEvent },
      );
      if (settled.aborted) {
        toast.info("Track initialization stopped.");
      }
      setSession(settled.session);
      await syncArchiveToLocal(
        settled.session,
        transcript,
        codeDrafts,
        verbalDrafts,
      );
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to initialize track.");
    } finally {
      setLiveTurn(IDLE_LIVE_TURN);
      setLoadingTrack(null);
    }
  };

  const handleStartProbe = async () => {
    if (!session) return;
    setLoadingProbe(true);
    try {
      const settled = await apiStreamPatternTurn(
        session.sessionId,
        { kind: "start_probe" },
        { onEvent: applyStreamEvent },
      );
      setSession(settled.session);
      await syncArchiveToLocal(
        settled.session,
        transcript,
        codeDrafts,
        verbalDrafts,
      );
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to start calibration probe.");
    } finally {
      setLiveTurn(IDLE_LIVE_TURN);
      setLoadingProbe(false);
    }
  };

  const handleReadyQuestions = async () => {
    if (!session) return;
    setLoadingQuestions(true);
    try {
      const settled = await apiStreamPatternTurn(
        session.sessionId,
        { kind: "ready_questions" },
        { onEvent: applyStreamEvent },
      );
      setSession(settled.session);
      await syncArchiveToLocal(
        settled.session,
        transcript,
        codeDrafts,
        verbalDrafts,
      );
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to load questions.");
    } finally {
      setLiveTurn(IDLE_LIVE_TURN);
      setLoadingQuestions(false);
    }
  };

  const handleRequestHint = async () => {
    if (!session || !session.currentQuestion || requestingHint) return;
    setRequestingHint(true);
    try {
      const settled = await apiStreamPatternTurn(
        session.sessionId,
        { kind: "request_hint", questionId: session.currentQuestion.id },
        { onEvent: applyStreamEvent },
      );
      setSession(settled.session);
      await syncArchiveToLocal(
        settled.session,
        transcript,
        codeDrafts,
        verbalDrafts,
      );
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to generate progressive hint.");
    } finally {
      setLiveTurn(IDLE_LIVE_TURN);
      setRequestingHint(false);
    }
  };

  const handleSubmitAnswer = async (payload: SubmissionPayload) => {
    if (!session || !session.currentQuestion) return;
    const askedQuestion = session.currentQuestion;
    setSubmitting(true);

    try {
      const settled = await apiStreamPatternTurn(
        session.sessionId,
        { kind: "submit", payload },
        { onEvent: applyStreamEvent },
      );

      if (settled.aborted) {
        toast.info("Turn stopped cleanly. Your draft is preserved.");
        setSession(settled.session);
        return;
      }

      if (settled.profile) {
        setProfile(settled.profile as unknown as PatternProfileResponse);
      }
      if (settled.evaluation) {
        setLatestEval(settled.evaluation);
      }
      setPendingVerbalCitations([]);

      const nextTranscript = settled.evaluation
        ? [
            ...transcript,
            {
              id: payload.attemptId,
              timestamp: new Date().toISOString(),
              strandId: askedQuestion.strandId,
              question: askedQuestion,
              submittedAnswer: {
                selectedOptions: payload.selectedOptions,
                choseIdk: payload.choseIdk,
                verbalAnswer: payload.verbalAnswer,
                code: payload.code,
                language: payload.language,
                claimedTimeComplexity: payload.claimedTimeComplexity,
                claimedSpaceComplexity: payload.claimedSpaceComplexity,
              },
              evaluation: settled.evaluation,
            },
          ]
        : transcript;
      setTranscript(nextTranscript);

      let nextSession = settled.session;
      if (
        settled.evaluation?.readyForScorecard &&
        nextSession.stage !== "completed"
      ) {
        const fin = await apiStreamPatternTurn(nextSession.sessionId, {
          kind: "finish",
        });
        nextSession = fin.session;
        if (fin.profile) {
          setProfile(fin.profile as unknown as PatternProfileResponse);
        }
        await clearActiveLocalArchiveForPattern(uid, nextSession.patternId);
      }

      setSession(nextSession);
      await syncArchiveToLocal(
        nextSession,
        nextTranscript,
        codeDrafts,
        verbalDrafts,
      );
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.warning("Syncing active question state...");
        try {
          const fresh = await apiGetPatternSession(session.sessionId);
          setSession(fresh.session);
        } catch {
          // Ignore secondary refresh error
        }
      } else {
        toast.error((err as Error)?.message || "Submission failed.");
      }
    } finally {
      setLiveTurn(IDLE_LIVE_TURN);
      setSubmitting(false);
    }
  };

  const handleFinishEarly = async () => {
    if (!session) return;
    setFinishing(true);
    try {
      const fin = await apiStreamPatternTurn(
        session.sessionId,
        { kind: "finish" },
        { onEvent: applyStreamEvent },
      );
      setSession(fin.session);
      if (fin.profile) {
        setProfile(fin.profile as unknown as PatternProfileResponse);
      }
      await clearActiveLocalArchiveForPattern(uid, fin.session.patternId);
      await syncArchiveToLocal(fin.session, transcript, codeDrafts, verbalDrafts);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to generate scorecard.");
    } finally {
      setLiveTurn(IDLE_LIVE_TURN);
      setFinishing(false);
    }
  };

  const handleSteerTurn = async (text: string) => {
    if (!session) return;
    try {
      const res = await apiSteerPatternTurn(session.sessionId, text);
      if (res.accepted) {
        setLiveTurn((prev) => ({
          ...prev,
          steers: prev.steers.some((s) => s.id === res.steer.id)
            ? prev.steers
            : [...prev.steers, res.steer],
        }));
      }
    } catch (err) {
      toast.error((err as Error)?.message || "Could not steer running turn.");
    }
  };

  const handleAbortTurn = async () => {
    if (!session) return;
    try {
      await apiAbortPatternTurn(session.sessionId);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to stop turn.");
    }
  };

  const activePatternItem = useMemo(() => {
    if (!profile || !session) return null;
    return profile.patterns.find((p) => p.id === session.patternId) ?? null;
  }, [profile, session]);

  const handleDraftChange = useCallback(
    (verbal: string, code: string) => {
      if (!session?.currentQuestion) return;
      const qid = session.currentQuestion.id;
      setVerbalDrafts((prev) =>
        prev[qid] === verbal ? prev : { ...prev, [qid]: verbal },
      );
      setCodeDrafts((prev) =>
        prev[qid] === code ? prev : { ...prev, [qid]: code },
      );
    },
    [session?.currentQuestion],
  );

  const handleRequestVisualDiagram = async () => {
    if (!session || generatingVisual) return;
    setGeneratingVisual(true);
    try {
      const res = await apiGeneratePatternVisual(session.sessionId, {
        strandId: session.currentQuestion?.strandId,
      });
      setSession(res.session);
      toast.success(
        res.visual.verifiedByAuditor
          ? "Generated verified geometry diagram."
          : "Attached fallback trace diagram.",
      );
    } catch (err) {
      toast.error(
        (err as Error)?.message || "Failed to generate visual diagram.",
      );
    } finally {
      setGeneratingVisual(false);
    }
  };

  const handleBackToCatalog = () => {
    dictation.flushAndStop();
    setLiveTurn(IDLE_LIVE_TURN);
    setSideOpen(false);
    setActiveSideThreadId(null);
    setPendingSideAnchor(null);
    setPendingSideQuotes([]);
    setPendingVerbalCitations([]);
    setSession(null);
    setCalibration(null);
    setLatestEval(null);
    setDagData(null);
    void loadCatalogAndResumables();
    if (overviewTab === "dag") {
      void loadDagFrontier();
    }
  };

  const renderSideDrawer = (dockedMode: boolean) => {
    if (!session || !activeSegment || !sideOpen) return null;
    return (
      <SideThreadDrawer
        open={sideOpen}
        docked={dockedMode}
        thread={currentSideThread}
        pendingAnchor={pendingSideAnchor ?? activeSegment}
        pendingQuotes={pendingSideQuotes}
        activeSegmentId={activeSegment.segmentId}
        streamingText={sideStreamText}
        answering={sideAnswering}
        draft={sideDrafts[currentSideDraftKey] ?? ""}
        onDraftChange={(txt) =>
          setSideDrafts((prev) => ({
            ...prev,
            [currentSideDraftKey]: txt,
          }))
        }
        onRemoveQuote={(idx) =>
          setPendingSideQuotes((prev) => prev.filter((_, i) => i !== idx))
        }
        onAsk={handleAskSideQuestion}
        onStop={handleStopSideChat}
        onToggleDock={handleToggleSideDock}
        onClose={() => setSideOpen(false)}
        onJumpToCurrentStep={() => {
          if (activeSegment) handleOpenSideForAnchor(activeSegment);
        }}
        onSwitchThread={(tid) => setActiveSideThreadId(tid)}
        allThreads={sideThreads}
        dictationSlot={
          <DictationRmsControl
            compact
            targetId={`side:${currentSideDraftKey}`}
            activeTarget={dictation.activeTarget}
            error={dictation.error}
            disabled={sideAnswering}
            onToggle={(id) => void dictation.toggleTarget(id)}
            subscribeVolume={dictation.subscribeVolume}
          />
        }
      />
    );
  };

  const renderQuestionDictation = () => (
    <DictationRmsControl
      targetId="verbal"
      activeTarget={dictation.activeTarget}
      interimText={dictation.interimFor("verbal")}
      error={dictation.error}
      disabled={submitting}
      onToggle={(id) => void dictation.toggleTarget(id)}
      subscribeVolume={dictation.subscribeVolume}
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main
        ref={workspaceRef}
        className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      >
        {/* Page Masthead */}
        <div className="border-b-2 border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary font-bold">
              <Brain className="size-4" />
              ADAPTIVE INVARIANT ENGINE // LEARNHARNESS METHODOLOGY
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight font-display">
              Master DSA Patterns
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
              Choose an interview pattern, calibrate at Intermediate or Pro, and train through
              first-principles invariants, verbal reasoning checks, case-study code audits, and
              instant twisted follow-up questions tailored to your gaps.
            </p>
          </div>

          {!session && profile && (
            <div className="inline-flex border-2 border-border bg-card p-1 gap-1 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setOverviewTab("catalog")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                  overviewTab === "catalog"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="size-3.5" />
                Catalog ({profile.patterns.length})
              </button>
              <button
                type="button"
                onClick={() => setOverviewTab("dag")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                  overviewTab === "dag"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Network className="size-3.5" />
                DAG &amp; Frontier (49)
              </button>
            </div>
          )}

          {session && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!sideOpen && activeSegment) {
                    handleOpenSideForAnchor(activeSegment);
                  } else {
                    setSideOpen((prev) => !prev);
                  }
                }}
                className={`inline-flex items-center gap-1.5 border px-3.5 py-2 font-mono text-xs uppercase tracking-[0.12em] cursor-pointer ${
                  sideOpen
                    ? "border-primary bg-primary/15 text-primary font-bold"
                    : "border-border bg-card hover:border-primary"
                }`}
              >
                <MessageCircleQuestion className="size-3.5 text-primary" />
                Side Q&amp;A{sideThreads.length > 0 ? ` (${sideThreads.length})` : ""}
              </button>
              {session.questionHistory.length > 0 &&
                session.stage !== "completed" && (
                  <button
                    type="button"
                    disabled={finishing}
                    onClick={handleFinishEarly}
                    className="inline-flex items-center gap-1.5 border border-border bg-card px-3.5 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:border-primary cursor-pointer"
                  >
                    <Award className="size-3.5 text-primary" />
                    {finishing ? "Scoring..." : "Finish & Rate Mastery"}
                  </button>
                )}
              <button
                type="button"
                onClick={handleBackToCatalog}
                className="inline-flex items-center gap-1.5 border border-border bg-card px-3.5 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:border-primary cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                All Patterns
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loadingProfile && !profile && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="size-7 animate-spin text-primary" />
            <span className="font-mono text-xs uppercase tracking-[0.16em]">
              Loading Pattern Telemetry & Cognitive Profile...
            </span>
          </div>
        )}

        {/* Stage 0: Pattern Catalog or Global 49-Node DAG Explorer */}
        {profile && !session && overviewTab === "catalog" && (
          <PatternCatalogGrid
            profile={profile}
            resumablePatterns={resumablePatterns}
            loadingPatternId={loadingPatternId}
            onSelectPattern={handleSelectPattern}
          />
        )}

        {profile && !session && overviewTab === "dag" && (
          <DagFrontierExplorer
            data={dagData}
            loading={loadingDag}
            error={dagError}
            loadingPatternId={loadingPatternId}
            onRefresh={() => void loadDagFrontier()}
            onSelectPattern={handleSelectPattern}
          />
        )}

        {/* Live Agent Runtime, Tool Execution & Steer Telemetry */}
        {session && (
          <AgentRuntimeBar
            liveState={liveTurn}
            lastTrace={session.lastTurnTrace}
            onSteer={handleSteerTurn}
            onAbort={handleAbortTurn}
          />
        )}

        {/* Stage 1: Calibration */}
        {session && session.stage === "calibration" && calibration && (
          <LevelCalibrationCard
            calibration={calibration}
            loadingTrack={loadingTrack}
            loadingProbe={loadingProbe}
            onSelectTrack={handleSelectTrack}
            onStartProbe={handleStartProbe}
            onBack={handleBackToCatalog}
          />
        )}

        {/* Stage 1b: Optional 2-Question Diagnostic Probe */}
        {session && session.stage === "probing" && session.currentQuestion && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="border-2 border-primary bg-primary/5 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  DIAGNOSTIC CALIBRATION PROBE // QUESTION{" "}
                  {session.probeState?.questionsAsked ?? 1} OF 2
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Measuring your invariant baseline & ceiling to place you cleanly in Intermediate or Pro.
                </p>
              </div>
              <span className="font-mono text-xs font-bold border border-border bg-card px-2.5 py-1">
                {session.probeState?.questionsAsked ?? 1}/2
              </span>
            </div>

            {latestEval && (
              <>
                <RemediationAndTwistCard
                  evaluation={latestEval}
                  onOpenSideQuestion={handleOpenSideForAnchor}
                />
                {latestEval.visualArtifact && (
                  <VerifiedVisualCanvas
                    artifact={latestEval.visualArtifact}
                    compact
                  />
                )}
              </>
            )}

            <AdaptiveQuestionStage
              sessionId={session.sessionId}
              question={session.currentQuestion}
              submitting={submitting}
              hints={session.currentQuestionHints}
              requestingHint={requestingHint}
              onRequestHint={handleRequestHint}
              onOpenSideQuestion={handleOpenSideForAnchor}
              pendingCitations={pendingVerbalCitations}
              onRemoveCitation={(idx) =>
                setPendingVerbalCitations((prev) =>
                  prev.filter((_, i) => i !== idx),
                )
              }
              initialVerbalDraft={
                verbalDrafts[session.currentQuestion.id] ?? ""
              }
              initialCodeDraft={codeDrafts[session.currentQuestion.id]}
              onDraftChange={handleDraftChange}
              dictationControl={renderQuestionDictation()}
              onFlushDictation={() => dictation.flushAndStop("verbal")}
              generatingVisual={generatingVisual}
              onRequestVisualDiagram={handleRequestVisualDiagram}
              onSubmit={handleSubmitAnswer}
            />
          </div>
        )}

        {/* Stage 2-4: Active Workspace (Main + Strand Mastery Rail) */}
        {session &&
          session.stage !== "calibration" &&
          session.stage !== "probing" &&
          activePatternItem &&
          profile && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                {session.probeState?.recommendationRationale &&
                  session.stage === "studying_notes" && (
                    <div className="border border-primary/40 bg-primary/5 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span>{session.probeState.recommendationRationale}</span>
                      <button
                        type="button"
                        onClick={() => handleSelectTrack("pro")}
                        className="font-mono text-[10px] uppercase font-bold border border-border bg-card px-2.5 py-1 hover:border-primary cursor-pointer"
                      >
                        Switch to Pro instead
                      </button>
                    </div>
                  )}
                {/* Completed Scorecard */}
                {session.stage === "completed" && session.scorecard && (
                  <MasteryScorecardModal
                    scorecard={session.scorecard}
                    patternTitle={activePatternItem.title}
                    onPracticeAgain={() =>
                      handleSelectPattern(session.patternId, false)
                    }
                    onReturnToCatalog={handleBackToCatalog}
                  />
                )}

                {/* Intermediate Structured Notes */}
                {session.stage === "studying_notes" && session.notes && (
                  <StructuredNotesPanel
                    notes={session.notes}
                    loadingQuestions={loadingQuestions}
                    onStartQuestions={handleReadyQuestions}
                    onOpenSideQuestion={handleOpenSideForAnchor}
                  />
                )}

                {/* Latest Evaluation / Surgical Remediation */}
                {latestEval && session.stage !== "completed" && (
                  <>
                    <RemediationAndTwistCard
                      evaluation={latestEval}
                      onOpenSideQuestion={handleOpenSideForAnchor}
                    />
                    {latestEval.visualArtifact && (
                      <VerifiedVisualCanvas
                        artifact={latestEval.visualArtifact}
                        compact
                      />
                    )}
                  </>
                )}

                {/* Active Adaptive Question Stage */}
                {(session.stage === "questioning" ||
                  session.stage === "remediating") &&
                  session.currentQuestion && (
                    <AdaptiveQuestionStage
                      sessionId={session.sessionId}
                      question={session.currentQuestion}
                      submitting={submitting}
                      hints={session.currentQuestionHints}
                      requestingHint={requestingHint}
                      onRequestHint={handleRequestHint}
                      onOpenSideQuestion={handleOpenSideForAnchor}
                      pendingCitations={pendingVerbalCitations}
                      onRemoveCitation={(idx) =>
                        setPendingVerbalCitations((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      initialVerbalDraft={
                        verbalDrafts[session.currentQuestion.id] ?? ""
                      }
                      initialCodeDraft={codeDrafts[session.currentQuestion.id]}
                      onDraftChange={handleDraftChange}
                      dictationControl={renderQuestionDictation()}
                      onFlushDictation={() => dictation.flushAndStop("verbal")}
                      generatingVisual={generatingVisual}
                      onRequestVisualDiagram={handleRequestVisualDiagram}
                      onSubmit={handleSubmitAnswer}
                    />
                  )}

                {/* Local Session Transcript Log */}
                {transcript.length > 0 && (
                  <div className="border border-border bg-card/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <History className="size-3.5" />
                      Local Session Trace ({transcript.length} turn
                      {transcript.length === 1 ? "" : "s"} stored in browser)
                    </div>
                    <div className="space-y-2">
                      {transcript.map((item, idx) => (
                        <div
                          key={item.id}
                          className="border border-border bg-background p-3 text-xs flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-[10px] text-primary uppercase">
                              Turn {idx + 1} · {item.question.modality} ·{" "}
                              {item.strandId.split(":")[1] ?? item.strandId}
                            </div>
                            <p className="truncate text-foreground/90 mt-0.5">
                              {item.evaluation.verdictSummary}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-bold shrink-0">
                            {item.evaluation.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-4">
                {sideDocked && renderSideDrawer(true)}
                <StrandMasterySidebar
                  patternItem={activePatternItem}
                  profile={profile}
                  session={session}
                />
              </div>
            </div>
          )}
      </main>

      {session && activeSegment && (
        <>
          <SelectionToolbar
            containerRef={workspaceRef}
            sessionId={session.sessionId}
            onAsk={handleSelectionAsk}
            onCite={handleSelectionCite}
          />
          {!sideDocked && renderSideDrawer(false)}
        </>
      )}
    </div>
  );
}

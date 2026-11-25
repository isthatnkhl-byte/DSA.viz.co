import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  Brain,
  History,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  apiFetchPatternProfile,
  apiFinishPatternSession,
  apiGetPatternSession,
  apiReadyPatternQuestions,
  apiRehydratePatternSession,
  apiRequestPatternHint,
  apiSelectPatternLevel,
  apiStartCalibrationProbe,
  apiStartPatternSession,
  apiSubmitPatternAnswer,
  type CalibrationPromptData,
  type PatternProfileResponse,
} from "@/lib/master-patterns/client";
import {
  clearActiveLocalArchiveForPattern,
  getActiveLocalArchiveForPattern,
  saveLocalPatternArchive,
  type LocalTranscriptEntry,
} from "@/lib/master-patterns/local-store";
import type {
  PatternId,
  PatternSessionState,
  SubmissionEvaluation,
  SubmissionPayload,
  TrackMode,
} from "@/lib/master-patterns/types";
import { PatternCatalogGrid } from "@/components/patterns/PatternCatalogGrid";
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
  const [loadingProbe, setLoadingProbe] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [requestingHint, setRequestingHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);

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
        scorecard: nextSession.scorecard,
        updatedAt: new Date().toISOString(),
      });
    },
    [uid],
  );

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
            setLatestEval(restored.lastEvaluation);
            toast.success("Resumed your pattern session.");
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
      const res = await apiSelectPatternLevel(session.sessionId, track);
      setSession(res.session);
      await syncArchiveToLocal(res.session, transcript, codeDrafts, verbalDrafts);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to initialize track.");
    } finally {
      setLoadingTrack(null);
    }
  };

  const handleStartProbe = async () => {
    if (!session) return;
    setLoadingProbe(true);
    try {
      const res = await apiStartCalibrationProbe(session.sessionId);
      setSession(res.session);
      await syncArchiveToLocal(res.session, transcript, codeDrafts, verbalDrafts);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to start calibration probe.");
    } finally {
      setLoadingProbe(false);
    }
  };

  const handleReadyQuestions = async () => {
    if (!session) return;
    setLoadingQuestions(true);
    try {
      const res = await apiReadyPatternQuestions(session.sessionId);
      setSession(res.session);
      await syncArchiveToLocal(res.session, transcript, codeDrafts, verbalDrafts);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to load questions.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleRequestHint = async () => {
    if (!session || !session.currentQuestion || requestingHint) return;
    setRequestingHint(true);
    try {
      const res = await apiRequestPatternHint(
        session.sessionId,
        session.currentQuestion.id,
      );
      setSession(res.session);
      await syncArchiveToLocal(res.session, transcript, codeDrafts, verbalDrafts);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to generate progressive hint.");
    } finally {
      setRequestingHint(false);
    }
  };

  const handleSubmitAnswer = async (payload: SubmissionPayload) => {
    if (!session || !session.currentQuestion) return;
    const askedQuestion = session.currentQuestion;
    setSubmitting(true);

    try {
      const res = await apiSubmitPatternAnswer(payload);
      setProfile(res.profile);
      setLatestEval(res.evaluation);

      const entry: LocalTranscriptEntry = {
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
        evaluation: res.evaluation,
      };
      const nextTranscript = [...transcript, entry];
      setTranscript(nextTranscript);

      let nextSession = res.session;
      if (res.evaluation.readyForScorecard && nextSession.stage !== "completed") {
        const fin = await apiFinishPatternSession(nextSession.sessionId);
        nextSession = fin.session;
        setProfile(fin.profile);
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
      setSubmitting(false);
    }
  };

  const handleFinishEarly = async () => {
    if (!session) return;
    setFinishing(true);
    try {
      const fin = await apiFinishPatternSession(session.sessionId);
      setSession(fin.session);
      setProfile(fin.profile);
      await clearActiveLocalArchiveForPattern(uid, fin.session.patternId);
      await syncArchiveToLocal(fin.session, transcript, codeDrafts, verbalDrafts);
    } catch (err) {
      toast.error((err as Error)?.message || "Failed to generate scorecard.");
    } finally {
      setFinishing(false);
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

  const handleBackToCatalog = () => {
    setSession(null);
    setCalibration(null);
    setLatestEval(null);
    void loadCatalogAndResumables();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

          {session && (
            <div className="flex items-center gap-2">
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

        {/* Stage 0: Pattern Catalog */}
        {profile && !session && (
          <PatternCatalogGrid
            profile={profile}
            resumablePatterns={resumablePatterns}
            loadingPatternId={loadingPatternId}
            onSelectPattern={handleSelectPattern}
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

            {latestEval && <RemediationAndTwistCard evaluation={latestEval} />}

            <AdaptiveQuestionStage
              sessionId={session.sessionId}
              question={session.currentQuestion}
              submitting={submitting}
              hints={session.currentQuestionHints}
              requestingHint={requestingHint}
              onRequestHint={handleRequestHint}
              initialVerbalDraft={
                verbalDrafts[session.currentQuestion.id] ?? ""
              }
              initialCodeDraft={codeDrafts[session.currentQuestion.id]}
              onDraftChange={handleDraftChange}
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
                  />
                )}

                {/* Latest Evaluation / Surgical Remediation */}
                {latestEval && session.stage !== "completed" && (
                  <RemediationAndTwistCard evaluation={latestEval} />
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
                      initialVerbalDraft={
                        verbalDrafts[session.currentQuestion.id] ?? ""
                      }
                      initialCodeDraft={codeDrafts[session.currentQuestion.id]}
                      onDraftChange={handleDraftChange}
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

              <div className="lg:col-span-4">
                <StrandMasterySidebar
                  patternItem={activePatternItem}
                  profile={profile}
                  session={session}
                />
              </div>
            </div>
          )}
      </main>
    </div>
  );
}

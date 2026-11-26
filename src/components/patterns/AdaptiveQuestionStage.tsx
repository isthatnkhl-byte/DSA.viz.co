import React, { useEffect, useState } from "react";
import {
  Code2,
  Flame,
  Gauge,
  HelpCircle,
  Lightbulb,
  MessageCircleQuestion,
  MessageSquare,
  Play,
  Quote,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { MonacoCodeEditor } from "@/components/editor/MonacoCodeEditor";
import { VerifiedVisualCanvas } from "@/components/patterns/VerifiedVisualCanvas";
import { WorkImageUploadBar } from "@/components/patterns/WorkImageUploadBar";
import type { SupportedLanguage } from "@/lib/codeTemplates";
import {
  citationLabel,
  serializeCitation,
  type PatternCitation,
} from "@/lib/master-patterns/citations";
import type {
  PatternCodeLanguage,
  PatternQuestionCard,
  QuestionHintEntry,
  SideChatAnchor,
  SubmissionPayload,
  SubmittedWorkImageInput,
} from "@/lib/master-patterns/types";

interface AdaptiveQuestionStageProps {
  sessionId: string;
  question: PatternQuestionCard;
  submitting: boolean;
  hints?: QuestionHintEntry[];
  requestingHint?: boolean;
  onRequestHint?: () => void;
  onOpenSideQuestion?: (anchor: SideChatAnchor) => void;
  pendingCitations?: PatternCitation[];
  onRemoveCitation?: (index: number) => void;
  initialVerbalDraft?: string;
  initialCodeDraft?: string;
  onDraftChange?: (verbal: string, code: string) => void;
  dictationControl?: React.ReactNode;
  onFlushDictation?: () => string;
  generatingVisual?: boolean;
  onRequestVisualDiagram?: () => Promise<void> | void;
  onSubmit: (payload: SubmissionPayload) => void;
}

const CONFIDENCE_STOPS = [
  { value: 25, label: "Guessing", pct: "25%" },
  { value: 55, label: "Somewhat Sure", pct: "55%" },
  { value: 80, label: "Confident", pct: "80%" },
  { value: 95, label: "Certain", pct: "95%" },
] as const;

const CODE_LANGUAGES: Array<{ value: PatternCodeLanguage; label: string }> = [
  { value: "cpp", label: "C++20" },
  { value: "python", label: "Python 3.12" },
  { value: "java", label: "Java 21" },
  { value: "typescript", label: "TypeScript" },
];

export const AdaptiveQuestionStage: React.FC<AdaptiveQuestionStageProps> = ({
  sessionId,
  question,
  submitting,
  hints = [],
  requestingHint = false,
  onRequestHint,
  onOpenSideQuestion,
  pendingCitations = [],
  onRemoveCitation,
  initialVerbalDraft = "",
  initialCodeDraft,
  onDraftChange,
  dictationControl,
  onFlushDictation,
  generatingVisual = false,
  onRequestVisualDiagram,
  onSubmit,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [choseIdk, setChoseIdk] = useState(false);
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [workImages, setWorkImages] = useState<SubmittedWorkImageInput[]>([]);
  const [verbalAnswer, setVerbalAnswer] = useState(initialVerbalDraft);
  const [codeLang, setCodeLang] = useState<PatternCodeLanguage>(
    question.codeStarter?.language ?? "cpp",
  );
  const [code, setCode] = useState(
    initialCodeDraft ?? question.codeStarter?.starter ?? "",
  );
  const [claimedTime, setClaimedTime] = useState("");
  const [claimedSpace, setClaimedSpace] = useState("");
  const [runSandbox, setRunSandbox] = useState(false);

  // Reset form cleanly only when switching to a new questionId
  useEffect(() => {
    setSelectedOptions([]);
    setChoseIdk(false);
    setConfidence(undefined);
    setWorkImages([]);
    setVerbalAnswer(initialVerbalDraft);
    setCodeLang(question.codeStarter?.language ?? "cpp");
    setCode(initialCodeDraft ?? question.codeStarter?.starter ?? "");
    setClaimedTime("");
    setClaimedSpace("");
    setRunSandbox(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  // Sync external verbal updates (e.g., voice dictation append) without wiping form selections
  useEffect(() => {
    setVerbalAnswer((prev) =>
      prev === initialVerbalDraft ? prev : initialVerbalDraft,
    );
  }, [initialVerbalDraft]);

  useEffect(() => {
    onDraftChange?.(verbalAnswer, code);
  }, [verbalAnswer, code, onDraftChange]);

  const isTwist = question.modality === "twisted_followup";
  const isCode = question.modality === "code_snippet";
  const hasOptions = Boolean(question.options && question.options.length > 0);

  const toggleOption = (val: string) => {
    setChoseIdk(false);
    if (question.multiSelect) {
      setSelectedOptions((prev) =>
        prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
      );
    } else {
      setSelectedOptions([val]);
    }
  };

  const canSubmit = (() => {
    if (submitting) return false;
    if (choseIdk) return true;
    if (isCode) {
      return code.trim().length >= 10 && verbalAnswer.trim().length >= 5;
    }
    if (hasOptions) {
      return selectedOptions.length > 0;
    }
    return verbalAnswer.trim().length >= 5;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const flushedChunk = onFlushDictation?.().trim() ?? "";
    const attemptId = `att_${question.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const citationLinks =
      pendingCitations.length > 0
        ? pendingCitations.map((c) => serializeCitation(c)).join(" ")
        : "";
    const combinedRawVerbal = [verbalAnswer.trim(), flushedChunk]
      .filter(Boolean)
      .join(" ")
      .trim();
    const composedVerbal = [citationLinks, combinedRawVerbal]
      .filter(Boolean)
      .join("\n");

    onSubmit({
      sessionId,
      questionId: question.id,
      attemptId,
      selectedOptions: hasOptions && !choseIdk ? selectedOptions : undefined,
      choseIdk,
      confidence: choseIdk ? undefined : confidence,
      verbalAnswer: composedVerbal || undefined,
      code: isCode ? code : undefined,
      language: isCode ? codeLang : undefined,
      claimedTimeComplexity: isCode ? claimedTime.trim() || undefined : undefined,
      claimedSpaceComplexity: isCode ? claimedSpace.trim() || undefined : undefined,
      runSandbox: isCode ? runSandbox : undefined,
      workImages: workImages.length > 0 ? workImages : undefined,
    });
  };

  const monacoLanguage: SupportedLanguage =
    codeLang === "python"
      ? "python"
      : codeLang === "java"
        ? "java"
        : codeLang === "typescript" || codeLang === "javascript"
          ? "javascript"
          : "cpp";

  return (
    <form
      onSubmit={handleSubmit}
      className={`border-2 bg-card p-6 space-y-5 ${
        isTwist
          ? "border-amber-500 shadow-[5px_5px_0px_0px_rgb(245,158,11)]"
          : "border-border shadow-[5px_5px_0px_0px_var(--border)]"
      }`}
    >
      {/* Question Header Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {isTwist ? (
            <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-500 border border-amber-500/40 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
              <Flame className="size-3.5" />
              TWISTED INDIRECT FOLLOW-UP ({question.twistOperator})
            </span>
          ) : isCode ? (
            <span className="inline-flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/40 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
              <Code2 className="size-3.5" />
              PRO CASE STUDY // CODE & COMPLEXITY AUDIT
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/30 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
              <Sparkles className="size-3.5" />
              {question.phase.toUpperCase()} CHECK
            </span>
          )}
          {question.questionRole && (
            <span className="border border-border bg-muted/50 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {question.questionRole}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground uppercase">
            Strand: {question.strandId.split(":")[1] ?? question.strandId}
          </span>
          {onRequestVisualDiagram && (
            <button
              type="button"
              disabled={submitting || generatingVisual}
              onClick={() => void onRequestVisualDiagram()}
              className="inline-flex items-center gap-1 border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-foreground hover:border-primary disabled:opacity-40 cursor-pointer"
            >
              <Wand2 className="size-3 text-primary" />
              {generatingVisual ? "Drawing..." : "Trace Diagram"}
            </button>
          )}
          {onOpenSideQuestion && (
            <button
              type="button"
              onClick={() =>
                onOpenSideQuestion({
                  segmentId: `q:${question.id}`,
                  kind: "question",
                  title: `Check (${question.strandId.split(":")[1] ?? question.strandId})`,
                  excerpt: question.prompt,
                })
              }
              className="inline-flex items-center gap-1 border border-primary/40 bg-primary/5 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary hover:bg-primary/15 cursor-pointer"
            >
              <MessageCircleQuestion className="size-3" />
              Side Q
            </button>
          )}
        </div>
      </div>

      {/* Prompt (Highlight text to Ask or Cite) */}
      <div
        data-side-segment-id={`q:${question.id}`}
        data-side-segment-kind="question"
        data-side-segment-title={`Check (${question.strandId.split(":")[1] ?? question.strandId})`}
        className="space-y-2"
      >
        <p className="text-sm sm:text-base font-medium text-foreground whitespace-pre-line leading-relaxed">
          {question.prompt}
        </p>
        {question.contextSnippet && (
          <div className="border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
            {question.contextSnippet}
          </div>
        )}
        {question.visualArtifact && (
          <VerifiedVisualCanvas artifact={question.visualArtifact} />
        )}
      </div>

      {/* MCQ Options + "I don't know" LearnHarness Escape Hatch */}
      {hasOptions && (
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Select Option{question.multiSelect ? "s" : ""}
          </div>
          {question.options!.map((opt, idx) => {
            const active = !choseIdk && selectedOptions.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleOption(opt.value)}
                className={`w-full text-left flex items-start gap-3 border p-3.5 transition-all cursor-pointer ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-foreground/90 hover:border-primary/50"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border font-mono text-[11px] font-bold ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-xs sm:text-sm leading-relaxed">
                  {opt.label}
                </span>
              </button>
            );
          })}

          {question.allowIdk && (
            <button
              type="button"
              onClick={() => {
                setChoseIdk(true);
                setSelectedOptions([]);
                setConfidence(undefined);
              }}
              className={`w-full text-left flex items-center gap-2.5 border border-dashed p-3 transition-all cursor-pointer ${
                choseIdk
                  ? "border-amber-500 bg-amber-500/10 text-amber-500"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-amber-500/50"
              }`}
            >
              <HelpCircle className="size-4 shrink-0" />
              <span className="font-mono text-xs">
                I don&apos;t know yet — diagnose my gap and teach me why
              </span>
            </button>
          )}
        </div>
      )}

      {/* Code Snippet Editor (Pro Case Study) */}
      {isCode && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase text-muted-foreground">
                Language:
              </span>
              <select
                value={codeLang}
                onChange={(e) =>
                  setCodeLang(e.target.value as PatternCodeLanguage)
                }
                className="border border-border bg-background px-2.5 py-1 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
              >
                {CODE_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={runSandbox}
                onChange={(e) => setRunSandbox(e.target.checked)}
                className="accent-primary"
              />
              <Play className="size-3 text-emerald-500" />
              Verify syntax/compile in Sandbox (optional)
            </label>
          </div>

          <div className="border border-border overflow-hidden">
            <MonacoCodeEditor
              key={`${question.id}-${codeLang}`}
              code={code}
              onChange={setCode}
              defaultLanguage={monacoLanguage}
              height="270px"
              showSubmitButton={false}
              enableLeetCodeJudge={false}
              problemTitle={question.patternId}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                Claimed Time Complexity
              </label>
              <input
                type="text"
                value={claimedTime}
                onChange={(e) => setClaimedTime(e.target.value)}
                placeholder="e.g. O(n) or O(n log n)"
                className="w-full border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                Claimed Auxiliary Space Complexity
              </label>
              <input
                type="text"
                value={claimedSpace}
                onChange={(e) => setClaimedSpace(e.target.value)}
                placeholder="e.g. O(1) or O(n)"
                className="w-full border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mandatory/Encouraged Verbal Reasoning Box (LearnHarness Thinking Field) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground font-semibold">
            <MessageSquare className="size-3.5 text-primary" />
            {isCode
              ? "Verbal Approach & Loop Invariant (Required)"
              : hasOptions
                ? "Think Out Loud — Explain Your Reasoning"
                : "Your Verbal / Text Answer"}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {hasOptions && (
              <span className="font-mono text-[10px] text-amber-500">
                Verified against option to catch lucky guesses
              </span>
            )}
            {dictationControl}
          </div>
        </div>
        {pendingCitations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingCitations.map((c, idx) => (
              <span
                key={`${c.segmentId}_${c.start}_${idx}`}
                className="inline-flex items-center gap-1.5 border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-500 max-w-full"
              >
                <Quote className="size-2.5 shrink-0" />
                <span className="truncate max-w-[260px]">
                  {citationLabel(c)}
                </span>
                {onRemoveCitation && (
                  <button
                    type="button"
                    onClick={() => onRemoveCitation(idx)}
                    className="hover:text-foreground cursor-pointer"
                  >
                    <X className="size-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <textarea
          rows={isCode || !hasOptions ? 4 : 2}
          value={verbalAnswer}
          onChange={(e) => setVerbalAnswer(e.target.value)}
          placeholder={
            isCode
              ? "State your core invariant, why suboptimal approaches fail, and justify your Time/Space bounds..."
              : "Explain in your own words why this invariant holds or what constraint breaks it..."
          }
          className="w-full border border-border bg-background p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-y"
        />

        {/* Explicit Confidence Calibration Selector (LearnHarness 25-confidence doctrine) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border border-border/80 bg-background/60 px-3 py-2">
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <Gauge className="size-3.5 text-primary" />
            <span>Self-Confidence</span>
          </div>
          {choseIdk ? (
            <span className="font-mono text-[10px] text-amber-500">
              Suppressed on &ldquo;I don&apos;t know&rdquo; — honest gap recorded
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {CONFIDENCE_STOPS.map((stop) => {
                const active = confidence === stop.value;
                return (
                  <button
                    key={stop.value}
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      setConfidence((prev) =>
                        prev === stop.value ? undefined : stop.value,
                      )
                    }
                    className={`border px-2 py-1 font-mono text-[10px] transition-colors cursor-pointer ${
                      active
                        ? "border-primary bg-primary/15 text-primary font-bold"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {stop.label} ({stop.pct})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <WorkImageUploadBar
          images={workImages}
          onChange={setWorkImages}
          disabled={submitting}
        />
      </div>

      {/* Progressive R0..R3 Hint Ladder (LearnHarness Scaffold) */}
      {hints.length > 0 && (
        <div className="space-y-2 border border-primary/30 bg-primary/5 p-3.5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-primary flex items-center gap-1.5">
            <Lightbulb className="size-3.5" />
            Progressive Hints Used ({hints.length}/4)
          </div>
          <div className="space-y-2">
            {hints.map((h) => (
              <div
                key={h.rung}
                className="border border-border bg-background/80 px-3 py-2 text-xs"
              >
                <span className="font-mono text-[10px] font-bold text-primary mr-2">
                  [{h.rung} · {h.label}]
                </span>
                <span className="text-foreground/90">{h.hintText}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Action + Progressive Hint Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {onRequestHint && hints.length < 4 && (
            <button
              type="button"
              disabled={submitting || requestingHint}
              onClick={onRequestHint}
              className="inline-flex items-center gap-1.5 border border-primary/40 bg-primary/5 px-3 py-2 font-mono text-[11px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-40 cursor-pointer"
            >
              <Lightbulb className="size-3.5" />
              {requestingHint
                ? "Generating Hint..."
                : `Need a Nudge? (Hint R${hints.length})`}
            </button>
          )}
          {!hasOptions && question.allowIdk && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                const flushed = onFlushDictation?.().trim() ?? "";
                const attemptId = `idk_${question.id}_${Date.now()}`;
                onSubmit({
                  sessionId,
                  questionId: question.id,
                  attemptId,
                  choseIdk: true,
                  verbalAnswer:
                    [verbalAnswer.trim(), flushed].filter(Boolean).join(" ") ||
                    "I'm unsure where to start.",
                  workImages: workImages.length > 0 ? workImages : undefined,
                });
              }}
              className="inline-flex items-center gap-1.5 border border-border px-3 py-2 font-mono text-[11px] text-muted-foreground hover:text-amber-500 hover:border-amber-500 cursor-pointer"
            >
              <HelpCircle className="size-3.5" />
              I&apos;m stuck — teach me
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="ml-auto inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] hover:opacity-90 disabled:opacity-40 cursor-pointer"
        >
          <Send className="size-3.5" />
          {submitting ? "Evaluating & Auditing..." : "Submit Answer"}
        </button>
      </div>
    </form>
  );
};

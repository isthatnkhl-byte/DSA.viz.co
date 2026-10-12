import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GitCompare,
  Code2,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/context/ChatContext";
import { getAuth } from "firebase/auth";
import { getAuthHeaders } from "@/lib/api-client";
import { toast } from "sonner";

export interface InterviewerNudge {
  level: number;
  title: string;
  text: string;
}

export interface DetectedIssue {
  line: number;
  type: "syntax" | "typing" | "logic" | "edge_case";
  severity: "error" | "warning";
  description: string;
  suggestionHint: string;
}

export interface DiffHunk {
  line: number;
  code: string;
  status: "clean" | "warning" | "error";
  hint?: string;
}

export interface DiffNudgeResult {
  hasErrors: boolean;
  summary: string;
  interviewerNudges: InterviewerNudge[];
  detectedIssues: DetectedIssue[];
  diffHunks: DiffHunk[];
  promptSuggestion?: string;
}

interface ProblemDiffNudgePanelProps {
  problemSlug: string;
  problemTitle: string;
  difficulty?: string;
  code: string;
  pseudocode?: string;
  compilerError?: string;
  onRunCheck?: () => void;
  isLoading?: boolean;
}

export function ProblemDiffNudgePanel({
  problemSlug,
  problemTitle,
  difficulty = "Medium",
  code,
  pseudocode,
  compilerError,
  isLoading: parentLoading,
}: ProblemDiffNudgePanelProps) {
  const { openChat } = useChat();
  const [activeTab, setActiveTab] = useState<"nudges" | "diff" | "lint">("nudges");
  const [analysis, setAnalysis] = useState<DiffNudgeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [revealedNudgeLevels, setRevealedNudgeLevels] = useState<number[]>([1]);

  const effectiveCode = (code || pseudocode || "").trim();

  const runAnalysis = async () => {
    if (!effectiveCode) {
      toast.info("Write or paste some code or pseudocode first to run interviewer analysis.");
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/code-diff-nudge", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...authHeaders,
        },
        body: JSON.stringify({
          code: effectiveCode,
          pseudocode,
          problemSlug,
          problemTitle,
          difficulty,
          compilerError,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze code");
      }

      setAnalysis(data);
      setRevealedNudgeLevels([1]); // start with Level 1 gentle hint
      if (data.hasErrors) {
        toast.warning("Socratic Interviewer noticed possible typing or logical edge cases.");
      } else {
        toast.success("Algorithm looks clean! Invariant checkpoints passed.");
      }
    } catch (err: any) {
      console.error("Diff nudge error:", err);
      toast.error(err.message || "Could not analyze code. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevealNextNudge = () => {
    const nextLevel = (revealedNudgeLevels[revealedNudgeLevels.length - 1] || 1) + 1;
    if (nextLevel <= 3) {
      setRevealedNudgeLevels((prev) => [...prev, nextLevel]);
    }
  };

  const handleAskInChat = (customPrompt?: string) => {
    openChat({
      problemSlug,
      problemTitle,
      difficulty,
      userCode: effectiveCode,
      compilerOutput: compilerError,
      role: "interviewer",
      customPrompt:
        customPrompt ||
        `I have a question about my approach for "${problemTitle}". Can you analyze what edge cases, typing slips, or logic traps I should check, and guide me on how to fix them?`,
    });
  };

  return (
    <div
      id="problem-diff-nudge-panel"
      className="rounded-2xl border border-border/80 bg-card/85 shadow-md backdrop-blur-md overflow-hidden transition-all duration-300"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary">
            <GitCompare className="size-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-foreground">
                Interviewer Invariant &amp; Diff Nudge Panel
              </span>
              {analysis && (
                <span
                  className={`rounded-full px-2 py-0.2 font-mono text-[9px] font-extrabold uppercase tracking-wider ${
                    analysis.hasErrors
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {analysis.hasErrors ? "Nudge Active" : "Code Clean"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              Syntax, Typo &amp; Logic Inspection • No Direct Spoilers
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runAnalysis}
            disabled={loading || parentLoading || !effectiveCode}
            className="h-7 gap-1.5 px-2.5 text-xs font-semibold"
          >
            <RefreshCw className={`size-3 text-primary ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analyzing..." : "Analyze Code"}
          </Button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Tabs Bar */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-1.5 bg-background/50 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("nudges")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "nudges"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Lightbulb className="size-3.5" />
                <span>Interviewer Nudges</span>
                {analysis?.interviewerNudges?.length ? (
                  <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[9px] font-mono">
                    {analysis.interviewerNudges.length}
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => setActiveTab("diff")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "diff"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Code2 className="size-3.5" />
                <span>Mistake Diff</span>
                {analysis?.diffHunks?.some((h) => h.status !== "clean") && (
                  <span className="ml-1 rounded-full bg-amber-400/30 px-1.5 py-0.2 text-[9px] font-mono text-amber-200">
                    !
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("lint")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "lint"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <AlertTriangle className="size-3.5" />
                <span>Syntax &amp; Typo Lint</span>
                {analysis?.detectedIssues?.length ? (
                  <span className="ml-1 rounded-full bg-red-400/30 px-1.5 py-0.2 text-[9px] font-mono text-red-200">
                    {analysis.detectedIssues.length}
                  </span>
                ) : null}
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAskInChat()}
              className="h-6 gap-1 px-2 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/10"
            >
              <MessageSquare className="size-3" />
              Ask in Chat
            </Button>
          </div>

          {/* Panel Body */}
          <div className="p-4 text-xs">
            {!analysis && !loading && (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Ready to audit your code with Socratic Interviewer Nudges
                </p>
                <p className="max-w-md text-[11px] text-muted-foreground">
                  Write your logic in the editor, then click <strong>Analyze Code</strong>. If you
                  have subtle syntax errors, typing slips, or logic bugs, the AI will nudge you
                  step-by-step without spoiling the answer.
                </p>
                <Button
                  size="sm"
                  onClick={runAnalysis}
                  disabled={!effectiveCode}
                  className="mt-2 text-xs font-bold"
                >
                  Analyze My Code Now
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground animate-pulse">
                <Sparkles className="size-6 text-primary animate-spin" />
                <span className="text-xs font-medium">
                  Reviewing syntax, typing patterns, and invariant bounds...
                </span>
              </div>
            )}

            {analysis && !loading && (
              <>
                {/* Summary Banner */}
                {analysis.summary && (
                  <div
                    className={`mb-3 rounded-xl p-3 text-xs leading-relaxed border ${
                      analysis.hasErrors
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {analysis.hasErrors ? (
                        <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="font-bold">
                          {analysis.hasErrors ? "Interviewer Observation: " : "Verdict: "}
                        </strong>
                        {analysis.summary}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 1: Progressive Socratic Nudges */}
                {activeTab === "nudges" && (
                  <div className="space-y-3">
                    {analysis.interviewerNudges?.map((nudge) => {
                      const isRevealed = revealedNudgeLevels.includes(nudge.level);
                      return (
                        <div
                          key={nudge.level}
                          className={`rounded-xl border p-3.5 transition-all ${
                            isRevealed
                              ? "border-primary/30 bg-card shadow-xs"
                              : "border-border/50 bg-background/30 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                                Level {nudge.level}
                              </span>
                              <h4 className="font-bold text-foreground text-xs">{nudge.title}</h4>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {nudge.level === 1
                                ? "Gentle Check"
                                : nudge.level === 2
                                ? "Directional Clue"
                                : "Deep Invariant"}
                            </span>
                          </div>

                          {isRevealed ? (
                            <p className="text-xs leading-relaxed text-muted-foreground pl-1">
                              {nudge.text}
                            </p>
                          ) : (
                            <div className="flex items-center justify-between py-1">
                              <span className="text-[11px] text-muted-foreground italic">
                                Hint hidden to encourage self-discovery...
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleRevealNextNudge}
                                className="h-6 text-[10px] font-bold"
                              >
                                Reveal Level {nudge.level}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {revealedNudgeLevels.length < (analysis.interviewerNudges?.length || 3) && (
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleRevealNextNudge}
                          className="h-7 text-xs text-primary gap-1 font-bold hover:bg-primary/10"
                        >
                          Need more direction? Reveal next clue <ArrowRight className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Mistake Diff View */}
                {activeTab === "diff" && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Inspect flagged lines in your code against interviewer invariants:
                    </p>
                    <div className="rounded-xl border border-border/80 bg-background/80 font-mono text-[11px] overflow-hidden">
                      {analysis.diffHunks?.length ? (
                        analysis.diffHunks.map((hunk, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-2.5 px-3 py-1.5 border-b border-border/40 last:border-0 ${
                              hunk.status === "error"
                                ? "bg-red-500/10 text-red-200"
                                : hunk.status === "warning"
                                ? "bg-amber-500/10 text-amber-200"
                                : "text-muted-foreground"
                            }`}
                          >
                            <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground/60 select-none">
                              {hunk.line || idx + 1}
                            </span>
                            <span className="shrink-0 select-none font-bold">
                              {hunk.status === "error" ? "✕" : hunk.status === "warning" ? "▲" : " "}
                            </span>
                            <div className="flex-1 overflow-x-auto">
                              <span className="text-foreground">{hunk.code}</span>
                              {hunk.hint && (
                                <div className="mt-0.5 text-[10px] font-sans text-primary font-medium">
                                  💡 {hunk.hint}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          No structural diff issues flagged.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 3: Syntax & Typo Lint */}
                {activeTab === "lint" && (
                  <div className="space-y-2.5">
                    {analysis.detectedIssues?.length ? (
                      analysis.detectedIssues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl border p-3 ${
                            issue.severity === "error"
                              ? "border-red-500/30 bg-red-500/10"
                              : "border-amber-500/30 bg-amber-500/10"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                              {issue.severity === "error" ? (
                                <ShieldAlert className="size-3.5 text-red-400" />
                              ) : (
                                <AlertTriangle className="size-3.5 text-amber-400" />
                              )}
                              <span>Line {issue.line}</span>
                              <span className="rounded bg-background/60 px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                {issue.type}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-foreground font-medium mb-1">
                            {issue.description}
                          </p>
                          <p className="text-[11px] text-primary">
                            <strong>Interviewer Tip:</strong> {issue.suggestionHint}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-1">
                        <CheckCircle2 className="size-6 text-emerald-400" />
                        <span className="text-xs font-bold text-foreground">
                          No syntax or typing flaws detected!
                        </span>
                        <span className="text-[11px]">
                          Variables, loop bounds, and statements passed lint validation.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Action Prompt */}
                {analysis.promptSuggestion && (
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Suggested question to explore:
                    </span>
                    <button
                      onClick={() => handleAskInChat(analysis.promptSuggestion)}
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      "{analysis.promptSuggestion}" <ArrowRight className="size-3" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

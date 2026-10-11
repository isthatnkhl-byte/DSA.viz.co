import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Play,
  Send,
  Terminal,
  Clock,
  Cpu,
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Layers,
  History,
  Lightbulb,
  Compass,
  Wrench,
  CopyPlus,
  RotateCcw,
  Eye,
  BarChart3,
} from "lucide-react";
import type {
  LeetCodeSampleCase,
  LeetCodeRunResponse,
  LeetCodeSubmitResponse,
  LeetCodeSubmissionHistoryEntry,
  LeetCodeLearningDiagnostics,
} from "@/lib/leetcode-testcases";

export type DrawerTabType = "testcase" | "result" | "submission" | "history";

export interface LeetCodeTestDrawerProps {
  sampleCases: LeetCodeSampleCase[];
  runResult: LeetCodeRunResponse | null;
  submitResult: LeetCodeSubmitResponse | null;
  isRunning: boolean;
  isSubmitting: boolean;
  customInput: string;
  onCustomInputChange: (val: string) => void;
  onUseAsCustomInput?: (inputVal: string) => void;
  onRunTests: () => void;
  onSubmitCode: () => void;
  activeDrawerTab: DrawerTabType;
  onTabChange: (tab: DrawerTabType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  profileSaved?: boolean;
  submissionHistory?: LeetCodeSubmissionHistoryEntry[];
  onRestoreSubmission?: (entry: LeetCodeSubmissionHistoryEntry) => void;
  onSyncToVisualizer?: () => void;
}

const RUNTIME_HISTOGRAM_BUCKETS = [8, 18, 34, 22, 12, 7, 4, 3, 2, 1];
const MEMORY_HISTOGRAM_BUCKETS = [6, 14, 28, 30, 16, 9, 5, 3, 2, 1];

function LearningDiagnosticsCard({
  diagnostics,
  isAccepted,
  estimatedTime,
  optimalTime,
}: {
  diagnostics: LeetCodeLearningDiagnostics;
  isAccepted: boolean;
  estimatedTime?: string;
  optimalTime?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
          <Compass className="size-3.5 shrink-0" />
          <span>Algorithmic Pattern &amp; Invariant Coach</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary">
            Pattern: {diagnostics.detectedPattern}
          </span>
          {optimalTime && (
            <span className="rounded-md bg-background/80 border border-border/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Target: <strong className="text-foreground">{optimalTime}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-border/60 bg-background/80 p-2 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
            <Lightbulb className="size-3 text-amber-400" />
            <span>Core Invariant</span>
          </div>
          <p className="text-foreground/90 leading-relaxed">{diagnostics.keyInvariant}</p>
        </div>

        {!isAccepted && (diagnostics.rootCause || diagnostics.fixHint) ? (
          <div className="rounded-lg border border-rose-500/35 bg-rose-500/10 p-2 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-rose-300">
              <Wrench className="size-3 text-rose-400" />
              <span>Root Cause &amp; Actionable Fix</span>
            </div>
            {diagnostics.rootCause && (
              <p className="text-rose-200/95 leading-relaxed">{diagnostics.rootCause}</p>
            )}
            {diagnostics.fixHint && (
              <p className="text-emerald-300/95 font-medium leading-relaxed">
                Fix: {diagnostics.fixHint}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-400">
              <Sparkles className="size-3" />
              <span>Optimization &amp; Next Step</span>
            </div>
            <p className="text-foreground/90 leading-relaxed">
              {diagnostics.nextOptimizationTip ||
                (estimatedTime === optimalTime
                  ? `Optimal ${optimalTime || ""} complexity achieved! Try verifying space trade-offs.`
                  : `Can you refine ${estimatedTime || "current"} toward ${optimalTime || "optimal"} time?`)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export const LeetCodeTestDrawer: React.FC<LeetCodeTestDrawerProps> = ({
  sampleCases,
  runResult,
  submitResult,
  isRunning,
  isSubmitting,
  customInput,
  onCustomInputChange,
  onUseAsCustomInput,
  onRunTests,
  onSubmitCode,
  activeDrawerTab,
  onTabChange,
  isCollapsed = false,
  onToggleCollapse,
  profileSaved = false,
  submissionHistory = [],
  onRestoreSubmission,
  onSyncToVisualizer,
}) => {
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number>(0);
  const [selectedResultIdx, setSelectedResultIdx] = useState<number>(0);

  // When runResult updates, select the first failing case if any, otherwise Case 1
  useEffect(() => {
    if (runResult && runResult.cases.length > 0) {
      const firstFailed = runResult.cases.findIndex((c) => !c.passed);
      setSelectedResultIdx(firstFailed >= 0 ? firstFailed : 0);
    }
  }, [runResult]);

  const isCustomSelected = selectedSampleIdx === sampleCases.length;
  const activeSampleCase = sampleCases[selectedSampleIdx] || sampleCases[0];
  const activeResultCase =
    runResult?.cases[selectedResultIdx] || runResult?.cases[0] || null;

  const handleLoadIntoCustom = (inputStr: string) => {
    onCustomInputChange(inputStr);
    if (onUseAsCustomInput) {
      onUseAsCustomInput(inputStr);
    }
    setSelectedSampleIdx(sampleCases.length);
    onTabChange("testcase");
  };

  const activeEngineBadge =
    activeDrawerTab === "submission"
      ? submitResult?.executionEngine
      : runResult?.executionEngine;

  // Compute which histogram bar to highlight based on percentile
  const runtimeHighlightIdx = submitResult
    ? Math.max(
        0,
        Math.min(
          RUNTIME_HISTOGRAM_BUCKETS.length - 1,
          Math.floor(((100 - submitResult.runtimePercentile) / 100) * RUNTIME_HISTOGRAM_BUCKETS.length)
        )
      )
    : 2;

  const memoryHighlightIdx = submitResult
    ? Math.max(
        0,
        Math.min(
          MEMORY_HISTOGRAM_BUCKETS.length - 1,
          Math.floor(((100 - submitResult.memoryPercentile) / 100) * MEMORY_HISTOGRAM_BUCKETS.length)
        )
      )
    : 3;

  return (
    <div className="flex flex-col rounded-xl border border-border/80 bg-card/95 overflow-hidden shadow-sm">
      {/* LeetCode Drawer Top Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/40 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {/* Tab 1: Testcase (3 Sample Cases + Custom) */}
          <button
            type="button"
            onClick={() => {
              onTabChange("testcase");
              if (isCollapsed && onToggleCollapse) onToggleCollapse();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all cursor-pointer ${
              activeDrawerTab === "testcase"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Testcase ({sampleCases.length})</span>
          </button>

          {/* Tab 2: Test Result */}
          <button
            type="button"
            onClick={() => {
              onTabChange("result");
              if (isCollapsed && onToggleCollapse) onToggleCollapse();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all cursor-pointer ${
              activeDrawerTab === "result"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="size-3.5 text-primary" />
            <span>Test Result</span>
            {isRunning && (
              <span className="size-2 rounded-full bg-primary animate-ping" />
            )}
            {!isRunning && runResult && (
              <span
                className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                  runResult.status === "Accepted"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                }`}
              >
                {runResult.passedCount}/{runResult.totalCount}
              </span>
            )}
          </button>

          {/* Tab 3: Submission Verdict */}
          <button
            type="button"
            onClick={() => {
              onTabChange("submission");
              if (isCollapsed && onToggleCollapse) onToggleCollapse();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all cursor-pointer ${
              activeDrawerTab === "submission"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Submission</span>
            {isSubmitting && (
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            )}
            {!isSubmitting && submitResult && (
              <span
                className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                  submitResult.status === "Accepted"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                }`}
              >
                {submitResult.status === "Accepted"
                  ? "Accepted"
                  : submitResult.status === "Time Limit Exceeded"
                  ? "TLE"
                  : "Failed"}
              </span>
            )}
          </button>

          {/* Tab 4: Per-Problem Submission History */}
          <button
            type="button"
            onClick={() => {
              onTabChange("history");
              if (isCollapsed && onToggleCollapse) onToggleCollapse();
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all cursor-pointer ${
              activeDrawerTab === "history"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-3.5 text-amber-400" />
            <span>History</span>
            {submissionHistory.length > 0 && (
              <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-bold text-foreground">
                {submissionHistory.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {activeEngineBadge && !isCollapsed && (
            <span className="hidden md:inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/70 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              <Cpu className="size-2.5 text-primary" />
              {activeEngineBadge}
            </span>
          )}

          {onSyncToVisualizer && (
            <button
              type="button"
              onClick={onSyncToVisualizer}
              title="Send your editor code to the interactive step-by-step visualizer canvas"
              className="rounded-md border border-primary/40 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Eye className="size-3" />
              <span>Visualize Code</span>
            </button>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-md border border-border/60 bg-background/70 px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
            >
              {isCollapsed ? (
                <>
                  <ChevronUp className="size-3" /> Expand
                </>
              ) : (
                <>
                  <ChevronDown className="size-3" /> Minimize
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Body */}
      {!isCollapsed && (
        <div className="p-3 font-mono text-xs space-y-3 max-h-[380px] overflow-y-auto">
          {/* TAB 1: TESTCASE (3 Sample Cases + Custom Case) */}
          {activeDrawerTab === "testcase" && (
            <div className="space-y-2.5">
              {/* Case Pill Selector */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {sampleCases.map((tc, idx) => (
                    <button
                      key={tc.id}
                      type="button"
                      onClick={() => setSelectedSampleIdx(idx)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedSampleIdx === idx
                          ? "border-primary bg-primary/15 text-foreground shadow-2xs"
                          : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>Case {tc.caseNumber}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedSampleIdx(sampleCases.length)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      isCustomSelected
                        ? "border-primary bg-primary/15 text-foreground shadow-2xs"
                        : "border-dashed border-border/80 bg-background/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Plus className="size-3" />
                    <span>Custom</span>
                    {customInput.trim() && (
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                    )}
                  </button>
                </div>

                {!isCustomSelected && activeSampleCase && (
                  <button
                    type="button"
                    onClick={() => handleLoadIntoCustom(activeSampleCase.input)}
                    className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copy this testcase into the Custom tab to tweak and test variations"
                  >
                    <CopyPlus className="size-3 text-primary" />
                    <span>Clone to Custom</span>
                  </button>
                )}
              </div>

              {/* Selected Case Content */}
              {isCustomSelected ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
                    <span>Custom Testcase Input (Evaluated alongside 3 sample cases)</span>
                    {customInput.trim() && (
                      <button
                        type="button"
                        onClick={() => onCustomInputChange("")}
                        className="text-rose-400 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    value={customInput}
                    onChange={(e) => onCustomInputChange(e.target.value)}
                    rows={2}
                    placeholder={
                      sampleCases[0]?.input ||
                      "e.g. nums = [2, 7, 11, 15], target = 9"
                    }
                    className="w-full rounded-lg border border-border/80 bg-background/90 p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ) : activeSampleCase ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/70 bg-background/80 p-2.5 space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Input =
                    </span>
                    <div className="text-foreground font-semibold break-all">
                      {activeSampleCase.input}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-background/80 p-2.5 space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Expected Output =
                    </span>
                    <div className="text-emerald-400 font-bold break-all">
                      {activeSampleCase.expectedOutput}
                    </div>
                  </div>
                  {activeSampleCase.explanation && (
                    <div className="sm:col-span-2 text-[11px] text-muted-foreground px-1">
                      {activeSampleCase.explanation}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: TEST RESULT (3 Sample Testcases Execution Output) */}
          {activeDrawerTab === "result" && (
            <div className="space-y-3">
              {isRunning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Sparkles className="size-4 animate-spin" />
                    <span>Running against {sampleCases.length + (customInput.trim() ? 1 : 0)} testcases...</span>
                  </div>
                  <span className="text-[11px]">
                    Executing harness, serializing data structures, and verifying invariants...
                  </span>
                </div>
              ) : !runResult ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center text-muted-foreground">
                  <p className="text-xs">
                    Click <strong className="text-foreground">Run</strong> (or press{" "}
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                      Ctrl+Enter
                    </kbd>
                    ) to test your code against the 3 sample testcases.
                  </p>
                  <button
                    type="button"
                    onClick={onRunTests}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 cursor-pointer"
                  >
                    <Play className="size-3 fill-current" /> Run 3 Sample Testcases
                  </button>
                </div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      {runResult.status === "Accepted" ? (
                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="size-4 text-rose-400 shrink-0" />
                      )}
                      <span
                        className={`text-sm font-black tracking-tight ${
                          runResult.status === "Accepted"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {runResult.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        • Runtime: <strong className="text-foreground">{runResult.totalRuntimeMs} ms</strong>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {runResult.estimatedTimeComplexity &&
                        runResult.estimatedTimeComplexity !== "Incomplete" && (
                          <span className="rounded-md bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary">
                            Detected: {runResult.estimatedTimeComplexity} time ·{" "}
                            {runResult.estimatedSpaceComplexity} space
                          </span>
                        )}
                      {runResult.optimalTimeComplexity && (
                        <span className="rounded-md bg-muted/70 border border-border/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Optimal: {runResult.optimalTimeComplexity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compiler or Runtime Error Box */}
                  {runResult.compilerOutput && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider">
                        Compiler / Runtime Diagnostic
                      </div>
                      <pre className="whitespace-pre-wrap text-[11px] leading-relaxed">
                        {runResult.compilerOutput}
                      </pre>
                    </div>
                  )}

                  {/* Auto-Moved to Submit Callout when all testcases pass */}
                  {runResult.status === "Accepted" &&
                    runResult.totalCount > 0 &&
                    runResult.passedCount === runResult.totalCount && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-300">
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                          <span>
                            All {runResult.passedCount}/{runResult.totalCount} AI-tested testcases passed — Code automatically moved to Submit!
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onTabChange("submission")}
                          className="rounded-md bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                        >
                          View Submission Verdict →
                        </button>
                      </div>
                    )}

                  {/* Per-Case Tabs (All Testcases AI Tested With) */}
                  {runResult.cases.length > 0 && (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {runResult.cases.map((tc, idx) => (
                            <button
                              key={tc.caseNumber}
                              type="button"
                              onClick={() => setSelectedResultIdx(idx)}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                selectedResultIdx === idx
                                  ? "border-primary bg-primary/15 text-foreground shadow-2xs"
                                  : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span
                                className={`size-2 rounded-full ${
                                  tc.passed ? "bg-emerald-400" : "bg-rose-400"
                                }`}
                              />
                              <span>
                                {tc.isCustom
                                  ? "Custom"
                                  : tc.label || `Case ${tc.caseNumber}`}
                              </span>
                              <span
                                className={`rounded px-1 py-0.2 text-[9px] font-black uppercase ${
                                  tc.passed
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-rose-500/20 text-rose-400"
                                }`}
                              >
                                {tc.passed ? "PASS" : "FAIL"}
                              </span>
                            </button>
                          ))}
                        </div>

                        {activeResultCase && !activeResultCase.passed && !activeResultCase.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleLoadIntoCustom(activeResultCase.input)}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 cursor-pointer"
                          >
                            <CopyPlus className="size-3" />
                            <span>Debug in Custom Testcase</span>
                          </button>
                        )}
                      </div>

                      {activeResultCase && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
                            <span>
                              Tested Case #{activeResultCase.caseNumber}:{" "}
                              <strong className="text-foreground">
                                {activeResultCase.category || activeResultCase.label}
                              </strong>
                            </span>
                            <span
                              className={`font-bold ${
                                activeResultCase.passed ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {activeResultCase.passed ? "✓ PASSED" : "✗ FAILED"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border/70 bg-background/80 p-2.5 space-y-1">
                              <span className="text-[10px] uppercase text-muted-foreground block">
                                Tested Input
                              </span>
                              <div className="text-foreground break-all">
                                {activeResultCase.input}
                              </div>
                            </div>
                            <div
                              className={`rounded-lg border p-2.5 space-y-1 ${
                                activeResultCase.passed
                                  ? "border-emerald-500/30 bg-emerald-500/5"
                                  : "border-rose-500/40 bg-rose-500/10"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
                                <span>Your Output</span>
                                <span>{activeResultCase.runtimeMs} ms</span>
                              </div>
                              <div
                                className={`font-bold break-all ${
                                  activeResultCase.passed
                                    ? "text-emerald-400"
                                    : "text-rose-300"
                                }`}
                              >
                                {activeResultCase.actualOutput}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-background/80 p-2.5 space-y-1">
                              <span className="text-[10px] uppercase text-muted-foreground block">
                                Expected Output
                              </span>
                              <div className="text-emerald-400 font-bold break-all">
                                {activeResultCase.expectedOutput}
                              </div>
                            </div>
                          </div>

                          {/* Diff Hint Pinpoint Callout */}
                          {!activeResultCase.passed && activeResultCase.diffHint && (
                            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300 flex items-center gap-2">
                              <AlertTriangle className="size-3.5 shrink-0 text-amber-400" />
                              <span>
                                <strong>Diff Diagnostic:</strong> {activeResultCase.diffHint}
                              </span>
                            </div>
                          )}

                          {activeResultCase.stdout && (
                            <div className="rounded-lg border border-border/70 bg-background/80 p-2 space-y-0.5">
                              <span className="text-[10px] uppercase text-muted-foreground block">
                                Stdout
                              </span>
                              <pre className="whitespace-pre-wrap text-[11px] text-foreground">
                                {activeResultCase.stdout}
                              </pre>
                            </div>
                          )}

                          {activeResultCase.explanation &&
                            activeResultCase.explanation !== activeResultCase.diffHint && (
                              <div className="text-[11px] text-muted-foreground px-1">
                                {activeResultCase.explanation}
                              </div>
                            )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Learning & Pattern Coach Card */}
                  {runResult.learningDiagnostics && (
                    <LearningDiagnosticsCard
                      diagnostics={runResult.learningDiagnostics}
                      isAccepted={runResult.status === "Accepted"}
                      estimatedTime={runResult.estimatedTimeComplexity}
                      optimalTime={runResult.optimalTimeComplexity}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: SUBMISSION VERDICT (AI Test Suite & Pass/Fail Breakdown) */}
          {activeDrawerTab === "submission" && (
            <div className="space-y-3">
              {isSubmitting ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-center">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Sparkles className="size-4 animate-spin" />
                    <span>AI Judge Testing Your Code &amp; Finalizing Submission...</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground max-w-md">
                    Testing official sample cases, boundary conditions, and edge cases tailored to this problem...
                  </p>
                </div>
              ) : !submitResult ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center text-muted-foreground">
                  <p className="text-xs">
                    Click <strong className="text-foreground">Run</strong> (to test with AI testcases and auto-submit if all pass) or <strong className="text-foreground">Submit</strong> (
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                      Ctrl+Shift+Enter
                    </kbd>
                    ).
                  </p>
                  <button
                    type="button"
                    onClick={onSubmitCode}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer shadow-xs"
                  >
                    <Send className="size-3" /> Test &amp; Submit Solution
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Verdict Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      {submitResult.status === "Accepted" ? (
                        <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                      ) : submitResult.status === "Time Limit Exceeded" ? (
                        <Clock className="size-5 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="size-5 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-base font-black tracking-tight ${
                              submitResult.status === "Accepted"
                                ? "text-emerald-400"
                                : submitResult.status === "Time Limit Exceeded"
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {submitResult.status}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                            {submitResult.passedCases} / {submitResult.totalCases} AI-tested testcases passed
                          </span>
                          {submitResult.status === "Accepted" && profileSaved && (
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              ✓ Saved to Profile
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {submitResult.timeComplexity} time · {submitResult.spaceComplexity} space
                      </span>
                      {submitResult.optimalTimeComplexity && (
                        <span className="rounded-md bg-muted/70 border border-border/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Target: {submitResult.optimalTimeComplexity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Runtime & Memory Distribution Histograms (when Accepted) */}
                  {submitResult.status === "Accepted" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Runtime Distribution Card */}
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                              <Clock className="size-3 text-emerald-400" /> Runtime Distribution
                            </div>
                            <div className="text-sm font-black text-foreground">
                              {submitResult.runtimeMs} ms
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase text-muted-foreground block">
                              Beats
                            </span>
                            <span className="text-xs font-black text-emerald-400">
                              {submitResult.runtimePercentile}% of solutions
                            </span>
                          </div>
                        </div>
                        {/* Mini Bar Chart */}
                        <div className="flex items-end gap-1 h-10 pt-1 px-1">
                          {RUNTIME_HISTOGRAM_BUCKETS.map((val, i) => {
                            const isUserBucket = i === runtimeHighlightIdx;
                            return (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center gap-0.5"
                                title={
                                  isUserBucket
                                    ? `Your Runtime: ${submitResult.runtimeMs} ms (Beats ${submitResult.runtimePercentile}%)`
                                    : `Cohort bucket ${i + 1}`
                                }
                              >
                                <div
                                  style={{ height: `${Math.max(18, val * 2.4)}px` }}
                                  className={`w-full rounded-t transition-all ${
                                    isUserBucket
                                      ? "bg-emerald-400 shadow-xs shadow-emerald-400/50"
                                      : "bg-emerald-500/20"
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Memory Distribution Card */}
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                              <BarChart3 className="size-3 text-primary" /> Memory Distribution
                            </div>
                            <div className="text-sm font-black text-foreground">
                              {submitResult.memoryMb} MB
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase text-muted-foreground block">
                              Beats
                            </span>
                            <span className="text-xs font-black text-primary">
                              {submitResult.memoryPercentile}% of solutions
                            </span>
                          </div>
                        </div>
                        {/* Mini Bar Chart */}
                        <div className="flex items-end gap-1 h-10 pt-1 px-1">
                          {MEMORY_HISTOGRAM_BUCKETS.map((val, i) => {
                            const isUserBucket = i === memoryHighlightIdx;
                            return (
                              <div
                                key={i}
                                className="flex-1 flex flex-col items-center gap-0.5"
                                title={
                                  isUserBucket
                                    ? `Your Memory: ${submitResult.memoryMb} MB (Beats ${submitResult.memoryPercentile}%)`
                                    : `Cohort bucket ${i + 1}`
                                }
                              >
                                <div
                                  style={{ height: `${Math.max(18, val * 2.4)}px` }}
                                  className={`w-full rounded-t transition-all ${
                                    isUserBucket
                                      ? "bg-primary shadow-xs shadow-primary/50"
                                      : "bg-primary/20"
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compiler Error if any */}
                  {submitResult.compilerOutput && (
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300 space-y-1">
                      <div className="text-[10px] font-bold uppercase">Compiler / Runtime Error</div>
                      <pre className="whitespace-pre-wrap text-[11px] leading-relaxed">
                        {submitResult.compilerOutput}
                      </pre>
                    </div>
                  )}

                  {/* Complete List of Testcases Tested by AI (Input, Your Output, Expected Output, PASS/FAIL) */}
                  {submitResult.testedCases && submitResult.testedCases.length > 0 && (
                    <div className="rounded-xl border border-border/70 bg-background/60 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground">
                          <Layers className="size-3 text-primary" />
                          <span>
                            Testcases Executed by AI Judge ({submitResult.passedCases}/
                            {submitResult.totalCases} Passed)
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {submitResult.testedCases.map((tc) => (
                          <div
                            key={tc.caseNumber}
                            className={`rounded-lg border p-2.5 space-y-1.5 ${
                              tc.passed
                                ? "border-emerald-500/25 bg-card/90"
                                : "border-rose-500/40 bg-rose-500/10"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {tc.passed ? (
                                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="size-3.5 text-rose-400 shrink-0" />
                                )}
                                <span className="text-[11px] font-bold text-foreground">
                                  {tc.label || `Case ${tc.caseNumber}`}
                                </span>
                                {tc.category && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                                    {tc.category}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                                    tc.passed
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-rose-500/20 text-rose-400"
                                  }`}
                                >
                                  {tc.passed ? "PASS" : "FAIL"}
                                </span>
                                {!tc.passed && (
                                  <button
                                    type="button"
                                    onClick={() => handleLoadIntoCustom(tc.input)}
                                    className="inline-flex items-center gap-1 rounded border border-rose-400/50 bg-rose-500/20 hover:bg-rose-500/30 px-2 py-0.5 text-[9px] font-bold text-rose-200 cursor-pointer"
                                  >
                                    <CopyPlus className="size-2.5" />
                                    <span>Use as Custom</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                              <div className="rounded border border-border/60 bg-background/80 p-1.5">
                                <span className="text-[9px] uppercase text-muted-foreground block">
                                  Tested Input
                                </span>
                                <div className="text-foreground break-all">{tc.input}</div>
                              </div>
                              <div className="rounded border border-border/60 bg-background/80 p-1.5">
                                <span className="text-[9px] uppercase text-muted-foreground block">
                                  Your Output
                                </span>
                                <div
                                  className={`font-bold break-all ${
                                    tc.passed ? "text-emerald-400" : "text-rose-300"
                                  }`}
                                >
                                  {tc.actualOutput}
                                </div>
                              </div>
                              <div className="rounded border border-border/60 bg-background/80 p-1.5">
                                <span className="text-[9px] uppercase text-muted-foreground block">
                                  Expected Output
                                </span>
                                <div className="text-emerald-400 font-bold break-all">
                                  {tc.expectedOutput}
                                </div>
                              </div>
                            </div>

                            {(tc.diffHint || tc.explanation) && (
                              <div className="text-[10px] text-muted-foreground pt-0.5">
                                {tc.diffHint || tc.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Learning & Pattern Coach Card */}
                  {submitResult.learningDiagnostics && (
                    <LearningDiagnosticsCard
                      diagnostics={submitResult.learningDiagnostics}
                      isAccepted={submitResult.status === "Accepted"}
                      estimatedTime={submitResult.timeComplexity}
                      optimalTime={submitResult.optimalTimeComplexity}
                    />
                  )}

                  {submitResult.aiInterviewerNotes && (
                    <div className="text-[11px] text-muted-foreground px-1 leading-relaxed">
                      <strong className="text-foreground">Judge Notes: </strong>
                      {submitResult.aiInterviewerNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUBMISSION HISTORY */}
          {activeDrawerTab === "history" && (
            <div className="space-y-2">
              {submissionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-1.5 text-center text-muted-foreground">
                  <History className="size-5 text-muted-foreground/60" />
                  <p className="text-xs font-semibold text-foreground">No Submissions Yet</p>
                  <p className="text-[11px]">
                    Every time you click <strong className="text-foreground">Submit</strong>, your attempt, runtime, complexity, and code snapshot are saved here so you can compare and restore them anytime.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {submissionHistory.map((entry) => {
                    const isAccepted = entry.status === "Accepted";
                    const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                    return (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-[11px]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {isAccepted ? (
                            <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="size-4 text-rose-400 shrink-0" />
                          )}
                          <span
                            className={`font-black ${
                              isAccepted ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {entry.status}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-foreground">
                            {entry.language}
                          </span>
                          <span className="text-muted-foreground">
                            {entry.passedCases}/{entry.totalCases} cases
                          </span>
                          <span className="text-muted-foreground">
                            • <strong className="text-foreground">{entry.runtimeMs} ms</strong>
                          </span>
                          <span className="text-muted-foreground">
                            • <strong className="text-foreground">{entry.memoryMb} MB</strong>
                          </span>
                          <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {entry.timeComplexity}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                          {onRestoreSubmission && (
                            <button
                              type="button"
                              onClick={() => onRestoreSubmission(entry)}
                              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-card hover:bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground cursor-pointer transition-colors"
                              title="Restore this submission's code into the editor"
                            >
                              <RotateCcw className="size-2.5 text-primary" />
                              <span>Restore Code</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

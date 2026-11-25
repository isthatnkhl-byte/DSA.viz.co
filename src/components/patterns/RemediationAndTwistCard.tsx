import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  Gauge,
  Wrench,
} from "lucide-react";
import type { SubmissionEvaluation } from "@/lib/master-patterns/types";

interface RemediationAndTwistCardProps {
  evaluation: SubmissionEvaluation;
}

export const RemediationAndTwistCard: React.FC<RemediationAndTwistCardProps> = ({
  evaluation,
}) => {
  const passedCleanly = evaluation.isCorrect && !evaluation.hiddenGapDetected;

  return (
    <div
      className={`border-2 p-5 space-y-4 ${
        passedCleanly
          ? "border-emerald-500/60 bg-emerald-500/5"
          : evaluation.hiddenGapDetected
            ? "border-amber-500/70 bg-amber-500/5"
            : "border-rose-500/70 bg-rose-500/5"
      }`}
    >
      {/* Header Verdict */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {passedCleanly ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : evaluation.hiddenGapDetected ? (
            <AlertTriangle className="size-4 text-amber-500" />
          ) : (
            <Wrench className="size-4 text-rose-500" />
          )}
          <span className="font-mono text-xs font-bold uppercase tracking-[0.14em]">
            {passedCleanly
              ? "Verified Understanding"
              : evaluation.hiddenGapDetected
                ? "Hidden Reasoning / Optimization Gap Detected"
                : "Gap Diagnosed — Surgical Repair"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          <span className="border border-border bg-card px-2 py-0.5 font-bold">
            Score: {evaluation.score}%
          </span>
          {evaluation.missClass && (
            <span className="border border-rose-500/40 bg-rose-500/10 text-rose-500 px-2 py-0.5 uppercase">
              Miss: {evaluation.missClass}
            </span>
          )}
          {evaluation.hintRung && (
            <span className="border border-amber-500/40 bg-amber-500/10 text-amber-500 px-2 py-0.5 uppercase">
              Rung: {evaluation.hintRung}
            </span>
          )}
        </div>
      </div>

      <p className="text-xs sm:text-sm text-foreground leading-relaxed">
        {evaluation.verdictSummary}
      </p>

      {/* Pro Code Optimization & Complexity Audit */}
      {evaluation.codeAudit && (
        <div className="border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
              <Cpu className="size-3.5 text-primary" />
              Complexity & Code Optimization Audit
            </div>
            <span
              className={`px-2 py-0.5 font-mono text-[10px] font-bold uppercase border ${
                evaluation.codeAudit.tier === "Optimal"
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40"
                  : evaluation.codeAudit.tier === "Better"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/40"
                    : "bg-rose-500/15 text-rose-500 border-rose-500/40"
              }`}
            >
              Tier: {evaluation.codeAudit.tier}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="border border-border bg-background p-2">
              <span className="block text-[10px] text-muted-foreground">
                Detected Time
              </span>
              <strong>{evaluation.codeAudit.detectedTime}</strong>
            </div>
            <div className="border border-border bg-background p-2">
              <span className="block text-[10px] text-muted-foreground">
                Optimal Time
              </span>
              <strong className="text-emerald-500">
                {evaluation.codeAudit.optimalTime}
              </strong>
            </div>
            <div className="border border-border bg-background p-2">
              <span className="block text-[10px] text-muted-foreground">
                Detected Space
              </span>
              <strong>{evaluation.codeAudit.detectedSpace}</strong>
            </div>
            <div className="border border-border bg-background p-2">
              <span className="block text-[10px] text-muted-foreground">
                Optimal Space
              </span>
              <strong className="text-emerald-500">
                {evaluation.codeAudit.optimalSpace}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Gauge className="size-3.5 text-primary" />
              Time Score: <strong>{evaluation.codeAudit.timeScore}/100</strong>
            </span>
            <span>
              Space Score: <strong>{evaluation.codeAudit.spaceScore}/100</strong>
            </span>
          </div>

          <p className="text-xs text-foreground/90 leading-relaxed">
            {evaluation.codeAudit.optimizationFeedback}
          </p>

          {evaluation.codeAudit.sandboxOutcome?.ran && (
            <div className="border border-border bg-[#161312] text-[#F5F2EB] p-2.5 font-mono text-[11px]">
              <div>
                Sandbox Run:{" "}
                <strong
                  className={
                    evaluation.codeAudit.sandboxOutcome.passed
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {evaluation.codeAudit.sandboxOutcome.passed
                    ? typeof evaluation.codeAudit.sandboxOutcome.testsTotal === "number"
                      ? `All ${evaluation.codeAudit.sandboxOutcome.testsPassed}/${evaluation.codeAudit.sandboxOutcome.testsTotal} Test Cases Passed`
                      : "Compiled & Exited 0"
                    : typeof evaluation.codeAudit.sandboxOutcome.testsTotal === "number"
                      ? `${evaluation.codeAudit.sandboxOutcome.testsPassed ?? 0}/${evaluation.codeAudit.sandboxOutcome.testsTotal} Test Cases Passed`
                      : "Compilation / Runtime Issue"}
                </strong>
              </div>
              {evaluation.codeAudit.sandboxOutcome.stderr && (
                <pre className="mt-1 text-rose-300 whitespace-pre-wrap">
                  {evaluation.codeAudit.sandboxOutcome.stderr}
                </pre>
              )}
              {evaluation.codeAudit.sandboxOutcome.stdout && (
                <pre className="mt-1 text-emerald-300 whitespace-pre-wrap">
                  {evaluation.codeAudit.sandboxOutcome.stdout}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Surgical Micro-Teaching */}
      {evaluation.surgicalTeaching && (
        <div className="border-l-4 border-amber-500 bg-card p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-amber-500">
            <Flame className="size-3.5" />
            Targeted Invariant Teaching
          </div>
          <p className="text-xs sm:text-sm text-foreground whitespace-pre-line leading-relaxed">
            {evaluation.surgicalTeaching}
          </p>
        </div>
      )}

      {/* Committed Rubric Reveal */}
      <div className="border border-border bg-card/60 p-3 text-xs">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-bold block mb-1">
          Reference Invariant / Reasoning
        </span>
        <p className="text-foreground/90 leading-relaxed">
          {evaluation.committedAnswerReveal}
        </p>
      </div>
    </div>
  );
};

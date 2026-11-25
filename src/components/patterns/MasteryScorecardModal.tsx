import React from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import type { MasteryScorecard } from "@/lib/master-patterns/types";

interface MasteryScorecardModalProps {
  scorecard: MasteryScorecard;
  patternTitle: string;
  onPracticeAgain: () => void;
  onReturnToCatalog: () => void;
}

export const MasteryScorecardModal: React.FC<MasteryScorecardModalProps> = ({
  scorecard,
  patternTitle,
  onPracticeAgain,
  onReturnToCatalog,
}) => {
  const isPro = scorecard.track === "pro";

  return (
    <div className="border-2 border-primary bg-card p-6 sm:p-8 shadow-[8px_8px_0px_0px_var(--primary)] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <Award className="size-4" />
            {isPro
              ? "PRO OPTIMIZATION & COMPLEXITY REPORT"
              : "INTERMEDIATE COMPLETENESS & MASTERY REPORT"}
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-black font-display">
            {patternTitle}
          </h2>
        </div>

        <div className="border-2 border-foreground bg-foreground text-background px-4 py-2 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-80">
            Overall Mastery
          </div>
          <div className="text-3xl font-black font-display">
            {scorecard.overallScore}%
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-border bg-background p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Completeness Score
          </div>
          <div className="mt-1 text-2xl font-black font-display">
            {scorecard.completenessScore}%
          </div>
        </div>

        <div className="border border-border bg-background p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {isPro ? "Time/Space Optimization" : "Verbal Clarity"}
          </div>
          <div className="mt-1 text-2xl font-black font-display">
            {isPro
              ? `${scorecard.optimizationScore ?? scorecard.overallScore}%`
              : `${scorecard.verbalClarityScore}%`}
          </div>
        </div>

        <div className="border border-border bg-background p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {isPro ? "Verbal Clarity" : "Active Gaps Remaining"}
          </div>
          <div className="mt-1 text-2xl font-black font-display">
            {isPro
              ? `${scorecard.verbalClarityScore}%`
              : scorecard.gapsToReinforce.length}
          </div>
        </div>
      </div>

      {/* Strand Breakdown */}
      <div className="space-y-2.5">
        <div className="font-mono text-xs font-bold uppercase tracking-[0.14em]">
          Strand-by-Strand Mastery
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {scorecard.strandBreakdown.map((s) => (
            <div
              key={s.strandId}
              className="border border-border bg-background p-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                {s.status === "mastered" ? (
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                ) : s.status === "gap" ? (
                  <AlertTriangle className="size-4 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="size-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs font-medium truncate">{s.title}</span>
              </div>
              <span className="font-mono text-xs font-bold shrink-0">
                {s.score}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Gaps to Reinforce */}
      {scorecard.gapsToReinforce.length > 0 && (
        <div className="border border-rose-500/40 bg-rose-500/5 p-4 space-y-2">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-500">
            Tracked Gaps for Next Session
          </div>
          <ul className="space-y-1 text-xs">
            {scorecard.gapsToReinforce.map((g, i) => (
              <li key={i}>
                • <span className="font-mono text-rose-500">[{g.missClass}]</span>{" "}
                {g.summary}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Visualizer Problems */}
      <div className="space-y-2">
        <div className="font-mono text-xs font-bold uppercase tracking-[0.14em]">
          Reinforce With Interactive Visualizer Problems
        </div>
        <div className="flex flex-wrap gap-2">
          {scorecard.recommendedProblemSlugs.map((slug) => (
            <Link
              key={slug}
              to="/problem/$slug"
              params={{ slug }}
              className="inline-flex items-center gap-1.5 border border-border bg-background px-3 py-2 font-mono text-xs hover:border-primary hover:text-primary transition-colors"
            >
              {slug}
              <ArrowUpRight className="size-3.5" />
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReturnToCatalog}
          className="border border-border px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] hover:border-primary cursor-pointer"
        >
          Back to Pattern Catalog
        </button>
        <button
          type="button"
          onClick={onPracticeAgain}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] hover:opacity-90 cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          Train Pattern Again
        </button>
      </div>
    </div>
  );
};

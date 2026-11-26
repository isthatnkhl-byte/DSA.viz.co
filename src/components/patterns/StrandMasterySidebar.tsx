import React from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import type {
  PatternCatalogItemView,
  PatternProfileResponse,
} from "@/lib/master-patterns/client";
import type { PatternSessionState } from "@/lib/master-patterns/types";

interface StrandMasterySidebarProps {
  patternItem: PatternCatalogItemView;
  profile: PatternProfileResponse;
  session: PatternSessionState;
}

export const StrandMasterySidebar: React.FC<StrandMasterySidebarProps> = ({
  patternItem,
  profile,
  session,
}) => {
  const activeStrandId = session.currentQuestion?.strandId ?? null;
  const patternSignatures = profile.errorSignatures.filter(
    (s) => s.patternId === patternItem.id,
  );

  return (
    <aside className="space-y-4">
      {/* Dependency Strand Map (LearnHarness PlanTree inspiration) */}
      <div className="border-2 border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              STRICT TOPIC COMPLETION
            </div>
            <div className="font-mono text-[9px] text-muted-foreground">
              Gated by confidence, valid reasoning, hints &amp; active gaps
            </div>
          </div>
          <span className="font-mono text-[11px] font-bold">
            {patternItem.metrics.masteryPercent}%
          </span>
        </div>

        <div className="space-y-2.5">
          {patternItem.strands.map((strand) => {
            const st = strand.state;
            const status = st?.status ?? "untouched";
            const mastery = st?.mastery ?? 0;
            const isCurrent = activeStrandId === strand.id;

            return (
              <div
                key={strand.id}
                className={`border p-2.5 transition-colors ${
                  isCurrent
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {status === "mastered" ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : status === "gap" ? (
                      <AlertTriangle className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                    ) : status === "remediated" ? (
                      <Sparkles className="size-3.5 text-cyan-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <span className="text-xs font-semibold leading-snug">
                      {strand.title}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold shrink-0">
                    {mastery}%
                  </span>
                </div>

                {(st?.attempts ?? 0) > 0 && (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1 font-mono text-[9px] text-muted-foreground">
                    <span>
                      Clean streak: {st?.cleanPasses ?? st?.streak ?? 0}/3+
                    </span>
                    {st && st.calibrationBias >= 20 && (
                      <span className="text-rose-500 font-bold">
                        Bias +{st.calibrationBias}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-2 h-1.5 w-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      status === "mastered"
                        ? "bg-emerald-500"
                        : status === "gap"
                          ? "bg-rose-500"
                          : status === "remediated"
                            ? "bg-cyan-500"
                            : "bg-primary"
                    }`}
                    style={{ width: `${mastery}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* User-Specific Misconception Tracker */}
      <div className="border-2 border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-foreground border-b border-border pb-2">
          <Brain className="size-3.5 text-primary" />
          YOUR ERROR SIGNATURES
        </div>

        {patternSignatures.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono">
            No recorded misconceptions on {patternItem.title} yet.
          </p>
        ) : (
          <div className="space-y-2">
            {patternSignatures.slice(0, 5).map((sig) => (
              <div
                key={sig.signatureKey}
                className={`border p-2.5 text-xs space-y-1 ${
                  sig.status === "active"
                    ? "border-rose-500/40 bg-rose-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span
                    className={`uppercase font-bold ${
                      sig.status === "active"
                        ? "text-rose-500"
                        : "text-emerald-500"
                    }`}
                  >
                    {sig.status === "active" ? `Active (${sig.recurrenceCount}x)` : "Repaired"}
                  </span>
                  <span className="text-muted-foreground">{sig.missClass}</span>
                </div>
                <p className="text-[11px] text-foreground/90 leading-snug">
                  {sig.summary}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked DSA.viz.co Visualizer Problems */}
      <div className="border-2 border-border bg-card p-4 space-y-2.5">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          PRACTICE IN VISUALIZER
        </div>
        <div className="space-y-1.5">
          {patternItem.linkedProblemSlugs.slice(0, 4).map((slug) => (
            <Link
              key={slug}
              to="/problem/$slug"
              params={{ slug }}
              className="flex items-center justify-between border border-border bg-background px-2.5 py-2 font-mono text-[11px] hover:border-primary hover:text-primary transition-colors"
            >
              <span className="truncate">{slug}</span>
              <ArrowUpRight className="size-3.5 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
};

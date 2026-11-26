import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import type {
  PatternCatalogItemView,
  PatternProfileResponse,
} from "@/lib/master-patterns/client";
import type { PatternId } from "@/lib/master-patterns/types";

interface PatternCatalogGridProps {
  profile: PatternProfileResponse;
  resumablePatterns: Record<string, boolean>;
  loadingPatternId: PatternId | null;
  onSelectPattern: (patternId: PatternId, resumeLocal: boolean) => void;
}

const CATEGORIES = [
  "All",
  "Linear & Window",
  "Search & Partition",
  "Stacks, Heaps & Intervals",
  "Graphs & Trees",
  "Recursion & DP",
] as const;

export const PatternCatalogGrid: React.FC<PatternCatalogGridProps> = ({
  profile,
  resumablePatterns,
  loadingPatternId,
  onSelectPattern,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatterns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profile.patterns.filter((p) => {
      if (selectedCategory !== "All" && p.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.strands.some((s) => s.title.toLowerCase().includes(q))
      );
    });
  }, [profile.patterns, selectedCategory, searchQuery]);

  const activeErrorCount = profile.errorSignatures.filter(
    (s) => s.status === "active",
  ).length;
  const twistRate =
    profile.cognitiveProfile.totalTwistsAttempted > 0
      ? Math.round(
          (profile.cognitiveProfile.totalTwistsPassed /
            profile.cognitiveProfile.totalTwistsAttempted) *
            100,
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Cognitive Profile & Adaptive Telemetry Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span>Due For Review</span>
            <Clock className="size-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display">
              {profile.dueReviewStrands.length}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              rusty strand(s)
            </span>
          </div>
        </div>

        <div className="border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span>Active Misconceptions</span>
            <AlertTriangle className="size-3.5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display">
              {activeErrorCount}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {profile.cognitiveProfile.dominantMissClass
                ? `top: ${profile.cognitiveProfile.dominantMissClass}`
                : "clean slate"}
            </span>
          </div>
        </div>

        <div className="border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span>Twist Resilience</span>
            <Flame className="size-3.5 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display">
              {twistRate !== null ? `${twistRate}%` : "—"}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {profile.cognitiveProfile.totalTwistsPassed}/
              {profile.cognitiveProfile.totalTwistsAttempted} twists cleared
            </span>
          </div>
        </div>

        <div className="border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            <span>Verbal ↔ Code Alignment</span>
            <Brain className="size-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-black font-display">
              {Math.abs(profile.cognitiveProfile.verbalToCodeGap) < 15
                ? "Balanced"
                : profile.cognitiveProfile.verbalToCodeGap > 0
                  ? "Intuition > Code"
                  : "Code > Intuition"}
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter + Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-y border-border py-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] border transition-colors cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-card text-muted-foreground border-border hover:border-primary/60 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter patterns or invariants..."
          className="w-full md:w-64 border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {/* Pattern Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPatterns.map((p: PatternCatalogItemView) => {
          const hasLocalResume = Boolean(resumablePatterns[p.id]);
          const isBusy = loadingPatternId === p.id;
          return (
            <div
              key={p.id}
              className="group relative flex flex-col justify-between border-2 border-border bg-card p-5 transition-all hover:border-primary hover:shadow-[4px_4px_0px_0px_var(--primary)]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 border border-border bg-muted/50 text-muted-foreground">
                    {p.category}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary font-bold">
                    {p.interviewFrequency} Freq
                  </span>
                </div>

                <h3 className="text-lg font-black tracking-tight text-foreground font-display">
                  {p.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {p.subtitle}
                </p>

                {/* Mastery Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-muted-foreground">
                      {p.metrics.masteredStrands}/{p.metrics.totalStrands} mastered
                    </span>
                    <span className="font-bold text-foreground">
                      {p.metrics.masteryPercent}% completed
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted overflow-hidden border border-border">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${p.metrics.masteryPercent}%` }}
                    />
                  </div>
                </div>

                {/* Status Badges */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.metrics.activeGaps > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-rose-500/10 text-rose-500 border border-rose-500/30">
                      <Target className="size-3" />
                      {p.metrics.activeGaps} active gap(s)
                    </span>
                  )}
                  {p.metrics.dueStrands > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-500/10 text-amber-500 border border-amber-500/30">
                      <Clock className="size-3" />
                      {p.metrics.dueStrands} due review
                    </span>
                  )}
                  {p.metrics.masteredStrands === p.metrics.totalStrands &&
                    p.metrics.totalStrands > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                        <CheckCircle2 className="size-3" />
                        Mastered
                      </span>
                    )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-border flex items-center gap-2">
                {hasLocalResume ? (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSelectPattern(p.id, true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="size-3.5" />
                      {isBusy ? "Loading..." : "Resume"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSelectPattern(p.id, false)}
                      title="Start fresh session"
                      className="inline-flex items-center justify-center gap-1 border border-border px-2.5 py-2 font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground hover:border-primary disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" />
                      New
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectPattern(p.id, false)}
                    className="w-full inline-flex items-center justify-center gap-2 border-2 border-foreground bg-foreground text-background px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="size-3.5" />
                    {isBusy ? "Initializing..." : "Train Pattern"}
                    <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPatterns.length === 0 && (
        <div className="border-2 border-dashed border-border p-8 text-center">
          <Layers className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="font-mono text-xs text-muted-foreground">
            No patterns matched your filter. Try clearing the search box.
          </p>
        </div>
      )}
    </div>
  );
};

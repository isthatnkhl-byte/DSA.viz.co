import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Code2,
  Compass,
  Flame,
  Gauge,
  Sparkles,
} from "lucide-react";
import type { CalibrationPromptData } from "@/lib/master-patterns/client";
import type { TrackMode } from "@/lib/master-patterns/types";

interface LevelCalibrationCardProps {
  calibration: CalibrationPromptData;
  loadingTrack: TrackMode | null;
  loadingProbe?: boolean;
  onSelectTrack: (track: TrackMode) => void;
  onStartProbe?: () => void;
  onBack: () => void;
}

export const LevelCalibrationCard: React.FC<LevelCalibrationCardProps> = ({
  calibration,
  loadingTrack,
  loadingProbe = false,
  onSelectTrack,
  onStartProbe,
  onBack,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ArrowLeft className="size-3.5" />
        Back to Pattern Catalog
      </button>

      <div className="border-2 border-border bg-card p-6 sm:p-8 shadow-[6px_6px_0px_0px_var(--border)] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              STEP 01 // LEVEL CALIBRATION
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight font-display">
              {calibration.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-border bg-muted/60 px-3 py-1 font-mono text-xs">
              <Gauge className="size-3.5 text-primary" />
              Prior Mastery: <strong>{calibration.priorMasteryPercent}%</strong>
            </span>
          </div>
        </div>

        {/* AI Calibration Prompt */}
        <div className="border-l-4 border-primary bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary font-bold">
            <Sparkles className="size-3.5" />
            AI Mentor Assessment
          </div>
          <p className="text-sm sm:text-base text-foreground leading-relaxed">
            {calibration.aiPrompt}
          </p>
        </div>

        {/* User-Specific Gap Warnings */}
        {calibration.personalizedWarnings.length > 0 && (
          <div className="border border-rose-500/40 bg-rose-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-rose-500 font-bold">
              <AlertTriangle className="size-3.5" />
              Detected Weak Spots Carried Forward
            </div>
            <ul className="space-y-1 text-xs font-mono text-foreground/90">
              {calibration.personalizedWarnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Track Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calibration.options.map((opt) => {
            const isPro = opt.track === "pro";
            const isLoading = loadingTrack === opt.track;
            const disabled = loadingTrack !== null || loadingProbe;

            return (
              <button
                key={opt.track}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTrack(opt.track)}
                className={`text-left flex flex-col justify-between border-2 p-5 transition-all cursor-pointer disabled:opacity-60 ${
                  isPro
                    ? "border-border bg-background hover:border-amber-500 hover:shadow-[4px_4px_0px_0px_rgb(245,158,11)]"
                    : "border-border bg-background hover:border-primary hover:shadow-[4px_4px_0px_0px_var(--primary)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] border ${
                        isPro
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/40"
                          : "bg-primary/10 text-primary border-primary/40"
                      }`}
                    >
                      {isPro ? (
                        <Flame className="size-3.5" />
                      ) : (
                        <BookOpen className="size-3.5" />
                      )}
                      {isPro ? "PRO TRACK" : "INTERMEDIATE TRACK"}
                    </span>
                    {isPro && <Code2 className="size-4 text-muted-foreground" />}
                  </div>

                  <h3 className="text-base font-black text-foreground font-display">
                    {opt.label}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {opt.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-border font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  {isLoading
                    ? isPro
                      ? "Preparing Direct Gauntlet..."
                      : "Generating Tailored Notes..."
                    : isPro
                      ? "Enter Pro Gauntlet →"
                      : "Generate Structured Notes →"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Optional LearnHarness-style Diagnostic Probe */}
        {onStartProbe && (
          <div className="border border-dashed border-border bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Compass className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-mono font-bold uppercase text-foreground block">
                  Not sure which track fits best?
                </span>
                <span className="text-muted-foreground">
                  Take a 2-question binary-search diagnostic probe; the AI measures your invariant edge and routes you automatically.
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={loadingTrack !== null || loadingProbe}
              onClick={onStartProbe}
              className="shrink-0 border border-primary bg-primary/10 text-primary px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loadingProbe ? "Starting Probe..." : "Test My Level (2 Qs) →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

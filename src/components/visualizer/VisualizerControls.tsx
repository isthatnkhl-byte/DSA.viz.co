import React from "react";
import { AiWord } from "@/components/brand/AiWord";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
  RotateCcw,
  Repeat,
  FastForward,
  Rewind,
  PlaySquare,
  Keyboard,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ThemeColorPicker } from "@/components/ThemeColorPicker";

interface VisualizerControlsProps {
  currentStep?: number;
  activeStepIndex?: number;
  totalSteps: number;
  isPlaying: boolean;
  isLooping?: boolean;
  isScrubbing?: boolean;
  speed: number;
  vizType: string;
  breakpointCount?: number;
  breakpointIndices?: number[];
  onStepChange: (step: number) => void;
  onScrubStart?: () => void;
  onScrub?: (step: number) => void;
  onScrubEnd?: (step: number) => void;
  onPlayToggle: () => void;
  onLoopToggle?: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onJumpBreakpoint?: () => void;
  onOpenShortcuts?: () => void;
  onOpenExport?: () => void;
}

export function VisualizerControls({
  currentStep: propCurrentStep,
  activeStepIndex: propActiveStepIndex,
  totalSteps,
  isPlaying,
  isLooping = false,
  isScrubbing = false,
  speed,
  vizType,
  breakpointCount = 0,
  breakpointIndices = [],
  onStepChange,
  onScrubStart,
  onScrub,
  onScrubEnd,
  onPlayToggle,
  onLoopToggle,
  onSpeedChange,
  onReset,
  onJumpBreakpoint,
  onOpenShortcuts,
  onOpenExport,
}: VisualizerControlsProps) {
  // Normalize activeStepIndex from either prop
  const currentStep = propActiveStepIndex ?? propCurrentStep ?? 0;
  const speeds = [0.5, 1, 1.5, 2, 3];
  const progressPct = totalSteps > 1 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 100;

  const jumpSteps = (delta: number) => {
    onStepChange(Math.max(0, Math.min(totalSteps - 1, currentStep + delta)));
  };

  const handleSliderValueChange = (val: number[]) => {
    const target = val[0] ?? 0;
    if (onScrub) {
      onScrub(target);
    } else {
      onStepChange(target);
    }
  };

  const handleSliderPointerDown = () => {
    onScrubStart?.();
  };

  const handleSliderPointerUp = () => {
    onScrubEnd?.(currentStep);
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-xs">
            <AiWord className="size-3.5 text-primary" />
            <span>{vizType}</span>
          </div>
          <span className="font-mono text-xs font-medium text-muted-foreground">
            Step{" "}
            <span className="font-bold text-foreground">
              {totalSteps > 0 ? currentStep + 1 : 0}
            </span>{" "}
            / {totalSteps}
            <span className="ml-2 text-[10px] text-primary/80 font-semibold">({progressPct}%)</span>
          </span>
        </div>

        {/* Playback action buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg transition-all hover:scale-105 active:scale-95"
            title="First Step (Home)"
            disabled={currentStep === 0 || totalSteps <= 1}
            onClick={() => onStepChange(0)}
          >
            <ChevronsLeft className="size-4" />
          </Button>

          {/* Jump -5 steps */}
          {totalSteps > 8 && (
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg hidden sm:inline-flex transition-all hover:scale-105 active:scale-95"
              title="Jump Back 5 Steps"
              disabled={currentStep === 0 || totalSteps <= 1}
              onClick={() => jumpSteps(-5)}
            >
              <Rewind className="size-3.5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg transition-all hover:scale-105 active:scale-95"
            title="Previous Step (Left Arrow)"
            disabled={currentStep === 0 || totalSteps <= 1}
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            variant={isPlaying ? "destructive" : "default"}
            size="sm"
            className="h-8 gap-1.5 rounded-lg px-3.5 font-bold shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            disabled={totalSteps <= 1}
            onClick={onPlayToggle}
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <>
                <Pause className="size-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg transition-all hover:scale-105 active:scale-95"
            title="Next Step (Right Arrow)"
            disabled={currentStep >= totalSteps - 1 || totalSteps <= 1}
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>

          {/* Jump +5 steps */}
          {totalSteps > 8 && (
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-lg hidden sm:inline-flex transition-all hover:scale-105 active:scale-95"
              title="Jump Forward 5 Steps"
              disabled={currentStep >= totalSteps - 1 || totalSteps <= 1}
              onClick={() => jumpSteps(5)}
            >
              <FastForward className="size-3.5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-lg transition-all hover:scale-105 active:scale-95"
            title="Last Step (End)"
            disabled={currentStep >= totalSteps - 1 || totalSteps <= 1}
            onClick={() => onStepChange(totalSteps - 1)}
          >
            <ChevronsRight className="size-4" />
          </Button>

          {/* Jump to Next Breakpoint */}
          {onJumpBreakpoint && breakpointCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 rounded-lg px-2 text-xs font-mono border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all hover:scale-105 active:scale-95"
              title="Continue to next active Breakpoint (B)"
              onClick={onJumpBreakpoint}
            >
              <PlaySquare className="size-3.5 fill-rose-500 text-rose-500" />
              <span className="hidden sm:inline">Next BP</span>
              <span className="rounded bg-rose-500/30 px-1 text-[9px] font-bold">
                {breakpointCount}
              </span>
            </Button>
          )}

          {/* Loop toggle */}
          {onLoopToggle && (
            <Button
              variant="ghost"
              size="icon"
              className={`size-8 rounded-lg transition-all hover:scale-105 active:scale-95 ${
                isLooping
                  ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={
                isLooping ? "Looping Active (Will restart on end)" : "Enable Continuous Looping (L)"
              }
              onClick={onLoopToggle}
            >
              <Repeat className="size-3.5" />
            </Button>
          )}

          <div className="mx-1 h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95"
            title="Reset from Start (R)"
            onClick={onReset}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>

        {/* Utilities: Shortcuts, Export, Speed & Theme Controls */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* Shortcuts Guide */}
          {onOpenShortcuts && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              title="Keyboard Shortcuts (?)"
              onClick={onOpenShortcuts}
            >
              <Keyboard className="size-3.5" />
            </Button>
          )}

          {/* Export Snapshot */}
          {onOpenExport && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground"
              title="Export & Share Frame Snapshot"
              onClick={onOpenExport}
            >
              <Share2 className="size-3.5" />
            </Button>
          )}

          <div className="mx-0.5 h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline font-mono text-[11px]">Speed:</span>
            <div className="flex rounded-lg border border-border/80 bg-background/50 p-0.5">
              {speeds.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSpeedChange(s)}
                  className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-medium transition-all ${
                    speed === s
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="mx-0.5 h-4 w-px bg-border hidden sm:block" />

          {/* Inline Theme Switcher */}
          <ThemeColorPicker compact={false} align="right" />
        </div>
      </div>

      {/* Interactive Timeline Scrubber Slider with 60 FPS scrubbing & breakpoint markers */}
      {totalSteps > 1 && (
        <div className="flex flex-col gap-1 pt-0.5">
          <div className="relative flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground select-none">01</span>
            <div
              className="relative flex-1 flex items-center"
              onPointerDown={handleSliderPointerDown}
              onPointerUp={handleSliderPointerUp}
              onTouchStart={handleSliderPointerDown}
              onTouchEnd={handleSliderPointerUp}
            >
              {/* Breakpoint markers along the slider track */}
              {breakpointIndices.length > 0 && (
                <div className="absolute inset-x-0 h-1.5 pointer-events-none z-10">
                  {breakpointIndices.map((bIdx) => {
                    const pct = (bIdx / (totalSteps - 1)) * 100;
                    return (
                      <div
                        key={`bp-marker-${bIdx}`}
                        style={{ left: `${pct}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-2 rounded-full bg-rose-500 ring-2 ring-background shadow-xs"
                        title={`Breakpoint at step ${bIdx + 1}`}
                      />
                    );
                  })}
                </div>
              )}

              <Slider
                value={[currentStep]}
                max={Math.max(0, totalSteps - 1)}
                step={1}
                onValueChange={handleSliderValueChange}
                className={`flex-1 cursor-pointer transition-opacity ${
                  isScrubbing ? "opacity-95" : "opacity-100"
                }`}
              />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground select-none">
              {String(totalSteps).padStart(2, "0")}
            </span>
          </div>
          {isScrubbing && (
            <div className="flex justify-center">
              <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary animate-pulse">
                Scrubbing: Step {currentStep + 1} / {totalSteps} ({progressPct}%)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VisualizerControls;


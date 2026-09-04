import { memo, useMemo } from "react";
import type { IntervalItem } from "@/lib/problems";
import { GitMerge, Clock, Activity, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

interface IntervalVisualizerProps {
  intervals?: IntervalItem[] | null;
  sweepLine?: number | null;
  activeInterval?: IntervalItem | null;
  mergedCount?: number;
  explanation?: string;
}

export const IntervalVisualizer = memo(function IntervalVisualizer({
  intervals = [],
  sweepLine,
  activeInterval,
  mergedCount,
  explanation = "",
}: IntervalVisualizerProps) {
  const safeIntervals = useMemo(() => {
    if (!Array.isArray(intervals)) return [];
    return intervals.filter((iv) => iv && typeof iv.start === "number" && typeof iv.end === "number");
  }, [intervals]);

  // Compute time bounds [minTime .. maxTime]
  const { minTime, maxTime } = useMemo(() => {
    if (safeIntervals.length === 0) return { minTime: 0, maxTime: 20 };
    let minT = Infinity;
    let maxT = -Infinity;
    safeIntervals.forEach((iv) => {
      if (iv.start < minT) minT = iv.start;
      if (iv.end > maxT) maxT = iv.end;
    });
    if (!Number.isFinite(minT)) minT = 0;
    if (!Number.isFinite(maxT)) maxT = 20;
    // Add small buffer
    return {
      minTime: Math.max(0, Math.floor(minT)),
      maxTime: Math.max(minT + 1, Math.ceil(maxT) + 1),
    };
  }, [safeIntervals]);

  // Greedy swimlane packing to avoid vertical overlapping pills
  const { packedIntervals, totalLanes } = useMemo(() => {
    if (safeIntervals.length === 0) return { packedIntervals: [], totalLanes: 1 };

    const lanes: number[] = [];
    const packed = safeIntervals.map((iv, idx) => {
      // If interval already specifies a lane, respect it
      if (typeof iv.lane === "number") {
        return { ...iv, lane: iv.lane, id: iv.id || `iv-${idx}` };
      }

      // Otherwise find first lane that has ended before iv.start
      let assignedLane = lanes.findIndex((lastEnd) => lastEnd <= iv.start);
      if (assignedLane === -1) {
        assignedLane = lanes.length;
        lanes.push(iv.end);
      } else {
        lanes[assignedLane] = iv.end;
      }

      return {
        ...iv,
        lane: assignedLane,
        id: iv.id || `iv-${idx}`,
      };
    });

    return {
      packedIntervals: packed,
      totalLanes: Math.max(1, lanes.length),
    };
  }, [safeIntervals]);

  const timeRange = Math.max(1, maxTime - minTime);

  // Function to compute horizontal percentage for timestamp t
  const getPercent = (t: number) => {
    const clamped = Math.max(minTime, Math.min(maxTime, t));
    return ((clamped - minTime) / timeRange) * 100;
  };

  // Generate tick markers along time axis
  const ticks = useMemo(() => {
    const step = timeRange <= 12 ? 1 : timeRange <= 24 ? 2 : Math.ceil(timeRange / 10);
    const result: number[] = [];
    for (let t = minTime; t <= maxTime; t += step) {
      result.push(t);
    }
    return result;
  }, [minTime, maxTime, timeRange]);

  // Concurrency at sweep-line (if active)
  const concurrencyAtSweep = useMemo(() => {
    if (sweepLine === null || sweepLine === undefined) return 0;
    return safeIntervals.filter((iv) => sweepLine >= iv.start && sweepLine < iv.end).length;
  }, [safeIntervals, sweepLine]);

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Top Banner: Interval Collision & Concurrency Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card/75 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-xs">
            <GitMerge className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                1D Interval Timeline &amp; Sweep-Line Canvas
              </span>
              <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                {safeIntervals.length} Intervals • {totalLanes} Lanes
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Continuous time projection with greedy swimlane packing and overlap collision detection
            </p>
          </div>
        </div>

        {/* Legend / Status Badges */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-cyan-300">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" /> Active / Evaluating
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-emerald-300">
            <CheckCircle2 className="size-3 text-emerald-400" /> Merged Span
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-rose-300">
            <ShieldAlert className="size-3 text-rose-400" /> Overlap Conflict
          </span>
        </div>
      </div>

      {/* Main Timeline View */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/75 p-4 backdrop-blur-sm shadow-xs overflow-hidden">
        {/* Timeline Header Stats */}
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
            <Clock className="size-3.5 text-primary" />
            <span>Time Span: [{minTime} .. {maxTime}]</span>
          </div>

          {sweepLine !== null && sweepLine !== undefined && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] bg-primary/10 border border-primary/30 text-primary px-2.5 py-0.5 rounded-full font-bold">
              <Activity className="size-3" />
              <span>Sweep-Line t = {sweepLine}</span>
              <span className="ml-1 text-[10px] bg-primary/20 px-1.5 py-0.2 rounded text-primary font-black">
                {concurrencyAtSweep} concurrent
              </span>
            </div>
          )}
        </div>

        {safeIntervals.length === 0 ? (
          <div className="py-12 text-center font-mono text-xs text-muted-foreground">
            No intervals available in dataset.
          </div>
        ) : (
          <div className="relative flex flex-col gap-4 py-2 min-h-[220px]">
            {/* Swimlanes Container */}
            <div
              className="relative w-full rounded-lg bg-background/50 border border-border/50 p-2 overflow-x-auto"
              style={{ minHeight: `${Math.max(140, totalLanes * 44 + 40)}px` }}
            >
              {/* Vertical Sweep-Line Laser (if active) */}
              {sweepLine !== null && sweepLine !== undefined && (
                <div
                  className="absolute top-0 bottom-0 z-20 w-[2px] bg-sky-400 shadow-lg shadow-sky-400/80 transition-all duration-300 pointer-events-none"
                  style={{ left: `${getPercent(sweepLine)}%` }}
                >
                  <div className="absolute -top-1 -translate-x-1/2 rounded bg-sky-500 px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-sky-950 shadow-md">
                    t={sweepLine}
                  </div>
                </div>
              )}

              {/* Background Lane Guides */}
              {Array.from({ length: totalLanes }).map((_, laneIdx) => (
                <div
                  key={`lane-guide-${laneIdx}`}
                  className="absolute left-2 right-2 border-b border-border/20 pointer-events-none"
                  style={{ top: `${laneIdx * 44 + 32}px` }}
                />
              ))}

              {/* Interval Capsules on Swimlanes */}
              {packedIntervals.map((iv) => {
                const leftPct = getPercent(iv.start);
                const rightPct = getPercent(iv.end);
                const widthPct = Math.max(3.5, rightPct - leftPct);

                const isActive =
                  iv.status === "active" ||
                  (activeInterval &&
                    activeInterval.start === iv.start &&
                    activeInterval.end === iv.end);
                const isMerged = iv.status === "merged";
                const isConflict = iv.status === "conflict";

                let bg = "bg-slate-700/60";
                let border = "border-slate-500/80";
                let textColor = "text-slate-200";
                let ring = "";

                if (isConflict) {
                  bg = "bg-rose-950/70";
                  border = "border-rose-500";
                  textColor = "text-rose-200";
                  ring = "ring-2 ring-rose-500/60 animate-pulse shadow-md shadow-rose-500/20";
                } else if (isMerged) {
                  bg = "bg-emerald-950/70";
                  border = "border-emerald-500";
                  textColor = "text-emerald-200";
                  ring = "ring-1 ring-emerald-500/60 shadow-xs shadow-emerald-500/10";
                } else if (isActive) {
                  bg = "bg-cyan-950/70";
                  border = "border-cyan-400";
                  textColor = "text-cyan-200";
                  ring = "ring-2 ring-cyan-400 shadow-md shadow-cyan-400/30";
                }

                return (
                  <div
                    key={iv.id}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: `${iv.lane * 44 + 10}px`,
                    }}
                    className={`absolute h-8 rounded-lg border px-2 flex items-center justify-between select-none transition-all duration-300 ${bg} ${border} ${textColor} ${ring} hover:z-30 hover:scale-[1.02]`}
                  >
                    {/* Start Marker */}
                    <span className="font-mono text-[10px] font-black opacity-85">
                      {iv.start}
                    </span>

                    {/* Capsule Content */}
                    <div className="flex items-center gap-1 font-mono text-[11px] font-extrabold truncate px-1">
                      <span>[{iv.start}, {iv.end}]</span>
                    </div>

                    {/* End Marker */}
                    <span className="font-mono text-[10px] font-black opacity-85">
                      {iv.end}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Continuous Horizontal Time Axis with Ticks */}
            <div className="relative w-full border-t-2 border-foreground/30 pt-1.5 px-2">
              <div className="relative h-6 w-full">
                {ticks.map((t) => {
                  const pct = getPercent(t);
                  return (
                    <div
                      key={`tick-${t}`}
                      style={{ left: `${pct}%` }}
                      className="absolute -top-1.5 -translate-x-1/2 flex flex-col items-center select-none"
                    >
                      <div className="h-2 w-[1.5px] bg-foreground/50" />
                      <span className="font-mono text-[10px] text-muted-foreground mt-0.5 font-bold">
                        {t}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

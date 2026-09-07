import React, { useMemo, useState } from "react";
import type { IntervalItem, IntervalCollisionState } from "./VisualizerTypes";
import {
  Clock,
  Layers,
  GitMerge,
  AlertCircle,
  CheckCircle2,
  Split,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Maximize2,
  Info,
  Check,
  X,
  Compass,
  Zap,
  Target,
  Users,
  Building,
  PlusCircle,
  Hash,
} from "lucide-react";

interface IntervalVisualizerProps {
  intervals?: IntervalItem[] | null;
  matrix?: (number | string)[][] | null;
  sweepLine?: number | null;
  activeIntervalIndex?: number | null;
  intervalCollisionState?: IntervalCollisionState | null;
  desc?: string;
  variables?: Record<string, any> | null;
}

export function IntervalVisualizer({
  intervals: rawIntervals,
  matrix,
  sweepLine: rawSweepLine,
  activeIntervalIndex,
  intervalCollisionState: rawCollisionState,
  desc = "",
  variables,
}: IntervalVisualizerProps) {
  const [selectedInterval, setSelectedInterval] = useState<IntervalItem | null>(null);
  const [viewMode, setViewMode] = useState<"swimlane" | "merged" | "events">("swimlane");

  // 1. Normalize Intervals from props, matrix, or variables
  const intervals: IntervalItem[] = useMemo(() => {
    if (rawIntervals && Array.isArray(rawIntervals) && rawIntervals.length > 0) {
      return rawIntervals.map((iv, idx) => ({
        ...iv,
        id: iv.id || `iv_${idx}`,
        label: iv.label || `[${iv.start}, ${iv.end}]`,
        status: iv.status || (idx === activeIntervalIndex ? "active" : "unprocessed"),
      }));
    }

    if (matrix && Array.isArray(matrix) && matrix.length > 0) {
      return matrix
        .filter((row) => Array.isArray(row) && row.length >= 2)
        .map((row, idx) => {
          const s = Number(row[0]);
          const e = Number(row[1]);
          return {
            start: isNaN(s) ? 0 : s,
            end: isNaN(e) ? 1 : e,
            id: `interval_${idx}`,
            label: `[${row[0]}, ${row[1]}]`,
            status: idx === activeIntervalIndex ? "active" : "unprocessed",
          };
        });
    }

    if (Array.isArray(variables?.intervals)) {
      return variables.intervals.map((item: any, idx: number) => {
        if (Array.isArray(item) && item.length >= 2) {
          return {
            start: Number(item[0]),
            end: Number(item[1]),
            id: `iv_${idx}`,
            label: `[${item[0]}, ${item[1]}]`,
            status: idx === activeIntervalIndex ? "active" : "unprocessed",
          };
        }
        if (typeof item === "object" && item !== null) {
          return {
            start: Number(item.start ?? item[0] ?? 0),
            end: Number(item.end ?? item[1] ?? 1),
            id: item.id ?? `iv_${idx}`,
            label: item.label ?? `[${item.start}, ${item.end}]`,
            status: item.status ?? (idx === activeIntervalIndex ? "active" : "unprocessed"),
            room: item.room,
            lane: item.lane,
          };
        }
        return { start: idx, end: idx + 1, id: `iv_${idx}`, label: `[${idx}, ${idx+1}]`, status: "unprocessed" };
      });
    }

    // Default Fallback
    return [
      { start: 1, end: 3, id: "iv_0", label: "[1, 3]", status: "merged" },
      { start: 2, end: 6, id: "iv_1", label: "[2, 6]", status: "active" },
      { start: 8, end: 10, id: "iv_2", label: "[8, 10]", status: "unprocessed" },
      { start: 15, end: 18, id: "iv_3", label: "[15, 18]", status: "unprocessed" },
    ];
  }, [rawIntervals, matrix, activeIntervalIndex, variables]);

  // 2. Identify Problem Archetype
  const isMeetingRooms = useMemo(() => {
    return /meeting-room|conference|rooms|min-meeting/i.test(desc) || variables?.rooms !== undefined || variables?.heap !== undefined;
  }, [desc, variables]);

  const isInsertInterval = useMemo(() => {
    return /insert-interval|insert/i.test(desc) || variables?.newInterval !== undefined;
  }, [desc, variables]);

  const isMergeIntervals = useMemo(() => {
    return /merge-intervals|merge|overlapping/i.test(desc) && !isMeetingRooms;
  }, [desc, isMeetingRooms]);

  // 3. Compute Timeline Range & Ticks
  const sweepLine = rawSweepLine ?? (typeof variables?.t === "number" ? variables.t : typeof variables?.time === "number" ? variables.time : null);

  const { minTime, maxTime, timeSpan } = useMemo(() => {
    if (intervals.length === 0) return { minTime: 0, maxTime: 20, timeSpan: 20 };
    const starts = intervals.map((iv) => iv.start);
    const ends = intervals.map((iv) => iv.end);
    const extra: number[] = [];
    if (sweepLine !== null && sweepLine !== undefined) extra.push(sweepLine);
    if (rawCollisionState?.newInterval) {
      extra.push(rawCollisionState.newInterval.start, rawCollisionState.newInterval.end);
    }
    if (variables?.newInterval && Array.isArray(variables.newInterval)) {
      extra.push(Number(variables.newInterval[0]), Number(variables.newInterval[1]));
    }

    const allTimes = [...starts, ...ends, ...extra].filter((v) => !isNaN(v));
    const minT = allTimes.length > 0 ? Math.min(...allTimes) : 0;
    const maxT = allTimes.length > 0 ? Math.max(...allTimes) : 20;

    const safeMin = Math.max(0, Math.floor(minT) - 1);
    const safeMax = Math.ceil(maxT) + 2;
    return { minTime: safeMin, maxTime: safeMax, timeSpan: Math.max(1, safeMax - safeMin) };
  }, [intervals, sweepLine, rawCollisionState, variables]);

  // 4. Compute Swimlane / Meeting Room Allocation
  const { lanes, roomAllocations, maxRoomsNeeded } = useMemo(() => {
    const assignedLanes: Array<{ end: number; roomName: string }> = [];
    const ivLanes: number[] = [];
    const ivRooms: string[] = [];

    // Sort or greedily allocate
    intervals.forEach((iv, idx) => {
      if (iv.lane !== undefined) {
        ivLanes.push(iv.lane);
        ivRooms.push(iv.room ? String(iv.room) : `Room ${iv.lane + 1}`);
        return;
      }

      let laneIdx = -1;
      for (let l = 0; l < assignedLanes.length; l++) {
        if (assignedLanes[l]!.end <= iv.start) {
          laneIdx = l;
          assignedLanes[l]!.end = iv.end;
          break;
        }
      }

      if (laneIdx === -1) {
        laneIdx = assignedLanes.length;
        assignedLanes.push({ end: iv.end, roomName: `Room ${laneIdx + 1}` });
      }

      ivLanes.push(laneIdx);
      ivRooms.push(assignedLanes[laneIdx]!.roomName);
    });

    return {
      lanes: ivLanes,
      roomAllocations: ivRooms,
      maxRoomsNeeded: Math.max(1, assignedLanes.length),
    };
  }, [intervals]);

  const maxLane = Math.max(0, ...lanes);

  // 5. Detect Overlaps and Merged Accumulator
  const collisionState = useMemo<IntervalCollisionState>(() => {
    if (rawCollisionState) return rawCollisionState;

    // Synthesize Collision State
    const activeIdx = activeIntervalIndex ?? 0;
    const curr = intervals[activeIdx] ?? null;
    const prev = activeIdx > 0 ? intervals[activeIdx - 1] : null;

    let isOverlapping = false;
    let overlapSpan: [number, number] | null = null;

    if (curr && prev) {
      if (curr.start <= prev.end) {
        isOverlapping = true;
        overlapSpan = [Math.max(curr.start, prev.start), Math.min(curr.end, prev.end)];
      }
    }

    // Build Merged Output List
    const mergedList: IntervalItem[] = [];
    if (Array.isArray(variables?.merged) || Array.isArray(variables?.result) || Array.isArray(variables?.res)) {
      const source = variables?.merged ?? variables?.result ?? variables?.res;
      source.forEach((item: any, idx: number) => {
        if (Array.isArray(item) && item.length >= 2) {
          mergedList.push({
            start: Number(item[0]),
            end: Number(item[1]),
            id: `merged_${idx}`,
            label: `[${item[0]}, ${item[1]}]`,
            status: "merged",
          });
        }
      });
    } else {
      // Synthesize running merge list
      let lastMerged: IntervalItem | null = null;
      for (let i = 0; i <= activeIdx && i < intervals.length; i++) {
        const item = intervals[i]!;
        if (!lastMerged) {
          lastMerged = { ...item, status: "merged" };
        } else if (item.start <= lastMerged.end) {
          lastMerged = {
            start: Math.min(lastMerged.start, item.start),
            end: Math.max(lastMerged.end, item.end),
            id: `merged_${lastMerged.id}_${item.id}`,
            label: `[${Math.min(lastMerged.start, item.start)}, ${Math.max(lastMerged.end, item.end)}]`,
            status: "merged",
          };
        } else {
          mergedList.push(lastMerged);
          lastMerged = { ...item, status: "merged" };
        }
      }
      if (lastMerged) {
        mergedList.push(lastMerged);
      }
    }

    return {
      comparingIntervals: curr && prev ? [prev, curr] : null,
      overlapSpan,
      isOverlapping,
      mergedOutput: mergedList,
      maxConcurrency: maxRoomsNeeded,
    };
  }, [rawCollisionState, intervals, activeIntervalIndex, variables, maxRoomsNeeded]);

  // 6. Chronological Event Points (for Sweep-Line / Meeting Rooms)
  const eventPoints = useMemo(() => {
    const list: Array<{ time: number; type: "start" | "end"; interval: IntervalItem; id: string }> = [];
    intervals.forEach((iv, idx) => {
      list.push({ time: iv.start, type: "start", interval: iv, id: `${iv.id}_start` });
      list.push({ time: iv.end, type: "end", interval: iv, id: `${iv.id}_end` });
    });

    list.sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      // If start and end occur at same time, end comes before start for non-inclusive, or vice versa
      return a.type === "end" ? -1 : 1;
    });

    // Compute running room count at each event
    let count = 0;
    return list.map((ev) => {
      if (ev.type === "start") count++;
      else count--;
      return { ...ev, runningRooms: count };
    });
  }, [intervals]);

  // 7. Timeline Ruler Ticks
  const ticks = useMemo(() => {
    const list: number[] = [];
    const step = Math.max(1, Math.round(timeSpan / 14));
    for (let t = minTime; t <= maxTime; t += step) {
      list.push(t);
    }
    return list;
  }, [minTime, maxTime, timeSpan]);

  // Concurrency at Sweep-Line
  const concurrencyAtSweep = useMemo(() => {
    if (sweepLine === null || sweepLine === undefined) return null;
    return intervals.filter((iv) => iv.start <= sweepLine && iv.end >= sweepLine).length;
  }, [intervals, sweepLine]);

  // Active comparing interval indices
  const activeIdx = activeIntervalIndex ?? 0;
  const activeInterval = intervals[activeIdx] ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* TOP HEADER & TELEMETRY BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 p-3.5 shadow-xs backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30 shadow-inner">
            {isMeetingRooms ? <Building className="size-5" /> : <Clock className="size-5" />}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>
                {isMeetingRooms
                  ? "Meeting Rooms II — Concurrent Lane Allocation"
                  : isInsertInterval
                  ? "Insert Interval — Multi-Span Boundary Bridge"
                  : "Interval Timeline & Span Coalescence Canvas"}
              </span>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary border border-primary/25 font-bold">
                {intervals.length} Spans | Range [{minTime}, {maxTime}]
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {activeInterval
                ? `Scanning Interval ${activeInterval.label} (Span Δ = ${activeInterval.end - activeInterval.start})`
                : "Timeline Initialized"}
            </div>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1">
          <button
            type="button"
            onClick={() => setViewMode("swimlane")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "swimlane"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            Swimlanes & Scale
          </button>
          <button
            type="button"
            onClick={() => setViewMode("merged")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "merged"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            Merged Output Stream
          </button>
          <button
            type="button"
            onClick={() => setViewMode("events")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "events"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            Sweep-Line Events ({eventPoints.length})
          </button>
        </div>
      </div>

      {/* COLLISION & OVERLAP DETECTION CARD */}
      {collisionState.comparingIntervals && (
        <div
          className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 ${
            collisionState.isOverlapping
              ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/80 to-rose-500/5"
              : "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/80 to-primary/5"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                  collisionState.isOverlapping
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {collisionState.isOverlapping ? <AlertCircle className="size-4.5" /> : <CheckCircle2 className="size-4.5" />}
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span>Pairwise Span Evaluation</span>
                  {collisionState.isOverlapping ? (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30 uppercase">
                      Collision Detected: {collisionState.comparingIntervals[1].start} ≤ {collisionState.comparingIntervals[0].end}
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/30 uppercase">
                      Disjoint Boundary: No Overlap
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="rounded-lg bg-background/80 px-2.5 py-1 font-bold border border-border/70 text-foreground">
                    Previous: {collisionState.comparingIntervals[0].label}
                  </span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="rounded-lg bg-background/80 px-2.5 py-1 font-bold border border-border/70 text-primary">
                    Current: {collisionState.comparingIntervals[1].label}
                  </span>

                  {collisionState.isOverlapping && collisionState.overlapSpan && (
                    <div className="flex items-center gap-1.5 text-amber-300 ml-2 font-bold">
                      <ArrowRight className="size-3.5 text-amber-400" />
                      <span>
                        Coalesce into [
                        {Math.min(collisionState.comparingIntervals[0].start, collisionState.comparingIntervals[1].start)},{" "}
                        {Math.max(collisionState.comparingIntervals[0].end, collisionState.comparingIntervals[1].end)}]
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Room / Concurrency Telemetry Badge */}
            <div className="flex flex-wrap items-center gap-2">
              {concurrencyAtSweep !== null && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-1.5 font-mono text-xs font-bold text-amber-300 border border-amber-500/30 shadow-xs">
                  <Layers className="size-3.5" />
                  <span>Concurrent @ T={sweepLine}: {concurrencyAtSweep}</span>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-xl bg-primary/15 px-3 py-1.5 font-mono text-xs font-bold text-primary border border-primary/30 shadow-xs">
                <Building className="size-3.5" />
                <span>Peak Rooms: {maxRoomsNeeded}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW MODE DISPLAY */}
      {viewMode === "swimlane" && (
        <SwimlaneTimelineView
          intervals={intervals}
          lanes={lanes}
          roomAllocations={roomAllocations}
          maxLane={maxLane}
          minTime={minTime}
          maxTime={maxTime}
          timeSpan={timeSpan}
          ticks={ticks}
          sweepLine={sweepLine}
          activeIntervalIndex={activeIntervalIndex}
          collisionState={collisionState}
          selectedInterval={selectedInterval}
          onSelectInterval={setSelectedInterval}
        />
      )}

      {viewMode === "merged" && (
        <MergedOutputStreamView
          intervals={intervals}
          mergedOutput={collisionState.mergedOutput ?? []}
          activeIntervalIndex={activeIntervalIndex}
          onSelectInterval={setSelectedInterval}
        />
      )}

      {viewMode === "events" && (
        <SweepLineEventsView
          events={eventPoints}
          sweepLine={sweepLine}
          maxRooms={maxRoomsNeeded}
          onSelectInterval={setSelectedInterval}
        />
      )}

      {/* INSPECTED INTERVAL FLYOUT */}
      {selectedInterval && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-xs text-foreground animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-4 text-primary" />
            <span className="font-bold">Inspected Interval:</span>
            <span className="font-mono font-black text-primary text-sm">[{selectedInterval.start}, {selectedInterval.end}]</span>
            <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] text-primary border border-primary/30 font-bold">
              Duration Δ = {selectedInterval.end - selectedInterval.start}
            </span>
            {selectedInterval.room && (
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] text-indigo-300 border border-indigo-500/30">
                Assigned: {selectedInterval.room}
              </span>
            )}
            <span className="text-muted-foreground capitalize">Status: {selectedInterval.status}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedInterval(null)}
            className="rounded-lg p-1 hover:bg-primary/20 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* BOTTOM LEGEND & ROOM ALLOCATION SUMMARY */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/50 px-4 py-2.5 text-xs font-mono text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-primary/40 border border-primary" /> Active Scanning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-emerald-500/40 border border-emerald-500" /> Merged Consolidated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-amber-500/40 border border-amber-500" /> Overlap Collision
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-indigo-500/40 border border-indigo-400" /> Retained / Disjoint
          </span>
        </div>

        <div className="flex items-center gap-2 font-bold text-foreground">
          <Layers className="size-3.5 text-primary" />
          <span>Active Swimlanes: {maxLane + 1}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. SWIMLANE TIMELINE VIEW (COORDINATE RULER & STACKED LANES)
// ---------------------------------------------------------------------------
interface SwimlaneTimelineViewProps {
  intervals: IntervalItem[];
  lanes: number[];
  roomAllocations: string[];
  maxLane: number;
  minTime: number;
  maxTime: number;
  timeSpan: number;
  ticks: number[];
  sweepLine: number | null;
  activeIntervalIndex?: number | null;
  collisionState: IntervalCollisionState;
  selectedInterval: IntervalItem | null;
  onSelectInterval: (iv: IntervalItem) => void;
}

function SwimlaneTimelineView({
  intervals,
  lanes,
  roomAllocations,
  maxLane,
  minTime,
  maxTime,
  timeSpan,
  ticks,
  sweepLine,
  activeIntervalIndex,
  collisionState,
  selectedInterval,
  onSelectInterval,
}: SwimlaneTimelineViewProps) {
  const laneHeight = 56;
  const canvasHeight = Math.max(220, (maxLane + 1) * laneHeight + 40);

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-background/80 p-5 shadow-sm backdrop-blur-sm">
      {/* Coordinate Scale Ruler */}
      <div className="relative w-full h-9 mb-4 border-b border-border/80 flex items-center">
        {ticks.map((t) => {
          const leftPct = ((t - minTime) / timeSpan) * 100;
          return (
            <div
              key={t}
              style={{ left: `${leftPct}%` }}
              className="absolute flex flex-col items-center -bottom-1 -translate-x-1/2 select-none"
            >
              <span className="text-[10px] font-mono font-bold text-muted-foreground">
                {t}
              </span>
              <div className="w-px h-2.5 bg-border mt-0.5" />
            </div>
          );
        })}
      </div>

      {/* Stacked Swimlanes Canvas */}
      <div
        className="relative w-full rounded-xl bg-card/40 border border-border/50 p-4 overflow-x-auto"
        style={{ height: `${canvasHeight}px` }}
      >
        {/* Background Vertical Gridlines */}
        {ticks.map((t) => {
          const leftPct = ((t - minTime) / timeSpan) * 100;
          return (
            <div
              key={`grid_${t}`}
              style={{ left: `${leftPct}%` }}
              className="absolute top-0 bottom-0 w-px bg-border/20 pointer-events-none"
            />
          );
        })}

        {/* Room Lane Background Strips */}
        {Array.from({ length: maxLane + 1 }, (_, l) => (
          <div
            key={`lane_${l}`}
            style={{ top: `${20 + l * laneHeight}px`, height: `${laneHeight - 12}px` }}
            className="absolute left-0 right-0 rounded-lg bg-muted/10 border border-border/20 flex items-center px-2 pointer-events-none"
          >
            <span className="text-[10px] font-mono font-bold text-muted-foreground/50 uppercase">
              Lane / Room {l + 1}
            </span>
          </div>
        ))}

        {/* Real-time Overlap Intersection Highlight Zone */}
        {collisionState.isOverlapping && collisionState.overlapSpan && (
          <div
            style={{
              left: `${((collisionState.overlapSpan[0] - minTime) / timeSpan) * 100}%`,
              width: `${((collisionState.overlapSpan[1] - collisionState.overlapSpan[0]) / timeSpan) * 100}%`,
            }}
            className="absolute top-0 bottom-0 bg-amber-500/15 border-x border-amber-500/50 z-0 pointer-events-none animate-pulse"
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-amber-500/90 text-black px-1.5 py-0.5 text-[9px] font-black font-mono shadow-xs uppercase whitespace-nowrap">
              Overlap Zone [{collisionState.overlapSpan[0]}, {collisionState.overlapSpan[1]}]
            </div>
          </div>
        )}

        {/* Vertical Chronological Sweep-Line */}
        {sweepLine !== null && sweepLine !== undefined && (
          <div
            style={{
              left: `${Math.max(0, Math.min(100, ((sweepLine - minTime) / timeSpan) * 100))}%`,
            }}
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-30 shadow-lg pointer-events-none transition-all duration-300"
          >
            <div className="absolute -top-3 -translate-x-1/2 flex items-center gap-1 rounded-md bg-amber-400 px-2 py-0.5 text-black font-mono text-[9px] font-black uppercase shadow-md">
              <Zap className="size-3" />
              <span>T = {sweepLine}</span>
            </div>
          </div>
        )}

        {/* Interval Capsules */}
        {intervals.map((iv, idx) => {
          const lane = lanes[idx] ?? 0;
          const leftPct = ((iv.start - minTime) / timeSpan) * 100;
          const widthPct = Math.max(3.5, ((iv.end - iv.start) / timeSpan) * 100);
          const topPos = 20 + lane * laneHeight;

          const isCurrent = iv.status === "active" || idx === activeIntervalIndex;
          const isMerged = iv.status === "merged";
          const isConflict = iv.status === "conflict";
          const isRetained = iv.status === "retained";
          const isSelected = selectedInterval?.id === iv.id;

          let capsuleStyle = "border-border/70 bg-card/80 text-foreground";
          if (isSelected) {
            capsuleStyle = "border-primary ring-2 ring-primary bg-primary/25 text-primary font-black scale-105 z-20 shadow-md";
          } else if (isCurrent) {
            capsuleStyle =
              "border-primary ring-2 ring-primary/80 bg-primary text-primary-foreground font-black scale-105 z-20 shadow-lg shadow-primary/30 animate-sync-glow constant-glow-primary";
          } else if (isMerged) {
            capsuleStyle = "border-emerald-500/80 bg-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/30";
          } else if (isConflict) {
            capsuleStyle = "border-rose-500/80 bg-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/30";
          } else if (isRetained) {
            capsuleStyle = "border-indigo-500/70 bg-indigo-500/20 text-indigo-300 font-bold";
          }

          return (
            <button
              key={iv.id || idx}
              type="button"
              onClick={() => onSelectInterval(iv)}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                top: `${topPos}px`,
              }}
              className={`group absolute h-10 rounded-xl flex items-center justify-between px-2.5 text-xs font-mono transition-all duration-300 shadow-sm border cursor-pointer ${capsuleStyle}`}
            >
              {/* Left endpoint marker & label */}
              <div className="flex items-center gap-1.5 truncate">
                {isMerged ? (
                  <GitMerge className="size-3.5 text-emerald-400 shrink-0" />
                ) : isConflict ? (
                  <AlertCircle className="size-3.5 text-rose-400 shrink-0" />
                ) : isCurrent ? (
                  <Sparkles className="size-3.5 shrink-0" />
                ) : null}
                <span className="font-bold truncate">[{iv.start}, {iv.end}]</span>
              </div>

              {/* Right duration badge */}
              <span className="text-[10px] font-mono opacity-80 shrink-0 ml-1 rounded bg-background/40 px-1 py-0.2">
                Δ={iv.end - iv.start}
              </span>

              {/* Endpoint Tooltip Dots */}
              <div className="absolute -left-1 size-2 rounded-full bg-primary border border-background" />
              <div className="absolute -right-1 size-2 rounded-full bg-primary border border-background" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. MERGED OUTPUT STREAM VIEW
// ---------------------------------------------------------------------------
interface MergedOutputStreamViewProps {
  intervals: IntervalItem[];
  mergedOutput: IntervalItem[];
  activeIntervalIndex?: number | null;
  onSelectInterval: (iv: IntervalItem) => void;
}

function MergedOutputStreamView({
  intervals,
  mergedOutput,
  activeIntervalIndex,
  onSelectInterval,
}: MergedOutputStreamViewProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-background/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
        <div className="flex items-center gap-2">
          <GitMerge className="size-4 text-emerald-400" />
          <span>Interval Coalescence & Result Accumulator Stream</span>
        </div>
        <span className="text-muted-foreground">{mergedOutput.length} Consolidated Spans</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Raw Input Intervals List */}
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/60 p-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            Raw Input Intervals (Sorted by Start Time)
          </div>
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
            {intervals.map((iv, idx) => {
              const isActive = idx === activeIntervalIndex;
              return (
                <button
                  key={iv.id || idx}
                  type="button"
                  onClick={() => onSelectInterval(iv)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-mono transition-all text-left ${
                    isActive
                      ? "border-primary bg-primary/20 text-primary font-bold shadow-xs"
                      : "border-border/60 bg-muted/20 text-foreground hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">#{idx}</span>
                    <span className="font-bold">[{iv.start}, {iv.end}]</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Duration: {iv.end - iv.start}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Consolidated Merged Output List */}
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center justify-between">
            <span>Consolidated Output Stream</span>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 font-black">
              Output Array
            </span>
          </div>
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
            {mergedOutput.length === 0 ? (
              <div className="text-xs text-muted-foreground p-3 text-center font-mono">
                No intervals merged yet. Initializing...
              </div>
            ) : (
              mergedOutput.map((iv, idx) => (
                <div
                  key={iv.id || idx}
                  className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-mono text-emerald-300 font-bold shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    <span>[{iv.start}, {iv.end}]</span>
                  </div>
                  <span className="text-[10px] opacity-80">Span Δ = {iv.end - iv.start}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. SWEEP-LINE EVENTS QUEUE VIEW
// ---------------------------------------------------------------------------
interface SweepLineEventsViewProps {
  events: Array<{ time: number; type: "start" | "end"; interval: IntervalItem; id: string; runningRooms: number }>;
  sweepLine: number | null;
  maxRooms: number;
  onSelectInterval: (iv: IntervalItem) => void;
}

function SweepLineEventsView({
  events,
  sweepLine,
  maxRooms,
  onSelectInterval,
}: SweepLineEventsViewProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <span>Chronological Sweep-Line Event Queue (O(N log N) Sorting)</span>
        </div>
        <span className="text-muted-foreground">Max Rooms Required: {maxRooms}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground text-[11px] uppercase">
              <th className="p-2">Timestamp</th>
              <th className="p-2">Event Action</th>
              <th className="p-2">Associated Interval</th>
              <th className="p-2 text-right">Active Concurrency</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, idx) => {
              const isPastSweep = sweepLine !== null && ev.time <= sweepLine;
              const isStart = ev.type === "start";

              return (
                <tr
                  key={ev.id || idx}
                  className={`border-b border-border/30 transition-colors ${
                    isPastSweep ? "bg-primary/5 text-foreground font-semibold" : "text-muted-foreground opacity-60"
                  }`}
                >
                  <td className="p-2 font-bold font-mono">T = {ev.time}</td>
                  <td className="p-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                        isStart
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isStart ? "+1 Meeting Start" : "-1 Meeting End"}
                    </span>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => onSelectInterval(ev.interval)}
                      className="hover:underline font-bold text-foreground"
                    >
                      [{ev.interval.start}, {ev.interval.end}]
                    </button>
                  </td>
                  <td className="p-2 text-right font-black font-mono">
                    <span className="rounded bg-background/80 px-2 py-0.5 border border-border/60">
                      {ev.runningRooms} {ev.runningRooms === 1 ? "room" : "rooms"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

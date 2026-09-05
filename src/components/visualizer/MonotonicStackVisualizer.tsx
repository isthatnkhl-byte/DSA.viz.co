import { memo, useState, useMemo } from "react";
import type { Sightline } from "@/lib/problems";
import { getMarkerStyle, type MarkerStyle } from "./VisualizerTypes";
import {
  Layers,
  Eye,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Target,
  Sparkles,
} from "lucide-react";

interface MonotonicStackVisualizerProps {
  array?: (number | string)[] | null;
  stack?: (number | string)[] | null;
  currentIndex?: number | null;
  currentValue?: number | string | null;
  stackInvariant?: "increasing" | "decreasing" | null;
  sightlines?: Sightline[] | null;
  explanation?: string;
  pointer_labels?: Record<string, string> | null | undefined;
  activePointers?: Record<string, number | string | [number, number] | null> | null | undefined;
}

export const MonotonicStackVisualizer = memo(function MonotonicStackVisualizer({
  array = [],
  stack = [],
  currentIndex,
  currentValue,
  stackInvariant = "decreasing",
  sightlines = [],
  explanation = "",
  pointer_labels,
  activePointers,
}: MonotonicStackVisualizerProps) {
  const safeArray = useMemo(() => (Array.isArray(array) ? array : []), [array]);
  const safeStack = useMemo(() => (Array.isArray(stack) ? stack : []), [stack]);
  const safeSightlines = useMemo(() => (Array.isArray(sightlines) ? sightlines : []), [sightlines]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isDecreasing = stackInvariant === "decreasing" || !stackInvariant;

  // Active or hovered bar for sightline radar preview
  const inspectedIdx = hoveredIdx !== null ? hoveredIdx : (currentIndex ?? null);

  // Compute min and max values to calculate proportional bar heights
  const { minVal, maxVal } = useMemo(() => {
    const nums = safeArray.map(Number).filter((n) => !isNaN(n));
    if (nums.length === 0) return { minVal: 0, maxVal: 100 };
    return {
      minVal: Math.min(...nums),
      maxVal: Math.max(...nums),
    };
  }, [safeArray]);

  // Scaled bar height between 36px and 140px
  const getBarHeight = (val: number | string) => {
    const num = Number(val);
    if (isNaN(num)) return 50;
    const range = Math.max(1, maxVal - minVal);
    const normalized = (num - minVal) / range;
    return Math.round(36 + normalized * 104);
  };

  // Interactive Sightline Radar calculation for inspected bar
  const radarResult = useMemo(() => {
    if (inspectedIdx === null || inspectedIdx < 0 || inspectedIdx >= safeArray.length) {
      return null;
    }
    const currVal = Number(safeArray[inspectedIdx]);
    if (isNaN(currVal)) return null;

    for (let j = inspectedIdx + 1; j < safeArray.length; j++) {
      const otherVal = Number(safeArray[j]);
      if (isNaN(otherVal)) continue;
      const isMatch = isDecreasing ? otherVal > currVal : otherVal < currVal;
      if (isMatch) {
        return {
          fromIdx: inspectedIdx,
          fromVal: currVal,
          targetIdx: j,
          targetVal: otherVal,
          distance: j - inspectedIdx,
          label: isDecreasing ? "Next Greater Element" : "Next Smaller Element",
        };
      }
    }
    return {
      fromIdx: inspectedIdx,
      fromVal: currVal,
      targetIdx: null,
      targetVal: null,
      distance: null,
      label: isDecreasing ? "Next Greater Element" : "Next Smaller Element",
    };
  }, [inspectedIdx, safeArray, isDecreasing]);

  // Layout metrics for SVG canvas
  const { barLayouts, svgWidth, svgHeight } = useMemo(() => {
    const n = safeArray.length;
    const paddingX = 30;
    const barWidth = 42;
    const minStep = 64;
    const totalW = Math.max(560, paddingX * 2 + n * minStep);
    const totalH = 220;
    const baselineY = 175;

    const layouts = safeArray.map((val, idx) => {
      const stepX = (totalW - paddingX * 2) / (n + 1);
      const centerX = paddingX + (idx + 1) * stepX;
      const h = getBarHeight(val);
      const topY = baselineY - h;

      return {
        idx,
        val,
        centerX,
        topY,
        height: h,
        barWidth,
        baselineY,
      };
    });

    return { barLayouts: layouts, svgWidth: totalW, svgHeight: totalH };
  }, [safeArray, minVal, maxVal]);

  const activePointerEntries = useMemo(() => {
    if (!activePointers || typeof activePointers !== "object") return [];
    return Object.entries(activePointers).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
  }, [activePointers]);

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Active Pointer Legend Bar */}
      {activePointerEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-[11px] font-mono shadow-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
            Active Pointers:
          </span>
          {activePointerEntries.map(([k, v]) => {
            const style = getMarkerStyle(k);
            return (
              <span
                key={`ms-badge-${k}`}
                className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 border font-semibold ${style.bg} ${style.textCol} ${style.border}`}
              >
                <span>{k}</span>
                <span className="opacity-70">➔</span>
                <span className="font-bold text-foreground">
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Top Banner: Invariant Status Badge & Sightline Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card/75 p-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-xs">
            <Layers className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Geometric Monotonic Stack
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border ${
                  isDecreasing
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                }`}
              >
                {isDecreasing ? (
                  <TrendingDown className="size-3 text-amber-400" />
                ) : (
                  <TrendingUp className="size-3 text-indigo-400" />
                )}
                Invariant: {isDecreasing ? "Decreasing (Top < Below)" : "Increasing (Top > Below)"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              Hover any vertical bar to cast interactive observation sightline rays
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-950/40 px-2 py-0.5 text-sky-300">
            <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" /> Active Bar
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-emerald-300">
            <CheckCircle2 className="size-3 text-emerald-400" /> In Stack
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-amber-300">
            <Eye className="size-3 text-amber-400" /> Sightline Ray
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-950/40 px-2 py-0.5 text-purple-300">
            <Target className="size-3 text-purple-400" /> Radar Target
          </span>
        </div>
      </div>

      {/* Interactive Sightline Radar Readout Banner */}
      {radarResult && (
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-purple-500/40 bg-purple-950/30 p-2.5 px-3.5 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="flex size-6 items-center justify-center rounded-md bg-purple-900/60 border border-purple-500/50 text-purple-300">
              <Target className="size-3.5 animate-pulse" />
            </div>
            <span className="text-purple-200 font-bold">Interactive Sightline Radar:</span>
            <span className="text-foreground">
              Inspecting bar [{radarResult.fromIdx}] ({radarResult.fromVal})
            </span>
            <span className="text-muted-foreground">⟶</span>
            {radarResult.targetIdx !== null ? (
              <span className="text-emerald-300 font-extrabold bg-emerald-950/50 border border-emerald-500/40 px-2 py-0.5 rounded">
                Found {radarResult.label} at [{radarResult.targetIdx}] ({radarResult.targetVal}) • Distance Δi = {radarResult.distance}
              </span>
            ) : (
              <span className="text-slate-400 font-semibold bg-slate-900/50 border border-slate-700/50 px-2 py-0.5 rounded">
                No larger element exists to the right (Result = -1)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Dual View: Geometric Bar Canvas with Laser Rays (Left) & LIFO Canister Stack (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-end">
        {/* LEFT PANE: SVG Geometric Proportional Bars & Optical Laser Rays */}
        <div className="lg:col-span-8 flex flex-col gap-2 rounded-xl border border-border/80 bg-card/75 p-3.5 backdrop-blur-sm shadow-xs min-h-[260px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Geometric Bar Proportions & Sightline Laser Rays
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              Scaled range [{minVal} .. {maxVal}]
            </span>
          </div>

          <div className="w-full overflow-x-auto overflow-y-hidden rounded-lg bg-background/50 border border-border/40 p-2">
            {safeArray.length === 0 ? (
              <div className="py-16 text-center font-mono text-xs text-muted-foreground">
                Array is empty.
              </div>
            ) : (
              <svg width={svgWidth} height={svgHeight} className="select-none mx-auto">
                <defs>
                  {/* Laser Glow Filters */}
                  <filter id="laser-green" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.8" />
                  </filter>
                  <filter id="laser-amber" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.8" />
                  </filter>
                  <filter id="laser-purple" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#a855f7" floodOpacity="0.85" />
                  </filter>
                  <filter id="bar-active-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.75" />
                  </filter>

                  {/* Marker Arrowheads */}
                  <marker
                    id="laser-arrow-green"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                  </marker>
                  <marker
                    id="laser-arrow-amber"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
                  </marker>
                  <marker
                    id="laser-arrow-purple"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#c084fc" />
                  </marker>
                </defs>

                {/* Draw Baseline Guide */}
                <line
                  x1="10"
                  y1="175"
                  x2={svgWidth - 10}
                  y2="175"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* 1. Draw Active Sightlines from Simulation Steps */}
                {safeSightlines.map((st, sIdx) => {
                  const fromBar = barLayouts[st.fromIdx];
                  const toBar = barLayouts[st.toIdx];
                  if (!fromBar || !toBar) return null;

                  const midX = (fromBar.centerX + toBar.centerX) / 2;
                  const arcTopY = Math.min(fromBar.topY, toBar.topY) - 34;
                  const isResolved = st.resolved;
                  const color = isResolved ? "#10b981" : "#f59e0b";
                  const filter = isResolved ? "url(#laser-green)" : "url(#laser-amber)";
                  const marker = isResolved ? "url(#laser-arrow-green)" : "url(#laser-arrow-amber)";

                  const pathData = `M ${fromBar.centerX} ${fromBar.topY} Q ${midX} ${arcTopY} ${toBar.centerX} ${toBar.topY}`;

                  return (
                    <g key={`sightline-${sIdx}`} filter={filter}>
                      {/* Laser Halo */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="7"
                        strokeOpacity="0.25"
                        strokeLinecap="round"
                      />
                      {/* Main Laser Ray Beam */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.5"
                        strokeDasharray="6 3"
                        markerEnd={marker}
                        className="animate-pulse"
                      />
                      {/* Ray Badge */}
                      <g transform={`translate(${midX}, ${arcTopY + 8})`}>
                        <rect
                          x="-32"
                          y="-9"
                          width="64"
                          height="18"
                          rx="4"
                          fill="#0f172a"
                          stroke={color}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          dy="3.5"
                          className="font-mono text-[8.5px] font-extrabold select-none"
                          fill={color}
                        >
                          Δi = {Math.abs(st.toIdx - st.fromIdx)}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* 2. Draw Interactive Sightline Radar Ray (Hover preview) */}
                {radarResult && radarResult.targetIdx !== null && (
                  (() => {
                    const fromBar = barLayouts[radarResult.fromIdx];
                    const toBar = barLayouts[radarResult.targetIdx];
                    if (!fromBar || !toBar) return null;

                    const midX = (fromBar.centerX + toBar.centerX) / 2;
                    const arcTopY = Math.min(fromBar.topY, toBar.topY) - 40;
                    const pathData = `M ${fromBar.centerX} ${fromBar.topY} Q ${midX} ${arcTopY} ${toBar.centerX} ${toBar.topY}`;

                    return (
                      <g filter="url(#laser-purple)">
                        {/* Purple Laser Halo */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="8"
                          strokeOpacity="0.3"
                          strokeLinecap="round"
                        />
                        {/* Pulsing Observation Ray */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="#c084fc"
                          strokeWidth="2.5"
                          strokeDasharray="5 3"
                          markerEnd="url(#laser-arrow-purple)"
                        />
                        {/* Radar Target Pill */}
                        <g transform={`translate(${midX}, ${arcTopY + 8})`}>
                          <rect
                            x="-38"
                            y="-9"
                            width="76"
                            height="18"
                            rx="4"
                            fill="#3b0764"
                            stroke="#c084fc"
                            strokeWidth="1.5"
                          />
                          <text
                            textAnchor="middle"
                            dy="3.5"
                            className="font-mono text-[8.5px] font-extrabold fill-purple-200 select-none"
                          >
                            🎯 NGE: {radarResult.targetVal}
                          </text>
                        </g>
                      </g>
                    );
                  })()
                )}

                {/* 3. Draw Vertical Proportional Bars */}
                {barLayouts.map((bar) => {
                  const isActive = currentIndex === bar.idx;
                  const isHovered = hoveredIdx === bar.idx;
                  const isRadarTarget = radarResult?.targetIdx === bar.idx;
                  const inStack = safeStack.some(
                    (item) =>
                      item === bar.val ||
                      (typeof item === "object" && (item as any)?.val === bar.val) ||
                      (typeof item === "object" && (item as any)?.idx === bar.idx),
                  );

                  let fill = "#334155";
                  let stroke = "#475569";
                  let textFill = "#94a3b8";
                  let filter = undefined;

                  if (isRadarTarget) {
                    fill = "#7e22ce";
                    stroke = "#c084fc";
                    textFill = "#f3e8ff";
                    filter = "url(#laser-purple)";
                  } else if (isActive || isHovered) {
                    fill = "#0284c7";
                    stroke = "#38bdf8";
                    textFill = "#e0f2fe";
                    filter = "url(#bar-active-glow)";
                  } else if (inStack) {
                    fill = "#059669";
                    stroke = "#34d399";
                    textFill = "#d1fae5";
                  }

                  const halfW = bar.barWidth / 2;

                  const barPointers: { label: string; style: MarkerStyle }[] = [];
                  if (activePointers && typeof activePointers === "object") {
                    for (const [pName, pVal] of Object.entries(activePointers)) {
                      if (pVal === null || pVal === undefined) continue;
                      if (
                        (typeof pVal === "number" && pVal === bar.idx) ||
                        String(pVal) === String(bar.val)
                      ) {
                        barPointers.push({ label: pName.slice(0, 8), style: getMarkerStyle(pName) });
                      }
                    }
                  }
                  if (isActive && !barPointers.some((p) => /curr/.test(p.label.toLowerCase()))) {
                    barPointers.push({ label: pointer_labels?.current || "curr", style: getMarkerStyle("curr") });
                  }

                  const firstBarPointer = barPointers[0];

                  return (
                    <g
                      key={bar.idx}
                      onMouseEnter={() => setHoveredIdx(bar.idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer transition-all duration-200"
                    >
                      {/* Active or Target Pulsing Outline */}
                      {(isActive || isRadarTarget) && (
                        <rect
                          x={bar.centerX - halfW - 4}
                          y={bar.topY - 4}
                          width={bar.barWidth + 8}
                          height={bar.height + 4}
                          rx="6"
                          fill="none"
                          stroke={isRadarTarget ? "#c084fc" : "#38bdf8"}
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          className="animate-pulse"
                        />
                      )}

                      {/* Floating Pointer Badge above Bar */}
                      {firstBarPointer && (
                        <g transform={`translate(${bar.centerX}, ${bar.topY - 26})`}>
                          <rect
                            x="-16"
                            y="-8"
                            width="32"
                            height="14"
                            rx="3"
                            fill={firstBarPointer.style.svgFill}
                            stroke={firstBarPointer.style.svgStroke}
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            dy="3"
                            className="font-mono text-[8.5px] font-black select-none uppercase"
                            fill={firstBarPointer.style.svgText}
                          >
                            {firstBarPointer.label}
                          </text>
                        </g>
                      )}

                      {/* Main Vertical Bar */}
                      <rect
                        x={bar.centerX - halfW}
                        y={bar.topY}
                        width={bar.barWidth}
                        height={bar.height}
                        rx="5"
                        fill={fill}
                        stroke={isHovered ? "#ffffff" : stroke}
                        strokeWidth={isActive || isHovered || isRadarTarget ? "2" : "1"}
                        filter={filter}
                        className="transition-all duration-200 hover:brightness-110"
                      />

                      {/* Value Tag on top of Bar */}
                      <text
                        x={bar.centerX}
                        y={bar.topY - 8}
                        textAnchor="middle"
                        className={`font-mono text-[11px] select-none font-bold ${
                          isActive || isHovered || isRadarTarget
                            ? "font-extrabold fill-foreground text-sm"
                            : "fill-muted-foreground"
                        }`}
                      >
                        {bar.val}
                      </text>

                      {/* Index Tag under Bar */}
                      <text
                        x={bar.centerX}
                        y={bar.baselineY + 16}
                        textAnchor="middle"
                        className={`font-mono text-[10px] select-none font-semibold ${
                          isActive || isHovered ? "fill-sky-400 font-extrabold" : "fill-slate-400"
                        }`}
                      >
                        [{bar.idx}]
                      </text>

                      {/* Status Descriptor Inside Bar */}
                      {isActive && (
                        <text
                          x={bar.centerX}
                          y={bar.topY + 16}
                          textAnchor="middle"
                          className="font-mono text-[8px] font-black fill-white uppercase select-none tracking-tighter"
                        >
                          ACTIVE
                        </text>
                      )}
                      {isRadarTarget && !isActive && (
                        <text
                          x={bar.centerX}
                          y={bar.topY + 16}
                          textAnchor="middle"
                          className="font-mono text-[8px] font-black fill-white uppercase select-none tracking-tighter"
                        >
                          NGE
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Vertical LIFO Canister Stack */}
        <div className="lg:col-span-4 flex flex-col gap-2 rounded-xl border border-border/80 bg-card/75 p-3.5 backdrop-blur-sm shadow-xs min-h-[260px]">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Stack Canister (LIFO)
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              Size: {safeStack.length}
            </span>
          </div>

          <div className="flex flex-col justify-end min-h-[190px] rounded-lg border-2 border-dashed border-border/80 bg-background/40 p-2">
            {safeStack.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center font-mono text-xs text-muted-foreground my-auto py-8">
                <span>[ Empty Stack ]</span>
                <span className="text-[10px] opacity-70">Pushing next incoming element</span>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-1.5 overflow-y-auto max-h-[190px]">
                {safeStack.map((item, idx) => {
                  const isTop = idx === safeStack.length - 1;
                  const itemVal =
                    typeof item === "object" && item !== null
                      ? (item as any).val ?? JSON.stringify(item)
                      : item;
                  const itemIdx =
                    typeof item === "object" && item !== null ? (item as any).idx : null;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-md border px-3 py-1.5 font-mono text-xs transition-all ${
                        isTop
                          ? "border-emerald-500/80 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/60 shadow-xs"
                          : "border-border/60 bg-card/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isTop && (
                          <span className="font-mono text-[9px] rounded bg-emerald-500/20 px-1 py-0.2 font-extrabold text-emerald-400">
                            TOP
                          </span>
                        )}
                        <span className="font-extrabold text-sm">{itemVal}</span>
                      </div>
                      {itemIdx !== null && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          idx: [{itemIdx}]
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

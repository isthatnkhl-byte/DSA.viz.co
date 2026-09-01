import React, { useMemo, useRef, useEffect } from "react";
import type { Val } from "./VisualizerTypes";
import { safeArray } from "./VisualizerTypes";
import { Layers, ArrowRightLeft, Sparkles } from "lucide-react";

interface ArrayVisualizerProps {
  cells: Val[];
  left?: number | null | undefined;
  right?: number | null | undefined;
  current?: Val | null | undefined;
  visited?: Val[] | null | undefined;
  wSum?: number | null | undefined;
  mSum?: number | null | undefined;
  secondaryArray?: Val[] | null | undefined;
  left2?: number | null | undefined;
  right2?: number | null | undefined;
  label1?: string;
  label2?: string;
  activeDataset?: string | null;
  isMathMode?: boolean;
  hideBars?: boolean;
  pointer_labels?: Record<string, string> | null;
}

export function ArrayVisualizer({
  cells: rawCells,
  left,
  right,
  current,
  visited: rawVisited,
  wSum,
  mSum,
  secondaryArray: rawSecondary,
  left2,
  right2,
  label1 = "Input Array",
  label2 = "Secondary Array (nums2)",
  activeDataset,
  isMathMode,
  hideBars,
  pointer_labels,
}: ArrayVisualizerProps) {
  const labelL = pointer_labels?.left ? pointer_labels.left.slice(0, 7) : "L";
  const labelR = pointer_labels?.right ? pointer_labels.right.slice(0, 7) : "R";
  const labelL2 = pointer_labels?.left2 ? pointer_labels.left2.slice(0, 7) : "L2";
  const labelR2 = pointer_labels?.right2 ? pointer_labels.right2.slice(0, 7) : "R2";
  const labelMid = pointer_labels?.current ? pointer_labels.current.slice(0, 7) : "mid";
  const labelCurr = pointer_labels?.current ? pointer_labels.current.slice(0, 7) : "curr";

  const cells = useMemo(() => safeArray(rawCells), [rawCells]);
  const secondaryCells = useMemo(
    () => (rawSecondary ? safeArray(rawSecondary) : null),
    [rawSecondary],
  );
  const visited = useMemo(() => safeArray(rawVisited ?? []), [rawVisited]);
  const visitedSet = useMemo(() => new Set(visited.map(String)), [visited]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeElementRef = useRef<HTMLDivElement>(null);

  const isNumericArray = useMemo(() => {
    const all = [...cells, ...(secondaryCells ?? [])];
    return all.some((v) => typeof v === "number" && !isNaN(v) && Math.abs(v) > 0);
  }, [cells, secondaryCells]);

  const maxVal = useMemo(() => {
    const all = [...cells, ...(secondaryCells ?? [])];
    if (all.length === 0) return 1;
    const finiteVals = all
      .map((v) => Math.abs(Number(v) || 0))
      .filter((n) => Number.isFinite(n) && n < 1e8);
    return finiteVals.length > 0 ? Math.max(1, ...finiteVals) : 1;
  }, [cells, secondaryCells]);

  const hasPointers = typeof left === "number" || typeof right === "number";
  const isSlidingWindow =
    typeof left === "number" && typeof right === "number" && left <= right && right >= 0;

  // Auto-scroll active element into view if needed
  useEffect(() => {
    if (activeElementRef.current && scrollContainerRef.current) {
      activeElementRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [current, left, right, left2, right2]);

  const isDualSequence = !!(secondaryCells && secondaryCells.length > 0);

  const row1Left = typeof left === "number" ? left : null;
  const row1Right = isDualSequence
    ? typeof left2 === "number"
      ? typeof right === "number"
        ? right
        : null
      : null
    : typeof right === "number"
      ? right
      : null;

  const row2Left =
    typeof left2 === "number"
      ? left2
      : isDualSequence && typeof right === "number" && typeof left === "number"
        ? right
        : null;
  const row2Right = typeof right2 === "number" ? right2 : null;

  const isMatchingPair =
    isDualSequence &&
    row1Left !== null &&
    row2Left !== null &&
    cells[row1Left] !== undefined &&
    secondaryCells?.[row2Left] !== undefined &&
    String(cells[row1Left]) === String(secondaryCells[row2Left]);

  const renderArrayRow = (
    items: Val[],
    pLeft?: number | null,
    pRight?: number | null,
    rowLabel?: string,
    isSecondary = false,
  ) => {
    const isThisActive = isDualSequence
      ? true
      : isSecondary
        ? activeDataset === "secondaryArray" ||
          activeDataset === "nums2" ||
          activeDataset === "array2"
        : activeDataset === "array" ||
          activeDataset === "nums1" ||
          activeDataset === "primary" ||
          !activeDataset;

    // Check for out-of-bounds pointers
    const leftOobLeft = typeof pLeft === "number" && pLeft < 0;
    const leftOobRight = typeof pLeft === "number" && pLeft >= items.length;
    const rightOobLeft = typeof pRight === "number" && pRight < 0;
    const rightOobRight = typeof pRight === "number" && pRight >= items.length;

    return (
      <div
        className={`flex flex-col gap-2 rounded-2xl p-4 transition-all duration-300 ${
          isThisActive
            ? "border border-primary/40 bg-primary/5 shadow-xs"
            : "border border-border/50 bg-background/40 opacity-85"
        }`}
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-muted-foreground">
            <Layers className="size-3.5 text-primary" />
            <span className="text-foreground">{rowLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {(leftOobLeft || leftOobRight || rightOobLeft || rightOobRight) && (
              <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-400">
                BOUNDARY: {leftOobLeft ? `${labelL}=${pLeft} (< 0)` : ""}{" "}
                {rightOobRight ? `${labelR}=${pRight} (≥ ${items.length})` : ""}{" "}
                {leftOobRight ? `${labelL}=${pLeft} (≥ ${items.length})` : ""}
              </span>
            )}
            {isThisActive && (
              <span className="rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[9px] font-bold text-primary shadow-xs">
                {isDualSequence ? (isSecondary ? "SEQUENCE 2" : "SEQUENCE 1") : "ACTIVE FOCUS"}
              </span>
            )}
          </div>
        </div>

        <div className="flex w-max min-w-full items-end justify-start sm:justify-center gap-4 sm:gap-6 pt-10 pb-3 px-3 m-auto">
          {/* Left Out-of-Bounds Indicator */}
          {(leftOobLeft || rightOobLeft) && (
            <div className="relative flex flex-col items-center gap-2 opacity-75">
              <div className="absolute -top-8 flex flex-col items-center z-10 select-none">
                <span className="rounded-lg bg-amber-500/30 border border-amber-500/60 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 shadow-xs">
                  {leftOobLeft ? `${labelL} (${pLeft})` : `${labelR} (${pRight})`}
                </span>
              </div>
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/10 font-mono text-xs text-amber-300 font-bold">
                OOB
              </div>
              <span className="font-mono text-[10px] text-amber-400/80 font-semibold">[&lt;0]</span>
            </div>
          )}

          {items.map((val, i) => {
            const isLeftPtr = pLeft === i;
            const isRightPtr = pRight === i;
            const isSingleLeftActive =
              typeof pLeft === "number" && pLeft === i && (pRight === null || pRight === undefined);

            const isSingleRightActive =
              typeof pRight === "number" && pRight === i && (pLeft === null || pLeft === undefined);

            const inWindow =
              typeof pLeft === "number" &&
              typeof pRight === "number" &&
              i >= pLeft &&
              i <= pRight &&
              pLeft <= pRight;

            // Only show mid if pLeft and pRight exist, it's NOT a sliding window, and i is at the midpoint
            const isMidPtr =
              typeof pLeft === "number" &&
              typeof pRight === "number" &&
              pLeft < pRight &&
              !isSlidingWindow &&
              Math.floor((pLeft + pRight) / 2) === i &&
              current !== null &&
              (String(val) === String(current) || current === i);

            const isCurrent =
              isThisActive &&
              current !== null &&
              current !== undefined &&
              (current === i || String(val) === String(current));

            const isVisited =
              (typeof pLeft === "number" &&
                (pRight === null || pRight === undefined) &&
                i < pLeft) ||
              (visitedSet.has(String(val)) && !isCurrent);

            const numericVal = Math.abs(Number(val) || 0);
            const effectiveNum = numericVal >= 1e8 ? maxVal : numericVal;
            const barHeight = Math.max(12, Math.min(68, Math.round((effectiveNum / maxVal) * 68)));
            const strVal = String(val);
            const displayVal =
              strVal === "2147483647" || strVal === "999999999" || strVal === "Infinity"
                ? "∞"
                : strVal.length > 8
                  ? `${strVal.slice(0, 7)}…`
                  : strVal;

            return (
              <div
                key={`row-${rowLabel}-${i}`}
                ref={
                  isCurrent || isLeftPtr || isRightPtr || isSingleLeftActive
                    ? activeElementRef
                    : undefined
                }
                className="relative flex flex-col items-center gap-2"
              >
                {/* Floating Pointer Badges with Distinct Colors (L and R) */}
                <div className="absolute -top-8 flex flex-col items-center z-10 select-none pointer-events-none">
                  {isLeftPtr && isMatchingPair && (
                    <span className="rounded-lg bg-emerald-500 px-2 py-0.5 font-mono text-[10px] font-black text-white border border-emerald-400 shadow-md shadow-emerald-500/50 animate-pulse">
                      MATCH
                    </span>
                  )}
                  {isLeftPtr && !isMatchingPair && isRightPtr && (
                    <span className="rounded-lg bg-primary px-2 py-0.5 font-mono text-[10px] font-black text-primary-foreground shadow-md shadow-primary/40 constant-glow-primary">
                      {labelL} / {labelR}
                    </span>
                  )}
                  {isLeftPtr && !isMatchingPair && !isRightPtr && (
                    <span
                      className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-black border shadow-xs ${
                        isSecondary
                          ? "bg-indigo-500/30 text-indigo-300 border-indigo-500/60 shadow-indigo-500/30"
                          : "bg-emerald-500/30 text-emerald-400 border-emerald-500/60 shadow-emerald-500/30"
                      }`}
                    >
                      {isSecondary ? labelR : labelL}
                    </span>
                  )}
                  {isMidPtr && !isLeftPtr && !isRightPtr && (
                    <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 border border-amber-500/50 shadow-xs shadow-amber-500/20">{labelMid}</span>
                  )}
                  {isRightPtr && !isLeftPtr && !isMatchingPair && (
                    <span className="rounded-lg bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-black text-indigo-300 border border-indigo-500/50 shadow-xs shadow-indigo-500/20">{labelR}</span>
                  )}
                  {!isLeftPtr && !isRightPtr && !isMidPtr && isCurrent && (
                    <span className="rounded-lg bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-black text-primary border border-primary/50 shadow-xs shadow-primary/20">{labelCurr}</span>
                  )}
                </div>

                {/* Magnitude Bar (only rendered for numeric arrays with magnitude values) */}
                {isNumericArray && !hideBars && (
                  <div
                    className="w-10 rounded-t-lg transition-all duration-300 shadow-sm"
                    style={{
                      height: `${barHeight}px`,
                      background:
                        inWindow || isCurrent || isSingleLeftActive || (isLeftPtr && isRightPtr)
                          ? "linear-gradient(180deg, oklch(0.82 0.15 195) 0%, oklch(0.68 0.18 220) 100%)"
                          : isVisited || isLeftPtr || isRightPtr
                            ? "linear-gradient(180deg, oklch(0.70 0.17 275) 0%, oklch(0.56 0.16 275) 100%)"
                            : "linear-gradient(180deg, oklch(0.32 0.012 260) 0%, oklch(0.22 0.01 260) 100%)",
                    }}
                  />
                )}

                {/* Element Value Box */}
                <div
                  title={strVal}
                  className={`flex size-12 sm:size-14 items-center justify-center rounded-2xl border font-mono text-base font-bold transition-all duration-300 shadow-sm ${
                    isLeftPtr && isMatchingPair
                      ? "scale-105 border-emerald-400 bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-400/80 font-black shadow-lg shadow-emerald-500/40 animate-pulse"
                      : isLeftPtr
                        ? isSecondary
                          ? "scale-105 border-indigo-400 bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-400/60 font-black shadow-lg shadow-indigo-500/40"
                          : "scale-105 border-primary bg-primary/20 text-primary ring-2 ring-primary/60 font-black shadow-lg shadow-primary/40"
                        : isCurrent ||
                          (isLeftPtr && isRightPtr) ||
                          isSingleLeftActive ||
                          isSingleRightActive
                          ? "scale-105 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-2 ring-primary/60 font-black constant-glow-primary"
                          : inWindow
                            ? "border-primary/80 bg-primary/15 text-primary font-black shadow-xs shadow-primary/20"
                            : isVisited || isRightPtr
                              ? "border-accent/70 bg-accent/20 text-accent font-bold shadow-xs"
                              : "border-border/80 bg-card/90 text-foreground hover:border-border"
                  }`}
                >
                  {displayVal}
                </div>

                {/* Index subscript */}
                <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                  [{i}]
                </span>
              </div>
            );
          })}

          {/* Right Out-of-Bounds Indicator */}
          {(leftOobRight || rightOobRight) && (
            <div className="relative flex flex-col items-center gap-2 opacity-75">
              <div className="absolute -top-8 flex flex-col items-center z-10 select-none">
                <span className="rounded-lg bg-amber-500/30 border border-amber-500/60 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 shadow-xs">
                  {rightOobRight ? `R (${pRight})` : `L (${pLeft})`}
                </span>
              </div>
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/10 font-mono text-xs text-amber-300 font-bold">
                OOB
              </div>
              <span className="font-mono text-[10px] text-amber-400/80 font-semibold">[≥{items.length}]</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const hasAnyPointers =
    typeof left === "number" ||
    typeof right === "number" ||
    typeof left2 === "number" ||
    typeof right2 === "number" ||
    current !== null ||
    visited.length > 0;
  const isMathSimulation = isMathMode;

  return (
    <div className="flex flex-col gap-4">
      {/* Visualizer Canvas */}
      <div
        ref={scrollContainerRef}
        className="flex min-h-[250px] w-full flex-col justify-center gap-4 overflow-x-auto rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-5 shadow-inner"
      >
        {isMathSimulation ? (
          <div className="flex flex-col items-center justify-center gap-3 opacity-80 animate-fade">
            <Sparkles className="size-8 text-primary/60" />
            <span className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Variables Trace
            </span>
            <span className="text-xs text-muted-foreground max-w-[250px] text-center">
              This simulation operates on local math variables rather than structural arrays. Follow
              the values in the descriptive steps below.
            </span>
          </div>
        ) : cells.length === 0 ? (
          <span className="mx-auto font-mono text-sm text-muted-foreground">Empty array</span>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            {renderArrayRow(cells, row1Left, row1Right, label1, false)}
            {secondaryCells && secondaryCells.length > 0 && (
              <>
                <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <ArrowRightLeft className="size-3.5 text-primary" />
                  <span>Cross-Dataset Comparison Stream</span>
                </div>
                {renderArrayRow(secondaryCells, row2Left, row2Right, label2, true)}
              </>
            )}
          </div>
        )}
      </div>

      {/* Sliding Window / Pointer Statistics Sub-bar */}
      {isSlidingWindow && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/50 px-4 py-3 text-xs font-mono backdrop-blur-sm animate-fade">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase text-[11px] font-semibold">
              Active Window:
            </span>
            <span className="rounded-lg bg-primary/20 px-2.5 py-0.5 font-bold text-primary border border-primary/40 shadow-xs shadow-primary/20">
              [{left} ... {right}] (Length: {(right ?? 0) - (left ?? 0) + 1})
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            {wSum !== null && wSum !== undefined && (
              <span>
                Window Sum: <strong className="text-primary font-bold text-sm ml-1">{wSum}</strong>
              </span>
            )}
            {mSum !== null && mSum !== undefined && (
              <span>
                Best Sum: <strong className="text-accent font-bold text-sm ml-1">{mSum}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

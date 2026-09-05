import { useMemo } from "react";
import type { Val } from "./VisualizerTypes";
import { coordKey, getMarkerStyle, parse2DCoord, safeArray, safeMatrix, toText } from "./VisualizerTypes";
import {
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Layers,
  Trophy,
  CheckCircle2,
} from "lucide-react";

interface MatrixVisualizerProps {
  matrix?: (number | string)[][] | null | undefined;
  cols?: number | null | undefined;
  left?: number | null | undefined;
  right?: number | null | undefined;
  current: Val | null | undefined;
  visited: Val[];
  direction?: string | null | undefined;
  currentArea?: number | null | undefined;
  maxArea?: number | null | undefined;
  islandCells?: (string | [number, number])[] | null | undefined;
  wSum?: number | null | undefined;
  mSum?: number | null | undefined;
  pointer_labels?: Record<string, string> | null | undefined;
  activePointers?: Record<string, number | string | [number, number] | null> | null | undefined;
}

export function MatrixVisualizer({
  matrix: rawMatrix,
  cols: rawCols,
  left,
  right,
  current,
  visited: rawVisited,
  direction,
  currentArea,
  maxArea,
  islandCells: rawIslandCells,
  wSum,
  mSum,
  pointer_labels,
  activePointers,
}: MatrixVisualizerProps) {
  const matrix = useMemo(() => safeMatrix(rawMatrix ?? []), [rawMatrix]);

  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const cols = Number(rawCols ?? matrix[0]?.length ?? 1) || 1;
  const rows = matrix.length;

  const currentKey = coordKey(current);

  const activePointerEntries = useMemo(() => {
    if (!activePointers || typeof activePointers !== "object") return [];
    return Object.entries(activePointers).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
  }, [activePointers]);

  // Check if grid elements are exclusively binary 0/1 or water/land
  const isBinaryGrid = useMemo(() => {
    if (!matrix || matrix.length === 0) return false;
    return matrix.every((row) =>
      row.every(
        (val) =>
          val === 0 ||
          val === 1 ||
          val === "0" ||
          val === "1" ||
          val === "water" ||
          val === "land",
      ),
    );
  }, [matrix]);

  // Detect whether this is genuinely an island / connected components problem
  const isIslandMode = useMemo(() => {
    if (Array.isArray(rawIslandCells) && rawIslandCells.length > 0) return true;
    if (typeof currentArea === "number" && currentArea > 0) return true;
    if (typeof maxArea === "number" && maxArea > 0) return true;
    if (isBinaryGrid) return true;
    return false;
  }, [rawIslandCells, currentArea, maxArea, isBinaryGrid]);

  // Set of all visited coordinates
  const seenKeys = useMemo(() => {
    const s = new Set<string>();
    visited.forEach((item) => {
      const k = coordKey(item);
      if (k) s.add(k);
    });
    return s;
  }, [visited]);

  // Set of cells in the currently active island cluster (if in island mode)
  const activeIslandSet = useMemo(() => {
    const s = new Set<string>();
    if (isIslandMode && Array.isArray(rawIslandCells) && rawIslandCells.length > 0) {
      rawIslandCells.forEach((c) => {
        const k = coordKey(c);
        if (k) s.add(k);
      });
    }
    return s;
  }, [isIslandMode, rawIslandCells]);

  // Calculate total land cells in grid (only used when isIslandMode is true)
  const totalLandCount = useMemo(() => {
    if (!isIslandMode) return 0;
    let count = 0;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < (matrix[r]?.length ?? 0); c++) {
        const k = `${r},${c}`;
        if (Number(matrix[r]?.[c]) === 1 || seenKeys.has(k) || activeIslandSet.has(k)) {
          count++;
        }
      }
    }
    return count;
  }, [isIslandMode, matrix, seenKeys, activeIslandSet]);

  // Differentiate between Area problems vs Count / Component problems
  const isAreaProblem = typeof currentArea === "number" || typeof maxArea === "number";
  const isIslandCountProblem = !isAreaProblem && isIslandMode && typeof wSum === "number";

  const primaryMetricLabel = isAreaProblem
    ? "Current Area"
    : isIslandCountProblem
      ? "Island Count"
      : "Metric / Value";

  const primaryMetricValue =
    typeof currentArea === "number"
      ? currentArea
      : typeof wSum === "number"
        ? wSum
        : activeIslandSet.size > 0
          ? activeIslandSet.size
          : null;

  const showSecondaryMetric =
    isAreaProblem
      ? typeof maxArea === "number" || typeof mSum === "number"
      : typeof mSum === "number" && mSum !== wSum;

  const secondaryMetricLabel = isAreaProblem
    ? "Max Area"
    : isIslandCountProblem
      ? "Max Islands"
      : "Max / Target";

  const secondaryMetricValue =
    typeof maxArea === "number"
      ? maxArea
      : typeof mSum === "number"
        ? mSum
        : isAreaProblem
          ? primaryMetricValue
          : null;

  // Normalize direction text for compass widget
  const dirText = String(direction ?? "").toUpperCase();
  const hasDirection = Boolean(direction && direction.trim());
  const isUp = dirText.includes("UP") || dirText.includes("-1, 0") || dirText.includes("-1,0");
  const isDown =
    dirText.includes("DOWN") ||
    dirText.includes("+1, 0") ||
    dirText.includes("1, 0") ||
    dirText.includes("1,0");
  const isLeft = dirText.includes("LEFT") || dirText.includes("0, -1") || dirText.includes("0,-1");
  const isRight =
    dirText.includes("RIGHT") ||
    dirText.includes("0, +1") ||
    dirText.includes("0, 1") ||
    dirText.includes("0,1");

  const isCurrentOOB = useMemo(() => {
    if (!currentKey) return false;
    const parts = currentKey.split(",");
    if (parts.length === 2) {
      const r = parseInt(parts[0] ?? "", 10);
      const c = parseInt(parts[1] ?? "", 10);
      if (!isNaN(r) && !isNaN(c)) {
        return r < 0 || r >= rows || c < 0 || c >= cols;
      }
    }
    return false;
  }, [currentKey, rows, cols]);

  // Derive pointer names
  const rowPtrLabel = pointer_labels?.left || "r";
  const colPtrLabel = pointer_labels?.right || "c";

  return (
    <div className="flex flex-col gap-4">
      {/* Active Pointer Legend Bar */}
      {activePointerEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-[11px] font-mono shadow-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
            Grid Pointers:
          </span>
          {activePointerEntries.map(([k, v]) => {
            const style = getMarkerStyle(k);
            return (
              <span
                key={`mat-badge-${k}`}
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

      {/* Top Banner: Grid Info, Directional Compass & Live Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-sm">
        {/* Left: Grid Dimension & Stats */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30 shadow-xs">
            <Layers className="size-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                2D Matrix Grid
              </span>
              <span className="rounded-md border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                {rows} × {cols}
              </span>
            </div>
            {isIslandMode ? (
              <span className="text-[11px] text-muted-foreground">
                Total Land Cells:{" "}
                <strong className="text-amber-300 font-mono">{totalLandCount}</strong> · Explored:{" "}
                <strong className="text-emerald-400 font-mono">{visited.length}</strong>
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Explored Cells:{" "}
                <strong className="text-emerald-400 font-mono">{visited.length}</strong> · Active:{" "}
                <strong className="text-primary font-mono">
                  {currentKey
                    ? `(${currentKey})`
                    : typeof left === "number" && typeof right === "number"
                      ? `(${left}, ${right})`
                      : "—"}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Center: 4-Direction Traversal Compass Widget (rendered when direction exists) */}
        {hasDirection && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 shadow-inner">
            <Compass className="size-4 text-primary shrink-0" />
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span
                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 font-bold transition-all ${
                  isUp
                    ? "bg-primary text-primary-foreground shadow-xs scale-105 ring-1 ring-primary"
                    : "text-muted-foreground/60"
                }`}
                title="UP (-1, 0)"
              >
                <ArrowUp className="size-3" /> UP
              </span>
              <span
                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 font-bold transition-all ${
                  isDown
                    ? "bg-primary text-primary-foreground shadow-xs scale-105 ring-1 ring-primary"
                    : "text-muted-foreground/60"
                }`}
                title="DOWN (+1, 0)"
              >
                <ArrowDown className="size-3" /> DOWN
              </span>
              <span
                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 font-bold transition-all ${
                  isLeft
                    ? "bg-primary text-primary-foreground shadow-xs scale-105 ring-1 ring-primary"
                    : "text-muted-foreground/60"
                }`}
                title="LEFT (0, -1)"
              >
                <ArrowLeft className="size-3" /> LEFT
              </span>
              <span
                className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 font-bold transition-all ${
                  isRight
                    ? "bg-primary text-primary-foreground shadow-xs scale-105 ring-1 ring-primary"
                    : "text-muted-foreground/60"
                }`}
                title="RIGHT (0, +1)"
              >
                <ArrowRight className="size-3" /> RIGHT
              </span>
            </div>
          </div>
        )}

        {/* Right: Area or Metric Badges or OOB Banner */}
        <div className="flex items-center gap-2">
          {isCurrentOOB && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 shadow-sm shadow-amber-500/10">
              <span className="size-2 rounded-full bg-amber-400 animate-ping" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300">
                  Boundary Probe
                </span>
                <span className="font-mono text-xs font-black text-amber-300">
                  ({currentKey}) [Out of Bounds]
                </span>
              </div>
            </div>
          )}

          {primaryMetricValue !== null && !isCurrentOOB && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 shadow-sm shadow-emerald-500/10 animate-sync-glow">
              <Sparkles className="size-3.5 text-emerald-400" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-300">
                  {primaryMetricLabel}
                </span>
                <span className="font-mono text-xs font-black text-emerald-300">
                  {primaryMetricValue}
                </span>
              </div>
            </div>
          )}

          {showSecondaryMetric && secondaryMetricValue !== null && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 shadow-sm shadow-amber-500/10">
              <Trophy className="size-3.5 text-amber-400" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300">
                  {secondaryMetricLabel}
                </span>
                <span className="font-mono text-xs font-black text-amber-300">
                  {secondaryMetricValue}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main 2D Grid Canvas */}
      <div className="flex flex-col items-center justify-center overflow-x-auto rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/95 p-6 shadow-inner">
        {matrix.length === 0 ? (
          <span className="font-mono text-sm text-muted-foreground">Empty grid</span>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Column Indices Header with Pointer Badges */}
            <div className="flex gap-2 pl-9">
              {Array.from({ length: cols }, (_, c) => {
                const isColActive = typeof right === "number" && right === c;
                let activeColPointerName: string | null = isColActive ? colPtrLabel : null;

                if (!activeColPointerName && activePointers && typeof activePointers === "object") {
                  for (const [pName, pVal] of Object.entries(activePointers)) {
                    if (pVal === null || pVal === undefined) continue;
                    const lowerP = pName.toLowerCase();
                    if (/^(?:col|c|j|p2)$/.test(lowerP) && Number(pVal) === c) {
                      activeColPointerName = pName;
                      break;
                    }
                  }
                }

                const colStyle = activeColPointerName ? getMarkerStyle(activeColPointerName) : null;

                return (
                  <div
                    key={`col-idx-${c}`}
                    className="relative flex flex-col items-center w-12 text-center"
                  >
                    {activeColPointerName && colStyle && (
                      <span
                        className={`absolute -top-5 rounded px-1.5 py-0.2 font-mono text-[9px] font-black uppercase border shadow-xs ${colStyle.bg} ${colStyle.textCol} ${colStyle.border}`}
                      >
                        {activeColPointerName}
                      </span>
                    )}
                    <span
                      className={`font-mono text-[11px] font-bold transition-colors ${
                        activeColPointerName && colStyle ? `${colStyle.textCol} font-black scale-110` : "text-muted-foreground"
                      }`}
                    >
                      c{c}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid Rows */}
            {matrix.map((row, r) => {
              const isRowActive = typeof left === "number" && left === r;
              let activeRowPointerName: string | null = isRowActive ? rowPtrLabel : null;

              if (!activeRowPointerName && activePointers && typeof activePointers === "object") {
                for (const [pName, pVal] of Object.entries(activePointers)) {
                  if (pVal === null || pVal === undefined) continue;
                  const lowerP = pName.toLowerCase();
                  if (/^(?:row|r|i|p1)$/.test(lowerP) && Number(pVal) === r) {
                    activeRowPointerName = pName;
                    break;
                  }
                }
              }

              const rowStyle = activeRowPointerName ? getMarkerStyle(activeRowPointerName) : null;

              return (
                <div key={`row-${r}`} className="flex items-center gap-2">
                  {/* Row Index Label with Pointer Badge */}
                  <div className="relative flex items-center justify-end w-7 pr-1">
                    {activeRowPointerName && rowStyle && (
                      <span
                        className={`absolute -left-6 rounded px-1 py-0.2 font-mono text-[8px] font-black uppercase border shadow-xs ${rowStyle.bg} ${rowStyle.textCol} ${rowStyle.border}`}
                      >
                        {activeRowPointerName}
                      </span>
                    )}
                    <span
                      className={`font-mono text-[11px] font-bold transition-colors ${
                        activeRowPointerName && rowStyle ? `${rowStyle.textCol} font-black scale-110` : "text-muted-foreground"
                      }`}
                    >
                      r{r}
                    </span>
                  </div>

                  {/* Cells in this row */}
                  {row.slice(0, cols).map((val, c) => {
                    const cellKey = `${r},${c}`;

                    // Strict coordinate matching
                    const isCoordActive =
                      typeof left === "number" && typeof right === "number" && left === r && right === c;
                    const isActive = isCoordActive || currentKey === cellKey;
                    const isTopDependency =
                      typeof left === "number" && typeof right === "number" && left > 0 && r === left - 1 && c === right;
                    const isLeftDependency =
                      typeof left === "number" && typeof right === "number" && right > 0 && r === left && c === right - 1;
                    const isDependencyCell = !isActive && (isTopDependency || isLeftDependency);

                    const isVisited = seenKeys.has(cellKey);
                    const isCurrentActiveIsland =
                      isIslandMode &&
                      (activeIslandSet.has(cellKey) || (isActive && (Number(val) === 1 || isVisited)));

                    const isRawWater = isIslandMode && (Number(val) === 0 || String(val).toLowerCase() === "water");
                    const isWater = isRawWater && !activeIslandSet.has(cellKey);
                    const isLand =
                      isIslandMode &&
                      !isWater &&
                      (Number(val) === 1 || String(val).toLowerCase() === "land" || isVisited || isCurrentActiveIsland);

                    // Collect matching pointer labels for this cell
                    const matchingPointerBadges: { name: string; isMatch?: boolean }[] = [];
                    if (isCoordActive) {
                      matchingPointerBadges.push({
                        name: pointer_labels?.current || `${rowPtrLabel},${colPtrLabel}`,
                      });
                    }

                    if (activePointers && typeof activePointers === "object") {
                      for (const [pName, pVal] of Object.entries(activePointers)) {
                        if (pVal === null || pVal === undefined) continue;
                        const coord = parse2DCoord(pVal);
                        const isCoordMatch = Boolean(coord && coord[0] === r && coord[1] === c);
                        const isFlatMatch = typeof pVal === "number" && pVal === r * cols + c;
                        const isStrMatch =
                          typeof pVal === "string" &&
                          (pVal.replace(/[()[\]\s]/g, "") === `${r},${c}` || pVal === cellKey);

                        if (isCoordMatch || isFlatMatch || isStrMatch) {
                          if (!matchingPointerBadges.some((b) => b.name.toLowerCase() === pName.toLowerCase())) {
                            matchingPointerBadges.push({ name: pName });
                          }
                        }
                      }
                    }

                    if (isActive && !matchingPointerBadges.some((b) => /curr|cell|node/.test(b.name.toLowerCase()))) {
                      matchingPointerBadges.push({
                        name: pointer_labels?.current || "curr",
                      });
                    }

                    // Compute styling classes
                    let cellBgStyle = "border-border/70 bg-card/85 text-foreground hover:border-primary/50 shadow-xs";
                    if (isActive) {
                      cellBgStyle =
                        "border-primary bg-primary text-primary-foreground font-black shadow-lg shadow-primary/40 ring-2 ring-primary/80 z-10 scale-105";
                    } else if (matchingPointerBadges.length > 0) {
                      const firstMarker = getMarkerStyle(matchingPointerBadges[0]!.name);
                      cellBgStyle = `${firstMarker.border} ${firstMarker.bg} ${firstMarker.textCol} font-black shadow-md ring-2 ${firstMarker.ring} z-10 scale-105`;
                    } else if (isDependencyCell) {
                      cellBgStyle = "border-purple-400/70 bg-purple-950/40 text-purple-200 ring-1 ring-purple-400/40";
                    } else if (isIslandMode) {
                      if (isCurrentActiveIsland) {
                        cellBgStyle =
                          "border-emerald-400/80 bg-emerald-500/25 text-emerald-200 font-bold ring-1 ring-emerald-500/40 shadow-xs";
                      } else if (isVisited && isLand) {
                        cellBgStyle =
                          "border-teal-400/80 bg-teal-800/60 text-teal-100 font-bold shadow-sm shadow-teal-900/40 ring-1 ring-teal-400/50";
                      } else if (isLand) {
                        cellBgStyle =
                          "border-amber-400/80 bg-amber-500/25 text-amber-200 font-bold ring-1 ring-amber-500/40 shadow-xs";
                      } else if (isWater) {
                        cellBgStyle = "border-slate-800/80 bg-slate-950/60 text-slate-500/60 hover:bg-slate-900/60";
                      }
                    } else {
                      // Universal Matrix Non-Island Mode
                      if (isVisited) {
                        cellBgStyle = "border-primary/40 bg-primary/10 text-primary font-bold ring-1 ring-primary/20 shadow-xs";
                      } else if (val === 0 || val === "0") {
                        cellBgStyle = "border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold shadow-xs";
                      }
                    }

                    return (
                      <div
                        key={`cell-${r}-${c}`}
                        className={`relative flex size-12 flex-col items-center justify-center rounded-xl border font-mono transition-all duration-300 select-none ${cellBgStyle}`}
                      >
                        {/* Floating Pointer Badges with Accurate Semantic Colors */}
                        {matchingPointerBadges.length > 0 && (
                          <div className="absolute -top-3 z-20 flex gap-0.5 pointer-events-none">
                            {matchingPointerBadges.map((badge, bi) => {
                              const s = getMarkerStyle(badge.name, badge.isMatch);
                              return (
                                <span
                                  key={bi}
                                  className={`rounded px-1.5 py-0.2 font-mono text-[8px] font-black uppercase border shadow-xs ${s.bg} ${s.textCol} ${s.border}`}
                                >
                                  {badge.name.slice(0, 6)}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Active Cell Notification Dot */}
                        {isActive && (
                          <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-primary-foreground" />
                          </span>
                        )}

                        {/* Visited Check Dot */}
                        {isVisited && !isCurrentActiveIsland && !isActive && (
                          <span
                            className="absolute -top-1 -right-1 size-2 rounded-full bg-teal-400 shadow-xs shadow-teal-400/80 ring-1 ring-background"
                            title="Explored / Visited Cell"
                          />
                        )}

                        {/* Coordinate subscript */}
                        <span
                          className={`text-[8px] leading-none mb-0.5 opacity-70 ${
                            isActive
                              ? "text-primary-foreground font-semibold"
                              : isCurrentActiveIsland
                                ? "text-emerald-200 font-medium"
                                : isVisited
                                  ? "text-teal-300"
                                  : "text-muted-foreground"
                          }`}
                        >
                          {r},{c}
                        </span>

                        {/* Value Display (preserves authentic scalar/string values) */}
                        <span className="text-sm font-bold leading-none">
                          {toText(val)}
                        </span>

                        {/* Island Area Dot on Active Island Cells */}
                        {isIslandMode && isCurrentActiveIsland && !isActive && (
                          <span className="absolute -bottom-1 -right-1 size-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/80 ring-1 ring-background" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Visited Set & Coordinates Explorer */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/50 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-0.5">
          <div className="flex items-center gap-1 font-mono font-bold text-muted-foreground text-[11px] shrink-0">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Visited Registry ({visited.length}):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visited.length === 0 ? (
              <span className="font-mono text-muted-foreground/60 italic text-[11px]">
                No cells explored yet
              </span>
            ) : (
              visited.map((v, i) => (
                <span
                  key={`vset-${i}`}
                  className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs transition-all ${
                    currentKey === coordKey(v)
                      ? "border-primary bg-primary/25 text-primary scale-105"
                      : "border-teal-500/50 bg-teal-950/40 text-teal-300"
                  }`}
                >
                  ({coordKey(v)})
                </span>
              ))
            )}
          </div>
        </div>

        {currentKey && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
            <span className="text-muted-foreground">Active Focus:</span>
            <span className="rounded-md border border-primary/40 bg-primary/20 px-2 py-0.5 font-bold text-primary shadow-xs">
              ({currentKey})
            </span>
          </div>
        )}
      </div>

      {/* Visual Legend (Mode-aware) */}
      {isIslandMode ? (
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-border/60 bg-card/30 px-4 py-2 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-slate-800/80 bg-slate-950/60" />
            <span>Water (0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-amber-400/80 bg-amber-500/25 shadow-xs" />
            <span className="text-amber-300 font-bold">Unvisited Land (1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-primary bg-primary shadow-xs" />
            <span className="text-primary font-bold">Active Cell (r, c)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-emerald-400 bg-emerald-500/40 shadow-xs" />
            <span className="text-emerald-400 font-bold">Current Island</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-teal-400/80 bg-teal-800/60 shadow-xs" />
            <span className="text-teal-300 font-bold">Visited Land</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-xl border border-border/60 bg-card/30 px-4 py-2 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-border/70 bg-card/85 shadow-xs" />
            <span>Grid Cell</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-primary bg-primary shadow-xs" />
            <span className="text-primary font-bold">Active Cell (r, c)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-primary/40 bg-primary/10 shadow-xs" />
            <span className="text-primary font-bold">Visited Cell</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-amber-500/40 bg-amber-500/10 shadow-xs" />
            <span className="text-amber-300 font-bold">Zero / Sentinel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-purple-400/70 bg-purple-950/40 shadow-xs" />
            <span className="text-purple-300 font-bold">Dependency Cell</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatrixVisualizer;

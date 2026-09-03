import { useMemo } from "react";
import type { Val } from "./VisualizerTypes";
import { coordKey, safeArray, safeMatrix, toText } from "./VisualizerTypes";
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
  activePointers,
}: MatrixVisualizerProps) {
  const matrix = useMemo(() => safeMatrix(rawMatrix ?? []), [rawMatrix]);

  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const cols = Number(rawCols ?? matrix[0]?.length ?? 1) || 1;
  const rows = matrix.length;

  const currentKey = coordKey(current);

  // Set of all visited coordinates
  const seenKeys = useMemo(() => {
    const s = new Set<string>();
    visited.forEach((item) => {
      const k = coordKey(item);
      if (k) s.add(k);
    });
    return s;
  }, [visited]);

  // Set of cells in the currently active island cluster
  const activeIslandSet = useMemo(() => {
    const s = new Set<string>();
    if (Array.isArray(rawIslandCells) && rawIslandCells.length > 0) {
      rawIslandCells.forEach((c) => {
        const k = coordKey(c);
        if (k) s.add(k);
      });
    }
    return s;
  }, [rawIslandCells]);

  // Calculate total land cells in grid (cells with value 1, seen as visited, or in active island)
  const totalLandCount = useMemo(() => {
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
  }, [matrix, seenKeys, activeIslandSet]);

  // Derive active area and max area metrics
  const activeAreaValue =
    typeof currentArea === "number"
      ? currentArea
      : typeof wSum === "number"
        ? wSum
        : activeIslandSet.size > 0
          ? activeIslandSet.size
          : null;

  const maxAreaValue =
    typeof maxArea === "number" ? maxArea : typeof mSum === "number" ? mSum : activeAreaValue;

  // Normalize direction text for compass widget
  const dirText = String(direction ?? "").toUpperCase();
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

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner: Grid Info, Directional Compass & Live Island Area Readouts */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-sm">
        {/* Left: Grid Dimension & Land Stats */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30 shadow-xs">
            <Layers className="size-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                2D Grid Matrix
              </span>
              <span className="rounded-md border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                {rows} × {cols}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Total Land Cells:{" "}
              <strong className="text-amber-300 font-mono">{totalLandCount}</strong> · Explored:{" "}
              <strong className="text-emerald-400 font-mono">{visited.length}</strong>
            </span>
          </div>
        </div>

        {/* Center: 4-Direction Traversal Compass Widget */}
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

        {/* Right: Island Area & Max Area Badges or OOB Banner */}
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

          {activeAreaValue !== null && !isCurrentOOB && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 shadow-sm shadow-emerald-500/10 animate-sync-glow">
              <Sparkles className="size-3.5 text-emerald-400" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-300">
                  Current Area
                </span>
                <span className="font-mono text-xs font-black text-emerald-300">
                  {activeAreaValue}
                </span>
              </div>
            </div>
          )}

          {maxAreaValue !== null && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 shadow-sm shadow-amber-500/10">
              <Trophy className="size-3.5 text-amber-400" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300">
                  Max Area
                </span>
                <span className="font-mono text-xs font-black text-amber-300">{maxAreaValue}</span>
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
            {/* Column Indices Header */}
            <div className="flex gap-2 pl-9">
              {Array.from({ length: cols }, (_, c) => (
                <div
                  key={`col-idx-${c}`}
                  className="w-12 text-center font-mono text-[11px] font-bold text-muted-foreground"
                >
                  c{c}
                </div>
              ))}
            </div>

            {/* Grid Rows */}
            {matrix.map((row, r) => (
              <div key={`row-${r}`} className="flex items-center gap-2">
                {/* Row Index Label */}
                <span className="w-7 text-right pr-1 font-mono text-[11px] font-bold text-muted-foreground">
                  r{r}
                </span>

                {/* Cells in this row */}
                {row.slice(0, cols).map((val, c) => {
                  const cellKey = `${r},${c}`;

                  // Strict coordinate matching only; never match scalar index numbers to 2D coordinates
                  const isCoordActive = typeof left === "number" && typeof right === "number" && left === r && right === c;
                  const isActive = isCoordActive || currentKey === cellKey;
                  const isTopDependency = typeof left === "number" && typeof right === "number" && left > 0 && r === left - 1 && c === right;
                  const isLeftDependency = typeof left === "number" && typeof right === "number" && right > 0 && r === left && c === right - 1;
                  const isDependencyCell = !isActive && (isTopDependency || isLeftDependency);

                  const isVisited = seenKeys.has(cellKey);
                  const isCurrentActiveIsland =
                    activeIslandSet.has(cellKey) || (isActive && (Number(val) === 1 || isVisited));
                  
                  // Water cells must never mutate into land even when probed by DFS/BFS
                  const isRawWater = Number(val) === 0 || String(val).toLowerCase() === "water";
                  const isWater = isRawWater && !activeIslandSet.has(cellKey);
                  const isLand = !isWater && (
                    Number(val) === 1 ||
                    String(val).toLowerCase() === "land" ||
                    isVisited ||
                    isCurrentActiveIsland
                  );

                  const matchingPointerLabels: string[] = [];
                  if (activePointers && typeof activePointers === "object") {
                    for (const [pName, pVal] of Object.entries(activePointers)) {
                      if (!pVal) continue;
                      if (Array.isArray(pVal) && pVal.length === 2 && Number(pVal[0]) === r && Number(pVal[1]) === c) {
                        matchingPointerLabels.push(pName);
                      } else if (typeof pVal === "string" && (pVal === cellKey || pVal === `${r},${c}`)) {
                        matchingPointerLabels.push(pName);
                      }
                    }
                  }

                  return (
                    <div
                      key={`cell-${r}-${c}`}
                      className={`relative flex size-12 flex-col items-center justify-center rounded-xl border font-mono transition-all duration-300 select-none ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground font-black shadow-lg shadow-primary/40 ring-2 ring-primary/80 z-10 scale-105"
                          : matchingPointerLabels.length > 0
                            ? "border-amber-400 bg-amber-500/30 text-amber-200 font-black shadow-md ring-2 ring-amber-400/80 z-10 scale-105"
                            : isDependencyCell
                              ? "border-purple-400/70 bg-purple-950/40 text-purple-200 ring-1 ring-purple-400/40"
                              : isCurrentActiveIsland
                                ? "border-emerald-400/80 bg-emerald-500/25 text-emerald-200 font-bold hover:border-emerald-300 hover:bg-emerald-500/35 ring-1 ring-emerald-500/40 shadow-xs"
                                : isVisited && isLand
                                  ? "border-teal-400/80 bg-teal-800/60 text-teal-100 font-bold shadow-sm shadow-teal-900/40 ring-1 ring-teal-400/50"
                                  : isLand
                                    ? "border-amber-400/80 bg-amber-500/25 text-amber-200 font-bold hover:border-amber-300 hover:bg-amber-500/35 ring-1 ring-amber-500/40 shadow-xs"
                                    : isWater
                                      ? "border-slate-800/80 bg-slate-950/60 text-slate-500/60 hover:bg-slate-900/60"
                                      : "border-border/60 bg-card/60 text-muted-foreground"
                      }`}
                    >
                      {/* Floating Multi-Pointer Label Badge */}
                      {matchingPointerLabels.length > 0 && !isActive && (
                        <div className="absolute -top-3 z-20 flex gap-0.5 pointer-events-none">
                          {matchingPointerLabels.map((lbl, li) => (
                            <span
                              key={li}
                              className="rounded bg-amber-500 text-slate-950 px-1 py-0.2 font-mono text-[8px] font-black uppercase shadow-xs"
                            >
                              {lbl.slice(0, 5)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Active Cell Notification Dot */}
                      {isActive && (
                        <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-primary-foreground" />
                        </span>
                      )}

                      {/* Explored/Visited Land Check Dot */}
                      {isVisited && !isCurrentActiveIsland && !isActive && (
                        <span
                          className="absolute -top-1 -right-1 size-2.5 rounded-full bg-teal-400 shadow-xs shadow-teal-400/80 ring-1 ring-background"
                          title="Explored / Visited Land Cell"
                        />
                      )}

                      {/* Small coordinate subscript */}
                      <span
                        className={`text-[8px] leading-none mb-0.5 opacity-70 ${
                          isActive
                            ? "text-primary-foreground font-semibold"
                            : isCurrentActiveIsland
                              ? "text-emerald-200 font-medium"
                              : isVisited
                                ? "text-teal-200"
                                : "text-muted-foreground"
                        }`}
                      >
                        {r},{c}
                      </span>

                      {/* Value Display */}
                      <span className="text-sm font-bold leading-none">
                        {isWater ? (
                          <span className="flex items-center gap-0.5 opacity-70">0</span>
                        ) : isVisited || isCurrentActiveIsland ? (
                          <span>1</span>
                        ) : (
                          toText(val)
                        )}
                      </span>

                      {/* Island Area Badge on Active Shaded Island Cells */}
                      {isCurrentActiveIsland && !isActive && (
                        <span className="absolute -bottom-1 -right-1 size-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/80 ring-1 ring-background" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
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

      {/* Visual Legend */}
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
          <span className="text-emerald-400 font-bold">Current Island (DFS Active)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-teal-400/80 bg-teal-800/60 shadow-xs" />
          <span className="text-teal-300 font-bold">Visited Island (Explored)</span>
        </div>
      </div>
    </div>
  );
}

export default MatrixVisualizer;

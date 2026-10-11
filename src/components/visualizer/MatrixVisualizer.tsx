import { useMemo, useRef, useState, useEffect } from "react";
import type { Val } from "./VisualizerTypes";
import { coordKey, parse2DCoord, safeArray, safeMatrix, toText } from "./VisualizerTypes";
import type {
  DirectionRay,
  WaveDistance,
  BacktrackingPathRibbon,
  NQueensConflictRay,
  MatrixRotationOrbit,
  Kernel8Neighbor,
  GridPredecessorArrow,
} from "./VisualizerTypes";
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
  Clock,
  RotateCw,
  Box,
  Footprints,
  Radio,
  Crown,
  AlertTriangle,
  Grid,
  Crosshair,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowDownLeft,
  Undo2,
} from "lucide-react";

export interface MatrixVisualizerProps {
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
  // Enhanced Matrix-specific capabilities
  spiralBounds?: { top: number; bottom: number; left: number; right: number } | null | undefined;
  frontier?: (string | [number, number])[] | null | undefined;
  distanceLayer?: number | null | undefined;
  highlightRows?: number[] | null | undefined;
  highlightCols?: number[] | null | undefined;
  trail?: (string | [number, number])[] | null | undefined;
  rotationLayer?: number | null | undefined;
  // Advanced 2D Matrix Visualizations
  directionRay?: DirectionRay | null | undefined;
  waveDistance?: WaveDistance | null | undefined;
  backtrackingRibbon?: BacktrackingPathRibbon | null | undefined;
  nQueensConflict?: NQueensConflictRay | null | undefined;
  rotationOrbit?: MatrixRotationOrbit | null | undefined;
  kernel8Neighbor?: Kernel8Neighbor | null | undefined;
  predecessorArrows?: GridPredecessorArrow[] | null | undefined;
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
  spiralBounds,
  frontier: rawFrontier,
  distanceLayer,
  highlightRows,
  highlightCols,
  trail: rawTrail,
  rotationLayer,
  directionRay,
  waveDistance,
  backtrackingRibbon,
  nQueensConflict,
  rotationOrbit,
  kernel8Neighbor,
  predecessorArrows,
}: MatrixVisualizerProps) {
  const matrix = useMemo(() => safeMatrix(rawMatrix ?? []), [rawMatrix]);
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const cols = Number(rawCols ?? matrix[0]?.length ?? 1) || 1;
  const rows = matrix.length;

  const parsedCurr = parse2DCoord(current);
  const currentKey = parsedCurr ? `${parsedCurr[0]},${parsedCurr[1]}` : coordKey(current);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [cellLayouts, setCellLayouts] = useState<{
    cellSize: number;
    cellGap: number;
  }>({ cellSize: 48, cellGap: 8 });

  // Update cell dimensions dynamically on resize
  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    setCellLayouts({
      cellSize: isMobile ? 40 : 48,
      cellGap: 8,
    });
  }, []);

  // Set of all visited coordinates
  const seenKeys = useMemo(() => {
    const s = new Set<string>();
    visited.forEach((item) => {
      const parsed = parse2DCoord(item);
      const k = parsed ? `${parsed[0]},${parsed[1]}` : coordKey(item);
      if (k) s.add(k);
    });
    return s;
  }, [visited]);

  // Set of cells in the currently active island cluster
  const activeIslandSet = useMemo(() => {
    const s = new Set<string>();
    if (Array.isArray(rawIslandCells) && rawIslandCells.length > 0) {
      rawIslandCells.forEach((c) => {
        const parsed = parse2DCoord(c);
        const k = parsed ? `${parsed[0]},${parsed[1]}` : coordKey(c);
        if (k) s.add(k);
      });
    }
    return s;
  }, [rawIslandCells]);

  // Set of cells currently on the BFS frontier / queue
  const frontierSet = useMemo(() => {
    const s = new Set<string>();
    if (Array.isArray(rawFrontier)) {
      rawFrontier.forEach((c) => {
        const parsed = parse2DCoord(c);
        const k = parsed ? `${parsed[0]},${parsed[1]}` : coordKey(c);
        if (k) s.add(k);
      });
    }
    return s;
  }, [rawFrontier]);

  // Trail Map: cellKey -> 1-based order index in search path (e.g. Word Search / Backtracking)
  const trailMap = useMemo(() => {
    const map = new Map<string, number>();
    const trailSource = backtrackingRibbon?.path ?? rawTrail;
    if (Array.isArray(trailSource)) {
      trailSource.forEach((c, idx) => {
        const parsed = parse2DCoord(c);
        const k = parsed ? `${parsed[0]},${parsed[1]}` : coordKey(c);
        if (k) map.set(k, idx + 1);
      });
    }
    return map;
  }, [rawTrail, backtrackingRibbon]);

  // Wave distance map: cellKey -> distance
  const waveMap = useMemo(() => {
    const map = new Map<string, number>();
    if (waveDistance?.waveRings) {
      waveDistance.waveRings.forEach((ring) => {
        ring.cells.forEach(([r, c]) => {
          map.set(`${r},${c}`, ring.distance);
        });
      });
    }
    return map;
  }, [waveDistance]);

  // N-Queens attack lines set
  const attackRaySet = useMemo(() => {
    const s = new Set<string>();
    if (nQueensConflict?.attackRays) {
      nQueensConflict.attackRays.forEach((ray) => {
        s.add(`${ray.r},${ray.c}`);
      });
    }
    return s;
  }, [nQueensConflict]);

  // Rotation Orbit 4-tuple keys
  const orbitSet = useMemo(() => {
    const s = new Set<string>();
    if (rotationOrbit?.orbit4) {
      rotationOrbit.orbit4.forEach(([r, c]) => {
        s.add(`${r},${c}`);
      });
    }
    return s;
  }, [rotationOrbit]);

  // Kernel 3x3 8-neighbor cells set
  const kernelSet = useMemo(() => {
    const s = new Set<string>();
    if (kernel8Neighbor?.center) {
      const [cr, cc] = kernel8Neighbor.center;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          s.add(`${cr + dr},${cc + dc}`);
        }
      }
    }
    return s;
  }, [kernel8Neighbor]);

  // Predecessor map: targetCellKey -> PredecessorArrow[]
  const predecessorMap = useMemo(() => {
    const map = new Map<string, GridPredecessorArrow[]>();
    if (predecessorArrows) {
      predecessorArrows.forEach((arrow) => {
        const key = `${arrow.cell[0]},${arrow.cell[1]}`;
        const existing = map.get(key) ?? [];
        existing.push(arrow);
        map.set(key, existing);
      });
    }
    return map;
  }, [predecessorArrows]);

  // Highlighted Rows & Columns sets (for Set Matrix Zeroes)
  const rowHighlightSet = useMemo(() => new Set(highlightRows ?? []), [highlightRows]);
  const colHighlightSet = useMemo(() => new Set(highlightCols ?? []), [highlightCols]);

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
  const dirText = String(directionRay?.direction ?? direction ?? "").toUpperCase();
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

  const isIslandMode = useMemo(() => {
    if (
      activeIslandSet.size > 0 ||
      rawIslandCells !== undefined ||
      typeof currentArea === "number" ||
      typeof maxArea === "number"
    ) {
      return true;
    }
    // Check if matrix is binary (0/1), representing an island or binary grid
    if (matrix.length > 0 && matrix[0]?.length) {
      let isBinary = true;
      for (let r = 0; r < matrix.length; r++) {
        const row = matrix[r];
        if (!row || row.length === 0) continue;
        for (let c = 0; c < row.length; c++) {
          const val = row[c];
          const num = Number(val);
          const str = String(val).toLowerCase().trim();
          if (
            str !== "0" &&
            str !== "1" &&
            num !== 0 &&
            num !== 1 &&
            str !== "water" &&
            str !== "land"
          ) {
            isBinary = false;
            break;
          }
        }
        if (!isBinary) break;
      }
      if (isBinary) return true;
    }
    return false;
  }, [activeIslandSet.size, rawIslandCells, currentArea, maxArea, matrix]);

  // Mode determination for contextual banner
  const modeTitle = useMemo(() => {
    if (nQueensConflict) return "N-Queens Line-of-Sight Conflict Ray";
    if (rotationOrbit) return `Matrix 4-Way Orbit Rotation (Ring ${rotationOrbit.ringLayer})`;
    if (kernel8Neighbor) return "3×3 Cellular Kernel / Game of Life";
    if (backtrackingRibbon) return "Backtracking Path / Word Search Ribbon";
    if (directionRay) return "2D Directional Raycast Probe";
    if (waveDistance || typeof distanceLayer === "number" || frontierSet.size > 0)
      return "Multi-Source Wave BFS";
    if (predecessorArrows && predecessorArrows.length > 0) return "2D DP Optimal Path Backpointer";
    if (spiralBounds) return "Spiral Matrix Boundary Peeling";
    if (typeof rotationLayer === "number") return `Matrix Rotation (Layer ${rotationLayer})`;
    if (trailMap.size > 0) return "Grid Path / Word Search Traversal";
    if (rowHighlightSet.size > 0 || colHighlightSet.size > 0) return "Matrix Zero In-Place Marker";
    if (isIslandMode) return "2D Island Connected Component";
    return "2D Matrix Grid";
  }, [
    nQueensConflict,
    rotationOrbit,
    kernel8Neighbor,
    backtrackingRibbon,
    directionRay,
    waveDistance,
    distanceLayer,
    frontierSet.size,
    predecessorArrows,
    spiralBounds,
    rotationLayer,
    trailMap.size,
    rowHighlightSet.size,
    colHighlightSet.size,
    isIslandMode,
  ]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner: Grid Info, Directional Compass, Spiral Bounds & Live Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-sm">
        {/* Left: Grid Dimension & Stats */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30 shadow-xs">
            {nQueensConflict ? (
              <Crown className="size-5 text-amber-400" />
            ) : rotationOrbit || typeof rotationLayer === "number" ? (
              <RotateCw className="size-5 text-purple-400" />
            ) : kernel8Neighbor ? (
              <Crosshair className="size-5 text-emerald-400" />
            ) : backtrackingRibbon || trailMap.size > 0 ? (
              <Footprints className="size-5 text-amber-400" />
            ) : directionRay ? (
              <Compass className="size-5 text-sky-400" />
            ) : waveDistance || typeof distanceLayer === "number" || frontierSet.size > 0 ? (
              <Radio className="size-5 text-cyan-400" />
            ) : spiralBounds ? (
              <Box className="size-5 text-indigo-400" />
            ) : (
              <Layers className="size-5 text-primary" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                {modeTitle}
              </span>
              <span className="rounded-md border border-border/70 bg-background/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                {rows} × {cols}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {nQueensConflict ? (
                <>
                  Queen at:{" "}
                  <strong className="text-amber-300 font-mono">
                    ({nQueensConflict.queenPos[0]}, {nQueensConflict.queenPos[1]})
                  </strong>{" "}
                  · Conflict:{" "}
                  <strong className="text-rose-400 font-mono">
                    {nQueensConflict.conflictCell
                      ? `(${nQueensConflict.conflictCell[0]}, ${nQueensConflict.conflictCell[1]})`
                      : "None (Safe)"}
                  </strong>
                </>
              ) : rotationOrbit ? (
                <>
                  Orbit Layer:{" "}
                  <strong className="text-purple-300 font-mono">
                    {rotationOrbit.ringLayer}
                  </strong>{" "}
                  · Cycle Step:{" "}
                  <strong className="text-amber-300 font-mono">
                    {rotationOrbit.activeCycleStep ?? 1} / 4
                  </strong>
                </>
              ) : kernel8Neighbor ? (
                <>
                  Center:{" "}
                  <strong className="text-emerald-300 font-mono">
                    ({kernel8Neighbor.center[0]}, {kernel8Neighbor.center[1]})
                  </strong>{" "}
                  · Live Neighbors:{" "}
                  <strong className="text-cyan-300 font-mono">
                    {kernel8Neighbor.aliveCount}
                  </strong>
                </>
              ) : backtrackingRibbon ? (
                <>
                  Path Depth:{" "}
                  <strong className="text-amber-300 font-mono">
                    {backtrackingRibbon.path.length}
                  </strong>{" "}
                  · Word:{" "}
                  <strong className="text-emerald-300 font-mono">
                    {backtrackingRibbon.wordSoFar || "—"}
                  </strong>
                </>
              ) : isIslandMode ? (
                <>
                  Total Land: <strong className="text-amber-300 font-mono">{totalLandCount}</strong>{" "}
                  · Explored: <strong className="text-emerald-400 font-mono">{visited.length}</strong>
                </>
              ) : trailMap.size > 0 ? (
                <>
                  Path Depth: <strong className="text-amber-300 font-mono">{trailMap.size}</strong>{" "}
                  · Visited: <strong className="text-sky-300 font-mono">{visited.length}</strong>
                </>
              ) : typeof distanceLayer === "number" || waveDistance ? (
                <>
                  Wave Distance:{" "}
                  <strong className="text-cyan-300 font-mono">
                    {waveDistance?.currentDistance ?? distanceLayer ?? 0}
                  </strong>{" "}
                  · Frontier:{" "}
                  <strong className="text-amber-300 font-mono">
                    {waveDistance?.frontierCount ?? frontierSet.size}
                  </strong>
                </>
              ) : (
                <>
                  Total Cells:{" "}
                  <strong className="text-primary font-mono">{rows * cols}</strong> · Processed:{" "}
                  <strong className="text-emerald-400 font-mono">{visited.length}</strong>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Center: Contextual Widgets */}
        {directionRay ? (
          <div className="flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-3 py-1.5 shadow-inner font-mono text-xs">
            <Compass className="size-4 text-sky-400 shrink-0" />
            <span className="text-sky-300 font-bold">Probe Ray:</span>
            <span className="bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded border border-sky-500/30 font-bold">
              ({directionRay.from[0]},{directionRay.from[1]}) → ({directionRay.to[0]},
              {directionRay.to[1]}) [{directionRay.direction}]
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                directionRay.status === "valid"
                  ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50"
                  : directionRay.status === "wall"
                    ? "bg-rose-500/30 text-rose-300 border border-rose-500/50"
                    : directionRay.status === "oob"
                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/50"
                      : "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
              }`}
            >
              {directionRay.status}
            </span>
          </div>
        ) : spiralBounds ? (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/30 px-3 py-1.5 shadow-inner font-mono text-[11px]">
            <span className="text-indigo-300 font-semibold uppercase tracking-wider text-[10px]">
              Bounds:
            </span>
            <span className="bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold">
              top: {spiralBounds.top}
            </span>
            <span className="bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold">
              bottom: {spiralBounds.bottom}
            </span>
            <span className="bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold">
              left: {spiralBounds.left}
            </span>
            <span className="bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-500/30 font-bold">
              right: {spiralBounds.right}
            </span>
          </div>
        ) : typeof distanceLayer === "number" || waveDistance ? (
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-3 py-1.5 shadow-inner font-mono text-xs text-cyan-200">
            <Clock className="size-4 text-cyan-400 shrink-0" />
            <span>Wave Distance:</span>
            <span className="font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40">
              d = {waveDistance?.currentDistance ?? distanceLayer ?? 0}
            </span>
            {(waveDistance?.frontierCount ?? frontierSet.size) > 0 && (
              <span className="text-[10px] text-cyan-400/80">
                ({waveDistance?.frontierCount ?? frontierSet.size} active in wave)
              </span>
            )}
          </div>
        ) : isIslandMode ? (
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
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 shadow-inner font-mono text-xs">
            <span className="text-muted-foreground text-[11px]">Loop Focus:</span>
            {currentKey ? (
              <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/30">
                matrix[{currentKey}]
              </span>
            ) : (
              <span className="text-muted-foreground/60 italic">Scanning complete</span>
            )}
          </div>
        )}

        {/* Right: Live Metrics Badges */}
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

          {isIslandMode && activeAreaValue !== null && !isCurrentOOB && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-1.5 shadow-sm shadow-emerald-500/10 animate-sync-glow">
              <Sparkles className="size-3.5 text-emerald-400" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-300">
                  {typeof currentArea === "number" ? "Current Area" : "Active Island"}
                </span>
                <span className="font-mono text-xs font-black text-emerald-300">
                  {activeAreaValue}
                </span>
              </div>
            </div>
          )}

          {isIslandMode && maxAreaValue !== null && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 shadow-sm shadow-amber-500/10">
              <Trophy className="size-3.5 text-amber-400" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-300">
                  {typeof maxArea === "number" ? "Max Area" : "Total Islands"}
                </span>
                <span className="font-mono text-xs font-black text-amber-300">{maxAreaValue}</span>
              </div>
            </div>
          )}

          {!isIslandMode && currentKey && !isCurrentOOB && (
            <div className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 shadow-sm">
              <div className="flex flex-col text-right font-mono">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
                  Active Coordinate
                </span>
                <span className="text-xs font-black text-primary">({currentKey})</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backtracking Ribbon / Word Search Progress Sub-bar */}
      {backtrackingRibbon && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/20 px-4 py-3 text-xs font-mono backdrop-blur-sm animate-fade">
          <div className="flex items-center gap-2">
            <span className="text-amber-300 uppercase text-[11px] font-bold flex items-center gap-1.5">
              <Footprints className="size-4 text-amber-400" />
              Word Search Path:
            </span>
            <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 rounded-lg">
              {(backtrackingRibbon.targetWord ?? "")
                .split("")
                .map((ch: string, charIdx: number) => {
                  const isMatched =
                    backtrackingRibbon.wordSoFar &&
                    charIdx < backtrackingRibbon.wordSoFar.length;
                  return (
                    <span
                      key={`w-ch-${charIdx}`}
                      className={`size-6 flex items-center justify-center rounded text-xs font-black transition-all ${
                        isMatched
                          ? "bg-emerald-500 text-white shadow-xs scale-105 ring-1 ring-emerald-400"
                          : "bg-muted/40 text-muted-foreground/60 border border-border/40"
                      }`}
                    >
                      {ch}
                    </span>
                  );
                })}
            </div>
          </div>

          {backtrackingRibbon.retractedNode && (
            <div className="flex items-center gap-1.5 text-rose-300 font-bold bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/40">
              <Undo2 className="size-3.5 text-rose-400" />
              <span>
                Backtracked from ({backtrackingRibbon.retractedNode[0]},
                {backtrackingRibbon.retractedNode[1]})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Rotation 4-Way Orbit Sub-bar */}
      {rotationOrbit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-500/40 bg-purple-950/20 px-4 py-3 text-xs font-mono backdrop-blur-sm animate-fade">
          <div className="flex items-center gap-2">
            <span className="text-purple-300 uppercase text-[11px] font-bold flex items-center gap-1.5">
              <RotateCw className="size-4 text-purple-400" />
              4-Cell In-Place Cycle:
            </span>
            <div className="flex items-center gap-1.5">
              {rotationOrbit.orbit4.map(([r, c], idx) => {
                const labels = ["TOP", "RIGHT", "BOTTOM", "LEFT"];
                const val = rotationOrbit.orbitValues?.[idx] ?? matrix[r]?.[c] ?? "-";
                const isStepActive = (rotationOrbit.activeCycleStep ?? 1) - 1 === idx;
                return (
                  <div key={`orb-${idx}`} className="flex items-center gap-1">
                    <div
                      className={`flex flex-col items-center px-2 py-0.5 rounded-lg border transition-all ${
                        isStepActive
                          ? "border-amber-400 bg-amber-500 text-slate-950 font-black scale-105 shadow-md ring-2 ring-amber-300"
                          : "border-purple-500/40 bg-purple-950/40 text-purple-200"
                      }`}
                    >
                      <span className="text-[9px] uppercase opacity-80">{labels[idx]} ({r},{c})</span>
                      <span className="font-bold text-xs">{String(val)}</span>
                    </div>
                    {idx < 3 && <span className="text-purple-400 font-bold">→</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <span className="text-[11px] text-purple-300 font-semibold">
            Clockwise Orbit: (r, c) → (c, n-1-r) → (n-1-r, n-1-c) → (n-1-c, r)
          </span>
        </div>
      )}

      {/* Cellular Automata Kernel Sub-bar (Game of Life) */}
      {kernel8Neighbor && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 px-4 py-3 text-xs font-mono backdrop-blur-sm animate-fade">
          <div className="flex items-center gap-2">
            <Crosshair className="size-4 text-emerald-400" />
            <span className="text-emerald-300 uppercase text-[11px] font-bold">
              3×3 Kernel Rule:
            </span>
            <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg font-bold">
              {kernel8Neighbor.ruleTriggered || `Live Neighbors = ${kernel8Neighbor.aliveCount}`}
            </span>
          </div>
          {kernel8Neighbor.nextState !== undefined && (
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
              <span>Next State:</span>
              <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-cyan-200">
                {String(kernel8Neighbor.nextState)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main 2D Grid Canvas */}
      <div
        ref={gridContainerRef}
        className="relative flex flex-col items-center justify-center overflow-x-auto rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/95 p-6 shadow-inner"
      >
        {matrix.length === 0 ? (
          <span className="font-mono text-sm text-muted-foreground">Empty grid</span>
        ) : (() => {
          let maxCellChars = 3;
          for (const r of matrix) {
            for (const cellVal of r.slice(0, cols)) {
              const s = cellVal !== undefined && cellVal !== null ? toText(cellVal) : "";
              if (s.length > maxCellChars) maxCellChars = s.length;
            }
          }
          const dynamicCellWidthPx = Math.max(48, Math.min(160, maxCellChars * 8 + 22));
          return (
          <div className="flex flex-col gap-2">
            {/* Column Indices Header */}
            <div className="flex gap-2 pl-9">
              {Array.from({ length: cols }, (_, c) => {
                const isColMarked = colHighlightSet.has(c);
                const isColInSpiral = spiralBounds
                  ? c >= spiralBounds.left && c <= spiralBounds.right
                  : false;
                const isQueenCol = nQueensConflict?.queenPos[1] === c;
                return (
                  <div
                    key={`col-idx-${c}`}
                    style={{ width: `${dynamicCellWidthPx}px` }}
                    className={`shrink-0 text-center font-mono text-[11px] font-bold transition-all ${
                      isColMarked
                        ? "text-rose-400 font-black scale-110"
                        : isQueenCol
                          ? "text-amber-400 font-black"
                          : isColInSpiral
                            ? "text-indigo-300"
                            : "text-muted-foreground"
                    }`}
                  >
                    c{c}
                  </div>
                );
              })}
            </div>

            {/* Grid Rows */}
            {matrix.map((row, r) => {
              const isRowMarked = rowHighlightSet.has(r);
              const isRowInSpiral = spiralBounds
                ? r >= spiralBounds.top && r <= spiralBounds.bottom
                : false;
              const isQueenRow = nQueensConflict?.queenPos[0] === r;

              return (
                <div key={`row-${r}`} className="flex items-center gap-2">
                  {/* Row Index Label */}
                  <span
                    className={`w-7 shrink-0 text-right pr-1 font-mono text-[11px] font-bold transition-all ${
                      isRowMarked
                        ? "text-rose-400 font-black scale-110"
                        : isQueenRow
                          ? "text-amber-400 font-black"
                          : isRowInSpiral
                            ? "text-indigo-300"
                            : "text-muted-foreground"
                    }`}
                  >
                    r{r}
                  </span>

                  {/* Cells in this row */}
                  {row.slice(0, cols).map((val, c) => {
                    const cellKey = `${r},${c}`;

                    // Strict coordinate matching
                    const numLeft =
                      typeof left === "number"
                        ? left
                        : typeof left === "string" && !isNaN(Number(left))
                          ? Number(left)
                          : null;
                    const numRight =
                      typeof right === "number"
                        ? right
                        : typeof right === "string" && !isNaN(Number(right))
                          ? Number(right)
                          : null;
                    const isCoordActive =
                      numLeft !== null && numRight !== null && numLeft === r && numRight === c;
                    const isActive = isCoordActive || currentKey === cellKey;
                    const isTopDependency =
                      numLeft !== null &&
                      numRight !== null &&
                      numLeft > 0 &&
                      r === numLeft - 1 &&
                      c === numRight;
                    const isLeftDependency =
                      numLeft !== null &&
                      numRight !== null &&
                      numRight > 0 &&
                      r === numLeft &&
                      c === numRight - 1;
                    const isDependencyCell = !isActive && (isTopDependency || isLeftDependency);

                    const isVisited = seenKeys.has(cellKey);
                    const isFrontier = frontierSet.has(cellKey);
                    const trailIdx = trailMap.get(cellKey);
                    const isInTrail = trailIdx !== undefined;
                    const isMarkedZero = isRowMarked || colHighlightSet.has(c);

                    // Wave BFS Ring distance
                    const cellWaveDist = waveMap.get(cellKey);
                    const isWaveCell = cellWaveDist !== undefined;

                    // Advanced overlays
                    const isQueen =
                      nQueensConflict &&
                      nQueensConflict.queenPos[0] === r &&
                      nQueensConflict.queenPos[1] === c;
                    const isQueenAttackRay = attackRaySet.has(cellKey);
                    const isConflictCell =
                      nQueensConflict?.conflictCell &&
                      nQueensConflict.conflictCell[0] === r &&
                      nQueensConflict.conflictCell[1] === c;

                    const isOrbitCell = orbitSet.has(cellKey);
                    const isKernelCell = kernelSet.has(cellKey);
                    const isKernelCenter =
                      kernel8Neighbor &&
                      kernel8Neighbor.center[0] === r &&
                      kernel8Neighbor.center[1] === c;

                    const isDirectionRayTarget =
                      directionRay &&
                      directionRay.to[0] === r &&
                      directionRay.to[1] === c;
                    const isDirectionRaySource =
                      directionRay &&
                      directionRay.from[0] === r &&
                      directionRay.from[1] === c;

                    const isRetractedBacktrack =
                      backtrackingRibbon?.retractedNode &&
                      backtrackingRibbon.retractedNode[0] === r &&
                      backtrackingRibbon.retractedNode[1] === c;

                    const cellPredecessors = predecessorMap.get(cellKey);

                    const isCurrentActiveIsland =
                      activeIslandSet.has(cellKey) || (isActive && (Number(val) === 1 || isVisited));

                    // Water cells in island mode
                    const isRawWater =
                      Number(val) === 0 ||
                      String(val).toLowerCase() === "0" ||
                      String(val).toLowerCase() === "water";
                    const isWater = isIslandMode && isRawWater && !activeIslandSet.has(cellKey);
                    const isLand =
                      isIslandMode &&
                      !isWater &&
                      (Number(val) === 1 ||
                        String(val).toLowerCase() === "1" ||
                        String(val).toLowerCase() === "land" ||
                        isVisited ||
                        isCurrentActiveIsland);

                    // Grid BFS entities (e.g. Rotting Oranges / Walls & Gates)
                    const isRottenOrange =
                      val === 2 ||
                      String(val).toLowerCase() === "rotten" ||
                      String(val).toLowerCase() === "2";
                    const isWall =
                      val === -1 ||
                      String(val).toLowerCase() === "wall" ||
                      String(val).toLowerCase() === "-1" ||
                      String(val) === "INF" ||
                      String(val) === "2147483647";

                    // Spiral bounds perimeter check
                    const isSpiralPerimeter =
                      spiralBounds &&
                      r >= spiralBounds.top &&
                      r <= spiralBounds.bottom &&
                      c >= spiralBounds.left &&
                      c <= spiralBounds.right &&
                      (r === spiralBounds.top ||
                        r === spiralBounds.bottom ||
                        c === spiralBounds.left ||
                        c === spiralBounds.right);

                    // For general matrix transformations:
                    const isNegativeSentinel = !isIslandMode && typeof val === "number" && val < 0;
                    const isZeroVal = !isIslandMode && (val === 0 || val === "0");

                    return (
                      <div
                        key={`cell-${r}-${c}`}
                        style={{ width: `${dynamicCellWidthPx}px` }}
                        className={`relative flex min-h-12 shrink-0 px-1.5 py-1 flex-col items-center justify-center rounded-xl border font-mono whitespace-nowrap transition-all duration-300 select-none ${
                          isQueen
                            ? "z-20 scale-110 border-amber-400 bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/50 ring-4 ring-amber-300 font-black animate-bounce-short"
                            : isConflictCell
                              ? "z-20 scale-110 border-rose-500 bg-rose-600 text-white shadow-xl shadow-rose-500/60 ring-4 ring-rose-400 font-black animate-pulse"
                              : isRetractedBacktrack
                                ? "z-20 scale-105 border-rose-500 bg-rose-500/30 text-rose-200 shadow-lg shadow-rose-500/40 ring-2 ring-rose-400 font-bold"
                                : isOrbitCell
                                  ? "z-20 scale-105 border-purple-400 bg-purple-600/40 text-purple-100 shadow-lg shadow-purple-500/40 ring-2 ring-purple-300 font-black"
                                  : isKernelCenter
                                    ? "z-20 scale-110 border-emerald-400 bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/50 ring-4 ring-emerald-300 font-black"
                                    : isDirectionRayTarget
                                      ? directionRay?.status === "valid"
                                        ? "z-20 scale-105 border-emerald-400 bg-emerald-500/30 text-emerald-100 ring-2 ring-emerald-400 font-bold"
                                        : directionRay?.status === "wall"
                                          ? "z-20 scale-105 border-rose-500 bg-rose-500/30 text-rose-100 ring-2 ring-rose-400 font-bold"
                                          : "z-20 scale-105 border-sky-400 bg-sky-500/30 text-sky-100 ring-2 ring-sky-300 font-bold"
                                      : isDirectionRaySource
                                        ? "z-20 scale-105 border-sky-400 bg-sky-600/40 text-white ring-2 ring-sky-300 font-black"
                                        : isActive
                                          ? isWater
                                            ? "z-20 scale-110 border-amber-400 bg-amber-500/30 text-amber-200 shadow-xl shadow-amber-500/40 ring-4 ring-amber-400/40 font-black animate-bounce-short"
                                            : "z-20 scale-110 border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/50 ring-4 ring-primary/40 font-black animate-bounce-short"
                                          : isQueenAttackRay
                                            ? "border-amber-500/40 bg-amber-950/25 text-amber-200/80 ring-1 ring-amber-500/30"
                                            : isFrontier
                                              ? "z-10 border-cyan-400 bg-cyan-500/30 text-cyan-100 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/70 font-bold scale-[1.04] animate-pulse"
                                              : isInTrail
                                                ? "z-10 border-amber-400 bg-amber-500/35 text-amber-100 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/80 font-black scale-[1.03]"
                                                : isKernelCell
                                                  ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-200 ring-1 ring-emerald-400/40"
                                                  : isWaveCell
                                                    ? "border-cyan-500/60 bg-cyan-950/30 text-cyan-200 font-bold ring-1 ring-cyan-400/40 shadow-xs"
                                                    : isRottenOrange && !isIslandMode
                                                      ? "border-orange-500/80 bg-orange-600/30 text-orange-200 font-bold ring-1 ring-orange-500/50 shadow-sm"
                                                      : isDependencyCell
                                                        ? "z-10 border-indigo-400/90 bg-indigo-500/25 text-indigo-200 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/50 font-bold scale-[1.03]"
                                                        : isIslandMode && isCurrentActiveIsland
                                                          ? "z-10 border-emerald-400 bg-gradient-to-br from-emerald-500/40 via-emerald-600/35 to-teal-500/30 text-emerald-100 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/80 font-bold scale-[1.03]"
                                                          : isIslandMode && isVisited
                                                            ? "border-teal-400/80 bg-teal-800/60 text-teal-100 font-bold shadow-sm shadow-teal-900/40 ring-1 ring-teal-400/50"
                                                            : isIslandMode && isLand
                                                              ? "border-amber-400/80 bg-amber-500/25 text-amber-200 font-bold hover:border-amber-300 hover:bg-amber-500/35 ring-1 ring-amber-500/40 shadow-xs"
                                                              : isIslandMode && isWater
                                                                ? "border-slate-800/80 bg-slate-950/60 text-slate-500/60 hover:bg-slate-900/60"
                                                                : isMarkedZero
                                                                  ? "border-rose-500/60 bg-rose-950/40 text-rose-300 font-semibold ring-1 ring-rose-500/40"
                                                                  : isSpiralPerimeter
                                                                    ? "border-indigo-400/70 bg-indigo-950/30 text-indigo-200 font-semibold ring-1 ring-indigo-400/30"
                                                                    : isNegativeSentinel
                                                                      ? "z-10 border-amber-400 bg-amber-500/25 text-amber-200 font-bold ring-1 ring-amber-400/50 shadow-xs scale-[1.02]"
                                                                      : isVisited
                                                                        ? "border-sky-500/50 bg-sky-950/25 text-sky-200 font-medium ring-1 ring-sky-500/30"
                                                                        : "border-border/60 bg-card/60 text-muted-foreground hover:border-border"
                        }`}
                      >
                        {/* Queen Icon */}
                        {isQueen && (
                          <Crown className="size-5 text-slate-950 drop-shadow-xs" />
                        )}

                        {/* Conflict Alert Icon */}
                        {isConflictCell && (
                          <ShieldAlert className="size-5 text-white animate-bounce-short" />
                        )}

                        {/* Active Cell Notification Dot */}
                        {isActive && !isQueen && !isConflictCell && (
                          <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-primary-foreground" />
                          </span>
                        )}

                        {/* Trail Order Index Badge (Word Search / Path) */}
                        {isInTrail && (
                          <span className="absolute -top-1.5 -left-1.5 flex size-4 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-[9px] font-black shadow-xs ring-1 ring-background">
                            {trailIdx}
                          </span>
                        )}

                        {/* Wave Ring Badge */}
                        {isWaveCell && !isInTrail && !isActive && (
                          <span className="absolute -top-1 -left-1 flex size-3.5 items-center justify-center rounded-full bg-cyan-500 text-slate-950 text-[8px] font-black shadow-xs">
                            d{cellWaveDist}
                          </span>
                        )}

                        {/* BFS Frontier Wave Indicator */}
                        {isFrontier && !isActive && (
                          <span className="absolute -top-1 -right-1 flex size-2.5 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-cyan-300" />
                          </span>
                        )}

                        {/* Predecessor DP Arrow indicator */}
                        {cellPredecessors && cellPredecessors.length > 0 && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                            {cellPredecessors.map((p, pIdx) => (
                              <span
                                key={`dp-p-${pIdx}`}
                                className="bg-indigo-500 text-white rounded-full p-0.5 text-[8px] font-black shadow-xs"
                              >
                                {p.direction === "top" ? (
                                  <ArrowDown className="size-2.5" />
                                ) : p.direction === "left" ? (
                                  <ArrowRight className="size-2.5" />
                                ) : (
                                  <ArrowDownRight className="size-2.5" />
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Explored/Visited Land Check Dot */}
                        {isVisited &&
                          !isCurrentActiveIsland &&
                          !isActive &&
                          !isInTrail &&
                          !isQueen &&
                          !isConflictCell && (
                            <span
                              className={`absolute -top-1 -right-1 size-2.5 rounded-full shadow-xs ring-1 ring-background ${
                                isIslandMode
                                  ? "bg-teal-400 shadow-teal-400/80"
                                  : "bg-sky-400 shadow-sky-400/80"
                              }`}
                              title="Explored / Visited Cell"
                            />
                          )}

                        {/* Small coordinate subscript */}
                        <span
                          className={`text-[8px] leading-none mb-0.5 font-mono ${
                            isQueen
                              ? "text-slate-900 font-bold"
                              : isActive
                                ? "text-primary-foreground font-bold drop-shadow-xs"
                                : isFrontier
                                  ? "text-cyan-200 font-semibold"
                                  : isInTrail
                                    ? "text-amber-200 font-semibold"
                                    : isCurrentActiveIsland
                                      ? "text-emerald-200 font-medium"
                                      : isVisited
                                        ? isIslandMode
                                          ? "text-teal-200"
                                          : "text-sky-200"
                                        : "text-muted-foreground/80"
                          }`}
                        >
                          {r},{c}
                        </span>

                        {/* Value Display with High-Contrast Color Pairings */}
                        {!isQueen && (
                          <span className="text-sm font-black leading-none drop-shadow-xs">
                            {isIslandMode ? (
                              isWater ? (
                                <span
                                  className={
                                    isActive
                                      ? "text-amber-200 font-black"
                                      : "text-slate-400/70 font-semibold"
                                  }
                                >
                                  0
                                </span>
                              ) : isCurrentActiveIsland ? (
                                <span
                                  className={
                                    isActive
                                      ? "text-primary-foreground font-black"
                                      : "text-emerald-100 font-black"
                                  }
                                >
                                  {val !== undefined && val !== null ? toText(val) : "1"}
                                </span>
                              ) : isVisited ? (
                                <span className="text-teal-100 font-black">
                                  {val !== undefined && val !== null ? toText(val) : "1"}
                                </span>
                              ) : isLand ? (
                                <span className="text-amber-100 font-black">
                                  {val !== undefined && val !== null ? toText(val) : "1"}
                                </span>
                              ) : (
                                toText(val)
                              )
                            ) : (
                              <span
                                className={
                                  isActive
                                    ? "text-primary-foreground font-black"
                                    : isConflictCell
                                      ? "text-white font-black"
                                      : isFrontier
                                        ? "text-cyan-100 font-black"
                                        : isInTrail
                                          ? "text-amber-100 font-black"
                                          : isNegativeSentinel
                                            ? "text-amber-300 font-black"
                                            : isZeroVal || isMarkedZero
                                              ? "text-rose-200 font-black"
                                              : isSpiralPerimeter
                                                ? "text-indigo-100 font-black"
                                                : isVisited
                                                  ? "text-sky-100 font-bold"
                                                  : "text-foreground font-bold"
                                }
                              >
                                {toText(val)}
                              </span>
                            )}
                          </span>
                        )}

                        {/* Island Area Badge on Active Shaded Island Cells */}
                        {isCurrentActiveIsland && !isActive && (
                          <span className="absolute -bottom-1 -right-1 size-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/80 ring-1 ring-background" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          );
        })()}
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
        {isIslandMode ? (
          <>
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
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded border border-primary bg-primary shadow-xs" />
              <span className="text-primary font-bold">Active Focus (r, c)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded border border-cyan-400 bg-cyan-500/30 shadow-xs" />
              <span className="text-cyan-300 font-bold">Frontier / Wave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded border border-amber-400 bg-amber-500/35 shadow-xs" />
              <span className="text-amber-300 font-bold">Search Path / Trail</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded border border-sky-500/50 bg-sky-950/25 shadow-xs" />
              <span className="text-sky-300 font-bold">Scanned (Visited)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded border border-rose-500/60 bg-rose-950/30 shadow-xs" />
              <span className="text-rose-300 font-bold">Zero / Marked (0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded border border-border/60 bg-card/60" />
              <span>Standard Value</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MatrixVisualizer;

import React, { useMemo } from "react";
import type { Val, MarkerStyle } from "./VisualizerTypes";
import { coordKey, safeArray, safeMatrix, toText, getMarkerStyle } from "./VisualizerTypes";
import { Table, ArrowDownRight, ArrowDown, ArrowRight, Sparkles, CheckCircle } from "lucide-react";

interface DpTableVisualizerProps {
  matrix?: Val[][] | null | undefined;
  cols?: number | null | undefined;
  left?: number | null | undefined;
  right?: number | null | undefined;
  left2?: number | null | undefined;
  right2?: number | null | undefined;
  current: Val | null | undefined;
  visited: Val[];
  rowLabels?: string[] | null | undefined;
  colLabels?: string[] | null | undefined;
  direction?: string | null | undefined;
  wSum?: number | null | undefined;
  mSum?: number | null | undefined;
  pointer_labels?: Record<string, string> | null;
  activePointers?: Record<string, number | string | [number, number] | null> | null;
}

export function DpTableVisualizer({
  matrix: rawMatrix,
  cols: rawCols,
  left,
  right,
  left2,
  right2,
  current,
  visited: rawVisited,
  rowLabels,
  colLabels,
  direction,
  wSum,
  mSum,
  pointer_labels,
  activePointers,
}: DpTableVisualizerProps) {

  const matrix = useMemo(() => safeMatrix(rawMatrix ?? []), [rawMatrix]);
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const cols = Number(rawCols ?? matrix[0]?.length ?? 1) || 1;
  const rows = matrix.length;

  const activePointerEntries = useMemo(() => {
    if (!activePointers || typeof activePointers !== "object") return [];
    return Object.entries(activePointers).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
  }, [activePointers]);

  const currentKey = coordKey(current);

  // Parse active row and column from left/right or currentKey
  const activeCoord = useMemo<{ r: number; c: number } | null>(() => {
    if (typeof left === "number" && typeof right === "number" && !isNaN(left) && !isNaN(right)) {
      return { r: left, c: right };
    }
    if (typeof left === "number" && typeof left2 === "number" && !isNaN(left) && !isNaN(left2)) {
      return { r: left, c: left2 };
    }
    if (currentKey && currentKey.includes(",")) {
      const [rStr, cStr] = currentKey.split(",");
      const r = parseInt(rStr ?? "", 10);
      const c = parseInt(cStr ?? "", 10);
      if (!isNaN(r) && !isNaN(c)) return { r, c };
    }
    return null;
  }, [left, right, left2, currentKey]);

  const currentCellKey = activeCoord ? `${activeCoord.r},${activeCoord.c}` : currentKey;

  const seenKeys = useMemo(() => {
    const s = new Set<string>();
    visited.forEach((item) => {
      const k = coordKey(item);
      if (k && k.includes(",")) s.add(k);
    });
    // In 2D DP, all cells before activeCoord in row-major order are already computed
    if (activeCoord) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r < activeCoord.r || (r === activeCoord.r && c < activeCoord.c)) {
            s.add(`${r},${c}`);
          }
        }
      }
    }
    return s;
  }, [visited, activeCoord, rows, cols]);

  // Derive DP dependency cells (e.g. top, left, diagonal-top-left)
  const dependencyCells = useMemo(() => {
    if (!activeCoord) return { top: null, left: null, diag: null };
    const { r, c } = activeCoord;
    return {
      top: r > 0 ? `${r - 1},${c}` : null,
      left: c > 0 ? `${r},${c - 1}` : null,
      diag: r > 0 && c > 0 ? `${r - 1},${c - 1}` : null,
    };
  }, [activeCoord]);

  // Resolve optimal answer to guarantee correct final display
  const optimalAnswer = useMemo(() => {
    if (mSum !== null && mSum !== undefined) return mSum;
    if (wSum !== null && wSum !== undefined) return wSum;
    if (activeCoord && matrix[activeCoord.r]?.[activeCoord.c] !== undefined) {
      return matrix[activeCoord.r]![activeCoord.c];
    }
    if (rows > 0 && cols > 0 && matrix[rows - 1]?.[cols - 1] !== undefined) {
      return matrix[rows - 1]![cols - 1];
    }
    return null;
  }, [mSum, wSum, activeCoord, matrix, rows, cols]);

  return (
    <div className="flex flex-col gap-4">
      {/* Active DP Pointers Bar */}
      {activePointerEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-[11px] font-mono shadow-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
            DP Pointers:
          </span>
          {activePointerEntries.map(([k, v]) => {
            const style = getMarkerStyle(k);
            const valStr = Array.isArray(v) ? `[${v.join(",")}]` : String(v);
            return (
              <span
                key={`dppbadge-${k}`}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-bold border shadow-xs ${style.bg} ${style.textCol} ${style.border}`}
              >
                <span>{k}</span>
                <span className="opacity-70 font-normal">→ {valStr}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Top DP Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
            <Table className="size-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>2D Dynamic Programming State Table</span>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-primary border border-primary/30">
                {rows} × {cols}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {activeCoord ? `Evaluating Cell dp[${activeCoord.r}][${activeCoord.c}]` : "DP Matrix Initialized"}
            </div>
          </div>
        </div>

        {/* Legend / Key Dependency Badges */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          {dependencyCells.diag && (
            <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-purple-300">
              <ArrowDownRight className="size-3" /> dp[i-1][j-1]
            </span>
          )}
          {dependencyCells.top && (
            <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-blue-300">
              <ArrowDown className="size-3" /> dp[i-1][j]
            </span>
          )}
          {dependencyCells.left && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-amber-300">
              <ArrowRight className="size-3" /> dp[i][j-1]
            </span>
          )}
        </div>
      </div>

      {/* DP Table Grid Canvas */}
      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
        <table className="min-w-full border-collapse text-center">
          <thead>
            {/* Top Column Labels (e.g. string 2 characters) */}
            {colLabels && colLabels.length > 0 && (
              <tr>
                <th className="p-1.5 text-[10px] font-mono text-muted-foreground"></th>
                <th className="p-1.5 text-[10px] font-mono text-muted-foreground"></th>
                {colLabels.map((char, cIdx) => (
                  <th
                    key={cIdx}
                    className={`p-1.5 font-mono text-xs font-bold transition-all duration-200 ${
                      activeCoord && activeCoord.c === cIdx + 1
                        ? "text-primary scale-110 animate-pulse"
                        : "text-muted-foreground"
                    }`}
                  >
                    '{char}'
                  </th>
                ))}
              </tr>
            )}
            {/* Column Indices (0, 1, 2...) */}
            <tr>
              <th className="p-1.5 text-[10px] font-mono text-muted-foreground uppercase">Row</th>
              <th className="p-1.5 text-[10px] font-mono text-muted-foreground uppercase">Char</th>
              {Array.from({ length: cols }, (_, c) => {
                const colPointers: { label: string; style: MarkerStyle }[] = [];
                if (activeCoord && activeCoord.c === c) {
                  colPointers.push({ label: pointer_labels?.right || "j", style: getMarkerStyle("col") });
                }
                if (activePointers) {
                  for (const [pName, pVal] of Object.entries(activePointers)) {
                    if (typeof pVal === "number" && pVal === c && /^(?:col|c|j|right|fast|p2)$/i.test(pName)) {
                      if (!colPointers.some((p) => p.label.toLowerCase() === pName.toLowerCase())) {
                        colPointers.push({ label: pName, style: getMarkerStyle(pName) });
                      }
                    }
                  }
                }

                return (
                  <th
                    key={c}
                    className={`p-1.5 font-mono text-[11px] font-semibold transition-colors duration-200 ${
                      activeCoord && activeCoord.c === c
                        ? "text-primary font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      {colPointers.map((p, pIdx) => (
                        <span
                          key={`dpcp-${pIdx}`}
                          className={`mb-0.5 rounded px-1 py-0.2 text-[8px] font-bold border ${p.style.bg} ${p.style.textCol} ${p.style.border}`}
                        >
                          {p.label}
                        </span>
                      ))}
                      <span>j={c}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, r) => {
              const rowChar = rowLabels?.[r - 1] ?? (r === 0 ? "ε" : `r${r}`);
              const isRowActive = activeCoord?.r === r;

              const rowPointers: { label: string; style: MarkerStyle }[] = [];
              if (activeCoord && activeCoord.r === r) {
                rowPointers.push({ label: pointer_labels?.left || "i", style: getMarkerStyle("row") });
              }
              if (activePointers) {
                for (const [pName, pVal] of Object.entries(activePointers)) {
                  if (typeof pVal === "number" && pVal === r && /^(?:row|r|i|left|slow|p1)$/i.test(pName)) {
                    if (!rowPointers.some((p) => p.label.toLowerCase() === pName.toLowerCase())) {
                      rowPointers.push({ label: pName, style: getMarkerStyle(pName) });
                    }
                  }
                }
              }

              return (
                <tr key={r} className="border-t border-border/40">
                  {/* Row index indicator */}
                  <td className="p-1.5 font-mono text-[11px] font-semibold text-muted-foreground">
                    <div className="flex flex-col items-center">
                      {rowPointers.map((p, pIdx) => (
                        <span
                          key={`dprp-${pIdx}`}
                          className={`mb-0.5 rounded px-1 py-0.2 text-[8px] font-bold border ${p.style.bg} ${p.style.textCol} ${p.style.border}`}
                        >
                          {p.label}
                        </span>
                      ))}
                      <span>i={r}</span>
                    </div>
                  </td>
                  {/* Row character label */}
                  <td
                    className={`p-1.5 font-mono text-xs font-bold transition-colors duration-200 ${
                      isRowActive ? "text-primary scale-110" : "text-muted-foreground"
                    }`}
                  >
                    {r === 0 ? "∅" : `'${rowChar}'`}
                  </td>

                  {/* Matrix Cells */}
                  {Array.from({ length: cols }, (_, c) => {
                    const val = row[c];
                    const key = `${r},${c}`;
                    const isActive = currentCellKey === key;
                    const isVisited = seenKeys.has(key);
                    const isDiagDep = dependencyCells.diag === key;
                    const isTopDep = dependencyCells.top === key;
                    const isLeftDep = dependencyCells.left === key;
                    const isBaseCase = r === 0 || c === 0;

                    const cellPointers: { label: string; style: MarkerStyle }[] = [];
                    if (activePointers && typeof activePointers === "object") {
                      for (const [pName, pVal] of Object.entries(activePointers)) {
                        if (pVal === null || pVal === undefined) continue;
                        if (Array.isArray(pVal) && pVal.length >= 2 && pVal[0] === r && pVal[1] === c) {
                          cellPointers.push({ label: pName, style: getMarkerStyle(pName) });
                        }
                      }
                    }

                    const firstCellPointer = cellPointers[0];
                    let cellStyle = "border-border/60 bg-card/40 text-foreground";
                    if (isActive) {
                      cellStyle =
                        "border-primary ring-2 ring-primary bg-primary text-primary-foreground font-black scale-105 shadow-lg shadow-primary/40 z-10 animate-sync-glow constant-glow-primary";
                    } else if (firstCellPointer) {
                      cellStyle = `${firstCellPointer.style.border} ${firstCellPointer.style.bg} ${firstCellPointer.style.textCol} ring-1 ${firstCellPointer.style.ring} font-bold`;
                    } else if (isDiagDep) {
                      cellStyle =
                        "border-purple-500/70 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50 font-bold";
                    } else if (isTopDep) {
                      cellStyle =
                        "border-blue-500/70 bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/50 font-bold";
                    } else if (isLeftDep) {
                      cellStyle =
                        "border-amber-500/70 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50 font-bold";
                    } else if (isVisited) {
                      cellStyle =
                        "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold";
                    } else if (isBaseCase) {
                      cellStyle = "border-border/40 bg-muted/20 text-muted-foreground";
                    }

                    return (
                      <td key={c} className="p-1">
                        <div
                          className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border p-1 text-center font-mono text-xs transition-all duration-300 ${cellStyle}`}
                        >
                          {firstCellPointer && (
                            <span
                              className={`absolute -top-2 left-1/2 -translate-x-1/2 rounded px-1 text-[8px] font-bold border shadow-xs z-20 ${firstCellPointer.style.bg} ${firstCellPointer.style.textCol} ${firstCellPointer.style.border}`}
                            >
                              {firstCellPointer.label}
                            </span>
                          )}
                          <span>{val !== undefined && val !== null ? toText(val) : "0"}</span>

                          {/* Top-Right Dependency Indicator */}
                          {isDiagDep && (
                            <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-purple-500 text-[8px] font-black text-white">
                              ↖
                            </span>
                          )}
                          {isTopDep && (
                            <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-black text-white">
                              ↑
                            </span>
                          )}
                          {isLeftDep && (
                            <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-white">
                              ←
                            </span>
                          )}
                          {isActive && (
                            <span className="absolute -bottom-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-black text-primary-foreground">
                              ★
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground font-mono px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span>Optimal Substructure Memoization: Computed states persist across recursive calls.</span>
        </div>
        {optimalAnswer !== null && optimalAnswer !== undefined && (
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <CheckCircle className="size-3.5 text-emerald-400" />
            <span>Optimal Value: {toText(optimalAnswer)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

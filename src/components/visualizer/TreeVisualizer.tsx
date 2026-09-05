import React, { useMemo } from "react";
import type { Val, MarkerStyle } from "./VisualizerTypes";
import { toText, getMarkerStyle } from "./VisualizerTypes";

interface TreeVisualizerProps {
  treeData: (Val | null)[];
  current: Val | null;
  visited: Val[];
  type: "tree" | "bst" | "heap" | "trie";
  left?: number | null | undefined;
  right?: number | null | undefined;
  pointer_labels?: Record<string, string> | null;
  activePointers?: Record<string, number | string | [number, number] | null> | null;
}

interface TreeEdge {
  fromIdx: number;
  toIdx: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  char?: string;
  isActive: boolean;
  isVisited: boolean;
}

export function TreeVisualizer({
  treeData,
  current,
  visited,
  type,
  left,
  right,
  pointer_labels,
  activePointers,
}: TreeVisualizerProps) {
  const safeNodes = useMemo(() => {
    return treeData.map((val) =>
      val === null || val === undefined || String(val) === "null" ? null : val,
    );
  }, [treeData]);

  const visitedSet = useMemo(() => {
    return new Set(visited.map((v) => String(v)));
  }, [visited]);

  const currentStr = current !== null && current !== undefined ? String(current) : null;

  // Compute depth (supports up to 7 levels for complete trees and deep traces)
  const depth = useMemo(() => {
    if (safeNodes.length === 0) return 1;
    let maxIdx = 0;
    for (let idx = 0; idx < safeNodes.length; idx++) {
      if (safeNodes[idx] !== null) {
        maxIdx = idx;
      }
    }
    return Math.min(7, Math.max(1, Math.floor(Math.log2(maxIdx + 1)) + 1));
  }, [safeNodes]);

  const svgWidth = depth >= 6 ? 960 : depth === 5 ? 740 : depth >= 4 ? 640 : 560;
  const levelHeight = depth >= 6 ? 55 : 65;
  const svgHeight = Math.max(200, 60 + depth * levelHeight);
  const nodeRadius = depth >= 6 ? 15 : depth === 5 ? 17 : 19;

  // Compute position for each node
  const nodePositions = useMemo(() => {
    const totalSlots = 2 ** depth - 1;
    const positions: { index: number; val: Val | null; x: number; y: number; level: number }[] = [];

    for (let i = 0; i < Math.min(safeNodes.length, totalSlots); i++) {
      const val = safeNodes[i] ?? null;
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (2 ** level - 1);
      const levelSlots = 2 ** level;
      const x = (posInLevel + 0.5) * (svgWidth / levelSlots);
      const y = 48 + level * levelHeight;
      positions.push({ index: i, val, x, y, level });
    }
    return positions;
  }, [safeNodes, depth, svgWidth, levelHeight]);

  // Compute branches/edges between parents and children
  const edges = useMemo<TreeEdge[]>(() => {
    const lines: TreeEdge[] = [];

    nodePositions.forEach((node) => {
      if (node.val === null || node.index === 0) return;
      const parentIdx = Math.floor((node.index - 1) / 2);
      const parent = nodePositions[parentIdx];
      if (!parent || parent.val === null) return;

      const isCurrentBranch =
        currentStr !== null &&
        (String(node.val) === currentStr || (node.index === 0 && currentStr === "0"));
      const isVisitedBranch =
        (visitedSet.has(String(node.val)) || visitedSet.has(String(node.index))) &&
        (visitedSet.has(String(parent.val)) || visitedSet.has(String(parent.index)));

      const edgeItem: TreeEdge = {
        fromIdx: parentIdx,
        toIdx: node.index,
        x1: parent.x,
        y1: parent.y,
        x2: node.x,
        y2: node.y,
        isActive: isCurrentBranch,
        isVisited: isVisitedBranch,
      };

      if (type === "trie") {
        edgeItem.char = String(node.val);
      }

      lines.push(edgeItem);
    });
    return lines;
  }, [nodePositions, currentStr, visitedSet, type]);

  const activePointerEntries = useMemo(() => {
    if (!activePointers || typeof activePointers !== "object") return [];
    return Object.entries(activePointers).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
  }, [activePointers]);

  return (
    <div className="flex flex-col gap-4">
      {/* Pointer Bar if active */}
      {activePointerEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-[11px] font-mono shadow-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
            Tree Pointers:
          </span>
          {activePointerEntries.map(([k, v]) => {
            const style = getMarkerStyle(k);
            return (
              <span
                key={`pbadge-${k}`}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-bold border shadow-xs ${style.bg} ${style.textCol} ${style.border}`}
              >
                <span>{k}</span>
                <span className="opacity-70 font-normal">→ {String(v)}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* SVG Binary Tree Canvas */}
      <div className="relative flex min-h-[220px] items-center justify-center overflow-x-auto rounded-xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-4 shadow-inner">
        {safeNodes.length === 0 || safeNodes.every((v) => v === null) ? (
          <span className="font-mono text-sm text-muted-foreground">Empty tree</span>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-auto w-full max-w-[560px] select-none"
          >
            {/* Defs for gradients & filters */}
            <defs>
              <filter id="active-node-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="active-branch" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="oklch(0.78 0.15 205)" />
                <stop offset="100%" stopColor="oklch(0.70 0.17 275)" />
              </linearGradient>
            </defs>

            {/* Connecting Edges */}
            {edges.map((edge) => (
              <g key={`edge-${edge.fromIdx}-${edge.toIdx}`}>
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={
                    edge.isActive
                      ? "url(#active-branch)"
                      : edge.isVisited
                        ? "oklch(0.70 0.17 275 / 0.7)"
                        : "currentColor"
                  }
                  strokeWidth={edge.isActive ? 3.5 : 2}
                  strokeDasharray={edge.isActive ? "4 2" : "none"}
                  className={`transition-all duration-300 ${
                    edge.isActive ? "text-primary" : edge.isVisited ? "text-accent" : "text-border"
                  }`}
                />
                {edge.char && (
                  <g
                    transform={`translate(${(edge.x1 + edge.x2) / 2}, ${(edge.y1 + edge.y2) / 2 - 6})`}
                  >
                    <rect
                      x="-10"
                      y="-9"
                      width="20"
                      height="18"
                      rx="4"
                      className="fill-background/90 stroke-border/70"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-primary font-mono text-[11px] font-bold"
                    >
                      {edge.char}
                    </text>
                  </g>
                )}
              </g>
            ))}

            {/* Tree Nodes */}
            {nodePositions.map((node) => {
              if (node.val === null) return null;
              const nodeValStr = String(node.val);
              const isCurrent =
                currentStr !== null &&
                (nodeValStr === currentStr ||
                  (node.index === 0 && currentStr === "0" && node.val !== null) ||
                  currentStr === String(node.index) ||
                  (type === "trie" && currentStr.length === 1 && nodeValStr === currentStr));
              const isVisited =
                visitedSet.has(nodeValStr) ||
                (visitedSet.has(String(node.index)) && visited.length <= safeNodes.length);

              // Gather pointer badges for this node
              const nodePointers: { label: string; style: MarkerStyle }[] = [];

              if (activePointers && typeof activePointers === "object") {
                for (const [pName, pVal] of Object.entries(activePointers)) {
                  if (pVal === null || pVal === undefined) continue;
                  const isMatchingIndex = typeof pVal === "number" && pVal === node.index;
                  const isMatchingVal = typeof pVal !== "number" && String(pVal) === nodeValStr;
                  if (
                    (isMatchingIndex || isMatchingVal) &&
                    !nodePointers.some((p) => p.label.toLowerCase() === pName.toLowerCase())
                  ) {
                    nodePointers.push({
                      label: pName.slice(0, 8),
                      style: getMarkerStyle(pName),
                    });
                  }
                }
              }

              if (typeof left === "number" && left === node.index) {
                const lbl = pointer_labels?.left || "L";
                if (!nodePointers.some((p) => p.label.toLowerCase() === lbl.toLowerCase())) {
                  nodePointers.push({ label: lbl, style: getMarkerStyle("left") });
                }
              }

              if (typeof right === "number" && right === node.index) {
                const lbl = pointer_labels?.right || "R";
                if (!nodePointers.some((p) => p.label.toLowerCase() === lbl.toLowerCase())) {
                  nodePointers.push({ label: lbl, style: getMarkerStyle("right") });
                }
              }

              if (isCurrent && !nodePointers.some((p) => /curr|current/.test(p.label.toLowerCase()))) {
                const lbl = pointer_labels?.current || "CURR";
                nodePointers.push({ label: lbl, style: getMarkerStyle("curr") });
              }

              const firstNodePointer = nodePointers[0];

              return (
                <g
                  key={`node-${node.index}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="transition-all duration-300"
                >
                  {/* Floating Pointer Badges above node */}
                  {nodePointers.length > 0 && (
                    <g transform={`translate(0, ${-nodeRadius - 12})`}>
                      {nodePointers.map((badge, bIdx) => {
                        const textLen = badge.label.length;
                        const bWidth = Math.max(26, textLen * 6.5 + 8);
                        const bHeight = 14;
                        const totalWidth =
                          nodePointers.length * bWidth + (nodePointers.length - 1) * 4;
                        const startX = -totalWidth / 2;
                        const badgeX = startX + bIdx * (bWidth + 4);

                        return (
                          <g key={`tbadge-${bIdx}`} transform={`translate(${badgeX}, -7)`}>
                            <rect
                              width={bWidth}
                              height={bHeight}
                              rx="4"
                              fill={badge.style.svgFill}
                              stroke={badge.style.svgStroke}
                              strokeWidth="1.2"
                            />
                            <text
                              x={bWidth / 2}
                              y={bHeight / 2 + 0.5}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fill={badge.style.svgText}
                              className="font-mono text-[9px] font-bold select-none"
                            >
                              {badge.label}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Outer constant glow ring for active node */}
                  {isCurrent && (
                    <circle
                      r={nodeRadius + 5}
                      className="fill-primary/10 stroke-primary/50 transition-all duration-300"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Pointer accent ring if node has custom pointers */}
                  {firstNodePointer && !isCurrent && (
                    <circle
                      r={nodeRadius + 4}
                      fill="none"
                      stroke={firstNodePointer.style.svgStroke}
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={nodeRadius}
                    filter={isCurrent ? "url(#active-node-glow)" : undefined}
                    className={`transition-all duration-300 ${
                      isCurrent
                        ? "fill-primary stroke-primary/90 stroke-2 text-primary-foreground"
                        : isVisited
                          ? "fill-accent/20 stroke-accent/70 stroke-2 text-accent"
                          : "fill-card stroke-border stroke-2 text-foreground hover:stroke-muted-foreground"
                    }`}
                  />

                  {/* Trie End of Word Double Ring */}
                  {type === "trie" && (
                    <circle r={Math.max(10, nodeRadius - 4)} className="fill-none stroke-primary/40 stroke-1" />
                  )}

                  {/* Node Value */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-mono text-xs font-bold select-none ${
                      isCurrent
                        ? "fill-primary-foreground font-extrabold"
                        : isVisited
                          ? "fill-accent font-semibold"
                          : "fill-foreground"
                    }`}
                  >
                    {toText(node.val)}
                  </text>

                  {/* Node Index Chip (for Heap / BST) */}
                  <text
                    y="27"
                    textAnchor="middle"
                    className="fill-muted-foreground font-mono text-[9px] select-none opacity-80"
                  >
                    i={node.index}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Heap Array Buffer & Index Mapping View */}
      {type === "heap" && (
        <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/50 p-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px]">
              Heap Array Buffer Representation
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              Parent(i) = ⌊(i-1)/2⌋ · Left = 2i+1 · Right = 2i+2
            </span>
          </div>

          <div className="flex flex-wrap gap-2 overflow-x-auto pt-1">
            {safeNodes.map((val, idx) => {
              if (val === null) return null;
              const isCurrent =
                currentStr !== null && (String(val) === currentStr || String(idx) === currentStr);
              return (
                <div
                  key={`heap-arr-${idx}`}
                  className={`flex flex-col items-center rounded-lg border p-1.5 transition-all duration-300 ${
                    isCurrent
                      ? "border-primary bg-primary/20 text-primary shadow-sm shadow-primary/30"
                      : "border-border/80 bg-background/60 text-foreground"
                  }`}
                >
                  <span className="font-mono text-[9px] text-muted-foreground">[{idx}]</span>
                  <span className="font-mono text-sm font-bold">{String(val)}</span>
                  {idx === 0 && (
                    <span className="rounded bg-primary/20 px-1 text-[8px] font-semibold text-primary">
                      ROOT
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

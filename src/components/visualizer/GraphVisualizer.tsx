import React, { useMemo, useState } from "react";
import type { Val } from "./VisualizerTypes";
import { coordKey, safeArray, safeMatrix, toText } from "./VisualizerTypes";
import { Layers, Network, Table, Eye, Sparkles, Activity, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GraphVisualizerProps {
  matrix?: Val[][] | null | undefined;
  cols?: number | null | undefined;
  current: Val | null | undefined;
  visited: Val[];
  type: "graph" | "matrix";
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  weight?: string | number;
}

export function GraphVisualizer({
  matrix: rawMatrix,
  cols: rawCols,
  current,
  visited: rawVisited,
  type,
}: GraphVisualizerProps) {
  const matrix = useMemo(() => safeMatrix(rawMatrix ?? []), [rawMatrix]);
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const cols = Number(rawCols ?? matrix[0]?.length ?? 1) || 1;
  const rows = matrix.length;

  const [viewMode, setViewMode] = useState<"network" | "matrix">("network");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const currentKey = coordKey(current);
  const seenKeys = useMemo(() => {
    return new Set(visited.map((item) => coordKey(item)));
  }, [visited]);

  // Determine if this is a 2D Grid/Matrix problem or a Node-Link network
  const is2DGrid = useMemo(() => {
    if (type === "matrix") return true;
    if (matrix.length > 1 && cols > 1 && matrix[0]?.length !== matrix.length) return true;
    if (currentKey.includes(",") || visited.some((v) => coordKey(v).includes(","))) return true;
    if (type === "graph" && matrix.length > 1 && matrix[0]?.length === matrix.length) return false;
    return matrix.length > 1 && cols > 1;
  }, [type, matrix, cols, currentKey, visited]);

  // For Node-Link Graph representation
  const graphNodes = useMemo<GraphNode[]>(() => {
    if (is2DGrid) return [];
    let nodeIds: string[] = [];
    if (matrix.length > 1 && matrix[0]?.length === matrix.length) {
      nodeIds = Array.from({ length: matrix.length }, (_, i) => String(i));
    } else {
      const nodeSet = new Set<string>();
      matrix.flat().forEach((val) => {
        const s = String(val);
        if (s !== "null" && s !== "" && s !== "undefined") nodeSet.add(s);
      });
      visited.forEach((val) => {
        const s = String(val);
        if (s !== "null" && s !== "" && s !== "undefined") nodeSet.add(s);
      });
      if (current !== null && current !== undefined) {
        const s = String(current);
        if (s !== "null" && s !== "" && s !== "undefined") nodeSet.add(s);
      }
      nodeIds = Array.from(nodeSet);
    }

    if (nodeIds.length === 0) {
      nodeIds = ["0", "1", "2", "3", "4"];
    }

    const svgWidth = 520;
    const svgHeight = 280;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const radius = Math.min(centerX, centerY) - 55;

    return nodeIds.map((id, idx) => {
      const angle = (2 * Math.PI * idx) / nodeIds.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { id, x, y };
    });
  }, [is2DGrid, matrix, visited, current]);

  // Generate real adjacency edges for node-link graph
  const graphEdges = useMemo<GraphEdge[]>(() => {
    if (is2DGrid || graphNodes.length <= 1) return [];
    const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));
    const edges: GraphEdge[] = [];

    // If matrix is square adjacency matrix
    if (matrix.length > 1 && matrix[0]?.length === matrix.length) {
      for (let u = 0; u < matrix.length; u++) {
        for (let v = 0; v < matrix.length; v++) {
          const val = Number(matrix[u]?.[v]);
          if (val > 0 && u !== v) {
            const n1 = nodeMap.get(String(u));
            const n2 = nodeMap.get(String(v));
            if (n1 && n2) {
              edges.push({
                from: n1.id,
                to: n2.id,
                x1: n1.x,
                y1: n1.y,
                x2: n2.x,
                y2: n2.y,
                weight: val > 1 ? val : undefined,
              });
            }
          }
        }
      }
    } else if (matrix.length > 0 && matrix.every((r) => Array.isArray(r) && r.length >= 2)) {
      // If matrix is an edge list [u, v] (e.g. Union-Find redundant connection, Course Schedule)
      matrix.forEach((row) => {
        const u = String(row[0]);
        const v = String(row[1]);
        const w = row.length >= 3 ? row[2] : undefined;
        const n1 = nodeMap.get(u);
        const n2 = nodeMap.get(v);
        if (n1 && n2) {
          edges.push({
            from: n1.id,
            to: n2.id,
            x1: n1.x,
            y1: n1.y,
            x2: n2.x,
            y2: n2.y,
            weight: w !== undefined ? String(w) : undefined,
          });
        }
      });
    }

    if (edges.length === 0) {
      for (let i = 0; i < graphNodes.length; i++) {
        const n1 = graphNodes[i]!;
        const n2 = graphNodes[(i + 1) % graphNodes.length]!;
        edges.push({ from: n1.id, to: n2.id, x1: n1.x, y1: n1.y, x2: n2.x, y2: n2.y });
      }
    }
    return edges;
  }, [is2DGrid, graphNodes, matrix]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Graph Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
            {is2DGrid ? <Layers className="size-4" /> : <Network className="size-4" />}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>{is2DGrid ? "2D Grid / Matrix Canvas" : "Interactive Graph & DAG Canvas"}</span>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-primary border border-primary/30">
                {is2DGrid ? `${rows} × ${cols}` : `${graphNodes.length} Vertices • ${graphEdges.length} Edges`}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {current !== null && current !== undefined
                ? `Active Target: ${String(current)}`
                : "Graph Initialized"}
            </div>
          </div>
        </div>

        {/* View Toggle */}
        {!is2DGrid && (
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 p-1">
            <button
              onClick={() => setViewMode("network")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-semibold transition-all ${
                viewMode === "network"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network className="size-3.5" /> Network
            </button>
            <button
              onClick={() => setViewMode("matrix")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-semibold transition-all ${
                viewMode === "matrix"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Table className="size-3.5" /> Adjacency Table
            </button>
          </div>
        )}
      </div>

      {is2DGrid ? (
        /* 2D Grid / Matrix BFS / DFS View */
        <div className="flex flex-col items-center justify-center overflow-x-auto rounded-2xl border border-border/80 bg-background/80 p-6 shadow-sm backdrop-blur-sm">
          {matrix.length === 0 ? (
            <span className="font-mono text-sm text-muted-foreground">Empty grid</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {/* Column Indices */}
              <div className="flex gap-1.5 pl-6">
                {Array.from({ length: cols }, (_, c) => (
                  <div
                    key={`col-idx-${c}`}
                    className="w-11 text-center font-mono text-[10px] font-semibold text-muted-foreground"
                  >
                    c{c}
                  </div>
                ))}
              </div>

              {/* Grid Rows */}
              {matrix.map((row, r) => (
                <div key={`row-${r}`} className="flex items-center gap-1.5">
                  {/* Row Index */}
                  <span className="w-4 font-mono text-[10px] font-semibold text-muted-foreground">
                    r{r}
                  </span>

                  {/* Cells in this row */}
                  {row.slice(0, cols).map((val, c) => {
                    const cellKey = `${r},${c}`;
                    const flatIdx = r * cols + c;
                    const isActive = currentKey === cellKey || currentKey === String(flatIdx);
                    const isSeen = seenKeys.has(cellKey) || seenKeys.has(String(flatIdx));
                    const isLand = Number(val) === 1;

                    return (
                      <div
                        key={`cell-${r}-${c}`}
                        className={`relative flex size-11 items-center justify-center rounded-xl border font-mono text-sm font-bold transition-all duration-300 ${
                          isActive
                            ? "z-10 scale-105 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-2 ring-primary/60 animate-sync-glow"
                            : isSeen
                              ? "border-accent/60 bg-accent/20 text-accent font-semibold shadow-xs"
                              : isLand
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                : "border-border/60 bg-card/60 text-muted-foreground"
                        }`}
                      >
                        {isActive && (
                          <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-primary shadow-xs shadow-primary/60" />
                        )}
                        <span>{toText(val)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : viewMode === "network" ? (
        /* Node-Link Network Graph View */
        <div className="relative flex min-h-[280px] items-center justify-center overflow-x-auto rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
          <svg viewBox="0 0 520 280" className="h-auto w-full max-w-[520px] select-none">
            <defs>
              <marker
                id="graph-arrow-active"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="oklch(0.74 0.20 295)" />
              </marker>
              <marker
                id="graph-arrow-seen"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="oklch(0.72 0.16 230)" />
              </marker>
              <marker
                id="graph-arrow-default"
                viewBox="0 0 10 10"
                refX="24"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="currentColor" className="text-muted-foreground/40" />
              </marker>
            </defs>

            {/* Edges */}
            {graphEdges.map((edge, i) => {
              const currentStr = String(current ?? "").replace(/[\[\]\s]/g, "");
              const currentParts = currentStr.split(",");
              const isDirectEdgeMatch =
                currentParts.length === 2 &&
                ((currentParts[0] === edge.from && currentParts[1] === edge.to) ||
                  (currentParts[0] === edge.to && currentParts[1] === edge.from));

              const isHoveredEdge = hoveredNode === edge.from || hoveredNode === edge.to;
              const isActiveEdge =
                isDirectEdgeMatch || currentKey === edge.from || currentKey === edge.to;
              const isSeenEdge = seenKeys.has(edge.from) && seenKeys.has(edge.to);

              const strokeColor = isDirectEdgeMatch || isActiveEdge
                ? "oklch(0.74 0.20 295)"
                : isSeenEdge
                  ? "oklch(0.72 0.16 230 / 0.85)"
                  : isHoveredEdge
                    ? "oklch(0.78 0.15 205)"
                    : "oklch(0.4 0.02 260 / 0.6)";

              const midX = (edge.x1 + edge.x2) / 2;
              const midY = (edge.y1 + edge.y2) / 2;

              return (
                <g key={`gedge-${i}`}>
                  <line
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={strokeColor}
                    strokeWidth={isDirectEdgeMatch ? 3.5 : isActiveEdge ? 2.5 : 1.5}
                    markerEnd={
                      isActiveEdge
                        ? "url(#graph-arrow-active)"
                        : isSeenEdge
                          ? "url(#graph-arrow-seen)"
                          : "url(#graph-arrow-default)"
                    }
                    className="transition-all duration-300"
                  />
                  {edge.weight && (
                    <g transform={`translate(${midX}, ${midY - 4})`}>
                      <rect
                        x="-10"
                        y="-8"
                        width="20"
                        height="14"
                        rx="4"
                        className="fill-background/90 stroke-border/60 stroke"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-mono text-[9px] font-bold fill-primary"
                      >
                        {String(edge.weight)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Graph Nodes */}
            {graphNodes.map((node) => {
              const currentStr = String(current ?? "").replace(/[\[\]\s]/g, "");
              const currentParts = currentStr.split(",");
              const isPartActive = currentParts.includes(node.id);
              const isActive = currentKey === node.id || isPartActive;
              const isSeen = seenKeys.has(node.id);
              const isHovered = hoveredNode === node.id;

              const nodeLength = node.id.length;
              const baseRadius = nodeLength >= 6 ? 23 : nodeLength >= 3 ? 20 : 17;
              const nodeRadius = isActive ? baseRadius + 3 : isHovered ? baseRadius + 2 : baseRadius;
              const fontSizeClass =
                nodeLength >= 7
                  ? "text-[8px]"
                  : nodeLength >= 4
                    ? "text-[10px]"
                    : "text-xs";

              return (
                <g
                  key={`gnode-${node.id}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {isActive && (
                    <circle
                      r={nodeRadius + 6}
                      className="fill-primary/20 stroke-primary/60 animate-ping opacity-60"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    r={nodeRadius}
                    className={`transition-all duration-300 ${
                      isActive
                        ? "fill-primary stroke-primary stroke-2 shadow-lg ring-4 ring-primary/30"
                        : isSeen
                          ? "fill-accent/25 stroke-accent stroke-2"
                          : isHovered
                            ? "fill-cyan-500/20 stroke-cyan-400 stroke-2"
                            : "fill-card stroke-border/80 stroke-2"
                    }`}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-mono ${fontSizeClass} font-bold select-none ${
                      isActive
                        ? "fill-primary-foreground font-black"
                        : isSeen
                          ? "fill-accent font-bold"
                          : "fill-foreground"
                    }`}
                  >
                    {node.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        /* Adjacency Matrix View */
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
          <table className="min-w-full border-collapse text-center font-mono text-xs">
            <thead>
              <tr>
                <th className="p-2 text-muted-foreground uppercase text-[10px]">From \ To</th>
                {graphNodes.map((n) => (
                  <th
                    key={`hdr-${n.id}`}
                    className={`p-2 font-bold ${
                      currentKey === n.id ? "text-primary font-black" : "text-muted-foreground"
                    }`}
                  >
                    Node {n.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {graphNodes.map((uNode) => (
                <tr key={`row-${uNode.id}`} className="border-t border-border/40">
                  <td
                    className={`p-2 font-bold ${
                      currentKey === uNode.id ? "text-primary font-black" : "text-muted-foreground"
                    }`}
                  >
                    Node {uNode.id}
                  </td>
                  {graphNodes.map((vNode) => {
                    const edgeExists = graphEdges.some(
                      (e) => (e.from === uNode.id && e.to === vNode.id) || (e.from === vNode.id && e.to === uNode.id),
                    );
                    const isDirect = (currentKey === uNode.id && seenKeys.has(vNode.id)) || (currentKey === vNode.id && seenKeys.has(uNode.id));

                    return (
                      <td key={`cell-${uNode.id}-${vNode.id}`} className="p-1">
                        <div
                          className={`flex size-8 items-center justify-center rounded-lg border text-center font-bold mx-auto transition-all ${
                            isDirect && edgeExists
                              ? "border-primary bg-primary/25 text-primary scale-105"
                              : edgeExists
                                ? "border-accent/40 bg-accent/15 text-accent"
                                : "border-border/40 bg-muted/10 text-muted-foreground/50"
                          }`}
                        >
                          {edgeExists ? "1" : "0"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Visited & Frontier Tracker Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/40 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold uppercase text-muted-foreground text-[11px]">
            Visited Vertices ({visited.length}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {visited.length === 0 ? (
              <span className="font-mono text-muted-foreground/60">none</span>
            ) : (
              visited.map((v, i) => (
                <span
                  key={`vset-${i}`}
                  className="rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-bold text-accent"
                >
                  {String(v)}
                </span>
              ))
            )}
          </div>
        </div>

        {current !== null && current !== undefined && (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-muted-foreground">Active Vertex:</span>
            <span className="rounded-md border border-primary/40 bg-primary/20 px-2 py-0.5 font-bold text-primary">
              {String(current)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import type { CallStackFrame, RecursionTreeNode } from "./VisualizerTypes";
import {
  GitBranch,
  Layers,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Scissors,
  Zap,
  Database,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

interface RecursionVisualizerProps {
  callStack?: CallStackFrame[] | null;
  recursionTree?: RecursionTreeNode[] | null;
  activeFrameId?: string | null;
  variables?: Record<string, any> | null;
  desc?: string;
  memoTable?: Record<string, any> | null;
  memoHitKey?: string | null;
  prunedBranchId?: string | null;
}

export function RecursionVisualizer({
  callStack: rawCallStack,
  recursionTree: rawTree,
  activeFrameId,
  variables,
  desc = "",
  memoTable: rawMemoTable,
  memoHitKey,
  prunedBranchId,
}: RecursionVisualizerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPruningLayer, setShowPruningLayer] = useState<boolean>(true);
  const [showMemoPanel, setShowMemoPanel] = useState<boolean>(true);

  // Normalize call stack frames
  const callStack = useMemo(() => {
    if (!rawCallStack || !Array.isArray(rawCallStack) || rawCallStack.length === 0) {
      return [
        {
          id: "frame_root",
          name: "solve()",
          depth: 0,
          args: variables ?? {},
          status: "active" as const,
        },
      ];
    }
    return rawCallStack;
  }, [rawCallStack, variables]);

  // Normalize recursion tree nodes
  const treeNodes = useMemo(() => {
    if (!rawTree || !Array.isArray(rawTree) || rawTree.length === 0) {
      return callStack.map((frame, i) => ({
        id: frame.id || `node_${i}`,
        parentId: i > 0 ? (callStack[i - 1]?.id || `node_${i - 1}`) : null,
        label: frame.name,
        depth: frame.depth ?? i,
        state: frame.status || "running",
        decision: Object.entries(frame.args || {})
          .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
          .slice(0, 2)
          .join(", "),
        returnValue: frame.returnValue,
        isMemoHit: frame.isMemoHit,
        pruneReason: frame.pruneReason,
      })) as RecursionTreeNode[];
    }
    return rawTree;
  }, [rawTree, callStack]);

  // Derive memoization table from props or variables
  const memoTable = useMemo(() => {
    if (rawMemoTable && Object.keys(rawMemoTable).length > 0) {
      return rawMemoTable;
    }
    if (variables?.memo && typeof variables.memo === "object") {
      return variables.memo;
    }
    if (variables?.cache && typeof variables.cache === "object") {
      return variables.cache;
    }
    return null;
  }, [rawMemoTable, variables]);

  const activeDepth = useMemo(() => {
    if (callStack.length === 0) return 0;
    return Math.max(...callStack.map((f) => f.depth ?? 0));
  }, [callStack]);

  // Counts for overview
  const stats = useMemo(() => {
    const baseCases = treeNodes.filter((n) => n.state === "success").length;
    const pruned = treeNodes.filter((n) => n.state === "pruned").length;
    const memoHits = treeNodes.filter((n) => n.state === "memo_hit" || n.isMemoHit).length;
    return { baseCases, pruned, memoHits };
  }, [treeNodes]);

  // Tree layout computation for SVG rendering
  const layout = useMemo(() => {
    const depthMap: Record<number, RecursionTreeNode[]> = {};
    const nodeMap: Record<string, RecursionTreeNode> = {};

    treeNodes.forEach((node) => {
      nodeMap[node.id] = node;
      const d = node.depth ?? 0;
      if (!depthMap[d]) depthMap[d] = [];
      depthMap[d]!.push(node);
    });

    const positions: Record<string, { x: number; y: number }> = {};
    const maxDepth = Math.max(0, ...Object.keys(depthMap).map(Number));
    const levelHeight = 90;
    const baseWidth = 640;

    Object.entries(depthMap).forEach(([dStr, nodes]) => {
      const d = Number(dStr);
      const count = nodes.length;
      const spacing = Math.max(96, baseWidth / (count + 1));
      const startX = Math.max(56, (baseWidth - (count - 1) * spacing) / 2);

      nodes.forEach((node, idx) => {
        positions[node.id] = {
          x: startX + idx * spacing,
          y: 50 + d * levelHeight,
        };
      });
    });

    const edges: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      decision?: string;
      id: string;
      toState?: string;
      isPruned?: boolean;
      isMemoHit?: boolean;
      pruneReason?: string;
      toNodeId: string;
    }> = [];

    treeNodes.forEach((node) => {
      if (node.parentId && positions[node.parentId] && positions[node.id]) {
        const isPruned = node.state === "pruned" || node.id === prunedBranchId;
        const isMemoHit = node.state === "memo_hit" || Boolean(node.isMemoHit);
        edges.push({
          id: `${node.parentId}->${node.id}`,
          from: positions[node.parentId]!,
          to: positions[node.id]!,
          decision: node.decision,
          toState: node.state,
          isPruned,
          isMemoHit,
          pruneReason: node.pruneReason,
          toNodeId: node.id,
        });
      }
    });

    const svgWidth = Math.max(baseWidth, ...Object.values(positions).map((p) => p.x + 90));
    const svgHeight = Math.max(300, (maxDepth + 1) * levelHeight + 70);

    return { positions, edges, svgWidth, svgHeight, nodeMap };
  }, [treeNodes, prunedBranchId]);

  const selectedNode = selectedNodeId ? layout.nodeMap[selectedNodeId] : null;

  return (
    <div className="flex flex-col gap-3 w-full h-full p-2">
      {/* Overview Stat & Control Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card border border-border/70 text-xs font-mono shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-primary font-semibold">
            <Layers className="w-4 h-4 text-primary" />
            <span>Stack Depth: {callStack.length}</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <span>Tree Explored: {treeNodes.length}</span>
          </div>
        </div>

        {/* Action Toggles & Semantic Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Base Case Badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Base: {stats.baseCases}</span>
          </span>

          {/* Pruned Badges & Toggle */}
          <button
            type="button"
            onClick={() => setShowPruningLayer((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-medium transition-all ${
              showPruningLayer
                ? "bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-xs ring-1 ring-rose-500/20"
                : "bg-muted/40 text-muted-foreground border-border/70 opacity-70 hover:opacity-100"
            }`}
            title="Toggle Visual Pruning Effect Layer for aborted recursive branches"
          >
            <Scissors className={`w-3.5 h-3.5 ${showPruningLayer ? "text-rose-400" : "text-muted-foreground"}`} />
            <span>Pruning Layer: {showPruningLayer ? "ON" : "OFF"}</span>
            <span className="ml-0.5 px-1 py-0.1 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
              {stats.pruned}
            </span>
          </button>

          {/* Memoization Cache Hits Badge */}
          <button
            type="button"
            onClick={() => setShowMemoPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-medium transition-all ${
              stats.memoHits > 0 || memoTable
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-xs"
                : "bg-muted/40 text-muted-foreground border-border/70"
            }`}
            title="Inspect Memoization Cache Table and O(1) Bypasses"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>Memo Hits: {stats.memoHits}</span>
            {memoTable && (
              <span className="text-[10px] text-cyan-400/80 underline flex items-center ml-0.5">
                {showMemoPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Dual Grid: Call Stack (Left) + Interactive Recursion Tree (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[380px]">
        {/* Call Stack Inspector Pane */}
        <div className="lg:col-span-4 flex flex-col rounded-xl bg-card/60 border border-border/70 overflow-hidden shadow-xs">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-tight">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>ACTIVE CALL STACK</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
              Top Depth: {activeDepth}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col-reverse gap-2.5 max-h-[480px]">
            {callStack.map((frame, idx) => {
              const isTop = idx === callStack.length - 1;
              const isInFlight = isTop || frame.status === "in-flight" || frame.status === "active";
              const isBase = frame.status === "completed" || frame.status === "green" || frame.status === "base_case" || frame.status === "returned";
              const isPruned = frame.status === "pruned" || frame.status === "red";
              const isMemoHit = frame.status === "memo_hit" || Boolean(frame.isMemoHit);
              const isBacktracking = frame.status === "backtracking";

              return (
                <div
                  key={frame.id || idx}
                  className={`relative p-2.5 rounded-lg border transition-all text-xs font-mono ${
                    isMemoHit
                      ? "bg-cyan-500/10 border-cyan-500/50 shadow-xs ring-1 ring-cyan-500/30"
                      : isPruned
                      ? "bg-rose-500/10 border-rose-500/60 shadow-xs ring-1 ring-rose-500/30"
                      : isInFlight
                      ? "bg-primary/10 border-primary/60 shadow-xs ring-1 ring-primary/30"
                      : isBase
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : isBacktracking
                      ? "bg-amber-500/5 border-amber-500/30"
                      : "bg-background/80 border-border/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      {isMemoHit ? (
                        <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                      ) : isPruned ? (
                        <Scissors className="w-3.5 h-3.5 text-rose-400" />
                      ) : isInFlight ? (
                        <ArrowUpCircle className="w-3.5 h-3.5 text-primary animate-pulse" />
                      ) : isBase ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                      )}
                      <span
                        className={
                          isMemoHit
                            ? "text-cyan-300"
                            : isPruned
                            ? "text-rose-400 font-semibold"
                            : isInFlight
                            ? "text-primary font-bold"
                            : isBase
                            ? "text-emerald-400"
                            : "text-foreground"
                        }
                      >
                        {frame.name || `frame_${idx}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isMemoHit ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                          MEMO HIT
                        </span>
                      ) : isPruned ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase">
                          PRUNED (RED)
                        </span>
                      ) : isInFlight ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold uppercase animate-pulse">
                          IN-FLIGHT
                        </span>
                      ) : isBase ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                          COMPLETED (GREEN)
                        </span>
                      ) : isBacktracking ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                          BACKTRACK
                        </span>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        d={frame.depth ?? idx}
                      </span>
                    </div>
                  </div>

                  {/* Pruning Abort Notice */}
                  {isPruned && (
                    <div className="mb-2 px-2 py-1 rounded bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">BRANCH ABORTED: </span>
                        <span>{frame.pruneReason || "Constraint boundary violated; subtrees pruned."}</span>
                      </div>
                    </div>
                  )}

                  {/* Memoization Cache Hit Notice */}
                  {isMemoHit && (
                    <div className="mb-2 px-2 py-1 rounded bg-cyan-500/15 border border-cyan-500/30 text-[10px] text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-cyan-300 shrink-0" />
                      <span>Cache Hit: Subtree bypassed. Value retrieved in O(1).</span>
                    </div>
                  )}

                  {/* Frame Parameters / Args */}
                  {frame.args && Object.keys(frame.args).length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 mt-1 pt-1.5 border-t border-border/40 text-[11px]">
                      {Object.entries(frame.args).map(([argKey, argVal]) => (
                        <div key={argKey} className="flex flex-col bg-muted/30 px-1.5 py-0.5 rounded">
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">{argKey}</span>
                          <span className="truncate font-semibold text-foreground">
                            {typeof argVal === "object" ? JSON.stringify(argVal) : String(argVal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Return Value / Result */}
                  {frame.returnValue !== undefined && (
                    <div className="mt-1.5 text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                      <span>↳ Returns:</span>
                      <span className="bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 font-mono">
                        {typeof frame.returnValue === "object"
                          ? JSON.stringify(frame.returnValue)
                          : String(frame.returnValue)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recursion Tree Visualizer Pane */}
        <div className="lg:col-span-8 flex flex-col rounded-xl bg-card/60 border border-border/70 overflow-hidden shadow-xs">
          <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold font-mono">
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span>RECURSION DECISION TREE & PRUNING LAYER</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" /> Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Base Case
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Pruned (Red)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Memo Cache Hit
              </span>
            </div>
          </div>

          <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center min-h-[320px] bg-dot-grid">
            <svg
              width={layout.svgWidth}
              height={layout.svgHeight}
              className="max-w-none transition-all duration-300"
            >
              <defs>
                <marker
                  id="arrow-cyan"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
                </marker>
                <marker
                  id="arrow-pruned"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                </marker>
                <marker
                  id="arrow-memo"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                </marker>
                <marker
                  id="arrow-muted"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" className="text-border" />
                </marker>

                {/* Diagonal striping pattern for pruned node capsules */}
                <pattern id="pruned-hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#f43f5e" strokeWidth="1.5" strokeOpacity="0.4" />
                </pattern>
              </defs>

              {/* Edge connectors with Pruning and Memoization layers */}
              {layout.edges.map((edge) => {
                const midX = (edge.from.x + edge.to.x) / 2;
                const midY = (edge.from.y + edge.to.y) / 2;
                const isTargetInFlight = edge.toState === "in-flight" || edge.toState === "running" || edge.toState === "active";
                const isTargetCompleted = edge.toState === "completed" || edge.toState === "green" || edge.toState === "success";
                const isPruned = showPruningLayer && (edge.isPruned || edge.toState === "pruned" || edge.toState === "red");
                const isMemoHit = edge.isMemoHit || edge.toState === "memo_hit";

                let strokeColor = "hsl(var(--border))";
                let markerEnd = "url(#arrow-muted)";
                let strokeDash = undefined;
                let strokeWidth = 1.5;

                if (isPruned) {
                  strokeColor = "#f43f5e";
                  markerEnd = "url(#arrow-pruned)";
                  strokeDash = "4 3";
                  strokeWidth = 2.5;
                } else if (isMemoHit) {
                  strokeColor = "#06b6d4";
                  markerEnd = "url(#arrow-memo)";
                  strokeDash = "3 2";
                  strokeWidth = 2;
                } else if (isTargetInFlight) {
                  strokeColor = "hsl(var(--primary))";
                  markerEnd = "url(#arrow-cyan)";
                  strokeWidth = 2.5;
                } else if (isTargetCompleted) {
                  strokeColor = "#10b981";
                  markerEnd = "url(#arrow-muted)";
                  strokeWidth = 2;
                }

                return (
                  <g key={edge.id} className="transition-all duration-300">
                    {/* Pruned Branch Glow Halo */}
                    {isPruned && (
                      <line
                        x1={edge.from.x}
                        y1={edge.from.y}
                        x2={edge.to.x}
                        y2={edge.to.y}
                        stroke="#f43f5e"
                        strokeWidth={6}
                        strokeOpacity={0.2}
                        strokeLinecap="round"
                      />
                    )}

                    <line
                      x1={edge.from.x}
                      y1={edge.from.y}
                      x2={edge.to.x}
                      y2={edge.to.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      markerEnd={markerEnd}
                    />

                    {/* Edge Decision or Prune Tag */}
                    <g transform={`translate(${midX}, ${midY - 8})`}>
                      {isPruned ? (
                        <g>
                          <rect
                            x={-34}
                            y={-10}
                            width={68}
                            height={18}
                            rx={4}
                            fill="#1e1014"
                            stroke="#f43f5e"
                            strokeWidth={1.2}
                          />
                          <text
                            textAnchor="middle"
                            y={3}
                            className="text-[9px] font-mono font-bold fill-rose-400 select-none"
                          >
                            ✂ PRUNED
                          </text>
                        </g>
                      ) : isMemoHit ? (
                        <g>
                          <rect
                            x={-32}
                            y={-10}
                            width={64}
                            height={18}
                            rx={4}
                            fill="#082f49"
                            stroke="#06b6d4"
                            strokeWidth={1.2}
                          />
                          <text
                            textAnchor="middle"
                            y={3}
                            className="text-[9px] font-mono font-bold fill-cyan-300 select-none"
                          >
                            ⚡ O(1) HIT
                          </text>
                        </g>
                      ) : edge.decision ? (
                        <g>
                          <rect
                            x={-28}
                            y={-9}
                            width={56}
                            height={16}
                            rx={3}
                            className="fill-background/90 stroke-border/70"
                          />
                          <text
                            textAnchor="middle"
                            y={3}
                            className="text-[9px] font-mono fill-muted-foreground select-none"
                          >
                            {edge.decision.slice(0, 10)}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  </g>
                );
              })}

              {/* Node capsules */}
              {treeNodes.map((node) => {
                const pos = layout.positions[node.id];
                if (!pos) return null;

                const isInFlight = node.id === activeFrameId || node.state === "in-flight" || node.state === "running" || node.state === "active";
                const isCompletedGreen = node.state === "completed" || node.state === "green" || node.state === "success";
                const isPrunedRed = showPruningLayer && (node.state === "pruned" || node.state === "red" || node.id === prunedBranchId);
                const isMemoHit = node.state === "memo_hit" || Boolean(node.isMemoHit);
                const isBacktracked = node.state === "backtracked";

                const nodeRadius = 22;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer transition-transform duration-200 hover:scale-110"
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    {/* Pulsing ring on in-flight calls */}
                    {isInFlight && (
                      <circle
                        r={nodeRadius + 6}
                        className="stroke-primary/50 fill-primary/10 animate-ping"
                        strokeWidth={1.5}
                      />
                    )}

                    {/* Red glow ring on Pruned Node */}
                    {isPrunedRed && (
                      <circle
                        r={nodeRadius + 5}
                        stroke="#f43f5e"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        fill="rgba(244, 63, 94, 0.12)"
                        className="animate-pulse"
                      />
                    )}

                    {/* Green glow ring on Completed Subtree */}
                    {isCompletedGreen && (
                      <circle
                        r={nodeRadius + 4}
                        stroke="#10b981"
                        strokeWidth={1.5}
                        fill="rgba(16, 185, 129, 0.08)"
                      />
                    )}

                    {/* Cyan glow ring on Memo Cache Hit */}
                    {isMemoHit && (
                      <circle
                        r={nodeRadius + 6}
                        stroke="#06b6d4"
                        strokeWidth={2}
                        strokeOpacity={0.8}
                        fill="rgba(6, 182, 212, 0.15)"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      r={nodeRadius}
                      className={`transition-colors shadow-md ${
                        isMemoHit
                          ? "fill-cyan-950/80 stroke-cyan-400 stroke-[2.5]"
                          : isPrunedRed
                          ? "fill-rose-950/70 stroke-rose-500 stroke-[2.5]"
                          : isInFlight
                          ? "fill-primary/25 stroke-primary stroke-[2.5]"
                          : isCompletedGreen
                          ? "fill-emerald-500/25 stroke-emerald-500 stroke-[2]"
                          : isBacktracked
                          ? "fill-muted/80 stroke-border stroke-[1.5]"
                          : "fill-card stroke-border stroke-[1.5]"
                      }`}
                    />

                    {/* Hatch overlay on pruned node */}
                    {isPrunedRed && (
                      <>
                        <circle r={nodeRadius - 1} fill="url(#pruned-hatch)" />
                        {/* Red Diagonal Strike Cross */}
                        <line
                          x1={-12}
                          y1={-12}
                          x2={12}
                          y2={12}
                          stroke="#f43f5e"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                        />
                        <line
                          x1={-12}
                          y1={12}
                          x2={12}
                          y2={-12}
                          stroke="#f43f5e"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                        />
                      </>
                    )}

                    {/* Memoization Cache Icon ⚡ */}
                    {isMemoHit ? (
                      <g transform="translate(-8, -8)">
                        <path
                          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                          fill="#22d3ee"
                          stroke="#0891b2"
                          strokeWidth="1"
                          transform="scale(0.8)"
                        />
                      </g>
                    ) : (
                      /* Node Center Label / Depth */
                      <text
                        textAnchor="middle"
                        dy="0.35em"
                        className={`text-[11px] font-mono font-bold select-none ${
                          isPrunedRed
                            ? "fill-rose-400 font-extrabold"
                            : isInFlight
                            ? "fill-primary"
                            : isCompletedGreen
                            ? "fill-emerald-400"
                            : "fill-foreground"
                        }`}
                      >
                        {node.label ? node.label.slice(0, 4) : `d${node.depth}`}
                      </text>
                    )}

                    {/* Pruned Scissors Badge (Top-Right of Node) */}
                    {isPrunedRed && (
                      <g transform={`translate(${nodeRadius - 2}, ${-nodeRadius + 2})`}>
                        <circle r={8} fill="#f43f5e" stroke="#1e1014" strokeWidth={1.5} />
                        <text
                          textAnchor="middle"
                          dy="0.32em"
                          fontSize="9"
                          fill="#ffffff"
                          fontWeight="bold"
                        >
                          ✕
                        </text>
                      </g>
                    )}

                    {/* Completed Checkmark Badge (Top-Right of Node) */}
                    {isCompletedGreen && !isMemoHit && (
                      <g transform={`translate(${nodeRadius - 2}, ${-nodeRadius + 2})`}>
                        <circle r={7} fill="#10b981" stroke="#064e3b" strokeWidth={1.2} />
                        <text
                          textAnchor="middle"
                          dy="0.32em"
                          fontSize="8"
                          fill="#ffffff"
                          fontWeight="bold"
                        >
                          ✓
                        </text>
                      </g>
                    )}

                    {/* Memo Hit Cache Badge (Top-Right of Node) */}
                    {isMemoHit && (
                      <g transform={`translate(${nodeRadius - 2}, ${-nodeRadius + 2})`}>
                        <circle r={8} fill="#06b6d4" stroke="#082f49" strokeWidth={1.5} />
                        <text
                          textAnchor="middle"
                          dy="0.32em"
                          fontSize="9"
                          fill="#ffffff"
                          fontWeight="bold"
                        >
                          ⚡
                        </text>
                      </g>
                    )}

                    {/* Decision / State Mini Pill Below */}
                    <g transform={`translate(0, ${nodeRadius + 14})`}>
                      <text
                        textAnchor="middle"
                        className={`text-[9px] font-mono select-none font-medium ${
                          isPrunedRed
                            ? "fill-rose-400 font-bold"
                            : isMemoHit
                            ? "fill-cyan-300 font-bold"
                            : isCompletedGreen
                            ? "fill-emerald-400 font-semibold"
                            : isInFlight
                            ? "fill-primary font-bold"
                            : "fill-muted-foreground"
                        }`}
                      >
                        {isPrunedRed
                          ? node.pruneReason
                            ? node.pruneReason.slice(0, 14)
                            : "ABORTED"
                          : isMemoHit
                          ? `Cached: ${node.cachedValue ?? node.returnValue ?? "O(1)"}`
                          : isCompletedGreen && node.returnValue !== undefined
                          ? `Ret: ${node.returnValue}`
                          : node.decision
                          ? node.decision.slice(0, 12)
                          : `d=${node.depth}`}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Real-time Memoization Cache Inspector Drawer */}
          {showMemoPanel && memoTable && Object.keys(memoTable).length > 0 && (
            <div className="p-3 bg-cyan-950/20 border-t border-cyan-500/30 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>MEMOIZATION CACHE TABLE</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
                    {Object.keys(memoTable).length} Cached Subproblems
                  </span>
                </div>
                <div className="text-[11px] text-cyan-400/90 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                    <span>Hits: {stats.memoHits}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
                {Object.entries(memoTable).map(([key, val]) => {
                  const isCurrentlyHit =
                    memoHitKey === key ||
                    (callStack[callStack.length - 1]?.name &&
                      callStack[callStack.length - 1]?.name.includes(key));

                  return (
                    <div
                      key={key}
                      className={`px-2.5 py-1 rounded-md border flex items-center gap-2 text-[11px] transition-all ${
                        isCurrentlyHit
                          ? "bg-cyan-500/25 border-cyan-400 text-cyan-100 ring-2 ring-cyan-400/50 shadow-xs scale-105"
                          : "bg-background/80 border-border/80 text-foreground"
                      }`}
                    >
                      <span className="text-muted-foreground font-semibold">{key}:</span>
                      <span className="font-bold text-cyan-300">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                      {isCurrentlyHit && (
                        <span className="text-[9px] px-1 rounded bg-cyan-400 text-black font-bold flex items-center">
                          ⚡ HIT
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Node detail drawer / footer */}
          {selectedNode && (
            <div className="p-2.5 bg-muted/40 border-t border-border/60 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 flex-wrap">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-foreground">Node {selectedNode.id}:</span>
                <span className="text-muted-foreground">{selectedNode.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                    selectedNode.state === "pruned"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : selectedNode.state === "memo_hit" || selectedNode.isMemoHit
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {selectedNode.state === "memo_hit" || selectedNode.isMemoHit
                    ? "MEMO CACHE HIT"
                    : selectedNode.state}
                </span>
                {selectedNode.pruneReason && (
                  <span className="text-rose-400 text-[11px]">
                    (Abort: {selectedNode.pruneReason})
                  </span>
                )}
                {selectedNode.cachedValue !== undefined && (
                  <span className="text-cyan-300 text-[11px]">
                    (Cached Return: {JSON.stringify(selectedNode.cachedValue)})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

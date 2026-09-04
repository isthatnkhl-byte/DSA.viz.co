import { memo, useState, useMemo } from "react";
import type { CallStackFrame, RecursionTreeNode } from "@/lib/problems";
import {
  Layers,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  CornerDownRight,
  Check,
  X,
  Undo2,
  Zap,
  AlertTriangle,
  Scissors,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface RecursionVisualizerProps {
  callStack?: CallStackFrame[] | null;
  recursionTree?: RecursionTreeNode[] | null;
  activeFrameId?: string | null;
  currentValue?: any;
  explanation?: string;
  memoTable?: Record<string, any> | null;
  memoHitKey?: string | null;
}

export const RecursionVisualizer = memo(function RecursionVisualizer({
  callStack = [],
  recursionTree = [],
  activeFrameId,
  currentValue,
  explanation = "",
  memoTable,
  memoHitKey,
}: RecursionVisualizerProps) {
  const safeStack = useMemo(
    () => (Array.isArray(callStack) ? callStack.filter(Boolean) : []),
    [callStack],
  );
  const safeTree = useMemo(
    () => (Array.isArray(recursionTree) ? recursionTree.filter(Boolean) : []),
    [recursionTree],
  );

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showPruningLayer, setShowPruningLayer] = useState(true);
  const [isMemoInspectorOpen, setIsMemoInspectorOpen] = useState(true);

  // Active frame is either specified by activeFrameId or top of safeStack
  const activeId =
    activeFrameId || (safeStack.length > 0 ? safeStack[safeStack.length - 1]?.id : null);

  // Telemetry counts
  const prunedCount = useMemo(
    () => safeTree.filter((n) => n.state === "pruned").length,
    [safeTree],
  );
  const memoHitCount = useMemo(
    () => safeTree.filter((n) => n.state === "memo_hit" || n.isMemoHit).length,
    [safeTree],
  );

  // Compute SVG layout coordinates for recursionTree nodes
  const { nodePositions, links, svgDimensions } = useMemo(() => {
    if (safeTree.length === 0) {
      return {
        nodePositions: new Map<string, { x: number; y: number }>(),
        links: [],
        svgDimensions: { width: 680, height: 380 },
      };
    }

    // Group nodes by depth
    const depthGroups = new Map<number, RecursionTreeNode[]>();
    let maxDepth = 0;
    safeTree.forEach((node) => {
      const d = Math.max(0, node.depth ?? 0);
      if (d > maxDepth) maxDepth = d;
      if (!depthGroups.has(d)) depthGroups.set(d, []);
      depthGroups.get(d)!.push(node);
    });

    const levelHeight = 92;
    const paddingX = 50;
    const paddingY = 50;
    const minColWidth = 95;

    // Calculate maximum breadth across all levels
    let maxBreadth = 1;
    depthGroups.forEach((nodes) => {
      if (nodes.length > maxBreadth) maxBreadth = nodes.length;
    });

    const totalWidth = Math.max(720, maxBreadth * minColWidth + paddingX * 2);
    const totalHeight = Math.max(380, (maxDepth + 1) * levelHeight + paddingY * 2);

    const positions = new Map<string, { x: number; y: number }>();

    depthGroups.forEach((nodes, d) => {
      const count = nodes.length;
      const stepX = (totalWidth - paddingX * 2) / (count + 1);
      nodes.forEach((node, i) => {
        positions.set(node.id, {
          x: paddingX + (i + 1) * stepX,
          y: paddingY + d * levelHeight,
        });
      });
    });

    // Build connections from child to parent
    const linksList: Array<{
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      decision?: string;
      state: string;
      isMemoHit?: boolean;
      pruneReason?: string;
    }> = [];

    safeTree.forEach((child) => {
      if (child.parentId && positions.has(child.parentId) && positions.has(child.id)) {
        linksList.push({
          id: `${child.parentId}->${child.id}`,
          from: positions.get(child.parentId)!,
          to: positions.get(child.id)!,
          decision: child.decision,
          state: child.state,
          isMemoHit: child.isMemoHit,
          pruneReason: child.pruneReason,
        });
      }
    });

    return {
      nodePositions: positions,
      links: linksList,
      svgDimensions: { width: totalWidth, height: totalHeight },
    };
  }, [safeTree]);

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Top Banner: Active Call, Pruning Toggle & Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/75 p-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-xs">
            <GitBranch className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                State-Space Recursion Engine
              </span>
              <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                Depth {safeStack.length > 0 ? safeStack[safeStack.length - 1]?.depth ?? safeStack.length : 0}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {safeStack.length} active stack frame{safeStack.length === 1 ? "" : "s"} • {safeTree.length} state tree node{safeTree.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Status Legend & Interactive Pruning Layer Toggle */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          {/* Pruning Layer Toggle Switch */}
          <button
            type="button"
            onClick={() => setShowPruningLayer((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-bold transition-all shadow-xs ${
              showPruningLayer
                ? "border-rose-500/80 bg-rose-950/60 text-rose-200 ring-1 ring-rose-500/50"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Scissors className={`size-3 ${showPruningLayer ? "text-rose-400" : "text-muted-foreground"}`} />
            <span>Pruning Layer: {showPruningLayer ? "ON" : "OFF"}</span>
            <span className={`rounded px-1.5 py-0.2 text-[9px] ${showPruningLayer ? "bg-rose-900/80 text-rose-100" : "bg-muted text-muted-foreground"}`}>
              {prunedCount} aborted
            </span>
          </button>

          {memoHitCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/50 bg-cyan-950/60 px-2.5 py-1 font-bold text-cyan-200 shadow-xs ring-1 ring-cyan-500/40">
              <Zap className="size-3 text-cyan-400 animate-pulse" />
              <span>{memoHitCount} Memo Hit{memoHitCount === 1 ? "" : "s"}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-950/40 px-2 py-0.5 font-semibold text-sky-300">
            <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" /> Active Path
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 font-semibold text-emerald-300">
            <Check className="size-3 text-emerald-400" /> Solution
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-950/40 px-2 py-0.5 font-semibold text-rose-300">
            <X className="size-3 text-rose-400" /> Pruned Cut
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-500/40 bg-slate-900/40 px-2 py-0.5 font-semibold text-slate-400">
            <Undo2 className="size-3 text-slate-400" /> Backtracked
          </span>
        </div>
      </div>

      {/* Main Dual Grid: Call Stack Drawer (Left) & Recursion Tree Canvas (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT COLUMN: Vertical Call Stack (35% width on large screens) */}
        <div className="lg:col-span-4 flex flex-col gap-2 rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-sm shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Call Stack Frames
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              LIFO (Top = Active)
            </span>
          </div>

          {safeStack.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-1 text-center font-mono text-xs text-muted-foreground">
              <span>No frames on stack</span>
              <span className="text-[10px] opacity-70">Recursion unwound or completed</span>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {safeStack.map((frame, idx) => {
                const isTop = idx === safeStack.length - 1;
                const isHovered = hoveredNodeId === frame.id;
                const isSuccess = frame.status === "base_case";
                const isPruned = frame.status === "pruned";
                const isMemoHit = frame.status === "memo_hit" || frame.isMemoHit;
                const isBacktrack = frame.status === "backtracking" || frame.status === "returned";

                return (
                  <div
                    key={frame.id || `frame-${idx}`}
                    onMouseEnter={() => setHoveredNodeId(frame.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={`group relative flex flex-col gap-1.5 rounded-lg border p-2.5 transition-all duration-200 ${
                      isPruned
                        ? "border-rose-500/90 bg-rose-950/40 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/60"
                        : isMemoHit
                          ? "border-cyan-500/90 bg-cyan-950/40 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/60"
                          : isTop
                            ? "border-primary/80 bg-primary/10 shadow-md shadow-primary/10 ring-1 ring-primary/40"
                            : isHovered
                              ? "border-foreground/40 bg-card/90"
                              : "border-border/70 bg-card/50 hover:border-border hover:bg-card/80"
                    }`}
                  >
                    {/* Frame Header: Name + Depth + Status Badge */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`font-mono text-[11px] font-bold truncate ${
                            isPruned
                              ? "text-rose-300 font-extrabold"
                              : isMemoHit
                                ? "text-cyan-300 font-extrabold"
                                : isTop
                                  ? "text-primary font-extrabold"
                                  : "text-foreground"
                          }`}
                        >
                          {frame.name || `frame_${idx}`}
                        </span>
                        <span className="font-mono text-[9px] rounded bg-muted/60 px-1 py-0.5 text-muted-foreground">
                          d={frame.depth ?? idx}
                        </span>
                      </div>

                      {/* Status Tag */}
                      {isSuccess ? (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="size-2.5" /> Base Case
                        </span>
                      ) : isPruned ? (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold text-rose-200 bg-rose-950/80 border border-rose-500/70 px-1.5 py-0.5 rounded shadow-xs">
                          <AlertCircle className="size-2.5 text-rose-400" /> Pruned Cut
                        </span>
                      ) : isMemoHit ? (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold text-cyan-200 bg-cyan-950/80 border border-cyan-500/70 px-1.5 py-0.5 rounded shadow-xs">
                          <Zap className="size-2.5 text-cyan-400" /> Memo Hit (O(1))
                        </span>
                      ) : isBacktrack ? (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold text-slate-400 bg-slate-900/40 border border-slate-700/50 px-1.5 py-0.5 rounded">
                          <CornerDownRight className="size-2.5" /> Return
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9px] font-bold text-sky-400 bg-sky-950/40 border border-sky-500/30 px-1.5 py-0.5 rounded">
                          <span className="size-1.5 rounded-full bg-sky-400 animate-ping" /> Active
                        </span>
                      )}
                    </div>

                    {/* Pruned Alert Banner on Aborted Frame */}
                    {isPruned && (
                      <div className="flex items-start gap-1.5 rounded-md bg-rose-950/80 border border-rose-500/60 px-2 py-1 text-rose-200 text-[10px] font-mono font-bold mt-0.5 shadow-xs">
                        <AlertTriangle className="size-3.5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <span className="text-rose-300 font-extrabold">⚠️ BRANCH ABORTED: </span>
                          <span>{frame.pruneReason || "Constraint boundary violated; subtree pruned."}</span>
                        </div>
                      </div>
                    )}

                    {/* Memo Hit Banner on Cached Frame */}
                    {isMemoHit && (
                      <div className="flex items-start gap-1.5 rounded-md bg-cyan-950/80 border border-cyan-500/60 px-2 py-1 text-cyan-200 text-[10px] font-mono font-bold mt-0.5 shadow-xs">
                        <Zap className="size-3.5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <span className="text-cyan-300 font-extrabold">⚡ MEMO HIT (O(1)): </span>
                          <span>Retrieved from memo table without exploring subtree.</span>
                        </div>
                      </div>
                    )}

                    {/* Frame Arguments List */}
                    {frame.args && Object.keys(frame.args).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.entries(frame.args).map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex items-center gap-1 font-mono text-[10px] rounded bg-background/70 border border-border/60 px-1.5 py-0.5"
                          >
                            <span className="text-muted-foreground">{k}:</span>
                            <span className="text-foreground font-semibold">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Return value if emitted */}
                    {frame.returnValue !== undefined && (
                      <div className="mt-0.5 font-mono text-[10px] text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <ArrowUpRight className="size-3 text-emerald-400" />
                        <span>return: {typeof frame.returnValue === "object" ? JSON.stringify(frame.returnValue) : String(frame.returnValue)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Recursion Tree SVG Canvas (65% width) */}
        <div className="lg:col-span-8 flex flex-col gap-2 rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-sm shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5">
              <GitBranch className="size-3.5 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                State-Space Exploration Tree
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              Scroll / Pan horizontally if wide
            </span>
          </div>

          <div className="w-full overflow-x-auto overflow-y-auto max-h-[440px] rounded-lg bg-background/50 border border-border/40 p-2">
            {safeTree.length === 0 ? (
              <div className="flex min-h-60 flex-col items-center justify-center gap-2 text-center font-mono text-xs text-muted-foreground">
                <GitBranch className="size-7 opacity-40" />
                <span>No recursion tree branches mapped yet.</span>
              </div>
            ) : (
              <svg
                width={svgDimensions.width}
                height={svgDimensions.height}
                className="select-none mx-auto"
              >
                <defs>
                  {/* Arrowhead Markers */}
                  <marker
                    id="arrow-pruned"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
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
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#06b6d4" />
                  </marker>
                  <marker
                    id="arrow-normal"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
                  </marker>

                  {/* Drop shadow and glow filters */}
                  <filter id="active-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.6" />
                  </filter>
                  <filter id="success-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#10b981" floodOpacity="0.6" />
                  </filter>
                  <filter id="pruned-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f43f5e" floodOpacity="0.8" />
                  </filter>
                  <filter id="memo-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#06b6d4" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* Draw connecting branches */}
                {links.map((link) => {
                  const isPruned = link.state === "pruned";
                  const isMemoHit = link.state === "memo_hit" || link.isMemoHit;
                  const isSuccess = link.state === "success";

                  // Draw smooth vertical bezier curve
                  const midY = (link.from.y + link.to.y) / 2;
                  const pathData = `M ${link.from.x} ${link.from.y + 18} C ${link.from.x} ${midY}, ${link.to.x} ${midY}, ${link.to.x} ${link.to.y - 18}`;

                  const strokeColor =
                    isPruned && showPruningLayer
                      ? "#f43f5e"
                      : isMemoHit
                        ? "#06b6d4"
                        : isSuccess
                          ? "#10b981"
                          : "#64748b";

                  const markerEnd =
                    isPruned && showPruningLayer
                      ? "url(#arrow-pruned)"
                      : isMemoHit
                        ? "url(#arrow-memo)"
                        : "url(#arrow-normal)";

                  return (
                    <g key={link.id}>
                      {/* Glowing Halo for Pruned or Memoized branch */}
                      {isPruned && showPruningLayer && (
                        <path
                          d={pathData}
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="7"
                          strokeOpacity="0.22"
                          strokeLinecap="round"
                        />
                      )}
                      {isMemoHit && (
                        <path
                          d={pathData}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="7"
                          strokeOpacity="0.25"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Main Bezier Branch Path */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isPruned && showPruningLayer ? "2.5" : isMemoHit || isSuccess ? "2" : "1.5"}
                        strokeDasharray={isPruned && showPruningLayer ? "5 4" : isMemoHit ? "3 3" : undefined}
                        strokeOpacity={isPruned && !showPruningLayer ? 0.35 : 0.9}
                        markerEnd={markerEnd}
                        className="transition-all duration-300"
                      />

                      {/* Pruned Inline Badge on Edge */}
                      {isPruned && showPruningLayer && (
                        <g transform={`translate(${(link.from.x + link.to.x) / 2}, ${midY})`}>
                          <rect
                            x="-32"
                            y="-10"
                            width="64"
                            height="20"
                            rx="5"
                            fill="#4c0519"
                            stroke="#f43f5e"
                            strokeWidth="1.5"
                            className="shadow-xs shadow-rose-950"
                          />
                          <text
                            textAnchor="middle"
                            dy="3.5"
                            className="font-mono text-[9px] fill-rose-200 font-extrabold select-none"
                          >
                            ✂ PRUNED
                          </text>
                        </g>
                      )}

                      {/* Memoization O(1) Hit Inline Badge on Edge */}
                      {isMemoHit && (
                        <g transform={`translate(${(link.from.x + link.to.x) / 2}, ${midY})`}>
                          <rect
                            x="-34"
                            y="-10"
                            width="68"
                            height="20"
                            rx="5"
                            fill="#083344"
                            stroke="#06b6d4"
                            strokeWidth="1.5"
                            className="shadow-xs shadow-cyan-950"
                          />
                          <text
                            textAnchor="middle"
                            dy="3.5"
                            className="font-mono text-[9px] fill-cyan-200 font-extrabold select-none"
                          >
                            ⚡ O(1) HIT
                          </text>
                        </g>
                      )}

                      {/* Decision pill on normal branch link if available */}
                      {!isPruned && !isMemoHit && link.decision && (
                        <g transform={`translate(${(link.from.x + link.to.x) / 2}, ${midY})`}>
                          <rect
                            x="-28"
                            y="-9"
                            width="56"
                            height="18"
                            rx="4"
                            fill="#0f172a"
                            stroke="#334155"
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            dy="3.5"
                            className="font-mono text-[9px] fill-slate-300 font-semibold select-none"
                          >
                            {link.decision}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Draw tree nodes */}
                {safeTree.map((node) => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  const isActive = activeId === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isSuccess = node.state === "success";
                  const isPruned = node.state === "pruned";
                  const isMemoHit = node.state === "memo_hit" || node.isMemoHit;
                  const isBacktracked = node.state === "backtracked";

                  let nodeFill = "#1e293b";
                  let nodeStroke = "#475569";
                  let textFill = "#f8fafc";
                  let filterId: string | undefined = undefined;

                  if (isPruned && showPruningLayer) {
                    nodeFill = "#4c0519";
                    nodeStroke = "#f43f5e";
                    textFill = "#fecdd3";
                    filterId = "url(#pruned-glow)";
                  } else if (isMemoHit) {
                    nodeFill = "#083344";
                    nodeStroke = "#06b6d4";
                    textFill = "#a5f3fc";
                    filterId = "url(#memo-glow)";
                  } else if (isSuccess) {
                    nodeFill = "#064e3b";
                    nodeStroke = "#10b981";
                    textFill = "#a7f3d0";
                    filterId = "url(#success-glow)";
                  } else if (isActive) {
                    nodeFill = "#0c4a6e";
                    nodeStroke = "#38bdf8";
                    textFill = "#bae6fd";
                    filterId = "url(#active-glow)";
                  } else if (isBacktracked) {
                    nodeFill = "#0f172a";
                    nodeStroke = "#334155";
                    textFill = "#94a3b8";
                  }

                  const nodeW = 84;
                  const nodeH = 36;
                  const halfW = nodeW / 2;
                  const halfH = nodeH / 2;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="cursor-pointer transition-transform duration-200"
                      filter={filterId}
                    >
                      {/* Animated outer pulse ring for Active, Pruned, or Memo Hit nodes */}
                      {isActive && !isPruned && !isMemoHit && (
                        <rect
                          x={-(halfW + 6)}
                          y={-(halfH + 6)}
                          width={nodeW + 12}
                          height={nodeH + 12}
                          rx="14"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="animate-pulse"
                          opacity="0.95"
                        />
                      )}
                      {isPruned && showPruningLayer && (
                        <rect
                          x={-(halfW + 5)}
                          y={-(halfH + 5)}
                          width={nodeW + 10}
                          height={nodeH + 10}
                          rx="12"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                          className="animate-pulse"
                          opacity="0.85"
                        />
                      )}
                      {isMemoHit && (
                        <rect
                          x={-(halfW + 5)}
                          y={-(halfH + 5)}
                          width={nodeW + 10}
                          height={nodeH + 10}
                          rx="12"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          className="animate-pulse"
                          opacity="0.9"
                        />
                      )}

                      {/* Main Node Capsule */}
                      <rect
                        x={-halfW}
                        y={-halfH}
                        width={nodeW}
                        height={nodeH}
                        rx="8"
                        fill={nodeFill}
                        stroke={isHovered ? "#ffffff" : nodeStroke}
                        strokeWidth={isActive || isHovered || isPruned || isMemoHit ? "2.5" : "1.5"}
                        className="transition-all duration-200"
                      />

                      {/* Internal Diagonal Strikethrough Cross for Pruned Nodes */}
                      {isPruned && showPruningLayer && (
                        <g>
                          <line
                            x1={-halfW + 8}
                            y1={-halfH + 6}
                            x2={halfW - 8}
                            y2={halfH - 6}
                            stroke="#f43f5e"
                            strokeWidth="2"
                            strokeOpacity="0.8"
                          />
                          <line
                            x1={halfW - 8}
                            y1={-halfH + 6}
                            x2={-halfW + 8}
                            y2={halfH - 6}
                            stroke="#f43f5e"
                            strokeWidth="2"
                            strokeOpacity="0.4"
                          />
                        </g>
                      )}

                      {/* Top-Right Badge: ABORT Pill for Pruned */}
                      {isPruned && showPruningLayer && (
                        <g transform={`translate(${halfW - 12}, ${-halfH})`}>
                          <rect
                            x="-16"
                            y="-7"
                            width="32"
                            height="14"
                            rx="4"
                            fill="#e11d48"
                            stroke="#f43f5e"
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            dy="3.5"
                            className="font-mono text-[8px] font-extrabold fill-white select-none"
                          >
                            ABORT
                          </text>
                        </g>
                      )}

                      {/* Top-Right Badge: ⚡MEMO Pill for Memoized Nodes */}
                      {isMemoHit && (
                        <g transform={`translate(${halfW - 14}, ${-halfH})`}>
                          <rect
                            x="-18"
                            y="-7"
                            width="36"
                            height="14"
                            rx="4"
                            fill="#0891b2"
                            stroke="#22d3ee"
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            dy="3.5"
                            className="font-mono text-[8px] font-extrabold fill-white select-none"
                          >
                            ⚡MEMO
                          </text>
                        </g>
                      )}

                      {/* Top-Right Badge: ✓ DONE Pill for Completed Subtrees */}
                      {isSuccess && (
                        <g transform={`translate(${halfW - 14}, ${-halfH})`}>
                          <rect
                            x="-16"
                            y="-7"
                            width="32"
                            height="14"
                            rx="4"
                            fill="#065f46"
                            stroke="#10b981"
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            dy="3.5"
                            className="font-mono text-[8px] font-extrabold fill-emerald-200 select-none"
                          >
                            ✓ DONE
                          </text>
                        </g>
                      )}

                      {/* Active In-Flight Primary Indicator Dot */}
                      {isActive && !isPruned && !isMemoHit && (
                        <circle cx={halfW - 8} cy={-halfH + 8} r="5" fill="#38bdf8" className="animate-pulse" />
                      )}

                      {/* Node Label */}
                      <text
                        textAnchor="middle"
                        dy="3.5"
                        className="font-mono text-[10px] font-bold select-none truncate"
                        fill={textFill}
                      >
                        {isMemoHit
                          ? node.returnValue !== undefined
                            ? `⚡ CACHED: ${node.returnValue}`
                            : `⚡ ${node.label || "HIT"}`
                          : node.label && node.label.length > 11
                            ? node.label.slice(0, 10) + "…"
                            : node.label || node.id}
                      </text>

                      {/* Specific Constraint Violation or Memoization tag displayed underneath */}
                      {isPruned && showPruningLayer && (
                        <text
                          dy={halfH + 13}
                          textAnchor="middle"
                          fill="#fda4af"
                          className="font-mono text-[9px] font-bold select-none"
                        >
                          {node.pruneReason || "limit exceeded"}
                        </text>
                      )}
                      {isMemoHit && (
                        <text
                          dy={halfH + 13}
                          textAnchor="middle"
                          fill="#67e8f9"
                          className="font-mono text-[8px] font-semibold select-none"
                        >
                          O(1) SUBTREE BYPASS
                        </text>
                      )}
                      {isSuccess && node.returnValue !== undefined && (
                        <text
                          dy={halfH + 13}
                          textAnchor="middle"
                          fill="#6ee7b7"
                          className="font-mono text-[8.5px] font-bold select-none"
                        >
                          RET: {String(node.returnValue)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM PANEL: Live Memoization Cache Inspector */}
      {memoTable && Object.keys(memoTable).length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-cyan-500/40 bg-card/75 p-3.5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex size-6 items-center justify-center rounded-md border border-cyan-500/50 bg-cyan-950/60 text-cyan-400 shadow-xs">
                <Zap className="size-3.5" />
              </div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Live Memoization Cache Inspector
              </span>
              <span className="rounded-full bg-cyan-950/80 border border-cyan-500/50 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                {Object.keys(memoTable).length} Cached Subproblem{Object.keys(memoTable).length === 1 ? "" : "s"}
              </span>
              {memoHitKey && (
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 border border-cyan-400/60 px-2 py-0.5 font-mono text-[10px] font-extrabold text-cyan-300 animate-pulse">
                  <Zap className="size-2.5 text-cyan-400" /> Active Hit: {memoHitKey}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsMemoInspectorOpen((prev) => !prev)}
              className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{isMemoInspectorOpen ? "Collapse" : "Expand"}</span>
              {isMemoInspectorOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>

          {isMemoInspectorOpen && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Object.entries(memoTable).map(([key, val]) => {
                  const isHit = memoHitKey === key;
                  return (
                    <div
                      key={key}
                      className={`flex flex-col rounded-lg border p-2 font-mono transition-all duration-200 ${
                        isHit
                          ? "border-cyan-400 bg-cyan-950/80 shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400/60 scale-[1.02]"
                          : "border-border/70 bg-card/60 hover:border-cyan-500/40 hover:bg-card/90"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-muted-foreground truncate font-semibold">{key}</span>
                        {isHit && (
                          <span className="rounded bg-cyan-500/30 px-1 text-[8px] font-extrabold text-cyan-200 animate-pulse">
                            ⚡ O(1) HIT
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className={`text-xs font-bold truncate ${isHit ? "text-cyan-200" : "text-foreground"}`}>
                          → {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cache Telemetry Summary Bar */}
              <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-[10px] text-muted-foreground border-t border-border/40 mt-1">
                <span>
                  Cache Size: <strong className="text-foreground">{Object.keys(memoTable).length}</strong> entries
                </span>
                <span>
                  Total Cache Hits: <strong className="text-cyan-400">{memoHitCount}</strong>
                </span>
                <span>
                  Subtree Evaluations Bypassed: <strong className="text-emerald-400">{memoHitCount}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

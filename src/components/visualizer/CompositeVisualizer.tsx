import React, { useMemo, useState } from "react";
import type {
  Val,
  CompositeLayoutMode,
  CompositeLayoutState,
  BracketPair,
  EvalExpression,
  MonotonicDequeState,
  CircularBufferState,
  QueueBfsLevel,
  DnfPartition,
  BinarySearchPartition,
  SlidingWindowSpan,
  PrefixSumProjection,
  CyclicSortJump,
  ArraySwapFlight,
  DirectionRay,
  WaveDistance,
  BacktrackingPathRibbon,
  NQueensConflictRay,
  MatrixRotationOrbit,
  Kernel8Neighbor,
  GridPredecessorArrow,
  TreeTraversalState,
  TreeStructuralState,
  BstState,
  TrieState,
  GraphEdgeItem,
  GraphSearchState,
  TopologicalSortState,
  UnionFindState,
  WordLadderState,
  Dp1DState,
  Dp2DState,
  BitRegisterState,
} from "./VisualizerTypes";
import { safeArray, safeMatrix, toText, coordKey } from "./VisualizerTypes";
import {
  Layers,
  ArrowRightLeft,
  ArrowRight,
  Database,
  Grid,
  Network,
  Binary,
  GitBranch,
  Split,
  Eye,
  Activity,
  CheckCircle2,
  Table,
  Zap,
  Cpu,
  TrendingUp,
  Maximize2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { ArrayVisualizer } from "./ArrayVisualizer";
import { StackQueueVisualizer } from "./StackQueueVisualizer";
import { HashMapVisualizer } from "./HashMapVisualizer";
import { TreeVisualizer } from "./TreeVisualizer";
import { MatrixVisualizer } from "./MatrixVisualizer";
import { GraphVisualizer } from "./GraphVisualizer";

export interface CompositeVisualizerProps {
  mode: CompositeLayoutMode;
  compositeState?: CompositeLayoutState | null;
  // Primary & secondary datasets
  array?: Val[] | null;
  secondaryArray?: Val[] | null;
  left?: number | null;
  right?: number | null;
  left2?: number | null;
  right2?: number | null;
  stack?: Val[] | null;
  secondaryStack?: Val[] | null;
  queue?: Val[] | null;
  secondaryQueue?: Val[] | null;
  map?: Record<string, number | string | null> | null;
  set?: Val[] | null;
  tree?: (Val | null)[] | null;
  matrix?: (number | string)[][] | null;
  cols?: number | null;
  graphEdges?: GraphEdgeItem[] | null;
  current?: Val | null;
  predecessor?: Val | null;
  visited?: Val[];
  wSum?: number | null;
  mSum?: number | null;
  desc?: string;
  variables?: Record<string, any> | null;
  // Specialized states
  pointer_labels?: Record<string, string> | null;
  direction?: string | null;
  frontier?: (string | [number, number])[] | null;
  distanceLayer?: number | null;
  trail?: (string | [number, number])[] | null;
  histogramSpan?: any;
  waterTrapped?: any;
  sightlines?: any;
  stackInvariant?: any;
  resultArray?: (number | string | null)[] | null;
  distances?: Record<string, number | string | null> | null;
  priorityQueue?: { node: string | number; dist: number | string }[] | null;
  topologicalSortState?: TopologicalSortState | null;
  unionFindState?: UnionFindState | null;
  treeTraversal?: TreeTraversalState | null;
  bstState?: BstState | null;
}

export function CompositeVisualizer({
  mode,
  compositeState,
  array: rawArray,
  secondaryArray: rawSecondaryArray,
  left,
  right,
  left2,
  right2,
  stack: rawStack,
  secondaryStack: rawSecondaryStack,
  queue: rawQueue,
  secondaryQueue: rawSecondaryQueue,
  map: rawMap,
  set: rawSet,
  tree: rawTree,
  matrix: rawMatrix,
  cols,
  graphEdges,
  current,
  predecessor,
  visited = [],
  wSum,
  mSum,
  desc = "",
  variables,
  pointer_labels,
  direction,
  frontier,
  distanceLayer,
  trail,
  histogramSpan,
  waterTrapped,
  sightlines,
  stackInvariant,
  resultArray,
  distances,
  priorityQueue,
  topologicalSortState,
  unionFindState,
  treeTraversal,
  bstState,
}: CompositeVisualizerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"side-by-side" | "sync-links" | "pipeline">("side-by-side");

  const primaryArray = useMemo(() => safeArray(rawArray ?? []), [rawArray]);
  const secondaryArray = useMemo(() => (rawSecondaryArray ? safeArray(rawSecondaryArray) : []), [rawSecondaryArray]);
  const stackItems = useMemo(() => safeArray(rawStack ?? []), [rawStack]);
  const queueItems = useMemo(() => safeArray(rawQueue ?? []), [rawQueue]);
  const matrixGrid = useMemo(() => (rawMatrix ? safeMatrix(rawMatrix) : []), [rawMatrix]);

  // Determine mode details
  const modeConfig = useMemo(() => {
    switch (mode) {
      case "dual-array":
        return {
          title: "Synchronized Dual Array Engine",
          badge: "Merge & Two-Pointer Cross-Search",
          icon: <Split className="size-4 text-cyan-400" />,
          color: "border-cyan-500/30 bg-cyan-500/5",
          primaryPaneTitle: compositeState?.primaryTitle ?? "Array A (Primary Stream / Source 1)",
          secondaryPaneTitle: compositeState?.secondaryTitle ?? "Array B (Secondary Stream / Source 2)",
          description: "Dual pointers moving concurrently across two synchronized linear datasets.",
        };
      case "array-stack":
        return {
          title: "Array & Active LIFO / Monotonic Stack Pair",
          badge: "Array Stream ↔ Monotonic Stack",
          icon: <Layers className="size-4 text-indigo-400" />,
          color: "border-indigo-500/30 bg-indigo-500/5",
          primaryPaneTitle: compositeState?.primaryTitle ?? "Input Sequence / Array Stream",
          secondaryPaneTitle: compositeState?.secondaryTitle ?? "Active LIFO / Monotonic Stack",
          description: "Tracks incoming array elements being pushed or popped maintaining stack invariants.",
        };
      case "array-hashmap":
        return {
          title: "Array Traversal & Live Hash Table Registry",
          badge: "Two-Sum & Frequency Complement Map",
          icon: <Database className="size-4 text-emerald-400" />,
          color: "border-emerald-500/30 bg-emerald-500/5",
          primaryPaneTitle: compositeState?.primaryTitle ?? "Array Traversal Stream",
          secondaryPaneTitle: compositeState?.secondaryTitle ?? "Dynamic Key-Value Hash Map / Complement Table",
          description: "Direct O(1) associative lookup pairing scanned values against complement registry entries.",
        };
      case "tree-stack":
        return {
          title: "Binary Tree & Traversal Call Stack / Frame Buffer",
          badge: "Hierarchical Topology ↔ Call Stack",
          icon: <GitBranch className="size-4 text-amber-400" />,
          color: "border-amber-500/30 bg-amber-500/5",
          primaryPaneTitle: compositeState?.primaryTitle ?? "Binary Tree Structural Layout",
          secondaryPaneTitle: compositeState?.secondaryTitle ?? "DFS Traversal Stack & Frame Buffer",
          description: "Visualizes recursion state and node path resolution across tree branches.",
        };
      case "matrix-queue":
        return {
          title: "2D Grid & Active BFS Coordinate Frontier Queue",
          badge: "2D Matrix ↔ Wavefront Queue",
          icon: <Grid className="size-4 text-teal-400" />,
          color: "border-teal-500/30 bg-teal-500/5",
          primaryPaneTitle: compositeState?.primaryTitle ?? "2D Exploration Grid / Matrix Canvas",
          secondaryPaneTitle: compositeState?.secondaryTitle ?? "BFS Wavefront Coordinate Queue [r, c]",
          description: "Shows wave expansion from active cell with synchronized enqueueing and dequeueing.",
        };
      case "matrix-stack":
        return {
          title: "2D Grid & DFS Backtracking Recursion Stack",
          badge: "2D Grid ↔ Backtracking Ribbon Stack",
          icon: <Grid className="size-4 text-rose-400" />,
          color: "border-rose-500/30 bg-rose-500/5",
          primaryPaneTitle: compositeState?.primaryTitle ?? "2D Grid Maze / Island Matrix",
          secondaryPaneTitle: compositeState?.secondaryTitle ?? "DFS Exploration Stack & Backtracking Trail",
          description: "Deep dive traversal exploring branch depth before backtracking to previous bifurcations.",
        };
      case "graph-table":
        return {
          title: "Node-Link Graph & Metric Tracking State Table",
          badge: "Graph Topology ↔ Distance / In-Degree Table",
          icon: <Network className="size-4 text-purple-400" />,
          color: "border-purple-500/30 bg-purple-500/5",
          primaryPaneTitle: compositeState?.primaryTitle ?? "Node-Link Topology & Adjacency Canvas",
          secondaryPaneTitle: compositeState?.secondaryTitle ?? "Metric State Table (Distances / In-Degrees / Parents)",
          description: "Pairs topology with tabular relaxation metrics, in-degree counters, and shortest paths.",
        };
      default:
        return {
          title: "Synchronized Composite Dual Structure",
          badge: "Multi-Data Synchronized View",
          icon: <Layers className="size-4 text-primary" />,
          color: "border-border/80 bg-card/60",
          primaryPaneTitle: "Primary Data Structure",
          secondaryPaneTitle: "Secondary Data Structure",
          description: "Coordinated dual-pane view synchronizing multiple data structures side by side.",
        };
    }
  }, [mode, compositeState]);

  // Render Left (Primary) Pane
  const renderPrimaryPane = () => {
    switch (mode) {
      case "dual-array":
        return (
          <ArrayVisualizer
            cells={primaryArray}
            left={left}
            right={right}
            current={current}
            visited={visited}
            wSum={wSum}
            mSum={mSum}
            label1={compositeState?.primaryTitle ?? "Array A"}
            pointer_labels={pointer_labels}
          />
        );
      case "array-stack":
      case "array-hashmap":
        return (
          <ArrayVisualizer
            cells={primaryArray}
            left={left}
            right={right}
            current={current}
            visited={visited}
            wSum={wSum}
            mSum={mSum}
            label1={compositeState?.primaryTitle ?? "Input Stream"}
            pointer_labels={pointer_labels}
          />
        );
      case "tree-stack":
        return (
          <TreeVisualizer
            treeData={rawTree ?? primaryArray}
            current={current ?? null}
            visited={visited}
            type="tree"
            treeTraversal={treeTraversal}
            bstState={bstState}
          />
        );
      case "matrix-queue":
      case "matrix-stack":
        return (
          <MatrixVisualizer
            matrix={matrixGrid}
            cols={cols ?? (matrixGrid[0]?.length || 1)}
            current={current}
            visited={visited}
            direction={direction}
            frontier={frontier}
            distanceLayer={distanceLayer}
            trail={trail}
            wSum={wSum}
            mSum={mSum}
          />
        );
      case "graph-table":
        return (
          <GraphVisualizer
            matrix={matrixGrid.length > 0 ? matrixGrid : undefined}
            cols={cols ?? (matrixGrid[0]?.length || 1)}
            current={current}
            visited={visited}
            type="graph"
            graphEdges={graphEdges}
            distances={distances}
            priorityQueue={priorityQueue}
            topologicalSortState={topologicalSortState}
            unionFindState={unionFindState}
            desc={desc}
            variables={variables}
          />
        );
      default:
        return (
          <ArrayVisualizer
            cells={primaryArray}
            left={left}
            right={right}
            current={current}
            visited={visited}
          />
        );
    }
  };

  // Render Right (Secondary / Complementary) Pane
  const renderSecondaryPane = () => {
    switch (mode) {
      case "dual-array":
        return (
          <ArrayVisualizer
            cells={secondaryArray}
            left={left2 ?? 0}
            right={right2 ?? secondaryArray.length - 1}
            current={current}
            visited={visited}
            label1={compositeState?.secondaryTitle ?? "Array B"}
            pointer_labels={{
              left: pointer_labels?.left2 ?? "Pointer B (L2)",
              right: pointer_labels?.right2 ?? "Pointer B (R2)",
            }}
          />
        );
      case "array-stack":
      case "tree-stack":
      case "matrix-stack":
        return (
          <StackQueueVisualizer
            items={stackItems.length > 0 ? stackItems : safeArray(variables?.stack ?? [])}
            secondaryItems={rawSecondaryStack ? safeArray(rawSecondaryStack) : null}
            current={current ?? null}
            visited={visited}
            type="stack"
            label1={compositeState?.secondaryTitle ?? "Active Stack"}
            desc={desc}
            variables={variables}
            left={left}
            stream={primaryArray}
          />
        );
      case "array-hashmap":
        return (
          <HashMapVisualizer
            map={rawMap ?? (variables?.map ? variables.map : variables?.lookup ? variables.lookup : null)}
            set={rawSet ?? (variables?.set ? variables.set : null)}
            current={current}
            visited={visited}
            type="hashmap"
            desc={desc}
          />
        );
      case "matrix-queue":
        return (
          <div className="flex flex-col gap-3">
            <StackQueueVisualizer
              items={queueItems.length > 0 ? queueItems : frontier ? frontier.map(toText) : safeArray(variables?.queue ?? [])}
              secondaryItems={rawSecondaryQueue ? safeArray(rawSecondaryQueue) : null}
              current={current ?? null}
              visited={visited}
              type="queue"
              label1={compositeState?.secondaryTitle ?? "Active BFS Queue"}
              desc={desc}
              variables={variables}
            />
            {/* Coordinate Pairs Visual List */}
            {frontier && frontier.length > 0 && (
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-3 text-xs font-mono">
                <div className="flex items-center justify-between text-teal-400 font-bold mb-2">
                  <span>Wavefront Coordinates [r, c]</span>
                  <span className="text-[10px] bg-teal-500/20 px-2 py-0.5 rounded">{frontier.length} Enqueued</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {frontier.map((c, i) => (
                    <span key={i} className="px-2 py-1 rounded bg-background/80 border border-border text-foreground font-bold shadow-xs">
                      {toText(c)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "graph-table":
        return (
          <div className="flex flex-col gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-400">
              <div className="flex items-center gap-2">
                <Table className="size-4" />
                <span>Vertex Tracking & Metric Table</span>
              </div>
              <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded text-purple-300">
                {distances ? Object.keys(distances).length : 0} Vertices
              </span>
            </div>

            {/* Dijkstra Distances or Topological In-Degrees Table */}
            {distances && Object.keys(distances).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px]">
                      <th className="p-2">Vertex</th>
                      <th className="p-2">Shortest Distance</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(distances).map(([node, dist]) => {
                      const isActive = String(current) === node;
                      const isInf = dist === Infinity || dist === "INF" || dist === "∞";
                      return (
                        <tr
                          key={node}
                          className={`border-b border-border/30 transition-colors ${
                            isActive ? "bg-purple-500/20 text-purple-200 font-bold" : "text-muted-foreground"
                          }`}
                        >
                          <td className="p-2 font-bold text-foreground">Node [{node}]</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded font-black ${isInf ? "text-muted-foreground bg-muted" : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"}`}>
                              {isInf ? "∞" : dist}
                            </span>
                          </td>
                          <td className="p-2">
                            {isActive ? (
                              <span className="text-[10px] text-purple-300 font-bold bg-purple-500/30 px-1.5 py-0.5 rounded">
                                Actively Relaxing
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Recorded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : topologicalSortState ? (
              <div className="flex flex-col gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl border border-border/60 bg-background/80">
                  <span className="text-muted-foreground">Processed DAG Order: </span>
                  <strong className="text-foreground">
                    {topologicalSortState.processedOrder.length > 0 ? topologicalSortState.processedOrder.join(" → ") : "None"}
                  </strong>
                </div>
                {topologicalSortState.inDegrees && (
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(topologicalSortState.inDegrees).map(([node, deg]) => (
                      <div key={node} className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-card/60">
                        <span className="font-bold">Node {node}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${deg === 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                          in: {deg}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center font-mono text-xs text-muted-foreground">
                No active tracking table entries for current step.
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="p-4 text-center font-mono text-xs text-muted-foreground">
            Secondary data structure pane active.
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. TOP COMPOSITE SYNCHRONIZATION HEADER */}
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border ${modeConfig.color} p-4 shadow-sm backdrop-blur-sm`}>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-background/80 border border-border/80 shadow-xs">
            {modeConfig.icon}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>{modeConfig.title}</span>
              <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-[10px] text-foreground border border-border/80 font-bold">
                {modeConfig.badge}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {modeConfig.description}
            </div>
          </div>
        </div>

        {/* Cross-Link Active Action Badge */}
        {compositeState?.activeRelation && (
          <div className="flex items-center gap-2 rounded-xl bg-background/90 border border-border/80 px-3 py-1.5 font-mono text-xs shadow-xs">
            <Zap className="size-3.5 text-amber-400" />
            <span className="font-semibold text-muted-foreground uppercase text-[10px]">Action:</span>
            <span className="font-bold text-foreground">{compositeState.activeRelation.type.toUpperCase()}</span>
            {compositeState.activeRelation.description && (
              <span className="text-[11px] text-muted-foreground hidden md:inline">
                • {compositeState.activeRelation.description}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. DUAL-PANE SYNCHRONIZED GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* PRIMARY STRUCTURE PANE (7 COLS ON LARGE) */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary shadow-xs shadow-primary" />
              <span>{modeConfig.primaryPaneTitle}</span>
            </div>
            <span>Pane 1</span>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            {renderPrimaryPane()}
          </div>
        </div>

        {/* SYNCHRONIZATION CONNECTOR ARROW (DESKTOP CENTER / MOBILE VERTICAL) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400" />
              <span>{modeConfig.secondaryPaneTitle}</span>
            </div>
            <span>Pane 2</span>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
            {renderSecondaryPane()}
          </div>
        </div>
      </div>

      {/* 3. CROSS-STRUCTURE POINTERS & RELATIONSHIPS FOOTER */}
      {compositeState?.crossPointers && compositeState.crossPointers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/60 p-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 font-bold text-foreground mr-2">
            <ArrowRightLeft className="size-3.5 text-primary" />
            <span>Cross-Pane Pointers:</span>
          </div>
          {compositeState.crossPointers.map((cp, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/80 px-2.5 py-1 text-[11px]"
            >
              <span className="text-muted-foreground">[{toText(cp.fromIndex)}]</span>
              <ArrowRight className="size-3 text-cyan-400" />
              <span className="font-bold text-foreground">[{toText(cp.toIndex)}]</span>
              {cp.label && <span className="text-muted-foreground text-[10px]">({cp.label})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

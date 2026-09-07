import React, { useMemo, useState, useEffect } from "react";
import type {
  Val,
  GraphEdgeItem,
  GraphSearchState,
  TopologicalSortState,
  UnionFindState,
  WordLadderState,
  ShortestPathAlgorithmState,
  MstAlgorithmState,
} from "./VisualizerTypes";
import { coordKey, safeArray, safeMatrix, toText } from "./VisualizerTypes";
import {
  Network,
  Table,
  Layers,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GitFork,
  Compass,
  RotateCcw,
  Play,
  Pause,
  Plus,
  Trash2,
  ShieldCheck,
  ListOrdered,
  RefreshCw,
  Search,
  Eye,
  Hash,
  Database,
  Route,
  Zap,
  GitMerge,
  XCircle,
  Scissors,
  Scale,
  ListFilter,
} from "lucide-react";

interface GraphVisualizerProps {
  matrix?: Val[][] | null | undefined;
  cols?: number | null | undefined;
  current?: Val | null | undefined;
  visited?: Val[];
  type: "graph" | "matrix";
  distances?: Record<string, number | string | null> | null;
  priorityQueue?: { node: string | number; dist: number | string }[] | null;
  relaxedEdge?: {
    from: string;
    to: string;
    weight: number | string;
    oldDist?: number | string;
    newDist?: number | string;
  } | null;
  shortestPathTree?: { from: string; to: string }[] | null;
  shortestPathState?: ShortestPathAlgorithmState | null;
  mstState?: MstAlgorithmState | null;
  graphEdges?: GraphEdgeItem[] | null;
  isDirected?: boolean;
  graphSearchState?: GraphSearchState | null;
  topologicalSortState?: TopologicalSortState | null;
  unionFindState?: UnionFindState | null;
  wordLadderState?: WordLadderState | null;
  desc?: string;
  variables?: Record<string, any> | null;
}

interface InternalGraphNode {
  id: string;
  x: number;
  y: number;
  inDegree: number;
  outDegree: number;
  state?: "unvisited" | "frontier" | "exploring" | "visited";
}

interface InternalGraphEdge {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  weight?: string | number;
  isDirected: boolean;
  isDiscovery?: boolean;
}

export function GraphVisualizer({
  matrix: rawMatrix,
  cols: rawCols,
  current,
  visited: rawVisited,
  type,
  distances,
  priorityQueue,
  relaxedEdge,
  shortestPathTree,
  shortestPathState: propShortestPathState,
  mstState: propMstState,
  graphEdges: propGraphEdges,
  isDirected: propIsDirected,
  graphSearchState: propGraphSearchState,
  topologicalSortState: propTopologicalSortState,
  unionFindState: propUnionFindState,
  wordLadderState: propWordLadderState,
  desc: propDesc = "",
  variables,
}: GraphVisualizerProps) {
  const matrix = useMemo(() => safeMatrix(rawMatrix ?? []), [rawMatrix]);
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const cols = Number(rawCols ?? matrix[0]?.length ?? 1) || 1;
  const rows = matrix.length;

  // Active hover inspection
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Auto-detect mode: 'network' | 'shortest-path' | 'mst' | 'topological' | 'union-find' | 'word-ladder' | 'grid'
  const detectedMode = useMemo<"network" | "shortest-path" | "mst" | "topological" | "union-find" | "word-ladder" | "grid">(() => {
    if (type === "matrix") return "grid";
    if (propMstState || /kruskal|prim|minimum-spanning-tree|mst|min-cost-to-connect|connecting-cities/i.test(propDesc)) {
      return "mst";
    }
    if (propShortestPathState || distances || priorityQueue || relaxedEdge || shortestPathTree || /dijkstra|bellman-ford|floyd-warshall|network-delay|cheapest-flight|shortest-path/i.test(propDesc)) {
      return "shortest-path";
    }
    if (propWordLadderState || /word-ladder|word_ladder|mutation|gene/i.test(propDesc)) {
      return "word-ladder";
    }
    if (propTopologicalSortState || /course-schedule|alien-dictionary|topological|kahn/i.test(propDesc)) {
      return "topological";
    }
    if (propUnionFindState || /redundant-connection|number-of-provinces|accounts-merge|union-find|dsu/i.test(propDesc)) {
      return "union-find";
    }
    return "network";
  }, [type, propMstState, propShortestPathState, propWordLadderState, propTopologicalSortState, propUnionFindState, distances, priorityQueue, relaxedEdge, shortestPathTree, propDesc]);

  const [activeTab, setActiveTab] = useState<"network" | "shortest-path" | "mst" | "topological" | "union-find" | "word-ladder" | "matrix-view">(
    detectedMode === "grid" ? "network" : detectedMode
  );

  useEffect(() => {
    if (detectedMode !== "grid") {
      setActiveTab(detectedMode);
    }
  }, [detectedMode]);

  // Directed vs Undirected graph flag
  const isDirected = useMemo(() => {
    if (typeof propIsDirected === "boolean") return propIsDirected;
    if (activeTab === "mst") return false; // MST is by definition on undirected graphs
    if (activeTab === "topological" || activeTab === "shortest-path" || activeTab === "word-ladder") return true;
    if (variables?.isDirected !== undefined) return Boolean(variables.isDirected);
    if (/directed|dag|topological|course|alien|dependencies/i.test(propDesc)) return true;
    return false;
  }, [propIsDirected, activeTab, variables, propDesc]);

  const currentKey = coordKey(current);
  const seenKeys = useMemo(() => {
    return new Set(visited.map((item) => coordKey(item)));
  }, [visited]);

  // Determine if this is a pure 2D Grid BFS/DFS problem (e.g. number of islands)
  const is2DGrid = useMemo(() => {
    if (type === "matrix") return true;
    if (matrix.length > 1 && cols > 1 && matrix[0]?.length !== matrix.length) return true;
    if (currentKey.includes(",") || visited.some((v) => coordKey(v).includes(","))) return true;
    return false;
  }, [type, matrix, cols, currentKey, visited]);

  // ---------------------------------------------------------------------------
  // 1. TOPOLOGICAL SORT (KAHN'S ALGORITHM) STATE & SIMULATOR
  // ---------------------------------------------------------------------------
  const topoData = useMemo<TopologicalSortState>(() => {
    if (propTopologicalSortState) return propTopologicalSortState;

    // Build from variables or matrix edge list
    const inDegs: Record<string, number> = {};
    const q: string[] = [];
    const order: string[] = [];

    if (variables?.inDegrees && typeof variables.inDegrees === "object") {
      Object.entries(variables.inDegrees).forEach(([k, v]) => {
        inDegs[k] = Number(v);
      });
    }

    if (Array.isArray(variables?.queue)) {
      variables.queue.forEach((item: any) => q.push(String(item)));
    }

    const orderArr = variables?.order ?? variables?.result;
    if (Array.isArray(orderArr)) {
      orderArr.forEach((item: any) => order.push(String(item)));
    }

    const hasCycle = Boolean(variables?.hasCycle ?? /cycle|deadlock/i.test(propDesc));

    return {
      inDegrees: Object.keys(inDegs).length > 0 ? inDegs : { "0": 0, "1": 1, "2": 1, "3": 2 },
      zeroInDegreeQueue: q.length > 0 ? q : ["0"],
      processedOrder: order.length > 0 ? order : ["0"],
      activeNode: current !== null && current !== undefined ? String(current) : "0",
      hasCycle,
      cycleNodes: hasCycle ? ["1", "0"] : [],
    };
  }, [propTopologicalSortState, variables, current, propDesc]);

  // ---------------------------------------------------------------------------
  // 2. DISJOINT SET UNION (UNION-FIND / DSU) STATE & SIMULATOR
  // ---------------------------------------------------------------------------
  const dsuData = useMemo<UnionFindState>(() => {
    if (propUnionFindState) return propUnionFindState;

    const parents: Record<string, string> = {};
    const ranks: Record<string, number> = {};

    if (variables?.parent && typeof variables.parent === "object") {
      Object.entries(variables.parent).forEach(([k, v]) => {
        parents[k] = String(v);
      });
    } else if (Array.isArray(variables?.parents)) {
      variables.parents.forEach((p: any, i: number) => {
        parents[String(i)] = String(p);
      });
    } else {
      // Default sample DSU for redundant connection or provinces
      parents["1"] = "1";
      parents["2"] = "1";
      parents["3"] = "1";
      parents["4"] = "4";
      parents["5"] = "4";
    }

    const isRedundant = Boolean(variables?.isRedundant ?? /redundant|cycle/i.test(propDesc));

    return {
      parents,
      ranks: ranks,
      activeEdge: variables?.edge ? { u: variables.edge[0], v: variables.edge[1] } : { u: "2", v: "3" },
      rootU: variables?.rootU ?? "1",
      rootV: variables?.rootV ?? "1",
      action: isRedundant ? "cycle_detected" : variables?.action ?? "union",
      isRedundant,
      redundantEdge: isRedundant ? [2, 3] : null,
      numComponents: variables?.components ?? 2,
    };
  }, [propUnionFindState, variables, propDesc]);

  // ---------------------------------------------------------------------------
  // 3. WORD LADDER STATE-SPACE TRANSFORMATION GRAPH
  // ---------------------------------------------------------------------------
  const wordLadderData = useMemo<WordLadderState>(() => {
    if (propWordLadderState) return propWordLadderState;

    const words = Array.isArray(variables?.wordList)
      ? variables.wordList.map(String)
      : ["hit", "hot", "dot", "dog", "lot", "log", "cog"];

    const path = Array.isArray(variables?.path)
      ? variables.path.map(String)
      : ["hit", "hot", "dot", "dog", "cog"];

    return {
      beginWord: variables?.beginWord ?? "hit",
      endWord: variables?.endWord ?? "cog",
      wordList: words,
      currentWord: current !== null && current !== undefined ? String(current) : "dog",
      activePath: path,
      distance: path.length,
      visitedWords: Array.isArray(variables?.visitedWords) ? variables.visitedWords : ["hit", "hot", "dot"],
      frontierWords: Array.isArray(variables?.queue) ? variables.queue : ["dog", "lot"],
    };
  }, [propWordLadderState, variables, current]);

  // ---------------------------------------------------------------------------
  // 4. SHORTEST PATH (DIJKSTRA / BELLMAN-FORD / A*) STATE SYNTHESIZER
  // ---------------------------------------------------------------------------
  const shortestPathData = useMemo<ShortestPathAlgorithmState | null>(() => {
    if (propShortestPathState) return propShortestPathState;

    const isShortestPathContext = Boolean(
      distances ||
      priorityQueue ||
      relaxedEdge ||
      shortestPathTree ||
      /dijkstra|bellman-ford|floyd-warshall|cheapest-flight|network-delay|shortest-path/i.test(propDesc)
    );
    if (!isShortestPathContext && activeTab !== "shortest-path") return null;

    const distMap: Record<string, number | string | null> = distances ? { ...distances } : {};
    if (variables?.dist && typeof variables.dist === "object") {
      Object.entries(variables.dist).forEach(([k, v]) => { distMap[k] = v as any; });
    } else if (Array.isArray(variables?.dist)) {
      variables.dist.forEach((v: any, i: number) => { distMap[String(i)] = v; });
    } else if (Object.keys(distMap).length === 0) {
      distMap["0"] = 0;
      distMap["1"] = 4;
      distMap["2"] = 2;
      distMap["3"] = 7;
      distMap["4"] = "∞";
    }

    const pq = priorityQueue ?? (Array.isArray(variables?.pq) ? variables.pq : (Array.isArray(variables?.priorityQueue) ? variables.priorityQueue : null));
    const spt = shortestPathTree ?? (Array.isArray(variables?.spt) ? variables.spt : null);

    let activeRelaxation = relaxedEdge;
    if (!activeRelaxation && variables?.relaxedEdge) {
      activeRelaxation = variables.relaxedEdge;
    } else if (!activeRelaxation && variables?.u !== undefined && variables?.v !== undefined) {
      const u = String(variables.u);
      const v = String(variables.v);
      const w = variables.w ?? variables.weight ?? 0;
      const oldD = distMap[v] ?? "∞";
      const newD = variables.newDist ?? (typeof distMap[u] === "number" ? Number(distMap[u]) + Number(w) : undefined);
      const isRelaxed = typeof newD === "number" && (oldD === "∞" || oldD === Infinity || Number(oldD) > newD);
      activeRelaxation = {
        from: u,
        to: v,
        weight: w,
        oldDist: oldD,
        newDist: isRelaxed ? newD : oldD,
      };
    }

    const isBellman = /bellman|pass|iteration/i.test(propDesc) || typeof variables?.pass === "number";
    const algo = isBellman ? "bellman_ford" : (/astar/i.test(propDesc) ? "astar" : "dijkstra");

    const source = variables?.src ?? variables?.source ?? variables?.start ?? "0";
    const target = variables?.dst ?? variables?.target ?? variables?.destination ?? null;
    const stops = variables?.k ?? variables?.stops ?? variables?.stopsRemaining ?? null;

    return {
      algorithm: algo,
      sourceNode: String(source),
      targetNode: target !== null && target !== undefined ? String(target) : null,
      distances: distMap,
      priorityQueue: pq ? pq.map((item: any) => ({
        node: String(item.node ?? item[1] ?? item.u ?? item.vertex ?? "0"),
        dist: item.dist ?? item[0] ?? item.d ?? item.weight ?? 0,
        hops: item.hops ?? item.k ?? undefined,
      })) : [
        { node: "2", dist: 2 },
        { node: "1", dist: 4 },
        { node: "3", dist: 7 },
      ],
      activeEdge: activeRelaxation ? {
        from: String(activeRelaxation.from),
        to: String(activeRelaxation.to),
        weight: activeRelaxation.weight,
        currentDist: activeRelaxation.oldDist,
        candidateDist: activeRelaxation.newDist,
        status: (activeRelaxation.newDist !== undefined && activeRelaxation.oldDist !== undefined && String(activeRelaxation.newDist) !== String(activeRelaxation.oldDist)) ? "relaxed" : "kept",
        formula: `dist[${activeRelaxation.from}] + ${activeRelaxation.weight} = ${activeRelaxation.newDist} < dist[${activeRelaxation.to}](${activeRelaxation.oldDist})`,
      } : null,
      currentPass: typeof variables?.pass === "number" ? variables.pass : (typeof variables?.k === "number" && isBellman ? variables.k : undefined),
      totalPasses: typeof variables?.totalPasses === "number" ? variables.totalPasses : (isBellman ? 4 : undefined),
      shortestPathTree: spt ? spt.map((e: any) => ({ from: String(e.from ?? e[0]), to: String(e.to ?? e[1]) })) : [
        { from: "0", to: "2" },
        { from: "2", to: "1" },
        { from: "1", to: "3" },
      ],
      reconstructedPath: Array.isArray(variables?.path) ? variables.path.map(String) : [String(source), "2", "1", "3"],
      stopsRemaining: stops !== null ? Number(stops) : undefined,
    };
  }, [propShortestPathState, distances, priorityQueue, relaxedEdge, shortestPathTree, propDesc, variables, activeTab]);

  // ---------------------------------------------------------------------------
  // 5. MINIMUM SPANNING TREE (KRUSKAL'S / PRIM'S) STATE SYNTHESIZER
  // ---------------------------------------------------------------------------
  const mstData = useMemo<MstAlgorithmState | null>(() => {
    if (propMstState) return propMstState;

    const isMstContext = /kruskal|prim|minimum-spanning-tree|mst|min-cost-to-connect|connecting-cities/i.test(propDesc);
    if (!isMstContext && !variables?.mstEdges && !variables?.totalWeight && !variables?.minCost && activeTab !== "mst") return null;

    const isPrim = /prim/i.test(propDesc) || variables?.algorithm === "prim";
    const algo = isPrim ? "prim" : "kruskal";

    const totalW = variables?.totalWeight ?? variables?.minCost ?? variables?.totalCost ?? variables?.cost ?? 19;
    const rawMstEdges = Array.isArray(variables?.mstEdges)
      ? variables.mstEdges
      : Array.isArray(variables?.mst)
        ? variables.mst
        : [
            { from: "0", to: "1", weight: 4 },
            { from: "1", to: "2", weight: 2 },
            { from: "2", to: "3", weight: 3 },
          ];

    const mstEdges = rawMstEdges.map((e: any) => ({
      from: String(e.from ?? e[0] ?? e.u),
      to: String(e.to ?? e[1] ?? e.v),
      weight: e.weight ?? e[2] ?? e.w ?? 1,
    }));

    const rawSorted = Array.isArray(variables?.sortedEdges) ? variables.sortedEdges : (Array.isArray(variables?.edges) ? variables.edges : null);
    const sortedEdges = rawSorted ? rawSorted.map((e: any) => {
      const u = String(e.from ?? e[0] ?? e.u);
      const v = String(e.to ?? e[1] ?? e.v);
      const w = e.weight ?? e[2] ?? e.w ?? 1;
      let status: "accepted" | "rejected_cycle" | "considering" | "pending" = e.status || "pending";
      if (!e.status && mstEdges.some((me) => (me.from === u && me.to === v) || (me.from === v && me.to === u))) {
        status = "accepted";
      }
      return {
        from: u,
        to: v,
        weight: w,
        status,
        reason: e.reason,
      };
    }) : [
      { from: "1", to: "2", weight: 2, status: "accepted" as const, reason: "find(1) ≠ find(2) ➔ Union roots" },
      { from: "2", to: "3", weight: 3, status: "accepted" as const, reason: "find(2) ≠ find(3) ➔ Union roots" },
      { from: "0", to: "1", weight: 4, status: "accepted" as const, reason: "find(0) ≠ find(1) ➔ Union roots" },
      { from: "0", to: "2", weight: 5, status: "rejected_cycle" as const, reason: "find(0) == find(2) ➔ Cycle Rejected!" },
      { from: "1", to: "3", weight: 8, status: "pending" as const, reason: "Unprocessed in min-weight queue" },
    ];

    const activeEdge = variables?.activeEdge ?? (variables?.edge ? {
      from: String(variables.edge[0] ?? variables.edge.from),
      to: String(variables.edge[1] ?? variables.edge.to),
      weight: variables.edge[2] ?? variables.edge.weight ?? 1,
      status: variables?.isCycle ? ("rejected_cycle" as const) : ("accepted" as const),
      rootU: variables?.rootU,
      rootV: variables?.rootV,
      reason: variables?.isCycle ? "Roots already unified -> would create cycle" : "Disjoint components merged",
    } : {
      from: "0",
      to: "2",
      weight: 5,
      status: "rejected_cycle" as const,
      rootU: "0",
      rootV: "0",
      reason: "find(0) == find(2) == 0 (Redundant cycle edge)",
    });

    return {
      algorithm: algo,
      totalWeight: totalW,
      mstEdges,
      sortedEdges,
      activeEdge,
      visitedCutSet: Array.isArray(variables?.visitedCutSet) ? variables.visitedCutSet.map(String) : (Array.isArray(variables?.visited) ? variables.visited.map(String) : ["0", "1", "2"]),
      unvisitedCutSet: Array.isArray(variables?.unvisitedCutSet) ? variables.unvisitedCutSet.map(String) : ["3", "4"],
      cutCrossingEdges: Array.isArray(variables?.cutCrossingEdges) ? variables.cutCrossingEdges : [
        { from: "2", to: "3", weight: 3, isMin: true },
        { from: "1", to: "4", weight: 6, isMin: false },
        { from: "0", to: "3", weight: 9, isMin: false },
      ],
      targetEdgeCount: 4,
      isMstComplete: mstEdges.length >= 4,
    };
  }, [propMstState, propDesc, variables, activeTab]);

  // ---------------------------------------------------------------------------
  // 6. NODE & EDGE GRAPH TOPOLOGY COMPUTATION
  // ---------------------------------------------------------------------------
  const graphNodes = useMemo<InternalGraphNode[]>(() => {
    if (is2DGrid) return [];
    let nodeIds: string[] = [];

    if (activeTab === "word-ladder") {
      nodeIds = wordLadderData.wordList || ["hit", "hot", "dot", "dog", "lot", "log", "cog"];
    } else if (activeTab === "topological") {
      nodeIds = Object.keys(topoData.inDegrees);
    } else if (activeTab === "union-find") {
      nodeIds = Object.keys(dsuData.parents);
    } else if (activeTab === "shortest-path" && shortestPathData?.distances) {
      nodeIds = Object.keys(shortestPathData.distances);
    } else if (activeTab === "mst" && mstData) {
      const mstNodeSet = new Set<string>();
      mstData.mstEdges.forEach((e) => { mstNodeSet.add(String(e.from)); mstNodeSet.add(String(e.to)); });
      mstData.sortedEdges?.forEach((e) => { mstNodeSet.add(String(e.from)); mstNodeSet.add(String(e.to)); });
      nodeIds = Array.from(mstNodeSet);
    } else if (matrix.length > 1 && matrix[0]?.length === matrix.length) {
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
      if (propGraphEdges) {
        propGraphEdges.forEach((e) => {
          nodeSet.add(String(e.from));
          nodeSet.add(String(e.to));
        });
      }
      nodeIds = Array.from(nodeSet);
    }

    if (nodeIds.length === 0) {
      nodeIds = ["0", "1", "2", "3", "4"];
    }

    const svgWidth = 560;
    const svgHeight = 300;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    const radius = Math.min(centerX, centerY) - 58;

    return nodeIds.map((id, idx) => {
      const angle = (2 * Math.PI * idx) / nodeIds.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      let state: "unvisited" | "frontier" | "exploring" | "visited" = "unvisited";
      if (currentKey === id || String(current) === id) {
        state = "exploring";
      } else if (seenKeys.has(id)) {
        state = "visited";
      } else if (propGraphSearchState?.frontier?.includes(id)) {
        state = "frontier";
      }

      return {
        id,
        x,
        y,
        inDegree: 0,
        outDegree: 0,
        state,
      };
    });
  }, [
    is2DGrid,
    activeTab,
    wordLadderData,
    topoData,
    dsuData,
    shortestPathData,
    mstData,
    matrix,
    visited,
    current,
    currentKey,
    seenKeys,
    propGraphEdges,
    propGraphSearchState,
  ]);

  // Edges creation
  const graphEdges = useMemo<InternalGraphEdge[]>(() => {
    if (is2DGrid || graphNodes.length === 0) return [];
    const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));
    const edges: InternalGraphEdge[] = [];
    const seenEdgeSet = new Set<string>();

    // Helper to add edge safely
    const addEdge = (u: string, v: string, weight?: string | number) => {
      const n1 = nodeMap.get(u);
      const n2 = nodeMap.get(v);
      const key = isDirected ? `${u}->${v}` : [u, v].sort().join("<->");
      if (n1 && n2 && !seenEdgeSet.has(key)) {
        seenEdgeSet.add(key);
        n1.outDegree++;
        n2.inDegree++;
        edges.push({
          from: n1.id,
          to: n2.id,
          x1: n1.x,
          y1: n1.y,
          x2: n2.x,
          y2: n2.y,
          weight,
          isDirected,
        });
      }
    };

    if (activeTab === "word-ladder") {
      // Create mutation edges (differ by 1 letter)
      const words = graphNodes.map((n) => n.id);
      for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j < words.length; j++) {
          const w1 = words[i]!;
          const w2 = words[j]!;
          if (w1.length === w2.length) {
            let diff = 0;
            for (let k = 0; k < w1.length; k++) {
              if (w1[k] !== w2[k]) diff++;
            }
            if (diff === 1) {
              addEdge(w1, w2);
            }
          }
        }
      }
    } else if (activeTab === "mst" && mstData) {
      // Add all sorted edges and mst edges
      mstData.sortedEdges?.forEach((e) => addEdge(String(e.from), String(e.to), e.weight));
      mstData.mstEdges.forEach((e) => addEdge(String(e.from), String(e.to), e.weight));
      if (mstData.activeEdge) {
        addEdge(String(mstData.activeEdge.from), String(mstData.activeEdge.to), mstData.activeEdge.weight);
      }
    } else if (propGraphEdges && propGraphEdges.length > 0) {
      propGraphEdges.forEach((e) => addEdge(String(e.from), String(e.to), e.weight));
    } else if (matrix.length > 1 && matrix[0]?.length === matrix.length) {
      // Adjacency matrix
      for (let u = 0; u < matrix.length; u++) {
        for (let v = 0; v < matrix.length; v++) {
          const val = Number(matrix[u]?.[v]);
          if (val > 0 && u !== v) {
            addEdge(String(u), String(v), val > 1 ? val : undefined);
          }
        }
      }
    } else if (matrix.length > 0 && matrix.every((r) => Array.isArray(r) && r.length >= 2)) {
      // Edge list [u, v, weight?]
      matrix.forEach((row) => {
        const u = String(row[0]);
        const v = String(row[1]);
        const w = row.length >= 3 ? row[2] : undefined;
        addEdge(u, v, w);
      });
    }

    if (edges.length === 0 && graphNodes.length > 1) {
      for (let i = 0; i < graphNodes.length; i++) {
        const n1 = graphNodes[i]!;
        const n2 = graphNodes[(i + 1) % graphNodes.length]!;
        addEdge(n1.id, n2.id, (i % 3) + 2);
      }
    }

    return edges;
  }, [is2DGrid, graphNodes, activeTab, propGraphEdges, matrix, isDirected, mstData]);

  return (
    <div className="flex flex-col gap-3 w-full h-full p-2 font-sans">
      {/* Top Header Controls: Mode Tabs & Directed / Network Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-border/70 text-xs font-mono shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Specialized Mode Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("network")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "network"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Network className="w-3.5 h-3.5 text-primary" />
              <span>Network Canvas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("shortest-path")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "shortest-path"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Route className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shortest Path</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("mst")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "mst"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitMerge className="w-3.5 h-3.5 text-cyan-400" />
              <span>MST (Spanning Tree)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("topological")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "topological"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
              <span>Topological Sort</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("union-find")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "union-find"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Union-Find (DSU)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("word-ladder")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "word-ladder"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Word Ladder</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("matrix-view")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "matrix-view"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Table className="w-3.5 h-3.5 text-rose-400" />
              <span>Adjacency Matrix</span>
            </button>
          </div>

          <span className="text-border">|</span>

          {/* Directed vs Undirected Badge */}
          <span className="px-2.5 py-0.5 rounded-md border text-[10px] font-bold bg-muted/60 text-foreground border-border/70">
            {isDirected ? "DIRECTED GRAPH (DAG / DiGraph)" : "UNDIRECTED GRAPH"}
          </span>
        </div>

        {/* Vertices & Edges Count Readout */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-semibold text-primary">
            |V| = {graphNodes.length} Vertices
          </span>
          <span className="text-border">|</span>
          <span className="font-semibold text-indigo-400">
            |E| = {graphEdges.length} Edges
          </span>
          {current !== null && current !== undefined && (
            <>
              <span className="text-border">|</span>
              <span className="text-emerald-400 font-bold">
                Active: {String(current)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          PANEL 1: TOPOLOGICAL SORT & KAHN'S ALGORITHM
         ----------------------------------------------------------------------- */}
      {activeTab === "topological" && (
        <div className="flex flex-col gap-3">
          {/* Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-background to-primary/10 border border-border/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ListOrdered className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    KAHN&apos;S TOPOLOGICAL BFS SORT ENGINE
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      topoData.hasCycle
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    }`}
                  >
                    {topoData.hasCycle ? "CYCLE / DEADLOCK DETECTED" : "VALID DIRECTED ACYCLIC GRAPH (DAG)"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-sm font-mono text-muted-foreground">Processed Ordering:</span>
                  <span className="text-lg font-mono font-black text-amber-400">
                    [{topoData.processedOrder.join(" ➔ ")}]
                  </span>
                </div>
              </div>
            </div>

            {/* Zero In-Degree Queue Display */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/80">
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                Zero In-Degree Queue (Q):
              </span>
              <div className="flex items-center gap-1 font-mono text-xs font-extrabold text-primary">
                {topoData.zeroInDegreeQueue.length === 0 ? (
                  <span className="text-muted-foreground italic text-[11px]">empty</span>
                ) : (
                  topoData.zeroInDegreeQueue.map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40"
                    >
                      {item}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* In-Degree Dependency Table */}
          <div className="flex flex-col rounded-xl bg-card/60 border border-amber-500/30 p-3 shadow-xs">
            <span className="text-xs font-mono font-bold text-amber-300 mb-2 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              IN-DEGREE PREREQUISITE TABLE (inDegree[u])
            </span>
            <div className="flex flex-wrap gap-2 py-1">
              {Object.entries(topoData.inDegrees).map(([nodeId, deg]) => {
                const isZero = deg === 0;
                const isProcessed = topoData.processedOrder.includes(nodeId);
                const isActive = topoData.activeNode === nodeId;

                return (
                  <div
                    key={nodeId}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-lg border font-mono transition-all ${
                      isActive
                        ? "bg-amber-500/25 border-amber-400 text-amber-300 font-extrabold ring-2 ring-amber-400/40 scale-105"
                        : isProcessed
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : isZero
                        ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 font-bold"
                        : "bg-background/80 border-border/70 text-foreground font-semibold"
                    }`}
                  >
                    <span className="text-sm">Vertex {nodeId}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      In-Degree: <b className="text-foreground">{deg}</b>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          PANEL 2: DISJOINT SET UNION (UNION-FIND / DSU)
         ----------------------------------------------------------------------- */}
      {activeTab === "union-find" && (
        <div className="flex flex-col gap-3">
          {/* Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-teal-500/10 via-background to-primary/10 border border-border/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    DISJOINT SET UNION (DSU / UNION-FIND)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      dsuData.isRedundant
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                        : "bg-teal-500/20 text-teal-300 border-teal-500/40"
                    }`}
                  >
                    {dsuData.isRedundant ? "REDUNDANT CONNECTION DETECTED" : "CONNECTED FOREST"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-sm font-mono text-muted-foreground">Active Edge Evaluation:</span>
                  <span className="text-base font-mono font-black text-teal-300">
                    ({dsuData.activeEdge?.u} ⇄ {dsuData.activeEdge?.v}) ➔ Find Roots: ({dsuData.rootU} vs {dsuData.rootV})
                  </span>
                </div>
              </div>
            </div>

            {/* Total Components Count */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-mono">
              <span className="text-muted-foreground font-bold">Disjoint Components:</span>
              <span className="text-base font-extrabold text-teal-400">{dsuData.numComponents}</span>
            </div>
          </div>

          {/* Parent Pointer Array & Forest Roots */}
          <div className="flex flex-col rounded-xl bg-card/60 border border-teal-500/30 p-3 shadow-xs">
            <span className="text-xs font-mono font-bold text-teal-300 mb-2 flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5" />
              PARENT POINTER ARRAY (parent[i])
            </span>
            <div className="flex flex-wrap gap-2 py-1">
              {Object.entries(dsuData.parents).map(([childId, parentId]) => {
                const isRoot = childId === parentId;
                return (
                  <div
                    key={childId}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-lg border font-mono ${
                      isRoot
                        ? "bg-teal-500/25 border-teal-400 text-teal-200 font-extrabold shadow-xs scale-105"
                        : "bg-background/80 border-border/70 text-foreground font-semibold"
                    }`}
                  >
                    <span className="text-sm">{childId}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {isRoot ? "ROOT" : `➔ ${parentId}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          PANEL 3: WORD LADDER STATE-SPACE TRANSFORMATION GRAPH
         ----------------------------------------------------------------------- */}
      {activeTab === "word-ladder" && (
        <div className="flex flex-col gap-3">
          {/* Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-background to-teal-500/10 border border-border/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    WORD LADDER STATE-SPACE BFS TRAJECTORY
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    SHORTEST PATH: {wordLadderData.distance} WORDS
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-sm font-mono text-muted-foreground">Target:</span>
                  <span className="text-lg font-mono font-black text-emerald-400">
                    &apos;{wordLadderData.beginWord}&apos; ➔ &apos;{wordLadderData.endWord}&apos;
                  </span>
                </div>
              </div>
            </div>

            {/* Current Active Word */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-mono">
              <span className="text-muted-foreground font-bold">Current Frontier Word:</span>
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 font-black">
                {wordLadderData.currentWord}
              </span>
            </div>
          </div>

          {/* Transformation Path Ribbon */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-card/60 border border-indigo-500/30 text-xs font-mono overflow-x-auto">
            <span className="text-muted-foreground font-bold shrink-0">MUTATION SEQUENCE:</span>
            <div className="flex items-center gap-1.5">
              {wordLadderData.activePath?.map((word, idx) => (
                <React.Fragment key={word}>
                  <span
                    className={`px-2.5 py-1 rounded-md border font-bold ${
                      idx === wordLadderData.activePath!.length - 1
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30"
                        : idx === 0
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "bg-muted/60 text-foreground border-border/70"
                    }`}
                  >
                    {word}
                  </span>
                  {idx < wordLadderData.activePath!.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          PANEL 4: SHORTEST PATH ALGORITHMS (DIJKSTRA / BELLMAN-FORD / A*)
         ----------------------------------------------------------------------- */}
      {activeTab === "shortest-path" && shortestPathData && (
        <div className="flex flex-col gap-3">
          {/* Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-background to-amber-500/10 border border-border/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    {shortestPathData.algorithm === "bellman_ford"
                      ? "BELLMAN-FORD SHORTEST PATH & NEGATIVE CYCLE ENGINE"
                      : shortestPathData.algorithm === "astar"
                      ? "A* HEURISTIC DIRECTED SEARCH ENGINE"
                      : "DIJKSTRA'S SHORTEST PATH (MIN-HEAP PRIORITY QUEUE)"}
                  </span>
                  {shortestPathData.currentPass !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PASS {shortestPathData.currentPass} / {shortestPathData.totalPasses ?? 4}
                    </span>
                  )}
                  {shortestPathData.hasNegativeCycle && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      NEGATIVE CYCLE DETECTED
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-sm font-mono text-muted-foreground">Shortest Path Trajectory:</span>
                  <span className="text-base font-mono font-black text-emerald-300">
                    [{shortestPathData.reconstructedPath?.join(" ➔ ") || `${shortestPathData.sourceNode} ➔ ...`}]
                  </span>
                  {shortestPathData.targetNode && shortestPathData.distances[shortestPathData.targetNode] !== undefined && (
                    <span className="text-xs font-mono font-bold text-amber-300 ml-1">
                      (Cost: {String(shortestPathData.distances[shortestPathData.targetNode])})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Source & Constraint Info */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-mono">
              <span className="text-muted-foreground font-bold">Source:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black">
                {shortestPathData.sourceNode}
              </span>
              {shortestPathData.stopsRemaining !== undefined && shortestPathData.stopsRemaining !== null && (
                <>
                  <span className="text-border">|</span>
                  <span className="text-muted-foreground font-bold">Hops/Stops:</span>
                  <span className="text-amber-400 font-bold">{shortestPathData.stopsRemaining}</span>
                </>
              )}
            </div>
          </div>

          {/* Active Relaxation Banner */}
          {shortestPathData.activeEdge && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-mono text-amber-200 shadow-xs">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-400 animate-bounce" />
                <span className="font-bold text-amber-300">Active Edge Relaxation Step:</span>
                <span className="font-semibold text-foreground">
                  ({shortestPathData.activeEdge.from} ➔ {shortestPathData.activeEdge.to}, weight = {String(shortestPathData.activeEdge.weight)})
                </span>
                {shortestPathData.activeEdge.formula && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px]">
                    {shortestPathData.activeEdge.formula}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <span className="text-amber-400/80">Current: {String(shortestPathData.activeEdge.currentDist ?? "∞")}</span>
                <span className="text-amber-400">➔</span>
                <span className="text-emerald-400">Candidate: {String(shortestPathData.activeEdge.candidateDist)}</span>
                <span
                  className={`ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    shortestPathData.activeEdge.status === "relaxed"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {shortestPathData.activeEdge.status === "relaxed" ? "Relaxed (Updated)" : "Kept (Suboptimal)"}
                </span>
              </div>
            </div>
          )}

          {/* Priority Queue (Min-Heap) & Distance Table Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Priority Queue / Frontier */}
            <div className="rounded-xl border border-border/80 bg-card/50 p-3 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Activity className="size-3.5 text-primary" />
                  Priority Queue (Min-Heap: (dist, node))
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {shortestPathData.priorityQueue?.length ?? 0} entries
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[34px] items-center">
                {!shortestPathData.priorityQueue || shortestPathData.priorityQueue.length === 0 ? (
                  <span className="font-mono text-[11px] text-muted-foreground/60 italic">empty heap</span>
                ) : (
                  shortestPathData.priorityQueue.map((item, idx) => (
                    <span
                      key={`pq-${idx}`}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                        idx === 0
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-500/30 scale-105"
                          : "border-border/60 bg-muted/40 text-foreground"
                      }`}
                    >
                      <span className="text-[9px] text-muted-foreground font-normal">dist:</span>
                      <span className="text-emerald-400 font-extrabold">{String(item.dist)}</span>
                      <span className="text-muted-foreground/40 font-light">|</span>
                      <span className="text-primary font-black">u:{String(item.node)}</span>
                      {item.hops !== undefined && (
                        <span className="text-[9px] text-amber-300/80">({item.hops}h)</span>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Shortest Distance Table */}
            <div className="rounded-xl border border-border/80 bg-card/50 p-3 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Table className="size-3.5 text-emerald-400" />
                  Shortest Distance Vector (dist[v])
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Object.keys(shortestPathData.distances).length} vertices
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[34px] items-center">
                {Object.entries(shortestPathData.distances).map(([nodeId, distVal]) => {
                  const isSource = nodeId === String(shortestPathData.sourceNode);
                  const isCurrent = currentKey === nodeId;
                  const isInfinity = distVal === "∞" || distVal === Infinity || distVal === null;
                  return (
                    <div
                      key={`dist-tbl-${nodeId}`}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold ${
                        isCurrent
                          ? "border-primary bg-primary/25 text-primary ring-2 ring-primary/40"
                          : isSource
                          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                          : isInfinity
                          ? "border-border/40 bg-muted/20 text-muted-foreground/60"
                          : "border-teal-500/40 bg-teal-500/10 text-teal-300"
                      }`}
                    >
                      <span className="text-muted-foreground text-[10px]">[{nodeId}]</span>
                      <span className={isInfinity ? "text-muted-foreground/60 font-normal" : "text-emerald-300 font-extrabold"}>
                        {isInfinity ? "∞" : String(distVal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          PANEL 5: MINIMUM SPANNING TREE (KRUSKAL'S / PRIM'S)
         ----------------------------------------------------------------------- */}
      {activeTab === "mst" && mstData && (
        <div className="flex flex-col gap-3">
          {/* Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-background to-teal-500/10 border border-border/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    {mstData.algorithm === "prim"
                      ? "PRIM'S MINIMUM SPANNING TREE (CUT PROPERTY & PRIORITY QUEUE)"
                      : "KRUSKAL'S MINIMUM SPANNING TREE (GREEDY SORT & DSU CYCLE CHECK)"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      mstData.isMstComplete
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                    }`}
                  >
                    {mstData.isMstComplete ? "MST CONSTRUCTION COMPLETE" : `PROGRESS: ${mstData.mstEdges.length} / ${mstData.targetEdgeCount} EDGES`}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-sm font-mono text-muted-foreground">Accumulated MST Cost:</span>
                  <span className="text-lg font-mono font-black text-cyan-300">
                    Weight = {String(mstData.totalWeight)}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    ({mstData.mstEdges.map((e) => `${e.from}-${e.to}(${e.weight})`).join(" + ") || "0"})
                  </span>
                </div>
              </div>
            </div>

            {/* MST Edges Count Counter */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-mono">
              <span className="text-muted-foreground font-bold">Spanning Tree Edges:</span>
              <span className="text-base font-extrabold text-teal-400">
                {mstData.mstEdges.length} / {mstData.targetEdgeCount}
              </span>
            </div>
          </div>

          {/* Active Candidate Edge Inspection */}
          {mstData.activeEdge && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-mono text-cyan-200 shadow-xs">
              <div className="flex items-center gap-2">
                <Scale className="size-4 text-cyan-400 animate-pulse" />
                <span className="font-bold text-cyan-300">Active Edge Cycle Evaluation:</span>
                <span className="font-semibold text-foreground">
                  ({mstData.activeEdge.from} ⇄ {mstData.activeEdge.to}, weight = {String(mstData.activeEdge.weight)})
                </span>
                {mstData.activeEdge.rootU !== undefined && mstData.activeEdge.rootV !== undefined && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px]">
                    find({mstData.activeEdge.from}) = {String(mstData.activeEdge.rootU)} vs find({mstData.activeEdge.to}) = {String(mstData.activeEdge.rootV)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-bold">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 ${
                    mstData.activeEdge.status === "accepted"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : mstData.activeEdge.status === "rejected_cycle"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {mstData.activeEdge.status === "accepted" ? (
                    <>
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      ACCEPTED INTO MST
                    </>
                  ) : mstData.activeEdge.status === "rejected_cycle" ? (
                    <>
                      <XCircle className="size-3 text-rose-400" />
                      CYCLE REJECTED
                    </>
                  ) : (
                    "CONSIDERING"
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Kruskal Sorted Edge Table & Prim Cut Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Sorted Edge List for Kruskal's */}
            {mstData.sortedEdges && (
              <div className="rounded-xl border border-border/80 bg-card/50 p-3 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <ListFilter className="size-3.5 text-cyan-400" />
                    Sorted Edge Queue (Ascending Weight)
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {mstData.sortedEdges.length} edges
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                  {mstData.sortedEdges.map((e, idx) => (
                    <div
                      key={`sort-edge-${idx}`}
                      className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
                        e.status === "accepted"
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                          : e.status === "rejected_cycle"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300/80 line-through"
                          : e.status === "considering"
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400"
                          : "bg-muted/30 border-border/50 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          ({e.from} ⇄ {e.to})
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-background/60 text-foreground font-black text-[10px]">
                          w = {String(e.weight)}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-black">
                        {e.status === "accepted"
                          ? "✓ ACCEPTED"
                          : e.status === "rejected_cycle"
                          ? "✗ CYCLE"
                          : e.status === "considering"
                          ? "ACTIVE"
                          : "PENDING"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prim's Cut Partition & Crossing Edges or MST Edge Pool */}
            <div className="rounded-xl border border-border/80 bg-card/50 p-3 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Scissors className="size-3.5 text-teal-400" />
                  {mstData.algorithm === "prim" ? "Cut Boundary & Crossing Edges" : "Current MST Edge Collection"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {mstData.mstEdges.length} edges selected
                </span>
              </div>

              {mstData.algorithm === "prim" && (mstData.visitedCutSet || mstData.unvisitedCutSet) ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-emerald-400 font-bold">Cut Set S (In Tree):</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">
                      {"{" + (mstData.visitedCutSet?.join(", ") || "none") + "}"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-muted-foreground font-bold">Set V \ S:</span>
                    <span className="px-2 py-0.5 rounded bg-muted/40 text-muted-foreground font-bold">
                      {"{" + (mstData.unvisitedCutSet?.join(", ") || "none") + "}"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 min-h-[34px] items-center">
                  {mstData.mstEdges.length === 0 ? (
                    <span className="font-mono text-[11px] text-muted-foreground/60 italic">no edges in MST yet</span>
                  ) : (
                    mstData.mstEdges.map((e, idx) => (
                      <span
                        key={`mste-${idx}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/50 bg-teal-500/20 px-2.5 py-1 font-mono text-[11px] font-bold text-teal-200"
                      >
                        <span>({e.from} ⇄ {e.to})</span>
                        <span className="text-cyan-300 text-[10px]">w:{String(e.weight)}</span>
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description Step Banner */}
      {propDesc && (
        <div className="px-3.5 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-xs font-mono text-muted-foreground flex items-center justify-between">
          <span className="truncate">{propDesc}</span>
          {hoveredNode && (
            <span className="text-primary font-bold ml-2 shrink-0">
              Inspecting Vertex: [{hoveredNode}]
            </span>
          )}
        </div>
      )}

      {/* -----------------------------------------------------------------------
          MAIN VISUALIZATION BODY: NETWORK SVG OR MATRIX
         ----------------------------------------------------------------------- */}
      {activeTab === "matrix-view" ? (
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
                      (e) => (e.from === uNode.id && e.to === vNode.id) || (!isDirected && e.from === vNode.id && e.to === uNode.id)
                    );
                    const isDirect =
                      (currentKey === uNode.id && seenKeys.has(vNode.id)) ||
                      (currentKey === vNode.id && seenKeys.has(uNode.id));

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
      ) : (
        /* Interactive Node-Link SVG Graph Network Canvas */
        <div className="relative flex min-h-[300px] items-center justify-center overflow-auto rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm bg-dot-grid">
          <svg viewBox="0 0 560 300" className="h-auto w-full max-w-[560px] select-none">
            <defs>
              <marker
                id="arrow-directed-active"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="oklch(0.74 0.20 295)" />
              </marker>
              <marker
                id="arrow-directed-seen"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="oklch(0.72 0.16 230)" />
              </marker>
              <marker
                id="arrow-directed-relaxed"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
              </marker>
              <marker
                id="arrow-directed-spt"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
              </marker>
              <marker
                id="arrow-directed-mst"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#14b8a6" />
              </marker>
              <marker
                id="arrow-directed-rejected"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
              </marker>
              <marker
                id="arrow-directed-default"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="hsl(var(--muted-foreground))" />
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

              const isRelaxedEdge = Boolean(
                (relaxedEdge &&
                  ((edge.from === String(relaxedEdge.from) && edge.to === String(relaxedEdge.to)) ||
                    (edge.to === String(relaxedEdge.from) && edge.from === String(relaxedEdge.to)))) ||
                (shortestPathData?.activeEdge &&
                  ((edge.from === shortestPathData.activeEdge.from && edge.to === shortestPathData.activeEdge.to) ||
                    (edge.to === shortestPathData.activeEdge.from && edge.from === shortestPathData.activeEdge.to)))
              );

              const isSptEdge = Boolean(
                (shortestPathTree &&
                  shortestPathTree.some(
                    (e) =>
                      (edge.from === String(e.from) && edge.to === String(e.to)) ||
                      (edge.to === String(e.from) && edge.from === String(e.to))
                  )) ||
                (shortestPathData?.shortestPathTree &&
                  shortestPathData.shortestPathTree.some(
                    (e) =>
                      (edge.from === e.from && edge.to === e.to) ||
                      (edge.to === e.from && edge.from === e.to)
                  ))
              );

              const isMstEdge = Boolean(
                mstData?.mstEdges?.some(
                  (e) =>
                    (edge.from === e.from && edge.to === e.to) ||
                    (edge.to === e.from && edge.from === e.to)
                )
              );

              const isRejectedCycleEdge = Boolean(
                (mstData?.activeEdge?.status === "rejected_cycle" &&
                  ((edge.from === mstData.activeEdge.from && edge.to === mstData.activeEdge.to) ||
                    (edge.to === mstData.activeEdge.from && edge.from === mstData.activeEdge.to))) ||
                (mstData?.sortedEdges?.some(
                  (e) =>
                    e.status === "rejected_cycle" &&
                    ((edge.from === e.from && edge.to === e.to) ||
                      (edge.to === e.from && edge.from === e.to))
                ))
              );

              const isMstActive = Boolean(
                mstData?.activeEdge &&
                  ((edge.from === mstData.activeEdge.from && edge.to === mstData.activeEdge.to) ||
                    (edge.to === mstData.activeEdge.from && edge.from === mstData.activeEdge.to))
              );

              const isHoveredEdge = hoveredNode === edge.from || hoveredNode === edge.to;
              const isActiveEdge =
                isDirectEdgeMatch || currentKey === edge.from || currentKey === edge.to;
              const isSeenEdge = seenKeys.has(edge.from) && seenKeys.has(edge.to);

              const strokeColor = isRejectedCycleEdge
                ? "#f43f5e"
                : isRelaxedEdge
                ? "#f59e0b"
                : isSptEdge
                ? "#10b981"
                : isMstEdge
                ? "#14b8a6"
                : isMstActive
                ? "#38bdf8"
                : isDirectEdgeMatch || isActiveEdge
                ? "hsl(var(--primary))"
                : isSeenEdge
                ? "hsl(var(--accent))"
                : isHoveredEdge
                ? "hsl(var(--primary) / 0.8)"
                : "hsl(var(--border))";

              const strokeWidth = isRelaxedEdge
                ? 4
                : isSptEdge
                ? 3.5
                : isMstEdge
                ? 3.8
                : isMstActive
                ? 3.2
                : isDirectEdgeMatch
                ? 3.5
                : isActiveEdge
                ? 2.5
                : 1.5;

              const strokeDasharray = isRejectedCycleEdge ? "4 3" : undefined;

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
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    markerEnd={
                      isDirected
                        ? isRejectedCycleEdge
                          ? "url(#arrow-directed-rejected)"
                          : isRelaxedEdge
                          ? "url(#arrow-directed-relaxed)"
                          : isSptEdge
                          ? "url(#arrow-directed-spt)"
                          : isMstEdge
                          ? "url(#arrow-directed-mst)"
                          : isActiveEdge
                          ? "url(#arrow-directed-active)"
                          : isSeenEdge
                          ? "url(#arrow-directed-seen)"
                          : "url(#arrow-directed-default)"
                        : undefined
                    }
                    className="transition-all duration-300"
                  />
                  {edge.weight !== undefined && (
                    <g transform={`translate(${midX}, ${midY - 4})`}>
                      <rect
                        x="-12"
                        y="-8"
                        width="24"
                        height="16"
                        rx="4"
                        className={
                          isRejectedCycleEdge
                            ? "fill-rose-950 stroke-rose-400 stroke"
                            : isRelaxedEdge
                            ? "fill-amber-950 stroke-amber-400 stroke"
                            : isSptEdge
                            ? "fill-emerald-950 stroke-emerald-400 stroke"
                            : isMstEdge
                            ? "fill-teal-950 stroke-teal-400 stroke"
                            : "fill-background/90 stroke-border/60 stroke"
                        }
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={`font-mono text-[9px] font-extrabold ${
                          isRejectedCycleEdge
                            ? "fill-rose-300"
                            : isRelaxedEdge
                            ? "fill-amber-300"
                            : isSptEdge
                            ? "fill-emerald-300"
                            : isMstEdge
                            ? "fill-teal-300"
                            : "fill-primary"
                        }`}
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
              const baseRadius = nodeLength >= 6 ? 24 : nodeLength >= 3 ? 21 : 18;
              const nodeRadius = isActive ? baseRadius + 3 : isHovered ? baseRadius + 2 : baseRadius;
              const fontSizeClass =
                nodeLength >= 7
                  ? "text-[8px]"
                  : nodeLength >= 4
                  ? "text-[10px]"
                  : "text-xs";

              const shortestDistVal = shortestPathData?.distances?.[node.id] ?? (distances ? distances[node.id] : undefined);
              const isPrimInTree = mstData?.algorithm === "prim" && mstData.visitedCutSet?.includes(node.id);
              const isPrimUnvisited = mstData?.algorithm === "prim" && mstData.unvisitedCutSet?.includes(node.id);
              const dsuRoot = activeTab === "union-find" || activeTab === "mst" ? dsuData.parents[node.id] : undefined;

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
                        : isPrimInTree
                        ? "fill-teal-500/25 stroke-teal-400 stroke-2"
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
                        : isPrimInTree
                        ? "fill-teal-300 font-black"
                        : "fill-foreground"
                    }`}
                  >
                    {node.id}
                  </text>

                  {/* Distance badge for Shortest Path */}
                  {activeTab === "shortest-path" && shortestDistVal !== undefined && (
                    <g transform={`translate(0, ${nodeRadius + 11})`}>
                      <rect
                        x="-16"
                        y="-6"
                        width="32"
                        height="13"
                        rx="6.5"
                        className="fill-emerald-950/90 stroke-emerald-500/80 stroke"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-mono text-[9px] font-black fill-emerald-300"
                      >
                        {String(shortestDistVal)}
                      </text>
                    </g>
                  )}

                  {/* Cut Set / DSU badge for MST */}
                  {activeTab === "mst" && (isPrimInTree || isPrimUnvisited || dsuRoot !== undefined) && (
                    <g transform={`translate(0, ${nodeRadius + 11})`}>
                      <rect
                        x="-15"
                        y="-6"
                        width="30"
                        height="13"
                        rx="6.5"
                        className={isPrimInTree ? "fill-teal-950/90 stroke-teal-400 stroke" : "fill-muted/90 stroke-border stroke"}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={`font-mono text-[8px] font-black ${isPrimInTree ? "fill-teal-300" : "fill-muted-foreground"}`}
                      >
                        {isPrimInTree ? "S (Tree)" : isPrimUnvisited ? "V \\ S" : `r:${dsuRoot}`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Visited & Frontier Tracker Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/40 px-4 py-2 text-xs">
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
            <span className="text-muted-foreground">Active Target:</span>
            <span className="rounded-md border border-primary/40 bg-primary/20 px-2 py-0.5 font-bold text-primary">
              {String(current)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

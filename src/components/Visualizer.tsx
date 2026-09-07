import { useEffect, useMemo, useState, useCallback, memo } from "react";
import type { VizStep, VizType } from "@/lib/problems";
import { VisualizerControls } from "./visualizer/VisualizerControls";
import { TreeVisualizer } from "./visualizer/TreeVisualizer";
import { GraphVisualizer } from "./visualizer/GraphVisualizer";
import { MatrixVisualizer } from "./visualizer/MatrixVisualizer";
import { LinkedListVisualizer } from "./visualizer/LinkedListVisualizer";
import { StackQueueVisualizer } from "./visualizer/StackQueueVisualizer";
import { ArrayVisualizer } from "./visualizer/ArrayVisualizer";
import { HashMapVisualizer } from "./visualizer/HashMapVisualizer";
import { DpTableVisualizer } from "./visualizer/DpTableVisualizer";
import { BitVisualizer } from "./visualizer/BitVisualizer";
import { RecursionVisualizer } from "./visualizer/RecursionVisualizer";
import { BinaryHeapVisualizer } from "./visualizer/BinaryHeapVisualizer";
import { MonotonicStackVisualizer } from "./visualizer/MonotonicStackVisualizer";
import { IntervalVisualizer } from "./visualizer/IntervalVisualizer";
import { DesignDataStructureVisualizer } from "./visualizer/DesignDataStructureVisualizer";
import { CompositeVisualizer } from "./visualizer/CompositeVisualizer";
import { StepDiffInspector } from "./visualizer/StepDiffInspector";
import { VariableWatchTable } from "./visualizer/VariableWatchTable";
import { KeyboardShortcutsModal } from "./visualizer/KeyboardShortcutsModal";
import { ExportSnapshotModal } from "./visualizer/ExportSnapshotModal";
import { StatReadouts, type ReadoutItem } from "./visualizer/StatReadouts";
import { TelemetryMetricsBar } from "./visualizer/TelemetryMetricsBar";
import { VisualizerToolbar } from "./visualizer/VisualizerToolbar";
import { CrossDatasetShiftBanner } from "./visualizer/CrossDatasetShiftBanner";
import { VisualizerContentPanes } from "./visualizer/VisualizerContentPanes";
import { PseudocodeTraceInspector } from "./visualizer/PseudocodeTraceInspector";
import { AsymptoticComplexityVisualizer } from "./visualizer/AsymptoticComplexityVisualizer";
import { Terminal, Database, Layers, Sparkles, HelpCircle, Bot } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { usePlaybackOrchestrator } from "@/hooks/usePlaybackOrchestrator";
import {
  detectOperation,
  safeArray,
  safeTreeArray,
  toText,
  type Val,
} from "./visualizer/VisualizerTypes";
export const Visualizer = memo(function Visualizer({
  array,
  codeLines = [],
  steps = [],
  liveStatus = null,
}: {
  array: (number | string)[];
  codeLines: string[];
  steps: VizStep[];
  liveStatus?: {
    datasetId: string;
    datasetLabel: string;
    loopCount: number;
    stepCount: number;
    isComplete: boolean;
    statusText: string;
  } | null;
}) {

  const safeSteps = useMemo(() => (Array.isArray(steps) ? steps.filter(Boolean) : []), [steps]);
  const [motionBlurEnabled, setMotionBlurEnabled] = useState(false);
  const [multiDatasetEnabled, setMultiDatasetEnabled] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"stacked" | "grid" | "tabs">("stacked");
  const [showTelemetryDetails, setShowTelemetryDetails] = useState(false);
  const [showComplexityVisualizer, setShowComplexityVisualizer] = useState(false);
  const [showVariableWatch, setShowVariableWatch] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<
    "primary" | "aux_map" | "aux_buffer" | "aux_list" | "aux_tree" | "aux_array" | "code"
  >("primary");

  const { openChat, updateContext } = useChat();

  // Initialize high-precision 60 FPS Playback Orchestrator
  const playback = usePlaybackOrchestrator({
    steps: safeSteps,
    breakpoints,
    initialSpeed: 1,
    initialLooping: false,
  });

  const step = playback.activeStepIndex;
  const setStep = playback.setActiveStepIndex;

  // Compute a stable fingerprint of the current algorithmic trace
  const traceSignature = useMemo(() => {
    if (safeSteps.length === 0) return "empty";
    const firstDesc = safeSteps[0]?.desc ?? "";
    const lastDesc = safeSteps[safeSteps.length - 1]?.desc ?? "";
    return `${safeSteps.length}::${firstDesc}::${lastDesc}`;
  }, [safeSteps]);

  // Reset playback ONLY when the actual trace signature changes
  useEffect(() => {
    playback.reset();
  }, [traceSignature]);

  // Synchronize current simulation step into ChatContext
  useEffect(() => {
    if (safeSteps.length > 0 && safeSteps[step]) {
      updateContext({
        currentStep: step,
        totalSteps: safeSteps.length,
        stepDesc: toText(safeSteps[step]?.desc),
        stepVariables: safeSteps[step]?.variables || {},
      });
    }
  }, [step, safeSteps, updateContext]);

  // Toggle breakpoint on a line index
  const toggleBreakpoint = useCallback((lineIdx: number) => {
    setBreakpoints((prev) => {
      const next = new Set(prev);
      if (next.has(lineIdx)) {
        next.delete(lineIdx);
      } else {
        next.add(lineIdx);
      }
      return next;
    });
  }, []);

  // Jump to specific line execution
  const jumpToLine = useCallback(
    (lineIdx: number) => {
      playback.jumpToLine(lineIdx);
    },
    [playback],
  );

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        playback.togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        playback.jumpRelative(-1);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        playback.jumpRelative(1);
      } else if (e.code === "Home") {
        e.preventDefault();
        playback.jumpToFirst();
      } else if (e.code === "End") {
        e.preventDefault();
        playback.jumpToLast();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        playback.reset();
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        playback.toggleLoop();
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        playback.jumpToNextBreakpoint();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setMotionBlurEnabled((prev) => !prev);
      } else if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === "1") {
        playback.setSpeed(1);
      } else if (e.key === "2") {
        playback.setSpeed(2);
      } else if (e.key === "3") {
        playback.setSpeed(3);
      }
    },
    [playback],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const current: VizStep = safeSteps[step] ?? safeSteps[0] ?? ({} as VizStep);

  // Infer the active visualization type
  const type: VizType = useMemo(() => {
    if (current.type) return current.type;
    const stepWithType = safeSteps.find((s) => s.type);
    if (stepWithType?.type) return stepWithType.type;
    if (current.matrix && current.matrix.length > 0) return "matrix";
    if (current.tree && current.tree.length > 0) return "tree";
    if (current.stack && current.stack.length > 0) return "stack";
    if (current.queue && current.queue.length > 0) return "queue";
    if (current.list && current.list.length > 0) return "linkedlist";
    if (current.map && Object.keys(current.map).length > 0) return "hashmap";
    return "array";
  }, [current, safeSteps]);

  // Data structure presence across all trace steps
  const hasAuxMapInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) => s.map && Object.keys(s.map).length > 0 && s.type !== "hashmap" && type !== "hashmap",
      ),
    [safeSteps, type],
  );

  const hasAuxSetInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) =>
          Array.isArray(s.set) && s.set.length > 0 && s.type !== "set" && type !== "set",
      ),
    [safeSteps, type],
  );

  const hasAuxStackInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) =>
          Array.isArray(s.stack) &&
          s.stack.length > 0 &&
          s.type !== "stack" &&
          type !== "stack",
      ),
    [safeSteps, type],
  );

  const hasAuxQueueInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) =>
          Array.isArray(s.queue) &&
          s.queue.length > 0 &&
          s.type !== "queue" &&
          type !== "queue",
      ),
    [safeSteps, type],
  );

  const hasAuxListInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) =>
          Array.isArray(s.list) &&
          s.list.length > 0 &&
          s.type !== "linkedlist" &&
          type !== "linkedlist",
      ),
    [safeSteps, type],
  );

  const hasAuxTreeInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) =>
          Array.isArray(s.tree) &&
          s.tree.length > 0 &&
          s.type !== "tree" &&
          s.type !== "heap" &&
          type !== "tree" &&
          type !== "heap",
      ),
    [safeSteps, type],
  );

  const hasAuxArrayInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) =>
          Array.isArray(s.array) &&
          s.array.length > 0 &&
          (type === "stack" ||
            type === "queue" ||
            type === "hashmap" ||
            type === "heap" ||
            type === "tree"),
      ),
    [safeSteps, type],
  );

  const hasSecondaryArrayInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) => Array.isArray(s.secondaryArray) && s.secondaryArray.length > 0,
      ),
    [safeSteps],
  );

  const hasSecondaryStackInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) => Array.isArray(s.secondaryStack) && s.secondaryStack.length > 0,
      ),
    [safeSteps],
  );

  const hasSecondaryQueueInTrace = useMemo(
    () =>
      safeSteps.some(
        (s) => Array.isArray(s.secondaryQueue) && s.secondaryQueue.length > 0,
      ),
    [safeSteps],
  );

  const hasMultipleDatasets =
    hasAuxMapInTrace ||
    hasAuxSetInTrace ||
    hasAuxStackInTrace ||
    hasAuxQueueInTrace ||
    hasAuxListInTrace ||
    hasAuxTreeInTrace ||
    hasAuxArrayInTrace ||
    hasSecondaryArrayInTrace ||
    hasSecondaryStackInTrace ||
    hasSecondaryQueueInTrace;

  const traceMatrix = useMemo(() => {
    return safeSteps.find((s) => Array.isArray(s.matrix) && s.matrix.length > 0)?.matrix ?? [];
  }, [safeSteps]);

  const cells = safeArray(current.array ?? array);
  const visited = safeArray(current.visited ?? []);
  const operation = detectOperation(current.desc);
  const isMathMode =
    type === "math" ||
    (cells.length === 0 &&
      safeSteps.length > 0 &&
      !hasMultipleDatasets &&
      traceMatrix.length === 0);

  // -------------------------------------------------------------
  // LIVE ASYMPTOTIC TELEMETRY ENGINE
  // -------------------------------------------------------------
  const cumulativeOperations = useMemo(() => {
    // Count operations executed up to current step
    let ops = 0;
    for (let i = 0; i <= step && i < safeSteps.length; i++) {
      const s = safeSteps[i];
      if (!s) continue;
      ops += 1;
      if (typeof s.left === "number" && typeof s.right === "number") ops += 1;
      if (s.shiftInfo) ops += 1;
      if (s.map && Object.keys(s.map).length > 0) ops += Object.keys(s.map).length;
    }
    return Math.max(step + 1, ops);
  }, [step, safeSteps]);

  const peakAuxMemory = useMemo(() => {
    let peak = 0;
    for (let i = 0; i <= step && i < safeSteps.length; i++) {
      const s = safeSteps[i];
      if (!s) continue;
      const stackLen = Array.isArray(s.stack) ? s.stack.length : 0;
      const queueLen = Array.isArray(s.queue) ? s.queue.length : 0;
      const mapLen = s.map ? Object.keys(s.map).length : 0;
      const visitedLen = Array.isArray(s.visited) ? s.visited.length : 0;
      const currentMem = Math.max(stackLen, queueLen, mapLen, visitedLen);
      if (currentMem > peak) peak = currentMem;
    }
    return peak;
  }, [step, safeSteps]);

  const estimatedBigO = useMemo(() => {
    if (type === "bst") return "O(log N)";
    if (type === "heap" || (safeSteps.length > 10 && cells.length > 5 && isMathMode)) return "O(N log N)";
    if (type === "matrix" || type === "dp") return "O(M × N)";
    if (type === "graph") return "O(V + E)";
    if (type === "tree") return "O(N)";
    return "O(N)";
  }, [type, safeSteps.length, cells.length, isMathMode]);

  if (safeSteps.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground animate-fade">
        <Terminal className="size-6 opacity-40" />
        <span>No execution visualization data available yet.</span>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PRIMARY DATA STRUCTURE RENDERING
  // -------------------------------------------------------------
  let primaryBody: React.ReactNode = null;
  let readouts: ReadoutItem[] = [];

  // 0. Synchronized Composite Data Structure Mode
  const activeCompositeMode = current.compositeLayoutState?.mode;
  if (activeCompositeMode && activeCompositeMode !== "single") {
    const cs = current.compositeLayoutState;
    readouts = [
      { label: "Engine", value: `Composite: ${activeCompositeMode.toUpperCase()}`, highlight: true },
      { label: "Active Pivot", value: current.current ?? "—", highlight: true },
      { label: "Cross Links", value: `${cs?.crossPointers?.length ?? 0} Pointers` },
      { label: "Action", value: cs?.activeRelation?.type ? cs.activeRelation.type.toUpperCase() : "Synchronized" },
    ];
    primaryBody = (
      <CompositeVisualizer
        mode={activeCompositeMode}
        compositeState={cs}
        array={current.array ?? cells}
        secondaryArray={current.secondaryArray}
        left={typeof current.left === "number" ? current.left : null}
        right={typeof current.right === "number" ? current.right : null}
        left2={typeof current.left2 === "number" ? current.left2 : null}
        right2={typeof current.right2 === "number" ? current.right2 : null}
        stack={current.stack}
        secondaryStack={current.secondaryStack}
        queue={current.queue}
        secondaryQueue={current.secondaryQueue}
        map={current.map}
        set={current.set}
        tree={current.tree}
        matrix={current.matrix ?? traceMatrix}
        cols={current.cols}
        graphEdges={current.graphEdges}
        current={current.current ?? null}
        predecessor={current.predecessor ?? null}
        visited={visited}
        wSum={current.wSum}
        mSum={current.mSum}
        desc={current.desc}
        variables={current.variables}
        pointer_labels={current.pointer_labels}
        direction={current.direction}
        frontier={current.frontier}
        distanceLayer={current.distanceLayer}
        trail={current.trail}
        distances={current.distances}
        priorityQueue={current.priorityQueue}
        topologicalSortState={current.topologicalSortState}
        unionFindState={current.unionFindState}
        treeTraversal={current.treeTraversal}
        bstState={current.bstState}
      />
    );
  } else if (type === "dp") {
    const activeMat = current.matrix ?? traceMatrix;
    const rows = Array.isArray(activeMat) ? activeMat.length : 1;
    const cols =
      current.cols ?? (Array.isArray(activeMat?.[0]) ? activeMat[0].length : 1);
    const dpResult =
      current.mSum ??
      current.wSum ??
      (current.current !== null && current.current !== undefined && typeof current.current !== "object"
        ? current.current
        : null) ??
      (Array.isArray(activeMat) && activeMat.length > 0
        ? activeMat[activeMat.length - 1]?.[(activeMat[0]?.length ?? 1) - 1]
        : "—");

    const is1D = Boolean(
      current.dp1dState ||
        /climb|house-robber|coin-change|longest-increasing-subsequence|\blis\b|word-break|decode-ways|fibonacci|min-cost-climbing|maximum-subarray|jump-game/i.test(
          current.desc ?? ""
        ) ||
        (rows <= 1 && ((current.array?.length ?? 0) > 0 || cells.length > 0))
    );

    readouts = [
      { label: "Engine", value: is1D ? "1D Optimal Substructure" : "2D Transition Alignment", highlight: true },
      { label: is1D ? "Active State" : "Active Cell", value: current.current ?? (typeof current.left === "number" ? `dp[${current.left}]` : "dp[0]"), highlight: true },
      { label: "Table / Array Size", value: is1D ? `N = ${current.array?.length ?? cells.length ?? cols}` : `${rows} × ${cols}` },
      {
        label: "Optimal Subproblem Result",
        value: dpResult,
        highlight: true,
      },
    ];
    primaryBody = (
      <DpTableVisualizer
        matrix={activeMat}
        cols={cols}
        left={typeof current.left === "number" ? current.left : null}
        right={typeof current.right === "number" ? current.right : null}
        left2={typeof current.left2 === "number" ? current.left2 : null}
        right2={typeof current.right2 === "number" ? current.right2 : null}
        current={current.current ?? null}
        visited={visited}
        array={current.array ?? cells}
        secondaryArray={current.secondaryArray}
        rowLabels={current.secondaryArray ? current.secondaryArray.map(String) : null}
        colLabels={current.array ? current.array.map(String) : null}
        direction={current.direction}
        wSum={current.wSum}
        mSum={current.mSum}
        pointer_labels={current.pointer_labels}
        dp1dState={current.dp1dState}
        dp2dState={current.dp2dState}
        desc={current.desc}
        variables={current.variables}
      />
    );
  } else if (type === "bit") {
    const rawVal = current.current ?? cells[0] ?? 0;
    const num = Number(rawVal);
    const ones = (num >>> 0).toString(2).split("").filter((b) => b === "1").length;

    readouts = [
      { label: "Engine", value: "32-Bit ALU Register", highlight: true },
      { label: "Decimal Value", value: !isNaN(num) ? num : String(rawVal), highlight: true },
      { label: "Hamming Weight", value: `${ones} / 32 set` },
      {
        label: "Active Bit Position",
        value: typeof current.left === "number" ? `Bit #${current.left}` : "Bit #0",
      },
    ];
    primaryBody = (
      <BitVisualizer
        cells={cells}
        current={current.current ?? null}
        visited={visited}
        left={current.left}
        right={current.right}
        wSum={current.wSum}
        mSum={current.mSum}
        operation={current.desc}
        bitRegisterState={current.bitRegisterState}
        desc={current.desc}
        variables={current.variables}
      />
    );
  } else if (type === "stack" || type === "queue" || type === "deque") {
    const items = safeArray(
      type === "stack"
        ? current.stack
        : type === "queue"
          ? current.queue
          : current.deque ?? current.monotonicDeque?.deque,
    );
    const secondaryItems =
      type === "stack"
        ? current.secondaryStack
        : type === "queue"
          ? current.secondaryQueue
          : undefined;

    const isMonotonicStack =
      type === "stack" &&
      (Boolean(current.stackInvariant) ||
        Boolean(current.sightlines && current.sightlines.length > 0) ||
        Boolean(current.histogramSpan) ||
        Boolean(current.waterTrapped) ||
        Boolean(current.resultArray && current.resultArray.length > 0));

    if (current.monotonicDeque) {
      readouts = [
        { label: "Structure", value: "Monotonic Deque", highlight: true },
        {
          label: "Window [L .. R]",
          value: current.monotonicDeque.windowRange
            ? `[${current.monotonicDeque.windowRange[0]} .. ${current.monotonicDeque.windowRange[1]}]`
            : "—",
        },
        { label: "Deque Size", value: current.monotonicDeque.deque?.length ?? items.length },
        {
          label: "Window Max",
          value: current.monotonicDeque.windowMax ?? current.current ?? items[0] ?? "—",
          highlight: true,
        },
      ];
    } else if (current.circularBuffer) {
      const cb = current.circularBuffer;
      readouts = [
        { label: "Structure", value: "Circular Ring Buffer", highlight: true },
        { label: "Front / Rear", value: `F: [${cb.front}] ➔ R: [${cb.rear}]` },
        { label: "Occupancy", value: `${cb.size} / ${cb.capacity}`, highlight: cb.isFull || cb.isEmpty },
        { label: "Status", value: cb.isFull ? "FULL" : cb.isEmpty ? "EMPTY" : "READY", highlight: cb.isFull },
      ];
    } else if (current.bfsLevel) {
      const bfs = current.bfsLevel;
      readouts = [
        { label: "Queue Mode", value: "Level-Order BFS", highlight: true },
        { label: "Current Level", value: `Level ${bfs.level}`, highlight: true },
        { label: "Queue Size", value: items.length },
        {
          label: "Level Progress",
          value: bfs.levelSize ? `${bfs.processedInLevel ?? 0} / ${bfs.levelSize}` : `${items.length} nodes`,
        },
      ];
    } else {
      readouts = [
        { label: secondaryItems ? "Primary Size" : "Size", value: items.length },
        { label: "Current", value: current.current ?? null, highlight: true },
        {
          label: secondaryItems ? "Sec. Size" : "Processed",
          value: secondaryItems ? secondaryItems.length : visited.length,
        },
        {
          label: type === "stack" ? "Top Element (TOS)" : type === "deque" ? "Front (Head)" : "Front (Head)",
          value: type === "stack" ? (items[items.length - 1] ?? null) : (items[0] ?? null),
        },
      ];
    }

    if (isMonotonicStack) {
      primaryBody = (
        <MonotonicStackVisualizer
          array={safeArray(current.array ?? cells)}
          stack={items}
          current={current.current ?? null}
          left={typeof current.left === "number" ? current.left : null}
          right={typeof current.right === "number" ? current.right : null}
          stackInvariant={current.stackInvariant}
          sightlines={current.sightlines}
          histogramSpan={current.histogramSpan}
          waterTrapped={current.waterTrapped}
          resultArray={current.resultArray}
          desc={current.desc}
          variables={current.variables}
        />
      );
    } else {
      primaryBody = (
        <StackQueueVisualizer
          items={items}
          secondaryItems={secondaryItems}
          label1={current.datasetLabels?.primary ?? (secondaryItems ? "In-Stack (Input)" : "Primary Buffer")}
          label2={current.datasetLabels?.secondaryArray ?? (secondaryItems ? "Out-Stack (Output)" : "Secondary Buffer")}
          current={current.current ?? null}
          visited={visited}
          type={type}
          stream={current.stream ?? current.array}
          bracketPair={current.bracketPair}
          evalExpression={current.evalExpression}
          variables={current.variables}
          desc={current.desc}
          left={typeof current.left === "number" ? current.left : null}
          monotonicDeque={current.monotonicDeque}
          circularBuffer={current.circularBuffer}
          bfsLevel={current.bfsLevel}
        />
      );
    }
  } else if (type === "recursion-tree" || (current.callStack && current.callStack.length > 0)) {
    const memoHitsCount = current.recursionTree?.filter((n) => n.state === "memo_hit" || n.isMemoHit).length ?? 0;
    const prunedCount = current.recursionTree?.filter((n) => n.state === "pruned").length ?? 0;
    readouts = [
      { label: "Stack Depth", value: current.callStack?.length ?? 1, highlight: true },
      { label: "Tree Explored", value: current.recursionTree?.length ?? 1 },
      { label: "Pruned", value: prunedCount, highlight: prunedCount > 0 },
      { label: "Memo Hits", value: memoHitsCount, highlight: memoHitsCount > 0 },
    ];
    primaryBody = (
      <RecursionVisualizer
        callStack={current.callStack}
        recursionTree={current.recursionTree}
        activeFrameId={current.activeFrameId}
        variables={current.variables}
        desc={current.desc}
        memoTable={current.memoTable}
        memoHitKey={current.memoHitKey}
        prunedBranchId={current.prunedBranchId}
      />
    );
  } else if (type === "intervals" || (current.intervals && current.intervals.length > 0)) {
    const ivList = current.intervals ?? [];
    const isMeetingRooms =
      /meeting-room|conference|rooms|min-meeting/i.test(current.desc ?? "") ||
      current.variables?.rooms !== undefined;

    readouts = [
      {
        label: "Engine",
        value: isMeetingRooms ? "Meeting Rooms & Concurrency" : "Interval Collision & Merge",
        highlight: true,
      },
      { label: "Intervals", value: `${ivList.length} Spans`, highlight: true },
      {
        label: "Sweep Cursor",
        value:
          current.sweepLine !== null && current.sweepLine !== undefined
            ? `T = ${current.sweepLine}`
            : current.variables?.t !== undefined
            ? `T = ${current.variables.t}`
            : "—",
      },
      {
        label: "Active Span",
        value:
          current.current ??
          (current.activeIntervalIndex !== null && current.activeIntervalIndex !== undefined && ivList[current.activeIntervalIndex]
            ? `[${ivList[current.activeIntervalIndex]?.start}, ${ivList[current.activeIntervalIndex]?.end}]`
            : "Scanning"),
        highlight: true,
      },
    ];
    primaryBody = (
      <IntervalVisualizer
        intervals={current.intervals}
        matrix={current.matrix}
        sweepLine={current.sweepLine}
        activeIntervalIndex={current.activeIntervalIndex}
        intervalCollisionState={current.intervalCollisionState}
        desc={current.desc}
        variables={current.variables}
      />
    );
  } else if (type === "heap" || current.heapSwap || current.topKState || current.twoHeapsState) {
    const heapItems = safeArray(
      current.tree && current.tree.length > 0 ? current.tree : current.array ?? cells,
    );
    const inputStream =
      current.stream && current.stream.length > 0
        ? current.stream
        : current.tree && current.tree.length > 0 && Array.isArray(current.array) && current.array !== current.tree
        ? current.array
        : undefined;

    if (current.twoHeapsState) {
      const th = current.twoHeapsState;
      readouts = [
        { label: "Engine", value: "Two-Heap Partition", highlight: true },
        { label: "Median", value: th.median ?? "—", highlight: true },
        { label: "Max-Heap (Lower)", value: `${th.maxHeap.length} items (root: ${th.maxHeap[0] ?? "—"})` },
        { label: "Min-Heap (Upper)", value: `${th.minHeap.length} items (root: ${th.minHeap[0] ?? "—"})` },
      ];
    } else if (current.topKState) {
      const tk = current.topKState;
      readouts = [
        { label: "Engine", value: `Top-K Heap (K=${tk.k})`, highlight: true },
        { label: `K-th ${tk.mode === "smallest" ? "Smallest" : "Largest"}`, value: tk.kthResult ?? heapItems[0] ?? "—", highlight: true },
        { label: "Capacity", value: `${heapItems.length} / ${tk.k}` },
        { label: "Action", value: tk.action ?? "Active" },
      ];
    } else {
      readouts = [
        { label: "Heap Size", value: heapItems.length, highlight: true },
        { label: "Active Node", value: current.activeNodeId ?? current.current ?? "Root [0]" },
        { label: "Swap State", value: current.heapSwap ? `${current.heapSwap.type || "SWAP"}` : "Balanced", highlight: Boolean(current.heapSwap) },
        { label: "Root Val", value: heapItems[0] ?? "-" },
      ];
    }

    primaryBody = (
      <BinaryHeapVisualizer
        items={heapItems}
        inputStream={inputStream}
        heapSwap={current.heapSwap}
        topKState={current.topKState}
        twoHeapsState={current.twoHeapsState}
        activeNodeId={current.activeNodeId ?? current.current}
        desc={current.desc}
        isMinHeap={current.isMinHeap}
        variables={current.variables}
      />
    );
  } else if (Boolean(current.lfuCache || current.skipList || current.disjointIntervals)) {
    if (current.lfuCache) {
      const lfu = current.lfuCache;
      readouts = [
        { label: "Engine", value: "LFU Cache (Bucket DLL)", highlight: true },
        { label: "Capacity", value: `${lfu.size ?? Object.keys(lfu.keyTable || {}).length} / ${lfu.capacity}`, highlight: (lfu.size ?? 0) >= lfu.capacity },
        { label: "min_freq", value: lfu.minFreq, highlight: true },
        { label: "Verdict", value: lfu.hitOrMiss?.toUpperCase() ?? lfu.action?.toUpperCase() ?? "READY" },
      ];
    } else if (current.skipList) {
      const skl = current.skipList;
      readouts = [
        { label: "Engine", value: "Skip List Expressways", highlight: true },
        { label: "Max Levels", value: skl.maxLevel },
        { label: "Active Level", value: `L${skl.currentLevel}`, highlight: true },
        { label: "Result", value: skl.found === true ? "FOUND" : skl.found === false ? "NOT FOUND" : (skl.operation?.toUpperCase() ?? "SEARCH") },
      ];
    } else if (current.disjointIntervals) {
      const ivs = current.disjointIntervals;
      readouts = [
        { label: "Engine", value: "Disjoint Interval Sets", highlight: true },
        { label: "Disjoint Ranges", value: `${ivs.intervals.length} Segments`, highlight: true },
        { label: "Query / Insert", value: ivs.insertedInterval ? `[${ivs.insertedInterval[0]}, ${ivs.insertedInterval[1]}]` : ivs.queryPoint !== undefined && ivs.queryPoint !== null ? `q=${ivs.queryPoint}` : "—" },
        { label: "Operation", value: ivs.operation?.toUpperCase() ?? "MAINTAIN" },
      ];
    }

    primaryBody = (
      <DesignDataStructureVisualizer
        lfuCache={current.lfuCache}
        skipList={current.skipList}
        disjointIntervals={current.disjointIntervals}
        desc={current.desc}
        variables={current.variables}
      />
    );
  } else if (type === "linkedlist" || Boolean(current.lruCache)) {
    const list = safeArray(current.list ?? current.array ?? cells);
    const secList = current.secondaryList ? safeArray(current.secondaryList) : null;

    if (current.lruCache) {
      const lru = current.lruCache;
      readouts = [
        { label: "Engine", value: "LRU Cache", highlight: true },
        { label: "Capacity", value: `${lru.dllOrder.length} / ${lru.capacity}`, highlight: lru.dllOrder.length >= lru.capacity },
        { label: "MRU Key", value: lru.mruKey ?? (lru.dllOrder[0]?.key ?? "—") },
        { label: "LRU Key", value: lru.lruKey ?? (lru.dllOrder[lru.dllOrder.length - 1]?.key ?? "—") },
      ];
    } else if (current.linkedListCycle) {
      const cyc = current.linkedListCycle;
      readouts = [
        { label: "Algorithm", value: "Floyd Cycle Detection", highlight: true },
        { label: "Slow (1x)", value: cyc.slowIndex !== null && cyc.slowIndex !== undefined ? `Node [${cyc.slowIndex}]` : "—" },
        { label: "Fast (2x)", value: cyc.fastIndex !== null && cyc.fastIndex !== undefined ? `Node [${cyc.fastIndex}]` : "—" },
        {
          label: "Status",
          value: cyc.collisionIndex !== null && cyc.collisionIndex !== undefined
            ? `Collision [${cyc.collisionIndex}]`
            : cyc.hasCycle
              ? "Cycle Present"
              : "Advancing",
          highlight: Boolean(cyc.collisionIndex !== null && cyc.collisionIndex !== undefined),
        },
      ];
    } else if (current.linkedListReversal) {
      const rev = current.linkedListReversal;
      readouts = [
        { label: "Operation", value: "Pointer Reversal", highlight: true },
        { label: "PREV", value: rev.prevNode ?? current.predecessor ?? "NULL" },
        { label: "CURR", value: rev.currNode ?? current.current ?? "NULL", highlight: true },
        { label: "NEXT", value: rev.nextNode ?? "NULL" },
      ];
    } else if (secList) {
      readouts = [
        { label: "List 1 (L1)", value: `${list.length} nodes` },
        { label: "List 2 (L2)", value: `${secList.length} nodes` },
        { label: "Active Node", value: current.current ?? "—", highlight: true },
        { label: "Merged", value: visited.length },
      ];
    } else {
      readouts = [
        { label: "Length", value: list.length },
        { label: "Current Node", value: current.current ?? null, highlight: true },
        { label: "Prev / Target", value: current.predecessor ?? null },
        { label: "Traversed", value: visited.length },
      ];
    }

    primaryBody = (
      <LinkedListVisualizer
        list={list}
        secondaryList={secList}
        current={current.current ?? null}
        predecessor={current.predecessor ?? null}
        visited={visited}
        isDoubly={current.isDoubly}
        dummyNodeVal={current.dummyNodeVal}
        slowPointer={current.slowPointer}
        fastPointer={current.fastPointer}
        prevPointer={current.prevPointer}
        currPointer={current.currPointer}
        nextPointer={current.nextPointer}
        linkedListCycle={current.linkedListCycle}
        linkedListReversal={current.linkedListReversal}
        lruCache={current.lruCache}
        desc={current.desc}
        variables={current.variables}
      />
    );
  } else if (type === "tree" || type === "bst" || type === "trie") {
    const fullTreeAcrossSteps = safeSteps.find(
      (s) =>
        Array.isArray(s.tree) &&
        s.tree.filter((x) => x !== null && x !== undefined && String(x) !== "null").length >= 3,
    )?.tree;
    const rawTree = current.tree ?? current.trie ?? fullTreeAcrossSteps ?? cells;
    const tree = safeTreeArray(
      Array.isArray(rawTree) &&
        fullTreeAcrossSteps &&
        rawTree.filter((x) => x !== null && x !== undefined && String(x) !== "null").length <
          fullTreeAcrossSteps.filter((x) => x !== null && x !== undefined && String(x) !== "null")
            .length
        ? fullTreeAcrossSteps
        : rawTree,
    );
    const nonNullNodes = tree.filter((v) => v !== null && v !== undefined && String(v) !== "null");

    if (current.trieState || type === "trie") {
      const trie = current.trieState;
      readouts = [
        { label: "Structure", value: "Trie (Prefix Tree)", highlight: true },
        { label: "Operation", value: (trie?.operation ?? "LOOKUP").toUpperCase(), highlight: true },
        { label: "Query / Word", value: trie?.word ?? current.current ?? "—" },
        { label: "Result", value: trie?.isFound === true ? "Found ✓" : trie?.isFound === false ? "Not Found ✗" : "Traversing..." },
      ];
    } else if (current.bstState || type === "bst") {
      const bst = current.bstState;
      readouts = [
        { label: "Structure", value: "Binary Search Tree", highlight: true },
        { label: "Target Key", value: bst?.target ?? current.current ?? "—", highlight: true },
        { label: "Invariant", value: bst?.isValidBst !== false ? "Valid BST ✓" : "Violation ⚠", highlight: bst?.isValidBst === false },
        { label: "Descent / Op", value: bst?.decision ? bst.decision.replace(/_/g, " ").toUpperCase() : "SEARCH" },
      ];
    } else if (current.treeTraversal) {
      readouts = [
        { label: "Traversal", value: current.treeTraversal.order.toUpperCase(), highlight: true },
        { label: "Emitted Nodes", value: `${current.treeTraversal.output.length} / ${nonNullNodes.length}`, highlight: true },
        { label: "Current Node", value: current.current ?? null },
        { label: "Remaining", value: Math.max(0, nonNullNodes.length - current.treeTraversal.output.length) },
      ];
    } else if (current.treeStructural) {
      const struc = current.treeStructural;
      readouts = [
        { label: "Tree Metric", value: struc.isInverted ? "Inverted Tree" : struc.lcaNodes ? "LCA Convergence" : "Depth / Diameter", highlight: true },
        { label: "Max Depth", value: struc.maxDepth ?? Math.floor(Math.log2(nonNullNodes.length + 1)) + 1 },
        { label: "Current Node", value: current.current ?? "—", highlight: true },
        { label: "Visited", value: visited.length },
      ];
    } else if (current.segmentRange || current.segmentNodeRanges || current.segmentTreeState) {
      const seg = current.segmentTreeState;
      readouts = [
        { label: "Segment Tree", value: `${nonNullNodes.length} nodes`, highlight: true },
        { label: "Query Range", value: current.segmentRange ? `[${current.segmentRange[0]}, ${current.segmentRange[1]}]` : (seg?.queryRange ? `[${seg.queryRange[0]}, ${seg.queryRange[1]}]` : "—") },
        { label: "Range Sum / Aggregate", value: seg?.aggregateResult ?? current.wSum ?? current.current ?? "—", highlight: true },
        { label: "Active Node", value: current.current ?? "—" },
      ];
    } else if (current.fenwickTreeState) {
      const bit = current.fenwickTreeState;
      readouts = [
        { label: "Fenwick Tree (BIT)", value: `${bit.treeArray.length} entries`, highlight: true },
        { label: "Active Bit Index", value: bit.activeBitIndex ?? current.current ?? "—", highlight: true },
        { label: "Prefix Sum", value: bit.prefixSum ?? current.current ?? "—", highlight: true },
        { label: "Operation", value: bit.operation?.toUpperCase() ?? "BIT QUERY" },
      ];
    } else {
      readouts = [
        { label: "Nodes Count", value: nonNullNodes.length },
        { label: "Current Node", value: current.current ?? null, highlight: true },
        { label: "Visited", value: visited.length },
        {
          label: hasAuxQueueInTrace ? "Queue Buffer" : "Type",
          value: hasAuxQueueInTrace ? (current.queue?.length ?? 0) : type.toUpperCase(),
        },
      ];
    }

    primaryBody = (
      <TreeVisualizer
        treeData={tree}
        current={current.current ?? null}
        visited={visited}
        type={type}
        segmentRange={current.segmentRange}
        segmentNodeRanges={current.segmentNodeRanges}
        segmentTreeState={current.segmentTreeState}
        fenwickTreeState={current.fenwickTreeState}
        naryTreeState={current.naryTreeState}
        treeTraversal={current.treeTraversal}
        treeStructural={current.treeStructural}
        bstState={current.bstState}
        trieState={current.trieState}
        lcaNodes={current.lcaNodes}
        invertedTree={current.invertedTree}
        desc={current.desc}
        variables={current.variables}
      />
    );
  } else if (type === "hashmap" || type === "set") {
    const mapEntries = Object.keys(current.map ?? {}).length;
    const setEntries = Array.isArray(current.set) ? current.set.length : 0;
    readouts = [
      { label: "Keys / Size", value: type === "set" ? setEntries : mapEntries },
      { label: "Current Target", value: current.current ?? null, highlight: true },
      { label: "Lookups", value: visited.length },
      { label: "Structure", value: type === "set" ? "Hash Set" : "Hash Map" },
    ];
    primaryBody = (
      <HashMapVisualizer
        map={current.map}
        set={current.set}
        current={current.current ?? null}
        visited={visited}
        type={type}
        desc={current.desc}
      />
    );
  } else if (type === "matrix") {
    const rows = Array.isArray(current.matrix) ? current.matrix.length : 1;
    const cols =
      current.cols ?? (Array.isArray(current.matrix?.[0]) ? current.matrix[0].length : 1);
    const hasAreaStats =
      (current.currentArea !== null && current.currentArea !== undefined) ||
      (current.wSum !== null && current.wSum !== undefined);

    if (current.spiralBounds) {
      const b = current.spiralBounds;
      readouts = [
        { label: "Matrix Size", value: `${rows} × ${cols}` },
        { label: "Active Cell", value: current.current ?? null, highlight: true },
        { label: "Bounds (T/B/L/R)", value: `[${b.top}, ${b.bottom}, ${b.left}, ${b.right}]`, highlight: true },
        { label: "Perimeter Visited", value: visited.length },
      ];
    } else if (typeof current.distanceLayer === "number") {
      readouts = [
        { label: "Grid Size", value: `${rows} × ${cols}` },
        { label: "Active Cell", value: current.current ?? null, highlight: true },
        { label: "Wave Layer", value: `Layer ${current.distanceLayer}`, highlight: true },
        { label: "Queue Frontier", value: current.frontier ? `${current.frontier.length} cells` : "—" },
      ];
    } else if (current.trail && current.trail.length > 0) {
      readouts = [
        { label: "Grid Size", value: `${rows} × ${cols}` },
        { label: "Active Cell", value: current.current ?? null, highlight: true },
        { label: "Path Length", value: current.trail.length, highlight: true },
        { label: "Direction", value: current.direction ?? "DFS" },
      ];
    } else {
      readouts = [
        { label: "Grid Size", value: `${rows} × ${cols}` },
        { label: "Active Cell", value: current.current ?? null, highlight: true },
        {
          label: hasAreaStats ? "Current Area" : "Explored Land",
          value: current.currentArea ?? current.wSum ?? visited.length,
          highlight: hasAreaStats,
        },
        {
          label:
            current.maxArea !== null && current.maxArea !== undefined
              ? "Max Area"
              : current.mSum !== null && current.mSum !== undefined
                ? "Max Area"
                : current.direction
                  ? "Direction"
                  : "Explored",
          value: current.maxArea ?? current.mSum ?? current.direction ?? visited.length,
        },
      ];
    }
    const activeMat = current.matrix ?? traceMatrix;
    primaryBody = (
      <MatrixVisualizer
        matrix={activeMat}
        cols={current.cols ?? (Array.isArray(activeMat?.[0]) ? activeMat[0].length : 1)}
        left={typeof current.left === "number" ? current.left : null}
        right={typeof current.right === "number" ? current.right : null}
        current={current.current ?? null}
        visited={visited}
        direction={current.direction}
        currentArea={current.currentArea}
        maxArea={current.maxArea}
        islandCells={current.islandCells}
        wSum={current.wSum}
        mSum={current.mSum}
        spiralBounds={current.spiralBounds}
        frontier={current.frontier}
        distanceLayer={current.distanceLayer}
        highlightRows={current.highlightRows}
        highlightCols={current.highlightCols}
        trail={current.trail}
        rotationLayer={current.rotationLayer}
        directionRay={current.directionRay}
        waveDistance={current.waveDistance}
        backtrackingRibbon={current.backtrackingRibbon}
        nQueensConflict={current.nQueensConflict}
        rotationOrbit={current.rotationOrbit}
        kernel8Neighbor={current.kernel8Neighbor}
        predecessorArrows={current.predecessorArrows}
      />
    );
  } else if (type === "graph") {
    const rows = Array.isArray(current.matrix) ? current.matrix.length : 1;
    const cols =
      current.cols ?? (Array.isArray(current.matrix?.[0]) ? current.matrix[0].length : 1);

    if (current.topologicalSortState || /course-schedule|alien-dictionary|topological|kahn/i.test(current.desc ?? "")) {
      const topo = current.topologicalSortState;
      readouts = [
        { label: "Engine", value: "Topological Sort (Kahn's BFS)", highlight: true },
        { label: "Active Vertex", value: current.current ?? "—" },
        { label: "Processed", value: `${topo?.processedOrder.length ?? 0} vertices` },
        { label: "Cycle Status", value: topo?.hasCycle ? "DEADLOCK CYCLE" : "Acyclic (DAG)", highlight: Boolean(topo?.hasCycle) },
      ];
    } else if (current.unionFindState || /redundant-connection|number-of-provinces|accounts-merge|union-find|dsu/i.test(current.desc ?? "")) {
      const dsu = current.unionFindState;
      readouts = [
        { label: "Engine", value: "Disjoint Set Union (DSU)", highlight: true },
        { label: "Active Edge", value: dsu?.activeEdge ? `(${dsu.activeEdge.u}, ${dsu.activeEdge.v})` : "—" },
        { label: "Components", value: dsu?.numComponents ?? "Forest", highlight: true },
        { label: "Redundancy", value: dsu?.isRedundant ? "CYCLE DETECTED" : "Valid Tree", highlight: Boolean(dsu?.isRedundant) },
      ];
    } else if (current.wordLadderState || /word-ladder|word_ladder|mutation|gene/i.test(current.desc ?? "")) {
      const wl = current.wordLadderState;
      readouts = [
        { label: "Engine", value: "Word Ladder State-Space", highlight: true },
        { label: "Current Word", value: wl?.currentWord ?? (current.current ? String(current.current) : "—"), highlight: true },
        { label: "Target", value: wl?.endWord ?? "Target" },
        { label: "Path Length", value: wl?.distance ? `${wl.distance} steps` : "Searching" },
      ];
    } else if (current.distances || current.priorityQueue || current.relaxedEdge) {
      readouts = [
        { label: "Algorithm", value: "Dijkstra Shortest Path", highlight: true },
        { label: "Active Vertex", value: current.current ?? "—" },
        { label: "Min-Heap PQ", value: `${current.priorityQueue?.length ?? 0} items` },
        { label: "Shortest Paths", value: current.shortestPathTree?.length ?? 0, highlight: true },
      ];
    } else {
      readouts = [
        { label: "Graph Mode", value: "Network & Search", highlight: true },
        { label: "Nodes / Rows", value: rows },
        { label: "Active Node", value: current.current ?? "—", highlight: true },
        { label: "Visited", value: visited.length },
      ];
    }

    primaryBody = (
      <GraphVisualizer
        matrix={current.matrix}
        cols={current.cols}
        current={current.current ?? null}
        visited={visited}
        type={type}
        distances={current.distances}
        priorityQueue={current.priorityQueue}
        relaxedEdge={current.relaxedEdge}
        shortestPathTree={current.shortestPathTree}
        graphEdges={current.graphEdges}
        isDirected={current.isDirected}
        graphSearchState={current.graphSearchState}
        topologicalSortState={current.topologicalSortState}
        unionFindState={current.unionFindState}
        wordLadderState={current.wordLadderState}
        desc={current.desc}
        variables={current.variables}
      />
    );
  } else {
    // Array / Two Pointers / Sliding Window / Binary Search / Sorting / KMP
    const left = typeof current.left === "number" ? current.left : null;
    const right = typeof current.right === "number" ? current.right : null;
    const left2 = typeof current.left2 === "number" ? current.left2 : null;
    const rPointer = hasSecondaryArrayInTrace && left2 !== null ? left2 : right;

    if (current.rabinKarpState) {
      readouts = [
        { label: "Algorithm", value: "Rabin-Karp Rolling Hash", highlight: true },
        { label: "Window Start", value: current.rabinKarpState.windowStart },
        { label: "Pattern Hash H(P)", value: String(current.rabinKarpState.patternHash), highlight: true },
        { label: "Window Hash H(W)", value: String(current.rabinKarpState.windowHash) },
      ];
    } else if (current.ahoCorasickState) {
      readouts = [
        { label: "Algorithm", value: "Aho-Corasick Automaton", highlight: true },
        { label: "Active State", value: `Node #${current.ahoCorasickState.currentStateId}`, highlight: true },
        { label: "Input Text Idx", value: current.ahoCorasickState.textIndex },
        { label: "Matches Emitted", value: current.ahoCorasickState.emittedMatches?.length ?? 0 },
      ];
    } else if (current.kmpState || current.patternStr || current.lps) {
      readouts = [
        { label: "Algorithm", value: "KMP Matching", highlight: true },
        { label: "Text Idx (i)", value: current.kmpState?.textIndex ?? current.textIndex ?? 0 },
        { label: "Pattern Idx (j)", value: current.kmpState?.patternIndex ?? current.patternIndex ?? 0 },
        {
          label: "Match Status",
          value: current.kmpState?.isMatch ? "Character Match" : current.kmpState?.isMismatch ? "Mismatch / Fallback" : current.wSum ? `Match at ${current.left}` : "Searching...",
          highlight: Boolean(current.kmpState?.isMatch || current.wSum),
        },
      ];
    } else if (current.dnfPartition) {
      readouts = [
        { label: "Algorithm", value: "Dutch National Flag", highlight: true },
        { label: "Low [0s end]", value: current.dnfPartition.low },
        { label: "Mid [Scan]", value: current.dnfPartition.mid, highlight: true },
        { label: "High [2s start]", value: current.dnfPartition.high },
      ];
    } else if (current.binarySearchPartition) {
      readouts = [
        { label: "Algorithm", value: "Binary Search", highlight: true },
        { label: "Low", value: current.binarySearchPartition.low },
        { label: "Mid", value: current.binarySearchPartition.mid, highlight: true },
        { label: "High", value: current.binarySearchPartition.high },
      ];
    } else if (current.slidingWindowSpan) {
      readouts = [
        { label: "Algorithm", value: "Sliding Window", highlight: true },
        { label: "Left (L)", value: current.slidingWindowSpan.left },
        { label: "Right (R)", value: current.slidingWindowSpan.right },
        {
          label: "Window Sum/Len",
          value:
            current.slidingWindowSpan.sum ??
            current.wSum ??
            current.slidingWindowSpan.length,
          highlight: true,
        },
      ];
    } else if (current.prefixSumProjection) {
      readouts = [
        {
          label: "Query Range",
          value: `[${current.prefixSumProjection.queryRange[0]} .. ${current.prefixSumProjection.queryRange[1]}]`,
          highlight: true,
        },
        { label: "Prefix Index R", value: current.prefixSumProjection.prefixIndices[1] },
        { label: "Prefix Index L", value: current.prefixSumProjection.prefixIndices[0] },
        { label: "Subarray Sum", value: current.prefixSumProjection.rangeSum ?? current.wSum ?? "—", highlight: true },
      ];
    } else if (current.cyclicSortJump) {
      const isPlaced = current.cyclicSortJump.action === "placed" || current.cyclicSortJump.fromIdx === current.cyclicSortJump.targetIdx;
      readouts = [
        { label: "Algorithm", value: "Cyclic Sort", highlight: true },
        { label: "Source [i]", value: current.cyclicSortJump.fromIdx },
        { label: "Target [val-1]", value: current.cyclicSortJump.targetIdx, highlight: true },
        {
          label: "Status",
          value: isPlaced ? "In Position" : current.cyclicSortJump.isDuplicate ? "Duplicate" : "Needs Swap",
          highlight: isPlaced,
        },
      ];
    } else if (current.swapFlight) {
      readouts = [
        { label: "Operation", value: "In-Place Swap", highlight: true },
        { label: "Swap Indices", value: `[${current.swapFlight.idx1}] ↔ [${current.swapFlight.idx2}]`, highlight: true },
        { label: "Values", value: `${current.swapFlight.val1} ↔ ${current.swapFlight.val2}` },
        { label: "Array Size", value: cells.length },
      ];
    } else {
      const pLeftLabel = current.pointer_labels?.left ?? (hasSecondaryArrayInTrace ? "Pointer L (Seq 1)" : "Left (L)");
      const pRightLabel = current.pointer_labels?.right ?? (hasSecondaryArrayInTrace ? "Pointer R (Seq 2)" : "Right (R)");
      const pMidLabel = current.pointer_labels?.mid ?? current.pointer_labels?.current ?? "Mid";

      readouts = [
        { label: pLeftLabel, value: left },
        { label: pRightLabel, value: rPointer },
        {
          label:
            current.wSum !== null && current.wSum !== undefined
              ? hasSecondaryArrayInTrace
                ? "LCS Length"
                : "Window Sum"
              : current.pointer_labels?.current
                ? current.pointer_labels.current
                : typeof left === "number" && typeof right === "number" && left <= right
                  ? pMidLabel
                  : "Current",
          value:
            current.wSum ??
            (typeof left === "number" && typeof right === "number" && left <= right && !hasSecondaryArrayInTrace
              ? Math.floor((left + right) / 2)
              : current.current ?? null),
          highlight: true,
        },
        {
          label: hasAuxMapInTrace
            ? "Map Entries"
            : hasAuxStackInTrace
              ? "Stack Size"
              : current.mSum !== null && current.mSum !== undefined
                ? "Best / Max"
                : "Array Size",
          value: hasAuxMapInTrace
            ? Object.keys(current.map ?? {}).length
            : hasAuxStackInTrace
              ? (current.stack?.length ?? 0)
              : (current.mSum ?? cells.length),
        },
      ];
    }
    primaryBody = (
      <ArrayVisualizer
        cells={cells}
        left={left}
        right={right}
        secondaryArray={current.secondaryArray}
        left2={current.left2}
        right2={current.right2}
        label1={(() => {
          if (current.datasetLabels?.primary) return current.datasetLabels.primary;
          if (current.datasetLabels?.array) return current.datasetLabels.array;
          const isStr = Array.isArray(current.array) && current.array.some((x) => typeof x === "string" && isNaN(Number(x)));
          if (current.secondaryArray) return isStr ? "Primary Sequence (arr1)" : "Primary Array (nums1)";
          return isStr ? "Input Sequence" : "Input Array";
        })()}
        label2={(() => {
          if (current.datasetLabels?.secondaryArray) return current.datasetLabels.secondaryArray;
          if (current.datasetLabels?.nums2) return current.datasetLabels.nums2;
          const isStr = Array.isArray(current.secondaryArray) && current.secondaryArray.some((x) => typeof x === "string" && isNaN(Number(x)));
          return isStr ? "Secondary Sequence (arr2)" : "Secondary Array (nums2)";
        })()}
        activeDataset={current.activeDataset}
        current={current.current ?? null}
        visited={current.visited ?? null}
        wSum={current.wSum}
        mSum={current.mSum}
        isMathMode={isMathMode}
        pointer_labels={current.pointer_labels}
        lps={current.lps}
        patternStr={current.patternStr}
        textStr={current.textStr}
        patternIndex={current.patternIndex}
        textIndex={current.textIndex}
        kmpState={current.kmpState}
        rabinKarpState={current.rabinKarpState}
        ahoCorasickState={current.ahoCorasickState}
        stringPatternState={current.stringPatternState}
        dnfPartition={current.dnfPartition}
        binarySearchPartition={current.binarySearchPartition}
        slidingWindowSpan={current.slidingWindowSpan}
        prefixSumProjection={current.prefixSumProjection}
        cyclicSortJump={current.cyclicSortJump}
        swapFlight={current.swapFlight}
        motionBlurEnabled={motionBlurEnabled}
      />
    );
  }

  // -------------------------------------------------------------
  // AUXILIARY STRUCTURE COMPONENTS
  // -------------------------------------------------------------
  const auxMapComponent = (hasAuxMapInTrace || hasAuxSetInTrace) && (
    <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3.5 shadow-sm backdrop-blur-sm animate-fade">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary">
          <Database className="size-3.5" />
          <span>Synchronized Auxiliary Hash Table</span>
        </div>
        <span className="rounded-md bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/30">
          Step {step + 1} State
        </span>
      </div>
      <HashMapVisualizer
        map={current.map ?? {}}
        set={current.set ?? []}
        current={current.current ?? null}
        visited={visited}
        type={hasAuxSetInTrace ? "set" : "hashmap"}
      />
    </div>
  );

  const auxBufferComponent = (hasAuxStackInTrace || hasAuxQueueInTrace) && (
    <div className="flex flex-col gap-2 rounded-2xl border border-accent/30 bg-accent/5 p-3.5 shadow-sm backdrop-blur-sm animate-fade">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-accent">
          <Layers className="size-3.5" />
          <span>Working {hasAuxStackInTrace ? "Stack" : "Queue"} Buffer</span>
        </div>
        <span className="rounded-md bg-accent/20 px-2 py-0.5 font-mono text-[10px] font-bold text-accent border border-accent/30">
          {hasAuxStackInTrace ? "LIFO" : "FIFO"}
        </span>
      </div>
      <StackQueueVisualizer
        items={safeArray(hasAuxStackInTrace ? (current.stack ?? []) : (current.queue ?? []))}
        current={current.current ?? null}
        visited={visited}
        type={hasAuxStackInTrace ? "stack" : "queue"}
      />
    </div>
  );

  const auxListComponent = hasAuxListInTrace && (
    <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 shadow-sm backdrop-blur-sm animate-fade">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
          <Sparkles className="size-3.5" />
          <span>Auxiliary Linked List</span>
        </div>
      </div>
      <LinkedListVisualizer
        list={safeArray(current.list ?? [])}
        current={current.current ?? null}
        predecessor={current.predecessor ?? null}
        visited={visited}
      />
    </div>
  );

  const auxTreeComponent = hasAuxTreeInTrace && (
    <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 shadow-sm backdrop-blur-sm animate-fade">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
          <Sparkles className="size-3.5" />
          <span>Auxiliary Priority Queue / Heap Structure</span>
        </div>
        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
          Step {step + 1}
        </span>
      </div>
      <TreeVisualizer
        treeData={safeTreeArray(current.tree ?? [])}
        current={current.current ?? null}
        visited={visited}
        type="heap"
      />
    </div>
  );

  const auxArrayComponent = hasAuxArrayInTrace && type !== "array" && (
    <div className="flex flex-col gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 shadow-sm backdrop-blur-sm animate-fade">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300">
          <Sparkles className="size-3.5" />
          <span>Input Array &amp; Traversal Pointer</span>
        </div>
        {current.left !== null && current.left !== undefined && (
          <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
            Pointer [{current.left}]
          </span>
        )}
      </div>
      <ArrayVisualizer
        cells={safeArray(current.array ?? array)}
        left={current.left}
        right={current.right}
        current={current.current ?? null}
        visited={current.visited ?? null}
        wSum={current.wSum}
        mSum={current.mSum}
        label1="Input Stream"
        isMathMode={isMathMode}
        hideBars={true}
        pointer_labels={current.pointer_labels}
      />
    </div>
  );

  return (
    <div
      data-motion-blur={motionBlurEnabled ? "true" : "false"}
      className={`flex flex-col gap-4 transition-all duration-300 ${
        motionBlurEnabled ? "motion-blur-active" : ""
      }`}
    >
      {/* SVG Motion Blur Filter Definition */}
      {motionBlurEnabled && (
        <svg className="sr-only" aria-hidden="true">
          <defs>
            <filter id="viz-motion-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3 0" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      )}

      {/* Live Trace Streaming Cycle Banner */}
      {liveStatus && (
        <div className="relative overflow-hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-3.5 sm:px-5 backdrop-blur-md shadow-sm animate-fade">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${
                  liveStatus.isComplete
                    ? "bg-emerald-400 opacity-75"
                    : "bg-amber-400 animate-ping opacity-75"
                }`}
              />
              <span
                className={`relative inline-flex size-3 rounded-full ${
                  liveStatus.isComplete ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  {liveStatus.datasetLabel}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold border transition-all ${
                    liveStatus.isComplete
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-300 animate-pulse"
                  }`}
                >
                  {liveStatus.isComplete
                    ? "is_complete: true ✓"
                    : `is_complete: false (streaming cycle ${liveStatus.loopCount})`}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {liveStatus.statusText}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded-lg border border-border/80 bg-background/60 px-2.5 py-1 text-primary font-bold shadow-xs">
              Cycle #{liveStatus.loopCount} • {safeSteps.length} Live Steps
            </span>
          </div>
        </div>
      )}

      {/* Live Asymptotic Telemetry HUD Ribbon */}
      <TelemetryMetricsBar
        step={step}
        totalSteps={safeSteps.length}
        cumulativeOperations={cumulativeOperations}
        estimatedBigO={estimatedBigO}
        peakAuxMemory={peakAuxMemory}
        showDetails={showTelemetryDetails}
        onToggleDetails={() => setShowTelemetryDetails((v) => !v)}
        showComplexityVisualizer={showComplexityVisualizer}
        onToggleComplexityVisualizer={() => setShowComplexityVisualizer((v) => !v)}
      />

      {/* Interactive Asymptotic Complexity Curves & Operation Profiling Visualizer */}
      {showComplexityVisualizer && (
        <AsymptoticComplexityVisualizer
          currentStepIndex={step}
          totalSteps={safeSteps.length}
          steps={safeSteps}
          estimatedBigO={estimatedBigO}
          peakAuxMemory={peakAuxMemory}
          onClose={() => setShowComplexityVisualizer(false)}
        />
      )}

      {/* Playback Controls & Timeline Scrubber */}
      <VisualizerControls
        activeStepIndex={playback.activeStepIndex}
        totalSteps={playback.totalSteps}
        isPlaying={playback.isPlaying}
        isLooping={playback.isLooping}
        isScrubbing={playback.isScrubbing}
        speed={playback.speed}
        vizType={type}
        breakpointCount={breakpoints.size}
        breakpointIndices={playback.breakpointStepIndices}
        onStepChange={playback.setActiveStepIndex}
        onScrubStart={playback.startScrubbing}
        onScrub={playback.scrubTo}
        onScrubEnd={playback.commitScrub}
        onPlayToggle={playback.togglePlay}
        onLoopToggle={playback.toggleLoop}
        onSpeedChange={playback.setSpeed}
        onReset={playback.reset}
        onJumpBreakpoint={playback.jumpToNextBreakpoint}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenExport={() => setShowExportModal(true)}
      />

      {/* Presentation, Multi-Dataset & Inspection Controls */}
      <VisualizerToolbar
        hasMultipleDatasets={hasMultipleDatasets}
        activeDataset={current.activeDataset ?? undefined}
        showVariableWatch={showVariableWatch}
        onToggleVariableWatch={() => setShowVariableWatch((v) => !v)}
        motionBlurEnabled={motionBlurEnabled}
        onToggleMotionBlur={() => setMotionBlurEnabled((v) => !v)}
        multiDatasetEnabled={multiDatasetEnabled}
        onToggleMultiDataset={() => setMultiDatasetEnabled((v) => !v)}
        layoutMode={layoutMode}
        onSelectLayoutMode={setLayoutMode}
      />

      {/* Smart Cross-Dataset Shift / Transition Indicator Banner */}
      {current.shiftInfo && (
        <CrossDatasetShiftBanner shiftInfo={current.shiftInfo} />
      )}

      {/* State & Pointer Readout Badges */}
      <StatReadouts items={readouts} />

      {/* Visualizer Canvases (Primary & Auxiliary Panes) */}
      <VisualizerContentPanes
        layoutMode={layoutMode}
        hasMultipleDatasets={hasMultipleDatasets}
        multiDatasetEnabled={multiDatasetEnabled}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        type={type}
        current={current}
        hasAuxMapInTrace={hasAuxMapInTrace}
        hasAuxSetInTrace={hasAuxSetInTrace}
        hasAuxStackInTrace={hasAuxStackInTrace}
        hasAuxQueueInTrace={hasAuxQueueInTrace}
        hasAuxListInTrace={hasAuxListInTrace}
        hasAuxTreeInTrace={hasAuxTreeInTrace}
        hasAuxArrayInTrace={hasAuxArrayInTrace}
        primaryBody={primaryBody}
        auxMapComponent={auxMapComponent}
        auxBufferComponent={auxBufferComponent}
        auxListComponent={auxListComponent}
        auxTreeComponent={auxTreeComponent}
        auxArrayComponent={auxArrayComponent}
      />

      {/* Step Description, Operation Tag & Step Mutation Diff */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <span
            className={`shrink-0 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider ${operation.color}`}
          >
            {operation.label}
          </span>
          <div className="flex-1 text-sm leading-relaxed text-foreground">
            <span className="font-mono text-xs font-semibold text-muted-foreground mr-1.5">
              Step {step + 1}/{safeSteps.length}:
            </span>
            {toText(current.desc)}
          </div>
          <button
            type="button"
            onClick={() => {
              openChat({
                role: "step_doubts",
                currentStep: step,
                totalSteps: safeSteps.length,
                stepDesc: toText(current.desc),
                stepVariables: current.variables || {},
                customPrompt: `Can you explain what is happening in Step ${step + 1} of this simulation ("${toText(current.desc)}") without giving away the rest of the algorithm?`,
              });
            }}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 text-[11px] font-bold text-primary transition-all shadow-xs"
            title="Ask Vizco Buddy to explain this exact simulation step"
          >
            <Bot className="size-3.5" />
            <span className="hidden sm:inline">Ask Doubt on Step</span>
            <span className="sm:hidden">Ask Vizco</span>
          </button>
        </div>

        {/* Step Mutation Diff Inspector */}
        <div className="pt-1 border-t border-border/40">
          <StepDiffInspector
            currentStep={current}
            prevStep={step > 0 ? safeSteps[step - 1] ?? null : null}
            stepIndex={step}
          />
        </div>
      </div>

      {/* Live Variable Watch Table (Toggleable) */}
      {showVariableWatch && (
        <VariableWatchTable
          currentStep={current}
          prevStep={step > 0 ? safeSteps[step - 1] ?? null : null}
          stepIndex={step}
        />
      )}

      {/* Synchronized Pseudocode Inspector with Interactive Breakpoints & Line Jumping */}
      <PseudocodeTraceInspector
        codeLines={codeLines}
        currentLine={current.line}
        breakpoints={breakpoints}
        onToggleBreakpoint={toggleBreakpoint}
        onJumpToLine={jumpToLine}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Frame Snapshot Export Modal */}
      <ExportSnapshotModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        currentStep={current}
        stepIndex={step}
        totalSteps={safeSteps.length}
        vizType={type}
      />
    </div>
  );
});

export default Visualizer;


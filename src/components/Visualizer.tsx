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
  onStepChange,
}: {
  array: (number | string)[];
  codeLines: string[];
  steps: VizStep[];
  onStepChange?: (stepIndex: number, lineIndex: number) => void;
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

  // Synchronize current simulation step into ChatContext and parent listeners
  useEffect(() => {
    if (safeSteps.length > 0 && safeSteps[step]) {
      updateContext({
        currentStep: step,
        totalSteps: safeSteps.length,
        stepDesc: toText(safeSteps[step]?.desc),
        stepVariables: safeSteps[step]?.variables || {},
      });
      onStepChange?.(step, safeSteps[step]?.line ?? 0);
    }
  }, [step, safeSteps, updateContext, onStepChange]);


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

  if (type === "dp") {
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

    readouts = [
      { label: "DP Table Size", value: `${rows} × ${cols}` },
      { label: "Active State", value: current.current ?? null, highlight: true },
      { label: "Computed Cells", value: visited.length },
      {
        label: "Optimal Result",
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
        rowLabels={current.secondaryArray ? current.secondaryArray.map(String) : null}
        colLabels={current.array ? current.array.map(String) : null}
        direction={current.direction}
        wSum={current.wSum}
        mSum={current.mSum}
        pointer_labels={current.pointer_labels}
        activePointers={current.activePointers}
      />
    );
  } else if (type === "bit") {

    readouts = [
      { label: "Bit Value", value: current.current ?? cells[0] ?? null, highlight: true },
      { label: "Active Bit Index", value: current.left ?? 0 },
      { label: "Operands", value: cells.length },
      { label: "Result / Mask", value: current.mSum ?? current.wSum ?? "—" },
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
      />
    );
  } else if (type === "stack" || type === "queue" || type === "deque") {
    const items = safeArray(
      type === "stack" ? current.stack : type === "queue" ? current.queue : current.deque,
    );
    const secondaryItems =
      type === "stack"
        ? current.secondaryStack
        : type === "queue"
          ? current.secondaryQueue
          : undefined;

    readouts = [
      { label: secondaryItems ? "Primary Size" : "Size", value: items.length },
      { label: "Current", value: current.current ?? null, highlight: true },
      { label: secondaryItems ? "Sec. Size" : "Processed", value: secondaryItems ? secondaryItems.length : visited.length },
      {
        label: type === "stack" ? "Top Element" : "Front Element",
        value: type === "stack" ? (items[items.length - 1] ?? null) : (items[0] ?? null),
      },
    ];
    primaryBody = (
      <StackQueueVisualizer
        items={items}
        secondaryItems={secondaryItems}
        label1={current.datasetLabels?.primary ?? (secondaryItems ? "In-Stack (Input)" : "Primary Buffer")}
        label2={current.datasetLabels?.secondaryArray ?? (secondaryItems ? "Out-Stack (Output)" : "Secondary Buffer")}
        current={current.current ?? null}
        visited={visited}
        type={type}
      />
    );
  } else if (type === "linkedlist") {
    const list = safeArray(current.list ?? cells);
    readouts = [
      { label: "Length", value: list.length },
      { label: "Current Node", value: current.current ?? null, highlight: true },
      { label: "Prev / Target", value: current.predecessor ?? null },
      { label: "Traversed", value: visited.length },
    ];
    primaryBody = (
      <LinkedListVisualizer
        list={list}
        current={current.current ?? null}
        predecessor={current.predecessor ?? null}
        visited={visited}
        pointer_labels={current.pointer_labels}
        activePointers={current.activePointers}
      />
    );

  } else if (type === "tree" || type === "bst" || type === "heap" || type === "trie") {
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
    readouts = [
      { label: "Nodes Count", value: nonNullNodes.length },
      { label: "Current Node", value: current.current ?? null, highlight: true },
      { label: "Visited", value: visited.length },
      {
        label: hasAuxQueueInTrace ? "Queue Buffer" : "Type",
        value: hasAuxQueueInTrace ? (current.queue?.length ?? 0) : type.toUpperCase(),
      },
    ];
    primaryBody = (
      <TreeVisualizer
        treeData={tree}
        current={current.current ?? null}
        visited={visited}
        type={type}
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
      />
    );
  } else if (type === "matrix") {
    const rows = Array.isArray(current.matrix) ? current.matrix.length : 1;
    const cols =
      current.cols ?? (Array.isArray(current.matrix?.[0]) ? current.matrix[0].length : 1);
    const hasAreaStats =
      (current.currentArea !== null && current.currentArea !== undefined) ||
      (current.wSum !== null && current.wSum !== undefined);

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
        activePointers={current.activePointers}
      />
    );
  } else if (type === "graph") {
    const rows = Array.isArray(current.matrix) ? current.matrix.length : 1;
    const cols =
      current.cols ?? (Array.isArray(current.matrix?.[0]) ? current.matrix[0].length : 1);

    readouts = [
      { label: "Nodes / Rows", value: rows },
      { label: "Cols", value: cols },
      { label: "Active Node", value: current.current ?? null, highlight: true },
      { label: "Visited", value: visited.length },
    ];
    primaryBody = (
      <GraphVisualizer
        matrix={current.matrix}
        cols={current.cols}
        current={current.current ?? null}
        visited={visited}
        type={type}
        map={current.map}
      />
    );
  } else {
    // Array / Two Pointers / Sliding Window / Binary Search / Sorting
    const left = typeof current.left === "number" ? current.left : null;
    const right = typeof current.right === "number" ? current.right : null;
    const left2 = typeof current.left2 === "number" ? current.left2 : null;
    const rPointer = hasSecondaryArrayInTrace && left2 !== null ? left2 : right;

    readouts = [
      { label: hasSecondaryArrayInTrace ? "Pointer L (Seq 1)" : "Left (L)", value: left },
      { label: hasSecondaryArrayInTrace ? "Pointer R (Seq 2)" : "Right (R)", value: rPointer },
      {
        label:
          current.wSum !== null && current.wSum !== undefined
            ? hasSecondaryArrayInTrace
              ? "LCS Length"
              : "Window Sum"
            : "Current",
        value: current.wSum ?? current.current ?? null,
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
    primaryBody = (
      <ArrayVisualizer
        cells={cells}
        left={left}
        right={right}
        secondaryArray={current.secondaryArray}
        left2={current.left2}
        right2={current.right2}
        label1={
          current.datasetLabels?.primary ??
          (current.secondaryArray ? "Primary Array (nums1)" : "Input Array")
        }
        label2={current.datasetLabels?.secondaryArray ?? "Secondary Array (nums2)"}
        activeDataset={current.activeDataset}
        current={current.current ?? null}
        visited={current.visited ?? null}
        wSum={current.wSum}
        mSum={current.mSum}
        isMathMode={isMathMode}
        pointer_labels={current.pointer_labels}
        activePointers={current.activePointers}
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
        pointer_labels={current.pointer_labels}
        activePointers={current.activePointers}
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
    <div className="flex flex-col gap-4">
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
            title="Ask Gemini AI to explain this exact simulation step"
          >
            <Bot className="size-3.5" />
            <span className="hidden sm:inline">Ask Doubt on Step</span>
            <span className="sm:hidden">Ask AI</span>
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


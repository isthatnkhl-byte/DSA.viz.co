import React, { useMemo, useState, useEffect } from "react";
import type { Val, HeapSwap, TopKState, TwoHeapsState } from "./VisualizerTypes";
import { safeArray } from "./VisualizerTypes";
import {
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  Layers,
  GitFork,
  Sparkles,
  Plus,
  Trash2,
  RotateCcw,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Scale,
  Crown,
  Binary,
  Sliders,
  Eye,
  RefreshCw,
  Zap,
  Filter,
  Database,
  Hash,
  ArrowRight,
} from "lucide-react";

interface BinaryHeapVisualizerProps {
  items: Val[];
  inputStream?: Val[];
  heapSwap?: HeapSwap | null;
  topKState?: TopKState | null;
  twoHeapsState?: TwoHeapsState | null;
  activeNodeId?: number | string | null;
  desc?: string;
  isMinHeap?: boolean;
  variables?: Record<string, any> | null;
}

interface SiftStepRecord {
  heap: number[];
  swap?: HeapSwap;
  activeIdx?: number;
  description: string;
}

interface TwoHeapsStepRecord {
  maxHeap: number[];
  minHeap: number[];
  median: number;
  description: string;
  action: string;
  incomingVal: number;
}

interface TopKStepRecord {
  heap: number[];
  k: number;
  incomingVal: number;
  evicted: number[];
  description: string;
  action: string;
  kthVal: number;
}

export function BinaryHeapVisualizer({
  items: rawItems,
  inputStream,
  heapSwap: propHeapSwap,
  topKState: propTopKState,
  twoHeapsState: propTwoHeapsState,
  activeNodeId: propActiveNodeId,
  desc: propDesc = "",
  isMinHeap: propIsMinHeap = true,
  variables,
}: BinaryHeapVisualizerProps) {
  // Infer or auto-detect whether problem is Min-Heap vs Max-Heap
  const detectedIsMinHeap = useMemo(() => {
    if (typeof propIsMinHeap === "boolean") return propIsMinHeap;
    if (variables?.isMinHeap !== undefined) return Boolean(variables.isMinHeap);
    if (/max-heap|maxheap|kth-smallest|furthest-building/i.test(propDesc)) return false;
    if (/min-heap|minheap|kth-largest|median-from-data-stream/i.test(propDesc)) return true;
    return true;
  }, [propIsMinHeap, variables, propDesc]);

  const [isMinHeap, setIsMinHeap] = useState<boolean>(detectedIsMinHeap);
  useEffect(() => {
    setIsMinHeap(detectedIsMinHeap);
  }, [detectedIsMinHeap]);

  // Visualizer Tab Mode: 'standard' | 'two-heaps' | 'top-k'
  const detectedMode = useMemo<"standard" | "two-heaps" | "top-k">(() => {
    if (propTwoHeapsState || variables?.maxHeap || variables?.minHeap || /median|two-heap|find-median/i.test(propDesc)) {
      return "two-heaps";
    }
    if (propTopKState || variables?.k || /top-k|kth-largest|k-closest|top.*frequent/i.test(propDesc)) {
      return "top-k";
    }
    return "standard";
  }, [propTwoHeapsState, propTopKState, variables, propDesc]);

  const [activeTab, setActiveTab] = useState<"standard" | "two-heaps" | "top-k">(detectedMode);
  useEffect(() => {
    setActiveTab(detectedMode);
  }, [detectedMode]);

  // ---------------------------------------------------------------------------
  // 1. STANDARD HEAP SANDBOX STATE
  // ---------------------------------------------------------------------------
  const [sandboxHeap, setSandboxHeap] = useState<number[] | null>(null);
  const [sandboxInputValue, setSandboxInputValue] = useState<string>("7");
  const [sandboxSteps, setSandboxSteps] = useState<SiftStepRecord[]>([]);
  const [sandboxStepIndex, setSandboxStepIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Controlled items either from sandbox or external simulator
  const activeHeap = useMemo(() => {
    if (sandboxHeap !== null) {
      if (sandboxSteps.length > 0 && sandboxStepIndex < sandboxSteps.length) {
        return sandboxSteps[sandboxStepIndex]!.heap;
      }
      return sandboxHeap;
    }
    const safe = safeArray(rawItems);
    if (safe.length === 0) {
      return [1, 3, 2, 7, 6, 5, 4];
    }
    return safe.map(Number).filter((n) => !isNaN(n));
  }, [sandboxHeap, sandboxSteps, sandboxStepIndex, rawItems]);

  const items = activeHeap;

  // Active heap swap and active node id
  const heapSwap: HeapSwap | null = useMemo(() => {
    if (sandboxHeap !== null && sandboxSteps.length > 0 && sandboxStepIndex < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIndex]!.swap ?? null;
    }
    return propHeapSwap ?? null;
  }, [sandboxHeap, sandboxSteps, sandboxStepIndex, propHeapSwap]);

  const activeNodeId = useMemo(() => {
    if (sandboxHeap !== null && sandboxSteps.length > 0 && sandboxStepIndex < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIndex]!.activeIdx ?? null;
    }
    return propActiveNodeId ?? null;
  }, [sandboxHeap, sandboxSteps, sandboxStepIndex, propActiveNodeId]);

  const desc = useMemo(() => {
    if (sandboxHeap !== null && sandboxSteps.length > 0 && sandboxStepIndex < sandboxSteps.length) {
      return sandboxSteps[sandboxStepIndex]!.description;
    }
    return propDesc;
  }, [sandboxHeap, sandboxSteps, sandboxStepIndex, propDesc]);

  // Hover state for 1D/2D cross-inspection
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Active index derived from activeNodeId or hover
  const activeIdx = useMemo(() => {
    if (hoveredIdx !== null) return hoveredIdx;
    if (activeNodeId !== null && activeNodeId !== undefined) {
      const parsed = Number(activeNodeId);
      if (!isNaN(parsed) && parsed >= 0 && parsed < items.length) {
        return parsed;
      }
    }
    return null;
  }, [hoveredIdx, activeNodeId, items.length]);

  // Compute family indices for activeIdx: parent, left, right, sibling
  const family = useMemo(() => {
    if (activeIdx === null) return null;
    const parent = activeIdx > 0 ? Math.floor((activeIdx - 1) / 2) : null;
    const left = 2 * activeIdx + 1 < items.length ? 2 * activeIdx + 1 : null;
    const right = 2 * activeIdx + 2 < items.length ? 2 * activeIdx + 2 : null;
    const sibling =
      activeIdx > 0
        ? activeIdx % 2 === 1
          ? activeIdx + 1 < items.length
            ? activeIdx + 1
            : null
          : activeIdx - 1
        : null;
    return { current: activeIdx, parent, left, right, sibling };
  }, [activeIdx, items.length]);

  // Invariant Validation: check if parent <= child (min-heap) or parent >= child (max-heap)
  const heapValidation = useMemo(() => {
    let isValid = true;
    const violations: Array<{ parentIdx: number; childIdx: number; reason: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < items.length) {
        const cond = isMinHeap ? items[i]! <= items[left]! : items[i]! >= items[left]!;
        if (!cond) {
          isValid = false;
          violations.push({
            parentIdx: i,
            childIdx: left,
            reason: isMinHeap
              ? `Parent [${i}: ${items[i]}] > Left Child [${left}: ${items[left]}]`
              : `Parent [${i}: ${items[i]}] < Left Child [${left}: ${items[left]}]`,
          });
        }
      }
      if (right < items.length) {
        const cond = isMinHeap ? items[i]! <= items[right]! : items[i]! >= items[right]!;
        if (!cond) {
          isValid = false;
          violations.push({
            parentIdx: i,
            childIdx: right,
            reason: isMinHeap
              ? `Parent [${i}: ${items[i]}] > Right Child [${right}: ${items[right]}]`
              : `Parent [${i}: ${items[i]}] < Right Child [${right}: ${items[right]}]`,
          });
        }
      }
    }

    return { isValid, violations };
  }, [items, isMinHeap]);

  // Complete Binary Tree Layout computation
  const treeLayout = useMemo(() => {
    if (items.length === 0) return { nodes: [], edges: [], width: 560, height: 280 };

    const nodes: Array<{
      idx: number;
      val: number;
      x: number;
      y: number;
      level: number;
    }> = [];

    const edges: Array<{
      fromIdx: number;
      toIdx: number;
      isLeft: boolean;
      fromPos: { x: number; y: number };
      toPos: { x: number; y: number };
    }> = [];

    const maxLevel = Math.floor(Math.log2(items.length));
    const totalLeavesAtBottom = Math.pow(2, maxLevel);
    const canvasWidth = Math.max(560, totalLeavesAtBottom * 76);
    const levelHeight = 74;

    // Place each node geometrically
    for (let i = 0; i < items.length; i++) {
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, level) - 1);
      const totalInLevel = Math.pow(2, level);
      const slotWidth = canvasWidth / totalInLevel;
      const x = slotWidth * (posInLevel + 0.5);
      const y = 48 + level * levelHeight;

      nodes.push({ idx: i, val: items[i]!, x, y, level });
    }

    // Connect edges
    for (let i = 0; i < items.length; i++) {
      const leftIdx = 2 * i + 1;
      const rightIdx = 2 * i + 2;
      const parentPos = nodes[i];
      if (!parentPos) continue;

      if (leftIdx < items.length && nodes[leftIdx]) {
        edges.push({
          fromIdx: i,
          toIdx: leftIdx,
          isLeft: true,
          fromPos: { x: parentPos.x, y: parentPos.y },
          toPos: { x: nodes[leftIdx]!.x, y: nodes[leftIdx]!.y },
        });
      }
      if (rightIdx < items.length && nodes[rightIdx]) {
        edges.push({
          fromIdx: i,
          toIdx: rightIdx,
          isLeft: false,
          fromPos: { x: parentPos.x, y: parentPos.y },
          toPos: { x: nodes[rightIdx]!.x, y: nodes[rightIdx]!.y },
        });
      }
    }

    const height = (maxLevel + 1) * levelHeight + 54;
    return { nodes, edges, width: canvasWidth, height: Math.max(280, height) };
  }, [items]);

  // ---------------------------------------------------------------------------
  // 2. TWO-HEAPS STREAM PARTITION STATE & SIMULATOR
  // ---------------------------------------------------------------------------
  const twoHeapsData = useMemo<TwoHeapsState>(() => {
    if (propTwoHeapsState) return propTwoHeapsState;

    // Infer from variables
    const maxH: number[] = Array.isArray(variables?.maxHeap)
      ? variables.maxHeap.map(Number).filter((n) => !isNaN(n))
      : Array.isArray(variables?.leftHeap)
      ? variables.leftHeap.map(Number).filter((n) => !isNaN(n))
      : [5, 2, 1]; // Lower half (smaller numbers, max at root)

    const minH: number[] = Array.isArray(variables?.minHeap)
      ? variables.minHeap.map(Number).filter((n) => !isNaN(n))
      : Array.isArray(variables?.rightHeap)
      ? variables.rightHeap.map(Number).filter((n) => !isNaN(n))
      : [8, 9]; // Upper half (larger numbers, min at root)

    let medianVal: number | string = 5;
    if (maxH.length === minH.length && maxH.length > 0) {
      medianVal = (maxH[0]! + minH[0]!) / 2;
    } else if (maxH.length > minH.length && maxH.length > 0) {
      medianVal = maxH[0]!;
    } else if (minH.length > 0) {
      medianVal = minH[0]!;
    }

    return {
      maxHeap: maxH,
      minHeap: minH,
      median: variables?.median ?? medianVal,
      incomingVal: variables?.num ?? variables?.val ?? null,
      rebalanceAction: maxH.length - minH.length > 1 ? "shift_to_min" : minH.length > maxH.length ? "shift_to_max" : "balanced",
      streamHistory: Array.isArray(variables?.stream) ? variables.stream : [5, 2, 8, 1, 9, 3],
    };
  }, [propTwoHeapsState, variables]);

  const [twoHeapsStreamInput, setTwoHeapsStreamInput] = useState<string>("4");
  const [twoHeapsStream, setTwoHeapsStream] = useState<number[]>([5, 2, 8, 1, 9, 3]);
  const [twoHeapsMax, setTwoHeapsMax] = useState<number[]>([5, 2, 1]);
  const [twoHeapsMin, setTwoHeapsMin] = useState<number[]>([8, 9]);

  // Insert number into live Two-Heaps stream
  const handleInsertTwoHeaps = () => {
    const num = parseFloat(twoHeapsStreamInput);
    if (isNaN(num)) return;

    const newStream = [...twoHeapsStream, num];
    setTwoHeapsStream(newStream);

    // Dynamic two-heaps insertion logic
    const currentMax = [...twoHeapsMax];
    const currentMin = [...twoHeapsMin];

    // Step 1: Route to Max-Heap or Min-Heap
    if (currentMax.length === 0 || num <= currentMax[0]!) {
      currentMax.push(num);
      currentMax.sort((a, b) => b - a); // Maintain max at index 0
    } else {
      currentMin.push(num);
      currentMin.sort((a, b) => a - b); // Maintain min at index 0
    }

    // Step 2: Rebalance if size diff > 1 or minHeap > maxHeap
    if (currentMax.length > currentMin.length + 1) {
      const moved = currentMax.shift()!;
      currentMin.push(moved);
      currentMin.sort((a, b) => a - b);
    } else if (currentMin.length > currentMax.length) {
      const moved = currentMin.shift()!;
      currentMax.push(moved);
      currentMax.sort((a, b) => b - a);
    }

    setTwoHeapsMax(currentMax);
    setTwoHeapsMin(currentMin);
  };

  const handleResetTwoHeaps = () => {
    setTwoHeapsStream([5, 2, 8, 1, 9, 3]);
    setTwoHeapsMax([5, 2, 1]);
    setTwoHeapsMin([8, 9]);
  };

  // Calculated median for Two-Heaps stream
  const currentMedian = useMemo(() => {
    if (twoHeapsMax.length === 0 && twoHeapsMin.length === 0) return 0;
    if (twoHeapsMax.length === twoHeapsMin.length) {
      return (twoHeapsMax[0]! + twoHeapsMin[0]!) / 2;
    }
    return twoHeapsMax.length > twoHeapsMin.length ? twoHeapsMax[0]! : twoHeapsMin[0]!;
  }, [twoHeapsMax, twoHeapsMin]);

  // ---------------------------------------------------------------------------
  // 3. TOP-K TRACKING STATE & SIMULATOR
  // ---------------------------------------------------------------------------
  const topKData = useMemo<TopKState>(() => {
    if (propTopKState) return propTopKState;

    const kVal = typeof variables?.k === "number" ? variables.k : 2;
    const safeH = items.slice(0, kVal);
    const sorted = [...safeH].sort((a, b) => (isMinHeap ? a - b : b - a));

    return {
      k: kVal,
      mode: isMinHeap ? "largest" : "smallest",
      incomingVal: variables?.num ?? variables?.val ?? null,
      heapCapacity: kVal,
      evictedItems: Array.isArray(variables?.evicted) ? variables.evicted : [],
      currentTopK: sorted,
      kthResult: sorted[0] ?? null,
      action: variables?.action ?? "push_direct",
      reason: variables?.reason ?? `Maintaining top ${kVal} elements in bounded min-heap.`,
    };
  }, [propTopKState, variables, items, isMinHeap]);

  const [topKLimit, setTopKLimit] = useState<number>(topKData.k || 2);
  const [topKStreamInput, setTopKStreamInput] = useState<string>("8");
  const [topKHeap, setTopKHeap] = useState<number[]>([5, 6]);
  const [topKEvicted, setTopKEvicted] = useState<number[]>([3, 2, 1, 4]);

  const handleInsertTopK = () => {
    const val = parseInt(topKStreamInput, 10);
    if (isNaN(val)) return;

    const current = [...topKHeap];
    const evicted = [...topKEvicted];

    if (current.length < topKLimit) {
      current.push(val);
      current.sort((a, b) => a - b);
    } else {
      if (val > current[0]!) {
        const popped = current.shift()!;
        evicted.push(popped);
        current.push(val);
        current.sort((a, b) => a - b);
      } else {
        evicted.push(val);
      }
    }

    setTopKHeap(current);
    setTopKEvicted(evicted);
  };

  const handleResetTopK = () => {
    setTopKLimit(2);
    setTopKHeap([5, 6]);
    setTopKEvicted([3, 2, 1, 4]);
  };

  // ---------------------------------------------------------------------------
  // 4. INTERACTIVE SIFT-UP & SIFT-DOWN GENERATORS
  // ---------------------------------------------------------------------------
  const handleInsert = () => {
    const val = parseInt(sandboxInputValue, 10);
    if (isNaN(val)) return;

    const baseHeap = items.length > 0 ? [...items] : [];
    const steps: SiftStepRecord[] = [];

    // Step 1: Append at end of array (as rightmost leaf in binary tree)
    const currentHeap = [...baseHeap, val];
    let currIdx = currentHeap.length - 1;

    steps.push({
      heap: [...currentHeap],
      activeIdx: currIdx,
      description: `Insert ${val} at the end of the array (idx ${currIdx}, tree leaf). Begin Sift-Up comparison.`,
    });

    // Step 2+: Sift-Up loop
    while (currIdx > 0) {
      const parentIdx = Math.floor((currIdx - 1) / 2);
      const parentVal = currentHeap[parentIdx]!;
      const childVal = currentHeap[currIdx]!;

      const needsSwap = isMinHeap ? childVal < parentVal : childVal > parentVal;

      if (needsSwap) {
        steps.push({
          heap: [...currentHeap],
          swap: {
            parentIdx,
            childIdx: currIdx,
            type: "sift-up",
            reason: isMinHeap
              ? `Child ${childVal} < Parent ${parentVal}: violates min-heap invariant. Swap & promote upward.`
              : `Child ${childVal} > Parent ${parentVal}: violates max-heap invariant. Swap & promote upward.`,
          },
          activeIdx: currIdx,
          description: `Sift-Up: Swap child [idx ${currIdx}: ${childVal}] ⇄ parent [idx ${parentIdx}: ${parentVal}].`,
        });

        // Perform swap
        currentHeap[currIdx] = parentVal;
        currentHeap[parentIdx] = childVal;

        steps.push({
          heap: [...currentHeap],
          activeIdx: parentIdx,
          description: `Swapped! Value ${childVal} is now at idx ${parentIdx}. Continue checking upward.`,
        });

        currIdx = parentIdx;
      } else {
        steps.push({
          heap: [...currentHeap],
          activeIdx: currIdx,
          description: `Invariant satisfied! Parent [idx ${parentIdx}: ${parentVal}] is in correct relation with [idx ${currIdx}: ${childVal}]. Sift-Up complete.`,
        });
        break;
      }
    }

    setSandboxHeap(currentHeap);
    setSandboxSteps(steps);
    setSandboxStepIndex(0);
  };

  const handleExtractRoot = () => {
    if (items.length === 0) return;

    const baseHeap = [...items];
    const steps: SiftStepRecord[] = [];

    if (baseHeap.length === 1) {
      const popped = baseHeap[0]!;
      steps.push({
        heap: [],
        description: `Extracted only root element ${popped}. Heap is now empty.`,
      });
      setSandboxHeap([]);
      setSandboxSteps(steps);
      setSandboxStepIndex(0);
      return;
    }

    // Step 1: Pop root, replace with last element
    const rootVal = baseHeap[0]!;
    const lastVal = baseHeap.pop()!;
    baseHeap[0] = lastVal;

    steps.push({
      heap: [...baseHeap],
      activeIdx: 0,
      description: `Extract root ${rootVal}. Move last leaf (${lastVal}) to root (idx 0). Begin Sift-Down.`,
    });

    let currIdx = 0;
    const len = baseHeap.length;

    while (currIdx < len) {
      const left = 2 * currIdx + 1;
      const right = 2 * currIdx + 2;
      let targetIdx = currIdx;

      if (isMinHeap) {
        if (left < len && baseHeap[left]! < baseHeap[targetIdx]!) {
          targetIdx = left;
        }
        if (right < len && baseHeap[right]! < baseHeap[targetIdx]!) {
          targetIdx = right;
        }
      } else {
        if (left < len && baseHeap[left]! > baseHeap[targetIdx]!) {
          targetIdx = left;
        }
        if (right < len && baseHeap[right]! > baseHeap[targetIdx]!) {
          targetIdx = right;
        }
      }

      if (targetIdx !== currIdx) {
        const parentVal = baseHeap[currIdx]!;
        const childVal = baseHeap[targetIdx]!;

        steps.push({
          heap: [...baseHeap],
          swap: {
            parentIdx: currIdx,
            childIdx: targetIdx,
            type: "sift-down",
            reason: isMinHeap
              ? `Parent ${parentVal} > smaller child ${childVal}: swap and sink downward.`
              : `Parent ${parentVal} < larger child ${childVal}: swap and sink downward.`,
          },
          activeIdx: currIdx,
          description: `Sift-Down: Swap parent [idx ${currIdx}: ${parentVal}] ⇄ child [idx ${targetIdx}: ${childVal}].`,
        });

        baseHeap[currIdx] = childVal;
        baseHeap[targetIdx] = parentVal;

        steps.push({
          heap: [...baseHeap],
          activeIdx: targetIdx,
          description: `Swapped! Value ${parentVal} sunken to idx ${targetIdx}. Check children below.`,
        });

        currIdx = targetIdx;
      } else {
        steps.push({
          heap: [...baseHeap],
          activeIdx: currIdx,
          description: `Invariant satisfied at idx ${currIdx}! Both children are in correct order. Sift-Down complete.`,
        });
        break;
      }
    }

    setSandboxHeap(baseHeap);
    setSandboxSteps(steps);
    setSandboxStepIndex(0);
  };

  const handleReset = () => {
    setSandboxHeap([1, 3, 2, 7, 6, 5, 4]);
    setSandboxSteps([]);
    setSandboxStepIndex(0);
    setIsAutoPlaying(false);
  };

  // Step through sandbox steps if playing
  useEffect(() => {
    if (!isAutoPlaying || sandboxSteps.length === 0) return;
    const timer = setInterval(() => {
      setSandboxStepIndex((prev) => {
        if (prev < sandboxSteps.length - 1) return prev + 1;
        setIsAutoPlaying(false);
        return prev;
      });
    }, 850);
    return () => clearInterval(timer);
  }, [isAutoPlaying, sandboxSteps]);

  const isSiftUp = heapSwap?.type === "sift-up";
  const isSiftDown = heapSwap?.type === "sift-down" || (!isSiftUp && Boolean(heapSwap));

  return (
    <div className="flex flex-col gap-3 w-full h-full p-2 font-sans">
      {/* Top Header: Navigation Mode Switcher & Invariant Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-card border border-border/70 text-xs font-mono shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("standard")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "standard"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GitFork className="w-3.5 h-3.5 text-primary" />
              <span>Binary Heap</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("top-k")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "top-k"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Top-K Tracker</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("two-heaps")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                activeTab === "two-heaps"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              <span>Two-Heap Median</span>
            </button>
          </div>

          <span className="text-border">|</span>

          {/* Min vs Max Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinHeap((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold transition-all ${
                isMinHeap
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-purple-500/15 text-purple-400 border-purple-500/30"
              }`}
            >
              {isMinHeap ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
              <span>{isMinHeap ? "MIN-HEAP (Ascending Invariant)" : "MAX-HEAP (Descending Invariant)"}</span>
            </button>
          </div>

          {/* Invariant Validation Badge */}
          {activeTab === "standard" && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border text-[10px] font-semibold ${
                heapValidation.isValid
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse"
              }`}
            >
              {heapValidation.isValid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid Invariant (Root: {items[0] ?? "∅"})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Invariant Violated ({heapValidation.violations.length} conflicts)</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Index Formulas Ribbon */}
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span className="text-indigo-400 font-semibold" title="Parent index formula">
            parent = ⌊(i-1)/2⌋
          </span>
          <span className="text-border">|</span>
          <span className="text-emerald-400 font-semibold" title="Left child index formula">
            left = 2i+1
          </span>
          <span className="text-border">|</span>
          <span className="text-amber-400 font-semibold" title="Right child index formula">
            right = 2i+2
          </span>
        </div>
      </div>

      {/* -----------------------------------------------------------------------
          PANEL A: TWO-HEAPS STREAM PARTITION (MEDIAN STREAM)
         ----------------------------------------------------------------------- */}
      {activeTab === "two-heaps" && (
        <div className="flex flex-col gap-3">
          {/* Median Telemetry Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-purple-500/10 via-background to-teal-500/10 border border-border/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    STREAM MEDIAN ESTIMATOR
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    BALANCED PARTITIONS
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-mono font-black text-foreground">
                    {currentMedian}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    (Formula: {twoHeapsMax.length === twoHeapsMin.length
                      ? `(${twoHeapsMax[0] ?? 0} + ${twoHeapsMin[0] ?? 0}) / 2`
                      : twoHeapsMax.length > twoHeapsMin.length
                      ? `MaxHeap[0] = ${twoHeapsMax[0] ?? 0}`
                      : `MinHeap[0] = ${twoHeapsMin[0] ?? 0}`})
                  </span>
                </div>
              </div>
            </div>

            {/* Ingestion Stream Controller */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={twoHeapsStreamInput}
                onChange={(e) => setTwoHeapsStreamInput(e.target.value)}
                className="w-16 px-2.5 py-1 rounded-md bg-background border border-border/80 text-foreground text-center text-xs font-mono font-bold"
                placeholder="num"
              />
              <button
                type="button"
                onClick={handleInsertTwoHeaps}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs font-mono transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Stream In</span>
              </button>
              <button
                type="button"
                onClick={handleResetTwoHeaps}
                className="p-1.5 rounded-md bg-muted/60 text-muted-foreground hover:text-foreground transition-all"
                title="Reset Stream"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Stream History Timeline */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/60 border border-border/70 text-xs font-mono overflow-x-auto">
            <span className="text-muted-foreground font-bold shrink-0">STREAM HISTORY:</span>
            <div className="flex items-center gap-1.5">
              {twoHeapsStream.map((n, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                    idx === twoHeapsStream.length - 1
                      ? "bg-primary/20 text-primary border-primary/40 ring-1 ring-primary/30"
                      : "bg-muted/50 text-foreground border-border/60"
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* Dual Heap Partition Containers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Lower Half Max-Heap */}
            <div className="flex flex-col rounded-xl bg-card/60 border border-purple-500/30 p-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-purple-500/20 text-purple-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono text-purple-300">
                      LOWER HALF (MAX-HEAP)
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Stores elements ≤ Median (Size: {twoHeapsMax.length})
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                  ROOT (MAX): {twoHeapsMax[0] ?? "∅"}
                </span>
              </div>

              {/* Elements List */}
              <div className="flex flex-wrap gap-1.5 py-2">
                {twoHeapsMax.length === 0 ? (
                  <span className="text-xs font-mono text-muted-foreground italic">Heap empty</span>
                ) : (
                  twoHeapsMax.map((val, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col items-center px-2.5 py-1 rounded-lg border font-mono ${
                        idx === 0
                          ? "bg-purple-500/25 border-purple-400 text-purple-200 font-extrabold shadow-xs scale-105"
                          : "bg-background/80 border-border/70 text-foreground font-semibold"
                      }`}
                    >
                      <span className="text-xs">{val}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {idx === 0 ? "ROOT" : `[${idx}]`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upper Half Min-Heap */}
            <div className="flex flex-col rounded-xl bg-card/60 border border-teal-500/30 p-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-teal-500/20 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-teal-500/20 text-teal-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-mono text-teal-300">
                      UPPER HALF (MIN-HEAP)
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      Stores elements ≥ Median (Size: {twoHeapsMin.length})
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold">
                  ROOT (MIN): {twoHeapsMin[0] ?? "∅"}
                </span>
              </div>

              {/* Elements List */}
              <div className="flex flex-wrap gap-1.5 py-2">
                {twoHeapsMin.length === 0 ? (
                  <span className="text-xs font-mono text-muted-foreground italic">Heap empty</span>
                ) : (
                  twoHeapsMin.map((val, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col items-center px-2.5 py-1 rounded-lg border font-mono ${
                        idx === 0
                          ? "bg-teal-500/25 border-teal-400 text-teal-200 font-extrabold shadow-xs scale-105"
                          : "bg-background/80 border-border/70 text-foreground font-semibold"
                      }`}
                    >
                      <span className="text-xs">{val}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {idx === 0 ? "ROOT" : `[${idx}]`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          PANEL B: TOP-K BOUNDED HEAP TRACKER
         ----------------------------------------------------------------------- */}
      {activeTab === "top-k" && (
        <div className="flex flex-col gap-3">
          {/* Top-K Telemetry Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-background to-emerald-500/10 border border-border/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    BOUNDED TOP-{topKLimit} HEAP TRACKER
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Capacity: {topKHeap.length} / {topKLimit}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-mono font-black text-amber-400">
                    {topKHeap[0] ?? "∅"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    (Current {topKLimit}th Largest Element = Min-Heap Root)
                  </span>
                </div>
              </div>
            </div>

            {/* Stream Controller */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-muted-foreground">K =</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={topKLimit}
                  onChange={(e) => setTopKLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-12 px-1.5 py-1 rounded-md bg-background border border-border/80 text-foreground text-center text-xs font-mono font-bold"
                />
              </div>

              <input
                type="number"
                value={topKStreamInput}
                onChange={(e) => setTopKStreamInput(e.target.value)}
                className="w-16 px-2.5 py-1 rounded-md bg-background border border-border/80 text-foreground text-center text-xs font-mono font-bold"
                placeholder="val"
              />
              <button
                type="button"
                onClick={handleInsertTopK}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs font-mono transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Push Element</span>
              </button>
              <button
                type="button"
                onClick={handleResetTopK}
                className="p-1.5 rounded-md bg-muted/60 text-muted-foreground hover:text-foreground transition-all"
                title="Reset Top-K"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Top-K Retention vs Evicted Elements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Top-K Retained Elements */}
            <div className="flex flex-col rounded-xl bg-card/60 border border-amber-500/30 p-3 shadow-xs">
              <span className="text-xs font-mono font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                RETAINED TOP-{topKLimit} ELEMENTS (MIN-HEAP)
              </span>
              <div className="flex flex-wrap gap-2 py-1">
                {topKHeap.map((val, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-lg border font-mono ${
                      idx === 0
                        ? "bg-amber-500/25 border-amber-400 text-amber-300 font-extrabold shadow-xs"
                        : "bg-background/80 border-border/70 text-foreground font-semibold"
                    }`}
                  >
                    <span className="text-sm">{val}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {idx === 0 ? "K-TH (ROOT)" : `RANK ${idx + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evicted Elements */}
            <div className="flex flex-col rounded-xl bg-card/60 border border-border/70 p-3 shadow-xs">
              <span className="text-xs font-mono font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                EVICTED / DISCARDED SMALLER ELEMENTS
              </span>
              <div className="flex flex-wrap gap-1.5 py-1">
                {topKEvicted.length === 0 ? (
                  <span className="text-xs font-mono text-muted-foreground italic">
                    No elements evicted yet
                  </span>
                ) : (
                  topKEvicted.map((val, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded bg-rose-500/10 text-rose-300/80 border border-rose-500/20 text-xs font-mono line-through"
                    >
                      {val}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          PANEL C: STANDARD SIFT-UP & SIFT-DOWN HEAP CONTROLLER
         ----------------------------------------------------------------------- */}
      {/* Sift Transition Alert Banner */}
      {heapSwap && (
        <div
          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-mono shadow-xs transition-all ${
            isSiftUp
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20"
              : "bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/20"
          }`}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className={`p-1.5 rounded-lg flex items-center justify-center ${
                isSiftUp ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {isSiftUp ? (
                <ArrowUp className="w-4 h-4 animate-bounce" />
              ) : (
                <ArrowDown className="w-4 h-4 animate-bounce" />
              )}
            </div>
            <div>
              <span className="font-bold uppercase tracking-wider mr-2">
                {isSiftUp ? "▲ SIFT-UP (BUBBLE-UP):" : "▼ SIFT-DOWN (TRICKLE-DOWN):"}
              </span>
              <span>
                Child [idx {heapSwap.childIdx}: {items[heapSwap.childIdx]}] ⇄ Parent [idx{" "}
                {heapSwap.parentIdx}: {items[heapSwap.parentIdx]}]
              </span>
              {heapSwap.reason && (
                <span className="text-muted-foreground ml-2">({heapSwap.reason})</span>
              )}
            </div>
          </div>

          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
              isSiftUp ? "bg-emerald-500/25 text-emerald-300" : "bg-amber-500/25 text-amber-300"
            }`}
          >
            {isSiftUp ? "Promoting Upward" : "Sinking Downward"}
          </span>
        </div>
      )}

      {/* Interactive Sandbox Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-card/60 border border-border/70 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-foreground">HEAP SANDBOX CONTROLLER:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Insert Value Input */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={sandboxInputValue}
              onChange={(e) => setSandboxInputValue(e.target.value)}
              className="w-14 px-2 py-1 rounded-md bg-background border border-border/80 text-foreground text-center text-xs font-mono font-bold"
              placeholder="val"
            />
            <button
              type="button"
              onClick={handleInsert}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-2xs"
              title="Insert element at array leaf and animate Sift-Up"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Insert (Sift-Up)</span>
            </button>
          </div>

          {/* Extract Root Button */}
          <button
            type="button"
            onClick={handleExtractRoot}
            disabled={items.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold text-xs hover:bg-rose-500/25 disabled:opacity-50 transition-all"
            title="Pop root element and animate Sift-Down rebalancing"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Extract Root (Sift-Down)</span>
          </button>

          {/* Reset Demo Button */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 text-muted-foreground hover:text-foreground transition-all"
            title="Reset to default heap dataset"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          {/* Stepper Controls if sandbox steps exist */}
          {sandboxSteps.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
              <button
                type="button"
                onClick={() => setSandboxStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={sandboxStepIndex === 0}
                className="px-2 py-0.5 rounded bg-muted/60 text-foreground disabled:opacity-40"
              >
                ◀ Prev
              </button>
              <span className="text-[10px] text-muted-foreground">
                {sandboxStepIndex + 1}/{sandboxSteps.length}
              </span>
              <button
                type="button"
                onClick={() => setSandboxStepIndex((prev) => Math.min(sandboxSteps.length - 1, prev + 1))}
                disabled={sandboxStepIndex >= sandboxSteps.length - 1}
                className="px-2 py-0.5 rounded bg-muted/60 text-foreground disabled:opacity-40"
              >
                Next ▶
              </button>
              <button
                type="button"
                onClick={() => setIsAutoPlaying((prev) => !prev)}
                className={`p-1 rounded ${isAutoPlaying ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
                title="Play animation"
              >
                {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description Step Banner */}
      {desc && (
        <div className="px-3.5 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-xs font-mono text-muted-foreground flex items-center justify-between">
          <span className="truncate">{desc}</span>
          {inputStream && (
            <span className="text-[10px] text-primary/80 shrink-0 ml-2">
              Input Stream: [{inputStream.slice(0, 8).join(", ")}{inputStream.length > 8 ? "..." : ""}]
            </span>
          )}
        </div>
      )}

      {/* VIEW 1: 1D Contiguous Array Representation */}
      <div className="flex flex-col rounded-xl bg-card/60 border border-border/70 p-3 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            1D CONTIGUOUS ARRAY MEMORY VIEW (Level-Order Array)
          </span>
          {family && (
            <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              Selected: [idx {family.current}: {items[family.current]}]
              {family.parent !== null && ` | Parent: [idx ${family.parent}: ${items[family.parent]}]`}
              {family.left !== null && ` | Left: [idx ${family.left}: ${items[family.left]}]`}
              {family.right !== null && ` | Right: [idx ${family.right}: ${items[family.right]}]`}
              {family.sibling !== null && ` | Sibling: [idx ${family.sibling}]`}
            </span>
          )}
        </div>

        {/* Array Cells & Animated Swap Arc */}
        <div className="relative py-2 overflow-x-auto">
          {/* Sift-Up/Down Arc Overlay if swapping */}
          {heapSwap && heapSwap.parentIdx < items.length && heapSwap.childIdx < items.length && (
            <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10 flex items-center justify-center">
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider ${
                  isSiftUp
                    ? "bg-emerald-500 text-white animate-pulse"
                    : "bg-amber-500 text-white animate-pulse"
                }`}
              >
                {isSiftUp ? "▲ Sifting Up ⇄ Swapping Indices" : "▼ Sifting Down ⇄ Swapping Indices"}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-4 pb-1">
            {items.map((val, idx) => {
              const isRoot = idx === 0;
              const isCurrent = family?.current === idx;
              const isParent = family?.parent === idx;
              const isLeft = family?.left === idx;
              const isRight = family?.right === idx;
              const isSibling = family?.sibling === idx;
              const isSwapping =
                heapSwap && (heapSwap.parentIdx === idx || heapSwap.childIdx === idx);

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`relative flex flex-col items-center min-w-[58px] p-2 rounded-xl border transition-all cursor-pointer select-none ${
                    isSwapping
                      ? isSiftUp
                        ? "bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/50 scale-105 shadow-sm"
                        : "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-sm"
                      : isCurrent
                      ? "bg-primary/20 border-primary ring-2 ring-primary/40 shadow-sm"
                      : isParent
                      ? "bg-indigo-500/15 border-indigo-400 ring-1 ring-indigo-400/30"
                      : isLeft || isRight
                      ? "bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-400/30"
                      : isSibling
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-background/80 border-border/70 hover:border-primary/50"
                  }`}
                >
                  {/* Family Role Tag */}
                  <div className="h-4 flex items-center justify-center text-[9px] font-mono font-extrabold uppercase">
                    {isSwapping ? (
                      <span className={isSiftUp ? "text-emerald-300 font-bold" : "text-amber-300 font-bold"}>
                        {heapSwap?.parentIdx === idx ? "PARENT" : "CHILD"}
                      </span>
                    ) : isCurrent ? (
                      <span className="text-primary font-bold">NODE</span>
                    ) : isParent ? (
                      <span className="text-indigo-400">PARENT</span>
                    ) : isLeft ? (
                      <span className="text-emerald-400">LEFT</span>
                    ) : isRight ? (
                      <span className="text-amber-400">RIGHT</span>
                    ) : isSibling ? (
                      <span className="text-amber-300/80">SIBLING</span>
                    ) : isRoot ? (
                      <span className="text-muted-foreground font-semibold">ROOT</span>
                    ) : (
                      <span className="text-transparent">.</span>
                    )}
                  </div>

                  {/* Array Cell Value */}
                  <div className="min-w-10 w-auto px-2.5 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm whitespace-nowrap bg-card border border-border/50 text-foreground my-1 shadow-2xs">
                    {val}
                  </div>

                  {/* Index Readout */}
                  <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    [{idx}]
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* VIEW 2: Synchronized Complete Binary Tree Canvas */}
      <div className="flex flex-col flex-1 rounded-xl bg-card/60 border border-border/70 overflow-hidden shadow-xs">
        <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold font-mono">
            <GitFork className="w-3.5 h-3.5 text-primary" />
            <span>EQUIVALENT COMPLETE BINARY TREE STRUCTURE</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" /> Selected
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Parent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Child
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> Sift Swap
            </span>
          </div>
        </div>

        <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center min-h-[280px] bg-dot-grid">
          <svg
            width={treeLayout.width}
            height={treeLayout.height}
            className="max-w-none transition-all duration-300"
          >
            <defs>
              <marker
                id="arrow-sift-up"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
              </marker>
              <marker
                id="arrow-sift-down"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
              </marker>
            </defs>

            {/* Tree Branch Lines */}
            {treeLayout.edges.map((edge) => {
              const isSwappingEdge =
                heapSwap &&
                ((heapSwap.parentIdx === edge.fromIdx && heapSwap.childIdx === edge.toIdx) ||
                  (heapSwap.parentIdx === edge.toIdx && heapSwap.childIdx === edge.fromIdx));

              const isActiveEdge =
                family &&
                (family.current === edge.fromIdx || family.current === edge.toIdx);

              const strokeColor = isSwappingEdge
                ? isSiftUp
                  ? "#10b981"
                  : "#f59e0b"
                : isActiveEdge
                ? "hsl(var(--primary))"
                : "hsl(var(--border))";

              const midX = (edge.fromPos.x + edge.toPos.x) / 2;
              const midY = (edge.fromPos.y + edge.toPos.y) / 2;

              return (
                <g key={`${edge.fromIdx}->${edge.toIdx}`}>
                  {/* Swapping Edge Halo Glow */}
                  {isSwappingEdge && (
                    <line
                      x1={edge.fromPos.x}
                      y1={edge.fromPos.y}
                      x2={edge.toPos.x}
                      y2={edge.toPos.y}
                      stroke={isSiftUp ? "#10b981" : "#f59e0b"}
                      strokeWidth={8}
                      strokeOpacity={0.25}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Main Branch Line */}
                  <line
                    x1={edge.fromPos.x}
                    y1={edge.fromPos.y}
                    x2={edge.toPos.x}
                    y2={edge.toPos.y}
                    stroke={strokeColor}
                    strokeWidth={isSwappingEdge ? 3.5 : isActiveEdge ? 2.5 : 1.5}
                    strokeDasharray={isSwappingEdge ? "5 3" : undefined}
                  />

                  {/* Left (L) / Right (R) Branch Orientation Badge */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x={-9}
                      y={-7}
                      width={18}
                      height={14}
                      rx={3}
                      className={edge.isLeft ? "fill-emerald-950/80 stroke-emerald-500/40" : "fill-amber-950/80 stroke-amber-500/40"}
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.32em"
                      className={`text-[8.5px] font-mono font-bold select-none ${
                        edge.isLeft ? "fill-emerald-400" : "fill-amber-400"
                      }`}
                    >
                      {edge.isLeft ? "L" : "R"}
                    </text>
                  </g>

                  {/* Directional Transition Chevron for Sift-Up vs Sift-Down */}
                  {isSwappingEdge && (
                    <g transform={`translate(${midX}, ${midY - 14})`}>
                      <circle
                        r={11}
                        className={isSiftUp ? "fill-emerald-950 stroke-emerald-400 stroke-2" : "fill-amber-950 stroke-amber-400 stroke-2"}
                      />
                      <text
                        textAnchor="middle"
                        dy="0.35em"
                        className={`text-[10px] font-bold ${isSiftUp ? "fill-emerald-300" : "fill-amber-300"}`}
                      >
                        {isSiftUp ? "▲" : "▼"}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Tree Nodes */}
            {treeLayout.nodes.map((node) => {
              const idx = node.idx;
              const isCurrent = family?.current === idx;
              const isParent = family?.parent === idx;
              const isLeft = family?.left === idx;
              const isRight = family?.right === idx;
              const isSwapping =
                heapSwap && (heapSwap.parentIdx === idx || heapSwap.childIdx === idx);

              const valText = String(node.val);
              const radius = 22;
              const capsuleW = Math.max(radius * 2, valText.length * 7.5 + 18);
              const idxBadgeText = `i=${idx}`;
              const idxBadgeW = Math.max(36, idxBadgeText.length * 6 + 12);

              return (
                <g
                  key={idx}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-transform duration-200 hover:scale-110"
                >
                  {/* Swapping animated pulse ring */}
                  {isSwapping && (
                    <rect
                      x={-(capsuleW / 2 + 6)}
                      y={-(radius + 6)}
                      width={capsuleW + 12}
                      height={(radius + 6) * 2}
                      rx={radius + 6}
                      className={isSiftUp ? "stroke-emerald-400/60 fill-emerald-400/15 animate-ping" : "stroke-amber-400/60 fill-amber-400/15 animate-ping"}
                      strokeWidth={2}
                    />
                  )}

                  {/* Main Node Capsule (circle when short, rounded pill when value is large) */}
                  <rect
                    x={-capsuleW / 2}
                    y={-radius}
                    width={capsuleW}
                    height={radius * 2}
                    rx={radius}
                    className={`transition-colors shadow-md ${
                      isSwapping
                        ? isSiftUp
                          ? "fill-emerald-950/80 stroke-emerald-400 stroke-[3]"
                          : "fill-amber-950/80 stroke-amber-400 stroke-[3]"
                        : isCurrent
                        ? "fill-primary/25 stroke-primary stroke-[2.5]"
                        : isParent
                        ? "fill-indigo-500/25 stroke-indigo-400 stroke-[2]"
                        : isLeft || isRight
                        ? "fill-emerald-500/25 stroke-emerald-400 stroke-[2]"
                        : "fill-card stroke-border stroke-[1.5]"
                    }`}
                  />

                  {/* Node Value */}
                  <text
                    textAnchor="middle"
                    dy="0.32em"
                    className={`${valText.length > 6 ? "text-[10px]" : "text-[12px]"} font-mono font-bold select-none ${
                      isSwapping
                        ? isSiftUp
                          ? "fill-emerald-300 font-extrabold"
                          : "fill-amber-300 font-extrabold"
                        : isCurrent
                        ? "fill-primary"
                        : isParent
                        ? "fill-indigo-300"
                        : isLeft || isRight
                        ? "fill-emerald-400"
                        : "fill-foreground"
                    }`}
                  >
                    {valText}
                  </text>

                  {/* Index badge underneath */}
                  <g transform={`translate(0, ${radius + 14})`}>
                    <rect
                      x={-idxBadgeW / 2}
                      y={-8}
                      width={idxBadgeW}
                      height={15}
                      rx={3}
                      className="fill-background/90 stroke-border/70"
                    />
                    <text
                      textAnchor="middle"
                      y={3}
                      className="text-[8.5px] font-mono fill-muted-foreground select-none"
                    >
                      {idxBadgeText}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

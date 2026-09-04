import { memo, useState, useMemo, useCallback } from "react";
import type { HeapSwap } from "@/lib/problems";
import {
  ArrowLeftRight,
  ArrowDown,
  ArrowUp,
  Sparkles,
  Layers,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
} from "lucide-react";

interface BinaryHeapVisualizerProps {
  heap?: (number | string | null)[] | null;
  heapSwap?: HeapSwap | null;
  activeIndex?: number | null;
  heapType?: "min" | "max";
  explanation?: string;
}

export const BinaryHeapVisualizer = memo(function BinaryHeapVisualizer({
  heap = [],
  heapSwap: externalHeapSwap,
  activeIndex: externalActiveIndex,
  heapType = "min",
  explanation = "",
}: BinaryHeapVisualizerProps) {
  // Sandbox state
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxHeap, setSandboxHeap] = useState<number[]>([]);
  const [sandboxType, setSandboxType] = useState<"min" | "max">(heapType);
  const [inputVal, setInputVal] = useState<string>("");
  const [sandboxSwap, setSandboxSwap] = useState<HeapSwap | null>(null);
  const [sandboxLog, setSandboxLog] = useState<string>("");

  const rawHeap = useMemo(() => {
    if (!Array.isArray(heap)) return [];
    return heap.filter((x) => x !== null && x !== undefined && String(x) !== "null");
  }, [heap]);

  // If in sandbox mode, use sandboxHeap; otherwise use prop heap
  const safeHeap = useMemo(() => {
    if (sandboxMode) return sandboxHeap;
    return rawHeap;
  }, [sandboxMode, sandboxHeap, rawHeap]);

  const currentHeapType = sandboxMode ? sandboxType : heapType;
  const currentHeapSwap = sandboxMode ? sandboxSwap : externalHeapSwap;

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const activeIdx =
    hoveredIdx !== null
      ? hoveredIdx
      : (externalActiveIndex ?? (currentHeapSwap ? currentHeapSwap.childIdx : null));

  // Determine parent and child indices for activeIdx
  const relations = useMemo(() => {
    if (activeIdx === null || activeIdx < 0 || activeIdx >= safeHeap.length) {
      return { parent: null, leftChild: null, rightChild: null };
    }
    const parent = activeIdx > 0 ? Math.floor((activeIdx - 1) / 2) : null;
    const leftChild = 2 * activeIdx + 1 < safeHeap.length ? 2 * activeIdx + 1 : null;
    const rightChild = 2 * activeIdx + 2 < safeHeap.length ? 2 * activeIdx + 2 : null;
    return { parent, leftChild, rightChild };
  }, [activeIdx, safeHeap.length]);

  // Project binary tree node positions from 0-based heap array index
  const { nodePositions, treeLinks, svgDimensions } = useMemo(() => {
    if (safeHeap.length === 0) {
      return { nodePositions: [], treeLinks: [], svgDimensions: { width: 580, height: 260 } };
    }

    const n = safeHeap.length;
    const maxDepth = Math.floor(Math.log2(n));
    const levelHeight = 72;
    const paddingX = 40;
    const paddingY = 44;

    const maxLeafCount = Math.pow(2, maxDepth);
    const totalWidth = Math.max(620, maxLeafCount * 62 + paddingX * 2);
    const totalHeight = Math.max(280, (maxDepth + 1) * levelHeight + paddingY * 2);

    const positions: Array<{ idx: number; val: number | string; x: number; y: number; depth: number }> = [];

    safeHeap.forEach((val, i) => {
      const depth = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, depth) - 1);
      const nodesInLevel = Math.pow(2, depth);
      const stepX = (totalWidth - paddingX * 2) / (nodesInLevel + 1);

      positions.push({
        idx: i,
        val: val!,
        x: paddingX + (posInLevel + 1) * stepX,
        y: paddingY + depth * levelHeight,
        depth,
      });
    });

    const links: Array<{
      parentIdx: number;
      childIdx: number;
      from: { x: number; y: number };
      to: { x: number; y: number };
      isSwapLink: boolean;
      direction?: "sift-up" | "sift-down" | "up" | "down";
    }> = [];

    positions.forEach((node) => {
      if (node.idx > 0) {
        const parentIdx = Math.floor((node.idx - 1) / 2);
        const parentPos = positions[parentIdx];
        if (parentPos) {
          const isSwap =
            Boolean(currentHeapSwap) &&
            ((currentHeapSwap?.parentIdx === parentIdx && currentHeapSwap?.childIdx === node.idx) ||
              (currentHeapSwap?.parentIdx === node.idx && currentHeapSwap?.childIdx === parentIdx));

          links.push({
            parentIdx,
            childIdx: node.idx,
            from: { x: parentPos.x, y: parentPos.y },
            to: { x: node.x, y: node.y },
            isSwapLink: isSwap,
            direction: isSwap ? currentHeapSwap?.direction : undefined,
          });
        }
      }
    });

    return {
      nodePositions: positions,
      treeLinks: links,
      svgDimensions: { width: totalWidth, height: totalHeight },
    };
  }, [safeHeap, currentHeapSwap]);

  // Sandbox Action: Enter sandbox mode
  const toggleSandbox = () => {
    if (!sandboxMode) {
      const initial = rawHeap.map(Number).filter((n) => !isNaN(n));
      setSandboxHeap(initial.length > 0 ? initial : [10, 20, 15, 30, 40]);
      setSandboxSwap(null);
      setSandboxLog("Interactive Sandbox activated. Try inserting values or extracting the root!");
    }
    setSandboxMode((prev) => !prev);
  };

  // Sandbox: Sift-Up insertion
  const handleInsert = useCallback(() => {
    const val = Number(inputVal);
    if (isNaN(val) || inputVal.trim() === "") return;

    const arr = [...sandboxHeap, val];
    let curr = arr.length - 1;
    const isMin = sandboxType === "min";
    let lastSwap: HeapSwap | null = null;

    while (curr > 0) {
      const parent = Math.floor((curr - 1) / 2);
      const violates = isMin ? arr[curr]! < arr[parent]! : arr[curr]! > arr[parent]!;
      if (violates) {
        lastSwap = {
          parentIdx: parent,
          childIdx: curr,
          direction: "sift-up",
          reason: `Sift-Up: inserted ${val} violates ${isMin ? "min" : "max"}-heap invariant with parent ${arr[parent]}.`,
        };
        const temp = arr[curr]!;
        arr[curr] = arr[parent]!;
        arr[parent] = temp;
        curr = parent;
      } else {
        break;
      }
    }

    setSandboxHeap(arr);
    setSandboxSwap(lastSwap);
    setSandboxLog(`Inserted ${val}. Sifted up to index [${curr}]. Invariant satisfied.`);
    setInputVal("");
  }, [inputVal, sandboxHeap, sandboxType]);

  // Sandbox: Sift-Down extraction
  const handleExtract = useCallback(() => {
    if (sandboxHeap.length === 0) return;
    const arr = [...sandboxHeap];
    const rootVal = arr[0]!;
    const lastVal = arr.pop()!;
    const isMin = sandboxType === "min";

    if (arr.length === 0) {
      setSandboxHeap([]);
      setSandboxSwap(null);
      setSandboxLog(`Extracted root ${rootVal}. Heap is now empty.`);
      return;
    }

    arr[0] = lastVal;
    let curr = 0;
    const n = arr.length;
    let lastSwap: HeapSwap | null = null;

    while (curr < n) {
      let target = curr;
      const left = 2 * curr + 1;
      const right = 2 * curr + 2;

      if (left < n) {
        if (isMin ? arr[left]! < arr[target]! : arr[left]! > arr[target]!) {
          target = left;
        }
      }
      if (right < n) {
        if (isMin ? arr[right]! < arr[target]! : arr[right]! > arr[target]!) {
          target = right;
        }
      }

      if (target !== curr) {
        lastSwap = {
          parentIdx: curr,
          childIdx: target,
          direction: "sift-down",
          reason: `Sift-Down: root replacement ${lastVal} sink-swapped with child ${arr[target]}.`,
        };
        const temp = arr[curr]!;
        arr[curr] = arr[target]!;
        arr[target] = temp;
        curr = target;
      } else {
        break;
      }
    }

    setSandboxHeap(arr);
    setSandboxSwap(lastSwap);
    setSandboxLog(`Extracted root ${rootVal}. Sifted down replacement ${lastVal} to index [${curr}].`);
  }, [sandboxHeap, sandboxType]);

  // Sandbox: Invariant Toggle
  const toggleInvariant = () => {
    const nextType = sandboxType === "min" ? "max" : "min";
    setSandboxType(nextType);
    // Reheapify
    const arr = [...sandboxHeap];
    const n = arr.length;
    const isMin = nextType === "min";
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      let curr = i;
      while (curr < n) {
        let target = curr;
        const left = 2 * curr + 1;
        const right = 2 * curr + 2;
        if (left < n && (isMin ? arr[left]! < arr[target]! : arr[left]! > arr[target]!)) target = left;
        if (right < n && (isMin ? arr[right]! < arr[target]! : arr[right]! > arr[target]!)) target = right;
        if (target !== curr) {
          const t = arr[curr]!;
          arr[curr] = arr[target]!;
          arr[target] = t;
          curr = target;
        } else break;
      }
    }
    setSandboxHeap(arr);
    setSandboxSwap(null);
    setSandboxLog(`Switched invariant to ${nextType.toUpperCase()}-HEAP. Complete array reheapified.`);
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Sift-Up / Down Swap Alert Banner with Directional Chevrons */}
      {currentHeapSwap && (
        <div className="flex items-center justify-between gap-2.5 rounded-xl border border-amber-500/60 bg-amber-950/40 p-3 shadow-md shadow-amber-500/10 backdrop-blur-md animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-amber-500/50 bg-amber-500/20 text-amber-300">
              {currentHeapSwap.direction === "sift-up" || currentHeapSwap.direction === "up" ? (
                <ArrowUp className="size-4.5" />
              ) : (
                <ArrowDown className="size-4.5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                  {currentHeapSwap.direction === "sift-up" || currentHeapSwap.direction === "up"
                    ? "▲ Sift-Up (Bubble-Up Promotion)"
                    : "▼ Sift-Down (Sink Demotion)"}
                </span>
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 font-mono text-[10px] font-extrabold text-amber-200">
                  idx [{currentHeapSwap.parentIdx}] ⇄ idx [{currentHeapSwap.childIdx}]
                </span>
              </div>
              <p className="text-[11px] text-amber-200/90 mt-0.5 font-mono">
                {currentHeapSwap.reason ||
                  `Swap parent [${currentHeapSwap.parentIdx}] with child [${currentHeapSwap.childIdx}] to restore heap property.`}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-md">
            <ArrowLeftRight className="size-3.5" />
            <span>Rebalancing Heap Invariant</span>
          </div>
        </div>
      )}

      {/* Top Banner: Mode, Math Formulas & Interactive Sandbox Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card/75 p-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary shadow-xs">
            <Layers className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                Dual-View Binary Heap
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold border ${
                  currentHeapType === "min"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-amber-950/40 border-amber-500/40 text-amber-300"
                }`}
              >
                {currentHeapType.toUpperCase()}-HEAP
              </span>
              <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                Size {safeHeap.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              Complete Binary Tree packed contiguously in level-order 1D array
            </p>
          </div>
        </div>

        {/* Sandbox Toggle Switch */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSandbox}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs font-bold transition-all shadow-xs ${
              sandboxMode
                ? "border-primary/80 bg-primary/20 text-primary ring-1 ring-primary/40"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>Interactive Sandbox: {sandboxMode ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Sandbox Toolbar (When Active) */}
      {sandboxMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/50 bg-primary/5 p-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="Val"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInsert()}
                className="w-20 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleInsert}
                className="flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-xs transition-colors"
              >
                <Plus className="size-3" /> Insert (Sift-Up)
              </button>
            </div>

            <button
              type="button"
              onClick={handleExtract}
              disabled={safeHeap.length === 0}
              className="flex items-center gap-1 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-40 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-xs transition-colors"
            >
              <Trash2 className="size-3" /> Extract Root (Sift-Down)
            </button>

            <button
              type="button"
              onClick={toggleInvariant}
              className="flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-950/40 hover:bg-amber-900/50 px-2.5 py-1 font-mono text-xs font-bold text-amber-300 transition-colors"
            >
              <ArrowLeftRight className="size-3 text-amber-400" />
              Toggle: {sandboxType === "min" ? "Switch to Max-Heap" : "Switch to Min-Heap"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const initial = rawHeap.map(Number).filter((n) => !isNaN(n));
                setSandboxHeap(initial.length > 0 ? initial : [10, 20, 15, 30, 40]);
                setSandboxSwap(null);
                setSandboxLog("Heap reset to initial state.");
              }}
              className="flex items-center gap-1 rounded-md border border-border/60 bg-card/80 hover:bg-card px-2 py-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>

          {sandboxLog && (
            <div className="w-full font-mono text-[11px] text-muted-foreground border-t border-primary/20 pt-2 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span>{sandboxLog}</span>
            </div>
          )}
        </div>
      )}

      {/* TOP PANE: Contiguous 1D Array with Parent-Child Math Formulas & Swap Arc */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/75 p-3.5 backdrop-blur-sm shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="size-3.5 text-primary" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              1D Contiguous Array Memory Representation
            </span>
          </div>

          {/* Math Index Formula Pills */}
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 text-emerald-300">
              parent = ⌊(i-1)/2⌋
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-cyan-950/40 border border-cyan-500/30 px-1.5 py-0.5 text-cyan-300">
              left = 2i+1
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-violet-950/40 border border-violet-500/30 px-1.5 py-0.5 text-violet-300">
              right = 2i+2
            </span>
          </div>
        </div>

        {safeHeap.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-muted-foreground">
            Binary Heap is currently empty.
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-1">
            {/* Animated Swap Arc Callout if swap active */}
            {currentHeapSwap && (
              <div className="flex items-center justify-center gap-2 py-1 font-mono text-[11px] font-bold text-amber-300 bg-amber-950/30 border border-amber-500/40 rounded-lg">
                <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>
                  SWAP ARC: Array[{currentHeapSwap.parentIdx}] ({safeHeap[currentHeapSwap.parentIdx]}) ⮂ Array[{currentHeapSwap.childIdx}] ({safeHeap[currentHeapSwap.childIdx]})
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-1">
              {safeHeap.map((val, idx) => {
                const isActive = activeIdx === idx;
                const isParent = relations.parent === idx;
                const isLeftChild = relations.leftChild === idx;
                const isRightChild = relations.rightChild === idx;
                const isSwapTarget =
                  currentHeapSwap &&
                  (currentHeapSwap.parentIdx === idx || currentHeapSwap.childIdx === idx);

                let borderColor = "border-border/70";
                let bgColor = "bg-card/70";
                let ringClass = "";

                if (isSwapTarget) {
                  borderColor = "border-amber-500";
                  bgColor = "bg-amber-950/50";
                  ringClass = "ring-2 ring-amber-500/80 shadow-md shadow-amber-500/20 animate-pulse";
                } else if (isActive) {
                  borderColor = "border-sky-500";
                  bgColor = "bg-sky-950/40";
                  ringClass = "ring-2 ring-sky-500/80 shadow-md shadow-sky-500/20";
                } else if (isParent) {
                  borderColor = "border-emerald-500";
                  bgColor = "bg-emerald-950/30";
                  ringClass = "ring-1 ring-emerald-500/60";
                } else if (isLeftChild) {
                  borderColor = "border-cyan-500";
                  bgColor = "bg-cyan-950/30";
                  ringClass = "ring-1 ring-cyan-500/60";
                } else if (isRightChild) {
                  borderColor = "border-violet-500";
                  bgColor = "bg-violet-950/30";
                  ringClass = "ring-1 ring-violet-500/60";
                }

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`group relative flex flex-col items-center justify-between rounded-lg border p-2 min-w-[54px] cursor-pointer transition-all duration-200 select-none ${bgColor} ${borderColor} ${ringClass} hover:scale-105`}
                  >
                    {/* Array Index Tag */}
                    <span className="font-mono text-[9px] text-muted-foreground font-semibold">
                      [{idx}]
                    </span>

                    {/* Node Value */}
                    <span className="font-mono text-sm font-extrabold text-foreground my-0.5">
                      {val}
                    </span>

                    {/* Relationship Tag if active */}
                    <div className="h-3 flex items-center justify-center">
                      {isActive ? (
                        <span className="font-mono text-[8px] font-extrabold text-sky-400">Node</span>
                      ) : isParent ? (
                        <span className="font-mono text-[8px] font-bold text-emerald-400">Parent</span>
                      ) : isLeftChild ? (
                        <span className="font-mono text-[8px] font-bold text-cyan-400">L-Child</span>
                      ) : isRightChild ? (
                        <span className="font-mono text-[8px] font-bold text-violet-400">R-Child</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM PANE: Complete Binary Tree (SVG Canvas) with Sift Transitions */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/75 p-3.5 backdrop-blur-sm shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Logical Complete Binary Tree Hierarchy
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            Hover any node to inspect formulas & child connections
          </span>
        </div>

        <div className="w-full overflow-x-auto overflow-y-auto max-h-[380px] rounded-lg bg-background/50 border border-border/40 p-2">
          {safeHeap.length === 0 ? (
            <div className="py-12 text-center font-mono text-xs text-muted-foreground">
              Binary Heap is empty.
            </div>
          ) : (
            <svg
              width={svgDimensions.width}
              height={svgDimensions.height}
              className="select-none mx-auto"
            >
              <defs>
                <filter id="heap-swap-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.8" />
                </filter>
                <filter id="heap-active-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.7" />
                </filter>
              </defs>

              {/* Draw connecting tree branches */}
              {treeLinks.map((link) => {
                const midX = (link.from.x + link.to.x) / 2;
                const midY = (link.from.y + link.to.y) / 2;
                const isSiftUp =
                  link.direction === "sift-up" || link.direction === "up";

                return (
                  <g key={`${link.parentIdx}-${link.childIdx}`}>
                    {/* Active branch halo path */}
                    {link.isSwapLink && (
                      <line
                        x1={link.from.x}
                        y1={link.from.y + 16}
                        x2={link.to.x}
                        y2={link.to.y - 16}
                        stroke="#f59e0b"
                        strokeWidth="8"
                        strokeOpacity="0.35"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Main branch line */}
                    <line
                      x1={link.from.x}
                      y1={link.from.y + 16}
                      x2={link.to.x}
                      y2={link.to.y - 16}
                      stroke={link.isSwapLink ? "#f59e0b" : "#475569"}
                      strokeWidth={link.isSwapLink ? "3" : "1.5"}
                      strokeDasharray={link.isSwapLink ? "5 3" : undefined}
                      className="transition-all duration-300"
                    />

                    {/* Directional Chevron pill for sift-up and sift-down rebalancing */}
                    {link.isSwapLink && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-36"
                          y="-10"
                          width="72"
                          height="20"
                          rx="5"
                          fill="#78350f"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          className="shadow-md shadow-amber-950 animate-pulse"
                        />
                        <text
                          textAnchor="middle"
                          dy="3.5"
                          className="font-mono text-[9px] fill-amber-200 font-extrabold select-none"
                        >
                          {isSiftUp ? "▲ SIFT-UP" : "▼ SIFT-DOWN"}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Draw Tree Nodes */}
              {nodePositions.map((node) => {
                const isActive = activeIdx === node.idx;
                const isParent = relations.parent === node.idx;
                const isLeftChild = relations.leftChild === node.idx;
                const isRightChild = relations.rightChild === node.idx;
                const isSwapTarget =
                  currentHeapSwap &&
                  (currentHeapSwap.parentIdx === node.idx || currentHeapSwap.childIdx === node.idx);

                let fill = "#1e293b";
                let stroke = "#475569";
                let textFill = "#f8fafc";
                let filter = undefined;

                if (isSwapTarget) {
                  fill = "#78350f";
                  stroke = "#f59e0b";
                  textFill = "#fef3c7";
                  filter = "url(#heap-swap-glow)";
                } else if (isActive) {
                  fill = "#0c4a6e";
                  stroke = "#38bdf8";
                  textFill = "#bae6fd";
                  filter = "url(#heap-active-glow)";
                } else if (isParent) {
                  fill = "#064e3b";
                  stroke = "#10b981";
                  textFill = "#a7f3d0";
                } else if (isLeftChild) {
                  fill = "#164e63";
                  stroke = "#06b6d4";
                  textFill = "#cffafe";
                } else if (isRightChild) {
                  fill = "#4c1d95";
                  stroke = "#8b5cf6";
                  textFill = "#ede9fe";
                }

                return (
                  <g
                    key={node.idx}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredIdx(node.idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer transition-transform duration-200"
                    filter={filter}
                  >
                    {/* Animated outer ring for swap target */}
                    {isSwapTarget && (
                      <circle
                        r="24"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        className="animate-pulse"
                      />
                    )}

                    {/* Outer Circle */}
                    <circle
                      r="18"
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isActive || isSwapTarget ? "2.5" : "1.5"}
                      className="transition-all duration-200"
                    />

                    {/* Node Value */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      className="font-mono text-[11px] font-extrabold select-none"
                      fill={textFill}
                    >
                      {node.val}
                    </text>

                    {/* Array Index Tag above node */}
                    <text
                      textAnchor="middle"
                      dy="-22"
                      className="font-mono text-[9px] fill-slate-400 select-none font-semibold"
                    >
                      [{node.idx}]
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
});

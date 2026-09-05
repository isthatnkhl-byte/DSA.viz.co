import React, { useMemo } from "react";
import type { Val, MarkerStyle } from "./VisualizerTypes";
import { safeArray, getMarkerStyle } from "./VisualizerTypes";
import { ArrowRight, Link2 } from "lucide-react";

interface LinkedListVisualizerProps {
  list: Val[];
  current: Val | null;
  predecessor: Val | null;
  visited: Val[];
  pointer_labels?: Record<string, string> | null;
  activePointers?: Record<string, number | string | [number, number] | null> | null;
}

export function LinkedListVisualizer({
  list: rawList,
  current,
  predecessor,
  visited: rawVisited,
  pointer_labels,
  activePointers,
}: LinkedListVisualizerProps) {

  const list = useMemo(() => safeArray(rawList), [rawList]);
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const visitedSet = useMemo(() => new Set(visited.map(String)), [visited]);

  const currentIdx = useMemo(() => {
    if (current === null || current === undefined) return null;
    const sCurrent = String(current);
    // 1. Direct value match takes precedence
    const found = list.findIndex((v) => String(v) === sCurrent);
    if (found !== -1) return found;
    // 2. Numerical index within bounds
    const num = Number(current);
    if (Number.isInteger(num) && num >= 0 && num < list.length) return num;
    return null;
  }, [current, list]);

  const prevIdx = useMemo(() => {
    if (predecessor === null || predecessor === undefined) return null;
    const sPrev = String(predecessor);
    // 1. Direct value match takes precedence
    const found = list.findIndex((v) => String(v) === sPrev);
    if (found !== -1) return found;
    // 2. Numerical index within bounds
    const num = Number(predecessor);
    if (Number.isInteger(num) && num >= 0 && num < list.length) return num;
    return null;
  }, [predecessor, list]);

  // Check if this problem is a slow/fast cycle scenario
  const isCycleMode = prevIdx !== null && currentIdx !== null && prevIdx !== currentIdx - 1;
  const labelCurr = pointer_labels?.current ? pointer_labels.current.slice(0, 7) : (isCycleMode ? "SLOW" : "CURR");
  const labelPrev = pointer_labels?.predecessor ? pointer_labels.predecessor.slice(0, 7) : (isCycleMode ? "FAST" : "PREV");

  const activePointerEntries = useMemo(() => {
    if (!activePointers || typeof activePointers !== "object") return [];
    return Object.entries(activePointers).filter(
      ([, v]) => v !== null && v !== undefined && v !== "",
    );
  }, [activePointers]);

  return (
    <div className="flex flex-col gap-4">
      {/* Active Pointers Bar */}
      {activePointerEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-4 py-2 text-[11px] font-mono shadow-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
            List Pointers:
          </span>
          {activePointerEntries.map(([k, v]) => {
            const style = getMarkerStyle(k);
            return (
              <span
                key={`lpbadge-${k}`}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-bold border shadow-xs ${style.bg} ${style.textCol} ${style.border}`}
              >
                <span>{k}</span>
                <span className="opacity-70 font-normal">→ {String(v)}</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex min-h-[220px] w-full flex-col justify-center overflow-x-auto rounded-xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-6 shadow-inner">
        <div className="mb-6 flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Link2 className="size-4 text-primary" />
            <span className="font-mono uppercase tracking-wider text-[11px]">
              Singly-Linked List Memory Nodes
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" /> Current
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-accent" /> Visited
            </span>
          </div>
        </div>

        {list.length === 0 ? (
          <span className="mx-auto font-mono text-sm text-muted-foreground">Empty list</span>
        ) : (
          <div className="relative flex w-max min-w-full items-center justify-start sm:justify-center gap-2 py-8 px-4 m-auto">
            {list.map((val, i) => {
              const isCurrent = currentIdx === i || String(val) === String(current);
              const isPrev = prevIdx === i && !isCurrent;
              const isVisited =
                visitedSet.has(String(val)) || (currentIdx !== null && i < currentIdx);
              const isHead = i === 0;
              const isTail = i === list.length - 1;

              const nodeTags: { text: string; style: MarkerStyle }[] = [];
              if (isHead) {
                nodeTags.push({ text: "HEAD", style: getMarkerStyle("head") });
              }
              if (isPrev) {
                nodeTags.push({ text: labelPrev, style: getMarkerStyle(labelPrev) });
              }
              if (isCurrent) {
                nodeTags.push({ text: labelCurr, style: getMarkerStyle(labelCurr) });
              }
              if (isTail && !isHead) {
                nodeTags.push({ text: "TAIL", style: getMarkerStyle("tail") });
              }

              if (activePointers && typeof activePointers === "object") {
                for (const [pName, pVal] of Object.entries(activePointers)) {
                  if (pVal === null || pVal === undefined) continue;
                  const isMatchingIndex = typeof pVal === "number" && pVal === i;
                  const isMatchingVal = typeof pVal !== "number" && String(pVal) === String(val);
                  if (
                    (isMatchingIndex || isMatchingVal) &&
                    !nodeTags.some((t) => t.text.toLowerCase() === pName.toLowerCase())
                  ) {
                    nodeTags.push({
                      text: pName.slice(0, 8),
                      style: getMarkerStyle(pName),
                    });
                  }
                }
              }

              return (
                <div key={`node-${i}`} className="flex items-center gap-2">
                  {/* Node Capsule Container */}
                  <div className="relative flex flex-col items-center">
                    {/* Floating Pointers above node */}
                    <div className="absolute -top-7 flex items-center gap-1 z-10 select-none pointer-events-none whitespace-nowrap">
                      {nodeTags.map((t, tagIdx) => (
                        <span
                          key={`tag-${tagIdx}`}
                          className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold border shadow-xs ${t.style.bg} ${t.style.textCol} ${t.style.border}`}
                        >
                          {t.text}
                        </span>
                      ))}
                    </div>


                    {/* Dual-Compartment Node [ Value | Next • ] */}
                    <div
                      className={`flex rounded-xl border transition-all duration-300 shadow-sm ${
                        isCurrent
                          ? "scale-105 border-primary bg-primary/15 shadow-md shadow-primary/30 ring-2 ring-primary/60 constant-glow-primary"
                          : isVisited
                            ? "border-accent/60 bg-accent/15 text-foreground"
                            : "border-border/80 bg-card/80 text-foreground"
                      }`}
                    >
                      {/* Value Compartment */}
                      <div
                        className={`flex min-w-12 items-center justify-center border-r px-3 py-2 font-mono text-sm font-bold transition-all duration-300 ${
                          isCurrent
                            ? "text-primary border-primary/40"
                            : isVisited
                              ? "text-accent border-accent/40"
                              : "text-foreground border-border/60"
                        }`}
                      >
                        {String(val)}
                      </div>

                      {/* Next Pointer Compartment */}
                      <div className="flex items-center justify-center px-2 py-2 text-xs text-muted-foreground">
                        <div
                          className={`size-2.5 rounded-full transition-all duration-300 ${
                            isCurrent
                              ? "bg-primary shadow-xs shadow-primary/60"
                              : isVisited
                                ? "bg-accent"
                                : "bg-muted-foreground/60"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Node Index label */}
                    <span className="mt-1.5 font-mono text-[9px] text-muted-foreground">
                      Node {i}
                    </span>
                  </div>

                  {/* Connecting Arrow to Next Node */}
                  <div className="flex items-center text-muted-foreground/80 px-1">
                    <ArrowRight
                      className={`size-5 transition-all ${
                        isVisited || isCurrent ? "text-primary stroke-[2.5]" : "text-border"
                      }`}
                    />
                  </div>
                </div>
              );
            })}

            {/* NULL Terminator Node */}
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-dashed border-border/80 bg-background/50 px-3 py-2 font-mono text-xs font-bold text-muted-foreground">
                NULL ∅
              </div>
              <span className="mt-1.5 font-mono text-[9px] text-muted-foreground/60">end</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

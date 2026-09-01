import React, { useState, useMemo } from "react";
import type { VizStep } from "@/lib/problems";
import { Eye, Search, Code, Check, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { toText, safeArray } from "./VisualizerTypes";
import { Button } from "@/components/ui/button";

interface VariableWatchTableProps {
  currentStep: VizStep;
  prevStep: VizStep | null;
  stepIndex: number;
}

interface VariableEntry {
  name: string;
  type: string;
  currentValue: string;
  prevValue: string;
  hasChanged: boolean;
  deltaDir?: "up" | "down" | "same";
}

export function VariableWatchTable({
  currentStep,
  prevStep,
  stepIndex,
}: VariableWatchTableProps) {
  const [filterText, setFilterText] = useState("");
  const [showRawJson, setShowRawJson] = useState(false);

  const variables = useMemo<VariableEntry[]>(() => {
    const list: VariableEntry[] = [];

    // Helper to evaluate numeric deltas
    const getDelta = (curr: unknown, prev: unknown): "up" | "down" | "same" | undefined => {
      if (typeof curr === "number" && typeof prev === "number") {
        if (curr > prev) return "up";
        if (curr < prev) return "down";
        return "same";
      }
      return undefined;
    };

    // 1. Pointers
    if (currentStep.left !== undefined && currentStep.left !== null) {
      list.push({
        name: "left (ptr1)",
        type: "number",
        currentValue: String(currentStep.left),
        prevValue: prevStep?.left !== undefined && prevStep?.left !== null ? String(prevStep.left) : "—",
        hasChanged: prevStep ? currentStep.left !== prevStep.left : false,
        deltaDir: getDelta(currentStep.left, prevStep?.left),
      });
    }

    if (currentStep.right !== undefined && currentStep.right !== null) {
      list.push({
        name: "right (ptr2)",
        type: "number",
        currentValue: String(currentStep.right),
        prevValue: prevStep?.right !== undefined && prevStep?.right !== null ? String(prevStep.right) : "—",
        hasChanged: prevStep ? currentStep.right !== prevStep.right : false,
        deltaDir: getDelta(currentStep.right, prevStep?.right),
      });
    }

    if (currentStep.left2 !== undefined && currentStep.left2 !== null) {
      list.push({
        name: "left2 (secondary)",
        type: "number",
        currentValue: String(currentStep.left2),
        prevValue: prevStep?.left2 !== undefined && prevStep?.left2 !== null ? String(prevStep.left2) : "—",
        hasChanged: prevStep ? currentStep.left2 !== prevStep.left2 : false,
        deltaDir: getDelta(currentStep.left2, prevStep?.left2),
      });
    }

    // 2. Focus / Target
    if (currentStep.current !== undefined && currentStep.current !== null) {
      list.push({
        name: "current / target",
        type: typeof currentStep.current,
        currentValue: toText(currentStep.current),
        prevValue: toText(prevStep?.current),
        hasChanged: prevStep ? currentStep.current !== prevStep.current : false,
      });
    }

    // 3. Accumulator & Best
    if (currentStep.wSum !== undefined && currentStep.wSum !== null) {
      list.push({
        name: "wSum (window/sum)",
        type: typeof currentStep.wSum,
        currentValue: toText(currentStep.wSum),
        prevValue: toText(prevStep?.wSum),
        hasChanged: prevStep ? currentStep.wSum !== prevStep.wSum : false,
        deltaDir: getDelta(currentStep.wSum, prevStep?.wSum),
      });
    }

    if (currentStep.mSum !== undefined && currentStep.mSum !== null) {
      list.push({
        name: "mSum (max/optimal)",
        type: typeof currentStep.mSum,
        currentValue: toText(currentStep.mSum),
        prevValue: toText(prevStep?.mSum),
        hasChanged: prevStep ? currentStep.mSum !== prevStep.mSum : false,
        deltaDir: getDelta(currentStep.mSum, prevStep?.mSum),
      });
    }

    // 4. Direction & Area
    if (currentStep.direction) {
      list.push({
        name: "direction",
        type: "string",
        currentValue: currentStep.direction,
        prevValue: prevStep?.direction ?? "—",
        hasChanged: prevStep ? currentStep.direction !== prevStep.direction : false,
      });
    }

    if (currentStep.currentArea !== undefined && currentStep.currentArea !== null) {
      list.push({
        name: "currentArea",
        type: "number",
        currentValue: String(currentStep.currentArea),
        prevValue: prevStep?.currentArea !== undefined ? String(prevStep.currentArea) : "—",
        hasChanged: prevStep ? currentStep.currentArea !== prevStep.currentArea : false,
        deltaDir: getDelta(currentStep.currentArea, prevStep?.currentArea),
      });
    }

    if (currentStep.maxArea !== undefined && currentStep.maxArea !== null) {
      list.push({
        name: "maxArea",
        type: "number",
        currentValue: String(currentStep.maxArea),
        prevValue: prevStep?.maxArea !== undefined ? String(prevStep.maxArea) : "—",
        hasChanged: prevStep ? currentStep.maxArea !== prevStep.maxArea : false,
        deltaDir: getDelta(currentStep.maxArea, prevStep?.maxArea),
      });
    }

    // 5. Collections
    if (currentStep.stack) {
      const arr = safeArray(currentStep.stack);
      list.push({
        name: "stack.length",
        type: "Array",
        currentValue: `${arr.length} [${arr.slice(-3).join(", ")}]`,
        prevValue: prevStep?.stack ? `${safeArray(prevStep.stack).length}` : "—",
        hasChanged: prevStep ? arr.length !== safeArray(prevStep.stack).length : false,
      });
    }

    if (currentStep.queue) {
      const arr = safeArray(currentStep.queue);
      list.push({
        name: "queue.length",
        type: "Array",
        currentValue: `${arr.length} [${arr.slice(0, 3).join(", ")}]`,
        prevValue: prevStep?.queue ? `${safeArray(prevStep.queue).length}` : "—",
        hasChanged: prevStep ? arr.length !== safeArray(prevStep.queue).length : false,
      });
    }

    if (currentStep.map) {
      const keys = Object.keys(currentStep.map);
      list.push({
        name: "map.size",
        type: "Object",
        currentValue: `${keys.length} entries`,
        prevValue: prevStep?.map ? `${Object.keys(prevStep.map).length} entries` : "—",
        hasChanged: prevStep ? keys.length !== Object.keys(prevStep?.map ?? {}).length : false,
      });
    }

    if (currentStep.visited) {
      const arr = safeArray(currentStep.visited);
      list.push({
        name: "visited.count",
        type: "Set",
        currentValue: `${arr.length}`,
        prevValue: prevStep?.visited ? `${safeArray(prevStep.visited).length}` : "—",
        hasChanged: prevStep ? arr.length !== safeArray(prevStep.visited).length : false,
      });
    }

    // 6. Active Execution Line
    if (currentStep.line !== undefined) {
      list.push({
        name: "execution.line",
        type: "number",
        currentValue: `Line ${currentStep.line + 1}`,
        prevValue: prevStep?.line !== undefined ? `Line ${prevStep.line + 1}` : "—",
        hasChanged: prevStep ? currentStep.line !== prevStep.line : false,
      });
    }

    return list;
  }, [currentStep, prevStep]);

  const filtered = useMemo(() => {
    if (!filterText.trim()) return variables;
    const query = filterText.toLowerCase();
    return variables.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.currentValue.toLowerCase().includes(query) ||
        v.type.toLowerCase().includes(query),
    );
  }, [variables, filterText]);

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card/75 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            Live Variable Watch Table
          </span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
            {variables.length} Monitored
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Filter variables..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-7 w-36 rounded-lg border border-border/70 bg-background/60 pl-8 pr-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRawJson((v) => !v)}
            className={`h-7 px-2 font-mono text-[10px] gap-1 ${
              showRawJson ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground"
            }`}
            title="Inspect raw frame JSON payload"
          >
            <Code className="size-3" />
            <span>{showRawJson ? "Table View" : "Raw JSON"}</span>
          </Button>
        </div>
      </div>

      {showRawJson ? (
        <pre className="max-h-56 overflow-auto rounded-xl border border-border/60 bg-background/90 p-3 font-mono text-[11px] text-muted-foreground shadow-inner">
          {JSON.stringify(currentStep, null, 2)}
        </pre>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/80 shadow-inner">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground">
                <th className="py-2 px-3">Variable</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-3">Current Value (Step {stepIndex + 1})</th>
                <th className="py-2 px-3">Previous</th>
                <th className="py-2 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((v) => (
                <tr
                  key={v.name}
                  className={`transition-colors hover:bg-muted/20 ${
                    v.hasChanged ? "bg-primary/5 font-semibold" : ""
                  }`}
                >
                  <td className="py-1.5 px-3 font-mono font-bold text-foreground">
                    {v.name}
                  </td>
                  <td className="py-1.5 px-2 text-[10px] text-muted-foreground">
                    {v.type}
                  </td>
                  <td className="py-1.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                        v.hasChanged
                          ? "bg-primary/20 text-primary font-bold border border-primary/30 animate-pulse"
                          : "text-foreground"
                      }`}
                    >
                      {v.currentValue}
                      {v.deltaDir === "up" && (
                        <ArrowUpRight className="size-3 text-emerald-400" />
                      )}
                      {v.deltaDir === "down" && (
                        <ArrowDownRight className="size-3 text-amber-400" />
                      )}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground/70">
                    {v.prevValue}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {v.hasChanged ? (
                      <span className="inline-block rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300 border border-amber-500/30">
                        Mutated
                      </span>
                    ) : (
                      <span className="inline-block text-muted-foreground/40 text-[10px]">–</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">
                    No variables match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

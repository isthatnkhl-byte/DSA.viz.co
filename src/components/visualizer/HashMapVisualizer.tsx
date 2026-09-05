import React, { useMemo } from "react";
import type { Val, MarkerStyle } from "./VisualizerTypes";
import { safeArray, safeEntries, toText, getMarkerStyle } from "./VisualizerTypes";
import { Database, Hash } from "lucide-react";

interface HashMapVisualizerProps {
  map?: Record<string, number | string | null> | null | undefined;
  set?: Val[] | null | undefined;
  current: Val | null | undefined;
  visited: Val[];
  type: "hashmap" | "set";
  pointer_labels?: Record<string, string> | null;
  activePointers?: Record<string, number | string | [number, number] | null> | null;
}

export function HashMapVisualizer({
  map: rawMap,
  set: rawSet,
  current,
  visited: rawVisited,
  type,
  pointer_labels,
  activePointers,
}: HashMapVisualizerProps) {
  const entries = useMemo(() => {
    if (type === "set") {
      return safeArray(rawSet ?? []).map((v) => [String(v), v] as [string, string | number | null]);
    }
    if (rawMap && Object.keys(rawMap).length > 0) {
      return safeEntries(rawMap);
    }
    if (Array.isArray(rawSet) && rawSet.length > 0) {
      return safeArray(rawSet).map((v) => [String(v), v] as [string, string | number | null]);
    }
    return [];
  }, [rawMap, rawSet, type]);

  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const visitedSet = useMemo(() => new Set(visited.map(String)), [visited]);
  const currentKey = current !== null && current !== undefined ? String(current) : "";

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
            Map Pointers:
          </span>
          {activePointerEntries.map(([k, v]) => {
            const style = getMarkerStyle(k);
            return (
              <span
                key={`hmpbadge-${k}`}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-bold border shadow-xs ${style.bg} ${style.textCol} ${style.border}`}
              >
                <span>{k}</span>
                <span className="opacity-70 font-normal">→ {String(v)}</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex min-h-[220px] flex-col items-center justify-center overflow-x-auto rounded-xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-6 shadow-inner">
        {/* Header */}
        <div className="mb-6 flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {type === "set" ? (
              <Hash className="size-4 text-primary" />
            ) : (
              <Database className="size-4 text-primary" />
            )}
            <span className="font-mono uppercase tracking-wider text-[11px]">
              {type === "set" ? "Hash Set (Unique Entries)" : "Hash Map Key-Value Store"}
            </span>
          </div>

          <span className="font-mono text-xs font-semibold text-muted-foreground">
            Total Entries: <span className="text-foreground font-bold">{entries.length}</span>
          </span>
        </div>

        {/* Entries Grid */}
        {entries.length === 0 ? (
          <span className="font-mono text-sm text-muted-foreground italic">Table is empty</span>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3 overflow-auto">
            {entries.map(([key, value], i) => {
              const isActive =
                (currentKey !== "" && currentKey === key) ||
                (currentKey !== "" && String(value) === currentKey) ||
                (i === entries.length - 1 && entries.length > 0);
              const isSeen = visitedSet.has(key) || (currentKey !== "" && visitedSet.has(String(value)));

              const entryPointers: { label: string; style: MarkerStyle }[] = [];
              if (activePointers && typeof activePointers === "object") {
                for (const [pName, pVal] of Object.entries(activePointers)) {
                  if (pVal === null || pVal === undefined) continue;
                  if (String(pVal) === key || String(pVal) === String(value)) {
                    entryPointers.push({ label: pName, style: getMarkerStyle(pName) });
                  }
                }
              }

              const firstEntryPointer = entryPointers[0];

              return (
                <div
                  key={`map-entry-${key}-${i}`}
                  className={`relative flex flex-col rounded-xl border p-3 font-mono transition-all duration-300 shadow-sm ${
                    isActive
                      ? "scale-105 border-primary bg-primary/25 text-primary shadow-xl shadow-primary/40 ring-2 ring-primary font-bold constant-glow-primary animate-sync-glow"
                      : firstEntryPointer
                        ? `${firstEntryPointer.style.border} ${firstEntryPointer.style.bg} ${firstEntryPointer.style.textCol} ring-1 font-bold`
                        : isSeen
                          ? "border-accent/80 bg-accent/20 text-accent font-semibold shadow-md shadow-accent/20 constant-glow-accent"
                          : "border-border/80 bg-background/90 text-foreground hover:border-primary/50"
                  }`}
                >
                  {/* Floating pointer tag on entry */}
                  {entryPointers.length > 0 && (
                    <div className="absolute -top-2.5 left-2 flex items-center gap-1 z-10">
                      {entryPointers.map((p, pIdx) => (
                        <span
                          key={`ep-${pIdx}`}
                          className={`rounded px-1 text-[8px] font-bold border shadow-xs ${p.style.bg} ${p.style.textCol} ${p.style.border}`}
                        >
                          {p.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground mb-1">
                    <span>slot #{i}</span>
                    {isActive && (
                      <span className="rounded bg-primary text-primary-foreground px-1.5 py-0.5 text-[8px] font-bold shadow-xs">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{toText(key)}</span>
                    {type !== "set" && (
                      <>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-bold text-sm text-primary">{toText(value)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

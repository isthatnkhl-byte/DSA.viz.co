import React, { useMemo } from "react";
import type { Val } from "./VisualizerTypes";
import { safeArray, safeEntries, toText } from "./VisualizerTypes";
import { Database, Hash } from "lucide-react";

interface HashMapVisualizerProps {
  map?: Record<string, number | string | null> | null | undefined;
  set?: Val[] | null | undefined;
  current: Val | null | undefined;
  visited: Val[];
  type: "hashmap" | "set";
  desc?: string | undefined;
}

export function HashMapVisualizer({
  map: rawMap,
  set: rawSet,
  current,
  visited: rawVisited,
  type,
  desc,
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
  const currentKey = current !== null && current !== undefined ? String(current).trim() : "";

  const descKeySet = useMemo(() => {
    const s = new Set<string>();
    if (desc) {
      entries.forEach(([k]) => {
        const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`\\b${escaped}\\b|["']${escaped}["']`, "i");
        if (re.test(desc)) s.add(k.toLowerCase());
      });
    }
    return s;
  }, [desc, entries]);

  return (
    <div className="flex flex-col gap-4">
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
              const isKeyMatch = currentKey !== "" && (currentKey === key || key.toLowerCase() === currentKey.toLowerCase());
              const isValueMatch = currentKey !== "" && (String(value) === currentKey || (typeof value === "number" && !isNaN(Number(currentKey)) && Number(value) === Number(currentKey)));
              const isMentionedInDesc = descKeySet.has(key.toLowerCase());

              const isActive = isKeyMatch || isValueMatch || isMentionedInDesc;
              const isSeen = !isActive && (visitedSet.has(key) || (currentKey !== "" && visitedSet.has(String(value))));

              let activeTag = "ACTIVE";
              if (isKeyMatch) activeTag = "KEY MATCH";
              else if (isValueMatch) activeTag = "VAL MATCH";
              else if (isMentionedInDesc) activeTag = "LOOKUP";

              return (
                <div
                  key={`map-entry-${key}-${i}`}
                  className={`flex flex-col rounded-xl border p-3 font-mono transition-all duration-300 shadow-sm ${
                    isActive
                      ? "scale-105 border-primary bg-primary/25 text-primary shadow-xl shadow-primary/40 ring-2 ring-primary font-bold constant-glow-primary animate-sync-glow"
                      : isSeen
                        ? "border-accent/80 bg-accent/20 text-accent font-semibold shadow-md shadow-accent/20 constant-glow-accent"
                        : "border-border/80 bg-background/90 text-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground mb-1">
                    <span>slot #{i}</span>
                    {isActive ? (
                      <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold shadow-xs ${
                        isKeyMatch ? "bg-primary text-primary-foreground" : isValueMatch ? "bg-emerald-500 text-white" : "bg-primary/80 text-primary-foreground"
                      }`}>
                        {activeTag}
                      </span>
                    ) : isSeen ? (
                      <span className="rounded bg-accent/30 text-accent px-1.5 py-0.5 text-[8px] font-semibold">
                        STORED
                      </span>
                    ) : null}
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

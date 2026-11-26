import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  GitBranch,
  Layers,
  Loader2,
  Lock,
  Network,
  Play,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import {
  apiMatchPatternDag,
  type DagReadinessStatus,
  type DagSearchMatchView,
  type GlobalDagStrandNode,
  type PatternDagFrontierResponse,
} from "@/lib/master-patterns/client";
import type { PatternId } from "@/lib/master-patterns/types";

interface DagFrontierExplorerProps {
  data: PatternDagFrontierResponse | null;
  loading: boolean;
  error?: string | null;
  loadingPatternId: PatternId | null;
  onRefresh: () => void;
  onSelectPattern: (patternId: PatternId, resumeLocal: boolean) => void;
}

const READINESS_META: Record<
  DagReadinessStatus,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  gap: {
    label: "Active Gap",
    badgeClass: "border-rose-500/50 bg-rose-500/10 text-rose-500",
    dotClass: "bg-rose-500",
  },
  due: {
    label: "Due Review",
    badgeClass: "border-amber-500/50 bg-amber-500/10 text-amber-500",
    dotClass: "bg-amber-500",
  },
  ready: {
    label: "Ready",
    badgeClass: "border-primary/50 bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
  remediated: {
    label: "In Progress",
    badgeClass: "border-sky-500/50 bg-sky-500/10 text-sky-500",
    dotClass: "bg-sky-500",
  },
  blocked: {
    label: "Blocked by Prereq",
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  mastered: {
    label: "Mastered",
    badgeClass: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
    dotClass: "bg-emerald-500",
  },
};

function shortStrand(id: string): string {
  return id.split(":")[1] ?? id;
}

export const DagFrontierExplorer: React.FC<DagFrontierExplorerProps> = ({
  data,
  loading,
  error,
  loadingPatternId,
  onRefresh,
  onSelectPattern,
}) => {
  const [statusFilter, setStatusFilter] = useState<DagReadinessStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    query: string;
    resolvedStrandId: string | null;
    matches: DagSearchMatchView[];
  } | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    const m = new Map<string, GlobalDagStrandNode>();
    for (const n of data?.frontier.nodes ?? []) {
      m.set(n.strandId, n);
    }
    return m;
  }, [data]);

  const depthBuckets = useMemo(() => {
    if (!data) return [];
    const byDepth = new Map<number, GlobalDagStrandNode[]>();
    for (const node of data.frontier.nodes) {
      if (statusFilter !== "all" && node.readiness !== statusFilter) continue;
      const d = data.dag.depths[node.strandId] ?? 0;
      const list = byDepth.get(d);
      if (list) list.push(node);
      else byDepth.set(d, [node]);
    }
    return Array.from(byDepth.entries()).sort((a, b) => a[0] - b[0]);
  }, [data, statusFilter]);

  const handleRunMatch = async (e?: React.FormEvent, presetQuery?: string) => {
    e?.preventDefault();
    const target = (presetQuery ?? query).trim();
    if (!target) {
      setMatchResult(null);
      return;
    }
    if (presetQuery !== undefined) setQuery(presetQuery);
    setSearching(true);
    setMatchError(null);
    try {
      const res = await apiMatchPatternDag(target, 6);
      setMatchResult(res);
    } catch (err) {
      setMatchError((err as Error)?.message || "Matcher request failed.");
    } finally {
      setSearching(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="border-2 border-border bg-card p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="font-mono text-xs uppercase tracking-[0.16em]">
          Computing 49-Node Curriculum DAG &amp; Frontier...
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="border-2 border-rose-500/40 bg-rose-500/5 p-6 space-y-3">
        <div className="font-mono text-xs font-bold uppercase text-rose-500">
          Failed to Load DAG Explorer
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 border border-border bg-card px-3.5 py-2 font-mono text-xs uppercase cursor-pointer hover:border-primary"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { dag, frontier } = data;
  const { summary } = frontier;

  return (
    <div className="space-y-6">
      {/* 1. Canonical DAG Topology Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Canonical Strands</span>
            <Network className="size-3.5 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display">{dag.nodeCount}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {dag.rootStrandIds.length} roots · {dag.sinkStrandIds.length} sinks
            </span>
          </div>
        </div>

        <div className="border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Directed Prereq Edges</span>
            <GitBranch className="size-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display">{dag.edgeCount}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {dag.internalEdges} internal · {dag.crossPatternEdges} bridges
            </span>
          </div>
        </div>

        <div className="border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Critical Path Depth</span>
            <Layers className="size-3.5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-display">{dag.maxDepth}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {dag.ok ? "acyclic verified" : "cycle warning"}
            </span>
          </div>
        </div>

        <div className="border-2 border-border bg-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>Ready Frontier</span>
            <Sparkles className="size-3.5 text-primary" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div>
              <span className="text-2xl font-black font-display">{summary.ready}</span>
              <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                unlocked / {summary.blocked} blocked
              </span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh DAG Readiness"
              className="border border-border p-1.5 hover:border-primary text-muted-foreground hover:text-primary cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Live Semantic / Fuzzy / Problem-Slug DAG Matcher */}
      <div className="border-2 border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary flex items-center gap-1.5">
              <Search className="size-3.5" />
              Live Semantic &amp; Problem-Slug Matcher (`/api/patterns/dag/match`)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Resolve problem slugs, noisy copied strand IDs, or algorithmic concepts directly to their DAG strand and prerequisite status.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["3sum", "trapping-rain-water", ":monotonicity-condition", "kahn"].map(
              (sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => void handleRunMatch(undefined, sample)}
                  className="border border-border bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground hover:border-primary hover:text-primary cursor-pointer"
                >
                  {sample}
                </button>
              ),
            )}
          </div>
        </div>

        <form onSubmit={(e) => void handleRunMatch(e)} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: 3sum, trapping-rain-water, :monotonicity-condition, rolling array dp..."
            className="flex-1 border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] disabled:opacity-40 cursor-pointer"
          >
            {searching ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Search className="size-3.5" />
            )}
            Match DAG
          </button>
        </form>

        {matchError && (
          <div className="text-xs font-mono text-rose-500">{matchError}</div>
        )}

        {matchResult && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="text-muted-foreground">Resolved target:</span>
              <span className="border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary font-bold">
                {matchResult.resolvedStrandId ?? "No direct exact/slug resolution"}
              </span>
              <span className="text-muted-foreground">
                ({matchResult.matches.length} ranked match
                {matchResult.matches.length === 1 ? "" : "es"})
              </span>
            </div>

            {matchResult.matches.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchResult.matches.map((m) => {
                  const st = m.userState;
                  const meta = st ? READINESS_META[st.readiness] : READINESS_META.ready;
                  const isBusy = loadingPatternId === m.patternId;
                  return (
                    <div
                      key={m.strandId}
                      className="border border-border bg-background p-3.5 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono text-[10px] uppercase text-primary font-bold">
                              {m.patternTitle} · score {m.score} ({m.matchedVia})
                            </div>
                            <div className="text-sm font-bold text-foreground">
                              {m.strandTitle}
                            </div>
                          </div>
                          <span
                            className={`border px-2 py-0.5 font-mono text-[10px] uppercase shrink-0 ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {m.coreInvariant}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {st?.blockedBy.length
                            ? `Blocked by: ${st.blockedBy.map(shortStrand).join(", ")}`
                            : `Mastery ${st?.effectiveMastery ?? 0}% · unlocks ${st?.downstreamImpact ?? 0}`}
                        </span>
                        <button
                          type="button"
                          disabled={loadingPatternId !== null}
                          onClick={() => onSelectPattern(m.patternId, false)}
                          className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 font-mono text-[10px] font-bold uppercase cursor-pointer disabled:opacity-40"
                        >
                          <Play className="size-3" />
                          {isBusy ? "Starting..." : "Train"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Recommended Next Frontier & Cross-Pattern Bridges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 border-2 border-border bg-card p-5 space-y-3">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Recommended Next Frontier (Urgency × Downstream Leverage)
          </div>
          <div className="space-y-2">
            {frontier.recommendedNext.map((n, idx) => {
              const meta = READINESS_META[n.readiness];
              return (
                <div
                  key={n.strandId}
                  className="border border-border bg-background p-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-foreground">
                        {n.title}
                      </span>
                      <span
                        className={`border px-1.5 py-0.5 font-mono text-[10px] uppercase ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {n.patternId} · mastery {n.effectiveMastery}% · transitive downstream impact: {n.downstreamImpact}
                      {n.blockedBy.length > 0
                        ? ` · blocked by: ${n.blockedBy.map(shortStrand).join(", ")}`
                        : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loadingPatternId !== null}
                    onClick={() => onSelectPattern(n.patternId, false)}
                    className="inline-flex items-center gap-1 border border-border px-2.5 py-1 font-mono text-[10px] font-bold uppercase hover:border-primary hover:text-primary cursor-pointer"
                  >
                    Start
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 border-2 border-border bg-card p-5 space-y-3">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Cross-Pattern Prerequisite Bridges ({dag.patternBridges.length})
          </div>
          <div className="space-y-2.5">
            {dag.patternBridges.map((bridge) => {
              const fromNode = nodeMap.get(bridge.fromStrand);
              const toNode = nodeMap.get(bridge.toStrand);
              return (
                <div
                  key={`${bridge.fromStrand}->${bridge.toStrand}`}
                  className="border border-border bg-background p-3 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground uppercase">
                    <span>
                      {bridge.fromPattern} ➔ {bridge.toPattern}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectPattern(bridge.fromPattern, false)}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      Train prereq
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span>{shortStrand(bridge.fromStrand)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ({fromNode?.effectiveMastery ?? 0}%)
                    </span>
                    <ArrowRight className="size-3 text-primary shrink-0" />
                    <span>{shortStrand(bridge.toStrand)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ({toNode?.readiness ?? "blocked"})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Full Depth-Layered 49-Strand DAG Map */}
      <div className="border-2 border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
            All {dag.nodeCount} Curriculum Strands by Topological Depth (0 = Root, {dag.maxDepth} = Deepest Sink)
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", `All (${dag.nodeCount})`],
                ["gap", `Gaps (${summary.gap})`],
                ["due", `Due (${summary.due})`],
                ["ready", `Ready (${summary.ready})`],
                ["blocked", `Blocked (${summary.blocked})`],
                ["remediated", `Progress (${summary.remediated})`],
                ["mastered", `Mastered (${summary.mastered})`],
              ] as const
            ).map(([key, label]) => {
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-2.5 py-1 font-mono text-[10px] uppercase border cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-background text-muted-foreground border-border hover:border-primary/60"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          {depthBuckets.map(([depth, nodes]) => (
            <div key={depth} className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="border border-border bg-muted/50 px-2 py-0.5 text-foreground">
                  Depth {depth}
                </span>
                <span>
                  {depth === 0
                    ? "Foundational Roots (No Prerequisites)"
                    : depth === dag.maxDepth
                      ? "Terminal Multi-Pattern Synthesis Sinks"
                      : `Prerequisite Tier ${depth}`}
                </span>
                <span className="ml-auto">{nodes.length} nodes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {nodes.map((node) => {
                  const meta = READINESS_META[node.readiness];
                  return (
                    <div
                      key={node.strandId}
                      className="border border-border bg-background p-3 space-y-2 flex flex-col justify-between hover:border-primary/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase text-muted-foreground truncate">
                            {node.patternId}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9px] uppercase ${meta.badgeClass}`}
                          >
                            {node.readiness === "mastered" ? (
                              <CheckCircle2 className="size-2.5" />
                            ) : node.readiness === "gap" ? (
                              <AlertTriangle className="size-2.5" />
                            ) : node.readiness === "due" ? (
                              <Clock className="size-2.5" />
                            ) : node.readiness === "blocked" ? (
                              <Lock className="size-2.5" />
                            ) : null}
                            {meta.label}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-foreground leading-snug">
                          {node.title}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="h-1.5 w-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${meta.dotClass}`}
                            style={{ width: `${Math.max(4, node.effectiveMastery)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                          <span>
                            {node.effectiveMastery}% · impact {node.downstreamImpact}
                          </span>
                          <button
                            type="button"
                            disabled={loadingPatternId !== null}
                            onClick={() => onSelectPattern(node.patternId, false)}
                            className="text-primary font-bold hover:underline cursor-pointer"
                          >
                            Practice →
                          </button>
                        </div>
                        {node.blockedBy.length > 0 && (
                          <div className="font-mono text-[9px] text-muted-foreground truncate">
                            Needs: {node.blockedBy.map(shortStrand).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

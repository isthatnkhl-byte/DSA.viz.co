import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Layers,
  GitBranch,
  Binary,
  Network,
  Cpu,
  Flame,
  CheckCircle2,
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeVariant?: "live" | "hot" | "core";
  topics: string[];
  patternsCount: number;
  topicsCount: number;
  diagramType: "pointers" | "trees" | "dp" | "stack";
  linkTopic?: string;
}

const TRACKS: Track[] = [
  {
    id: "two-pointers",
    title: "Two Pointers & Sliding Window",
    subtitle: "Array & String Invariants",
    description:
      "Step-by-step visual glides from left-right pinches to dynamic sliding windows. Master contiguous subarray optimizations and two-sum patterns.",
    badge: "Core Pattern",
    badgeVariant: "hot",
    topics: ["Two Pointers", "Sliding Window", "Binary Search", "Prefix Sums", "Fast & Slow Pointers"],
    patternsCount: 18,
    topicsCount: 48,
    diagramType: "pointers",
    linkTopic: "Two Pointers",
  },
  {
    id: "trees-graphs",
    title: "Trees & Graph Traversals",
    subtitle: "Hierarchical & Network Algorithms",
    description:
      "Animated BFS, DFS, Dijkstra, and Topological Sort. Watch edge relaxations and cycle detections build visually before your eyes.",
    badge: "Interactive Graph",
    badgeVariant: "live",
    topics: ["Binary Tree", "BST", "Graph BFS/DFS", "Dijkstra", "Trie", "Union-Find"],
    patternsCount: 24,
    topicsCount: 64,
    diagramType: "trees",
    linkTopic: "Graph",
  },
  {
    id: "dp-greedy",
    title: "Dynamic Programming & Greedy",
    subtitle: "Optimal Substructure & Memoization",
    description:
      "Watch 2D DP grids populate cell-by-cell and decision trees prune redundant states. Master 0/1 knapsack, LCS, and interval scheduling.",
    badge: "Core Heavy",
    badgeVariant: "core",
    topics: ["1D DP", "2D DP Grid", "Memoization", "Greedy Intervals", "Bitmask DP"],
    patternsCount: 16,
    topicsCount: 52,
    diagramType: "dp",
    linkTopic: "Dynamic Programming",
  },
  {
    id: "stack-heap",
    title: "Monotonic Stack & Heap",
    subtitle: "Order Invariants & Priority Queues",
    description:
      "Watch elements push and pop on monotonic boundaries. Perfect for Next Greater Element, Trapping Rain Water, and Top-K streaming queues.",
    badge: "High Frequency",
    badgeVariant: "live",
    topics: ["Monotonic Stack", "Min/Max Heap", "Priority Queue", "Sliding Window Max"],
    patternsCount: 12,
    topicsCount: 36,
    diagramType: "stack",
    linkTopic: "Stack",
  },
];

function MiniTrackDiagram({ type }: { type: Track["diagramType"] }) {
  if (type === "pointers") {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-3 py-2 font-mono text-xs">
        <div className="flex items-center gap-1">
          <span className="flex size-6 items-center justify-center rounded-md border border-primary/50 bg-primary/20 font-bold text-primary text-[10px]">
            L
          </span>
          <span className="flex size-6 items-center justify-center rounded-md border border-border/70 bg-secondary/50 text-[10px] text-foreground">
            3
          </span>
          <span className="flex size-6 items-center justify-center rounded-md border border-border/70 bg-secondary/50 text-[10px] text-foreground">
            7
          </span>
          <span className="flex size-6 items-center justify-center rounded-md border border-accent/50 bg-accent/20 font-bold text-accent text-[10px]">
            R
          </span>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">→ pinch ←</span>
      </div>
    );
  }

  if (type === "trees") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
            1
          </span>
          <span className="text-muted-foreground text-[10px]">─</span>
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40">
            2
          </span>
          <span className="text-muted-foreground text-[10px]">─</span>
          <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/40">
            3
          </span>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono">BFS Level 2</span>
      </div>
    );
  }

  if (type === "dp") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2 font-mono text-xs">
        <div className="grid grid-cols-4 gap-1">
          <span className="size-4 rounded bg-primary/30 flex items-center justify-center text-[8px] font-bold text-primary">
            0
          </span>
          <span className="size-4 rounded bg-primary/30 flex items-center justify-center text-[8px] font-bold text-primary">
            1
          </span>
          <span className="size-4 rounded bg-emerald-500/30 flex items-center justify-center text-[8px] font-bold text-emerald-400">
            1
          </span>
          <span className="size-4 rounded bg-emerald-500/50 flex items-center justify-center text-[8px] font-bold text-emerald-300">
            2
          </span>
        </div>
        <span className="text-[10px] text-accent font-mono">dp[i][w] state</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2 font-mono text-xs">
      <div className="flex items-center gap-1">
        <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[9px] text-rose-400 font-bold">
          [Top: 14]
        </span>
        <span className="rounded bg-secondary/70 px-1.5 py-0.5 text-[9px] text-muted-foreground">
          8
        </span>
        <span className="rounded bg-secondary/70 px-1.5 py-0.5 text-[9px] text-muted-foreground">
          3
        </span>
      </div>
      <span className="text-[10px] text-rose-400 font-mono">Monotonic ↗</span>
    </div>
  );
}

export function TrackGrid() {
  return (
    <section id="tracks" className="py-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3 shadow-xs">
            <Layers className="size-3.5 text-primary" />
            <span>Structured Interview Mastery</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
            Curated <br />
            <span className="font-pixel text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent py-2 block mt-6 mb-4 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_60%,transparent)]">Pattern</span> 
            Tracks
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl font-sans">
            Every track is engineered around core algorithmic invariants with interactive step-by-step visualizations.
          </p>
        </div>

        <Link
          to="/problems"
          className="inline-flex items-center gap-2 font-mono text-xs font-bold text-primary hover:underline decoration-primary/50 underline-offset-4 self-center sm:self-end"
        >
          <span>View all 1500+ categorized problems</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {TRACKS.map((track) => (
          <Link
            key={track.id}
            to="/problems"
            className="group relative rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-7 flex flex-col justify-between hover:-translate-y-1 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 backdrop-blur-xl"
          >
            <div>
              {/* Header with Title & Badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors">
                    {track.title}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    {track.subtitle}
                  </p>
                </div>

                <span
                  className={`rounded-lg border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    track.badgeVariant === "hot"
                      ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                      : track.badgeVariant === "core"
                        ? "border-accent/40 bg-accent/15 text-accent"
                        : "border-primary/40 bg-primary/15 text-primary"
                  }`}
                >
                  {track.badge}
                </span>
              </div>

              {/* Interactive Mini Visual Diagram */}
              <div className="my-3">
                <MiniTrackDiagram type={track.diagramType} />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
                {track.description}
              </p>

              {/* Topic Chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {track.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-lg border border-border/70 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] sm:text-[11px] text-muted-foreground group-hover:border-primary/30 group-hover:text-foreground transition-colors"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer with Counts and Arrow */}
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                <strong className="text-foreground">{track.patternsCount}</strong> patterns •{" "}
                <strong className="text-foreground">{track.topicsCount}</strong> problems
              </span>

              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary group-hover:translate-x-1.5 transition-transform duration-200">
                <span>Start Track</span>
                <ArrowRight className="size-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

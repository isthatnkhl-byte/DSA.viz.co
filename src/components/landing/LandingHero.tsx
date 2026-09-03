import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Code2,
  Sparkles,
  Layers,
  Flame,
  CheckCircle2,
  Terminal,
  Zap,
  BookOpen,
  Cpu,
  ChevronRight,
} from "lucide-react";
import { LiveVisualizerCard } from "./LiveVisualizerCard";
import { ThemeSwitchBanner } from "./ThemeSwitchBanner";
import { HeroBrandTitle } from "./HeroBrandTitle";
import { useAuth } from "@/hooks/useAuth";

const TOPIC_CHIPS = [
  { name: "Two Pointers", count: "48", slug: "two-pointers", color: "text-accent border-accent/30 bg-accent/10 hover:border-accent" },
  { name: "Binary Search", count: "36", slug: "binary-search", color: "text-primary border-primary/30 bg-primary/10 hover:border-primary" },
  { name: "Sliding Window", count: "29", slug: "sliding-window", color: "text-primary border-primary/30 bg-primary/10 hover:border-primary" },
  { name: "Binary Trees", count: "64", slug: "binary-tree", color: "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:border-amber-400" },
  { name: "Dynamic Prog", count: "92", slug: "dynamic-programming", color: "text-rose-400 border-rose-500/30 bg-rose-500/10 hover:border-rose-400" },
  { name: "Graph BFS/DFS", count: "55", slug: "graph", color: "text-accent border-accent/30 bg-accent/10 hover:border-accent" },
];

export function LandingHero() {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden pt-6 pb-16 md:pt-10 md:pb-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Top Status & Appearance Ribbon */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-8 md:mb-12">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-card/85 px-4 py-1.5 text-xs font-mono backdrop-blur-xl shadow-md shadow-black/10">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-primary" />
          </span>
          <span className="font-bold text-foreground">1,500+ LeetCode Algorithms Indexed</span>
          <span className="hidden sm:inline text-muted-foreground/60">•</span>
          <span className="hidden sm:inline text-muted-foreground">Deterministic Frame-by-Frame Engine</span>
        </div>

        <ThemeSwitchBanner />
      </div>

      {/* Hero Dual-Column Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Core Value Proposition & Actions */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary shadow-xs backdrop-blur-md">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-primary" />
            </span>
            <span>Deterministic Execution Engine</span>
            <span className="text-primary/40">•</span>
            <span className="text-foreground/80 font-medium">Next-Gen LeetCode Architecture</span>
          </div>

          {/* Main Headline Structure */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-display font-black tracking-tight text-foreground leading-[1.15]">
              Master & Visualize Algorithms with
            </h1>

            {/* Redesigned DSAVIZCO Flowing Centerpiece */}
            <div className="py-2">
              <HeroBrandTitle />
            </div>

            {/* Strategic Value Pillar Accents */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground bg-secondary/70 border border-border/80 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Live Pointer Trace
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground bg-secondary/70 border border-border/80 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="size-1.5 rounded-full bg-accent" />
                C++20 Zero-Lag Sandbox
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground bg-secondary/70 border border-border/80 px-3 py-1.5 rounded-xl shadow-xs">
                <span className="size-1.5 rounded-full bg-primary" />
                AI Invariance Proofs
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground font-sans leading-relaxed max-w-2xl">
            Experience 1,500+ curated interview challenges with live step-by-step memory pointer animations,
            high-speed online C++20 sandbox compilation, and instant AI invariant verification.
          </p>

          {/* Fast Jewel-Toned Category Badges */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              <span>Curated Tracks:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {TOPIC_CHIPS.map((chip) => (
                <Link
                  key={chip.slug}
                  to="/problems"
                  className={`group inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-mono transition-all duration-200 shadow-xs hover:scale-105 active:scale-95 ${chip.color}`}
                >
                  <span className="font-semibold">{chip.name}</span>
                  <span className="rounded-md bg-background/60 px-1.5 py-0.2 text-[10px] font-extrabold">
                    {chip.count}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Main Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              to="/problems"
              className="group relative inline-flex items-center gap-2.5 rounded-2xl btn-moving-theme-gradient px-6 py-3.5 text-sm font-sans font-bold tracking-wide text-white shadow-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] overflow-hidden"
            >
              <Layers className="size-4 relative z-10" />
              <span className="relative z-10">Explore 1,500+ Visualizers</span>
              <ArrowRight className="size-4 relative z-10 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              to="/compiler"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/85 px-5 py-3.5 text-sm font-mono font-semibold text-foreground hover:bg-secondary hover:border-accent/40 transition-all duration-200 backdrop-blur-xl shadow-xs"
            >
              <Code2 className="size-4 text-accent" />
              <span>C++ Sandbox</span>
              <span className="rounded-md bg-accent/15 border border-accent/30 px-1.5 py-0.2 text-[9px] font-bold text-accent">
                C++20
              </span>
            </Link>

            <Link
              to={"/sheets" as any}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/85 px-5 py-3.5 text-sm font-mono font-semibold text-foreground hover:bg-secondary hover:border-primary/40 transition-all duration-200 backdrop-blur-xl shadow-xs"
            >
              <BookOpen className="size-4 text-primary" />
              <span>DSA Sheets</span>
            </Link>
          </div>

          {/* Micro-Features Grid with Cozy Jewel Styling */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 p-2.5 backdrop-blur-md">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent border border-accent/30 shadow-xs">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold text-foreground block">Zero Friction</span>
                <span className="text-muted-foreground text-[11px]">Instant in-browser</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 p-2.5 backdrop-blur-md">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30 shadow-xs">
                <Zap className="size-4" />
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold text-foreground block">AI Invariants</span>
                <span className="text-muted-foreground text-[11px]">Edge case auditor</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 p-2.5 backdrop-blur-md">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent border border-accent/30 shadow-xs">
                <Cpu className="size-4" />
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold text-foreground block">Dual Sandbox</span>
                <span className="text-muted-foreground text-[11px]">Piston + Godbolt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: High-Tech Live Visualizer Showcase */}
        <div className="lg:col-span-5 flex justify-center">
          <LiveVisualizerCard />
        </div>
      </div>
    </section>
  );
}

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
import { useAuth } from "@/hooks/useAuth";

const TOPIC_CHIPS = [
  { name: "Two Pointers", count: "48", slug: "two-pointers" },
  { name: "Binary Search", count: "36", slug: "binary-search" },
  { name: "Sliding Window", count: "29", slug: "sliding-window" },
  { name: "Binary Trees", count: "64", slug: "binary-tree" },
  { name: "Dynamic Prog", count: "92", slug: "dynamic-programming" },
  { name: "Graph BFS/DFS", count: "55", slug: "graph" },
];

export function LandingHero() {
  const { user, signInWithGoogle } = useAuth();

  return (
    <section className="relative overflow-hidden pt-6 pb-16 md:pt-10 md:pb-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Dynamic Ambient Background Illumination */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[360px] bg-gradient-to-tr from-primary/25 via-accent/20 to-emerald-500/15 blur-[120px] rounded-full pointer-events-none opacity-70 animate-portal-glow" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-primary/15 blur-[90px] rounded-full pointer-events-none" />

      {/* Top Status & Appearance Ribbon */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-8 md:mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/85 px-3.5 py-1.5 text-xs font-mono backdrop-blur-md shadow-xs">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-foreground">1500+ LeetCode Algorithms Ready</span>
          <span className="hidden sm:inline text-muted-foreground">•</span>
          <span className="hidden sm:inline text-muted-foreground">Interactive Step-by-Step Visualization</span>
        </div>

        <ThemeSwitchBanner />
      </div>

      {/* Hero Dual-Column Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Core Value Proposition & Actions */}
        <div className="lg:col-span-7 space-y-6 text-left">
          {/* Tagline Pill */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary shadow-xs">
            <Sparkles className="size-3.5 text-primary" />
            <span>Interactive Algorithmic Thinking</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black tracking-tight text-foreground leading-[1.1]">
            Stop memorizing syntax. <br />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent italic">
              Watch algorithms think.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground font-sans leading-relaxed max-w-2xl">
            Explore 1500+ curated LeetCode &amp; FAANG interview problems with live frame-by-frame visualizers,
            instant online C++ compilation, and AI-powered invariant checking.
          </p>

          {/* Fast Topic Category Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-mono font-semibold text-muted-foreground mr-1">
              Quick Focus:
            </span>
            {TOPIC_CHIPS.map((chip) => (
              <Link
                key={chip.slug}
                to="/problems"
                className="group inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1 text-xs font-mono text-muted-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <span>{chip.name}</span>
                <span className="rounded bg-secondary/80 px-1 py-0.2 text-[10px] font-bold text-foreground group-hover:bg-primary/20 group-hover:text-primary">
                  {chip.count}
                </span>
              </Link>
            ))}
          </div>

          {/* Main Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {user ? (
              <Link
                to="/problems"
                className="group relative inline-flex items-center gap-2.5 rounded-2xl btn-moving-theme-gradient px-6 py-3.5 text-sm font-mono font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-primary/40 active:scale-[0.98] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20 pointer-events-none" />
                <Layers className="size-4 relative z-10" />
                <span className="relative z-10">Explore 1500+ Problems</span>
                <ArrowRight className="size-4 relative z-10 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="group relative inline-flex items-center gap-2.5 rounded-2xl btn-moving-theme-gradient px-6 py-3.5 text-sm font-mono font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-primary/40 active:scale-[0.98] overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20 pointer-events-none" />
                <Layers className="size-4 relative z-10" />
                <span className="relative z-10">Explore 1500+ Problems</span>
                <ArrowRight className="size-4 relative z-10 transition-transform group-hover:translate-x-1" />
              </button>
            )}

            <Link
              to="/compiler"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-5 py-3.5 text-sm font-mono font-semibold text-foreground hover:bg-secondary hover:border-primary/40 transition-all duration-200 backdrop-blur-md"
            >
              <Code2 className="size-4 text-emerald-400" />
              <span>C++ Compiler</span>
            </Link>

            <Link
              to={"/sheets" as any}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-5 py-3.5 text-sm font-mono font-semibold text-foreground hover:bg-secondary hover:border-primary/40 transition-all duration-200 backdrop-blur-md"
            >
              <BookOpen className="size-4 text-primary" />
              <span>DSA Sheets</span>
            </Link>
          </div>

          {/* Micro-Features Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-3.5" />
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold text-foreground block">Zero Setup</span>
                <span className="text-muted-foreground text-[11px]">Instant in-browser</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Zap className="size-3.5" />
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold text-foreground block">AI Invariants</span>
                <span className="text-muted-foreground text-[11px]">Edge case check</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent border border-accent/20">
                <Cpu className="size-3.5" />
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold text-foreground block">Multi-Sandbox</span>
                <span className="text-muted-foreground text-[11px]">C++20 Piston/Godbolt</span>
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

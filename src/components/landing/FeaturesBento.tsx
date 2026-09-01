import { useState } from "react";
import {
  Bot,
  Zap,
  ShieldCheck,
  Code2,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Gauge,
  GitBranch,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export function FeaturesBento() {
  const [activeTab, setActiveTab] = useState<"ai" | "scrubber" | "compiler" | "companies">("ai");

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-4 shadow-xs">
          <Sparkles className="size-3.5 text-primary" />
          <span>Architected for Spatial Intuition</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
          Why visual problem solving works
        </h2>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground font-sans leading-relaxed">
          Move past syntax rote memorization into structural intuition, invariant boundary awareness, and lasting mastery.
        </p>
      </div>

      {/* 4-Card Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Bento 1: Large AI Invariant Card (Span 7) */}
        <div className="md:col-span-7 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <Bot className="size-6" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold text-primary">
                &lt; 2s Latency
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-primary transition-colors">
              Instant AI Invariant Audit
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Submit pseudocode or standard code in C++, Python, or Java. The AI engine validates your loop bounds, edge conditions, and Big-O invariants with surgical accuracy.
            </p>

            {/* Interactive Mock Terminal / Audit Result */}
            <div className="my-5 rounded-2xl border border-border/70 bg-background/80 p-4 font-mono text-xs backdrop-blur-md shadow-inner space-y-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-2">
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <Terminal className="size-3" />
                  <span>Invariant Auditor • Two Sum</span>
                </span>
                <span className="text-emerald-400 font-bold">Passed (4/4 Tests)</span>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>Loop bounds [0, n - 1] verified (No off-by-one errors)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>Pointer convergence guaranteed (l &lt; r invariant holds)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  <span>Time Complexity: O(n) Optimal • Space: O(1) Auxiliary</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between font-mono text-xs text-primary">
            <span className="font-bold">Real-Time Invariant Checking</span>
            <Link to="/playground" className="flex items-center gap-1 hover:underline">
              <span>Try in Playground</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Bento 2: Frame Scrubber Card (Span 5) */}
        <div className="md:col-span-5 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-accent/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
                <Zap className="size-6" />
              </div>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] font-bold text-accent">
                60 FPS Engine
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-accent transition-colors">
              Deterministic Time-Travel
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Never wonder what a pointer is doing. Scrub backward and forward through array pointers, recursion call stacks, tree node traversals, and DP grids.
            </p>

            {/* Visual Scrubber Micro-Card */}
            <div className="my-5 rounded-2xl border border-border/70 bg-background/80 p-4 font-mono text-xs backdrop-blur-md shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                <span>Execution Timeline</span>
                <span className="font-bold text-accent">Frame 14 of 28</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent w-1/2 rounded-full" />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-2">
                <span>[0] Start</span>
                <span>[14] Pivot Match</span>
                <span>[28] Return</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs text-accent font-bold flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span>Zero guessing • Pure visualization</span>
          </div>
        </div>

        {/* Bento 3: Multi-Provider Cloud Compiler (Span 5) */}
        <div className="md:col-span-5 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xs">
                <Code2 className="size-6" />
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-bold text-emerald-400">
                C++20 GCC 14
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-emerald-400 transition-colors">
              Online C++ Sandbox
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Instant in-browser compilation with standard libraries (`&lt;vector&gt;`, `&lt;unordered_map&gt;`, `&lt;queue&gt;`) and multi-provider fallback.
            </p>

            <div className="my-5 flex items-center justify-around rounded-2xl border border-border/70 bg-background/80 p-3 font-mono text-xs">
              <div className="text-center">
                <span className="text-[10px] text-muted-foreground block">Provider</span>
                <span className="font-bold text-emerald-400">Piston / Godbolt</span>
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div className="text-center">
                <span className="text-[10px] text-muted-foreground block">Latency</span>
                <span className="font-bold text-emerald-400">0.04s Exec</span>
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div className="text-center">
                <span className="text-[10px] text-muted-foreground block">Safety</span>
                <span className="font-bold text-emerald-400">Sandboxed</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between font-mono text-xs text-emerald-400">
            <span className="font-bold">Full Standard Library Included</span>
            <Link to="/compiler" className="flex items-center gap-1 hover:underline">
              <span>Open Compiler</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Bento 4: Top-Tier Company Frequency Tags (Span 7) */}
        <div className="md:col-span-7 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <ShieldCheck className="size-6" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold text-primary">
                1500+ Verified
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-primary transition-colors">
              Company-Tagged Interview Index
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Filter questions by real-world interview frequency. Practice the exact patterns asked in modern technical screening loops.
            </p>

            {/* Company Chips Cloud */}
            <div className="my-5 flex flex-wrap gap-2">
              {[
                { name: "Google", count: "148 questions", color: "text-blue-400 border-blue-500/30" },
                { name: "Meta", count: "124 questions", color: "text-blue-500 border-blue-500/30" },
                { name: "Amazon", count: "182 questions", color: "text-amber-400 border-amber-500/30" },
                { name: "Microsoft", count: "115 questions", color: "text-emerald-400 border-emerald-500/30" },
                { name: "Apple", count: "68 questions", color: "text-slate-300 border-slate-500/30" },
                { name: "Bloomberg", count: "94 questions", color: "text-purple-400 border-purple-500/30" },
                { name: "Uber", count: "54 questions", color: "text-foreground border-border/80" },
              ].map((c) => (
                <div
                  key={c.name}
                  className={`inline-flex items-center gap-1.5 rounded-xl border bg-secondary/50 px-3 py-1.5 font-mono text-xs ${c.color}`}
                >
                  <span className="font-bold">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">({c.count})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs text-primary font-bold flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span>Updated with recent interview questions</span>
          </div>
        </div>
      </div>
    </section>
  );
}

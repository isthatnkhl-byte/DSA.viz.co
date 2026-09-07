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
  Play,
  RotateCcw,
  Sliders,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const SCRUBBER_FRAMES = [
  { frame: 0, label: "Initialization", desc: "Left pointer at 0, Right pointer at n - 1", sum: "nums[0] + nums[4] = 2 + 15 = 17 > target" },
  { frame: 1, label: "Decrement Right", desc: "Sum exceeds target (17 > 14). Move right inward.", sum: "nums[0] + nums[3] = 2 + 11 = 13 < target" },
  { frame: 2, label: "Advance Left", desc: "Sum is under target (13 < 14). Move left inward.", sum: "nums[1] + nums[3] = 6 + 11 = 17 > target" },
  { frame: 3, label: "Target Convergence", desc: "Found exact complement pair! Indices {1, 2}.", sum: "nums[1] + nums[2] = 6 + 8 = 14 == target 🎯" },
];

export function FeaturesBento() {
  const [currentFrameIdx, setCurrentFrameIdx] = useState(3);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileOutput, setCompileOutput] = useState("Target found at indices [1, 2] | Result: OK");

  const activeFrame = SCRUBBER_FRAMES[currentFrameIdx] ?? SCRUBBER_FRAMES[0]!;

  const handleSimulateCompile = () => {
    setIsCompiling(true);
    setCompileOutput("Compiling with g++ -O3 -std=c++20 main.cpp...");
    setTimeout(() => {
      setIsCompiling(false);
      setCompileOutput("Compilation Success: Exit Code 0 | Exec Time: 0.018s | Peak RAM: 14.2 MB");
    }, 600);
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-4 shadow-xs">
          <Sparkles className="size-3.5 text-primary" />
          <span>Architected for Spatial Intuition</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
          Why visual problem solving <br />
          <span className="font-pixel text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent py-2 block mt-6 mb-4 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_60%,transparent)]">works</span>
        </h2>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground font-sans leading-relaxed">
          Move past syntax rote memorization into structural intuition, invariant boundary awareness, and lasting mastery.
        </p>
      </div>

      {/* 4-Card Interactive Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Bento 1: Large AI Invariant Card (Span 7) */}
        <div className="md:col-span-7 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <Bot className="size-6" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold text-primary">
                Invariant Analysis
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-primary transition-colors">
              Pseudocode & Invariant Audit
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Submit pseudocode or standard code in C++, Python, or Java. The invariant engine checks your loop bounds, base cases, and Big-O invariants with clear explanations.
            </p>

            {/* Interactive Terminal / Audit Result */}
            <div className="my-5 rounded-2xl border border-border/70 bg-background/80 p-4 font-mono text-xs backdrop-blur-md shadow-inner space-y-2">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-2">
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <Terminal className="size-3" />
                  <span>Invariant Auditor • Two Sum II</span>
                </span>
                <span className="text-primary font-bold">Passed (4/4 Tests)</span>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center gap-2 text-foreground/90">
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                  <span>Loop bounds [0, n - 1] verified (No off-by-one errors)</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90">
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
                  <span>Pointer convergence guaranteed (l &lt; r invariant holds)</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90">
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
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

        {/* Bento 2: Interactive Frame Scrubber Card (Span 5) */}
        <div className="md:col-span-5 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <Zap className="size-6" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold text-primary">
                Step-by-Step
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-primary transition-colors">
              Interactive State Timeline
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Never wonder what a pointer is doing. Step backward and forward through array pointers, recursion call stacks, and DP grids.
            </p>

            {/* Interactive Visual Scrubber Micro-Card */}
            <div className="my-5 rounded-2xl border border-border/70 bg-background/80 p-4 font-mono text-xs backdrop-blur-md shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                <span className="font-bold text-foreground">Interactive Timeline</span>
                <span className="font-bold text-primary">
                  Step {currentFrameIdx + 1} of {SCRUBBER_FRAMES.length}
                </span>
              </div>

              {/* Step indicator buttons */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {SCRUBBER_FRAMES.map((f, i) => (
                  <button
                    key={f.frame}
                    type="button"
                    onClick={() => setCurrentFrameIdx(i)}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      i <= currentFrameIdx
                        ? "bg-primary"
                        : "bg-secondary"
                    } ${i === currentFrameIdx ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                    title={f.label}
                  />
                ))}
              </div>

              {/* Dynamic step readout */}
              <div className="rounded-xl bg-card/70 border border-border/60 p-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-foreground">{activeFrame.label}</span>
                  <span className="text-[10px] text-primary font-bold">Frame {activeFrame.frame}</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-sans">{activeFrame.desc}</div>
                <div className="text-[10px] text-primary font-mono font-bold pt-1 border-t border-border/40">
                  {activeFrame.sum}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs text-primary font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4" />
              <span>Predictable state transitions</span>
            </span>
            <button
              type="button"
              onClick={() => setCurrentFrameIdx((prev) => (prev + 1) % SCRUBBER_FRAMES.length)}
              className="inline-flex items-center gap-1 text-[11px] hover:underline"
            >
              <span>Next Step</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        </div>

        {/* Bento 3: Multi-Provider Cloud Compiler (Span 5) */}
        <div className="md:col-span-5 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-accent/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
                <Code2 className="size-6" />
              </div>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] font-bold text-accent">
                C++20 GCC 14
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-accent transition-colors">
              Online C++ Sandbox
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              In-browser compilation with standard libraries (`&lt;vector&gt;`, `&lt;unordered_map&gt;`, `&lt;queue&gt;`) and multi-provider fallback.
            </p>

            {/* Interactive Mini Console */}
            <div className="my-5 rounded-2xl border border-border/70 bg-background/80 p-3.5 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50 text-[10px]">
                <span className="text-muted-foreground">Sandbox Console</span>
                <button
                  type="button"
                  onClick={handleSimulateCompile}
                  disabled={isCompiling}
                  className="flex items-center gap-1 rounded bg-accent/20 text-accent px-2 py-0.5 font-bold hover:bg-accent/30 transition-colors"
                >
                  <Play className="size-2.5 fill-current" />
                  <span>{isCompiling ? "Running..." : "Test Run"}</span>
                </button>
              </div>
              <div className="text-[11px] text-foreground font-mono truncate">
                {compileOutput}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between font-mono text-xs text-accent">
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

            {/* Interactive Company Chips Cloud */}
            <div className="my-5 flex flex-wrap gap-2">
              {[
                { name: "Google", count: "148 questions", color: "text-accent border-accent/30 hover:bg-accent/10" },
                { name: "Meta", count: "124 questions", color: "text-primary border-primary/30 hover:bg-primary/10" },
                { name: "Amazon", count: "182 questions", color: "text-amber-400 border-amber-500/30 hover:bg-amber-500/10" },
                { name: "Microsoft", count: "115 questions", color: "text-primary border-primary/30 hover:bg-primary/10" },
                { name: "Apple", count: "68 questions", color: "text-slate-300 border-slate-500/30 hover:bg-slate-500/10" },
                { name: "Bloomberg", count: "94 questions", color: "text-accent border-accent/30 hover:bg-accent/10" },
                { name: "Uber", count: "54 questions", color: "text-foreground border-border/80 hover:bg-secondary" },
              ].map((c) => (
                <Link
                  key={c.name}
                  to="/problems"
                  search={{ company: c.name } as any}
                  className={`inline-flex items-center gap-1.5 rounded-xl border bg-secondary/50 px-3 py-1.5 font-mono text-xs transition-all duration-200 hover:scale-105 ${c.color}`}
                >
                  <span className="font-bold">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">({c.count})</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs text-primary font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>Updated with recent interview questions</span>
            </span>
            <Link to="/problems" className="flex items-center gap-1 hover:underline">
              <span>View All Questions</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

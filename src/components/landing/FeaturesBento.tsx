import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Sparkles,
  ArrowRight,
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Crosshair,
  Wand2,
  Film,
  Download,
  CheckCircle2,
  MousePointerClick,
  Zap,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface DryRunStep {
  step: number;
  title: string;
  winStart: number;
  winEnd: number;
  windowSum: number;
  maxSum: number;
  invariant: string;
  narration: string;
  cursorTargetIdx: number;
}

const LIVE_WHITEBOARD_STEPS: DryRunStep[] = [
  {
    step: 1,
    title: "Initialize Window [0..2]",
    winStart: 0,
    winEnd: 2,
    windowSum: 8,
    maxSum: 8,
    invariant: "windowSum = arr[0] + arr[1] + arr[2] = 2 + 1 + 5 = 8",
    narration: "AI draws raw input banner, array cells [0..5], and wraps first k=3 elements in a dashed window frame.",
    cursorTargetIdx: 2,
  },
  {
    step: 2,
    title: "Slide Window Right [1..3]",
    winStart: 1,
    winEnd: 3,
    windowSum: 7,
    maxSum: 8,
    invariant: "windowSum = prevSum - arr[0] + arr[3] = 8 - 2 + 1 = 7",
    narration: "AI advances L=1, R=3 pointer arrows and subtracts outgoing arr[0]=2 while adding incoming arr[3]=1 in O(1).",
    cursorTargetIdx: 3,
  },
  {
    step: 3,
    title: "Peak Window Found [2..4] 🎯",
    winStart: 2,
    winEnd: 4,
    windowSum: 9,
    maxSum: 9,
    invariant: "windowSum = prevSum - arr[1] + arr[4] = 7 - 1 + 3 = 9 (New Max!)",
    narration: "Window [5, 1, 3] hits peak sum 9! AI highlights cells in emerald and updates maxSum = 9 tracker card.",
    cursorTargetIdx: 4,
  },
  {
    step: 4,
    title: "Final Slide [3..5] & Converge",
    winStart: 3,
    winEnd: 5,
    windowSum: 6,
    maxSum: 9,
    invariant: "windowSum = 9 - 5 + 2 = 6 < maxSum (9 remains optimal)",
    narration: "R reaches end of array (index 5). Optimal O(n) pass completes with max subarray sum = 9.",
    cursorTargetIdx: 5,
  },
];

const MOTION_CHAPTERS = [
  {
    id: 0,
    timeRange: [0, 3.5] as const,
    code: "01 // LIVE PROMPT",
    title: "Ask Any Prompt in Plain English",
    subtitle: "User asks for a Sliding Window dry run; LIVE AI badge confirms real-time Gemini model execution.",
  },
  {
    id: 1,
    timeRange: [3.5, 8.0] as const,
    code: "02 // AI WHITEBOARD DRAW",
    title: "Raw Array, Dashed Window & Laser Cursor",
    subtitle: "AI draws the raw dataset banner, index boxes, L/R vertical arrows, and live state tracker cards.",
  },
  {
    id: 2,
    timeRange: [8.0, 11.2] as const,
    code: "03 // LINK ZONE CONTEXT",
    title: "Tag Zone #1 (🎯 #1) for Context-Aware AI",
    subtitle: "Selecting Zone #1 automatically attaches its topic, active step invariant, and dataset [2,1,5,1,3,2].",
  },
  {
    id: 3,
    timeRange: [11.2, 15.0] as const,
    code: "04 // BRANCH & TAKE OVER",
    title: "Branch Zone #2 or Take Over In-Place",
    subtitle: "AI spawns connected Zone #2 with a dashed rose branch arrow using Zone #1's exact data.",
  },
];

export function FeaturesBento() {
  const [activeStepIdx, setActiveStepIdx] = useState(2);
  const [linkMode, setLinkMode] = useState<"branch" | "takeover">("branch");
  const [activePrimitive, setActivePrimitive] = useState<"array" | "hashmap" | "tree" | "grid2d">("array");

  // Motion-Graphics Overview Video Player state
  const [playerMode, setPlayerMode] = useState<"motion" | "video">("motion");
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedSec, setElapsedSec] = useState(0);
  const TOTAL_DURATION = 15.0;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isPlaying || playerMode !== "motion") return;
    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setElapsedSec((prev) => {
        const next = prev + dt;
        return next >= TOTAL_DURATION ? 0 : next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playerMode]);

  const activeStep = LIVE_WHITEBOARD_STEPS[activeStepIdx] ?? LIVE_WHITEBOARD_STEPS[2]!;
  const demoArray = [2, 1, 5, 1, 3, 2];

  const currentChapterIdx =
    MOTION_CHAPTERS.findIndex(
      (ch) => elapsedSec >= ch.timeRange[0] && elapsedSec < ch.timeRange[1]
    ) !== -1
      ? MOTION_CHAPTERS.findIndex(
          (ch) => elapsedSec >= ch.timeRange[0] && elapsedSec < ch.timeRange[1]
        )
      : 0;
  const currentChapter = MOTION_CHAPTERS[currentChapterIdx]!;

  // Derived motion timeline states for the 60fps Cinema Motion Player
  const motionStepIdx =
    elapsedSec < 4.8 ? 0 : elapsedSec < 6.4 ? 1 : 2;
  const motionStep = LIVE_WHITEBOARD_STEPS[motionStepIdx]!;
  const isZone1LinkedInMotion = elapsedSec >= 8.0;
  const isZone2BranchedInMotion = elapsedSec >= 11.2;

  const prompt1Text =
    "can you simulate the sliding window algorithm for a question max subarray sum with dry run?";
  const prompt2Text =
    "compare brute force O(n*k) vs O(n) delta transition using linked Zone #1 data";
  const activeMotionPrompt = isZone1LinkedInMotion ? prompt2Text : prompt1Text;
  const typedChars =
    elapsedSec < 2.4
      ? Math.floor((elapsedSec / 2.2) * prompt1Text.length)
      : elapsedSec < 8.0
      ? prompt1Text.length
      : elapsedSec < 10.2
      ? Math.floor(((elapsedSec - 8.0) / 1.8) * prompt2Text.length)
      : prompt2Text.length;

  const handleJumpToChapter = (chapterIndex: number) => {
    const target = MOTION_CHAPTERS[chapterIndex];
    if (!target) return;
    setElapsedSec(target.timeRange[0] + 0.05);
    if (playerMode === "video" && videoRef.current) {
      videoRef.current.currentTime = target.timeRange[0];
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-4 shadow-xs">
          <Sparkles className="size-3.5 text-primary" />
          <span>AI-Assisted Excalidraw Co-Teacher</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
          AI-Assisted Whiteboard <br />
          <span className="font-pixel text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent py-2 block mt-6 mb-4 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
            learning
          </span>
        </h2>
        <p className="mt-3 text-base sm:text-lg text-muted-foreground font-sans leading-relaxed">
          Ask any algorithm question in plain English and watch a live AI model draw raw input arrays, dashed sliding windows, pointer markers, and context-linked branches directly on an interactive whiteboard.
        </p>
      </div>

      {/* 4-Card AI Whiteboard Feature Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Card 1: Live Prompt-to-Whiteboard Dry Run Simulation (Span 7) */}
        <div className="md:col-span-7 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                  <Bot className="size-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                    Live Excalidraw Generation
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors">
                    Prompt-to-Whiteboard Dry Run
                  </h3>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 font-mono text-[11px] font-bold text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE AI: gemini-3.5-flash-lite
              </span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
              Prioritizes live Gemini generation for any query—drawing the raw input banner, array index cells, vertical pointer arrows (<code className="text-primary font-mono">L</code>, <code className="text-primary font-mono">R</code>), dashed active window frames, and an animated AI laser cursor.
            </p>

            {/* Interactive Mini Whiteboard Canvas Preview */}
            <div className="my-5 rounded-2xl border border-slate-300/80 bg-[#f8fafc] text-slate-900 p-4 font-mono text-xs shadow-inner relative overflow-hidden">
              {/* Top Zone Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-200">
                <span className="inline-flex items-center gap-1.5 font-bold text-[11px] text-sky-700 bg-sky-100 border border-sky-300 rounded-md px-2.5 py-0.5">
                  ZONE #1 • SLIDING WINDOW MAX SUBARRAY SUM (K=3)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-400 rounded-md px-2 py-0.5">
                  ✓ LIVE AI: gemini-3.5-flash-lite
                </span>
              </div>

              {/* Raw Input Dataset Banner */}
              <div className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 mb-3 flex items-center justify-between">
                <span>Input: arr = [2, 1, 5, 1, 3, 2], k = 3</span>
                <span className="text-sky-700">Step {activeStep.step}/4: {activeStep.title}</span>
              </div>

              {/* Array Cells + Dashed Sliding Window Frame */}
              <div className="relative py-4 px-2 flex items-center justify-center gap-2 sm:gap-3">
                {demoArray.map((val, idx) => {
                  const inWin = idx >= activeStep.winStart && idx <= activeStep.winEnd;
                  const isPeak = activeStep.step === 3 && inWin;
                  const isLeft = idx === activeStep.winStart;
                  const isRight = idx === activeStep.winEnd;
                  return (
                    <div key={idx} className="flex flex-col items-center relative">
                      <span className="text-[10px] text-slate-500 mb-1">[{idx}]</span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveStepIdx(Math.min(LIVE_WHITEBOARD_STEPS.length - 1, Math.max(0, idx - 1)))
                        }
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300 ${
                          isPeak
                            ? "bg-emerald-100 border-2 border-emerald-600 text-emerald-950 ring-2 ring-amber-500/60 shadow-md scale-105"
                            : inWin
                            ? "bg-amber-100 border-2 border-amber-600 text-amber-950 ring-2 ring-amber-400/50 shadow-sm scale-105"
                            : "bg-white border border-slate-300 text-slate-700"
                        }`}
                      >
                        {val}
                      </button>
                      {/* Pointer Markers Below Cell */}
                      <div className="h-6 mt-1 flex items-center justify-center">
                        {isLeft && (
                          <span className="inline-flex items-center rounded bg-sky-100 border border-sky-500 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">
                            ↑ L={idx}
                          </span>
                        )}
                        {isRight && (
                          <span className="inline-flex items-center rounded bg-emerald-100 border border-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                            ↑ R={idx}
                          </span>
                        )}
                      </div>
                      {/* AI Laser Cursor on active R cell */}
                      {idx === activeStep.cursorTargetIdx && (
                        <div className="absolute -top-2 -right-3 z-10 pointer-events-none flex items-center gap-1 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-bold shadow-md animate-bounce">
                          <span>🤖 AI</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live State Tracker Cards + Step Controls */}
              <div className="grid grid-cols-3 gap-2 mt-1 pt-2.5 border-t border-slate-200">
                <div className="rounded-lg border border-sky-400 bg-sky-50 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-sky-700 uppercase">window [L..R]</div>
                  <div className="text-xs font-black text-slate-900">
                    [{activeStep.winStart} .. {activeStep.winEnd}]
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500 bg-amber-50 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-amber-800 uppercase">windowSum</div>
                  <div className="text-xs font-black text-slate-900">{activeStep.windowSum}</div>
                </div>
                <div className="rounded-lg border border-emerald-500 bg-emerald-50 px-2.5 py-1.5">
                  <div className="text-[9px] font-bold text-emerald-800 uppercase">maxSum (Best)</div>
                  <div className="text-xs font-black text-emerald-900">
                    {activeStep.maxSum} {activeStep.step >= 3 ? "🎯" : ""}
                  </div>
                </div>
              </div>

              {/* Step Scrubber Bar */}
              <div className="mt-3 flex items-center justify-between gap-2 bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-700 truncate">
                  {activeStep.invariant}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {LIVE_WHITEBOARD_STEPS.map((st, idx) => (
                    <button
                      key={st.step}
                      type="button"
                      onClick={() => setActiveStepIdx(idx)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        idx === activeStepIdx
                          ? "bg-rose-600 text-white"
                          : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      S{st.step}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between font-mono text-xs text-primary">
            <span className="font-bold">Live Markers, Raw Arrays &amp; AI Laser Cursor</span>
            <Link to="/interview" className="flex items-center gap-1 hover:underline">
              <span>Open AI Whiteboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Context-Aware Zone Linking, Branching & Takeover (Span 5) */}
        <div className="md:col-span-5 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <GitBranch className="size-6" />
              </div>
              <span className="rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-mono text-[11px] font-bold text-rose-300">
                🎯 Linked Zone Context
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-primary transition-colors">
              Select, Branch or Take Over Any Zone
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Click any previous zone on the canvas or in the <code className="text-primary font-mono">Board Zones</code> bar (<code className="text-primary font-mono">🎯 #1</code>) to pin its topic, active step invariant, and dataset for follow-up questions.
            </p>

            {/* Interactive Zone Link & Branch / Takeover Simulator */}
            <div className="my-5 rounded-2xl border border-rose-500/30 bg-background/85 p-4 font-mono text-xs space-y-3 shadow-inner">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                  <Crosshair className="size-3.5" />
                  <span>Linked Zone #1: Sliding Window (Step 3/4)</span>
                </span>
                <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                  Pinned
                </span>
              </div>

              <div className="rounded-xl bg-card/80 border border-border/60 p-2.5 text-[11px] space-y-1">
                <div className="text-muted-foreground">
                  Injected Dataset: <span className="text-foreground font-bold">[2, 1, 5, 1, 3, 2, 3]</span>
                </div>
                <div className="text-muted-foreground">
                  Active Invariant: <span className="text-primary font-bold">windowSum = 9 (Peak [2..4])</span>
                </div>
              </div>

              {/* Toggle Branch vs Takeover */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLinkMode("branch")}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    linkMode === "branch"
                      ? "border-rose-500 bg-rose-500/20 text-rose-200 font-bold"
                      : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-[11px]">🌿 Branch Zone #2</div>
                  <div className="text-[9px] opacity-80 font-sans">Connect new zone with arrow</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMode("takeover")}
                  className={`rounded-xl border px-3 py-2 text-left transition-all ${
                    linkMode === "takeover"
                      ? "border-amber-500 bg-amber-500/20 text-amber-200 font-bold"
                      : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-[11px]">⚡ AI Take Over #1</div>
                  <div className="text-[9px] opacity-80 font-sans">Replace Zone #1 in-place</div>
                </button>
              </div>

              <div className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-2 text-[11px] text-foreground/90 font-sans">
                {linkMode === "branch" ? (
                  <span>
                    <strong className="text-rose-400 font-mono">Branch Mode:</strong> Spawns non-overlapping <strong>Zone #2</strong> to the right of Zone #1 with a dashed rose arrow and full context banner.
                  </span>
                ) : (
                  <span>
                    <strong className="text-amber-400 font-mono">Takeover Mode:</strong> Replaces <strong>Zone #1</strong> directly in-place at its exact <code className="font-mono">(originX, originY)</code> slot using the linked dataset.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs text-primary font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4" />
              <span>Zero context loss across zones</span>
            </span>
            <Link to="/interview" className="inline-flex items-center gap-1 text-[11px] hover:underline">
              <span>Try Zone Linking</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Multi-Zone Spatial Canvas & Model Attribution (Span 5) */}
        <div className="md:col-span-5 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-accent/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
                <Layers className="size-6" />
              </div>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] font-bold text-accent">
                Spatial Board Zones
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-accent transition-colors">
              Verified Live Model Badges &amp; Multi-Zone History
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Every simulation renders inside a non-overlapping architectural frame with a live badge showing the exact model that answered—never overwriting your previous drawings.
            </p>

            <div className="my-5 rounded-2xl border border-border/70 bg-background/80 p-3.5 font-mono text-xs space-y-2.5 shadow-inner">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                Active Board Zones Navigation Bar
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500 bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-300">
                  🎯 #1 Sliding Window
                  <span className="rounded bg-emerald-500/30 px-1 text-[9px] text-emerald-200">
                    gemini-3.5-flash-lite
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                  🌿 #2 Prefix Sum Branch
                  <span className="rounded bg-emerald-500/30 px-1 text-[9px] text-emerald-200">
                    gemini-3.5-flash
                  </span>
                </span>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300 flex items-center justify-between">
                <span>Model Which Answered Badge</span>
                <span className="font-bold">100% Live Verified</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between font-mono text-xs text-accent">
            <span className="font-bold">Collision-Free Infinite Canvas</span>
            <Link to="/interview" className="flex items-center gap-1 hover:underline">
              <span>Explore Zones</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Rich Visual Primitives & Composite Widgets (Span 7) */}
        <div className="md:col-span-7 group rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-2xl transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="size-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
                <Wand2 className="size-6" />
              </div>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-bold text-primary">
                Composite Excalidraw Primitives
              </span>
            </div>

            <h3 className="font-display text-2xl font-black text-foreground group-hover:text-primary transition-colors">
              Arrays, 2D DP Grids, Hash Maps, Trees &amp; Graphs
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
              Instead of static images, the AI composes real editable Excalidraw primitives—so you can drag nodes, draw annotations, or select any subset of shapes for AI inspection.
            </p>

            {/* Interactive Primitive Switcher */}
            <div className="my-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "array", label: "Sliding Window & Two Pointers" },
                  { id: "hashmap", label: "Hash Map & Complement Table" },
                  { id: "tree", label: "Trees, Heaps & Recursion" },
                  { id: "grid2d", label: "2D DP & Matrix BFS/DFS" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePrimitive(item.id as any)}
                    className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                      activePrimitive === item.id
                        ? "border-primary bg-primary/20 text-primary shadow-xs"
                        : "border-border/70 bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-4 font-mono text-xs">
                {activePrimitive === "array" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-primary font-bold">1D Array + Dashed Window + Vertical Pointers</div>
                      <div className="text-muted-foreground text-[11px] font-sans mt-0.5">
                        Automatic <code className="font-mono">[0]..[n-1]</code> index headers, dashed window frames around contiguous highlighted cells, and <code className="font-mono">L/R/mid</code> pointer arrows.
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 text-amber-300 font-bold">
                      Window [L..R] + Pointers
                    </span>
                  </div>
                )}
                {activePrimitive === "hashmap" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-primary font-bold">Live Key-Value Hash Table Widget</div>
                      <div className="text-muted-foreground text-[11px] font-sans mt-0.5">
                        Renders structured <code className="font-mono">key → value/index</code> lookup tables alongside the input array with curved lookup arrows on O(1) hits.
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-sky-500/15 border border-sky-500/40 px-3 py-1.5 text-sky-300 font-bold">
                      seen[complement] → idx
                    </span>
                  </div>
                )}
                {activePrimitive === "tree" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-primary font-bold">Hierarchical Tree, Trie &amp; Graph Layouts</div>
                      <div className="text-muted-foreground text-[11px] font-sans mt-0.5">
                        Collision-free node placement with directed/bidirectional edges, split-compartment linked list nodes, and recursion stack buckets.
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-emerald-300 font-bold">
                      Nodes + Labeled Edges
                    </span>
                  </div>
                )}
                {activePrimitive === "grid2d" && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-primary font-bold">2D Matrix &amp; Dynamic Programming Table</div>
                      <div className="text-muted-foreground text-[11px] font-sans mt-0.5">
                        Row/column headers, per-cell transition highlights, and live recurrence invariant cards (<code className="font-mono">dp[r][c] = max(...)</code>).
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-purple-500/15 border border-purple-500/40 px-3 py-1.5 text-purple-300 font-bold">
                      grid2d[r][c] + State Cards
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs text-primary font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              <span>100% Editable Excalidraw Vector Shapes</span>
            </span>
            <Link to="/interview" className="flex items-center gap-1 hover:underline">
              <span>Launch Full Whiteboard</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* =====================================================================
          HIGH-MOTION GRAPHICS OVERVIEW VIDEO SHOWCASE (PLACED UNDER SECTION)
         ===================================================================== */}
      <div className="mt-12 rounded-3xl border border-primary/40 bg-gradient-to-b from-card/95 via-background/95 to-card/90 p-5 sm:p-8 shadow-[0_0_60px_-15px_rgba(225,29,72,0.3)] backdrop-blur-2xl">
        {/* Video Showcase Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-[11px] font-mono font-bold text-rose-300 mb-2">
              <Film className="size-3.5 text-rose-400" />
              <span>HIGH-MOTION GRAPHICS OVERVIEW VIDEO • LIVE WORKFLOW</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-black text-foreground">
              Watch the AI Co-Teacher Draw, Link Zones &amp; Branch Live
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1">
              From typing a natural-language prompt to live Excalidraw array/pointer generation, tagging <code className="text-rose-400 font-mono">🎯 Zone #1</code>, and branching <code className="text-amber-400 font-mono">🌿 Zone #2</code> with full context.
            </p>
          </div>

          {/* Mode Switcher + Download Video Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded-xl border border-border/80 bg-secondary/60 p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setPlayerMode("motion")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  playerMode === "motion"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ✨ 60fps Motion Engine
              </button>
              <button
                type="button"
                onClick={() => setPlayerMode("video")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  playerMode === "video"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎬 WebM Video File
              </button>
            </div>

            <a
              href="/videos/ai-whiteboard-overview.webm"
              download="dsa-viz-ai-whiteboard-overview.webm"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 hover:bg-secondary px-3 py-2 font-mono text-xs font-bold text-foreground transition-colors"
            >
              <Download className="size-3.5 text-primary" />
              <span>Download .webm</span>
            </a>
          </div>
        </div>

        {/* Widescreen 16:9 Motion-Graphics Viewport */}
        <div className="mt-6 relative rounded-2xl border border-rose-500/35 bg-[#090407] overflow-hidden shadow-2xl">
          {playerMode === "video" ? (
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                src="/videos/ai-whiteboard-overview.webm"
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            </div>
          ) : (
            <div className="relative w-full p-4 sm:p-6 bg-[radial-gradient(circle_at_20%_20%,rgba(225,29,72,0.16),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(249,115,22,0.14),transparent_45%)]">
              {/* Top Simulated Website Chrome Bar */}
              <div className="rounded-xl border border-rose-500/30 bg-[#140910]/95 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-rose-500" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-1 font-bold text-rose-300 text-[11px] sm:text-xs">
                    DSA.viz.co // AI Co-Teacher Whiteboard
                  </span>
                </div>

                {/* Live Model Answered Badge */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/60 bg-emerald-950/90 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shadow-xs">
                    <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE AI: gemini-3.5-flash-lite
                  </span>

                  {/* Board Zones Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-1">
                    <span className="text-[10px] text-slate-400 font-bold">BOARD ZONES:</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition-all duration-300 ${
                        isZone1LinkedInMotion
                          ? "bg-rose-600 text-white ring-2 ring-rose-400 shadow-sm scale-105"
                          : "bg-slate-800 text-slate-200 border border-slate-600"
                      }`}
                    >
                      {isZone1LinkedInMotion ? "🎯 #1 Sliding Window" : "#1 Sliding Window"}
                    </span>
                    {isZone2BranchedInMotion && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/25 border border-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-200 animate-in fade-in zoom-in-95 duration-300">
                        🌿 #2 Optimal Branch
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Simulated Live Prompt Bar */}
              <div className="mt-2.5 rounded-xl border border-rose-500/40 bg-[#12080e]/95 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    ASK AI &gt;
                  </span>
                  <span className="text-slate-100 truncate text-[11px] sm:text-xs">
                    {activeMotionPrompt.slice(0, typedChars)}
                    <span className="inline-block w-1.5 h-3.5 bg-rose-400 ml-0.5 animate-pulse align-middle" />
                  </span>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-bold text-white shadow-sm transition-all duration-300 ${
                    isZone1LinkedInMotion
                      ? "bg-gradient-to-r from-rose-600 to-pink-600 ring-2 ring-rose-400/50"
                      : "bg-gradient-to-r from-orange-500 to-rose-600"
                  }`}
                >
                  <Zap className="size-3" />
                  <span>
                    {isZone1LinkedInMotion ? "🌿 Branch From Zone #1" : "✨ Ask AI Co-Teacher"}
                  </span>
                </span>
              </div>

              {/* Linked Zone Context Pink Bar (Appears in Scene 3 & 4) */}
              {isZone1LinkedInMotion && (
                <div className="mt-2 rounded-xl border border-rose-500/60 bg-rose-950/60 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-rose-200 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="size-3.5 text-rose-400 shrink-0" />
                    <span className="font-bold text-white">
                      Linked Zone #1: Sliding Window Max Subarray Sum (Step 3/4)
                    </span>
                    <span className="hidden md:inline text-rose-300">
                      • Dataset [2, 1, 5, 1, 3, 2, 3] • Invariant: windowSum = 9
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold">
                      🌿 Branch From Zone #1
                    </span>
                    <span className="rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 px-2 py-0.5 text-[10px] font-bold">
                      ⚡ AI Take Over Zone #1
                    </span>
                  </div>
                </div>
              )}

              {/* Simulated Excalidraw Whiteboard Surface */}
              <div className="mt-3 rounded-2xl border-2 border-slate-300 bg-[#f8fafc] text-slate-900 p-4 sm:p-5 relative overflow-hidden min-h-[340px]">
                {/* Dot Grid Pattern */}
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#94a3b8 1.25px, transparent 1.25px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                  {/* ZONE #1 ON CANVAS */}
                  <div
                    className={`${
                      isZone2BranchedInMotion ? "lg:col-span-7" : "lg:col-span-12"
                    } rounded-2xl border-2 border-dashed transition-all duration-500 bg-white/95 p-4 shadow-md ${
                      isZone1LinkedInMotion
                        ? "border-rose-600 ring-4 ring-rose-500/20"
                        : "border-sky-600"
                    }`}
                  >
                    {/* Zone #1 Top Header */}
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-1.5 mb-3 border ${
                        isZone1LinkedInMotion
                          ? "bg-rose-50 border-rose-300 text-rose-900"
                          : "bg-sky-50 border-sky-300 text-sky-900"
                      }`}
                    >
                      <span className="font-mono text-[11px] font-black">
                        {isZone1LinkedInMotion ? "🎯 " : ""}ZONE #1 • SLIDING WINDOW MAX SUBARRAY SUM (K=3)
                      </span>
                      <span className="rounded bg-emerald-100 border border-emerald-500 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                        LIVE AI: gemini-3.5-flash-lite
                      </span>
                    </div>

                    {/* Step Header & Math Invariant */}
                    <div className="rounded-xl border border-sky-300 bg-sky-50/70 px-3 py-2 mb-3 font-mono">
                      <div className="text-xs font-black text-sky-800">
                        Step {motionStep.step}/4: {motionStep.title}
                      </div>
                      <div className="text-[11px] text-slate-700 mt-0.5">
                        Invariant: {motionStep.invariant}
                      </div>
                    </div>

                    {/* Raw Input Banner */}
                    <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 mb-3 font-mono text-[11px] font-bold text-slate-700">
                      Input: arr = [2, 1, 5, 1, 3, 2], k = 3
                    </div>

                    {/* Array Cells + Dashed Window + Pointer Markers + Floating AI Laser Cursor */}
                    <div className="py-3 px-2 flex items-center justify-center gap-2 sm:gap-3 relative">
                      {demoArray.map((val, idx) => {
                        const inWin = idx >= motionStep.winStart && idx <= motionStep.winEnd;
                        const isPeak = motionStep.step === 3 && inWin;
                        const isL = idx === motionStep.winStart;
                        const isR = idx === motionStep.winEnd;
                        return (
                          <div key={idx} className="flex flex-col items-center relative">
                            <span className="font-mono text-[10px] text-slate-500 mb-1">
                              [{idx}]
                            </span>
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-mono font-black text-sm sm:text-base transition-all duration-300 ${
                                isPeak
                                  ? "bg-emerald-100 border-2 border-emerald-600 text-emerald-950 ring-2 ring-amber-500 shadow-md scale-105"
                                  : inWin
                                  ? "bg-amber-100 border-2 border-amber-600 text-amber-950 ring-2 ring-amber-400/60 shadow-sm scale-105"
                                  : "bg-slate-50 border border-slate-300 text-slate-700"
                              }`}
                            >
                              {val}
                            </div>
                            <div className="h-6 mt-1 flex items-center justify-center">
                              {isL && (
                                <span className="rounded bg-sky-100 border border-sky-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-sky-900">
                                  ↑ L={idx}
                                </span>
                              )}
                              {isR && (
                                <span className="rounded bg-emerald-100 border border-emerald-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-900">
                                  ↑ R={idx}
                                </span>
                              )}
                            </div>

                            {!isZone2BranchedInMotion && idx === motionStep.cursorTargetIdx && (
                              <div className="absolute -top-3 -right-4 z-20 flex items-center gap-1 rounded-full bg-rose-600 text-white px-2 py-0.5 font-mono text-[9px] font-bold shadow-lg ring-2 ring-white">
                                <span className="size-1.5 rounded-full bg-white animate-ping" />
                                <span>🤖 AI Co-Teacher</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* State Tracker Cards */}
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200 font-mono">
                      <div className="rounded-lg border border-sky-400 bg-sky-50 px-2.5 py-1.5">
                        <div className="text-[9px] font-bold text-sky-700">window [L..R]</div>
                        <div className="text-xs font-black text-slate-900">
                          [{motionStep.winStart} .. {motionStep.winEnd}]
                        </div>
                      </div>
                      <div className="rounded-lg border border-amber-500 bg-amber-50 px-2.5 py-1.5">
                        <div className="text-[9px] font-bold text-amber-800">windowSum</div>
                        <div className="text-xs font-black text-slate-900">
                          {motionStep.windowSum}
                        </div>
                      </div>
                      <div className="rounded-lg border border-emerald-600 bg-emerald-50 px-2.5 py-1.5">
                        <div className="text-[9px] font-bold text-emerald-800">maxSum</div>
                        <div className="text-xs font-black text-emerald-900">
                          {motionStep.maxSum} {motionStep.step === 3 ? "🎯" : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ZONE #2 BRANCHED ON CANVAS (Appears in Scene 4) */}
                  {isZone2BranchedInMotion && (
                    <div className="lg:col-span-5 rounded-2xl border-2 border-dashed border-amber-600 bg-white/95 p-4 shadow-lg relative animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-amber-50 border border-amber-300 px-3 py-1.5 mb-2.5">
                          <span className="font-mono text-[11px] font-black text-amber-900">
                            🌿 ZONE #2 • BRANCHED FROM ZONE #1
                          </span>
                          <span className="rounded bg-emerald-100 border border-emerald-500 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-800">
                            LIVE AI: gemini-3.5-flash
                          </span>
                        </div>

                        <div className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 mb-3 font-mono text-[10px] font-bold text-rose-800">
                          ↳ Linked Context: Zone #1 • arr = [2, 1, 5, 1, 3, 2], Peak = 9
                        </div>

                        <div className="space-y-2 font-mono text-[11px]">
                          <div className="rounded-xl border border-red-300 bg-red-50 p-2.5 text-red-900">
                            <div className="font-black">Brute Force O(n·k)</div>
                            <div className="text-[10px] text-red-800 mt-0.5">
                              Re-computes sum of 3 elements every window (18 additions).
                            </div>
                          </div>

                          <div className="rounded-xl border border-emerald-400 bg-emerald-50 p-2.5 text-emerald-950 relative">
                            <div className="font-black">Optimal Sliding Window O(n)</div>
                            <div className="text-[10px] text-emerald-800 mt-0.5">
                              Step 3 Delta: <code className="font-bold">prev(7) - arr[1](1) + arr[4](3) = 9 🎯</code>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[9px] font-bold shadow-sm">
                              <span className="size-1.5 rounded-full bg-white animate-ping" />
                              <span>🤖 AI Co-Teacher Active</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200 font-mono text-[10px] font-bold text-emerald-800 flex items-center justify-between">
                        <span>✓ Dashed Branch Connector Drawn</span>
                        <span>Zero Overlap</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Kinetic Caption HUD */}
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-[#140910]/95 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="rounded bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {currentChapter.code}
                  </span>
                  <span className="font-bold text-foreground text-xs sm:text-sm">
                    {currentChapter.title}
                  </span>
                  <span className="hidden xl:inline text-muted-foreground text-xs font-sans">
                    — {currentChapter.subtitle}
                  </span>
                </div>

                {/* Play/Pause & Restart Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground">
                    {elapsedSec.toFixed(1)}s / {TOTAL_DURATION.toFixed(1)}s
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-bold hover:opacity-90 transition-opacity"
                  >
                    {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
                    <span>{isPlaying ? "Pause" : "Play"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setElapsedSec(0);
                      setIsPlaying(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/60 px-2 py-1 text-[11px] font-bold text-foreground hover:bg-secondary"
                    title="Restart Overview Video"
                  >
                    <RotateCcw className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4 Interactive Video Chapter Scrubber Pills */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {MOTION_CHAPTERS.map((ch, idx) => {
            const isActive = idx === currentChapterIdx;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleJumpToChapter(idx)}
                className={`rounded-2xl border p-3 text-left transition-all duration-200 ${
                  isActive
                    ? "border-primary bg-primary/15 shadow-md"
                    : "border-border/60 bg-background/60 hover:border-primary/40 hover:bg-card/80"
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] mb-1">
                  <span className={isActive ? "text-primary font-bold" : "text-muted-foreground"}>
                    {ch.code}
                  </span>
                  <span className="text-muted-foreground">
                    {ch.timeRange[0]}s–{ch.timeRange[1]}s
                  </span>
                </div>
                <div className="font-display text-sm font-black text-foreground">
                  {ch.title}
                </div>
                <div className="text-[11px] text-muted-foreground font-sans mt-0.5 line-clamp-2">
                  {ch.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

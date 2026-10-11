import { AnimatePresence, motion } from "motion/react";
import {
  Sparkles,
  Code2,
  Play,
  Terminal,
  GitBranch,
  Layers,
  Cpu,
  CheckCircle2,
  ArrowDown,
  FastForward,
} from "lucide-react";
import type { HeroIntroPhase } from "./HeroBrandTitle";

interface HeroSlideshowDeckProps {
  phase: HeroIntroPhase;
  progress: number;
  onJumpToProgress: (targetProgress: number) => void;
}

const SLIDE_META = {
  dsa: {
    stepNumber: "01 / 03",
    code: "D · S · A",
    pillarTag: "DATA STRUCTURES & ALGORITHMS",
    badge: "1,500+ CURATED PROBLEMS",
    headline: "Pattern-First Algorithmic Mastery & Socratic AI",
    description:
      "Conquer Blind 75, NeetCode 150, and Striver's SDE Sheets through 18 structured pattern tracks. Bridge the gap from Brute Force to Optimal with Socratic AI hints that guide your intuition without spoiling the solution.",
    highlights: [
      { label: "1,500+ Problems", detail: "Indexed by pattern & difficulty" },
      { label: "Brute → Optimal", detail: "Side-by-side Big-O leaps" },
      { label: "Socratic AI Coach", detail: "Targeted invariant nudges" },
    ],
  },
  viz: {
    stepNumber: "02 / 03",
    code: "V · I · Z",
    pillarTag: "INTERACTIVE VISUALIZER ENGINE",
    badge: "FRAME-BY-FRAME EXECUTION",
    headline: "Watch Computer Science Think in Real Time",
    description:
      "Transform abstract code into living geometry. Scrub forward and backward through every pointer mutation, sliding window state, recursion tree branch, and DP table transition at 60 FPS.",
    highlights: [
      { label: "Time-Travel Scrubber", detail: "Step forward & rewind states" },
      { label: "Live Pointer Physics", detail: "Arrays, trees, graphs & DP" },
      { label: "Memory Call Stack", detail: "Inspect variables at every line" },
    ],
  },
  co: {
    stepNumber: "03 / 03",
    code: "C · O",
    pillarTag: "CLOUD COMPILER & SANDBOX",
    badge: "C++20 · PYTHON · JS · JAVA",
    headline: "Zero-Setup Cloud Compiler & 1-Click GitHub Sync",
    description:
      "Draft pseudocode or compile production C++20 in a split-pane IDE. Benchmark against edge-case test suites with live Big-O complexity verification and push optimal solutions straight to GitHub.",
    highlights: [
      { label: "Sandboxed C++20 IDE", detail: "Instant multi-test execution" },
      { label: "Big-O Verifier", detail: "Automated time & space audit" },
      { label: "1-Click GitHub Push", detail: "Auto-syncs to your portfolio" },
    ],
  },
} as const;

function DsaMiniVisual() {
  return (
    <div className="border border-border bg-secondary/45 p-3.5 sm:p-4 font-mono text-left relative overflow-hidden">
      <div className="flex items-center justify-between text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-3 pb-2 border-b border-border/70">
        <span className="flex items-center gap-1.5 text-primary font-bold">
          <Layers className="size-3.5" />
          COMPLEXITY LEAP PIPELINE
        </span>
        <span className="text-complement font-semibold">PATTERN · TWO POINTERS</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          {
            tier: "BRUTE FORCE",
            bigO: "O(N²)",
            desc: "Nested Scan",
            barWidth: "100%",
            tone: "border-border bg-background/70 text-muted-foreground",
            barTone: "bg-muted-foreground/40",
          },
          {
            tier: "BETTER",
            bigO: "O(N log N)",
            desc: "Sort + Binary",
            barWidth: "52%",
            tone: "border-primary/50 bg-primary/10 text-foreground",
            barTone: "bg-primary",
          },
          {
            tier: "OPTIMAL",
            bigO: "O(N)",
            desc: "Two Pointers",
            barWidth: "18%",
            tone: "border-complement bg-complement/15 text-foreground shadow-[2px_2px_0px_var(--complement)]",
            barTone: "bg-complement",
          },
        ].map((item, idx) => (
          <motion.div
            key={item.tier}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.08, duration: 0.35 }}
            className={`border p-2.5 flex flex-col justify-between ${item.tone}`}
          >
            <div className="text-[9px] tracking-[0.14em] uppercase opacity-80">{item.tier}</div>
            <div className="text-sm sm:text-base font-black tracking-tight my-1">{item.bigO}</div>
            <div className="text-[10px] opacity-75 mb-2">{item.desc}</div>
            <div className="w-full h-1.5 bg-background/80 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: item.barWidth }}
                transition={{ delay: 0.22 + idx * 0.1, duration: 0.5, ease: "easeOut" }}
                className={`h-full ${item.barTone}`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function VizMiniVisual() {
  const cells = [2, 7, 11, 15, 19, 24];
  return (
    <div className="border border-border bg-secondary/45 p-3.5 sm:p-4 font-mono text-left relative overflow-hidden">
      <div className="flex items-center justify-between text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-3 pb-2 border-b border-border/70">
        <span className="flex items-center gap-1.5 text-complement font-bold">
          <Play className="size-3.5 fill-current" />
          LIVE POINTER STATE · STEP 04 / 06
        </span>
        <span className="text-primary font-semibold">TARGET = 26</span>
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:gap-2 my-2">
        {cells.map((val, idx) => {
          const isLeft = idx === 1;
          const isRight = idx === 4;
          const isActive = isLeft || isRight;
          return (
            <motion.div
              key={val}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: isActive ? 1.05 : 1,
                y: isActive ? -3 : 0,
              }}
              transition={{ delay: 0.06 * idx, type: "spring", stiffness: 320, damping: 20 }}
              className={`relative border py-2.5 text-center transition-colors ${
                isLeft
                  ? "border-primary bg-primary/20 text-foreground font-black shadow-[2px_2px_0px_var(--primary)]"
                  : isRight
                  ? "border-complement bg-complement/20 text-foreground font-black shadow-[2px_2px_0px_var(--complement)]"
                  : "border-border/70 bg-background/60 text-muted-foreground"
              }`}
            >
              <div className="text-[9px] opacity-65 mb-0.5">idx {idx}</div>
              <div className="text-sm sm:text-base font-bold">{val}</div>
              {isLeft && (
                <span className="mt-1 inline-block bg-primary text-primary-foreground px-1.5 py-0.2 text-[8px] font-bold tracking-widest">
                  L ↑
                </span>
              )}
              {isRight && (
                <span className="mt-1 inline-block bg-complement text-complement-foreground px-1.5 py-0.2 text-[8px] font-bold tracking-widest">
                  R ↑
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-[0.14em] uppercase pt-2 border-t border-border/60">
        <span className="text-foreground">
          INVARIANT: <strong className="text-primary">arr[1] (7)</strong> +{" "}
          <strong className="text-complement">arr[4] (19)</strong> == <strong>26 ✓</strong>
        </span>
        <span className="bg-complement/20 border border-complement px-2 py-0.5 text-foreground font-bold">
          MATCH LOCKED
        </span>
      </div>
    </div>
  );
}

function CoMiniVisual() {
  return (
    <div className="border border-border bg-secondary/45 p-3.5 sm:p-4 font-mono text-left relative overflow-hidden">
      <div className="flex items-center justify-between text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-2.5 pb-2 border-b border-border/70">
        <span className="flex items-center gap-1.5 text-primary font-bold">
          <Terminal className="size-3.5" />
          SANDBOX RUNNER · G++ C++20
        </span>
        <span className="flex items-center gap-1 text-complement font-semibold">
          <GitBranch className="size-3" />
          GITHUB AUTO-SYNC
        </span>
      </div>

      <div className="space-y-1.5 text-[11px] sm:text-xs bg-background/80 border border-border/80 p-3">
        <div className="text-muted-foreground">
          <span className="text-primary font-bold">$</span> g++ -std=c++20 -O2 two_sum.cpp -o runner &amp;&amp; ./runner
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <CheckCircle2 className="size-3.5 text-primary shrink-0" />
          <span>
            <strong>64 / 64</strong> edge-case test suites passed ·{" "}
            <span className="text-primary font-bold">Runtime: 0 ms (100%)</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <Cpu className="size-3.5 text-complement shrink-0" />
          <span>
            Complexity Audit: <strong>Time O(N)</strong> · <strong>Space O(1)</strong> — Optimal Verdict
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-border/50">
          <Code2 className="size-3.5 text-primary shrink-0" />
          <span>
            Committed <code className="text-foreground">two-sum/solution.cpp</code> &rarr;{" "}
            <span className="text-complement font-semibold underline decoration-dashed">
              LeetCode-Solutions/main
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function HeroSlideshowDeck({
  phase,
  progress,
  onJumpToProgress,
}: HeroSlideshowDeckProps) {
  const activeSlideKey =
    phase === "dsa" ? "dsa" : phase === "viz" ? "viz" : phase === "co" ? "co" : null;
  const activeSlide = activeSlideKey ? SLIDE_META[activeSlideKey] : null;

  const isBlankPhase =
    phase === "blank-0" || phase === "blank-1" || phase === "blank-2" || phase === "blank-3";

  if (phase === "complete") {
    return null;
  }

  return (
    <div
      data-allow-guest="true"
      className="relative w-full max-w-3xl mx-auto px-2 sm:px-4 mt-4 sm:mt-6 select-none z-20"
    >
      {/* Dynamic Slideshow Card Area */}
      <div className="min-h-[290px] sm:min-h-[305px] flex flex-col items-center justify-start">
        <AnimatePresence mode="wait">
          {phase === "blank-0" && (
            <motion.div
              key="blank-intro-prompt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col items-center justify-center text-center py-12 space-y-4"
            >
              <div className="inline-flex items-center gap-2 border border-dashed border-primary/60 bg-secondary/50 px-4 py-1.5 font-mono text-[11px] tracking-[0.24em] uppercase text-muted-foreground">
                <Sparkles className="size-3.5 text-complement animate-pulse" />
                <span>SCROLL DOWN TO INITIALIZE ENGINE</span>
              </div>
              <motion.div
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="size-9 border border-border bg-card flex items-center justify-center text-primary shadow-[3px_3px_0px_var(--complement)]"
              >
                <ArrowDown className="size-4" />
              </motion.div>
            </motion.div>
          )}

          {activeSlide && activeSlideKey && (
            <motion.div
              key={`slide-${activeSlideKey}`}
              initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -18, scale: 0.97, filter: "blur(6px)" }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="w-full border-2 border-foreground/85 bg-card/95 backdrop-blur-md p-4 sm:p-6 shadow-[6px_6px_0px_var(--complement)] text-left"
            >
              {/* Slide Top Metadata Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3.5 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <span className="bg-primary text-primary-foreground font-mono text-[10px] sm:text-[11px] font-black tracking-[0.2em] px-2.5 py-1 uppercase">
                    SLIDE {activeSlide.stepNumber}
                  </span>
                  <span className="font-mono text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-complement">
                    {activeSlide.code}
                  </span>
                  <span className="hidden sm:inline font-mono text-[11px] tracking-[0.16em] uppercase text-muted-foreground">
                    · {activeSlide.pillarTag}
                  </span>
                </div>

                <span className="border border-dashed border-complement bg-complement/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase text-foreground">
                  {activeSlide.badge}
                </span>
              </div>

              {/* Slide Headline & Explanation Copy */}
              <h2 className="text-lg sm:text-2xl font-sans font-extrabold tracking-tight text-foreground mb-2">
                {activeSlide.headline}
              </h2>
              <p className="text-xs sm:text-sm md:text-[15px] text-muted-foreground leading-relaxed mb-4">
                {activeSlide.description}
              </p>

              {/* Pillar-Specific Interactive Mini-Showcase */}
              {activeSlideKey === "dsa" && <DsaMiniVisual />}
              {activeSlideKey === "viz" && <VizMiniVisual />}
              {activeSlideKey === "co" && <CoMiniVisual />}

              {/* 3 Pillar Highlights Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-border/80">
                {activeSlide.highlights.map((h) => (
                  <div
                    key={h.label}
                    className="flex flex-col border border-border/70 bg-background/60 px-3 py-2"
                  >
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                      {h.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">{h.detail}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "full-title" && (
            <motion.div
              key="slide-full-title"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
              className="flex flex-col items-center text-center py-6 space-y-3"
            >
              <div className="inline-flex items-center gap-2.5 border border-foreground/80 bg-card px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.22em] text-foreground shadow-[4px_4px_0px_var(--complement)]">
                <span className="size-2 rounded-full bg-primary animate-ping" />
                <span>ALL SYSTEMS SYNCHRONIZED · DSAVIZCO LIVE</span>
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Spawning full algorithmic workspace &amp; navigation...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Scroll Choreography Progress & Stage Jumper HUD */}
      <div className="mt-4 flex flex-col items-center gap-2.5">
        {/* Continuous Scroll Progress Bar */}
        <div className="w-full max-w-md h-1 bg-border/70 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-complement to-primary"
            style={{ width: `${Math.min(100, Math.max(2, progress * 112))}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {[
            { label: "01 · DSA", target: 0.14, active: phase === "dsa" },
            { label: "02 · VIZ", target: 0.37, active: phase === "viz" },
            { label: "03 · CO", target: 0.6, active: phase === "co" },
            { label: "DSAVIZCO", target: 0.8, active: phase === "full-title" },
          ].map((pill) => (
            <button
              key={pill.label}
              type="button"
              data-allow-guest="true"
              onClick={() => onJumpToProgress(pill.target)}
              className={`px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase border transition-all cursor-pointer ${
                pill.active
                  ? "border-foreground bg-primary text-primary-foreground font-bold shadow-[2px_2px_0px_var(--complement)] -translate-y-0.5"
                  : "border-border bg-card/80 text-muted-foreground hover:text-foreground hover:border-foreground/50"
              }`}
            >
              {pill.label}
            </button>
          ))}

          <button
            type="button"
            data-allow-guest="true"
            onClick={() => onJumpToProgress(0.95)}
            className="inline-flex items-center gap-1 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase border border-dashed border-complement bg-secondary/80 text-foreground hover:bg-complement hover:text-complement-foreground transition-colors cursor-pointer"
          >
            <span>SKIP INTRO</span>
            <FastForward className="size-3" />
          </button>
        </div>

        {isBlankPhase && phase !== "blank-0" && (
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/70 animate-pulse">
            KEEP SCROLLING &darr;
          </span>
        )}
      </div>
    </div>
  );
}

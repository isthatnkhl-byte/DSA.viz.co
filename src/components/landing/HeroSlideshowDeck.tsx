import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, FastForward, Sparkles } from "lucide-react";
import type { HeroIntroPhase } from "./HeroBrandTitle";

interface HeroSlideshowDeckProps {
  phase: HeroIntroPhase;
  progress: number;
  onJumpToProgress: (targetProgress: number) => void;
}

const ONE_LINER_HIGHLIGHTS = {
  dsa: {
    step: "01 / 03",
    code: "DSA",
    label: "ALGORITHMS",
    textPrefix: "1,500+ curated problems & pattern sheets with ",
    textAccent: "Socratic AI intuition",
    textSuffix: ".",
  },
  viz: {
    step: "02 / 03",
    code: "VIZ",
    label: "VISUALIZER",
    textPrefix: "Real-time 60 FPS step-by-step ",
    textAccent: "pointer, recursion & memory",
    textSuffix: " state visualizer.",
  },
  co: {
    step: "03 / 03",
    code: "CO",
    label: "COMPILER",
    textPrefix: "Zero-setup C++20 & multi-language cloud sandbox with ",
    textAccent: "1-click GitHub sync",
    textSuffix: ".",
  },
  "full-title": {
    step: "READY",
    code: "DSAVIZCO",
    label: "UNIFIED ENGINE",
    textPrefix: "Algorithms, Visualizer & Cloud Compiler — ",
    textAccent: "synchronized in one workspace",
    textSuffix: ".",
  },
} as const;

export function HeroSlideshowDeck({
  phase,
  progress,
  onJumpToProgress,
}: HeroSlideshowDeckProps) {
  const isComplete = phase === "complete";
  const activeKey =
    phase === "dsa" || phase === "viz" || phase === "co" || phase === "full-title"
      ? phase
      : null;
  const activeHighlight = activeKey ? ONE_LINER_HIGHLIGHTS[activeKey] : null;

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          key="hero-intro-oneliner-deck"
          data-allow-guest="true"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-3xl mx-auto px-3 sm:px-6 mt-5 sm:mt-7 select-none z-30"
        >
          {/* Fixed-height slot so 1-liners transition in place with zero layout shift */}
          <div className="min-h-[84px] sm:min-h-[92px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {phase === "blank-0" && (
                <motion.div
                  key="intro-blank-0"
                  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-flex items-center gap-3 border border-foreground/75 bg-card/95 backdrop-blur-md px-5 py-3 shadow-[4px_4px_0px_var(--complement)]"
                >
                  <Sparkles className="size-4 text-complement animate-pulse shrink-0" />
                  <span className="font-mono text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-foreground">
                    SCROLL TO ILLUMINATE{" "}
                    <span className="text-primary">DSAVIZCO</span>
                  </span>
                  <motion.span
                    animate={{ y: [0, 4, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex items-center justify-center size-6 border border-border bg-secondary text-primary shrink-0"
                  >
                    <ArrowDown className="size-3.5" />
                  </motion.span>
                </motion.div>
              )}

              {activeHighlight && activeKey && (
                <motion.div
                  key={`intro-oneliner-${activeKey}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, scale: 0.98, filter: "blur(5px)" }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full border-2 border-foreground/85 bg-card/95 backdrop-blur-md px-4 py-3.5 sm:px-6 sm:py-4 shadow-[5px_5px_0px_var(--complement)] flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 text-center sm:text-left"
                >
                  {/* High-Contrast Pillar Tag */}
                  <div className="inline-flex items-center gap-2 shrink-0">
                    <span className="bg-primary text-primary-foreground font-mono text-[11px] sm:text-xs font-black tracking-[0.2em] px-2.5 py-1 uppercase shadow-[2px_2px_0px_var(--complement)]">
                      {activeHighlight.code}
                    </span>
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.16em] uppercase text-complement">
                      {activeHighlight.label}
                    </span>
                    <span
                      className="hidden sm:inline-block h-4 w-px bg-border mx-0.5"
                      aria-hidden="true"
                    />
                  </div>

                  {/* Crisp 1-Liner Highlight Text */}
                  <p className="text-sm sm:text-base md:text-lg font-sans font-bold text-foreground tracking-tight leading-snug">
                    {activeHighlight.textPrefix}
                    <span className="text-primary underline decoration-complement decoration-dashed underline-offset-4">
                      {activeHighlight.textAccent}
                    </span>
                    {activeHighlight.textSuffix}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Minimalist Progress Line + Stage Jump & Skip Controls */}
          <div className="mt-3 flex flex-col items-center gap-2">
            <div className="w-full max-w-sm h-1 bg-border/75 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-complement to-primary"
                style={{ width: `${Math.min(100, Math.max(3, progress * 108))}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { label: "DSA", target: 0.14, active: phase === "dsa" },
                { label: "VIZ", target: 0.39, active: phase === "viz" },
                { label: "CO", target: 0.64, active: phase === "co" },
                { label: "DSAVIZCO", target: 0.85, active: phase === "full-title" },
              ].map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  data-allow-guest="true"
                  onClick={() => onJumpToProgress(pill.target)}
                  className={`px-2.5 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase border transition-all cursor-pointer ${
                    pill.active
                      ? "border-foreground bg-primary text-primary-foreground font-bold shadow-[2px_2px_0px_var(--complement)]"
                      : "border-border/80 bg-card/85 text-muted-foreground hover:text-foreground hover:border-foreground/50"
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              <button
                type="button"
                data-allow-guest="true"
                onClick={() => onJumpToProgress(1)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase border border-dashed border-complement bg-secondary/85 text-foreground hover:bg-complement hover:text-complement-foreground transition-colors cursor-pointer"
              >
                <span>SKIP</span>
                <FastForward className="size-2.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { AnimatePresence, motion } from "motion/react";
import type { HeroIntroPhase } from "./HeroBrandTitle";

interface HeroSlideshowDeckProps {
  phase: HeroIntroPhase;
  progress?: number;
  onJumpToProgress?: (targetProgress: number) => void;
}

const ONE_LINER_HIGHLIGHTS = {
  dsa: {
    code: "DSA",
    label: "ALGORITHMS",
    textPrefix: "1,500+ curated problems & pattern sheets with ",
    textAccent: "Socratic AI intuition",
    textSuffix: ".",
  },
  viz: {
    code: "VIZ",
    label: "VISUALIZER",
    textPrefix: "Real-time 60 FPS step-by-step ",
    textAccent: "pointer, recursion & memory",
    textSuffix: " state visualizer.",
  },
  co: {
    code: "CO",
    label: "COMPILER",
    textPrefix: "Zero-setup C++20 & multi-language cloud sandbox with ",
    textAccent: "1-click GitHub sync",
    textSuffix: ".",
  },
} as const;

export function HeroSlideshowDeck({ phase }: HeroSlideshowDeckProps) {
  const activeKey =
    phase === "dsa" || phase === "viz" || phase === "co" ? phase : null;
  const activeHighlight = activeKey ? ONE_LINER_HIGHLIGHTS[activeKey] : null;

  return (
    <AnimatePresence>
      {activeHighlight && activeKey && (
        <motion.div
          key="hero-intro-oneliner-deck"
          data-allow-guest="true"
          initial={{ opacity: 0, y: 8, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(5px)" }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-2xl mx-auto px-3 sm:px-4 mt-2.5 sm:mt-3.5 select-none z-30"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`intro-oneliner-${activeKey}`}
              initial={{ opacity: 0, y: 10, scale: 0.98, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full border-2 border-foreground/85 bg-card/95 backdrop-blur-md px-4 py-2.5 sm:px-5 sm:py-3 shadow-[4px_4px_0px_var(--complement)] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3.5 text-center sm:text-left"
            >
              {/* High-Contrast Pillar Tag */}
              <div className="inline-flex items-center gap-2 shrink-0">
                <span className="bg-primary text-primary-foreground font-mono text-[11px] font-black tracking-[0.2em] px-2 py-0.5 uppercase shadow-[2px_2px_0px_var(--complement)]">
                  {activeHighlight.code}
                </span>
                <span className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-complement">
                  {activeHighlight.label}
                </span>
                <span
                  className="hidden sm:inline-block h-3.5 w-px bg-border mx-0.5"
                  aria-hidden="true"
                />
              </div>

              {/* Crisp 1-Liner Highlight Text */}
              <p className="text-sm sm:text-base font-sans font-bold text-foreground tracking-tight leading-snug">
                {activeHighlight.textPrefix}
                <span className="text-primary underline decoration-complement decoration-dashed underline-offset-4">
                  {activeHighlight.textAccent}
                </span>
                {activeHighlight.textSuffix}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

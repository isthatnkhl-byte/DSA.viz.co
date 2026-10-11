import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";
import { HeroBrandTitle, type HeroIntroPhase } from "./HeroBrandTitle";
import { HeroSlideshowDeck } from "./HeroSlideshowDeck";
import { useThemeColor } from "@/hooks/useThemeColor";
import { THEME_OPTIONS, type ThemeColor } from "@/lib/theme";

function RegistrationBullseye({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-5 text-complement transition-colors duration-300 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5.5" />
      <line x1="12" y1="1" x2="12" y2="23" />
      <line x1="1" y1="12" x2="23" y2="12" />
    </svg>
  );
}

/**
 * Interactive Print-Tech calibration swatches mapped directly to site themes.
 * Clicking any block live-switches the entire application's Primary + Complementary theme.
 */
const CALIBRATION_SWATCHES: Array<{
  id: ThemeColor;
  shortCode: string;
  swatchBg: string;
}> = [
  { id: "cyan", shortCode: "C", swatchBg: "oklch(0.64 0.18 208)" },
  { id: "rose", shortCode: "M", swatchBg: "oklch(0.62 0.24 348)" },
  { id: "solar", shortCode: "Y", swatchBg: "oklch(0.78 0.19 75)" },
  { id: "obsidian", shortCode: "K", swatchBg: "oklch(0.22 0.02 260)" },
  { id: "amber", shortCode: "OR", swatchBg: "oklch(0.63 0.21 38)" },
  { id: "purple", shortCode: "VI", swatchBg: "oklch(0.62 0.24 292)" },
  { id: "emerald", shortCode: "EM", swatchBg: "oklch(0.62 0.19 158)" },
  { id: "crimson", shortCode: "CR", swatchBg: "oklch(0.60 0.24 24)" },
  { id: "blue", shortCode: "BL", swatchBg: "oklch(0.58 0.22 255)" },
  { id: "cyberpunk", shortCode: "CY", swatchBg: "oklch(0.64 0.27 328)" },
  { id: "sage", shortCode: "SG", swatchBg: "oklch(0.58 0.15 162)" },
  { id: "aether", shortCode: "AE", swatchBg: "oklch(0.60 0.22 278)" },
];

interface LandingHeroProps {
  introPhase?: HeroIntroPhase;
  introProgress?: number;
  onJumpToIntroProgress?: (targetProgress: number) => void;
}

export function LandingHero({
  introPhase = "complete",
  introProgress = 1,
  onJumpToIntroProgress = () => {},
}: LandingHeroProps) {
  const { theme, setTheme } = useThemeColor();
  const activeThemeOption =
    THEME_OPTIONS.find((t) => t.id === theme) ?? THEME_OPTIONS[0]!;

  const isComplete = introPhase === "complete";
  const brandVerticalOffset = isComplete
    ? 0
    : introPhase === "full-title"
      ? -75
      : -155;

  return (
    <section className="relative overflow-hidden pt-6 pb-14 md:pt-10 md:pb-20 px-4 sm:px-8 lg:px-12 max-w-6xl mx-auto w-full text-left select-none transition-colors duration-300">
      {/* ================= 1. TOP TECHNICAL HEADER & INTERACTIVE CALIBRATION STRIP ================= */}
      <motion.div
        initial={false}
        animate={{
          opacity: isComplete ? 1 : 0,
          y: isComplete ? 0 : -18,
          filter: isComplete ? "blur(0px)" : "blur(6px)",
        }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full mb-10 sm:mb-14 ${
          isComplete ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Left & Right Trim Crosshair Marks */}
        <div
          className="pointer-events-none hidden sm:block absolute -left-3 top-2 w-8 h-8"
          aria-hidden="true"
        >
          <div className="absolute left-3 top-0 bottom-0 w-px bg-primary/60 transition-colors duration-300" />
          <div className="absolute top-3 left-0 right-0 h-px bg-primary/60 transition-colors duration-300" />
        </div>
        <div
          className="pointer-events-none hidden sm:block absolute -right-3 top-2 w-8 h-8"
          aria-hidden="true"
        >
          <div className="absolute right-3 top-0 bottom-0 w-px bg-complement/60 transition-colors duration-300" />
          <div className="absolute top-3 left-0 right-0 h-px bg-complement/60 transition-colors duration-300" />
        </div>

        {/* Row 1: INDEX 01 · 1,500+ ALGORITHMS + Interactive Color Calibration Bar */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 sm:px-4">
          <span className="font-mono text-[11px] sm:text-[13px] tracking-[0.22em] uppercase text-foreground/90 whitespace-nowrap">
            INDEX 01 &nbsp;·&nbsp; 1,500+ ALGORITHMS
          </span>

          <div className="h-px bg-border flex-1 min-w-[16px] transition-colors duration-300" />

          {/* Interactive 12-Theme Color Calibration Strip */}
          <div className="flex items-center gap-2.5" data-allow-guest="true">
            <div
              role="radiogroup"
              aria-label="Interactive Theme Color Calibration Bar"
              className="inline-flex items-center border border-foreground/80 bg-card p-0.5 shrink-0 shadow-[2px_2px_0px_var(--complement)] transition-all duration-300"
            >
              {CALIBRATION_SWATCHES.map((swatch) => {
                const isSelected = theme === swatch.id;
                const optionMeta = THEME_OPTIONS.find((t) => t.id === swatch.id);
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    role="radio"
                    data-allow-guest="true"
                    aria-checked={isSelected}
                    onClick={() => setTheme(swatch.id)}
                    title={
                      optionMeta
                        ? `${optionMeta.name} (${optionMeta.label})`
                        : swatch.id
                    }
                    aria-label={`Select ${optionMeta?.name ?? swatch.id} color theme`}
                    className={`group relative w-5 sm:w-6 h-4 sm:h-4.5 border-r last:border-r-0 border-foreground/35 transition-all duration-150 cursor-pointer focus:outline-none ${
                      isSelected
                        ? "scale-y-125 z-10 ring-2 ring-foreground shadow-sm"
                        : " opacity-85 hover:opacity-100 hover:scale-y-110"
                    }`}
                    style={{ backgroundColor: swatch.swatchBg }}
                  >
                    {/* Tiny complementary color pip on active or hover */}
                    <span
                      className={`absolute bottom-0.5 right-0.5 size-1.5 rounded-full border border-black/40 transition-opacity ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor:
                          optionMeta?.complementColor ?? "var(--complement)",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border flex-1 min-w-[16px] transition-colors duration-300" />
        </div>

        {/* Row 2: RUNTIME · STEP-BY-STEP VISUALIZER + Active Complementary Pairing Readout */}
        <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-between gap-3 sm:gap-6 sm:px-4">
          <span className="font-mono text-[11px] sm:text-[13px] tracking-[0.22em] uppercase text-muted-foreground whitespace-nowrap">
            RUNTIME &nbsp;·&nbsp; STEP-BY-STEP VISUALIZER
          </span>

          <div className="hidden md:block h-px bg-border flex-1 transition-colors duration-300" />

          {/* Live Theme + Complementary Pairing Indicator Pill */}
          <div className="inline-flex items-center gap-2 border border-border bg-secondary/70 px-2.5 py-1 font-mono text-[10px] sm:text-[11px] tracking-[0.16em] uppercase text-foreground transition-colors duration-300">
            <span
              className="size-2.5 border border-foreground/50 shrink-0 transition-colors duration-300"
              style={{ backgroundColor: "var(--primary)" }}
              title="Primary Theme Color"
            />
            <span className="text-muted-foreground">+</span>
            <span
              className="size-2.5 border border-foreground/50 shrink-0 transition-colors duration-300"
              style={{ backgroundColor: "var(--complement)" }}
              title="Complementary Accent Color"
            />
            <span className="font-semibold text-primary">
              {activeThemeOption.name}
            </span>
            <span className="hidden sm:inline text-muted-foreground">
              · {activeThemeOption.label}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ================= 2. MAIN EDITORIAL HERO COPY ================= */}
      <div className="relative sm:px-4 space-y-6 sm:space-y-8 flex flex-col items-center text-center">
        {/* Main Display Headline — Centered 3-Line Inverted Pyramid (Upper) */}
        <motion.h1
          initial={false}
          animate={{
            opacity: isComplete ? 1 : 0,
            y: isComplete ? 0 : 18,
            filter: isComplete ? "blur(0px)" : "blur(8px)",
          }}
          transition={{ duration: 0.6, delay: isComplete ? 0.05 : 0, ease: [0.16, 1, 0.3, 1] }}
          className={`text-4xl sm:text-6xl md:text-[4.5rem] lg:text-[4.85rem] font-sans font-extrabold tracking-[-0.035em] text-foreground leading-[1.08] max-w-4xl mx-auto flex flex-col items-center text-center transition-colors duration-300 ${
            isComplete ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <span className="block">Master algorithms</span>
          <span className="block mt-1 sm:mt-1.5">
            by{" "}
            <span className="relative inline-block text-primary pb-1 border-b-[4px] sm:border-b-[5px] border-dashed border-complement transition-colors duration-300">
              seeing
            </span>{" "}
            how
          </span>
          <span className="block mt-1 sm:mt-1.5">
            they{" "}
            <span className="text-complement transition-colors duration-300">
              think.
            </span>
          </span>
        </motion.h1>

        {/* Interactive DSAVIZCO + (algorithms • visualizer • compiler) Brand Title (Middle) */}
        <motion.div
          initial={false}
          animate={{
            y: brandVerticalOffset,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 26 }}
          className="relative z-30 w-full flex flex-col items-center"
        >
          <HeroBrandTitle introPhase={introPhase} />

          {/* Slideshow Introduction Deck (Active during blank / DSA / VIZ / CO / full-title intro phases) */}
          {!isComplete && (
            <div className="absolute top-full left-0 right-0 pt-2">
              <HeroSlideshowDeck
                phase={introPhase}
                progress={introProgress}
                onJumpToProgress={onJumpToIntroProgress}
              />
            </div>
          )}
        </motion.div>

        {/* Lead Paragraph (Below DSAVIZCO) */}
        <motion.p
          initial={false}
          animate={{
            opacity: isComplete ? 1 : 0,
            y: isComplete ? 0 : 20,
            filter: isComplete ? "blur(0px)" : "blur(8px)",
          }}
          transition={{ duration: 0.6, delay: isComplete ? 0.12 : 0, ease: [0.16, 1, 0.3, 1] }}
          className={`text-base sm:text-xl md:text-[1.32rem] text-muted-foreground font-sans font-normal leading-[1.6] max-w-3xl mx-auto text-center transition-colors duration-300 ${
            isComplete ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          Step through 1,500+ interview problems frame by frame, inspect live pointer mutations and recursion stacks, and validate your invariants with Socratic AI feedback and sandboxed C++20 execution.
        </motion.p>

        {/* Action Buttons Row (Primary + Complementary Hard-Shadow & Dashed Controls) */}
        <motion.div
          initial={false}
          animate={{
            opacity: isComplete ? 1 : 0,
            y: isComplete ? 0 : 22,
            filter: isComplete ? "blur(0px)" : "blur(8px)",
          }}
          transition={{ duration: 0.6, delay: isComplete ? 0.18 : 0, ease: [0.16, 1, 0.3, 1] }}
          className={`pt-2 sm:pt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-5 ${
            isComplete ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <Link
            to="/problems"
            className="inline-flex items-center justify-center bg-primary hover:opacity-95 text-primary-foreground border border-foreground/80 font-mono text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] px-7 sm:px-9 py-4 rounded-none shadow-[5px_5px_0px_var(--complement)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0px_var(--complement)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0px_var(--complement)] transition-all cursor-pointer"
          >
            <span>EXPLORE PROBLEMS &rarr;</span>
          </Link>

          <Link
            to="/playground"
            className="inline-flex items-center justify-center bg-secondary/85 hover:bg-complement hover:text-complement-foreground text-foreground border border-dashed border-complement font-mono text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] px-7 sm:px-9 py-4 rounded-none transition-all cursor-pointer"
          >
            <span>OPEN VISUALIZER</span>
          </Link>
        </motion.div>

        {/* ================= 3. BOTTOM HALFTONE DITHER FRAME WITH SAME LOGO ================= */}
        <motion.div
          initial={false}
          animate={{
            opacity: isComplete ? 1 : 0,
            y: isComplete ? 0 : 28,
            filter: isComplete ? "blur(0px)" : "blur(8px)",
          }}
          transition={{ duration: 0.65, delay: isComplete ? 0.24 : 0, ease: [0.16, 1, 0.3, 1] }}
          className={`pt-6 sm:pt-8 w-full text-left ${
            isComplete ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="relative border border-border bg-card/90 p-3 sm:p-4 shadow-[0_2px_0_var(--border)] transition-colors duration-300">
            {/* Corner Registration Bullseye Marks */}
            <div className="flex items-center justify-between mb-2">
              <RegistrationBullseye />
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-300">
                STAGE 01 &nbsp;·&nbsp; ALGORITHMIC WORKSPACE &amp; SANDBOX
              </span>
              <RegistrationBullseye />
            </div>

            {/* Halftone Dot-Matrix Strip + Preserved DsavizcoLogo */}
            <div
              className="relative border border-border bg-secondary/65 px-4 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden transition-colors duration-300"
              style={{
                backgroundImage:
                  "radial-gradient(circle, var(--primary) 1.15px, transparent 1.15px), radial-gradient(circle, var(--complement) 0.85px, transparent 0.85px)",
                backgroundSize: "12px 12px, 6px 6px",
                backgroundPosition: "0 0, 3px 3px",
              }}
            >
              {/* Theme-Aware Readability Backing Overlay */}
              <div className="absolute inset-0 bg-card/88 pointer-events-none transition-colors duration-300" />

              {/* Left: Preserved 3D DsavizcoLogo + Brand Identity */}
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 text-primary shrink-0 transition-colors duration-300">
                  <DsavizcoLogo className="w-full h-full" interactive={true} showShadow={true} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-foreground transition-colors duration-300">
                      dsa<span className="text-primary transition-colors duration-300">.viz.co</span>
                    </span>
                    <span className="border border-foreground/70 bg-complement px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-complement-foreground transition-colors duration-300">
                      LIVE ENGINE
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs tracking-[0.12em] uppercase text-muted-foreground transition-colors duration-300">
                    (algorithms • visualizer • compiler) — 1,500+ interactive simulations
                  </p>
                </div>
              </div>

              {/* Right: Quick Jump Links inside Frame */}
              <div className="relative z-10 flex flex-wrap items-center gap-2.5">
                <Link
                  to={"/sheets" as any}
                  className="border border-foreground/60 bg-background/90 hover:bg-primary hover:text-primary-foreground hover:border-primary px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors"
                >
                  DSA SHEETS
                </Link>
                <Link
                  to="/compiler"
                  className="border border-complement/80 bg-background/90 hover:bg-complement hover:text-complement-foreground hover:border-complement px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground transition-colors"
                >
                  C++ SANDBOX
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


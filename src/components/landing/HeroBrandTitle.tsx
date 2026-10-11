import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useThemeColor } from "@/hooks/useThemeColor";

type PillarKey = "algorithms" | "visualizer" | "compiler";

const TITLE_CHARS: Array<{ char: string; pillar: PillarKey }> = [
  { char: "D", pillar: "algorithms" },
  { char: "S", pillar: "algorithms" },
  { char: "A", pillar: "algorithms" },
  { char: "V", pillar: "visualizer" },
  { char: "I", pillar: "visualizer" },
  { char: "Z", pillar: "visualizer" },
  { char: "C", pillar: "compiler" },
  { char: "O", pillar: "compiler" },
];

const PILLARS: Array<{
  key: PillarKey;
  label: string;
  to: "/problems" | "/playground" | "/compiler";
}> = [
  { key: "algorithms", label: "algorithms", to: "/problems" },
  { key: "visualizer", label: "visualizer", to: "/playground" },
  { key: "compiler", label: "compiler", to: "/compiler" },
];

export function HeroBrandTitle() {
  const { theme } = useThemeColor();
  const [hoveredCharIdx, setHoveredCharIdx] = useState<number | null>(null);
  const [hoveredPillar, setHoveredPillar] = useState<PillarKey | null>(null);
  const [waveTrigger, setWaveTrigger] = useState<number>(0);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const activePillar: PillarKey | null =
    hoveredPillar ??
    (hoveredCharIdx !== null ? TITLE_CHARS[hoveredCharIdx]?.pillar ?? null : null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setPointerPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div
      data-theme-active={theme}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredCharIdx(null);
        setHoveredPillar(null);
        setPointerPos(null);
      }}
      className="relative flex flex-col items-center justify-center text-center select-none w-full mx-auto"
    >
      {/* Brand Title Text Container with Pixel Typography & Dynamic Theme Luminescence */}
      <div className="dsavizco-title-container group/brand relative inline-flex flex-col items-center justify-center py-2 px-4 mx-auto">
        {/* Soft ambient glow behind all characters of DSAVIZCO — varies automatically with selected theme */}
        <span
          className="dsavizco-purplish-bg-glow transition-all duration-500 group-hover/brand:scale-105 group-hover/brand:opacity-100"
          aria-hidden="true"
        />

        {/* Interactive cursor-following theme spotlight aura */}
        {pointerPos && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-xl transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${pointerPos.x}% ${pointerPos.y}%, color-mix(in oklch, var(--complement) 55%, transparent) 0%, color-mix(in oklch, var(--primary) 35%, transparent) 45%, transparent 75%)`,
            }}
          />
        )}

        {/* Foreground Pixel Title: DSAVIZCO with interactive per-character & segment physics */}
        <div
          role="button"
          tabIndex={0}
          aria-label="DSAVIZCO — algorithms, visualizer, compiler"
          onClick={() => setWaveTrigger((prev) => prev + 1)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setWaveTrigger((prev) => prev + 1);
            }
          }}
          className="dsavizco-pixel-text text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] tracking-[0.07em] relative z-10 font-black cursor-pointer focus:outline-none"
        >
          {TITLE_CHARS.map((item, idx) => {
            const isDirectHover = hoveredCharIdx === idx;
            const isPillarMatch =
              hoveredPillar !== null && item.pillar === hoveredPillar;
            const isHighlighted = isDirectHover || isPillarMatch;
            const isNeighbor =
              !isHighlighted &&
              hoveredCharIdx !== null &&
              Math.abs(hoveredCharIdx - idx) === 1;

            return (
              <motion.span
                key={`${item.char}-${idx}-${waveTrigger}`}
                onMouseEnter={() => setHoveredCharIdx(idx)}
                data-hovered={isHighlighted ? "true" : undefined}
                data-neighbor={isNeighbor ? "true" : undefined}
                initial={
                  waveTrigger > 0 ? { y: 0, scale: 1 } : false
                }
                animate={{
                  y: isHighlighted
                    ? -6
                    : isNeighbor
                      ? -3
                      : waveTrigger > 0
                        ? [0, -9, 0]
                        : 0,
                  scale: isHighlighted
                    ? 1.07
                    : isNeighbor
                      ? 1.03
                      : waveTrigger > 0
                        ? [1, 1.08, 1]
                        : 1,
                }}
                transition={
                  waveTrigger > 0 && !isHighlighted && !isNeighbor
                    ? {
                        duration: 0.42,
                        delay: idx * 0.04,
                        ease: "easeOut",
                      }
                    : {
                        type: "spring",
                        stiffness: 420,
                        damping: 22,
                      }
                }
                className="dsavizco-pixel-char px-[0.015em]"
              >
                {item.char}
              </motion.span>
            );
          })}
        </div>

        {/* Subtitle in clean monospace font matching reference screenshot, with interactive theme-aware pillar links */}
        <div className="font-mono text-xs sm:text-sm md:text-[15px] tracking-[0.08em] text-primary font-semibold mt-2 sm:mt-2.5 relative z-10 inline-flex flex-wrap items-center justify-center gap-x-2 transition-colors duration-300">
          <span className="text-primary/85 transition-colors duration-300">(</span>
          {PILLARS.map((pillar, index) => {
            const isActive = activePillar === pillar.key;
            return (
              <React.Fragment key={pillar.key}>
                <Link
                  to={pillar.to}
                  onMouseEnter={() => {
                    setHoveredPillar(pillar.key);
                    setHoveredCharIdx(null);
                  }}
                  onMouseLeave={() => setHoveredPillar(null)}
                  className={`relative inline-block transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "text-complement -translate-y-[1px] underline decoration-complement decoration-dashed underline-offset-4"
                      : "text-primary hover:text-complement"
                  }`}
                >
                  {pillar.label}
                </Link>
                {index < PILLARS.length - 1 && (
                  <span
                    className={`transition-colors duration-300 ${
                      isActive ? "text-complement" : "text-primary/90"
                    }`}
                    aria-hidden="true"
                  >
                    &bull;
                  </span>
                )}
              </React.Fragment>
            );
          })}
          <span className="text-primary/85 transition-colors duration-300">)</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useThemeColor } from "@/hooks/useThemeColor";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";

export type PillarKey = "algorithms" | "visualizer" | "compiler";

export type HeroIntroPhase =
  | "hero-initial"
  | "dsa"
  | "viz"
  | "co"
  | "complete";

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

interface HeroBrandTitleProps {
  introPhase?: HeroIntroPhase;
  brandVerticalOffset?: number;
}

interface LogoCoords {
  navX: number;
  navY: number;
  dsaX: number;
  vizX: number;
  coX: number;
}

export function HeroBrandTitle({
  introPhase = "complete",
  brandVerticalOffset = 0,
}: HeroBrandTitleProps) {
  const { theme } = useThemeColor();
  const [hoveredCharIdx, setHoveredCharIdx] = useState<number | null>(null);
  const [hoveredPillar, setHoveredPillar] = useState<PillarKey | null>(null);
  const [waveTrigger, setWaveTrigger] = useState<number>(0);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const logoPerchRef = useRef<HTMLDivElement | null>(null);
  const titleRowRef = useRef<HTMLDivElement | null>(null);
  const charRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const restingPerchCenterRef = useRef<{ x: number; y: number } | null>(null);

  const [coords, setCoords] = useState<LogoCoords>({
    navX: -380,
    navY: -310,
    dsaX: -145,
    vizX: 25,
    coX: 165,
  });

  const [showTravellingLogo, setShowTravellingLogo] = useState<boolean>(false);

  const isSpotlightPhase =
    introPhase === "dsa" || introPhase === "viz" || introPhase === "co";

  // Keep the travelling logo visible throughout the spotlight phases AND during its return flight to the navbar
  useEffect(() => {
    if (isSpotlightPhase) {
      setShowTravellingLogo(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowTravellingLogo(false);
    }, 460);
    return () => window.clearTimeout(timer);
  }, [isSpotlightPhase]);

  useLayoutEffect(() => {
    const measureCoords = () => {
      const titleRow = titleRowRef.current;
      const perchEl = logoPerchRef.current;
      const navEl = document.getElementById("navbar-brand-logo-slot");
      if (!titleRow || !perchEl) return;

      const titleRect = titleRow.getBoundingClientRect();
      const titleCenterX = titleRect.left + titleRect.width / 2;

      const getSegmentCenterX = (startIdx: number, endIdx: number, fallbackRatio: number) => {
        const startEl = charRefs.current[startIdx];
        const endEl = charRefs.current[endIdx];
        if (!startEl || !endEl) return titleRect.width * fallbackRatio;
        const sRect = startEl.getBoundingClientRect();
        const eRect = endEl.getBoundingClientRect();
        return (sRect.left + eRect.right) / 2 - titleCenterX;
      };

      const dsaX = getSegmentCenterX(0, 2, -0.31);
      const vizX = getSegmentCenterX(3, 5, 0.06);
      const coX = getSegmentCenterX(6, 7, 0.37);

      const anchorEl = document.getElementById("hero-brand-resting-anchor");
      const perchRect = perchEl.getBoundingClientRect();
      const restingX = anchorEl
        ? anchorEl.getBoundingClientRect().left + anchorEl.getBoundingClientRect().width / 2
        : perchRect.left + perchRect.width / 2;
      const restingY = anchorEl
        ? anchorEl.getBoundingClientRect().top + perchRect.height / 2
        : perchRect.top - brandVerticalOffset + perchRect.height / 2;

      restingPerchCenterRef.current = { x: restingX, y: restingY };

      let navX = -380;
      let navY = -310;
      if (navEl && restingPerchCenterRef.current) {
        const navRect = navEl.getBoundingClientRect();
        const navCenterX = navRect.left + navRect.width / 2;
        const navCenterY = navRect.top + navRect.height / 2;
        navX = navCenterX - restingPerchCenterRef.current.x;
        navY = navCenterY - restingPerchCenterRef.current.y;
      }

      setCoords({ navX, navY, dsaX, vizX, coX });
    };

    measureCoords();
    window.addEventListener("resize", measureCoords);
    return () => window.removeEventListener("resize", measureCoords);
  }, [brandVerticalOffset, introPhase]);

  const forcedPillar: PillarKey | null =
    introPhase === "dsa"
      ? "algorithms"
      : introPhase === "viz"
        ? "visualizer"
        : introPhase === "co"
          ? "compiler"
          : null;

  const activePillar: PillarKey | null =
    forcedPillar ??
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

  // Segment-specific spotlight position when DSA, VIZ, or CO is individually lit
  const segmentGlowStyle: React.CSSProperties | undefined =
    introPhase === "dsa"
      ? {
          left: "20%",
          width: "38%",
          opacity: 1,
        }
      : introPhase === "viz"
        ? {
            left: "56%",
            width: "38%",
            opacity: 1,
          }
        : introPhase === "co"
          ? {
              left: "85%",
              width: "32%",
              opacity: 1,
            }
          : undefined;

  const logoTarget =
    introPhase === "dsa"
      ? { x: coords.dsaX, y: 4, scale: 1 }
      : introPhase === "viz"
        ? { x: coords.vizX, y: 4, scale: 1 }
        : introPhase === "co"
          ? { x: coords.coX, y: 4, scale: 1 }
          : { x: coords.navX, y: coords.navY, scale: 0.56 };

  return (
    <div
      data-theme-active={theme}
      data-intro-phase={introPhase}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredCharIdx(null);
        setHoveredPillar(null);
        setPointerPos(null);
      }}
      className="relative flex flex-col items-center justify-center text-center select-none w-full mx-auto"
    >
      {/* Travelling Top-Left Navbar Logo Perch (Leaps from top-left navbar -> DSA -> VIZ -> CO -> back to top-left navbar) */}
      <div
        ref={logoPerchRef}
        className="relative w-full h-12 sm:h-14 flex items-center justify-center pointer-events-none z-50"
      >
        <motion.div
          initial={false}
          animate={{
            x: logoTarget.x,
            y: logoTarget.y,
            scale: logoTarget.scale,
            opacity: isSpotlightPhase || showTravellingLogo ? 1 : 0,
          }}
          transition={{
            duration: 0.46,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 text-primary"
        >
          {/* Parabolic Jump Arc Keyframe Wrapper when hopping onto DSA, VIZ, or CO */}
          <motion.div
            key={introPhase}
            initial={
              isSpotlightPhase
                ? { y: 0, scale: 0.95, rotate: -6 }
                : false
            }
            animate={
              isSpotlightPhase
                ? {
                    y: [0, -38, 0],
                    scale: [1, 1.16, 0.94, 1],
                    rotate: [0, 8, -4, 0],
                  }
                : { y: 0, scale: 1, rotate: 0 }
            }
            transition={{
              duration: 0.46,
              ease: "easeOut",
            }}
            className="w-full h-full flex items-center justify-center drop-shadow-[0_6px_18px_color-mix(in_oklch,var(--primary)_55%,transparent)]"
          >
            <DsavizcoLogo
              className="w-full h-full text-primary"
              interactive={isSpotlightPhase}
              showShadow={true}
            />
          </motion.div>

          {/* Subtle glowing landing pad directly under the logo when perched over DSA / VIZ / CO */}
          {isSpotlightPhase && (
            <motion.span
              key={`pad-${introPhase}`}
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.18, duration: 0.28 }}
              className="absolute -bottom-1 w-10 h-1.5 rounded-full bg-complement/70 blur-[2px]"
              aria-hidden="true"
            />
          )}
        </motion.div>
      </div>

      {/* Brand Title Text Container with Pixel Typography & Dynamic Theme Luminescence */}
      <div className="dsavizco-title-container group/brand relative inline-flex flex-col items-center justify-center py-1.5 px-4 mx-auto transition-opacity duration-500">
        {/* Soft ambient glow behind characters of DSAVIZCO — shifts to active pillar during scroll intro */}
        <span
          className="dsavizco-purplish-bg-glow transition-all duration-500 group-hover/brand:scale-105 group-hover/brand:opacity-100"
          style={segmentGlowStyle}
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

        {/* Foreground Pixel Title: DSAVIZCO with interactive per-character & scroll-segment physics */}
        <div
          ref={titleRowRef}
          role="button"
          tabIndex={0}
          data-allow-guest="true"
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
            const isForcedLit = forcedPillar !== null && item.pillar === forcedPillar;
            const isPreviouslyLitAndNowDimmed =
              (introPhase === "viz" && item.pillar === "algorithms") ||
              (introPhase === "co" &&
                (item.pillar === "algorithms" || item.pillar === "visualizer"));

            const isHighlighted = isForcedLit || isDirectHover || isPillarMatch;
            const isNeighbor =
              forcedPillar === null &&
              !isHighlighted &&
              hoveredCharIdx !== null &&
              Math.abs(hoveredCharIdx - idx) === 1;

            const charOpacity =
              forcedPillar === null
                ? 1
                : isForcedLit
                  ? 1
                  : isPreviouslyLitAndNowDimmed
                    ? 0.2
                    : 0;

            const charFilter =
              forcedPillar !== null && !isForcedLit
                ? isPreviouslyLitAndNowDimmed
                  ? "blur(0px) brightness(0.45) saturate(0.35)"
                  : "blur(4px) brightness(0.2)"
                : "blur(0px) brightness(1)";

            return (
              <motion.span
                key={`${item.char}-${idx}-${waveTrigger}`}
                ref={(el) => {
                  charRefs.current[idx] = el;
                }}
                onMouseEnter={() => setHoveredCharIdx(idx)}
                data-hovered={isHighlighted ? "true" : undefined}
                data-neighbor={isNeighbor ? "true" : undefined}
                initial={waveTrigger > 0 ? { y: 0, scale: 1 } : false}
                animate={{
                  opacity: charOpacity,
                  filter: charFilter,
                  y: isHighlighted
                    ? -4
                    : isNeighbor
                      ? -3
                      : waveTrigger > 0
                        ? [0, -9, 0]
                        : 0,
                  scale: isHighlighted
                    ? 1.05
                    : forcedPillar !== null && !isForcedLit
                      ? 0.96
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
                    : isSpotlightPhase
                      ? {
                          duration: 0.36,
                          ease: [0.22, 1, 0.36, 1],
                        }
                      : {
                          type: "spring",
                          stiffness: 340,
                          damping: 26,
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
          <span
            className={`transition-opacity duration-300 ${
              forcedPillar !== null ? "opacity-30" : "opacity-85"
            }`}
          >
            (
          </span>
          {PILLARS.map((pillar, index) => {
            const isActive = activePillar === pillar.key;
            const isPreviouslyLitSubtitle =
              (introPhase === "viz" && pillar.key === "algorithms") ||
              (introPhase === "co" &&
                (pillar.key === "algorithms" || pillar.key === "visualizer"));
            const isHiddenByIntro =
              forcedPillar !== null && !isActive && !isPreviouslyLitSubtitle;

            return (
              <React.Fragment key={pillar.key}>
                <Link
                  to={pillar.to}
                  onMouseEnter={() => {
                    setHoveredPillar(pillar.key);
                    setHoveredCharIdx(null);
                  }}
                  onMouseLeave={() => setHoveredPillar(null)}
                  className={`relative inline-block transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "text-complement -translate-y-[1px] underline decoration-complement decoration-dashed underline-offset-4 font-bold opacity-100"
                      : isPreviouslyLitSubtitle
                        ? "text-primary/25 opacity-100"
                        : isHiddenByIntro
                          ? "opacity-0 pointer-events-none"
                          : "text-primary hover:text-complement opacity-100"
                  }`}
                >
                  {pillar.label}
                </Link>
                {index < PILLARS.length - 1 && (
                  <span
                    className={`transition-all duration-300 ${
                      forcedPillar !== null
                        ? isPreviouslyLitSubtitle
                          ? "text-primary/20 opacity-100"
                          : "opacity-0"
                        : isActive
                          ? "text-complement"
                          : "text-primary/90"
                    }`}
                    aria-hidden="true"
                  >
                    &bull;
                  </span>
                )}
              </React.Fragment>
            );
          })}
          <span
            className={`transition-opacity duration-300 ${
              forcedPillar !== null ? "opacity-30" : "opacity-85"
            }`}
          >
            )
          </span>
        </div>
      </div>
    </div>
  );
}

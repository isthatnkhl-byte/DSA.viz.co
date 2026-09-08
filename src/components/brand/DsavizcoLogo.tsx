import React, { useState, useId } from "react";
import { motion } from "motion/react";

export interface DsavizcoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  interactive?: boolean;
  showGlint?: boolean;
  showParticles?: boolean;
  showShadow?: boolean;
  color?: string;
}

/**
 * Exact Visual Match for the DSA.viz.co Robot Code Mascot `< [ • • ] / >`:
 * - Symmetrical `<` and `>` code chevron arms with hollow interior and smooth rounded joins
 * - Central trapezoid head (wider top, tapering downward to narrower bottom) with rounded corners
 * - Two pure white vertical capsule eyes
 * - Diagonal code slash `/` cutting through behind the head with rounded ends
 * - Natural soft drop shadow and ground contact shadow
 * - Interactive mouse tilt & smooth eye blink when interactive={true}
 * - Crisp, clean, lightweight vector rendering at all sizes
 */
export function DsavizcoLogo({
  className = "w-10 h-10",
  interactive = true,
  showShadow = true,
  color,
}: DsavizcoLogoProps) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -16;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setMouseOffset({ x: 0, y: 0 });
  };

  const strokeColor = color || "currentColor";
  const fillColor = color || "currentColor";

  return (
    <div className="relative w-full h-full flex items-center justify-center [perspective:800px] select-none">
      <svg
        viewBox="0 0 120 106"
        className={`${className} overflow-visible`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Subtle directional drop shadow matching reference screenshot */}
          <filter id={`mascot-shadow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="3" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.22)" />
          </filter>

          {/* Soft ground contact shadow for hero stage */}
          <filter id={`ground-shadow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        {/* Ground Contact Shadow (Hero Stage) */}
        {showShadow && (
          <motion.ellipse
            cx="58"
            cy="98"
            rx="28"
            ry="5"
            fill="rgba(0,0,0,0.18)"
            className="dark:fill-black/45"
            filter={`url(#ground-shadow-${id})`}
            animate={
              interactive
                ? {
                    scaleX: [1, 0.92, 1],
                    opacity: [0.75, 0.55, 0.75],
                  }
                : undefined
            }
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Mascot Body Group (Floating & Tiltable) */}
        <motion.g
          animate={
            interactive
              ? {
                  y: [0, -4, 0],
                  rotateY: mouseOffset.x,
                  rotateX: mouseOffset.y,
                }
              : undefined
          }
          transition={{
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "50% 50%", transformStyle: "preserve-3d" }}
        >
          {/* Main Character with Shadow */}
          <g filter={`url(#mascot-shadow-${id})`}>
            {/* 1. Diagonal Slash / (Behind head) */}
            <line
              x1="76"
              y1="12"
              x2="44"
              y2="94"
              stroke={strokeColor}
              strokeWidth="7.2"
              strokeLinecap="round"
            />

            {/* 2. Left Arm < (Chevron bracket) */}
            <path
              d="M 39 32 L 16 51 L 43 70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="7.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 3. Right Arm > (Chevron bracket) */}
            <path
              d="M 81 32 L 104 51 L 77 70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="7.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 4. Central Trapezoid Head */}
            <path
              d="M 40.5 32 H 79.5 C 81.5 32, 82.8 33.2, 82.5 35.2 L 77.8 67.5 C 77.5 69.2, 76 70, 74.5 70 H 45.5 C 44 70, 42.5 69.2, 42.2 67.5 L 37.5 35.2 C 37.2 33.2, 38.5 32, 40.5 32 Z"
              fill={fillColor}
            />
          </g>

          {/* 5. Emissive White Eyes (Vertical Rounded Capsules) */}
          <motion.g
            animate={interactive ? { scaleY: [1, 1, 0.08, 1, 1] } : undefined}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              repeatDelay: 2.2,
              times: [0, 0.46, 0.49, 0.52, 1],
            }}
            style={{ transformOrigin: "60px 51.5px" }}
          >
            {/* Left Eye */}
            <rect x="51" y="47.5" width="5" height="8" rx="2.5" fill="#ffffff" />
            {/* Right Eye */}
            <rect x="64" y="47.5" width="5" height="8" rx="2.5" fill="#ffffff" />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

import React, { useState, useId } from "react";
import { motion } from "motion/react";

export interface DsavizcoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  interactive?: boolean;
  showGlint?: boolean;
  showParticles?: boolean;
  showShadow?: boolean;
  showGradient?: boolean;
  color?: string;
}

/**
 * Exact Visual Match for the DSA.viz.co Robot Code Mascot `< [ • • ] / >`:
 * - Extended horizontal wingspan stretched across X and -X axes
 * - Symmetrical `<` and `>` code chevron arms with hollow interior and smooth rounded joins
 * - Central trapezoid head (wider top, tapering downward to narrower bottom) with rounded corners
 * - Two pure white vertical capsule eyes
 * - Diagonal code slash `/` cutting through behind the head with rounded ends
 * - Natural soft drop shadow, ground contact shadow, and ambient background gradient
 * - Interactive mouse tilt & smooth eye blink when interactive={true}
 * - Crisp, clean, lightweight vector rendering at all sizes
 */
export function DsavizcoLogo({
  className = "w-10 h-10",
  interactive = true,
  showShadow = true,
  showGradient = false,
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
        viewBox="0 0 144 106"
        className={`${className} overflow-visible`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Radiant Dynamic Theme Background Gradient Aura */}
          <radialGradient id={`mascot-aura-${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--glow-primary, currentColor)" stopOpacity="0.45" />
            <stop offset="45%" stopColor="var(--glow-complement, currentColor)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Directional drop shadow matching reference screenshot */}
          <filter id={`mascot-shadow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="3" dy="4" stdDeviation="3.2" floodColor="rgba(0,0,0,0.22)" />
          </filter>

          {/* Soft ground contact shadow for hero stage */}
          <filter id={`ground-shadow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        {/* Dynamic Background Gradient Aura behind Mascot */}
        {showGradient && (
          <ellipse
            cx="72"
            cy="52"
            rx="70"
            ry="48"
            fill={`url(#mascot-aura-${id})`}
            filter={`url(#ground-shadow-${id})`}
            className="pointer-events-none"
          />
        )}

        {/* Ground Contact Shadow (Hero Stage) */}
        {showShadow && (
          <motion.ellipse
            cx="72"
            cy="98"
            rx="36"
            ry="5.5"
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
          style={{ transformOrigin: "72px 52px", transformStyle: "preserve-3d" }}
        >
          {/* Main Character with Shadow */}
          <g filter={`url(#mascot-shadow-${id})`}>
            {/* 1. Diagonal Slash / (Behind head) */}
            <line
              x1="91"
              y1="10"
              x2="53"
              y2="96"
              stroke={strokeColor}
              strokeWidth="7.5"
              strokeLinecap="round"
            />

            {/* 2. Left Arm < (Chevron bracket - horizontally stretched to -X) */}
            <path
              d="M 47 32 L 10 51 L 53 70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 3. Right Arm > (Chevron bracket - horizontally stretched to +X) */}
            <path
              d="M 97 32 L 134 51 L 91 70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* 4. Central Trapezoid Head */}
            <path
              d="M 48 32 H 96 C 98 32, 99.2 33.2, 98.8 35.2 L 93.8 67.5 C 93.5 69.2, 92 70, 90.5 70 H 53.5 C 52 70, 50.5 69.2, 50.2 67.5 L 45.2 35.2 C 44.8 33.2, 46 32, 48 32 Z"
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
            style={{ transformOrigin: "72px 51.5px" }}
          >
            {/* Left Eye */}
            <rect x="63" y="47.5" width="5.5" height="8.5" rx="2.75" fill="#ffffff" />
            {/* Right Eye */}
            <rect x="75.5" y="47.5" width="5.5" height="8.5" rx="2.75" fill="#ffffff" />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

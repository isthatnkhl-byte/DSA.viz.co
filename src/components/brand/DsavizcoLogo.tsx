import React, { useState, useId, useCallback } from "react";
import { motion } from "motion/react";

export interface DsavizcoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  interactive?: boolean;
  showGlint?: boolean;
  showParticles?: boolean;
  showShadow?: boolean;
}

/**
 * Refined Minimalist DSA.viz.co Brand Mascot Logo
 * Features:
 * - Refined, sleek aerodynamic `<` and `>` code bracket arms with smooth rounded joints and inner neon core
 * - High-tech central monitor chassis with recessed obsidian screen and coding slash `/` accent
 * - Emissive capsule visor eyes that track user cursor and blink naturally
 * - Buttery-smooth continuous harmonic loop motion (floating hover, gentle tilt, bracket breathing)
 * - Minimal, elegant, dark-mode and theme adaptive without flashy glints or visual noise
 */
export function DsavizcoLogo({
  className = "w-10 h-10",
  interactive = true,
  showShadow = true,
}: DsavizcoLogoProps) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
      setMouseOffset({ x, y });
    },
    [interactive]
  );

  const handleMouseLeave = useCallback(() => {
    if (!interactive) return;
    setMouseOffset({ x: 0, y: 0 });
  }, [interactive]);

  return (
    <div className="relative w-full h-full flex items-center justify-center [perspective:800px] select-none">
      <svg
        viewBox="0 0 100 100"
        className={`${className} overflow-visible`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Recessed Obsidian Visor Screen Gradient */}
          <linearGradient id={`screen-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#070a13" />
            <stop offset="50%" stopColor="#0c1020" />
            <stop offset="100%" stopColor="#141a2e" />
          </linearGradient>

          {/* Minimal Chassis Subtle Specular Gradient */}
          <linearGradient id={`chassis-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.75" />
          </linearGradient>

          {/* Emissive Eye Soft Bloom */}
          <filter id={`eye-glow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle Ambient Ground Shadow Filter */}
          <filter id={`shadow-blur-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* Minimal Soft Ambient Breathing Ground Shadow */}
        {showShadow && (
          <motion.ellipse
            cx="50"
            cy="92"
            rx="24"
            ry="4"
            fill="currentColor"
            opacity="0.16"
            filter={`url(#shadow-blur-${id})`}
            animate={{
              scaleX: [1, 0.86, 1],
              opacity: [0.18, 0.08, 0.18],
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "50px 92px" }}
          />
        )}

        {/* 3D Floating Mascot Chassis & Interactive Arms */}
        <motion.g
          animate={{
            y: [0, -5, 0],
            rotate: [-0.8, 0.8, -0.8],
            rotateX: -mouseOffset.y * 14,
            rotateY: mouseOffset.x * 16,
          }}
          transition={{
            y: { duration: 3.8, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 5.4, repeat: Infinity, ease: "easeInOut" },
            rotateX: { type: "spring", stiffness: 180, damping: 20 },
            rotateY: { type: "spring", stiffness: 180, damping: 20 },
          }}
          style={{ transformOrigin: "50% 50%", transformStyle: "preserve-3d" }}
        >
          {/* Subtle Syntax Slash `/` Passing Behind Monitor */}
          <motion.line
            x1="35"
            y1="82"
            x2="65"
            y2="18"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.32"
            animate={{
              opacity: [0.28, 0.44, 0.28],
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* ================= REFINED LEFT CHEVRON ARM `<` ================= */}
          <motion.g
            animate={{
              x: [0, -1.8, 0],
              rotate: [0, -1.2, 0],
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "10px 50px" }}
          >
            {/* Outer Subtle Ambient Halo */}
            <path
              d="M 23 28 L 8 50 L 23 72"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.18"
            />
            {/* Sleek Crisp Left Chevron Arm */}
            <path
              d="M 23 28 L 8 50 L 23 72"
              fill="none"
              stroke="currentColor"
              strokeWidth="4.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Fine Inner Neon Core Line */}
            <path
              d="M 22 30 L 10 50 L 22 70"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
            />
          </motion.g>

          {/* ================= CENTRAL CHASSIS & RECEDED VISOR ================= */}
          <g transform={`translate(${mouseOffset.x * 1.6}, ${mouseOffset.y * 1.6})`}>
            {/* Outer Monitor Chassis Box */}
            <rect
              x="27"
              y="30"
              width="46"
              height="40"
              rx="11"
              fill={`url(#chassis-grad-${id})`}
              stroke="currentColor"
              strokeWidth="1.4"
              strokeOpacity="0.4"
            />

            {/* Recessed Dark Obsidian Screen */}
            <rect
              x="31.5"
              y="34.5"
              width="37"
              height="31"
              rx="7.5"
              fill={`url(#screen-grad-${id})`}
              stroke="#000000"
              strokeWidth="1.2"
            />

            {/* Top Screen Subtle Glare Line */}
            <path
              d="M 34 37 L 66 37"
              stroke="#ffffff"
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity="0.18"
            />

            {/* ================= EMISSIVE VISOR EYES (CURSOR TRACKING + SMOOTH BLINK) ================= */}
            <motion.g
              animate={{
                x: mouseOffset.x * 4.2,
                y: mouseOffset.y * 3.4,
                scaleY: [1, 1, 1, 0.08, 1, 1, 1, 1, 1],
              }}
              transition={{
                x: { type: "spring", stiffness: 220, damping: 22 },
                y: { type: "spring", stiffness: 220, damping: 22 },
                scaleY: {
                  duration: 4.8,
                  repeat: Infinity,
                  times: [0, 0.45, 0.48, 0.51, 0.54, 0.85, 0.87, 0.89, 1],
                  ease: "easeInOut",
                },
              }}
              style={{ transformOrigin: "50px 50px" }}
            >
              {/* Left Eye */}
              <rect
                x="38.5"
                y="43.5"
                width="6.5"
                height="12"
                rx="3.25"
                fill="#ffffff"
                filter={`url(#eye-glow-${id})`}
              />
              <circle cx="40.5" cy="46" r="1.1" fill="#ffffff" />

              {/* Right Eye */}
              <rect
                x="55"
                y="43.5"
                width="6.5"
                height="12"
                rx="3.25"
                fill="#ffffff"
                filter={`url(#eye-glow-${id})`}
              />
              <circle cx="57" cy="46" r="1.1" fill="#ffffff" />
            </motion.g>
          </g>

          {/* ================= REFINED RIGHT CHEVRON ARM `>` ================= */}
          <motion.g
            animate={{
              x: [0, 1.8, 0],
              rotate: [0, 1.2, 0],
            }}
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "90px 50px" }}
          >
            {/* Outer Subtle Ambient Halo */}
            <path
              d="M 77 28 L 92 50 L 77 72"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.18"
            />
            {/* Sleek Crisp Right Chevron Arm */}
            <path
              d="M 77 28 L 92 50 L 77 72"
              fill="none"
              stroke="currentColor"
              strokeWidth="4.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Fine Inner Neon Core Line */}
            <path
              d="M 78 30 L 90 50 L 78 70"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
            />
          </motion.g>
        </motion.g>
      </svg>
    </div>
  );
}

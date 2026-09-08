import React, { useState, useId } from 'react';
import { motion } from 'motion/react';

export interface DsavizcoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  interactive?: boolean;
  showGlint?: boolean;
  showParticles?: boolean;
  showShadow?: boolean;
}

/**
 * 3D High-Definition Minecraft Voxel Mascot Logo with Refined Pixel Geometry
 * Features:
 * - Genuine stepped 3D voxel block geometry for `<` chevron, `>` chevron, `/` diagonal monolith, and cubic head chassis
 * - Refined, balanced 6px-thick pixel chevron arms with authentic block seams, sunlight facets, and ambient occlusion
 * - Minecraft cel-shading edges (sharp dark block boundaries & facet bevels)
 * - Directional sunlight top facets, side shadow facets, and ambient occlusion chin
 * - Recessed obsidian visor screen with solid-white emissive voxel eyes that track cursor and blink smoothly
 * - Continuous buttery-smooth 3D floating harmonic loop motion
 * - Stepped Minecraft pixel ground shadow with breathing scaling
 * - Minimal, clutter-free aesthetic without shiny glint overlays or particle noise
 */
export function DsavizcoLogo({
  className = "w-10 h-10",
  interactive = true,
  showShadow = true,
}: DsavizcoLogoProps) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 24; // -12 to 12 deg
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -24; // -12 to 12 deg
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setMouseOffset({ x: 0, y: 0 });
  };

  // Reusable 3D Voxel Left Chevron `<` Path
  const leftChevronPath =
    "M 24 28 H 18 V 36 H 12 V 44 H 6 V 56 H 12 V 64 H 18 V 72 H 24 V 64 H 18 V 56 H 12 V 44 H 18 V 36 H 24 Z";

  // Reusable 3D Voxel Right Chevron `>` Path
  const rightChevronPath =
    "M 76 28 H 82 V 36 H 88 V 44 H 94 V 56 H 88 V 64 H 82 V 72 H 76 V 64 H 82 V 56 H 88 V 44 H 82 V 36 H 76 Z";

  return (
    <div className="relative w-full h-full flex items-center justify-center [perspective:1000px] select-none">
      <svg
        viewBox="0 0 100 115"
        className={`${className} overflow-visible`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Obsidian Visor Screen Gradient */}
          <linearGradient id={`screen-grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#080a14" />
            <stop offset="60%" stopColor="#0f1322" />
            <stop offset="100%" stopColor="#171b30" />
          </linearGradient>

          {/* Direct Sunlight Roof Highlight Gradient */}
          <linearGradient id={`roof-highlight-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
          </linearGradient>

          {/* Diagonal Slash Top Bevel Specular Gradient */}
          <linearGradient id={`slash-specular-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>

          {/* Emissive Eye Glow Filter */}
          <filter id={`eye-glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ================= STEPPED MINECRAFT PIXEL GROUND SHADOW ================= */}
        {showShadow && (
          <motion.g
            animate={{
              scaleX: [1, 0.88, 1],
              opacity: [0.32, 0.18, 0.32],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "50% 103px" }}
            className="text-foreground/35 dark:text-primary/50"
          >
            {/* Outermost stepped shadow layer */}
            <rect x="22" y="103" width="56" height="3" fill="currentColor" opacity="0.4" />
            {/* Mid stepped shadow layer */}
            <rect x="29" y="101" width="42" height="7" fill="currentColor" opacity="0.6" />
            {/* Core dark contact shadow block */}
            <rect x="36" y="99" width="28" height="11" fill="currentColor" opacity="0.9" />
          </motion.g>
        )}

        {/* ================= 3D FLOATING & TILTING VOXEL MASCOT ================= */}
        <motion.g
          animate={{
            y: [0, -7, 0],
            rotateX: [5 + mouseOffset.y, -5 + mouseOffset.y, 5 + mouseOffset.y],
            rotateY: [-8 + mouseOffset.x, 8 + mouseOffset.x, -8 + mouseOffset.x],
            rotateZ: [-1, 1, -1],
          }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "50% 50%", transformStyle: "preserve-3d" }}
        >
          {/* LAYER 1: BACK AMBIENT OCCLUSION CAST SHADOW (Distant Voxel Depth) */}
          <g transform="translate(3.8, 4.8)" opacity="0.32">
            {/* Back Left Arm `<` */}
            <path
              d={leftChevronPath}
              fill="#000000"
              stroke="#000000"
              strokeWidth="2.2"
              strokeLinejoin="miter"
            />
            {/* Back Right Arm `>` */}
            <path
              d={rightChevronPath}
              fill="#000000"
              stroke="#000000"
              strokeWidth="2.2"
              strokeLinejoin="miter"
            />
            {/* Back Slash `/` */}
            <polygon points="27,91 67,8 74,11 34,94" fill="#000000" stroke="#000000" strokeWidth="2.2" strokeLinejoin="miter" />
            {/* Back Head Chassis */}
            <polygon points="22,33 78,33 74,67 26,67" fill="#000000" stroke="#000000" strokeWidth="2.2" strokeLinejoin="miter" />
          </g>

          {/* LAYER 2: 3D EXTRUDED SIDE DIRECTIONAL SHADOW FACETS (Isometric Depth) */}
          <g transform="translate(1.9, 2.2)" opacity="0.55">
            <path
              d={leftChevronPath}
              fill="currentColor"
              className="text-primary/75"
              stroke="#05050a"
              strokeWidth="1.6"
              strokeLinejoin="miter"
            />
            <path
              d={rightChevronPath}
              fill="currentColor"
              className="text-primary/75"
              stroke="#05050a"
              strokeWidth="1.6"
              strokeLinejoin="miter"
            />
            <polygon points="27,91 67,8 74,11 34,94" fill="currentColor" className="text-primary/75" stroke="#05050a" strokeWidth="1.8" strokeLinejoin="miter" />
            <polygon points="22,33 78,33 74,67 26,67" fill="currentColor" className="text-primary/75" stroke="#05050a" strokeWidth="1.8" strokeLinejoin="miter" />
          </g>

          {/* LAYER 3: MAIN FRONT 3D VOXEL BODY WITH CEL-SHADED EDGES */}
          <g className="relative">
            {/* ================= REFINED 3D VOXEL LEFT CHEVRON ARM `<` ================= */}
            <g>
              {/* Main Body with pixel logic */}
              <path
                d={leftChevronPath}
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.6"
                strokeLinejoin="miter"
              />
              {/* Minecraft Sunlight Top Facets on Left Arm */}
              <path
                d="M 18 28 H 24 V 29.8 H 18 Z M 12 36 H 18 V 37.8 H 12 Z M 6 44 H 12 V 45.8 H 6 Z"
                fill="#ffffff"
                opacity="0.45"
              />
              {/* Internal Block Divider Seams (16x16 Texture lines between voxel cubes) */}
              <line x1="18" y1="36" x2="24" y2="36" stroke="#05050a" strokeWidth="1.2" />
              <line x1="12" y1="44" x2="18" y2="44" stroke="#05050a" strokeWidth="1.2" />
              <line x1="12" y1="56" x2="18" y2="56" stroke="#05050a" strokeWidth="1.2" />
              <line x1="18" y1="64" x2="24" y2="64" stroke="#05050a" strokeWidth="1.2" />
              {/* Bottom Ambient Occlusion Facets */}
              <path
                d="M 6 56 H 12 V 54.2 H 6 Z M 12 64 H 18 V 62.2 H 12 Z M 18 72 H 24 V 70.2 H 18 Z"
                fill="#000000"
                opacity="0.4"
              />
            </g>

            {/* ================= REFINED 3D VOXEL RIGHT CHEVRON ARM `>` ================= */}
            <g>
              {/* Main Body with pixel logic */}
              <path
                d={rightChevronPath}
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.6"
                strokeLinejoin="miter"
              />
              {/* Minecraft Sunlight Top Facets on Right Arm */}
              <path
                d="M 76 28 H 82 V 29.8 H 76 Z M 82 36 H 88 V 37.8 H 82 Z M 88 44 H 94 V 45.8 H 88 Z"
                fill="#ffffff"
                opacity="0.45"
              />
              {/* Internal Block Divider Seams */}
              <line x1="76" y1="36" x2="82" y2="36" stroke="#05050a" strokeWidth="1.2" />
              <line x1="82" y1="44" x2="88" y2="44" stroke="#05050a" strokeWidth="1.2" />
              <line x1="82" y1="56" x2="88" y2="56" stroke="#05050a" strokeWidth="1.2" />
              <line x1="76" y1="64" x2="82" y2="64" stroke="#05050a" strokeWidth="1.2" />
              {/* Bottom Ambient Occlusion Facets */}
              <path
                d="M 88 56 H 94 V 54.2 H 88 Z M 82 64 H 88 V 62.2 H 82 Z M 76 72 H 82 V 70.2 H 76 Z"
                fill="#000000"
                opacity="0.4"
              />
            </g>

            {/* ================= CENTER 3D DIAGONAL MONOLITH SLASH `/` ================= */}
            <g>
              {/* Slash Main Extruded Block */}
              <polygon
                points="27,91 67,8 74,11 34,94"
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.8"
                strokeLinejoin="miter"
              />
              {/* Top-Right Ridge Sunlight Specular Highlight */}
              <polygon
                points="67,8 74,11 72,13 65,10"
                fill="#ffffff"
                opacity="0.75"
              />
              <line
                x1="67"
                y1="8"
                x2="31"
                y2="83"
                stroke={`url(#slash-specular-${id})`}
                strokeWidth="1.6"
              />
              {/* Bottom-Left Directional Ridge Shadow */}
              <line
                x1="74"
                y1="11"
                x2="34"
                y2="94"
                stroke="#000000"
                strokeWidth="1.5"
                opacity="0.45"
              />
              {/* Stepped Voxel Segment Seams across the Slash */}
              <line x1="57" y1="29" x2="64" y2="32" stroke="#05050a" strokeWidth="1.2" opacity="0.6" />
              <line x1="47" y1="50" x2="54" y2="53" stroke="#05050a" strokeWidth="1.2" opacity="0.6" />
              <line x1="37" y1="71" x2="44" y2="74" stroke="#05050a" strokeWidth="1.2" opacity="0.6" />
            </g>

            {/* ================= 3D HEAD CHASSIS (Minecraft Block Monitor) ================= */}
            <g>
              {/* Top Roof Facet (Direct Sunlight Shader) */}
              <polygon
                points="24,30 76,30 78,33 22,33"
                fill={`url(#roof-highlight-${id})`}
                stroke="#05050a"
                strokeWidth="1.4"
                strokeLinejoin="miter"
              />
              {/* Main Chassis Polygon */}
              <polygon
                points="22,33 78,33 74,67 26,67"
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.8"
                strokeLinejoin="miter"
              />

              {/* Recessed Obsidian Visor Screen (Where Eyes Live) */}
              <polygon
                points="27,37 73,37 70,63 30,63"
                fill={`url(#screen-grad-${id})`}
                stroke="#05050a"
                strokeWidth="1.4"
                strokeLinejoin="miter"
              />
              {/* Obsidian Screen Subtle Pixel Gridline Matrix */}
              <line x1="28" y1="43" x2="72" y2="43" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />
              <line x1="29" y1="50" x2="71" y2="50" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />
              <line x1="29" y1="57" x2="71" y2="57" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />
              <line x1="50" y1="37" x2="50" y2="63" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />

              {/* Bottom Chin Ambient Occlusion Shadow */}
              <polygon
                points="26,67 74,67 71,70 29,70"
                fill="#000000"
                opacity="0.65"
                stroke="#05050a"
                strokeWidth="1.4"
                strokeLinejoin="miter"
              />

              {/* Corner Bevel Highlights (1px Minecraft Shader Accents) */}
              <line x1="23" y1="34" x2="77" y2="34" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
            </g>

            {/* ================= SOLID WHITE EMISSIVE VOXEL EYES ================= */}
            <motion.g
              animate={{
                x: mouseOffset.x * 0.16,
                y: mouseOffset.y * 0.16,
                scaleY: [1, 1, 1, 0.08, 1, 1, 1, 1, 1],
              }}
              transition={{
                x: { type: "spring", stiffness: 220, damping: 20 },
                y: { type: "spring", stiffness: 220, damping: 20 },
                scaleY: {
                  duration: 4.8,
                  repeat: Infinity,
                  times: [0, 0.45, 0.48, 0.51, 0.54, 0.85, 0.87, 0.89, 1],
                  ease: "easeInOut",
                },
              }}
              style={{ transformOrigin: "50% 50px" }}
            >
              {/* Left Voxel Eye */}
              <g>
                <rect
                  x="37.5"
                  y="43.5"
                  width="7"
                  height="13"
                  rx="0.5"
                  fill="#ffffff"
                  stroke="#05050a"
                  strokeWidth="0.8"
                  filter={`url(#eye-glow-${id})`}
                />
                {/* Internal pixel specular corner */}
                <rect x="38.5" y="44.5" width="2.5" height="2.5" fill="#ffffff" />
                <rect x="41.5" y="49.5" width="2" height="5" fill="#e0e7ff" opacity="0.4" />
              </g>

              {/* Right Voxel Eye */}
              <g>
                <rect
                  x="55.5"
                  y="43.5"
                  width="7"
                  height="13"
                  rx="0.5"
                  fill="#ffffff"
                  stroke="#05050a"
                  strokeWidth="0.8"
                  filter={`url(#eye-glow-${id})`}
                />
                {/* Internal pixel specular corner */}
                <rect x="56.5" y="44.5" width="2.5" height="2.5" fill="#ffffff" />
                <rect x="59.5" y="49.5" width="2" height="5" fill="#e0e7ff" opacity="0.4" />
              </g>
            </motion.g>
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

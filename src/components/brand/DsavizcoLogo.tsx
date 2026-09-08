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
 * 3D High-Definition Minecraft Voxel Mascot Logo with Edges Shaders
 * Features:
 * - Genuine stepped 3D voxel block geometry for `<` chevron, `>` chevron, `/` diagonal monolith, and cubic head chassis
 * - Minecraft cel-shading edges (sharp dark block boundaries & facet bevels)
 * - Directional sunlight top facets, side shadows, and ambient occlusion chin
 * - Animated enchanted item glint shader sweeping across the block facets
 * - Recessed obsidian screen with solid-white emissive voxel eyes that blink and track cursor
 * - Stepped Minecraft ground shadow
 * - Floating 3D voxel particles (experience orbs, amethyst runes, redstone embers)
 */
export function DsavizcoLogo({
  className = "w-10 h-10",
  interactive = true,
  showGlint = true,
  showParticles = false,
  showShadow = true,
}: DsavizcoLogoProps) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "_");

  // Shared timing schedule for synchronized head, eyes, and movement
  const syncTimes = [0, 0.25, 0.28, 0.48, 0.52, 0.72, 0.75, 0.78, 0.95, 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 24; // -12 to 12 deg
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -24; // -12 to 12 deg
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setMouseOffset({ x: 0, y: 0 });
  };

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
          {/* Minecraft Enchanted Item Specular Glint Shader Gradient */}
          <linearGradient id={`enchant-glint-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
            <stop offset="20%" stopColor="#c084fc" stopOpacity="0.08" />
            <stop offset="42%" stopColor="#38bdf8" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="58%" stopColor="#f472b6" stopOpacity="0.85" />
            <stop offset="78%" stopColor="#818cf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </linearGradient>

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

          {/* Mask for Enchanted Glint Shimmer across entire mascot silhouette */}
          <mask id={`mascot-mask-${id}`}>
            <g fill="#ffffff" stroke="#ffffff" strokeLinejoin="miter">
              {/* Stepped Left Ear `<` */}
              <path d="M 24 31 H 18 V 37 H 12 V 44 H 5 V 54 H 12 V 61 H 18 V 67 H 25 V 61 H 20 V 55 H 14 V 47 H 20 V 37 H 24 Z" />
              {/* Stepped Right Ear `>` */}
              <path d="M 76 31 H 82 V 37 H 88 V 44 H 95 V 54 H 88 V 61 H 82 V 67 H 75 V 61 H 80 V 55 H 86 V 47 H 80 V 37 H 76 Z" />
              {/* Center Diagonal Slash `/` */}
              <polygon points="27,91 67,8 74,11 34,94" />
              {/* Head Block Chassis */}
              <polygon points="22,33 78,33 74,67 26,67" />
            </g>
          </mask>
        </defs>

        {/* ================= STEPPED MINECRAFT PIXEL GROUND SHADOW ================= */}
        {showShadow && (
          <motion.g
            animate={{
              scaleX: [1, 0.85, 1, 0.88, 1],
              opacity: [0.35, 0.18, 0.35, 0.22, 0.35],
            }}
            transition={{
              duration: 5,
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

        {/* ================= FLOATING 3D MINECRAFT VOXEL PARTICLES ================= */}
        {showParticles && (
          <g className="pointer-events-none">
            {/* 1. Amethyst Shard (Top-Left) */}
            <motion.g
              animate={{
                y: [0, -12, 0],
                x: [0, -3, 0],
                rotate: [0, 45, 90],
                opacity: [0.4, 0.95, 0.4],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "11px 24px" }}
            >
              <polygon points="11,20 15,22 11,24 7,22" fill="#e9d5ff" stroke="#05050a" strokeWidth="0.8" />
              <polygon points="7,22 11,24 11,28 7,26" fill="#a855f7" stroke="#05050a" strokeWidth="0.8" />
              <polygon points="11,24 15,22 15,26 11,28" fill="#7e22ce" stroke="#05050a" strokeWidth="0.8" />
            </motion.g>

            {/* 2. Diamond Spark (Top-Right) */}
            <motion.g
              animate={{
                y: [0, -14, 0],
                x: [0, 4, 0],
                rotate: [0, -45, -90],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              style={{ transformOrigin: "89px 22px" }}
            >
              <polygon points="89,18 93,20 89,22 85,20" fill="#bae6fd" stroke="#05050a" strokeWidth="0.8" />
              <polygon points="85,20 89,22 89,26 85,24" fill="#38bdf8" stroke="#05050a" strokeWidth="0.8" />
              <polygon points="89,22 93,20 93,24 89,26" fill="#0284c7" stroke="#05050a" strokeWidth="0.8" />
            </motion.g>

            {/* 3. Emerald Experience Cube (Bottom-Right) */}
            <motion.g
              animate={{
                y: [0, -10, 0],
                rotate: [0, 30, 60],
                opacity: [0.35, 0.9, 0.35],
              }}
              transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              style={{ transformOrigin: "93px 70px" }}
            >
              <polygon points="93,67 96.5,69 93,71 89.5,69" fill="#a7f3d0" stroke="#05050a" strokeWidth="0.8" />
              <polygon points="89.5,69 93,71 93,75 89.5,73" fill="#34d399" stroke="#05050a" strokeWidth="0.8" />
              <polygon points="93,71 96.5,69 96.5,73 93,75" fill="#059669" stroke="#05050a" strokeWidth="0.8" />
            </motion.g>

            {/* 4. Gold Nugget / Ember (Bottom-Left) */}
            <motion.g
              animate={{
                y: [0, -11, 0],
                x: [0, -2, 0],
                rotate: [0, -60, -120],
                opacity: [0.4, 0.85, 0.4],
              }}
              transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 2.1 }}
              style={{ transformOrigin: "9px 66px" }}
            >
              <polygon points="9,63 12,65 9,67 6,65" fill="#fef08a" stroke="#05050a" strokeWidth="0.8" />
              <polygon points="6,65 9,67 9,70 6,68" fill="#facc15" stroke="#05050a" strokeWidth="0.8" />
              <polygon points="9,67 12,65 12,68 9,70" fill="#ca8a04" stroke="#05050a" strokeWidth="0.8" />
            </motion.g>

            {/* 5. Nether Star Spark (Top Apex) */}
            <motion.g
              animate={{
                y: [0, -8, 0],
                scale: [0.8, 1.25, 0.8],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "70px 8px" }}
            >
              <rect x="68.5" y="6.5" width="3.5" height="3.5" fill="#ffffff" stroke="#05050a" strokeWidth="0.7" transform="rotate(45 70.25 8.25)" />
            </motion.g>
          </g>
        )}

        {/* ================= 3D FLOATING & TILTING VOXEL MASCOT ================= */}
        <motion.g
          animate={{
            y: [0, -8, 0, -5, 0],
            rotateX: [7 + mouseOffset.y, -7 + mouseOffset.y, 7 + mouseOffset.y],
            rotateY: [-11 + mouseOffset.x, 11 + mouseOffset.x, -11 + mouseOffset.x],
            rotateZ: [0, -2.5, 2.5, -1, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "50% 50%", transformStyle: "preserve-3d" }}
        >
          {/* LAYER 1: BACK AMBIENT OCCLUSION CAST SHADOW (Distant Voxel Depth) */}
          <g transform="translate(3.8, 4.8)" opacity="0.32">
            {/* Back Left Ear `<` */}
            <path
              d="M 24 31 H 18 V 37 H 12 V 44 H 5 V 54 H 12 V 61 H 18 V 67 H 25 V 61 H 20 V 55 H 14 V 47 H 20 V 37 H 24 Z"
              fill="#000000"
              stroke="#000000"
              strokeWidth="2.2"
              strokeLinejoin="miter"
            />
            {/* Back Right Ear `>` */}
            <path
              d="M 76 31 H 82 V 37 H 88 V 44 H 95 V 54 H 88 V 61 H 82 V 67 H 75 V 61 H 80 V 55 H 86 V 47 H 80 V 37 H 76 Z"
              fill="#000000"
              stroke="#000000"
              strokeWidth="2.2"
              strokeLinejoin="miter"
            />
            {/* Back Slash `/` */}
            <polygon points="27,91 67,8 74,11 34,94" fill="#000000" stroke="#000000" strokeWidth="2.2" strokeLinejoin="miter" />
            {/* Back Head Trapezoid */}
            <polygon points="22,33 78,33 74,67 26,67" fill="#000000" stroke="#000000" strokeWidth="2.2" strokeLinejoin="miter" />
          </g>

          {/* LAYER 2: 3D EXTRUDED SIDE DIRECTIONAL SHADOW FACETS (Isometric Depth) */}
          <g transform="translate(1.9, 2.2)" opacity="0.55">
            <path
              d="M 24 31 H 18 V 37 H 12 V 44 H 5 V 54 H 12 V 61 H 18 V 67 H 25 V 61 H 20 V 55 H 14 V 47 H 20 V 37 H 24 Z"
              fill="currentColor"
              className="text-primary/75"
              stroke="#05050a"
              strokeWidth="1.6"
              strokeLinejoin="miter"
            />
            <path
              d="M 76 31 H 82 V 37 H 88 V 44 H 95 V 54 H 88 V 61 H 82 V 67 H 75 V 61 H 80 V 55 H 86 V 47 H 80 V 37 H 76 Z"
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
            {/* ================= STEPPED VOXEL LEFT EAR `<` ================= */}
            <g>
              {/* Main Body */}
              <path
                d="M 24 31 H 18 V 37 H 12 V 44 H 5 V 54 H 12 V 61 H 18 V 67 H 25 V 61 H 20 V 55 H 14 V 47 H 20 V 37 H 24 Z"
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.6"
                strokeLinejoin="miter"
              />
              {/* Minecraft Sunlight Top Facets on Left Ear */}
              <path
                d="M 18 31 H 24 V 32.5 H 18 Z M 12 37 H 18 V 38.5 H 12 Z M 5 44 H 12 V 45.5 H 5 Z"
                fill="#ffffff"
                opacity="0.45"
              />
              {/* Internal Block Divider Seams (16x16 Texture lines) */}
              <line x1="18" y1="37" x2="20" y2="37" stroke="#05050a" strokeWidth="1.2" />
              <line x1="12" y1="44" x2="14" y2="44" stroke="#05050a" strokeWidth="1.2" />
              <line x1="12" y1="54" x2="14" y2="54" stroke="#05050a" strokeWidth="1.2" />
              <line x1="18" y1="61" x2="20" y2="61" stroke="#05050a" strokeWidth="1.2" />
              {/* Bottom Ambient Occlusion Facets */}
              <path
                d="M 5 54 H 12 V 52.5 H 5 Z M 12 61 H 18 V 59.5 H 12 Z M 18 67 H 25 V 65.5 H 18 Z"
                fill="#000000"
                opacity="0.4"
              />
            </g>

            {/* ================= STEPPED VOXEL RIGHT EAR `>` ================= */}
            <g>
              {/* Main Body */}
              <path
                d="M 76 31 H 82 V 37 H 88 V 44 H 95 V 54 H 88 V 61 H 82 V 67 H 75 V 61 H 80 V 55 H 86 V 47 H 80 V 37 H 76 Z"
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.6"
                strokeLinejoin="miter"
              />
              {/* Minecraft Sunlight Top Facets on Right Ear */}
              <path
                d="M 76 31 H 82 V 32.5 H 76 Z M 82 37 H 88 V 38.5 H 82 Z M 88 44 H 95 V 45.5 H 88 Z"
                fill="#ffffff"
                opacity="0.45"
              />
              {/* Internal Block Divider Seams */}
              <line x1="80" y1="37" x2="82" y2="37" stroke="#05050a" strokeWidth="1.2" />
              <line x1="86" y1="44" x2="88" y2="44" stroke="#05050a" strokeWidth="1.2" />
              <line x1="86" y1="54" x2="88" y2="54" stroke="#05050a" strokeWidth="1.2" />
              <line x1="80" y1="61" x2="82" y2="61" stroke="#05050a" strokeWidth="1.2" />
              {/* Bottom Ambient Occlusion Facets */}
              <path
                d="M 88 54 H 95 V 52.5 H 88 Z M 82 61 H 88 V 59.5 H 82 Z M 75 67 H 82 V 65.5 H 75 Z"
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
                x: [0, 0, -2.5 + mouseOffset.x * 0.08, -2.5 + mouseOffset.x * 0.08, 2.5 + mouseOffset.x * 0.08, 2.5 + mouseOffset.x * 0.08, 0, 0, 0, 0],
                y: [0, 0, mouseOffset.y * 0.08, mouseOffset.y * 0.08, mouseOffset.y * 0.08, mouseOffset.y * 0.08, 0, 0, 0, 0],
                scaleY: [1, 1, 1, 1, 1, 1, 0.08, 1, 1, 1],
              }}
              transition={{
                duration: 7.5,
                repeat: Infinity,
                times: syncTimes,
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

          {/* ================= MINECRAFT ENCHANTED ITEM GLINT SHADER ================= */}
          {showGlint && (
            <g mask={`url(#mascot-mask-${id})`} className="pointer-events-none">
              <motion.rect
                x="-100"
                y="-100"
                width="300"
                height="300"
                fill={`url(#enchant-glint-${id})`}
                style={{ mixBlendMode: "color-dodge" }}
                animate={{
                  x: [-140, 140],
                  y: [-140, 140],
                }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 0.9,
                }}
              />
            </g>
          )}
        </motion.g>
      </svg>
    </div>
  );
}


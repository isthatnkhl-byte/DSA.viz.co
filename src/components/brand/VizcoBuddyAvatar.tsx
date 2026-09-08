import React, { useState, useId } from "react";
import { motion } from "motion/react";

export type VizcoMood = "idle" | "thinking" | "happy" | "waving" | "curious";

interface VizcoBuddyAvatarProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  mood?: VizcoMood;
  showCloudBase?: boolean;
  showHalo?: boolean;
  interactive?: boolean;
}

/**
 * 3D High-Definition Minecraft Voxel Vizco Buddy Avatar with Edges Shaders
 * Features:
 * - Genuine stepped 3D voxel block geometry for `<` chevron, `>` chevron, `/` diagonal monolith, and cubic head chassis
 * - Minecraft cel-shading edges (sharp dark block boundaries & facet bevels)
 * - 3D Stepped Minecraft Voxel Cloud Base with top sunlight facets, front blocks, and shaded underbelly
 * - Expressive Minecraft voxel eye animations per mood (idle, thinking, happy, curious, waving)
 * - Animated enchanted item glint shader sweeping across the buddy facets
 * - Responsive 3D gyroscope tilt
 */
export function VizcoBuddyAvatar({
  className = "",
  size = "md",
  mood = "idle",
  showCloudBase = true,
  showHalo = true,
  interactive = true,
}: VizcoBuddyAvatarProps) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "_");

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-14 h-14",
    lg: "w-20 h-20",
    xl: "w-28 h-28",
  }[size];

  const syncTimes = [0, 0.25, 0.28, 0.48, 0.52, 0.72, 0.75, 0.78, 0.95, 1];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setMouseOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className={`relative flex items-center justify-center [perspective:1000px] select-none ${className}`}
    >
      {/* Radiant Theme Bloom Backdrop */}
      {showHalo && (
        <div
          className="absolute -inset-2 rounded-full opacity-60 dark:opacity-85 blur-xl pointer-events-none transition-all duration-500 animate-pulse"
          style={{
            background: "radial-gradient(circle, var(--primary) 0%, var(--accent) 45%, transparent 75%)",
          }}
        />
      )}

      <svg
        viewBox="0 0 100 118"
        className={`${sizeClasses} relative z-10 filter drop-shadow-[0_6px_16px_rgba(0,0,0,0.3)] overflow-visible`}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Minecraft Enchanted Glint Shader Gradient */}
          <linearGradient id={`buddy-glint-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
            <stop offset="25%" stopColor="#c084fc" stopOpacity="0.1" />
            <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="55%" stopColor="#f472b6" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="85%" stopColor="#818cf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </linearGradient>

          {/* Obsidian Visor Screen Gradient */}
          <linearGradient id={`buddy-screen-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#080a14" />
            <stop offset="60%" stopColor="#0f1322" />
            <stop offset="100%" stopColor="#171b30" />
          </linearGradient>

          {/* Direct Sunlight Roof Highlight Gradient */}
          <linearGradient id={`buddy-roof-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
          </linearGradient>

          {/* Emissive Eye Glow Filter */}
          <filter id={`buddy-eye-glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Mask for Enchanted Glint across Buddy Silhouette */}
          <mask id={`buddy-mask-${id}`}>
            <g fill="#ffffff" stroke="#ffffff" strokeLinejoin="miter">
              <path d="M 24 31 H 18 V 37 H 12 V 44 H 5 V 54 H 12 V 61 H 18 V 67 H 25 V 61 H 20 V 55 H 14 V 47 H 20 V 37 H 24 Z" />
              <path d="M 76 31 H 82 V 37 H 88 V 44 H 95 V 54 H 88 V 61 H 82 V 67 H 75 V 61 H 80 V 55 H 86 V 47 H 80 V 37 H 76 Z" />
              <polygon points="27,91 67,8 74,11 34,94" />
              <polygon points="22,33 78,33 74,67 26,67" />
            </g>
          </mask>
        </defs>

        {/* ================= STEPPED MINECRAFT 3D VOXEL CLOUD BASE ================= */}
        {showCloudBase && (
          <g className="pointer-events-none">
            {/* Stepped Pixel Ground Shadow underneath Cloud */}
            <motion.g
              animate={{
                scaleX: [1, 0.88, 1, 0.92, 1],
                opacity: [0.35, 0.18, 0.35, 0.22, 0.35],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "50% 108px" }}
              className="text-foreground/30 dark:text-primary/45"
            >
              <rect x="24" y="108" width="52" height="2" fill="currentColor" opacity="0.35" />
              <rect x="30" y="106" width="40" height="5" fill="currentColor" opacity="0.6" />
              <rect x="36" y="104" width="28" height="8" fill="currentColor" opacity="0.85" />
            </motion.g>

            {/* Stepped 3D Minecraft Voxel Cloud Platform */}
            <motion.g
              animate={{
                y: [0, -3.5, 0, -2, 0],
                scaleX: [1, 0.96, 1, 0.98, 1],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "50% 100%" }}
            >
              {/* Back Cloud Ambient Occlusion Layer */}
              <g transform="translate(1.5, 2)" opacity="0.25">
                {/* Center Main Cloud Block */}
                <rect x="30" y="93" width="40" height="11" fill="#000000" stroke="#000000" strokeWidth="1.5" strokeLinejoin="miter" />
                {/* Left Cloud Puff Block */}
                <rect x="18" y="96" width="18" height="8" fill="#000000" stroke="#000000" strokeWidth="1.5" strokeLinejoin="miter" />
                {/* Right Cloud Puff Block */}
                <rect x="64" y="96" width="18" height="8" fill="#000000" stroke="#000000" strokeWidth="1.5" strokeLinejoin="miter" />
              </g>

              {/* Main 3D Voxel Cloud Blocks */}
              {/* Left Cloud Puff Block */}
              <g>
                <rect x="18" y="95" width="18" height="9" fill="currentColor" className="text-card/95 dark:text-card/90" stroke="#05050a" strokeWidth="1.4" strokeLinejoin="miter" />
                {/* Top sunlight facet */}
                <rect x="18" y="95" width="18" height="2" fill="#ffffff" opacity="0.75" />
                {/* Bottom shadow facet */}
                <rect x="18" y="102" width="18" height="2" fill="#000000" opacity="0.35" />
              </g>

              {/* Right Cloud Puff Block */}
              <g>
                <rect x="64" y="95" width="18" height="9" fill="currentColor" className="text-card/95 dark:text-card/90" stroke="#05050a" strokeWidth="1.4" strokeLinejoin="miter" />
                {/* Top sunlight facet */}
                <rect x="64" y="95" width="18" height="2" fill="#ffffff" opacity="0.75" />
                {/* Bottom shadow facet */}
                <rect x="64" y="102" width="18" height="2" fill="#000000" opacity="0.35" />
              </g>

              {/* Center Main Cloud Block (Elevated Tier) */}
              <g>
                <rect x="28" y="92" width="44" height="13" fill="currentColor" className="text-card dark:text-card" stroke="#05050a" strokeWidth="1.6" strokeLinejoin="miter" />
                {/* Top sunlight facet */}
                <rect x="28" y="92" width="44" height="2.5" fill="#ffffff" opacity="0.85" />
                {/* Stepped block texture line */}
                <line x1="36" y1="92" x2="36" y2="105" stroke="#05050a" strokeWidth="1" opacity="0.3" />
                <line x1="64" y1="92" x2="64" y2="105" stroke="#05050a" strokeWidth="1" opacity="0.3" />
                {/* Bottom ambient shadow facet */}
                <rect x="28" y="102.5" width="44" height="2.5" fill="#000000" opacity="0.4" />
              </g>

              {/* Minecraft Cloud Edge Shader Highlight */}
              <line x1="29" y1="93" x2="71" y2="93" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
            </motion.g>
          </g>
        )}

        {/* ================= 3D FLOATING MINECRAFT VOXEL BUDDY ================= */}
        <motion.g
          animate={{
            y: mood === "happy" ? [0, -9, 0, -6, 0] : [0, -7, 0, -4, 0],
            rotateX: [6 + mouseOffset.y, -6 + mouseOffset.y, 6 + mouseOffset.y],
            rotateY: [-9 + mouseOffset.x, 9 + mouseOffset.x, -9 + mouseOffset.x],
            rotateZ:
              mood === "curious"
                ? [5, 2, 5]
                : mood === "waving"
                ? [-3, 3, -3]
                : [0, -2, 2, -1, 0],
          }}
          transition={{
            duration: mood === "happy" ? 3.5 : 4.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ transformOrigin: "50% 50%", transformStyle: "preserve-3d" }}
        >
          {/* LAYER 1: BACK AMBIENT OCCLUSION CAST SHADOW (3D Depth) */}
          <g transform="translate(3.2, 4.2)" opacity="0.28">
            <path
              d="M 24 31 H 18 V 37 H 12 V 44 H 5 V 54 H 12 V 61 H 18 V 67 H 25 V 61 H 20 V 55 H 14 V 47 H 20 V 37 H 24 Z"
              fill="#000000"
              stroke="#000000"
              strokeWidth="2"
              strokeLinejoin="miter"
            />
            <path
              d="M 76 31 H 82 V 37 H 88 V 44 H 95 V 54 H 88 V 61 H 82 V 67 H 75 V 61 H 80 V 55 H 86 V 47 H 80 V 37 H 76 Z"
              fill="#000000"
              stroke="#000000"
              strokeWidth="2"
              strokeLinejoin="miter"
            />
            <polygon points="27,91 67,8 74,11 34,94" fill="#000000" stroke="#000000" strokeWidth="2" strokeLinejoin="miter" />
            <polygon points="22,33 78,33 74,67 26,67" fill="#000000" stroke="#000000" strokeWidth="2" strokeLinejoin="miter" />
          </g>

          {/* LAYER 2: 3D EXTRUDED SIDE DIRECTIONAL SHADOW FACETS */}
          <g transform="translate(1.6, 2)" opacity="0.55">
            <path
              d="M 24 31 H 18 V 37 H 12 V 44 H 5 V 54 H 12 V 61 H 18 V 67 H 25 V 61 H 20 V 55 H 14 V 47 H 20 V 37 H 24 Z"
              fill="currentColor"
              className="text-primary/75"
              stroke="#05050a"
              strokeWidth="1.5"
              strokeLinejoin="miter"
            />
            <path
              d="M 76 31 H 82 V 37 H 88 V 44 H 95 V 54 H 88 V 61 H 82 V 67 H 75 V 61 H 80 V 55 H 86 V 47 H 80 V 37 H 76 Z"
              fill="currentColor"
              className="text-primary/75"
              stroke="#05050a"
              strokeWidth="1.5"
              strokeLinejoin="miter"
            />
            <polygon points="27,91 67,8 74,11 34,94" fill="currentColor" className="text-primary/75" stroke="#05050a" strokeWidth="1.6" strokeLinejoin="miter" />
            <polygon points="22,33 78,33 74,67 26,67" fill="currentColor" className="text-primary/75" stroke="#05050a" strokeWidth="1.6" strokeLinejoin="miter" />
          </g>

          {/* LAYER 3: MAIN FRONT 3D VOXEL BODY WITH CEL-SHADED EDGES */}
          <g className="relative">
            {/* ================= STEPPED VOXEL LEFT EAR `<` ================= */}
            <motion.g
              animate={
                mood === "waving"
                  ? { rotate: [0, -12, 0, -12, 0] }
                  : undefined
              }
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "24px 31px" }}
            >
              <path
                d="M 24 31 H 18 V 37 H 12 V 44 H 5 V 54 H 12 V 61 H 18 V 67 H 25 V 61 H 20 V 55 H 14 V 47 H 20 V 37 H 24 Z"
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.6"
                strokeLinejoin="miter"
              />
              {/* Sunlight Top Facets */}
              <path
                d="M 18 31 H 24 V 32.5 H 18 Z M 12 37 H 18 V 38.5 H 12 Z M 5 44 H 12 V 45.5 H 5 Z"
                fill="#ffffff"
                opacity="0.45"
              />
              {/* Internal Block Divider Seams */}
              <line x1="18" y1="37" x2="20" y2="37" stroke="#05050a" strokeWidth="1.2" />
              <line x1="12" y1="44" x2="14" y2="44" stroke="#05050a" strokeWidth="1.2" />
              <line x1="12" y1="54" x2="14" y2="54" stroke="#05050a" strokeWidth="1.2" />
              <line x1="18" y1="61" x2="20" y2="61" stroke="#05050a" strokeWidth="1.2" />
              {/* Bottom Shadow Facets */}
              <path
                d="M 5 54 H 12 V 52.5 H 5 Z M 12 61 H 18 V 59.5 H 12 Z M 18 67 H 25 V 65.5 H 18 Z"
                fill="#000000"
                opacity="0.4"
              />
            </motion.g>

            {/* ================= STEPPED VOXEL RIGHT EAR `>` ================= */}
            <g>
              <path
                d="M 76 31 H 82 V 37 H 88 V 44 H 95 V 54 H 88 V 61 H 82 V 67 H 75 V 61 H 80 V 55 H 86 V 47 H 80 V 37 H 76 Z"
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.6"
                strokeLinejoin="miter"
              />
              {/* Sunlight Top Facets */}
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
              {/* Bottom Shadow Facets */}
              <path
                d="M 88 54 H 95 V 52.5 H 88 Z M 82 61 H 88 V 59.5 H 82 Z M 75 67 H 82 V 65.5 H 75 Z"
                fill="#000000"
                opacity="0.4"
              />
            </g>

            {/* ================= CENTER 3D DIAGONAL MONOLITH SLASH `/` ================= */}
            <g>
              <polygon
                points="27,91 67,8 74,11 34,94"
                fill="currentColor"
                className="text-primary"
                stroke="#05050a"
                strokeWidth="1.8"
                strokeLinejoin="miter"
              />
              {/* Top-Right Ridge Sunlight Specular Highlight */}
              <polygon points="67,8 74,11 72,13 65,10" fill="#ffffff" opacity="0.8" />
              <line x1="67" y1="8" x2="31" y2="83" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
              {/* Bottom-Left Ridge Shadow */}
              <line x1="74" y1="11" x2="34" y2="94" stroke="#000000" strokeWidth="1.4" opacity="0.45" />
              {/* Stepped Voxel Seams */}
              <line x1="57" y1="29" x2="64" y2="32" stroke="#05050a" strokeWidth="1.2" opacity="0.6" />
              <line x1="47" y1="50" x2="54" y2="53" stroke="#05050a" strokeWidth="1.2" opacity="0.6" />
              <line x1="37" y1="71" x2="44" y2="74" stroke="#05050a" strokeWidth="1.2" opacity="0.6" />
            </g>

            {/* ================= 3D HEAD CHASSIS (Minecraft Block Monitor) ================= */}
            <g>
              {/* Top Roof Facet (Direct Sunlight Shader) */}
              <polygon
                points="24,30 76,30 78,33 22,33"
                fill={`url(#buddy-roof-${id})`}
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
                fill={`url(#buddy-screen-${id})`}
                stroke="#05050a"
                strokeWidth="1.4"
                strokeLinejoin="miter"
              />
              {/* Obsidian Screen Subtle Pixel Grid */}
              <line x1="28" y1="43" x2="72" y2="43" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />
              <line x1="29" y1="50" x2="71" y2="50" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />
              <line x1="29" y1="57" x2="71" y2="57" stroke="#ffffff" strokeWidth="0.4" opacity="0.08" />

              {/* Bottom Chin Ambient Occlusion Shadow */}
              <polygon
                points="26,67 74,67 71,70 29,70"
                fill="#000000"
                opacity="0.65"
                stroke="#05050a"
                strokeWidth="1.4"
                strokeLinejoin="miter"
              />
              {/* Corner Bevel Highlight */}
              <line x1="23" y1="34" x2="77" y2="34" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
            </g>

            {/* ================= MINECRAFT EXPRESSIVE VOXEL EYES PER MOOD ================= */}
            {mood === "happy" ? (
              // Joyful Minecraft Chevrons (^^)
              <motion.g
                animate={{ y: [-1, -2, -1], scaleX: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "50% 50px" }}
              >
                {/* Left Joy Chevron */}
                <path
                  d="M 37 49 L 41 44 L 45 49"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.2"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  filter={`url(#buddy-eye-glow-${id})`}
                />
                {/* Right Joy Chevron */}
                <path
                  d="M 55 49 L 59 44 L 63 49"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.2"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  filter={`url(#buddy-eye-glow-${id})`}
                />
              </motion.g>
            ) : mood === "thinking" ? (
              // Thinking Eyes Looking Upward-Right + Floating Thinking Voxel Cubes
              <g>
                <motion.g
                  animate={{
                    x: [0, 2, 2, 0],
                    y: [-1, -3, -3, -1],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: "50% 50px" }}
                >
                  <rect x="39" y="42" width="7" height="12" rx="0.5" fill="#ffffff" stroke="#05050a" strokeWidth="0.8" filter={`url(#buddy-eye-glow-${id})`} />
                  <rect x="57" y="42" width="7" height="12" rx="0.5" fill="#ffffff" stroke="#05050a" strokeWidth="0.8" filter={`url(#buddy-eye-glow-${id})`} />
                </motion.g>
                {/* Floating Minecraft Thought Cubes */}
                <motion.rect
                  x="68"
                  y="20"
                  width="4"
                  height="4"
                  fill="#c084fc"
                  stroke="#05050a"
                  strokeWidth="0.8"
                  animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3], rotate: [0, 45, 90] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.rect
                  x="74"
                  y="12"
                  width="5"
                  height="5"
                  fill="#38bdf8"
                  stroke="#05050a"
                  strokeWidth="0.8"
                  animate={{ y: [0, -8, 0], opacity: [0.2, 0.9, 0.2], rotate: [0, -45, -90] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
              </g>
            ) : mood === "curious" ? (
              // Curious Inquisitive Wide Eyes
              <motion.g
                animate={{
                  x: [-2, 2, -1, 0],
                  y: [0, -2, 0],
                  scaleY: [1.15, 1.15, 0.1, 1.15],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "50% 50px" }}
              >
                <rect x="37.5" y="43" width="7.5" height="13.5" rx="0.5" fill="#ffffff" stroke="#05050a" strokeWidth="0.8" filter={`url(#buddy-eye-glow-${id})`} />
                <rect x="55.5" y="43" width="7.5" height="13.5" rx="0.5" fill="#ffffff" stroke="#05050a" strokeWidth="0.8" filter={`url(#buddy-eye-glow-${id})`} />
              </motion.g>
            ) : (
              // Standard Idle Blinking & Cursor Tracking Minecraft Voxel Eyes
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
                {/* Left Eye */}
                <g>
                  <rect x="37.5" y="43.5" width="7" height="13" rx="0.5" fill="#ffffff" stroke="#05050a" strokeWidth="0.8" filter={`url(#buddy-eye-glow-${id})`} />
                  <rect x="38.5" y="44.5" width="2.5" height="2.5" fill="#ffffff" />
                  <rect x="41.5" y="49.5" width="2" height="5" fill="#e0e7ff" opacity="0.4" />
                </g>

                {/* Right Eye */}
                <g>
                  <rect x="55.5" y="43.5" width="7" height="13" rx="0.5" fill="#ffffff" stroke="#05050a" strokeWidth="0.8" filter={`url(#buddy-eye-glow-${id})`} />
                  <rect x="56.5" y="44.5" width="2.5" height="2.5" fill="#ffffff" />
                  <rect x="59.5" y="49.5" width="2" height="5" fill="#e0e7ff" opacity="0.4" />
                </g>
              </motion.g>
            )}

            {/* Top Slash Beacon Flare */}
            <motion.rect
              x="68.5"
              y="7"
              width="3.5"
              height="3.5"
              fill="#ffffff"
              stroke="#05050a"
              strokeWidth="0.7"
              transform="rotate(45 70.25 8.75)"
              animate={{
                scale: [0.8, 1.3, 0.8],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>

          {/* ================= MINECRAFT ENCHANTED GLINT SHADER OVERLAY ================= */}
          <g mask={`url(#buddy-mask-${id})`} className="pointer-events-none">
            <motion.rect
              x="-100"
              y="-100"
              width="300"
              height="300"
              fill={`url(#buddy-glint-${id})`}
              style={{ mixBlendMode: "color-dodge" }}
              animate={{
                x: [-140, 140],
                y: [-140, 140],
              }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 1.1,
              }}
            />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}


import React from "react";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";
import { motion } from "motion/react";

export function HeroBrandTitle() {
  return (
    <div className="relative flex flex-col items-center justify-center my-3 select-none w-full max-w-5xl mx-auto">
      {/* 🌟 REFINED 3D MINIMALIST MASCOT LOGO - Main hero visual anchor with circular radial stage */}
      <div className="relative group flex items-center justify-center my-2 sm:my-4 isolate z-10">
        {/* Layer 1: Radiant Dynamic Theme Gradient Disc Behind Logo */}
        <div
          className="absolute inset-0 -z-10 rounded-full blur-2xl opacity-80 dark:opacity-65 pointer-events-none transition-all duration-700 animate-pulse"
          style={{
            background: "radial-gradient(circle, var(--glow-primary, rgba(225,29,72,0.35)) 0%, var(--glow-complement, rgba(13,148,136,0.22)) 48%, transparent 75%)",
          }}
        />
        {/* Layer 2: Deep Ambient Spotlight Aura */}
        <div
          className="absolute -inset-6 -z-20 rounded-full blur-3xl opacity-50 dark:opacity-35 pointer-events-none transition-all duration-700"
          style={{
            background: "radial-gradient(ellipse at center, var(--primary) 0%, var(--complement) 45%, transparent 70%)",
          }}
        />

        {/* Outer Circular Stage Border */}
        <div className="absolute -z-10 size-60 sm:size-72 md:size-84 lg:size-96 rounded-full border border-primary/20 pointer-events-none" />

        {/* Middle Ring with subtle complementary border */}
        <div className="absolute -z-10 size-48 sm:size-58 md:size-68 lg:size-78 rounded-full border border-complement/25 pointer-events-none" />

        {/* Inner Dashed Concentric Ring (matches screenshot) */}
        <div className="absolute -z-10 size-40 sm:size-48 md:size-56 lg:size-64 rounded-full border border-dashed border-primary/30 pointer-events-none" />

        {/* 3D Mascot Logo from reference zip 12 */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative z-10 text-primary w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 aspect-[100/110] shrink-0 cursor-pointer filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
        >
          <DsavizcoLogo
            className="w-full h-full"
            interactive={true}
            showShadow={true}
          />
        </motion.div>
      </div>

      {/* Brand Title Text Container with Minecraft Typography & Luminescence */}
      <div className="dsavizco-title-container relative inline-flex flex-col items-center justify-center mt-2">
        {/* Soft ambient glow behind all characters of DSAVIZCO */}
        <span className="dsavizco-purplish-bg-glow" aria-hidden="true" />

        {/* Foreground Pixel Title with authentic pixel text shadow */}
        <span className="dsavizco-pixel-text text-3xl sm:text-5xl md:text-6xl lg:text-[4.75rem] tracking-wider relative z-10 font-black">
          DSAVIZCO
        </span>

        {/* Subtitle in clean monospace font matching screenshot */}
        <span className="font-mono text-xs sm:text-sm tracking-wider text-primary font-semibold mt-1 relative z-10">
          (algorithms • visualizer • compiler)
        </span>
      </div>
    </div>
  );
}


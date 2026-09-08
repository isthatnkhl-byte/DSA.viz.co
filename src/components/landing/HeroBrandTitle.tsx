import React from "react";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";
import { motion } from "motion/react";

export function HeroBrandTitle() {
  return (
    <div className="relative flex flex-col items-center justify-center my-3 select-none w-full max-w-5xl mx-auto">
      {/* 🌟 REFINED 3D MINIMALIST MASCOT LOGO - Main hero visual anchor with circular radial stage */}
      <div className="relative group flex items-center justify-center my-2 sm:my-4 isolate z-10">
        {/* Soft circular radial backdrop disc matching screenshot */}
        <div className="absolute inset-0 -z-10 rounded-full bg-radial from-primary/20 via-primary/8 to-transparent blur-xl scale-110 pointer-events-none" />

        {/* Outer Circular Stage Border */}
        <div className="absolute -z-10 size-56 sm:size-68 md:size-80 lg:size-92 rounded-full border border-primary/20 pointer-events-none" />

        {/* Middle Ring with subtle complementary border */}
        <div className="absolute -z-10 size-44 sm:size-54 md:size-64 lg:size-72 rounded-full border border-primary/15 pointer-events-none" />

        {/* Inner Dashed Concentric Ring (matches screenshot) */}
        <div className="absolute -z-10 size-36 sm:size-44 md:size-52 lg:size-60 rounded-full border border-dashed border-primary/25 pointer-events-none" />

        {/* Refined DsavizcoLogo */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative z-10 text-primary w-28 sm:w-36 md:w-44 lg:w-52 aspect-[120/106] shrink-0 cursor-pointer filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
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


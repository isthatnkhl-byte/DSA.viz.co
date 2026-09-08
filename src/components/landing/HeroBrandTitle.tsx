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
        <div className="absolute -z-10 size-56 sm:size-72 md:size-84 lg:size-96 rounded-full border border-primary/25 pointer-events-none" />

        {/* Middle Concentric Ring */}
        <div className="absolute -z-10 size-44 sm:size-56 md:size-68 lg:size-80 rounded-full border border-primary/15 pointer-events-none" />

        {/* Inner Concentric Ring with Dashed Line */}
        <div className="absolute -z-10 size-32 sm:size-42 md:size-52 lg:size-64 rounded-full border border-dashed border-primary/15 pointer-events-none" />

        {/* Refined DsavizcoLogo */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="relative z-10 text-primary w-32 h-32 sm:w-44 sm:h-44 md:w-56 md:h-56 lg:w-68 lg:h-68 shrink-0 cursor-pointer filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_14px_35px_rgba(0,0,0,0.55)]"
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


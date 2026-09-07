import React from "react";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";
import { motion } from "motion/react";

export function HeroBrandTitle() {
  return (
    <div className="relative flex flex-col items-center justify-center my-4 select-none w-full max-w-5xl mx-auto">
      
      {/* 🌟 GIANT MASCOT HIGHLIGHT - Main visual anchor, isolated stacking context strictly behind headline */}
      <div className="relative group flex items-center justify-center my-3 sm:my-5 isolate z-10">
        
        {/* Multilayered Radiant Neon Glow Rings strictly behind mascot */}
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-primary/30 via-accent/20 to-primary/40 blur-3xl scale-110 opacity-40 dark:opacity-70 animate-pulse pointer-events-none" />
        <div className="absolute -inset-4 -z-10 rounded-full bg-primary/15 dark:bg-primary/20 blur-2xl scale-105 pointer-events-none" />

        {/* Ambient Decorative Radar Rings strictly behind mascot */}
        <motion.div 
          className="absolute -z-10 size-44 sm:size-64 md:size-80 lg:size-[22rem] rounded-full border border-primary/20 pointer-events-none"
          animate={{ scale: [0.95, 1.05, 0.95], rotate: 360 }}
          transition={{ scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 25, repeat: Infinity, ease: "linear" } }}
        />
        <motion.div 
          className="absolute -z-10 size-52 sm:size-72 md:size-[24rem] lg:size-[26rem] rounded-full border border-accent/15 border-dashed pointer-events-none"
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />

        {/* Massive Mascot Logo */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-primary w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 xl:w-96 xl:h-96 shrink-0 drop-shadow-[0_0_35px_rgba(var(--primary-rgb,99,102,241),0.4)] cursor-pointer"
        >
          <DsavizcoLogo className="w-full h-full filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]" />
        </motion.div>
      </div>

      {/* Brand Title Text Container */}
      <div className="dsavizco-title-container relative inline-flex flex-col items-center justify-center mt-2">
        {/* Soft, wide purplish ambient glow behind all characters of DSAVIZCO */}
        <span className="dsavizco-purplish-bg-glow" aria-hidden="true" />
        
        {/* Foreground Pixel Title */}
        <span className="dsavizco-pixel-text text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] tracking-wider relative z-10 text-foreground font-black">
          DSAVIZCO
        </span>

        {/* Subtitle */}
        <span className="font-mono text-xs sm:text-sm md:text-base tracking-widest text-primary/90 font-bold mt-1 relative z-10">
          (algorithms • visualizer • compiler)
        </span>
      </div>
    </div>
  );
}

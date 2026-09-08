import React from "react";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";
import { motion } from "motion/react";

export function HeroBrandTitle() {
  return (
    <div className="relative flex flex-col items-center justify-center my-4 select-none w-full max-w-5xl mx-auto">
      {/* 🌟 REFINED 3D MINIMALIST MASCOT LOGO - Main hero visual anchor */}
      <div className="relative group flex items-center justify-center my-3 sm:my-5 isolate z-10">
        {/* Soft, minimal ambient glow strictly behind mascot */}
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-primary/25 via-accent/20 to-primary/30 blur-3xl scale-105 opacity-60 dark:opacity-75 pointer-events-none" />

        {/* Minimal concentric orbit ring */}
        <motion.div
          className="absolute -z-10 size-48 sm:size-64 md:size-80 lg:size-96 rounded-full border border-primary/20 pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        />

        {/* Refined DsavizcoLogo */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="relative z-10 text-primary w-36 h-36 sm:w-52 sm:h-52 md:w-68 md:h-68 lg:w-84 lg:h-84 xl:w-96 xl:h-96 shrink-0 cursor-pointer filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.25)] dark:drop-shadow-[0_14px_35px_rgba(0,0,0,0.55)]"
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
        {/* Soft, wide purplish ambient glow behind all characters of DSAVIZCO */}
        <span className="dsavizco-purplish-bg-glow" aria-hidden="true" />

        {/* Foreground Pixel Title with Minecraft cel text-shadow */}
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


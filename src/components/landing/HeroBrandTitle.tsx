import React from "react";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";
import { motion } from "motion/react";

export function HeroBrandTitle() {
  return (
    <div className="relative flex flex-col items-center justify-center my-4 select-none w-full max-w-5xl mx-auto">
      {/* 🌟 GIANT 3D MINECRAFT VOXEL MASCOT - Main hero visual anchor */}
      <div className="relative group flex items-center justify-center my-3 sm:my-5 isolate z-10">
        {/* Multilayered Radiant Minecraft Shader Bloom strictly behind mascot */}
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-tr from-primary/35 via-accent/25 to-primary/45 blur-3xl scale-110 opacity-50 dark:opacity-80 animate-pulse pointer-events-none" />
        <div className="absolute -inset-6 -z-10 rounded-full bg-primary/20 dark:bg-primary/25 blur-2xl scale-105 pointer-events-none" />

        {/* Minecraft Beacon / Enchanting Circle Ring 1 */}
        <motion.div
          className="absolute -z-10 size-48 sm:size-68 md:size-84 lg:size-[23rem] rounded-full border border-primary/30 pointer-events-none"
          animate={{ scale: [0.96, 1.04, 0.96], rotate: 360 }}
          transition={{
            scale: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 30, repeat: Infinity, ease: "linear" },
          }}
        />

        {/* Minecraft Beacon / Enchanting Circle Ring 2 (Dashed Voxel Pattern) */}
        <motion.div
          className="absolute -z-10 size-56 sm:size-76 md:size-[25rem] lg:size-[27rem] rounded-full border border-accent/25 border-dashed pointer-events-none"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        />

        {/* Ambient Voxel Grid Specular Crosshairs */}
        <div className="absolute -z-10 size-64 sm:size-88 md:size-[26rem] pointer-events-none opacity-20 dark:opacity-30">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-gradient-to-b from-transparent via-primary to-transparent" />
        </div>

        {/* Massive 3D Minecraft Voxel Mascot Logo with Edges Shaders & Enchanted Glint */}
        <motion.div
          initial={{ scale: 0.82, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="relative z-10 text-primary w-36 h-36 sm:w-52 sm:h-52 md:w-68 md:h-68 lg:w-84 lg:h-84 xl:w-96 xl:h-96 shrink-0 cursor-pointer filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_14px_35px_rgba(0,0,0,0.65)]"
        >
          <DsavizcoLogo
            className="w-full h-full"
            interactive={true}
            showGlint={true}
            showParticles={true}
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


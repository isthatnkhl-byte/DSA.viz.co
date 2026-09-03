import React from "react";

export function HeroBrandTitle() {
  return (
    <div className="relative inline-flex items-center my-2 select-none group">
      {/* Brand Title Container matching the exact reference screenshot */}
      <div className="dsavizco-title-container relative inline-flex items-center justify-center">
        {/* Soft, wide purplish ambient glow behind all characters of DSAVIZCO */}
        <span className="dsavizco-purplish-bg-glow" aria-hidden="true" />

        {/* Foreground Pixel Title matching screenshot: Silkscreen pixel font, solid white in dark mode, crisp pixel bevel */}
        <span className="dsavizco-pixel-text text-5xl sm:text-7xl md:text-8xl lg:text-[6.6rem] tracking-wider relative z-10">
          DSAVIZCO
        </span>
      </div>
    </div>
  );
}


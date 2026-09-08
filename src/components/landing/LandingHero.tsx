import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers, Sparkles, BookOpen } from "lucide-react";
import { ThemeSwitchBanner } from "./ThemeSwitchBanner";
import { HeroBrandTitle } from "./HeroBrandTitle";
import { useAuth } from "@/hooks/useAuth";

export function LandingHero() {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden pt-4 pb-12 md:pt-16 md:pb-24 px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full flex flex-col items-center text-center">
      {/* Background Ambient Atmosphere (Subtle deep glow strictly behind all content at -z-20) */}
      <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Subtle dynamic multi-color radial gradient spotlight */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[850px] md:w-[1100px] h-[360px] sm:h-[480px] rounded-full bg-gradient-to-b from-primary/18 via-accent/12 to-transparent blur-[80px] sm:blur-[130px] opacity-75 dark:opacity-85" />
        {/* Modern micro-dot radial grid for architectural depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,var(--background)_85%)] z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(#8883_1px,transparent_1px)] [background-size:24px_24px] opacity-30 dark:opacity-20" />
      </div>

      {/* Top Status & Appearance Ribbon (Centered floating capsule) */}
      <div className="relative z-30 flex w-full justify-center mb-6 sm:mb-8">
        <ThemeSwitchBanner />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-20 flex flex-col items-center space-y-6 md:space-y-8 w-full">
        
        {/* Main Headline Structure */}
        <div className="relative z-30 space-y-3 flex flex-col items-center w-full">
          <h1 className="relative z-30 text-3xl sm:text-5xl md:text-6xl lg:text-[4.15rem] font-display font-extrabold tracking-tight text-foreground leading-[1.18] max-w-4xl mx-auto drop-shadow-sm flex flex-col items-center">
            <span>Understand algorithms by</span>
            <span className="relative inline-block z-40 px-1 py-0.5 align-baseline mt-1 sm:mt-2 group/underline">
              {/* Vibrant Dynamic Theme Gradient Text */}
              <span className="relative z-20 bg-gradient-to-r from-primary via-complement to-accent bg-clip-text text-transparent font-black tracking-tight select-none transition-all duration-500">
                watching how they work
              </span>

              {/* Exact Sinusoidal Wavy Zigzag Underline Ribbon */}
              <span
                className="absolute -bottom-2 sm:-bottom-2.5 left-0 right-0 z-30 pointer-events-none block h-2.5 sm:h-3 w-full"
                aria-hidden="true"
              >
                <svg
                  className="relative z-10 w-full h-full overflow-visible"
                  viewBox="0 0 380 14"
                  fill="none"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 2 7 Q 6 1, 10 7 T 18 7 T 26 7 T 34 7 T 42 7 T 50 7 T 58 7 T 66 7 T 74 7 T 82 7 T 90 7 T 98 7 T 106 7 T 114 7 T 122 7 T 130 7 T 138 7 T 146 7 T 154 7 T 162 7 T 170 7 T 178 7 T 186 7 T 194 7 T 202 7 T 210 7 T 218 7 T 226 7 T 234 7 T 242 7 T 250 7 T 258 7 T 266 7 T 274 7 T 282 7 T 290 7 T 298 7 T 306 7 T 314 7 T 322 7 T 330 7 T 338 7 T 346 7 T 354 7 T 362 7 T 370 7 T 378 7"
                    stroke="var(--hero-wavy-color, var(--primary))"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-colors duration-500"
                  />
                </svg>
              </span>
            </span>
          </h1>
          
          {/* Central Brand Title Display with Mascot and Radial Disc Stage */}
          <div className="relative z-10 py-1 sm:py-2 w-full">
            <HeroBrandTitle />
          </div>
        </div>

        {/* Subtitle */}
        <p className="relative z-20 text-sm sm:text-base md:text-lg text-muted-foreground font-sans leading-relaxed max-w-2xl mx-auto px-2">
          Step through code line by line, inspect variable mutations, follow pointer motions, and build lasting structural intuition for technical interviews.
        </p>

        {/* Main Action CTAs with Smooth Theme Color Motion */}
        <div className="relative z-20 flex flex-col items-center gap-3.5 pt-2 sm:pt-4 w-full">
          {/* Row 1: Primary browse button pill with smooth theme transition & ray shimmer */}
          <Link
            to="/problems"
            className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary via-primary/95 to-primary px-8 sm:px-10 py-3.5 text-base sm:text-lg font-sans font-bold tracking-wide text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 ease-out overflow-hidden cursor-pointer"
          >
            {/* Ambient Shimmer Light Ray Motion */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 ease-in-out pointer-events-none" />
            {/* Dynamic Glow Halo */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-complement to-primary opacity-35 blur-md group-hover:opacity-75 transition-opacity duration-500 -z-10" />

            <Layers className="size-5 relative z-10" />
            <span className="relative z-10">Browse 1,500+ Problems</span>
            <ArrowRight className="size-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          {/* Row 2: Secondary buttons side by side with dynamic complementary highlights */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full">
            <Link
              to="/playground"
              className="group inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/90 dark:bg-card/90 px-5 sm:px-6 py-3 text-sm sm:text-base font-mono font-semibold text-foreground hover:bg-secondary/90 hover:border-complement/60 hover:shadow-[0_0_20px_-3px_var(--glow-complement)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xs backdrop-blur-md cursor-pointer"
            >
              <Sparkles className="size-4 text-complement shrink-0 transition-transform duration-300 group-hover:rotate-12" />
              <span>Interactive Visualizer</span>
            </Link>
            <Link
              to={"/sheets" as any}
              className="group inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/90 dark:bg-card/90 px-5 sm:px-6 py-3 text-sm sm:text-base font-mono font-semibold text-foreground hover:bg-secondary/90 hover:border-primary/60 hover:shadow-[0_0_20px_-3px_var(--glow-primary)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-xs backdrop-blur-md cursor-pointer"
            >
              <BookOpen className="size-4 text-primary shrink-0 transition-transform duration-300 group-hover:rotate-6" />
              <span>DSA Sheets</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

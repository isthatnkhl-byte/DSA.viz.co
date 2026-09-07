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

      {/* Top Status & Appearance Ribbon */}
      <div className="relative z-20 flex w-full justify-end mb-8 md:mb-12">
        <ThemeSwitchBanner />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-20 flex flex-col items-center space-y-6 md:space-y-8 w-full">
        
        {/* Main Headline Structure - Elevated to z-30 so it is strictly above all mascot and background glow layers */}
        <div className="relative z-30 space-y-4 flex flex-col items-center w-full">
          <h1 className="relative z-30 text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-display font-extrabold tracking-tight text-foreground leading-[1.18] max-w-4xl mx-auto drop-shadow-sm">
            Understand algorithms by{" "}
            <span className="relative inline-block z-40 px-1 py-0.5 align-baseline group/underline">
              {/* Vibrant Multi-color Gradient Text */}
              <span className="relative z-20 bg-gradient-to-r from-primary via-indigo-400 to-accent bg-clip-text text-transparent font-black tracking-tight drop-shadow-[0_2px_12px_color-mix(in_oklch,var(--primary)_30%,transparent)] select-none">
                watching how they work
              </span>

              {/* Dedicated High-Definition Multi-color Underline Flow (Physically in foreground above background gradient) */}
              <span
                className="absolute -bottom-2 sm:-bottom-2.5 left-0 right-0 z-30 pointer-events-none block h-2 sm:h-2.5 w-full"
                aria-hidden="true"
              >
                {/* Underline Soft Neon Halo Glow */}
                <span className="absolute inset-0 bg-gradient-to-r from-primary via-indigo-400 to-accent blur-[3px] opacity-75 rounded-full" />
                
                {/* High-Precision Crisp SVG Wave */}
                <svg
                  className="relative z-10 w-full h-full overflow-visible"
                  viewBox="0 0 320 12"
                  fill="none"
                  preserveAspectRatio="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 8.5C45 2.5 85 11 130 5.5C175 0 220 10.5 265 4.5C285 2 305 6 317 4.5"
                    stroke="url(#hero-wavy-gradient)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="hero-wavy-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="50%" stopColor="color-mix(in oklch, var(--primary) 50%, var(--accent))" />
                      <stop offset="100%" stopColor="var(--accent)" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </span>
          </h1>
          
          {/* Subtle Brand Title Display with Animated Logo */}
          <div className="relative z-10 py-2 w-full">
            <HeroBrandTitle />
          </div>
        </div>

        {/* Subtitle */}
        <p className="relative z-20 text-base sm:text-lg text-muted-foreground font-sans leading-relaxed max-w-2xl mx-auto">
          Step through code line by line, inspect variable mutations, follow pointer motions, and build lasting structural intuition for technical interviews.
        </p>

        {/* Main Action CTAs */}
        <div className="relative z-20 flex flex-wrap justify-center items-center gap-4 pt-4">
          <Link
            to="/problems"
            className="group relative inline-flex items-center gap-2.5 rounded-xl btn-moving-theme-gradient px-8 py-3.5 text-base font-sans font-bold tracking-wide text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            <Layers className="size-4.5 relative z-10" />
            <span className="relative z-10">Browse 1,500+ Problems</span>
            <ArrowRight className="size-4.5 relative z-10 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/playground"
            className="inline-flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/85 px-6 py-3.5 text-base font-mono font-semibold text-foreground hover:bg-secondary hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-200 shadow-xs backdrop-blur-md"
          >
            <Sparkles className="size-4.5 text-primary" />
            <span>Interactive Visualizer</span>
          </Link>
          <Link
            to={"/sheets" as any}
            className="inline-flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/85 px-6 py-3.5 text-base font-mono font-semibold text-foreground hover:bg-secondary hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all duration-200 shadow-xs backdrop-blur-md"
          >
            <BookOpen className="size-4.5 text-primary" />
            <span>DSA Sheets</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

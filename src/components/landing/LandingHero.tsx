import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers, Sparkles, BookOpen } from "lucide-react";
import { ThemeSwitchBanner } from "./ThemeSwitchBanner";
import { HeroBrandTitle } from "./HeroBrandTitle";
import { useAuth } from "@/hooks/useAuth";

export function LandingHero() {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden pt-4 pb-12 md:pt-16 md:pb-24 px-4 sm:px-6 md:px-8 max-w-5xl mx-auto w-full flex flex-col items-center text-center">
      {/* Top Status & Appearance Ribbon */}
      <div className="relative z-10 flex w-full justify-end mb-8 md:mb-12">
        <ThemeSwitchBanner />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 flex flex-col items-center space-y-6 md:space-y-8">
        
        {/* Main Headline Structure */}
        <div className="space-y-4 flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-display font-extrabold tracking-tight text-foreground leading-[1.1] max-w-4xl mx-auto drop-shadow-xs">
            Understand algorithms by{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-accent bg-clip-text text-transparent underline decoration-primary/30 decoration-wavy underline-offset-[10px] font-black">
              watching how they work
            </span>
          </h1>
          
          {/* Subtle Brand Title Display with Animated Logo */}
          <div className="py-2">
            <HeroBrandTitle />
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-muted-foreground font-sans leading-relaxed max-w-2xl mx-auto">
          Step through code line by line, inspect variable mutations, follow pointer motions, and build lasting structural intuition for technical interviews.
        </p>

        {/* Main Action CTAs */}
        <div className="flex flex-wrap justify-center items-center gap-4 pt-4">
          <Link
            to="/problems"
            className="group relative inline-flex items-center gap-2.5 rounded-xl btn-moving-theme-gradient px-8 py-3.5 text-base font-sans font-bold tracking-wide text-white shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
          >
            <Layers className="size-4.5 relative z-10" />
            <span className="relative z-10">Browse 1,500+ Problems</span>
            <ArrowRight className="size-4.5 relative z-10 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/playground"
            className="inline-flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/85 px-6 py-3.5 text-base font-mono font-semibold text-foreground hover:bg-secondary hover:border-primary/40 transition-all duration-200 shadow-xs"
          >
            <Sparkles className="size-4.5 text-primary" />
            <span>Interactive Visualizer</span>
          </Link>
          <Link
            to={"/sheets" as any}
            className="inline-flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/85 px-6 py-3.5 text-base font-mono font-semibold text-foreground hover:bg-secondary hover:border-primary/40 transition-all duration-200 shadow-xs"
          >
            <BookOpen className="size-4.5 text-primary" />
            <span>DSA Sheets</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

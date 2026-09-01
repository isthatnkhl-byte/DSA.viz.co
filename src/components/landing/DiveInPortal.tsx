import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Sparkles, Terminal, Rocket, Flame, ArrowUpRight, CheckCircle2 } from "lucide-react";

export function DiveInPortal() {
  const { user, signInWithGoogle } = useAuth();
  return (
    <section className="relative my-20 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto w-full">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/25 to-primary/20 rounded-3xl blur-3xl opacity-60 pointer-events-none animate-portal-glow" />

      {/* Main Dive-In Portal Container */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-card/85 p-8 sm:p-12 md:p-16 text-center shadow-2xl backdrop-blur-2xl group">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] opacity-15" />

        {/* Decorative corner tech brackets */}
        <div className="absolute top-4 left-4 font-mono text-xs text-primary/60">┌───</div>
        <div className="absolute top-4 right-4 font-mono text-xs text-primary/60">───┐</div>
        <div className="absolute bottom-4 left-4 font-mono text-xs text-primary/60">└───</div>
        <div className="absolute bottom-4 right-4 font-mono text-xs text-primary/60">───┘</div>

        {/* Eyebrow badge */}
        <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-widest text-primary mb-6 shadow-sm shadow-primary/20">
          <Rocket className="size-3.5 animate-bounce text-primary" />
          <span>Interactive Problem Arena</span>
        </div>

        {/* Headline */}
        <h2 className="relative z-10 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-foreground leading-[1.1]">
          Stop imagining algorithms. <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent italic">
            Dive in &amp; watch them move.
          </span>
        </h2>

        {/* Subtitle */}
        <p className="relative z-10 mx-auto mt-5 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground font-sans">
          1500+ company-tagged problems with instantaneous AI pseudocode review, time/space invariant
          auditing, and step-by-step interactive animations.
        </p>

        {/* Propulsive Action Button with Flying Arrow */}
        
        <div className="relative z-10 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          {!user ? (
            <button
              onClick={() => signInWithGoogle()}
              className="group/dive relative inline-flex items-center gap-4 rounded-2xl btn-moving-theme-gradient px-9 py-5 text-base sm:text-lg font-mono font-bold text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-primary/50 active:scale-[0.98] overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/25 pointer-events-none" />
              <span className="relative z-10 tracking-wide">Sign in with Google to Start</span>
              <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-white/20 text-primary-foreground transition-all duration-300 group-hover/dive:translate-x-1.5 shadow-xs">
                <ArrowRight className="size-5 transition-transform duration-300 group-hover/dive:scale-110" />
              </span>
            </button>
          ) : (
            <>
              <Link
                to="/problems"
                className="group/dive relative inline-flex items-center gap-4 rounded-2xl btn-moving-theme-gradient px-9 py-5 text-base sm:text-lg font-mono font-bold text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-primary/50 active:scale-[0.98] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/25 pointer-events-none" />
                <span className="relative z-10 tracking-wide">Explore 1500+ Problems</span>
                <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-white/20 text-primary-foreground transition-all duration-300 group-hover/dive:translate-x-1.5 shadow-xs">
                  <ArrowRight className="size-5 transition-transform duration-300 group-hover/dive:scale-110" />
                </span>
              </Link>
              <Link
                to="/playground"
                className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-secondary/60 px-7 py-5 text-sm sm:text-base font-mono font-semibold text-foreground hover:bg-secondary hover:border-primary/40 transition-all duration-200 backdrop-blur-md"
              >
                <Sparkles className="size-4 text-primary" />
                <span>Open Playground</span>
              </Link>
            </>
          )}
        </div>
    

        {/* Micro-tags under CTA */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            1500+ Tagged Problems
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            Zero Setup Required
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" />
            Instant Invariant AI
          </span>
        </div>
      </div>
    </section>
  );
}

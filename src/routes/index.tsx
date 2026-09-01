import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { ComplexityLeap } from "@/components/landing/ComplexityLeap";
import { TrackGrid } from "@/components/landing/TrackGrid";
import { DiveInPortal } from "@/components/landing/DiveInPortal";
import { DsaSheetSection } from "@/components/landing/DsaSheetSection";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { FeaturedProblemGrid } from "@/components/landing/FeaturedProblemGrid";
import { LowerInteractiveShowcase } from "@/components/landing/LowerInteractiveShowcase";
import { useAuth } from "@/hooks/useAuth";
import { Terminal, Shield, Sparkles, Activity, Code2, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DSA.viz — 1500+ Interactive LeetCode Algorithms with Real-Time Animation" },
      {
        name: "description",
        content:
          "Visual, animated execution for 1500+ LeetCode problems. Draft pseudocode, get instant AI invariant review, and watch algorithms step frame-by-frame.",
      },
      { property: "og:title", content: "DSA.viz — Watch Computer Science Think" },
      {
        property: "og:description",
        content:
          "1500+ company-tagged problems. Write pseudocode, get an AI interview review, and watch your algorithm animate step by step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

export function LandingPage() {
  const { user, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* 1. Global Navigation Header */}
      <SiteHeader />

      <main className="flex-1">
        {/* 2. Hero Section with Live Two-Pointer Canvas */}
        <LandingHero />

        {/* 3. Interactive Complexity Leap (Brute Force vs Better vs Optimal) */}
        <ComplexityLeap />

        {/* 4. Feature Pillars Bento Grid */}
        <FeaturesBento />

        {/* 5. Pattern Tracks Section */}
        <TrackGrid />

        {/* 6. High-Frequency Interactive Problem Jump Grid */}
        <FeaturedProblemGrid />

        {/* 7. Curated DSA Sheets (NeetCode 150, Striver's SDE, Blind 75) */}
        <DsaSheetSection />

        {/* 8. Colorful Lower Visualizer Animations Showroom */}
        <LowerInteractiveShowcase />

        {/* 9. The Propulsive "Dive In" Launcher Portal */}
        <DiveInPortal />
      </main>

      {/* Modern High-Contrast Footer */}
      <footer className="mt-auto border-t border-border/80 bg-card/60 px-6 sm:px-10 py-12 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Slogan */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Link to="/" className="inline-flex items-center gap-2 font-display text-xl text-foreground font-black">
              <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-primary-foreground text-xs font-mono font-black shadow-md shadow-primary/20">
                <Terminal className="size-4" />
              </div>
              <span>
                DSA<span className="text-primary">.viz.co</span>
              </span>
            </Link>
            <span className="hidden sm:inline text-muted-foreground text-xs">•</span>
            <p className="font-mono text-xs text-muted-foreground">
              Watch computer science think • 1500+ algorithms animated &amp; verified
            </p>
          </div>

          {/* System Status Ping */}
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 font-mono text-xs text-emerald-400 shadow-xs">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
            </span>
            <span>All 1500+ Visual Engines Operational</span>
          </div>

          {/* Navigation Links */}
          {user ? (
            <div className="flex items-center gap-6 font-mono text-xs text-muted-foreground">
              <Link to="/problems" className="hover:text-primary transition-colors">
                Problems
              </Link>
              <Link to={"/sheets" as any} className="hover:text-primary transition-colors">
                Sheets
              </Link>
              <Link to="/playground" className="hover:text-primary transition-colors">
                Playground
              </Link>
              <Link to="/compiler" className="hover:text-primary transition-colors">
                C++ Compiler
              </Link>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 font-mono text-xs font-bold text-primary cursor-pointer hover:text-accent transition-colors"
              onClick={() => signInWithGoogle()}
            >
              <Sparkles className="size-3.5" />
              <span>Sign in to save algorithm progress &rarr;</span>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-muted-foreground gap-4">
          <p>© {new Date().getFullYear()} DSA.viz. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Deterministic 60 FPS Visualizer</span>
            <span>•</span>
            <span>Multi-Sandbox Cloud C++20</span>
            <span>•</span>
            <span>AES-256-GCM Secure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

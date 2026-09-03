import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { AlgorithmLiveTicker } from "@/components/landing/AlgorithmLiveTicker";
import { ComplexityLeap } from "@/components/landing/ComplexityLeap";
import { TrackGrid } from "@/components/landing/TrackGrid";
import { DiveInPortal } from "@/components/landing/DiveInPortal";
import { DsaSheetSection } from "@/components/landing/DsaSheetSection";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { FeaturedProblemGrid } from "@/components/landing/FeaturedProblemGrid";
import { LowerInteractiveShowcase } from "@/components/landing/LowerInteractiveShowcase";
import { useAuth } from "@/hooks/useAuth";
import { Terminal, Shield, Sparkles, Activity, Code2, BookOpen } from "lucide-react";
import { motion } from "motion/react";

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
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* 1. Global Navigation Header */}
      <SiteHeader />

      <main className="flex-1">
        {/* 2. Hero Section with Live Two-Pointer Canvas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="will-change-transform"
        >
          <LandingHero />
        </motion.div>

        {/* 2.5 Live Real-time Algorithmic Execution Ribbon */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <AlgorithmLiveTicker />
        </motion.div>

        {/* 3. Interactive Complexity Leap (Brute Force vs Better vs Optimal) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="will-change-transform"
        >
          <ComplexityLeap />
        </motion.div>

        {/* 4. Feature Pillars Bento Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="will-change-transform"
        >
          <FeaturesBento />
        </motion.div>

        {/* 5. Pattern Tracks Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="will-change-transform"
        >
          <TrackGrid />
        </motion.div>

        {/* 6. High-Frequency Interactive Problem Jump Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="will-change-transform"
        >
          <FeaturedProblemGrid />
        </motion.div>

        {/* 7. Curated DSA Sheets (NeetCode 150, Striver's SDE, Blind 75) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="will-change-transform"
        >
          <DsaSheetSection />
        </motion.div>

        {/* 8. Colorful Lower Visualizer Animations Showroom */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="will-change-transform"
        >
          <LowerInteractiveShowcase />
        </motion.div>

        {/* 9. The Propulsive "Dive In" Launcher Portal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="will-change-transform"
        >
          <DiveInPortal />
        </motion.div>
      </main>


      {/* Premium Multi-Column Footer */}
      <footer className="mt-auto border-t border-border/40 bg-card/40 px-6 sm:px-10 py-16 backdrop-blur-3xl relative overflow-hidden">
        {/* Subtle background glow for footer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand & Mission Column */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-6">
            <Link to="/" className="inline-flex items-center gap-2 font-display text-2xl text-foreground font-black">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-primary-foreground text-sm font-mono font-black shadow-md shadow-primary/20">
                <Terminal className="size-5" />
              </div>
              <span>
                DSA<span className="text-primary">.viz.co</span>
              </span>
            </Link>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed max-w-sm">
              Stop imagining algorithms. Watch them move. <br />
              1500+ LeetCode problems animated deterministically at 60fps with instant AI invariants.
            </p>
            {/* System Status Ping */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 font-mono text-[11px] font-bold text-emerald-400 w-fit">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
              <span>All Visual Engines Operational</span>
            </div>
          </div>

          {/* Navigation Columns Grid */}
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            {/* Product Column */}
            <div className="flex flex-col gap-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Platform</h3>
              <Link to="/problems" className="text-muted-foreground hover:text-primary transition-colors">Problem Arena</Link>
              <Link to={"/sheets" as any} className="text-muted-foreground hover:text-primary transition-colors">DSA Sheets</Link>
              <Link to="/playground" className="text-muted-foreground hover:text-primary transition-colors">Visual Playground</Link>
              <Link to="/compiler" className="text-muted-foreground hover:text-primary transition-colors">C++ Sandbox</Link>
            </div>

            {/* Features Column */}
            <div className="flex flex-col gap-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Capabilities</h3>
              <span className="text-muted-foreground">Deterministic Execution</span>
              <span className="text-muted-foreground">Interactive Step-by-Step</span>
              <span className="text-muted-foreground">AI Invariant Auditing</span>
              <span className="text-muted-foreground">Time & Space Analysis</span>
            </div>

            {/* Account Column */}
            <div className="flex flex-col gap-4 col-span-2 sm:col-span-1">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">Account</h3>
              {user ? (
                <>
                  <Link to={"/dashboard" as any} className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
                  <Link to={"/profile" as any} className="text-muted-foreground hover:text-primary transition-colors">Profile & Settings</Link>
                </>
              ) : (
                <Link to="/auth" className="inline-flex items-center gap-2 text-primary hover:text-accent transition-colors font-medium">
                  <Sparkles className="size-4" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Tech Badges */}
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[11px] font-mono text-muted-foreground">
            © {new Date().getFullYear()} DSA.viz.co. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-[10px] font-mono font-medium uppercase tracking-widest text-muted-foreground/60">
            <span className="flex items-center gap-1.5"><Activity className="size-3" /> 60 FPS Visualizer</span>
            <span className="flex items-center gap-1.5"><Code2 className="size-3" /> Cloud C++20</span>
            <span className="flex items-center gap-1.5"><Shield className="size-3" /> AES-256-GCM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;

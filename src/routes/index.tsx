import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useCallback } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import type { HeroIntroPhase } from "@/components/landing/HeroBrandTitle";
import { AlgorithmLiveTicker } from "@/components/landing/AlgorithmLiveTicker";
import { ComplexityLeap } from "@/components/landing/ComplexityLeap";
import { TrackGrid } from "@/components/landing/TrackGrid";
import { DiveInPortal } from "@/components/landing/DiveInPortal";
import { DsaSheetSection } from "@/components/landing/DsaSheetSection";
import { FeaturesBento } from "@/components/landing/FeaturesBento";
import { FeaturedProblemGrid } from "@/components/landing/FeaturedProblemGrid";
import { LowerInteractiveShowcase } from "@/components/landing/LowerInteractiveShowcase";
import { LiveVisualizerCard } from "@/components/landing/LiveVisualizerCard";
import { useAuth } from "@/hooks/useAuth";
import { motion, useScroll, useSpring, useMotionValueEvent } from "motion/react";
import { toast } from "sonner";
import type React from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DSA.viz — 1500+ Interactive Data Structure & Algorithm Visualizations" },
      {
        name: "description",
        content:
          "Visual, animated execution for 1500+ classic algorithmic problems. Draft pseudocode, inspect step-by-step memory pointers, and study Big-O complexity.",
      },
      { property: "og:title", content: "DSA.viz — Watch Computer Science Think" },
      {
        property: "og:description",
        content:
          "1500+ interactive algorithm visualizations. Write pseudocode, get Socratic AI feedback, and watch your algorithm animate step by step.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function mapProgressToHeroIntroPhase(p: number): HeroIntroPhase {
  if (p < 0.06) return "blank-0";
  if (p < 0.24) return "dsa";
  if (p < 0.30) return "blank-1";
  if (p < 0.48) return "viz";
  if (p < 0.54) return "blank-2";
  if (p < 0.72) return "co";
  if (p < 0.77) return "blank-3";
  if (p < 0.87) return "full-title";
  return "complete";
}

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const heroScrollTrackRef = useRef<HTMLDivElement>(null);

  const [introPhase, setIntroPhase] = useState<HeroIntroPhase>("blank-0");
  const [introProgress, setIntroProgress] = useState<number>(0);

  const { scrollYProgress } = useScroll({
    target: heroScrollTrackRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.4,
  });

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    const clamped = Math.max(0, Math.min(1, latest));
    setIntroProgress(clamped);
    const nextPhase = mapProgressToHeroIntroPhase(clamped);
    setIntroPhase((prev) => (prev === nextPhase ? prev : nextPhase));
  });

  const handleJumpToIntroProgress = useCallback((targetProgress: number) => {
    if (!heroScrollTrackRef.current || typeof window === "undefined") return;
    const trackEl = heroScrollTrackRef.current;
    const rect = trackEl.getBoundingClientRect();
    const trackTopDoc = window.scrollY + rect.top;
    const scrollableDistance = Math.max(1, trackEl.offsetHeight - window.innerHeight);
    const targetScrollY = trackTopDoc + scrollableDistance * Math.max(0, Math.min(1, targetProgress));
    window.scrollTo({ top: targetScrollY, behavior: "smooth" });
  }, []);

  const handleUnauthenticatedInteraction = (e: React.SyntheticEvent<HTMLElement>) => {
    if (loading || user) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (target.closest('[data-allow-guest="true"]')) return;

    const interactiveEl = target.closest(
      'a, button, input, select, textarea, [role="button"], [role="radio"], [role="slider"], [role="tab"]'
    ) as HTMLElement | null;

    if (!interactiveEl) return;
    if (interactiveEl.closest('[data-allow-guest="true"]')) return;

    const anchor = target.closest("a") as HTMLAnchorElement | null;
    const href = anchor?.getAttribute("href") || "";
    if (href === "#main-content") return;

    e.preventDefault();
    e.stopPropagation();

    const redirectDest =
      href && href.startsWith("/") && !href.startsWith("//") && href !== "/" && href !== "/auth"
        ? href
        : "/problems";

    toast.info("Sign in with Google is required to access platform features.");
    navigate({
      to: "/auth",
      search: { redirect: redirectDest } as any,
    });
  };

  const isNavbarAndHeroSpawned = introPhase === "complete";

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300"
      onClickCapture={handleUnauthenticatedInteraction}
      onChangeCapture={handleUnauthenticatedInteraction}
    >
      {/* 1. Global Navigation Header — Spawns in once Blank → DSA → VIZ → CO → DSAVIZCO intro completes */}
      <motion.div
        initial={false}
        animate={{
          opacity: isNavbarAndHeroSpawned ? 1 : 0,
          y: isNavbarAndHeroSpawned ? 0 : -28,
        }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className={`sticky top-0 z-40 w-full ${
          isNavbarAndHeroSpawned ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <SiteHeader />
      </motion.div>

      <main id="main-content" className="flex-1">
        {/* 2. Scroll-Choreographed Hero Section (Blank -> DSA -> Blank -> VIZ -> Blank -> CO -> DSAVIZCO -> Full Hero & Navbar) */}
        <div ref={heroScrollTrackRef} className="relative h-[480vh]">
          <div className="sticky top-14 sm:top-16 min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] flex flex-col justify-start">
            <LandingHero
              introPhase={introPhase}
              introProgress={introProgress}
              onJumpToIntroProgress={handleJumpToIntroProgress}
            />
          </div>
        </div>

        {/* 2.5 Live Real-time Algorithmic Execution Ribbon */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <AlgorithmLiveTicker />
        </motion.div>

        {/* 2.6 Flagship Live Visualizer Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="will-change-transform"
        >
          <LiveVisualizerCard />
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


      {/* Universal Accessible Site Footer with Legal, Cookie Preferences & Disclaimers */}
      <SiteFooter />
    </div>
  );
}

export default LandingPage;

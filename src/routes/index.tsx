import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LandingHero } from "@/components/landing/LandingHero";
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
import { motion } from "motion/react";
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

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleUnauthenticatedInteraction = (e: React.SyntheticEvent<HTMLElement>) => {
    if (loading || user) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const interactiveEl = target.closest(
      'a, button, input, select, textarea, [role="button"], [role="radio"], [role="slider"], [role="tab"]'
    ) as HTMLElement | null;

    if (!interactiveEl) return;

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

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300"
      onClickCapture={handleUnauthenticatedInteraction}
      onChangeCapture={handleUnauthenticatedInteraction}
    >
      {/* 1. Global Navigation Header */}
      <SiteHeader />

      <main id="main-content" className="flex-1">
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

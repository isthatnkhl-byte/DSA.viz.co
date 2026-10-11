import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, useCallback, useEffect } from "react";
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
import { motion, useMotionValue, useSpring, useMotionValueEvent } from "motion/react";
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
  if (p < 0.08) return "hero-initial";
  if (p < 0.36) return "dsa";
  if (p < 0.64) return "viz";
  if (p < 0.90) return "co";
  return "complete";
}

const STAGE_STOPS = [0.0, 0.22, 0.50, 0.77, 1.0];

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const targetProgress = useMotionValue(0);
  const smoothProgress = useSpring(targetProgress, {
    stiffness: 120,
    damping: 26,
    mass: 0.36,
  });

  const [introPhase, setIntroPhase] = useState<HeroIntroPhase>("hero-initial");
  const [introProgress, setIntroProgress] = useState<number>(0);
  const [scrollUnlocked, setScrollUnlocked] = useState<boolean>(false);
  const [navbarLogoDetached, setNavbarLogoDetached] = useState<boolean>(false);
  const touchStartYRef = useRef<number | null>(null);

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    const clamped = Math.max(0, Math.min(1, latest));
    setIntroProgress(clamped);
    const nextPhase = mapProgressToHeroIntroPhase(clamped);
    setIntroPhase((prev) => (prev === nextPhase ? prev : nextPhase));
  });

  // Synchronize top-left navbar logo slot detachment with the travelling logo flight
  useEffect(() => {
    if (introPhase === "dsa" || introPhase === "viz" || introPhase === "co") {
      setNavbarLogoDetached(true);
      return;
    }
    const timer = window.setTimeout(
      () => {
        setNavbarLogoDetached(false);
      },
      introPhase === "complete" ? 420 : 120,
    );
    return () => window.clearTimeout(timer);
  }, [introPhase]);

  // Unlock document scrolling smoothly as soon as the logo docks back on the top-left and the website appears
  useEffect(() => {
    if (scrollUnlocked) return;
    if (introPhase === "complete") {
      const timer = window.setTimeout(() => {
        setScrollUnlocked(true);
      }, 420);
      return () => window.clearTimeout(timer);
    }
  }, [introPhase, scrollUnlocked]);

  // Keep the site 100% static at scrollY = 0 while wheel / touch / keyboard gestures drive the intro animation
  useEffect(() => {
    if (typeof window === "undefined" || scrollUnlocked) {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      return;
    }

    window.scrollTo(0, 0);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const handleWheel = (e: WheelEvent) => {
      if (scrollUnlocked) return;
      e.preventDefault();
      const rawDelta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      const clampedDelta = Math.max(-110, Math.min(110, rawDelta));
      const rawNext = Math.max(0, Math.min(1, targetProgress.get() + clampedDelta * 0.00062));
      const next = rawNext >= 0.90 && clampedDelta > 0 ? 1 : rawNext;
      targetProgress.set(next);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (scrollUnlocked || !e.touches[0]) return;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (scrollUnlocked || !e.touches[0] || touchStartYRef.current === null) return;
      e.preventDefault();
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartYRef.current - currentY;
      touchStartYRef.current = currentY;
      const clampedDelta = Math.max(-80, Math.min(80, deltaY));
      const rawNext = Math.max(0, Math.min(1, targetProgress.get() + clampedDelta * 0.0018));
      const next = rawNext >= 0.90 && deltaY > 0 ? 1 : rawNext;
      targetProgress.set(next);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (scrollUnlocked) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        const cur = targetProgress.get();
        const nextStop = STAGE_STOPS.find((s) => s > cur + 0.03) ?? 1.0;
        targetProgress.set(nextStop);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        const cur = targetProgress.get();
        const prevStop = [...STAGE_STOPS].reverse().find((s) => s < cur - 0.03) ?? 0.0;
        targetProgress.set(prevStop);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scrollUnlocked, targetProgress]);

  const handleJumpToIntroProgress = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(1, target));
      targetProgress.set(clamped >= 0.90 ? 1 : clamped);
      if (clamped >= 0.90) {
        smoothProgress.set(1);
        setIntroPhase("complete");
      }
    },
    [targetProgress, smoothProgress]
  );

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

  const isNavbarAndHeroVisible =
    introPhase === "hero-initial" || introPhase === "complete";
  const isFullWebsiteVisible = introPhase === "complete";

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300"
      onClickCapture={handleUnauthenticatedInteraction}
      onChangeCapture={handleUnauthenticatedInteraction}
    >
      {/* 1. Global Navigation Header — Visible initially & on complete; invisible during DSA -> VIZ -> CO spotlight */}
      <motion.div
        initial={false}
        animate={{
          opacity: isNavbarAndHeroVisible ? 1 : 0,
          y: isNavbarAndHeroVisible ? 0 : -14,
        }}
        transition={{
          duration: 0.42,
          delay: isNavbarAndHeroVisible ? 0 : 0.08,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`sticky top-0 w-full ${
          scrollUnlocked ? "z-40" : "z-30"
        } ${
          isNavbarAndHeroVisible ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <SiteHeader hideBrandLogo={navbarLogoDetached} />
      </motion.div>

      <main id="main-content" className="flex-1">
        {/* 2. Static Hero Section */}
        <LandingHero
          introPhase={introPhase}
          introProgress={introProgress}
          onJumpToIntroProgress={handleJumpToIntroProgress}
        />

        {/* Rest of the website — appears once the logo returns to the top-left of the navbar */}
        <motion.div
          initial={false}
          animate={{
            opacity: isFullWebsiteVisible ? 1 : 0,
          }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={isFullWebsiteVisible ? "pointer-events-auto" : "pointer-events-none"}
        >
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
        </motion.div>
      </main>

      {/* Universal Accessible Site Footer with Legal, Cookie Preferences & Disclaimers */}
      <motion.div
        initial={false}
        animate={{ opacity: isFullWebsiteVisible ? 1 : 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={isFullWebsiteVisible ? "pointer-events-auto" : "pointer-events-none"}
      >
        <SiteFooter />
      </motion.div>
    </div>
  );
}

export default LandingPage;

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";
import { Shield, Sparkles, Scale, Lock, Cookie, ArrowUp, Activity, Code2, BookOpen, ExternalLink } from "lucide-react";
import { CookiePreferencesModal } from "@/components/legal/CookiePreferencesModal";

export function SiteFooter() {
  const [cookieModalOpen, setCookieModalOpen] = useState(false);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <footer
        role="contentinfo"
        aria-label="Site Footer"
        className="mt-auto border-t border-border/60 bg-card/60 px-4 sm:px-8 lg:px-12 py-14 backdrop-blur-2xl relative overflow-hidden"
      >
        {/* Ambient Top Glow Line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand, Mission & Status Column */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 font-display text-2xl text-foreground font-black group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary rounded-lg w-fit"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                <DsavizcoLogo className="size-5.5 text-primary-foreground" showShadow={false} interactive={false} />
              </div>
              <span>
                dsa<span className="gradient-text">.viz.co</span>
              </span>
            </Link>

            <p className="font-sans text-xs text-muted-foreground leading-relaxed max-w-sm">
              Interactive computer science education platform. Step through 1,500+ classic data structures and algorithmic problems with deterministic memory pointer traces, step-by-step dry runs, and sandboxed C++ execution.
            </p>

            {/* Operational & Security Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold text-emerald-400">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
                <span>Visualizer Engines Ready</span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] font-bold text-primary">
                <Shield className="size-3" />
                <span>HTTPS &amp; AES-256-GCM Protected</span>
              </div>
            </div>
          </div>

          {/* Navigation Links Grid */}
          <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            {/* Column 1: Platform */}
            <div className="flex flex-col gap-3">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                Platform
              </h3>
              <nav aria-label="Platform Links" className="flex flex-col gap-2.5">
                <Link to="/problems" className="text-muted-foreground hover:text-primary transition-colors">
                  Problem Catalog (1,500+)
                </Link>
                <Link to={"/sheets" as any} className="text-muted-foreground hover:text-primary transition-colors">
                  Curated DSA Sheets
                </Link>
                <Link to="/playground" className="text-muted-foreground hover:text-primary transition-colors">
                  Interactive Playground
                </Link>
                <Link to="/compiler" className="text-muted-foreground hover:text-primary transition-colors">
                  C++20 Compiler Sandbox
                </Link>
                <Link to={"/live-interview" as any} className="text-muted-foreground hover:text-primary transition-colors">
                  Live Interview Simulator
                </Link>
              </nav>
            </div>

            {/* Column 2: Account & Settings */}
            <div className="flex flex-col gap-3">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                Account &amp; Work
              </h3>
              <nav aria-label="Account Navigation" className="flex flex-col gap-2.5">
                <Link to={"/profile" as any} className="text-muted-foreground hover:text-primary transition-colors">
                  Profile &amp; Telemetry Hub
                </Link>
                <Link to="/auth" className="text-muted-foreground hover:text-primary transition-colors">
                  Sign In with Google
                </Link>
              </nav>
            </div>

            {/* Column 3: Legal, Trust & Privacy */}
            <div className="flex flex-col gap-3 col-span-2 sm:col-span-1">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Scale className="size-3.5 text-primary" />
                <span>Legal &amp; Privacy</span>
              </h3>
              <nav aria-label="Legal and Privacy Links" className="flex flex-col gap-2.5">
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  Terms &amp; Fair Use Notice
                </Link>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  Privacy &amp; Security Policy
                </Link>
                <Link to="/cookies" className="text-muted-foreground hover:text-primary transition-colors">
                  Cookie &amp; Storage Policy
                </Link>
                <button
                  type="button"
                  onClick={() => setCookieModalOpen(true)}
                  className="text-left text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-mono text-[11px]"
                  aria-label="Open cookie preferences dialog"
                >
                  <Cookie className="size-3 text-primary" />
                  <span>Cookie Preferences</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Disclaimer & Fair Use Notice */}
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-border/50 text-[11px] text-muted-foreground/80 leading-relaxed space-y-2">
          <p>
            <strong>Independent Educational Project &amp; Nominative Fair Use Notice (17 U.S.C. § 107):</strong> DSA.viz.co is an independent computer science visualization platform and is <strong>not affiliated with, endorsed by, or sponsored by</strong> LeetCode LLC, HackerRank, Inc., TakeUForward (Striver), NeetCode, Google, Meta, Amazon, Apple, Microsoft, or any other referenced entity. All third-party trademarks, company names, and curated roadmap titles (including Blind 75, Grind 75, Striver&apos;s A2Z, NeetCode 150, Love Babbar 450, Apna College, and Sean Prasad) remain the property of their respective owners and are referenced strictly under nominative and educational fair use for descriptive indexing and transformative visual pedagogy, with direct outbound links to original sources.
          </p>
          <p>
            <strong>No Outcome Guarantee &amp; Local Media Privacy:</strong> Practice ratings and AI coaching outputs are automated heuristic study aids and do not guarantee interview outcomes or employment. Mock interview webcam/microphone streams are processed exclusively in your local browser and are never recorded or uploaded.
          </p>
        </div>

        {/* Bottom Bar: Copyright & Accessibility */}
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-mono text-muted-foreground">
            © {new Date().getFullYear()} DSA.viz.co • Independent Educational Platform (17 U.S.C. § 107 Fair Use)
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-secondary/50 px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
              aria-label="Back to top of page"
            >
              <span>Back to Top</span>
              <ArrowUp className="size-3" />
            </button>
          </div>
        </div>
      </footer>

      {/* Preferences Dialog */}
      <CookiePreferencesModal
        isOpen={cookieModalOpen}
        onClose={() => setCookieModalOpen(false)}
      />
    </>
  );
}

export default SiteFooter;

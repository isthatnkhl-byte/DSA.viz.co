import { useState, useEffect, useId } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Terminal,
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  Sparkles,
  Layers,
  Code2,
  Menu,
  X,
  BookOpen,
  Search,
  Command,
  ChevronRight,
  Video,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeColorPicker } from "@/components/ThemeColorPicker";
import { QuickSearchModal } from "@/components/QuickSearchModal";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";
import { ApiKeyVaultButton } from "@/components/ApiKeyVaultModal";

interface SiteHeaderProps {
  hideBrandLogo?: boolean;
}

export function SiteHeader({ hideBrandLogo = false }: SiteHeaderProps = {}) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState("");
  const searchInputId = useId();

  // Global keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!user) {
          toast.info("Sign in with Google to search 1,500+ problems.");
          navigate({ to: "/auth" });
          return;
        }
        setSearchModalOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        if (searchModalOpen) {
          setSearchModalOpen(false);
        } else if (navDrawerOpen) {
          setNavDrawerOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navDrawerOpen, searchModalOpen, user, navigate]);

  // Prevent background scroll when navigation drawer is open
  useEffect(() => {
    if (navDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [navDrawerOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[#221E1C] text-[#EAE6DF] transition-all duration-300 shadow-md">
        {/* Top Deck: Print-Tech Industrial Bar with Dynamic Theme Bottom Rule */}
        <div className="border-b-2 border-primary bg-[#221E1C] transition-colors duration-300">
          <div className="mx-auto flex min-h-14 sm:min-h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-3 py-2">
            {/* Left: Same Brand Logo + Print-Tech Collection Label */}
            <Link
              to="/"
              className="group flex items-center gap-2.5 shrink-0 select-none min-h-[44px]"
              onClick={() => setNavDrawerOpen(false)}
            >
              <div
                id="navbar-brand-logo-slot"
                className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 text-primary"
              >
                <div
                  className={`w-full h-full ${
                    hideBrandLogo ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
                >
                  <DsavizcoLogo className="w-full h-full text-primary" showShadow={true} interactive={false} />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-black tracking-tight text-[#F5F2EB] font-display">
                    dsa<span className="text-primary font-black transition-colors duration-300">.viz.co</span>
                  </span>
                </div>
                <p className="-mt-0.5 font-mono text-[9px] sm:text-[10px] tracking-[0.12em] uppercase text-[#A39B8F] font-semibold">
                  (algorithms•visualizer•compiler)
                </p>
              </div>
            </Link>

            {/* Center: Rectangular Boxed Navigation Buttons */}
            <nav
              aria-label="Desktop Navigation"
              className="hidden md:flex items-center gap-2 lg:gap-2.5 overflow-x-auto no-scrollbar"
            >
              <Link
                to="/"
                activeOptions={{ exact: true }}
                activeProps={{
                  className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
                }}
                className="inline-flex items-center justify-center rounded-none border border-[#625B52] bg-transparent px-3.5 lg:px-4 py-2 font-mono text-[11px] lg:text-xs font-medium uppercase tracking-[0.18em] text-[#EAE6DF] transition-colors hover:border-primary hover:text-white whitespace-nowrap"
              >
                <span>OVERVIEW</span>
              </Link>

              <Link
                to="/problems"
                activeProps={{
                  className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-none border border-[#625B52] bg-transparent px-3.5 lg:px-4 py-2 font-mono text-[11px] lg:text-xs font-medium uppercase tracking-[0.18em] text-[#EAE6DF] transition-colors hover:border-primary hover:text-white whitespace-nowrap"
              >
                <span>PROBLEMS</span>
              </Link>

              <Link
                to={"/sheets" as any}
                activeProps={{
                  className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
                }}
                className="inline-flex items-center justify-center rounded-none border border-[#625B52] bg-transparent px-3.5 lg:px-4 py-2 font-mono text-[11px] lg:text-xs font-medium uppercase tracking-[0.18em] text-[#EAE6DF] transition-colors hover:border-primary hover:text-white whitespace-nowrap"
              >
                <span>DSA SHEETS</span>
              </Link>

              <Link
                to="/playground"
                activeProps={{
                  className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
                }}
                className="inline-flex items-center justify-center rounded-none border border-[#625B52] bg-transparent px-3.5 lg:px-4 py-2 font-mono text-[11px] lg:text-xs font-medium uppercase tracking-[0.18em] text-[#EAE6DF] transition-colors hover:border-primary hover:text-white whitespace-nowrap"
              >
                <span>VISUALIZER</span>
              </Link>

              <Link
                to="/compiler"
                activeProps={{
                  className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
                }}
                className="inline-flex items-center justify-center rounded-none border border-[#625B52] bg-transparent px-3.5 lg:px-4 py-2 font-mono text-[11px] lg:text-xs font-medium uppercase tracking-[0.18em] text-[#EAE6DF] transition-colors hover:border-primary hover:text-white whitespace-nowrap"
              >
                <span>COMPILER</span>
              </Link>

              <Link
                to={"/live-interview" as any}
                activeProps={{
                  className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
                }}
                className="hidden xl:inline-flex items-center justify-center rounded-none border border-[#625B52] bg-transparent px-3.5 lg:px-4 py-2 font-mono text-[11px] lg:text-xs font-medium uppercase tracking-[0.18em] text-[#EAE6DF] transition-colors hover:border-primary hover:text-white whitespace-nowrap"
              >
                <span>INTERVIEW</span>
              </Link>

              <Link
                to="/profile"
                activeProps={{
                  className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
                }}
                className="hidden lg:inline-flex items-center justify-center rounded-none border border-[#625B52] bg-transparent px-3.5 lg:px-4 py-2 font-mono text-[11px] lg:text-xs font-medium uppercase tracking-[0.18em] text-[#EAE6DF] transition-colors hover:border-primary hover:text-white whitespace-nowrap"
              >
                <span>PROFILE</span>
              </Link>
            </nav>

            {/* Right: Quick Search, Theme Picker, Account & Menu Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* 1. Quick Search Button */}
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    toast.info("Sign in with Google to search problems and roadmaps.");
                    navigate({ to: "/auth" });
                    return;
                  }
                  setSearchModalOpen(true);
                }}
                className="flex size-9 items-center justify-center rounded-none border border-[#625B52] bg-[#2C2724] text-[#EAE6DF] hover:border-primary hover:text-white transition-all shrink-0"
                aria-label="Search problems and sheets (⌘K)"
                title="Search (⌘K)"
              >
                <Search className="size-4 text-[#EAE6DF]" />
              </button>

              {/* 2 & 3. Theme & Mode Picker */}
              <div className="flex items-center">
                <ThemeColorPicker align="right" />
              </div>

              {/* 3.5. Personal Encrypted API Key Vault (BYOK) */}
              {user ? (
                <div className="flex items-center">
                  <ApiKeyVaultButton />
                </div>
              ) : null}

              {/* 4. User Account / Auth Action */}
              <div className="flex items-center">
                {user ? (
                  <Link
                    to="/profile"
                    className="flex size-9 items-center justify-center rounded-none border border-[#625B52] bg-[#2C2724] text-[#EAE6DF] transition-all hover:border-primary hover:text-white shrink-0"
                    title={user.displayName || "Profile & Settings"}
                  >
                    <UserIcon className="size-4 text-primary transition-colors duration-300" />
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-none border border-primary bg-primary px-3 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground transition-all hover:opacity-95 shrink-0"
                    title="Sign in with Google"
                  >
                    <ShieldCheck className="size-3.5 shrink-0" />
                    <span>SIGN IN</span>
                  </Link>
                )}
              </div>

              {/* 5. Comprehensive Menu Trigger Button */}
              <button
                type="button"
                onClick={() => setNavDrawerOpen(true)}
                className="flex size-9 items-center justify-center rounded-none border border-[#625B52] bg-[#2C2724] text-[#EAE6DF] hover:border-primary hover:text-white active:scale-95 transition-all cursor-pointer shrink-0"
                aria-label="Open navigation menu"
                title="Navigation Menu"
              >
                <Menu className="size-4.5 text-[#EAE6DF]" />
              </button>
            </div>
          </div>

          {/* Mobile Quick-Navigation Strip */}
          <nav
            aria-label="Mobile Navigation Strip"
            className="flex md:hidden items-center gap-2 overflow-x-auto no-scrollbar px-3 py-2 border-t border-[#3A3530] bg-[#221E1C]"
          >
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{
                className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
              }}
              className="inline-flex items-center rounded-none px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#EAE6DF] border border-[#625B52] shrink-0"
            >
              <span>OVERVIEW</span>
            </Link>
            <Link
              to="/problems"
              activeProps={{
                className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
              }}
              className="inline-flex items-center rounded-none px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#EAE6DF] border border-[#625B52] shrink-0"
            >
              <span>PROBLEMS</span>
            </Link>
            <Link
              to={"/sheets" as any}
              activeProps={{
                className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
              }}
              className="inline-flex items-center rounded-none px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#EAE6DF] border border-[#625B52] shrink-0"
            >
              <span>DSA SHEETS</span>
            </Link>
            <Link
              to="/playground"
              activeProps={{
                className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
              }}
              className="inline-flex items-center rounded-none px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#EAE6DF] border border-[#625B52] shrink-0"
            >
              <span>VISUALIZER</span>
            </Link>
            <Link
              to="/compiler"
              activeProps={{
                className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
              }}
              className="inline-flex items-center rounded-none px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#EAE6DF] border border-[#625B52] shrink-0"
            >
              <span>COMPILER</span>
            </Link>
            <Link
              to={"/live-interview" as any}
              activeProps={{
                className: "!bg-primary !text-primary-foreground !border-primary font-semibold",
              }}
              className="inline-flex items-center rounded-none px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#EAE6DF] border border-[#625B52] shrink-0"
            >
              <span>INTERVIEW</span>
            </Link>
          </nav>
        </div>

        {/* Second Deck: Sub-Header Strip with Primary & Complementary Accents */}
        <div className="bg-[#312C28] border-b border-[#1C1917] px-3 sm:px-6 lg:px-8 py-1.5">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span className="font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-primary transition-colors duration-300">
              DSA.VIZ.CO // ALGORITHMIC ENGINE
            </span>
            <span className="inline-flex items-center gap-2 font-mono text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-[#EAE6DF]">
              <span className="size-1.5 rounded-full bg-complement inline-block transition-colors duration-300" />
              <span>1,500+ INTERACTIVE PROBLEMS</span>
            </span>
          </div>
        </div>
      </header>

      {/* Quick Search Modal Component (Active on ⌘K or clicking Search button) */}
      <QuickSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Cozy, Well-Proportioned Navigation Drawer Panel Overlay */}
      {navDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Dimmer */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
            onClick={() => setNavDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Sized Comfortably for Both Android Phone and Laptop */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
            className="relative z-10 flex h-full w-full max-w-md sm:max-w-lg flex-col justify-between border-l border-border/80 bg-background/95 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl overflow-y-auto animate-in slide-in-from-right duration-250"
          >
            {/* Drawer Header: Title & Close Button */}
            <div>
              <div className="flex items-center justify-between border-b border-border/70 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-8.5 items-center justify-center rounded-xl shadow-xs text-primary-foreground"
                    style={{ backgroundImage: "var(--gradient-primary)" }}
                  >
                    <Terminal className="size-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-foreground font-display">
                      DSA<span className="gradient-text">.viz</span>
                    </h2>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      1,500+ Algorithms & Interactive Visualizers
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setNavDrawerOpen(false)}
                  className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-secondary/80 text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-foreground active:scale-95 transition-all shadow-xs cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Quick Search Shortcut inside Drawer */}
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setNavDrawerOpen(false);
                    if (!user) {
                      toast.info("Sign in with Google to search problems and roadmaps.");
                      navigate({ to: "/auth" });
                      return;
                    }
                    setSearchModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-card/80 px-3.5 py-2.5 font-mono text-xs text-muted-foreground hover:border-primary/50 hover:bg-secondary transition-all text-left shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <Search className="size-3.5 text-primary" />
                    <span>Search 1,500+ problems, roadmaps...</span>
                  </span>
                  <kbd className="rounded bg-background/90 border border-border/70 px-1.5 py-0.5 text-[9px]">
                    ⌘K
                  </kbd>
                </button>
              </div>

              {/* Navigation Links Group */}
              <div className="space-y-5">
                {/* Core Tools */}
                <div>
                  <span className="block px-1 pb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Core Learning Platforms
                  </span>
                  <div className="space-y-1.5">
                    <Link
                      to="/problems"
                      onClick={() => setNavDrawerOpen(false)}
                      activeProps={{
                        className: "border-primary/50 bg-primary/10",
                      }}
                      className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-primary/40 hover:bg-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <Layers className="size-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            Problem Catalog
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            1,500+ curated problems by pattern & company
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                    </Link>

                    <Link
                      to={"/sheets" as any}
                      onClick={() => setNavDrawerOpen(false)}
                      activeProps={{
                        className: "border-primary/50 bg-primary/10",
                      }}
                      className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-primary/40 hover:bg-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <BookOpen className="size-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            Curated DSA Sheets
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            NeetCode 150, Striver SDE, Blind 75, Grind 75
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                    </Link>

                    <Link
                      to="/playground"
                      onClick={() => setNavDrawerOpen(false)}
                      activeProps={{
                        className: "border-primary/50 bg-primary/10",
                      }}
                      className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-primary/40 hover:bg-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <Sparkles className="size-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            Interactive Visualizer
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Step-by-step array pointers, recursion & call stack
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                    </Link>

                    <Link
                      to="/compiler"
                      onClick={() => setNavDrawerOpen(false)}
                      activeProps={{
                        className: "border-emerald-500/50 bg-emerald-950/20",
                      }}
                      className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-emerald-500/40 hover:bg-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                          <Code2 className="size-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                            C++ Online Sandbox
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            In-browser C++20 compiler with standard library
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-emerald-400 transition-colors" />
                    </Link>

                    <Link
                      to={"/live-interview" as any}
                      onClick={() => setNavDrawerOpen(false)}
                      activeProps={{
                        className: "border-rose-500/50 bg-rose-950/20",
                      }}
                      className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-rose-500/40 hover:bg-secondary transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                          <Video className="size-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground group-hover:text-rose-400 transition-colors">
                            Live Interview Simulator
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Spoken AI proctor with real-time feedback
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-rose-400 transition-colors" />
                    </Link>
                  </div>
                </div>

                {/* Progress & Account */}
                <div>
                  <span className="block px-1 pb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Personal Learning &amp; Telemetry
                  </span>
                  <Link
                    to="/profile"
                    onClick={() => setNavDrawerOpen(false)}
                    className="group flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-3 hover:border-primary/40 hover:bg-secondary transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <UserIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          Profile &amp; Telemetry Hub
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          Submissions, Topic Radar, Heatmaps, AI Reports &amp; BYOK Vault
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                </div>

                {/* Legal & Privacy Compliance */}
                <div className="pt-1">
                  <span className="block px-1 pb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Legal &amp; Privacy
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 font-mono text-xs text-muted-foreground">
                    <Link
                      to="/terms"
                      onClick={() => setNavDrawerOpen(false)}
                      className="hover:text-primary transition-colors"
                    >
                      Terms of Service
                    </Link>
                    <span>•</span>
                    <Link
                      to="/privacy"
                      onClick={() => setNavDrawerOpen(false)}
                      className="hover:text-primary transition-colors"
                    >
                      Privacy Policy
                    </Link>
                    <span>•</span>
                    <Link
                      to="/cookies"
                      onClick={() => setNavDrawerOpen(false)}
                      className="hover:text-primary transition-colors"
                    >
                      Cookie Policy
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer in Drawer */}
            <div className="pt-4 border-t border-border/70 mt-6 space-y-3">
              {user ? (
                <div className="flex items-center justify-between gap-3 bg-secondary/40 rounded-xl p-2.5 border border-border/50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">
                        {user.displayName || "User"}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground truncate">
                        {user.email || "Signed in"}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNavDrawerOpen(false);
                      signOut();
                    }}
                    className="h-7.5 rounded-lg px-2.5 font-mono text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive border-border/70 shrink-0"
                  >
                    <LogOut className="size-3 mr-1" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setNavDrawerOpen(false)}
                  className="block"
                >
                  <Button className="w-full h-10 rounded-xl font-sans text-xs sm:text-sm font-bold tracking-wide shadow-xs btn-moving-theme-gradient text-white">
                    Sign In or Create Account
                  </Button>
                </Link>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-1">
                <span>Press Esc to close</span>
                <span>DSA.viz</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

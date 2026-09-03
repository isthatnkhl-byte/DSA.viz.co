import { useState, useEffect, useId } from "react";
import { Link } from "@tanstack/react-router";
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
  Flame,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeColorPicker } from "@/components/ThemeColorPicker";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState("");
  const searchInputId = useId();

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && navDrawerOpen) {
        setNavDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navDrawerOpen]);

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
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 backdrop-blur-2xl transition-all duration-300 shadow-sm shadow-black/5">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2 sm:gap-4">
        {/* Left: Brand Logo & Title with PRO Studio Badge */}
        <Link
          to="/"
          className="group flex items-center gap-2 sm:gap-3 shrink-0 select-none"
          onClick={() => setNavDrawerOpen(false)}
        >
          <div
            className="relative flex size-8 sm:size-9.5 shrink-0 items-center justify-center rounded-xl shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/40"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Terminal className="size-4 sm:size-5 text-primary-foreground transition-transform duration-300 group-hover:rotate-6" />
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-foreground font-display">
                DSA<span className="gradient-text">.viz.co</span>
              </span>
              <span className="hidden sm:inline-flex items-center rounded-full border border-primary/40 bg-primary/15 px-2 py-0.2 font-mono text-[9px] font-extrabold uppercase tracking-wider text-primary shadow-xs">
                PRO STUDIO
              </span>
            </div>
            <p className="-mt-0.5 hidden xl:block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
              1500+ Algorithms • Interactive Visualizer • C++20 Sandbox
            </p>
          </div>
        </Link>

        {/* Center: Main Navigation Capsule (Desktop & Laptop) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 rounded-full border border-border/80 bg-card/75 px-2 py-1 shadow-md shadow-black/10 backdrop-blur-xl">
          <Link
            to="/problems"
            activeProps={{
              className: "bg-primary/20 text-primary font-bold border-primary/40 shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <Layers className="size-3.5 text-primary shrink-0" />
            <span>Problems</span>
            <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9px] font-bold text-primary">
              1500+
            </span>
          </Link>

          <Link
            to={"/sheets" as any}
            activeProps={{
              className: "bg-primary/20 text-primary font-bold border-primary/40 shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <BookOpen className="size-3.5 text-primary shrink-0" />
            <span>DSA Sheets</span>
          </Link>

          <Link
            to="/playground"
            activeProps={{
              className: "bg-primary/20 text-primary font-bold border-primary/40 shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span>Playground</span>
          </Link>

          <Link
            to="/compiler"
            activeProps={{
              className: "bg-emerald-500/15 text-emerald-400 font-bold border-emerald-500/40 shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <Code2 className="size-3.5 text-emerald-400 shrink-0" />
            <span>C++ Compiler</span>
            <span className="hidden xl:inline rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
              C++20
            </span>
          </Link>
        </nav>

        {/* Right: Search, Theme Picker, Auth & Prominent 3-Lines Navigation Button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Problem Search Trigger */}
          <Link
            to="/problems"
            className="hidden lg:flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-foreground transition-all shadow-xs"
            title="Search all 1500+ algorithms"
          >
            <Search className="size-3.5 text-primary" />
            <span className="hidden xl:inline">Quick Find</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 rounded bg-background/80 border border-border/70 px-1.5 py-0.5 text-[9px] text-muted-foreground">
              <Command className="size-2.5" /> K
            </kbd>
          </Link>

          {/* Theme & Mode Switcher */}
          <div className="flex items-center">
            <ThemeColorPicker align="right" />
          </div>

          {/* User Account / Auth Actions (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center gap-1.5">
            {user ? (
              <div className="flex items-center gap-1">
                <Link
                  to="/dashboard"
                  activeProps={{
                    className: "bg-primary/15 text-primary border-primary/40 shadow-xs font-bold",
                  }}
                  className="hidden lg:flex items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
                >
                  <LayoutDashboard className="size-3.5" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/profile"
                  activeProps={{
                    className: "bg-primary/15 text-primary border-primary/40 shadow-xs font-bold",
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 px-2.5 py-1.5 font-mono text-xs font-medium text-foreground transition-all hover:bg-secondary hover:border-primary/40 active:scale-95 shadow-xs"
                >
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                  <UserIcon className="size-3.5" />
                  <span className="hidden md:inline max-w-[90px] truncate">{user.displayName || "Profile"}</span>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="size-8.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 shrink-0"
                >
                  <LogOut className="size-3.5" />
                </Button>
              </div>
            ) : loading ? null : (
              <Link to="/auth">
                <Button
                  size="sm"
                  className="h-8.5 rounded-xl px-3.5 font-sans text-sm font-bold tracking-wide shadow-md shadow-primary/25 transition-all hover:scale-105 active:scale-95 btn-moving-theme-gradient text-white"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Prominent 3-Lines Navigation Menu Trigger Button (Visible, Big & Accessible on ALL Viewports) */}
          <button
            type="button"
            onClick={() => setNavDrawerOpen(true)}
            className="flex h-10 sm:h-11 px-3 sm:px-3.5 items-center gap-2 rounded-xl border border-border/90 bg-card/95 text-foreground hover:border-primary/60 hover:bg-secondary active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer group"
            aria-label="Open comprehensive navigation panel"
            title="Expand Navigation Menu"
          >
            {/* High-visibility 3-lines icon */}
            <Menu className="size-5.5 sm:size-6 text-primary group-hover:scale-110 transition-transform duration-200 shrink-0" />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-tight text-foreground hidden xs:inline">
              Menu
            </span>
          </button>
        </div>
      </div>

      {/* Spacious Full-Featured Navigation Drawer Panel Overlay */}
      {navDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Dimmer */}
          <div
            className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
            onClick={() => setNavDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Expandable Navigation Slide-Over Drawer (Generous, visible, readable width) */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Full Navigation Hub"
            className="relative z-10 flex h-full w-full max-w-full sm:max-w-[560px] md:max-w-[700px] lg:max-w-[820px] xl:max-w-[900px] flex-col justify-between border-l border-border/80 bg-background/98 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
          >
            {/* Top Bar: Title & Large Close Button */}
            <div className="flex items-center justify-between border-b border-border/70 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex size-9 items-center justify-center rounded-xl shadow-md text-primary-foreground"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  <Terminal className="size-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground font-display">
                    DSA<span className="gradient-text">.viz</span> Navigation
                  </h2>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    1500+ Algorithms & Interactive Learning
                  </p>
                </div>
              </div>

              {/* Prominent Close Button */}
              <button
                type="button"
                onClick={() => setNavDrawerOpen(false)}
                className="flex size-9 sm:size-10 items-center justify-center rounded-xl border border-border/80 bg-secondary/80 text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-foreground active:scale-95 transition-all shadow-xs cursor-pointer"
                aria-label="Close navigation panel"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Interactive Search Bar inside the Navigation Panel */}
            <div className="mb-5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id={searchInputId}
                  type="text"
                  placeholder="Quick find topics, sheets, problems..."
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-card/80 pl-10 pr-4 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/25 transition-all"
                />
              </div>
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 space-y-6">
              {/* Section 1: Main DSA Tools */}
              <div>
                <span className="block px-1 pb-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Core Platforms & Sandboxes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    to="/problems"
                    onClick={() => setNavDrawerOpen(false)}
                    activeProps={{
                      className: "border-primary/60 bg-primary/10 shadow-sm",
                    }}
                    className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 hover:border-primary/50 hover:bg-secondary transition-all active:scale-[0.99]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary group-hover:scale-105 transition-transform">
                      <Layers className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          Problem Catalog
                        </span>
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          1,500+ Items
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Filter by difficulty, FAANG company, and data structure topics.
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                  </Link>

                  <Link
                    to={"/sheets" as any}
                    onClick={() => setNavDrawerOpen(false)}
                    activeProps={{
                      className: "border-primary/60 bg-primary/10 shadow-sm",
                    }}
                    className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 hover:border-primary/50 hover:bg-secondary transition-all active:scale-[0.99]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary group-hover:scale-105 transition-transform">
                      <BookOpen className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          Curated DSA Sheets
                        </span>
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          Roadmaps
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        NeetCode 150, Striver&apos;s SDE, Blind 75, Grind 75, Babbar 450.
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                  </Link>

                  <Link
                    to="/playground"
                    onClick={() => setNavDrawerOpen(false)}
                    activeProps={{
                      className: "border-primary/60 bg-primary/10 shadow-sm",
                    }}
                    className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 hover:border-primary/50 hover:bg-secondary transition-all active:scale-[0.99]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary group-hover:scale-105 transition-transform">
                      <Sparkles className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          Interactive Visualizer
                        </span>
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          60 FPS
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Step-by-step state machine with call stack and variable telemetry.
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                  </Link>

                  <Link
                    to="/compiler"
                    onClick={() => setNavDrawerOpen(false)}
                    activeProps={{
                      className: "border-emerald-500/60 bg-emerald-950/20 shadow-sm",
                    }}
                    className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 hover:border-emerald-500/50 hover:bg-secondary transition-all active:scale-[0.99]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 group-hover:scale-105 transition-transform">
                      <Code2 className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                          C++ Online Compiler
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                          C++20
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Zero-install cloud compiler with STL snippets and benchmark metrics.
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all mt-1" />
                  </Link>
                </div>
              </div>

              {/* Section 2: User Account & Diagnostic Tracking */}
              <div>
                <span className="block px-1 pb-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Analytics & Intelligence
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    to="/dashboard"
                    onClick={() => setNavDrawerOpen(false)}
                    activeProps={{
                      className: "border-primary/60 bg-primary/10 shadow-sm",
                    }}
                    className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 hover:border-primary/50 hover:bg-secondary transition-all active:scale-[0.99]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary group-hover:scale-105 transition-transform">
                      <LayoutDashboard className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          Progress Dashboard
                        </span>
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                          AI Diagnostics
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Review solved counts, topic mastery radar, and AI mistake trends.
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setNavDrawerOpen(false)}
                    activeProps={{
                      className: "border-primary/60 bg-primary/10 shadow-sm",
                    }}
                    className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 hover:border-primary/50 hover:bg-secondary transition-all active:scale-[0.99]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary group-hover:scale-105 transition-transform">
                      <UserIcon className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          User Profile & Settings
                        </span>
                        {user ? (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                            Guest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        Account preferences, synced cloud state, and study goals.
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom Footer Action Area */}
            <div className="pt-6 border-t border-border/70 mt-6 space-y-3">
              {user ? (
                <div className="flex items-center justify-between gap-3 bg-secondary/50 rounded-2xl p-3 border border-border/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8.5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">
                        {user.displayName || "DSA Engineer"}
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
                    className="h-8 rounded-xl px-2.5 font-mono text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive border-border/80 shrink-0"
                  >
                    <LogOut className="size-3.5 mr-1" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setNavDrawerOpen(false)}
                  className="block"
                >
                  <Button className="w-full h-10.5 rounded-xl font-sans text-sm font-bold tracking-wide shadow-lg btn-moving-theme-gradient text-white">
                    Sign In or Create Free Account
                  </Button>
                </Link>
              )}

              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
                <span>Press &apos;Esc&apos; to close</span>
                <span>DSA.viz.co PRO</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}



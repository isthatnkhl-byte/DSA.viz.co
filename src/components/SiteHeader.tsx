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
  Video,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeColorPicker } from "@/components/ThemeColorPicker";
import { QuickSearchModal } from "@/components/QuickSearchModal";
import { DsavizcoLogo } from "@/components/brand/DsavizcoLogo";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [navSearchQuery, setNavSearchQuery] = useState("");
  const searchInputId = useId();

  // Global keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
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
  }, [navDrawerOpen, searchModalOpen]);

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
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-xl transition-all duration-300 shadow-xs">
        {/* Main Navbar Bar */}
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2 sm:gap-4">
          {/* Left: Brand Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 shrink-0 select-none min-h-[44px]"
            onClick={() => setNavDrawerOpen(false)}
          >
            <div
              className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 text-primary"
            >
              <DsavizcoLogo className="w-full h-full text-primary" showShadow={true} interactive={false} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-foreground font-display">
                  dsa<span className="text-primary font-black">.viz.co</span>
                </span>
              </div>
              <p className="-mt-0.5 font-mono text-[9px] sm:text-[10px] tracking-tight text-muted-foreground font-semibold">
                (algorithms•visualizer•compiler)
              </p>
            </div>
          </Link>

          {/* Center: Main Navigation Capsule (Laptop & Desktop) */}
          <nav
            aria-label="Desktop Navigation"
            className="hidden md:flex items-center gap-1 lg:gap-1.5 rounded-full border border-border/80 bg-card/75 px-2 py-1 shadow-xs backdrop-blur-xl"
          >
            <Link
              to="/problems"
              activeProps={{
                className: "bg-primary/15 text-primary font-bold border-primary/30 shadow-xs",
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
                className: "bg-primary/15 text-primary font-bold border-primary/30 shadow-xs",
              }}
              className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <BookOpen className="size-3.5 text-primary shrink-0" />
              <span>DSA Sheets</span>
            </Link>

            <Link
              to="/playground"
              activeProps={{
                className: "bg-primary/15 text-primary font-bold border-primary/30 shadow-xs",
              }}
              className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <Sparkles className="size-3.5 text-primary shrink-0" />
              <span>Visualizer</span>
            </Link>

            <Link
              to="/compiler"
              activeProps={{
                className: "bg-emerald-500/15 text-emerald-400 font-bold border-emerald-500/30 shadow-xs",
              }}
              className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <Code2 className="size-3.5 text-emerald-400 shrink-0" />
              <span>C++ Compiler</span>
            </Link>

            <Link
              to={"/live-interview" as any}
              activeProps={{
                className: "bg-rose-500/15 text-rose-400 font-bold border-rose-500/30 shadow-xs",
              }}
              className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <Video className="size-3.5 text-rose-400 shrink-0" />
              <span>Interview</span>
            </Link>

            <Link
              to="/dashboard"
              activeProps={{
                className: "bg-primary/15 text-primary font-bold border-primary/30 shadow-xs",
              }}
              className="flex items-center gap-1.5 rounded-full px-3 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              <LayoutDashboard className="size-3.5 text-primary shrink-0" />
              <span>Dashboard</span>
            </Link>
          </nav>

          {/* Right: Quick Search, Theme Picker, Account & Menu Button (5 Circular Icon Buttons matching reference) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 1. Quick Search Button */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex size-9 items-center justify-center rounded-full border border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:bg-secondary hover:text-foreground transition-all shadow-xs shrink-0"
              aria-label="Search problems and sheets (⌘K)"
              title="Search (⌘K)"
            >
              <Search className="size-4 text-foreground/80" />
            </button>

            {/* 2 & 3. Theme & Mode Picker (Sun/Moon and Palette Circle Buttons) */}
            <div className="flex items-center">
              <ThemeColorPicker align="right" />
            </div>

            {/* 4. User Account / Auth Action (Circular Icon Button) */}
            <div className="flex items-center">
              {user ? (
                <Link
                  to="/profile"
                  className="flex size-9 items-center justify-center rounded-full border border-border/80 bg-card/60 text-muted-foreground transition-all hover:bg-secondary hover:border-primary/40 shadow-xs shrink-0"
                  title={user.displayName || "Profile & Settings"}
                >
                  <UserIcon className="size-4 text-primary" />
                </Link>
              ) : (
                <Link
                  to="/auth"
                  className="flex size-9 items-center justify-center rounded-full border border-border/80 bg-card/60 text-muted-foreground transition-all hover:bg-secondary hover:border-primary/40 shadow-xs shrink-0"
                  title="Sign In / Account"
                >
                  <UserIcon className="size-4 text-foreground/80" />
                </Link>
              )}
            </div>

            {/* 5. Comprehensive Menu Trigger Button (Circular Icon Button) */}
            <button
              type="button"
              onClick={() => setNavDrawerOpen(true)}
              className="flex size-9 items-center justify-center rounded-full border border-border/80 bg-card/80 text-foreground hover:border-primary/50 hover:bg-secondary active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
              aria-label="Open navigation menu"
              title="Navigation Menu"
            >
              <Menu className="size-4.5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Android Screen / Mobile Quick-Navigation Strip (Exact match to reference screenshot) */}
        <nav
          aria-label="Mobile Navigation Strip"
          className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2 border-t border-border/60 bg-background/95 backdrop-blur-md"
        >
          <Link
            to="/problems"
            activeProps={{
              className: "bg-primary text-primary-foreground font-bold shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold text-foreground bg-card/80 border border-border/80 shrink-0 hover:bg-secondary active:scale-95 transition-all shadow-2xs"
          >
            <Layers className="size-3.5 text-primary shrink-0" />
            <span>Problems</span>
          </Link>

          <Link
            to={"/sheets" as any}
            activeProps={{
              className: "bg-primary text-primary-foreground font-bold shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold text-foreground bg-card/80 border border-border/80 shrink-0 hover:bg-secondary active:scale-95 transition-all shadow-2xs"
          >
            <BookOpen className="size-3.5 text-primary shrink-0" />
            <span>DSA Sheets</span>
          </Link>

          <Link
            to="/playground"
            activeProps={{
              className: "bg-primary text-primary-foreground font-bold shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold text-foreground bg-card/80 border border-border/80 shrink-0 hover:bg-secondary active:scale-95 transition-all shadow-2xs"
          >
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span>Visualizer</span>
          </Link>

          <Link
            to="/compiler"
            activeProps={{
              className: "bg-emerald-500 text-white font-bold shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold text-foreground bg-card/80 border border-border/80 shrink-0 hover:bg-secondary active:scale-95 transition-all shadow-2xs"
          >
            <Code2 className="size-3.5 text-emerald-500 shrink-0" />
            <span>Compiler</span>
          </Link>

          <Link
            to={"/live-interview" as any}
            activeProps={{
              className: "bg-rose-500 text-white font-bold shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold text-foreground bg-card/80 border border-border/80 shrink-0 hover:bg-secondary active:scale-95 transition-all shadow-2xs"
          >
            <Video className="size-3.5 text-rose-500 shrink-0" />
            <span>Interview</span>
          </Link>

          <Link
            to="/dashboard"
            activeProps={{
              className: "bg-primary text-primary-foreground font-bold shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] font-medium text-muted-foreground bg-secondary/50 border border-border/50 shrink-0 active:scale-95 transition-all"
          >
            <LayoutDashboard className="size-3 text-primary shrink-0" />
            <span>Dashboard</span>
          </Link>
        </nav>
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
                    Personal Learning
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setNavDrawerOpen(false)}
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-primary/40 hover:bg-secondary transition-all"
                    >
                      <LayoutDashboard className="size-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">Dashboard</div>
                        <div className="text-[10px] text-muted-foreground truncate">Solved counts</div>
                      </div>
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setNavDrawerOpen(false)}
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-primary/40 hover:bg-secondary transition-all"
                    >
                      <UserIcon className="size-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">Profile</div>
                        <div className="text-[10px] text-muted-foreground truncate">Preferences</div>
                      </div>
                    </Link>
                  </div>
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

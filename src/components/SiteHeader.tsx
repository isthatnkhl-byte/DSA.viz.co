import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeColorPicker } from "@/components/ThemeColorPicker";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on resize to desktop/laptop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-xl transition-all duration-200">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-2 sm:gap-4">
        {/* Left: Brand Logo & Title */}
        <Link
          to="/"
          className="group flex items-center gap-2 sm:gap-3 shrink-0 select-none"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="relative flex size-8 sm:size-9.5 shrink-0 items-center justify-center rounded-xl shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/30"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Terminal className="size-4 sm:size-5 text-primary-foreground transition-transform duration-300 group-hover:rotate-6" />
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black tracking-tight text-foreground">
                DSA<span className="gradient-text">.viz.co</span>
              </span>
            </div>
            <p className="-mt-0.5 hidden xl:block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
              1500+ Algorithms • Visualizer • C++ IDE
            </p>
          </div>
        </Link>

        {/* Center: Main Navigation Capsule (Desktop & Laptop) */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 rounded-full border border-border/70 bg-card/60 px-1.5 py-1 shadow-xs backdrop-blur-md">
          <Link
            to="/problems"
            activeProps={{
              className: "bg-primary/20 text-primary font-bold border-primary/30 shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-2.5 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
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
              className: "bg-primary/20 text-primary font-bold border-primary/30 shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-2.5 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <BookOpen className="size-3.5 text-primary shrink-0" />
            <span>DSA Sheets</span>
          </Link>

          <Link
            to="/playground"
            activeProps={{
              className: "bg-primary/20 text-primary font-bold border-primary/30 shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-2.5 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span>Playground</span>
          </Link>

          <Link
            to="/compiler"
            activeProps={{
              className: "bg-emerald-500/15 text-emerald-400 font-bold border-emerald-500/30 shadow-xs",
            }}
            className="flex items-center gap-1.5 rounded-full px-2.5 lg:px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
          >
            <Code2 className="size-3.5 text-emerald-400 shrink-0" />
            <span>C++ Compiler</span>
            <span className="hidden xl:inline rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
              C++20
            </span>
          </Link>
        </nav>

        {/* Right: Theme Picker & Authentication Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
                  className="hidden lg:flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
                >
                  <LayoutDashboard className="size-3.5" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/profile"
                  activeProps={{
                    className: "bg-primary/15 text-primary border-primary/40 shadow-xs font-bold",
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
                >
                  <UserIcon className="size-3.5" />
                  <span className="hidden md:inline">Profile</span>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 shrink-0"
                >
                  <LogOut className="size-3.5" />
                </Button>
              </div>
            ) : loading ? null : (
              <Link to="/auth">
                <Button
                  size="sm"
                  className="h-8 rounded-xl px-3.5 font-mono text-xs font-bold shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="flex size-8 sm:size-8.5 items-center justify-center rounded-xl border border-border/80 bg-card/80 text-muted-foreground hover:text-foreground md:hidden active:scale-95 transition-all shadow-xs shrink-0"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-14 sm:top-16 bottom-0 z-50 bg-background/95 backdrop-blur-2xl md:hidden overflow-y-auto p-4 flex flex-col justify-between border-t border-border/70 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-1.5">
            <span className="px-3 pb-1 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Navigation
            </span>

            <Link
              to="/problems"
              onClick={() => setMobileMenuOpen(false)}
              activeProps={{
                className: "bg-primary/20 text-primary font-bold border-primary/30",
              }}
              className="flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Layers className="size-4 text-primary" />
                <span>Problem Catalog</span>
              </span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary font-bold">
                1500+
              </span>
            </Link>

            <Link
              to={"/sheets" as any}
              onClick={() => setMobileMenuOpen(false)}
              activeProps={{
                className: "bg-primary/20 text-primary font-bold border-primary/30",
              }}
              className="flex items-center gap-2.5 rounded-xl border border-transparent px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
            >
              <BookOpen className="size-4 text-primary" />
              <span>Curated DSA Sheets</span>
            </Link>

            <Link
              to="/playground"
              onClick={() => setMobileMenuOpen(false)}
              activeProps={{
                className: "bg-primary/20 text-primary font-bold border-primary/30",
              }}
              className="flex items-center gap-2.5 rounded-xl border border-transparent px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
            >
              <Sparkles className="size-4 text-primary" />
              <span>Interactive Playground</span>
            </Link>

            <Link
              to="/compiler"
              onClick={() => setMobileMenuOpen(false)}
              activeProps={{
                className: "bg-emerald-500/15 text-emerald-400 font-bold border-emerald-500/30",
              }}
              className="flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Code2 className="size-4 text-emerald-400" />
                <span>Online C++ Compiler</span>
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">
                C++20
              </span>
            </Link>

            <div className="my-2 border-t border-border/60" />

            {/* Account & Profile */}
            <span className="px-3 pb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Account
            </span>

            {user ? (
              <div className="flex flex-col gap-1">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-mono text-xs text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
                >
                  <LayoutDashboard className="size-4 text-primary" />
                  <span>Dashboard & Progress</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-mono text-xs text-foreground hover:bg-secondary active:scale-[0.98] transition-all"
                >
                  <UserIcon className="size-4 text-primary" />
                  <span>User Profile & Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 font-mono text-xs text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all text-left"
                >
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="px-1 pt-1">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full rounded-xl py-2.5 font-mono text-xs font-bold shadow-md bg-primary text-primary-foreground">
                    Sign In / Register
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="pt-6 pb-2 text-center font-mono text-[10px] text-muted-foreground">
            DSA.viz.co • 1500+ Algorithms & Interactive Sandbox
          </div>
        </div>
      )}
    </header>
  );
}


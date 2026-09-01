import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
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
import { toast } from "sonner";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

      

  return (
    <header className="glass sticky top-0 z-50 border-x-0 border-t-0 border-b border-border/80 px-4 py-2.5 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
        <Link
          to="/"
          className="group flex items-center gap-3 shrink-0"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="relative flex size-9.5 sm:size-10 shrink-0 items-center justify-center rounded-xl shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/30"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Terminal className="size-5 text-primary-foreground transition-transform duration-300 group-hover:rotate-6" />
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                DSA<span className="gradient-text">.viz.co</span>
              </h1>
            </div>
            <p className="-mt-0.5 hidden sm:block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              1500+ Algorithms • Visualization • Compiler
            </p>
          </div>
        </Link>

        {/* Center: Main Navigation Capsule (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-border/70 bg-card/70 px-2 py-1 shadow-xs backdrop-blur-md">
          {user && (
            <>
              <Link
                to="/problems"
                activeProps={{
                  className: "bg-primary/20 text-primary font-bold border-primary/30",
                }}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
              >
                <Layers className="size-3.5 text-primary" />
                <span>Problems</span>
                <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                  1500+
                </span>
              </Link>
              <Link
                to={"/sheets" as any}
                activeProps={{
                  className: "bg-primary/20 text-primary font-bold border-primary/30",
                }}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
              >
                <BookOpen className="size-3.5 text-primary" />
                <span>DSA Sheets</span>
              </Link>
              <Link
                to="/playground"
                activeProps={{
                  className: "bg-primary/20 text-primary font-bold border-primary/30",
                }}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
              >
                <Sparkles className="size-3.5 text-primary" />
                <span>Playground</span>
              </Link>
              <Link
                to="/compiler"
                activeProps={{
                  className: "bg-emerald-500/15 text-emerald-400 font-bold border-emerald-500/30",
                }}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
              >
                <Code2 className="size-3.5 text-emerald-400" />
                <span>C++ Compiler</span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                  C++
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* Right: Theme Picker & Authentication Cluster */}
        <div className="flex items-center gap-2">
          {/* Integrated Theme & Mode Switcher */}
          <div className="flex items-center rounded-xl border border-border/70 bg-card/70 p-1 shadow-xs backdrop-blur-md">
            <ThemeColorPicker align="right" />
          </div>

          {/* User Account / Auth Actions */}
          <div className="hidden sm:flex items-center gap-1.5">
            {user ? (
              <div className="flex items-center gap-1">
                <Link
                  to="/dashboard"
                  activeProps={{
                    className: "bg-primary/15 text-primary border-primary/40 shadow-xs font-bold",
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
                >
                  <LayoutDashboard className="size-3.5" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/profile"
                  activeProps={{
                    className: "bg-primary/15 text-primary border-primary/40 shadow-xs font-bold",
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
                >
                  <UserIcon className="size-3.5" />
                  <span>Profile</span>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  aria-label="Sign out"
                  className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : loading ? null : (
              <Link to="/auth">
                <Button
                  size="sm"
                  className="h-8 rounded-xl px-4 font-mono text-xs font-bold shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground"
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
            className="flex size-8.5 items-center justify-center rounded-xl border border-border/80 bg-card/80 text-muted-foreground hover:text-foreground md:hidden active:scale-95 transition-all shadow-xs"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-xl md:hidden animate-fade">
          {user && (
            <>
              <Link
                to="/problems"
                onClick={() => setMobileMenuOpen(false)}
                activeProps={{
                  className: "bg-primary/20 text-primary font-bold border-primary/30",
                }}
                className="flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-all"
              >
                <span className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <span>Problems</span>
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
                className="flex items-center gap-2 rounded-xl border border-transparent px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-all"
              >
                <BookOpen className="size-4 text-primary" />
                <span>DSA Sheets</span>
              </Link>
              <Link
                to="/playground"
                onClick={() => setMobileMenuOpen(false)}
                activeProps={{
                  className: "bg-primary/20 text-primary font-bold border-primary/30",
                }}
                className="flex items-center gap-2 rounded-xl border border-transparent px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-all"
              >
                <Sparkles className="size-4 text-primary" />
                <span>Playground</span>
              </Link>
              <Link
                to="/compiler"
                onClick={() => setMobileMenuOpen(false)}
                activeProps={{
                  className: "bg-emerald-500/15 text-emerald-400 font-bold border-emerald-500/30",
                }}
                className="flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-all"
              >
                <span className="flex items-center gap-2">
                  <Code2 className="size-4 text-emerald-400" />
                  <span>Online C++ Compiler</span>
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-bold">
                  C++20
                </span>
              </Link>
            </>
          )}

          <div className="my-1 border-t border-border/60" />

          {/* Auth in Mobile Menu */}
          {user ? (
            <div className="flex flex-col gap-1.5 pt-1">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <LayoutDashboard className="size-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <UserIcon className="size-4" />
                <span>Profile</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs text-destructive hover:bg-destructive/10 transition-all text-left"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="mt-1 cursor-pointer"
            >
              <Link to="/auth">
                <Button className="w-full rounded-xl py-2.5 font-mono text-xs font-bold shadow-md bg-primary text-primary-foreground">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

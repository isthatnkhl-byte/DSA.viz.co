import { SingleLineBagIcon } from "@/components/notes/SingleLineBagIcon";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { AiWord } from "@/components/brand/AiWord";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  X,
  Layers,
  BookOpen,
  Code2,
  ArrowRight,
  Video,
  CornerDownLeft,
} from "lucide-react";
import { problems, type Problem } from "@/lib/problems";

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOP_SHEETS = [
  { name: "NeetCode 150", slug: "neetcode-150", count: "150 problems" },
  { name: "Striver's SDE Sheet", slug: "striver-sde", count: "191 problems" },
  { name: "Blind 75", slug: "blind-75", count: "75 problems" },
  { name: "Grind 75", slug: "grind-75", count: "75 problems" },
];

const CORE_PLATFORMS = [
  { name: "AI Notes & Handwritten PDF", to: "/ai-notes", icon: SingleLineBagIcon, desc: "Multi-page handwritten revision notes compiler" },
  { name: "AI Learning Whiteboard", to: "/ai-learning", icon: AiWord, desc: "Full-screen Excalidraw AI Co-Teacher & live simulation" },
  { name: "Interactive Visualizer", to: "/playground", icon: AiWord, desc: "Step-by-step algorithm trace sandbox" },
  { name: "Problem Catalog", to: "/problems", icon: Layers, desc: "1,500+ company-tagged problems" },
  { name: "C++ Online Compiler", to: "/compiler", icon: Code2, desc: "C++20 in-browser execution with STL" },
  { name: "Curated DSA Sheets", to: "/sheets", icon: BookOpen, desc: "Roadmaps from beginner to FAANG" },
  { name: "Live Interview Simulator", to: "/live-interview", icon: Video, desc: "Mock technical interview with audio" },
];

export function QuickSearchModal({ isOpen, onClose }: QuickSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when opened
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedIndex(0);
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter problems
  const filteredProblems = useMemo(() => {
    if (!query.trim()) {
      return problems.slice(0, 8);
    }
    const q = query.toLowerCase().trim();
    return problems
      .filter((p) => {
        return (
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.topics.some((t) => t.toLowerCase().includes(q)) ||
          p.companies?.some((c) => c.toLowerCase().includes(q))
        );
      })
      .slice(0, 12);
  }, [query]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-modal-overlay="true"
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 md:p-10"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Search"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-2xl transition-all animate-in zoom-in-95 duration-200 mt-6 sm:mt-12 max-h-[85vh] flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5 sm:px-5">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search 1,500+ problems, topics, sheets..." aria-label="Search problems, topics, sheets"
            className="flex-1 bg-transparent font-sans text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              aria-label="Clear query"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground border border-border">
              ESC
            </kbd>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close search"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* Quick Platform Jumps (shown when query is short) */}
          {!query && (
            <div>
              <span className="block px-2 pb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Core Platforms
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CORE_PLATFORMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-2.5 hover:border-primary/50 hover:bg-secondary/70 transition-all active:scale-[0.99]"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground truncate">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Curated Roadmaps */}
          {!query && (
            <div>
              <span className="block px-2 pb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Curated Roadmaps
              </span>
              <div className="flex flex-wrap gap-2 px-1">
                {TOP_SHEETS.map((sheet) => (
                  <Link
                    key={sheet.slug}
                    to={"/sheets" as any}
                    search={{ sheet: sheet.slug } as any}
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/50 px-3 py-1.5 text-xs font-mono text-foreground hover:border-primary/50 hover:bg-secondary transition-colors"
                  >
                    <BookOpen className="size-3 text-primary" />
                    <span className="font-semibold">{sheet.name}</span>
                    <span className="text-[10px] text-muted-foreground">({sheet.count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Problems List */}
          <div>
            <span className="block px-2 pb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {query ? `Problems Matching "${query}"` : "Suggested Problems"}
            </span>

            {filteredProblems.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No algorithms found matching &quot;{query}&quot;. Try searching for &quot;Two Sum&quot;, &quot;Binary Search&quot;, or &quot;Sliding Window&quot;.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProblems.map((p) => {
                  const difficultyColor =
                    p.difficulty === "Easy"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : p.difficulty === "Medium"
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : "text-rose-400 bg-rose-500/10 border-rose-500/20";

                  return (
                    <Link
                      key={p.slug}
                      to="/problem/$slug"
                      params={{ slug: p.slug }}
                      onClick={onClose}
                      className="flex items-center justify-between gap-3 rounded-xl border border-transparent p-2.5 hover:border-border/80 hover:bg-secondary/70 transition-all group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {p.title}
                          </span>
                          <span
                            className={`rounded-md border px-1.5 py-0.2 font-mono text-[10px] font-bold shrink-0 ${difficultyColor}`}
                          >
                            {p.difficulty}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-muted-foreground truncate">
                          <span>{p.topics?.slice(0, 2).join(", ")}</span>
                          {p.companies && p.companies.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{p.companies.slice(0, 2).join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                        <span className="hidden sm:inline text-[11px]">Open</span>
                        <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border/70 px-4 py-2.5 bg-muted/20 font-mono text-[11px] text-muted-foreground">
          <span>Navigate with click or tap</span>
          <Link
            to="/problems"
            onClick={onClose}
            className="flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            <span>View All 1,500+ Problems</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers, CheckCircle2, Flame } from "lucide-react";
import { problems, companyLabel, TOTAL_PROBLEMS } from "@/lib/problems";
import { useAuth } from "@/hooks/useAuth";

type CategoryFilter = "all" | "arrays" | "trees" | "dp" | "stack";

export function FeaturedProblemGrid() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const filteredProblems = problems.filter((p) => {
    if (filter === "all") return true;
    if (filter === "arrays") {
      return (
        p.topics?.includes("Array") ||
        p.topics?.includes("Two Pointers") ||
        p.topics?.includes("Sliding Window")
      );
    }
    if (filter === "trees") {
      return (
        p.topics?.includes("Binary Tree") ||
        p.topics?.includes("Tree") ||
        p.topics?.includes("Graph") ||
        p.topics?.includes("DFS")
      );
    }
    if (filter === "dp") {
      return (
        p.topics?.includes("Dynamic Programming") ||
        p.topics?.includes("Greedy")
      );
    }
    if (filter === "stack") {
      return (
        p.topics?.includes("Stack") ||
        p.topics?.includes("Monotonic Stack") ||
        p.topics?.includes("Heap")
      );
    }
    return true;
  }).slice(0, 6);

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-2 shadow-xs">
            <Flame className="size-3.5 text-primary" />
            <span>Interactive Algorithmic Catalog</span>
          </div>
          <h3 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground">
            High-Frequency <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-pixel text-4xl sm:text-5xl md:text-6xl py-2 block mt-6 mb-4 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
              Classics
            </span>
          </h3>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Pick a problem to launch live visualizer simulations and AI feedback.
          </p>
        </div>

        <Link
          to="/problems"
          className="group relative inline-flex items-center gap-2 rounded-xl btn-moving-theme-gradient px-4 py-2 text-xs sm:text-sm font-sans font-bold tracking-wide text-white shadow-md hover:scale-[1.03] transition-all self-start sm:self-end overflow-hidden"
        >
          <span className="relative z-10">Explore all {TOTAL_PROBLEMS}+ problems</span>
          <ArrowRight className="size-4 relative z-10 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6" role="tablist">
        {[
          { id: "all", label: "All Top Classics" },
          { id: "arrays", label: "Two Pointers & Arrays" },
          { id: "trees", label: "Trees & Graphs" },
          { id: "dp", label: "Dynamic Programming" },
          { id: "stack", label: "Stack & Heap" },
        ].map((tab) => {
          const isSelected = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as CategoryFilter)}
              className={`rounded-xl px-3.5 py-1.5 font-mono text-xs transition-all duration-200 border ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 scale-[1.02]"
                  : "border-border/70 bg-card/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 6 Problem Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProblems.map((p) => {
          const cardContent = (
            <div className="group relative flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm backdrop-blur-md hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 h-full">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-base font-display line-clamp-1">
                    {p.title}
                  </h4>
                  <span
                    className={`shrink-0 rounded-lg border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                      p.difficulty === "Hard"
                        ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                        : p.difficulty === "Medium"
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                          : "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    {p.difficulty}
                  </span>
                </div>

                {/* Topic tags */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(p.topics ?? []).slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-md border border-border/60 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Companies & Solve Action */}
              <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
                <div className="flex flex-wrap gap-1">
                  {(p.companies ?? []).slice(0, 2).map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-border/60 bg-secondary/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground font-semibold"
                    >
                      {companyLabel(c)}
                    </span>
                  ))}
                </div>

                <span className="flex items-center gap-1 font-mono text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                  Solve &rarr;
                </span>
              </div>
            </div>
          );

          return (
            <Link
              key={p.slug}
              to="/problem/$slug"
              params={{ slug: p.slug }}
              className="block h-full"
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { DSA_SHEETS, type DSASheet } from "@/data/sheets";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  LayoutList,
  Sparkles,
  Search,
  Check,
  Play,
  Flame,
  Zap,
  Filter,
  ExternalLink,
  Code2,
  Layers,
  Clock,
  Building2,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { problemBySlug, type Problem } from "@/lib/problems";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/sheets")({
  head: () => ({
    meta: [
      { title: "Curated DSA Roadmaps & Sheets — DSA.viz" },
      {
        name: "description",
        content:
          "Track your progress on top DSA sheets including Striver's A2Z, Blind 75, NeetCode 150, and Sean Prasad Patterns with step-by-step visualizers.",
      },
      { property: "og:title", content: "Curated DSA Roadmaps & Sheets — DSA.viz" },
      {
        property: "og:description",
        content:
          "Master technical interviews with curated roadmaps, automated progress tracking, and interactive algorithmic visualizers.",
      },
    ],
  }),
  component: SheetsPage,
});

const SHEET_THEMES: Record<
  string,
  {
    gradient: string;
    border: string;
    badge: string;
    text: string;
    iconBg: string;
    accentGlow: string;
    targetDuration: string;
    topCompanies: string[];
  }
> = {
  "striver-a2z": {
    gradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    accentGlow: "shadow-emerald-500/10",
    targetDuration: "8 - 10 Weeks",
    topCompanies: ["Google", "Amazon", "Microsoft", "Uber"],
  },
  "blind-75": {
    gradient: "from-cyan-500/15 via-blue-500/5 to-transparent",
    border: "border-cyan-500/30 hover:border-cyan-500/60",
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    text: "text-cyan-400",
    iconBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    accentGlow: "shadow-cyan-500/10",
    targetDuration: "3 - 4 Weeks",
    topCompanies: ["Meta", "Google", "Apple", "Netflix"],
  },
  "neetcode-150": {
    gradient: "from-violet-500/15 via-purple-500/5 to-transparent",
    border: "border-violet-500/30 hover:border-violet-500/60",
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    text: "text-violet-400",
    iconBg: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    accentGlow: "shadow-violet-500/10",
    targetDuration: "5 - 6 Weeks",
    topCompanies: ["Amazon", "Google", "Meta", "Bloomberg"],
  },
  "sean-prasad": {
    gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
    border: "border-amber-500/30 hover:border-amber-500/60",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    text: "text-amber-400",
    iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    accentGlow: "shadow-amber-500/10",
    targetDuration: "4 - 5 Weeks",
    topCompanies: ["Microsoft", "Uber", "ByteDance"],
  },
};

const DEFAULT_THEME = {
  gradient: "from-primary/15 via-accent/5 to-transparent",
  border: "border-primary/30 hover:border-primary/60",
  badge: "bg-primary/15 text-primary border-primary/30",
  text: "text-primary",
  iconBg: "bg-primary/15 text-primary border-primary/30",
  accentGlow: "shadow-primary/10",
  targetDuration: "4 Weeks",
  topCompanies: ["Tier-1 Tech"],
};

function getSolvedSlugs(): Set<string> {
  const solved = new Set<string>();
  if (typeof window === "undefined") return solved;

  // 1. Manual checkmark storage
  try {
    const rawManual = window.localStorage.getItem("dsaviz:manual_solved_v1");
    if (rawManual) {
      const arr = JSON.parse(rawManual);
      if (Array.isArray(arr)) {
        arr.forEach((slug) => solved.add(slug));
      }
    }
  } catch {
    // ignore
  }

  // 2. Automated attempts storage
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("dsaviz:attempt:")) {
      const slug = key.replace("dsaviz:attempt:", "");
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed?.result?.is_complete ||
            parsed?.result?.classification === "Optimal" ||
            parsed?.result?.classification === "Better" ||
            parsed?.result?.classification === "Brute Force" ||
            parsed?.result
          ) {
            solved.add(slug);
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return solved;
}

function saveManualSolved(solved: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("dsaviz:manual_solved_v1", JSON.stringify(Array.from(solved)));
  } catch {
    // ignore
  }
}

function SheetsPage() {
  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(() => new Set());
  const [activeSheetFilter, setActiveSheetFilter] = useState<string>("all");
  const [globalSearch, setGlobalSearch] = useState<string>("");

  useEffect(() => {
    setSolvedSlugs(getSolvedSlugs());
  }, []);

  const toggleSolvedSlug = (slug: string) => {
    setSolvedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        toast.info("Unmarked problem from solved tracker");
      } else {
        next.add(slug);
        toast.success("Marked problem as solved! 🎯");
      }
      saveManualSolved(next);
      return next;
    });
  };

  // Aggregated Telemetry across all sheets
  const telemetry = useMemo(() => {
    const allUniqueSlugs = new Set<string>();
    DSA_SHEETS.forEach((s) => s.problems.forEach((p) => allUniqueSlugs.add(p.slug)));
    const totalCurated = allUniqueSlugs.size;
    let totalSolved = 0;
    allUniqueSlugs.forEach((s) => {
      if (solvedSlugs.has(s)) totalSolved++;
    });
    const completionPercent = totalCurated > 0 ? Math.round((totalSolved / totalCurated) * 100) : 0;

    return {
      totalSheets: DSA_SHEETS.length,
      totalCurated,
      totalSolved,
      completionPercent,
    };
  }, [solvedSlugs]);

  const filteredSheets = useMemo(() => {
    if (activeSheetFilter === "all") return DSA_SHEETS;
    return DSA_SHEETS.filter((s) => s.id === activeSheetFilter);
  }, [activeSheetFilter]);

  return (
    <div className="min-h-screen pb-24">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        {/* Executive Hero Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-10 backdrop-blur-2xl shadow-xl">
          {/* Ambient lighting glows */}
          <div className="absolute -left-20 -top-20 size-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 size-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3">
                <Sparkles className="size-3.5" />
                <span>Curated Masterclass Roadmaps</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                Structured <span className="bg-gradient-to-r from-primary via-accent to-emerald-400 bg-clip-text text-transparent">DSA Sheets</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground font-sans leading-relaxed">
                Step off the tutorial treadmill. Track your progress across industry-standard interview tracks, verify loop invariants, and launch live step-by-step visualizers with one click.
              </p>
            </div>

            {/* Overall Completion Metric Card */}
            <div className="w-full md:w-72 shrink-0 rounded-2xl border border-border/80 bg-background/80 p-4 font-mono shadow-md backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="size-4 text-primary" /> Overall Progress
                </span>
                <span className="text-primary font-bold text-sm">{telemetry.completionPercent}%</span>
              </div>
              <Progress value={telemetry.completionPercent} className="h-2.5 w-full my-2 bg-secondary" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{telemetry.totalSolved} Solved</span>
                <span>{telemetry.totalCurated} Total Targets</span>
              </div>
            </div>
          </div>

          {/* 4 Stat KPI Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-border/50">
            <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Roadmaps Available</div>
              <div className="font-display text-xl sm:text-2xl font-black text-foreground mt-0.5">{telemetry.totalSheets} Curated Tracks</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Target Problems</div>
              <div className="font-display text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{telemetry.totalCurated}+ Problems</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Interview Coverage</div>
              <div className="font-display text-xl sm:text-2xl font-black text-primary mt-0.5">Top 15+ Companies</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/40 p-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground">Execution Engine</div>
              <div className="font-display text-xl sm:text-2xl font-black text-accent mt-0.5">Step-by-Step</div>
            </div>
          </div>
        </div>

        {/* Global Controls & Roadmap Switcher */}
        <div className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Roadmap Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveSheetFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                activeSheetFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              All Roadmaps ({DSA_SHEETS.length})
            </button>
            {DSA_SHEETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSheetFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                  activeSheetFilter === s.id
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {s.name.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Quick Problem Search across sheets */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search problem in sheets..."
              className="h-9.5 pl-9 pr-4 rounded-xl bg-card/70 border-border/70 text-xs font-mono"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Roadmap Cards Grid */}
        <div className="flex flex-col gap-6">
          {filteredSheets.map((sheet, index) => (
            <RoadmapCard
              key={sheet.id}
              sheet={sheet}
              solvedSlugs={solvedSlugs}
              toggleSolved={toggleSolvedSlug}
              searchFilter={globalSearch}
              defaultExpanded={index === 0 || !!globalSearch || filteredSheets.length === 1}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function RoadmapCard({
  sheet,
  solvedSlugs,
  toggleSolved,
  searchFilter,
  defaultExpanded = false,
}: {
  sheet: DSASheet;
  solvedSlugs: Set<string>;
  toggleSolved: (slug: string) => void;
  searchFilter: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unsolved" | "solved">("all");

  useEffect(() => {
    if (searchFilter) {
      setExpanded(true);
    }
  }, [searchFilter]);

  const theme = SHEET_THEMES[sheet.id] ?? DEFAULT_THEME;

  // Breakdown statistics
  const stats = useMemo(() => {
    let easy = 0;
    let medium = 0;
    let hard = 0;
    let solvedCount = 0;
    let firstUnsolved: string | null = null;

    sheet.problems.forEach((p) => {
      const isSolved = solvedSlugs.has(p.slug);
      if (isSolved) solvedCount++;
      else if (!firstUnsolved) firstUnsolved = p.slug;

      const meta = problemBySlug(p.slug);
      if (meta?.difficulty === "Easy") easy++;
      else if (meta?.difficulty === "Medium") medium++;
      else if (meta?.difficulty === "Hard") hard++;
      else medium++; // default
    });

    const total = sheet.problems.length;
    const progress = total > 0 ? Math.round((solvedCount / total) * 100) : 0;

    return { total, solvedCount, easy, medium, hard, progress, firstUnsolved };
  }, [sheet.problems, solvedSlugs]);

  // Filtered problem items
  const displayProblems = useMemo(() => {
    return sheet.problems.filter((p) => {
      const isSolved = solvedSlugs.has(p.slug);
      if (statusFilter === "solved" && !isSolved) return false;
      if (statusFilter === "unsolved" && isSolved) return false;

      const meta = problemBySlug(p.slug);
      if (difficultyFilter !== "all" && meta?.difficulty?.toLowerCase() !== difficultyFilter) {
        return false;
      }

      if (searchFilter) {
        const query = searchFilter.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesSlug = p.slug.toLowerCase().includes(query);
        const matchesTopic = meta?.topics?.some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesSlug && !matchesTopic) return false;
      }

      return true;
    });
  }, [sheet.problems, solvedSlugs, statusFilter, difficultyFilter, searchFilter]);

  return (
    <div
      className={`rounded-3xl border transition-all duration-300 overflow-hidden bg-card/80 backdrop-blur-xl shadow-lg ${theme.border} ${theme.accentGlow}`}
    >
      {/* Top Banner Card Header */}
      <div
        className={`p-6 sm:p-7 bg-gradient-to-r ${theme.gradient} cursor-pointer select-none transition-colors hover:bg-secondary/40`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Title & Tagline & Metadata */}
          <div className="flex items-start gap-4">
            <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 border ${theme.iconBg} shadow-sm`}>
              <LayoutList className="size-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-black text-foreground">{sheet.name}</h2>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${theme.badge}`}>
                  {stats.total} Problems
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/50">
                  <Clock className="size-3" /> {theme.targetDuration}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl font-sans leading-relaxed">
                {sheet.description}
              </p>

              {/* Difficulty Breakdown Badges & Target Companies */}
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px]">
                <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold">
                  {stats.easy} Easy
                </span>
                <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                  {stats.medium} Medium
                </span>
                <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md font-bold">
                  {stats.hard} Hard
                </span>
                <span className="text-muted-foreground/60">•</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="size-3 text-primary" />
                  <span>{theme.topCompanies.join(", ")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Progress Meter & Quick Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 w-full lg:w-64 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/40">
            <div className="w-full space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Track Completion</span>
                <span className="font-bold text-foreground">
                  {stats.solvedCount} / {stats.total} ({stats.progress}%)
                </span>
              </div>
              <Progress value={stats.progress} className="h-2 w-full bg-secondary" />
            </div>

            <div className="flex items-center gap-2 w-full justify-between sm:justify-end">
              {stats.firstUnsolved && (
                <Link
                  to="/problem/$slug"
                  params={{ slug: stats.firstUnsolved }}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3.5 py-1.5 font-mono text-xs font-bold shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all"
                >
                  <Play className="size-3 fill-current" />
                  <span>Resume Next</span>
                </Link>
              )}
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg border border-border/60 bg-card/60"
              >
                <span>{expanded ? "Collapse" : "Expand"}</span>
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Problem Index Table */}
      {expanded && (
        <div className="border-t border-border/60 bg-background/50 p-4 sm:p-6 space-y-4">
          {/* Sub-Filters: Difficulty & Solved Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground font-semibold">Filter:</span>
              <button
                type="button"
                onClick={() => setDifficultyFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  difficultyFilter === "all" ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Diff
              </button>
              <button
                type="button"
                onClick={() => setDifficultyFilter("easy")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  difficultyFilter === "easy" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Easy
              </button>
              <button
                type="button"
                onClick={() => setDifficultyFilter("medium")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  difficultyFilter === "medium" ? "bg-amber-500/20 text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setDifficultyFilter("hard")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  difficultyFilter === "hard" ? "bg-rose-500/20 text-rose-400 font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hard
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === "all" ? "bg-secondary text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("unsolved")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === "unsolved" ? "bg-primary/20 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Unsolved Only
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("solved")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === "solved" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Solved ({stats.solvedCount})
              </button>
            </div>
          </div>

          {/* Problem List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayProblems.map((problem, i) => {
              const isSolved = solvedSlugs.has(problem.slug);
              const meta = problemBySlug(problem.slug);
              const exists = meta !== null;
              const difficulty = meta?.difficulty ?? "Medium";

              return (
                <div
                  key={problem.slug}
                  className={`group relative flex items-center justify-between rounded-2xl border p-3.5 transition-all duration-200 ${
                    isSolved
                      ? "border-emerald-500/25 bg-emerald-500/5 hover:border-emerald-500/40"
                      : "border-border/60 bg-card/50 hover:border-primary/50 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Interactive Solved Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSolved(problem.slug)}
                      className={`size-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                        isSolved
                          ? "bg-emerald-500 border-emerald-400 text-white shadow-xs"
                          : "border-border/80 bg-background/80 hover:border-primary/60"
                      }`}
                      title={isSolved ? "Click to unmark as solved" : "Click to mark as solved"}
                    >
                      {isSolved ? <Check className="size-3.5 stroke-[3]" /> : null}
                    </button>

                    {/* Problem Meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground/80">#{i + 1}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold border ${
                            difficulty === "Easy"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : difficulty === "Hard"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {difficulty}
                        </span>
                        {meta?.topics?.[0] && (
                          <span className="hidden sm:inline-block font-mono text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                            • {meta.topics[0]}
                          </span>
                        )}
                      </div>

                      <h3
                        className={`text-xs sm:text-sm font-semibold truncate transition-colors ${
                          isSolved ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground group-hover:text-primary"
                        }`}
                        title={problem.title}
                      >
                        {problem.title}
                      </h3>
                    </div>
                  </div>

                  {/* Actions: Launch Visualizer or Sandbox */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {exists ? (
                      <Link
                        to="/problem/$slug"
                        params={{ slug: problem.slug }}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary/15 text-primary border border-primary/30 px-2.5 py-1.5 font-mono text-[11px] font-bold hover:bg-primary hover:text-primary-foreground transition-all shadow-xs"
                      >
                        <span>Viz</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    ) : (
                      <Link
                        to="/compiler"
                        className="inline-flex items-center gap-1 rounded-xl bg-secondary/80 text-muted-foreground border border-border/60 px-2 py-1 font-mono text-[10px] hover:text-foreground hover:bg-secondary transition-all"
                      >
                        <Code2 className="size-3" />
                        <span>C++</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {displayProblems.length === 0 && (
            <div className="text-center py-8 text-xs font-mono text-muted-foreground">
              No problems match current filters. Try resetting search or status filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SheetsPage;

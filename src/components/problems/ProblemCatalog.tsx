import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowRight,
  BookOpen,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  Flame,
  CheckCircle2,
  Circle,
  Code2,
  ArrowUpDown,
  TrendingUp,
  Building2,
  Check,
  Play,
  RotateCcw,
  Terminal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  problems,
  companies,
  companyLabel,
  companyCounts,
  TOTAL_PROBLEMS,
  type Problem,
} from "@/lib/problems";
import { toast } from "sonner";

const SOLVED_STORAGE_KEY = "dsa_sheets_solved_slugs_v1";

const diffClass = (d: Problem["difficulty"]) =>
  d === "Hard"
    ? "border-destructive/40 bg-destructive/15 text-destructive shadow-xs shadow-destructive/20"
    : d === "Medium"
      ? "border-amber-400/40 bg-amber-400/15 text-amber-300 shadow-xs shadow-amber-400/20"
      : "border-emerald-400/40 bg-emerald-400/15 text-emerald-300 shadow-xs shadow-emerald-400/20";

const TOPIC_SHORTCUTS = [
  "All Topics",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Array",
  "Dynamic Programming",
  "Tree",
  "Graph",
  "Linked List",
  "Stack",
  "Queue",
  "Hash Table",
  "Divide and Conquer",
  "Greedy",
  "Backtracking",
  "Sorting",
];

const PRESET_COLLECTIONS = [
  { label: "🔥 Top 20 Most Frequent", filter: "top-freq" },
  { label: "⚡ Two Pointers & Windows", filter: "two-pointers" },
  { label: "🌲 Trees & Graphs", filter: "trees" },
  { label: "🧠 Dynamic Programming", filter: "dp" },
  { label: "💎 Google Favorites", filter: "google" },
  { label: "🌐 Meta Core", filter: "meta" },
];

interface ProblemCatalogProps {
  initialTopic?: string;
  showTitle?: boolean;
}

export function ProblemCatalog({ initialTopic = "All Topics", showTitle = true }: ProblemCatalogProps) {
  const [q, setQ] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    initialTopic !== "All Topics" ? [initialTopic] : [],
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "unsolved" | "solved">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState<"freq" | "difficulty" | "title">("freq");
  const [topicSearch, setTopicSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Synchronized solved slugs state
  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(SOLVED_STORAGE_KEY);
        if (stored) {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) return new Set(arr);
        }
      }
    } catch (e) {
      console.warn("Could not parse solved slugs:", e);
    }
    return new Set();
  });

  const toggleSolvedSlug = (slug: string) => {
    setSolvedSlugs((prev) => {
      const next = new Set(prev);
      const isNowSolved = !next.has(slug);
      if (isNowSolved) {
        next.add(slug);
        toast.success(`Marked #${slug} as completed! 🎯`);
      } else {
        next.delete(slug);
        toast.info(`Marked #${slug} as unsolved`);
      }
      try {
        localStorage.setItem(SOLVED_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error("Failed to save solved slugs:", e);
      }
      return next;
    });
  };

  // Global shortcut '/' to focus search, and 'Escape' to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQ("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleApplyPreset = (presetKey: string) => {
    resetFilters(false);
    if (presetKey === "top-freq") {
      setSortBy("freq");
    } else if (presetKey === "two-pointers") {
      setSelectedTopics(["Two Pointers", "Sliding Window"]);
    } else if (presetKey === "trees") {
      setSelectedTopics(["Tree", "Graph"]);
    } else if (presetKey === "dp") {
      setSelectedTopics(["Dynamic Programming"]);
    } else if (presetKey === "google") {
      setSelectedCompanies(["google"]);
    } else if (presetKey === "meta") {
      setSelectedCompanies(["meta"]);
    }
  };

  const filtered = useMemo(() => {
    let list = problems.filter((p) => {
      const safeTopics = p.topics ?? [];
      const safeCompanies = p.companies ?? [];
      const isSolved = solvedSlugs.has(p.slug);

      if (statusFilter === "solved" && !isSolved) return false;
      if (statusFilter === "unsolved" && isSolved) return false;

      const matchesQ =
        !q ||
        (p.title ?? "").toLowerCase().includes(q.toLowerCase()) ||
        safeTopics.some((t) => String(t).toLowerCase().includes(q.toLowerCase())) ||
        safeCompanies.some((c) => String(c).toLowerCase().includes(q.toLowerCase()));

      const matchesCompany =
        selectedCompanies.length === 0 || safeCompanies.some((c) => selectedCompanies.includes(c));
      const matchesDifficulty =
        selectedDifficulties.length === 0 || selectedDifficulties.includes(p.difficulty);
      const matchesTopic =
        selectedTopics.length === 0 || safeTopics.some((t) => selectedTopics.includes(t));

      return matchesQ && matchesCompany && matchesDifficulty && matchesTopic;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === "freq") {
        return (b.freq ?? 0) - (a.freq ?? 0);
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === "difficulty") {
        const order = { Easy: 1, Medium: 2, Hard: 3 };
        return order[a.difficulty] - order[b.difficulty];
      }
      return 0;
    });

    return list;
  }, [q, selectedCompanies, selectedDifficulties, selectedTopics, sortBy, statusFilter, solvedSlugs]);

  const resetFilters = (notify = true) => {
    setQ("");
    setSelectedCompanies([]);
    setSelectedDifficulties([]);
    setSelectedTopics([]);
    setStatusFilter("all");
    if (notify) toast.info("All problem filters cleared");
  };

  const toggleDifficulty = (d: string) => {
    setSelectedDifficulties((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };
  const toggleCompany = (c: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };
  const toggleTopic = (t: string) => {
    setSelectedTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const hasActiveFilters =
    selectedTopics.length > 0 ||
    selectedCompanies.length > 0 ||
    selectedDifficulties.length > 0 ||
    statusFilter !== "all" ||
    !!q;

  const totalCatalogSolved = useMemo(() => {
    let count = 0;
    problems.forEach((p) => {
      if (solvedSlugs.has(p.slug)) count++;
    });
    return count;
  }, [solvedSlugs]);

  const completionPercent = Math.round((totalCatalogSolved / TOTAL_PROBLEMS) * 100);

  return (
    <div id="catalog" className="scroll-mt-24 space-y-8">
      {showTitle && (
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/75 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl pro-surface">
          {/* Subtle ambient lighting */}
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 size-80 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3 shadow-sm">
                <Sparkles className="size-3.5" />
                <span>DSA.viz PRO Masterclass</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                Algorithm <span className="bg-gradient-to-r from-primary via-accent to-emerald-400 bg-clip-text text-transparent">Library</span>
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-muted-foreground font-sans max-w-2xl leading-relaxed">
                Master 1,500+ interview challenges with 60 FPS step-by-step invariant visualizers, automated Socratic nudges, live C++ sandbox execution, and company frequency heatmaps.
              </p>
            </div>

            {/* Overall Solved Progress Card */}
            <div className="w-full sm:w-80 shrink-0 rounded-2xl border border-border/90 bg-background/90 p-4.5 font-mono shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="size-4 text-primary" /> Solved Progress
                </span>
                <span className="text-primary font-bold text-sm tabular-nums">{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} className="h-2.5 w-full my-2 bg-secondary" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span className="text-foreground font-semibold">{totalCatalogSolved} Completed</span>
                <span>{TOTAL_PROBLEMS} Questions</span>
              </div>
            </div>
          </div>

          {/* Quick Filter Collections */}
          <div className="mt-7 pt-6 border-t border-border/50 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase font-bold text-muted-foreground mr-1">Curated Presets:</span>
            {PRESET_COLLECTIONS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p.filter)}
                className="rounded-xl border border-border/70 bg-secondary/60 hover:bg-secondary hover:border-primary/50 px-3 py-1.5 font-mono text-xs font-semibold text-foreground transition-all active:scale-95"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Filter and Results Grid */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Sticky Filter Bar */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-6 lg:sticky lg:top-20">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search problems... (/)"
              className="h-10.5 rounded-2xl bg-card/80 border-border/70 pl-9 pr-14 font-mono text-xs shadow-sm transition-all focus:bg-card focus:border-primary focus:shadow-md"
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground border border-border/60">
                /
              </kbd>
            )}
          </div>

          {/* Active Filter Chips with Reset */}
          {hasActiveFilters && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary flex items-center gap-1.5">
                  <SlidersHorizontal className="size-3.5" /> Active Filters
                </span>
                <button
                  type="button"
                  onClick={() => resetFilters()}
                  className="text-[11px] font-mono font-bold text-primary hover:underline"
                >
                  Reset All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedDifficulties.map((d) => (
                  <span
                    key={d}
                    onClick={() => toggleDifficulty(d)}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-foreground cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors border border-border/60"
                  >
                    {d} <X className="size-3" />
                  </span>
                ))}
                {selectedTopics.map((t) => (
                  <span
                    key={t}
                    onClick={() => toggleTopic(t)}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-foreground cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors border border-border/60"
                  >
                    {t} <X className="size-3" />
                  </span>
                ))}
                {selectedCompanies.map((c) => (
                  <span
                    key={c}
                    onClick={() => toggleCompany(c)}
                    className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-foreground cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors border border-border/60"
                  >
                    {companyLabel(c)} <X className="size-3" />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Filter Card */}
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-primary" /> Difficulty
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">3 Levels</span>
            </h3>
            <div className="space-y-1.5">
              {[
                { label: "Easy", color: "text-emerald-400 bg-emerald-500/20 border-emerald-500/30", dot: "bg-emerald-400" },
                { label: "Medium", color: "text-amber-400 bg-amber-500/20 border-amber-500/30", dot: "bg-amber-400" },
                { label: "Hard", color: "text-rose-400 bg-rose-500/20 border-rose-500/30", dot: "bg-rose-400" },
              ].map(({ label, color, dot }) => {
                const count = problems.filter((p) => p.difficulty === label).length;
                const isSelected = selectedDifficulties.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDifficulty(label)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                      isSelected
                        ? "bg-secondary border-primary/50 text-foreground shadow-xs"
                        : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`size-2 rounded-full ${dot}`} />
                      <span>{label}</span>
                    </div>
                    <span className="text-[11px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topics Filter Card */}
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="size-3.5 text-primary" /> Topics
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {selectedTopics.length > 0 ? `${selectedTopics.length} selected` : "All"}
              </span>
            </div>

            <div className="relative mb-2.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter topics..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="w-full rounded-lg bg-background/80 border border-border/60 pl-7 pr-2.5 py-1 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {TOPIC_SHORTCUTS.filter((t) => t !== "All Topics")
                .filter((t) => !topicSearch || t.toLowerCase().includes(topicSearch.toLowerCase()))
                .map((t) => {
                  const isSelected = selectedTopics.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTopic(t)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all text-left ${
                        isSelected
                          ? "bg-primary/20 text-primary font-bold border border-primary/40"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <span className="truncate">{t}</span>
                      {isSelected && <Check className="size-3 text-primary shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Companies Filter Card */}
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur-md shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building2 className="size-3.5 text-primary" /> Companies
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">Top Hiring</span>
            </div>

            <div className="relative mb-2.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search company..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full rounded-lg bg-background/80 border border-border/60 pl-7 pr-2.5 py-1 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {companies
                .filter((c) => !companySearch || companyLabel(c).toLowerCase().includes(companySearch.toLowerCase()))
                .map((c) => {
                  const isSelected = selectedCompanies.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCompany(c)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all text-left ${
                        isSelected
                          ? "bg-primary/20 text-primary font-bold border border-primary/40"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <span className="truncate">{companyLabel(c)}</span>
                      <span className="text-[10px] opacity-70 shrink-0">
                        {companyCounts[c] ?? 0}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </aside>

        {/* Right Content / Problem Grid & Table View */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          {/* View Toolbar: Result Count, Status Filter, Sort, View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/60 p-3 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-3">
              <div className="font-mono text-xs text-muted-foreground">
                Showing <strong className="text-foreground font-bold">{filtered.length}</strong> of{" "}
                {TOTAL_PROBLEMS} problems
              </div>

              {/* Status Segmented Tabs */}
              <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/80 p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === "all"
                      ? "bg-secondary text-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("unsolved")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === "unsolved"
                      ? "bg-primary/20 text-primary font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Unsolved
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("solved")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === "solved"
                      ? "bg-emerald-500/20 text-emerald-400 font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Solved ({totalCatalogSolved})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-muted-foreground text-[11px]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl bg-background/90 border border-border/70 px-2.5 py-1 font-mono text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="freq">FAANG Frequency</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="title">Alphabetical (A-Z)</option>
                </select>
              </div>

              {/* Grid vs Table View Switcher */}
              <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="High-Density Table View"
                >
                  <List className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Results: Empty State */}
          {filtered.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-card/30 p-10 text-center">
              <SlidersHorizontal className="size-10 text-muted-foreground/50" />
              <h3 className="text-base font-bold text-foreground">No problems matched your query</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                We couldn't find any questions matching your current keyword or filters.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => resetFilters()}
                className="mt-2"
              >
                Clear all filters
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            /* Card Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((p, i) => {
                const isSolved = solvedSlugs.has(p.slug);
                return (
                  <div
                    key={p.slug}
                    className={`group relative flex flex-col justify-between rounded-3xl border p-5 shadow-sm transition-all duration-200 backdrop-blur-md ${
                      isSolved
                        ? "border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400/60"
                        : "border-border/70 bg-card/70 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5"
                    }`}
                  >
                    <div>
                      {/* Header: Solved Toggle + Title & Difficulty */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Interactive Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleSolvedSlug(p.slug)}
                            className="mt-1 shrink-0 transition-transform active:scale-90"
                            title={isSolved ? "Mark as unsolved" : "Mark as completed"}
                          >
                            {isSolved ? (
                              <CheckCircle2 className="size-4.5 text-emerald-400 fill-emerald-500/20" />
                            ) : (
                              <Circle className="size-4.5 text-muted-foreground/50 hover:text-primary transition-colors" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-[10px] text-muted-foreground/70">
                                #{i + 1}
                              </span>
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${diffClass(
                                  p.difficulty,
                                )}`}
                              >
                                {p.difficulty}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded bg-secondary/80 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground border border-border/50">
                                <Flame className="size-2.5 text-primary" /> Freq {p.freq ?? 85}%
                              </span>
                              {isSolved && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                                  Solved
                                </span>
                              )}
                            </div>
                            <Link
                              to="/problem/$slug"
                              params={{ slug: p.slug }}
                              className={`font-bold text-sm sm:text-base leading-snug line-clamp-1 transition-colors ${
                                isSolved
                                  ? "text-foreground group-hover:text-emerald-400"
                                  : "text-foreground group-hover:text-primary"
                              }`}
                            >
                              {p.title}
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Topics */}
                      <div className="flex flex-wrap gap-1.5 my-3 pl-7">
                        {(p.topics ?? []).slice(0, 3).map((topic) => (
                          <span
                            key={topic}
                            className="rounded-lg border border-border/60 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors group-hover:border-primary/40"
                          >
                            {topic}
                          </span>
                        ))}
                        {(p.topics ?? []).length > 3 && (
                          <span className="font-mono text-[10px] text-muted-foreground self-center">
                            +{(p.topics ?? []).length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: Company chips & Dual Action Buttons */}
                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {(p.companies ?? []).slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="rounded-md border border-border/60 bg-secondary/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                          >
                            {companyLabel(c)}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to="/compiler"
                          className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-secondary/60 px-2.5 py-1.5 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
                          title="Open C++ Sandbox"
                        >
                          <Terminal className="size-3" />
                          <span className="hidden sm:inline">C++</span>
                        </Link>

                        <Link
                          to="/problem/$slug"
                          params={{ slug: p.slug }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-1.5 font-mono text-xs font-bold shadow-xs shadow-primary/20 hover:bg-primary/95 active:scale-95 transition-all"
                        >
                          <Play className="size-3 fill-current" />
                          <span>Visualize</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* High-Density Pro Table View */
            <div className="rounded-3xl border border-border/70 bg-card/70 overflow-hidden backdrop-blur-md shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="border-b border-border/70 bg-secondary/60 text-muted-foreground text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-3 font-bold w-10 text-center">Status</th>
                      <th className="px-3 py-3 font-bold w-12">#</th>
                      <th className="px-4 py-3 font-bold">Title</th>
                      <th className="px-4 py-3 font-bold w-24">Difficulty</th>
                      <th className="px-4 py-3 font-bold hidden md:table-cell">Topics</th>
                      <th className="px-4 py-3 font-bold hidden lg:table-cell">Top Companies</th>
                      <th className="px-4 py-3 font-bold text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filtered.map((p, i) => {
                      const isSolved = solvedSlugs.has(p.slug);
                      return (
                        <tr
                          key={p.slug}
                          className={`hover:bg-secondary/40 transition-colors group ${
                            isSolved ? "bg-emerald-950/5" : ""
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSolvedSlug(p.slug)}
                              className="transition-transform active:scale-90"
                              title={isSolved ? "Mark as unsolved" : "Mark as completed"}
                            >
                              {isSolved ? (
                                <CheckCircle2 className="size-4 text-emerald-400 fill-emerald-500/20" />
                              ) : (
                                <Circle className="size-4 text-muted-foreground/40 hover:text-primary transition-colors" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground/70">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Link
                                to="/problem/$slug"
                                params={{ slug: p.slug }}
                                className={`font-bold transition-colors text-sm ${
                                  isSolved
                                    ? "text-foreground group-hover:text-emerald-400"
                                    : "text-foreground group-hover:text-primary"
                                }`}
                              >
                                {p.title}
                              </Link>
                              {isSolved && (
                                <span className="text-[9px] rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300 font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${diffClass(
                                p.difficulty,
                              )}`}
                            >
                              {p.difficulty}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(p.topics ?? []).slice(0, 2).map((topic) => (
                                <span
                                  key={topic}
                                  className="rounded border border-border/50 bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {topic}
                                </span>
                              ))}
                              {(p.topics ?? []).length > 2 && (
                                <span className="text-[10px] text-muted-foreground self-center">
                                  +{(p.topics ?? []).length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(p.companies ?? []).slice(0, 2).map((c) => (
                                <span
                                  key={c}
                                  className="rounded border border-border/50 bg-secondary/80 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground"
                                >
                                  {companyLabel(c)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to="/compiler"
                                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/60 px-2 py-1 font-mono text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-95 transition-all"
                                title="Open C++ Sandbox"
                              >
                                <Terminal className="size-3" />
                                <span className="hidden sm:inline">C++</span>
                              </Link>
                              <Link
                                to="/problem/$slug"
                                params={{ slug: p.slug }}
                                className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 font-mono text-[11px] font-bold shadow-xs hover:bg-primary/90 active:scale-95 transition-all"
                              >
                                <Play className="size-2.5 fill-current" />
                                <span>Visualize</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ProblemCatalog;

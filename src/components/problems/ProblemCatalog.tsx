import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useDeferredValue,
  useCallback,
  memo,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  X,
  SlidersHorizontal,
  BookOpen,
  Sparkles,
  LayoutGrid,
  List,
  Flame,
  CheckCircle2,
  Circle,
  Building2,
  Check,
  Play,
  Terminal,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  problems,
  companies,
  companyLabel,
  companyCounts,
  difficultyCounts,
  TOTAL_PROBLEMS,
  type Problem,
} from "@/lib/problems";
import { toast } from "sonner";

const SOLVED_STORAGE_KEY = "dsa_sheets_solved_slugs_v1";
const PAGE_SIZE = 48;

const diffClass = (d: Problem["difficulty"]) =>
  d === "Hard"
    ? "border-destructive/40 bg-destructive/15 text-destructive"
    : d === "Medium"
      ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
      : "border-emerald-400/40 bg-emerald-400/15 text-emerald-300";

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
  { label: "💎 Google Topic Tag", filter: "google" },
  { label: "🌐 Meta Topic Tag", filter: "meta" },
];

// Pre-computed search & filter index (built once at module load for sub-millisecond filtering)
interface IndexedProblem {
  problem: Problem;
  searchBlob: string;
  topicSet: Set<string>;
  companySet: Set<string>;
  diffRank: number;
}

const INDEXED_PROBLEMS: IndexedProblem[] = problems.map((p) => {
  const safeTopics = p.topics ?? [];
  const safeCompanies = p.companies ?? [];
  return {
    problem: p,
    searchBlob: `${p.title ?? ""} ${p.slug ?? ""} ${safeTopics.join(" ")} ${safeCompanies.join(" ")}`.toLowerCase(),
    topicSet: new Set(safeTopics),
    companySet: new Set(safeCompanies),
    diffRank: p.difficulty === "Easy" ? 1 : p.difficulty === "Medium" ? 2 : 3,
  };
});

interface ProblemItemProps {
  problem: Problem;
  index: number;
  isSolved: boolean;
  onToggleSolved: (slug: string) => void;
}

const ProblemGridCard = memo(function ProblemGridCard({
  problem: p,
  index,
  isSolved,
  onToggleSolved,
}: ProblemItemProps) {
  const topics = p.topics ?? [];
  const compList = p.companies ?? [];

  return (
    <div
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 176px" }}
      className={`group relative flex flex-col justify-between rounded-3xl border p-5 shadow-sm transition-colors duration-150 ${
        isSolved
          ? "border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400/60"
          : "border-border/70 bg-card/90 hover:border-primary/60 hover:shadow-md"
      }`}
    >
      <div>
        {/* Header: Solved Toggle + Title & Difficulty */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onToggleSolved(p.slug)}
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
                  #{index + 1}
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
          {topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="rounded-lg border border-border/60 bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors group-hover:border-primary/40"
            >
              {topic}
            </span>
          ))}
          {topics.length > 3 && (
            <span className="font-mono text-[10px] text-muted-foreground self-center">
              +{topics.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Company chips & Dual Action Buttons */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
        <div className="flex flex-wrap gap-1 items-center">
          {compList.slice(0, 2).map((c) => (
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-1.5 font-mono text-xs font-bold shadow-xs hover:bg-primary/95 active:scale-95 transition-all"
          >
            <Play className="size-3 fill-current" />
            <span>Visualize</span>
          </Link>
        </div>
      </div>
    </div>
  );
});

const ProblemTableRow = memo(function ProblemTableRow({
  problem: p,
  index,
  isSolved,
  onToggleSolved,
}: ProblemItemProps) {
  const topics = p.topics ?? [];
  const compList = p.companies ?? [];

  return (
    <tr
      className={`hover:bg-secondary/40 transition-colors group ${
        isSolved ? "bg-emerald-950/5" : ""
      }`}
    >
      <td className="px-3 py-3 text-center">
        <button
          type="button"
          onClick={() => onToggleSolved(p.slug)}
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
      <td className="px-3 py-3 text-muted-foreground/70">{index + 1}</td>
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
          {topics.slice(0, 2).map((topic) => (
            <span
              key={topic}
              className="rounded border border-border/50 bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {topic}
            </span>
          ))}
          {topics.length > 2 && (
            <span className="text-[10px] text-muted-foreground self-center">
              +{topics.length - 2}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex flex-wrap gap-1">
          {compList.slice(0, 2).map((c) => (
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
});

interface ProblemCatalogProps {
  initialTopic?: string;
  showTitle?: boolean;
}

export function ProblemCatalog({
  initialTopic = "All Topics",
  showTitle = true,
}: ProblemCatalogProps) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
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
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

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

  const toggleSolvedSlug = useCallback((slug: string) => {
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
  }, []);

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

  // Reset visible window count when filters or sort change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredQ, selectedCompanies, selectedDifficulties, selectedTopics, statusFilter, sortBy, viewMode]);

  const filtered = useMemo(() => {
    const normalizedQ = deferredQ.trim().toLowerCase();
    const hasQ = normalizedQ.length > 0;
    const hasComp = selectedCompanies.length > 0;
    const hasDiff = selectedDifficulties.length > 0;
    const hasTop = selectedTopics.length > 0;

    const matched: IndexedProblem[] = [];

    for (let i = 0; i < INDEXED_PROBLEMS.length; i++) {
      const item = INDEXED_PROBLEMS[i]!;
      const p = item.problem;

      if (statusFilter !== "all") {
        const isSolved = solvedSlugs.has(p.slug);
        if (statusFilter === "solved" && !isSolved) continue;
        if (statusFilter === "unsolved" && isSolved) continue;
      }

      if (hasDiff && !selectedDifficulties.includes(p.difficulty)) {
        continue;
      }

      if (hasTop) {
        let topicHit = false;
        for (let t = 0; t < selectedTopics.length; t++) {
          if (item.topicSet.has(selectedTopics[t]!)) {
            topicHit = true;
            break;
          }
        }
        if (!topicHit) continue;
      }

      if (hasComp) {
        let compHit = false;
        for (let c = 0; c < selectedCompanies.length; c++) {
          if (item.companySet.has(selectedCompanies[c]!)) {
            compHit = true;
            break;
          }
        }
        if (!compHit) continue;
      }

      if (hasQ && !item.searchBlob.includes(normalizedQ)) {
        continue;
      }

      matched.push(item);
    }

    matched.sort((a, b) => {
      if (sortBy === "freq") {
        return (b.problem.freq ?? 0) - (a.problem.freq ?? 0);
      }
      if (sortBy === "title") {
        return a.problem.title.localeCompare(b.problem.title);
      }
      if (sortBy === "difficulty") {
        return a.diffRank - b.diffRank;
      }
      return 0;
    });

    return matched.map((m) => m.problem);
  }, [
    deferredQ,
    selectedCompanies,
    selectedDifficulties,
    selectedTopics,
    sortBy,
    statusFilter,
    solvedSlugs,
  ]);

  // Progressive infinite scroll observer
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || visibleCount >= filtered.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "450px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  const visibleProblems = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const resetFilters = (notify = true) => {
    setQ("");
    setSelectedCompanies([]);
    setSelectedDifficulties([]);
    setSelectedTopics([]);
    setStatusFilter("all");
    if (notify) toast.info("All problem filters cleared");
  };

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

  const totalCatalogSolved = solvedSlugs.size;
  const completionPercent = Math.round((totalCatalogSolved / TOTAL_PROBLEMS) * 100);

  return (
    <div id="catalog" className="scroll-mt-24 space-y-8">
      {showTitle && (
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-10 shadow-xl">
          {/* Subtle ambient lighting */}
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 size-80 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3 shadow-sm">
                <Sparkles className="size-3.5" />
                <span>DSA.viz Problem Library</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                Algorithm{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-emerald-400 bg-clip-text text-transparent">
                  Library
                </span>
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-muted-foreground font-sans max-w-2xl leading-relaxed">
                Explore 1,500+ classic algorithmic and data structure problems with step-by-step invariant visualizers,
                Socratic AI coaching hints, sandboxed C++ execution, and historical topic tags.
              </p>
              <p className="mt-1.5 text-[11px] font-mono text-muted-foreground/80 max-w-2xl">
                Nominative Fair Use Notice: Problem titles and historical company topic tags are indexed for non-commercial computer science education with direct links to original sources; not affiliated with or endorsed by LeetCode LLC or any listed company.
              </p>
            </div>

            {/* Overall Solved Progress Card */}
            <div className="w-full sm:w-80 shrink-0 rounded-2xl border border-border/90 bg-background/95 p-4.5 font-mono shadow-lg">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="size-4 text-primary" /> Solved Progress
                </span>
                <span className="text-primary font-bold text-sm tabular-nums">
                  {completionPercent}%
                </span>
              </div>
              <Progress value={completionPercent} className="h-2.5 w-full my-2 bg-secondary" />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span className="text-foreground font-semibold">
                  {totalCatalogSolved} Completed
                </span>
                <span>{TOTAL_PROBLEMS} Questions</span>
              </div>
            </div>
          </div>

          {/* Quick Filter Collections */}
          <div className="mt-7 pt-6 border-t border-border/50 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase font-bold text-muted-foreground mr-1">
              Curated Presets:
            </span>
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
              className="h-10.5 rounded-2xl bg-card/90 border-border/70 pl-9 pr-14 font-mono text-xs shadow-sm transition-all focus:bg-card focus:border-primary focus:shadow-md"
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
          <div className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-primary" /> Difficulty
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">3 Levels</span>
            </h3>
            <div className="space-y-1.5">
              {(
                [
                  { label: "Easy" as const, dot: "bg-emerald-400" },
                  { label: "Medium" as const, dot: "bg-amber-400" },
                  { label: "Hard" as const, dot: "bg-rose-400" },
                ] as const
              ).map(({ label, dot }) => {
                const count = difficultyCounts[label] ?? 0;
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
          <div className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm">
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
                className="w-full rounded-lg bg-background/90 border border-border/60 pl-7 pr-2.5 py-1 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
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
          <div className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm">
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
                className="w-full rounded-lg bg-background/90 border border-border/60 pl-7 pr-2.5 py-1 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {companies
                .filter(
                  (c) =>
                    !companySearch ||
                    companyLabel(c).toLowerCase().includes(companySearch.toLowerCase()),
                )
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/85 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="font-mono text-xs text-muted-foreground">
                Showing <strong className="text-foreground font-bold">{visibleProblems.length}</strong>{" "}
                of <strong className="text-foreground font-bold">{filtered.length}</strong> matched
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
              <h3 className="text-base font-bold text-foreground">
                No problems matched your query
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                We couldn&apos;t find any questions matching your current keyword or filters.
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
              {visibleProblems.map((p, i) => (
                <ProblemGridCard
                  key={p.slug}
                  problem={p}
                  index={i}
                  isSolved={solvedSlugs.has(p.slug)}
                  onToggleSolved={toggleSolvedSlug}
                />
              ))}
            </div>
          ) : (
            /* High-Density Pro Table View */
            <div className="rounded-3xl border border-border/70 bg-card/90 overflow-hidden shadow-md">
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
                    {visibleProblems.map((p, i) => (
                      <ProblemTableRow
                        key={p.slug}
                        problem={p}
                        index={i}
                        isSolved={solvedSlugs.has(p.slug)}
                        onToggleSolved={toggleSolvedSlug}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Progressive Load Sentinel & Manual Load More Controls */}
          {visibleCount < filtered.length && (
            <div
              ref={loadMoreSentinelRef}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 py-6"
            >
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((prev) => Math.min(prev + PAGE_SIZE * 2, filtered.length))
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-card/90 hover:bg-secondary hover:border-primary/50 px-5 py-2.5 font-mono text-xs font-bold text-foreground transition-all cursor-pointer shadow-xs"
              >
                <ChevronDown className="size-4 text-primary" />
                <span>
                  Load More ({filtered.length - visibleCount} remaining)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setVisibleCount(filtered.length)}
                className="font-mono text-xs text-muted-foreground hover:text-primary underline underline-offset-4 px-3 py-1.5 cursor-pointer"
              >
                Show all {filtered.length}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ProblemCatalog;

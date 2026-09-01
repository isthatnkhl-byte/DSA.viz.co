import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, SlidersHorizontal, ArrowRight, BookOpen, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { problems, companies, companyLabel, companyCounts, TOTAL_PROBLEMS, type Problem } from "@/lib/problems";
import { toast } from "sonner";

const diffClass = (d: Problem["difficulty"]) =>
  d === "Hard"
    ? "border-destructive/40 bg-destructive/15 text-destructive shadow-xs shadow-destructive/20"
    : d === "Medium"
      ? "border-primary/40 bg-primary/15 text-primary shadow-xs shadow-primary/20"
      : "border-success/40 bg-success/15 text-success shadow-xs shadow-success/20";

const TOPIC_SHORTCUTS = [
  "All Topics",
  "Array",
  "Sorting",
  "Searching",
  "Divide and Conquer",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Linked List",
  "Stack",
  "Queue",
  "Tree",
  "Binary Search Tree",
  "Graph",
  "Trie",
  "Hash Table",
  "Matrix",
  "Dynamic Programming",
  "Greedy",
  "Backtracking",
  "Heap (Priority Queue)",
  "Randomized",
];

interface ProblemCatalogProps {
  initialTopic?: string;
  showTitle?: boolean;
}


export function ProblemCatalog({ initialTopic = "All Topics", showTitle = true }: ProblemCatalogProps) {
  const [q, setQ] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(initialTopic !== "All Topics" ? [initialTopic] : []);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const filtered = useMemo(
    () =>
      problems.filter((p) => {
        const safeTopics = p.topics ?? [];
        const safeCompanies = p.companies ?? [];

        const matchesQ =
          !q ||
          (p.title ?? "").toLowerCase().includes(q.toLowerCase()) ||
          safeTopics.some((t) => String(t).toLowerCase().includes(q.toLowerCase())) ||
          safeCompanies.some((c) => String(c).toLowerCase().includes(q.toLowerCase()));

        const matchesCompany = selectedCompanies.length === 0 || safeCompanies.some(c => selectedCompanies.includes(c));
        const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(p.difficulty);
        const matchesTopic = selectedTopics.length === 0 || safeTopics.some(t => selectedTopics.includes(t));

        return matchesQ && matchesCompany && matchesDifficulty && matchesTopic;
      }),
    [q, selectedCompanies, selectedDifficulties, selectedTopics],
  );

  const resetFilters = () => {
    setQ("");
    setSelectedCompanies([]);
    setSelectedDifficulties([]);
    setSelectedTopics([]);
    toast.info("Filters reset to default");
  };

  const toggleDifficulty = (d: string) => {
    setSelectedDifficulties(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };
  const toggleCompany = (c: string) => {
    setSelectedCompanies(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };
  const toggleTopic = (t: string) => {
    setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  return (
    <div id="catalog" className="scroll-mt-24">
      {showTitle && (
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">
              Algorithm <span className="text-primary">Library</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Master the patterns behind FAANG interview questions.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search problems... (/)"
              className="h-10 rounded-xl bg-card/80 pl-9 pr-14 font-mono text-xs shadow-sm transition-all focus:bg-card focus:shadow-md focus-visible:ring-primary"
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
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">/</kbd>
            )}
          </div>

          {/* Difficulty */}
          <div>
             <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><SlidersHorizontal className="size-3.5"/> Difficulty</h3>
             <div className="flex flex-col gap-2">
                {["Easy", "Medium", "Hard"].map(d => (
                   <label key={d} className="flex items-center gap-2 cursor-pointer text-sm font-mono hover:text-primary transition-colors">
                     <input type="checkbox" checked={selectedDifficulties.includes(d)} onChange={() => toggleDifficulty(d)} className="rounded border-border bg-background text-primary focus:ring-primary"/>
                     {d}
                   </label>
                ))}
             </div>
          </div>

          {/* Topics */}
          <div>
             <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><BookOpen className="size-3.5"/> Topics</h3>
             <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                {TOPIC_SHORTCUTS.filter(t => t !== "All Topics").map(t => (
                   <label key={t} className="flex items-center gap-2 cursor-pointer text-sm font-mono hover:text-primary transition-colors">
                     <input type="checkbox" checked={selectedTopics.includes(t)} onChange={() => toggleTopic(t)} className="rounded border-border bg-background text-primary focus:ring-primary"/>
                     <span className="truncate">{t}</span>
                   </label>
                ))}
             </div>
          </div>

          {/* Companies */}
          <div>
             <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Layers className="size-3.5"/> Companies</h3>
             <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                {companies.map(c => (
                   <label key={c} className="flex items-center justify-between gap-2 cursor-pointer text-xs font-mono hover:text-primary transition-colors py-0.5">
                     <div className="flex items-center gap-2 min-w-0">
                       <input type="checkbox" checked={selectedCompanies.includes(c)} onChange={() => toggleCompany(c)} className="rounded border-border bg-background text-primary focus:ring-primary shrink-0"/>
                       <span className="truncate">{companyLabel(c)}</span>
                     </div>
                     <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">
                       {companyCounts[c] ?? 0}
                     </span>
                   </label>
                ))}
             </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider font-semibold">
              Showing <strong className="text-foreground">{filtered.length}</strong> of {TOTAL_PROBLEMS}{" "}
              problems
            </span>
            {(selectedTopics.length > 0 || selectedCompanies.length > 0 || selectedDifficulties.length > 0 || q) && (
              <button onClick={resetFilters} className="text-primary hover:underline font-bold">Clear Filters</button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/30 p-8 text-center animate-fade">
              <SlidersHorizontal className="size-8 text-muted-foreground/60" />
              <h3 className="text-base font-bold text-foreground">No problems matched your filter</h3>
              <p className="text-xs text-muted-foreground">
                Try searching with different keywords or clearing active filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs font-bold text-primary hover:bg-primary/20 transition-all active:scale-95"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 xl:grid-cols-2">
              {filtered.map((p) => (
                <Link
                  key={p.slug}
                  to="/problem/$slug"
                  params={{ slug: p.slug }}
                  className="card-lift group relative flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm leading-snug">
                        {p.title}
                      </h3>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${diffClass(p.difficulty)}`}
                      >
                        {p.difficulty}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {(p.topics ?? []).slice(0, 3).map((topic) => (
                        <span
                          key={topic}
                          className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground transition-colors group-hover:border-primary/30"
                        >
                          {topic}
                        </span>
                      ))}
                      {(p.topics ?? []).length > 3 && (
                        <span className="font-mono text-[9px] text-muted-foreground self-center">
                          +{(p.topics ?? []).length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(p.companies ?? []).slice(0, 2).map((c) => (
                        <span
                          key={c}
                          className="rounded border border-border/60 bg-secondary/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                        >
                          {companyLabel(c)}
                        </span>
                      ))}
                      {(p.companies ?? []).length > 2 && (
                        <span className="font-mono text-[9px] text-muted-foreground self-center">
                          +{(p.companies ?? []).length - 2}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 font-mono text-xs font-bold text-primary opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5">
                      Solve <ArrowRight className="size-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

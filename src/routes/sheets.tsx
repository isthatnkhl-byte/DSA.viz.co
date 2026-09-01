import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { DSA_SHEETS, SheetProblem } from "@/data/sheets";
import { BookOpen, CheckCircle2, ChevronRight, LayoutList } from "lucide-react";
import { useState, useMemo } from "react";
import { problemBySlug } from "@/lib/problems";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/sheets")({
  head: () => ({
    meta: [
      { title: "DSA Sheets — DSA.viz" },
      {
        name: "description",
        content: "Track your progress on popular DSA sheets like Striver's A2Z, Blind 75, NeetCode 150, and more.",
      },
    ],
  }),
  component: SheetsPage,
});

function getSolvedSlugs(): Set<string> {
  const solved = new Set<string>();
  if (typeof window === "undefined") return solved;
  
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith("dsaviz:attempt:")) {
      const slug = key.replace("dsaviz:attempt:", "");
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.result?.is_complete || parsed?.result?.classification === "Optimal" || parsed?.result?.classification === "Better" || parsed?.result?.classification === "Brute Force") {
             solved.add(slug);
          } else if (parsed?.result) {
             solved.add(slug); // Count any valid attempt as solved for tracker simplicity
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }
  return solved;
}

function SheetsPage() {
  const solvedSlugs = useMemo(() => getSolvedSlugs(), []);

  return (
    <div className="min-h-screen pb-20">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Popular DSA Sheets
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-xl mx-auto">
            Track your progress across the most popular Data Structures and Algorithms sheets. 
            Click on any problem to practice and see step-by-step visualizations.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {DSA_SHEETS.map((sheet) => (
            <SheetCard key={sheet.id} sheet={sheet} solvedSlugs={solvedSlugs} />
          ))}
        </div>
      </main>
    </div>
  );
}

function SheetCard({ sheet, solvedSlugs }: { sheet: typeof DSA_SHEETS[0]; solvedSlugs: Set<string> }) {
  const [expanded, setExpanded] = useState(false);

  const total = sheet.problems.length;
  const solvedCount = sheet.problems.filter((p) => solvedSlugs.has(p.slug)).length;
  const progressPercent = total > 0 ? (solvedCount / total) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 shadow-sm overflow-hidden">
      {/* Header */}
      <div 
        className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
            <LayoutList className="size-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{sheet.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-relaxed">
              {sheet.description}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 w-full sm:w-[200px] shrink-0">
          <div className="flex items-center justify-between w-full text-xs font-mono">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground font-bold">{solvedCount} / {total}</span>
          </div>
          <Progress value={progressPercent} className="h-2 w-full" />
        </div>
      </div>

      {/* Expanded Problem List */}
      {expanded && (
        <div className="border-t border-border/50 bg-background/50 p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sheet.problems.map((problem, i) => {
              const isSolved = solvedSlugs.has(problem.slug);
              // Check if problem exists in our DB
              const exists = problemBySlug(problem.slug) !== null;

              return (
                <div 
                  key={problem.slug}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-6 items-center justify-center shrink-0">
                      {isSolved ? (
                        <CheckCircle2 className="size-5 text-success" />
                      ) : (
                        <div className="size-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    <div>
                      <div className="font-mono text-xs text-muted-foreground/70 mb-0.5">#{i + 1}</div>
                      <h4 className={`text-sm font-semibold ${isSolved ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {problem.title}
                      </h4>
                    </div>
                  </div>
                  
                  {exists ? (
                    <Link
                      to="/problem/$slug"
                      params={{ slug: problem.slug }}
                      className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  ) : (
                    <span className="text-[10px] uppercase font-mono text-muted-foreground/50 px-2 py-1 bg-muted/30 rounded-md border border-border/40">
                      Coming Soon
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SheetsPage;

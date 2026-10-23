import { memo, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Code2, Copy, Check, CheckCircle2, Circle, Flame, BookOpen, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/problems";
import { companyLabel } from "@/lib/problems";
import { toast } from "sonner";

const SOLVED_STORAGE_KEY = "dsa_sheets_solved_slugs_v1";

interface ProblemHeaderProps {
  problem: Problem;
  copied: boolean;
  onCopyLink: () => void;
  onOpenCppModal?: () => void;
}

const diffColor = (d: string) =>
  d === "Easy"
    ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-xs shadow-emerald-500/20"
    : d === "Medium"
      ? "border-amber-500/40 bg-amber-950/40 text-amber-300 shadow-xs shadow-amber-500/20"
      : "border-rose-500/40 bg-rose-950/40 text-rose-300 shadow-xs shadow-rose-500/20";

export const ProblemHeader = memo(function ProblemHeader({
  problem,
  copied,
  onCopyLink,
  onOpenCppModal,
}: ProblemHeaderProps) {
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(SOLVED_STORAGE_KEY);
        if (stored) {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr) && arr.includes(problem.slug)) {
            setIsSolved(true);
          }
        }
      }
    } catch (e) {
      console.warn("Could not check solved status:", e);
    }
  }, [problem.slug]);

  const toggleSolved = () => {
    try {
      const stored = localStorage.getItem(SOLVED_STORAGE_KEY);
      let set = new Set<string>();
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) set = new Set(arr);
      }
      const nextSolved = !isSolved;
      if (nextSolved) {
        set.add(problem.slug);
        toast.success(`Marked #${problem.slug} as completed! 🎯`);
      } else {
        set.delete(problem.slug);
        toast.info(`Marked #${problem.slug} as unsolved`);
      }
      localStorage.setItem(SOLVED_STORAGE_KEY, JSON.stringify(Array.from(set)));
      setIsSolved(nextSolved);
    } catch (e) {
      console.error("Failed to update solved status:", e);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 border-b border-border/80 pb-5">
      {/* Navigation Breadcrumb & Quick Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/problems"
            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted-foreground transition hover:text-foreground active:scale-95"
          >
            <ArrowLeft className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Back to Problem Library</span>
            <span className="sm:hidden">Library</span>
          </Link>
          <span className="text-border/80 text-xs hidden sm:inline">•</span>
          <Link
            to="/sheets"
            className="hidden sm:inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition hover:text-foreground active:scale-95"
          >
            <BookOpen className="size-3 text-primary" />
            <span>DSA Sheets</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Solved Status Quick-Toggle Button */}
          <Button
            type="button"
            onClick={toggleSolved}
            variant={isSolved ? "success" : "outline"}
            size="sm"
            className="h-7.5 sm:h-8 gap-1.5 font-mono text-[11px] sm:text-xs font-semibold active:scale-95"
          >
            {isSolved ? (
              <>
                <CheckCircle2 className="size-3.5 shrink-0 fill-current/20" />
                <span>Solved</span>
              </>
            ) : (
              <>
                <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                <span>Mark Solved</span>
              </>
            )}
          </Button>

          <Link
            to="/compiler"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground px-2.5 h-7.5 sm:h-8 font-mono text-[11px] sm:text-xs font-semibold active:scale-95 transition-all"
            title="Open C++ Sandbox"
          >
            <Terminal className="size-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline">C++ Sandbox</span>
            <span className="sm:hidden">C++</span>
          </Link>

          {onOpenCppModal && (
            <Button
              type="button"
              onClick={onOpenCppModal}
              variant="outline"
              size="sm"
              className="h-7.5 sm:h-8 gap-1.5 font-mono text-[11px] sm:text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 border-primary/40 px-2.5 sm:px-3 active:scale-95"
            >
              <Code2 className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">C++ Modal</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={onCopyLink}
            variant="ghost"
            size="sm"
            className="h-7.5 sm:h-8 gap-1.5 font-mono text-[11px] sm:text-xs text-muted-foreground hover:text-foreground px-2 sm:px-2.5 active:scale-95"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="size-3.5 shrink-0" />
            )}
            <span>{copied ? "Copied" : "Share"}</span>
          </Button>
        </div>
      </div>

      {/* Problem Title & Difficulty Badge */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground font-display">
          {problem.title}
        </h1>
        <span
          className={`rounded-full border px-3 py-0.5 font-mono text-[10px] sm:text-xs font-bold shrink-0 ${diffColor(
            problem.difficulty,
          )}`}
        >
          {problem.difficulty}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] sm:text-xs font-bold text-primary">
          <Flame className="size-3" /> Freq {problem.freq ?? 85}%
        </span>
      </div>

      {/* Topics & Company Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(problem.topics ?? []).map((t) => (
          <span
            key={t}
            className="rounded-lg border border-border/80 bg-card/80 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-border"
          >
            {t}
          </span>
        ))}
        {(problem.companies ?? []).slice(0, 5).map((c) => (
          <span
            key={c}
            className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-primary transition-colors hover:bg-primary/15 uppercase tracking-wider"
          >
            {companyLabel(c)}
          </span>
        ))}
      </div>
    </div>
  );
});


import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Problem } from "@/lib/problems";
import { companyLabel } from "@/lib/problems";

interface ProblemHeaderProps {
  problem: Problem;
  copied: boolean;
  onCopyLink: () => void;
  onOpenCppModal?: () => void;
}

const diffColor = (d: string) =>
  d === "Easy"
    ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
    : d === "Medium"
      ? "border-amber-500/40 bg-amber-950/30 text-amber-300"
      : "border-rose-500/40 bg-rose-950/30 text-rose-300";

export const ProblemHeader = memo(function ProblemHeader({
  problem,
  copied,
  onCopyLink,
  onOpenCppModal,
}: ProblemHeaderProps) {

  return (
    <div className="flex flex-col gap-3 border-b border-border/70 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Problem Index
        </Link>
        <div className="flex items-center gap-2">
          {onOpenCppModal && (
            <Button
              type="button"
              onClick={onOpenCppModal}
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 border-primary/40"
            >
              <Code2 className="size-3.5" /> Run C++ Playground
            </Button>
          )}
          <Button
            type="button"
            onClick={onCopyLink}
            variant="ghost"
            size="sm"
            className="gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? "Copied" : "Share"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {problem.title}
          </h1>
          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold ${diffColor(
              problem.difficulty,
            )}`}
          >
            {problem.difficulty}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(problem.topics ?? []).map((t) => (
          <span
            key={t}
            className="rounded-md border border-border/70 bg-card/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
          >
            {t}
          </span>
        ))}
        {(problem.companies ?? []).slice(0, 5).map((c) => (
          <span
            key={c}
            className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary"
          >
            {companyLabel(c)}
          </span>
        ))}
      </div>
    </div>
  );
});


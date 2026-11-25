import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import { AddToNotesButton } from "@/components/notes/AddToNotesButton";
import { PatternVisualDiagram } from "@/components/patterns/PatternVisualDiagram";
import type { StructuredPatternNotes } from "@/lib/master-patterns/types";

interface StructuredNotesPanelProps {
  notes: StructuredPatternNotes;
  loadingQuestions: boolean;
  onStartQuestions: () => void;
}

export const StructuredNotesPanel: React.FC<StructuredNotesPanelProps> = ({
  notes,
  loadingQuestions,
  onStartQuestions,
}) => {
  return (
    <div className="space-y-6">
      <div className="border-2 border-border bg-card p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              INTERMEDIATE // TAILORED STUDY DOSSIER
            </div>
            <h2 className="mt-1 text-xl sm:text-2xl font-black font-display">
              {notes.title}
            </h2>
          </div>

          <AddToNotesButton
            sourceType="AI_LEARNING_MODULE"
            title={notes.title}
            variant="compact"
            item={{
              title: notes.title,
              tags: ["MasterPatterns", notes.patternId],
              codeSnippet: notes.canonicalTemplate.code,
              codeLanguage:
                notes.canonicalTemplate.language === "python"
                  ? "python"
                  : notes.canonicalTemplate.language === "java"
                    ? "java"
                    : "cpp",
              invariantText: notes.canonicalTemplate.invariantAnnotation,
              explanation: notes.motivatedDiscovery.whyItWorks,
            }}
          />
        </div>

        {/* Minimal Tree Pruning Notice */}
        {notes.prunedStrandIds.length > 0 && (
          <div className="border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-mono font-bold uppercase text-emerald-500">
                Prerequisites Pruned ({notes.prunedStrandIds.length}):{" "}
              </span>
              <span className="text-muted-foreground">
                You already proved mastery on{" "}
                <span className="font-mono text-foreground">
                  {notes.prunedStrandIds.join(", ")}
                </span>
                , so these notes skip redundant basics and focus directly on new invariants.
              </span>
            </div>
          </div>
        )}

        {/* User-Specific Trap Warnings */}
        {notes.highlightedTrapNotes.length > 0 && (
          <div className="border border-amber-500/40 bg-amber-500/5 p-4 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase text-amber-500">
              <AlertTriangle className="size-3.5" />
              Personalized Pitfall Watchlist
            </div>
            <ul className="space-y-1 text-xs text-foreground/90">
              {notes.highlightedTrapNotes.map((t, idx) => (
                <li key={idx}>• {t}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 1. Unconditional Truths (LearnHarness Principle i) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-foreground">
            <BookOpen className="size-4 text-primary" />
            1. Unconditional Truths (Foundations to Lock In)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {notes.unconditionalTruths.map((truth, idx) => (
              <div
                key={idx}
                className="border border-border bg-background p-4 space-y-1.5"
              >
                <div className="font-mono text-[11px] font-bold text-primary uppercase">
                  {truth.title}
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {truth.statement}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Motivated Discovery (LearnHarness Principle ii) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-foreground">
            <Lightbulb className="size-4 text-amber-500" />
            2. Motivated Discovery — Why Brute Force Fails
          </div>
          <div className="border border-border bg-background p-4 space-y-3 text-xs leading-relaxed">
            <div>
              <span className="font-mono font-bold uppercase text-rose-500">
                Bottleneck:{" "}
              </span>
              <span className="text-foreground/90">
                {notes.motivatedDiscovery.bruteForceBottleneck}
              </span>
            </div>
            <div>
              <span className="font-mono font-bold uppercase text-primary">
                Key Insight:{" "}
              </span>
              <span className="text-foreground/90">
                {notes.motivatedDiscovery.keyInsight}
              </span>
            </div>
            <div>
              <span className="font-mono font-bold uppercase text-emerald-500">
                Why It Holds:{" "}
              </span>
              <span className="text-foreground/90">
                {notes.motivatedDiscovery.whyItWorks}
              </span>
            </div>
          </div>
        </section>

        {/* 3. Canonical Template & Invariant Annotation */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-foreground">
            <Code2 className="size-4 text-emerald-500" />
            3. Pattern Skeleton & Invariant Notes ({notes.canonicalTemplate.language})
          </div>
          <pre className="overflow-x-auto border border-border bg-[#161312] text-[#F5F2EB] p-4 font-mono text-xs leading-relaxed">
            <code>{notes.canonicalTemplate.code}</code>
          </pre>
          <div className="border border-border bg-muted/30 p-3 font-mono text-[11px] text-muted-foreground whitespace-pre-line">
            {notes.canonicalTemplate.invariantAnnotation}
          </div>
        </section>

        {/* 3b. Interactive Excalidraw Visual Invariant Walkthrough */}
        <PatternVisualDiagram patternId={notes.patternId} />

        {/* 4. Pitfall Matrix */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-foreground">
            <ShieldAlert className="size-4 text-rose-500" />
            4. When This Pattern Breaks (Pitfall Matrix)
          </div>
          <div className="space-y-2">
            {notes.pitfalls.map((p, idx) => (
              <div
                key={idx}
                className="border border-border bg-background p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
              >
                <div>
                  <span className="font-mono text-[10px] uppercase text-rose-500 font-bold block">
                    Trap
                  </span>
                  <span className="text-foreground/90">{p.trap}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase text-amber-500 font-bold block">
                    What Breaks
                  </span>
                  <span className="text-foreground/90">{p.counterexample}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase text-emerald-500 font-bold block">
                    Invariant Fix
                  </span>
                  <span className="text-foreground/90">{p.fix}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Proceed CTA */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Take your time reading the invariants above. Next, the AI will test your reasoning step by step and rate your completeness.
          </p>
          <button
            type="button"
            disabled={loadingQuestions}
            onClick={onStartQuestions}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] hover:opacity-90 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {loadingQuestions ? "Preparing Checks..." : "I'm Ready — Start Mastery Checks"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

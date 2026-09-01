import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

import {
  Brain,
  Code2,
  Cpu,
  Dices,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ListChecks,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Visualizer } from "@/components/Visualizer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  PLAYGROUND_TEMPLATES,
  PLAYGROUND_CATEGORIES,
  type PlaygroundTemplate,
} from "@/lib/playground-templates";
import { reviewPlaygroundPseudocode } from "@/lib/playground.functions";
import type { ReviewResult } from "@/lib/review.functions";
import { VALID_VIZ_TYPES, type VizType } from "@/lib/problems";
import { toast } from "sonner";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "DSA Sandbox & Algorithm Playground — DSA.viz" },
      {
        name: "description",
        content:
          "Interactive DSA Sandbox: write arbitrary pseudocode on custom test inputs, get instant AI interviewer critique, complexity ratings, and step-by-step visual execution animations.",
      },
      {
        property: "og:title",
        content: "DSA Sandbox & Algorithm Playground — DSA.viz",
      },
      {
        property: "og:description",
        content:
          "Test any algorithm on custom data structures. Get AI ratings and watch animated step-by-step execution.",
      },
    ],
  }),
  component: PlaygroundPage,
});

const badgeFor = (c: string) =>
  c === "Optimal"
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-xs shadow-emerald-500/25 font-extrabold"
    : c === "Better"
      ? "bg-blue-500/20 text-blue-300 border-blue-400/60 shadow-xs shadow-blue-500/25 font-extrabold"
      : c === "Brute Force"
        ? "bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-xs shadow-amber-500/25 font-extrabold"
        : "bg-purple-500/20 text-purple-300 border-purple-400/60 shadow-xs shadow-purple-500/25 font-extrabold";

function PlaygroundPage() {
  const runReview = useServerFn(reviewPlaygroundPseudocode);

  // Playground state
  const defaultTemplate = PLAYGROUND_TEMPLATES[0]!;
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate.id);
  const [title, setTitle] = useState(defaultTemplate.title);
  const [vizType, setVizType] = useState<VizType>(defaultTemplate.type);
  const [inputArrayStr, setInputArrayStr] = useState(defaultTemplate.defaultInput.join(", "));
  const [targetStr, setTargetStr] = useState(String(defaultTemplate.target ?? 10));
  const [pseudocode, setPseudocode] = useState(defaultTemplate.pseudocode);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "All") return PLAYGROUND_TEMPLATES;
    return PLAYGROUND_TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [showReferenceViz, setShowReferenceViz] = useState(false);

  // Parse custom input array
  const parsedInputArray = useMemo(() => {
    return inputArrayStr
      .split(/[, ]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => Number.isFinite(n));
  }, [inputArrayStr]);

  const parsedTarget = useMemo(() => {
    const n = Number(targetStr.trim());
    return Number.isFinite(n) ? n : undefined;
  }, [targetStr]);

  // Load a preset template
  const loadTemplate = (template: PlaygroundTemplate) => {
    setSelectedTemplateId(template.id);
    setTitle(template.title);
    setVizType(template.type);
    setInputArrayStr(template.defaultInput.join(", "));
    setTargetStr(template.target !== undefined ? String(template.target) : "");
    setPseudocode(template.pseudocode);
    setResult(null);
    setError(null);
    toast.info(`Loaded preset: ${template.title}`);
  };

  // Randomize input array
  const randomizeInput = () => {
    const size = 6 + Math.floor(Math.random() * 3);
    const newArr = Array.from({ length: size }, () => Math.floor(Math.random() * 30) + 1);
    if (vizType === "array" || vizType === "bst") {
      newArr.sort((a, b) => a - b);
    }
    setInputArrayStr(newArr.join(", "));
    if (newArr.length > 0) {
      setTargetStr(String(newArr[Math.floor(newArr.length / 2)]));
    }
    toast.success("Generated random test array");
  };

  // Sort input ascending
  const sortAsc = () => {
    const sorted = [...parsedInputArray].sort((a, b) => a - b);
    setInputArrayStr(sorted.join(", "));
    toast.info("Sorted array ascending");
  };

  // Reverse input
  const reverseInput = () => {
    const reversed = [...parsedInputArray].reverse();
    setInputArrayStr(reversed.join(", "));
    toast.info("Reversed test array");
  };

  // Handle execution & review submission
  const handleExecute = async () => {
    if (!pseudocode.trim()) {
      setError("Please write some pseudocode to analyze.");
      toast.error("Please write some pseudocode first");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await runReview({
        data: {
          title: title.trim() || "Custom Algorithm",
          type: vizType,
          pseudocode: pseudocode.trim(),
          testInput: parsedInputArray.length > 0 ? parsedInputArray : [1, 2, 3, 4, 5],
          ...(parsedTarget !== undefined ? { target: parsedTarget } : {}),
        },
      });
      setResult(res);
      toast.success("Algorithm analysis complete");
    } catch (err) {
      console.error(err);
      setError("Unable to complete review. Please check your connection and try again.");
      toast.error("Review request failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteRef = useRef(handleExecute);
  handleExecuteRef.current = handleExecute;

  // Keyboard shortcut: Cmd/Ctrl + Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleExecuteRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  return (
    <div className="min-h-screen pb-20">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Header Hero */}
        <section className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                to="/"
                className="group mb-2 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                <span>Back to Problems</span>
              </Link>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="size-4 text-primary" />
                Interactive DSA Sandbox
              </div>
              <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Algorithm <span className="gradient-text">Playground</span>
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Write arbitrary pseudocode on custom data structures. Get instant AI rating,
                complexity analysis, and animated step-by-step execution.
              </p>
            </div>
          </div>

          {/* Quick Preset Selector Chips & Categories */}
          <div className="mt-6 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Algorithm Category:
              </span>
              <span className="font-mono text-xs text-muted-foreground/70">
                {filteredTemplates.length} templates available
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {PLAYGROUND_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Template Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {filteredTemplates.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => loadTemplate(tmpl)}
                    className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary/20 text-primary shadow-xs shadow-primary/20 font-bold scale-105"
                        : "border-border/80 bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {tmpl.title}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2-Column Grid: Config & Code Editor (Left), Verdict & Visualization (Right) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Configuration & Pseudocode Editor */}
          <div className="flex flex-col gap-5 lg:col-span-6">
            {/* Input Data Deck */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Sliders className="size-4 text-primary" />
                  <span>Algorithm Configuration</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplateId("");
                    setTitle("Custom Algorithm");
                    setPseudocode("");
                    setResult(null);
                    toast.info("Playground reset");
                  }}
                  className="h-7 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95"
                >
                  <RotateCcw className="mr-1 size-3" /> Clear
                </Button>
              </div>

              {/* Title & Data Structure Type */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Algorithm Name
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. My Fast Sorting Solution"
                    className="font-mono text-xs bg-background/80"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Target Data Structure
                  </label>
                  <select
                    value={vizType}
                    onChange={(e) => setVizType(e.target.value as VizType)}
                    className="h-9 w-full rounded-md border border-input bg-background/80 px-3 py-1 font-mono text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {VALID_VIZ_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.toUpperCase()} ({t})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Test Input Array */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Custom Test Array Input
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={randomizeInput}
                      className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
                    >
                      <Dices className="size-3" /> Randomize
                    </button>
                    <button
                      type="button"
                      onClick={sortAsc}
                      className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
                    >
                      Sort Asc
                    </button>
                    <button
                      type="button"
                      onClick={reverseInput}
                      className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
                    >
                      Reverse
                    </button>
                  </div>
                </div>
                <Input
                  value={inputArrayStr}
                  onChange={(e) => setInputArrayStr(e.target.value)}
                  placeholder="e.g. 10, 5, 2, 6, 8, 3"
                  className="font-mono text-xs bg-background/80"
                />

                {/* Live Input Preview Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {parsedInputArray.map((val, idx) => (
                    <span
                      key={`preview-${idx}`}
                      className="rounded-md border border-border/80 bg-background/90 px-2 py-0.5 font-mono text-[10px] font-bold text-foreground shadow-xs"
                    >
                      [{idx}] {val}
                    </span>
                  ))}
                </div>
              </div>

              {/* Target / K Parameter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Target / Parameter Value (Optional)
                </label>
                <Input
                  value={targetStr}
                  onChange={(e) => setTargetStr(e.target.value)}
                  placeholder="e.g. 10 or 3"
                  className="font-mono text-xs bg-background/80"
                />
              </div>
            </div>

            {/* Pseudocode Editor */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Code2 className="size-4 text-primary" />
                  <span>Pseudocode Editor</span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {pseudocode.split("\n").length} lines
                </span>
              </div>

              <Textarea
                rows={12}
                value={pseudocode}
                onChange={(e) => setPseudocode(e.target.value)}
                placeholder="Write your algorithmic pseudocode here...
e.g.
left = 0, right = len(nums) - 1
while left < right:
    check condition..."
                className="font-mono text-xs leading-relaxed bg-background/80 shadow-inner focus-visible:ring-primary"
              />

              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Ctrl+Enter to evaluate</span>
                <span>{pseudocode.length} characters</span>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-fade">
                  {error}
                </div>
              )}

              <Button
                onClick={handleExecute}
                disabled={loading}
                className="mt-2 w-full gap-2 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Brain className="size-4 animate-spin text-primary-foreground" />
                    <span>Analyzing &amp; Animating...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current text-primary-foreground" />
                    <span>Run &amp; Animate Algorithm</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: AI Verdict & Interactive Visualizer */}
          <div className="flex flex-col gap-5 lg:col-span-6">
            {result ? (
              <div className="animate-rise flex flex-col gap-5">
                {/* Rating & Complexity Cards */}
                <div className="rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Cpu className="size-4 text-primary" />
                      <span>AI Interviewer Verdict</span>
                    </div>
                    <span
                      className={`rounded-full border px-3.5 py-1 font-mono text-xs font-bold ${badgeFor(result.classification)}`}
                    >
                      {result.classification === "Incomplete"
                        ? "Logic Incomplete"
                        : result.classification}
                    </span>
                  </div>

                  {/* Incomplete Logic Alert Banner */}
                  {!result.is_complete && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-warn/40 bg-warn/10 p-3.5 text-xs text-foreground animate-fade">
                      <AlertTriangle className="size-4 shrink-0 text-warn mt-0.5" />
                      <div>
                        <strong className="text-warn font-semibold">
                          Sandbox Logic Incomplete:{" "}
                        </strong>
                        <span>
                          Your pseudocode is missing required algorithm execution steps. Complete
                          your logic (whether Brute Force, Better, or Optimal) to run and unlock
                          live execution animations!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Missing Elements Checklist */}
                  {!result.is_complete &&
                    result.missing_elements &&
                    result.missing_elements.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-border/70 bg-background/50 p-3.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <ListChecks className="size-4 text-primary shrink-0" />
                          <span>What more to add to your pseudocode:</span>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          {result.missing_elements.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3 shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Time Complexity
                      </div>
                      <div className="mt-0.5 font-mono text-base font-bold text-primary">
                        {result.complexity.time}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3 shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Space Complexity
                      </div>
                      <div className="mt-0.5 font-mono text-base font-bold text-accent">
                        {result.complexity.space}
                      </div>
                    </div>
                  </div>

                  {/* Praise & Nudge callouts */}
                  <div className="mt-4 flex flex-col gap-2.5">
                    {result.praise && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs leading-relaxed text-foreground shadow-xs shadow-emerald-500/10">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                          <strong className="text-emerald-300 font-extrabold tracking-wide">Strong Habits: </strong>
                          <span className="text-foreground/95">{result.praise}</span>
                        </div>
                      </div>
                    )}
                    {result.nudge && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-3.5 text-xs leading-relaxed text-foreground shadow-xs shadow-primary/10">
                        <TrendingUp className="size-4 shrink-0 text-primary mt-0.5" />
                        <div>
                          <strong className="text-primary font-extrabold tracking-wide">
                            {!result.is_complete ? "Next Step Hint: " : "Optimization Hint: "}
                          </strong>
                          <span className="text-foreground/95">{result.nudge}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Markdown Critique */}
                  <div className="prose-sm mt-4 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-background/90 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-foreground [&_strong]:text-foreground">
                    <ReactMarkdown>{result.review}</ReactMarkdown>
                  </div>

                  {/* Model Attribution Bar */}
                  {result.models &&
                    (result.models.reviewer ||
                      result.models.visualizer ||
                      result.visualization_failed) && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {result.models.reviewer && (
                          <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5">
                            Reviewer: {result.models.reviewer}
                          </span>
                        )}
                        {result.models.visualizer ? (
                          <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5">
                            Visualizer: {result.models.visualizer}
                          </span>
                        ) : result.is_complete ? (
                          <span className="rounded-full border border-destructive/40 bg-destructive/10 text-destructive px-2 py-0.5">
                            Visualizer: didn't load
                          </span>
                        ) : null}
                      </div>
                    )}
                </div>

                {/* Animated Visualizer or Failure State */}
                {result.is_complete &&
                !result.visualization_failed &&
                result.viz_steps &&
                result.viz_steps.length > 0 ? (
                  <div className="rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Sparkles className="size-4 text-primary" />
                        <span>Live Execution Animation</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {result.viz_steps.length} steps
                      </span>
                    </div>

                    <Visualizer
                      array={result.test_array}
                      codeLines={result.code_lines}
                      steps={result.viz_steps}
                    />
                  </div>
                ) : result.is_complete &&
                  (result.visualization_failed ||
                    !result.viz_steps ||
                    result.viz_steps.length === 0) ? (
                  <div className="flex flex-col gap-4 animate-fade">
                    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 p-6 text-center">
                      <div className="flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-muted-foreground shadow-xs">
                        <Sparkles className="size-6 text-muted-foreground" />
                      </div>
                      <h4 className="text-base font-bold text-foreground">
                        Visualization didn't load
                      </h4>
                      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                        The AI visualizer couldn't generate an execution trace for this sandbox
                        logic. Your analysis verdict above is ready.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            void handleExecute();
                          }}
                          disabled={loading}
                          variant="outline"
                          className="gap-1.5 font-mono text-xs font-semibold"
                        >
                          <RotateCcw className="size-3.5" /> Retry Execution
                        </Button>
                        {result.reference_solution && (
                          <Button
                            type="button"
                            onClick={() => setShowReferenceViz((prev) => !prev)}
                            variant="ghost"
                            className="gap-1.5 font-mono text-xs text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <BookOpen className="size-3.5" />
                            {showReferenceViz
                              ? "Hide Reference Trace"
                              : "View Reference Solution Trace"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Optional Reference Solution Walkthrough */}
                    {showReferenceViz && result.reference_solution && (
                      <div className="rounded-2xl border border-primary/40 bg-card/75 p-6 shadow-sm backdrop-blur-sm animate-fade">
                        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-primary">
                            <BookOpen className="size-4" /> Reference Sandbox Simulation Trace
                          </div>
                          <span className="rounded bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-[9px] font-mono text-primary font-bold uppercase tracking-wider">
                            Reference Only
                          </span>
                        </div>
                        <Visualizer
                          array={result.reference_solution.test_array}
                          codeLines={result.reference_solution.code_lines}
                          steps={result.reference_solution.viz_steps}
                        />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              /* Empty state before running */
              <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/30 p-8 text-center animate-fade">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm shadow-primary/20">
                  <Brain className="size-7" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Ready to test your algorithm
                </h3>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Choose a preset or type your custom pseudocode, configure your test inputs on the
                  left, then click <strong>&quot;Run &amp; Animate Algorithm&quot;</strong> to watch your code
                  animate step-by-step.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default PlaygroundPage;

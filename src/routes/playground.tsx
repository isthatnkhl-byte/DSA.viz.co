import { createFileRoute, Link } from "@tanstack/react-router";
import { AiWord } from "@/components/brand/AiWord";
import { useState, useMemo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

import {
  Brain,
  Code2,
  Cpu,
  Dices,
  Play,
  RotateCcw,
  Sliders,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ListChecks,
  ArrowLeft,
  BookOpen,
  Zap,
  Flame,
  Binary,
  Layers,
  Check,
  ChevronRight,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Visualizer } from "@/components/Visualizer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  PLAYGROUND_TEMPLATES,
  PLAYGROUND_CATEGORIES,
  type PlaygroundTemplate,
} from "@/lib/playground-templates";
import { apiPlaygroundReview } from "@/lib/api-client";
import type { ReviewResult } from "@/lib/review.functions";
import { VALID_VIZ_TYPES, type VizType } from "@/lib/problems";
import { toast } from "sonner";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "DSA Sandbox & AI Invariant Laboratory — DSA.viz" },
      {
        name: "description",
        content:
          "Test any algorithm on custom data structures. Get instant AI rating, invariant audit, and animated step-by-step execution.",
      },
      { property: "og:title", content: "DSA Sandbox & AI Algorithm Playground" },
      {
        property: "og:description",
        content:
          "Test any algorithm on custom data structures. Get instant AI ratings and watch animated step-by-step execution.",
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
      const res = await apiPlaygroundReview({
        title: title.trim() || "Custom Algorithm",
        type: vizType,
        pseudocode: pseudocode.trim(),
        testInput: parsedInputArray.length > 0 ? parsedInputArray : [1, 2, 3, 4, 5],
        ...(parsedTarget !== undefined ? { target: parsedTarget } : {}),
      });
      setResult(res);
      toast.success("Algorithm analysis complete! 🚀");
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
    <div className="min-h-screen pb-24">
      <SiteHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        {/* Executive Header Banner */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-10 backdrop-blur-2xl shadow-xl">
          {/* Subtle atmospheric ambient glows */}
          <div className="absolute -left-20 -top-20 size-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 size-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <Link
                to="/problems"
                className="group mb-2 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                <span>Back to Algorithm Library</span>
              </Link>
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-2">
                <AiWord className="size-3.5 text-primary" />
                <span>Interactive Invariant Sandbox</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                Algorithm <span className="bg-gradient-to-r from-primary via-accent to-emerald-400 bg-clip-text text-transparent">Playground</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground font-sans max-w-2xl leading-relaxed">
                Prototype arbitrary algorithms on custom test datasets. Receive structured invariant audits, asymptotic complexity formulas, and animated step-by-step visualizer traces.
              </p>
            </div>

            {/* Telemetry Badge Deck */}
            <div className="rounded-2xl border border-border/80 bg-background/80 p-4 font-mono shadow-md backdrop-blur-xl shrink-0 w-full sm:w-auto flex items-center gap-6">
              <div>
                <div className="text-[11px] uppercase text-muted-foreground">Execution Mode</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">Step-by-Step</div>
              </div>
              <div className="h-10 w-px bg-border/60" />
              <div>
                <div className="text-[11px] uppercase text-muted-foreground">Trace Engine</div>
                <div className="text-xl sm:text-2xl font-black text-primary font-display">Interactive</div>
              </div>
            </div>
          </div>

          {/* Category & Template Selector Strip */}
          <div className="mt-8 pt-6 border-t border-border/50 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" /> Pattern Categories:
              </span>
              <span className="font-mono text-xs text-muted-foreground/70">
                {filteredTemplates.length} Presets Available
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
                    className={`rounded-xl px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20 scale-[1.02]"
                        : "border border-border/60 bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
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
                    className={`rounded-xl border px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                      isSelected
                        ? "border-primary bg-primary/20 text-primary shadow-xs shadow-primary/25 font-bold scale-[1.02]"
                        : "border-border/70 bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span>{tmpl.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid: Config & Code Editor (Left), AI Verdict & Visualization (Right) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: Configuration & Pseudocode Editor */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            {/* Input Data Deck */}
            <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/70 p-6 shadow-md backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Sliders className="size-4 text-primary" />
                  <span>Algorithm Configuration</span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setSelectedTemplateId("");
                    setTitle("Custom Algorithm");
                    setPseudocode("");
                    setResult(null);
                    toast.info("Playground reset");
                  }}
                  className="text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95"
                >
                  <RotateCcw className="mr-1 size-3" /> Clear All
                </Button>
              </div>

              {/* Title & Target Data Structure */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-semibold text-muted-foreground">
                    Algorithm Name
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. My Fast Sorting Solution"
                    className="font-mono text-xs bg-background/80 rounded-xl"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono font-semibold text-muted-foreground">
                    Target Data Structure
                  </label>
                  <select
                    value={vizType}
                    onChange={(e) => setVizType(e.target.value as VizType)}
                    className="h-9.5 w-full rounded-xl border border-input bg-background/80 px-3 py-1 font-mono text-xs text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold text-muted-foreground">
                    Custom Test Array
                  </label>
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={randomizeInput}
                      className="flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/80 px-2 py-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all active:scale-95"
                    >
                      <Dices className="size-3 text-primary" /> Random
                    </button>
                    <button
                      type="button"
                      onClick={sortAsc}
                      className="rounded-lg border border-border/60 bg-secondary/80 px-2 py-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all active:scale-95"
                    >
                      Sort Asc
                    </button>
                    <button
                      type="button"
                      onClick={reverseInput}
                      className="rounded-lg border border-border/60 bg-secondary/80 px-2 py-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all active:scale-95"
                    >
                      Reverse
                    </button>
                  </div>
                </div>
                <Input
                  value={inputArrayStr}
                  onChange={(e) => setInputArrayStr(e.target.value)}
                  placeholder="e.g. 10, 5, 2, 6, 8, 3"
                  className="font-mono text-xs bg-background/80 rounded-xl"
                />

                {/* Live Input Preview Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {parsedInputArray.map((val, idx) => (
                    <span
                      key={`preview-${idx}`}
                      className="rounded-lg border border-border/70 bg-background/90 px-2 py-0.5 font-mono text-[10px] font-bold text-foreground shadow-xs"
                    >
                      [{idx}] {val}
                    </span>
                  ))}
                </div>
              </div>

              {/* Target / K Parameter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-semibold text-muted-foreground">
                  Target / Parameter Value (Optional)
                </label>
                <Input
                  value={targetStr}
                  onChange={(e) => setTargetStr(e.target.value)}
                  placeholder="e.g. 10 or 3"
                  className="font-mono text-xs bg-background/80 rounded-xl"
                />
              </div>
            </div>

            {/* Pseudocode Editor */}
            <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/70 p-6 shadow-md backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Code2 className="size-4 text-primary" />
                  <span>Algorithm Logic Editor</span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {pseudocode.split("\n").length} lines • {pseudocode.length} chars
                </span>
              </div>

              <Textarea
                rows={12}
                value={pseudocode}
                onChange={(e) => setPseudocode(e.target.value)}
                placeholder="Write your algorithmic pseudocode or logic here...
e.g.
left = 0, right = len(nums) - 1
while left < right:
    check condition..."
                className="font-mono text-xs leading-relaxed bg-background/80 rounded-2xl shadow-inner focus-visible:ring-primary p-4 border-border/70"
              />

              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span>Press ⌘+Enter / Ctrl+Enter to evaluate</span>
                <span className="text-primary font-semibold">Gemini Flash Reasoning Active</span>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive animate-fade">
                  {error}
                </div>
              )}

              <Button
                variant="premium"
                size="lg"
                onClick={handleExecute}
                disabled={loading}
                className="mt-2 w-full gap-2 rounded-2xl"
              >
                {loading ? (
                  <>
                    <Brain className="size-4 animate-spin text-primary-foreground" />
                    <span>Analyzing Invariants &amp; Animating Trace...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current text-primary-foreground" />
                    <span>Evaluate &amp; Animate Algorithm</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: AI Verdict & Interactive Visualizer */}
          <div className="flex flex-col gap-6 lg:col-span-6">
            {result ? (
              <div className="animate-rise flex flex-col gap-6">
                {/* Rating & Complexity Cards */}
                <div className="rounded-3xl border border-border/70 bg-card/75 p-6 shadow-md backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Cpu className="size-4 text-primary" />
                      <span>AI Invariant Audit Verdict</span>
                    </div>
                    <span
                      className={`rounded-full border px-3.5 py-1 font-mono text-xs font-bold ${badgeFor(
                        result.classification,
                      )}`}
                    >
                      {result.classification === "Incomplete"
                        ? "Logic Incomplete"
                        : result.classification}
                    </span>
                  </div>

                  {/* Incomplete Logic Alert Banner */}
                  {!result.is_complete && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-warn/40 bg-warn/10 p-4 text-xs text-foreground animate-fade">
                      <AlertTriangle className="size-4 shrink-0 text-warn mt-0.5" />
                      <div>
                        <strong className="text-warn font-semibold">
                          Sandbox Logic Incomplete:{" "}
                        </strong>
                        <span>
                          Your logic is missing necessary state transitions or return steps. Complete your implementation to unlock the animated execution trace!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Missing Elements Checklist */}
                  {!result.is_complete &&
                    result.missing_elements &&
                    result.missing_elements.length > 0 && (
                      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/50 p-4 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-foreground font-mono">
                          <ListChecks className="size-4 text-primary shrink-0" />
                          <span>Checklist to complete your logic:</span>
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

                  {/* Asymptotic Complexity Formulas */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-xs">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        Time Complexity
                      </div>
                      <div className="mt-1 font-mono text-lg font-black text-primary">
                        {result.complexity.time}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-xs">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        Space Complexity
                      </div>
                      <div className="mt-1 font-mono text-lg font-black text-accent">
                        {result.complexity.space}
                      </div>
                    </div>
                  </div>

                  {/* Praise & Nudge callouts */}
                  <div className="flex flex-col gap-3">
                    {result.praise && (
                      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs leading-relaxed text-foreground shadow-xs shadow-emerald-500/10">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                          <strong className="text-emerald-300 font-extrabold tracking-wide font-mono">
                            Strong Habits:{" "}
                          </strong>
                          <span className="text-foreground/95">{result.praise}</span>
                        </div>
                      </div>
                    )}
                    {result.nudge && (
                      <div className="flex items-start gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-xs leading-relaxed text-foreground shadow-xs shadow-primary/10">
                        <TrendingUp className="size-4 shrink-0 text-primary mt-0.5" />
                        <div>
                          <strong className="text-primary font-extrabold tracking-wide font-mono">
                            {!result.is_complete ? "Next Step Hint: " : "Optimization Hint: "}
                          </strong>
                          <span className="text-foreground/95">{result.nudge}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Markdown Critique */}
                  <div className="prose-sm border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-background/90 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-foreground [&_strong]:text-foreground">
                    <ReactMarkdown>{result.review}</ReactMarkdown>
                  </div>
                </div>

                {/* Animated Visualizer */}
                {result.is_complete &&
                !result.visualization_failed &&
                result.viz_steps &&
                result.viz_steps.length > 0 ? (
                  <div className="rounded-3xl border border-border/70 bg-card/75 p-6 shadow-md backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <AiWord className="size-4 text-primary" />
                        <span>Live Execution Trace Animation</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {result.viz_steps.length} frames generated
                      </span>
                    </div>

                    <Visualizer
                      array={result.test_array}
                      codeLines={result.code_lines}
                      steps={result.viz_steps}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              /* High-End Empty State Explaining the Invariant Lab */
              <div className="rounded-3xl border border-dashed border-border/80 bg-card/40 p-8 sm:p-10 text-center space-y-6 backdrop-blur-md">
                <div className="mx-auto size-16 rounded-3xl border border-primary/40 bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                  <Brain className="size-8" />
                </div>

                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-black text-foreground">
                    Algorithm Invariant Lab
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Write your pseudocode on the left or select a preset template above, then click <strong>Evaluate &amp; Animate Algorithm</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <div className="font-mono text-xs font-bold text-foreground flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-400" /> Loop Boundary Audit
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Detects off-by-one pointer errors and infinite loops before runtime.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                    <div className="font-mono text-xs font-bold text-foreground flex items-center gap-2">
                      <Check className="size-3.5 text-primary" /> Asymptotic Calculus
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Extracts rigorous Time and Auxiliary Space bounds automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default PlaygroundPage;

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Sparkles, RotateCcw, BookOpen, Lightbulb, ExternalLink, Code2, Play } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Visualizer } from "@/components/Visualizer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import {
  leetcodeUrl,
  problemBySlug,
  getCanonicalMultiDatasets,
  type TestDataset,
  type VizStep,
} from "@/lib/problems";
import { getStatement } from "@/lib/problem.functions";
import { statementForSlug } from "@/lib/statements";
import type { ReviewResult } from "@/lib/review.functions";
import { apiReviewPseudocode, apiGenerateDatasetViz } from "@/lib/api-client";
import { saveSubmission, getProfileStats } from "@/lib/submissions.functions";
import { toast } from "sonner";

import { ProblemHeader } from "@/components/problem/ProblemHeader";
import { ProblemStatementTab } from "@/components/problem/ProblemStatementTab";
import { PseudocodeEditor } from "@/components/problem/PseudocodeEditor";
import { MonacoCodeEditor } from "@/components/editor/MonacoCodeEditor";
import { ReviewCard } from "@/components/problem/ReviewCard";
import { DatasetToolbar } from "@/components/problem/DatasetToolbar";

export const Route = createFileRoute("/problem/$slug")({
  loader: ({ params }) => {
    const slug = params?.slug ? String(params.slug) : "";
    const problem = problemBySlug(slug);
    if (!problem) throw notFound();
    return { problem };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.problem) {
      return {
        meta: [{ title: "Problem not found — DSA.viz" }, { name: "robots", content: "noindex" }],
      };
    }
    const t = `${loaderData.problem.title} — DSA.viz`;
    const d = `Write pseudocode for ${loaderData.problem.title} (${loaderData.problem.difficulty}), get an AI interviewer verdict and watch your algorithm animated step by step.`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProblemPage,
  notFoundComponent: () => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-foreground">Problem not found</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          The requested problem could not be located. Browse all available problems below.
        </p>
        <Link to="/" className="mt-5 inline-block">
          <Button className="font-bold">Back to problems</Button>
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }: { error: Error; reset: () => void }) => (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-foreground">This problem didn't load</h2>
        <p className="mt-2 text-xs text-muted-foreground font-mono">
          {error?.message || "An unexpected error occurred while loading this problem."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="outline" className="font-mono text-xs">
            Try again
          </Button>
          <Link to="/">
            <Button className="font-bold text-xs">Back to problems</Button>
          </Link>
        </div>
      </div>
    </div>
  ),
});

function ProblemPage() {
  const loaderData = Route.useLoaderData();
  const problem = loaderData?.problem;
  const fetchStatement = useServerFn(getStatement);
  
  const {
    data: remoteStatement,
    isLoading: isStatementLoading,
    refetch: refetchStatement,
  } = useQuery({
    queryKey: ['problem-statement', problem?.slug],
    queryFn: () => fetchStatement({ data: { slug: problem?.slug || "" } }),
    enabled: !!problem?.slug,
    staleTime: 1000 * 60 * 60,
  });

  const statement =
    remoteStatement?.statement || (problem?.slug ? statementForSlug(problem.slug, problem) : "");

  const { user } = useAuth();
  
  const fetchStats = useServerFn(getProfileStats);
  const { data: profileStats } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: () => fetchStats(),
    enabled: !!user,
  });
  
  const [githubLoading, setGithubLoading] = useState(false);
  const handlePushToGithub = async (codeStr: string) => {
    if (!(profileStats?.profile as any)?.githubToken) {
      toast.error("Please connect your GitHub account in your Profile first.");
      return;
    }
    
    setGithubLoading(true);
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          code: codeStr,
          titleSlug: problem?.slug,
          lang: "cpp" // Default to C++ as requested
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to push to GitHub");
      } else {
        toast.success("Successfully pushed pseudocode/draft to GitHub!", {
          action: {
            label: "View",
            onClick: () => window.open(data.url, "_blank")
          }
        });
      }
    } catch (e) {
      toast.error("An error occurred while pushing to GitHub");
    } finally {
      setGithubLoading(false);
    }
  };

  const save = useServerFn(saveSubmission);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"statement" | "strategy">("statement");
  const [pseudocode, setPseudocode] = useState("");
  const [userCode, setUserCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [activeDatasetId, setActiveDatasetId] = useState<string>("dataset_1");
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [customDataset, setCustomDataset] = useState<TestDataset | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const storageKey = `dsaviz:attempt:${problem?.slug ?? "unknown"}`;

  const currentSlugRef = useRef<string | null>(null);

  // Restore the last draft + review for this problem
  useEffect(() => {
    if (typeof window === "undefined" || !problem?.slug) return;
    if (currentSlugRef.current === problem.slug) return;
    currentSlugRef.current = problem.slug;

    setSaved(false);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setPseudocode("");
        setResult(null);
        setActiveDatasetId("dataset_1");
        return;
      }
      const cached = JSON.parse(raw) as { pseudocode?: string; result?: ReviewResult | null };
      setPseudocode(cached.pseudocode ?? "");
      if (
        cached.result &&
        typeof cached.result === "object" &&
        typeof cached.result.classification === "string"
      ) {
        setResult(cached.result);
        setActiveDatasetId(
          cached.result.active_dataset_id ?? cached.result.datasets?.[0]?.id ?? "dataset_1",
        );
      } else {
        setResult(null);
        setActiveDatasetId("dataset_1");
      }
    } catch {
      setPseudocode("");
      setResult(null);
      setActiveDatasetId("dataset_1");
    }
  }, [problem?.slug, storageKey]);

  const persist = useCallback(
    (code: string, res: ReviewResult | null) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ pseudocode: code, result: res }));
      } catch {
        /* storage may be full or blocked */
      }
    },
    [storageKey],
  );

  const onSubmit = useCallback(async () => {
    if (!pseudocode.trim() || !problem) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const res = await apiReviewPseudocode({
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        topics: problem.topics,
        pseudocode: pseudocode.trim(),
      });

      setResult(res);
      setActiveDatasetId(res.active_dataset_id ?? res.datasets?.[0]?.id ?? "dataset_1");
      persist(pseudocode, res);
      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

      if (user) {
        try {
          const saveRes = await save({
            data: {
              slug: problem.slug,
              title: problem.title,
              difficulty: problem.difficulty,
              code: pseudocode.trim(),
              status: res.classification,
              review: res.review,
              complexity: res.complexity,
            },
          });
          queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
          queryClient.invalidateQueries({ queryKey: ["profileStats"] });
          queryClient.invalidateQueries({ queryKey: ["submissions"] });
          if (saveRes && (saveRes as any).ok === false) {
            console.warn("Save submission issue:", (saveRes as any).error);
          } else {
            setSaved(true);
            toast.success("Attempt saved to your profile dashboard");
          }
        } catch (saveErr) {
          console.error("Failed to save attempt:", saveErr);
        }
      }
    } catch (err) {
      console.error("Problem submission review failed:", err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Failed to run review. Please try again.";
      toast.error(msg.length < 90 ? msg : "Failed to run review. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [pseudocode, problem, user, save, queryClient, persist]);

  const handleSelectDataset = useCallback(
    async (targetDataset: TestDataset) => {
      if (!problem || !result) return;
      setActiveDatasetId(targetDataset.id);

      // If this dataset already has a generated trace in cache, no API roundtrip needed
      if (result.dataset_traces?.[targetDataset.id]?.viz_steps?.length) {
        return;
      }

      setDatasetLoading(true);
      try {
        const trace = await apiGenerateDatasetViz({
          slug: problem.slug,
          pseudocode: pseudocode.trim(),
          dataset: targetDataset,
        });

        const updatedTraces = {
          ...(result.dataset_traces ?? {}),
          [targetDataset.id]: {
            test_array: trace.test_array,
            code_lines: trace.code_lines,
            viz_steps: trace.viz_steps,
            visualization_failed: trace.visualization_failed,
            visualization_error: trace.visualization_error,
          },
        };

        const updatedResult: ReviewResult = {
          ...result,
          active_dataset_id: targetDataset.id,
          dataset_traces: updatedTraces,
        };

        setResult(updatedResult);
        persist(pseudocode, updatedResult);
      } catch {
        toast.error("Failed to generate animation for this dataset.");
      } finally {
        setDatasetLoading(false);
      }
    },
    [problem, result, pseudocode, persist],
  );

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  // Keyboard shortcut: Cmd/Ctrl + Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void onSubmitRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const insertStarterTemplate = useCallback(() => {
    const starter = `# Approach for ${problem?.title ?? "Algorithm"}
# Data Structure / Pattern: ${problem?.topics?.[0] ?? "Array"}

def solve(input_data):
    # 1. Initialize pointers / state
    
    # 2. Iterate through input elements
    
    # 3. Apply state transitions / invariants
    
    # 4. Return optimal answer
`;
    setPseudocode(starter);
    persist(starter, result);
    toast.info("Starter pseudocode template inserted");
  }, [problem?.title, problem?.topics, persist, result]);


  const copyCode = () => {
    if (!pseudocode) return;
    void navigator.clipboard.writeText(pseudocode);
    setCopied(true);
    toast.success("Pseudocode copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const availableDatasets = useMemo(() => {
    let base: TestDataset[] = [];
    if (result?.datasets && result.datasets.length > 0) base = result.datasets;
    else if (problem) {
      base = getCanonicalMultiDatasets(problem.slug, problem.title, problem.topics ?? []);
    }
    if (customDataset) {
      if (!base.find(d => d.id === customDataset.id)) {
        base = [...base, customDataset];
      }
    }
    return base;
  }, [result?.datasets, problem, customDataset]);

  const currentDataset = useMemo(() => {
    return availableDatasets.find((d) => d.id === activeDatasetId) ?? availableDatasets[0];
  }, [availableDatasets, activeDatasetId]);

  const currentTrace = result?.dataset_traces?.[activeDatasetId];

  const currentSteps: VizStep[] = useMemo(() => {
    if (currentTrace?.viz_steps?.length) return currentTrace.viz_steps;
    if (activeDatasetId === availableDatasets[0]?.id && result?.viz_steps?.length) {
      return result.viz_steps;
    }
    return [];
  }, [currentTrace?.viz_steps, activeDatasetId, availableDatasets, result?.viz_steps]);

  const currentCodeLines = currentTrace?.code_lines ?? result?.code_lines ?? [];
  const currentTestArray =
    currentTrace?.test_array ?? currentDataset?.array ?? result?.test_array ?? [];

  if (!problem) {
    return (
      <div className="min-h-screen pb-20">
        <SiteHeader />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h2 className="text-xl font-bold text-foreground">Problem not found</h2>
          <Link to="/" className="mt-4 inline-block">
            <Button>Back to problems</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <SiteHeader />

      <main className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12">
        {/* Left Column: Problem Details & Pseudocode Editor */}
        <section className="flex flex-col gap-5 lg:col-span-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/75 p-6 shadow-sm backdrop-blur-sm">
            <ProblemHeader problem={problem} copied={copied} onCopyLink={copyCode} />

            {/* Tab Navigation: Problem Statement vs Strategy */}
            <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab("statement")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                  activeTab === "statement"
                    ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <BookOpen className="size-3.5" /> Problem Statement
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("strategy")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                  activeTab === "strategy"
                    ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Lightbulb className="size-3.5" /> Approach &amp; Invariants
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "statement" ? (
              <div className="max-h-[380px] overflow-y-auto pr-2">
                <ProblemStatementTab
                  statement={statement}
                  isLoading={isStatementLoading && !statement}
                  onRetry={() => refetchStatement()}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-2 text-xs text-muted-foreground">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 leading-relaxed text-foreground">
                  <strong className="text-primary font-bold">Interview Pattern Insight: </strong>
                  Focus on establishing the state transitions and loop invariants first. Define your
                  auxiliary structures and state before coding.
                </div>
                <div className="rounded-xl border border-border/60 bg-background/50 p-3 leading-relaxed">
                  <strong className="text-foreground">Optimal Time Complexity: </strong>
                  Aim for optimal traversal patterns (
                  {problem.topics?.[0] ? `${problem.topics[0]} strategy` : "efficient traversal"}).
                </div>
              </div>
            )}

            {/* LeetCode link footer */}
            <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs text-muted-foreground">
              <a
                href={leetcodeUrl(problem.slug)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
              >
                Open on LeetCode <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* Box 1: Integrated Code Editor (VS Code / Monaco) */}
          <div className="rounded-2xl border border-border/80 bg-card/75 p-6 shadow-sm backdrop-blur-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="size-4 text-primary" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Integrated Code Editor (VS Code / Monaco)
                </h3>
              </div>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                Multi-Language (Python, C++, JS)
              </span>
            </div>

            <MonacoCodeEditor
              code={userCode}
              onChange={(code) => setUserCode(code)}
              onSubmit={() => void onSubmit()}
              onPushToGithub={handlePushToGithub}
              githubLoading={githubLoading}
              problemTitle={problem.title}
              problemSlug={problem.slug}
              defaultLanguage="python"
              height="380px"
              showSubmitButton={false}
            />
          </div>

          {/* Box 2: Pseudocode & Algorithm Draft */}
          <div className="rounded-2xl border border-border/80 bg-card/75 p-6 shadow-sm backdrop-blur-sm flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Pseudocode & Algorithm Draft
                </h3>
              </div>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                For AI Reviewer & Visualizer
              </span>
            </div>

            <PseudocodeEditor
              pseudocode={pseudocode}
              onChange={(code) => setPseudocode(code)}
              onSubmit={() => void onSubmit()}
              loading={loading}
              onInsertStarter={insertStarterTemplate}
              onPushToGithub={handlePushToGithub}
              githubLoading={githubLoading}
            />
          </div>
        </section>

        {/* Right Column: AI Review & Interactive Multi-Dataset Visualizer */}
        <section ref={reviewRef} className="flex flex-col gap-5 lg:col-span-6">
          {result ? <ReviewCard result={result} saved={saved} /> : null}

          {/* If review result is present, always keep DatasetToolbar visible */}
          {result ? (
            <div className="flex flex-col gap-4">
              <DatasetToolbar
                datasets={availableDatasets}
                currentDataset={currentDataset}
                onSelectDataset={(d) => void handleSelectDataset(d)}
                onAddCustomDataset={(d) => {
                  setCustomDataset(d);
                  void handleSelectDataset(d);
                }}
                datasetLoading={datasetLoading}
                result={result}
              />

              {datasetLoading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-primary/30 bg-card/85 p-8 text-center shadow-lg shadow-primary/5 backdrop-blur-md animate-fade">
                  <div className="relative flex size-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-40" />
                    <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/20">
                      <Sparkles className="size-7 animate-pulse text-primary" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 max-w-md">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                        ⚡ AI Trace Engine
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-foreground">
                      Generating Trace for {currentDataset?.label ?? "Selected Dataset"}
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {currentDataset?.description ||
                        "Simulating multi-step execution walkthrough with your algorithm..."}
                    </p>
                  </div>

                  {/* Dataset Quick Metrics Chip */}
                  {currentDataset && (
                    <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 font-mono text-xs text-muted-foreground">
                      {currentDataset.matrix ? (
                        <span className="font-bold text-primary">
                          Grid: {currentDataset.matrix.length} rows ×{" "}
                          {currentDataset.matrix[0]?.length ?? 0} cols
                        </span>
                      ) : currentDataset.array ? (
                        <span className="truncate max-w-[280px]">
                          Input: [{currentDataset.array.slice(0, 8).join(", ")}
                          {currentDataset.array.length > 8 ? "..." : ""}]
                        </span>
                      ) : null}
                      {currentDataset.target !== undefined && (
                        <span className="text-foreground font-bold border-l border-border pl-2.5">
                          Target: {currentDataset.target}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 font-mono text-xs text-primary font-semibold mt-1">
                    <span className="size-2 rounded-full bg-primary animate-ping" />
                    <span>Simulating full traversal steps...</span>
                  </div>
                </div>
              ) : !result.is_complete || result.classification === "Incomplete" ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3.5 rounded-2xl border border-dashed border-amber-500/40 bg-amber-950/10 p-7 text-center animate-fade">
                  <div className="relative flex size-14 items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-sm opacity-60" />
                    <div className="relative flex size-12 items-center justify-center rounded-2xl border border-amber-500/50 bg-card text-amber-400 shadow-xs">
                      <Code2 className="size-6 text-amber-400" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 max-w-md">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      Visualizer Paused • Logic Incomplete
                    </span>
                    <h4 className="text-base font-bold text-foreground mt-1">
                      Complete Your Algorithmic Approach
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      The execution engine requires an end-to-end algorithmic flow (traversal loops, state transitions, and a return statement) to animate real step-by-step dataset walkthroughs.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={insertStarterTemplate}
                      className="gap-1.5 font-mono text-xs font-semibold border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                    >
                      <Sparkles className="size-3.5 text-amber-400" /> Insert Starter Template
                    </Button>
                  </div>
                </div>
              ) : currentSteps.length > 0 ? (
                <div className="rounded-2xl border border-border/80 bg-card/75 p-6 shadow-sm backdrop-blur-sm">
                  <Visualizer
                    key={`${activeDatasetId}-${currentSteps.length}`}
                    array={currentTestArray}
                    codeLines={currentCodeLines}
                    steps={currentSteps}
                  />
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 p-6 text-center animate-fade">
                  <div className="relative flex size-14 items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-sm opacity-50" />
                    <div className="relative flex size-12 items-center justify-center rounded-2xl border border-primary/40 bg-card text-primary shadow-xs">
                      <Play className="size-5 fill-primary text-primary ml-0.5" />
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-foreground">Dataset Ready to Simulate</h4>
                  <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
                    Click the button below to generate a step-by-step animation for{" "}
                    {currentDataset?.label ?? "this dataset"}.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      if (currentDataset) void handleSelectDataset(currentDataset);
                    }}
                    disabled={datasetLoading}
                    className="gap-1.5 font-mono text-xs font-semibold mt-1 shadow-xs"
                  >
                    <RotateCcw className="size-3.5" /> Generate Animation
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center backdrop-blur-xs animate-fade">
              {/* Premium Icon Badge */}
              <div className="relative flex size-16 items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/30 to-purple-500/20 blur-md opacity-60 animate-pulse" />
                <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-b from-card via-background to-primary/10 text-primary shadow-md shadow-primary/10">
                  <Code2 className="size-7 text-primary transition-transform duration-300" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 max-w-lg">
                <div className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-[10px] text-muted-foreground mb-1">
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-semibold text-foreground">
                    C++
                  </span>
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-semibold text-foreground">
                    Java
                  </span>
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-semibold text-foreground">
                    Python
                  </span>
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-semibold text-foreground">
                    JavaScript / Go / Rust
                  </span>
                </div>
                <h4 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                  Algorithm Visualizer &amp; AI Reviewer
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Type pseudocode in your own language (C++ / Java / Python / ...) and hit <strong>Review &amp; Step-by-Step Trace</strong> to
                  see review and visualization.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

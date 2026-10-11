import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Sparkles,
  RotateCcw,
  BookOpen,
  Lightbulb,
  ExternalLink,
  Code2,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Columns,
  Maximize2,
  Monitor,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Visualizer } from "@/components/Visualizer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { taskCompletionManager, type TaskRecordData } from "@/lib/task-completion-manager";
import {
  leetcodeUrl,
  problemBySlug,
  getCanonicalMultiDatasets,
  type TestDataset,
  type VizStep,
} from "@/lib/problems";
import { getStatement } from "@/lib/problem.functions";
import { statementForSlug } from "@/lib/statements";
import type { ReviewResult, DatasetPlanResult, ExecutionPlanStep } from "@/lib/review.functions";
import { apiReviewPseudocode, apiGenerateDatasetsAndPlan, apiGenerateDatasetViz, apiVerifyDatasetTrace } from "@/lib/api-client";
import { saveSubmission, getProfileStats } from "@/lib/submissions.functions";
import { toast } from "sonner";
import { useSessionContextStore } from "@/hooks/useSessionContextStore";
import {
  pushSolutionToGithub,
  resumePendingGithubPushIfPresent,
} from "@/lib/github-sync";

import { ProblemHeader } from "@/components/problem/ProblemHeader";
import { ProblemStatementTab } from "@/components/problem/ProblemStatementTab";
import { PseudocodeEditor } from "@/components/problem/PseudocodeEditor";
import { MonacoCodeEditor } from "@/components/editor/MonacoCodeEditor";
import { ReviewCard } from "@/components/problem/ReviewCard";
import { DatasetToolbar } from "@/components/problem/DatasetToolbar";
import { ProblemDiffNudgePanel } from "@/components/problem/ProblemDiffNudgePanel";
import { TraceVerificationPanel } from "@/components/problem/TraceVerificationPanel";
import { useChat } from "@/context/ChatContext";

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
  const {
    data: remoteStatement,
    isLoading: isStatementLoading,
    refetch: refetchStatement,
  } = useQuery({
    queryKey: ['problem-statement', problem?.slug],
    queryFn: async () => {
      const res = await fetch(`/api/statement?slug=${encodeURIComponent(problem?.slug || "")}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!problem?.slug,
    staleTime: 1000 * 60 * 60,
  });

  const statement =
    remoteStatement?.statement || (problem?.slug ? statementForSlug(problem.slug, problem) : "");

  const { user, token } = useAuth();
  
  const { data: profileStats } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: async () => {
      if (!token) return { profile: null };
      const res = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { profile: null };
      return { profile: await res.json() };
    },
    enabled: !!user && !!token,
  });
  
  const [githubLoading, setGithubLoading] = useState(false);

  useEffect(() => {
    void resumePendingGithubPushIfPresent();
  }, [user?.uid]);

  const handlePushToGithub = async (codeStr: string, lang = "python") => {
    setGithubLoading(true);
    try {
      const result = await pushSolutionToGithub({
        code: codeStr,
        titleSlug: problem?.slug || "solution",
        lang,
        fallbackProfileToken: (profileStats?.profile as any)?.githubToken || null,
      });
      if (result.ok && result.url) {
        toast.success("Successfully pushed solution to GitHub!", {
          action: {
            label: "View",
            onClick: () => window.open(result.url, "_blank"),
          },
        });
      }
    } catch {
      toast.error("An error occurred while pushing to GitHub");
    } finally {
      setGithubLoading(false);
    }
  };

  // (Replaced save function)
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"statement" | "strategy">("statement");
  const [pseudocode, setPseudocode] = useState("");
  const [userCode, setUserCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [datasetPlan, setDatasetPlan] = useState<DatasetPlanResult | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [activeDatasetId, setActiveDatasetId] = useState<string>("dataset_1");
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskRecordData | null>(null);

  useEffect(() => {
    if (!activeTaskId) return;
    const unsubscribe = taskCompletionManager.subscribe(activeTaskId, (record) => {
      setTaskStatus({ ...record });
    });
    return () => unsubscribe();
  }, [activeTaskId]);

  const handleForceComplete = useCallback(async () => {
    if (!activeTaskId) return;
    try {
      const updated = await taskCompletionManager.forceComplete(
        activeTaskId,
        "User manually forced completion (stopped infinite loop)",
      );
      setTaskStatus({ ...updated });
      toast.info("Stopped generation loop. Visualizing steps collected so far!");
    } catch (err) {
      console.warn("Failed to force complete task:", err);
    }
  }, [activeTaskId]);
  const [customDataset, setCustomDataset] = useState<TestDataset | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stageMode, setStageMode] = useState<"standard" | "expanded" | "cinema">("standard");
  const [liveGenStatus, setLiveGenStatus] = useState<{
    datasetId: string;
    datasetLabel: string;
    loopCount: number;
    stepCount: number;
    totalExpectedSteps?: number;
    isComplete: boolean;
    statusText: string;
    category?: string;
  } | null>(null);
  const [datasetExecutionPlans, setDatasetExecutionPlans] = useState<Record<string, ExecutionPlanStep[]>>({});
  const reviewRef = useRef<HTMLDivElement>(null);
  const storageKey = `dsaviz:attempt:${problem?.slug ?? "unknown"}`;

  const currentSlugRef = useRef<string | null>(null);
  const { updateContext } = useChat();

  useEffect(() => {
    if (problem) {
      updateContext({
        problemSlug: problem.slug,
        problemTitle: problem.title,
        difficulty: problem.difficulty,
        userCode,
        pseudocode,
      });
    }
  }, [problem, userCode, pseudocode, updateContext]);

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

      // Sync review submission directly to Firebase Firestore + backend API
      if (user) {
        const subPayload = {
          slug: problem.slug,
          title: problem.title,
          difficulty: problem.difficulty,
          code: pseudocode.trim(),
          pseudocode: pseudocode.trim(),
          lang: "pseudocode",
          classification: res.classification || "Incomplete",
          timeComplexity: res.complexity?.time || null,
          spaceComplexity: res.complexity?.space || null,
          praise: res.praise || null,
          nudge: res.nudge || null,
          review: res.review || null,
          createdAt: new Date().toISOString(),
        };
        try {
          const { saveUserSubmission } = await import("@/lib/firestore-service");
          const currentAuthUser = getAuth().currentUser;
          if (currentAuthUser) {
            await saveUserSubmission(currentAuthUser.uid, subPayload).catch(() => {});
          }
          if (token) {
            await fetch("/api/submissions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify(subPayload),
            }).catch(() => {});
          }
          setSaved(true);
          queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
          queryClient.invalidateQueries({ queryKey: ["profileStats"] });
          queryClient.invalidateQueries({ queryKey: ["submissions"] });
        } catch {
          // Non-blocking telemetry persistence
        }
      }

      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
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
  }, [pseudocode, problem, persist, user, token, queryClient]);

  const handleAcceptedCodeSubmit = useCallback(
    async (
      verdict: import("@/lib/leetcode-testcases").LeetCodeSubmitResponse,
      submittedCode: string,
      language: string
    ) => {
      if (!problem || verdict.status !== "Accepted") return;
      if (!user || !token) {
        toast.info("Sign in to record Accepted solutions on your permanent profile dashboard.");
        return;
      }
      try {
        const submissionData = {
          slug: problem.slug,
          title: problem.title,
          difficulty: problem.difficulty,
          code: submittedCode.trim(),
          pseudocode: submittedCode.trim(),
          lang: language,
          language,
          classification: "Optimal",
          status: "Optimal",
          timeTakenMs: verdict.runtimeMs || null,
          timeComplexity: verdict.timeComplexity || null,
          spaceComplexity: verdict.spaceComplexity || null,
          review: `${verdict.summaryMessage} • Runtime: ${verdict.runtimeMs} ms (Beats ${verdict.runtimePercentile}%) • Memory: ${verdict.memoryMb} MB (Beats ${verdict.memoryPercentile}%). ${verdict.aiInterviewerNotes}`,
          complexity: {
            time: verdict.timeComplexity,
            space: verdict.spaceComplexity,
          },
          createdAt: new Date().toISOString(),
        };

        try {
          const { saveUserSubmission } = await import("@/lib/firestore-service");
          const currentAuthUser = getAuth().currentUser;
          if (currentAuthUser) {
            await saveUserSubmission(currentAuthUser.uid, submissionData).catch(() => {});
          }
        } catch {
          // Continue with server API write
        }

        const saveResRaw = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(submissionData),
        });
        queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
        queryClient.invalidateQueries({ queryKey: ["profileStats"] });
        queryClient.invalidateQueries({ queryKey: ["submissions"] });
        if (saveResRaw.ok) {
          setSaved(true);
          toast.success("Marked as Solved on your Profile!");
        }
      } catch (saveErr) {
        console.error("Failed to save Accepted submission:", saveErr);
      }
    },
    [problem, user, token, queryClient]
  );

  const handleSyncCodeToVisualizer = useCallback(
    (editorCode: string) => {
      if (!editorCode.trim()) {
        toast.error("Write your code in the editor first before syncing to the visualizer.");
        return;
      }
      setPseudocode(editorCode);
      persist(editorCode, result);
      toast.success(
        "Synced editor code to the Algorithm Visualizer! Click 'Review & Step-by-Step Trace' to animate it."
      );
      reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [persist, result]
  );

  const sessionStore = useSessionContextStore();

  const onStartVisualization = useCallback(async () => {
    if (!result || !problem || !pseudocode.trim()) return;
    setPlanLoading(true);
    sessionStore.resetSession();
    try {
      // Stage 2: Generate Datasets & Execution Plan
      const planRes = await apiGenerateDatasetsAndPlan({
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        topics: problem.topics,
        pseudocode: pseudocode.trim(),
        classification: result.classification,
        complexity: result.complexity,
      });

      setDatasetPlan(planRes);

      const fallbackCanon = getCanonicalMultiDatasets(problem.slug, problem.title, problem.topics ?? []);
      const datasets = planRes.datasets.length > 0 ? planRes.datasets : (result.datasets ?? fallbackCanon);
      const primaryDataset = datasets[0] ?? fallbackCanon[0]!;

      if (planRes.execution_plan && planRes.execution_plan.length > 0) {
        setDatasetExecutionPlans({ [primaryDataset.id]: planRes.execution_plan });
      }

      // Stage 3: Generate Visualization for primary dataset
      setDatasetLoading(true);

      const task = await taskCompletionManager.startTask({
        problemSlug: problem.slug,
        datasetId: primaryDataset.id,
        maxLoops: 10,
        pseudocode: pseudocode.trim(),
      });
      setActiveTaskId(task.taskId);
      setTaskStatus(task);
      
      let isComplete = false;
      let currentContext = "";
      let accumulatedSteps: VizStep[] = [];
      let finalTrace: any = null;
      let loopCount = 0;
      let expectedTotalSteps: number | undefined = undefined;

      while (!isComplete && loopCount < 10) {
        if (taskCompletionManager.isForceCompleted(task.taskId)) {
          break;
        }

        loopCount++;
        await taskCompletionManager.setGenerating(task.taskId);
        
        let trace: any = null;
        let retries = 0;
        while (retries < 3) {
          if (taskCompletionManager.isForceCompleted(task.taskId)) break;
          try {
            trace = await apiGenerateDatasetViz({
              slug: problem.slug,
              title: problem.title,
              difficulty: problem.difficulty,
              topics: problem.topics,
              dataStructureType: planRes.data_structure_type,
              executionPlan: planRes.execution_plan,
              dataset: primaryDataset,
              pseudocode: pseudocode.trim(),
              previousContext: currentContext,
              currentStepOffset: accumulatedSteps.length,
            });
            break; // Success, exit retry loop
          } catch (err) {
            if (taskCompletionManager.isForceCompleted(task.taskId)) break;
            retries++;
            console.warn(`Chunk generation failed, retrying (${retries}/3) with last 3 steps context...`, err);
            if (retries >= 3) {
              console.error("Max retries reached. Stopping chunked generation early.");
              break;
            }
          }
        }

        if (taskCompletionManager.isForceCompleted(task.taskId)) {
          break;
        }

        if (!trace) {
          // If trace is still null here, it means all retries failed.
          // We break the loop gracefully to preserve what we generated so far.
          toast.error(`Generation halted midway at step ${accumulatedSteps.length} due to model failures. Displaying partial result.`);
          isComplete = true;
          break;
        }

        if (trace) {
          // Sync step estimations dynamically
          if (loopCount === 1) {
            expectedTotalSteps =
              trace.total_expected_steps ||
              (trace.execution_plan && trace.execution_plan.length > 0 ? trace.execution_plan.length : undefined) ||
              (planRes.execution_plan && planRes.execution_plan.length > 0 ? planRes.execution_plan.length : 15);
          } else if (trace.total_expected_steps && (!expectedTotalSteps || trace.total_expected_steps > expectedTotalSteps)) {
            expectedTotalSteps = trace.total_expected_steps;
          }
          await taskCompletionManager.setTotalExpectedSteps(task.taskId, expectedTotalSteps ?? (accumulatedSteps.length + 15));

          finalTrace = { ...trace, viz_steps: [...accumulatedSteps, ...(trace.viz_steps || [])] };
          if (trace.execution_plan && trace.execution_plan.length > 0) {
             finalTrace.execution_plan = [...(finalTrace.execution_plan || []), ...trace.execution_plan].filter((v,i,a)=>a.findIndex(t=>(t.step_number === v.step_number))===i);
          } else if (finalTrace.viz_steps) {
             // Fallback mapping if model omits it during continuation
             finalTrace.execution_plan = finalTrace.viz_steps.map((s: any, i: number) => ({
                 step_number: i + 1,
                 line_index: s.line,
                 code_action: s.type || "EXECUTE",
                 description: s.desc
             }));
          }
          accumulatedSteps = finalTrace.viz_steps;
          sessionStore.addBatch(trace.viz_steps || []);

          // LIVE STREAMING: update datasetExecutionPlans as steps arrive
          if (finalTrace.execution_plan) {
            setDatasetExecutionPlans((prev) => ({
              ...prev,
              [primaryDataset.id]: finalTrace.execution_plan,
            }));
          }

          const progress = await taskCompletionManager.updateProgress(task.taskId, {
            loopCount,
            newSteps: trace.viz_steps || [],
            accumulatedSteps,
            totalExpectedSteps: expectedTotalSteps,
            codeLines: trace.code_lines,
            pseudocode: pseudocode.trim(),
            isCompleteFlag: trace.is_complete,
          });

          const isDone = progress.shouldStop || trace.is_complete !== false;

          setLiveGenStatus({
            datasetId: primaryDataset.id,
            datasetLabel: primaryDataset.label || "Standard Dataset",
            loopCount,
            stepCount: accumulatedSteps.length,
            totalExpectedSteps: expectedTotalSteps,
            isComplete: isDone,
            statusText: isDone
              ? `Generated all ${accumulatedSteps.length} steps (is_complete: true ✓)`
              : `Streaming step ${accumulatedSteps.length} live...`,
            category: primaryDataset.category,
          });

          if (isDone) {
            isComplete = true;
          } else {
            currentContext = sessionStore.getSerializedContext(accumulatedSteps);
          }
        } else {
          break;
        }
      }

      if (taskCompletionManager.isForceCompleted(task.taskId)) {
        await taskCompletionManager.markCompleted(task.taskId, accumulatedSteps.length);
        setLiveGenStatus((prev) =>
          prev
            ? {
                ...prev,
                isComplete: true,
                statusText: `Manually completed (${accumulatedSteps.length} steps saved). is_complete: true ✓`,
              }
            : null
        );
      } else {
        await taskCompletionManager.markCompleted(task.taskId, accumulatedSteps.length);
        setLiveGenStatus((prev) =>
          prev
            ? {
                ...prev,
                isComplete: true,
                statusText: `Visualization generated with all ${accumulatedSteps.length} steps. is_complete: true ✓`,
              }
            : null
        );
      }

      setTimeout(() => {
        setLiveGenStatus((prev) => (prev?.isComplete ? null : prev));
      }, 3500);

      if (!finalTrace) {
        finalTrace = {
          test_array: primaryDataset.array ?? [],
          code_lines: [pseudocode.trim()],
          viz_steps: accumulatedSteps,
          visualization_failed: false,
        };
      }

      // Update execution plan if returned by AI for this dataset
      if (finalTrace.execution_plan && finalTrace.execution_plan.length > 0) {
        setDatasetExecutionPlans((prev) => ({
          ...prev,
          [primaryDataset.id]: finalTrace.execution_plan,
        }));
      }

      const updatedTraces = {
        ...(result.dataset_traces ?? {}),
        [primaryDataset.id]: {
          test_array: finalTrace.test_array,
          code_lines: finalTrace.code_lines,
          viz_steps: finalTrace.viz_steps,
          total_expected_steps: expectedTotalSteps,
          execution_plan: finalTrace.execution_plan,
          visualization_failed: finalTrace.visualization_failed,
          visualization_error: finalTrace.visualization_error,
        },
      };

      const updatedResult: ReviewResult = {
        ...result,
        datasets,
        active_dataset_id: primaryDataset.id,
        dataset_traces: updatedTraces,
        test_array: finalTrace.test_array,
        code_lines: finalTrace.code_lines,
        viz_steps: finalTrace.viz_steps,
        models: {
          reviewer: result.models.reviewer,
          visualizer: finalTrace.model || result.models.visualizer,
        },
      };

      setResult(updatedResult);
      setActiveDatasetId(primaryDataset.id);
      persist(pseudocode, updatedResult);
      toast.success("Visualization generated successfully!");
      
      // Auto verify after generation is done
      handleVerifyTrace(primaryDataset, accumulatedSteps);
    } catch (err) {
      console.error("Start visualization failed:", err);
      toast.error("Failed to generate plan and visualization.");
    } finally {
      setPlanLoading(false);
      setDatasetLoading(false);
    }
  }, [result, problem, pseudocode, persist]);

  const handleSelectDataset = useCallback(
    async (targetDataset: TestDataset) => {
      if (!problem || !result) return;
      setActiveDatasetId(targetDataset.id);

      // Auto-expand canvas layout if user chose a longer dataset
      if (targetDataset.category === "longer" || targetDataset.id.includes("longer")) {
        setStageMode("expanded");
      }

      // If this dataset already has a generated trace in cache, no API roundtrip needed
      if (result.dataset_traces?.[targetDataset.id]?.viz_steps?.length) {
        return;
      }

      setDatasetLoading(true);
      sessionStore.resetSession();

      // Reset the execution plan table immediately so it clears previous steps for the chosen dataset
      setDatasetExecutionPlans((prev) => ({
        ...prev,
        [targetDataset.id]: [],
      }));

      setLiveGenStatus({
        datasetId: targetDataset.id,
        datasetLabel: targetDataset.label || "Dataset",
        loopCount: 1,
        stepCount: 0,
        isComplete: false,
        statusText: `Initializing step generation for ${targetDataset.label ?? "selected dataset"}... (waiting for all steps)`,
        category: targetDataset.category,
      });

      // Provide initial shell in dataset_traces with empty viz_steps so previous steps are cleared
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          active_dataset_id: targetDataset.id,
          dataset_traces: {
            ...(prev.dataset_traces || {}),
            [targetDataset.id]: {
              test_array: targetDataset.array ?? [],
              code_lines: prev.code_lines ?? [pseudocode.trim()],
              viz_steps: [],
              visualization_failed: false,
            },
          },
        };
      });

      const task = await taskCompletionManager.startTask({
        problemSlug: problem.slug,
        datasetId: targetDataset.id,
        maxLoops: 10,
        pseudocode: pseudocode.trim(),
      });
      setActiveTaskId(task.taskId);
      setTaskStatus(task);

      try {
        let isComplete = false;
        let currentContext = "";
        let accumulatedSteps: VizStep[] = [];
        let finalTrace: any = null;
        let loopCount = 0;
        let expectedTotalSteps: number | undefined = undefined;

        while (!isComplete && loopCount < 10) {
          if (taskCompletionManager.isForceCompleted(task.taskId)) {
            break;
          }

          loopCount++;
          await taskCompletionManager.setGenerating(task.taskId);
          
          let trace: any = null;
          let retries = 0;
          while (retries < 3) {
            if (taskCompletionManager.isForceCompleted(task.taskId)) break;
            try {
              trace = await apiGenerateDatasetViz({
                slug: problem.slug,
                title: problem.title,
                difficulty: problem.difficulty,
                topics: problem.topics,
                dataStructureType: datasetPlan?.data_structure_type,
                executionPlan: datasetPlan?.execution_plan,
                pseudocode: pseudocode.trim(),
                dataset: targetDataset,
                previousContext: currentContext,
                currentStepOffset: accumulatedSteps.length,
              });
              break; // Success, exit retry loop
            } catch (err) {
              if (taskCompletionManager.isForceCompleted(task.taskId)) break;
              retries++;
              console.warn(`Chunk generation failed, retrying (${retries}/3) with last 3 steps context...`, err);
              if (retries >= 3) {
                console.error("Max retries reached on secondary dataset. Stopping early.");
                break;
              }
            }
          }

          if (taskCompletionManager.isForceCompleted(task.taskId)) {
            break;
          }

          if (!trace) {
            toast.error(`Generation halted midway at step ${accumulatedSteps.length} due to model failures. Displaying partial result.`);
            isComplete = true;
            break;
          }

          if (trace) {
            // Sync step estimations dynamically
            if (loopCount === 1) {
              expectedTotalSteps =
                trace.total_expected_steps ||
                (trace.execution_plan && trace.execution_plan.length > 0 ? trace.execution_plan.length : undefined) ||
                (datasetPlan?.execution_plan && datasetPlan.execution_plan.length > 0 ? datasetPlan.execution_plan.length : 15);
            } else if (trace.total_expected_steps && (!expectedTotalSteps || trace.total_expected_steps > expectedTotalSteps)) {
              expectedTotalSteps = trace.total_expected_steps;
            }
            await taskCompletionManager.setTotalExpectedSteps(task.taskId, expectedTotalSteps ?? (accumulatedSteps.length + 15));

            finalTrace = { ...trace, viz_steps: [...accumulatedSteps, ...(trace.viz_steps || [])] };
            if (trace.execution_plan && trace.execution_plan.length > 0) {
               finalTrace.execution_plan = [...(finalTrace.execution_plan || []), ...trace.execution_plan].filter((v:any,i:any,a:any)=>a.findIndex((t:any)=>(t.step_number === v.step_number))===i);
            } else if (finalTrace.viz_steps) {
               // Fallback mapping if model omits it during continuation
               finalTrace.execution_plan = finalTrace.viz_steps.map((s: any, i: number) => ({
                   step_number: i + 1,
                   line_index: s.line,
                   code_action: s.type || "EXECUTE",
                   description: s.desc
               }));
            }
            accumulatedSteps = finalTrace.viz_steps;
            sessionStore.addBatch(trace.viz_steps || []);

            // LIVE STREAMING: update datasetExecutionPlans as steps arrive
            if (finalTrace.execution_plan) {
              setDatasetExecutionPlans((prev) => ({
                ...prev,
                [targetDataset.id]: finalTrace.execution_plan,
              }));
            }

            const progress = await taskCompletionManager.updateProgress(task.taskId, {
              loopCount,
              newSteps: trace.viz_steps || [],
              accumulatedSteps,
              totalExpectedSteps: expectedTotalSteps,
              codeLines: trace.code_lines,
              pseudocode: pseudocode.trim(),
              isCompleteFlag: trace.is_complete,
            });

            const isDone = progress.shouldStop || trace.is_complete !== false;

            setLiveGenStatus({
              datasetId: targetDataset.id,
              datasetLabel: targetDataset.label || "Dataset",
              loopCount,
              stepCount: accumulatedSteps.length,
              totalExpectedSteps: expectedTotalSteps,
              isComplete: isDone,
              statusText: isDone
                ? `Trace generation finalized with ${accumulatedSteps.length} steps (is_complete: true ✓)`
                : `Streaming step ${accumulatedSteps.length} live...`,
              category: targetDataset.category,
            });

            if (isDone) {
              isComplete = true;
            } else {
              currentContext = sessionStore.getSerializedContext(accumulatedSteps);
            }
          } else {
            break;
          }
        }

        if (taskCompletionManager.isForceCompleted(task.taskId)) {
          await taskCompletionManager.markCompleted(task.taskId, accumulatedSteps.length);
          setLiveGenStatus((prev) =>
            prev
              ? {
                  ...prev,
                  isComplete: true,
                  statusText: `Manually completed (${accumulatedSteps.length} steps saved). is_complete: true ✓`,
                }
              : null
          );
        } else {
          await taskCompletionManager.markCompleted(task.taskId, accumulatedSteps.length);
          setLiveGenStatus((prev) =>
            prev
              ? {
                  ...prev,
                  isComplete: true,
                  statusText: `Trace finalized with ${accumulatedSteps.length} steps. is_complete: true ✓`,
                }
              : null
          );
        }

        setTimeout(() => {
          setLiveGenStatus((prev) => (prev?.isComplete ? null : prev));
        }, 3500);

        if (!finalTrace) {
          finalTrace = {
            test_array: targetDataset.array ?? [],
            code_lines: [pseudocode.trim()],
            viz_steps: accumulatedSteps,
            visualization_failed: false,
          };
        }

        // Update execution plan table to show the new steps for this chosen dataset
        if (finalTrace.execution_plan && finalTrace.execution_plan.length > 0) {
          setDatasetExecutionPlans((prev) => ({
            ...prev,
            [targetDataset.id]: finalTrace.execution_plan,
          }));
        }

        const updatedTraces = {
          ...(result.dataset_traces ?? {}),
          [targetDataset.id]: {
            test_array: finalTrace.test_array,
            code_lines: finalTrace.code_lines,
            viz_steps: finalTrace.viz_steps,
            total_expected_steps: accumulatedSteps.length, // Calibrate to actual final count
            execution_plan: finalTrace.execution_plan,
            visualization_failed: finalTrace.visualization_failed,
            visualization_error: finalTrace.visualization_error,
          },
        };

        const updatedResult: ReviewResult = {
          ...result,
          active_dataset_id: targetDataset.id,
          dataset_traces: updatedTraces,
        };

        setResult(updatedResult);
        persist(pseudocode, updatedResult);

        // Auto verify after generation is done
        handleVerifyTrace(targetDataset, accumulatedSteps);
      } catch (err: any) {
        console.error("Dataset visualizer API error:", err);
        toast.error("Failed to generate animation for this dataset: " + (err.message || "Unknown error"));
      } finally {
        setDatasetLoading(false);
      }
    },
    [problem, result, datasetPlan, pseudocode, persist],
  );

  const [verificationLoading, setVerificationLoading] = useState(false);

  const handleVerifyTrace = useCallback(
    async (dataset: TestDataset, steps: VizStep[]) => {
      if (!problem || !result || steps.length === 0) return;
      setVerificationLoading(true);
      try {
        const verification = await apiVerifyDatasetTrace({
          slug: problem.slug,
          title: problem.title,
          pseudocode: pseudocode.trim(),
          datasetLabel: dataset.label || dataset.id,
          traceSteps: steps,
        });

        const updatedTraces = {
          ...(result.dataset_traces ?? {}),
          [dataset.id]: {
            ...result.dataset_traces?.[dataset.id],
            test_array: result.dataset_traces?.[dataset.id]?.test_array || [],
            code_lines: result.dataset_traces?.[dataset.id]?.code_lines || [],
            viz_steps: result.dataset_traces?.[dataset.id]?.viz_steps || steps,
            verification,
          },
        };

        const updatedResult: ReviewResult = {
          ...result,
          dataset_traces: updatedTraces,
        };

        setResult(updatedResult);
        persist(pseudocode, updatedResult);
        toast.success("Trace verification complete.");
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to verify trace: " + err.message);
      } finally {
        setVerificationLoading(false);
      }
    },
    [problem, result, pseudocode, persist]
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
    // Until all steps are generated, nothing is displayed
    if (datasetLoading) return [];
    if (currentTrace?.viz_steps?.length) return currentTrace.viz_steps;
    if (activeDatasetId === availableDatasets[0]?.id && result?.viz_steps?.length) {
      return result.viz_steps;
    }
    return [];
  }, [currentTrace?.viz_steps, activeDatasetId, availableDatasets, result?.viz_steps, datasetLoading]);

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

      {/* Dynamic Stage Controls & Live Cycle Status Bar */}
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-muted-foreground">
            Stage Layout:
          </span>
          <div className="flex items-center gap-1 rounded-xl border border-border/70 bg-card/60 p-1 font-mono text-xs backdrop-blur-md shadow-xs">
            <button
              type="button"
              onClick={() => setStageMode("standard")}
              className={`btn-glide inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                stageMode === "standard"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Standard 3-column layout"
            >
              <Columns className="size-3.5" />
              <span>Standard</span>
            </button>
            <button
              type="button"
              onClick={() => setStageMode("expanded")}
              className={`btn-glide inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                stageMode === "expanded"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Expanded stage layout (ideal for longer datasets & matrices)"
            >
              <Maximize2 className="size-3.5" />
              <span>Expanded Stage</span>
            </button>
            <button
              type="button"
              onClick={() => setStageMode("cinema")}
              className={`btn-glide inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                stageMode === "cinema"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Full-width cinema mode"
            >
              <Monitor className="size-3.5" />
              <span>Cinema</span>
            </button>
          </div>
        </div>

        {liveGenStatus && !liveGenStatus.isComplete && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-xs text-amber-300 backdrop-blur-md animate-fade">
            <span className="size-2 rounded-full bg-amber-400 animate-ping" />
            <span>
              Streaming cycle {liveGenStatus.loopCount} for {liveGenStatus.datasetLabel} ({liveGenStatus.stepCount} live steps) • is_complete: false
            </span>
          </div>
        )}
      </div>

      <main
        id="main-content"
        className={`mx-auto grid w-full gap-6 p-4 sm:p-6 transition-all duration-300 ${
          stageMode === "cinema"
            ? "max-w-[1920px] grid-cols-1"
            : stageMode === "expanded"
              ? "max-w-[1920px] grid-cols-1 lg:grid-cols-12"
              : "max-w-[1800px] grid-cols-1 lg:grid-cols-3 xl:grid-cols-3"
        }`}
      >
        {/* Column 1: Problem Details & Examples */}
        <section
          className={`flex flex-col gap-5 ${
            stageMode === "expanded" ? "lg:col-span-3 xl:col-span-3" : ""
          }`}
        >
          <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur-md transition-all">
            <ProblemHeader problem={problem} copied={copied} onCopyLink={copyCode} />

            {/* Tab Navigation: Problem Statement vs Strategy */}
            <div className="flex items-center gap-2 border-b border-border/60 pb-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab("statement")}
                className={`btn-glide flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
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
                className={`btn-glide flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
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
        </section>

        {/* Column 2: Pseudocode & Review & Visualizer (Expands dynamically for longer datasets) */}
        <section
          ref={reviewRef}
          className={`flex flex-col gap-5 ${
            stageMode === "expanded"
              ? "lg:col-span-9 xl:col-span-6"
              : stageMode === "cinema"
                ? "col-span-1"
                : ""
          }`}
        >
          <div className="rounded-3xl border border-border/70 bg-card/60 p-6 shadow-sm backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  Pseudocode &amp; Algorithm Draft
                </h3>
              </div>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                For AI Reviewer &amp; Visualizer
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

          {result ? (
            <ReviewCard
              result={result}
              saved={saved}
              onStartVisualization={onStartVisualization}
              planLoading={planLoading}
              executionPlan={
                datasetExecutionPlans[activeDatasetId] ||
                (activeDatasetId === availableDatasets[0]?.id ? datasetPlan?.execution_plan : undefined)
              }
              dataStructureName={datasetPlan?.data_structure_name}
              hasVisualizationSteps={Boolean(currentSteps && currentSteps.length > 0 && !datasetLoading)}
              isDatasetLoading={datasetLoading}
              activeDatasetLabel={currentDataset?.label}
              totalExpectedSteps={taskStatus?.totalExpectedSteps ?? liveGenStatus?.totalExpectedSteps}
              preparedStepsCount={liveGenStatus?.stepCount}
            />
          ) : null}

          {/* Dataset Toolbar and Visualizer Box */}
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

              {/* If we have complete steps, render the Visualizer */}
              {currentSteps.length > 0 ? (
                <div className="rounded-3xl border border-border/70 bg-card/60 p-5 sm:p-6 shadow-sm backdrop-blur-md transition-all duration-300">
                  <Visualizer
                    key={`${activeDatasetId}-${currentSteps.length}`}
                    array={currentTestArray}
                    codeLines={currentCodeLines}
                    steps={currentSteps}
                    liveStatus={liveGenStatus}
                  />
                  <TraceVerificationPanel
                    trace={currentTrace}
                    onVerify={() => currentDataset && handleVerifyTrace(currentDataset, currentSteps)}
                    loading={verificationLoading}
                  />
                </div>
              ) : datasetLoading ? (
                /* Generating all steps before rendering: Blocked partial rendering */
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-primary/30 bg-card/60 p-8 text-center shadow-lg shadow-primary/5 backdrop-blur-md animate-fade">
                  <div className="relative flex size-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-40" />
                    <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/20">
                      <Sparkles className="size-7 animate-pulse text-primary" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 max-w-md">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                        Step Manager • Firebase Synced
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-foreground">
                      Generating Steps for {currentDataset?.label ?? "Selected Dataset"}
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {liveGenStatus?.statusText ||
                        "Calculating total expected steps and generating complete execution walkthrough..."}
                    </p>
                  </div>

                  {/* Progress bar tracking against total expected steps */}
                  {(taskStatus?.totalExpectedSteps || liveGenStatus?.totalExpectedSteps) && (
                    <div className="w-full max-w-xs flex flex-col gap-1.5 my-1">
                      <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                        <span>Generation Progress</span>
                        <span>
                          {liveGenStatus?.stepCount ?? 0} /{" "}
                          {taskStatus?.totalExpectedSteps ?? liveGenStatus?.totalExpectedSteps} steps (
                          {Math.min(
                            100,
                            Math.round(
                              ((liveGenStatus?.stepCount ?? 0) /
                                (taskStatus?.totalExpectedSteps ?? liveGenStatus?.totalExpectedSteps!)) *
                                100
                            )
                          )}
                          %)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                8,
                                ((liveGenStatus?.stepCount ?? 0) /
                                  (taskStatus?.totalExpectedSteps ?? liveGenStatus?.totalExpectedSteps!)) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

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
                    <span>
                      {taskStatus?.totalExpectedSteps || liveGenStatus?.totalExpectedSteps
                        ? `Target: ${taskStatus?.totalExpectedSteps ?? liveGenStatus?.totalExpectedSteps} steps • Display held until all are ready`
                        : "Predicting total expected steps on execution..."}
                    </span>
                  </div>

                  {/* Manual Status Override Controls */}
                  <div className="mt-2 flex flex-col items-center gap-1.5">
                    <button
                      id="force-complete-task-btn"
                      type="button"
                      onClick={handleForceComplete}
                      className="btn-glide inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-4 py-2 font-mono text-xs font-semibold text-amber-300 transition-all shadow-sm cursor-pointer active:scale-95"
                      title="Force manual status update to stop and inspect generated steps immediately"
                    >
                      <Square className="size-3.5 fill-amber-400 text-amber-400" />
                      <span>Stop &amp; Display Current Steps</span>
                    </button>
                    <p className="text-[11px] text-muted-foreground max-w-sm">
                      Steps are buffered in the step manager until 100% generated, preventing partial rendering.
                    </p>
                  </div>
                </div>
              ) : !result.is_complete || result.classification === "Incomplete" ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3.5 rounded-3xl border border-dashed border-amber-500/40 bg-amber-950/10 p-7 text-center animate-fade">
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
                      className="btn-glide gap-1.5 font-mono text-xs font-semibold border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                    >
                      <Sparkles className="size-3.5 text-amber-400" /> Insert Starter Template
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 bg-card/40 p-6 text-center animate-fade">
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
                    className="btn-glide gap-1.5 font-mono text-xs font-semibold mt-1 shadow-xs"
                  >
                    <RotateCcw className="size-3.5" /> Generate Animation
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/80 bg-card/40 p-8 text-center backdrop-blur-xs animate-fade">
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

        {/* Column 3: VS Code Editor & Interview Agent */}
        <section
          className={`flex flex-col gap-5 ${
            stageMode === "expanded" ? "lg:col-span-12 xl:col-span-3" : ""
          }`}
        >
          <div className="rounded-3xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-md flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="size-4 text-primary" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                  LeetCode Judge &amp; Code Editor
                </h3>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                Run (3 Cases) • Submit (Stress Suite)
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
              problemDifficulty={problem.difficulty}
              problemTopics={problem.topics}
              problemStatement={statement}
              defaultLanguage="python"
              height="340px"
              showSubmitButton={false}
              enableLeetCodeJudge={true}
              onAcceptedSubmit={handleAcceptedCodeSubmit}
              onSyncToVisualizer={handleSyncCodeToVisualizer}
            />
          </div>

          <ProblemDiffNudgePanel
            problemSlug={problem.slug}
            problemTitle={problem.title}
            difficulty={problem.difficulty}
            code={userCode}
            pseudocode={pseudocode}
            compilerError={result?.missing_elements?.join("; ") || (!result?.is_complete ? result?.nudge : "") || ""}
            isLoading={loading}
          />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

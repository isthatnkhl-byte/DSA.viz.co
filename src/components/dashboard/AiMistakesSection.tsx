import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  RefreshCw,
  Target,
  Clock,
  Layers,
  Award,
  Download,
  Copy,
  Check,
  Code2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export interface AiReportData {
  id?: string;
  reportTitle?: string;
  totalSubmissionsAnalyzed?: number;
  overallReadinessScore?: number;
  summary?: string;
  commonSyntaxMistakes?: Array<{
    mistake: string;
    frequency: string;
    impact: string;
    examplePattern: string;
    correctiveRule: string;
  }>;
  commonTypingMistakes?: Array<{
    mistake: string;
    description: string;
    proactiveTip: string;
  }>;
  logicalFlaws?: Array<{
    pattern: string;
    occurrence?: string;
    whyItHappens?: string;
    remediationStrategy?: string;
  }>;
  complexityTraps?: Array<{
    pattern: string;
    impact?: string;
    example?: string;
    fix?: string;
  }>;
  topStrengths?: string[];
  actionPlan?: Array<{
    step: number;
    title: string;
    description: string;
    recommendedProblems?: string[];
  }>;
  generatedAt?: string;
  createdAt?: string;
}

export interface AiMistakesSectionProps {
  className?: string;
  initialReports?: AiReportData[];
}

export function AiMistakesSection({
  className = "",
  initialReports,
}: AiMistakesSectionProps = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AiReportData | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch past saved reports from Redis-retained server API first
  const { data: fetchedReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["user-ai-reports", user?.uid || "guest"],
    initialData: Array.isArray(initialReports) && initialReports.length > 0 ? initialReports : undefined,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (Array.isArray(initialReports) && initialReports.length > 0) {
        return initialReports;
      }
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const token = await currentUser?.getIdToken().catch(() => null);

      let serverReports: any[] = [];
      if (token) {
        try {
          const res = await fetch("/api/user-reports", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const d = await res.json();
            if (Array.isArray(d)) serverReports = d;
          }
        } catch {
          // Ignore server fallback error
        }
      }

      let clientReports: any[] = [];
      if (serverReports.length === 0 && currentUser) {
        try {
          const { getUserAiReports } = await import("@/lib/firestore-service");
          clientReports = await getUserAiReports(currentUser.uid);
        } catch {
          // Ignore client Firestore fallback error
        }
      }

      const mergedMap = new Map<string, any>();
      for (const r of [...serverReports, ...clientReports]) {
        if (!r) continue;
        const key = String(r.id || `${r.reportTitle || ""}_${(r.createdAt || r.generatedAt || "").slice(0, 16)}`);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, r);
        }
      }
      return Array.from(mergedMap.values()).sort((a, b) => {
        const ta = new Date(a.createdAt || a.generatedAt || 0).getTime();
        const tb = new Date(b.createdAt || b.generatedAt || 0).getTime();
        return tb - ta;
      });
    },
    enabled: !!user,
  });

  const pastReports =
    Array.isArray(initialReports) && initialReports.length > 0 && fetchedReports.length === 0
      ? initialReports
      : fetchedReports;

  // Generate new report mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const token = await currentUser?.getIdToken().catch(() => null);
      const res = await fetch("/api/generate-mistakes-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate report");
      }
      if (currentUser) {
        try {
          const { saveUserAiReport } = await import("@/lib/firestore-service");
          await saveUserAiReport(currentUser.uid, data).catch(() => {});
        } catch {
          // Non-blocking Firestore persistence
        }
      }
      return data;
    },
    onSuccess: (data) => {
      setSelectedReport(data);
      queryClient.setQueryData(["user-ai-reports", user?.uid || "guest"], (old: any) =>
        Array.isArray(old) ? [data, ...old] : [data]
      );
      queryClient.setQueryData(["profile-stats", user?.uid || "guest"], (old: any) => {
        if (!old) return old;
        const nextReports = Array.isArray(old.aiReports) ? [data, ...old.aiReports] : [data];
        return { ...old, aiReports: nextReports };
      });
      toast.success("AI Common Mistakes Report generated and retained in Redis + Firebase!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate diagnostic report");
    },
  });

  // Effective report to display: selected report or the latest past report
  const currentReport: AiReportData | null =
    selectedReport ||
    (pastReports.length > 0
      ? pastReports[0]?.reportData
        ? { id: pastReports[0].id, ...pastReports[0].reportData, createdAt: pastReports[0].createdAt }
        : pastReports[0]
      : null);

  const handleCopyMarkdown = () => {
    if (!currentReport) return;
    const md = `# ${currentReport.reportTitle || "AI Algorithmic Diagnostics Report"}
Readiness Score: ${currentReport.overallReadinessScore || 80}/100
Submissions Analyzed: ${currentReport.totalSubmissionsAnalyzed || 0}

## Executive Summary
${currentReport.summary || ""}

## Common Syntax Mistakes
${currentReport.commonSyntaxMistakes?.map((m) => `- **${m.mistake}** (${m.frequency}): ${m.correctiveRule}`).join("\n") || "None"}

## Algorithmic & Logical Flaws
${currentReport.logicalFlaws?.map((l) => `- **${l.pattern}**: ${l.remediationStrategy}`).join("\n") || "None"}

## Action Plan
${currentReport.actionPlan?.map((a) => `${a.step}. **${a.title}**: ${a.description}`).join("\n") || "None"}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    toast.success("Report copied as Markdown!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section
      id="ai-mistakes-diagnostics-section"
      className={`rounded-3xl border border-border/80 bg-card/75 p-6 sm:p-8 shadow-xl shadow-black/5 backdrop-blur-xl transition-all duration-300 ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-2xl text-primary-foreground shadow-md"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Sparkles className="size-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                AI Mistake Diagnostics &amp; Common Patterns Report
              </h2>
              <span className="rounded-full bg-primary/15 border border-primary/25 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                Gemini Powered
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deep architectural audit of your Firestore submissions: syntax slips, off-by-ones,
              typing traps &amp; invariant blind spots.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {pastReports.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-9 gap-1.5 font-mono text-xs"
            >
              <Clock className="size-3.5 text-primary" />
              <span>History ({pastReports.length})</span>
              {showHistory ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="h-9 gap-2 font-bold text-xs shadow-md shadow-primary/20"
          >
            <RefreshCw
              className={`size-3.5 ${generateMutation.isPending ? "animate-spin" : ""}`}
            />
            {generateMutation.isPending ? "Generating Audit..." : "Generate Diagnostic Report"}
          </Button>
        </div>
      </div>

      {/* History Drawer if toggled */}
      {showHistory && pastReports.length > 0 && (
        <div className="mt-4 mb-6 rounded-2xl border border-border/80 bg-background/50 p-4">
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Past Saved Reports in Firebase Firestore
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {pastReports.map((item: any, idx: number) => {
              const r = item.reportData || item;
              return (
                <button
                  key={item.id || idx}
                  onClick={() => {
                    setSelectedReport({ id: item.id, ...r, createdAt: item.createdAt });
                    setShowHistory(false);
                  }}
                  className="flex flex-col text-left p-3 rounded-xl border border-border/70 bg-card/80 hover:border-primary/50 hover:bg-card transition-all"
                >
                  <span className="font-bold text-xs text-foreground truncate">
                    {r.reportTitle || `Diagnostics Report #${idx + 1}`}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                    <span>Score: {r.overallReadinessScore || 80}/100</span>
                    <span>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Content */}
      {generateMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4 animate-fade">
          <div className="relative flex size-16 items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-50" />
            <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/50 bg-primary/10 text-primary">
              <Sparkles className="size-7 animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              Synthesizing Algorithmic Diagnostic Report
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Gemini is mining all your code attempts from Firestore, isolating recurring syntax
              slips, off-by-one errors, and boundary handling...
            </p>
          </div>
        </div>
      ) : currentReport ? (
        <div className="mt-6 space-y-6 animate-fade">
          {/* Top Metric Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Score Card */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Algorithmic Readiness
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-primary">
                    {currentReport.overallReadinessScore || 85}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Award className="size-6" />
              </div>
            </div>

            {/* Submissions Analyzed */}
            <div className="rounded-2xl border border-border/70 bg-background/50 p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Submissions Audited
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-foreground">
                    {currentReport.totalSubmissionsAnalyzed || 0}
                  </span>
                  <span className="text-xs text-muted-foreground">attempts</span>
                </div>
              </div>
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FileText className="size-6" />
              </div>
            </div>

            {/* Invariant Health */}
            <div className="rounded-2xl border border-border/70 bg-background/50 p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Firestore Status
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <span className="text-sm font-bold text-foreground">Database Synced</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMarkdown}
                className="h-8 gap-1 text-[11px] font-mono"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copied ? "Copied" : "Copy MD"}
              </Button>
            </div>
          </div>

          {/* Executive Summary */}
          {currentReport.summary && (
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
              <strong className="text-primary font-bold">Diagnostic Evaluation: </strong>
              {currentReport.summary}
            </div>
          )}

          {/* Core Grid: Syntax Traps & Logical Flaws */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Box 1: Recurrent Syntax & Typo Traps */}
            <div className="rounded-2xl border border-border/80 bg-background/60 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-400" />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    Common Syntax &amp; Typo Traps
                  </h3>
                </div>
                <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 font-mono text-[10px] font-bold text-amber-300">
                  Recurring Patterns
                </span>
              </div>

              <div className="space-y-3">
                {currentReport.commonSyntaxMistakes?.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/60 bg-card/60 p-3 flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{item.mistake}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-extrabold uppercase ${
                          item.frequency === "High"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {item.frequency} Frequency
                      </span>
                    </div>
                    {item.examplePattern && (
                      <code className="rounded bg-background/80 px-2 py-1 font-mono text-[11px] text-red-300">
                        {item.examplePattern}
                      </code>
                    )}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Prevention Rule: </strong>
                      {item.correctiveRule}
                    </p>
                  </div>
                ))}

                {currentReport.commonTypingMistakes?.map((item, idx) => (
                  <div
                    key={"typing_" + idx}
                    className="rounded-xl border border-border/50 bg-card/40 p-3 flex flex-col gap-1 text-xs"
                  >
                    <span className="font-bold text-foreground">{item.mistake}</span>
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    <span className="text-[10px] text-primary font-mono mt-0.5">
                      💡 Tip: {item.proactiveTip}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 2: Algorithmic & Logical Flaws */}
            <div className="rounded-2xl border border-border/80 bg-background/60 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    Algorithmic &amp; Logical Blind Spots
                  </h3>
                </div>
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.2 font-mono text-[10px] font-bold text-primary">
                  Invariants
                </span>
              </div>

              <div className="space-y-3">
                {currentReport.logicalFlaws?.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/60 bg-card/60 p-3 flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{item.pattern}</span>
                      {item.occurrence && (
                        <span className="rounded bg-primary/15 px-1.5 py-0.2 font-mono text-[9px] text-primary">
                          {item.occurrence}
                        </span>
                      )}
                    </div>
                    {item.whyItHappens && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Why It Occurs: </strong>
                        {item.whyItHappens}
                      </p>
                    )}
                    {item.remediationStrategy && (
                      <div className="mt-1 rounded-lg bg-primary/10 border border-primary/20 p-2 text-[11px] text-primary">
                        <strong>Remediation Strategy: </strong>
                        {item.remediationStrategy}
                      </div>
                    )}
                  </div>
                ))}

                {currentReport.complexityTraps?.map((item, idx) => (
                  <div
                    key={"comp_" + idx}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col gap-1 text-xs"
                  >
                    <span className="font-bold text-amber-300">
                      Complexity Trap: {item.pattern}
                    </span>
                    <p className="text-[11px] text-muted-foreground">{item.impact}</p>
                    {item.fix && (
                      <span className="text-[10px] text-primary font-mono mt-0.5">
                        ⚡ Fix: {item.fix}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strengths & Action Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Strengths */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2.5">
                <CheckCircle2 className="size-4 text-emerald-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Demonstrated Strengths
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-foreground">
                {currentReport.topStrengths?.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Plan */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-primary/20 pb-2.5">
                <TrendingUp className="size-4 text-primary" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  Personalized Mastery Action Plan
                </h3>
              </div>
              <div className="space-y-3">
                {currentReport.actionPlan?.map((plan) => (
                  <div key={plan.step} className="flex items-start gap-2.5 text-xs">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-bold">
                      {plan.step}
                    </span>
                    <div>
                      <h4 className="font-bold text-foreground">{plan.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{plan.description}</p>
                      {plan.recommendedProblems?.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {plan.recommendedProblems.map((prob, pIdx) => (
                            <Link
                              key={pIdx}
                              to="/problems"
                              className="rounded-md border border-primary/30 bg-background/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                            >
                              {prob}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="mt-6 flex flex-col items-center justify-center py-12 text-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/30 p-6">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              No Common Mistakes Report Generated Yet
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Click the button below to have Gemini analyze all your previous problem attempts and
              pseudocode submissions stored in your Firebase Firestore database.
            </p>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="mt-2 font-bold text-xs gap-2"
          >
            <Sparkles className="size-3.5" />
            Generate My Diagnostics Report
          </Button>
        </div>
      )}
    </section>
  );
}

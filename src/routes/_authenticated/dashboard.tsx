import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Brain,
  CheckCircle2,
  XCircle,
  Code2,
  TrendingUp,
  AlertTriangle,
  Target,
} from "lucide-react";
import { LeetCodeHeatmap } from "@/components/dashboard/LeetCodeHeatmap";
import { SiteHeader } from "@/components/SiteHeader";
import { Visualizer } from "@/components/Visualizer";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { AiMistakesSection } from "@/components/dashboard/AiMistakesSection";
import { Button } from "@/components/ui/button";
import {
  getOrCreateUserProfile,
  getUserSubmissions,
  deleteUserSubmission,
} from "@/lib/firestore-service";
import { listSubmissions, deleteSubmission, getProfileStats, type Submission } from "@/lib/submissions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DSA.viz" },
      {
        name: "description",
        content:
          "Revisit every pseudocode attempt you submitted, the AI interviewer's verdict and the animated walkthrough of your algorithm.",
      },
      { property: "og:title", content: "Dashboard — DSA.viz" },
      {
        property: "og:description",
        content: "Your saved DSA pseudocode attempts and AI reviews in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const badgeFor = (c: string) =>
  c === "Optimal"
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-xs shadow-emerald-500/25 font-extrabold"
    : c === "Better"
      ? "bg-blue-500/20 text-blue-300 border-blue-400/60 shadow-xs shadow-blue-500/25 font-extrabold"
      : c === "Brute Force"
        ? "bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-xs shadow-amber-500/25 font-extrabold"
        : "bg-purple-500/20 text-purple-300 border-purple-400/60 shadow-xs shadow-purple-500/25 font-extrabold";

function Dashboard() {
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: statsData } = useQuery({
    queryKey: ["profileStats"],
    queryFn: async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentToken = currentUser ? await currentUser.getIdToken() : token;

      let clientProfile: any = null;
      let clientSubs: any[] = [];
      if (currentUser) {
        try {
          clientProfile = await getOrCreateUserProfile(currentUser.uid, currentUser.email, currentUser.photoURL);
          clientSubs = await getUserSubmissions(currentUser.uid);
        } catch (e) {
          console.warn("Client Firestore read fallback in dashboard:", e);
        }
      }

      let serverProfile: any = null;
      let serverSubs: any[] = [];
      if (currentToken) {
        try {
          const [profileRes, subsRes] = await Promise.all([
            fetch("/api/profile", { headers: { Authorization: `Bearer ${currentToken}` } }),
            fetch("/api/submissions", { headers: { Authorization: `Bearer ${currentToken}` } }),
          ]);
          if (profileRes.ok) serverProfile = await profileRes.json();
          if (subsRes.ok) serverSubs = await subsRes.json();
        } catch (e) {
          console.warn("Server profile read fallback in dashboard:", e);
        }
      }

      const effectiveDisplayName =
        clientProfile?.displayName ||
        clientProfile?.display_name ||
        serverProfile?.displayName ||
        serverProfile?.display_name ||
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "Explorer";

      const effectiveLcStats =
        clientProfile?.leetcodeStats ||
        clientProfile?.leetcode_stats ||
        serverProfile?.leetcodeStats ||
        serverProfile?.leetcode_stats ||
        null;

      const effectiveLcUsername =
        clientProfile?.leetcodeUsername ||
        clientProfile?.leetcode_username ||
        serverProfile?.leetcodeUsername ||
        serverProfile?.leetcode_username ||
        null;

      const mergedProfile = {
        ...(serverProfile || {}),
        ...(clientProfile || {}),
        displayName: effectiveDisplayName,
        display_name: effectiveDisplayName,
        leetcodeStats: effectiveLcStats,
        leetcode_stats: effectiveLcStats,
        leetcodeUsername: effectiveLcUsername,
        leetcode_username: effectiveLcUsername,
      };

      const subsArray = (clientSubs && clientSubs.length > 0 ? clientSubs : serverSubs) || [];
      const completeRows = subsArray.filter((r: any) => r.classification !== "Incomplete");
      const solved = new Set(completeRows.map((r: any) => r.slug));
      const optimal = new Set(
        completeRows.filter((r: any) => r.classification === "Optimal").map((r: any) => r.slug),
      );
      const byDifficulty = {
        Easy: new Set(completeRows.filter((r: any) => r.difficulty === "Easy").map((r: any) => r.slug)),
        Medium: new Set(completeRows.filter((r: any) => r.difficulty === "Medium").map((r: any) => r.slug)),
        Hard: new Set(completeRows.filter((r: any) => r.difficulty === "Hard").map((r: any) => r.slug)),
      };
      return {
        profile: mergedProfile,
        attempts: subsArray.length,
        solved: solved.size,
        optimal: optimal.size,
        easy: byDifficulty.Easy.size,
        medium: byDifficulty.Medium.size,
        hard: byDifficulty.Hard.size,
      };
    },
    enabled: !!user,
  });

  const leetcodeStats = statsData?.profile?.leetcode_stats || statsData?.profile?.leetcodeStats;

  const { data, isLoading, error } = useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentToken = currentUser ? await currentUser.getIdToken() : token;

      if (currentUser) {
        try {
          const clientSubs = await getUserSubmissions(currentUser.uid);
          if (clientSubs && clientSubs.length > 0) return clientSubs;
        } catch (e) {
          console.warn("Client Firestore getUserSubmissions fallback:", e);
        }
      }

      if (currentToken) {
        try {
          const res = await fetch("/api/submissions", { headers: { Authorization: `Bearer ${currentToken}` } });
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn("Server submissions fallback:", e);
        }
      }

      return [];
    },
    enabled: !!user,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentToken = currentUser ? await currentUser.getIdToken() : token;

      if (currentUser) {
        try {
          await deleteUserSubmission(currentUser.uid, id);
        } catch (e) {
          console.warn("Client Firestore deleteUserSubmission non-fatal:", e);
        }
      }

      if (currentToken) {
        await fetch(`/api/submissions/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${currentToken}` },
        }).catch(() => null);
      }

      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submissions"] });
      qc.invalidateQueries({ queryKey: ["profileStats"] });
      toast.success("Attempt removed from your dashboard");
    },
    onError: () => {
      toast.error("Failed to delete attempt");
    },
  });

  const rows = (data ?? []) as Submission[];
  const open = rows.find((r) => String(r.id) === String(openId)) ?? null;

  return (
    <div className="min-h-screen pb-20">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <History className="size-4 animate-pulse" />
              <span>Personal Attempt History</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Saved <span className="gradient-text">Submissions</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Revisit your pseudocode algorithms, AI interviewer verdicts, complexity benchmarks,
              and replay animated step executions.
            </p>
          </div>

          <Link to="/">
            <Button className="gap-2 rounded-xl font-bold shadow-md shadow-primary/20 hover:scale-105 transition-all active:scale-95">
              <Sparkles className="size-4" /> Practice Problems
            </Button>
          </Link>
        </div>

        
        {leetcodeStats && (
          <div className="mb-8">
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Total Solved</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-foreground">{leetcodeStats.totalSolved}</span>
                  <span className="text-xs text-muted-foreground">/ {leetcodeStats.totalQuestions}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
                <p className="text-xs text-emerald-500 font-mono uppercase tracking-wider font-bold">Easy</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-400">{leetcodeStats.easySolved}</span>
                  <span className="text-xs text-muted-foreground">/ {leetcodeStats.totalEasy}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
                <p className="text-xs text-amber-500 font-mono uppercase tracking-wider font-bold">Medium</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">{leetcodeStats.mediumSolved}</span>
                  <span className="text-xs text-muted-foreground">/ {leetcodeStats.totalMedium}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-sm">
                <p className="text-xs text-rose-500 font-mono uppercase tracking-wider font-bold">Hard</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-rose-400">{leetcodeStats.hardSolved}</span>
                  <span className="text-xs text-muted-foreground">/ {leetcodeStats.totalHard}</span>
                </div>
              </div>
            </div>
            <LeetCodeHeatmap
              calendar={leetcodeStats.submissionCalendar || {}}
              streak={leetcodeStats.streak}
              totalActiveDays={leetcodeStats.totalActiveDays}
            />

            {/* Recent Submissions Log from LeetCode */}
            {Array.isArray(leetcodeStats.recentSubmissions) &&
              leetcodeStats.recentSubmissions.length > 0 && (
                <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <Code2 className="size-4 text-primary" />
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                        Recent LeetCode Submissions
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Last synced:{" "}
                      {new Date(leetcodeStats.lastSyncedAt || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="divide-y divide-border/40">
                    {leetcodeStats.recentSubmissions.map((sub: any, idx: number) => {
                      const isAccepted = sub.statusDisplay === "Accepted";
                      return (
                        <div
                          key={`lc-sub-${idx}`}
                          className="flex items-center justify-between py-2 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isAccepted ? (
                              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="size-4 text-rose-400 shrink-0" />
                            )}
                            <span className="font-bold text-foreground truncate">{sub.title}</span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                isAccepted
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {sub.statusDisplay}
                            </span>
                            <span className="rounded bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {sub.lang}
                            </span>
                            {sub.titleSlug && (
                              <Link
                                to="/problem/$slug"
                                params={{ slug: sub.titleSlug }}
                                className="hidden sm:inline-flex rounded-lg bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold hover:bg-primary/20 transition-all"
                              >
                                Visualizer
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        )}
        {!leetcodeStats && (
          <div className="mb-8 flex items-center justify-between rounded-2xl border border-dashed border-orange-500/40 bg-orange-500/5 p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                <Target className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Connect LeetCode Account</h4>
                <p className="text-xs text-muted-foreground">Sync your LeetCode progress to see it here on your dashboard.</p>
              </div>
            </div>
            <Link to="/profile">
              <Button size="sm" className="font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-md">Connect Profile</Button>
            </Link>
          </div>
        )}

        {rows.length > 0 && <AnalyticsCharts submissions={rows} />}

        {/* AI Mistake Diagnostics & Common Patterns Report */}
        <AiMistakesSection className="mb-8" />

        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center animate-pulse">
            <Brain className="size-8 text-primary animate-spin" />
            <p className="font-mono text-sm text-muted-foreground">Loading your attempt history…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm font-mono text-destructive">
            Could not load your submissions. Please refresh the page.
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No saved attempts yet</h3>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Submit pseudocode for any of the 200+ LeetCode problems to have your AI verdicts and
              animations automatically logged here.
            </p>
            <Link to="/" className="mt-2 inline-block">
              <Button className="rounded-xl font-semibold">Start Solving Now</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((s) => {
              const isOpen = String(open?.id) === String(s.id);
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-border/80 bg-card/75 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-border"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      className="group flex flex-1 flex-col text-left transition-colors"
                      onClick={() => setOpenId(isOpen ? null : String(s.id))}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {s.title || s.slug}
                        </span>
                        {isOpen ? (
                          <ChevronUp className="size-4 text-muted-foreground transition-transform" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                        {new Date(s.createdAt || s.created_at || "").toLocaleString()} · {s.difficulty}
                      </p>
                    </button>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${badgeFor(
                          s.classification,
                        )}`}
                      >
                        {s.classification}
                      </span>
                      <span className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 font-mono text-xs font-semibold text-primary">
                        {s.time_complexity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete attempt"
                        onClick={() => del.mutate(String(s.id))}
                        className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive active:scale-95 transition-all"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="animate-rise mt-5 flex flex-col gap-4 border-t border-border/60 pt-4">
                      <div>
                        <h4 className="mb-1.5 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Submitted Pseudocode:
                        </h4>
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-border/80 bg-background/90 p-3.5 font-mono text-xs shadow-inner">
                          {s.pseudocode}
                        </pre>
                      </div>

                      {s.praise && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-foreground shadow-xs shadow-emerald-500/10">
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                          <div>
                            <strong className="text-emerald-300 font-extrabold tracking-wide">Strong Habits: </strong>
                            <span className="text-foreground/95">{s.praise}</span>
                          </div>
                        </div>
                      )}

                      {s.nudge && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-primary/40 bg-primary/10 p-3.5 text-xs text-foreground shadow-xs shadow-primary/10">
                          <TrendingUp className="size-4 shrink-0 text-primary mt-0.5" />
                          <div>
                            <strong className="text-primary font-extrabold tracking-wide">Optimization Hint: </strong>
                            <span className="text-foreground/95">{s.nudge}</span>
                          </div>
                        </div>
                      )}

                      <div className="prose-sm max-w-none text-xs leading-relaxed text-muted-foreground [&_code]:rounded [&_code]:bg-background/90 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-foreground [&_strong]:text-foreground">
                        <ReactMarkdown>{s.review}</ReactMarkdown>
                      </div>

                      {s.viz_steps && s.viz_steps.length > 0 ? (
                        <div className="rounded-xl border border-border/80 bg-background/50 p-4 shadow-sm">
                          <Visualizer
                            array={s.test_case ?? []}
                            codeLines={s.code_lines ?? []}
                            steps={s.viz_steps}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-dashed border-warn/40 bg-warn/5 p-4 text-xs text-muted-foreground">
                          <AlertTriangle className="size-4 shrink-0 text-warn" />
                          <span>
                            Visualization was locked because this submission was marked as logic
                            incomplete.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;

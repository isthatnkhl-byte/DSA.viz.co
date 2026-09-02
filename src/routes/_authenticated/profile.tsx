import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Trophy,
  Sparkles,
  Target, Github,
  ArrowLeft,
  RefreshCw,
  Save,
  Flame,
  Calendar,
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Edit2,
  Database,
  Layers,
  Award,
  BarChart2,
  AtSign,
  Check,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import {
  getProfileStats,
  syncLeetCodeData,
  updateLeetcodeUsername,
  updateProfileUsername,
} from "@/lib/submissions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & LeetCode Connect — DSA.viz" },
      {
        name: "description",
        content: "Track your connected LeetCode profile, heatmap, and algorithmic attempts.",
      },
      { property: "og:title", content: "Profile & LeetCode Connect — DSA.viz" },
      {
        property: "og:description",
        content: "Your connected LeetCode profile progress and submission history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

import { LeetCodeHeatmap } from "@/components/dashboard/LeetCodeHeatmap";

function ProfilePage() {
  const { user, refreshProfile, updateNickname } = useAuth();
  const fetchStats = useServerFn(getProfileStats);
  const syncLeetCodeFn = useServerFn(syncLeetCodeData);
  const updateUsernameFn = useServerFn(updateLeetcodeUsername);
  const updateProfileUsernameFn = useServerFn(updateProfileUsername);
  const queryClient = useQueryClient();

  const [inputUsername, setInputUsername] = useState("");
  const [editingLc, setEditingLc] = useState(false);

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        toast.success("GitHub connected successfully!");
        queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient]);

  const handleConnectGithub = async () => {
    try {
      const auth = getAuth();
      const token = await auth.currentUser?.getIdToken();
      
      const res = await fetch("/api/github/url", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const { url } = await res.json();
      
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );
      if (!authWindow) {
        toast.error('Please allow popups for this site to connect your GitHub account.');
      }
    } catch (e) {
      toast.error("Failed to initiate GitHub connect");
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: () => fetchStats(),
  });

  const syncMutation = useMutation({
    mutationFn: (username: string) => syncLeetCodeFn({ data: { username } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("LeetCode profile & heatmap synced successfully!");
        queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
        refreshProfile();
        setEditingLc(false);
        setInputUsername("");
      } else {
        toast.error(res.error || "Could not find LeetCode account.");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Sync failed.");
    },
  });

  const updateProfileUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      await updateNickname(username);
      return await updateProfileUsernameFn({ data: { username } });
    },
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Username handle updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
        refreshProfile();
        setEditingUsername(false);
      } else {
        toast.error(res.error || "Could not update username.");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update username.");
    },
  });

  const profile = data?.profile;
  const leetcodeStats = (profile as any)?.leetcode_stats;
  const leetcodeUsername = (profile as any)?.leetcode_username;

  const currentHandle = useMemo(() => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) return user.email.split("@")[0];
    return "explorer";
  }, [profile?.display_name, user?.email]);

  function handleSaveUsername() {
    const trimmed = usernameInput.trim().replace(/^@+/, "");
    if (!trimmed || trimmed.length < 2) {
      toast.error("Username must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 30) {
      toast.error("Username cannot exceed 30 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      toast.error("Username can only contain letters, numbers, underscores, dashes, and periods.");
      return;
    }
    updateProfileUsernameMutation.mutate(trimmed);
  }

  function handleConnectOrSync(overrideUsername?: string) {
    const target = (overrideUsername ?? inputUsername ?? leetcodeUsername ?? "").trim();
    if (!target) {
      toast.error("Please enter a valid LeetCode username.");
      return;
    }
    syncMutation.mutate(target);
  }

  return (
    <div className="min-h-screen pb-20">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <Link
          to="/"
          className="group mb-6 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Problem Explorer</span>
        </Link>

        {isLoading || !data ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center animate-pulse">
            <Trophy className="size-8 text-primary animate-bounce" />
            <p className="font-mono text-sm text-muted-foreground">
              Loading your profile &amp; telemetry data…
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-rise">
            {/* User Profile Header Card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/75 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-4 flex-1 min-w-[280px]">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`${currentHandle} avatar`}
                    className="size-16 rounded-2xl border-2 border-primary/40 shadow-sm object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 text-2xl font-black text-primary shadow-sm">
                    {currentHandle.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div className="flex flex-col flex-1">
                  {!editingUsername ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-black tracking-tight text-foreground">
                          {currentHandle}
                        </h2>
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                          <AtSign className="size-2.5" />
                          {currentHandle}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUsernameInput(currentHandle);
                            setEditingUsername(true);
                          }}
                          className="h-6 px-2 text-[11px] font-mono text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1 rounded-md"
                        >
                          <Edit2 className="size-3" />
                          <span>Change Username</span>
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 flex-wrap font-mono text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="size-3.5" />
                          Verified Explorer
                        </span>
                        <span>•</span>
                        <span>
                          Member since {new Date(profile?.created_at ?? Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 max-w-md">
                      <label className="text-[11px] font-mono font-semibold text-muted-foreground">
                        Customize Your Username Handle
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            placeholder="username"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ""))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveUsername();
                              if (e.key === "Escape") setEditingUsername(false);
                            }}
                            className="font-mono text-sm h-8 pl-8"
                            autoFocus
                            maxLength={30}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSaveUsername}
                          disabled={updateProfileUsernameMutation.isPending || !usernameInput.trim()}
                          className="h-8 px-3 font-mono text-xs gap-1.5 bg-primary text-primary-foreground"
                        >
                          {updateProfileUsernameMutation.isPending ? (
                            <RefreshCw className="size-3 animate-spin" />
                          ) : (
                            <Check className="size-3" />
                          )}
                          <span>Save</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUsername(false)}
                          disabled={updateProfileUsernameMutation.isPending}
                          className="h-8 px-2.5 font-mono text-xs text-muted-foreground"
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground/70">
                        2-30 characters (letters, numbers, underscores, dashes, dots)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Local Attempt Counter */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground">
                    DSA.viz Submissions
                  </span>
                  <span className="text-xl font-mono font-black text-primary">
                    {data.attempts}
                  </span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* DSA.VIZ SUBMISSIONS & MASTERY METRICS                              */}
            {/* ------------------------------------------------------------------ */}
            <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card/75 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary">
                    <Code2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>DSA.viz Submissions &amp; Mastery</span>
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/30">
                        {data.attempts} {data.attempts === 1 ? "SUBMISSION" : "SUBMISSIONS"}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Your algorithmic pseudocode attempts analyzed and evaluated by AI on DSA.viz.
                    </p>
                  </div>
                </div>

                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 font-mono text-xs border-primary/40 hover:bg-primary/10 text-primary">
                  <Link to="/dashboard">
                    <Layers className="size-3.5" />
                    <span>View Submission History</span>
                  </Link>
                </Button>
              </div>

              {/* Grid of Key Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border/60 bg-background/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-mono font-medium uppercase tracking-wider">Total Submissions</span>
                    <Clock className="size-4 text-primary/70" />
                  </div>
                  <div className="mt-2 text-2xl font-mono font-black text-foreground">{data.attempts}</div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-mono font-medium uppercase tracking-wider">Problems Solved</span>
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-2xl font-mono font-black text-emerald-400">{data.solved}</div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-mono font-medium uppercase tracking-wider">Optimal Solutions</span>
                    <Sparkles className="size-4 text-amber-400" />
                  </div>
                  <div className="mt-2 text-2xl font-mono font-black text-amber-400">{data.optimal}</div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/50 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-mono font-medium uppercase tracking-wider">Solved by Difficulty</span>
                    <BarChart2 className="size-4 text-sky-400" />
                  </div>
                  <div className="mt-2 flex items-center gap-2 font-mono text-xs">
                    <span className="text-emerald-400 font-bold">{data.easy} Easy</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-amber-400 font-bold">{data.medium} Med</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-rose-400 font-bold">{data.hard} Hard</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* CONNECT WITH GITHUB MODULE                                         */}
            {/* ------------------------------------------------------------------ */}
            <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card/75 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-foreground/5 border border-foreground/10 text-foreground">
                    <Github className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>GitHub Integration</span>
                      {(profile as any)?.githubToken && (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                          CONNECTED
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Connect your GitHub account to enable one-click pushing of your sandbox and problem solutions directly to your repositories.
                    </p>
                  </div>
                </div>

                {!(profile as any)?.githubToken ? (
                  <Button
                    onClick={handleConnectGithub}
                    className="h-8 gap-1.5 font-mono text-xs bg-[#24292e] text-white hover:bg-[#24292e]/80"
                  >
                    <Github className="size-3.5" />
                    <span>Connect GitHub</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnectGithub}
                    variant="outline"
                    className="h-8 gap-1.5 font-mono text-xs"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Reconnect</span>
                  </Button>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* CONNECT WITH LEETCODE MODULE                                       */}
            {/* ------------------------------------------------------------------ */}
            <div className="flex flex-col gap-5 rounded-2xl border border-border/80 bg-card/75 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                    <Target className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>LeetCode Profile &amp; Heatmap Integration</span>
                      {leetcodeUsername && (
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                          CONNECTED
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Connect your LeetCode handle to pull activity heatmaps, global rankings, and problem statistics saved securely to your cloud profile.
                    </p>

                  </div>
                </div>

                {leetcodeUsername && !editingLc && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnectOrSync(leetcodeUsername)}
                      disabled={syncMutation.isPending}
                      className="h-8 gap-1.5 font-mono text-xs border-primary/40 hover:bg-primary/10 text-primary"
                    >
                      <RefreshCw
                        className={`size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
                      />
                      <span>Sync Data</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInputUsername(leetcodeUsername);
                        setEditingLc(true);
                      }}
                      className="h-8 font-mono text-xs text-muted-foreground"
                    >
                      <Edit2 className="size-3.5 mr-1" /> Switch Account
                    </Button>
                  </div>
                )}
              </div>


              {/* Connected LeetCode Dashboard View */}
              {leetcodeStats && !editingLc ? (
                <div className="flex flex-col gap-6 animate-rise">
                  {/* Account Header & Overview Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/50 p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={leetcodeStats.avatar || "https://leetcode.com/static/images/LeetCode_logo.png"}
                        alt="LeetCode Avatar"
                        className="size-11 rounded-xl border border-border/60 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-foreground">
                            {leetcodeStats.name || leetcodeStats.username}
                          </h4>
                          <a
                            href={`https://leetcode.com/u/${leetcodeStats.username}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Open LeetCode Profile"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          @{leetcodeStats.username} • Global Rank:{" "}
                          <strong className="text-foreground font-bold">{leetcodeStats.ranking}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 font-mono text-xs font-bold text-orange-400">
                        <Flame className="size-4 fill-orange-400" />
                        <span>Streak: {leetcodeStats.streak || 0}d</span>
                      </span>
                      <span className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                        <Award className="size-4" />
                        <span>Reputation: {leetcodeStats.reputation || 0}</span>
                      </span>
                    </div>
                  </div>

                  {/* Problem Solving Counts Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col justify-between rounded-xl border border-border/70 bg-background/70 p-3.5 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Total Solved
                      </span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-mono text-2xl font-black text-primary">
                          {leetcodeStats.totalSolved}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          / {leetcodeStats.totalQuestions}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (leetcodeStats.totalSolved / (leetcodeStats.totalQuestions || 3000)) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Easy Solved
                      </span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-mono text-2xl font-black text-emerald-400">
                          {leetcodeStats.easySolved}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          / {leetcodeStats.totalEasy}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (leetcodeStats.easySolved / (leetcodeStats.totalEasy || 800)) * 100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Medium Solved
                      </span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-mono text-2xl font-black text-amber-400">
                          {leetcodeStats.mediumSolved}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          / {leetcodeStats.totalMedium}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (leetcodeStats.mediumSolved / (leetcodeStats.totalMedium || 1700)) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 shadow-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                        Hard Solved
                      </span>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="font-mono text-2xl font-black text-rose-400">
                          {leetcodeStats.hardSolved}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          / {leetcodeStats.totalHard}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (leetcodeStats.hardSolved / (leetcodeStats.totalHard || 700)) * 100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission Calendar Activity Heatmap */}
                  <LeetCodeHeatmap
                    calendar={leetcodeStats.submissionCalendar || {}}
                    streak={leetcodeStats.streak}
                    totalActiveDays={leetcodeStats.totalActiveDays}
                  />

                  {/* Recent Submissions Log */}
                  {Array.isArray(leetcodeStats.recentSubmissions) &&
                    leetcodeStats.recentSubmissions.length > 0 && (
                      <div className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-background/60 p-4 shadow-sm backdrop-blur-sm">
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
                                key={`sub-${idx}`}
                                className="flex items-center justify-between py-2 text-xs font-mono"
                              >
                                <div className="flex items-center gap-2">
                                  {isAccepted ? (
                                    <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                                  ) : (
                                    <XCircle className="size-4 text-rose-400 shrink-0" />
                                  )}
                                  <span className="font-bold text-foreground">{sub.title}</span>
                                </div>

                                <div className="flex items-center gap-3">
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
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                /* Connect Input Form */
                <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border/80 bg-background/40 p-6 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    <Target className="size-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">
                      Connect Your LeetCode Account
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Enter your public LeetCode handle to synchronize your problem-solving streak, 52-week activity heatmap, and recent submission telemetry saved directly to your cloud profile.
                    </p>

                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto w-full pt-2">
                    <Input
                      placeholder="e.g. neetcode, tourist, your_handle"
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConnectOrSync();
                      }}
                      className="font-mono text-sm h-10"
                    />
                    <Button
                      onClick={() => handleConnectOrSync()}
                      disabled={syncMutation.isPending || !inputUsername.trim()}
                      className="h-10 px-5 font-bold font-mono text-xs gap-2 shrink-0 bg-primary text-primary-foreground"
                    >
                      {syncMutation.isPending ? (
                        <>
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>Connecting…</span>
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5" />
                          <span>Connect Account</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {editingLc && leetcodeUsername && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingLc(false)}
                      className="text-xs font-mono text-muted-foreground hover:text-foreground self-center"
                    >
                      Cancel &amp; Keep Current Account ({leetcodeUsername})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProfilePage;

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  Sparkles,
  Target,
  Github,
  ArrowLeft,
  RefreshCw,
  Save,
  Flame,
  Code2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Edit2,
  AtSign,
  Check,
  ShieldCheck,
  Trash2,
  Download,
  Cookie,
  Shield,
  AlertTriangle,
  KeyRound,
  ArrowUpRight,
  Plus,
  ChevronDown,
  ChevronUp,
  History,
  Brain,
  TrendingUp,
  Calendar,
  Search,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CookiePreferencesModal } from "@/components/legal/CookiePreferencesModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Visualizer } from "@/components/Visualizer";
import { useAuth } from "@/hooks/useAuth";
import { getAuth, updateProfile as updateFirebaseAuthProfile } from "firebase/auth";
import {
  getOrCreateUserProfile,
  updateUserProfile,
  getUserSubmissions,
  saveUserSubmission,
  deleteUserSubmission,
  getUserAiReports,
} from "@/lib/firestore-service";
import { problems, problemBySlug } from "@/lib/problems";
import { LeetCodeHeatmap } from "@/components/dashboard/LeetCodeHeatmap";
import { AiMistakesSection } from "@/components/dashboard/AiMistakesSection";
import { ApiKeyVaultManager } from "@/components/ApiKeyVaultModal";
import {
  connectGithubWithPopupOrRedirect,
  consumeGithubSyncFromHash,
  persistGithubAuthToClient,
  pushSolutionToGithub,
  resumePendingGithubPushIfPresent,
  isSealedGithubTokenEnvelope,
} from "@/lib/github-sync";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Telemetry Overview — DSA.viz" },
      {
        name: "description",
        content:
          "Track your algorithmic velocity, connected LeetCode & GitHub accounts, activity density, and AI diagnostics.",
      },
      { property: "og:title", content: "Profile & Telemetry Overview — DSA.viz" },
      {
        property: "og:description",
        content: "Your algorithmic mastery overview, integrations, and submission telemetry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const DAY_LABELS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
const ROW_BAND_LABELS = ["<10 AM", "10 AM", "12 PM", "2 PM", "5 PM", "8 PM+"] as const;

function hourToBandIndex(hour: number): number {
  if (hour < 10) return 0; // <10 AM
  if (hour < 12) return 1; // 10 AM - 11:59 AM
  if (hour < 14) return 2; // 12 PM - 1:59 PM
  if (hour < 17) return 3; // 2 PM - 4:59 PM
  if (hour < 20) return 4; // 5 PM - 7:59 PM
  return 5; // 8 PM+
}

function formatShortRelativeTime(ts?: string | number | null): string {
  if (!ts) return "";
  const dateMs =
    typeof ts === "number"
      ? ts < 1e12
        ? ts * 1000
        : ts
      : !isNaN(Number(ts)) && String(ts).trim().length <= 10
      ? Number(ts) * 1000
      : new Date(ts).getTime();
  if (isNaN(dateMs) || dateMs <= 0) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - dateMs) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)}d ago`;
  const d = new Date(dateMs);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getProfileSnapshotStorageKey(uid: string): string {
  return `dsaviz_profile_snapshot_v3_${uid}`;
}

function hasMeaningfulSyncData(snapshot: any): boolean {
  if (!snapshot || !snapshot.profile) return false;
  if (snapshot.explicitlyResynced) return true;
  const p = snapshot.profile;
  return Boolean(
    p.leetcodeUsername ||
      p.leetcode_username ||
      p.leetcodeStats ||
      p.leetcode_stats ||
      p.githubConnected ||
      p.github_connected ||
      p.githubUsername ||
      p.github_username ||
      p.githubToken ||
      (Array.isArray(snapshot.submissions) && snapshot.submissions.length > 0) ||
      (Array.isArray(snapshot.aiReports) && snapshot.aiReports.length > 0) ||
      (snapshot.keyVaultStatus && Number(snapshot.keyVaultStatus.totalConfigured || 0) > 0)
  );
}

function readLegacyNonNullSnapshotFields(uid?: string | null): {
  leetcodeUsername: string | null;
  leetcodeStats: any | null;
  githubUsername: string | null;
  githubAvatar: string | null;
  githubToken: string | null;
  submissions: any[];
  aiReports: any[];
} {
  const empty = {
    leetcodeUsername: null,
    leetcodeStats: null,
    githubUsername: null,
    githubAvatar: null,
    githubToken: null,
    submissions: [],
    aiReports: [],
  };
  try {
    if (!uid || typeof window === "undefined") return empty;
    const v2Raw = window.localStorage.getItem(`dsaviz_profile_snapshot_v2_${uid}`);
    const v1Raw = window.localStorage.getItem(`dsaviz_profile_snapshot_${uid}`);
    const authV1Raw = window.localStorage.getItem(`dsa_viz_auth_profile_${uid}`);
    const authV3Raw = window.localStorage.getItem(`dsa_viz_auth_profile_v3_${uid}`);
    const v2 = v2Raw ? JSON.parse(v2Raw) : null;
    const v1 = v1Raw ? JSON.parse(v1Raw) : null;
    const authV1 = authV1Raw ? JSON.parse(authV1Raw) : null;
    const authV3 = authV3Raw ? JSON.parse(authV3Raw) : null;

    const lcUsername =
      window.localStorage.getItem(`dsa_viz_leetcode_username_${uid}`) ||
      authV3?.leetcodeUsername ||
      authV3?.leetcode_username ||
      v2?.profile?.leetcodeUsername ||
      v2?.profile?.leetcode_username ||
      v1?.profile?.leetcodeUsername ||
      v1?.profile?.leetcode_username ||
      authV1?.leetcodeUsername ||
      authV1?.leetcode_username ||
      null;

    let lcStats =
      authV3?.leetcodeStats ||
      authV3?.leetcode_stats ||
      v2?.profile?.leetcodeStats ||
      v2?.profile?.leetcode_stats ||
      v1?.profile?.leetcodeStats ||
      v1?.profile?.leetcode_stats ||
      authV1?.leetcodeStats ||
      authV1?.leetcode_stats ||
      null;
    if (!lcStats) {
      const rawStats = window.localStorage.getItem(`dsa_viz_leetcode_stats_${uid}`);
      if (rawStats) {
        try {
          lcStats = JSON.parse(rawStats);
        } catch {}
      }
    }

    const ghUsername =
      window.localStorage.getItem(`dsa_viz_github_username_${uid}`) ||
      v2?.profile?.githubUsername ||
      v2?.profile?.github_username ||
      v1?.profile?.githubUsername ||
      null;
    const ghAvatar =
      window.localStorage.getItem(`dsa_viz_github_avatar_${uid}`) ||
      v2?.profile?.githubAvatar ||
      v2?.profile?.github_avatar ||
      v1?.profile?.githubAvatar ||
      null;
    const rawStoredGhToken = window.localStorage.getItem(`dsa_viz_github_token_${uid}`);
    if (rawStoredGhToken && !isSealedGithubTokenEnvelope(rawStoredGhToken)) {
      window.localStorage.removeItem(`dsa_viz_github_token_${uid}`);
    }
    const candidateGhToken =
      (rawStoredGhToken && isSealedGithubTokenEnvelope(rawStoredGhToken) ? rawStoredGhToken : null) ||
      authV3?.githubToken ||
      v2?.profile?.githubToken ||
      v1?.profile?.githubToken ||
      authV1?.githubToken ||
      null;
    const ghToken = isSealedGithubTokenEnvelope(candidateGhToken) ? candidateGhToken : null;

    const submissions =
      Array.isArray(v2?.submissions) && v2.submissions.length > 0
        ? v2.submissions
        : Array.isArray(v1?.submissions) && v1.submissions.length > 0
        ? v1.submissions
        : [];
    const aiReports =
      Array.isArray(v2?.aiReports) && v2.aiReports.length > 0
        ? v2.aiReports
        : Array.isArray(v1?.aiReports) && v1.aiReports.length > 0
        ? v1.aiReports
        : [];

    return {
      leetcodeUsername: lcUsername,
      leetcodeStats: lcStats,
      githubUsername: ghUsername,
      githubAvatar: ghAvatar,
      githubToken: ghToken,
      submissions,
      aiReports,
    };
  } catch {
    return empty;
  }
}

function readCachedProfileSnapshot(uid?: string | null): any | null {
  try {
    if (!uid || typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(getProfileSnapshotStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.profile ||
      parsed.source === "instant" ||
      !parsed.isVerifiedSync ||
      !hasMeaningfulSyncData(parsed)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedProfileSnapshot(uid: string | undefined | null, snapshot: any): void {
  try {
    if (
      !uid ||
      !snapshot ||
      !snapshot.profile ||
      snapshot.source === "instant" ||
      !snapshot.isVerifiedSync ||
      typeof window === "undefined"
    ) {
      return;
    }
    window.localStorage.setItem(getProfileSnapshotStorageKey(uid), JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota errors
  }
}

function applyLocalOverridesToSnapshot(snapshot: any, uid?: string | null, hashGithub?: any): any {
  if (!snapshot || !snapshot.profile) return snapshot;
  const legacy = readLegacyNonNullSnapshotFields(uid);
  const savedDisplayName =
    typeof window !== "undefined" && uid
      ? localStorage.getItem(`dsa_viz_display_name_${uid}`) ||
        localStorage.getItem("dsa_viz_display_name")
      : null;
  const localGhConnected =
    typeof window !== "undefined" && uid
      ? localStorage.getItem(`dsa_viz_github_connected_${uid}`) === "true"
      : false;

  const ghUsername =
    hashGithub?.githubUsername ||
    snapshot.profile.githubUsername ||
    snapshot.profile.github_username ||
    legacy.githubUsername ||
    null;
  const ghAvatar =
    hashGithub?.githubAvatar ||
    snapshot.profile.githubAvatar ||
    snapshot.profile.github_avatar ||
    legacy.githubAvatar ||
    null;
  const ghToken =
    hashGithub?.githubToken || snapshot.profile.githubToken || legacy.githubToken || null;
  const ghConnected =
    Boolean(hashGithub?.githubConnected) ||
    Boolean(snapshot.profile.githubConnected) ||
    Boolean(ghToken) ||
    Boolean(ghUsername) ||
    localGhConnected;
  const ghUrl =
    hashGithub?.githubUrl ||
    snapshot.profile.githubUrl ||
    (ghUsername ? `https://github.com/${ghUsername}` : null);
  const displayName =
    savedDisplayName || snapshot.profile.displayName || snapshot.profile.display_name;
  const lcUsername =
    snapshot.profile.leetcodeUsername ||
    snapshot.profile.leetcode_username ||
    legacy.leetcodeUsername ||
    null;
  const lcStats =
    snapshot.profile.leetcodeStats ||
    snapshot.profile.leetcode_stats ||
    legacy.leetcodeStats ||
    null;

  return {
    ...snapshot,
    profile: {
      ...snapshot.profile,
      displayName,
      display_name: displayName,
      leetcodeUsername: lcUsername,
      leetcode_username: lcUsername,
      leetcodeStats: lcStats,
      leetcode_stats: lcStats,
      githubConnected: ghConnected,
      github_connected: ghConnected,
      githubToken: ghToken,
      githubUsername: ghUsername,
      github_username: ghUsername,
      githubAvatar: ghAvatar,
      github_avatar: ghAvatar,
      githubUrl: ghUrl,
    },
  };
}

function buildInstantFallbackSnapshot(firebaseUser: any, authProfile: any): any {
  const uid = firebaseUser?.uid || authProfile?.id || "";
  const cached = readCachedProfileSnapshot(uid);
  if (cached) {
    return applyLocalOverridesToSnapshot(cached, uid);
  }

  const legacy = readLegacyNonNullSnapshotFields(uid);
  const savedDisplayName =
    typeof window !== "undefined" && uid
      ? localStorage.getItem(`dsa_viz_display_name_${uid}`) ||
        localStorage.getItem("dsa_viz_display_name")
      : null;
  const displayName =
    savedDisplayName ||
    authProfile?.displayName ||
    authProfile?.display_name ||
    firebaseUser?.displayName ||
    (firebaseUser?.email ? firebaseUser.email.split("@")[0] : "Authenticated User");
  const avatarUrl =
    authProfile?.avatarUrl || authProfile?.avatar_url || firebaseUser?.photoURL || null;
  const leetcodeUsername =
    authProfile?.leetcodeUsername ||
    authProfile?.leetcode_username ||
    legacy.leetcodeUsername ||
    null;
  const leetcodeStats =
    authProfile?.leetcodeStats || authProfile?.leetcode_stats || legacy.leetcodeStats || null;
  const ghToken = authProfile?.githubToken || legacy.githubToken || null;
  const ghUsername = legacy.githubUsername || null;
  const ghAvatar = legacy.githubAvatar || null;
  const ghConnected =
    Boolean(ghToken) ||
    Boolean(ghUsername) ||
    (typeof window !== "undefined" && uid
      ? localStorage.getItem(`dsa_viz_github_connected_${uid}`) === "true"
      : false);

  let keyVaultStatus: any = null;
  try {
    if (typeof window !== "undefined" && uid) {
      const rawVault = localStorage.getItem(`dsaviz:vault_public_status:${uid}`);
      if (rawVault) keyVaultStatus = JSON.parse(rawVault);
    }
  } catch {}

  return {
    profile: {
      id: uid,
      displayName,
      display_name: displayName,
      avatarUrl,
      avatar_url: avatarUrl,
      leetcodeUsername,
      leetcode_username: leetcodeUsername,
      leetcodeStats,
      leetcode_stats: leetcodeStats,
      githubConnected: ghConnected,
      github_connected: ghConnected,
      githubToken: ghToken,
      githubUsername: ghUsername,
      github_username: ghUsername,
      githubAvatar: ghAvatar,
      github_avatar: ghAvatar,
      githubUrl: ghUsername ? `https://github.com/${ghUsername}` : null,
      solvedCount: 0,
      optimalCount: 0,
      attemptsCount: legacy.submissions.length,
    },
    submissions: legacy.submissions,
    aiReports: legacy.aiReports,
    keyVaultStatus,
    attempts: legacy.submissions.length,
    solved: 0,
    optimal: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    cachedAt: null,
    isVerifiedSync: false,
    source: "instant",
  };
}

function ProfilePage() {
  const { user, profile: authProfile, token, refreshProfile, updateNickname, signOut } = useAuth();
  const queryClient = useQueryClient();

  const [inputUsername, setInputUsername] = useState("");
  const [editingLc, setEditingLc] = useState(false);

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [customHandle, setCustomHandle] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dsa_viz_display_name") || null;
    }
    return null;
  });
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isPushingGithub, setIsPushingGithub] = useState(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [lastFirebaseSyncAt, setLastFirebaseSyncAt] = useState<string | null>(() => {
    const cached = readCachedProfileSnapshot(getAuth().currentUser?.uid);
    return cached?.cachedAt || null;
  });

  // Strictly false on normal page loads/refreshes so Redis retains data without re-fetching Firebase.
  // Only set to true when the user explicitly clicks "RESYNC FIREBASE".
  const forceFirebaseResyncRef = useRef(false);

  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [activeTimeRange, setActiveTimeRange] = useState<"ALL TIME" | "THIS WEEK" | "30 DAYS">(
    "ALL TIME"
  );

  // Saved Submissions & Attempt Explorer state (from Dashboard)
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(null);
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState("");
  const [submissionClassFilter, setSubmissionClassFilter] = useState<
    "ALL" | "Optimal" | "Better" | "Brute Force" | "Incomplete"
  >("ALL");
  const [submissionDiffFilter, setSubmissionDiffFilter] = useState<
    "ALL" | "Easy" | "Medium" | "Hard"
  >("ALL");

  const analyticsSectionRef = useRef<HTMLDivElement>(null);
  const submissionsSectionRef = useRef<HTMLDivElement>(null);
  const lcSectionRef = useRef<HTMLDivElement>(null);
  const vaultSectionRef = useRef<HTMLDivElement>(null);
  const diagnosticsSectionRef = useRef<HTMLDivElement>(null);
  const privacySectionRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const persistSnapshotToRedisAndLocal = useCallback(
    async (uid: string | undefined | null, snapshot: any, bearerToken?: string | null) => {
      if (!uid || !snapshot || !snapshot.profile || snapshot.source === "instant") return;
      const verifiedSnapshot = {
        ...snapshot,
        profile: {
          ...snapshot.profile,
          isVerifiedSync: true,
        },
        isVerifiedSync: true,
      };
      writeCachedProfileSnapshot(uid, verifiedSnapshot);
      const tok =
        bearerToken ||
        (await getAuth()
          .currentUser?.getIdToken()
          .catch(() => token)) ||
        token;
      if (tok) {
        await fetch("/api/profile/snapshot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tok}`,
          },
          body: JSON.stringify({ snapshot: verifiedSnapshot }),
        }).catch(() => {});
      }
    },
    [token]
  );

  const updateRetainedSnapshot = useCallback(
    (updater: (prev: any) => any) => {
      const uid = user?.uid || getAuth().currentUser?.uid;
      if (!uid) return;
      queryClient.setQueryData(["profile-stats", uid], (old: any) => {
        const base =
          old ||
          readCachedProfileSnapshot(uid) ||
          buildInstantFallbackSnapshot(user || getAuth().currentUser, authProfile);
        if (!base) return old;
        const next = {
          ...updater(base),
          isVerifiedSync: true,
          source: "synced",
          cachedAt: new Date().toISOString(),
        };
        void persistSnapshotToRedisAndLocal(uid, next);
        return next;
      });
    },
    [user, authProfile, queryClient, persistSnapshotToRedisAndLocal]
  );

  const queryUid = user?.uid || getAuth().currentUser?.uid || null;

  const { data: rawData, refetch } = useQuery({
    queryKey: ["profile-stats", queryUid || "pending"],
    initialData: () => (queryUid ? readCachedProfileSnapshot(queryUid) ?? undefined : undefined),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser || user;
      const uid = currentUser?.uid || queryUid;
      const currentToken = currentUser ? await currentUser.getIdToken().catch(() => token) : token;
      const forceFirebase = forceFirebaseResyncRef.current;
      forceFirebaseResyncRef.current = false;

      const hashGithub = await consumeGithubSyncFromHash(uid || undefined);
      const legacy = readLegacyNonNullSnapshotFields(uid);

      // 1. STRICT REDIS RETENTION PATH (On normal load or refresh when forceFirebase is false)
      if (!forceFirebase) {
        // 1a. Check server Redis snapshot first (/api/profile/snapshot)
        if (currentToken) {
          try {
            const snapRes = await fetch("/api/profile/snapshot", {
              headers: { Authorization: `Bearer ${currentToken}` },
            });
            if (snapRes.ok) {
              const snapJson = await snapRes.json();
              if (
                snapJson?.cached &&
                snapJson?.snapshot?.profile &&
                snapJson.snapshot.isVerifiedSync &&
                snapJson.snapshot.source !== "instant" &&
                hasMeaningfulSyncData(snapJson.snapshot)
              ) {
                const retained = applyLocalOverridesToSnapshot(
                  snapJson.snapshot,
                  uid,
                  hashGithub
                );
                if (uid) {
                  writeCachedProfileSnapshot(uid, retained);
                  if (hashGithub) {
                    void persistSnapshotToRedisAndLocal(uid, retained, currentToken);
                  }
                }
                if (retained.cachedAt) {
                  setLastFirebaseSyncAt(retained.cachedAt);
                }
                return retained;
              }
            }
          } catch {
            // Fall through to local snapshot check
          }
        }

        // 1b. If Redis was cold-started or unreachable, check client retained verified snapshot before hitting Firebase
        if (uid) {
          const localSnap = readCachedProfileSnapshot(uid);
          if (localSnap && localSnap.profile && hasMeaningfulSyncData(localSnap)) {
            const retained = applyLocalOverridesToSnapshot(localSnap, uid, hashGithub);
            void persistSnapshotToRedisAndLocal(uid, retained, currentToken);
            if (retained.cachedAt) {
              setLastFirebaseSyncAt(retained.cachedAt);
            }
            return retained;
          }
        }
      }

      // 2. EXPLICIT FIREBASE RESYNC OR FIRST-TIME VERIFIED CACHE SEED
      let clientProfile: any = null;
      let clientSubs: any[] = [];
      let clientAiReports: any[] = [];
      if (currentUser) {
        const [prof, subs, reports] = await Promise.all([
          getOrCreateUserProfile(currentUser.uid, currentUser.email, currentUser.photoURL).catch(
            (e) => {
              console.warn("Client Firestore profile read fallback:", e);
              return null;
            }
          ),
          getUserSubmissions(currentUser.uid).catch(() => []),
          getUserAiReports(currentUser.uid).catch(() => []),
        ]);
        clientProfile = prof;
        clientSubs = Array.isArray(subs) ? subs : [];
        clientAiReports = Array.isArray(reports) ? reports : [];
      }

      let serverProfile: any = null;
      let serverSubs: any[] = [];
      let serverAiReports: any[] = [];
      let keyVaultStatus: any = null;
      const refreshParam = "?refresh=1";
      if (currentToken) {
        try {
          const [profileRes, subsRes, reportsRes, vaultRes] = await Promise.all([
            fetch(`/api/profile${refreshParam}`, {
              headers: { Authorization: `Bearer ${currentToken}` },
            }).catch(() => null),
            fetch(`/api/submissions${refreshParam}`, {
              headers: { Authorization: `Bearer ${currentToken}` },
            }).catch(() => null),
            fetch(`/api/user-reports${refreshParam}`, {
              headers: { Authorization: `Bearer ${currentToken}` },
            }).catch(() => null),
            fetch("/api/user-keys/status", {
              headers: { Authorization: `Bearer ${currentToken}` },
            }).catch(() => null),
          ]);
          if (profileRes?.ok) serverProfile = await profileRes.json();
          if (subsRes?.ok) {
            const s = await subsRes.json();
            if (Array.isArray(s)) serverSubs = s;
          }
          if (reportsRes?.ok) {
            const r = await reportsRes.json();
            if (Array.isArray(r)) serverAiReports = r;
          }
          if (vaultRes?.ok) {
            keyVaultStatus = await vaultRes.json();
          }
        } catch (e) {
          console.warn("Server profile stats read error:", e);
        }
      }

      const effectiveDisplayName =
        (typeof window !== "undefined" &&
          ((uid && localStorage.getItem(`dsa_viz_display_name_${uid}`)) ||
            localStorage.getItem("dsa_viz_display_name"))) ||
        clientProfile?.displayName ||
        clientProfile?.display_name ||
        serverProfile?.displayName ||
        serverProfile?.display_name ||
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "Authenticated User";

      const effectiveLcUsername =
        clientProfile?.leetcodeUsername ||
        clientProfile?.leetcode_username ||
        serverProfile?.leetcodeUsername ||
        serverProfile?.leetcode_username ||
        legacy.leetcodeUsername ||
        null;

      let effectiveLcStats =
        clientProfile?.leetcodeStats ||
        clientProfile?.leetcode_stats ||
        serverProfile?.leetcodeStats ||
        serverProfile?.leetcode_stats ||
        legacy.leetcodeStats ||
        null;

      // If user has a connected LeetCode username (or explicitly clicked Resync Firebase), ensure fresh LeetCode stats are fetched
      if (effectiveLcUsername && (!effectiveLcStats || forceFirebase) && currentToken) {
        try {
          const lcRes = await fetch("/api/sync-leetcode", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ username: effectiveLcUsername }),
          });
          if (lcRes.ok) {
            const lcData = await lcRes.json();
            if (lcData?.stats) {
              effectiveLcStats = lcData.stats;
            }
          }
        } catch {
          // Keep existing effectiveLcStats if LeetCode upstream is slow
        }
      }

      if (typeof window !== "undefined" && uid) {
        if (effectiveLcUsername) {
          localStorage.setItem(`dsa_viz_leetcode_username_${uid}`, effectiveLcUsername);
        }
        if (effectiveLcStats) {
          try {
            localStorage.setItem(`dsa_viz_leetcode_stats_${uid}`, JSON.stringify(effectiveLcStats));
          } catch {}
        }
      }

      const effectiveAvatar =
        clientProfile?.avatarUrl ||
        clientProfile?.avatar_url ||
        serverProfile?.avatarUrl ||
        serverProfile?.avatar_url ||
        currentUser?.photoURL ||
        null;

      const localConnected =
        typeof window !== "undefined" && uid
          ? localStorage.getItem(`dsa_viz_github_connected_${uid}`) === "true"
          : false;
      const localToken =
        typeof window !== "undefined" && uid
          ? localStorage.getItem(`dsa_viz_github_token_${uid}`)
          : null;

      const effectiveGithubUsername =
        hashGithub?.githubUsername ||
        clientProfile?.githubUsername ||
        clientProfile?.github_username ||
        serverProfile?.githubUsername ||
        serverProfile?.github_username ||
        legacy.githubUsername ||
        null;

      const effectiveGithubAvatar =
        hashGithub?.githubAvatar ||
        clientProfile?.githubAvatar ||
        clientProfile?.github_avatar ||
        serverProfile?.githubAvatar ||
        serverProfile?.github_avatar ||
        legacy.githubAvatar ||
        null;

      const effectiveGithubToken =
        hashGithub?.githubToken ||
        clientProfile?.githubToken ||
        serverProfile?.githubToken ||
        localToken ||
        legacy.githubToken ||
        null;

      const isGithubConnected =
        !!hashGithub?.githubConnected ||
        !!effectiveGithubToken ||
        !!clientProfile?.githubConnected ||
        !!serverProfile?.githubConnected ||
        !!effectiveGithubUsername ||
        localConnected;

      if (typeof window !== "undefined" && uid && effectiveGithubToken) {
        if (isSealedGithubTokenEnvelope(effectiveGithubToken)) {
          localStorage.setItem(`dsa_viz_github_token_${uid}`, effectiveGithubToken);
        } else {
          localStorage.removeItem(`dsa_viz_github_token_${uid}`);
        }
        localStorage.setItem(`dsa_viz_github_connected_${uid}`, "true");
      }

      const effectiveGithubUrl =
        hashGithub?.githubUrl ||
        clientProfile?.githubUrl ||
        serverProfile?.githubUrl ||
        (effectiveGithubUsername ? `https://github.com/${effectiveGithubUsername}` : null);

      // Merge & deduplicate client Firestore submissions, server submissions, and any legacy cached submissions
      const subMap = new Map<string, any>();
      const clientIds = new Set<string>();
      for (const s of clientSubs) {
        if (!s || !s.slug) continue;
        const tsKey = String(s.createdAt || s.created_at || "").slice(0, 16);
        const dedupKey = `${s.slug}_${tsKey}_${s.classification || ""}`;
        subMap.set(dedupKey, s);
        if (s.id) clientIds.add(String(s.id));
      }

      const unsyncedToFirestore: any[] = [];
      for (const s of [...serverSubs, ...legacy.submissions]) {
        if (!s || !s.slug) continue;
        const tsKey = String(s.createdAt || s.created_at || "").slice(0, 16);
        const dedupKey = `${s.slug}_${tsKey}_${s.classification || ""}`;
        if (!subMap.has(dedupKey) && (!s.id || !clientIds.has(String(s.id)))) {
          subMap.set(dedupKey, s);
          unsyncedToFirestore.push(s);
        }
      }

      const subsArray = Array.from(subMap.values()).sort((a, b) => {
        const ta = new Date(a.createdAt || a.created_at || 0).getTime();
        const tb = new Date(b.createdAt || b.created_at || 0).getTime();
        return tb - ta;
      });

      // Normalize difficulty on each submission using canonical problem lookup if missing
      for (const s of subsArray) {
        const knownProb = s.slug ? problemBySlug(s.slug) : undefined;
        if (knownProb) {
          if (!s.difficulty) s.difficulty = knownProb.difficulty;
          if (!s.title || s.title === s.slug) s.title = knownProb.title;
        }
      }

      // Merge & deduplicate AI diagnostic reports
      const reportMap = new Map<string, any>();
      for (const r of [...clientAiReports, ...serverAiReports, ...legacy.aiReports]) {
        if (!r) continue;
        const payload = r.reportData ? { id: r.id, ...r.reportData, createdAt: r.createdAt } : r;
        const rKey = String(
          payload.id ||
            `${payload.reportTitle || "report"}_${String(
              payload.createdAt || payload.generatedAt || ""
            ).slice(0, 16)}`
        );
        if (!reportMap.has(rKey)) {
          reportMap.set(rKey, payload);
        }
      }
      const aiReports = Array.from(reportMap.values()).sort((a, b) => {
        const ta = new Date(a.createdAt || a.generatedAt || 0).getTime();
        const tb = new Date(b.createdAt || b.generatedAt || 0).getTime();
        return tb - ta;
      });

      const completeRows = subsArray.filter(
        (r: any) => r.classification && r.classification !== "Incomplete"
      );
      const solved = new Set(completeRows.map((r: any) => r.slug));
      const optimal = new Set(
        completeRows.filter((r: any) => r.classification === "Optimal").map((r: any) => r.slug)
      );
      const byDifficulty = {
        Easy: new Set(
          completeRows
            .filter((r: any) => String(r.difficulty).toLowerCase() === "easy")
            .map((r: any) => r.slug)
        ),
        Medium: new Set(
          completeRows
            .filter((r: any) => String(r.difficulty).toLowerCase() === "medium")
            .map((r: any) => r.slug)
        ),
        Hard: new Set(
          completeRows
            .filter((r: any) => String(r.difficulty).toLowerCase() === "hard")
            .map((r: any) => r.slug)
        ),
      };

      const profile = {
        ...(serverProfile || {}),
        ...(clientProfile || {}),
        githubConnected: isGithubConnected,
        github_connected: isGithubConnected,
        githubToken: effectiveGithubToken,
        githubUsername: effectiveGithubUsername,
        github_username: effectiveGithubUsername,
        githubAvatar: effectiveGithubAvatar,
        github_avatar: effectiveGithubAvatar,
        githubUrl: effectiveGithubUrl,
        displayName: effectiveDisplayName,
        display_name: effectiveDisplayName,
        avatarUrl: effectiveAvatar,
        avatar_url: effectiveAvatar,
        leetcodeStats: effectiveLcStats,
        leetcode_stats: effectiveLcStats,
        leetcodeUsername: effectiveLcUsername,
        leetcode_username: effectiveLcUsername,
        solvedCount: solved.size,
        optimalCount: optimal.size,
        attemptsCount: subsArray.length,
        isVerifiedSync: true,
      };

      // Background two-way reconciliation to Firebase Firestore (only writing non-null fields so we never erase Firestore data)
      if (currentUser) {
        if (unsyncedToFirestore.length > 0) {
          Promise.all(
            unsyncedToFirestore.slice(0, 25).map((sub) =>
              saveUserSubmission(currentUser.uid, sub).catch(() => {})
            )
          ).catch(() => {});
        }
        const needsProfileSync =
          clientProfile &&
          (clientProfile.displayName !== effectiveDisplayName ||
            (effectiveLcUsername && clientProfile.leetcodeUsername !== effectiveLcUsername) ||
            (effectiveGithubUsername && clientProfile.githubUsername !== effectiveGithubUsername) ||
            (effectiveGithubToken && clientProfile.githubToken !== effectiveGithubToken) ||
            (isGithubConnected && !clientProfile.githubConnected) ||
            (solved.size > 0 && clientProfile.solvedCount !== solved.size) ||
            (optimal.size > 0 && clientProfile.optimalCount !== optimal.size) ||
            (subsArray.length > 0 && clientProfile.attemptsCount !== subsArray.length) ||
            (!clientProfile.leetcodeStats && effectiveLcStats));
        if (needsProfileSync) {
          updateUserProfile(currentUser.uid, {
            displayName: effectiveDisplayName,
            display_name: effectiveDisplayName,
            ...(effectiveAvatar ? { avatarUrl: effectiveAvatar, avatar_url: effectiveAvatar } : {}),
            ...(effectiveLcUsername
              ? { leetcodeUsername: effectiveLcUsername, leetcode_username: effectiveLcUsername }
              : {}),
            ...(effectiveLcStats
              ? { leetcodeStats: effectiveLcStats, leetcode_stats: effectiveLcStats }
              : {}),
            ...(isGithubConnected
              ? { githubConnected: true, github_connected: true }
              : {}),
            ...(effectiveGithubToken ? { githubToken: effectiveGithubToken } : {}),
            ...(effectiveGithubUsername
              ? { githubUsername: effectiveGithubUsername, github_username: effectiveGithubUsername }
              : {}),
            ...(effectiveGithubAvatar
              ? { githubAvatar: effectiveGithubAvatar, github_avatar: effectiveGithubAvatar }
              : {}),
            ...(effectiveGithubUrl ? { githubUrl: effectiveGithubUrl } : {}),
            ...(subsArray.length > 0
              ? {
                  solvedCount: solved.size,
                  optimalCount: optimal.size,
                  attemptsCount: subsArray.length,
                }
              : {}),
          }).catch(() => {});
        }
      }

      const nowIso = new Date().toISOString();
      setLastFirebaseSyncAt(nowIso);

      const isVerifiedFromBackendOrFirestore = Boolean(
        clientProfile || serverProfile?.isVerifiedSync || forceFirebase
      );

      const snapshotResult = {
        profile,
        submissions: subsArray,
        aiReports,
        keyVaultStatus,
        attempts: subsArray.length,
        solved: solved.size,
        optimal: optimal.size,
        easy: byDifficulty.Easy.size,
        medium: byDifficulty.Medium.size,
        hard: byDifficulty.Hard.size,
        cachedAt: nowIso,
        isVerifiedSync: isVerifiedFromBackendOrFirestore,
        explicitlyResynced: forceFirebase || undefined,
        source: "firebase",
      };

      // Persist verified snapshot to Redis & localStorage so subsequent refreshes load instantly from Redis without re-fetching Firebase
      if (uid && isVerifiedFromBackendOrFirestore) {
        void persistSnapshotToRedisAndLocal(uid, snapshotResult, currentToken);
      }

      return snapshotResult;
    },
    enabled: Boolean(queryUid),
  });

  // Always provide immediate non-null data when user is logged in (0ms render, no blocking spinner)
  const data = useMemo(
    () => rawData || (user ? buildInstantFallbackSnapshot(user, authProfile) : null),
    [rawData, user, authProfile]
  );

  // If URL hash contains a fresh GitHub OAuth payload (#gh_sync=...), consume and persist it immediately into Redis + local cache
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash.includes("gh_sync=")) return;
    const uid = user?.uid || getAuth().currentUser?.uid;
    void consumeGithubSyncFromHash(uid).then((ghPayload) => {
      if (ghPayload) {
        updateRetainedSnapshot((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            githubConnected: true,
            github_connected: true,
            githubToken: ghPayload.githubToken || prev.profile?.githubToken || null,
            githubUsername: ghPayload.githubUsername || prev.profile?.githubUsername || null,
            github_username: ghPayload.githubUsername || prev.profile?.githubUsername || null,
            githubAvatar: ghPayload.githubAvatar || prev.profile?.githubAvatar || null,
            github_avatar: ghPayload.githubAvatar || prev.profile?.githubAvatar || null,
            githubUrl: ghPayload.githubUrl || prev.profile?.githubUrl || null,
          },
        }));
      }
    });
  }, [user?.uid, updateRetainedSnapshot]);

  const handleManualFirebaseSync = useCallback(async () => {
    setIsSyncingFirebase(true);
    try {
      // Strictly fetch fresh data from Firebase Firestore & server first (never overwrite Firestore with fallback state before fetching!)
      forceFirebaseResyncRef.current = true;
      await Promise.all([refetch(), refreshProfile().catch(() => {})]);
      setLastFirebaseSyncAt(new Date().toISOString());
      toast.success("Resynced from Firebase Firestore & updated Redis retention cache!");
    } catch (err: any) {
      toast.error(err?.message || "Could not complete Firebase sync");
    } finally {
      forceFirebaseResyncRef.current = false;
      setIsSyncingFirebase(false);
    }
  }, [refetch, refreshProfile]);

  const handleExportData = () => {
    const dataToExport = {
      profile: data?.profile || user,
      submissions: data?.submissions || [],
      aiReports: data?.aiReports || [],
      exportedAt: new Date().toISOString(),
      platform: "DSA.viz.co",
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsaviz-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("All personal data exported successfully.");
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteText !== "DELETE MY ACCOUNT") {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm.');
      return;
    }
    setIsDeletingAccount(true);
    try {
      const currentToken = await user?.getIdToken();
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentToken || "mock-guest-token-dev"}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete account");
      if (user?.uid && typeof window !== "undefined") {
        localStorage.removeItem(getProfileSnapshotStorageKey(user.uid));
      }
      toast.success("Account and associated data deleted permanently.");
      await signOut();
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err?.message || "Could not complete account deletion");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDisconnectGithub = async () => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentToken = currentUser ? await currentUser.getIdToken() : null;
      if (currentUser) {
        try {
          localStorage.removeItem(`dsa_viz_github_connected_${currentUser.uid}`);
          localStorage.removeItem(`dsa_viz_github_token_${currentUser.uid}`);
          localStorage.removeItem(`dsa_viz_github_username_${currentUser.uid}`);
          localStorage.removeItem(`dsa_viz_github_avatar_${currentUser.uid}`);
          await updateUserProfile(currentUser.uid, {
            githubToken: null,
            githubConnected: false,
            github_connected: false,
            githubUsername: null,
            github_username: null,
            githubAvatar: null,
            github_avatar: null,
            githubUrl: null,
          });
        } catch (e) {
          console.warn("Could not clear client firestore github fields:", e);
        }
      }
      if (currentToken) {
        await fetch("/api/github/disconnect", {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        }).catch(() => {});
      }
      updateRetainedSnapshot((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          githubConnected: false,
          github_connected: false,
          githubToken: null,
          githubUsername: null,
          github_username: null,
          githubAvatar: null,
          github_avatar: null,
          githubUrl: null,
        },
      }));
      toast.success("GitHub disconnected and retained in Redis + Firebase");
    } catch {
      toast.error("Failed to disconnect GitHub");
    }
  };

  useEffect(() => {
    void resumePendingGithubPushIfPresent();

    const handleMessage = async (event: MessageEvent) => {
      if (typeof window === "undefined" || event.origin !== window.location.origin) return;
      const msgType = event.data?.type;
      if (msgType === "GITHUB_AUTH_SUCCESS" || msgType === "GITHUB_CONNECTED") {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        const ghUsername = event.data?.githubUsername || null;
        const ghAvatar = event.data?.githubAvatar || null;
        const rawToken = event.data?.githubToken || null;
        const ghToken = isSealedGithubTokenEnvelope(rawToken) ? rawToken : null;
        const ghUrl =
          event.data?.githubUrl || (ghUsername ? `https://github.com/${ghUsername}` : null);
        if (currentUser) {
          await persistGithubAuthToClient(currentUser.uid, {
            uid: currentUser.uid,
            githubConnected: true,
            githubToken: ghToken,
            githubUsername: ghUsername,
            githubAvatar: ghAvatar,
            githubUrl: ghUrl,
          });
        }
        updateRetainedSnapshot((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            githubConnected: true,
            github_connected: true,
            githubToken: ghToken || prev.profile?.githubToken || null,
            githubUsername: ghUsername || prev.profile?.githubUsername || null,
            github_username: ghUsername || prev.profile?.githubUsername || null,
            githubAvatar: ghAvatar || prev.profile?.githubAvatar || null,
            github_avatar: ghAvatar || prev.profile?.githubAvatar || null,
            githubUrl: ghUrl || prev.profile?.githubUrl || null,
          },
        }));
        toast.success("GitHub connected & retained in Redis + Firebase!");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [updateRetainedSnapshot]);

  const handleConnectGithub = async () => {
    setIsConnectingGithub(true);
    try {
      const res = await connectGithubWithPopupOrRedirect({ returnTo: "/profile" });
      if (res.connected) {
        updateRetainedSnapshot((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            githubConnected: true,
            github_connected: true,
            githubToken: res.payload?.githubToken || prev.profile?.githubToken || null,
            githubUsername: res.payload?.githubUsername || prev.profile?.githubUsername || null,
            github_username: res.payload?.githubUsername || prev.profile?.githubUsername || null,
            githubAvatar: res.payload?.githubAvatar || prev.profile?.githubAvatar || null,
            github_avatar: res.payload?.githubAvatar || prev.profile?.githubAvatar || null,
            githubUrl: res.payload?.githubUrl || prev.profile?.githubUrl || null,
          },
        }));
        toast.success("GitHub account connected & encrypted token synced!");
      }
    } catch (e: any) {
      console.error("GitHub connect error:", e);
      toast.error(e?.message || "Failed to initiate GitHub connect");
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const handlePushLatestToGithub = async () => {
    setIsPushingGithub(true);
    try {
      const subs: any[] = Array.isArray(data?.submissions) ? data.submissions : [];
      const latestWithCode = subs.find(
        (s) =>
          (typeof s?.code === "string" && s.code.trim().length > 0) ||
          (typeof s?.pseudocode === "string" && s.pseudocode.trim().length > 0)
      );

      let codeToPush: string;
      let slugToPush: string;
      let langToPush: string;

      if (latestWithCode) {
        codeToPush = String(latestWithCode.code || latestWithCode.pseudocode).trim();
        slugToPush = String(latestWithCode.slug || latestWithCode.title || "solution");
        langToPush = String(
          latestWithCode.language ||
            latestWithCode.lang ||
            (latestWithCode.code ? "cpp" : "pseudocode")
        );
      } else {
        const handle = data?.profile?.githubUsername || user?.displayName || "developer";
        slugToPush = "README";
        langToPush = "markdown";
        codeToPush = [
          "# LeetCode & DSA Solutions — Synced via DSA.viz.co",
          "",
          `Maintained by **@${handle}** using [DSA.viz.co](https://dsa-viz-co.vercel.app).`,
          "",
          `- **Total Solved**: ${Number(data?.solved || 0)} on DSA.viz`,
          `- **Optimal Verdicts**: ${Number(data?.optimal || 0)}`,
          `- **Last Synced**: ${new Date().toISOString()}`,
          "",
        ].join("\n");
      }

      const result = await pushSolutionToGithub({
        code: codeToPush,
        titleSlug: slugToPush,
        lang: langToPush,
        fallbackProfileToken: data?.profile?.githubToken || null,
      });

      if (result.ok && result.url) {
        toast.success(`Pushed ${slugToPush} to your LeetCode-Solutions GitHub repo!`, {
          action: {
            label: "View on GitHub",
            onClick: () => window.open(result.url, "_blank"),
          },
        });
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to push to GitHub");
    } finally {
      setIsPushingGithub(false);
    }
  };

  const syncMutation = useMutation({
    mutationFn: async (username: string) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentToken = currentUser ? await currentUser.getIdToken().catch(() => token) : token;

      const res = await fetch("/api/sync-leetcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        let errStr = "Sync failed";
        try {
          const d = await res.json();
          if (d.error) errStr = d.error;
        } catch {}
        throw new Error(errStr);
      }
      const resData = await res.json();

      if (currentUser) {
        try {
          await updateUserProfile(currentUser.uid, {
            leetcodeUsername: resData.username || username,
            leetcode_username: resData.username || username,
            leetcodeStats: resData.stats,
            leetcode_stats: resData.stats,
          });
        } catch (e) {
          console.warn("Client Firestore update error in syncMutation:", e);
        }
      }

      return resData;
    },
    onSuccess: (resData, rawUsername) => {
      const cleanLcUsername = resData?.username || rawUsername;
      const uid = user?.uid || getAuth().currentUser?.uid;
      if (typeof window !== "undefined" && uid) {
        if (cleanLcUsername) {
          localStorage.setItem(`dsa_viz_leetcode_username_${uid}`, cleanLcUsername);
        }
        if (resData?.stats) {
          try {
            localStorage.setItem(`dsa_viz_leetcode_stats_${uid}`, JSON.stringify(resData.stats));
          } catch {}
        }
      }
      updateRetainedSnapshot((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          leetcodeUsername: cleanLcUsername,
          leetcode_username: cleanLcUsername,
          leetcodeStats: resData?.stats || prev.profile?.leetcodeStats || null,
          leetcode_stats: resData?.stats || prev.profile?.leetcode_stats || null,
        },
      }));
      toast.success("LeetCode profile & heatmap synced and retained in Redis!");
      refreshProfile();
      setEditingLc(false);
      setInputUsername("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Sync failed.");
    },
  });

  const updateProfileUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      setCustomHandle(username);
      if (typeof window !== "undefined") {
        localStorage.setItem("dsa_viz_display_name", username);
        if (user?.uid) {
          localStorage.setItem(`dsa_viz_display_name_${user.uid}`, username);
        }
      }
      try {
        await updateNickname(username);
      } catch (e) {
        console.warn("Client updateNickname warning:", e);
      }

      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await updateUserProfile(currentUser.uid, {
            displayName: username,
            display_name: username,
          });
          await updateFirebaseAuthProfile(currentUser, { displayName: username }).catch(() => {});
        } catch {}
      }

      const currentToken = currentUser ? await currentUser.getIdToken().catch(() => token) : token;
      if (!currentToken) {
        return { ok: true, profile: { displayName: username, display_name: username } };
      }
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update username");
      }
      return res.json();
    },
    onSuccess: (_res, newUsername) => {
      setCustomHandle(newUsername);
      updateRetainedSnapshot((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          displayName: newUsername,
          display_name: newUsername,
        },
      }));
      toast.success("Username handle updated & retained in Redis + Firebase!");
      refreshProfile();
      setEditingUsername(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update username.");
    },
  });

  const profile = data?.profile;
  const leetcodeStats =
    (profile as any)?.leetcodeStats || (profile as any)?.leetcode_stats || null;
  const leetcodeUsername =
    (profile as any)?.leetcodeUsername || (profile as any)?.leetcode_username || null;
  const aiReports: any[] = Array.isArray(data?.aiReports) ? data.aiReports : [];
  const keyVaultStatus = data?.keyVaultStatus || null;

  const currentHandle = useMemo(() => {
    if (customHandle) return customHandle;
    if (profile?.displayName) return profile.displayName;
    if (profile?.display_name) return profile.display_name;
    if (typeof window !== "undefined") {
      const stored =
        (user?.uid ? localStorage.getItem(`dsa_viz_display_name_${user.uid}`) : null) ||
        localStorage.getItem("dsa_viz_display_name");
      if (stored) return stored;
    }
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "user";
  }, [
    customHandle,
    profile?.displayName,
    profile?.display_name,
    user?.displayName,
    user?.email,
    user?.uid,
  ]);

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
      toast.error(
        "Username can only contain letters, numbers, underscores, dashes, and periods."
      );
      return;
    }
    setCustomHandle(trimmed);
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

  // Time Range Cutoff in milliseconds (filters submissions & calendar dynamically)
  const rangeCutoffMs = useMemo(() => {
    if (activeTimeRange === "THIS WEEK") {
      return Date.now() - 7 * 24 * 60 * 60 * 1000;
    }
    if (activeTimeRange === "30 DAYS") {
      return Date.now() - 30 * 24 * 60 * 60 * 1000;
    }
    return 0;
  }, [activeTimeRange]);

  const filteredSubmissions = useMemo(() => {
    const allSubs = Array.isArray(data?.submissions) ? data.submissions : [];
    if (rangeCutoffMs <= 0) return allSubs;
    return allSubs.filter((s: any) => {
      const ts = new Date(s.createdAt || s.created_at || 0).getTime();
      return !isNaN(ts) && ts >= rangeCutoffMs;
    });
  }, [data?.submissions, rangeCutoffMs]);

  const filteredLcRecent = useMemo(() => {
    const lcSubs = Array.isArray(leetcodeStats?.recentSubmissions)
      ? leetcodeStats.recentSubmissions
      : [];
    if (rangeCutoffMs <= 0) return lcSubs;
    return lcSubs.filter((s: any) => {
      const rawTs = Number(s.timestamp || 0);
      const tsMs = rawTs < 1e12 ? rawTs * 1000 : rawTs;
      return tsMs >= rangeCutoffMs;
    });
  }, [leetcodeStats?.recentSubmissions, rangeCutoffMs]);

  // Derive Combined Metrics for Bento Overview (100% Real Values from Firebase + LeetCode)
  const lcEasy = Number(leetcodeStats?.easySolved || 0);
  const lcMedium = Number(leetcodeStats?.mediumSolved || 0);
  const lcHard = Number(leetcodeStats?.hardSolved || 0);
  const vizEasy = Number(data?.easy || 0);
  const vizMedium = Number(data?.medium || 0);
  const vizHard = Number(data?.hard || 0);

  const combinedEasy = lcEasy + vizEasy;
  const combinedMedium = lcMedium + vizMedium;
  const combinedHard = lcHard + vizHard;
  const combinedTotalSolved = Number(leetcodeStats?.totalSolved || 0) + Number(data?.solved || 0);

  // Compute active streak from Firebase submission dates + LeetCode streak
  const computedStreakDays = useMemo(() => {
    const lcStreak = Number(leetcodeStats?.streak || 0);
    const allSubs = Array.isArray(data?.submissions) ? data.submissions : [];
    if (allSubs.length === 0) return lcStreak;

    const daySet = new Set<string>();
    for (const s of allSubs) {
      const d = new Date(s.createdAt || s.created_at || 0);
      if (!isNaN(d.getTime())) {
        daySet.add(d.toISOString().slice(0, 10));
      }
    }
    let localStreak = 0;
    const cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (daySet.has(key)) {
        localStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (i === 0) {
        // Check if yesterday had activity
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return Math.max(lcStreak, localStreak);
  }, [leetcodeStats?.streak, data?.submissions]);

  // Recent Submissions List for Card 2 ("RECENT SUBMISSIONS") — Zero Fake Fallback Data
  const recentSubmissionData = useMemo(() => {
    const merged: Array<{
      id?: string;
      title: string;
      slug: string;
      badge: string;
      timeLabel: string;
      source: "VIZ" | "LC";
    }> = [];

    for (const s of filteredSubmissions) {
      const slug =
        s.slug ||
        String(s.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      if (!slug) continue;
      const comp = s.timeComplexity || s.time_complexity;
      const verdict = String(s.classification || "Submitted").toUpperCase();
      merged.push({
        id: s.id,
        title: String(s.title || s.slug).toUpperCase(),
        slug,
        badge: comp ? `${verdict} • ${comp}` : verdict,
        timeLabel: formatShortRelativeTime(s.createdAt || s.created_at),
        source: "VIZ",
      });
    }

    for (const s of filteredLcRecent) {
      const slug =
        s.titleSlug ||
        String(s.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      if (!slug) continue;
      if (!merged.some((m) => m.slug === slug)) {
        const lang = s.lang ? String(s.lang).toUpperCase() : "LC";
        const status = String(s.statusDisplay || "ACCEPTED").toUpperCase();
        merged.push({
          title: String(s.title || slug).toUpperCase(),
          slug,
          badge: `${status} • ${lang}`,
          timeLabel: formatShortRelativeTime(s.timestamp),
          source: "LC",
        });
      }
    }

    return {
      totalCount: merged.length,
      items: merged.slice(0, 5),
    };
  }, [filteredSubmissions, filteredLcRecent]);

  // Focus & Integration Queue for Card 3 ("FOCUS & INTEGRATION QUEUE") — Strictly Real Firebase & Account State
  const vaultActiveCount = Number(keyVaultStatus?.activeCount || 0);
  const vaultActiveProvider = keyVaultStatus?.activeProvider || null;
  const latestReport = aiReports[0] || null;
  const latestReportScore =
    typeof latestReport?.overallReadinessScore === "number"
      ? latestReport.overallReadinessScore
      : null;

  const optimizationQueueData = useMemo(() => {
    const nonOptimal = filteredSubmissions.filter(
      (s: any) => s.classification && s.classification !== "Optimal"
    );

    const rows: Array<{
      label: string;
      detail: string;
      slug?: string;
      actionLabel: string;
      onClick?: () => void;
    }> = [];

    for (const s of nonOptimal.slice(0, 2)) {
      const slug =
        s.slug ||
        String(s.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const comp = s.timeComplexity || s.time_complexity || s.lang || "REVIEW";
      rows.push({
        label: String(s.title || slug).toUpperCase().slice(0, 18),
        detail: `${String(s.classification).toUpperCase()} (${comp})`,
        slug,
        actionLabel: "OPTIMIZE ↗",
      });
    }

    if (!leetcodeUsername) {
      rows.push({
        label: "LEETCODE SYNC",
        detail: "0 LINKED • NOT CONNECTED",
        actionLabel: "CONNECT ↗",
        onClick: () => {
          setEditingLc(true);
          scrollToSection(lcSectionRef);
        },
      });
    } else {
      rows.push({
        label: `LC @${String(leetcodeUsername).toUpperCase().slice(0, 12)}`,
        detail: `${leetcodeStats?.totalSolved ?? 0} SOLVED • #${
          leetcodeStats?.ranking ? Number(leetcodeStats.ranking).toLocaleString() : "N/A"
        }`,
        actionLabel: "SYNC ↗",
        onClick: () => handleConnectOrSync(leetcodeUsername),
      });
    }

    if (!profile?.githubConnected) {
      rows.push({
        label: "GITHUB REPO",
        detail: "AUTO-PUSH: OFFLINE",
        actionLabel: "CONNECT ↗",
        onClick: handleConnectGithub,
      });
    } else {
      rows.push({
        label: `GH @${String(profile?.githubUsername || "LINKED").toUpperCase().slice(0, 12)}`,
        detail: "REPO PUSH: ACTIVE",
        actionLabel: "PUSH ↗",
        onClick: () => void handlePushLatestToGithub(),
      });
    }

    rows.push({
      label: "BYOK KEY VAULT",
      detail:
        vaultActiveCount > 0
          ? `${vaultActiveCount} KEY${vaultActiveCount > 1 ? "S" : ""} • ${String(
              vaultActiveProvider || "ACTIVE"
            ).toUpperCase()}`
          : "0 PERSONAL KEYS STORED",
      actionLabel: "VAULT ↗",
      onClick: () => scrollToSection(vaultSectionRef),
    });

    rows.push({
      label: "AI DIAGNOSTICS",
      detail:
        aiReports.length > 0
          ? `${aiReports.length} SAVED${
              latestReportScore !== null ? ` • SCORE ${latestReportScore}%` : ""
            }`
          : "0 REPORTS GENERATED",
      actionLabel: "REPORT ↗",
      onClick: () => scrollToSection(diagnosticsSectionRef),
    });

    const pendingActionsCount =
      nonOptimal.length +
      (!leetcodeUsername ? 1 : 0) +
      (!profile?.githubConnected ? 1 : 0) +
      (vaultActiveCount === 0 ? 1 : 0) +
      (aiReports.length === 0 ? 1 : 0);

    return {
      rows: rows.slice(0, 5),
      totalSuboptimal: nonOptimal.length,
      pendingActionsCount,
    };
  }, [
    filteredSubmissions,
    leetcodeUsername,
    leetcodeStats?.totalSolved,
    leetcodeStats?.ranking,
    profile?.githubConnected,
    profile?.githubUsername,
    vaultActiveCount,
    vaultActiveProvider,
    aiReports.length,
    latestReportScore,
  ]);

  // Weekly Velocity Graph Data (Card 4: "SOLVING VELOCITY") — 100% Real Aggregated Counts per Day (MO..SU)
  const velocityGraph = useMemo(() => {
    const calendar = leetcodeStats?.submissionCalendar || {};
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]; // MO..SU starts strictly at 0

    // 1. Count Firebase DSA.viz submissions per weekday
    for (const sub of filteredSubmissions) {
      const ts = sub.createdAt || sub.created_at || sub.timestamp;
      if (ts) {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          const dayIdx = (d.getDay() + 6) % 7; // Monday = 0 .. Sunday = 6
          dayTotals[dayIdx]! += 1;
        }
      }
    }

    // 2. Count LeetCode submissionCalendar entries within activeTimeRange
    const calEntries = Object.entries(calendar);
    for (const [unixSecStr, rawCount] of calEntries) {
      const count = Number(rawCount) || 0;
      const tsMs = Number(unixSecStr) * 1000;
      if (count <= 0 || isNaN(tsMs)) continue;
      if (rangeCutoffMs > 0 && tsMs < rangeCutoffMs) continue;
      const d = new Date(tsMs);
      if (!isNaN(d.getTime())) {
        const dayIdx = (d.getDay() + 6) % 7;
        dayTotals[dayIdx]! += count;
      }
    }

    const totalRuns = dayTotals.reduce((acc, v) => acc + v, 0);
    const avgPerDay = (totalRuns / 7).toFixed(1);
    const maxDayVal = Math.max(4, ...dayTotals);
    const yAxisTicks = [
      maxDayVal,
      Math.round(maxDayVal * 0.75),
      Math.round(maxDayVal * 0.5),
      Math.round(maxDayVal * 0.25),
      0,
    ];

    // Map each day's real count to 0..8 stacked dots (3 sub-columns per day for the dot-plot aesthetic)
    const MAX_DOTS = 8;
    const days = DAY_LABELS.map((label, dIdx) => {
      const count = dayTotals[dIdx] || 0;
      const centerDots =
        count === 0 ? 0 : Math.max(1, Math.min(MAX_DOTS, Math.round((count / maxDayVal) * MAX_DOTS)));
      const sideDots = count <= 1 ? 0 : Math.max(1, centerDots - 1);
      return {
        label,
        count,
        subCols: [sideDots, centerDots, sideDots],
      };
    });

    return {
      dayTotals,
      totalRuns,
      avgPerDay,
      maxDayVal,
      yAxisTicks,
      days,
    };
  }, [leetcodeStats?.submissionCalendar, filteredSubmissions, rangeCutoffMs]);

  // 6x7 Density Matrix Grid (Card 6: "WEEKLY CADENCE / SUBMISSION DENSITY") — Zero Seeded Hash!
  const densityMatrix = useMemo(() => {
    // Initialize 6x7 matrix strictly with 0
    const counts: number[][] = Array.from({ length: ROW_BAND_LABELS.length }, () =>
      Array.from({ length: DAY_LABELS.length }, () => 0)
    );

    // 1. Bucket Firebase DSA.viz submissions by exact local hour & weekday
    for (const sub of filteredSubmissions) {
      const ts = sub.createdAt || sub.created_at || sub.timestamp;
      if (!ts) continue;
      const d = new Date(ts);
      if (isNaN(d.getTime())) continue;
      const dayIdx = (d.getDay() + 6) % 7;
      const bandIdx = hourToBandIndex(d.getHours());
      counts[bandIdx]![dayIdx]! += 1;
    }

    // 2. Bucket LeetCode recentSubmissions by exact timestamp hour & weekday
    const recentDayCounts = new Map<string, number>();
    for (const lcSub of filteredLcRecent) {
      const rawTs = Number(lcSub.timestamp || 0);
      if (!rawTs) continue;
      const d = new Date(rawTs < 1e12 ? rawTs * 1000 : rawTs);
      if (isNaN(d.getTime())) continue;
      const dayIdx = (d.getDay() + 6) % 7;
      const bandIdx = hourToBandIndex(d.getHours());
      counts[bandIdx]![dayIdx]! += 1;
      const dateKey = d.toISOString().slice(0, 10);
      recentDayCounts.set(dateKey, (recentDayCounts.get(dateKey) || 0) + 1);
    }

    // 3. Bucket remaining LeetCode submissionCalendar daily totals (dates not already covered by recentSubmissions)
    const calendar = leetcodeStats?.submissionCalendar || {};
    for (const [unixSecStr, rawCount] of Object.entries(calendar)) {
      const count = Number(rawCount) || 0;
      const tsMs = Number(unixSecStr) * 1000;
      if (count <= 0 || isNaN(tsMs)) continue;
      if (rangeCutoffMs > 0 && tsMs < rangeCutoffMs) continue;
      const d = new Date(tsMs);
      if (isNaN(d.getTime())) continue;
      const dateKey = d.toISOString().slice(0, 10);
      const alreadyCounted = recentDayCounts.get(dateKey) || 0;
      const remaining = Math.max(0, count - alreadyCounted);
      if (remaining <= 0) continue;

      const dayIdx = (d.getDay() + 6) % 7;
      // Distribute remaining daily count across the time bands for that weekday
      for (let i = 0; i < remaining; i++) {
        const bandIdx = (dayIdx + i) % ROW_BAND_LABELS.length;
        counts[bandIdx]![dayIdx]! += 1;
      }
    }

    let maxCellCount = 0;
    let totalMappedRuns = 0;
    for (const row of counts) {
      for (const c of row) {
        totalMappedRuns += c;
        if (c > maxCellCount) maxCellCount = c;
      }
    }

    const rows = ROW_BAND_LABELS.map((rowLabel, rIdx) => {
      const cells = DAY_LABELS.map((dayLabel, cIdx) => {
        const count = counts[rIdx]![cIdx] || 0;
        let level: 0 | 1 | 2 | 3 = 0;
        if (count > 0) {
          if (maxCellCount <= 3) {
            level = count >= 3 ? 3 : count === 2 ? 2 : 1;
          } else {
            const ratio = count / maxCellCount;
            level = ratio >= 0.75 ? 3 : ratio >= 0.4 ? 2 : 1;
          }
        }
        return { dayLabel, count, level };
      });
      return { rowLabel, cells };
    });

    return {
      rows,
      maxCellCount,
      totalMappedRuns,
    };
  }, [filteredSubmissions, filteredLcRecent, leetcodeStats?.submissionCalendar, rangeCutoffMs]);

  // Mastery Breakdown Dynamic Bar Proportions (Card 7: "MASTERY BREAKDOWN")
  const masteryBreakdown = useMemo(() => {
    const maxDiff = Math.max(1, combinedHard, combinedMedium, combinedEasy);
    const total = Math.max(1, combinedHard + combinedMedium + combinedEasy);

    const calcWidthPct = (val: number) =>
      val === 0 ? 44 : Math.max(48, Math.min(100, Math.round((val / maxDiff) * 100)));

    const dominantDiff =
      combinedHard >= combinedMedium && combinedHard >= combinedEasy && combinedHard > 0
        ? "HARD"
        : combinedEasy > combinedMedium && combinedEasy >= combinedHard && combinedEasy > 0
        ? "EASY"
        : "MEDIUM";

    return {
      dominantDiff,
      hard: {
        count: combinedHard,
        viz: vizHard,
        lc: lcHard,
        pct: combinedTotalSolved > 0 ? Math.round((combinedHard / total) * 100) : 0,
        widthPct: calcWidthPct(combinedHard),
      },
      medium: {
        count: combinedMedium,
        viz: vizMedium,
        lc: lcMedium,
        pct: combinedTotalSolved > 0 ? Math.round((combinedMedium / total) * 100) : 0,
        widthPct: calcWidthPct(combinedMedium),
      },
      easy: {
        count: combinedEasy,
        viz: vizEasy,
        lc: lcEasy,
        pct: combinedTotalSolved > 0 ? Math.round((combinedEasy / total) * 100) : 0,
        widthPct: calcWidthPct(combinedEasy),
      },
    };
  }, [
    combinedHard,
    combinedMedium,
    combinedEasy,
    vizHard,
    lcHard,
    vizMedium,
    lcMedium,
    vizEasy,
    lcEasy,
    combinedTotalSolved,
  ]);

  const optimalRatePct =
    data && data.solved > 0 ? Math.round((data.optimal / data.solved) * 100) : 0;

  // Delete Saved Submission Mutation (Firebase Firestore + Server API + Redis Snapshot Retention)
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const currentToken = currentUser ? await currentUser.getIdToken().catch(() => token) : token;

      if (currentUser) {
        try {
          await deleteUserSubmission(currentUser.uid, submissionId);
        } catch (err) {
          console.warn("Client Firestore delete submission warning:", err);
        }
      }

      if (currentToken) {
        const res = await fetch(`/api/submissions/${encodeURIComponent(submissionId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          if (res.status !== 404) {
            throw new Error(d.error || "Failed to delete submission");
          }
        }
      }
      return submissionId;
    },
    onSuccess: (deletedId) => {
      if (openSubmissionId === deletedId) {
        setOpenSubmissionId(null);
      }
      updateRetainedSnapshot((prev) => {
        const nextSubs = Array.isArray(prev.submissions)
          ? prev.submissions.filter((s: any) => String(s?.id) !== String(deletedId))
          : [];
        const completeRows = nextSubs.filter(
          (r: any) => r.classification && r.classification !== "Incomplete"
        );
        const solved = new Set(completeRows.map((r: any) => r.slug)).size;
        const optimal = new Set(
          completeRows.filter((r: any) => r.classification === "Optimal").map((r: any) => r.slug)
        ).size;
        const easy = new Set(
          completeRows
            .filter((r: any) => String(r.difficulty).toLowerCase() === "easy")
            .map((r: any) => r.slug)
        ).size;
        const medium = new Set(
          completeRows
            .filter((r: any) => String(r.difficulty).toLowerCase() === "medium")
            .map((r: any) => r.slug)
        ).size;
        const hard = new Set(
          completeRows
            .filter((r: any) => String(r.difficulty).toLowerCase() === "hard")
            .map((r: any) => r.slug)
        ).size;
        return {
          ...prev,
          submissions: nextSubs,
          attempts: nextSubs.length,
          solved,
          optimal,
          easy,
          medium,
          hard,
        };
      });
      toast.success("Submission deleted from Firebase & Redis retention cache.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete submission.");
    },
  });

  // Unified Dashboard Telemetry: Topic Radar, 90-Day Consistency Strip, Longest Streak & Merged 52-Week Calendar
  const dashboardTelemetry = useMemo(() => {
    const allSubs = Array.isArray(data?.submissions) ? data.submissions : [];
    const lcCal = leetcodeStats?.submissionCalendar || {};

    // 1. Merge LeetCode submissionCalendar with Firebase DSA.viz submission timestamps
    const mergedCalendar: Record<string, number> = { ...lcCal };
    const dailyCountsByIso = new Map<string, number>();

    for (const [tsStr, rawCount] of Object.entries(lcCal)) {
      const count = Number(rawCount) || 0;
      const tsSec = Number(tsStr);
      if (count > 0 && !isNaN(tsSec)) {
        const d = new Date(tsSec * 1000);
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString().slice(0, 10);
          dailyCountsByIso.set(iso, (dailyCountsByIso.get(iso) || 0) + count);
        }
      }
    }

    for (const s of allSubs) {
      const rawDate = s.createdAt || s.created_at || s.timestamp;
      if (!rawDate) continue;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) continue;
      const iso = d.toISOString().slice(0, 10);
      dailyCountsByIso.set(iso, (dailyCountsByIso.get(iso) || 0) + 1);

      const utcMidnightSec = Math.floor(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000
      ).toString();
      mergedCalendar[utcMidnightSec] = (mergedCalendar[utcMidnightSec] || 0) + 1;
    }

    // 2. Compute Current Streak, Longest Streak & Total Active Days from unified daily map
    const activeDatesSorted = Array.from(dailyCountsByIso.entries())
      .filter(([, c]) => c > 0)
      .map(([iso]) => iso)
      .sort();

    let longestStreak = Number(leetcodeStats?.streak || 0);
    let tempStreak = 0;
    let prevDateMs: number | null = null;

    for (const iso of activeDatesSorted) {
      const currMs = new Date(`${iso}T00:00:00Z`).getTime();
      if (prevDateMs === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((currMs - prevDateMs) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak += 1;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDateMs = currMs;
    }

    const currentStreak = Math.max(computedStreakDays, Number(leetcodeStats?.streak || 0));
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    const totalActiveDays = Math.max(
      activeDatesSorted.length,
      Number(leetcodeStats?.totalActiveDays || 0)
    );

    // 3. Build 90-Day Daily Activity Strip (oldest -> today)
    const ninetyDayStrip: Array<{
      dateKey: string;
      label: string;
      count: number;
    }> = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      ninetyDayStrip.push({
        dateKey: iso,
        label,
        count: dailyCountsByIso.get(iso) || 0,
      });
    }

    // 4. Compute Topic Proficiency from real Firebase submissions + LeetCode recentSubmissions
    const topicCounts = new Map<string, number>();
    const countedProblemTopicPairs = new Set<string>();

    for (const s of filteredSubmissions) {
      const slug =
        s.slug ||
        String(s.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const prob = slug ? problemBySlug(slug) : undefined;
      const topics = prob?.topics || (Array.isArray(s.topics) ? s.topics : []);
      for (const t of topics) {
        const key = `${slug}::${t}`;
        if (!countedProblemTopicPairs.has(key)) {
          countedProblemTopicPairs.add(key);
          topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
        }
      }
    }

    for (const lc of filteredLcRecent) {
      if (lc.statusDisplay && lc.statusDisplay !== "Accepted") continue;
      const slug =
        lc.titleSlug ||
        String(lc.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const prob = slug ? problemBySlug(slug) : undefined;
      if (prob?.topics) {
        for (const t of prob.topics) {
          const key = `${slug}::${t}`;
          if (!countedProblemTopicPairs.has(key)) {
            countedProblemTopicPairs.add(key);
            topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
          }
        }
      }
    }

    const sortedTopics = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    const defaultAxes = [
      "Arrays",
      "Two Pointers",
      "Trees",
      "Graphs",
      "DP",
      "Sliding Window",
    ];
    const maxTopicCount = Math.max(3, ...sortedTopics.map((t) => t.count));

    const radarAxes =
      sortedTopics.length >= 4
        ? sortedTopics.slice(0, 6)
        : defaultAxes.map((axis) => {
            const match = sortedTopics.find(
              (t) => t.topic.toLowerCase() === axis.toLowerCase()
            );
            return { topic: axis, count: match ? match.count : 0 };
          });

    // If user has 1-3 topics that aren't in defaultAxes, ensure they appear in radarAxes
    if (sortedTopics.length > 0 && sortedTopics.length < 4) {
      for (let i = 0; i < sortedTopics.length; i++) {
        const st = sortedTopics[i]!;
        if (!radarAxes.some((r) => r.topic.toLowerCase() === st.topic.toLowerCase())) {
          radarAxes[i] = st;
        }
      }
    }

    const radarData = radarAxes.map((item) => ({
      topic: item.topic.length > 14 ? `${item.topic.slice(0, 12)}…` : item.topic,
      fullTopic: item.topic,
      count: item.count,
      fullMark: maxTopicCount,
    }));

    return {
      mergedCalendar,
      currentStreak,
      longestStreak,
      totalActiveDays,
      ninetyDayStrip,
      radarData,
      topicList: sortedTopics.slice(0, 6),
      uniqueTopicsCount: sortedTopics.length,
      maxTopicCount,
      topTopic: sortedTopics[0] || null,
    };
  }, [
    data?.submissions,
    leetcodeStats?.submissionCalendar,
    leetcodeStats?.streak,
    leetcodeStats?.totalActiveDays,
    computedStreakDays,
    filteredSubmissions,
    filteredLcRecent,
  ]);

  // Filtered Saved Submissions for the Attempt History Explorer (from Dashboard)
  const explorerSubmissions = useMemo(() => {
    const q = submissionSearchQuery.trim().toLowerCase();
    return filteredSubmissions.filter((s: any) => {
      const slug =
        s.slug ||
        String(s.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const prob = slug ? problemBySlug(slug) : undefined;
      const diff = s.difficulty || prob?.difficulty || "Medium";
      const cls = s.classification || "Incomplete";

      if (submissionClassFilter !== "ALL" && cls !== submissionClassFilter) {
        return false;
      }
      if (submissionDiffFilter !== "ALL" && diff !== submissionDiffFilter) {
        return false;
      }
      if (!q) return true;

      const titleMatch = String(s.title || prob?.title || slug)
        .toLowerCase()
        .includes(q);
      const compMatch = String(s.timeComplexity || s.time_complexity || "")
        .toLowerCase()
        .includes(q);
      const topicMatch = (prob?.topics || []).some((t) => t.toLowerCase().includes(q));
      return titleMatch || compMatch || topicMatch;
    });
  }, [
    filteredSubmissions,
    submissionSearchQuery,
    submissionClassFilter,
    submissionDiffFilter,
  ]);

  const catalogTotals = useMemo(() => {
    const vizTotal = problems.length;
    const vizEasyTotal = problems.filter((p) => p.difficulty === "Easy").length;
    const vizMedTotal = problems.filter((p) => p.difficulty === "Medium").length;
    const vizHardTotal = problems.filter((p) => p.difficulty === "Hard").length;
    return {
      vizTotal,
      vizEasyTotal,
      vizMedTotal,
      vizHardTotal,
      lcTotalQuestions: Number(leetcodeStats?.totalQuestions || 3300),
      lcTotalEasy: Number(leetcodeStats?.totalEasy || 800),
      lcTotalMedium: Number(leetcodeStats?.totalMedium || 1700),
      lcTotalHard: Number(leetcodeStats?.totalHard || 800),
    };
  }, [
    leetcodeStats?.totalQuestions,
    leetcodeStats?.totalEasy,
    leetcodeStats?.totalMedium,
    leetcodeStats?.totalHard,
  ]);

  return (
    <div className="min-h-screen pb-24 bg-background text-foreground">
      <SiteHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Top Sub-Navigation Breadcrumb & Quick Section Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-foreground/20 pb-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/problems"
              className="group inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
              <span>PROBLEM EXPLORER</span>
            </Link>

            <button
              type="button"
              onClick={handleManualFirebaseSync}
              disabled={isSyncingFirebase}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              title={
                lastFirebaseSyncAt
                  ? `Data retained in Redis cache (Last Firebase sync: ${new Date(
                      lastFirebaseSyncAt
                    ).toLocaleTimeString()}). Click to force a live two-way resync from Firebase Firestore.`
                  : "Data retained in Redis cache. Click to force a live two-way resync from Firebase Firestore."
              }
            >
              <RefreshCw className={`size-3 ${isSyncingFirebase ? "animate-spin" : ""}`} />
              <span>
                {isSyncingFirebase
                  ? "RESYNCING FIREBASE…"
                  : `REDIS RETAINED • RESYNC FIREBASE${
                      lastFirebaseSyncAt ? ` (${formatShortRelativeTime(lastFirebaseSyncAt)})` : ""
                    }`}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="rounded-md bg-[#23351f] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer"
            >
              OVERVIEW
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(analyticsSectionRef)}
              className="rounded-md bg-[#dfe7c9]/80 text-[#23351f] dark:bg-muted dark:text-foreground hover:opacity-90 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-opacity"
            >
              ANALYTICS &amp; RADAR
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(submissionsSectionRef)}
              className="rounded-md bg-[#dfe7c9]/80 text-[#23351f] dark:bg-muted dark:text-foreground hover:opacity-90 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-opacity"
            >
              SUBMISSIONS ({data?.attempts ?? 0})
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(lcSectionRef)}
              className="rounded-md bg-[#dfe7c9]/80 text-[#23351f] dark:bg-muted dark:text-foreground hover:opacity-90 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-opacity"
            >
              LEETCODE &amp; GITHUB
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(vaultSectionRef)}
              className="rounded-md bg-[#dfe7c9]/80 text-[#23351f] dark:bg-muted dark:text-foreground hover:opacity-90 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-opacity"
            >
              AI KEY VAULT
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(diagnosticsSectionRef)}
              className="rounded-md bg-[#dfe7c9]/80 text-[#23351f] dark:bg-muted dark:text-foreground hover:opacity-90 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-opacity"
            >
              REPORTS
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(privacySectionRef)}
              className="rounded-md bg-[#dfe7c9]/80 text-[#23351f] dark:bg-muted dark:text-foreground hover:opacity-90 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-opacity"
            >
              ACCOUNT
            </button>
          </div>
        </div>

        {!user || !data ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/50 p-8 text-center backdrop-blur-sm">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30 text-primary">
              <Sparkles className="size-7" />
            </div>
            <div className="max-w-md">
              <h2 className="text-xl font-black text-foreground">Sign In to View Your Profile</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Connect your LeetCode and GitHub accounts, view personal telemetry stats, review AI feedback, and manage your DSA visualizer portfolio.
              </p>
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-mono text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
            >
              Sign In with Google
            </Link>
          </div>
        ) : (
          <div className="space-y-6 animate-rise">
            {/* ================================================================== */}
            {/* HERO TITLE & TOP TELEMETRY PILLS                                   */}
            {/* ================================================================== */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-normal tracking-tight text-foreground">
                  Profile &amp; Telemetry Hub
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Hello, <strong className="text-foreground">@{currentHandle}</strong>! You have{" "}
                    <strong className="text-foreground">{combinedTotalSolved}</strong> total solved (
                    <strong className="text-foreground">{data.solved}</strong> DSA.viz +{" "}
                    <strong className="text-foreground">{leetcodeStats?.totalSolved || 0}</strong>{" "}
                    LeetCode), <strong className="text-foreground">{data.optimal}</strong> optimal
                    verdicts, and a{" "}
                    <strong className="text-foreground">{dashboardTelemetry.currentStreak}-day</strong>{" "}
                    active streak.
                  </span>
                  {!editingUsername ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUsernameInput(currentHandle);
                        setEditingUsername(true);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-foreground/20 bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-foreground hover:border-primary cursor-pointer"
                    >
                      <Edit2 className="size-2.5" />
                      <span>EDIT HANDLE</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Input
                        value={usernameInput}
                        onChange={(e) =>
                          setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, ""))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveUsername();
                          if (e.key === "Escape") setEditingUsername(false);
                        }}
                        className="h-7 w-36 font-mono text-xs"
                        placeholder="new_handle"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveUsername}
                        disabled={updateProfileUsernameMutation.isPending}
                        className="h-7 px-2.5 font-mono text-[10px]"
                      >
                        <Check className="size-3 mr-1" />
                        SAVE
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingUsername(false)}
                        className="h-7 px-2 font-mono text-[10px]"
                      >
                        CANCEL
                      </Button>
                    </span>
                  )}
                </div>
              </div>

              {/* Right Status Pills + Range Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center overflow-hidden rounded-md border border-foreground/15">
                  <span className="bg-[#23351f] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground px-2.5 py-1 font-mono text-xs font-bold">
                    {combinedTotalSolved}
                  </span>
                  <span className="bg-[#dfe7c9]/90 text-[#23351f] dark:bg-card dark:text-foreground px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider">
                    PROBLEMS SOLVED
                  </span>
                </div>

                <div className="inline-flex items-center overflow-hidden rounded-md border border-foreground/15">
                  <span className="bg-[#23351f] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground px-2.5 py-1 font-mono text-xs font-bold">
                    {filteredSubmissions.length}
                  </span>
                  <span className="bg-[#dfe7c9]/90 text-[#23351f] dark:bg-card dark:text-foreground px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider">
                    SAVED ATTEMPTS
                  </span>
                </div>

                <div className="inline-flex items-center overflow-hidden rounded-md border border-foreground/15">
                  <span className="bg-[#23351f] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground px-2.5 py-1 font-mono text-xs font-bold">
                    {dashboardTelemetry.uniqueTopicsCount}
                  </span>
                  <span className="bg-[#dfe7c9]/90 text-[#23351f] dark:bg-card dark:text-foreground px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider">
                    TOPICS
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTimeRange((prev) =>
                      prev === "ALL TIME"
                        ? "30 DAYS"
                        : prev === "30 DAYS"
                        ? "THIS WEEK"
                        : "ALL TIME"
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-[#23351f] text-[#edf3e8] dark:bg-secondary dark:text-foreground px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                  title="Filter graphs and telemetry by time window"
                >
                  <span>{activeTimeRange}</span>
                  <ChevronDown className="size-3" />
                </button>
              </div>
            </div>

            {/* ================================================================== */}
            {/* ROW 1: EXECUTIVE OVERVIEW BENTO GRID (4 CARDS — 3+3+3+3 COLS)      */}
            {/* ================================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* CARD 1 (Col 3): QUICK ACCESS & CONSISTENCY STREAKS (Dark Forest Card) */}
              <div className="md:col-span-3 flex flex-col justify-between rounded-2xl bg-[#21341d] text-[#edf3e8] dark:bg-[#192817] p-4 min-h-[265px] shadow-xs">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-[#d9e5d1]">
                    <span>CONSISTENCY &amp; ACCESS</span>
                    <span className="text-[9px] opacity-75">UID: {user.uid.slice(0, 6)}…</span>
                  </div>
                  <div className="mt-2 border-t border-[#edf3e8]/30" />

                  {/* 3-Column Real Streak & Consistency Counters (from Dashboard) */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <div className="rounded-lg bg-[#edf3e8]/10 border border-[#edf3e8]/15 p-2 text-center">
                      <div className="text-xl font-bold leading-none text-white">
                        {dashboardTelemetry.currentStreak}d
                      </div>
                      <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-[#d9e5d1]/80">
                        CURRENT
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#edf3e8]/10 border border-[#edf3e8]/15 p-2 text-center">
                      <div className="text-xl font-bold leading-none text-white">
                        {dashboardTelemetry.longestStreak}d
                      </div>
                      <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-[#d9e5d1]/80">
                        BEST STREAK
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#edf3e8]/10 border border-[#edf3e8]/15 p-2 text-center">
                      <div className="text-xl font-bold leading-none text-white">
                        {dashboardTelemetry.totalActiveDays}
                      </div>
                      <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-[#d9e5d1]/80">
                        ACTIVE DAYS
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 font-mono text-[11px] font-medium tracking-wide">
                  <Link
                    to="/problems"
                    className="flex items-center justify-between text-[#edf3e8]/90 hover:text-white hover:translate-x-0.5 transition-all"
                  >
                    <span>[+] SOLVE NEW PROBLEM</span>
                    <span className="text-[9px] opacity-75">{catalogTotals.vizTotal} TOTAL</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollToSection(submissionsSectionRef)}
                    className="flex w-full items-center justify-between text-left text-[#edf3e8]/90 hover:text-white hover:translate-x-0.5 transition-all cursor-pointer"
                  >
                    <span>[↗] SAVED ATTEMPTS</span>
                    <span className="text-[9px] opacity-75">{data.attempts} SAVED</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(analyticsSectionRef)}
                    className="flex w-full items-center justify-between text-left text-[#edf3e8]/90 hover:text-white hover:translate-x-0.5 transition-all cursor-pointer"
                  >
                    <span>[↗] TOPIC RADAR &amp; CADENCE</span>
                    <span className="text-[9px] opacity-75">
                      {dashboardTelemetry.uniqueTopicsCount} TOPICS
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(diagnosticsSectionRef)}
                    className="flex w-full items-center justify-between text-left text-[#edf3e8]/90 hover:text-white hover:translate-x-0.5 transition-all cursor-pointer"
                  >
                    <span>[↗] AI DIAGNOSTICS</span>
                    <span className="text-[9px] opacity-75">{aiReports.length} REPORTS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(vaultSectionRef)}
                    className="flex w-full items-center justify-between text-left text-[#edf3e8]/90 hover:text-white hover:translate-x-0.5 transition-all cursor-pointer"
                  >
                    <span>[↗] BYOK KEY VAULT</span>
                    <span className="text-[9px] opacity-75">{vaultActiveCount} KEYS</span>
                  </button>
                </div>
              </div>

              {/* CARD 2 (Col 3): RECENT SUBMISSIONS (Dotted Border + Actual Counter + Real Firebase/LC List) */}
              <div className="md:col-span-3 flex flex-col justify-between rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-4 min-h-[265px]">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                    <span>RECENT SUBMISSIONS</span>
                    <span className="text-[9px] text-muted-foreground">{activeTimeRange}</span>
                  </div>
                  <div className="mt-2 border-t border-foreground/30" />
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {filteredSubmissions.length} VIZ • {filteredLcRecent.length} LC
                    </span>
                    <span className="text-5xl font-normal tracking-tight text-foreground">
                      {recentSubmissionData.totalCount}
                    </span>
                  </div>
                </div>

                {recentSubmissionData.items.length > 0 ? (
                  <div className="mt-3 divide-y divide-foreground/25 border-b border-foreground/25 font-mono text-[11px]">
                    {recentSubmissionData.items.map((item, idx) => (
                      <div
                        key={`${item.slug}-${idx}`}
                        className="flex items-center justify-between py-1.5 gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-foreground">{item.title}</div>
                          <div className="truncate text-[9px] text-muted-foreground">
                            {item.badge}
                            {item.timeLabel ? ` • ${item.timeLabel}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenSubmissionId(item.id!);
                                scrollToSection(submissionsSectionRef);
                              }}
                              className="font-bold text-primary hover:underline cursor-pointer text-[10px]"
                              title="Inspect AI review & visualizer replay below"
                            >
                              [REPLAY]
                            </button>
                          )}
                          <Link
                            to="/problem/$slug"
                            params={{ slug: item.slug }}
                            className="font-bold text-muted-foreground hover:text-foreground text-[10px]"
                          >
                            [SOLVE ↗]
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-foreground/20 bg-background/50 p-3 text-center font-mono text-[10px] text-muted-foreground">
                    <span>0 submissions recorded in {activeTimeRange}.</span>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                      <Link
                        to="/problems"
                        className="font-bold text-foreground underline hover:text-primary"
                      >
                        [+ SOLVE PROBLEM ↗]
                      </Link>
                      {!leetcodeUsername && (
                        <button
                          type="button"
                          onClick={() => scrollToSection(lcSectionRef)}
                          className="font-bold text-foreground underline hover:text-primary cursor-pointer"
                        >
                          [LINK LEETCODE ↗]
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3 (Col 3): FOCUS & INTEGRATION QUEUE (Real Firebase Suboptimal Attempts + Live Sync States) */}
              <div className="md:col-span-3 flex flex-col justify-between rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-4 min-h-[265px]">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                    <span>FOCUS &amp; SYNC QUEUE</span>
                    <span className="text-[9px] text-muted-foreground">
                      {optimizationQueueData.totalSuboptimal} SUBOPTIMAL
                    </span>
                  </div>
                  <div className="mt-2 border-t border-foreground/30" />
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {optimizationQueueData.pendingActionsCount} ACTION ITEMS
                    </span>
                    <span className="text-5xl font-normal tracking-tight text-foreground">
                      {optimizationQueueData.rows.length}
                    </span>
                  </div>
                </div>

                <div className="mt-3 divide-y divide-foreground/25 border-b border-foreground/25 font-mono text-[11px]">
                  {optimizationQueueData.rows.map((row, idx) => (
                    <div
                      key={`${row.label}-${idx}`}
                      className="flex items-center justify-between py-1.5 gap-1.5"
                    >
                      <div className="truncate text-foreground">
                        <span className="font-semibold">{row.label}</span>
                        <span className="mx-1.5 text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{row.detail}</span>
                      </div>
                      {row.slug ? (
                        <Link
                          to="/problem/$slug"
                          params={{ slug: row.slug }}
                          className="shrink-0 font-bold text-foreground hover:underline text-[10px]"
                        >
                          [{row.actionLabel}]
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={row.onClick}
                          className="shrink-0 font-bold text-foreground hover:underline cursor-pointer text-[10px]"
                        >
                          [{row.actionLabel}]
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD 4 (Col 3): SOLVING VELOCITY (Tinted Sage Card + Dot Matrix Histogram with Actual Values) */}
              <div className="md:col-span-3 flex flex-col justify-between rounded-2xl border-[1.5px] border-dashed border-foreground/35 bg-[#dce6c1]/90 text-[#1d2d19] dark:bg-primary/15 dark:text-foreground p-4 min-h-[265px]">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
                    <span>SOLVING VELOCITY</span>
                    <span>
                      {velocityGraph.totalRuns} RUNS • {velocityGraph.avgPerDay}/D
                    </span>
                  </div>
                  <div className="mt-2 border-t border-current/30" />
                </div>

                {/* Dot-Matrix Stacked Circle Chart with Real Y-Axis & Per-Day Values */}
                <div className="mt-3 flex items-end gap-2 pt-1">
                  {/* Dynamic Y-Axis Labels from Real Max Daily Count */}
                  <div className="flex flex-col justify-between h-32 pr-1 font-mono text-[9px] opacity-80 select-none text-right">
                    {velocityGraph.yAxisTicks.map((tick, idx) => (
                      <span key={idx}>{tick}</span>
                    ))}
                  </div>

                  {/* 7 Weekday Columns (each with actual value badge + 3 dot sub-columns) */}
                  <div className="flex-1 flex flex-col">
                    <div className="grid grid-cols-7 items-end gap-1 h-32 border-l border-b border-current/40 pl-1.5 pb-1">
                      {velocityGraph.days.map((dayObj) => (
                        <div
                          key={dayObj.label}
                          className="flex flex-col items-center justify-end h-full"
                          title={`${dayObj.label}: ${dayObj.count} submissions (${activeTimeRange})`}
                        >
                          {/* Actual numeric value above each day's bar */}
                          <span className="mb-1 font-mono text-[9px] font-bold leading-none opacity-90">
                            {dayObj.count}
                          </span>
                          <div className="flex items-end justify-center gap-[2px] w-full">
                            {dayObj.subCols.map((dotCount, subIdx) => (
                              <div
                                key={subIdx}
                                className="flex flex-col-reverse items-center gap-[2px]"
                              >
                                {Array.from({ length: dotCount }).map((_, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className="size-2 rounded-full border border-current bg-background/85 dark:bg-primary/50"
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 pt-1 pl-1.5 font-mono text-[9px] font-bold uppercase opacity-85 text-center">
                      {velocityGraph.days.map((d) => (
                        <span key={d.label}>{d.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================== */}
            {/* ROW 2: DEEP ANALYTICS & GRAPHS BENTO GRID (4+4+4 COLS)             */}
            {/* (Topic Proficiency Radar + Weekly Cadence/90d Strip + Mastery)     */}
            {/* ================================================================== */}
            <div ref={analyticsSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* CARD 5 (Col 4): TOPIC PROFICIENCY RADAR CHART & BREAKDOWN (From Dashboard Analytics) */}
              <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-4">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                    <span>TOPIC PROFICIENCY RADAR</span>
                    <span>{dashboardTelemetry.uniqueTopicsCount} TOPICS</span>
                  </div>
                  <div className="mt-2 border-t border-foreground/30" />
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                    <span>
                      TOP:{" "}
                      <strong className="text-foreground uppercase">
                        {dashboardTelemetry.topTopic
                          ? `${dashboardTelemetry.topTopic.topic} (${dashboardTelemetry.topTopic.count})`
                          : "NONE YET"}
                      </strong>
                    </span>
                    <span>MAX AXIS: {dashboardTelemetry.maxTopicCount}</span>
                  </div>
                </div>

                {/* Recharts RadarChart with Real Solved Topic Counts */}
                <div className="my-2 h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="72%"
                      data={dashboardTelemetry.radarData}
                    >
                      <PolarGrid stroke="currentColor" className="text-foreground/20" />
                      <PolarAngleAxis
                        dataKey="topic"
                        tick={{
                          fill: "currentColor",
                          fontSize: 10,
                          fontFamily: "monospace",
                          fontWeight: 600,
                        }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, dashboardTelemetry.maxTopicCount]}
                        tick={{ fill: "currentColor", fontSize: 9, fontFamily: "monospace" }}
                        tickCount={4}
                      />
                      <Radar
                        name="Problems Solved"
                        dataKey="count"
                        stroke="#23351f"
                        fill="#535c3b"
                        fillOpacity={0.45}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontFamily: "monospace",
                          fontSize: "11px",
                        }}
                        formatter={(value: any, _name: any, props: any) => [
                          `${value} problem${Number(value) === 1 ? "" : "s"}`,
                          props?.payload?.fullTopic || "Topic",
                        ]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ruled Topic Count Breakdown Table */}
                {dashboardTelemetry.topicList.length > 0 ? (
                  <div className="divide-y divide-foreground/20 border-t border-foreground/25 pt-1 font-mono text-[10px]">
                    {dashboardTelemetry.topicList.slice(0, 4).map((t) => {
                      const pct = Math.max(
                        8,
                        Math.round((t.count / dashboardTelemetry.maxTopicCount) * 100)
                      );
                      return (
                        <div
                          key={t.topic}
                          className="flex items-center justify-between py-1.5 gap-2"
                        >
                          <span className="truncate font-semibold uppercase text-foreground">
                            {t.topic}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-20 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                              <div
                                className="h-full bg-[#23351f] dark:bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-bold text-foreground w-6 text-right">
                              {t.count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border-t border-foreground/20 pt-2 text-center font-mono text-[10px] text-muted-foreground">
                    Solve problems in the visualizer or sync LeetCode to populate topic radar axes.
                  </div>
                )}
              </div>

              {/* CARD 6 (Col 4): WEEKLY CADENCE MATRIX + 90-DAY CONSISTENCY STRIP */}
              <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-4">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                    <span>WEEKLY CADENCE</span>
                    <span>{densityMatrix.totalMappedRuns} MAPPED RUNS</span>
                  </div>
                  <div className="mt-2 border-t border-foreground/30" />

                  {/* Legend Row */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] font-bold uppercase text-foreground/85">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-xs bg-background border border-border" />
                      <span>0</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-xs bg-[#c5cbb3] dark:bg-primary/25" />
                      <span>LOW (1)</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-xs bg-[#7b895b] dark:bg-primary/55" />
                      <span>MED (2+)</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-xs bg-[#535c3b] dark:bg-primary" />
                      <span>PEAK ({Math.max(3, densityMatrix.maxCellCount)})</span>
                    </span>
                  </div>
                </div>

                {/* 6x7 Rectangular Block Matrix with Actual Numeric Counts Rendered Inside Each Cell */}
                <div className="mt-2.5 space-y-1">
                  {densityMatrix.rows.map((row) => (
                    <div key={row.rowLabel} className="grid grid-cols-8 items-center gap-1">
                      <span className="font-mono text-[9px] font-semibold uppercase text-muted-foreground text-right pr-1">
                        {row.rowLabel}
                      </span>
                      {row.cells.map((cell, cIdx) => {
                        const cellClass =
                          cell.level === 3
                            ? "bg-[#535c3b] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground font-bold"
                            : cell.level === 2
                            ? "bg-[#7b895b] text-[#edf3e8] dark:bg-primary/60 dark:text-foreground font-bold"
                            : cell.level === 1
                            ? "bg-[#c5cbb3] text-[#1d2d19] dark:bg-primary/25 dark:text-foreground font-semibold"
                            : "bg-background/90 border border-border/50 text-muted-foreground/55";
                        return (
                          <div
                            key={cIdx}
                            className={`h-5 rounded-xs flex items-center justify-center font-mono text-[9px] transition-colors select-none ${cellClass}`}
                            title={`${cell.dayLabel} ${row.rowLabel}: ${cell.count} submission${
                              cell.count === 1 ? "" : "s"
                            }`}
                          >
                            {cell.count}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Bottom Day Labels */}
                  <div className="grid grid-cols-8 items-center gap-1 pt-0.5">
                    <span />
                    {DAY_LABELS.map((day, dIdx) => (
                      <span
                        key={day}
                        className="text-center font-mono text-[9px] font-bold uppercase text-muted-foreground"
                        title={`Total on ${day}: ${velocityGraph.dayTotals[dIdx] || 0}`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 90-Day Daily Consistency Strip (Integrated from Dashboard AnalyticsCharts) */}
                <div className="mt-3 border-t border-foreground/25 pt-2.5">
                  <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase text-muted-foreground mb-1.5">
                    <span>LAST 90 DAYS CONSISTENCY</span>
                    <span>
                      STREAK: {dashboardTelemetry.currentStreak}D • BEST:{" "}
                      {dashboardTelemetry.longestStreak}D
                    </span>
                  </div>
                  <div className="grid grid-cols-30 gap-[3px]">
                    {dashboardTelemetry.ninetyDayStrip.map((day) => {
                      const sqClass =
                        day.count >= 3
                          ? "bg-[#23351f] dark:bg-primary"
                          : day.count === 2
                          ? "bg-[#535c3b] dark:bg-primary/70"
                          : day.count === 1
                          ? "bg-[#7b895b] dark:bg-primary/40"
                          : "bg-background/80 border border-border/50";
                      return (
                        <div
                          key={day.dateKey}
                          className={`h-2.5 rounded-[2px] ${sqClass}`}
                          title={`${day.label} (${day.dateKey}): ${day.count} submission${
                            day.count === 1 ? "" : "s"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CARD 7 (Col 4): MASTERY BREAKDOWN & CONNECTED TELEMETRY TILES */}
              <div className="lg:col-span-4 flex flex-col justify-between rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                    <span>MASTERY BREAKDOWN</span>
                    <span>
                      {combinedTotalSolved} SOLVED • {optimalRatePct}% OPTIMAL
                    </span>
                  </div>
                  <div className="mt-2 border-t border-foreground/30" />
                </div>

                <div className="flex flex-col gap-2 justify-center">
                  {/* Block 1: HARD (Proportional Width to Real Solved Count) */}
                  <div
                    style={{ width: `${masteryBreakdown.hard.widthPct}%` }}
                    className={`min-w-[210px] rounded-md border p-2.5 flex items-center justify-between transition-all ${
                      masteryBreakdown.dominantDiff === "HARD"
                        ? "bg-[#dce6c1] text-[#1d2d19] dark:bg-primary/20 dark:text-foreground border-foreground/20"
                        : "bg-background/90 text-foreground border-border/60"
                    }`}
                  >
                    <span className="text-3xl font-normal tracking-tight">
                      {masteryBreakdown.hard.count}
                    </span>
                    <div className="text-right self-start">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider">
                        HARD ({masteryBreakdown.hard.pct}%)
                      </div>
                      <div className="font-mono text-[9px] opacity-75">
                        {masteryBreakdown.hard.viz} VIZ + {masteryBreakdown.hard.lc} LC
                      </div>
                    </div>
                  </div>

                  {/* Block 2: MEDIUM (Proportional Width to Real Solved Count) */}
                  <div
                    style={{ width: `${masteryBreakdown.medium.widthPct}%` }}
                    className={`min-w-[210px] rounded-md border p-2.5 flex items-center justify-between transition-all ${
                      masteryBreakdown.dominantDiff === "MEDIUM"
                        ? "bg-[#dce6c1] text-[#1d2d19] dark:bg-primary/20 dark:text-foreground border-foreground/20"
                        : "bg-background/90 text-foreground border-border/60"
                    }`}
                  >
                    <span className="text-3xl font-normal tracking-tight">
                      {masteryBreakdown.medium.count}
                    </span>
                    <div className="text-right self-start">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider">
                        MEDIUM ({masteryBreakdown.medium.pct}%)
                      </div>
                      <div className="font-mono text-[9px] opacity-75">
                        {masteryBreakdown.medium.viz} VIZ + {masteryBreakdown.medium.lc} LC
                      </div>
                    </div>
                  </div>

                  {/* Block 3: EASY (Proportional Width to Real Solved Count) */}
                  <div
                    style={{ width: `${masteryBreakdown.easy.widthPct}%` }}
                    className={`min-w-[210px] rounded-md border p-2.5 flex items-center justify-between transition-all ${
                      masteryBreakdown.dominantDiff === "EASY"
                        ? "bg-[#dce6c1] text-[#1d2d19] dark:bg-primary/20 dark:text-foreground border-foreground/20"
                        : "bg-background/90 text-foreground border-border/60"
                    }`}
                  >
                    <span className="text-3xl font-normal tracking-tight">
                      {masteryBreakdown.easy.count}
                    </span>
                    <div className="text-right self-start">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider">
                        EASY ({masteryBreakdown.easy.pct}%)
                      </div>
                      <div className="font-mono text-[9px] opacity-75">
                        {masteryBreakdown.easy.viz} VIZ + {masteryBreakdown.easy.lc} LC
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Compact Integration & Telemetry Tiles */}
                <div className="grid grid-cols-4 gap-1.5 border-t border-foreground/25 pt-2.5">
                  <button
                    type="button"
                    onClick={() => scrollToSection(lcSectionRef)}
                    className="flex flex-col items-center justify-center rounded-lg bg-[#21341d] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground p-1.5 text-center cursor-pointer"
                  >
                    <span className="font-mono text-[10px] font-bold truncate max-w-full">
                      {leetcodeStats?.totalSolved ?? 0}
                    </span>
                    <span className="font-mono text-[8px] uppercase opacity-80">LEETCODE</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectGithub}
                    className="flex flex-col items-center justify-center rounded-lg border border-border/70 bg-background/80 p-1.5 text-center cursor-pointer hover:border-primary/50"
                  >
                    <span className="font-mono text-[10px] font-bold truncate max-w-full">
                      {profile?.githubConnected ? "ACTIVE" : "OFF"}
                    </span>
                    <span className="font-mono text-[8px] uppercase text-muted-foreground">
                      GITHUB
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(vaultSectionRef)}
                    className="flex flex-col items-center justify-center rounded-lg border border-border/70 bg-background/80 p-1.5 text-center cursor-pointer hover:border-primary/50"
                  >
                    <span className="font-mono text-[10px] font-bold">{vaultActiveCount}</span>
                    <span className="font-mono text-[8px] uppercase text-muted-foreground">
                      KEYS
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection(diagnosticsSectionRef)}
                    className="flex flex-col items-center justify-center rounded-lg border border-border/70 bg-background/80 p-1.5 text-center cursor-pointer hover:border-primary/50"
                  >
                    <span className="font-mono text-[10px] font-bold">{aiReports.length}</span>
                    <span className="font-mono text-[8px] uppercase text-muted-foreground">
                      REPORTS
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ================================================================== */}
            {/* ROW 3: SAVED SUBMISSIONS & ATTEMPT HISTORY EXPLORER (FROM DASHBOARD) */}
            {/* Interactive Filterable List + AI Review + Live <Visualizer /> Replay */}
            {/* ================================================================== */}
            <div
              ref={submissionsSectionRef}
              className="rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-5 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-foreground/25 pb-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <History className="size-4 text-primary" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    SAVED SUBMISSIONS &amp; VISUALIZER REPLAY ARCHIVE
                  </span>
                  <span className="rounded bg-[#21341d] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground px-2 py-0.5 font-mono text-[10px] font-bold">
                    {explorerSubmissions.length} / {filteredSubmissions.length} SHOWN
                  </span>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      value={submissionSearchQuery}
                      onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                      placeholder="Filter by problem, topic, O(n)..."
                      className="h-8 pl-8 pr-3 w-52 font-mono text-xs bg-background/80"
                    />
                  </div>

                  {/* Classification Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1">
                    {(["ALL", "Optimal", "Better", "Brute Force", "Incomplete"] as const).map(
                      (cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setSubmissionClassFilter(cls)}
                          className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            submissionClassFilter === cls
                              ? "bg-[#23351f] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground"
                              : "bg-background/80 text-muted-foreground border border-border/60 hover:text-foreground"
                          }`}
                        >
                          {cls}
                        </button>
                      )
                    )}
                  </div>

                  {/* Difficulty Filter Pills */}
                  <div className="flex items-center gap-1">
                    {(["ALL", "Easy", "Medium", "Hard"] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setSubmissionDiffFilter(diff)}
                        className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          submissionDiffFilter === diff
                            ? "bg-[#dce6c1] text-[#1d2d19] dark:bg-secondary dark:text-foreground border border-foreground/30"
                            : "bg-background/80 text-muted-foreground border border-border/60 hover:text-foreground"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {explorerSubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/20 bg-background/50 p-8 text-center">
                  <Code2 className="size-7 text-muted-foreground" />
                  <div className="font-mono text-xs font-bold uppercase text-foreground">
                    {filteredSubmissions.length === 0
                      ? "No Saved Submissions in Firebase Firestore Yet"
                      : "No Submissions Match Your Active Filters"}
                  </div>
                  <p className="max-w-md font-mono text-[11px] text-muted-foreground">
                    {filteredSubmissions.length === 0
                      ? "Submit pseudocode for AI review or pass all test cases in the code editor on any problem page to automatically archive your solution and step-by-step visualization here."
                      : "Try clearing your search query or switching the classification/difficulty filter pills."}
                  </p>
                  <Link
                    to="/problems"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#23351f] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase"
                  >
                    <span>[+] EXPLORE PROBLEMS</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {explorerSubmissions.map((s: any) => {
                    const slug =
                      s.slug ||
                      String(s.title || "")
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-");
                    const prob = slug ? problemBySlug(slug) : undefined;
                    const diff = s.difficulty || prob?.difficulty || "Medium";
                    const cls = s.classification || "Submitted";
                    const timeComp = s.timeComplexity || s.time_complexity;
                    const spaceComp = s.spaceComplexity || s.space_complexity;
                    const createdAt = s.createdAt || s.created_at;
                    const isOpen = openSubmissionId === s.id;
                    const steps = Array.isArray(s.steps) ? s.steps : [];

                    const clsBadgeClass =
                      cls === "Optimal"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : cls === "Better"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        : cls === "Brute Force"
                        ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30"
                        : "bg-muted text-muted-foreground border-border";

                    const diffBadgeClass =
                      diff === "Easy"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : diff === "Hard"
                        ? "text-rose-700 dark:text-rose-400"
                        : "text-amber-700 dark:text-amber-400";

                    return (
                      <div
                        key={s.id}
                        className="rounded-xl border border-foreground/20 bg-background/75 overflow-hidden transition-all"
                      >
                        {/* Summary Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-muted/40 transition-colors">
                          <button
                            type="button"
                            onClick={() => setOpenSubmissionId(isOpen ? null : s.id)}
                            className="flex flex-1 flex-wrap items-center gap-2.5 text-left min-w-[220px] cursor-pointer"
                          >
                            <span
                              className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${clsBadgeClass}`}
                            >
                              {cls}
                            </span>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {s.title || prob?.title || slug}
                            </span>
                            <span
                              className={`font-mono text-[10px] font-bold uppercase ${diffBadgeClass}`}
                            >
                              • {diff}
                            </span>
                            {timeComp && (
                              <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground">
                                Time: {timeComp}
                              </span>
                            )}
                            {spaceComp && (
                              <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground">
                                Space: {spaceComp}
                              </span>
                            )}
                            {prob?.topics && prob.topics.length > 0 && (
                              <span className="hidden md:inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                                [{prob.topics.slice(0, 2).join(", ")}]
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-2">
                            {createdAt && (
                              <span
                                className="font-mono text-[10px] text-muted-foreground"
                                title={new Date(createdAt).toLocaleString()}
                              >
                                {formatShortRelativeTime(createdAt)}
                              </span>
                            )}
                            <Link
                              to="/problem/$slug"
                              params={{ slug }}
                              className="rounded border border-foreground/20 bg-card px-2 py-1 font-mono text-[10px] font-bold uppercase text-foreground hover:border-primary"
                            >
                              [WORKSPACE ↗]
                            </Link>
                            <button
                              type="button"
                              onClick={() => deleteSubmissionMutation.mutate(s.id)}
                              disabled={deleteSubmissionMutation.isPending}
                              className="rounded border border-destructive/30 bg-destructive/10 p-1 text-destructive hover:bg-destructive/20 cursor-pointer"
                              title="Delete saved submission from Firebase"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setOpenSubmissionId(isOpen ? null : s.id)}
                              className="rounded border border-border bg-card p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                              title={isOpen ? "Collapse details" : "Expand AI review & visualizer"}
                            >
                              {isOpen ? (
                                <ChevronUp className="size-3.5" />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Attempt Details: Code/Pseudocode, Praise, Nudge, Markdown Feedback & Live Visualizer */}
                        {isOpen && (
                          <div className="border-t border-dashed border-foreground/25 bg-card/60 p-4 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                              {/* Left Column: Submitted Logic + Praise/Nudge + AI Markdown Review */}
                              <div
                                className={
                                  steps.length > 0 ? "lg:col-span-6 space-y-3" : "lg:col-span-12 space-y-3"
                                }
                              >
                                <div>
                                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    SUBMITTED LOGIC / CODE
                                  </div>
                                  <pre className="max-h-60 overflow-auto rounded-lg border border-border bg-background/90 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                                    {s.pseudocode || "// No source text recorded"}
                                  </pre>
                                </div>

                                {(s.praise || s.nudge) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {s.praise && (
                                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                                        <div className="font-mono text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                                          ✓ STRONG HABITS
                                        </div>
                                        <p className="mt-1 text-xs text-foreground leading-relaxed">
                                          {s.praise}
                                        </p>
                                      </div>
                                    )}
                                    {s.nudge && (
                                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                                        <div className="font-mono text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                                          ⚡ OPTIMIZATION HINT
                                        </div>
                                        <p className="mt-1 text-xs text-foreground leading-relaxed">
                                          {s.nudge}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {s.feedback && (
                                  <div className="rounded-lg border border-border bg-background/80 p-3">
                                    <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                      AI INTERVIEWER DIAGNOSTIC REVIEW
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                                      <ReactMarkdown>{String(s.feedback)}</ReactMarkdown>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Right Column: Interactive Step-by-Step Visualizer Replay */}
                              {steps.length > 0 && (
                                <div className="lg:col-span-6 space-y-2">
                                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    SAVED STEP-BY-STEP VISUALIZER REPLAY ({steps.length} STEPS)
                                  </div>
                                  <div className="rounded-xl border border-border bg-background/90 p-3">
                                    <Visualizer
                                      array={Array.isArray(s.testCase) ? s.testCase : []}
                                      codeLines={
                                        Array.isArray(s.codeLines)
                                          ? s.codeLines
                                          : String(s.code || "").split("\n")
                                      }
                                      steps={steps}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================================================================== */}
            {/* ROW 4: LEETCODE TELEMETRY, 52-WEEK HEATMAP, RECENT LC LOG & GITHUB */}
            {/* ================================================================== */}
            <div ref={lcSectionRef} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* LeetCode Sync, Quotas, Unified 52-Week Heatmap & Recent LC Feed */}
              <div className="lg:col-span-8 rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/25 pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-primary" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                      LEETCODE TELEMETRY, QUOTAS &amp; UNIFIED 52-WEEK HEATMAP
                    </span>
                    {leetcodeUsername && (
                      <span className="rounded bg-[#21341d] text-[#edf3e8] dark:bg-primary dark:text-primary-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                        @{leetcodeUsername}
                      </span>
                    )}
                  </div>

                  {leetcodeUsername && !editingLc && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectOrSync(leetcodeUsername)}
                        disabled={syncMutation.isPending}
                        className="h-7 gap-1.5 font-mono text-[11px]"
                      >
                        <RefreshCw
                          className={`size-3 ${syncMutation.isPending ? "animate-spin" : ""}`}
                        />
                        <span>SYNC NOW</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setInputUsername(leetcodeUsername);
                          setEditingLc(true);
                        }}
                        className="h-7 font-mono text-[11px]"
                      >
                        <Edit2 className="size-3 mr-1" />
                        SWITCH HANDLE
                      </Button>
                    </div>
                  )}
                </div>

                {/* Connect / Edit LeetCode Handle Bar (shown when unlinked or switching) */}
                {(!leetcodeStats || editingLc) && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-4">
                    <div className="space-y-1">
                      <div className="font-mono text-xs font-bold uppercase text-foreground">
                        Link Public LeetCode Handle
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Synchronize your global ranking, difficulty quotas, recent submissions, and 52-week submission calendar.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="e.g. neetcode, tourist"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConnectOrSync();
                        }}
                        className="font-mono text-xs h-9 sm:w-52"
                      />
                      <Button
                        onClick={() => handleConnectOrSync()}
                        disabled={syncMutation.isPending || !inputUsername.trim()}
                        className="h-9 px-4 font-mono text-xs font-bold shrink-0"
                      >
                        {syncMutation.isPending ? "SYNCING…" : "CONNECT"}
                      </Button>
                      {editingLc && leetcodeUsername && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingLc(false)}
                          className="h-9 font-mono text-xs"
                        >
                          CANCEL
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* 4 Difficulty Quota Cards (Integrated from Dashboard LeetCode Section) */}
                {leetcodeStats && !editingLc && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        LC TOTAL SOLVED
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">
                          {leetcodeStats.totalSolved || 0}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          /{catalogTotals.lcTotalQuestions}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[9px] text-primary font-semibold">
                        RANK #{leetcodeStats.ranking ? Number(leetcodeStats.ranking).toLocaleString() : "N/A"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="font-mono text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                        LC EASY
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">{lcEasy}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          /{catalogTotals.lcTotalEasy}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-emerald-500/15 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((lcEasy / Math.max(1, catalogTotals.lcTotalEasy)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="font-mono text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">
                        LC MEDIUM
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">{lcMedium}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          /{catalogTotals.lcTotalMedium}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-amber-500/15 overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((lcMedium / Math.max(1, catalogTotals.lcTotalMedium)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="font-mono text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">
                        LC HARD
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">{lcHard}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          /{catalogTotals.lcTotalHard}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-rose-500/15 overflow-hidden">
                        <div
                          className="h-full bg-rose-600"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((lcHard / Math.max(1, catalogTotals.lcTotalHard)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Unified 52-Week Activity Heatmap (Merges LeetCode Calendar + Firebase DSA.viz Dates) */}
                <LeetCodeHeatmap
                  calendar={dashboardTelemetry.mergedCalendar}
                  streak={dashboardTelemetry.currentStreak}
                  totalActiveDays={dashboardTelemetry.totalActiveDays}
                />

                {/* Recent LeetCode Submissions Feed (Integrated from Dashboard) */}
                {filteredLcRecent.length > 0 && (
                  <div className="border-t border-foreground/25 pt-3 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>RECENT LEETCODE SUBMISSIONS LOG ({filteredLcRecent.length})</span>
                      <span>SYNCED FROM @{leetcodeUsername}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {filteredLcRecent.slice(0, 10).map((lcSub: any, idx: number) => {
                        const slug =
                          lcSub.titleSlug ||
                          String(lcSub.title || "")
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-");
                        const isAccepted =
                          String(lcSub.statusDisplay || "Accepted").toLowerCase() === "accepted";
                        const hasLocalProblem = slug ? Boolean(problemBySlug(slug)) : false;

                        return (
                          <div
                            key={`${slug}-${idx}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/75 px-3 py-2 font-mono text-[11px]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {isAccepted ? (
                                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <XCircle className="size-3.5 text-rose-500 shrink-0" />
                                )}
                                <span className="truncate font-semibold text-foreground">
                                  {lcSub.title || slug}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[9px] text-muted-foreground">
                                {lcSub.statusDisplay || "Accepted"} •{" "}
                                {String(lcSub.lang || "code").toUpperCase()}{" "}
                                {lcSub.timestamp
                                  ? `• ${formatShortRelativeTime(lcSub.timestamp)}`
                                  : ""}
                              </div>
                            </div>

                            {hasLocalProblem ? (
                              <Link
                                to="/problem/$slug"
                                params={{ slug }}
                                className="shrink-0 rounded bg-[#dce6c1] text-[#1d2d19] dark:bg-primary/20 dark:text-foreground px-2 py-0.5 text-[9px] font-bold uppercase hover:opacity-90"
                              >
                                [VISUALIZE ↗]
                              </Link>
                            ) : (
                              <a
                                href={`https://leetcode.com/problems/${slug}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-[9px] font-bold text-muted-foreground hover:text-foreground"
                              >
                                [LC ↗]
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Col (Col 4): GitHub Auto-Push + DSA.viz Portfolio Summary */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-4">
                {/* GitHub Integration Card */}
                <div className="rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-foreground/25 pb-3">
                      <div className="flex items-center gap-2">
                        <Github className="size-4 text-foreground" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                          GITHUB AUTO-PUSH
                        </span>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          profile?.githubConnected
                            ? "bg-[#21341d] text-[#edf3e8] dark:bg-emerald-500/20 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {profile?.githubConnected ? "CONNECTED" : "OFFLINE"}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                      Push accepted C++, Python, Java, and JS solutions from the code editor straight to your{" "}
                      <code className="font-mono text-foreground">LeetCode-Solutions</code> repository with one click.
                    </p>
                  </div>

                  {profile?.githubConnected ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 p-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {profile.githubAvatar ? (
                            <img
                              src={profile.githubAvatar}
                              alt="GitHub"
                              className="size-9 rounded-full border border-border object-cover"
                            />
                          ) : (
                            <Github className="size-6 text-foreground" />
                          )}
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-bold text-foreground truncate">
                              {profile.githubUsername ? `@${profile.githubUsername}` : "GitHub Linked"}
                            </div>
                            {(profile.githubUsername || profile.githubUrl) && (
                              <a
                                href={
                                  profile.githubUsername
                                    ? `https://github.com/${profile.githubUsername}/LeetCode-Solutions`
                                    : profile.githubUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                              >
                                <span>VIEW REPO</span>
                                <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => void handlePushLatestToGithub()}
                        disabled={isPushingGithub || isConnectingGithub}
                        className="w-full h-8 gap-2 font-mono text-[11px] font-bold bg-[#21341d] text-[#edf3e8] hover:bg-[#21341d]/90 dark:bg-primary dark:text-primary-foreground cursor-pointer"
                      >
                        <Github className="size-3.5" />
                        <span>
                          {isPushingGithub ? "PUSHING TO GITHUB…" : "PUSH / SYNC TO GITHUB"}
                        </span>
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleConnectGithub}
                          disabled={isConnectingGithub || isPushingGithub}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 font-mono text-[11px]"
                        >
                          RECONNECT
                        </Button>
                        <Button
                          onClick={handleDisconnectGithub}
                          disabled={isConnectingGithub || isPushingGithub}
                          variant="ghost"
                          size="sm"
                          className="h-8 font-mono text-[11px] text-destructive hover:bg-destructive/10"
                        >
                          DISCONNECT
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={handleConnectGithub}
                      disabled={isConnectingGithub}
                      className="w-full h-9 gap-2 font-mono text-xs font-bold bg-[#21341d] text-[#edf3e8] hover:bg-[#21341d]/90 dark:bg-primary dark:text-primary-foreground cursor-pointer"
                    >
                      <Github className="size-4" />
                      <span>{isConnectingGithub ? "CONNECTING…" : "CONNECT GITHUB ACCOUNT"}</span>
                    </Button>
                  )}
                </div>

                {/* DSA.viz Native Telemetry Summary Card (From Dashboard Top Stat Cards) */}
                <div className="rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-foreground/25 pb-2.5">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                        DSA.VIZ NATIVE TELEMETRY
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        /{catalogTotals.vizTotal} CATALOG
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="font-mono text-[9px] font-bold uppercase text-muted-foreground">
                        VIZ SOLVED
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">{data.solved}</div>
                      <div className="font-mono text-[9px] text-muted-foreground">
                        {vizEasy}E • {vizMedium}M • {vizHard}H
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="font-mono text-[9px] font-bold uppercase text-muted-foreground">
                        OPTIMAL RATE
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">
                        {optimalRatePct}%
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground">
                        {data.optimal} OPTIMAL VERDICTS
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="font-mono text-[9px] font-bold uppercase text-muted-foreground">
                        SAVED ATTEMPTS
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">{data.attempts}</div>
                      <div className="font-mono text-[9px] text-muted-foreground">
                        IN FIREBASE FIRESTORE
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                      <div className="font-mono text-[9px] font-bold uppercase text-muted-foreground">
                        AI READINESS
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">
                        {latestReportScore !== null ? `${latestReportScore}%` : "—"}
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground">
                        {aiReports.length} DIAGNOSTIC REPORTS
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================================== */}
            {/* ROW 4: PERSONAL AI KEY VAULT (AES-256-GCM BYOK)                    */}
            {/* ================================================================== */}
            <div
              ref={vaultSectionRef}
              className="rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/25 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-primary" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    PERSONAL AI KEY VAULT (BYOK • PERSISTENT ACCOUNT STORAGE IN FIREBASE + BACKEND)
                  </span>
                </div>
                <span className="rounded bg-[#dce6c1] text-[#1d2d19] dark:bg-emerald-500/15 dark:text-emerald-400 px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                  AES-256-GCM ACCOUNT SYNC
                </span>
              </div>

              <ApiKeyVaultManager />
            </div>

            {/* ================================================================== */}
            {/* ROW 5: AI MISTAKE DIAGNOSTICS & PATTERNS REPORT                    */}
            {/* ================================================================== */}
            <div ref={diagnosticsSectionRef}>
              <AiMistakesSection initialReports={aiReports} />
            </div>

            {/* ================================================================== */}
            {/* ROW 6: PRIVACY, DATA RIGHTS & ERASURE                              */}
            {/* ================================================================== */}
            <div
              ref={privacySectionRef}
              className="rounded-2xl border-[1.5px] border-dashed border-foreground/30 bg-card/85 p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/25 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    PRIVACY, DATA EXPORT &amp; RIGHT TO ERASURE (GDPR • CCPA • DPDP)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCookieModalOpen(true)}
                    className="h-8 text-[11px] font-mono gap-1.5"
                  >
                    <Cookie className="size-3.5 text-primary" />
                    <span>COOKIE SETTINGS</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    className="h-8 text-[11px] font-mono gap-1.5"
                  >
                    <Download className="size-3.5 text-primary" />
                    <span>EXPORT JSON</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground leading-relaxed">
                <div className="space-y-2">
                  <div className="font-mono text-[11px] font-bold uppercase text-foreground">
                    DATA MINIMIZATION &amp; OWNERSHIP
                  </div>
                  <p>
                    We only store what is required to compute your algorithmic telemetry, track solved problems, and power Socratic AI diagnostics. Export a complete JSON snapshot or purge your account at any time.
                  </p>
                  <div className="flex items-center gap-3 pt-1 font-mono text-[11px]">
                    <Link to="/privacy" className="text-foreground underline hover:text-primary">
                      PRIVACY POLICY
                    </Link>
                    <span>•</span>
                    <Link to="/terms" className="text-foreground underline hover:text-primary">
                      TERMS
                    </Link>
                    <span>•</span>
                    <Link to="/cookies" className="text-foreground underline hover:text-primary">
                      COOKIES
                    </Link>
                  </div>
                </div>

                <div className="rounded-xl border border-destructive/35 bg-destructive/5 p-4 space-y-2.5">
                  <div className="font-mono text-[11px] font-bold uppercase text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    <span>PERMANENT ACCOUNT DELETION</span>
                  </div>
                  <p className="text-[11px]">
                    Permanently purge your profile, submissions, AI reports, and connected tokens. This action cannot be undone.
                  </p>
                  {!showDeleteConfirm ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="h-8 text-[11px] font-mono font-bold"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      <span>DELETE ACCOUNT</span>
                    </Button>
                  ) : (
                    <div className="space-y-2 pt-2 border-t border-destructive/20">
                      <p className="text-[10px] font-mono text-destructive font-bold uppercase">
                        Type "DELETE MY ACCOUNT" to confirm:
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="DELETE MY ACCOUNT"
                          value={confirmDeleteText}
                          onChange={(e) => setConfirmDeleteText(e.target.value)}
                          className="font-mono text-xs h-8 border-destructive/40"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteAccount}
                          disabled={isDeletingAccount || confirmDeleteText !== "DELETE MY ACCOUNT"}
                          className="text-xs font-mono font-bold h-8 shrink-0"
                        >
                          {isDeletingAccount ? "PURGING…" : "CONFIRM"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setConfirmDeleteText("");
                          }}
                          className="text-xs font-mono h-8 shrink-0"
                        >
                          CANCEL
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <CookiePreferencesModal
        isOpen={cookieModalOpen}
        onClose={() => setCookieModalOpen(false)}
      />

      <SiteFooter />
    </div>
  );
}

export default ProfilePage;

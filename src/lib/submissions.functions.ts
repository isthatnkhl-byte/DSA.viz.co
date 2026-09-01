export interface Submission {
  id: string | number;
  userId?: string;
  slug: string;
  title?: string;
  code: string;
  pseudocode?: string | null;
  lang: string;
  classification: string;
  difficulty: string;
  timeTakenMs?: number | null;
  timeComplexity?: string | null;
  spaceComplexity?: string | null;
  time_complexity?: string | null;
  space_complexity?: string | null;
  created_at?: string;
  createdAt?: string;
  praise?: string | null;
  nudge?: string | null;
  review?: string | null;
  viz_steps?: any | null;
  test_case?: any | null;
  code_lines?: any | null;
}
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { auth } from "@/lib/firebase";
import {
  getOrCreateUserProfile,
  updateUserProfile,
  getUserSubmissions,
  saveUserSubmission,
  deleteUserSubmission,
} from "@/lib/firestore-service";

const getToken = async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
};

export const saveSubmission = createServerFn({ method: "POST" })
  .validator((input: unknown) => input as any)
  .handler(async ({ data }) => {
    const user = auth.currentUser;
    const token = await getToken();

    // 1. Direct Firestore write if authenticated on client
    if (user) {
      try {
        const saved = await saveUserSubmission(user.uid, data);
        return { ok: true, id: String(saved.id), submission: saved };
      } catch (err) {
        console.warn("Direct Firestore save error, trying server API fallback:", err);
      }
    }

    if (!token) return { ok: false, error: "Not authenticated", id: "sub-" + Date.now() };

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to save submission:", res.status, errorText);
        return { ok: false, error: errorText, id: "sub-" + Date.now() };
      }
      const d = await res.json();
      return { ok: true, id: String(d.id), submission: d };
    } catch (err: any) {
      console.error("Save submission exception:", err);
      return { ok: false, error: err?.message, id: "sub-" + Date.now() };
    }
  });

export const listSubmissions = createServerFn({ method: "POST" }).handler(async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      const subs = await getUserSubmissions(user.uid);
      if (subs && subs.length > 0) return subs;
    } catch (e) {
      console.warn("Direct Firestore list submissions fallback:", e);
    }
  }

  const token = await getToken();
  if (!token) return [];

  try {
    const res = await fetch("/api/submissions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return [];
  }
});

export const deleteSubmission = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.union([z.string(), z.number()]) }).parse(input))
  .handler(async ({ data }) => {
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteUserSubmission(user.uid, String(data.id));
        return { ok: true };
      } catch (e) {
        console.warn("Direct Firestore delete error, trying API:", e);
      }
    }

    const token = await getToken();
    if (!token) return { ok: true };

    try {
      const res = await fetch(`/api/submissions/${data.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return { ok: res.ok };
    } catch {
      return { ok: false };
    }
  });

export const getProfileStats = createServerFn({ method: "POST" }).handler(async () => {
  const defaultStats = {
    profile: {
      display_name: "Algorithm Explorer",
      avatar_url: null,
      created_at: new Date().toISOString(),
      leetcode_username: null,
      leetcode_stats: null,
      githubToken: null as string | null,
    },
    attempts: 0,
    solved: 0,
    optimal: 0,
    easy: 0,
    medium: 0,
    hard: 0,
  };

  const user = auth.currentUser;
  if (user) {
    try {
      const [firestoreDoc, subs] = await Promise.all([
        getOrCreateUserProfile(user.uid, user.email, user.photoURL),
        getUserSubmissions(user.uid),
      ]);

      const subsArray = Array.isArray(subs) ? subs : [];
      const completeRows = subsArray.filter((r: any) => r.classification !== "Incomplete");
      const solved = new Set(completeRows.map((r: any) => r.slug));
      const optimal = new Set(
        completeRows.filter((r: any) => r.classification === "Optimal").map((r: any) => r.slug),
      );
      const byDifficulty = {
        Easy: new Set<string>(),
        Medium: new Set<string>(),
        Hard: new Set<string>(),
      };
      for (const r of completeRows) {
        const diff = r.difficulty
          ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1).toLowerCase()
          : "Medium";
        const bucket = byDifficulty[diff as keyof typeof byDifficulty];
        if (bucket) bucket.add(r.slug);
      }

      const cleanDisplayName =
        firestoreDoc.displayName ||
        (user.email ? user.email.split("@")[0] : "Algorithm Explorer");

      return {
        profile: {
          display_name: cleanDisplayName,
          avatar_url: firestoreDoc.avatarUrl || user.photoURL || null,
          created_at: firestoreDoc.createdAt || new Date().toISOString(),
          leetcode_username: firestoreDoc.leetcodeUsername || null,
          leetcode_stats: firestoreDoc.leetcodeStats || null,
          githubToken: firestoreDoc.githubToken || null,
        },
        attempts: subsArray.length,
        solved: solved.size,
        optimal: optimal.size,
        easy: byDifficulty.Easy.size,
        medium: byDifficulty.Medium.size,
        hard: byDifficulty.Hard.size,
      };
    } catch (err) {
      console.warn("Direct Firestore getProfileStats fallback to API:", err);
    }
  }

  const token = await getToken();
  if (!token) return defaultStats;

  try {
    const [profileRes, subsRes] = await Promise.all([
      fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/submissions", { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (!profileRes.ok || !subsRes.ok) return defaultStats;

    const profile = await profileRes.json();
    const subs = await subsRes.json();
    const subsArray = Array.isArray(subs) ? subs : [];

    const completeRows = subsArray.filter((r: any) => r.classification !== "Incomplete");
    const solved = new Set(completeRows.map((r: any) => r.slug));
    const optimal = new Set(
      completeRows.filter((r: any) => r.classification === "Optimal").map((r: any) => r.slug),
    );
    const byDifficulty = {
      Easy: new Set<string>(),
      Medium: new Set<string>(),
      Hard: new Set<string>(),
    };
    for (const r of completeRows) {
      const diff = r.difficulty
        ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1).toLowerCase()
        : "Medium";
      const bucket = byDifficulty[diff as keyof typeof byDifficulty];
      if (bucket) bucket.add(r.slug);
    }

    const cleanDisplayName =
      profile.displayName || (profile.email ? profile.email.split("@")[0] : "Algorithm Explorer");
    return {
      profile: {
        display_name: cleanDisplayName,
        avatar_url: profile.avatarUrl,
        created_at: profile.createdAt,
        leetcode_username: profile.leetcodeUsername,
        leetcode_stats: profile.leetcodeStats,
        githubToken: profile.githubToken,
      },
      attempts: subsArray.length,
      solved: solved.size,
      optimal: optimal.size,
      easy: byDifficulty.Easy.size,
      medium: byDifficulty.Medium.size,
      hard: byDifficulty.Hard.size,
    };
  } catch {
    return defaultStats;
  }
});

export const updateProfileUsername = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ username: z.string().min(2).max(30) }).parse(input))
  .handler(async ({ data }) => {
    const user = auth.currentUser;
    const clean = data.username.trim().replace(/^@+/, "");

    // 1. Direct Firestore profile update
    if (user) {
      try {
        const updated = await updateUserProfile(user.uid, { displayName: clean });
        // Also ping server in background if possible
        getToken().then((t) => {
          if (t) {
            fetch("/api/profile/update", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${t}`,
              },
              body: JSON.stringify({ username: clean }),
            }).catch(() => {});
          }
        });
        return { ok: true, profile: updated };
      } catch (err: any) {
        console.warn("Direct Firestore update username fallback to API:", err);
      }
    }

    const token = await getToken();
    if (!token) return { ok: false, error: "Not authenticated" };

    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: clean }),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { ok: false, error: resData?.error || "Failed to update username" };
      }
      return { ok: true, profile: resData?.profile };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to update username" };
    }
  });

export const updateLeetcodeUsername = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ username: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const user = auth.currentUser;
    if (user) {
      try {
        await updateUserProfile(user.uid, { leetcodeUsername: data.username });
      } catch (e) {
        console.warn("Direct Firestore update leetcode username fallback:", e);
      }
    }
    const token = await getToken();
    if (!token) return { ok: true };

    try {
      const res = await fetch("/api/sync-leetcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: data.username, stats: null }),
      });
      return { ok: res.ok };
    } catch {
      return { ok: true };
    }
  });

export const syncLeetCodeData = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ username: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const token = await getToken();
    if (!token) return { ok: false, error: "Not authenticated" };

    try {
      const res = await fetch("/api/sync-leetcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: data.username }),
      });

      const resData = await res.json();

      if (!res.ok) {
        return { ok: false, error: resData?.error || "Failed to sync LeetCode profile" };
      }

      // Save synced stats directly to Firestore
      const user = auth.currentUser;
      if (user && resData.stats) {
        try {
          await updateUserProfile(user.uid, {
            leetcodeUsername: data.username.trim(),
            leetcodeStats: resData.stats,
          });
        } catch (dbErr) {
          console.warn("Direct Firestore save of synced stats warning:", dbErr);
        }
      }

      return { ok: true, stats: resData.stats };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Failed to fetch LeetCode profile" };
    }
  });

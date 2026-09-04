import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export interface InterviewSessionRecord {
  id: string;
  date: string;
  problemId: string;
  problemTitle: string;
  compositeScore: number; // 0 - 10
  confidenceScore: number;
  craftScore: number;
  integrityScore: number;
  strikes: number;
  isDisqualified: boolean;
  previousRating: number; // 0 - 100
  newRating: number; // 0 - 100
  ratingDelta: number;
  status: "PASSED" | "FAILED" | "DISQUALIFIED" | "ABANDONED";
}

const STORAGE_RATING_KEY = "dsa_interview_rating";
const STORAGE_HISTORY_KEY = "dsa_interview_history";
const DEFAULT_STARTING_RATING = 75;

/**
 * Retrieves the current interview rating (out of 100).
 * Defaults to 75 for new candidates.
 */
export function getLocalInterviewRating(): number {
  if (typeof window === "undefined") return DEFAULT_STARTING_RATING;
  try {
    const stored = localStorage.getItem(STORAGE_RATING_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return Math.min(100, Math.max(0, parsed));
    }
  } catch {}
  return DEFAULT_STARTING_RATING;
}

/**
 * Retrieves the stored interview session history.
 */
export function getLocalInterviewHistory(): InterviewSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Saves the outcome of an interview session, calculates rating adjustments,
 * penalizes rating harshly on disqualification, abandonment, or zero-tier submissions,
 * and persists across storage & Firestore.
 */
export async function saveInterviewSession(params: {
  problemId: string;
  problemTitle: string;
  compositeScore: number; // 0 - 10
  confidenceScore: number;
  craftScore: number;
  integrityScore: number;
  strikes: number;
  isDisqualified: boolean;
  isAbandoned?: boolean;
  completedTiersCount?: number;
  userId?: string | null;
}): Promise<{
  previousRating: number;
  newRating: number;
  ratingDelta: number;
  record: InterviewSessionRecord;
}> {
  const previousRating = getLocalInterviewRating();
  let ratingDelta = 0;

  const isDisqualified = Boolean(params.isDisqualified || params.strikes >= 3);
  const isAbandoned = Boolean(params.isAbandoned);
  const completedTiers =
    params.completedTiersCount ??
    (params.craftScore >= 8.5 ? 3 : params.craftScore >= 6.0 ? 2 : params.craftScore >= 3.0 ? 1 : 0);

  let status: "PASSED" | "FAILED" | "DISQUALIFIED" | "ABANDONED";

  if (isDisqualified) {
    status = "DISQUALIFIED";
    ratingDelta = -25;
  } else if (isAbandoned) {
    status = "ABANDONED";
    ratingDelta = -22;
  } else if (completedTiers === 0 || params.compositeScore < 3.5) {
    // Zero working code or fatal failure
    status = "FAILED";
    ratingDelta = -20;
  } else if (params.compositeScore < 5.5) {
    // Deficient performance (No Hire)
    status = "FAILED";
    ratingDelta = -14;
  } else if (params.compositeScore < 7.5) {
    // Leaning No Hire
    status = "FAILED";
    ratingDelta = -8;
  } else if (params.compositeScore < 8.5 || completedTiers < 3) {
    // Leaning Hire (Marginal Pass)
    status = "PASSED";
    const rawDelta = Math.round((params.compositeScore * 10 - previousRating) * 0.25);
    ratingDelta = Math.max(1, rawDelta);
  } else {
    // Strong Hire (All 3 tiers completed optimal, articulate speech)
    status = "PASSED";
    const rawDelta = Math.round((params.compositeScore * 10 - previousRating) * 0.4);
    ratingDelta = Math.max(3, rawDelta);
  }

  // Realistic competitive rating scale [0, 100]
  const newRating = Math.min(100, Math.max(0, previousRating + ratingDelta));

  const record: InterviewSessionRecord = {
    id: `interview_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date: new Date().toISOString(),
    problemId: params.problemId,
    problemTitle: params.problemTitle,
    compositeScore: params.compositeScore,
    confidenceScore: params.confidenceScore,
    craftScore: params.craftScore,
    integrityScore: params.integrityScore,
    strikes: params.strikes,
    isDisqualified,
    previousRating,
    newRating,
    ratingDelta,
    status,
  };

  // 1. Persist to LocalStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_RATING_KEY, newRating.toString());
      const existingHistory = getLocalInterviewHistory();
      const updatedHistory = [record, ...existingHistory].slice(0, 30);
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.warn("LocalStorage interview rating persist notice:", e);
    }
  }

  // 2. Persist to Authenticated Firestore if logged in
  const uid = params.userId || auth.currentUser?.uid;
  if (uid && db) {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef).catch(() => null);
      const prevData = snap && snap.exists() ? snap.data() : {};
      const prevHistory = Array.isArray(prevData.interviewHistory) ? prevData.interviewHistory : [];

      await setDoc(
        userRef,
        {
          interviewRating: newRating,
          interviewHistory: [record, ...prevHistory].slice(0, 30),
          lastInterviewAt: new Date().toISOString(),
        },
        { merge: true },
      ).catch(() => null);
    } catch (dbErr) {
      console.warn("Firestore interview rating sync notice:", dbErr);
    }
  }

  return { previousRating, newRating, ratingDelta, record };
}

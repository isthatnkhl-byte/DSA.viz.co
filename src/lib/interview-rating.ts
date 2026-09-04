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
  status: "PASSED" | "DISQUALIFIED";
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
 * penalizes rating on disqualification (3 strikes), and persists across storage & Firestore.
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
  userId?: string | null;
}): Promise<{
  previousRating: number;
  newRating: number;
  ratingDelta: number;
  record: InterviewSessionRecord;
}> {
  const previousRating = getLocalInterviewRating();
  let ratingDelta = 0;

  if (params.isDisqualified || params.strikes >= 3) {
    // 3 strikes / Disqualification penalty: -20 rating points
    ratingDelta = -20;
  } else {
    // Session performance scaled to 100 (e.g. 8.5 / 10 -> 85 / 100)
    const sessionPerformance = Math.round(params.compositeScore * 10);
    // Strike deduction: -3 per minor strike before disqualification
    const strikeDeduction = params.strikes * 3;
    const adjustedPerformance = Math.max(20, sessionPerformance - strikeDeduction);

    // Weighted delta adjustment (30% weight towards session performance)
    const rawDelta = Math.round((adjustedPerformance - previousRating) * 0.35);
    // Ensure positive reinforcement on strong performance
    if (adjustedPerformance >= previousRating) {
      ratingDelta = Math.max(1, rawDelta);
    } else {
      ratingDelta = Math.min(-1, rawDelta);
    }
  }

  const newRating = Math.min(100, Math.max(15, previousRating + ratingDelta));

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
    isDisqualified: params.isDisqualified || params.strikes >= 3,
    previousRating,
    newRating,
    ratingDelta,
    status: params.isDisqualified || params.strikes >= 3 ? "DISQUALIFIED" : "PASSED",
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

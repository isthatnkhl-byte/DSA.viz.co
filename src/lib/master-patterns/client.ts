import { getAuthHeaders } from "@/lib/api-client";
import type {
  CognitiveProfile,
  ErrorSignature,
  MasteryScorecard,
  PatternId,
  PatternSessionState,
  PatternSummaryRecord,
  QuestionHintEntry,
  RecentSessionDigest,
  StrandState,
  SubmissionEvaluation,
  SubmissionPayload,
  TrackMode,
} from "./types";

export interface PatternCatalogItemView {
  id: PatternId;
  title: string;
  subtitle: string;
  category:
    | "Linear & Window"
    | "Search & Partition"
    | "Stacks, Heaps & Intervals"
    | "Graphs & Trees"
    | "Recursion & DP";
  interviewFrequency: "Very High" | "High" | "Core";
  whiteboardQuery: string;
  linkedProblemSlugs: string[];
  strands: Array<{
    id: string;
    title: string;
    prerequisiteStrandIds: string[];
    state: StrandState | null;
  }>;
  summary: PatternSummaryRecord | null;
  metrics: {
    masteryPercent: number;
    masteredStrands: number;
    totalStrands: number;
    activeGaps: number;
    dueStrands: number;
  };
}

export interface PatternProfileResponse {
  userId: string;
  cognitiveProfile: CognitiveProfile;
  errorSignatures: ErrorSignature[];
  recentSessions: RecentSessionDigest[];
  dueReviewStrands: Array<{
    patternId: PatternId;
    strandId: string;
    effectiveMastery: number;
  }>;
  patterns: PatternCatalogItemView[];
  updatedAt: string;
}

export interface CalibrationPromptData {
  patternId: PatternId;
  title: string;
  aiPrompt: string;
  priorMasteryPercent: number;
  activeGapsCount: number;
  dueReviewCount: number;
  personalizedWarnings: string[];
  options: Array<{
    track: TrackMode;
    label: string;
    description: string;
  }>;
}

async function patternFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/patterns${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { error?: string })?.error || `Request failed (${res.status})`,
    ) as Error & { status?: number; payload?: unknown };
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export function apiFetchPatternProfile(): Promise<PatternProfileResponse> {
  return patternFetch<PatternProfileResponse>("/profile", { method: "GET" });
}

export function apiStartPatternSession(patternId: PatternId): Promise<{
  session: PatternSessionState;
  calibration: CalibrationPromptData;
}> {
  return patternFetch("/session/start", {
    method: "POST",
    body: JSON.stringify({ patternId }),
  });
}

export function apiSelectPatternLevel(
  sessionId: string,
  track: TrackMode,
): Promise<{ session: PatternSessionState }> {
  return patternFetch("/session/select-level", {
    method: "POST",
    body: JSON.stringify({ sessionId, track }),
  });
}

export function apiStartCalibrationProbe(
  sessionId: string,
): Promise<{ session: PatternSessionState }> {
  return patternFetch("/session/start-probe", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function apiReadyPatternQuestions(
  sessionId: string,
): Promise<{ session: PatternSessionState }> {
  return patternFetch("/session/ready-questions", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function apiRequestPatternHint(
  sessionId: string,
  questionId: string,
): Promise<{
  hint: QuestionHintEntry;
  session: PatternSessionState;
  alreadyAtMax?: boolean;
}> {
  return patternFetch("/session/hint", {
    method: "POST",
    body: JSON.stringify({ sessionId, questionId }),
  });
}

export function apiSubmitPatternAnswer(payload: SubmissionPayload): Promise<{
  evaluation: SubmissionEvaluation;
  session: PatternSessionState;
  profile: PatternProfileResponse;
  idempotentReplay?: boolean;
}> {
  return patternFetch("/session/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function apiFinishPatternSession(sessionId: string): Promise<{
  scorecard: MasteryScorecard;
  session: PatternSessionState;
  profile: PatternProfileResponse;
}> {
  return patternFetch("/session/finish", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function apiGetPatternSession(
  sessionId: string,
): Promise<{ session: PatternSessionState }> {
  return patternFetch(`/session/${encodeURIComponent(sessionId)}`, {
    method: "GET",
  });
}

export function apiRehydratePatternSession(
  session: PatternSessionState,
): Promise<{
  session: PatternSessionState;
  calibration?: CalibrationPromptData;
}> {
  return patternFetch("/session/rehydrate", {
    method: "POST",
    body: JSON.stringify({
      sessionId: session.sessionId,
      patternId: session.patternId,
      track: session.track,
      stage: session.stage,
      questionHistory: session.questionHistory,
      resolvedStrandsInSession: session.resolvedStrandsInSession,
      pendingRemediationStrands: session.pendingRemediationStrands,
      retestQueue: session.retestQueue,
    }),
  });
}

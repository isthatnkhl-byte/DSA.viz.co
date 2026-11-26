import { getAuthHeaders } from "@/lib/api-client";
import {
  reattachPatternTurnStream,
  runPatternTurnWithRecovery,
  steerActivePatternTurn,
  type SettledTurnEvent,
} from "./session-controller";
import type {
  CognitiveProfile,
  ErrorSignature,
  GeneratedVisualArtifact,
  MasteryScorecard,
  PatternId,
  PatternSessionState,
  PatternSummaryRecord,
  PatternTurnActionInput,
  PatternTurnSteerNote,
  PatternTurnStreamEvent,
  QuestionHintEntry,
  RecentSessionDigest,
  SideChatAnchor,
  SideChatThread,
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

export type DagReadinessStatus =
  | "mastered"
  | "remediated"
  | "gap"
  | "due"
  | "ready"
  | "blocked";

export interface GlobalDagStrandNode {
  strandId: string;
  patternId: PatternId;
  title: string;
  effectiveMastery: number;
  readiness: DagReadinessStatus;
  blockedBy: string[];
  downstreamImpact: number;
}

export interface PatternDagAnalysisView {
  ok: boolean;
  errors: string[];
  nodeCount: number;
  edgeCount: number;
  internalEdges: number;
  crossPatternEdges: number;
  maxDepth: number;
  rootStrandIds: string[];
  sinkStrandIds: string[];
  topologicalOrder: string[];
  patternBridges: Array<{
    fromPattern: PatternId;
    toPattern: PatternId;
    fromStrand: string;
    toStrand: string;
  }>;
  depths: Record<string, number>;
}

export interface PatternDagFrontierResponse {
  dag: PatternDagAnalysisView;
  frontier: {
    summary: {
      mastered: number;
      remediated: number;
      gap: number;
      due: number;
      ready: number;
      blocked: number;
    };
    recommendedNext: GlobalDagStrandNode[];
    nodes: GlobalDagStrandNode[];
  };
}

export interface DagSearchMatchView {
  strandId: string;
  patternId: PatternId;
  patternTitle: string;
  strandTitle: string;
  score: number;
  matchedVia: "exact_id" | "slug_or_problem" | "fuzzy_content";
  coreInvariant: string;
  userState: GlobalDagStrandNode | null;
}

export function apiFetchPatternProfile(): Promise<PatternProfileResponse> {
  return patternFetch<PatternProfileResponse>("/profile", { method: "GET" });
}

export function apiFetchPatternDag(): Promise<PatternDagFrontierResponse> {
  return patternFetch<PatternDagFrontierResponse>("/dag", { method: "GET" });
}

export function apiMatchPatternDag(
  q: string,
  limit = 6,
): Promise<{
  query: string;
  resolvedStrandId: string | null;
  matches: DagSearchMatchView[];
}> {
  return patternFetch(
    `/dag/match?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(limit))}`,
    { method: "GET" },
  );
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

export function apiStreamPatternTurn(
  sessionId: string,
  action: PatternTurnActionInput,
  options?: {
    onEvent?: (event: PatternTurnStreamEvent) => void;
    signal?: AbortSignal;
  },
): Promise<SettledTurnEvent> {
  return runPatternTurnWithRecovery({
    sessionId,
    action,
    getHeaders: getAuthHeaders,
    onEvent: options?.onEvent,
    signal: options?.signal,
  });
}

export function apiReattachPatternStream(
  sessionId: string,
  options?: {
    onEvent?: (event: PatternTurnStreamEvent) => void;
    signal?: AbortSignal;
  },
): Promise<SettledTurnEvent> {
  return reattachPatternTurnStream({
    sessionId,
    getHeaders: getAuthHeaders,
    onEvent: options?.onEvent,
    signal: options?.signal,
  });
}

export function apiSteerPatternTurn(
  sessionId: string,
  text: string,
): Promise<{ accepted: boolean; turnId: string; steer: PatternTurnSteerNote }> {
  return steerActivePatternTurn({
    sessionId,
    text,
    getHeaders: getAuthHeaders,
  });
}

export function apiAbortPatternTurn(
  sessionId: string,
): Promise<{ aborted: boolean; turnId?: string }> {
  return patternFetch(`/session/${encodeURIComponent(sessionId)}/abort`, {
    method: "POST",
  });
}

export type ClientSideStreamEvent =
  | { type: "thread"; thread: SideChatThread }
  | { type: "text"; text: string }
  | { type: "done"; thread: SideChatThread }
  | { type: "error"; error: string };

async function readNdjsonEvents(
  res: Response,
  onEvent?: (ev: ClientSideStreamEvent) => void,
): Promise<SideChatThread> {
  if (!res.body) {
    const json = (await res.json()) as { thread: SideChatThread };
    return json.thread;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let settledThread: SideChatThread | null = null;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const nl = buf.indexOf("\n");
        if (nl === -1) break;
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const ev = JSON.parse(line) as ClientSideStreamEvent;
          onEvent?.(ev);
          if (ev.type === "done" || ev.type === "thread") {
            settledThread = ev.thread;
          }
          if (ev.type === "error") {
            throw new Error(ev.error);
          }
        } catch (err) {
          if (err instanceof Error && !line.startsWith("{")) continue;
          if (err instanceof Error && !(err instanceof SyntaxError)) throw err;
        }
      }
    }
  } finally {
    void reader.cancel().catch(() => {});
  }

  if (!settledThread) {
    throw new Error("Side question stream closed before completion.");
  }
  return settledThread;
}

export function apiListSideChats(sessionId: string): Promise<{
  threads: SideChatThread[];
  answering: Record<string, string>;
}> {
  return patternFetch(`/session/${encodeURIComponent(sessionId)}/side-chats`, {
    method: "GET",
  });
}

export async function apiAskSideChat(
  sessionId: string,
  payload: {
    threadId?: string;
    anchor?: SideChatAnchor;
    text: string;
    quotes?: string[];
    quoteCitations?: string[];
    retry?: boolean;
    requestId?: string;
    workingDraft?: string;
  },
  onEvent?: (ev: ClientSideStreamEvent) => void,
): Promise<SideChatThread> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `/api/patterns/session/${encodeURIComponent(sessionId)}/side-chats/ask`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    const err = new Error(
      errJson.error || `Side chat request failed (${res.status})`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return readNdjsonEvents(res, onEvent);
}

export async function apiWatchSideChat(
  sessionId: string,
  threadId: string,
  onEvent?: (ev: ClientSideStreamEvent) => void,
): Promise<SideChatThread> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `/api/patterns/session/${encodeURIComponent(sessionId)}/side-chats/${encodeURIComponent(threadId)}/stream`,
    { method: "GET", headers },
  );
  if (!res.ok) {
    throw new Error(`Failed to reattach side thread (${res.status})`);
  }
  return readNdjsonEvents(res, onEvent);
}

export function apiStopSideChat(
  sessionId: string,
  threadId: string,
): Promise<{ stopped: boolean }> {
  return patternFetch(
    `/session/${encodeURIComponent(sessionId)}/side-chats/${encodeURIComponent(threadId)}/stop`,
    { method: "POST" },
  );
}

export function apiPatchSideChat(
  sessionId: string,
  threadId: string,
  patch: { open?: boolean; docked?: boolean },
): Promise<{ thread: SideChatThread }> {
  return patternFetch(
    `/session/${encodeURIComponent(sessionId)}/side-chats/${encodeURIComponent(threadId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
}

export function apiGeneratePatternVisual(
  sessionId: string,
  payload?: { brief?: string; strandId?: string },
): Promise<{
  visual: GeneratedVisualArtifact;
  session: PatternSessionState;
}> {
  return patternFetch(
    `/session/${encodeURIComponent(sessionId)}/visualize`,
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    },
  );
}

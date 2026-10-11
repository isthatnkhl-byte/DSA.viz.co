import type { ReviewResult, DatasetPlanResult, DatasetVizTrace, ExecutionPlanStep } from "./review.functions";
import type { CppExecutionResult } from "./compiler.types";
import type { TestDataset } from "./problems";
import { getAuth } from "firebase/auth";

/** Helper to retrieve the current user's Firebase Bearer ID Token */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch {
    // Unauthenticated or Firebase not initialized
  }
  return {};
}

/**
 * Stage 1: Executes standard AI Pseudocode Review & Complexity Analysis.
 */
export async function apiReviewPseudocode(payload: {
  slug: string;
  title: string;
  difficulty?: string;
  topics?: string[];
  pseudocode: string;
}): Promise<ReviewResult> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Review request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Stage 2: Selects data structure type, generates 3 test datasets, and constructs the step-by-step plan.
 */
export async function apiGenerateDatasetsAndPlan(payload: {
  slug: string;
  title: string;
  difficulty?: string;
  topics?: string[];
  pseudocode: string;
  classification?: string;
  complexity?: { time: string; space: string };
}): Promise<DatasetPlanResult> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Dataset plan request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Stage 3: Requests an animated visualizer trace with full marker schema and step synchronization.
 */
export async function apiGenerateDatasetViz(payload: {
  slug: string;
  title?: string;
  difficulty?: string;
  topics?: string[];
  dataStructureType?: string;
  previousContext?: string;
  currentStepOffset?: number;
  executionPlan?: ExecutionPlanStep[];
  dataset: TestDataset;
  pseudocode: string;
}): Promise<DatasetVizTrace> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/visualize-dataset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Dataset visualization failed (${response.status})`);
  }

  return response.json();
}

/**
 * Verify Trace: Calls the secondary AI pass to compare trace vs canonical logic
 */
export async function apiVerifyDatasetTrace(payload: {
  slug: string;
  title: string;
  pseudocode: string;
  datasetLabel: string;
  traceSteps: any[];
}): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/verify-trace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Trace verification failed (${response.status})`);
  }

  return response.json();
}

/**
 * Executes playground pseudocode review via Express REST API.
 */
export async function apiPlaygroundReview(payload: {
  title: string;
  type: string;
  pseudocode: string;
  testInput: (number | string)[];
  target?: number | string;
}): Promise<ReviewResult> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/playground-review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Playground review failed (${response.status})`);
  }

  return response.json();
}

/**
 * Dispatches sandboxed compilation/execution for C, C++, Java, or Python to the Express compiler execution endpoint.
 */
export async function apiExecuteCode(payload: {
  code: string;
  stdin?: string;
  language?: import("./compiler.types").SupportedLanguage;
}): Promise<CppExecutionResult> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/compiler/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.stderr || `Compilation service error (${response.status})`);
  }

  return response.json();
}

export const apiExecuteCpp = apiExecuteCode;

/**
 * Live Interview: Evaluates a candidate's submitted solution tier.
 */
export async function apiInterviewEvaluate(payload: {
  question: any;
  tier: "bruteForce" | "better" | "optimal";
  code: string;
  language: string;
  transcript?: string;
  previousTiers?: Record<string, boolean>;
}): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/interview-evaluate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Interview evaluation error (${response.status})`);
  }

  return response.json();
}

/**
 * Live Interview: Generates the comprehensive final scorecard rating out of 10.
 */
export async function apiInterviewScorecard(payload: {
  question: any;
  bruteForceCode: string;
  betterCode: string;
  optimalCode: string;
  tiersCompleted: string[];
  questionSubmissions?: any[];
  confidenceMetrics: any;
  proctoringMetrics: any;
  elapsedSeconds: number;
}): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/interview-scorecard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Scorecard generation error (${response.status})`);
  }

  return response.json();
}

/**
 * Live Interview: Ask interviewer a spoken question or request feedback.
 */
export async function apiInterviewRespond(payload: {
  question: any;
  tier: string;
  code: string;
  language?: string;
  candidateSpeech: string;
  transcriptHistory?: string;
  interviewStage?: import("./interview-types").InterviewFlowStage;
  coachingAction?: import("./interview-types").InterviewerCoachingAction;
  hintLevel?: number;
}): Promise<import("./interview-types").InterviewerResponseResult> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/interview-respond", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Interviewer respond error (${response.status})`);
  }

  return response.json();
}

/**
 * Live Interview: Retrieve LiveKit WebRTC access token if configured on the server.
 */
export async function apiGetLiveKitToken(room?: string, identity?: string): Promise<{
  configured: boolean;
  token?: string;
  url?: string;
  room?: string;
  identity?: string;
  message?: string;
}> {
  const authHeaders = await getAuthHeaders();
  const params = new URLSearchParams();
  if (room) params.append("room", room);
  if (identity) params.append("identity", identity);

  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/livekit-token${qs}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `LiveKit token error (${response.status})`);
  }

  return response.json();
}

/**
 * Live Interview: Run sample test cases and custom input against the candidate's code.
 */
export async function apiInterviewRunTests(payload: {
  question: any;
  code: string;
  language: string;
  customInput?: string;
}): Promise<import("./interview-types").InterviewSampleRunResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/interview-run-tests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Sample test execution error (${response.status})`);
  }

  return response.json();
}

/**
 * LeetCode-Style Editor: Run code against 3 sample test cases (+ optional custom input).
 */
export async function apiRunProblemTests(payload: {
  slug: string;
  title: string;
  difficulty?: string;
  topics?: string[];
  statement?: string;
  code: string;
  language: string;
  sampleCases?: import("./leetcode-testcases").LeetCodeSampleCase[];
  customInput?: string;
}): Promise<import("./leetcode-testcases").LeetCodeRunResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/problem-run-tests", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Run testcases failed (${response.status})`);
  }

  return response.json();
}

/**
 * LeetCode-Style Editor: Submit code against the 2-Stage Hybrid Stress & Edge-Case Judge Suite.
 */
export async function apiSubmitProblemCode(payload: {
  slug: string;
  title: string;
  difficulty?: string;
  topics?: string[];
  statement?: string;
  code: string;
  language: string;
  preverifiedRunResult?: import("./leetcode-testcases").LeetCodeRunResponse;
}): Promise<import("./leetcode-testcases").LeetCodeSubmitResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/problem-submit", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Submit evaluation failed (${response.status})`);
  }

  return response.json();
}

export interface UserKeyVaultProviderStatus {
  configured: boolean;
  maskedHint: string | null;
  updatedAt: string | null;
}

export interface UserKeyVaultStatus {
  hasPersonalKey: boolean;
  activeProvider: "gemini" | "openrouter" | "openai" | "none";
  providers: {
    gemini: UserKeyVaultProviderStatus;
    openrouter: UserKeyVaultProviderStatus;
    openai: UserKeyVaultProviderStatus;
  };
  securityMode: string;
}

/**
 * Fetches the non-sensitive status of the user's backend-encrypted API key vault.
 * Never returns raw or encrypted keys to the frontend.
 */
export async function apiGetUserKeyVaultStatus(): Promise<UserKeyVaultStatus> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/user-keys/status", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch key vault status (${response.status})`);
  }
  return response.json();
}

/**
 * Sends a user API key over HTTPS to the backend vault where it is verified, encrypted with AES-256-GCM,
 * and bound to an HttpOnly signed session cookie and authenticated UID.
 */
export async function apiSaveUserApiKey(payload: {
  apiKey: string;
  provider?: "gemini" | "openrouter" | "openai" | "auto";
  verify?: boolean;
}): Promise<{
  ok: boolean;
  provider?: "gemini" | "openrouter" | "openai";
  maskedHint?: string;
  verifiedModel?: string;
  error?: string;
  status?: UserKeyVaultStatus;
}> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/user-keys", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Failed to save API key (${response.status})`);
  }
  return data;
}

/**
 * Permanently removes a user's encrypted API key from the backend vault.
 */
export async function apiDeleteUserApiKey(
  provider: "gemini" | "openrouter" | "openai" | "all" = "all"
): Promise<{ ok: boolean; status: UserKeyVaultStatus }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/user-keys", {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ provider }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Failed to remove API key (${response.status})`);
  }
  return data;
}


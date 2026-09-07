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
 * Dispatches sandboxed C++ compilation to the Express compiler execution endpoint.
 */
export async function apiExecuteCpp(payload: {
  code: string;
  stdin?: string;
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


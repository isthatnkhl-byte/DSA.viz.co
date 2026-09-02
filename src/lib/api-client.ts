import type { ReviewResult, DatasetVizTrace } from "./review.functions";
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
 * Executes standard AI Pseudocode Review via Express REST API.
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
 * Requests a dataset visualization trace via Express REST API.
 */
export async function apiGenerateDatasetViz(payload: {
  slug: string;
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

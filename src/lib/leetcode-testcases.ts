export interface LeetCodeSampleCase {
  id: string;
  caseNumber: number;
  label: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
  isCustom?: boolean;
}

export interface LeetCodeCaseResult {
  caseNumber: number;
  label: string;
  category?: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stdout?: string;
  passed: boolean;
  runtimeMs: number;
  memoryMb?: number;
  explanation?: string;
  diffHint?: string;
  isCustom?: boolean;
}

export interface LeetCodeLearningDiagnostics {
  detectedPattern: string;
  keyInvariant: string;
  rootCause?: string;
  fixHint?: string;
  nextOptimizationTip: string;
}

export interface LeetCodeRunResponse {
  status: "Accepted" | "Wrong Answer" | "Compile Error" | "Runtime Error" | "Starter Template";
  summaryMessage: string;
  compilerOutput?: string;
  passedCount: number;
  totalCount: number;
  totalRuntimeMs: number;
  estimatedTimeComplexity: string;
  estimatedSpaceComplexity: string;
  optimalTimeComplexity?: string;
  optimalSpaceComplexity?: string;
  executionEngine?: string;
  learningDiagnostics?: LeetCodeLearningDiagnostics;
  cases: LeetCodeCaseResult[];
  verificationToken?: string;
  verifiedAt?: number;
}

export interface LeetCodeSubmitCategory {
  name: string;
  passed: number;
  total: number;
  status: "passed" | "failed" | "skipped";
}

export interface LeetCodeSubmitResponse {
  status: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error" | "Compile Error";
  summaryMessage: string;
  passedCases: number;
  totalCases: number;
  runtimeMs: number;
  runtimePercentile: number;
  memoryMb: number;
  memoryPercentile: number;
  timeComplexity: string;
  spaceComplexity: string;
  optimalTimeComplexity: string;
  optimalSpaceComplexity: string;
  executionEngine?: string;
  compilerOutput?: string;
  testedCases?: LeetCodeCaseResult[];
  failedCase?: {
    caseNumber: number;
    category: string;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    explanation: string;
  };
  categoryBreakdown: LeetCodeSubmitCategory[];
  aiInterviewerNotes: string;
  learningDiagnostics?: LeetCodeLearningDiagnostics;
}

export interface LeetCodeSubmissionHistoryEntry {
  id: string;
  timestamp: string;
  status: LeetCodeSubmitResponse["status"];
  language: string;
  runtimeMs: number;
  memoryMb: number;
  passedCases: number;
  totalCases: number;
  timeComplexity: string;
  spaceComplexity: string;
  code: string;
  verdict: LeetCodeSubmitResponse;
}

/**
 * Extracts official sample test cases directly from the problem statement markdown
 * or explicit examples without any hardcoded per-problem dictionaries or guessed outputs.
 */
export function extractThreeSampleCasesForProblem(params: {
  slug: string;
  title: string;
  topics?: string[];
  statement?: string;
  explicitExamples?: Array<{ input: string; output: string; explanation?: string }>;
}): LeetCodeSampleCase[] {
  const { statement = "", explicitExamples } = params;
  const extracted: LeetCodeSampleCase[] = [];

  // 1. If explicit examples are provided (e.g. in Live Interview questions), use them directly
  if (Array.isArray(explicitExamples) && explicitExamples.length > 0) {
    for (let i = 0; i < Math.min(5, explicitExamples.length); i++) {
      const ex = explicitExamples[i]!;
      extracted.push({
        id: `case_${i + 1}`,
        caseNumber: i + 1,
        label: `Case ${i + 1}`,
        input: ex.input.trim(),
        expectedOutput: ex.output.trim(),
        explanation: ex.explanation?.trim(),
      });
    }
  }

  // 2. Parse official Input: ... Output: ... blocks from the problem statement markdown
  if (extracted.length === 0 && statement) {
    const cleanText = statement
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');

    const regex =
      /Input:\s*([\s\S]{1,1600}?)\s*Output:\s*([^\n\r`]+)(?:[\s\S]{0,160}?Explanation:\s*([^\n\r`]+))?/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleanText)) !== null && extracted.length < 5) {
      const inputVal = (match[1] || "")
        .replace(/^\*\*|\*\*$/g, "")
        .replace(/```[a-zA-Z]*|```/g, "")
        .replace(/\s*\r?\n\s*/g, " ")
        .trim();
      const outputVal = (match[2] || "")
        .replace(/^\*\*|\*\*$/g, "")
        .replace(/```[a-zA-Z]*|```/g, "")
        .trim();
      const explanationVal = (match[3] || "").replace(/^\*\*|\*\*$/g, "").trim();

      if (inputVal && outputVal && !extracted.some((c) => c.input === inputVal)) {
        const num = extracted.length + 1;
        extracted.push({
          id: `case_${num}`,
          caseNumber: num,
          label: `Case ${num}`,
          input: inputVal,
          expectedOutput: outputVal,
          explanation: explanationVal || undefined,
        });
      }
    }
  }

  return extracted;
}

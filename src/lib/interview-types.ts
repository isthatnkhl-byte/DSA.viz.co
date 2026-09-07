import type { InterviewQuestion } from "./interview-questions";
import type { ConfidenceReport } from "./interview-audio";
import type { ProctoringState } from "./interview-proctoring";

export type SolutionTier = "bruteForce" | "better" | "optimal";

export interface TierEvaluationResult {
  passed: boolean;
  tier: SolutionTier;
  tierClassification: string;
  timeComplexity: string;
  spaceComplexity: string;
  spokenFeedback: string; // What the AI interviewer speaks aloud
  writtenNotes: string;
  socraticHint?: string; // If failed or partial
  codeHealth: {
    hasSyntaxErrors: boolean;
    hasOffByOne: boolean;
    isOptimalForTier: boolean;
  };
}

export interface InterviewScorecardResult {
  overallScore: number; // 0 to 10
  craftScore: number; // 0 to 10
  confidenceScore: number; // 0 to 10
  integrityScore: number; // 0 to 10
  hiringRecommendation: "Strong Hire" | "Hire" | "Leaning Hire" | "Needs Practice";
  spokenClosingFeedback: string;
  executiveSummary: string;
  tierBreakdown: {
    bruteForce: { completed: boolean; time: string; space: string; summary: string };
    better: { completed: boolean; time: string; space: string; summary: string };
    optimal: { completed: boolean; time: string; space: string; summary: string };
  };
  topStrengths: string[];
  areasForGrowth: string[];
  speechAnalysis: {
    wordsPerMinute: number;
    fillerWordCount: number;
    vocalSteadiness: number;
    hesitationPauses: number;
  };
  proctoringSummary: {
    strikes: number;
    tabSwitches: number;
    blurCount: number;
  };
}

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

export interface InterviewTemplate {
  id: string;
  title: string;
  tagline: string;
  description: string;
  questionCount: number;
  perQuestionMinutes: number;
  totalMinutes: number;
  difficulty: "Mixed" | "Medium" | "Hard";
}

export interface QuestionSubmissionSnapshot {
  questionId: string;
  questionTitle: string;
  timeSpentSeconds: number;
  tiersCompleted: Record<SolutionTier, boolean>;
  tierCodes: Record<SolutionTier, string>;
  tierEvaluations: Record<SolutionTier, TierEvaluationResult | null>;
  scorecardPartial?: {
    passedTiers: number;
    highestTierReached: SolutionTier;
  };
}

export type CameraTrackingStatus = "ok" | "looking_away" | "multiple_faces" | "no_face";

export interface CameraTrackingState {
  status: CameraTrackingStatus;
  faceCount: number;
  yawDegrees: number;
  pitchDegrees: number;
  isLookingAway: boolean;
  alertMessage: string | null;
  lastViolationTimestamp?: string;
}

export type InterviewFlowStage = "clarify" | "approach" | "implement" | "verify";

export type InterviewerCoachingAction =
  | "general"
  | "clarify_constraints"
  | "pitch_approach"
  | "dry_run"
  | "complexity_check"
  | "progressive_hint";

export interface InterviewerResponseResult {
  spokenText: string;
  writtenNote: string;
  suggestedStage?: InterviewFlowStage;
  detectedComplexity?: {
    time: string;
    space: string;
  };
  followUpPrompt?: string;
  hintLevel?: number;
}

export interface ConversationalTranscriptItem {
  id: string;
  timestamp: string;
  speaker: "candidate" | "interviewer";
  text: string;
  type?: "speech" | "hint" | "evaluation" | "greeting" | "question" | "coaching";
  stage?: InterviewFlowStage;
  coachingAction?: InterviewerCoachingAction;
  followUpPrompt?: string;
  detectedComplexity?: {
    time: string;
    space: string;
  };
  hintLevel?: number;
}

export interface VoiceEngineSettings {
  voiceURI: string;
  rate: number; // default 0.95
  pitch: number; // default 1.0
  interSentencePauseMs: number; // default 200ms
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
    cameraViolations?: number;
    isTerminated?: boolean;
  };
  questionSubmissions?: QuestionSubmissionSnapshot[];
  audioRecordingUrl?: string;
}

export interface InterviewSampleTestCaseResult {
  caseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  runtimeMs: number;
  explanation?: string;
  isCustom?: boolean;
}

export interface InterviewSampleRunResponse {
  status: "passed" | "failed" | "compile_error" | "incomplete";
  summaryMessage: string;
  compilerOutput?: string;
  estimatedTimeComplexity?: string;
  estimatedSpaceComplexity?: string;
  passedCount: number;
  totalCount: number;
  cases: InterviewSampleTestCaseResult[];
}


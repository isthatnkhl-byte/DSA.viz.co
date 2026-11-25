import { z } from "zod";

/** Canonical pattern identifiers for the Master Patterns curriculum. */
export const PATTERN_IDS = [
  "two-pointers",
  "sliding-window",
  "fast-slow-pointers",
  "binary-search",
  "prefix-sum-hashmap",
  "monotonic-stack",
  "intervals-sweep",
  "heap-top-k",
  "trees-dfs-bfs",
  "graphs-topo-union-find",
  "backtracking",
  "dynamic-programming",
] as const;

export type PatternId = (typeof PATTERN_IDS)[number];

export const PatternIdSchema = z.enum(PATTERN_IDS);

export const TRACK_MODES = ["intermediate", "pro"] as const;
export type TrackMode = (typeof TRACK_MODES)[number];
export const TrackModeSchema = z.enum(TRACK_MODES);

export const QUESTION_MODALITIES = [
  "mcq",
  "verbal_text",
  "code_snippet",
  "twisted_followup",
] as const;
export type QuestionModality = (typeof QUESTION_MODALITIES)[number];
export const QuestionModalitySchema = z.enum(QUESTION_MODALITIES);

export const TWIST_OPERATORS = [
  "constraint-twist",
  "reverse-premise",
  "break-the-premise",
  "discrimination",
] as const;
export type TwistOperator = (typeof TWIST_OPERATORS)[number];
export const TwistOperatorSchema = z.enum(TWIST_OPERATORS);

/**
 * Fine-grained miss taxonomy combining LearnHarness's practice doctrine
 * (cue, discrimination, execution, careless, structural) with DSA-specific
 * invariant and asymptotic optimization failures.
 */
export const MISS_CLASSES = [
  "cue",
  "discrimination",
  "invariant-break",
  "execution",
  "complexity-suboptimal",
  "careless",
  "structural",
] as const;
export type MissClass = (typeof MISS_CLASSES)[number];
export const MissClassSchema = z.enum(MISS_CLASSES);

export const HINT_RUNGS = ["R0", "R1", "R2", "R3", "R4", "R5"] as const;
export type HintRung = (typeof HINT_RUNGS)[number];
export const HintRungSchema = z.enum(HINT_RUNGS);

export const SUPPORTED_CODE_LANGUAGES = [
  "cpp",
  "python",
  "java",
  "typescript",
  "javascript",
] as const;
export type PatternCodeLanguage = (typeof SUPPORTED_CODE_LANGUAGES)[number];
export const PatternCodeLanguageSchema = z.enum(SUPPORTED_CODE_LANGUAGES);

// ─── Static Canonical Pattern DAG Definitions ────────────────────────────────

export interface PatternStrandDef {
  /** Globally unique strand ID, e.g. "sliding-window:monotonicity-condition". */
  id: string;
  patternId: PatternId;
  title: string;
  /** LearnHarness Principle i: caveat-free foundational truth. */
  unconditionalTruth: string;
  /** Loop/recursion invariant that makes the pattern hold. */
  coreInvariant: string;
  /** Most frequent interview pitfall for this strand. */
  commonTrap: string;
  /** Upstream prerequisite strand IDs (same pattern or cross-pattern). */
  prerequisiteStrandIds: string[];
  /** Relative importance weight (1-3) for dependency fanout scheduling. */
  fanoutWeight: number;
}

export interface PatternEdge {
  from: string;
  to: string;
  kind: "internal" | "cross-pattern";
}

export interface ConfusableTwin {
  twinPatternId: PatternId;
  distinguishingCue: string;
}

export interface TwistTemplate {
  operator: TwistOperator;
  targetStrandId: string;
  promptTemplate: string;
  whatItBreaks: string;
}

export interface ProCaseStudySeed {
  title: string;
  targetStrandId: string;
  prompt: string;
  constraints: string;
  optimalTime: string;
  optimalSpace: string;
  optimizationTrap: string;
  starterCode: Record<"cpp" | "python" | "java" | "typescript", string>;
}

export interface PatternDefinition {
  id: PatternId;
  title: string;
  subtitle: string;
  category: "Linear & Window" | "Search & Partition" | "Stacks, Heaps & Intervals" | "Graphs & Trees" | "Recursion & DP";
  interviewFrequency: "Very High" | "High" | "Core";
  whiteboardQuery: string;
  linkedProblemSlugs: string[];
  strands: PatternStrandDef[];
  confusableTwins: ConfusableTwin[];
  twistTemplates: TwistTemplate[];
  proCaseStudy: ProCaseStudySeed;
}

// ─── O(1) Bounded Per-User Cognitive Profile (Firestore-safe) ───────────────

export const MAX_ERROR_SIGNATURES = 20;
export const MAX_RECENT_SESSIONS = 10;
export const MAX_GAP_NOTE_CHARS = 240;
export const MAX_PATTERNS_PER_PROFILE = 12;

export const STRAND_STATUSES = [
  "untouched",
  "gap",
  "remediated",
  "mastered",
] as const;
export type StrandStatus = (typeof STRAND_STATUSES)[number];
export const StrandStatusSchema = z.enum(STRAND_STATUSES);

export const StrandStateSchema = z.object({
  strandId: z.string().min(1).max(100),
  patternId: PatternIdSchema,
  mastery: z.number().min(0).max(100),
  /** FSRS-lite memory stability in days (grows on clean/twisted passes, shrinks on miss). */
  stabilityDays: z.number().min(0.25).max(365),
  attempts: z.number().int().min(0),
  streak: z.number().int().min(0),
  status: StrandStatusSchema,
  /** Positive = overconfident (right option/code, weak verbal reasoning); Negative = hesitant. */
  calibrationBias: z.number().min(-100).max(100),
  lastMissClass: MissClassSchema.nullable(),
  lastHintRung: HintRungSchema.nullable(),
  /** Short bounded diagnostic summary (never an unbounded transcript). */
  gapNote: z.string().max(MAX_GAP_NOTE_CHARS).nullable(),
  lastPracticedAt: z.string().nullable(),
  nextReviewAt: z.string().nullable(),
});
export type StrandState = z.infer<typeof StrandStateSchema>;

export const ErrorSignatureSchema = z.object({
  /** Canonical normalized key, e.g. "sliding-window::if-instead-of-while". */
  signatureKey: z.string().min(1).max(120),
  patternId: PatternIdSchema,
  strandId: z.string().min(1).max(100),
  missClass: MissClassSchema,
  summary: z.string().min(1).max(MAX_GAP_NOTE_CHARS),
  recurrenceCount: z.number().int().min(1),
  status: z.enum(["active", "repaired"]),
  lastSeenAt: z.string(),
  repairedAt: z.string().nullable(),
});
export type ErrorSignature = z.infer<typeof ErrorSignatureSchema>;

export const CognitiveProfileSchema = z.object({
  preferredLanguage: PatternCodeLanguageSchema,
  dominantMissClass: MissClassSchema.nullable(),
  /** Running count of each MissClass across sessions for personalized coaching. */
  missHistogram: z.record(MissClassSchema, z.number().int().min(0)),
  /** Tracks divergence between verbal approach quality and code correctness (-100..100). */
  verbalToCodeGap: z.number().min(-100).max(100),
  /** Success rate (0..100) on twisted indirect follow-up questions per operator. */
  twistResilience: z.record(TwistOperatorSchema, z.number().min(0).max(100)),
  totalTwistsAttempted: z.number().int().min(0),
  totalTwistsPassed: z.number().int().min(0),
});
export type CognitiveProfile = z.infer<typeof CognitiveProfileSchema>;

export const PatternSummaryRecordSchema = z.object({
  patternId: PatternIdSchema,
  lastTrack: TrackModeSchema.nullable(),
  completenessScore: z.number().min(0).max(100),
  optimizationScore: z.number().min(0).max(100),
  sessionsCompleted: z.number().int().min(0),
  lastPracticedAt: z.string().nullable(),
});
export type PatternSummaryRecord = z.infer<typeof PatternSummaryRecordSchema>;

export const RecentSessionDigestSchema = z.object({
  sessionId: z.string().min(1).max(80),
  patternId: PatternIdSchema,
  track: TrackModeSchema,
  overallScore: z.number().min(0).max(100),
  resolvedGaps: z.number().int().min(0),
  remainingGaps: z.number().int().min(0),
  completedAt: z.string(),
});
export type RecentSessionDigest = z.infer<typeof RecentSessionDigestSchema>;

/**
 * Single O(1)-bounded document persisted per user in Firestore
 * (`users/{uid}/pattern_mastery/profile`).
 */
export const UserPatternProfileSchema = z.object({
  userId: z.string().min(1).max(128),
  version: z.number().int().min(1),
  cognitiveProfile: CognitiveProfileSchema,
  patternSummaries: z.record(z.string(), PatternSummaryRecordSchema),
  strands: z.record(z.string(), StrandStateSchema),
  errorSignatures: z.array(ErrorSignatureSchema).max(MAX_ERROR_SIGNATURES),
  recentSessions: z.array(RecentSessionDigestSchema).max(MAX_RECENT_SESSIONS),
  updatedAt: z.string(),
});
export type UserPatternProfile = z.infer<typeof UserPatternProfileSchema>;

// ─── Session, Notes, Questions, Grading & Scorecard Contracts ────────────────

export const StructuredPatternNotesSchema = z.object({
  patternId: PatternIdSchema,
  title: z.string(),
  prunedStrandIds: z.array(z.string()),
  highlightedTrapNotes: z.array(z.string()),
  unconditionalTruths: z.array(
    z.object({
      title: z.string(),
      statement: z.string(),
    }),
  ),
  motivatedDiscovery: z.object({
    bruteForceBottleneck: z.string(),
    keyInsight: z.string(),
    whyItWorks: z.string(),
  }),
  canonicalTemplate: z.object({
    language: PatternCodeLanguageSchema,
    code: z.string(),
    invariantAnnotation: z.string(),
  }),
  pitfalls: z.array(
    z.object({
      trap: z.string(),
      counterexample: z.string(),
      fix: z.string(),
    }),
  ),
});
export type StructuredPatternNotes = z.infer<typeof StructuredPatternNotesSchema>;

export const QuizOptionItemSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});
export type QuizOptionItem = z.infer<typeof QuizOptionItemSchema>;

/**
 * Committed BEFORE the learner answers (LearnHarness Commitment Rule)
 * and stripped from client responses until graded.
 */
export const PreCommittedRubricSchema = z.object({
  correctOptionValues: z.array(z.string()).optional(),
  expectedReasoning: z.string(),
  expectedComplexity: z
    .object({
      time: z.string(),
      space: z.string(),
    })
    .optional(),
  keyInvariantsRequired: z.array(z.string()),
  /** Maps wrong option value -> probable wrong mental model. */
  distractorMentalModels: z.record(z.string(), z.string()).optional(),
});
export type PreCommittedRubric = z.infer<typeof PreCommittedRubricSchema>;

export const PatternQuestionCardSchema = z.object({
  id: z.string(),
  patternId: PatternIdSchema,
  strandId: z.string(),
  modality: QuestionModalitySchema,
  phase: z.enum([
    "calibration",
    "probe",
    "guided",
    "gauntlet",
    "case_study",
    "twisted_remediation",
  ]),
  /** Mirrors LearnHarness predict/check cycle + applied twist role. */
  questionRole: z.enum(["predict", "check", "apply"]).optional(),
  twistOperator: TwistOperatorSchema.optional(),
  prompt: z.string(),
  contextSnippet: z.string().optional(),
  options: z.array(QuizOptionItemSchema).optional(),
  multiSelect: z.boolean().optional(),
  allowIdk: z.boolean().default(true),
  requireVerbalApproach: z.boolean().default(true),
  codeStarter: z
    .object({
      language: PatternCodeLanguageSchema,
      starter: z.string(),
      constraints: z.string().optional(),
      sampleInput: z.string().optional(),
      expectedBehavior: z.string().optional(),
    })
    .optional(),
  /** Server-only commitment; omitted when serialized to the browser before submission. */
  rubric: PreCommittedRubricSchema.optional(),
});
export type PatternQuestionCard = z.infer<typeof PatternQuestionCardSchema>;

export const SubmissionPayloadSchema = z.object({
  sessionId: z.string().min(1),
  questionId: z.string().min(1),
  attemptId: z.string().min(1),
  selectedOptions: z.array(z.string()).optional(),
  choseIdk: z.boolean().optional(),
  verbalAnswer: z.string().max(6000).optional(),
  code: z.string().max(15000).optional(),
  language: PatternCodeLanguageSchema.optional(),
  claimedTimeComplexity: z.string().max(120).optional(),
  claimedSpaceComplexity: z.string().max(120).optional(),
  runSandbox: z.boolean().optional(),
});
export type SubmissionPayload = z.infer<typeof SubmissionPayloadSchema>;

export const CodeOptimizationAuditSchema = z.object({
  tier: z.enum(["Incomplete", "Brute Force", "Better", "Optimal"]),
  detectedTime: z.string(),
  detectedSpace: z.string(),
  optimalTime: z.string(),
  optimalSpace: z.string(),
  timeScore: z.number().min(0).max(100),
  spaceScore: z.number().min(0).max(100),
  optimizationFeedback: z.string(),
    sandboxOutcome: z
    .object({
      ran: z.boolean(),
      passed: z.boolean(),
      testsPassed: z.number().int().min(0).optional(),
      testsTotal: z.number().int().min(0).optional(),
      stdout: z.string(),
      stderr: z.string(),
    })
    .optional(),
});
export type CodeOptimizationAudit = z.infer<typeof CodeOptimizationAuditSchema>;

export const SubmissionEvaluationSchema = z.object({
  questionId: z.string(),
  strandId: z.string(),
  isCorrect: z.boolean(),
  /** True when user picked right option or passed tests, yet verbal reasoning/complexity showed a flaw. */
  hiddenGapDetected: z.boolean(),
  score: z.number().min(0).max(100),
  missClass: MissClassSchema.nullable(),
  hintRung: HintRungSchema.nullable(),
  errorSignatureKey: z.string().nullable(),
  verdictSummary: z.string(),
  /** Surgical targeted micro-lesson when a gap/miss is found. */
  surgicalTeaching: z.string().nullable(),
  /** Revealed committed answer/reasoning after submission. */
  committedAnswerReveal: z.string(),
  codeAudit: CodeOptimizationAuditSchema.optional(),
  /** Instant twisted indirect question generated when a gap needs repair. */
  twistedFollowUp: PatternQuestionCardSchema.nullable(),
  /** Next regular question if no remediation twist is pending. */
  nextQuestion: PatternQuestionCardSchema.nullable(),
  readyForScorecard: z.boolean(),
});
export type SubmissionEvaluation = z.infer<typeof SubmissionEvaluationSchema>;

export const MasteryScorecardSchema = z.object({
  sessionId: z.string(),
  patternId: PatternIdSchema,
  track: TrackModeSchema,
  overallScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  optimizationScore: z.number().min(0).max(100).nullable(),
  verbalClarityScore: z.number().min(0).max(100),
  strandBreakdown: z.array(
    z.object({
      strandId: z.string(),
      title: z.string(),
      score: z.number().min(0).max(100),
      status: StrandStatusSchema,
    }),
  ),
  strengths: z.array(z.string()),
  gapsToReinforce: z.array(
    z.object({
      strandId: z.string(),
      summary: z.string(),
      missClass: MissClassSchema,
    }),
  ),
  recommendedProblemSlugs: z.array(z.string()),
  completedAt: z.string(),
});
export type MasteryScorecard = z.infer<typeof MasteryScorecardSchema>;

export type SessionStage =
  | "calibration"
  | "probing"
  | "studying_notes"
  | "questioning"
  | "remediating"
  | "completed";

export interface ProbeStrandObservation {
  strandId: string;
  floor: string;
  ceiling: string;
  evidence: string;
}

export interface CalibrationProbeState {
  questionsAsked: number;
  answers: Array<{
    strandId: string;
    isCorrect: boolean;
    score: number;
  }>;
  strandsObserved?: ProbeStrandObservation[];
  recommendedTrack: TrackMode | null;
  recommendationRationale: string | null;
}

export interface QuestionHintEntry {
  rung: HintRung;
  label: string;
  hintText: string;
}

export interface PatternSessionState {
  sessionId: string;
  userId: string;
  patternId: PatternId;
  track: TrackMode | null;
  stage: SessionStage;
  probeState?: CalibrationProbeState;
  notes: StructuredPatternNotes | null;
  currentQuestion: PatternQuestionCard | null;
  /** LearnHarness-style progressive R0..R3 hints issued on the active question. */
  currentQuestionHints?: QuestionHintEntry[];
  questionHistory: Array<{
    questionId: string;
    strandId: string;
    modality: QuestionModality;
    score: number;
    missClass: MissClass | null;
    highestHintRung?: HintRung | null;
    verbalSummary?: string;
  }>;
  pendingRemediationStrands: string[];
  /** Failed/hint-heavy strands queued for fresh-surface retesting before completion. */
  retestQueue?: string[];
  resolvedStrandsInSession: string[];
  processedAttemptIds: string[];
  lastEvaluation: SubmissionEvaluation | null;
  scorecard: MasteryScorecard | null;
  createdAt: string;
  updatedAt: string;
}

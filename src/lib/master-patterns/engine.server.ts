import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import {
  getPatternDefinition,
  getStrandDefinition,
} from "../../data/patterns";
import {
  extractJson,
  getGeminiKey,
  getOpenAIKey,
  getOpenRouterKey,
} from "../openrouter.server";
import { runSecureCode } from "../compiler/index";
import type { SupportedLanguage } from "../compiler.types";
import {
  buildCaseStudyTestProgram,
  parseDriverTestSummary,
} from "./test-drivers";
import {
  applyStrandReviewUpdate,
  classifyConfidenceCalibration,
  computeEffectiveStrandMastery,
  computePatternAggregateMetrics,
  pruneKnownPrereqStrands,
  rankStrandsForPattern,
  recordCompletedSessionDigest,
} from "./scheduler";
import {
  analyzeContextBudget,
  DEFAULT_CONTEXT_BUDGET_CHARS,
} from "./context-window";
import { expandCitationsForModel } from "./citations";
import { validateAndIngestSubmittedImages } from "./image-intake";
import { collectPendingSideUpdates } from "./side-chat";
import {
  createDeliverEvaluationTool,
  createDeliverNotesTool,
  createDeliverQuestionTool,
  createExecuteCodeSandboxTool,
  createGenerateVerifiedVisualTool,
  createLookupStrandDagTool,
  createSearchPatternProblemsTool,
  mapLanguageForSandbox,
  parseDeliveredOrJsonFallback,
  resolvePatternAgentRole,
  runPatternRoleAgentLoop,
  type PatternAgentLoopCallbacks,
  type PatternAgentTool,
  type PatternModelStepCaller,
} from "./agent-tools.server";
import {
  buildDeterministicPatternSvg,
  generateAndVerifyPatternVisual,
  type VisualModelCaller,
} from "./visual-agent.server";
import {
  scoreVerbalExplanation,
} from "./matcher";
import {
  healEncodedFields,
  healEvaluationPayload,
  healMissClass,
  stripModelValueDebris,
  validateAndHealQuestionCard,
} from "./healer";
import {
  CodeOptimizationAuditSchema,
  HintRungSchema,
  PatternQuestionCardSchema,
  StructuredPatternNotesSchema,
  TWIST_OPERATORS,
  type CodeOptimizationAudit,
  type GeneratedVisualArtifact,
  type HintRung,
  type ImageSnapshot,
  type MasteryScorecard,
  type MissClass,
  type PatternCodeLanguage,
  type PatternDefinition,
  type PatternId,
  type PatternQuestionCard,
  type PatternSessionState,
  type PatternStrandDef,
  type PatternTurnActionInput,
  type ProbeStrandObservation,
  type QuestionHintEntry,
  type StructuredPatternNotes,
  type SubmissionEvaluation,
  type SubmissionPayload,
  type TrackMode,
  type TwistOperator,
  type UserPatternProfile,
} from "./types";

const MAX_QUESTIONS_INTERMEDIATE = 4;
const MAX_QUESTIONS_PRO = 3; // 2 gauntlet questions + 1 case study code snippet
const MAX_TWISTS_PER_SESSION = 3;
const MAX_RETESTS_PER_SESSION = 2;

const HINT_RUNG_ORDER: Record<HintRung, number> = {
  R0: 1,
  R1: 2,
  R2: 3,
  R3: 4,
  R4: 5,
  R5: 6,
};

const HINT_LADDER_LEVELS: Array<{
  rung: "R0" | "R1" | "R2" | "R3";
  label: string;
  guidance: string;
}> = [
  {
    rung: "R0",
    label: "Structural Framing Cue",
    guidance:
      "Point the learner toward the underlying invariant family or constraint condition without revealing any rule or option.",
  },
  {
    rung: "R1",
    label: "Targeted Boundary Check",
    guidance:
      "Name the critical boundary variable or failure scenario they should stress-test, without explaining the fix completely.",
  },
  {
    rung: "R2",
    label: "Concrete Counterexample Trace",
    guidance:
      "Show a tiny 3-4 element example where the naive assumption breaks vs holds, stopping before the final conclusion.",
  },
  {
    rung: "R3",
    label: "Deep Structural Scaffold",
    guidance:
      "Lay out the invariant equation or structural step except for the final decision the learner must justify.",
  },
];

function maxHintRung(a: HintRung | null, b: HintRung | null): HintRung | null {
  if (!a) return b;
  if (!b) return a;
  return HINT_RUNG_ORDER[a] >= HINT_RUNG_ORDER[b] ? a : b;
}

/**
 * Priority-tiered bounded handoff summary (`context-window.ts`):
 * preserves P0 control anchors (RetestQueue, DAG blockers, Probe bounds) & P1 active
 * error signatures while compacting older turns and recent verbal snippets <= 1200 chars.
 */
export function buildSessionDigest(
  session?: Pick<
    PatternSessionState,
    | "probeState"
    | "questionHistory"
    | "retestQueue"
    | "resolvedStrandsInSession"
  > &
    Partial<
      Pick<
        PatternSessionState,
        | "patternId"
        | "pendingRemediationStrands"
        | "sideChats"
        | "sideDeliveryWatermarks"
      >
    > | null,
  profile?: UserPatternProfile,
  targetStrandId?: string,
  maxChars: number = DEFAULT_CONTEXT_BUDGET_CHARS,
): string {
  if (!session) return "No prior in-session turns.";
  const normalizedSession = {
    patternId:
      session.patternId ?? ("two-pointers" as PatternId),
    probeState: session.probeState,
    questionHistory: session.questionHistory,
    pendingRemediationStrands: session.pendingRemediationStrands ?? [],
    retestQueue: session.retestQueue,
    resolvedStrandsInSession: session.resolvedStrandsInSession,
  };
  const sideDelta =
    session.sideChats && session.sideChats.length > 0
      ? collectPendingSideUpdates({
          sideChats: session.sideChats,
          sideDeliveryWatermarks: session.sideDeliveryWatermarks,
        })
      : null;
  return analyzeContextBudget({
    session: normalizedSession,
    profile,
    targetStrandId,
    sideUpdatesText: sideDelta?.deliveredCount
      ? sideDelta.updatesPromptText
      : undefined,
    maxChars,
  }).packet;
}

export type PatternAiCaller = (
  systemPrompt: string,
  userPrompt: string,
) => Promise<Record<string, unknown> | null>;

function isConfiguredKey(key?: string | null): boolean {
  if (!key) return false;
  const c = key.trim().replace(/^["']|["']$/g, "").trim();
  if (c.length < 15) return false;
  if (
    c.startsWith("your_") ||
    c.includes("api_key_here") ||
    c.includes("placeholder")
  ) {
    return false;
  }
  return true;
}

interface GeminiModelCacheGlobal {
  __dsavizPatternWorkingGeminiModel?: { model: string; cachedAt: number };
}

function getPreferredGeminiCandidates(): string[] {
  const base = [
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
  ];
  const g = globalThis as typeof globalThis & GeminiModelCacheGlobal;
  const cached = g.__dsavizPatternWorkingGeminiModel;
  if (cached && Date.now() - cached.cachedAt < 30 * 60_000) {
    return [cached.model, ...base.filter((m) => m !== cached.model)];
  }
  return base;
}

function rememberWorkingGeminiModel(model: string): void {
  const g = globalThis as typeof globalThis & GeminiModelCacheGlobal;
  g.__dsavizPatternWorkingGeminiModel = { model, cachedAt: Date.now() };
}

/**
 * Default multi-provider JSON caller respecting BYOK Key Vault context
 * (Gemini with working-model cache -> OpenAI -> OpenRouter -> null offline fallback).
 */
export const defaultPatternAiCaller: PatternAiCaller = async (
  systemPrompt: string,
  userPrompt: string,
) => {
  const geminiKey = getGeminiKey();
  if (isConfiguredKey(geminiKey)) {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    const candidates = getPreferredGeminiCandidates();
    for (const model of candidates) {
      try {
        const resp = await Promise.race([
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              temperature: 0.35,
            },
          }),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("Gemini model timeout")), 18000),
          ),
        ]);
        const parsed = extractJson(resp.text || "");
        if (parsed && typeof parsed === "object") {
          rememberWorkingGeminiModel(model);
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Try next Gemini model
      }
    }
  }

  const openAIKey = getOpenAIKey();
  if (isConfiguredKey(openAIKey)) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.35,
          max_tokens: 4096,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const parsed = extractJson(data?.choices?.[0]?.message?.content || "");
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, unknown>;
        }
      }
    } catch {
      // Fall through to OpenRouter
    }
  }

  const openRouterKey = getOpenRouterKey();
  if (isConfiguredKey(openRouterKey)) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "X-Title": "DSA.viz Master Patterns",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.35,
          max_tokens: 4096,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const parsed = extractJson(data?.choices?.[0]?.message?.content || "");
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, unknown>;
        }
      }
    } catch {
      // Deterministic fallback handles offline/keyless environments
    }
  }

  return null;
};

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
}

export interface PatternEngineDeps {
  aiCaller?: PatternAiCaller;
  stepCaller?: PatternModelStepCaller;
  codeRunner?: typeof runSecureCode;
  visualModelCaller?: VisualModelCaller;
  turnCallbacks?: PatternAgentLoopCallbacks;
  signal?: AbortSignal;
}

async function callPatternAgentWithFallback(opts: {
  role: "prober" | "teacher" | "practitioner";
  systemPrompt: string;
  userPrompt: string;
  images?: ImageSnapshot[];
  session?: PatternSessionState;
  profile: UserPatternProfile;
  deps: PatternEngineDeps;
  deliverableTool?: PatternAgentTool<any>;
  onVisualGenerated?: (visual: GeneratedVisualArtifact) => void;
}): Promise<Record<string, unknown> | null> {
  // Preserve direct JSON mock/offline test determinism when `aiCaller` is injected explicitly
  if (opts.deps.aiCaller && !opts.deps.stepCaller) {
    return opts.deps.aiCaller(opts.systemPrompt, opts.userPrompt);
  }

  const tools: PatternAgentTool<any>[] = [
    createLookupStrandDagTool(),
    createSearchPatternProblemsTool(),
    createGenerateVerifiedVisualTool(),
  ];
  if (opts.role === "practitioner") {
    tools.push(createExecuteCodeSandboxTool());
  }
  if (opts.deliverableTool) {
    tools.push(opts.deliverableTool);
  }

  const toolHint = opts.deliverableTool
    ? `\n\nTool Workflow: You may call read-only tools (lookup_strand_dag, search_pattern_problems, generate_verified_visual${opts.role === "practitioner" ? ", execute_code_sandbox" : ""}) up to 2 times if helpful, then MUST call \`${opts.deliverableTool.name}\` to commit your final structured output.`
    : "";

  const dummySession: PatternSessionState =
    opts.session ??
    createNewPatternSession(opts.profile.userId, "two-pointers");

  const loopResult = await runPatternRoleAgentLoop({
    role: opts.role,
    systemPrompt: `${opts.systemPrompt}${toolHint}`,
    userPrompt: opts.userPrompt,
    images: opts.images,
    tools,
    toolCtx: {
      session: dummySession,
      profile: opts.profile,
      codeRunner: opts.deps.codeRunner,
      visualModelCaller: opts.deps.visualModelCaller,
      sandboxCallsUsed: 0,
    },
    stepCaller: opts.deps.stepCaller,
    maxSteps: 4,
    signal: opts.deps.signal,
    callbacks: opts.deps.turnCallbacks,
  });

  if (loopResult.generatedVisual) {
    opts.onVisualGenerated?.(loopResult.generatedVisual);
  }
  if (loopResult.aborted) return null;

  return parseDeliveredOrJsonFallback(
    loopResult,
    opts.deliverableTool?.name ?? "",
  );
}

export interface CalibrationView {
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

export function buildCalibrationView(
  patternId: PatternId,
  profile: UserPatternProfile,
): CalibrationView {
  const pattern = getPatternDefinition(patternId);
  if (!pattern) {
    throw new Error(`Unknown pattern: ${patternId}`);
  }

  const activeSigs = profile.errorSignatures.filter(
    (s) => s.patternId === patternId && s.status === "active",
  );
  let sum = 0;
  let due = 0;
  const now = Date.now();
  for (const s of pattern.strands) {
    const st = profile.strands[s.id];
    sum += computeEffectiveStrandMastery(st, now);
    if (st?.nextReviewAt && Date.parse(st.nextReviewAt) < now) due++;
  }
  const priorMasteryPercent = Math.round(sum / pattern.strands.length);

  const personalizedWarnings = activeSigs.map(
    (s) => `Recurring gap (${s.recurrenceCount}x): ${s.summary}`,
  );

  const aiPrompt =
    priorMasteryPercent >= 55
      ? `You have ${priorMasteryPercent}% familiarity on ${pattern.title}${activeSigs.length > 0 ? ` with ${activeSigs.length} active misconception(s) to repair` : ""}. Are you looking for structured notes + guided checks (Intermediate), or direct edge-case questions + a timed optimization snippet (Pro)?`
      : `You selected ${pattern.title}. Before we start: do you have a basic idea and want structured invariant notes followed by guided mastery checks (Intermediate), or are you ready for direct questions and a case-study coding optimization audit (Pro)?`;

  return {
    patternId,
    title: pattern.title,
    aiPrompt,
    priorMasteryPercent,
    activeGapsCount: activeSigs.length,
    dueReviewCount: due,
    personalizedWarnings,
    options: [
      {
        track: "intermediate",
        label: "Intermediate (Structured Notes + Guided Checks)",
        description:
          "Study first-principles notes tailored to your gaps, answer predict/check questions with verbal reasoning, and get rated on completeness & mastery.",
      },
      {
        track: "pro",
        label: "Pro (Direct Gauntlet + Case-Study Code Audit)",
        description:
          "Skip notes. Face indirect invariant questions + write a short case-study snippet rated on Time/Space complexity and optimization.",
      },
    ],
  };
}

export function createNewPatternSession(
  userId: string,
  patternId: PatternId,
): PatternSessionState {
  const pattern = getPatternDefinition(patternId);
  if (!pattern) {
    throw new Error(`Unknown pattern: ${patternId}`);
  }
  const now = new Date().toISOString();
  return {
    sessionId: uid("mp"),
    userId,
    patternId,
    track: null,
    stage: "calibration",
    notes: null,
    currentQuestion: null,
    currentQuestionHints: [],
    questionHistory: [],
    pendingRemediationStrands: [],
    retestQueue: [],
    resolvedStrandsInSession: [],
    processedAttemptIds: [],
    lastEvaluation: null,
    scorecard: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Tailored Intermediate Notes Generator ───────────────────────────────────

function buildDeterministicNotes(
  pattern: PatternDefinition,
  profile: UserPatternProfile,
  prunedStrandIds: string[],
  session?: PatternSessionState,
): StructuredPatternNotes {
  const activeSigs = profile.errorSignatures.filter(
    (s) => s.patternId === pattern.id && s.status === "active",
  );
  const probeObservedNotes = (session?.probeState?.strandsObserved ?? [])
    .filter((o) => o.floor === "Needs invariant review")
    .map((o) => `Probe gap (${o.strandId.split(":")[1] ?? o.strandId}): ${o.evidence}`);
  const highlightedTrapNotes = [
    ...probeObservedNotes,
    ...activeSigs.map((s) => `Your prior gap: ${s.summary}`),
    ...(profile.cognitiveProfile.dominantMissClass
      ? [
          `Watch your dominant pattern miss (${profile.cognitiveProfile.dominantMissClass}): verify the invariant verbally before locking an answer.`,
        ]
      : []),
  ].slice(0, 4);

  const lang = profile.cognitiveProfile.preferredLanguage;
  const starterLang: "cpp" | "python" | "java" | "typescript" =
    lang === "python" || lang === "java" || lang === "typescript"
      ? lang
      : "cpp";

  return {
    patternId: pattern.id,
    title: `${pattern.title} — First-Principles Dossier`,
    prunedStrandIds,
    highlightedTrapNotes,
    unconditionalTruths: pattern.strands.slice(0, 3).map((s) => ({
      title: s.title,
      statement: s.unconditionalTruth,
    })),
    motivatedDiscovery: {
      bruteForceBottleneck: `Naive enumeration re-evaluates overlapping states/ranges in O(n^2) or higher because it ignores monotonic structure across adjacent states.`,
      keyInsight:
        pattern.strands[0]?.coreInvariant ??
        "Maintain a single verifiable loop invariant that eliminates invalid candidates permanently.",
      whyItWorks: `By proving why discarded choices cannot improve the answer, ${pattern.title} achieves ${pattern.proCaseStudy.optimalTime} time and ${pattern.proCaseStudy.optimalSpace} space.`,
    },
    canonicalTemplate: {
      language: starterLang,
      code: pattern.proCaseStudy.starterCode[starterLang],
      invariantAnnotation: pattern.strands
        .map((s) => `• ${s.title}: ${s.coreInvariant}`)
        .join("\n"),
    },
    pitfalls: pattern.strands.slice(0, 3).map((s) => ({
      trap: s.commonTrap,
      counterexample:
        pattern.twistTemplates.find((t) => t.targetStrandId === s.id)
          ?.whatItBreaks ?? `Violates invariant: ${s.coreInvariant}`,
      fix: s.coreInvariant,
    })),
  };
}

export async function generateTailoredNotes(
  patternId: PatternId,
  profile: UserPatternProfile,
  deps: PatternEngineDeps = {},
  session?: PatternSessionState,
): Promise<StructuredPatternNotes> {
  const pattern = getPatternDefinition(patternId);
  if (!pattern) throw new Error(`Unknown pattern: ${patternId}`);

  const prunedStrandIds = pruneKnownPrereqStrands(patternId, profile);
  const fallback = buildDeterministicNotes(
    pattern,
    profile,
    prunedStrandIds,
    session,
  );

  const activeUserSigs = profile.errorSignatures
    .filter((s) => s.patternId === patternId && s.status === "active")
    .map((s) => s.summary);

  const systemPrompt = `You are an elite DSA mentor implementing LearnHarness teaching methodology (Principle i: Unconditional Truths First; Principle ii: Motivated Discovery).
Return STRICT JSON matching this exact shape:
{
  "unconditionalTruths": [{"title": string, "statement": string}],
  "motivatedDiscovery": {"bruteForceBottleneck": string, "keyInsight": string, "whyItWorks": string},
  "canonicalTemplate": {"language": "cpp"|"python"|"java"|"typescript", "code": string, "invariantAnnotation": string},
  "pitfalls": [{"trap": string, "counterexample": string, "fix": string}],
  "highlightedTrapNotes": [string]
}`;

  const userPrompt = `Pattern: ${pattern.title} (${pattern.subtitle})
Strands to cover: ${pattern.strands.map((s) => `${s.title} -> Truth: ${s.unconditionalTruth} | Invariant: ${s.coreInvariant} | Trap: ${s.commonTrap}`).join("\n")}
Already mastered/pruned prerequisites (compress these): ${prunedStrandIds.join(", ") || "none"}
User's preferred language: ${profile.cognitiveProfile.preferredLanguage}
User's dominant miss class: ${profile.cognitiveProfile.dominantMissClass ?? "none yet"}
User's active error signatures on this pattern: ${activeUserSigs.join(" | ") || "none"}
Session Cognitive Digest (calibration/probe context):
${buildSessionDigest(session, profile)}
Confusable twins: ${pattern.confusableTwins.map((c) => `${c.twinPatternId}: ${c.distinguishingCue}`).join("; ")}
Keep notes crisp, concrete, and high-signal.`;

  const rawAiJson = await callPatternAgentWithFallback({
    role: "teacher",
    systemPrompt,
    userPrompt,
    session,
    profile,
    deps,
    deliverableTool: createDeliverNotesTool(),
  });
  const aiJson = healEncodedFields(rawAiJson);
  if (!aiJson) return fallback;

  const merged = StructuredPatternNotesSchema.safeParse({
    patternId: pattern.id,
    title: `${pattern.title} — Personalized Pattern Dossier`,
    prunedStrandIds,
    highlightedTrapNotes: Array.isArray(aiJson.highlightedTrapNotes)
      ? aiJson.highlightedTrapNotes.slice(0, 4)
      : fallback.highlightedTrapNotes,
    unconditionalTruths:
      aiJson.unconditionalTruths ?? fallback.unconditionalTruths,
    motivatedDiscovery: aiJson.motivatedDiscovery ?? fallback.motivatedDiscovery,
    canonicalTemplate: aiJson.canonicalTemplate ?? fallback.canonicalTemplate,
    pitfalls: aiJson.pitfalls ?? fallback.pitfalls,
  });

  return merged.success ? merged.data : fallback;
}

// ─── Adaptive Question & Case-Study Generator ────────────────────────────────

function buildFallbackQuestionForStrand(
  pattern: PatternDefinition,
  strand: PatternStrandDef,
  track: TrackMode,
  questionIndex: number,
  profile: UserPatternProfile,
  opts?: {
    isRetest?: boolean;
    preferredModality?: "mcq" | "verbal_text";
    forceCaseStudy?: boolean;
  },
): PatternQuestionCard {
  const isCaseStudy =
    opts?.forceCaseStudy ??
    (track === "pro" && questionIndex >= MAX_QUESTIONS_PRO - 1);

  // Pro final step -> Case Study Code Snippet
  if (isCaseStudy) {
    const lang = profile.cognitiveProfile.preferredLanguage;
    const starterLang: "cpp" | "python" | "java" | "typescript" =
      lang === "python" || lang === "java" || lang === "typescript"
        ? lang
        : "cpp";

    return {
      id: uid("q"),
      patternId: pattern.id,
      strandId: pattern.proCaseStudy.targetStrandId,
      modality: "code_snippet",
      phase: "case_study",
      questionRole: "apply",
      prompt: `**Case Study — ${pattern.proCaseStudy.title}**\n\n${pattern.proCaseStudy.prompt}`,
      contextSnippet: `Constraints: ${pattern.proCaseStudy.constraints}`,
      allowIdk: false,
      requireVerbalApproach: true,
      codeStarter: {
        language: starterLang,
        starter: pattern.proCaseStudy.starterCode[starterLang],
        constraints: pattern.proCaseStudy.constraints,
      },
      rubric: {
        expectedReasoning: `Must achieve ${pattern.proCaseStudy.optimalTime} time and ${pattern.proCaseStudy.optimalSpace} space while avoiding: ${pattern.proCaseStudy.optimizationTrap}`,
        expectedComplexity: {
          time: pattern.proCaseStudy.optimalTime,
          space: pattern.proCaseStudy.optimalSpace,
        },
        keyInvariantsRequired: [strand.coreInvariant],
      },
    };
  }

  // Alternate between MCQ (with Verbal Approach box) and direct Verbal Reasoning
  const useMcq = opts?.preferredModality
    ? opts.preferredModality === "mcq"
    : questionIndex % 2 === 0;
  const questionRole: "predict" | "check" | "apply" = opts?.isRetest
    ? "check"
    : useMcq && questionIndex === 0
      ? "predict"
      : "check";

  if (useMcq) {
    const twin = pattern.confusableTwins[0];
    const options = [
      { value: "invariant", label: strand.coreInvariant },
      { value: "trap", label: strand.commonTrap },
      {
        value: "twin",
        label: twin
          ? `Switch unconditionally to ${twin.twinPatternId} regardless of input constraints.`
          : "Re-scan the entire remaining range on every iteration.",
      },
      {
        value: "always_valid",
        label: "The invariant holds automatically for arbitrary unsorted/negative inputs.",
      },
    ];

    return {
      id: uid("q"),
      patternId: pattern.id,
      strandId: strand.id,
      modality: "mcq",
      phase: track === "pro" ? "gauntlet" : "guided",
      questionRole,
      prompt: opts?.isRetest
        ? `[Fresh-Surface Retest] Re-verify **${strand.title}** on a clean framing: which statement strictly preserves correctness and optimal asymptotic complexity? Explain *why* in your own words.`
        : track === "pro"
          ? `[Pro Gauntlet] For **${strand.title}** in ${pattern.title}, which statement strictly preserves correctness and optimal asymptotic complexity? Explain *why* in your verbal approach.`
          : `Check your grasp of **${strand.title}**: which statement accurately captures the invariant (and explain why in your own words)?`,
      options,
      multiSelect: false,
      allowIdk: true,
      requireVerbalApproach: true,
      rubric: {
        correctOptionValues: ["invariant"],
        expectedReasoning: `${strand.unconditionalTruth} ${strand.coreInvariant}`,
        keyInvariantsRequired: [strand.coreInvariant],
        distractorMentalModels: {
          trap: `Held the common pitfall: ${strand.commonTrap}`,
          twin: `Confused ${pattern.title} with ${twin?.twinPatternId ?? "another pattern"}`,
          always_valid: "Assumed invariant holds unconditionally without checking constraints.",
        },
      },
    };
  }

  return {
    id: uid("q"),
    patternId: pattern.id,
    strandId: strand.id,
    modality: "verbal_text",
    phase: track === "pro" ? "gauntlet" : "guided",
    questionRole,
    prompt: opts?.isRetest
      ? `[Fresh-Surface Retest] Explain **${strand.title}** from scratch on an unseen edge-case constraint without relying on memorization — why does "${strand.commonTrap}" break the invariant?`
      : track === "pro"
        ? `[Pro Invariant Proof] Suppose someone hits this pitfall on **${strand.title}**: "${strand.commonTrap}". Construct a minimal failing scenario and state the exact invariant that prevents it.`
        : `In your own words, explain why **${strand.title}** works without missing valid candidates, and what breaks it: "${strand.commonTrap}"`,
    allowIdk: true,
    requireVerbalApproach: true,
    rubric: {
      expectedReasoning: `${strand.unconditionalTruth} Invariant: ${strand.coreInvariant}`,
      keyInvariantsRequired: [strand.coreInvariant, strand.unconditionalTruth],
    },
  };
}

export async function generateNextPatternQuestion(
  session: PatternSessionState,
  profile: UserPatternProfile,
  deps: PatternEngineDeps = {},
): Promise<PatternQuestionCard> {
  const pattern = getPatternDefinition(session.patternId);
  if (!pattern) throw new Error(`Unknown pattern: ${session.patternId}`);
  const track: TrackMode = session.track ?? "intermediate";

  const lastAsked =
    session.questionHistory[session.questionHistory.length - 1]?.strandId ??
    null;
  const targetCount =
    track === "pro" ? MAX_QUESTIONS_PRO : MAX_QUESTIONS_INTERMEDIATE;
  const regularAsked = session.questionHistory.filter(
    (q) => q.modality !== "twisted_followup",
  ).length;
  const hasDoneCaseStudy = session.questionHistory.some(
    (q) => q.modality === "code_snippet",
  );
  const retestCandidateId =
    (session.retestQueue ?? []).find((id) => id !== lastAsked) ??
    session.retestQueue?.[0];
  const isRetestTurn =
    Boolean(retestCandidateId) && regularAsked >= targetCount;
  const isCaseStudy =
    track === "pro" &&
    !isRetestTurn &&
    !hasDoneCaseStudy &&
    regularAsked >= MAX_QUESTIONS_PRO - 1;

  const ranked = rankStrandsForPattern(pattern.id, profile, {
    excludeStrandIds: session.resolvedStrandsInSession,
    lastAskedStrandId: lastAsked,
  });
  const chosenStrandId =
    isRetestTurn && retestCandidateId
      ? retestCandidateId
      : isCaseStudy
        ? pattern.proCaseStudy.targetStrandId
        : (ranked[0]?.strandId ?? pattern.strands[0]!.id);
  const strand = getStrandDefinition(chosenStrandId) ?? pattern.strands[0]!;
  const qIndex = session.questionHistory.length;

  let preferredModality: "mcq" | "verbal_text" | undefined;
  if (isRetestTurn) {
    const priorForStrand = [...session.questionHistory]
      .reverse()
      .find((h) => h.strandId === strand.id);
    preferredModality =
      priorForStrand?.modality === "mcq" ? "verbal_text" : "mcq";
  }

  const fallback = buildFallbackQuestionForStrand(
    pattern,
    strand,
    track,
    qIndex,
    profile,
    {
      isRetest: isRetestTurn,
      preferredModality,
      forceCaseStudy: isCaseStudy,
    },
  );

  const modalityTarget = isCaseStudy
    ? "code_snippet"
    : preferredModality ?? (qIndex % 2 === 0 ? "mcq" : "verbal_text");
  const questionRole = fallback.questionRole ?? "check";
  const digest = buildSessionDigest(session, profile, strand.id);

  const systemPrompt = `You are a Socratic DSA interviewer generating ONE targeted assessment question (LearnHarness Commitment Rule: generate expectedReasoning & distractorMentalModels BEFORE the learner answers).
Return STRICT JSON:
{
  "modality": "${modalityTarget}",
  "questionRole": "${questionRole}",
  "prompt": string,
  "contextSnippet": string | null,
  "options": [{"value": string, "label": string}] | null,
  "correctOptionValues": [string] | null,
  "expectedReasoning": string,
  "expectedComplexity": {"time": string, "space": string} | null,
  "keyInvariantsRequired": [string],
  "distractorMentalModels": Record<string, string> | null
}
Rules:
- Never leak correctness in option labels. Options must be bare, plausible claims (3-4 options for mcq).
- Never include an "I don't know" option (UI renders that automatically).
- If modality is "code_snippet", pose a tight case-study requiring optimal Time/Space complexity.
- If Fresh-Surface Retest is YES, craft a completely new scenario/framing to verify genuine transfer without repeating earlier wording.`;

  const userPrompt = `Pattern: ${pattern.title}
Track: ${track}
Target Strand: ${strand.title}
Question Role: ${questionRole}
Fresh-Surface Retest: ${isRetestTurn ? "YES (must use a distinct surface from earlier turn)" : "no"}
Unconditional Truth: ${strand.unconditionalTruth}
Core Invariant: ${strand.coreInvariant}
Common Trap: ${strand.commonTrap}
User Dominant Miss: ${profile.cognitiveProfile.dominantMissClass ?? "none"}
User Calibration Bias on Strand: ${profile.strands[strand.id]?.calibrationBias ?? 0}
Session Cognitive Digest:
${digest}
${isCaseStudy ? `Seed Case Study: ${pattern.proCaseStudy.title} — ${pattern.proCaseStudy.prompt} (Optimal: ${pattern.proCaseStudy.optimalTime}, ${pattern.proCaseStudy.optimalSpace})` : ""}`;

  const rawAiJson = await callPatternAgentWithFallback({
    role: track === "pro" ? "practitioner" : "teacher",
    systemPrompt,
    userPrompt,
    session,
    profile,
    deps,
    deliverableTool: createDeliverQuestionTool(),
  });
  const aiJson = healEncodedFields(rawAiJson);
  if (!aiJson || typeof aiJson.prompt !== "string") return fallback;

  const candidate: Record<string, unknown> = {
    id: fallback.id,
    patternId: pattern.id,
    strandId: strand.id,
    modality: modalityTarget,
    phase: fallback.phase,
    questionRole,
    prompt: aiJson.prompt,
    contextSnippet:
      typeof aiJson.contextSnippet === "string"
        ? aiJson.contextSnippet
        : fallback.contextSnippet,
    allowIdk: !isCaseStudy,
    requireVerbalApproach: true,
    codeStarter: isCaseStudy ? fallback.codeStarter : undefined,
    rubric: {
      correctOptionValues:
        aiJson.correctOptionValues !== undefined
          ? aiJson.correctOptionValues
          : fallback.rubric?.correctOptionValues,
      expectedReasoning:
        typeof aiJson.expectedReasoning === "string"
          ? aiJson.expectedReasoning
          : fallback.rubric!.expectedReasoning,
      expectedComplexity:
        aiJson.expectedComplexity && typeof aiJson.expectedComplexity === "object"
          ? aiJson.expectedComplexity
          : fallback.rubric?.expectedComplexity,
      keyInvariantsRequired: Array.isArray(aiJson.keyInvariantsRequired)
        ? aiJson.keyInvariantsRequired
        : fallback.rubric!.keyInvariantsRequired,
      distractorMentalModels:
        aiJson.distractorMentalModels &&
        typeof aiJson.distractorMentalModels === "object"
          ? aiJson.distractorMentalModels
          : fallback.rubric?.distractorMentalModels,
    },
  };

  if (modalityTarget === "mcq") {
    candidate.options = aiJson.options;
  }

  return validateAndHealQuestionCard(candidate, fallback);
}

// ─── Cross-Signal Evaluation, Optimization Audit & Twisted Follow-Up ─────────

function selectBestTwistOperator(
  pattern: PatternDefinition,
  strandId: string,
  profile: UserPatternProfile,
): { operator: TwistOperator; prompt: string; whatItBreaks: string } {
  const matching = pattern.twistTemplates.filter(
    (t) => t.targetStrandId === strandId,
  );
  const pool = matching.length > 0 ? matching : pattern.twistTemplates;
  if (pool.length > 0) {
    // Prefer the twist operator where the user has lowest resilience
    const sorted = [...pool].sort((a, b) => {
      const ra = profile.cognitiveProfile.twistResilience[a.operator] ?? 50;
      const rb = profile.cognitiveProfile.twistResilience[b.operator] ?? 50;
      return ra - rb;
    });
    const pick = sorted[0]!;
    return {
      operator: pick.operator,
      prompt: pick.promptTemplate,
      whatItBreaks: pick.whatItBreaks,
    };
  }

  // Fallback synthetic twist across operators
  const lowestOp = [...TWIST_OPERATORS].sort((a, b) => {
    const ra = profile.cognitiveProfile.twistResilience[a] ?? 50;
    const rb = profile.cognitiveProfile.twistResilience[b] ?? 50;
    return ra - rb;
  })[0]!;
  const strand = getStrandDefinition(strandId);
  return {
    operator: lowestOp,
    prompt: `Twist (${lowestOp}): Suppose the input violates the usual constraint for **${strand?.title ?? pattern.title}** (${strand?.commonTrap ?? "edge case"}). Construct a minimal 4-element counterexample showing what breaks and state how the invariant must adapt.`,
    whatItBreaks: strand?.commonTrap ?? "Unchecked assumption",
  };
}

function heuristicCodeAudit(
  code: string,
  pattern: PatternDefinition,
  claimedTime?: string,
  claimedSpace?: string,
): CodeOptimizationAudit {
  const trimmed = code.trim();
  const optimalTime = pattern.proCaseStudy.optimalTime;
  const optimalSpace = pattern.proCaseStudy.optimalSpace;

  if (trimmed.length < 25 || /pass\s*$|return\s+(0|""|null|\[\]|false);?\s*$/m.test(trimmed)) {
    return {
      tier: "Incomplete",
      detectedTime: "N/A",
      detectedSpace: "N/A",
      optimalTime,
      optimalSpace,
      timeScore: 15,
      spaceScore: 15,
      optimizationFeedback:
        "Snippet is incomplete or still contains stub return values. Implement the full state transition and boundary conditions.",
    };
  }

  // Check for nested loops suggesting O(n^2) brute force on linear patterns
  const loopMatches = trimmed.match(/\b(for|while)\s*\(/g) ?? [];
  const pythonLoops = trimmed.match(/^\s*(for|while)\s+/gm) ?? [];
  const totalLoops = loopMatches.length + pythonLoops.length;
  const nestedIndentLoop = /\b(?:for|while)\b[\s\S]{0,180}\n\s{4,}\b(?:for|while)\b/.test(
    trimmed,
  );

  const expectsLinear =
    optimalTime.includes("O(n)") ||
    optimalTime.includes("O(|s|") ||
    optimalTime.includes("O(V + E)");
  const expectsO1Space = optimalSpace.includes("O(1)");

  const braceIdx = trimmed.indexOf("{");
  const colonIdx = trimmed.indexOf(":\n");
  const body =
    braceIdx >= 0
      ? trimmed.slice(braceIdx + 1)
      : colonIdx >= 0
        ? trimmed.slice(colonIdx + 2)
        : trimmed;

  const allocatesAuxArrayOrMap =
    /\b(?:vector\s*<[^>]+>(?!\s*&)|new\s+Array\b|unordered_map\b|HashMap\b|dict\s*\(|set\s*\(|new\s+Set\b|new\s+Map\b|\[[^\]]*\]\s*\*\s*n\b)/.test(
      body,
    );

  if (expectsLinear && nestedIndentLoop && pattern.id !== "sliding-window") {
    return {
      tier: "Brute Force",
      detectedTime: "O(n^2)",
      detectedSpace: allocatesAuxArrayOrMap ? "O(n)" : "O(1)",
      optimalTime,
      optimalSpace,
      timeScore: 40,
      spaceScore: expectsO1Space && allocatesAuxArrayOrMap ? 45 : 75,
      optimizationFeedback: `Detected nested iteration resembling O(n^2) brute force. Target ${optimalTime} by eliminating redundant scans using the core invariant.`,
    };
  }

  if (expectsO1Space && allocatesAuxArrayOrMap) {
    return {
      tier: "Better",
      detectedTime: optimalTime,
      detectedSpace: "O(n)",
      optimalTime,
      optimalSpace,
      timeScore: 85,
      spaceScore: 48,
      optimizationFeedback: `Time looks near-optimal, but auxiliary allocation uses O(n) space instead of ${optimalSpace}. Watch for: ${pattern.proCaseStudy.optimizationTrap}`,
    };
  }

  const timeClaimPenalty =
    claimedTime &&
    !claimedTime.toLowerCase().replace(/\s+/g, "").includes(
      optimalTime.toLowerCase().replace(/\s+/g, "").slice(0, 4),
    )
      ? 15
      : 0;
  const spaceClaimPenalty =
    claimedSpace &&
    expectsO1Space &&
    !claimedSpace.toLowerCase().replace(/\s+/g, "").includes("o(1)")
      ? 15
      : 0;

  return {
    tier: totalLoops > 0 || trimmed.includes("return") ? "Optimal" : "Better",
    detectedTime: optimalTime,
    detectedSpace: optimalSpace,
    optimalTime,
    optimalSpace,
    timeScore: Math.max(60, 92 - timeClaimPenalty),
    spaceScore: Math.max(60, 92 - spaceClaimPenalty),
    optimizationFeedback:
      timeClaimPenalty > 0 || spaceClaimPenalty > 0
        ? `Implementation structure matches ${optimalTime} / ${optimalSpace}, though your claimed Big-O (${claimedTime || "?"} / ${claimedSpace || "?"}) needs tightening.`
        : `Clean structure matching ${optimalTime} time and ${optimalSpace} space.`,
  };
}

export async function evaluateSubmissionAndBuildFollowUp(
  session: PatternSessionState,
  profile: UserPatternProfile,
  payload: SubmissionPayload,
  deps: PatternEngineDeps = {},
): Promise<{
  evaluation: SubmissionEvaluation;
  updatedSession: PatternSessionState;
  updatedProfile: UserPatternProfile;
}> {
  // 1. Idempotency guard: prevent duplicate submission penalties
  if (
    session.processedAttemptIds.includes(payload.attemptId) &&
    session.lastEvaluation &&
    session.lastEvaluation.questionId === payload.questionId
  ) {
    return {
      evaluation: session.lastEvaluation,
      updatedSession: session,
      updatedProfile: profile,
    };
  }

  const card = session.currentQuestion;
  if (!card || card.id !== payload.questionId) {
    throw new Error("Question mismatch or no active question in session.");
  }

  const pattern = getPatternDefinition(session.patternId);
  const strand = getStrandDefinition(card.strandId);
  if (!pattern || !strand) {
    throw new Error("Invalid pattern or strand state.");
  }

  const rubric = card.rubric ?? {
    expectedReasoning: strand.coreInvariant,
    keyInvariantsRequired: [strand.coreInvariant],
  };

  // 1b. Hardened Work-Image Intake (sniff magic bytes + dimensions + SHA-256 deduplicate)
  const { snapshots: workSnapshots, updatedSnapshotMap } =
    validateAndIngestSubmittedImages(
      payload.workImages,
      session.imageSnapshots ?? {},
    );

  // 2. Optional sandbox execution for Pro code snippet (with automated test harness when matched)
  let sandboxOutcome: CodeOptimizationAudit["sandboxOutcome"] | undefined;
  if (payload.code && payload.runSandbox) {
    const rawLang = payload.language ?? card.codeStarter?.language ?? "cpp";
    const sandboxLang = mapLanguageForSandbox(rawLang);
    if (sandboxLang) {
      const runner = deps.codeRunner ?? runSecureCode;
      const driver = buildCaseStudyTestProgram(
        pattern.id,
        rawLang,
        payload.code,
      );
      try {
        const res = await runner(driver.wrappedCode, "", sandboxLang);
        const summary = parseDriverTestSummary(
          res.stdout || "",
          res.exitCode,
          driver.usedTestHarness,
        );
        sandboxOutcome = {
          ran: true,
          passed: summary.passed && res.status !== "error",
          ...(typeof summary.testsPassed === "number"
            ? { testsPassed: summary.testsPassed }
            : {}),
          ...(typeof summary.testsTotal === "number"
            ? { testsTotal: summary.testsTotal }
            : {}),
          stdout: (res.stdout || "").slice(0, 1200),
          stderr: (res.stderr || "").slice(0, 1200),
        };
      } catch (err) {
        sandboxOutcome = {
          ran: true,
          passed: false,
          stdout: "",
          stderr: String((err as Error)?.message || "Sandbox failed").slice(0, 400),
        };
      }
    }
  }

  // 3. Deterministic baseline evaluation
  const verbalText = (payload.verbalAnswer ?? "").trim();
  const verbalForJaccard = verbalText
    .replace(/\[Pattern quote\]\(pat-citation:\/\/[^)]+\)/g, " ")
    .trim();
  const choseIdk = payload.choseIdk === true;
  const submittedConfidence = choseIdk
    ? null
    : typeof payload.confidence === "number"
      ? Math.max(0, Math.min(100, Math.round(payload.confidence)))
      : undefined;
  let selectionCorrect = true;
  if (card.modality === "mcq" || (card.options && card.options.length > 0)) {
    const expected = new Set(rubric.correctOptionValues ?? []);
    const chosen = new Set(payload.selectedOptions ?? []);
    selectionCorrect =
      !choseIdk &&
      expected.size > 0 &&
      expected.size === chosen.size &&
      [...expected].every((v) => chosen.has(v));
  } else if (choseIdk) {
    selectionCorrect = false;
  }

  let verbalScore = scoreVerbalExplanation(
    verbalForJaccard || verbalText,
    rubric.expectedReasoning,
    rubric.keyInvariantsRequired,
  );
  let codeAudit: CodeOptimizationAudit | undefined;
  let codeScore: number | undefined;

  if (card.modality === "code_snippet") {
    codeAudit = heuristicCodeAudit(
      payload.code ?? "",
      pattern,
      payload.claimedTimeComplexity,
      payload.claimedSpaceComplexity,
    );
    if (sandboxOutcome) {
      codeAudit.sandboxOutcome = sandboxOutcome;
      if (sandboxOutcome.ran && !sandboxOutcome.passed) {
        codeAudit.tier = "Incomplete";
        codeAudit.timeScore = Math.min(codeAudit.timeScore, 40);
      }
    }
    codeScore = Math.round((codeAudit.timeScore + codeAudit.spaceScore) / 2);
  }

  // 4. AI Cross-Signal Semantic & Optimization Audit (overrides heuristics when available)
  const hintsUsed = session.currentQuestionHints ?? [];
  const highestLadderHint: HintRung | null =
    hintsUsed.length > 0 ? hintsUsed[hintsUsed.length - 1]!.rung : null;
  const sessionDigest = buildSessionDigest(session, profile, strand.id);

  let aiEval: Record<string, unknown> | null = null;
  let toolGeneratedVisual: GeneratedVisualArtifact | null = null;
  if (!choseIdk) {
    const systemPrompt = `You are a strict DSA mentor & complexity auditor. Evaluate the learner's response across BOTH their choice/code AND their verbal reasoning (plus any attached sketch/work images).
Return STRICT JSON:
{
  "isCorrect": boolean,
  "hiddenGapDetected": boolean,
  "score": number (0..100),
  "verbalScore": number (0..100),
  "missClass": "cue"|"discrimination"|"invariant-break"|"execution"|"complexity-suboptimal"|"careless"|"structural"|null,
  "hintRung": "R0"|"R1"|"R2"|"R3"|"R4"|"R5"|null,
  "errorSignatureKey": string | null (short canonical slug e.g. "sliding-window::if-instead-of-while"),
  "gapSummary": string | null (max 200 chars),
  "verdictSummary": string,
  "surgicalTeaching": string | null (if gap/miss, 2-4 crisp sentences repairing ONLY the broken assumption, never a generic textbook lecture),
  "twistedFollowUp": {
    "operator": "constraint-twist"|"reverse-premise"|"break-the-premise"|"discrimination",
    "prompt": string,
    "expectedReasoning": string
  } | null,
  "codeAudit": {
    "tier": "Incomplete"|"Brute Force"|"Better"|"Optimal",
    "detectedTime": string,
    "detectedSpace": string,
    "timeScore": number,
    "spaceScore": number,
    "optimizationFeedback": string
  } | null
}
Crucial rules:
- If the learner picked the right MCQ or wrote working code, BUT their verbal reasoning has a flawed invariant or suboptimal complexity, set hiddenGapDetected=true and provide surgicalTeaching + twistedFollowUp.
- Read self-reported confidence alongside verdict (LearnHarness 25-confidence doctrine): confidence >= 80 with a miss signals an entrenched misconception requiring premise-breaking repair; confidence <= 35 with a right pick indicates fragile luck worth verifying verbally.`;

    const userPrompt = `Pattern: ${pattern.title} | Track: ${session.track} | Strand: ${strand.title}
Question (${card.modality}${card.questionRole ? `, role=${card.questionRole}` : ""}${card.twistOperator ? `, twist=${card.twistOperator}` : ""}): ${card.prompt}
Committed Rubric Reasoning: ${rubric.expectedReasoning}
Key Invariants: ${rubric.keyInvariantsRequired.join(" | ")}
Hints Requested Before Submitting: ${hintsUsed.map((h) => h.rung).join(", ") || "none"}
Self-Reported Confidence: ${typeof submittedConfidence === "number" ? `${submittedConfidence}%` : "unspecified"}
Attached Work Images: ${workSnapshots.length > 0 ? `${workSnapshots.length} verified dry-run sketch(es) attached` : "none"}
Session Cognitive Digest:
${sessionDigest}
Learner Selected Options: ${JSON.stringify(payload.selectedOptions ?? [])} (selectionCorrect=${selectionCorrect})
Learner Verbal Approach: "${verbalText ? expandCitationsForModel(verbalText) : "(empty)"}"
${payload.code ? `Learner Code (${payload.language ?? "cpp"}):\n${payload.code}\nClaimed Time: ${payload.claimedTimeComplexity || "?"} | Claimed Space: ${payload.claimedSpaceComplexity || "?"}` : ""}
${sandboxOutcome ? `Sandbox ran: passed=${sandboxOutcome.passed}, stderr=${sandboxOutcome.stderr}` : ""}`;

    aiEval = healEvaluationPayload(
      await callPatternAgentWithFallback({
        role: session.track === "pro" ? "practitioner" : "teacher",
        systemPrompt,
        userPrompt,
        images: workSnapshots,
        session,
        profile,
        deps,
        deliverableTool: createDeliverEvaluationTool(),
        onVisualGenerated: (v) => {
          toolGeneratedVisual = v;
        },
      }),
    );
  }

  let isCorrect =
    choseIdk
      ? false
      : card.modality === "code_snippet"
        ? (codeAudit?.tier === "Optimal" || codeAudit?.tier === "Better") &&
          verbalScore >= 45
        : card.modality === "mcq"
          ? selectionCorrect
          : verbalScore >= 60;

  let hiddenGapDetected = false;
  if (!choseIdk && card.modality === "mcq" && selectionCorrect && verbalScore < 45 && verbalText.length > 0) {
    hiddenGapDetected = true;
  }
  if (!choseIdk && card.modality === "mcq" && selectionCorrect && verbalText.length === 0 && card.requireVerbalApproach) {
    hiddenGapDetected = true;
  }
  if (card.modality === "code_snippet" && codeAudit && (codeAudit.tier === "Brute Force" || codeAudit.tier === "Better")) {
    hiddenGapDetected = true;
  }

  let score = choseIdk
    ? 10
    : card.modality === "code_snippet"
      ? Math.round((codeScore ?? 50) * 0.65 + verbalScore * 0.35)
      : card.modality === "mcq"
        ? Math.round((selectionCorrect ? 70 : 15) + verbalScore * 0.3)
        : verbalScore;

  let missClass: MissClass | null = isCorrect && !hiddenGapDetected
    ? null
    : card.modality === "code_snippet" && codeAudit && codeAudit.tier !== "Optimal"
      ? "complexity-suboptimal"
      : choseIdk
        ? "cue"
        : "invariant-break";
  let hintRung: HintRung | null = choseIdk ? "R2" : isCorrect && !hiddenGapDetected ? null : "R1";
  let errorSignatureKey: string | null = missClass
    ? `${pattern.id}::${strand.id.split(":")[1] ?? strand.id}::${missClass}`
    : null;
  let gapSummary: string | null = missClass
    ? `${strand.title}: ${strand.commonTrap}`.slice(0, 220)
    : null;
  let verdictSummary = choseIdk
    ? `You flagged an honest gap on **${strand.title}**. Let's lock in the invariant and test it with a twist.`
    : isCorrect && !hiddenGapDetected
      ? `Solid grasp of **${strand.title}**. Your reasoning aligns with the invariant.`
      : hiddenGapDetected
        ? `Your surface answer was close, but your verbal/complexity justification exposed a gap on **${strand.title}**.`
        : `Not quite on **${strand.title}** — let's repair the exact broken assumption.`;

  let surgicalTeaching: string | null = null;
  let aiTwistedPayload: {
    operator: TwistOperator;
    prompt: string;
    expectedReasoning: string;
  } | null = null;

  if (aiEval) {
    if (typeof aiEval.isCorrect === "boolean") isCorrect = aiEval.isCorrect;
    if (typeof aiEval.hiddenGapDetected === "boolean") {
      hiddenGapDetected = aiEval.hiddenGapDetected;
    }
    if (typeof aiEval.score === "number") {
      score = Math.max(0, Math.min(100, Math.round(aiEval.score)));
    }
    if (typeof aiEval.verbalScore === "number") {
      verbalScore = Math.max(0, Math.min(100, Math.round(aiEval.verbalScore)));
    }
    if (typeof aiEval.verdictSummary === "string") {
      verdictSummary = aiEval.verdictSummary;
    }
    if (typeof aiEval.surgicalTeaching === "string") {
      surgicalTeaching = aiEval.surgicalTeaching;
    }
    if (aiEval.missClass !== undefined) {
      const healedMiss = healMissClass(aiEval.missClass);
      missClass = healedMiss ?? (isCorrect && !hiddenGapDetected ? null : missClass);
    }
    if (typeof aiEval.hintRung === "string") {
      const parsedRung = HintRungSchema.safeParse(
        stripModelValueDebris(aiEval.hintRung).toUpperCase(),
      );
      if (parsedRung.success) hintRung = parsedRung.data;
    } else if (aiEval.hintRung === null && isCorrect && !hiddenGapDetected) {
      hintRung = null;
    }
    if (typeof aiEval.errorSignatureKey === "string") {
      const cleanedSig = stripModelValueDebris(aiEval.errorSignatureKey);
      if (cleanedSig) errorSignatureKey = cleanedSig.slice(0, 120);
    }
    if (typeof aiEval.gapSummary === "string") {
      gapSummary = aiEval.gapSummary.slice(0, 220);
    }
    if (
      aiEval.codeAudit &&
      typeof aiEval.codeAudit === "object" &&
      card.modality === "code_snippet"
    ) {
      const mergedAudit = CodeOptimizationAuditSchema.safeParse({
        ...codeAudit,
        ...(aiEval.codeAudit as Record<string, unknown>),
        optimalTime: pattern.proCaseStudy.optimalTime,
        optimalSpace: pattern.proCaseStudy.optimalSpace,
        sandboxOutcome,
      });
      if (mergedAudit.success) {
        codeAudit = mergedAudit.data;
        codeScore = Math.round((codeAudit.timeScore + codeAudit.spaceScore) / 2);
      }
    }
    if (aiEval.twistedFollowUp && typeof aiEval.twistedFollowUp === "object") {
      const tw = aiEval.twistedFollowUp as Record<string, unknown>;
      if (typeof tw.prompt === "string" && typeof tw.expectedReasoning === "string") {
        const cleanedOp = stripModelValueDebris(tw.operator);
        aiTwistedPayload = {
          operator: TWIST_OPERATORS.includes(cleanedOp as TwistOperator)
            ? (cleanedOp as TwistOperator)
            : "constraint-twist",
          prompt: tw.prompt,
          expectedReasoning: tw.expectedReasoning,
        };
      }
    }
  }

  // Escalate hintRung with the actual progressive hint ladder used by the learner
  hintRung = maxHintRung(hintRung, highestLadderHint);
  const usedHeavyHint =
    highestLadderHint === "R2" ||
    highestLadderHint === "R3" ||
    highestLadderHint === "R4" ||
    highestLadderHint === "R5";
  if (isCorrect && !hiddenGapDetected && usedHeavyHint && highestLadderHint) {
    verdictSummary = `${verdictSummary} (Queued for an unassisted fresh-surface check after ${highestLadderHint} hint.)`;
  }

  const confidenceDiagnostic = classifyConfidenceCalibration({
    confidence: submittedConfidence,
    choseIdk,
    isCorrect,
    hiddenGapDetected,
    score,
  });
  if (confidenceDiagnostic === "overconfident" && !verdictSummary.includes("Confidence")) {
    verdictSummary = `${verdictSummary} (Calibration note: high confidence paired with a reasoning flaw triggers premise-breaking repair.)`;
  } else if (confidenceDiagnostic === "underconfident" && !verdictSummary.includes("Confidence")) {
    verdictSummary = `${verdictSummary} (Calibration note: your reasoning held up well despite low confidence — lock in why it must hold.)`;
  }

  // 5. Update O(1) bounded UserPatternProfile
  const updatedProfile = applyStrandReviewUpdate(profile, {
    patternId: pattern.id,
    strandId: strand.id,
    score,
    isCorrect,
    hiddenGapDetected,
    missClass,
    hintRung,
    gapNote: gapSummary,
    errorSignatureKey,
    twistOperator: card.twistOperator,
    verbalScore,
    codeScore,
    track: session.track ?? "intermediate",
    confidence: submittedConfidence,
    choseIdk,
  });

  // 6. Decide remediation twist vs advancing vs fresh-surface retesting
  const twistsSoFar = session.questionHistory.filter(
    (q) => q.modality === "twisted_followup",
  ).length;
  const needsTwist =
    (!isCorrect || hiddenGapDetected) &&
    card.modality !== "twisted_followup" &&
    twistsSoFar < MAX_TWISTS_PER_SESSION;

  if (needsTwist && !surgicalTeaching) {
    surgicalTeaching = `**Invariant Repair (${strand.title}):**\n1. Ground truth: ${strand.unconditionalTruth}\n2. Exact rule: ${strand.coreInvariant}\n3. Why your step missed: watch out for *${strand.commonTrap}*.`;
  }

  const counterexampleVisual: GeneratedVisualArtifact | null =
    toolGeneratedVisual ??
    (needsTwist
      ? buildDeterministicPatternSvg(
          pattern.id,
          strand.id,
          `Counterexample Trace: ${strand.title}`,
        )
      : null);

  let twistedFollowUp: PatternQuestionCard | null = null;
  if (needsTwist) {
    const selectedTwist =
      aiTwistedPayload ??
      (() => {
        const t = selectBestTwistOperator(pattern, strand.id, updatedProfile);
        return {
          operator:
            confidenceDiagnostic === "overconfident" && t.operator === "constraint-twist"
              ? "break-the-premise"
              : t.operator,
          prompt: t.prompt,
          expectedReasoning: `${t.whatItBreaks}. Repair via: ${strand.coreInvariant}`,
        };
      })();

    twistedFollowUp = {
      id: uid("q"),
      patternId: pattern.id,
      strandId: strand.id,
      modality: "twisted_followup",
      phase: "twisted_remediation",
      questionRole: "apply",
      twistOperator: selectedTwist.operator,
      prompt: selectedTwist.prompt,
      allowIdk: true,
      requireVerbalApproach: true,
      visualArtifact: counterexampleVisual,
      rubric: {
        expectedReasoning: selectedTwist.expectedReasoning,
        keyInvariantsRequired: [strand.coreInvariant],
      },
    };
  }

  let nextRetestQueue = [...(session.retestQueue ?? [])];
  if (isCorrect && !hiddenGapDetected && !usedHeavyHint) {
    if (card.modality !== "twisted_followup") {
      nextRetestQueue = nextRetestQueue.filter((id) => id !== strand.id);
    }
  } else if (!nextRetestQueue.includes(strand.id)) {
    nextRetestQueue.push(strand.id);
  }

  const verbalSummary = verbalText
    ? verbalText.length > 140
      ? `${verbalText.slice(0, 137)}...`
      : verbalText
    : undefined;

  const updatedHistory = [
    ...session.questionHistory,
    {
      questionId: card.id,
      strandId: strand.id,
      modality: card.modality,
      score,
      missClass,
      ...(hintRung ? { highestHintRung: hintRung } : {}),
      ...(submittedConfidence !== undefined
        ? { confidence: submittedConfidence }
        : {}),
      ...(confidenceDiagnostic ? { confidenceDiagnostic } : {}),
      ...(verbalSummary ? { verbalSummary } : {}),
    },
  ];

  const nextResolved =
    isCorrect &&
    !hiddenGapDetected &&
    !usedHeavyHint &&
    !session.resolvedStrandsInSession.includes(strand.id)
      ? [...session.resolvedStrandsInSession, strand.id]
      : session.resolvedStrandsInSession;

  const targetCount =
    session.track === "pro" ? MAX_QUESTIONS_PRO : MAX_QUESTIONS_INTERMEDIATE;
  const regularAsked = updatedHistory.filter(
    (q) => q.modality !== "twisted_followup",
  ).length;
  const maxAllowedWithRetests = targetCount + MAX_RETESTS_PER_SESSION;

  let nextQuestion: PatternQuestionCard | null = null;
  let readyForScorecard = false;

  if (!twistedFollowUp) {
    if (regularAsked < targetCount) {
      const tempSession: PatternSessionState = {
        ...session,
        questionHistory: updatedHistory,
        resolvedStrandsInSession: nextResolved,
        retestQueue: nextRetestQueue,
      };
      nextQuestion = await generateNextPatternQuestion(
        tempSession,
        updatedProfile,
        deps,
      );
    } else if (
      nextRetestQueue.length > 0 &&
      regularAsked < maxAllowedWithRetests
    ) {
      const tempSession: PatternSessionState = {
        ...session,
        questionHistory: updatedHistory,
        resolvedStrandsInSession: nextResolved,
        retestQueue: nextRetestQueue,
      };
      nextQuestion = await generateNextPatternQuestion(
        tempSession,
        updatedProfile,
        deps,
      );
    } else {
      readyForScorecard = true;
    }
  }

  const evaluation: SubmissionEvaluation = {
    questionId: card.id,
    strandId: strand.id,
    isCorrect,
    hiddenGapDetected,
    score,
    missClass,
    hintRung,
    errorSignatureKey,
    verdictSummary,
    surgicalTeaching,
    committedAnswerReveal: rubric.expectedReasoning,
    confidenceSubmitted: submittedConfidence ?? null,
    confidenceDiagnostic,
    visualArtifact: counterexampleVisual,
    codeAudit,
    twistedFollowUp,
    nextQuestion,
    readyForScorecard,
  };

  const updatedSession: PatternSessionState = {
    ...session,
    stage: twistedFollowUp
      ? "remediating"
      : readyForScorecard
        ? "completed"
        : "questioning",
    currentQuestion: twistedFollowUp ?? nextQuestion,
    currentQuestionHints: [],
    questionHistory: updatedHistory,
    pendingRemediationStrands: needsTwist
      ? Array.from(new Set([...session.pendingRemediationStrands, strand.id]))
      : session.pendingRemediationStrands.filter((s) => s !== strand.id),
    retestQueue: nextRetestQueue,
    resolvedStrandsInSession: nextResolved,
    processedAttemptIds: [...session.processedAttemptIds, payload.attemptId],
    lastEvaluation: evaluation,
    imageSnapshots: updatedSnapshotMap,
    updatedAt: new Date().toISOString(),
  };

  return { evaluation, updatedSession, updatedProfile };
}

export function buildMasteryScorecard(
  session: PatternSessionState,
  profile: UserPatternProfile,
): { scorecard: MasteryScorecard; updatedProfile: UserPatternProfile } {
  const pattern = getPatternDefinition(session.patternId);
  if (!pattern) throw new Error(`Unknown pattern: ${session.patternId}`);

  const track: TrackMode = session.track ?? "intermediate";
  const nowIso = new Date().toISOString();
  const nowMs = Date.parse(nowIso);

  const strandBreakdown = pattern.strands.map((s) => {
    const st = profile.strands[s.id];
    const score = computeEffectiveStrandMastery(st, nowMs);
    return {
      strandId: s.id,
      title: s.title,
      score,
      status: st?.status ?? ("untouched" as const),
    };
  });

  const historyScores = session.questionHistory.map((h) => h.score);
  const avgSessionScore =
    historyScores.length > 0
      ? Math.round(
          historyScores.reduce((a, b) => a + b, 0) / historyScores.length,
        )
      : 0;

  const touchedStrands = strandBreakdown.filter((s) => s.status !== "untouched");
  const agg = computePatternAggregateMetrics(pattern.id, profile, nowMs);
  const gapsToReinforceCount = profile.errorSignatures.filter(
    (sig) => sig.patternId === pattern.id && sig.status === "active",
  ).length;
  const touchedRatio = touchedStrands.length / Math.max(1, pattern.strands.length);
  const unpenalizedSessionBlend =
    agg.masteryPercent * 0.72 + (avgSessionScore * touchedRatio) * 0.28;
  const rawCompleteness = Math.max(
    0,
    Math.min(100, Math.round(unpenalizedSessionBlend - gapsToReinforceCount * 4)),
  );
  const completenessScore =
    agg.masteredStrands < agg.totalStrands
      ? Math.min(rawCompleteness, 88)
      : rawCompleteness;

  const codeAudit = session.lastEvaluation?.codeAudit;
  const optimizationScore =
    track === "pro"
      ? codeAudit
        ? Math.round((codeAudit.timeScore + codeAudit.spaceScore) / 2)
        : avgSessionScore
      : null;

  const verbalClarityScore = Math.max(
    0,
    Math.min(100, Math.round(avgSessionScore + profile.cognitiveProfile.verbalToCodeGap * 0.25)),
  );

  const overallScore =
    optimizationScore !== null
      ? Math.round(avgSessionScore * 0.45 + optimizationScore * 0.55)
      : completenessScore;

  const strengths = strandBreakdown
    .filter((s) => s.score >= 75)
    .map((s) => `${s.title} (${s.score}%)`);

  const gapsToReinforce = profile.errorSignatures
    .filter((sig) => sig.patternId === pattern.id && sig.status === "active")
    .map((sig) => ({
      strandId: sig.strandId,
      summary: sig.summary,
      missClass: sig.missClass,
    }));

  const completedAt = nowIso;
  const scorecard: MasteryScorecard = {
    sessionId: session.sessionId,
    patternId: pattern.id,
    track,
    overallScore,
    completenessScore,
    optimizationScore,
    verbalClarityScore,
    strandBreakdown,
    strengths,
    gapsToReinforce,
    recommendedProblemSlugs: pattern.linkedProblemSlugs.slice(0, 3),
    completedAt,
  };

  const resolvedGaps = profile.errorSignatures.filter(
    (sig) => sig.patternId === pattern.id && sig.status === "repaired",
  ).length;

  const updatedProfile = recordCompletedSessionDigest(
    profile,
    {
      sessionId: session.sessionId,
      patternId: pattern.id,
      track,
      overallScore,
      resolvedGaps,
      remainingGaps: gapsToReinforce.length,
      completedAt,
    },
    optimizationScore,
    completenessScore,
  );

  return { scorecard, updatedProfile };
}

// ─── LearnHarness-Style 2-Question Binary-Search Calibration Probe ───────────

export async function startCalibrationProbe(
  session: PatternSessionState,
  profile: UserPatternProfile,
  deps: PatternEngineDeps = {},
): Promise<PatternSessionState> {
  const pattern = getPatternDefinition(session.patternId);
  if (!pattern) throw new Error(`Unknown pattern: ${session.patternId}`);

  // Start near top priority / high-fanout strand (LearnHarness Prober: binary-search ceiling)
  const sortedByFanout = [...pattern.strands].sort(
    (a, b) => b.fanoutWeight - a.fanoutWeight,
  );
  const strand = sortedByFanout[0] ?? pattern.strands[0]!;
  const twin = pattern.confusableTwins[0];

  const fallbackProbe: PatternQuestionCard = {
    id: uid("probe"),
    patternId: pattern.id,
    strandId: strand.id,
    modality: "mcq",
    phase: "probe",
    questionRole: "predict",
    prompt: `[Calibration Probe 1/2] Before picking notes vs Pro gauntlet on **${pattern.title}**, which reasoning rule holds without breaking on edge cases?`,
    options: [
      { value: "invariant", label: strand.coreInvariant },
      { value: "trap", label: strand.commonTrap },
      {
        value: "twin",
        label: twin
          ? `Always default to ${twin.twinPatternId} even when ${pattern.title} applies.`
          : "Sort or copy the full array inside the inner loop.",
      },
    ],
    multiSelect: false,
    allowIdk: true,
    requireVerbalApproach: true,
    rubric: {
      correctOptionValues: ["invariant"],
      expectedReasoning: `${strand.unconditionalTruth} ${strand.coreInvariant}`,
      keyInvariantsRequired: [strand.coreInvariant],
    },
  };

  const aiJson = await callPatternAgentWithFallback({
    role: "prober",
    systemPrompt: `You are a LearnHarness Diagnostic Prober calibrated for DSA. Generate ONE crisp high-signal diagnostic MCQ (with verbal reasoning) to bracket whether the learner belongs in Intermediate or Pro for ${pattern.title}. Return JSON: { "prompt": string, "options": [{"value": string, "label": string}], "correctOptionValues": [string], "expectedReasoning": string }.`,
    userPrompt: `Pattern: ${pattern.title}\nTarget Strand: ${strand.title}\nCore Invariant: ${strand.coreInvariant}\nCommon Trap: ${strand.commonTrap}`,
    session,
    profile,
    deps,
    deliverableTool: createDeliverQuestionTool(),
  });

  let probeCard = fallbackProbe;
  if (aiJson && typeof aiJson.prompt === "string") {
    probeCard = validateAndHealQuestionCard(
      {
        ...fallbackProbe,
        prompt: aiJson.prompt,
        options: aiJson.options,
        rubric: {
          correctOptionValues:
            aiJson.correctOptionValues !== undefined
              ? aiJson.correctOptionValues
              : fallbackProbe.rubric?.correctOptionValues,
          expectedReasoning:
            typeof aiJson.expectedReasoning === "string"
              ? aiJson.expectedReasoning
              : fallbackProbe.rubric!.expectedReasoning,
          keyInvariantsRequired: [strand.coreInvariant],
        },
      },
      fallbackProbe,
    );
  }

  return {
    ...session,
    stage: "probing",
    probeState: {
      questionsAsked: 1,
      answers: [],
      strandsObserved: [],
      recommendedTrack: null,
      recommendationRationale: null,
    },
    currentQuestion: probeCard,
    currentQuestionHints: [],
    updatedAt: new Date().toISOString(),
  };
}

export async function evaluateProbeSubmission(
  session: PatternSessionState,
  profile: UserPatternProfile,
  payload: SubmissionPayload,
  deps: PatternEngineDeps = {},
): Promise<{
  evaluation: SubmissionEvaluation;
  updatedSession: PatternSessionState;
  updatedProfile: UserPatternProfile;
}> {
  if (
    session.processedAttemptIds.includes(payload.attemptId) &&
    session.lastEvaluation &&
    session.lastEvaluation.questionId === payload.questionId
  ) {
    return {
      evaluation: session.lastEvaluation,
      updatedSession: session,
      updatedProfile: profile,
    };
  }

  const card = session.currentQuestion;
  if (!card || card.id !== payload.questionId) {
    throw new Error("Question mismatch or no active probe question.");
  }

  const pattern = getPatternDefinition(session.patternId);
  const strand = getStrandDefinition(card.strandId);
  if (!pattern || !strand) throw new Error("Invalid pattern or strand.");

  const rubric = card.rubric ?? {
    expectedReasoning: strand.coreInvariant,
    keyInvariantsRequired: [strand.coreInvariant],
  };

  const hintsUsed = session.currentQuestionHints ?? [];
  const highestLadderHint: HintRung | null =
    hintsUsed.length > 0 ? hintsUsed[hintsUsed.length - 1]!.rung : null;

  const { updatedSnapshotMap } = validateAndIngestSubmittedImages(
    payload.workImages,
    session.imageSnapshots ?? {},
  );

  const verbalText = (payload.verbalAnswer ?? "")
    .replace(/\[Pattern quote\]\(pat-citation:\/\/[^)]+\)/g, " ")
    .trim();
  const choseIdk = payload.choseIdk === true;
  const submittedConfidence = choseIdk
    ? null
    : typeof payload.confidence === "number"
      ? payload.confidence
      : null;
  const expected = new Set(rubric.correctOptionValues ?? []);
  const chosen = new Set(payload.selectedOptions ?? []);
  const selectionCorrect =
    card.modality === "mcq"
      ? !choseIdk &&
        expected.size > 0 &&
        expected.size === chosen.size &&
        [...expected].every((v) => chosen.has(v))
      : !choseIdk;

  const verbalScore = scoreVerbalExplanation(
    verbalText,
    rubric.expectedReasoning,
    rubric.keyInvariantsRequired,
  );
  const hiddenGap =
    card.modality === "mcq" && selectionCorrect && verbalScore < 45;
  const isCorrect = !choseIdk && selectionCorrect && verbalScore >= 45;
  const score = choseIdk
    ? 10
    : card.modality === "mcq"
      ? Math.round((selectionCorrect ? 65 : 15) + verbalScore * 0.35)
      : verbalScore;

  const probeHintRung = maxHintRung(
    choseIdk ? "R2" : null,
    highestLadderHint,
  );
  const confidenceDiagnostic = classifyConfidenceCalibration({
    confidence: submittedConfidence,
    choseIdk,
    isCorrect,
    hiddenGapDetected: hiddenGap,
    score,
  });

  const updatedProfile = applyStrandReviewUpdate(profile, {
    patternId: pattern.id,
    strandId: strand.id,
    score,
    isCorrect,
    hiddenGapDetected: hiddenGap,
    missClass: isCorrect ? null : choseIdk ? "cue" : "invariant-break",
    hintRung: probeHintRung,
    verbalScore,
    confidence: submittedConfidence,
    choseIdk,
  });

  const prevProbe = session.probeState ?? {
    questionsAsked: 1,
    answers: [],
    strandsObserved: [],
    recommendedTrack: null,
    recommendationRationale: null,
  };
  const nextAnswers = [
    ...prevProbe.answers,
    { strandId: strand.id, isCorrect, score },
  ];
  const observation: ProbeStrandObservation = {
    strandId: strand.id,
    floor: isCorrect ? strand.title : "Needs invariant review",
    ceiling:
      isCorrect && !hiddenGap ? "Verified boundary judgment" : strand.title,
    evidence: choseIdk
      ? "Flagged uncertainty on probe check."
      : `${selectionCorrect ? "Right" : "Missed"} probe choice (verbal ${verbalScore}%${probeHintRung ? `, hint=${probeHintRung}` : ""}).`,
  };
  const nextObserved: ProbeStrandObservation[] = [
    ...(prevProbe.strandsObserved ?? []),
    observation,
  ];

  // Probe Q1 done -> pose adaptive Probe Q2 (binary-search up or down)
  if (nextAnswers.length < 2) {
    const nextStrand =
      pattern.strands.find((s) => s.id !== strand.id) ?? pattern.strands[0]!;
    const twist = pattern.twistTemplates[0];
    const probeQ2: PatternQuestionCard = {
      id: uid("probe"),
      patternId: pattern.id,
      strandId: nextStrand.id,
      modality: "verbal_text",
      phase: "probe",
      questionRole: "check",
      prompt: isCorrect
        ? `[Calibration Probe 2/2 — Upper Bound] Nice! Stepping up difficulty on **${nextStrand.title}**: ${twist?.promptTemplate ?? `Explain what constraint change breaks ${nextStrand.title} and how to maintain optimal Time/Space.`}`
        : `[Calibration Probe 2/2 — Ground Check] Let's check your foundation on **${nextStrand.title}**: in your own words, why does "${nextStrand.commonTrap}" cause an incorrect answer?`,
      allowIdk: true,
      requireVerbalApproach: true,
      rubric: {
        expectedReasoning: `${nextStrand.unconditionalTruth} ${nextStrand.coreInvariant}`,
        keyInvariantsRequired: [nextStrand.coreInvariant],
      },
    };

    const evaluation: SubmissionEvaluation = {
      questionId: card.id,
      strandId: strand.id,
      isCorrect,
      hiddenGapDetected: hiddenGap,
      score,
      missClass: isCorrect ? null : choseIdk ? "cue" : "invariant-break",
      hintRung: probeHintRung,
      errorSignatureKey: null,
      verdictSummary: isCorrect
        ? "Probe 1/2 strong — testing a harder boundary next."
        : "Probe 1/2 surfaced uncertainty — checking your baseline foundation next.",
      surgicalTeaching: null,
      committedAnswerReveal: rubric.expectedReasoning,
      confidenceSubmitted: submittedConfidence,
      confidenceDiagnostic,
      twistedFollowUp: null,
      nextQuestion: probeQ2,
      readyForScorecard: false,
    };

    return {
      evaluation,
      updatedProfile,
      updatedSession: {
        ...session,
        stage: "probing",
        probeState: {
          ...prevProbe,
          questionsAsked: 2,
          answers: nextAnswers,
          strandsObserved: nextObserved,
        },
        currentQuestion: probeQ2,
        currentQuestionHints: [],
        imageSnapshots: updatedSnapshotMap,
        processedAttemptIds: [...session.processedAttemptIds, payload.attemptId],
        lastEvaluation: evaluation,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  // Probe Q2 done -> recommend & auto-launch Intermediate or Pro!
  const avgProbeScore = Math.round(
    nextAnswers.reduce((acc, a) => acc + a.score, 0) / nextAnswers.length,
  );
  const bothPassed = nextAnswers.every((a) => a.isCorrect);
  const recommendedTrack: TrackMode =
    bothPassed || avgProbeScore >= 75 ? "pro" : "intermediate";

  const rationale =
    recommendedTrack === "pro"
      ? `Diagnostic Probe complete (${avgProbeScore}% average across 2 probes): your invariant intuition is solid. Routing you directly to the **Pro** gauntlet & case-study complexity audit.`
      : `Diagnostic Probe complete (${avgProbeScore}% average across 2 probes): let's solidify key invariants first with **Intermediate** tailored notes before tackling twisted cases.`;

  let transitionedSession: PatternSessionState = {
    ...session,
    track: recommendedTrack,
    probeState: {
      questionsAsked: nextAnswers.length,
      answers: nextAnswers,
      strandsObserved: nextObserved,
      recommendedTrack,
      recommendationRationale: rationale,
    },
    currentQuestionHints: [],
    imageSnapshots: updatedSnapshotMap,
    processedAttemptIds: [...session.processedAttemptIds, payload.attemptId],
    updatedAt: new Date().toISOString(),
  };

  let nextQuestion: PatternQuestionCard | null = null;
  if (recommendedTrack === "intermediate") {
    const notes = await generateTailoredNotes(
      pattern.id,
      updatedProfile,
      deps,
      transitionedSession,
    );
    transitionedSession = {
      ...transitionedSession,
      stage: "studying_notes",
      notes,
      currentQuestion: null,
    };
  } else {
    nextQuestion = await generateNextPatternQuestion(
      transitionedSession,
      updatedProfile,
      deps,
    );
    transitionedSession = {
      ...transitionedSession,
      stage: "questioning",
      notes: null,
      currentQuestion: nextQuestion,
    };
  }

  const evaluation: SubmissionEvaluation = {
    questionId: card.id,
    strandId: strand.id,
    isCorrect,
    hiddenGapDetected: hiddenGap,
    score,
    missClass: isCorrect ? null : choseIdk ? "cue" : "invariant-break",
    hintRung: probeHintRung,
    errorSignatureKey: null,
    verdictSummary: rationale,
    surgicalTeaching: null,
    committedAnswerReveal: rubric.expectedReasoning,
    confidenceSubmitted: submittedConfidence,
    confidenceDiagnostic,
    twistedFollowUp: null,
    nextQuestion,
    readyForScorecard: false,
  };
  transitionedSession.lastEvaluation = evaluation;

  return {
    evaluation,
    updatedSession: transitionedSession,
    updatedProfile,
  };
}

// ─── LearnHarness-Style Progressive Hint Ladder (R0 -> R3) ───────────────────

export async function requestProgressiveHint(
  session: PatternSessionState,
  _profile: UserPatternProfile,
  deps: PatternEngineDeps = {},
): Promise<{
  hint: QuestionHintEntry;
  updatedSession: PatternSessionState;
  alreadyAtMax: boolean;
}> {
  const card = session.currentQuestion;
  if (!card) {
    throw new Error("No active question to generate a hint for.");
  }
  const pattern = getPatternDefinition(session.patternId);
  const strand = getStrandDefinition(card.strandId);
  if (!pattern || !strand) {
    throw new Error("Invalid pattern or strand state.");
  }

  const existingHints = session.currentQuestionHints ?? [];
  if (existingHints.length >= HINT_LADDER_LEVELS.length) {
    return {
      hint: existingHints[existingHints.length - 1]!,
      updatedSession: session,
      alreadyAtMax: true,
    };
  }

  const tier = HINT_LADDER_LEVELS[existingHints.length]!;
  const twistBreak =
    pattern.twistTemplates.find((t) => t.targetStrandId === strand.id)
      ?.whatItBreaks ?? strand.coreInvariant;

  const fallbackHints: Record<"R0" | "R1" | "R2" | "R3", string> = {
    R0: `Focus on the unconditional property for ${strand.title}: ${strand.unconditionalTruth}`,
    R1: `Stress-test your assumption against this exact failure mode: "${strand.commonTrap}".`,
    R2: `Walk a tiny 3-4 element example where ${twistBreak.slice(0, 140)} — notice how the pointer/state invariant reacts.`,
    R3: `Core invariant scaffold: ${strand.coreInvariant}${card.codeStarter ? ` Aim for ${pattern.proCaseStudy.optimalTime} time and ${pattern.proCaseStudy.optimalSpace} space.` : ""}`,
  };

  const aiCaller = deps.aiCaller ?? defaultPatternAiCaller;
  const systemPrompt = `You are a Socratic DSA mentor issuing ONE progressive hint at rung ${tier.rung} (${tier.label}).
Return STRICT JSON:
{
  "hintText": string
}
Rules:
- Pedagogical tier: ${tier.guidance}
- NEVER reveal the exact correct MCQ option label/value or full copy-pasteable solution code.
- Keep the hint crisp (1-3 sentences).`;

  const userPrompt = `Pattern: ${pattern.title} | Strand: ${strand.title}
Question (${card.modality}): ${card.prompt}
Target Rung: ${tier.rung} (${tier.label})
Core Invariant: ${strand.coreInvariant}
Common Trap: ${strand.commonTrap}
Previously Issued Hints: ${existingHints.map((h) => `[${h.rung}] ${h.hintText}`).join(" | ") || "none"}
Session Cognitive Digest:
${buildSessionDigest(session, _profile, card.strandId)}`;

  const rawAiJson = await callPatternAgentWithFallback({
    role: resolvePatternAgentRole(session, "request_hint"),
    systemPrompt,
    userPrompt,
    session,
    profile: _profile,
    deps,
  });
  const aiJson = healEncodedFields(rawAiJson);
  const rawText =
    aiJson && typeof aiJson.hintText === "string"
      ? aiJson.hintText.trim()
      : "";
  const hintText =
    rawText.length >= 12 ? rawText.slice(0, 500) : fallbackHints[tier.rung];

  const hint: QuestionHintEntry = {
    rung: tier.rung,
    label: tier.label,
    hintText,
  };

  const nextHints = [...existingHints, hint];
  const updatedSession: PatternSessionState = {
    ...session,
    currentQuestionHints: nextHints,
    updatedAt: new Date().toISOString(),
  };

  return {
    hint,
    updatedSession,
    alreadyAtMax: nextHints.length >= HINT_LADDER_LEVELS.length,
  };
}

// ─── Unified Turn Dispatcher (used by both SSE Turn Runner & Legacy REST) ───

export interface ExecutedTurnOutcome {
  session: PatternSessionState;
  profile: UserPatternProfile;
  evaluation?: SubmissionEvaluation;
  hint?: QuestionHintEntry;
  alreadyAtMax?: boolean;
  scorecard?: MasteryScorecard;
}

export class TurnConflictError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 409) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function executePatternTurnAction(
  existing: PatternSessionState,
  profile: UserPatternProfile,
  action: PatternTurnActionInput,
  deps: PatternEngineDeps = {},
): Promise<ExecutedTurnOutcome> {
  if (action.kind === "start_probe") {
    if (existing.stage === "probing" && existing.currentQuestion) {
      return { session: existing, profile };
    }
    if (existing.stage !== "calibration") {
      throw new TurnConflictError(
        "Calibration probe is only available from the calibration stage.",
      );
    }
    const probed = await startCalibrationProbe(existing, profile, deps);
    return { session: probed, profile };
  }

  if (action.kind === "select_level") {
    if (existing.track === action.track && existing.stage !== "calibration") {
      return { session: existing, profile };
    }
    if (
      existing.stage !== "calibration" &&
      existing.stage !== "probing" &&
      existing.stage !== "studying_notes"
    ) {
      throw new TurnConflictError(
        "Session track is already locked past calibration.",
      );
    }

    let nextSession: PatternSessionState = {
      ...existing,
      track: action.track,
      updatedAt: new Date().toISOString(),
    };
    if (action.track === "intermediate") {
      const notes = await generateTailoredNotes(
        existing.patternId,
        profile,
        deps,
        existing,
      );
      nextSession = {
        ...nextSession,
        stage: "studying_notes",
        notes,
        currentQuestion: null,
        currentQuestionHints: [],
      };
    } else {
      const firstQuestion = await generateNextPatternQuestion(
        nextSession,
        profile,
        deps,
      );
      nextSession = {
        ...nextSession,
        stage: "questioning",
        notes: null,
        currentQuestion: firstQuestion,
        currentQuestionHints: [],
      };
    }
    return { session: nextSession, profile };
  }

  if (action.kind === "ready_questions") {
    if (existing.currentQuestion && existing.stage === "questioning") {
      return { session: existing, profile };
    }
    const q = await generateNextPatternQuestion(existing, profile, deps);
    return {
      session: {
        ...existing,
        stage: "questioning",
        currentQuestion: q,
        currentQuestionHints: [],
        updatedAt: new Date().toISOString(),
      },
      profile,
    };
  }

  if (action.kind === "request_hint") {
    if (
      !existing.currentQuestion ||
      existing.currentQuestion.id !== action.questionId
    ) {
      throw new TurnConflictError("Question is no longer active.");
    }
    const res = await requestProgressiveHint(existing, profile, deps);
    return {
      session: res.updatedSession,
      profile,
      hint: res.hint,
      alreadyAtMax: res.alreadyAtMax,
    };
  }

  if (action.kind === "submit") {
    const payload = action.payload;
    if (
      existing.processedAttemptIds.includes(payload.attemptId) &&
      existing.lastEvaluation &&
      existing.lastEvaluation.questionId === payload.questionId
    ) {
      return {
        session: existing,
        profile,
        evaluation: existing.lastEvaluation,
      };
    }
    if (
      !existing.currentQuestion ||
      existing.currentQuestion.id !== payload.questionId
    ) {
      throw new TurnConflictError(
        "Question is no longer active or already resolved.",
      );
    }
    const result =
      existing.stage === "probing"
        ? await evaluateProbeSubmission(existing, profile, payload, deps)
        : await evaluateSubmissionAndBuildFollowUp(
            existing,
            profile,
            payload,
            deps,
          );
    return {
      session: result.updatedSession,
      profile: result.updatedProfile,
      evaluation: result.evaluation,
    };
  }

  if (action.kind === "retry") {
    if (existing.stage === "probing") {
      const probed = await startCalibrationProbe(existing, profile, deps);
      return { session: probed, profile };
    }
    if (existing.stage === "studying_notes" || !existing.track) {
      const notes = await generateTailoredNotes(
        existing.patternId,
        profile,
        deps,
        existing,
      );
      return {
        session: {
          ...existing,
          stage: "studying_notes",
          notes,
          updatedAt: new Date().toISOString(),
        },
        profile,
      };
    }
    if (existing.stage === "completed") {
      return { session: existing, profile };
    }
    const q = await generateNextPatternQuestion(existing, profile, deps);
    return {
      session: {
        ...existing,
        currentQuestion: q,
        currentQuestionHints: [],
        updatedAt: new Date().toISOString(),
      },
      profile,
    };
  }

  // action.kind === "finish"
  if (existing.stage === "completed" && existing.scorecard) {
    return {
      session: existing,
      profile,
      scorecard: existing.scorecard,
    };
  }
  const { scorecard, updatedProfile } = buildMasteryScorecard(existing, profile);
  return {
    session: {
      ...existing,
      stage: "completed",
      currentQuestion: null,
      scorecard,
      updatedAt: new Date().toISOString(),
    },
    profile: updatedProfile,
    scorecard,
  };
}

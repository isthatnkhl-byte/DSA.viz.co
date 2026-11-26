import crypto from "node:crypto";
import { GoogleGenAI, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import {
  ANCESTOR_STRANDS,
  STRAND_MAP,
  TRANSITIVE_DOWNSTREAM_STRANDS,
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
  healEncodedFields,
  healMissClass,
  healStringifiedArray,
  stripModelValueDebris,
} from "./healer";
import { matchPatternAndStrands, resolveStrandTarget } from "./matcher";
import { buildCaseStudyTestProgram, parseDriverTestSummary } from "./test-drivers";
import {
  generateAndVerifyPatternVisual,
  type VisualModelCaller,
} from "./visual-agent.server";
import {
  HINT_RUNGS,
  MISS_CLASSES,
  type AgentRole,
  type GeneratedVisualArtifact,
  type ImageSnapshot,
  type PatternCodeLanguage,
  type PatternId,
  type PatternQuestionCard,
  type PatternSessionState,
  type PatternTurnActionKind,
  type PatternTurnSteerNote,
  type SupportedImageMime,
  type UserPatternProfile,
} from "./types";

export interface PatternToolExecutionResult {
  isError?: boolean;
  output: Record<string, unknown>;
  /** Sanitized single-line preview safe to emit over SSE (never contains rubrics). */
  safePreview: string;
}

export interface PatternToolContext {
  session: PatternSessionState;
  profile: UserPatternProfile;
  codeRunner?: typeof runSecureCode;
  visualModelCaller?: VisualModelCaller;
  lastGeneratedVisual?: GeneratedVisualArtifact | null;
  sandboxCallsUsed: number;
}

export interface PatternAgentTool<TArgs = Record<string, unknown>> {
  name: string;
  description: string;
  parametersJsonSchema: Record<string, unknown>;
  schema: z.ZodType<TArgs>;
  terminating?: boolean;
  /** Redact sensitive keys (like rubric/answer keys) from SSE argsPreview. */
  redactArgsForStream?: (args: Record<string, unknown>) => string;
  execute: (
    args: TArgs,
    ctx: PatternToolContext,
  ) => Promise<PatternToolExecutionResult>;
}

export interface ModelStreamStepRequest {
  step: number;
  role: AgentRole;
  systemPrompt: string;
  images?: Array<{ mimeType: SupportedImageMime; data: string }>;
  messages: Array<
    | { role: "user"; text: string }
    | {
        role: "model";
        text?: string;
        reasoning?: string;
        functionCalls?: Array<{
          id: string;
          name: string;
          args: Record<string, unknown>;
        }>;
      }
    | {
        role: "tool";
        callId: string;
        name: string;
        response: Record<string, unknown>;
      }
  >;
  tools: PatternAgentTool<any>[];
  signal?: AbortSignal;
  onReasoningDelta?: (accumulated: string) => void;
  onTextDelta?: (accumulated: string) => void;
}

export interface ModelStreamStepResponse {
  text?: string;
  reasoning?: string;
  functionCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
}

export type PatternModelStepCaller = (
  req: ModelStreamStepRequest,
) => Promise<ModelStreamStepResponse | null>;

export interface PatternAgentLoopCallbacks {
  onStepStarted?: (step: number) => void;
  onReasoningUpdate?: (text: string) => void;
  onMessageUpdate?: (text: string) => void;
  onToolCallStart?: (
    callId: string,
    toolName: string,
    argsPreview: string,
  ) => void;
  onToolCallEnd?: (
    callId: string,
    toolName: string,
    isError: boolean,
    healed: boolean,
    resultPreview: string,
    durationMs: number,
  ) => void;
  onSteerApplied?: (steer: PatternTurnSteerNote) => void;
  consumePendingSteers?: () => PatternTurnSteerNote[];
}

export interface PatternAgentLoopResult {
  deliveredTool?: {
    name: string;
    args: Record<string, unknown>;
    output: Record<string, unknown>;
  };
  generatedVisual?: GeneratedVisualArtifact | null;
  finalText?: string;
  reasoningSummary?: string;
  steersApplied: string[];
  aborted: boolean;
}

export function resolvePatternAgentRole(
  session: Pick<PatternSessionState, "stage" | "track">,
  action: PatternTurnActionKind,
): AgentRole {
  if (action === "start_probe" || session.stage === "probing") {
    return "prober";
  }
  if (session.track === "pro") {
    return "practitioner";
  }
  return "teacher";
}

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

interface GeminiWorkingCache {
  __dsavizPatternWorkingGeminiModel?: { model: string; cachedAt: number };
}

function getPreferredGeminiCandidates(): string[] {
  const base = [
    "gemini-3-flash-preview",
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
  ];
  const g = globalThis as typeof globalThis & GeminiWorkingCache;
  const cached = g.__dsavizPatternWorkingGeminiModel;
  if (cached && Date.now() - cached.cachedAt < 30 * 60_000) {
    return [cached.model, ...base.filter((m) => m !== cached.model)];
  }
  return base;
}

function rememberWorkingGeminiModel(model: string): void {
  const g = globalThis as typeof globalThis & GeminiWorkingCache;
  g.__dsavizPatternWorkingGeminiModel = { model, cachedAt: Date.now() };
}

function safeArgsPreview(
  tool: PatternAgentTool<any>,
  args: Record<string, unknown>,
): string {
  if (tool.redactArgsForStream) {
    return tool.redactArgsForStream(args).slice(0, 160);
  }
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (
      k === "rubric" ||
      k === "correctOptionValues" ||
      k === "expectedReasoning" ||
      k === "distractorMentalModels"
    ) {
      clone[k] = "[REDACTED]";
    } else if (typeof v === "string") {
      clone[k] = v.length > 60 ? `${v.slice(0, 57)}...` : v;
    } else {
      clone[k] = v;
    }
  }
  const serialized = JSON.stringify(clone);
  return serialized.length > 160 ? `${serialized.slice(0, 157)}...` : serialized;
}

/**
 * LearnHarness Universal Boundary Heal (`healEncodedFields` + array unwrapping):
 * attempts mechanical recovery before strict Zod schema checks so weak models
 * succeed cleanly or receive structured Zod error feedback inside the loop.
 */
export function prepareAndValidateToolArgs<T>(
  tool: PatternAgentTool<T>,
  rawArgs: unknown,
):
  | { ok: true; args: T; healed: boolean }
  | { ok: false; error: string } {
  const rawJson = JSON.stringify(rawArgs ?? {});
  const healedObj =
    healEncodedFields<Record<string, unknown>>(rawArgs) ??
    (rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
      ? { ...(rawArgs as Record<string, unknown>) }
      : {});

  for (const key of [
    "options",
    "correctOptionValues",
    "keyInvariantsRequired",
    "unconditionalTruths",
    "pitfalls",
    "highlightedTrapNotes",
  ]) {
    if (key in healedObj) {
      healedObj[key] = healStringifiedArray(healedObj[key]);
    }
  }

  if (typeof healedObj.missClass === "string") {
    healedObj.missClass = healMissClass(healedObj.missClass);
  }
  if (typeof healedObj.hintRung === "string") {
    const cleaned = stripModelValueDebris(healedObj.hintRung).toUpperCase();
    healedObj.hintRung = (HINT_RUNGS as readonly string[]).includes(cleaned)
      ? cleaned
      : null;
  }

  const healed = JSON.stringify(healedObj) !== rawJson;
  const parsed = tool.schema.safeParse(healedObj);
  if (!parsed.success) {
    const summary = parsed.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join("; ");
    return {
      ok: false,
      error: `Invalid arguments for ${tool.name}: ${summary}`,
    };
  }
  return { ok: true, args: parsed.data, healed };
}

// ─── Read-Only & Execution Tools Shared Across Roles ────────────────────────

export function createLookupStrandDagTool(): PatternAgentTool<{
  strandId?: string;
  patternId?: PatternId;
}> {
  return {
    name: "lookup_strand_dag",
    description:
      "Inspect canonical strand prerequisites, transitive downstream impact, unconditional truths, common traps, and the learner's mastery/active error signatures.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        strandId: {
          type: "string",
          description: "Canonical strand ID or slug, e.g. 'sliding-window:monotonicity-condition'",
        },
        patternId: {
          type: "string",
          description: "Optional pattern slug, e.g. 'two-pointers'",
        },
      },
      additionalProperties: false,
    },
    schema: z.object({
      strandId: z.string().min(1).max(120).optional(),
      patternId: z.string().min(1).max(80).optional() as z.ZodType<
        PatternId | undefined
      >,
    }),
    redactArgsForStream: (a) =>
      `strand=${String(a.strandId ?? a.patternId ?? "session")}`,
    execute: async (args, ctx) => {
      const targetPatternId = args.patternId ?? ctx.session.patternId;
      const resolved = args.strandId
        ? resolveStrandTarget(args.strandId, targetPatternId)
        : null;

      if (resolved) {
        const st = ctx.profile.strands[resolved.id] ?? null;
        const ancestors = (ANCESTOR_STRANDS.get(resolved.id) ?? []).map((id) => ({
          id,
          mastery: ctx.profile.strands[id]?.mastery ?? 0,
          status: ctx.profile.strands[id]?.status ?? "untouched",
        }));
        const downstream = TRANSITIVE_DOWNSTREAM_STRANDS.get(resolved.id) ?? [];
        const sigs = ctx.profile.errorSignatures
          .filter((s) => s.strandId === resolved.id && s.status === "active")
          .slice(0, 4);

        return {
          output: {
            strandId: resolved.id,
            title: resolved.title,
            unconditionalTruth: resolved.unconditionalTruth,
            coreInvariant: resolved.coreInvariant,
            commonTrap: resolved.commonTrap,
            userState: st,
            ancestors,
            downstreamCount: downstream.length,
            activeErrorSignatures: sigs,
          },
          safePreview: `Inspected ${resolved.id.split(":")[1] ?? resolved.id} (${ancestors.length} prereqs)`,
        };
      }

      const pat = getPatternDefinition(targetPatternId);
      if (!pat) {
        return {
          isError: true,
          output: { error: `Unknown pattern or strand: ${args.strandId ?? targetPatternId}` },
          safePreview: "Unknown DAG target",
        };
      }
      const strandStates = pat.strands.map((s) => ({
        id: s.id,
        title: s.title,
        prereqs: s.prerequisiteStrandIds,
        mastery: ctx.profile.strands[s.id]?.mastery ?? 0,
        status: ctx.profile.strands[s.id]?.status ?? "untouched",
        lastMiss: ctx.profile.strands[s.id]?.lastMissClass ?? null,
      }));
      return {
        output: {
          patternId: pat.id,
          title: pat.title,
          confusableTwins: pat.confusableTwins,
          strands: strandStates,
        },
        safePreview: `Loaded ${strandStates.length} strands for ${pat.id}`,
      };
    },
  };
}

export function createSearchPatternProblemsTool(): PatternAgentTool<{
  query: string;
  limit?: number;
}> {
  return {
    name: "search_pattern_problems",
    description:
      "Search the 49-strand curriculum and linked LeetCode-style problem slugs semantically by technique, problem name, or misconception cue.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Problem slug or concept keywords" },
        limit: { type: "integer", minimum: 1, maximum: 8 },
      },
      required: ["query"],
      additionalProperties: false,
    },
    schema: z.object({
      query: z.string().min(1).max(200),
      limit: z.number().int().min(1).max(8).optional(),
    }),
    redactArgsForStream: (a) => `query="${String(a.query ?? "").slice(0, 48)}"`,
    execute: async (args) => {
      const matches = matchPatternAndStrands(args.query, args.limit ?? 4).map(
        (m) => {
          const pat = getPatternDefinition(m.patternId);
          return {
            strandId: m.strandId,
            patternId: m.patternId,
            strandTitle: m.strandTitle,
            matchedVia: m.matchedVia,
            coreInvariant: m.coreInvariant,
            linkedProblems: pat?.linkedProblemSlugs.slice(0, 4) ?? [],
          };
        },
      );
      return {
        output: { matches },
        safePreview: `Matched ${matches.length} curriculum node(s)`,
      };
    },
  };
}

export function createGenerateVerifiedVisualTool(): PatternAgentTool<{
  brief: string;
  strandId?: string;
}> {
  return {
    name: "generate_verified_visual",
    description:
      "Synthesize and geometry-audit a custom counterexample or state-trace diagram (SVG or bounded Excalidraw parameters) for the current strand.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        brief: {
          type: "string",
          description:
            "Concrete values, pointer states, or failure counterexample to visualize clearly.",
        },
        strandId: {
          type: "string",
          description: "Optional canonical strand ID for fallback context.",
        },
      },
      required: ["brief"],
      additionalProperties: false,
    },
    schema: z.object({
      brief: z.string().min(6).max(600),
      strandId: z.string().max(120).optional(),
    }),
    redactArgsForStream: (a) =>
      `brief="${String(a.brief ?? "").slice(0, 60)}"`,
    execute: async (args, ctx) => {
      const targetStrand =
        args.strandId ??
        ctx.session.currentQuestion?.strandId ??
        `${ctx.session.patternId}:core`;
      const visual = await generateAndVerifyPatternVisual({
        patternId: ctx.session.patternId,
        strandId: targetStrand,
        brief: args.brief,
        visualModelCaller: ctx.visualModelCaller,
      });
      ctx.lastGeneratedVisual = visual;
      return {
        output: {
          ok: true,
          title: visual.title,
          kind: visual.kind,
          verifiedByAuditor: visual.verifiedByAuditor,
          auditNotes: visual.auditNotes,
        },
        safePreview: `Audited ${visual.kind} visual (${visual.auditNotes[0] ?? "verified"})`,
      };
    },
  };
}

export function mapLanguageForSandbox(lang?: string): SupportedLanguage | null {
  if (lang === "cpp" || lang === "python" || lang === "java") return lang;
  return null;
}

export function createExecuteCodeSandboxTool(): PatternAgentTool<{
  code: string;
  language: PatternCodeLanguage;
}> {
  return {
    name: "execute_code_sandbox",
    description:
      "Compile & run code against the pattern's automated case-study test driver inside the secure sandbox (Practitioner role, max 2 runs per turn).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Complete class Solution implementation" },
        language: {
          type: "string",
          enum: ["cpp", "python", "java"],
        },
      },
      required: ["code", "language"],
      additionalProperties: false,
    },
    schema: z.object({
      code: z.string().min(5).max(15000),
      language: z.enum(["cpp", "python", "java"]),
    }),
    redactArgsForStream: (a) => `lang=${String(a.language ?? "cpp")}`,
    execute: async (args, ctx) => {
      if (ctx.sandboxCallsUsed >= 2) {
        return {
          isError: true,
          output: { error: "Sandbox execution budget exhausted for this turn (max 2)." },
          safePreview: "Sandbox cap reached",
        };
      }
      ctx.sandboxCallsUsed += 1;
      const sandboxLang = mapLanguageForSandbox(args.language);
      if (!sandboxLang) {
        return {
          isError: true,
          output: { error: `Unsupported sandbox language: ${args.language}` },
          safePreview: "Unsupported language",
        };
      }
      const runner = ctx.codeRunner ?? runSecureCode;
      const driver = buildCaseStudyTestProgram(
        ctx.session.patternId,
        args.language,
        args.code,
      );
      try {
        const res = await runner(driver.wrappedCode, "", sandboxLang);
        const summary = parseDriverTestSummary(
          res.stdout || "",
          res.exitCode,
          driver.usedTestHarness,
        );
        const passed = summary.passed && res.status !== "error";
        return {
          output: {
            passed,
            testsPassed: summary.testsPassed,
            testsTotal: summary.testsTotal,
            stdout: (res.stdout || "").slice(0, 800),
            stderr: (res.stderr || "").slice(0, 600),
          },
          safePreview: passed
            ? `Sandbox PASS (${summary.testsPassed ?? "?"}/${summary.testsTotal ?? "?"})`
            : `Sandbox FAIL`,
        };
      } catch (err) {
        return {
          isError: true,
          output: {
            error: String((err as Error)?.message || "Sandbox execution error"),
          },
          safePreview: "Sandbox error",
        };
      }
    },
  };
}

// ─── Terminating Deliverable Tools (with Zod self-correction guarantees) ────

export const DeliverQuestionArgsSchema = z
  .object({
    modality: z.enum(["mcq", "verbal_text", "code_snippet"]).optional(),
    questionRole: z.enum(["predict", "check", "apply"]).optional(),
    prompt: z.string().min(10).max(2000),
    contextSnippet: z.string().max(1200).nullable().optional(),
    options: z
      .array(
        z.object({
          value: z.string().min(1),
          label: z.string().min(1),
        }),
      )
      .nullable()
      .optional(),
    correctOptionValues: z.array(z.string().min(1)).nullable().optional(),
    expectedReasoning: z.string().min(5).max(1600),
    expectedComplexity: z
      .object({
        time: z.string().min(1),
        space: z.string().min(1),
      })
      .nullable()
      .optional(),
    keyInvariantsRequired: z.array(z.string().min(1)).min(1).max(6),
    distractorMentalModels: z.record(z.string(), z.string()).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.modality === "mcq" || (val.options && val.options.length > 0)) {
      if (!val.options || val.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "MCQ requires at least 2 distinct options.",
        });
        return;
      }
      const optionVals = new Set(val.options.map((o) => o.value));
      const correct = val.correctOptionValues ?? [];
      if (correct.length === 0 || !correct.every((c) => optionVals.has(c))) {
        ctx.addIssue({
          code: "custom",
          path: ["correctOptionValues"],
          message:
            "correctOptionValues must contain at least one value matching options[].value.",
        });
      }
    }
  });

export function createDeliverQuestionTool(): PatternAgentTool<
  z.infer<typeof DeliverQuestionArgsSchema>
> {
  return {
    name: "deliver_question",
    description:
      "Commit the next assessment question AND its hidden server-only grading rubric atomically (terminates the question-generation turn).",
    terminating: true,
    parametersJsonSchema: {
      type: "object",
      properties: {
        modality: { type: "string", enum: ["mcq", "verbal_text", "code_snippet"] },
        questionRole: { type: "string", enum: ["predict", "check", "apply"] },
        prompt: { type: "string" },
        contextSnippet: { type: ["string", "null"] },
        options: {
          type: ["array", "null"],
          items: {
            type: "object",
            properties: {
              value: { type: "string" },
              label: { type: "string" },
            },
            required: ["value", "label"],
          },
        },
        correctOptionValues: {
          type: ["array", "null"],
          items: { type: "string" },
        },
        expectedReasoning: { type: "string" },
        expectedComplexity: {
          type: ["object", "null"],
          properties: {
            time: { type: "string" },
            space: { type: "string" },
          },
          required: ["time", "space"],
        },
        keyInvariantsRequired: {
          type: "array",
          items: { type: "string" },
        },
        distractorMentalModels: {
          type: ["object", "null"],
          additionalProperties: { type: "string" },
        },
      },
      required: ["prompt", "expectedReasoning", "keyInvariantsRequired"],
    },
    schema: DeliverQuestionArgsSchema,
    redactArgsForStream: (a) =>
      `modality=${String(a.modality ?? "auto")} [rubric redacted]`,
    execute: async (args) => ({
      output: args as unknown as Record<string, unknown>,
      safePreview: `Committed ${args.modality ?? "assessment"} question`,
    }),
  };
}

export const DeliverEvaluationArgsSchema = z.object({
  isCorrect: z.boolean(),
  hiddenGapDetected: z.boolean(),
  score: z.number().min(0).max(100),
  verbalScore: z.number().min(0).max(100),
  missClass: z.enum(MISS_CLASSES).nullable(),
  hintRung: z.enum(HINT_RUNGS).nullable(),
  errorSignatureKey: z.string().max(120).nullable(),
  gapSummary: z.string().max(220).nullable(),
  verdictSummary: z.string().min(4).max(800),
  surgicalTeaching: z.string().max(1600).nullable(),
  twistedFollowUp: z
    .object({
      operator: z.enum([
        "constraint-twist",
        "reverse-premise",
        "break-the-premise",
        "discrimination",
      ]),
      prompt: z.string().min(8).max(1200),
      expectedReasoning: z.string().min(5).max(1000),
    })
    .nullable()
    .optional(),
  codeAudit: z
    .object({
      tier: z.enum(["Incomplete", "Brute Force", "Better", "Optimal"]),
      detectedTime: z.string(),
      detectedSpace: z.string(),
      timeScore: z.number().min(0).max(100),
      spaceScore: z.number().min(0).max(100),
      optimizationFeedback: z.string(),
    })
    .nullable()
    .optional(),
});

export function createDeliverEvaluationTool(): PatternAgentTool<
  z.infer<typeof DeliverEvaluationArgsSchema>
> {
  return {
    name: "deliver_evaluation",
    description:
      "Commit the cross-signal evaluation verdict, surgical micro-lesson, and optional twisted follow-up prompt (terminates grading turn).",
    terminating: true,
    parametersJsonSchema: {
      type: "object",
      properties: {
        isCorrect: { type: "boolean" },
        hiddenGapDetected: { type: "boolean" },
        score: { type: "number" },
        verbalScore: { type: "number" },
        missClass: { type: ["string", "null"] },
        hintRung: { type: ["string", "null"] },
        errorSignatureKey: { type: ["string", "null"] },
        gapSummary: { type: ["string", "null"] },
        verdictSummary: { type: "string" },
        surgicalTeaching: { type: ["string", "null"] },
        twistedFollowUp: {
          type: ["object", "null"],
          properties: {
            operator: { type: "string" },
            prompt: { type: "string" },
            expectedReasoning: { type: "string" },
          },
          required: ["operator", "prompt", "expectedReasoning"],
        },
        codeAudit: {
          type: ["object", "null"],
          properties: {
            tier: { type: "string" },
            detectedTime: { type: "string" },
            detectedSpace: { type: "string" },
            timeScore: { type: "number" },
            spaceScore: { type: "number" },
            optimizationFeedback: { type: "string" },
          },
        },
      },
      required: [
        "isCorrect",
        "hiddenGapDetected",
        "score",
        "verbalScore",
        "verdictSummary",
      ],
    },
    schema: DeliverEvaluationArgsSchema,
    redactArgsForStream: (a) =>
      `score=${String(a.score ?? "?")} correct=${String(a.isCorrect ?? "?")}`,
    execute: async (args) => ({
      output: args as unknown as Record<string, unknown>,
      safePreview: `Graded (${Math.round(args.score)}%, correct=${args.isCorrect})`,
    }),
  };
}

export const DeliverNotesArgsSchema = z.object({
  unconditionalTruths: z
    .array(z.object({ title: z.string().min(2), statement: z.string().min(4) }))
    .min(1)
    .max(5),
  motivatedDiscovery: z.object({
    bruteForceBottleneck: z.string().min(4),
    keyInsight: z.string().min(4),
    whyItWorks: z.string().min(4),
  }),
  canonicalTemplate: z.object({
    language: z.enum(["cpp", "python", "java", "typescript", "javascript"]).optional(),
    code: z.string().min(10),
    invariantAnnotation: z.string().min(4),
  }),
  pitfalls: z
    .array(
      z.object({
        trap: z.string().min(2),
        counterexample: z.string().min(2),
        fix: z.string().min(2),
      }),
    )
    .min(1)
    .max(4),
});

export function createDeliverNotesTool(): PatternAgentTool<
  z.infer<typeof DeliverNotesArgsSchema>
> {
  return {
    name: "deliver_notes",
    description:
      "Commit pruned first-principles notes (unconditional truths, motivated discovery, canonical template, pitfalls) for the Intermediate learner.",
    terminating: true,
    parametersJsonSchema: {
      type: "object",
      properties: {
        unconditionalTruths: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, statement: { type: "string" } },
            required: ["title", "statement"],
          },
        },
        motivatedDiscovery: {
          type: "object",
          properties: {
            bruteForceBottleneck: { type: "string" },
            keyInsight: { type: "string" },
            whyItWorks: { type: "string" },
          },
          required: ["bruteForceBottleneck", "keyInsight", "whyItWorks"],
        },
        canonicalTemplate: {
          type: "object",
          properties: {
            language: { type: "string" },
            code: { type: "string" },
            invariantAnnotation: { type: "string" },
          },
          required: ["code", "invariantAnnotation"],
        },
        pitfalls: {
          type: "array",
          items: {
            type: "object",
            properties: {
              trap: { type: "string" },
              counterexample: { type: "string" },
              fix: { type: "string" },
            },
            required: ["trap", "counterexample", "fix"],
          },
        },
      },
      required: [
        "unconditionalTruths",
        "motivatedDiscovery",
        "canonicalTemplate",
        "pitfalls",
      ],
    },
    schema: DeliverNotesArgsSchema,
    redactArgsForStream: () => "structured study dossier",
    execute: async (args) => ({
      output: args as unknown as Record<string, unknown>,
      safePreview: `Synthesized ${args.unconditionalTruths.length} truths & ${args.pitfalls.length} pitfalls`,
    }),
  };
}

// ─── Default Gemini / OpenAI Multi-Turn Streaming Step Caller ───────────────

export const defaultPatternModelStepCaller: PatternModelStepCaller = async (
  req,
) => {
  const geminiKey = getGeminiKey();
  if (isConfiguredKey(geminiKey)) {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    const candidates = getPreferredGeminiCandidates();
    const functionDeclarations: FunctionDeclaration[] = req.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parametersJsonSchema: t.parametersJsonSchema,
    }));

    const contents = req.messages.map((m, idx) => {
      if (m.role === "user") {
        const parts: Array<Record<string, unknown>> = [{ text: m.text }];
        if (idx === 0 && req.images && req.images.length > 0) {
          for (const img of req.images) {
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.data,
              },
            });
          }
        }
        return { role: "user" as const, parts };
      }
      if (m.role === "model") {
        const parts: Array<Record<string, unknown>> = [];
        if (m.text) parts.push({ text: m.text });
        for (const fc of m.functionCalls ?? []) {
          parts.push({ functionCall: { id: fc.id, name: fc.name, args: fc.args } });
        }
        return { role: "model" as const, parts };
      }
      return {
        role: "user" as const,
        parts: [
          {
            functionResponse: {
              id: m.callId,
              name: m.name,
              response: m.response,
            },
          },
        ],
      };
    });

    for (const model of candidates) {
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents: contents as any,
          config: {
            systemInstruction: req.systemPrompt,
            temperature: 0.3,
            tools:
              functionDeclarations.length > 0
                ? [{ functionDeclarations }]
                : undefined,
            thinkingConfig: { thinkingBudget: 768 },
          },
        });

        let accumulatedText = "";
        let accumulatedReasoning = "";
        const collectedCalls: Array<{
          id: string;
          name: string;
          args: Record<string, unknown>;
        }> = [];

        for await (const chunk of stream) {
          if (req.signal?.aborted) break;
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!Array.isArray(parts)) continue;
          for (const part of parts as Array<{
            text?: string;
            thought?: boolean;
            functionCall?: {
              id?: string;
              name?: string;
              args?: Record<string, unknown>;
            };
          }>) {
            if (part.thought && part.text) {
              accumulatedReasoning += part.text;
              req.onReasoningDelta?.(accumulatedReasoning);
            } else if (part.text) {
              accumulatedText += part.text;
              req.onTextDelta?.(accumulatedText);
            }
            if (part.functionCall?.name) {
              collectedCalls.push({
                id:
                  part.functionCall.id ||
                  `call_${crypto.randomBytes(4).toString("hex")}`,
                name: part.functionCall.name,
                args: part.functionCall.args ?? {},
              });
            }
          }
        }

        if (
          accumulatedText ||
          accumulatedReasoning ||
          collectedCalls.length > 0
        ) {
          rememberWorkingGeminiModel(model);
          return {
            ...(accumulatedText ? { text: accumulatedText } : {}),
            ...(accumulatedReasoning ? { reasoning: accumulatedReasoning } : {}),
            ...(collectedCalls.length > 0
              ? { functionCalls: collectedCalls }
              : {}),
          };
        }
      } catch {
        // Fall through to next Gemini candidate / OpenAI fallback
      }
    }
  }

  // Fallback to single-step OpenAI / OpenRouter tool-less JSON completion when Gemini is unavailable
  const openAIKey = getOpenAIKey();
  const openRouterKey = getOpenRouterKey();
  const apiUrl = isConfiguredKey(openAIKey)
    ? "https://api.openai.com/v1/chat/completions"
    : isConfiguredKey(openRouterKey)
      ? "https://openrouter.ai/api/v1/chat/completions"
      : null;
  const authKey = isConfiguredKey(openAIKey) ? openAIKey : openRouterKey;
  if (!apiUrl || !authKey) return null;

  const flatPrompt = req.messages
    .map((m) =>
      m.role === "user"
        ? m.text
        : m.role === "tool"
          ? `Tool[${m.name}]: ${JSON.stringify(m.response)}`
          : m.text || "",
    )
    .filter(Boolean)
    .join("\n\n");

  const firstUserContent =
    req.images && req.images.length > 0
      ? [
          { type: "text", text: flatPrompt },
          ...req.images.map((img) => ({
            type: "image_url",
            image_url: { url: `data:${img.mimeType};base64,${img.data}` },
          })),
        ]
      : flatPrompt;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      signal: req.signal,
      headers: {
        Authorization: `Bearer ${authKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isConfiguredKey(openAIKey) ? "gpt-4o-mini" : "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: firstUserContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 4096,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content || "";
    if (!content) return null;
    req.onTextDelta?.(content);
    return { text: content };
  } catch {
    return null;
  }
};

// ─── Multi-Turn Agent Executor (with Tool Healing & Live Steer Injection) ───

export async function runPatternRoleAgentLoop(opts: {
  role: AgentRole;
  systemPrompt: string;
  userPrompt: string;
  images?: ImageSnapshot[];
  tools: PatternAgentTool<any>[];
  toolCtx: PatternToolContext;
  stepCaller?: PatternModelStepCaller;
  maxSteps?: number;
  signal?: AbortSignal;
  callbacks?: PatternAgentLoopCallbacks;
}): Promise<PatternAgentLoopResult> {
  const maxSteps = Math.max(1, Math.min(6, opts.maxSteps ?? 4));
  const stepCaller = opts.stepCaller ?? defaultPatternModelStepCaller;
  const toolMap = new Map(opts.tools.map((t) => [t.name, t]));
  const usedCallIds = new Set<string>();
  const steersApplied: string[] = [];
  let lastReasoning = "";

  const messages: ModelStreamStepRequest["messages"] = [
    { role: "user", text: opts.userPrompt },
  ];

  const applyPendingSteers = () => {
    const pending = opts.callbacks?.consumePendingSteers?.() ?? [];
    for (const steer of pending) {
      steersApplied.push(steer.text);
      opts.callbacks?.onSteerApplied?.(steer);
      messages.push({
        role: "user",
        text: `[LIVE LEARNER STEER — prioritize this direction cleanly]: ${steer.text}`,
      });
    }
  };

  for (let step = 1; step <= maxSteps; step++) {
    if (opts.signal?.aborted) {
      return {
        reasoningSummary: lastReasoning || undefined,
        steersApplied,
        aborted: true,
      };
    }

    applyPendingSteers();
    opts.callbacks?.onStepStarted?.(step);

    const stepResp = await stepCaller({
      step,
      role: opts.role,
      systemPrompt: opts.systemPrompt,
      ...(opts.images && opts.images.length > 0
        ? {
            images: opts.images.map((i) => ({
              mimeType: i.mimeType,
              data: i.data,
            })),
          }
        : {}),
      messages,
      tools: opts.tools,
      signal: opts.signal,
      onReasoningDelta: (acc) => {
        lastReasoning = acc;
        opts.callbacks?.onReasoningUpdate?.(acc);
      },
      onTextDelta: (acc) => {
        opts.callbacks?.onMessageUpdate?.(acc);
      },
    });

    if (opts.signal?.aborted) {
      return {
        reasoningSummary: lastReasoning || undefined,
        steersApplied,
        aborted: true,
      };
    }

    if (!stepResp) {
      break;
    }
    if (stepResp.reasoning) {
      lastReasoning = stepResp.reasoning;
    }

    const calls = stepResp.functionCalls ?? [];
    if (calls.length === 0) {
      // Check if another steer arrived mid-generation before returning text
      const lateSteers = opts.callbacks?.consumePendingSteers?.() ?? [];
      if (lateSteers.length > 0 && step < maxSteps) {
        if (stepResp.text) {
          messages.push({ role: "model", text: stepResp.text });
        }
        for (const s of lateSteers) {
          steersApplied.push(s.text);
          opts.callbacks?.onSteerApplied?.(s);
          messages.push({
            role: "user",
            text: `[LIVE LEARNER STEER — incorporate before finalizing]: ${s.text}`,
          });
        }
        continue;
      }

      return {
        finalText: stepResp.text,
        generatedVisual: opts.toolCtx.lastGeneratedVisual ?? null,
        reasoningSummary: lastReasoning || undefined,
        steersApplied,
        aborted: false,
      };
    }

    // Uniquify tool-call IDs (LearnHarness Lacan Fix: providers can emit reused call_0 IDs)
    const uniquifiedCalls = calls.map((c, idx) => {
      let id = c.id || `call_${step}_${idx}`;
      while (usedCallIds.has(id)) {
        id = `${id}_${crypto.randomBytes(2).toString("hex")}`;
      }
      usedCallIds.add(id);
      return { ...c, id };
    });

    messages.push({
      role: "model",
      text: stepResp.text,
      reasoning: stepResp.reasoning,
      functionCalls: uniquifiedCalls,
    });

    for (const call of uniquifiedCalls) {
      const tool = toolMap.get(call.name);
      const t0 = Date.now();
      if (!tool) {
        opts.callbacks?.onToolCallStart?.(call.id, call.name, "unknown tool");
        const errResp = {
          isError: true,
          error: `Unknown tool "${call.name}". Available tools: ${opts.tools.map((t) => t.name).join(", ")}`,
        };
        opts.callbacks?.onToolCallEnd?.(
          call.id,
          call.name,
          true,
          false,
          errResp.error,
          Date.now() - t0,
        );
        messages.push({
          role: "tool",
          callId: call.id,
          name: call.name,
          response: errResp,
        });
        continue;
      }

      opts.callbacks?.onToolCallStart?.(
        call.id,
        call.name,
        safeArgsPreview(tool, call.args),
      );

      const validated = prepareAndValidateToolArgs(tool, call.args);
      if (!validated.ok) {
        opts.callbacks?.onToolCallEnd?.(
          call.id,
          call.name,
          true,
          false,
          validated.error.slice(0, 140),
          Date.now() - t0,
        );
        messages.push({
          role: "tool",
          callId: call.id,
          name: call.name,
          response: { isError: true, error: validated.error },
        });
        continue;
      }

      const execRes = await tool.execute(validated.args, opts.toolCtx);
      const durationMs = Date.now() - t0;
      opts.callbacks?.onToolCallEnd?.(
        call.id,
        call.name,
        Boolean(execRes.isError),
        validated.healed,
        execRes.safePreview,
        durationMs,
      );

      // LearnHarness finishTurn invariant: a clean terminating tool stops immediately
      if (tool.terminating && !execRes.isError) {
        return {
          deliveredTool: {
            name: tool.name,
            args: validated.args as Record<string, unknown>,
            output: execRes.output,
          },
          generatedVisual: opts.toolCtx.lastGeneratedVisual ?? null,
          reasoningSummary: lastReasoning || undefined,
          steersApplied,
          aborted: false,
        };
      }

      messages.push({
        role: "tool",
        callId: call.id,
        name: call.name,
        response: execRes.output,
      });
    }
  }

  return {
    generatedVisual: opts.toolCtx.lastGeneratedVisual ?? null,
    reasoningSummary: lastReasoning || undefined,
    steersApplied,
    aborted: opts.signal?.aborted ?? false,
  };
}

/** Utility bridging single-shot legacy `aiCaller` mocks cleanly alongside streaming step callers. */
export function parseDeliveredOrJsonFallback(
  loopResult: PatternAgentLoopResult,
  expectedToolName: string,
): Record<string, unknown> | null {
  if (
    loopResult.deliveredTool &&
    loopResult.deliveredTool.name === expectedToolName
  ) {
    return loopResult.deliveredTool.output;
  }
  if (loopResult.finalText) {
    const parsed = extractJson(loopResult.finalText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return healEncodedFields<Record<string, unknown>>(parsed);
    }
  }
  return null;
}

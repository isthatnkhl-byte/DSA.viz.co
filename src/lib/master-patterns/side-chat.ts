/**
 * Pure Side-Chat Domain Module (browser + server safe, modeled on LearnHarness
 * `src/core/side-chat.ts`):
 * - Segment identity derivation
 * - Strict Spoiler-Free Visible Lesson Document Builder (never exposes open rubrics!)
 * - Incremental Watermarked Side -> Main Context Ledger (`collectPendingSideUpdates`)
 */

import { collectCitations, expandCitationsForModel } from "./citations";
import type {
  PatternSessionState,
  SideChatAnchor,
  SideChatMessage,
  SideChatThread,
  SideDeliveryWatermark,
  SideMessageDeliveryStatus,
} from "./types";

export const SIDE_QUESTION_MAX_CHARS = 4_000;
export const SIDE_QUOTE_MAX_CHARS = 2_000;
export const SIDE_QUOTES_MAX = 4;
export const MAX_SIDE_THREADS_PER_SESSION = 12;
export const MAX_MESSAGES_PER_SIDE_THREAD = 24;

export interface SideAskInput {
  threadId?: string;
  anchor?: SideChatAnchor;
  text: string;
  quotes: string[];
  quoteCitations?: string[];
  retry?: boolean;
  requestId?: string;
  workingDraft?: string;
}

export class SideChatInputError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const SAFE_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function deriveActiveSegmentAnchor(
  session: Pick<
    PatternSessionState,
    "patternId" | "stage" | "currentQuestion" | "lastEvaluation" | "notes"
  >,
): SideChatAnchor {
  if (session.currentQuestion) {
    return {
      segmentId: `q:${session.currentQuestion.id}`,
      kind: "question",
      title: `Active Check (${session.currentQuestion.strandId.split(":")[1] ?? session.currentQuestion.strandId})`,
      excerpt: clip(session.currentQuestion.prompt, 240),
    };
  }
  if (session.lastEvaluation) {
    return {
      segmentId: `eval:${session.lastEvaluation.questionId}`,
      kind: "remediation",
      title: "Latest Evaluation & Teaching",
      excerpt: clip(
        session.lastEvaluation.surgicalTeaching ||
          session.lastEvaluation.verdictSummary,
        240,
      ),
    };
  }
  return {
    segmentId: `notes:${session.patternId}`,
    kind: "notes",
    title: session.notes?.title ?? `${session.patternId} Study Notes`,
    excerpt: clip(
      session.notes?.motivatedDiscovery.keyInsight ??
        "Pattern invariants and pitfalls",
      240,
    ),
  };
}

export function parseSideAnchor(raw: unknown): SideChatAnchor {
  if (!raw || typeof raw !== "object") {
    throw new SideChatInputError("anchor must be an object");
  }
  const a = raw as Record<string, unknown>;
  if (typeof a.segmentId !== "string" || !SAFE_ID_RE.test(a.segmentId)) {
    throw new SideChatInputError("anchor.segmentId is invalid");
  }
  if (
    a.kind !== "notes" &&
    a.kind !== "question" &&
    a.kind !== "remediation"
  ) {
    throw new SideChatInputError("anchor.kind must be notes, question, or remediation");
  }
  return {
    segmentId: a.segmentId,
    kind: a.kind,
    ...(typeof a.title === "string" && a.title.trim()
      ? { title: clip(a.title.trim(), 120) }
      : {}),
    ...(typeof a.excerpt === "string" && a.excerpt.trim()
      ? { excerpt: clip(a.excerpt.trim(), 400) }
      : {}),
  };
}

export function parseSideAskInput(raw: unknown): SideAskInput {
  if (!raw || typeof raw !== "object") {
    throw new SideChatInputError("Request body must be an object");
  }
  const body = raw as Record<string, unknown>;

  if (
    body.requestId !== undefined &&
    (typeof body.requestId !== "string" || !SAFE_ID_RE.test(body.requestId))
  ) {
    throw new SideChatInputError("requestId is invalid");
  }
  if (
    body.workingDraft !== undefined &&
    (typeof body.workingDraft !== "string" ||
      body.workingDraft.length > SIDE_QUESTION_MAX_CHARS)
  ) {
    throw new SideChatInputError("workingDraft is invalid or too long");
  }

  const requestId =
    typeof body.requestId === "string" ? body.requestId : undefined;
  const workingDraft =
    typeof body.workingDraft === "string" && body.workingDraft.trim()
      ? body.workingDraft.trim()
      : undefined;

  if (body.retry === true) {
    if (typeof body.threadId !== "string" || !SAFE_ID_RE.test(body.threadId)) {
      throw new SideChatInputError("retry requires a valid threadId");
    }
    return {
      threadId: body.threadId,
      text: "",
      quotes: [],
      retry: true,
      requestId,
      workingDraft,
    };
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    throw new SideChatInputError("Question text must be non-empty");
  }
  if (text.length > SIDE_QUESTION_MAX_CHARS) {
    throw new SideChatInputError(
      `Question text exceeds ${SIDE_QUESTION_MAX_CHARS} characters`,
    );
  }

  const rawQuotes = body.quotes ?? [];
  if (
    !Array.isArray(rawQuotes) ||
    rawQuotes.some((q) => typeof q !== "string" || !q.trim())
  ) {
    throw new SideChatInputError("quotes must be an array of non-empty strings");
  }
  const quotes = (rawQuotes as string[]).map((q) =>
    clip(q.trim(), SIDE_QUOTE_MAX_CHARS),
  );
  if (quotes.length > SIDE_QUOTES_MAX) {
    throw new SideChatInputError(`At most ${SIDE_QUOTES_MAX} quotes allowed`);
  }

  let quoteCitations: string[] | undefined;
  if (body.quoteCitations !== undefined) {
    if (
      !Array.isArray(body.quoteCitations) ||
      body.quoteCitations.length !== quotes.length
    ) {
      throw new SideChatInputError("quoteCitations must align 1:1 with quotes");
    }
    for (const [idx, val] of body.quoteCitations.entries()) {
      if (typeof val !== "string" || val.length > 64_000) {
        throw new SideChatInputError("Invalid citation reference");
      }
      const parsed = collectCitations(val);
      if (
        parsed.length !== 1 ||
        parsed[0]!.source !== val ||
        clip(parsed[0]!.citation.text.trim(), SIDE_QUOTE_MAX_CHARS) !==
          quotes[idx]!
      ) {
        throw new SideChatInputError("Citation metadata does not match quoted text");
      }
    }
    quoteCitations = [...(body.quoteCitations as string[])];
  }

  const threadId = body.threadId;
  if (threadId !== undefined) {
    if (typeof threadId !== "string" || !SAFE_ID_RE.test(threadId)) {
      throw new SideChatInputError("threadId is invalid");
    }
    return {
      threadId,
      text,
      quotes,
      quoteCitations,
      requestId,
      workingDraft,
    };
  }

  if (body.anchor === undefined) {
    throw new SideChatInputError("Either threadId or anchor is required");
  }

  return {
    anchor: parseSideAnchor(body.anchor),
    text,
    quotes,
    quoteCitations,
    requestId,
    workingDraft,
  };
}

/**
 * SPOILER-FREE VISIBLE LESSON DOCUMENT (LearnHarness Spoiler Law):
 * Reconstructs ONLY what the learner has visibly seen so the side-question helper
 * never leaks unanswered MCQ option keys, hidden expectedReasoning, or solutions.
 */
export function buildSideLessonDocument(
  session: Pick<
    PatternSessionState,
    | "patternId"
    | "track"
    | "stage"
    | "notes"
    | "currentQuestion"
    | "currentQuestionHints"
    | "lastEvaluation"
    | "questionHistory"
  >,
): string {
  const sections: string[] = [];
  sections.push(
    `# Pattern Session Context: ${session.patternId} (Track: ${session.track ?? "calibrating"}, Stage: ${session.stage})`,
  );

  if (session.notes) {
    const n = session.notes;
    sections.push(
      `## Study Dossier: ${n.title}`,
      `Unconditional Truths:\n${n.unconditionalTruths.map((t) => `- ${t.title}: ${t.statement}`).join("\n")}`,
      `Motivated Discovery:\n- Bottleneck: ${n.motivatedDiscovery.bruteForceBottleneck}\n- Key Insight: ${n.motivatedDiscovery.keyInsight}\n- Why It Holds: ${n.motivatedDiscovery.whyItWorks}`,
      `Canonical Pitfalls:\n${n.pitfalls.map((p) => `- Trap: ${p.trap} | Fix: ${p.fix}`).join("\n")}`,
    );
  }

  if (session.questionHistory.length > 0) {
    const histLines = session.questionHistory
      .slice(-5)
      .map(
        (h, i) =>
          `- Q${i + 1} (${h.strandId.split(":")[1] ?? h.strandId}, ${h.modality}): score=${h.score}%${h.missClass ? `, miss=${h.missClass}` : ""}`,
      );
    sections.push(`## Settled Turn Summary\n${histLines.join("\n")}`);
  }

  if (session.lastEvaluation) {
    const ev = session.lastEvaluation;
    sections.push(
      `## Latest Settled Feedback (${ev.strandId.split(":")[1] ?? ev.strandId})\nVerdict: ${ev.verdictSummary}${ev.surgicalTeaching ? `\nMicro-Teaching: ${ev.surgicalTeaching}` : ""}\nRevealed Reasoning: ${ev.committedAnswerReveal}`,
    );
  }

  if (session.currentQuestion) {
    const q = session.currentQuestion;
    const optionLines = q.options?.length
      ? `\nOptions (UNANSWERED — do not identify or reveal which option is correct):\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o.label}`).join("\n")}`
      : "";
    const hintLines = session.currentQuestionHints?.length
      ? `\nHints Already Unlocked by Learner:\n${session.currentQuestionHints.map((h) => `- [${h.rung}] ${h.hintText}`).join("\n")}`
      : "";

    sections.push(
      `## Current Open Question (UNANSWERED — SPOILER LOCK ACTIVE)
Prompt: ${q.prompt}${q.contextSnippet ? `\nSnippet: ${q.contextSnippet}` : ""}${optionLines}${hintLines}
CRITICAL INSTRUCTION FOR HELPER: The question above has NOT been submitted yet. NEVER tell the learner the right option, never write their answer/solution code for them, and never leak committed solutions.`,
    );
  }

  return sections.join("\n\n").slice(0, 5_500);
}

export function buildSideModelTurns(
  thread: SideChatThread,
  lessonDoc: string,
  workingDraft?: string,
): Array<{ role: "user" | "assistant"; text: string }> {
  const turns: Array<{ role: "user" | "assistant"; text: string }> = [];
  const anchorContext = `[Thread anchored on ${thread.anchor.kind}: ${thread.anchor.title ?? thread.anchor.segmentId}]`;

  for (let i = 0; i < thread.messages.length; i++) {
    const msg = thread.messages[i]!;
    if (msg.role === "assistant" && (msg.error || (!msg.text.trim() && !msg.pending))) {
      continue;
    }
    if (msg.role === "user") {
      const expandedText = expandCitationsForModel(msg.text);
      const quoteBlock = msg.quotes?.length
        ? `\nQuoted passage(s):\n${msg.quotes.map((q) => `> ${q}`).join("\n")}`
        : "";
      const draftNote =
        i === thread.messages.length - 1 && workingDraft
          ? `\n\nLearner's unsubmitted working draft (context only, do not grade or give away full solution):\n${workingDraft}`
          : "";
      const text =
        i === 0
          ? `Visible Lesson Reference (quoted document, not your own earlier speech):\n<lesson_context>\n${lessonDoc}\n</lesson_context>\n\n${anchorContext}${quoteBlock}\n\nLearner side question: ${expandedText}${draftNote}`
          : `${quoteBlock ? `${quoteBlock}\n\n` : ""}${expandedText}${draftNote}`;
      turns.push({ role: "user", text });
    } else {
      turns.push({ role: "assistant", text: msg.text });
    }
  }

  return turns;
}

export function messageDeliveryStatus(
  msg: SideChatMessage,
): SideMessageDeliveryStatus {
  if (msg.pending) return "pending";
  if (msg.stopped) return "stopped";
  if (msg.error !== undefined) return "failed";
  return "complete";
}

/**
 * Watermarked Side -> Main Teacher Handoff (`sideConversationEntries` law):
 * Captures ONLY newly authored questions or helper suffix updates since the last
 * committed watermark, returning updated watermarks to stamp ONLY once settled.
 */
export function collectPendingSideUpdates(
  session: Pick<PatternSessionState, "sideChats" | "sideDeliveryWatermarks">,
  maxChars = 750,
): {
  updatesPromptText: string;
  updatedWatermarks: SideDeliveryWatermark;
  deliveredCount: number;
} {
  const threads = session.sideChats ?? [];
  const prevWatermarks = session.sideDeliveryWatermarks ?? {};
  const nextWatermarks: SideDeliveryWatermark = {};

  for (const [tid, msgs] of Object.entries(prevWatermarks)) {
    nextWatermarks[tid] = { ...msgs };
  }

  const lines: string[] = [];
  let deliveredCount = 0;

  for (const thread of threads) {
    const prevThreadMap = prevWatermarks[thread.id] ?? {};
    const nextThreadMap = { ...(nextWatermarks[thread.id] ?? {}) };

    for (const msg of thread.messages) {
      const status = messageDeliveryStatus(msg);
      const prev = prevThreadMap[msg.id];
      const text = msg.text.trim();
      if (!text) continue;

      if (
        prev &&
        prev.textLength === text.length &&
        prev.status === status
      ) {
        continue;
      }

      const delta =
        prev && text.length >= prev.textLength
          ? text.slice(prev.textLength).trim()
          : text;

      if (delta || prev?.status !== status) {
        deliveredCount += 1;
        const speaker = msg.role === "user" ? "LearnerSideAsk" : "SideHelper";
        const quotePrefix =
          !prev && msg.quotes?.length
            ? ` (re: "${clip(msg.quotes[0]!, 55)}")`
            : "";
        const statusTag =
          status === "pending"
            ? " [streaming]"
            : status === "stopped"
              ? " [stopped]"
              : "";
        lines.push(
          `${speaker}[${thread.anchor.kind}${quotePrefix}]${statusTag}: ${clip(delta || "(status updated)", 180)}`,
        );
      }

      nextThreadMap[msg.id] = {
        textLength: text.length,
        status,
      };
    }

    nextWatermarks[thread.id] = nextThreadMap;
  }

  let updatesPromptText = lines.join("\n");
  if (updatesPromptText.length > maxChars) {
    updatesPromptText = `${updatesPromptText.slice(0, maxChars - 3)}...`;
  }

  return {
    updatesPromptText,
    updatedWatermarks: nextWatermarks,
    deliveredCount,
  };
}

export function enforceSideChatsBounds(
  threads: SideChatThread[],
): SideChatThread[] {
  return threads.slice(-MAX_SIDE_THREADS_PER_SESSION).map((t) => ({
    ...t,
    messages: t.messages.slice(-MAX_MESSAGES_PER_SIDE_THREAD),
  }));
}

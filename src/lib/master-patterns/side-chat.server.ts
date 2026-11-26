import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import {
  getGeminiKey,
  getOpenAIKey,
  getOpenRouterKey,
} from "../openrouter.server";
import { getStrandDefinition } from "../../data/patterns";
import {
  SideChatInputError,
  buildSideLessonDocument,
  buildSideModelTurns,
  enforceSideChatsBounds,
  parseSideAskInput,
} from "./side-chat";
import type {
  PatternSessionState,
  SideChatAnchor,
  SideChatMessage,
  SideChatThread,
} from "./types";

export type SideStreamEvent =
  | { type: "thread"; thread: SideChatThread }
  | { type: "text"; text: string }
  | { type: "done"; thread: SideChatThread }
  | { type: "error"; error: string };

export type SideModelCaller = (opts: {
  systemPrompt: string;
  turns: Array<{ role: "user" | "assistant"; text: string }>;
  signal: AbortSignal;
  onText: (accumulatedText: string) => void;
}) => Promise<{
  text: string;
  outcome: "complete" | "aborted" | "error";
  errorMessage?: string;
}>;

interface ActiveSideRun {
  controller: AbortController;
  text: string;
  answerId: string;
  updatedAt: string;
  requestId?: string;
  listeners: Set<(ev: SideStreamEvent) => void>;
  settled: Promise<void>;
}

interface SideRunnerGlobal {
  __dsavizPatternSideRuns?: Map<string, ActiveSideRun>;
}

function getActiveSideRuns(): Map<string, ActiveSideRun> {
  const g = globalThis as typeof globalThis & SideRunnerGlobal;
  return (g.__dsavizPatternSideRuns ??= new Map<string, ActiveSideRun>());
}

function runKey(sessionId: string, threadId: string): string {
  return `${sessionId}\u0000${threadId}`;
}

function isConfiguredKey(key?: string | null): boolean {
  if (!key) return false;
  const c = key.trim().replace(/^["']|["']$/g, "").trim();
  return (
    c.length >= 15 &&
    !c.startsWith("your_") &&
    !c.includes("api_key_here") &&
    !c.includes("placeholder")
  );
}

const SIDE_HELPER_SYSTEM_PROMPT = `You are a sharp, concise DSA side-question helper inside a live tutoring session (LearnHarness companion doctrine).
Rules:
1. Give the smallest genuinely useful answer — usually 2-4 crisp sentences or a tiny concrete 3-element trace. Never write a long mini-lecture.
2. You receive the visible lesson document as quoted context.
3. SPOILER LOCK: If there is an unanswered active question or case study in <lesson_context>, NEVER reveal which option is correct, NEVER give away the full solution code, and NEVER evaluate unsubmitted code as passed/failed. Clarify the underlying concept or boundary condition so the learner can reason cleanly on their own.`;

function buildDeterministicSideReply(
  session: PatternSessionState,
  anchor: SideChatAnchor,
  userQuestion: string,
): string {
  const qLower = userQuestion.toLowerCase();
  const strand =
    (session.currentQuestion
      ? getStrandDefinition(session.currentQuestion.strandId)
      : undefined) ?? null;

  if (strand) {
    if (qLower.includes("why") || qLower.includes("break") || qLower.includes("when")) {
      return `Focus on the core invariant for **${strand.title}**: ${strand.coreInvariant} Watch carefully for this pitfall: *${strand.commonTrap}* (test a tiny 3-element counterexample without guessing the option directly).`;
    }
    return `For **${strand.title}**, anchor on this foundational truth: ${strand.unconditionalTruth} Checking how that rule behaves at boundaries should make the step clear.`;
  }

  if (anchor.excerpt) {
    return `Look closely at that step's invariant guarantee: *"${anchor.excerpt.slice(0, 140)}"*. Ask which state variable stays monotonic across transitions when you shrink or advance.`;
  }
  return `Break that statement down into the loop invariant: what property must remain true before and after every step on **${session.patternId}**?`;
}

export const defaultSideModelCaller: SideModelCaller = async ({
  systemPrompt,
  turns,
  signal,
  onText,
}) => {
  const geminiKey = getGeminiKey();
  if (isConfiguredKey(geminiKey)) {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    const contents = turns.map((t) => ({
      role: t.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: t.text }],
    }));

    for (const model of [
      "gemini-3-flash-preview",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
    ]) {
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        let text = "";
        for await (const chunk of stream) {
          if (signal.aborted) {
            return { text, outcome: "aborted" };
          }
          const delta = chunk.text || "";
          if (delta) {
            text += delta;
            onText(text);
          }
        }
        if (text.trim()) {
          return { text: text.trim(), outcome: "complete" };
        }
      } catch (err) {
        if (signal.aborted) {
          return { text: "", outcome: "aborted" };
        }
        void err;
      }
    }
  }

  const openAIKey = getOpenAIKey();
  const openRouterKey = getOpenRouterKey();
  const url = isConfiguredKey(openAIKey)
    ? "https://api.openai.com/v1/chat/completions"
    : isConfiguredKey(openRouterKey)
      ? "https://openrouter.ai/api/v1/chat/completions"
      : null;
  const auth = isConfiguredKey(openAIKey) ? openAIKey : openRouterKey;

  if (url && auth) {
    try {
      const res = await fetch(url, {
        method: "POST",
        signal,
        headers: {
          Authorization: `Bearer ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: isConfiguredKey(openAIKey)
            ? "gpt-4o-mini"
            : "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...turns.map((t) => ({
              role: t.role === "assistant" ? "assistant" : "user",
              content: t.text,
            })),
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });
      if (signal.aborted) return { text: "", outcome: "aborted" };
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data?.choices?.[0]?.message?.content?.trim() || "";
        if (content) {
          onText(content);
          return { text: content, outcome: "complete" };
        }
      }
    } catch {
      if (signal.aborted) return { text: "", outcome: "aborted" };
    }
  }

  return {
    text: "",
    outcome: "error",
    errorMessage: "NO_ONLINE_MODEL",
  };
};

const ndjsonEncoder = new TextEncoder();

function buildNdjsonStream(opts: {
  sessionId: string;
  thread: SideChatThread;
  run?: ActiveSideRun;
  loadSession: (id: string) => Promise<PatternSessionState | null>;
}): ReadableStream<Uint8Array> {
  let detach = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (ev: SideStreamEvent) => {
        if (closed) return;
        try {
          controller.enqueue(ndjsonEncoder.encode(`${JSON.stringify(ev)}\n`));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Detached
        }
      };

      write({ type: "thread", thread: opts.thread });
      if (!opts.run) {
        write({ type: "done", thread: opts.thread });
        close();
        return;
      }

      if (opts.run.text) {
        write({ type: "text", text: opts.run.text });
      }
      const listener = (ev: SideStreamEvent) => {
        write(ev);
        if (ev.type === "done" || ev.type === "error") {
          opts.run?.listeners.delete(listener);
          close();
        }
      };
      opts.run.listeners.add(listener);
      detach = () => {
        closed = true;
        opts.run?.listeners.delete(listener);
      };

      void opts.run.settled.then(async () => {
        if (closed) return;
        const fresh = await opts.loadSession(opts.sessionId).catch(() => null);
        const latest = fresh?.sideChats?.find((t) => t.id === opts.thread.id);
        write(
          latest
            ? { type: "done", thread: latest }
            : { type: "error", error: "Side thread no longer available." },
        );
        opts.run?.listeners.delete(listener);
        close();
      });
    },
    cancel() {
      // Disconnecting/closing drawer detaches listener only, never cancels run
      detach();
    },
  });
}

export function listSideChatThreads(
  session: PatternSessionState,
): { threads: SideChatThread[]; answering: Record<string, string> } {
  const runs = getActiveSideRuns();
  const answering: Record<string, string> = {};
  const threads = (session.sideChats ?? []).map((thread) => {
    const run = runs.get(runKey(session.sessionId, thread.id));
    if (!run) return thread;
    answering[thread.id] = run.text;
    const pendingMsg: SideChatMessage = {
      id: run.answerId,
      role: "assistant",
      text: run.text,
      at: run.updatedAt,
      pending: true,
    };
    return { ...thread, messages: [...thread.messages, pendingMsg] };
  });
  return { threads, answering };
}

export function watchSideChatThread(opts: {
  session: PatternSessionState;
  threadId: string;
  loadSession: (id: string) => Promise<PatternSessionState | null>;
}): ReadableStream<Uint8Array> | null {
  const thread = (opts.session.sideChats ?? []).find(
    (t) => t.id === opts.threadId,
  );
  if (!thread) return null;
  const run = getActiveSideRuns().get(
    runKey(opts.session.sessionId, opts.threadId),
  );
  return buildNdjsonStream({
    sessionId: opts.session.sessionId,
    thread,
    run,
    loadSession: opts.loadSession,
  });
}

export function stopSideChatRun(sessionId: string, threadId: string): boolean {
  const run = getActiveSideRuns().get(runKey(sessionId, threadId));
  if (!run) return false;
  run.controller.abort();
  return true;
}

export async function askSideChatQuestion(opts: {
  session: PatternSessionState;
  rawBody: unknown;
  loadSession: (id: string) => Promise<PatternSessionState | null>;
  saveSession: (s: PatternSessionState) => Promise<PatternSessionState>;
  sideModelCaller?: SideModelCaller;
}): Promise<{
  thread: SideChatThread;
  stream: ReadableStream<Uint8Array>;
  settled: Promise<void>;
}> {
  const input = parseSideAskInput(opts.rawBody);
  const existingThreads = opts.session.sideChats ?? [];

  let target: SideChatThread | undefined = input.threadId
    ? existingThreads.find((t) => t.id === input.threadId)
    : undefined;

  if (input.threadId && !target) {
    throw new SideChatInputError("Unknown side conversation thread", 404);
  }

  if (!target && input.anchor) {
    target =
      existingThreads.find(
        (t) => t.anchor.segmentId === input.anchor!.segmentId,
      ) ?? {
        id: `side_${input.anchor.segmentId.replace(/[^A-Za-z0-9_-]/g, "_")}`,
        anchor: input.anchor,
        open: true,
        docked: false,
        createdAt: new Date().toISOString(),
        messages: [],
      };
  }

  if (!target) {
    throw new SideChatInputError("Either threadId or valid anchor is required", 400);
  }

  const key = runKey(opts.session.sessionId, target.id);
  const runs = getActiveSideRuns();
  const activeRun = runs.get(key);

  if (
    input.requestId &&
    (activeRun?.requestId === input.requestId ||
      target.messages.some((m) => m.requestId === input.requestId))
  ) {
    return {
      thread: target,
      stream: buildNdjsonStream({
        sessionId: opts.session.sessionId,
        thread: target,
        run: activeRun,
        loadSession: opts.loadSession,
      }),
      settled: activeRun?.settled ?? Promise.resolve(),
    };
  }

  if (activeRun) {
    throw new SideChatInputError(
      "This side conversation is still answering.",
      409,
    );
  }

  let nextThread: SideChatThread = target;
  let modelThread: SideChatThread = target;
  const nowIso = new Date().toISOString();

  if (input.retry) {
    const last = target.messages.at(-1);
    if (last?.role === "assistant" && last.error !== undefined) {
      const lastUserIdx = target.messages
        .map((m) => m.role)
        .lastIndexOf("user");
      modelThread = {
        ...target,
        messages: target.messages.slice(0, Math.max(0, lastUserIdx + 1)),
      };
    } else {
      throw new SideChatInputError("Nothing failed to retry on this thread", 409);
    }
  } else {
    const userMsg: SideChatMessage = {
      id: `sm_${crypto.randomBytes(5).toString("hex")}`,
      role: "user",
      text: input.text,
      ...(input.quotes.length > 0 ? { quotes: input.quotes } : {}),
      ...(input.quoteCitations?.length
        ? { quoteCitations: input.quoteCitations }
        : {}),
      ...(input.requestId ? { requestId: input.requestId } : {}),
      at: nowIso,
    };
    nextThread = {
      ...target,
      open: true,
      messages: [...target.messages, userMsg],
    };
    modelThread = nextThread;
  }

  // Persist user turn before spawning stream
  const updateThreads = (
    threads: SideChatThread[] | undefined,
    updated: SideChatThread,
  ) =>
    enforceSideChatsBounds(
      (threads ?? []).some((t) => t.id === updated.id)
        ? (threads ?? []).map((t) => (t.id === updated.id ? updated : t))
        : [...(threads ?? []), updated],
    );

  const latestBefore = (await opts.loadSession(opts.session.sessionId)) ?? opts.session;
  await opts.saveSession({
    ...latestBefore,
    sideChats: updateThreads(latestBefore.sideChats, nextThread),
  });

  const lessonDoc = buildSideLessonDocument(latestBefore);
  const turns = buildSideModelTurns(modelThread, lessonDoc, input.workingDraft);

  const run: ActiveSideRun = {
    controller: new AbortController(),
    text: "",
    answerId: `sm_${crypto.randomBytes(5).toString("hex")}`,
    updatedAt: new Date().toISOString(),
    requestId: input.requestId,
    listeners: new Set(),
    settled: Promise.resolve(),
  };
  runs.set(key, run);

  const broadcast = (ev: SideStreamEvent) => {
    for (const l of [...run.listeners]) {
      try {
        l(ev);
      } catch {
        // Ignore detached listeners
      }
    }
  };

  const caller = opts.sideModelCaller ?? defaultSideModelCaller;

  run.settled = (async () => {
    let settledThread: SideChatThread | undefined;
    try {
      const modelRes = await caller({
        systemPrompt: SIDE_HELPER_SYSTEM_PROMPT,
        turns,
        signal: run.controller.signal,
        onText: (acc) => {
          run.text = acc;
          run.updatedAt = new Date().toISOString();
          broadcast({ type: "text", text: acc });
        },
      });

      let finalText = modelRes.text || run.text;
      let finalOutcome = modelRes.outcome;
      let finalError = modelRes.errorMessage;

      if (
        finalOutcome === "error" &&
        finalError === "NO_ONLINE_MODEL"
      ) {
        const lastUserText =
          modelThread.messages
            .filter((m) => m.role === "user")
            .at(-1)?.text ?? input.text;
        finalText = buildDeterministicSideReply(
          latestBefore,
          target.anchor,
          lastUserText,
        );
        finalOutcome = "complete";
        finalError = undefined;
        broadcast({ type: "text", text: finalText });
      }

      const answerMsg: SideChatMessage = {
        id: run.answerId,
        role: "assistant",
        text: finalText,
        at: new Date().toISOString(),
        ...(input.requestId ? { requestId: `${input.requestId}_ans` } : {}),
        ...(finalOutcome === "aborted" ? { stopped: true } : {}),
        ...(finalOutcome === "error"
          ? { error: finalError ?? "Side question call failed." }
          : {}),
      };

      const latestNow =
        (await opts.loadSession(opts.session.sessionId)) ?? latestBefore;
      const currentThread =
        latestNow.sideChats?.find((t) => t.id === nextThread.id) ?? nextThread;
      settledThread = {
        ...currentThread,
        messages: [...currentThread.messages, answerMsg],
      };

      await opts.saveSession({
        ...latestNow,
        sideChats: updateThreads(latestNow.sideChats, settledThread),
      });
    } catch (err) {
      broadcast({
        type: "error",
        error: (err as Error)?.message || "Failed to process side question.",
      });
    } finally {
      runs.delete(key);
      if (settledThread) {
        broadcast({ type: "done", thread: settledThread });
      }
      run.listeners.clear();
    }
  })();

  return {
    thread: nextThread,
    stream: buildNdjsonStream({
      sessionId: opts.session.sessionId,
      thread: nextThread,
      run,
      loadSession: opts.loadSession,
    }),
    settled: run.settled,
  };
}

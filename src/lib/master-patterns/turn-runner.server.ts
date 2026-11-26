import crypto from "node:crypto";
import { getCache, setCache } from "../redis-cache";
import { beginPatternTurn, endPatternTurn } from "./turn-liveness";
import type {
  AgentRole,
  PatternTurnActionKind,
  PatternTurnSteerNote,
  PatternTurnStreamEvent,
} from "./types";

const MAX_RECENT_SETTLED = 250;
const SETTLED_TTL_MS = 5 * 60_000;
const DEFAULT_UPDATE_FLUSH_MS = 80;
const KEEPALIVE_INTERVAL_MS = 15_000;
const MAX_PENDING_STEERS = 5;

type SettledTerminalEvent = Extract<
  PatternTurnStreamEvent,
  { type: "turn_settled" | "turn_error" }
>;

export interface PatternTurnSubscriber {
  push: (event: PatternTurnStreamEvent) => void;
  done: () => void;
}

export interface PatternTurnExecutionContext {
  turnId: string;
  sessionId: string;
  role: AgentRole;
  action: PatternTurnActionKind;
  signal: AbortSignal;
  emit: (event: PatternTurnStreamEvent) => void;
  consumePendingSteers: () => PatternTurnSteerNote[];
  getSteersSnapshot: () => string[];
}

export interface PatternTurnHandle {
  turnId: string;
  sessionId: string;
  role: AgentRole;
  action: PatternTurnActionKind;
  subscribe: () => ReadableStream<Uint8Array>;
  steer: (text: string, steerId?: string) => PatternTurnSteerNote | null;
  abort: () => boolean;
  settled: Promise<void>;
}

interface TurnRunnerGlobalStore {
  __dsavizPatternActiveTurns?: Map<string, PatternTurnHandle>;
  __dsavizPatternSettledTurns?: Map<
    string,
    { event: SettledTerminalEvent; expiresAt: number }
  >;
}

function getActiveTurns(): Map<string, PatternTurnHandle> {
  const g = globalThis as typeof globalThis & TurnRunnerGlobalStore;
  return (g.__dsavizPatternActiveTurns ??= new Map<string, PatternTurnHandle>());
}

function getSettledTurns(): Map<
  string,
  { event: SettledTerminalEvent; expiresAt: number }
> {
  const g = globalThis as typeof globalThis & TurnRunnerGlobalStore;
  return (g.__dsavizPatternSettledTurns ??= new Map());
}

function rememberSettledTurn(
  sessionId: string,
  event: SettledTerminalEvent,
): void {
  const store = getSettledTurns();
  if (!store.has(sessionId) && store.size >= MAX_RECENT_SETTLED) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(sessionId, {
    event,
    expiresAt: Date.now() + SETTLED_TTL_MS,
  });
  void setCache(`pattern_turn_settled:${sessionId}`, event, 300).catch(
    () => {},
  );
}

export async function getRecentSettledTurn(
  sessionId: string,
): Promise<SettledTerminalEvent | null> {
  const mem = getSettledTurns().get(sessionId);
  if (mem) {
    if (mem.expiresAt > Date.now()) return mem.event;
    getSettledTurns().delete(sessionId);
  }
  try {
    const cached = await getCache<SettledTerminalEvent>(
      `pattern_turn_settled:${sessionId}`,
    );
    if (
      cached &&
      (cached.type === "turn_settled" || cached.type === "turn_error")
    ) {
      return cached;
    }
  } catch {
    // Non-fatal Redis fallback
  }
  return null;
}

export function getActivePatternTurn(
  sessionId: string,
): PatternTurnHandle | null {
  return getActiveTurns().get(sessionId) ?? null;
}

/**
 * Starts a server-owned background turn decoupled from any individual HTTP socket
 * (LearnHarness ui-stream.ts Background Turn Runner + Compaction Law):
 * - Retained log stores settled events verbatim and coalesces `reasoning_update` /
 *   `message_update` in place (O(content) replay cost, never O(chunks)).
 * - Live fan-out flushes updates at most once per `updateFlushMs`.
 * - Disconnecting an SSE reader detaches ONLY that view; the turn finishes and
 *   persists cleanly unless explicitly aborted via `abort()`.
 */
export function startBackgroundPatternTurn(opts: {
  sessionId: string;
  role: AgentRole;
  action: PatternTurnActionKind;
  updateFlushMs?: number;
  run: (ctx: PatternTurnExecutionContext) => Promise<SettledTerminalEvent>;
}): PatternTurnHandle | null {
  const ownerToken = {};
  if (!beginPatternTurn(opts.sessionId, ownerToken)) {
    return null;
  }

  const turnId = `turn_${crypto.randomBytes(5).toString("hex")}`;
  const controller = new AbortController();
  const updateFlushMs = Math.max(10, opts.updateFlushMs ?? DEFAULT_UPDATE_FLUSH_MS);

  const retainedLog: PatternTurnStreamEvent[] = [];
  const updateSlots = new Map<"reasoning_update" | "message_update", number>();
  const pendingLive = new Map<string, PatternTurnStreamEvent>();
  const subscribers = new Set<PatternTurnSubscriber>();
  const steerQueue: PatternTurnSteerNote[] = [];
  const appliedSteers: string[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  const pushToSubscribers = (event: PatternTurnStreamEvent) => {
    for (const sub of [...subscribers]) {
      try {
        sub.push(event);
      } catch {
        subscribers.delete(sub);
      }
    }
  };

  const flushPending = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (pendingLive.size === 0) return;
    for (const ev of pendingLive.values()) {
      pushToSubscribers(ev);
    }
    pendingLive.clear();
  };

  const emit = (event: PatternTurnStreamEvent) => {
    if (settled) return;

    if (
      event.type === "reasoning_update" ||
      event.type === "message_update"
    ) {
      // Compaction Law: replace active snapshot in-place inside replay log
      const slot = updateSlots.get(event.type);
      if (slot !== undefined) {
        retainedLog[slot] = event;
      } else {
        updateSlots.set(event.type, retainedLog.length);
        retainedLog.push(event);
      }

      pendingLive.set(event.type, event);
      if (!flushTimer) {
        flushTimer = setTimeout(flushPending, updateFlushMs);
        if (typeof flushTimer.unref === "function") flushTimer.unref();
      }
      return;
    }

    // Flush any queued delta snapshot before emitting a milestone boundary
    flushPending();
    if (event.type === "tool_call_end") {
      updateSlots.delete("reasoning_update");
      updateSlots.delete("message_update");
    }
    retainedLog.push(event);
    pushToSubscribers(event);
  };

  const finishWithTerminal = (terminal: SettledTerminalEvent) => {
    if (settled) return;
    flushPending();
    settled = true;
    retainedLog.push(terminal);
    rememberSettledTurn(opts.sessionId, terminal);
    pushToSubscribers(terminal);
    for (const sub of [...subscribers]) {
      try {
        sub.done();
      } catch {
        // Ignore already-closed view
      }
    }
    subscribers.clear();
    getActiveTurns().delete(opts.sessionId);
    endPatternTurn(opts.sessionId, ownerToken);
  };

  // Seed initial lifecycle event immediately so instant reattachers observe turn_started
  emit({
    type: "turn_started",
    turnId,
    sessionId: opts.sessionId,
    role: opts.role,
    action: opts.action,
    timestamp: Date.now(),
  });

  const handle: PatternTurnHandle = {
    turnId,
    sessionId: opts.sessionId,
    role: opts.role,
    action: opts.action,
    steer: (text: string, steerId?: string) => {
      if (settled || steerQueue.length >= MAX_PENDING_STEERS) return null;
      const note: PatternTurnSteerNote = {
        id: steerId || `steer_${crypto.randomBytes(4).toString("hex")}`,
        text: text.trim().slice(0, 600),
        createdAt: new Date().toISOString(),
      };
      if (!note.text) return null;
      steerQueue.push(note);
      return note;
    },
    abort: () => {
      if (settled) return false;
      controller.abort(new Error("Aborted by learner"));
      return true;
    },
    subscribe: () => createSseReadableStream({
      replay: () => [...retainedLog],
      isSettled: () => settled,
      addSubscriber: (sub) => subscribers.add(sub),
      removeSubscriber: (sub) => subscribers.delete(sub),
    }),
    settled: Promise.resolve(),
  };

  getActiveTurns().set(opts.sessionId, handle);

  handle.settled = (async () => {
    try {
      const terminal = await opts.run({
        turnId,
        sessionId: opts.sessionId,
        role: opts.role,
        action: opts.action,
        signal: controller.signal,
        emit,
        consumePendingSteers: () => {
          if (steerQueue.length === 0) return [];
          const drained = steerQueue.splice(0, steerQueue.length);
          for (const d of drained) appliedSteers.push(d.text);
          return drained;
        },
        getSteersSnapshot: () => [...appliedSteers],
      });
      finishWithTerminal(terminal);
    } catch (err) {
      finishWithTerminal({
        type: "turn_error",
        turnId,
        error:
          (err as Error)?.message || "Background agent turn failed unexpectedly.",
        statusCode: 500,
        timestamp: Date.now(),
      });
    }
  })();

  return handle;
}

const textEncoder = new TextEncoder();

function formatSseFrame(seq: number, payload: PatternTurnStreamEvent): Uint8Array {
  return textEncoder.encode(`id: ${seq}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function createSseReadableStream(opts: {
  replay: () => PatternTurnStreamEvent[];
  isSettled: () => boolean;
  addSubscriber: (sub: PatternTurnSubscriber) => void;
  removeSubscriber: (sub: PatternTurnSubscriber) => void;
}): ReadableStream<Uint8Array> {
  let subscriber: PatternTurnSubscriber | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let seq = 0;

      const close = () => {
        if (closed) return;
        closed = true;
        if (keepalive) {
          clearInterval(keepalive);
          keepalive = null;
        }
        if (subscriber) opts.removeSubscriber(subscriber);
        try {
          controller.enqueue(textEncoder.encode("data: [DONE]\n\n"));
        } catch {
          // Reader already gone
        }
        try {
          controller.close();
        } catch {
          // Ignore close errors
        }
      };

      const push = (event: PatternTurnStreamEvent) => {
        if (closed) return;
        seq += 1;
        try {
          controller.enqueue(formatSseFrame(seq, event));
        } catch {
          close();
        }
      };

      subscriber = { push, done: close };

      // Replay compacted log first
      for (const pastEvent of opts.replay()) {
        push(pastEvent);
      }

      if (opts.isSettled()) {
        close();
        return;
      }

      opts.addSubscriber(subscriber);
      keepalive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(textEncoder.encode(": keepalive\n\n"));
        } catch {
          close();
        }
      }, KEEPALIVE_INTERVAL_MS);
      if (typeof keepalive.unref === "function") keepalive.unref();
    },
    cancel() {
      // Browser closed/navigated: detach view ONLY (never abort turn!)
      if (keepalive) {
        clearInterval(keepalive);
        keepalive = null;
      }
      if (subscriber) opts.removeSubscriber(subscriber);
    },
  });
}

/** One-shot SSE stream for already-settled sessions reconnecting to `/stream`. */
export function singleEventSseStream(
  event: PatternTurnStreamEvent,
): ReadableStream<Uint8Array> {
  return createSseReadableStream({
    replay: () => [event],
    isSettled: () => true,
    addSubscriber: () => {},
    removeSubscriber: () => {},
  });
}

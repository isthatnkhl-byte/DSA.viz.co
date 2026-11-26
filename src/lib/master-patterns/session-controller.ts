import type {
  PatternSessionState,
  PatternTurnActionInput,
  PatternTurnSteerNote,
  PatternTurnStreamEvent,
} from "./types";

export class StreamTransportError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

export async function* parsePatternSseEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<PatternTurnStreamEvent, boolean> {
  const decoder = new TextDecoder();
  let buffer = "";
  let sawTerminalOrDone = false;

  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch (err) {
      throw new StreamTransportError(err);
    }

    if (chunk.done) {
      return sawTerminalOrDone;
    }

    buffer += decoder.decode(chunk.value, { stream: true });

    for (;;) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary === -1) break;
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const dataLines: string[] = [];
      for (const rawLine of frame.split(/\r?\n/)) {
        if (rawLine.startsWith("data:")) {
          dataLines.push(rawLine.slice(5).trimStart());
        }
      }
      if (dataLines.length === 0) continue;

      const dataStr = dataLines.join("\n").trim();
      if (!dataStr) continue;
      if (dataStr === "[DONE]") {
        sawTerminalOrDone = true;
        return true;
      }

      try {
        const parsed = JSON.parse(dataStr) as PatternTurnStreamEvent;
        if (parsed && typeof parsed.type === "string") {
          if (parsed.type === "turn_settled" || parsed.type === "turn_error") {
            sawTerminalOrDone = true;
          }
          yield parsed;
        }
      } catch {
        // Ignore malformed comment/frame fragments safely
      }
    }
  }
}

export type SettledTurnEvent = Extract<
  PatternTurnStreamEvent,
  { type: "turn_settled" }
>;

export interface PatternTurnStreamOptions {
  basePath?: string;
  sessionId: string;
  fetchImpl?: typeof globalThis.fetch;
  getHeaders?: () => Promise<Record<string, string>>;
  onEvent?: (event: PatternTurnStreamEvent) => void;
  signal?: AbortSignal;
  pollMs?: number;
  waitMaxMs?: number;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function consumeStreamResponse(
  res: Response,
  onEvent?: (event: PatternTurnStreamEvent) => void,
): Promise<{
  settled: SettledTurnEvent | null;
  errorEvent: Extract<PatternTurnStreamEvent, { type: "turn_error" }> | null;
  cleanEnd: boolean;
}> {
  if (!res.body) {
    return { settled: null, errorEvent: null, cleanEnd: false };
  }
  const reader = res.body.getReader();
  const gen = parsePatternSseEvents(reader);
  let settled: SettledTurnEvent | null = null;
  let errorEvent: Extract<PatternTurnStreamEvent, { type: "turn_error" }> | null =
    null;

  try {
    for (;;) {
      const next = await gen.next();
      if (next.done) {
        return {
          settled,
          errorEvent,
          cleanEnd: next.value || Boolean(settled || errorEvent),
        };
      }
      const ev = next.value;
      onEvent?.(ev);
      if (ev.type === "turn_settled") settled = ev;
      if (ev.type === "turn_error") errorEvent = ev;
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
}

/**
 * Attaches to an in-flight or recently settled turn SSE stream (used on tab reload
 * when `session.turnInFlight === true` or after a premature EOF drop).
 */
export async function reattachPatternTurnStream(
  opts: PatternTurnStreamOptions,
): Promise<SettledTurnEvent> {
  const fetchFn = opts.fetchImpl ?? globalThis.fetch;
  const basePath = opts.basePath ?? "/api/patterns";
  const headers = opts.getHeaders ? await opts.getHeaders() : {};

  const res = await fetchFn(
    `${basePath}/session/${encodeURIComponent(opts.sessionId)}/stream`,
    {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...headers,
      },
      signal: opts.signal,
    },
  );

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    const err = new Error(
      errJson?.error || `Stream reattach failed (${res.status})`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const outcome = await consumeStreamResponse(res, opts.onEvent);
  if (outcome.errorEvent) {
    const err = new Error(outcome.errorEvent.error) as Error & {
      status?: number;
    };
    err.status = outcome.errorEvent.statusCode ?? 500;
    throw err;
  }
  if (outcome.settled) {
    return outcome.settled;
  }
  throw new Error("Turn stream ended before settlement was received.");
}

/**
 * Pure Turn Controller (ported from LearnHarness `components/session-core.ts`):
 * 1. Sends POST `/session/:id/turn` requesting SSE stream.
 * 2. On `409 Conflict` (racing in-flight turn), polls & attaches `/stream`.
 * 3. On premature EOF drop before `turn_settled`, performs 1 bounded recovery attach
 *    to `/session/:id/stream` (falling back once to `GET /session/:id` snapshot).
 */
export async function runPatternTurnWithRecovery(
  opts: PatternTurnStreamOptions & {
    action: PatternTurnActionInput;
  },
): Promise<SettledTurnEvent> {
  const fetchFn = opts.fetchImpl ?? globalThis.fetch;
  const basePath = opts.basePath ?? "/api/patterns";
  const pollMs = opts.pollMs ?? 400;
  const waitMaxMs = opts.waitMaxMs ?? 20_000;
  const headers = opts.getHeaders ? await opts.getHeaders() : {};

  const postRes = await fetchFn(
    `${basePath}/session/${encodeURIComponent(opts.sessionId)}/turn`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...headers,
      },
      body: JSON.stringify({ action: opts.action }),
      signal: opts.signal,
    },
  );

  // Bounded 409 conflict recovery (mirrors LearnHarness session-core.ts)
  if (postRes.status === 409) {
    const errBody = (await postRes.json().catch(() => ({}))) as {
      error?: string;
    };
    if (errBody.error?.toLowerCase().includes("already in flight")) {
      const deadline = Date.now() + waitMaxMs;
      while (Date.now() < deadline) {
        try {
          return await reattachPatternTurnStream(opts);
        } catch {
          await delay(pollMs, opts.signal);
        }
      }
    }
    const err = new Error(
      errBody.error || "Session turn state conflict (409).",
    ) as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  if (!postRes.ok) {
    const errBody = (await postRes.json().catch(() => ({}))) as {
      error?: string;
    };
    const err = new Error(
      errBody.error || `Turn request failed (${postRes.status})`,
    ) as Error & { status?: number };
    err.status = postRes.status;
    throw err;
  }

  const contentType = postRes.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await postRes.json()) as SettledTurnEvent;
    opts.onEvent?.(json);
    return json;
  }

  let transportDropped = false;
  try {
    const firstPass = await consumeStreamResponse(postRes, opts.onEvent);
    if (firstPass.errorEvent) {
      const err = new Error(firstPass.errorEvent.error) as Error & {
        status?: number;
      };
      err.status = firstPass.errorEvent.statusCode ?? 500;
      throw err;
    }
    if (firstPass.settled) {
      return firstPass.settled;
    }
    transportDropped = true;
  } catch (err) {
    if (err instanceof StreamTransportError) {
      transportDropped = true;
    } else if (
      err instanceof Error &&
      (err.name === "AbortError" || opts.signal?.aborted)
    ) {
      throw err;
    } else {
      throw err;
    }
  }

  // LearnHarness Law: ONE bounded recovery attachment on premature EOF/drop
  if (transportDropped && !opts.signal?.aborted) {
    await delay(Math.min(180, pollMs), opts.signal);
    try {
      return await reattachPatternTurnStream(opts);
    } catch {
      // Final fallback: read authoritative session state
      const snapRes = await fetchFn(
        `${basePath}/session/${encodeURIComponent(opts.sessionId)}`,
        { method: "GET", headers, signal: opts.signal },
      );
      if (snapRes.ok) {
        const snap = (await snapRes.json()) as {
          session: PatternSessionState;
        };
        if (snap.session) {
          const fallbackSettled: SettledTurnEvent = {
            type: "turn_settled",
            turnId: snap.session.lastTurnTrace?.turnId ?? "recovered",
            sessionId: opts.sessionId,
            session: snap.session,
            ...(snap.session.lastEvaluation
              ? { evaluation: snap.session.lastEvaluation }
              : {}),
            ...(snap.session.scorecard
              ? { scorecard: snap.session.scorecard }
              : {}),
            timestamp: Date.now(),
          };
          opts.onEvent?.(fallbackSettled);
          return fallbackSettled;
        }
      }
    }
  }

  throw new Error("The connection dropped before the agent turn settled.");
}

export async function steerActivePatternTurn(opts: {
  basePath?: string;
  sessionId: string;
  text: string;
  steerId?: string;
  fetchImpl?: typeof globalThis.fetch;
  getHeaders?: () => Promise<Record<string, string>>;
}): Promise<{ accepted: boolean; turnId: string; steer: PatternTurnSteerNote }> {
  const fetchFn = opts.fetchImpl ?? globalThis.fetch;
  const basePath = opts.basePath ?? "/api/patterns";
  const headers = opts.getHeaders ? await opts.getHeaders() : {};
  const res = await fetchFn(
    `${basePath}/session/${encodeURIComponent(opts.sessionId)}/steer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ text: opts.text, steerId: opts.steerId }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    accepted?: boolean;
    turnId?: string;
    steer?: PatternTurnSteerNote;
    error?: string;
  };
  if (!res.ok) {
    const err = new Error(data.error || "Failed to send steer") as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  return {
    accepted: Boolean(data.accepted),
    turnId: data.turnId ?? "",
    steer: data.steer!,
  };
}

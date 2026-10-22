import { Response } from "express";
import { AgUiEvent, AgUiEventType, JsonPatchOperation, AgUiEventInput } from "./types";

/**
 * AgUiStreamWriter handles HTTP Server-Sent Events (SSE) streaming adhering strictly
 * to the AG-UI wire protocol:
 * 
 * Wire format:
 * `id: <eventId>\n`
 * `data: {"type": "<EventType>", "timestamp": 123456789, ...payload}\n\n`
 */
export class AgUiStreamWriter {
  private res: Response;
  private closed = false;
  private eventIndex = 0;
  private keepAliveTimer: NodeJS.Timeout | null = null;

  constructor(res: Response) {
    this.res = res;

    // Hardened SSE Headers conforming to AG-UI HTTP Transport
    this.res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    this.res.setHeader("Cache-Control", "no-cache, no-transform, no-store");
    this.res.setHeader("Connection", "keep-alive");
    this.res.setHeader("X-Accel-Buffering", "no"); // Bypass Nginx / proxy buffers
    this.res.setHeader("Transfer-Encoding", "chunked");
    (this.res.socket as any)?.setNoDelay?.(true);
    this.res.flushHeaders?.();

    // Start 15s keepalive heartbeat
    this.keepAliveTimer = setInterval(() => {
      this.sendKeepAlive();
    }, 15000);

    this.res.on("close", () => {
      this.cleanup();
    });
  }

  public get isClosed(): boolean {
    return this.closed;
  }

  private cleanup(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * Serializes and writes an AG-UI event to the SSE stream.
   * Handles stream backpressure if the network buffer is congested.
   */
  public emit(eventPayload: AgUiEventInput): boolean {
    if (this.closed) return false;

    this.eventIndex += 1;
    const fullEvent: AgUiEvent = {
      ...eventPayload,
      timestamp: Date.now(),
    } as AgUiEvent;

    try {
      const payloadString = JSON.stringify(fullEvent);
      const sseMessage = `id: ${this.eventIndex}\ndata: ${payloadString}\n\n`;
      const written = this.res.write(sseMessage);
      (this.res as any).flush?.();
      return written;
    } catch (err) {
      console.error("[AG-UI StreamWriter] Error encoding event:", err);
      return false;
    }
  }

  // Lifecycle helpers
  public sendRunStart(runId: string, agentName: string = "Vizco AgUi Assistant", model?: string): void {
    this.emit({
      type: AgUiEventType.RUN_STARTED,
      runId,
      agentName,
      model,
    });
  }

  public sendRunEnd(runId: string, durationMs?: number): void {
    this.emit({
      type: AgUiEventType.RUN_FINISHED,
      runId,
      durationMs,
    });
    this.closeStream();
  }

  public sendError(runId: string, error: string, code?: string): void {
    this.emit({
      type: AgUiEventType.RUN_ERROR,
      runId,
      error,
      code,
    });
    this.closeStream();
  }

  public sendStepStart(stepId: string, stepName: string, index?: number, totalSteps?: number): void {
    this.emit({
      type: AgUiEventType.STEP_STARTED,
      stepId,
      stepName,
      index,
      totalSteps,
    });
  }

  public sendStepEnd(stepId: string, status: "success" | "skipped" | "failed" = "success"): void {
    this.emit({
      type: AgUiEventType.STEP_FINISHED,
      stepId,
      status,
    });
  }

  // Text message streaming
  public sendTextMessageStart(messageId: string, role: "assistant" | "user" | "system" = "assistant"): void {
    this.emit({
      type: AgUiEventType.TEXT_MESSAGE_START,
      messageId,
      role,
    });
  }

  public sendTextMessageContent(messageId: string, delta: string): void {
    this.emit({
      type: AgUiEventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta,
    });
  }

  public sendTextMessageEnd(messageId: string): void {
    this.emit({
      type: AgUiEventType.TEXT_MESSAGE_END,
      messageId,
    });
  }

  // Reasoning / Chain-of-Thought streaming
  public sendReasoningStart(): void {
    this.emit({
      type: AgUiEventType.REASONING_START,
    });
  }

  public sendReasoningContent(delta: string): void {
    this.emit({
      type: AgUiEventType.REASONING_MESSAGE_CONTENT,
      delta,
    });
  }

  public sendReasoningEnd(): void {
    this.emit({
      type: AgUiEventType.REASONING_MESSAGE_END,
    });
  }

  // Tool call streaming
  public sendToolStart(toolCallId: string, toolCallName: string, parentMessageId?: string): void {
    this.emit({
      type: AgUiEventType.TOOL_CALL_START,
      toolCallId,
      toolCallName,
      parentMessageId,
    });
  }

  public sendToolArgs(toolCallId: string, delta: string): void {
    this.emit({
      type: AgUiEventType.TOOL_CALL_ARGS,
      toolCallId,
      delta,
    });
  }

  public sendToolEnd(toolCallId: string): void {
    this.emit({
      type: AgUiEventType.TOOL_CALL_END,
      toolCallId,
    });
  }

  public sendToolResult(toolCallId: string, result: any, status: "success" | "error" = "success"): void {
    this.emit({
      type: AgUiEventType.TOOL_CALL_RESULT,
      toolCallId,
      result,
      status,
    });
  }

  // State synchronization
  public sendStateSnapshot(state: Record<string, any>, version?: number): void {
    this.emit({
      type: AgUiEventType.STATE_SNAPSHOT,
      state,
      version,
    });
  }

  public sendStateDelta(delta: JsonPatchOperation[], baseVersion?: number, targetVersion?: number): void {
    this.emit({
      type: AgUiEventType.STATE_DELTA,
      delta,
      baseVersion,
      targetVersion,
    });
  }

  // Keep-alive heartbeat (SSE comment format)
  public sendKeepAlive(): void {
    if (!this.closed) {
      try {
        this.res.write(": keep-alive\n\n");
      } catch {
        this.cleanup();
      }
    }
  }

  public closeStream(): void {
    if (this.closed) return;
    this.cleanup();
    try {
      this.res.end();
    } catch {
      // Socket already terminated
    }
  }
}

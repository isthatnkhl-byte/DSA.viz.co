/**
 * AG-UI Protocol (Agent-User Interaction Protocol) Specification
 * Spec Reference: https://github.com/ag-ui-protocol/ag-ui
 * 
 * Standardizes bi-directional, event-driven streaming between AI agents
 * and frontend user interfaces over Server-Sent Events (SSE).
 */

export enum AgUiEventType {
  // Lifecycle Events
  RUN_STARTED = "RUN_STARTED",
  RUN_FINISHED = "RUN_FINISHED",
  RUN_ERROR = "RUN_ERROR",
  STEP_STARTED = "STEP_STARTED",
  STEP_FINISHED = "STEP_FINISHED",

  // Text Streaming Events
  TEXT_MESSAGE_START = "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT = "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END = "TEXT_MESSAGE_END",

  // Reasoning / Chain-of-Thought Events
  REASONING_START = "REASONING_START",
  REASONING_MESSAGE_START = "REASONING_MESSAGE_START",
  REASONING_MESSAGE_CONTENT = "REASONING_MESSAGE_CONTENT",
  REASONING_MESSAGE_END = "REASONING_MESSAGE_END",

  // Tool Call Events
  TOOL_CALL_START = "TOOL_CALL_START",
  TOOL_CALL_ARGS = "TOOL_CALL_ARGS",
  TOOL_CALL_END = "TOOL_CALL_END",
  TOOL_CALL_RESULT = "TOOL_CALL_RESULT",

  // State Management Events (RFC 6902 JSON Patch)
  STATE_SNAPSHOT = "STATE_SNAPSHOT",
  STATE_DELTA = "STATE_DELTA",
  MESSAGES_SNAPSHOT = "MESSAGES_SNAPSHOT",

  // Subagent Coordination Events
  SUBAGENT_STARTED = "SUBAGENT_STARTED",
  SUBAGENT_FINISHED = "SUBAGENT_FINISHED",
}

/**
 * Standard RFC 6902 JSON Patch operation definition
 */
export interface JsonPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: any;
  from?: string;
}

export interface AgUiBaseEvent {
  type: AgUiEventType;
  timestamp: number;
  metadata?: Record<string, any>;
  rawEvent?: any;
}

// Lifecycle Events
export interface AgUiRunStartedEvent extends AgUiBaseEvent {
  type: AgUiEventType.RUN_STARTED;
  runId: string;
  agentName?: string;
  model?: string;
}

export interface AgUiRunFinishedEvent extends AgUiBaseEvent {
  type: AgUiEventType.RUN_FINISHED;
  runId: string;
  durationMs?: number;
}

export interface AgUiRunErrorEvent extends AgUiBaseEvent {
  type: AgUiEventType.RUN_ERROR;
  runId: string;
  error: string;
  code?: string;
}

export interface AgUiStepStartedEvent extends AgUiBaseEvent {
  type: AgUiEventType.STEP_STARTED;
  stepId: string;
  stepName: string;
  index?: number;
  totalSteps?: number;
}

export interface AgUiStepFinishedEvent extends AgUiBaseEvent {
  type: AgUiEventType.STEP_FINISHED;
  stepId: string;
  status: "success" | "skipped" | "failed";
}

// Text Message Events
export interface AgUiTextMessageStartEvent extends AgUiBaseEvent {
  type: AgUiEventType.TEXT_MESSAGE_START;
  messageId: string;
  role: "assistant" | "user" | "system";
}

export interface AgUiTextMessageContentEvent extends AgUiBaseEvent {
  type: AgUiEventType.TEXT_MESSAGE_CONTENT;
  messageId: string;
  delta: string;
}

export interface AgUiTextMessageEndEvent extends AgUiBaseEvent {
  type: AgUiEventType.TEXT_MESSAGE_END;
  messageId: string;
}

// Reasoning Events
export interface AgUiReasoningStartEvent extends AgUiBaseEvent {
  type: AgUiEventType.REASONING_START;
}

export interface AgUiReasoningMessageContentEvent extends AgUiBaseEvent {
  type: AgUiEventType.REASONING_MESSAGE_CONTENT;
  delta: string;
}

export interface AgUiReasoningMessageEndEvent extends AgUiBaseEvent {
  type: AgUiEventType.REASONING_MESSAGE_END;
}

// Tool Call Events
export interface AgUiToolCallStartEvent extends AgUiBaseEvent {
  type: AgUiEventType.TOOL_CALL_START;
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface AgUiToolCallArgsEvent extends AgUiBaseEvent {
  type: AgUiEventType.TOOL_CALL_ARGS;
  toolCallId: string;
  delta: string;
}

export interface AgUiToolCallEndEvent extends AgUiBaseEvent {
  type: AgUiEventType.TOOL_CALL_END;
  toolCallId: string;
}

export interface AgUiToolCallResultEvent extends AgUiBaseEvent {
  type: AgUiEventType.TOOL_CALL_RESULT;
  toolCallId: string;
  result: any;
  status: "success" | "error";
}

// State Synchronization Events
export interface AgUiStateSnapshotEvent extends AgUiBaseEvent {
  type: AgUiEventType.STATE_SNAPSHOT;
  state: Record<string, any>;
  version?: number;
}

export interface AgUiStateDeltaEvent extends AgUiBaseEvent {
  type: AgUiEventType.STATE_DELTA;
  delta: JsonPatchOperation[];
  baseVersion?: number;
  targetVersion?: number;
}

export type AgUiEvent =
  | AgUiRunStartedEvent
  | AgUiRunFinishedEvent
  | AgUiRunErrorEvent
  | AgUiStepStartedEvent
  | AgUiStepFinishedEvent
  | AgUiTextMessageStartEvent
  | AgUiTextMessageContentEvent
  | AgUiTextMessageEndEvent
  | AgUiReasoningStartEvent
  | AgUiReasoningMessageContentEvent
  | AgUiReasoningMessageEndEvent
  | AgUiToolCallStartEvent
  | AgUiToolCallArgsEvent
  | AgUiToolCallEndEvent
  | AgUiToolCallResultEvent
  | AgUiStateSnapshotEvent
  | AgUiStateDeltaEvent;

export type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type AgUiEventInput = DistributiveOmit<AgUiEvent, "timestamp">;

/**
 * Request payload for triggering an AG-UI agent run
 */
export interface AgUiRunAgentInput {
  prompt?: string;
  messages?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  currentUiState?: Record<string, any>;
  role?: string;
  model?: string;
  threadId?: string;
  activeContext?: Record<string, any>;
  enableTools?: boolean;
  apiKey?: string;
}

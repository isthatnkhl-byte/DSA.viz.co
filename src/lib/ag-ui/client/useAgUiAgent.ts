import { useState, useCallback, useRef, useEffect } from "react";
import jsonpatch, { type Operation } from "fast-json-patch";
import { AgUiEvent, AgUiEventType, JsonPatchOperation, AgUiRunAgentInput } from "../types";
import { getAuth } from "firebase/auth";
import { getAuthHeaders } from "@/lib/api-client";

const { applyPatch } = jsonpatch;

export interface AgentStep {
  id: string;
  name: string;
  index?: number;
  totalSteps?: number;
  status: "running" | "success" | "failed" | "skipped";
}

export interface AgentToolState {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  args?: string;
  result?: any;
}

export interface AgUiAgentState {
  isRunning: boolean;
  statusText: string;
  runId: string | null;
  currentStep: AgentStep | null;
  steps: AgentStep[];
  reasoning: string;
  streamingText: string;
  activeTools: AgentToolState[];
  uiState: Record<string, any>;
  error: string | null;
  durationMs: number | null;
}

export interface UseAgUiAgentReturn extends AgUiAgentState {
  triggerAgent: (prompt: string, overrideState?: Record<string, any>, options?: Partial<AgUiRunAgentInput>) => Promise<void>;
  cancel: () => void;
  reset: () => void;
  setLocalUiState: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export function useAgUiAgent(endpointUrl: string = "/api/ag-ui/stream"): UseAgUiAgentReturn {
  const [state, setState] = useState<AgUiAgentState>({
    isRunning: false,
    statusText: "Ready",
    runId: null,
    currentStep: null,
    steps: [],
    reasoning: "",
    streamingText: "",
    activeTools: [],
    uiState: {
      activeStep: 0,
      totalSteps: 8,
      visualizerType: "array",
      currentFrame: {
        array: [4, 2, 9, 1, 7, 5],
        highlightIndices: [],
        explanation: "Initial array state ready for execution.",
      },
      telemetry: {
        status: "idle",
        executionTimeMs: 0,
      },
    },
    error: null,
    durationMs: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Microtask buffer to prevent re-render thrashing at high token frequencies
  const pendingTokensRef = useRef<string>("");
  const pendingReasoningRef = useRef<string>("");
  const flushScheduledRef = useRef<boolean>(false);

  const scheduleFlush = useCallback(() => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;

    requestAnimationFrame(() => {
      const textChunk = pendingTokensRef.current;
      const reasoningChunk = pendingReasoningRef.current;

      pendingTokensRef.current = "";
      pendingReasoningRef.current = "";
      flushScheduledRef.current = false;

      if (textChunk || reasoningChunk) {
        setState((prev) => ({
          ...prev,
          streamingText: textChunk ? prev.streamingText + textChunk : prev.streamingText,
          reasoning: reasoningChunk ? prev.reasoning + reasoningChunk : prev.reasoning,
        }));
      }
    });
  }, []);

  const handleAgUiEvent = useCallback((event: AgUiEvent) => {
    switch (event.type) {
      case AgUiEventType.RUN_STARTED:
        setState((prev) => ({
          ...prev,
          isRunning: true,
          runId: event.runId,
          statusText: `Agent active (${event.agentName || "AG-UI Engine"})`,
          error: null,
          durationMs: null,
        }));
        break;

      case AgUiEventType.STEP_STARTED:
        setState((prev) => {
          const newStep: AgentStep = {
            id: event.stepId,
            name: event.stepName,
            index: event.index,
            totalSteps: event.totalSteps,
            status: "running",
          };
          const existingIdx = prev.steps.findIndex((s) => s.id === event.stepId);
          const nextSteps = existingIdx >= 0
            ? prev.steps.map((s, idx) => (idx === existingIdx ? newStep : s))
            : [...prev.steps, newStep];

          return {
            ...prev,
            currentStep: newStep,
            statusText: event.stepName,
            steps: nextSteps,
          };
        });
        break;

      case AgUiEventType.STEP_FINISHED:
        setState((prev) => ({
          ...prev,
          steps: prev.steps.map((s) =>
            s.id === event.stepId ? { ...s, status: event.status } : s
          ),
        }));
        break;

      case AgUiEventType.REASONING_START:
        // Ready for reasoning stream
        break;

      case AgUiEventType.REASONING_MESSAGE_CONTENT:
        pendingReasoningRef.current += event.delta;
        scheduleFlush();
        break;

      case AgUiEventType.REASONING_MESSAGE_END:
        break;

      case AgUiEventType.TEXT_MESSAGE_START:
        break;

      case AgUiEventType.TEXT_MESSAGE_CONTENT:
        pendingTokensRef.current += event.delta;
        scheduleFlush();
        break;

      case AgUiEventType.TEXT_MESSAGE_END:
        // Flush remaining tokens immediately
        if (pendingTokensRef.current || pendingReasoningRef.current) {
          const textChunk = pendingTokensRef.current;
          const reasoningChunk = pendingReasoningRef.current;
          pendingTokensRef.current = "";
          pendingReasoningRef.current = "";
          setState((prev) => ({
            ...prev,
            streamingText: prev.streamingText + textChunk,
            reasoning: prev.reasoning + reasoningChunk,
          }));
        }
        break;

      case AgUiEventType.TOOL_CALL_START:
        setState((prev) => ({
          ...prev,
          activeTools: [
            ...prev.activeTools.filter((t) => t.id !== event.toolCallId),
            {
              id: event.toolCallId,
              name: event.toolCallName,
              status: "running",
              args: "",
            },
          ],
        }));
        break;

      case AgUiEventType.TOOL_CALL_ARGS:
        setState((prev) => ({
          ...prev,
          activeTools: prev.activeTools.map((t) =>
            t.id === event.toolCallId ? { ...t, args: (t.args || "") + event.delta } : t
          ),
        }));
        break;

      case AgUiEventType.TOOL_CALL_RESULT:
        setState((prev) => ({
          ...prev,
          activeTools: prev.activeTools.map((t) =>
            t.id === event.toolCallId
              ? { ...t, status: event.status === "error" ? "error" : "done", result: event.result }
              : t
          ),
        }));
        break;

      case AgUiEventType.STATE_SNAPSHOT:
        setState((prev) => ({
          ...prev,
          uiState: event.state || {},
        }));
        break;

      case AgUiEventType.STATE_DELTA:
        setState((prev) => {
          try {
            // Immutable clone
            const target = JSON.parse(JSON.stringify(prev.uiState));
            const result = applyPatch(target, event.delta as Operation[]);
            return {
              ...prev,
              uiState: result.newDocument,
            };
          } catch (patchErr) {
            console.warn("[AG-UI Client] Failed to apply RFC 6902 delta patch:", patchErr);
            return prev;
          }
        });
        break;

      case AgUiEventType.RUN_FINISHED:
        setState((prev) => ({
          ...prev,
          isRunning: false,
          statusText: "Run complete",
          durationMs: event.durationMs || null,
        }));
        break;

      case AgUiEventType.RUN_ERROR:
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: event.error,
          statusText: "Run encountered an error",
        }));
        break;
    }
  }, [scheduleFlush]);

  const triggerAgent = useCallback(
    async (prompt: string, overrideState?: Record<string, any>, options?: Partial<AgUiRunAgentInput>) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Reset state for new run
      setState((prev) => ({
        ...prev,
        isRunning: true,
        statusText: "Connecting to AG-UI agent runtime...",
        reasoning: "",
        streamingText: "",
        steps: [],
        currentStep: null,
        activeTools: [],
        error: null,
        durationMs: null,
        uiState: overrideState || prev.uiState,
      }));

      pendingTokensRef.current = "";
      pendingReasoningRef.current = "";

      try {
        let idToken: string | undefined = undefined;
        try {
          const auth = getAuth();
          if (auth.currentUser) {
            idToken = await auth.currentUser.getIdToken();
          }
        } catch {
          // Guest mode
        }

        const authHeaders = await getAuthHeaders().catch(() => ({}));

        const response = await fetch(endpointUrl, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            ...authHeaders,
          },
          body: JSON.stringify({
            prompt,
            currentUiState: overrideState || state.uiState,
            ...options,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const errText = await response.text().catch(() => "");
          throw new Error(`Agent stream request failed (${response.status}): ${errText || response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const block of parts) {
            const trimmed = block.trim();
            if (!trimmed || trimmed.startsWith(":")) continue; // Keep-alive comment

            const lines = trimmed.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                try {
                  const event: AgUiEvent = JSON.parse(jsonStr);
                  handleAgUiEvent(event);
                } catch (e) {
                  console.warn("[AG-UI] Parse error for line:", line, e);
                }
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            isRunning: false,
            error: err.message || "Failed to stream agent response",
            statusText: "Connection error",
          }));
        }
      } finally {
        setState((prev) => (prev.isRunning ? { ...prev, isRunning: false } : prev));
      }
    },
    [endpointUrl, handleAgUiEvent, state.uiState]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isRunning: false,
      statusText: "Run stopped by user",
    }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState((prev) => ({
      ...prev,
      isRunning: false,
      statusText: "Ready",
      reasoning: "",
      streamingText: "",
      steps: [],
      currentStep: null,
      activeTools: [],
      error: null,
      durationMs: null,
    }));
  }, [cancel]);

  const setLocalUiState = useCallback<React.Dispatch<React.SetStateAction<Record<string, any>>>>((action) => {
    setState((prev) => ({
      ...prev,
      uiState: typeof action === "function" ? action(prev.uiState) : action,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    triggerAgent,
    cancel,
    reset,
    setLocalUiState,
  };
}

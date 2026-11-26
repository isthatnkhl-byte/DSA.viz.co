import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Loader2,
  Send,
  Square,
  Wrench,
  XCircle,
} from "lucide-react";
import type {
  AgentRole,
  PatternTurnActionKind,
  PatternTurnSteerNote,
  PatternTurnTraceSummary,
  PatternToolCallRecord,
} from "@/lib/master-patterns/types";

export interface LiveTurnUiState {
  active: boolean;
  turnId: string | null;
  role: AgentRole | null;
  action: PatternTurnActionKind | null;
  step: number;
  reasoningText: string;
  toolCalls: PatternToolCallRecord[];
  steers: PatternTurnSteerNote[];
}

interface AgentRuntimeBarProps {
  liveState: LiveTurnUiState;
  lastTrace?: PatternTurnTraceSummary | null;
  onSteer: (text: string) => Promise<void>;
  onAbort: () => Promise<void>;
}

const ROLE_LABELS: Record<AgentRole, string> = {
  prober: "DIAGNOSTIC PROBER",
  teacher: "SOCRATIC TEACHER",
  practitioner: "GAUNTLET PRACTITIONER",
};

export const AgentRuntimeBar: React.FC<AgentRuntimeBarProps> = ({
  liveState,
  lastTrace,
  onSteer,
  onAbort,
}) => {
  const [steerInput, setSteerInput] = useState("");
  const [sendingSteer, setSendingSteer] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const isRunning = liveState.active;
  const toolCalls = isRunning
    ? liveState.toolCalls
    : (lastTrace?.toolCalls ?? []);
  const role = isRunning ? liveState.role : (lastTrace?.role ?? null);
  const reasoning = isRunning
    ? liveState.reasoningText
    : (lastTrace?.reasoningSummary ?? "");

  if (!isRunning && !lastTrace) return null;

  const handleSendSteer = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = steerInput.trim();
    if (!text || sendingSteer || !isRunning) return;
    setSendingSteer(true);
    try {
      await onSteer(text);
      setSteerInput("");
    } finally {
      setSendingSteer(false);
    }
  };

  const handleAbort = async () => {
    if (aborting || !isRunning) return;
    setAborting(true);
    try {
      await onAbort();
    } finally {
      setAborting(false);
    }
  };

  return (
    <div
      className={`border-2 p-3.5 space-y-2.5 transition-colors ${
        isRunning
          ? "border-primary bg-primary/5"
          : "border-border bg-card/60"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isRunning ? (
            <Loader2 className="size-3.5 animate-spin text-primary" />
          ) : (
            <Activity className="size-3.5 text-muted-foreground" />
          )}
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            {role ? ROLE_LABELS[role] : "PATTERN AGENT"}
          </span>
          {isRunning ? (
            <span className="border border-primary/40 bg-background px-2 py-0.5 font-mono text-[10px]">
              Step {Math.max(1, liveState.step)} · Streaming Live
            </span>
          ) : lastTrace ? (
            <span className="border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              Last Run: {lastTrace.action} · {lastTrace.toolCalls.length} tool
              {lastTrace.toolCalls.length === 1 ? "" : "s"} ·{" "}
              {lastTrace.durationMs}ms{lastTrace.aborted ? " (Stopped)" : ""}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              type="button"
              disabled={aborting}
              onClick={() => void handleAbort()}
              className="inline-flex items-center gap-1 border border-rose-500/50 bg-rose-500/10 px-2 py-1 font-mono text-[10px] font-bold uppercase text-rose-500 hover:bg-rose-500/20 disabled:opacity-40 cursor-pointer"
            >
              <Square className="size-3" />
              {aborting ? "Stopping..." : "Stop"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {showDetails ? (
              <>
                <ChevronUp className="size-3" />
                Hide Trace
              </>
            ) : (
              <>
                <ChevronDown className="size-3" />
                Show Trace
              </>
            )}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-2">
          {/* Live Tool Calls */}
          {toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {toolCalls.map((tc) => (
                <span
                  key={tc.callId}
                  title={tc.argsPreview}
                  className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] ${
                    tc.status === "running"
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : tc.status === "error"
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  {tc.status === "running" ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : tc.status === "error" ? (
                    <XCircle className="size-3" />
                  ) : (
                    <CheckCircle2 className="size-3" />
                  )}
                  <Wrench className="size-2.5 opacity-70" />
                  <span className="font-bold">{tc.toolName}</span>
                  {tc.resultPreview && (
                    <span className="opacity-85">· {tc.resultPreview}</span>
                  )}
                  {tc.healed && (
                    <span className="border border-amber-500/50 bg-amber-500/10 px-1 text-[9px] text-amber-500">
                      HEALED
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Live / Last Reasoning */}
          {reasoning && (
            <div className="border border-border bg-background/80 px-3 py-2 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase text-primary mr-2">
                Reasoning:
              </span>
              {reasoning}
            </div>
          )}

          {/* Applied / Pending Steers */}
          {liveState.steers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
              <Compass className="size-3 text-amber-500" />
              {liveState.steers.map((s) => (
                <span
                  key={s.id}
                  className="border border-amber-500/40 bg-amber-500/10 text-amber-500 px-2 py-0.5"
                >
                  Steer: &ldquo;{s.text}&rdquo;
                </span>
              ))}
            </div>
          )}

          {/* Mid-Run Steer Form */}
          {isRunning && (
            <form onSubmit={handleSendSteer} className="flex items-center gap-2">
              <input
                type="text"
                value={steerInput}
                onChange={(e) => setSteerInput(e.target.value)}
                placeholder="Steer active agent mid-run (e.g. 'focus on O(1) space' or 'skip basics')..."
                className="flex-1 border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!steerInput.trim() || sendingSteer}
                className="inline-flex items-center gap-1 border border-primary bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] disabled:opacity-40 cursor-pointer"
              >
                <Send className="size-3" />
                Steer
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

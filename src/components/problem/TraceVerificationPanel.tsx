import React from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, PlayCircle, Loader2, RefreshCcw } from "lucide-react";
import type { DatasetVizTrace } from "@/lib/review.functions";

export function TraceVerificationPanel({
  trace,
  onVerify,
  loading,
}: {
  trace?: DatasetVizTrace;
  onVerify: () => void;
  loading: boolean;
}) {
  if (!trace) return null;

  const { verification } = trace;

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-border/50 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            AI Trace Verification
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Compare this step-by-step trace against the canonical algorithmic execution to find discrepancies.
          </p>
        </div>
        <Button
          onClick={onVerify}
          disabled={loading}
          size="sm"
          variant="outline"
          className="gap-2 shadow-sm font-mono text-xs"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : verification ? (
            <RefreshCcw className="size-4 text-muted-foreground" />
          ) : (
            <PlayCircle className="size-4 text-primary" />
          )}
          {loading ? "Verifying..." : verification ? "Re-Verify" : "Verify Trace"}
        </Button>
      </div>

      {verification && (
        <div className={`rounded-xl border p-4 ${
          verification.is_valid 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-destructive/10 border-destructive/30"
        }`}>
          <div className="flex items-start gap-3">
            {verification.is_valid ? (
              <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="size-5 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col gap-1.5 w-full">
              <h5 className={`font-bold text-sm ${verification.is_valid ? "text-emerald-300" : "text-destructive-foreground"}`}>
                {verification.is_valid ? "Trace Logically Valid" : "Trace Discrepancies Found"}
              </h5>
              <p className="text-xs text-foreground/80 leading-relaxed mb-1">
                {verification.summary}
              </p>
              
              {!verification.is_valid && verification.discrepancies?.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {verification.discrepancies.map((d, i) => (
                    <div key={i} className="flex flex-col gap-1 rounded-md bg-background/50 border border-border/50 p-2.5 text-xs">
                      <div className="font-mono text-[10px] font-bold text-destructive">
                        Step {d.step_number} Discrepancy
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Issue:</span> {d.description}
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Expected:</span> {d.expected_action}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

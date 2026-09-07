import { useState, useCallback, useRef } from "react";
import type { VizStep } from "@/lib/problems";

export function formatStepContinuationContext(allSteps: VizStep[]): string {
  if (!allSteps || allSteps.length === 0) return "";
  const totalCount = allSteps.length;
  const recentSteps = allSteps.slice(-3);
  const lastStep = allSteps[totalCount - 1];

  const { desc, line, type, ...stateVariables } = lastStep || {};
  // Exclude null/undefined properties to minimize tokens
  const cleanState: Record<string, any> = {};
  for (const [k, v] of Object.entries(stateVariables)) {
    if (v !== undefined && v !== null) cleanState[k] = v;
  }

  const overview = recentSteps
    .map((step, idx) => {
      const stepNum = totalCount - recentSteps.length + idx + 1;
      return `Step ${stepNum} (Line ${step.line}): ${step.desc || ""}`;
    })
    .join("\n");

  return `PREVIOUS RUN EXECUTION CONTEXT:
Steps 1 through ${totalCount} have ALREADY executed.
Latest Executed Step: Step ${totalCount} (Line ${lastStep?.line})
Action: ${lastStep?.desc || ""}
Current Variable State: ${JSON.stringify(cleanState)}

Recent Traversal History:
${overview}

CONTINUATION DIRECTIVES:
- Generate Step ${totalCount + 1} next.
- DO NOT reinitialize state, visited sets, queues, or maps.
- DO NOT restart from Line 0 or 1.
- Continue directly from Line ${lastStep?.line}.`;
}

export function useSessionContextStore() {
  const [sessionBatches, setSessionBatches] = useState<VizStep[][]>([]);
  const batchesRef = useRef<VizStep[][]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const addBatch = useCallback((newSteps: VizStep[]) => {
    batchesRef.current.push(newSteps);
    setSessionBatches((prev) => [...prev, newSteps]);
  }, []);

  const resetSession = useCallback(() => {
    batchesRef.current = [];
    setSessionBatches([]);
    setIsComplete(false);
  }, []);

  const getSerializedContext = useCallback((explicitSteps?: VizStep[]) => {
    const all = explicitSteps || batchesRef.current.flat();
    return formatStepContinuationContext(all);
  }, []);

  const getAllSteps = useCallback(() => {
    return batchesRef.current.flat();
  }, []);

  return {
    sessionBatches,
    isComplete,
    setIsComplete,
    addBatch,
    resetSession,
    getSerializedContext,
    getAllSteps,
  };
}


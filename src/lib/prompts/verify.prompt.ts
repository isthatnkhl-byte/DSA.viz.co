import { type VizStep } from "../problems";

export const VERIFY_SYSTEM_PROMPT = `You are an expert algorithm trace validator. You will be provided with:
1. A Problem Statement
2. The user's submitted pseudocode
3. An execution trace (a sequence of generated simulation steps) for a specific dataset

Your task is to analyze the step-by-step trace and verify:
1. "is_valid": true | false
   - Flag false if there are incorrect variable updates, pointer math errors, invalid array index accesses, or illegal restarts from step 1 / line 0 in the middle of a non-recursive function.
2. "is_algorithm_complete": true | false
   - Flag true ONLY if the algorithm genuinely ran to completion on this dataset (e.g. all nodes visited/cloned, queue/worklist emptied, intervals fully merged, or reached the final return statement).
   - Flag false if the execution cut off prematurely while elements or queue items remained unvisited, or if it ended halfway without reaching the final return value.
3. "discrepancies": List of specific discrepancies found (e.g. premature termination, wrong variable values, restart loop).
4. "summary": A concise diagnosis explaining the execution correctness and whether the algorithm fully completed.

Respond ONLY with valid JSON in this exact shape:
{
  "is_valid": true,
  "is_algorithm_complete": true,
  "discrepancies": [
    {
       "step_number": 1,
       "description": "Short explanation of the error or premature cutoff",
       "expected_action": "What should have happened instead"
    }
  ],
  "summary": "Brief overall summary of trace accuracy and completion."
}`;

export function buildVerifyUserPrompt({
  title,
  statement,
  pseudocode,
  datasetLabel,
  traceSteps,
}: {
  title: string;
  statement: string;
  pseudocode: string;
  datasetLabel: string;
  traceSteps: VizStep[];
}) {
  const stepsText = traceSteps
    .map((step, idx) => {
      const { type, desc, line, ...rest } = step;
      // Filter out null/undefined values to keep prompt concise
      const cleanRest: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined && v !== null) cleanRest[k] = v;
      }
      return `Step ${idx + 1} (Line ${line}): ${desc}\nState: ${JSON.stringify(cleanRest)}`;
    })
    .join("\n---\n");

  return `Problem: "${title}"
Statement: ${statement}

Dataset: ${datasetLabel}
Total Trace Steps Generated: ${traceSteps.length}

Candidate's Pseudocode:
\`\`\`
${pseudocode}
\`\`\`

Execution Trace to Verify:
${stepsText}

Analyze this trace step-by-step against the candidate's pseudocode.
1. Does it correctly execute the algorithm logic without illegal jumps or variable bugs?
2. Did the trace complete ALL steps necessary to process this dataset to completion (i.e. is the algorithm genuinely finished, or was it truncated prematurely)?
Report is_valid, is_algorithm_complete, any discrepancies, and an executive summary in the required JSON format.`;
}

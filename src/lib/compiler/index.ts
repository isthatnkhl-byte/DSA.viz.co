import type { CppExecutionResult } from "../compiler.types";
import { validateCppSource } from "./validator";
import { executeOnGodbolt } from "./godbolt";
import { executeOnWandbox } from "./wandbox";

/**
 * Sandboxed multi-tier C++ execution engine.
 * Dispatches compilation exclusively to isolated, resource-constrained sandboxes
 * (Compiler Explorer GCC 13.2 / Wandbox GCC-head) with strict CPU, memory, and timeout bounds.
 */
export async function runSecureCpp(code: string, stdin = ""): Promise<CppExecutionResult> {
  // 1. Pre-execution static validation & bracket balance check (<1ms)
  const validationError = validateCppSource(code);
  if (validationError) {
    return validationError;
  }

  // 2. Parallel execution across isolated high-speed sandboxes (Godbolt GCC & Wandbox)
  let result: CppExecutionResult | null = null;
  try {
    result = await Promise.any([
      executeOnGodbolt(code, stdin, "g132"),
      executeOnGodbolt(code, stdin, "g141"),
      executeOnWandbox(code, stdin),
    ]);
  } catch (err) {
    // Parallel attempts timed out or failed, fallback to sequential execution
    try {
      result = await executeOnGodbolt(code, stdin, "g132");
    } catch {
      try {
        result = await executeOnWandbox(code, stdin);
      } catch (finalErr) {
        return {
          stdout: "",
          stderr:
            "Sandbox compiler service temporarily unavailable. Please check your internet connection or try again in a moment.",
          exitCode: 1,
          status: "error",
          statusMessage: "Execution Service Unavailable",
          timestamp: new Date().toISOString(),
        };
      }
    }
  }

  if (!result) {
    return {
      stdout: "",
      stderr: "Sandbox compiler execution failed to yield an output. Please retry.",
      exitCode: 1,
      status: "error",
      statusMessage: "Execution Error",
      timestamp: new Date().toISOString(),
    };
  }

  // 3. Stdin Assistance Check:
  // If the user's code reads from cin/scanf/getline but no stdin was provided,
  // explain why uninitialized variables or EOF occurred so the user isn't confused by garbage output.
  const usesStdin = /\b(cin\s*>>|scanf\s*\(|getline\s*\(|getchar\s*\(|cin\.get)\b/.test(code);
  const hasEmptyStdin = !stdin || !stdin.trim();

  if (usesStdin && hasEmptyStdin && result.status === "success") {
    const hint =
      "\n\n────────────────────────────────────────────\n" +
      "💡 [DSA.viz Input Notice]: Your code requests input with 'cin >>', but Standard Input (stdin) was empty.\n" +
      "👉 Switch to the 'Standard Input (stdin)' tab in the console and type your input value (e.g. 5) to supply inputs interactively!";

    if (!result.stdout.includes("[DSA.viz Input Notice]")) {
      result.stdout = (result.stdout ? result.stdout + "\n" : "") + hint;
    }
  }

  return result;
}

import type { CompilerExecutionResult, SupportedLanguage } from "../compiler.types";
import { validateSource } from "./validator";
import { executeOnGodbolt } from "./godbolt";
import { executeOnWandbox } from "./wandbox";
import { executeLocalCode } from "./local-runner";

/**
 * Sandboxed multi-tier execution engine for C, C++, Java, and Python.
 * Provides resilient sequential-fallback execution with pre-validation and resource limits.
 */
export async function runSecureCode(
  code: string,
  stdin = "",
  language: SupportedLanguage = "cpp"
): Promise<CompilerExecutionResult> {
  // 1. Pre-execution static validation & bracket balance check (<1ms)
  const validationError = validateSource(code, language);
  if (validationError) {
    return validationError;
  }

  let result: CompilerExecutionResult | null = null;

  // 2. Language-specific execution engine dispatch
  if (language === "python") {
    // Python runs in sandboxed ephemeral process with resource isolation
    result = await executeLocalCode(code, stdin, "python");
  } else if (language === "java") {
    // Java compiles with javac and executes in JVM sandbox with memory bounds
    result = await executeLocalCode(code, stdin, "java");
  } else if (language === "c") {
    // C: Primary provider Godbolt (GCC 14.1 C17) -> Fallback to Local GCC sandbox
    try {
      result = await executeOnGodbolt(code, stdin, "g141", "-O2 -x c -std=c17");
      if (result) {
        result.language = "c";
      }
    } catch (godboltErr) {
      console.warn("[Compiler:C] Godbolt failed, falling back to local GCC runner:", godboltErr);
      try {
        result = await executeLocalCode(code, stdin, "c");
      } catch (localErr) {
        console.error("[Compiler:C] All C compiler providers failed:", localErr);
        return {
          stdout: "",
          stderr: "C compiler service temporarily unavailable. Please try again.",
          exitCode: 1,
          status: "error",
          statusMessage: "Execution Service Unavailable",
          timestamp: new Date().toISOString(),
          language: "c",
        };
      }
    }
  } else {
    // C++: Primary provider Godbolt -> Secondary Wandbox -> Tertiary Local G++ sandbox
    try {
      result = await executeOnGodbolt(code, stdin, "g141", "-O2 -std=c++20");
      if (result) {
        result.language = "cpp";
      }
    } catch (primaryErr) {
      console.warn("[Compiler:CPP] Godbolt failed, trying secondary provider Wandbox:", primaryErr);
      try {
        result = await executeOnWandbox(code, stdin);
        if (result) {
          result.language = "cpp";
        }
      } catch (secondaryErr) {
        console.warn("[Compiler:CPP] Wandbox failed, falling back to local G++ runner:", secondaryErr);
        try {
          result = await executeLocalCode(code, stdin, "cpp");
        } catch (localErr) {
          console.error("[Compiler:CPP] All C++ compiler providers failed:", localErr);
          return {
            stdout: "",
            stderr:
              "Sandbox compiler service temporarily unavailable. Please check your connection or try again in a moment.",
            exitCode: 1,
            status: "error",
            statusMessage: "Execution Service Unavailable",
            timestamp: new Date().toISOString(),
            language: "cpp",
          };
        }
      }
    }
  }

  if (!result) {
    return {
      stdout: "",
      stderr: "Sandbox execution failed to yield an output. Please retry.",
      exitCode: 1,
      status: "error",
      statusMessage: "Execution Error",
      timestamp: new Date().toISOString(),
      language,
    };
  }

  // 3. Stdin Assistance Check:
  // If the user's code requests input but stdin was empty,
  // explain why uninitialized variables, NoSuchElementException, or EOF occurred.
  const hasEmptyStdin = !stdin || !stdin.trim();
  if (hasEmptyStdin && (result.status === "success" || result.status === "runtime_error")) {
    let usesStdin = false;
    let inputSyntaxDesc = "";

    if (language === "cpp") {
      usesStdin = /\b(?:cin\s*>>|scanf\s*\(|getline\s*\(|getchar\s*\(|cin\.get\b)/.test(code);
      inputSyntaxDesc = "'cin >>'";
    } else if (language === "c") {
      usesStdin = /\b(?:scanf\s*\(|getchar\s*\(|fgets\s*\(|read\s*\()/.test(code);
      inputSyntaxDesc = "'scanf'";
    } else if (language === "java") {
      usesStdin = /\b(?:Scanner\b|BufferedReader\b|System\.in\b)/.test(code);
      inputSyntaxDesc = "'Scanner'";
    } else if (language === "python") {
      usesStdin = /\b(?:input\s*\(|sys\.stdin\b)/.test(code);
      inputSyntaxDesc = "'input()'";
    }

    if (usesStdin) {
      const hint =
        "\n\n────────────────────────────────────────────\n" +
        `💡 [DSA.viz Input Notice]: Your code requests input with ${inputSyntaxDesc}, but Standard Input (stdin) was empty.\n` +
        "👉 Enter your input values in the 'Input (stdin)' panel below to test interactively!";

      if (result.status === "success") {
        if (!result.stdout.includes("[DSA.viz Input Notice]")) {
          result.stdout = (result.stdout ? result.stdout + "\n" : "") + hint;
        }
      } else if (result.status === "runtime_error") {
        if (!result.stderr.includes("[DSA.viz Input Notice]")) {
          result.stderr = (result.stderr ? result.stderr + "\n" : "") + hint;
        }
      }
    }
  }

  return result;
}

/**
 * Sandboxed multi-tier C++ execution engine (backward compatible alias).
 */
export async function runSecureCpp(code: string, stdin = ""): Promise<CompilerExecutionResult> {
  return runSecureCode(code, stdin, "cpp");
}


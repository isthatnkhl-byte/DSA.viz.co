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
    // Python: Primary Tier -> Godbolt python312
    //         Fallback Tier -> Sandboxed Local Python runner
    try {
      result = await executeOnGodbolt(code, stdin, "python312", "", "python");
    } catch (godboltErr) {
      console.warn("[Compiler:Python] Godbolt sandbox unavailable, trying local runner:", godboltErr);
      const localResult = await executeLocalCode(code, stdin, "python");
      if (localResult.statusMessage === "Toolchain Not Found") {
        return {
          stdout: "",
          stderr:
            "Python execution service is temporarily unavailable. Cloud sandbox timed out and local Python interpreter is not installed on this server.",
          exitCode: 1,
          status: "error",
          statusMessage: "Execution Service Unavailable",
          timestamp: new Date().toISOString(),
          language: "python",
        };
      }
      result = localResult;
    }
  } else if (language === "java") {
    // Java: Primary Tier -> Godbolt java2102 (OpenJDK 21 LTS)
    //       (Transform 'public class' -> 'class' to adhere to single-file constraints)
    //       Fallback Tier -> Sandboxed Local OpenJDK runner
    try {
      const sanitizedJava = code.replace(/\bpublic\s+(?:final\s+|abstract\s+)?class\b/g, (match) =>
        match.replace(/\bpublic\s+/, "")
      );
      result = await executeOnGodbolt(sanitizedJava, stdin, "java2102", "", "java");
    } catch (godboltErr) {
      console.warn("[Compiler:Java] Godbolt sandbox unavailable, trying local runner:", godboltErr);
      const localResult = await executeLocalCode(code, stdin, "java");
      if (localResult.statusMessage === "Toolchain Not Found") {
        return {
          stdout: "",
          stderr:
            "Java compiler service is temporarily unavailable. Cloud sandbox timed out and local Java Development Kit (javac/java) is not installed on this server.",
          exitCode: 1,
          status: "error",
          statusMessage: "Execution Service Unavailable",
          timestamp: new Date().toISOString(),
          language: "java",
        };
      }
      result = localResult;
    }
  } else if (language === "c") {
    // C: Primary Tier -> Godbolt cg141 (GCC 14.1 C17)
    //    Secondary Tier -> Godbolt g141 (-O2 -x c -std=c17)
    //    Fallback Tier -> Sandboxed Local GCC runner
    try {
      result = await executeOnGodbolt(code, stdin, "cg141", "-O2 -std=c17", "c");
    } catch (primaryErr) {
      console.warn("[Compiler:C] Godbolt cg141 unavailable, trying g141 fallback:", primaryErr);
      try {
        result = await executeOnGodbolt(code, stdin, "g141", "-O2 -x c -std=c17", "c");
      } catch (secondaryErr) {
        console.warn("[Compiler:C] Godbolt secondary unavailable, falling back to local GCC runner:", secondaryErr);
        const localResult = await executeLocalCode(code, stdin, "c");
        if (localResult.statusMessage === "Toolchain Not Found") {
          return {
            stdout: "",
            stderr:
              "C compiler service is temporarily unavailable. Cloud sandbox timed out and local GCC compiler is not installed on this server.",
            exitCode: 1,
            status: "error",
            statusMessage: "Execution Service Unavailable",
            timestamp: new Date().toISOString(),
            language: "c",
          };
        }
        result = localResult;
      }
    }
  } else {
    // C++: Primary Tier -> Godbolt g141 (GCC 14.1 C++20)
    //      Secondary Tier -> Wandbox Cloud Sandbox
    //      Fallback Tier -> Sandboxed Local G++ runner
    try {
      result = await executeOnGodbolt(code, stdin, "g141", "-O2 -std=c++20", "cpp");
    } catch (primaryErr) {
      console.warn("[Compiler:CPP] Godbolt failed, trying secondary provider Wandbox:", primaryErr);
      try {
        result = await executeOnWandbox(code, stdin);
        if (result) {
          result.language = "cpp";
        }
      } catch (secondaryErr) {
        console.warn("[Compiler:CPP] Wandbox failed, falling back to local G++ runner:", secondaryErr);
        const localResult = await executeLocalCode(code, stdin, "cpp");
        if (localResult.statusMessage === "Toolchain Not Found") {
          return {
            stdout: "",
            stderr:
              "C++ compiler service is temporarily unavailable. Cloud sandbox timed out and local G++ compiler is not installed on this server.",
            exitCode: 1,
            status: "error",
            statusMessage: "Execution Service Unavailable",
            timestamp: new Date().toISOString(),
            language: "cpp",
          };
        }
        result = localResult;
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


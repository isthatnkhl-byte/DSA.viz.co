import type { CppExecutionResult } from "../compiler.types";

interface WandboxResponse {
  status?: string | number;
  program_output?: string;
  program_error?: string;
  compiler_error?: string;
  compiler_message?: string;
  signal?: string;
}

/**
 * Executes C++ code on Wandbox API sandbox.
 * @param code C++ source code string
 * @param stdin Standard input stream
 */
export async function executeOnWandbox(code: string, stdin = ""): Promise<CppExecutionResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const payload = {
      code,
      compiler: "gcc-head",
      options: "c++20,warning,gnu++20",
      stdin,
      "compiler-option-raw": "-O2",
    };

    const response = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Wandbox API returned status ${response.status}`);
    }

    const data = (await response.json()) as WandboxResponse;
    const executionTimeMs = Date.now() - startTime;

    const exitCode = typeof data.status === "string" ? parseInt(data.status, 10) : (data.status ?? 0);
    const compileErr = data.compiler_error || data.compiler_message || "";
    const stdout = data.program_output || "";
    const stderr = data.program_error || "";

    // If compilation error occurred
    if (compileErr && !stdout && exitCode !== 0) {
      return {
        stdout: "",
        stderr: compileErr,
        compile_output: compileErr,
        exitCode: exitCode || 1,
        executionTimeMs,
        status: "compilation_error",
        statusMessage: "Compilation Error",
        timestamp: new Date().toISOString(),
      };
    }

    const isSuccess = exitCode === 0 && !stderr;

    return {
      stdout,
      stderr: stderr || (compileErr && exitCode !== 0 ? compileErr : ""),
      exitCode,
      executionTimeMs,
      status: isSuccess ? "success" : exitCode !== 0 ? "runtime_error" : "success",
      statusMessage: exitCode === 0 ? "Execution Succeeded" : `Runtime Error (Exit Code: ${exitCode})`,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = error instanceof Error && error.name === "AbortError";
    if (isTimeout) {
      return {
        stdout: "",
        stderr: "Execution timed out (Time Limit: 9.0s exceeded).",
        exitCode: 124,
        executionTimeMs: 9000,
        status: "timeout",
        statusMessage: "Time Limit Exceeded",
        timestamp: new Date().toISOString(),
      };
    }
    throw error;
  }
}

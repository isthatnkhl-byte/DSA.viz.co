import type { CppExecutionResult } from "../compiler.types";

interface GodboltTextLine {
  text: string;
}

interface GodboltResponse {
  code?: number;
  stdout?: GodboltTextLine[];
  stderr?: GodboltTextLine[];
  buildResult?: {
    code?: number;
    stdout?: GodboltTextLine[];
    stderr?: GodboltTextLine[];
  };
  execResponse?: {
    code?: number;
    didExecute?: boolean;
    stdout?: GodboltTextLine[];
    stderr?: GodboltTextLine[];
    buildResult?: {
      code?: number;
      stderr?: GodboltTextLine[];
    };
  };
}

/**
 * Executes C++ code on Compiler Explorer (Godbolt) sandbox.
 * @param code C++ source code string
 * @param stdin Standard input stream
 * @param compilerId Compiler identifier (e.g. "g132" for GCC 13.2, "g141" for GCC 14.1)
 */
export async function executeOnGodbolt(
  code: string,
  stdin = "",
  compilerId = "g141",
  userArgs = "-O2 -std=c++20",
): Promise<CppExecutionResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const payload = {
      source: code,
      options: {
        userArguments: userArgs,
        executeParameters: {
          args: [],
          stdin: stdin,
        },
        compilerOptions: {
          executorRequest: true,
        },
        filters: {
          execute: true,
        },
        tools: [],
        libraries: [],
      },
    };

    const response = await fetch(`https://godbolt.org/api/compiler/${compilerId}/compile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Godbolt API returned status ${response.status}`);
    }

    const data = (await response.json()) as GodboltResponse;
    const executionTimeMs = Date.now() - startTime;

    // Check for compilation failure first
    const buildStderr = (data.buildResult?.stderr || data.stderr || [])
      .map((item) => item.text)
      .join("\n")
      .trim();

    const buildCode = data.buildResult?.code ?? data.code;
    const didFailCompilation = (buildCode !== undefined && buildCode !== 0) || (buildStderr.length > 0 && !data.execResponse);

    if (didFailCompilation) {
      return {
        stdout: "",
        stderr: buildStderr,
        compile_output: buildStderr || "Compilation failed.",
        exitCode: buildCode ?? 1,
        executionTimeMs,
        status: "compilation_error",
        statusMessage: "Compilation Error",
        timestamp: new Date().toISOString(),
      };
    }

    // Execution outputs
    const execStdout = (data.execResponse?.stdout || data.stdout || [])
      .map((item) => item.text)
      .join("\n");

    const execStderr = (data.execResponse?.stderr || [])
      .map((item) => item.text)
      .join("\n");

    const exitCode = data.execResponse?.code ?? 0;

    return {
      stdout: execStdout,
      stderr: execStderr,
      exitCode,
      executionTimeMs,
      status: exitCode === 0 ? "success" : "runtime_error",
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

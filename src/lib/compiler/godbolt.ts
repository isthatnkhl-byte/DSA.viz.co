import type { CompilerExecutionResult, SupportedLanguage } from "../compiler.types";

interface GodboltTextLine {
  text: string;
}

interface GodboltResponse {
  code?: number;
  stdout?: GodboltTextLine[];
  stderr?: GodboltTextLine[];
  didExecute?: boolean;
  timedOut?: boolean;
  buildResult?: {
    code?: number;
    stdout?: GodboltTextLine[];
    stderr?: GodboltTextLine[];
    timedOut?: boolean;
  };
  execResponse?: {
    code?: number;
    didExecute?: boolean;
    stdout?: GodboltTextLine[];
    stderr?: GodboltTextLine[];
    timedOut?: boolean;
    buildResult?: {
      code?: number;
      stderr?: GodboltTextLine[];
    };
  };
}

/**
 * Strips ANSI color codes and terminal control sequences from compiler/execution output.
 */
function stripAnsi(text: string): string {
  return text.replace(/[\u001b\x1b]\[[0-?]*[ -/]*[@-~]/g, "");
}

/**
 * Executes code on Compiler Explorer (Godbolt) sandbox.
 * Supports C++, C, Java, and Python with live stdin, resource limits, and ANSI stripping.
 *
 * @param code Source code string
 * @param stdin Standard input stream
 * @param compilerId Compiler identifier (e.g. "g141", "cg141", "java2102", "python312")
 * @param userArgs Compiler/runtime arguments
 * @param language Optional target language identifier for output tagging
 */
export async function executeOnGodbolt(
  code: string,
  stdin = "",
  compilerId = "g141",
  userArgs = "-O2 -std=c++20",
  language?: SupportedLanguage
): Promise<CompilerExecutionResult> {
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

    // Check if execution actually ran vs compilation failed
    const didExecute = data.didExecute === true || data.execResponse?.didExecute === true;
    const buildCode = data.buildResult?.code;
    const isCompilationFailure =
      !didExecute &&
      ((buildCode !== undefined && buildCode !== 0) ||
        data.code === -1 ||
        (data.code !== 0 && !data.stdout?.length && Boolean(data.buildResult?.stderr?.length)));

    if (isCompilationFailure) {
      const rawBuildErr = (data.buildResult?.stderr || data.stderr || [])
        .map((item) => item.text)
        .join("\n")
        .trim();
      const cleanBuildErr = stripAnsi(rawBuildErr);
      return {
        stdout: "",
        stderr: cleanBuildErr,
        compile_output: cleanBuildErr || "Compilation failed.",
        exitCode: buildCode ?? 1,
        executionTimeMs,
        status: "compilation_error",
        statusMessage: "Compilation Error",
        timestamp: new Date().toISOString(),
        language,
      };
    }

    // Execution outputs (handles both root-level and nested execResponse)
    const stdoutItems = data.execResponse?.stdout || data.stdout || [];
    const stderrItems = data.execResponse?.stderr || data.stderr || [];

    const execStdout = stripAnsi(stdoutItems.map((item) => item.text).join("\n"));
    const execStderr = stripAnsi(stderrItems.map((item) => item.text).join("\n"));

    // Check for execution timeout on Godbolt side
    const isServerTimeout =
      data.timedOut === true ||
      data.buildResult?.timedOut === true ||
      data.execResponse?.timedOut === true;

    if (isServerTimeout) {
      return {
        stdout: execStdout,
        stderr: (execStderr ? execStderr + "\n" : "") + "Execution timed out (Time Limit exceeded).",
        exitCode: 124,
        executionTimeMs,
        status: "timeout",
        statusMessage: "Time Limit Exceeded",
        timestamp: new Date().toISOString(),
        language,
      };
    }

    const exitCode = data.execResponse?.code ?? (didExecute ? (data.code ?? 0) : (buildCode ?? 0));
    const isSuccess = exitCode === 0;

    return {
      stdout: execStdout,
      stderr: execStderr,
      exitCode,
      executionTimeMs,
      status: isSuccess ? "success" : "runtime_error",
      statusMessage: isSuccess ? "Execution Succeeded" : `Runtime Error (Exit Code: ${exitCode})`,
      timestamp: new Date().toISOString(),
      language,
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
        language,
      };
    }
    throw error;
  }
}


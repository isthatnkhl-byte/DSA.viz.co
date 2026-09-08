import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type { CompilerExecutionResult, SupportedLanguage } from "../compiler.types";

const MAX_OUTPUT_LENGTH = 150000; // 150 KB max output before truncation
const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds sandbox timeout

function resolveBinary(preferredCandidates: string[], fallback: string): string {
  for (const candidate of preferredCandidates) {
    try {
      if (fsSync.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore
    }
  }
  return fallback;
}

const PYTHON_BIN = resolveBinary(
  ["/home/codespace/.python/current/bin/python3", "/usr/bin/python3", "/usr/local/bin/python3"],
  "python3"
);

const JAVAC_BIN = resolveBinary(
  ["/home/codespace/java/current/bin/javac", "/usr/bin/javac", "/usr/local/bin/javac"],
  "javac"
);

const JAVA_BIN = resolveBinary(
  ["/home/codespace/java/current/bin/java", "/usr/bin/java", "/usr/local/bin/java"],
  "java"
);

const GCC_BIN = resolveBinary(["/usr/bin/gcc", "/usr/local/bin/gcc"], "gcc");
const GPP_BIN = resolveBinary(["/usr/bin/g++", "/usr/local/bin/g++"], "g++");

interface ProcessOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

function runSpawnedProcess(
  cmd: string,
  args: string[],
  cwd: string,
  stdinText = "",
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ProcessOutput> {
  return new Promise((resolve) => {
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let timedOut = false;
    let isSettled = false;

    const child = spawn(cmd, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        LC_ALL: "C.UTF-8",
        LANG: "C.UTF-8",
      },
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGTERM");
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            // Ignore
          }
        }, 500);
      } catch {
        // Ignore
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdoutBuffer.length < MAX_OUTPUT_LENGTH) {
        stdoutBuffer += chunk.toString("utf-8");
        if (stdoutBuffer.length > MAX_OUTPUT_LENGTH) {
          stdoutBuffer = stdoutBuffer.slice(0, MAX_OUTPUT_LENGTH) + "\n... [Output truncated (size exceeded 150KB)]";
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderrBuffer.length < MAX_OUTPUT_LENGTH) {
        stderrBuffer += chunk.toString("utf-8");
        if (stderrBuffer.length > MAX_OUTPUT_LENGTH) {
          stderrBuffer = stderrBuffer.slice(0, MAX_OUTPUT_LENGTH) + "\n... [Error truncated (size exceeded 150KB)]";
        }
      }
    });

    if (stdinText) {
      try {
        child.stdin.write(stdinText);
        child.stdin.end();
      } catch {
        // Ignore
      }
    } else {
      try {
        child.stdin.end();
      } catch {
        // Ignore
      }
    }

    const settle = (exitCode: number) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      resolve({
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        exitCode,
        timedOut,
      });
    };

    child.on("error", (err) => {
      stderrBuffer += "\nProcess execution error: " + err.message;
      settle(1);
    });

    child.on("close", (code) => {
      settle(code ?? (timedOut ? 124 : 0));
    });
  });
}

/**
 * Sandboxed local runner for Python, Java, C, and C++.
 * Runs compilation and execution inside ephemeral temp workspaces with resource limits.
 */
export async function executeLocalCode(
  code: string,
  stdin = "",
  language: SupportedLanguage = "cpp"
): Promise<CompilerExecutionResult> {
  const startTime = Date.now();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `dsaviz-${language}-`));

  try {
    if (language === "python") {
      const scriptPath = path.join(tmpDir, "main.py");
      await fs.writeFile(scriptPath, code, "utf-8");

      const execRes = await runSpawnedProcess(PYTHON_BIN, ["-u", "main.py"], tmpDir, stdin);
      const executionTimeMs = Date.now() - startTime;

      if (execRes.timedOut) {
        return {
          stdout: execRes.stdout,
          stderr: (execRes.stderr ? execRes.stderr + "\n" : "") + "Execution timed out (Time Limit: 8.0s exceeded).",
          exitCode: 124,
          executionTimeMs,
          status: "timeout",
          statusMessage: "Time Limit Exceeded",
          timestamp: new Date().toISOString(),
          language: "python",
        };
      }

      const isSuccess = execRes.exitCode === 0;
      return {
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        exitCode: execRes.exitCode,
        executionTimeMs,
        status: isSuccess ? "success" : "runtime_error",
        statusMessage: isSuccess ? "Execution Succeeded" : `Runtime Error (Exit Code: ${execRes.exitCode})`,
        timestamp: new Date().toISOString(),
        language: "python",
      };
    }

    if (language === "java") {
      // Find class name or default to Main
      const publicClassMatch = code.match(/\bpublic\s+class\s+([A-Za-z0-9_]+)/);
      const anyClassMatch = code.match(/\bclass\s+([A-Za-z0-9_]+)/);
      const className = (publicClassMatch && publicClassMatch[1]) || (anyClassMatch && anyClassMatch[1]) || "Main";
      const sourcePath = path.join(tmpDir, `${className}.java`);
      await fs.writeFile(sourcePath, code, "utf-8");

      // 1. Compile with javac
      const compileRes = await runSpawnedProcess(JAVAC_BIN, [path.basename(sourcePath)], tmpDir, "", 6000);
      if (compileRes.timedOut || compileRes.exitCode !== 0) {
        const executionTimeMs = Date.now() - startTime;
        const compileErr = compileRes.stderr || compileRes.stdout || "Java compilation failed.";
        return {
          stdout: "",
          stderr: compileErr,
          compile_output: compileErr,
          exitCode: compileRes.exitCode || 1,
          executionTimeMs,
          status: "compilation_error",
          statusMessage: "Compilation Error",
          timestamp: new Date().toISOString(),
          language: "java",
        };
      }

      // 2. Execute with java
      const execRes = await runSpawnedProcess(
        JAVA_BIN,
        ["-Xmx256m", "-cp", ".", className],
        tmpDir,
        stdin
      );
      const executionTimeMs = Date.now() - startTime;

      if (execRes.timedOut) {
        return {
          stdout: execRes.stdout,
          stderr: (execRes.stderr ? execRes.stderr + "\n" : "") + "Execution timed out (Time Limit: 8.0s exceeded).",
          exitCode: 124,
          executionTimeMs,
          status: "timeout",
          statusMessage: "Time Limit Exceeded",
          timestamp: new Date().toISOString(),
          language: "java",
        };
      }

      const isSuccess = execRes.exitCode === 0;
      return {
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        exitCode: execRes.exitCode,
        executionTimeMs,
        status: isSuccess ? "success" : "runtime_error",
        statusMessage: isSuccess ? "Execution Succeeded" : `Runtime Error (Exit Code: ${execRes.exitCode})`,
        timestamp: new Date().toISOString(),
        language: "java",
      };
    }

    if (language === "c") {
      const sourcePath = path.join(tmpDir, "main.c");
      const binPath = path.join(tmpDir, "main");
      await fs.writeFile(sourcePath, code, "utf-8");

      // 1. Compile with gcc
      const compileRes = await runSpawnedProcess(
        GCC_BIN,
        ["-O2", "-std=c17", "main.c", "-o", "main", "-lm"],
        tmpDir,
        "",
        6000
      );

      if (compileRes.timedOut || compileRes.exitCode !== 0) {
        const executionTimeMs = Date.now() - startTime;
        const compileErr = compileRes.stderr || compileRes.stdout || "C compilation failed.";
        return {
          stdout: "",
          stderr: compileErr,
          compile_output: compileErr,
          exitCode: compileRes.exitCode || 1,
          executionTimeMs,
          status: "compilation_error",
          statusMessage: "Compilation Error",
          timestamp: new Date().toISOString(),
          language: "c",
        };
      }

      // 2. Execute compiled binary
      const execRes = await runSpawnedProcess(binPath, [], tmpDir, stdin);
      const executionTimeMs = Date.now() - startTime;

      if (execRes.timedOut) {
        return {
          stdout: execRes.stdout,
          stderr: (execRes.stderr ? execRes.stderr + "\n" : "") + "Execution timed out (Time Limit: 8.0s exceeded).",
          exitCode: 124,
          executionTimeMs,
          status: "timeout",
          statusMessage: "Time Limit Exceeded",
          timestamp: new Date().toISOString(),
          language: "c",
        };
      }

      const isSuccess = execRes.exitCode === 0;
      return {
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        exitCode: execRes.exitCode,
        executionTimeMs,
        status: isSuccess ? "success" : "runtime_error",
        statusMessage: isSuccess ? "Execution Succeeded" : `Runtime Error (Exit Code: ${execRes.exitCode})`,
        timestamp: new Date().toISOString(),
        language: "c",
      };
    }

    // Default to C++
    const sourcePath = path.join(tmpDir, "main.cpp");
    const binPath = path.join(tmpDir, "main");
    await fs.writeFile(sourcePath, code, "utf-8");

    // 1. Compile with g++
    const compileRes = await runSpawnedProcess(
      GPP_BIN,
      ["-O2", "-std=c++20", "main.cpp", "-o", "main", "-lm"],
      tmpDir,
      "",
      6000
    );

    if (compileRes.timedOut || compileRes.exitCode !== 0) {
      const executionTimeMs = Date.now() - startTime;
      const compileErr = compileRes.stderr || compileRes.stdout || "C++ compilation failed.";
      return {
        stdout: "",
        stderr: compileErr,
        compile_output: compileErr,
        exitCode: compileRes.exitCode || 1,
        executionTimeMs,
        status: "compilation_error",
        statusMessage: "Compilation Error",
        timestamp: new Date().toISOString(),
        language: "cpp",
      };
    }

    // 2. Execute compiled binary
    const execRes = await runSpawnedProcess(binPath, [], tmpDir, stdin);
    const executionTimeMs = Date.now() - startTime;

    if (execRes.timedOut) {
      return {
        stdout: execRes.stdout,
        stderr: (execRes.stderr ? execRes.stderr + "\n" : "") + "Execution timed out (Time Limit: 8.0s exceeded).",
        exitCode: 124,
        executionTimeMs,
        status: "timeout",
        statusMessage: "Time Limit Exceeded",
        timestamp: new Date().toISOString(),
        language: "cpp",
      };
    }

    const isSuccess = execRes.exitCode === 0;
    return {
      stdout: execRes.stdout,
      stderr: execRes.stderr,
      exitCode: execRes.exitCode,
      executionTimeMs,
      status: isSuccess ? "success" : "runtime_error",
      statusMessage: isSuccess ? "Execution Succeeded" : `Runtime Error (Exit Code: ${execRes.exitCode})`,
      timestamp: new Date().toISOString(),
      language: "cpp",
    };
  } finally {
    // Cleanup temporary workspace
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

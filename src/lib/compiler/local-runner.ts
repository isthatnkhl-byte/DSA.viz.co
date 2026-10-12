import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type { CompilerExecutionResult, SupportedLanguage } from "../compiler.types";

const MAX_OUTPUT_LENGTH = 150000; // 150 KB max output before truncation
const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds sandbox timeout

function findExecutable(candidatePaths: (string | undefined)[], binaryName: string): string | null {
  for (const candidate of candidatePaths) {
    if (!candidate) continue;
    try {
      if (fsSync.existsSync(candidate)) {
        const stat = fsSync.statSync(candidate);
        if (stat.isFile() || stat.isSymbolicLink()) {
          return candidate;
        }
      }
    } catch {
      // Ignore
    }
  }

  const pathEnv = process.env.PATH || "";
  const pathDirs = pathEnv.split(path.delimiter);
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const dir of pathDirs) {
    if (!dir) continue;
    for (const ext of extensions) {
      const fullPath = path.join(dir, binaryName + ext);
      try {
        if (fsSync.existsSync(fullPath)) {
          const stat = fsSync.statSync(fullPath);
          if (stat.isFile() || stat.isSymbolicLink()) {
            return fullPath;
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  return null;
}

export function getPythonBin(): string | null {
  return (
    findExecutable(
      [
        process.env.PYTHON_PATH,
        "/home/codespace/.python/current/bin/python3",
        "/home/codespace/.python/current/bin/python",
        "/usr/bin/python3",
        "/usr/local/bin/python3",
        "/usr/bin/python",
        "/usr/local/bin/python",
        "/opt/homebrew/bin/python3",
        "/opt/homebrew/bin/python",
      ],
      "python3"
    ) || findExecutable([], "python")
  );
}

export function getJavacBin(): string | null {
  const javaHomeBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", "javac") : undefined;
  return findExecutable(
    [
      javaHomeBin,
      "/home/codespace/java/current/bin/javac",
      "/usr/bin/javac",
      "/usr/local/bin/javac",
      "/usr/lib/jvm/default-java/bin/javac",
      "/usr/lib/jvm/java-21-openjdk-amd64/bin/javac",
      "/usr/lib/jvm/java-17-openjdk-amd64/bin/javac",
      "/usr/lib/jvm/java-11-openjdk-amd64/bin/javac",
      "/opt/homebrew/bin/javac",
    ],
    "javac"
  );
}

export function getJavaBin(): string | null {
  const javaHomeBin = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", "java") : undefined;
  return findExecutable(
    [
      javaHomeBin,
      "/home/codespace/java/current/bin/java",
      "/usr/bin/java",
      "/usr/local/bin/java",
      "/usr/lib/jvm/default-java/bin/java",
      "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
      "/usr/lib/jvm/java-17-openjdk-amd64/bin/java",
      "/usr/lib/jvm/java-11-openjdk-amd64/bin/java",
      "/opt/homebrew/bin/java",
    ],
    "java"
  );
}

export function getGccBin(): string | null {
  return findExecutable(
    ["/usr/bin/gcc", "/usr/local/bin/gcc", "/opt/homebrew/bin/gcc"],
    "gcc"
  );
}

export function getGppBin(): string | null {
  return findExecutable(
    ["/usr/bin/g++", "/usr/local/bin/g++", "/opt/homebrew/bin/g++"],
    "g++"
  );
}

export function isLocalToolchainAvailable(language: SupportedLanguage): boolean {
  switch (language) {
    case "python":
      return Boolean(getPythonBin());
    case "java":
      return Boolean(getJavacBin() && getJavaBin());
    case "c":
      return Boolean(getGccBin());
    case "cpp":
      return Boolean(getGppBin());
    default:
      return false;
  }
}

interface ProcessOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  isNotFound?: boolean;
}

const SENSITIVE_ENV_KEY_PATTERN =
  /KEY|SECRET|TOKEN|PASSWORD|PASS|CREDENTIAL|AUTH|PRIVATE|REDIS|DATABASE|DB_|PG|POSTGRES|SUPABASE|FIREBASE|GOOGLE|GEMINI|OPENAI|OPENROUTER|GITHUB|VERCEL|AWS|AZURE|GCP|COOKIE|SESSION|ENCRYPTION/i;

export function buildSanitizedSandboxEnv(sandboxDir: string): NodeJS.ProcessEnv {
  const safeEnv: NodeJS.ProcessEnv = {};

  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === "string" && !SENSITIVE_ENV_KEY_PATTERN.test(key)) {
      safeEnv[key] = val;
    }
  }

  safeEnv.PYTHONUNBUFFERED = "1";
  safeEnv.PYTHONDONTWRITEBYTECODE = "1";
  safeEnv.LC_ALL = "C.UTF-8";
  safeEnv.LANG = "C.UTF-8";
  if (!safeEnv.TMP && !safeEnv.TEMP) {
    safeEnv.TMP = sandboxDir;
    safeEnv.TEMP = sandboxDir;
    safeEnv.TMPDIR = sandboxDir;
  }

  return safeEnv;
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
      env: buildSanitizedSandboxEnv(cwd),
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

    const settle = (exitCode: number, isNotFound = false) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      resolve({
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        exitCode,
        timedOut,
        isNotFound,
      });
    };

    child.on("error", (err: any) => {
      const isEnoent =
        err?.code === "ENOENT" ||
        (typeof err?.message === "string" && err.message.includes("ENOENT"));
      stderrBuffer += "\nProcess execution error: " + (err?.message || String(err));
      settle(1, isEnoent);
    });

    child.on("close", (code) => {
      settle(code ?? (timedOut ? 124 : 0), false);
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
      const pythonBin = getPythonBin();
      if (!pythonBin) {
        const executionTimeMs = Date.now() - startTime;
        return {
          stdout: "",
          stderr: "Local Python interpreter (python3) is not installed on this server.",
          exitCode: 1,
          executionTimeMs,
          status: "error",
          statusMessage: "Toolchain Not Found",
          timestamp: new Date().toISOString(),
          language: "python",
        };
      }

      const scriptPath = path.join(tmpDir, "main.py");
      await fs.writeFile(scriptPath, code, "utf-8");

      const execRes = await runSpawnedProcess(pythonBin, ["-u", "main.py"], tmpDir, stdin);
      const executionTimeMs = Date.now() - startTime;

      if (execRes.isNotFound) {
        return {
          stdout: "",
          stderr: `Local Python interpreter (${pythonBin}) could not be spawned (ENOENT).`,
          exitCode: 1,
          executionTimeMs,
          status: "error",
          statusMessage: "Toolchain Not Found",
          timestamp: new Date().toISOString(),
          language: "python",
        };
      }

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
      const javacBin = getJavacBin();
      const javaBin = getJavaBin();

      if (!javacBin || !javaBin) {
        const executionTimeMs = Date.now() - startTime;
        return {
          stdout: "",
          stderr: "Local Java Development Kit (javac/java) is not installed on this server.",
          compile_output: "javac compiler binary not found.",
          exitCode: 1,
          executionTimeMs,
          status: "compilation_error",
          statusMessage: "Toolchain Not Found",
          timestamp: new Date().toISOString(),
          language: "java",
        };
      }

      // Find class name or default to Main
      const publicClassMatch = code.match(/\bpublic\s+class\s+([A-Za-z0-9_]+)/);
      const anyClassMatch = code.match(/\bclass\s+([A-Za-z0-9_]+)/);
      const className = (publicClassMatch && publicClassMatch[1]) || (anyClassMatch && anyClassMatch[1]) || "Main";
      const sourcePath = path.join(tmpDir, `${className}.java`);
      await fs.writeFile(sourcePath, code, "utf-8");

      // 1. Compile with javac
      const compileRes = await runSpawnedProcess(javacBin, [path.basename(sourcePath)], tmpDir, "", 6000);

      if (compileRes.isNotFound) {
        const executionTimeMs = Date.now() - startTime;
        return {
          stdout: "",
          stderr: `Local Java compiler (${javacBin}) could not be spawned (ENOENT).`,
          compile_output: `spawn ${javacBin} ENOENT`,
          exitCode: 1,
          executionTimeMs,
          status: "compilation_error",
          statusMessage: "Toolchain Not Found",
          timestamp: new Date().toISOString(),
          language: "java",
        };
      }

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
        javaBin,
        ["-Xmx256m", "-cp", ".", className],
        tmpDir,
        stdin
      );
      const executionTimeMs = Date.now() - startTime;

      if (execRes.isNotFound) {
        return {
          stdout: "",
          stderr: `Local Java runtime (${javaBin}) could not be spawned (ENOENT).`,
          exitCode: 1,
          executionTimeMs,
          status: "runtime_error",
          statusMessage: "Toolchain Not Found",
          timestamp: new Date().toISOString(),
          language: "java",
        };
      }

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
      const gccBin = getGccBin();
      if (!gccBin) {
        const executionTimeMs = Date.now() - startTime;
        return {
          stdout: "",
          stderr: "Local C compiler (gcc) is not installed on this server.",
          compile_output: "gcc compiler binary not found.",
          exitCode: 1,
          executionTimeMs,
          status: "compilation_error",
          statusMessage: "Toolchain Not Found",
          timestamp: new Date().toISOString(),
          language: "c",
        };
      }

      const sourcePath = path.join(tmpDir, "main.c");
      const binPath = path.join(tmpDir, "main");
      await fs.writeFile(sourcePath, code, "utf-8");

      // 1. Compile with gcc
      const compileRes = await runSpawnedProcess(
        gccBin,
        ["-O2", "-std=c17", "main.c", "-o", "main", "-lm"],
        tmpDir,
        "",
        6000
      );

      if (compileRes.isNotFound) {
        const executionTimeMs = Date.now() - startTime;
        return {
          stdout: "",
          stderr: `Local C compiler (${gccBin}) could not be spawned (ENOENT).`,
          compile_output: `spawn ${gccBin} ENOENT`,
          exitCode: 1,
          executionTimeMs,
          status: "compilation_error",
          statusMessage: "Toolchain Not Found",
          timestamp: new Date().toISOString(),
          language: "c",
        };
      }

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
    const gppBin = getGppBin();
    if (!gppBin) {
      const executionTimeMs = Date.now() - startTime;
      return {
        stdout: "",
        stderr: "Local C++ compiler (g++) is not installed on this server.",
        compile_output: "g++ compiler binary not found.",
        exitCode: 1,
        executionTimeMs,
        status: "compilation_error",
        statusMessage: "Toolchain Not Found",
        timestamp: new Date().toISOString(),
        language: "cpp",
      };
    }

    const sourcePath = path.join(tmpDir, "main.cpp");
    const binPath = path.join(tmpDir, "main");
    await fs.writeFile(sourcePath, code, "utf-8");

    // 1. Compile with g++
    const compileRes = await runSpawnedProcess(
      gppBin,
      ["-O2", "-std=c++20", "main.cpp", "-o", "main", "-lm"],
      tmpDir,
      "",
      6000
    );

    if (compileRes.isNotFound) {
      const executionTimeMs = Date.now() - startTime;
      return {
        stdout: "",
        stderr: `Local C++ compiler (${gppBin}) could not be spawned (ENOENT).`,
        compile_output: `spawn ${gppBin} ENOENT`,
        exitCode: 1,
        executionTimeMs,
        status: "compilation_error",
        statusMessage: "Toolchain Not Found",
        timestamp: new Date().toISOString(),
        language: "cpp",
      };
    }

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

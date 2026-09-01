import type { CppExecutionResult } from "../compiler.types";

/**
 * Validates C++ source before dispatching to compiler sandboxes.
 */
export function validateCppSource(code: string): CppExecutionResult | null {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      stdout: "",
      stderr: "main.cpp: error: empty input source file.",
      compile_output: "Compilation failed: No source code provided.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Empty file",
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}


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

  // 1. Check for unbalanced curly braces
  let openBraces = 0;
  let inString = false;
  let inChar = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const nextChar = trimmed[i + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && nextChar === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (char === "\\" && nextChar) {
        i++;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (inChar) {
      if (char === "\\" && nextChar) {
        i++;
      } else if (char === "'") {
        inChar = false;
      }
      continue;
    }

    if (char === "/" && nextChar === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (char === "/" && nextChar === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "'") {
      inChar = true;
      continue;
    }

    if (char === "{") {
      openBraces++;
    } else if (char === "}") {
      openBraces--;
    }
  }

  if (openBraces !== 0) {
    return {
      stdout: "",
      stderr: "main.cpp: error: expected '}' at end of input (unbalanced curly braces).",
      compile_output: "Compilation failed: Unbalanced curly braces detected.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Unbalanced curly braces",
      timestamp: new Date().toISOString(),
    };
  }

  // 2. Check for main function presence
  const hasMain = /\b(?:int|void|auto)\s+main\s*\(/.test(trimmed) || /\bmain\s*\(/.test(trimmed);
  if (!hasMain) {
    return {
      stdout: "",
      stderr: "main.cpp: error: undefined reference to 'main' (missing main function).",
      compile_output: "Compilation failed: Missing main function entrypoint.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Missing main function",
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}


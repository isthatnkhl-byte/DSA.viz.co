import type { CompilerExecutionResult, SupportedLanguage } from "../compiler.types";

/**
 * Checks for balanced curly braces in C-family languages (C, C++, Java),
 * ignoring characters inside strings, character literals, and comments.
 */
function checkBalancedCurlyBraces(code: string, fileName: string): CompilerExecutionResult | null {
  let openBraces = 0;
  let inString = false;
  let inChar = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];

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
      if (openBraces < 0) {
        return {
          stdout: "",
          stderr: `${fileName}: error: unmatched '}' at character ${i + 1}.`,
          compile_output: "Compilation failed: Unbalanced curly braces detected.",
          exitCode: 1,
          status: "compilation_error",
          statusMessage: "Compilation Error: Unbalanced curly braces",
          timestamp: new Date().toISOString(),
        };
      }
    }
  }

  if (openBraces !== 0) {
    return {
      stdout: "",
      stderr: `${fileName}: error: expected '}' at end of input (unbalanced curly braces).`,
      compile_output: "Compilation failed: Unbalanced curly braces detected.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Unbalanced curly braces",
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Validates C++ source before dispatching to compiler sandboxes.
 */
export function validateCppSource(code: string): CompilerExecutionResult | null {
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
      language: "cpp",
    };
  }

  const braceErr = checkBalancedCurlyBraces(trimmed, "main.cpp");
  if (braceErr) {
    return { ...braceErr, language: "cpp" };
  }

  // Check for main function presence
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
      language: "cpp",
    };
  }

  return null;
}

/**
 * Validates C source before dispatching to compiler sandboxes.
 */
export function validateCSource(code: string): CompilerExecutionResult | null {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      stdout: "",
      stderr: "main.c: error: empty input source file.",
      compile_output: "Compilation failed: No source code provided.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Empty file",
      timestamp: new Date().toISOString(),
      language: "c",
    };
  }

  const braceErr = checkBalancedCurlyBraces(trimmed, "main.c");
  if (braceErr) {
    return { ...braceErr, language: "c" };
  }

  // Check for main function presence in C
  const hasMain = /\b(?:int|void)\s+main\s*\(/.test(trimmed) || /\bmain\s*\(/.test(trimmed);
  if (!hasMain) {
    return {
      stdout: "",
      stderr: "main.c: error: undefined reference to 'main' (missing main function).",
      compile_output: "Compilation failed: Missing main function entrypoint in C source.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Missing main function",
      timestamp: new Date().toISOString(),
      language: "c",
    };
  }

  return null;
}

/**
 * Validates Java source before dispatching to compiler sandboxes.
 */
export function validateJavaSource(code: string): CompilerExecutionResult | null {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      stdout: "",
      stderr: "Main.java: error: empty input source file.",
      compile_output: "Compilation failed: No source code provided.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Empty file",
      timestamp: new Date().toISOString(),
      language: "java",
    };
  }

  const braceErr = checkBalancedCurlyBraces(trimmed, "Main.java");
  if (braceErr) {
    return { ...braceErr, language: "java" };
  }

  // Check for class declaration
  const hasClass = /\bclass\s+[A-Za-z0-9_]+/.test(trimmed);
  if (!hasClass) {
    return {
      stdout: "",
      stderr: "Main.java: error: class, interface, enum, or record expected.",
      compile_output: "Compilation failed: Missing class declaration in Java source.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Missing class declaration",
      timestamp: new Date().toISOString(),
      language: "java",
    };
  }

  // Check for main method in Java
  const hasMainMethod =
    /\bpublic\s+static\s+void\s+main\s*\(\s*String\s*(\[\s*\]\s*[A-Za-z0-9_]+|[A-Za-z0-9_]+\s*\[\s*\]|\.\.\.\s*[A-Za-z0-9_]+)/.test(
      trimmed
    ) || /\bstatic\s+void\s+main\s*\(/.test(trimmed);

  if (!hasMainMethod) {
    return {
      stdout: "",
      stderr:
        "Main.java: error: Main method not found in class, please define the main method as:\n   public static void main(String[] args)",
      compile_output:
        "Compilation failed: Missing 'public static void main(String[] args)' entrypoint.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Missing main method",
      timestamp: new Date().toISOString(),
      language: "java",
    };
  }

  return null;
}

/**
 * Validates Python source before dispatching to Python runner.
 */
export function validatePythonSource(code: string): CompilerExecutionResult | null {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      stdout: "",
      stderr: "main.py: error: empty input source file.",
      compile_output: "Execution failed: No source code provided.",
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Compilation Error: Empty file",
      timestamp: new Date().toISOString(),
      language: "python",
    };
  }

  // Check for balanced brackets (), [], {} while ignoring strings and comments
  const stack: string[] = [];
  const bracketPairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTripleSingle = false;
  let inTripleDouble = false;
  let inComment = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const nextChar = trimmed[i + 1];
    const next2 = trimmed[i + 2];

    if (inComment) {
      if (char === "\n") inComment = false;
      continue;
    }

    if (inTripleDouble) {
      if (char === '"' && nextChar === '"' && next2 === '"') {
        inTripleDouble = false;
        i += 2;
      }
      continue;
    }

    if (inTripleSingle) {
      if (char === "'" && nextChar === "'" && next2 === "'") {
        inTripleSingle = false;
        i += 2;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (char === "\\" && nextChar) {
        i++;
      } else if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (inSingleQuote) {
      if (char === "\\" && nextChar) {
        i++;
      } else if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    // Check comment
    if (char === "#") {
      inComment = true;
      continue;
    }

    // Check triple quotes
    if (char === '"' && nextChar === '"' && next2 === '"') {
      inTripleDouble = true;
      i += 2;
      continue;
    }
    if (char === "'" && nextChar === "'" && next2 === "'") {
      inTripleSingle = true;
      i += 2;
      continue;
    }

    // Check single/double quotes
    if (char === '"') {
      inDoubleQuote = true;
      continue;
    }
    if (char === "'") {
      inSingleQuote = true;
      continue;
    }

    // Check brackets
    if (char === "(" || char === "[" || char === "{") {
      stack.push(char);
    } else if (char === ")" || char === "]" || char === "}") {
      const last = stack.pop();
      if (last !== bracketPairs[char]) {
        return {
          stdout: "",
          stderr: `main.py: SyntaxError: unmatched closing bracket '${char}' at line ${
            trimmed.slice(0, i).split("\n").length
          }`,
          compile_output: `SyntaxError: unmatched '${char}'.`,
          exitCode: 1,
          status: "compilation_error",
          statusMessage: "Syntax Error: Unmatched bracket",
          timestamp: new Date().toISOString(),
          language: "python",
        };
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return {
      stdout: "",
      stderr: `main.py: SyntaxError: unclosed bracket '${unclosed}' at end of file.`,
      compile_output: `SyntaxError: unclosed bracket '${unclosed}'.`,
      exitCode: 1,
      status: "compilation_error",
      statusMessage: "Syntax Error: Unclosed bracket",
      timestamp: new Date().toISOString(),
      language: "python",
    };
  }

  return null;
}

/**
 * Unified static validation entrypoint across all supported languages.
 */
export function validateSource(
  code: string,
  language: SupportedLanguage = "cpp"
): CompilerExecutionResult | null {
  switch (language) {
    case "c":
      return validateCSource(code);
    case "java":
      return validateJavaSource(code);
    case "python":
      return validatePythonSource(code);
    case "cpp":
    default:
      return validateCppSource(code);
  }
}


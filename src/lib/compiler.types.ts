export interface CppExecutionRequest {
  code: string;
  stdin?: string;
  compilerVersion?: string; // e.g. "gcc-10.2.0" or "g++-17"
}

export interface CppExecutionResult {
  stdout: string;
  stderr: string;
  compile_output?: string;
  exitCode: number;
  executionTimeMs?: number;
  memoryKb?: number;
  status: "success" | "compilation_error" | "runtime_error" | "timeout" | "error";
  statusMessage?: string;
  timestamp: string;
}

export interface CppTemplate {
  id: string;
  title: string;
  category:
    | "Basics"
    | "Arrays & Pointers"
    | "Data Structures"
    | "Trees & Graphs"
    | "Dynamic Programming"
    | "Algorithms";
  description: string;
  code: string;
  defaultStdin: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface CppHeaderDoc {
  name: string;
  include: string;
  description: string;
  commonFunctions: { name: string; signature: string; desc: string }[];
  exampleSnippet: string;
  dsaUseCases: string[];
}

export type EditorTheme =
  | "system"
  | "paper-light"
  | "github-light"
  | "solarized-light"
  | "dark-studio"
  | "cyber-neon"
  | "dracula"
  | "monokai"
  | "github-dark"
  | "nord";

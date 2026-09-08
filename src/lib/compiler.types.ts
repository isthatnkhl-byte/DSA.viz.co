export type SupportedLanguage = "cpp" | "c" | "java" | "python";

export interface CompilerExecutionRequest {
  code: string;
  stdin?: string;
  language?: SupportedLanguage;
  compilerVersion?: string; // e.g. "gcc-14.1" or "openjdk-25" or "python-3.12"
}

export type CppExecutionRequest = CompilerExecutionRequest;

export interface CompilerExecutionResult {
  stdout: string;
  stderr: string;
  compile_output?: string;
  exitCode: number;
  executionTimeMs?: number;
  memoryKb?: number;
  status: "success" | "compilation_error" | "runtime_error" | "timeout" | "error";
  statusMessage?: string;
  timestamp: string;
  language?: SupportedLanguage;
}

export type CppExecutionResult = CompilerExecutionResult;

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
  language?: SupportedLanguage;
}

export type CompilerTemplate = CppTemplate;

export interface CppHeaderDoc {
  name: string;
  include: string;
  description: string;
  commonFunctions: { name: string; signature: string; desc: string }[];
  exampleSnippet: string;
  dsaUseCases: string[];
  language?: SupportedLanguage;
}

export type CompilerPackageDoc = CppHeaderDoc;

export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  label: string;
  version: string;
  extension: string;
  monacoLang: string;
  prismLang: string;
  defaultTitleSlug: string;
  storageCodeKey: string;
  storageStdinKey: string;
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


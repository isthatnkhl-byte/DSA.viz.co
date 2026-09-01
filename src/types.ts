export interface ProblemSummary {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  companies: string[];
  freq: number;
  pattern: string;
  description: string;
  standardInput: string;
  complexInput: string;
  edgeCaseInput: string;
}

export interface CppHeaderInfo {
  header: string;
  category: string;
  description: string;
  commonFunctions: Array<{
    name: string;
    signature: string;
    complexity: string;
    description: string;
  }>;
  codeSnippet: string;
}

export interface VisualizerStep {
  line: number;
  explanation: string;
  array?: (number | string)[];
  pointers?: Record<string, number | null>;
  matrix?: (number | string)[][];
  activeCell?: [number, number] | null;
  visitedCells?: string[];
  stack?: (number | string)[];
  map?: Record<string, any>;
  activeNodeId?: number | string | null;
  highlightedIndices?: number[];
  variables?: Record<string, string | number | boolean>;
}

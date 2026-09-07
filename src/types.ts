import type { VizStep, VizType, ShiftInfo, TestDataset } from "./lib/problems";

export type { VizStep, VizType, ShiftInfo, TestDataset };

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

/**
 * VisualizerStep extends canonical VizStep for complete backward-compatibility
 * with any code expecting legacy fields like explanation, activeCell, etc.
 */
export interface VisualizerStep extends Partial<VizStep> {
  line: number;
  explanation?: string;
  desc?: string;
  array?: (number | string)[] | null;
  secondaryArray?: (number | string)[] | null;
  pointers?: Record<string, number | null>;
  matrix?: (number | string)[][] | null;
  activeCell?: [number, number] | null;
  visitedCells?: string[];
  stack?: (number | string)[] | null;
  secondaryStack?: (number | string)[] | null;
  queue?: (number | string)[] | null;
  secondaryQueue?: (number | string)[] | null;
  map?: Record<string, any> | null;
  activeNodeId?: number | string | null;
  highlightedIndices?: number[];
  variables?: Record<string, any> | null;
}


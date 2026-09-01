# DSA.viz RPC & API Reference

All backend interactions are executed via type-safe TanStack Start server functions (`createServerFn`). Below is the formal specification for all exposed interfaces.

---

## 1. `reviewPseudocode`

Evaluates user pseudocode for algorithmic correctness, asymptotic bounds, and edge case vulnerabilities.

- **RPC Method:** `POST /_serverFn/reviewPseudocode`
- **Authentication:** Optional (Guest mode supported; Supabase JWT attached if authenticated)

### Request Payload:
```typescript
interface ReviewRequest {
  slug: string;
  code: string;
  language: "pseudocode" | "cpp" | "python" | "java" | "javascript" | "go" | "rust";
  datasetIndex: number; // 0: Standard, 1: Long Trace, 2: Edge Case
}
```

### Response Payload:
```typescript
interface ReviewResponse {
  verdict: "OPTIMAL" | "SUBOPTIMAL" | "INCORRECT" | "SYNTAX_ERROR";
  score: number; // 0 - 100
  timeComplexity: string; // e.g., "O(N log N)"
  spaceComplexity: string; // e.g., "O(N)"
  faangBarAnalysis: {
    correctness: string;
    efficiency: string;
    codeStyle: string;
    interviewRating: "Strong Hire" | "Hire" | "Leaning Hire" | "No Hire";
  };
  critique: string;
  suggestions: string[];
  testCases: Array<{
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
  }>;
}
```

---

## 2. `generateDatasetViz`

Generates structured step-by-step state animations for the specified dataset.

- **RPC Method:** `POST /_serverFn/generateDatasetViz`

### Request Payload:
```typescript
interface VizRequest {
  slug: string;
  code: string;
  datasetIndex: number;
}
```

### Response Payload:
```typescript
interface VizResponse {
  type: "array" | "matrix" | "tree" | "stack" | "linkedlist" | "hashmap" | "dptable";
  initialState: any;
  steps: Array<{
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
  }>;
  stats: {
    totalSteps: number;
    executionTimeMs: number;
    source: "gemini-3.7-flash" | "deterministic-simulator";
  };
}
```

---

## 3. `executeCppCode`

Executes C++ code within a secure sandboxed environment with compiler flag configuration.

- **RPC Method:** `POST /_serverFn/executeCppCode`

### Request Payload:
```typescript
interface CppExecuteRequest {
  code: string;
  stdin?: string;
  compilerFlags?: string[]; // e.g., ["-O2", "-std=c++20"]
  backend?: "piston" | "wandbox";
}
```

### Response Payload:
```typescript
interface CppExecuteResponse {
  status: "success" | "compilation_error" | "runtime_error" | "timeout";
  stdout: string;
  stderr: string;
  exitCode: number;
  cpuTimeMs: number;
  memoryKb: number;
  compilerWarnings?: string;
}
```

/**
 * Multi-Language Code Generation, Line-Mapping, and Step Explanation Engine.
 * Supports C++, Python, TypeScript, Java, and structured Pseudocode with synchronized line highlights.
 */

export type SupportedLanguage = "cpp" | "python" | "typescript" | "java" | "pseudocode";

export interface LanguageOption {
  id: SupportedLanguage;
  name: string;
  badge: string;
  extension: string;
  prismLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: "cpp", name: "C++", badge: "C++", extension: ".cpp", prismLang: "cpp" },
  { id: "python", name: "Python", badge: "PY", extension: ".py", prismLang: "python" },
  { id: "typescript", name: "TypeScript", badge: "TS", extension: ".ts", prismLang: "typescript" },
  { id: "java", name: "Java", badge: "JAVA", extension: ".java", prismLang: "java" },
  { id: "pseudocode", name: "Pseudocode", badge: "PSEUDO", extension: ".txt", prismLang: "text" },
];

export interface LineExplanation {
  title: string;
  invariant?: string;
  complexity?: string;
  rationale: string;
}

export interface MultiLanguageBundle {
  language: SupportedLanguage;
  lines: string[];
  /** Maps base line index to target language line index */
  lineToTargetLine: Record<number, number>;
  /** Line-level educational explanation */
  explanations: Record<number, LineExplanation>;
  fullImplementation?: string;
}

/**
 * Detects the programming language of a given code snippet or array of lines.
 */
export function detectLanguageFromCode(code: string | string[]): SupportedLanguage {
  const text = Array.isArray(code) ? code.join("\n") : code;
  if (!text || !text.trim()) return "cpp";

  // C++ Strong Markers
  if (
    /#include\b|std::|\bvector\s*<|\bunordered_map\b|\bunordered_set\b|\bnullptr\b|\bauto\b\s+[a-zA-Z0-9_]+\s*=|\bint\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{?|\bvoid\s+[a-zA-Z0-9_]+\s*\(|\bbool\s+[a-zA-Z0-9_]+\s*\(|->\s*|cout\b|cin\b|\bpush_back\b|\bpop_back\b|\bclass\s+Solution\b|\bpublic:\s*|&[a-zA-Z_]\w*\b/i.test(
      text,
    )
  ) {
    return "cpp";
  }

  // Java Strong Markers
  if (
    /\bpublic\s+(?:static\s+)?(?:int|void|boolean|String|List|int\[\]|long)\b|\bprivate\s+|\bprotected\s+|\bnew\s+ArrayList\b|\bnew\s+HashMap\b|\bnew\s+HashSet\b|\bSystem\.out\.print|\bList<|\bMap<|\bSet</.test(
      text,
    )
  ) {
    return "java";
  }

  // TypeScript / JavaScript Strong Markers
  if (
    /\bconst\s+[a-zA-Z0-9_]+\s*[:=]|\blet\s+[a-zA-Z0-9_]+\s*[:=]|\bfunction\s+[a-zA-Z0-9_]+\s*\(|\bnew\s+Map\(|\bnew\s+Set\(|:\s*(?:number|string|boolean|number\[\])\b|=>/.test(
      text,
    )
  ) {
    return "typescript";
  }

  // Python Strong Markers
  if (
    /\bdef\s+[a-zA-Z0-9_]+\s*\([^)]*\):|\belif\b|\bself\b|\bNone\b|\bTrue\b|\bFalse\b|\bin\s+range\(|\bfor\s+[a-zA-Z0-9_]+\s+in\b|:\s*$/m.test(
      text,
    )
  ) {
    return "python";
  }

  return "pseudocode";
}

/**
 * Heuristically generates educational annotations for standard algorithm lines
 */
export function getLineExplanation(lineText: string, lineIdx: number): LineExplanation {
  const t = lineText.trim().toLowerCase();

  if (/while\s+left\s*[<=<]\s*right|while\s+l\s*[<=<]\s*r/.test(t)) {
    return {
      title: "Two-Pointer / Binary Search Invariant",
      invariant: "Search space is guaranteed valid while left ≤ right",
      complexity: "O(1) condition check per iteration",
      rationale: "Ensures the search range is non-empty before computing the next midpoint or pointer shift.",
    };
  }

  if (/mid\s*=|m\s*=\s*\(|left\s*\+\s*\(right\s*-\s*left\)/.test(t)) {
    return {
      title: "Midpoint Calculation",
      invariant: "Midpoint lies strictly within [left, right]",
      complexity: "O(1) arithmetic",
      rationale: "Uses left + (right - left) / 2 to prevent integer overflow in bounded type languages like Java/C++.",
    };
  }

  if (/if\s+.*target|==\s*target|target\s*==/.test(t)) {
    return {
      title: "Target Match Invariant",
      invariant: "Target element located at current search probe",
      complexity: "O(1) equality test",
      rationale: "Checks whether the current probe value equals the target key; returns immediate success on match.",
    };
  }

  if (/right\s*=\s*mid\s*-\s*1|left\s*=\s*mid\s*\+\s*1/.test(t)) {
    return {
      title: "Search Space Bisection",
      invariant: "Halves the remaining candidate elements",
      complexity: "O(1) pointer adjustment",
      rationale: "Because the collection is monotonically sorted, we discard the half that cannot contain target.",
    };
  }

  if (/dfs\s*\(|bfs\s*\(|traverse|explore/.test(t)) {
    return {
      title: "Recursive Flood-Fill / Grid Traversal",
      invariant: "Explores 4-directional connected components and boundary constraints",
      complexity: "O(1) branch invocation per neighboring cell",
      rationale: "Visits adjacent coordinate neighbors (r ± 1, c ± 1) to compute contiguous island area.",
    };
  }

  if (/visited\.add|visited\.insert|visited\.push|grid\[r\]\[c\]\s*=\s*0/.test(t)) {
    return {
      title: "Visited Marking / Cycle Prevention",
      invariant: "Marks cell as visited to guarantee termination and prevent infinite loops",
      complexity: "O(1) insertion / mutation",
      rationale: "Ensures each connected cell is counted exactly once into the island component.",
    };
  }

  if (/stack\.append|stack\.push|push\(|\.push_back\(/.test(t)) {
    return {
      title: "LIFO State Push",
      invariant: "Top of stack stores the most recent active element/index",
      complexity: "O(1) amortized insertion",
      rationale: "Maintains unresolved elements or establishes monotonic ordering constraints.",
    };
  }

  if (/stack\.pop|pop\(|\.pop_back\(/.test(t)) {
    return {
      title: "LIFO State Eviction",
      invariant: "Popped item resolves previous boundary condition",
      complexity: "O(1) removal",
      rationale: "Clears satisfied items (e.g. matching parentheses or elements smaller than current in monotonic stack).",
    };
  }

  if (/hash_map|seen|lookup|dict|map\[|map\.get|map\.has|unordered_map/.test(t)) {
    return {
      title: "Hash Table Invariant",
      invariant: "Constant-time O(1) key-value memoization",
      complexity: "O(1) average lookup/insertion",
      rationale: "Trades space for time to achieve instantaneous complement or frequency queries.",
    };
  }

  if (/heapq\.heappush|heappush|PriorityQueue|\.push\(.*pq\)|offer\(/.test(t)) {
    return {
      title: "Priority Queue / Heap Insertion",
      invariant: "Maintains heap property (min/max ordered)",
      complexity: "O(log k) logarithmic insertion",
      rationale: "Dynamically inserts the element while restructuring the tree to keep the extremum at the root.",
    };
  }

  if (/heapq\.heappop|heappop|poll\(/.test(t)) {
    return {
      title: "Priority Queue / Heap Extraction",
      invariant: "Extracts current global extremum element",
      complexity: "O(log k) logarithmic extraction",
      rationale: "Removes and returns the minimum or maximum element, then restores the heap invariant.",
    };
  }

  if (/\.next|->next/.test(t)) {
    return {
      title: "Linked List Traversal / Pointer Mutation",
      invariant: "Node structural relationships are preserved or safely mutated",
      complexity: "O(1) reference reassignment",
      rationale: "Updates memory references to traverse the chain or rewire nodes directly in place.",
    };
  }

  if (/\.left|\.right|->left|->right/.test(t)) {
    return {
      title: "Binary Tree Branch Traversal",
      invariant: "Recursively partitions tree into left and right subproblems",
      complexity: "O(1) pointer dereference",
      rationale: "Explores structural child nodes to compute depths, structural equality, or search paths.",
    };
  }

  if (/queue\.append|queue\.push|\.offer\(|\.add\(/.test(t) && !/stack/.test(t)) {
    return {
      title: "Queue Enqueue (BFS)",
      invariant: "Maintains First-In-First-Out (FIFO) processing order",
      complexity: "O(1) amortized insertion",
      rationale: "Schedules the node or state for exploration in the next breadth-wise tier.",
    };
  }

  if (/queue\.popleft|queue\.shift|\.poll\(/.test(t)) {
    return {
      title: "Queue Dequeue (BFS)",
      invariant: "Processes oldest undiscovered element first",
      complexity: "O(1) removal",
      rationale: "Pops the front element to process its neighbors layer-by-layer outwards.",
    };
  }

  if (/left\s*\+=\s*1|right\s*-=\s*1|l\s*\+\+|r\s*--|\+\+left|--right/.test(t)) {
    return {
      title: "Two-Pointer Convergence",
      invariant: "Monotonically narrows the candidate window",
      complexity: "O(1) arithmetic",
      rationale: "Steps the boundaries inward to exhaustively search or prune remaining sub-arrays.",
    };
  }

  if (/dp\[|memo\[|table\[/.test(t)) {
    return {
      title: "Dynamic Programming Memoization",
      invariant: "Subproblem state is stored to prevent overlapping recomputation",
      complexity: "O(1) state read/write",
      rationale: "Constructs optimal solution bottom-up using optimal substructure recurrence relations.",
    };
  }

  if (/queue\.append|queue\.push|deque|queue\.popleft|queue\.shift/.test(t)) {
    return {
      title: "FIFO Level-Order Traversal",
      invariant: "Nodes processed in strictly ascending breadth/distance order",
      complexity: "O(1) enqueue/dequeue",
      rationale: "Guarantees shortest unweighted path exploration in BFS algorithms.",
    };
  }

  if (/for\s+.*\(|for\s+right\s+in|for\s+i\s+in|for\s+x\s+in|for\s*\(int/.test(t)) {
    return {
      title: "Linear Traversal Loop",
      invariant: "Processes each element sequentially exactly once",
      complexity: "Executes N times (O(N) total)",
      rationale: "Standard iteration expanding sliding window or scanning 2D grid dimensions.",
    };
  }

  if (/return\s+/.test(t)) {
    return {
      title: "Termination & Result Return",
      invariant: "Final post-condition satisfied",
      complexity: "O(1) return",
      rationale: "Returns optimal computed state or sentinel (-1/null) if no solution found.",
    };
  }

  return {
    title: `Step Logic (Line ${lineIdx + 1})`,
    complexity: "O(1) step execution",
    rationale: lineText.trim() ? `Executes ${lineText.trim()} to maintain algorithm state invariants.` : "Algorithmic execution step.",
  };
}

/**
 * Translates base code lines into target language with accurate 1-to-1 line mapping
 */
export function getMultiLanguageCode(
  baseLines: string[],
  targetLang: SupportedLanguage,
  sourceLangHint?: SupportedLanguage,
): MultiLanguageBundle {
  const safeBase = baseLines.length > 0 ? baseLines : ["// Algorithm Trace", "return 0;"];
  const detectedSource = sourceLangHint || detectLanguageFromCode(safeBase);

  // If source matches target, return base directly with 1-to-1 mapping
  if (detectedSource === targetLang || (targetLang === "pseudocode" && detectedSource === "pseudocode")) {
    const lineToTargetLine: Record<number, number> = {};
    const explanations: Record<number, LineExplanation> = {};
    safeBase.forEach((line, idx) => {
      lineToTargetLine[idx] = idx;
      explanations[idx] = getLineExplanation(line, idx);
    });
    return {
      language: targetLang,
      lines: safeBase,
      lineToTargetLine,
      explanations,
    };
  }

  const translatedLines: string[] = [];
  const lineToTargetLine: Record<number, number> = {};
  const explanations: Record<number, LineExplanation> = {};

  // Case 1: Target is C++
  if (targetLang === "cpp") {
    safeBase.forEach((line, baseIdx) => {
      const targetIdx = translatedLines.length;
      lineToTargetLine[baseIdx] = targetIdx;

      let cppLine = line
        .replace(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/, "int $1($2) {")
        .replace(/class\s+([a-zA-Z0-9_]+):/, "class $1 {")
        .replace(/self\./g, "this->")
        .replace(/\bNone\b/g, "nullptr")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/\band\b/g, "&&")
        .replace(/\bor\b/g, "||")
        .replace(/\bnot\b/g, "!")
        .replace(/len\(([a-zA-Z0-9_.]+)\)/g, "$1.size()")
        .replace(/#\s*(.*)/, "// $1")
        .replace(/(\w+)\.append\((.*)\)/, "$1.push_back($2)")
        .replace(/(\w+)\.pop\(\)/, "$1.pop_back()")
        .replace(/(\w+)\s*=\s*\{\}/g, "unordered_map<int, int> $1;")
        .replace(/(\w+)\s*=\s*\[\]/g, "vector<int> $1;")
        .replace(/(\w+)\s*=\s*set\(\)/g, "unordered_set<string> $1;");

      if (
        cppLine.trim() &&
        !cppLine.trim().endsWith("{") &&
        !cppLine.trim().endsWith("}") &&
        !cppLine.trim().startsWith("//") &&
        !cppLine.trim().endsWith(";") &&
        !cppLine.trim().startsWith("#")
      ) {
        cppLine = `${cppLine};`;
      }

      translatedLines.push(cppLine);
      explanations[targetIdx] = getLineExplanation(line, baseIdx);
    });
  }
  // Case 2: Target is Python
  else if (targetLang === "python") {
    safeBase.forEach((line, baseIdx) => {
      const targetIdx = translatedLines.length;
      lineToTargetLine[baseIdx] = targetIdx;

      let pyLine = line
        .replace(/^\s*#include\b.*$/, "")
        .replace(/^\s*using namespace\b.*$/, "")
        .replace(/int\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{?/, "def $1($2):")
        .replace(/void\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{?/, "def $1($2):")
        .replace(/bool\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{?/, "def $1($2):")
        .replace(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{?/, "def $1($2):")
        .replace(/public\s+(?:int|void|boolean)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{?/, "def $1($2):")
        .replace(/\bvector<vector<int>>&?\s*/g, "")
        .replace(/\bvector<int>&?\s*/g, "")
        .replace(/\bint\[\]\s*/g, "")
        .replace(/\bint\s+/g, "")
        .replace(/\bauto\s+/g, "")
        .replace(/\bconst\s+/g, "")
        .replace(/\blet\s+/g, "")
        .replace(/this->|this\./g, "self.")
        .replace(/\bnullptr\b|\bNULL\b/g, "None")
        .replace(/\btrue\b/g, "True")
        .replace(/\bfalse\b/g, "False")
        .replace(/&&/g, "and")
        .replace(/\|\|/g, "or")
        .replace(/!([a-zA-Z0-9_]+)/g, "not $1")
        .replace(/([a-zA-Z0-9_.]+)\.size\(\)/g, "len($1)")
        .replace(/([a-zA-Z0-9_.]+)\.length/g, "len($1)")
        .replace(/([a-zA-Z0-9_]+)\.push_back\((.*)\)/g, "$1.append($2)")
        .replace(/([a-zA-Z0-9_]+)\.push\((.*)\)/g, "$1.append($2)")
        .replace(/([a-zA-Z0-9_]+)\.pop_back\(\)/g, "$1.pop()")
        .replace(/unordered_map<[^>]+>\s*(\w+);?/g, "$1 = {}")
        .replace(/unordered_set<[^>]+>\s*(\w+);?/g, "$1 = set()")
        .replace(/vector<[^>]+>\s*(\w+);?/g, "$1 = []")
        .replace(/;\s*$/, "")
        .replace(/\/\/\s*(.*)/, "# $1")
        .replace(/\{\s*$/, ":")
        .replace(/\}\s*$/, "");

      if (!pyLine.trim() && line.trim()) {
        pyLine = `# ${line.trim()}`;
      }

      translatedLines.push(pyLine);
      explanations[targetIdx] = getLineExplanation(line, baseIdx);
    });
  }
  // Case 3: Target is TypeScript
  else if (targetLang === "typescript") {
    safeBase.forEach((line, baseIdx) => {
      const targetIdx = translatedLines.length;
      lineToTargetLine[baseIdx] = targetIdx;

      let tsLine = line
        .replace(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/, "function $1($2) {")
        .replace(/class\s+([a-zA-Z0-9_]+):/, "class $1 {")
        .replace(/self\./g, "this.")
        .replace(/\bNone\b/g, "null")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/\band\b/g, "&&")
        .replace(/\bor\b/g, "||")
        .replace(/\bnot\b/g, "!")
        .replace(/len\(([a-zA-Z0-9_.]+)\)/g, "$1.length")
        .replace(/#\s*(.*)/, "// $1")
        .replace(/(\w+)\.append\((.*)\)/, "$1.push($2)")
        .replace(/(\w+)\.push_back\((.*)\)/, "$1.push($2)")
        .replace(/(\w+)\.pop\(\)/, "$1.pop()")
        .replace(/(\w+)\.pop_back\(\)/, "$1.pop()")
        .replace(/(\w+)\.popleft\(\)/, "$1.shift()")
        .replace(/range\(len\(([^)]+)\)\)/g, "0; i < $1.length; i++")
        .replace(/(\w+)\s*=\s*\{\}/g, "const $1 = new Map<any, any>();")
        .replace(/(\w+)\s*=\s*\[\]/g, "const $1: any[] = [];")
        .replace(/(\w+)\s*=\s*set\(\)/g, "const $1 = new Set<any>();");

      if (
        tsLine.trim() &&
        !tsLine.trim().endsWith("{") &&
        !tsLine.trim().endsWith("}") &&
        !tsLine.trim().startsWith("//") &&
        !tsLine.trim().endsWith(";")
      ) {
        tsLine = `${tsLine};`;
      }

      translatedLines.push(tsLine);
      explanations[targetIdx] = getLineExplanation(line, baseIdx);
    });
  }
  // Case 4: Target is Java
  else if (targetLang === "java") {
    safeBase.forEach((line, baseIdx) => {
      const targetIdx = translatedLines.length;
      lineToTargetLine[baseIdx] = targetIdx;

      let javaLine = line
        .replace(/def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/, "public int $1($2) {")
        .replace(/class\s+([a-zA-Z0-9_]+):/, "public class $1 {")
        .replace(/self\./g, "this.")
        .replace(/\bNone\b/g, "null")
        .replace(/\bTrue\b/g, "true")
        .replace(/\bFalse\b/g, "false")
        .replace(/\band\b/g, "&&")
        .replace(/\bor\b/g, "||")
        .replace(/\bnot\b/g, "!")
        .replace(/len\(([a-zA-Z0-9_.]+)\)/g, "$1.length")
        .replace(/#\s*(.*)/, "// $1")
        .replace(/(\w+)\.append\((.*)\)/, "$1.add($2)")
        .replace(/(\w+)\.push_back\((.*)\)/, "$1.add($2)")
        .replace(/(\w+)\.pop\(\)/, "$1.pop()")
        .replace(/(\w+)\.pop_back\(\)/, "$1.pop()")
        .replace(/(\w+)\s*=\s*\{\}/g, "Map<Integer, Integer> $1 = new HashMap<>();")
        .replace(/(\w+)\s*=\s*\[\]/g, "List<Integer> $1 = new ArrayList<>();")
        .replace(/(\w+)\s*=\s*set\(\)/g, "Set<String> $1 = new HashSet<>();");

      if (
        javaLine.trim() &&
        !javaLine.trim().endsWith("{") &&
        !javaLine.trim().endsWith("}") &&
        !javaLine.trim().startsWith("//") &&
        !javaLine.trim().endsWith(";")
      ) {
        javaLine = `${javaLine};`;
      }

      translatedLines.push(javaLine);
      explanations[targetIdx] = getLineExplanation(line, baseIdx);
    });
  }
  // Case 5: Target is Pseudocode
  else {
    safeBase.forEach((line, baseIdx) => {
      const targetIdx = translatedLines.length;
      lineToTargetLine[baseIdx] = targetIdx;

      const pseudoLine = line
        .replace(/^\s*#include\b.*$/, "")
        .replace(/^\s*using namespace\b.*$/, "")
        .replace(/;\s*$/, "")
        .replace(/\{\s*$/, "")
        .replace(/\}\s*$/, "");

      translatedLines.push(pseudoLine.trim() ? pseudoLine : line);
      explanations[targetIdx] = getLineExplanation(line, baseIdx);
    });
  }

  return {
    language: targetLang,
    lines: translatedLines,
    lineToTargetLine,
    explanations,
  };
}


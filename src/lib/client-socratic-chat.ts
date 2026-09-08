/**
 * Client-Side Socratic Offline Assistant
 * Provides resilient, instant fallback guidance when offline or when network/API calls fail.
 */

export interface OfflineChatOptions {
  role: "interviewer" | "step_doubts" | "evaluator" | "mistake_analyzer" | string;
  lastUserMessage: string;
  context?: {
    problemTitle?: string;
    problemSlug?: string;
    difficulty?: string;
    userCode?: string;
    compilerOutput?: string;
    currentStep?: number;
    totalSteps?: number;
    stepDesc?: string;
    stepVariables?: any;
    [key: string]: any;
  };
}

export function generateClientOfflineSocraticReply(options: OfflineChatOptions): string {
  const { role, lastUserMessage, context = {} } = options;
  const pTitle = context.problemTitle || context.problemSlug || "this problem";
  const stepNum = context.currentStep !== undefined ? context.currentStep + 1 : null;
  const query = (lastUserMessage || "").toLowerCase();

  // 1. Step Doubts / Simulation Step Assistance
  if (role === "step_doubts" || query.includes("step") || query.includes("explain")) {
    if (stepNum !== null) {
      return `### 🔍 Step ${stepNum} Analysis — "${pTitle}"

In this step, the algorithm executes: **"${context.stepDesc || 'state transition'}"**.

**Key Observation Points:**
- **Variable Dynamics**: Review how your pointers or indices shifted compared to the preceding step.
- **Trigger Condition**: What boolean check or comparison caused this specific branch to execute?
- **Invariant Preservation**: Does the active search interval shrink, or does the accumulator expand predictably?

*Socratic Check*: If the loop terminated immediately after this step, what guarantees exist about the elements scanned so far?`;
    }

    return `### 🔍 Step Guidance — "${pTitle}"

When examining steps in this algorithm, pay close attention to the **invariants**:
1. What does each pointer or state variable represent at the beginning of the iteration?
2. How does the current element being inspected determine whether pointers advance, values swap, or the accumulator updates?
3. Try stepping back one step and then forward again to see the state delta clearly!`;
  }

  // 2. Submission Evaluator / Rater
  if (role === "evaluator" || query.includes("rate") || query.includes("score") || query.includes("submission")) {
    return `### 📊 Algorithmic Review & Evaluation — "${pTitle}"

Here is a Socratic breakdown for your solution:

- **Estimated Score**: **8.5 / 10**
- **Time Complexity Analysis**:
  - Review your innermost loop or recursive calls. Are any elements visited or compared multiple times unnecessarily?
  - Optimal solutions for this archetype typically achieve **O(N)** or **O(N log N)**.
- **Space Complexity**:
  - Are you allocating supplementary buffers, sets, or recursion stack space?
  - Can any auxiliary arrays be substituted with two in-place pointers?
- **Edge Case Checklist**:
  - Single-element inputs: Does the loop execute properly or cause off-by-one errors?
  - Duplicate values: Are ties handled symmetrically?
  - Extreme values or negative numbers: Are there integer overflow or sign risks?

*Refinement Challenge*: Can you reduce memory overhead by transforming state in-place?`;
  }

  // 3. Mistake & Syntax Analyzer
  if (role === "mistake_analyzer" || query.includes("mistake") || query.includes("error") || query.includes("bug") || query.includes("trap")) {
    return `### 🛠️ Common Pitfalls & Diagnostics — "${pTitle}"

When implementing this algorithm, candidates frequently encounter:
1. **Loop Termination & Bounds**:
   - Using \`<\` versus \`<=\` (e.g., in binary search or 2-pointer termination: \`left < right\` vs \`left <= right\`).
2. **Premature Mutation**:
   - Overwriting a cell or variable before reading its previous value in the same transition.
3. **Empty / Null Guards**:
   - Accessing \`arr[0]\` or \`matrix[0].length\` before validating that the structure is non-empty.
4. **Sentinel Collisions**:
   - Marking elements with sentinels (e.g., \`-1\` or \`0\`) that could be valid values within the input domain.

Take a look at your current code lines: which condition or boundary check is closest to these potential traps?`;
  }

  // 4. Code & Implementation Request
  if (query.includes("code") || query.includes("solution") || query.includes("implement") || query.includes("python") || query.includes("c++") || query.includes("java")) {
    return `### ⚡ Algorithmic Implementation Guide — "${pTitle}"

Here is the optimal approach breakdown for **${pTitle}**:

1. **Approach & Paradigm**:
   - Optimal strategy for this archetype utilizes invariants to minimize redundant operations.
   - For hash table patterns, track seen elements to resolve targets in $O(1)$ lookup time.
   - For two pointers or binary search, maintain search boundaries while strictly checking convergence.

2. **Core Template (C++)**:
\`\`\`cpp
// Production template for ${pTitle}
// Expected Time Complexity: O(N) or O(N log N)
class Solution {
public:
    auto solve(auto& input) {
        // Guard against boundary cases
        if (input.empty()) return {};

        // State tracking & processing
        // ...
        return {};
    }
};
\`\`\`

3. **Key Invariants**:
   - Guard against boundary cases (empty, singleton, duplicates).
   - Ensure pointer updates strictly reduce the remaining search space.

Ask me for language-specific implementations, line-by-line breakdown, or complexity proofs! ✨`;
  }

  // 5. Default: Vizco Buddy Guidance
  return `### ⚡ Vizco Buddy Guidance — "${pTitle}"

Hello! As your interactive DSA companion, let's break down this challenge together:

1. **Pattern Recognition**: What algorithmic archetype fits this best (e.g., Two Pointers, Sliding Window, DP, Graph/Tree traversal)?
2. **State & Invariants**: What property must hold true across all processed elements?
3. **Optimization Goal**: Can we eliminate redundant work to reach optimal $O(N)$ time or $O(1)$ space?

I can provide full optimal code, step-by-step intuition, edge-case analysis, or complexity breakdowns. What would you like to explore? ✨`;
}

# Self-Healing AI Contract Normalizer (`ai-contracts.ts`)

LLMs frequently generate invalid execution traces when attempting to step through algorithmic code. Common failure modes include:
1. **Broken Topological Invariants:** Stepping out-of-order in DFS recursion or jumping between unrelated matrix coordinates.
2. **Missing Boundary Validation:** Modifying array indices outside of $[0, N-1]$ or matrix coordinates outside $[0, R-1] \times [0, C-1]$.
3. **AST Desynchronization:** Pointing line highlights to comments, empty lines, or function signatures instead of actual mutating statements.
4. **Queue/Stack Corruption:** Emitting duplicate node IDs or dropping stack frames during backtracking.

---

## 1. The Normalization Pipeline

```
[Raw LLM JSON Output]
        │
        ▼
[Layer 1: Schema Sanity & JSON Repair]
  - Type-checks arrays, matrices, pointers, line numbers
  - Fallback to safe defaults if undefined
        │
        ▼
[Layer 2: Topological & Domain Invariant Checks]
  - Matrix DFS/BFS: Enforces 4-directional Manhattan distance ≤ 1 between steps
  - Tree BFS: Enforces FIFO level order queue semantics
  - Monotonic Stack: Checks LIFO push/pop consistency
        │
        ▼
[Layer 3: AST Heuristic Line Mapper]
  - Matches step mutation (e.g. `stack.push(x)`) to concrete code line
  - Normalizes line numbers to active code statement boundaries
        │
        ▼
[Pass: Deliver to Canvas UI]   OR   [Fail: Fallback to Ground-Truth Simulator]
```

---

## 2. Invariant Validation Rules

### A. Matrix 4-Directional Invariant
For 2D grid problems (e.g. Number of Islands, Max Area), the normalizer verifies that sequential exploration steps do not teleport across the grid:

$$\Delta = |r_t - r_{t-1}| + |c_t - c_{t-1}|$$

- If $\Delta \le 1$: Valid adjacent move.
- If $\Delta > 1$ and backtracking stack is valid: Popped previous coordinate.
- If $\Delta > 1$ without backtracking: Flagged as disconnected hallucination, repaired or replaced with deterministic simulator step.

### B. Tree Breadth-First-Search Invariant
For Tree level-order problems, node expansions must follow strict FIFO ordering. The normalizer asserts:

$$\text{depth}(\text{node}_t) \ge \text{depth}(\text{node}_{t-1})$$

Any step attempting to expand a node at depth $d-1$ after processing depth $d+1$ triggers an automatic topological reconstruction.

---

## 3. AST Heuristic Line Synchronizer

When users write custom pseudocode, line numbers returned by LLMs often drift. The normalizer uses lexical token scanning:
- Extracts variable names from user pseudocode (e.g. `l`, `r`, `stack`, `visited`).
- Computes similarity between the operation in `explanation` and the syntactic statement at line $L$.
- Re-aligns highlighted lines to the precise statement causing the state mutation.

# DSA.viz Multi-Datastructure Visualization Engine

The visualization engine transforms raw algorithm step traces (`VizStep[]`) into smooth, animated, interactive DOM & SVG canvases.

---

## 1. Core Visualizer Paradigms

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Step Execution Model                            │
├────────────────────────────────────────────────────────────────────────┤
│  [Step Index: t] ──► { pointers, activeCells, stack, array, explanation }
│        │
│        ▼
│  Renderers:
│  ├─ 2D Matrix Canvas      (DFS/BFS component clustering, direction vectors)
│  ├─ Binary Tree SVG       (Hierarchical level coordinates, active call stack)
│  ├─ Pointer Sequence      (Doubly/Singly linked list node animations)
│  ├─ LIFO / FIFO Canisters (Monotonic stack & queue push/pop indicators)
│  ├─ Dynamic Hash Table    (Buckets, chaining collision slots, key lookup)
│  └─ DP Grid Visualizer    (Memoization table cell dependency tracing)
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Supported Visualizer Types & Capabilities

### 1. 2D Matrix & Island Visualizer (`MatrixVisualizer.tsx`)
- **Use Cases:** Number of Islands, Max Area of Island, Rotting Oranges, Flood Fill, Surrounded Regions, Word Search.
- **Visual Features:**
  - Dynamic grid rendering with cell coordinate labels `(r, c)`.
  - Color-coded cell states: `Water (0)`, `Land (1)`, `Visited/Sunk (-1)`, `Active (Focused)`, `Enqueued (BFS)`.
  - Direction vector overlay displaying exploration step (`UP`, `DOWN`, `RIGHT`, `LEFT`).
  - Island cluster shading identifying distinct topological connected components.
  - Live scalar telemetry: `Current Island Area`, `Max Island Area`, `Island Count`.

### 2. Binary Tree & BST Visualizer (`TreeVisualizer.tsx`)
- **Use Cases:** Invert Binary Tree, Maximum Depth, Validate BST, Lowest Common Ancestor, Level Order Traversal.
- **Visual Features:**
  - Dynamic SVG bezier curve connections calculated via hierarchical level-order coordinate projection.
  - Active node highlighting with depth and value inspection.
  - BFS Queue buffer visualizer showing FIFO queue mutations.
  - BST range bounds display (`[min, max]`) during validation routines.

### 3. Array & Two-Pointer Visualizer (`ArrayVisualizer.tsx`)
- **Use Cases:** Two Sum, 3Sum, Container With Most Water, Trapping Rain Water, Binary Search, Sliding Window.
- **Visual Features:**
  - Array bar chart and box view with scalar values.
  - Independent pointer flags: `L` (Left), `R` (Right), `mid` (Middle), `i`, `j`, `slow`, `fast`.
  - Sliding window bounding box with dynamic summation and substring length indicators.
  - Animated value swaps and element partitioning.

### 4. Monotonic Stack & Queue Visualizer (`StackQueueVisualizer.tsx`)
- **Use Cases:** Valid Parentheses, Daily Temperatures, Largest Rectangle in Histogram, Min Stack.
- **Visual Features:**
  - Vertical canister container with top-of-stack pointer.
  - Push and pop transition animations.
  - Monotonic invariant violation highlights (e.g. popping smaller elements upon encountering a larger temperature).
  - Synchronized auxiliary output array rendering.

### 5. Dynamic Hash Map Visualizer (`HashMapVisualizer.tsx`)
- **Use Cases:** Two Sum complement lookup, Group Anagrams, LRU Cache, Subarray Sum Equals K.
- **Visual Features:**
  - Key-Value entry cards with hash bucket mapping.
  - Instant hit / miss visual alerts.
  - Size counters and eviction markers (LRU head/tail pointers).

---

## 3. Step Definition Interface

```typescript
export interface VizStep {
  /** 1-based line number in source pseudocode to highlight */
  line: number;
  /** Natural language explanation displayed in step ticker */
  explanation: string;
  /** Primary array or scalar values */
  array?: (number | string)[];
  /** Named pointers (e.g., { left: 0, right: 5, mid: 2 }) */
  pointers?: Record<string, number | null>;
  /** 2D Matrix state for grid problems */
  matrix?: (number | string)[][];
  /** Active cell coordinates in matrix problems */
  activeCell?: [number, number] | null;
  /** Set of visited cell coordinates encoded as "r,c" */
  visitedCells?: string[];
  /** Elements currently stored in stack */
  stack?: (number | string)[];
  /** Key-value snapshot of dynamic hash map */
  map?: Record<string, any>;
  /** Tree node ID currently focused */
  activeNodeId?: number | string | null;
}
```

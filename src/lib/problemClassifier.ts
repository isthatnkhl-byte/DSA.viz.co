import type { VizType, ProblemDatasetSpec } from "./problems";
import type { Pattern } from "./simulators";

export type ProblemCategory =
  | "graph"
  | "grid-matrix"
  | "tree"
  | "trie"
  | "heap"
  | "linked-list"
  | "stack"
  | "queue"
  | "hashmap"
  | "sliding-window"
  | "two-pointers"
  | "binary-search"
  | "dp-2d"
  | "dp-1d"
  | "intervals"
  | "prefix-sum"
  | "bit-manipulation"
  | "sorting"
  | "array-scan";

export interface ProblemSignature {
  category: ProblemCategory;
  primaryVizType: VizType;
  pattern: Pattern;
  isMultiEntity: boolean;
  algorithmName: string;
}

const normalize = (str = ""): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Robust Meta-Taxonomy Classifier
 * Replaces fragile ad-hoc regex cascades with a structured signature classification
 * that correctly maps any problem in the LeetCode catalog to its appropriate
 * algorithmic pattern, visualizer data structure, and simulation pipeline.
 */
export function classifyProblem(
  slug = "",
  title = "",
  topics: string[] = [],
): ProblemSignature {
  const s = normalize(slug);
  const tStr = (title ? normalize(title) : "").replace(/-/g, " ");
  const topList = (topics ?? []).map((x) => String(x).toLowerCase());
  const topJoined = topList.join(" ");

  const hasTopic = (...names: string[]) =>
    names.some((n) => topList.some((t) => t.includes(n.toLowerCase())));

  // 1. STATE-SPACE BFS (Graph exploration where vertices are dynamic states, e.g. Word Ladder, Mutation, Lock)
  if (
    /word-ladder|minimum-genetic-mutation|open-the-lock|sliding-puzzle/.test(s) ||
    (/ladder|mutation/.test(s) && hasTopic("breadth-first search", "graph"))
  ) {
    return {
      category: "graph",
      primaryVizType: "graph",
      pattern: "word-ladder",
      isMultiEntity: true,
      algorithmName: "State-Space Breadth-First Search (Word/State Mutations)",
    };
  }

  // 2. TOPOLOGICAL SORT & DIRECTED ACYCLIC GRAPHS (DAGs)
  // Exception: course-schedule-iii is Greedy + Priority Queue
  if (
    /course-schedule-iii/.test(s) ||
    (s.includes("course-schedule") && hasTopic("greedy", "heap"))
  ) {
    return {
      category: "heap",
      primaryVizType: "heap",
      pattern: "heap-topk",
      isMultiEntity: false,
      algorithmName: "Greedy Course Scheduling with Max-Heap",
    };
  }
  if (
    /alien-dictionary|alien-order|course-schedule|course-schedule-ii|find-eventual-safe-states|all-ancestors-of-a-node-in-a-directed-acyclic-graph|parallel-courses|sequence-reconstruction|loud-and-rich/.test(
      s,
    ) ||
    hasTopic("topological sort")
  ) {
    return {
      category: "graph",
      primaryVizType: "graph",
      pattern: "topological-sort",
      isMultiEntity: s.includes("alien"),
      algorithmName: "Kahn's Topological Sort (In-Degree & Directed Graph)",
    };
  }

  // 3. UNION-FIND / DISJOINT SET UNION (DSU)
  if (
    /redundant-connection|number-of-provinces|accounts-merge|satisfiability-of-equality|graph-valid-tree|earliest-moment|number-of-operations-to-make-network-connected|longest-consecutive-sequence-dsu/.test(
      s,
    ) ||
    (hasTopic("union-find", "disjoint set") &&
      !hasTopic("matrix", "stack") &&
      !/making-a-large-island|island/.test(s))
  ) {
    return {
      category: "graph",
      primaryVizType: "graph",
      pattern: "union-find",
      isMultiEntity: false,
      algorithmName: "Disjoint Set Union (Union-Find with Path Compression)",
    };
  }

  // 4. GENERAL GRAPH TRAVERSAL & NETWORKS (Bipartite, Network Delay, All Paths, Keys & Rooms)
  if (
    /is-graph-bipartite|all-paths-from-source-to-target|keys-and-rooms|network-delay-time|clone-graph|cheapest-flights|reconstruct-itinerary|number-of-connected-components/.test(
      s,
    ) ||
    (hasTopic("graph", "graph theory") &&
      !hasTopic("tree", "binary tree", "matrix") &&
      !/quad-tree|tree|node-in-a-directed/.test(s))
  ) {
    return {
      category: "graph",
      primaryVizType: "graph",
      pattern: "graph-bfs",
      isMultiEntity: false,
      algorithmName: "Graph Breadth-First & Depth-First Search",
    };
  }

  // 5. 2D GRID & ISLAND FLOOD-FILL / MATRIX EXPLORATION
  if (/quad-tree/.test(s)) {
    return {
      category: "grid-matrix",
      primaryVizType: "matrix",
      pattern: "grid-dfs",
      isMultiEntity: false,
      algorithmName: "QuadTree Matrix Spatial Partitioning (Divide & Conquer)",
    };
  }
  if (/max.*area.*island|area-of-island/.test(s)) {
    return {
      category: "grid-matrix",
      primaryVizType: "matrix",
      pattern: "island-max-area",
      isMultiEntity: false,
      algorithmName: "Max Area Island Flood-Fill (2D Matrix DFS)",
    };
  }
  if (/number-of-islands|count.*island|making-a-large-island/.test(s)) {
    return {
      category: "grid-matrix",
      primaryVizType: "matrix",
      pattern: "island-count",
      isMultiEntity: false,
      algorithmName: "Island Counting & Matrix Connected Components",
    };
  }
  if (
    /rotting-oranges|shortest-path-in-binary-matrix|walls-and-gates|as-far-from-land-as-possible|01-matrix/.test(
      s,
    )
  ) {
    return {
      category: "grid-matrix",
      primaryVizType: "matrix",
      pattern: "grid-bfs",
      isMultiEntity: false,
      algorithmName: "Multi-Source Grid Breadth-First Search",
    };
  }
  if (
    /surrounded-regions|flood-fill|pacific-atlantic|number-of-closed-islands|number-of-enclaves/.test(
      s,
    ) ||
    (hasTopic("matrix") && hasTopic("depth-first search", "breadth-first search") && !hasTopic("dynamic programming"))
  ) {
    return {
      category: "grid-matrix",
      primaryVizType: "matrix",
      pattern: "grid-dfs",
      isMultiEntity: false,
      algorithmName: "2D Grid Boundary & Flood Traversal",
    };
  }

  // 6. 2D DYNAMIC PROGRAMMING (Grid DP, Subsequence Matrices, String Distances)
  if (/longest-common-subsequence|common-subsequence|common-subseq|\blcs\b/.test(s)) {
    return {
      category: "dp-2d",
      primaryVizType: "dp",
      pattern: "lcs",
      isMultiEntity: true,
      algorithmName: "2D Longest Common Subsequence Table",
    };
  }
  if (
    /unique-paths|minimum-path-sum|maximal-square|edit-distance|dungeon-game|triangle|interleaving-string|distinct-subsequences|matrix-chain/.test(
      s,
    ) ||
    (hasTopic("matrix", "2d") && hasTopic("dynamic programming"))
  ) {
    return {
      category: "dp-2d",
      primaryVizType: "dp",
      pattern: "dp-2d",
      isMultiEntity: false,
      algorithmName: "2D Dynamic Programming Grid Optimization",
    };
  }

  // 7. TRIE / PREFIX TREES
  if (
    /implement-trie|trie|prefix-tree|word-dictionary|replace-words|longest-word-in-dictionary|word-search-ii/.test(
      s,
    ) ||
    hasTopic("trie")
  ) {
    return {
      category: "trie",
      primaryVizType: "trie",
      pattern: "trie-insert",
      isMultiEntity: true,
      algorithmName: "Prefix Tree (Trie) Insertion & Search",
    };
  }

  // 8. BINARY SEARCH TREES (BST)
  if (
    /binary-search-tree|search-in-a-binary-search-tree|validate-binary-search-tree|kth-smallest-element-in-a-bst|insert-into-a-binary-search-tree|delete-node-in-a-bst|lowest-common-ancestor-of-a-binary-search-tree|bst\b/.test(
      s,
    ) ||
    hasTopic("binary search tree")
  ) {
    return {
      category: "tree",
      primaryVizType: "bst",
      pattern: "bst-search",
      isMultiEntity: false,
      algorithmName: "Binary Search Tree Validation & Lookup",
    };
  }

  // 9. BINARY TREE BFS (Level order, right view, zigzag)
  if (
    /level-order|zigzag|right-side-view|binary-tree-level|average-of-levels|populating-next-right/.test(
      s,
    ) ||
    (hasTopic("tree", "binary tree") && hasTopic("breadth-first search"))
  ) {
    return {
      category: "tree",
      primaryVizType: "tree",
      pattern: "tree-bfs",
      isMultiEntity: false,
      algorithmName: "Tree Level-Order Traversal (BFS Queue)",
    };
  }

  // 10. BINARY TREE DFS & GENERAL TREES
  if (
    (/invert-binary-tree|maximum-depth-of-binary-tree|same-tree|symmetric-tree|diameter-of-binary-tree|balanced-binary-tree|path-sum|subtree-of-another-tree|binary-tree-maximum-path-sum|construct-binary-tree|flatten-binary-tree|lowest-common-ancestor|count-complete-tree-nodes|binary-tree-preorder|binary-tree-inorder|binary-tree-postorder/.test(
      s,
    ) ||
      hasTopic("binary tree", "tree")) &&
    !/quad-tree/.test(s)
  ) {
    return {
      category: "tree",
      primaryVizType: "tree",
      pattern: "tree-dfs",
      isMultiEntity: false,
      algorithmName: "Binary Tree Depth-First Traversal & Recursion",
    };
  }

  // 11. HASH MAP & SET DATA STRUCTURE DESIGNS
  if (/design-hashmap|myhashmap/.test(s)) {
    return {
      category: "hashmap",
      primaryVizType: "hashmap",
      pattern: "hashmap-design",
      isMultiEntity: false,
      algorithmName: "Design Hash Map with Bucket Chaining",
    };
  }
  if (/design-hashset|myhashset/.test(s)) {
    return {
      category: "hashmap",
      primaryVizType: "set",
      pattern: "hashset-design",
      isMultiEntity: false,
      algorithmName: "Design Hash Set Registry",
    };
  }

  // 12. HEAP / PRIORITY QUEUE (Top-K, Medians, Scheduling)
  if (
    /kth-largest|top-k-frequent|k-closest|merge-k-sorted|find-median-from-data-stream|task-scheduler|reorganize-string|last-stone-weight|seat-reservation/.test(
      s,
    ) ||
    hasTopic("heap (priority queue)", "heap")
  ) {
    return {
      category: "heap",
      primaryVizType: "heap",
      pattern: "heap-topk",
      isMultiEntity: false,
      algorithmName: "Min/Max Heap Priority Queue (Top-K Streaming)",
    };
  }

  // 13. LRU / LFU CACHE & SPECIALIZED LINKED LISTS
  if (/lru-cache|lfu-cache|all-oone-data-structure/.test(s)) {
    return {
      category: "linked-list",
      primaryVizType: "linkedlist",
      pattern: "lru-cache",
      isMultiEntity: true,
      algorithmName: "LRU Cache (Doubly Linked List + Hash Map)",
    };
  }

  // 14. LINKED LIST FAST-SLOW & CYCLES
  if (/linked-list-cycle|happy-number|find-the-duplicate-number/.test(s)) {
    return {
      category: "linked-list",
      primaryVizType: "linkedlist",
      pattern: "linkedlist-cycle",
      isMultiEntity: false,
      algorithmName: "Floyd's Tortoise & Hare (Fast-Slow Cycle Detection)",
    };
  }

  // 15. LINKED LIST REVERSAL & POINTER INVERSION
  if (
    /reverse-linked-list|merge-two-sorted-lists|remove-nth-node-from-end|swap-nodes-in-pairs|middle-of-the-linked-list|palindrome-linked-list|reorder-list|add-two-numbers|partition-list|rotate-list|delete-node-in-a-linked-list/.test(
      s,
    ) ||
    hasTopic("linked list", "doubly-linked list")
  ) {
    return {
      category: "linked-list",
      primaryVizType: "linkedlist",
      pattern: "linkedlist-reverse",
      isMultiEntity: false,
      algorithmName: "Singly Linked List Pointer Inversion & Traversal",
    };
  }

  // 16. INTERVALS & RANGE OVERLAPS
  if (
    /merge-intervals|insert-interval|non-overlapping-intervals|meeting-rooms|minimum-number-of-arrows-to-burst-balloons|summary-ranges/.test(
      s,
    ) ||
    hasTopic("intervals")
  ) {
    return {
      category: "intervals",
      primaryVizType: "matrix",
      pattern: "intervals",
      isMultiEntity: false,
      algorithmName: "Interval Sorting & Sweep-Line Merging",
    };
  }

  // 17. MONOTONIC STACK (Next Greater Element, Daily Temperatures, Histograms)
  if (
    /daily-temperatures|next-greater-element|largest-rectangle-in-histogram|maximal-rectangle|online-stock-span|trapping-rain-water/.test(
      s,
    ) ||
    hasTopic("monotonic stack")
  ) {
    return {
      category: "stack",
      primaryVizType: "stack",
      pattern: "monotonic-stack",
      isMultiEntity: false,
      algorithmName: "Monotonic Decreasing / Increasing Stack",
    };
  }

  // 18. PARENTHESES & GENERAL STACK DATA STRUCTURE
  if (
    /valid-parentheses|generate-parentheses|minimum-remove-to-make-valid|longest-valid-parentheses|score-of-parentheses|decode-string|simplify-path|basic-calculator|evaluate-reverse-polish-notation|asteroid-collision|min-stack|max-stack|implement-stack|implement-queue-using-stacks|parenthes|bracket/.test(
      s,
    ) ||
    (hasTopic("stack") &&
      !hasTopic("dynamic programming", "tree", "binary tree", "graph", "heap"))
  ) {
    return {
      category: "stack",
      primaryVizType: "stack",
      pattern: "parentheses",
      isMultiEntity: false,
      algorithmName: "LIFO Character & Bracket Validation Stack",
    };
  }

  // 19. QUEUE ORDER & DECK SIMULATION (Reveal Cards, Dota2 Senate, Circular Queue, Time to Buy Tickets)
  if (
    /reveal-cards-in-increasing-order|dota2-senate|design-circular-queue|design-circular-deque|number-of-recent-calls|time-needed-to-buy-tickets|first-unique-number|card-flipping-game/.test(
      s,
    ) ||
    ((hasTopic("queue") || hasTopic("simulation")) &&
      !hasTopic("tree", "binary tree", "graph", "heap", "breadth-first search") &&
      /queue|senate|cards|deck|ticket|recent/i.test(s))
  ) {
    return {
      category: "queue",
      primaryVizType: "queue",
      pattern: "queue-simulation",
      isMultiEntity: true,
      algorithmName: "FIFO Queue Simulation & Card Ordering Engine",
    };
  }

  // 20. HASH MAP PAIR & COMPLEMENT SEARCH
  if (
    !s.includes("two-sum-ii") &&
    /two-sum|3sum-with-multiplicity|4sum-ii|subarray-sum-equals-k|continuous-subarray-sum/.test(
      s,
    )
  ) {
    return {
      category: "hashmap",
      primaryVizType: "hashmap",
      pattern: "hashmap-pair",
      isMultiEntity: false,
      algorithmName: "Hash Map Complement Lookup (Two Sum O(n))",
    };
  }

  // 21. FREQUENCY COUNTING & ANAGRAMS
  if (
    /group-anagrams|valid-anagram|first-unique-character|ransom-note|majority-element|contains-duplicate|word-pattern|isomorphic-strings|sort-characters-by-frequency|top-k-frequent-words|find-common-characters|intersection-of-two-arrays|minimum-index-sum-of-two-lists|custom-sort-string/.test(
      s,
    ) ||
    (hasTopic("counting") && !hasTopic("two pointers", "sliding window")) ||
    (hasTopic("hash table") && !hasTopic("two pointers", "sliding window"))
  ) {
    return {
      category: "hashmap",
      primaryVizType: "hashmap",
      pattern: "frequency-count",
      isMultiEntity: s.includes("group-anagrams"),
      algorithmName: "Hash Table Frequency Map & Bucket Counting",
    };
  }

  // 21. SLIDING WINDOW
  if (
    /longest-substring-without-repeating|minimum-window-substring|sliding-window-maximum|longest-repeating-character-replacement|permutation-in-string|max-consecutive-ones-iii|fruit-into-baskets|maximum-average-subarray-i|find-all-anagrams-in-a-string/.test(
      s,
    ) ||
    hasTopic("sliding window")
  ) {
    return {
      category: "sliding-window",
      primaryVizType: "array",
      pattern: "sliding-window",
      isMultiEntity: false,
      algorithmName: "Dynamic Sliding Window with Expanding Right & Shrinking Left",
    };
  }

  // 22. TWO POINTERS
  if (
    /container-with-most-water|valid-palindrome|3sum|3sum-closest|reverse-string|remove-duplicates-from-sorted-array|move-zeroes|squares-of-a-sorted-array|two-sum-ii-input-array-is-sorted|two-sum-ii|4sum|backspace-string-compare|boats-to-save-people/.test(
      s,
    ) ||
    hasTopic("two pointers")
  ) {
    return {
      category: "two-pointers",
      primaryVizType: "array",
      pattern: "two-pointers",
      isMultiEntity: false,
      algorithmName: "Inward Converging / Opposing Two Pointers",
    };
  }

  // 23. BINARY SEARCH
  if (
    /binary-search|search-in-rotated-sorted-array|search-in-rotated-sorted-array-ii|find-first-and-last-position|search-insert-position|search-a-2d-matrix|find-minimum-in-rotated-sorted-array|find-peak-element|koko-eating-bananas|capacity-to-ship-packages|sqrtx|first-bad-version|peak-index-in-a-mountain/.test(
      s,
    ) ||
    hasTopic("binary search")
  ) {
    return {
      category: "binary-search",
      primaryVizType: "array",
      pattern: "binary-search",
      isMultiEntity: false,
      algorithmName: "Binary Search Logarithmic Bisection",
    };
  }

  // 24. PROFITABLE SCHEMES & MULTI-ATTRIBUTE 0/1 KNAPSACK
  if (/profitable-schemes|0-1-knapsack|knapsack/.test(s)) {
    return {
      category: "dp-1d",
      primaryVizType: "array",
      pattern: "dp-1d",
      isMultiEntity: true,
      algorithmName: "0/1 Knapsack Dynamic Programming (Profitable Schemes)",
    };
  }

  // 25. 1D DYNAMIC PROGRAMMING & RECURRENCE
  if (
    /climbing-stairs|coin-change|coin-change-ii|house-robber|house-robber-ii|longest-increasing-subsequence|maximum-subarray|jump-game|jump-game-ii|decode-ways|word-break|partition-equal-subset-sum|min-cost-climbing-stairs|fibonacci-number|kadane/.test(
      s,
    ) ||
    hasTopic("dynamic programming", "memoization")
  ) {
    return {
      category: "dp-1d",
      primaryVizType: "array",
      pattern: "dp-1d",
      isMultiEntity: false,
      algorithmName: "1D Dynamic Programming Tabulation & State Memoization",
    };
  }

  // 26. PREFIX SUMS
  if (
    /range-sum-query-immutable|range-sum-query-2d-immutable|running-sum-of-1d-array|product-of-array-except-self|find-pivot-index|contiguous-array|subarray-sums-divisible-by-k/.test(
      s,
    ) ||
    hasTopic("prefix sum")
  ) {
    return {
      category: "prefix-sum",
      primaryVizType: "array",
      pattern: "prefix-sum",
      isMultiEntity: false,
      algorithmName: "Prefix Sum Cumulative Range Aggregation",
    };
  }

  // 26. BIT MANIPULATION
  if (
    /single-number|single-number-ii|single-number-iii|number-of-1-bits|counting-bits|reverse-bits|missing-number|sum-of-two-integers|power-of-two|bitwise-and-of-numbers-range|hamming-distance/.test(
      s,
    ) ||
    hasTopic("bit manipulation")
  ) {
    return {
      category: "bit-manipulation",
      primaryVizType: "array",
      pattern: "bit-manipulation",
      isMultiEntity: false,
      algorithmName: "Bitwise Manipulation & XOR Masking Operations",
    };
  }

  // 27. SORTING ALGORITHMS
  if (
    /sort-colors|merge-sorted-array|sort-an-array|insertion-sort-list|largest-number|sort-list/.test(
      s,
    ) ||
    hasTopic("sorting")
  ) {
    return {
      category: "sorting",
      primaryVizType: "array",
      pattern: "sorting",
      isMultiEntity: false,
      algorithmName: "In-Place & Comparison-Based Array Sorting",
    };
  }

  // 28. FALLBACK SEQUENTIAL ARRAY / STRING SCAN
  return {
    category: "array-scan",
    primaryVizType: "array",
    pattern: "array-scan",
    isMultiEntity: false,
    algorithmName: "Linear Sequential Scan & Condition Verification",
  };
}

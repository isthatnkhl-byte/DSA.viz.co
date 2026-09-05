export const VISUALIZER_SYSTEM_PROMPT = `You are a smart, multi-dataset data-structure execution simulator. Return ONLY valid JSON with no prose, no markdown fences, no comments, and no trailing text.

You must output exactly one JSON object in this shape:
{
  "is_complete": true,
  "visualization_manifest": {
    "primary_type": "tree",
    "structure_name": "queue",
    "pointers": {
      "active_node": "current"
    },
    "reasoning": "The user is implementing a BFS level-order traversal using a queue."
  },
  "test_array": [3, 9, 20, null, null, 15, 7],
  "code_lines": [
    "queue = [root]",
    "while queue:",
    "    node = queue.pop(0)",
    "    if node.left: queue.append(node.left)",
    "    if node.right: queue.append(node.right)"
  ],
  "viz_steps": [
    {
      "type": "tree",
      "line": 0,
      "desc": "Initialize queue with root node [3]. Preparing FIFO buffer for level-order BFS traversal.",
      "tree": [3, 9, 20, null, null, 15, 7],
      "queue": [3],
      "current": 3,
      "pointer_labels": {
        "current": "node"
      }
    }
  ]
}

CRITICAL RULE FOR COMPLETENESS:
Before generating steps, evaluate the user's pseudocode. If the pseudocode is incomplete, fundamentally flawed, or misses core logic, set "is_complete": false and leave "viz_steps": []. Do NOT generate visualization steps for incomplete code.

CRITICAL RULES FOR SMART MULTI-DATASET VISUALIZATION:
1) OUTPUT FORMAT: Valid JSON only. No code fences, no explanation, no markdown.

2) STRICT USER-SPECIFIC PSEUDOCODE USAGE:
   - "code_lines" MUST contain the candidate's submitted pseudocode verbatim, line-by-line, in the exact order written.
   - Do NOT rewrite, clean up, rename, or substitute generic code or template algorithms.
   - Every step's "line" integer MUST strictly point to the corresponding 0-indexed line in the user's pseudocode that executes for that action.
   - EXACT CODE ANCHOR: You can ALSO include "code_anchor": "exact substring of candidate code line" on any step for guaranteed 100% synchronized line highlighting.
   - Use the candidate's exact variable names (e.g. nums, seen, diff, max_val, left, right, res, stack, queue, dp) throughout your step descriptions ("desc").
   - POINTER MAPPING:
     * For primary dual-pointers, use "left", "right", "left2", "right2", and "current" (e.g. "left": 0) and provide "pointer_labels" (e.g. "pointer_labels": { "left": "low", "right": "high" }).
     * MULTI-POINTERS (3+ Pointers): If the algorithm tracks 3 or more pointers (e.g. Dutch National Flag low, mid, high, or 3Sum i, left, right), emit an "activePointers" record on the step:
       "activePointers": { "low": 0, "mid": 2, "high": 5 }
       or for 2D grids: "activePointers": { "curr": "1,2", "next": "1,3" }.

3) EXPANDED & INFORMATIVE STEP DESCRIPTIONS ("desc"):
   - Write clear, detailed, and educational explanations in "desc" for every step so the user learns how their algorithm executes.
   - Do NOT use terse or cryptic shorthand (e.g., avoid "i=2", "next step", or "update array").
   - Every "desc" MUST clearly explain:
     * The action being executed on this pseudocode line.
     * The specific variable values, indices, and conditions being compared (e.g. "Checking if nums[2] (45) > max_val (12)").
     * The decision or state mutation (e.g. "Condition is met: updating max_val from 12 to 45").
     * For data structure changes: explain what is pushed, popped, inserted, or removed and the new state of the structure.
     * For termination/return: clearly state the loop exit and the final calculated return value.

4) MULTI-COMPONENT, NESTED LOOP & FULL DATASET SCAN (UNIVERSAL RULE):
   - When an algorithm has outer loops (e.g. 2D grid cells \`for r in range(rows): for c in range(cols):\`, graph vertices \`for u in 1..V\`, finding all connected components, islands, sub-arrays, intervals, or word occurrences):
   - CRITICAL REQUIREMENT:
     * When an inner helper function / recursive DFS / BFS finishes exploring ONE component/island, DO NOT STOP OR JUMP TO RETURN! That helper return only resolved one component.
     * The main outer loop MUST continue scanning through the rest of the dataset.
     * When subsequent unvisited components or islands are encountered (e.g. Island #2, Island #3, Island #4...), launch traversal for each, explore their cells/nodes, and update global accumulators (\`max_area\`, \`island_count\`, \`components\`, \`res\`).
     * You MUST visit and evaluate EVERY island / component in the entire input dataset.
     * ONLY after the outer loops complete the full scan across all elements/cells should you emit the final return step.

5) COMPLETE END-TO-END TRAVERSAL (MANDATORY):
   - You MUST simulate the algorithm completely from the first initialization line to the final return/termination statement.
   - NEVER STOP HALFWAY, truncate, or end early. Traverse EVERY element, pointer step, node, or grid cell until the entire test input dataset has been completely processed according to the pseudocode.
   - UNIVERSAL ANTI-DEGENERACY & FULL SINGLE-CELL MOVEMENT LAW:
     * You MUST NOT generate small steps, macro jumps, or cut traversals short.
     * In 2D Grids / Islands / Matrices: You MUST evaluate cell-by-cell!
       - Outer loop scan: step through and evaluate cells (r, c) across ALL rows and columns.
       - Connected components / DFS / BFS: visit every neighbor cell-by-cell (step into land, update visited, increment area, visit next direction, backtrack).
       - Never stop after only visiting 1 cell or 1 island! Process ALL separate islands and continue until the full grid has been scanned.
     * In Arrays / Two-Pointers: evaluate every element comparison and pointer adjustment step-by-step.
     * In Trees: traverse level-by-level or branch-by-branch through all nodes in the tree/queue.
   - For LONGER & EXTENDED DATASETS (e.g. Dataset 2 with 15–25 elements or 5×6 / 6×6 / 8×10 matrices): Generate an extensive, thorough step sequence demonstrating the full progression across all elements/cells of the larger dataset so the learner has ample time to observe and understand the algorithm working through longer data.
   - Generate all necessary execution steps (from initial state, loop progression, all iterations, to final return) to provide a complete, unbroken visual walkthrough.
   - The final step MUST highlight the termination condition, the final return value, or the completed data structure state.

6) MULTI-DATASET & MULTI-STRUCTURE SUPPORT:
   - When an algorithm operates on multiple structures or datasets (e.g. Grid + Visited Set + Call Stack, Tree + Queue, Array + Hash Table, Array + Monotonic Stack, List + Map, Dual Arrays), POPULATE ALL active structures simultaneously in each step!
   - Available structure fields:
     * "matrix": [[row1], [row2], ...] (2D grid of numbers or 0/1 binary land/water values)
     * "cols": number of columns in the grid
     * "tree": [level-order elements with nulls] (Binary tree or Min-Heap)
     * "queue": [elements] (FIFO queue buffer)
     * "stack": [elements] (LIFO stack buffer or call stack)
     * "array": [elements] (Primary array / character sequence / stream of numbers or strings)
     * "secondaryArray": [elements] (Second array / character sequence for multi-sequence algorithms)
     * "map": { "key": value } (Hash table / frequency dictionary / complement map)
     * "list": [elements] (Linked list nodes)
     * "set": [elements] (Unique visited set)
     * "callStack": [{ "id": string, "functionName": string, "depth": number, "args": { [key: string]: any }, "returnValue"?: any, "status": "active" | "returning" | "unwinding" }] (LIFO recursion frames)
     * "recursionTree": [{ "id": string, "parentId": string | null, "label": string, "depth": number, "state": "running" | "success" | "backtracked" | "pruned", "decision"?: string }] (State-space tree nodes)
     * "heapSwap": { "fromIndex": number, "toIndex": number, "direction": "sift-up" | "sift-down" } (Animated heap swap)
     * "stackInvariant": "increasing" | "decreasing" (Monotonic stack invariant condition)
     * "sightlines": [{ "fromIndex": number, "toIndex": number, "resolvedValue": number | string, "type": "next-greater" | "next-smaller" }] (Optical ray-cast sightlines)
     * "intervals": [{ "id": string, "start": number, "end": number, "label": string, "status": "unprocessed" | "comparing" | "active" | "merged" | "finalized" }] (1D timeline intervals)
     * "sweepLine": number (Current time playhead / laser position on continuous 1D timeline)
   - FINE-GRAINED STRUCTURE-SPECIFIC STEPS & DATASET FOCUS:
     * "activeDataset" & "shiftInfo": Every step tracks data transitions between structures (e.g. from matrix to visited, from array to map, or popping from queue to inspect a tree node).
     * Independent Mutations: Each structure only updates on the exact line where it is mutated (e.g. queue enqueues/dequeues step-by-step, stack pushes/pops on recursive descent and backtracking, hash maps insert elements when processed).
     * Synced Multi-Pointer UI: Pointers across primary and secondary arrays ("left", "right", "left2", "right2", "current") and cell coordinates ("r,c") highlight their respective structures in tandem on the canvas.

7) 2D GRID, ISLANDS & AREA TRAVERSALS (Max Area of Island, Number of Islands, Flood Fill, Rotting Oranges):
   - Set "type": "matrix".
   - "matrix": 2D array of rows representing the binary grid (e.g. 0 = Water, 1 = Land).
   - "cols": integer number of columns.
   - "current": string "r,c" representing the active cell coordinate being evaluated.
   - "visited": array of visited coordinate strings ["r1,c1", "r2,c2", ...] that updates as new cells are reached. NEVER leave "visited" frozen!
   - "wSum": current island area integer (e.g. 1 -> 2 -> 3 ...) for the active connected component.
   - "mSum": maximum island area integer found so far across the entire grid.
   - "direction": 4-directional step currently being explored matching candidate's pseudocode.
   - "islandCells": list of coordinate strings belonging to the current island component for area shading.
   - RECURSIVE DFS ORDER: Follow the candidate's exact recursive call-stack order (when recursing into an adjacent neighbor, dive into that neighbor's sub-tree BEFORE visiting sibling directions of the caller).
   - FULL GRID SCAN: Systematically scan all rows and cols across the provided grid to discover and evaluate ALL islands in the dataset until the entire grid is traversed.

7b) 2D MATRIX IN-PLACE TRANSFORMATION & CELL-BY-CELL GRID LOOPS (Set Matrix Zeroes, Rotate Image, Spiral Matrix, Game of Life, Valid Sudoku, Diagonal Traverse):
   - Set "type": "matrix".
   - "matrix": 2D array of rows representing the current state of the matrix (e.g. [[1, 0, 1], [0, 0, 0], ...]), updated in-place on EVERY cell write, flag, or sentinel assignment.
   - "cols": integer number of columns.
   - "current": string "i,j" (e.g. "0,1") representing the EXACT coordinates of the cell currently being inspected, evaluated, or modified.
   - "visited": optional array of coordinate strings ["0,0", "0,1", ...] that have been evaluated.
   - MANDATORY CELL-BY-CELL LOOP TRAVERSAL:
     * When the pseudocode has nested loops (for i in 0..n: for j in 0..m:) or row/column traversals, you MUST iterate cell-by-cell!
     * NEVER skip or take macro jumps across entire rows or columns in a single step (e.g. do NOT set an entire row to zeroes in one step).
     * For every cell (i, j) evaluated: emit a step setting current: "i,j" and describing the comparison in "desc" (e.g. "Checking matrix[1][1] (0) == 0: Found zero! Will propagate.").
     * When marking or overwriting a row or column: step through each cell along that row or column one-by-one with "current": "r,c", showing the in-place matrix mutation on each step.
     * When performing a second pass: step through cells individually, highlighting each conversion or update in-place.
     * In "desc", explicitly reference indices i, j and cell values matrix[i][j].

8) BINARY TREE BFS / LEVEL-ORDER:
   - Set "type": "tree".
   - "tree": Level-order array of the binary tree with nulls for missing nodes.
   - "queue": The active FIFO queue containing current nodes waiting in buffer (e.g. [3] -> [] -> [9] -> [9, 20] -> [20] -> [] -> [15, 7]).
   - The "queue" MUST be updated dynamically on EVERY enqueue and dequeue step. NEVER keep "queue" frozen!

9) SMART DATASET FOCUS & TRANSITION SHIFTS:
   - "activeDataset": string identifying which dataset is currently being read/mutated (e.g. "matrix", "set", "tree", "queue", "array", "map", "stack").
   - "shiftInfo": { "from": "matrix", "to": "visited", "action": "push" | "pop" | "lookup" | "write" | "compare" | "shift", "reason": "Detailed explanation using user variable names" }

10) DUAL POINTERS ACROSS MULTIPLE ARRAYS:
   - For Array 1: use "left" and "right".
   - For Array 2 ("secondaryArray"): use "left2" and "right2".

10b) NESTED LOOPS & DUAL POINTERS ON ARRAYS (for i ... for j ..., e.g. Two Sum Brute Force / Pair Searches):
   - When an algorithm uses nested loops over an array (e.g. "for i = 0 to n-1: for j = i + 1 to n-1:"):
   - You MUST emit BOTH pointers simultaneously in every inner loop step:
     * "left": integer index of the outer loop variable (e.g. i).
     * "right": integer index of the inner loop variable (e.g. j).
     * "pointer_labels": { "left": "i", "right": "j" } (or the candidate's exact loop variable names).
   - "left" remains anchored at index i while "right" iterates through j = i + 1, i + 2, ...
   - In "desc", state: "Checking nums[i] (X) + nums[j] (Y) = Sum vs target Target".
   - NEVER collapse both into a single "current" pointer or omit "pointer_labels"!

10c) DYNAMIC VARIABLE-SIZE SLIDING WINDOW (Longest Substring Without Repeating Characters, Minimum Window Substring, Max Consecutive Ones III, Subarray Product Less Than K):
   - Set "type": "array".
   - You MUST emit BOTH window boundary pointers on every step:
     * "left": integer index of the window start pointer.
     * "right": integer index of the window end pointer.
     * "pointer_labels": { "left": "left", "right": "right" } (or candidate's exact pointer variable names).
   - Dynamic Window Expansion & Contraction:
     * EXPANSION: When right advances, add the character/element to the window and update auxiliary "map" (frequency or index) or "set".
     * CONTRACTION: While the window condition is violated (e.g. duplicate character in set, or zeroes count > k), advance left step-by-step, removing characters or decrementing counts in "map"/"set" until the window is valid again.
     * "wSum": active window length (right - left + 1).
     * "mSum": running maximum or optimal window length found so far.
   - In "desc", describe the character added/removed, window bounds [left..right], and the updated max length.

10d) SAME-DIRECTION IN-PLACE READ/WRITE POINTERS (Move Zeroes, Remove Duplicates, Remove Element, Sort Colors):
   - Set "type": "array".
   - You MUST emit BOTH pointers simultaneously:
     * "left": integer index of the slow / write pointer.
     * "right": integer index of the fast / read pointer.
     * "pointer_labels": { "left": "slow", "right": "fast" } (or "write" / "read").
   - In-Place Mutation:
     * When writing or swapping (e.g. nums[slow] = nums[fast]), update the "array" field in-place on that exact step so the UI reflects the modified elements.
     * In "desc", explain: "nums[fast] (X) meets condition — overwrite/swap at nums[slow] (index Y) and advance slow."

10e) PREFIX SUM WITH COMPLEMENT HASH MAP (Subarray Sum Equals K, Contiguous Array, Find Pivot Index):
   - Set "type": "array".
   - In every step:
     * "left": integer index i of the current element being processed.
     * "wSum": running cumulative prefix sum up to index i.
     * "map": { [prefix_sum]: count } frequency dictionary of all prefix sums encountered so far (including initial { 0: 1 }).
     * In "desc", explicitly state: "Running sum = S. Checking if (S - target) = Remainder exists in map. Found M matches so far."

10f) GEOMETRIC MONOTONIC STACK (Daily Temperatures, Next Greater Element, Online Stock Span, Largest Rectangle in Histogram):
   - Set "type": "stack".
   - "stackInvariant": "decreasing" (for Next Greater Element) or "increasing" (for Next Smaller Element).
   - "stack": array of active elements or indices currently in stack in strictly monotonic order.
   - When resolving elements:
     * Emit "sightlines": [{ "fromIndex": poppedIdx, "toIndex": currentIdx, "resolvedValue": nums[currentIdx], "type": "next-greater" }]
     * Show the popping of violated elements and optical sightline connection to the current resolver.
   - Then emit a step pushing the incoming element onto "stack".

10g) BINARY SEARCH (Binary Search, Search in Rotated Sorted Array, Find Peak Element):
   - Set "type": "array".
   - In every step:
     * "left": low boundary index.
     * "right": high boundary index.
     * "current": middle element index (mid = floor((low + high) / 2)).
     * "pointer_labels": { "left": "low", "right": "high", "current": "mid" }.
     * In "desc", state: "nums[mid] (X) vs target (Y). Search space reduced: discard half and set new bounds."

10h) DUAL-VIEW BINARY HEAP & PRIORITY QUEUE (Kth Largest, Top K Frequent, Merge K Sorted Lists, Find Median from Data Stream):
   - Set "type": "heap".
   - "tree": Complete binary heap level-order array representation [root, left, right, left.left, ...] satisfying the heap invariant.
   - During sift-up (insertion) or sift-down (extract/replace root):
     * For every swap between parent and child, emit "heapSwap": { "fromIndex": childIdx, "toIndex": parentIdx, "direction": "sift-up" } (or "sift-down").
     * In "desc", explicitly reference the heap indexing arithmetic: parent = floor((i-1)/2), left_child = 2i+1, right_child = 2i+2.

10i) RECURSION TREE & DYNAMIC CALL STACK (Subsets, Permutations, Combination Sum, N-Queens, Sudoku Solver, Palindrome Partitioning):
   - Set "type": "recursion-tree".
   - "callStack": Dynamic LIFO array of active frames with function name, arguments, depth, and return value.
   - "recursionTree": Array of state-space tree nodes representing the decision path and branching choices.
   - Step through state-space expansion, base condition checks, leaf solutions, and backtracking stack unwinding.

10j) 1D INTERVAL TIMELINE & SWEEP-LINE LASER (Merge Intervals, Insert Interval, Non-Overlapping Intervals, Meeting Rooms):
   - Set "type": "intervals".
   - "intervals": Array of structured interval items with id, start, end, label, and status.
   - "sweepLine": Current continuous coordinate / timestamp of the vertical sweep-line laser.
   - "wSum": Count of consolidated non-overlapping intervals.
   - Animate the sweep line advancing, boundary comparison, overlap detection, and interval expansion/merging.

11) ARRAY / STRING ALGORITHMS:
   - For standard array/string problems, set "type": "array".
   - Provide the array in "array". Use "left", "right", and "current" to track indices.
   - Do NOT use "linkedlist" unless the problem explicitly operates on Linked List nodes.

12) DYNAMIC PROGRAMMING (DP):
   - For DP problems (Tabulation/Memoization), set "type": "dp" or "matrix".
   - Place the DP table in the "matrix" field (if 1D DP, provide it as a 1-row matrix e.g. [[dp0, dp1, ...]]).
   - Place the input array in the "array" field.
   - Set "current" to "r,c" to highlight the active cell being computed.

13) STRICT ACTION-TO-LINE SYNCHRONIZATION:
   - The "line" integer MUST point to the EXACT statement executing for that specific action (0-indexed).
   - Initial declarations must show empty/initial structures ({}, [], zeros) and MUST NOT contain future elements before mutating statements run.`;

export function buildVisualizerUserPrompt({
  title,
  statement,
  example,
  secondaryArrayExample,
  matrixExample,
  treeExample,
  targetExample,
  datasetLabel,
  datasetDescription,
  pseudocode,
}: {
  title: string;
  statement: string;
  example?: (number | string)[];
  secondaryArrayExample?: (number | string)[];
  matrixExample?: (number | string)[][];
  treeExample?: (number | string | null)[];
  targetExample?: number | string;
  datasetLabel?: string;
  datasetDescription?: string;
  pseudocode: string;
}) {
  const isIsland =
    /island|max.*area.*island|number[- ]of[- ]islands|flood[- ]fill|rotting.*orange|surrounded[- ]regions|walls[- ]and[- ]gates|pacific[- ]atlantic|count-sub-islands|making-a-large-island/i.test(
      title,
    ) ||
    (/\bdr,\s*dc\b|\bdirections\b/i.test(pseudocode) && /dfs|bfs|connected|component|land|water/i.test(pseudocode));

  const isMatrixTransform =
    !isIsland &&
    (/set[- ]matrix|rotate[- ]image|spiral[- ]matrix|game[- ]of[- ]life|valid[- ]sudoku|diagonal[- ]traverse|matrix.*zero|zeroes/i.test(
      title,
    ) ||
      Boolean(matrixExample && matrixExample.length > 0 && !isIsland));

  const isTree =
    /tree|level[- ]order|zigzag|right-side-view|bst/i.test(title) ||
    /TreeNode|node\.left|node\.right|root/i.test(pseudocode);

  const isClassOrDesign =
    /class\s+|def\s+put|def\s+get|def\s+remove|MyHashMap|MyHashSet|LRUCache|Trie/i.test(
      pseudocode,
    ) || /design/i.test(title);

  const isQueueSimulation =
    /reveal.*cards|deck.*reveal|dota2.*senate|circular.*queue|buy.*tickets/i.test(title) ||
    /deck|revealed|permutation|queue\.enqueue|queue\.dequeue|simulateAndCheck/i.test(pseudocode);

  const safeExample = Array.isArray(example) && example.length > 0 ? example : [1, 2, 3];
  let sampleGuidance = `Suggested sample input: [${safeExample.join(", ")}].${targetExample !== undefined ? ` Target = ${targetExample}.` : ""}`;

  if (secondaryArrayExample && secondaryArrayExample.length > 0) {
    sampleGuidance = `Simulate dual-sequence / multi-attribute array execution using primary array (${JSON.stringify(safeExample)}) and secondaryArray (${JSON.stringify(secondaryArrayExample)}).${targetExample !== undefined ? ` Target / minProfit = ${targetExample}.` : ""} Track dual pointers ("left", "right" on primary array and "left2", "right2" on secondaryArray).`;
  } else if (isIsland) {
    const gridRows =
      matrixExample && matrixExample.length > 0
        ? matrixExample
        : [
            [0, 0, 1, 0, 0, 0],
            [0, 1, 1, 0, 1, 1],
            [0, 1, 1, 0, 1, 1],
            [0, 0, 0, 0, 1, 1],
            [1, 1, 0, 0, 0, 0],
            [1, 1, 0, 0, 0, 0],
          ];
    sampleGuidance = `Simulate 2D Grid Island traversal on this input binary grid (0 = Water, 1 = Land):
matrix = ${JSON.stringify(gridRows)}
cols = ${gridRows[0]?.length ?? 6}
Set type='matrix'. Step through 4-directional DFS traversal based on candidate's exact pseudocode until ALL islands across the entire grid are evaluated.
MANDATORY FOR GRID/ISLAND TRAVERSALS:
- Step through EVERY single connected land cell one by one! Do NOT jump across islands or skip intermediate recursive steps.
- For each step:
  * Set 'current' to the active cell coordinates string "r,c" (e.g. "2,1").
  * Follow true recursive DFS call stack: when recursing into an adjacent neighbor (dr, dc), explore that neighbor's connected cells BEFORE visiting sibling directions.
  * Add newly visited cells to 'visited' as ["r1,c1", "r2,c2", ...] (cumulative across all islands).
  * 'islandCells': Array of coordinates belonging to the CURRENT active island only.
  * 'currentArea' (or 'wSum'): Exact count of land cells discovered in the active island so far (starts at 1 for the root, increments on each new neighbor).
  * 'maxArea' (or 'mSum'): Running maximum island area discovered across the entire grid so far.
  * 'direction': Vector being traversed (e.g. "DOWN (+1, 0)", "UP (-1, 0)", "RIGHT (0, +1)", "LEFT (0, -1)").
- When an island's DFS completes, update maxArea = max(maxArea, currentArea), then continue the outer scan (for r... for c...) to discover and fully explore Island #2, Island #3, etc. until the entire grid is complete.`;
  } else if (isMatrixTransform) {
    const gridRows =
      matrixExample && matrixExample.length > 0
        ? matrixExample
        : [
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
          ];
    sampleGuidance = `Simulate 2D Matrix In-Place Transformation & Cell-by-Cell Traversal on this input matrix:
matrix = ${JSON.stringify(gridRows)}
cols = ${gridRows[0]?.length ?? 3}
Set type='matrix'. Step through candidate's nested loops (for i = 0..n-1: for j = 0..m-1:) cell-by-cell!
MANDATORY FOR 2D MATRIX CELL-BY-CELL LOOPS:
- Step through loop iterations cell by cell! DO NOT take macro skips across entire rows or columns in a single step.
- For every cell visited, set 'current' to the active cell coordinates string "i,j" (e.g. "0,0", "0,1", "1,1").
- Mutate 'matrix' in-place on each step to reflect updated cell values, sentinels, or zeroes.
- When scanning/marking a row or column, step through each cell along that row/column individually with 'current' set to each coordinate (e.g. (i, 0), (i, 1), ...).
- Set 'line' to the exact line in candidate's pseudocode being executed.`;
  } else if (isTree) {
    const treeArr = treeExample ?? [3, 9, 20, null, null, 15, 7];
    sampleGuidance = `Simulate binary tree traversal using 'tree' (level-order array with nulls: ${JSON.stringify(treeArr)}) and 'queue' (active FIFO buffer updated on every enqueue/dequeue step). Set type='tree'. Continue until the queue becomes empty and traversal completes.`;
  } else if (isQueueSimulation) {
    sampleGuidance = `Simulate Queue and Card Deck simulation on input: ${JSON.stringify(safeExample)}.
Set type='queue' or 'array'.
MANDATORY FOR QUEUE & CARD REVEAL SIMULATION:
- If sorting/queue simulation: initialize the FIFO index queue [0, 1, 2, ... n-1] and sort cards in ascending order.
- For each card, dequeue target slot index from the queue, assign result[targetSlot] = card, and if queue is not empty, dequeue and re-enqueue (move to back) the next slot index.
- If simulating permutations: simulate the exact queue process (reveal top card, move next to bottom), verify if revealed order is strictly increasing, and return the permutation that matches.
- Dynamically update the 'queue' array on EVERY step.
- Set 'line' to the exact line in candidate's pseudocode being executed.`;
  } else if (isClassOrDesign) {
    sampleGuidance =
      "Simulate candidate's methods (e.g. put, get, remove, or class methods) according to the problem's canonical example sequence through to the final method call. Do NOT emit a fake 'array' field if this is a pure HashMap/HashSet/Cache design.";
  }

  const isDynamicSlidingWindow =
    !isIsland &&
    !isMatrixTransform &&
    (/longest.*substring|minimum.*window|sliding.*window|character.*replacement|consecutive.*ones|fruit.*basket|subarray.*product.*less/i.test(title) ||
      (/\b(left|start)\b/i.test(pseudocode) && /\b(right|end)\b/i.test(pseudocode) && /window|shrink|expand|frequency/i.test(pseudocode)));

  const isInPlacePointers =
    !isIsland &&
    !isMatrixTransform &&
    (/move.*zero|remove.*duplicate|remove.*element|sort.*colors|duplicate.*zero/i.test(title) ||
      (/\b(slow|write)\b/i.test(pseudocode) && /\b(fast|read)\b/i.test(pseudocode)));

  const isPrefixSum =
    !isIsland &&
    !isMatrixTransform &&
    (/subarray.*sum.*equals|contiguous.*array|pivot.*index|running.*sum|prefix.*sum/i.test(title) ||
      (/prefix.*sum|running.*sum|curr.*sum/i.test(pseudocode) && /hash|map|dict/i.test(pseudocode)));

  if (isDynamicSlidingWindow) {
    sampleGuidance = `Simulate Dynamic Sliding Window execution on input sequence: ${JSON.stringify(safeExample)}.${targetExample !== undefined ? ` Target / k = ${targetExample}.` : ""}
Set type='array'.
MANDATORY FOR SLIDING WINDOW:
- Emit both window boundary pointers on EVERY step: 'left' (window start) and 'right' (window end) with pointer_labels: { left: 'left', right: 'right' }.
- Animate window expansion when 'right' advances, adding the element to active window and updating 'map' (frequency dictionary) or 'set'.
- Animate window contraction when 'left' advances, removing elements from 'map'/'set' while condition is violated.
- Track 'wSum' as active window width (right - left + 1) and 'mSum' as running maximum/optimal window width.
- Set 'line' to the exact line in candidate's pseudocode being executed.`;
  } else if (isInPlacePointers) {
    sampleGuidance = `Simulate In-Place Read/Write Two-Pointer execution on input: ${JSON.stringify(safeExample)}.
Set type='array'.
MANDATORY FOR IN-PLACE READ/WRITE POINTERS:
- Emit both pointers simultaneously on EVERY step: 'left' (slow / write pointer) and 'right' (fast / read pointer) with pointer_labels: { left: 'slow', right: 'fast' } (or 'write' / 'read').
- When elements are overwritten or swapped (nums[slow] = nums[fast]), update the 'array' field in-place on that exact step so the UI reflects the modified elements.
- In 'desc', explain the inspection and write: e.g. "nums[fast] (X) meets condition — overwrite at nums[slow] (index Y) and advance slow."
- Set 'line' to the exact line in candidate's pseudocode being executed.`;
  } else if (isPrefixSum) {
    sampleGuidance = `Simulate Prefix Sum with Complement Hash Map on input: ${JSON.stringify(safeExample)}.${targetExample !== undefined ? ` Target k = ${targetExample}.` : ""}
Set type='array'.
MANDATORY FOR PREFIX SUM WITH HASH MAP:
- On each step, emit 'left': index i of the current element being processed.
- Track running cumulative sum in 'wSum' (curr_sum).
- Track prefix sum frequencies in 'map' (e.g. { "0": 1, ... }), updated dynamically on every step.
- In 'desc', detail the complement check: "Current prefix sum = S. Checking if (S - k) = Diff exists in map."
- Set 'line' to the exact line in candidate's pseudocode being executed.`;
  }

  const isDp = /dp\[|dp_table|memo|tabulation|dynamic programming|longest common subsequence|knapsack|cost to merge/i.test(title + " " + (pseudocode || ""));
  if (isDp && !isIsland && !isMatrixTransform && !isDynamicSlidingWindow && !isPrefixSum) {
    sampleGuidance = `Simulate Dynamic Programming execution. Set type='dp' or 'matrix'. Track the active cell being computed using "current" set to "r,c" (or just the index if 1D). Put the DP table in "matrix" and the input array in "array".`;
  }

  const isIntervals =
    /interval|meeting.*room|insert.*interval|merge.*interval/i.test(title) ||
    (/\bintervals\b/i.test(pseudocode) && /start|end|overlap/i.test(pseudocode));
  if (isIntervals && !isIsland && !isMatrixTransform) {
    sampleGuidance = `Simulate Interval Merging & Overlap Analysis. Set type='matrix' or 'array'. Track previous interval vs current interval, showing whether they overlap (curr.start <= prev.end) and updating the merged interval.`;
  }

  const isGraph =
    /graph|course.*schedule|alien.*dict|topological|bipartite|clone.*graph/i.test(title) ||
    (/\b(?:adj|graph|indegree)\b/i.test(pseudocode) && /queue|stack|dfs|bfs/i.test(pseudocode));
  if (isGraph && !isIsland && !isMatrixTransform && !isTree) {
    sampleGuidance = `Simulate Graph & Topological Sort traversal. Set type='graph'. Track active vertex in 'current', visited vertices in 'visited', in-degrees in 'map', and BFS buffer in 'queue'.`;
  }

  const isHeap =
    /kth.*largest|heap|median.*data.*stream|merge.*k.*sorted/i.test(title) ||
    /\b(?:heap|heappush|heappop|priority_queue)\b/i.test(pseudocode);
  if (isHeap && !isTree) {
    sampleGuidance = `Simulate Heap / Priority Queue operations. Set type='heap' or 'tree'. Track heap array representation in 'tree' and the active sifted element in 'current'.`;
  }

  const isTrie =
    /trie|prefix.*tree|word.*search.*ii|replace.*words/i.test(title) ||
    /\b(?:trie|children|is_end|end_of_word)\b/i.test(pseudocode);
  if (isTrie) {
    sampleGuidance = `Simulate Prefix Trie insertion/search. Set type='trie' or 'tree'. Track the active character node in 'current' and character dictionary in 'map'.`;
  }


  const isLongerDataset = /longer|complex|dataset\s*2/i.test(datasetLabel ?? "");
  const datasetContext = datasetLabel
    ? `\nActive Dataset: "${datasetLabel}" ${datasetDescription ? `(${datasetDescription})` : ""}\n${
        isLongerDataset
          ? "CRITICAL INSTRUCTION FOR EXTENDED DATASET: This is an EXTENDED, LARGE-SCALE dataset designed for a deep, comprehensive animation (25–50+ steps). Step through ALL elements, matrix cells, tree nodes, or graph vertices systematically! In 2D grids, step through EVERY land cell of every island across all rows and columns (never exit after 4 steps or after only 1 island). In arrays/heaps/trees, traverse all elements thoroughly to provide the user with a rich, long-running visualization of their pseudocode execution.\n"
          : "Simulate the ENTIRE dataset from the first element to the final return/completion step without stopping early.\n"
      }`
    : "";

  return `Problem: "${title}".
Statement:
${statement}
${datasetContext}
Simulate THE CANDIDATE'S EXACT submitted pseudocode below step by step with full multi-dataset tracking through to the very end of execution. ${sampleGuidance}

CRITICAL INSTRUCTIONS FOR STEP ILLUSTRATION:
1. STRICT USER-SPECIFIC PSEUDOCODE:
   - Use the candidate's EXACT pseudocode lines below as "code_lines" verbatim, in identical order.
   - Do NOT modify, replace, or template the pseudocode lines or variable names.
   - In each step, set "line" (0-indexed) to the exact line of the user's pseudocode being executed.

2. EXPANDED & INFORMATIVE STEP EXPLANATIONS ("desc"):
   - Provide an expanded, highly readable, and educational description in "desc" for every step.
   - Explicitly mention the candidate's exact variable names, the current values being evaluated, comparisons made, why a branch is taken or skipped, and what value is stored or popped.
   - Avoid generic or ultra-short text. Make each step clear and insightful for the user.

3. FULL END-TO-END TRAVERSAL ACROSS ALL COMPONENTS:
   - For 2D grid/island or multi-component graph algorithms: You MUST traverse and evaluate ALL separate islands/components present in the input dataset. Do NOT stop after the first island/component.
   - Continue generating steps until the pseudocode completely finishes processing the entire input dataset and reaches the final return/termination statement. Do NOT stop halfway or omit trailing iterations.

4. MULTI-STRUCTURE SYNCHRONIZATION:
   - If the algorithm uses 2D grid matrix / islands: emit "matrix", "cols", "current" ("r,c"), "visited" (growing list of "r,c"), "wSum" (current area), "mSum" (max area), and "direction".
   - If the algorithm uses Tree + Queue: update the "queue" dynamically across every step: do NOT leave it frozen.
   - Indicate "activeDataset" and "shiftInfo" when logic moves between datasets.
   - Strict data-to-line synchronization: no premature mutations before the line runs.
   - The final step MUST show the algorithm reaching the return statement with the final calculated result.

Candidate Pseudocode (MUST be used verbatim as code_lines):
\`\`\`
${pseudocode}
\`\`\`

Now simulate complete execution step by step using the candidate's exact pseudocode lines and rich descriptive steps until the algorithm returns.`;
}

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
   - Use the candidate's exact variable names (e.g. nums, seen, diff, max_val, left, right, res, stack, queue, dp) throughout your step descriptions ("desc").
   - VERY IMPORTANT: The ONLY valid top-level properties for pointers are "left", "right", "left2", "right2", and "current" (e.g. "left": 0). If the pseudocode uses specific variable names (e.g. "low", "high", "pivot"), you MUST map them to these standard top-level properties. You must ALSO include a "pointer_labels" object to tell the UI what variable name to display (e.g. "pointer_labels": { "left": "low", "right": "high" }). Do NOT invent or add custom top-level properties like "low": 0 on the step; instead use "left": 0 and map it in "pointer_labels".

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
   - Generate all necessary execution steps (from initial state, loop progression, all iterations, to final return) to provide a complete, unbroken visual walkthrough.
   - The final step MUST highlight the termination condition, the final return value, or the completed data structure state.

6) MULTI-DATASET & STRUCTURE SUPPORT:
   - When an algorithm operates on multiple structures or datasets (e.g. Grid + Visited Set + Stack, Tree + Queue, Array + Hash Table, Array + Monotonic Stack, List + Map, Dual Arrays), POPULATE ALL active structures simultaneously in each step!
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
  const isIslandOrGrid =
    /island|max.*area|number[- ]of[- ]islands|grid|matrix|flood[- ]fill|rotting|surrounded[- ]regions/i.test(
      title,
    ) ||
    /grid\[r\]\[c\]|grid\[row\]\[col\]|neighbours|in_bounds|\bdr,\s*dc\b|\bdirections\b/i.test(
      pseudocode,
    );

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
  } else if (isIslandOrGrid) {
    const gridRows =
      matrixExample && matrixExample.length > 0
        ? matrixExample
        : [
            [0, 0, 1, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 0, 0, 0, 1],
            [0, 1, 1, 0, 1, 0, 0, 0],
            [0, 1, 0, 0, 1, 1, 0, 0],
            [0, 1, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
          ];
    sampleGuidance = `Simulate 2D Grid Island traversal on this input binary grid (0 = Water, 1 = Land):
matrix = ${JSON.stringify(gridRows)}
cols = ${gridRows[0]?.length ?? 8}
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

  const isDp = /dp\[|dp_table|memo|tabulation|dynamic programming|longest common subsequence|knapsack|cost to merge/i.test(title + " " + (pseudocode || ""));
  if (isDp && !isIslandOrGrid) {
    sampleGuidance = `Simulate Dynamic Programming execution. Set type='dp' or 'matrix'. Track the active cell being computed using "current" set to "r,c" (or just the index if 1D). Put the DP table in "matrix" and the input array in "array".`;
  }

  const isLongerDataset = /longer|complex|dataset\s*2/i.test(datasetLabel ?? "");
  const datasetContext = datasetLabel
    ? `\nActive Dataset: "${datasetLabel}" ${datasetDescription ? `(${datasetDescription})` : ""}\n${
        isLongerDataset
          ? "CRITICAL INSTRUCTION FOR EXTENDED DATASET: This is an EXTENDED, LARGE-SCALE dataset designed for a deep, comprehensive animation (25–45+ steps). Step through ALL elements, matrix cells, tree nodes, or graph vertices systematically to provide the user with a rich, long-running visualization of their pseudocode execution.\n"
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

/* eslint-disable @typescript-eslint/no-explicit-any */

export const VISUALIZER_SYSTEM_PROMPT = `You are a smart, multi-dataset data-structure execution simulator. Return ONLY valid JSON with no prose, no markdown fences, no comments, and no trailing text.

You must output exactly one JSON object in this shape:
{
  "total_expected_steps": 15, // MANDATORY: Determine and declare upfront the EXACT total number of simulation steps you plan to generate to trace this dataset from start to algorithm completion (e.g. 15, 20, 8).
  "execution_plan": [ // Detailed chronological plan of steps for this specific dataset
    {
      "step_number": 1,
      "line_index": 0,
      "code_action": "Initial state or function call",
      "description": "Explanation of what executes on this step."
    }
  ],
  "visualization_manifest": {
    "primary_type": "matrix" | "array" | "tree" | "stack" | "queue" | "map" | "intervals" | "linkedlist" | "graph" | "dp" | "recursion" | "bit" | "string",
    "structure_name": "Human readable name",
    "pointers": {
      "active_pointer": "current"
    },
    "reasoning": "Explanation of data structure and algorithmic approach."
  },
  "test_array": [...],
  "code_lines": [
    "def function_name(args):",
    "    ..."
  ],
  "viz_steps": [
    {
      "type": "matrix" | "array" | "tree" | "stack" | "queue" | "map" | "intervals" | "linkedlist" | "graph" | "dp" | "recursion" | "bit" | "string",
      "line": 0,
      "desc": "Rich, educational description of what executes on this line.",
      ... (data structure specific markers and values)
    }
  ],
  "is_complete": true | false // See Pagination Rule below
}

======================================================================
EXACT MARKER DICTIONARY BY DATA STRUCTURE & SUB-TYPE:
======================================================================

1. "matrix" (2D Grid / Matrix / Island Traversal / BFS Wave / In-Place Swaps / Geometric Rays)
   - "matrix": (number | string)[][] (2D grid array of values e.g. 0/1 binary grid or character board)
   - "cols": integer number of columns
   - "current": string coordinate "r,c" (e.g. "1,2") -> Pulsing target ring on active cell
   - "visited": array of coordinate strings ["0,0", "0,1", "1,0", ...] -> Explored cell markers
   - "direction": string direction heading ("UP (-1, 0)", "DOWN (+1, 0)", "LEFT (0, -1)", "RIGHT (0, +1)", "UP_LEFT", etc.) -> Directional traversal arrow
   - ISLAND & CONNECTED COMPONENT SUB-TYPES:
     * "islandCells": array of coordinate strings ["1,0", "1,1", "2,1"] belonging to active island
     * "currentArea" (or "wSum"): integer running area count for current active island (1, 2, 3...)
     * "maxArea" (or "mSum"): integer all-time maximum island area discovered across the entire grid
   - BFS WAVE / FLOOD FILL SUB-TYPES (Rotting Oranges, Walls & Gates):
     * "frontier": array of coordinate strings ["0,1", "1,0"] -> Active wavefront boundary ring
     * "distanceLayer": integer distance / minute counter (0, 1, 2...)
     * "waveDistance": { "currentDistance": number, "waveRings"?: [{ "distance": number, "cells": [number, number][] }], "frontierCount"?: number }
   - DIRECTIONAL RAY & NEIGHBOR PROBE:
     * "directionRay": { "from": [r, c], "to": [nr, nc], "direction": string, "status": "valid" | "wall" | "visited" | "oob" | "exploring", "neighborVal"?: number | string }
   - SPIRAL BOUNDARY SUB-TYPE:
     * "spiralBounds": { "top": number, "bottom": number, "left": number, "right": number }
   - IN-PLACE ROTATION & ZEROING SUB-TYPES:
     * "rotationLayer": integer ring layer (0, 1...)
     * "rotationOrbit": { "ringLayer": number, "orbit4": [[r,c],[r,c],[r,c],[r,c]], "orbitValues"?: (number|string)[], "activeCycleStep"?: number }
     * "highlightRows": number[] (e.g. [0, 2])
     * "highlightCols": number[] (e.g. [1])
   - CELLULAR AUTOMATA KERNEL (Game of Life):
     * "kernel8Neighbor": { "center": [r, c], "aliveCount": number, "ruleTriggered"?: string, "nextState"?: number | string }
   - BACKTRACKING PATH & N-QUEENS:
     * "trail": array of coordinate strings in sequence ["0,0", "0,1", "1,1"] -> Numbered path trail
     * "backtrackingRibbon": { "path": [number, number][], "retractedNode"?: [number, number], "wordSoFar"?: string, "targetWord"?: string }
     * "nQueensConflict": { "queenPos": [r, c], "attackRays"?: [{ "r": number, "c": number, "type": "row"|"col"|"main_diag"|"anti_diag" }], "conflictCell"?: [r, c] }
   - 2D DP PREDECESSORS:
     * "predecessorArrows": [{ "cell": [r, c], "from": [pr, pc], "direction": "top"|"left"|"diag", "cost"?: number|string }]
   - "pointer_labels": { "current": "cell" }

2. "array" (Linear Sequences, Numeric & Alphabetical Arrays, Character Sequences, Two Pointers, Sliding Window, Partitioning, Binary Search, Prefix Sums, Cyclic Sort, Dual Arrays)
   - "array": (number | string)[] (Primary array with latest modified values; supports numbers, characters ["a", "b", "c"], words ["foo", "bar"], and tokens)
   - "secondaryArray": (number | string)[] (Optional second array for Dual Sequences e.g. Timestamps, Second Array, LCS, Pattern)
   - "datasetLabels": { "primary"?: string, "secondaryArray"?: string } (Descriptive labels, e.g. { "primary": "Messages", "secondaryArray": "Timestamps" })
   - "left": number index of primary left pointer (low / slow / left / start)
   - "right": number index of primary right pointer (high / fast / right / end)
   - "current": number index of active scanner / pivot pointer (mid / pivot / idx / k)
   - "left2": number index of secondary array left pointer (low2 / idx2 / active secondary index)
   - "right2": number index of secondary array right pointer (high2 / end2)
   - "visited": number[] indices of sorted / finalized / settled elements
   - "targetIndex": number index where target is found or inserted
   - "wSum": number | string window sum / running prefix sum / current window accumulator / cumulative XOR
   - "mSum": number | string max subarray sum / peak profit / global target comparison accumulator
   - "pointer_labels": { "left"?: string, "right"?: string, "current"?: string, "mid"?: string, "left2"?: string, "right2"?: string }
   - SPECIALIZED SUB-TYPE EXTENSIONS:
     * Dutch National Flag (3-Way Partitioning): "dnfPartition": { "low": number, "mid": number, "high": number, "zeroBoundary"?: number, "twoBoundary"?: number }
     * Binary Search Partitioning: "binarySearchPartition": { "low": number, "mid": number, "high": number, "target": number, "found"?: boolean }
     * Sliding Window Span: "slidingWindowSpan": { "left": number, "right": number, "sum"?: number, "length"?: number, "valid"?: boolean }
     * Prefix Sum Projection: "prefixSumProjection": { "queryRange": [start, end], "prefixIndices": [start, end+1], "rangeSum": number }
     * Cyclic Sort Jump: "cyclicSortJump": { "fromIdx": number, "targetIdx": number, "val": number|string, "correctVal"?: number|string, "isDuplicate"?: boolean, "isMissing"?: boolean, "action"?: "swap"|"placed"|"duplicate_found"|"inspect" }
     * Array Swap Flight: "swapFlight": { "idx1": number, "idx2": number, "val1": number|string, "val2": number|string, "reason"?: string }

3. "linkedlist" & ADVANCED CACHE / EXPRESSWAY DESIGN STRUCTURES:
   - "list": (number | string)[] (List nodes in traversal order)
   - "secondaryList": (number | string)[]
   - "isDoubly": boolean (whether doubly linked)
   - "dummyNodeVal": number | string (sentinel dummy head)
   - "fastPointer": number | string (fast runner node value or index)
   - "slowPointer": number | string (slow runner node value or index)
   - "prevPointer", "currPointer", "nextPointer": number | string
   - "linkedListCycle" (Floyd's Tortoise & Hare):
     * { "hasCycle": boolean, "cycleEntryIndex"?: number, "cycleEntryVal"?: number|string, "slowIndex"?: number, "fastIndex"?: number, "slowVal"?: number|string, "fastVal"?: number|string, "collisionIndex"?: number, "collisionVal"?: number|string, "phase"?: "phase1_detection"|"phase2_entry_find"|"cycle_detected"|"no_cycle", "reason"?: string }
   - "linkedListReversal" (In-Place Pointer Inversion):
     * { "prevNode"?: number|string, "currNode"?: number|string, "nextNode"?: number|string, "reversedIndices"?: number[], "action"?: "advance_next"|"reverse_pointer"|"advance_prev"|"advance_curr"|"completed" }
   - "lruCache" (Least Recently Used Cache: Hash Map + Doubly Linked List):
     * { "capacity": number, "hashMap": Record<string, number|string>, "dllOrder": [{ "key": string|number, "val": number|string, "isHead"?: boolean, "isTail"?: boolean }], "mruKey"?: string|number, "lruKey"?: string|number, "evictedKey"?: string|number, "evictedVal"?: string|number, "action"?: "get"|"put"|"evict"|"mru_promote"|"cache_miss"|"cache_hit", "hitOrMiss"?: "hit"|"miss" }
   - "lfuCache" (Least Frequently Used Cache: Frequency Buckets + DLLs):
     * { "capacity": number, "size": number, "minFreq": number, "keyTable": Record<string|number, { "val": number|string, "freq": number }>, "freqTable": Record<number, [{ "key": string|number, "val": number|string, "isHead"?: boolean, "isTail"?: boolean }]>, "activeKey"?: string|number, "activeVal"?: string|number, "activeFreq"?: number, "evictedKey"?: string|number, "evictedVal"?: string|number, "evictedFreq"?: number, "action"?: "get"|"put"|"evict"|"freq_increment"|"cache_hit"|"cache_miss", "hitOrMiss"?: "hit"|"miss", "reason"?: string }
   - "skipList" (Multi-Level Probabilistic Expressways):
     * { "maxLevel": number, "currentLevel": number, "levels": [{ "levelIndex": number, "nodes": [{ "val": number|string, "span"?: number, "isHead"?: boolean, "isTail"?: boolean, "isMatch"?: boolean, "isPath"?: boolean }] }], "searchPath"?: [{ "level": number, "val": number|string, "action"?: "drop_down"|"step_forward"|"match" }], "targetVal"?: number|string, "found"?: boolean, "operation"?: "search"|"add"|"erase"|"build", "probabilisticHeight"?: number, "reason"?: string }
   - "disjointIntervals" (Data Stream As Disjoint Intervals / Range Module):
     * { "intervals": [number, number][], "queryPoint"?: number, "insertedInterval"?: [number, number], "overlappingIntervals"?: [number, number][], "mergedInterval"?: [number, number], "operation"?: "addNum"|"getIntervals"|"findInterval"|"merge"|"removeRange", "explanation"?: string }

4. "tree" (Binary Tree / BST / Heap / Trie / N-ary / Segment Tree / Fenwick Tree)
   - "tree": (number | string | null)[] (Level-order heap-indexed array with nulls)
   - "current": number | string active node value or index
   - "activeNodeId": number | string node ID
   - "visited": (number | string)[] visited node values
   - "queue": (number | string)[] active FIFO buffer for level-order BFS
   - "stack": (number | string)[] active call stack for DFS
   - "heapSwap": { "from": number, "to": number } for heapify swaps
   - "isMinHeap": boolean
   - "topKState": { "k": number, "heapType": "min"|"max", "elements": (number|string)[], "currentStreamElement"?: number|string, "action"?: "push"|"pop_and_push"|"ignore" }
   - "twoHeapsState": { "maxHeapSmallHalf": (number|string)[], "minHeapLargeHalf": (number|string)[], "median"?: number|string, "balanceStatus"?: string }
   - "treeTraversal": { "order": "preorder"|"inorder"|"postorder"|"levelorder"|"morris", "output": (number|string)[], "currentVisited"?: number|string, "stackOrQueue"?: (number|string)[] }
   - "treeStructural": { "maxDepth"?: number, "currentDepth"?: number, "currentHeight"?: number, "diameter"?: number, "diameterPath"?: (number|string)[], "isInverted"?: boolean, "invertedNodes"?: (number|string)[], "lcaNodes"?: { "p": number|string, "q": number|string, "lca"?: number|string }, "ancestorPathP"?: (number|string)[], "ancestorPathQ"?: (number|string)[], "treeProperties"?: { "isSymmetric"?: boolean, "isBalanced"?: boolean, "isSubtree"?: boolean } }
   - "bstState": { "target"?: number|string, "searchPath"?: (number|string)[], "decision"?: "go_left"|"go_right"|"found"|"insert_left"|"insert_right"|"not_found", "comparison"?: string, "rangeBounds"?: { "min": number|string|null, "max": number|string|null }, "isValidBst"?: boolean, "violationNode"?: number|string, "successor"?: number|string, "predecessor"?: number|string }
   - "trieState": { "word"?: string, "prefix"?: string, "operation"?: "insert"|"search"|"startsWith"|"traverse", "matchedChars"?: string[], "activeChar"?: string, "activeCharIndex"?: number, "remainingChars"?: string[], "isFound"?: boolean, "isPrefixFound"?: boolean, "activePath"?: (string|number)[], "endOfWordNodes"?: (string|number)[], "nodes"?: [{ "id": string|number, "char": string, "isEndOfWord"?: boolean, "word"?: string, "parentId"?: string|number, "children"?: Record<string, string|number> }] }
   - "naryTreeState": { "root"?: { "id": string|number, "val": number|string, "children": any[] }, "activeNodeId"?: string|number, "activePath"?: (string|number)[], "visitedNodeIds"?: (string|number)[], "levelOrderResult"?: (number|string)[][], "operation"?: "levelorder"|"preorder"|"postorder"|"serialize"|"deserialize"|"search" }
   - "segmentTreeState": { "originalArray": (number|string)[], "treeArray": (number|string|null)[], "queryRange"?: [number, number], "updateIndex"?: number, "updateValue"?: number|string, "operation"?: "build"|"query"|"update"|"range_sum"|"range_min"|"range_max", "aggregateResult"?: number|string, "activeTreeIndices"?: number[] }
   - "fenwickTreeState": { "originalArray": (number|string)[], "treeArray": (number|string)[], "operation"?: "build"|"query_prefix"|"query_range"|"update_point", "activeBitIndex"?: number, "jumpPath"?: number[], "queryRange"?: [number, number], "prefixSum"?: number|string, "formula"?: string }

5. "stack" & "queue" (LIFO, FIFO, Monotonic Stacks, Monotonic Deques, Circular Buffers, Geometric Spans)
   - "stack": (number | string)[]
   - "secondaryStack": (number | string)[]
   - "queue": (number | string)[]
   - "secondaryQueue": (number | string)[]
   - "deque": (number | string)[]
   - "stackInvariant": "increasing" | "decreasing"
   - "current": number | string value pushed/popped/enqueued/dequeued
   - "sightlines": [{ "fromIdx": number, "toIdx": number, "fromVal": number, "toVal": number, "status": "blocked"|"visible"|"settled" }]
   - "histogramSpan": { "activeIndex": number, "leftBoundary": number, "rightBoundary": number, "width": number, "height": number, "calculatedArea": number, "maxAreaSoFar": number }
   - "waterTrapped": { "currentIndex": number, "leftMax": number, "rightMax": number, "currentElevation": number, "waterTrappedAtCurrent": number, "totalWaterTrapped": number }
   - "bracketPair": { "openIndex": number, "closeIndex": number, "openChar": string, "closeChar": string, "status": "matching"|"mismatch"|"unclosed" }
   - "evalExpression": { "expression": string, "tokens": string[], "currentToken": string, "operatorStack": string[], "operandStack": (number|string)[], "lastOperation"?: string }
   - "monotonicDeque": { "deque": (number|string|{ "index": number, "val": number|string })[], "windowRange"?: [number, number], "k"?: number, "incomingVal"?: number|string, "incomingIdx"?: number, "frontEviction"?: { "index"?: number, "val"?: number|string, "reason"?: string }, "backEvictions"?: [{ "index"?: number, "val"?: number|string, "reason"?: string }], "windowMax"?: number|string, "status"?: string }
   - "circularBuffer": { "capacity": number, "front": number, "rear": number, "size": number, "buffer": (number|string|null)[], "isFull"?: boolean, "isEmpty"?: boolean, "lastOperation"?: string, "reason"?: string }
   - "bfsLevel": { "level": number, "levelNodes"?: (number|string)[], "levelSize"?: number, "processedInLevel"?: number, "isLevelComplete"?: boolean }

6. "graph" (Graph Traversal, Shortest Path, MST, Topo Sort, Union-Find, Word Ladder)
   - "graphEdges": [{ "from": string|number, "to": string|number, "weight"?: number|string, "directed"?: boolean, "color"?: string, "state"?: "active"|"mst"|"spt"|"rejected_cycle"|"cross_cut" }]
   - "isDirected": boolean
   - "distances": Record<string, number | string | null>
   - "priorityQueue": [{ "node": string|number, "dist": number|string }]
   - "relaxedEdge": { "from": string, "to": string, "weight": number|string, "oldDist"?: number|string, "newDist"?: number|string }
   - "shortestPathTree": [{ "from": string, "to": string }]
   - "shortestPathState": { "algorithm": "dijkstra"|"bellman-ford"|"a-star", "source": string|number, "target"?: string|number, "distances": Record<string, number>, "settledNodes": (string|number)[], "activeNode"?: string|number, "relaxingEdge"?: { "from": string|number, "to": string|number, "weight": number, "relaxed": boolean, "oldDist"?: number, "newDist"?: number }, "predecessorMap"?: Record<string, string|number>, "iteration"?: number, "hasNegativeCycle"?: boolean }
   - "mstState": { "algorithm": "kruskal"|"prim", "mstEdges": [{ "from": string|number, "to": string|number, "weight": number }], "totalWeight": number, "sortedEdgesQueue"?: [{ "from": string|number, "to": string|number, "weight": number, "status"?: "selected"|"rejected_cycle"|"pending" }], "currentEdge"?: { "from": string|number, "to": string|number, "weight": number }, "inMstCutSet"?: (string|number)[], "isComplete"?: boolean }
   - "topologicalSortState": { "inDegree": Record<string, number>, "zeroInDegreeQueue": (string|number)[], "topoOrder": (string|number)[], "hasCycle"?: boolean, "activeNode"?: string|number }
   - "unionFindState": { "parent": Record<string, string|number>, "rank"?: Record<string, number>, "size"?: Record<string, number>, "count": number, "activeUnion"?: { "u": string|number, "v": string|number, "rootU": string|number, "rootV": string|number, "merged": boolean } }
   - "wordLadderState": { "beginWord": string, "endWord": string, "currentWord": string, "ladder": string[], "queue": string[], "visited": string[] }

7. "dp" (Dynamic Programming 1D & 2D Tables)
   - "dp1dState": { "array": (number|string|null)[], "currentIndex"?: number, "targetIndex"?: number, "baseCaseIndices"?: number[], "dependencies"?: [{ "fromIdx": number, "toIdx": number, "label"?: string }], "currentFormula"?: string }
   - "dp2dState": { "matrix": (number|string|null)[][], "currentRow"?: number, "currentCol"?: number, "dependencies"?: [{ "row": number, "col": number, "label"?: string }], "currentFormula"?: string, "transitionChoices"?: [{ "label": string, "cost": number|string, "isOptimal"?: boolean }], "optimalChoiceIdx"?: number }

8. "recursion" (Call Stack Frames & Recursion Trees)
   - "callStack": [{ "frameId": string, "functionName": string, "args": Record<string, any>, "localVars"?: Record<string, any>, "line": number }]
   - "recursionTree": [{ "id": string, "name": string, "args": Record<string, any>, "state": "calling"|"active"|"returned"|"backtracking", "returnValue"?: any, "children"?: any[] }]
   - "activeFrameId": string
   - "memoTable": Record<string, any>
   - "memoHitKey": string
   - "prunedBranchId": string

9. "string" (Pattern Matching: KMP, Rabin-Karp, Aho-Corasick)
   - "lps": number[]
   - "patternStr": string
   - "textStr": string
   - "patternIndex": number
   - "textIndex": number
   - "kmpState": { "pattern": string, "text"?: string, "lpsTable": number[], "patternIndex"?: number, "textIndex"?: number, "alignmentOffset"?: number, "isMatch"?: boolean, "isMismatch"?: boolean, "matchedIndices"?: number[], "phase"?: "lps_construction"|"text_search"|"match_found", "mismatchFallback"?: { "fromJ": number, "toJ": number, "reason": string } }
   - "rabinKarpState": { "pattern": string, "text": string, "patternHash": number|string, "windowHash": number|string, "windowStart": number, "windowLength": number, "base": number, "modulus": number, "highestPower"?: number, "isHashMatch"?: boolean, "isSpuriousHit"?: boolean, "rollingFormula"?: string }
   - "ahoCorasickState": { "keywords": string[], "text"?: string, "textIndex"?: number, "currentStateId"?: string|number, "nodes": [{ "id": string|number, "char": string, "isRoot"?: boolean, "transitions": Record<string, string|number>, "failureLinkId": string|number, "dictionaryMatches": string[] }], "emittedMatches"?: [{ "pattern": string, "startIndex": number, "endIndex": number }], "activeLinkType"?: "goto"|"fail"|"dict" }
   - "stringPatternState": { "algorithm": "kmp"|"rabin-karp"|"aho-corasick", "kmpState"?: any, "rabinKarpState"?: any, "ahoCorasickState"?: any }

10. "bit" (Bit Manipulation & Register Engine)
    - "bitRegisterState": { "value": number, "bitLength"?: number, "bits": [{ "index": number, "value": 0|1, "label"?: string, "isHighlighted"?: boolean }], "mask"?: number, "maskBits"?: (0|1)[], "operation"?: "AND"|"OR"|"XOR"|"NOT"|"SHL"|"SHR"|"POPCOUNT"|"BIT_CHECK"|"BIT_SET"|"BIT_CLEAR", "operand"?: number, "result"?: number, "explanation"?: string }

11. "intervals" (Intervals, Sweep Line, Collisions, Disjoint Sets)
    - "intervals": Array<{ "start": number, "end": number, "label"?: string, "status"?: "active"|"merged"|"conflict" }>
    - "sweepLine": number active vertical timeline scrubber position
    - "activeIntervalIndex": number index of interval being evaluated
    - "intervalCollisionState": { "intervalA": [number, number], "intervalB": [number, number], "isOverlapping": boolean, "overlapRange"?: [number, number], "resolution"?: "merged"|"skipped"|"conflict" }
    - "disjointIntervals": { "intervals": [number, number][], "queryPoint"?: number, "insertedInterval"?: [number, number], "overlappingIntervals"?: [number, number][], "mergedInterval"?: [number, number], "operation"?: "addNum"|"getIntervals"|"findInterval"|"merge"|"removeRange", "explanation"?: string }

12. "map" / "set" (Hash Maps & Hash Sets)
    - "map": Record<string, number | string | null>
    - "set": (number | string)[]
    - "array": (number | string)[]
    - "current": active value being looked up or inserted
    - "left": current iteration index in array
    - "targetIndex": matching complement index found

13. "composite" (Synchronized Multi-Data Structure Layouts)
    - "compositeLayoutState": { "mode": "horizontal"|"vertical"|"grid", "leftStructure": { "type": string, "title"?: string }, "rightStructure": { "type": string, "title"?: string } }
    - "activeDataset": string identifying active structure in focus ("array", "map", "stack", "queue", "tree", "list")
    - "shiftInfo": { "from"?: string, "to"?: string, "action"?: "read"|"write"|"push"|"pop"|"lookup"|"compare"|"merge"|"shift"|"evict"|"swap", "reason"?: string }

======================================================================
EXECUTION & PEDAGOGY RULES:
======================================================================
1. VERBATIM USER PSEUDOCODE:
   - "code_lines" MUST contain the candidate's exact pseudocode lines verbatim in identical order.
   - Set "line" (0-indexed) to the exact line executing for each step.

2. GRANULAR CELL-BY-CELL & STEP-BY-STEP SIMULATION:
   - For all loops, 2D grids, pointer traversals, trees, queues, and caches:
     * DO NOT collapse or summarize whole loops into a single step.
     * Iterate cell-by-cell and node-by-node through EVERY iteration.
     * For 2D matrices, ALWAYS set "current": "r,c" to highlight the exact cell being scanned or modified.
     * When checking or zeroing rows/cols, update "highlightRows": [r] or "highlightCols": [c] dynamically.
     * For 1D arrays, set "left", "right", and "current" indices on every single step.

3. RICH STEP DESCRIPTIONS ("desc"):
   - Clearly explain: (1) line executed, (2) live variable & pointer values, (3) condition checks (True/False), (4) exact mutations.
   - Use candidate's exact variable names.

4. FULL SCAN & MULTI-COMPONENT TRAVERSAL:
   - For 2D grid/island or multi-component graph algorithms: You MUST evaluate ALL separate islands/components across the entire input dataset before ending.

5. PAGINATION & STEP LIMITS:
   - You MUST generate NO MORE THAN 20 steps per response to prevent token truncation.
   - If the algorithm has finished execution (reached the final return statement), set "is_complete": true at the end of the JSON.
   - If the algorithm has NOT finished execution by step 20, set "is_complete": false.
   - Never generate more than 20 items in the "viz_steps" array.

6. MANDATORY STEP GENERATION FOR ALL CHOSEN DATA STRUCTURES & DUAL SEQUENCES:
   - When the algorithm operates on multiple data structures (e.g. primary "array" AND "secondaryArray", or array + hashmap / stack / queue):
     * You MUST generate steps and update pointer positions / values for EVERY selected data structure across the trace!
     * NEVER leave secondaryArray or any selected secondary structure dormant, static, or untraversed!
     * For dual sequences / two arrays:
       - Actively track and advance pointers on BOTH arrays on every step:
         * Primary array: set "left", "right", and/or "current".
         * Secondary array: set "left2" and/or "right2" on EVERY step where elements are inspected, compared, or processed.
       - Use "pointer_labels" to clearly describe pointers on both arrays (e.g. { "current": "msg_i", "left2": "time_i" }).
       - Provide "datasetLabels": { "primary": "Message Stream", "secondaryArray": "Timestamps" } (or descriptive names) to clearly indicate each dataset's role.`;

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
  dataStructureType,
  previousContext,
  currentStepOffset,
  executionPlan,
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
  dataStructureType?: string;
  previousContext?: string;
  currentStepOffset?: number;
  executionPlan?: Array<{
    step_number: number;
    line_index: number;
    code_action: string;
    description: string;
  }>;
  pseudocode: string;
}) {
  const isIslandOrFloodFill =
    dataStructureType === "matrix" ||
    /island|max.*area|number[- ]of[- ]islands|flood[- ]fill|rotting[- ]oranges|surrounded[- ]regions|walls[- ]and[- ]gates|pacific[- ]atlantic/i.test(
      title,
    ) ||
    /in_bounds|\bdr,\s*dc\b|\bdirections\b|is_island/i.test(pseudocode);

  const isMatrixTransformation =
    !isIslandOrFloodFill &&
    (Boolean(matrixExample && matrixExample.length > 0) ||
      /matrix|rotate[- ]image|spiral|game[- ]of[- ]life|sudoku|grid|row.*col/i.test(title) ||
      /matrix\[i\]\[j\]|matrix\[r\]\[c\]|matrix\[row\]\[col\]|setZeroes|sentinel/i.test(pseudocode));

  const isTree =
    dataStructureType === "tree" ||
    /tree|level[- ]order|zigzag|right-side-view|bst|heap|priority[- ]queue|trie|segment[- ]tree|fenwick|binary[- ]indexed/i.test(title) ||
    /TreeNode|node\.left|node\.right|root|heapify|trie/i.test(pseudocode);

  const isDesignDs =
    /lfu|least[- ]frequently[- ]used|lru|least[- ]recently[- ]used|skiplist|skip[- ]list|disjoint[- ]intervals|data[- ]stream[- ]as[- ]disjoint|range[- ]module/i.test(title) ||
    /lfu|skiplist|freqTable|keyTable|dllOrder/i.test(pseudocode);

  const isGraph =
    dataStructureType === "graph" ||
    /dijkstra|shortest[- ]path|bellman[- ]ford|kruskal|prim|spanning[- ]tree|topological|course[- ]schedule|union[- ]find|dsu|disjoint[- ]set|word[- ]ladder/i.test(title) ||
    /in_degree|adj\[|visited\.add|find\(|union\(/i.test(pseudocode);

  const isStackQueue =
    dataStructureType === "stack" ||
    dataStructureType === "queue" ||
    /monotonic[- ]stack|next[- ]greater|daily[- ]temperatures|largest[- ]rectangle|trapping[- ]rain[- ]water|sliding[- ]window[- ]max|circular[- ]queue|circular[- ]deque/i.test(title) ||
    /stack\.pop|stack\.append|deque\.popleft|deque\.append/i.test(pseudocode);

  const isDp =
    dataStructureType === "dp" ||
    /dynamic[- ]programming|knapsack|longest[- ]common[- ]subsequence|edit[- ]distance|coin[- ]change|climbing[- ]stairs|house[- ]robber/i.test(title) ||
    /dp\[i\]|dp\[r\]\[c\]|memo\[/i.test(pseudocode);

  const isStringPattern =
    dataStructureType === "string" ||
    /kmp|knuth[- ]morris|lps|rabin[- ]karp|rolling[- ]hash|aho[- ]corasick|pattern[- ]match/i.test(title) ||
    /compute_lps|rolling_hash/i.test(pseudocode);

  const isBit =
    dataStructureType === "bit" ||
    /bit|bitwise|single[- ]number|counting[- ]bits|reverse[- ]bits|power[- ]of[- ]two/i.test(title) ||
    /\^|&|<<|>>/i.test(pseudocode);

  const safeExample = Array.isArray(example) && example.length > 0 ? example : [1, 2, 3];
  let sampleGuidance = `Input: [${safeExample.join(", ")}].${targetExample !== undefined ? ` Target = ${targetExample}.` : ""}`;

  if (secondaryArrayExample && secondaryArrayExample.length > 0) {
    sampleGuidance = `Input primary array: ${JSON.stringify(safeExample)}, secondaryArray: ${JSON.stringify(secondaryArrayExample)}.${targetExample !== undefined ? ` Target = ${targetExample}.` : ""}
MANDATORY DUAL-SEQUENCE TRAVERSAL:
- You MUST actively traverse and update pointers on BOTH arrays in 'viz_steps'!
- Primary array: set "left", "right", and/or "current" for each element processed.
- Secondary array: set "left2" and/or "right2" (or active secondary index) corresponding to the element being checked/compared/stored.
- NEVER leave secondaryArray stationary or untraversed!
- Set "pointer_labels" (e.g. { "current": "msg", "left2": "timestamp" }) and "datasetLabels" (e.g. { "primary": "Messages", "secondaryArray": "Timestamps" }).`;
  } else if (isIslandOrFloodFill || isMatrixTransformation) {
    const gridRows =
      matrixExample && matrixExample.length > 0
        ? matrixExample
        : [
            [0, 0, 1, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 0, 0, 0, 1],
            [0, 1, 1, 0, 1, 0, 0, 0],
            [0, 1, 0, 0, 1, 1, 0, 0],
          ];
    sampleGuidance = `Input matrix = ${JSON.stringify(gridRows)}, cols = ${gridRows[0]?.length ?? 4}.
For island/matrix problems:
- "current": "r,c"
- "visited": ["r1,c1", "r2,c2", ...]
- "islandCells": ["r,c", ...] for active island
- "currentArea" (or "wSum"): count of land cells in active island
- "maxArea" (or "mSum"): all-time peak island area
- "direction": "DOWN (+1, 0)" | "UP (-1, 0)" | "RIGHT (0, +1)" | "LEFT (0, -1)"
- "frontier": ["r,c", ...] for BFS wavefront
- "distanceLayer": integer distance level
- "directionRay": { from: [r,c], to: [nr,nc], direction: "UP", status: "valid" }
- "rotationOrbit": { ringLayer: 0, orbit4: [...] } for 90-deg rotations
- "kernel8Neighbor": { center: [r,c], aliveCount: N } for Game of Life
- "backtrackingRibbon": { path: [[r,c], ...] } for Word Search`;
  } else if (isDesignDs) {
    sampleGuidance = `Design Data Structure problem detected.
- If LFU Cache: populate "lfuCache" with capacity, size, minFreq, keyTable, freqTable (bucket doubly-linked lists), activeKey, activeVal, activeFreq, evictedKey, action ("get"|"put"|"evict"|"freq_increment"), hitOrMiss ("hit"|"miss").
- If Skip List: populate "skipList" with maxLevel, currentLevel, levels (array of level expressways with nodes), searchPath (traversal step_forward / drop_down drops), targetVal, found.
- If Disjoint Intervals: populate "disjointIntervals" with intervals ([start, end] pairs), queryPoint, insertedInterval, mergedInterval, operation.
- If LRU Cache: populate "lruCache" with capacity, hashMap, dllOrder, mruKey, lruKey, evictedKey, action, hitOrMiss.`;
  } else if (isTree) {
    const treeArr = treeExample ?? [3, 9, 20, null, null, 15, 7];
    sampleGuidance = `Input tree = ${JSON.stringify(treeArr)}.
- Update 'queue' and 'tree' dynamically across steps.
- For BST: populate "bstState" with searchPath, decision ("go_left"|"go_right"|"found"), rangeBounds, isValidBst.
- For Heap: populate "heapSwap": { from, to } and "twoHeapsState" / "topKState".
- For Trie: populate "trieState" with activeChar, word, matchedChars, activePath.
- For Segment Tree: populate "segmentTreeState" with queryRange, updateIndex, updateValue, activeTreeIndices.
- For Fenwick Tree: populate "fenwickTreeState" with activeBitIndex, jumpPath, formula ("idx += idx & -idx").`;
  } else if (isGraph) {
    sampleGuidance = `Graph / Network problem detected.
- Populate "graphEdges": [{ from, to, weight, state: "active"|"mst"|"spt" }]
- For Dijkstra: populate "shortestPathState" with distances, settledNodes, activeNode, relaxingEdge, predecessorMap.
- For Kruskal/Prim MST: populate "mstState" with mstEdges, totalWeight, sortedEdgesQueue, currentEdge.
- For Topo Sort: populate "topologicalSortState" with inDegree, zeroInDegreeQueue, topoOrder.
- For Union-Find: populate "unionFindState" with parent, rank, size, count, activeUnion.`;
  } else if (isStackQueue) {
    sampleGuidance = `Stack / Queue / Monotonic problem detected.
- Populate "stack", "queue", or "deque" with items.
- For Monotonic Stack: populate "stackInvariant" ("increasing"|"decreasing"), "sightlines", "histogramSpan", "waterTrapped", "bracketPair".
- For Monotonic Deque: populate "monotonicDeque" with deque, windowRange, incomingVal, frontEviction, backEvictions, windowMax.
- For Circular Queue: populate "circularBuffer" with capacity, front, rear, size, buffer, isFull, isEmpty.`;
  } else if (isDp) {
    sampleGuidance = `Dynamic Programming problem detected.
- For 1D DP: populate "dp1dState" with array, currentIndex, targetIndex, dependencies [{ fromIdx, toIdx }], currentFormula.
- For 2D DP: populate "dp2dState" with matrix, currentRow, currentCol, dependencies [{ row, col }], currentFormula, transitionChoices, optimalChoiceIdx.`;
  } else if (isStringPattern) {
    sampleGuidance = `String Pattern Matching problem detected.
- For KMP: populate "kmpState" with pattern, text, lpsTable, patternIndex, textIndex, alignmentOffset, phase, mismatchFallback.
- For Rabin-Karp: populate "rabinKarpState" with pattern, text, patternHash, windowHash, windowStart, windowLength, isHashMatch.
- For Aho-Corasick: populate "ahoCorasickState" with keywords, text, textIndex, currentStateId, nodes, emittedMatches.`;
  } else if (isBit) {
    sampleGuidance = `Bit Manipulation problem detected.
- Populate "bitRegisterState" with value, bitLength, bits ([{ index, value: 0|1, isHighlighted }]), mask, maskBits, operation ("AND"|"OR"|"XOR"|"SHL"|"SHR"|"POPCOUNT"), result, explanation.`;
  }

  const isLongerDataset = /longer|complex|dataset\s*2/i.test(datasetLabel ?? "");
  const datasetContext = datasetLabel
    ? `\nActive Dataset: "${datasetLabel}" ${datasetDescription ? `(${datasetDescription})` : ""}\n${
        isLongerDataset
          ? "EXTENDED DATASET: This will require multiple generations. Generate exactly 10 rich steps, then set is_complete=false. I will call you back for the rest.\n"
          : "Simulate the entire dataset from first line to final return. If it takes more than 10 steps, set is_complete=false.\n"
      }`
    : "";

  const planContext =
    executionPlan && executionPlan.length > 0
      ? `\nAlgorithmic Execution Plan from Reviewer:\n${executionPlan
          .map(
            (p) =>
              `- Step ${p.step_number} (Line ${p.line_index}): ${p.code_action} — ${p.description}`,
          )
          .join("\n")}\n`
      : "";

  const previousContextText = previousContext
    ? `\n======================================================
PREVIOUS EXECUTION CONTEXT (Rolling Window):
======================================================
The following steps were just generated in the previous batch. 
CONTINUE exactly from where this left off, maintaining the same variables and state. DO NOT repeat these steps.
${previousContext}
======================================================\n`
    : "";

  const isContinuation = typeof currentStepOffset === "number" && currentStepOffset > 0;

  const instructionsText = isContinuation
    ? `CRITICAL CONTINUATION INSTRUCTIONS:
1. Steps 1 through ${currentStepOffset} have ALREADY been simulated.
2. DO NOT restart the algorithm or execute from line 0.
3. DO NOT clear, reset, or reinitialize variables (e.g. visited sets, queue, cloned node hash maps, pointers, accumulators).
4. Generate the NEXT sequence of steps starting from Step ${currentStepOffset + 1}.
5. If the algorithm genuinely finishes (worklist/queue empty, loops complete, or final return line reached), set "is_complete": true. Otherwise set "is_complete": false.`
    : `CRITICAL INSTRUCTIONS:
1. "total_expected_steps": Estimate the total number of simulation steps required for this dataset from start to completion.
2. "execution_plan": Output the list of execution steps specifically for this dataset ({ step_number, line_index, code_action, description }).
3. If this dataset takes more than 10 steps, generate the first 10 steps with high quality and set "is_complete": false. If the entire simulation completes within 10 steps, set "is_complete": true.`;

  return `Problem: "${title}".
Statement:
${statement}
${datasetContext}
${sampleGuidance}
${planContext}${previousContextText}
User Pseudocode to Trace:
\`\`\`
${pseudocode}
\`\`\`

Generate the step-by-step visualizer JSON object matching the data structure markers and direction tags for this dataset.

${instructionsText}`;
}


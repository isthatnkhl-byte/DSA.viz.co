import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Pen,
  Square,
  Circle,
  MoveRight,
  Type,
  Eraser,
  Trash2,
  Download,
  Sparkles,
  Cpu,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Copy,
  Grid,
  ZoomIn,
  ZoomOut,
  Flame,
  Undo2,
  Redo2,
  ChevronDown,
  Code2,
  HelpCircle,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { WhiteboardElement } from "@/lib/crdt-collab.server";

export interface AiWhiteboardProps {
  roomId?: string;
  isAiTeaching?: boolean;
  aiTeachingMessage?: string | null;
  externalElements?: WhiteboardElement[];
  onElementCreated?: (element: WhiteboardElement) => void;
  onClearBoard?: () => void;
  readOnly?: boolean;
}

type DrawTool = "pen" | "arrow" | "rect" | "circle" | "text" | "eraser" | "laser";
type GridStyle = "dots" | "grid" | "plain";

interface AlgorithmicStep {
  stepIndex: number;
  title: string;
  description: string;
  mathFormula?: string;
  codeLine?: number;
  variables?: Record<string, string | number>;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  data: any;
}

interface AlgorithmicSimulation {
  id:
    | "two_pointers"
    | "binary_search"
    | "sliding_window"
    | "linked_list"
    | "tree"
    | "monotonic_stack"
    | "none";
  name: string;
  category: string;
  badge: string;
  accentColor: string;
  pseudocode: string[];
  supportsCustomArray?: boolean;
  steps: AlgorithmicStep[];
}

const COLOR_PALETTE = [
  { name: "Cyan", value: "#38bdf8" },
  { name: "Emerald", value: "#34d399" },
  { name: "Purple", value: "#c084fc" },
  { name: "Amber", value: "#fbbf24" },
  { name: "Rose", value: "#fb7185" },
  { name: "White", value: "#f8fafc" },
];

function buildTwoPointersSteps(arr: number[], target: number): AlgorithmicStep[] {
  const sorted = [...arr].sort((a, b) => a - b);
  const steps: AlgorithmicStep[] = [];
  let l = 0;
  let r = sorted.length - 1;
  const pruned: number[] = [];
  let stepIdx = 0;

  while (l < r && stepIdx < 12) {
    const sum = sorted[l]! + sorted[r]!;
    const isMatch = sum === target;
    const isGreater = sum > target;

    steps.push({
      stepIndex: stepIdx,
      title: isMatch
        ? `Optimal Pair Found at [${l}, ${r}]!`
        : stepIdx === 0
        ? "Initialize Boundary Pointers"
        : isGreater
        ? `Sum (${sum}) > Target (${target}) → Shift R Left`
        : `Sum (${sum}) < Target (${target}) → Shift L Right`,
      description: isMatch
        ? `arr[${l}] (${sorted[l]}) + arr[${r}] (${sorted[r]}) == ${target}. Invariant satisfied in O(N) time!`
        : isGreater
        ? `Because the array is sorted, pairing arr[${r}]=${sorted[r]} with any element >= arr[${l}] exceeds ${target}. Prune index ${r} and decrement R.`
        : `Because the array is sorted, pairing arr[${l}]=${sorted[l]} with any element <= arr[${r}] is below ${target}. Prune index ${l} and increment L.`,
      mathFormula: `L=${l} (${sorted[l]}), R=${r} (${sorted[r]}) → Sum = ${sorted[l]} + ${sorted[r]} = ${sum} ${
        isMatch ? "==" : isGreater ? ">" : "<"
      } ${target}`,
      codeLine: isMatch ? 4 : isGreater ? 6 : 8,
      variables: {
        L: l,
        R: r,
        "arr[L]": sorted[l]!,
        "arr[R]": sorted[r]!,
        sum,
        target,
      },
      quiz: !isMatch
        ? {
            question: `Current sum is ${sum} and target is ${target}. Which pointer should move next?`,
            options: [
              "Increment Left (L++) to increase sum",
              "Decrement Right (R--) to decrease sum",
              "Move both L++ and R-- simultaneously",
            ],
            correctIndex: isGreater ? 1 : 0,
            explanation: isGreater
              ? `Since ${sum} > ${target} and the array is sorted ascending, only decrementing R can reduce the sum.`
              : `Since ${sum} < ${target} and the array is sorted ascending, only incrementing L can increase the sum.`,
          }
        : undefined,
      data: {
        array: sorted,
        pointers: [
          { label: "L", index: l, color: "#34d399" },
          { label: "R", index: r, color: "#fb7185" },
        ],
        activeSum: sum,
        target,
        highlightIndices: [l, r],
        matchFound: isMatch,
        prunedIndices: [...pruned],
      },
    });

    if (isMatch) break;
    if (isGreater) {
      pruned.push(r);
      r--;
    } else {
      pruned.push(l);
      l++;
    }
    stepIdx++;
  }

  return steps.length > 0
    ? steps
    : [
        {
          stepIndex: 0,
          title: "No Valid Pair Found",
          description: "Pointers crossed without finding target sum.",
          mathFormula: "L >= R",
          codeLine: 9,
          variables: { L: l, R: r, target },
          data: { array: sorted, pointers: [], highlightIndices: [], prunedIndices: [] },
        },
      ];
}

function buildBinarySearchSteps(arr: number[], target: number): AlgorithmicStep[] {
  const sorted = [...arr].sort((a, b) => a - b);
  const steps: AlgorithmicStep[] = [];
  let low = 0;
  let high = sorted.length - 1;
  const pruned: number[] = [];
  let stepIdx = 0;

  while (low <= high && stepIdx < 10) {
    const mid = Math.floor((low + high) / 2);
    const val = sorted[mid]!;
    const isMatch = val === target;
    const isLess = val < target;

    steps.push({
      stepIndex: stepIdx,
      title: isMatch
        ? `Target ${target} Found at Index ${mid}!`
        : `Search Window [${low}..${high}] • Mid = ${mid}`,
      description: isMatch
        ? `arr[${mid}] == ${target}! Binary search located the target in ${stepIdx + 1} logarithmic steps.`
        : isLess
        ? `arr[${mid}] = ${val} < ${target}. Discard left half [${low}..${mid}] and set Low = ${mid + 1}.`
        : `arr[${mid}] = ${val} > ${target}. Discard right half [${mid}..${high}] and set High = ${mid - 1}.`,
      mathFormula: `Mid = ⌊(${low} + ${high})/2⌋ = ${mid} → arr[${mid}] = ${val} ${
        isMatch ? "==" : isLess ? "<" : ">"
      } ${target}`,
      codeLine: isMatch ? 4 : isLess ? 6 : 8,
      variables: {
        low,
        mid,
        high,
        "arr[mid]": val,
        target,
      },
      quiz: !isMatch
        ? {
            question: `arr[mid] is ${val} while target is ${target}. How do we update the search space?`,
            options: [
              `Search Right Half: low = mid + 1 (${mid + 1})`,
              `Search Left Half: high = mid - 1 (${mid - 1})`,
              `Linear scan from mid`,
            ],
            correctIndex: isLess ? 0 : 1,
            explanation: isLess
              ? `Because ${val} < ${target}, every element at or left of index ${mid} is also < ${target}. So low = mid + 1.`
              : `Because ${val} > ${target}, every element at or right of index ${mid} is also > ${target}. So high = mid - 1.`,
          }
        : undefined,
      data: {
        array: sorted,
        low,
        mid,
        high,
        target,
        highlightIndices: [mid],
        matchFound: isMatch,
        prunedIndices: [...pruned],
      },
    });

    if (isMatch) break;
    if (isLess) {
      for (let i = low; i <= mid; i++) pruned.push(i);
      low = mid + 1;
    } else {
      for (let i = mid; i <= high; i++) pruned.push(i);
      high = mid - 1;
    }
    stepIdx++;
  }

  return steps;
}

const PRESET_SIMULATIONS: Record<string, AlgorithmicSimulation> = {
  two_pointers: {
    id: "two_pointers",
    name: "Two Pointers (Target Sum)",
    category: "Arrays & Pointers",
    badge: "O(N) Time • O(1) Space",
    accentColor: "#38bdf8",
    supportsCustomArray: true,
    pseudocode: [
      "1. left = 0, right = n - 1",
      "2. while left < right:",
      "3.   sum = arr[left] + arr[right]",
      "4.   if sum == target: return [left, right]",
      "5.   else if sum > target:",
      "6.     right -= 1  // prune largest",
      "7.   else:",
      "8.     left += 1   // prune smallest",
    ],
    steps: buildTwoPointersSteps([1, 3, 5, 8, 12, 17, 21], 17),
  },
  binary_search: {
    id: "binary_search",
    name: "Binary Search Range Halving",
    category: "Divide & Conquer",
    badge: "O(log N) Time • O(1) Space",
    accentColor: "#34d399",
    supportsCustomArray: true,
    pseudocode: [
      "1. low = 0, high = n - 1",
      "2. while low <= high:",
      "3.   mid = (low + high) // 2",
      "4.   if arr[mid] == target: return mid",
      "5.   else if arr[mid] < target:",
      "6.     low = mid + 1   // discard left half",
      "7.   else:",
      "8.     high = mid - 1  // discard right half",
    ],
    steps: buildBinarySearchSteps([2, 5, 8, 12, 16, 23, 38, 56, 72, 91], 23),
  },
  sliding_window: {
    id: "sliding_window",
    name: "Sliding Window (Max Subarray k=3)",
    category: "Subarrays",
    badge: "O(N) Time • O(1) Space",
    accentColor: "#fbbf24",
    pseudocode: [
      "1. windowSum = sum(arr[0..k-1])",
      "2. maxSum = windowSum",
      "3. for right in range(k, n):",
      "4.   windowSum += arr[right] - arr[right - k]",
      "5.   maxSum = max(maxSum, windowSum)",
      "6. return maxSum",
    ],
    steps: [
      {
        stepIndex: 0,
        title: "Initial Window [0..2]",
        description: "Compute sum of first k=3 elements: 2 + 1 + 5 = 8. Initialize windowSum = 8, maxSum = 8.",
        mathFormula: "Window [2, 1, 5] → windowSum = 8, maxSum = 8",
        codeLine: 1,
        variables: { winStart: 0, winEnd: 2, windowSum: 8, maxSum: 8, k: 3 },
        quiz: {
          question: "When sliding the window from [0..2] to [1..3], how do we compute the new sum in O(1)?",
          options: [
            "Subtract outgoing arr[0] (2) and add incoming arr[3] (1)",
            "Re-sum all elements in [1..3] using a nested loop",
            "Sort the window first",
          ],
          correctIndex: 0,
          explanation: "Sliding window avoids O(K) re-summation by subtracting the leaving element and adding the entering element in O(1).",
        },
        data: {
          array: [2, 1, 5, 1, 3, 2],
          windowStart: 0,
          windowEnd: 2,
          currentSum: 8,
          maxSum: 8,
          k: 3,
        },
      },
      {
        stepIndex: 1,
        title: "Slide Right: Drop arr[0], Add arr[3]",
        description: "Slide window to [1..3]: subtract outgoing arr[0]=2, add incoming arr[3]=1. New sum = 7.",
        mathFormula: "windowSum = 8 - 2 + 1 = 7 | maxSum = max(8, 7) = 8",
        codeLine: 4,
        variables: { winStart: 1, winEnd: 3, outgoing: 2, incoming: 1, windowSum: 7, maxSum: 8 },
        data: {
          array: [2, 1, 5, 1, 3, 2],
          windowStart: 1,
          windowEnd: 3,
          currentSum: 7,
          maxSum: 8,
          k: 3,
        },
      },
      {
        stepIndex: 2,
        title: "New Peak Found at Window [2..4]!",
        description: "Slide right: subtract arr[1]=1, add arr[4]=3. New windowSum = 7 - 1 + 3 = 9. Update maxSum = 9!",
        mathFormula: "windowSum = 7 - 1 + 3 = 9 → maxSum = 9 (New Maximum!)",
        codeLine: 5,
        variables: { winStart: 2, winEnd: 4, outgoing: 1, incoming: 3, windowSum: 9, maxSum: 9 },
        data: {
          array: [2, 1, 5, 1, 3, 2],
          windowStart: 2,
          windowEnd: 4,
          currentSum: 9,
          maxSum: 9,
          k: 3,
        },
      },
      {
        stepIndex: 3,
        title: "Final Window [3..5] Complete",
        description: "Slide right: subtract arr[2]=5, add arr[5]=2. windowSum = 9 - 5 + 2 = 6. Global maxSum remains 9.",
        mathFormula: "Window [1, 3, 2] → windowSum = 6 | Global Max = 9",
        codeLine: 6,
        variables: { winStart: 3, winEnd: 5, windowSum: 6, maxSum: 9 },
        data: {
          array: [2, 1, 5, 1, 3, 2],
          windowStart: 3,
          windowEnd: 5,
          currentSum: 6,
          maxSum: 9,
          k: 3,
          matchFound: true,
        },
      },
    ],
  },
  monotonic_stack: {
    id: "monotonic_stack",
    name: "Monotonic Stack (Next Greater)",
    category: "Stacks & Queues",
    badge: "O(N) Amortized • O(N) Space",
    accentColor: "#f472b6",
    pseudocode: [
      "1. stack = [], ans = [-1] * n",
      "2. for i in range(n):",
      "3.   while stack and arr[i] > arr[stack.top()]:",
      "4.     idx = stack.pop()",
      "5.     ans[idx] = arr[i]  // Next Greater found!",
      "6.   stack.push(i)",
    ],
    steps: [
      {
        stepIndex: 0,
        title: "Push Decreasing Prefix [2, 1]",
        description: "Indices 0 (val 2) and 1 (val 1) are pushed onto the decreasing monotonic stack because 1 < 2.",
        mathFormula: "Stack (indices): [0 (2), 1 (1)] • Waiting for a larger element",
        codeLine: 6,
        variables: { i: 1, "arr[i]": 1, stackVals: "[2, 1]", ans: "[-1, -1, -1, -1, -1]" },
        quiz: {
          question: "Incoming element at index 2 is 5. What happens to the stack [2, 1]?",
          options: [
            "Pop both 1 and 2 because 5 > 1 and 5 > 2; record 5 as their Next Greater Element",
            "Push 5 on top without popping anything",
            "Clear stack without updating answers",
          ],
          correctIndex: 0,
          explanation: "5 breaks the monotonic decreasing order, resolving Next Greater Element for both 1 and 2 in O(1) amortized time!",
        },
        data: {
          array: [2, 1, 5, 3, 6],
          activeIdx: 1,
          stackIndices: [0, 1],
          resolved: [-1, -1, -1, -1, -1],
        },
      },
      {
        stepIndex: 1,
        title: "Element 5 Pops 1 and 2!",
        description: "arr[2] = 5 > top(1) and > next(2). Pop both! Set ans[1] = 5 and ans[0] = 5, then push index 2 (val 5).",
        mathFormula: "5 > 1 (pop → ans[1]=5), 5 > 2 (pop → ans[0]=5), push(5)",
        codeLine: 5,
        variables: { i: 2, "arr[i]": 5, stackVals: "[5]", ans: "[5, 5, -1, -1, -1]" },
        data: {
          array: [2, 1, 5, 3, 6],
          activeIdx: 2,
          stackIndices: [2],
          resolved: [5, 5, -1, -1, -1],
        },
      },
      {
        stepIndex: 2,
        title: "Push 3, Then 6 Resolves All!",
        description: "Index 3 (val 3) pushes onto [5]. Then arr[4] = 6 pops both 3 and 5! Final Next Greater array: [5, 5, 6, 6, -1].",
        mathFormula: "6 > 3 (pop → ans[3]=6), 6 > 5 (pop → ans[2]=6) • Complete!",
        codeLine: 5,
        variables: { i: 4, "arr[i]": 6, stackVals: "[6]", ans: "[5, 5, 6, 6, -1]" },
        data: {
          array: [2, 1, 5, 3, 6],
          activeIdx: 4,
          stackIndices: [4],
          resolved: [5, 5, 6, 6, -1],
          matchFound: true,
        },
      },
    ],
  },
  linked_list: {
    id: "linked_list",
    name: "Linked List Reversal (3-Pointers)",
    category: "Linked Lists",
    badge: "O(N) Time • O(1) Space",
    accentColor: "#c084fc",
    pseudocode: [
      "1. prev = null, curr = head",
      "2. while curr != null:",
      "3.   nextTemp = curr.next  // save next node",
      "4.   curr.next = prev      // reverse link",
      "5.   prev = curr           // advance prev",
      "6.   curr = nextTemp       // advance curr",
      "7. return prev             // new head",
    ],
    steps: [
      {
        stepIndex: 0,
        title: "Initialize 3 Pointers",
        description: "Maintain three pointers: prev (null), curr (Node 1), and next (Node 2) so we never lose the rest of the list.",
        mathFormula: "prev = null, curr = Node(1), next = Node(2)",
        codeLine: 1,
        variables: { prev: "null", curr: 1, next: 2 },
        quiz: {
          question: "Why must we save `next = curr.next` BEFORE executing `curr.next = prev`?",
          options: [
            "Because overwriting curr.next detaches the remaining forward list from memory reachability",
            "To sort the linked list values",
            "To allocate a new node copy",
          ],
          correctIndex: 0,
          explanation: "Once curr.next points backward to prev, the original forward reference is overwritten.",
        },
        data: {
          nodes: [1, 2, 3, 4],
          prev: null,
          curr: 0,
          next: 1,
          reversedEdges: [],
        },
      },
      {
        stepIndex: 1,
        title: "Reverse Node 1 Link",
        description: "Redirect curr.next to prev (null). Advance prev = 1, curr = 2, next = 3.",
        mathFormula: "1 → null | prev = 1, curr = 2, next = 3",
        codeLine: 4,
        variables: { prev: 1, curr: 2, next: 3 },
        data: {
          nodes: [1, 2, 3, 4],
          prev: 0,
          curr: 1,
          next: 2,
          reversedEdges: [0],
        },
      },
      {
        stepIndex: 2,
        title: "Reverse Node 2 Link",
        description: "Redirect Node 2.next to prev (Node 1). Advance prev = 2, curr = 3, next = 4.",
        mathFormula: "2 → 1 → null | prev = 2, curr = 3, next = 4",
        codeLine: 4,
        variables: { prev: 2, curr: 3, next: 4 },
        data: {
          nodes: [1, 2, 3, 4],
          prev: 1,
          curr: 2,
          next: 3,
          reversedEdges: [0, 1],
        },
      },
      {
        stepIndex: 3,
        title: "Reverse Node 3 & Node 4 (New Head!)",
        description: "Reverse remaining links. When curr reaches null, prev sits at Node 4 — our new reversed head!",
        mathFormula: "4 → 3 → 2 → 1 → null (Return prev = Node 4)",
        codeLine: 7,
        variables: { prev: 4, curr: "null", next: "null", newHead: 4 },
        data: {
          nodes: [1, 2, 3, 4],
          prev: 3,
          curr: null,
          next: null,
          reversedEdges: [0, 1, 2, 3],
          matchFound: true,
        },
      },
    ],
  },
  tree: {
    id: "tree",
    name: "Binary Search Tree (Range Validation)",
    category: "Trees & Graphs",
    badge: "O(N) DFS • O(H) Stack",
    accentColor: "#fb7185",
    pseudocode: [
      "1. def isValidBST(node, minVal, maxVal):",
      "2.   if not node: return True",
      "3.   if not (minVal < node.val < maxVal):",
      "4.     return False",
      "5.   return isValidBST(node.left, minVal, node.val) and",
      "6.          isValidBST(node.right, node.val, maxVal)",
    ],
    steps: [
      {
        stepIndex: 0,
        title: "Root Range (-∞, +∞)",
        description: "Start at Root(10) with valid range (-∞, +∞). Since -∞ < 10 < +∞ holds, branch into children.",
        mathFormula: "Root(10) ∈ (-∞, +∞) ✓ → Left gets (-∞, 10), Right gets (10, +∞)",
        codeLine: 3,
        variables: { node: 10, minVal: "-∞", maxVal: "+∞", status: "Valid" },
        quiz: {
          question: "When traversing from Node(5) to its right child Node(7), what is the valid (min, max) bound for Node(7)?",
          options: [
            "(5, 10) — must be > 5 (parent) and < 10 (root ancestor)",
            "(5, +∞) — only needs to be greater than parent 5",
            "(-∞, 5) — must be smaller than parent 5",
          ],
          correctIndex: 0,
          explanation: "Every node in the left subtree of 10 must remain < 10, and being in the right subtree of 5 requires > 5. Thus (5, 10)!",
        },
        data: {
          activeNode: 10,
          visitedNodes: [10],
          nodeBounds: { 10: "(-∞, +∞)" },
        },
      },
      {
        stepIndex: 1,
        title: "Validate Left Subtree {5, 3, 7}",
        description: "Node(5) ∈ (-∞, 10) ✓. Its left child Node(3) ∈ (-∞, 5) ✓, and right child Node(7) ∈ (5, 10) ✓.",
        mathFormula: "Node(5) ∈ (-∞,10) ✓ | Node(3) ∈ (-∞,5) ✓ | Node(7) ∈ (5,10) ✓",
        codeLine: 5,
        variables: { node: 7, minVal: 5, maxVal: 10, status: "Valid Subtree" },
        data: {
          activeNode: 7,
          visitedNodes: [10, 5, 3, 7],
          nodeBounds: { 10: "(-∞,+∞)", 5: "(-∞,10)", 3: "(-∞,5)", 7: "(5,10)" },
        },
      },
      {
        stepIndex: 2,
        title: "Validate Right Subtree {15}",
        description: "Navigate right child of Root: Node(15) ∈ (10, +∞) ✓. Global BST invariant holds across all nodes!",
        mathFormula: "Node(15) ∈ (10, +∞) ✓ → Global BST Validated!",
        codeLine: 6,
        variables: { node: 15, minVal: 10, maxVal: "+∞", result: "TRUE" },
        data: {
          activeNode: 15,
          visitedNodes: [10, 5, 3, 7, 15],
          nodeBounds: { 10: "(-∞,+∞)", 5: "(-∞,10)", 3: "(-∞,5)", 7: "(5,10)", 15: "(10,+∞)" },
          matchFound: true,
        },
      },
    ],
  },
  none: {
    id: "none",
    name: "Blank Freehand Canvas",
    category: "Freeform",
    badge: "Infinite Board",
    accentColor: "#94a3b8",
    pseudocode: [],
    steps: [
      {
        stepIndex: 0,
        title: "Freeform Architecture & Dry-Run Board",
        description: "Use Pen, Shapes, Arrows, Text, and Laser Pointer to sketch custom trees, memory layouts, or system diagrams.",
        data: {},
      },
    ],
  },
};

export function AiWhiteboard({
  roomId: _roomId = "default-room",
  isAiTeaching = false,
  aiTeachingMessage = null,
  externalElements = [],
  onElementCreated,
  onClearBoard,
  readOnly = false,
}: AiWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<DrawTool>("pen");
  const [activeColor, setActiveColor] = useState<string>("#38bdf8");
  const [brushSize, setBrushSize] = useState<number>(3);
  const [gridStyle, setGridStyle] = useState<GridStyle>("dots");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  // History Stacks (Undo / Redo)
  const [localElements, setLocalElements] = useState<WhiteboardElement[]>([]);
  const [undoStack, setUndoStack] = useState<WhiteboardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardElement[][]>([]);

  // Text Annotations
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>("");

  // Laser Pointer Trail
  const [laserPoints, setLaserPoints] = useState<Array<{ x: number; y: number; timestamp: number }>>([]);

  // Viewport Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // UI Modes & Learning Panels
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [showSimulationsMenu, setShowSimulationsMenu] = useState<boolean>(false);
  const [showCodeAndWatchHud, setShowCodeAndWatchHud] = useState<boolean>(true);
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showCustomInputBar, setShowCustomInputBar] = useState<boolean>(false);
  const [customArrayInput, setCustomArrayInput] = useState<string>("1, 3, 5, 8, 12, 17, 21");
  const [customTargetInput, setCustomTargetInput] = useState<string>("17");
  const [customSimSteps, setCustomSimSteps] = useState<Record<string, AlgorithmicStep[]>>({});

  // Interactive Simulation VCR Engine State
  const [activeSimulationKey, setActiveSimulationKey] = useState<string>("two_pointers");
  const [simStepIndex, setSimStepIndex] = useState<number>(0);
  const [isPlayingSim, setIsPlayingSim] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const baseSim = PRESET_SIMULATIONS[activeSimulationKey] || PRESET_SIMULATIONS.two_pointers!;
  const activeSteps = useMemo(() => {
    return customSimSteps[activeSimulationKey] || baseSim.steps;
  }, [customSimSteps, activeSimulationKey, baseSim.steps]);

  const currentStep = activeSteps[simStepIndex] || activeSteps[0]!;

  // Sync external AI diagram events from voice interviewer
  const lastExternalDiagramIdRef = useRef<string | null>(null);
  useEffect(() => {
    const latestDiagram = [...externalElements]
      .reverse()
      .find((el) => el.type === "ai_diagram" && el.aiDiagramType);
    if (latestDiagram && latestDiagram.id !== lastExternalDiagramIdRef.current) {
      lastExternalDiagramIdRef.current = latestDiagram.id;
      const diagramType = latestDiagram.aiDiagramType;
      const mappedKey =
        diagramType === "array_pointers" || diagramType === "two_pointers"
          ? "two_pointers"
          : diagramType === "binary_search"
          ? "binary_search"
          : diagramType === "linked_list"
          ? "linked_list"
          : diagramType === "tree"
          ? "tree"
          : "two_pointers";

      setActiveSimulationKey(mappedKey);
      setSimStepIndex(0);
      setIsPlayingSim(true);
    }
  }, [externalElements]);

  // Merge external and local elements
  const allElements = useMemo(
    () => [...localElements, ...externalElements],
    [localElements, externalElements]
  );

  // Rebuild custom array trace
  const handleApplyCustomInput = () => {
    const parsedArr = customArrayInput
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n))
      .slice(0, 12);
    const parsedTarget = Number(customTargetInput.trim());

    if (parsedArr.length < 2 || Number.isNaN(parsedTarget)) {
      toast.error("Provide at least 2 comma-separated numbers and a valid target.");
      return;
    }

    if (activeSimulationKey === "two_pointers") {
      const steps = buildTwoPointersSteps(parsedArr, parsedTarget);
      setCustomSimSteps((prev) => ({ ...prev, two_pointers: steps }));
      setSimStepIndex(0);
      setIsPlayingSim(false);
      toast.success(`Rebuilt Two Pointers trace (${steps.length} steps) for target ${parsedTarget}!`);
    } else if (activeSimulationKey === "binary_search") {
      const steps = buildBinarySearchSteps(parsedArr, parsedTarget);
      setCustomSimSteps((prev) => ({ ...prev, binary_search: steps }));
      setSimStepIndex(0);
      setIsPlayingSim(false);
      toast.success(`Rebuilt Binary Search trace (${steps.length} steps) for target ${parsedTarget}!`);
    }
    setShowCustomInputBar(false);
  };

  // Laser decay ticker
  useEffect(() => {
    if (laserPoints.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setLaserPoints((prev) => prev.filter((p) => now - p.timestamp < 1000));
    }, 80);
    return () => clearInterval(interval);
  }, [laserPoints.length]);

  // VCR Simulation auto-play ticker
  useEffect(() => {
    if (!isPlayingSim) return;
    const intervalMs = Math.round(2200 / playbackSpeed);
    const timer = setInterval(() => {
      setSimStepIndex((prev) => {
        if (prev < activeSteps.length - 1) {
          return prev + 1;
        } else {
          setIsPlayingSim(false);
          return prev;
        }
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlayingSim, playbackSpeed, activeSteps.length]);

  // Reset quiz selection on step change
  useEffect(() => {
    setSelectedQuizOption(null);
  }, [simStepIndex, activeSimulationKey]);

  // Save state to undo stack before mutation
  const pushToUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-20), localElements]);
    setRedoStack([]);
  }, [localElements]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1]!;
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, localElements]);
    setLocalElements(previous);
  }, [undoStack, localElements]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, localElements]);
    setLocalElements(next);
  }, [redoStack, localElements]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "p") {
        setActiveTool("pen");
      } else if (e.key === "e") {
        setActiveTool("eraser");
      } else if (e.key === "a") {
        setActiveTool("arrow");
      } else if (e.key === "r") {
        setActiveTool("rect");
      } else if (e.key === "c") {
        setActiveTool("circle");
      } else if (e.key === "t") {
        setActiveTool("text");
      } else if (e.key === "l") {
        setActiveTool("laser");
      } else if (e.key === " " && activeSimulationKey !== "none") {
        e.preventDefault();
        setIsPlayingSim((prev) => !prev);
      } else if (e.key === "ArrowRight") {
        setSimStepIndex((prev) => Math.min(prev + 1, activeSteps.length - 1));
      } else if (e.key === "ArrowLeft") {
        setSimStepIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, isFullScreen, activeSimulationKey, activeSteps.length]);

  // Arrow Drawing Geometry
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    _size: number
  ) => {
    const headLength = 13;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  // Dedicated Visual Renderers for Algorithmic Structures
  const renderInteractiveSimulation = useCallback(
    (ctx: CanvasRenderingContext2D, algoId: string, step: AlgorithmicStep) => {
      ctx.save();
      ctx.font = "12px JetBrains Mono, monospace";
      ctx.textAlign = "left";

      const startX = 44;
      const headerY = 42;

      // Top Step Pill & Explanation
      ctx.fillStyle = baseSim.accentColor || "#38bdf8";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.fillText(`Step ${step.stepIndex + 1}: ${step.title}`, startX, headerY);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "12px Inter, sans-serif";
      ctx.fillText(step.description, startX, headerY + 22);

      if (step.mathFormula) {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 11.5px JetBrains Mono, monospace";
        ctx.fillText(`Invariant: ${step.mathFormula}`, startX, headerY + 42);
      }

      if (
        algoId === "two_pointers" ||
        algoId === "binary_search" ||
        algoId === "sliding_window"
      ) {
        const items: number[] = step.data.array || [1, 3, 5, 8, 12, 17, 21];
        const arrayStartY = 148;
        const cellWidth = Math.min(54, Math.max(38, Math.floor(460 / items.length)));
        const cellHeight = 44;

        items.forEach((item: number, idx: number) => {
          const x = startX + idx * cellWidth;
          const y = arrayStartY;

          const isPruned = step.data.prunedIndices?.includes(idx);
          const isHighlighted = step.data.highlightIndices?.includes(idx);
          const isMatched = step.data.matchFound && isHighlighted;
          const isInWindow =
            algoId === "sliding_window" &&
            idx >= step.data.windowStart &&
            idx <= step.data.windowEnd;

          // Rounded Cell Fill
          if (isMatched) {
            ctx.fillStyle = "rgba(52, 211, 153, 0.28)";
          } else if (isInWindow) {
            ctx.fillStyle = "rgba(251, 191, 36, 0.22)";
          } else if (isHighlighted) {
            ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
          } else if (isPruned) {
            ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
          } else {
            ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
          }
          ctx.fillRect(x, y, cellWidth - 2, cellHeight);

          // Border
          ctx.strokeStyle = isMatched
            ? "#34d399"
            : isInWindow
            ? "#fbbf24"
            : isHighlighted
            ? "#38bdf8"
            : isPruned
            ? "#1e293b"
            : "#475569";
          ctx.lineWidth = isMatched || isHighlighted || isInWindow ? 2 : 1;
          ctx.strokeRect(x, y, cellWidth - 2, cellHeight);

          // Strike-through pruned cells
          if (isPruned) {
            ctx.strokeStyle = "rgba(244, 63, 94, 0.35)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 4);
            ctx.lineTo(x + cellWidth - 6, y + cellHeight - 4);
            ctx.stroke();
          }

          // Cell Value
          ctx.fillStyle = isPruned ? "#475569" : isMatched ? "#34d399" : "#f8fafc";
          ctx.font = "bold 14px JetBrains Mono, monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(item), x + (cellWidth - 2) / 2, y + 27);

          // Index Label
          ctx.fillStyle = "#64748b";
          ctx.font = "10.5px JetBrains Mono, monospace";
          ctx.fillText(`[${idx}]`, x + (cellWidth - 2) / 2, y + cellHeight + 16);
        });

        // Two Pointers Arrows
        if (step.data.pointers) {
          step.data.pointers.forEach((ptr: any) => {
            const ptrX = startX + ptr.index * cellWidth + (cellWidth - 2) / 2;
            const ptrY = arrayStartY - 8;

            ctx.fillStyle = ptr.color || "#38bdf8";
            ctx.strokeStyle = ptr.color || "#38bdf8";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(ptrX, ptrY - 18);
            ctx.lineTo(ptrX, ptrY);
            ctx.lineTo(ptrX - 4, ptrY - 6);
            ctx.moveTo(ptrX, ptrY);
            ctx.lineTo(ptrX + 4, ptrY - 6);
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.font = "bold 11.5px JetBrains Mono, monospace";
            ctx.fillText(ptr.label, ptrX, ptrY - 23);
          });
        }

        // Binary Search Pointers
        if (algoId === "binary_search" && step.data.mid !== undefined) {
          const drawBound = (idx: number, label: string, color: string, offsetY = 0) => {
            const ptrX = startX + idx * cellWidth + (cellWidth - 2) / 2;
            const ptrY = arrayStartY - 8 - offsetY;

            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(ptrX, ptrY - 16);
            ctx.lineTo(ptrX, ptrY);
            ctx.stroke();

            ctx.textAlign = "center";
            ctx.font = "bold 10.5px JetBrains Mono, monospace";
            ctx.fillText(label, ptrX, ptrY - 20);
          };

          drawBound(step.data.low, "LOW", "#34d399", 0);
          drawBound(step.data.mid, "MID", "#38bdf8", 15);
          drawBound(step.data.high, "HIGH", "#fb7185", 0);
        }

        // Sliding Window Bracket
        if (algoId === "sliding_window" && step.data.windowStart !== undefined) {
          const leftX = startX + step.data.windowStart * cellWidth;
          const rightX = startX + (step.data.windowEnd + 1) * cellWidth - 2;
          const bracketY = arrayStartY + cellHeight + 25;

          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(leftX, bracketY);
          ctx.lineTo(leftX, bracketY + 8);
          ctx.lineTo(rightX, bracketY + 8);
          ctx.lineTo(rightX, bracketY);
          ctx.stroke();

          ctx.fillStyle = "#fbbf24";
          ctx.textAlign = "center";
          ctx.font = "bold 11.5px JetBrains Mono, monospace";
          ctx.fillText(
            `Window Sum = ${step.data.currentSum}  |  Best Max = ${step.data.maxSum}`,
            (leftX + rightX) / 2,
            bracketY + 24
          );
        }
      } else if (algoId === "monotonic_stack") {
        const items: number[] = step.data.array || [2, 1, 5, 3, 6];
        const resolved: number[] = step.data.resolved || [-1, -1, -1, -1, -1];
        const stackIndices: number[] = step.data.stackIndices || [];
        const cellW = 54;
        const cellH = 40;
        const arrayY = 140;

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 11px JetBrains Mono, monospace";
        ctx.textAlign = "left";
        ctx.fillText("Input Array:", startX, arrayY - 10);
        ctx.fillText("Next Greater:", startX, arrayY + 75);

        items.forEach((val, idx) => {
          const x = startX + idx * cellW;
          const isActive = step.data.activeIdx === idx;
          const inStack = stackIndices.includes(idx);

          ctx.fillStyle = isActive
            ? "rgba(244, 114, 182, 0.28)"
            : inStack
            ? "rgba(56, 189, 248, 0.2)"
            : "#1e293b";
          ctx.fillRect(x, arrayY, cellW - 4, cellH);

          ctx.strokeStyle = isActive ? "#f472b6" : inStack ? "#38bdf8" : "#475569";
          ctx.lineWidth = isActive || inStack ? 2 : 1;
          ctx.strokeRect(x, arrayY, cellW - 4, cellH);

          ctx.fillStyle = "#f8fafc";
          ctx.font = "bold 13px JetBrains Mono, monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(val), x + (cellW - 4) / 2, arrayY + 25);

          // Output answer row
          const ansVal = resolved[idx];
          const hasAns = ansVal !== undefined && ansVal !== -1;
          ctx.fillStyle = hasAns ? "rgba(52, 211, 153, 0.2)" : "rgba(15, 23, 42, 0.6)";
          ctx.fillRect(x, arrayY + 85, cellW - 4, cellH - 4);
          ctx.strokeStyle = hasAns ? "#34d399" : "#334155";
          ctx.strokeRect(x, arrayY + 85, cellW - 4, cellH - 4);

          ctx.fillStyle = hasAns ? "#34d399" : "#64748b";
          ctx.fillText(String(ansVal), x + (cellW - 4) / 2, arrayY + 108);
        });
      } else if (algoId === "linked_list") {
        const nodes: number[] = step.data.nodes || [1, 2, 3, 4];
        const listStartX = 75;
        const listStartY = 175;
        const nodeSpacing = 100;

        nodes.forEach((val: number, idx: number) => {
          const x = listStartX + idx * nodeSpacing;
          const y = listStartY;

          const isReversed = step.data.reversedEdges?.includes(idx);
          const isCurr = step.data.curr === idx;
          const isPrev = step.data.prev === idx;

          ctx.fillStyle = isCurr
            ? "rgba(56, 189, 248, 0.22)"
            : isPrev
            ? "rgba(251, 191, 36, 0.22)"
            : "#0f172a";
          ctx.beginPath();
          ctx.arc(x, y, 22, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isReversed ? "#34d399" : isCurr ? "#38bdf8" : "#64748b";
          ctx.lineWidth = isCurr || isPrev ? 2.5 : 2;
          ctx.stroke();

          ctx.fillStyle = "#f8fafc";
          ctx.font = "bold 14px JetBrains Mono, monospace";
          ctx.textAlign = "center";
          ctx.fillText(String(val), x, y + 5);

          // Directed Edges
          if (idx < nodes.length - 1) {
            const nextX = listStartX + (idx + 1) * nodeSpacing;
            if (isReversed) {
              drawArrow(ctx, nextX - 24, y + 8, x + 24, y + 8, "#34d399", 2);
            } else {
              drawArrow(ctx, x + 24, y - 6, nextX - 24, y - 6, "#64748b", 2);
            }
          }

          if (step.data.prev === idx) {
            ctx.fillStyle = "#fbbf24";
            ctx.font = "bold 11px JetBrains Mono, monospace";
            ctx.fillText("prev", x, y - 30);
          }
          if (step.data.curr === idx) {
            ctx.fillStyle = "#38bdf8";
            ctx.font = "bold 11px JetBrains Mono, monospace";
            ctx.fillText("curr", x, y + 40);
          }
          if (step.data.next === idx) {
            ctx.fillStyle = "#c084fc";
            ctx.font = "bold 11px JetBrains Mono, monospace";
            ctx.fillText("next", x, y + 54);
          }
        });
      } else if (algoId === "tree") {
        const treeCenterX = 230;
        const treeTopY = 135;

        const treeNodes = [
          { id: 10, label: "10", x: treeCenterX, y: treeTopY },
          { id: 5, label: "5", x: treeCenterX - 85, y: treeTopY + 68 },
          { id: 15, label: "15", x: treeCenterX + 85, y: treeTopY + 68 },
          { id: 3, label: "3", x: treeCenterX - 130, y: treeTopY + 136 },
          { id: 7, label: "7", x: treeCenterX - 40, y: treeTopY + 136 },
        ];

        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        const connect = (n1: any, n2: any) => {
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        };
        connect(treeNodes[0], treeNodes[1]);
        connect(treeNodes[0], treeNodes[2]);
        connect(treeNodes[1], treeNodes[3]);
        connect(treeNodes[1], treeNodes[4]);

        treeNodes.forEach((n) => {
          const isVisited = step.data.visitedNodes?.includes(n.id);
          const isActive = step.data.activeNode === n.id;
          const boundText = step.data.nodeBounds?.[n.id];

          ctx.fillStyle = isActive
            ? "rgba(251, 191, 36, 0.25)"
            : isVisited
            ? "rgba(52, 211, 153, 0.18)"
            : "#0f172a";
          ctx.beginPath();
          ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isActive ? "#fbbf24" : isVisited ? "#34d399" : "#38bdf8";
          ctx.lineWidth = isActive ? 3 : 2;
          ctx.stroke();

          ctx.fillStyle = isActive ? "#fbbf24" : "#f8fafc";
          ctx.font = "bold 13px JetBrains Mono, monospace";
          ctx.textAlign = "center";
          ctx.fillText(n.label, n.x, n.y + 4);

          if (boundText) {
            ctx.fillStyle = isActive ? "#fbbf24" : "#34d399";
            ctx.font = "10px JetBrains Mono, monospace";
            ctx.fillText(boundText, n.x, n.y + 33);
          }
        });
      }

      ctx.restore();
    },
    [baseSim.accentColor]
  );

  // Master Canvas Renderer
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);

    // 1. Draw Grid
    const startX = -panOffset.x / zoomLevel;
    const startY = -panOffset.y / zoomLevel;
    const endX = startX + logicalWidth / zoomLevel;
    const endY = startY + logicalHeight / zoomLevel;

    if (gridStyle === "dots") {
      ctx.fillStyle = "rgba(71, 85, 105, 0.42)";
      const dotSpacing = 26;
      const firstX = Math.floor(startX / dotSpacing) * dotSpacing;
      const firstY = Math.floor(startY / dotSpacing) * dotSpacing;

      for (let x = firstX; x <= endX; x += dotSpacing) {
        for (let y = firstY; y <= endY; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridStyle === "grid") {
      ctx.strokeStyle = "rgba(51, 65, 85, 0.28)";
      ctx.lineWidth = 1;
      const gridSpacing = 30;
      const firstX = Math.floor(startX / gridSpacing) * gridSpacing;
      const firstY = Math.floor(startY / gridSpacing) * gridSpacing;

      for (let x = firstX; x <= endX; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = firstY; y <= endY; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }

    // 2. Render Active Step of Algorithmic Simulation
    if (activeSimulationKey !== "none" && currentStep) {
      renderInteractiveSimulation(ctx, baseSim.id, currentStep);
    }

    // 3. Render Committed User & Shared Elements
    for (const el of allElements) {
      ctx.save();

      if (el.type === "stroke" && el.points && el.points.length > 0) {
        ctx.strokeStyle = el.color || "#38bdf8";
        ctx.lineWidth = el.size || 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (el.points.length === 1) {
          ctx.beginPath();
          ctx.arc(el.points[0]!.x, el.points[0]!.y, (el.size || 3) / 2, 0, Math.PI * 2);
          ctx.fillStyle = el.color || "#38bdf8";
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(el.points[0]!.x, el.points[0]!.y);

          for (let i = 1; i < el.points.length - 1; i++) {
            const midX = (el.points[i]!.x + el.points[i + 1]!.x) / 2;
            const midY = (el.points[i]!.y + el.points[i + 1]!.y) / 2;
            ctx.quadraticCurveTo(el.points[i]!.x, el.points[i]!.y, midX, midY);
          }
          const last = el.points[el.points.length - 1]!;
          ctx.lineTo(last.x, last.y);
          ctx.stroke();
        }
      } else if (el.type === "shape" && el.shapeData) {
        ctx.strokeStyle = el.color || "#38bdf8";
        ctx.lineWidth = el.size || 2.5;
        const { x = 0, y = 0, width = 50, height = 50, shapeType } = el.shapeData;

        if (shapeType === "rectangle") {
          ctx.strokeRect(x, y, width, height);
        } else if (shapeType === "circle") {
          ctx.beginPath();
          const radius = Math.sqrt(width * width + height * height) / 2;
          ctx.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (shapeType === "arrow") {
          drawArrow(ctx, x, y, x + width, y + height, el.color || "#38bdf8", el.size || 2.5);
        }
      } else if (el.type === "text" && el.text) {
        ctx.font = `bold ${el.size || 14}px JetBrains Mono, monospace`;
        ctx.fillStyle = el.color || "#f8fafc";
        ctx.fillText(el.text, el.shapeData?.x || 100, el.shapeData?.y || 100);
      }

      ctx.restore();
    }

    // 4. Render Active In-Progress Drawing
    if (isDrawing && startPoint && currentPoint) {
      ctx.save();
      ctx.strokeStyle = activeTool === "eraser" ? "#020617" : activeColor;
      ctx.lineWidth = activeTool === "eraser" ? 28 : brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (activeTool === "pen" || activeTool === "eraser") {
        if (currentStroke.length > 1) {
          ctx.beginPath();
          ctx.moveTo(currentStroke[0]!.x, currentStroke[0]!.y);
          for (let i = 1; i < currentStroke.length; i++) {
            ctx.lineTo(currentStroke[i]!.x, currentStroke[i]!.y);
          }
          ctx.stroke();
        }
      } else if (activeTool === "rect") {
        const w = currentPoint.x - startPoint.x;
        const h = currentPoint.y - startPoint.y;
        ctx.strokeRect(startPoint.x, startPoint.y, w, h);
      } else if (activeTool === "circle") {
        const w = currentPoint.x - startPoint.x;
        const h = currentPoint.y - startPoint.y;
        const radius = Math.sqrt(w * w + h * h) / 2;
        ctx.beginPath();
        ctx.arc(startPoint.x + w / 2, startPoint.y + h / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeTool === "arrow") {
        drawArrow(ctx, startPoint.x, startPoint.y, currentPoint.x, currentPoint.y, activeColor, brushSize);
      }

      ctx.restore();
    }

    // 5. Render Glowing Laser Pointer Trail
    if (laserPoints.length > 1) {
      ctx.save();
      const now = Date.now();
      for (let i = 1; i < laserPoints.length; i++) {
        const p1 = laserPoints[i - 1]!;
        const p2 = laserPoints[i]!;
        const age = now - p2.timestamp;
        const opacity = Math.max(0, 1 - age / 1000);

        ctx.strokeStyle = `rgba(244, 63, 94, ${opacity})`;
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 4 * opacity;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [
    allElements,
    isDrawing,
    currentStroke,
    startPoint,
    currentPoint,
    activeTool,
    activeColor,
    brushSize,
    gridStyle,
    zoomLevel,
    panOffset,
    activeSimulationKey,
    currentStep,
    laserPoints,
    baseSim.id,
    renderInteractiveSimulation,
  ]);

  // High-DPI Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetHeight = Math.max(390, rect.height - 96);

      canvas.width = rect.width * dpr;
      canvas.height = targetHeight * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${targetHeight}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      renderCanvas();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCanvas, isFullScreen]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Screen Coordinates to Canvas World Transform
  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - panOffset.x) / zoomLevel;
    const y = (clientY - rect.top - panOffset.y) / zoomLevel;
    return { x, y };
  };

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const pos = screenToWorld(e.clientX, e.clientY);

    if (e.button === 1 || e.buttons === 4 || activeTool === "laser") {
      if (activeTool === "laser") {
        setLaserPoints([{ x: pos.x, y: pos.y, timestamp: Date.now() }]);
      }
      return;
    }

    if (activeTool === "text") {
      setTextInputPos(pos);
      setTextInputValue("");
      return;
    }

    pushToUndo();
    setIsDrawing(true);
    setStartPoint(pos);
    setCurrentPoint(pos);
    setCurrentStroke([pos]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = screenToWorld(e.clientX, e.clientY);

    if (activeTool === "laser" && e.buttons > 0) {
      setLaserPoints((prev) => [...prev.slice(-30), { x: pos.x, y: pos.y, timestamp: Date.now() }]);
      return;
    }

    if (!isDrawing || readOnly) return;

    setCurrentPoint(pos);
    if (activeTool === "pen" || activeTool === "eraser") {
      setCurrentStroke((prev) => [...prev, pos]);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || readOnly || !startPoint || !currentPoint) {
      setIsDrawing(false);
      return;
    }
    setIsDrawing(false);

    let newElement: WhiteboardElement | null = null;

    if (activeTool === "pen" || activeTool === "eraser") {
      if (currentStroke.length > 0) {
        newElement = {
          id: `wb-str-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "stroke",
          tool: activeTool,
          points: currentStroke,
          color: activeTool === "eraser" ? "#020617" : activeColor,
          size: activeTool === "eraser" ? 28 : brushSize,
          timestamp: Date.now(),
          authorId: "candidate",
        };
      }
    } else if (activeTool === "rect") {
      const w = currentPoint.x - startPoint.x;
      const h = currentPoint.y - startPoint.y;
      if (Math.abs(w) > 4 && Math.abs(h) > 4) {
        newElement = {
          id: `wb-rect-${Date.now()}`,
          type: "shape",
          tool: "rect",
          shapeData: { x: startPoint.x, y: startPoint.y, width: w, height: h, shapeType: "rectangle" },
          color: activeColor,
          size: brushSize,
          timestamp: Date.now(),
          authorId: "candidate",
        };
      }
    } else if (activeTool === "circle") {
      const w = currentPoint.x - startPoint.x;
      const h = currentPoint.y - startPoint.y;
      if (Math.abs(w) > 4 || Math.abs(h) > 4) {
        newElement = {
          id: `wb-circ-${Date.now()}`,
          type: "shape",
          tool: "circle",
          shapeData: { x: startPoint.x, y: startPoint.y, width: w, height: h, shapeType: "circle" },
          color: activeColor,
          size: brushSize,
          timestamp: Date.now(),
          authorId: "candidate",
        };
      }
    } else if (activeTool === "arrow") {
      const w = currentPoint.x - startPoint.x;
      const h = currentPoint.y - startPoint.y;
      if (Math.abs(w) > 4 || Math.abs(h) > 4) {
        newElement = {
          id: `wb-arr-${Date.now()}`,
          type: "shape",
          tool: "arrow",
          shapeData: { x: startPoint.x, y: startPoint.y, width: w, height: h, shapeType: "arrow" },
          color: activeColor,
          size: brushSize,
          timestamp: Date.now(),
          authorId: "candidate",
        };
      }
    }

    if (newElement) {
      setLocalElements((prev) => [...prev, newElement!]);
      onElementCreated?.(newElement);
    }

    setCurrentStroke([]);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  // Submit Text Annotation
  const handleCommitText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      setTextInputValue("");
      return;
    }

    pushToUndo();
    const newEl: WhiteboardElement = {
      id: `wb-txt-${Date.now()}`,
      type: "text",
      text: textInputValue.trim(),
      shapeData: { x: textInputPos.x, y: textInputPos.y },
      color: activeColor,
      size: 15,
      timestamp: Date.now(),
      authorId: "candidate",
    };

    setLocalElements((prev) => [...prev, newEl]);
    onElementCreated?.(newEl);
    setTextInputPos(null);
    setTextInputValue("");
  };

  // Clear Board
  const handleClear = () => {
    pushToUndo();
    setLocalElements([]);
    onClearBoard?.();
    toast.success("Whiteboard annotations cleared.");
  };

  // Export to High-Res PNG
  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `dsa-whiteboard-${baseSim.id}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Snapshot downloaded as PNG!");
  };

  // Copy Canvas to Clipboard
  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !navigator.clipboard) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Canvas copied to clipboard!");
      });
    } catch {
      toast.error("Clipboard copy not supported on this browser.");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-slate-950 border border-slate-800/90 rounded-xl overflow-hidden shadow-2xl transition-all select-none ${
        isFullScreen ? "fixed inset-3 z-50 h-[calc(100vh-1.5rem)]" : "h-[560px] w-full"
      }`}
    >
      {/* 1. Sleek Top Toolbar: Algorithm Selector + Drawing Geometry + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-2 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-xs">
        {/* Left: Interactive Simulation Selector + Custom Input Button */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSimulationsMenu(!showSimulationsMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-slate-100 transition font-medium cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="truncate max-w-[155px] font-semibold">{baseSim.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showSimulationsMenu && (
              <div className="absolute left-0 mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Interactive DSA Simulations
                </div>
                {Object.values(PRESET_SIMULATIONS).map((sim) => (
                  <button
                    key={sim.id}
                    type="button"
                    onClick={() => {
                      setActiveSimulationKey(sim.id);
                      setSimStepIndex(0);
                      setIsPlayingSim(false);
                      setShowSimulationsMenu(false);
                      toast.info(`Switched to ${sim.name}`);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex flex-col gap-0.5 transition cursor-pointer ${
                      activeSimulationKey === sim.id
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                        : "text-slate-300 hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{sim.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{sim.badge}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {baseSim.supportsCustomArray && (
            <button
              type="button"
              onClick={() => setShowCustomInputBar((prev) => !prev)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-mono text-[10px] font-semibold transition cursor-pointer ${
                showCustomInputBar
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
              }`}
              title="Customize array elements and target value"
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span className="hidden xl:inline">Custom Input</span>
            </button>
          )}
        </div>

        {/* Center: Geometry & Freehand Tools */}
        <div className="flex items-center gap-0.5 bg-slate-950/90 p-1 rounded-lg border border-slate-800">
          {(
            [
              { id: "pen", icon: Pen, label: "Pen (P)" },
              { id: "arrow", icon: MoveRight, label: "Arrow (A)" },
              { id: "rect", icon: Square, label: "Box (R)" },
              { id: "circle", icon: Circle, label: "Node (C)" },
              { id: "text", icon: Type, label: "Text (T)" },
              { id: "laser", icon: Flame, label: "Laser Pointer (L)" },
              { id: "eraser", icon: Eraser, label: "Eraser (E)" },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isSelected = activeTool === t.id;
            const isDanger = t.id === "laser" || t.id === "eraser";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTool(t.id)}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  isSelected
                    ? isDanger
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title={t.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Color Swatches */}
          <div className="flex items-center gap-1 px-0.5">
            {COLOR_PALETTE.map((col) => (
              <button
                key={col.value}
                type="button"
                onClick={() => setActiveColor(col.value)}
                className={`w-3.5 h-3.5 rounded-full border transition cursor-pointer ${
                  activeColor === col.value
                    ? "border-white scale-125 shadow-sm"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
                style={{ backgroundColor: col.value }}
                title={col.name}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Brush Stroke Width Selector */}
          <div className="hidden md:flex items-center gap-0.5">
            {[2, 4, 6].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setBrushSize(sz)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                  brushSize === sz
                    ? "bg-slate-800 text-sky-400 font-bold"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                title={`Stroke Width ${sz}px`}
              >
                {sz}px
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setGridStyle((prev) =>
                prev === "dots" ? "grid" : prev === "grid" ? "plain" : "dots"
              )
            }
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title={`Grid Style: ${gridStyle}`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Learning HUD Toggle, Undo/Redo, Export & Fullscreen */}
        <div className="flex items-center gap-1">
          {activeSimulationKey !== "none" && (
            <button
              type="button"
              onClick={() => setShowCodeAndWatchHud((prev) => !prev)}
              className={`px-2 py-1 rounded-md border font-mono text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                showCodeAndWatchHud
                  ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Live Code & Variable Watch HUD"
            >
              {showCodeAndWatchHud ? (
                <Eye className="w-3 h-3" />
              ) : (
                <EyeOff className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">HUD</span>
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="h-7 px-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-35 cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="h-7 px-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-35 cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
            title="Clear Drawings"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyToClipboard}
            className="h-7 px-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Copy Snapshot to Clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadSnapshot}
            className="h-7 px-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Download High-Res PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="h-7 px-1.5 text-slate-400 hover:text-slate-200 cursor-pointer"
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Whiteboard"}
          >
            {isFullScreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Optional Custom Array / Target Input Strip */}
      {showCustomInputBar && baseSim.supportsCustomArray && (
        <div className="px-3 py-2 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs animate-in fade-in slide-in-from-top-1">
          <span className="font-mono text-[11px] text-amber-300 font-semibold">
            Custom Array:
          </span>
          <input
            type="text"
            value={customArrayInput}
            onChange={(e) => setCustomArrayInput(e.target.value)}
            placeholder="e.g. 1, 3, 5, 8, 12, 17, 21"
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 font-mono text-xs text-slate-100 w-52 focus:outline-none focus:border-sky-500"
          />
          <span className="font-mono text-[11px] text-amber-300 font-semibold">
            Target:
          </span>
          <input
            type="text"
            value={customTargetInput}
            onChange={(e) => setCustomTargetInput(e.target.value)}
            placeholder="17"
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 font-mono text-xs text-slate-100 w-16 focus:outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={handleApplyCustomInput}
            className="px-2.5 py-1 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-[11px] font-bold transition cursor-pointer"
          >
            Rebuild Trace
          </button>
        </div>
      )}

      {/* 2. Interactive Canvas Area + Live Variable Watch & Pseudocode HUD */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none"
        />

        {/* Floating Text Annotation Input Box */}
        {textInputPos && (
          <div
            className="absolute z-20 flex items-center gap-1 bg-slate-900 border border-sky-500 rounded-md p-1 shadow-2xl"
            style={{
              left: `${textInputPos.x * zoomLevel + panOffset.x}px`,
              top: `${textInputPos.y * zoomLevel + panOffset.y}px`,
            }}
          >
            <input
              type="text"
              autoFocus
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommitText();
                if (e.key === "Escape") setTextInputPos(null);
              }}
              placeholder="Type label..."
              className="bg-transparent text-slate-100 font-mono text-xs px-2 py-0.5 outline-none w-44"
            />
            <button
              type="button"
              onClick={handleCommitText}
              className="px-2 py-0.5 bg-sky-500 text-slate-950 font-bold rounded text-xs hover:bg-sky-400 cursor-pointer"
            >
              Add
            </button>
          </div>
        )}

        {/* AI Co-Teacher Live Banner */}
        {(aiTeachingMessage || isAiTeaching) && (
          <div className="absolute top-2.5 right-3 max-w-xs bg-slate-900/95 border border-sky-500/50 rounded-lg px-3 py-1.5 backdrop-blur-md shadow-xl flex items-center gap-2 text-[11px] text-sky-200 z-10">
            <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-pulse" />
            <span className="truncate">
              {aiTeachingMessage || "AI Interviewer synchronized with board"}
            </span>
          </div>
        )}

        {/* Live Pseudocode & Variable Watch HUD (Bottom-Left / Right Glass Overlay) */}
        {activeSimulationKey !== "none" && showCodeAndWatchHud && (
          <div className="absolute bottom-3 left-3 right-28 flex flex-wrap items-end justify-between gap-2 pointer-events-none z-10">
            {/* Variable Watch Table */}
            {currentStep.variables && (
              <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2 shadow-xl space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  <Cpu className="w-3 h-3" />
                  <span>Live Variable Watch</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(currentStep.variables).map(([k, v]) => (
                    <div
                      key={k}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10.5px] flex items-center gap-1"
                    >
                      <span className="text-slate-400">{k}:</span>
                      <span className="text-emerald-400 font-bold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Synchronized Pseudocode Trace */}
            {baseSim.pseudocode.length > 0 && (
              <div className="hidden lg:block pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2 shadow-xl font-mono text-[10px] space-y-0.5 max-w-xs">
                <div className="flex items-center justify-between text-slate-400 pb-0.5 border-b border-slate-800/80 mb-1">
                  <span className="flex items-center gap-1 font-bold text-slate-300">
                    <Code2 className="w-3 h-3 text-sky-400" /> Invariant Trace
                  </span>
                  <span className="text-[9px] text-sky-400">{baseSim.badge}</span>
                </div>
                {baseSim.pseudocode.map((line, idx) => {
                  const lineNum = idx + 1;
                  const isCurrentLine = currentStep.codeLine === lineNum;
                  return (
                    <div
                      key={lineNum}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        isCurrentLine
                          ? "bg-sky-500/25 text-sky-200 border-l-2 border-sky-400 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Socratic "Predict Next Step" Quiz Popover */}
        {showQuizModal && currentStep.quiz && (
          <div className="absolute inset-x-4 top-14 max-w-md mx-auto bg-slate-900/98 border border-amber-500/50 rounded-xl p-3.5 shadow-2xl z-30 space-y-2.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-300">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Active Learning Check
              </span>
              <button
                type="button"
                onClick={() => setShowQuizModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-100 font-medium leading-relaxed">
              {currentStep.quiz.question}
            </p>
            <div className="space-y-1.5">
              {currentStep.quiz.options.map((opt, idx) => {
                const isPicked = selectedQuizOption === idx;
                const isCorrect = idx === currentStep.quiz!.correctIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedQuizOption(idx);
                      if (isCorrect) {
                        toast.success("Spot on! You nailed the invariant.");
                      }
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs font-mono transition cursor-pointer flex items-center justify-between ${
                      isPicked
                        ? isCorrect
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold"
                          : "bg-rose-500/20 border-rose-500 text-rose-200"
                        : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <span>{opt}</span>
                    {isPicked && isCorrect && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {selectedQuizOption !== null && (
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <span className="font-bold text-sky-400">Why: </span>
                {currentStep.quiz.explanation}
              </div>
            )}
          </div>
        )}

        {/* Bottom-Right Zoom Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1 text-xs z-10">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="px-1.5 font-mono text-[10px] text-slate-300 hover:text-sky-400 cursor-pointer"
            title="Reset Zoom"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Interactive VCR Playback Bar (Step Scrubber, Socratic Quiz Trigger & Speed) */}
      {activeSimulationKey !== "none" && (
        <div className="bg-slate-900/95 border-t border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-md">
          {/* Step Controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSimStepIndex(0);
                setIsPlayingSim(false);
              }}
              disabled={simStepIndex === 0}
              className="h-7 px-1.5 font-mono text-xs border-slate-700 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              title="Restart Simulation"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={simStepIndex === 0}
              className="h-7 px-2 font-mono text-xs border-slate-700 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              title="Previous Step (Left Arrow)"
            >
              <SkipBack className="w-3.5 h-3.5 mr-1" />
              Prev
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (simStepIndex >= activeSteps.length - 1) {
                  setSimStepIndex(0);
                }
                setIsPlayingSim(!isPlayingSim);
              }}
              className={`h-7 px-3 font-mono text-xs font-bold transition cursor-pointer ${
                isPlayingSim
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  : "bg-sky-500 hover:bg-sky-400 text-slate-950"
              }`}
            >
              {isPlayingSim ? (
                <>
                  <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1" /> Play
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSimStepIndex((prev) => Math.min(prev + 1, activeSteps.length - 1))
              }
              disabled={simStepIndex === activeSteps.length - 1}
              className="h-7 px-2 font-mono text-xs border-slate-700 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              title="Next Step (Right Arrow)"
            >
              Next
              <SkipForward className="w-3.5 h-3.5 ml-1" />
            </Button>

            {/* Interactive Step Progress Dots */}
            <div className="hidden sm:flex items-center gap-1 ml-2">
              {activeSteps.map((s, idx) => (
                <button
                  key={s.stepIndex}
                  type="button"
                  onClick={() => {
                    setSimStepIndex(idx);
                    setIsPlayingSim(false);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === simStepIndex
                      ? "w-5 bg-sky-400"
                      : idx < simStepIndex
                      ? "w-2 bg-emerald-500/70"
                      : "w-2 bg-slate-700 hover:bg-slate-500"
                  }`}
                  title={`Jump to Step ${idx + 1}: ${s.title}`}
                />
              ))}
            </div>
          </div>

          {/* Right: Quiz Me Button + Speed Selector */}
          <div className="flex items-center gap-2">
            {currentStep.quiz && (
              <button
                type="button"
                onClick={() => setShowQuizModal((prev) => !prev)}
                className="px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Quiz This Step</span>
              </button>
            )}

            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px] hidden md:inline">Speed:</span>
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded font-mono text-[11px] transition cursor-pointer ${
                    playbackSpeed === spd
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useMemo } from "react";
import { AiWord } from "@/components/brand/AiWord";
import type {
  Val,
  TreeTraversalState,
  TreeStructuralState,
  BstState,
  TrieState,
  TrieNodeInfo,
  SegmentTreeNodeInfo,
  SegmentTreeState,
  FenwickTreeState,
  NaryTreeNode,
  NaryTreeState,
} from "./VisualizerTypes";
import { toText, safeArray } from "./VisualizerTypes";
import {
  GitFork,
  Network,
  GitBranch,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowDownLeft,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Compass,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Route,
  Maximize2,
  Activity,
  Repeat,
  Shuffle,
  Search,
  Check,
  Zap,
  BookOpen,
  FolderTree,
  Tag,
  KeyRound,
  FileText,
  SlidersHorizontal,
  Binary,
  Split,
  ChevronRight,
  CornerDownRight,
  Cpu,
} from "lucide-react";

interface TreeVisualizerProps {
  treeData: (Val | null)[];
  current: Val | null;
  visited: Val[];
  type: "tree" | "bst" | "heap" | "trie";
  segmentRange?: [number, number] | null;
  segmentNodeRanges?: Record<number | string, [number, number]> | null;
  segmentTreeState?: SegmentTreeState | null;
  fenwickTreeState?: FenwickTreeState | null;
  naryTreeState?: NaryTreeState | null;
  treeTraversal?: TreeTraversalState | null;
  treeStructural?: TreeStructuralState | null;
  bstState?: BstState | null;
  trieState?: TrieState | null;
  lcaNodes?: { p: number | string; q: number | string; lca?: number | string | null } | null;
  invertedTree?: (Val | null)[] | null;
  desc?: string;
  variables?: Record<string, any> | null;
}

interface TreeEdge {
  fromIdx: number;
  toIdx: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isLeft: boolean;
  char?: string;
  isActive: boolean;
  isVisited: boolean;
  isDiameterPath: boolean;
  isLcaPath: boolean;
}

interface LayoutTrieNode {
  id: string;
  char: string;
  word?: string | null;
  isEndOfWord: boolean;
  depth: number;
  x: number;
  y: number;
  parentId: string | null;
  children: LayoutTrieNode[];
  isActivePath: boolean;
  isCurrent: boolean;
}

export function TreeVisualizer({
  treeData,
  current,
  visited: rawVisited,
  type,
  segmentRange,
  segmentNodeRanges,
  segmentTreeState: explicitSegmentTree,
  fenwickTreeState: explicitFenwickTree,
  naryTreeState: explicitNaryTree,
  treeTraversal: explicitTraversal,
  treeStructural: explicitStructural,
  bstState: explicitBst,
  trieState: explicitTrie,
  lcaNodes: explicitLca,
  invertedTree,
  desc = "",
  variables,
}: TreeVisualizerProps) {
  const safeNodes = useMemo(() => {
    return treeData.map((val) =>
      val === null || val === undefined || String(val) === "null" ? null : val,
    );
  }, [treeData]);

  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const visitedSet = useMemo(() => {
    return new Set(visited.map((v) => String(v)));
  }, [visited]);

  const currentStr = current !== null && current !== undefined ? String(current) : null;

  // Helper to find tree node index by value
  const findNodeIndex = (target: Val | null | undefined): number | null => {
    if (target === null || target === undefined) return null;
    const s = String(target);
    const found = safeNodes.findIndex((v) => v !== null && String(v) === s);
    if (found !== -1) return found;
    const num = Number(target);
    if (Number.isInteger(num) && num >= 0 && num < safeNodes.length && safeNodes[num] !== null) {
      return num;
    }
    return null;
  };

  // Traversal Mode Detection & State Synthesis
  const traversalState = useMemo<TreeTraversalState | null>(() => {
    if (explicitTraversal) return explicitTraversal;
    if (type === "trie") return null;

    let order = "";
    if (/pre-?order/i.test(desc) || variables?.order === "preorder") order = "preorder";
    else if (/in-?order/i.test(desc) || variables?.order === "inorder") order = "inorder";
    else if (/post-?order/i.test(desc) || variables?.order === "postorder") order = "postorder";
    else if (/level-?order|bfs/i.test(desc) || variables?.order === "levelorder") order = "levelorder";
    else if (/morris/i.test(desc)) order = "morris";

    if (order || (visited.length > 0 && !segmentRange && type !== "heap")) {
      return {
        order: order || "inorder",
        output: visited.map((v) => (typeof v === "object" ? String(v) : v)),
        currentVisited: current,
      };
    }
    return null;
  }, [explicitTraversal, desc, variables, visited, segmentRange, type, current]);

  // Structural (LCA, Invert, Diameter, Depth) Detection & Synthesis
  const structuralState = useMemo<TreeStructuralState | null>(() => {
    if (explicitStructural) return explicitStructural;
    if (type === "trie") return null;

    const isInverted = Boolean(
      invertedTree || /invert|swap left right|mirror/i.test(desc) || variables?.isInverted,
    );
    const isLca = Boolean(
      explicitLca || /lowest common ancestor|lca/i.test(desc) || (variables?.p && variables?.q),
    );
    const isDiameter = Boolean(/diameter|longest path/i.test(desc) || variables?.diameter);

    if (isInverted || isLca || isDiameter || /max depth|height|balanced|symmetric/i.test(desc)) {
      const pVal = explicitLca?.p ?? variables?.p ?? null;
      const qVal = explicitLca?.q ?? variables?.q ?? null;
      const lcaVal = explicitLca?.lca ?? variables?.lca ?? null;

      const pIdx = findNodeIndex(pVal);
      const qIdx = findNodeIndex(qVal);
      const lcaIdx = findNodeIndex(lcaVal);

      // Compute ancestor paths from root to p and q
      const getAncestorIndices = (nodeIdx: number | null): number[] => {
        if (nodeIdx === null) return [];
        const path: number[] = [];
        let curr: number | null = nodeIdx;
        while (curr !== null && curr >= 0) {
          path.unshift(curr);
          if (curr === 0) break;
          curr = Math.floor((curr - 1) / 2);
        }
        return path;
      };

      const pathP = getAncestorIndices(pIdx);
      const pathQ = getAncestorIndices(qIdx);

      return {
        isInverted,
        lcaNodes: pVal !== null && qVal !== null ? { p: pVal, q: qVal, lca: lcaVal } : undefined,
        ancestorPathP: pathP.map((i) => safeNodes[i] ?? i),
        ancestorPathQ: pathQ.map((i) => safeNodes[i] ?? i),
        diameter: typeof variables?.diameter === "number" ? variables.diameter : undefined,
        currentDepth: currentStr ? (findNodeIndex(currentStr) !== null ? Math.floor(Math.log2(findNodeIndex(currentStr)! + 1)) + 1 : undefined) : undefined,
        treeProperties: {
          isSymmetric: /symmetric/i.test(desc),
          isBalanced: !/unbalanced/i.test(desc),
        },
      };
    }
    return null;
  }, [explicitStructural, invertedTree, desc, variables, explicitLca, currentStr, safeNodes, type]);

  // BST State Detection & Synthesis
  const bstState = useMemo<BstState | null>(() => {
    if (explicitBst) return explicitBst;
    if (type !== "bst" && !/bst|binary search tree/i.test(desc)) return null;

    const target = variables?.target ?? variables?.val ?? variables?.key ?? null;
    let decision: BstState["decision"] = undefined;
    let comparison = "";

    if (current !== null && target !== null) {
      const cNum = Number(current);
      const tNum = Number(target);
      if (!isNaN(cNum) && !isNaN(tNum)) {
        if (tNum === cNum) {
          decision = "found";
          comparison = `Target (${tNum}) == Node (${cNum}) ➔ Target Found!`;
        } else if (tNum < cNum) {
          decision = "go_left";
          comparison = `Target (${tNum}) < Node (${cNum}) ➔ Descend LEFT Subtree`;
        } else {
          decision = "go_right";
          comparison = `Target (${tNum}) > Node (${cNum}) ➔ Descend RIGHT Subtree`;
        }
      }
    }

    // Compute BST Invariant bounds (min, max) per node
    const nodeRanges: Record<number | string, { min: number | string | null; max: number | string | null }> = {};
    const computeRanges = (idx: number, minVal: number | null, maxVal: number | null) => {
      if (idx >= safeNodes.length || safeNodes[idx] === null) return;
      nodeRanges[idx] = { min: minVal, max: maxVal };
      const val = Number(safeNodes[idx]);
      if (!isNaN(val)) {
        computeRanges(2 * idx + 1, minVal, val);
        computeRanges(2 * idx + 2, val, maxVal);
      }
    };
    computeRanges(0, null, null);

    // Check for invariant violation in current tree
    let violationNode: Val | null = null;
    let isValid = true;
    for (let i = 0; i < safeNodes.length; i++) {
      const v = safeNodes[i];
      if (v === null || v === undefined) continue;
      const num = Number(v);
      const range = nodeRanges[i];
      if (range && !isNaN(num)) {
        if ((range.min !== null && num <= Number(range.min)) || (range.max !== null && num >= Number(range.max))) {
          isValid = false;
          violationNode = v;
          break;
        }
      }
    }

    return {
      target,
      decision,
      comparison,
      nodeRanges,
      isValidBst: isValid,
      violationNode,
      successor: variables?.successor ?? null,
      predecessor: variables?.predecessor ?? null,
    };
  }, [explicitBst, type, desc, variables, current, safeNodes]);

  // Trie State Detection & Synthesis
  const trieState = useMemo<TrieState | null>(() => {
    if (explicitTrie) return explicitTrie;
    if (type !== "trie" && !/trie|prefix tree|word search ii|insert\(|search\(|startsWith\(/i.test(desc)) return null;

    const opMatch = desc.match(/(insert|search|startsWith|find|query)\((["']?)([^"')]+)\2\)/i);
    let operation = opMatch && opMatch[1] ? opMatch[1].toLowerCase() : (variables?.op ?? variables?.operation ?? "search");
    let word = opMatch && opMatch[3] ? opMatch[3] : (variables?.word ?? variables?.prefix ?? variables?.key ?? variables?.target ?? "");
    if (typeof word !== "string") word = String(word);

    const dictionary: string[] = Array.isArray(variables?.words)
      ? variables.words.map(String)
      : Array.isArray(variables?.dictionary)
        ? variables.dictionary.map(String)
        : [];

    let isFound: boolean | null = null;
    if (/found|exists|true/i.test(desc)) isFound = true;
    else if (/not found|false|does not exist/i.test(desc)) isFound = false;

    // Detect matched characters so far
    let activeChar: string | null = null;
    let activeCharIndex: number | null = null;
    const matchedChars: string[] = [];
    const remainingChars: string[] = [];

    if (currentStr && word) {
      const charIdx = word.indexOf(currentStr);
      if (charIdx !== -1) {
        activeChar = currentStr;
        activeCharIndex = charIdx;
        matchedChars.push(...word.slice(0, charIdx).split(""));
        remainingChars.push(...word.slice(charIdx + 1).split(""));
      }
    }

    return {
      word: word || null,
      operation,
      dictionary,
      isFound,
      activeChar,
      activeCharIndex,
      matchedChars,
      remainingChars,
    };
  }, [explicitTrie, type, desc, variables, currentStr]);

  // Segment Tree Engine Detection & State Synthesis
  const segmentTreeState = useMemo<SegmentTreeState | null>(() => {
    if (explicitSegmentTree) return explicitSegmentTree;
    const hasSegmentContext = Boolean(
      segmentRange ||
        segmentNodeRanges ||
        /segment tree|range sum query|range minimum query|range max|point update/i.test(desc),
    );
    if (!hasSegmentContext) return null;

    const originalArray: (number | string)[] = Array.isArray(variables?.nums)
      ? variables.nums
      : Array.isArray(variables?.array)
        ? variables.array
        : safeNodes.filter((x) => x !== null) as (number | string)[];

    const n = Math.max(1, originalArray.length);
    const qRange: [number, number] | null = segmentRange ?? (variables?.queryRange ? [Number(variables.queryRange[0]), Number(variables.queryRange[1])] : null);
    const uIdx: number | null = typeof variables?.index === "number" ? variables.index : (typeof variables?.updateIndex === "number" ? variables.updateIndex : null);
    const uVal: number | string | null = variables?.val ?? variables?.updateValue ?? null;

    let op: SegmentTreeState["operation"] = "build";
    if (/query/i.test(desc) || qRange !== null) op = "query";
    else if (/update/i.test(desc) || uIdx !== null) op = "update";

    const nodeInfoMap: Record<number, SegmentTreeNodeInfo> = {};
    if (segmentNodeRanges) {
      Object.entries(segmentNodeRanges).forEach(([idxStr, rng]) => {
        const tIdx = Number(idxStr);
        const val = safeNodes[tIdx] ?? "—";
        let status: SegmentTreeNodeInfo["status"] = "active";
        if (qRange) {
          const [qL, qR] = qRange;
          const [nL, nR] = rng;
          if (nL >= qL && nR <= qR) {
            status = "full_overlap";
          } else if (nL > qR || nR < qL) {
            status = "no_overlap";
          } else {
            status = "partial_overlap";
          }
        }
        nodeInfoMap[tIdx] = {
          treeIndex: tIdx,
          val,
          range: rng,
          status,
        };
      });
    }

    return {
      originalArray,
      treeArray: safeNodes,
      queryRange: qRange,
      updateIndex: uIdx,
      updateValue: uVal,
      operation: op,
      aggregateResult: variables?.sum ?? variables?.result ?? current ?? null,
      activeTreeIndices: currentStr !== null ? [findNodeIndex(currentStr) ?? 0] : [],
      nodes: Object.keys(nodeInfoMap).length > 0 ? nodeInfoMap : undefined,
    };
  }, [explicitSegmentTree, segmentRange, segmentNodeRanges, desc, variables, safeNodes, current, currentStr]);

  // Fenwick Tree / Binary Indexed Tree (BIT) State Synthesis
  const fenwickTreeState = useMemo<FenwickTreeState | null>(() => {
    if (explicitFenwickTree) return explicitFenwickTree;
    const hasBitContext = /fenwick|binary indexed tree|\bbit\b|count of smaller|range sum/i.test(desc) && /idx & -idx|lsb|lowbit/i.test(desc);
    if (!hasBitContext) return null;

    const originalArray: (number | string)[] = Array.isArray(variables?.nums)
      ? variables.nums
      : Array.isArray(variables?.array)
        ? variables.array
        : [];

    const bitArray: (number | string)[] = Array.isArray(variables?.bit)
      ? variables.bit
      : Array.isArray(variables?.tree)
        ? variables.tree
        : safeNodes.filter((x) => x !== null) as (number | string)[];

    const activeIdx = typeof variables?.idx === "number" ? variables.idx : (typeof variables?.i === "number" ? variables.i : (current !== null ? Number(current) : null));

    let formula = "";
    if (activeIdx !== null && !isNaN(activeIdx) && activeIdx > 0) {
      const lsb = activeIdx & -activeIdx;
      if (/update/i.test(desc)) {
        formula = `idx += (idx & -idx) ➔ ${activeIdx} + ${lsb} = ${activeIdx + lsb}`;
      } else {
        formula = `idx -= (idx & -idx) ➔ ${activeIdx} - ${lsb} = ${activeIdx - lsb}`;
      }
    }

    return {
      originalArray,
      treeArray: bitArray,
      operation: /update/i.test(desc) ? "update_point" : "query_prefix",
      activeBitIndex: activeIdx,
      prefixSum: variables?.sum ?? variables?.total ?? current ?? null,
      formula: formula || undefined,
    };
  }, [explicitFenwickTree, desc, variables, safeNodes, current]);

  // N-ary Tree Detection & Layout Synthesis
  const naryTreeState = useMemo<NaryTreeState | null>(() => {
    if (explicitNaryTree) return explicitNaryTree;
    if (!/n-ary|general tree|multi-child|quadtree|trie/i.test(desc) && !variables?.naryRoot) return null;

    // Synthesize flat node dictionary for general N-ary tree if provided
    return null;
  }, [explicitNaryTree, desc, variables]);

  // Trie Multi-way Tree Hierarchy Builder
  const trieLayout = useMemo(() => {
    if (type !== "trie" && !trieState) return null;

    interface InternalTrieNode {
      id: string;
      char: string;
      word: string | null;
      isEndOfWord: boolean;
      children: Map<string, InternalTrieNode>;
    }

    const root: InternalTrieNode = {
      id: "root",
      char: "∅",
      word: null,
      isEndOfWord: false,
      children: new Map(),
    };

    let nextNodeId = 1;

    // Insert word helper
    const insertWord = (w: string) => {
      let curr = root;
      let pathPrefix = "";
      for (let i = 0; i < w.length; i++) {
        const ch = w[i];
        if (!ch) continue;
        pathPrefix += ch;
        if (!curr.children.has(ch)) {
          curr.children.set(ch, {
            id: `node-${nextNodeId++}-${ch}`,
            char: ch,
            word: null,
            isEndOfWord: false,
            children: new Map(),
          });
        }
        const nextNode = curr.children.get(ch);
        if (nextNode) {
          curr = nextNode;
        }
      }
      curr.isEndOfWord = true;
      curr.word = w;
    };

    // Populate words from dictionary and current word
    const wordsToSeed = new Set<string>();
    if (trieState?.dictionary) {
      trieState.dictionary.forEach((w) => {
        if (typeof w === "string" && w.length > 0) wordsToSeed.add(w);
      });
    }
    if (trieState?.word && typeof trieState.word === "string" && trieState.word.length > 0) {
      wordsToSeed.add(trieState.word);
    }
    // Also check safeNodes for single char nodes or string paths
    if (wordsToSeed.size === 0) {
      wordsToSeed.add("app");
      wordsToSeed.add("apple");
    }

    wordsToSeed.forEach((w) => {
      if (typeof w === "string" && w.length > 0) {
        insertWord(w);
      }
    });

    // Layout calculation: Assign (x, y) coordinates
    let leafCounter = 0;
    const levelHeightTrie = 68;

    const computeSubtreeLayout = (
      node: InternalTrieNode,
      depth: number,
      parentLayoutNode: LayoutTrieNode | null,
    ): LayoutTrieNode => {
      const childArray = Array.from(node.children.values());
      const layoutChildren: LayoutTrieNode[] = [];

      let layoutNode: LayoutTrieNode = {
        id: node.id,
        char: node.char,
        word: node.word,
        isEndOfWord: node.isEndOfWord,
        depth,
        x: 0,
        y: 42 + depth * levelHeightTrie,
        parentId: parentLayoutNode ? parentLayoutNode.id : null,
        children: layoutChildren,
        isActivePath: false,
        isCurrent: currentStr !== null && (node.char === currentStr || node.id === currentStr),
      };

      if (childArray.length === 0) {
        layoutNode.x = (leafCounter + 0.5) * 85 + 40;
        leafCounter++;
      } else {
        childArray.forEach((child) => {
          layoutChildren.push(computeSubtreeLayout(child, depth + 1, layoutNode));
        });
        if (layoutChildren.length > 0) {
          const firstChild = layoutChildren[0];
          const lastChild = layoutChildren[layoutChildren.length - 1];
          if (firstChild && lastChild) {
            layoutNode.x = (firstChild.x + lastChild.x) / 2;
          }
        }
      }

      // Check if node is part of active word prefix path
      if (trieState?.word && node.char !== "∅") {
        const fullWord = trieState.word;
        if (fullWord.includes(node.char)) {
          layoutNode.isActivePath = true;
        }
      }

      return layoutNode;
    };

    const layoutRoot = computeSubtreeLayout(root, 0, null);
    const calculatedWidth = Math.max(560, leafCounter * 90 + 80);
    const maxDepth = 5;
    const calculatedHeight = Math.max(220, 60 + maxDepth * levelHeightTrie);

    // Flatten nodes & collect edges
    const flatNodes: LayoutTrieNode[] = [];
    const flatEdges: {
      from: LayoutTrieNode;
      to: LayoutTrieNode;
      char: string;
      isActive: boolean;
    }[] = [];

    const traverseFlat = (n: LayoutTrieNode) => {
      flatNodes.push(n);
      n.children.forEach((c) => {
        flatEdges.push({
          from: n,
          to: c,
          char: c.char,
          isActive: c.isActivePath || c.isCurrent,
        });
        traverseFlat(c);
      });
    };
    traverseFlat(layoutRoot);

    return {
      root: layoutRoot,
      flatNodes,
      flatEdges,
      width: calculatedWidth,
      height: calculatedHeight,
    };
  }, [type, trieState, currentStr, safeNodes]);

  // Compute depth (supports up to 6 levels for binary trees)
  const depth = useMemo(() => {
    if (safeNodes.length === 0) return 1;
    let maxIdx = 0;
    for (let idx = 0; idx < safeNodes.length; idx++) {
      if (safeNodes[idx] !== null) {
        maxIdx = idx;
      }
    }
    return Math.min(6, Math.max(1, Math.floor(Math.log2(maxIdx + 1)) + 1));
  }, [safeNodes]);

  const svgWidth = depth >= 5 ? 720 : depth >= 4 ? 640 : 560;
  const levelHeight = depth >= 5 ? 58 : 68;
  const svgHeight = Math.max(200, 55 + depth * levelHeight);

  // Compute position for each node in standard binary tree
  const nodePositions = useMemo(() => {
    const totalSlots = 2 ** depth - 1;
    const positions: {
      index: number;
      val: Val | null;
      x: number;
      y: number;
      level: number;
      isLeftChild: boolean;
      isRightChild: boolean;
      parentIdx: number | null;
    }[] = [];

    for (let i = 0; i < Math.min(safeNodes.length, totalSlots); i++) {
      const val = safeNodes[i] ?? null;
      const level = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (2 ** level - 1);
      const levelSlots = 2 ** level;
      const x = (posInLevel + 0.5) * (svgWidth / levelSlots);
      const y = 42 + level * levelHeight;
      const parentIdx = i === 0 ? null : Math.floor((i - 1) / 2);
      const isLeftChild = i > 0 && i % 2 === 1;
      const isRightChild = i > 0 && i % 2 === 0;

      positions.push({
        index: i,
        val,
        x,
        y,
        level,
        isLeftChild,
        isRightChild,
        parentIdx,
      });
    }
    return positions;
  }, [safeNodes, depth, svgWidth, levelHeight]);

  // LCA and Diameter path indices
  const lcaPathIndicesSet = useMemo(() => {
    const set = new Set<number>();
    if (structuralState?.ancestorPathP) {
      structuralState.ancestorPathP.forEach((v) => {
        const idx = findNodeIndex(v);
        if (idx !== null) set.add(idx);
      });
    }
    if (structuralState?.ancestorPathQ) {
      structuralState.ancestorPathQ.forEach((v) => {
        const idx = findNodeIndex(v);
        if (idx !== null) set.add(idx);
      });
    }
    return set;
  }, [structuralState]);

  // Compute branches/edges between parents and children
  const edges = useMemo<TreeEdge[]>(() => {
    const lines: TreeEdge[] = [];

    nodePositions.forEach((node) => {
      if (node.val === null || node.index === 0) return;
      const parentIdx = Math.floor((node.index - 1) / 2);
      const parent = nodePositions[parentIdx];
      if (!parent || parent.val === null) return;

      const isCurrentBranch = Boolean(
        currentStr !== null &&
        (String(node.val) === currentStr ||
          (node.index === 0 && currentStr === "0") ||
          (bstState?.decision && (String(parent.val) === currentStr || String(node.val) === currentStr))),
      );

      const isVisitedBranch =
        (visitedSet.has(String(node.val)) || visitedSet.has(String(node.index))) &&
        (visitedSet.has(String(parent.val)) || visitedSet.has(String(parent.index)));

      const isLcaPath =
        lcaPathIndicesSet.has(node.index) && lcaPathIndicesSet.has(parentIdx);

      const edgeItem: TreeEdge = {
        fromIdx: parentIdx,
        toIdx: node.index,
        x1: parent.x,
        y1: parent.y,
        x2: node.x,
        y2: node.y,
        isLeft: node.isLeftChild,
        isActive: isCurrentBranch,
        isVisited: isVisitedBranch,
        isDiameterPath: false,
        isLcaPath,
      };

      if (type === "trie") {
        edgeItem.char = String(node.val);
      }

      lines.push(edgeItem);
    });
    return lines;
  }, [nodePositions, currentStr, visitedSet, bstState, lcaPathIndicesSet, type]);

  // Render Trie Operations Inspector & Word Bank HUD
  const renderTrieHUD = () => {
    if (!trieState) return null;
    const { word, operation, isFound, activeChar, matchedChars, remainingChars, dictionary } = trieState;

    return (
      <div className="flex flex-col gap-2.5 w-full px-4 py-3 rounded-xl bg-card/80 border border-teal-500/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <FolderTree className="size-4 text-teal-400" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              Trie / Prefix Tree Operations Engine
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 font-black uppercase">
              OP: {(operation ?? "lookup").toUpperCase()}
            </span>
            {isFound !== null && (
              <span
                className={`px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1 border ${
                  isFound
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}
              >
                {isFound ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                {isFound ? "FOUND (TRUE)" : "NOT FOUND (FALSE)"}
              </span>
            )}
          </div>
        </div>

        {/* Word Query Character-by-Character Ribbon */}
        {word && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-[11px] font-bold">Query Word:</span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-background border border-border">
                {word.split("").map((ch, idx) => {
                  const isMatched = matchedChars && idx < matchedChars.length;
                  const isActive = activeChar === ch && idx === matchedChars?.length;
                  return (
                    <span
                      key={`ch-${idx}`}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                        isActive
                          ? "bg-teal-500 text-teal-950 font-black scale-110 shadow-xs animate-pulse"
                          : isMatched
                            ? "bg-emerald-500/25 text-emerald-300 font-bold"
                            : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Dictionary Word Bank */}
            {dictionary && dictionary.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <BookOpen className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-semibold">Trie Words:</span>
                {dictionary.map((dictWord, i) => (
                  <span
                    key={`dict-${i}`}
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold ${
                      dictWord === word
                        ? "bg-teal-500/30 text-teal-200 border-teal-500"
                        : "bg-background/80 text-muted-foreground border-border"
                    }`}
                  >
                    "{dictWord}"
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render Traversal Output Ribbon & Stack HUD
  const renderTraversalHUD = () => {
    if (!traversalState) return null;
    const { order, output } = traversalState;

    const orderNames: Record<string, string> = {
      preorder: "Pre-Order Traversal (Root ➔ Left ➔ Right)",
      inorder: "In-Order Traversal (Left ➔ Root ➔ Right)",
      postorder: "Post-Order Traversal (Left ➔ Right ➔ Root)",
      levelorder: "Level-Order BFS Traversal (Queue-based)",
      morris: "Morris In-Order Traversal (O(1) Auxiliary Space)",
    };

    return (
      <div className="flex flex-col gap-2.5 w-full px-4 py-3 rounded-xl bg-card/80 border border-primary/30 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <Route className="size-4 text-primary" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              {orderNames[order.toLowerCase()] ?? `${order.toUpperCase()} Traversal Engine`}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">Visited Nodes:</span>
            <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary font-black border border-primary/30">
              {output.length} / {safeNodes.filter((x) => x !== null).length}
            </span>
          </div>
        </div>

        {/* Traversal Output Sequence Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-thin">
          <span className="font-mono text-[11px] font-bold text-muted-foreground whitespace-nowrap">
            Output Stream:
          </span>
          {output.length === 0 ? (
            <span className="font-mono text-xs text-muted-foreground italic">
              Traversing tree...
            </span>
          ) : (
            output.map((val, idx) => {
              const isLatest = idx === output.length - 1;
              return (
                <div
                  key={`traversal-out-${idx}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-xs transition-all ${
                    isLatest
                      ? "bg-primary text-primary-foreground font-black border-primary shadow-xs scale-105"
                      : "bg-background/90 text-foreground border-border/80 font-bold"
                  }`}
                >
                  <span className="text-[10px] opacity-70">#{idx + 1}</span>
                  <span>{String(val)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Render Structural Telemetry (Depth, LCA, Inversion, Diameter) HUD
  const renderStructuralHUD = () => {
    if (!structuralState) return null;
    const { isInverted, lcaNodes, diameter, currentDepth } = structuralState;

    return (
      <div className="flex flex-col gap-2.5 w-full px-4 py-3 rounded-xl bg-card/80 border border-indigo-500/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <Network className="size-4 text-indigo-400" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              Tree Structural & Topological Telemetry
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
            {isInverted && (
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black flex items-center gap-1">
                <Shuffle className="size-3.5 text-amber-400" />
                SUBTREES INVERTED (L ⇄ R)
              </span>
            )}
            {lcaNodes && (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                <AiWord className="size-3.5 text-emerald-400" />
                LCA Convergence
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border">
              <span className="text-muted-foreground">Tree Max Depth:</span>
              <strong className="text-foreground">{depth}</strong>
            </div>

            {currentDepth !== undefined && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground">Current Level:</span>
                <strong className="text-primary">{currentDepth}</strong>
              </div>
            )}

            {diameter !== undefined && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <Maximize2 className="size-3.5 text-purple-400" />
                <span>Tree Diameter:</span>
                <strong className="text-foreground font-black">{diameter}</strong>
              </div>
            )}
          </div>

          {/* LCA Target Nodes Callout */}
          {lcaNodes && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                p: {String(lcaNodes.p)}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                q: {String(lcaNodes.q)}
              </span>
              {lcaNodes.lca && (
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black">
                  LCA: {String(lcaNodes.lca)} ★
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Binary Search Tree (BST) Engine HUD
  const renderBstHUD = () => {
    if (!bstState) return null;
    const { target, decision, comparison, isValidBst, violationNode, successor, predecessor } = bstState;

    return (
      <div className="flex flex-col gap-2.5 w-full px-4 py-3 rounded-xl bg-card/80 border border-emerald-500/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              Binary Search Tree (BST) Engine & Invariant Inspector
            </span>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-xs">
            {isValidBst !== false ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-400" />
                BST Invariant Valid (Left &lt; Node &lt; Right)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black flex items-center gap-1 animate-pulse">
                <ShieldAlert className="size-3.5 text-rose-400" />
                Invariant Violation at Node [{String(violationNode)}]
              </span>
            )}
          </div>
        </div>

        {/* Comparison Callout & Search Descent Decision */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            {target !== null && target !== undefined && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border">
                <Search className="size-3.5 text-primary" />
                <span className="text-muted-foreground">Target Key:</span>
                <strong className="text-foreground font-bold">{String(target)}</strong>
              </div>
            )}

            {comparison && (
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                <Activity className="size-3.5 text-emerald-400" />
                <span>{comparison}</span>
              </div>
            )}
          </div>

          {(successor !== null && successor !== undefined) || (predecessor !== null && predecessor !== undefined) ? (
            <div className="flex items-center gap-2">
              {predecessor !== null && predecessor !== undefined && (
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  Predecessor: {String(predecessor)}
                </span>
              )}
              {successor !== null && successor !== undefined && (
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  Successor: {String(successor)}
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  // Render Specialized Trie View
  const renderTrieCanvas = () => {
    if (!trieLayout) return null;
    const { flatNodes, flatEdges, width: trieW, height: trieH } = trieLayout;

    return (
      <div className="relative flex min-h-[250px] items-center justify-center overflow-x-auto rounded-xl border border-teal-500/30 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-5 shadow-inner">
        <svg
          viewBox={`0 0 ${trieW} ${trieH}`}
          className="h-auto w-full max-w-[760px] select-none"
        >
          <defs>
            <filter id="trie-active-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="trie-active-edge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Trie Edges */}
          {flatEdges.map((edge, idx) => (
            <g key={`trie-edge-${idx}`}>
              <line
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                stroke={edge.isActive ? "url(#trie-active-edge)" : "currentColor"}
                strokeWidth={edge.isActive ? 3 : 1.75}
                strokeDasharray={edge.isActive ? "4 2" : "none"}
                className={`transition-all duration-300 ${
                  edge.isActive ? "text-teal-400" : "text-border"
                }`}
              />

              {/* Edge Transition Character Chip */}
              <g
                transform={`translate(${(edge.from.x + edge.to.x) / 2}, ${(edge.from.y + edge.to.y) / 2 - 4})`}
              >
                <rect
                  x="-9"
                  y="-9"
                  width="18"
                  height="18"
                  rx="4"
                  className={`${
                    edge.isActive
                      ? "fill-teal-950 stroke-teal-400 stroke-2"
                      : "fill-background/90 stroke-border/70"
                  }`}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`font-mono text-[10px] font-black ${
                    edge.isActive ? "fill-teal-300" : "fill-primary"
                  }`}
                >
                  {edge.char}
                </text>
              </g>
            </g>
          ))}

          {/* Trie Nodes */}
          {flatNodes.map((node) => {
            const isRoot = node.char === "∅";
            const isTerminal = node.isEndOfWord;
            const isActive = node.isActivePath || node.isCurrent;

            return (
              <g
                key={`trie-node-${node.id}`}
                transform={`translate(${node.x}, ${node.y})`}
                className="transition-all duration-300"
              >
                {/* Active Glowing Ring */}
                {isActive && (
                  <circle
                    r="24"
                    className="fill-teal-500/20 stroke-teal-400/80 stroke-2 animate-pulse"
                  />
                )}

                {/* Floating Word Badge for Terminal Nodes */}
                {isTerminal && node.word && (
                  <g transform="translate(0, -25)">
                    <rect
                      x={-(node.word.length * 4 + 12)}
                      y="-7"
                      width={node.word.length * 8 + 24}
                      height="14"
                      rx="4"
                      className="fill-emerald-950 stroke-emerald-400 stroke"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-emerald-300 font-mono text-[8px] font-black"
                    >
                      WORD: "{node.word}"
                    </text>
                  </g>
                )}

                {/* Root Badge */}
                {isRoot && (
                  <g transform="translate(0, -24)">
                    <rect
                      x="-16"
                      y="-6.5"
                      width="32"
                      height="13"
                      rx="3.5"
                      className="fill-teal-950 stroke-teal-400 stroke"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-teal-300 font-mono text-[8px] font-bold"
                    >
                      ROOT
                    </text>
                  </g>
                )}

                {/* Main Node Circle */}
                <circle
                  r="18"
                  filter={isActive ? "url(#trie-active-glow)" : undefined}
                  className={`transition-all duration-300 ${
                    isActive
                      ? "fill-teal-600 stroke-teal-300 stroke-2 text-white"
                      : isTerminal
                        ? "fill-emerald-950 stroke-emerald-400 stroke-2 text-emerald-200"
                        : "fill-card stroke-border stroke-2 text-foreground"
                  }`}
                />

                {/* Double Concentric Ring for Terminal / isEndOfWord */}
                {isTerminal && (
                  <circle
                    r="14"
                    className="fill-none stroke-emerald-400/80 stroke-1.5 stroke-dashed"
                  />
                )}

                {/* Node Character */}
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`font-mono text-xs font-bold select-none ${
                    isActive
                      ? "fill-white font-black"
                      : isTerminal
                        ? "fill-emerald-300 font-extrabold"
                        : "fill-foreground"
                  }`}
                >
                  {node.char}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Render Segment Tree Range Query & Point Update HUD
  const renderSegmentTreeHUD = () => {
    if (!segmentTreeState) return null;
    const { operation, queryRange, updateIndex, updateValue, aggregateResult } = segmentTreeState;

    return (
      <div className="flex flex-col gap-2.5 w-full px-4 py-3 rounded-xl bg-card/80 border border-emerald-500/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              Segment Tree Range & Interval Engine
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black uppercase">
              OP: {operation?.toUpperCase() ?? "QUERY"}
            </span>
            {queryRange && (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Query Range: [{queryRange[0]}, {queryRange[1]}]
              </span>
            )}
            {updateIndex !== null && updateIndex !== undefined && (
              <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold">
                Point Update: idx[{updateIndex}] ➔ {String(updateValue)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Aggregate Result:</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-sm">
              {aggregateResult !== null && aggregateResult !== undefined ? String(aggregateResult) : "—"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-emerald-400 inline-block" />
              <span className="text-emerald-300 font-bold">Full Overlap</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-amber-300 font-bold">Partial Overlap</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-muted-foreground/40 inline-block" />
              <span className="text-muted-foreground">Outside Range</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render Fenwick Tree (Binary Indexed Tree - BIT) HUD
  const renderFenwickHUD = () => {
    if (!fenwickTreeState) return null;
    const { operation, activeBitIndex, prefixSum, formula } = fenwickTreeState;

    return (
      <div className="flex flex-col gap-2.5 w-full px-4 py-3 rounded-xl bg-card/80 border border-indigo-500/40 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <Binary className="size-4 text-indigo-400" />
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              Fenwick Tree (Binary Indexed Tree - BIT)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-black uppercase">
              OP: {operation?.replace(/_/g, " ").toUpperCase()}
            </span>
            {activeBitIndex !== null && activeBitIndex !== undefined && (
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                BIT Index: {activeBitIndex} (0b{activeBitIndex.toString(2).padStart(4, "0")})
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Prefix Sum / Result:</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-black">
              {prefixSum !== null && prefixSum !== undefined ? String(prefixSum) : "—"}
            </span>
          </div>

          {formula && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background border border-indigo-500/30 text-indigo-200">
              <Cpu className="size-3.5 text-indigo-400" />
              <span>{formula}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Dynamic Algorithmic HUDs */}
      {renderTrieHUD()}
      {renderTraversalHUD()}
      {renderStructuralHUD()}
      {renderBstHUD()}
      {renderSegmentTreeHUD()}
      {renderFenwickHUD()}

      {/* Primary SVG Canvas: Trie Mode vs Standard Binary Tree Mode */}
      {type === "trie" || trieState ? (
        renderTrieCanvas()
      ) : (
        <div className="relative flex min-h-[250px] items-center justify-center overflow-x-auto rounded-xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-5 shadow-inner">
          {safeNodes.length === 0 || safeNodes.every((v) => v === null) ? (
            <span className="font-mono text-sm text-muted-foreground">Empty tree (NULL ∅)</span>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-auto w-full max-w-[700px] select-none"
            >
              {/* Defs for gradients & filters */}
              <defs>
                <filter id="active-node-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="active-branch" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="oklch(0.78 0.15 205)" />
                  <stop offset="100%" stopColor="oklch(0.70 0.17 275)" />
                </linearGradient>
                <linearGradient id="lca-branch" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              {/* Connecting Edges (Left / Right Branches) */}
              {edges.map((edge) => (
                <g key={`edge-${edge.fromIdx}-${edge.toIdx}`}>
                  {/* Curved / Linear connecting branch */}
                  <line
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke={
                      edge.isLcaPath
                        ? "url(#lca-branch)"
                        : edge.isActive
                          ? "url(#active-branch)"
                          : edge.isVisited
                            ? "oklch(0.70 0.17 275 / 0.7)"
                            : "currentColor"
                    }
                    strokeWidth={edge.isActive || edge.isLcaPath ? 3.5 : 2}
                    strokeDasharray={edge.isActive ? "4 2" : "none"}
                    className={`transition-all duration-300 ${
                      edge.isActive
                        ? "text-primary"
                        : edge.isVisited
                          ? "text-accent"
                          : "text-border"
                    }`}
                  />

                  {/* Left (L) / Right (R) Branch Orientation Chip */}
                  {depth <= 5 && (
                    <g
                      transform={`translate(${(edge.x1 + edge.x2) / 2}, ${(edge.y1 + edge.y2) / 2})`}
                    >
                      <rect
                        x="-7"
                        y="-7"
                        width="14"
                        height="14"
                        rx="3"
                        className="fill-background/90 stroke-border/70"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={`font-mono text-[8px] font-black ${
                          edge.isLeft ? "fill-sky-400" : "fill-amber-400"
                        }`}
                      >
                        {edge.isLeft ? "L" : "R"}
                      </text>
                    </g>
                  )}
                </g>
              ))}

              {/* Tree Nodes */}
              {nodePositions.map((node) => {
                if (node.val === null) return null;
                const nodeValStr = String(node.val);

                const isCurrent =
                  currentStr !== null &&
                  (nodeValStr === currentStr ||
                    (node.index === 0 && currentStr === "0" && node.val !== null) ||
                    currentStr === String(node.index));

                const isVisited =
                  visitedSet.has(nodeValStr) ||
                  (visitedSet.has(String(node.index)) && visited.length <= safeNodes.length);

                const isRoot = node.index === 0;

                // LCA nodes detection
                const isLcaP =
                  structuralState?.lcaNodes?.p !== undefined &&
                  String(structuralState.lcaNodes.p) === nodeValStr;
                const isLcaQ =
                  structuralState?.lcaNodes?.q !== undefined &&
                  String(structuralState.lcaNodes.q) === nodeValStr;
                const isLcaMeet =
                  structuralState?.lcaNodes?.lca !== undefined &&
                  String(structuralState.lcaNodes.lca) === nodeValStr;

                // BST Invariant range bounds
                const isBstViolation =
                  bstState?.violationNode !== null &&
                  bstState?.violationNode !== undefined &&
                  String(bstState.violationNode) === nodeValStr;

                // Segment Tree Overlap Calculation
                const nodeRange = segmentNodeRanges ? segmentNodeRanges[node.index] : undefined;
                const isFullOverlap = Boolean(
                  nodeRange &&
                    segmentRange &&
                    nodeRange[0] >= segmentRange[0] &&
                    nodeRange[1] <= segmentRange[1],
                );
                const isPartialOverlap = Boolean(
                  nodeRange &&
                    segmentRange &&
                    !isFullOverlap &&
                    Math.max(nodeRange[0], segmentRange[0]) <= Math.min(nodeRange[1], segmentRange[1]),
                );

                return (
                  <g
                    key={`node-${node.index}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="transition-all duration-300"
                  >
                    {/* Outer glowing halo for active node, LCA, or segment overlap */}
                    {(isCurrent || isFullOverlap || isLcaMeet) && (
                      <circle
                        r="25"
                        className={`transition-all duration-300 ${
                          isLcaMeet
                            ? "fill-emerald-500/20 stroke-emerald-400/80 animate-pulse stroke-2"
                            : isFullOverlap
                              ? "fill-emerald-500/15 stroke-emerald-500/60 animate-pulse"
                              : "fill-primary/10 stroke-primary/50"
                        }`}
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Floating Metadata Badges Above Node (ROOT, P, Q, LCA ★) */}
                    <g transform="translate(0, -25)">
                      {isLcaMeet ? (
                        <rect
                          x="-20"
                          y="-7"
                          width="40"
                          height="14"
                          rx="4"
                          className="fill-emerald-950 stroke-emerald-400 stroke"
                        />
                      ) : isLcaP ? (
                        <rect
                          x="-12"
                          y="-7"
                          width="24"
                          height="14"
                          rx="4"
                          className="fill-sky-950 stroke-sky-400 stroke"
                        />
                      ) : isLcaQ ? (
                        <rect
                          x="-12"
                          y="-7"
                          width="24"
                          height="14"
                          rx="4"
                          className="fill-amber-950 stroke-amber-400 stroke"
                        />
                      ) : isRoot && !nodeRange ? (
                        <rect
                          x="-16"
                          y="-6.5"
                          width="32"
                          height="13"
                          rx="3.5"
                          className="fill-primary/20 stroke-primary/50 stroke"
                        />
                      ) : null}

                      {isLcaMeet ? (
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-emerald-300 font-mono text-[8px] font-black"
                        >
                          LCA ★
                        </text>
                      ) : isLcaP ? (
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-sky-300 font-mono text-[8px] font-black"
                        >
                          P
                        </text>
                      ) : isLcaQ ? (
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-amber-300 font-mono text-[8px] font-black"
                        >
                          Q
                        </text>
                      ) : isRoot && !nodeRange ? (
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-primary font-mono text-[8px] font-bold"
                        >
                          ROOT
                        </text>
                      ) : null}
                    </g>

                    {/* Segment Node Range Badge */}
                    {nodeRange && (() => {
                      const rangeText = `[${nodeRange[0]},${nodeRange[1]}]`;
                      const rangeW = Math.max(36, rangeText.length * 5.5 + 10);
                      return (
                        <g transform="translate(0, -26)">
                          <rect
                            x={-rangeW / 2}
                            y="-6.5"
                            width={rangeW}
                            height="13"
                            rx="4"
                            className={
                              isFullOverlap
                                ? "fill-emerald-950/90 stroke-emerald-500 stroke"
                              : isPartialOverlap
                                ? "fill-amber-950/90 stroke-amber-500 stroke"
                                : "fill-background/90 stroke-border/70 stroke"
                            }
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={`font-mono text-[8px] font-bold ${
                              isFullOverlap
                                ? "fill-emerald-300 font-extrabold"
                                : isPartialOverlap
                                  ? "fill-amber-300 font-bold"
                                  : "fill-muted-foreground"
                            }`}
                          >
                            {rangeText}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Main Node Circle / Dynamic Capsule */}
                    {(() => {
                      const valText = toText(node.val);
                      const baseR = 19;
                      const capsuleW = Math.max(baseR * 2, valText.length * 7 + 16);
                      return (
                        <>
                          <rect
                            x={-capsuleW / 2}
                            y={-baseR}
                            width={capsuleW}
                            height={baseR * 2}
                            rx={baseR}
                            filter={isCurrent ? "url(#active-node-glow)" : undefined}
                            className={`transition-all duration-300 ${
                              isBstViolation
                                ? "fill-rose-600 stroke-rose-400 stroke-2 text-white"
                                : isLcaMeet
                                  ? "fill-emerald-600 stroke-emerald-300 stroke-2 text-white"
                                  : isCurrent
                                    ? "fill-primary stroke-primary/90 stroke-2 text-primary-foreground"
                                    : isFullOverlap
                                      ? "fill-emerald-600 stroke-emerald-400 stroke-2 text-white"
                                      : isPartialOverlap
                                        ? "fill-amber-600/30 stroke-amber-400 stroke-2 text-amber-200"
                                        : isVisited
                                          ? "fill-accent/20 stroke-accent/70 stroke-2 text-accent"
                                          : "fill-card stroke-border stroke-2 text-foreground hover:stroke-muted-foreground"
                            }`}
                          />

                          {/* Node Value */}
                          <text
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className={`font-mono ${valText.length > 6 ? "text-[10px]" : "text-xs"} font-bold select-none ${
                              isCurrent || isFullOverlap || isLcaMeet || isBstViolation
                                ? "fill-primary-foreground font-extrabold"
                                : isPartialOverlap
                                  ? "fill-amber-300 font-bold"
                                  : isVisited
                                    ? "fill-accent font-semibold"
                                    : "fill-foreground"
                            }`}
                          >
                            {valText}
                          </text>
                        </>
                      );
                    })()}

                    {/* Node Index Chip & Level */}
                    <text
                      y="27"
                      textAnchor="middle"
                      className="fill-muted-foreground font-mono text-[9px] select-none opacity-80"
                    >
                      i={node.index}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      )}

      {/* Heap Array Buffer & Index Mapping View */}
      {type === "heap" && (
        <div className="flex flex-col gap-2 rounded-xl border border-border/80 bg-card/50 p-3.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px]">
              Heap Array Buffer Representation
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              Parent(i) = ⌊(i-1)/2⌋ · Left = 2i+1 · Right = 2i+2
            </span>
          </div>

          <div className="flex flex-wrap gap-2 overflow-x-auto pt-1">
            {safeNodes.map((val, idx) => {
              if (val === null) return null;
              const isCurrent =
                currentStr !== null && (String(val) === currentStr || String(idx) === currentStr);
              return (
                <div
                  key={`heap-arr-${idx}`}
                  className={`flex flex-col items-center rounded-lg border p-1.5 transition-all duration-300 ${
                    isCurrent
                      ? "border-primary bg-primary/20 text-primary shadow-sm shadow-primary/30"
                      : "border-border/80 bg-background/60 text-foreground"
                  }`}
                >
                  <span className="font-mono text-[9px] text-muted-foreground">[{idx}]</span>
                  <span className="font-mono text-sm font-bold">{String(val)}</span>
                  {idx === 0 && (
                    <span className="rounded bg-primary/20 px-1 text-[8px] font-semibold text-primary">
                      ROOT
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Segment Tree Query Range & Legend Block */}
      {(segmentRange || segmentNodeRanges || segmentTreeState) && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/40 bg-card/60 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono uppercase font-bold text-[11px] text-muted-foreground">
                Segment Range Query:
              </span>
              {segmentRange || segmentTreeState?.queryRange ? (
                <span className="rounded-md border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-0.5 font-mono text-xs font-black text-emerald-300">
                  [{segmentRange ? segmentRange[0] : segmentTreeState?.queryRange?.[0]}, {segmentRange ? segmentRange[1] : segmentTreeState?.queryRange?.[1]}]
                </span>
              ) : (
                <span className="font-mono text-muted-foreground/60 text-xs">Full Interval Decomposition</span>
              )}
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-emerald-300">Full Overlap (Sum Contributor)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-amber-300">Partial Overlap (Recurse)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-border inline-block" />
                <span className="text-muted-foreground">Outside Query Range</span>
              </span>
            </div>
          </div>

          {/* Original Array vs Tree Array Representation */}
          {segmentTreeState?.originalArray && segmentTreeState.originalArray.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
              <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                Original Leaf Array (Indices 0..{segmentTreeState.originalArray.length - 1}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {segmentTreeState.originalArray.map((v, idx) => {
                  const isUpdated = segmentTreeState.updateIndex === idx;
                  const inQueryRange =
                    segmentTreeState.queryRange &&
                    idx >= segmentTreeState.queryRange[0] &&
                    idx <= segmentTreeState.queryRange[1];
                  return (
                    <div
                      key={`seg-orig-${idx}`}
                      className={`flex flex-col items-center px-2 py-1 rounded border font-mono text-xs transition-all ${
                        isUpdated
                          ? "border-sky-400 bg-sky-500/25 text-sky-200 font-black shadow-xs"
                          : inQueryRange
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-200 font-bold"
                            : "border-border/70 bg-background/60 text-muted-foreground"
                      }`}
                    >
                      <span className="text-[9px] opacity-70">[{idx}]</span>
                      <span>{String(v)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fenwick Tree (BIT) Array Inspector */}
      {fenwickTreeState && (
        <div className="flex flex-col gap-2 rounded-xl border border-indigo-500/40 bg-card/60 p-3.5 text-xs font-mono">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-300">
              Binary Indexed Tree (BIT) 1-Indexed Vector
            </span>
            <span className="text-[10px] text-muted-foreground">
              LSB isolate: (idx & -idx) · Parent: idx += LSB · Query: idx -= LSB
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {fenwickTreeState.treeArray.map((val, idx) => {
              const isBitActive = fenwickTreeState.activeBitIndex === idx;
              return (
                <div
                  key={`bit-cell-${idx}`}
                  className={`flex flex-col items-center rounded-lg border p-1.5 min-w-[42px] transition-all ${
                    isBitActive
                      ? "border-indigo-400 bg-indigo-500/30 text-indigo-200 font-black scale-105 shadow-sm shadow-indigo-500/30"
                      : "border-border/80 bg-background/60 text-foreground"
                  }`}
                >
                  <span className="text-[9px] text-muted-foreground">[{idx}]</span>
                  <span className="text-sm font-bold">{String(val)}</span>
                  <span className="text-[8px] font-mono text-muted-foreground">
                    0b{idx.toString(2).padStart(3, "0")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

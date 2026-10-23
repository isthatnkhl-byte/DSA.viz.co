import React, { useMemo, useState } from "react";
import { AiWord } from "@/components/brand/AiWord";
import type { Val, Dp1DState, Dp2DState, DpDependencyArc, DpTransitionChoice } from "./VisualizerTypes";
import { coordKey, safeArray, safeMatrix, toText } from "./VisualizerTypes";
import {
  Table,
  CheckCircle,
  ArrowDownRight,
  ArrowDown,
  ArrowRight,
  Calculator,
  Route,
  Coins,
  Footprints,
  Home,
  Layers,
  Zap,
  TrendingUp,
  Info,
  Check,
  X,
  Compass,
  CornerDownRight,
  ArrowUpRight,
  Package,
} from "lucide-react";

interface DpTableVisualizerProps {
  matrix?: Val[][] | null | undefined;
  cols?: number | null | undefined;
  left?: number | null | undefined;
  right?: number | null | undefined;
  left2?: number | null | undefined;
  right2?: number | null | undefined;
  current: Val | null | undefined;
  visited: Val[];
  array?: Val[] | null | undefined;
  secondaryArray?: Val[] | null | undefined;
  rowLabels?: string[] | null | undefined;
  colLabels?: string[] | null | undefined;
  direction?: string | null | undefined;
  wSum?: number | null | undefined;
  mSum?: number | null | undefined;
  pointer_labels?: Record<string, string> | null;
  dp1dState?: Dp1DState | null | undefined;
  dp2dState?: Dp2DState | null | undefined;
  desc?: string | null | undefined;
  variables?: Record<string, any> | null | undefined;
}

export function DpTableVisualizer({
  matrix: rawMatrix,
  cols: rawCols,
  left,
  right,
  left2,
  right2,
  current,
  visited: rawVisited,
  array: rawArray,
  secondaryArray: rawSecondaryArray,
  rowLabels: rawRowLabels,
  colLabels: rawColLabels,
  direction,
  wSum,
  mSum,
  pointer_labels,
  dp1dState: rawDp1dState,
  dp2dState: rawDp2dState,
  desc: propDesc,
  variables,
}: DpTableVisualizerProps) {
  const [selectedCell, setSelectedCell] = useState<{ r?: number; c?: number; index?: number } | null>(null);
  const [viewMode, setViewMode] = useState<"auto" | "1d" | "2d" | "formula">("auto");

  const matrix = useMemo(() => safeMatrix(rawMatrix ?? []), [rawMatrix]);
  const visited = useMemo(() => safeArray(rawVisited), [rawVisited]);
  const inputArray = useMemo(() => safeArray(rawArray ?? []), [rawArray]);
  const secondaryArray = useMemo(() => safeArray(rawSecondaryArray ?? []), [rawSecondaryArray]);

  const desc = propDesc ?? "";
  const currentKey = coordKey(current);

  // 1. Determine if this is primarily a 1D DP Problem or 2D DP Problem
  const is1DProblem = useMemo(() => {
    if (rawDp1dState) return true;
    if (rawDp2dState) return false;
    if (/climb|house-robber|coin-change|longest-increasing-subsequence|\blis\b|word-break|decode-ways|fibonacci|min-cost-climbing|maximum-subarray|jump-game|partition-equal-subset/i.test(desc)) {
      return true;
    }
    if (matrix.length > 1 && (matrix[0]?.length ?? 0) > 1) {
      return false;
    }
    if (inputArray.length > 0 && matrix.length <= 1) {
      return true;
    }
    return false;
  }, [rawDp1dState, rawDp2dState, desc, matrix, inputArray]);

  const activeMode = viewMode === "auto" ? (is1DProblem ? "1d" : "2d") : viewMode;

  // 2. Synthesize or Normalize 1D DP State
  const dp1d = useMemo<Dp1DState | null>(() => {
    if (rawDp1dState) return rawDp1dState;
    if (!is1DProblem && viewMode !== "1d") return null;

    // Synthesize 1D DP State from available variables and context
    const dpArr: (number | string | null)[] = [];
    const rawDp = variables?.dp ?? variables?.memo ?? variables?.f ?? (matrix.length === 1 ? matrix[0] : inputArray);
    
    if (Array.isArray(rawDp)) {
      rawDp.forEach((v) => dpArr.push(v !== undefined && v !== null ? v : null));
    } else if (inputArray.length > 0) {
      inputArray.forEach((v) => dpArr.push(v));
    }

    const currIdx =
      typeof left === "number" && !isNaN(left)
        ? left
        : typeof current === "number" && !isNaN(current)
        ? current
        : typeof variables?.i === "number"
        ? variables.i
        : typeof variables?.index === "number"
        ? variables.index
        : Math.max(0, visited.length - 1);

    // Derive Problem Specific Dependencies & Formulas
    const deps: DpDependencyArc[] = [];
    let transitionFormula = "dp[i] = f(dp[i-1], dp[i-2], ...)";
    let evaluatedFormula = "";
    let decisionReason = "";
    let optimalChoiceIndex: number | null = null;
    let inputLabel = "Input Sequence";
    let optimalAnswer: number | string | null = mSum ?? wSum ?? null;

    // Detect Specific 1D Algorithms
    if (/climb|stairs|fibonacci/i.test(desc)) {
      inputLabel = "Stair Steps";
      transitionFormula = "dp[i] = dp[i-1] + dp[i-2]";
      if (currIdx >= 2) {
        const v1 = dpArr[currIdx - 1] ?? 1;
        const v2 = dpArr[currIdx - 2] ?? 1;
        deps.push(
          { fromIndex: currIdx - 1, toIndex: currIdx, delta: -1, label: "1-step climb", value: v1, isOptimal: true },
          { fromIndex: currIdx - 2, toIndex: currIdx, delta: -2, label: "2-step climb", value: v2, isOptimal: true }
        );
        evaluatedFormula = `dp[${currIdx}] = dp[${currIdx - 1}] + dp[${currIdx - 2}] = ${v1} + ${v2} = ${Number(v1) + Number(v2)}`;
        decisionReason = `Ways to reach stair ${currIdx} equals sum of ways to reach stair ${currIdx - 1} (taking 1 step) and stair ${currIdx - 2} (taking 2 steps).`;
        optimalChoiceIndex = currIdx - 1;
      }
    } else if (/house-robber|robber/i.test(desc)) {
      inputLabel = "House Loot nums[i]";
      transitionFormula = "dp[i] = max(dp[i-1], dp[i-2] + nums[i])";
      const numsVal = inputArray[currIdx] ?? 0;
      if (currIdx >= 2) {
        const skipVal = Number(dpArr[currIdx - 1] ?? 0);
        const robVal = Number(dpArr[currIdx - 2] ?? 0) + Number(numsVal);
        const isRobBetter = robVal >= skipVal;
        deps.push(
          { fromIndex: currIdx - 1, toIndex: currIdx, delta: -1, label: "Skip House (keep prev)", value: skipVal, isOptimal: !isRobBetter },
          { fromIndex: currIdx - 2, toIndex: currIdx, delta: -2, label: `Rob House (${numsVal}) + dp[i-2]`, value: robVal, isOptimal: isRobBetter }
        );
        evaluatedFormula = `dp[${currIdx}] = max(${skipVal}, ${dpArr[currIdx - 2]} + ${numsVal}) = max(${skipVal}, ${robVal}) = ${Math.max(skipVal, robVal)}`;
        decisionReason = isRobBetter
          ? `Robbing House ${currIdx} (+${numsVal}) with loot from House ${currIdx - 2} (${dpArr[currIdx - 2]}) yields ${robVal}, exceeding skip option (${skipVal}).`
          : `Skipping House ${currIdx} preserves optimal loot ${skipVal} from House ${currIdx - 1}.`;
        optimalChoiceIndex = isRobBetter ? currIdx - 2 : currIdx - 1;
      }
    } else if (/coin-change|coins/i.test(desc)) {
      inputLabel = "Coins Available";
      transitionFormula = "dp[amount] = min(dp[amount - c] + 1) for coin c";
      const coins = inputArray.length > 0 ? inputArray.map(Number) : [1, 2, 5];
      let bestVal = Infinity;
      let bestCoin: number | null = null;
      coins.forEach((c) => {
        if (currIdx >= c) {
          const sub = Number(dpArr[currIdx - c] ?? Infinity);
          if (sub !== Infinity) {
            const candidate = sub + 1;
            const isBest = candidate < bestVal;
            if (isBest) {
              bestVal = candidate;
              bestCoin = c;
            }
            deps.push({
              fromIndex: currIdx - c,
              toIndex: currIdx,
              delta: -c,
              label: `Use coin ${c} (dp[${currIdx - c}] + 1)`,
              value: candidate,
              isOptimal: isBest,
            });
          }
        }
      });
      if (bestCoin !== null) {
        evaluatedFormula = `dp[${currIdx}] = dp[${currIdx} - ${bestCoin}] + 1 = ${dpArr[currIdx - bestCoin]} + 1 = ${bestVal}`;
        decisionReason = `Optimal coin choice is ${bestCoin}, transitioning from target ${currIdx - bestCoin} with min coin count ${bestVal}.`;
        optimalChoiceIndex = currIdx - bestCoin;
      }
    } else if (/longest-increasing-subsequence|\blis\b/i.test(desc)) {
      inputLabel = "Sequence nums[i]";
      transitionFormula = "dp[i] = 1 + max(dp[j]) for j < i where nums[j] < nums[i]";
      const currentNum = Number(inputArray[currIdx] ?? 0);
      let bestJ: number | null = null;
      let maxLen = 0;
      for (let j = 0; j < currIdx; j++) {
        const prevNum = Number(inputArray[j] ?? 0);
        if (prevNum < currentNum) {
          const prevLen = Number(dpArr[j] ?? 1);
          const isBest = prevLen > maxLen;
          if (isBest) {
            maxLen = prevLen;
            bestJ = j;
          }
          deps.push({
            fromIndex: j,
            toIndex: currIdx,
            delta: j - currIdx,
            label: `nums[${j}]=${prevNum} < ${currentNum} (len=${prevLen})`,
            value: prevLen + 1,
            isOptimal: isBest,
          });
        }
      }
      evaluatedFormula = `dp[${currIdx}] = 1 + ${maxLen} = ${maxLen + 1}`;
      decisionReason =
        bestJ !== null
          ? `Extending subsequence ending at index ${bestJ} (val ${inputArray[bestJ]}, len ${maxLen}) with nums[${currIdx}]=${currentNum}.`
          : `Starting a new subsequence of length 1 at nums[${currIdx}]=${currentNum}.`;
      optimalChoiceIndex = bestJ;
    } else {
      // Generic 1D DP fallback
      if (currIdx > 0) {
        deps.push({
          fromIndex: currIdx - 1,
          toIndex: currIdx,
          delta: -1,
          label: "dp[i-1] transition",
          value: dpArr[currIdx - 1] ?? 0,
          isOptimal: true,
        });
        evaluatedFormula = `dp[${currIdx}] = f(dp[${currIdx - 1}]) = ${dpArr[currIdx] ?? "—"}`;
        decisionReason = `Computed state at index ${currIdx} based on prior optimal subproblem at index ${currIdx - 1}.`;
        optimalChoiceIndex = currIdx - 1;
      }
    }

    if (optimalAnswer === null && dpArr.length > 0) {
      optimalAnswer = dpArr[dpArr.length - 1] ?? null;
    }

    return {
      dpArray: dpArr,
      inputArray: inputArray.length > 0 ? inputArray : undefined,
      inputLabel,
      currentIndex: currIdx,
      dependencies: deps,
      transitionFormula,
      evaluatedFormula,
      decisionReason,
      optimalChoiceIndex,
      optimalAnswer,
    };
  }, [rawDp1dState, is1DProblem, viewMode, variables, matrix, inputArray, left, current, visited, desc, mSum, wSum]);

  // 3. Synthesize or Normalize 2D DP State
  const dp2d = useMemo<Dp2DState | null>(() => {
    if (rawDp2dState) return rawDp2dState;
    if (is1DProblem && viewMode !== "2d") return null;

    const rows = matrix.length > 0 ? matrix.length : 1;
    const cols = Number(rawCols ?? matrix[0]?.length ?? 1) || 1;

    // Resolve active coordinate
    let activeR = 0;
    let activeC = 0;
    if (typeof left === "number" && typeof right === "number" && !isNaN(left) && !isNaN(right)) {
      activeR = left;
      activeC = right;
    } else if (typeof left === "number" && typeof left2 === "number" && !isNaN(left) && !isNaN(left2)) {
      activeR = left;
      activeC = left2;
    } else if (currentKey && currentKey.includes(",")) {
      const [rStr, cStr] = currentKey.split(",");
      activeR = parseInt(rStr ?? "0", 10);
      activeC = parseInt(cStr ?? "0", 10);
    } else {
      activeR = Math.min(rows - 1, Math.floor(visited.length / Math.max(1, cols)));
      activeC = visited.length % Math.max(1, cols);
    }

    const rLabels = rawRowLabels ?? (secondaryArray.length > 0 ? secondaryArray.map(String) : null);
    const cLabels = rawColLabels ?? (inputArray.length > 0 ? inputArray.map(String) : null);

    // Compute transition choices & sightlines for active cell [activeR, activeC]
    const choices: DpTransitionChoice[] = [];
    let transitionFormula = "dp[i][j] = f(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])";
    let evaluatedFormula = "";
    let decisionReason = "";

    const currVal = matrix[activeR]?.[activeC] ?? 0;
    const isLCS = /longest-common-subsequence|common-subsequence|lcs/i.test(desc);
    const isEditDistance = /edit-distance|levenshtein/i.test(desc);
    const isUniquePaths = /unique-paths|grid-paths/i.test(desc);
    const isMinPathSum = /minimum-path-sum|path-sum/i.test(desc);
    const isKnapsack = /knapsack|profitable-schemes/i.test(desc);

    const rChar = rLabels?.[activeR - 1] ?? `r${activeR}`;
    const cChar = cLabels?.[activeC - 1] ?? `c${activeC}`;
    const isMatch = rChar === cChar && activeR > 0 && activeC > 0;

    if (activeR > 0 && activeC > 0) {
      const topVal = Number(matrix[activeR - 1]?.[activeC] ?? 0);
      const leftVal = Number(matrix[activeR]?.[activeC - 1] ?? 0);
      const diagVal = Number(matrix[activeR - 1]?.[activeC - 1] ?? 0);

      if (isLCS) {
        transitionFormula = "if (s1[i-1] == s2[j-1]) dp[i][j] = dp[i-1][j-1] + 1 else max(dp[i-1][j], dp[i][j-1])";
        if (isMatch) {
          choices.push({
            direction: "diagonal",
            sourceCoord: [activeR - 1, activeC - 1],
            label: `Match '${rChar}' == '${cChar}' (dp[i-1][j-1] + 1)`,
            value: diagVal + 1,
            formula: `${diagVal} + 1 = ${diagVal + 1}`,
            isChosen: true,
          });
          evaluatedFormula = `dp[${activeR}][${activeC}] = dp[${activeR - 1}][${activeC - 1}] + 1 = ${diagVal} + 1 = ${diagVal + 1}`;
          decisionReason = `Characters match ('${rChar}' == '${cChar}'). Increment longest common subsequence length via diagonal transition.`;
        } else {
          const isTopBetter = topVal >= leftVal;
          choices.push(
            {
              direction: "top",
              sourceCoord: [activeR - 1, activeC],
              label: `Skip s1 char '${rChar}' (dp[i-1][j])`,
              value: topVal,
              formula: `${topVal}`,
              isChosen: isTopBetter,
            },
            {
              direction: "left",
              sourceCoord: [activeR, activeC - 1],
              label: `Skip s2 char '${cChar}' (dp[i][j-1])`,
              value: leftVal,
              formula: `${leftVal}`,
              isChosen: !isTopBetter,
            }
          );
          evaluatedFormula = `dp[${activeR}][${activeC}] = max(dp[${activeR - 1}][${activeC}], dp[${activeR}][${activeC - 1}]) = max(${topVal}, ${leftVal}) = ${Math.max(topVal, leftVal)}`;
          decisionReason = `Characters differ ('${rChar}' != '${cChar}'). Take maximum of excluding either character.`;
        }
      } else if (isEditDistance) {
        transitionFormula = "if match: dp[i-1][j-1] else 1 + min(replace, delete, insert)";
        if (isMatch) {
          choices.push({
            direction: "diagonal",
            sourceCoord: [activeR - 1, activeC - 1],
            label: `Match '${rChar}' == '${cChar}' (0 cost)`,
            value: diagVal,
            formula: `${diagVal}`,
            isChosen: true,
          });
          evaluatedFormula = `dp[${activeR}][${activeC}] = dp[${activeR - 1}][${activeC - 1}] = ${diagVal}`;
          decisionReason = `Characters match ('${rChar}' == '${cChar}'). Zero edit cost required.`;
        } else {
          const replaceCost = diagVal + 1;
          const deleteCost = topVal + 1;
          const insertCost = leftVal + 1;
          const minCost = Math.min(replaceCost, deleteCost, insertCost);

          choices.push(
            {
              direction: "diagonal",
              sourceCoord: [activeR - 1, activeC - 1],
              label: `Replace '${rChar}' with '${cChar}'`,
              value: replaceCost,
              formula: `${diagVal} + 1 = ${replaceCost}`,
              isChosen: replaceCost === minCost,
            },
            {
              direction: "top",
              sourceCoord: [activeR - 1, activeC],
              label: `Delete '${rChar}'`,
              value: deleteCost,
              formula: `${topVal} + 1 = ${deleteCost}`,
              isChosen: deleteCost === minCost && replaceCost !== minCost,
            },
            {
              direction: "left",
              sourceCoord: [activeR, activeC - 1],
              label: `Insert '${cChar}'`,
              value: insertCost,
              formula: `${leftVal} + 1 = ${insertCost}`,
              isChosen: insertCost === minCost && replaceCost !== minCost && deleteCost !== minCost,
            }
          );
          evaluatedFormula = `dp[${activeR}][${activeC}] = 1 + min(${diagVal}, ${topVal}, ${leftVal}) = ${minCost}`;
          decisionReason = `Optimal edit operation: ${choices.find((c) => c.isChosen)?.label}.`;
        }
      } else if (isUniquePaths) {
        transitionFormula = "dp[r][c] = dp[r-1][c] + dp[r][c-1]";
        choices.push(
          {
            direction: "top",
            sourceCoord: [activeR - 1, activeC],
            label: "From Top (dp[r-1][c])",
            value: topVal,
            formula: `${topVal}`,
            isChosen: true,
          },
          {
            direction: "left",
            sourceCoord: [activeR, activeC - 1],
            label: "From Left (dp[r][c-1])",
            value: leftVal,
            formula: `${leftVal}`,
            isChosen: true,
          }
        );
        evaluatedFormula = `dp[${activeR}][${activeC}] = dp[${activeR - 1}][${activeC}] + dp[${activeR}][${activeC - 1}] = ${topVal} + ${leftVal} = ${topVal + leftVal}`;
        decisionReason = `Total paths reaching (${activeR}, ${activeC}) equals sum of paths from above (${topVal}) and left (${leftVal}).`;
      } else if (isMinPathSum) {
        transitionFormula = "dp[r][c] = grid[r][c] + min(dp[r-1][c], dp[r][c-1])";
        const gridCost = Number(matrix[activeR]?.[activeC] ?? 1);
        const isTopBetter = topVal <= leftVal;
        choices.push(
          {
            direction: "top",
            sourceCoord: [activeR - 1, activeC],
            label: "Route from Top",
            value: topVal,
            formula: `${topVal}`,
            isChosen: isTopBetter,
          },
          {
            direction: "left",
            sourceCoord: [activeR, activeC - 1],
            label: "Route from Left",
            value: leftVal,
            formula: `${leftVal}`,
            isChosen: !isTopBetter,
          }
        );
        evaluatedFormula = `dp[${activeR}][${activeC}] = grid[${activeR}][${activeC}] + min(${topVal}, ${leftVal}) = ${gridCost} + ${Math.min(topVal, leftVal)} = ${currVal}`;
        decisionReason = `Routing from ${isTopBetter ? "Top" : "Left"} minimizes cumulative path cost to ${currVal}.`;
      } else {
        // Generic 2D DP
        choices.push(
          {
            direction: "top",
            sourceCoord: [activeR - 1, activeC],
            label: "Top Predecessor",
            value: topVal,
            formula: `${topVal}`,
            isChosen: topVal >= leftVal,
          },
          {
            direction: "left",
            sourceCoord: [activeR, activeC - 1],
            label: "Left Predecessor",
            value: leftVal,
            formula: `${leftVal}`,
            isChosen: leftVal > topVal,
          }
        );
        evaluatedFormula = `dp[${activeR}][${activeC}] = ${currVal}`;
        decisionReason = `Evaluating state transition at row ${activeR}, column ${activeC}.`;
      }
    } else {
      // Base Cases (Row 0 or Col 0)
      transitionFormula = "Base Case Boundary: dp[0][c] or dp[r][0]";
      evaluatedFormula = `dp[${activeR}][${activeC}] = ${currVal} (Boundary Condition)`;
      decisionReason = "Initialized boundary state representing empty prefix or single-direction straight line.";
    }

    const optimalAnswer = mSum ?? wSum ?? (matrix[rows - 1]?.[cols - 1] !== undefined ? matrix[rows - 1]![cols - 1] : null);

    return {
      matrix,
      rowLabels: rLabels ?? undefined,
      colLabels: cLabels ?? undefined,
      rowHeader: isLCS || isEditDistance ? "String 1 (s1)" : isKnapsack ? "Items (i)" : "Row (i)",
      colHeader: isLCS || isEditDistance ? "String 2 (s2)" : isKnapsack ? "Capacity (w)" : "Column (j)",
      activeCell: [activeR, activeC],
      choices,
      transitionFormula,
      evaluatedFormula,
      decisionReason,
      optimalAnswer,
    };
  }, [rawDp2dState, is1DProblem, viewMode, matrix, rawCols, left, right, left2, currentKey, visited, rawRowLabels, rawColLabels, secondaryArray, inputArray, desc, mSum, wSum]);

  // Handle cell click/hover inspection
  const activeInspectedFormula = useMemo(() => {
    if (!selectedCell) return null;
    if (selectedCell.index !== undefined && dp1d) {
      const idx = selectedCell.index;
      const val = dp1d.dpArray[idx];
      return {
        title: `Cell dp[${idx}] Subproblem`,
        value: val !== null && val !== undefined ? toText(val) : "—",
        detail: `Computed optimal answer for prefix subproblem of size ${idx}.`,
      };
    }
    if (selectedCell.r !== undefined && selectedCell.c !== undefined && dp2d) {
      const { r, c } = selectedCell;
      const val = dp2d.matrix[r]?.[c];
      const rChar = dp2d.rowLabels?.[r - 1] ?? (r === 0 ? "∅" : `r${r}`);
      const cChar = dp2d.colLabels?.[c - 1] ?? (c === 0 ? "∅" : `c${c}`);
      return {
        title: `Matrix Cell dp[${r}][${c}]`,
        value: val !== null && val !== undefined ? toText(val) : "0",
        detail: `Subproblem alignment for s1[0..${r}] ('${rChar}') vs s2[0..${c}] ('${cChar}').`,
      };
    }
    return null;
  }, [selectedCell, dp1d, dp2d]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header Bar & Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 p-3.5 shadow-xs backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30 shadow-inner">
            {activeMode === "1d" ? <TrendingUp className="size-5" /> : <Table className="size-5" />}
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>{activeMode === "1d" ? "1D Optimal Substructure State Array" : "2D Dynamic Programming Alignment Matrix"}</span>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary border border-primary/25 font-bold">
                {activeMode === "1d" ? `N = ${dp1d?.dpArray.length ?? inputArray.length}` : `${matrix.length} × ${dp2d?.matrix[0]?.length ?? rawCols ?? 1}`}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {activeMode === "1d"
                ? `Evaluating State dp[${dp1d?.currentIndex ?? 0}]`
                : dp2d?.activeCell
                ? `Evaluating Cell dp[${dp2d.activeCell[0]}][${dp2d.activeCell[1]}]`
                : "DP Table Initialized"}
            </div>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1">
          <button
            type="button"
            onClick={() => setViewMode("auto")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "auto"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            Auto
          </button>
          <button
            type="button"
            onClick={() => setViewMode("1d")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "1d"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            1D Array
          </button>
          <button
            type="button"
            onClick={() => setViewMode("2d")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "2d"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            2D Grid
          </button>
        </div>
      </div>

      {/* RECURRENCE FORMULA & LIVE ARITHMETIC CARD */}
      {((activeMode === "1d" && dp1d) || (activeMode === "2d" && dp2d)) && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card/80 to-purple-500/5 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0 max-w-full">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30 mt-0.5">
                <Calculator className="size-4" />
              </div>
              <div className="min-w-0 max-w-full">
                <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Optimal Substructure Recurrence Relation
                </div>
                <div className="mt-1 font-mono text-xs font-semibold text-foreground bg-background/80 px-2.5 py-1 rounded-lg border border-border/70 inline-block max-w-full whitespace-pre-wrap break-words shadow-inner">
                  {activeMode === "1d" ? dp1d?.transitionFormula : dp2d?.transitionFormula}
                </div>
                {((activeMode === "1d" && dp1d?.evaluatedFormula) || (activeMode === "2d" && dp2d?.evaluatedFormula)) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 border border-emerald-500/30 text-[10px] uppercase shrink-0">
                      Current Evaluation
                    </span>
                    <span className="break-words">{activeMode === "1d" ? dp1d?.evaluatedFormula : dp2d?.evaluatedFormula}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Decision Reason Badge */}
            {((activeMode === "1d" && dp1d?.decisionReason) || (activeMode === "2d" && dp2d?.decisionReason)) && (
              <div className="max-w-md rounded-xl border border-border/60 bg-card/60 p-2.5 text-[11px] text-muted-foreground shadow-xs break-words">
                <div className="flex items-center gap-1.5 font-bold text-foreground mb-1">
                  <Info className="size-3.5 text-primary shrink-0" />
                  <span>Subproblem Decision</span>
                </div>
                <p className="leading-relaxed break-words">
                  {activeMode === "1d" ? dp1d?.decisionReason : dp2d?.decisionReason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRIMARY VISUALIZATION BODY */}
      {activeMode === "1d" && dp1d ? (
        <Dp1DView
          state={dp1d}
          selectedCell={selectedCell}
          onSelectCell={(idx) => setSelectedCell({ index: idx })}
        />
      ) : dp2d ? (
        <Dp2DView
          state={dp2d}
          selectedCell={selectedCell}
          onSelectCell={(r, c) => setSelectedCell({ r, c })}
        />
      ) : null}

      {/* INSPECTED CELL FLYOUT (WHEN CLICKED) */}
      {activeInspectedFormula && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs text-foreground animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <AiWord className="size-4 text-primary shrink-0" />
            <span className="font-bold">{activeInspectedFormula.title}:</span>
            <span className="font-mono font-black text-primary text-sm break-all">{activeInspectedFormula.value}</span>
            <span className="text-muted-foreground ml-2 break-words">{activeInspectedFormula.detail}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedCell(null)}
            className="rounded-lg p-1 hover:bg-primary/20 text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* BOTTOM SUMMARY & OPTIMAL VALUE TELEMETRY */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground font-mono px-1">
        <div className="flex items-center gap-2">
          <AiWord className="size-3.5 text-primary" />
          <span>Optimal Substructure Memoization: Subproblems computed bottom-up in topological order.</span>
        </div>
        {((activeMode === "1d" && dp1d?.optimalAnswer !== null && dp1d?.optimalAnswer !== undefined) ||
          (activeMode === "2d" && dp2d?.optimalAnswer !== null && dp2d?.optimalAnswer !== undefined)) && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-1.5 font-bold text-emerald-300 border border-emerald-500/30 shadow-xs">
            <CheckCircle className="size-4 text-emerald-400" />
            <span>Optimal Value: {toText(activeMode === "1d" ? dp1d?.optimalAnswer : dp2d?.optimalAnswer)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1D DP ARRAY COMPONENT WITH DEPENDENCY JUMP ARCS
// ---------------------------------------------------------------------------
interface Dp1DViewProps {
  state: Dp1DState;
  selectedCell: { index?: number } | null;
  onSelectCell: (index: number) => void;
}

function Dp1DView({ state, selectedCell, onSelectCell }: Dp1DViewProps) {
  const { dpArray, inputArray, inputLabel, currentIndex, dependencies, optimalChoiceIndex } = state;
  const count = dpArray.length;

  // Dynamically compute uniform column width so large numbers/strings never overflow 1D DP cells
  const maxCharLen = useMemo(() => {
    let maxLen = 4;
    dpArray.forEach((v) => {
      if (v !== null && v !== undefined) maxLen = Math.max(maxLen, toText(v).length);
    });
    inputArray?.forEach((v) => {
      if (v !== null && v !== undefined) maxLen = Math.max(maxLen, toText(v).length);
    });
    return maxLen;
  }, [dpArray, inputArray]);

  // Calculate SVG quadratic Bézier jump arcs
  const arcHeight = 50;
  const cellWidth = Math.max(64, Math.min(180, maxCharLen * 9 + 28)); // dynamically expands with data length
  const cellPadding = 12;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-background/80 p-5 shadow-sm backdrop-blur-sm">
      {/* Dependency Arc Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-foreground">Active Step Dependencies:</span>
          {dependencies.length === 0 ? (
            <span className="text-muted-foreground">Base Case (No prior dependencies)</span>
          ) : (
            dependencies.map((dep, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                  dep.isOptimal
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                    : "border-purple-500/40 bg-purple-500/15 text-purple-300"
                }`}
              >
                <span>{dep.isOptimal ? "★" : "↳"}</span>
                <span>{dep.label ?? `dp[${dep.fromIndex}]`}</span>
                <span className="font-black text-foreground">({toText(dep.value ?? "—")})</span>
              </span>
            ))
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Click any cell to inspect subproblem formula
        </div>
      </div>

      {/* SVG Dependency Arcs Canvas */}
      <div className="relative overflow-x-auto pb-4 pt-2">
        <div className="min-w-fit flex flex-col items-center">
          {/* Top SVG Jump Arcs Layer */}
          <div className="relative w-full h-16 pointer-events-none">
            <svg className="w-full h-full overflow-visible">
              <defs>
                <marker
                  id="arrow-optimal"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker
                  id="arrow-competing"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
                </marker>
              </defs>

              {dependencies.map((dep, idx) => {
                const fromX = dep.fromIndex * (cellWidth + cellPadding) + cellWidth / 2 + 124;
                const toX = dep.toIndex * (cellWidth + cellPadding) + cellWidth / 2 + 124;
                const distance = Math.abs(toX - fromX);
                const midX = (fromX + toX) / 2;
                const curveY = Math.max(8, 55 - distance * 0.25);

                const strokeColor = dep.isOptimal ? "#10b981" : "#a855f7";
                const markerId = dep.isOptimal ? "url(#arrow-optimal)" : "url(#arrow-competing)";

                return (
                  <g key={idx}>
                    <path
                      d={`M ${fromX} 58 Q ${midX} ${curveY} ${toX} 58`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={dep.isOptimal ? "2.5" : "1.75"}
                      strokeDasharray={dep.isOptimal ? "none" : "4,3"}
                      markerEnd={markerId}
                      className="transition-all duration-300 animate-in fade-in"
                    />
                    {/* Delta Badge on arc crest */}
                    <text
                      x={midX}
                      y={curveY - 4}
                      fill={strokeColor}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {dep.delta !== undefined ? (dep.delta > 0 ? `+${dep.delta}` : `${dep.delta}`) : ""}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Dual Rows: Input Elements + DP State Array */}
          <div className="flex flex-col gap-2">
            {/* Input Array Row (e.g. nums[i], costs, coins) */}
            {inputArray && inputArray.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-right text-[11px] font-mono font-bold text-muted-foreground uppercase break-words">
                  {inputLabel}
                </div>
                <div className="flex items-center gap-3">
                  {inputArray.map((val, idx) => {
                    const isActive = idx === currentIndex;
                    const isOptimalChosen = idx === optimalChoiceIndex;
                    return (
                      <div
                        key={idx}
                        style={{ minWidth: `${cellWidth}px` }}
                        className={`flex min-h-11 w-auto px-2.5 py-1 flex-col items-center justify-center rounded-xl border text-center font-mono text-xs whitespace-nowrap transition-all ${
                          isActive
                            ? "border-primary bg-primary/20 text-primary font-black scale-105 shadow-xs"
                            : isOptimalChosen
                            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-bold"
                            : "border-border/50 bg-muted/20 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[9px] text-muted-foreground font-mono">[{idx}]</span>
                        <span className="font-bold text-foreground">{toText(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DP State Array Row: dp[i] */}
            <div className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-right text-[11px] font-mono font-black text-primary uppercase">
                DP State (dp[i])
              </div>
              <div className="flex items-center gap-3">
                {dpArray.map((val, idx) => {
                  const isActive = idx === currentIndex;
                  const isDep = dependencies.some((d) => d.fromIndex === idx);
                  const isOptimalDep = dependencies.some((d) => d.fromIndex === idx && d.isOptimal);
                  const isInspected = selectedCell?.index === idx;
                  const isComputed = idx < currentIndex;
                  const isBaseCase = idx === 0;

                  let cellStyle = "border-border/70 bg-card/60 text-foreground";
                  if (isActive) {
                    cellStyle =
                      "border-primary ring-2 ring-primary bg-primary text-primary-foreground font-black scale-110 shadow-lg shadow-primary/40 z-10 animate-sync-glow constant-glow-primary";
                  } else if (isOptimalDep) {
                    cellStyle =
                      "border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-black scale-105 shadow-md shadow-emerald-500/20";
                  } else if (isDep) {
                    cellStyle =
                      "border-purple-500/70 ring-1 ring-purple-500/40 bg-purple-500/20 text-purple-300 font-bold";
                  } else if (isInspected) {
                    cellStyle = "border-amber-400 ring-2 ring-amber-400 bg-amber-400/20 text-amber-200 font-bold";
                  } else if (isComputed) {
                    cellStyle = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold";
                  } else if (isBaseCase) {
                    cellStyle = "border-border/50 bg-muted/30 text-muted-foreground";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectCell(idx)}
                      style={{ minWidth: `${cellWidth}px` }}
                      className={`group relative flex min-h-14 w-auto px-3 py-1.5 cursor-pointer flex-col items-center justify-center rounded-2xl border text-center font-mono text-xs whitespace-nowrap transition-all duration-300 hover:scale-105 ${cellStyle}`}
                    >
                      <span className="text-[9px] opacity-75 font-mono">dp[{idx}]</span>
                      <span className="text-sm font-black mt-0.5">
                        {val !== null && val !== undefined ? toText(val) : "—"}
                      </span>

                      {/* Optimal Marker Star */}
                      {isActive && (
                        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground shadow-xs">
                          ★
                        </span>
                      )}
                      {isOptimalDep && !isActive && (
                        <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white shadow-xs">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2D DP ALIGNMENT GRID COMPONENT WITH SIGHTLINES
// ---------------------------------------------------------------------------
interface Dp2DViewProps {
  state: Dp2DState;
  selectedCell: { r?: number; c?: number } | null;
  onSelectCell: (r: number, c: number) => void;
}

function Dp2DView({ state, selectedCell, onSelectCell }: Dp2DViewProps) {
  const { matrix, rowLabels, colLabels, rowHeader, colHeader, activeCell, choices, backtrackPath } = state;
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 1;

  const activeR = activeCell?.[0] ?? null;
  const activeC = activeCell?.[1] ?? null;

  // Identify dependency cells
  const dependencyMap = useMemo(() => {
    const map = new Map<string, { direction: string; isChosen: boolean; label: string; formula?: string }>();
    if (choices) {
      choices.forEach((c) => {
        map.set(`${c.sourceCoord[0]},${c.sourceCoord[1]}`, {
          direction: c.direction,
          isChosen: c.isChosen,
          label: c.label,
          formula: c.formula,
        });
      });
    }
    return map;
  }, [choices]);

  const backtrackSet = useMemo(() => {
    const s = new Set<string>();
    if (backtrackPath) {
      backtrackPath.forEach(([r, c]) => s.add(`${r},${c}`));
    }
    return s;
  }, [backtrackPath]);

  return (
    <div className="flex flex-col gap-4">
      {/* Candidate Decisions Comparison Panel */}
      {choices && choices.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border/70 bg-card/60 p-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Compass className="size-4 text-primary" />
            <span>Transition Candidates:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {choices.map((choice, idx) => {
              const isDiag = choice.direction === "diagonal";
              const isTop = choice.direction === "top";
              const isLeft = choice.direction === "left";

              let badgeStyle = "border-border/60 bg-muted/20 text-muted-foreground";
              if (choice.isChosen) {
                badgeStyle = "border-emerald-500/70 bg-emerald-500/20 text-emerald-300 font-black shadow-xs ring-1 ring-emerald-500/50";
              } else if (isDiag) {
                badgeStyle = "border-purple-500/40 bg-purple-500/10 text-purple-300";
              } else if (isTop) {
                badgeStyle = "border-blue-500/40 bg-blue-500/10 text-blue-300";
              } else if (isLeft) {
                badgeStyle = "border-amber-500/40 bg-amber-500/10 text-amber-300";
              }

              return (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition-all ${badgeStyle}`}
                >
                  {isDiag ? (
                    <ArrowDownRight className="size-3.5" />
                  ) : isTop ? (
                    <ArrowDown className="size-3.5" />
                  ) : (
                    <ArrowRight className="size-3.5" />
                  )}
                  <span>{choice.label}</span>
                  <span className="font-black text-foreground">[{toText(choice.value)}]</span>
                  {choice.isChosen && (
                    <span className="rounded bg-emerald-500 px-1 py-0.2 text-[9px] font-black text-white uppercase">
                      Chosen
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DP 2D Grid Canvas */}
      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-background/80 p-5 shadow-sm backdrop-blur-sm">
        <table className="min-w-full border-collapse text-center">
          <thead>
            {/* Top Sequence Labels (e.g. String 2 characters) */}
            {colLabels && colLabels.length > 0 && (
              <tr>
                <th className="p-1.5 text-[10px] font-mono text-muted-foreground"></th>
                <th className="p-1.5 text-[10px] font-mono text-muted-foreground"></th>
                <th className="p-1.5 text-[10px] font-mono text-muted-foreground uppercase text-left">ε</th>
                {colLabels.map((char, cIdx) => (
                  <th
                    key={cIdx}
                    className={`p-2 font-mono text-xs font-bold transition-all duration-200 ${
                      activeC === cIdx + 1
                        ? "text-primary scale-110 font-black animate-pulse"
                        : "text-muted-foreground"
                    }`}
                  >
                    '{char}'
                  </th>
                ))}
              </tr>
            )}
            {/* Column Indices (j=0, j=1, j=2...) */}
            <tr className="border-b border-border/50">
              <th className="p-1.5 text-[10px] font-mono text-muted-foreground uppercase">Row</th>
              <th className="p-1.5 text-[10px] font-mono text-muted-foreground uppercase">Char</th>
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className={`p-1.5 font-mono text-[11px] font-semibold transition-colors duration-200 ${
                    activeC === c ? "text-primary font-bold" : "text-muted-foreground"
                  }`}
                >
                  j={c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, r) => {
              const rowChar = rowLabels?.[r - 1] ?? (r === 0 ? "ε" : `r${r}`);
              const isRowActive = activeR === r;

              return (
                <tr key={r} className="border-t border-border/40">
                  {/* Row index indicator */}
                  <td className="p-1.5 font-mono text-[11px] font-semibold text-muted-foreground">
                    i={r}
                  </td>
                  {/* Row character label */}
                  <td
                    className={`p-1.5 font-mono text-xs font-bold transition-colors duration-200 ${
                      isRowActive ? "text-primary scale-110 font-black" : "text-muted-foreground"
                    }`}
                  >
                    {r === 0 ? "ε" : `'${rowChar}'`}
                  </td>

                  {/* Matrix Cells */}
                  {Array.from({ length: cols }, (_, c) => {
                    const val = row[c];
                    const key = `${r},${c}`;
                    const isActive = activeR === r && activeC === c;
                    const depInfo = dependencyMap.get(key);
                    const isBacktrack = backtrackSet.has(key);
                    const isInspected = selectedCell?.r === r && selectedCell?.c === c;
                    const isBaseCase = r === 0 || c === 0;

                    let cellStyle = "border-border/60 bg-card/40 text-foreground";
                    if (isActive) {
                      cellStyle =
                        "border-primary ring-2 ring-primary bg-primary text-primary-foreground font-black scale-110 shadow-lg shadow-primary/40 z-10 animate-sync-glow constant-glow-primary";
                    } else if (depInfo?.isChosen) {
                      cellStyle =
                        "border-emerald-500 ring-2 ring-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-black scale-105 shadow-md shadow-emerald-500/20";
                    } else if (depInfo) {
                      cellStyle =
                        "border-purple-500/70 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50 font-bold";
                    } else if (isBacktrack) {
                      cellStyle = "border-amber-400 ring-2 ring-amber-400 bg-amber-400/15 text-amber-200 font-bold";
                    } else if (isInspected) {
                      cellStyle = "border-primary ring-1 ring-primary bg-primary/20 text-primary font-bold";
                    } else if (activeR !== null && activeC !== null && (r < activeR || (r === activeR && c < activeC))) {
                      cellStyle = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold";
                    } else if (isBaseCase) {
                      cellStyle = "border-border/40 bg-muted/20 text-muted-foreground";
                    }

                    return (
                      <td key={c} className="p-1">
                        <button
                          type="button"
                          onClick={() => onSelectCell(r, c)}
                          className={`group relative flex min-h-12 min-w-12 w-full px-2.5 py-1.5 cursor-pointer items-center justify-center rounded-2xl border text-center font-mono text-xs whitespace-nowrap transition-all duration-300 hover:scale-105 ${cellStyle}`}
                        >
                          <span className="text-sm font-black">
                            {val !== undefined && val !== null ? toText(val) : "0"}
                          </span>

                          {/* Sightline Indicator Badges */}
                          {depInfo && (
                            <span
                              className={`absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-[9px] font-black text-white shadow-xs ${
                                depInfo.isChosen ? "bg-emerald-500" : "bg-purple-500"
                              }`}
                            >
                              {depInfo.direction === "diagonal" ? "↖" : depInfo.direction === "top" ? "↑" : "←"}
                            </span>
                          )}

                          {isActive && (
                            <span className="absolute -bottom-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground shadow-xs">
                              ★
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

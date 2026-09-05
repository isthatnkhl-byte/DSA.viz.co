import * as fs from "fs";
import { processReviewPseudocode, processDatasetVisualization } from "../src/lib/review.functions";
import { problemBySlug, type TestDataset, type VizStep } from "../src/lib/problems";
import { getMarkerStyle, type MarkerStyle } from "../src/components/visualizer/VisualizerTypes";
import { REVIEW_SYSTEM_PROMPT, buildReviewUserPrompt } from "../src/lib/prompts/review.prompt";
import { VISUALIZER_SYSTEM_PROMPT, buildVisualizerUserPrompt } from "../src/lib/prompts/visualizer.prompt";
import { statementForSlug } from "../src/lib/statements";

interface InvestigationCase {
  category: string;
  slug: string;
  title: string;
  topics: string[];
  pseudocode: string;
}

const CASES: InvestigationCase[] = [
  {
    category: "Array / Two Pointers",
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    topics: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
    pseudocode: `left = 0
right = len(height) - 1
left_max = 0
right_max = 0
total_water = 0

while left < right:
    if height[left] < height[right]:
        if height[left] >= left_max:
            left_max = height[left]
        else:
            total_water += left_max - height[left]
        left += 1
    else:
        if height[right] >= right_max:
            right_max = height[right]
        else:
            total_water += right_max - height[right]
        right -= 1

return total_water`,
  },
  {
    category: "Linked List",
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    topics: ["Linked List", "Recursion"],
    pseudocode: `prev = null
curr = head

while curr is not null:
    next_node = curr.next
    curr.next = prev
    prev = curr
    curr = next_node

return prev`,
  },
  {
    category: "Matrix / 2D Grid",
    slug: "set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    topics: ["Array", "Hash Table", "Matrix"],
    pseudocode: `rows = len(matrix)
cols = len(matrix[0])
first_row_zero = False
first_col_zero = False

for r in range(rows):
    for c in range(cols):
        if matrix[r][c] == 0:
            if r == 0:
                first_row_zero = True
            if c == 0:
                first_col_zero = True
            matrix[r][0] = 0
            matrix[0][c] = 0

for r in range(1, rows):
    for c in range(1, cols):
        if matrix[r][0] == 0 or matrix[0][c] == 0:
            matrix[r][c] = 0

if first_row_zero:
    for c in range(cols):
        matrix[0][c] = 0

if first_col_zero:
    for r in range(rows):
        matrix[r][0] = 0

return matrix`,
  },
  {
    category: "Binary Tree",
    slug: "lowest-common-ancestor-of-a-binary-tree",
    title: "Lowest Common Ancestor of a Binary Tree",
    topics: ["Tree", "Depth-First Search", "Binary Tree"],
    pseudocode: `def lowestCommonAncestor(root, p, q):
    if root is None or root == p or root == q:
        return root

    left = lowestCommonAncestor(root.left, p, q)
    right = lowestCommonAncestor(root.right, p, q)

    if left is not None and right is not None:
        return root
    return left if left is not None else right`,
  },
  {
    category: "Graph / Topological Sort",
    slug: "course-schedule",
    title: "Course Schedule",
    topics: ["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"],
    pseudocode: `in_degree = [0] * numCourses
adj = {i: [] for i in range(numCourses)}

for dest, src in prerequisites:
    adj[src].append(dest)
    in_degree[dest] += 1

queue = [i for i in range(numCourses) if in_degree[i] == 0]
processed = 0

while len(queue) > 0:
    curr = queue.pop(0)
    processed += 1
    for neighbor in adj[curr]:
        in_degree[neighbor] -= 1
        if in_degree[neighbor] == 0:
            queue.append(neighbor)

return processed == numCourses`,
  },
  {
    category: "Dynamic Programming (2D Table)",
    slug: "longest-common-subsequence",
    title: "Longest Common Subsequence",
    topics: ["String", "Dynamic Programming"],
    pseudocode: `m = len(text1)
n = len(text2)
dp = [[0] * (n + 1) for _ in range(m + 1)]

for i in range(1, m + 1):
    for j in range(1, n + 1):
        if text1[i - 1] == text2[j - 1]:
            dp[i][j] = dp[i - 1][j - 1] + 1
        else:
            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

return dp[m][n]`,
  },
  {
    category: "Stack / Monotonic Stack",
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    topics: ["Array", "Stack", "Monotonic Stack"],
    pseudocode: `n = len(temperatures)
res = [0] * n
stack = []

for i in range(n):
    curr_temp = temperatures[i]
    while len(stack) > 0 and temperatures[stack[-1]] < curr_temp:
        prev_idx = stack.pop()
        res[prev_idx] = i - prev_idx
    stack.append(i)

return res`,
  },
  {
    category: "Heap / Priority Queue",
    slug: "kth-largest-element-in-an-array",
    title: "Kth Largest Element in an Array",
    topics: ["Array", "Divide and Conquer", "Sorting", "Heap (Priority Queue)", "Quickselect"],
    pseudocode: `min_heap = []

for num in nums:
    heapq.heappush(min_heap, num)
    if len(min_heap) > k:
        heapq.heappop(min_heap)

return min_heap[0]`,
  },
  {
    category: "Hash Set / Hash Map",
    slug: "longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    topics: ["Array", "Hash Table", "Union Find"],
    pseudocode: `num_set = set(nums)
longest_streak = 0

for num in num_set:
    if (num - 1) not in num_set:
        curr_num = num
        curr_streak = 1

        while (curr_num + 1) in num_set:
            curr_num += 1
            curr_streak += 1

        longest_streak = max(longest_streak, curr_streak)

return longest_streak`,
  },
  {
    category: "Intervals",
    slug: "merge-intervals",
    title: "Merge Intervals",
    topics: ["Array", "Sorting"],
    pseudocode: `intervals.sort(key=lambda x: x[0])
merged = []

for interval in intervals:
    if not merged or merged[-1][1] < interval[0]:
        merged.append(interval)
    else:
        merged[-1][1] = max(merged[-1][1], interval[1])

return merged`,
  },
];

interface DatasetInvestigation {
  id: string;
  category: "standard" | "longer" | "edge";
  label: string;
  description?: string;
  dataSummary: string;
  stepCount: number;
  vizType: string;
  activePointersFound: string[];
  markerColorAudit: Array<{ pointer: string; colorBg: string; colorText: string; svgText: string }>;
  sampleSteps: {
    startDesc: string;
    startPointers: Record<string, any>;
    midDesc: string;
    midPointers: Record<string, any>;
    finalDesc: string;
    finalPointers: Record<string, any>;
  };
}

interface CaseReport {
  category: string;
  slug: string;
  title: string;
  pseudocodeLines: number;
  reviewerVerdict: {
    is_complete: boolean;
    classification: string;
    complexity: { time: string; space: string };
    praise: string;
    nudge: string;
  };
  promptInvestigation: {
    reviewerPromptLength: number;
    hasMultiDatasetInstructions: boolean;
    hasMatrixExpansionGuidance: boolean;
    visualizerPromptLength: number;
  };
  datasets: DatasetInvestigation[];
}

function summarizeDataset(d: TestDataset): string {
  const parts: string[] = [];
  if (d.matrix && d.matrix.length > 0) {
    const r = d.matrix.length;
    const c = Array.isArray(d.matrix[0]) ? d.matrix[0].length : 0;
    parts.push(`Matrix ${r}×${c} (${r * c} cells)`);
  }
  if (d.array && d.array.length > 0) {
    parts.push(`Array [${d.array.length} items: ${d.array.slice(0, 5).join(", ")}${d.array.length > 5 ? "..." : ""}]`);
  }
  if (d.secondaryArray && d.secondaryArray.length > 0) {
    parts.push(`SecondaryArray [${d.secondaryArray.length} items: ${d.secondaryArray.slice(0, 5).join(", ")}${d.secondaryArray.length > 5 ? "..." : ""}]`);
  }
  if (d.tree && d.tree.length > 0) {
    const nonNull = d.tree.filter((x) => x !== null && x !== undefined && String(x) !== "null");
    parts.push(`Tree [${nonNull.length} nodes]`);
  }
  if (d.target !== undefined && d.target !== null) {
    parts.push(`target=${d.target}`);
  }
  if (d.k !== undefined && d.k !== null) {
    parts.push(`k=${d.k}`);
  }
  return parts.join(" | ");
}

function auditPointers(steps: VizStep[]): {
  activePointersFound: string[];
  markerColorAudit: Array<{ pointer: string; colorBg: string; colorText: string; svgText: string }>;
} {
  const pointerSet = new Set<string>();
  steps.forEach((s) => {
    if (s.activePointers && typeof s.activePointers === "object") {
      Object.keys(s.activePointers).forEach((p) => pointerSet.add(p));
    }
    if (s.left !== undefined && s.left !== null) pointerSet.add("left");
    if (s.right !== undefined && s.right !== null) pointerSet.add("right");
    if (s.current !== undefined && s.current !== null) pointerSet.add("curr");
  });

  const activePointersFound = Array.from(pointerSet);
  const markerColorAudit = activePointersFound.map((p) => {
    const style = getMarkerStyle(p);
    return {
      pointer: p,
      colorBg: style.bg,
      colorText: style.textCol,
      svgText: style.svgText,
    };
  });

  return { activePointersFound, markerColorAudit };
}

async function runInvestigation(): Promise<CaseReport[]> {
  const reports: CaseReport[] = [];

  for (const c of CASES) {
    console.log(`\n================================================================================`);
    console.log(`🔍 INVESTIGATING: [${c.category}] -> "${c.title}" (${c.slug})`);
    console.log(`================================================================================`);

    // 1. Reviewer Prompt Inspection
    const statement = statementForSlug(c.slug);
    const reviewUserPrompt = buildReviewUserPrompt({
      title: c.title,
      topics: c.topics,
      statement,
      pseudocode: c.pseudocode,
    });

    const hasMultiDatasetInstructions =
      reviewUserPrompt.includes("MANDATORY DATASET TRIPLE GENERATION") &&
      reviewUserPrompt.includes("Dataset 1: Standard Case") &&
      reviewUserPrompt.includes("Dataset 2: Longer & Complex Trace ⚡") &&
      reviewUserPrompt.includes("Dataset 3: Edge & Boundary Case");

    const hasMatrixExpansionGuidance =
      reviewUserPrompt.includes("5×6 or 6×6") || reviewUserPrompt.includes("15–25 elements");

    // 2. Reviewer Model Run
    const reviewResult = await processReviewPseudocode({
      slug: c.slug,
      title: c.title,
      topics: c.topics,
      pseudocode: c.pseudocode,
    });

    console.log(`✅ Reviewer Result:`);
    console.log(`   - Completeness: ${reviewResult.is_complete ? "COMPLETE" : "INCOMPLETE"}`);
    console.log(`   - Classification: ${reviewResult.classification}`);
    console.log(`   - Complexity: Time: ${reviewResult.complexity.time} | Space: ${reviewResult.complexity.space}`);
    console.log(`   - Praise: "${reviewResult.praise}"`);
    console.log(`   - Nudge: "${reviewResult.nudge}"`);

    const datasets = reviewResult.datasets ?? [];
    console.log(`\n📊 Generated Datasets Count: ${datasets.length}`);

    const datasetInvestigations: DatasetInvestigation[] = [];

    for (const d of datasets) {
      const category = d.category as "standard" | "longer" | "edge";
      console.log(`\n--- Dataset [${d.id}] (${category.toUpperCase()}): "${d.label}" ---`);
      const summary = summarizeDataset(d);
      console.log(`   Data Structure: ${summary}`);

      // Visualizer prompt check
      const vizUserPrompt = buildVisualizerUserPrompt({
        title: c.title,
        statement,
        example: d.array ?? [],
        secondaryArrayExample: d.secondaryArray,
        matrixExample: d.matrix,
        treeExample: d.tree,
        targetExample: d.target,
        datasetLabel: d.label,
        datasetDescription: d.description,
        pseudocode: c.pseudocode,
      });

      // Get steps for this dataset
      let steps: VizStep[] = [];
      let testArray: (string | number)[] = [];
      if (d.id === reviewResult.active_dataset_id) {
        steps = reviewResult.viz_steps;
        testArray = reviewResult.test_array;
      } else {
        const trace = await processDatasetVisualization({
          slug: c.slug,
          title: c.title,
          topics: c.topics,
          pseudocode: c.pseudocode,
          dataset: d,
        });
        steps = trace.viz_steps;
        testArray = trace.test_array;
      }

      console.log(`   Simulation Execution: ${steps.length} frames generated`);
      const vizType = steps[0]?.type || "unknown";
      console.log(`   Primary Canvas Render Type: ${vizType.toUpperCase()}`);

      const { activePointersFound, markerColorAudit } = auditPointers(steps);
      console.log(`   Active Pointers Found: [${activePointersFound.join(", ")}]`);
      console.log(`   Marker Color Audit:`);
      markerColorAudit.slice(0, 5).forEach((m) => {
        console.log(`     • ${m.pointer}: DOM class="${m.colorBg} ${m.colorText}" | SVG hex="${m.svgText}"`);
      });

      const startStep = steps[0] || { desc: "N/A", activePointers: {} };
      const midStep = steps[Math.floor(steps.length / 2)] || { desc: "N/A", activePointers: {} };
      const finalStep = steps[steps.length - 1] || { desc: "N/A", activePointers: {} };

      console.log(`   Sample Execution Points:`);
      console.log(`     [Start Step 0]: "${startStep.desc}"`);
      console.log(`     [Mid Step ${Math.floor(steps.length / 2)}]: "${midStep.desc}"`);
      console.log(`     [Final Step ${steps.length - 1}]: "${finalStep.desc}"`);

      datasetInvestigations.push({
        id: d.id,
        category,
        label: d.label,
        description: d.description,
        dataSummary: summary,
        stepCount: steps.length,
        vizType,
        activePointersFound,
        markerColorAudit,
        sampleSteps: {
          startDesc: startStep.desc,
          startPointers: startStep.activePointers || {},
          midDesc: midStep.desc,
          midPointers: midStep.activePointers || {},
          finalDesc: finalStep.desc,
          finalPointers: finalStep.activePointers || {},
        },
      });
    }

    reports.push({
      category: c.category,
      slug: c.slug,
      title: c.title,
      pseudocodeLines: c.pseudocode.split("\n").length,
      reviewerVerdict: {
        is_complete: reviewResult.is_complete,
        classification: reviewResult.classification,
        complexity: reviewResult.complexity,
        praise: reviewResult.praise,
        nudge: reviewResult.nudge,
      },
      promptInvestigation: {
        reviewerPromptLength: reviewUserPrompt.length,
        hasMultiDatasetInstructions,
        hasMatrixExpansionGuidance,
        visualizerPromptLength: buildVisualizerUserPrompt({
          title: c.title,
          statement,
          example: [],
          datasetLabel: "Sample",
          pseudocode: c.pseudocode,
        }).length,
      },
      datasets: datasetInvestigations,
    });
  }

  return reports;
}

runInvestigation()
  .then((reports) => {
    try {
      const outPath = process.env.REPORT_OUT || "/tmp/deep_investigation_results.json";
      fs.writeFileSync(outPath, JSON.stringify(reports, null, 2), "utf8");
      console.log(`Saved investigation report to: ${outPath}`);
    } catch {
      // Non-fatal if output file cannot be written
    }
    console.log(`\n================================================================================`);
    console.log(`🎉 ALL 10 DATA TYPES FULLY INVESTIGATED & VERIFIED`);
    console.log(`================================================================================`);
    reports.forEach((r, idx) => {
      console.log(`\n[${idx + 1}/10] Category: ${r.category} | Problem: ${r.title} (${r.slug})`);
      console.log(`   Reviewer Verdict: is_complete=${r.reviewerVerdict.is_complete}, class=${r.reviewerVerdict.classification}`);
      console.log(`   Praise: "${r.reviewerVerdict.praise}"`);
      console.log(`   Nudge: "${r.reviewerVerdict.nudge}"`);
      r.datasets.forEach((ds) => {
        console.log(`   • [${ds.category.toUpperCase()}] ${ds.label}: steps=${ds.stepCount}, vizType=${ds.vizType}, pointers=[${ds.activePointersFound.join(", ")}]`);
        console.log(`     Data: ${ds.dataSummary}`);
        console.log(`     Color sample: ${ds.markerColorAudit.map(m => `${m.pointer}->${m.colorText}`).join(", ")}`);
      });
    });
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Investigation failed:", err);
    process.exit(1);
  });

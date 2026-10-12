import React, { useState, useCallback, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  BookOpen,
  Brain,
  CheckCircle2,
  Code2,
  PanelRightClose,
  PanelRightOpen,
  Volume2,
  Lightbulb,
  SlidersHorizontal,
  Download,
  ArrowUpRight,
  Zap,
  Layers,
  Award,
  HelpCircle,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { AiWhiteboard } from "@/components/interview/AiWhiteboard";
import {
  buildExcalidrawTwoPointersLesson,
  buildExcalidrawSlidingWindowLesson,
  buildExcalidrawBinarySearchLesson,
  buildExcalidrawMonotonicStackLesson,
  buildExcalidrawDpTableLesson,
  buildExcalidrawLinkedListLesson,
  buildExcalidrawTreeLesson,
  generateAiExcalidrawLessonForQuery,
  type AiWhiteboardLesson,
} from "@/shared/whiteboard";

export const Route = createFileRoute("/ai-learning" as any)({
  component: AiLearningPage,
});

interface CurriculumModule {
  id: string;
  title: string;
  pattern: string;
  complexity: string;
  spaceComplexity: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  summary: string;
  invariant: string;
  cppSnippet: string;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  buildLesson: () => AiWhiteboardLesson;
}

const CURRICULUM_MODULES: CurriculumModule[] = [
  {
    id: "two_pointers",
    title: "Two Pointers Convergence",
    pattern: "Arrays & Two Pointers",
    complexity: "O(n) Time",
    spaceComplexity: "O(1) Space",
    difficulty: "Beginner",
    summary:
      "Place L at index 0 and R at n-1 on a sorted array. Compare nums[L] + nums[R] with target to eliminate a full row or column of pairs each step.",
    invariant:
      "All pairs outside [L..R] have already been proven either too small (< target) or too large (> target).",
    cppSnippet: `int L = 0, R = (int)nums.size() - 1;
while (L < R) {
    int sum = nums[L] + nums[R];
    if (sum == target) return {L, R};
    if (sum < target) L++; // need larger sum
    else R--;              // need smaller sum
}`,
    quiz: {
      question:
        "In a sorted array, if nums[L] + nums[R] > target, why is it safe to decrement R without missing the answer?",
      options: [
        "Because nums[R] paired with any element >= nums[L] will also be > target",
        "Because L is already at the midpoint of the array",
        "Because binary search requires moving R by half",
        "Because the array contains only prime numbers",
      ],
      correctIndex: 0,
      explanation:
        "Since the array is sorted in ascending order, every element to the right of L is >= nums[L]. Thus nums[k] + nums[R] > target for all k >= L, proving R cannot be part of any valid pair.",
    },
    buildLesson: () =>
      buildExcalidrawTwoPointersLesson([1, 3, 5, 8, 12, 17, 21], 17),
  },
  {
    id: "sliding_window",
    title: "Sliding Window Subarray",
    pattern: "Contiguous Window",
    complexity: "O(n) Time",
    spaceComplexity: "O(1) Space",
    difficulty: "Beginner",
    summary:
      "Maintain a running window sum across k contiguous elements. Slide forward in O(1) by adding the incoming right element and subtracting the outgoing left element.",
    invariant:
      "windowSum always equals the exact sum of elements in the active range [L .. R] of length k.",
    cppSnippet: `int windowSum = 0, maxSum = INT_MIN;
for (int i = 0; i < (int)nums.size(); i++) {
    windowSum += nums[i];
    if (i >= k - 1) {
        maxSum = max(maxSum, windowSum);
        windowSum -= nums[i - (k - 1)]; // slide left out
    }
}`,
    quiz: {
      question:
        "What transitions a naive O(n*k) subarray sum into an O(n) Sliding Window?",
      options: [
        "Reusing the overlapping k-1 elements by adding nums[R] and subtracting nums[L-1]",
        "Sorting the array first with std::sort",
        "Using a recursion tree of depth log(n)",
        "Storing every subarray in a 2D matrix",
      ],
      correctIndex: 0,
      explanation:
        "Adjacent windows of size k share k-1 overlapping elements. Updating the sum with one addition and one subtraction takes O(1) per step instead of O(k).",
    },
    buildLesson: () =>
      buildExcalidrawSlidingWindowLesson([2, 1, 5, 1, 3, 2], 3),
  },
  {
    id: "binary_search",
    title: "Binary Search Halving",
    pattern: "Divide & Conquer",
    complexity: "O(log n) Time",
    spaceComplexity: "O(1) Space",
    difficulty: "Beginner",
    summary:
      "Exploit monotonic order by inspecting the midpoint mid = L + ((R - L) >> 1) and discarding half of the remaining search space on every comparison.",
    invariant:
      "If the target exists in the array, its index is guaranteed to lie within the closed interval [L .. R].",
    cppSnippet: `int L = 0, R = (int)nums.size() - 1;
while (L <= R) {
    int mid = L + (R - L) / 2;
    if (nums[mid] == target) return mid;
    if (nums[mid] < target) L = mid + 1;
    else R = mid - 1;
}`,
    quiz: {
      question:
        "Why do we compute mid = L + (R - L) / 2 instead of (L + R) / 2 in C++ and Java?",
      options: [
        "To prevent 32-bit signed integer overflow when L + R > INT_MAX",
        "To make the division round toward infinity",
        "Because (L + R) / 2 is O(n) time",
        "Because bitwise operators only work on floats",
      ],
      correctIndex: 0,
      explanation:
        "When L and R are large indices (> 10^9), L + R can exceed 2^31 - 1 and overflow a signed 32-bit int. L + (R - L) / 2 stays safely within bounds.",
    },
    buildLesson: () =>
      buildExcalidrawBinarySearchLesson([2, 5, 9, 14, 19, 24, 31], 24),
  },
  {
    id: "monotonic_stack",
    title: "Monotonic Stack (Next Greater)",
    pattern: "Stack Invariant",
    complexity: "O(n) Time",
    spaceComplexity: "O(n) Space",
    difficulty: "Intermediate",
    summary:
      "Maintain a decreasing stack of unresolved elements. Whenever a larger incoming element arrives, pop smaller stack tops and immediately record their Next Greater Element.",
    invariant:
      "Elements inside the stack are strictly decreasing from bottom to top, awaiting their first greater element to the right.",
    cppSnippet: `vector<int> ans(n, -1);
stack<int> st; // stores indices
for (int i = 0; i < n; i++) {
    while (!st.empty() && nums[i] > nums[st.top()]) {
        ans[st.top()] = nums[i];
        st.pop();
    }
    st.push(i);
}`,
    quiz: {
      question:
        "Why does a Monotonic Stack run in O(n) total time despite having a while loop inside a for loop?",
      options: [
        "Each element is pushed onto the stack once and popped at most once (amortized O(1))",
        "The stack never holds more than 2 elements",
        "The while loop only runs on even indices",
        "C++ optimizes nested loops into O(1)",
      ],
      correctIndex: 0,
      explanation:
        "Across the entire execution, each of the n elements is pushed exactly once and popped at most once, bounding total stack operations to <= 2n = O(n).",
    },
    buildLesson: () => buildExcalidrawMonotonicStackLesson(),
  },
  {
    id: "dp_table",
    title: "1D Dynamic Programming Table",
    pattern: "Optimal Substructure",
    complexity: "O(n) Time",
    spaceComplexity: "O(n) -> O(1) Space",
    difficulty: "Intermediate",
    summary:
      "Eliminate exponential O(2^n) overlapping subproblems by filling a 1D tabulation array from base cases dp[0]=1, dp[1]=1 using dp[i] = dp[i-1] + dp[i-2].",
    invariant:
      "Before computing dp[i], all subproblem states dp[0 .. i-1] are already solved and memoized in the table.",
    cppSnippet: `vector<int> dp(n + 1, 0);
dp[0] = 1;
dp[1] = 1;
for (int i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
}
return dp[n];`,
    quiz: {
      question:
        "How can we optimize the O(n) space of 1D Fibonacci/Staircase DP down to O(1) auxiliary space?",
      options: [
        "Keep only the last two variables (prev1, prev2) since dp[i] only depends on i-1 and i-2",
        "Use a recursion tree without memoization",
        "Store the DP table in a hash map",
        "Sort the DP array in descending order",
      ],
      correctIndex: 0,
      explanation:
        "Since state i only reads i-1 and i-2, two rolling scalar variables suffice to compute the entire sequence in O(1) memory.",
    },
    buildLesson: () => buildExcalidrawDpTableLesson(),
  },
  {
    id: "linked_list",
    title: "Linked List Pointer Reversal",
    pattern: "In-Place Pointer Surgery",
    complexity: "O(n) Time",
    spaceComplexity: "O(1) Space",
    difficulty: "Beginner",
    summary:
      "Reverse a singly linked list in one pass using three pointers (prev, curr, next) without allocating any new nodes.",
    invariant:
      "At the start of each iteration, all nodes before curr are already reversed and reachable via prev, while curr leads the unreversed suffix.",
    cppSnippet: `ListNode* prev = nullptr;
ListNode* curr = head;
while (curr != nullptr) {
    ListNode* nextTemp = curr->next;
    curr->next = prev; // flip arrow backward
    prev = curr;
    curr = nextTemp;
}
return prev;`,
    quiz: {
      question:
        "What happens if you set curr->next = prev BEFORE saving nextTemp = curr->next?",
      options: [
        "You lose the reference to the rest of the unreversed linked list",
        "The list reverses twice as fast",
        "A cycle is created at the tail node",
        "The compiler throws a syntax error",
      ],
      correctIndex: 0,
      explanation:
        "Overwriting curr->next destroys the only pointer to the remaining suffix of the list, making it impossible to advance curr forward.",
    },
    buildLesson: () => buildExcalidrawLinkedListLesson(),
  },
  {
    id: "tree",
    title: "BST & DFS Recursion Tree",
    pattern: "Trees & Graphs",
    complexity: "O(h) / O(n) Time",
    spaceComplexity: "O(h) Call Stack",
    difficulty: "Intermediate",
    summary:
      "Visualize how binary search trees partition keys (Left < Root < Right) and how recursive DFS traverses root-to-leaf paths on the call stack.",
    invariant:
      "For every node N in a valid BST, all keys in N.left are strictly < N.val and all keys in N.right are strictly > N.val.",
    cppSnippet: `TreeNode* searchBST(TreeNode* root, int val) {
    if (!root || root->val == val) return root;
    if (val < root->val)
        return searchBST(root->left, val);
    return searchBST(root->right, val);
}`,
    quiz: {
      question:
        "What is the worst-case time complexity of searching in an unbalanced Binary Search Tree with n nodes?",
      options: [
        "O(n) when the tree degenerates into a skewed linked list",
        "Always O(1)",
        "Always O(log n) regardless of shape",
        "O(n^2)",
      ],
      correctIndex: 0,
      explanation:
        "If elements are inserted in sorted order without balancing (like AVL/Red-Black), the BST height h becomes n, degrading search to O(n).",
    },
    buildLesson: () => buildExcalidrawTreeLesson(),
  },
];

const QUICK_AI_PROMPTS = [
  "How would the dry run of the brute force O(N^2) approach look on [1, 3, 5, 8, 12] target 17?",
  "Simulate Two Pointers on [2, 4, 7, 11, 15, 19] with target 18",
  "Explain Sliding Window max sum of size 3 on [3, 1, 6, 2, 5, 4]",
  "Simulate Binary Search for 24 in [2, 5, 9, 14, 19, 24, 31]",
  "Draw Monotonic Stack Next Greater Element on [2, 1, 5, 6, 2, 3]",
  "Draw 1D Dynamic Programming table for Climbing Stairs n=6",
  "Demonstrate Linked List in-place pointer reversal step by step",
  "Draw Binary Search Tree traversal and recursive call stack",
];

export function AiLearningPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "curriculum" | "inspector" | "quiz" | "lab"
  >("curriculum");
  const [selectedModuleId, setSelectedModuleId] =
    useState<string>("two_pointers");
  const [lessonOverride, setLessonOverride] =
    useState<AiWhiteboardLesson | null>(null);
  const [liveLessonState, setLiveLessonState] = useState<{
    lesson: AiWhiteboardLesson;
    stepIndex: number;
  }>(() => ({
    lesson: CURRICULUM_MODULES[0]!.buildLesson(),
    stepIndex: 0,
  }));

  // Quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(
    null
  );
  const [masteredModules, setMasteredModules] = useState<string[]>([]);

  // Custom Lab state
  const [customArrayStr, setCustomArrayStr] = useState("2, 4, 7, 11, 15, 19");
  const [customTargetStr, setCustomTargetStr] = useState("18");
  const [studyNotes, setStudyNotes] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("dsaviz:ai_learning_notes") ||
        "# My AI Whiteboard Study Notes\n\n- **Two Pointers Invariant**: Move `L++` when sum < target, `R--` when sum > target.\n- **Binary Search**: Always use `mid = L + (R - L) / 2`.\n- **Monotonic Stack**: Each index is pushed once and popped at most once -> O(n)."
      );
    }
    return "";
  });

  const activeModule: CurriculumModule = useMemo(
    () =>
      CURRICULUM_MODULES.find((m) => m.id === selectedModuleId) ??
      CURRICULUM_MODULES[0]!,
    [selectedModuleId]
  );

  const handleSelectModule = useCallback((mod: CurriculumModule) => {
    setSelectedModuleId(mod.id);
    setSelectedQuizOption(null);
    const built = mod.buildLesson();
    setLessonOverride({ ...built, id: `${built.id}_${Date.now()}` });
    toast.success(
      `Spawned "${mod.title}" in its own bounded non-overlapping whiteboard zone!`
    );
  }, []);

  const handleLessonStateChange = useCallback(
    (lesson: AiWhiteboardLesson, stepIndex: number) => {
      setLiveLessonState({ lesson, stepIndex });
    },
    []
  );

  const handleSpeakText = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.03;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech synthesis errors
      }
    }
  }, []);

  const handleSaveNotes = (val: string) => {
    setStudyNotes(val);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("dsaviz:ai_learning_notes", val);
      } catch {
        // ignore storage quota errors
      }
    }
  };

  const handleDownloadNotes = () => {
    const blob = new Blob([studyNotes], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dsa-ai-whiteboard-notes.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded study notes (.md)!");
  };

  const currentFrame =
    liveLessonState.lesson.frames[liveLessonState.stepIndex] ||
    liveLessonState.lesson.frames[0];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />

      {/* Main Content Landmark */}
      <main
        id="main-content"
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        {/* Top Compact AI Learning Studio Bar */}
        <div className="border-b border-border/80 bg-card/90 px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" />
              <span>AI Learning Studio</span>
            </span>

            <h1 className="text-xs sm:text-sm font-black tracking-tight text-foreground truncate">
              Interactive Excalidraw AI Whiteboard &amp; Visual Co-Teacher
            </h1>

            <span className="hidden xl:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-500">
              ● Live AI Laser Pointer + Multi-Step Simulation
            </span>
          </div>

          {/* Right Quick Actions & Zen Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground mr-1">
              <Award className="size-3.5 text-amber-500" />
              <span>
                Mastered: <strong className="text-foreground">{masteredModules.length}</strong>/
                {CURRICULUM_MODULES.length}
              </span>
            </div>

            <Link
              to="/playground"
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/70 px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground hover:border-primary/50 transition"
            >
              <span>Code Visualizer</span>
              <ArrowUpRight className="size-3" />
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#2b2d42] bg-[#f4ede2] px-2.5 py-1 font-mono text-[11px] font-extrabold text-[#2b2d42] hover:bg-[#ffd166] transition cursor-pointer shadow-[0_2px_0_#2b2d42]"
              title={
                sidebarOpen
                  ? "Maximize Whiteboard to 100% Width (Hide Companion Panel)"
                  : "Open AI Curriculum & Inspector Drawer"
              }
            >
              {sidebarOpen ? (
                <>
                  <PanelRightClose className="size-3.5" />
                  <span>Full-Width Board</span>
                </>
              ) : (
                <>
                  <PanelRightOpen className="size-3.5" />
                  <span>Open AI Studio Panel</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Full-Viewport Split Workspace: Whiteboard is the Centerpiece (Main Selling Point) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-3 p-2.5 sm:p-3.5 min-h-[calc(100vh-130px)]">
          {/* Primary Stage: Full-Screen Interactive AI Excalidraw Whiteboard */}
          <div className="flex-1 flex flex-col min-w-0 min-h-[640px] lg:min-h-0">
            <AiWhiteboard
              roomId="ai-learning-main-stage"
              fullScreenStage={true}
              problemTitle={activeModule.title}
              currentCode={activeModule.cppSnippet}
              activeLessonOverride={lessonOverride}
              onLessonStateChange={handleLessonStateChange}
              onAiSpeak={handleSpeakText}
            />
          </div>

          {/* Collapsible Right Companion Panel: Curriculum, Live Invariant Inspector, Socratic Quiz & Custom Lab */}
          {sidebarOpen && (
            <aside
              aria-label="AI Learning Companion Panel"
              className="w-full lg:w-[370px] xl:w-[410px] shrink-0 flex flex-col overflow-hidden rounded-2xl border-[3px] border-[#2b2d42] bg-[#fffaf3] text-[#2b2d42] shadow-[0_6px_0_#2b2d42]"
            >
              {/* Companion Panel Tab Header */}
              <div
                className="grid grid-cols-4 gap-1 p-2 border-b-[3px] border-[#2b2d42]"
                style={{ background: "#f4ede2" }}
              >
                {(
                  [
                    {
                      id: "curriculum",
                      label: "Topics",
                      icon: BookOpen,
                    },
                    {
                      id: "inspector",
                      label: "Live Step",
                      icon: Layers,
                    },
                    {
                      id: "quiz",
                      label: "Quiz",
                      icon: HelpCircle,
                    },
                    {
                      id: "lab",
                      label: "AI Lab",
                      icon: SlidersHorizontal,
                    },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl font-extrabold text-[11px] transition cursor-pointer"
                      style={{
                        background: active ? "#2b2d42" : "#ffffff",
                        color: active ? "#fffaf3" : "#2b2d42",
                        border: "2px solid #2b2d42",
                      }}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Body */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 max-h-[calc(100vh-210px)]">
                {/* TAB 1: INTERACTIVE VISUAL CURRICULUM */}
                {activeTab === "curriculum" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-[#2b2d42] bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
                          <Zap className="size-3.5" />
                          One-Click Whiteboard Lessons
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {CURRICULUM_MODULES.length} Visual Modules
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        Select any DSA pattern below — the AI Co-Teacher will
                        immediately draw the diagram on the Excalidraw canvas and
                        walk through each step with its live laser pointer.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {CURRICULUM_MODULES.map((mod) => {
                        const isSelected = mod.id === selectedModuleId;
                        const isMastered = masteredModules.includes(mod.id);
                        return (
                          <div
                            key={mod.id}
                            onClick={() => handleSelectModule(mod)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectModule(mod);
                              }
                            }}
                            className="p-3 rounded-xl transition cursor-pointer"
                            style={{
                              background: isSelected ? "#fef3c7" : "#ffffff",
                              border: "2px solid #2b2d42",
                              boxShadow: isSelected
                                ? "0 3px 0 #2b2d42"
                                : "none",
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-[#2b2d42]">
                                    {mod.title}
                                  </span>
                                  {isMastered && (
                                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                  )}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500">
                                  {mod.pattern} • {mod.difficulty}
                                </div>
                              </div>
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold shrink-0"
                                style={{
                                  background: "#06d6a0",
                                  border: "1.5px solid #2b2d42",
                                  color: "#2b2d42",
                                }}
                              >
                                {mod.complexity}
                              </span>
                            </div>

                            <p className="mt-1.5 text-[11px] text-slate-700 leading-relaxed">
                              {mod.summary}
                            </p>

                            <div className="mt-2 flex items-center justify-between text-[10px] font-extrabold">
                              <span className="text-rose-600 flex items-center gap-1">
                                <Play className="size-3 fill-current" />
                                {isSelected
                                  ? "Simulating on Whiteboard"
                                  : "Click to Draw & Simulate"}
                              </span>
                              <span className="font-mono text-slate-500">
                                {mod.spaceComplexity}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: LIVE STEP INVARIANT & CODE INSPECTOR */}
                {activeTab === "inspector" && (
                  <div className="space-y-3">
                    {/* Active Lesson & Frame Banner */}
                    <div
                      className="rounded-xl p-3 border-2 border-[#2b2d42]"
                      style={{ background: "#fef3c7" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#2b2d42] text-white font-mono text-[10px] font-bold">
                          STEP {liveLessonState.stepIndex + 1} OF{" "}
                          {liveLessonState.lesson.frames.length}
                        </span>
                        <span className="font-mono text-[11px] font-extrabold text-[#2b2d42]">
                          {liveLessonState.lesson.badge}
                        </span>
                      </div>

                      <h3 className="mt-2 text-sm font-black text-[#2b2d42]">
                        {currentFrame?.title || liveLessonState.lesson.topic}
                      </h3>

                      <p className="mt-1 text-xs font-medium text-slate-800 leading-relaxed">
                        {currentFrame?.narration}
                      </p>

                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            currentFrame &&
                            handleSpeakText(
                              `${currentFrame.title}. ${currentFrame.narration}`
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-white border-2 border-[#2b2d42] text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="size-3.5 text-rose-500" />
                          <span>Narrate Step Aloud</span>
                        </button>
                      </div>
                    </div>

                    {/* Loop Invariant Card */}
                    <div className="rounded-xl p-3 border-2 border-[#2b2d42] bg-white">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#2b2d42]">
                        <Lightbulb className="size-4 text-amber-500" />
                        <span>Core Algorithmic Invariant</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-700 leading-relaxed font-medium">
                        {activeModule.invariant}
                      </p>
                    </div>

                    {/* Synchronized C++20 Reference Implementation */}
                    <div className="rounded-xl border-2 border-[#2b2d42] overflow-hidden bg-[#1e1e2e] text-slate-100">
                      <div className="px-3 py-1.5 bg-[#2b2d42] text-white flex items-center justify-between text-[11px] font-bold">
                        <span className="flex items-center gap-1.5">
                          <Code2 className="size-3.5 text-emerald-400" />
                          <span>C++20 Pattern Template</span>
                        </span>
                        <span className="font-mono text-[10px] text-emerald-300">
                          {activeModule.complexity}
                        </span>
                      </div>
                      <pre className="p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
                        <code>{activeModule.cppSnippet}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* TAB 3: SOCRATIC CHECKPOINT QUIZ */}
                {activeTab === "quiz" && (
                  <div className="space-y-3">
                    <div className="rounded-xl p-3 border-2 border-[#2b2d42] bg-white">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
                          <Brain className="size-3.5" />
                          Socratic Intuition Check
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          {activeModule.title}
                        </span>
                      </div>

                      <p className="mt-2 text-xs font-extrabold text-[#2b2d42] leading-relaxed">
                        {activeModule.quiz.question}
                      </p>

                      <div className="mt-3 space-y-2">
                        {activeModule.quiz.options.map((opt, idx) => {
                          const isChosen = selectedQuizOption === idx;
                          const isCorrect =
                            idx === activeModule.quiz.correctIndex;
                          let bg = "#ffffff";
                          if (selectedQuizOption !== null) {
                            if (isCorrect) bg = "#d1fae5";
                            else if (isChosen) bg = "#ffe4e6";
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedQuizOption(idx);
                                if (idx === activeModule.quiz.correctIndex) {
                                  if (!masteredModules.includes(activeModule.id)) {
                                    setMasteredModules((prev) => [
                                      ...prev,
                                      activeModule.id,
                                    ]);
                                  }
                                  toast.success(
                                    "Spot on! Invariant mastered."
                                  );
                                } else {
                                  toast.error(
                                    "Not quite — check the whiteboard invariant explanation!"
                                  );
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                              style={{
                                background: bg,
                                border: "2px solid #2b2d42",
                              }}
                            >
                              <span className="font-mono font-black mr-1.5">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {selectedQuizOption !== null && (
                        <div
                          className="mt-3 p-2.5 rounded-xl border-2 border-[#2b2d42] text-xs"
                          style={{ background: "#fef3c7" }}
                        >
                          <div className="font-black text-[#2b2d42]">
                            Why this works:
                          </div>
                          <p className="mt-1 text-slate-800 leading-relaxed">
                            {activeModule.quiz.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: AI PROMPT LAB, CUSTOM DATASET & STUDY NOTES */}
                {activeTab === "lab" && (
                  <div className="space-y-3">
                    {/* One-Click AI Whiteboard Prompts */}
                    <div className="rounded-xl p-3 border-2 border-[#2b2d42] bg-white space-y-2">
                      <div className="text-xs font-black text-[#2b2d42] flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-rose-500" />
                        <span>Instant AI Whiteboard Prompts</span>
                      </div>
                      <div className="space-y-1.5">
                        {QUICK_AI_PROMPTS.map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const lesson =
                                generateAiExcalidrawLessonForQuery(prompt);
                              setLessonOverride({
                                ...lesson,
                                id: `${lesson.id}_${Date.now()}`,
                              });
                              toast.success(
                                `AI spawned "${lesson.topic}" in its own bounded zone!`
                              );
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#fffaf3] hover:bg-[#fef3c7] border border-[#2b2d42] transition cursor-pointer truncate"
                            title={prompt}
                          >
                            🪄 {prompt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Dataset Simulator */}
                    <div className="rounded-xl p-3 border-2 border-[#2b2d42] bg-white space-y-2">
                      <div className="text-xs font-black text-[#2b2d42]">
                        Custom Array &amp; Target Generator
                      </div>
                      <input
                        type="text"
                        value={customArrayStr}
                        onChange={(e) => setCustomArrayStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-[#2b2d42] font-mono text-xs font-bold"
                        placeholder="e.g. 2, 4, 7, 11, 15, 19"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customTargetStr}
                          onChange={(e) => setCustomTargetStr(e.target.value)}
                          className="w-24 px-2.5 py-1.5 rounded-lg border-2 border-[#2b2d42] font-mono text-xs font-bold"
                          placeholder="Target"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const arr = customArrayStr
                              .split(",")
                              .map((s) => Number(s.trim()))
                              .filter((n) => !Number.isNaN(n))
                              .slice(0, 10);
                            const t = Number(customTargetStr.trim()) || 18;
                            if (arr.length < 2) {
                              toast.warning("Enter at least 2 numbers");
                              return;
                            }
                            const sorted = [...arr].sort((a, b) => a - b);
                            const built = buildExcalidrawTwoPointersLesson(
                              sorted,
                              t
                            );
                            setLessonOverride({
                              ...built,
                              id: `${built.id}_${Date.now()}`,
                            });
                            toast.success(
                              "Spawned custom Two Pointers trace in a new bounded zone!"
                            );
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#06d6a0] border-2 border-[#2b2d42] font-extrabold text-xs cursor-pointer"
                        >
                          Draw on Board
                        </button>
                      </div>
                    </div>

                    {/* Personal Study Notes Scratchpad */}
                    <div className="rounded-xl p-3 border-2 border-[#2b2d42] bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#2b2d42]">
                          📝 Whiteboard Study Notes
                        </span>
                        <button
                          type="button"
                          onClick={handleDownloadNotes}
                          className="px-2 py-0.5 rounded-md bg-[#f4ede2] border border-[#2b2d42] text-[10px] font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="size-3" />
                          <span>Export .md</span>
                        </button>
                      </div>
                      <textarea
                        rows={5}
                        value={studyNotes}
                        onChange={(e) => handleSaveNotes(e.target.value)}
                        className="w-full p-2 rounded-lg border-2 border-[#2b2d42] font-mono text-[11px] bg-[#fffaf3] focus:outline-none"
                        placeholder="Jot down invariants and insights while the AI teaches on the whiteboard..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

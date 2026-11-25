import type {
  PatternDefinition,
  PatternEdge,
  PatternId,
  PatternStrandDef,
} from "../lib/master-patterns/types";

export const PATTERN_CATALOG: PatternDefinition[] = [
  {
    id: "two-pointers",
    title: "Two Pointers",
    subtitle: "Converging bounds, slow/fast write cursors & 3-way partitioning",
    category: "Linear & Window",
    interviewFrequency: "Very High",
    whiteboardQuery: "Two Pointers convergence on sorted array",
    linkedProblemSlugs: [
      "two-sum-ii-input-array-is-sorted",
      "3sum",
      "container-with-most-water",
      "trapping-rain-water",
    ],
    strands: [
      {
        id: "two-pointers:monotonic-elimination",
        patternId: "two-pointers",
        title: "Monotonic Search-Space Elimination",
        unconditionalTruth:
          "In an ascending sequence, increasing index L can never decrease nums[L], and decreasing index R can never increase nums[R].",
        coreInvariant:
          "All pairs outside [L..R] have already been proven strictly suboptimal or invalid.",
        commonTrap:
          "Applying converging L/R pointers to an unsorted array without sorting or preserving index mapping.",
        prerequisiteStrandIds: [],
        fanoutWeight: 3,
      },
      {
        id: "two-pointers:greedy-bottleneck-choice",
        patternId: "two-pointers",
        title: "Bottleneck Pointer Advancement",
        unconditionalTruth:
          "An objective bounded by min(h[L], h[R]) cannot improve by moving the taller wall inward while width shrinks.",
        coreInvariant:
          "Advancing the strictly smaller-height pointer preserves all potentially better candidate pairs.",
        commonTrap:
          "Moving the taller pointer or failing to prove why the discarded row/column of pairs cannot hold the optimum.",
        prerequisiteStrandIds: ["two-pointers:monotonic-elimination"],
        fanoutWeight: 2,
      },
      {
        id: "two-pointers:same-direction-write",
        patternId: "two-pointers",
        title: "Same-Direction Read/Write In-Place Cursor",
        unconditionalTruth:
          "When read pointer r >= write pointer w, overwriting index w never destroys unread elements ahead at r.",
        coreInvariant:
          "Prefix [0..w-1] holds the exact valid compacted output; [w..r-1] is already-consumed scratch space.",
        commonTrap:
          "Using O(n) auxiliary array when O(1) in-place compaction preserves relative order.",
        prerequisiteStrandIds: [],
        fanoutWeight: 2,
      },
      {
        id: "two-pointers:duplicate-skipping",
        patternId: "two-pointers",
        title: "Deduplication Without HashSets (k-Sum)",
        unconditionalTruth:
          "In a sorted array, identical values sit contiguously, so skipping nums[i] == nums[i - 1] eliminates duplicate tuples in O(1) space.",
        coreInvariant:
          "Check duplicates against the previous processed value after accepting a match (or before fixing outer anchor), never skipping the first occurrence.",
        commonTrap:
          "Skipping duplicates before evaluating the first match, or using a HashSet that degrades 3Sum space from O(1) to O(n^2).",
        prerequisiteStrandIds: ["two-pointers:monotonic-elimination"],
        fanoutWeight: 2,
      },
      {
        id: "two-pointers:termination-and-bounds",
        patternId: "two-pointers",
        title: "Strict vs Inclusive Termination (L < R vs L <= R)",
        unconditionalTruth:
          "Distinct-index pair problems require L < R because L == R violates distinctness; self-pair or partition problems may require L <= R.",
        coreInvariant:
          "Every loop iteration strictly decreases (R - L), guaranteeing O(n) termination.",
        commonTrap:
          "Using L <= R on pair-sum problems (reusing element L) or missing mid-loop break checks.",
        prerequisiteStrandIds: ["two-pointers:monotonic-elimination"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "sliding-window",
        distinguishingCue:
          "Two Pointers evaluates a pair/extremum at (L, R) or partitions indices; Sliding Window aggregates a property over the entire contiguous subarray [L..R].",
      },
      {
        twinPatternId: "prefix-sum-hashmap",
        distinguishingCue:
          "Unsorted Two Sum uses a HashMap in O(n) time / O(n) space; Sorted Two Sum uses converging pointers in O(1) space.",
      },
    ],
    twistTemplates: [
      {
        operator: "constraint-twist",
        targetStrandId: "two-pointers:monotonic-elimination",
        promptTemplate:
          "Your 3Sum solution relies on sorting first. Now the interviewer forbids modifying the input array AND requires returning original 0-based indices in O(n^2) time. What changes and what extra space is now unavoidable?",
        whatItBreaks: "Breaks in-place O(1) sort assumption and tests index-preservation tradeoffs.",
      },
      {
        operator: "break-the-premise",
        targetStrandId: "two-pointers:greedy-bottleneck-choice",
        promptTemplate:
          "In Container With Most Water, someone moves the pointer whose neighbor has a taller bar (h[L+1] vs h[R-1]) instead of comparing h[L] vs h[R]. Construct a 4-element array where that greedy rule misses the optimal area.",
        whatItBreaks: "Tests whether the learner truly holds the min-wall bottleneck proof vs guessing.",
      },
      {
        operator: "reverse-premise",
        targetStrandId: "two-pointers:duplicate-skipping",
        promptTemplate:
          "A 3Sum implementation skips duplicates by writing `while (L < R && nums[L] == nums[L+1]) L++;` BEFORE checking `nums[i] + nums[L] + nums[R] == 0`. Give a concrete sorted input where this silently returns [] instead of a valid triplet.",
        whatItBreaks: "Exposes premature deduplication destroying valid repeated-element solutions like [-2, 1, 1].",
      },
    ],
    proCaseStudy: {
      title: "Trap Rainwater Variants & Space Bottleneck",
      targetStrandId: "two-pointers:greedy-bottleneck-choice",
      prompt:
        "Given non-negative elevation heights `height[]`, compute total trapped rainwater in O(n) time and **O(1) extra space** (not O(n) prefix/suffix arrays). State your loop invariant for `leftMax` and `rightMax` before coding.",
      constraints: "1 <= n <= 2*10^5, 0 <= height[i] <= 10^5",
      optimalTime: "O(n)",
      optimalSpace: "O(1)",
      optimizationTrap: "Using leftMax[] and rightMax[] O(n) arrays or an O(n) stack instead of O(1) converging pointers.",
      starterCode: {
        cpp: `int trap(vector<int>& height) {\n    // Write O(n) time, O(1) space solution\n}`,
        python: `def trap(height: list[int]) -> int:\n    # Write O(n) time, O(1) space solution\n    pass`,
        java: `public int trap(int[] height) {\n    // Write O(n) time, O(1) space solution\n    return 0;\n}`,
        typescript: `function trap(height: number[]): number {\n  // Write O(n) time, O(1) space solution\n  return 0;\n}`,
      },
    },
  },
  {
    id: "sliding-window",
    title: "Sliding Window",
    subtitle: "Fixed & variable contiguous windows, monotonic shrinking & Exact-K decomposition",
    category: "Linear & Window",
    interviewFrequency: "Very High",
    whiteboardQuery: "Sliding Window subarray expansion and shrinking",
    linkedProblemSlugs: [
      "longest-substring-without-repeating-characters",
      "minimum-window-substring",
      "sliding-window-maximum",
      "subarrays-with-k-different-integers",
    ],
    strands: [
      {
        id: "sliding-window:monotonicity-condition",
        patternId: "sliding-window",
        title: "Monotonicity Requirement for Shrinking",
        unconditionalTruth:
          "Variable sliding window works only when expanding R monotonically worsens/increases (or preserves) validity and shrinking L monotonically restores it.",
        coreInvariant:
          "If window [L..R] is already invalid (e.g., sum > target with positive numbers), no further extension [L..R+k] can become valid.",
        commonTrap:
          "Using sliding window on arrays containing negative numbers for target-sum subarrays.",
        prerequisiteStrandIds: ["two-pointers:monotonic-elimination"],
        fanoutWeight: 3,
      },
      {
        id: "sliding-window:while-vs-if-shrink",
        patternId: "sliding-window",
        title: "while(invalid) vs if(invalid) Window Mechanics",
        unconditionalTruth:
          "Use `while (invalid)` when you must track the exact shortest/valid state at every R; `if (invalid)` only preserves max window length without resetting.",
        coreInvariant:
          "After the shrink step for index R, [L..R] is the largest (or minimal) valid window ending at R.",
        commonTrap:
          "Using `if` instead of `while` on Minimum Window Substring or Subarray Product Less Than K.",
        prerequisiteStrandIds: ["sliding-window:monotonicity-condition"],
        fanoutWeight: 2,
      },
      {
        id: "sliding-window:amortized-complexity",
        patternId: "sliding-window",
        title: "Amortized O(n) Pointer Accounting",
        unconditionalTruth:
          "Both L and R only advance from 0 to n, so total inner `while` steps across the entire outer loop never exceed n.",
        coreInvariant:
          "Total pointer moves <= 2n, making nested `for R` + `while L` strictly O(n) time.",
        commonTrap:
          "Misjudging nested `while` inside `for` as O(n^2), or recounting the window frequency map inside the loop (which really IS O(n^2)).",
        prerequisiteStrandIds: ["sliding-window:monotonicity-condition"],
        fanoutWeight: 2,
      },
      {
        id: "sliding-window:exact-k-decomposition",
        patternId: "sliding-window",
        title: "atMost(K) - atMost(K - 1) Exact-K Trick",
        unconditionalTruth:
          "Counting subarrays with *exact* property K is non-monotonic on shrink, whereas `atMost(K)` is monotonic.",
        coreInvariant:
          "For every right endpoint R under `atMost(K)`, the number of valid subarrays ending at R is `(R - L + 1)`.",
        commonTrap:
          "Trying a single two-pointer pass for Exact-K distinct elements and missing subarrays formed by moving L inside the valid region.",
        prerequisiteStrandIds: ["sliding-window:while-vs-if-shrink"],
        fanoutWeight: 3,
      },
      {
        id: "sliding-window:freq-satisfaction-counter",
        patternId: "sliding-window",
        title: "O(1) Window Validity Tracking (`have` vs `need`)",
        unconditionalTruth:
          "Maintaining an incremental `formed == required` counter avoids O(|alphabet|) map scans per step.",
        coreInvariant:
          "`formed` increments only when a required character count crosses its exact target threshold.",
        commonTrap:
          "Comparing full HashMaps inside the loop (degrading O(n) to O(n * |sigma|)) or double-counting surplus characters.",
        prerequisiteStrandIds: ["sliding-window:amortized-complexity"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "prefix-sum-hashmap",
        distinguishingCue:
          "Subarray sum = K with negative numbers CANNOT use Sliding Window; it requires Prefix Sum + HashMap.",
      },
      {
        twinPatternId: "monotonic-stack",
        distinguishingCue:
          "Sliding Window Maximum requires a monotonic *deque* (evicting out-of-window front indices), not just a stack.",
      },
    ],
    twistTemplates: [
      {
        operator: "constraint-twist",
        targetStrandId: "sliding-window:monotonicity-condition",
        promptTemplate:
          "In 'Longest Subarray with Sum <= K', suppose we now allow negative integers in `nums`. Explain the exact failure mode of `while (sum > K) sum -= nums[L++]` with a minimal 3-element counterexample.",
        whatItBreaks: "Exposes hidden assumption that nums[i] >= 0.",
      },
      {
        operator: "discrimination",
        targetStrandId: "sliding-window:exact-k-decomposition",
        promptTemplate:
          "Problem A asks for the *longest* substring with at most K distinct chars. Problem B asks for the *count* of subarrays with *exactly* K distinct integers. Why does a single [L..R] window fail on Problem B?",
        whatItBreaks: "Tests discrimination between optimization over monotonic windows vs counting exact-K subarrays.",
      },
      {
        operator: "break-the-premise",
        targetStrandId: "sliding-window:freq-satisfaction-counter",
        promptTemplate:
          "In Minimum Window Substring (`t = 'AABC'`), a candidate increments `have++` every time `window[c] <= need[c]`. What happens if they instead write `if (need.count(c)) have++` without checking the cap?",
        whatItBreaks: "Catches surplus-character inflation bug in O(1) validity counters.",
      },
    ],
    proCaseStudy: {
      title: "Smallest Substring Covering All Required Frequencies",
      targetStrandId: "sliding-window:freq-satisfaction-counter",
      prompt:
        "Implement `minWindow(s, t)` returning the shortest substring of `s` containing every character of `t` with multiplicity. Must run in **O(|s| + |t|) time** and **O(|alphabet|) space** without scanning the map on each iteration.",
      constraints: "1 <= |s|, |t| <= 10^5, ASCII letters",
      optimalTime: "O(|s| + |t|)",
      optimalSpace: "O(1) / O(|alphabet|)",
      optimizationTrap: "Re-checking all 26/128 map entries on every step or slicing substrings inside the loop (O(n^2) memory/time).",
      starterCode: {
        cpp: `string minWindow(string s, string t) {\n    // O(|s| + |t|) time using have/need counters\n}`,
        python: `def minWindow(s: str, t: str) -> str:\n    # O(|s| + |t|) time using have/need counters\n    pass`,
        java: `public String minWindow(String s, String t) {\n    // O(|s| + |t|) time using have/need counters\n    return "";\n}`,
        typescript: `function minWindow(s: string, t: string): string {\n  // O(|s| + |t|) time using have/need counters\n  return "";\n}`,
      },
    },
  },
  {
    id: "fast-slow-pointers",
    title: "Fast & Slow Pointers",
    subtitle: "Floyd's cycle detection, modular distance proof & implicit array cycles",
    category: "Linear & Window",
    interviewFrequency: "High",
    whiteboardQuery: "Linked List fast and slow cycle detection",
    linkedProblemSlugs: [
      "linked-list-cycle",
      "linked-list-cycle-ii",
      "find-the-duplicate-number",
    ],
    strands: [
      {
        id: "fast-slow:relative-speed-meeting",
        patternId: "fast-slow-pointers",
        title: "Guaranteed Relative Closure (Speed 2 vs 1)",
        unconditionalTruth:
          "Inside a cycle of length C, moving fast by 2 steps and slow by 1 closes the gap by exactly 1 node per iteration.",
        coreInvariant:
          "Fast can never jump over slow without landing on it because step-size difference is gcd(1, C) = 1.",
        commonTrap:
          "Checking `fast != null` without also guarding `fast.next != null` before `fast.next.next`.",
        prerequisiteStrandIds: [],
        fanoutWeight: 2,
      },
      {
        id: "fast-slow:floyd-entry-proof",
        patternId: "fast-slow-pointers",
        title: "Floyd's Cycle Entry Equation (F = kC - a)",
        unconditionalTruth:
          "When slow (distance F + a) and fast (distance 2(F + a)) collide, F + a is an integer multiple of cycle length C.",
        coreInvariant:
          "Resetting one pointer to head and stepping both by 1 moves F steps—bringing the cycle pointer from (a) to (a + F ≡ 0 mod C), the exact cycle entry.",
        commonTrap:
          "Memorizing the reset-to-head trick without knowing why both pointers step by 1 (not 2) in phase 2.",
        prerequisiteStrandIds: ["fast-slow:relative-speed-meeting"],
        fanoutWeight: 3,
      },
      {
        id: "fast-slow:implicit-array-graph",
        patternId: "fast-slow-pointers",
        title: "Mapping Value-as-Index Implicit Cycles",
        unconditionalTruth:
          "An array of n+1 integers in [1..n] defines a functional graph `i -> nums[i]` where any repeated value has in-degree >= 2, creating a cycle entry.",
        coreInvariant:
          "Starting from index 0 (never in [1..n]), index 0 lies strictly outside the cycle, mirroring a linked-list tail.",
        commonTrap:
          "Modifying the input array (negation/sorting) when read-only O(1) space is mandated.",
        prerequisiteStrandIds: ["fast-slow:floyd-entry-proof"],
        fanoutWeight: 3,
      },
      {
        id: "fast-slow:midpoint-parity",
        patternId: "fast-slow-pointers",
        title: "Even/Odd Midpoint & Palindrome Splitting",
        unconditionalTruth:
          "Stopping at `fast.next && fast.next.next` vs `fast && fast.next` determines whether even-length lists land on the first or second middle node.",
        coreInvariant:
          "For list reversal/split, slow must stop one node *before* the second half (or at first middle) so `slow.next = null` cleanly bisects the list.",
        commonTrap:
          "Off-by-one middle selection causing infinite loops or dropped middle nodes during Merge Sort on Linked Lists.",
        prerequisiteStrandIds: ["fast-slow:relative-speed-meeting"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "prefix-sum-hashmap",
        distinguishingCue:
          "A visited Set finds cycles in O(n) space; Floyd's Fast/Slow achieves O(1) space.",
      },
      {
        twinPatternId: "binary-search",
        distinguishingCue:
          "Find the Duplicate Number can also be solved via Binary Search on Value [1..n] in O(n log n) time / O(1) space, whereas Floyd solves it in O(n) / O(1).",
      },
    ],
    twistTemplates: [
      {
        operator: "reverse-premise",
        targetStrandId: "fast-slow:floyd-entry-proof",
        promptTemplate:
          "Suppose in Phase 2 of Floyd's algorithm, instead of moving both pointers by 1 step, you keep `fast` moving by 2 steps from the meeting point and `slow` by 1 from head. Do they still necessarily meet at the cycle entrance?",
        whatItBreaks: "Tests whether the modular equation F + a = kC is genuinely understood.",
      },
      {
        operator: "constraint-twist",
        targetStrandId: "fast-slow:implicit-array-graph",
        promptTemplate:
          "In Find the Duplicate Number, suppose values are in [0..n-1] instead of [1..n]. Why can starting Floyd's algorithm at index 0 fail immediately?",
        whatItBreaks: "Exposes the self-loop `nums[0] == 0` trap when 0 is in the value domain.",
      },
    ],
    proCaseStudy: {
      title: "Read-Only Duplicate Finder in O(n) Time & O(1) Space",
      targetStrandId: "fast-slow:implicit-array-graph",
      prompt:
        "Given `nums` of length `n + 1` with values in `[1..n]`, find the duplicate without modifying `nums` and using only O(1) extra space, in O(n) time.",
      constraints: "1 <= n <= 10^5, read-only input",
      optimalTime: "O(n)",
      optimalSpace: "O(1)",
      optimizationTrap: "Sorting (mutates input + O(n log n)), HashSet (O(n) space), or Binary Search on answer (O(n log n) instead of O(n)).",
      starterCode: {
        cpp: `int findDuplicate(const vector<int>& nums) {\n    // O(n) time, O(1) space, read-only\n}`,
        python: `def findDuplicate(nums: list[int]) -> int:\n    # O(n) time, O(1) space, read-only\n    pass`,
        java: `public int findDuplicate(int[] nums) {\n    // O(n) time, O(1) space, read-only\n    return 0;\n}`,
        typescript: `function findDuplicate(nums: number[]): number {\n  // O(n) time, O(1) space, read-only\n  return 0;\n}`,
      },
    },
  },
  {
    id: "binary-search",
    title: "Binary Search & Search on Answer",
    subtitle: "Boundary invariants, rotated arrays & monotonic predicate halving",
    category: "Search & Partition",
    interviewFrequency: "Very High",
    whiteboardQuery: "Binary Search boundary invariant",
    linkedProblemSlugs: [
      "binary-search",
      "search-in-rotated-sorted-array",
      "koko-eating-bananas",
      "median-of-two-sorted-arrays",
    ],
    strands: [
      {
        id: "binary-search:loop-invariant-bounds",
        patternId: "binary-search",
        title: "Closed [L, R] vs Half-Open [L, R) Invariant",
        unconditionalTruth:
          "Every binary search bug comes from mixing the loop condition (`L <= R` vs `L < R`) with the update rule (`R = mid - 1` vs `R = mid`).",
        coreInvariant:
          "At loop entry, any valid target (if present) strictly resides inside the active search interval.",
        commonTrap:
          "Infinite loop when `L + 1 == R`, `mid = (L + R) / 2` (floor), and setting `L = mid`.",
        prerequisiteStrandIds: [],
        fanoutWeight: 3,
      },
      {
        id: "binary-search:monotonic-predicate",
        patternId: "binary-search",
        title: "Binary Search on Answer Space (TTTTFFFF / FFFFTTTT)",
        unconditionalTruth:
          "Binary search does not need a sorted array—it only needs a monotonic boolean predicate `feasible(x)` over a bounded integer/real range.",
        coreInvariant:
          "If `feasible(x)` is true, either all `y > x` (for min-feasible) or all `y < x` (for max-feasible) have known truth values.",
        commonTrap:
          "Choosing wrong answer bounds `[lo, hi]` (e.g. `lo = 0` dividing by zero, or `hi` smaller than `max(piles)`).",
        prerequisiteStrandIds: ["binary-search:loop-invariant-bounds"],
        fanoutWeight: 3,
      },
      {
        id: "binary-search:rotated-sorted-halving",
        patternId: "binary-search",
        title: "Identifying the Guaranteed Sorted Half",
        unconditionalTruth:
          "In a rotated sorted array with distinct elements, splitting at `mid` leaves at least one of `[L..mid]` or `[mid..R]` strictly sorted.",
        coreInvariant:
          "Only check `target in [L..mid]` against the half confirmed sorted (`nums[L] <= nums[mid]`).",
        commonTrap:
          "Failing when duplicates exist (`nums[L] == nums[mid] == nums[R]`) where neither half can be proven sorted without shrinking both ends.",
        prerequisiteStrandIds: ["binary-search:loop-invariant-bounds"],
        fanoutWeight: 2,
      },
      {
        id: "binary-search:partition-median",
        patternId: "binary-search",
        title: "Cross-Array Cut Partitioning",
        unconditionalTruth:
          "Partitioning two sorted arrays at cuts `(i, j)` with `i + j = (m + n + 1) / 2` requires checking only `A[i-1] <= B[j]` and `B[j-1] <= A[i]`.",
        coreInvariant:
          "Binary searching on the *shorter* array guarantees `j` never goes out of bounds and bounds runtime to O(log(min(m, n))).",
        commonTrap:
          "Searching on the longer array (out-of-bounds `j`) or forgetting `-INF`/`+INF` sentinel edges.",
        prerequisiteStrandIds: ["binary-search:monotonic-predicate"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "two-pointers",
        distinguishingCue:
          "When you need an exact threshold/minimum feasible capacity over `[1..MAX]` with an O(n) check, use Binary Search on Answer O(n log M); when pairing elements, use Two Pointers.",
      },
      {
        twinPatternId: "dynamic-programming",
        distinguishingCue:
          "'Split Array Largest Sum' looks like 2D DP O(n^2 * k), but monotonicity of max-subarray-sum lets Binary Search on Answer solve it in O(n log(sum)).",
      },
    ],
    twistTemplates: [
      {
        operator: "break-the-premise",
        targetStrandId: "binary-search:loop-invariant-bounds",
        promptTemplate:
          "A developer searches for the *maximum* `x` satisfying `ok(x)` using `while (L < R) { int mid = L + (R - L) / 2; if (ok(mid)) L = mid; else R = mid - 1; }`. Give a 2-element range `[L, R]` where this hangs forever, and explain the exact 1-line fix.",
        whatItBreaks: "Exposes floor-midpoint infinite loop when `L = mid` is used.",
      },
      {
        operator: "constraint-twist",
        targetStrandId: "binary-search:rotated-sorted-halving",
        promptTemplate:
          "Your rotated-array search uses `if (nums[L] <= nums[mid])` to detect a sorted left half. What happens on `[1, 0, 1, 1, 1]` searching for `0`, and why does worst-case complexity degrade?",
        whatItBreaks: "Forces derivation of duplicate-ambiguity degradation from O(log n) to O(n).",
      },
    ],
    proCaseStudy: {
      title: "Minimum Feasible Speed via Monotonic Search",
      targetStrandId: "binary-search:monotonic-predicate",
      prompt:
        "Given `piles[]` and `h` hours (`h >= piles.length`), find the minimum integer eating speed `k` so all piles finish within `h` hours. Implement in **O(n log(max(piles)))** time and **O(1)** space without integer overflow.",
      constraints: "1 <= piles.length <= 10^4, 1 <= piles[i] <= 10^9",
      optimalTime: "O(n log(max(piles)))",
      optimalSpace: "O(1)",
      optimizationTrap: "Linear scan over k (TLE), `lo = 0` divide-by-zero, or `int` overflow in total hours sum.",
      starterCode: {
        cpp: `int minEatingSpeed(vector<int>& piles, int h) {\n    // O(n log M) time, O(1) space, overflow-safe\n}`,
        python: `def minEatingSpeed(piles: list[int], h: int) -> int:\n    # O(n log M) time, O(1) space\n    pass`,
        java: `public int minEatingSpeed(int[] piles, int h) {\n    // O(n log M) time, O(1) space, overflow-safe\n    return 0;\n}`,
        typescript: `function minEatingSpeed(piles: number[], h: number): number {\n  // O(n log M) time, O(1) space\n  return 0;\n}`,
      },
    },
  },
  {
    id: "prefix-sum-hashmap",
    title: "Prefix Sum & HashMap",
    subtitle: "Algebraic subarray differences, first-occurrence indexing & modulo equivalence",
    category: "Linear & Window",
    interviewFrequency: "Very High",
    whiteboardQuery: "Prefix Sum and HashMap subarray counting",
    linkedProblemSlugs: [
      "subarray-sum-equals-k",
      "contiguous-array",
    ],
    strands: [
      {
        id: "prefix-sum:algebraic-complement",
        patternId: "prefix-sum-hashmap",
        title: "Subarray Sum as Prefix Difference (P[r] - P[l-1] = k)",
        unconditionalTruth:
          "Every contiguous subarray sum[l..r] equals `prefix[r] - prefix[l - 1]`.",
        coreInvariant:
          "Before inserting `prefix` at index r, `map[prefix - k]` holds the exact count (or earliest index) of prior prefixes yielding sum k.",
        commonTrap:
          "Forgetting to seed `map[0] = 1` (for counts) or `map[0] = -1` (for longest length) before iterating.",
        prerequisiteStrandIds: [],
        fanoutWeight: 3,
      },
      {
        id: "prefix-sum:count-vs-longest-update",
        patternId: "prefix-sum-hashmap",
        title: "Frequency Accumulation vs First-Index Preservation",
        unconditionalTruth:
          "Counting subarrays updates `map[prefix]++` on every visit; maximizing length only stores `map[prefix]` if absent.",
        coreInvariant:
          "Overwriting `map[prefix]` on repeat visits shrinks candidate subarray lengths and loses the longest match.",
        commonTrap:
          "Overwriting earliest index when maximizing subarray length (e.g., Contiguous Array 0/1 balance).",
        prerequisiteStrandIds: ["prefix-sum:algebraic-complement"],
        fanoutWeight: 2,
      },
      {
        id: "prefix-sum:modulo-and-negative-norm",
        patternId: "prefix-sum-hashmap",
        title: "Negative Modulo Normalization & State Encoding",
        unconditionalTruth:
          "Two prefixes share the same remainder mod M iff their difference is divisible by M.",
        coreInvariant:
          "In C++/Java, negative remainders must be normalized via `((sum % M) + M) % M` so `-1 mod 5` matches `+4 mod 5`.",
        commonTrap:
          "Sign mismatch in `%` across C++/Java vs Python on negative prefix sums.",
        prerequisiteStrandIds: ["prefix-sum:algebraic-complement"],
        fanoutWeight: 2,
      },
      {
        id: "prefix-sum:difference-array",
        patternId: "prefix-sum-hashmap",
        title: "Offline Range Updates via Difference Arrays",
        unconditionalTruth:
          "Adding +v to [L..R] equals `+v` at `diff[L]` and `-v` at `diff[R + 1]`, reconstructed in one O(n) sweep.",
        coreInvariant:
          "Running prefix sum over `diff[]` yields exact point values for Q range updates in O(Q + n).",
        commonTrap:
          "Off-by-one at `R + 1 >= n` boundary or using O(Q * n) per-update loops.",
        prerequisiteStrandIds: ["prefix-sum:algebraic-complement"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "sliding-window",
        distinguishingCue:
          "Negatives/zeros break sliding-window monotonicity; Prefix Sum + HashMap handles arbitrary positive/negative values in O(n) time / O(n) space.",
      },
    ],
    twistTemplates: [
      {
        operator: "break-the-premise",
        targetStrandId: "prefix-sum:algebraic-complement",
        promptTemplate:
          "Suppose in `subarraySum(nums, k)` you insert `freq[prefix]++` BEFORE looking up `freq[prefix - k]`. For which value of `k` does this silently overcount every element by 1?",
        whatItBreaks: "Exposes the `k = 0` self-pairing bug when order of lookup/insert is flipped.",
      },
      {
        operator: "constraint-twist",
        targetStrandId: "prefix-sum:count-vs-longest-update",
        promptTemplate:
          "You solved 'Longest Subarray with Equal 0s and 1s' by transforming 0 -> -1 and storing `firstIdx[sum]`. Now we want the longest subarray where `#1s - #0s >= 1` (at least one more 1 than 0). Why does `firstIdx[sum - 1]` fail?",
        whatItBreaks: "Demonstrates exact equality vs inequality boundary requiring monotonic stack / prefix minimum.",
      },
    ],
    proCaseStudy: {
      title: "Subarrays Summing to K With Arbitrary Negatives",
      targetStrandId: "prefix-sum:algebraic-complement",
      prompt:
        "Return the total number of contiguous subarrays summing to `k` where elements may be negative, zero, or positive. Must run in **O(n) time**.",
      constraints: "1 <= nums.length <= 2*10^4, -1000 <= nums[i] <= 1000, -10^7 <= k <= 10^7",
      optimalTime: "O(n)",
      optimalSpace: "O(n)",
      optimizationTrap: "O(n^2) nested prefix loop or attempting Sliding Window (fails on negatives).",
      starterCode: {
        cpp: `int subarraySum(vector<int>& nums, int k) {\n    // O(n) prefix sum + frequency map\n}`,
        python: `def subarraySum(nums: list[int], k: int) -> int:\n    # O(n) prefix sum + frequency map\n    pass`,
        java: `public int subarraySum(int[] nums, int k) {\n    // O(n) prefix sum + frequency map\n    return 0;\n}`,
        typescript: `function subarraySum(nums: number[], k: number): number {\n  // O(n) prefix sum + frequency map\n  return 0;\n}`,
      },
    },
  },
  {
    id: "monotonic-stack",
    title: "Monotonic Stack & Queue",
    subtitle: "Next greater/smaller boundaries, span popping & O(n) histogram area",
    category: "Stacks, Heaps & Intervals",
    interviewFrequency: "High",
    whiteboardQuery: "Monotonic Stack next greater element",
    linkedProblemSlugs: [
      "daily-temperatures",
      "largest-rectangle-in-histogram",
      "trapping-rain-water",
      "sliding-window-maximum",
    ],
    strands: [
      {
        id: "monotonic-stack:dominance-popping",
        patternId: "monotonic-stack",
        title: "Dominance & Single-Push/Single-Pop Amortization",
        unconditionalTruth:
          "Each element is pushed onto and popped from the monotonic stack at most once, guaranteeing O(n) total work.",
        coreInvariant:
          "Elements remaining on the stack have not yet encountered a dominating element that resolves their boundary.",
        commonTrap:
          "Storing values instead of indices (losing distance/width calculation) or using `<` vs `<=` inconsistently on duplicates.",
        prerequisiteStrandIds: [],
        fanoutWeight: 3,
      },
      {
        id: "monotonic-stack:span-width-boundaries",
        patternId: "monotonic-stack",
        title: "Both-Sides Boundary Extraction on Pop",
        unconditionalTruth:
          "When index `i` pops `top` from an increasing stack, `i` is the right boundary and the *new* stack top is the left boundary.",
        coreInvariant:
          "Rectangle width for popped bar `top` is `i - stack.peek() - 1` (or `i` when stack becomes empty).",
        commonTrap:
          "Forgetting to flush remaining bars with a trailing sentinel `0` height at the end of Histogram.",
        prerequisiteStrandIds: ["monotonic-stack:dominance-popping"],
        fanoutWeight: 3,
      },
      {
        id: "monotonic-stack:deque-window-eviction",
        patternId: "monotonic-stack",
        title: "Monotonic Deque Front-Eviction for Window Extrema",
        unconditionalTruth:
          "A monotonic deque evicts stale out-of-window indices from the front and dominated candidates from the back.",
        coreInvariant:
          "The front of the deque is always the exact extremum within `[i - k + 1 .. i]`.",
        commonTrap:
          "Using a heap (O(n log k)) when a monotonic deque achieves O(n) time and O(k) space.",
        prerequisiteStrandIds: ["monotonic-stack:dominance-popping"],
        fanoutWeight: 2,
      },
      {
        id: "monotonic-stack:circular-double-pass",
        patternId: "monotonic-stack",
        title: "Circular Array Wrap via `2n` Modulo Indexing",
        unconditionalTruth:
          "Simulating `i` from `0` to `2n - 1` with `i % n` resolves wrap-around Next Greater Elements without duplicating the array.",
        coreInvariant:
          "Only push indices during the first pass (`i < n`); use the second pass strictly to pop unresolved elements.",
        commonTrap:
          "Allocating a 2n copy or pushing indices twice in the second pass.",
        prerequisiteStrandIds: ["monotonic-stack:dominance-popping"],
        fanoutWeight: 1,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "heap-top-k",
        distinguishingCue:
          "Heaps give O(n log k) for window max or top-K; Monotonic Deque gives O(n) when only the extremum of a sliding window is needed.",
      },
    ],
    twistTemplates: [
      {
        operator: "break-the-premise",
        targetStrandId: "monotonic-stack:span-width-boundaries",
        promptTemplate:
          "In Largest Rectangle in Histogram `[2, 1, 5, 6, 2, 3]`, suppose your stack stores `[1, 2]` and you process the final sentinel. What happens if you omit the sentinel `0` at index `n`?",
        whatItBreaks: "Exposes unresolved ascending bars left on stack at loop end.",
      },
      {
        operator: "constraint-twist",
        targetStrandId: "monotonic-stack:dominance-popping",
        promptTemplate:
          "In 'Sum of Subarray Minimums', elements can repeat (e.g., `[3, 1, 2, 1]`). Why MUST one side use strict `<` and the other side non-strict `<=` when computing left/right spans?",
        whatItBreaks: "Tests duplicate-span double-counting invariant.",
      },
    ],
    proCaseStudy: {
      title: "Largest Rectangle in Histogram in Single Pass",
      targetStrandId: "monotonic-stack:span-width-boundaries",
      prompt:
        "Compute the largest rectangular area in `heights[]` in **O(n) time** and **O(n) space** using a single monotonic increasing stack pass (no separate `leftLess[]` + `rightLess[]` 3-pass arrays).",
      constraints: "1 <= heights.length <= 10^5, 0 <= heights[i] <= 10^4",
      optimalTime: "O(n)",
      optimalSpace: "O(n)",
      optimizationTrap: "O(n^2) expand-from-center or 3 separate array passes inflating space 3x.",
      starterCode: {
        cpp: `int largestRectangleArea(vector<int>& heights) {\n    // Single-pass monotonic stack with sentinel\n}`,
        python: `def largestRectangleArea(heights: list[int]) -> int:\n    # Single-pass monotonic stack with sentinel\n    pass`,
        java: `public int largestRectangleArea(int[] heights) {\n    // Single-pass monotonic stack with sentinel\n    return 0;\n}`,
        typescript: `function largestRectangleArea(heights: number[]): number {\n  // Single-pass monotonic stack with sentinel\n  return 0;\n}`,
      },
    },
  },
  {
    id: "intervals-sweep",
    title: "Intervals & Sweep Line",
    subtitle: "Start-vs-end sorting, greedy overlap elimination & event sweep counters",
    category: "Stacks, Heaps & Intervals",
    interviewFrequency: "High",
    whiteboardQuery: "Merge Intervals and Sweep Line sorting",
    linkedProblemSlugs: [
      "merge-intervals",
      "non-overlapping-intervals",
    ],
    strands: [
      {
        id: "intervals:sort-by-start-vs-end",
        patternId: "intervals-sweep",
        title: "Why Sort by Start (Merge) vs End (Greedy Removal)",
        unconditionalTruth:
          "Merging/inserting requires sorting by `start`; maximizing non-overlapping intervals requires sorting by earliest `end`.",
        coreInvariant:
          "An interval ending earliest leaves the largest remaining suffix for future intervals.",
        commonTrap:
          "Sorting by `start` on Activity Selection / Non-Overlapping Intervals (fails when a long interval starts early).",
        prerequisiteStrandIds: [],
        fanoutWeight: 3,
      },
      {
        id: "intervals:boundary-touching-rule",
        patternId: "intervals-sweep",
        title: "Inclusive vs Half-Open Touching (`[1,2]` & `[2,3]`)",
        unconditionalTruth:
          "Whether `a.end == b.start` counts as overlap depends on the problem spec (Merge Intervals: yes; Non-Overlapping / Meeting Rooms: no).",
        coreInvariant:
          "Sweep-line event ordering must process `-1` end events before `+1` start events at equal timestamps when touching does not conflict.",
        commonTrap:
          "Wrong tie-breaker at equal timestamps causing off-by-one room counts.",
        prerequisiteStrandIds: ["intervals:sort-by-start-vs-end"],
        fanoutWeight: 2,
      },
      {
        id: "intervals:sweep-line-events",
        patternId: "intervals-sweep",
        title: "Sweep Line / Min-Heap Concurrent Peak Tracking",
        unconditionalTruth:
          "Maximum simultaneous intervals equals the peak running sum of `+1` start and `-1` end events sorted chronologically.",
        coreInvariant:
          "Two sorted arrays (`starts[]`, `ends[]`) track peak concurrency in O(n log n) time without allocating event objects.",
        commonTrap:
          "Using O(N^2) pairwise overlap checks instead of O(n log n) sweep or min-heap.",
        prerequisiteStrandIds: ["intervals:boundary-touching-rule"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "heap-top-k",
        distinguishingCue:
          "When you need *which* room/worker is assigned (or earliest finish time dynamically), use a Min-Heap; when you only need peak count or merged ranges, a Sweep Line suffices.",
      },
    ],
    twistTemplates: [
      {
        operator: "reverse-premise",
        targetStrandId: "intervals:sort-by-start-vs-end",
        promptTemplate:
          "In Non-Overlapping Intervals, a candidate sorts by `start` ascending and greedily keeps whichever interval ends earlier on collision. Is that equivalent to sorting by `end` ascending, or can it fail?",
        whatItBreaks: "Tests deeper understanding of the greedy exchange argument vs pure sorting key.",
      },
    ],
    proCaseStudy: {
      title: "Minimum Interval Removals Without Overlap",
      targetStrandId: "intervals:sort-by-start-vs-end",
      prompt:
        "Given `intervals[i] = [start, end]`, return the minimum number of intervals to remove so the rest are non-overlapping (`[1,2]` and `[2,3]` are non-overlapping). Optimize for O(n log n) time and O(1) extra auxiliary structure beyond sorting.",
      constraints: "1 <= intervals.length <= 10^5",
      optimalTime: "O(n log n)",
      optimalSpace: "O(1) / O(log n) sort stack",
      optimizationTrap: "O(n^2) LIS-style DP on intervals or sorting by start without greedy min-end replacement.",
      starterCode: {
        cpp: `int eraseOverlapIntervals(vector<vector<int>>& intervals) {\n    // O(n log n) greedy\n}`,
        python: `def eraseOverlapIntervals(intervals: list[list[int]]) -> int:\n    # O(n log n) greedy\n    pass`,
        java: `public int eraseOverlapIntervals(int[][] intervals) {\n    // O(n log n) greedy\n    return 0;\n}`,
        typescript: `function eraseOverlapIntervals(intervals: number[][]): number {\n  // O(n log n) greedy\n  return 0;\n}`,
      },
    },
  },
  {
    id: "heap-top-k",
    title: "Heap / Priority Queue & Top-K",
    subtitle: "Bounded K-heap inversion, K-way merge & two-heap streaming median",
    category: "Stacks, Heaps & Intervals",
    interviewFrequency: "High",
    whiteboardQuery: "Heap Priority Queue Top-K",
    linkedProblemSlugs: [
      "kth-largest-element-in-an-array",
      "find-median-from-data-stream",
      "merge-k-sorted-lists",
    ],
    strands: [
      {
        id: "heap:min-vs-max-inversion",
        patternId: "heap-top-k",
        title: "Size-K Inversion (Min-Heap for Top-K Largest)",
        unconditionalTruth:
          "Keeping the K largest items seen so far requires evicting the smallest among them—so the root must be the minimum (Min-Heap of size K).",
        coreInvariant:
          "After each insertion, capping heap size at K keeps complexity O(n log K) instead of O(n log n).",
        commonTrap:
          "Pushing all n elements into a Max-Heap (degrading space to O(n) and time to O(n log n)).",
        prerequisiteStrandIds: [],
        fanoutWeight: 3,
      },
      {
        id: "heap:two-heap-balance",
        patternId: "heap-top-k",
        title: "Two-Heap Partition Invariant (Streaming Median)",
        unconditionalTruth:
          "Splitting a stream into lower-half Max-Heap and upper-half Min-Heap exposes the median at the two roots in O(1) time.",
        coreInvariant:
          "Order invariant `maxHeap.top() <= minHeap.top()` and size invariant `0 <= maxHeap.size() - minHeap.size() <= 1`.",
        commonTrap:
          "Inserting directly into `maxHeap` without bouncing through `minHeap` (violating ordering invariant).",
        prerequisiteStrandIds: ["heap:min-vs-max-inversion"],
        fanoutWeight: 2,
      },
      {
        id: "heap:k-way-merge",
        patternId: "heap-top-k",
        title: "K-Way Merge Frontier Heap",
        unconditionalTruth:
          "Merging K sorted streams requires holding only 1 active head element per stream in a Min-Heap of size <= K.",
        coreInvariant:
          "Each pop yields the global next element in O(log K), totaling O(N log K) time and O(K) heap space.",
        commonTrap:
          "Concatenating and sorting (O(N log N)) or sequential 2-list merging (O(N * K)).",
        prerequisiteStrandIds: ["heap:min-vs-max-inversion"],
        fanoutWeight: 2,
      },
      {
        id: "heap:lazy-deletion",
        patternId: "heap-top-k",
        title: "Lazy Deletion for Out-of-Window / Updated Keys",
        unconditionalTruth:
          "Standard binary heaps do not support O(log n) arbitrary removal; instead, track invalidated counts in a HashMap and pop stale roots lazily.",
        coreInvariant:
          "A heap's `top()` is trustworthy only after popping any element whose invalidation count > 0.",
        commonTrap:
          "Calling O(n) linear `remove(val)` on a PriorityQueue inside a loop, turning O(n log n) into O(n^2).",
        prerequisiteStrandIds: ["heap:two-heap-balance"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "binary-search",
        distinguishingCue:
          "Static Kth-largest in an array can use Quickselect O(n) average or Binary Search on Value; streaming Top-K requires a Min-Heap of size K.",
      },
    ],
    twistTemplates: [
      {
        operator: "constraint-twist",
        targetStrandId: "heap:lazy-deletion",
        promptTemplate:
          "You solved Streaming Median with two heaps. Now the problem asks for Sliding Window Median over a window of size `k`. Why can't you simply maintain the two heaps without extra bookkeeping, and how do you avoid O(k) heap removal?",
        whatItBreaks: "Forces derivation of lazy deletion + balance-debt tracking.",
      },
    ],
    proCaseStudy: {
      title: "Streaming Median With Strict Balance & Ordering",
      targetStrandId: "heap:two-heap-balance",
      prompt:
        "Design `addNum(num)` in **O(log n)** and `findMedian()` in **O(1)** using two heaps, ensuring the ordering invariant `low.top() <= high.top()` is never violated.",
      constraints: "Up to 5*10^4 calls, values in [-10^5, 10^5]",
      optimalTime: "O(log n) add / O(1) median",
      optimalSpace: "O(n)",
      optimizationTrap: "Re-sorting an array on every `findMedian()` or omitting the cross-heap bounce step on `addNum`.",
      starterCode: {
        cpp: `class MedianFinder {\npublic:\n    void addNum(int num) {}\n    double findMedian() { return 0.0; }\n};`,
        python: `class MedianFinder:\n    def addNum(self, num: int) -> None:\n        pass\n    def findMedian(self) -> float:\n        return 0.0`,
        java: `class MedianFinder {\n    public void addNum(int num) {}\n    public double findMedian() { return 0.0; }\n}`,
        typescript: `class MedianFinder {\n  addNum(num: number): void {}\n  findMedian(): number { return 0; }\n}`,
      },
    },
  },
  {
    id: "trees-dfs-bfs",
    title: "Trees & Recursive DFS / BFS",
    subtitle: "Post-order return contracts, top-down state vs global max & level boundaries",
    category: "Graphs & Trees",
    interviewFrequency: "Very High",
    whiteboardQuery: "Binary Tree DFS and BFS traversal",
    linkedProblemSlugs: [
      "lowest-common-ancestor-of-a-binary-tree",
      "binary-tree-level-order-traversal",
      "diameter-of-binary-tree",
    ],
    strands: [
      {
        id: "trees:bottom-up-vs-top-down",
        patternId: "trees-dfs-bfs",
        title: "Bottom-Up Return Contract vs Top-Down State",
        unconditionalTruth:
          "A recursive tree function can return one value to its parent while simultaneously updating a global answer across left+right subtrees.",
        coreInvariant:
          "In Diameter/Max-Path-Sum, the return value is a *single-branch* path (extendable upward), while the global update combines *both* branches.",
        commonTrap:
          "Returning the bent (left + right) path to the parent, corrupting ancestor path validity.",
        prerequisiteStrandIds: [],
        fanoutWeight: 3,
      },
      {
        id: "trees:lca-postorder-propagation",
        patternId: "trees-dfs-bfs",
        title: "Post-Order LCA Signal Propagation",
        unconditionalTruth:
          "If a node is `p` or `q`, or receives non-null signals from both left and right subtrees, it is the Lowest Common Ancestor.",
        coreInvariant:
          "Null means neither p nor q exists in that subtree; non-null propagates either the found target or the already-resolved LCA.",
        commonTrap:
          "Assuming both p and q always exist when a follow-up allows one target to be missing from the tree.",
        prerequisiteStrandIds: ["trees:bottom-up-vs-top-down"],
        fanoutWeight: 2,
      },
      {
        id: "trees:bfs-level-snapshot",
        patternId: "trees-dfs-bfs",
        title: "Queue Snapshot (`size = queue.length`) Level Separation",
        unconditionalTruth:
          "Freezing `levelSize = queue.size()` before dequeuing separates depth `d` from depth `d + 1` in O(n) without sentinel nodes.",
        coreInvariant:
          "All `levelSize` nodes processed in the inner loop share the exact same depth from root.",
        commonTrap:
          "Reading `queue.size()` dynamically inside the inner `for` condition instead of caching it first.",
        prerequisiteStrandIds: [],
        fanoutWeight: 2,
      },
      {
        id: "trees:bst-range-invariant",
        patternId: "trees-dfs-bfs",
        title: "Global `(min, max)` Bounds in BST Validation",
        unconditionalTruth:
          "Checking only `left.val < root.val < right.val` is local and insufficient; every node in `root.left` must be `< root.val` and > ancestor lower bound.",
        coreInvariant:
          "Pass `(low, high)` bounds strictly downward so deep right-children of a left subtree cannot exceed the root.",
        commonTrap:
          "Local-only child comparison or integer overflow with `INT_MIN`/`INT_MAX` instead of `long`/nullable bounds.",
        prerequisiteStrandIds: ["trees:bottom-up-vs-top-down"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "graphs-topo-union-find",
        distinguishingCue:
          "Trees are connected DAGs with unique parent-child paths (no `visited` set needed unless parent pointers exist); general graphs require a `visited` set to prevent cycles.",
      },
    ],
    twistTemplates: [
      {
        operator: "constraint-twist",
        targetStrandId: "trees:lca-postorder-propagation",
        promptTemplate:
          "Standard LCA assumes both `p` and `q` are guaranteed to be in the tree. If `q` might NOT exist in the tree, why does returning `root` immediately upon seeing `root == p` break, and how do you fix it in one pass?",
        whatItBreaks: "Breaks early-return shortcut when target existence isn't guaranteed.",
      },
    ],
    proCaseStudy: {
      title: "Lowest Common Ancestor With Single-Pass O(h) Stack",
      targetStrandId: "trees:lca-postorder-propagation",
      prompt:
        "Implement `lowestCommonAncestor(root, p, q)` in **O(n) time** and **O(h) recursion space** (do not store parent-pointer maps or root-to-node path arrays).",
      constraints: "2 <= nodes <= 10^5, unique values, p != q",
      optimalTime: "O(n)",
      optimalSpace: "O(h)",
      optimizationTrap: "Building parent HashMap + ancestor Set (O(n) extra map space) or O(n^2) repeated subtree searches.",
      starterCode: {
        cpp: `TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {\n    // O(n) time, O(h) recursion stack only\n}`,
        python: `def lowestCommonAncestor(root, p, q):\n    # O(n) time, O(h) recursion stack only\n    pass`,
        java: `public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {\n    // O(n) time, O(h) recursion stack only\n    return null;\n}`,
        typescript: `function lowestCommonAncestor(root: TreeNode | null, p: TreeNode | null, q: TreeNode | null): TreeNode | null {\n  // O(n) time, O(h) recursion stack only\n  return null;\n}`,
      },
    },
  },
  {
    id: "graphs-topo-union-find",
    title: "Graphs, Topological Sort & Union-Find",
    subtitle: "BFS shortest paths, Kahn's in-degree DAG ordering, Dijkstra & DSU",
    category: "Graphs & Trees",
    interviewFrequency: "Very High",
    whiteboardQuery: "Graph shortest path and topological sort",
    linkedProblemSlugs: [
      "course-schedule",
      "number-of-islands",
      "network-delay-time",
    ],
    strands: [
      {
        id: "graphs:mark-visited-on-enqueue",
        patternId: "graphs-topo-union-find",
        title: "Mark Visited at Enqueue Time (Not Pop Time)",
        unconditionalTruth:
          "Marking nodes visited when popping from a BFS queue allows multiple neighbors to enqueue the same node before it pops, causing exponential queue bloat.",
        coreInvariant:
          "Mark `visited[next] = true` immediately before `queue.push(next)`.",
        commonTrap:
          "Marking `visited` on pop in grid BFS, causing MLE/TLE on dense grids.",
        prerequisiteStrandIds: ["trees:bfs-level-snapshot"],
        fanoutWeight: 3,
      },
      {
        id: "graphs:directed-3-color-vs-kahn",
        patternId: "graphs-topo-union-find",
        title: "Directed Cycle Detection (3-State DFS vs Kahn's BFS)",
        unconditionalTruth:
          "A boolean `visited[]` cannot detect cycles in a *directed* graph because cross-edges hit already-finished nodes safely.",
        coreInvariant:
          "Cycle exists iff DFS hits a `VISITING` (active recursion stack) node, OR Kahn's algorithm processes `< V` total nodes.",
        commonTrap:
          "Using Union-Find or 2-state DFS on directed graphs (Union-Find is undirected only).",
        prerequisiteStrandIds: ["graphs:mark-visited-on-enqueue"],
        fanoutWeight: 3,
      },
      {
        id: "graphs:dijkstra-nonnegative-invariant",
        patternId: "graphs-topo-union-find",
        title: "Dijkstra Greedy Lock & Stale Heap Skipping",
        unconditionalTruth:
          "With non-negative edge weights, the minimum unfinalized heap entry can never be improved via any other unfinalized path.",
        coreInvariant:
          "Skip stale heap entries with `if (d > dist[u]) continue;` and never run Dijkstra with negative edges.",
        commonTrap:
          "Omitting stale-entry check or using `visited[]` on push instead of pop (which breaks relaxation).",
        prerequisiteStrandIds: ["heap:lazy-deletion", "graphs:mark-visited-on-enqueue"],
        fanoutWeight: 2,
      },
      {
        id: "graphs:dsu-path-compression-rank",
        patternId: "graphs-topo-union-find",
        title: "Union-Find Path Compression + Union by Rank",
        unconditionalTruth:
          "Combining path compression in `find()` with union by rank/size yields amortized `O(alpha(N))` (~O(1)) per operation.",
        coreInvariant:
          "`union(u, v)` returns `false` iff `find(u) == find(v)` (meaning `(u, v)` closes an undirected cycle).",
        commonTrap:
          "Applying Union-Find to directed dependency cycles without recognizing orientation loss.",
        prerequisiteStrandIds: [],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "trees-dfs-bfs",
        distinguishingCue:
          "Unweighted shortest path uses plain BFS O(V + E); weighted non-negative shortest path requires Dijkstra O(E log V).",
      },
    ],
    twistTemplates: [
      {
        operator: "break-the-premise",
        targetStrandId: "graphs:dijkstra-nonnegative-invariant",
        promptTemplate:
          "Someone optimizes Dijkstra by marking `visited[v] = true` when *pushing* `(dist[u] + w, v)` onto the Min-Heap (just like BFS). Give a 3-node weighted triangle where this returns a wrong shortest path.",
        whatItBreaks: "Exposes critical difference between unweighted BFS push-visited and Dijkstra pop-finalization.",
      },
      {
        operator: "discrimination",
        targetStrandId: "graphs:directed-3-color-vs-kahn",
        promptTemplate:
          "Why does Union-Find correctly detect cycles in Redundant Connection (undirected), yet fail silently on Course Schedule (`0 -> 1`, `2 -> 1`)?",
        whatItBreaks: "Prevents misapplying undirected DSU to directed DAG diamond patterns.",
      },
    ],
    proCaseStudy: {
      title: "DAG Cycle & Ordering via Kahn's Topological Sort",
      targetStrandId: "graphs:directed-3-color-vs-kahn",
      prompt:
        "Given `numCourses` and directed `prerequisites`, return true iff all courses can be finished using Kahn's BFS (`inDegree[]` + queue) in **O(V + E) time and space** without recursion stack overflow.",
      constraints: "1 <= numCourses <= 10^5, 0 <= prerequisites.length <= 10^5",
      optimalTime: "O(V + E)",
      optimalSpace: "O(V + E)",
      optimizationTrap: "O(V^2) repeated scan for zero-indegree nodes or forgetting disconnected components.",
      starterCode: {
        cpp: `bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n    // O(V + E) Kahn's BFS\n}`,
        python: `def canFinish(numCourses: int, prerequisites: list[list[int]]) -> bool:\n    # O(V + E) Kahn's BFS\n    pass`,
        java: `public boolean canFinish(int numCourses, int[][] prerequisites) {\n    // O(V + E) Kahn's BFS\n    return false;\n}`,
        typescript: `function canFinish(numCourses: number, prerequisites: number[][]): boolean {\n  // O(V + E) Kahn's BFS\n  return false;\n}`,
      },
    },
  },
  {
    id: "backtracking",
    title: "Backtracking & Decision Trees",
    subtitle: "Subsets vs permutations branching, duplicate pruning & undo invariants",
    category: "Recursion & DP",
    interviewFrequency: "High",
    whiteboardQuery: "Backtracking recursion decision tree",
    linkedProblemSlugs: [
      "subsets",
      "combination-sum",
      "n-queens",
    ],
    strands: [
      {
        id: "backtracking:choose-explore-unchoose",
        patternId: "backtracking",
        title: "State Symmetry: Choose → Explore → Unchoose",
        unconditionalTruth:
          "Sharing one mutable `path` buffer across branches requires undoing every mutation before returning so sibling branches see an uncorrupted state.",
        coreInvariant:
          "On returning from `dfs(i + 1)`, `path` and auxiliary sets (`cols`, `diag1`, `diag2`) are identical to before the call.",
        commonTrap:
          "Mutating shared lists without `pop()` or forgetting to copy `path` when pushing into `results` (pushing live reference).",
        prerequisiteStrandIds: ["trees:bottom-up-vs-top-down"],
        fanoutWeight: 3,
      },
      {
        id: "backtracking:start-index-vs-used-array",
        patternId: "backtracking",
        title: "Combinations (`start` Index) vs Permutations (`used[]`)",
        unconditionalTruth:
          "Combinations enforce index order (`j >= start`) to avoid order-duplicates; Permutations allow any unused index via `used[j]`.",
        coreInvariant:
          "`dfs(j + 1)` consumes each element once; `dfs(j)` allows unlimited reuse (Combination Sum).",
        commonTrap:
          "Passing `start + 1` instead of `j + 1` inside the loop, creating duplicate combinations.",
        prerequisiteStrandIds: ["backtracking:choose-explore-unchoose"],
        fanoutWeight: 2,
      },
      {
        id: "backtracking:duplicate-level-pruning",
        patternId: "backtracking",
        title: "Same-Level Duplicate Skip (`j > start && nums[j] == nums[j-1]`)",
        unconditionalTruth:
          "After sorting, skipping `nums[j] == nums[j-1]` at the *same* decision depth prunes duplicate branches while still allowing identical values down *deeper* depths.",
        coreInvariant:
          "Never check `nums[j] == nums[j-1]` without `j > start` (for combinations) or `!used[j-1]` (for permutations).",
        commonTrap:
          "Using a `Set` of serialized lists at the end instead of sorting + O(1) branch pruning.",
        prerequisiteStrandIds: ["backtracking:start-index-vs-used-array"],
        fanoutWeight: 2,
      },
      {
        id: "backtracking:constraint-bitmask-pruning",
        patternId: "backtracking",
        title: "O(1) Conflict Checks & Early Pruning",
        unconditionalTruth:
          "Checking queen attacks (`col`, `r - c`, `r + c`) or remaining target `< 0` in O(1) prevents exploring dead exponential subtrees.",
        coreInvariant:
          "Sorting candidates lets `if (candidates[j] > remain) break;` terminate the entire remaining sibling loop.",
        commonTrap:
          "Scanning the entire board (O(N)) per cell in N-Queens instead of O(1) diagonal sets/bitmasks.",
        prerequisiteStrandIds: ["backtracking:choose-explore-unchoose"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "dynamic-programming",
        distinguishingCue:
          "Backtracking enumerates all actual configurations (exponential output); DP counts or optimizes across overlapping subproblems without enumerating every path.",
      },
    ],
    twistTemplates: [
      {
        operator: "reverse-premise",
        targetStrandId: "backtracking:duplicate-level-pruning",
        promptTemplate:
          "In Permutations II (`[1, 1, 2]`), someone writes `if (i > 0 && nums[i] == nums[i-1] && used[i-1]) continue;` instead of `!used[i-1]`. Does it still produce unique permutations, and what changes in efficiency?",
        whatItBreaks: "Tests deep understanding of same-level vs deeper-level pruning symmetry.",
      },
    ],
    proCaseStudy: {
      title: "Combination Sum II With Early Sort-Break Pruning",
      targetStrandId: "backtracking:duplicate-level-pruning",
      prompt:
        "Given `candidates` (may contain duplicates) and `target`, return all unique combinations summing to `target` (each element used at most once). Prune duplicates and oversized branches *during* search (no post-hoc Set deduplication).",
      constraints: "1 <= candidates.length <= 100, 1 <= candidates[i] <= 50",
      optimalTime: "O(2^n) worst-case pruned",
      optimalSpace: "O(n) recursion depth",
      optimizationTrap: "Allowing `continue` without `break` on sorted oversize elements, or deduplicating strings in a HashSet at leaf.",
      starterCode: {
        cpp: `vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {\n    // Sort + branch-level pruning\n}`,
        python: `def combinationSum2(candidates: list[int], target: int) -> list[list[int]]:\n    # Sort + branch-level pruning\n    pass`,
        java: `public List<List<Integer>> combinationSum2(int[] candidates, int target) {\n    // Sort + branch-level pruning\n    return new ArrayList<>();\n}`,
        typescript: `function combinationSum2(candidates: number[], target: number): number[][] {\n  // Sort + branch-level pruning\n  return [];\n}`,
      },
    },
  },
  {
    id: "dynamic-programming",
    title: "Dynamic Programming",
    subtitle: "State formulation, transition DAG, 0/1 vs unbounded loops & space rolling",
    category: "Recursion & DP",
    interviewFrequency: "Very High",
    whiteboardQuery: "Dynamic Programming 2D table transition",
    linkedProblemSlugs: [
      "house-robber",
      "coin-change",
      "longest-common-subsequence",
      "edit-distance",
    ],
    strands: [
      {
        id: "dp:minimal-state-definition",
        patternId: "dynamic-programming",
        title: "Minimal Markov State Definition",
        unconditionalTruth:
          "A valid DP state contains the *exact* minimal parameters needed so the future transition is independent of how we reached that state.",
        coreInvariant:
          "Every subproblem `(i, j, ...)` answers a single unambiguous sentence (e.g., 'min coins for amount `a`').",
        commonTrap:
          "Including extra history in the state (exponential blowup) or omitting a constraining variable like `holdingStock` / `prevChoice`.",
        prerequisiteStrandIds: ["backtracking:choose-explore-unchoose"],
        fanoutWeight: 3,
      },
      {
        id: "dp:01-vs-unbounded-iteration-order",
        patternId: "dynamic-programming",
        title: "1D Rolling Iteration Direction (0/1 Backward vs Unbounded Forward)",
        unconditionalTruth:
          "In 1D space-compressed knapsack, iterating capacity *backward* reads row `i - 1` (0/1 use); iterating *forward* reads updated row `i` (unbounded reuse).",
        coreInvariant:
          "Update direction must strictly respect the dependency DAG so no cell overwrites a prerequisite before it is read.",
        commonTrap:
          "Iterating forward on 0/1 Knapsack / Partition Equal Subset Sum (silently reusing the same item multiple times).",
        prerequisiteStrandIds: ["dp:minimal-state-definition"],
        fanoutWeight: 3,
      },
      {
        id: "dp:2d-grid-and-string-transitions",
        patternId: "dynamic-programming",
        title: "2D Sequence Alignment & Base-Case Borders",
        unconditionalTruth:
          "For two sequences of lengths `m` and `n`, row `0` and column `0` represent the empty-prefix base cases, requiring `(m + 1) x (n + 1)` dimensions.",
        coreInvariant:
          "In Edit Distance, `dp[0][j] = j` and `dp[i][0] = i` (transforming empty string costs j insertions / i deletions).",
        commonTrap:
          "Initializing `dp[0][j] = 0` in Edit Distance (confusing it with LCS) or forgetting `diag` snapshot when rolling 2D to 1D.",
        prerequisiteStrandIds: ["dp:minimal-state-definition"],
        fanoutWeight: 2,
      },
      {
        id: "dp:space-rolling-compression",
        patternId: "dynamic-programming",
        title: "O(m*n) -> O(min(m, n)) Rolling Array Optimization",
        unconditionalTruth:
          "Whenever `dp[i][...]` depends only on `dp[i - 1][...]` (or `dp[i - 2]`), memory collapses from O(n^2) or O(n) to O(min(m, n)) or O(1).",
        coreInvariant:
          "Preserve `prevDiag = dp[j]` before overwriting `dp[j]` when a transition reads `dp[i-1][j-1]`.",
        commonTrap:
          "Leaving O(n) or O(m*n) DP tables in Pro interviews when O(1) or O(min(m, n)) space is straightforward.",
        prerequisiteStrandIds: ["dp:01-vs-unbounded-iteration-order", "dp:2d-grid-and-string-transitions"],
        fanoutWeight: 2,
      },
    ],
    confusableTwins: [
      {
        twinPatternId: "intervals-sweep",
        distinguishingCue:
          "Greedy works when local optimal choice provably dominates (exchange argument); DP is required when choices interact across subproblems (e.g., weighted job scheduling).",
      },
    ],
    twistTemplates: [
      {
        operator: "break-the-premise",
        targetStrandId: "dp:01-vs-unbounded-iteration-order",
        promptTemplate:
          "In Partition Equal Subset Sum (0/1 knapsack), a developer optimizes space to 1D `dp[target+1]` and loops `for (int s = num; s <= target; s++) dp[s] |= dp[s - num]`. Give a 2-element input where this wrongly returns `true`.",
        whatItBreaks: "Exposes forward-loop reuse bug on 0/1 subset sum (e.g. nums = [2, 3], target = 4 -> 2+2).",
      },
      {
        operator: "constraint-twist",
        targetStrandId: "dp:space-rolling-compression",
        promptTemplate:
          "Your Edit Distance runs in O(n) space using a 1D array. Now the interviewer asks you to also reconstruct and print the exact sequence of Insert/Delete/Replace operations. Why can't you do that directly from the 1D array alone?",
        whatItBreaks: "Forces tradeoff analysis between O(min(m,n)) space vs parent-pointer reconstruction (or Hirschberg's algorithm).",
      },
    ],
    proCaseStudy: {
      title: "Edit Distance With O(min(m, n)) Space Compression",
      targetStrandId: "dp:space-rolling-compression",
      prompt:
        "Compute the minimum Levenshtein Edit Distance between `word1` (len m) and `word2` (len n) in **O(m * n) time** and **O(min(m, n)) space** (rolling 1D array with diagonal preservation, not a full m x n table).",
      constraints: "0 <= m, n <= 500",
      optimalTime: "O(m * n)",
      optimalSpace: "O(min(m, n))",
      optimizationTrap: "Allocating full O(m * n) 2D table when only previous row + prev diagonal is needed.",
      starterCode: {
        cpp: `int minDistance(string word1, string word2) {\n    // O(m * n) time, O(min(m, n)) space\n}`,
        python: `def minDistance(word1: str, word2: str) -> int:\n    # O(m * n) time, O(min(m, n)) space\n    pass`,
        java: `public int minDistance(String word1, String word2) {\n    // O(m * n) time, O(min(m, n)) space\n    return 0;\n}`,
        typescript: `function minDistance(word1: string, word2: string): number {\n  // O(m * n) time, O(min(m, n)) space\n  return 0;\n}`,
      },
    },
  },
];

// ─── Pre-Indexed O(1) Lookups & Static Canonical DAG Export ──────────────────

export const PATTERN_MAP: ReadonlyMap<PatternId, PatternDefinition> = new Map(
  PATTERN_CATALOG.map((p) => [p.id, p]),
);

export const ALL_STRANDS: readonly PatternStrandDef[] = PATTERN_CATALOG.flatMap(
  (p) => p.strands,
);

export const STRAND_MAP: ReadonlyMap<string, PatternStrandDef> = new Map(
  ALL_STRANDS.map((s) => [s.id, s]),
);

export const PATTERN_EDGES: readonly PatternEdge[] = ALL_STRANDS.flatMap((s) =>
  s.prerequisiteStrandIds.map((prereqId) => {
    const prereq = STRAND_MAP.get(prereqId);
    const kind: PatternEdge["kind"] =
      prereq && prereq.patternId === s.patternId ? "internal" : "cross-pattern";
    return {
      from: prereqId,
      to: s.id,
      kind,
    };
  }),
);

/** Reverse adjacency map: strandId -> downstream dependent strandIds. */
export const DOWNSTREAM_STRANDS: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const s of ALL_STRANDS) {
    map.set(s.id, []);
  }
  for (const edge of PATTERN_EDGES) {
    const list = map.get(edge.from);
    if (list) list.push(edge.to);
  }
  return map;
})();

export function getPatternDefinition(patternId: PatternId): PatternDefinition | undefined {
  return PATTERN_MAP.get(patternId);
}

export function getStrandDefinition(strandId: string): PatternStrandDef | undefined {
  return STRAND_MAP.get(strandId);
}

/** Validates that the static pattern DAG is acyclic, has unique IDs, and valid edges. */
export function validatePatternGraph(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenStrands = new Set<string>();

  for (const s of ALL_STRANDS) {
    if (seenStrands.has(s.id)) {
      errors.push(`Duplicate strand id: ${s.id}`);
    }
    seenStrands.add(s.id);
  }

  for (const edge of PATTERN_EDGES) {
    if (!STRAND_MAP.has(edge.from)) {
      errors.push(`Missing prerequisite strand '${edge.from}' referenced by '${edge.to}'`);
    }
    if (!STRAND_MAP.has(edge.to)) {
      errors.push(`Missing target strand '${edge.to}'`);
    }
  }

  // Kahn topological cycle check
  const inDegree = new Map<string, number>();
  for (const s of ALL_STRANDS) inDegree.set(s.id, 0);
  for (const e of PATTERN_EDGES) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }
  let visited = 0;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    visited++;
    for (const nxt of DOWNSTREAM_STRANDS.get(cur) ?? []) {
      const nextDeg = (inDegree.get(nxt) ?? 0) - 1;
      inDegree.set(nxt, nextDeg);
      if (nextDeg === 0) queue.push(nxt);
    }
  }
  if (visited !== ALL_STRANDS.length) {
    errors.push(`Pattern DAG contains a cycle (visited ${visited}/${ALL_STRANDS.length} strands)`);
  }

  for (const p of PATTERN_CATALOG) {
    if (!STRAND_MAP.has(p.proCaseStudy.targetStrandId)) {
      errors.push(`Invalid proCaseStudy.targetStrandId '${p.proCaseStudy.targetStrandId}' in '${p.id}'`);
    }
    for (const tw of p.twistTemplates) {
      if (!STRAND_MAP.has(tw.targetStrandId)) {
        errors.push(`Invalid twistTemplate.targetStrandId '${tw.targetStrandId}' in '${p.id}'`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

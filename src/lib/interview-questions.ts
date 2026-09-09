export interface InterviewQuestion {
  id: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  companyTags: string[];
  description: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  starterCode: {
    cpp: string;
    python: string;
    javascript: string;
    java: string;
  };
  tierDetails: {
    bruteForce: {
      targetTime: string;
      targetSpace: string;
      guidance: string;
      description: string;
    };
    better: {
      targetTime: string;
      targetSpace: string;
      guidance: string;
      description: string;
    };
    optimal: {
      targetTime: string;
      targetSpace: string;
      guidance: string;
      description: string;
    };
  };
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "two-sum",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    topic: "Arrays & Hash Table",
    companyTags: ["Google", "Meta", "Amazon", "Apple", "Microsoft"],
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    examples: [
      {
        input: "nums = [2, 7, 11, 15], target = 9",
        output: "[0, 1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3, 2, 4], target = 6",
        output: "[1, 2]",
      },
      {
        input: "nums = [3, 3], target = 6",
        output: "[0, 1]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    starterCode: {
      cpp: `#include <vector>\n\nclass Solution {\npublic:\n    std::vector<int> twoSum(std::vector<int>& nums, int target) {\n        // Step 1: Implement the Brute Force approach first\n        \n    }\n};`,
      python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Step 1: Implement the Brute Force approach first\n        pass`,
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Step 1: Implement the Brute Force approach first\n    \n}`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Step 1: Implement the Brute Force approach first\n        return new int[]{};\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^2)",
        targetSpace: "O(1)",
        description: "Check every pair (i, j) with two nested loops to see if nums[i] + nums[j] == target.",
        guidance: "Nested loops comparing each element with every subsequent element. Notice the time complexity grows quadratically.",
      },
      better: {
        targetTime: "O(N log N)",
        targetSpace: "O(N)",
        description: "Store pairs of (value, originalIndex), sort them, and use two pointers (left & right) moving inwards.",
        guidance: "Sorting the array allows two pointers, but requires tracking original indices and takes O(N log N) time.",
      },
      optimal: {
        targetTime: "O(N)",
        targetSpace: "O(N)",
        description: "One-pass Hash Map storing each element's value mapped to its index. Check if (target - num) exists in the map.",
        guidance: "Hash map lookup allows O(1) average time check for the complement in a single linear pass.",
      },
    },
  },
  {
    id: "best-time-to-buy-and-sell-stock",
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    topic: "Arrays & Dynamic Programming",
    companyTags: ["Amazon", "Microsoft", "Meta", "Google"],
    description:
      "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    examples: [
      {
        input: "prices = [7, 1, 5, 3, 6, 4]",
        output: "5",
        explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.",
      },
      {
        input: "prices = [7, 6, 4, 3, 1]",
        output: "0",
        explanation: "In this case, no transactions are done and the max profit = 0.",
      },
    ],
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4",
    ],
    starterCode: {
      cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int maxProfit(std::vector<int>& prices) {\n        // Tier 1: Brute Force first\n        \n    }\n};`,
      python: `class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        # Tier 1: Brute Force first\n        pass`,
      javascript: `/**\n * @param {number[]} prices\n * @return {number}\n */\nfunction maxProfit(prices) {\n    // Tier 1: Brute Force first\n    \n}`,
      java: `class Solution {\n    public int maxProfit(int[] prices) {\n        // Tier 1: Brute Force first\n        return 0;\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^2)",
        targetSpace: "O(1)",
        description: "Compare every pair of buy day i and sell day j (where j > i) and keep track of maximum profit prices[j] - prices[i].",
        guidance: "Nested loops test every valid buy/sell day pair. Straightforward baseline.",
      },
      better: {
        targetTime: "O(N)",
        targetSpace: "O(N)",
        description: "Precompute an auxiliary maxRight array where maxRight[i] is the maximum selling price from day i to the end.",
        guidance: "Precomputing the maximum suffix price takes O(N) auxiliary space, trading memory for speed.",
      },
      optimal: {
        targetTime: "O(N)",
        targetSpace: "O(1)",
        description: "Single pass maintaining minPriceSeenSoFar and updating maxProfit with max(maxProfit, price - minPrice).",
        guidance: "Single pass in-place tracking minimum purchase price so far requires zero extra space.",
      },
    },
  },
  {
    id: "container-with-most-water",
    slug: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "Medium",
    topic: "Two Pointers & Greedy",
    companyTags: ["Google", "Amazon", "Meta", "Bloomberg", "Apple"],
    description:
      "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store. Notice that you may not slant the container.",
    examples: [
      {
        input: "height = [1, 8, 6, 2, 5, 4, 8, 3, 7]",
        output: "49",
        explanation: "The vertical lines are at indices 1 and 8, width = 7, min height = 7, area = 7 * 7 = 49.",
      },
      {
        input: "height = [1, 1]",
        output: "1",
      },
    ],
    constraints: [
      "n == height.length",
      "2 <= n <= 10^5",
      "0 <= height[i] <= 10^4",
    ],
    starterCode: {
      cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int maxArea(std::vector<int>& height) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {number[]} height\n * @return {number}\n */\nfunction maxArea(height) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `class Solution {\n    public int maxArea(int[] height) {\n        // Tier 1: Brute Force\n        return 0;\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^2)",
        targetSpace: "O(1)",
        description: "Test all pairs of lines (i, j) and compute width (j - i) * min(height[i], height[j]).",
        guidance: "Nested loops compute area for all n*(n-1)/2 combinations.",
      },
      better: {
        targetTime: "O(N^2)",
        targetSpace: "O(1)",
        description: "Brute force with aggressive pruning: skip inner loop if height[j] <= previous tested height or if max theoretical area cannot exceed best so far.",
        guidance: "Prunes unnecessary calculations when height is too short to beat current maximum.",
      },
      optimal: {
        targetTime: "O(N)",
        targetSpace: "O(1)",
        description: "Two pointers at left = 0 and right = n - 1. Calculate area, then move the pointer pointing to the shorter line inward.",
        guidance: "Moving the shorter line is optimal because moving the taller line can only decrease width without any chance of increasing min-height.",
      },
    },
  },
  {
    id: "maximum-subarray",
    slug: "maximum-subarray",
    title: "Maximum Subarray (Kadane's)",
    difficulty: "Medium",
    topic: "Arrays & Dynamic Programming",
    companyTags: ["Amazon", "Microsoft", "Google", "Apple", "LinkedIn"],
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.",
    examples: [
      {
        input: "nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]",
        output: "6",
        explanation: "The subarray [4, -1, 2, 1] has the largest sum 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
      },
      {
        input: "nums = [5, 4, -1, 7, 8]",
        output: "23",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    starterCode: {
      cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int maxSubArray(std::vector<int>& nums) {\n        // Tier 1: Brute force\n        \n    }\n};`,
      python: `class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        # Tier 1: Brute force\n        pass`,
      javascript: `/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction maxSubArray(nums) {\n    // Tier 1: Brute force\n    \n}`,
      java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        // Tier 1: Brute force\n        return 0;\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^3) or O(N^2)",
        targetSpace: "O(1)",
        description: "Enumerate all subarrays (start, end) and either re-sum them in O(N) or maintain a running sum in O(N^2).",
        guidance: "Checks every contiguous slice across two nested loops.",
      },
      better: {
        targetTime: "O(N log N)",
        targetSpace: "O(log N)",
        description: "Divide and Conquer: find max subarray in left half, right half, and crossing midpoint.",
        guidance: "Recursive divide and conquer breaks the array at mid, finding cross-sum in linear time.",
      },
      optimal: {
        targetTime: "O(N)",
        targetSpace: "O(1)",
        description: "Kadane's Algorithm: maintain currentMax = max(num, currentMax + num) and globalMax = max(globalMax, currentMax).",
        guidance: "If the running sum becomes negative, restart the subarray from the current element.",
      },
    },
  },
  {
    id: "valid-parentheses",
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    topic: "Stack & Strings",
    companyTags: ["Amazon", "Meta", "Google", "Microsoft", "Bloomberg"],
    description:
      "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    examples: [
      {
        input: 's = "()"',
        output: "true",
      },
      {
        input: 's = "()[]{}"',
        output: "true",
      },
      {
        input: 's = "(]"',
        output: "false",
      },
      {
        input: 's = "([])"',
        output: "true",
      },
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'.",
    ],
    starterCode: {
      cpp: `#include <string>\n#include <stack>\n\nclass Solution {\npublic:\n    bool isValid(std::string s) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isValid(s) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        // Tier 1: Brute Force\n        return false;\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^2)",
        targetSpace: "O(N)",
        description: "Repeatedly replace adjacent matching pairs '()', '[]', '{}' with empty string until no pairs remain. If string is empty, valid.",
        guidance: "String replacement scans the string multiple times until length stops changing.",
      },
      better: {
        targetTime: "O(N)",
        targetSpace: "O(N)",
        description: "Stack storing opening characters, using nested switch/if statements to match on closing brackets.",
        guidance: "Standard LIFO stack checks matching pairs, but with verbose conditional checks.",
      },
      optimal: {
        targetTime: "O(N)",
        targetSpace: "O(N)",
        description: "Stack push closing counterpart when seeing open bracket; upon seeing closing bracket, simply check if stack.pop() equals the character.",
        guidance: "Elegant stack pattern: when seeing '(', push ')'. When seeing closing bracket, simply verify stack.pop() == char.",
      },
    },
  },
  {
    id: "3sum",
    slug: "3sum",
    title: "3Sum",
    difficulty: "Medium",
    topic: "Two Pointers & Sorting",
    companyTags: ["Meta", "Amazon", "Apple", "Google", "Bloomberg"],
    description:
      "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
    examples: [
      {
        input: "nums = [-1, 0, 1, 2, -1, -4]",
        output: "[[-1, -1, 2], [-1, 0, 1]]",
        explanation: "nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0. Distinct triplets are returned.",
      },
      {
        input: "nums = [0, 1, 1]",
        output: "[]",
      },
      {
        input: "nums = [0, 0, 0]",
        output: "[[0, 0, 0]]",
      },
    ],
    constraints: [
      "3 <= nums.length <= 3000",
      "-10^5 <= nums[i] <= 10^5",
    ],
    starterCode: {
      cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    std::vector<std::vector<int>> threeSum(std::vector<int>& nums) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def threeSum(self, nums: list[int]) -> list[list[int]]:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {number[]} nums\n * @return {number[][]}\n */\nfunction threeSum(nums) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `import java.util.*;\n\nclass Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Tier 1: Brute Force\n        return new ArrayList<>();\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^3)",
        targetSpace: "O(N)",
        description: "3 nested loops checking every combination (i, j, k). Use a hash set of sorted triplets to deduplicate results.",
        guidance: "Triple nested loop with hash set deduplication.",
      },
      better: {
        targetTime: "O(N^2)",
        targetSpace: "O(N)",
        description: "Fix first element nums[i], then use a hash set of seen values for the remaining two-sum problem.",
        guidance: "Hash table for the inner pair avoids full third loop, but requires hash set for deduplicating triplets.",
      },
      optimal: {
        targetTime: "O(N^2)",
        targetSpace: "O(1) auxiliary",
        description: "Sort nums once. Loop i from 0 to n-3 (skipping duplicate nums[i]), then use two pointers (left, right) with while-loop duplicate skipping.",
        guidance: "Sorted array + two pointers eliminates extra space for hash sets and naturally skips duplicate triplets in-place.",
      },
    },
  },
];

export function getRandomInterviewQuestion(excludeId?: string): InterviewQuestion {
  const pool = excludeId
    ? INTERVIEW_QUESTIONS.filter((q) => q.id !== excludeId)
    : INTERVIEW_QUESTIONS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] || INTERVIEW_QUESTIONS[0]!;
}

export const INTERVIEW_TEMPLATES = [
  {
    id: "faang-round",
    title: "FAANG Coding Round",
    tagline: "3 Questions in 45 Minutes",
    description: "Industry-standard full loop simulation covering arrays, two-pointers, and hash table invariants with strict 15-minute question slots.",
    questionCount: 3,
    perQuestionMinutes: 15,
    totalMinutes: 45,
    difficulty: "Mixed" as const,
  },
  {
    id: "startup-sprint",
    title: "Startup Rapid Sprint",
    tagline: "2 Questions in 30 Minutes",
    description: "High-cadence round emphasizing fast brute-force baseline scaffolding progressing immediately into optimal space efficiency.",
    questionCount: 2,
    perQuestionMinutes: 15,
    totalMinutes: 30,
    difficulty: "Medium" as const,
  },
  {
    id: "invariant-deep-dive",
    title: "Algorithm & Invariant Deep Dive",
    tagline: "1 Question in 25 Minutes",
    description: "Exhaustive single-problem deep dive testing granular progression across all 3 complexity tiers with socratic hint guidance.",
    questionCount: 1,
    perQuestionMinutes: 25,
    totalMinutes: 25,
    difficulty: "Medium" as const,
  },
  {
    id: "speed-drill",
    title: "Speed Drill Sprint",
    tagline: "3 Questions in 20 Minutes",
    description: "High-pressure interview sprint with 6.5 minutes per question to test instinctive algorithmic agility under time constraints.",
    questionCount: 3,
    perQuestionMinutes: 7,
    totalMinutes: 20,
    difficulty: "Mixed" as const,
  },
];

export function getQuestionQueueForTemplate(templateId: string): InterviewQuestion[] {
  const template = INTERVIEW_TEMPLATES.find((t) => t.id === templateId) || INTERVIEW_TEMPLATES[0]!;
  const shuffled = [...INTERVIEW_QUESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, template.questionCount);
}

export function getTierStarterCode(
  question: InterviewQuestion,
  tier: "bruteForce" | "better" | "optimal",
  language: "cpp" | "python" | "javascript" | "java"
): string {
  const baseCode = question.starterCode[language] || "";
  const tierInfo = question.tierDetails[tier];
  const targetNote = `// Phase: ${tier === "bruteForce" ? "1. BRUTE FORCE" : tier === "better" ? "2. BETTER APPROACH" : "3. OPTIMAL SOLUTION"}\n// Target Complexity: ${tierInfo.targetTime} Time, ${tierInfo.targetSpace} Space\n// Strategy: ${tierInfo.description}`;

  if (language === "python") {
    const pyNote = `# Phase: ${tier === "bruteForce" ? "1. BRUTE FORCE" : tier === "better" ? "2. BETTER APPROACH" : "3. OPTIMAL SOLUTION"}\n# Target Complexity: ${tierInfo.targetTime} Time, ${tierInfo.targetSpace} Space\n# Strategy: ${tierInfo.description}`;
    return baseCode.replace(/# Tier 1:[^\n]+|# Step 1:[^\n]+/, pyNote);
  }

  return baseCode.replace(/\/\/ Tier 1:[^\n]+|\/\/ Step 1:[^\n]+/, targetNote);
}


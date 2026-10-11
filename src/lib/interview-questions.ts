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
  {
    id: "longest-substring-without-repeating-characters",
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    topic: "Sliding Window & Hash Table",
    companyTags: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
    description:
      "Given a string `s`, find the length of the longest substring without duplicate characters.\n\nA substring is a contiguous non-empty sequence of characters within a string.",
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b", with the length of 1.',
      },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation: 'The answer is "wke", with the length of 3.',
      },
    ],
    constraints: [
      "0 <= s.length <= 5 * 10^4",
      "s consists of English letters, digits, symbols and spaces.",
    ],
    starterCode: {
      cpp: `#include <string>\n#include <unordered_map>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(std::string s) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {string} s\n * @return {number}\n */\nfunction lengthOfLongestSubstring(s) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `import java.util.*;\n\nclass Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Tier 1: Brute Force\n        return 0;\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^3) or O(N^2)",
        targetSpace: "O(min(N, M))",
        description: "Enumerate all substrings s[i..j] and check if each substring has all unique characters using a Set.",
        guidance: "Check every start index i and expand j until a duplicate character appears.",
      },
      better: {
        targetTime: "O(2N)",
        targetSpace: "O(min(N, M))",
        description: "Sliding window [left, right] with a Hash Set: when s[right] is already in the set, advance left one step at a time removing s[left].",
        guidance: "Both left and right pointers traverse the string at most once (up to 2N character operations).",
      },
      optimal: {
        targetTime: "O(N)",
        targetSpace: "O(1) / O(128)",
        description: "One-pass Sliding Window storing each character's last seen index in a Hash Map or 128-entry ASCII array. Jump left directly to max(left, lastSeen[c] + 1).",
        guidance: "Instead of incrementing left one by one, jump left directly past the previous occurrence of the duplicate character.",
      },
    },
  },
  {
    id: "product-of-array-except-self",
    slug: "product-of-array-except-self",
    title: "Product of Array Except Self",
    difficulty: "Medium",
    topic: "Arrays & Prefix Sum",
    companyTags: ["Amazon", "Meta", "Apple", "Microsoft", "Google"],
    description:
      "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in `O(n)` time and without using the division operation.",
    examples: [
      {
        input: "nums = [1, 2, 3, 4]",
        output: "[24, 12, 8, 6]",
      },
      {
        input: "nums = [-1, 1, 0, -3, 3]",
        output: "[0, 0, 9, 0, 0]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix of nums fits in a 32-bit integer.",
    ],
    starterCode: {
      cpp: `#include <vector>\n\nclass Solution {\npublic:\n    std::vector<int> productExceptSelf(std::vector<int>& nums) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def productExceptSelf(self, nums: list[int]) -> list[int]:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {number[]} nums\n * @return {number[]}\n */\nfunction productExceptSelf(nums) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        // Tier 1: Brute Force\n        return new int[]{};\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^2)",
        targetSpace: "O(1)",
        description: "For each index i, run an inner loop over all j != i to multiply elements together.",
        guidance: "Nested loops compute the product from scratch for every index.",
      },
      better: {
        targetTime: "O(N)",
        targetSpace: "O(N)",
        description: "Build two auxiliary arrays: prefix[i] (product of elements before i) and suffix[i] (product of elements after i), then multiply prefix[i] * suffix[i].",
        guidance: "Precomputing prefix and suffix products eliminates repeated multiplication at the cost of O(N) extra space.",
      },
      optimal: {
        targetTime: "O(N)",
        targetSpace: "O(1) auxiliary",
        description: "Store prefix products directly in the output array in a forward pass, then multiply in-place using a single running `rightProduct` scalar in a backward pass.",
        guidance: "Reuse the output array for prefix products and maintain a single integer accumulator for suffix products.",
      },
    },
  },
  {
    id: "search-in-rotated-sorted-array",
    slug: "search-in-rotated-sorted-array",
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    topic: "Binary Search",
    companyTags: ["Google", "Meta", "Amazon", "Microsoft", "LinkedIn"],
    description:
      "There is an integer array `nums` sorted in ascending order (with distinct values).\n\nPrior to being passed to your function, `nums` is possibly rotated at an unknown pivot index `k`. Given the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.",
    examples: [
      {
        input: "nums = [4, 5, 6, 7, 0, 1, 2], target = 0",
        output: "4",
      },
      {
        input: "nums = [4, 5, 6, 7, 0, 1, 2], target = 3",
        output: "-1",
      },
      {
        input: "nums = [1], target = 0",
        output: "-1",
      },
    ],
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4",
      "All values of nums are unique.",
    ],
    starterCode: {
      cpp: `#include <vector>\n\nclass Solution {\npublic:\n    int search(std::vector<int>& nums, int target) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number}\n */\nfunction search(nums, target) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `class Solution {\n    public int search(int[] nums, int target) {\n        // Tier 1: Brute Force\n        return -1;\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N)",
        targetSpace: "O(1)",
        description: "Linear scan through `nums` from index 0 to n-1, returning the index if `nums[i] == target`.",
        guidance: "A simple linear scan works as a baseline but ignores the sorted halves property.",
      },
      better: {
        targetTime: "O(2 log N)",
        targetSpace: "O(1)",
        description: "Two-pass Binary Search: first binary search to find the rotation pivot index (minimum element), then binary search in the appropriate sorted subarray.",
        guidance: "Finding the inflection point splits the array into two standard monotonic segments.",
      },
      optimal: {
        targetTime: "O(log N)",
        targetSpace: "O(1)",
        description: "Single-pass Binary Search: at each `mid`, at least one half (`[left..mid]` or `[mid..right]`) is strictly sorted. Check if `target` lies within the sorted half's bounds.",
        guidance: "Compare `nums[left] <= nums[mid]` to identify which half is sorted, then check if `target` falls inside that sorted range.",
      },
    },
  },
  {
    id: "merge-intervals",
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
    topic: "Intervals & Sorting",
    companyTags: ["Meta", "Google", "Amazon", "Bloomberg", "Apple"],
    description:
      "Given an array of `intervals` where `intervals[i] = [start_i, end_i]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
    examples: [
      {
        input: "intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]",
        output: "[[1, 6], [8, 10], [15, 18]]",
        explanation: "Since intervals [1, 3] and [2, 6] overlap, merge them into [1, 6].",
      },
      {
        input: "intervals = [[1, 4], [4, 5]]",
        output: "[[1, 5]]",
        explanation: "Intervals [1, 4] and [4, 5] are considered overlapping.",
      },
    ],
    constraints: [
      "1 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= start_i <= end_i <= 10^4",
    ],
    starterCode: {
      cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    std::vector<std::vector<int>> merge(std::vector<std::vector<int>>& intervals) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def merge(self, intervals: list[list[int]]) -> list[list[int]]:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {number[][]} intervals\n * @return {number[][]}\n */\nfunction merge(intervals) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `import java.util.*;\n\nclass Solution {\n    public int[][] merge(int[][] intervals) {\n        // Tier 1: Brute Force\n        return new int[][]{};\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^2)",
        targetSpace: "O(N)",
        description: "Repeatedly compare all pairs of intervals and merge overlapping ones until no further merges occur.",
        guidance: "Without sorting first, every interval must be checked against every other interval.",
      },
      better: {
        targetTime: "O(N log N)",
        targetSpace: "O(N)",
        description: "Sort intervals by start time, push the first interval to a new list, and for each subsequent interval either merge with the back of the list or append.",
        guidance: "Sorting by `start_i` guarantees that mergeable intervals become adjacent in the array.",
      },
      optimal: {
        targetTime: "O(N log N)",
        targetSpace: "O(1) auxiliary",
        description: "Sort intervals by start time in-place and maintain a write pointer `idx` in the input array to merge intervals in-place before resizing.",
        guidance: "Using a write index `idx` on the sorted intervals array avoids allocating a separate intermediate container.",
      },
    },
  },
  {
    id: "trapping-rain-water",
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    topic: "Two Pointers & Greedy",
    companyTags: ["Google", "Amazon", "Meta", "Goldman Sachs", "Apple"],
    description:
      "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
    examples: [
      {
        input: "height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]",
        output: "6",
        explanation: "6 units of rain water are being trapped between the elevation bars.",
      },
      {
        input: "height = [4, 2, 0, 3, 2, 5]",
        output: "9",
      },
    ],
    constraints: [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5",
    ],
    starterCode: {
      cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int trap(std::vector<int>& height) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def trap(self, height: list[int]) -> int:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {number[]} height\n * @return {number}\n */\nfunction trap(height) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `class Solution {\n    public int trap(int[] height) {\n        // Tier 1: Brute Force\n        return 0;\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(N^2)",
        targetSpace: "O(1)",
        description: "For each index i, scan left to find maxLeft and scan right to find maxRight, then add max(0, min(maxLeft, maxRight) - height[i]).",
        guidance: "Water above bar i is bounded by the shorter of the tallest bar on its left and the tallest bar on its right.",
      },
      better: {
        targetTime: "O(N)",
        targetSpace: "O(N)",
        description: "Precompute `leftMax[i]` and `rightMax[i]` arrays in two linear passes, then sum `min(leftMax[i], rightMax[i]) - height[i]`.",
        guidance: "Dynamic programming prefix/suffix arrays eliminate redundant inner scans using O(N) memory.",
      },
      optimal: {
        targetTime: "O(N)",
        targetSpace: "O(1)",
        description: "Two pointers (`left = 0`, `right = n - 1`) with scalar `leftMax` and `rightMax`. Always advance the side with the smaller boundary height.",
        guidance: "Since water level is bottlenecked by `min(leftMax, rightMax)`, whichever side has the smaller max height can immediately finalize its trapped water in O(1) space.",
      },
    },
  },
  {
    id: "coin-change",
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "Medium",
    topic: "Arrays & Dynamic Programming",
    companyTags: ["Amazon", "Google", "Microsoft", "Meta", "Apple"],
    description:
      "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.",
    examples: [
      {
        input: "coins = [1, 2, 5], amount = 11",
        output: "3",
        explanation: "11 = 5 + 5 + 1",
      },
      {
        input: "coins = [2], amount = 3",
        output: "-1",
      },
      {
        input: "coins = [1], amount = 0",
        output: "0",
      },
    ],
    constraints: [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4",
    ],
    starterCode: {
      cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int coinChange(std::vector<int>& coins, int amount) {\n        // Tier 1: Brute Force\n        \n    }\n};`,
      python: `class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        # Tier 1: Brute Force\n        pass`,
      javascript: `/**\n * @param {number[]} coins\n * @param {number} amount\n * @return {number}\n */\nfunction coinChange(coins, amount) {\n    // Tier 1: Brute Force\n    \n}`,
      java: `import java.util.*;\n\nclass Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Tier 1: Brute Force\n        return -1;\n    }\n}`,
    },
    tierDetails: {
      bruteForce: {
        targetTime: "O(S^N)",
        targetSpace: "O(S)",
        description: "Recursive DFS trying every coin denomination to reduce `amount`, exploring all combinations.",
        guidance: "Pure recursion recomputes overlapping sub-amounts exponentially many times.",
      },
      better: {
        targetTime: "O(S * N)",
        targetSpace: "O(S) recursion + memo",
        description: "Top-Down Memoization: cache `minCoins(rem)` in a memo array/map of size `amount + 1` so each sub-amount is solved once.",
        guidance: "Memoizing remaining amount `rem` collapses the exponential tree into `amount` distinct states.",
      },
      optimal: {
        targetTime: "O(S * N)",
        targetSpace: "O(S) iterative",
        description: "Bottom-Up 1D DP array `dp[0..amount]` initialized to `amount + 1` with `dp[0] = 0`. For each `a` from 1 to `amount`, `dp[a] = min(dp[a], 1 + dp[a - coin])`.",
        guidance: "Iterative 1D DP table avoids recursion call-stack overhead and exhibits optimal cache locality.",
      },
    },
  },
];

export function getAvailableInterviewTopics(): string[] {
  return Array.from(new Set(INTERVIEW_QUESTIONS.map((q) => q.topic)));
}

export function getAvailableCompanyTags(): string[] {
  const tags = new Set<string>();
  for (const q of INTERVIEW_QUESTIONS) {
    for (const c of q.companyTags) {
      tags.add(c);
    }
  }
  return Array.from(tags);
}

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
    title: "Standard 45-Minute Coding Round",
    tagline: "3 Questions in 45 Minutes",
    description: "Full-length practice simulation covering arrays, two-pointers, and hash table invariants with 15-minute question slots.",
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

export function getQuestionQueueForTemplate(
  templateId: string,
  filters?: { company?: string; topic?: string }
): InterviewQuestion[] {
  const template = INTERVIEW_TEMPLATES.find((t) => t.id === templateId) || INTERVIEW_TEMPLATES[0]!;
  let pool = [...INTERVIEW_QUESTIONS];

  if (filters?.company && filters.company !== "All") {
    const byCompany = pool.filter((q) => q.companyTags.includes(filters.company!));
    if (byCompany.length > 0) {
      pool = byCompany;
    }
  }

  if (filters?.topic && filters.topic !== "All") {
    const byTopic = pool.filter((q) => q.topic === filters.topic);
    if (byTopic.length > 0) {
      pool = byTopic;
    }
  }

  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  // If filtered pool has fewer items than template.questionCount, top up from remaining questions
  if (shuffled.length < template.questionCount) {
    const usedIds = new Set(shuffled.map((q) => q.id));
    const remainder = INTERVIEW_QUESTIONS.filter((q) => !usedIds.has(q.id)).sort(() => 0.5 - Math.random());
    shuffled.push(...remainder);
  }
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

const REFERENCE_OPTIMAL_SOLUTIONS: Record<
  string,
  Record<"cpp" | "python" | "javascript" | "java", string>
> = {
  "two-sum": {
    cpp: `#include <vector>\n#include <unordered_map>\n\nclass Solution {\npublic:\n    std::vector<int> twoSum(std::vector<int>& nums, int target) {\n        std::unordered_map<int, int> seen;\n        for (int i = 0; i < (int)nums.size(); ++i) {\n            int complement = target - nums[i];\n            auto it = seen.find(complement);\n            if (it != seen.end()) return {it->second, i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};`,
    python: `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen: dict[int, int] = {}\n        for i, num in enumerate(nums):\n            complement = target - num\n            if complement in seen:\n                return [seen[complement], i]\n            seen[num] = i\n        return []`,
    javascript: `function twoSum(nums, target) {\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (seen.has(complement)) return [seen.get(complement), i];\n        seen.set(nums[i], i);\n    }\n    return [];\n}`,
    java: `import java.util.*;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (seen.containsKey(complement)) {\n                return new int[]{seen.get(complement), i};\n            }\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
  },
  "best-time-to-buy-and-sell-stock": {
    cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int maxProfit(std::vector<int>& prices) {\n        int minPrice = prices[0], best = 0;\n        for (int p : prices) {\n            minPrice = std::min(minPrice, p);\n            best = std::max(best, p - minPrice);\n        }\n        return best;\n    }\n};`,
    python: `class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        min_price = prices[0]\n        best = 0\n        for p in prices:\n            if p < min_price:\n                min_price = p\n            elif p - min_price > best:\n                best = p - min_price\n        return best`,
    javascript: `function maxProfit(prices) {\n    let minPrice = prices[0], best = 0;\n    for (const p of prices) {\n        if (p < minPrice) minPrice = p;\n        else if (p - minPrice > best) best = p - minPrice;\n    }\n    return best;\n}`,
    java: `class Solution {\n    public int maxProfit(int[] prices) {\n        int minPrice = prices[0], best = 0;\n        for (int p : prices) {\n            if (p < minPrice) minPrice = p;\n            else if (p - minPrice > best) best = p - minPrice;\n        }\n        return best;\n    }\n}`,
  },
  "container-with-most-water": {
    cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int maxArea(std::vector<int>& height) {\n        int l = 0, r = (int)height.size() - 1, best = 0;\n        while (l < r) {\n            int h = std::min(height[l], height[r]);\n            best = std::max(best, h * (r - l));\n            if (height[l] < height[r]) ++l;\n            else --r;\n        }\n        return best;\n    }\n};`,
    python: `class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        l, r, best = 0, len(height) - 1, 0\n        while l < r:\n            best = max(best, min(height[l], height[r]) * (r - l))\n            if height[l] < height[r]:\n                l += 1\n            else:\n                r -= 1\n        return best`,
    javascript: `function maxArea(height) {\n    let l = 0, r = height.length - 1, best = 0;\n    while (l < r) {\n        best = Math.max(best, Math.min(height[l], height[r]) * (r - l));\n        if (height[l] < height[r]) l++;\n        else r--;\n    }\n    return best;\n}`,
    java: `class Solution {\n    public int maxArea(int[] height) {\n        int l = 0, r = height.length - 1, best = 0;\n        while (l < r) {\n            best = Math.max(best, Math.min(height[l], height[r]) * (r - l));\n            if (height[l] < height[r]) l++;\n            else r--;\n        }\n        return best;\n    }\n}`,
  },
  "maximum-subarray": {
    cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int maxSubArray(std::vector<int>& nums) {\n        int cur = nums[0], best = nums[0];\n        for (size_t i = 1; i < nums.size(); ++i) {\n            cur = std::max(nums[i], cur + nums[i]);\n            best = std::max(best, cur);\n        }\n        return best;\n    }\n};`,
    python: `class Solution:\n    def maxSubArray(self, nums: list[int]) -> int:\n        cur = best = nums[0]\n        for x in nums[1:]:\n            cur = max(x, cur + x)\n            best = max(best, cur)\n        return best`,
    javascript: `function maxSubArray(nums) {\n    let cur = nums[0], best = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        cur = Math.max(nums[i], cur + nums[i]);\n        best = Math.max(best, cur);\n    }\n    return best;\n}`,
    java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        int cur = nums[0], best = nums[0];\n        for (int i = 1; i < nums.length; i++) {\n            cur = Math.max(nums[i], cur + nums[i]);\n            best = Math.max(best, cur);\n        }\n        return best;\n    }\n}`,
  },
  "valid-parentheses": {
    cpp: `#include <string>\n#include <stack>\n\nclass Solution {\npublic:\n    bool isValid(std::string s) {\n        std::stack<char> st;\n        for (char c : s) {\n            if (c == '(') st.push(')');\n            else if (c == '[') st.push(']');\n            else if (c == '{') st.push('}');\n            else {\n                if (st.empty() || st.top() != c) return false;\n                st.pop();\n            }\n        }\n        return st.empty();\n    }\n};`,
    python: `class Solution:\n    def isValid(self, s: str) -> bool:\n        stack: list[str] = []\n        pairs = {'(': ')', '[': ']', '{': '}'}\n        for c in s:\n            if c in pairs:\n                stack.append(pairs[c])\n            elif not stack or stack.pop() != c:\n                return False\n        return not stack`,
    javascript: `function isValid(s) {\n    const stack = [];\n    const map = { '(': ')', '[': ']', '{': '}' };\n    for (const c of s) {\n        if (map[c]) stack.push(map[c]);\n        else if (stack.pop() !== c) return false;\n    }\n    return stack.length === 0;\n}`,
    java: `import java.util.*;\n\nclass Solution {\n    public boolean isValid(String s) {\n        Deque<Character> stack = new ArrayDeque<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') stack.push(')');\n            else if (c == '[') stack.push(']');\n            else if (c == '{') stack.push('}');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}`,
  },
  "3sum": {
    cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    std::vector<std::vector<int>> threeSum(std::vector<int>& nums) {\n        std::sort(nums.begin(), nums.end());\n        std::vector<std::vector<int>> res;\n        int n = (int)nums.size();\n        for (int i = 0; i < n - 2; ++i) {\n            if (i > 0 && nums[i] == nums[i - 1]) continue;\n            int l = i + 1, r = n - 1;\n            while (l < r) {\n                int sum = nums[i] + nums[l] + nums[r];\n                if (sum == 0) {\n                    res.push_back({nums[i], nums[l], nums[r]});\n                    while (l < r && nums[l] == nums[l + 1]) ++l;\n                    while (l < r && nums[r] == nums[r - 1]) --r;\n                    ++l; --r;\n                } else if (sum < 0) ++l;\n                else --r;\n            }\n        }\n        return res;\n    }\n};`,
    python: `class Solution:\n    def threeSum(self, nums: list[int]) -> list[list[int]]:\n        nums.sort()\n        res: list[list[int]] = []\n        n = len(nums)\n        for i in range(n - 2):\n            if i > 0 and nums[i] == nums[i - 1]:\n                continue\n            l, r = i + 1, n - 1\n            while l < r:\n                s = nums[i] + nums[l] + nums[r]\n                if s == 0:\n                    res.append([nums[i], nums[l], nums[r]])\n                    while l < r and nums[l] == nums[l + 1]: l += 1\n                    while l < r and nums[r] == nums[r - 1]: r -= 1\n                    l += 1; r -= 1\n                elif s < 0: l += 1\n                else: r -= 1\n        return res`,
    javascript: `function threeSum(nums) {\n    nums.sort((a, b) => a - b);\n    const res = [];\n    for (let i = 0; i < nums.length - 2; i++) {\n        if (i > 0 && nums[i] === nums[i - 1]) continue;\n        let l = i + 1, r = nums.length - 1;\n        while (l < r) {\n            const sum = nums[i] + nums[l] + nums[r];\n            if (sum === 0) {\n                res.push([nums[i], nums[l], nums[r]]);\n                while (l < r && nums[l] === nums[l + 1]) l++;\n                while (l < r && nums[r] === nums[r - 1]) r--;\n                l++; r--;\n            } else if (sum < 0) l++;\n            else r--;\n        }\n    }\n    return res;\n}`,
    java: `import java.util.*;\n\nclass Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        Arrays.sort(nums);\n        List<List<Integer>> res = new ArrayList<>();\n        for (int i = 0; i < nums.length - 2; i++) {\n            if (i > 0 && nums[i] == nums[i - 1]) continue;\n            int l = i + 1, r = nums.length - 1;\n            while (l < r) {\n                int sum = nums[i] + nums[l] + nums[r];\n                if (sum == 0) {\n                    res.add(Arrays.asList(nums[i], nums[l], nums[r]));\n                    while (l < r && nums[l] == nums[l + 1]) l++;\n                    while (l < r && nums[r] == nums[r - 1]) r--;\n                    l++; r--;\n                } else if (sum < 0) l++;\n                else r--;\n            }\n        }\n        return res;\n    }\n}`,
  },
  "longest-substring-without-repeating-characters": {
    cpp: `#include <string>\n#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(std::string s) {\n        std::vector<int> last(128, -1);\n        int left = 0, best = 0;\n        for (int r = 0; r < (int)s.size(); ++r) {\n            left = std::max(left, last[(unsigned char)s[r]] + 1);\n            last[(unsigned char)s[r]] = r;\n            best = std::max(best, r - left + 1);\n        }\n        return best;\n    }\n};`,
    python: `class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        last: dict[str, int] = {}\n        left = best = 0\n        for r, ch in enumerate(s):\n            if ch in last and last[ch] >= left:\n                left = last[ch] + 1\n            last[ch] = r\n            best = max(best, r - left + 1)\n        return best`,
    javascript: `function lengthOfLongestSubstring(s) {\n    const last = new Map();\n    let left = 0, best = 0;\n    for (let r = 0; r < s.length; r++) {\n        if (last.has(s[r]) && last.get(s[r]) >= left) {\n            left = last.get(s[r]) + 1;\n        }\n        last.set(s[r], r);\n        best = Math.max(best, r - left + 1);\n    }\n    return best;\n}`,
    java: `import java.util.*;\n\nclass Solution {\n    public int lengthOfLongestSubstring(String s) {\n        int[] last = new int[128];\n        Arrays.fill(last, -1);\n        int left = 0, best = 0;\n        for (int r = 0; r < s.length(); r++) {\n            char c = s.charAt(r);\n            left = Math.max(left, last[c] + 1);\n            last[c] = r;\n            best = Math.max(best, r - left + 1);\n        }\n        return best;\n    }\n}`,
  },
  "product-of-array-except-self": {
    cpp: `#include <vector>\n\nclass Solution {\npublic:\n    std::vector<int> productExceptSelf(std::vector<int>& nums) {\n        int n = (int)nums.size();\n        std::vector<int> res(n, 1);\n        for (int i = 1; i < n; ++i) res[i] = res[i - 1] * nums[i - 1];\n        int right = 1;\n        for (int i = n - 1; i >= 0; --i) {\n            res[i] *= right;\n            right *= nums[i];\n        }\n        return res;\n    }\n};`,
    python: `class Solution:\n    def productExceptSelf(self, nums: list[int]) -> list[int]:\n        n = len(nums)\n        res = [1] * n\n        for i in range(1, n):\n            res[i] = res[i - 1] * nums[i - 1]\n        right = 1\n        for i in range(n - 1, -1, -1):\n            res[i] *= right\n            right *= nums[i]\n        return res`,
    javascript: `function productExceptSelf(nums) {\n    const res = new Array(nums.length).fill(1);\n    for (let i = 1; i < nums.length; i++) res[i] = res[i - 1] * nums[i - 1];\n    let right = 1;\n    for (let i = nums.length - 1; i >= 0; i--) {\n        res[i] *= right;\n        right *= nums[i];\n    }\n    return res;\n}`,
    java: `class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        int n = nums.length;\n        int[] res = new int[n];\n        res[0] = 1;\n        for (int i = 1; i < n; i++) res[i] = res[i - 1] * nums[i - 1];\n        int right = 1;\n        for (int i = n - 1; i >= 0; i--) {\n            res[i] *= right;\n            right *= nums[i];\n        }\n        return res;\n    }\n}`,
  },
  "search-in-rotated-sorted-array": {
    cpp: `#include <vector>\n\nclass Solution {\npublic:\n    int search(std::vector<int>& nums, int target) {\n        int l = 0, r = (int)nums.size() - 1;\n        while (l <= r) {\n            int mid = l + (r - l) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[l] <= nums[mid]) {\n                if (nums[l] <= target && target < nums[mid]) r = mid - 1;\n                else l = mid + 1;\n            } else {\n                if (nums[mid] < target && target <= nums[r]) l = mid + 1;\n                else r = mid - 1;\n            }\n        }\n        return -1;\n    }\n};`,
    python: `class Solution:\n    def search(self, nums: list[int], target: int) -> int:\n        l, r = 0, len(nums) - 1\n        while l <= r:\n            mid = (l + r) // 2\n            if nums[mid] == target:\n                return mid\n            if nums[l] <= nums[mid]:\n                if nums[l] <= target < nums[mid]: r = mid - 1\n                else: l = mid + 1\n            else:\n                if nums[mid] < target <= nums[r]: l = mid + 1\n                else: r = mid - 1\n        return -1`,
    javascript: `function search(nums, target) {\n    let l = 0, r = nums.length - 1;\n    while (l <= r) {\n        const mid = (l + r) >> 1;\n        if (nums[mid] === target) return mid;\n        if (nums[l] <= nums[mid]) {\n            if (nums[l] <= target && target < nums[mid]) r = mid - 1;\n            else l = mid + 1;\n        } else {\n            if (nums[mid] < target && target <= nums[r]) l = mid + 1;\n            else r = mid - 1;\n        }\n    }\n    return -1;\n}`,
    java: `class Solution {\n    public int search(int[] nums, int target) {\n        int l = 0, r = nums.length - 1;\n        while (l <= r) {\n            int mid = l + (r - l) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[l] <= nums[mid]) {\n                if (nums[l] <= target && target < nums[mid]) r = mid - 1;\n                else l = mid + 1;\n            } else {\n                if (nums[mid] < target && target <= nums[r]) l = mid + 1;\n                else r = mid - 1;\n            }\n        }\n        return -1;\n    }\n}`,
  },
  "merge-intervals": {
    cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    std::vector<std::vector<int>> merge(std::vector<std::vector<int>>& intervals) {\n        std::sort(intervals.begin(), intervals.end());\n        std::vector<std::vector<int>> merged;\n        for (const auto& interval : intervals) {\n            if (merged.empty() || merged.back()[1] < interval[0]) {\n                merged.push_back(interval);\n            } else {\n                merged.back()[1] = std::max(merged.back()[1], interval[1]);\n            }\n        }\n        return merged;\n    }\n};`,
    python: `class Solution:\n    def merge(self, intervals: list[list[int]]) -> list[list[int]]:\n        intervals.sort(key=lambda x: x[0])\n        merged: list[list[int]] = []\n        for iv in intervals:\n            if not merged or merged[-1][1] < iv[0]:\n                merged.append(iv)\n            else:\n                merged[-1][1] = max(merged[-1][1], iv[1])\n        return merged`,
    javascript: `function merge(intervals) {\n    intervals.sort((a, b) => a[0] - b[0]);\n    const merged = [];\n    for (const iv of intervals) {\n        if (!merged.length || merged[merged.length - 1][1] < iv[0]) {\n            merged.push(iv);\n        } else {\n            merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], iv[1]);\n        }\n    }\n    return merged;\n}`,
    java: `import java.util.*;\n\nclass Solution {\n    public int[][] merge(int[][] intervals) {\n        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));\n        List<int[]> merged = new ArrayList<>();\n        for (int[] iv : intervals) {\n            if (merged.isEmpty() || merged.get(merged.size() - 1)[1] < iv[0]) {\n                merged.add(iv);\n            } else {\n                merged.get(merged.size() - 1)[1] = Math.max(merged.get(merged.size() - 1)[1], iv[1]);\n            }\n        }\n        return merged.toArray(new int[merged.size()][]);\n    }\n}`,
  },
  "trapping-rain-water": {
    cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int trap(std::vector<int>& height) {\n        int l = 0, r = (int)height.size() - 1, lMax = 0, rMax = 0, water = 0;\n        while (l < r) {\n            if (height[l] < height[r]) {\n                lMax = std::max(lMax, height[l]);\n                water += lMax - height[l++];\n            } else {\n                rMax = std::max(rMax, height[r]);\n                water += rMax - height[r--];\n            }\n        }\n        return water;\n    }\n};`,
    python: `class Solution:\n    def trap(self, height: list[int]) -> int:\n        l, r = 0, len(height) - 1\n        l_max = r_max = water = 0\n        while l < r:\n            if height[l] < height[r]:\n                l_max = max(l_max, height[l])\n                water += l_max - height[l]\n                l += 1\n            else:\n                r_max = max(r_max, height[r])\n                water += r_max - height[r]\n                r -= 1\n        return water`,
    javascript: `function trap(height) {\n    let l = 0, r = height.length - 1, lMax = 0, rMax = 0, water = 0;\n    while (l < r) {\n        if (height[l] < height[r]) {\n            lMax = Math.max(lMax, height[l]);\n            water += lMax - height[l++];\n        } else {\n            rMax = Math.max(rMax, height[r]);\n            water += rMax - height[r--];\n        }\n    }\n    return water;\n}`,
    java: `class Solution {\n    public int trap(int[] height) {\n        int l = 0, r = height.length - 1, lMax = 0, rMax = 0, water = 0;\n        while (l < r) {\n            if (height[l] < height[r]) {\n                lMax = Math.max(lMax, height[l]);\n                water += lMax - height[l++];\n            } else {\n                rMax = Math.max(rMax, height[r]);\n                water += rMax - height[r--];\n            }\n        }\n        return water;\n    }\n}`,
  },
  "coin-change": {
    cpp: `#include <vector>\n#include <algorithm>\n\nclass Solution {\npublic:\n    int coinChange(std::vector<int>& coins, int amount) {\n        std::vector<int> dp(amount + 1, amount + 1);\n        dp[0] = 0;\n        for (int a = 1; a <= amount; ++a) {\n            for (int c : coins) {\n                if (a >= c) dp[a] = std::min(dp[a], 1 + dp[a - c]);\n            }\n        }\n        return dp[amount] > amount ? -1 : dp[amount];\n    }\n};`,
    python: `class Solution:\n    def coinChange(self, coins: list[int], amount: int) -> int:\n        dp = [amount + 1] * (amount + 1)\n        dp[0] = 0\n        for a in range(1, amount + 1):\n            for c in coins:\n                if a >= c:\n                    dp[a] = min(dp[a], 1 + dp[a - c])\n        return dp[amount] if dp[amount] <= amount else -1`,
    javascript: `function coinChange(coins, amount) {\n    const dp = new Array(amount + 1).fill(amount + 1);\n    dp[0] = 0;\n    for (let a = 1; a <= amount; a++) {\n        for (const c of coins) {\n            if (a >= c) dp[a] = Math.min(dp[a], 1 + dp[a - c]);\n        }\n    }\n    return dp[amount] > amount ? -1 : dp[amount];\n}`,
    java: `import java.util.*;\n\nclass Solution {\n    public int coinChange(int[] coins, int amount) {\n        int[] dp = new int[amount + 1];\n        Arrays.fill(dp, amount + 1);\n        dp[0] = 0;\n        for (int a = 1; a <= amount; a++) {\n            for (int c : coins) {\n                if (a >= c) dp[a] = Math.min(dp[a], 1 + dp[a - c]);\n            }\n        }\n        return dp[amount] > amount ? -1 : dp[amount];\n    }\n}`,
  },
};

export function getReferenceOptimalCode(
  question: InterviewQuestion,
  language: "cpp" | "python" | "javascript" | "java"
): string {
  const ref = REFERENCE_OPTIMAL_SOLUTIONS[question.id]?.[language];
  if (ref) return ref;
  return getTierStarterCode(question, "optimal", language);
}

export function getRecommendedFollowUpQuestions(
  attemptedIds: string[],
  limit = 3
): InterviewQuestion[] {
  const attemptedSet = new Set(attemptedIds);
  const unattempted = INTERVIEW_QUESTIONS.filter((q) => !attemptedSet.has(q.id));
  if (unattempted.length >= limit) {
    return unattempted.slice(0, limit);
  }
  return [...unattempted, ...INTERVIEW_QUESTIONS.filter((q) => attemptedSet.has(q.id))].slice(0, limit);
}



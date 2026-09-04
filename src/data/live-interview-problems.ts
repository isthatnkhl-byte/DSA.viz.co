export interface ProblemTier {
  tierNumber: 1 | 2 | 3;
  name: "Brute Force" | "Better Approach" | "Optimal Solution";
  complexityTag: string;
  objective: string;
  expectedPatterns: string[];
  socraticHints: string[];
  interviewerPraise: string;
  nextPrompt: string;
  testCases: Array<{ input: any[]; expected: any; description: string }>;
  starterCode: {
    python: string;
    cpp: string;
    javascript: string;
    typescript: string;
  };
  referenceSolution: {
    python: string;
    cpp: string;
    javascript: string;
    typescript: string;
  };
}

export interface LiveInterviewProblem {
  id: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  description: string;
  constraints: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  functionSignature: {
    name: string;
    python: string;
    cpp: string;
    javascript: string;
    typescript: string;
  };
  tiers: {
    1: ProblemTier;
    2: ProblemTier;
    3: ProblemTier;
  };
  welcomeSpeech: string;
}

export const LIVE_INTERVIEW_PROBLEMS: LiveInterviewProblem[] = [
  {
    id: "two-sum",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Hash Table & Two Pointers",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    examples: [
      {
        input: "nums = [2, 7, 11, 15], target = 9",
        output: "[0, 1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3, 2, 4], target = 6",
        output: "[1, 2]",
        explanation: "nums[1] + nums[2] == 6, return [1, 2].",
      },
    ],
    functionSignature: {
      name: "twoSum",
      python: "def twoSum(nums: list[int], target: int) -> list[int]:",
      cpp: "vector<int> twoSum(vector<int>& nums, int target)",
      javascript: "twoSum(nums, target)",
      typescript: "twoSum(nums: number[], target: number): number[]",
    },
    welcomeSpeech:
      "Welcome to your live coding interview. Today we will work on finding a pair of elements that sum up to a target value. First, please walk me through a brute force approach and implement it.",
    tiers: {
      1: {
        tierNumber: 1,
        name: "Brute Force",
        complexityTag: "O(N²)",
        objective: "Check all pairs of elements using nested iteration.",
        expectedPatterns: ["for i in range", "for j in range", "for (let i", "for (let j", "for (int i", "for (int j"],
        socraticHints: [
          "Check your loop boundaries. Are you comparing an element with itself, or starting the inner loop from i + 1?",
          "Ensure you return the indices of the elements, not their values.",
        ],
        interviewerPraise:
          "Good start. Your brute force solution correctly finds the indices by examining each candidate pair.",
        nextPrompt:
          "Now, how can we improve upon the O(N squared) time complexity? Could pre-sorting or a spatial trade-off help us find complements faster?",
        testCases: [
          { input: [[2, 7, 11, 15], 9], expected: [0, 1], description: "Basic positive pair" },
          { input: [[3, 2, 4], 6], expected: [1, 2], description: "Non-adjacent pair" },
          { input: [[3, 3], 6], expected: [0, 1], description: "Duplicate elements" },
        ],
        starterCode: {
          python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    twoSum(nums, target) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    twoSum(nums: number[], target: number): number[] {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        n = len(nums)\n        for i in range(n):\n            for j in range(i + 1, n):\n                if nums[i] + nums[j] == target:\n                    return [i, j]\n        return []\n",
          cpp: "#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        int n = nums.size();\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                if (nums[i] + nums[j] == target) {\n                    return {i, j};\n                }\n            }\n        }\n        return {};\n    }\n};\n",
          javascript: "class Solution {\n    twoSum(nums, target) {\n        for (let i = 0; i < nums.length; i++) {\n            for (let j = i + 1; j < nums.length; j++) {\n                if (nums[i] + nums[j] === target) {\n                    return [i, j];\n                }\n            }\n        }\n        return [];\n    }\n}\n",
          typescript: "class Solution {\n    twoSum(nums: number[], target: number): number[] {\n        for (let i = 0; i < nums.length; i++) {\n            for (let j = i + 1; j < nums.length; j++) {\n                if (nums[i] + nums[j] === target) {\n                    return [i, j];\n                }\n            }\n        }\n        return [];\n    }\n}\n",
        },
      },
      2: {
        tierNumber: 2,
        name: "Better Approach",
        complexityTag: "O(N log N) / O(N) Space",
        objective: "Reduce lookup time using sorting with two pointers or a two-pass hash table.",
        expectedPatterns: ["sort", "left", "right", "dict", "Map", "{}", "unordered_map"],
        socraticHints: [
          "If you sort the array, remember that the original indices will be scrambled unless you store (val, index) tuples.",
          "Alternatively, what if you make an initial pass to map values to their indices?",
        ],
        interviewerPraise:
          "Well done! You've significantly reduced the search time by utilizing auxiliary structure.",
        nextPrompt:
          "Can we achieve the theoretical optimal bound of O(N) time in a single pass without any sorting overhead?",
        testCases: [
          { input: [[2, 7, 11, 15], 9], expected: [0, 1], description: "Basic positive pair" },
          { input: [[3, 2, 4], 6], expected: [1, 2], description: "Non-adjacent pair" },
        ],
        starterCode: {
          python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    twoSum(nums, target) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    twoSum(nums: number[], target: number): number[] {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, n in enumerate(nums):\n            seen[n] = i\n        for i, n in enumerate(nums):\n            comp = target - n\n            if comp in seen and seen[comp] != i:\n                return [i, seen[comp]]\n        return []\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> seen;\n        for (int i = 0; i < nums.size(); i++) {\n            seen[nums[i]] = i;\n        }\n        for (int i = 0; i < nums.size(); i++) {\n            int comp = target - nums[i];\n            if (seen.count(comp) && seen[comp] != i) {\n                return {i, seen[comp]};\n            }\n        }\n        return {};\n    }\n};\n",
          javascript: "class Solution {\n    twoSum(nums, target) {\n        const map = new Map();\n        for (let i = 0; i < nums.length; i++) {\n            map.set(nums[i], i);\n        }\n        for (let i = 0; i < nums.length; i++) {\n            const comp = target - nums[i];\n            if (map.has(comp) && map.get(comp) !== i) {\n                return [i, map.get(comp)];\n            }\n        }\n        return [];\n    }\n}\n",
          typescript: "class Solution {\n    twoSum(nums: number[], target: number): number[] {\n        const map = new Map<number, number>();\n        for (let i = 0; i < nums.length; i++) {\n            map.set(nums[i], i);\n        }\n        for (let i = 0; i < nums.length; i++) {\n            const comp = target - nums[i];\n            if (map.has(comp) && map.get(comp) !== i) {\n                return [i, map.get(comp)!];\n            }\n        }\n        return [];\n    }\n}\n",
        },
      },
      3: {
        tierNumber: 3,
        name: "Optimal Solution",
        complexityTag: "O(N) Time, O(N) Space",
        objective: "One-pass hash table: lookup complement and store the current element in a single iteration.",
        expectedPatterns: ["target -", "seen", "map.has", "map.set", "in seen", "unordered_map"],
        socraticHints: [
          "Check whether the complement is already in the map before inserting the current value. That prevents using the same element twice.",
        ],
        interviewerPraise:
          "Outstanding! You've implemented the optimal one-pass solution with linear time complexity and constant-time dictionary lookups.",
        nextPrompt:
          "That concludes all three solution tiers. Let's analyze your delivery, speech confidence, and code integrity.",
        testCases: [
          { input: [[2, 7, 11, 15], 9], expected: [0, 1], description: "Basic positive pair" },
          { input: [[3, 2, 4], 6], expected: [1, 2], description: "Non-adjacent pair" },
          { input: [[3, 3], 6], expected: [0, 1], description: "Duplicate elements" },
        ],
        starterCode: {
          python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    twoSum(nums, target) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    twoSum(nums: number[], target: number): number[] {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        lookup = {}\n        for i, num in enumerate(nums):\n            diff = target - num\n            if diff in lookup:\n                return [lookup[diff], i]\n            lookup[num] = i\n        return []\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> lookup;\n        for (int i = 0; i < nums.size(); i++) {\n            int diff = target - nums[i];\n            if (lookup.count(diff)) {\n                return {lookup[diff], i};\n            }\n            lookup[nums[i]] = i;\n        }\n        return {};\n    }\n};\n",
          javascript: "class Solution {\n    twoSum(nums, target) {\n        const map = new Map();\n        for (let i = 0; i < nums.length; i++) {\n            const diff = target - nums[i];\n            if (map.has(diff)) {\n                return [map.get(diff), i];\n            }\n            map.set(nums[i], i);\n        }\n        return [];\n    }\n}\n",
          typescript: "class Solution {\n    twoSum(nums: number[], target: number): number[] {\n        const map = new Map<number, number>();\n        for (let i = 0; i < nums.length; i++) {\n            const diff = target - nums[i];\n            if (map.has(diff)) {\n                return [map.get(diff)!, i];\n            }\n            map.set(nums[i], i);\n        }\n        return [];\n    }\n}\n",
        },
      },
    },
  },
  {
    id: "container-with-most-water",
    slug: "container-with-most-water",
    title: "Container With Most Water",
    difficulty: "Medium",
    category: "Two Pointers & Greedy",
    description:
      "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.",
    constraints: [
      "n == height.length",
      "2 <= n <= 10^5",
      "0 <= height[i] <= 10^4",
    ],
    examples: [
      {
        input: "height = [1, 8, 6, 2, 5, 4, 8, 3, 7]",
        output: "49",
        explanation: "The max area is between index 1 (height 8) and index 8 (height 7), width = 7, min(8, 7) = 7. Area = 7 * 7 = 49.",
      },
      {
        input: "height = [1, 1]",
        output: "1",
        explanation: "Width = 1, height = 1. Area = 1.",
      },
    ],
    functionSignature: {
      name: "maxArea",
      python: "def maxArea(height: list[int]) -> int:",
      cpp: "int maxArea(vector<int>& height)",
      javascript: "maxArea(height)",
      typescript: "maxArea(height: number[]): number",
    },
    welcomeSpeech:
      "Hello. For this interview challenge, we are evaluating the Container With Most Water problem. Let's begin by formulating a naive brute force solution that checks all vertical line combinations.",
    tiers: {
      1: {
        tierNumber: 1,
        name: "Brute Force",
        complexityTag: "O(N²)",
        objective: "Examine every pair of lines (i, j) and compute width * min(h[i], h[j]).",
        expectedPatterns: ["for i", "for j", "min(", "max("],
        socraticHints: [
          "Remember that water is bounded by the shorter line, so area = (j - i) * min(height[i], height[j]).",
        ],
        interviewerPraise:
          "Correct. You have verified all container boundaries using quadratic nested iteration.",
        nextPrompt:
          "Notice that as the pointers move inward, width decreases. How can we make a greedy decision to move only the pointer that has potential to increase area?",
        testCases: [
          { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49, description: "Classic test case" },
          { input: [[1, 1]], expected: 1, description: "Minimal array length 2" },
        ],
        starterCode: {
          python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    maxArea(height) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    maxArea(height: number[]): number {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        max_water = 0\n        n = len(height)\n        for i in range(n):\n            for j in range(i + 1, n):\n                area = (j - i) * min(height[i], height[j])\n                max_water = max(max_water, area)\n        return max_water\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int maxWater = 0;\n        int n = height.size();\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                int area = (j - i) * min(height[i], height[j]);\n                maxWater = max(maxWater, area);\n            }\n        }\n        return maxWater;\n    }\n};\n",
          javascript: "class Solution {\n    maxArea(height) {\n        let maxWater = 0;\n        for (let i = 0; i < height.length; i++) {\n            for (let j = i + 1; j < height.length; j++) {\n                const area = (j - i) * Math.min(height[i], height[j]);\n                maxWater = Math.max(maxWater, area);\n            }\n        }\n        return maxWater;\n    }\n}\n",
          typescript: "class Solution {\n    maxArea(height: number[]): number {\n        let maxWater = 0;\n        for (let i = 0; i < height.length; i++) {\n            for (let j = i + 1; j < height.length; j++) {\n                const area = (j - i) * Math.min(height[i], height[j]);\n                maxWater = Math.max(maxWater, area);\n            }\n        }\n        return maxWater;\n    }\n}\n",
        },
      },
      2: {
        tierNumber: 2,
        name: "Better Approach",
        complexityTag: "O(N) Early Pruning",
        objective: "Prune redundant inner loops when the current line cannot exceed existing maximum water.",
        expectedPatterns: ["continue", "break", "left", "right"],
        socraticHints: [
          "If the current left line height * max possible width is less than max_water, you can skip further checks.",
        ],
        interviewerPraise:
          "Good heuristic pruning. You cut down wasted evaluations on obviously short heights.",
        nextPrompt:
          "Can we guarantee a strictly linear O(N) runtime by using two pointers starting from the outer extremes?",
        testCases: [
          { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49, description: "Classic test case" },
          { input: [[4, 3, 2, 1, 4]], expected: 16, description: "Equal ends" },
        ],
        starterCode: {
          python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    maxArea(height) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    maxArea(height: number[]): number {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        max_water = 0\n        n = len(height)\n        for i in range(n):\n            if height[i] * (n - 1 - i) <= max_water:\n                continue\n            for j in range(i + 1, n):\n                max_water = max(max_water, (j - i) * min(height[i], height[j]))\n        return max_water\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int maxWater = 0;\n        int n = height.size();\n        for (int i = 0; i < n; i++) {\n            if (height[i] * (n - 1 - i) <= maxWater) continue;\n            for (int j = i + 1; j < n; j++) {\n                maxWater = max(maxWater, (j - i) * min(height[i], height[j]));\n            }\n        }\n        return maxWater;\n    }\n};\n",
          javascript: "class Solution {\n    maxArea(height) {\n        let maxWater = 0;\n        const n = height.length;\n        for (let i = 0; i < n; i++) {\n            if (height[i] * (n - 1 - i) <= maxWater) continue;\n            for (let j = i + 1; j < n; j++) {\n                maxWater = Math.max(maxWater, (j - i) * Math.min(height[i], height[j]));\n            }\n        }\n        return maxWater;\n    }\n}\n",
          typescript: "class Solution {\n    maxArea(height: number[]): number {\n        let maxWater = 0;\n        const n = height.length;\n        for (let i = 0; i < n; i++) {\n            if (height[i] * (n - 1 - i) <= maxWater) continue;\n            for (let j = i + 1; j < n; j++) {\n                maxWater = Math.max(maxWater, (j - i) * Math.min(height[i], height[j]));\n            }\n        }\n        return maxWater;\n    }\n}\n",
        },
      },
      3: {
        tierNumber: 3,
        name: "Optimal Solution",
        complexityTag: "O(N) Time, O(1) Space",
        objective: "Converging two pointers: increment left if height[left] < height[right], else decrement right.",
        expectedPatterns: ["left < right", "left += 1", "right -= 1", "left++", "right--"],
        socraticHints: [
          "At each step, the shorter wall acts as the bottleneck. Advancing the taller wall can never yield more area, so always advance the shorter wall.",
        ],
        interviewerPraise:
          "Excellent! The two-pointer greedy convergence proves optimal in O(N) time with O(1) extra space.",
        nextPrompt:
          "All three tiers satisfied! Preparing final candidate assessment scorecard.",
        testCases: [
          { input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]], expected: 49, description: "Classic test case" },
          { input: [[1, 1]], expected: 1, description: "Minimal array length 2" },
          { input: [[4, 3, 2, 1, 4]], expected: 16, description: "Equal ends" },
        ],
        starterCode: {
          python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    maxArea(height) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    maxArea(height: number[]): number {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def maxArea(self, height: list[int]) -> int:\n        left, right = 0, len(height) - 1\n        max_water = 0\n        while left < right:\n            w = right - left\n            h = min(height[left], height[right])\n            max_water = max(max_water, w * h)\n            if height[left] < height[right]:\n                left += 1\n            else:\n                right -= 1\n        return max_water\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        int left = 0, right = height.size() - 1;\n        int maxWater = 0;\n        while (left < right) {\n            int w = right - left;\n            int h = min(height[left], height[right]);\n            maxWater = max(maxWater, w * h);\n            if (height[left] < height[right]) {\n                left++;\n            } else {\n                right--;\n            }\n        }\n        return maxWater;\n    }\n};\n",
          javascript: "class Solution {\n    maxArea(height) {\n        let left = 0, right = height.length - 1;\n        let maxWater = 0;\n        while (left < right) {\n            const area = (right - left) * Math.min(height[left], height[right]);\n            if (area > maxWater) maxWater = area;\n            if (height[left] < height[right]) {\n                left++;\n            } else {\n                right--;\n            }\n        }\n        return maxWater;\n    }\n}\n",
          typescript: "class Solution {\n    maxArea(height: number[]): number {\n        let left = 0, right = height.length - 1;\n        let maxWater = 0;\n        while (left < right) {\n            const area = (right - left) * Math.min(height[left], height[right]);\n            if (area > maxWater) maxWater = area;\n            if (height[left] < height[right]) {\n                left++;\n            } else {\n                right--;\n            }\n        }\n        return maxWater;\n    }\n}\n",
        },
      },
    },
  },
  {
    id: "best-time-to-buy-and-sell-stock",
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    category: "Dynamic Programming & Greedy",
    description:
      "You are given an array prices where prices[i] is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve. If you cannot achieve any profit, return 0.",
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4",
    ],
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
    functionSignature: {
      name: "maxProfit",
      python: "def maxProfit(prices: list[int]) -> int:",
      cpp: "int maxProfit(vector<int>& prices)",
      javascript: "maxProfit(prices)",
      typescript: "maxProfit(prices: number[]): number",
    },
    welcomeSpeech:
      "Welcome. We will now tackle the Best Time to Buy and Sell Stock problem. Let's start with a clear brute force implementation checking all valid buy and sell days.",
    tiers: {
      1: {
        tierNumber: 1,
        name: "Brute Force",
        complexityTag: "O(N²)",
        objective: "Compare every buy day i with subsequent sell days j > i.",
        expectedPatterns: ["for i", "for j", "prices[j] - prices[i]"],
        socraticHints: [
          "Ensure you only sell on days strictly greater than the buy day (j > i).",
          "If the stock strictly decreases, return 0 instead of a negative number.",
        ],
        interviewerPraise:
          "Good. Your brute force logic correctly identifies the maximum difference between any two chronologically ordered days.",
        nextPrompt:
          "Can we avoid re-checking earlier days by maintaining an auxiliary array of min prices up to day i?",
        testCases: [
          { input: [[7, 1, 5, 3, 6, 4]], expected: 5, description: "Standard fluctuating prices" },
          { input: [[7, 6, 4, 3, 1]], expected: 0, description: "Monotonically decreasing" },
        ],
        starterCode: {
          python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    maxProfit(prices) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    maxProfit(prices: number[]): number {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        max_profit = 0\n        n = len(prices)\n        for i in range(n):\n            for j in range(i + 1, n):\n                max_profit = max(max_profit, prices[j] - prices[i])\n        return max_profit\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        int maxProfit = 0;\n        int n = prices.size();\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                maxProfit = max(maxProfit, prices[j] - prices[i]);\n            }\n        }\n        return maxProfit;\n    }\n};\n",
          javascript: "class Solution {\n    maxProfit(prices) {\n        let maxProfit = 0;\n        for (let i = 0; i < prices.length; i++) {\n            for (let j = i + 1; j < prices.length; j++) {\n                maxProfit = Math.max(maxProfit, prices[j] - prices[i]);\n            }\n        }\n        return maxProfit;\n    }\n}\n",
          typescript: "class Solution {\n    maxProfit(prices: number[]): number {\n        let maxProfit = 0;\n        for (let i = 0; i < prices.length; i++) {\n            for (let j = i + 1; j < prices.length; j++) {\n                maxProfit = Math.max(maxProfit, prices[j] - prices[i]);\n            }\n        }\n        return maxProfit;\n    }\n}\n",
        },
      },
      2: {
        tierNumber: 2,
        name: "Better Approach",
        complexityTag: "O(N) Time, O(N) Space",
        objective: "Use an auxiliary prefix minimum array to precompute the lowest buy price for any day.",
        expectedPatterns: ["min_so_far", "prefix", "list", "Array", "minPrices"],
        socraticHints: [
          "Store the minimum price seen up to day i in an array, then calculate profit as prices[i] - min_price[i].",
        ],
        interviewerPraise:
          "Nice optimization! You transformed the O(N squared) search into linear time with spatial precomputation.",
        nextPrompt:
          "Do we really need an entire array to track the minimum price, or can we compress the space to O(1)?",
        testCases: [
          { input: [[7, 1, 5, 3, 6, 4]], expected: 5, description: "Standard fluctuating prices" },
          { input: [[7, 6, 4, 3, 1]], expected: 0, description: "Monotonically decreasing" },
        ],
        starterCode: {
          python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    maxProfit(prices) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    maxProfit(prices: number[]): number {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        if not prices: return 0\n        min_prices = [prices[0]] * len(prices)\n        for i in range(1, len(prices)):\n            min_prices[i] = min(min_prices[i - 1], prices[i])\n        max_profit = 0\n        for i in range(len(prices)):\n            max_profit = max(max_profit, prices[i] - min_prices[i])\n        return max_profit\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        if (prices.empty()) return 0;\n        int n = prices.size();\n        vector<int> minPrices(n, prices[0]);\n        for (int i = 1; i < n; i++) {\n            minPrices[i] = min(minPrices[i - 1], prices[i]);\n        }\n        int maxP = 0;\n        for (int i = 0; i < n; i++) {\n            maxP = max(maxP, prices[i] - minPrices[i]);\n        }\n        return maxP;\n    }\n};\n",
          javascript: "class Solution {\n    maxProfit(prices) {\n        if (prices.length === 0) return 0;\n        const minPrices = new Array(prices.length);\n        minPrices[0] = prices[0];\n        for (let i = 1; i < prices.length; i++) {\n            minPrices[i] = Math.min(minPrices[i - 1], prices[i]);\n        }\n        let maxP = 0;\n        for (let i = 0; i < prices.length; i++) {\n            maxP = Math.max(maxP, prices[i] - minPrices[i]);\n        }\n        return maxP;\n    }\n}\n",
          typescript: "class Solution {\n    maxProfit(prices: number[]): number {\n        if (prices.length === 0) return 0;\n        const minPrices = new Array(prices.length);\n        minPrices[0] = prices[0];\n        for (let i = 1; i < prices.length; i++) {\n            minPrices[i] = Math.min(minPrices[i - 1], prices[i]);\n        }\n        let maxP = 0;\n        for (let i = 0; i < prices.length; i++) {\n            maxP = Math.max(maxP, prices[i] - minPrices[i]);\n        }\n        return maxP;\n    }\n}\n",
        },
      },
      3: {
        tierNumber: 3,
        name: "Optimal Solution",
        complexityTag: "O(N) Time, O(1) Space",
        objective: "Single-pass Kadane-like scan maintaining min_price and max_profit variables.",
        expectedPatterns: ["min_price", "minPrice", "max_profit", "maxProfit"],
        socraticHints: [
          "In a single loop, update min_price = min(min_price, price) and max_profit = max(max_profit, price - min_price).",
        ],
        interviewerPraise:
          "Terrific work! That is the definitive O(N) time and O(1) auxiliary space optimal solution.",
        nextPrompt:
          "All three tiers satisfied! Generating your performance analysis and confidence ratings.",
        testCases: [
          { input: [[7, 1, 5, 3, 6, 4]], expected: 5, description: "Standard fluctuating prices" },
          { input: [[7, 6, 4, 3, 1]], expected: 0, description: "Monotonically decreasing" },
          { input: [[2, 4, 1]], expected: 2, description: "Valley after peak" },
        ],
        starterCode: {
          python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    maxProfit(prices) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    maxProfit(prices: number[]): number {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def maxProfit(self, prices: list[int]) -> int:\n        min_price = float('inf')\n        max_profit = 0\n        for p in prices:\n            if p < min_price:\n                min_price = p\n            elif p - min_price > max_profit:\n                max_profit = p - min_price\n        return max_profit\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        int minPrice = 1e9;\n        int maxProfit = 0;\n        for (int p : prices) {\n            if (p < minPrice) {\n                minPrice = p;\n            } else if (p - minPrice > maxProfit) {\n                maxProfit = p - minPrice;\n            }\n        }\n        return maxProfit;\n    }\n};\n",
          javascript: "class Solution {\n    maxProfit(prices) {\n        let minPrice = Infinity;\n        let maxProfit = 0;\n        for (let i = 0; i < prices.length; i++) {\n            if (prices[i] < minPrice) {\n                minPrice = prices[i];\n            } else if (prices[i] - minPrice > maxProfit) {\n                maxProfit = prices[i] - minPrice;\n            }\n        }\n        return maxProfit;\n    }\n}\n",
          typescript: "class Solution {\n    maxProfit(prices: number[]): number {\n        let minPrice = Infinity;\n        let maxProfit = 0;\n        for (let i = 0; i < prices.length; i++) {\n            if (prices[i] < minPrice) {\n                minPrice = prices[i];\n            } else if (prices[i] - minPrice > maxProfit) {\n                maxProfit = prices[i] - minPrice;\n            }\n        }\n        return maxProfit;\n    }\n}\n",
        },
      },
    },
  },
  {
    id: "daily-temperatures",
    slug: "daily-temperatures",
    title: "Daily Temperatures",
    difficulty: "Medium",
    category: "Monotonic Stack",
    description:
      "Given an array of integers temperatures represents the daily temperatures, return an array answer such that answer[i] is the number of days you have to wait after the ith day to get a warmer temperature. If there is no future day for which this is possible, keep answer[i] == 0 instead.",
    constraints: [
      "1 <= temperatures.length <= 10^5",
      "30 <= temperatures[i] <= 100",
    ],
    examples: [
      {
        input: "temperatures = [73, 74, 75, 71, 69, 72, 76, 73]",
        output: "[1, 1, 4, 2, 1, 1, 0, 0]",
        explanation: "Day 0 (73) waits 1 day to 74. Day 2 (75) waits 4 days to 76. Day 6 (76) has no warmer day, answer is 0.",
      },
      {
        input: "temperatures = [30, 40, 50, 60]",
        output: "[1, 1, 1, 0]",
      },
    ],
    functionSignature: {
      name: "dailyTemperatures",
      python: "def dailyTemperatures(temperatures: list[int]) -> list[int]:",
      cpp: "vector<int> dailyTemperatures(vector<int>& temperatures)",
      javascript: "dailyTemperatures(temperatures)",
      typescript: "dailyTemperatures(temperatures: number[]): number[]",
    },
    welcomeSpeech:
      "Hello. We are tackling the Daily Temperatures problem. Candidates often find sightlines and waiting distances tricky. Let's start with a straightforward brute force loop.",
    tiers: {
      1: {
        tierNumber: 1,
        name: "Brute Force",
        complexityTag: "O(N²)",
        objective: "For each day i, scan forward until you find a temperature strictly higher than temperatures[i].",
        expectedPatterns: ["for i", "for j", "temperatures[j] > temperatures[i]"],
        socraticHints: [
          "When you find a warmer temperature at index j, record distance j - i and break out of the inner loop.",
        ],
        interviewerPraise:
          "Solid brute force foundation. The quadratic scan works correctly for smaller arrays.",
        nextPrompt:
          "Can we avoid repetitive forward scanning by thinking about an invariant? How can a stack help us remember unresolved cooler days?",
        testCases: [
          { input: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0], description: "Standard sequence" },
          { input: [[30, 40, 50, 60]], expected: [1, 1, 1, 0], description: "Strictly increasing" },
        ],
        starterCode: {
          python: "class Solution:\n    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <stack>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& temperatures) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    dailyTemperatures(temperatures) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    dailyTemperatures(temperatures: number[]): number[] {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:\n        n = len(temperatures)\n        ans = [0] * n\n        for i in range(n):\n            for j in range(i + 1, n):\n                if temperatures[j] > temperatures[i]:\n                    ans[i] = j - i\n                    break\n        return ans\n",
          cpp: "#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& temperatures) {\n        int n = temperatures.size();\n        vector<int> ans(n, 0);\n        for (int i = 0; i < n; i++) {\n            for (int j = i + 1; j < n; j++) {\n                if (temperatures[j] > temperatures[i]) {\n                    ans[i] = j - i;\n                    break;\n                }\n            }\n        }\n        return ans;\n    }\n};\n",
          javascript: "class Solution {\n    dailyTemperatures(temperatures) {\n        const n = temperatures.length;\n        const ans = new Array(n).fill(0);\n        for (let i = 0; i < n; i++) {\n            for (let j = i + 1; j < n; j++) {\n                if (temperatures[j] > temperatures[i]) {\n                    ans[i] = j - i;\n                    break;\n                }\n            }\n        }\n        return ans;\n    }\n}\n",
          typescript: "class Solution {\n    dailyTemperatures(temperatures: number[]): number[] {\n        const n = temperatures.length;\n        const ans = new Array(n).fill(0);\n        for (let i = 0; i < n; i++) {\n            for (let j = i + 1; j < n; j++) {\n                if (temperatures[j] > temperatures[i]) {\n                    ans[i] = j - i;\n                    break;\n                }\n            }\n        }\n        return ans;\n    }\n}\n",
        },
      },
      2: {
        tierNumber: 2,
        name: "Better Approach",
        complexityTag: "O(N · K) Bounded Scan",
        objective: "Scan backward utilizing already resolved answer jump pointers, or temperature buckets.",
        expectedPatterns: ["range(len", "ans[", "j + ans[j]"],
        socraticHints: [
          "If day j is cooler, you can jump directly by j + ans[j] instead of checking every subsequent index.",
        ],
        interviewerPraise:
          "Good heuristic jump optimization! You reduced redundant comparisons.",
        nextPrompt:
          "Now let's implement the canonical optimal approach using a Monotonic Decreasing Stack in linear O(N) time.",
        testCases: [
          { input: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0], description: "Standard sequence" },
          { input: [[30, 40, 50, 60]], expected: [1, 1, 1, 0], description: "Strictly increasing" },
        ],
        starterCode: {
          python: "class Solution:\n    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <stack>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& temperatures) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    dailyTemperatures(temperatures) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    dailyTemperatures(temperatures: number[]): number[] {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:\n        n = len(temperatures)\n        ans = [0] * n\n        for i in range(n - 2, -1, -1):\n            j = i + 1\n            while j < n and temperatures[j] <= temperatures[i]:\n                if ans[j] == 0:\n                    j = n\n                else:\n                    j += ans[j]\n            if j < n:\n                ans[i] = j - i\n        return ans\n",
          cpp: "#include <iostream>\n#include <vector>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& temperatures) {\n        int n = temperatures.size();\n        vector<int> ans(n, 0);\n        for (int i = n - 2; i >= 0; i--) {\n            int j = i + 1;\n            while (j < n && temperatures[j] <= temperatures[i]) {\n                if (ans[j] == 0) j = n;\n                else j += ans[j];\n            }\n            if (j < n) ans[i] = j - i;\n        }\n        return ans;\n    }\n};\n",
          javascript: "class Solution {\n    dailyTemperatures(temperatures) {\n        const n = temperatures.length;\n        const ans = new Array(n).fill(0);\n        for (let i = n - 2; i >= 0; i--) {\n            let j = i + 1;\n            while (j < n && temperatures[j] <= temperatures[i]) {\n                if (ans[j] === 0) j = n;\n                else j += ans[j];\n            }\n            if (j < n) ans[i] = j - i;\n        }\n        return ans;\n    }\n}\n",
          typescript: "class Solution {\n    dailyTemperatures(temperatures: number[]): number[] {\n        const n = temperatures.length;\n        const ans = new Array(n).fill(0);\n        for (let i = n - 2; i >= 0; i--) {\n            let j = i + 1;\n            while (j < n && temperatures[j] <= temperatures[i]) {\n                if (ans[j] === 0) j = n;\n                else j += ans[j];\n            }\n            if (j < n) ans[i] = j - i;\n        }\n        return ans;\n    }\n}\n",
        },
      },
      3: {
        tierNumber: 3,
        name: "Optimal Solution",
        complexityTag: "O(N) Time, O(N) Space",
        objective: "Maintain a monotonic decreasing stack of indices. Pop and resolve when current temp > stack top.",
        expectedPatterns: ["stack", "pop", "temperatures[stack[-1]]", "stack.length"],
        socraticHints: [
          "Keep indices on the stack. When the incoming temperature is warmer than temperatures[stack.top()], pop that index and record wait distance = current_index - prev_index.",
        ],
        interviewerPraise:
          "Brilliant! The monotonic stack ensures every index is pushed and popped at most once, guaranteeing linear time.",
        nextPrompt:
          "Interview problem complete! Preparing candidate metrics and proctoring summary.",
        testCases: [
          { input: [[73, 74, 75, 71, 69, 72, 76, 73]], expected: [1, 1, 4, 2, 1, 1, 0, 0], description: "Standard sequence" },
          { input: [[30, 40, 50, 60]], expected: [1, 1, 1, 0], description: "Strictly increasing" },
          { input: [[30, 60, 90]], expected: [1, 1, 0], description: "Short sequence" },
        ],
        starterCode: {
          python: "class Solution:\n    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:\n        pass\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <stack>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& temperatures) {\n        \n    }\n};\n",
          javascript: "class Solution {\n    dailyTemperatures(temperatures) {\n        \n    }\n}\n",
          typescript: "class Solution {\n    dailyTemperatures(temperatures: number[]): number[] {\n        \n    }\n}\n",
        },
        referenceSolution: {
          python: "class Solution:\n    def dailyTemperatures(self, temperatures: list[int]) -> list[int]:\n        ans = [0] * len(temperatures)\n        stack = []\n        for i, t in enumerate(temperatures):\n            while stack and t > temperatures[stack[-1]]:\n                prev_i = stack.pop()\n                ans[prev_i] = i - prev_i\n            stack.append(i)\n        return ans\n",
          cpp: "#include <iostream>\n#include <vector>\n#include <stack>\n\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> dailyTemperatures(vector<int>& temperatures) {\n        int n = temperatures.size();\n        vector<int> ans(n, 0);\n        stack<int> st;\n        for (int i = 0; i < n; i++) {\n            while (!st.empty() && temperatures[i] > temperatures[st.top()]) {\n                int prev = st.top();\n                st.pop();\n                ans[prev] = i - prev;\n            }\n            st.push(i);\n        }\n        return ans;\n    }\n};\n",
          javascript: "class Solution {\n    dailyTemperatures(temperatures) {\n        const n = temperatures.length;\n        const ans = new Array(n).fill(0);\n        const stack = [];\n        for (let i = 0; i < temperatures.length; i++) {\n            while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {\n                const prev = stack.pop();\n                ans[prev] = i - prev;\n            }\n            stack.push(i);\n        }\n        return ans;\n    }\n}\n",
          typescript: "class Solution {\n    dailyTemperatures(temperatures: number[]): number[] {\n        const n = temperatures.length;\n        const ans = new Array(n).fill(0);\n        const stack: number[] = [];\n        for (let i = 0; i < temperatures.length; i++) {\n            while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {\n                const prev = stack.pop()!;\n                ans[prev] = i - prev;\n            }\n            stack.push(i);\n        }\n        return ans;\n    }\n}\n",
        },
      },
    },
  },
];

export function getRandomInterviewProblem(excludeId?: string): LiveInterviewProblem {
  const eligible = excludeId
    ? LIVE_INTERVIEW_PROBLEMS.filter((p) => p.id !== excludeId)
    : LIVE_INTERVIEW_PROBLEMS;
  const pool = eligible.length > 0 ? eligible : LIVE_INTERVIEW_PROBLEMS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return (pool[randomIndex] ?? LIVE_INTERVIEW_PROBLEMS[0])!;
}

export function generateLocalSocraticAnswer(
  lowerQ: string,
  problem: LiveInterviewProblem,
  currentTier: 1 | 2 | 3,
): string {
  const tier = problem.tiers[currentTier];

  // Refuse to give code or direct answers
  if (
    /give me the code|write the code|show me the code|give me solution|give me answer|write it for me|implement it for me|code for/i.test(
      lowerQ,
    )
  ) {
    return "As your interviewer, I want to see how you structure the thought process yourself. Write the implementation step by step, and walk me through your logic.";
  }

  // Asking if input is sorted
  if (/sorted|order|ascending|descending/i.test(lowerQ)) {
    if (problem.id === "two-sum") {
      return "No, the array is unsorted. You should assume the input integers appear in arbitrary unsorted order.";
    }
    if (problem.id === "container-with-most-water") {
      return "The heights are not sorted. They represent vertical lines positioned in order along the x-axis from left to right.";
    }
    if (problem.id === "best-time-to-buy-and-sell-stock") {
      return "Prices are given in chronological daily order, not sorted by price value.";
    }
    if (problem.id === "daily-temperatures") {
      return "Temperatures are given in chronological day order, not sorted.";
    }
    return "The input order is preserved as given in the problem statement.";
  }

  // Asking about negative values or 0
  if (/negative|zero|values below zero|can numbers be negative/i.test(lowerQ)) {
    if (problem.id === "two-sum") {
      return "Yes, elements in the array as well as the target can be negative, between -10^9 and 10^9.";
    }
    if (problem.id === "container-with-most-water") {
      return "Heights are non-negative, ranging from 0 to 10,000.";
    }
    if (problem.id === "best-time-to-buy-and-sell-stock") {
      return "Stock prices are non-negative integers.";
    }
    if (problem.id === "daily-temperatures") {
      return "Temperatures are positive integers between 30 and 100.";
    }
    return "Please check the problem constraints listed on the left panel for value bounds.";
  }

  // Asking about duplicates
  if (/duplicate|duplicates|same number|repeated/i.test(lowerQ)) {
    if (problem.id === "two-sum") {
      return "The array can contain duplicate values, but the problem guarantees there is exactly one unique valid solution pair.";
    }
    return "Duplicate values may occur in the input. Ensure your logic handles identical values properly.";
  }

  // Asking about space or memory limits
  if (/space|memory|extra memory|auxiliary/i.test(lowerQ)) {
    return `For Tier ${currentTier}, our target complexity is ${tier.complexityTag}. Notice the trade-off between runtime and auxiliary space.`;
  }

  // Asking about time complexity / big O
  if (/time complexity|runtime|target complexity|big o|o\(n\)|o\(n\^2\)/i.test(lowerQ)) {
    return `For Tier ${currentTier} (${tier.name}), the target complexity is ${tier.complexityTag}. Aim for ${tier.objective}`;
  }

  // Asking about return value / output format
  if (/what should i return|what to return|return value|indices or values|output format|return format/i.test(lowerQ)) {
    if (problem.id === "two-sum") {
      return "You should return the indices of the two elements as a list or array [i, j], not the values themselves.";
    }
    if (problem.id === "container-with-most-water") {
      return "Return a single integer representing the maximum volume or area of water contained.";
    }
    if (problem.id === "best-time-to-buy-and-sell-stock") {
      return "Return the maximum profit as an integer. If no profitable trade is possible, return 0.";
    }
    if (problem.id === "daily-temperatures") {
      return "Return an array of integers where answer[i] is the number of days you have to wait for a warmer day, or 0 if none.";
    }
    return "Please check the problem examples and description for the exact expected return type.";
  }

  // Asking about edge cases / empty arrays / 0 bounds
  if (/edge case|edge cases|empty array|empty input|null|zero length|size zero|single element/i.test(lowerQ)) {
    if (problem.id === "two-sum") {
      return "The constraints guarantee at least 2 elements and exactly one valid solution pair exists, so empty arrays won't occur.";
    }
    if (problem.id === "container-with-most-water") {
      return "The array length is guaranteed to be at least 2 lines. A single line cannot form a container.";
    }
    if (problem.id === "best-time-to-buy-and-sell-stock") {
      return "If prices array has only 1 day or prices strictly decrease, maximum profit is 0.";
    }
    if (problem.id === "daily-temperatures") {
      return "If there is no warmer day in the future, return 0 for that position.";
    }
    return "Always check if minimum input size is met and whether strictly monotonic sequences require default return values.";
  }

  // Asking for a hint or stuck
  if (/hint|stuck|clue|help|where do i start|how to start/i.test(lowerQ)) {
    return tier.socraticHints[0] || `Consider the target complexity: ${tier.complexityTag}. What work is redundant?`;
  }

  // Asking about problem explanation / what is the question asking
  if (/explain the problem|explain problem|what does this mean|what is the question|understand the problem/i.test(lowerQ)) {
    return `In ${problem.title}, our goal is: ${problem.description.split("\n")[0]} For Tier ${currentTier}, your objective is to ${tier.objective}`;
  }

  // Asking about optimization or how to improve
  if (/how to optimize|how to improve|how to make it faster|bottleneck|next tier/i.test(lowerQ)) {
    return `To improve from this approach: ${tier.nextPrompt}`;
  }

  // Asking about sorting
  if (/can i sort|should i sort|sort the array|sorting/i.test(lowerQ)) {
    if (problem.id === "two-sum") {
      return "Sorting takes O(N log N) time, but be careful: sorting changes element positions unless you store the original indices.";
    }
    if (problem.id === "container-with-most-water") {
      return "The lines are positioned along the x-axis by their index. Sorting heights would scramble spatial width, so preserve original order.";
    }
    if (problem.id === "best-time-to-buy-and-sell-stock") {
      return "Prices are chronologically ordered by day. Sorting would break the chronological sequence since you can only sell after buying.";
    }
    return "Sorting may disrupt the original positional ordering required by the problem. Consider whether an auxiliary lookup or two pointers is better.";
  }

  // Asking about hash map / dictionary
  if (/hash map|hashmap|dictionary|hash table|dict/i.test(lowerQ)) {
    if (currentTier === 1) {
      return "A hash map is a great optimization, but for Tier 1 let's write the direct brute force nested scan first to establish baseline correctness.";
    }
    return "A hash map is an excellent direction! For each element, what complement value are you looking up, and what should you store as the value?";
  }

  // Asking about two pointers
  if (/two pointer|two pointers|pointers/i.test(lowerQ)) {
    if (problem.id === "two-sum") {
      return "Two pointers works well when the array is sorted. If you sort it first, what would the time complexity be?";
    }
    if (problem.id === "container-with-most-water") {
      return "Two pointers is the canonical approach! What condition dictates whether you advance the left pointer or the right pointer?";
    }
    return "Two pointers can be very effective. How do your pointer movements guarantee that no optimal candidates are missed?";
  }

  // Asking about stack
  if (/stack|monotonic/i.test(lowerQ)) {
    if (problem.id === "daily-temperatures") {
      return "A monotonic stack is the optimal technique here. What invariant should you maintain in the stack: increasing or decreasing temperatures?";
    }
    return "A stack helps maintain a history of unresolved items. How would you maintain its invariant?";
  }

  // Asking about multiple solutions
  if (/multiple solutions|more than one answer|multiple answers/i.test(lowerQ)) {
    if (problem.id === "two-sum") {
      return "The problem statement explicitly guarantees that exactly one valid answer exists.";
    }
    return "Return any valid answer or the maximum value as defined in the problem specification.";
  }

  // General fallback
  return `Good question. For Tier ${currentTier}, ${tier.objective}. What data structure or loop condition helps you achieve that?`;
}

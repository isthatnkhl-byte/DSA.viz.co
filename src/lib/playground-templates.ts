import type { VizType } from "./problems";

export interface PlaygroundTemplate {
  id: string;
  title: string;
  category:
    | "Linear Data Structures"
    | "Non-linear Data Structures"
    | "Sorting Algorithms"
    | "Searching Algorithms"
    | "Divide and Conquer"
    | "Algorithmic Paradigms"
    | "Math & Number Theory"
    | "Grid & Matrix Geometry";
  subCategory?: string;
  type: VizType;
  description: string;
  defaultInput: number[];
  target?: number;
  matrixInput?: number[][];
  pseudocode: string;
}

export const PLAYGROUND_CATEGORIES = [
  "All",
  "Linear Data Structures",
  "Non-linear Data Structures",
  "Sorting Algorithms",
  "Searching Algorithms",
  "Divide and Conquer",
  "Algorithmic Paradigms",
  "Math & Number Theory",
  "Grid & Matrix Geometry",
] as const;

export const PLAYGROUND_TEMPLATES: PlaygroundTemplate[] = [
  // ==========================================
  // 1. LINEAR DATA STRUCTURES
  // ==========================================
  {
    id: "two-pointers-sum",
    title: "Two Pointers (Array)",
    category: "Linear Data Structures",
    subCategory: "Array",
    type: "array",
    description: "Find pair of indices in a sorted array that sum up to the target value.",
    defaultInput: [1, 2, 4, 6, 8, 11, 15],
    target: 10,
    pseudocode: `left = 0, right = len(nums) - 1
while left < right:
    current_sum = nums[left] + nums[right]
    if current_sum == target:
        return [left, right]
    elif current_sum < target:
        left += 1
    else:
        right -= 1
return [-1, -1]`,
  },
  {
    id: "sliding-window-max",
    title: "Sliding Window (Array)",
    category: "Linear Data Structures",
    subCategory: "Array",
    type: "array",
    description: "Maintain a window of size k and compute the maximum sum subarray.",
    defaultInput: [2, 1, 5, 1, 3, 2, 4, 3],
    target: 3,
    pseudocode: `window_sum = 0, max_sum = 0
left = 0
for right in range(len(nums)):
    window_sum += nums[right]
    if right - left + 1 > k:
        window_sum -= nums[left]
        left += 1
    if right - left + 1 == k:
        max_sum = max(max_sum, window_sum)
return max_sum`,
  },
  {
    id: "kadanes-algorithm",
    title: "Kadane's Algorithm (Array)",
    category: "Linear Data Structures",
    subCategory: "Array",
    type: "array",
    description: "Find the maximum subarray sum in O(n) linear time.",
    defaultInput: [-2, 1, -3, 4, -1, 2, 1, -5, 4],
    pseudocode: `max_so_far = nums[0]
curr_max = nums[0]
for i in range(1, len(nums)):
    curr_max = max(nums[i], curr_max + nums[i])
    max_so_far = max(max_so_far, curr_max)
return max_so_far`,
  },
  {
    id: "grid-bfs",
    title: "2D Grid BFS (Matrix)",
    category: "Linear Data Structures",
    subCategory: "Matrix",
    type: "matrix",
    description: "Breadth-first search wavefront traversal across a 2D matrix grid.",
    defaultInput: [1, 1, 0, 0, 1, 1, 0, 1, 0],
    matrixInput: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    pseudocode: `queue = [(0, 0)]
visited = set([(0, 0)])
while queue:
    r, c = queue.pop(0)
    for dr, dc in [(1,0), (-1,0), (0,1), (0,-1)]:
        nr, nc = r + dr, c + dc
        if in_bounds(nr, nc) and grid[nr][nc] == 1 and (nr, nc) not in visited:
            visited.add((nr, nc))
            queue.append((nr, nc))`,
  },
  {
    id: "spiral-matrix",
    title: "Spiral Traversal (Matrix)",
    category: "Linear Data Structures",
    subCategory: "Matrix",
    type: "matrix",
    description: "Traverse a 2D matrix in spiral clockwise order.",
    defaultInput: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    matrixInput: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    pseudocode: `top, bottom = 0, rows - 1
left, right = 0, cols - 1
result = []
while top <= bottom and left <= right:
    for c in range(left, right + 1): result.append(matrix[top][c])
    top += 1
    for r in range(top, bottom + 1): result.append(matrix[r][right])
    right -= 1
    if top <= bottom:
        for c in range(right, left - 1, -1): result.append(matrix[bottom][c])
        bottom -= 1
    if left <= right:
        for r in range(bottom, top - 1, -1): result.append(matrix[r][left])
        left += 1
return result`,
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses (Stack)",
    category: "Linear Data Structures",
    subCategory: "Stack",
    type: "stack",
    description: "Validate matching brackets using a Last-In First-Out stack.",
    defaultInput: [1, 2, 2, 1], // encoded brackets: 1='(', 2='['
    pseudocode: `stack = []
bracket_map = {")": "(", "}": "{", "]": "["}
for ch in s:
    if ch in "({[":
        stack.append(ch)
    elif ch in bracket_map:
        if not stack or stack.pop() != bracket_map[ch]:
            return False
return len(stack) == 0`,
  },
  {
    id: "monotonic-stack",
    title: "Next Greater Element (Stack)",
    category: "Linear Data Structures",
    subCategory: "Stack",
    type: "stack",
    description:
      "Use a monotonic decreasing stack to find the next greater element for each index.",
    defaultInput: [2, 1, 2, 4, 3],
    pseudocode: `stack = []
result = [-1] * len(nums)
for i in range(len(nums)):
    while stack and nums[stack[-1]] < nums[i]:
        idx = stack.pop()
        result[idx] = nums[i]
    stack.append(i)
return result`,
  },
  {
    id: "queue-fifo",
    title: "Circular Queue (Queue)",
    category: "Linear Data Structures",
    subCategory: "Queue",
    type: "queue",
    description:
      "Simulate First-In First-Out (FIFO) queue buffering with enqueue and dequeue operations.",
    defaultInput: [5, 10, 15, 20, 25],
    pseudocode: `queue = []
for item in input_stream:
    queue.append(item)  # Enqueue
    if len(queue) > capacity:
        served = queue.pop(0)  # Dequeue
return queue`,
  },
  {
    id: "linkedlist-reverse",
    title: "Linked List Reversal",
    category: "Linear Data Structures",
    subCategory: "Linked List",
    type: "linkedlist",
    description: "Reverse a singly linked list in-place using three pointers (prev, curr, next).",
    defaultInput: [1, 2, 3, 4, 5],
    pseudocode: `prev = null, curr = head
while curr is not null:
    nxt = curr.next
    curr.next = prev
    prev = curr
    curr = nxt
return prev`,
  },
  {
    id: "linkedlist-cycle",
    title: "Floyd's Cycle Detection (Linked List)",
    category: "Linear Data Structures",
    subCategory: "Linked List",
    type: "linkedlist",
    description: "Detect cycles in a linked list using fast and slow pointers (Tortoise & Hare).",
    defaultInput: [3, 2, 0, -4],
    pseudocode: `slow = head, fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow == fast:
        return True # Cycle detected
return False`,
  },

  // ==========================================
  // 2. NON-LINEAR DATA STRUCTURES
  // ==========================================
  {
    id: "tree-inorder",
    title: "Binary Tree DFS (Tree)",
    category: "Non-linear Data Structures",
    subCategory: "Tree",
    type: "tree",
    description: "Recursive depth-first search traversal (Inorder: Left → Root → Right).",
    defaultInput: [4, 2, 6, 1, 3, 5, 7],
    pseudocode: `def inorder(node):
    if not node:
        return
    inorder(node.left)
    visit(node.val)
    inorder(node.right)

inorder(root)`,
  },
  {
    id: "tree-level-order",
    title: "Tree Level-Order (Tree)",
    category: "Non-linear Data Structures",
    subCategory: "Tree",
    type: "tree",
    description: "Breadth-first search traversal level by level across a binary tree.",
    defaultInput: [3, 9, 20, 15, 7],
    pseudocode: `queue = [root]
levels = []
while queue:
    level = []
    for _ in range(len(queue)):
        node = queue.pop(0)
        level.append(node.val)
        if node.left: queue.append(node.left)
        if node.right: queue.append(node.right)
    levels.append(level)
return levels`,
  },
  {
    id: "bst-search",
    title: "BST Lookup (Tree)",
    category: "Non-linear Data Structures",
    subCategory: "Tree",
    type: "bst",
    description: "Traverse a Binary Search Tree in O(h) time by comparing target with node values.",
    defaultInput: [8, 4, 12, 2, 6, 10, 14],
    target: 10,
    pseudocode: `curr = root
while curr is not null:
    if curr.val == target:
        return curr
    elif target < curr.val:
        curr = curr.left
    else:
        curr = curr.right
return null`,
  },
  {
    id: "min-heap-k",
    title: "Min-Heap Top-K (Heap)",
    category: "Non-linear Data Structures",
    subCategory: "Heap",
    type: "heap",
    description: "Maintain a min-heap of size K to find the K largest elements.",
    defaultInput: [12, 3, 5, 7, 19, 4, 26, 8],
    target: 3,
    pseudocode: `heap = []
for num in nums:
    heappush(heap, num)
    if len(heap) > k:
        heappop(heap)
return heap[0]`,
  },
  {
    id: "graph-bfs",
    title: "Graph BFS (Graph)",
    category: "Non-linear Data Structures",
    subCategory: "Graph",
    type: "graph",
    description: "Shortest-path breadth-first search across an unweighted graph network.",
    defaultInput: [0, 1, 2, 3, 4],
    pseudocode: `queue = [start_node]
visited = {start_node}
while queue:
    node = queue.pop(0)
    visit(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            visited.add(neighbor)
            queue.append(neighbor)`,
  },
  {
    id: "trie-prefix",
    title: "Trie (Prefix Tree)",
    category: "Non-linear Data Structures",
    subCategory: "Trie",
    type: "trie",
    description: "Insert strings into a prefix tree and perform fast O(m) prefix searches.",
    defaultInput: [1, 2, 3, 4],
    pseudocode: `trie = {}

def insert(word):
    curr = trie
    for ch in word:
        if ch not in curr:
            curr[ch] = {}
        curr = curr[ch]
    curr["#"] = True

def search_prefix(prefix):
    curr = trie
    for ch in prefix:
        if ch not in curr:
            return False
        curr = curr[ch]
    return True

for word in words:
    insert(word)
return search_prefix(query_prefix)`,
  },
  {
    id: "hashmap-freq",
    title: "Frequency Counter (Hash Table)",
    category: "Non-linear Data Structures",
    subCategory: "Hash Table",
    type: "hashmap",
    description: "Count frequencies of elements and lookup counts in O(1) time.",
    defaultInput: [2, 3, 2, 5, 3, 2, 7, 3],
    pseudocode: `counts = {}
for x in nums:
    counts[x] = counts.get(x, 0) + 1

most_frequent = max(counts, key=counts.get)
return most_frequent`,
  },

  // ==========================================
  // 3. SORTING ALGORITHMS
  // ==========================================
  {
    id: "bubble-sort",
    title: "Bubble Sort",
    category: "Sorting Algorithms",
    type: "array",
    description: "Repeatedly swap adjacent elements if they are in the wrong order.",
    defaultInput: [64, 34, 25, 12, 22, 11, 90],
    pseudocode: `n = len(arr)
for i in range(n):
    swapped = False
    for j in range(0, n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
            swapped = True
    if not swapped:
        break
return arr`,
  },
  {
    id: "selection-sort",
    title: "Selection Sort",
    category: "Sorting Algorithms",
    type: "array",
    description:
      "Repeatedly find the minimum element from the unsorted part and put it at the beginning.",
    defaultInput: [29, 10, 14, 37, 13],
    pseudocode: `n = len(arr)
for i in range(n):
    min_idx = i
    for j in range(i + 1, n):
        if arr[j] < arr[min_idx]:
            min_idx = j
    arr[i], arr[min_idx] = arr[min_idx], arr[i]
return arr`,
  },
  {
    id: "insertion-sort",
    title: "Insertion Sort",
    category: "Sorting Algorithms",
    type: "array",
    description:
      "Build the sorted array one element at a time by inserting each element into its proper position.",
    defaultInput: [12, 11, 13, 5, 6],
    pseudocode: `for i in range(1, len(arr)):
    key = arr[i]
    j = i - 1
    while j >= 0 and arr[j] > key:
        arr[j + 1] = arr[j]
        j -= 1
    arr[j + 1] = key
return arr`,
  },
  {
    id: "merge-sort",
    title: "Merge Sort",
    category: "Sorting Algorithms",
    type: "array",
    description:
      "Divide array into halves, recursively sort them, and merge the sorted halves in O(n log n).",
    defaultInput: [38, 27, 43, 3, 9, 82, 10],
    pseudocode: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

return merge_sort(nums)`,
  },
  {
    id: "quick-sort",
    title: "Quick Sort (Lomuto)",
    category: "Sorting Algorithms",
    type: "array",
    description:
      "Pick a pivot, partition elements into smaller and greater, then recursively sort partitions.",
    defaultInput: [10, 80, 30, 90, 40, 50, 70],
    pseudocode: `def partition(arr, low, high):
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] < pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1

def quicksort(arr, low, high):
    if low < high:
        pi = partition(arr, low, high)
        quicksort(arr, low, pi - 1)
        quicksort(arr, pi + 1, high)`,
  },
  {
    id: "counting-sort",
    title: "Counting Sort",
    category: "Sorting Algorithms",
    type: "array",
    description: "Non-comparison sorting in O(n + k) by tallying element frequencies.",
    defaultInput: [4, 2, 2, 8, 3, 3, 1],
    pseudocode: `max_val = max(arr)
count = [0] * (max_val + 1)
for x in arr:
    count[x] += 1
sorted_arr = []
for val, freq in enumerate(count):
    sorted_arr.extend([val] * freq)
return sorted_arr`,
  },
  {
    id: "radix-sort",
    title: "Radix Sort (LSD)",
    category: "Sorting Algorithms",
    type: "array",
    description: "Sort integers digit by digit starting from the least significant digit (LSD).",
    defaultInput: [170, 45, 75, 90, 802, 24, 2, 66],
    pseudocode: `max_num = max(arr)
exp = 1
while max_num // exp > 0:
    counting_sort_by_digit(arr, exp)
    exp *= 10
return arr`,
  },
  {
    id: "bucket-sort",
    title: "Bucket Sort",
    category: "Sorting Algorithms",
    type: "array",
    description: "Distribute elements into buckets, sort buckets individually, and gather them.",
    defaultInput: [29, 25, 3, 49, 9, 37, 21, 43],
    pseudocode: `buckets = [[] for _ in range(num_buckets)]
for x in arr:
    idx = int(x / max_val * (num_buckets - 1))
    buckets[idx].append(x)
for b in buckets:
    b.sort()
return [item for b in buckets for item in b]`,
  },
  {
    id: "shell-sort",
    title: "Shell Sort",
    category: "Sorting Algorithms",
    type: "array",
    description:
      "Generalization of insertion sort allowing exchanges of far apart elements using gaps.",
    defaultInput: [23, 12, 1, 8, 34, 54, 2, 3],
    pseudocode: `gap = len(arr) // 2
while gap > 0:
    for i in range(gap, len(arr)):
        temp = arr[i]
        j = i
        while j >= gap and arr[j - gap] > temp:
            arr[j] = arr[j - gap]
            j -= gap
        arr[j] = temp
    gap //= 2
return arr`,
  },
  {
    id: "heap-sort",
    title: "Heap Sort",
    category: "Sorting Algorithms",
    type: "heap",
    description:
      "Build a max heap from the array, then repeatedly extract the root to sort in O(n log n).",
    defaultInput: [12, 11, 13, 5, 6, 7],
    pseudocode: `def heapify(arr, n, i):
    largest = i
    l, r = 2 * i + 1, 2 * i + 2
    if l < n and arr[l] > arr[largest]: largest = l
    if r < n and arr[r] > arr[largest]: largest = r
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)

# Heap Sort
for i in range(n // 2 - 1, -1, -1): heapify(arr, n, i)
for i in range(n - 1, 0, -1):
    arr[i], arr[0] = arr[0], arr[i]
    heapify(arr, i, 0)`,
  },

  // ==========================================
  // 4. SEARCHING ALGORITHMS
  // ==========================================
  {
    id: "linear-search",
    title: "Linear Search",
    category: "Searching Algorithms",
    type: "array",
    description: "Sequential scan comparing each element until target is located.",
    defaultInput: [4, 2, 7, 1, 9, 3],
    target: 7,
    pseudocode: `for i in range(len(arr)):
    if arr[i] == target:
        return i
return -1`,
  },
  {
    id: "binary-search",
    title: "Binary Search",
    category: "Searching Algorithms",
    type: "array",
    description: "Divide search space in half each step in a sorted array in O(log n) time.",
    defaultInput: [3, 8, 14, 21, 29, 35, 42, 56],
    target: 35,
    pseudocode: `lo = 0, hi = len(nums) - 1
while lo <= hi:
    mid = (lo + hi) // 2
    if nums[mid] == target:
        return mid
    elif nums[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1
return -1`,
  },
  {
    id: "jump-search",
    title: "Jump Search",
    category: "Searching Algorithms",
    type: "array",
    description: "Skip ahead by block size sqrt(n) then linear scan within the block.",
    defaultInput: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
    target: 55,
    pseudocode: `step = int(math.sqrt(len(arr)))
prev = 0
while arr[min(step, len(arr)) - 1] < target:
    prev = step
    step += int(math.sqrt(len(arr)))
    if prev >= len(arr): return -1
while arr[prev] < target:
    prev += 1
    if prev == min(step, len(arr)): return -1
if arr[prev] == target: return prev
return -1`,
  },
  {
    id: "interpolation-search",
    title: "Interpolation Search",
    category: "Searching Algorithms",
    type: "array",
    description:
      "Estimate target position based on key value distribution in uniformly sorted data.",
    defaultInput: [10, 12, 13, 16, 18, 19, 20, 21, 22, 23, 24, 33, 35, 42, 47],
    target: 18,
    pseudocode: `lo = 0, hi = len(arr) - 1
while lo <= hi and target >= arr[lo] and target <= arr[hi]:
    pos = lo + ((target - arr[lo]) * (hi - lo)) // (arr[hi] - arr[lo])
    if arr[pos] == target:
        return pos
    if arr[pos] < target:
        lo = pos + 1
    else:
        hi = pos - 1
return -1`,
  },
  {
    id: "exponential-search",
    title: "Exponential Search",
    category: "Searching Algorithms",
    type: "array",
    description:
      "Double the search bound range exponentially, then binary search the bounded segment.",
    defaultInput: [2, 3, 4, 10, 40, 50, 60, 70, 80],
    target: 40,
    pseudocode: `if arr[0] == target: return 0
i = 1
while i < len(arr) and arr[i] <= target:
    i *= 2
return binary_search(arr, i // 2, min(i, len(arr) - 1), target)`,
  },
  {
    id: "fibonacci-search",
    title: "Fibonacci Search",
    category: "Searching Algorithms",
    type: "array",
    description:
      "Divide array into parts determined by Fibonacci numbers using only addition/subtraction.",
    defaultInput: [10, 22, 35, 40, 45, 50, 80, 82, 85, 90, 100],
    target: 85,
    pseudocode: `fib2 = 0; fib1 = 1; fibM = fib2 + fib1
while fibM < len(arr):
    fib2, fib1 = fib1, fibM
    fibM = fib2 + fib1
offset = -1
while fibM > 1:
    i = min(offset + fib2, len(arr) - 1)
    if arr[i] < target:
        fibM, fib1 = fib1, fib2
        fib2 = fibM - fib1
        offset = i
    elif arr[i] > target:
        fibM = fib2; fib1 -= fib2; fib2 = fibM - fib1
    else: return i
return -1`,
  },

  // ==========================================
  // 5. DIVIDE AND CONQUER
  // ==========================================
  {
    id: "dc-merge-sort",
    title: "Divide & Conquer: Merge",
    category: "Divide and Conquer",
    type: "array",
    description:
      "Classic Divide and Conquer: Split array into 2 halves, sort subproblems, and merge.",
    defaultInput: [14, 7, 3, 12, 9, 11, 6, 2],
    pseudocode: `def solve(arr):
    # 1. Base case
    if len(arr) <= 1: return arr
    # 2. Divide
    mid = len(arr) // 2
    left = solve(arr[:mid])
    right = solve(arr[mid:])
    # 3. Conquer (Combine)
    return merge(left, right)`,
  },
  {
    id: "dc-quick-sort",
    title: "Divide & Conquer: Quicksort",
    category: "Divide and Conquer",
    type: "array",
    description:
      "Partition around a pivot element into two independent sub-arrays, then conquer recursively.",
    defaultInput: [24, 9, 29, 14, 19, 27],
    pseudocode: `def quick_sort(arr):
    if len(arr) <= 1: return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)`,
  },
  {
    id: "dc-closest-pair",
    title: "Closest Pair of Points",
    category: "Divide and Conquer",
    type: "array",
    description:
      "Find the smallest Euclidean distance among 2D points using divide and conquer in O(n log n).",
    defaultInput: [2, 3, 12, 30, 40, 50, 5, 1, 12, 10, 3, 4],
    pseudocode: `def dist(p1, p2):
    return ((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)**0.5

def closest_pair(pts):
    n = len(pts)
    if n <= 3:
        min_d = float('inf')
        for i in range(n):
            for j in range(i + 1, n):
                min_d = min(min_d, dist(pts[i], pts[j]))
        return min_d
    mid = n // 2
    mid_x = pts[mid][0]
    d = min(closest_pair(pts[:mid]), closest_pair(pts[mid:]))
    strip = [p for p in pts if abs(p[0] - mid_x) < d]
    strip.sort(key=lambda p: p[1])
    for i in range(len(strip)):
        for j in range(i + 1, min(i + 7, len(strip))):
            d = min(d, dist(strip[i], strip[j]))
    return d`,
  },
  {
    id: "dc-karatsuba",
    title: "Karatsuba Multiplication",
    category: "Divide and Conquer",
    type: "array",
    description:
      "Multiply large numbers in O(n^1.585) sub-quadratic time by computing 3 sub-multiplications.",
    defaultInput: [1, 2, 3, 4, 5, 6, 7, 8],
    pseudocode: `def karatsuba(x, y):
    if x < 10 or y < 10: return x * y
    m = min(len(str(x)), len(str(y))) // 2
    high1, low1 = divmod(x, 10**m)
    high2, low2 = divmod(y, 10**m)
    z0 = karatsuba(low1, low2)
    z1 = karatsuba((low1 + high1), (low2 + high2))
    z2 = karatsuba(high1, high2)
    return (z2 * 10**(2*m)) + ((z1 - z2 - z0) * 10**m) + z0`,
  },
  {
    id: "dc-strassen",
    title: "Strassen's Matrix Multiply",
    category: "Divide and Conquer",
    type: "matrix",
    description: "Matrix multiplication for 2x2 blocks using 7 recursive block multiplications.",
    defaultInput: [1, 2, 3, 4],
    matrixInput: [
      [1, 2],
      [3, 4],
    ],
    pseudocode: `# Strassen 2x2 block multiplication: C = A * B
a, b, c, d = A[0][0], A[0][1], A[1][0], A[1][1]
e, f, g, h = B[0][0], B[0][1], B[1][0], B[1][1]

p1 = a * (f - h)
p2 = (a + b) * h
p3 = (c + d) * e
p4 = d * (g - e)
p5 = (a + d) * (e + h)
p6 = (b - d) * (g + h)
p7 = (a - c) * (e + f)

C = [[0, 0], [0, 0]]
C[0][0] = p5 + p4 - p2 + p6
C[0][1] = p1 + p2
C[1][0] = p3 + p4
C[1][1] = p1 + p5 - p3 - p7
return C`,
  },

  // ==========================================
  // 6. ALGORITHMIC PARADIGMS
  // ==========================================
  {
    id: "paradigm-recursion",
    title: "Recursive Tree Traversal",
    category: "Algorithmic Paradigms",
    subCategory: "Recursion",
    type: "tree",
    description: "Compute the maximum depth of a binary tree through pure recursion.",
    defaultInput: [3, 9, 20, 15, 7],
    pseudocode: `def max_depth(node):
    if not node:
        return 0
    left_depth = max_depth(node.left)
    right_depth = max_depth(node.right)
    return 1 + max(left_depth, right_depth)

return max_depth(root)`,
  },
  {
    id: "paradigm-dp-knapsack",
    title: "0/1 Knapsack (DP)",
    category: "Algorithmic Paradigms",
    subCategory: "Dynamic Programming",
    type: "array",
    description: "Maximize value within knapsack weight capacity using 2D/1D dynamic programming.",
    defaultInput: [10, 20, 30], // weights
    target: 50, // capacity
    pseudocode: `dp = [0] * (W + 1)
for i in range(n):
    w, v = weights[i], values[i]
    for cap in range(W, w - 1, -1):
        dp[cap] = max(dp[cap], dp[cap - w] + v)
return dp[W]`,
  },
  {
    id: "paradigm-dp-lcs",
    title: "Longest Common Subseq (DP)",
    category: "Algorithmic Paradigms",
    subCategory: "Dynamic Programming",
    type: "array",
    description:
      "Find the length of the Longest Common Subsequence between text1 ('a b c d e') and text2 ('a c e').",
    defaultInput: [1, 2, 3, 4, 5],
    target: 3,
    pseudocode: `def longestCommonSubsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = 1 + dp[i - 1][j - 1]
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]`,
  },
  {
    id: "paradigm-greedy-intervals",
    title: "Interval Scheduling (Greedy)",
    category: "Algorithmic Paradigms",
    subCategory: "Greedy",
    type: "array",
    description:
      "Select maximum non-overlapping intervals by greedily picking earliest ending tasks.",
    defaultInput: [1, 3, 2, 4, 3, 5, 5, 7],
    pseudocode: `intervals.sort(key=lambda x: x[1]) # Sort by end time
count = 0
last_end = -infinity
for start, end in intervals:
    if start >= last_end:
        count += 1
        last_end = end
return count`,
  },
  {
    id: "paradigm-backtracking-nqueens",
    title: "N-Queens (Backtracking)",
    category: "Algorithmic Paradigms",
    subCategory: "Backtracking",
    type: "matrix",
    description:
      "Place N non-attacking queens on an N x N chessboard using state exploration and pruning.",
    defaultInput: [4],
    matrixInput: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    pseudocode: `board = [[0] * N for _ in range(N)]
solutions = []

def is_safe(row, col):
    for r in range(row):
        if board[r][col] == 1:
            return False
        if col - (row - r) >= 0 and board[r][col - (row - r)] == 1:
            return False
        if col + (row - r) < N and board[r][col + (row - r)] == 1:
            return False
    return True

def solve(row):
    if row == N:
        solutions.append([r[:] for r in board])
        return
    for col in range(N):
        if is_safe(row, col):
            board[row][col] = 1
            solve(row + 1)
            board[row][col] = 0

solve(0)
return solutions`,
  },
  {
    id: "paradigm-backtracking-subsets",
    title: "Subsets (Backtracking)",
    category: "Algorithmic Paradigms",
    subCategory: "Backtracking",
    type: "array",
    description:
      "Generate all 2^n possible subsets (power set) of unique integers via decision tree branching.",
    defaultInput: [1, 2, 3],
    pseudocode: `result = []
def backtrack(start, curr_subset):
    result.append(curr_subset[:])
    for i in range(start, len(nums)):
        curr_subset.append(nums[i])
        backtrack(i + 1, curr_subset)
        curr_subset.pop()

backtrack(0, [])
return result`,
  },
  {
    id: "paradigm-randomized-select",
    title: "Randomized Quickselect",
    category: "Algorithmic Paradigms",
    subCategory: "Randomized",
    type: "array",
    description:
      "Find the k-th smallest element in expected O(n) linear time using random pivot selection.",
    defaultInput: [7, 10, 4, 3, 20, 15],
    target: 3, // k = 3rd smallest
    pseudocode: `def quickselect(arr, k):
    pivot = random.choice(arr)
    lows = [el for el in arr if el < pivot]
    highs = [el for el in arr if el > pivot]
    pivots = [el for el in arr if el == pivot]
    if k <= len(lows):
        return quickselect(lows, k)
    elif k <= len(lows) + len(pivots):
        return pivot
    else:
        return quickselect(highs, k - len(lows) - len(pivots))`,
  },

  // ==========================================
  // 7. MATH & NUMBER THEORY
  // ==========================================
  {
    id: "binary-exponentiation",
    title: "Binary Exponentiation (Pow(x, n))",
    category: "Math & Number Theory",
    subCategory: "Math",
    type: "array",
    description:
      "Compute x raised to power n in O(log n) logarithmic time by squaring the base and halving the exponent.",
    defaultInput: [2, 10],
    target: 1024,
    pseudocode: `result = 1
base = x
exp = n
if exp < 0:
    base = 1 / base
    exp = -exp
while exp > 0:
    if exp % 2 == 1:
        result *= base
    base *= base
    exp //= 2
return result`,
  },
  {
    id: "sieve-of-eratosthenes",
    title: "Sieve of Eratosthenes (Primes)",
    category: "Math & Number Theory",
    subCategory: "Number Theory",
    type: "array",
    description:
      "Find all prime numbers up to N in O(n log log n) time by iteratively crossing out composite multiples.",
    defaultInput: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    target: 20,
    pseudocode: `is_prime = [True] * (n + 1)
is_prime[0] = is_prime[1] = False
for p in range(2, int(n**0.5) + 1):
    if is_prime[p]:
        for multiple in range(p * p, n + 1, p):
            is_prime[multiple] = False
primes = [i for i in range(2, n + 1) if is_prime[i]]
return primes`,
  },
  {
    id: "euclidean-gcd",
    title: "Euclidean GCD Algorithm",
    category: "Math & Number Theory",
    subCategory: "Math",
    type: "array",
    description:
      "Compute the Greatest Common Divisor of two integers using recursive remainder reduction in O(log(min(a,b))).",
    defaultInput: [48, 18],
    target: 6,
    pseudocode: `while b != 0:
    remainder = a % b
    a = b
    b = remainder
gcd = a
return gcd`,
  },
  {
    id: "integer-sqrt-binary-search",
    title: "Square Root (Binary Search)",
    category: "Math & Number Theory",
    subCategory: "Math",
    type: "array",
    description:
      "Find the integer square root of x in O(log x) time using monotonic binary search convergence.",
    defaultInput: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    target: 25,
    pseudocode: `if x < 2:
    return x
left, right = 1, x // 2
ans = 1
while left <= right:
    mid = (left + right) // 2
    sq = mid * mid
    if sq == x:
        return mid
    elif sq < x:
        ans = mid
        left = mid + 1
    else:
        right = mid - 1
return ans`,
  },

  // ==========================================
  // 8. MAP & HASH TABLE ALGORITHMS
  // ==========================================
  {
    id: "hashmap-two-sum",
    title: "Two Sum (One-Pass Map)",
    category: "Non-linear Data Structures",
    subCategory: "Hash Table",
    type: "hashmap",
    description:
      "Find pair of indices summing to target in O(n) linear time with O(1) average lookup using a hash table.",
    defaultInput: [2, 7, 11, 15],
    target: 9,
    pseudocode: `seen = {}
for i, num in enumerate(nums):
    complement = target - num
    if complement in seen:
        return [seen[complement], i]
    seen[num] = i
return [-1, -1]`,
  },
  {
    id: "hashmap-group-anagrams",
    title: "Group Anagrams (Map Buckets)",
    category: "Non-linear Data Structures",
    subCategory: "Hash Table",
    type: "hashmap",
    description:
      "Group strings with identical character counts together by mapping sorted signatures to list buckets.",
    defaultInput: [1, 2, 3, 4, 5, 6],
    pseudocode: `anagram_map = {}
for word in words:
    key = "".join(sorted(word))
    if key not in anagram_map:
        anagram_map[key] = []
    anagram_map[key].append(word)
return list(anagram_map.values())`,
  },
  {
    id: "hashmap-subarray-sum-k",
    title: "Subarray Sum Equals K (Prefix Map)",
    category: "Non-linear Data Structures",
    subCategory: "Hash Table",
    type: "hashmap",
    description:
      "Count contiguous subarrays summing to k in O(n) time using a cumulative prefix-sum frequency map.",
    defaultInput: [1, 2, 3, -2, 2, 1, 3],
    target: 3,
    pseudocode: `prefix_counts = {0: 1}
running_sum = 0
count = 0
for num in nums:
    running_sum += num
    target_prefix = running_sum - k
    if target_prefix in prefix_counts:
        count += prefix_counts[target_prefix]
    prefix_counts[running_sum] = prefix_counts.get(running_sum, 0) + 1
return count`,
  },
  {
    id: "hashmap-lru-cache",
    title: "LRU Cache (Map + Eviction)",
    category: "Non-linear Data Structures",
    subCategory: "Hash Table",
    type: "hashmap",
    description:
      "Simulate a Least Recently Used cache supporting O(1) get/put operations with fixed capacity eviction.",
    defaultInput: [1, 2, 3, 1, 4, 5],
    target: 3,
    pseudocode: `cache = {}
recency = []
capacity = 3

def get(key):
    if key not in cache:
        return -1
    recency.remove(key)
    recency.append(key)
    return cache[key]

def put(key, value):
    if key in cache:
        recency.remove(key)
    elif len(cache) >= capacity:
        lru = recency.pop(0)
        del cache[lru]
    cache[key] = value
    recency.append(key)`,
  },

  // ==========================================
  // 9. GRID & MATRIX GEOMETRY
  // ==========================================
  {
    id: "matrix-max-area-island",
    title: "Max Area of Island (DFS Grid)",
    category: "Grid & Matrix Geometry",
    subCategory: "Matrix DFS",
    type: "matrix",
    description:
      "Compute the maximum area of contiguous land cells (1s) in a 2D matrix using 4-directional DFS.",
    defaultInput: [1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0],
    matrixInput: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    pseudocode: `max_area = 0
rows, cols = len(grid), len(grid[0])

def dfs(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == 0:
        return 0
    grid[r][c] = 0
    area = 1
    area += dfs(r + 1, c)
    area += dfs(r - 1, c)
    area += dfs(r, c + 1)
    area += dfs(r, c - 1)
    return area

for r in range(rows):
    for c in range(cols):
        if grid[r][c] == 1:
            current_area = dfs(r, c)
            max_area = max(max_area, current_area)
return max_area`,
  },
  {
    id: "matrix-flood-fill",
    title: "Flood Fill (Paint Bucket)",
    category: "Grid & Matrix Geometry",
    subCategory: "Matrix Fill",
    type: "matrix",
    description:
      "Perform a 4-directional flood fill starting from (sr, sc), repainting all connected matching pixels with new color.",
    defaultInput: [1, 1, 1, 1, 1, 0, 1, 0, 1],
    matrixInput: [
      [1, 1, 1],
      [1, 1, 0],
      [1, 0, 1],
    ],
    target: 2,
    pseudocode: `orig_color = grid[sr][sc]
if orig_color == new_color:
    return grid

def fill(r, c):
    if r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] != orig_color:
        return
    grid[r][c] = new_color
    fill(r + 1, c)
    fill(r - 1, c)
    fill(r, c + 1)
    fill(r, c - 1)

fill(sr, sc)
return grid`,
  },
  {
    id: "matrix-rotting-oranges",
    title: "Rotting Oranges (Multi-Source BFS)",
    category: "Grid & Matrix Geometry",
    subCategory: "Matrix BFS",
    type: "matrix",
    description:
      "Simulate multi-source BFS wavefront propagation to calculate minimum minutes until all fresh oranges rot.",
    defaultInput: [2, 1, 1, 1, 1, 0, 0, 1, 1],
    matrixInput: [
      [2, 1, 1],
      [1, 1, 0],
      [0, 1, 1],
    ],
    pseudocode: `queue = []
fresh = 0
rows, cols = len(grid), len(grid[0])

for r in range(rows):
    for c in range(cols):
        if grid[r][c] == 2:
            queue.append((r, c))
        elif grid[r][c] == 1:
            fresh += 1

minutes = 0
while queue and fresh > 0:
    minutes += 1
    for _ in range(len(queue)):
        r, c = queue.pop(0)
        for dr, dc in [(1,0), (-1,0), (0,1), (0,-1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                queue.append((nr, nc))

return minutes if fresh == 0 else -1`,
  },
  {
    id: "matrix-number-of-islands",
    title: "Number of Islands (Connected Components)",
    category: "Grid & Matrix Geometry",
    subCategory: "Matrix DFS",
    type: "matrix",
    description:
      "Count distinct disconnected land masses in a 2D matrix using depth-first search sink traversal.",
    defaultInput: [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    matrixInput: [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ],
    pseudocode: `island_count = 0
rows, cols = len(grid), len(grid[0])

def sink(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == 0:
        return
    grid[r][c] = 0
    sink(r + 1, c)
    sink(r - 1, c)
    sink(r, c + 1)
    sink(r, c - 1)

for r in range(rows):
    for c in range(cols):
        if grid[r][c] == 1:
            island_count += 1
            sink(r, c)

return island_count`,
  },
];

import type { CppHeaderDoc, SupportedLanguage } from "./compiler.types";

export const CPP_DSA_HEADERS: CppHeaderDoc[] = [
  {
    name: "iostream",
    include: "#include <iostream>",
    description:
      "Standard Input and Output streams (cin, cout, cerr, endl) for classic problem solving.",
    commonFunctions: [
      {
        name: "cin",
        signature: "std::cin >> var;",
        desc: "Read formatted input from standard input stream",
      },
      {
        name: "cout",
        signature: "std::cout << val << std::endl;",
        desc: "Print output to standard output stream",
      },
      {
        name: "sync_with_stdio",
        signature: "std::ios_base::sync_with_stdio(false);",
        desc: "Fast I/O optimization for competitive programming",
      },
    ],
    exampleSnippet: `#include <iostream>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int a, b;
    if (cin >> a >> b) {
        cout << "Sum: " << (a + b) << endl;
    }
    return 0;
}`,
    dsaUseCases: ["Reading test cases", "Printing formatted answers", "Fast I/O optimization"],
  },
  {
    name: "vector",
    include: "#include <vector>",
    description:
      "Dynamic contiguous array container with automatic resizing and O(1) amortized insertion.",
    commonFunctions: [
      {
        name: "push_back",
        signature: "v.push_back(val);",
        desc: "Add element at the end in O(1) amortized",
      },
      { name: "pop_back", signature: "v.pop_back();", desc: "Remove last element in O(1)" },
      { name: "size", signature: "v.size();", desc: "Return number of elements" },
      {
        name: "resize",
        signature: "v.resize(newSize, defaultVal);",
        desc: "Change container capacity & size",
      },
      {
        name: "assign",
        signature: "v.assign(count, val);",
        desc: "Replaces contents with count copies of val",
      },
    ],
    exampleSnippet: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {5, 2, 8, 1, 9};
    nums.push_back(12);
    
    for (int x : nums) {
        cout << x << " ";
    }
    cout << endl;
    return 0;
}`,
    dsaUseCases: [
      "Dynamic arrays",
      "Adjacency lists for graphs",
      "2D grids & DP tables (vector<vector<int>>)",
    ],
  },
  {
    name: "algorithm",
    include: "#include <algorithm>",
    description:
      "Essential collection of searching, sorting, manipulating, and counting algorithms.",
    commonFunctions: [
      {
        name: "sort",
        signature: "sort(v.begin(), v.end(), comp);",
        desc: "Sorts range in O(N log N) using Introsort",
      },
      {
        name: "binary_search",
        signature: "binary_search(begin, end, val);",
        desc: "Returns true if val exists in sorted range",
      },
      {
        name: "lower_bound",
        signature: "lower_bound(begin, end, val);",
        desc: "First element >= val in O(log N)",
      },
      {
        name: "upper_bound",
        signature: "upper_bound(begin, end, val);",
        desc: "First element > val in O(log N)",
      },
      {
        name: "reverse",
        signature: "reverse(v.begin(), v.end());",
        desc: "Reverses order of elements in O(N)",
      },
      {
        name: "max / min",
        signature: "max(a, b); min(a, b);",
        desc: "Returns maximum or minimum of values",
      },
    ],
    exampleSnippet: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> a = {4, 1, 7, 3, 9, 2};
    
    // 1. Custom descending sort with lambda
    sort(a.begin(), a.end(), [](int x, int y) {
        return x > y;
    });
    
    // 2. Binary search via lower_bound (note: requires ascending sort normally)
    sort(a.begin(), a.end());
    auto it = lower_bound(a.begin(), a.end(), 4);
    cout << "Lower bound for 4 at index: " << (it - a.begin()) << "\\n";
    
    return 0;
}`,
    dsaUseCases: ["Sorting arrays", "Custom comparator sorting", "Binary search lookup", "Subarray reversals"],
  },
  {
    name: "string",
    include: "#include <string>",
    description:
      "Standard string sequence with rich manipulation, substrings, and matching capabilities.",
    commonFunctions: [
      {
        name: "substr",
        signature: "s.substr(pos, len);",
        desc: "Extract substring from pos with length len",
      },
      {
        name: "find",
        signature: "s.find(target, pos);",
        desc: "Find first occurrence or string::npos",
      },
      {
        name: "length / size",
        signature: "s.length();",
        desc: "Returns character length of string",
      },
      {
        name: "to_string",
        signature: "to_string(num);",
        desc: "Convert integer/float to std::string",
      },
      { name: "stoi", signature: "stoi(s);", desc: "Parse numeric string to integer" },
    ],
    exampleSnippet: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string str = "radar";
    string rev = str;
    reverse(rev.begin(), rev.end());
    
    cout << str << (str == rev ? " is a palindrome" : " is not a palindrome") << endl;
    return 0;
}`,
    dsaUseCases: [
      "String parsing",
      "Palindrome check",
      "Anagram hashing",
      "KMP / Trie prefix operations",
    ],
  },
  {
    name: "unordered_map & map",
    include: "#include <unordered_map>\n#include <map>",
    description:
      "Associative key-value stores. Unordered uses Hash Table (O(1) avg); Ordered uses Red-Black Tree (O(log N)).",
    commonFunctions: [
      { name: "operator[]", signature: "mp[key] = val;", desc: "Access or insert key-value pair" },
      {
        name: "find",
        signature: "mp.find(key) != mp.end()",
        desc: "Check if key exists in O(1) or O(log N)",
      },
      { name: "count", signature: "mp.count(key);", desc: "Returns 1 if present, 0 otherwise" },
      { name: "erase", signature: "mp.erase(key);", desc: "Removes element associated with key" },
      { name: "iteration", signature: "for (auto const& [k, v] : mp)", desc: "Iterate over map pairs (C++17)" },
    ],
    exampleSnippet: `#include <iostream>
#include <unordered_map>
#include <map>
#include <vector>
using namespace std;

int main() {
    // 1. Frequency counting
    vector<int> nums = {2, 7, 2, 7, 11};
    unordered_map<int, int> freq;
    for (int x : nums) {
        freq[x]++;
    }
    
    // 2. Iterating through a map (C++17 Structured Binding)
    cout << "Frequencies:\\n";
    for (auto const& [key, val] : freq) {
        cout << key << ": " << val << " times\\n";
    }

    // 3. Ordered Map for sorted keys
    map<int, string> ordered;
    ordered[10] = "ten";
    ordered[1] = "one";
    
    cout << "Smallest key: " << ordered.begin()->first << "\\n";
    
    return 0;
}`,
    dsaUseCases: ["Two sum / frequency counting", "Graph weights", "Memoization table for DP", "Sorted sweep line keys (std::map)"],
  },
  {
    name: "unordered_set & set",
    include: "#include <unordered_set>\n#include <set>",
    description:
      "Containers storing unique elements. set maintains sorted order; unordered_set offers O(1) hash lookup.",
    commonFunctions: [
      { name: "insert", signature: "st.insert(val);", desc: "Insert unique item" },
      { name: "count", signature: "st.count(val);", desc: "Check membership (0 or 1)" },
      { name: "erase", signature: "st.erase(val);", desc: "Remove element from set" },
      {
        name: "lower_bound",
        signature: "st.lower_bound(val);",
        desc: "Find element >= val in std::set",
      },
    ],
    exampleSnippet: `#include <iostream>
#include <unordered_set>
using namespace std;

int main() {
    unordered_set<int> uniqueNums;
    int arr[] = {1, 2, 2, 3, 4, 4, 5};
    
    for (int x : arr) uniqueNums.insert(x);
    cout << "Unique count: " << uniqueNums.size() << endl;
    return 0;
}`,
    dsaUseCases: ["Deduplication", "Cycle detection in graphs", "Sliding window unique sets"],
  },
  {
    name: "queue & priority_queue",
    include: "#include <queue>",
    description:
      "FIFO queue for BFS and Heap-based Priority Queue (Max-Heap or Min-Heap) for Dijkstra & Top-K.",
    commonFunctions: [
      { name: "push", signature: "q.push(val);", desc: "Insert element to back / heap" },
      { name: "pop", signature: "q.pop();", desc: "Remove front / top element" },
      {
        name: "front / top",
        signature: "q.front(); pq.top();",
        desc: "Inspect front or top element",
      },
      {
        name: "min-heap",
        signature: "priority_queue<int, vector<int>, greater<int>> minPq;",
        desc: "Declare Min-Heap",
      },
    ],
    exampleSnippet: `#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    // Min-heap
    priority_queue<int, vector<int>, greater<int>> minHeap;
    minHeap.push(30);
    minHeap.push(10);
    minHeap.push(20);
    
    cout << "Smallest element: " << minHeap.top() << endl;
    return 0;
}`,
    dsaUseCases: [
      "Breadth-First Search (BFS)",
      "Dijkstra shortest path",
      "Top-K Frequent Elements",
      "Kth largest in array",
    ],
  },
  {
    name: "stack",
    include: "#include <stack>",
    description:
      "LIFO container adapter for recursion emulation, parenthesis matching, and monotonic stacks.",
    commonFunctions: [
      { name: "push", signature: "stk.push(val);", desc: "Push element onto stack" },
      { name: "pop", signature: "stk.pop();", desc: "Remove top element" },
      { name: "top", signature: "stk.top();", desc: "Access top element" },
      { name: "empty", signature: "stk.empty();", desc: "Check if stack has no elements" },
    ],
    exampleSnippet: `#include <iostream>
#include <stack>
#include <string>
using namespace std;

bool isValidParentheses(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty()) return false;
            if (c == ')' && st.top() != '(') return false;
            if (c == '}' && st.top() != '{') return false;
            if (c == ']' && st.top() != '[') return false;
            st.pop();
        }
    }
    return st.empty();
}

int main() {
    cout << "Valid ()[]{}: " << (isValidParentheses("()[]{}") ? "true" : "false") << endl;
    return 0;
}`,
    dsaUseCases: [
      "Valid parentheses",
      "Next greater element",
      "Largest rectangle in histogram",
      "DFS",
    ],
  },
  {
    name: "cmath & climits",
    include: "#include <cmath>\n#include <climits>",
    description:
      "Math utilities and boundary constants like INT_MAX, INT_MIN, LLONG_MAX, sqrt, pow, abs.",
    commonFunctions: [
      {
        name: "INT_MAX / INT_MIN",
        signature: "INT_MAX = 2147483647; INT_MIN = -2147483648;",
        desc: "32-bit signed integer limits",
      },
      {
        name: "sqrt / pow / abs",
        signature: "sqrt(x); pow(b, e); abs(n);",
        desc: "Square root, power, and absolute value",
      },
      { name: "ceil / floor", signature: "ceil(x); floor(x);", desc: "Round up or round down" },
    ],
    exampleSnippet: `#include <iostream>
#include <cmath>
#include <climits>
using namespace std;

int main() {
    int maxVal = INT_MAX;
    cout << "INT_MAX: " << maxVal << endl;
    cout << "sqrt(25): " << sqrt(25) << endl;
    return 0;
}`,
    dsaUseCases: [
      "Infinity initialization in shortest path / DP",
      "Numeric calculations",
      "Geometry algorithms",
    ],
  },
  {
    name: "numeric & utility",
    include: "#include <numeric>\n#include <utility>",
    description: "Prefix sum (accumulate), GCD/LCM, std::pair, and std::swap operations.",
    commonFunctions: [
      {
        name: "accumulate",
        signature: "accumulate(v.begin(), v.end(), 0LL);",
        desc: "Sum up elements with initial accumulator",
      },
      { name: "gcd / lcm", signature: "std::gcd(a, b);", desc: "Greatest Common Divisor (C++17)" },
      {
        name: "pair & make_pair",
        signature: "pair<int, int> p = {u, v};",
        desc: "2-tuple container",
      },
      { name: "swap", signature: "swap(a, b);", desc: "Swap values of two variables" },
    ],
    exampleSnippet: `#include <iostream>
#include <vector>
#include <numeric>
#include <utility>
using namespace std;

int main() {
    vector<int> v = {1, 2, 3, 4, 5};
    int total = accumulate(v.begin(), v.end(), 0);
    cout << "Prefix sum total: " << total << endl;
    return 0;
}`,
    dsaUseCases: [
      "Sum / reduction operations",
      "Graph edge representations (pair<int, int>)",
      "Number theory GCD",
    ],
  },
];

export const C_DSA_HEADERS: CppHeaderDoc[] = [
  {
    name: "stdio.h",
    include: "#include <stdio.h>",
    description: "Standard Input/Output functions in C (scanf, printf, fgets, getchar).",
    commonFunctions: [
      { name: "printf", signature: "printf(\"%d\", val);", desc: "Formatted output to stdout" },
      { name: "scanf", signature: "scanf(\"%d\", &val);", desc: "Formatted input from stdin" },
      { name: "fgets", signature: "fgets(str, size, stdin);", desc: "Safe line reading from stream" },
    ],
    exampleSnippet: `#include <stdio.h>

int main() {
    int x;
    if (scanf("%d", &x) == 1) {
        printf("Read integer: %d\\n", x);
    }
    return 0;
}`,
    dsaUseCases: ["Reading inputs", "Printing solution results"],
    language: "c",
  },
  {
    name: "stdlib.h",
    include: "#include <stdlib.h>",
    description: "Dynamic memory allocation (malloc, free, realloc) and sorting utilities (qsort).",
    commonFunctions: [
      { name: "malloc", signature: "void* p = malloc(size);", desc: "Heap allocation" },
      { name: "free", signature: "free(p);", desc: "Deallocate heap memory" },
      { name: "qsort", signature: "qsort(arr, n, sizeof(int), cmp);", desc: "Standard library quicksort" },
      { name: "abs", signature: "abs(val);", desc: "Absolute integer value" },
    ],
    exampleSnippet: `#include <stdio.h>
#include <stdlib.h>

int cmp(const void* a, const void* b) {
    return (*(int*)a - *(int*)b);
}

int main() {
    int arr[] = {4, 2, 8, 1};
    qsort(arr, 4, sizeof(int), cmp);
    for (int i = 0; i < 4; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}`,
    dsaUseCases: ["Dynamic arrays", "Linked list nodes", "Sorting arrays"],
    language: "c",
  },
  {
    name: "string.h",
    include: "#include <string.h>",
    description: "C-string operations (strlen, strcpy, strcmp, memset, memcpy).",
    commonFunctions: [
      { name: "memset", signature: "memset(arr, 0, sizeof(arr));", desc: "Fill memory block" },
      { name: "strlen", signature: "strlen(str);", desc: "String length excluding null byte" },
      { name: "strcmp", signature: "strcmp(s1, s2);", desc: "Lexicographical string comparison" },
    ],
    exampleSnippet: `#include <stdio.h>
#include <string.h>

int main() {
    int dp[100];
    memset(dp, -1, sizeof(dp));
    printf("dp[0] initialized to: %d\\n", dp[0]);
    return 0;
}`,
    dsaUseCases: ["Initializing DP tables", "String manipulation", "Buffer copying"],
    language: "c",
  },
  {
    name: "stdbool.h",
    include: "#include <stdbool.h>",
    description: "Standard boolean type definitions (bool, true, false) in C99/C17.",
    commonFunctions: [
      { name: "bool", signature: "bool visited = false;", desc: "Boolean primitive type" },
    ],
    exampleSnippet: `#include <stdio.h>
#include <stdbool.h>

bool isEven(int n) {
    return n % 2 == 0;
}

int main() {
    printf("Is 4 even? %s\\n", isEven(4) ? "true" : "false");
    return 0;
}`,
    dsaUseCases: ["Visited arrays in BFS/DFS", "Predicate flags"],
    language: "c",
  },
  {
    name: "math.h",
    include: "#include <math.h>",
    description: "Mathematical operations (sqrt, pow, ceil, floor, fabs).",
    commonFunctions: [
      { name: "sqrt", signature: "double s = sqrt(x);", desc: "Square root" },
      { name: "pow", signature: "double p = pow(base, exp);", desc: "Power calculation" },
      { name: "fabs", signature: "double f = fabs(val);", desc: "Floating-point absolute value" },
    ],
    exampleSnippet: `#include <stdio.h>
#include <math.h>

int main() {
    printf("sqrt(25) = %.2f\\n", sqrt(25.0));
    return 0;
}`,
    dsaUseCases: ["Geometry algorithms", "Distance formulas", "Numeric approximations"],
    language: "c",
  },
];

export const JAVA_DSA_PACKAGES: CppHeaderDoc[] = [
  {
    name: "java.util.*",
    include: "import java.util.*;",
    description: "Java standard collections framework (List, Map, Set, Queue, PriorityQueue, Collections, Arrays).",
    commonFunctions: [
      { name: "ArrayList", signature: "List<Integer> list = new ArrayList<>();", desc: "Dynamic resizable array" },
      { name: "HashMap", signature: "Map<K, V> map = new HashMap<>();", desc: "O(1) hash map lookup" },
      { name: "PriorityQueue", signature: "PriorityQueue<Integer> pq = new PriorityQueue<>();", desc: "Min-heap priority queue" },
      { name: "Arrays.sort", signature: "Arrays.sort(arr);", desc: "Dual-pivot quicksort / Timsort" },
    ],
    exampleSnippet: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        List<Integer> list = Arrays.asList(5, 1, 4, 2);
        Collections.sort(list);
        System.out.println("Sorted: " + list);
    }
}`,
    dsaUseCases: ["Hash table lookups", "Heap algorithms", "Sorting & searching"],
    language: "java",
  },
  {
    name: "java.io.*",
    include: "import java.io.*;",
    description: "Fast I/O classes for competitive programming (BufferedReader, StringTokenizer, PrintWriter).",
    commonFunctions: [
      { name: "BufferedReader", signature: "BufferedReader br = new BufferedReader(new InputStreamReader(System.in));", desc: "High-speed buffered line reader" },
      { name: "StringTokenizer", signature: "StringTokenizer st = new StringTokenizer(br.readLine());", desc: "Fast token parser" },
    ],
    exampleSnippet: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line != null) {
            System.out.println("Echo: " + line);
        }
    }
}`,
    dsaUseCases: ["Speeding up large I/O (>10^5 operations)", "Competitive programming boilerplate"],
    language: "java",
  },
  {
    name: "java.math.BigInteger",
    include: "import java.math.BigInteger;",
    description: "Arbitrary-precision integer arithmetic for problems with huge numbers beyond 64 bits.",
    commonFunctions: [
      { name: "add", signature: "a.add(b);", desc: "Big integer addition" },
      { name: "multiply", signature: "a.multiply(b);", desc: "Big integer multiplication" },
      { name: "mod", signature: "a.mod(m);", desc: "Big integer modulo" },
    ],
    exampleSnippet: `import java.math.BigInteger;

public class Main {
    public static void main(String[] args) {
        BigInteger a = new BigInteger("12345678901234567890");
        BigInteger b = a.multiply(a);
        System.out.println("Squared: " + b);
    }
}`,
    dsaUseCases: ["Combinatorics with huge factorials", "Cryptography & large integers"],
    language: "java",
  },
];

export const PYTHON_DSA_MODULES: CppHeaderDoc[] = [
  {
    name: "collections",
    include: "import collections",
    description: "High-performance container datatypes (deque, Counter, defaultdict, OrderedDict).",
    commonFunctions: [
      { name: "deque", signature: "q = collections.deque()", desc: "Double-ended queue with O(1) appends & pops from both ends" },
      { name: "Counter", signature: "counts = collections.Counter(items)", desc: "Frequency map for iterable elements" },
      { name: "defaultdict", signature: "d = collections.defaultdict(list)", desc: "Dictionary with default factory value" },
    ],
    exampleSnippet: `from collections import deque, Counter

# BFS Queue
queue = deque([1, 2, 3])
queue.append(4)
first = queue.popleft()

# Frequency map
counts = Counter("abracadabra")
print(f"First element: {first}")
print(f"Top 2 characters: {counts.most_common(2)}")`,
    dsaUseCases: ["BFS tree & graph traversals", "Frequency counting", "LRU Cache building"],
    language: "python",
  },
  {
    name: "heapq",
    include: "import heapq",
    description: "Binary min-heap algorithm implementation directly on standard Python lists.",
    commonFunctions: [
      { name: "heappush", signature: "heapq.heappush(heap, item)", desc: "Push item onto heap in O(log N)" },
      { name: "heappop", signature: "val = heapq.heappop(heap)", desc: "Pop smallest item in O(log N)" },
      { name: "heapify", signature: "heapq.heapify(list)", desc: "Transform list into heap in-place in O(N)" },
      { name: "nlargest", signature: "heapq.nlargest(k, iterable)", desc: "Return top K largest elements" },
    ],
    exampleSnippet: `import heapq

nums = [7, 2, 5, 1, 9]
heapq.heapify(nums)
smallest = heapq.heappop(nums)
print(f"Smallest element: {smallest}")
print(f"Remaining min-heap: {nums}")`,
    dsaUseCases: ["Dijkstra's algorithm", "Kth largest element", "Merge K sorted lists"],
    language: "python",
  },
  {
    name: "bisect",
    include: "import bisect",
    description: "Binary search utilities on sorted sequences without having to write custom binary search loops.",
    commonFunctions: [
      { name: "bisect_left", signature: "idx = bisect.bisect_left(arr, x)", desc: "Locate insertion point for x (lower_bound)" },
      { name: "bisect_right", signature: "idx = bisect.bisect_right(arr, x)", desc: "Locate insertion point for x (upper_bound)" },
      { name: "insort", signature: "bisect.insort(arr, x)", desc: "Insert x into sorted sequence" },
    ],
    exampleSnippet: `import bisect

arr = [10, 20, 30, 40, 50]
idx = bisect.bisect_left(arr, 30)
print(f"Index of 30: {idx}")`,
    dsaUseCases: ["Binary search range queries", "Longest Increasing Subsequence O(N log N)"],
    language: "python",
  },
  {
    name: "itertools & functools",
    include: "import itertools, functools",
    description: "Combinatoric iterators (permutations, combinations) and memoization (lru_cache).",
    commonFunctions: [
      { name: "lru_cache", signature: "@functools.lru_cache(None)", desc: "Automatic top-down DP memoization" },
      { name: "permutations", signature: "itertools.permutations(iterable, r)", desc: "Generate r-length permutations" },
      { name: "combinations", signature: "itertools.combinations(iterable, r)", desc: "Generate r-length combinations" },
    ],
    exampleSnippet: `from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2: return n
    return fib(n-1) + fib(n-2)

print(f"Fib(30) = {fib(30)}")`,
    dsaUseCases: ["Recursion memoization", "Backtracking search", "Subsets & permutations"],
    language: "python",
  },
];

export function getHeadersForLanguage(lang: SupportedLanguage): CppHeaderDoc[] {
  switch (lang) {
    case "c":
      return C_DSA_HEADERS;
    case "java":
      return JAVA_DSA_PACKAGES;
    case "python":
      return PYTHON_DSA_MODULES;
    case "cpp":
    default:
      return CPP_DSA_HEADERS;
  }
}


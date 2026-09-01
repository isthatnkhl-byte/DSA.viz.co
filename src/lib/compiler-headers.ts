import type { CppHeaderDoc } from "./compiler.types";

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

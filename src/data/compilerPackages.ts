import { CppHeaderInfo } from "../types.ts";

export const CPP_PACKAGES: CppHeaderInfo[] = [
  {
    header: "<vector>",
    category: "Dynamic Sequences",
    description: "Dynamic array container with contiguous memory storage and geometric resizing factor (typically 2x).",
    commonFunctions: [
      { name: "push_back / emplace_back", signature: "void push_back(const T& val);", complexity: "O(1) amortized", description: "Appends an element to the end." },
      { name: "reserve", signature: "void reserve(size_type new_cap);", complexity: "O(N)", description: "Allocates capacity in advance to prevent reallocations." },
      { name: "pop_back", signature: "void pop_back();", complexity: "O(1)", description: "Removes the last element." },
      { name: "size", signature: "size_type size() const;", complexity: "O(1)", description: "Returns the number of active elements." },
    ],
    codeSnippet: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums = {10, 20, 30};
    nums.reserve(10);
    nums.emplace_back(40);
    for (int x : nums) {
        std::cout << x << " ";
    }
    return 0;
}`,
  },
  {
    header: "<algorithm>",
    category: "Algorithmic Utilities",
    description: "Standard algorithmic functions including sorting, binary searching, partition, permutations, and min/max scans.",
    commonFunctions: [
      { name: "std::sort", signature: "void sort(RandomIt first, RandomIt last);", complexity: "O(N log N)", description: "IntroSort (QuickSort + HeapSort + InsertionSort hybrid)." },
      { name: "std::lower_bound", signature: "ForwardIt lower_bound(ForwardIt first, ForwardIt last, const T& value);", complexity: "O(log N)", description: "Returns iterator to the first element not less than value." },
      { name: "std::upper_bound", signature: "ForwardIt upper_bound(ForwardIt first, ForwardIt last, const T& value);", complexity: "O(log N)", description: "Returns iterator to the first element strictly greater than value." },
      { name: "std::max_element", signature: "ForwardIt max_element(ForwardIt first, ForwardIt last);", complexity: "O(N)", description: "Finds the largest element in range." },
    ],
    codeSnippet: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> arr = {5, 2, 8, 1, 9};
    std::sort(arr.begin(), arr.end());
    auto it = std::lower_bound(arr.begin(), arr.end(), 5);
    std::cout << "Index: " << (it - arr.begin()) << std::endl;
    return 0;
}`,
  },
  {
    header: "<unordered_map>",
    category: "Associative Containers",
    description: "Hash-table-based key-value dictionary using separate chaining for collision resolution.",
    commonFunctions: [
      { name: "operator[]", signature: "T& operator[](const Key& key);", complexity: "O(1) avg / O(N) worst", description: "Inserts default value if key not present, returns reference." },
      { name: "find", signature: "iterator find(const Key& key);", complexity: "O(1) avg", description: "Locates element with key or returns end()." },
      { name: "count", signature: "size_type count(const Key& key) const;", complexity: "O(1) avg", description: "Returns 1 if key exists, 0 otherwise." },
    ],
    codeSnippet: `#include <iostream>
#include <unordered_map>

int main() {
    std::unordered_map<std::string, int> freq;
    freq["apple"]++;
    freq["banana"] = 5;
    if (freq.find("apple") != freq.end()) {
        std::cout << "Apple count: " << freq["apple"] << std::endl;
    }
    return 0;
}`,
  },
  {
    header: "<queue>",
    category: "Container Adapters",
    description: "Implements FIFO queues and heap-based priority queues (`std::priority_queue`).",
    commonFunctions: [
      { name: "std::priority_queue::push", signature: "void push(const T& val);", complexity: "O(log N)", description: "Inserts into binary max-heap (or min-heap)." },
      { name: "std::priority_queue::top", signature: "const_reference top() const;", complexity: "O(1)", description: "Returns the root element without removing it." },
      { name: "std::priority_queue::pop", signature: "void pop();", complexity: "O(log N)", description: "Removes root and sifts down last leaf." },
    ],
    codeSnippet: `#include <iostream>
#include <queue>
#include <vector>

int main() {
    // Min-heap
    std::priority_queue<int, std::vector<int>, std::greater<int>> minHeap;
    minHeap.push(10);
    minHeap.push(5);
    minHeap.push(20);
    std::cout << "Min top: " << minHeap.top() << std::endl; // 5
    return 0;
}`,
  },
  {
    header: "<stack>",
    category: "Container Adapters",
    description: "LIFO container adapter built on top of std::deque by default.",
    commonFunctions: [
      { name: "push", signature: "void push(const T& val);", complexity: "O(1)", description: "Pushes element onto the top." },
      { name: "top", signature: "reference top();", complexity: "O(1)", description: "Returns reference to the top element." },
      { name: "pop", signature: "void pop();", complexity: "O(1)", description: "Pops top element from the stack." },
    ],
    codeSnippet: `#include <iostream>
#include <stack>

int main() {
    std::stack<int> st;
    st.push(1);
    st.push(2);
    std::cout << "Top: " << st.top() << std::endl; // 2
    st.pop();
    return 0;
}`,
  },
  {
    header: "<set>",
    category: "Ordered Associative Containers",
    description: "Self-balancing Red-Black tree maintaining strictly ordered unique elements.",
    commonFunctions: [
      { name: "insert", signature: "std::pair<iterator,bool> insert(const value_type& val);", complexity: "O(log N)", description: "Inserts value while preserving balanced tree invariant." },
      { name: "lower_bound", signature: "iterator lower_bound(const Key& key) const;", complexity: "O(log N)", description: "Returns first node with key >= target." },
      { name: "erase", signature: "size_type erase(const Key& key);", complexity: "O(log N)", description: "Removes element from balanced tree." },
    ],
    codeSnippet: `#include <iostream>
#include <set>

int main() {
    std::set<int> s = {30, 10, 20};
    for (int x : s) std::cout << x << " "; // 10 20 30
    return 0;
}`,
  },
  {
    header: "<numeric>",
    category: "Mathematical & Accumulation",
    description: "Generalized numerical operations including prefix reduction, gcd, lcm, inner product, and iota fill.",
    commonFunctions: [
      { name: "std::accumulate", signature: "T accumulate(InputIt first, InputIt last, T init);", complexity: "O(N)", description: "Calculates total sum of range with initial value." },
      { name: "std::gcd", signature: "constexpr Common gcd(M m, N n);", complexity: "O(log(min(M, N)))", description: "Euclidean greatest common divisor." },
      { name: "std::iota", signature: "void iota(ForwardIt first, ForwardIt last, T value);", complexity: "O(N)", description: "Fills range with sequential increments." },
    ],
    codeSnippet: `#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> nums(5);
    std::iota(nums.begin(), nums.end(), 1); // 1, 2, 3, 4, 5
    int sum = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "Sum: " << sum << ", GCD(12, 18): " << std::gcd(12, 18) << std::endl;
    return 0;
}`,
  },
  {
    header: "<bitset>",
    category: "Bitwise Optimization",
    description: "Fixed-size sequence of N bits packed 64-bits per machine word for ultra-fast bitwise math.",
    commonFunctions: [
      { name: "count", signature: "size_t count() const noexcept;", complexity: "O(N / 64) via POPCNT", description: "Returns the number of set bits (1s)." },
      { name: "test", signature: "bool test(size_t pos) const;", complexity: "O(1)", description: "Checks if bit at position is set." },
      { name: "set", signature: "bitset& set(size_t pos, bool val = true);", complexity: "O(1)", description: "Sets bit at position." },
    ],
    codeSnippet: `#include <iostream>
#include <bitset>

int main() {
    std::bitset<32> mask(0);
    mask.set(3);
    mask.set(5);
    std::cout << "Mask: " << mask << " | Count: " << mask.count() << std::endl;
    return 0;
}`,
  },
];

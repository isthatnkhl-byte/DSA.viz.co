# High-Performance C++ Compiler Sandbox & Standard Package Explorer

DSA.viz includes a dedicated C++20 compiler sandbox designed to benchmark code against canonical test suites and provide instant standard library reference.

---

## 1. Multi-Sandbox Architecture

```
[Client C++ Code] ──► [executeCppCode RPC]
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            [Piston Sandbox]    [Wandbox Clang/GCC]
             (Low-latency API)   (Deep Flag Customization)
                    │                   │
                    └─────────┬─────────┘
                              ▼
                     [Telemetry Parser]
                    (Stdout, Stderr, CPU ms, Memory KB)
```

---

## 2. 16-Header Standard Package Explorer

The platform embeds an interactive reference tree for the 16 most vital standard library headers used in competitive programming and interview coding:

1. `<vector>`: Dynamic resizing, `.emplace_back()`, `.reserve()`, iterator arithmetic.
2. `<algorithm>`: `std::sort`, `std::lower_bound`, `std::upper_bound`, `std::next_permutation`, `std::max_element`.
3. `<unordered_map>`: $O(1)$ average hash table, `.find()`, bucket count, custom hash functions.
4. `<queue>`: `std::queue` (FIFO) and `std::priority_queue` (Max-heap, Min-heap with `std::greater<T>`).
5. `<stack>`: LIFO container adapter, `.push()`, `.pop()`, `.top()`.
6. `<set>` & `<unordered_set>`: Red-Black tree ordered sets ($O(\log N)$) vs Hash sets ($O(1)$).
7. `<iostream>`: Fast I/O optimizations (`ios::sync_with_stdio(0); cin.tie(0);`).
8. `<numeric>`: `std::accumulate`, `std::gcd`, `std::lcm`, `std::iota`.
9. `<cmath>`: Geometric & logarithmic arithmetic (`std::pow`, `std::sqrt`, `std::log2`).
10. `<deque>`: Double-ended queue with $O(1)$ front/back operations.
11. `<list>`: Doubly-linked list for constant time node splicing (used in LRU Cache).
12. `<utility>`: `std::pair`, `std::make_pair`, `std::move`.
13. `<string>`: String slicing, `.substr()`, `.find()`, `.append()`.
14. `<tuple>`: Multi-element tuples and `std::tie` destructuring.
15. `<bitset>`: High-speed bit arrays for fast subset operations ($O(N/64)$).
16. `<climits>`: Numerical limit constants (`INT_MAX`, `INT_MIN`, `LLONG_MAX`).

---

## 3. Compiler Flag Profiles

Users can toggle execution configurations:
- **Fast Testing (`-O0 -g`):** Fast compilation time for rapid iterative debugging.
- **Release Optimization (`-O2 -std=c++20`):** Inlining and loop vectorization matching LeetCode and Codeforces judge environments.
- **Maximum Vectorization (`-O3 -march=native`):** SIMD vectorization benchmarking for performance comparison.

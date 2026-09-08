import type { CppTemplate, SupportedLanguage } from "./compiler.types";

export const PLAIN_CPP_STARTER = `#include <iostream>

using namespace std;

int main() {
    // Write your custom C++ code here
    cout << "Hello, World!" << endl;
    
    return 0;
}
`;

export const PLAIN_CPP_IO_TEMPLATE = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

int main() {
    // Fast I/O for competitive programming & custom DSA
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int a, b;
    if (cin >> a >> b) {
        cout << "Sum: " << (a + b) << endl;
        cout << "Product: " << (a * b) << endl;
    } else {
        cout << "Hello, C++ Playground!" << endl;
        cout << "(Pass input in the 'Standard Input (stdin)' panel below to test cin)" << endl;
    }
    
    return 0;
}
`;

export const CPP_DSA_TEMPLATES: CppTemplate[] = [
  {
    id: "starter-io",
    title: "🚀 Starter Fast I/O Boilerplate",
    category: "Basics",
    difficulty: "Easy",
    description:
      "Standard C++ template with fast I/O and essential headers for competitive programming & DSA.",
    defaultStdin: "5\n10 20 30 40 50",
    code: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

void solve() {
    int n;
    if (!(cin >> n)) return;
    
    vector<int> a(n);
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
    }
    
    cout << "Array size: " << n << endl;
    cout << "Elements: ";
    for (int x : a) {
        cout << x << " ";
    }
    cout << endl;
}

int main() {
    // Fast I/O for DSA & Competitive Programming
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    cout << "=== Welcome to Online C++ Compiler ===" << endl;
    solve();
    
    return 0;
}`,
  },
  {
    id: "two-pointers",
    title: "🔢 Two Pointers (Two Sum on Sorted Array)",
    category: "Arrays & Pointers",
    difficulty: "Easy",
    description:
      "Classic Two Pointers algorithm to find two numbers that add up to a target sum in O(N) time and O(1) space.",
    defaultStdin: "6 14\n2 3 5 8 11 15",
    code: `#include <iostream>
#include <vector>

using namespace std;

// Returns 1-based indices of the two numbers that sum up to target
pair<int, int> twoSum(const vector<int>& nums, int target) {
    int left = 0;
    int right = (int)nums.size() - 1;
    
    while (left < right) {
        int currentSum = nums[left] + nums[right];
        if (currentSum == target) {
            return {left + 1, right + 1};
        } else if (currentSum < target) {
            left++;
        } else {
            right--;
        }
    }
    return {-1, -1};
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n, target;
    if (cin >> n >> target) {
        vector<int> nums(n);
        for (int i = 0; i < n; ++i) {
            cin >> nums[i];
        }
        
        pair<int, int> result = twoSum(nums, target);
        if (result.first != -1) {
            cout << "Found target " << target << " at 1-based indices: (" 
                 << result.first << ", " << result.second << ")" << endl;
            cout << "Values: " << nums[result.first - 1] << " + " << nums[result.second - 1] 
                 << " = " << target << endl;
        } else {
            cout << "No two sum solution found for target " << target << endl;
        }
    }
    return 0;
}`,
  },
  {
    id: "binary-search",
    title: "🔍 Binary Search & Lower Bound",
    category: "Algorithms",
    difficulty: "Easy",
    description: "Classic logarithmic search O(log N) on sorted data with bounds checking.",
    defaultStdin: "7 28\n4 9 15 21 28 35 42",
    code: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int customBinarySearch(const vector<int>& arr, int target) {
    int low = 0;
    int high = (int)arr.size() - 1;
    
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n, target;
    if (cin >> n >> target) {
        vector<int> arr(n);
        for (int i = 0; i < n; ++i) cin >> arr[i];
        
        cout << "Sorted Array: ";
        for (int x : arr) cout << x << " ";
        cout << "\nSearching for: " << target << endl;
        
        int idx = customBinarySearch(arr, target);
        if (idx != -1) {
            cout << "Target found at 0-based index: " << idx << endl;
        } else {
            cout << "Target NOT found in array." << endl;
        }
        
        // STL comparison
        auto it = lower_bound(arr.begin(), arr.end(), target);
        cout << "STL std::lower_bound index: " << (it - arr.begin()) << endl;
    }
    return 0;
}`,
  },
  {
    id: "linked-list",
    title: "🔗 Singly Linked List (Insertion, Reverse & Traversal)",
    category: "Data Structures",
    difficulty: "Medium",
    description:
      "Raw pointer-based singly linked list implementation with node creation, reversal, and memory cleanup.",
    defaultStdin: "5\n10 20 30 40 50",
    code: `#include <iostream>

using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x) : val(x), next(nullptr) {}
};

// Insert at tail
void insertTail(ListNode*& head, int val) {
    ListNode* newNode = new ListNode(val);
    if (!head) {
        head = newNode;
        return;
    }
    ListNode* curr = head;
    while (curr->next) curr = curr->next;
    curr->next = newNode;
}

// Print Linked List
void printList(ListNode* head, const string& label) {
    cout << label << ": ";
    ListNode* curr = head;
    while (curr) {
        cout << curr->val << (curr->next ? " -> " : " -> NULL\n");
        curr = curr->next;
    }
}

// Reverse Linked List in O(N) time and O(1) space
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;
    while (curr) {
        ListNode* nextTemp = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
}

// Free allocated memory
void freeList(ListNode* head) {
    while (head) {
        ListNode* temp = head;
        head = head->next;
        delete temp;
    }
}

int main() {
    int n;
    if (cin >> n) {
        ListNode* head = nullptr;
        for (int i = 0; i < n; ++i) {
            int val;
            cin >> val;
            insertTail(head, val);
        }
        
        printList(head, "Original List");
        head = reverseList(head);
        printList(head, "Reversed List");
        
        freeList(head);
    }
    return 0;
}`,
  },
  {
    id: "binary-tree",
    title: "🌳 Binary Search Tree (Insert & Traversals)",
    category: "Trees & Graphs",
    difficulty: "Medium",
    description:
      "Binary Search Tree construction with Inorder, Preorder, and Level-order BFS traversal.",
    defaultStdin: "7\n50 30 70 20 40 60 80",
    code: `#include <iostream>
#include <queue>

using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

TreeNode* insert(TreeNode* root, int val) {
    if (!root) return new TreeNode(val);
    if (val < root->val) {
        root->left = insert(root->left, val);
    } else {
        root->right = insert(root->right, val);
    }
    return root;
}

// Inorder traversal produces sorted order for BST
void inorder(TreeNode* root) {
    if (!root) return;
    inorder(root->left);
    cout << root->val << " ";
    inorder(root->right);
}

// Level Order (BFS) traversal
void levelOrder(TreeNode* root) {
    if (!root) return;
    queue<TreeNode*> q;
    q.push(root);
    
    while (!q.empty()) {
        int sz = q.size();
        for (int i = 0; i < sz; ++i) {
            TreeNode* curr = q.front();
            q.pop();
            cout << curr->val << " ";
            if (curr->left) q.push(curr->left);
            if (curr->right) q.push(curr->right);
        }
        cout << "| ";
    }
    cout << endl;
}

int main() {
    int n;
    if (cin >> n) {
        TreeNode* root = nullptr;
        cout << "Inserting keys: ";
        for (int i = 0; i < n; ++i) {
            int val;
            cin >> val;
            cout << val << " ";
            root = insert(root, val);
        }
        cout << endl;
        
        cout << "Inorder Traversal (Sorted): ";
        inorder(root);
        cout << endl;
        
        cout << "Level-Order (BFS) Traversal: ";
        levelOrder(root);
    }
    return 0;
}`,
  },
  {
    id: "graph-bfs-dfs",
    title: "🕸️ Graph Adjacency List (BFS & DFS)",
    category: "Trees & Graphs",
    difficulty: "Medium",
    description:
      "Unweighted graph representation using adjacency list with Breadth-First Search and Depth-First Search.",
    defaultStdin: "5 6\n0 1\n0 2\n1 3\n2 3\n2 4\n3 4",
    code: `#include <iostream>
#include <vector>
#include <queue>

using namespace std;

void bfs(int start, const vector<vector<int>>& adj, int n) {
    vector<bool> visited(n, false);
    queue<int> q;
    
    visited[start] = true;
    q.push(start);
    
    cout << "BFS Traversal from node " << start << ": ";
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        cout << u << " ";
        
        for (int v : adj[u]) {
            if (!visited[v]) {
                visited[v] = true;
                q.push(v);
            }
        }
    }
    cout << endl;
}

void dfsHelper(int u, const vector<vector<int>>& adj, vector<bool>& visited) {
    visited[u] = true;
    cout << u << " ";
    for (int v : adj[u]) {
        if (!visited[v]) {
            dfsHelper(v, adj, visited);
        }
    }
}

int main() {
    int n, m;
    if (cin >> n >> m) {
        vector<vector<int>> adj(n);
        for (int i = 0; i < m; ++i) {
            int u, v;
            cin >> u >> v;
            adj[u].push_back(v);
            adj[v].push_back(u); // Undirected graph
        }
        
        cout << "Graph built with " << n << " nodes and " << m << " edges." << endl;
        bfs(0, adj, n);
        
        vector<bool> visited(n, false);
        cout << "DFS Traversal from node 0: ";
        dfsHelper(0, adj, visited);
        cout << endl;
    }
    return 0;
}`,
  },
  {
    id: "dijkstra",
    title: "⚡ Dijkstra's Shortest Path",
    category: "Trees & Graphs",
    difficulty: "Hard",
    description:
      "Single-source shortest path algorithm using priority_queue min-heap in O((V + E) log V).",
    defaultStdin: "5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 4 5\n3 4 3\n0",
    code: `#include <iostream>
#include <vector>
#include <queue>
#include <climits>

using namespace std;

const int INF = 1e9;

void dijkstra(int startNode, int n, const vector<vector<pair<int, int>>>& adj) {
    vector<int> dist(n, INF);
    // Min-heap: stores {distance, node}
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    
    dist[startNode] = 0;
    pq.push({0, startNode});
    
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        
        if (d > dist[u]) continue;
        
        for (auto& edge : adj[u]) {
            int v = edge.first;
            int weight = edge.second;
            
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                pq.push({dist[v], v});
            }
        }
    }
    
    cout << "Shortest distances from source node " << startNode << ":\n";
    for (int i = 0; i < n; ++i) {
        cout << "Node " << i << " -> ";
        if (dist[i] == INF) cout << "INF (Unreachable)\n";
        else cout << dist[i] << "\n";
    }
}

int main() {
    int n, m;
    if (cin >> n >> m) {
        vector<vector<pair<int, int>>> adj(n);
        for (int i = 0; i < m; ++i) {
            int u, v, w;
            cin >> u >> v >> w;
            adj[u].push_back({v, w});
            adj[v].push_back({u, w});
        }
        int source;
        cin >> source;
        dijkstra(source, n, adj);
    }
    return 0;
}`,
  },
  {
    id: "monotonic-stack",
    title: "📊 Monotonic Stack (Next Greater Element)",
    category: "Data Structures",
    difficulty: "Medium",
    description:
      "Monotonic decreasing stack to find the next strictly greater element for each array item in O(N).",
    defaultStdin: "6\n4 5 2 25 7 8",
    code: `#include <iostream>
#include <vector>
#include <stack>

using namespace std;

vector<int> nextGreaterElements(const vector<int>& arr) {
    int n = arr.size();
    vector<int> result(n, -1);
    stack<int> st; // stores indices
    
    for (int i = 0; i < n; ++i) {
        while (!st.empty() && arr[st.top()] < arr[i]) {
            result[st.top()] = arr[i];
            st.pop();
        }
        st.push(i);
    }
    return result;
}

int main() {
    int n;
    if (cin >> n) {
        vector<int> arr(n);
        for (int i = 0; i < n; ++i) cin >> arr[i];
        
        vector<int> nge = nextGreaterElements(arr);
        
        cout << "Input Array:         ";
        for (int x : arr) cout << x << "\t";
        cout << "\nNext Greater Element:";
        for (int x : nge) cout << x << "\t";
        cout << endl;
    }
    return 0;
}`,
  },
  {
    id: "dp-knapsack",
    title: "📦 0/1 Knapsack (Dynamic Programming)",
    category: "Dynamic Programming",
    difficulty: "Medium",
    description: "Classic 0/1 Knapsack problem solved using 2D DP memoization and tabulation.",
    defaultStdin: "4 7\n1 4\n3 5\n4 7\n5 9",
    code: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

// Solves 0/1 Knapsack in O(N * W) time and space
int knapsack(int W, const vector<int>& wt, const vector<int>& val, int n) {
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    
    for (int i = 1; i <= n; ++i) {
        for (int w = 0; w <= W; ++w) {
            if (wt[i - 1] <= w) {
                dp[i][w] = max(val[i - 1] + dp[i - 1][w - wt[i - 1]], dp[i - 1][w]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }
    return dp[n][W];
}

int main() {
    int n, W;
    if (cin >> n >> W) {
        vector<int> wt(n), val(n);
        for (int i = 0; i < n; ++i) {
            cin >> wt[i] >> val[i];
        }
        
        int maxVal = knapsack(W, wt, val, n);
        cout << "Knapsack Capacity: " << W << endl;
        cout << "Items (Weight, Value): ";
        for (int i = 0; i < n; ++i) {
            cout << "(" << wt[i] << ", " << val[i] << ") ";
        }
        cout << "\nMaximum Obtainable Value = " << maxVal << endl;
    }
    return 0;
}`,
  },
  {
    id: "dsu-union-find",
    title: "🌲 Disjoint Set Union (DSU / Union-Find)",
    category: "Data Structures",
    difficulty: "Medium",
    description:
      "Disjoint Set Union with Path Compression & Union by Rank for fast connectivity and Kruskal's MST.",
    defaultStdin: "6 5\n1 2\n2 3\n4 5\n1 3\n5 6",
    code: `#include <iostream>
#include <vector>

using namespace std;

class DSU {
private:
    vector<int> parent;
    vector<int> rank;

public:
    DSU(int n) {
        parent.resize(n + 1);
        rank.resize(n + 1, 0);
        for (int i = 0; i <= n; ++i) parent[i] = i;
    }
    
    // Find with Path Compression: O(alpha(N)) ~ O(1)
    int find(int u) {
        if (u == parent[u]) return u;
        return parent[u] = find(parent[u]);
    }
    
    // Union by Rank
    bool unite(int u, int v) {
        int rootU = find(u);
        int rootV = find(v);
        if (rootU == rootV) return false; // Already in same component (cycle)
        
        if (rank[rootU] < rank[rootV]) {
            parent[rootU] = rootV;
        } else if (rank[rootU] > rank[rootV]) {
            parent[rootV] = rootU;
        } else {
            parent[rootV] = rootU;
            rank[rootU]++;
        }
        return true;
    }
};

int main() {
    int n, operations;
    if (cin >> n >> operations) {
        DSU dsu(n);
        cout << "Initialized DSU with " << n << " elements.\n";
        
        for (int i = 0; i < operations; ++i) {
            int u, v;
            cin >> u >> v;
            bool merged = dsu.unite(u, v);
            cout << "Unite(" << u << ", " << v << "): " 
                 << (merged ? "Connected new component" : "Already connected (Cycle detected!)") 
                 << endl;
        }
    }
    return 0;
}`,
  },
  {
    id: "sliding-window",
    title: "🪟 Sliding Window (Maximum Sum Subarray)",
    category: "Arrays & Pointers",
    difficulty: "Easy",
    description:
      "Finds the maximum sum of any contiguous subarray of size K in O(N) time.",
    defaultStdin: "7 3\n2 1 5 1 3 2 2",
    code: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int maxSubarraySum(const vector<int>& arr, int k) {
    int n = arr.size();
    if (n < k) return -1;
    
    int maxSum = 0, currentSum = 0;
    
    // Compute sum of first window of size k
    for (int i = 0; i < k; i++) {
        currentSum += arr[i];
    }
    maxSum = currentSum;
    
    // Slide the window
    for (int i = k; i < n; i++) {
        currentSum += arr[i] - arr[i - k];
        maxSum = max(maxSum, currentSum);
    }
    
    return maxSum;
}

int main() {
    int n, k;
    if (cin >> n >> k) {
        vector<int> arr(n);
        for (int i = 0; i < n; ++i) {
            cin >> arr[i];
        }
        
        int result = maxSubarraySum(arr, k);
        cout << "Maximum sum of a subarray of size " << k << " is: " << result << endl;
    }
    return 0;
}`,
  },
  {
    id: "merge-sort",
    title: "🔪 Merge Sort (Divide & Conquer)",
    category: "Algorithms",
    difficulty: "Medium",
    description:
      "Classic stable O(N log N) sorting algorithm using the divide and conquer paradigm.",
    defaultStdin: "8\n12 11 13 5 6 7 3 1",
    code: `#include <iostream>
#include <vector>

using namespace std;

void merge(vector<int>& arr, int left, int mid, int right) {
    int n1 = mid - left + 1;
    int n2 = right - mid;
    
    vector<int> L(n1), R(n2);
    
    for (int i = 0; i < n1; i++) L[i] = arr[left + i];
    for (int j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];
    
    int i = 0, j = 0, k = left;
    while (i < n1 && j < n2) {
        if (L[i] <= R[j]) {
            arr[k++] = L[i++];
        } else {
            arr[k++] = R[j++];
        }
    }
    
    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];
}

void mergeSort(vector<int>& arr, int left, int right) {
    if (left >= right) return;
    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

int main() {
    int n;
    if (cin >> n) {
        vector<int> arr(n);
        for (int i = 0; i < n; i++) cin >> arr[i];
        
        cout << "Original array: ";
        for (int x : arr) cout << x << " ";
        cout << "\\n";
        
        mergeSort(arr, 0, n - 1);
        
        cout << "Sorted array:   ";
        for (int x : arr) cout << x << " ";
        cout << "\\n";
    }
    return 0;
}`,
  },
  {
    id: "topological-sort",
    title: "🧭 Topological Sort (Kahn's Algorithm)",
    category: "Trees & Graphs",
    difficulty: "Medium",
    description:
      "Finds a linear ordering of vertices in a Directed Acyclic Graph (DAG) using BFS.",
    defaultStdin: "6 6\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1",
    code: `#include <iostream>
#include <vector>
#include <queue>

using namespace std;

vector<int> topologicalSort(int V, vector<vector<int>>& adj) {
    vector<int> inDegree(V, 0);
    for (int u = 0; u < V; u++) {
        for (int v : adj[u]) {
            inDegree[v]++;
        }
    }
    
    queue<int> q;
    for (int i = 0; i < V; i++) {
        if (inDegree[i] == 0) q.push(i);
    }
    
    vector<int> topoOrder;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        topoOrder.push_back(u);
        
        for (int v : adj[u]) {
            if (--inDegree[v] == 0) {
                q.push(v);
            }
        }
    }
    
    if (topoOrder.size() != V) {
        return {}; // Cycle detected
    }
    return topoOrder;
}

int main() {
    int V, E;
    if (cin >> V >> E) {
        vector<vector<int>> adj(V);
        for (int i = 0; i < E; i++) {
            int u, v;
            cin >> u >> v; // Directed edge from u to v
            adj[u].push_back(v);
        }
        
        vector<int> order = topologicalSort(V, adj);
        
        if (order.empty()) {
            cout << "Graph contains a cycle! Topological sort not possible." << endl;
        } else {
            cout << "Topological Sort Order: ";
            for (int node : order) cout << node << " ";
            cout << endl;
        }
    }
    return 0;
}`,
  },
  {
    id: "backtracking-subsets",
    title: "🔙 Backtracking (Generate Subsets)",
    category: "Algorithms",
    difficulty: "Medium",
    description:
      "Generates all possible subsets (the power set) of a given array using backtracking.",
    defaultStdin: "3\n1 2 3",
    code: `#include <iostream>
#include <vector>

using namespace std;

void generateSubsets(int index, vector<int>& nums, vector<int>& current, vector<vector<int>>& result) {
    result.push_back(current);
    
    for (int i = index; i < nums.size(); i++) {
        current.push_back(nums[i]);
        generateSubsets(i + 1, nums, current, result);
        current.pop_back(); // backtrack
    }
}

int main() {
    int n;
    if (cin >> n) {
        vector<int> nums(n);
        for (int i = 0; i < n; i++) cin >> nums[i];
        
        vector<vector<int>> result;
        vector<int> current;
        generateSubsets(0, nums, current, result);
        
        cout << "All Subsets (" << result.size() << " total):\\n";
        for (const auto& subset : result) {
            cout << "[ ";
            for (int val : subset) cout << val << " ";
            cout << "]\\n";
        }
    }
    return 0;
}`,
  }
];

// ==========================================
// C Templates & Starters
// ==========================================

export const PLAIN_C_STARTER = `#include <stdio.h>

int main() {
    // Write your custom C code here
    printf("Hello, World!\\n");
    
    return 0;
}
`;

export const PLAIN_C_IO_TEMPLATE = `#include <stdio.h>

int main() {
    // Standard I/O in C
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("Sum: %d\\n", a + b);
        printf("Product: %d\\n", a * b);
    } else {
        printf("Hello, C Playground!\\n");
        printf("(Pass input in the 'Input (stdin)' panel below to test scanf)\\n");
    }
    
    return 0;
}
`;

export const C_DSA_TEMPLATES: CppTemplate[] = [
  {
    id: "c-starter-io",
    title: "🚀 Starter I/O Boilerplate (C)",
    category: "Basics",
    difficulty: "Easy",
    description: "Standard C template with fast scanf/printf I/O for DSA practice.",
    defaultStdin: "5\n10 20 30 40 50",
    code: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) {
        printf("Please provide array size n.\\n");
        return 0;
    }

    int* arr = (int*)malloc(n * sizeof(int));
    long long sum = 0;
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
        sum += arr[i];
    }

    printf("=== C Array Statistics ===\\n");
    printf("Elements count: %d\\n", n);
    printf("Total sum: %lld\\n", sum);
    printf("Average: %.2f\\n", (double)sum / n);

    free(arr);
    return 0;
}`,
  },
  {
    id: "c-two-sum",
    title: "🔢 Two Pointers (C)",
    category: "Arrays & Pointers",
    difficulty: "Easy",
    description: "Find two numbers in a sorted array that sum up to target using pointers in O(N).",
    defaultStdin: "6 14\n2 3 5 8 11 15",
    code: `#include <stdio.h>
#include <stdbool.h>

bool twoSumSorted(int arr[], int n, int target, int* out1, int* out2) {
    int left = 0;
    int right = n - 1;
    while (left < right) {
        int current = arr[left] + arr[right];
        if (current == target) {
            *out1 = arr[left];
            *out2 = arr[right];
            return true;
        } else if (current < target) {
            left++;
        } else {
            right--;
        }
    }
    return false;
}

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) == 2) {
        int arr[100];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

        int v1, v2;
        if (twoSumSorted(arr, n, target, &v1, &v2)) {
            printf("Found pair: %d + %d = %d\\n", v1, v2, target);
        } else {
            printf("No pair found for target %d\\n", target);
        }
    }
    return 0;
}`,
  },
  {
    id: "c-binary-search",
    title: "🔍 Binary Search (C)",
    category: "Algorithms",
    difficulty: "Easy",
    description: "Iterative binary search with O(log N) runtime on a sorted array.",
    defaultStdin: "7 23\n4 8 15 16 23 42 108",
    code: `#include <stdio.h>

int binarySearch(int arr[], int n, int target) {
    int low = 0, high = n - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) == 2) {
        int arr[100];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

        int idx = binarySearch(arr, n, target);
        if (idx != -1) {
            printf("Element %d found at 0-based index: %d\\n", target, idx);
        } else {
            printf("Element %d not present in array.\\n", target);
        }
    }
    return 0;
}`,
  },
  {
    id: "c-linked-list",
    title: "🔗 Singly Linked List (C)",
    category: "Data Structures",
    difficulty: "Medium",
    description: "Node allocation, prepend, append, and display operations using dynamic memory.",
    defaultStdin: "4\n10 20 30 40",
    code: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int data;
    struct Node* next;
} Node;

Node* createNode(int val) {
    Node* newNode = (Node*)malloc(sizeof(Node));
    newNode->data = val;
    newNode->next = NULL;
    return newNode;
}

void append(Node** head, int val) {
    Node* newNode = createNode(val);
    if (*head == NULL) {
        *head = newNode;
        return;
    }
    Node* curr = *head;
    while (curr->next) curr = curr->next;
    curr->next = newNode;
}

void printList(Node* head) {
    Node* curr = head;
    while (curr) {
        printf("%d -> ", curr->data);
        curr = curr->next;
    }
    printf("NULL\\n");
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        Node* head = NULL;
        for (int i = 0; i < n; i++) {
            int val;
            scanf("%d", &val);
            append(&head, val);
        }
        printf("Constructed Linked List:\\n");
        printList(head);
    }
    return 0;
}`,
  },
  {
    id: "c-quick-sort",
    title: "⚡ In-Place Quick Sort (C)",
    category: "Algorithms",
    difficulty: "Medium",
    description: "Hoare or Lomuto partitioning scheme for classic O(N log N) sorting.",
    defaultStdin: "6\n64 25 12 22 11 90",
    code: `#include <stdio.h>

void swap(int* a, int* b) {
    int t = *a;
    *a = *b;
    *b = t;
}

int partition(int arr[], int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[high]);
    return i + 1;
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

int main() {
    int n;
    if (scanf("%d", &n) == 1) {
        int arr[100];
        for (int i = 0; i < n; i++) scanf("%d", &arr[i]);

        printf("Original: ");
        for (int i = 0; i < n; i++) printf("%d ", arr[i]);
        printf("\\n");

        quickSort(arr, 0, n - 1);

        printf("Sorted:   ");
        for (int i = 0; i < n; i++) printf("%d ", arr[i]);
        printf("\\n");
    }
    return 0;
}`,
  }
];

// ==========================================
// Java Templates & Starters
// ==========================================

export const PLAIN_JAVA_STARTER = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your custom Java code here
        System.out.println("Hello, World!");
    }
}
`;

export const PLAIN_JAVA_IO_TEMPLATE = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Standard I/O with Scanner
        Scanner sc = new Scanner(System.in);
        
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println("Sum: " + (a + b));
            System.out.println("Product: " + (a * b));
        } else {
            System.out.println("Hello, Java Playground!");
            System.out.println("(Enter input in the 'Input (stdin)' panel below to test Scanner)");
        }
    }
}
`;

export const JAVA_DSA_TEMPLATES: CppTemplate[] = [
  {
    id: "java-starter-io",
    title: "🚀 Starter Fast I/O Boilerplate (Java)",
    category: "Basics",
    difficulty: "Easy",
    description: "Standard Java template with Scanner and array processing.",
    defaultStdin: "5\n10 20 30 40 50",
    code: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) {
            System.out.println("Please provide array size n.");
            return;
        }

        int n = sc.nextInt();
        int[] arr = new int[n];
        long sum = 0;

        for (int i = 0; i < n; i++) {
            arr[i] = sc.nextInt();
            sum += arr[i];
        }

        System.out.println("=== Java Array Statistics ===");
        System.out.println("Size: " + n);
        System.out.println("Elements: " + Arrays.toString(arr));
        System.out.println("Total Sum: " + sum);
        System.out.printf("Average: %.2f\\n", (double) sum / n);
    }
}`,
  },
  {
    id: "java-two-sum",
    title: "🔢 Two Sum (HashMap O(N))",
    category: "Arrays & Pointers",
    difficulty: "Easy",
    description: "Hash map lookup for two numbers adding up to target in O(N) time and O(N) space.",
    defaultStdin: "5 9\n2 7 11 15 3",
    code: `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] { -1, -1 };
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int target = sc.nextInt();
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = sc.nextInt();

            int[] res = twoSum(nums, target);
            if (res[0] != -1) {
                System.out.printf("Found pair at indices [%d, %d]: %d + %d = %d\\n",
                    res[0], res[1], nums[res[0]], nums[res[1]], target);
            } else {
                System.out.println("No matching pair found for target " + target);
            }
        }
    }
}`,
  },
  {
    id: "java-binary-search",
    title: "🔍 Binary Search (Java)",
    category: "Algorithms",
    difficulty: "Easy",
    description: "Classic iterative binary search implementation on sorted integers.",
    defaultStdin: "6 33\n11 22 33 44 55 66",
    code: `import java.util.*;

public class Main {
    public static int binarySearch(int[] arr, int target) {
        int low = 0, high = arr.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (arr[mid] == target) return mid;
            if (arr[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int target = sc.nextInt();
            int[] arr = new int[n];
            for (int i = 0; i < n; i++) arr[i] = sc.nextInt();

            int idx = binarySearch(arr, target);
            if (idx != -1) {
                System.out.printf("Found %d at 0-based index: %d\\n", target, idx);
            } else {
                System.out.printf("%d not found in array\\n", target);
            }
        }
    }
}`,
  },
  {
    id: "java-priority-queue",
    title: "🏔️ Top K Frequent Elements (Min-Heap)",
    category: "Data Structures",
    difficulty: "Medium",
    description: "Frequency bucket count and Min-Heap PriorityQueue to find top K frequent values in O(N log K).",
    defaultStdin: "6 2\n1 1 1 2 2 3",
    code: `import java.util.*;

public class Main {
    public static List<Integer> topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.put(x, count.getOrDefault(x, 0) + 1);

        PriorityQueue<Map.Entry<Integer, Integer>> minHeap =
            new PriorityQueue<>(Comparator.comparingInt(Map.Entry::getValue));

        for (Map.Entry<Integer, Integer> entry : count.entrySet()) {
            minHeap.offer(entry);
            if (minHeap.size() > k) minHeap.poll();
        }

        List<Integer> result = new ArrayList<>();
        while (!minHeap.isEmpty()) result.add(minHeap.poll().getKey());
        Collections.reverse(result);
        return result;
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int k = sc.nextInt();
            int[] nums = new int[n];
            for (int i = 0; i < n; i++) nums[i] = sc.nextInt();

            List<Integer> top = topKFrequent(nums, k);
            System.out.println("Top " + k + " frequent elements: " + top);
        }
    }
}`,
  },
  {
    id: "java-bfs-graph",
    title: "🌐 Breadth First Search (BFS Graph)",
    category: "Trees & Graphs",
    difficulty: "Medium",
    description: "Level order shortest path graph exploration using LinkedList Queue and Adjacency List.",
    defaultStdin: "5 4\n0 1\n0 2\n1 3\n2 4",
    code: `import java.util.*;

public class Main {
    public static void bfs(int start, Map<Integer, List<Integer>> adj, int n) {
        boolean[] visited = new boolean[n];
        Queue<Integer> queue = new LinkedList<>();

        visited[start] = true;
        queue.offer(start);

        System.out.print("BFS Traversal from " + start + ": ");
        while (!queue.isEmpty()) {
            int u = queue.poll();
            System.out.print(u + " ");

            for (int v : adj.getOrDefault(u, Collections.emptyList())) {
                if (!visited[v]) {
                    visited[v] = true;
                    queue.offer(v);
                }
            }
        }
        System.out.println();
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int m = sc.nextInt();
            Map<Integer, List<Integer>> adj = new HashMap<>();

            for (int i = 0; i < m; i++) {
                int u = sc.nextInt(), v = sc.nextInt();
                adj.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
                adj.computeIfAbsent(v, k -> new ArrayList<>()).add(u);
            }

            bfs(0, adj, n);
        }
    }
}`,
  }
];

// ==========================================
// Python Templates & Starters
// ==========================================

export const PLAIN_PYTHON_STARTER = `def main():
    # Write your custom Python code here
    print("Hello, World!")

if __name__ == "__main__":
    main()
`;

export const PLAIN_PYTHON_IO_TEMPLATE = `import sys

def main():
    # Fast I/O in Python using sys.stdin
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        a, b = int(tokens[0]), int(tokens[1])
        print(f"Sum: {a + b}")
        print(f"Product: {a * b}")
    else:
        print("Hello, Python Playground!")
        print("(Pass input in the 'Input (stdin)' panel below to test input)")

if __name__ == "__main__":
    main()
`;

export const PYTHON_DSA_TEMPLATES: CppTemplate[] = [
  {
    id: "python-starter-io",
    title: "🚀 Starter Fast I/O Boilerplate (Python)",
    category: "Basics",
    difficulty: "Easy",
    description: "Fast Python standard input processing with sys.stdin and list comprehension.",
    defaultStdin: "5\n10 20 30 40 50",
    code: `import sys

def main():
    data = sys.stdin.read().split()
    if not data:
        print("No input provided.")
        return

    n = int(data[0])
    nums = [int(x) for x in data[1:n+1]]

    total = sum(nums)
    avg = total / n if n > 0 else 0

    print(f"=== Python Array Statistics ===")
    print(f"Count: {n}")
    print(f"Elements: {nums}")
    print(f"Sum: {total}")
    print(f"Average: {avg:.2f}")

if __name__ == "__main__":
    main()`,
  },
  {
    id: "python-two-sum",
    title: "🔢 Two Sum (O(N) Hash Map)",
    category: "Arrays & Pointers",
    difficulty: "Easy",
    description: "Dictionary lookup for two indices adding up to target in O(N) linear time.",
    defaultStdin: "5 9\n2 7 11 15 3",
    code: `import sys

def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return seen[complement], i
        seen[num] = i
    return None

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        n = int(tokens[0])
        target = int(tokens[1])
        nums = [int(x) for x in tokens[2:2+n]]

        res = two_sum(nums, target)
        if res:
            print(f"Found indices: {res} -> {nums[res[0]]} + {nums[res[1]]} = {target}")
        else:
            print(f"No pair found that sums to {target}")

if __name__ == "__main__":
    main()`,
  },
  {
    id: "python-binary-search",
    title: "🔍 Binary Search (Python)",
    category: "Algorithms",
    difficulty: "Easy",
    description: "O(log N) iterative binary search on a sorted integer list.",
    defaultStdin: "7 23\n4 8 15 16 23 42 108",
    code: `import sys

def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        n = int(tokens[0])
        target = int(tokens[1])
        arr = [int(x) for x in tokens[2:2+n]]

        idx = binary_search(arr, target)
        if idx != -1:
            print(f"Target {target} found at index: {idx}")
        else:
            print(f"Target {target} not in array")

if __name__ == "__main__":
    main()`,
  },
  {
    id: "python-bfs-grid",
    title: "🗺️ 2D Grid Shortest Path BFS",
    category: "Trees & Graphs",
    difficulty: "Medium",
    description: "Breadth-First Search on a 2D matrix using collections.deque.",
    defaultStdin: "4 4\n0 0 0 0\n1 1 0 1\n0 0 0 0\n0 1 1 0",
    code: `import sys
from collections import deque

def shortest_path(grid):
    rows, cols = len(grid), len(grid[0])
    if grid[0][0] == 1 or grid[rows-1][cols-1] == 1:
        return -1

    queue = deque([(0, 0, 1)]) # (r, c, dist)
    visited = {(0, 0)}

    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]

    while queue:
        r, c, dist = queue.popleft()
        if r == rows - 1 and c == cols - 1:
            return dist

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0 and (nr, nc) not in visited:
                visited.add((nr, nc))
                queue.append((nr, nc, dist + 1))

    return -1

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        r, c = int(tokens[0]), int(tokens[1])
        grid = []
        idx = 2
        for _ in range(r):
            grid.append([int(tokens[idx + j]) for j in range(c)])
            idx += c

        ans = shortest_path(grid)
        print(f"Shortest path distance from (0,0) to ({r-1},{c-1}): {ans}")

if __name__ == "__main__":
    main()`,
  },
  {
    id: "python-heapq",
    title: "🏔️ Kth Largest Element (heapq)",
    category: "Data Structures",
    difficulty: "Medium",
    description: "Min-heap of size K using Python's built-in heapq module in O(N log K) time.",
    defaultStdin: "6 2\n3 2 1 5 6 4",
    code: `import sys
import heapq

def find_kth_largest(nums, k):
    # Maintain a min-heap of size k
    heap = []
    for num in nums:
        heapq.heappush(heap, num)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        n = int(tokens[0])
        k = int(tokens[1])
        nums = [int(x) for x in tokens[2:2+n]]

        res = find_kth_largest(nums, k)
        print(f"The {k}th largest element in {nums} is: {res}")

if __name__ == "__main__":
    main()`,
  },
  {
    id: "python-dp-knapsack",
    title: "🎒 0/1 Knapsack (Dynamic Programming)",
    category: "Dynamic Programming",
    difficulty: "Medium",
    description: "Classical 0/1 Knapsack problem solved with 1D space-optimized DP table.",
    defaultStdin: "4 7\n1 3 4 5\n1 4 5 7",
    code: `import sys

def knapsack(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for w, v in zip(weights, values):
        for cap in range(capacity, w - 1, -1):
            dp[cap] = max(dp[cap], dp[cap - w] + v)
    return dp[capacity]

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        n = int(tokens[0])
        cap = int(tokens[1])
        weights = [int(tokens[2 + i]) for i in range(n)]
        values = [int(tokens[2 + n + i]) for i in range(n)]

        max_val = knapsack(weights, values, cap)
        print(f"Max value for Knapsack capacity {cap}: {max_val}")

if __name__ == "__main__":
    main()`,
  }
];

// ==========================================
// Language Helper Functions
// ==========================================

export function getStarterForLanguage(lang: SupportedLanguage): string {
  switch (lang) {
    case "c":
      return PLAIN_C_STARTER;
    case "java":
      return PLAIN_JAVA_STARTER;
    case "python":
      return PLAIN_PYTHON_STARTER;
    case "cpp":
    default:
      return PLAIN_CPP_STARTER;
  }
}

export function getFastIoTemplateForLanguage(lang: SupportedLanguage): string {
  switch (lang) {
    case "c":
      return PLAIN_C_IO_TEMPLATE;
    case "java":
      return PLAIN_JAVA_IO_TEMPLATE;
    case "python":
      return PLAIN_PYTHON_IO_TEMPLATE;
    case "cpp":
    default:
      return PLAIN_CPP_IO_TEMPLATE;
  }
}

export function getTemplatesForLanguage(lang: SupportedLanguage): CppTemplate[] {
  switch (lang) {
    case "c":
      return C_DSA_TEMPLATES;
    case "java":
      return JAVA_DSA_TEMPLATES;
    case "python":
      return PYTHON_DSA_TEMPLATES;
    case "cpp":
    default:
      return CPP_DSA_TEMPLATES;
  }
}


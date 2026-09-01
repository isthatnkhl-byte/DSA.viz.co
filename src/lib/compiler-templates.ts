import type { CppTemplate } from "./compiler.types";

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

import type { PatternCodeLanguage, PatternId } from "./types";

export interface TestDriverBuildResult {
  wrappedCode: string;
  usedTestHarness: boolean;
  expectedFunctionName: string;
}

const EXPECTED_SYMBOLS: Record<PatternId, string> = {
  "two-pointers": "trap",
  "sliding-window": "minWindow",
  "fast-slow-pointers": "findDuplicate",
  "binary-search": "minEatingSpeed",
  "prefix-sum-hashmap": "subarraySum",
  "monotonic-stack": "largestRectangleArea",
  "intervals-sweep": "eraseOverlapIntervals",
  "heap-top-k": "MedianFinder",
  "trees-dfs-bfs": "lowestCommonAncestor",
  "graphs-topo-union-find": "canFinish",
  backtracking: "combinationSum2",
  "dynamic-programming": "minDistance",
};

function hasExpectedSymbol(code: string, patternId: PatternId): boolean {
  const sym = EXPECTED_SYMBOLS[patternId];
  return new RegExp(`\\b${sym}\\b`).test(code);
}

function cppPrelude(userCode: string, extraDefs = ""): string {
  const includes = userCode.includes("#include")
    ? ""
    : `#include <iostream>\n#include <vector>\n#include <string>\n#include <unordered_map>\n#include <unordered_set>\n#include <stack>\n#include <queue>\n#include <algorithm>\n#include <climits>\n#include <cmath>\nusing namespace std;\n`;
  return `${includes}${extraDefs}\n${userCode}\n`;
}

function pyPrelude(userCode: string, extraDefs = ""): string {
  return `from collections import defaultdict, deque, Counter\nimport heapq, math\n${extraDefs}\n${userCode}\n`;
}

function javaPrelude(userCode: string, extraDefs = ""): string {
  const imports = `import java.util.*;\n`;
  const wrappedClass =
    /\bclass\s+Solution\b|\bclass\s+MedianFinder\b/.test(userCode)
      ? userCode
      : `class Solution {\n${userCode}\n}`;
  return `${imports}${extraDefs}\n${wrappedClass}\n`;
}

const CPP_DRIVERS: Record<PatternId, string> = {
  "two-pointers": `
int main() {
  int pass = 0, total = 3;
  vector<int> a1{0,1,0,2,1,0,1,3,2,1,2,1};
  if (trap(a1) == 6) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  vector<int> a2{4,2,0,3,2,5};
  if (trap(a2) == 9) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  vector<int> a3{1,2,3};
  if (trap(a3) == 0) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "sliding-window": `
int main() {
  int pass = 0, total = 3;
  if (minWindow("ADOBECODEBANC", "ABC") == "BANC") { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  if (minWindow("a", "aa") == "") { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  if (minWindow("ab", "b") == "b") { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "fast-slow-pointers": `
int main() {
  int pass = 0, total = 3;
  vector<int> a1{1,3,4,2,2};
  if (findDuplicate(a1) == 2) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  vector<int> a2{3,1,3,4,2};
  if (findDuplicate(a2) == 3) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  vector<int> a3{1,1};
  if (findDuplicate(a3) == 1) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "binary-search": `
int main() {
  int pass = 0, total = 3;
  vector<int> p1{3,6,7,11};
  if (minEatingSpeed(p1, 8) == 4) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  vector<int> p2{30,11,23,4,20};
  if (minEatingSpeed(p2, 5) == 30) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  vector<int> p3{30,11,23,4,20};
  if (minEatingSpeed(p3, 6) == 23) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "prefix-sum-hashmap": `
int main() {
  int pass = 0, total = 3;
  vector<int> a1{1,1,1};
  if (subarraySum(a1, 2) == 2) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  vector<int> a2{1,2,3};
  if (subarraySum(a2, 3) == 2) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  vector<int> a3{1,-1,0};
  if (subarraySum(a3, 0) == 3) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "monotonic-stack": `
int main() {
  int pass = 0, total = 3;
  vector<int> h1{2,1,5,6,2,3};
  if (largestRectangleArea(h1) == 10) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  vector<int> h2{2,4};
  if (largestRectangleArea(h2) == 4) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  vector<int> h3{1,1,1};
  if (largestRectangleArea(h3) == 3) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "intervals-sweep": `
int main() {
  int pass = 0, total = 3;
  vector<vector<int>> i1{{1,2},{2,3},{3,4},{1,3}};
  if (eraseOverlapIntervals(i1) == 1) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  vector<vector<int>> i2{{1,2},{1,2},{1,2}};
  if (eraseOverlapIntervals(i2) == 2) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  vector<vector<int>> i3{{1,2},{2,3}};
  if (eraseOverlapIntervals(i3) == 0) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "heap-top-k": `
int main() {
  int pass = 0, total = 3;
  MedianFinder mf;
  mf.addNum(1); mf.addNum(2);
  if (abs(mf.findMedian() - 1.5) < 1e-5) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  mf.addNum(3);
  if (abs(mf.findMedian() - 2.0) < 1e-5) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  MedianFinder mf2; mf2.addNum(-1); mf2.addNum(-2); mf2.addNum(-3);
  if (abs(mf2.findMedian() - (-2.0)) < 1e-5) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "trees-dfs-bfs": `
int main() {
  int pass = 0, total = 2;
  TreeNode* n3 = new TreeNode(3);
  TreeNode* n5 = new TreeNode(5);
  TreeNode* n1 = new TreeNode(1);
  TreeNode* n6 = new TreeNode(6);
  TreeNode* n2 = new TreeNode(2);
  TreeNode* n7 = new TreeNode(7);
  TreeNode* n4 = new TreeNode(4);
  n3->left = n5; n3->right = n1;
  n5->left = n6; n5->right = n2;
  n2->left = n7; n2->right = n4;
  if (lowestCommonAncestor(n3, n5, n1) == n3) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  if (lowestCommonAncestor(n3, n5, n4) == n5) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "graphs-topo-union-find": `
int main() {
  int pass = 0, total = 3;
  vector<vector<int>> p1{{1,0}};
  if (canFinish(2, p1) == true) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  vector<vector<int>> p2{{1,0},{0,1}};
  if (canFinish(2, p2) == false) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  vector<vector<int>> p3{{1,0},{2,1},{3,2}};
  if (canFinish(4, p3) == true) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  backtracking: `
int main() {
  int pass = 0, total = 2;
  vector<int> c1{10,1,2,7,6,1,5};
  auto r1 = combinationSum2(c1, 8);
  for (auto& v : r1) sort(v.begin(), v.end());
  sort(r1.begin(), r1.end());
  vector<vector<int>> e1{{1,1,6},{1,2,5},{1,7},{2,6}};
  if (r1 == e1) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  vector<int> c2{2,5,2,1,2};
  auto r2 = combinationSum2(c2, 5);
  for (auto& v : r2) sort(v.begin(), v.end());
  sort(r2.begin(), r2.end());
  vector<vector<int>> e2{{1,2,2},{5}};
  if (r2 == e2) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
  "dynamic-programming": `
int main() {
  int pass = 0, total = 3;
  if (minDistance("horse", "ros") == 3) { cout << "CASE 1 PASS\\n"; pass++; } else cout << "CASE 1 FAIL\\n";
  if (minDistance("intention", "execution") == 5) { cout << "CASE 2 PASS\\n"; pass++; } else cout << "CASE 2 FAIL\\n";
  if (minDistance("", "abc") == 3) { cout << "CASE 3 PASS\\n"; pass++; } else cout << "CASE 3 FAIL\\n";
  cout << "SUMMARY:" << pass << "/" << total << "\\n";
  return pass == total ? 0 : 1;
}`,
};

const PY_DRIVERS: Record<PatternId, string> = {
  "two-pointers": `
_cases = [([0,1,0,2,1,0,1,3,2,1,2,1], 6), ([4,2,0,3,2,5], 9), ([1,2,3], 0)]
_p = 0
for _i, (_inp, _exp) in enumerate(_cases, 1):
    _got = trap(list(_inp))
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  "sliding-window": `
_cases = [("ADOBECODEBANC","ABC","BANC"), ("a","aa",""), ("ab","b","b")]
_p = 0
for _i, (_s, _t, _exp) in enumerate(_cases, 1):
    _got = minWindow(_s, _t)
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  "fast-slow-pointers": `
_cases = [([1,3,4,2,2], 2), ([3,1,3,4,2], 3), ([1,1], 1)]
_p = 0
for _i, (_inp, _exp) in enumerate(_cases, 1):
    _got = findDuplicate(list(_inp))
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  "binary-search": `
_cases = [([3,6,7,11], 8, 4), ([30,11,23,4,20], 5, 30), ([30,11,23,4,20], 6, 23)]
_p = 0
for _i, (_piles, _h, _exp) in enumerate(_cases, 1):
    _got = minEatingSpeed(list(_piles), _h)
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  "prefix-sum-hashmap": `
_cases = [([1,1,1], 2, 2), ([1,2,3], 3, 2), ([1,-1,0], 0, 3)]
_p = 0
for _i, (_nums, _k, _exp) in enumerate(_cases, 1):
    _got = subarraySum(list(_nums), _k)
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  "monotonic-stack": `
_cases = [([2,1,5,6,2,3], 10), ([2,4], 4), ([1,1,1], 3)]
_p = 0
for _i, (_h, _exp) in enumerate(_cases, 1):
    _got = largestRectangleArea(list(_h))
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  "intervals-sweep": `
_cases = [([[1,2],[2,3],[3,4],[1,3]], 1), ([[1,2],[1,2],[1,2]], 2), ([[1,2],[2,3]], 0)]
_p = 0
for _i, (_iv, _exp) in enumerate(_cases, 1):
    _got = eraseOverlapIntervals([list(x) for x in _iv])
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  "heap-top-k": `
_p = 0
mf = MedianFinder()
mf.addNum(1); mf.addNum(2)
_c1 = abs(mf.findMedian() - 1.5) < 1e-5
print("CASE 1 PASS" if _c1 else "CASE 1 FAIL")
_p += int(_c1)
mf.addNum(3)
_c2 = abs(mf.findMedian() - 2.0) < 1e-5
print("CASE 2 PASS" if _c2 else "CASE 2 FAIL")
_p += int(_c2)
mf2 = MedianFinder(); mf2.addNum(-1); mf2.addNum(-2); mf2.addNum(-3)
_c3 = abs(mf2.findMedian() - (-2.0)) < 1e-5
print("CASE 3 PASS" if _c3 else "CASE 3 FAIL")
_p += int(_c3)
print(f"SUMMARY:{_p}/3")
raise SystemExit(0 if _p == 3 else 1)`,
  "trees-dfs-bfs": `
_n3 = TreeNode(3); _n5 = TreeNode(5); _n1 = TreeNode(1); _n6 = TreeNode(6); _n2 = TreeNode(2); _n7 = TreeNode(7); _n4 = TreeNode(4)
_n3.left = _n5; _n3.right = _n1; _n5.left = _n6; _n5.right = _n2; _n2.left = _n7; _n2.right = _n4
_p = 0
_c1 = lowestCommonAncestor(_n3, _n5, _n1) is _n3
print("CASE 1 PASS" if _c1 else "CASE 1 FAIL")
_p += int(_c1)
_c2 = lowestCommonAncestor(_n3, _n5, _n4) is _n5
print("CASE 2 PASS" if _c2 else "CASE 2 FAIL")
_p += int(_c2)
print(f"SUMMARY:{_p}/2")
raise SystemExit(0 if _p == 2 else 1)`,
  "graphs-topo-union-find": `
_cases = [(2, [[1,0]], True), (2, [[1,0],[0,1]], False), (4, [[1,0],[2,1],[3,2]], True)]
_p = 0
for _i, (_n, _pre, _exp) in enumerate(_cases, 1):
    _got = canFinish(_n, [list(x) for x in _pre])
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  backtracking: `
_norm = lambda arr: sorted([sorted(x) for x in arr])
_cases = [([10,1,2,7,6,1,5], 8, [[1,1,6],[1,2,5],[1,7],[2,6]]), ([2,5,2,1,2], 5, [[1,2,2],[5]])]
_p = 0
for _i, (_c, _t, _exp) in enumerate(_cases, 1):
    _got = _norm(combinationSum2(list(_c), _t))
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
  "dynamic-programming": `
_cases = [("horse","ros",3), ("intention","execution",5), ("","abc",3)]
_p = 0
for _i, (_w1, _w2, _exp) in enumerate(_cases, 1):
    _got = minDistance(_w1, _w2)
    print(f"CASE {_i} {'PASS' if _got == _exp else f'FAIL (got {_got}, exp {_exp})'}")
    _p += int(_got == _exp)
print(f"SUMMARY:{_p}/{len(_cases)}")
raise SystemExit(0 if _p == len(_cases) else 1)`,
};

/**
 * Wraps a Pro case-study user snippet in a deterministic unit-test driver when
 * the snippet defines the expected function/class and no `main()` is already present.
 */
export function buildCaseStudyTestProgram(
  patternId: PatternId,
  language: PatternCodeLanguage,
  userCode: string,
): TestDriverBuildResult {
  const expectedFunctionName = EXPECTED_SYMBOLS[patternId];
  const alreadyHasMain =
    /\bint\s+main\s*\(|\bpublic\s+static\s+void\s+main\b|__name__\s*==\s*['"]__main__['"]/.test(
      userCode,
    );

  if (alreadyHasMain || !hasExpectedSymbol(userCode, patternId)) {
    return {
      wrappedCode: userCode,
      usedTestHarness: false,
      expectedFunctionName,
    };
  }

  if (language === "cpp") {
    const hasSolutionClass = /\bclass\s+Solution\b/.test(userCode);
    const cppBind =
      expectedFunctionName !== "MedianFinder" && hasSolutionClass
        ? `${userCode.includes("<utility>") ? "" : "#include <utility>\n"}static Solution __dsaviz_sol;\ntemplate <typename... Args>\ndecltype(auto) ${expectedFunctionName}(Args&&... args) { return __dsaviz_sol.${expectedFunctionName}(std::forward<Args>(args)...); }\n`
        : "";
    const extra =
      patternId === "trees-dfs-bfs" && !/\bstruct\s+TreeNode\b|\bclass\s+TreeNode\b/.test(userCode)
        ? `struct TreeNode { int val; TreeNode *left; TreeNode *right; TreeNode(int x): val(x), left(nullptr), right(nullptr) {} };\n`
        : "";
    return {
      wrappedCode: `${cppPrelude(userCode, extra)}${cppBind}\n${CPP_DRIVERS[patternId]}`,
      usedTestHarness: true,
      expectedFunctionName,
    };
  }

  if (language === "python") {
    const extra =
      patternId === "trees-dfs-bfs" && !/\bclass\s+TreeNode\b/.test(userCode)
        ? `class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val; self.left = left; self.right = right\n`
        : "";
    const pyBind =
      expectedFunctionName !== "MedianFinder"
        ? `if "${expectedFunctionName}" not in globals() and "Solution" in globals() and hasattr(Solution, "${expectedFunctionName}"):\n    ${expectedFunctionName} = getattr(Solution(), "${expectedFunctionName}")\n`
        : "";
    return {
      wrappedCode: `${pyPrelude(userCode, extra)}\n${pyBind}${PY_DRIVERS[patternId]}`,
      usedTestHarness: true,
      expectedFunctionName,
    };
  }

  if (language === "java") {
    const extra =
      patternId === "trees-dfs-bfs" && !/\bclass\s+TreeNode\b/.test(userCode)
        ? `class TreeNode { int val; TreeNode left; TreeNode right; TreeNode(int x){ val = x; } }\n`
        : "";
    const hasCustomDriver = patternId === "two-pointers" || patternId === "sliding-window" || patternId === "binary-search";
    if (hasCustomDriver) {
      const driver =
        patternId === "two-pointers"
          ? `class Main { public static void main(String[] args){ Solution s = new Solution(); int p = 0; if(s.trap(new int[]{0,1,0,2,1,0,1,3,2,1,2,1})==6){System.out.println("CASE 1 PASS");p++;} if(s.trap(new int[]{4,2,0,3,2,5})==9){System.out.println("CASE 2 PASS");p++;} System.out.println("SUMMARY:"+p+"/2"); if(p!=2) System.exit(1); } }`
          : patternId === "sliding-window"
            ? `class Main { public static void main(String[] args){ Solution s = new Solution(); int p = 0; if("BANC".equals(s.minWindow("ADOBECODEBANC","ABC"))){System.out.println("CASE 1 PASS");p++;} if("".equals(s.minWindow("a","aa"))){System.out.println("CASE 2 PASS");p++;} System.out.println("SUMMARY:"+p+"/2"); if(p!=2) System.exit(1); } }`
            : `class Main { public static void main(String[] args){ Solution s = new Solution(); int p = 0; if(s.minEatingSpeed(new int[]{3,6,7,11},8)==4){System.out.println("CASE 1 PASS");p++;} if(s.minEatingSpeed(new int[]{30,11,23,4,20},5)==30){System.out.println("CASE 2 PASS");p++;} System.out.println("SUMMARY:"+p+"/2"); if(p!=2) System.exit(1); } }`;
      return {
        wrappedCode: `${javaPrelude(userCode, extra)}\n${driver}`,
        usedTestHarness: true,
        expectedFunctionName,
      };
    }
  }

  return {
    wrappedCode: userCode,
    usedTestHarness: false,
    expectedFunctionName,
  };
}

export function parseDriverTestSummary(
  stdout: string,
  exitCode: number,
  usedTestHarness: boolean,
): { passed: boolean; testsPassed?: number; testsTotal?: number } {
  if (!usedTestHarness) {
    return { passed: exitCode === 0 };
  }
  const match = stdout.match(/SUMMARY:(\d+)\/(\d+)/);
  if (match && match[1] && match[2]) {
    const testsPassed = Number.parseInt(match[1], 10);
    const testsTotal = Number.parseInt(match[2], 10);
    return {
      passed: exitCode === 0 && testsPassed === testsTotal,
      testsPassed,
      testsTotal,
    };
  }
  return { passed: exitCode === 0 };
}

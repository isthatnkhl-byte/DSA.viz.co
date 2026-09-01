export type SupportedLanguage = "cpp" | "python" | "javascript" | "pseudocode";

export interface CodeTemplate {
  language: SupportedLanguage;
  label: string;
  monacoLang: string;
  extension: string;
  template: string;
}

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .map((word, idx) =>
      idx === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
}

export function getCodeTemplates(problemTitle = "Solution", problemSlug = "solution"): Record<SupportedLanguage, string> {
  const funcName = toCamelCase(problemTitle) || "solve";
  const slugLower = problemSlug.toLowerCase();

  // Deduce parameters based on problem type keywords
  let cppParams = "vector<int>& nums, int target";
  let cppReturn = "vector<int>";
  let pyParams = "self, nums: List[int], target: int -> List[int]";
  let jsParams = "nums, target";
  let pseudoParams = "nums, target";

  if (slugLower.includes("tree") || slugLower.includes("root") || slugLower.includes("binary-tree") || slugLower.includes("ancestor") || slugLower.includes("subtree")) {
    cppParams = "TreeNode* root";
    cppReturn = "TreeNode*";
    pyParams = "self, root: Optional[TreeNode]) -> Optional[TreeNode]";
    jsParams = "root";
    pseudoParams = "root";
  } else if (slugLower.includes("grid") || slugLower.includes("island") || slugLower.includes("matrix")) {
    cppParams = "vector<vector<char>>& grid";
    cppReturn = "int";
    pyParams = "self, grid: List[List[str]]) -> int";
    jsParams = "grid";
    pseudoParams = "grid";
  } else if (slugLower.includes("string") || slugLower.includes("palindrome") || slugLower.includes("anagram")) {
    cppParams = "string s";
    cppReturn = "bool";
    pyParams = "self, s: str) -> bool";
    jsParams = "s";
    pseudoParams = "s";
  } else if (slugLower.includes("linked-list") || slugLower.includes("cycle") || slugLower.includes("reverse-list")) {
    cppParams = "ListNode* head";
    cppReturn = "ListNode*";
    pyParams = "self, head: Optional[ListNode]) -> Optional[ListNode]";
    jsParams = "head";
    pseudoParams = "head";
  }

  const cpp = `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    ${cppReturn} ${funcName}(${cppParams}) {
        // Step 1: Initialize pointers / data structures
        
        // Step 2: Main loop logic
        
        // Step 3: Return result
        return {};
    }
};
`;

  const python = `class Solution:
    def ${funcName}(${pyParams}:
        """
        Problem: ${problemTitle}
        """
        # Step 1: Initialize variables / state
        
        # Step 2: Execute algorithm steps
        
        # Step 3: Return final result
        pass
`;

  const javascript = `/**
 * @param {any} ${jsParams}
 * @return {any}
 */
var ${funcName} = function(${jsParams}) {
    // 1. Initialize data structures
    
    // 2. Main iteration logic
    
    // 3. Return output
    return null;
};
`;

  const pseudocode = `# Problem: ${problemTitle}
# Algorithm Plan & Step-by-Step Logic

def ${funcName}(${pseudoParams}):
    # 1. Initialize pointers / state variables
    # 2. Loop through input elements or tree nodes
    # 3. Apply state transitions and update bounds
    return result
`;

  return {
    cpp,
    python,
    javascript,
    pseudocode,
  };
}

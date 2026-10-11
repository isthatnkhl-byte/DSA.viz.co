export type SupportedLanguage = "cpp" | "python" | "javascript" | "java" | "pseudocode";

export interface CodeTemplate {
  language: SupportedLanguage;
  label: string;
  monacoLang: string;
  extension: string;
  template: string;
}

export interface InferredParam {
  name: string;
  rawValue: string;
  cppType: string;
  pyType: string;
  javaType: string;
  jsType: string;
}

export interface InferredSignature {
  funcName: string;
  params: InferredParam[];
  returnType: {
    cpp: string;
    py: string;
    java: string;
    js: string;
    defaultReturnCpp: string;
    defaultReturnJava: string;
    defaultReturnJs: string;
  };
}

export function toCamelCase(str: string): string {
  const cleaned = (str || "")
    .replace(/^[0-9]+\.\s*/, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();
  if (!cleaned) return "solve";
  const words = cleaned.split(/\s+/);
  const candidate = words
    .map((word, idx) =>
      idx === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
  if (/^[0-9]/.test(candidate)) {
    return `solve${candidate.charAt(0).toUpperCase()}${candidate.slice(1)}`;
  }
  return candidate || "solve";
}

function inferTypeFromExampleValue(
  name: string,
  rawVal: string,
  slugLower: string
): Omit<InferredParam, "name" | "rawValue"> {
  const val = (rawVal || "").trim();
  const nameLower = name.toLowerCase();

  // Check tree or linked list by parameter name / problem slug
  if (
    nameLower === "root" ||
    nameLower === "subroot" ||
    ((nameLower === "p" || nameLower === "q") && /tree|bst|ancestor/.test(slugLower))
  ) {
    return {
      cppType: "TreeNode*",
      pyType: "Optional[TreeNode]",
      javaType: "TreeNode",
      jsType: "TreeNode",
    };
  }

  if (
    nameLower === "head" ||
    nameLower === "headA" ||
    nameLower === "headB" ||
    nameLower === "l1" ||
    nameLower === "l2" ||
    (/list|cycle/.test(slugLower) && nameLower.includes("list"))
  ) {
    return {
      cppType: "ListNode*",
      pyType: "Optional[ListNode]",
      javaType: "ListNode",
      jsType: "ListNode",
    };
  }

  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && Array.isArray(parsed[0])) {
        const inner = parsed[0][0];
        if (typeof inner === "string") {
          return {
            cppType: "vector<vector<char>>&",
            pyType: "List[List[str]]",
            javaType: "char[][]",
            jsType: "character[][]",
          };
        }
        return {
          cppType: "vector<vector<int>>&",
          pyType: "List[List[int]]",
          javaType: "int[][]",
          jsType: "number[][]",
        };
      }
      if (parsed.some((x) => x === null) && /tree|bst|root|level|depth/.test(slugLower)) {
        return {
          cppType: "TreeNode*",
          pyType: "Optional[TreeNode]",
          javaType: "TreeNode",
          jsType: "TreeNode",
        };
      }
      const first = parsed[0];
      if (typeof first === "string") {
        return {
          cppType: "vector<string>&",
          pyType: "List[str]",
          javaType: "String[]",
          jsType: "string[]",
        };
      }
      return {
        cppType: "vector<int>&",
        pyType: "List[int]",
        javaType: "int[]",
        jsType: "number[]",
      };
    }
    if (typeof parsed === "string") {
      return {
        cppType: "string",
        pyType: "str",
        javaType: "String",
        jsType: "string",
      };
    }
    if (typeof parsed === "boolean") {
      return {
        cppType: "bool",
        pyType: "bool",
        javaType: "boolean",
        jsType: "boolean",
      };
    }
    if (typeof parsed === "number") {
      if (!Number.isInteger(parsed)) {
        return {
          cppType: "double",
          pyType: "float",
          javaType: "double",
          jsType: "number",
        };
      }
      return {
        cppType: "int",
        pyType: "int",
        javaType: "int",
        jsType: "number",
      };
    }
  } catch {
    // fallback below
  }

  if (val.startsWith('"') || val.startsWith("'")) {
    return {
      cppType: "string",
      pyType: "str",
      javaType: "String",
      jsType: "string",
    };
  }

  return {
    cppType: "int",
    pyType: "int",
    javaType: "int",
    jsType: "number",
  };
}

function inferReturnTypeFromOutput(
  rawOutput: string,
  slugLower: string,
  params: InferredParam[]
): InferredSignature["returnType"] {
  const out = (rawOutput || "").trim();

  if (params.some((p) => p.cppType === "TreeNode*") && out.startsWith("[")) {
    if (/invert|insert|delete|construct|merge|trim|search|bst/.test(slugLower)) {
      return {
        cpp: "TreeNode*",
        py: "Optional[TreeNode]",
        java: "TreeNode",
        js: "TreeNode",
        defaultReturnCpp: "nullptr",
        defaultReturnJava: "null",
        defaultReturnJs: "null",
      };
    }
  }

  if (params.some((p) => p.cppType === "ListNode*") && out.startsWith("[")) {
    return {
      cpp: "ListNode*",
      py: "Optional[ListNode]",
      java: "ListNode",
      js: "ListNode",
      defaultReturnCpp: "nullptr",
      defaultReturnJava: "null",
      defaultReturnJs: "null",
    };
  }

  if (out === "true" || out === "false") {
    return {
      cpp: "bool",
      py: "bool",
      java: "boolean",
      js: "boolean",
      defaultReturnCpp: "false",
      defaultReturnJava: "false",
      defaultReturnJs: "false",
    };
  }

  try {
    const parsed = JSON.parse(out);
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && Array.isArray(parsed[0])) {
        if (typeof parsed[0][0] === "string") {
          return {
            cpp: "vector<vector<string>>",
            py: "List[List[str]]",
            java: "List<List<String>>",
            js: "string[][]",
            defaultReturnCpp: "{}",
            defaultReturnJava: "new ArrayList<>()",
            defaultReturnJs: "[]",
          };
        }
        return {
          cpp: "vector<vector<int>>",
          py: "List[List[int]]",
          java: "int[][]",
          js: "number[][]",
          defaultReturnCpp: "{}",
          defaultReturnJava: "new int[0][0]",
          defaultReturnJs: "[]",
        };
      }
      if (typeof parsed[0] === "string") {
        return {
          cpp: "vector<string>",
          py: "List[str]",
          java: "List<String>",
          js: "string[]",
          defaultReturnCpp: "{}",
          defaultReturnJava: "new ArrayList<>()",
          defaultReturnJs: "[]",
        };
      }
      return {
        cpp: "vector<int>",
        py: "List[int]",
        java: "int[]",
        js: "number[]",
        defaultReturnCpp: "{}",
        defaultReturnJava: "new int[0]",
        defaultReturnJs: "[]",
      };
    }
    if (typeof parsed === "string") {
      return {
        cpp: "string",
        py: "str",
        java: "String",
        js: "string",
        defaultReturnCpp: '""',
        defaultReturnJava: '""',
        defaultReturnJs: '""',
      };
    }
    if (typeof parsed === "number") {
      if (!Number.isInteger(parsed)) {
        return {
          cpp: "double",
          py: "float",
          java: "double",
          js: "number",
          defaultReturnCpp: "0.0",
          defaultReturnJava: "0.0",
          defaultReturnJs: "0.0",
        };
      }
      return {
        cpp: "int",
        py: "int",
        java: "int",
        js: "number",
        defaultReturnCpp: "0",
        defaultReturnJava: "0",
        defaultReturnJs: "0",
      };
    }
  } catch {
    // fallback below
  }

  return {
    cpp: "int",
    py: "int",
    java: "int",
    js: "number",
    defaultReturnCpp: "0",
    defaultReturnJava: "0",
    defaultReturnJs: "0",
  };
}

export function inferProblemSignature(params: {
  problemTitle?: string;
  problemSlug?: string;
  sampleInput?: string;
  sampleOutput?: string;
}): InferredSignature {
  const {
    problemTitle = "Solution",
    problemSlug = "solution",
    sampleInput = "",
    sampleOutput = "",
  } = params;
  const funcName = toCamelCase(problemTitle) || "solve";
  const slugLower = problemSlug.toLowerCase();

  const inferredParams: InferredParam[] = [];
  const cleanedInput = sampleInput.trim();

  if (cleanedInput) {
    const assignmentRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*/g;
    const matches = [...cleanedInput.matchAll(assignmentRegex)];
    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i]!;
        const paramName = m[1] || `arg${i + 1}`;
        const startIdx = (m.index ?? 0) + m[0].length;
        const nextMatch = matches[i + 1];
        let rawVal = nextMatch
          ? cleanedInput.slice(startIdx, nextMatch.index)
          : cleanedInput.slice(startIdx);
        rawVal = rawVal.replace(/,\s*$/, "").trim();
        const types = inferTypeFromExampleValue(paramName, rawVal, slugLower);
        inferredParams.push({
          name: paramName,
          rawValue: rawVal,
          ...types,
        });
      }
    } else {
      const types = inferTypeFromExampleValue("nums", cleanedInput, slugLower);
      inferredParams.push({
        name: types.pyType === "str" ? "s" : "nums",
        rawValue: cleanedInput,
        ...types,
      });
    }
  }

  if (inferredParams.length === 0) {
    if (
      slugLower.includes("tree") ||
      slugLower.includes("root") ||
      slugLower.includes("ancestor") ||
      slugLower.includes("subtree")
    ) {
      inferredParams.push({
        name: "root",
        rawValue: "[3,9,20,null,null,15,7]",
        cppType: "TreeNode*",
        pyType: "Optional[TreeNode]",
        javaType: "TreeNode",
        jsType: "TreeNode",
      });
    } else if (
      slugLower.includes("grid") ||
      slugLower.includes("island") ||
      slugLower.includes("matrix")
    ) {
      inferredParams.push({
        name: "grid",
        rawValue: "[[1,1,0],[1,1,0],[0,0,1]]",
        cppType: "vector<vector<int>>&",
        pyType: "List[List[int]]",
        javaType: "int[][]",
        jsType: "number[][]",
      });
    } else if (
      slugLower.includes("string") ||
      slugLower.includes("palindrome") ||
      slugLower.includes("anagram")
    ) {
      inferredParams.push({
        name: "s",
        rawValue: '"abacaba"',
        cppType: "string",
        pyType: "str",
        javaType: "String",
        jsType: "string",
      });
    } else if (
      slugLower.includes("linked-list") ||
      slugLower.includes("cycle") ||
      slugLower.includes("reverse-list")
    ) {
      inferredParams.push({
        name: "head",
        rawValue: "[1,2,3,4,5]",
        cppType: "ListNode*",
        pyType: "Optional[ListNode]",
        javaType: "ListNode",
        jsType: "ListNode",
      });
    } else {
      inferredParams.push(
        {
          name: "nums",
          rawValue: "[2,7,11,15]",
          cppType: "vector<int>&",
          pyType: "List[int]",
          javaType: "int[]",
          jsType: "number[]",
        },
        {
          name: "target",
          rawValue: "9",
          cppType: "int",
          pyType: "int",
          javaType: "int",
          jsType: "number",
        }
      );
    }
  }

  const returnType = sampleOutput
    ? inferReturnTypeFromOutput(sampleOutput, slugLower, inferredParams)
    : slugLower === "two-sum"
    ? {
        cpp: "vector<int>",
        py: "List[int]",
        java: "int[]",
        js: "number[]",
        defaultReturnCpp: "{}",
        defaultReturnJava: "new int[0]",
        defaultReturnJs: "[]",
      }
    : inferReturnTypeFromOutput("0", slugLower, inferredParams);

  return {
    funcName,
    params: inferredParams,
    returnType,
  };
}

export function getCodeTemplates(
  problemTitle = "Solution",
  problemSlug = "solution",
  sampleInput = "",
  sampleOutput = ""
): Record<SupportedLanguage, string> {
  const sig = inferProblemSignature({
    problemTitle,
    problemSlug,
    sampleInput,
    sampleOutput,
  });

  const cppParams = sig.params.map((p) => `${p.cppType} ${p.name}`).join(", ");
  const pyParams = sig.params.map((p) => `${p.name}: ${p.pyType}`).join(", ");
  const javaParams = sig.params.map((p) => `${p.javaType} ${p.name}`).join(", ");
  const jsParams = sig.params.map((p) => p.name).join(", ");
  const jsDocParams = sig.params
    .map((p) => ` * @param {${p.jsType}} ${p.name}`)
    .join("\n");

  const hasTree = sig.params.some((p) => p.cppType === "TreeNode*");
  const hasList = sig.params.some((p) => p.cppType === "ListNode*");

  const cppStructHeader = hasTree
    ? `// Definition for a binary tree node (provided automatically by Judge):\n// struct TreeNode { int val; TreeNode *left; TreeNode *right; };\n\n`
    : hasList
    ? `// Definition for singly-linked list (provided automatically by Judge):\n// struct ListNode { int val; ListNode *next; };\n\n`
    : "";

  const pyStructHeader = hasTree
    ? `# Definition for a binary tree node (provided automatically by Judge):\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n\n`
    : hasList
    ? `# Definition for singly-linked list (provided automatically by Judge):\n# class ListNode:\n#     def __init__(self, val=0, next=None):\n#         self.val = val\n#         self.next = next\n\n`
    : "";

  const cpp = `#include <bits/stdc++.h>
using namespace std;

${cppStructHeader}class Solution {
public:
    ${sig.returnType.cpp} ${sig.funcName}(${cppParams}) {
        // Write your C++20 solution here
        
        return ${sig.returnType.defaultReturnCpp};
    }
};
`;

  const python = `from typing import List, Optional, Dict, Tuple, Set
from collections import defaultdict, deque, Counter
import heapq
import math

${pyStructHeader}class Solution:
    def ${sig.funcName}(self, ${pyParams}) -> ${sig.returnType.py}:
        # Write your Python 3 solution here
        pass
`;

  const javascript = `/**
${jsDocParams}
 * @return {${sig.returnType.js}}
 */
var ${sig.funcName} = function(${jsParams}) {
    // Write your JavaScript (Node.js) solution here
    
    return ${sig.returnType.defaultReturnJs};
};
`;

  const java = `import java.util.*;

class Solution {
    public ${sig.returnType.java} ${sig.funcName}(${javaParams}) {
        // Write your Java 21 solution here
        
        return ${sig.returnType.defaultReturnJava};
    }
}
`;

  const pseudocode = `# Problem: ${problemTitle}
# Algorithm Plan & Step-by-Step Invariant

def ${sig.funcName}(${jsParams}):
    # 1. Initialize state / auxiliary structures
    # 2. Traverse input and maintain loop invariant
    # 3. Return final computed result
    return result
`;

  return {
    cpp,
    python,
    javascript,
    java,
    pseudocode,
  };
}

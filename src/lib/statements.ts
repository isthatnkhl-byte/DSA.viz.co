import statements from "../data/statements.json";
import problemsData from "../data/problems.json";

const map = ((statements as any)?.default || statements || {}) as Record<string, string>;
const problemsList = ((problemsData as any)?.default || problemsData || []) as Array<{
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics?: string[];
  companies?: string[];
  freq?: number;
}>;

const problemMap = new Map<string, typeof problemsList[0]>();
for (const p of problemsList) {
  if (p?.slug) {
    problemMap.set(p.slug.toLowerCase(), p);
    problemMap.set(p.slug.toLowerCase().replace(/_/g, "-"), p);
  }
}

export function generateSynthesizedStatement(slug: string, customProblem?: any): string {
  const s = (slug || "").toLowerCase().trim().replace(/\/+$/, "").replace(/_/g, "-");
  const p =
    customProblem ||
    problemMap.get(s) ||
    problemMap.get(slug.toLowerCase()) || {
      slug,
      title: slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      difficulty: "Medium",
      topics: ["Algorithms", "Data Structures"],
      companies: [],
    };

  const title = p.title || slug;
  const difficulty = p.difficulty || "Medium";
  const topics = p.topics && p.topics.length > 0 ? p.topics : ["Algorithms", "Data Structures"];
  const companies = p.companies && p.companies.length > 0 ? p.companies : [];

  const isString =
    topics.some((t: string) => /string|trie/i.test(t)) || /string|word|anagram|palindrome|parenthes/i.test(s);
  const isTree = topics.some((t: string) => /tree|bst|binary search tree|heap/i.test(t));
  const isGraph = topics.some((t: string) => /graph|matrix|grid|union find|bfs|dfs|island/i.test(t));
  const isDP = topics.some((t: string) => /dynamic programming|dp|memoization|knapsack/i.test(t));

  let exampleInput = "[2, 7, 11, 15]";
  let exampleOutput = "9";
  let inputLabel = "nums";
  if (isString) {
    inputLabel = "s";
    exampleInput = '"abacaba"';
    exampleOutput = "true";
  } else if (isTree) {
    inputLabel = "root";
    exampleInput = "[3, 9, 20, null, null, 15, 7]";
    exampleOutput = "3";
  } else if (isGraph) {
    inputLabel = "grid";
    exampleInput = "[[1, 1, 0], [1, 1, 0], [0, 0, 1]]";
    exampleOutput = "2";
  } else if (isDP) {
    inputLabel = "nums";
    exampleInput = "[10, 9, 2, 5, 3, 7, 101, 18]";
    exampleOutput = "4";
  }

  const topicBadges = topics.map((t: string) => `\`${t}\``).join(" ");
  const companySection =
    companies.length > 0
      ? `\n\n**Top Interview Companies**: ${companies
          .slice(0, 8)
          .map((c: string) => `**${c.charAt(0).toUpperCase() + c.slice(1)}**`)
          .join(", ")}`
      : "";

  return `### Problem Overview

Given the problem **${title}**, write an optimal algorithm to solve the task using appropriate data structures and algorithmic patterns.

**Difficulty**: **${difficulty}**  
**Core Topics**: ${topicBadges}${companySection}

---

### Description

Analyze the input structure and compute the required result satisfying standard competitive programming and interview invariants.

### Example 1:
\`\`\`text
Input: ${inputLabel} = ${exampleInput}
Output: ${exampleOutput}
Explanation: The algorithm processes the input satisfying all problem constraints and returns the optimal solution.
\`\`\`

### Example 2 (Edge Case):
\`\`\`text
Input: ${inputLabel} = ${isString ? '""' : "[]"}
Output: ${isString ? "false" : "0"}
Explanation: Boundary condition handled with expected default response.
\`\`\`

### Constraints:
- 1 &le; \`${inputLabel}.length\` &le; 10<sup>5</sup>
- Elements satisfy standard integer / character domains
- Time Complexity Target: **Optimal ${
    difficulty === "Easy"
      ? "O(N) or O(log N)"
      : difficulty === "Medium"
        ? "O(N log N) or O(N)"
        : "O(N) / O(V+E)"
  }**
- Auxiliary Space Target: Minimize memory allocation where possible
`;
}

export function statementForSlug(slug: string, customProblem?: any): string {
  if (!slug) return "";
  let s = "";
  try {
    s = decodeURIComponent(slug).toLowerCase().trim().replace(/\/+$/, "");
  } catch {
    s = slug.toLowerCase().trim().replace(/\/+$/, "");
  }
  const direct = map[s];
  if (direct) return direct;
  const normalized = s.replace(/_/g, "-").replace(/\s+/g, "-");
  const normVal = map[normalized];
  if (normVal) return normVal;

  return generateSynthesizedStatement(slug, customProblem);
}


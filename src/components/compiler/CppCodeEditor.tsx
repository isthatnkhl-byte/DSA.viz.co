import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import {
  Copy,
  Check,
  Download,
  Sparkles,
  Maximize2,
  Minimize2,
  Type,
  Palette,
  Play,
  Zap,
  Camera,
  Github,
  ArrowUpToLine,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EditorTheme, SupportedLanguage } from "@/lib/compiler.types";
import { useThemeColor } from "@/hooks/useThemeColor";
import { AddToNotesButton } from "@/components/notes/AddToNotesButton";

interface CppCodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onRun?: () => void;
  onExportSnapshot?: () => void;
  onPushToGithub?: (code: string) => void;
  githubLoading?: boolean;
  loading?: boolean;
  disabled?: boolean;
  language?: SupportedLanguage;
}

// Token types for rich C++ syntax highlighting
type TokenType =
  | "directive"
  | "header"
  | "keyword"
  | "type"
  | "function"
  | "string"
  | "char"
  | "number"
  | "comment"
  | "std"
  | "bracket1"
  | "bracket2"
  | "bracket3"
  | "bracket4"
  | "bracket5"
  | "operator"
  | "plain";

interface Token {
  type: TokenType;
  text: string;
}

const CPP_KEYWORDS = new Set([
  "using",
  "namespace",
  "return",
  "if",
  "else",
  "while",
  "for",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "goto",
  "const",
  "static",
  "template",
  "typename",
  "public",
  "private",
  "protected",
  "virtual",
  "inline",
  "new",
  "delete",
  "nullptr",
  "true",
  "false",
  "this",
  "typedef",
  "class",
  "struct",
  "enum",
  "union",
  "constexpr",
  "auto",
  "try",
  "catch",
  "throw",
  "friend",
  "explicit",
  "override",
  "final",
]);

const CPP_TYPES = new Set([
  "int",
  "long",
  "short",
  "char",
  "bool",
  "float",
  "double",
  "void",
  "size_t",
  "int64_t",
  "uint64_t",
  "int32_t",
  "uint32_t",
  "vector",
  "string",
  "map",
  "unordered_map",
  "set",
  "unordered_set",
  "multiset",
  "multimap",
  "queue",
  "deque",
  "priority_queue",
  "stack",
  "pair",
  "tuple",
  "list",
  "bitset",
  "array",
  "ListNode",
  "TreeNode",
  "Node",
  "DSU",
  "TrieNode",
]);

const CPP_STD_OBJECTS = new Set([
  "cin",
  "cout",
  "cerr",
  "endl",
  "std",
  "ios_base",
  "tie",
  "NULL",
  "INT_MAX",
  "INT_MIN",
  "LLONG_MAX",
  "LLONG_MIN",
  "INF",
  "greater",
  "less",
]);

const CPP_FUNCTIONS = new Set([
  "main",
  "solve",
  "push_back",
  "pop_back",
  "emplace_back",
  "push",
  "pop",
  "top",
  "front",
  "back",
  "size",
  "empty",
  "clear",
  "resize",
  "assign",
  "insert",
  "erase",
  "find",
  "count",
  "begin",
  "end",
  "rbegin",
  "rend",
  "sort",
  "reverse",
  "lower_bound",
  "upper_bound",
  "binary_search",
  "accumulate",
  "gcd",
  "lcm",
  "swap",
  "min",
  "max",
  "abs",
  "sqrt",
  "pow",
  "ceil",
  "floor",
  "memset",
  "printf",
  "scanf",
  "make_pair",
  "make_tuple",
  "to_string",
  "stoi",
  "stoll",
  "substr",
  "length",
  "getline",
  "fill",
]);

const PYTHON_KEYWORDS = new Set([
  "def", "class", "return", "if", "elif", "else", "while", "for", "in",
  "break", "continue", "pass", "import", "from", "as", "try", "except",
  "finally", "raise", "with", "yield", "lambda", "assert", "global",
  "nonlocal", "del", "None", "True", "False", "async", "await", "is",
  "not", "and", "or",
]);

const PYTHON_TYPES = new Set([
  "int", "float", "str", "bool", "list", "dict", "set", "tuple", "bytes",
  "Any", "Optional", "List", "Dict", "Set", "Tuple", "Deque", "DefaultDict",
]);

const PYTHON_STD_OBJECTS = new Set([
  "self", "cls", "print", "len", "range", "enumerate", "zip", "sum", "min", "max",
  "abs", "sorted", "map", "filter", "input", "open", "type", "isinstance",
  "heapq", "collections", "deque", "Counter", "defaultdict", "bisect", "math", "sys",
]);

const JAVA_KEYWORDS = new Set([
  "public", "private", "protected", "class", "interface", "extends", "implements",
  "static", "final", "abstract", "void", "return", "if", "else", "for", "while",
  "do", "switch", "case", "default", "break", "continue", "new", "this", "super",
  "try", "catch", "finally", "throw", "throws", "import", "package", "null",
  "true", "false", "instanceof", "enum", "record",
]);

const JAVA_TYPES = new Set([
  "int", "long", "short", "byte", "char", "boolean", "float", "double", "void",
  "String", "Integer", "Long", "Double", "Boolean", "Character", "List", "ArrayList",
  "Map", "HashMap", "Set", "HashSet", "Queue", "LinkedList", "PriorityQueue",
  "Stack", "Arrays", "Collections", "Scanner", "Math", "System", "StringBuilder",
  "TreeNode", "ListNode", "Node",
]);

const JAVA_STD_OBJECTS = new Set([
  "System", "out", "in", "err", "println", "print", "printf", "Math", "Arrays",
  "Collections", "Integer", "Long", "Double", "String", "Scanner",
]);

const C_KEYWORDS = new Set([
  "return", "if", "else", "while", "for", "do", "switch", "case", "default",
  "break", "continue", "goto", "const", "static", "inline", "typedef", "struct",
  "enum", "union", "sizeof", "true", "false", "NULL",
]);

const C_TYPES = new Set([
  "int", "long", "short", "char", "bool", "float", "double", "void",
  "size_t", "int64_t", "uint64_t", "int32_t", "uint32_t", "Node", "ListNode",
]);

export const LANGUAGE_SNIPPETS: Record<
  SupportedLanguage,
  { label: string; preview: string; code: string }[]
> = {
  cpp: [
    { label: "cout", preview: "cout << x << endl;", code: "cout <<  << endl;" },
    { label: "cin", preview: "cin >> x;", code: "cin >> ;" },
    { label: "vector<int>", preview: "vector<int> nums;", code: "vector<int> nums;" },
    { label: "for-loop", preview: "for(int i=0; i<n; ++i)", code: "for (int i = 0; i < n; ++i) {\n    \n}" },
    { label: "hash-map", preview: "unordered_map<int,int>", code: "unordered_map<int, int> mp;" },
    { label: "min-heap", preview: "priority_queue<..., greater>", code: "priority_queue<int, vector<int>, greater<int>> minPq;" },
    { label: "sort()", preview: "sort(begin, end)", code: "sort(nums.begin(), nums.end());" },
    { label: "reverse()", preview: "reverse(begin, end)", code: "reverse(nums.begin(), nums.end());" },
    { label: "2D grid", preview: "vector<vector<int>>", code: "vector<vector<int>> matrix(rows, vector<int>(cols, 0));" },
    { label: "fast-io", preview: "sync_with_stdio(false)", code: "ios_base::sync_with_stdio(false);\ncin.tie(NULL);" },
  ],
  c: [
    { label: "printf", preview: 'printf("%d\\n", val);', code: 'printf("%d\\n", val);' },
    { label: "scanf", preview: 'scanf("%d", &val);', code: 'scanf("%d", &val);' },
    { label: "for-loop", preview: "for(int i=0; i<n; i++)", code: "for (int i = 0; i < n; i++) {\n    \n}" },
    { label: "malloc", preview: "(int*)malloc(n*sizeof)", code: "int* arr = (int*)malloc(n * sizeof(int));" },
    { label: "free", preview: "free(arr);", code: "free(arr);" },
    { label: "struct Node", preview: "typedef struct Node", code: "typedef struct Node {\n    int val;\n    struct Node* next;\n} Node;" },
    { label: "if-else", preview: "if (...) { } else { }", code: "if (condition) {\n    \n} else {\n    \n}" },
  ],
  java: [
    { label: "sout", preview: "System.out.println()", code: "System.out.println();" },
    { label: "Scanner", preview: "new Scanner(System.in)", code: "Scanner sc = new Scanner(System.in);" },
    { label: "for-loop", preview: "for(int i=0; i<n; i++)", code: "for (int i = 0; i < n; i++) {\n    \n}" },
    { label: "ArrayList", preview: "new ArrayList<>()", code: "List<Integer> list = new ArrayList<>();" },
    { label: "HashMap", preview: "new HashMap<>()", code: "Map<Integer, Integer> map = new HashMap<>();" },
    { label: "MinHeap", preview: "new PriorityQueue<>()", code: "PriorityQueue<Integer> minHeap = new PriorityQueue<>();" },
    { label: "Arrays.sort", preview: "Arrays.sort(nums)", code: "Arrays.sort(nums);" },
  ],
  python: [
    { label: "print", preview: "print(ans)", code: "print()" },
    { label: "def solve", preview: "def solve():", code: "def solve():\n    pass" },
    { label: "for-range", preview: "for i in range(n):", code: "for i in range(n):\n    pass" },
    { label: "list-comp", preview: "[x for x in nums]", code: "[x for x in nums]" },
    { label: "dict/map", preview: "seen = {}", code: "seen = {}" },
    { label: "deque", preview: "deque([])", code: "queue = deque([])" },
    { label: "heappush", preview: "heapq.heappush()", code: "heapq.heappush(heap, item)" },
    { label: "fast-stdin", preview: "sys.stdin.read", code: "import sys\ninput = sys.stdin.read" },
  ],
};

// Tokenize source code with rainbow bracket pair levels across C++, C, Java, and Python
function tokenizeCode(code: string, language: SupportedLanguage = "cpp"): Token[][] {
  const lines = code.replace(/\r\n?/g, "\n").split("\n");
  let bracketDepth = 0;

  const isPython = language === "python";
  const isJava = language === "java";
  const isC = language === "c";

  const keywords = isPython ? PYTHON_KEYWORDS : isJava ? JAVA_KEYWORDS : isC ? C_KEYWORDS : CPP_KEYWORDS;
  const types = isPython ? PYTHON_TYPES : isJava ? JAVA_TYPES : isC ? C_TYPES : CPP_TYPES;
  const stdObjects = isPython
    ? PYTHON_STD_OBJECTS
    : isJava
      ? JAVA_STD_OBJECTS
      : isC
        ? new Set(["NULL", "stdin", "stdout", "stderr"])
        : CPP_STD_OBJECTS;

  return lines.map((line) => {
    const tokens: Token[] = [];
    let i = 0;

    if (!isPython) {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("#")) {
        const hashIndex = line.indexOf("#");
        if (hashIndex > 0) {
          tokens.push({ type: "plain", text: line.slice(0, hashIndex) });
        }
        const rest = line.slice(hashIndex);
        const includeMatch = rest.match(
          /^(#(?:include|define|pragma|ifdef|ifndef|endif|undef))\s*(.*)$/,
        );
        if (includeMatch && includeMatch[1]) {
          tokens.push({ type: "directive", text: includeMatch[1] });
          if (includeMatch[2]) {
            const headerPart = includeMatch[2];
            if (/^[<"][^>"]+[>"]/.test(headerPart.trim())) {
              tokens.push({ type: "plain", text: " " });
              tokens.push({ type: "header", text: headerPart.trim() });
            } else {
              tokens.push({ type: "plain", text: " " + headerPart });
            }
          }
          return tokens;
        }
      } else if (isJava && /^(import|package)\s+/.test(trimmed)) {
        const match = trimmed.match(/^(import|package)\s+([^;]+)(;?)/);
        if (match && match[1] && match[2]) {
          tokens.push({ type: "directive", text: match[1] });
          tokens.push({ type: "plain", text: " " });
          tokens.push({ type: "header", text: match[2] });
          if (match[3]) tokens.push({ type: "operator", text: match[3] });
          return tokens;
        }
      }
    }

    while (i < line.length) {
      const char = line[i] ?? "";
      const nextChar = line[i + 1] ?? "";

      if (isPython && char === "#") {
        tokens.push({ type: "comment", text: line.slice(i) });
        break;
      }

      if (!isPython && char === "/" && nextChar === "/") {
        tokens.push({ type: "comment", text: line.slice(i) });
        break;
      }

      if (!isPython && char === "/" && nextChar === "*") {
        const endComment = line.indexOf("*/", i + 2);
        if (endComment !== -1) {
          tokens.push({ type: "comment", text: line.slice(i, endComment + 2) });
          i = endComment + 2;
          continue;
        } else {
          tokens.push({ type: "comment", text: line.slice(i) });
          break;
        }
      }

      if (char === '"') {
        if (isPython && line.slice(i, i + 3) === '"""') {
          tokens.push({ type: "string", text: line.slice(i) });
          break;
        }
        let str = '"';
        i++;
        while (i < line.length && (line[i] ?? "") !== '"') {
          const curr = line[i] ?? "";
          const next = line[i + 1] ?? "";
          if (curr === "\\" && i + 1 < line.length) {
            str += curr + next;
            i += 2;
          } else {
            str += curr;
            i++;
          }
        }
        if (i < line.length) {
          str += '"';
          i++;
        }
        tokens.push({ type: "string", text: str });
        continue;
      }

      if (char === "'") {
        if (isPython && line.slice(i, i + 3) === "'''") {
          tokens.push({ type: "string", text: line.slice(i) });
          break;
        }
        let chStr = "'";
        i++;
        while (i < line.length && (line[i] ?? "") !== "'") {
          const curr = line[i] ?? "";
          const next = line[i + 1] ?? "";
          if (curr === "\\" && i + 1 < line.length) {
            chStr += curr + next;
            i += 2;
          } else {
            chStr += curr;
            i++;
          }
        }
        if (i < line.length) {
          chStr += "'";
          i++;
        }
        tokens.push({ type: isPython ? "string" : "char", text: chStr });
        continue;
      }

      if (char === "(" || char === "{" || char === "[") {
        bracketDepth++;
        const level = ((bracketDepth - 1) % 5) + 1;
        const bType = `bracket${level}` as TokenType;
        tokens.push({ type: bType, text: char });
        i++;
        continue;
      }
      if (char === ")" || char === "}" || char === "]") {
        const level = (Math.max(0, bracketDepth - 1) % 5) + 1;
        const bType = `bracket${level}` as TokenType;
        tokens.push({ type: bType, text: char });
        bracketDepth = Math.max(0, bracketDepth - 1);
        i++;
        continue;
      }

      if (/\d/.test(char) || (char === "." && i + 1 < line.length && /\d/.test(nextChar))) {
        let numStr = "";
        while (i < line.length && /[0-9a-fA-FxX.eE_L]/.test(line[i] ?? "")) {
          numStr += line[i] ?? "";
          i++;
        }
        tokens.push({ type: "number", text: numStr });
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        let word = "";
        while (i < line.length && /[a-zA-Z0-9_]/.test(line[i] ?? "")) {
          word += line[i] ?? "";
          i++;
        }

        let isFuncCall = false;
        let lookAhead = i;
        while (lookAhead < line.length && /\s/.test(line[lookAhead] ?? "")) {
          lookAhead++;
        }
        if (lookAhead < line.length && (line[lookAhead] ?? "") === "(") {
          isFuncCall = true;
        }

        if (keywords.has(word)) {
          tokens.push({ type: "keyword", text: word });
        } else if (types.has(word)) {
          tokens.push({ type: "type", text: word });
        } else if (stdObjects.has(word)) {
          tokens.push({ type: "std", text: word });
        } else if (CPP_FUNCTIONS.has(word) || isFuncCall) {
          tokens.push({ type: "function", text: word });
        } else {
          tokens.push({ type: "plain", text: word });
        }
        continue;
      }

      if (/[+\-*/%=<>!&|^~?:;.,]/.test(char)) {
        let op = char;
        i++;
        if (i < line.length && /[+\-*/%=<>!&|:]/.test(line[i] ?? "")) {
          op += line[i] ?? "";
          i++;
        }
        tokens.push({ type: "operator", text: op });
        continue;
      }

      tokens.push({ type: "plain", text: char });
      i++;
    }

    return tokens;
  });
}

// Token CSS classes based on active theme
const THEME_CLASSES: Record<EditorTheme, Record<TokenType, string>> = {
  system: {
    directive: "text-rose-600 dark:text-rose-400 font-bold",
    header: "text-emerald-700 dark:text-emerald-400 font-semibold",
    keyword: "text-purple-700 dark:text-purple-400 font-bold",
    type: "text-sky-700 dark:text-cyan-300 font-bold",
    function: "text-amber-700 dark:text-amber-300 font-bold",
    string: "text-emerald-700 dark:text-lime-300",
    char: "text-emerald-700 dark:text-lime-400",
    number: "text-amber-700 dark:text-orange-400 font-mono font-semibold",
    comment: "text-stone-500 dark:text-slate-400/90 italic",
    std: "text-indigo-700 dark:text-teal-300 font-semibold",
    bracket1: "text-amber-700 dark:text-yellow-400 font-black",
    bracket2: "text-purple-700 dark:text-pink-400 font-black",
    bracket3: "text-sky-700 dark:text-sky-400 font-black",
    bracket4: "text-emerald-700 dark:text-emerald-400 font-black",
    bracket5: "text-orange-700 dark:text-orange-400 font-black",
    operator: "text-slate-600 dark:text-slate-300 font-medium",
    plain: "text-stone-900 dark:text-slate-100",
  },
  "paper-light": {
    directive: "text-[#b91c1c] font-bold",
    header: "text-[#15803d] font-semibold",
    keyword: "text-[#6d28d9] font-bold",
    type: "text-[#0369a1] font-bold",
    function: "text-[#c2410c] font-bold",
    string: "text-[#15803d]",
    char: "text-[#16a34a]",
    number: "text-[#b45309] font-mono font-semibold",
    comment: "text-[#78716c] italic",
    std: "text-[#4338ca] font-bold",
    bracket1: "text-[#b45309] font-black",
    bracket2: "text-[#7c3aed] font-black",
    bracket3: "text-[#0284c7] font-black",
    bracket4: "text-[#16a34a] font-black",
    bracket5: "text-[#ea580c] font-black",
    operator: "text-[#475569] font-semibold",
    plain: "text-[#1c1917]",
  },
  "github-light": {
    directive: "text-[#cf222e] font-bold",
    header: "text-[#116329] font-semibold",
    keyword: "text-[#cf222e] font-semibold",
    type: "text-[#0550ae] font-semibold",
    function: "text-[#8250df] font-bold",
    string: "text-[#0a3069]",
    char: "text-[#0a3069]",
    number: "text-[#0550ae] font-mono",
    comment: "text-[#6e7781] italic",
    std: "text-[#116329] font-semibold",
    bracket1: "text-[#0550ae] font-black",
    bracket2: "text-[#cf222e] font-black",
    bracket3: "text-[#8250df] font-black",
    bracket4: "text-[#116329] font-black",
    bracket5: "text-[#953800] font-black",
    operator: "text-[#0550ae]",
    plain: "text-[#24292f]",
  },
  "solarized-light": {
    directive: "text-[#cb4b16] font-bold",
    header: "text-[#859900] font-semibold",
    keyword: "text-[#859900] font-semibold",
    type: "text-[#b58900] font-semibold",
    function: "text-[#268bd2] font-bold",
    string: "text-[#2aa198]",
    char: "text-[#2aa198]",
    number: "text-[#d33682] font-mono",
    comment: "text-[#93a1a1] italic",
    std: "text-[#6c71c4] font-semibold",
    bracket1: "text-[#cb4b16] font-black",
    bracket2: "text-[#268bd2] font-black",
    bracket3: "text-[#859900] font-black",
    bracket4: "text-[#2aa198] font-black",
    bracket5: "text-[#d33682] font-black",
    operator: "text-[#859900]",
    plain: "text-[#586e75]",
  },
  "dark-studio": {
    directive: "text-rose-400 font-bold",
    header: "text-emerald-400 font-medium",
    keyword: "text-purple-400 font-semibold",
    type: "text-cyan-300 font-semibold",
    function: "text-amber-300 font-bold",
    string: "text-lime-300",
    char: "text-lime-400",
    number: "text-orange-400 font-mono",
    comment: "text-slate-400/90 italic",
    std: "text-teal-300 font-semibold",
    bracket1: "text-yellow-400 font-extrabold",
    bracket2: "text-pink-400 font-extrabold",
    bracket3: "text-sky-400 font-extrabold",
    bracket4: "text-emerald-400 font-extrabold",
    bracket5: "text-orange-400 font-extrabold",
    operator: "text-slate-300 font-medium",
    plain: "text-slate-100",
  },
  "cyber-neon": {
    directive: "text-fuchsia-400 font-bold drop-shadow-[0_0_8px_rgba(232,121,249,0.5)]",
    header: "text-cyan-300 font-medium drop-shadow-[0_0_6px_rgba(103,232,249,0.5)]",
    keyword: "text-pink-400 font-bold",
    type: "text-cyan-400 font-bold",
    function: "text-yellow-300 font-extrabold drop-shadow-[0_0_6px_rgba(253,224,71,0.5)]",
    string: "text-emerald-300",
    char: "text-green-300",
    number: "text-amber-400 font-mono font-bold",
    comment: "text-indigo-300/70 italic",
    std: "text-teal-300 font-bold",
    bracket1: "text-yellow-300 font-black",
    bracket2: "text-fuchsia-400 font-black",
    bracket3: "text-cyan-300 font-black",
    bracket4: "text-lime-400 font-black",
    bracket5: "text-orange-400 font-black",
    operator: "text-purple-300 font-bold",
    plain: "text-white",
  },
  dracula: {
    directive: "text-[#ff79c6] font-bold",
    header: "text-[#50fa7b]",
    keyword: "text-[#ff79c6] font-semibold",
    type: "text-[#8be9fd] font-semibold",
    function: "text-[#50fa7b] font-bold",
    string: "text-[#f1fa8c]",
    char: "text-[#f1fa8c]",
    number: "text-[#bd93f9] font-mono",
    comment: "text-[#6272a4] italic",
    std: "text-[#ffb86c] font-semibold",
    bracket1: "text-[#f1fa8c] font-black",
    bracket2: "text-[#ff79c6] font-black",
    bracket3: "text-[#8be9fd] font-black",
    bracket4: "text-[#50fa7b] font-black",
    bracket5: "text-[#ffb86c] font-black",
    operator: "text-[#ff79c6]",
    plain: "text-[#f8f8f2]",
  },
  monokai: {
    directive: "text-[#f92672] font-bold",
    header: "text-[#e6db74]",
    keyword: "text-[#f92672] font-semibold",
    type: "text-[#66d9ef] font-semibold",
    function: "text-[#a6e22e] font-bold",
    string: "text-[#e6db74]",
    char: "text-[#e6db74]",
    number: "text-[#ae81ff] font-mono",
    comment: "text-[#75715e] italic",
    std: "text-[#fd971f] font-semibold",
    bracket1: "text-[#e6db74] font-black",
    bracket2: "text-[#f92672] font-black",
    bracket3: "text-[#66d9ef] font-black",
    bracket4: "text-[#a6e22e] font-black",
    bracket5: "text-[#fd971f] font-black",
    operator: "text-[#f92672]",
    plain: "text-[#f8f8f2]",
  },
  "github-dark": {
    directive: "text-[#ff7b72] font-bold",
    header: "text-[#7ee787]",
    keyword: "text-[#ff7b72] font-semibold",
    type: "text-[#79c0ff] font-semibold",
    function: "text-[#d2a8ff] font-bold",
    string: "text-[#a5d6ff]",
    char: "text-[#a5d6ff]",
    number: "text-[#ffa657] font-mono",
    comment: "text-[#8b949e] italic",
    std: "text-[#56d364] font-semibold",
    bracket1: "text-[#e3b341] font-black",
    bracket2: "text-[#f778ba] font-black",
    bracket3: "text-[#58a6ff] font-black",
    bracket4: "text-[#7ee787] font-black",
    bracket5: "text-[#ffa657] font-black",
    operator: "text-[#ff7b72]",
    plain: "text-[#c9d1d9]",
  },
  nord: {
    directive: "text-[#81a1c1] font-bold",
    header: "text-[#a3be8c]",
    keyword: "text-[#81a1c1] font-semibold",
    type: "text-[#88c0d0] font-semibold",
    function: "text-[#88c0d0] font-bold",
    string: "text-[#a3be8c]",
    char: "text-[#a3be8c]",
    number: "text-[#b48ead] font-mono",
    comment: "text-[#616e88] italic",
    std: "text-[#d8dee9] font-semibold",
    bracket1: "text-[#ebcb8b] font-black",
    bracket2: "text-[#b48ead] font-black",
    bracket3: "text-[#88c0d0] font-black",
    bracket4: "text-[#a3be8c] font-black",
    bracket5: "text-[#d08770] font-black",
    operator: "text-[#81a1c1]",
    plain: "text-[#eceff4]",
  },
};

const THEME_BACKGROUNDS: Record<EditorTheme, string> = {
  system: "bg-card border-border/80 text-card-foreground",
  "paper-light": "bg-[#fbf8f1] border-[#e6decb] text-[#1c1917]",
  "github-light": "bg-[#ffffff] border-[#d0d7de] text-[#24292f]",
  "solarized-light": "bg-[#fdf6e3] border-[#eee8d5] text-[#586e75]",
  "dark-studio": "bg-[#0b0f19] border-[#1e293b] text-[#eceff4]",
  "cyber-neon": "bg-[#080718] border-[#2e1065] text-[#ffffff]",
  dracula: "bg-[#282a36] border-[#44475a] text-[#f8f8f2]",
  monokai: "bg-[#272822] border-[#3e3d32] text-[#f8f8f2]",
  "github-dark": "bg-[#0d1117] border-[#30363d] text-[#c9d1d9]",
  nord: "bg-[#2e3440] border-[#434c5e] text-[#eceff4]",
};

export function CppCodeEditor({
  code,
  onChange,
  onRun,
  onExportSnapshot,
  onPushToGithub,
  githubLoading,
  loading = false,
  disabled = false,
  language = "cpp",
}: CppCodeEditorProps) {
  const { mode } = useThemeColor();
  const isLight = mode === "light";

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [theme, setTheme] = useState<EditorTheme>("system");
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [cursorCol, setCursorCol] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Normalize any CRLF to LF so DOM textarea.selectionStart and string offsets match 1:1
  const normalizedCode = useMemo(() => code.replace(/\r\n?/g, "\n"), [code]);

  const effectiveTheme: EditorTheme = useMemo(() => {
    if (theme === "system") {
      return isLight ? "paper-light" : "dark-studio";
    }
    return theme;
  }, [theme, isLight]);

  const isThemeLight = useMemo(() => {
    return ["paper-light", "github-light", "solarized-light"].includes(effectiveTheme);
  }, [effectiveTheme]);

  // Exact pixel line height so gutter, highlight backdrop, and textarea never drift
  const lineHeightPx = useMemo(() => Math.round(fontSize * 1.75), [fontSize]);

  // Sync scroll between textarea, highlighter, and line numbers
  const handleScroll = useCallback(() => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }, []);

  // Update cursor line & column index strictly from live DOM textarea.value (or explicit override)
  // so it never slices a stale React `code` prop closure while typing!
  const updateCursorPosition = useCallback((overrideText?: string, overridePos?: number) => {
    const textarea = textareaRef.current;
    if (!textarea && overrideText === undefined) return;
    const liveText = overrideText ?? textarea?.value ?? "";
    const pos = overridePos ?? textarea?.selectionStart ?? 0;
    const clampedPos = Math.max(0, Math.min(pos, liveText.length));
    const textBefore = liveText.slice(0, clampedPos);
    const linesBefore = textBefore.split("\n");
    setCursorLine(linesBefore.length);
    const currentLineText = linesBefore[linesBefore.length - 1] ?? "";
    setCursorCol(currentLineText.length + 1);
  }, []);

  const scrollToTop = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
      textareaRef.current.scrollLeft = 0;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = 0;
      highlightRef.current.scrollLeft = 0;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = 0;
    }
    setCursorLine(1);
    setCursorCol(1);
  }, []);

  // Synchronously restore cursor selection after programmatic edits (Tab, Enter, auto-close brackets, snippets)
  // and keep cursorLine locked to the live textarea selection after every render commit
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (pendingSelectionRef.current !== null) {
      const { start, end } = pendingSelectionRef.current;
      pendingSelectionRef.current = null;
      textarea.selectionStart = start;
      textarea.selectionEnd = end;
      updateCursorPosition(textarea.value, start);
      handleScroll();
    } else if (typeof document !== "undefined" && document.activeElement === textarea) {
      updateCursorPosition(textarea.value, textarea.selectionStart);
    }
  }, [normalizedCode, updateCursorPosition, handleScroll]);

  // When language changes or code is replaced externally while textarea is not focused, reset scroll to top so line 1 is always visible
  useEffect(() => {
    if (typeof document !== "undefined" && document.activeElement !== textareaRef.current) {
      scrollToTop();
    }
  }, [language, normalizedCode, scrollToTop]);

  // Tokenize code
  const tokenizedLines = useMemo(
    () => tokenizeCode(normalizedCode, language),
    [normalizedCode, language]
  );
  const lineCount = tokenizedLines.length;

  // Handle Tab key, auto-closing brackets, and auto-indentation on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // Run shortcut Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.();
      return;
    }

    // Tab key -> 4 spaces indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const tabSpace = "    ";
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const newCode = before + tabSpace + after;
      const nextPos = selectionStart + tabSpace.length;
      pendingSelectionRef.current = { start: nextPos, end: nextPos };
      onChange(newCode);
      updateCursorPosition(newCode, nextPos);
      return;
    }

    // Enter key -> Auto-indent matching previous line or increment for { or :
    if (e.key === "Enter") {
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = value.substring(lineStart, selectionStart);
      const matchIndent = currentLine.match(/^\s*/);
      let indent = matchIndent ? matchIndent[0] : "";

      if (
        currentLine.trimEnd().endsWith("{") ||
        (language === "python" && currentLine.trimEnd().endsWith(":"))
      ) {
        indent += "    ";
      }

      e.preventDefault();
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const newCode = before + "\n" + indent + after;
      const nextPos = selectionStart + 1 + indent.length;
      pendingSelectionRef.current = { start: nextPos, end: nextPos };
      onChange(newCode);
      updateCursorPosition(newCode, nextPos);
      return;
    }

    // Auto-close brackets: (), {}, [], "", ''
    const pairs: Record<string, string> = {
      "(": ")",
      "{": "}",
      "[": "]",
      '"': '"',
      "'": "'",
    };

    if (pairs[e.key] && selectionStart === selectionEnd) {
      const closeChar = pairs[e.key];
      e.preventDefault();
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const newCode = before + e.key + closeChar + after;
      const nextPos = selectionStart + 1;
      pendingSelectionRef.current = { start: nextPos, end: nextPos };
      onChange(newCode);
      updateCursorPosition(newCode, nextPos);
      return;
    }

    // Skip over closing bracket if typed directly
    if ([")", "}", "]", '"', "'"].includes(e.key) && value[selectionStart] === e.key) {
      e.preventDefault();
      const nextPos = selectionStart + 1;
      textarea.selectionStart = textarea.selectionEnd = nextPos;
      updateCursorPosition(value, nextPos);
      return;
    }
  };

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  // Download code file
  const handleDownload = () => {
    const extensionMap: Record<SupportedLanguage, string> = {
      cpp: "cpp",
      c: "c",
      java: "java",
      python: "py",
    };
    const ext = extensionMap[language] || "cpp";
    const filename = language === "java" ? "Main.java" : `solution.${ext}`;
    const blob = new Blob([normalizedCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  // Format code (Simple auto-indentation)
  const handleFormat = () => {
    const lines = normalizedCode.split("\n");
    let indentLevel = 0;
    const formatted = lines
      .map((raw) => {
        const trimmed = raw.trim();
        if (trimmed.startsWith("}") || trimmed.startsWith(")")) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        const indentStr = "    ".repeat(indentLevel);
        const result = indentStr + trimmed;
        if (
          trimmed.endsWith("{") ||
          trimmed.endsWith("(") ||
          (trimmed.endsWith(":") && !trimmed.startsWith("default:"))
        ) {
          indentLevel++;
        }
        return result;
      })
      .join("\n");

    onChange(formatted);
    toast.success("Auto-formatted code!");
  };

  // Insert quick snippets
  const insertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const cleanSnippet = snippet.replace(/\r\n?/g, "\n");
    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);
    const newCode = before + cleanSnippet + after;
    const nextPos = selectionStart + cleanSnippet.length;
    pendingSelectionRef.current = { start: nextPos, end: nextPos };
    onChange(newCode);
    textarea.focus();
    updateCursorPosition(newCode, nextPos);
  };

  const themeClasses = THEME_CLASSES[effectiveTheme];
  const themeBg = THEME_BACKGROUNDS[effectiveTheme];
  const langLabel = language === "java" ? "Java" : language === "python" ? "Python" : language === "c" ? "C" : "C++";
  const langExt = language === "python" ? "py" : language === "java" ? "java" : language === "c" ? "c" : "cpp";

  return (
    <div
      className={`group flex flex-col h-full rounded-2xl border transition-colors duration-300 overflow-hidden ${
        isFullscreen
          ? "fixed inset-4 z-[100] bg-background/95 border-primary/50 shadow-[0_0_80px_-15px_rgba(var(--primary),0.3)] backdrop-blur-2xl"
          : `${themeBg} border-border/80 shadow-xl`
      }`}
    >
      {/* Top IDE Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 shrink-0 ${
          isThemeLight
            ? "border-[#e6decb] bg-[#f4efe4]/90 text-[#1c1917]"
            : "border-slate-800 bg-slate-900/90 text-slate-100"
        }`}
      >
        {/* Editor File Tab & Status + Primary Run Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/20 border border-primary/40 text-primary font-black text-xs font-mono">
              {language === "cpp" ? "C++" : language === "c" ? "C" : language === "java" ? "Java" : "Py"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs sm:text-[13px] font-bold">
                  {language === "cpp" ? "main.cpp" : language === "c" ? "main.c" : language === "java" ? "Main.java" : "main.py"}
                </span>
                <span className="rounded-md bg-primary/15 border border-primary/35 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-primary">
                  {language === "cpp" ? "C++20" : language === "c" ? "C17" : language === "java" ? "Java 25" : "Python 3.12"}
                </span>
              </div>
              <div className="font-mono text-[10px] opacity-75">
                Ln {cursorLine}, Col {cursorCol} • {lineCount} lines
              </div>
            </div>
          </div>

          {/* Primary Run & Export Buttons */}
          <div className="flex items-center gap-1.5">
            {onRun && (
              <Button
                onClick={() => onRun()}
                disabled={loading || disabled}
                size="sm"
                className="h-8 gap-1.5 rounded-xl px-3.5 font-mono text-[11px] font-bold shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
                title={`Run ${langLabel} Code (Ctrl + Enter)`}
              >
                {loading ? (
                  <>
                    <Zap className="size-3.5 animate-spin" />
                    <span>RUNNING...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3.5 fill-current" />
                    <span>RUN {langLabel.toUpperCase()}</span>
                    <kbd className="hidden sm:inline-flex items-center rounded bg-primary-foreground/20 px-1.5 py-0.2 text-[9px] font-mono">
                      Ctrl+↵
                    </kbd>
                  </>
                )}
              </Button>
            )}

            {onExportSnapshot && (
              <Button
                onClick={onExportSnapshot}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl px-2.5 font-mono text-[11px] font-bold border-purple-500/50 bg-purple-500/15 text-purple-400 hover:bg-purple-600 hover:text-white transition-all cursor-pointer"
                title="Export Styled Code Snapshot PNG"
              >
                <Camera className="size-3.5" />
                <span className="hidden xl:inline">Snapshot</span>
              </Button>
            )}

            {onPushToGithub && (
              <Button
                onClick={() => onPushToGithub(code)}
                disabled={githubLoading || disabled}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl px-2.5 font-mono text-[11px] font-bold border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 transition-all cursor-pointer"
                title="Push code to GitHub repository"
              >
                {githubLoading ? (
                  <Zap className="size-3.5 animate-spin text-amber-400" />
                ) : (
                  <Github className="size-3.5" />
                )}
                <span className="hidden xl:inline">GitHub</span>
              </Button>
            )}

            <AddToNotesButton
              variant="compact"
              getItem={() => ({
                title: `${langLabel.toUpperCase()} Code Solution (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
                sourceType: "COMPILER_CODE",
                codeSnippet: code,
                codeLanguage: language,
                tags: ["Compiler", langLabel],
              })}
            />
          </div>
        </div>

        {/* Editor Appearance & Utility Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Theme Picker */}
          <div
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${
              isThemeLight
                ? "border-stone-300 bg-white text-stone-800"
                : "border-slate-700 bg-slate-950/90 text-slate-200"
            }`}
          >
            <Palette className="size-3 text-primary" />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as EditorTheme)}
              aria-label="Editor Theme"
              className="bg-transparent font-mono text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="system" className="bg-slate-900 text-slate-100">
                Auto ({isLight ? "Light Paper" : "Dark Studio"})
              </option>
              <optgroup label="Dark Themes" className="bg-slate-900 text-slate-100">
                <option value="dark-studio">Studio Dark</option>
                <option value="github-dark">GitHub Dark</option>
                <option value="dracula">Dracula</option>
                <option value="monokai">Monokai Pro</option>
                <option value="cyber-neon">Cyber Neon</option>
                <option value="nord">Nordic Frost</option>
              </optgroup>
              <optgroup label="Light Themes" className="bg-slate-900 text-slate-100">
                <option value="paper-light">Warm Paper</option>
                <option value="github-light">GitHub Light</option>
                <option value="solarized-light">Solarized Light</option>
              </optgroup>
            </select>
          </div>

          {/* Font Size Selector */}
          <div
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 ${
              isThemeLight
                ? "border-stone-300 bg-white text-stone-800"
                : "border-slate-700 bg-slate-950/90 text-slate-200"
            }`}
          >
            <Type className="size-3 text-primary" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              aria-label="Font Size"
              className="bg-transparent font-mono text-[11px] focus:outline-none cursor-pointer"
            >
              <option value={12} className="bg-slate-900 text-slate-100">12px</option>
              <option value={13} className="bg-slate-900 text-slate-100">13px</option>
              <option value={14} className="bg-slate-900 text-slate-100">14px</option>
              <option value={15} className="bg-slate-900 text-slate-100">15px</option>
              <option value={16} className="bg-slate-900 text-slate-100">16px</option>
              <option value={18} className="bg-slate-900 text-slate-100">18px</option>
            </select>
          </div>

          {/* Format Code */}
          <button
            type="button"
            onClick={handleFormat}
            title="Auto-Indent / Format Code"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
              isThemeLight
                ? "border-stone-300 bg-white text-stone-800 hover:border-primary hover:text-primary"
                : "border-slate-700 bg-slate-950/80 text-slate-200 hover:border-primary hover:text-primary"
            }`}
          >
            <Sparkles className="size-3 text-primary" />
            <span className="hidden sm:inline">Format</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title="Copy source code"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
              isThemeLight
                ? "border-stone-300 bg-white text-stone-800 hover:border-primary hover:text-primary"
                : "border-slate-700 bg-slate-950/80 text-slate-200 hover:border-primary hover:text-primary"
            }`}
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Download File */}
          <button
            type="button"
            onClick={handleDownload}
            title={`Download .${langExt} file`}
            className={`inline-flex items-center justify-center rounded-lg border p-1.5 transition-colors cursor-pointer ${
              isThemeLight
                ? "border-stone-300 bg-white text-stone-800 hover:border-primary hover:text-primary"
                : "border-slate-700 bg-slate-950/80 text-slate-200 hover:border-primary hover:text-primary"
            }`}
          >
            <Download className="size-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
            className={`inline-flex items-center justify-center rounded-lg border p-1.5 transition-colors cursor-pointer ${
              isThemeLight
                ? "border-stone-300 bg-white text-stone-800 hover:border-primary hover:text-primary"
                : "border-slate-700 bg-slate-950/80 text-slate-200 hover:border-primary hover:text-primary"
            }`}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {/* High-Contrast Quick Code Snippets Bar */}
      <div
        className={`flex items-center gap-2 border-b px-3.5 py-2 overflow-x-auto scrollbar-thin shrink-0 ${
          isThemeLight
            ? "border-[#e6decb] bg-[#efe9dc] text-[#1c1917]"
            : "border-slate-800 bg-[#111827] text-slate-100"
        }`}
      >
        <div className="flex items-center gap-1.5 rounded-lg bg-primary/20 border border-primary/40 px-2.5 py-1 text-[10px] font-mono font-extrabold uppercase tracking-wider text-primary shrink-0">
          <Code2 className="size-3.5 text-primary" />
          <span>1-Click Snippets:</span>
        </div>

        {(LANGUAGE_SNIPPETS[language] || LANGUAGE_SNIPPETS.cpp).map((snip) => (
          <button
            key={snip.label}
            type="button"
            onClick={() => insertSnippet(snip.code)}
            title={`Click to insert at cursor:\n${snip.code}`}
            className={`group/snip inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-all shrink-0 active:scale-95 cursor-pointer ${
              isThemeLight
                ? "border-stone-300 bg-white text-stone-900 hover:border-primary hover:bg-primary/10 shadow-2xs"
                : "border-slate-700 bg-slate-900 text-slate-100 hover:border-primary hover:bg-primary/20 shadow-2xs"
            }`}
          >
            <span className="font-extrabold text-primary">+ {snip.label}</span>
            <span
              className={`hidden md:inline rounded px-1.5 py-0.2 text-[10px] ${
                isThemeLight
                  ? "bg-stone-100 text-stone-600"
                  : "bg-slate-950 text-slate-300"
              }`}
            >
              {snip.preview}
            </span>
          </button>
        ))}
      </div>

      {/* Editor Body: Line Numbers Gutter + Synchronized Syntax Overlay + Textarea */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className={`select-none overflow-hidden border-r text-right font-mono shrink-0 ${
            isThemeLight
              ? "bg-[#f5f0e6] border-[#e6decb] text-[#78716c]"
              : "border-slate-800/80 bg-[#070a12] text-slate-500"
          }`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeightPx}px`,
            paddingTop: "16px",
            paddingBottom: "64px",
            width: `${Math.max(48, String(lineCount).length * 10 + 28)}px`,
          }}
        >
          {Array.from({ length: lineCount }).map((_, idx) => {
            const lineNum = idx + 1;
            const isCurrent = lineNum === cursorLine;
            return (
              <div
                key={`ln-${lineNum}`}
                style={{
                  height: `${lineHeightPx}px`,
                  lineHeight: `${lineHeightPx}px`,
                }}
                className={`pr-3 pl-2 transition-colors ${
                  isCurrent
                    ? isThemeLight
                      ? "bg-amber-500/20 font-black text-amber-800 shadow-[inset_3px_0_0_0_#d97706]"
                      : "bg-indigo-500/25 font-black text-indigo-300 shadow-[inset_3px_0_0_0_#818cf8]"
                    : ""
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Code Content Viewport */}
        <div className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
          {/* Syntax Highlighted Backdrop Overlay (overflow-hidden so scrollbars never mismatch textarea) */}
          <div
            ref={highlightRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden font-mono select-none"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeightPx}px`,
              tabSize: 4,
              whiteSpace: "pre",
              wordWrap: "normal",
            }}
          >
            <div
              className="min-w-full w-max"
              style={{
                paddingTop: "16px",
                paddingBottom: "64px",
              }}
            >
              {tokenizedLines.map((lineTokens, lineIdx) => {
                const lineNum = lineIdx + 1;
                const isCurrent = lineNum === cursorLine;
                return (
                  <div
                    key={`hl-line-${lineIdx}`}
                    style={{
                      height: `${lineHeightPx}px`,
                      lineHeight: `${lineHeightPx}px`,
                    }}
                    className={`px-4 min-w-full ${
                      isCurrent
                        ? isThemeLight
                          ? "bg-amber-500/16"
                          : "bg-indigo-500/18"
                        : ""
                    }`}
                  >
                    {lineTokens.length === 0 ||
                    (lineTokens.length === 1 && lineTokens[0]?.text === "") ? (
                      <span>&nbsp;</span>
                    ) : (
                      lineTokens.map((token, tokIdx) => {
                        const colorClass = themeClasses[token.type] || themeClasses.plain;
                        return (
                          <span key={`tok-${lineIdx}-${tokIdx}`} className={colorClass}>
                            {token.text}
                          </span>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Textarea on Top (transparent text for caret & selection) */}
          <textarea
            ref={textareaRef}
            value={normalizedCode}
            wrap="off"
            onChange={(e) => {
              const nextVal = e.target.value;
              const nextPos = e.target.selectionStart ?? 0;
              onChange(nextVal);
              updateCursorPosition(nextVal, nextPos);
            }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onClick={() => updateCursorPosition()}
            onKeyUp={() => updateCursorPosition()}
            onSelect={() => updateCursorPosition()}
            onFocus={() => updateCursorPosition()}
            disabled={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label={`${langLabel} Code Editor`}
            className={`absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent px-4 font-mono text-transparent focus:outline-none ${
              isThemeLight
                ? "caret-[#1c1917] selection:bg-amber-500/25 selection:text-transparent"
                : "caret-indigo-400 selection:bg-indigo-500/30 selection:text-transparent"
            }`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${lineHeightPx}px`,
              paddingTop: "16px",
              paddingBottom: "64px",
              tabSize: 4,
              whiteSpace: "pre",
              wordWrap: "normal",
              overflowWrap: "normal",
            }}
          />
        </div>
      </div>

      {/* Editor Footer Status Bar */}
      <div
        className={`flex items-center justify-between border-t px-4 py-1.5 font-mono text-[11px] shrink-0 ${
          isThemeLight
            ? "border-[#e6decb] bg-[#f4efe4] text-[#57534e]"
            : "border-slate-800 bg-[#070a12] text-slate-400"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ln {cursorLine}, Col {cursorCol}</span>
          </span>
          <span className="hidden sm:inline opacity-40">|</span>
          <span className="hidden sm:inline">{lineCount} lines ({code.length} chars)</span>
          <span className="hidden md:inline opacity-40">|</span>
          <span className="hidden md:inline">UTF-8 • 4 Spaces</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold hover:text-primary transition-colors cursor-pointer"
            title="Scroll Code Sheet to Line 1"
          >
            <ArrowUpToLine className="size-3 text-primary" />
            <span>Top (Line 1)</span>
          </button>
          <span className="opacity-40">|</span>
          <span className="hidden sm:inline">Run:</span>
          <kbd
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
              isThemeLight ? "bg-stone-200 text-stone-800" : "bg-slate-800 text-slate-200"
            }`}
          >
            Ctrl+Enter
          </kbd>
        </div>
      </div>
    </div>
  );
}

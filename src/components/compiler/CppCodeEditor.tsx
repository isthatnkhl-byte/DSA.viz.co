import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import {
  Copy,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  Code,
  Type,
  Palette,
  Play,
  Zap,
  Camera,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EditorTheme, SupportedLanguage } from "@/lib/compiler.types";
import { useThemeColor } from "@/hooks/useThemeColor";

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

export const LANGUAGE_SNIPPETS: Record<SupportedLanguage, { label: string; code: string }[]> = {
  cpp: [
    { label: "cout << endl;", code: "cout <<  << endl;" },
    { label: "cin >>", code: "cin >> ;" },
    { label: "vector<int>", code: "vector<int> nums;" },
    { label: "for loop", code: "for (int i = 0; i < n; ++i) {\n    \n}" },
    { label: "unordered_map", code: "unordered_map<int, int> mp;" },
    { label: "min-heap", code: "priority_queue<int, vector<int>, greater<int>> minPq;" },
    { label: "sort()", code: "sort(nums.begin(), nums.end());" },
    { label: "reverse()", code: "reverse(nums.begin(), nums.end());" },
    { label: "2D vector", code: "vector<vector<int>> matrix(rows, vector<int>(cols, 0));" },
    { label: "if-else", code: "if (condition) {\n    \n} else {\n    \n}" },
  ],
  c: [
    { label: "printf()", code: 'printf("%d\\n", val);' },
    { label: "scanf()", code: 'scanf("%d", &val);' },
    { label: "for loop", code: "for (int i = 0; i < n; i++) {\n    \n}" },
    { label: "malloc()", code: "int* arr = (int*)malloc(n * sizeof(int));" },
    { label: "free()", code: "free(arr);" },
    { label: "struct Node", code: "typedef struct Node {\n    int val;\n    struct Node* next;\n} Node;" },
    { label: "if-else", code: "if (condition) {\n    \n} else {\n    \n}" },
  ],
  java: [
    { label: "System.out.println()", code: "System.out.println();" },
    { label: "Scanner sc", code: "Scanner sc = new Scanner(System.in);" },
    { label: "for loop", code: "for (int i = 0; i < n; i++) {\n    \n}" },
    { label: "List<Integer>", code: "List<Integer> list = new ArrayList<>();" },
    { label: "Map<K, V>", code: "Map<Integer, Integer> map = new HashMap<>();" },
    { label: "PriorityQueue", code: "PriorityQueue<Integer> minHeap = new PriorityQueue<>();" },
    { label: "Arrays.sort()", code: "Arrays.sort(nums);" },
    { label: "if-else", code: "if (condition) {\n    \n} else {\n    \n}" },
  ],
  python: [
    { label: "print()", code: "print()" },
    { label: "def func():", code: "def solve():\n    pass" },
    { label: "for loop", code: "for i in range(n):\n    pass" },
    { label: "list comp", code: "[x for x in nums]" },
    { label: "seen = {}", code: "seen = {}" },
    { label: "deque()", code: "queue = deque([])" },
    { label: "heapq", code: "heapq.heappush(heap, item)" },
    { label: "if-else", code: "if condition:\n    pass\nelse:\n    pass" },
  ],
};

// Tokenize source code with rainbow bracket pair levels across C++, C, Java, and Python
function tokenizeCode(code: string, language: SupportedLanguage = "cpp"): Token[][] {
  const lines = code.split("\n");
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

    // Directives for C / C++ (#include, #define) or Java (import / package)
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

      // Python comments #
      if (isPython && char === "#") {
        tokens.push({ type: "comment", text: line.slice(i) });
        break;
      }

      // C/C++/Java line comment //
      if (!isPython && char === "/" && nextChar === "/") {
        tokens.push({ type: "comment", text: line.slice(i) });
        break;
      }

      // C/C++/Java block comment /* ... */
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

      // String literal "..." or Python """..."""
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

      // Char literal '.' or Python single quoted string '...'
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

      // Rainbow Brackets: ( ) { } [ ]
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

      // Numbers (integers, floats, scientific 1e9, 0LL)
      if (/\d/.test(char) || (char === "." && i + 1 < line.length && /\d/.test(nextChar))) {
        let numStr = "";
        while (i < line.length && /[0-9a-fA-FxX.eE_L]/.test(line[i] ?? "")) {
          numStr += line[i] ?? "";
          i++;
        }
        tokens.push({ type: "number", text: numStr });
        continue;
      }

      // Identifiers / Words
      if (/[a-zA-Z_]/.test(char)) {
        let word = "";
        while (i < line.length && /[a-zA-Z0-9_]/.test(line[i] ?? "")) {
          word += line[i] ?? "";
          i++;
        }

        // Check next non-whitespace char for function call '('
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

      // Operators: <<, >>, ++, --, ->, ==, !=, <=, >=, &&, ||, ::
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

      // Whitespace and other characters
      tokens.push({ type: "plain", text: char });
      i++;
    }

    return tokens;
  });
}

function tokenizeCpp(code: string): Token[][] {
  return tokenizeCode(code, "cpp");
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

  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [theme, setTheme] = useState<EditorTheme>("system");
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const effectiveTheme: EditorTheme = useMemo(() => {
    if (theme === "system") {
      return isLight ? "paper-light" : "dark-studio";
    }
    return theme;
  }, [theme, isLight]);

  const isThemeLight = useMemo(() => {
    return ["paper-light", "github-light", "solarized-light"].includes(effectiveTheme);
  }, [effectiveTheme]);

  // Sync scroll between textarea, highlighter, and line numbers
  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  // Update cursor line index
  const updateCursorLine = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const linesBefore = code.slice(0, pos).split("\n").length;
    setCursorLine(linesBefore);
  };

  // Tokenize code
  const tokenizedLines = useMemo(() => tokenizeCode(code, language), [code, language]);
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
      onChange(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + tabSpace.length;
        updateCursorLine();
      }, 0);
      return;
    }

    // Enter key -> Auto-indent matching previous line or increment for {
    if (e.key === "Enter") {
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = value.substring(lineStart, selectionStart);
      const matchIndent = currentLine.match(/^\s*/);
      let indent = matchIndent ? matchIndent[0] : "";

      if (currentLine.trimEnd().endsWith("{")) {
        indent += "    ";
      }

      e.preventDefault();
      const before = value.substring(0, selectionStart);
      const after = value.substring(selectionEnd);
      const newCode = before + "\n" + indent + after;
      onChange(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + indent.length;
        updateCursorLine();
      }, 0);
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
      onChange(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        updateCursorLine();
      }, 0);
      return;
    }

    // Skip over closing bracket if typed directly
    if ([")", "}", "]", '"', "'"].includes(e.key) && value[selectionStart] === e.key) {
      e.preventDefault();
      textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      updateCursorLine();
      return;
    }
  };

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
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
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
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
    const lines = code.split("\n");
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
    const before = value.substring(0, selectionStart);
    const after = value.substring(selectionEnd);
    const newCode = before + snippet + after;
    onChange(newCode);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = selectionStart + snippet.length;
      updateCursorLine();
    }, 0);
  };

  const themeClasses = THEME_CLASSES[effectiveTheme];
  const themeBg = THEME_BACKGROUNDS[effectiveTheme];

  return (
    <div
      className={`group flex flex-col h-full rounded-2xl border transition-all duration-500 overflow-hidden ${
        isFullscreen
          ? "fixed inset-4 z-[100] bg-background/95 border-primary/50 shadow-[0_0_80px_-15px_rgba(var(--primary),0.3)] backdrop-blur-2xl"
          : `${themeBg} border-border/60 hover:border-primary/40 shadow-xl hover:shadow-[0_8px_30px_-12px_rgba(var(--primary),0.2)]`
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-card/40 backdrop-blur-md px-4 py-3 relative z-10">
        {/* Editor Title & Status + Direct Run Button */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 text-primary shadow-inner font-black text-xs font-mono">
            {language === "cpp" ? "C++" : language === "c" ? "C" : language === "java" ? "Java" : "Py"}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[13px] font-bold text-foreground/90">
                {language === "cpp" ? "main.cpp" : language === "c" ? "main.c" : language === "java" ? "Main.java" : "main.py"}
              </span>
              <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 font-mono text-[9px] font-black tracking-wider uppercase text-primary shadow-[0_0_10px_-2px_rgba(var(--primary),0.4)]">
                {language === "cpp" ? "C++20" : language === "c" ? "C17" : language === "java" ? "Java 25" : "Python 3.12"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-tight mt-0.5">
              Line {cursorLine} <span className="opacity-50 mx-1">•</span> {code.length} chars
            </span>
          </div>

          {/* Quick Run Action Button right beside main.cpp */}
          <div className="flex items-center gap-2">
            {onPushToGithub && (
              <Button
                onClick={() => onPushToGithub(code)}
                disabled={githubLoading || disabled}
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl px-3 font-mono text-[11px] font-bold transition-all duration-300 hover:scale-105 active:scale-95 border-[#24292e]/40 bg-[#24292e]/10 text-foreground hover:bg-[#24292e]/20 hover:border-[#24292e]/60 shadow-sm"
                title="Push to GitHub"
              >
                {githubLoading ? (
                  <Zap className="size-4 animate-spin" />
                ) : (
                  <Github className="size-4" />
                )}
                <span className="hidden sm:inline-block tracking-wide">PUSH TO GITHUB</span>
              </Button>
            )}

            {onRun && (
              <Button
                onClick={() => onRun()}
                disabled={loading || disabled}
                size="sm"
                className="ml-2 h-9 gap-2 rounded-xl px-4 font-mono text-[11px] font-bold shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-primary/40 active:scale-95 bg-primary text-primary-foreground border border-primary-foreground/10"
                title="Run C++ Code (Ctrl + Enter)"
              >
                {loading ? (
                  <>
                    <Zap className="size-4 animate-spin" />
                    <span className="tracking-wide">RUNNING...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" />
                    <span className="tracking-wide">RUN CODE</span>
                    <kbd className="hidden sm:flex items-center justify-center rounded bg-primary-foreground/25 px-1.5 py-0.5 text-[9px] font-mono opacity-100 ml-1 shadow-inner">
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
                className="h-9 gap-1.5 rounded-xl px-3 font-mono text-[11px] font-bold transition-all duration-300 hover:scale-105 active:scale-95 border-border/60 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 shadow-sm"
                title="Export Code Snapshot"
              >
                <Camera className="size-4" />
                <span className="hidden sm:inline-block tracking-wide">SNAPSHOT</span>
              </Button>
            )}
          </div>
        </div>

        {/* Action Controls & Customizers */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Theme Picker */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1">
            <Palette className="size-3.5 text-muted-foreground" />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as EditorTheme)}
              aria-label="Editor Theme"
              className="bg-transparent font-mono text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="system">Auto ({isLight ? "Light Paper" : "Dark Studio"})</option>
              <optgroup label="Light Themes">
                <option value="paper-light">Warm Paper (Crème)</option>
                <option value="github-light">GitHub Light</option>
                <option value="solarized-light">Solarized Light</option>
              </optgroup>
              <optgroup label="Dark Themes">
                <option value="dark-studio">Studio Dark</option>
                <option value="cyber-neon">Cyber Neon</option>
                <option value="dracula">Dracula</option>
                <option value="monokai">Monokai Pro</option>
                <option value="github-dark">GitHub Dark</option>
                <option value="nord">Nordic Frost</option>
              </optgroup>
            </select>
          </div>

          {/* Font Size Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1">
            <Type className="size-3.5 text-muted-foreground" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              aria-label="Font Size"
              className="bg-transparent font-mono text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value={12}>12px</option>
              <option value={13}>13px</option>
              <option value={14}>14px (Default)</option>
              <option value={15}>15px</option>
              <option value={16}>16px</option>
              <option value={18}>18px</option>
            </select>
          </div>

          {/* Format Code */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            title="Auto Indent / Format"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            <Sparkles className="mr-1 size-3.5 text-primary" />
            <span className="hidden sm:inline">Format</span>
          </Button>

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            title="Copy source code"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            {copied ? (
              <>
                <Check className="mr-1 size-3.5 text-success" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy className="mr-1 size-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </Button>

          {/* Download File */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            title="Download .cpp file"
            className="h-8 px-2 text-xs text-muted-foreground hover:bg-secondary active:scale-95"
          >
            <Download className="size-3.5" />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
            className="h-8 px-2 text-xs text-muted-foreground hover:bg-secondary active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Quick Snippets Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/40 bg-card/20 px-4 py-3 text-xs backdrop-blur-sm overflow-x-auto scrollbar-thin">
        <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mr-2 shrink-0">
          <Sparkles className="size-3 text-primary/80" /> Snippets
        </span>
        {(LANGUAGE_SNIPPETS[language] || LANGUAGE_SNIPPETS.cpp).map((snip) => (
          <button
            key={snip.label}
            type="button"
            onClick={() => insertSnippet(snip.code)}
            className="rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-primary/10 hover:text-primary px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-all shrink-0 active:scale-95 shadow-sm"
          >
            {snip.label}
          </button>
        ))}
      </div>

      {/* Editor Body: Line numbers + Synchronized Highlight Overlay + Textarea */}
      <div
        className="relative flex flex-1 overflow-hidden h-full"
        style={{
          minHeight: isFullscreen ? "calc(100vh - 120px)" : "100%",
        }}
      >
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className={`select-none overflow-hidden border-r py-5 pl-4 pr-3 text-right font-mono transition-all shrink-0 ${
            isThemeLight
              ? "bg-[#f8f5ef]/80 border-[#e6decb] text-[#78716c]/70 shadow-[inset_-4px_0_10px_-6px_rgba(0,0,0,0.05)]"
              : "border-border/30 bg-black/40 text-muted-foreground/50 shadow-[inset_-4px_0_10px_-6px_rgba(0,0,0,0.3)] backdrop-blur-md"
          }`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: "1.6rem",
            width: `${Math.max(38, String(lineCount).length * 10 + 20)}px`,
          }}
        >
          {Array.from({ length: lineCount }).map((_, idx) => {
            const lineNum = idx + 1;
            const isCurrent = lineNum === cursorLine;
            return (
              <div
                key={`ln-${lineNum}`}
                className={`transition-colors leading-[1.6rem] ${
                  isCurrent
                    ? "font-bold text-primary"
                    : isThemeLight
                    ? "text-[#a8a29e]"
                    : "text-muted-foreground/40"
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Code Content Container */}
        <div className="relative flex-1 overflow-hidden">
          {/* Syntax Highlighted Backdrop Overlay */}
          <div
            ref={highlightRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-auto py-4 px-4 font-mono select-none"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: "1.6rem",
              tabSize: 4,
              whiteSpace: "pre",
              wordWrap: "normal",
            }}
          >
            {tokenizedLines.map((lineTokens, lineIdx) => {
              const lineNum = lineIdx + 1;
              const isCurrent = lineNum === cursorLine;
              return (
                <div
                  key={`hl-line-${lineIdx}`}
                  className={`min-h-[1.6rem] leading-[1.6rem] ${
                    isCurrent
                      ? isThemeLight
                        ? "bg-[#ede4cf]/70 -mx-4 px-4 rounded-xs"
                        : "bg-primary/5 -mx-4 px-4 rounded-xs"
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

          {/* Interactive Textarea on Top (transparent text for caret & selection) */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => {
              onChange(e.target.value);
              updateCursorLine();
            }}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onClick={updateCursorLine}
            onKeyUp={updateCursorLine}
            disabled={disabled}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="C++ Code Editor"
            className={`absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent py-4 px-4 font-mono text-transparent focus:outline-none ${
              isThemeLight
                ? "caret-[#1c1917] selection:bg-[#cbd5e1] selection:text-transparent"
                : "caret-primary selection:bg-primary/30 selection:text-transparent"
            }`}
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: "1.6rem",
              tabSize: 4,
              whiteSpace: "pre",
              wordWrap: "normal",
            }}
          />
        </div>
      </div>

      {/* Editor Footer Status Bar */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/40 dark:bg-black/40 px-4 py-2 font-mono text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ready</span>
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="hidden sm:inline">UTF-8</span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="hidden sm:inline">Spaces: 4</span>
        </div>

        <div className="flex items-center gap-2">
          <span>Shortcuts:</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
            Ctrl+Enter
          </kbd>
          <span>Run</span>
        </div>
      </div>
    </div>
  );
}

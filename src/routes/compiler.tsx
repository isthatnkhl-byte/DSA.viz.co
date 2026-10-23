import { createFileRoute, Link } from "@tanstack/react-router";
import { AiWord } from "@/components/brand/AiWord";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import { toPng } from "html-to-image";
import {
  Terminal,
  Play,
  RotateCcw,
  ArrowLeft,
  BookOpen,
  Zap,
  Code2,
  Copy,
  Trash2,
  Cpu,
  Camera,
  Github,
  Plus,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { CppCodeEditor } from "@/components/compiler/CppCodeEditor";
import { CppConsole } from "@/components/compiler/CppConsole";
import { Highlight, themes } from "prism-react-renderer";
import { CppPackageExplorer } from "@/components/compiler/CppPackageExplorer";
import {
  CPP_DSA_TEMPLATES,
  PLAIN_CPP_STARTER,
  getStarterForLanguage,
  getFastIoTemplateForLanguage,
  getTemplatesForLanguage,
} from "@/lib/compiler-templates";
import { apiExecuteCode } from "@/lib/api-client";
import type { CompilerExecutionResult, CppTemplate, SupportedLanguage } from "@/lib/compiler.types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";
import { useChat } from "@/context/ChatContext";
import {
  pushSolutionToGithub,
  resumePendingGithubPushIfPresent,
} from "@/lib/github-sync";

export const Route = createFileRoute("/compiler")({
  head: () => ({
    meta: [
      { title: "Online Compiler & DSA Runner (C++, C, Java, Python) — DSA.viz" },
      {
        name: "description",
        content:
          "Sandboxed online compiler & DSA execution runner supporting C++, C, Java, and Python. Interactive standard I/O streams, diagnostic output, and algorithm templates.",
      },
      {
        property: "og:title",
        content: "Online Compiler & DSA Runner (C++, C, Java, Python) — DSA.viz",
      },
      {
        property: "og:description",
        content:
          "Sandboxed online code runner for C++, C, Java, and Python with live stdin/stdout and standard algorithm templates.",
      },
    ],
  }),
  component: CppCompilerPage,
});

type CompilerMode = "plain" | "templates";

interface LanguageSpec {
  id: SupportedLanguage;
  label: string;
  name: string;
  engine: string;
  optimization: string;
  ext: string;
  storageKeyCode: string;
  storageKeyStdin: string;
}

const LANGUAGES: LanguageSpec[] = [
  {
    id: "cpp",
    label: "C++",
    name: "C++20",
    engine: "GCC 14.1 (C++20)",
    optimization: "-O2 Fast",
    ext: "cpp",
    storageKeyCode: "dsa_plain_cpp_code_v1",
    storageKeyStdin: "dsa_plain_cpp_stdin_v1",
  },
  {
    id: "c",
    label: "C",
    name: "C17",
    engine: "GCC 14.1 (C17)",
    optimization: "-O2 Fast",
    ext: "c",
    storageKeyCode: "dsa_plain_c_code_v1",
    storageKeyStdin: "dsa_plain_c_stdin_v1",
  },
  {
    id: "java",
    label: "Java",
    name: "Java 25",
    engine: "OpenJDK 25",
    optimization: "Bytecode JIT",
    ext: "java",
    storageKeyCode: "dsa_plain_java_code_v1",
    storageKeyStdin: "dsa_plain_java_stdin_v1",
  },
  {
    id: "python",
    label: "Python",
    name: "Python 3.12",
    engine: "Python 3.12",
    optimization: "CPython 3.12",
    ext: "py",
    storageKeyCode: "dsa_plain_python_code_v1",
    storageKeyStdin: "dsa_plain_python_stdin_v1",
  },
];

const DEFAULT_LANGUAGE_SPEC: LanguageSpec = {
  id: "cpp",
  label: "C++",
  name: "C++20",
  engine: "GCC 14.1 (C++20)",
  optimization: "-O2 Fast",
  ext: "cpp",
  storageKeyCode: "dsa_plain_cpp_code_v1",
  storageKeyStdin: "dsa_plain_cpp_stdin_v1",
};

const LANGUAGE_PRO_TIPS: Record<
  SupportedLanguage,
  {
    title: string;
    subtitle: string;
    tips: { title: string; code: string; desc: string }[];
  }
> = {
  cpp: {
    title: "C++ DSA Pro Snippets & Idioms",
    subtitle: "High-frequency competitive programming & interview patterns",
    tips: [
      {
        title: "⚡ Fast I/O Boilerplate",
        code: "ios_base::sync_with_stdio(false);\ncin.tie(NULL);",
        desc: "Unties C++ streams from C stdio to reduce I/O buffering overhead on large inputs.",
      },
      {
        title: "🧭 4-Direction Grid Vectors",
        code: "int dx[] = {0, 0, 1, -1};\nint dy[] = {1, -1, 0, 0};",
        desc: "Iterate cleanly over adjacent cells in 2D grid BFS/DFS traversals.",
      },
      {
        title: "🔢 Modulo 10^9 + 7 Arithmetic",
        code: "const long long MOD = 1e9 + 7;\nans = (ans + val) % MOD;",
        desc: "Prevents 64-bit integer overflow in combinatorial DP problems.",
      },
      {
        title: "🗂️ Min-Heap Priority Queue",
        code: "priority_queue<int, vector<int>, greater<int>> minHeap;",
        desc: "Standard C++ default is Max-Heap. Use greater<int> for Min-Heap.",
      },
    ],
  },
  c: {
    title: "C DSA Pro Snippets & Idioms",
    subtitle: "Memory management, qsort comparators & pointer discipline",
    tips: [
      {
        title: "⚡ Dynamic Array Allocation",
        code: "int* arr = (int*)malloc(n * sizeof(int));\n// ... work ...\nfree(arr);",
        desc: "Always remember to free heap memory to prevent memory leaks.",
      },
      {
        title: "🧭 qsort Integer Comparator",
        code: "int cmp(const void* a, const void* b) {\n    return (*(int*)a - *(int*)b);\n}",
        desc: "qsort uses void pointers. Cast to int* before dereferencing.",
      },
      {
        title: "🔢 Fast Scanf / Printf Loop",
        code: "int n;\nwhile (scanf(\"%d\", &n) == 1) {\n    printf(\"%d\\n\", n);\n}",
        desc: "C stdio is inherently fast and ideal for memory-constrained problems.",
      },
      {
        title: "🗂️ Singly Linked List Node",
        code: "typedef struct Node {\n    int data;\n    struct Node* next;\n} Node;",
        desc: "Standard self-referential struct definition for linked lists in C.",
      },
    ],
  },
  java: {
    title: "Java DSA Pro Snippets & Idioms",
    subtitle: "JVM performance, Collections framework & comparator lambdas",
    tips: [
      {
        title: "⚡ Fast I/O with BufferedReader",
        code: "BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\nStringTokenizer st = new StringTokenizer(br.readLine());",
        desc: "Avoid Scanner in large input tests (>10^5 operations) to prevent TLE.",
      },
      {
        title: "🧭 HashMap Frequency Counter",
        code: "map.put(key, map.getOrDefault(key, 0) + 1);",
        desc: "Single-line idiom for counting element frequencies in O(1).",
      },
      {
        title: "🔢 Min-Heap vs Max-Heap",
        code: "PriorityQueue<Integer> minHeap = new PriorityQueue<>();\nPriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());",
        desc: "Default PriorityQueue in Java is Min-Heap. Use reverseOrder() for Max-Heap.",
      },
      {
        title: "🗂️ Safe Interval Sorting",
        code: "Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));",
        desc: "Use Integer.compare instead of subtraction to avoid 32-bit overflow.",
      },
    ],
  },
  python: {
    title: "Python DSA Pro Snippets & Idioms",
    subtitle: "Pythonic algorithmic speed, deque, heapq & memoization",
    tips: [
      {
        title: "⚡ Buffered Standard Input",
        code: "import sys\ninput = sys.stdin.read\ntokens = input().split()",
        desc: "Reads all of stdin in a single buffered operation rather than line-by-line input() calls.",
      },
      {
        title: "🧭 Double-Ended Queue (BFS)",
        code: "from collections import deque\nqueue = deque([root])\nnode = queue.popleft()",
        desc: "list.pop(0) is O(N). Always use collections.deque for O(1) pops.",
      },
      {
        title: "🔢 Min-Heap with heapq",
        code: "import heapq\nheapq.heappush(heap, val)\nsmallest = heapq.heappop(heap)",
        desc: "Python heapq implements an in-place binary min-heap on standard lists.",
      },
      {
        title: "🗂️ Automatic DP Memoization",
        code: "from functools import lru_cache\n@lru_cache(maxsize=None)\ndef dp(i, j):\n    return 0",
        desc: "Converts recursive top-down logic into memoized DP in one line.",
      },
    ],
  },
};

function CppCompilerPage() {
  const { user, token } = useAuth();
  const { data: profileStats } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: async () => {
      if (!token) return { profile: null };
      const res = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { profile: null };
      return { profile: await res.json() };
    },
    enabled: !!user && !!token,
  });

  // Active language state
  const [language, setLanguage] = useState<SupportedLanguage>("cpp");
  const activeLangConfig: LanguageSpec = useMemo(
    () => LANGUAGES.find((l) => l.id === language) ?? DEFAULT_LANGUAGE_SPEC,
    [language]
  );

  const [githubLoading, setGithubLoading] = useState(false);

  // Active workspace mode: "plain" (freeform scratchpad) vs "templates" (guided DSA questions)
  const [mode, setMode] = useState<CompilerMode>("plain");

  // Mode 1: Plain / Custom Freeform Workspace State
  const [plainCode, setPlainCode] = useState<string>(PLAIN_CPP_STARTER);
  const [plainStdin, setPlainStdin] = useState<string>("");
  const [plainResult, setPlainResult] = useState<CompilerExecutionResult | null>(null);

  // Mode 2: DSA Templates Guided Practice State
  const activeTemplates = useMemo(() => getTemplatesForLanguage(language), [language]);
  const defaultTemplate = activeTemplates[0] || CPP_DSA_TEMPLATES[0]!;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate.id);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [templateCode, setTemplateCode] = useState<string>(defaultTemplate.code);
  const [templateStdin, setTemplateStdin] = useState<string>(defaultTemplate.defaultStdin || "");
  const [templateResult, setTemplateResult] = useState<CompilerExecutionResult | null>(null);

  useEffect(() => {
    void resumePendingGithubPushIfPresent();
  }, [user?.uid]);

  const handlePushToGithub = async (codeStr: string) => {
    setGithubLoading(true);
    try {
      const titleSlug =
        mode === "templates" && selectedTemplateId
          ? selectedTemplateId
          : `${language}-sandbox`;

      const result = await pushSolutionToGithub({
        code: codeStr,
        titleSlug,
        lang: language,
        fallbackProfileToken: (profileStats?.profile as any)?.githubToken || null,
      });

      if (result.ok && result.url) {
        toast.success(`Successfully pushed ${activeLangConfig.label} code to GitHub!`, {
          action: {
            label: "View",
            onClick: () => window.open(result.url, "_blank"),
          },
        });
      }
    } catch {
      toast.error("An error occurred while pushing to GitHub");
    } finally {
      setGithubLoading(false);
    }
  };

  // Loading state for server execution
  const [loading, setLoading] = useState(false);

  const { updateContext } = useChat();

  // Load saved code from localStorage for the active language on mount or language switch
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(activeLangConfig.storageKeyCode);
      if (savedCode && typeof savedCode === "string" && savedCode.trim() && savedCode !== "[object Object]") {
        setPlainCode(savedCode);
      } else {
        setPlainCode(getStarterForLanguage(language));
      }

      const savedStdin = localStorage.getItem(activeLangConfig.storageKeyStdin);
      if (savedStdin !== null && typeof savedStdin === "string" && savedStdin !== "[object Object]") {
        setPlainStdin(savedStdin);
      } else {
        setPlainStdin("");
      }
    } catch {
      setPlainCode(getStarterForLanguage(language));
      setPlainStdin("");
    }
  }, [language, activeLangConfig]);

  // When active templates change (e.g. language switch), load the first template
  useEffect(() => {
    const firstTmpl = activeTemplates[0];
    if (firstTmpl) {
      setSelectedTemplateId(firstTmpl.id);
      setTemplateCode(firstTmpl.code);
      setTemplateStdin(firstTmpl.defaultStdin || "");
      setTemplateResult(null);
    }
  }, [activeTemplates]);

  // Update AI Buddy context (debounced so typing in the code editor never triggers extra context re-renders)
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeCode = mode === "plain" ? plainCode : templateCode;
      const activeRes = mode === "plain" ? plainResult : templateResult;
      updateContext({
        route: "/compiler",
        problemTitle:
          mode === "plain"
            ? `${activeLangConfig.label} DSA Compiler Sandbox`
            : `${activeLangConfig.label} Template: ${selectedTemplateId}`,
        userCode: activeCode,
        compilerOutput: activeRes ? `${activeRes.stdout || ""}\n${activeRes.stderr || ""}`.trim() : undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, plainCode, templateCode, plainResult, templateResult, selectedTemplateId, activeLangConfig, updateContext]);

  const updatePlainCode = (newCode: string) => {
    setPlainCode(newCode);
    try {
      localStorage.setItem(activeLangConfig.storageKeyCode, newCode);
    } catch {
      // Ignore
    }
  };

  const updatePlainStdin = (newStdin: unknown) => {
    const str = typeof newStdin === "string" ? newStdin : "";
    setPlainStdin(str);
    try {
      localStorage.setItem(activeLangConfig.storageKeyStdin, str);
    } catch {
      // Ignore
    }
  };

  const handleSwitchLanguage = (newLang: SupportedLanguage) => {
    if (newLang === language) return;
    try {
      localStorage.setItem(activeLangConfig.storageKeyCode, plainCode);
      localStorage.setItem(activeLangConfig.storageKeyStdin, plainStdin);
    } catch {
      // Ignore
    }

    setLanguage(newLang);
    setPlainResult(null);
    setTemplateResult(null);
    setSelectedCategory("All");

    const targetSpec = LANGUAGES.find((l) => l.id === newLang);
    toast.info(`Switched to ${targetSpec?.label} (${targetSpec?.engine})`);
  };

  const categories = [
    "All",
    "Basics",
    "Arrays & Pointers",
    "Data Structures",
    "Trees & Graphs",
    "Dynamic Programming",
    "Algorithms",
  ];

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "All") return activeTemplates;
    return activeTemplates.filter((t) => t.category === selectedCategory);
  }, [selectedCategory, activeTemplates]);

  const loadTemplate = (tmpl: CppTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setTemplateCode(tmpl.code);
    setTemplateStdin(tmpl.defaultStdin || "");
    setTemplateResult(null);
    toast.info(`Loaded template: ${tmpl.title}`);
  };

  const copyTemplateToPlain = () => {
    updatePlainCode(templateCode);
    updatePlainStdin(templateStdin);
    setPlainResult(null);
    setMode("plain");
    toast.success(
      `Copied template to ${activeLangConfig.label} Playground!`
    );
  };

  const activeCode =
    typeof (mode === "plain" ? plainCode : templateCode) === "string"
      ? mode === "plain"
        ? plainCode
        : templateCode
      : "";
  const activeStdin =
    typeof (mode === "plain" ? plainStdin : templateStdin) === "string"
      ? mode === "plain"
        ? plainStdin
        : templateStdin
      : "";
  const activeResult = mode === "plain" ? plainResult : templateResult;

  const setActiveCode = (val: string) => {
    if (mode === "plain") {
      updatePlainCode(val);
    } else {
      setTemplateCode(val);
    }
  };

  const setActiveStdin = (val: unknown) => {
    const str = typeof val === "string" ? val : "";
    if (mode === "plain") {
      updatePlainStdin(str);
    } else {
      setTemplateStdin(str);
    }
  };

  const setActiveResult = (res: CompilerExecutionResult | null) => {
    if (mode === "plain") {
      setPlainResult(res);
    } else {
      setTemplateResult(res);
    }
  };

  const handleExecute = async (overrideStdin?: string) => {
    if (!activeCode.trim()) {
      toast.error(`Please enter some ${activeLangConfig.label} code to run`);
      return;
    }

    const validOverride = typeof overrideStdin === "string" ? overrideStdin : undefined;
    const stdinToUse = validOverride !== undefined ? validOverride : activeStdin;
    if (validOverride !== undefined && validOverride !== activeStdin) {
      setActiveStdin(validOverride);
    }

    setLoading(true);
    try {
      const res = await apiExecuteCode({
        code: activeCode.trim(),
        stdin: typeof stdinToUse === "string" ? stdinToUse : "",
        language,
      });

      setActiveResult(res);

      if (res.status === "success") {
        toast.success("Execution completed successfully");
      } else if (res.status === "compilation_error") {
        toast.error("Compilation error. Check diagnostic output.");
      } else if (res.status === "timeout") {
        toast.warning("Time limit exceeded (sandbox limit).");
      } else {
        toast.error("Runtime error occurred.");
      }
    } catch (err) {
      console.error("[Compiler] Execution error:", err);
      toast.error("Failed to execute code. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut Ctrl/Cmd + Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleExecute();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCode, activeStdin]);

  const handleInsertHeader = (headerInclude: string) => {
    if (activeCode.includes(headerInclude)) {
      toast.info(`${headerInclude} is already included in your code.`);
      return;
    }
    setActiveCode(`${headerInclude}\n${activeCode}`);
    toast.success(`Added ${headerInclude}`);
  };

  const handleClearConsole = () => {
    setActiveResult(null);
    toast.info("Console output cleared");
  };

  const handleResetPlainStarter = () => {
    const starter = getStarterForLanguage(language);
    updatePlainCode(starter);
    updatePlainStdin("");
    setPlainResult(null);
    toast.info(`Reset to standard 'Hello, World!' ${activeLangConfig.label} starter`);
  };

  const handleLoadPlainFastIO = () => {
    const fastIo = getFastIoTemplateForLanguage(language);
    updatePlainCode(fastIo);
    updatePlainStdin("10 25");
    setPlainResult(null);
    toast.info(`Loaded Fast I/O ${activeLangConfig.label} boilerplate`);
  };

  const handleClearPlainEditor = () => {
    updatePlainCode("");
    updatePlainStdin("");
    setPlainResult(null);
    toast.info(`Cleared ${activeLangConfig.label} editor`);
  };

  const snapshotRef = useRef<HTMLDivElement>(null);
  const editorSectionRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportSnapshot = async () => {
    if (!snapshotRef.current) return;
    try {
      setIsExporting(true);
      toast.info("Generating beautiful snapshot...");
      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = await toPng(snapshotRef.current, {
        quality: 1,
        pixelRatio: 2,
        style: {
          display: "flex",
          opacity: "1",
        },
      });

      const link = document.createElement("a");
      link.download = `${language}-code-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Snapshot saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate snapshot");
    } finally {
      setIsExporting(false);
    }
  };

  const currentProTips = LANGUAGE_PRO_TIPS[language] || LANGUAGE_PRO_TIPS.cpp;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-16">
      <SiteHeader />

      <main
        id="main-content"
        className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-4 sm:px-6 lg:px-8"
      >
        {/* Compact Studio Header & Command Deck — Crisp 2-Tier Layout With Zero Awkward Wrapping */}
        <div
          ref={editorSectionRef}
          className="mb-4 rounded-2xl border-[1.5px] border-dashed border-foreground/25 bg-card/90 px-4 py-3.5 sm:px-5 backdrop-blur-2xl shadow-lg"
        >
          {/* Tier 1: Studio Identity, Active Compiler Engine Telemetry & Run Shortcut */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/problems"
                className="group inline-flex h-8 items-center gap-1.5 rounded-md border border-foreground/20 bg-background/80 px-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>PROBLEMS</span>
              </Link>

              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 border border-primary/35 text-primary shrink-0">
                  <Terminal className="size-4" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-base sm:text-lg font-black tracking-tight text-foreground">
                    Online Compiler &amp; DSA Studio
                  </h1>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{activeLangConfig.engine}</span>
                    <span>•</span>
                    <span>{activeLangConfig.optimization}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span>Write code on the left, pass custom stdin &amp; inspect stdout on the right</span>
              <span className="text-foreground/30">|</span>
              <kbd className="rounded border border-foreground/20 bg-background px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                Ctrl + Enter
              </kbd>
            </div>
          </div>

          {/* Tier 2: Dedicated Single-Line Language Selector + Mode & Boilerplate Toolbar */}
          <div className="mt-3 pt-3 border-t border-dashed border-foreground/20 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Left Box: Single-Row Language Switcher (Never wraps onto 2 lines) */}
            <div className="inline-flex items-center gap-1 rounded-lg border border-foreground/20 bg-background/90 p-1 overflow-x-auto max-w-full scrollbar-none">
              <span className="px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5 shrink-0 border-r border-foreground/15 mr-0.5">
                <Cpu className="size-3.5 text-primary" />
                <span>LANG</span>
              </span>
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => handleSwitchLanguage(lang.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-mono text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    }`}
                  >
                    <span>{lang.label}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold leading-none ${
                        isSelected
                          ? "bg-black/20 text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {lang.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Box: Unified Mode Switcher & Boilerplate Action Group on One Horizontal Line */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
              {/* Segmented Mode Toggle: Playground vs Templates */}
              <div className="inline-flex items-center gap-1 rounded-lg border border-foreground/20 bg-background/90 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setMode("plain")}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mode === "plain"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  <Code2 className="size-3.5" />
                  <span>Playground</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("templates")}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-mono text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    mode === "templates"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                  }`}
                >
                  <BookOpen className="size-3.5" />
                  <span>Templates ({activeTemplates.length})</span>
                </button>
              </div>

              {/* Cohesive Boilerplate & Editor Action Box */}
              {mode === "plain" ? (
                <div className="inline-flex items-center gap-1 rounded-lg border border-foreground/20 bg-background/90 p-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetPlainStarter}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-mono text-xs font-semibold text-foreground/90 hover:bg-secondary/80 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer"
                    title="Reset to standard Hello World starter"
                  >
                    <RotateCcw className="size-3.5 text-primary" />
                    <span>Starter</span>
                  </button>

                  <div className="h-4 w-px bg-foreground/15" />

                  <button
                    type="button"
                    onClick={handleLoadPlainFastIO}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-mono text-xs font-semibold text-foreground/90 hover:bg-secondary/80 hover:text-foreground transition-colors whitespace-nowrap cursor-pointer"
                    title="Load Fast I/O Competitive Programming Boilerplate"
                  >
                    <Zap className="size-3.5 text-amber-500" />
                    <span>Fast I/O</span>
                  </button>

                  <div className="h-4 w-px bg-foreground/15" />

                  <button
                    type="button"
                    onClick={handleClearPlainEditor}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 font-mono text-xs font-semibold text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors whitespace-nowrap cursor-pointer"
                    title="Clear Editor"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center rounded-lg border border-foreground/20 bg-background/90 p-1 shrink-0">
                  <button
                    type="button"
                    onClick={copyTemplateToPlain}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground px-3 font-mono text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Copy className="size-3.5" />
                    <span>Copy to Playground</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Expandable DSA Algorithm Templates Bar (when in "templates" mode) */}
          {mode === "templates" && (
            <div className="mt-3 pt-3 border-t border-dashed border-foreground/20 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary" />
                  <span>Select {activeLangConfig.label} Algorithm Template:</span>
                </span>

                <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-foreground/15 bg-background/80 p-1">
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-bold transition-all cursor-pointer ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {filteredTemplates.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => loadTemplate(tmpl)}
                      className={`shrink-0 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/20 text-primary font-bold shadow-xs"
                          : "border-foreground/20 bg-background/90 text-foreground/90 hover:border-primary/40"
                      }`}
                    >
                      <span>{tmpl.title}</span>
                      <span
                        className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          tmpl.difficulty === "Easy"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : tmpl.difficulty === "Medium"
                              ? "bg-amber-500/20 text-amber-500"
                              : "bg-rose-500/20 text-rose-500"
                        }`}
                      >
                        {tmpl.difficulty}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* PRIMARY IDE WORKSPACE: Code Sheet (Left) + Input/Output Console (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Pane (7/12 or 8/12): Code Sheet — Comfortable Fixed Viewport Height, Always Visible from Top */}
          <div className="lg:col-span-7 xl:col-span-8 h-[620px] lg:h-[680px]">
            <CppCodeEditor
              code={activeCode}
              language={language}
              onChange={setActiveCode}
              onRun={() => handleExecute()}
              onExportSnapshot={handleExportSnapshot}
              onPushToGithub={handlePushToGithub}
              githubLoading={githubLoading}
              loading={loading}
              disabled={loading}
            />
          </div>

          {/* Right Pane (5/12 or 4/12): Input (stdin) & Output (stdout) Console Directly Beside Code Sheet */}
          <div className="lg:col-span-5 xl:col-span-4 h-[620px] lg:h-[680px]">
            <CppConsole
              result={activeResult}
              loading={loading}
              stdin={activeStdin}
              code={activeCode}
              language={language}
              onStdinChange={setActiveStdin}
              onClear={handleClearConsole}
              onRun={() => handleExecute()}
            />
          </div>
        </div>

        {/* SECONDARY REFERENCE DECK: STL / Library Explorer & High-Contrast Code Snippets Vault */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          {/* Left 6 Cols: Interactive STL / Standard Library & Runnable Snippets */}
          <div className="lg:col-span-6">
            <CppPackageExplorer
              language={language}
              onInsertHeader={handleInsertHeader}
              onLoadSnippet={(snippet) => {
                setActiveCode(snippet);
                setActiveResult(null);
                editorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </div>

          {/* Right 6 Cols: High-Contrast Language Pro Snippets & Idioms */}
          <div className="lg:col-span-6 flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/85 p-5 shadow-xl backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent/15 border border-accent/35 text-accent">
                  <AiWord className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-foreground">
                    {currentProTips.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {currentProTips.subtitle}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-accent/35 bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-accent">
                1-Click Insert
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {currentProTips.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0b0f19] p-3.5 shadow-md hover:border-primary/50 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-indigo-300">
                        {tip.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCode(
                            activeCode + (activeCode.endsWith("\n") ? "" : "\n") + tip.code
                          );
                          toast.success(`Inserted "${tip.title}" into Code Sheet`);
                          editorSectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-xs"
                        title="Insert snippet into Code Sheet"
                      >
                        <Plus className="size-3" />
                        <span>Insert</span>
                      </button>
                    </div>

                    <pre className="text-xs font-mono font-medium text-slate-100 bg-[#060911] border border-slate-800/90 p-3 rounded-lg overflow-x-auto leading-relaxed">
                      {tip.code}
                    </pre>
                  </div>

                  <p className="mt-2.5 text-[11px] text-slate-400 leading-snug">
                    {tip.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hidden Snapshot Container */}
        <div className="overflow-hidden h-0 w-0 absolute left-[-9999px]">
          <div
            ref={snapshotRef}
            className="flex flex-col p-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 w-[1200px]"
            style={{ display: isExporting ? "flex" : "none" }}
          >
            {/* Inner Window */}
            <div className="flex flex-col rounded-2xl shadow-2xl bg-[#0d1117] border border-white/20 overflow-hidden backdrop-blur-xl">
              {/* Window Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]" />
                  </div>
                  <div className="text-white/80 font-mono text-sm font-bold ml-4">
                    DSA.viz — {activeLangConfig.label} Engine ({activeLangConfig.engine})
                  </div>
                </div>
                <div className="text-white/40 font-mono text-xs">{new Date().toLocaleDateString()}</div>
              </div>

              {/* Window Body */}
              <div className="flex flex-col gap-6 p-8">
                {/* Code */}
                <div className="flex flex-col gap-2">
                  <div className="text-white/50 text-xs font-mono uppercase tracking-widest font-bold">
                    Source Code ({activeLangConfig.ext})
                  </div>
                  <Highlight
                    theme={themes.vsDark}
                    code={activeCode}
                    language={
                      language === "python"
                        ? "python"
                        : language === "java"
                          ? "java"
                          : language === "c"
                            ? "c"
                            : "cpp"
                    }
                  >
                    {({ style, tokens, getLineProps, getTokenProps }) => (
                      <pre
                        className="bg-black/40 border border-white/5 rounded-xl p-6 text-[15px] leading-relaxed font-mono whitespace-pre-wrap"
                        style={{ ...style, backgroundColor: "transparent" }}
                      >
                        {tokens.map((line, i) => (
                          <div key={i} {...getLineProps({ line })}>
                            {line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                          </div>
                        ))}
                      </pre>
                    )}
                  </Highlight>
                </div>

                {/* Input & Output */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="text-white/50 text-xs font-mono uppercase tracking-widest font-bold">
                      Standard Input
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-5 text-sm font-mono text-white/70 whitespace-pre-wrap min-h-[120px]">
                      {activeStdin || "No input provided."}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="text-white/50 text-xs font-mono uppercase tracking-widest font-bold">
                      Standard Output
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-5 text-sm font-mono text-white/90 whitespace-pre-wrap min-h-[120px]">
                      {activeResult?.stdout ||
                        activeResult?.stderr ||
                        activeResult?.compile_output ||
                        "No output generated."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default CppCompilerPage;

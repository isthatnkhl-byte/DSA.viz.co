import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import { toPng } from "html-to-image";
import {
  Terminal,
  Play,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Zap,
  Code2,
  Copy,
  Trash2,
  Cpu,
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
  PLAIN_CPP_IO_TEMPLATE,
  PLAIN_C_STARTER,
  PLAIN_C_IO_TEMPLATE,
  PLAIN_JAVA_STARTER,
  PLAIN_JAVA_IO_TEMPLATE,
  PLAIN_PYTHON_STARTER,
  PLAIN_PYTHON_IO_TEMPLATE,
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

export const Route = createFileRoute("/compiler")({
  head: () => ({
    meta: [
      { title: "Online Compiler & DSA Runner (C++, C, Java, Python) — DSA.viz" },
      {
        name: "description",
        content:
          "Fast online compiler & DSA execution engine supporting C++, C, Java, and Python. Interactive standard I/O streams, diagnostic output, and FAANG algorithm templates.",
      },
      {
        property: "og:title",
        content: "Online Compiler & DSA Runner (C++, C, Java, Python) — DSA.viz",
      },
      {
        property: "og:description",
        content:
          "Zero-latency online code runner for C++, C, Java, and Python with live stdin/stdout and algorithm templates.",
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
    title: "C++ DSA Pro Tips",
    subtitle: "Speed patterns for coding interviews & contests",
    tips: [
      {
        title: "⚡ Fast I/O Boilerplate",
        code: "ios_base::sync_with_stdio(false);\ncin.tie(NULL);",
        desc: "Unties C++ streams from C stdio for 10x faster I/O execution.",
      },
      {
        title: "🧭 4-Direction Grid Vectors",
        code: "int dx[] = {0, 0, 1, -1};\nint dy[] = {1, -1, 0, 0};",
        desc: "Iterate cleanly over adjacent cells in 2D grid BFS/DFS traversals.",
      },
      {
        title: "🔢 Modulo 10^9 + 7",
        code: "const int MOD = 1e9 + 7;\nans = (ans + val) % MOD;",
        desc: "Prevents 64-bit integer overflow in combinatorial DP problems.",
      },
      {
        title: "🗂️ Min-Heap Declaration",
        code: "priority_queue<int, vector<int>, greater<int>> minHeap;",
        desc: "Standard C++ default is Max-Heap. Use greater<int> for Min-Heap.",
      },
    ],
  },
  c: {
    title: "C DSA Pro Tips",
    subtitle: "Memory management & pointer discipline",
    tips: [
      {
        title: "⚡ Dynamic Array Allocation",
        code: "int* arr = (int*)malloc(n * sizeof(int));\n// ... work ...\nfree(arr);",
        desc: "Always remember to free heap memory to prevent memory leaks.",
      },
      {
        title: "🧭 qsort Comparator",
        code: "int cmp(const void* a, const void* b) {\n    return (*(int*)a - *(int*)b);\n}",
        desc: "qsort uses void pointers. Cast to appropriate pointer type before dereferencing.",
      },
      {
        title: "🔢 Fast Scanf / Printf",
        code: "scanf(\"%d %d\", &a, &b);\nprintf(\"%d\\n\", ans);",
        desc: "C stdio is inherently fast and ideal for memory-constrained problems.",
      },
      {
        title: "🗂️ Struct Pointer Shorthand",
        code: "Node* curr = head;\nint val = curr->data;",
        desc: "Arrow operator -> is syntactic sugar for (*curr).data.",
      },
    ],
  },
  java: {
    title: "Java DSA Pro Tips",
    subtitle: "JVM performance & collections framework",
    tips: [
      {
        title: "⚡ Fast I/O with BufferedReader",
        code: "BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\nStringTokenizer st = new StringTokenizer(br.readLine());",
        desc: "Avoid Scanner in large input tests (>10^5 operations) to prevent TLE.",
      },
      {
        title: "🧭 HashMap Frequency Counter",
        code: "map.put(key, map.getOrDefault(key, 0) + 1);",
        desc: "Single-line idiom for counting frequencies in O(1).",
      },
      {
        title: "🔢 Min-Heap vs Max-Heap",
        code: "PriorityQueue<Integer> minHeap = new PriorityQueue<>();\nPriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());",
        desc: "Default PriorityQueue in Java is Min-Heap. Use reverseOrder() for Max-Heap.",
      },
      {
        title: "🗂️ Sort Pairs with Lambda",
        code: "Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));",
        desc: "Use Integer.compare instead of subtraction to avoid 32-bit integer overflow.",
      },
    ],
  },
  python: {
    title: "Python DSA Pro Tips",
    subtitle: "Pythonic algorithmic speed & built-ins",
    tips: [
      {
        title: "⚡ Ultra-Fast Standard Input",
        code: "import sys\ninput = sys.stdin.read\ntokens = input().split()",
        desc: "Reads entire stdin in one syscall. 5x faster than line-by-line input().",
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
        code: "from functools import lru_cache\n@lru_cache(maxsize=None)\ndef dp(i, j): ...",
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
  const handlePushToGithub = async (codeStr: string) => {
    if (!profileStats?.profile) {
      toast.error("Please log in to push to GitHub.");
      return;
    }
    const isConnected =
      !!(profileStats.profile as any).githubConnected || !!(profileStats.profile as any).githubToken;
    if (!isConnected) {
      toast.error("Please connect your GitHub account in your Profile first.");
      return;
    }

    setGithubLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const authToken = await currentUser?.getIdToken();

      const clientStoredToken =
        (typeof window !== "undefined" &&
          currentUser &&
          localStorage.getItem(`dsa_viz_github_token_${currentUser.uid}`)) ||
        undefined;

      const titleSlug = `${language}-sandbox`;

      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          code: codeStr,
          titleSlug,
          lang: language,
          githubToken: clientStoredToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to push to GitHub");
      } else {
        toast.success(`Successfully pushed ${activeLangConfig.label} code to GitHub!`, {
          action: {
            label: "View",
            onClick: () => window.open(data.url, "_blank"),
          },
        });
      }
    } catch (e) {
      toast.error("An error occurred while pushing to GitHub");
    } finally {
      setGithubLoading(false);
    }
  };

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

  // Update AI Buddy context
  useEffect(() => {
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
  }, [mode, plainCode, templateCode, plainResult, templateResult, selectedTemplateId, activeLangConfig, updateContext]);

  // Auto-persist plain scratchpad
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

  // Language switcher
  const handleSwitchLanguage = (newLang: SupportedLanguage) => {
    if (newLang === language) return;
    // Save current plain scratchpad before switching
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

  // Copy template code into plain scratchpad
  const copyTemplateToPlain = () => {
    updatePlainCode(templateCode);
    updatePlainStdin(templateStdin);
    setPlainResult(null);
    setMode("plain");
    toast.success(
      `Loaded template into Plain ${activeLangConfig.label} Playground! You can now freely edit and execute.`
    );
  };

  // Active Code, Stdin, and Execution Result based on selected mode
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

  // Execute code against the server endpoint
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

  // Plain mode helpers
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
    <div className="min-h-screen pb-20">
      <SiteHeader />

      <main id="main-content" className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 xl:px-12">
        {/* Executive Header Banner */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-10 backdrop-blur-2xl shadow-xl">
          {/* Subtle atmospheric ambient glows */}
          <div className="absolute -left-20 -top-20 size-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 size-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <Link
                to="/problems"
                className="group mb-2 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                <span>Back to Algorithm Library</span>
              </Link>
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-2">
                <Terminal className="size-3.5 text-primary" />
                <span>Zero-Latency Multi-Language Cloud Execution Engine</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                Online{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-emerald-400 bg-clip-text text-transparent">
                  Compiler &amp; Sandbox
                </span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground font-sans max-w-2xl leading-relaxed">
                High-performance sandboxed execution for C++, C, Java, and Python with interactive standard I/O streams, compiler diagnostic traces, GitHub snapshot push, and curated algorithmic templates.
              </p>
            </div>

            {/* Hardware & Runtime Telemetry Card */}
            <div className="rounded-2xl border border-border/80 bg-background/80 p-4 font-mono shadow-md backdrop-blur-xl shrink-0 w-full sm:w-auto flex items-center gap-6">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Compiler Engine</div>
                <div className="text-xl font-black text-foreground font-display">
                  {activeLangConfig.engine}
                </div>
              </div>
              <div className="h-10 w-px bg-border/60" />
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Execution Tier</div>
                <div className="text-xl font-black text-emerald-400 font-display">
                  {activeLangConfig.optimization}
                </div>
              </div>
            </div>
          </div>

          {/* Language Selector Bar */}
          <div className="mt-8 pt-6 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 bg-background/80 p-1.5 rounded-2xl border border-border/70 shadow-inner">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-2 flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" />
                <span>Language:</span>
              </span>
              {LANGUAGES.map((lang) => {
                const isSelected = language === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => handleSwitchLanguage(lang.id)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <span>{lang.label}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] ${
                        isSelected ? "bg-white/20 text-white font-semibold" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {lang.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 bg-background/80 p-1 rounded-2xl border border-border/70 shadow-inner">
              <button
                type="button"
                onClick={() => setMode("plain")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold transition-all ${
                  mode === "plain"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <Code2 className="size-4" />
                <span>⚡ Plain {activeLangConfig.label} Playground</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] ${
                    mode === "plain" ? "bg-white/20 text-white font-semibold" : "bg-muted text-muted-foreground"
                  }`}
                >
                  Custom Code &amp; I/O
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("templates")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-bold transition-all ${
                  mode === "templates"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <BookOpen className="size-4" />
                <span>📚 {activeLangConfig.label} Templates</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] ${
                    mode === "templates" ? "bg-white/20 text-white font-semibold" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {activeTemplates.length} Presets
                </span>
              </button>
            </div>
          </div>

          {/* Quick Context Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            {mode === "plain" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPlainStarter}
                  className="rounded-xl font-mono text-xs gap-1.5"
                >
                  <RotateCcw className="size-3 text-primary" />
                  <span>Hello World</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadPlainFastIO}
                  className="rounded-xl font-mono text-xs gap-1.5"
                >
                  <Zap className="size-3 text-amber-400" />
                  <span>Fast I/O Boilerplate</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearPlainEditor}
                  className="rounded-xl font-mono text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
                >
                  <Trash2 className="size-3" />
                  <span>Clear</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyTemplateToPlain}
                  className="rounded-xl font-mono text-xs gap-1.5 text-primary border-primary/40 hover:bg-primary/10"
                  title="Send current template into your Plain Playground scratchpad"
                >
                  <Copy className="size-3" />
                  <span>Copy to Plain Playground</span>
                </Button>
              </div>
            )}
          </div>

          {/* Mode-Specific Context Banners */}
          <div className="mt-6">
            {mode === "plain" ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-4 text-[13px] text-primary/90 shadow-[0_0_15px_-3px_rgba(var(--primary),0.15)] backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Sparkles className="size-5 shrink-0 text-primary" />
                  <span className="leading-relaxed">
                    <strong>Freeform {activeLangConfig.label} Scratchpad:</strong> Write your own arbitrary {activeLangConfig.label} logic,
                    pass custom inputs in the standard input panel below, and execute with zero restrictions. Your code is automatically persisted in your browser.
                  </span>
                </div>
              </div>
            ) : (
              /* DSA Question Templates Selector Bar */
              <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/40 p-6 shadow-lg backdrop-blur-2xl animate-fade">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="font-mono text-[13px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Code2 className="size-4 text-primary" />
                    <span>Filter {activeLangConfig.label} Algorithms by Topic:</span>
                  </span>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const isActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`rounded-md px-2.5 py-1 font-mono text-xs transition-all ${
                            isActive
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Template Buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {filteredTemplates.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => loadTemplate(tmpl)}
                        className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                          isSelected
                            ? "border-primary bg-primary/20 text-primary shadow-xs shadow-primary/20 font-bold scale-[1.02]"
                            : "border-border/80 bg-background/60 text-muted-foreground hover:bg-card hover:text-foreground"
                        }`}
                      >
                        <span>{tmpl.title}</span>
                        <span
                          className={`ml-2 text-[9px] px-1.5 py-px rounded ${
                            tmpl.difficulty === "Easy"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : tmpl.difficulty === "Medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
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
        </div>

        {/* Main Grid: Code Editor & Console (Left 8 cols), Packages & Cheat Sheet (Right 4 cols) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 xl:gap-10 mt-8">
          {/* Left Column: Code Editor & Output Console */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Code Editor */}
            <div className="min-h-[600px] h-[calc(100vh-250px)]">
              <CppCodeEditor
                code={activeCode}
                language={language}
                onChange={setActiveCode}
                onRun={handleExecute}
                onExportSnapshot={handleExportSnapshot}
                onPushToGithub={handlePushToGithub}
                githubLoading={githubLoading}
                loading={loading}
                disabled={loading}
              />
            </div>

            {/* Terminal Console with Stdout, Stdin, and Compiler Diagnostics */}
            <CppConsole
              result={activeResult}
              loading={loading}
              stdin={activeStdin}
              code={activeCode}
              language={language}
              onStdinChange={setActiveStdin}
              onClear={handleClearConsole}
              onRun={handleExecute}
            />
          </div>

          {/* Right Column: Headers / Packages Explorer & Cheatsheet */}
          <div className="flex flex-col gap-8 lg:col-span-4">
            {/* Packages Explorer */}
            <CppPackageExplorer
              language={language}
              onInsertHeader={handleInsertHeader}
              onLoadSnippet={(snippet) => {
                setActiveCode(snippet);
                setActiveResult(null);
              }}
            />

            {/* Language-Specific DSA Cheatsheet Card */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-5 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/20 text-accent shadow-inner">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-foreground tracking-tight">
                    {currentProTips.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/80 font-medium">
                    {currentProTips.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2 text-xs">
                {currentProTips.tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/50 bg-background/40 p-3 hover:bg-background/60 transition-colors"
                  >
                    <div className="font-bold text-primary font-mono text-[11px]">{tip.title}</div>
                    <pre className="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/40 p-1.5 rounded whitespace-pre-wrap">
                      {tip.code}
                    </pre>
                    <p className="mt-1 text-[10px] text-muted-foreground leading-tight">{tip.desc}</p>
                  </div>
                ))}
              </div>
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
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
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

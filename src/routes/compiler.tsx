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
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { CppCodeEditor } from "@/components/compiler/CppCodeEditor";
import { CppConsole } from "@/components/compiler/CppConsole";
import { Highlight, themes } from "prism-react-renderer";
import { CppPackageExplorer } from "@/components/compiler/CppPackageExplorer";
import {
  CPP_DSA_TEMPLATES,
  PLAIN_CPP_STARTER,
  PLAIN_CPP_IO_TEMPLATE,
} from "@/lib/compiler-templates";
import { apiExecuteCpp } from "@/lib/api-client";
import type { CppExecutionResult, CppTemplate } from "@/lib/compiler.types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getAuth } from "firebase/auth";

export const Route = createFileRoute("/compiler")({
  head: () => ({
    meta: [
      { title: "Online C++ Compiler & DSA Runner — DSA.viz" },
      {
        name: "description",
        content:
          "Fast online C++ compiler for raw DSA problem solving and freeform C++ scratchpad. Write standard C++, pass custom stdin, inspect stdout and compiler messages with rich syntax highlighting.",
      },
      {
        property: "og:title",
        content: "Online C++ Compiler & DSA Runner — DSA.viz",
      },
      {
        property: "og:description",
        content:
          "Practice raw DSA questions in C++ with standard STL libraries, interactive stdin, stdout terminal, and rich syntax colorization.",
      },
    ],
  }),
  component: CppCompilerPage,
});

type CompilerMode = "plain" | "templates";

const STORAGE_KEY_PLAIN_CODE = "dsa_plain_cpp_code_v1";
const STORAGE_KEY_PLAIN_STDIN = "dsa_plain_cpp_stdin_v1";

function CppCompilerPage() {
  const { user } = useAuth();
  const { token } = useAuth();
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

  const [githubLoading, setGithubLoading] = useState(false);
  const handlePushToGithub = async (codeStr: string) => {
    if (!profileStats?.profile) {
       toast.error("Please log in to push to GitHub.");
       return;
    }
    const isConnected = !!(profileStats.profile as any).githubConnected || !!(profileStats.profile as any).githubToken;
    if (!isConnected) {
      toast.error("Please connect your GitHub account in your Profile first.");
      return;
    }
    
    setGithubLoading(true);
    try {
      const auth = getAuth();
      const authToken = await auth.currentUser?.getIdToken();
      
      // We will try to name the file based on the active template if one exists, otherwise 'sandbox'
      const titleSlug = "cpp-sandbox";
      
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          code: codeStr,
          titleSlug: titleSlug,
          lang: "cpp"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to push to GitHub");
      } else {
        toast.success("Successfully pushed C++ code to GitHub!", {
          action: {
            label: "View",
            onClick: () => window.open(data.url, "_blank")
          }
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

  // Mode 1: Plain / Custom Freeform C++ Workspace State
  const [plainCode, setPlainCode] = useState<string>(PLAIN_CPP_STARTER);
  const [plainStdin, setPlainStdin] = useState<string>("");
  const [plainResult, setPlainResult] = useState<CppExecutionResult | null>(null);

  // Mode 2: DSA Templates Guided Practice State
  const defaultTemplate = CPP_DSA_TEMPLATES[0]!;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate.id);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [templateCode, setTemplateCode] = useState<string>(defaultTemplate.code);
  const [templateStdin, setTemplateStdin] = useState<string>(defaultTemplate.defaultStdin);
  const [templateResult, setTemplateResult] = useState<CppExecutionResult | null>(null);

  // Loading state for server execution
  const [loading, setLoading] = useState(false);

  // Load saved plain scratchpad from localStorage on initial mount
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(STORAGE_KEY_PLAIN_CODE);
      if (savedCode && typeof savedCode === "string" && savedCode.trim() && savedCode !== "[object Object]") {
        setPlainCode(savedCode);
      }
      const savedStdin = localStorage.getItem(STORAGE_KEY_PLAIN_STDIN);
      if (savedStdin !== null && typeof savedStdin === "string" && savedStdin !== "[object Object]") {
        setPlainStdin(savedStdin);
      } else if (savedStdin === "[object Object]") {
        localStorage.removeItem(STORAGE_KEY_PLAIN_STDIN);
        setPlainStdin("");
      }
    } catch {
      // Ignore localStorage errors in restricted environments
    }
  }, []);

  // Auto-persist plain scratchpad
  const updatePlainCode = (newCode: string) => {
    setPlainCode(newCode);
    try {
      localStorage.setItem(STORAGE_KEY_PLAIN_CODE, newCode);
    } catch {
      // Ignore
    }
  };

  const updatePlainStdin = (newStdin: unknown) => {
    const str = typeof newStdin === "string" ? newStdin : "";
    setPlainStdin(str);
    try {
      localStorage.setItem(STORAGE_KEY_PLAIN_STDIN, str);
    } catch {
      // Ignore
    }
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
    if (selectedCategory === "All") return CPP_DSA_TEMPLATES;
    return CPP_DSA_TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

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
      "Loaded template into Plain C++ Playground! You can now freely edit your own cin/cout.",
    );
  };

  // Active Code, Stdin, and Execution Result based on selected mode
  const activeCode = typeof (mode === "plain" ? plainCode : templateCode) === "string" ? (mode === "plain" ? plainCode : templateCode) : "";
  const activeStdin = typeof (mode === "plain" ? plainStdin : templateStdin) === "string" ? (mode === "plain" ? plainStdin : templateStdin) : "";
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

  const setActiveResult = (res: CppExecutionResult | null) => {
    if (mode === "plain") {
      setPlainResult(res);
    } else {
      setTemplateResult(res);
    }
  };

  // Execute C++ code against the server function or direct API endpoint
  const handleExecute = async (overrideStdin?: string) => {
    if (!activeCode.trim()) {
      toast.error("Please enter some C++ code to run");
      return;
    }

    const validOverride = typeof overrideStdin === "string" ? overrideStdin : undefined;
    const stdinToUse = validOverride !== undefined ? validOverride : activeStdin;
    if (validOverride !== undefined && validOverride !== activeStdin) {
      setActiveStdin(validOverride);
    }

    setLoading(true);
    try {
      const res = await apiExecuteCpp({
        code: activeCode.trim(),
        stdin: typeof stdinToUse === "string" ? stdinToUse : "",
      });

      setActiveResult(res);

      if (res.status === "success") {
        toast.success("Execution completed successfully");
      } else if (res.status === "compilation_error") {
        toast.error("Compilation error. Check diagnostic output.");
      } else if (res.status === "timeout") {
        toast.warning("Time limit exceeded (9.0s sandbox limit).");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    updatePlainCode(PLAIN_CPP_STARTER);
    updatePlainStdin("");
    setPlainResult(null);
    toast.info("Reset to standard 'Hello, World!' C++ starter");
  };

  const handleLoadPlainFastIO = () => {
    updatePlainCode(PLAIN_CPP_IO_TEMPLATE);
    updatePlainStdin("10 25");
    setPlainResult(null);
    toast.info("Loaded Fast I/O C++ boilerplate with cin >> a >> b");
  };

  const handleClearPlainEditor = () => {
    updatePlainCode("");
    updatePlainStdin("");
    setPlainResult(null);
    toast.info("Cleared C++ editor");
  };

  const snapshotRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportSnapshot = async () => {
    if (!snapshotRef.current) return;
    try {
      setIsExporting(true);
      toast.info("Generating beautiful snapshot...");
      // small delay to allow UI to render the hidden box if we want
      await new Promise(r => setTimeout(r, 100));
      
      const dataUrl = await toPng(snapshotRef.current, {
        quality: 1,
        pixelRatio: 2,
        style: {
          display: "flex",
          opacity: "1",
        }
      });
      
      const link = document.createElement("a");
      link.download = `cpp-code-${Date.now()}.png`;
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

  return (
    <div className="min-h-screen pb-20">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 xl:px-12">
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
                <span>Zero-Latency Cloud Execution Sandbox</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                C++ <span className="bg-gradient-to-r from-primary via-accent to-emerald-400 bg-clip-text text-transparent">Sandbox &amp; Compiler</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground font-sans max-w-2xl leading-relaxed">
                Full-featured ISO C++20 development container with interactive standard I/O streams, compiler diagnostic traces, GitHub snapshot synchronization, and FAANG algorithmic templates.
              </p>
            </div>

            {/* Hardware & Runtime Telemetry Card */}
            <div className="rounded-2xl border border-border/80 bg-background/80 p-4 font-mono shadow-md backdrop-blur-xl shrink-0 w-full sm:w-auto flex items-center gap-6">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Compiler Engine</div>
                <div className="text-xl font-black text-foreground font-display">GCC 14.2 (C++20)</div>
              </div>
              <div className="h-10 w-px bg-border/60" />
              <div>
                <div className="text-[10px] uppercase text-muted-foreground">Optimization</div>
                <div className="text-xl font-black text-emerald-400 font-display">-O3 Fast</div>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-8 pt-6 border-t border-border/50 flex flex-wrap items-center justify-between gap-4">
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
                <span>⚡ Plain C++ Playground</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] ${
                    mode === "plain"
                      ? "bg-white/20 text-white font-semibold"
                      : "bg-muted text-muted-foreground"
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
                <span>📚 DSA Question Templates</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] ${
                    mode === "templates"
                      ? "bg-white/20 text-white font-semibold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {CPP_DSA_TEMPLATES.length} Presets
                </span>
              </button>
            </div>

            {/* Right: Quick Context Actions */}
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
                    <strong>Freeform C++ Scratchpad:</strong> Write your own arbitrary C++ logic,
                    pass custom inputs in the standard input panel below, and execute without fixed
                    template boundaries. Your code is automatically saved in this browser.
                  </span>
                </div>
              </div>
            ) : (
              /* DSA Question Templates Selector Bar */
              <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/40 p-6 shadow-lg backdrop-blur-2xl animate-fade">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="font-mono text-[13px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Code2 className="size-4 text-primary" />
                    <span>Filter Algorithms by Topic:</span>
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

        {/* Main Grid: Code Editor & Console (Left 8 cols), C++ Packages & Cheat Sheet (Right 4 cols) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 xl:gap-10 mt-8">
          {/* Left Column: C++ Code Editor & Output Console */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* C++ Code Editor */}
            <div className="min-h-[600px] h-[calc(100vh-250px)]">
              <CppCodeEditor
                code={activeCode}
                onChange={setActiveCode}
                onRun={handleExecute}
                onExportSnapshot={handleExportSnapshot}
                onPushToGithub={handlePushToGithub}
                githubLoading={githubLoading}
                loading={loading}
                disabled={loading}
              />
            </div>

            {/* Terminal Console with Stdout, Stdin, and Compiler Diagnostic Messages */}
            <CppConsole
              result={activeResult}
              loading={loading}
              stdin={activeStdin}
              code={activeCode}
              onStdinChange={setActiveStdin}
              onClear={handleClearConsole}
              onRun={handleExecute}
            />
          </div>

          {/* Right Column: C++ DSA Headers Explorer & Competitive Programming Cheatsheet */}
          <div className="flex flex-col gap-8 lg:col-span-4">
            {/* Packages Explorer */}
            <CppPackageExplorer
              onInsertHeader={handleInsertHeader}
              onLoadSnippet={(snippet) => {
                setActiveCode(snippet);
                setActiveResult(null);
              }}
            />

            {/* Competitive Programming & DSA Cheatsheet Card */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-5 shadow-lg backdrop-blur-2xl">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent/5 border border-accent/20 text-accent shadow-inner">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-foreground tracking-tight">C++ DSA Pro Tips</h3>
                  <p className="text-[10px] text-muted-foreground/80 font-medium">
                    Speed patterns for coding interviews &amp; contests
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2 text-xs">
                {/* Tip 1 */}
                <div className="rounded-xl border border-border/50 bg-background/40 p-3 hover:bg-background/60 transition-colors">
                  <div className="font-bold text-primary font-mono text-[11px]">
                    ⚡ Fast I/O Boilerplate
                  </div>
                  <pre className="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/40 p-1.5 rounded">
                    {`ios_base::sync_with_stdio(false);\ncin.tie(NULL);`}
                  </pre>
                  <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
                    Unties C++ streams from C stdio for 10x faster I/O execution.
                  </p>
                </div>

                {/* Tip 2 */}
                <div className="rounded-xl border border-border/50 bg-background/40 p-3 hover:bg-background/60 transition-colors">
                  <div className="font-bold text-accent font-mono text-[11px]">
                    🧭 4-Direction Grid Vectors
                  </div>
                  <pre className="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/40 p-1.5 rounded">
                    {`int dx[] = {0, 0, 1, -1};\nint dy[] = {1, -1, 0, 0};`}
                  </pre>
                  <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
                    Iterate cleanly over adjacent cells in 2D grid BFS/DFS traversals.
                  </p>
                </div>

                {/* Tip 3 */}
                <div className="rounded-xl border border-border/50 bg-background/40 p-3 hover:bg-background/60 transition-colors">
                  <div className="font-bold text-foreground/90 font-mono text-[11px] flex items-center gap-1.5">
                    <span className="text-primary">🔢</span> Modulo 10^9 + 7
                  </div>
                  <pre className="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/40 p-1.5 rounded">
                    {`const int MOD = 1e9 + 7;\nans = (ans + val) % MOD;`}
                  </pre>
                  <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
                    Prevents 64-bit integer overflow in combinatorial DP problems.
                  </p>
                </div>

                {/* Tip 4 */}
                <div className="rounded-xl border border-border/50 bg-background/40 p-3 hover:bg-background/60 transition-colors">
                  <div className="font-bold text-foreground/90 font-mono text-[11px] flex items-center gap-1.5">
                    <span className="text-amber-400">🗂️</span> Min-Heap Declaration
                  </div>
                  <pre className="mt-1 text-[10px] font-mono text-muted-foreground bg-muted/40 p-1.5 rounded">
                    {`priority_queue<int, vector<int>, greater<int>> minHeap;`}
                  </pre>
                  <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
                    Standard C++ default is Max-Heap. Use{" "}
                    <code className="text-foreground">greater&lt;int&gt;</code> for Min-Heap.
                  </p>
                </div>
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
                    DSA.viz - C++ Engine
                  </div>
                </div>
                <div className="text-white/40 font-mono text-xs">
                  {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Window Body */}
              <div className="flex flex-col gap-6 p-8">
                {/* Code */}
                <div className="flex flex-col gap-2">
                  <div className="text-white/50 text-xs font-mono uppercase tracking-widest font-bold">
                    Source Code
                  </div>
                  <Highlight
                    theme={themes.vsDark}
                    code={activeCode}
                    language="cpp"
                  >
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                      <pre className="bg-black/40 border border-white/5 rounded-xl p-6 text-[15px] leading-relaxed font-mono whitespace-pre-wrap" style={{ ...style, backgroundColor: 'transparent' }}>
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
                      {activeResult?.stdout || activeResult?.stderr || activeResult?.compile_output || "No output generated."}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CppCompilerPage;

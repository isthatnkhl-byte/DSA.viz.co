import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { AiWord } from "@/components/brand/AiWord";
import Editor, { OnMount } from "@monaco-editor/react";
import {
  RotateCcw,
  Copy,
  Check,
  Brain,
  Github,
  Maximize2,
  Minimize2,
  Palette,
  Type,
  AlignLeft,
  Play,
  Zap,
  Camera,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCodeTemplates, SupportedLanguage } from "@/lib/codeTemplates";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  extractThreeSampleCasesForProblem,
  type LeetCodeRunResponse,
  type LeetCodeSubmitResponse,
  type LeetCodeSubmissionHistoryEntry,
} from "@/lib/leetcode-testcases";
import { apiRunProblemTests, apiSubmitProblemCode } from "@/lib/api-client";
import { LeetCodeTestDrawer, type DrawerTabType } from "./LeetCodeTestDrawer";
import { ApiKeyVaultButton } from "@/components/ApiKeyVaultModal";

export interface MonacoCodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onSubmit?: () => void;
  onRun?: () => void;
  onExportSnapshot?: () => void;
  loading?: boolean;
  disabled?: boolean;
  onPushToGithub?: (code: string, language?: SupportedLanguage) => void;
  githubLoading?: boolean;
  problemTitle?: string;
  problemSlug?: string;
  problemDifficulty?: string;
  problemTopics?: string[];
  problemStatement?: string;
  defaultLanguage?: SupportedLanguage;
  height?: string;
  showSubmitButton?: boolean;
  submitButtonText?: string;
  enableLeetCodeJudge?: boolean;
  onAcceptedSubmit?: (
    verdict: LeetCodeSubmitResponse,
    submittedCode: string,
    language: SupportedLanguage
  ) => Promise<void> | void;
  onSyncToVisualizer?: (code: string, language: SupportedLanguage) => void;
}

export const MonacoCodeEditor = memo(function MonacoCodeEditor({
  code,
  onChange,
  onSubmit,
  onRun,
  onExportSnapshot,
  loading = false,
  disabled = false,
  onPushToGithub,
  githubLoading = false,
  problemTitle = "Solution",
  problemSlug = "solution",
  problemDifficulty = "Medium",
  problemTopics = [],
  problemStatement = "",
  defaultLanguage = "python",
  height = "360px",
  showSubmitButton = true,
  submitButtonText = "Review & Step-by-Step Trace",
  enableLeetCodeJudge = true,
  onAcceptedSubmit,
  onSyncToVisualizer,
}: MonacoCodeEditorProps) {
  const { mode } = useThemeColor();
  const isLight = mode === "light";

  const [language, setLanguage] = useState<SupportedLanguage>(defaultLanguage);
  const [theme, setTheme] = useState<"vs-dark" | "light" | "hc-black">(
    isLight ? "light" : "vs-dark"
  );
  const [fontSize, setFontSize] = useState<number>(13);
  const [showMinimap] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // LeetCode Judge Drawer States
  const [activeDrawerTab, setActiveDrawerTab] = useState<DrawerTabType>("testcase");
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>("");
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<LeetCodeRunResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<LeetCodeSubmitResponse | null>(null);
  const [profileSaved, setProfileSaved] = useState<boolean>(false);
  const [submissionHistory, setSubmissionHistory] = useState<LeetCodeSubmissionHistoryEntry[]>([]);

  // Keep theme synced with system mode
  useEffect(() => {
    setTheme(isLight ? "light" : "vs-dark");
  }, [isLight]);

  const editorRef = useRef<any>(null);
  const codeByLanguageRef = useRef<Partial<Record<SupportedLanguage, string>>>({});
  const dirtyByLanguageRef = useRef<Partial<Record<SupportedLanguage, boolean>>>({});

  // 1. Deterministically extract 3 sample testcases for this problem FIRST
  const sampleCases = useMemo(
    () =>
      extractThreeSampleCasesForProblem({
        slug: problemSlug,
        title: problemTitle,
        topics: problemTopics,
        statement: problemStatement,
      }),
    [problemSlug, problemTitle, problemTopics, problemStatement]
  );

  // 2. Generate smart starter templates with inferred parameter names and types from sampleCases[0]
  const templates = useMemo(
    () =>
      getCodeTemplates(
        problemTitle,
        problemSlug,
        sampleCases[0]?.input,
        sampleCases[0]?.expectedOutput
      ),
    [problemTitle, problemSlug, sampleCases]
  );

  // 3. Load per-problem submission history & reset per-language buffers when switching problems
  const prevSlugRef = useRef<string>("");
  useEffect(() => {
    if (prevSlugRef.current !== problemSlug) {
      prevSlugRef.current = problemSlug;
      codeByLanguageRef.current = {};
      dirtyByLanguageRef.current = {};
      setRunResult(null);
      setSubmitResult(null);
      setProfileSaved(false);
      setCustomInput("");
      setActiveDrawerTab("testcase");
      try {
        const rawHist = window.localStorage.getItem(`dsaviz:subhistory:${problemSlug}`);
        if (rawHist) {
          setSubmissionHistory(JSON.parse(rawHist));
        } else {
          setSubmissionHistory([]);
        }
      } catch {
        setSubmissionHistory([]);
      }
      onChange(templates[language]);
    }
  }, [problemSlug, templates, language, onChange]);

  // 4. When problemStatement finishes loading and templates refine, update editor if user hasn't edited this language yet
  useEffect(() => {
    if (!dirtyByLanguageRef.current[language]) {
      const targetTemplate = templates[language];
      if (targetTemplate && code !== targetTemplate) {
        codeByLanguageRef.current[language] = targetTemplate;
        onChange(targetTemplate);
      }
    }
  }, [templates, language, code, onChange]);

  const handleSubmitLeetCodeSolution = useCallback(
    async (preverifiedRun?: LeetCodeRunResponse) => {
      if (!code.trim()) {
        toast.error("Write your solution before submitting.");
        return;
      }
      setIsDrawerCollapsed(false);
      setActiveDrawerTab("submission");
      setIsSubmittingCode(true);
      setProfileSaved(false);
      try {
        const res = await apiSubmitProblemCode({
          slug: problemSlug,
          title: problemTitle,
          difficulty: problemDifficulty,
          topics: problemTopics,
          statement: problemStatement,
          code,
          language,
          preverifiedRunResult: preverifiedRun,
        });
        setSubmitResult(res);

        // If Submit ran directly without prior Run, populate runResult with the AI-tested cases as well
        if (!preverifiedRun && res.testedCases && res.testedCases.length > 0) {
          setRunResult({
            status: res.status === "Time Limit Exceeded" ? "Wrong Answer" : res.status,
            summaryMessage: res.summaryMessage,
            compilerOutput: res.compilerOutput,
            passedCount: res.passedCases,
            totalCount: res.totalCases,
            totalRuntimeMs: res.runtimeMs,
            estimatedTimeComplexity: res.timeComplexity,
            estimatedSpaceComplexity: res.spaceComplexity,
            optimalTimeComplexity: res.optimalTimeComplexity,
            optimalSpaceComplexity: res.optimalSpaceComplexity,
            executionEngine: res.executionEngine,
            learningDiagnostics: res.learningDiagnostics,
            cases: res.testedCases,
          });
        }

        // Save to per-problem submission history
        const newEntry: LeetCodeSubmissionHistoryEntry = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          status: res.status,
          language,
          runtimeMs: res.runtimeMs,
          memoryMb: res.memoryMb,
          passedCases: res.passedCases,
          totalCases: res.totalCases,
          timeComplexity: res.timeComplexity,
          spaceComplexity: res.spaceComplexity,
          code,
          verdict: res,
        };
        setSubmissionHistory((prev) => {
          const updated = [newEntry, ...prev].slice(0, 15);
          try {
            window.localStorage.setItem(
              `dsaviz:subhistory:${problemSlug}`,
              JSON.stringify(updated)
            );
          } catch {
            // ignore storage quota errors
          }
          return updated;
        });

        if (res.status === "Accepted") {
          toast.success(
            `Accepted! All ${res.passedCases}/${res.totalCases} AI-tested testcases passed (${res.runtimeMs} ms).`
          );
          if (onAcceptedSubmit) {
            await onAcceptedSubmit(res, code, language);
            setProfileSaved(true);
          }
        } else {
          toast.error(`${res.status} (${res.passedCases}/${res.totalCases} testcases passed)`);
        }
      } catch (err: any) {
        toast.error(err?.message || "Failed to evaluate submission.");
      } finally {
        setIsSubmittingCode(false);
      }
    },
    [
      code,
      problemSlug,
      problemTitle,
      problemDifficulty,
      problemTopics,
      problemStatement,
      language,
      onAcceptedSubmit,
    ]
  );

  const handleRunLeetCodeTests = useCallback(async () => {
    if (onRun) {
      onRun();
      return;
    }
    if (!code.trim()) {
      toast.error("Write your solution in the editor before running testcases.");
      return;
    }
    setIsDrawerCollapsed(false);
    setActiveDrawerTab("result");
    setIsRunningTests(true);
    try {
      const res = await apiRunProblemTests({
        slug: problemSlug,
        title: problemTitle,
        difficulty: problemDifficulty,
        topics: problemTopics,
        statement: problemStatement,
        code,
        language,
        sampleCases,
        customInput: customInput.trim() || undefined,
      });
      setRunResult(res);
      if (
        res.status === "Accepted" &&
        res.totalCount > 0 &&
        res.passedCount === res.totalCount
      ) {
        toast.success(
          `All ${res.passedCount}/${res.totalCount} testcases passed! Moving code to Submit...`
        );
        setIsRunningTests(false);
        await handleSubmitLeetCodeSolution(res);
        return;
      } else if (res.status === "Compile Error" || res.status === "Runtime Error") {
        toast.error(res.summaryMessage || res.status);
      } else {
        toast.warning(
          `${res.passedCount}/${res.totalCount} testcases passed. Fix failing cases to move to Submit.`
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to run testcases.");
    } finally {
      setIsRunningTests(false);
    }
  }, [
    onRun,
    code,
    problemSlug,
    problemTitle,
    problemDifficulty,
    problemTopics,
    problemStatement,
    language,
    sampleCases,
    customInput,
    handleSubmitLeetCodeSolution,
  ]);

  const handleRestoreSubmission = useCallback(
    (entry: LeetCodeSubmissionHistoryEntry) => {
      const validLangs: SupportedLanguage[] = [
        "python",
        "cpp",
        "javascript",
        "java",
        "pseudocode",
      ];
      if (validLangs.includes(entry.language as SupportedLanguage)) {
        setLanguage(entry.language as SupportedLanguage);
      }
      onChange(entry.code);
      toast.success(
        `Restored ${entry.language.toUpperCase()} submission (${entry.status} • ${entry.timeComplexity})`
      );
    },
    [onChange]
  );

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Ctrl/Cmd + Enter runs the 3 sample testcases
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (enableLeetCodeJudge) {
        void handleRunLeetCodeTests();
      } else if (onRun) {
        onRun();
      } else if (onSubmit) {
        onSubmit();
      }
    });

    // Ctrl/Cmd + Shift + Enter submits the solution against the massive stress suite
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
      () => {
        if (enableLeetCodeJudge) {
          void handleSubmitLeetCodeSolution();
        } else if (onSubmit) {
          onSubmit();
        }
      }
    );
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    if (newLang === language) return;
    // Save current code buffer for current language
    codeByLanguageRef.current[language] = code;

    setLanguage(newLang);
    const savedForNewLang = codeByLanguageRef.current[newLang];
    const isDirtyForNewLang = dirtyByLanguageRef.current[newLang];
    const nextCode =
      isDirtyForNewLang && savedForNewLang && savedForNewLang.trim()
        ? savedForNewLang
        : templates[newLang];

    codeByLanguageRef.current[newLang] = nextCode;
    onChange(nextCode);
    toast.info(`Switched to ${newLang.toUpperCase()} starter preset`);
  };

  const handleInsertStarter = () => {
    const template = templates[language];
    dirtyByLanguageRef.current[language] = false;
    codeByLanguageRef.current[language] = template;
    onChange(template);
    toast.success(`Reset to ${language.toUpperCase()} starter template`);
  };

  const handleEditorValueChange = useCallback(
    (val: string | undefined) => {
      const nextVal = val ?? "";
      codeByLanguageRef.current[language] = nextVal;
      dirtyByLanguageRef.current[language] =
        nextVal.trim().length > 0 && nextVal.trim() !== (templates[language] || "").trim();
      onChange(nextVal);
    },
    [language, templates, onChange]
  );

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current
        .getAction("editor.action.formatDocument")
        ?.run()
        .then(() => toast.success("Code auto-formatted!"))
        .catch(() => toast.info("Formatting completed"));
    }
  };

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

  const getMonacoLanguage = (lang: SupportedLanguage): string => {
    switch (lang) {
      case "cpp":
        return "cpp";
      case "python":
        return "python";
      case "javascript":
        return "javascript";
      case "java":
        return "java";
      case "pseudocode":
        return "python";
      default:
        return "python";
    }
  };

  return (
    <div
      className={`group flex flex-col transition-all duration-300 rounded-2xl border ${
        isFullscreen
          ? "fixed inset-4 z-[100] bg-background/95 border-primary/50 shadow-2xl backdrop-blur-2xl p-4 overflow-y-auto"
          : "border-border/80 bg-card/90 shadow-sm backdrop-blur-sm"
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5 px-3 pt-3">
        {/* Language Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
            {(["python", "cpp", "javascript", "java", "pseudocode"] as const).map((langKey) => (
              <button
                key={langKey}
                type="button"
                onClick={() => handleLanguageChange(langKey)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all cursor-pointer ${
                  language === langKey
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {langKey === "cpp"
                  ? "C++"
                  : langKey === "javascript"
                  ? "JS"
                  : langKey === "java"
                  ? "Java"
                  : langKey === "python"
                  ? "Python"
                  : "Pseudo"}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls & Formatters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Theme Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1">
            <Palette className="size-3 text-muted-foreground" />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="bg-transparent font-mono text-[11px] text-foreground focus:outline-none cursor-pointer"
            >
              <option value="vs-dark">VS Dark</option>
              <option value="light">VS Light</option>
              <option value="hc-black">High Contrast</option>
            </select>
          </div>

          {/* Font Size Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-2 py-1">
            <Type className="size-3 text-muted-foreground" />
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="bg-transparent font-mono text-[11px] text-foreground focus:outline-none cursor-pointer"
            >
              <option value={12}>12px</option>
              <option value={13}>13px</option>
              <option value={14}>14px</option>
              <option value={16}>16px</option>
            </select>
          </div>

          {/* Auto Format Button */}
          <Button
            type="button"
            onClick={handleFormat}
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            title="Auto-Format Code"
          >
            <AlignLeft className="size-3 text-primary" />
          </Button>

          {/* Starter Template */}
          <Button
            type="button"
            onClick={handleInsertStarter}
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            title="Reset Starter Template"
          >
            <RotateCcw className="size-3" />
          </Button>

          {/* Copy Button */}
          <Button
            type="button"
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            title="Copy Code"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>

          {/* Personal API Key Vault Trigger */}
          <ApiKeyVaultButton compact />
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div
        className="relative overflow-hidden rounded-xl border border-border/60 mx-2.5 my-2 bg-background"
        style={{ height: isFullscreen ? "calc(100vh - 380px)" : height }}
      >
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          theme={theme}
          value={code}
          onChange={handleEditorValueChange}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex h-full w-full items-center justify-center gap-2 bg-background font-mono text-xs text-muted-foreground">
              <Brain className="size-4 animate-spin text-primary" /> Loading Code Editor...
            </div>
          }
          options={{
            minimap: { enabled: showMinimap },
            fontSize: fontSize,
            fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace",
            lineNumbers: "on",
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "on",
            formatOnType: true,
            formatOnPaste: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 10, bottom: 10 },
          }}
        />
      </div>

      {/* LeetCode Run & Submit Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            <strong className="text-foreground">{language.toUpperCase()}</strong> • Ctrl+Enter Run • Ctrl+Shift+Enter Submit
          </span>
          {onPushToGithub && (
            <Button
              type="button"
              size="sm"
              onClick={() => onPushToGithub(code, language)}
              disabled={githubLoading || !code.trim()}
              variant="outline"
              className="h-7 gap-1.5 px-2.5 font-mono text-[11px] font-bold border-border shadow-2xs hover:bg-muted/50 cursor-pointer"
            >
              {githubLoading ? (
                <Brain className="size-3 animate-spin" />
              ) : (
                <Github className="size-3" />
              )}
              <span>GitHub</span>
            </Button>
          )}
          {onExportSnapshot && (
            <Button
              type="button"
              onClick={onExportSnapshot}
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 font-mono text-[11px] font-bold border-border shadow-2xs"
              title="Export Snapshot"
            >
              <Camera className="size-3" />
              <span>Snapshot</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {enableLeetCodeJudge ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleRunLeetCodeTests()}
                disabled={isRunningTests || isSubmittingCode || disabled || !code.trim()}
                className="h-8 gap-1.5 px-3 font-mono text-xs font-bold border-border/90 bg-secondary/80 text-foreground hover:border-primary/50 hover:bg-secondary cursor-pointer"
              >
                {isRunningTests ? (
                  <>
                    <Zap className="size-3.5 animate-spin text-primary" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3.5 fill-current text-emerald-400" />
                    <span>Run</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => void handleSubmitLeetCodeSolution()}
                disabled={isRunningTests || isSubmittingCode || disabled || !code.trim()}
                className="h-8 gap-1.5 px-3.5 font-mono text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm cursor-pointer"
              >
                {isSubmittingCode ? (
                  <>
                    <AiWord className="size-3.5 animate-spin" />
                    <span>Judging...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Submit</span>
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {onRun && (
                <Button
                  type="button"
                  onClick={onRun}
                  disabled={loading || disabled || !code.trim()}
                  className="gap-2 font-mono text-xs font-bold shadow-md shadow-primary/20 bg-primary text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Zap className="size-3.5 animate-spin" /> Running...
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5 fill-current" /> Run Code
                    </>
                  )}
                </Button>
              )}

              {showSubmitButton && onSubmit && (
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={loading || disabled || !code.trim()}
                  className="gap-2 font-mono text-xs font-bold shadow-md shadow-primary/20"
                >
                  {loading ? (
                    <>
                      <Brain className="size-3.5 animate-spin" /> Reviewing...
                    </>
                  ) : (
                    <>
                      <AiWord className="size-3.5" /> {submitButtonText}
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom LeetCode Testcase / Test Result / Submission / History Drawer */}
      {enableLeetCodeJudge && (
        <div className="px-2.5 pb-2.5">
          <LeetCodeTestDrawer
            sampleCases={sampleCases}
            runResult={runResult}
            submitResult={submitResult}
            isRunning={isRunningTests}
            isSubmitting={isSubmittingCode}
            customInput={customInput}
            onCustomInputChange={setCustomInput}
            onRunTests={() => void handleRunLeetCodeTests()}
            onSubmitCode={() => void handleSubmitLeetCodeSolution()}
            activeDrawerTab={activeDrawerTab}
            onTabChange={setActiveDrawerTab}
            isCollapsed={isDrawerCollapsed}
            onToggleCollapse={() => setIsDrawerCollapsed((prev) => !prev)}
            profileSaved={profileSaved}
            submissionHistory={submissionHistory}
            onRestoreSubmission={handleRestoreSubmission}
            onSyncToVisualizer={
              onSyncToVisualizer ? () => onSyncToVisualizer(code, language) : undefined
            }
          />
        </div>
      )}
    </div>
  );
});

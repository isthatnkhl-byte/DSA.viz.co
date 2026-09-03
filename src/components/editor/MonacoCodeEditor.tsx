import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import {
  Code2,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Brain,
  Github,
  Maximize2,
  Minimize2,
  FileType,
  Palette,
  Type,
  AlignLeft,
  Play,
  Zap,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCodeTemplates, SupportedLanguage } from "@/lib/codeTemplates";
import { useThemeColor } from "@/hooks/useThemeColor";

export interface MonacoCodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onSubmit?: () => void;
  onRun?: () => void;
  onExportSnapshot?: () => void;
  loading?: boolean;
  disabled?: boolean;
  onPushToGithub?: (code: string) => void;
  githubLoading?: boolean;
  problemTitle?: string;
  problemSlug?: string;
  defaultLanguage?: SupportedLanguage;
  height?: string;
  showSubmitButton?: boolean;
  submitButtonText?: string;
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
  defaultLanguage = "python",
  height = "380px",
  showSubmitButton = true,
  submitButtonText = "Review & Step-by-Step Trace",
}: MonacoCodeEditorProps) {

  const { mode } = useThemeColor();
  const isLight = mode === "light";

  const [language, setLanguage] = useState<SupportedLanguage>(defaultLanguage);
  const [theme, setTheme] = useState<"vs-dark" | "light" | "hc-black">(
    isLight ? "light" : "vs-dark"
  );
  const [fontSize, setFontSize] = useState<number>(14);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Keep theme synced with system mode if user hasn't explicitly customized
  useEffect(() => {
    setTheme(isLight ? "light" : "vs-dark");
  }, [isLight]);

  const editorRef = useRef<any>(null);
  const templates = getCodeTemplates(problemTitle, problemSlug);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add Cmd/Ctrl + Enter shortcut to trigger onRun or onSubmit
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) {
        onRun();
      } else if (onSubmit) {
        onSubmit();
      }
    });
  };



  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    // If current code matches one of the templates or is empty, auto update to new language template
    const currentTemplates = Object.values(templates);
    if (!code.trim() || currentTemplates.some((t) => t.trim() === code.trim())) {
      onChange(templates[newLang]);
    }
    toast.info(`Switched to ${newLang.toUpperCase()} template`);
  };

  const handleInsertStarter = () => {
    const template = templates[language];
    onChange(template);
    toast.success(`Inserted ${language.toUpperCase()} starter template`);
  };

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
      case "pseudocode":
        return "python"; // Python syntax highlighter works great for pseudocode
      default:
        return "python";
    }
  };

  return (
    <div
      className={`group flex flex-col transition-all duration-300 rounded-2xl border ${
        isFullscreen
          ? "fixed inset-4 z-[100] bg-background/95 border-primary/50 shadow-2xl backdrop-blur-2xl p-4"
          : "border-border/80 bg-card/90 shadow-sm backdrop-blur-sm"
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5 px-3 pt-3">
        {/* Language Tabs & Title */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <Code2 className="size-4 text-primary" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Editor
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => handleLanguageChange("python")}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                language === "python"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Python
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("cpp")}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                language === "cpp"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              C++
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("javascript")}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                language === "javascript"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              JavaScript
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange("pseudocode")}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold transition-all ${
                language === "pseudocode"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pseudocode
            </button>
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
            <span className="hidden sm:inline">Format</span>
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
            <span className="hidden sm:inline">Template</span>
          </Button>

          {/* Copy Button */}
          <Button
            type="button"
            onClick={handleCopy}
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
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
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div
        className="relative overflow-hidden rounded-xl border border-border/60 my-2 bg-background"
        style={{ height: isFullscreen ? "calc(100vh - 160px)" : height }}
      >
        <Editor
          height="100%"
          language={getMonacoLanguage(language)}
          theme={theme}
          value={code}
          onChange={(val) => onChange(val ?? "")}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex h-full w-full items-center justify-center gap-2 bg-background font-mono text-xs text-muted-foreground">
              <Brain className="size-4 animate-spin text-primary" /> Loading VS Code Editor...
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

      {/* Footer & Submit Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3 pt-1">
        <span className="font-mono text-[11px] text-muted-foreground">
          Language: <strong className="text-foreground">{language.toUpperCase()}</strong> • Ctrl+Enter to run
        </span>

        <div className="flex items-center gap-2">
          {onExportSnapshot && (
            <Button
              type="button"
              onClick={onExportSnapshot}
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono text-xs font-bold border-border shadow-sm"
              title="Export Snapshot"
            >
              <Camera className="size-3.5" />
              Snapshot
            </Button>
          )}

          {onPushToGithub && (
            <Button
              type="button"
              onClick={() => onPushToGithub(code)}
              disabled={githubLoading || !code.trim()}
              variant="outline"
              className="gap-2 font-mono text-xs font-bold border-border shadow-sm hover:bg-muted/50"
            >
              {githubLoading ? (
                <Brain className="size-3.5 animate-spin" />
              ) : (
                <Github className="size-3.5" />
              )}
              Push to GitHub
            </Button>
          )}

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
                  <Play className="size-3.5 fill-current" /> Run Code (Ctrl+Enter)
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
                  <Brain className="size-3.5 animate-spin" /> Reviewing & Simulating...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" /> {submitButtonText}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
